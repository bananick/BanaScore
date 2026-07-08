# BanaShare / Swanifly — Claude Code Instructions

> Loaded automatically by Claude Code on every conversation in this repo.
> Shared identity, voice & non-negotiables: see `SOUL.md`.
> Cross-tool rules (tech stack, code/design/perf): see `AGENTS.md`.

@SOUL.md
@AGENTS.md

## How Claude works in this repo

You operate inside the **METHOD** (v307.a, `docs/METHOD/`, 15 modules) and **SprintOS**. Behave consistently with the Antigravity setup in `GEMINI.md`. Honour `SOUL.md` non-negotiables — above all **never use mock data**; wire everything to live HubSpot/Firestore.

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
- Commit after every task: `git add . && git commit -m "feat({scope}): {desc}" && git push`

## Definition of Done

- [ ] Feature works (smoke test) · [ ] critical-path tests pass · [ ] TypeScript strict (no `any`)
- [ ] i18n EN/FR externalized · [ ] no lint errors · [ ] task report in `reports/`
- [ ] committed + pushed · [ ] Vera review → `☑️` · [ ] `STATE.md` updated if objective completed

## Skills ↔ your workflows

Claude Code uses **skills** as entry points. Mapping to your Antigravity slash-commands:

| Skill | Use it for | ~ Antigravity |
|:--|:--|:--|
| `/implement-plan` | Execute a plan / sprint task to completion | `/task-start`, `/sprint-loop` |
| `/sprint` | Create / audit sprint folders & tasks | `/sprint-plan`, `/sprint-close` |
| `/ship-check` | QA gate before deploy (incl. mock-data check) | Definition of Done |
| `/deploy` | Build + Firebase deploy + verify | — |
| `/ux-review` | Multi-persona UX/UI audit | Vera/Nova review |
| `/hubspot-sync` | Pull live HubSpot → Firestore | data rules |
| `/media` | Search / create / resize / export visual assets (Nova-owned) | — |

> Keep responses lean: reference METHOD files, don't paste them. Use Flash-tier reasoning for planning/UI/i18n; reserve deep reasoning for architecture & security.

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
