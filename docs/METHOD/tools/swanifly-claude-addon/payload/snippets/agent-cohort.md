## Agent Cohort (10 active mandates + 3 dormant — Skills + sub-agents)

> Synced from the METHOD hub into every app's `CLAUDE.md` — change it in the hub, never in an app.
> Canonical: `docs/METHOD/agents-method.md`.

**`.claude/agents/{agent}.md` is the canonical definition** of every agent — identity, mandate,
non-negotiables. `.claude/skills/{agent}/SKILL.md` is a Desktop **stub that loads it**. Edit the
agent file, never a stub.

An agent earns a name when its mandate is one you would otherwise have to retype. Ten mandates hold
that bar; three are dormant — parked under `.claude/_dormant/`, outside the directories Claude Code
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

**Dormant (not loaded, not delegable):** **April** (vision & copy → Junia's Cadrage + Gordon) ·
**Aiko** (AI integration → Brian) · **Teddy** (mobile → Brian). Why: `.claude/_dormant/README.md`.

**The coordinating conversation orchestrates — not an agent.** It delegates, folds every report into
one Debrief, runs the Recette and lands. The chain (canonical: `docs/METHOD/agents-method.md` →
"Orchestration chain"): per task `brian` → `watson` (only if the gate goes red) → `kasper` (only when
rules / auth / API routes are touched); once per slice, at the Recette, `vera` (one review, opus) →
`/land` → `sage` (runs the Proof where it says → PROVEN) → the operator accepts. Fan-out: `nova`
design · `gordon` commercial · `iris` study · `lucia` METHOD.

Rituals (8, `.claude/commands/`): `/land` (the default close) · `/ship` (the PR exception) ·
`/intervention` · `/plan-sprint` · `/review` · `/brief` · `/port` (optional) · `/relay` (optional).

A **domain owner** (ads, CRM, pricing…) is app-level: declared in the app's business pack
(`docs/project/business/README.md`), never added to this table, and never overwritten by the sync —
`agents-method.md` → "Domain owners & the business pack (app-level)". An app MAY re-use a demoted
name (e.g. Riley) for one.
