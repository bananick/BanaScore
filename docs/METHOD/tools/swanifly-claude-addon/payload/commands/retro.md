---
description: Retro — the weekly coaching pass (or on demand after a slice that closes a journey). Penny's numbers (sonnet), then Oscar (opus) writes docs/project/coaching/RETRO-YYYY-Www.md.
argument-hint: [week, e.g. 2026-W41 — default: the current week]
---

Run the weekly retro for: $ARGUMENTS (empty → the current ISO week, Monday → Sunday).

`/retro` runs **once a week**, or on demand at the Recette of an important slice — one that closes a
journey. **Never once per Debrief:** an opus pass costs ~$2–5 (`docs/METHOD/routing-method.md` →
"Token economy").

**0. Hub only — check first.** `/retro` runs from the Swanifly / Bana-Share hub only: it needs
`npm run doctor:fleet` and `npm run telemetry:report`, which exist only there. If
`scripts/telemetry-aggregate.mjs` or `scripts/method-doctor-fleet.mjs` is missing from this repo, you
are in an app: **stop and say so** — "run `/retro` from the Bana-Share hub; it reads the whole fleet
from there" — and do nothing else.

1. **Numbers first — `penny` (`model: sonnet`).** Ask her for the week's figures, not a report:
   `npm run telemetry:report -- --since <monday> --days 7 --json` → API-equivalent cost, sub-agent opus
   share, truly-unpinned → opus, Workflows, the top sessions and the "Ledger gap". She hands back the
   numbers with their command and window; `inconnu` where a ledger is missing.
2. **The retro — `oscar` (`model: opus`).** Pass him the week, Penny's report, and **paths** — never
   pasted inventories: last week's `docs/project/coaching/RETRO-*.md`, `docs/improvement/ACTIONS.md`,
   and where to read (`npm run doctor:fleet`, `git log --since <monday>` per repo, each app's
   `docs/project/STATE.md` + `FOCUS.md`, the week's `docs/interventions/`). If he needs bulk mining
   (long histories, raw extracts), route it to `penny` or `iris` (sonnet) and give him the conclusion.
3. **Oscar writes** `docs/project/coaching/RETRO-YYYY-Www.md` in the hub — objectives vs journeys
   proven, focus, three sourced observations, one habit to change (and how to check it), 0–2 METHOD
   proposals for Lucia, last week's habit held or not — and commits it `docs(coaching): retro {YYYY-Www}`.
4. **Report** per the Communication Contract: the Debrief carries the habit and the proposals; each
   proposal goes to the operator under `Tu décides` — accepted ones become `ACTIONS.md` rows (Lucia).
   Then `/land`.

Do not edit product code, the METHOD or another app during a retro.
