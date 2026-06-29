#!/usr/bin/env node

/**
 * Lucia Analytics — Metrics Computation
 *
 * Reads data/harvested.json and computes aggregate analytics,
 * writing structured results to data/analytics.json.
 *
 * Usage: node analyze.mjs
 */

import { readFile, writeFile } from 'node:fs/promises';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = dirname(fileURLToPath(import.meta.url));
const DATA_DIR = join(__dirname, 'data');
const INPUT_FILE = join(DATA_DIR, 'harvested.json');
const OUTPUT_FILE = join(DATA_DIR, 'analytics.json');

/**
 * @param {Array<{tool: string, count: number}>} arr
 * @returns {Array<{tool: string, count: number, percentage: number}>}
 */
function addPercentages(arr) {
  const total = arr.reduce((sum, item) => sum + item.count, 0);
  return arr.map((item) => ({
    ...item,
    percentage: total > 0 ? Math.round((item.count / total) * 10000) / 100 : 0,
  }));
}

async function main() {
  console.log('');
  console.log('╔══════════════════════════════════════════╗');
  console.log('║   🍌 Lucia Analytics — Analyze           ║');
  console.log('╚══════════════════════════════════════════╝');
  console.log('');

  let raw;
  try {
    raw = await readFile(INPUT_FILE, 'utf-8');
  } catch {
    console.error(`❌ Cannot read ${INPUT_FILE}`);
    console.error('   Run "node harvest.mjs" first.');
    process.exit(1);
  }

  /** @type {Array<object>} */
  const conversations = JSON.parse(raw);
  console.log(`📊 Analyzing ${conversations.length} conversations...`);

  // ── Overview ──────────────────────────────────────────
  const totalSteps = conversations.reduce((s, c) => s + c.totalSteps, 0);
  const totalDurationMinutes = conversations.reduce((s, c) => s + c.durationMinutes, 0);
  const dates = conversations
    .map((c) => c.startedAt)
    .filter(Boolean)
    .sort();

  const overview = {
    totalConversations: conversations.length,
    totalSteps,
    totalDurationHours: Math.round((totalDurationMinutes / 60) * 100) / 100,
    dateRange: {
      from: dates[0] || null,
      to: dates[dates.length - 1] || null,
    },
    avgStepsPerConversation:
      conversations.length > 0 ? Math.round(totalSteps / conversations.length) : 0,
    avgDurationMinutes:
      conversations.length > 0
        ? Math.round((totalDurationMinutes / conversations.length) * 100) / 100
        : 0,
  };

  // ── Tool Usage ────────────────────────────────────────
  /** @type {Record<string, number>} */
  const toolAgg = {};
  for (const conv of conversations) {
    for (const [tool, count] of Object.entries(conv.toolCalls || {})) {
      toolAgg[tool] = (toolAgg[tool] || 0) + count;
    }
  }
  const toolUsage = addPercentages(
    Object.entries(toolAgg)
      .map(([tool, count]) => ({ tool, count }))
      .sort((a, b) => b.count - a.count)
  );

  // ── Step Type Distribution ────────────────────────────
  /** @type {Record<string, number>} */
  const typeAgg = {};
  for (const conv of conversations) {
    for (const [type, count] of Object.entries(conv.stepTypes || {})) {
      typeAgg[type] = (typeAgg[type] || 0) + count;
    }
  }
  const stepTypeDistribution = Object.entries(typeAgg)
    .map(([type, count]) => ({ type, count }))
    .sort((a, b) => b.count - a.count);
  const typeTotal = stepTypeDistribution.reduce((s, x) => s + x.count, 0);
  const stepTypeDistWithPct = stepTypeDistribution.map((item) => ({
    ...item,
    percentage: typeTotal > 0 ? Math.round((item.count / typeTotal) * 10000) / 100 : 0,
  }));

  // ── Time Distribution ─────────────────────────────────
  /** @type {Record<number, number>} */
  const byHour = {};
  /** @type {Record<number, number>} */
  const byDayOfWeek = {};
  const dayNames = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];

  for (const conv of conversations) {
    if (!conv.startedAt) continue;
    const d = new Date(conv.startedAt);
    const hour = d.getUTCHours();
    const dow = d.getUTCDay();
    byHour[hour] = (byHour[hour] || 0) + 1;
    byDayOfWeek[dow] = (byDayOfWeek[dow] || 0) + 1;
  }

  const timeDistribution = {
    byHour: Array.from({ length: 24 }, (_, i) => ({
      hour: i,
      label: `${String(i).padStart(2, '0')}:00`,
      conversations: byHour[i] || 0,
    })),
    byDayOfWeek: Array.from({ length: 7 }, (_, i) => ({
      day: i,
      label: dayNames[i],
      conversations: byDayOfWeek[i] || 0,
    })),
  };

  // ── Error Analysis ────────────────────────────────────
  const totalErrors = conversations.reduce((s, c) => s + c.errorSteps, 0);
  const conversationsWithErrors = conversations.filter((c) => c.errorSteps > 0).length;
  const errorAnalysis = {
    totalErrors,
    conversationsWithErrors,
    errorRate:
      totalSteps > 0 ? Math.round((totalErrors / totalSteps) * 10000) / 100 : 0,
    conversationErrorRate:
      conversations.length > 0
        ? Math.round((conversationsWithErrors / conversations.length) * 10000) / 100
        : 0,
  };

  // ── Complexity Buckets ────────────────────────────────
  const buckets = [
    { label: 'Simple (1-10)', min: 1, max: 10 },
    { label: 'Medium (11-30)', min: 11, max: 30 },
    { label: 'Complex (31-100)', min: 31, max: 100 },
    { label: 'Heavy (100+)', min: 101, max: Infinity },
  ];
  const complexityBuckets = buckets.map((b) => {
    const count = conversations.filter(
      (c) => c.totalSteps >= b.min && c.totalSteps <= b.max
    ).length;
    return {
      label: b.label,
      count,
      percentage:
        conversations.length > 0
          ? Math.round((count / conversations.length) * 10000) / 100
          : 0,
    };
  });

  // ── Estimated Tokens ──────────────────────────────────
  const totalInputChars = conversations.reduce((s, c) => s + c.estimatedInputChars, 0);
  const totalOutputChars = conversations.reduce((s, c) => s + c.estimatedOutputChars, 0);
  const estimatedTokens = {
    totalInputChars,
    totalOutputChars,
    estimatedInputTokens: Math.round(totalInputChars / 4),
    estimatedOutputTokens: Math.round(totalOutputChars / 4),
  };

  // ── Thinking Usage ────────────────────────────────────
  const thinkingCount = conversations.filter((c) => c.hasThinking).length;
  const thinkingUsage = {
    count: thinkingCount,
    total: conversations.length,
    percentage:
      conversations.length > 0
        ? Math.round((thinkingCount / conversations.length) * 10000) / 100
        : 0,
  };

  // ── Top Conversations ─────────────────────────────────
  const topConversations = [...conversations]
    .sort((a, b) => b.totalSteps - a.totalSteps)
    .slice(0, 10)
    .map((c) => ({
      conversationId: c.conversationId,
      source: c.source,
      totalSteps: c.totalSteps,
      durationMinutes: c.durationMinutes,
      userPromptPreview: c.userPromptPreview,
      filesRead: c.filesRead,
      filesWritten: c.filesWritten,
      commandsRun: c.commandsRun,
      errorSteps: c.errorSteps,
    }));

  // ── Daily Activity ────────────────────────────────────
  /** @type {Record<string, {conversations: number, steps: number}>} */
  const dailyMap = {};
  for (const conv of conversations) {
    if (!conv.startedAt) continue;
    const dateKey = conv.startedAt.slice(0, 10);
    if (!dailyMap[dateKey]) {
      dailyMap[dateKey] = { conversations: 0, steps: 0 };
    }
    dailyMap[dateKey].conversations += 1;
    dailyMap[dateKey].steps += conv.totalSteps;
  }

  // Fill in the last 30 days (or from earliest date)
  const allDates = Object.keys(dailyMap).sort();
  const dailyActivity = allDates.map((date) => ({
    date,
    conversations: dailyMap[date].conversations,
    steps: dailyMap[date].steps,
  }));

  // ── Source Distribution ───────────────────────────────
  /** @type {Record<string, number>} */
  const sourceMap = {};
  for (const conv of conversations) {
    sourceMap[conv.source] = (sourceMap[conv.source] || 0) + 1;
  }
  const sourceDistribution = Object.entries(sourceMap)
    .map(([source, count]) => ({
      source,
      count,
      percentage:
        conversations.length > 0
          ? Math.round((count / conversations.length) * 10000) / 100
          : 0,
    }))
    .sort((a, b) => b.count - a.count);

  // ── Activity Heatmap Data ─────────────────────────────
  // hour × dayOfWeek matrix
  const heatmapData = Array.from({ length: 7 }, () => Array.from({ length: 24 }, () => 0));
  for (const conv of conversations) {
    if (!conv.startedAt) continue;
    const d = new Date(conv.startedAt);
    heatmapData[d.getUTCDay()][d.getUTCHours()] += 1;
  }
  const activityHeatmap = {
    days: dayNames,
    hours: Array.from({ length: 24 }, (_, i) => `${String(i).padStart(2, '0')}:00`),
    data: heatmapData,
    maxValue: Math.max(...heatmapData.flat()),
  };

  // ── Assemble Result ───────────────────────────────────
  const analytics = {
    generatedAt: new Date().toISOString(),
    overview,
    toolUsage,
    stepTypeDistribution: stepTypeDistWithPct,
    timeDistribution,
    errorAnalysis,
    complexityBuckets,
    estimatedTokens,
    thinkingUsage,
    topConversations,
    dailyActivity,
    sourceDistribution,
    activityHeatmap,
  };

  await writeFile(OUTPUT_FILE, JSON.stringify(analytics, null, 2), 'utf-8');

  // ── Print Summary ─────────────────────────────────────
  console.log('');
  console.log('────────────────────────────────────────────');
  console.log('📈 Overview');
  console.log(`   Conversations:  ${overview.totalConversations}`);
  console.log(`   Total steps:    ${overview.totalSteps.toLocaleString()}`);
  console.log(`   Total hours:    ${overview.totalDurationHours}h`);
  console.log(`   Avg steps/conv: ${overview.avgStepsPerConversation}`);
  console.log(`   Avg duration:   ${overview.avgDurationMinutes} min`);
  console.log('');
  console.log('🔧 Top 5 Tools');
  for (const t of toolUsage.slice(0, 5)) {
    console.log(`   ${t.tool}: ${t.count} (${t.percentage}%)`);
  }
  console.log('');
  console.log('⚠️  Errors');
  console.log(`   Error rate:     ${errorAnalysis.errorRate}%`);
  console.log(`   Total errors:   ${errorAnalysis.totalErrors}`);
  console.log('');
  console.log('🧠 Thinking');
  console.log(`   Usage:          ${thinkingUsage.percentage}% of conversations`);
  console.log('');
  console.log('💰 Estimated Tokens');
  console.log(`   Input:          ${estimatedTokens.estimatedInputTokens.toLocaleString()}`);
  console.log(`   Output:         ${estimatedTokens.estimatedOutputTokens.toLocaleString()}`);
  console.log('');
  console.log(`✅ Analytics written to ${OUTPUT_FILE}`);
  console.log('');
}

main().catch((err) => {
  console.error('❌ Analysis failed:', err.message);
  process.exit(1);
});
