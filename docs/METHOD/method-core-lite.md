# METHOD Core — Lite (Token-Optimized)

**Version:** 315.a-lite  
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

Close every substantial answer with the **Debrief** card — the operator must never have to ask where
the global project stands or what he has to decide. Canonical spec (template, hard rules, cadence):
**`method-core.md` → "Operator Reporting"**.

```text
DEBRIEF · <lane>                                          <glyphe>
<Une ligne : ce qui vient d'être fait.>

Avancement   <barre>  <n/N unité>  ·  <fait git/PR/test réel>

À RETENIR
 • <fait clé, une ligne>
 • Décidé pour toi : <choix réversible pris sans demander>

TU DÉCIDES
 • <question>   reco → <option recommandée>

SUITE
 → <la prochaine action utile>
```

- ≤ 16 lines, ≤ 68 characters per line, one idea per bullet. **No wrapping paragraph in the card.**
- `Avancement` = the global project, not the turn. Ratio only when actually counted; never invented.
- Nothing to decide → `TU DÉCIDES  rien — j'ai tranché : <x>, <y>`. Then the `▶ Prompt suivant` block.
- Small answer → one landing line instead. Delegated sub-agents never emit a Debrief.

## Sessions

**Un sprint = une conversation = une branche = un worktree.** Défaut : sous-agent dans la
conversation du sprint. Nouvelle session seulement si un fait est **déjà** survenu : 3e boucle
build→test→fix sur la même carte · carte dans un autre repo · sa propre boucle déploiement+vérif avec
l'opérateur · deux cartes qui écrivent du code en parallèle (chacune sa branche `sprint/{NNN}-{seq}`
+ son worktree). Jamais sur la taille ou l'estimation. Deux sessions sur une même branche : le push
de la seconde est rejeté et **avalé** par les hooks `Stop` — le travail paraît à l'arrêt.
Titres ASCII, numéro d'abord. Règle complète : `sprints-method.md` → "Conversation Naming".

## Git

- Format: `type(scope): message` (feat/fix/chore/docs/test/refactor)
- Branch per **slice** (what one conversation can finish): `feat/{sprint}-{seq}-{scope}`
- **Land, don't ship.** Close the conversation with `npm run land` (`/land`) — it verifies, then
  fast-forwards `main`. `main` is the deploy. The operator never manages PRs.
- There is no CI and no branch protection on this account, so the gate is local and machine-checked:
  `.claude/hooks/verify-gate.mjs` stamps a HEAD-pinned green marker, `.claude/hooks/land.mjs` refuses
  to land without it. Never force-push, never `git rebase`, never `gh pr merge --admin`.
- A **PR is the exception**: schema/rules · auth/secrets · `SOUL.md` · deps/lockfile · migrations ·
  deploy wiring · >60 files · `[no-auto-merge]`/`Needs decision`. Held back → fix the reason, or land
  it with `[land-anyway]` in the commit subject and say why.

---

**Full reference:** `docs/METHOD/method-core.md`
