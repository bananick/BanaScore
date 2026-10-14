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
// v319.c — central store. When ~/.claude/telemetry/config.json exists ({ endpoint, machineId, token }) the same row,
// numbers only (every `description` stripped), is POSTed to the `ingestTelemetry` Cloud Function of project swanifly-ia
// (teams/banana/telemetrySessions/{sessionId}); see "Central store" at the bottom of this file. `--user` = the copy that
// `install.mjs --user --telemetry` puts in ~/.claude/hooks for repos without a hook of their own (central store only).
// This file is copied standalone into app repos: keep it free of imports from the hub.
// v3 (schemaVersion 3, Cockpit S1) — NAMES AND COUNTERS ONLY, never a prompt, an argument, a path or a command line:
//   work       { journeyId, sprint, intervention } read from `.method/journey` (gitignored, written by the Cadrage); the
//              regex `sprint` stays only as a fallback, marked `sprintSource: 'regex'` (`'work'` / `'branch'` otherwise)
//   tools      { <tool name>: { calls, errors } } · mcp { <server>: { calls, errors } } · skills / commands { <name>: n }
//   launches   { "<subagent_type>|<model>": n } — sub-agent launches
//   flow       { workflows, workflowAgents, compactions, maxContextTokens, activeMs, statusPings }
//   result     { landed, landedSha, proven, operatorScore, veraVerdict } — the last three stay null, filled later
// Every name is sanitised to NAME_RE (the server schema refuses anything else); a name that does not fit is dropped.
//

import { readFileSync, appendFileSync, existsSync, mkdirSync, readdirSync, writeFileSync, renameSync, statSync, unlinkSync } from 'node:fs';
import { homedir } from 'node:os';
import { join, dirname, basename, resolve, relative, sep } from 'node:path';
import { spawnSync } from 'node:child_process';

// `--user`: the copy installed at ~/.claude/hooks by `install.mjs --user --telemetry`. It covers repos and worktrees that
// carry no hook of their own: central store only, never a ledger file written into a repo.
const USER_MODE = process.argv.includes('--user');
// CLAUDE_TELEMETRY_DIR is TEST-ONLY: it is honoured solely together with CLAUDE_TELEMETRY_TEST=1, so an env block in a
// repo's settings.json cannot redirect where the machine's token is read from.
const TELEMETRY_DIR = process.env.CLAUDE_TELEMETRY_TEST === '1' && process.env.CLAUDE_TELEMETRY_DIR
  ? process.env.CLAUDE_TELEMETRY_DIR
  : join(homedir(), '.claude', 'telemetry');
const POST_TIMEOUT_MS = 3000;     // per request
const TOTAL_BUDGET_MS = 8000;     // current row + outbox retries, never more
const OUTBOX_RETRY_MAX = 10;      // sessions retried per Stop
const OUTBOX_MAX_SESSIONS = 100;  // newest sessions kept
const OUTBOX_COMPACT_BYTES = 2 * 1024 * 1024;
const ORPHAN_MS = 2 * 60_000;     // a *.work file this old belongs to a hook that died

function readStdin() {
  try {
    return readFileSync(0, 'utf8');
  } catch {
    return '';
  }
}

const BY_AGENT_CAP = 40; // a session can spawn >1000 agents and the row is appended on EVERY Stop turn: keep the 40 costliest (byType stays complete)
const SYNTHETIC_MODEL = '<synthetic>';
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

// ---- v3: names and counters --------------------------------------------------------------------
const NAME_RE = /^[A-Za-z0-9_:.\-/]{1,80}$/;
const ACTIVE_GAP_MS = 5 * 60_000;      // a pause longer than this is not "active" time
const MAP_CAP = 100;                   // entries per name map; the server refuses more
const PING_MAX_CHARS = 300;            // a status ping is short; a pasted brief that happens to contain the words is not one
const PING_RE = /\bon en est o[uù](?![A-Za-zÀ-ÿ])|\bo[uù] en (?:est-on|sommes-nous|en sommes)\b|\bwhere (?:are )?we(?: are)? (?:at|now)\b|\bwhere (?:do )?we stand\b|\bwhat(?:'s| is) the (?:status|state|progress)\b|\bstatus\s*\?|\bquel(?:le)? est (?:l['’]?)?(?:état|avancement)\b|\bpoint d['’](?:étape|avancement)\b|\bquoi de neuf\b/i;

/** A name that fits NAME_RE, or null — characters outside it become `_`, so `mcp server` is kept as `mcp_server`. */
function cleanName(x) {
  if (typeof x !== 'string') return null;
  const n = x.trim().replace(/[^A-Za-z0-9_:.\-/]/g, '_').slice(0, 80);
  return NAME_RE.test(n) ? n : null;
}

const newUsage = () => ({ tools: new Map(), mcp: new Map(), skills: new Map(), commands: new Map(), launches: new Map(), ids: new Map(), seenUse: new Set() });
const bump = (map, key, field = 'calls') => {
  if (key === null) return;
  const e = map.get(key) ?? { calls: 0, errors: 0 };
  e[field]++;
  map.set(key, e);
};
const bumpCount = (map, key) => { if (key !== null) map.set(key, (map.get(key) ?? 0) + 1); };

/** One `tool_use` block -> counters. Only the tool name, the Skill's name and a launch's type + model are read; nothing else of `input`. */
function recordToolUse(u, block) {
  if (typeof block.id === 'string') { if (u.seenUse.has(block.id)) return; u.seenUse.add(block.id); }
  const name = typeof block.name === 'string' ? block.name : '';
  const mcp = /^mcp__(.+?)__.+$/.exec(name);
  const key = mcp ? cleanName(mcp[1]) : cleanName(name);
  const map = mcp ? u.mcp : u.tools;
  bump(map, key);
  if (typeof block.id === 'string') u.ids.set(block.id, { map, key });
  const input = block.input && typeof block.input === 'object' ? block.input : {};
  if (name === 'Skill') bumpCount(u.skills, cleanName(input.skill));
  if (name === 'Task' || name === 'Agent') {
    bumpCount(u.launches, `${cleanName(input.subagent_type) ?? 'general-purpose'}|${cleanName(input.model) ?? 'default'}`);
  }
}

function recordToolResult(u, block) {
  if (block.is_error !== true || typeof block.tool_use_id !== 'string') return;
  const t = u.ids.get(block.tool_use_id);
  if (t) bump(t.map, t.key, 'errors');
}

/** The slash-command token of a user message (`/land`, `/retro` …): only the command name, never its arguments. */
function commandOf(text, isMeta) {
  const tag = /<command-name>\/?([^<\s]{1,100})<\/command-name>/.exec(text);
  if (tag) return cleanName(tag[1]);
  if (isMeta) return null;
  const plain = /^\/([A-Za-z][A-Za-z0-9_:.-]{0,59})(?=\s|$)/.exec(text);
  return plain ? cleanName(plain[1]) : null;
}

const addCallErr = (a, b) => ({ calls: (a?.calls ?? 0) + b.calls, errors: (a?.errors ?? 0) + b.errors });
const addN = (a, b) => (a ?? 0) + b;
function mergeMaps(into, from, add) {
  for (const [k, v] of from) into.set(k, add(into.get(k), v));
}

function mergeUsage(into, from) {
  mergeMaps(into.tools, from.tools, addCallErr);
  mergeMaps(into.mcp, from.mcp, addCallErr);
  mergeMaps(into.skills, from.skills, addN);
  mergeMaps(into.commands, from.commands, addN);
  mergeMaps(into.launches, from.launches, addN);
}

/** Map -> plain object, busiest first, bounded (the server refuses larger maps). */
function toObject(map) {
  const weight = (v) => (typeof v === 'number' ? v : v.calls);
  return Object.fromEntries([...map.entries()].sort((a, b) => weight(b[1]) - weight(a[1])).slice(0, MAP_CAP));
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
  const usage = newUsage();
  const flow = { compactions: 0, summaries: 0, maxContextTokens: 0, activeMs: 0, statusPings: 0 };
  let prevMs = null;
  let raw;
  try {
    raw = readFileSync(filePath, 'utf8');
  } catch {
    return { totals, models, firstTimestamp, lastTimestamp, gitBranch, cwd, costByFamily, sprintHit: null, usage, flow };
  }

  let sprintHit = null; // first sprint path mentioned in this file — matched line by line, never a concatenated corpus
  for (const line of raw.split('\n')) {
    if (!line.trim()) continue;
    if (sprintHit === null) sprintHit = sprintFromLine(line);
    let entry;
    try {
      entry = JSON.parse(line);
    } catch {
      continue; // tolerate a truncated last line if the file is being written concurrently
    }

    if (entry.timestamp) {
      const ms = Date.parse(entry.timestamp);
      if (Number.isFinite(ms)) {
        if (prevMs !== null && ms - prevMs >= 0 && ms - prevMs < ACTIVE_GAP_MS) flow.activeMs += ms - prevMs;
        prevMs = ms;
      }
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
      const text = entry.message.content;
      if (text.length <= PING_MAX_CHARS && !text.startsWith('<') && PING_RE.test(text)) flow.statusPings++;
    }
    if (entry.type === 'user' && typeof entry.message?.content === 'string') {
      bumpCount(usage.commands, commandOf(entry.message.content, Boolean(entry.isMeta)));
    }
    if (entry.type === 'user' && entry.isCompactSummary === true) flow.summaries++;
    if (entry.type === 'system' && entry.subtype === 'compact_boundary') flow.compactions++;
    if (entry.type === 'user' && Array.isArray(entry.message?.content)) {
      for (const b of entry.message.content) if (b && b.type === 'tool_result') recordToolResult(usage, b);
    }

    if (entry.type === 'assistant' && entry.message?.role === 'assistant') {
      const msg = entry.message;
      // '<synthetic>' is the harness's own placeholder on injected messages (no API call, no usage): not a model that
      // ran, so it is neither a model, nor a call, nor part of any byType key.
      if (msg.model === SYNTHETIC_MODEL) continue;
      if (msg.model) models.add(msg.model);
      if (Array.isArray(msg.content)) {
        for (const b of msg.content) if (b && b.type === 'tool_use') recordToolUse(usage, b);
      }
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
          flow.maxContextTokens = Math.max(flow.maxContextTokens,
            (u.input_tokens ?? 0) + (u.cache_creation_input_tokens ?? 0) + (u.cache_read_input_tokens ?? 0));
          const fam = familyOf(msg.model);
          if (fam) costByFamily[fam] = (costByFamily[fam] ?? 0) + messageCost(fam, u);
        }
      }
    }
  }

  return { totals, models, firstTimestamp, lastTimestamp, gitBranch, cwd, costByFamily, sprintHit, usage, flow };
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
// The transcript scan is per line (a sprint path never spans lines), stops at the first hit per file, and the
// sub-agent transcripts are only consulted when the branch and the main transcript gave nothing. No corpus is ever
// concatenated: on a 477 MB session that string used to reach 89 % of V8's maximum string length.
const SPRINT_PATH = /docs[\\/]+(?:project[\\/]+)?sprints[\\/]+(?:\d{4}[\\/]+(?:week-\d{1,2}[\\/]+)?)?(\d{3})(?!\d)/;

function sprintFromBranch(branch) {
  return (branch ?? '').match(/^sprint[\\/](\d{3})(?!\d)/)?.[1] ?? null;
}

function sprintFromLine(line) {
  if (!line.includes('sprints')) return null; // cheap pre-filter before the regex
  return SPRINT_PATH.exec(line)?.[1] ?? null;
}

// `.method/journey` — written by the Cadrage, gitignored, one per checkout: { journeyId, sprint, intervention }.
// Only identifiers survive: a value that is not a plain name (or a 3-digit sprint) becomes null, a path is cut to its basename.
function readWork(dirs) {
  for (const d of [...new Set(dirs.filter(Boolean))]) {
    let j;
    try { j = JSON.parse(readFileSync(join(d, '.method', 'journey'), 'utf8')); } catch { continue; }
    if (!j || typeof j !== 'object') continue;
    const id = (x) => (typeof x === 'string' ? cleanName(basename(x.trim().replace(/\\/g, '/')).replace(/\.md$/i, '')) : null);
    const sprint = typeof j.sprint === 'string' || typeof j.sprint === 'number' ? String(j.sprint).padStart(3, '0') : null;
    const out = { journeyId: id(j.journeyId), sprint: sprint && /^\d{3}$/.test(sprint) ? sprint : null, intervention: id(j.intervention) };
    if (out.journeyId || out.sprint || out.intervention) return out;
  }
  return null;
}

// Landed = `/land` (land.mjs) recorded `landedSha` in `.method/land-state.json` AND that commit was made during this session.
// land-state.json keeps the last landedSha forever (its `at` moves on every blocked attempt), so the commit date is what
// stops a stale landing from being credited to a later session.
function landedOf(dirs, startedAt, gitDir) {
  try {
    const t0 = Date.parse(startedAt ?? '');
    for (const d of [...new Set(dirs.filter(Boolean))]) {
      let st;
      try { st = JSON.parse(readFileSync(join(d, '.method', 'land-state.json'), 'utf8')); } catch { continue; }
      const sha = typeof st?.landedSha === 'string' && /^[0-9a-f]{7,40}$/.test(st.landedSha) ? st.landedSha : null;
      if (!sha) continue;
      const r = spawnSync('git', ['show', '-s', '--format=%cI', sha], { cwd: gitDir ?? d, encoding: 'utf8', timeout: 5_000 });
      const at = r.status === 0 ? Date.parse((r.stdout ?? '').trim()) : NaN;
      if (Number.isFinite(at) && Number.isFinite(t0) && at >= t0) return { landed: true, landedSha: sha.slice(0, 40) };
    }
  } catch { /* fail open */ }
  return {};
}

function main() {
  const raw = readStdin();
  if (!raw) return null; // nothing on stdin — exit quietly
  let payload;
  try {
    payload = JSON.parse(raw);
  } catch {
    return null;
  }

  const sessionId = payload.session_id ?? payload.sessionId;
  const transcriptPath = payload.transcript_path ?? payload.transcriptPath;
  const projectDir = process.env.CLAUDE_PROJECT_DIR || payload.cwd || process.cwd();
  if (!sessionId || !transcriptPath || !existsSync(transcriptPath)) return null;

  const main_ = summarizeTranscript(transcriptPath);

  const subAgentsDir = join(dirname(transcriptPath), basename(transcriptPath, '.jsonl'), 'subagents');
  const subFiles = existsSync(subAgentsDir) ? findJsonlFiles(subAgentsDir) : [];
  const subTotals = zeroTotals();
  const models = new Set(main_.models);
  const subModels = new Set();
  const subSummaries = [];
  let subSprint = null; // first hit across the sub-agent files, in file order
  for (const f of subFiles) {
    const s = summarizeTranscript(f);
    subSummaries.push([f, s]);
    addTotals(subTotals, s.totals);
    for (const m of s.models) { models.add(m); subModels.add(m); }
    subSprint ??= s.sprintHit;
  }

  const repo = repoInfo(projectDir);
  const lroot = repo.root;
  const agents = summarizeAgents(subAgentsDir, subSummaries, [projectDir, lroot]);

  const totals = addTotals(addTotals(zeroTotals(), main_.totals), subTotals);
  totals.allTokens = totals.inputTokens + totals.outputTokens
    + totals.cacheCreationInputTokens + totals.cacheReadInputTokens;

  // v3 work attachment: `.method/journey` wins; the branch and the regex are fallbacks and say so (`sprintSource`).
  const work = readWork([repo.toplevel, projectDir, lroot]);
  const fromBranch = sprintFromBranch(main_.gitBranch);
  const fromRegex = main_.sprintHit ?? subSprint;
  const sprint = work?.sprint ?? fromBranch ?? fromRegex;
  const sprintSource = sprint === null ? null : work?.sprint ? 'work' : fromBranch ? 'branch' : 'regex';

  // v3 names and counters: the main transcript plus every sub-agent transcript (same tool names, same errors).
  const usage = main_.usage;
  const wf = new Map(); // workflowId -> agents that made a call
  for (const [f, s] of subSummaries) {
    mergeUsage(usage, s.usage);
    if (!s.totals.assistantApiCalls) continue;
    const seg = relative(subAgentsDir, f).split(sep);
    const wi = seg.indexOf('workflows');
    if (wi >= 0 && seg[wi + 1]) wf.set(seg[wi + 1], (wf.get(seg[wi + 1]) ?? 0) + 1);
  }
  const flow = {
    workflows: wf.size,
    workflowAgents: [...wf.values()].reduce((a, b) => a + b, 0),
    compactions: Math.max(main_.flow.compactions, main_.flow.summaries),
    maxContextTokens: main_.flow.maxContextTokens,
    activeMs: main_.flow.activeMs,
    statusPings: main_.flow.statusPings,
  };

  const row = {
    schemaVersion: 3,
    sessionId,
    hookEvent: payload.hook_event_name ?? payload.hookEventName ?? 'Stop',
    capturedAt: new Date().toISOString(),
    app: basename(projectDir),
    cwd: projectDir,
    gitBranch: main_.gitBranch,
    // What the central store keeps INSTEAD of app / cwd / gitBranch: the main checkout's name, and whether this ran in a worktree.
    project: basename(lroot).replace(/[^A-Za-z0-9._-]/g, '_').slice(0, 100) || 'unknown',
    worktree: repo.worktree,
    sprint,
    sprintSource,
    work,
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
    tools: toObject(usage.tools),
    mcp: toObject(usage.mcp),
    skills: toObject(usage.skills),
    commands: toObject(usage.commands),
    launches: toObject(usage.launches),
    flow,
    result: { landed: false, landedSha: null, proven: null, operatorScore: null, veraVerdict: null, ...landedOf([repo.toplevel, projectDir, lroot], main_.firstTimestamp, lroot) },
    outcome: null,      // optional — filled in by the closing agent's DoD report, or by Vera/Iris
    efficiencyNote: null, // optional — same
  };

  if (!USER_MODE) { // the user-level copy (--user) feeds the central store only; it never writes into a repo
    const outDir = join(lroot, 'docs', 'project', 'telemetry');
    const outFile = join(outDir, 'sessions.jsonl');
    mkdirSync(outDir, { recursive: true });
    appendFileSync(outFile, JSON.stringify(row) + '\n', 'utf8');
  }
  let size = 0;
  try { size = statSync(transcriptPath).size; } catch { /* claim key degrades to size 0 */ }
  return { row, claimKey: `${sessionId}-${size}` };
}

/**
 * Where the ledger lives: the MAIN checkout of this repository. A linked worktree has its own
 * working tree, and the ledger is gitignored (v318.a) — a row written inside the worktree would
 * vanish with it. `--git-common-dir` is the shared `.git` of the main checkout (`.git` itself
 * when this IS the main checkout); its parent is the main checkout. Anything unexpected (not a
 * repo, a bare layout, git missing) falls back to the project dir.
 * `worktree` is true for a linked worktree: its own git dir differs from the shared one.
 * `toplevel` is this checkout's own root (where `.method/` lives), null when git could not say.
 * @returns {{root: string, worktree: boolean, toplevel: string | null}}
 */
function repoInfo(projectDir) {
  try {
    // --path-format=absolute (git >= 2.31) makes git print both paths in the same spelling (a short 8.3 Windows temp path
    // otherwise differs from the long one git reports); older git falls back to the plain form.
    for (const flags of [['--path-format=absolute'], []]) {
      const r = spawnSync('git', ['rev-parse', ...flags, '--git-common-dir', '--git-dir', '--show-toplevel'], { cwd: projectDir, encoding: 'utf8', timeout: 5_000 });
      if (r.status !== 0) continue;
      const [common, gitDir, toplevel] = (r.stdout ?? '').trim().split(/\r?\n/);
      if (!common) break;
      const abs = resolve(projectDir, common);
      return {
        root: basename(abs) === '.git' ? dirname(abs) : projectDir,
        worktree: Boolean(gitDir) && resolve(projectDir, gitDir) !== abs,
        toplevel: toplevel ? resolve(projectDir, toplevel) : null,
      };
    }
  } catch { /* fall through */ }
  return { root: projectDir, worktree: false, toplevel: null };
}

// ---------------------------------------------------------------------------------------------
// Central store (v319.c). After the local ledger row, POST the same row — numbers only — to the
// `ingestTelemetry` function (project swanifly-ia) when ~/.claude/telemetry/config.json exists:
//   { "endpoint": "https://…/ingestTelemetry", "machineId": "<id>", "token": "<secret>" }
// No config -> no network, behaviour exactly as before. Never throws, never prints, never sends the
// token anywhere but the Authorization header of that endpoint. A failed send goes to outbox.jsonl
// (newest row per session, bounded) and is retried on the next Stop; a 401/403 drops the row and skips the drain.
// Only numbers and `project` + `worktree` leave the machine (see centralRow). Enrol with `npm run telemetry:enroll`.
// ---------------------------------------------------------------------------------------------

function readCentralConfig() {
  try {
    const c = JSON.parse(readFileSync(join(TELEMETRY_DIR, 'config.json'), 'utf8'));
    const url = new URL(c.endpoint);
    const local = ['localhost', '127.0.0.1', '[::1]'].includes(url.hostname);
    if (url.protocol !== 'https:' && !(url.protocol === 'http:' && local)) return null; // never send a token in clear
    if (typeof c.machineId !== 'string' || !c.machineId || typeof c.token !== 'string' || !c.token) return null;
    return { endpoint: url.href, bearer: `Bearer ${c.machineId}.${c.token}` };
  } catch {
    return null;
  }
}

// The row minus everything that identifies a path, a branch or a task: `cwd`, `gitBranch`, `app` (a worktree's dir name)
// and the legacy `topic` never leave the machine — `project` + `worktree` replace them — nor do the sub-agent labels (`description`).
function centralRow(row) {
  const out = { ...row };
  for (const k of ['cwd', 'gitBranch', 'app', 'topic']) delete out[k];
  if (Array.isArray(row.subAgents?.byAgent)) {
    out.subAgents = { ...row.subAgents, byAgent: row.subAgents.byAgent.map(({ description: _d, ...rest }) => rest) };
  }
  return out;
}

// 'ok' sent · 'drop' the server will never accept this row (don't queue it) · 'auth' 401/403: token refused, row dropped
// and no outbox drain this run · 'retry' queue it. A redirect is an error: the token must only ever reach the configured URL.
async function postRow(cfg, row, timeoutMs) {
  try {
    const res = await fetch(cfg.endpoint, {
      method: 'POST',
      headers: { 'content-type': 'application/json', authorization: cfg.bearer },
      body: JSON.stringify(centralRow(row)),
      signal: AbortSignal.timeout(timeoutMs),
      redirect: 'error',
    });
    if (res.ok) return 'ok';
    if (res.status === 401 || res.status === 403) return 'auth';
    return res.status === 400 || res.status === 413 ? 'drop' : 'retry';
  } catch {
    return 'retry';
  }
}

const outboxFile = () => join(TELEMETRY_DIR, 'outbox.jsonl');

// Newest row per session, newest sessions first, bounded.
function newestPerSession(rows) {
  const by = new Map();
  for (const r of rows) {
    if (!r || typeof r.sessionId !== 'string') continue;
    const prev = by.get(r.sessionId);
    if (!prev || String(r.capturedAt) >= String(prev.capturedAt)) by.set(r.sessionId, r);
  }
  return [...by.values()].sort((a, b) => String(b.capturedAt).localeCompare(String(a.capturedAt))).slice(0, OUTBOX_MAX_SESSIONS);
}

function parseJsonl(text) {
  const rows = [];
  for (const line of text.split('\n')) {
    if (!line.trim()) continue;
    try { rows.push(JSON.parse(line)); } catch { /* truncated line */ }
  }
  return rows;
}

function enqueue(row) {
  mkdirSync(TELEMETRY_DIR, { recursive: true });
  appendFileSync(outboxFile(), JSON.stringify(row) + '\n', 'utf8');
  try {
    if (statSync(outboxFile()).size > OUTBOX_COMPACT_BYTES) { // offline for a long time: keep only the newest per session
      const claimed = `${outboxFile()}.${process.pid}.compact`;
      renameSync(outboxFile(), claimed);
      const kept = newestPerSession(parseJsonl(readFileSync(claimed, 'utf8')));
      unlinkSync(claimed);
      for (const r of kept) appendFileSync(outboxFile(), JSON.stringify(r) + '\n', 'utf8');
    }
  } catch { /* another hook got there first */ }
}

// Claims the outbox by renaming it (atomic), plus any work file a crashed hook left behind.
function claimOutbox() {
  const claimed = [];
  try {
    for (const f of readdirSync(TELEMETRY_DIR)) {
      if (!/^outbox\.jsonl\.\d+\.work$/.test(f)) continue;
      const p = join(TELEMETRY_DIR, f);
      if (Date.now() - statSync(p).mtimeMs > ORPHAN_MS) claimed.push(p);
    }
  } catch { return []; }
  if (existsSync(outboxFile())) {
    const mine = `${outboxFile()}.${process.pid}.work`;
    try { renameSync(outboxFile(), mine); claimed.push(mine); } catch { /* raced */ }
  }
  return claimed;
}

async function drainOutbox(cfg, sent, deadline) {
  const files = claimOutbox();
  if (!files.length) return;
  const rows = [];
  for (const f of files) {
    try { rows.push(...parseJsonl(readFileSync(f, 'utf8'))); } catch { /* unreadable */ }
    try { unlinkSync(f); } catch { /* gone */ }
  }
  // A session whose newer row just went out needs nothing older.
  const pending = newestPerSession(rows).filter((r) => !(sent.has(r.sessionId) && String(r.capturedAt) <= sent.get(r.sessionId)));
  let failed = false;
  for (const [i, r] of pending.entries()) {
    const left = deadline - Date.now();
    if (failed || i >= OUTBOX_RETRY_MAX || left < 500) { enqueue(r); continue; }
    const out = await postRow(cfg, r, Math.min(POST_TIMEOUT_MS, left));
    if (out === 'retry' || out === 'auth') { failed = true; enqueue(r); }
  }
}

function claimSend(key) {
  try {
    const dir = join(TELEMETRY_DIR, 'claims');
    mkdirSync(dir, { recursive: true });
    for (const f of readdirSync(dir)) { // housekeeping: claims only matter for the seconds around one Stop
      try { if (Date.now() - statSync(join(dir, f)).mtimeMs > 24 * 3600e3) unlinkSync(join(dir, f)); } catch { /* ignore */ }
    }
    writeFileSync(join(dir, key.replace(/[^\w.-]/g, '_')), '', { flag: 'wx' });
    return true;
  } catch (e) {
    return e?.code !== 'EEXIST'; // any other failure: send anyway, the server keeps the newest row
  }
}

async function syncCentral(result) {
  const cfg = readCentralConfig();
  if (!cfg) return;
  // The repo-level hook and the user-level one (--user) both fire for the same Stop: first claim sends.
  if (!claimSend(result.claimKey)) return;
  const deadline = Date.now() + TOTAL_BUDGET_MS;
  const outcome = await postRow(cfg, result.row, POST_TIMEOUT_MS);
  if (outcome === 'retry') { enqueue(result.row); return; } // offline: don't burn time retrying the backlog
  if (outcome === 'ok') await drainOutbox(cfg, new Map([[result.row.sessionId, String(result.row.capturedAt)]]), deadline);
}

try {
  const result = main();
  if (result) await syncCentral(result);
} catch {
  // Fail open — a telemetry bug must never block Claude from stopping.
}
process.exit(0);
