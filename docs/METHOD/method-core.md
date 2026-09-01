# METHOD Core Principles

**Owner:** Lucia  
**Version:** 315.b  
**Purpose:** Universal principles, tech stack, Definition of Done

---

## Philosophy

### Hierarchy of Truth

**When conflicts arise, higher levels override lower:**

```
THE METHOD > THE VISION > THE PLAN > THE TASK > THE CODE
```

- **METHOD** files define how we work (universal)
- **VISION** defines what we're building (app-specific)
- **PLAN** (ROADMAP/sprints) defines what's next
- **TASK** files define acceptance criteria
- **CODE** implements the task

### Document States

Documents are either:

- **`[LIVING]`** — Actively maintained, can change (most project/ files, all METHOD files)
- **`[FROZEN]`** — Locked, changes require explicit approval (completed sprints, released versions)

### Docs-First

**Write docs before code. Update docs with code.**

- VISION before sprint
- DESIGN tokens before implementation
- ROADMAP before features
- Sprint task before execution

**Why:** Docs are truth; code is implementation.

---

### Adaptive

**One standard way of working with quality built in.**

Core Loop handles most work (Junia → Brian → Vera). Specialists join when their domain is touched.

Governance scales naturally based on what you're building.

---

### Lightweight Governance

**No heavy process unless needed.**

Quality gates are built into the workflow:
- Pre-Flight: Check clarity before starting
- Review Gate: Vera validates after completion
- Kill Gate: Junia consolidates before closing sprint

**Governance scales with what you're building.**

---

## Tech Stack (Default)

### Web
- **Framework:** Next.js (App Router)
- **Language:** TypeScript
- **Styling:** Tailwind CSS + Material Design 3
- **State:** React hooks + Context
- **Backend:** Firebase (Firestore, Auth, Functions)
- **Testing:** Vitest (unit), Playwright (E2E)
- **i18n:** next-intl (EN/FR baseline)

### Mobile
- **Framework:** React Native + Expo
- **Language:** TypeScript
- **Styling:** Tailwind (NativeWind) + MD3
- **State:** React hooks + Context
- **Backend:** Firebase
- **Testing:** Jest (unit), Detox (E2E)
- **i18n:** expo-localization + i18n-js

### Ops
- **Hosting:** Firebase App Hosting in `europe-west1` / `europe-west4` for Next.js web backends, EAS for mobile
- **CI/CD:** GitHub Actions
- **Monitoring:** Firebase Crashlytics, Cloud Logging
- **Analytics:** Firebase Analytics

**Override:** Apps can override in `project/tech-stack.md` if needed

---

## Multitenancy Baseline (Default)

**Default assumption:** Every app is **multi-tenant** and must support multiple distinct **Teams** (tenants) out of the box.

### Definitions
- **Tenant noun:** Team
- **Tenant identifier:** `teamId` (opaque id; do not use email/domain as primary key)
- **User identifier:** `uid` (Firebase Auth uid)

### Data model (Firestore)
- **Tenant-scoped domain data lives under:** `teams/{teamId}/...`
  - Example: `teams/{teamId}/invoices/{invoiceId}`
- **Membership is explicit:** `teams/{teamId}/members/{uid}`
  - Recommended fields: `role`, `status` (`active|invited|removed`), `createdAt`
- **Global user doc allowed:** `users/{uid}` for profile + device-level settings (non-tenant data)
  - Examples: `users/{uid}/fcmTokens/{tokenId}`, `users/{uid}/profile`

### Routing (Web)
- **Tenant context must be in the URL** for all tenant-scoped pages.
  - Recommended: `/t/{teamId}/...`
- **Never “default to the only team” silently** without an explicit team selection step.

### Authorization (must-haves)
- **Every tenant-scoped read/write must verify membership** (server code and Firestore rules).
- **Never trust `teamId` from the client** without membership verification.
- **No cross-tenant queries by default.** Avoid `collectionGroup()` or root collections for tenant data unless admin-only.

### Firestore rules baseline (illustrative)
This is a sketch, not copy/paste production rules. The principle: **membership gates everything under `teams/{teamId}`**.

```javascript
match /databases/{database}/documents {
  function isSignedIn() {
    return request.auth != null;
  }

  function isTeamMember(teamId) {
    return isSignedIn()
      && exists(/databases/$(database)/documents/teams/$(teamId)/members/$(request.auth.uid));
  }

  match /teams/{teamId}/{document=**} {
    allow read, write: if isTeamMember(teamId);
  }

  match /users/{uid}/{document=**} {
    allow read, write: if isSignedIn() && request.auth.uid == uid;
  }
}
```

---

## Data Structure Governance

**Every app must maintain `project/SCHEMA.md`** (use `templates/SCHEMA-TEMPLATE.md`).

### Rules
1. **Docs first:** Update `project/SCHEMA.md` **before** changing code
2. **Zod validation required:** All Firestore writes must pass through a Zod schema in `src/lib/schemas/`
3. **No untyped writes:** Never `setDoc(ref, rawObject)` — always `setDoc(ref, schema.parse(data))`
4. **Migration protocol:**
   - Adding optional field → update SCHEMA.md + add Zod field
   - Adding required field → write backfill script first
   - Renaming/removing field → deprecate for 1 sprint, then remove
5. **Schema review:** Vera's review gate checks schema consistency (see REVIEW-TEMPLATE)

---

## Definition of Done

**Standard DoD for all tasks (9 items — streamlined in v305.a):**

- [ ] Feature works (smoke test)
- [ ] Critical path tests pass
- [ ] TypeScript strict (no `any`)
- [ ] i18n strings externalized (EN/FR)
- [ ] No lint errors
- [ ] Task report appended
- [ ] Committed + pushed to GitHub
- [ ] Review Gate passed (Vera) → task marked `☑️`
- [ ] FOCUS.md / STATE.md updated if objective completed

> **Task-specific gates** (apply when the task touches that area, not on every task):
> Zod schemas + `project/SCHEMA.md` updated (data touched) · empty/error/loading states (UI)
> · security check, see `docs/definition/security/PROJECT SECURITY.md` (sensitive ops).

**Quality gates:**
- **Pre-Flight:** Check clarity before starting (see task template)
- **Review Gate:** Vera validates after completion
- **Kill Gate:** Junia consolidates before closing sprint (see sprints-method.md)

**When to add more:**
- E2E tests for critical user journeys
- Integration tests for complex Firebase/API interactions
- Component tests for reusable UI components
- Architectural tests when enforcing boundaries
- Visual regression when design precision matters
- Full a11y audit (WCAG AA) for public-facing features

---

## i18n Baseline

**Default:** EN (English) + FR (French)

**Why:** Canadian market; Lucia's preference

**Structure:**
```
locales/
  en/
    common.json
    errors.json
  fr/
    common.json
    errors.json
```

**Usage:**
```typescript
import { useTranslations } from 'next-intl';

const t = useTranslations('common');
t('welcome'); // "Welcome" or "Bienvenue"
```

**Override:** Apps can add more locales in `project/i18n.md`

---

## Git Workflow

### Commits

**Format:** `type(scope): message`

**Types:**
- `feat`: New feature
- `fix`: Bug fix
- `chore`: Maintenance (deps, config)
- `docs`: Documentation only
- `test`: Tests only
- `refactor`: Code restructuring (no behavior change)

**Examples:**
```bash
git commit -m "feat(auth): add password reset flow"
git commit -m "fix(invoice): PDF logo sizing"
git commit -m "chore(deps): update Firebase SDK to v10"
git commit -m "docs(roadmap): mark settings page complete"
```

---

### Branches

**One short-lived branch per slice.** A **slice** is what a single conversation can finish *and land*.
Never commit directly to `main`; never let a branch outlive the conversation that opened it.

```bash
git checkout -b feat/{sprint}-{seq}-{scope}   # e.g., feat/120-a-admin-nav
git add . && git commit -m "feat(admin): implement sidebar navigation"
npm run land                                   # → verify, then fast-forward main
```

**Branch rules:**
- Max lifespan: **one conversation** (hard ceiling 3 days — longer means the slice was too big)
- Branch name: `feat/`, `fix/`, `chore/`, `docs/` prefix matching commit types. Cloud sessions get
  `claude/{concern}` — still one concern.
- **Never force-push. Never `git rebase`. Never check out `main`** (worktrees share the trunk ref).

**Why branches still matter solo:** the branch is the recovery point. What changed is that the branch
is no longer where work *waits* — it is where work is *assembled*, for minutes or hours, not days.

---

### Landing (the default) & the exception list

**The operator does not manage pull requests.** Every conversation ends by **landing on `main`**, and
`main` is the deploy. A PR is the **exception** — the artifact of something a human must decide — not
the normal path. If you are opening a PR out of habit, you are adding a chore the operator has to
remember.

**There is no CI and no branch protection on this account.** The GitHub Actions workflows were
deleted on 2026-06-28 (`8b989e9`) after every run failed at the starting line on a GitHub billing
block — account-wide, and unrelated to the active Google Cloud / Firebase billing (`SOUL.md` →
"Boundaries"): never propose "turning CI back on". Enabling branch protection returns HTTP 403 on
this plan. So the gate is **local and machine-checked**, not prose an agent can claim to have honored:

| Piece | What it does |
|---|---|
| **`.claude/hooks/verify-gate.mjs`** | Classifies the diff into lanes — `doc` (nothing to run) · `tooling` (`node --check`) · `app` (that app's `lint`/`typecheck`/`test`/`build`) — and only spends build time on what can break production. Stamps `.method/verify-ok.json` **pinned to the HEAD sha**. Fails **closed**: app code in an app with no `typecheck`/`test`/`build` script cannot land. |
| **`.claude/hooks/land.mjs`** | Refuses to land without a green marker *at the current commit* (a stale green is not a green light). Merges `origin/main` in, then `git push origin HEAD:main`. Any open PR for the branch closes itself as merged. |
| **`Stop` hook** | After every turn: lands the **docs/tooling lane only** (`--lane docs`). Zero build risk, and it is where the PR backlog actually came from. |
| **`SessionEnd` hook** | When the conversation ends: attempts a **full land**. This is the "results of each conversation reach `main`" guarantee. |
| **`/land`** | The explicit close at slice end. Don't wait for the hook when you know the slice is done. |
| **`npm run land:sweep`** | Every open PR + what blocks it; `land:sweep:apply` squash-merges the clean ones. Nothing should sit open for more than a few days. |

**The exception list — fail-closed, and the only reasons a PR is correct:**

| Exception | Why a human looks |
|---|---|
| **schema** — `SCHEMA.md`, `schemas/`, `*.zod.ts`, `firestore`/`storage.rules`, `*.indexes.json` | data-model changes are the conflict gate; never decide one yourself |
| **security** — `auth/`, `middleware/`, `.env*`, `serviceAccount*`, `security/` | our most common production failure |
| **soul** — `SOUL.md` | the non-negotiables are the operator's, not an agent's |
| **deps** — a real `dependencies`/`devDependencies` edit, any lockfile | supply chain (a `scripts`-only `package.json` touch does **not** block) |
| **migration** — `migrations/`, `*migrate*.mjs\|ts` | irreversible against live data |
| **infra** — `.github/workflows/`, `apphosting.yaml` | changes what deploy means |
| **scale** — > 60 files or > 2000 deleted lines | too big to land unreviewed; split the slice |
| **hold** — `[no-auto-merge]`, `[wip]`, `[hold]`, `Needs decision` in a commit **subject**, or `wip` in the branch name | the operator's one-token brake (subjects only — a body that *documents* these markers must not trip them) |
| **red / absent / stale verify · trunk conflict** | fix it, don't route around it |

Held back → the gate pushes the branch, opens or comments on a PR **once** with the exact reason, and
the report carries a `### Needs decision` block with a recommendation. Two legitimate outs, both
explicit: resolve the reason, or — when the exception fired on something genuinely harmless — land it
with **`[land-anyway]`** in the commit subject and say so in the report.

**Forbidden, always:** `gh pr merge --admin` · force-push · `git rebase` · deleting the marker to
fake a green · `git add -A` sweeping someone else's in-flight work into your commit.

### Slice discipline (why this saves tokens)

Landing is what keeps conversations small, and small conversations are the cost control:

- **One conversation = one slice = one landing.** If a conversation has not landed anything and the
  context is filling up, the slice was too big — land what is green, `/relay`, and start fresh.
- **Landing beats relaying.** A landed slice needs no handoff prose at all: `main` *is* the state.
  `/relay` is for a slice that genuinely spans windows, not a substitute for finishing one.
- **Route residue-heavy work to sub-agents** (Iris / Explore) that return conclusions only — see
  "Project State & Handoff".
- **A PR is a token liability**: it means the work is coming back later, in a new window, with the
  context re-derived from scratch.

### Sync Cadence

**Commit after every completed task; land at the end of the conversation.**

```bash
git add . && git commit -m "feat(notifications): implement FCM"
npm run land          # verify → fast-forward main → deploy
```

**Why:** progress is never lost, `main` is always the truth, and no queue of pull requests
accumulates behind the operator's attention.

---

## Project State & Handoff (STATE.md)

`project/STATE.md` is the durable single source of truth for **where the app is right now** — it is
auto-loaded on every conversation (see Context Loading). Standard sections: a header (Last Updated,
Current Sprint, Status, METHOD Version), then **Active Work**, **Blockers**, **Recent Decisions**,
**Next Up**.

### `## Resume here` — the Relay home

The dropoff ritual `/relay` (alias `/handoff`) writes a `## Resume here` section near the top of
`STATE.md` so the next conversation resumes without re-pasting context. It is the **inverse of
`/brief`**: `/brief` picks up (rehydrates from git + `STATE.md` + memory), `/relay` drops off
(flushes the live working-state before the window ends). Because `STATE.md` is already auto-loaded,
`/brief` reads the block for free. One `## Resume here` block per app; each `/relay` overwrites the
previous. Schema — **pointers, never payloads**:

| Row | Carries |
|---|---|
| **But** | The goal in one line + the "done" test |
| **Acquis** | Decisions settled / what now works — prevents re-derivation (the token win) |
| **État** | Files touched, tests status, last commit hash |
| **Charge** | *Load these next*: STATE.md, task file, 2–3 key sources — pointers, not contents |
| **Prochaine** | The exact next action |
| **Pièges** | Dead ends already tried, what NOT to re-touch |

**Trigger discipline:** relay **only at a clean boundary** — state already committed to git +
`STATE.md` + the task report. Never mid-thrash; a premature handoff costs more in re-exploration
than it saves.

**Relay ≠ memory:** a Relay is volatile per-workstream resume state owned by `STATE.md`; runtime
memory holds durable cross-session facts about the user/project. Keep them separate — don't collapse
one into the other.

**Keep Relays rare — offload to sub-agents:** route residue-heavy exploration / research through
sub-agents (Iris / Explore) that return **conclusions only**. The main context then accumulates less
residue, so it needs fewer Relays in the first place.

**Sub-agent vs. separate session — the two halves.** A **sub-agent** returns a conclusion into a
context you keep: you stay the owner of the thread, the branch and the Relay. A **separate session**
carries the context away and gives back a *document* — it owns its own branch and worktree, and it
does **not** relay (there is one `## Resume here` per app, and the sprint conversation holds it). So
offloading is the default and splitting is the exception. The four observed facts that justify the
split, plus the `Stop`-hook mechanism that makes two sessions on one branch diverge silently:
`sprints-method.md` → "Conversation Naming".

---

## Operator Reporting — the Debrief and the Flight Deck

At the end of an intervention the operator must never have to ask *"et le projet global, on en est
où ? qu'est-ce qui a été fait ? qu'est-ce que je dois décider maintenant ?"*. If he asks, the report
failed — the information existed, it just wasn't rendered where he reads. Two cards answer those
questions, one per moment, and **never both in the same answer**.

| Moment | Card | The question it answers |
|---|---|---|
| **Pickup** — `/brief`, resume hook, cold start | **Flight Deck** | Où on en est · quoi faire maintenant |
| **Dropoff** — the close of a substantial answer | **Debrief** | Ce qui vient d'être fait · où ça met le projet · ce que je dois décider |

An answer that opens with a Flight Deck (resume, `/brief`) still closes with a Debrief, but the
Debrief then carries only what the Flight Deck didn't, and never repeats its words.

**Both cards are plain markdown, never a fenced block.** This is not cosmetic. A `text` fence renders
small, monospace and unstyled: no bold, no colour, no clickable paths, and a fixed width that forces
long content to wrap badly or be truncated. Markdown gives real emphasis, real emoji, spacing that
paginates, wrapping that follows the window, and `file.md:42` paths the operator can click. The
**only** fenced block in a closing is the `▶ Prompt suivant`, which stays fenced because it exists to
be copy-pasted (fence it as `bash` for a command, so the app renders a Run button).

### The Debrief — closing card

The mental model is a chief of staff walking in for thirty seconds: *voilà ce qui vient d'être fait,
voilà où ça met le projet, voilà ce que tu dois garder en tête, voilà ce que tu dois trancher.* It is
a briefing, not a changelog — the diff already lists the edits.

Exact shape, `---` rules included (they draw the card's frame at full window width):

---

### ✅ Debrief · {lane ou workstream}

{Une ligne : ce qui vient d'être fait, en langage opérateur.}

**📊 Avancement** — 🟩🟩🟩⬜⬜ {n/N unité} · {fait git / PR / test réel}

**🧠 À retenir**
- {fait clé}
- {fait clé}
- 🤝 **Décidé pour toi** — {choix réversible pris sans demander}

**⚖️ Tu décides**
- {la question, courte} → **reco :** {l'option recommandée} · sinon {l'alternative}

**➡️ Suite** — {la prochaine action utile}

**⚠️ Vigilance** — {un seul risque réel}

---

**Hard rules — these are what keep the card readable.**

- **One idea per bullet, one line at a normal window width.** Never a paragraph inside the card — a
  prose blob is exactly what stopped being read. Markdown wraps gracefully, so there is no character
  count to respect; but a bullet that needs three lines is two bullets, or belongs in the body above.
- **Six blocks maximum**, in the order above, and an empty block is **deleted**, never filled with
  "none". A full card renders in about twelve lines.
- **The status emoji in the title carries the real state:** `✅` fait · `🟡` besoin de toi · `🔴`
  bloqué · `👀` en observation. The section emojis (📊 🧠 🤝 ⚖️ ➡️ ⚠️) are **fixed** — they are
  landmarks the eye learns, not decoration, so they never vary from one card to the next.
- **`Avancement` positions the work in the global project, not in the turn.** Sprint tasks closed,
  plan to-dos done, screens ported, PRs open — a 5-block bar (🟩 filled / ⬜ empty) plus the ratio.
  Only render a ratio when something countable was actually read this turn: sprint task files by
  status marker, plan checkboxes, `PORT-MAP.md` rows, the PR list. On Claude Code the `/brief`
  context script already emits `sprint` and `sprint_progress` for free. Nothing countable → name the
  lane and its position in words. **Never invent a ratio.**
- **`À retenir` is the brief itself — 2 to 4 bullets.** What the operator must hold in his head
  tomorrow: what now works, what changed shape, what got ruled out, what surprised us. Include one
  **🤝 `Décidé pour toi`** bullet whenever a reversible call was made without asking, so it can be
  objected to cheaply. No bullet that merely restates a file edit.
- **`Tu décides` — 0 to 2 items, recommendation first**, same grammar as a `### Needs decision`
  block, which stays the long form in the body when a decision needs its options laid out. Nothing to
  decide → one line: `**⚖️ Tu décides** — rien. J'ai tranché : X, Y.` A decision is never buried in
  the prose above the card.
- **`Suite` — exactly one action**, the single most useful next move (`terminé` when truly finished),
  followed by the `▶ Prompt suivant` block: one fenced, self-contained prompt — goal, repo and key
  paths, constraints, acceptance — pasteable into a fresh window with zero extra context.
- **`Vigilance` only when the risk is real and sharp.**
- **Link what is clickable.** Paths as markdown links (`[method-core.md](docs/METHOD/method-core.md)`),
  commits, commands and error strings as inline code. That is half the reason the card is not fenced.
- **Everything in the card is grounded** in a command run or a file read this turn. Unknown stays
  `inconnu`; never a plausible guess. The card is the most-read surface of the whole METHOD — a wrong
  number there is worse than a missing one.

**Cadence.** The card must stay rare enough to keep meaning something:

| Answer | Close with |
|---|---|
| Substantial — code or docs changed, a slice closed, a decision taken, a handoff, `/brief`, `/land`, `/ship`, `/relay`, `/review` | Full Debrief + `▶ Prompt suivant` |
| Small — a question answered, a lookup, a one-line fix | One landing line: `✅ {ce qui est fait} · suite → {l'action}` |
| Nothing done — refusal, clarification, pure conversation | No card at all |

**Who renders it.** Only the agent speaking to the operator — the orchestrator, or a single agent
working directly with him. A **delegated sub-agent never emits a Debrief**: its report goes to its
orchestrator as a handoff (3-line header + task report, uncompressed per Output Compression), and
the orchestrator folds those reports into one card. Otherwise a `junia → brian → sage → vera` chain
lands four cards in one answer and the format dies of noise.

**Relation to the 3-line header.** `Done / State / Next` remains the opening header of **written
artifacts** — PR bodies, task reports, sub-agent reports. In chat with the operator the Debrief does
that job at the close, where the eye lands after a long turn; rendering both is the redundancy that
made the summary wallpaper. Chat replies instead **lead with the answer**: first line = what changed,
no preamble.

### The Flight Deck — pickup card

Rendered for `/brief`, for a resume hook injecting "Resume Flight Deck context", and at a cold
start — never as the closing summary of work. Same markdown grammar as the Debrief:

---

### 🛫 Flight Deck · {projet} — {workstream}

`{chemin}` · branche `{branch}`

- **🎯 Enjeu** — pourquoi ça compte, quelle lane
- **📍 État** — l'état concret : fichiers, tests, runtime, blocages
- **🔀 Git** — ahead/behind, fichiers modifiés, PR, dernier commit
- **➡️ Prochaine** — la prochaine action utile
- **⚖️ Décision** — vrai choix de stratégie, sinon « aucune »
- **🚧 Éviter** — la contrainte ou le risque à ne pas franchir

---

Six rows, grounded in git / status / memory, not vibes, under the same discipline as the Debrief: one
line per row, no paragraph. If `État` holds three facts, keep the two that change the next decision
and push the rest into the body.

> **Surface note.** Claude Code, Claude Desktop and the web app all render markdown, so the cards
> look right on every surface — which a fenced block did not. Where markdown is not rendered at all,
> the bold markers and emoji degrade to plain text and the card stays legible; that is the worst
> case, and it is still better than a monospace box.

---

## Firebase Deployment Readiness

Before deploying to Firebase (staging or production), verify this checklist:

### Environment
- [ ] `.env.local` / `.env.production` variables match Firebase project
- [ ] Firebase project selected correct: `firebase use {project-id}`
- [ ] No hardcoded credentials or API keys in source

### Region
- [ ] Default Firebase regional services to `europe-west1` (Belgium) or `europe-west4` (Netherlands) for production and staging.
- [ ] **Firestore** database created in `europe-west1`, `europe-west4`, or `eur3` (multi-region Europe).
- [ ] **Firebase App Hosting** backend set to `europe-west1` or `europe-west4` (`apphosting.yaml` → `runConfig.region`).
- [ ] **Cloud Functions / Cloud Run** deployed in `europe-west1` or `europe-west4`.
- [ ] **Firebase Storage** bucket created in `europe-west1`.
- [ ] Do not deploy regional Firebase services elsewhere unless `project/tech-stack.md` documents the exception.
- [ ] Remember Firebase Hosting (CDN) is globally distributed; the region directive applies to App Hosting, Functions, Cloud Run, and other regional resources.

### Rules & Security
- [ ] Firestore security rules deployed: `firebase deploy --only firestore:rules`
- [ ] Firestore rules include **default-deny** catch-all: `match /{document=**} { allow read, write: if false; }`
- [ ] Storage rules deployed (if used): `firebase deploy --only storage`
- [ ] Auth providers configured in Firebase Console
- [ ] Multitenancy isolation enforced (tenant-scoped reads, no cross-tenant leaks)
- [ ] `enforceApiGuard()` applied on all POST/PUT/DELETE API routes (rate limit + payload check)
- [ ] Firebase App Check enabled (reCAPTCHA Enterprise) to protect Firestore/Storage from direct API abuse
- [ ] No AI keys (`GEMINI_API_KEY`, `OPENAI_API_KEY`) exposed in client bundle — see PROJECT SECURITY §4

### Build
- [ ] `npm run build` passes with no errors
- [ ] TypeScript check passes: `npx tsc --noEmit`
- [ ] No linter errors: `npm run lint`

### Hosting
- [ ] `firebase.json` points to correct output directory (`out/` or `.next/`)
- [ ] Rewrites configured for Next.js routes
- [ ] Deploy to **staging first**: `firebase deploy --project staging`
- [ ] Smoke test on staging URL before deploying to production

### Deploy
```bash
# Staging
npx -y firebase-tools@latest deploy --project staging

# Production (only after staging passes)
npx -y firebase-tools@latest deploy --project production
```

**DoD for deployment:** Staging smoke test passed → screenshot saved → then deploy to prod.

---

### Step 1: Reproduce
- Local environment OR staging
- Minimal repro steps
- Check logs (browser console, Firebase logs)

### Step 2: Isolate
- Narrow down: which component/function/API?
- Add debug logs
- Use breakpoints (VS Code debugger)

### Step 3: Fix
- Minimal change
- Add test to prevent regression

### Step 4: Verify
- Smoke test
- Check no new errors
- Update bug file with fix details

---

## Error Handling

### User-Facing Errors

**Show helpful messages:**
```typescript
try {
  await saveInvoice(data);
} catch (error) {
  toast.error(t('errors.saveFailed'));
  logError(error, { context: 'saveInvoice', userId });
}
```

**i18n error messages:**
```json
{
  "errors.saveFailed": "Could not save invoice. Please try again."
}
```

---

### Developer Errors

**Log to console (dev) + Cloud Logging (prod):**
```typescript
import { logError } from '@/lib/logging';

logError(error, {
  context: 'user-settings',
  userId: user.uid,
  action: 'update-profile'
});
```

---

## File Naming

- **React components:** PascalCase (`SettingsPage.tsx`)
- **Utilities:** camelCase (`formatCurrency.ts`)
- **Constants:** SCREAMING_SNAKE_CASE (`MAX_FILE_SIZE`)
- **Test files:** `*.test.ts` or `*.spec.ts`

---

## Code Style

**Enforced by:**
- ESLint (syntax, patterns)
- Prettier (formatting)
- TypeScript (types)

**Run before commit:**
```bash
npm run lint
npm run typecheck
```

---

## Environment Variables

**Local:** `.env.local` (git-ignored)

**Example:**
```env
NEXT_PUBLIC_FIREBASE_API_KEY=...      # OK — Firebase config is designed to be public
NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN=...  # OK — Firebase config is designed to be public
FIREBASE_ADMIN_KEY=...                # ⛔ Server-only — NO NEXT_PUBLIC_ prefix
GEMINI_API_KEY=...                    # ⛔ Server-only — never NEXT_PUBLIC_ or VITE_
```

**Naming:**
- `NEXT_PUBLIC_*`: Client-side (Next.js) — **Firebase config only. Never secrets.**
- `VITE_*`: Client-side (Vite) — **Same rule: never secrets.**
- No prefix: Server-only

> ⚠️ **CRITICAL:** `NEXT_PUBLIC_` and `VITE_` variables are embedded in the JS bundle and visible to anyone. Never use these prefixes for AI keys (Gemini, OpenAI, Anthropic), Stripe Secret keys, or any credential. See `docs/definition/security/PROJECT SECURITY.md` §1 + §4.

---

## Security Baseline

> **Full standard:** `docs/definition/security/PROJECT SECURITY.md` (v1.1)

1. **Never commit secrets** — use `.env.local`, enforce via `.gitignore` patterns (`*.key`, `service-account.json`)
2. **Zero Client Keys** — no AI keys (Gemini, OpenAI, Stripe Secret) in `NEXT_PUBLIC_*` or `VITE_*` or Vite `define` blocks
3. **API Guard on every route** — `enforceApiGuard()` with rate limiting, origin check, payload validation on all POST/PUT/DELETE routes
4. **Proxy AI calls server-side** — client calls `/api/ai/*`, server calls Gemini/OpenAI with secret key. Never `GoogleGenAI` from client code.
5. **Validate user input** — Zod schemas. `schema.parse(data)` before every Firestore write.
6. **Firestore rules: default-deny** — `match /{document=**} { allow read, write: if false; }` as first rule. No `allow read: if true` in production.
7. **Multitenancy isolation** — tenant membership gates all `teams/{teamId}/...` data. Never trust `teamId` from client.
8. **Auth required for sensitive operations** — verify Firebase Auth token on every API route
9. **Firebase App Check** — reCAPTCHA Enterprise required for production. Protects Firestore/Storage from direct REST API abuse.
10. **Rate limiting** — `enforceApiGuard()` on Next.js routes. Cloud Functions use Firebase App Check attestation.
11. **Regional compliance** — all Firebase services in `europe-west1` or `europe-west4`. No US default regions.
12. **No `eval()`, no `dangerouslySetInnerHTML`** without sanitization — code injection vectors.

---

## Performance Baseline

1. **Code splitting** (Next.js automatic)
2. **Image optimization** (`next/image`)
3. **Lazy loading** (React.lazy for heavy components)
4. **Caching** (Firebase SDK, SWR for API data)
5. **Bundle analysis** (check bundle size quarterly)

---

## Accessibility Baseline

### Minimum
- Semantic HTML (`<button>`, `<nav>`, `<main>`)
- Alt text for images
- Focus visible (default browser styles OK)

### Full (FULL)
- WCAG AA contrast (4.5:1 text, 3:1 UI)
- Keyboard navigation (tab order, escape to close)
- Screen reader tested (NVDA or VoiceOver)
- Focus indicators (custom, visible)
- ARIA labels where needed

---

## Next Steps

- **First sprint:** Load `sprints-method.md` → plan sprint
- **Task execution:** Load `routing-method.md` → check agent entry files
- **Review workflow:** Load `agents-method.md` → understand Core Loop vs On-Demand

---

**Owner:** Lucia  
**Last Updated:** 2026-06-01

