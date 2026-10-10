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
// v319.b (schemaVersion 2) — the row says WHICH agent ran, not only how many sub-agent tokens there were:
//   subAgents.byAgent  one entry per sub-agent transcript (capped at BY_AGENT_CAP, costliest first):
//                      { agentType, description, workflowId, requestedModel, model, pin, calls, tokens…, startedAt, endedAt }
//   subAgents.byType   complete roll-up, key "<agentType>|<model>": { count, calls, tokens…, apiCostUsd, pins }
// `pin` mirrors scripts/lib/token-economy.mjs (the two are tested to agree): meta.json `model` = "explicit", else the
// `model:` of .claude/agents/<agentType>.md (agent cwd, project dir, then main checkout; `inherit` = none) =
// "frontmatter", else "unpinned" (inherits the coordinator unless CLAUDE_CODE_SUBAGENT_MODEL is set).
// Privacy is unchanged: `description` is the short task LABEL from meta.json, whitespace-collapsed and cut to 80
// chars (null when absent) — never a prompt, never transcript text. v1 rows (no byAgent/byType) stay valid.
// This file is copied standalone into app repos: keep it free of imports from the hub.
//

import { readFileSync, appendFileSync, existsSync, mkdirSync, readdirSync } from 'node:fs';
import { join, dirname, basename, resolve, relative, sep } from 'node:path';
import { spawnSync } from 'node:child_process';

function readStdin() {
  try {
    return readFileSync(0, 'utf8');
  } catch {
    return '';
  }
}

const BY_AGENT_CAP = 150; // a session can spawn >1000 agents; the row is rewritten every Stop turn, so bound it
const PRICE = { haiku: [1, 5], sonnet: [2, 10], opus: [4, 20], fable: [10, 50] }; // USD per M tokens in/out (list)

const familyOf = (model) => Object.keys(PRICE).find((f) => String(model ?? '').toLowerCase().includes(f)) ?? null;

// API-equivalent cost of one response: cache read 0.1x input; cache write 1.25x (5-minute) or 2x (1-hour) —
// 1.25x when the usage record carries no split. Same model as scripts/lib/token-economy.mjs.
function messageCost(fam, u) {
  const [pin, pout] = PRICE[fam];
  const write = u.cache_creation_input_tokens ?? 0;
  const split = u.cache_creation;
  let writeUnits = write * 1.25;
  if (split && typeof split === 'object') {
    const h = split.ephemeral_1h_input_tokens ?? 0;
    const m = split.ephemeral_5m_input_tokens ?? 0;
    writeUnits = h * 2 + m * 1.25 + Math.max(0, write - h - m) * 1.25;
  }
  return ((u.input_tokens ?? 0) * pin + (u.cache_read_input_tokens ?? 0) * pin * 0.1 + writeUnits * pin
    + (u.output_tokens ?? 0) * pout) / 1e6;
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
  let cwd = null;
  const costByFamily = {};
  let raw;
  try {
    raw = readFileSync(filePath, 'utf8');
  } catch {
    return { totals, models, firstTimestamp, lastTimestamp, gitBranch, cwd, costByFamily, sprintText: '' };
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
    if (!cwd && typeof entry.cwd === 'string') cwd = entry.cwd;

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
          const fam = familyOf(msg.model);
          if (fam) costByFamily[fam] = (costByFamily[fam] ?? 0) + messageCost(fam, u);
        }
      }
    }
  }

  return { totals, models, firstTimestamp, lastTimestamp, gitBranch, cwd, costByFamily, sprintText };
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

// `model:` of each <dir>/*.md agent file ('inherit'/'default'/absent -> null), cached per directory.
const agentDirCache = new Map();
function agentModels(dir) {
  if (agentDirCache.has(dir)) return agentDirCache.get(dir);
  const out = new Map();
  try {
    for (const f of readdirSync(dir)) {
      if (!f.endsWith('.md') || f === 'README.md') continue;
      const head = readFileSync(join(dir, f), 'utf8').replace(/\r\n/g, '\n').match(/^---\n([\s\S]*?)\n---/);
      const m = head?.[1].match(/^model:\s*["']?([^\s"'#]+)/m)?.[1]?.toLowerCase();
      out.set(f.slice(0, -3), m && m !== 'inherit' && m !== 'default' ? m : null);
    }
  } catch { /* no agents dir here */ }
  agentDirCache.set(dir, out);
  return out;
}

// First directory that defines the agent type wins (agent's own cwd, then the project, then the main checkout).
function frontmatterModel(agentType, dirs) {
  for (const d of dirs) {
    const m = agentModels(join(d, '.claude', 'agents'));
    if (m.has(agentType)) return m.get(agentType);
  }
  return null;
}

function readMeta(file) {
  try { return JSON.parse(readFileSync(file.replace(/\.jsonl$/, '.meta.json'), 'utf8')); } catch { return null; }
}

const r4 = (x) => Math.round(x * 1e4) / 1e4;

// One entry per sub-agent transcript that made at least one call, plus the complete byType roll-up.
function summarizeAgents(subAgentsDir, subSummaries, projectDirs) {
  const entries = [];
  for (const [f, s] of subSummaries) {
    if (!s.totals.assistantApiCalls) continue;
    const meta = readMeta(f);
    const agentType = typeof meta?.agentType === 'string' && meta.agentType ? meta.agentType : '?';
    const requestedModel = typeof meta?.model === 'string' && meta.model.trim() ? meta.model.trim() : null;
    const dirs = [...new Set([s.cwd, ...projectDirs].filter(Boolean))];
    const pinned = requestedModel ? null : frontmatterModel(agentType, dirs);
    const byCost = Object.entries(s.costByFamily).sort((a, b) => b[1] - a[1]);
    const first = [...s.models][0];
    const seg = relative(subAgentsDir, f).split(sep);
    const wi = seg.indexOf('workflows');
    const description = typeof meta?.description === 'string' ? meta.description.replace(/\s+/g, ' ').trim().slice(0, 80) : '';
    entries.push({
      agentType,
      description: description || null,
      workflowId: wi >= 0 && seg[wi + 1] ? seg[wi + 1] : null,
      requestedModel,
      model: byCost[0]?.[0] ?? familyOf(first) ?? first ?? null,
      pin: requestedModel ? 'explicit' : pinned ? 'frontmatter' : 'unpinned',
      calls: s.totals.assistantApiCalls,
      inputTokens: s.totals.inputTokens,
      outputTokens: s.totals.outputTokens,
      cacheCreationInputTokens: s.totals.cacheCreationInputTokens,
      cacheReadInputTokens: s.totals.cacheReadInputTokens,
      apiCostUsd: r4(byCost.reduce((sum, [, c]) => sum + c, 0)),
      startedAt: s.firstTimestamp,
      endedAt: s.lastTimestamp,
    });
  }
  const byType = {};
  for (const e of entries) {
    const t = (byType[`${e.agentType}|${e.model}`] ??= { count: 0, calls: 0, inputTokens: 0, outputTokens: 0,
      cacheCreationInputTokens: 0, cacheReadInputTokens: 0, apiCostUsd: 0, pins: { explicit: 0, frontmatter: 0, unpinned: 0 } });
    t.count++; t.calls += e.calls; t.inputTokens += e.inputTokens; t.outputTokens += e.outputTokens;
    t.cacheCreationInputTokens += e.cacheCreationInputTokens; t.cacheReadInputTokens += e.cacheReadInputTokens;
    t.apiCostUsd = r4(t.apiCostUsd + e.apiCostUsd); t.pins[e.pin]++;
  }
  const byAgent = [...entries].sort((a, b) => b.apiCostUsd - a.apiCostUsd).slice(0, BY_AGENT_CAP);
  return { byAgent, byAgentTruncated: Math.max(0, entries.length - byAgent.length), byType };
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
  const subSummaries = [];
  let subSprintText = '';
  for (const f of subFiles) {
    const s = summarizeTranscript(f);
    subSummaries.push([f, s]);
    addTotals(subTotals, s.totals);
    for (const m of s.models) { models.add(m); subModels.add(m); }
    subSprintText += s.sprintText || '';
  }

  const lroot = ledgerRoot(projectDir);
  const agents = summarizeAgents(subAgentsDir, subSummaries, [projectDir, lroot]);

  const totals = addTotals(addTotals(zeroTotals(), main_.totals), subTotals);
  totals.allTokens = totals.inputTokens + totals.outputTokens
    + totals.cacheCreationInputTokens + totals.cacheReadInputTokens;

  const sprint = guessSprint(main_.gitBranch, main_.sprintText)
    ?? guessSprint(main_.gitBranch, subSprintText);

  const row = {
    schemaVersion: 2,
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
    subAgents: { ...subTotals, models: [...subModels], fileCount: subFiles.length, ...agents },
    totals,
    outcome: null,       // optional — filled in by the closing agent's DoD report, or by Vera/Iris
    efficiencyNote: null, // optional — same
  };

  const outDir = join(lroot, 'docs', 'project', 'telemetry');
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
