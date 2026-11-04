# {App name} — Claude Code Instructions

> Loaded by Claude Code on every conversation in this repo **and on every sub-agent launch**, so it
> holds only what binds every turn; everything else is one pointer away. Budget 12,288 B, gated by
> `npm run doctor` (E16) in the hub.
> Shared identity, voice & non-negotiables: `SOUL.md` — the **only** file imported below.
> `AGENTS.md` is the cross-tool mirror for non-Claude agents (Cursor, Codex, Cline, Antigravity): it
> derives from this file and is **not imported** into Claude's context, so a rule that lives only there
> does not reach Claude.
> **Ownership (METHOD v318.a):** five sections below — Agent Cohort, Model Routing, Landing &
> conversation size, Communication Contract, Design port directive — are **synced from the METHOD
> hub** and rewritten by every sync (unless `docs/METHOD/app-settings.json` →
> `claudeAddon.ownedSections` claims one). Everything else in this file belongs to the app.

@SOUL.md

## How Claude works in this repo

You operate inside the **METHOD** (v339.a, `docs/METHOD/`). Honour `SOUL.md` non-negotiables —
above all **never use mock data in a shipped path**: wire everything to the app's live source of truth,
or render an explicit empty/error state. Decisions become task or intervention files and
`docs/project/DESIGN.md` — the handoff is a doc, never a transcript.

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

## Context Loading Rules

Load what the task needs, nothing more — every kB here is re-paid by every session and every launch.

1. **Your agent file's `Entry files:` line**: the `§§` to read, under a byte cap. Any other `§` by
   name, only if the task needs it. Never all of `docs/METHOD/`; max 3 METHOD files.
2. **State:** `docs/project/STATE.md` → "§ Resume here" + `docs/project/FOCUS.md` → "§ The north star".
   Further `§§` by name only when the task needs them — whole, the two are 55 kB. **Rule 1 wins:** an
   agent whose line names one without a `§` reads it whole, deliberately (`iris`).
3. The task or intervention file you are executing; `docs/project/DESIGN.md` for UI,
   `docs/project/SCHEMA.md` for Firestore — where they exist.
4. Prefer `method-core-lite.md`; full `method-core.md` only for architecture or security. A referenced
   file that does not exist is skipped, not an error.

## Hierarchy of Truth

```
METHOD > VISION > PLAN > FOCUS > TASK > CODE
```
When in doubt, the higher-level document wins.

## How Agents Operate (the loop)

**One demand, one slice** — an **intervention** (`/intervention`, logged as
`docs/interventions/YYYY-MM-DD-{Agent}-{topic}.md`) or a **plan** run to the end (`implement-plan`,
never edited while running). A **sprint** (`/plan-sprint`) only when the work is planned ahead *and*
multi-owner *and* needs a review gate — all three. Rules, conventions and commit-per-task:
`sprints-method.md`. `.claude/commands/` is the **ritual** roster and `.claude/skills/`
the capability one (`/deploy` → DEPLOYED, `/hubspot-sync`, `/media`, `implement-plan`); each file's
`description:` says when to run it, and `agents-method.md` lists both.

1. **Orient** — your entry files + the task.
2. **Cadrage** — one `AskUserQuestion` fixing **Journey · Proof · out-of-scope**, written into the
   task/intervention file **before the first edit** (`/land` refuses a new one without them). Skipped
   for a question, a lookup, a one-line fix. Ambiguous, or against a higher doc → stop and ask.
   Canonical: `method-core.md` → "§ The two-moment contract".
3. **Build** — the smallest vertical slice, one concern per change.
4. **Prove** — smoke + critical-path tests, typecheck, lint. State verify status honestly, "couldn't
   build" included.
5. **Recette, then land** — the recette table (every deliverable asked → shown), `vera`'s one review,
   the four states; then the Definition of Done, `STATE.md`, a `type(scope): msg` commit, `/land`.

The middle is **autonomous** — never "shall I continue?". Only the conflict gate (data model,
permissions, scope, anything irreversible) stops, for a `### Needs decision`.

## Definition of Done

Nine items, one canonical list: `method-core.md` → "§ Definition of Done", plus its
task gates (Zod + `SCHEMA.md` when data is touched; empty/error/loading states on UI). One is
machine-checked: `/land` refuses a newly added task or intervention file without `Journey:` + `Proof:`.

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

## Tech Stack & Code Rules (non-negotiable)

> The METHOD target baseline — **detect this app’s actual stack before building**; the declared
> stack is a target, not a description of this repo.

Next.js 15 App Router · TypeScript strict · Tailwind + CSS custom properties, Material Design 3
mandatory · Firebase Auth · Firestore (multitenant `teams/{teamId}/*`) · Firebase Storage · Cloud
Functions · next-intl (EN/FR baseline) · Zod as the single source of truth · Lucide icons · Inter.

- No `any` — `unknown` + type guards. No `as` outside test files; use `satisfies`. `import type {}`.
- **Zod on every Firestore write:** `schema.parse(data)` before `setDoc()`.
- Max 200 lines/file (soft), 40 lines/function (soft), 3 levels of JSX nesting.
- Named exports for non-page files; no barrel exports, no circular imports.
- Server components by default — `'use client'` only when needed.
- No `eval()`, no `dangerouslySetInnerHTML` without sanitisation.
- `NEXT_PUBLIC_*` / `VITE_*` are client-safe only — **never a secret**.
- **Never hardcode a colour, radius or spacing** — use the token contract, listed in
  `design-method.md` → "§ Prototyping — Claude Artifacts", checked by "§ Design Tokens Checklist";
  dark mode required everywhere. Gradient CTAs, inline icons, radii, type scale: same file →
  "§ Visual Identity Pillars"; this app's values: `docs/project/DESIGN-GUIDELINES.md`.
- Feature-first `src/features/{feature}/`; shared logic `src/lib/`, shared UI `src/components/`;
  Firestore **only** through `src/lib/firebase/`; API routes are thin controllers over
  `src/lib/services/`; one concern per file.
- **Tenant-scoped `teams/{teamId}/` prefix on every collection**; update `docs/project/SCHEMA.md`
  whenever collections or fields change.

## Design port directive

> Guide: `docs/porting/PORTING-PLAYBOOK.md`. Spec: `design-method.md` → "§ Design Port Loop", run
> with `/port` (optional).

**`proto/` at the app root is the living UI directive, and it never ships.** Fake data is allowed there
and ONLY there; nothing under `app/`, `src/` or `components/` may import, link to or copy from it, and
it stays out of build, lint and deploy scope. A port **re-implements** against live Firestore/HubSpot,
one screen per land, tracked in `PORT-MAP.md`. If the proto implies a schema,
permission or feature change, **stop**: conflict gate, `### Needs decision` + PR, never a data-model
change you make yourself.
