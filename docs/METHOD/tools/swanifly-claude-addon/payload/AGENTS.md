# BanaShare — Agent Instructions

> Cross-tool instructions shared across Antigravity, Cursor, and Claude Code.
> For AG-specific instructions, see `GEMINI.md` (takes precedence).
> Shared identity, voice & non-negotiables: see `SOUL.md`.

## Model Routing (default: orchestrate high, execute cheap)

> Canonical policy: `docs/METHOD/routing-method.md` → "Model Routing". Tool-agnostic — applies on Cursor, Codex, and any multi-model agent tool.

- **Coordinator high, delegates cheap.** The orchestrating agent runs on the strongest model the tool exposes; every delegated/sub task runs on the **cheapest model that meets its quality bar**.
- **Tiers:** **T1** judge/plan/review/security → strongest reasoning model (Fable/Opus/GPT-5.x-class) · **T2** build/tests/ops → mid-tier coding model (Sonnet-class) · **T3** mechanical (scaffolding, renames, i18n extraction, bulk edits) → cheapest competent model (Haiku-class).
- **Environment awareness first:** before routing, **inventory the models actually available in this tool/workspace** (Cursor: the workspace's enabled model list; Codex: the CLI's model options; Claude Code: `.claude/agents/` frontmatter + per-delegation override) and map them onto T1/T2/T3 by capability and price. Never assume a specific vendor lineup.
- **Escalation:** one retry max at a tier, then escalate one tier. Review/security tasks never run below T1. Missing tier → nearest available, preferring upward. Single-model tool → run inline and flag the tier mismatch in the report.

### Session Telemetry Ledger

Each repo keeps `docs/project/telemetry/sessions.jsonl` — append-only, one row per invocation (a session produces many rows as it progresses; dedupe by `sessionId` and keep the newest row, never sum them) — with tokens, message counts, duration, model(s), and best-effort topic/sprint, so the Model Routing tiers above can be checked against real usage instead of guessing. **On Claude Code this is automated** (a Stop hook appends it). **On Cursor and Codex there is no automated equivalent yet** — pull the numbers from `/usage` (Codex) or the usage dashboard (Cursor) and append the same fields by hand in the task report, rather than leaving the ledger silently thinner for that tool's work. Canonical schema: `docs/METHOD/routing-method.md` → "Session Telemetry Ledger".

### Output Compression

**Compress the conversation, never the artifact.** Chat narration during build/debug/ops compresses freely — drop filler, preambles, hedging, tool narration and restated context. Committed docs (task files, `STATE.md`, PR bodies, `/relay` blocks), user-facing EN/FR copy, and review/security verdicts do not compress: severity and nuance are the deliverable, and a terse doc costs more in re-exploration than the tokens it saved. **Code, commands, paths, error strings and numbers are reproduced verbatim everywhere.** Third-party compression skills (Caveman & co.) are opt-in per session under the same boundary — never a fleet default; measure the delta in the telemetry ledger above before adopting one, since output tokens are the minority of agentic spend and such skills add input-token overhead per turn. Canonical: `docs/METHOD/routing-method.md` → "Output Compression".

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
