# Lucia Analytics

> Conversation intelligence pipeline for the METHOD development methodology.
> Analyzes Claude Code session transcripts to surface patterns, optimize workflows, and track costs.

> **Claude suite (v308.a).** `harvest.mjs` reads **Claude Code** session transcripts from
> `~/.claude/projects/<encoded-cwd>/<sessionId>.jsonl` (override with `CLAUDE_PROJECTS_DIR`).
> The earlier Antigravity `brain/transcript.jsonl` reader was retired with the toolchain. The
> harvested record shape is unchanged, so analyze/dashboard are unaffected.

## Pipeline

```
harvest.mjs  →  analyze.mjs  →  dashboard.html
 (scan)          (compute)       (visualize)
```

| Stage | Input | Output |
|:------|:------|:-------|
| **Harvest** | `~/.claude/projects/**/*.jsonl` | `data/harvested.json` |
| **Analyze** | `data/harvested.json` | `data/analytics.json` |
| **Dashboard** | `data/analytics.json` | Interactive HTML |

## Quick Start

```bash
# 1. Harvest transcripts from Claude Code session logs
node harvest.mjs

# 2. Compute aggregate analytics
node analyze.mjs

# 3. View the dashboard (choose one):
#    a) Serve locally (recommended — auto-loads data)
npx serve .
#    b) Open directly and use file picker
xdg-open dashboard.html
```

## What It Tracks

### Per Conversation
- Duration, step counts (user/model/system/error)
- Tool calls breakdown (which tools, how often)
- Step type distribution
- Estimated input/output characters
- Thinking model usage
- Files read/written, commands run, subagents invoked
- First user prompt preview

### Aggregate Analytics
- **Overview** — totals, averages, daily activity sparkline
- **Tools** — horizontal bar chart of tool usage, full table
- **Patterns** — complexity buckets (pie), step types, thinking %
- **Timeline** — hour × day heatmap, hourly/weekly distributions
- **Top Conversations** — 10 most complex by step count
- **Tokens & Cost** — estimated tokens + cost projections for Claude/Gemini models

## Data Sources

The harvester recursively scans the Claude Code projects directory:

| Source | Path |
|:-------|:-----|
| Claude Code | `~/.claude/projects/**/*.jsonl` (override: `CLAUDE_PROJECTS_DIR`) |

Each `.jsonl` file is one session. Every line is a JSON event with:
- `type` (`user` \| `assistant` \| `summary` \| `system`), `timestamp`, `sessionId`, `uuid`
- `message` — the Anthropic message object; assistant content blocks may be `text`,
  `thinking`, or `tool_use`; user content may include `tool_result` (with `is_error`)

Derived metrics map Claude tool names to actions: `Read` → files read; `Write`/`Edit`/
`NotebookEdit` → files written; `Bash` → commands run; `Task`/`Agent` → subagents invoked.

## Directory Structure

```
lucia-analytics/
├── harvest.mjs          # Step 1: Scan & extract
├── analyze.mjs          # Step 2: Compute metrics
├── dashboard.html       # Step 3: Visualize
├── README.md            # This file
└── data/
    ├── harvested.json   # (generated) Raw conversation data
    └── analytics.json   # (generated) Computed analytics
```

## Requirements

- Node.js 18+ (ESM modules)
- Claude Code session data in `~/.claude/projects/` (or set `CLAUDE_PROJECTS_DIR`)

## Dashboard Design

- **Dark theme** (#0a0a0f background)
- **Inter font** from Google Fonts CDN
- **Gradient accents** — purple → indigo → blue
- **SVG charts** — no external charting libraries
- **Responsive** — works on any screen size
- **Self-contained** — single HTML file, zero dependencies

---

*Part of the [METHOD](../../) development methodology.*
