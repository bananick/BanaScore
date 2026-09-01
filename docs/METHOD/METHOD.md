# METHOD v315.a

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

## What's New in v315.a
1. **Operator Reporting — the Debrief replaces the closing Orientation frame.** Every substantial answer now ends with one card built around the three questions the operator kept asking by hand: *ce qui vient d'être fait · où ça met le projet global · ce que je dois décider maintenant*. Rows: a one-line headline + status glyph, **`Avancement`** (position in the global project — a real count from sprint task files / plan to-dos / PORT-MAP rows / PRs, **never an invented ratio**), **`À RETENIR`** (2–4 one-line key facts, including a `Décidé pour toi :` line for every reversible call made without asking), **`TU DÉCIDES`** (0–2 operator calls, recommendation first, or `rien — j'ai tranché : …`), **`SUITE`** (exactly one next action) and an optional `⚠` line, then the `▶ Prompt suivant` block. Hard discipline: ≤ 16 lines, ≤ 68 characters, **no wrapping paragraph inside the card** — the previous frame failed precisely because prose blobs were stuffed into framed rows. Cadence: full card on substantial answers · one landing line on small ones · no card when nothing was done. **Delegated sub-agents never emit a Debrief** — they hand their orchestrator a `Done / State / Next` report and the orchestrator renders one card for the whole chain. The **Flight Deck** becomes the **pickup** card only (`/brief`, resume hook, cold start), ending the two-overlapping-summaries redundancy, and the 3-line header is scoped to written artifacts (PR bodies, task reports). Canonical: `method-core.md` → "Operator Reporting". Tooling: `flight-deck.ps1 -Mode context` now emits `sprint` + `sprint_progress` (counts both the METHOD emoji markers and the ASCII `[ ]`/`[x]` convention most app repos actually use), so `Avancement` is grounded for free on `/brief` and on resume.

## What's New in v314.b
1. **One sprint = one conversation = one branch = one worktree.** Two canonical rules contradicted each other — `agents-engineering-method.md` §9 said *"One thread per task"*, `sprints-method.md` said *"One sprint, one conversation"* — so an operator reading both did not know how many windows to open. Arbitrated once, in **`sprints-method.md` → "Conversation Naming"**, which is now the single home of the session-splitting rule; everywhere else points to it. The rule is dictated by the two `Stop` hooks in `.claude/settings.json`: `ship-push.sh` and `session-telemetry.mjs` both no-op on `main`/`master`/`HEAD` and both push the current branch **swallowing a rejected push** — so two sessions on one branch make the second one's work invisible to every downstream reader while it exists only locally, and two sessions in one worktree share an index (`/ship`'s `git add` stages the other's mid-edit files). Three lanes, ASCII titles, sprint number first: **Sprint** `{NNN} {sujet}` / `sprint/{NNN}-{slug}` · **Split** `{NNN} {sujet} · {seq} {titre}` / `sprint/{NNN}-{seq}` + its own worktree · **Intervention** `INT {YYYY-MM-DD} {sujet}` / `int/{date}-{slug}`; the operator's uppercase lane prefixes (`PILOT - `, `PROD - `, `AUTOM - `, `GROWTH - `) are documented as the non-sprint form. **The choice is runtime, never planning-time** — default to a sub-agent inside the sprint conversation; a workflow at ≥ 3 near-identical items; a new session only once one of four facts has *already* happened (3rd build→test→fix loop on the same card · another repo · its own deploy+verify loop with the operator · two code-writing cards concurrently). **No `Session:` field was added to the task template** — its neighbour `Tier:` is mandatory since v311.a and is filled in **0 of 85** task files under `Apps/*/docs/sprints/`. Only the sprint conversation runs `/relay` (one `## Resume here` per app, `method-core.md`).
2. **Delegation by default, as a standing order.** New **"Délégation par défaut"** section in the hub `CLAUDE.md` and in `payload/CLAUDE.md` (kept identical), under Model Routing: coordination stays in the conversation; every delegation goes out on the cheapest model that meets the bar (haiku mechanical · sonnet build/tests/ops · opus judgment/review/security); a workflow at ≥ 3 similar items; a parallel session only on an observed trigger; and **offloading context is a goal in itself** — residue-heavy exploration goes to a sub-agent that returns only its conclusion. It was being retyped by hand every session.
3. **Count drift corrected** (each verified against the filesystem): `.claude/commands/` **4 → 6** rituals (`/relay` and `/ship` were undocumented) in `METHOD.md` ×2, `docs/METHOD/README.md`, `routing-method.md` ("By Slash-Command" table), hub `CLAUDE.md`, `.claude/agents/README.md`; `.claude/agents/` **12 → 13** sub-agents in `METHOD.md` ×2; addon README **5 → 6** commands and **8 → 9** skills (`media` was missing).

## What's New in v314.a
1. **The hub stops versioning 17 copies of itself.** 2,031 mirror files under `Apps/**/docs/METHOD/`, `Apps/**/.claude/` and the seeded `PORT-MAP-TEMPLATE.md` are now **gitignored** (files stay on disk, the sync still writes them). They were the *cause* of the version drift v313.b detects: 18 places to change one rule, a 3,511-item diff per release that tripped the landing gate's `scale` exception every time, and `grep` returning 18 hits for one sentence. Verified safe first — every mirror file was payload-generated and all 18 app `settings.json` were byte-identical. **Pulling this release removes the mirrors from a checkout's disk; run `npm run sync-method:all` once per machine to repopulate.** Never author inside a mirror: the sync overwrites it and git has no copy.
2. **Doctor E8 locks the decision in.** Any `Apps/**/docs/METHOD/*` or `Apps/**/.claude/*` path that gets tracked again fails `npm run doctor`. W1 now reports stale *generated output*, not repo drift; W3 notes that `Apps/_archived/**` is out of the sync scope so its mirror can only rot.
3. **Landing gate lane patterns are depth-agnostic.** `verify-gate.mjs` anchored `docs/` and `.claude/` at the repo root, so a fleet-wide change fell through to the **app** lane and would have run a real build per nested app. Fixed in the hub and the payload together (doctor E5 keeps them identical).

## What's New in v313.b
1. **METHOD consistency is now machine-checked — `npm run doctor`.** `scripts/method-doctor.mjs` fails on: the declared version disagreeing across `METHOD.md`/`README.md`/`versioning.md`, a release with no changelog entry, a file declaring two different `**Version:**` stamps, a stamp newer than declared, **an addon payload file that no longer matches the hub copy** (how apps silently receive a stale hook), a hook wired in `.claude/settings.json` that does not exist, and a `docs/METHOD/*.md` reference that does not resolve. It warns on duplicate-but-agreeing stamps, fleet mirrors behind the hub, and app roots the v313.a landing gate cannot verify. **Sync Protocol rule 4: doctor green before you sync** — a sync multiplies any hub inconsistency by 17.
2. **One metadata block per file.** Four duplicate footer stamps removed (`ai-infra-method.md`'s had disagreed with its own header since 306.c and still named a demoted owner); `**Last Updated:**` folded into each header. The convention is written down in `versioning.md` → "Per-file version stamps" instead of being folklore.

## What's New in v313.a
1. **Land, don't ship — the operator stops managing pull requests.** Every conversation now ends on `main`, and a PR is the **exception** (the artifact of a decision only the operator can make), never the normal path. Two new machine-checked pieces, both portable via the addon: **`.claude/hooks/verify-gate.mjs`** classifies the diff into lanes — `doc` (nothing to run) · `tooling` (`node --check`) · `app` (that app's `lint`/`typecheck`/`test`/`build`) — and stamps `.method/verify-ok.json` **pinned to the HEAD sha**; **`.claude/hooks/land.mjs`** refuses to land without a green marker *at the current commit*, merges `origin/main` in (never rebases), then `git push origin HEAD:main` — so any open PR for the branch closes itself as merged and the trunk is never checked out (worktree-safe). Fails **closed**: app code in an app exposing no `typecheck`/`test`/`build` cannot land at all.
2. **The exception list, decided once instead of per PR.** schema / Firestore rules · auth, secrets, middleware · `SOUL.md` · real dependency or lockfile changes (a `scripts`-only `package.json` touch does not block) · migrations · deploy/CI wiring · >60 files or >2000 deleted lines · `[no-auto-merge]` / `[wip]` / `[hold]` / `Needs decision` in a commit · `wip` branch name · red, absent or stale verify · trunk conflict. Held back → the branch is pushed, a PR is opened or commented **once** with the exact reason, and the report carries a `### Needs decision` block. Harmless false positive → land it with **`[land-anyway]`** in the commit subject and say why.
3. **It happens without being asked.** `Stop` hook lands the **docs/tooling lane only** after every turn (zero build risk, and where the PR backlog actually came from); `SessionEnd` attempts a **full land** when the conversation ends; `/land` is the explicit close at slice end. `npm run land:sweep` reports every open PR with what blocks it, `land:sweep:apply` squash-merges the clean ones — so a backlog can't rebuild silently.
4. **Slice discipline = the token control.** One conversation = one slice = one landing. A landed slice needs no `/relay` (`main` *is* the state), and an open PR is a token liability — the work returns in a new window with the context re-derived from scratch. `/ship` is demoted to the exception path; `/land` is the default. Canonical: `method-core.md` → "Landing (the default) & the exception list" + "Slice discipline".

## What's New in v312.b
1. **Output Compression — terse where it's cheap, complete where it matters.** One boundary settles the question: compress the **conversation**, never the **artifact**. Compress freely in build/debug/ops chat, status pings and settled context; never compress committed docs (task files, `STATE.md`, `DESIGN.md`, `SCHEMA.md`, PR bodies, `/relay` blocks), user-facing EN/FR copy, Vera verdicts / Kasper findings, the 3-line header or a `### Needs decision` block. Two invariants hold everywhere: code, commands, paths, error strings and numbers verbatim; the handoff is always a doc. Third-party compression skills (Caveman & co.) are **opt-in per session, not a fleet default** — output tokens are the minority of agentic spend, such skills add ~1–1.5k input tokens per turn, so measure the delta with the Session Telemetry Ledger before adopting one. Canonical: `routing-method.md` → "Output Compression".

## What's New in v312.a
1. **Session Telemetry Ledger — the Model Routing feedback loop.** A Claude Code Stop hook (`.claude/hooks/session-telemetry.mjs`) appends one JSON row per invocation to `docs/project/telemetry/sessions.jsonl`: tokens (main-loop + delegated sub-agents/workflows, deduped per API call), message counts, duration, model(s), best-effort topic/sprint. Fails open, silent on success, append-only (dedupe by `sessionId`, keep the newest row when reading). No dollar-cost computed — raw tokens only, pricing changes too often to hardcode. Ships to every app via the addon (`install.mjs` now also merges the `Stop` hook, idempotent, preserves any custom `Stop` hook an app already has). Codex/Cursor have no automated equivalent yet — self-report manually. Canonical: `routing-method.md` → "Session Telemetry Ledger".

## What's New in v311.a
1. **Model routing by default — orchestrate high, execute cheap.** The coordinator (Junia / review gates / security) runs on the strongest model of its surface (**Fable/Opus** on Claude); every delegated task runs on the **cheapest model that meets its quality bar**. Three tool-agnostic tiers — **T1** judge/plan/review/security (opus) · **T2** build/tests/ops (sonnet) · **T3** mechanical (haiku, delegation-time override only). Junia tags every task file `Tier: T1|T2|T3` at planning and overrides the sub-agent's default `model:` frontmatter at delegation when tiers differ; one retry max per tier, then escalate; Vera/Kasper never below T1. **Environment awareness:** on non-Claude surfaces (Cursor, Codex), the coordinator first inventories the models the tool actually exposes and maps them onto the tiers — never assumes a vendor lineup. Canonical: `routing-method.md` → "Model Routing".

## What's New in v310.a
1. **`/relay` handoff ritual (alias `/handoff`)** — the **dropoff** half of context handoff, the inverse of `/brief`. Where `/brief` rehydrates a fresh conversation from git + `STATE.md` + memory, `/relay` flushes the current conversation's volatile working-state (settled decisions, dead ends, exact next action) into `STATE.md`'s new **`## Resume here`** section and emits a pasteable Relay block. Six-row schema — **But · Acquis · État · Charge · Prochaine · Pièges** (pointers, never payloads). Relay only at a clean boundary (state already in git + STATE.md + task report), never mid-thrash. Complementary rule: offload residue-heavy exploration to sub-agents (Iris / Explore) so fewer Relays are needed. Ships to every app via the addon payload. See `.claude/commands/relay.md` + `method-core.md` → "Project State & Handoff".

## What's New in v309.b
1. **Design Port Loop v2 — living `proto/` directive** — Claude Design is **bootstrap only**: it seeds `proto/` at each app's root, where the prototype **evolves in place** (design + features worked out in HTML *before* development). `/port` implements one screen per PR **from the proto**; design changes go proto-first, then a re-port PR. `docs/project/design/artifacts/{app}/` retired for new work (fallback kept). Proto rules: token/class contract mandatory; fake data confined to `proto/`, never shipped/imported; conflict gate unchanged. See `design-method.md` → "Design Port Loop" + "Proto workspace".
2. **Addon merge is now content-guarded** — `swanifly-claude-addon/install.mjs` refreshes the "Design port directive" block in app `CLAUDE.md` when the canonical snippet changes (was add-once), and tolerates symlinked `.claude/skills`.

## What's New in v309.a
1. **Runners & Orchestration layer** — Documented the native execution stack: **native sub-agents** (`.claude/agents/`, the default) → **Agent Teams** (parallel) → **Cowork** (desktop) → **Swanifly** (one runner, not *the* engine). See the new section below.
2. **Cohort 10 → 12 executable agents** — Promoted **Gordon** (Sales/Marketing) and **Kasper** (Security) to native sub-agents + Skills. **Riley** (API/automation) stays a demoted advisory hat (not executable).
3. **Native sub-agents + slash-commands** — The cohort is delegatable in Claude Code via `.claude/agents/`; rituals run as `/plan-sprint`, `/review`, `/intervention`, `/port`. `routing-method.md` now teaches the native flow, not manual role-switching.
4. **Parallel + fleet model** — Worktree isolation, fan-out on independent tasks, dependency gates, merge policy, and the multi-repo (~30-app) dimension.
5. **Gates** — the no-mock guard (`PostToolUse`), the `permissions.deny` Bash blocklist and per-agent `tools:` frontmatter are wired. DoD, Kill-Gate and `sage`'s write-path scoping are prose, not hooks.
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
> `CLAUDE.md`, `.claude/skills/`, `.claude/agents/` (13 sub-agents + README), `.claude/commands/` (6 rituals).

### Core (9) — Always synced

| File | Owner | Purpose | Size |
|---|---|---|---|
| `METHOD.md` | Lucia | This file. Entry point + routing. | ~16 KB |
| `method-core.md` | Lucia | Principles, tech stack, DoD | ~13 KB |
| `agents-method.md` | Lucia | 13 agents, roles, rituals | ~40 KB |
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
> **`.claude/agents/` (13 delegatable sub-agents + README), and `.claude/commands/`
> (`/plan-sprint`, `/review`, `/intervention`, `/port`, `/relay`, `/ship`)**. See `agents-engineering-method.md`.

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

**What is actually machine-enforced** (`.claude/settings.json` — there is no `PreToolUse` block): a `PostToolUse` no-mock guard on `Write|Edit`, two `Stop` hooks (auto-push, session telemetry), a `permissions.deny` Bash blocklist, and per-agent `tools:` frontmatter in `.claude/agents/`. Tool omission is real enforcement — `vera` has no `Write`/`Edit`. Everything else is prose: `sage`'s tests-only rule, the DoD, the Kill Gate and the E2E-green gate are honor-system, and `sage`'s tool list is identical to `brian`'s.

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

## Definition of Done

**9 items. No bloat.** One canonical list — **`method-core.md` → "Definition of Done"**, plus the task-specific gates below it. It is not restated here: five divergent copies (9 / 9 / 11 / 8 / 8) were live until 2026-08-04, so the template every task was generated from could not satisfy the gate it was judged by.

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
| 4 | Global Agent Cohort — 13 agents (Skills + native sub-agents), 3 tiers | `agents-method.md` |
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

**Current Version:** 315.a  
**Epoch:** 3 (Modular & Multi-Entry)  
**Released:** 2026-09-01

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
