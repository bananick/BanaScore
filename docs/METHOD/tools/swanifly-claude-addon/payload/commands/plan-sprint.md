---
description: Plan a sprint — Junia decomposes a brief into a sprint folder + ordered task files
argument-hint: [brief, or path to a CUJ/feature doc]
---

Use the **junia** subagent to plan a sprint from this brief: $ARGUMENTS

Junia must, in order:
1. **CUJ Precision Gate** — if the CUJ is missing or ambiguous, convene **april** and STOP to ask me.
2. Check the next sprint number in `docs/sprints/`; confirm STATE/VISION/DESIGN/SCHEMA are current.
3. **95% Certainty Gate** — batch any scope questions to me and resolve before planning.
4. Create the sprint folder + 3–7 task files (`{sprint}-{seq} ⬜ {Agent} - {title}.md`) with goal, acceptance criteria, test plan, owner, entry files, and a **model tier** (`Tier: T1|T2|T3` — judge / build / mechanical; see `routing-method.md` → "Model Routing").

Stop after planning for my review — do **not** execute tasks yet. Report per the Communication Contract.
