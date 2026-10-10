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

You operate inside the **METHOD** (v320.a, `docs/METHOD/`). Honour `SOUL.md` non-negotiables — above all **never use mock data**; wire everything to the app's live source of truth or render an explicit empty/error state. **Detect this app's actual stack before building** — the METHOD's declared stack is a target baseline, not a description of this repo.

## Agent Cohort (12 active mandates + 3 dormant — Skills + sub-agents)

> Synced from the METHOD hub into every app's `CLAUDE.md` — change it in the hub, never in an app.
> Canonical: `docs/METHOD/agents-method.md`.

**`.claude/agents/{agent}.md` is the canonical definition** of every agent — identity, mandate,
non-negotiables. `.claude/skills/{agent}/SKILL.md` is a Desktop **stub that loads it**. Edit the
agent file, never a stub.

An agent earns a name when its mandate is one you would otherwise have to retype. Twelve mandates
hold that bar; three are dormant — parked under `.claude/_dormant/`, outside the directories Claude Code
scans for agents, so **not loaded and not delegable**. Bringing one back is a `git mv` into
`.claude/agents/` plus a METHOD release — the operator's call, never an agent's mid-session.

| Agent | Mandate | Default model | Entry files |
|:--|:--|:--|:--|
| **Junia** | Plan — request → plan/to-do (or a sprint, by exception) + its Cadrage | opus | `sprints-method.md` → `docs/project/` |
| **Brian** | Build — web development (incl. mobile and AI wiring) | sonnet | `method-core.md` → `docs/project/DESIGN.md` → task |
| **Sage** | Prove — the observed proof of a journey (LANDED/DEPLOYED → PROVEN), then its regression test | sonnet | `tests-method.md` → task → `docs/project/journeys/` |
| **Watson** | Repair — reliability & ops | sonnet | `method-core.md` → `tests-method.md` |
| **Kasper** | Guard — security | opus | `method-core.md` (Security Baseline) → `docs/project/SCHEMA.md` |
| **Vera** | Judge — one review per slice, at the Recette (no commits) | opus | `method-core.md` → `design-method.md` → task |
| **Nova** | Draw — design system + tokens | sonnet | `design-method.md` → `docs/project/DESIGN.md` |
| **Gordon** | Commercial & growth — offers, funnels, EN/FR copy, campaigns, positioning; ads unless the business pack names an owner | sonnet | `agents-method.md` → `docs/project/VISION.md` → `docs/growth/` |
| **Iris** | Study & deliverables — studies, data mining, client-grade reports; owns anonymisation/GDPR | sonnet | `method-core-lite.md` → `docs/project/STATE.md` → the object of study |
| **Lucia** | METHOD release manager — versioning, sync, upstreaming, `docs/improvement/ACTIONS.md` | opus | `versioning.md` → `METHOD.md` → the files the change touches |
| **Penny** | Token economy — measure, report and coach on token use; propose METHOD changes to Lucia; read-only on code | sonnet | `routing-method.md` → `docs/project/telemetry/` → the ledgers |
| **Oscar** | Coach — weekly retro (`/retro`): effectiveness, focus, objectivity, lucidity, relevance of objectives and whether they are reached; one habit to change; METHOD proposals to Lucia; read-only on code | opus | `method-core.md` → `docs/project/STATE.md` + `FOCUS.md` → the week's evidence |

**Dormant (not loaded, not delegable):** **April** (vision & copy → Junia's Cadrage + Gordon) ·
**Aiko** (AI integration → Brian) · **Teddy** (mobile → Brian). Why: `.claude/_dormant/README.md`.

**The coordinating conversation orchestrates — not an agent.** It delegates, folds every report into
one Debrief, runs the Recette and lands. The chain (canonical: `docs/METHOD/agents-method.md` →
"Orchestration chain"): per task `brian` → `watson` (only if the gate goes red) → `kasper` (only when
rules / auth / API routes are touched); once per slice, at the Recette, `vera` (one review, opus) →
`/land` → `sage` (runs the Proof where it says → PROVEN) → the operator accepts. Fan-out: `nova`
design · `gordon` commercial · `iris` study · `lucia` METHOD · `penny` token economy — when a slice
ran a Workflow or > 10 sub-agents, her one-paragraph cost note joins the Debrief (a note, not a gate) ·
`oscar` coach — weekly through `/retro`, and on demand at the Recette of a slice that closes a journey;
never once per Debrief.

Rituals (9, `.claude/commands/`): `/land` (the default close) · `/ship` (the PR exception) ·
`/intervention` · `/plan-sprint` · `/review` · `/brief` · `/retro` (weekly) · `/port` (optional) ·
`/relay` (optional).

A **domain owner** (ads, CRM, pricing…) is app-level: declared in the app's business pack
(`docs/project/business/README.md`), never added to this table, and never overwritten by the sync —
`agents-method.md` → "Domain owners & the business pack (app-level)". An app MAY re-use a demoted
name (e.g. Riley) for one.

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

> Synced from the METHOD hub — change it there, never in an app. Canonical:
> `docs/METHOD/method-core.md` → "Operator Reporting".

Optimize for the operator's readability, not for completeness. Lead with the answer; keep process out.

- **Close every substantial reply with the Debrief card.** It answers, without being asked: ce qui vient d'être fait · où ça met le **projet global** (`Avancement`, a real count — never an invented ratio) · ce qu'il faut retenir (dont `Décidé pour toi`) · ce que l'opérateur doit trancher · la suite + le `▶ Prompt suivant`. Rendered as **plain markdown, never a fenced block** (a fence renders small, unstyled and unclickable). Small answer → one landing line (`✅ {fait} · suite → {action}`); nothing done → no card. A delegated sub-agent never emits one — it reports to its orchestrator, which folds every report into a single card.
- **Lead with the answer in chat.** First line of a substantial reply = what changed. The **3-line header** — **Done** (what changed) · **State** (🟢 on track · 🟡 needs your input · 🔴 blocked) · **Next** (immediate step, or `awaiting your call ↓`) — opens **written artifacts**: PR bodies, task reports, sub-agent reports. Never both a header and a Debrief for the same work.
- **Surface decisions, never bury them.** When a choice is the operator's, add a `### Needs decision` block: the question, 2–4 options, **recommendation first**, and carry it into the Debrief's `Tu décides` row. Never decide irreversible / data-model / scope changes yourself — list and stop (the conflict gate).
- **The CUJ is the unit.** Every conversation/sprint/task names the journey(s) it closes; `Avancement` counts journeys proven. States are four and never merged: `CODED` · `LANDED` · `DEPLOYED` · `PROVEN`, each with its own evidence.
- **Be synthetic.** Bullets over paragraphs; one idea per bullet; bold the noun that matters; a table for >3 comparable items. Don't narrate tool calls or re-explain settled context.
- **Show progress** on multi-step work as a checklist (⬜ 🔄 ✅) refreshed in place — not a fresh wall of text each turn.
- **Match depth to stakes.** Routine → the 3-line header suffices. Architectural/irreversible → add a short **Why / Trade-offs / Risks**. Default to less.
- **Flag risk early and plainly** ("this will break X" up front). Report failures with evidence; never imply done when it isn't.
- **Compress the chat, never the artifact.** Terse in conversation; full prose in anything committed: task files, `STATE.md`, PR bodies, `/relay` blocks, EN/FR copy, and Vera/Kasper verdicts. Code, commands, paths, error strings and numbers stay **verbatim** everywhere.

The card — two `---` rules, a status emoji in the title (`✅` fait · `🟡` besoin de toi · `🔴` bloqué · `👀` en observation), fixed section landmarks, six blocks max, an empty block deleted:

---

### ✅ Debrief · {lane}

{Une ligne : ce qui vient d'être fait.}

**📊 Avancement** — 🟩🟩🟩⬜⬜ {n/N parcours prouvés} · {CODED · LANDED · DEPLOYED · PROVEN — l'état atteint, avec sa preuve}

**🧠 À retenir**
- {fait clé}
- 🤝 **Décidé pour toi** — {choix réversible pris sans demander}

**⚖️ Tu décides**
- {question} → **reco :** {option recommandée}

**➡️ Suite** — {la prochaine action utile}

**⚠️ Vigilance** — {un seul risque réel}

---

Every line earns its place — it changes a decision, an action or a mental model — and names the object, never the activity (`method-core.md:393`, `npm run doctor`, `afd4cd7`). Nothing to decide → `**⚖️ Tu décides** — rien. J'ai tranché : X, Y.` Then the `▶ Prompt suivant` block, the only fenced thing in a closing.

## Landing & conversation size (non-negotiable)

> Canonical: `docs/METHOD/method-core.md` → "Landing (the default) & the exception list" + "Slice discipline".
> Synced from the METHOD hub — change it there, never in an app.

**The operator does not manage pull requests.** Every conversation ends by landing on the trunk
(`main`; `land.mjs` reads it from `origin/HEAD`, so a `master` repo lands the same way), and the
result is **LANDED** — `DEPLOYED` and `PROVEN` need their own evidence (a served revision, an observed
run): there is no CI on this account, and `land.mjs` deploys nothing. A PR is the **exception** — the
artifact of a decision only the operator can make — never the normal path.

- **One conversation = one slice = one landing.** A slice is what this window can finish *and* land.
  Nothing landed and the context is filling up? The slice was too big: land what is green, then stop.
- **Close with `/land`**, not `/ship`. `.claude/hooks/land.mjs` fetches the trunk, scans the diff
  against the exception list, merges the trunk in, runs `.claude/hooks/verify-gate.mjs`
  (lint · typecheck · tests · build, per lane), and fast-forwards the trunk. An open PR for the branch
  closes itself as merged.
- **The gate is machine-checked, local, and fails closed** — a green marker must be pinned to the
  current HEAD sha, and (since 318.a) a **newly added** intervention or task file must carry
  `**Journey:**` + `**Proof:**`. There is no CI (GitHub Actions is billing-blocked on this account, by
  choice) and no branch protection; this gate is the only brake. Never `gh pr merge --admin`, never
  force-push, never `git rebase`, never check out `main`.
- **Exceptions (→ PR + `### Needs decision`):** schema/Firestore rules · auth, secrets, middleware ·
  `SOUL.md` · dependency or lockfile changes · migrations · deploy wiring · >60 files or >2000
  deleted lines · `[no-auto-merge]` / `[wip]` / `[hold]` / `Needs decision` in a commit · `wip` branch.
  Held back for a reason that is genuinely harmless? Land it with **`[land-anyway]`** in the commit
  subject and say why in the report.
- **It also happens on its own:** the `Stop` hook lands the docs/tooling lane after every turn; the
  `SessionEnd` hook attempts a full land when the conversation ends. `npm run land:sweep` reports every
  open PR and what blocks it — run it when PRs have accumulated.
- **Token economy:** a PR is a token liability — it means the work comes back in a new window with the
  context re-derived. Landing is what keeps conversations short. Route residue-heavy exploration to
  sub-agents that return conclusions only.

## Model Routing (default: orchestrate high, execute cheap)

> Canonical policy — **do not restate it here**: `docs/METHOD/routing-method.md` → "Model Routing".
> This section is synced from the METHOD hub; change the policy there, never in an app.

- **Delegation is the default, not an option.** Standing order — it never has to be re-requested
  per task: never do yourself, in the main conversation, work a cheaper sub-agent can hand back.
  **The conversation coordinates** — it reads, arbitrates, decides and reports to the operator;
  the executable work goes out to sub-agents.
- **Offloading context is a goal in itself.** Any high-residue exploration (finding where something
  lives, reading ten files to extract three lines, mapping a repo) goes to a sub-agent that returns
  only its conclusion. The coordinator's context carries the decision, not the raw material.
- **Coordinator high, delegates cheap.** The orchestrator runs on the strongest model the surface
  exposes; every delegated task runs on the **cheapest model that meets its quality bar**.
- **Tiers:** **T1** judge/plan/review/security/METHOD release → opus · **T2** build/prove/ops/design/
  copy/study → sonnet · **T3** mechanical (scaffolding, renames, i18n extraction, bulk edits) → haiku.
- **Defaults + overrides:** each sub-agent's `model:` frontmatter is its default tier (opus: junia,
  vera, kasper, lucia, oscar · sonnet: brian, sage, watson, nova, gordon, iris, penny); pass a `model`
  override at delegation when the task's tier differs. One retry max at a tier, then escalate one
  tier. Review and security never run below T1, and **Vera runs once per slice, at the Recette** —
  not per task. A `general-purpose` sub-agent never runs on opus unless the task is judgement
  ($11.5/agent on opus vs $4.1 on sonnet).
- **Workflow at ≥ 3 near-identical items** (+ a verification pass), and **every Workflow worker gets
  an explicit `model`** — default sonnet, haiku for mechanical items, opus only for a judgement pass.
  Since 319.a a worker or sub-agent that names none runs on the user-level default, **sonnet**
  (`CLAUDE_CODE_SUBAGENT_MODEL`, set by `install.mjs --user`); before it, unpinned sub-agents
  inherited the coordinator's opus (122 of 123 truly unpinned, $1,456 = 9.8 % of 14 days' cost). The default makes forgetting cheap,
  not safe: **review, verify and judgement workers name `opus` explicitly**. It never replaces an
  explicit `model`; never use its `_FORCE` variant (it would downgrade `vera`/`kasper`).
  **A Workflow announces its cost at Cadrage** (agents × expected calls, as a share of the weekly quota) and stays **< 10 agents**
  unless the operator agrees — Workflows were 37.5 % of 14 days' cost.
- **Token economy (319.a) — cost = calls × context, not output** (cache 85.6 % of cost). Canonical:
  `routing-method.md` → "Token economy".
  - **Review→fix loop: 2 rounds max**, then the operator decides; a re-review reads the diff only;
    one reviewer per point (`vera` *or* `kasper`); full gates (suite, build, e2e) once at the end of
    the slice. (One loop ran 5 rounds and cost 34 % of a ~$610 session.)
  - **Tiers beat modes** — Ultracode or "cost is not a constraint" never overrides T1/T2/T3
    (57/70 sub-agents ran on opus under one).
  - **Minimal sub-agent context** — pass file paths, never pasted inventories; screenshots only for
    `nova`/`sage`, only the needed ones; cap tool calls in the brief (≈ 55 calls per sub-agent on
    average, each re-reading ≈ 200–260k tokens).
  - **`MEMORY.md` ≤ 5 kB**, one-line pointers — loaded every turn; the doctor warns above it.
  - **Cost per finished task** is the unit: a cheaper tier that needs three passes is not cheaper.
- **A parallel session only on an observed trigger**, never a predicted one: a 3rd build→test→fix
  loop on the same task · another repo · a deploy loop with the operator in it · two tasks writing
  code at once (each its own branch + worktree). Rule: `docs/METHOD/sprints-method.md` → "Sessions &
  branches".
- **Environment awareness:** on a non-Claude surface (Cursor, Codex), inventory the models the tool
  actually exposes, map them onto T1/T2/T3 by capability and price, then apply the same policy.
  Missing tier → nearest available, preferring upward. Single-model surface → run inline and flag
  the tier mismatch in the task report.
- **A delegated sub-agent reports, it does not render the operator card.** It hands back a
  `Done / State / Next` header + its findings; the coordinator folds every report into one Debrief.

### Session Telemetry Ledger

A Claude Code Stop hook appends token usage, message count, duration and model(s) to the repo's
local ledger `docs/project/telemetry/sessions.jsonl` — gitignored. Hooks no longer commit the
ledger (318.a); the file becomes untracked in a follow-up once every checkout runs the 318.a
hooks. One cumulative row per turn: dedupe by `sessionId`, keep the newest row, never sum. The
hub rolls the ledgers up with `npm run telemetry:report`. Raw tokens only, no dollar estimate.
Codex/Cursor have no automated equivalent — self-report the same fields by hand in the task report.
Schema: `docs/METHOD/routing-method.md` → "Session Telemetry Ledger".

### Output Compression

**Compress the chat, never the artifact.** Terse in conversation (no filler, preambles, hedging,
tool narration); full prose in committed docs, EN/FR copy and review/security verdicts. Code,
commands, paths, errors and numbers verbatim everywhere. Compression skills (Caveman & co.) are
opt-in per session under the same boundary — measure the delta in the telemetry ledger before
adopting one. Canonical: `docs/METHOD/routing-method.md` → "Output Compression".

## Design port directive

> How a design crosses into this live app. Standing order — never restate it; run `/port` (an optional ritual: only apps with a living `proto/` use it).
> Full operating guide: `docs/porting/PORTING-PLAYBOOK.md`. Method spec: `docs/METHOD/design-method.md` → "Design Port Loop".

- **Directive = the living proto, committed.** The current UI directive for this app is the HTML
  prototype in **`proto/` at the app root** — seeded from a Claude Design export (source HTML +
  tokens, never a screenshot), then evolved **in place** to work out design and features before
  they are developed. Follow it for UX, layout, IA and features. Design change? Evolve `proto/`
  first, commit, then re-port the screen. *(Apps not yet migrated: fall back to
  `docs/project/design/artifacts/{app}/`.)*
- **`proto/` never ships.** It is a design workspace, not an app path: fake data is allowed there
  and ONLY there; nothing under `app/`, `src/` or `components/` may import, link or copy from it;
  keep it out of build/lint/deploy scope. Ports **re-implement** against live Firestore/HubSpot.
- **`docs/project/design/PORT-MAP.md`** is the proto-screen → component → Firestore map + checklist
  (start from `PORT-MAP-TEMPLATE.md`; per-screen state: ⬜ designing · 🔄 porting · ✅ ported · ⚠️ diverged).
- **One token vocabulary.** The proto and PORT-MAP speak the METHOD **token contract**
  (`--pri`, `--pri2`, `--grad`, `--bg`, `--s1..s4`, `--text`/`--text2`/`--text3`, `--border`,
  `--r`/`--r-btn`/`--r-card`/`--r-input`/`--r-tag`, `--error`/`--success`/`--warning`/`--info`, `--ease`).
  Each app's `/port foundation` maps the contract to its idiom **once** (MUI → mirror values as hex in
  the theme; Tailwind v4 → alias the contract over `@theme`; Tailwind v3 → config). Never feed
  `var(--…)` into a MUI palette — it throws.
- **Conflict gate — reconcile, never overwrite.** If the proto implies a schema / permission /
  feature change, STOP: it is on the landing exception list, so surface it in a `### Needs decision`
  block (PR) — never change the data model yourself.
- **Order:** tokens (foundation) → nav / shell → one page per land. Each `/port <screen>` = one land.
