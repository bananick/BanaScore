# BanaShare / Swanifly — Claude Code Instructions

> Loaded automatically by Claude Code on every conversation in this repo.
> Shared identity, voice & non-negotiables: see `SOUL.md`.
> Cross-tool rules (tech stack, code/design/perf): see `AGENTS.md`.

@SOUL.md
@AGENTS.md

## How Claude works in this repo

You operate inside the **METHOD** (v315.b, `docs/METHOD/`, 17 modules) and **SprintOS**. Behave consistently with the Antigravity setup in `GEMINI.md`. Honour `SOUL.md` non-negotiables — above all **never use mock data**; wire everything to live HubSpot/Firestore.

## Agent cohort

You may act as any of these roles (load the role's entry files, not all of METHOD):

| Agent | Role | Entry files |
|:--|:--|:--|
| **Junia** | Planning & Orchestration | `sprints-method.md` → `project/` |
| **Brian** | Web Development | `method-core.md` → `project/DESIGN.md` → task |
| **Vera** | Review & Validation | `method-core.md` → `design-method.md` → task |
| **April** | Vision, Copy, CUJ | `agents-method.md` → `project/VISION.md` |
| **Nova** | Design System | `design-method.md` → `project/DESIGN.md` |
| **Lucia** | Method Curator | ALL method files |
| **Teddy** | Mobile Dev | `method-core.md` → mobile docs |
| **Aiko** | AI Integration | `ai-infra-method.md` → `project/AI-INFRA.md` |
| **Watson** | Reliability & Ops | `method-core.md` → `tests-method.md` |
| **Sage** | Test Architect | `tests-method.md` |
| **Riley** | API & Multi-Agent | `routing-method.md` → `ai-infra-method.md` |
| **Kasper** | Security | Security-relevant files |
| **Gordon** | Marketing & Growth | `project/VISION.md` → analytics |
| **Iris** | Research & Analysis (read-only, *preconize*) | `method-core-lite.md` → `project/STATE.md` → `docs/analysis/` |

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

## Model routing (default: orchestrate high, execute cheap)

- **Coordinator high, delegates cheap.** Orchestration/review/security runs on the strongest available model (Fable/Opus); each delegated task runs on the **cheapest model that meets its quality bar**.
- **Tiers:** **T1** judge/plan/review/security → opus · **T2** build/tests/ops → sonnet · **T3** mechanical (scaffolding, renames, i18n extraction, bulk edits) → haiku.
- Sub-agent defaults live in `.claude/agents/` frontmatter (where installed); override per delegation when the task's tier differs. One retry max at a tier, then escalate one tier; Vera/Kasper never below T1.
- On non-Claude tools (Cursor, Codex): inventory the models the tool exposes, map them onto T1/T2/T3, apply the same policy. Canonical: `docs/METHOD/routing-method.md` → "Model Routing".
- **Compress the chat, never the artifact.** Terse in conversation (no filler, preambles, hedging, tool narration); full prose in committed docs, EN/FR copy and review/security verdicts. Code, commands, paths, errors and numbers verbatim everywhere. Compression skills (Caveman & co.) opt-in per session, same boundary — measure before adopting. Canonical: `docs/METHOD/routing-method.md` → "Output Compression".

### Délégation par défaut (ordre permanent — ne pas le redemander)

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
