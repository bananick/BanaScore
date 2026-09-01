---
description: Land the current work on main — commit, verify, merge. The default close of every conversation (no PR unless something is held back)
argument-hint: [optional commit subject] [--sweep] [--dry-run] [--force-land]
---

Close this slice by **landing it on `main`**. The operator should never have to open GitHub.

`main` is the deploy, and there is no CI on this account — so the gate is local and machine-checked
(`.claude/hooks/verify-gate.mjs` stamps `.method/verify-ok.json` pinned to HEAD;
`.claude/hooks/land.mjs` refuses to land without a green marker at the current commit).

## Steps

1. **Commit** — stage and commit with a conventional message. Use "$ARGUMENTS" as the subject when
   given, otherwise derive a concise `type(scope): summary` from the diff. Run the Definition of Done
   first. Never `git add -A` over someone else's in-flight work in a shared worktree.
2. **Land** — run it and read the verdict:

   ```bash
   npm run land
   ```

   That fetches the trunk, scans the diff for exceptions, merges `origin/main` in (never rebases),
   runs the verify gate, and fast-forwards `origin/main` to HEAD. Any open PR for the branch closes
   itself as merged.
3. **Report** — **Done / State / Next**, quoting the landed sha, or the exact reason it was held back.

## When it is held back

The gate is fail-closed. It stops and opens (or comments on) a PR when the diff touches the
**exception list** — schema/Firestore rules · auth, secrets, middleware · `SOUL.md` · dependency or
lockfile changes · migrations · deploy/CI wiring · more than 60 files or 2000 deleted lines ·
a commit saying `[no-auto-merge]`, `[wip]`, `[hold]` or `Needs decision` · a `wip` branch name —
or when verify is red, absent, or stale, or the trunk conflicts.

Then: **fix the reason, don't route around the gate.** Two legitimate outs, both explicit:

- the change genuinely needs the operator's eyes → leave the PR, and surface it in a
  `### Needs decision` block with a recommendation. This is the *only* time a PR is correct.
- the exception fired on something harmless (a `scripts`-only `package.json` touch, a large but
  mechanical rename) → say so in the report and land it with `[land-anyway]` in the commit subject.

Never `gh pr merge --admin`, never force-push, never `git rebase`, never check out `main`.

## Also

- `npm run land:sweep` — every open PR with what blocks it; `land:sweep:apply` squash-merges the clean
  ones. Run it when PRs have accumulated; nothing should sit open for more than a few days.
- `npm run land:dry` — full gate, no push. Use it when you want the verdict before committing to it.
- Landing happens on its own too: the `Stop` hook lands the docs/tooling lane after every turn, and
  the `SessionEnd` hook attempts a full land when the conversation ends. `/land` is the explicit one
  for app code at slice close — don't wait for the hook when you know the slice is done.
