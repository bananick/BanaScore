---
name: implement-plan
description: >-
  Execute an existing plan or sprint task to completion. Use when the user says
  "implement the plan", "implement the plan as specified", "do the plan", "finish
  the sprint task", or attaches a *.plan.md / docs/sprints task file. Drives the
  existing to-do list end to end without editing the plan, then runs the QA gate.
---

# implement-plan

Encodes the user's standing, verbatim implementation contract so they never have to retype it.

## The contract (always apply)

> Implement the plan as specified. **Do NOT edit the plan file itself.** The to-dos from the plan have already been created — do not recreate them. Mark each **in_progress** as you start it (first one first), **completed** when done. **Don't stop until every to-do is complete.**

## Procedure

1. **Read the plan / task file** in full (`*.plan.md`, `.cursor/plans/*`, or a `docs/sprints/{NNN}/...` task). Treat it as read-only — never modify it.
2. **Use the existing to-do list.** If the harness to-dos already exist, drive them. If a plan lists steps but no to-dos exist yet, create them once from the plan, then proceed.
3. **Execute in order.** Mark in_progress before working an item, completed after. Follow `SOUL.md` + `AGENTS.md` rules while coding (no mock data, Zod writes, strict TS, EN/FR i18n, `next/image`, persona-complete UX).
4. **Don't stop** for confirmation between items — the user has authorized autonomous execution. Keep going until all to-dos are done.
5. **Close out:**
   - Run `/ship-check` (QA gate: build/typecheck/lint, mock-data scan, DoD).
   - For a sprint task, write the report to the `reports/` subfolder and update the status emoji (`⬜`→`✅`), then commit per the sprint convention.
   - Summarize what shipped and any follow-ups — concisely.

## Notes

- If the plan references files that don't exist, skip gracefully (don't invent scope).
- If you hit a genuine blocker that prevents completing a to-do, mark it `⚠️`, record why, and continue with the others rather than silently stopping.
- Respect the hierarchy of truth: `METHOD > VISION > PLAN > FOCUS > TASK > CODE`.
