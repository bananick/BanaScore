---
description: Projects — the fleet board (hub only). Rebuild the snapshot from every chantier fiche on the machine, republish the desk artifact at the same URL, and relay the operator's unrelayed answers to their sub-sessions.
argument-hint: [optional: an app name to look at first]
---

Run the fleet board. $ARGUMENTS

The contract — discovery, fallback rules, the `fleet-board/1` snapshot, the relay — is
`docs/METHOD/templates/fleet-board.md`; the doctrine is `docs/METHOD/sprints-method.md` → "The chantier" (inbox rule 1,
337.a). **Follow them, do not restate them here.** This session reads fiches and relays answers; it **never writes a fiche**
and never edits an app.

0. **Hub only.** `scripts/build-projects.mjs` must exist in this repo; in an app it does not — say so and stop.
1. **Build.** `node scripts/build-projects.mjs --fetch`. It writes `docs/projects/snapshot.json` and `docs/projects/index.html`
   (both gitignored). A non-zero exit or an `errors[]` entry is reported as is, with the app it names — never smoothed over.
2. **Republish the desk, same URL.** Publish `docs/projects/index.html` with the Artifact tool. The artifact id lives in
   `docs/projects/artifact.local.json` (gitignored): present → **update that artifact**, never create a second; absent → create
   it once and write the id there. The desk's answer db (`answers`, `relayed`, `relayedAt`) survives the republish.
3. **Relay.** Read the db: every **unrelayed** answer (`!relayedAt || relayedAt < at` — an answer changed after a relay
   counts again) goes out as **one typed `SendMessage`** — `DECISION d2 = o2 (« <option label> ») — note · via board` ·
   `ACTION a1 = done · via board` (or `not-yet`) · `REVIEW r1 = accept (« Accepter ») — note · via board`; the label
   (≤ ~80 chars) always rides beside the id, because string options only have a synthetic id and the sub-session matches on
   the label — to the
   slice's sub-session by its `ListAgents` name (resolved from `list_sessions`: the fiche's `session`, else the slice code in
   group `{app} · {chantier}`), else to the chantier's supervisor; then set `relayed` / `relayedAt`. No live addressee → the
   answer stays unrelayed and is named in the report. « Envoyer » on the desk (`comments.sendToClaude`) wakes this step.
4. **Read back.** On the next build, a relayed card turns « relayé » only when its fiche's `answeredAt` is at or after the
   click (fleet-board §4). A card still `envoyé` after its sub-session went idle is named in the report.
5. **Close** with the card of the session type (`method-core.md` → "Closing by session type"): the artifact URL first, then
   per app one line — open blocking cards, stale slices, invalid fiches (count) — every figure from the snapshot.
