# Agents Engineering & AI Agent Team Architecture

**Owner:** Lucia (method-level) + Developers
**Version:** 310.a
**Purpose:** Define the agent team architecture on the **Claude suite** — the native sub-agent layer, runners & orchestration, parallel + fleet execution, hard gates via hooks, agent-to-Skill mapping, the Desktop/Code division of labour, Artifacts-based design, and context management protocols.

---

## 1. The Agents Engineering Philosophy

An "Agents Engineer" shifts the developer's role from writing line-by-line syntax to **orchestrating AI agent teams**. AI agents handle the syntax.

### Core Tenets:
1.  **Manage, Don't Prompt:** Treat agents (Claude Skills) as team members. Provide goals (`DESIGN.md`, a task file) and constraints, then let the agent execute. Do not specify *how* to write the code.
2.  **Iterative Workflow:** Build feature by feature. Do not give a giant prompt for a full-stack vertical slice. Execute one sprint task at a time.
3.  **Aggressive Checkpointing:** Commit to version control *before* initiating any complex agent task. Cascading failures happen. Your primary defense is a clean Git history. `git reset --hard` is faster than arguing with an agent. (Parallel fan-out makes this stronger: each fanned-out task runs in its **own git worktree** — see §5.2 — so a bad run is discarded by deleting the worktree, never `reset`-ing shared state.)
4.  **Ruthless Validation:** AI-generated code is guilty until proven innocent. Run the verification gate after every generation.

---

## 2. The Claude Suite

The METHOD runs on three Claude surfaces. Each has a distinct sweet spot:

```
┌──────────────────────────────────────────────────────────────────────┐
│                            YOU (Pilot)                                 │
│        Accept/reject plans, review outputs, final approval             │
└───┬──────────────────────────┬───────────────────────────┬────────────┘
    │                          │                           │
┌───▼──────────────────┐  ┌────▼─────────────────────┐  ┌──▼──────────────────────┐
│  CLAUDE DESKTOP       │  │   CLAUDE CODE            │  │  CLAUDE DESIGN           │
│  (Primary cockpit)    │  │   (Autonomous executor)  │  │  (Artifacts)             │
│                       │  │                          │  │                          │
│ • Talk to agents      │  │ • Sub-agents             │  │ • Interactive HTML/React │
│   (Skills, by name)   │  │   (.claude/agents) —     │  │   prototypes as          │
│ • App context via     │  │   delegate, scoped tools │  │   Artifacts              │
│   Projects + custom   │  │ • Junia orchestrates via │  │ • Generated from the     │
│   instructions        │  │   the Agent tool         │  │   spec book + M3 tokens  │
│ • Connectors (MCP):   │  │ • Slash commands         │  │ • Live, click-through    │
│   GitHub, filesystem  │  │   (.claude/commands)     │  │   navigation             │
│ • Generate Artifacts  │  │ • Hooks (hard gates),    │  │ • Replaces proto-kit +   │
│ • Per-chat model pick │  │   CLAUDE.md auto-load    │  │   hand-made prototypes   │
│ • Plan / review /     │  │ • Web + Cowork local     │  │                          │
│   design / scope      │  │   Code tab; runners ↓    │  │                          │
└───────────────────────┘  └──────────────────────────┘  └──────────────────────────┘
```

- **Claude Desktop = cockpit.** Where you think, plan, review, design, and talk to the agent cohort (as Skills). Holds app context, connectors, and model selection.
- **Claude Code = autopilot.** Autonomous, multi-file, runs commands and verifies results. Runs **natively as delegatable sub-agents** (`.claude/agents/`, each with scoped tools) in Claude Code on the web **and** the local **Code tab in Cowork**. **Junia** orchestrates them via the `Agent` tool.
- **Claude Design (Artifacts) = the prototype surface.** Generates interactive prototypes in Desktop from the spec, replacing the old proto-kit live tuner.

> **Runners (one cohort, several drivers).** The same cohort can be driven by: native sub-agents (default), **Agent Teams** (parallel fan-out), **Cowork** (the local Code tab + agent UI), or **Swanifly** (the home-grown engine that spawns the `claude` CLI per persona — `Swanifly/web/lib/engine/`). Swanifly is **one runner, not THE engine**.

---

## 3. Claude Desktop vs Claude Code — Decision Tree

**Use Claude Desktop when:**
- You're planning a sprint or closing one (Junia)
- You're scoping / defining a CUJ (April)
- You're reviewing work (Vera) and want a deliberate high-model pass
- You're designing UI and want to generate or iterate an **Artifact** prototype (Nova)
- You need a connector (GitHub, filesystem, web) in an interactive conversation
- The task requires reading and reasoning across many METHOD/project docs first
- You're making a decision, not yet writing files

**Use Claude Code when:**
- You're executing one or more sprint tasks (Brian, Teddy, Sage, Watson, Kasper) — multi-file edits across the codebase
- You want parallel task execution (delegated sub-agents, one git worktree each — see §5.2)
- You need to run commands + verify results + iterate autonomously (typecheck, tests, build)
- You want the full sprint loop run for you — by Junia delegating sub-agents, or **through a runner** (Agent Teams / Cowork / Swanifly) that drives Claude Code per task and opens a PR
- You're debugging a complex issue across many files
- You want autonomous execution while you do other things

**Rule of thumb:**
- **Claude Desktop = the bridge** (you decide, plan, review, design — agent-assisted)
- **Claude Code = the engine room** (autonomous, multi-file, command-running)

**Cross-surface tip:** Decisions made in Desktop (sprint plan, design Artifact, scope) become the **task files** and **`DESIGN.md`** that Claude Code (or Swanifly) then executes. The handoff is always a doc, never a chat transcript.

---

## 4. Agent → Skill Mapping

Every METHOD agent is a **Claude Skill** — a folder with a `SKILL.md` that Claude auto-invokes by name. Skills are **version-controlled in the repo** (`.claude/skills/{agent}/`), so they travel with the project and work identically in Claude Desktop and Claude Code.

> **Source of truth:** The canonical persona text lives in `Swanifly/web/lib/engine/agent-personas.ts` (the prompts Swanifly feeds to Claude Code). Skill `SKILL.md` files mirror those personas so a human in Desktop and the Swanifly engine invoke the *same* agent.

| Agent | Skill | Primary surface | Model default | Commits? |
|:--|:--|:--|:--|:--|
| **Junia** | `junia` | Desktop (planning) | Opus | yes (plans) |
| **April** | `april` | Desktop (scope/CUJ) | Opus | yes (docs) |
| **Brian** | `brian` | Claude Code (build) | Sonnet → Opus for hard logic | yes |
| **Teddy** | `teddy` | Claude Code (mobile build) | Sonnet | yes |
| **Nova** | `nova` | Desktop (design + Artifacts) | Opus | yes (CSS/JSX) |
| **Vera** | `vera` | Desktop (review) | Opus | **no** (review only) |
| **Sage** | `sage` | Claude Code (tests) | Sonnet | yes (tests only) |
| **Watson** | `watson` | Claude Code (ops/debug) | Opus | yes |
| **Aiko** | `aiko` | Desktop + Code (AI infra) | Opus | yes |
| **Lucia** | `lucia` | Desktop (METHOD only) | Opus | yes (docs) |

**Notes:**
- **Model default ≠ lock.** Pick the model per chat in Desktop, or per run in Claude Code. Opus for deep reasoning/review/architecture, Sonnet for build/iteration, Haiku for cheap/fast (planning scaffolds, trivial edits).
- **Vera never commits** (`expectsCommits: false` in the engine). A build agent that produces **zero commits** is treated as a **failed task** by Swanifly — review agents are the exception.
- **The 3 advisory hats** (Gordon — growth, Riley — API/multi-agent, Kasper — security) are *not* executable Skills today; the Swanifly engine cannot spawn them. Wear them as a framing inside a Desktop chat with the relevant METHOD file loaded, or promote them to Skills when the engine grows personas. See `agents-method.md`.

---

## 5. Claude Code Subagents (Parallel Execution)

Claude Code can spawn **subagents** via the Task tool, giving each a fresh context. This is how the METHOD runs independent tasks in parallel without context rot.

### When to use subagents
- Multiple independent tasks can run in parallel (e.g., `015-a` and `015-b` with no dependency)
- A task needs deep research while you continue other work
- You want to isolate a risky operation
- You want to run the sprint loop with minimal intervention

### Brian subagent pattern
```
Spawn a subagent with the `brian` skill:
  "You are Brian, Web Development agent.
   Load: method-core.md → DESIGN.md → task file.
   Execute the task following DoD. Commit per task. Report when done."
```

### Sage subagent pattern
```
Spawn a subagent with the `sage` skill:
  "You are Sage, Test Architect.
   Load: tests-method.md → task file.
   Write tests from acceptance criteria.
   Never modify production source — test files only."
```

### Parallel sprint execution (within one sprint)
```
Task tool, in parallel:
  - brian  → 015-a (settings UI)
  - brian  → 015-b (FCM setup)    # independent of 015-a
then chained:
  - sage   → 015-c (test settings) # depends on 015-a → runs after
```

> **Swanifly does this for you.** The engine's `sprint-executor.ts` reads the sprint folder, runs `⬜`/`⚠️` tasks in `-seq` order, handles multi-owner tasks (`Brian+Nova`) as a sequential sub-loop handing each owner the prior owner's diff, then commits the status rename and pushes a PR. Running a sprint by hand in Claude Code mirrors that loop.

---

## 6. The Sprint Execution Loop

```
1. PLAN     │ Junia (Desktop)            │ Sprint plan → task files created
2. SCOPE    │ April (Desktop)            │ CUJ Precision Gate if scope unclear
3. DESIGN   │ Nova (Desktop + Artifacts) │ Prototype the view as an Artifact (if new UI)
4. EXECUTE  │ Brian (Claude Code)        │ Subagents per independent task; commit per task
5. TEST     │ Sage (Claude Code)         │ Chain after Brian completes
6. VERIFY   │ Watson (Claude Code)       │ Smoke test + screenshot capture
7. REVIEW   │ Vera (Desktop)             │ Review Gate → PASS or FAIL
8. CLOSE    │ Junia (Desktop)            │ Consolidate, commit, push
```

**Automated path:** Steps 4–6 (and the commit/push/PR) run end-to-end through **Swanifly**, which drives Claude Code per task. Steps 1–3 and 7–8 are human-in-the-loop in Desktop.

---

## 7. Claude Desktop Settings (METHOD-aware)

The METHOD assumes a specific Desktop configuration. Set this up once per machine, and once per app.

### 7.1 Projects (one per app)
- Create a **Project** per app (BanaShare, Swanifly, …).
- **Project custom instructions** = paste the app's root `CLAUDE.md` (tech stack, code rules, design language, data rules). This is the per-Project equivalent of Claude Code's auto-loaded `CLAUDE.md`.
- **Project knowledge** = add the small, stable docs the agents always need: `project/STATE.md`, `project/DESIGN.md` (if it exists), `project/SCHEMA.md` (if it exists). Do **not** dump the whole repo — keep it surgical (see Context Hygiene).

### 7.2 Skills (the agent cohort)
- Install the agent Skills from `.claude/skills/` so Claude can invoke **Brian, Vera, Junia, Nova, April, Sage, Watson, Aiko, Teddy, Lucia** by name.
- Enable the relevant Skills per Project. A web app project rarely needs Teddy; a METHOD-curation project mostly needs Lucia.

### 7.3 Connectors (MCP)
- **GitHub connector** — for reading PRs/issues and pushing changes from Desktop.
- **Filesystem connector** — for working against a local checkout when not using Claude Code.
- Document any app-specific connectors the agents rely on in the app's `CLAUDE.md` under a **Connectors** section.

### 7.4 Personal preferences / custom instructions (global)
- The cross-cutting working agreements (status-before-tools, concise messaging, conventional commits, `.env` policy, EN/FR i18n) live in **`claude-rules.md`** and should be reflected in your global Desktop custom instructions. See `claude-rules.md`.

### 7.5 Model selection
- Default **Opus** for planning, review, architecture, and design reasoning.
- Switch to **Sonnet** for build/iteration, **Haiku** for cheap/fast scaffolding.
- In Claude Code, pass `--model` (Swanifly threads a `model` option through to the runner).

### 7.6 Memory & Artifacts
- Use **Artifacts** for prototypes and any generated doc/diagram you'll iterate on (see §8).
- Treat Desktop **memory** as convenience, not truth — the repo is truth. Never let a decision live only in memory; write it to a doc.
- **Relay ≠ memory.** `/relay` writes volatile per-workstream *resume* state to `STATE.md`'s `## Resume here`; memory holds durable cross-session *facts* about the user/project. Don't collapse one into the other.

---

## 8. Claude Design — Artifacts Prototyping

The PROTOTYPE phase of the Definition Pipeline now runs on **Claude Artifacts**, not the home-made proto-kit tuner.

**How it works:**
1. In Desktop, with the Project loaded, ask **Nova** to generate the view as an Artifact from the spec chapter + the M3 token set.
2. The Artifact is **interactive** — click-through navigation, realistic data (not lorem ipsum), M3 design applied.
3. Iterate live in the conversation ("make the cards 16px radius", "show the empty state") — Claude regenerates the Artifact.
4. When approved, the Artifact's markup/tokens become the reference Brian implements against in BUILD.

**What this replaces:**
- `proto-kit/` live Design Tuner → Artifact iteration in Desktop
- Hand-authored static HTML prototypes → generated React/HTML Artifacts

**What carries over:** the M3 token vocabulary and the design constraints in `design-method.md` are the *input* to the Artifact. Artifacts change the tool, not the design standard.

**Gate (unchanged):** Human validates the prototype before BUILD starts. See `definition-method.md`.

---

## 9. Context Hygiene & Avoiding Rot

Long threads lose context ("context rot"). Maintain strict hygiene:

1.  **One thread per task.** Start a new Desktop chat / Claude Code session for each sprint task.
2.  **Explicit context loading.** Reference METHOD/project docs in your prompt. In Claude Code, rely on `CLAUDE.md` auto-load for conventions; reference task-specific docs explicitly. In Desktop, lean on Project knowledge + the Skill.
3.  **Wipe and restart.** If an agent spins for more than ~3 turns, **stop**. Revert to the last checkpoint, start a fresh chat, provide only essential state + error logs.
4.  **Subagent isolation.** Claude Code subagents start clean by design — this naturally prevents rot for parallel tasks.
5.  **Max 3 METHOD files per chat.** Be surgical; use the routing tables in `METHOD.md`.

---

## 10. Cost & Model Selection

1.  **Right model for the job.** Opus for deep reasoning/review/architecture; Sonnet for build; Haiku for cheap/fast.
2.  **Subagents inherit the run's model** unless overridden — for cost-sensitive fan-out, run lighter models.
3.  **Prompt caching.** Stable system context (METHOD docs, `CLAUDE.md`, Skill prompts loaded early) benefits from prompt caching — keep the stable preamble stable.
4.  **Budget awareness.** Swanifly threads model choice per run; prefer Sonnet for routine sprint execution and reserve Opus for review/architecture passes.

---

## 11. Configuration Files

| File | Purpose | Loaded by |
|:--|:--|:--|
| `CLAUDE.md` (repo root) | Canonical project context (stack, rules, design, data) | Claude Code (auto) · Desktop Project (as custom instructions) |
| `AGENTS.md` (repo root) | Cross-tool mirror of `CLAUDE.md` for non-Claude agents | Other agents/tools |
| `.claude/skills/{agent}/SKILL.md` | Agent personas (Brian, Vera, …) | Claude Desktop + Claude Code |
| `.claude/commands/*.md` | Sprint rituals as slash commands | Claude Code |
| `.claude/settings.json` | Hooks, permissions, env for Claude Code | Claude Code |
| Task files (`docs/sprints/`) | Per-task context + acceptance criteria | Agent (loaded in prompt) |

**Deprecated as of v308.a (no longer maintained):**
- `GEMINI.md` — Antigravity instruction file. Replaced by `CLAUDE.md`. Kept as a redirect stub.
- `.cursor/rules/` — Cursor config. No longer loaded; see `claude-rules.md`.
- `docs/METHOD/tools/banabooster/` and `docs/METHOD/tools/swanifly-antigravity-addon/` — Antigravity IDE patchers. **Removed in v308.a.**
- `docs/METHOD/proto-kit/` — superseded by Artifacts (§8). **Removed in v308.a.**
- `.clinerules`, `kanban-templates/` — removed in spirit since v307; fully retired here.

---

## 12. Migration from the Antigravity + Cursor Setup (v307 → v308)

1. **Stop launching Antigravity workflows.** Plan/review/scope/design in **Claude Desktop**; build in **Claude Code** (directly or via Swanifly).
2. **Install the agent Skills** (`.claude/skills/`) and enable them per Desktop Project.
3. **Create a Desktop Project per app**; paste the app's `CLAUDE.md` as custom instructions; add `STATE.md`/`DESIGN.md`/`SCHEMA.md` to Project knowledge.
4. **Add `CLAUDE.md`** at each app root (canonical context); keep `AGENTS.md` as the cross-tool mirror; let `GEMINI.md` stand only as a redirect stub.
5. **Move prototyping to Artifacts** (§8); retire `proto-kit/`.
6. **Connect MCP connectors** (GitHub, filesystem) in Desktop.
7. **For autonomous sprints, use Swanifly** — it already runs Claude Code per persona and opens a PR.

---
**Last Updated:** 2026-06-01
**Status:** ✅ Production-Ready (Claude Desktop + Claude Code + Artifacts)
