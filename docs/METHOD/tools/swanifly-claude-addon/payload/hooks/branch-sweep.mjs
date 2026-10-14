#!/usr/bin/env node
/**
 * .claude/hooks/branch-sweep.mjs — remove the local branches/worktrees that are fully integrated.
 *
 * A separate entry script on purpose: it is what the SessionStart hook runs, and it must NEVER be able
 * to merge a pull request (`land.mjs --sweep --apply` does, and `land.mjs` re-execs the main checkout's
 * copy, which may be an older one). This script has no `gh pr merge`, no push of a branch, no re-exec of
 * another copy of itself. Its only writes are the guarded deletions of `lib/branch-hygiene.mjs`:
 * `merged`/`gone` branches whose tree is clean, that are not the cwd nor the main checkout, with no
 * commit that exists on neither the trunk nor a remote ref, idle past the grace period.
 *
 * Usage:
 *   node .claude/hooks/branch-sweep.mjs                          # report only (what is active, what is residue)
 *   node .claude/hooks/branch-sweep.mjs --apply                  # ...and delete the removable ones (local + origin + WIP ref)
 *   node .claude/hooks/branch-sweep.mjs --apply --landed-only --auto
 *                                                                # SessionStart: only branches land.mjs landed (its ledger),
 *                                                                # quiet, always exits 0. Older residue = a manual --apply
 *                                                                # after the list has been validated.
 *   --dry-run (no fetch, no deletion) · --json · --trunk <name>
 */
import { spawnSync } from 'node:child_process';
import { applyCleanup, classify, formatReport, readLanded, summarize, trunkOf } from './lib/branch-hygiene.mjs';

const argv = process.argv.slice(2);
const has = (n) => argv.includes(`--${n}`);
const flag = (n, d = null) => { const i = argv.indexOf(`--${n}`); return i === -1 ? d : (argv[i + 1] ?? d); };
const AUTO = has('auto');
const APPLY = has('apply');
const DRY = has('dry-run');
const LANDED_ONLY = has('landed-only');
const AS_JSON = has('json');

function main() {
  const top = (spawnSync('git', ['rev-parse', '--show-toplevel'], { encoding: 'utf8' }).stdout ?? '').trim();
  if (!top) return { error: 'not a git repository' };
  const trunk = String(flag('trunk', trunkOf(top)));
  const report = classify({ cwd: top, trunk, fetch: !DRY, remote: !AUTO });
  const result = { report, actions: [] };
  if (report.error) return result;
  const s = summarize(report);
  if (!AUTO && !AS_JSON) {
    for (const l of formatReport(report)) console.log(l);
    if (report.fetchError) console.log(`  ⚠ fetch failed (classification may be stale): ${report.fetchError}`);
  }
  if (APPLY) {
    result.actions = applyCleanup(report, { cwd: top, dryRun: DRY, only: LANDED_ONLY ? readLanded(top) : null });
    if (!AUTO && !AS_JSON) for (const a of result.actions) console.log(`${a.ok ? (a.dryRun ? '· would remove' : '🧹 removed') : '⏭ kept'} ${a.branch}${a.skipped ? ` (${a.skipped})` : ''}`);
    const removed = result.actions.filter((a) => a.ok && !a.dryRun).map((a) => a.branch);
    if (AUTO && removed.length) console.log(JSON.stringify({ systemMessage: `🧹 cleaned ${removed.length} integrated branch(es): ${removed.join(', ')}` }));
  } else if (!AUTO && !AS_JSON && s.residues.some((r) => r.removable)) {
    console.log('Run with --apply to delete the removable ones (local + origin + WIP ref).');
  }
  return result;
}

try {
  const result = main();
  if (AS_JSON) console.log(JSON.stringify(result, null, 2));
  else if (result.error && !AUTO) console.log(`branch-sweep: ${result.error}`);
} catch (e) {
  if (!AUTO) throw e;
  console.error(`branch-sweep: ${e?.message ?? e}`);
}
process.exit(0);
