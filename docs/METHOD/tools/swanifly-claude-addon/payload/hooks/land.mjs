#!/usr/bin/env node
/**
 * .claude/hooks/land.mjs — land a finished conversation on `main` without the
 * operator ever opening GitHub.
 *
 * The METHOD default is **land, not ship**: a pull request is the *exception* —
 * something a human must actually look at — never the normal path. Reaching
 * the trunk is the end of a conversation. `main` is LANDED; deploy is a separate step with its
 * own evidence (landing deploys nothing — DEPLOYED and PROVEN are claimed on their own proof).
 *
 * Order of operations. Any step failing leaves the work on the branch, intact:
 *   1. refuse on trunk / detached HEAD / dirty tree / nothing ahead of origin/main
 *   2. scan the diff for exceptions (schema, security, deps, migrations, scale, holds)
 *   3. integrate origin/main into the branch (merge — never rebase, never force)
 *   4. run `.claude/hooks/verify-gate.mjs`; demand a green marker pinned to HEAD
 *   5. fast-forward `origin/main` to the VERIFIED sha (`git push origin <sha>:main`) — GitHub
 *      marks any open PR for the branch as merged, so there is no PR dance
 *   6. if held back: push the branch (a rejected push is reported, never swallowed), open — or update —
 *      a DRAFT PR whose body carries the reason and a `### Needs decision` block
 *   7. after a landing: advance the local trunk (`fetch origin <trunk>:<trunk>`, skipped and said so when
 *      it is checked out), delete `origin/<branch>` + `refs/wip/<branch>`, then the local branch/worktree
 *      when it is clean and not the cwd (a session's own worktree is left to the next SessionStart sweep)
 *
 * Never: force-push · `gh pr merge --admin` · `git rebase` · check out the trunk
 * (worktree-safe by construction — the trunk is never checked out anywhere).
 *
 * Worktrees run the MAIN checkout's hooks. `.claude/` is gitignored, so each git worktree
 * carries its own frozen copy of these files while `install.mjs` only refreshes the main
 * checkout's — a worktree copy silently re-trips every gate bug already fixed at the root.
 * So this file re-execs `<main>/.claude/hooks/land.mjs` when it is not that file, and the
 * gate it runs is `<main>/.claude/hooks/verify-gate.mjs` (`git rev-parse --git-common-dir`).
 *
 * One landing at a time per repository (2026-09-29, upstreamed from bananaevents). Sessions land in parallel
 * from worktrees, and a heavy gate (lint · type-check · test:gate · build) takes 20+ min: N of them at once
 * starve the machine and vitest times out — false reds. So every landing that gets past the exception
 * scan takes the repository's lock (`<main checkout>/.method/gate.lock`, see gate-lock.mjs) and
 * holds it from merge to push; it is given back right after the push (or when the landing is held back),
 * and in any case when this process exits. Light landings (docs, tooling) take it too, on purpose: a light
 * push to main during someone else's 20-min gate would make that gate's own final push fail ("main moved")
 * and turn a good landing into a PR. The lock is taken BEFORE the merge: a session that queued behind
 * another and merged the trunk first would always be rejected at push, the one ahead of it having just
 * moved main — so after any wait the trunk is fetched again. The verify child inherits the env token and
 * re-enters the lock. A busy lock is not a failure of the work: `gate busy` → nothing ran, no push, no PR,
 * just `/land` again. Hook mode never queues long: the Stop hook (`--auto --lane docs`, 120 s) never
 * waits and stays silent; SessionEnd (`--auto`, 900 s) waits at most 10 min; and a HEAVY diff in hook mode
 * is refused outright — the gate cannot finish inside a hook budget, and a killed hook would leave an
 * orphan verify holding the lock for nothing. `--lock-wait <min>` (default 180) is the manual queue budget.
 *
 * Usage:
 *   node .claude/hooks/land.mjs                  # land this branch          (`npm run land`)
 *   node .claude/hooks/land.mjs --lane docs      # only if no app code is in the diff
 *   node .claude/hooks/land.mjs --lock-wait <min> # how long to queue for the gate lock (default 180)
 *   node .claude/hooks/land.mjs --auto           # hook mode: quiet, always exits 0
 *   node .claude/hooks/land.mjs --sweep          # every open PR + what blocks it, then every local branch/worktree
 *   node .claude/hooks/land.mjs --sweep --apply  # ...and squash-merge the clean PRs (the local branch section stays read-only;
 *                                                #    deleting branches/worktrees is .claude/hooks/branch-sweep.mjs --apply)
 *   node .claude/hooks/land.mjs --dry-run [--force-land]
 *
 * Override an exception deliberately with `[land-anyway]` in the commit subject.
 * Holds and the override are read from commit SUBJECTS only — never bodies, so a commit
 * that documents these markers does not trip them.
 */
import { spawnSync } from 'node:child_process';
import { existsSync, mkdirSync, readFileSync, realpathSync, writeFileSync } from 'node:fs';
import { basename, dirname, join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const argv = process.argv.slice(2);
const has = (n) => argv.includes(`--${n}`);
const flag = (n, d = null) => { const i = argv.indexOf(`--${n}`); return i === -1 ? d : (argv[i + 1] ?? true); };

const AUTO = has('auto');
const DRY = has('dry-run');
const SWEEP = has('sweep');
const APPLY = has('apply');
const AS_JSON = has('json');
const LANE = String(flag('lane', 'all'));
// The trunk is the remote's default branch (`refs/remotes/origin/HEAD` → strip `origin/`), `main`
// when that ref is not set (a repo cloned without it). `--trunk <name>` always wins.
function defaultTrunk() {
  const r = spawnSync('git', ['symbolic-ref', '--quiet', 'refs/remotes/origin/HEAD'], { encoding: 'utf8', timeout: 30_000 });
  const m = r.status === 0 ? /^refs\/remotes\/origin\/(.+)$/.exec((r.stdout ?? '').trim()) : null;
  return m ? m[1] : 'main';
}
const TRUNK = String(flag('trunk', defaultTrunk()));
const MAX_FILES = Number(flag('max-files', 60));
const MAX_DELETIONS = Number(flag('max-deletions', 2000));

const log = (...a) => { if (!AS_JSON) console.log(...a); };
const git = (args, opts = {}) => spawnSync('git', args, { encoding: 'utf8', timeout: 120_000, ...opts });
const out = (args) => (git(args).stdout ?? '').trim();
// `gh` is a real .exe on every platform — no shell, so multi-line bodies survive verbatim.
// (`runGh` honours METHOD_GH_SCRIPT, the test seam that fakes gh.)
const gh = (args) => runGh(args, { timeout: 120_000 });

const REPO = out(['rev-parse', '--show-toplevel']);
if (!REPO) done({ landed: false, reasons: ['not a git repository'] });
process.chdir(REPO);

// ── which copy of the hooks runs (worktrees) ────────────────────────────────
// `--git-common-dir` is the shared `.git` of the main checkout (`.git` itself when this IS
// the main checkout); its parent is the main checkout, whose `.claude/hooks/` is the copy
// `install.mjs` maintains. A worktree's own copy is only a fallback when the main one is
// missing (fresh clone, hooks never installed).
const MAIN_ROOT = dirname(resolve(REPO, out(['rev-parse', '--git-common-dir']) || '.git'));
const MAIN_HOOKS = join(MAIN_ROOT, '.claude', 'hooks');
const HOOKS = existsSync(join(MAIN_HOOKS, 'verify-gate.mjs')) ? MAIN_HOOKS : join(REPO, '.claude', 'hooks');
const samePath = (a, b) => {
  try {
    const norm = (p) => (process.platform === 'win32' ? realpathSync(p).toLowerCase() : realpathSync(p));
    return norm(a) === norm(b);
  } catch { return false; }
};
// Trampoline: a worktree copy of this file hands over to the main checkout's copy with the
// same arguments and inherited stdio (hook mode included), so stale worktree logic never
// runs. The env marker stops recursion if the two copies ever disagree on what "main" is.
const MAIN_LAND = join(MAIN_HOOKS, 'land.mjs');
if (!process.env.METHOD_LAND_REEXEC && existsSync(MAIN_LAND) && !samePath(MAIN_LAND, fileURLToPath(import.meta.url))) {
  const r = spawnSync(process.execPath, [MAIN_LAND, ...argv], { stdio: 'inherit', env: { ...process.env, METHOD_LAND_REEXEC: '1' } });
  process.exit(r.status ?? 1);
}

// Imported AFTER the trampoline: a worktree copy of this file that lacks the lib must still hand over
// to the main checkout's copy instead of dying on a missing module.
const { classify, deleteRemote, formatReport, markLanded, removeLocal, runGh, summarize } = await import('./lib/branch-hygiene.mjs');

/** Hidden stamp on the PRs this script creates: only those get their body rewritten. */
const DRAFT_MARKER = '<!-- method-land:draft -->';

// After the trampoline on purpose: a stale worktree copy hands over before it ever needs the
// lock library. Optional — without it the gate runs unserialized, as it did before the lock.
const LOCK = await import('./gate-lock.mjs').catch(() => null);
// The landing's lock handle, module-scoped so blocked() / the post-push step can give it back early.
let landLock = null;
const LOCK_WAIT_MIN = (() => { const m = Number(flag('lock-wait', 180)); return Number.isFinite(m) && m >= 0 ? m : 180; })();

/**
 * The "sauf exception" catalogue — machine-checked, fail-closed. Anything here
 * lands only under a human eye, because getting it wrong is expensive or
 * irreversible. Everything NOT here lands automatically.
 */
const EXCEPTIONS = [
  { id: 'schema', why: 'data model / Firestore schema or rules', test: (f) => /SCHEMA\.md$/i.test(f) || /(^|\/)schemas?\//.test(f) || /\.zod\.(ts|js)$/.test(f) || /(firestore|storage)\.(rules|indexes\.json)$/.test(f) },
  { id: 'security', why: 'auth, secrets or middleware', test: (f) => /(^|\/)(auth|middleware)\//.test(f) || /(^|\/)\.env(?!\.example)/.test(f) || /serviceAccount/i.test(f) || /(^|\/)security\//.test(f) },
  { id: 'soul', why: 'the non-negotiables (SOUL.md)', test: (f) => /^SOUL\.md$/.test(f) },
  { id: 'migration', why: 'migration / data backfill', test: (f) => /(^|\/)migrations?\//.test(f) || /(^|\/)[^/]*migrate[^/]*\.(mjs|cjs|js|ts)$/i.test(f) },
  { id: 'infra', why: 'deploy / CI wiring', test: (f) => /^\.github\/workflows\//.test(f) || /(^|\/)apphosting\.yaml$/.test(f) },
];

if (SWEEP) sweep();
else landCurrentBranch();

// ── the branch lane ─────────────────────────────────────────────────────────
function landCurrentBranch() {
  const branch = out(['rev-parse', '--abbrev-ref', 'HEAD']);
  if (!branch || branch === 'HEAD') return done({ landed: false, quiet: AUTO, reasons: ['detached HEAD'] });
  if (branch === TRUNK || branch === 'master') return done({ landed: false, quiet: AUTO, reasons: [`already on ${branch} — nothing to land`] });

  // `.method/` is the gate's own scratch state — never counted as dirty, whether
  // or not the repo has gotten around to gitignoring it.
  // Untrimmed on purpose: trimming the whole porcelain output eats the leading space of an
  // unstaged modification and shifts the first line's path by one char (same bug as
  // verify-gate had). `.method/` is the gate's own scratch state and never counts as dirty.
  // The telemetry ledger is per-machine and gitignored since v318.a (hooks no longer commit it), but a repo that
  // still tracks it keeps a modified file after every turn — that is not work to commit either.
  const dirty = (git(['status', '--porcelain']).stdout ?? '').split('\n')
    .filter((l) => l.length >= 4)
    .filter((l) => !l.slice(3).trim().startsWith('.method/'))
    .filter((l) => l.slice(3).trim().replace(/\\/g, '/') !== 'docs/project/telemetry/sessions.jsonl');
  if (dirty.length) return done({ landed: false, quiet: AUTO, reasons: [`uncommitted changes (${dirty.length} path(s)) — commit, then land`] });

  git(['fetch', 'origin', TRUNK, '--quiet']);
  const base = `origin/${TRUNK}`;
  if (git(['rev-parse', '--verify', '--quiet', base]).status !== 0) return done({ landed: false, quiet: AUTO, reasons: [`no ${base}`] });

  const ahead = out(['log', `${base}..HEAD`, '--oneline']).split('\n').filter(Boolean);
  if (!ahead.length) return done({ landed: false, quiet: AUTO, reasons: [`nothing to land — ${branch} is not ahead of ${base}`] });

  // 2 ─ exceptions, judged on the branch's own changes
  const mergeBase = out(['merge-base', 'HEAD', base]);
  const files = out(['diff', '--name-only', `${mergeBase}..HEAD`]).split('\n').filter(Boolean).map((f) => f.replace(/\\/g, '/'));
  // Holds are honored in commit SUBJECTS only. Scanning bodies made any commit that
  // merely *documents* these markers trip them — which is exactly how this gate first
  // false-positived on its own landing commit.
  const subjects = out(['log', `${base}..HEAD`, '--format=%s']);
  const override = /\[land-anyway\]/i.test(subjects) || has('force-land');
  const reasons = scanExceptions({ files, subjects, branch, mergeBase });

  // Would the gate be heavy? Asked of the gate itself, so this never disagrees with what it will
  // run; `touchesAppCode` is only the fallback for a gate that predates `--plan`.
  const plan = gatePlan(base);
  const heavy = plan ? plan.heavy : touchesAppCode(files);

  // 3 ─ lane guard: the Stop hook only ever lands the risk-free lane, so a
  //     half-built feature can never reach main between two turns. `heavy` too: a diff
  //     `touchesAppCode` misses (an i18n `src/messages/*.json`) still runs the full gate,
  //     and the Stop hook (120 s) must never start that.
  if (LANE === 'docs' && (touchesAppCode(files) || heavy)) {
    return done({ landed: false, quiet: true, reasons: ['app code in the diff — needs an explicit /land at slice close'] });
  }

  if (reasons.length && !override) return blocked(branch, reasons);
  if (override && reasons.length) log(`⚠ overriding ${reasons.length} exception(s) — [land-anyway]`);

  // A heavy gate cannot finish inside a hook budget (SessionEnd 900 s; lint + type-check + test:gate
  // + build is 20+ min) and a killed hook leaves an orphan verify holding the lock for nothing.
  // Nothing runs, nothing is pushed by land (ship-push.sh already pushes the branch on Stop).
  if (AUTO && LANE !== 'docs' && heavy) {
    return done({ landed: false, blocked: true, branch, reasons: ['app code needs an explicit /land — a heavy gate does not fit the SessionEnd hook budget'] });
  }

  // 3b ─ one landing at a time per repository (see the header), light or heavy. Held through
  //      merge → verify → push, freed right after the push / when held back / when done() exits. Before the merge.
  //      A dry run only reads, so it queues only when its verify is heavy (verify takes the lock itself).
  // Busy is never `blocked()`: nothing is wrong with the work, so no push and no PR — just try again.
  // The Stop hook's answer is silent (the next turn retries); everything else says so.
  const busy = (reason) => (AUTO && LANE === 'docs'
    ? done({ landed: false, quiet: true, reasons: [reason] })
    : done({ landed: false, blocked: true, branch, reasons: [reason] }));
  const lockWaitMs = AUTO ? (LANE === 'docs' ? 0 : 10 * 60_000) : LOCK_WAIT_MIN * 60_000;
  if (!DRY || heavy) {
    if (!LOCK) { if (heavy) console.error('⚠ gate-lock.mjs missing — heavy gate runs unserialized'); }
    else {
      let lock = null;
      try {
        lock = landLock = LOCK.acquireGateLock({
          path: LOCK.gateLockPath(REPO),
          info: { label: basename(REPO), worktree: REPO, branch, cmd: 'land' },
          maxWaitMs: lockWaitMs,
          onWait: (h, waitedMs, lockFile) => console.error(`⏳ gate lock held by ${LOCK.describeHolder(h, lockFile)} — waiting (${Math.round(waitedMs / 60_000)} min so far, up to ${Math.round(lockWaitMs / 60_000)} min)`),
          onStale: (h) => console.error(`♻ removed a stale gate lock left by ${LOCK.describeHolder(h)}`),
        });
      } catch (e) {
        console.error(`⚠ gate lock unavailable (${e?.message ?? e}) — landing runs unserialized`);
      }
      if (lock && !lock.ok) {
        return busy(`gate busy — lock held by ${LOCK.describeHolder(lock.holder, lock.path)}; ${AUTO && lockWaitMs === 0 ? 'hook mode never waits' : `waited ${Math.round(lock.waitedMs / 60_000)} min`} — nothing ran, run /land again when it frees`);
      }
      // The session ahead of us just moved main: refresh the ref so the merge below integrates it.
      if (lock?.ok && lock.waitedMs > 0) git(['fetch', 'origin', TRUNK, '--quiet']);
    }
  }

  // 4 ─ integrate the trunk (merge, never rebase — no rewrite, no checkout)
  if (git(['merge-base', '--is-ancestor', base, 'HEAD']).status !== 0) {
    log(`↻ ${base} moved — merging it in`);
    if (DRY) log('  (dry-run: skipped)');
    else if (git(['merge', '--no-edit', base]).status !== 0) {
      git(['merge', '--abort']);
      return blocked(branch, [`conflict merging ${base} — resolve it on the branch, then /land`]);
    }
  }

  // 5 ─ the verify gate is the only brake; a stale marker is not a green light
  // The gate caps every script it runs at 30 min (its TIMEOUT; `build` explicitly), so this
  // outer cap is a last resort only — lint + typecheck + test + build at their maximum.
  // At 30 min it used to kill an honest gate before the gate's own caps could speak.
  const verify = spawnSync(process.execPath, [join(HOOKS, 'verify-gate.mjs'), '--base', base, ...(AS_JSON || AUTO ? ['--quiet'] : []),
    // Only reached WITHOUT the lock when land itself ended up without it (lib missing / threw) — verify then queues
    // on its own, and must not out-wait the budget land was given: a hook never queues, a manual run keeps --lock-wait.
    '--lock-wait', String(AUTO ? 0 : LOCK_WAIT_MIN)], {
    stdio: AS_JSON || AUTO ? 'ignore' : 'inherit', timeout: 4 * 30 * 60_000,
  });
  const marker = readMarker();
  const head = out(['rev-parse', 'HEAD']);
  // Verify could not get the lock (only possible when land holds none): same answer as a busy lock.
  if (marker && marker.sha === head && marker.lock?.denied) {
    const why = (marker.reasons ?? []).find((r) => /^gate lock busy/.test(r));
    return busy(why ? why.replace(/^gate lock busy/, 'gate busy') : 'gate busy — verify could not get the gate lock');
  }
  if (verify.status !== 0 || !marker || marker.verdict !== 'green' || marker.sha !== head) {
    return blocked(branch, [
      !marker ? 'no verify marker was written'
        : marker.sha !== head ? 'verify marker is stale (not this commit)'
          : `verify ${marker.verdict}: ${marker.reasons.join('; ')}`,
    ]);
  }

  // 6 ─ land
  if (DRY) return done({ landed: false, dryRun: true, mode: marker.mode, files: files.length, reasons: [`dry-run — would land ${ahead.length} commit(s) on ${TRUNK}`] });
  // The verify gate above IS the quality gate. An app's own `pre-push` hook re-running
  // lint/typecheck/build here is redundant — and this fleet's hooks include a prod build that
  // outlives git()'s 2 min cap, so the push died with an EMPTY stderr ("rejected: ") every
  // time (2026-09-16). `SKIP_QUALITY_GATES=1` is the bypass those hooks honour; they still run
  // (the proto anti-leak guard sits before the bypass on purpose), only their gates are skipped.
  // `--no-verify` would skip that guard too, so it is not used. 10 min covers the light path.
  // `head` — the sha the marker was checked against — not `HEAD`: a commit made on this branch while a
  // background /land was verifying must never reach main unverified.
  const push = git(['push', 'origin', `${head}:refs/heads/${TRUNK}`], {
    env: { ...process.env, SKIP_QUALITY_GATES: '1' }, timeout: 10 * 60_000,
  });
  if (push.status !== 0) {
    const why = push.error?.code === 'ETIMEDOUT'
      ? 'push timed out after 10 min (a pre-push hook that ignores SKIP_QUALITY_GATES?)'
      : (push.stderr ?? '').trim().split('\n').slice(-2).join(' ') || `git exit ${push.status ?? push.error?.code ?? '?'}`;
    return blocked(branch, [`push to ${TRUNK} rejected: ${why}`]);
  }

  // Main has moved and nothing below needs to be serialized with other landings: give the lock back BEFORE
  // the gh / fetch / branch-cleanup round-trips (seconds to minutes), so the sessions queued behind us start now.
  landLock?.release();
  const pr = findPr(branch);
  writeState({ reasons: [], landedSha: head });
  const cleanup = postLandCleanup(branch);
  return done({
    landed: true, branch, trunk: TRUNK, sha: head.slice(0, 7), commits: ahead.length,
    files: files.length, mode: marker.mode, pr: pr?.number ?? null, cleanup,
    reasons: [`landed ${ahead.length} commit(s) on ${TRUNK} (${head.slice(0, 7)})${pr ? ` — PR #${pr.number} closes as merged` : ''}${cleanup.length ? ` · ${cleanup.join(' · ')}` : ''}`],
  });
}

/**
 * After a successful fast-forward the work is on the trunk: nothing of the branch may linger.
 * Every step is best-effort and says what it skipped — a failed cleanup never undoes the landing.
 */
function postLandCleanup(branch) {
  const notes = [];
  const f = git(['fetch', 'origin', `${TRUNK}:${TRUNK}`, '--quiet']);
  if (f.status === 0) notes.push(`local ${TRUNK} advanced`);
  else {
    const err = (f.stderr ?? '').trim().split('\n').pop() || 'fetch failed';
    notes.push(`local ${TRUNK} not advanced (${/checked out|refusing/i.test(f.stderr ?? '') ? 'checked out elsewhere' : err})`);
  }
  const rem = deleteRemote({ cwd: REPO, branch, trunk: TRUNK });
  notes.push(...rem.steps, ...rem.errors.map((e) => `⚠ ${e}`));
  // The branch is checked out here, so it normally survives this call: record it, and the SessionStart
  // `branch-sweep.mjs --landed-only` removes it once nobody sits in it. Branches NOT in this ledger are never auto-deleted.
  markLanded(REPO, branch);
  const loc = removeLocal({ cwd: REPO, branch, trunk: TRUNK });
  notes.push(loc.ok ? 'removed local branch + worktree' : `local branch kept (${loc.skipped})`);
  return notes;
}

/**
 * The gate's own answer to "how heavy is this diff?" (`verify-gate.mjs --plan`: one JSON line,
 * no marker, no script, no lock). Only asked of a gate that knows `--plan` — an older one
 * ignores the flag and would run the WHOLE gate here, unlocked, just to be asked a question.
 * null when unavailable; the caller falls back to `touchesAppCode`.
 */
function gatePlan(base) {
  const gate = join(HOOKS, 'verify-gate.mjs');
  let src = '';
  try { src = readFileSync(gate, 'utf8'); } catch { return null; }
  if (!src.includes("has('plan')")) return null;
  const r = spawnSync(process.execPath, [gate, '--plan', '--base', base], { encoding: 'utf8', timeout: 120_000 });
  if (r.status !== 0) return null;
  const last = (r.stdout ?? '').split('\n').map((x) => x.trim()).filter(Boolean).pop();
  try {
    const plan = JSON.parse(last ?? '');
    return plan?.plan === 1 && typeof plan.heavy === 'boolean' ? plan : null;
  } catch { return null; }
}

/** App code = what a build can break and a deploy can ship. Docs/tooling is not. */
function touchesAppCode(files) {
  return files.some((f) =>
    /\.(ts|tsx|js|jsx|vue|svelte|css|scss|html)$/i.test(f) &&
    !/^(docs|qa|prompts|TEMPLATES|projects)\//.test(f) &&
    !/(^|\/)proto\//.test(f) &&
    !/^(scripts|tools|\.claude|\.github)\//.test(f));
}

function scanExceptions({ files, subjects, branch, mergeBase, ref = null }) {
  const hits = [];
  for (const e of EXCEPTIONS) {
    const m = files.filter(e.test);
    if (m.length) hits.push(`${e.id}: ${e.why} — ${m.slice(0, 3).join(', ')}${m.length > 3 ? ` +${m.length - 3} more` : ''}`);
  }
  // A dependency edit blocks; a scripts-only package.json touch does not.
  for (const f of files.filter((p) => /(^|\/)package\.json$/.test(p))) {
    if (depsChanged(f, mergeBase, ref)) hits.push(`deps: dependency change in ${f} (supply chain)`);
  }
  if (files.some((f) => /(package-lock\.json|pnpm-lock\.yaml|yarn\.lock)$/.test(f))) hits.push('deps: lockfile change (supply chain)');
  if (files.length > MAX_FILES) hits.push(`scale: ${files.length} files changed (> ${MAX_FILES}) — split the slice`);
  const deletions = out(['diff', '--numstat', `${mergeBase}..HEAD`]).split('\n')
    .reduce((n, l) => n + (Number(l.split('\t')[1]) || 0), 0);
  if (deletions > MAX_DELETIONS) hits.push(`scale: ${deletions} lines deleted (> ${MAX_DELETIONS})`);
  if (/\bwip\b/i.test(branch)) hits.push('hold: branch is marked WIP');
  if (/\[(no-auto-merge|wip|hold)\]/i.test(subjects)) hits.push('hold: a commit subject asks for a human merge');
  if (/needs decision/i.test(subjects)) hits.push('decision: a commit subject flags "Needs decision"');
  return hits;
}

function depsChanged(file, mergeBase, ref = null) {
  const parse = (s) => { try { return JSON.parse(s || '{}'); } catch { return {}; } };
  const before = parse(out(['show', `${mergeBase}:${file}`]));
  const after = ref ? parse(out(['show', `${ref}:${file}`]))
    : parse(existsSync(join(REPO, file)) ? readFileSync(join(REPO, file), 'utf8') : '{}');
  const pick = (p) => JSON.stringify([p.dependencies ?? {}, p.devDependencies ?? {}, p.peerDependencies ?? {}]);
  return pick(before) !== pick(after);
}

// ── held back: make it visible on GitHub, as a DRAFT PR, exactly once per reason set ─────
function blocked(branch, reasons) {
  // A held-back landing is finished with main: give the lock back BEFORE the branch push and the gh
  // round-trips (seconds to minutes) so the sessions queued behind it are not kept waiting on them.
  landLock?.release();
  const shown = [...reasons];
  let pushed = DRY;
  if (!DRY) {
    // Plain push of THIS branch to its own name, never forced (a bare `git push` fails for a branch cut from
    // origin/main, whose upstream is the trunk). A rejection is part of the report — the work is NOT on GitHub then.
    const p = git(['push', '-u', 'origin', branch], { env: { ...process.env, SKIP_QUALITY_GATES: '1' }, timeout: 10 * 60_000 });
    pushed = p.status === 0;
    if (!pushed) {
      const why = (p.stderr ?? '').trim().split('\n').slice(-2).join(' ') || `git exit ${p.status ?? p.error?.code ?? '?'}`;
      console.error(`land: push of ${branch} rejected: ${why}`);
      shown.push(`⚠ push of ${branch} rejected — the branch is NOT on GitHub: ${why}`);
    }
  }
  let pr = findPr(branch);
  const changed = JSON.stringify(readState().reasons ?? []) !== JSON.stringify(reasons);
  if (!DRY && pushed && (changed || !pr)) {
    const body = bodyFile(heldBody(branch, reasons));
    if (!pr) {
      const title = out(['log', '-1', '--format=%s']) || `wip(${branch}): needs a human look`;
      if (gh(['pr', 'create', '--draft', '--base', TRUNK, '--head', branch, '--title', title, '--body-file', body]).status === 0) pr = findPr(branch);
    } else if ((pr.body ?? '').includes(DRAFT_MARKER)) {
      gh(['pr', 'edit', String(pr.number), '--body-file', body]); // our own draft: rewritten, not appended
    } else {
      // A PR this script did not create (e.g. /ship's): never overwrite its body — add a comment.
      gh(['pr', 'comment', String(pr.number), '--body-file', bodyFile(`**Still not auto-landed:**\n\n${reasons.map((r) => `- ${r}`).join('\n')}\n`)]);
    }
    writeState({ reasons, prNumber: pr?.number ?? null });
  }
  return done({ landed: false, blocked: true, branch, pr: pr?.number ?? null, url: pr?.url ?? null, pushed, reasons: shown });
}

/** The draft PR body: the reason, then the decision it asks of the operator. Idempotent — rewritten, not appended. */
function heldBody(branch, reasons) {
  const bullets = reasons.map((r) => `- ${r}`).join('\n');
  return [
    DRAFT_MARKER, '',
    `**Not auto-landed** — the METHOD landing gate held \`${branch}\` back:`, '', bullets, '',
    '### Needs decision', '',
    '- Land it as it is → put `[land-anyway]` in a commit subject, then `/land`. **Reco:** only if the reason is harmless.',
    '- Fix the reason → it lands on the next `/land`.',
    '- Abandon → close this PR and delete the branch; nothing else keeps it alive.', '',
    'This PR is a draft on purpose: it exists so the work is visible on GitHub, not to be merged blind.', '',
  ].join('\n');
}

// ── sweep: so PRs — and local branches — can never silently accumulate again ─────────────
function sweep() {
  try {
    const rows = sweepPrs();
    const local = sweepLocal();
    return done({ landed: false, sweep: (rows ?? []).map(({ number, ageDays, clean, reasons }) => ({ number, ageDays, clean, reasons })), local });
  } catch (e) {
    if (!AUTO) throw e;
    return done({ landed: false, reasons: [`sweep failed: ${e?.message ?? e}`] });
  }
}

/**
 * Local branches + worktrees, classified by lib/branch-hygiene.mjs — a READ-ONLY report here.
 * Deleting them is `branch-sweep.mjs --apply`, a separate script that can never merge a PR
 * (`land.mjs --sweep --apply` squash-merges PRs, so nothing that deletes lives behind it).
 */
function sweepLocal() {
  const heldCheck = (b) => {
    const base = `origin/${TRUNK}`;
    const mergeBase = out(['merge-base', b, base]);
    if (!mergeBase) return [];
    const files = out(['diff', '--name-only', `${mergeBase}..${b}`]).split('\n').filter(Boolean).map((f) => f.replace(/\\/g, '/'));
    const subjects = out(['log', `${base}..${b}`, '--format=%s']);
    if (/\[land-anyway\]/i.test(subjects)) return [];
    return scanExceptions({ files, subjects, branch: b, mergeBase, ref: b });
  };
  const report = classify({ cwd: REPO, trunk: TRUNK, fetch: !DRY, remote: !AUTO, heldCheck });
  if (report.error) { if (!AUTO) log(`\nbranches: ${report.error}`); return { report }; }
  const s = summarize(report);
  if (!AS_JSON && !AUTO) {
    log('\nLocal branches and worktrees');
    for (const l of formatReport(report)) log(l);
    if (report.fetchError) log(`  ⚠ fetch failed (classification may be stale): ${report.fetchError}`);
    if (s.residues.some((r) => r.removable)) log('Delete the removable ones with: node .claude/hooks/branch-sweep.mjs --apply');
  }
  return { report };
}

function sweepPrs() {
  const res = gh(['pr', 'list', '--state', 'open', '--limit', '100', '--json', 'number,title,headRefName,createdAt,changedFiles,additions,deletions,isDraft,mergeable,url']);
  if (res.status !== 0) { log('gh pr list failed: ' + (res.stderr ?? '').trim()); return null; }
  const rows = [];
  for (const pr of JSON.parse(res.stdout || '[]')) {
    const ageDays = Math.floor((Date.now() - Date.parse(pr.createdAt)) / 86_400_000);
    const files = (gh(['pr', 'diff', String(pr.number), '--name-only']).stdout ?? '')
      .split('\n').filter(Boolean).map((f) => f.replace(/\\/g, '/'));
    const reasons = [];
    for (const e of EXCEPTIONS) if (files.some(e.test)) reasons.push(`${e.id}: ${e.why}`);
    if (files.some((f) => /(package-lock\.json|pnpm-lock\.yaml|yarn\.lock|(^|\/)package\.json)$/.test(f))) reasons.push('deps: dependency/lockfile change');
    if (pr.isDraft) reasons.push('draft');
    if (pr.mergeable === 'CONFLICTING') reasons.push('conflicts with the trunk');
    if (pr.changedFiles > MAX_FILES) reasons.push(`scale: ${pr.changedFiles} files`);
    if (ageDays > 30) reasons.push(`stale: ${ageDays} days old — decide it, don't merge it blind`);
    rows.push({ ...pr, ageDays, reasons, clean: reasons.length === 0 });
  }
  const clean = rows.filter((r) => r.clean);
  if (!AS_JSON) {
    log(`\n${rows.length} open PR(s) · ${clean.length} auto-landable\n`);
    for (const r of rows) {
      log(`${r.clean ? '✓' : '⛔'} #${r.number}  ${r.ageDays}d  ${r.changedFiles}f +${r.additions}/-${r.deletions}  ${r.title}`);
      for (const why of r.reasons) log(`     – ${why}`);
    }
  }
  if (APPLY && !DRY) {
    for (const r of clean) {
      const m = gh(['pr', 'merge', String(r.number), '--squash', '--delete-branch']);
      log(`${m.status === 0 ? '🚀 merged' : '✗ failed'} #${r.number}${m.status === 0 ? '' : ': ' + (m.stderr ?? '').trim().split('\n').pop()}`);
    }
  } else if (clean.length) log(`\nRun with --apply to squash-merge the ${clean.length} clean PR(s).`);
  return rows;
}

// ── plumbing ────────────────────────────────────────────────────────────────
function findPr(branch) {
  const res = gh(['pr', 'list', '--head', branch, '--state', 'open', '--json', 'number,url,body']);
  if (res.status !== 0) return null;
  try { return JSON.parse(res.stdout || '[]')[0] ?? null; } catch { return null; }
}
function methodDir() {
  const dir = join(REPO, '.method');
  if (!existsSync(dir)) mkdirSync(dir, { recursive: true });
  return dir;
}
function readMarker() { try { return JSON.parse(readFileSync(join(REPO, '.method', 'verify-ok.json'), 'utf8')); } catch { return null; } }
function readState() { try { return JSON.parse(readFileSync(join(REPO, '.method', 'land-state.json'), 'utf8')); } catch { return {}; } }
function writeState(s) {
  writeFileSync(join(methodDir(), 'land-state.json'), JSON.stringify({ ...readState(), ...s, at: new Date().toISOString() }, null, 2) + '\n');
}
/** gh bodies go through a file, never the shell, so markdown survives verbatim. */
function bodyFile(text) {
  const p = join(methodDir(), 'pr-body.md');
  writeFileSync(p, text);
  return p;
}

function done(result) {
  if (AS_JSON) console.log(JSON.stringify(result, null, 2));
  else if (!result.quiet) {
    if (result.landed) log(`\n🚀 ${result.reasons[0]}`);
    else if (result.blocked) {
      log('\n⛔ held back — not landed:');
      for (const r of result.reasons) log(`  – ${r}`);
      if (result.url) log(`  → ${result.url}`);
    } else if (!SWEEP) log(`· ${result.reasons?.[0] ?? 'nothing to do'}`);
  }
  if (AUTO && result.landed) console.log(JSON.stringify({ systemMessage: `🚀 landed on ${TRUNK}: ${result.reasons[0]}` }));
  if (AUTO && result.blocked) console.log(JSON.stringify({ systemMessage: `⛔ not landed — ${result.reasons[0]}` }));
  process.exit(AUTO || SWEEP || result.landed || result.dryRun || !result.blocked ? 0 : 1);
}
