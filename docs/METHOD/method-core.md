# METHOD Core Principles

**Owner:** Lucia  
**Version:** 310.a  
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

**Default: one short-lived branch per sprint task.** Never commit directly to `main`.

```bash
# Start task:
git checkout -b feat/{sprint}-{seq}-{scope}   # e.g., feat/120-a-admin-nav

# Work (commit often):
git add .
git commit -m "feat(admin): implement sidebar navigation"
git push origin feat/120-a-admin-nav

# When task is ✅ and CI is green:
# → Merge to main (PR or fast-forward)
git checkout main
git merge feat/120-a-admin-nav
git push origin main
git branch -d feat/120-a-admin-nav
```

**Branch rules:**
- Max lifespan: **3 days** (if longer, scope is too big — split the task)
- Branch name: `feat/`, `fix/`, `chore/` prefix matching commit types
- **Never force-push to `main`**
- **Run the checks locally before merge** (see Merge Gate below)

**Why branches matter for solo devs:** Without a teammate to catch mistakes, the branch IS your recovery point. Committing directly to `main` means broken code immediately becomes "truth" with nothing to roll back to.

### Merge Gate (local — there is no CI)

**There is no CI and no branch protection on this account.** The GitHub Actions workflows were deleted on 2026-06-28 (`8b989e9`, billing), and enabling branch protection returns HTTP 403 on this plan. Nothing checks a merge to `main`. Merging is the deploy.

**So run these yourself, on the branch, before you merge:**
- [ ] `npm run lint` — no linter errors
- [ ] `npx tsc --noEmit` — TypeScript compiles
- [ ] `npm test` — unit + integration tests pass
- [ ] `npm run build` — production build succeeds
- [ ] `npx playwright test` — E2E specs pass (where E2E exists)

**If any is red:** fix it before anything else. Nothing downstream will catch it for you.

### Sync Cadence

**Git commit + push is required after every completed task** — not only at sprint end.

```bash
# After every ✅ task:
# (on your feature branch)
git add .
git commit -m "feat(notifications): implement FCM"
git push origin feat/015-b-fcm

# Merge to main once CI passes:
git checkout main && git merge feat/015-b-fcm && git push origin main
```

**Why:** Ensures progress is never lost, makes review easier, and keeps remote in sync with actual state at all times.

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

