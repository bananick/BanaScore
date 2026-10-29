## Landing & conversation size (non-negotiable)

> Canonical: `method-core.md` → "§ Landing (the default) & the exception list", "§ Slice discipline".
> Synced from the METHOD hub — change it there, never in an app.

**The operator does not manage pull requests.** Every conversation ends by landing on the trunk; the
result is **LANDED**, nothing more. **One conversation = one slice = one landing** — nothing landed and
the context filling up means the slice was too big: land what is green, then stop.

- **Close with `/land`** (`npm run land`), not `/ship`: it fetches the trunk, scans the diff against the
  exception list, merges the trunk in, runs the verify gate (lint · typecheck · tests · build, per lane)
  and fast-forwards. There is no CI (`SOUL.md` → Boundaries) — this local gate is the only brake.
- **Four states, never merged:** `CODED` · `LANDED` · `DEPLOYED` · `PROVEN`, each with its own evidence
  (a push · a served revision · an observed run). `land.mjs` deploys nothing.
- **Never** `gh pr merge --admin`, never force-push, never `git rebase`, never check out the trunk.
- **Exceptions → PR + `### Needs decision`:** schema / Firestore rules · auth, secrets, middleware ·
  `SOUL.md` · migrations · deploy wiring · `[no-auto-merge]` / `[wip]` / `[hold]` / `Needs decision` in a
  commit · a `wip` branch. Dependencies and big diffs land alone (332.a).
  Held back for a harmless reason? Land it with **`[land-anyway]`** and say why in the report.
