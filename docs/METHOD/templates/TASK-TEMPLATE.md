# TASK ⬜ — <Agent> — <short-title>

> Canonical sprint task template. Copy into `docs/sprints/{sprint}/`.

## Header
- **Sprint**: <###>
- **Task**: <###-a>
- **Agent**: <Brian|Teddy|Watson|Aiko|Gordon|Sage|...>
- **Tier**: <T1 judge/plan/review/security | T2 build/tests/ops | T3 mechanical> (model routing — see `routing-method.md` → "Model Routing")
- **Prerequisites**: <none | list task ids that must be ☑️>
- **Status**: ⬜
- **Created**: YYYY-MM-DD

---

## Context

### What
<What are we building?>

### Why
- **ROADMAP**: <link/section>
- **CUJ**: <link/step>
- **Success state**: <what does “done” feel like to user?>

### Where
- <files/paths likely touched>
- <services (Firebase Console / Functions / etc.)>

---

## Multitenancy (Default)

> Every app is multi-tenant by default. If this task touches tenant-scoped data, be explicit here.

- **Tenant noun**: team
- **Tenant route** (web): `/t/{teamId}/...`
- **Tenant-scoped data**: `teams/{teamId}/...`
- **Membership gate**: `teams/{teamId}/members/{uid}`
- **Cross-tenant**: Not allowed unless explicitly stated + reviewed (Kasper/Vera)

---

## Pre-Flight Checklist

**Before starting, verify:**

- [ ] CUJ Precision Gate validé pour ce CUJ (`journeys/{cuj}.md` → section Precision Gate ✅ + validation humaine)
- [ ] Acceptance criteria are clear (no >5% uncertainty)
- [ ] Required project/ docs are current (VISION, DESIGN, etc.)
- [ ] Previous task in sequence is `☑️` validated (if prerequisites exist)
- [ ] Entry files loaded

**If any fails:** Stop. Update docs or clarify with Junia before proceeding.  
**CUJ Precision Gate absent ?** → Déclencher April en mode CUJ Definition Session.

---

## Acceptance Criteria

- [ ] <criterion>
- [ ] <criterion>

### Tenant isolation checks (if applicable)
- [ ] Reads/writes are scoped to `teams/{teamId}/...` (no root tenant collections)
- [ ] Membership verified (server code and/or Firestore rules)
- [ ] No cross-tenant queries (no accidental `collectionGroup()` / broad reads)

---

## DoD

**Standard DoD for all tasks:**

- [ ] Feature works (smoke test)
- [ ] Unit tests for critical paths
- [ ] Typecheck passes (no `any`)
- [ ] EN/FR i18n strings externalized (if UI)
- [ ] No linter errors
- [ ] Report appended
- [ ] Review Gate passed (Vera) → task marked `☑️`
- [ ] Committed to git

**Additional quality measures** (add as needed):
- [ ] Integration/E2E tests for critical journey
- [ ] Firestore rules least-privilege (if touched)
- [ ] a11y audit (WCAG AA) for public-facing features
- [ ] Performance budgets met (if critical path)

---

## Entry Files

**Load before starting:**
- <docs/METHOD/...>
- <docs/project/...>
- This task file

---

## Report

### <Agent> Report — YYYY-MM-DD

**Completed:** Yes/No  
**Duration:** <estimate>

#### What I Did
1. ...

#### Tests Added/Updated
- ...

#### Security / Tenant Notes
- ...

#### i18n Notes (if UI)
- ...

#### Issues / Follow-ups
- ...

---

**Status updated to:** ✅

