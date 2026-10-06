---
description: Open a PR for work that must NOT auto-land (the exception path). For the normal close of a conversation use /land
argument-hint: [optional commit subject]
---

> **`/land` is the default. `/ship` is the exception.**
> The METHOD lands finished work straight on `main` — see `.claude/commands/land.md` and
> `docs/METHOD/method-core.md` → "Landing (the default) & the exception list". Use `/ship` only when
> the change genuinely needs the operator's eyes *before* it reaches the trunk: a schema or
> permission change, auth/secrets, a dependency bump, a migration, deploy wiring, or anything you'd
> put in a `### Needs decision` block. Reaching for `/ship` to avoid a red verify gate is the wrong
> move — fix the gate.

Steps:

1. **Commit** — stage and commit with a conventional message. Use "$ARGUMENTS" as the subject if
   provided; otherwise derive a concise `type(scope): summary` from the diff. Definition of Done first.
2. **Push** — push the feature branch (`git push -u origin <branch>`). **Never** push to
   `main`/`master`; **never** force-push.
3. **PR** — if no PR exists for the branch, open one to `main` (ready for review, not draft) with the
   Communication Contract header in the body; otherwise update the existing PR. State **in the body**
   why this is not auto-landing, as a `### Needs decision` block with a recommendation — a PR with no
   stated decision is just a merge you forgot to do.

Then close with the **Debrief** card (`docs/METHOD/method-core.md` → "Operator Reporting") — `Avancement` grounded in the sprint/plan count, `TU DÉCIDES` carrying the decision you need from the operator — followed by the `▶ Prompt suivant` block.

> **Deploy is not done here.** It happens on **merge to `main`** — see `docs/cicd/DEPLOY.md`.
> Pushing is auto-handled by the `Stop` hook (`.claude/hooks/ship-push.sh`), and the landing gate
> (`.claude/hooks/land.mjs`) will keep holding this branch back until the reason is resolved — that
> is the intended behavior for an exception, not a bug.
