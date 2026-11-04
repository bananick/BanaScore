# METHOD Core — Lite (Token-Optimized)

**Version:** 339.a-lite  
**Purpose:** Essential rules only. Use full `method-core.md` for architectural or security-sensitive tasks.

---

## Hierarchy of Truth

```
METHOD > VISION > PLAN > FOCUS > TASK > CODE
```

## Tech Stack

- **Web:** Next.js (App Router), TypeScript, Tailwind CSS + MD3, Firebase (Firestore/Auth/Functions), Vitest + Playwright, next-intl (EN/FR)
- **Hosting:** Firebase App Hosting in `europe-west1` / `europe-west4`

## Data Rules

- Tenant-scoped: `teams/{teamId}/...`
- Membership: `teams/{teamId}/members/{uid}`
- Zod validation required: `schema.parse(data)` before every `setDoc()`
- Update `project/SCHEMA.md` when collections/fields change

## Definition of Done

One canonical list: **`method-core.md` → "Definition of Done"** (9 standard items + the task-specific gates below it). Do not restate it here — this file previously carried an 11-item variant that silently disagreed with the template every task file is generated from.

## The two-moment contract — Cadrage · Recette

The operator is invited in at the two ends only: **🎯 Cadrage** (one `AskUserQuestion` fixing
Journey/Proof/out-of-scope before the first edit) and **✅ Recette** (recette table + the four
states `CODED`/`LANDED`/`DEPLOYED`/`PROVEN`, never merged) before the Debrief. `/land` refuses a
newly added intervention or task file without `Journey:` + `Proof:` (318.a). At the Recette, `vera`
reviews the slice once (opus), `sage` runs the Proof, and an `Appris:` line in a delegate's report goes through
the learning gate (`agents-method.md` → "§ Training"). Canonical spec:
**`method-core.md` → "The two-moment contract — Cadrage · Recette"**.

Questions to the operator are **quizzes, never prose**: prepared in advance and asked with
`AskUserQuestion` (recommended option first), never written as questions in the chat text
(`method-core.md` → "Questions are quizzes, never prose"); beyond 4 decisions, or for a result not built yet, a review page (same file → "When the quiz is too small").

## Code Conventions

- **Components:** PascalCase, **Utilities:** camelCase, **Constants:** SCREAMING_SNAKE_CASE
- `import type {}` for type-only imports
- Max 200 lines/file, 40 lines/function
- Server components default, `'use client'` only when needed
- Named exports, no barrel `index.ts`
- No `any` — use `unknown` + type guards
- No `as` assertions — use `satisfies`
- No `eval()`, no `dangerouslySetInnerHTML`

## Security Essentials

- Never commit secrets (use `.env.local`)
- No AI keys in `NEXT_PUBLIC_*` or `VITE_*`
- `enforceApiGuard()` on POST/PUT/DELETE routes
- Firestore rules: default-deny first
- Firebase App Check required in production

## Operator Reporting

Close every substantial answer with the closing of its **session type** (330.a) — the operator must
never have to ask where the project stands or what he has to decide. **Plain markdown, never a fenced
block.** Canonical spec: **`method-core.md` → "Operator Reporting" → "Closing by session type"**.

**Every answer that did something ends with Fait / Suite (335.a)**: plain bold headings, 1–3 emoji
bullets each. Each Fait line carries one clickable proof. Suite bullet 1 is the **fate**: 🗄️ Archive ·
💬 Réponds · 🧪 Teste · 🔑 Agis · ⏳ Attends · 🔁 Continue ici, each with its « Prêt pour toi » kit. The
title carries the state word (CODÉ · ATTERRI · DÉPLOYÉ · PROUVÉ · en cours · bloqué), and 🚨 on an
incident. A choice → the quiz, never prose. Commands are fenced as `bash`.

Autonomous mission → mission card (≤ 9 lines: title, 📸 proof, Fait, Suite); must act → 🔑 a prepared path;
chantier supervisor → control tower; handoff / `/brief` → the full Debrief. Templates: `method-core.md` →
"Closing by session type".

---

### Debrief · {lane} · {ÉTAT}

{Une ligne : ce qui vient d'être fait.}

**📊 Avancement** — 🟩🟩🟩⬜⬜ {n/N journeys proven} · {state: CODED · LANDED · DEPLOYED · PROVEN}

**Fait**
- {emoji} {fait clé} · {preuve cliquable}
- 🤝 **Décidé pour toi** — {choix réversible, seulement s'il y en a un}

**⚖️ Tu décides**
- {question} → **reco :** {option recommandée}

**Suite**
- {fate} : {la prochaine action utile}

---

- One idea per bullet, **no paragraph in the card**; six blocks max, an empty one is deleted.
- **Chaque ligne gagne sa place** : elle change une décision, une action, ou un modèle mental — sinon
  elle saute. Nomme l'objet (`method-core.md:393`, `npm run doctor`, `afd4cd7`), jamais l'activité.
- Section emojis are fixed landmarks (📊 ⚖️ 🔎 ⚠️); the title carries the state word, not an emoji.
- `Avancement` = the global project, not the turn. Ratio only when actually counted; never invented.
- Nothing to decide → `**⚖️ Tu décides** — rien. J'ai tranché : X, Y.` Then the `▶ Prompt suivant`
  block (none in a chantier: the supervisor's `Suite` names the action it takes itself), the only
  fenced thing in a closing.
- Small answer → two lines, no headings: `{emoji} {fait}` / `{fate emoji} **{Verbe}**`. Delegated sub-agents never emit a Debrief, nor does a
  chantier sub-session — it updates its fiche (`sprints-method.md` → "The chantier").

## Sessions

**Une slice = une conversation = une branche = un worktree.** Défaut : sous-agent dans la
conversation. Nouvelle session seulement si un fait est **déjà** survenu : 3e boucle
build→test→fix sur la même carte · carte dans un autre repo · sa propre boucle déploiement+vérif avec
l'opérateur · deux cartes qui écrivent du code en parallèle (chacune sa branche + son worktree).
Jamais sur la taille ou l'estimation. Deux sessions sur une même branche : le push de la seconde est
rejeté et **avalé** par le hook `Stop` — le travail paraît à l'arrêt. Aucune convention de titre de
conversation. ≥ 2 slices qui écrivent du code → **chantier** (une session de supervision + une
sous-session par slice). Règle complète : `sprints-method.md` → "Sessions & branches".

## Git

- Format: `type(scope): message` (feat/fix/chore/docs/test/refactor)
- Branch per **slice** (what one conversation can finish): `{type}/{scope}` (cloud sessions: `claude/{concern}`)
- **Land, don't ship.** Close the conversation with `npm run land` (`/land`) — it verifies, then
  fast-forwards `main` (or the repo's trunk). That is **LANDED**: `DEPLOYED` and `PROVEN` need their
  own evidence (a served revision, an observed run). The operator never manages PRs.
- There is no CI and no branch protection on this account, so the gate is local and machine-checked:
  `.claude/hooks/verify-gate.mjs` stamps a HEAD-pinned green marker, `.claude/hooks/land.mjs` refuses
  to land without it. Never force-push, never `git rebase`, never `gh pr merge --admin`.
- A **PR is the exception**: schema/rules · auth/secrets · `SOUL.md` · migrations · deploy wiring ·
  `[no-auto-merge]`/`Needs decision`. Held back → fix the reason, or land it with `[land-anyway]` in the
  commit subject and say why. `kasper` (opus) clears what he can; the rest is one quiz (336.a).
- **Finished → close yourself** (336.a): `node .claude/hooks/session-close.mjs --apply`, Fait / Suite to the parent,
  `archive_session self` last — `method-core.md` → "Closing a finished sub-session", "Exception PRs".

---

**Full reference:** `docs/METHOD/method-core.md`
