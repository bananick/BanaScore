# METHOD v311.a

**Version:** 311.a  
**Epoch:** 3 (Modular & Multi-Entry)  
**Released:** 2026-07-10  
**Status:** ✅ Production-Ready

---

## Quick Start

**Load what you need. Nothing more.**

| I want to... | Load | Agent |
|---|---|---|
| **Define a new app** | `definition-method.md` → `project/definition/` | April + Nova |
| **Plan a sprint** | `sprints-method.md` → `journeys/` → `project/` | Junia |
| **Build a feature** | `method-core.md` → `project/DESIGN.md` → task | Brian / Teddy |
| **Design UI** | `design-method.md` → `project/DESIGN.md` | Nova |
| **Add AI capability** | `ai-infra-method.md` → `project/AI-INFRA.md` | Aiko |
| **Define app processes** | `process-method.md` → `project/PROCESSES.md` | Aiko + Lucia |
| **Review work** | `method-core.md` → `design-method.md` → task | Vera |
| **Sync METHOD** | `versioning.md` → BanaPilot or CLI | Lucia |
| **Debug** | `method-core.md` → `tests-method.md` | Watson |
| **Test** | `tests-method.md` | Sage |
| **Write copy / CUJ** | `agents-method.md` → `journeys/` | April |
| **Evolve METHOD** | ALL method files | Lucia |

---

## File Structure (17 docs + native layer)

```
CLAUDE.md                                       ← Repo root: canonical context (Claude Code auto-loads)
.claude/skills/                                 ← Agent personas as Claude Skills (Desktop)
.claude/agents/                                 ← 13 delegatable sub-agents + README (Claude Code)
.claude/commands/                               ← /plan-sprint, /review, /intervention, /port
.claude/settings.json                           ← Enforcement hooks (gates-as-hooks)

docs/METHOD/                                    ← Synced across all apps
  METHOD.md                  # Index, routing tables, innovations
  method-core.md             # Principles, tech stack, DoD
  agents-method.md           # 13 agents, roles, rituals, models
  agents-engineering-method.md  # Claude suite: Desktop + Code + Artifacts
  routing-method.md          # Entry points, agent routing, model routing (tiers)
  ai-infra-method.md         # Multi-provider architecture
  sprints-method.md          # Sprint structure, gates
  tests-method.md            # Testing strategy
  design-method.md           # Global design constraints
  definition-method.md       # DISCOVER → SPECIFY → PROTOTYPE pipeline
  process-method.md          # Process-First governance
  prompting-method.md        # AI prompting activity logging
  claude-rules.md            # Claude working agreements (Desktop + Code)
  code-rules.md              # TypeScript strict, no any, Zod
  versioning.md              # Version scheme, sync protocol
  agent-launch-prompts.md    # Pre-built launch prompts per agent

docs/project/                                   ← App-specific (local)
  VISION.md, DESIGN.md, SCHEMA.md, FOCUS.md, STATE.md, ROADMAP.web.md, AI-INFRA.md
```

---

## What's New in v311.a

1. **Model routing by default — orchestrate high, execute cheap.** The coordinator runs on the strongest model of its surface (Fable/Opus on Claude); each delegated task runs on the cheapest model meeting its bar — **T1** judge/plan/review/security (opus) · **T2** build/tests/ops (sonnet) · **T3** mechanical (haiku, delegation-time override only). Junia tags tasks `Tier: T1|T2|T3` at planning; Vera/Kasper never below T1. On Cursor/Codex the coordinator inventories the tool's models and maps them onto the tiers. Canonical: `routing-method.md` → "Model Routing".

*(v310.a added the `/relay` handoff ritual + `## Resume here` convention — see `versioning.md`.)*

## What's New in v309.a

1. **Runners & Orchestration layer** — Native sub-agents (`.claude/agents/`, default) → Agent Teams (parallel) → Cowork → Swanifly (one runner, not *the* engine). See the section below.
2. **Cohort 10 → 12** — Promoted **Gordon** (Sales/Marketing) + **Kasper** (Security) to sub-agents + Skills. **Riley** (API/automation) stays a demoted advisory hat.
3. **Native sub-agents + slash-commands** — Delegatable in Claude Code via `.claude/agents/`; rituals as `/plan-sprint`, `/review`, `/intervention`, `/port`.
4. **Parallel + fleet model** — Worktree isolation, fan-out, dependency gates, merge policy, multi-repo dimension.
5. **Gates as hooks** — DoD / write-path scoping wired in `.claude/settings.json`.
6. **Design Port Loop** — PORT-MAP-first, one-screen-per-PR, MUI-hex token bridge.
7. **AI infra refresh + stack caveat** — `ai-infra` re-owned to Aiko, 2026 model lineup; declared stack = TARGET (detect actual stack first).

---

## Core Principles

1. **Docs-First** — Write docs before code. Update docs with code.
2. **Focus-First** — One objective at a time. The ratchet moves forward only.
3. **Process-First** — Business processes are first-class citizens.
4. **Adaptive** — Core Loop handles most work; specialists join when needed.
5. **Lightweight** — No heavy process unless necessary.
6. **Local-First** — Everything lives in the repo. Markdown is truth.

---

## Agent Cohort (13)

Each agent runs as a Claude **Skill** (`.claude/skills/`, Desktop) AND a delegatable native **sub-agent** (`.claude/agents/`, Claude Code — web + Cowork).

| Group | Agents |
|---|---|
| **Core Loop** | Junia (planning), Brian (web dev), Vera (review) |
| **Managers** | April (vision), Nova (design), Lucia (method) |
| **Specialists** | Teddy, Aiko, Watson, Sage, Gordon (sales/marketing), Kasper (security), Iris (research) |

> **Advisory hat (not executable):** Riley (API & multi-agent automation) is wielded in a
> Desktop chat — no sub-agent or Skill. See `agents-method.md`.

---

## The Claude Suite

| Surface | When to use |
|---|---|
| **Claude Desktop** 🧭 | Plan, scope, review, design (Artifacts) — you decide here; **Cowork** = its local Code tab |
| **Claude Code** ⚙️ | Multi-file build, tests, autonomous sprint execution via native sub-agents |
| **Claude Design** 🎨 | Interactive prototypes as Artifacts, from the spec + M3 tokens |

---

## Runners & Orchestration

The METHOD is **runner-agnostic** — the same cohort + task docs execute on any of four runners. **Swanifly is one runner, not *the* engine.**

| Runner | What it is | Parallel? |
|---|---|---|
| **Native sub-agents** (default) | `.claude/agents/*.md` delegated inside one Claude Code session | Sequential |
| **Agent Teams** | Sub-agents fanned out across git worktrees | ✅ true parallel |
| **Cowork** | Desktop's local Code tab (same `.claude/agents` + `.claude/commands`) | Sequential |
| **Swanifly** | `Swanifly/web/lib/engine/` spawns the `claude` CLI per persona for unattended runs | ✅ orchestrated batch |

**Flow (Junia orchestrates):** `/plan-sprint` → delegate to owner sub-agents (independent tasks fan out as a team) → `sage` tests → `watson` if red → `/review` (Vera, read-only) → merge. Gates (`sage`→tests-only, `vera`→review-only, Bash blocklist) are enforced as `.claude/settings.json` hooks.

**See:** `agents-engineering-method.md`, `.claude/agents/README.md`.

---

## Version Information

**Current:** 311.a  
**Previous:** 310.a → 309.a → 308.a → 307.a → 305.a → 304.a → 303.a → 302.a

**See:** `versioning.md` for full changelog.

---

**Owner:** Lucia  
**Last Updated:** 2026-07-10  
**Status:** ✅ Production-Ready
