## Communication Contract (how agents report to the operator)

> Synced from the METHOD hub — change it there, never in an app. Canonical:
> `docs/METHOD/method-core.md` → "Operator Reporting".

Optimize for the operator's readability, not for completeness. Lead with the answer; keep process out.

- **Close every substantial reply with the Debrief card.** It answers, without being asked: ce qui vient d'être fait · où ça met le **projet global** (`Avancement`, a real count — never an invented ratio) · ce qu'il faut retenir (dont `Décidé pour toi`) · ce que l'opérateur doit trancher · la suite + le `▶ Prompt suivant`. Rendered as **plain markdown, never a fenced block** (a fence renders small, unstyled and unclickable). Small answer → one landing line (`✅ {fait} · suite → {action}`); nothing done → no card. A delegated sub-agent never emits one — it reports to its orchestrator, which folds every report into a single card.
- **Lead with the answer in chat.** First line of a substantial reply = what changed. The **3-line header** — **Done** (what changed) · **State** (🟢 on track · 🟡 needs your input · 🔴 blocked) · **Next** (immediate step, or `awaiting your call ↓`) — opens **written artifacts**: PR bodies, task reports, sub-agent reports. Never both a header and a Debrief for the same work.
- **Surface decisions, never bury them.** When a choice is the operator's, add a `### Needs decision` block: the question, 2–4 options, **recommendation first**, and carry it into the Debrief's `Tu décides` row. Never decide irreversible / data-model / scope changes yourself — list and stop (the conflict gate).
- **The CUJ is the unit.** Every conversation/sprint/task names the journey(s) it closes; `Avancement` counts journeys proven. States are four and never merged: `CODED` · `LANDED` · `DEPLOYED` · `PROVEN`, each with its own evidence.
- **Be synthetic.** Bullets over paragraphs; one idea per bullet; bold the noun that matters; a table for >3 comparable items. Don't narrate tool calls or re-explain settled context.
- **Show progress** on multi-step work as a checklist (⬜ 🔄 ✅) refreshed in place — not a fresh wall of text each turn.
- **Match depth to stakes.** Routine → the 3-line header suffices. Architectural/irreversible → add a short **Why / Trade-offs / Risks**. Default to less.
- **Flag risk early and plainly** ("this will break X" up front). Report failures with evidence; never imply done when it isn't.
- **Compress the chat, never the artifact.** Terse in conversation; full prose in anything committed: task files, `STATE.md`, PR bodies, `/relay` blocks, EN/FR copy, and Vera/Kasper verdicts. Code, commands, paths, error strings and numbers stay **verbatim** everywhere.

The card — two `---` rules, a status emoji in the title (`✅` fait · `🟡` besoin de toi · `🔴` bloqué · `👀` en observation), fixed section landmarks, six blocks max, an empty block deleted:

---

### ✅ Debrief · {lane}

{Une ligne : ce qui vient d'être fait.}

**📊 Avancement** — 🟩🟩🟩⬜⬜ {n/N parcours prouvés} · {CODED · LANDED · DEPLOYED · PROVEN — l'état atteint, avec sa preuve}

**🧠 À retenir**
- {fait clé}
- 🤝 **Décidé pour toi** — {choix réversible pris sans demander}

**⚖️ Tu décides**
- {question} → **reco :** {option recommandée}

**➡️ Suite** — {la prochaine action utile}

**⚠️ Vigilance** — {un seul risque réel}

---

Every line earns its place — it changes a decision, an action or a mental model — and names the object, never the activity (`method-core.md:393`, `npm run doctor`, `afd4cd7`). Nothing to decide → `**⚖️ Tu décides** — rien. J'ai tranché : X, Y.` Then the `▶ Prompt suivant` block, the only fenced thing in a closing.
