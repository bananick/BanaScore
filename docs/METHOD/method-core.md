# METHOD Core Principles

**Owner:** Lucia  
**Version:** 336.a  
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

Core Loop handles most work — plan (Junia) → build (Brian) → one review per slice (Vera) → land → prove (Sage). Specialists join when their domain is touched; the coordinating conversation runs the loop.

Governance scales naturally based on what you're building.

---

### Lightweight Governance

**No heavy process unless needed.**

Quality gates are built into the workflow:
- Pre-Flight: Check clarity before starting (the Cadrage)
- Review Gate: Vera validates once per slice, at the Recette
- Kill Gate: the coordinator consolidates before closing a sprint (sprint mode only)

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
- **CI/CD:** none — gates run **locally** before merge (see "Merge Gate" below); GitHub Actions is billing-blocked account-wide, by choice, unrelated to the active GCP/Firebase billing (`SOUL.md` → "Boundaries"). Merging to `main` is **LANDED** — deploying is its own step, with its own evidence (the served revision).
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

- [ ] Journey proven — the named CUJ observed end-to-end on the named environment; state reported as CODED · LANDED · DEPLOYED · PROVEN with evidence
- [ ] Critical path tests pass
- [ ] TypeScript strict (no `any`)
- [ ] i18n strings externalized (EN/FR)
- [ ] No lint errors
- [ ] Task report appended
- [ ] Committed + landed (`/land`) — reported as LANDED; DEPLOYED / PROVEN only with their own evidence
- [ ] Review Gate passed (Vera, once per slice at the Recette) → tasks marked `☑️`
- [ ] FOCUS.md / STATE.md updated if objective completed (in a chantier sub-session: the fiche instead)

> **Task-specific gates** (apply when the task touches that area, not on every task):
> Zod schemas + `project/SCHEMA.md` updated (data touched) · empty/error/loading states (UI)
> · security check, see `docs/definition/security/PROJECT SECURITY.md` (sensitive ops).

> **Machine-checked since 318.a:** `/land` (`.claude/hooks/verify-gate.mjs`, every app) refuses a
> **newly added** intervention or task file that does not carry `**Journey:**` and `**Proof:**`.
> Older files are never retro-failed. The rest of the list is honour-system.

**Quality gates:**
- **Pre-Flight:** Check clarity before starting (see task template)
- **Review Gate:** Vera validates once per slice, at the Recette (always opus)
- **Kill Gate:** the coordinator consolidates before closing a sprint (see sprints-method.md)

**When to add more:**
- E2E tests for critical user journeys
- Integration tests for complex Firebase/API interactions
- Component tests for reusable UI components
- Architectural tests when enforcing boundaries
- Visual regression when design precision matters
- Full a11y audit (WCAG AA) for public-facing features

---

## The two-moment contract — Cadrage · Recette

The operator is invited into the choices at the **two ends** of the work, never the middle.

**🎯 Cadrage — before building anything substantial.** Substantial = touches app code, spans more
than one step, or implies a choice. One `AskUserQuestion` (≤ 4 questions, recommended answer always
first) fixes: **Journey** (which CUJ(s) this work closes — an existing
`docs/project/journeys/{cuj}.md` or a new one), **Proof** (which observed run, on which
environment, with which real data, proves it — failure/recovery case included when the journey has
one), **Out of scope** (what is explicitly parked), and *when needed* the one real
strategy/architecture choice with concrete trade-offs. Answers are written into the task /
intervention file (`Journey:` · `Proof:`) before the first edit — and since 318.a `/land` refuses a
newly added intervention or task file that lacks them, in every app. Skipped for a question, a
lookup, a one-line fix. (Junia may draft the quiz; only the coordinating conversation can ask it.)

**Middle — autonomous.** No "shall I continue?", no naming questions, no mid-build check-ins. Only
the conflict gate (data model, permissions, scope, irreversible) stops for a `### Needs decision`.

**Questions are quizzes, never prose (322.c).** Every question put to the operator — the Cadrage, a
conflict-gate `### Needs decision`, an ambiguity met mid-build, the Recette's accept / reopen / defer,
any "which one?" — is **prepared in advance and asked as a quiz with the `AskUserQuestion` tool**,
never as a question written into the chat text. The operator must not have to type an answer to
something the agent could have turned into a choice.

- **Prepare, then ask once.** Gather everything that blocks into one call (≤ 4 questions, 2–4 options
  each, recommended option **first** and marked, one line of consequence per option, `multiSelect`
  when the options are not exclusive). "Other" is added by the tool. Never drip questions across turns.
- **The text is context, the quiz is the question.** The Debrief's `Tu décides` row names the decision
  in one line; the call that carries it is the last thing of the turn. A trailing "qu'en penses-tu ?"
  / "want me to…?" in prose is a defect.
- **A sub-agent cannot ask.** It hands back its open questions as a `### Needs decision` block with
  options and a recommendation; the coordinating conversation turns it into the quiz.
- **Free text only when it is the answer** (a name, a URL, a number): the quiz still offers the best
  guess as an option, "Other" takes the rest.
- **No `AskUserQuestion` on the surface** (Cursor, Codex, headless, scheduled run): write the same
  quiz as one block — numbered questions, lettered options, recommended first — never loose
  questions scattered in the prose.
- "Shall I continue?" check-ins stay banned: a quiz is for a real choice, not for permission.
- **In a chantier the operator's input is an inbox (322.g):** the supervisor asks at most 4 closed questions per batch, recommendation first, ordered by blocking cost (conflict-gate decisions first, then slices blocked × deadline), pushes to the phone only when a slice is actually blocked, and a reversible decision defaults to its reco after 2 h instead of waiting — `sprints-method.md` → "The chantier".

**✅ Recette — before the Debrief.** (1) The **recette table**: each deliverable asked at Cadrage →
shown (link / evidence) or not; a test count never substitutes for the thing asked. (2) **Four
states, never merged:** `CODED` · `LANDED` · `DEPLOYED` · `PROVEN`. Landed is a push; it is never
reported as deployed or proven without its own evidence (served revision · observed run). (3) When
a journey is claimed `PROVEN`, one `AskUserQuestion`: **accept / reopen / defer**, with a ≤ 3-minute
test script the operator can run, written as the **🔎 Preuve à jouer** block (below). In a chantier only the results that clients see or that touch money (`needsOperator`) reach the operator, in one batch per slice at its Recette; the rest are accepted by `vera` + `sage` and listed as reopenable (`sprints-method.md` → "The chantier"). (4) `Avancement` in the Debrief counts journeys proven, not tasks
closed. **Who does what at the Recette:** `vera` reviews the slice once (opus) before it lands;
`sage` runs the `Proof:` on the environment it names, with real data, and records it — so `PROVEN`
is an observation, never the coordinator's say-so.

**🔎 Preuve à jouer — every proof ask carries it, first (330.b).** Whenever an agent asks the operator to prove
or accept a journey — the Recette's accept / reopen / defer quiz, a chantier fiche `review[]` item of
`kind: result` with `needsOperator: true`, a Debrief or mission card whose `Suite` is a proof — it puts, in one
dedicated block titled **🔎 Preuve à jouer**:

1. **Where** — the exact clickable URL(s) to open (prod or preview), with the real slug, locale and params;
   never a placeholder (`{slug}`, `localhost` when the proof is on prod, "the page").
2. **Steps** — numbered, ≤ 3 minutes in total, each with its **expected result** ("→ you see …").
3. **Evidence already gathered** — as clickable links: screenshots (committed path, or a file sent to the
   operator with `SendUserFile`), the served revision / build id, the PR or landed sha, the test run.
4. **Not proven yet** — what this ask does not cover (a failure / recovery case not played, a persona, an
   environment). `Rien` when nothing.

In the Debrief the block sits **right above `➡️ Suite`**; on the mission card it replaces the `📸` line; in a
chantier fiche it is the `review[]` fields `urls` · `script` · `evidence` · `notProven`; in the
`AskUserQuestion` it is the text right before the quiz. **A proof ask without it is incomplete** — the
coordinator sends it back rather than relaying it. Why: an operator asked to accept a journey had to hunt for
the URL, the screenshots and the steps (operator request, 2026-10-22; `docs/interventions/2026-10-22-Lucia-preuve-cuj-reperable.md`).

**The CUJ is the unit.** Every conversation, sprint and task names the journey(s) it closes. A
journey has one shape, `docs/METHOD/templates/CUJ-TEMPLATE.md`, and lives in
`docs/project/journeys/{cuj}.md`. No gatekeeper agent: the shape plus the `Journey:`/`Proof:` fields
plus the landing gate (and the hub doctor's E9) are the whole law.

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

**The operator does not manage pull requests.** Every conversation ends by **landing on `main`** (the
trunk — `land.mjs` reads it from `origin/HEAD`, so a `master` repo lands the same way), and the
result is **LANDED**: `DEPLOYED` and `PROVEN` need their own evidence — `land.mjs` deploys nothing.
A PR is the **exception** — the artifact of something a human must decide — not
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

**Merge Gate (local — there is no CI).** This is the gate the rest of the METHOD refers to as
"the Merge Gate": it is now *run for you* by `verify-gate.mjs` rather than recited from a checklist.
For the `app` lane, green means all four of `npm run lint` · `npx tsc --noEmit` (or the app's
`typecheck` script) · `npm test` · `npm run build`, plus `npx playwright test` where E2E exists.
If any is red: fix it before anything else — nothing downstream will catch it for you.

**What the gate actually runs (317.b, after three landings went red for reasons unrelated to
the diff):** where a root exposes **`test:gate`** — the allowlist `prebuild` runs in the build
container — the gate runs *that*, not the full `test` (emulator + network, > 10 min); each script
gets **30 min** (`build` replays `prebuild`); the spawn buffer is **64 MB**, because under
`CI=true` vitest's reporter emits > 1 MB of JSON and the 1 MB default turned 2 695 green tests into
"`test:gate` failed" with an empty tail (`ENOBUFS`); and `src/**/*.json` (i18n catalogues) is
**app** lane, not "unclassifiable". Study data is **doc** lane (323.b): `*.csv`, `*.tsv`,
`*.geojson` anywhere, and a nested `.json` that neither tooling nor an app root owns —
`firestore.indexes.json` and json under an orphan `src/` still fail closed. A root with **no
`node_modules`** whose diff is plain Node JS (`*.mjs`/`*.cjs`/`*.js`) can be verified with Node alone (324.b):
a changed file that imports `node:test` (found by content, not name) is run by `node --test` — the only
check that verifies; `node --check` runs on every changed JS as an extra check (red on a syntax error) but
never makes the lane green, so a JS diff with no `node:test` file stays `blocked`. Unrun npm scripts are
`skipped: 'no-deps'`, never a pass; a ts/tsx/jsx/vue file, a vitest/jest/mocha/ava/tap import, or a
test-looking file (`test/`, `tests/`, `__tests__/`, `*.test.*`, `*.spec.*`, `*_test.*`) without
`node:test` keeps the `blocked` floor.
**Lint judges the diff, not the lane (334.c):** when a root's `lint` script is a plain `eslint …`
command, the gate runs that eslint (same config and flags, minus `--fix` / output / cache) on the root's
**changed** files only — added or modified vs `--base`, narrowed to the script's own globs and to lintable
extensions; none changed → lint passes (`files: 0`). **Only new problems are red (334.d):** eslint errors are
counted per (file, rule) at HEAD and on the merge-base text (`git cat-file --filters`, fed through `--stdin`); a
count that grows, or an error in a file new since the merge base, is red; an eslint crash is red. A composite
command, another linter, an unknown flag or an unresolvable eslint keeps the whole-lane run. Typecheck, tests
and build still judge the whole lane — pre-existing lint debt no longer holds an unrelated landing.
**Jest and vitest run serially, with a roomy timeout (334.e):** when a lane's `test:gate` / `test` script is a plain
`jest …` or `vitest run …` command, the gate appends (`npm run <script> -- …`) `--runInBand` (jest) or
`--no-file-parallelism` (vitest, only if the installed vitest is ≥ 1) plus `--testTimeout=30000`, each only if the script
does not already set it (jest: `--runInBand`/`-i`/`--maxWorkers`/`-w`; vitest: `--no-file-parallelism`/`--fileParallelism`/
`--pool`/`--poolOptions`/`--maxWorkers`/`--no-threads`/`--singleThread`; both: `--testTimeout`). A composite command, vitest
watch/bench, or another runner is left as written. A failing test is still red — the timeout is longer, not removed.
A red gate with an empty tail is a gate bug, not a test — read
`.method/verify-ok.json` before touching the code.

**Worktrees run the main checkout's hooks.** `.claude/` is gitignored, so every git worktree
carries its own copy of `land.mjs` / `verify-gate.mjs`, frozen at creation, while
`install.mjs` only ever refreshes the main checkout's. Since 317.b `land.mjs` resolves the main
checkout (`git rev-parse --git-common-dir`) and runs **its** `verify-gate.mjs`; a worktree copy of
`land.mjs` re-execs the main copy. Worktrees created **before** 317.b still hold the old
`land.mjs`: recopy once — `cp <main>/.claude/hooks/*.mjs .claude/hooks/` — before the first
`/land`, and never patch a hook inside a worktree (the fix belongs in the addon payload).

**The exception list — fail-closed, and the only reasons a PR is correct** (332.a: `deps` and `scale` are struck — `land.mjs` logs « auto-landing past … benign exception(s) » and runs the verify gate; `land:sweep:apply` treats them as clean):

| Exception | Why a human looks | Cleared by (336.a) |
|---|---|---|
| **schema** — `SCHEMA.md`, `schemas/`, `*.zod.ts`, `firestore`/`storage.rules`, `*.indexes.json` | data-model changes are the conflict gate; never decide one yourself | `kasper` → merge, **except** `firestore`/`storage.rules` and `*.indexes.json` → the quiz |
| **security** — `auth/`, `middleware/`, `.env*`, `serviceAccount*`, `security/` | our most common production failure | `kasper` → merge, **except** secrets (`.env*`, `serviceAccount*`) → the quiz |
| **soul** — `SOUL.md` | the non-negotiables are the operator's, not an agent's | always the quiz |
| ~~**deps**~~ — a real `dependencies`/`devDependencies` edit, any lockfile | **no longer held (332.a)**: it lands after the verify gate. Supply-chain risk accepted by the operator, 2026-10-24 | — |
| **migration** — `migrations/`, `*migrate*.mjs\|ts` | irreversible against live data | always the quiz |
| **infra** — `.github/workflows/`, `apphosting.yaml` | changes what deploy means | `kasper` → merge |
| ~~**scale**~~ — > 60 files or > 2000 deleted lines | **no longer held (332.a)**: it lands after the verify gate; splitting the slice is still advised | — |
| **hold** — `[no-auto-merge]`, `[wip]`, `[hold]`, `Needs decision` in a commit **subject**, or `wip` in the branch name | the operator's one-token brake (subjects only — a body that *documents* these markers must not trip them) | always the quiz |
| **red / absent / stale verify · trunk conflict** | fix it, don't route around it | nobody — fix it |

Held back → the gate pushes the branch, opens or comments on a PR **once** with the exact reason, and
the report carries a `### Needs decision` block with a recommendation. Two legitimate outs, both
explicit: resolve the reason, or — when the exception fired on something genuinely harmless — land it
with **`[land-anyway]`** in the commit subject and say so in the report. Since 336.a the last column
decides who clears a held PR: `kasper` first where he can, the operator's quiz otherwise ("Exception PRs", below).

Root `firestore.rules` / `storage.rules` have a tooling lane in `verify-gate.mjs` (322.f — a lane, not a pass) but stay held by the **schema** exception; `[land-anyway]` / `--force-land` may still override it, an honour-system call the operator made on 2026-10-15 against Kasper's recommendation.

**Forbidden, always:** `gh pr merge --admin` · force-push · `git rebase` · deleting the marker to
fake a green · `git add -A` sweeping someone else's in-flight work into your commit.

#### Closing a finished sub-session (336.a)

A sub-session whose work is LANDED closes itself — the operator never archives it by hand.

| Step | What runs |
|---|---|
| **1. Done test** | `npm run session:close` (`--check`, the default): LANDED on the trunk · nothing uncommitted · nothing unpushed · no open PR. Any "no" → it prints why; the session stays open. |
| **2. Git side** | `npm run session:close -- --apply`: detaches HEAD, deletes the branch **only** through `branch-sweep.mjs --apply --landed-only --only <branch>` (331.a) — never a hand-typed `git branch -D`. |
| **3. Report up** | The session's **Fait / Suite** (335.a) goes to the parent control tower by `SendMessage` — the script prints the step, the agent runs it. |
| **4. Archive, last** | `archive_session self` — reversible, and the session's final action. |

Hooks cannot call the app's session tools, so `.claude/hooks/session-close.mjs` (`hugo`) does the git side and
prints steps 3–4; `land.mjs` names `session:close` as the next step after a landing. A session that misses its
close is caught by `regine`'s weekly pass — the fallback, not the path.

#### Exception PRs (336.a)

A PR held by **schema / security / migration / infra** is reviewed by `kasper`, run automatically on **opus**
(never below). He writes `.method/kasper/pr-<n>.json` → `{ "reviewer": "kasper", "verdict": "approve" | "reject", "summary", "sha" }`
(`block` = `reject`) and never merges himself. The file is an **honour-system** brake, like the verify marker:
only the sha binding is machine-checked, so writing it for kasper is forbidden. Then `npm run session:close -- --pr <n>` does exactly one of:

| The PR | `--pr <n>` does |
|---|---|
| kasper `approve` at the PR head sha · verify gate green at that head · nothing irreversible | `gh pr ready` + `gh pr merge --squash --match-head-commit`, then the branch through `branch-sweep` |
| **Irreversible in production** — any `*.rules`, `firebase.json` / `.firebaserc`, indexes, migrations / backfills, secrets and keys — or METHOD tooling (`.claude/hooks/`, `.claude/settings.json`: a PR never judges its own merge), a base other than the trunk, a fork, or **`soul`** / **`hold`** (the operator's brakes) | merges nothing; prints **one** quiz for the parent control tower: kasper's summary + **merge / close / defer** |
| kasper `reject`, a sha that is not the PR head, or a red gate | merges nothing; the reason goes back to the session to fix |

`--pr` runs from the trunk's copy of the hook (it refuses a lib older than its own checks); a PR that touches
`.claude/hooks/` is merged by the operator, never by `--pr`. Never `--admin`, never `--delete-branch`, never a force-push. Deploying rules or running a migration stays
`/deploy` and the operator. PRs open > 3 days: `npm run session:close -- --stale --days 3 --fleet`, in
`regine`'s weekly pass, one merge / close / defer quiz per PR.

### Slice discipline (why this saves tokens)

Landing is what keeps conversations small, and small conversations are the cost control:

- **One conversation = one slice = one landing.** If a conversation has not landed anything and the
  context is filling up, the slice was too big — land what is green, `/relay`, and start fresh.
- **Landing beats relaying.** A landed slice needs no handoff prose at all: `main` *is* the state.
  `/relay` is for a slice that genuinely spans windows, not a substitute for finishing one.
- **Route residue-heavy work to sub-agents** (Explore for a lookup, Iris for a study) that return
  conclusions only — see
  "Project State & Handoff".
- **A PR is a token liability**: it means the work is coming back later, in a new window, with the
  context re-derived from scratch.

### Sync Cadence

**Commit after every completed task; land at the end of the conversation.**

```bash
# After every ✅ task, on your branch:
git add . && git commit -m "feat(notifications): implement FCM"
npm run land          # verify → fast-forward main = LANDED (deploying is its own step; no CI)
```

**Why:** progress is never lost, `main` is always the truth, and no queue of pull requests
accumulates behind the operator's attention.

---

## Project State & Handoff (STATE.md)

`project/STATE.md` is the durable single source of truth for **where the app is right now**. Since
METHOD 325.c only its `## Resume here` section is read at startup (`CLAUDE.md` → "Context Loading
Rules" rule 2) — the rest is read by `§`, on demand, and an agent whose `Entry files:` line names the
file without a `§` reads it whole, deliberately. Standard sections: a header (Last Updated,
Current Sprint, Status, METHOD Version), then **Active Work**, **Blockers**, **Recent Decisions**,
**Next Up**. In a chantier only the supervisor edits it; a sub-session updates its fiche instead
(`sprints-method.md` → "The chantier").

### `## Resume here` — the Relay home

The dropoff ritual `/relay` (alias `/handoff`) writes a `## Resume here` section near the top of
`STATE.md` so the next conversation resumes without re-pasting context. It is the **inverse of
`/brief`**: `/brief` picks up (rehydrates from git + `STATE.md` + memory), `/relay` drops off
(flushes the live working-state before the window ends). `## Resume here` is the one section every
session and every sub-agent reads at startup (325.c), so `/brief` reads the block for free — and so
does every launch, which is why it stays short. One `## Resume here` block per app; each `/relay` overwrites the
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
sub-agents (Explore for a lookup, Iris for a study) that return **conclusions only**. The main context then accumulates less
residue, so it needs fewer Relays in the first place.

**Sub-agent vs. separate session — the two halves.** A **sub-agent** returns a conclusion into a
context you keep: you stay the owner of the thread, the branch and the Relay. A **separate session**
carries the context away and gives back a *document* — it owns its own branch and worktree, and it
does **not** relay (there is one `## Resume here` per app, and the main conversation holds it). So
offloading is the default and splitting is the exception. The four observed facts that justify the
split, the `Stop`-hook mechanism that makes two sessions on one branch diverge silently, and the
**chantier** (≥ 2 code-writing slices → a supervision session + one sub-session per slice):
`sprints-method.md` → "Sessions & branches".

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
be copy-pasted (fence it as `bash` for a command, so the app renders a Run button). In a chantier
there is none (see "Cadence").

### The operator lever (335.b)

Every answer serves **the operator's decision speed**. Four rules hold before any card is drawn:

- **Proof first.** He opens what was done in one click, before any prose.
- **Choices come prepared**, as a quiz (`AskUserQuestion`, ≤ 4 options, the recommendation first). A
  choice is never left for him to type.
- **A reversible step inside scope is done, not offered**: commit, land, relaunch, re-run.
- **His replies are a measured signal.** « donne moi le lien », « show me », a re-asked state
  (« merged ? », « fini ? ») and a typed confirmation each count as a **miss** of the answer before it.
  IMP-029 counts them at J+7, and Oscar's weekly retro turns them into one habit to change.

Delegates feed it: `vera`, `sage`, `iris`, `regine` and `watson` hand back **closing-ready** reports
(one proof link per point, a suggested fate, a ready quiz when a choice exists).

### Closing by session type (330.a · 335.a)

The 2026-10-23 study (40 sessions, 107 Debriefs) measured the average closing at **43 lines / 3,375
characters** against a ~12-line spec, **61 %** of the operator's replies as one word (« go »), only
**16 %** of closings ending with a quiz, and **44 %** buried by a notification that came after them. He
hunts for the proof and loses which session holds what. So the closing is now chosen by **what the
session is**, and the shortest one is the default (`docs/interventions/2026-10-23-Lucia-session-closings.md`,
operator rulings of 2026-10-23, trial until the J+7 measurement, `ACTIONS.md` → IMP-022):

| Session type | Closing | Size |
|---|---|---|
| **Autonomous mission** — a free mission or a single slice that worked on its own | **Mission card** (below) | **≤ 9 rendered lines** |
| **Chantier supervisor** | **Control tower** (below) | one row per sub-session |
| **Handoff, `/brief`, `/relay`, `/review`, an answer carrying ≥ 3 decisions** | the full **Debrief** ("The Debrief", below) | ~12 lines |
| Chantier sub-session · delegated sub-agent | no card (unchanged, "Who renders it") | — |

**Shared by every closing:**

- **Fait / Suite: every answer that did something ends with them (335.a,
  `docs/interventions/2026-10-29-Lucia-answer-ending.md`).**
  - **Fait** has 1–3 bullets on what the answer achieved, with the object named, in operator language.
    **Each Fait line carries one clickable proof**: a PR or commit URL for code, the served URL or
    revision for a deploy, a capture for UI, a file link for a study, one output line for ops.
  - **Suite** has 1–3 bullets on what to do next, simple and actionable. **Bullet 1 is the session's
    fate.**
  - Each bullet carries an emoji chosen **for its meaning** (🐛 corrigé · 🧪 tests · 🚀 déployé · 🔍
    trouvé · 📝 doc), never one ✅ per line. **The bullets carry the emojis, so the headings carry none:**
    they are plain bold **Fait** and **Suite**.
  - Pure conversation or nothing done: no Fait / Suite. A delegated sub-agent keeps Done / State / Next.
- **The state word, in every closing title**: `CODÉ · ATTERRI · DÉPLOYÉ · PROUVÉ · en cours · bloqué`
  (CODED · LANDED · DEPLOYED · PROVEN). It answers the re-question « merged ? », « fini ? » (6/57 in
  Iris's 2026-10-29 study). A card title carries no state emoji, because the sidebar title's suffix
  carries the state.
- **🚨 incident flag.** When the agent broke or found something live (prod error, data or a secret at
  risk), the title starts with 🚨 and the incident and its one repair command come first. It is a
  flag, not a fate.
- **The fate: bullet 1 of Suite, one fixed emoji + one fixed verb, `{emoji} {Verbe} : {l'objet}`.** It
  tells the operator in 2 s what to do with *this* session among the many he runs. Each fate comes
  with its **Prêt pour toi** kit:

  | Fate | When | Prêt pour toi | Title suffix |
  |---|---|---|---|
  | 🗄️ **Archive** | LANDED, nothing uncommitted or unpushed, nothing pending | archive offered in the quiz, or done if he already said so | ✅ |
  | 💬 **Réponds** | a choice only he can make | the quiz, ≤ 4 options, « go = … » first; captures first when the choice is visual | 🟡 |
  | 🧪 **Teste** | a screen or behaviour he can reach changed | the URL + a script ≤ 3 min + captures by `SendUserFile`; quiz « accepter / rouvrir / différer » | 🟡 |
  | 🔑 **Agis** | progress needs his hands outside the chat (also when blocked) | one kit per channel, below | 🟡 · 🔴 |
  | ⏳ **Attends** | something launched is still running, nothing else for him | what runs (its id), what wakes the agent, what he can do meanwhile | 👀 |
  | 🔁 **Continue ici** | another slice remains here **and it costs something** (time, quota, scope) | the « go » button | 🟡 |

  - **🔑 Agis, one kit per channel:** **merge** (PR link + the merge command) · **terminal** (one
    command block per step) · **console / Chrome** (exact URL + numbered steps + « Guide-moi dans
    Chrome ») · **install**. Every kit closes with the quiz « C'est fait » / « Ça bloque » / « Fais-le
    avec moi »: **the operator never types a confirmation**, and the agent never types his credentials.
  - **A reversible step inside scope** (commit, land, relaunch, re-run) **is done, not offered**: it is
    never a 🔁.
  - The fate matches the sidebar title's suffix. The `wrap_up` recap's first sentence (the sidebar
    status) opens with the same emoji and verb. Any other Suite bullet names the work.
- **A choice goes in the quiz, never in prose.** When a Suite bullet holds a choice or a validation,
  the closing `AskUserQuestion` carries it, first option « go = {bullet 1} ». No choice → bullets
  only, no quiz. No « dis-moi », no trailing « ? ».
- **Commands are fenced as `bash`**, so the app shows a Run button.
- **Readable layout**, for every closing and every substantial answer:
  - Use real markdown, never a fenced block for prose. Headings are bold, without emoji.
  - Leave a blank line between blocks. A `---` rule frames a card.
  - One idea per bullet, with the **key noun** in bold. Prefer a short table to a list of parallel
    facts.
  - Write paths as clickable links. No paragraph runs longer than 3 lines.
- **Inline card, only when it earns its cost.** The closing may render an inline visual card
  (`show_widget` HTML: tiles with the proofs, a state badge, `sendPrompt` buttons) **only when there are
  visual proofs or several actions**. Otherwise it is plain markdown plus the `wrap_up` box. The card
  costs about 6 k tokens and carries no emoji, only Tabler icons.
- **The journey ladder** (the Debrief's `📊` and the control tower; not the mission card since 335.a) — one line: `Cadré → Codé → Livré → Déployé → Prouvé → Utilisé → Retours`, the
  rung reached in **bold**, then « cette session : X → Y ». It extends the four states (`Livré` =
  LANDED, `Déployé` = DEPLOYED, `Prouvé` = PROVEN) toward real users (`Utilisé`) and their feedback
  (`Retours`). Every rung is grounded in its own evidence; an unknown rung is written `inconnu`.
- **Proof first.** The first thing after the ladder is what the operator can open in one click — a
  link, a screenshot, the ≤ 3-minute steps (when the ask is a proof: the **🔎 Preuve à jouer** block, "The two-moment contract") — before any prose. A closing whose proof he must ask for
  (« donne moi le lien ») failed.
- **The « go » quiz.** The closing ends with an `AskUserQuestion` whose **first option is
  « go = {the recommended action} »**, so one click answers it; it never needs a typed reply. No real
  choice → the card ends without a quiz.
- **Operator-action rule — « systématiquement ».** Whenever the conclusion is that the operator must
  do or validate something, the agent **prepares the path**, or at least offers to: the exact steps,
  the exact URL or page (« connecte-toi à la page API X »), the commands as `bash` fences, what to
  click. The quiz then carries « Prépare-moi le chemin (Chrome) » / « (terminal) » / « Je le fais
  seul » — a guided walk-through in **Claude in Chrome** or in the **terminal**. Inside the safety
  rules: the agent never types credentials or payment details for him and never accepts terms on his
  behalf. It guides; he acts.
- **📸 Automatic visual proof.** When a screen changed, before/after screenshots are taken in the
  built-in browser and sent with `SendUserFile` — so they reach his phone too — with a ≤ 3-minute test
  script.
- **💡 Coach tip** (the control tower only since 335.a) — one line in Oscar's spirit, drawn from what actually happened in this session: a
  habit or shortcut for the operator that gets a user-facing result sooner. Grounded, never generic;
  nothing grounded to say → no tip.
- **🏷️ Title = status.** At closing the session rewrites its sidebar title's **text** to
  `{repo icon} {Projet} · {objet, in result terms} · {state}` (e.g. `⚡ FunFlasher · choix inscription · 🟡`,
  `🗣️ Talkation · lecteur prouvé · ✅`). The state stays the **suffix** that the pin-while-waiting rule
  reads (`sprints-method.md` → "Sidebar contract", rule 1); a sub-session keeps its slice code first, a
  supervisor its `🧑‍✈️`. Sorting, sections and pins are the sidebar contract's, not this rule's.
- **The app's `wrap_up` « next step » box**: its recap is the closing's first line, and its buttons
  never repeat the quiz's options — the quiz is the decision, the box is navigation.

#### Choosing the fate — the decision algorithm (335.a, Iris)

Copied verbatim from `docs/interventions/2026-10-29-Iris-ending-scenarios.md` → § 4. Where it differs
from the rules above, the rules win: commands are fenced as `bash`, and the mission card's cap is
≤ 9 rendered lines.

**Decision algorithm (≤ 10 s, run top to bottom, stop at the first « yes »)**

1. **Am I a sub-agent or a chantier sub-session?** → No card. Write a Done/State/Next report or update the fiche, then stop.
2. **Is the next step mine, reversible and in scope** (commit, land, relaunch, re-run)? → **Do it now; don't end.** If a gate, the classifier or a permission refuses, continue at step 4.
3. **Did I break or find something live** (prod error, data or secret at risk)? → Title starts with 🚨. Continue to pick the fate.
4. **Does progress need his hands outside this chat** (credential, console, merge, install, permission, payment)? → **🔑 Agis.**
   - Kit: exact URL + numbered steps, and **PowerShell** blocks, one per step.
   - Quiz: « Guide-moi (Chrome) » / « Terminal » / « C'est fait ».
   - Never his credentials.
5. **Is there a choice only he can make** (scope, data model, price, design verdict, irreversible)? → **💬 Réponds.**
   - Quiz of ≤ 4 options, recommendation first as « go = … ».
   - If the choice is visual, send the screenshots before the quiz.
   - Never put a question in prose.
6. **Did a user-visible screen or behaviour change, and can he reach it** (served URL or a running local server)? → **🧪 Teste.**
   - Captures sent with `SendUserFile`.
   - The URL plus a script of 3 minutes or less.
   - Quiz: accept / reopen / defer.
7. **Is something I launched still running, with nothing else for him?** → **⏳ Attends.** Say what is running (its id), what wakes me, and what he can do meanwhile.
8. **Is it LANDED, with nothing local and nothing pending?** → **🗄️ Archive** (offer it in the quiz; do it if he already said so).
9. **Otherwise** (another slice remains here, and it costs something) → **🔁 Continue ici** with the « go » button.
10. **Proof and lint.** Check these before sending:
    - The title carries the state word.
    - Each Fait line has **one** clickable proof: PR or commit URL for code; served URL or revision for a deploy; capture for UI; file link for a study; one output line for ops.
    - ≤ 8 lines.
    - No « dis-moi » and no trailing « ? ».
    - Commands are written for his shell.

#### The mission card — autonomous mission, ≤ 9 rendered lines

---

**{🚨 }{Projet} · {objet} · {ÉTAT}**
📸 {la preuve en un clic : lien · captures avant/après · test ≤ 3 min}

**Fait**
- {emoji} {ce qui a bougé, l'objet nommé} · {sa preuve cliquable}

**Suite**
- {🗄️ Archive | 💬 Réponds | 🧪 Teste | 🔑 Agis | ⏳ Attends | 🔁 Continue ici} : {l'objet}

---

**Four parts only** (335.a): title line, proof line, Fait, Suite — blank lines and rules not counted.
The journey ladder, the 💡 coach tip and the standing 🧠 / 🤝 bullets left the card; a **🤝 Décidé pour
toi** enters Fait only when a reversible call was really made. Then the fate's quiz, if it has one. No
`📊 Avancement` bar, no `⚖️` block (the quiz is the decision), no `▶ Prompt suivant` unless the next
step belongs in a **fresh** window — then the quiz's « go » option says so and the block follows.

**The small answer** — a question answered, a lookup, a one-line fix — is two lines, no headings:

{emoji} {ce qui est fait}
{fate emoji} **{Verbe}**

#### The control tower — chantier supervisor

---

### {🚨 }Tour de contrôle · {repo icon} {chantier} · {ÉTAT}

🌐 **[Ouvrir le site publié → {url}]({url})** *(only when the result is a published site — first, as a button)*

| Slice | État | Il te faut | Preuve |
|---|---|---|---|
| {code} {avatar} {objet} | 🔴/🟡/✅ | {what it needs from him, or « rien »} | {one-click link} |

📸 {visual report of what was done — screenshots or an artifact}
🤝 Décidé pour toi — {archives · par défaut, conteste si besoin · accepté par la recette — rouvrable}
💡 {coach tip}

**Fait**
- {emoji} {ce qui a bougé dans le chantier} · {sa preuve cliquable}

**Suite**
- {fate} : {l'objet}

---

Then **one** quiz that **escalates every decision pending in the sub-sessions** (≤ 4 questions, by
blocking cost — "The operator's input is an inbox" in `sprints-method.md`) and ends with **which path opens
next**, after a one-line reflection on the next step. The sub-sessions still render no card, and the
chantier still carries no `▶ Prompt suivant` ("Cadence", below): the answer becomes the supervisor's own
action (a chip or a `SendMessage`).

#### The 🗂️ portfolio page — specified, not built

One page, one row per project: its rung on the ladder, its last session, its pending decision, updated
at each closing. It answers « état des lieux… pour savoir où on en est » without a session. Next slice
(`ACTIONS.md` → IMP-021).

### The Debrief — closing card

**Since 330.a it closes a handoff, `/brief`, `/relay`, `/review` or a multi-decision answer**; an
autonomous mission closes with the mission card and a supervisor with the control tower (above). The
journey ladder replaces its `📊 Avancement` state words when a journey is named, and its `⚖️ Tu décides`
is asked as the « go » quiz.

The mental model is a chief of staff walking in for thirty seconds: *voilà ce qui vient d'être fait,
voilà où ça met le projet, voilà ce que tu dois garder en tête, voilà ce que tu dois trancher.* It is
a briefing, not a changelog — the diff already lists the edits.

Exact shape, `---` rules included (they draw the card's frame at full window width):

---

### {🚨 }Debrief · {lane ou workstream} · {ÉTAT}

{Une ligne : ce qui vient d'être fait, en langage opérateur.}

**📊 Avancement** — 🟩🟩🟩⬜⬜ {n/N journeys proven} · {state reached: CODED · LANDED · DEPLOYED ·
PROVEN, with its evidence}

**Fait**
- {emoji} {fait clé} · {sa preuve cliquable}
- 🤝 **Décidé pour toi** — {choix réversible pris sans demander} *(only if one was made)*

**⚖️ Tu décides**
- {la question, courte} → **reco :** {l'option recommandée} · sinon {l'alternative}

**🔎 Preuve à jouer** *(only when this card asks for a proof or an acceptance)*
1. {URL cliquable réelle — slug, locale, params}
2. {étape} → {tu vois …}
- Preuves : {liens : capture · révision · PR/sha · run} · Pas encore prouvé : {… ou « Rien »}

**Suite**
- {fate} : {la prochaine action utile}

**⚠️ Vigilance** — {un seul risque réel}

---

**Hard rules — these are what keep the card readable.**

- **One idea per bullet, one line at a normal window width.** Never a paragraph inside the card — a
  prose blob is exactly what stopped being read. Markdown wraps gracefully, so there is no character
  count to respect; but a bullet that needs three lines is two bullets, or belongs in the body above.
- **Six blocks maximum**, in the order above, and an empty block is **deleted**, never filled with
  "none". A full card renders in about twelve lines. The optional **🔎 Preuve à jouer** block replaces the
  prose of a proof ask and is not counted in the six.
- **The title carries the state word** (`CODÉ · ATTERRI · DÉPLOYÉ · PROUVÉ · en cours · bloqué`, 335.a),
  not a status emoji; 🚨 leads it on an incident. The section emojis (📊 ⚖️ 🔎 ⚠️) are **fixed** — they are
  landmarks the eye learns, not decoration, so they never vary from one card to the next.
- **`Avancement` positions the work in the global project, not in the turn.** The unit is **journeys
  proven** (see "The two-moment contract — Cadrage · Recette"), not tasks closed — a 5-block bar
  (🟩 filled / ⬜ empty) plus the ratio, plus the state reached (`CODED` · `LANDED` · `DEPLOYED` ·
  `PROVEN`) with its evidence. Only render a ratio when something countable was actually read this
  turn: journeys in `docs/project/journeys/`, sprint task files by status marker, `PORT-MAP.md` rows.
  Nothing countable → name the lane and its position in words. **Never invent a ratio.**
- **The recette table (asked → shown/not) precedes the Debrief whenever a Cadrage happened.** A test
  count never substitutes for the deliverable that was actually asked at Cadrage.
- **`Fait` (`À retenir` until 335.a) is the brief itself — 1 to 3 bullets, each with one clickable proof.** What the operator must hold in his head
  tomorrow: what now works, what changed shape, what got ruled out, what surprised us. Include one
  **🤝 `Décidé pour toi`** bullet whenever a reversible call was made without asking, so it can be
  objected to cheaply. No bullet that merely restates a file edit.
- **`Tu décides` — 0 to 2 items in the card; more → one line naming them, and the « go » quiz carries them (≤ 4)** — recommendation first, same grammar as a `### Needs decision`
  block, which stays the long form in the body when a decision needs its options laid out. Nothing to
  decide → one line: `**⚖️ Tu décides** — rien. J'ai tranché : X, Y.` A decision is never buried in
  the prose above the card, and it is **asked as a quiz** (`AskUserQuestion`, see "Questions are quizzes,
  never prose"), not left as a question for the operator to answer by typing.
- **`Suite` — 1 to 3 bullets, bullet 1 the fate** ("Shared by every closing"), the most useful next move,
  followed by the `▶ Prompt suivant` block: one fenced, self-contained prompt — goal, repo and key
  paths, constraints, acceptance — pasteable into a fresh window with zero extra context. Outside a
  chantier only (see "Cadence").
- **`Vigilance` only when the risk is real and sharp.**
- **Link what is clickable.** Paths as markdown links (`[method-core.md](docs/METHOD/method-core.md)`),
  commits, commands and error strings as inline code. That is half the reason the card is not fenced.
- **Every line earns its place.** A bullet survives only if it changes one of three things: a
  **decision** the operator might take, an **action** he might run, or a **mental model** he carries
  into tomorrow. A bullet that changes none of the three is **deleted**, not shortened — "we also
  touched X" is changelog, and the diff already says it.
- **Name the object, never the activity.** `docs/METHOD/method-core.md:393` not "the method file";
  `npm run doctor` not "the checker"; `afd4cd7` not "the last commit". Everything nameable is named,
  as a clickable link or a runnable command — that is what makes a card actionable rather than
  merely informative.
- **Everything in the card is grounded** in a command run or a file read this turn. Unknown stays
  `inconnu`; never a plausible guess. The card is the most-read surface of the whole METHOD — a wrong
  number there is worse than a missing one.

**Cadence.** The card must stay rare enough to keep meaning something:

| Answer | Close with |
|---|---|
| Substantial — code or docs changed, a slice closed, a decision taken, a handoff, `/brief`, `/land`, `/ship`, `/relay`, `/review` | The closing of its **session type** ("Closing by session type", above): mission card · control tower · full Debrief + `▶ Prompt suivant` (none in a chantier — below) |
| Small — a question answered, a lookup, a one-line fix | Two lines, no headings: `{emoji} {ce qui est fait}` / `{fate emoji} **{Verbe}**` (335.a) |
| Nothing done — refusal, clarification, pure conversation | No card at all |

**In a chantier there is no `▶ Prompt suivant` (322.e; operator rule, 2026-10-14).** Neither a
sub-session (it renders no card) nor the supervisor's control tower carries a copy-paste block. The next step
is an action the supervisor takes itself — a suggested-task chip carrying the brief, or a typed
`SendMessage` to an existing sub-session — and a `Suite` row of the pilot dashboard (the
control-tower table); its next-path quiz names that action. Outside a chantier the block stays.
`sprints-method.md` → "The chantier".

**Who renders it.** Only the agent speaking to the operator — the orchestrator, or a single agent
working directly with him. A **delegated sub-agent never emits a Debrief**: its report goes to its
orchestrator as a handoff (3-line header + task report, uncompressed per Output Compression), and
the orchestrator folds those reports into one card. Otherwise a `brian → watson → vera → sage` chain
lands four cards in one answer and the format dies of noise. **A chantier sub-session renders no
card either** — not at `/land`, `/relay` or `/review`: it updates its fiche instead, and the
supervisor's control tower is the chantier's only card (`sprints-method.md` → "The chantier").

**Progress, and how much of it.** Two rules that used to live only in the root `CLAUDE.md`, which no
longer carries them (325.c):

- **Show progress** on multi-step work as a checklist (⬜ 🔄 ✅) **refreshed in place** — not a fresh
  wall of text each turn.
- **Match depth to stakes.** Routine → the 3-line header suffices. Architectural or irreversible → add
  a short **Why / Trade-offs / Risks**. Default to less.

**Relation to the 3-line header.** `Done / State / Next` remains the opening header of **written
artifacts** — PR bodies, task reports, sub-agent reports. Its three values, in full (325.c — they used
to live only in the root `CLAUDE.md`, which no longer carries them): **Done** = what changed ·
**State** = `🟢` on track / `🟡` needs your input / `🔴` blocked · **Next** = the immediate step, or
`awaiting your call ↓` when the answer is the operator's. In chat with the operator the Debrief does
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

- **First slice:** `/intervention` (or `junia` for a plan); a sprint only by exception (`sprints-method.md`)
- **Task execution:** Load `routing-method.md` → check agent entry files
- **Review workflow:** Load `agents-method.md` → understand Core Loop vs On-Demand

---

**Owner:** Lucia  
**Last Updated:** 2026-10-15

