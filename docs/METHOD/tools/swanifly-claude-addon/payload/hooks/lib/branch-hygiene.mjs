#!/usr/bin/env node
/**
 * .claude/hooks/lib/branch-hygiene.mjs — the one place that knows what every local branch and
 * worktree IS, relative to the trunk and to GitHub. Shared by land.mjs (post-land cleanup,
 * `--sweep`), flight-deck.mjs (SessionStart report) and wip-sync.mjs.
 *
 * Classes (first match wins, see `classify`):
 *   gone    the upstream branch disappeared and every commit is already in the trunk
 *   merged  tip is an ancestor of origin/<trunk>, clean tree, and the branch has lived (not a fresh branch)
 *   orphan  commits ahead of the trunk that exist on no remote — ALARM, nothing to delete
 *   held    commits ahead of the trunk + an open PR or an exception/hold: waiting for a human
 *   active  everything else: commits, a dirty tree, a fresh branch
 *
 * `classify` has NO side effects (a `fetch` option exists, off by default). Deletion lives in
 * `removeLocal` / `deleteRemote` and each re-checks its own guards: clean tree, not the cwd, not
 * the main checkout, nothing unpushed, never the trunk. Nothing here ever force-pushes a branch,
 * rebases, or checks out the trunk.
 *
 * Test seams: `METHOD_GH_SCRIPT=<file.js>` makes every gh call run `node <file.js> <args>` (a real gh is
 * an .exe that cannot be faked on Windows); `METHOD_BRANCH_GRACE_MS` overrides the 2 h recent-activity grace.
 *
 * CLI (read-only): node lib/branch-hygiene.mjs [--json] [--fetch] [--remote]
 */
import { spawnSync } from 'node:child_process';
import { existsSync, readFileSync, realpathSync, rmSync, statSync, writeFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';

const run = (cmd, args, { cwd, timeout = 60_000, env } = {}) =>
  spawnSync(cmd, args, { cwd, encoding: 'utf8', timeout, env: env ? { ...process.env, ...env } : process.env });
/** A merged branch whose worktree saw activity this recently may still hold a live session: leave it for a later sweep. */
export const GRACE_MS = 2 * 3_600_000;

export const git = (cwd, args, opts) => run('git', args, { cwd, ...opts });
const gout = (cwd, args) => (git(cwd, args).stdout ?? '').trim();

/** `gh` (a real .exe, no shell) — or the test script named by METHOD_GH_SCRIPT. */
export function runGh(args, { cwd, timeout = 60_000 } = {}) {
  const script = process.env.METHOD_GH_SCRIPT;
  return script ? run(process.execPath, [script, ...args], { cwd, timeout }) : run('gh', args, { cwd, timeout });
}

export function samePath(a, b) {
  try {
    const norm = (p) => (process.platform === 'win32' ? realpathSync(p).toLowerCase() : realpathSync(p));
    return norm(a) === norm(b);
  } catch { return false; }
}

export function trunkOf(cwd) {
  const r = git(cwd, ['symbolic-ref', '--quiet', 'refs/remotes/origin/HEAD']);
  const m = r.status === 0 ? /^refs\/remotes\/origin\/(.+)$/.exec((r.stdout ?? '').trim()) : null;
  return m ? m[1] : 'main';
}

/** Dirty paths, minus the gate's own scratch state and the per-machine telemetry ledger (same filter as land.mjs). */
export function dirtyPaths(cwd) {
  return (git(cwd, ['--no-optional-locks', 'status', '--porcelain']).stdout ?? '').split('\n')
    .filter((l) => l.length >= 4)
    .map((l) => l.slice(3).trim().replace(/\\/g, '/'))
    .filter((p) => !p.startsWith('.method/') && p !== 'docs/project/telemetry/sessions.jsonl');
}

export function listWorktrees(cwd) {
  const out = git(cwd, ['worktree', 'list', '--porcelain']).stdout ?? '';
  return out.split(/\r?\n\r?\n/).map((blk) => {
    const w = { path: '', branch: null, detached: false, locked: false, prunable: false };
    for (const line of blk.split(/\r?\n/)) {
      if (line.startsWith('worktree ')) w.path = line.slice(9).trim();
      else if (line.startsWith('branch refs/heads/')) w.branch = line.slice(18).trim();
      else if (line === 'detached') w.detached = true;
      else if (line.startsWith('locked')) w.locked = true;
      else if (line.startsWith('prunable')) w.prunable = true;
    }
    return w;
  }).filter((w) => w.path);
}

/** Open PRs by head branch + oids of merged PRs, from ONE gh call. `null` when gh is unavailable. */
export function lookupPrs(cwd, timeout = 60_000, trunk = 'main') {
  const r = runGh(['pr', 'list', '--state', 'all', '--limit', '200', '--json', 'number,headRefName,baseRefName,state,isDraft,headRefOid,url'], { cwd, timeout });
  if (r.error || r.status !== 0) return null;
  let rows;
  try { rows = JSON.parse(r.stdout || '[]'); } catch { return null; }
  const open = new Map();
  const mergedOids = new Map();
  for (const p of rows) {
    if (p.state === 'OPEN') open.set(p.headRefName, { number: p.number, isDraft: !!p.isDraft, url: p.url });
    // Only a PR merged INTO THE TRUNK proves the branch landed: a stacked PR (base = another branch) proves nothing.
    else if (p.state === 'MERGED' && p.baseRefName === trunk) mergedOids.set(p.headRefName, [...(mergedOids.get(p.headRefName) ?? []), p.headRefOid]);
  }
  return { open, mergedOids };
}

/** Default hold detection when the caller has no exception catalogue: names and commit subjects only. */
function defaultHeld(cwd, base, branch) {
  const hits = [];
  if (/\bwip\b/i.test(branch)) hits.push('hold: branch is marked WIP');
  const subjects = gout(cwd, ['log', `${base}..${branch}`, '--format=%s']);
  if (/\[(no-auto-merge|wip|hold)\]/i.test(subjects)) hits.push('hold: a commit subject asks for a human merge');
  if (/needs decision/i.test(subjects)) hits.push('decision: a commit subject flags "Needs decision"');
  return hits;
}

/**
 * Last real activity on a branch, in epoch ms: the newest of its latest reflog entry, the mtime of the
 * worktree's admin files (HEAD, index, logs/HEAD under its git dir — touched by every checkout, add, commit
 * and by `worktree add` itself) and the tip commit date. The tip date alone says when the last commit was
 * AUTHORED, not whether somebody is working in the worktree now.
 */
function lastActivityMs(root, branch, wtPath, tipDate) {
  const times = [Date.parse(tipDate) || 0];
  const gd = gout(root, ['log', '-g', '-1', '--date=unix', '--format=%gd', `refs/heads/${branch}`]);
  const m = /@\{(\d+)\}/.exec(gd);
  if (m) times.push(Number(m[1]) * 1000);
  if (wtPath && existsSync(wtPath)) {
    const gitDir = gout(wtPath, ['rev-parse', '--absolute-git-dir']);
    for (const f of ['HEAD', 'index', 'logs/HEAD']) {
      try { times.push(statSync(`${gitDir}/${f}`).mtimeMs); } catch { /* absent file = no signal */ }
    }
  }
  return Math.max(...times);
}

/** Commits on the remote copy that neither the trunk nor the local branch has. `null` = could not be computed (treated as non-zero). */
function remoteOnlyCount(root, remoteRef, base, branch) {
  const r = git(root, ['rev-list', '--count', remoteRef, '--not', base, `refs/heads/${branch}`]);
  return r.status === 0 && /^[0-9]+$/.test((r.stdout ?? '').trim()) ? Number(r.stdout.trim()) : null;
}
function remoteOnly(root, remoteRef, base, branch) { return remoteOnlyCount(root, remoteRef, base, branch) ?? -1; }

/** Did this branch ever live? A fresh branch sitting at the trunk is indistinguishable from a landed one by ancestry alone. */
function hasHistory(cwd, branch, hasRemote) {
  if (hasRemote) return true;
  const r = git(cwd, ['reflog', 'show', '--format=%gs', `refs/heads/${branch}`]);
  if (r.status !== 0) return false;
  const subjects = (r.stdout ?? '').split('\n').map((s) => s.trim()).filter(Boolean);
  return subjects.some((s) => !/^branch: Created/i.test(s));
}

/**
 * @returns {{trunk, base, root, mainRoot, branches: Array, error?: string, fetchError?: string, ghAvailable: boolean}}
 */
export function classify({ cwd = process.cwd(), trunk, fetch = false, remote = false, heldCheck = null, prs, ghTimeout = 60_000, graceMs = Number(process.env.METHOD_BRANCH_GRACE_MS ?? GRACE_MS), now = Date.now() } = {}) {
  const root = gout(cwd, ['rev-parse', '--show-toplevel']);
  if (!root) return { error: 'not a git repository', branches: [] };
  const T = trunk ?? trunkOf(root);
  const base = `origin/${T}`;
  const report = { trunk: T, base, root, mainRoot: root, branches: [], ghAvailable: false };
  let fetchError;
  if (fetch) {
    const f = git(root, ['fetch', 'origin', '--prune', '--quiet'], { timeout: 90_000 });
    if (f.status !== 0) fetchError = (f.stderr ?? '').trim().split('\n').pop() || 'fetch failed';
  }
  if (fetchError) report.fetchError = fetchError;
  if (git(root, ['rev-parse', '--verify', '--quiet', base]).status !== 0) return { ...report, error: `no ${base}` };

  const wts = listWorktrees(root);
  report.mainRoot = wts[0]?.path ?? root;
  const wtByBranch = new Map(wts.filter((w) => w.branch).map((w) => [w.branch, w]));
  const prInfo = prs === undefined ? lookupPrs(root, ghTimeout, T) : prs;
  report.ghAvailable = prInfo !== null;

  const remoteRefs = new Set((gout(root, ['for-each-ref', '--format=%(refname:short)', 'refs/remotes/origin']).split('\n'))
    .filter(Boolean).map((r) => r.replace(/^origin\//, '')));
  const wipLocal = new Set(gout(root, ['for-each-ref', '--format=%(refname)', 'refs/wip']).split('\n')
    .filter(Boolean).map((r) => r.replace(/^refs\/wip\//, '')));
  if (remote) {
    const ls = git(root, ['ls-remote', 'origin', 'refs/wip/*'], { timeout: 30_000 });
    if (ls.status === 0) for (const l of (ls.stdout ?? '').split('\n')) { const m = /\trefs\/wip\/(.+)$/.exec(l); if (m) wipLocal.add(m[1].trim()); }
  }

  const SEP = '\t';
  const rows = gout(root, ['for-each-ref', `--format=%(refname:short)${SEP}%(objectname)${SEP}%(upstream:short)${SEP}%(upstream:track)${SEP}%(committerdate:iso-strict)`, 'refs/heads'])
    .split('\n').filter(Boolean);
  for (const row of rows) {
    const [branch, tip, upstream, track, tipDate] = row.split(SEP);
    if (branch === T || branch === 'master') continue;
    const wt = wtByBranch.get(branch) ?? null;
    const gone = (track ?? '').includes('gone');
    // A branch cut with `worktree add -b x origin/main` tracks the TRUNK: that is not a copy of the branch on GitHub.
    const trackedBranch = !gone && upstream && upstream !== base ? upstream : null;
    const remoteRef = trackedBranch ?? (remoteRefs.has(branch) ? `origin/${branch}` : null);
    const ahead = Number(gout(root, ['rev-list', '--count', `${base}..${branch}`])) || 0;
    // Commits that exist neither in the trunk nor on the branch's remote ref = commits GitHub does not have.
    const unpushed = remoteRef ? (Number(gout(root, ['rev-list', '--count', branch, `^${base}`, `^${remoteRef}`])) || 0) : ahead;
    const dirty = wt && !wt.prunable ? dirtyPaths(wt.path) : [];
    const current = !!wt && samePath(wt.path, root);
    const isMain = !!wt && samePath(wt.path, report.mainRoot);
    const activityMs = lastActivityMs(root, branch, wt && !wt.prunable ? wt.path : null, tipDate);
    // Work that exists on neither the trunk nor ANY remote ref (merge commits included). null = could not be computed.
    const uq = git(root, ['rev-list', '--count', branch, '--not', base, '--remotes']);
    const unique = uq.status === 0 && /^\d+$/.test((uq.stdout ?? '').trim()) ? Number(uq.stdout.trim()) : null;
    const pr = prInfo?.open.get(branch) ?? null;
    const reasons = [];
    let klass;
    let mergedAtTip = false;

    if (gone) {
      // Fail closed: patch-equivalence (`git cherry`) ignores merge commits, so it is not used. Either every
      // commit is in the trunk, or GitHub itself says a PR was merged at exactly this tip (squash merge).
      mergedAtTip = (prInfo?.mergedOids.get(branch) ?? []).includes(tip);
      if (ahead === 0 || mergedAtTip) { klass = 'gone'; reasons.push(ahead === 0 ? 'upstream deleted; every commit is already in the trunk' : 'upstream deleted; GitHub merged a PR at this exact tip'); }
      else { klass = 'orphan'; reasons.push(`upstream deleted but ${ahead} commit(s) are not in ${base}`); }
    } else if (ahead === 0) {
      if (dirty.length) { klass = 'active'; reasons.push(`${dirty.length} uncommitted path(s)`); }
      else if (!hasHistory(root, branch, !!remoteRef)) { klass = 'active'; reasons.push('fresh branch at the trunk, no history yet'); }
      else if (remoteRef && remoteOnly(root, remoteRef, base, branch) !== 0) {
        klass = 'orphan'; reasons.push(`${remoteRef} has commit(s) that neither the local branch nor ${base} has`);
      } else { klass = 'merged'; reasons.push(`already in ${base}`); }
    } else if (!remoteRef) {
      klass = 'orphan'; reasons.push(`${ahead} commit(s) ahead of ${base} on no remote branch`);
    } else {
      const held = (heldCheck ? heldCheck(branch) : defaultHeld(root, base, branch)) ?? [];
      if (pr || held.length) { klass = 'held'; reasons.push(...held); if (pr) reasons.push(`PR #${pr.number}${pr.isDraft ? ' (draft)' : ''}`); }
      else { klass = 'active'; reasons.push(`${ahead} commit(s) ahead of ${base}`); }
      if (dirty.length) reasons.push(`${dirty.length} uncommitted path(s)`);
    }
    if (unpushed > 0 && klass !== 'orphan') reasons.push(`${unpushed} commit(s) not pushed`);

    const blockers = [];
    if (!(klass === 'merged' || klass === 'gone')) blockers.push('not integrated');
    if (dirty.length) blockers.push('dirty tree');
    if (current) blockers.push('current worktree');
    if (isMain) blockers.push('main checkout');
    if (wt?.locked) blockers.push('locked worktree');
    if (wt && now - activityMs < graceMs) blockers.push(`recent activity (< ${Math.round(graceMs / 3_600_000)}h)`);
    if ((klass === 'merged' || klass === 'gone') && !mergedAtTip) {
      if (unique === null) blockers.push('unique commits unknown (fail closed)');
      else if (unique > 0) blockers.push(`${unique} commit(s) on no remote and not in the trunk`);
    }
    if (klass === 'merged' && unpushed > 0) blockers.push('unpushed commits');

    report.branches.push({
      branch, class: klass, reasons, tip, ahead, unpushed, upstream: remoteRef,
      pushed: !!remoteRef && unpushed === 0, hasWip: wipLocal.has(branch), pr,
      worktree: wt?.path ?? null, dirty: dirty.length, current, isMain,
      lastActivity: new Date(activityMs).toISOString(),
      removable: blockers.length === 0, blockers,
      ageMs: now - activityMs,
    });
  }
  for (const w of wts) {
    if (w.detached && !w.prunable && !samePath(w.path, report.mainRoot)) {
      const dirty = dirtyPaths(w.path);
      report.branches.push({
        branch: '(detached)', class: 'active', reasons: ['detached HEAD' + (dirty.length ? `, ${dirty.length} uncommitted path(s)` : '')],
        tip: null, ahead: 0, unpushed: 0, upstream: null, pushed: false, hasWip: false, pr: null,
        worktree: w.path, dirty: dirty.length, current: samePath(w.path, root), isMain: false,
        lastActivity: null, removable: false, blockers: ['detached HEAD'], ageMs: 0,
      });
    }
  }
  return report;
}

export function summarize(report) {
  const b = report.branches ?? [];
  return {
    active: b.filter((x) => x.class === 'active' || x.class === 'held'),
    residues: b.filter((x) => x.class === 'merged' || x.class === 'gone'),
    alarms: b.filter((x) => x.class === 'orphan' || (x.class !== 'merged' && x.class !== 'gone' && x.unpushed > 0)),
  };
}

const ago = (ms) => (ms < 3_600_000 ? `${Math.max(1, Math.round(ms / 60_000))}m` : ms < 86_400_000 ? `${Math.round(ms / 3_600_000)}h` : `${Math.round(ms / 86_400_000)}d`);

/** One line per branch: where it stands and where GitHub sees it. */
export function describe(x) {
  const where = [
    x.class === 'merged' || x.class === 'gone' ? 'in trunk' : x.branch === '(detached)' ? 'detached' : x.pushed ? 'pushed' : x.upstream ? `${x.unpushed} unpushed` : 'NOT on GitHub',
    x.hasWip ? 'WIP ref' : null,
    x.pr ? `PR #${x.pr.number}${x.pr.isDraft ? ' draft' : ''}` : null,
    x.dirty ? `${x.dirty} dirty` : null,
  ].filter(Boolean).join(', ');
  return `${x.branch} [${x.class}]${x.lastActivity ? ` ${ago(x.ageMs)} ago` : ''} — ${where}${x.worktree ? ` — ${x.worktree}` : ''}`;
}

export function formatReport(report) {
  if (report.error) return [`branch hygiene: ${report.error}`];
  const s = summarize(report);
  const lines = [];
  lines.push(`${s.active.length} active · ${s.residues.length} to clean · ${s.alarms.length} alarm(s)`);
  for (const x of s.alarms) lines.push(`  ⚠ ${describe(x)} — ${x.reasons.join('; ')}`);
  for (const x of s.active) if (!s.alarms.includes(x)) lines.push(`  ● ${describe(x)}${x.class === 'held' ? ' — ' + x.reasons.join('; ') : ''}`);
  for (const x of s.residues) lines.push(`  ✓ ${describe(x)}${x.removable ? ' — removable' : ` — kept: ${x.blockers.join(', ')}`}`);
  return lines;
}

// ── deletion: every function re-checks its own guards ───────────────────────

/** Delete origin/<branch> (non-force, only if it exists) and the WIP ref. Returns step strings; failures are in `errors`. */
export function deleteRemote({ cwd, branch, trunk }) {
  const steps = []; const errors = [];
  if (!branch || branch === trunk || branch === 'master' || branch === 'main') return { steps, errors: ['refusing to delete a trunk ref'] };
  const T = trunk ?? trunkOf(cwd);
  if (branch === T) return { steps, errors: ['refusing to delete a trunk ref'] };
  if (git(cwd, ['rev-parse', '--verify', '--quiet', `refs/remotes/origin/${branch}`]).status === 0) {
    // Never delete work that exists nowhere else: the remote copy may hold commits pushed by another clone.
    const onlyThere = remoteOnlyCount(cwd, `refs/remotes/origin/${branch}`, `refs/remotes/origin/${T}`, branch);
    const oid = gout(cwd, ['rev-parse', `refs/remotes/origin/${branch}`]);
    if (onlyThere === null) errors.push(`origin/${branch} kept: could not verify it holds nothing unique`);
    else if (onlyThere > 0) errors.push(`origin/${branch} kept: it has ${onlyThere} commit(s) that neither the local branch nor the trunk has`);
    else {
      // The lease makes the delete fail if the remote moved since we last saw it.
      const r = git(cwd, ['push', `--force-with-lease=refs/heads/${branch}:${oid}`, 'origin', `:refs/heads/${branch}`], { timeout: 60_000, env: { SKIP_QUALITY_GATES: '1' } });
      if (r.status === 0 || /remote ref does not exist/i.test(r.stderr ?? '')) steps.push(`deleted origin/${branch}`);
      else errors.push(`delete origin/${branch}: ${(r.stderr ?? '').trim().split('\n').pop()}`);
    }
  }
  const hadWip = git(cwd, ['rev-parse', '--verify', '--quiet', `refs/wip/${branch}`]).status === 0;
  if (hadWip) {
    const r = git(cwd, ['push', 'origin', `:refs/wip/${branch}`], { timeout: 60_000, env: { SKIP_QUALITY_GATES: '1' } });
    if (r.status === 0 || /remote ref does not exist/i.test(r.stderr ?? '')) { git(cwd, ['update-ref', '-d', `refs/wip/${branch}`]); steps.push(`deleted refs/wip/${branch}`); }
    else errors.push(`delete refs/wip/${branch}: ${(r.stderr ?? '').trim().split('\n').pop()}`);
  }
  return { steps, errors };
}

/**
 * Remove the local branch and its worktree. Re-checks: not the trunk, not the cwd, not the main
 * checkout, worktree clean and unlocked. `git worktree remove` / `git branch -D` are only reached
 * after those checks (the caller's classification already proved the commits are integrated).
 */
export function removeLocal({ cwd, branch, worktree, trunk }) {
  const root = gout(cwd, ['rev-parse', '--show-toplevel']) || cwd;
  const T = trunk ?? trunkOf(root);
  if (!branch || branch === T || branch === 'master' || branch === 'main') return { ok: false, skipped: 'trunk' };
  const wt = worktree ?? listWorktrees(root).find((w) => w.branch === branch)?.path ?? null;
  if (wt) {
    if (samePath(wt, root) || samePath(process.cwd(), wt)) return { ok: false, skipped: 'current worktree — left to the next SessionStart sweep' };
    if (samePath(wt, listWorktrees(root)[0]?.path ?? root)) return { ok: false, skipped: 'main checkout' };
    if (dirtyPaths(wt).length) return { ok: false, skipped: 'dirty worktree' };
    // Prune FIRST: a worktree whose folder is already gone is only an admin entry, and `worktree remove` refuses it forever.
    git(root, ['worktree', 'prune']);
    if (existsSync(wt)) {
      rmSync(`${wt}/.method`, { recursive: true, force: true }); // the gate's own scratch state, never work
      const rm = git(root, ['worktree', 'remove', wt]);
      if (rm.status !== 0) return { ok: false, skipped: `worktree remove refused: ${(rm.stderr ?? '').trim().split('\n').pop()}` };
    }
  }
  git(root, ['worktree', 'prune']);
  const del = git(root, ['branch', '-D', branch]);
  if (del.status !== 0) return { ok: false, skipped: `branch -D refused: ${(del.stderr ?? '').trim().split('\n').pop()}` };
  return { ok: true, skipped: null };
}

// ── the landed ledger: branches land.mjs itself integrated, the only ones the automatic sweep may delete ──
function ledgerPath(cwd) {
  const d = gout(cwd, ['rev-parse', '--path-format=absolute', '--git-common-dir']);
  return d ? `${d}/landed-branches` : null;
}
export function readLanded(cwd) {
  const p = ledgerPath(cwd);
  try { return new Set(readFileSync(p, 'utf8').split('\n').map((l) => l.trim()).filter(Boolean)); } catch { return new Set(); }
}
export function markLanded(cwd, branch) {
  const p = ledgerPath(cwd);
  if (!p) return;
  const all = readLanded(cwd); all.add(branch);
  writeFileSync(p, [...all].join('\n') + '\n');
}
export function forgetLanded(cwd, branches) {
  const p = ledgerPath(cwd);
  if (!p) return;
  const all = readLanded(cwd); for (const b of branches) all.delete(b);
  writeFileSync(p, [...all].join('\n') + (all.size ? '\n' : ''));
}

/** Apply the cleanup of a classify() report: only `removable` merged/gone entries. `dryRun` touches nothing. */
export function applyCleanup(report, { cwd = process.cwd(), dryRun = false, remote = true, only = null } = {}) {
  const actions = [];
  for (const x of report.branches ?? []) {
    if (x.class !== 'merged' && x.class !== 'gone') continue;
    if (only && !only.has(x.branch)) continue;
    if (!x.removable) { actions.push({ branch: x.branch, ok: false, skipped: x.blockers.join(', ') }); continue; }
    if (dryRun) { actions.push({ branch: x.branch, ok: true, dryRun: true, skipped: null }); continue; }
    // Remote first: if the local half is then refused, the branch stays listed (upstream gone) and the next sweep retries.
    const rem = remote ? deleteRemote({ cwd, branch: x.branch, trunk: report.trunk }) : { steps: [], errors: [] };
    if (rem.errors.length) { actions.push({ branch: x.branch, ok: false, steps: rem.steps, skipped: rem.errors.join('; ') }); continue; }
    const local = removeLocal({ cwd, branch: x.branch, worktree: x.worktree, trunk: report.trunk });
    if (local.ok && only) forgetLanded(cwd, [x.branch]);
    actions.push({ branch: x.branch, ok: local.ok, steps: [...rem.steps, ...(local.ok ? ['removed local branch/worktree'] : [])], skipped: local.skipped });
  }
  return actions;
}

if (process.argv[1] && samePath(process.argv[1], fileURLToPath(import.meta.url))) {
  const has = (n) => process.argv.includes(`--${n}`);
  const report = classify({ fetch: has('fetch'), remote: has('remote') });
  if (has('json')) console.log(JSON.stringify(report, null, 2));
  else for (const l of formatReport(report)) console.log(l);
}
