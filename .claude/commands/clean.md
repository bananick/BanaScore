---
description: Clean — run Régine on demand, as a sub-agent (the caller's context stays small): rescue before archive, sidebar contract incl. pin-while-waiting, clocks, WIP limits, regenerable caches.
argument-hint: [weekly] [a repo or a session to look at first]
---

Run the on-demand sessions-and-worktrees pass for: $ARGUMENTS (empty → the full pass).

`/clean` is Régine's pass, started by hand. She is the agent that keeps the Code tab showing only the
work really in progress (`.claude/agents/regine.md`; contract: `docs/METHOD/sprints-method.md` →
"The chantier" → "Sidebar contract"). **The coordinator does not do her work itself** — it hands the
pass to her as a sub-agent so this conversation's context stays small, and relays one short table.

1. **Launch her.** `Agent` with `subagent_type: "regine"` and `model: "sonnet"` (explicit — never
   inherited), and a brief that names the pass and gives **paths, never pasted inventories**: a full
   on-demand pass —
   - **rescue before archive** (a `wip(rescue) … [wip]` commit pushed on the session's own branch;
     a refused push means no archive);
   - the **sidebar contract**, including pin-while-waiting (rule 1, 329.a: pin every session whose
     title ends with `· 🟡` or `· 🔴`, unpin those whose title no longer has it and every supervisor that is
     top-level and filed — a nested supervisor keeps its pin);
   - the **clocks** (a title ending with `· 🟡` or `· 🔴` is never 💤 and never archived — reported when waiting
     > 48 h) and the **WIP limits**;
   - **`fleet-clean --apply --caches-only`** with a protect file built from `list_sessions` (she
     runs the hub's script from `origin/main`; worktrees are removed by `clean_up_worktrees`, never
     by the script);
   - **the weekly-pass table** only if today is Monday or `$ARGUMENTS` says `weekly`.
   Cap her at about 40 tool calls.
2. **Relay her result in ≤ 10 lines** — her `Done / State / Next` and the table, as she wrote them.
   **Never a Debrief card from Régine** (a delegate reports; the coordinator folds).
3. **What she flags for the operator** (`à détacher`, `push refusé`, a WIP limit, a 🟡 waiting
   > 48 h, any deletion she recommends) becomes **one `AskUserQuestion` batch** — at most 4
   questions, recommended option first, one line of consequence each. Nothing flagged → no question.

She archives, never deletes work (integrated branches go through `branch-sweep.mjs` only); she never lands or edits product code. Nothing else happens in `/clean`.
