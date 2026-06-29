# BanaShare — Agent Instructions

> Cross-tool instructions shared across Antigravity, Cursor, and Claude Code.
> For AG-specific instructions, see `GEMINI.md` (takes precedence).
> Shared identity, voice & non-negotiables: see `SOUL.md`.

## Tech Stack

- **Framework:** Next.js 15 (App Router)
- **Language:** TypeScript strict mode — no `any`, no `as` assertions
- **Styling:** Tailwind CSS + CSS custom properties (Proto-Kit tokens)
- **Auth:** Firebase Authentication
- **Database:** Firestore (multitenant — `teams/{teamId}/*`)
- **Storage:** Firebase Storage
- **Functions:** Cloud Functions (Node.js)
- **i18n:** next-intl (EN/FR baseline)
- **Validation:** Zod schemas = single source of truth
- **Icons:** Lucide (primary), Material Symbols (legacy)
- **Font:** Inter (primary typeface)
- **Design:** Material Design 3 (M3) mandatory baseline

## Code Rules (non-negotiable)

- No `any` — use `unknown` + type guards
- No `as` assertions outside test files — use `satisfies`
- Zod schemas for ALL Firestore writes: `schema.parse(data)` before `setDoc()`
- `import type {}` for type-only imports
- Max 200 lines/file (soft), max 40 lines/function (soft)
- Max 3 levels JSX nesting — deeper = extract component
- Named exports for non-page files
- Server components by default — `'use client'` only when needed
- No `eval()`, no `dangerouslySetInnerHTML` without sanitization
- `NEXT_PUBLIC_*` = client-safe only

## Architecture

- Feature-first folders: `src/features/{feature}/`
- Shared logic in `src/lib/`, shared UI in `src/components/`
- Firestore access ONLY through `src/lib/firebase/`
- API routes: thin controllers → service functions in `src/lib/services/`
- No barrel exports (`index.ts` re-exports) — breaks tree-shaking
- No circular imports
- One concern per file

## Design Language

- **Gradient-forward:** Primary CTAs use `linear-gradient(135deg, var(--pri), var(--pri2))`
- **Icons inline:** Always icon + label together
- **CSS Variables:** Never hardcode colors — use `var(--bg)`, `var(--pri)`, `var(--text)`, etc.
- **Rounded corners:** 12-16px cards, full for pills
- **Dark mode:** Required
- **Typography:** Inter, bold headings (700-800), light body (400)

## Performance

- `next/image` always, never raw `<img>`
- `next/dynamic` for heavy components
- `Promise.all` for independent async ops
- Error boundaries at route level (`error.tsx`)
- Loading states at route level (`loading.tsx`)

## i18n

- EN/FR baseline for all user-facing text
- Translation keys in `messages/{locale}.json`
- Use `useTranslations()` hook in components

## Accessibility (WCAG AA)

- Color contrast: 4.5:1 text, 3:1 UI components
- Touch targets: min 48x48px
- Keyboard navigable, focus rings visible
- `aria-label` on standalone icons
- Respect `prefers-reduced-motion`
