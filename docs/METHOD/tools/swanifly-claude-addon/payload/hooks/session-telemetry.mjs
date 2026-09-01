#!/usr/bin/env node
// .claude/hooks/session-telemetry.mjs — Stop hook.
// Appends one JSONL row per invocation summarizing this Claude Code session's cost/shape:
// tokens (main loop + delegated sub-agents/workflows, deduped per API call), message counts,
// duration, model(s), best-effort sprint. It deliberately records NO prompt text: the row is
// committed and pushed automatically, so operator wording must never enter it. Feeds
// docs/project/telemetry/sessions.jsonl so
// Iris (or a human) can mine it later for METHOD efficiency signal — see routing-method.md ->
// "Session Telemetry Ledger". Fails open on any error: never blocks Claude from stopping.
//
// Stop fires after every assistant turn, not just at the "true" end of a conversation, so this
// runs many times per session. Each run re-parses the whole transcript and writes a fresh,
// cumulative snapshot — appended, never rewritten in place (append-only is what makes this safe
// under concurrent sessions). Consumers should dedupe by sessionId and keep the newest row.
//
// Because it runs every turn, it also COMMITS AND PUSHES its own row (see
// commitAndPushLedger at the bottom) — otherwise the ledger leaves the working tree dirty after
// every turn, the git-check Stop hook asks the agent to commit it, and the agent opens a pull
// request per turn. That happened three times before this was added.

import { readFileSync, appendFileSync, existsSync, mkdirSync, readdirSync } from 'node:fs';
import { join, dirname, basename } from 'node:path';
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
//   2. Failing that, a path, anchored: the number must follow the separator after `sprints`
//      immediately, and `(?!\d)` stops it matching inside a millesime — `docs/sprints/2025/…`
//      used to yield a phantom "sprint 202" (4 of the 8 attributed rows in the ledger).
//   3. Failing that, null.
function guessSprint(branch, text) {
  const b = (branch ?? '').match(/^sprint[\\/](\d{3})(?!\d)/);
  if (b) return b[1];
  const m = (text ?? '').match(/docs[\\/]sprints[\\/](\d{3})(?!\d)/);
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
  let subSprintText = '';
  for (const f of subFiles) {
    const s = summarizeTranscript(f);
    addTotals(subTotals, s.totals);
    for (const m of s.models) models.add(m);
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
    models: [...models],
    startedAt: main_.firstTimestamp,
    lastActivityAt: main_.lastTimestamp,
    durationMs: main_.firstTimestamp && main_.lastTimestamp
      ? new Date(main_.lastTimestamp) - new Date(main_.firstTimestamp)
      : null,
    mainLoop: main_.totals,
    subAgents: { ...subTotals, fileCount: subFiles.length },
    totals,
    outcome: null,       // optional — filled in by the closing agent's DoD report, or by Vera/Iris
    efficiencyNote: null, // optional — same
  };

  const outDir = join(projectDir, 'docs', 'project', 'telemetry');
  const outFile = join(outDir, 'sessions.jsonl');
  mkdirSync(outDir, { recursive: true });
  appendFileSync(outFile, JSON.stringify(row) + '\n', 'utf8');
  commitAndPushLedger(projectDir, outFile);
}

/**
 * Commit and push THIS ROW, and nothing else.
 *
 * Why the hook does its own git: Stop fires after every assistant turn, so this
 * file goes dirty every turn — including turns that touched no file at all. The
 * companion git-check Stop hook then reports an uncommitted change and asks the
 * agent to commit and push, and because a merged PR cannot track new work, the
 * agent opens a fresh PR. The observed result was three merged pull requests
 * whose entire content was hook output. The ledger has to clean up after itself.
 *
 * SAFETY, in order of how badly each would hurt:
 *   1. A PATHSPEC commit — `git commit -- <sessions.jsonl>`. NEVER `git add -A`.
 *      Sweeping the agent's in-progress work into a telemetry commit would be
 *      far worse than the noise this removes. A pathspec commit also leaves the
 *      agent's staged index untouched.
 *   2. Never on main/master or a detached HEAD — same rule ship-push.sh follows.
 *   3. Committer identity pinned to noreply@anthropic.com, or GitHub renders the
 *      commit "Unverified" and the git-check hook (correctly) objects.
 *   4. Never force-pushes. A rejected push leaves the row committed locally; the
 *      next turn retries, and an unpushed commit is a real state worth reporting.
 *   5. Fails open at every step. Telemetry must never block Claude from stopping.
 */
function commitAndPushLedger(projectDir, outFile) {
  const git = (args) =>
    spawnSync('git', args, { cwd: projectDir, encoding: 'utf8', timeout: 10_000 });

  const branch = git(['rev-parse', '--abbrev-ref', 'HEAD']).stdout?.trim();
  if (!branch || ['main', 'master', 'HEAD'].includes(branch)) return;
  if (!git(['remote']).stdout?.trim()) return;

  // Nothing staged or unstaged for this path ⇒ the row is already committed.
  const dirty = git(['status', '--porcelain', '--', outFile]).stdout?.trim();
  if (!dirty) return;

  const commit = git([
    '-c', 'user.email=noreply@anthropic.com',
    '-c', 'user.name=Claude',
    'commit',
    '-m', 'chore(telemetry): append session row',
    '-m', 'Written by the session-telemetry Stop hook. Ledger data only — this\ncommit touches docs/project/telemetry/sessions.jsonl and nothing else.',
    '--', outFile,
  ]);
  if (commit.status !== 0) return;

  // Push only what is already committed, exactly like ship-push.sh. A failure
  // here is deliberately silent and unretried: no force, no auto-rebase.
  const hasUpstream =
    git(['rev-parse', '--abbrev-ref', '--symbolic-full-name', '@{u}']).status === 0;
  git(hasUpstream ? ['push'] : ['push', '-u', 'origin', branch]);
}

try {
  main();
} catch {
  // Fail open — a telemetry bug must never block Claude from stopping.
}
process.exit(0);
