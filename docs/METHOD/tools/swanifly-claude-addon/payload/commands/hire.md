---
description: Hire — give a recurring business domain an owner in this app, put it through its entrance exam and land its dossier. Agathe (opus) brings the evidence and the quiz; the coordinator asks. One spawn per hire, resumed. An agent that does not pay its way is parked later, by the operator.
argument-hint: {domain, e.g. "contract renewals"}
---

Hire an owner for: $ARGUMENTS (empty → ask `agathe` which domain has fired a signal; nothing fired → stop and say so).

**Run this from the coordinating conversation of the target app**, on a branch of that app. No session writes to
another repo: a hire seen from elsewhere is opened in that repo, on the operator's GO. A new agent for the **hub
cohort** is not a `/hire`: Agathe brings Lucia a dossier, Lucia releases and the operator ratifies.

**Launching her.** `agathe` with `model: opus`. If the session does not offer her as an agent type (a session can
register the agents of a main checkout that lags its trunk), launch `general-purpose` with `model: opus` and have it
read `.claude/agents/agathe.md` first. Keep the agent's id: she is **resumed** with `SendMessage`, not respawned. If she
cannot be resumed, respawn her with her last report and the answers, and say so.

## 1. Evidence
She returns H1, then H2 or H3, with sources, and her reading of H4 (`docs/METHOD/agents-method.md` → "§ Hiring an
owner"). Bulk mining goes to `penny` or `iris` on sonnet. **H1 neither counted nor asserted → it is asked first, on its own, and a No stops the hire.** H4 reading "a
skill" or "a carnet for a cohort agent" → no hire, and she says that instead.

## 2. Cadrage
She returns one quiz, ≤ 4 questions, recommended first: name + domain + avatar · the human counterpart · the **Règle
de GO** (which writes need GO, the dry-run, the revert path) · the tier. The coordinator asks it with
`AskUserQuestion`, writes `Journey:` and `Proof:` into `docs/interventions/YYYY-MM-DD-Agathe-hire-{name}.md` before the
first edit, and resumes her with `SendMessage`, context intact.

## 3. The dossier, in one commit (`docs(crew): hire {name}`)

| File | Content |
|:--|:--|
| `.claude/agents/{name}.md` | frontmatter (`name`, a one-line `description`, scoped `tools`, `model` by tier); `## Identity` with the 336.b lines; the run, in order; **`## Charger d'abord`**, whose item 1 is its learning store; **`## Règle de GO`**; **`## Pièges`**, each sourced and dated; **`## Frontières`**; `## Non-negotiables`; its report's `Appris:` line, appended to `docs/project/carnets/{name}.md` → `## Candidats`, or to its registry entry (`docs/METHOD/agents-method.md` → "§ Training") |
| `docs/project/business/README.md` | the domain → owner row (a column named `Agent propriétaire`, with the name in **bold**, since the crew checks read both · avatar · human · file), **plus `Embauché le` and `Statut` (`probation` · `titulaire` · `dormant depuis …`) as its last columns**, and the human-GO rule. The app's **single roster of owners**, app-owned |
| the learning store | a registry for a many-entity domain, otherwise `docs/project/carnets/{name}.md`; seeded from memory and interventions, every fact sourced, everything a candidate |
| `docs/METHOD/app-settings.json` → `claudeAddon.ownedAgents` | the name: the explicit guard, so ownership never depends on a heading alone |
| `CLAUDE.md`, an **app-owned** section | one pointer line, **never** the merged "Agent Cohort" section |
| `.codex/agents/{name}.toml` | only where the app keeps a Codex mirror |

No hub cohort file changes: adding an owner section to one freezes it out of the sync. A hire that holds a secret or a provider write path
goes through `kasper`, who reviews its tools and its GO rule.

## 4. The exam
The hire stays `probation` until it passes.
1. Agathe picks **3 real closed cases** with a known outcome (a success, a dead end, a near-miss) and returns their
   briefs **without the outcomes**. Where she can, she picks cases the seeded store does not already answer, and she says
   when it does: a pass can otherwise measure recall of the store.
2. The coordinator launches the owner on each brief, at the owner's own tier, stating: read-only, no external write,
   return the dry-run you would have proposed. At most 3 runs.
3. The coordinator resumes Agathe with the dry-runs. She grades each: **pass** · **trap hit** (named) · **invented**, and
   records it under `## Épreuves`.
4. Failed: one fix to the agent file or the store, one retry. A second failure becomes a `### Needs decision`.

An exam judges an agent, never a slice, and never moves a journey to PROVEN.

## 5. Check and land
The crew checks run **from a hub checkout at the trunk**, because `scripts/` does not sync to apps: `npm run crew:report --
--repo <path of this app>`, read-only, nothing installed here. If this app's tree lags its trunk, extract the pinned commit
into a scratch folder and add `--memory-repo <real app path>`. **Green** means no `warn` row for the new owner, and its
`Embauché le` and `Statut` filled in. The checks only warn for now: a warn does not hold the landing, and it is said in the
Debrief. Then `/land`, as any other slice.

## 6. The hub
Tell the operator the hire is in place, in the Debrief. Lucia adds the "Known domain owners" row at her **next** release,
batched; nobody edits the METHOD from the app for it.

**Never:** a hire without H1, a lesson without a source, an external write during an exam, a parking by anyone but the
operator.
