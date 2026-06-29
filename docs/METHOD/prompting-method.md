# Prompting Activity Logging

**Owner:** Lucia (method-level + analytics)  
**Version:** 309.a  
**Purpose:** Capture, structure, and analyze all AI prompting activity across apps

---

## Overview

Every meaningful AI-assisted development session should produce a structured log entry. These entries are collected per app, then gathered centrally on BanaShare for cross-app trend analysis.

**Key Principles:**

1. **Log at session end** — one entry per conversation/task
2. **Keep logs lean** — metadata only, no full response text
3. **Score honestly** — diff quality is subjective, that's OK
4. **Trends over volume** — 50+ entries reveal patterns

---

## Folder Convention

Each app repository:

```
docs/prompting/
 ├─ README.md      ← Synced from METHOD/templates/
 └─ log.jsonl      ← App-specific, NOT synced
```

BanaShare central:

```
Apps/{AppName}/prompting/
 └─ log.jsonl              ← Pushed from each app

docs/prompting/
 ├─ all-logs.jsonl         ← Merged by gather script
 └─ trends.md              ← Generated stats
```

---

## Log Schema

Each line in `log.jsonl` is a JSON object. All fields except those marked *(optional)* are expected.

```jsonc
{
  // --- Identity ---
  "id": "2026-03-12T15:30:00Z-finasup-003-02",   // unique, format: {date}-{app}-{sprint}-{task}
  "date": "2026-03-12",
  "startTime": "2026-03-12T14:00:00Z",            // (optional) session start
  "endTime": "2026-03-12T15:30:00Z",              // (optional) session end
  "durationMin": 90,                              // estimated duration in minutes

  // --- Context ---
  "app": "finasup",                               // app name (matches Apps/ folder)
  "sprint": "003",                                // (optional) sprint number
  "task": "003-02",                               // (optional) task reference
  "agent": "Brian",                               // METHOD agent role used

  // --- LLM ---
  "platform": "claude-code",                      // claude-code | claude-desktop | claude-web | cowork | cli
  "runner": "sub-agent",                          // sub-agent | agent-teams | cowork | swanifly | direct
  "model": "opus-4.8",                            // fable-5 | opus-4.8 | sonnet-4.6 | haiku-4.5 (+ provider models)
  "provider": "anthropic",                        // anthropic | google | openai | mistral

  // --- Prompt ---
  "objective": "Implement P&L N vs N-1 comparison charts",
  "promptType": "feature",                        // feature | debug | refactor | design | port | planning | review | question
  "iterations": 4,                                // back-and-forth exchanges (estimated)

  // --- Cost ---
  "tokensIn": 12500,                              // (optional) estimated input tokens
  "tokensOut": 8300,                              // (optional) estimated output tokens
  "estimatedCostUsd": 0.12,                       // (optional) manual cost estimate

  // --- Outcome ---
  "outcome": "success",                           // success | partial | failed | abandoned
  "filesModified": ["src/components/PnLChart.tsx"],
  "linesAdded": 245,                              // (optional) from git diff
  "linesRemoved": 32,                             // (optional) from git diff

  // --- Diff Quality ---
  "diffScore": 0.85,                             // 0–1, see scoring guide below
  "diffNotes": "Clean implementation, minor refactor needed after",

  // --- Meta ---
  "tags": ["charts", "finance", "ux"],
  "conversationId": "56b4748d-...",              // (optional) Claude session ID
  "notes": "Claude Code handled chart logic well" // (optional) lessons learned
}
```

### Required Fields (minimum viable entry)

If time is short, these 8 fields are enough:

```jsonc
{
  "id": "2026-03-12-finasup-debug",
  "date": "2026-03-12",
  "durationMin": 30,
  "app": "finasup",
  "model": "opus-4.8",
  "objective": "Fix 401 auth error",
  "promptType": "debug",
  "outcome": "success"
}
```

---

## Diff Quality Scoring

### 5-Dimension Guide

Use this to calibrate your single `diffScore` (0–1):

| Dimension | Question | 0 (bad) | 1 (great) |
|-----------|----------|---------|-----------|
| **Correctness** | Did it work on first try? | Needed many fixes | Worked immediately |
| **Completeness** | Did it cover all requirements? | Missed major parts | Full implementation |
| **Cleanliness** | Good code quality? | Messy, needed refactor | Clean, idiomatic |
| **Efficiency** | Minimal changes for the goal? | Over-engineered/bloated | Surgical, focused |
| **Durability** | Will it survive? | Rewritten within days | Still in production |

**Score = mental average of the 5 dimensions.** No need to score each individually — just let them guide your overall number.

### Quick Scoring Anchors

| Score | Meaning |
|-------|---------|
| **0.9–1.0** | Perfect — worked first try, clean, complete |
| **0.7–0.8** | Good — minor tweaks needed, solid overall |
| **0.5–0.6** | OK — required significant iteration or was incomplete |
| **0.3–0.4** | Poor — more time fixing than building |
| **0.0–0.2** | Failed — abandoned or completely rewritten |

---

## When to Log

| Event | Action |
|-------|--------|
| **Sprint task completed** | Log entry (required) |
| **Significant debug session** | Log entry (recommended) |
| **Planning/design session** | Log entry (recommended) |
| **Quick question (<5 min)** | Skip |

**Who logs:** The developer (user) at session end, or the agent if instructed. Append to `docs/prompting/log.jsonl`.

---

## Gathering & Analysis

### Push to BanaShare

Each app's `push-to-banashare.mjs` syncs `docs/prompting/log.jsonl` to `Apps/{AppName}/prompting/log.jsonl`.

### Gather Script

On BanaShare, run:

```bash
node scripts/gather-prompting.mjs
```

This:
1. Reads all `Apps/{name}/prompting/log.jsonl`
2. Merges into `docs/prompting/all-logs.jsonl` (deduped by `id`)
3. Generates `docs/prompting/trends.md` with:
   - Total sessions, cost, time invested
   - Breakdown by app, agent, model, promptType
   - Average diffScore by category
   - Success rate trends
   - Most effective model/agent combos

### Trend Queries (examples)

- *"What's my average diffScore for `feature` vs `debug` prompts?"*
- *"Which model has the highest success rate for complex tasks?"*
- *"How much time/cost did Finasup consume this month?"*
- *"What's the trend in iterations needed over time?"*

---

## Git Integration (optional)

To auto-populate `linesAdded`/`linesRemoved`, you can extract from the last commit:

```bash
git diff HEAD~1 --stat | tail -1
# Example: 5 files changed, 245 insertions(+), 32 deletions(-)
```

A helper script or post-commit hook could append this data to the current log entry.

---

**Owner:** Lucia  
**Last Updated:** 2026-06-16
