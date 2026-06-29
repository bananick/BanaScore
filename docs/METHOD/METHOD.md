# METHOD v309.a

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
| **Wire Claude Code into an app** | `tools/swanifly-claude-addon/` → `sync-method:all` | Lucia |
| **Debug** | `method-core.md` → `tests-method.md` | Watson |
| **Test** | `tests-method.md` | Sage |
| **Write copy / CUJ** | `agents-method.md` → `journeys/` | April |
| **Evolve METHOD** | ALL method files | Lucia |

---

## What's New in v309.a
1. **Runners & Orchestration layer** — Documented the native execution stack: **native sub-agents** (`.claude/agents/`, the default) → **Agent Teams** (parallel) → **Cowork** (desktop) → **Swanifly** (one runner, not *the* engine). See the new section below.
2. **Cohort 10 → 12 executable agents** — Promoted **Gordon** (Sales/Marketing) and **Kasper** (Security) to native sub-agents + Skills. **Riley** (API/automation) stays a demoted advisory hat (not executable).
3. **Native sub-agents + slash-commands** — The cohort is delegatable in Claude Code via `.claude/agents/`; rituals run as `/plan-sprint`, `/review`, `/intervention`, `/port`. `routing-method.md` now teaches the native flow, not manual role-switching.
4. **Parallel + fleet model** — Worktree isolation, fan-out on independent tasks, dependency gates, merge policy, and the multi-repo (~30-app) dimension.
5. **Gates as hooks** — DoD / Kill-Gate / write-path scoping wired as `.claude/settings.json` PreToolUse hooks instead of honor-system prose.
6. **Design Port Loop** — `docs/porting/PORTING-PLAYBOOK.md` promoted into the design method: PORT-MAP-first, one-screen-per-PR, reconcile-don't-overwrite + the MUI-hex token bridge.
7. **AI infra refresh** — `ai-infra-method.md` re-owned to **Aiko**; model lineup → 2026 baseline (Fable 5 / Opus 4.8 / Sonnet 4.6 / Haiku 4.5 + 1M context).
8. **Stack-drift caveat** — Declared stack = TARGET; detect the app's actual stack first (`Apps/web` = Next 14 + MUI flat; BanAventures = Vite + Tailwind).
9. **Claude Code addon** — `tools/swanifly-claude-addon/` seeds `SOUL.md`, `CLAUDE.md`, Skills, and a no-mock-data guard hook into apps through `sync-method:all` (skip with `--no-claude`).

---

## Philosophy

```
METHOD > VISION > PLAN > FOCUS > TASK > CODE
```

| Principle | Rule |
|---|---|
| **Docs-First** | Write docs before code. Update docs with code. |
| **Focus-First** | One objective at a time per app. Taquet: finish before switching. |
| **Process-First** | An AI app carries processes, not just features. Define processes before assigning agents. |
| **Adaptive** | Core Loop (Junia → Brian → Vera). Specialists join on demand. |
| **Lightweight** | No process unless it prevents a real problem. |
| **Local-First** | Filesystem is truth. No external DB for project state. |

---

## METHOD Files (17 docs + native layer)

> 17 synced METHOD docs (9 Core + 8 Support), **plus** the repo-root native layer:
> `CLAUDE.md`, `.claude/skills/`, `.claude/agents/` (12 sub-agents + README), `.claude/commands/` (4 rituals).

### Core (9) — Always synced

| File | Owner | Purpose | Size |
|---|---|---|---|
| `METHOD.md` | Lucia | This file. Entry point + routing. | ~16 KB |
| `method-core.md` | Lucia | Principles, tech stack, DoD | ~13 KB |
| `agents-method.md` | Lucia | 12 agents, roles, rituals | ~40 KB |
| `sprints-method.md` | Junia | Sprint system, gates, rituals | ~16 KB |
| `design-method.md` | Nova | M3 design constraints, nav patterns | ~25 KB |
| `ai-infra-method.md` | Aiko | Multi-provider AI architecture | ~41 KB |
| `tests-method.md` | Sage | Testing strategy, visual snapshots | ~14 KB |
| `definition-method.md` | April | Definition pipeline (3 phases) | ~7 KB |
| `process-method.md` | Lucia + Aiko | Process architecture for AI-native apps | ~14 KB |

### Support (8) — Load on demand

| File | Purpose |
|---|---|
| `routing-method.md` | Agent routing worked examples |
| `code-rules.md` | Smart code rules (types, perf, security) |
| `claude-rules.md` | Working agreements (status, citations, i18n) — Claude Desktop + Code |
| `prompting-method.md` | AI prompting activity logging |
| `versioning.md` | Version scheme + sync protocol |
| `README.md` | Quick start for new projects |
| `agents-engineering-method.md` | Agent team architecture on the Claude suite (Desktop + Code + Artifacts) |
| `agent-launch-prompts.md` | Pre-built launch prompts per METHOD agent |

> Plus root `CLAUDE.md` (canonical context), `.claude/skills/` (agent personas as Skills),
> **`.claude/agents/` (12 delegatable sub-agents + README), and `.claude/commands/`
> (`/plan-sprint`, `/review`, `/intervention`, `/port`)**. See `agents-engineering-method.md`.

### Tools (synced to all apps)

| Tool | Purpose | Command |
|---|---|---|
| `tools/lucia-analytics/` | Dev-transcript harvester + analytics dashboard | `node analyze.mjs` |
| `tools/banaguard/` | System RAM/CPU watchdog | `start.vbs` / `banaguard.ps1` |
| `tools/swanifly-claude-addon/` | Seed Claude Code skills, project context, and no-mock guard into apps | `npm run sync-method:all` |

> The Antigravity IDE patchers (`banabooster/`, `swanifly-antigravity-addon/`) and the
> `proto-kit/` live tuner were **removed in v308.a** — see the Claude suite migration in
> `agents-engineering-method.md`.

### App-Level (editable per app)

- `app-settings.json` — App config (name, version, sync, features)
- `project/` — App-specific docs (VISION, DESIGN, ROADMAP, FOCUS, etc.)

---

## Definition Pipeline (NEW)

**Before BUILD, every app must pass through 3 phases.**

```
DISCOVER ──→ SPECIFY ──→ PROTOTYPE ──→ BUILD
   │             │             │
   ▼             ▼             ▼
 brief.md    specs/01..19   Claude Artifacts
 competitive  (book)       (interactive, M3 tokens)
 master-prompt              → project/DESIGN.md
```

### Phase 1: DISCOVER

| Deliverable | Content |
|---|---|
| `fundations/brief.md` | Problem, idea, principles, MVP scope, tech direction |
| `fundations/competitive-analysis.md` | Market positioning, competitors, differentiation |
| `fundations/master-prompt.md` | System prompt for AI agents working on this project |

**Gate:** Human validates brief before moving to SPECIFY.

### Phase 2: SPECIFY

**Output: Specification Book** — Up to 19 chapters covering:

| # | Chapter | Content |
|---|---|---|
| 01 | Vision | Executive summary, problem, solution |
| 02 | Tech Stack | Architecture decisions |
| 03 | Data Models | Schemas, relationships |
| 04 | Personas | User archetypes |
| 05 | Features | Module inventory |
| 06 | Navigation | Routes, views, flows |
| 07 | Design System | Tokens, components, patterns |
| 08 | AI Strategy | Models, capabilities, costs |
| 09 | CUJ | Critical User Journeys |
| 10-19 | Domain-specific | Business, security, scaling, etc. |

**Gate:** Human validates spec book before PROTOTYPE.

### Phase 3: PROTOTYPE

**Output: Interactive HTML prototypes** — one per key view.

- Static HTML + CSS + JS (no framework needed)
- M3 design system applied
- All navigation functional (click-through)
- Realistic data (not lorem ipsum)

**Gate:** Human validates prototype before BUILD starts.

**See:** `definition-method.md` for detailed templates and examples.

---

## Focus System (NEW)

Every app has a `project/FOCUS.md` — the single-objective tracker.

```markdown
# FOCUS — {AppName}

## 🔴 NOW (1 seul objectif — effet taquet)
**Ne pas passer au suivant tant que non ✅**

- [ ] {objective description}
  - Sprint: {sprint ref}
  - Owner: {agent}

## 🟡 NEXT (3 max)
1. {next objective}
2. {next objective}
3. {next objective}

## 🟢 LATER
- {big picture item}

## 📝 PARKING LOT
- {idea to explore later}
```

**Rules:**
1. Only 1 item in NOW at any time
2. NOW must be ✅ before promoting from NEXT
3. FOCUS.md is auto-injected in AI chat context
4. Updated at sprint boundaries by Junia

---

## Cross-App Governance (NEW)

**BanaPilot** provides visual governance:

| Feature | Mechanism |
|---|---|
| METHOD version tracking | Per-app badge (synced / outdated / drift) |
| Drift detection | Hash comparison of METHOD files vs source |
| Sync actions | Force Update / Resolve Conflict per app |
| Focus visibility | Cross-app NOW/NEXT view |
| Health scoring | % of METHOD files present and up-to-date |

**Sync CLI (run from Bana-Share root):**
```bash
# Push METHOD → all apps
npm run sync-method:all        # node scripts/sync-method-to-all-apps.mjs
npm run sync-method:all:dry    # preview without writing
```

---

## Agent Cohort (12)

Each agent runs **two ways**: as a Claude Skill in `.claude/skills/` (invocable by name in Claude Desktop) and as a delegatable **native sub-agent** in `.claude/agents/` (Claude Code — web + Cowork's local Code tab). Canonical personas mirror `Swanifly/web/lib/engine/agent-personas.ts`.

### Core Loop (always active)
| Agent | Role | Entry Files |
|---|---|---|
| **Junia** | Planning & Orchestration | `sprints-method.md` → `project/` |
| **Brian** | Web Development | `method-core.md` → `project/DESIGN.md` → task |
| **Vera** | Review & Validation (no commits) | `method-core.md` → `design-method.md` → task |

### Managers (join for vision / design / method)
| Agent | Role | Entry Files |
|---|---|---|
| **April** | Vision, Copy, CUJ Definition | `agents-method.md` → `project/VISION.md` |
| **Nova** | Design System + Artifacts | `design-method.md` → `project/DESIGN.md` |
| **Lucia** | Method Curator | ALL method files |

### Specialists (join on demand)
| Agent | Role | When |
|---|---|---|
| **Teddy** | Mobile Dev | Mobile app tasks |
| **Aiko** | AI Integration | AI features |
| **Watson** | Reliability & Ops | Infra, CI/CD, perf |
| **Sage** | Test Architect | Test strategy |
| **Gordon** | Sales & Marketing | Growth, copy, GTM, analytics |
| **Kasper** | Security | Security review, audit, hardening |

> **Advisory hat (not executable):** **Riley** (API & multi-agent automation) is wielded inside
> a Desktop chat with the relevant METHOD file loaded — there is no Riley sub-agent or Skill.
> Promote to a Skill / sub-agent when the work becomes recurrent.

**See:** `agents-method.md` for detailed rituals and info-surfaces.

---

## Runners & Orchestration

The METHOD is **runner-agnostic**. The same cohort + the same task docs execute on any of four runners — pick the lightest that fits the job. Swanifly is **one runner, not *the* engine**.

| Runner | What it is | When to use | Parallel? |
|---|---|---|---|
| **Native sub-agents** (default) | `.claude/agents/*.md` — delegatable personas with scoped tools, invoked inside one Claude Code session | Everyday sprint work; Junia delegates task-by-task | Sequential (one delegate at a time) |
| **Agent Teams** | Multiple sub-agents fanned out across **git worktrees** in parallel | Independent tasks in a sprint (same `-seq` letter); fleet-scale work | ✅ true parallel |
| **Cowork** | Claude Desktop's local **Code tab** — same `.claude/agents` + `.claude/commands`, driven from the desktop cockpit | Operator wants Desktop's plan/review surface with local execution | Sequential |
| **Swanifly** | `Swanifly/web/lib/engine/` spawns the `claude` CLI per persona to automate execute→test→commit→push→PR | Unattended/batch sprint runs across the fleet | ✅ orchestrated batch |

**Orchestration (Junia owns it):**
1. `/plan-sprint` → Junia writes the sprint folder + task files.
2. Junia **delegates** each task to its owner sub-agent (`brian`/`teddy`/`nova`/…). Independent tasks fan out as an **Agent Team** across worktrees; dependent tasks gate in sequence.
3. `sage` runs tests → if red, `watson` debugs before proceeding.
4. `/review` → **Vera** validates (read-only, never commits) → `☑️`.
5. Merge to `main` once CI is green.

**Gates are enforced as hooks** (`.claude/settings.json` PreToolUse): write-path scoping (`sage`→tests, `vera`→review-only), a Bash command blocklist, and commit/E2E-green gates — not honor-system prose.

**See:** `agents-engineering-method.md` (runner architecture), `.claude/agents/README.md` (delegation + hooks), `sprints-method.md` (parallel/fleet model).

---

## Sprint Structure

**Folder:** `docs/sprints/{NNN} {status} {name}/`

**Status tags:** `⬜` Todo · `✅` Done · `☑️` Validated · `⚠️` Problem

**Files:**
```
docs/sprints/007 ⬜ venue-proto/
├── 007-a ☑️ Brian - Hero section.md
├── 007-b ✅ Nova  - Venue card component.md
├── 007-c ⬜ Brian - Booking flow.md
└── 007 ⬜ 🚀 Launch Prompt.md
```

**Task completion protocol:**
1. Update task status → `✅`
2. Commit: `007-a done — Hero section`
3. Push to GitHub immediately
4. Update sprint folder status if needed

**See:** `sprints-method.md` for gates, rituals, launch prompts.

---

## Definition of Done (v305.a)

**9 items. No bloat.**

- [ ] Feature works (smoke test)
- [ ] Critical path tests pass
- [ ] TypeScript strict (no `any`)
- [ ] i18n strings externalized (EN/FR)
- [ ] No lint errors
- [ ] Task report appended
- [ ] Committed + pushed to GitHub
- [ ] Vera review passed → `☑️`
- [ ] FOCUS.md updated if objective completed

**See:** `method-core.md` for extended DoD and schema governance.

---

## Tech Stack (Default)

| Layer | Stack |
|---|---|
| Web | Next.js (App Router) · TypeScript strict · **Material Design 3** · Firebase |
| Mobile | React Native + Expo · TypeScript · NativeWind + MD3 · Firebase |
| AI | Gemini-first · Multi-provider (Claude, Mistral, GPT-4o) · Vertex AI |
| Testing | Vitest (unit) · Playwright (E2E) · Visual snapshots |
| i18n | next-intl (EN/FR baseline) |
| Design | **M3 mandatory** — Tonal surfaces, shape tokens, state layers |

**Override:** Apps can override in `project/tech-stack.md`.

---

## Context Loading Rules

1. **Load your agent entry files** (see Quick Start table)
2. **Load the task file if executing a task**
3. **Load FOCUS.md** — always know the current objective
4. **DO NOT load entire METHOD/** — use entry points
5. **Max 3 METHOD files per chat** — be surgical
6. **Load journeys/ only for CUJ work**
7. **No CUJ Precision Gate?** → Run April before Junia

---

## Core Innovations (v306.c)

| # | Innovation | File |
|---|---|---|
| 1 | Modular Architecture — 15 focused files | `METHOD.md` |
| 2 | Multi-Entry Routing — load 2-3 files, not 15 | `routing-method.md` |
| 3 | Two Namespaces — `method/` (synced) + `project/` (local) | `versioning.md` |
| 4 | Global Agent Cohort — 12 agents (Skills + native sub-agents), 3 tiers | `agents-method.md` |
| 5 | **Definition Pipeline** — DISCOVER → SPECIFY → PROTOTYPE | `definition-method.md` |
| 6 | **Focus System** — Single-objective taquet per app | `project/FOCUS.md` |
| 7 | **Cross-App Governance** — BanaPilot drift detection | `versioning.md` |
| 8 | **M3 Design Standard** — Material Design 3 mandatory | `design-method.md` |
| 9 | CUJ-First Motion — Precision Gate before planning | `sprints-method.md` |
| 10 | Commit & Sync per Task — push after every `✅` | `method-core.md` |
| 11 | Sprint Folder Status — `✅`/`☑️`/`⚠️` in folder name | `sprints-method.md` |
| 12 | Sprint Launch Prompts — copy-paste ready for new chat | `sprints-method.md` |
| 13 | Data Governance — Zod schemas, migration protocol | `method-core.md` |
| 14 | Visual Snapshot Testing — screenshots at sprint end | `tests-method.md` |
| 15 | **Artifacts Prototyping** — Claude Design replaces the proto-kit tuner | `design-method.md` |
| 16 | **Process Architecture** — Process-first AI governance | `process-method.md` |
| 17 | **Trust Progression** — Data-driven delegation promotion/demotion | `process-method.md` |
| 18 | **Agent Contracts** — Formal specs for application-level AI agents | `process-method.md` |
| 19 | **Claude Suite Migration** — Desktop + Code + Artifacts replace Cursor/Antigravity | `agents-engineering-method.md` |
| 20 | **Agent Skills + Sub-agents** — Cohort as Claude Skills (Desktop) AND delegatable sub-agents (Code) | `agents-engineering-method.md`, `.claude/skills/`, `.claude/agents/` |
| 21 | **Runners & Orchestration** — Sub-agents → Agent Teams → Cowork → Swanifly (one runner); gates-as-hooks | `agents-engineering-method.md`, `.claude/settings.json` |

---

## Version & Sync

**Current Version:** 309.a  
**Epoch:** 3 (Modular & Multi-Entry)  
**Released:** 2026-06-16

### Version Scheme

- **Minor (a→b):** Clarifications, bug fixes
- **Major (308→309):** New file, significant change, new sub-agent / command / hook
- **Epoch (399→400):** Foundational overhaul

**See:** `versioning.md` for full history and sync protocol.

---

## Support

| Need | Action |
|---|---|
| Question | Read this file → check specific method file |
| Bug | `docs/bugs/BUG-###-Lucia-{issue}.md` |
| Proposal | `docs/interventions/YYYY-MM-DD-Lucia-{topic}.md` |

---

**Owner:** Lucia  
**Last Updated:** 2026-06-16
