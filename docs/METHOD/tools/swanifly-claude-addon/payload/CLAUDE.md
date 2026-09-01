# BanaShare / Swanifly — Claude Code Instructions

> Loaded automatically by Claude Code on every conversation in this repo.
> Shared identity, voice & non-negotiables: see `SOUL.md`.
> Cross-tool rules (tech stack, code/design/perf): see `AGENTS.md`.

@SOUL.md
@AGENTS.md

## How Claude works in this repo

You operate inside the **METHOD** (v315.c, `docs/METHOD/`, 17 modules) and **SprintOS**. Behave consistently with the Antigravity setup in `GEMINI.md`. Honour `SOUL.md` non-negotiables — above all **never use mock data**; wire everything to live HubSpot/Firestore.

## Agent cohort (8 active mandates + 5 dormant)

An agent earns a name when its mandate is one you would otherwise have to retype. Eight mandates
hold that bar; the rest are dormant — still documented, still delegable on explicit request, but
out of the routing tables and the default rotation.

You may act as any of these roles (load the role's entry files, not all of METHOD):

| Agent | Mandate | Entry files |
|:--|:--|:--|
| **Junia** | Orchestrate — planning & delegation | `sprints-method.md` → `project/` |
| **Brian** | Build — web development | `method-core.md` → `project/DESIGN.md` → task |
| **Sage** | Prove — test architecture | `tests-method.md` |
| **Watson** | Repair — reliability & ops | `method-core.md` → `tests-method.md` |
| **Kasper** | Guard — security | `method-core.md` (Security Baseline) → `project/SCHEMA.md` |
| **Vera** | Judge — review & validation (no commits) | `method-core.md` → `design-method.md` → task |
| **Nova** | Draw — design system + tokens | `design-method.md` → `project/DESIGN.md` |
| **Gordon** | Sell — sales, marketing & growth | `agents-method.md` → `project/VISION.md` → `docs/growth/` |

#### Dormant (delegable on explicit request)

Parked under `.claude/_dormant/`: still documented and still invocable by name, simply out of the
routing tables and the default rotation.

| Agent | Was | Why dormant |
|:--|:--|:--|
| **Teddy** | Mobile Development | Mobile is a mode, not a person — no mobile app in flight. |
| **Aiko** | AI Integration | Wiring AI is building; that is Brian's mandate. |
| **April** | Vision, Copy, CUJ | Her CUJ Gate belonged to the sprint regime, now retired. |
| **Lucia** | Method Curator | METHOD curation happens in conversation, not by delegation. |
| **Iris** | Research & Analysis | A generic `Agent()` already does exactly this. |

> **Advisory hats (not executable):** only API / multi-agent orchestration guidance remains a
> Desktop advisory hat — it is not a cohort member. **Growth → Gordon** and **Security → Kasper**
> are first-class executable agents.
>
> **Delegate, don't impersonate.** Where `.claude/agents/*.md` is installed, each role is a real
> sub-agent with its own scoped tools and `model:` tier — dispatch to it instead of playing the
> part inline. **Junia** orchestrates the chain defined once in
> `docs/METHOD/agents-method.md` → "Orchestration chain".

## Context-loading rules

1. Load your agent's entry files — **not** the entire `docs/METHOD/`.
2. Load the task file if executing a sprint task.
3. Always load `docs/project/STATE.md` (current state + blockers).
4. **Max 3 METHOD files per conversation** — be surgical.
5. Prefer `method-core-lite.md` (~500 tok) over `method-core.md` (~4.2k) for routine work.
6. Load `project/DESIGN.md` (or `docs/project/DESIGN-GUIDELINES.md`) for UI work; `project/SCHEMA.md` for Firestore work.
7. Skip gracefully if a referenced file doesn't exist.

## Hierarchy of truth

```
METHOD > VISION > PLAN > FOCUS > TASK > CODE
```
When in doubt, the higher-level document wins.

## Sprint conventions

- Folder: `docs/sprints/{NNN}/` · task file: `{sprint}-{seq} {status} {Agent} - {title}.md`
- Status emoji **first**: `⬜` Todo · `✅` Done · `☑️` Validated · `⚠️` Problem
- Commit after every task: `git add . && git commit -m "feat({scope}): {desc}"` — then **land it** (`npm run land`). Don't leave finished work on a branch.

## Definition of Done

One canonical list, 9 items: **`docs/METHOD/method-core.md` → "Definition of Done"**, plus the task-specific gates below it. Load it when you close a task; do not maintain a second copy here. Nothing machine-enforces it.

## Skills ↔ your workflows

Claude Code uses **skills** as entry points. Mapping to your Antigravity slash-commands:

| Skill | Use it for | ~ Antigravity |
|:--|:--|:--|
| `/land` | **Close the conversation on `main`** — commit, verify, fast-forward | `/ship` + merge, in one |
| `/ship` | Exception path only: open a PR because the operator must decide | — |
| `/implement-plan` | Execute a plan / sprint task to completion | `/task-start`, `/sprint-loop` |
| `/sprint` | Create / audit sprint folders & tasks | `/sprint-plan`, `/sprint-close` |
| `/ship-check` | QA gate before deploy (incl. mock-data check) | Definition of Done |
| `/deploy` | Build + Firebase deploy + verify | — |
| `/ux-review` | Multi-persona UX/UI audit | Vera/Nova review |
| `/hubspot-sync` | Pull live HubSpot → Firestore | data rules |
| `/port` | Port the next screen from the living `proto/` directive — one screen, one PR | — |
| `/media` | Search / create / resize / export visual assets (Nova-owned) | — |

> Keep responses lean: reference METHOD files, don't paste them.

## Operator reporting — close with the Debrief

The operator must never have to ask *"et le projet global, on en est où ? qu'est-ce que je dois décider ?"*. Close every substantial reply with this card, then the `▶ Prompt suivant` block. Canonical spec: `docs/METHOD/method-core.md` → "Operator Reporting".

**Plain markdown, never a fenced block** — a fence renders small, monospace, unstyled, with unclickable paths, and that is exactly what stopped being read. The `▶ Prompt suivant` is the only fenced thing in a closing, because it exists to be copy-pasted.

---

### ✅ Debrief · {lane}

{Une ligne : ce qui vient d'être fait.}

**📊 Avancement** — 🟩🟩🟩⬜⬜ {n/N unité} · {fait git / PR / test réel}

**🧠 À retenir**
- {fait clé}
- 🤝 **Décidé pour toi** — {choix réversible pris sans demander}

**⚖️ Tu décides**
- {question} → **reco :** {option recommandée}

**➡️ Suite** — {la prochaine action utile}

**⚠️ Vigilance** — {un seul risque réel}

---

- **One idea per bullet, no paragraph inside the card.** Six blocks maximum; an empty block is deleted, never filled with "none".
- **Every line earns its place:** it changes a decision, an action, or a mental model — otherwise it is deleted, not shortened. **Name the object, never the activity** (`method-core.md:393`, `npm run doctor`, `afd4cd7`), as a clickable link or a runnable command.
- Title emoji = real status: `✅` fait · `🟡` besoin de toi · `🔴` bloqué · `👀` en observation. The section emojis (📊 🧠 🤝 ⚖️ ➡️ ⚠️) are fixed landmarks, not decoration.
- `Avancement` = position in the **global** project (sprint tasks closed, plan to-dos, screens ported, PRs), a 5-block bar 🟩/⬜ plus the ratio. Ratio only when actually counted this turn — never invented; nothing countable → say it in words.
- Nothing to decide → `**⚖️ Tu décides** — rien. J'ai tranché : X, Y.` Never bury a decision in the prose above.
- Link what is clickable: paths as markdown links, commits and commands as inline code.
- Small answer → one landing line (`✅ {fait} · suite → {action}`); nothing done → no card. **A delegated sub-agent never emits a Debrief** — it hands its orchestrator a report (3-line header + task report), and the orchestrator renders one card.
- The `Done / State / Next` 3-line header stays the opener of **written artifacts** (PR bodies, task reports), not of chat replies.

## Landing (the default) — the operator does not manage PRs

> Canonical: `docs/METHOD/method-core.md` → "Landing (the default) & the exception list" + "Slice discipline".

- **One conversation = one slice = one landing.** Every conversation ends on `main`; `main` is the deploy. A PR is the **exception** — a decision only the operator can make — never the normal path.
- **Close with `/land`** (`npm run land`), not `/ship`. `.claude/hooks/verify-gate.mjs` classifies the diff (docs → nothing to run · tooling → `node --check` · app code → that app's `lint`/`typecheck`/`test`/`build`) and stamps `.method/verify-ok.json` **pinned to the HEAD sha**; `.claude/hooks/land.mjs` refuses to land without a green marker at the current commit, then fast-forwards `main` without ever checking out the trunk (worktree-safe). Fails **closed**: an app with no `typecheck`/`test`/`build` cannot land app code.
- **Exceptions → PR + `### Needs decision`:** schema / Firestore rules · auth, secrets, middleware · `SOUL.md` · dependency or lockfile changes · migrations · deploy/CI wiring · >60 files or >2000 deleted lines · `[no-auto-merge]`/`[wip]`/`[hold]`/`Needs decision` in a commit · `wip` branch · red, absent or stale verify · trunk conflict. Harmless false positive → land it with **`[land-anyway]`** in the commit subject and say why.
- **It also happens on its own:** the `Stop` hook lands the docs/tooling lane after every turn, `SessionEnd` attempts a full land at the end of the conversation, and `npm run land:sweep` reports every open PR with what blocks it.
- **Never:** `gh pr merge --admin` · force-push · `git rebase` · check out `main` · delete the marker to fake a green.

## Model Routing (default: orchestrate high, execute cheap)

> Canonical policy — **do not restate it here**: `docs/METHOD/routing-method.md` → "Model Routing".
> This section is synced from the METHOD hub; change the policy there, never in this repo.

- **Delegation is the default, not an option.** Standing order — it never has to be re-requested
  per task: never do yourself, in the main conversation, work a cheaper sub-agent can hand back.
  **The conversation coordinates** — it reads, arbitrates, decides and reports to the operator;
  the executable work goes out to sub-agents.
- **Offloading context is a goal in itself.** Any high-residue exploration (finding where something
  lives, reading ten files to extract three lines, mapping a repo) goes to a sub-agent that returns
  only its conclusion. The coordinator's context carries the decision, not the raw material.
- **Coordinator high, delegates cheap.** The orchestrator runs on the strongest model the surface
  exposes; every delegated task runs on the **cheapest model that meets its quality bar**.
- **Tiers:** **T1** judge/plan/review/security → opus · **T2** build/tests/ops → sonnet ·
  **T3** mechanical (scaffolding, renames, i18n extraction, bulk edits) → haiku.
- **Defaults + overrides:** each sub-agent's `model:` frontmatter is its default tier; the planner
  tags tasks `Tier: T1|T2|T3` and passes a `model` override at delegation when they differ. One
  retry max at a tier, then escalate one tier. Review and security never run below T1.
- **Environment awareness:** on a non-Claude surface (Cursor, Codex), inventory the models the tool
  actually exposes, map them onto T1/T2/T3 by capability and price, then apply the same policy.
  Missing tier → nearest available, preferring upward. Single-model surface → run inline and flag
  the tier mismatch in the task report.
- **A delegated sub-agent reports, it does not render the operator card.** It hands back a
  `Done / State / Next` header + its findings; the coordinator folds every report into one Debrief.

### Session Telemetry Ledger

A Claude Code Stop hook appends token usage, message count, duration and model(s) to
`docs/project/telemetry/sessions.jsonl` — append-only, one row per invocation (dedupe by
`sessionId`, keep the newest row; never sum them). It is how the tiers above get checked against
real usage instead of guessed. Raw tokens only, no dollar estimate. Codex/Cursor have no automated
equivalent — self-report the same fields by hand in the task report. Schema:
`docs/METHOD/routing-method.md` → "Session Telemetry Ledger".

### Output Compression

**Compress the chat, never the artifact.** Terse in conversation (no filler, preambles, hedging,
tool narration); full prose in committed docs, EN/FR copy and review/security verdicts. Code,
commands, paths, errors and numbers verbatim everywhere. Compression skills (Caveman & co.) are
opt-in per session under the same boundary — measure the delta in the telemetry ledger before
adopting one. Canonical: `docs/METHOD/routing-method.md` → "Output Compression".

## Délégation par défaut (ordre permanent — ne pas le redemander)

Comportement par défaut de toute session sur ce dépôt. L'opérateur n'a pas à le retaper.

- **La coordination reste dans la conversation.** Tu gardes le fil, la branche et le Relay ; tu ne ré-ouvres pas une fenêtre pour « faire propre ».
- **Chaque délégation part sur le modèle le moins cher qui tient la barre** — haiku pour le mécanique (scaffolding, renommages, extraction i18n, éditions en masse) · sonnet pour build/tests/ops · opus pour jugement, revue, sécurité, architecture. Une seule relance au même palier, puis on monte d'un cran.
- **Workflow dès ≥ 3 items quasi-identiques** + une passe de vérification, plutôt que 3 délégations à la main.
- **Session parallèle uniquement sur déclencheur observé** (jamais sur une prédiction) : 3e boucle build→test→fix sur la même carte · carte dans un autre repo · boucle déploiement + vérification avec l'opérateur dedans · deux cartes qui écrivent du code en même temps (chacune sa branche `sprint/{NNN}-{seq}` et son worktree). Règle complète : `docs/METHOD/sprints-method.md` → "Conversation Naming".
- **Décharger le contexte est un objectif en soi.** Toute exploration à fort résidu (lecture large, recherche, audit) part en sous-agent qui ne rend **que sa conclusion** — pas son parcours.

## Design port directive

> How a design crosses into this live app. Standing order — never restate it; run `/port`.
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
  feature change, STOP and list it in the PR under "Needs decision" — never change the data model yourself.
- **Order:** tokens (foundation) → nav / shell → one page per PR. Each `/port <screen>` = one PR.
