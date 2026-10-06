---
description: Plan a sprint (the exception mode) — Cadrage with the operator, then Junia decomposes the brief into a sprint folder + ordered task files
argument-hint: [brief, or path to a CUJ/feature doc]
---

Plan a sprint from this brief: $ARGUMENTS

A sprint is the **exception** — only for genuinely multi-task, pre-planned work (`CLAUDE.md` →
"Work Modes"). A single fix, screen or analysis is an `/intervention`.

1. **🎯 Cadrage — you run it, not Junia** (a sub-agent cannot ask me): one `AskUserQuestion`
   (≤ 4 questions, recommended answer first) fixing the **Journey** (existing `journeys/{cuj}.md`, or
   a new one from `CUJ-TEMPLATE.md`), the **Proof** and the **out-of-scope**. If useful, have the
   **junia** subagent draft the questions first.
2. Use the **junia** subagent with the brief + my answers. Junia must, in order:
   - Check the next sprint number in `docs/sprints/`; confirm STATE/VISION/DESIGN/SCHEMA are current.
   - **95% Certainty Gate** — return any remaining scope questions instead of a plan.
   - Create the sprint folder + 3–7 task files (`{sprint}-{seq} ⬜ {Agent} - {title}.md`), each with
     `**Journey:**` + `**Proof:**` in its header (`/land` refuses a new task file without them), goal,
     acceptance criteria, owner, entry files, and a **model tier** (`Tier: T1|T2|T3` — judge / build /
     mechanical; see `routing-method.md` → "Model Routing").

Stop after planning for my review — do **not** execute tasks yet. Report per the Communication Contract.
