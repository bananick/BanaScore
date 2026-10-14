#!/usr/bin/env node
// .claude/hooks/chantier-status.mjs — Stop hook (Supervision v2).
// Keeps the fiche of a chantier sub-session honest: docs/chantiers/{chantier}/{slice}.json is the
// sub-session's only report, so a stop is BLOCKED (once) when that fiche is invalid or stale.
//
// Contract (mirrors pilotage-refresh.mjs / session-telemetry.mjs — read them before changing this):
//   · Root — `git rev-parse --show-toplevel` run from the payload's `cwd` (the session may sit in a worktree
//     while CLAUDE_PROJECT_DIR names the main checkout), then CLAUDE_PROJECT_DIR, then process.cwd().
//   · NO-OP outside a chantier — no docs/chantiers/*/*.json whose `branch` is the current branch
//     means exit 0 with no output. The common case (no docs/chantiers dir) costs exactly one git spawn.
//   · Blocks with the Stop-hook JSON on stdout (`{"decision":"block","reason":…}`, exit 0), reason on one line:
//       invalid — the fiche is not JSON, or validateFiche() (lib/chantier-status.mjs) lists errors
//                 (an `updatedAt` later than now + 120 s is one: a guessed clock would disable staleness);
//       stale   — the last non-merge, first-parent commit touching anything outside docs/chantiers/ is newer
//                 than updatedAt + 120 s (a trunk merge into the slice branch never counts). The reason carries
//                 `now=<ISO>` and the stamp command, so updatedAt is read from the clock, never guessed.
//   · Loop guard — when the hook input says a Stop hook is already active (`stop_hook_active`), warn on
//     stderr and let the stop through: a block is a nudge, never a trap.
//   · Fails open on ANY error (bad stdin, git missing, lib missing, unreadable file) — exit 0, silent.
//
// Spec: docs/interventions/2026-10-14-Lucia-supervision-v2.md §1-2. Schema: docs/METHOD/templates/chantier-status.schema.json.

import { existsSync, readdirSync, readFileSync, statSync } from 'node:fs';
import { join } from 'node:path';
import { spawnSync } from 'node:child_process';

const MAX_BYTES = 1024 * 1024;
const SLACK_SECONDS = 120;
const GIT_TIMEOUT_MS = 3000;
const STAMP_CMD = 'node -e "console.log(new Date().toISOString())"';

function readStdin() {
  try {
    return readFileSync(0, 'utf8');
  } catch {
    return '';
  }
}

/** stdout of a git command (trimmed), or null on any failure (also a missing / non-directory cwd). */
function git(args, cwd) {
  if (typeof cwd !== 'string' || cwd === '') return null;
  const r = spawnSync('git', args, { cwd, encoding: 'utf8', timeout: GIT_TIMEOUT_MS, windowsHide: true });
  return r.status === 0 && typeof r.stdout === 'string' ? r.stdout.trim() : null;
}

/** The repo root: first of payload.cwd / CLAUDE_PROJECT_DIR / process.cwd() that sits inside a git work tree. */
function resolveRoot(payload) {
  for (const dir of [payload.cwd, process.env.CLAUDE_PROJECT_DIR, process.cwd()]) {
    const top = git(['rev-parse', '--show-toplevel'], dir);
    if (top) return top;
  }
  return null;
}

/** Every docs/chantiers/{chantier}/*.json, as { rel (posix), abs }. */
function listFiches(root) {
  const base = join(root, 'docs', 'chantiers');
  const out = [];
  for (const dir of readdirSync(base, { withFileTypes: true })) {
    if (!dir.isDirectory()) continue;
    for (const f of readdirSync(join(base, dir.name))) {
      if (f.endsWith('.json')) out.push({ rel: `docs/chantiers/${dir.name}/${f}`, abs: join(base, dir.name, f) });
    }
  }
  return out;
}

const escapeRe = (s) => s.replace(/[.*+?^${}()|[\]\\/]/g, '\\$&');

/** Parses a fiche; an unparseable one still counts as ours if its text carries `"branch": "<branch>"`. */
function inspect(abs, branch) {
  if (statSync(abs).size > MAX_BYTES) return { mine: false };
  const text = readFileSync(abs, 'utf8').replace(/^\uFEFF/, '');
  try {
    const data = JSON.parse(text);
    return { mine: typeof data === 'object' && data !== null && data.branch === branch, data };
  } catch (e) {
    return { mine: new RegExp(`"branch"\\s*:\\s*"${escapeRe(branch)}"`).test(text), parseError: e instanceof Error ? e.message : String(e) };
  }
}

function block(reason) {
  process.stdout.write(`${JSON.stringify({ decision: 'block', reason: `chantier-status: ${reason}` })}\n`);
}

async function main() {
  let payload = {};
  try {
    const raw = readStdin();
    payload = raw.trim() ? JSON.parse(raw) : {};
  } catch {
    payload = {};
  }
  if (typeof payload !== 'object' || payload === null) payload = {};
  if (payload.stop_hook_active === true) {
    process.stderr.write('chantier-status: a Stop hook is already active — letting this stop through (loop guard)\n');
    return;
  }

  const root = resolveRoot(payload);
  if (!root || !existsSync(join(root, 'docs', 'chantiers'))) return; // fast no-op: not a chantier repo
  const fiches = listFiches(root);
  if (!fiches.length) return;

  const branch = git(['rev-parse', '--abbrev-ref', 'HEAD'], root);
  if (!branch || branch === 'HEAD') return; // not on a branch (detached) — nothing to match

  const { validateFiche, isStale } = await import('./lib/chantier-status.mjs');
  for (const { rel, abs } of fiches) {
    const { mine, data, parseError } = inspect(abs, branch);
    if (!mine) continue;
    if (parseError) return block(`fiche ${rel} is not valid JSON (${parseError}) — fix it`);
    const errs = validateFiche(data);
    if (errs.length) {
      const more = errs.length > 3 ? ` (+${errs.length - 3} more)` : '';
      return block(`fiche ${rel} is invalid — ${errs.slice(0, 3).join('; ')}${more}`);
    }
    const last = git(['log', '-1', '--first-parent', '--no-merges', '--format=%ct', '--', '.', ':(exclude)docs/chantiers'], root);
    if (isStale(data.updatedAt, last === null || last === '' ? null : Number(last), SLACK_SECONDS)) {
      return block(`fiche ${rel} is older than your last commit — update state/progress/head/updatedAt; set updatedAt from the clock, never a guess: now=${new Date().toISOString()} (or run ${STAMP_CMD})`);
    }
  }
}

try {
  await main();
} catch {
  // Fail open — a supervision hook must never crash or trap a session.
}
process.exitCode = 0;
