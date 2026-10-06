---
description: Brief — pick up a fresh conversation from live git state, sprint progress, and project memory. The inverse of /land + /ship's SessionEnd handoff.
argument-hint: [optional focus]
shell: bash
---

## Live context

!`node "${CLAUDE_PROJECT_DIR}/.claude/hooks/flight-deck.mjs" --mode context`

## Instructions

`/brief` is the **pickup** card. Produce the Flight Deck block from the global `CLAUDE.md` "Output
style" format (or, on a surface with no global config loaded, the six-row shape below).

- Use the live context above first. Do not guess git state.
- If `project_memory_dir` is not `none`, read at most two high-signal memory files only when needed.
  Prefer `MEMORY.md` and any file whose name matches `$ARGUMENTS`, the repo, branch, sprint, or
  project surface.
- If `$ARGUMENTS` is present, treat it as the focus lane.
- Render as plain markdown (never a fenced block — see "Operator Reporting" in `method-core.md`):

  ### 🛫 Flight Deck · {projet} — {workstream}

  `{chemin}` · branche `{branch}`

  - **🎯 Enjeu** — pourquoi ça compte, quelle lane
  - **📍 État** — l'état concret : fichiers, tests, runtime, blocages
  - **🔀 Git** — ahead/behind, fichiers modifiés, PR, dernier commit
  - **➡️ Prochaine** — la prochaine action utile
  - **⚖️ Décision** — vrai choix de stratégie, sinon « aucune »
  - **🚧 Éviter** — la contrainte ou le risque à ne pas franchir

- **Close with the Debrief** from `method-core.md` → "Operator Reporting", short, without repeating a
  single Flight Deck line. Its `📊 Avancement` row uses `sprint` + `sprint_progress` from the live
  context above — that is a real count, so render the bar from it. `sprint: none` → say where the
  work sits in words, never invent a ratio. Then the `▶ Prompt suivant` block.
- Do not edit files, commit, push, or run slow verification commands for a brief.
