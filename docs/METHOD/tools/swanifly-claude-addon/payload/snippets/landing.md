## Landing & conversation size (non-negotiable)

> Canonical: `docs/METHOD/method-core.md` → "Landing (the default) & the exception list" + "Slice discipline".
> Synced from the METHOD hub — change it there, never in an app.

**The operator does not manage pull requests.** Every conversation ends by landing on the trunk
(`main`; `land.mjs` reads it from `origin/HEAD`, so a `master` repo lands the same way), and the
result is **LANDED** — `DEPLOYED` and `PROVEN` need their own evidence (a served revision, an observed
run): there is no CI on this account, and `land.mjs` deploys nothing. A PR is the **exception** — the
artifact of a decision only the operator can make — never the normal path.

- **One conversation = one slice = one landing.** A slice is what this window can finish *and* land.
  Nothing landed and the context is filling up? The slice was too big: land what is green, then stop.
- **Close with `/land`**, not `/ship`. `.claude/hooks/land.mjs` fetches the trunk, scans the diff
  against the exception list, merges the trunk in, runs `.claude/hooks/verify-gate.mjs`
  (lint · typecheck · tests · build, per lane), and fast-forwards the trunk. An open PR for the branch
  closes itself as merged.
- **The gate is machine-checked, local, and fails closed** — a green marker must be pinned to the
  current HEAD sha, and (since 318.a) a **newly added** intervention or task file must carry
  `**Journey:**` + `**Proof:**`. There is no CI (GitHub Actions is billing-blocked on this account, by
  choice) and no branch protection; this gate is the only brake. Never `gh pr merge --admin`, never
  force-push, never `git rebase`, never check out `main`.
- **Exceptions (→ PR + `### Needs decision`):** schema/Firestore rules · auth, secrets, middleware ·
  `SOUL.md` · dependency or lockfile changes · migrations · deploy wiring · >60 files or >2000
  deleted lines · `[no-auto-merge]` / `[wip]` / `[hold]` / `Needs decision` in a commit · `wip` branch.
  Held back for a reason that is genuinely harmless? Land it with **`[land-anyway]`** in the commit
  subject and say why in the report.
- **It also happens on its own:** the `Stop` hook lands the docs/tooling lane after every turn; the
  `SessionEnd` hook attempts a full land when the conversation ends. `npm run land:sweep` reports every
  open PR and what blocks it — run it when PRs have accumulated.
- **Token economy:** a PR is a token liability — it means the work comes back in a new window with the
  context re-derived. Landing is what keeps conversations short. Route residue-heavy exploration to
  sub-agents that return conclusions only.
