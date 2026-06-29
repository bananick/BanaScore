---
description: Ship the current work — commit, push, and open/update the PR in one step (deploy happens on merge)
argument-hint: [optional commit subject]
---

Ship the current change so the operator never has to order each step:

1. **Commit** — stage and commit with a conventional message. Use "$ARGUMENTS" as the subject if provided; otherwise derive a concise `type(scope): summary` from the diff. Follow the Definition of Done first (tests/typecheck where applicable).
2. **Push** — push the feature branch (`git push -u origin <branch>`). **Never** push to `main`/`master`; **never** force-push.
3. **PR** — if no PR exists for the branch, open one to `main` (ready for review, not draft) with the Communication Contract header in the body; otherwise update the existing PR.

Then report **Done / State / Next**.

> **Deploy is NOT done here.** It happens automatically on **merge to main** (your review/Kill gate is the trigger) — see `docs/cicd/DEPLOY.md`. Pushing is also auto-handled by the `Stop` hook (`.claude/hooks/ship-push.sh`); `/ship` is the explicit one-shot when you want commit + PR in a single step.
