# BanaShare — Agent Instructions

> **`CLAUDE.md` is canonical** (auto-loaded by Claude Code; paste into a Desktop Project).
> This file **derives** from it — the same context restated for non-Claude agents (Cursor,
> Codex, Cline, Antigravity), so it reads standalone without a Claude runtime — it is **not
> imported** into Claude's context (since v317.a), so a rule that lives only here never reaches
> Claude. `GEMINI.md` is a retired stub. Rules change in `CLAUDE.md` first; this mirror follows.
> Shared identity, voice & non-negotiables: see `SOUL.md`.

## Communication Contract (how agents report to the operator)

- **Close every substantial reply with the Debrief card** — ce qui vient d'être fait · où ça met le **projet global** (`Avancement`, a real count, never an invented ratio) · ce qu'il faut retenir (dont `Décidé pour toi :`) · ce que l'opérateur doit trancher · la suite + le `▶ Prompt suivant`. Rendered as **plain markdown, never a fenced block** (a fence renders small, unstyled and unclickable): a `### ✅ Debrief · {lane}` title between two `---` rules, fixed section landmarks 📊 🧠 🤝 ⚖️ ➡️ ⚠️, one idea per bullet, no paragraph, six blocks max. Small answer → one landing line; nothing done → no card. Delegated sub-agents never emit one. Canonical: `docs/METHOD/method-core.md` → "Operator Reporting".
- Lead with the answer in chat. The **3-line header** — **Done** (what changed) · **State** (🟢 on track / 🟡 needs input / 🔴 blocked) · **Next** (immediate step, or "awaiting your call") — opens **written artifacts**: PR bodies, task reports, sub-agent reports back to an orchestrator. Never a header and a Debrief for the same work.
- Surface decisions in a `### Needs decision` block (question, 2–4 options, **recommendation first**), and carry the question into the Debrief's `TU DÉCIDES` row. Never decide irreversible / data-model / scope changes — list them and stop.
- **The CUJ is the unit.** Every conversation/sprint/task names the journey(s) it closes; `Avancement` counts journeys proven, never tasks closed.
- Be synthetic: bullets over paragraphs, bold the key noun, tables for >3 items, no tool-call narration. Show multi-step progress as a refreshed ⬜/🔄/✅ checklist. Match depth to stakes; flag risk early; report failures with evidence.
- **Compress the chat, never the artifact:** terse in conversation (no filler, preambles, hedging, tool narration); full prose in committed docs, EN/FR copy and review/security verdicts. Code, commands, paths, errors and numbers verbatim everywhere. Third-party compression skills (Caveman & co.) opt-in per session, same boundary — measure before adopting (`docs/METHOD/routing-method.md` → "Output Compression").

## Operating Loop

Orient (load entry files + `STATE.md`, be surgical) → **Frame = 🎯 Cadrage** (one `AskUserQuestion` fixing Journey / Proof / out-of-scope, recommended answer first, before the first edit — canonical: `docs/METHOD/method-core.md` → "The two-moment contract — Cadrage · Recette"; stop if ambiguous) → Build (smallest slice, one concern) → Prove (tests / typecheck / lint; state verify status honestly) → **Land = ✅ Recette first** (recette table + the four states `CODED`/`LANDED`/`DEPLOYED`/`PROVEN`, never merged, then the Definition of Done, `type(scope): msg`, `/land` — verify and fast-forward `main`; **no PR** unless the landing gate holds it back; `/relay` only when a slice genuinely spans windows, at a clean boundary). Higher doc wins: METHOD > VISION > PLAN > FOCUS > TASK > CODE. **The CUJ is the unit** — every conversation/sprint/task names the journey(s) it closes.

## Landing (the default) — the operator does not manage PRs

> Canonical: `docs/METHOD/method-core.md` → "Landing (the default) & the exception list". Tool-agnostic.

- **One conversation = one slice = one landing.** Every conversation ends on the trunk (`main`, or `master` where a repo still uses it — `land.mjs` reads `origin/HEAD`); the result is **LANDED** — `DEPLOYED` and `PROVEN` need their own evidence (there is no CI on this account, and `land.mjs` does not deploy). A pull request is the **exception** — the artifact of a decision only the operator can make — never the normal path. Nothing landed and context is filling up? The slice was too big: land what is green, then stop.
- **The gate is local and machine-checked**, because there is no CI and no branch protection on this account. `.claude/hooks/verify-gate.mjs` classifies the diff (docs → nothing to run · tooling → `node --check` · app code → that app's `lint`/`typecheck`/`test`/`build`) and stamps `.method/verify-ok.json` **pinned to the HEAD sha**; `.claude/hooks/land.mjs` refuses to land without a green marker at the current commit, then `git push origin HEAD:main`. Fails **closed**: an app with no `typecheck`/`test`/`build` script cannot land app code, and (since 318.a) a newly added intervention or task file without `**Journey:**` + `**Proof:**` cannot land at all.
- **Exceptions → PR + a `### Needs decision` block:** schema / Firestore rules · auth, secrets, middleware · `SOUL.md` · dependency or lockfile changes · migrations · deploy/CI wiring · >60 files or >2000 deleted lines · `[no-auto-merge]` / `[wip]` / `[hold]` / `Needs decision` in a commit · `wip` branch name · red, absent or stale verify · trunk conflict. Harmless false positive? Land it with **`[land-anyway]`** in the commit subject and say why.
- **Never:** `gh pr merge --admin` · force-push · `git rebase` · check out the trunk · delete the marker to fake a green.
- **On a tool with no hooks** (Cursor, Codex): run the same two scripts by hand — `node .claude/hooks/verify-gate.mjs` then `node .claude/hooks/land.mjs` — as the last step of the task, and report the landed sha. Leaving a branch behind for a human to merge is the failure mode this replaces.

## Agent definitions (single source)

`.claude/agents/{agent}.md` is the **canonical** definition of every cohort agent — identity, mandate, non-negotiables. `.claude/skills/{agent}/SKILL.md` is a Desktop stub that loads it. Edit the agent file only. (`Swanifly/web/lib/engine/agent-personas.ts` is hand-maintained and parked with the Swanifly engine — not derived from the agent files.)

**Cohort (METHOD v320.a): 12 active mandates + 3 dormant.** Active — **Junia** (plan + Cadrage) · **Brian** (build) · **Sage** (prove: the observed run that makes a journey PROVEN, then its regression test) · **Watson** (repair) · **Kasper** (security) · **Vera** (one review per slice, at the Recette) · **Nova** (design system) · **Gordon** (commercial & growth: offers, funnels, EN/FR copy, campaigns, ads unless the business pack names an owner) · **Iris** (study & deliverables; owns the anonymisation/GDPR rule) · **Lucia** (METHOD release manager) · **Penny** (token economy: measures, reports and coaches on token use, proposes METHOD changes to Lucia; read-only on code) · **Oscar** (coach: a weekly retro on effectiveness, focus, objectivity, lucidity and the relevance of objectives; one habit to change; read-only on code). Dormant, not loaded — **April**, **Aiko**, **Teddy** (`.claude/_dormant/`). **The coordinating conversation orchestrates**, not an agent; the chain is defined once, in `docs/METHOD/agents-method.md` → "Orchestration chain". On a tool with no sub-agent layer, play the roles in sequence and load each role's entry files.

## Model Routing (default: orchestrate high, execute cheap)

> Canonical policy: `docs/METHOD/routing-method.md` → "Model Routing". Tool-agnostic — applies on Cursor, Codex, and any multi-model agent tool.

- **Delegation is the default, not an option.** Coordination stays in the coordinating conversation (read reports, arbitrate, decide, report to the operator); every executable, delegable piece of work leaves it as a sub-agent that returns a conclusion — including high-residue exploration. Forms and triggers (sub-agent · Workflow · parallel sessions): `routing-method.md` → "Delegation is the default".
- **Coordinator high, delegates cheap.** The orchestrating agent runs on the strongest model the tool exposes; every delegated/sub task runs on the **cheapest model that meets its quality bar**.
- **Tiers:** **T1** judge/plan/review/security → strongest reasoning model (Fable/Opus/GPT-5.x-class) · **T2** build/tests/ops → mid-tier coding model (Sonnet-class) · **T3** mechanical (scaffolding, renames, i18n extraction, bulk edits) → cheapest competent model (Haiku-class).
- **Environment awareness first:** before routing, **inventory the models actually available in this tool/workspace** (Cursor: the workspace's enabled model list; Codex: the CLI's model options; Claude Code: `.claude/agents/` frontmatter + per-delegation override) and map them onto T1/T2/T3 by capability and price. Never assume a specific vendor lineup.
- **Escalation:** one retry max at a tier, then escalate one tier. Review/security tasks never run below T1; the review runs once per slice, at the Recette. Workflow / fan-out workers each get an explicit model (default: the T2 model); review, verify and judgement workers name the T1 model explicitly — a T2 default makes forgetting cheap, not safe. Missing tier → nearest available, preferring upward. Single-model tool → run inline and flag the tier mismatch in the report.
- **Token economy (319.a) — cost = calls × context, not output** (cache reads + writes were 85.6 % of 14 days' cost). Canonical: `routing-method.md` → "Token economy".
  - **Review→fix loop: 2 rounds max**, then the operator decides; a re-review reads the diff only; one reviewer per point (review *or* security, not both on the same findings); full gates (suite, build, e2e) once at the end of the slice. (One loop ran 5 rounds and cost 34 % of a ~$610 session.)
  - **Tiers beat modes** — no session mode ("ultra", "cost is not a constraint") overrides T1/T2/T3 (57/70 sub-agents ran on the T1 model under one).
  - **Fan-out announces its cost first** — agents × expected calls, as a share of the weekly quota — and stays **< 10 agents** unless the operator agrees (fan-out was 37.5 % of cost). A general-purpose sub-agent runs on T2 unless its task is judgement ($11.5/agent on T1 vs $4.1 on T2).
  - **Minimal sub-agent context** — pass file paths, never pasted inventories; images only to the design or proof agent, only the needed ones; cap tool calls in the brief (≈ 55 calls per sub-agent on average, each re-reading ≈ 200–260k tokens).
  - **Memory index ≤ 5 kB** (`MEMORY.md` or the tool's equivalent), one-line pointers — it is loaded every turn.
  - **Cost per finished task** is the unit: a cheaper tier that needs three passes is not cheaper.

### Session Telemetry Ledger

Each checkout keeps a local `docs/project/telemetry/sessions.jsonl` — gitignored; hooks no longer commit the ledger (318.a), and the file becomes untracked in a follow-up once every checkout runs the 318.a hooks — append-only, one row per invocation (dedupe by `sessionId`, keep the newest, never sum) — with tokens, message counts, duration, model(s) and a best-effort sprint, so the tiers above can be checked against real usage instead of vibes; the hub aggregates with `npm run telemetry:report`. **Automated on Claude Code** (a Stop hook appends it); **no equivalent on Cursor or Codex** — pull the numbers from `/usage` (Codex) or the usage dashboard (Cursor) and append the same fields by hand in the task report. Schema: `docs/METHOD/routing-method.md` → "Session Telemetry Ledger".

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
