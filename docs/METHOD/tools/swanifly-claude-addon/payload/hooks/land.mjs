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
 *   5. fast-forward `origin/main` to HEAD (`git push origin HEAD:main`) — GitHub
 *      marks any open PR for the branch as merged, so there is no PR dance
 *   6. if held back: push the branch, ensure a PR exists, and say why exactly once
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
 * Usage:
 *   node .claude/hooks/land.mjs                  # land this branch          (`npm run land`)
 *   node .claude/hooks/land.mjs --lane docs      # only if no app code is in the diff
 *   node .claude/hooks/land.mjs --auto           # hook mode: quiet, always exits 0
 *   node .claude/hooks/land.mjs --sweep          # every open PR + what blocks it
 *   node .claude/hooks/land.mjs --sweep --apply  # ...and squash-merge the clean ones
 *   node .claude/hooks/land.mjs --dry-run [--force-land]
 *
 * Override an exception deliberately with `[land-anyway]` in the commit subject.
 * Holds and the override are read from commit SUBJECTS only — never bodies, so a commit
 * that documents these markers does not trip them.
 */
import { spawnSync } from 'node:child_process';
import { existsSync, mkdirSync, readFileSync, realpathSync, writeFileSync } from 'node:fs';
import { dirname, join, resolve } from 'node:path';
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
const gh = (args) => spawnSync('gh', args, { encoding: 'utf8', timeout: 120_000 });

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

  // 3 ─ lane guard: the Stop hook only ever lands the risk-free lane, so a
  //     half-built feature can never reach main between two turns.
  if (LANE === 'docs' && touchesAppCode(files)) {
    return done({ landed: false, quiet: true, reasons: ['app code in the diff — needs an explicit /land at slice close'] });
  }

  if (reasons.length && !override) return blocked(branch, reasons);
  if (override && reasons.length) log(`⚠ overriding ${reasons.length} exception(s) — [land-anyway]`);

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
  const verify = spawnSync(process.execPath, [join(HOOKS, 'verify-gate.mjs'), '--base', base, ...(AS_JSON || AUTO ? ['--quiet'] : [])], {
    stdio: AS_JSON || AUTO ? 'ignore' : 'inherit', timeout: 4 * 30 * 60_000,
  });
  const marker = readMarker();
  const head = out(['rev-parse', 'HEAD']);
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
  const push = git(['push', 'origin', `HEAD:refs/heads/${TRUNK}`], {
    env: { ...process.env, SKIP_QUALITY_GATES: '1' }, timeout: 10 * 60_000,
  });
  if (push.status !== 0) {
    const why = push.error?.code === 'ETIMEDOUT'
      ? 'push timed out after 10 min (a pre-push hook that ignores SKIP_QUALITY_GATES?)'
      : (push.stderr ?? '').trim().split('\n').slice(-2).join(' ') || `git exit ${push.status ?? push.error?.code ?? '?'}`;
    return blocked(branch, [`push to ${TRUNK} rejected: ${why}`]);
  }

  const pr = findPr(branch);
  writeState({ reasons: [], landedSha: head });
  return done({
    landed: true, branch, trunk: TRUNK, sha: head.slice(0, 7), commits: ahead.length,
    files: files.length, mode: marker.mode, pr: pr?.number ?? null,
    reasons: [`landed ${ahead.length} commit(s) on ${TRUNK} (${head.slice(0, 7)})${pr ? ` — PR #${pr.number} closes as merged` : ''}`],
  });
}

/** App code = what a build can break and a deploy can ship. Docs/tooling is not. */
function touchesAppCode(files) {
  return files.some((f) =>
    /\.(ts|tsx|js|jsx|vue|svelte|css|scss|html)$/i.test(f) &&
    !/^(docs|qa|prompts|TEMPLATES|projects)\//.test(f) &&
    !/(^|\/)proto\//.test(f) &&
    !/^(scripts|tools|\.claude|\.github)\//.test(f));
}

function scanExceptions({ files, subjects, branch, mergeBase }) {
  const hits = [];
  for (const e of EXCEPTIONS) {
    const m = files.filter(e.test);
    if (m.length) hits.push(`${e.id}: ${e.why} — ${m.slice(0, 3).join(', ')}${m.length > 3 ? ` +${m.length - 3} more` : ''}`);
  }
  // A dependency edit blocks; a scripts-only package.json touch does not.
  for (const f of files.filter((p) => /(^|\/)package\.json$/.test(p))) {
    if (depsChanged(f, mergeBase)) hits.push(`deps: dependency change in ${f} (supply chain)`);
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

function depsChanged(file, mergeBase) {
  const parse = (s) => { try { return JSON.parse(s || '{}'); } catch { return {}; } };
  const before = parse(out(['show', `${mergeBase}:${file}`]));
  const after = parse(existsSync(join(REPO, file)) ? readFileSync(join(REPO, file), 'utf8') : '{}');
  const pick = (p) => JSON.stringify([p.dependencies ?? {}, p.devDependencies ?? {}, p.peerDependencies ?? {}]);
  return pick(before) !== pick(after);
}

// ── held back: make it visible on GitHub, exactly once per reason set ────────
function blocked(branch, reasons) {
  if (!DRY) {
    const hasUpstream = git(['rev-parse', '--abbrev-ref', '--symbolic-full-name', '@{u}']).status === 0;
    git(hasUpstream ? ['push'] : ['push', '-u', 'origin', branch]);
  }
  let pr = findPr(branch);
  const changed = JSON.stringify(readState().reasons ?? []) !== JSON.stringify(reasons);
  if (!DRY && changed) {
    const bullets = reasons.map((r) => `- ${r}`).join('\n');
    if (!pr) {
      const title = out(['log', '-1', '--format=%s']) || `wip(${branch}): needs a human look`;
      const body = bodyFile(`**Not auto-landed** — the METHOD landing gate held this back:\n\n${bullets}\n\nFix the reason and it lands on the next \`/land\`. To land it as-is, put \`[land-anyway]\` in the commit subject.\n`);
      if (gh(['pr', 'create', '--base', TRUNK, '--head', branch, '--title', title, '--body-file', body]).status === 0) pr = findPr(branch);
    } else {
      gh(['pr', 'comment', String(pr.number), '--body-file', bodyFile(`**Still not auto-landed:**\n\n${bullets}\n`)]);
    }
    writeState({ reasons, prNumber: pr?.number ?? null });
  }
  return done({ landed: false, blocked: true, branch, pr: pr?.number ?? null, url: pr?.url ?? null, reasons });
}

// ── sweep: so PRs can never silently accumulate again ───────────────────────
function sweep() {
  const res = gh(['pr', 'list', '--state', 'open', '--limit', '100', '--json', 'number,title,headRefName,createdAt,changedFiles,additions,deletions,isDraft,mergeable,url']);
  if (res.status !== 0) return done({ landed: false, reasons: ['gh pr list failed: ' + (res.stderr ?? '').trim()] });
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
  return done({ landed: false, sweep: rows.map(({ number, ageDays, clean, reasons }) => ({ number, ageDays, clean, reasons })) });
}

// ── plumbing ────────────────────────────────────────────────────────────────
function findPr(branch) {
  const res = gh(['pr', 'list', '--head', branch, '--state', 'open', '--json', 'number,url']);
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
