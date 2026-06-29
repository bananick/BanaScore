#!/usr/bin/env node

/**
 * Lucia Analytics — Transcript Harvester (Claude suite)
 *
 * Scans Claude Code session transcripts (~/.claude/projects/<encoded-cwd>/<sessionId>.jsonl),
 * extracts per-session metrics, and writes structured results to data/harvested.json.
 *
 * Migrated to the Claude suite in v308.a. Each `.jsonl` file is one session: every line is a
 * JSON event with `type` ("user" | "assistant" | "summary" | "system"), an ISO `timestamp`,
 * and a `message` (Anthropic message object). The output record shape is unchanged, so the
 * downstream analyze.mjs / dashboard.html are unaffected.
 *
 * Override the scan root with CLAUDE_PROJECTS_DIR if your install differs.
 *
 * Usage: node harvest.mjs
 */

import { readdir, readFile, writeFile, mkdir } from 'node:fs/promises';
import { join, dirname, basename } from 'node:path';
import { homedir } from 'node:os';
import { fileURLToPath } from 'node:url';

const __dirname = dirname(fileURLToPath(import.meta.url));
const DATA_DIR = join(__dirname, 'data');
const OUTPUT_FILE = join(DATA_DIR, 'harvested.json');

const CLAUDE_PROJECTS_DIR =
  process.env.CLAUDE_PROJECTS_DIR || join(homedir(), '.claude', 'projects');

/**
 * Strip XML tags from a string for cleaner previews.
 * @param {string} text
 * @returns {string}
 */
function stripXmlTags(text) {
  return text.replace(/<[^>]+>/g, '').replace(/\s+/g, ' ').trim();
}

/**
 * Normalize a Claude message `content` (string or block array) into:
 *  - textChars: total length of text blocks
 *  - textPreview: concatenated text (for previews)
 *  - toolUses: [{ name }] from tool_use blocks
 *  - toolResultErrors: count of tool_result blocks flagged is_error
 *  - hasThinking: any thinking/redacted_thinking block
 *  - hasText: any text block (or a plain string)
 * @param {unknown} content
 */
function summarizeContent(content) {
  const out = {
    textChars: 0,
    textPreview: '',
    toolUses: /** @type {Array<{name: string}>} */ ([]),
    toolResultErrors: 0,
    hasThinking: false,
    hasText: false,
  };

  if (typeof content === 'string') {
    out.textChars = content.length;
    out.textPreview = content;
    out.hasText = content.trim().length > 0;
    return out;
  }
  if (!Array.isArray(content)) return out;

  for (const block of content) {
    if (!block || typeof block !== 'object') continue;
    switch (block.type) {
      case 'text': {
        const t = typeof block.text === 'string' ? block.text : '';
        out.textChars += t.length;
        out.textPreview += (out.textPreview ? ' ' : '') + t;
        if (t.trim()) out.hasText = true;
        break;
      }
      case 'thinking':
      case 'redacted_thinking':
        out.hasThinking = true;
        break;
      case 'tool_use':
        out.toolUses.push({ name: typeof block.name === 'string' ? block.name : 'unknown' });
        break;
      case 'tool_result':
        if (block.is_error === true) out.toolResultErrors += 1;
        break;
      default:
        break;
    }
  }
  return out;
}

/**
 * Parse a single Claude Code session JSONL file into a conversation record.
 * @param {string} filePath
 * @returns {Promise<object|null>}
 */
async function parseSession(filePath) {
  let raw;
  try {
    raw = await readFile(filePath, 'utf-8');
  } catch {
    return null;
  }

  const lines = raw.trim().split('\n').filter(Boolean);
  if (lines.length === 0) return null;

  /** @type {Array<object>} */
  const events = [];
  for (const line of lines) {
    try {
      events.push(JSON.parse(line));
    } catch {
      // skip malformed lines
    }
  }
  if (events.length === 0) return null;

  let conversationId = basename(filePath, '.jsonl');
  const withSession = events.find((e) => typeof e.sessionId === 'string');
  if (withSession) conversationId = withSession.sessionId;

  // Timestamps
  const timestamps = events
    .map((e) => e.timestamp)
    .filter(Boolean)
    .map((t) => new Date(t).getTime())
    .filter((t) => !Number.isNaN(t))
    .sort((a, b) => a - b);

  const startedAt = timestamps.length > 0 ? new Date(timestamps[0]).toISOString() : null;
  const endedAt =
    timestamps.length > 0 ? new Date(timestamps[timestamps.length - 1]).toISOString() : null;
  const durationMinutes =
    timestamps.length >= 2
      ? Math.round(((timestamps[timestamps.length - 1] - timestamps[0]) / 60000) * 100) / 100
      : 0;

  let userSteps = 0; // explicit user turns (typed by the human)
  let modelSteps = 0; // assistant turns
  let systemSteps = 0; // tool-result turns + system/summary/meta
  let errorSteps = 0;
  let estimatedInputChars = 0;
  let estimatedOutputChars = 0;
  let hasThinking = false;
  let firstUserPreview = '';

  /** @type {Record<string, number>} */
  const toolCalls = {};
  /** @type {Record<string, number>} */
  const stepTypes = {};

  for (const ev of events) {
    const evType = ev.type || 'unknown';
    stepTypes[evType] = (stepTypes[evType] || 0) + 1;

    const message = ev.message && typeof ev.message === 'object' ? ev.message : null;
    const sum = message ? summarizeContent(message.content) : null;

    if (evType === 'assistant') {
      modelSteps += 1;
      if (sum) {
        estimatedOutputChars += sum.textChars;
        if (sum.hasThinking) hasThinking = true;
        for (const tu of sum.toolUses) {
          toolCalls[tu.name] = (toolCalls[tu.name] || 0) + 1;
        }
      }
    } else if (evType === 'user') {
      // A user line is either an explicit human turn or a tool_result delivery.
      if (sum && sum.hasText && sum.toolResultErrors === 0 && !ev.isMeta) {
        userSteps += 1;
        estimatedInputChars += sum.textChars;
        if (!firstUserPreview && sum.textPreview.trim()) {
          firstUserPreview = stripXmlTags(sum.textPreview).slice(0, 200);
        }
      } else {
        systemSteps += 1;
        if (sum) errorSteps += sum.toolResultErrors;
      }
    } else {
      systemSteps += 1;
    }
  }

  // Derived action counts (Claude tool names → the metrics the dashboard expects)
  const filesRead = toolCalls['Read'] || 0;
  const filesWritten =
    (toolCalls['Write'] || 0) + (toolCalls['Edit'] || 0) + (toolCalls['NotebookEdit'] || 0);
  const commandsRun = toolCalls['Bash'] || 0;
  const subagentsInvoked = (toolCalls['Task'] || 0) + (toolCalls['Agent'] || 0);

  return {
    conversationId,
    source: 'claude-code',
    startedAt,
    endedAt,
    durationMinutes,
    totalSteps: events.length,
    userSteps,
    modelSteps,
    systemSteps,
    errorSteps,
    toolCalls,
    stepTypes,
    estimatedInputChars,
    estimatedOutputChars,
    hasThinking,
    userPromptPreview: firstUserPreview,
    filesRead,
    filesWritten,
    commandsRun,
    subagentsInvoked,
  };
}

/**
 * Recursively collect `.jsonl` session files under the Claude projects dir.
 * @param {string} root
 * @returns {Promise<Array<string>>}
 */
async function findSessionFiles(root) {
  /** @type {Array<string>} */
  const files = [];
  let entries;
  try {
    entries = await readdir(root, { withFileTypes: true });
  } catch {
    console.log(`  ⚠ Directory not found: ${root}`);
    return files;
  }
  for (const entry of entries) {
    const full = join(root, entry.name);
    if (entry.isDirectory()) {
      files.push(...(await findSessionFiles(full)));
    } else if (entry.isFile() && entry.name.endsWith('.jsonl')) {
      files.push(full);
    }
  }
  return files;
}

async function main() {
  console.log('');
  console.log('╔══════════════════════════════════════════╗');
  console.log('║   🍌 Lucia Analytics — Harvest           ║');
  console.log('╚══════════════════════════════════════════╝');
  console.log('');

  console.log(`📂 Scanning claude-code: ${CLAUDE_PROJECTS_DIR}`);
  const sessionFiles = await findSessionFiles(CLAUDE_PROJECTS_DIR);
  console.log(`   Found ${sessionFiles.length} session transcript(s)`);

  /** @type {Array<object>} */
  let allConversations = [];
  for (const file of sessionFiles) {
    const record = await parseSession(file);
    if (record) allConversations.push(record);
  }

  // Sort by startedAt
  allConversations.sort((a, b) => {
    const ta = a.startedAt ? new Date(a.startedAt).getTime() : 0;
    const tb = b.startedAt ? new Date(b.startedAt).getTime() : 0;
    return ta - tb;
  });

  // Write output
  await mkdir(DATA_DIR, { recursive: true });
  await writeFile(OUTPUT_FILE, JSON.stringify(allConversations, null, 2), 'utf-8');

  // Summary
  const totalSteps = allConversations.reduce((sum, c) => sum + c.totalSteps, 0);
  const dates = allConversations
    .map((c) => c.startedAt)
    .filter(Boolean)
    .sort();

  console.log('');
  console.log('────────────────────────────────────────────');
  console.log(`✅ Harvested ${allConversations.length} conversations`);
  console.log(`   Total steps: ${totalSteps.toLocaleString()}`);
  if (dates.length >= 2) {
    console.log(`   Date range: ${dates[0].slice(0, 10)} → ${dates[dates.length - 1].slice(0, 10)}`);
  }
  console.log(`   Output: ${OUTPUT_FILE}`);
  console.log('');
}

main().catch((err) => {
  console.error('❌ Harvest failed:', err.message);
  process.exit(1);
});
