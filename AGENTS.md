# BanaShare — Agent Instructions

> **`CLAUDE.md` is canonical** (auto-loaded by Claude Code; paste into a Desktop Project).
> This file **derives** from it — the same context restated for non-Claude agents (Cursor,
> Codex, Cline, Antigravity), so it reads standalone without a Claude runtime — it is **not
> imported** into Claude's context (since v317.a), so a rule that lives only here never reaches
> Claude. `GEMINI.md` is a retired stub. Rules change in `CLAUDE.md` first; this mirror follows.
> Shared identity, voice & non-negotiables: see `SOUL.md`.

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

## Operating Loop

Orient (load entry files + `STATE.md`, be surgical) → **Frame = 🎯 Cadrage** (one `AskUserQuestion` fixing Journey / Proof / out-of-scope, recommended answer first, before the first edit — canonical: `docs/METHOD/method-core.md` → "The two-moment contract — Cadrage · Recette"; stop if ambiguous) → Build (smallest slice, one concern) → Prove (tests / typecheck / lint; state verify status honestly) → **Land = ✅ Recette first** (recette table + the four states `CODED`/`LANDED`/`DEPLOYED`/`PROVEN`, never merged, then the Definition of Done, `type(scope): msg`, `/land` — verify and fast-forward `main`; **no PR** unless the landing gate holds it back; `/relay` only when a slice genuinely spans windows, at a clean boundary). Higher doc wins: METHOD > VISION > PLAN > FOCUS > TASK > CODE. **The CUJ is the unit** — every conversation/sprint/task names the journey(s) it closes.

## Landing & conversation size (non-negotiable)

> Canonical: `method-core.md` → "§ Landing (the default) & the exception list", "§ Slice discipline".
> Synced from the METHOD hub — change it there, never in an app.

**The operator does not manage pull requests.** Every conversation ends by landing on the trunk; the
result is **LANDED**, nothing more. **One conversation = one slice = one landing** — nothing landed and
the context filling up means the slice was too big: land what is green, then stop.

- **Close with `/land`** (`npm run land`), not `/ship`: it fetches the trunk, scans the diff against the
  exception list, merges the trunk in, runs the verify gate (lint · typecheck · tests · build, per lane)
  and fast-forwards. There is no CI (`SOUL.md` → Boundaries) — this local gate is the only brake.
- **Four states, never merged:** `CODED` · `LANDED` · `DEPLOYED` · `PROVEN`, each with its own evidence
  (a push · a served revision · an observed run). `land.mjs` deploys nothing.
- **Never** `gh pr merge --admin`, never force-push, never `git rebase`, never check out the trunk.
- **Exceptions → PR + `### Needs decision`:** schema / Firestore rules · auth, secrets, middleware ·
  `SOUL.md` · migrations · deploy wiring · `[no-auto-merge]` / `[wip]` / `[hold]` / `Needs decision` in a
  commit · a `wip` branch. Dependencies and big diffs land alone (332.a).
  Held back for a harmless reason? Land it with **`[land-anyway]`** and say why in the report.

## Agent definitions (single source)

`.claude/agents/{agent}.md` is the **canonical** definition of every cohort agent — identity, mandate, non-negotiables. `.claude/skills/{agent}/SKILL.md` is a Desktop stub that loads it. Edit the agent file only. (`Swanifly/web/lib/engine/agent-personas.ts` is hand-maintained and parked with the Swanifly engine — not derived from the agent files.)

**Cohort (METHOD v318.a): 10 active mandates + 3 dormant.** Active — **Junia** (plan + Cadrage) · **Brian** (build) · **Sage** (prove: the observed run that makes a journey PROVEN, then its regression test) · **Watson** (repair) · **Kasper** (security) · **Vera** (one review per slice, at the Recette) · **Nova** (design system) · **Gordon** (commercial & growth: offers, funnels, EN/FR copy, campaigns, ads unless the business pack names an owner) · **Iris** (study & deliverables; owns the anonymisation/GDPR rule) · **Lucia** (METHOD release manager). Dormant, not loaded — **April**, **Aiko**, **Teddy** (`.claude/_dormant/`). **The coordinating conversation orchestrates**, not an agent; the chain is defined once, in `docs/METHOD/agents-method.md` → "Orchestration chain". On a tool with no sub-agent layer, play the roles in sequence and load each role's entry files.

## Model Routing (default: orchestrate high, execute cheap)

> Canonical policy — **do not restate it here**: `docs/METHOD/routing-method.md`, whose other §§ own
> what is not below: "§ Token economy" (incl. the `MEMORY.md` ≤ 5 kB cap and cost-per-finished-task),
> "§ Session Telemetry Ledger", "§ Output Compression", "§ Environment awareness" (non-Claude surfaces).

- **Delegate on the four-condition test, not by default.** Send work out when it is
  **verbose-and-discardable**, **self-contained** (one brief, no back-and-forth), **summarisable**, or
  **needs a tool restriction**. Stay **inline** for back-and-forth, shared multi-phase context and
  small targeted edits — a spawn costs 60–75 k tokens before it reads anything.
- **Tiers:** **T1** judge/plan/review/security/METHOD release → `opus` · **T2** build/prove/ops/design/
  copy/study → `sonnet` · **T3** mechanical (scaffolding, renames, i18n, bulk edits) → `haiku`. One
  retry per tier, then escalate one. **Tiers beat modes**: Ultracode or "cost is no constraint" never
  overrides them.
- **Name `model` explicitly** on every sub-agent and Workflow worker — unnamed runs `sonnet`. **Review,
  security and judgement never below T1**; `vera` once per slice, not per task.
- **Review→fix loop: 2 rounds max**, then the operator decides. A re-review reads the diff only; one
  reviewer per point; full gates (suite, build, e2e) once, at the end of the slice.
- **Workflow at ≥ 3 near-identical items** + a verification pass; it announces its cost at Cadrage and
  stays **< 10 agents** unless the operator agrees.
- **≥ 2 code-writing slices = a chantier**; inside a slice, a parallel session only on an **observed**
  trigger (`sprints-method.md` → "§ The chantier").

## Tech Stack

> Declared stack = **target baseline**; **detect each app's actual stack first** (e.g. `Apps/web` is Next 14 + MUI, flat structure — not yet `src/features/`).

- **Framework:** Next.js 15 (App Router)
- **Language:** TypeScript strict mode — no `any`, no `as` assertions
- **Styling:** Tailwind CSS + CSS custom properties (M3 design tokens)
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
