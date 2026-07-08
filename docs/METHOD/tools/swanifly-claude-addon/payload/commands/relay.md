---
description: Relay — the dropoff half of handoff: flush the current conversation's live working-state into STATE.md and emit a pasteable Relay block before the window ends
argument-hint: [optional workstream label]
---

# /relay — hand off the current workstream (alias /handoff)

The inverse of `/brief`. `/brief` **picks up** — it rehydrates a fresh conversation from git +
`STATE.md` + memory. `/relay` **drops off** — it captures the volatile state a new conversation
cannot reconstruct from the diff (decisions made, dead ends tried, the exact next action), writes it
to the durable substrate, and prints a block you can paste into the next window. Standing order:
don't wait for the operator to restate the schema below.

## When NOT to relay
Hand off **only at a clean boundary** — when the work already lives in git + `STATE.md` + the task
report. Never mid-thrash: a premature Relay costs more in re-exploration than it saves. If state
isn't committed yet, finish the slice (or run `/ship`) first, then relay.

## Steps
1. **Assemble the Relay** — fill each row from the live conversation, tersely (pointers, not payloads):
   - **But** — the goal in one line + the "done" test.
   - **Acquis** — decisions settled and what now works (the token-saving row — prevents re-derivation).
   - **État** — files touched, tests status, last commit hash (`git log -1 --oneline`).
   - **Charge** — *load these next*: `project/STATE.md`, the task file, 2–3 key sources. Pointers only — never paste file contents.
   - **Prochaine** — the exact next action.
   - **Pièges** — dead ends already tried, what NOT to re-touch.
2. **Persist to STATE.md** — write/replace the `## Resume here` section near the top of
   `docs/project/STATE.md` with the same six rows, so `/brief` finds it for free (`STATE.md` is
   already auto-loaded). One `## Resume here` block per app; overwrite the previous one.
3. **Emit the block** — print the Relay as a fenced, copy-paste-ready block for the next window.

Then report **Done / State / Next**.

> **Relay ≠ memory.** Memory holds durable cross-session facts about the user/project; a Relay is
> volatile per-workstream resume state, owned by `STATE.md`. Don't write workstream state into
> memory, and don't promote user/project facts into the Relay.
> **Fewer Relays:** route residue-heavy exploration/research through sub-agents (Iris / Explore) that
> return conclusions only — the main context stays lean, so a handoff carries less and happens less often.
