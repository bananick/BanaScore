---
description: Open and run a METHOD intervention — a targeted fix/analysis outside a sprint
argument-hint: [what's wrong / the goal]
---

Handle this intervention: $ARGUMENTS

1. Create `docs/project/interventions/YYYY-MM-DD-{agent}-{topic}.md` stating: trigger, root-cause hypothesis, scope, and plan.
2. Route to the right subagent via the `Agent` tool — **watson** (bugs/ops/CI), **brian**/**teddy** (code), **nova** (design), **aiko** (AI), **lucia** (METHOD).
3. Keep it a minimal, reviewable change — one concern. **Surface any data-model / scope / irreversible change to me instead of deciding it.**
4. Append the outcome (root cause · fix · verification) to the intervention doc. One PR.

Report per the Communication Contract.
