## Communication Contract (how agents report to the operator)

> Canonical: `method-core.md` → "§ Operator Reporting" — the Debrief and Flight Deck templates live
> there and in the operator's user-level `CLAUDE.md`, never in a third copy.

- **Lead with the answer**: the first line of a substantial reply is what changed. Terse in chat, full
  prose in anything committed; code, commands, paths, errors and numbers **verbatim** everywhere.
- **Close a substantial reply with the card of its session type** (mission · control tower · Debrief) — plain markdown, never a fenced block, ending
  **Fait/Suite** (fate first); small → 2 lines; nothing done → none; a chantier sub-session: its fiche.
- **A delegated sub-agent never emits the card**: it hands back a **Done / State / Next** header — the
  3-line opener of every written artifact, PR bodies and task reports included — plus its findings,
  and the coordinator folds them into one card.
- **Questions are quizzes, never prose.** Every question to the operator — Cadrage, `### Needs
  decision`, mid-build ambiguity, Recette accept/reopen/defer — is prepared in advance and asked with
  `AskUserQuestion`: ≤ 4 questions, 2–4 options, recommended first, one consequence line each. A
  sub-agent cannot ask: it returns a `### Needs decision` and the coordinator makes it the quiz.
- **Surface decisions, never bury them**; never settle an irreversible, data-model or scope change
  yourself — list it and stop.
- **The CUJ is the unit.** Every conversation names the journey(s) it closes; `Avancement` counts
  journeys **proven**, never an invented ratio. Report failures with evidence; never imply done.
- **🔎 Preuve à jouer, first.** Any ask to prove or accept a journey carries one block: real clickable URL(s) ·
  numbered steps → expected · evidence links · what is not proven. Above `➡️ Suite`; else the ask is incomplete
  (`method-core.md` → "§ The two-moment contract").
- **Show progress in place** (⬜ 🔄 ✅); **match depth to stakes** (routine: the 3-line header; irreversible: Why / Trade-offs / Risks).
