# Cohort Sub-Agents (`.claude/agents/`)

The METHOD cohort as Claude Code **sub-agents** — delegatable, each with its own context
window and a scoped tool allow-list. **This directory is the whole cohort**: since 327.a there is no
second surface. `.claude/skills/` holds *capabilities* only.

**19 active mandates** live in this directory — `junia` (plan) · `brian` (build) · `sage` (prove) ·
`watson` (repair) · `kasper` (guard) · `vera` (judge) · `maya` (UX research & IA) · `nova` (design
system) · `alba` (brand & visual assets) · `gordon` (commercial & growth) · `iris` (study &
deliverables) · `hugo` (METHOD tooling) · `lucia` (METHOD release) · `penny` (token economy) ·
`oscar` (coach) · `regine` (régie — sessions, worktrees, work in progress) · `lise` (tone & voice) · `stella` (organic visibility — SEO, GEO/AEO, social,
directories; added in 333.a) · `agathe` (recruit & train — hire, exam, learning loop, scorecard; added in 339.a, on probation).
**3 parked** agent files (`teddy`, `aiko`, `april`) live under `.claude/_dormant/agents/`, outside the
scanned agent root: **not loaded, not delegable**. Bringing one back is a `git mv`, the operator's
call. An agent earns a name when its mandate is one you would otherwise have to retype.

**327.a — one owner per job.** The 2026-10-18 cohort audit found Nova carrying **25 assignments**,
**ten pairs** of mandates colliding and **ten categories** of real work with no owner. Three mandates
were cut out of the overload and the gaps (`maya`, `alba`, `hugo`), the ten collisions were each given
a single owner, and the **14 persona skill stubs were deleted** — which freed 4,984 characters against
the recruits' 870, so the always-loaded description surface fell **14,033 → 10,171 characters
(−27.5 %)** while the cohort grew from 14 mandates to 17. Evidence and every resolution:
`docs/interventions/2026-10-19-Lucia-cohort-restructure.md`.

## One definition, one surface (327.a)
`.claude/agents/{agent}.md` **is** the agent: its `## Identity` (voice · refusals · deference ·
handoff), its mandate, its `Entry files:` line and the cohort-wide `## Non-negotiables` block.
Delegate to it by name; the `Agent` tool reads this directory. Since **336.b** the `## Identity`
also carries **Character · I teach · My wink** — rule: `agents-method.md` → "How agents run".

**The persona stubs under `.claude/skills/{agent}/` are gone.** They loaded the same description a
second time in every session (14 agents × 2) and **2 of ~140 delegations** ever used that path. A new
agent gets **no stub** — there is nothing to keep in sync (`.claude/skills/README.md`).

> **`Swanifly/_archive/web/lib/engine/agent-personas.ts` is not derived from these files.** Earlier
> releases said it was generated from them; no generator exists — it is **hand-maintained and
> parked** with the Swanifly engine (the whole app moved under `Swanifly/_archive/` on 2026-10-18).
> Treat it as a historical runner, not a third surface to keep in sync.

## Tool scoping (the `tools:` frontmatter in this directory is the contract)
| Agent | model | tools | note |
|---|---|---|---|
| junia | opus | Read, Write, Edit, Glob, Grep | plans (plan/to-do, sprint, Cadrage draft) — no `Agent` tool: the coordinator orchestrates |
| brian | sonnet | Read, Write, Edit, Bash, Glob, Grep | build |
| sage | sonnet | Read, Write, Edit, Bash, Glob, Grep | **proof + regression tests only** (prompt-enforced) |
| watson | sonnet | Read, Write, Edit, Bash, Glob, Grep | ops/debug |
| **kasper** | opus | Read, Glob, Grep, Bash, Write, Edit | security review + harden (rules/security docs) |
| **vera** | opus | **Read, Glob, Grep, Bash** | **read-only — cannot write code**; once per slice |
| **maya** | opus | Read, Write, Edit, Glob, Grep | UX research & IA: discovery, taxonomy, shell, layout patterns, port order — **specs only, no component code**; holds no Bash, so she never commits |
| nova | sonnet | Read, Write, Edit, Bash, Glob, Grep | design system: tokens, theme, motion, a11y, `proto/` — **not component code** since 327.a (opus by override) |
| **alba** | sonnet | Read, Write, Edit, Bash, Glob, Grep | brand & visual assets: logo usage, icon system, `/media`, exports — the identity itself is the operator's |
| **gordon** | sonnet | Read, Write, Edit, Glob, Grep, WebFetch, WebSearch | commercial & growth: offer, funnel, copy, paid ads (opus by override) |
| **stella** | sonnet | Read, Write, Edit, Glob, Grep, WebFetch, WebSearch | organic visibility: SEO, GEO/AEO, social search, forums, directories, blog — **writes only under `docs/growth/`; drafts only, nothing published or submitted without the operator's GO per batch** (opus by override) |
| **iris** | sonnet | Read, Glob, Grep, Bash, WebFetch, WebSearch, Write, Edit | **read-only on product code** (prompt-enforced); opus by override |
| **hugo** | sonnet | Read, Write, Edit, Bash, Glob, Grep | METHOD tooling: hooks, `verify-gate`, `land`, sync engine, installer, doctor, telemetry scripts — **opus for gate semantics** |
| **lucia** | opus | Read, Write, Edit, Bash, Glob, Grep | METHOD release: versioning, doctor, sync dry-run, **and the operating model itself** |
| **penny** | sonnet | Read, Glob, Grep, Bash, Write, Edit | token economy: telemetry reports + coaching — **read-only on code** (prompt-enforced) |
| **oscar** | opus | Read, Glob, Grep, Bash, Write, Edit | coach: the weekly retro only — **read-only on code** (prompt-enforced); weekly, never per Debrief |
| **regine** | sonnet | Read, Glob, Grep, Bash, Write, Edit | régie: sidebar pass, idle clocks, rescue before archive — **archives, never deletes work** (integrated branches: branch-sweep only); never edits or lands product code (prompt-enforced) |
| **lise** | opus | Read, Glob, Grep, Write, Edit | tone & voice: reviews public-facing text against the repo's voice files, runs the tone loop — **writes only under `docs/project/brand/tone/`** (prompt-enforced); never edits the text she reviews |
| **agathe** | opus | Read, Write, Edit, Bash, Glob, Grep | recruit & train: hire, entrance exam, learning loop, scorecard — **writes only in the repo she runs in, never a hub cohort file** (prompt-enforced); `Bash` read-only, commit excepted; no `Agent` tool: the coordinator runs the owner during an exam |

Parked files (`teddy`, `aiko`, `april`) keep their frontmatter as it was; it applies only if the
operator moves one back.

## Orchestration
**The coordinating conversation orchestrates** — not an agent. It reads, arbitrates, delegates,
folds every report into one Debrief, runs the Recette and lands. The chain it runs is defined once,
in `docs/METHOD/agents-method.md` → "Orchestration chain" (its one-line summary also sits in
`CLAUDE.md` → "Agent Cohort", the file the coordinator always has loaded). `junia` plans; she no
longer delegates or lands.

**Delegate on the four-condition test** (325.c) — send work out when it is
**verbose-and-discardable**, **self-contained**, **summarisable**, or **needs a tool restriction**;
stay inline for back-and-forth, shared multi-phase context and small targeted edits (a spawn costs
60–75 k tokens before it reads anything). **Opening a separate session is the exception**: one slice =
one conversation = one branch = one worktree. Triggers: `docs/METHOD/sprints-method.md` →
"Sessions & branches".

The 13 rituals in `.claude/commands/`: `/land` (the default close), `/ship` (the PR exception),
`/intervention`, `/plan-sprint`, `/review`, `/brief`, `/retro` (weekly), `/hire` (Agathe: an owner for a
domain), `/clean` (Régine on demand),
`/project` (open a chantier), `/projects` (the fleet board, hub only), and two optional ones —
`/port`, `/relay`.

## Model routing (default: orchestrate high, execute cheap)
The `model` column above is each sub-agent's **default tier** — T1 judge/plan/review/security/METHOD
release/UX architecture/hiring on opus, T2 build/tests/ops/design/brand/tooling/copy/study/token
economy/régie on sonnet. The orchestrator runs on the
strongest model and delegates each task on the **cheapest model that meets its quality bar**,
overriding the default per delegation when tiers differ (e.g. `brian` + `model: haiku` for pure
scaffolding = T3 mechanical; `iris` + `model: opus` for a ranked recommendation). One retry max at a
tier, then escalate one tier; `vera`/`kasper` never below T1; Workflow workers always get an explicit
`model`; a review→fix loop stops after 2 rounds (319.a, "Token economy"). Canonical policy + the cross-tool (Cursor/Codex) mapping: `docs/METHOD/routing-method.md` →
"Model Routing".

## Surfaces (one config, every surface)
The cohort runs from the same `.claude/` set everywhere — Claude Code (web / cloud), the desktop
app's local Code tab, Claude Desktop. **Same agent file, same tool scope, no per-surface copy**: the
Desktop-only Skill stubs were deleted in 327.a. The capability skills in `.claude/skills/` are
callable on every surface too.

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
  (`docs/analysis/` + the named deliverable path only) , `penny` (`docs/project/telemetry/REPORT-*.md`
  + her intervention files only) and `oscar` (`docs/project/coaching/RETRO-*.md` only) are **prompt-enforced** — their frontmatter
  grants `Write, Edit` with no mechanical restriction on where those land. `vera` holds no write tool
  at all, so the orchestrator persists her review. A PreToolUse(`Write`\|`Edit`) path hook would
  close all five.
- **Human gate** is the session's permission prompts + the conflict-gate line in every agent's
  `## Non-negotiables` block — not an explicit per-step pause.
