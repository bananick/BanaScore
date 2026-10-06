---
description: Open and run a METHOD intervention — a targeted fix/analysis outside a sprint
argument-hint: [what's wrong / the goal]
---

Handle this intervention: $ARGUMENTS

0. **🎯 Cadrage** — one `AskUserQuestion` (≤ 4 questions, recommended answer first) fixing **Journey**
   (which `docs/project/journeys/{cuj}.md` this closes), **Proof** (which observed run, environment,
   real data proves it), and **out-of-scope**. Skip only for a genuine one-line fix.
1. Create `docs/project/interventions/YYYY-MM-DD-{agent}-{topic}.md` stating: trigger, root-cause hypothesis, scope, plan, and the `**Journey:**` / `**Proof:**` answers from the Cadrage — `/land` refuses a new intervention file without them.
2. Route to the right subagent via the `Agent` tool — **watson** (bugs/ops), **brian** (code, incl. mobile and AI wiring), **nova** (design), **gordon** (offer, funnel, copy, ads), **iris** (study, data, client deliverable), **kasper** (security), **lucia** (METHOD), **junia** (when it needs a plan first).
3. Keep it a minimal, reviewable change — one concern. **Surface any data-model / scope / irreversible change to me instead of deciding it.**
4. Append the outcome (root cause · fix · verification) to the intervention doc. One land (`/land`); a PR only if the landing gate holds it back.
5. **✅ Recette** — before reporting: the recette table (each deliverable asked at Cadrage → shown or not), **vera**'s one review of the slice (opus), the four states `CODED`/`LANDED`/`DEPLOYED`/`PROVEN` (never merged — `PROVEN` only on **sage**'s observed run of the Proof), and if `PROVEN` is claimed, one `AskUserQuestion` — **accept / reopen / defer** — with a ≤ 3-minute test script.

Report per the Communication Contract.
