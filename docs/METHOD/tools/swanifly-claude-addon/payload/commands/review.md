---
description: Run the Vera review gate on the current sprint/task against acceptance criteria + DoD
argument-hint: [sprint number or task id]
---

Use the **vera** subagent to review: $ARGUMENTS

Vera reads the acceptance criteria + changed files, checks the Definition of Done, and emits a verdict — **APPROVED / APPROVED_WITH_NOTES / REJECTED** — with per-task findings and must-fix items. Vera writes no code (read-only tools).

After Vera returns: persist her verdict to `<sprint>/REVIEW.md`, set each task status `☑️` (approved) or `⚠️` (must-fix), and report the verdict per the Communication Contract. Do not merge while any `⚠️` is unaddressed (Kill Gate).
