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

- [ ] Feature works (smoke test)
- [ ] Unit tests for critical paths
- [ ] Typecheck passes (no `any`)
- [ ] EN/FR i18n strings externalized
- [ ] No linter errors
- [ ] Zod schemas match Firestore (if data touched)
- [ ] Schema.md updated (if changed)
- [ ] Empty/error/loading states handled
- [ ] Task report appended
- [ ] Review Gate passed (Vera)
- [ ] Committed + pushed

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
- CI must pass before merge to `main`

---

**Full reference:** `docs/METHOD/method-core.md`
