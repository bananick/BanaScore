# {App name} — Claude Code Instructions

> Loaded automatically by Claude Code on every conversation in this repo.
> Shared identity, voice & non-negotiables: see `SOUL.md` — the **only** file imported below.
> `AGENTS.md` is the cross-tool mirror for non-Claude agents (Cursor, Codex, Cline, Antigravity):
> it derives from this file and is **not imported** into Claude's context, so a rule that lives
> only there does not reach Claude.
> **Ownership (METHOD v318.a):** five sections below — Agent Cohort, Model Routing, Landing &
> conversation size, Communication Contract, Design port directive — are **synced from the METHOD
> hub** and rewritten by every sync (unless `docs/METHOD/app-settings.json` →
> `claudeAddon.ownedSections` claims one). Everything else in this file belongs to the app.

@SOUL.md

## How Claude works in this repo

You operate inside the **METHOD** (v318.a, `docs/METHOD/`). Honour `SOUL.md` non-negotiables — above all **never use mock data**; wire everything to the app's live source of truth or render an explicit empty/error state. **Detect this app's actual stack before building** — the METHOD's declared stack is a target baseline, not a description of this repo.

## Agent Cohort

`.claude/agents/{agent}.md` is each agent's **canonical definition** — mandate, default model, its
`Entry files:` line (what to read, by `§`, under a byte cap). Edit it; it has no copy.

| Agent | Mandate |
|:--|:--|
| `junia` | Plan |
| `brian` | Build |
| `sage` | Prove |
| `watson` | Repair |
| `kasper` | Guard |
| `vera` | Judge |
| `maya` | UX research & information architecture |
| `nova` | Draw — design system, tokens, motion, a11y |
| `alba` | Brand & visual assets (logo, icons, `/media`) |
| `gordon` | Commercial & growth |
| `iris` | Study & deliverables |
| `hugo` | METHOD tooling (hooks, gate, `land`, sync, doctor) |
| `lucia` | METHOD release + the operating model |
| `penny` | Token economy |
| `oscar` | Coach (`/retro`) |
| `regine` | Régie — sessions & worktrees |
| `lise` | Tone & voice (`tone-method.md`) |
| `stella` | Organic visibility (SEO · GEO) |
| `agathe` | Recruit & train (`/hire`) |

**One owner per job** (327.a): a collision or a gap goes to `agents-method.md` → "§ Agent Roster", never to a second claimant. **Dormant, not delegable:** April, Aiko, Teddy. **The coordinating
conversation orchestrates; it is not an agent.** Per task `brian` → `watson` (only if the gate goes
red) → `kasper` (only when rules / auth / API routes are touched); once per slice, at the Recette,
`vera` → `/land` → `sage`. Chain, domain owners: `agents-method.md` →
"§ Orchestration chain", "§ Domain owners".

**Tone → `lise`.** Any question of voice, *tu* / *vous* or *ton* goes to her; where
`docs/project/brand/tone/` exists, so does every text a customer, prospect or the public will read
(copy, UI strings, mail, post, deck, flyer) before it lands — `gordon` writes, `lise` reads.

## Context-loading rules

1. Load your agent's entry files — **not** the entire `docs/METHOD/`.
2. Load the task or intervention file you are executing.
3. Always load `docs/project/STATE.md` (current state + blockers) and, if it exists, `docs/project/FOCUS.md` — the line every task must serve.
4. **Max 3 METHOD files per conversation** — be surgical.
5. Prefer `method-core-lite.md` (~500 tok) over `method-core.md` (~4.2k) for routine work.
6. Load `project/DESIGN.md` (or `docs/project/DESIGN-GUIDELINES.md`) for UI work; `project/SCHEMA.md` for data work.
7. Skip gracefully if a referenced file doesn't exist.

## Hierarchy of truth

```
METHOD > VISION > PLAN > FOCUS > TASK > CODE
```
When in doubt, the higher-level document wins.

## How agents operate (the loop)

Every task, in order:
1. **Orient** — load your entry files + `docs/project/STATE.md`; read the task and `docs/project/DESIGN.md`. Max 3 METHOD files; prefer `method-core-lite.md`.
2. **Frame = 🎯 Cadrage** — one `AskUserQuestion` (≤ 4 questions, recommended answer first) fixing **Journey** (the CUJ this work closes) / **Proof** (the observed run, environment and real data that prove it done) / **out-of-scope**; write them as `**Journey:**` · `**Proof:**` into the task/intervention file **before the first edit** — `/land` refuses a newly added one without them. Skipped for a question, a lookup, a one-line fix. Ambiguous or conflicting with a higher doc → **stop and ask**. Canonical: `docs/METHOD/method-core.md` → "The two-moment contract — Cadrage · Recette".
3. **Build** — the smallest vertical slice; one concern per change. The middle is **autonomous** — no "shall I continue?"; only the conflict gate (data model, permissions, scope, irreversible) stops for a `### Needs decision`.
4. **Prove** — smoke test + critical-path tests, typecheck, lint. State verify status **honestly** (including "couldn't build").
5. **Land = ✅ Recette first** — a recette table (each deliverable fixed at Cadrage → shown with a link/proof, or not), `vera`'s one review of the slice (opus), and the four states **`CODED` · `LANDED` · `DEPLOYED` · `PROVEN`**, never merged: a push is `LANDED`, never reported as deployed or proven without its own evidence (served revision · `sage`'s observed run). Claiming `PROVEN` → one `AskUserQuestion`: accept / reopen / defer, with a ≤ 3-minute test script the operator can run. Then the Definition of Done, `git commit -m "type(scope): msg"`, **`/land`**.

**The CUJ is the unit.** Every conversation / sprint / task names the journey(s) it closes (`docs/project/journeys/{cuj}.md`); `Avancement` counts journeys proven, not tasks closed.

## Work modes

- **Nominal — one demand, one slice:** an **intervention** (`/intervention`, logged in `docs/interventions/YYYY-MM-DD-{Agent}-{topic}.md`) or a **plan** executed to the end (`implement-plan`), then the Recette and `/land`.
- **Exceptional — sprint mode:** only for genuinely multi-task, pre-planned work (`/plan-sprint`). Folder `docs/sprints/{NNN} {status} {name}/`, task file `{sprint}-{seq} {status} {Agent} - {title}.md`, status emoji `⬜` Todo · `✅` Done · `☑️` Validated · `⚠️` Problem.
- Commit after every task with explicit paths, then **land it** (`npm run land`). Don't leave finished work on a branch. No conversation-title convention.

## Definition of Done

One canonical list, 9 items: **`docs/METHOD/method-core.md` → "Definition of Done"**, plus the task-specific gates below it. Load it when you close a task; do not maintain a second copy here. One item is machine-checked (`Journey:` + `Proof:` on a new intervention/task file, at `/land`); the rest is honour-system.

## Skills & rituals

| Skill / ritual | Use it for |
|:--|:--|
| `/land` | **Close the conversation on the trunk** — commit, verify, fast-forward (LANDED) |
| `/ship` | Exception path only: open a PR because the operator must decide |
| `/intervention` | A targeted slice: Cadrage → build → Recette → land |
| `/implement-plan` | Execute a plan / sprint task to completion |
| `/plan-sprint` · `/review` · `/brief` | Sprint planning (exception) · the slice's one Vera review · pickup |
| `/deploy` | Build + deploy + record the served revision (DEPLOYED) |
| `/ux-review` | Multi-persona UX/UI audit |
| `/hubspot-sync` | Pull live HubSpot → Firestore |
| `/port` · `/relay` | *(optional)* port one screen from `proto/` per land · hand off a slice that spans windows |
| `/media` | Search / create / resize / export visual assets (Nova-owned) |

> Keep responses lean: reference METHOD files, don't paste them.

## Communication Contract (how agents report to the operator)

> Canonical: `method-core.md` → "§ Operator Reporting" — the Debrief and Flight Deck templates live
> there and in the operator's user-level `CLAUDE.md`, never in a third copy.

- **Lead with the answer**: the first line of a substantial reply is what changed. Terse in chat, full
  prose in anything committed; code, commands, paths, errors and numbers **verbatim** everywhere.
- **Close a substantial reply with the card of its session type** (mission · control tower · Debrief) — plain markdown, never a fenced block, ending
  **Fait/Suite** (fate first); small → 2 lines; nothing done → none; a chantier sub-session: its fiche.
- **A delegated sub-agent never emits the card**: it hands back a **Done / State / Next** header (the
  3-line opener of every written artifact, PR bodies included) plus its findings; the coordinator
  folds them into one card.
- **Questions are quizzes, never prose.** Every question to the operator (Cadrage, `### Needs
  decision`, mid-build ambiguity, Recette) is prepared in advance and asked with `AskUserQuestion`: ≤ 4 questions, 2–4 options, recommended first, one consequence line each.
  Beyond 4 decisions, or a result not built yet: a review page (`method-core.md`). A sub-agent
  cannot ask: it returns a `### Needs decision`; the coordinator makes it the quiz.
- **Surface decisions, never bury them**; never settle an irreversible, data-model or scope change
  yourself — list it and stop.
- **The CUJ is the unit.** Every conversation names the journey(s) it closes; `Avancement` counts
  journeys **proven**, never an invented ratio. Report failures with evidence.
- **🔎 Preuve à jouer, first.** Any ask to prove or accept a journey carries one block: real clickable URL(s) ·
  numbered steps → expected · evidence links · what is not proven. Above `➡️ Suite`; else the ask is incomplete
  (`method-core.md` → "§ The two-moment contract").
- **Show progress in place** (⬜ 🔄 ✅); **match depth to stakes** (routine: 3-line header; irreversible: Why / Trade-offs / Risks).

## Landing & conversation size (non-negotiable)

> Canonical: `method-core.md` → "§ Landing (the default) & the exception list", "§ Slice discipline".
> Synced from the METHOD hub — change it there, never in an app.

**The operator does not manage pull requests.** Every conversation ends by landing on the trunk; the
result is **LANDED**, nothing more. **One conversation = one slice = one landing** — nothing landed and
the context filling up means the slice was too big: land what is green, then stop.

- **Close with `/land`** (`npm run land`), not `/ship`: it fetches the trunk, scans the diff against the
  exception list, merges the trunk in, runs the verify gate (lint · typecheck · tests · build, per lane)
  and fast-forwards. There is no CI (`SOUL.md` → Boundaries) — this local gate is the only brake.
- **Four states, never merged:** `CODED` · `LANDED` · `DEPLOYED` · `PROVEN`, each with its own evidence
  (a push · a served revision · an observed run). `land.mjs` deploys nothing.
- **Never** `gh pr merge --admin`, never force-push, never `git rebase`, never check out the trunk.
- **Exceptions → PR + `### Needs decision`:** schema / Firestore rules · auth, secrets, middleware ·
  `SOUL.md` · migrations · deploy wiring · `[no-auto-merge]` / `[wip]` / `[hold]` / `Needs decision` in a
  commit · a `wip` branch. Dependencies and big diffs land alone (332.a).
  Held back for a harmless reason? Land it with **`[land-anyway]`** and say why in the report.

## Model Routing (default: orchestrate high, execute cheap)

> Canonical policy — **do not restate it here**: `docs/METHOD/routing-method.md`, whose other §§ own
> what is not below: "§ Token economy" (incl. the `MEMORY.md` ≤ 5 kB cap and cost-per-finished-task),
> "§ Session Telemetry Ledger", "§ Output Compression", "§ Environment awareness" (non-Claude surfaces).

- **Delegate on the four-condition test, not by default.** Send work out when it is
  **verbose-and-discardable**, **self-contained** (one brief, no back-and-forth), **summarisable**, or
  **needs a tool restriction**. Stay **inline** for back-and-forth, shared multi-phase context and
  small targeted edits — a spawn costs 60–75 k tokens before it reads anything.
- **Tiers:** **T1** judge/plan/review/security/METHOD release → `opus` · **T2** build/prove/ops/design/
  copy/study → `sonnet` · **T3** mechanical (scaffolding, renames, i18n, bulk edits) → `haiku`. One
  retry per tier, then escalate one. **Tiers beat modes**: Ultracode or "cost is no constraint" never
  overrides them.
- **Name `model` explicitly** on every sub-agent and Workflow worker — unnamed runs `sonnet`. **Review,
  security and judgement never below T1**; `vera` once per slice, not per task.
- **Review→fix loop: 2 rounds max**, then the operator decides. A re-review reads the diff only; one
  reviewer per point; full gates (suite, build, e2e) once, at the end of the slice.
- **Workflow at ≥ 3 near-identical items** + a verification pass; it announces its cost at Cadrage and
  stays **< 10 agents** unless the operator agrees.
- **≥ 2 code-writing slices = a chantier**; inside a slice, a parallel session only on an **observed**
  trigger (`sprints-method.md` → "§ The chantier").

## Design port directive

> Guide: `docs/porting/PORTING-PLAYBOOK.md`. Spec: `design-method.md` → "§ Design Port Loop", run
> with `/port` (optional).

**`proto/` at the app root is the living UI directive, and it never ships.** Fake data is allowed there
and ONLY there; nothing under `app/`, `src/` or `components/` may import, link to or copy from it, and
it stays out of build, lint and deploy scope. A port **re-implements** against live Firestore/HubSpot,
one screen per land, tracked in `PORT-MAP.md`. If the proto implies a schema,
permission or feature change, **stop**: conflict gate, `### Needs decision` + PR, never a data-model
change you make yourself.
