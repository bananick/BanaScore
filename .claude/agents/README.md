# Cohort Sub-Agents (`.claude/agents/`)

The METHOD cohort as Claude Code **sub-agents** — delegatable, each with its own context
window and a scoped tool allow-list. This is the native execution layer of the METHOD; it
complements (doesn't replace) the Skills in `.claude/skills/`.

**11 active mandates** live in this directory — `junia` (plan) · `brian` (build) · `sage` (prove) ·
`watson` (repair) · `kasper` (guard) · `vera` (judge) · `nova` (draw) · `gordon` (commercial &
growth) · `iris` (study & deliverables) · `lucia` (METHOD release) · `penny` (token economy). **3 parked** agent files
(`teddy`, `aiko`, `april`) live under `.claude/_dormant/agents/`, outside the scanned agent root:
**not loaded, not delegable**. Bringing one back is a `git mv`, the operator's call. An agent earns
a name when its mandate is one you would otherwise have to retype.

## One definition, two surfaces (one is canonical, the other loads it)
| Surface | Where | Purpose |
|---|---|---|
| **Sub-agent** | `.claude/agents/{agent}.md` | **delegate** a task to an isolated agent (this layer) — **canonical** |
| **Skill** | `.claude/skills/{agent}/SKILL.md` | invoke a persona *in the current context* (Desktop + Code) — a stub that loads the agent file |

**`.claude/agents/*.md` is the single source of truth for persona text.** Each file carries the
agent's `## Identity` (voice · refusals · deference · handoff) and the cohort-wide
`## Non-negotiables` block. The skill is a **stub that loads the agent file**; change the agent
file, never the stub.

> **`Swanifly/web/lib/engine/agent-personas.ts` is not derived from these files.** Earlier releases
> said it was generated from them; no generator exists — it is **hand-maintained and parked** with
> the Swanifly engine (paused). Treat it as a historical runner, not a third surface to keep in sync.

## Tool scoping (the `tools:` frontmatter in this directory is the contract)
| Agent | model | tools | note |
|---|---|---|---|
| junia | opus | Read, Write, Edit, Glob, Grep | plans (plan/to-do, sprint, Cadrage draft) — no `Agent` tool: the coordinator orchestrates |
| brian | sonnet | Read, Write, Edit, Bash, Glob, Grep | build |
| sage | sonnet | Read, Write, Edit, Bash, Glob, Grep | **proof + regression tests only** (prompt-enforced) |
| watson | sonnet | Read, Write, Edit, Bash, Glob, Grep | ops/debug |
| **kasper** | opus | Read, Glob, Grep, Bash, Write, Edit | security review + harden (rules/security docs) |
| **vera** | opus | **Read, Glob, Grep, Bash** | **read-only — cannot write code**; once per slice |
| nova | sonnet | Read, Write, Edit, Bash, Glob, Grep | design code (opus by override) |
| **gordon** | sonnet | Read, Write, Edit, Glob, Grep, WebFetch, WebSearch | commercial & growth (opus by override) |
| **iris** | sonnet | Read, Glob, Grep, Bash, WebFetch, WebSearch, Write, Edit | **read-only on product code** (prompt-enforced); opus by override |
| **lucia** | opus | Read, Write, Edit, Bash, Glob, Grep | METHOD release: versioning, doctor, sync dry-run |
| **penny** | sonnet | Read, Glob, Grep, Bash, Write, Edit | token economy: telemetry reports + coaching — **read-only on code** (prompt-enforced) |

Parked files (`teddy`, `aiko`, `april`) keep their frontmatter as it was; it applies only if the
operator moves one back.

## Orchestration
**The coordinating conversation orchestrates** — not an agent. It reads, arbitrates, delegates,
folds every report into one Debrief, runs the Recette and lands. The chain it runs is defined once,
in `docs/METHOD/agents-method.md` → "Orchestration chain" (its one-line summary also sits in
`CLAUDE.md` → "Agent Cohort", the file the coordinator always has loaded). `junia` plans; she no
longer delegates or lands.

**Delegation is the default, not an option** — every executable, delegable piece of work leaves the
conversation as a sub-agent; only coordination stays. **Opening a separate session is the
exception**: one slice = one conversation = one branch = one worktree. Triggers:
`docs/METHOD/sprints-method.md` → "Sessions & branches".

The 8 rituals in `.claude/commands/`: `/land` (the default close), `/ship` (the PR exception),
`/intervention`, `/plan-sprint`, `/review`, `/brief`, and two optional ones — `/port`, `/relay`.

## Model routing (default: orchestrate high, execute cheap)
The `model` column above is each sub-agent's **default tier** — T1 judge/plan/review/security/METHOD
release on opus, T2 build/tests/ops/design/copy/study/token economy on sonnet. The orchestrator runs on the
strongest model and delegates each task on the **cheapest model that meets its quality bar**,
overriding the default per delegation when tiers differ (e.g. `brian` + `model: haiku` for pure
scaffolding = T3 mechanical; `iris` + `model: opus` for a ranked recommendation). One retry max at a
tier, then escalate one tier; `vera`/`kasper` never below T1; Workflow workers always get an explicit
`model`; a review→fix loop stops after 2 rounds (319.a, "Token economy"). Canonical policy + the cross-tool (Cursor/Codex) mapping: `docs/METHOD/routing-method.md` →
"Model Routing".

## Surfaces (one config, three surfaces)
The cohort runs from the same `.claude/` set on every Claude surface:
- **Claude Code (web / cloud)** — sub-agents + `/commands`; the default executor.
- **Cowork (desktop)** — the **local Code tab** runs the same sub-agents + commands on your local checkout, with "Ask before acting" supervision.
- **Claude Desktop** — invoked as **Skills** (`.claude/skills/`) for plan / design / commercial / study / review.

Rule of thumb: build / prove / ops / security / METHOD release → Code (web or Cowork-local); plan / design / commercial / review → lean Desktop. Same persona + tool scope everywhere.

## Known deltas (design these, don't assume them)
- **Routing is deterministic only if you make it so.** Native delegation can auto-pick by
  `description`; for strict METHOD order, invoke named sub-agents explicitly.
- **Hooks exist — but none of them is a write-path gate.** `.claude/hooks/` holds five, four of them
  wired in `.claude/settings.json`:
  | Hook | Event | What it actually does |
  |---|---|---|
  | `no-mock-guard.ps1` | PostToolUse(`Write`\|`Edit`) | Scans the file just written for mock/fixture signals (`mockData`, `faker`, `seedData`…), skipping tests/docs/build dirs; on a hit, exits 2 so the warning is fed back to Claude to remove them. Fires **after** the write and fails open. |
  | `ship-push.sh` | Stop | Pushes commits the agent already made, on feature branches only — never `main`/`master`, never commits, never force-pushes. |
  | `session-telemetry.mjs` | Stop | Appends one cumulative JSONL row per turn to the repo's local telemetry ledger (tokens, message counts, duration, models, sprint — no prompt text). Hooks no longer commit the ledger (318.a); the file becomes untracked in a follow-up once every checkout runs the 318.a hooks. `npm run telemetry:report` aggregates it. |
  | `land.mjs` | Stop (`--auto --lane docs`) + SessionEnd (`--auto`) | The landing ritual as code: lands the slice on the trunk unattended. Refuses unless `verify-gate` has stamped `.method/verify-ok.json` **pinned to the current HEAD sha**, so a stale green cannot wave work through. |
  | `verify-gate.mjs` | not a hook — run by `land.mjs`, `npm run verify`, `/land` | The only brake before the trunk. Classifies the diff into `doc` / `tooling` / `app` lanes, runs what can actually run, requires that at least one verifying check executed, and (318.a) refuses a newly added intervention or task file without `Journey:` + `Proof:`. Exit `0` green · `1` red · `2` blocked; stamps the marker on green. |
  The command blocklist lives in `settings.json` `permissions.deny` (`rm`, `git push --force`,
  `git reset --hard`, `git rebase`, `sudo`), not in a hook.
- **The gate is local, by design — there is no CI to wait on.** GitHub Actions is billing-blocked
  account-wide on this account, by choice; no workflow file exists or should be created. `verify-gate`
  runs on the machine before the merge. A landed slice is **LANDED** — `DEPLOYED` and `PROVEN` need
  their own evidence (a served revision, an observed run); `land.mjs` deploys nothing.
- **Still missing: PreToolUse write-path enforcement.** `sage` (test paths only), `iris`
  (`docs/analysis/` + the named deliverable path only) and `penny` (`docs/project/telemetry/REPORT-*.md`
  + her intervention files only) are **prompt-enforced** — their frontmatter
  grants `Write, Edit` with no mechanical restriction on where those land. `vera` holds no write tool
  at all, so the orchestrator persists her review. A PreToolUse(`Write`\|`Edit`) path hook would
  close all four.
- **Human gate** is the session's permission prompts + the conflict-gate line in every agent's
  `## Non-negotiables` block — not an explicit per-step pause.
