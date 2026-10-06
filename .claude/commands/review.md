---
description: Run the Vera review gate — once per slice, at the Recette — against the Cadrage, acceptance criteria + DoD
argument-hint: [sprint number or task id]
---

Use the **vera** subagent (always `model: opus`) to review the slice: $ARGUMENTS

Vera runs **once per slice, at the Recette** — not after every task. She reads the Cadrage (`Journey:` · `Proof:` · deliverables), the acceptance criteria and every commit since the last landing, checks the Definition of Done, and emits a verdict — **APPROVED / APPROVED_WITH_NOTES / REJECTED** — with per-deliverable findings and must-fix items. Vera writes no code (read-only tools).

After Vera returns: persist her verdict in the intervention file (or `<sprint>/REVIEW.md` in sprint mode), set each task status `☑️` (approved) or `⚠️` (must-fix), and report the verdict per the Communication Contract. Do not land while any `⚠️` is unaddressed (Kill Gate).
