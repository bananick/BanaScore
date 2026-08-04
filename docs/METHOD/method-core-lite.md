# METHOD Core — Lite (Token-Optimized)

**Version:** 308.a-lite  
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

## Git

- Format: `type(scope): message` (feat/fix/chore/docs/test/refactor)
- Branch per task: `feat/{sprint}-{seq}-{scope}`
- There is no CI and no branch protection on this account, so nothing checks a merge to `main` — run the checks locally before merging

---

**Full reference:** `docs/METHOD/method-core.md`
