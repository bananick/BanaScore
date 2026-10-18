---
description: Project — open a chantier by the contract: Cadrage, partition map, sidebar group, one task chip per slice, then run the supervisor loop.
argument-hint: [chantier name or the workstream in a few words]
---

Open a chantier for: $ARGUMENTS

A chantier is a workstream of ≥ 2 code-writing slices: **this session becomes its supervisor** (opus,
writes no code) and each slice runs in its own sub-session. The doctrine is
`docs/METHOD/sprints-method.md` → "The chantier" (partition map, fiche, inbox, sub-session contract,
supervisor loop) and "Sidebar contract" — **follow it, do not restate it here.**

0. **Refuse if nested.** `get_session` on `self`: a `parentSessionId` with `detached: false` means
   this session was born from another session's task chip and would move with it ("Sidebar contract",
   rule 5). **Stop** and tell the operator: start `/project` from a fresh top-level session, or
   Detach this one to top level first (only he can). Do nothing else.
1. **Cadrage — one `AskUserQuestion`** (≤ 4 questions, recommended first): the **journey** the
   chantier closes, the **proof** (an observed run, on which environment, with which real data), the
   **out-of-scope**, and the **slices** — each with its agent and `plan-first` yes/no. Write the
   answers where the doctrine says (`Journey:` / `Proof:`) before the first edit.
2. **Partition map.** Write `docs/chantiers/{chantier}/README.md`: one row per slice — slice · agent ·
   object · branch · `touches` · `plan-first` — plus the decisions every slice shares. Two slices never
   share a `touches` glob.
3. **Sidebar group and own title** (load the tools in one `ToolSearch`: `create_section`, `set_view`,
   `move_sessions`, `set_pinned`, `set_session_title`, `spawn_task`). `create_section` `{app} · {chantier}`;
   `set_view` `group_by: "none"`, `sort_by: "alpha"`; `move_sessions` self into it; `set_session_title`
   self `🧑‍✈️ {repo icon} {chantier}` (icon from `docs/METHOD/repo-icons.json`); **then** `set_pinned` self
   true — a move un-pins, so the pin comes last.
4. **One task chip per slice** (`mcp__ccd_session__spawn_task`). Its prompt is the **v2 sub-session
   brief**, self-contained: (a) the first action, before any read or edit, is `SendMessage` `adopt
   {slice}` to this supervisor's `ListAgents` name (put the name in the brief); (b) its fiche
   `docs/chantiers/{chantier}/{slice}.json`, `updatedAt` stamped from the real clock
   (`node -e "console.log(new Date().toISOString())"`); (c) **no `EnterWorktree`** inside a worktree
   the app already made; (d) slice-first title `{slice} {avatar} {object} · {state icon}`; (e) **no
   Debrief, no `▶ Prompt suivant`**; (f) a question for the operator goes **only** through the
   fiche's `decisions[]`; (g) its slice's row of the partition map and, when `plan-first: yes`, the
   plan-first first turn. Starting a sub-session is one operator click — say so.
5. **Then run the supervisor loop** ("The chantier" → "The supervisor's loop": adopt, idle notices,
   batches, close each slice, report). Event-driven, never polling; between two notices it does
   nothing. **While it waits on an operator answer it is already pinned**; it appends ` · 🟡` to its
   title right before an `AskUserQuestion` and removes it right after the answer ("Sidebar contract",
   rule 1). Its Debrief is the chantier's only card, without a `▶ Prompt suivant`.

Do not write product code in this session. Do not start a second chantier from it.
