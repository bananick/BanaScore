#!/usr/bin/env node
// .claude/hooks/session-telemetry.mjs — Stop hook.
// Appends one JSONL row per invocation summarizing this Claude Code session's cost/shape:
// tokens (main loop + delegated sub-agents/workflows, deduped per API call), message counts,
// duration, model(s), best-effort topic/sprint. Feeds docs/project/telemetry/sessions.jsonl so
// Iris (or a human) can mine it later for METHOD efficiency signal — see routing-method.md ->
// "Session Telemetry Ledger". Fails open on any error: never blocks Claude from stopping.
//
// Stop fires after every assistant turn, not just at the "true" end of a conversation, so this
// runs many times per session. Each run re-parses the whole transcript and writes a fresh,
// cumulative snapshot — appended, never rewritten in place (append-only is what makes this safe
// under concurrent sessions). Consumers should dedupe by sessionId and keep the newest row.

import { readFileSync, appendFileSync, existsSync, mkdirSync, readdirSync } from 'node:fs';
import { join, dirname, basename } from 'node:path';

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
  let firstUserText = null;
  let gitBranch = null;
  let raw;
  try {
    raw = readFileSync(filePath, 'utf8');
  } catch {
    return { totals, models, firstTimestamp, lastTimestamp, firstUserText, gitBranch, sprintText: '' };
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
      if (firstUserText === null) firstUserText = entry.message.content;
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

  return { totals, models, firstTimestamp, lastTimestamp, firstUserText, gitBranch, sprintText };
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

function guessSprint(text) {
  const m = text.match(/docs[\\/]sprints[\\/](\d{3})/);
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

  const sprint = guessSprint(main_.sprintText || '') || guessSprint(subSprintText);
  const topic = (main_.firstUserText || '').replace(/\s+/g, ' ').trim().slice(0, 150);

  const row = {
    schemaVersion: 1,
    sessionId,
    hookEvent: payload.hook_event_name ?? payload.hookEventName ?? 'Stop',
    capturedAt: new Date().toISOString(),
    app: basename(projectDir),
    cwd: projectDir,
    gitBranch: main_.gitBranch,
    sprint,
    topic: topic || null,
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
}

try {
  main();
} catch {
  // Fail open — a telemetry bug must never block Claude from stopping.
}
process.exit(0);
