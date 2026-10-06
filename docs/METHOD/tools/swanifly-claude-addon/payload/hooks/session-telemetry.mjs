#!/usr/bin/env node
// .claude/hooks/session-telemetry.mjs — Stop hook.
// Appends one JSONL row per invocation summarizing this Claude Code session's cost/shape:
// tokens (main loop + delegated sub-agents/workflows, deduped per API call), message counts,
// duration, model(s), best-effort sprint. It deliberately records NO prompt text: operator
// wording must never enter the ledger, whatever happens to the file later. Feeds
// docs/project/telemetry/sessions.jsonl so Iris (or a human) can mine it later for METHOD
// efficiency signal — see routing-method.md -> "Session Telemetry Ledger". Fails open on any
// error: never blocks Claude from stopping.
//
// v318.a — this hook no longer commits the ledger. The file is gitignored (and becomes untracked in a
// follow-up, once every checkout runs the 318.a hooks) and this hook never touches git: it
// used to cost one `chore(telemetry)` commit per conversation (hundreds fleet-wide) for a ledger
// whose outcome fields stay empty. Read it across the fleet with `npm run telemetry:report`
// (scripts/telemetry-aggregate.mjs). From a linked git worktree the row goes to the MAIN
// checkout's ledger — a gitignored file inside a worktree would be lost with the worktree.
// `--commit` is still accepted (fleet settings.json files wired it on SessionEnd) and ignored.
//
// Stop fires after every assistant turn, not just at the "true" end of a conversation, so this
// runs many times per session. Each run re-parses the whole transcript and writes a fresh,
// cumulative snapshot — appended, never rewritten in place (append-only is what makes this safe
// under concurrent sessions). Consumers should dedupe by sessionId and keep the newest row.
//

import { readFileSync, appendFileSync, existsSync, mkdirSync, readdirSync } from 'node:fs';
import { join, dirname, basename, resolve } from 'node:path';
import { spawnSync } from 'node:child_process';

function readStdin() {
  try {
    return readFileSync(0, 'utf8');
  } catch {
    return '';
  }
}

function findJsonlFiles(dir) {
  const out = [];
  let entries;
  try {
    entries = readdirSync(dir, { withFileTypes: true });
  } catch {
    return out;
  }
  for (const e of entries) {
    const p = join(dir, e.name);
    if (e.isDirectory()) out.push(...findJsonlFiles(p));
    else if (e.isFile() && e.name.endsWith('.jsonl')) out.push(p);
  }
  return out;
}

// Sums usage across one transcript file, deduped by message.id (a single API response is often
// split across several JSONL lines — one per streamed content block — all sharing the same id
// and the same cumulative usage; summing every line would massively overcount).
function summarizeTranscript(filePath) {
  const totals = {
    userMessages: 0,
    assistantApiCalls: 0,
    inputTokens: 0,
    outputTokens: 0,
    cacheCreationInputTokens: 0,
    cacheReadInputTokens: 0,
  };
  const models = new Set();
  const seenMessageIds = new Set();
  let firstTimestamp = null;
  let lastTimestamp = null;
  let gitBranch = null;
  let raw;
  try {
    raw = readFileSync(filePath, 'utf8');
  } catch {
    return { totals, models, firstTimestamp, lastTimestamp, gitBranch, sprintText: '' };
  }

  let sprintText = '';
  for (const line of raw.split('\n')) {
    if (!line.trim()) continue;
    sprintText += line; // cheap corpus for the best-effort sprint-number regex below
    let entry;
    try {
      entry = JSON.parse(line);
    } catch {
      continue; // tolerate a truncated last line if the file is being written concurrently
    }

    if (entry.timestamp) {
      if (!firstTimestamp || entry.timestamp < firstTimestamp) firstTimestamp = entry.timestamp;
      if (!lastTimestamp || entry.timestamp > lastTimestamp) lastTimestamp = entry.timestamp;
    }
    if (!gitBranch && entry.gitBranch) gitBranch = entry.gitBranch;

    // Tool-result replies are also logged as type:'user' with array content — not something a
    // human typed. Only count genuine human turns: string content, not a harness-injected
    // synthetic entry (isMeta — e.g. slash-command echoes, local-command-caveat banners).
    if (entry.type === 'user' && entry.message?.role === 'user'
      && typeof entry.message.content === 'string' && !entry.isMeta) {
      totals.userMessages++;
    }

    if (entry.type === 'assistant' && entry.message?.role === 'assistant') {
      const msg = entry.message;
      if (msg.model) models.add(msg.model);
      const id = msg.id;
      if (id && !seenMessageIds.has(id)) {
        seenMessageIds.add(id);
        totals.assistantApiCalls++;
        const u = msg.usage;
        if (u) {
          totals.inputTokens += u.input_tokens ?? 0;
          totals.outputTokens += u.output_tokens ?? 0;
          totals.cacheCreationInputTokens += u.cache_creation_input_tokens ?? 0;
          totals.cacheReadInputTokens += u.cache_read_input_tokens ?? 0;
        }
      }
    }
  }

  return { totals, models, firstTimestamp, lastTimestamp, gitBranch, sprintText };
}

function addTotals(a, b) {
  a.userMessages += b.userMessages;
  a.assistantApiCalls += b.assistantApiCalls;
  a.inputTokens += b.inputTokens;
  a.outputTokens += b.outputTokens;
  a.cacheCreationInputTokens += b.cacheCreationInputTokens;
  a.cacheReadInputTokens += b.cacheReadInputTokens;
  return a;
}

function zeroTotals() {
  return {
    userMessages: 0,
    assistantApiCalls: 0,
    inputTokens: 0,
    outputTokens: 0,
    cacheCreationInputTokens: 0,
    cacheReadInputTokens: 0,
  };
}

// Attributes the session to a sprint. This is the only cost-per-sprint key in the ledger, so a
// wrong number is worse than no number: never guess, never infer from the session title.
//   1. The branch — `sprint/190` is the one sprint identifier a session cannot avoid
//      materialising, and it cannot be confused with anything else in the transcript.
//   2. Failing that, a path mentioned in the transcript, anchored deliberately:
//      - accepts both `docs/sprints/` and `docs/project/sprints/` (this repo uses the latter);
//      - skips an optional `{year}/` and `week-{n}/` segment pair, because the real layout is
//        `docs/project/sprints/2025/week-42/005-a …` — the number lives two segments down;
//      - `[\\/]+` tolerates JSON-escaped Windows paths (`docs\\project\\sprints\\…`), which is
//        how they actually appear in the raw transcript lines this scans;
//      - `(?!\d)` forces a separator after the 3 digits, so a millesime can never be captured.
//        Without it `docs/sprints/2025/…` yielded a phantom sprint "202".
//   3. Failing that, null.
function guessSprint(branch, text) {
  const b = (branch ?? '').match(/^sprint[\\/](\d{3})(?!\d)/);
  if (b) return b[1];
  const m = (text ?? '').match(
    /docs[\\/]+(?:project[\\/]+)?sprints[\\/]+(?:\d{4}[\\/]+(?:week-\d{1,2}[\\/]+)?)?(\d{3})(?!\d)/,
  );
  return m ? m[1] : null;
}

function main() {
  const raw = readStdin();
  if (!raw) return; // nothing on stdin — exit quietly
  let payload;
  try {
    payload = JSON.parse(raw);
  } catch {
    return;
  }

  const sessionId = payload.session_id ?? payload.sessionId;
  const transcriptPath = payload.transcript_path ?? payload.transcriptPath;
  const projectDir = process.env.CLAUDE_PROJECT_DIR || payload.cwd || process.cwd();
  if (!sessionId || !transcriptPath || !existsSync(transcriptPath)) return;

  const main_ = summarizeTranscript(transcriptPath);

  const subAgentsDir = join(dirname(transcriptPath), basename(transcriptPath, '.jsonl'), 'subagents');
  const subFiles = existsSync(subAgentsDir) ? findJsonlFiles(subAgentsDir) : [];
  const subTotals = zeroTotals();
  const models = new Set(main_.models);
  const subModels = new Set();
  let subSprintText = '';
  for (const f of subFiles) {
    const s = summarizeTranscript(f);
    addTotals(subTotals, s.totals);
    for (const m of s.models) { models.add(m); subModels.add(m); }
    subSprintText += s.sprintText || '';
  }

  const totals = addTotals(addTotals(zeroTotals(), main_.totals), subTotals);
  totals.allTokens = totals.inputTokens + totals.outputTokens
    + totals.cacheCreationInputTokens + totals.cacheReadInputTokens;

  const sprint = guessSprint(main_.gitBranch, main_.sprintText)
    ?? guessSprint(main_.gitBranch, subSprintText);

  const row = {
    schemaVersion: 1,
    sessionId,
    hookEvent: payload.hook_event_name ?? payload.hookEventName ?? 'Stop',
    capturedAt: new Date().toISOString(),
    app: basename(projectDir),
    cwd: projectDir,
    gitBranch: main_.gitBranch,
    sprint,
    // Global union, kept for existing readers. It CANNOT verify routing on its own:
    // ["opus","sonnet"] reads the same whether opus coordinated and sonnet executed (compliant)
    // or the reverse (not). The per-scope `models` on mainLoop/subAgents below are what answer that.
    models: [...models],
    startedAt: main_.firstTimestamp,
    lastActivityAt: main_.lastTimestamp,
    durationMs: main_.firstTimestamp && main_.lastTimestamp
      ? new Date(main_.lastTimestamp) - new Date(main_.firstTimestamp)
      : null,
    mainLoop: { ...main_.totals, models: [...main_.models] },
    subAgents: { ...subTotals, models: [...subModels], fileCount: subFiles.length },
    totals,
    outcome: null,       // optional — filled in by the closing agent's DoD report, or by Vera/Iris
    efficiencyNote: null, // optional — same
  };

  const outDir = join(ledgerRoot(projectDir), 'docs', 'project', 'telemetry');
  const outFile = join(outDir, 'sessions.jsonl');
  mkdirSync(outDir, { recursive: true });
  appendFileSync(outFile, JSON.stringify(row) + '\n', 'utf8');
}

/**
 * Where the ledger lives: the MAIN checkout of this repository. A linked worktree has its own
 * working tree, and the ledger is gitignored (v318.a) — a row written inside the worktree would
 * vanish with it. `--git-common-dir` is the shared `.git` of the main checkout (`.git` itself
 * when this IS the main checkout); its parent is the main checkout. Anything unexpected (not a
 * repo, a bare layout, git missing) falls back to the project dir.
 */
function ledgerRoot(projectDir) {
  try {
    const r = spawnSync('git', ['rev-parse', '--git-common-dir'], { cwd: projectDir, encoding: 'utf8', timeout: 5_000 });
    const common = r.status === 0 ? (r.stdout ?? '').trim() : '';
    if (!common) return projectDir;
    const abs = resolve(projectDir, common);
    return basename(abs) === '.git' ? dirname(abs) : projectDir;
  } catch {
    return projectDir;
  }
}

try {
  main();
} catch {
  // Fail open — a telemetry bug must never block Claude from stopping.
}
process.exit(0);
