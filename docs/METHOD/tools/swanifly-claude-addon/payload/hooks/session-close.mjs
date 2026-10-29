#!/usr/bin/env node
/**
 * .claude/hooks/session-close.mjs — a finished sub-session closes itself (METHOD 336.a).
 *
 * A hook cannot call the app's session tools (archive, send to another session), so the split is:
 * this script decides and does the git side, then prints the exact app-tool steps the agent runs (NEXT 1 / NEXT 2).
 *
 *   --check (default)   is this sub-session done? landed on the trunk · clean tree · nothing unpushed · no open PR. Exit 0.
 *   --apply             when done: `git switch --detach`, then `branch-sweep.mjs --apply --landed-only --only <branch>`
 *                       (falling back to `--only <branch>` alone — its own guards still apply — when land's ledger
 *                       never saw the branch). Not done: say why, change nothing, exit 1.
 *   --pr <n>            the exception path. Needs `.method/kasper/pr-<n>.json` = {verdict:"approve"|"block", summary, sha}.
 *                       Irreversible in production (rules, indexes, migrations, secrets, SOUL.md), a hold marker, a
 *                       kasper block, a missing verdict or a verdict for another sha → a QUIZ payload, nothing merged, exit 2.
 *                       Otherwise: verify gate green at the PR head, `gh pr ready`, `gh pr merge --squash --match-head-commit`
 *                       (never --admin, never --delete-branch), then the branch through branch-sweep. `--dry-run` = the plan.
 *   --stale [--days 3] [--fleet]   open PRs older than N days, for regine's weekly pass.
 *   --json              machine output.
 * Never: force · --admin · --delete-branch · rebase · a checkout of the trunk.
 */
import { spawnSync } from 'node:child_process';
import { existsSync, readFileSync, writeFileSync } from 'node:fs';
import { dirname, join, resolve } from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';
import { dirtyPaths, runGh, trunkOf } from './lib/branch-hygiene.mjs';

const argv = process.argv.slice(2);
const has = (n) => argv.includes(`--${n}`);
const flag = (n, d = null) => { const i = argv.indexOf(`--${n}`); return i === -1 ? d : (argv[i + 1] ?? d); };
const AS_JSON = has('json');
const DRY = has('dry-run');
const HERE = dirname(fileURLToPath(import.meta.url));

const git = (args, cwd = REPO) => spawnSync('git', args, { cwd, encoding: 'utf8', timeout: 120_000 });
const gout = (args) => (git(args).stdout ?? '').trim();
const REPO = (spawnSync('git', ['rev-parse', '--show-toplevel'], { encoding: 'utf8' }).stdout ?? '').trim();
const say = (...a) => { if (!AS_JSON) console.log(...a); };
const finish = (payload, code) => { if (AS_JSON) console.log(JSON.stringify(payload, null, 2)); process.exit(code); };

if (!REPO && !has('fleet')) { say('session-close: not a git repository'); finish({ error: 'not a git repository' }, 1); }
const TRUNK = REPO ? String(flag('trunk', trunkOf(REPO))) : 'main';
// The decisions and the sweep run from the MAIN checkout's hooks when present (a worktree's frozen copy may be stale),
// exactly as land.mjs / verify-gate resolve them.
const MAIN_ROOT = REPO ? dirname(resolve(REPO, gout(['rev-parse', '--git-common-dir']) || '.git')) : null;
const MAIN_HOOKS = MAIN_ROOT ? join(MAIN_ROOT, '.claude', 'hooks') : HERE;
const SWEEP_FILE = existsSync(join(MAIN_HOOKS, 'branch-sweep.mjs')) ? join(MAIN_HOOKS, 'branch-sweep.mjs') : join(HERE, 'branch-sweep.mjs');
// An older copy would silently ignore newer checks: take the first copy at LIB_VERSION >= 2, else refuse.
let LIB = null;
for (const f of [join(MAIN_HOOKS, 'lib', 'session-close.mjs'), join(HERE, 'lib', 'session-close.mjs')]) {
  if (!existsSync(f)) continue;
  const m = await import(pathToFileURL(f).href);
  if ((m.LIB_VERSION ?? 0) >= 2 && typeof m.isKasperNo === 'function') { LIB = m; break; }
}
if (!LIB) { say('session-close: no lib/session-close.mjs at LIB_VERSION >= 2 — refusing (recopy the hooks)'); finish({ error: 'stale lib' }, 1); }
const { NEXT_LINES, buildQuiz, decidePr, evaluateDone, isKasperNo, quizMarkdown, staleFilter } = LIB;
const ghJson = (args) => {
  const r = runGh(args, { cwd: REPO || undefined, timeout: 120_000 });
  if (r.status !== 0) return { error: (r.stderr ?? '').trim().split('\n').pop() || `gh exit ${r.status}` };
  try { return { data: JSON.parse(r.stdout || 'null') }; } catch { return { error: 'gh returned non-JSON' }; }
};

function sweepBranch(branch, { landedOnly }) {
  // branch-sweep splits --only on commas: a name with one would target two other branches. Keep it, say so.
  if (branch.includes(',')) return [{ branch, ok: false, skipped: 'branch name contains a comma — branch-sweep cannot target it safely' }];
  const run = (extra) => spawnSync(process.execPath, [SWEEP_FILE, '--apply', '--json', '--only', branch, ...extra], { cwd: REPO, encoding: 'utf8', timeout: 180_000 });
  const parse = (r) => { try { return JSON.parse(r.stdout).actions ?? []; } catch { return []; } };
  let actions = landedOnly ? parse(run(['--landed-only'])) : [];
  if (!actions.some((a) => a.ok)) actions = parse(run([])); // not in land's ledger (integrated another way): branch-sweep's own guards still apply
  return actions;
}

function checkFacts() {
  const branch = gout(['rev-parse', '--abbrev-ref', 'HEAD']);
  git(['fetch', 'origin', TRUNK, '--quiet']);
  const base = `origin/${TRUNK}`;
  const landed = branch !== 'HEAD' && branch !== TRUNK && git(['merge-base', '--is-ancestor', 'HEAD', base]).status === 0;
  const dirty = dirtyPaths(REPO);
  const ul = git(['rev-list', 'HEAD', '--not', '--remotes']);
  const unpushed = (ul.stdout ?? '').split('\n').filter(Boolean);
  const unpushedError = ul.status !== 0;
  const pr = ghJson(['pr', 'list', '--head', branch, '--state', 'open', '--json', 'number,url']);
  const openPr = pr.data?.[0] ?? null;
  return { branch, trunk: TRUNK, landed, dirty, unpushed, unpushedError, openPr, prError: pr.error ?? null };
}

function printNext() { for (const l of NEXT_LINES) say(l); }

function cmdCheckOrApply() {
  const facts = checkFacts();
  if (facts.branch === 'HEAD') { say('· detached HEAD — nothing to close (already detached)'); }
  const verdict = evaluateDone(facts);
  const result = { ...facts, ...verdict, applied: [] };
  if (!has('apply')) {
    say(verdict.done ? `✓ done — ${facts.branch} is landed, clean, pushed and has no open PR` : `✗ not done — ${verdict.reasons.join(' · ')}`);
    return finish(result, 0);
  }
  if (!verdict.done) { say(`✗ not done — ${verdict.reasons.join(' · ')}\n  nothing changed`); return finish(result, 1); }
  const sw = git(['switch', '--detach']);
  if (sw.status !== 0) { say(`✗ could not detach HEAD: ${(sw.stderr ?? '').trim()}`); return finish({ ...result, done: false, reasons: ['git switch --detach failed'] }, 1); }
  result.applied = sweepBranch(facts.branch, { landedOnly: true });
  for (const a of result.applied) say(`${a.ok ? '🧹 removed' : '⏭ kept'} ${a.branch}${a.skipped ? ` (${a.skipped})` : ''}`);
  if (!result.applied.length) say(`⏭ ${facts.branch} was not removed by branch-sweep (its guards said no) — the next SessionStart sweep retries`);
  if (!AS_JSON) printNext();
  return finish({ ...result, next: NEXT_LINES }, 0);
}

function cmdPr(n) {
  const view = ghJson(['pr', 'view', String(n), '--json', 'number,headRefName,headRefOid,isDraft,state,files,url,title,baseRefName,isCrossRepository']);
  if (view.error) { say(`✗ cannot read PR #${n}: ${view.error}`); return finish({ error: view.error }, 1); }
  const pr = view.data;
  let verdict = null;
  try { verdict = JSON.parse(readFileSync(join(REPO, '.method', 'kasper', `pr-${n}.json`), 'utf8')); } catch { /* missing = no review */ }
  // kasper's "no" goes back to the session that wrote the PR — it is not the operator's decision to take.
  if (isKasperNo(verdict)) {
    say(`✗ kasper said ${verdict.verdict} on PR #${n} — back to the session, fix it, then ask kasper again.\n${verdict.summary ?? ''}`);
    return finish({ blocked: true, verdict: verdict.verdict, summary: verdict.summary ?? '' }, 1);
  }
  // Everything the decision reads comes from LOCAL git (the PR list of `gh` is capped at 100 files). A failure is a quiz, not a guess.
  const fetched = git(['fetch', 'origin', '--quiet']);
  const range = `origin/${TRUNK}`;
  let filesError = null;
  let subjectsError = null;
  const diff = fetched.status === 0 ? git(['diff', '--name-only', '--no-renames', `${range}...${pr.headRefOid}`]) : fetched;
  if (diff.status !== 0) filesError = (diff.stderr ?? '').trim().split('\n').pop() || 'git diff failed';
  else pr.files = (diff.stdout ?? '').split('\n').filter(Boolean);
  const log = fetched.status === 0 ? git(['log', `${range}..${pr.headRefOid}`, '--format=%s']) : fetched;
  if (log.status !== 0) subjectsError = true;
  const subjects = log.status === 0 ? (log.stdout ?? '').split('\n').filter(Boolean) : [];
  const d = decidePr({ pr, verdict, subjects, trunk: TRUNK, filesError, subjectsError });
  // A review of another sha is not a question for the operator: kasper reviews the head again.
  if (d.action === 'quiz' && d.klass === 'stale-review') { say(`✗ ${d.reasons.join(' · ')} — back to the session: ask kasper again at the head`); return finish({ blocked: true, klass: d.klass, reasons: d.reasons }, 1); }
  if (d.action === 'quiz') {
    const q = buildQuiz({ pr, verdict, klass: d.klass, reasons: d.reasons });
    if (AS_JSON) console.log(JSON.stringify(q, null, 2)); else console.log(quizMarkdown(q));
    process.exit(2);
  }
  const plan = [`verify gate green at ${pr.headRefOid.slice(0, 7)}`, `gh pr comment ${n} (kasper's summary)`, ...(pr.isDraft ? [`gh pr ready ${n}`] : []), `gh pr merge ${n} --squash --match-head-commit ${pr.headRefOid.slice(0, 7)}`, `branch-sweep --apply --only ${pr.headRefName}`];
  if (DRY) { say('dry-run — would:'); plan.forEach((p) => say(`  - ${p}`)); return finish({ dryRun: true, plan }, 0); }
  // The gate judges the checkout it runs in: it must BE the PR head, clean, else its green says nothing about the PR.
  if (gout(['rev-parse', 'HEAD']) !== pr.headRefOid) { say(`✗ this checkout is not at the PR head ${pr.headRefOid.slice(0, 7)} — check the branch out, then run again`); return finish({ error: 'checkout is not the PR head' }, 1); }
  const dirty = dirtyPaths(REPO);
  if (dirty.length) { say(`✗ ${dirty.length} uncommitted path(s) — the gate would judge files that are not the PR`); return finish({ error: 'dirty tree' }, 1); }
  const trunkBefore = gout(['rev-parse', range]);
  const hooks = existsSync(join(MAIN_HOOKS, 'verify-gate.mjs')) ? MAIN_HOOKS : HERE;
  const startedAt = Date.now();
  const gate = spawnSync(process.execPath, [join(hooks, 'verify-gate.mjs'), '--base', range, ...(AS_JSON ? ['--quiet'] : [])], { cwd: REPO, stdio: AS_JSON ? 'ignore' : 'inherit', timeout: 150 * 60_000 });
  let marker = null;
  try { marker = JSON.parse(readFileSync(join(REPO, '.method', 'verify-ok.json'), 'utf8')); } catch { /* none */ }
  const why = gate.status !== 0 ? `the gate exited ${gate.status ?? 'abnormally'}`
    : !marker ? 'no verify marker'
      : marker.sha !== pr.headRefOid ? 'verify marker is stale (not the PR head)'
        : marker.verdict !== 'green' ? `verify ${marker.verdict}`
          : !(Date.parse(marker.at) >= startedAt) ? 'verify marker predates this run' : null;
  if (why) { say(`✗ not merged — ${why}`); return finish({ error: why }, 1); }
  // The trunk must not have moved under the green: a gate that judged a stale base says nothing about the merge.
  const remoteTrunk = ((git(['ls-remote', 'origin', `refs/heads/${TRUNK}`]).stdout ?? '').split('\t')[0] ?? '').trim();
  if (!remoteTrunk || remoteTrunk !== trunkBefore) { say(`✗ origin/${TRUNK} moved (or could not be read) during the gate — run again`); return finish({ error: 'trunk moved' }, 1); }
  // Audit trail first: kasper's summary lands on the PR before the merge closes it.
  const note = join(REPO, '.method', 'kasper', `pr-${n}-comment.md`);
  writeFileSync(note, `**kasper (approve, ${pr.headRefOid.slice(0, 7)})** — merged by session-close\n\n${verdict.summary ?? ''}\n`);
  runGh(['pr', 'comment', String(n), '--body-file', note], { cwd: REPO });
  if (pr.isDraft) { const r = runGh(['pr', 'ready', String(n)], { cwd: REPO }); if (r.status !== 0) { say(`✗ gh pr ready failed: ${(r.stderr ?? '').trim()}`); return finish({ error: 'pr ready failed' }, 1); } }
  const m = runGh(['pr', 'merge', String(n), '--squash', '--match-head-commit', pr.headRefOid], { cwd: REPO, timeout: 120_000 });
  if (m.status !== 0) { say(`✗ merge refused: ${(m.stderr ?? '').trim().split('\n').pop()}`); return finish({ error: 'merge refused' }, 1); }
  say(`🚀 merged PR #${n} (${pr.url}) — LANDED, nothing deployed`);
  git(['fetch', 'origin', '--quiet']);
  if (gout(['rev-parse', '--abbrev-ref', 'HEAD']) === pr.headRefName) git(['switch', '--detach']);
  const applied = sweepBranch(pr.headRefName, { landedOnly: false });
  for (const a of applied) say(`${a.ok ? '🧹 removed' : '⏭ kept'} ${a.branch}${a.skipped ? ` (${a.skipped})` : ''}`);
  if (!AS_JSON) printNext();
  return finish({ merged: true, pr: n, applied, next: NEXT_LINES }, 0);
}

function cmdStale() {
  const days = Number(flag('days', 3));
  const fleet = has('fleet');
  const res = fleet
    ? ghJson(['search', 'prs', '--author', '@me', '--state', 'open', '--json', 'repository,number,title,url,createdAt', '--limit', '100'])
    : ghJson(['pr', 'list', '--state', 'open', '--json', 'number,title,url,createdAt,headRefName,isDraft']);
  if (res.error) { say(`✗ gh failed: ${res.error}`); return finish({ error: res.error }, 1); }
  const rows = staleFilter(res.data ?? [], Number.isFinite(days) ? days : 3);
  if (!AS_JSON) {
    say(`${rows.length} open PR(s) older than ${days} day(s)`);
    for (const p of rows) say(`${String(p.ageDays).padStart(3)}d  ${p.repo ? `${p.repo} ` : ''}${p.url}  ${p.title}`);
  }
  return finish(rows, 0);
}

if (has('stale')) cmdStale();
else if (has('pr')) {
  const n = Number(flag('pr'));
  if (!Number.isInteger(n) || n <= 0) { say('session-close: --pr needs a PR number'); finish({ error: '--pr needs a PR number' }, 1); }
  cmdPr(n);
} else cmdCheckOrApply();
