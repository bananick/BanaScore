---
name: ship-check
description: >-
  Run the QA gate before shipping or deploying. Use when the user says "qa", "is it
  ready", "ship check", "can we deploy", or at the end of implementing a plan/sprint
  task. Runs build/typecheck/lint + the qa report, HARD-FAILS on any mock data, and
  scores against the Definition of Done.
---

# ship-check

The gate every change must pass before `/deploy`. Encodes the 9-item Definition of Done plus the non-negotiables from `SOUL.md`.

## Run, in order

1. **Mock-data scan (hard fail).** Search the app's `src/` for mock/fixture data signals:
   `mockData`, `MOCK_`, `mock`, `/fixtures/`, `faker`, `dummy`, `sampleData`, `placeholder data`, hardcoded sample arrays feeding UI.
   - Any reachable mock data path → **FAIL**. Per `SOUL.md` the app runs on live HubSpot/Firestore only. Report each hit (`file:line`) and remove/replace before continuing.
2. **Typecheck** — `npm run typecheck` (or `npx tsc --noEmit`) in the app. Strict, no `any`. Fail on errors.
3. **Lint** — `npm run lint`. Fail on errors.
4. **Build** — `npm run build` in the app. Must succeed.
5. **QA report** — from repo root, `npm run qa:report` (`qa/build-report.mjs`). Summarize `qa-report/report.json`: requirement coverage (pass/fail/na) and Lighthouse metrics. Flag any failed requirement.
6. **Static checks:**
   - Images via `next/image`, lazy + light — no raw `<img>`.
   - No secret leakage: nothing sensitive under `NEXT_PUBLIC_*`; no keys committed.
   - i18n: user-facing strings externalized, **EN + FR** present.

## Definition of Done (report card)

- [ ] Feature works (smoke) · [ ] critical-path tests pass · [ ] TS strict, no `any`
- [ ] i18n EN/FR · [ ] no lint errors · [ ] **no mock data** · [ ] images optimized
- [ ] task report in `reports/` · [ ] STATE.md updated if objective completed

## Output

A pass/fail verdict up top, then the report card with each item ✅/❌ and a one-line reason for every ❌. If anything fails, **do not proceed to deploy** — list the exact fixes. Keep it tight.
