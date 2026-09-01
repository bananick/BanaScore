# BanaShare — Agent Instructions

> Cross-tool instructions shared across Antigravity, Cursor, and Claude Code.
> For AG-specific instructions, see `GEMINI.md` (takes precedence).
> Shared identity, voice & non-negotiables: see `SOUL.md`.

<<<<<<< HEAD
## Operator Reporting — close with the Debrief

> Canonical spec: `docs/METHOD/method-core.md` → "Operator Reporting". Tool-agnostic — applies on Cursor, Codex, and any agent tool that reports back to a human.

The operator must never have to ask *"et le projet global, on en est où ? qu'est-ce qui a été fait ? qu'est-ce que je dois décider maintenant ?"*. Close every substantial reply with this card, then one fenced `▶ Prompt suivant` block (self-contained: goal, repo + key paths, constraints, acceptance).

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

- **≤ 16 lines, ≤ 68 characters per line, no wrapping paragraph inside the card.** One idea per bullet — a framed prose blob is exactly what stops being read.
- `<glyphe>`: `✅` fait · `🟡` besoin de toi · `🔴` bloqué · `👀` en observation.
- `Avancement` = position in the **global** project, not in the turn. Ratio only when something countable was actually read this turn (sprint task files, plan checkboxes, `PORT-MAP.md` rows, PR list); otherwise say it in words. **Never invent a ratio.**
- `À RETENIR` = 2–4 bullets of what to hold in your head tomorrow, including one `Décidé pour toi :` line for every reversible call made without asking. Not a changelog.
- Nothing to decide → `TU DÉCIDES  rien — j'ai tranché : <x>, <y>`. A decision is never buried in the prose above the card.
- Small answer → one landing line (`✅ <fait> · suite → <action>`); nothing done → no card. **A delegated sub-agent never emits a Debrief** — it hands its orchestrator a report, and the orchestrator renders one card for the whole chain.
- The `Done / State / Next` 3-line header stays the opener of **written artifacts** (PR bodies, task reports, sub-agent reports), not of chat replies. Chat leads with the answer.
=======
## Landing (the default) — the operator does not manage PRs

> Canonical: `docs/METHOD/method-core.md` → "Landing (the default) & the exception list". Tool-agnostic.

- **One conversation = one slice = one landing.** Every conversation ends on `main`; `main` is the deploy. A pull request is the **exception** — the artifact of a decision only the operator can make — never the normal path. Nothing landed and context is filling up? The slice was too big: land what is green, then stop.
- **Close with `/land`** (`npm run land`), not by opening a PR. `.claude/hooks/verify-gate.mjs` classifies the diff (docs → nothing to run · tooling → `node --check` · app code → that app's `lint`/`typecheck`/`test`/`build`) and stamps `.method/verify-ok.json` **pinned to the HEAD sha**; `.claude/hooks/land.mjs` refuses to land without a green marker at the current commit, merges `origin/main` in (never rebases), then `git push origin HEAD:main`. It never checks out the trunk, so it is worktree-safe. Fails **closed**: an app exposing no `typecheck`/`test`/`build` cannot land app code.
- **Exceptions → PR + a `### Needs decision` block:** schema / Firestore rules · auth, secrets, middleware · `SOUL.md` · dependency or lockfile changes · migrations · deploy/CI wiring · >60 files or >2000 deleted lines · `[no-auto-merge]`/`[wip]`/`[hold]`/`Needs decision` in a commit · `wip` branch name · red, absent or stale verify · trunk conflict. Harmless false positive? Land it with **`[land-anyway]`** in the commit subject and say why.
- **Never:** `gh pr merge --admin` · force-push · `git rebase` · check out the trunk · delete the marker to fake a green.
- **On a tool with no hooks** (Cursor, Codex): run `node .claude/hooks/verify-gate.mjs` then `node .claude/hooks/land.mjs` as the last step of the task and report the landed sha. Leaving a branch behind for a human to merge is the failure mode this replaces.
>>>>>>> origin/main

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
