# Sprint Structure

**Owner:** Junia  
**Version:** 322.h  
**Purpose:** Sprint system, DoD by mode, rituals

> **When a sprint is justified — and when it isn't.** The sprint is the **exceptional** mode: open
> one only for work that is **planned ahead, multi-owner and needs a review gate** — all three. The
> **nominal** mode is a single targeted slice: an **intervention** (`/intervention`, logged in
> `docs/interventions/`) or a **plan** executed to the end, then the local merge gate, then the
> landing on `main` (LANDED — deploying is its own step, with its own evidence). A single fix, a single screen, a single analysis is never a sprint — wrapping
> one in sprint ceremony produces folders nobody closes. Everything below remains the reference for
> the sprint mode, and applies in full once a sprint is actually open. See `CLAUDE.md` →
> "Work Modes" for the nominal path. Several code-writing slices without that ceremony make a
> **chantier**, not a sprint: "Sessions & branches" → "The chantier".

---

## Philosophy (Revised)

**Lighter. Clearer. Context-aware.**

- Sprint folders by number: `docs/sprints/{sprintNumber}/` (e.g., `001/`, `002/`, `003/`)
- Task files: `{sprint}-{seq} {status} {Agent} - {title}.md`
- Status tags: `⬜` Todo, `✅` Done (ready for review), `⚠️` Problem, `☑️` Validated (Review Gate passed)
- Quality gates built into workflow (Pre-Flight, Review Gate, Kill Gate)
- Each task file includes ONLY the context needed for that task
- Agents append reports directly in task file (no separate report files)
- No time-based planning (weeks) — sprints are incrementally numbered

---

## Sprint Types

### 1. Production Loops (Default)

Work one CUJ step at a time (from `docs/journeys/`).

**Process:**
1. Junia reviews ROADMAP + active CUJ and drafts the Cadrage
2. Identifies next step
3. Creates task files
4. The coordinating conversation runs them (sequence or parallel)
5. The coordinator consolidates → updates project/ → lands → closes sprint

---

### 2. Interventions (Ad-hoc)

Expert or manager conducts focused mission.

**Process:**
1. Create: `docs/interventions/YYYY-MM-DD-{Agent}-{topic}.md`
2. Execute mission
3. Managers sync: update VISION/ROADMAP/DESIGN/AI-INFRA as needed
4. Link back to sprint or roadmap items
5. The file carries `**Journey:**` + `**Proof:**` from its Cadrage — `/land` refuses a new one without them (318.a)

---

## Sprint Folder Structure

### Folder: `docs/sprints/{sprintNumber}/`

Sprints are organized by their 3-digit sprint number (e.g., `001`, `002`, `010`). Each sprint gets its own folder.

**Files:**
- `{sprint} 📋 {objective}.md` (optional, for complex sprints)
- `{sprint}-{seq} {status} {Agent} - {title}.md` (task files)

**Example:**
```
docs/sprints/010/
  010 📋 user settings sprint.md
  010-a ✅ Brian - implement settings UI.md
  010-b ✅ Brian - wire settings to Firestore.md
  010-c ⚠️ Watson - test settings performance.md
```

---

## Task File Structure

### Filename: `{sprint}-{seq} {status} {Agent} - {title}.md`

**Components:**
- `{sprint}`: 001–999 (3 digits)
- `{seq}`: a, b, c (execution order)
- `{status}`: `⬜` (todo), `✅` (executor done; ready for review), `⚠️` (problem), `☑️` (validated by Review Gate)
- `{Agent}`: Executor (Brian, Aiko, Watson, Gordon, etc.)
- `{title}`: Concise task description

**See:** `docs/METHOD/templates/TASK-TEMPLATE.md` for full template

---

### Canonical Task Example

**Filename:** `015-b ⬜ Brian - setup Firebase Cloud Messaging.md`

```markdown
# 015-b ⬜ Brian - setup Firebase Cloud Messaging

**Sprint:** 015  
**Agent:** Brian  
**Tier:** T2  
**Prerequisites:** none  
**Status:** [ ]  
**Created:** 2025-11-20

---

## Context

### What
Setup Firebase Cloud Messaging (FCM) for push notifications.

### Why
**ROADMAP:** Notifications milestone  
**CUJ:** User receives volunteer opportunity alert (step 4)  
**Success state:** User can receive push notifications on web

### Where
- Firebase Console (FCM configuration)
- `src/lib/firebase-messaging.ts` (new file)
- `public/firebase-messaging-sw.js` (service worker)
- `docs/project/AI-INFRA.md` (update with FCM config)

---

## Acceptance Criteria

- [ ] FCM configured in Firebase Console
- [ ] Service worker registered for web push
- [ ] Token generation working (`getToken()` succeeds)
- [ ] Test notification sent successfully
- [ ] Tokens stored in Firestore (`users/{uid}/fcmTokens`) and associated with current `teamId` for tenant-aware targeting

---

## DoD

- [ ] Feature works (test notification received)
- [ ] Unit test added (`firebase-messaging.test.ts`)
- [ ] Integration test with emulator
- [ ] EN/FR i18n strings (`notification.permission.request`, etc.)
- [ ] Typecheck passes
- [ ] Local Merge Gate passes (lint, typecheck, tests, build — `method-core.md` → "Merge Gate"; there is no CI)
- [ ] Report appended to this file
- [ ] Review Gate passed (Vera)
- [ ] Status updated to ✅ or ⚠️

---

## Entry Files (for Agent)

**Load before starting:**
- `docs/METHOD/ai-infra-method.md` (FCM is AI-adjacent)
- `docs/project/AI-INFRA.md` (app AI config)
- This task file

**Optional context:**
- `docs/journeys/volunteer-matching-cuj.md` (step 4)
- Firebase docs: https://firebase.google.com/docs/cloud-messaging/js/client

---

## Resources

- **Firebase Console:** https://console.firebase.google.com/project/PROJECT_ID/settings/cloudmessaging
- **MDN Service Workers:** https://developer.mozilla.org/en-US/docs/Web/API/Service_Worker_API
- **ROADMAP link:** `docs/project/ROADMAP.web.md` → Notifications section

---

## Report

### Riley Report — 2025-11-20

**Completed:** Yes  
**Duration:** ~45 minutes

#### What I Did
1. Configured FCM in Firebase Console (enabled Cloud Messaging API)
2. Generated VAPID key pair for web push
3. Created `src/lib/firebase-messaging.ts`:
   - `initializeMessaging()` — Initialize FCM
   - `requestPermission()` — Request notification permission
   - `getToken()` — Get FCM token
   - `onMessageListener()` — Handle foreground messages
4. Created service worker `public/firebase-messaging-sw.js`
5. Registered service worker in `src/app/layout.tsx`
6. Stored tokens in Firestore `users/{uid}/fcmTokens` collection (and recorded current `teamId` for tenant-aware targeting)
7. Tested with Firebase Console "Send test message"

#### Tests Added
- `src/lib/__tests__/firebase-messaging.test.ts` (unit, mocked Firebase)
- Manual test: sent notification from console → received on web

#### i18n Strings
- `locales/en/common.json`:
  - `notification.permission.request`: "Enable notifications?"
  - `notification.permission.granted`: "Notifications enabled"
  - `notification.permission.denied`: "Notifications blocked"
- `locales/fr/common.json`:
  - `notification.permission.request`: "Activer les notifications?"
  - `notification.permission.granted`: "Notifications activées"
  - `notification.permission.denied`: "Notifications bloquées"

#### Issues/Alerts
None. FCM setup complete.

#### Next Steps
- Task 015-c: Wire notification UI to FCM (Brian)
- Future: Add topic subscriptions for targeted notifications

---

**Status updated to:** ✅
```

---

## Definition of Done

**Standard DoD for all tasks — the 9 items in `method-core.md` → "Definition of Done".** Not restated here; that file is the only copy.

**Additional quality measures** (add as needed based on task):
- E2E tests for critical user journeys
- Integration tests for Firebase/API interactions
- Component tests for reusable UI
- Architectural tests for boundary enforcement
- Visual validation for design precision
- Full a11y audit (WCAG AA) for public features

---

## Review Gate (Vera — High-Model Analyzer)

**Goal:** One deliberate “high model” pass to catch cross-cutting misses: **security**, **vision/scope**, **design/a11y**, **tests/i18n**, and **docs consistency**.

### Slice Review (once per slice — 318.a)

- **Trigger:** the slice's tasks are `✅` (executor done) and the slice is about to land — Vera runs
  **once per slice, at the Recette**, not after every task
- **Reviewer:** **Vera** — **T1 floor, always**: strongest reasoning model available (Fable/Opus on Claude; GPT-5.x-class elsewhere). The Review Gate never runs below T1 (`routing-method.md` → "Model Routing")
- **Output:** a short review (use `docs/METHOD/templates/REVIEW-TEMPLATE.md`) persisted by the coordinator, and every task in the slice updated:
  - `☑️` = approved / validated
  - `⚠️` = rejected (must-fix items + follow-up tasks required)
- **Fast-Track:** a slice that meets every Fast-Track condition (`agents-method.md` → Vera) lands without a review

### Sprint Review

- **Trigger:** the sprint's closing slice — its Slice Review is the sprint review
- **Artifact:** `{sprint}-z ☑️ Vera - sprint review.md` in the sprint folder
- **Rule:** Sprint should not close until Review Gate is either **passed** or explicitly **deferred with follow-up tasks**.

---

## Rituals

### Junia (Sprint Planning)

**When:** the operator asks for a sprint, or a request is genuinely multi-task and planned ahead

**Steps:**
0. **🎯 Cadrage** — Junia drafts it (Journey · Proof · out-of-scope, recommended answer first); the
   coordinating conversation asks the operator and hands the answers back. No planning before the
   answers are written into the sprint folder. (The CUJ Precision Gate and April's CUJ Definition
   Session were retired in 317.a / 316.a; the slim `CUJ-TEMPLATE.md` + `Journey:`/`Proof:` replace them.)

1. **Check next sprint number:**
   - Review `docs/sprints/` folders
   - Use next sequential number (e.g., if `009/` exists, use `010/`)

2. **Run Managers Sync** (see below)

3. **METHOD current?** `npm run doctor` in the hub; a pending release or sync goes to Lucia — never
   sync from a planning step.

4. **Review active CUJ step** (`docs/journeys/`)

5. **Draft sprint plan** (3-7 bullets) → **95% Gate** (see below)

6. **Create task files:**
   - Use `docs/METHOD/templates/TASK-TEMPLATE.md`
   - Or helper script (cross-platform): `node scripts/create-sprint.mjs 015 "notifications"`

7. **Include agent instructions** in each task file (entry files to load)

8. **Hand the plan back** to the coordinating conversation, which runs it (see *Sessions & branches* under Sprint Numbering)

---

### Managers Sync (Before Planning)

**Purpose:** Ensure all manager files are up-to-date before Junia plans sprint.

**Checklist:**

- [ ] **Junia:** `project/STRUCTURE.md` current? Routes/features/status accurate? `VISION.md` personas/JTBD still true (the operator decides)?
- [ ] **Nova:** `project/DESIGN.md` current? New tokens/components documented?
- [ ] **Brian:** `project/AI-INFRA.md` current, if the sprint touches AI wiring?
- [ ] **Kasper:** any security surface (rules, auth, API routes) in scope?
- [ ] **Lucia:** METHOD current? (`npm run doctor` green in the hub; app on the latest release)

**If any outdated:** Create intervention to update, THEN plan sprint.

**Why:** Avoid planning with stale context (leads to rework).

---

### 95% Certainty Gate (Managers Only)

**Applies to:** Junia, Nova, Lucia

**Rule:** If uncertainty about vision/requirements/scope > 5%, STOP and resolve before planning.

**Process:**
1. Batch concise questions (2-5)
2. Return the questions to the coordinator, who asks the operator (vision, scope) or delegates the
   lane owner (design → Nova, security → Kasper, a study → Iris)
3. Update docs FIRST (VISION, ROADMAP, DESIGN, AI-INFRA)
4. THEN plan sprint

**Why:** Docs as truth; avoid incorrect assumptions; reduce rework.

---

### CUJ Exit Gates

**Purpose:** Ensure CUJ step is truly complete before moving to next step.

**When:** After sprint completes a CUJ step

**Gates:**

1. **Functional:** All acceptance criteria met
2. **Tested:** DoD met (unit tests + smoke test)
3. **Documented:** CUJ step marked complete in `journeys/{cuj}.md`
4. **User-validated:** Real user tested the flow (recommended before `☑️`)
5. **Performance:** Metrics meet targets if defined in the Precision Gate

**Example:** CUJ step 4 (notifications)
- [x] User can enable notifications
- [x] User receives test notification
- [x] Unit + integration tests pass
- [x] EN/FR i18n complete

**Decision:** Exit gate met; proceed to step 5.

---

### Agents (Execution)

**When:** Receive task assignment

**Steps:**
1. **Load entry files** (from routing matrix in `METHOD.md`)
2. **Load sprint task file**
3. **Verify prerequisites** (previous `-seq` task completed?)
4. **Execute task** → follow DoD
5. **Append report** to task file (see canonical example above)
6. **Update status tag:** `⬜` → `✅` (ready for review) or `⚠️` (problem)
7. **Report** to the coordinating conversation (Done / State / Next)
8. **Review Gate:** Vera reviews the whole slice once, at the Recette → `☑️` or `⚠️`

---

### Consolidation (the coordinating conversation)

**When:** All sprint tasks are `✅` (ready for review) or `⚠️` (problem). Since 318.a the
coordinator consolidates and lands; Junia plans, she no longer closes sprints.

**Steps:**
1. **Read all task reports** in sprint folder
2. **Run Review Gate (Vera):**
   - Ensure tasks end `☑️` (validated) or `⚠️` (explicitly carried with follow-up tasks)
   - Create `{sprint}-z ☑️ Vera - sprint review.md`
3. **Kill Gate** (before closing sprint):
   - [ ] All tasks `☑️` or explicitly deferred with follow-up
   - [ ] No unaddressed `⚠️` problems
   - [ ] Tech debt logged if deferred
   - [ ] Smoke test passes
4. **Update project/ files:**
   - `STATE.md` (current state, blockers, recent decisions)
   - `ROADMAP.*.md` (mark items done)
   - `DESIGN.md` (if UI changed, update tokens/components)
   - `AI-INFRA.md` (if AI infra changed, update configs)
5. **Check CUJ Exit Gates** (if completing CUJ step)
6. **Run smoke test:**
   ```bash
   npm run dev
   # Test critical path manually
   ```
7. **Visual Snapshot (Claude Code + Playwright):**
   - Run a short Playwright script (or MCP browser tool) to navigate the critical path(s) touched in this sprint
   - Capture a screenshot for each major screen/flow modified
   - Save screenshots to `docs/sprints/{sprint}/screenshots/`
   - Name: `{sprint}-{feature}-{state}.png` (e.g., `015-notifications-enabled.png`)
   - Append thumbnail paths to the sprint review file as visual proof
   - **Purpose:** Visual validation that the UI renders correctly; serves as regression baseline
8. **Commit and land sprint artifacts** — LANDED, nothing more:
   ```bash
   git add docs/sprints/ docs/project/
   git commit -m "chore(sprint): complete 015 - notifications"
   npm run land
   ```
9. **Deploy (if the sprint touches production)** — Firebase Deployment Readiness checklist
   (`method-core.md`), staging → verify → production, with the **served revision** recorded
   (DEPLOYED). Then `sage` runs the journey's Proof there (PROVEN) and the operator accepts.
10. **Close sprint** → plan next sprint

---

## Sequencing Rules

- **Verify previous `-seq` task is `☑️`** before starting next
- Use **same `-seq` letter** only for truly parallel tasks (no dependencies)
- If **blocked**, mark `⚠️` and note blocker in report

**Example:**
- `015-a` and `015-b` can run in parallel (both `-a` and `-b`, no dependency)
- `015-c` depends on `015-b` → wait until `015-b ☑️`

---

## Sprint Numbering

**Sequential sprint numbers:**
- Each new sprint gets the next available 3-digit number (001, 002, 003...)
- Create new folder: `docs/sprints/{sprintNumber}/`
- Archive old sprints as needed (optional)

### Sessions & branches

> **Canonical home of the session-splitting rule** (formerly "Conversation Naming"). Anything
> elsewhere in the METHOD that tells you how many windows to open — `agents-engineering-method.md`
> §5 and §9, `method-core.md`, `method-core-lite.md` — points here and does not restate the rule.
>
> **318.a dropped the conversation-title convention** (`{NNN} {topic}` / `INT {date} {topic}`): in
> 120 days, **0 of 301** titled conversations followed it. Traceability lives where it already
> works — the branch, the intervention or task file, and the commits. Name a conversation however
> you like.

#### One slice = one conversation = one branch = one worktree

This is the settled arbitration (sprint mode: one sprint = one conversation, same reasoning). It is
**not a style preference** — it is dictated by what `.claude/settings.json` actually wires.

These hooks run at a session's edges (hub `.claude/settings.json` = addon `settings.snippet.json`, 322.a):

| Event | Hook | What it does |
|---|---|---|
| `Stop` | `.claude/hooks/ship-push.sh` | `exit 0` on `main`/`master`/`HEAD` and on a branch with nothing of its own ahead of the trunk; otherwise pushes the current branch (`git push`, or `git push -u origin "$branch"` when no upstream). Never commits, never force-pushes. A **rejected push is reported** (stderr + systemMessage + `<gitdir>/ship-push.last-error`, cleared by the next good push). Since 322.f it never pushes a checkout of the trunk, whatever its name, and the branch push runs with `SKIP_QUALITY_GATES=1` (the husky pre-push chain cannot finish inside the hook's 30 s; the land gate is the brake for `main`). |
| `Stop` | `.claude/hooks/wip-sync.mjs` | Dirty tree on a feature branch: snapshots the uncommitted delta (untracked included) through a temporary index and pushes it to `refs/wip/<branch>` (forced on that private ref only); index, tree and branch are never touched. **Best-effort guards, fail closed (a denylist is not a guarantee):** only when HEAD is already on an `origin` branch and `origin` is positively private (`gh repo view <origin url>`; a PRIVATE answer is cached 1 h, nothing else); never unless origin has exactly one fetch URL and one equal push URL; `git config wip-sync.enabled false` (any git boolean: no/off/0/false) is the kill switch. Paths are filtered **before** `git add` (never hashed): secret-shaped names, build/dependency/auth dirs, files over 5 MB, and files whose **content** looks like a credential; the result is re-verified after `write-tree`. Skips and their reasons (names only): `<gitdir>/wip-sync.last-skipped`. Clean tree: deletes the WIP ref. A failure is reported (`<gitdir>/wip-sync.last-error`). Independent of the other Stop hooks (they run in parallel): safe in either order. |
| `Stop` | `.claude/hooks/session-telemetry.mjs` | Appends one row to the local, gitignored ledger `docs/project/telemetry/sessions.jsonl`; commits and pushes nothing (318.a). |
| `Stop` | `.claude/hooks/land.mjs --auto --lane docs` | Fast-forwards the trunk with the branch's **committed** docs/tooling work when the gate allows; never commits; quiet, always exits 0. After a landing it deletes `origin/<branch>` + `refs/wip/<branch>`, advances the local trunk when it is checked out nowhere, and records the branch in `<git-common-dir>/landed-branches`. Held back by an exception: pushes the branch and opens/updates a **draft PR** (reason + `### Needs decision`). Since 322.f it takes the repository's gate lock (`gate-lock.mjs`, below) before it merges the trunk. |
| `Stop` | `.claude/hooks/pilotage-refresh.mjs` | Regenerates `docs/pilotage/index.html` when the turn edited `docs/sprints/**` or `docs/pilotage/chantiers.mjs`; never commits; fails open. |
| `Stop` | `.claude/hooks/chantier-status.mjs` | No-op unless a fiche in `docs/chantiers/*/*.json` names the current branch; then **blocks the stop** while that fiche is invalid or stale ("The chantier", below). |
| `SessionEnd` | `.claude/hooks/land.mjs --auto` | Attempts a full land of the conversation on the trunk. |
| `SessionStart` (`resume`) | `.claude/hooks/flight-deck.mjs --mode resume-hook` | Injects the Flight Deck pickup context, now with the branch-lifecycle report (active work, alarms, residues); read-only. |
| `SessionStart` (`startup`) | `.claude/hooks/flight-deck.mjs --mode startup-hook` | Injects only the branch-lifecycle report (silent when empty); read-only. |
| `SessionStart` (`startup`) | `.claude/hooks/branch-sweep.mjs --apply --landed-only --auto` | Deletes the worktree + local branch (and `origin/<branch>`, WIP ref) of branches **`land.mjs` landed** (its ledger `<git-common-dir>/landed-branches`) once they are `merged`/`gone`, clean, not the cwd nor the main checkout, carry no commit that is on neither the trunk nor a remote ref, and show **no activity for 2 h** (newest of: the branch's last reflog entry, the mtime of the worktree's `HEAD`/`index`/`logs/HEAD` admin files, the tip commit date). A separate script that can never merge a PR. Anything older is never auto-deleted: a manual, validated `branch-sweep.mjs --apply` (`npm run branch:sweep:apply`). |
| *(library)* | `.claude/hooks/gate-lock.mjs` | Not an event hook: imported by `land.mjs` and `verify-gate.mjs` (322.f, from bananaevents `3e73289d`). **One landing / heavy gate at a time per repository:** the lock `<main checkout>/.method/gate.lock` (`.method/` is gitignored) is shared by every worktree, so parallel sessions stop starving the machine (vitest timeouts = false reds). Liveness is a heartbeat (a worker thread touching the lock's mtime; pids are display only); a stale lock heals itself (takeover under a mutex); the owner's child re-enters with `METHOD_GATE_LOCK_TOKEN`. `land.mjs` takes it **before** merging the trunk and gives it back right after the trunk push; `--lock-wait <min>` (default 180) is the manual queue, a hook (`--auto`) never queues and refuses a heavy gate. A scheduling aid, never a check: a missing or broken lock means "runs unserialized, as before". |
| *(called by `land.mjs`)* | `.claude/hooks/verify-gate.mjs` | The lane gate (lint · typecheck · tests · build, per lane). 322.f: `--plan` (the weight of the diff) and the heavy phase under the lock; a repo-root `firestore.rules` / `storage.rules` is **tooling lane** (deploy config, anchored at the root — a nested rules file keeps its app's gate) but still held by `land.mjs`'s `schema` exception; an npm-workspaces member verifies through its parent root, the lane stays the file's own and a script-less root is `blocked`; `.snap` is code. |

(`PostToolUse` also runs `no-mock-guard.ps1` on every Write/Edit; it writes nothing to git. Since 322.f it exempts the app-root `proto/` — never a `proto` folder under `src/`, `components/`, `app/`, `pages/`, `lib/` or `features/`.)

Three of them write to git from every session: `ship-push.sh` pushes the branch, `wip-sync.mjs` pushes
the WIP ref and `land.mjs` moves the trunk. Before 322.d `ship-push.sh` **swallowed a rejected push**
(it redirected the push to `>/dev/null 2>&1`); it now reports it. Two consequences follow directly, and they are the whole reason for the rule:

1. **Two sessions on the same branch ⇒ silent divergence.** The second session's push is rejected
   non-fast-forward and the rejection is discarded. The work exists locally; every downstream reader
   — `/brief`, GitHub, the operator — sees that branch as stalled. Nothing surfaces the error. This is
   the expensive failure mode: not a lost commit, a *lie about progress*.
2. **Two sessions in the same worktree ⇒ a shared index.** `git add` in `/ship` stages whatever the
   other session is mid-edit. One session's commit ships the other's half-finished file.

The hooks are not defensive against concurrency, and should not become so — the cheap fix is one
branch and one worktree per session. *(If you are reading this in an app mirror and the hooks above
are not what `.claude/settings.json` wires there, trust the file, not this table, and report the
drift.)*

#### Invariants du cycle de vie des branches

> Mechanism: `.claude/hooks/lib/branch-hygiene.mjs` (classifier: `merged` · `gone` · `orphan` · `held` ·
> `active`) behind `wip-sync.mjs`, `ship-push.sh`, `land.mjs`, `branch-sweep.mjs` and the SessionStart report. No rule below
> exists without a hook that enforces or reports it.

1. **GitHub mirrors all active work** — committed (the branch, `ship-push.sh`), uncommitted (`refs/wip/<branch>`, `wip-sync.mjs`), retained (a draft PR, `land.mjs`). A push that fails is reported, never swallowed.
2. **A branch has three exits only:** landed-and-deleted (local, `origin`, WIP ref), a draft PR (held by the exception list, reason + `### Needs decision`), or abandoned-and-deleted.
3. **No mute branch locally:** commits on no remote (`orphan`) are an alarm in the SessionStart report, never a silent state.
4. **Deletion is guarded, never forced:** only `merged`/`gone` branches, clean tree, not the cwd, not the main checkout, no commit that exists on neither the trunk nor a remote ref (merge commits included; an uncomputable answer means *keep*), and — when a worktree exists — no activity for 2 h (reflog, worktree `HEAD`/`index` mtime, tip date: not just the tip date). Deletion lives in `branch-sweep.mjs`, never behind `land.mjs --sweep --apply` (which merges PRs). It is automatic only for branches `land.mjs` landed itself; everything older goes through a manual `branch:sweep:apply` after the list is validated. No cap on active branches and no forced abandonment: the report tells the truth, the operator decides.

#### The lanes (branches, not titles)

Do not put a literal emoji in a branch name: a `.ps1` without a BOM is read as the ANSI codepage by
PowerShell 5.1, so a literal emoji silently breaks every `match` (precedent: `versioning.md`, v313.a
`flight-deck.ps1`). Emoji belong in **file** status markers.

| Lane | Branch | Lifespan |
|---|---|---|
| **Slice** (default — intervention or plan) | `{type}/{scope}` (cloud sessions: `claude/{concern}`) | one slice |
| **Sprint** (exception) | `sprint/{NNN}-{slug}` | one sprint |
| **Split** (exception inside a sprint) | `sprint/{NNN}-{seq}` + its own worktree | one card |
| **Supervision** (chantier — ≥ 2 code-writing slices) | none of its own: each sub-session holds a **Slice** branch + its own worktree | one chantier |

#### Choosing the lane — splits inside a slice are a runtime rule, never a planning-time one

One exception, decided at the start: a workstream of ≥ 2 code-writing slices is a **chantier** (below)
— the slices are a known fact, not a prediction. Every split **inside** a slice is made **while
executing**, on an observed fact — never predicted while planning.
At planning time the planner holds the least information it will ever hold about the card: it has not
seen the code, the test output, or how many fix loops the card will actually cost. A session split
decided in advance is a guess, and a wrong guess is expensive in both directions (a needless window
loses the slice's context; a missing one produces the silent-divergence failure above).

```
CHANTIER si : le workstream compte ≥ 2 slices qui écrivent du code
              → une session de supervision + une sous-session par slice (voir ci-dessous).
DANS UNE SLICE —
DÉFAUT : sous-agent, dans la conversation.
WORKFLOW si : ≥ 3 items quasi-identiques + une passe de vérification
              (chaque worker reçoit un `model` explicite — sonnet par défaut).
NOUVELLE SESSION seulement si l'un de ces faits est DÉJÀ survenu :
  1. la 3e boucle build → test → fix a commencé sur la même carte, ou
  2. la carte vit dans un autre repo, ou
  3. elle demande sa propre boucle déploiement + vérification avec l'opérateur dedans, ou
  4. deux cartes qui écrivent du code doivent tourner en même temps
     (→ chacune sa branche et son worktree).
Rien d'autre. Ni la taille, ni l'estimation, ni « ça a l'air gros ».
```

**No `Session:` field is added to the task template — deliberately.** Its neighbour `Tier:` has been
mandatory since v311.a and is present in `TASK-TEMPLATE.md`, yet a grep over `Apps/*/docs/sprints/`
found it filled in **0 of 85** task files. A second unfilled field next to an unfilled field is not
automation; it is more surface to sync. The trigger list above is checked by whoever is executing, at
the moment the trigger fires, and needs no field to live in.

#### The chantier — one supervision session, one sub-session per slice (321.a · v2 322.a · proof fixes 322.e · operator inbox 322.g · sidebar contract 322.h)

A workstream that already holds **≥ 2 code-writing slices** is a *chantier*, and it is the nominal
multi-slice shape. Unlike the four triggers, this one is a known fact at the start (the slices are
named), so it is decided at the start. **v2 (322.a): data, not reports; events, not polling** — each
sub-session keeps one typed status record, and the supervisor is woken when a sub-session stops.
Interventions: `docs/interventions/2026-10-11-Lucia-supervision-sessions.md` (321.a) ·
`docs/interventions/2026-10-14-Lucia-supervision-v2.md` (v2). **322.e** folds in the first live run
(bananaevents · W42 cash): the fiche is found by branch, a sub-session is addressed by its `ListAgents`
name, announces itself first and announces a land in flight, and a chantier has no `▶ Prompt suivant`.
**322.g** (`docs/interventions/2026-10-15-Lucia-operator-inbox.md`) makes the operator's input an inbox, not a form:
a read-only dashboard, batches of four, reversible decisions that default after 2 h, and an operator who reviews only
what clients see or what touches money ("The operator's input is an inbox" below).
**322.h** (`docs/interventions/2026-10-16-Lucia-sidebar-contract.md`) files the sidebar by contract: only supervisors are
pinned, one alpha-sorted group per chantier, slice-code-first titles, a `🎯 Missions libres` section, one icon per repo and
a janitor ("Sidebar contract" below).

- **The supervisor writes no code.** It is the coordinating conversation one level up: it frames each
  slice, arbitrates, calls each slice's Recette — asking the sub-session for `/review`, then `/land`,
  by `SendMessage`; the sub-session runs them — and closes the chantier with **one** folded Debrief.
  Opus.
- **One sub-session = one slice = one branch = one worktree** — the rule above, not bypassed. Sonnet
  by default (opus only for a judgement slice). Inside it, sub-agents stay the default and the four
  observed triggers still govern any further split.
- **Unchanged per sub-session:** review→fix 2 rounds max, Vera once per slice, `Journey:` + `Proof:`
  in its task or intervention file.

**The partition map — `docs/chantiers/{chantier}/README.md`.** Written by the supervisor when it
opens the chantier, before any sub-session starts: one row per slice — slice · agent · object ·
branch · `touches` (the globs that slice may write) · `plan-first` (`yes` by default for UI and
strategy slices, `no` for mechanical ones) — plus the decisions every slice shares. Two slices never
share a `touches` glob: partitioned writers are what lets sub-sessions run at once.

**The fiche — `docs/chantiers/{chantier}/{slice}.json`, the only report.** One per sub-session,
committed on the slice branch, so it lands with the slice and `main` keeps the chantier's history.
**Single writer: the sub-session** — the supervisor reads it and never edits it. Schema
`chantier-status/1`, 15 top-level fields, canonical in `docs/METHOD/templates/chantier-status.schema.json`:
identity (`v` · `chantier` · `slice` · `agent` · `title` · `branch` · `journey`), status (`state` =
`planning` · `working` · `waiting` (needs the operator) · `blocked` (cannot proceed) · `landed` ·
`parked`; `updatedAt`; `head`; `gate`) and the operator's inbox (`progress` done / doing / to do ·
`decisions[]` · `operatorActions[]` · `review[]`). **`agent` is a lowercase slug**
(`^[a-z][a-z0-9-]{1,23}$`, 322.b): a cohort id (`junia` … `oscar`) **or a domain owner** (`riley`,
`sacha`, `elena`…) declared in the app's business pack, `docs/project/business/README.md` — domain
owners are app-level (`agents-method.md` → "Domain owners & the business pack"), so the schema cannot
enumerate them. **References, not summaries:** `evidence[]` holds a
sha, a `file:line`, a URL or a screenshot path — never pasted prose. `updatedAt` is stamped from the
real clock — `node -e "console.log(new Date().toISOString())"` — never guessed; the hook rejects a
future time. On `landed`, `head` is the landed sha: the sub-session sets it after `/land` and commits
the fiche, and the docs lane lands that commit.

**The operator's input is an inbox, not a form (322.g; the operator's rulings, 2026-10-15).** The dashboard is good as an
overview and bad as an input system: clearing every decision and review in one sitting takes long focus, so sub-sessions
waited and development stalled. Four rules.

1. **The dashboard is read-only.** The pilot dashboard and the Cockpit "Chantiers" view show the state — done / doing / to do,
   blockers, results — and take no input: no form, no answer field. Answers go through the supervisor chat only.
2. **Small batches in the supervisor chat.** The supervisor asks with `AskUserQuestion`: at most **4 closed questions per
   batch**, recommendation first (`method-core.md` → "Questions are quizzes"), ordered by **blocking cost** — conflict-gate
   decisions first, then by (number of slices blocked × closeness of the earliest deadline). Never a long form, never every
   open item at once. `PushNotification` (it reaches the phone through Remote Control) **only when a slice is actually
   blocked**, worded `1 question bloque {slice} — {n} s` (`n` = the seconds the batch takes to answer).
3. **Agents do not wait on reversible decisions.** A `decisions[]` item carries `reversible` (boolean, required) and
   `deadline` (ISO-8601 with timezone, required when `reversible` is true = the time the decision was raised + **2 h**,
   stamped from the real clock; absent or null otherwise); `status` gains `defaulted`. A reversible decision never stops a
   slice: the sub-session keeps working on everything else (state stays `working`), and at the deadline with no answer the
   **reco** is applied — `status: defaulted`, `answer` = the reco — and the slice moves on. Only a **non-reversible** decision
   (the conflict gate: data model, permissions or money, anything irreversible, external production writes) puts the slice in
   `waiting` and truly blocks; in doubt, it is non-reversible. An idle sub-session cannot wake itself, so **the supervisor
   keeps a timer on the earliest open deadline** (a one-shot `CronCreate`, or a check on every wake while a reversible
   decision is open) and, on expiry, routes `DECISION dX = default ({reco})` by `SendMessage`; the sub-session records
   `defaulted`. Every defaulted decision is listed in the supervisor's Debrief under `🤝 Décidé pour toi — par défaut,
   conteste si besoin`; contesting one reopens it (`open`, a fresh `deadline`) and the answer is routed like any other.
4. **The operator evaluates only what deserves it.** A `review[]` item carries `needsOperator` (boolean, required): `true`
   only for a result **clients see** or that **touches money**. Those reach the operator in **one batch per slice, at its
   Recette** — accept / reopen / defer, the 4-question cap still applying. Every other result is accepted by Vera's review +
   Sage's proof (`accepted`) and listed in the Debrief as "accepté par la recette — rouvrable" (`REVIEW rX = reopen`
   reopens it), never asked. A `plan` item follows the same test: `false` → the supervisor accepts it and building starts;
   `true` → the slice waits for the operator's batch.

`chantier-status/1` keeps its id (no `v: 2`): a fiche written before 322.g adds `decisions[].reversible` (and `deadline` when
true) and `review[].needsOperator` on its next write — the Stop hook blocks the stop with a message naming the missing fields.

**The sub-session contract.**

- **The fiche, the task or intervention file and the commits are the whole hand-back.** No Debrief,
  no `▶ Prompt suivant`, no `Done / State / Next` message, no `STATE.md` edit, no `/relay` — `/land`, `/relay` and `/review`
  say so in their own text. Spoken to directly by the operator, it answers him in
  plain text, still without a Debrief.
- **Adopt first (322.e).** The first action of a sub-session — before any read or edit — is one
  `SendMessage` to the supervisor, addressed by the supervisor's `ListAgents` name (its brief carries it):
  `adopt {slice}`. The brief also forbids `EnterWorktree` when the app already created a worktree for the
  session: a second worktree hides the fiche from the supervisor.
- **A question for the operator goes into `decisions[]`** (with `options[]`, `reco`, `ifNoAnswer`, `reversible`, and a
  `deadline` = now + 2 h when reversible) — never only into chat. **Reversible: keep working** on everything else (state
  `working`); the reco applies at the deadline. **Non-reversible** (the conflict gate): state `waiting`. A blocker only he can
  lift goes into `operatorActions[]` (state `waiting`). A result goes into `review[]` with its evidence, a ≤ 3-minute script,
  1–3 closed questions (recommendation first) and `needsOperator`; when that is `false` the sub-session sets the item
  `accepted` once Vera and Sage have passed it, and does not wait on it.
- **Plan first** when the map says `plan-first: yes`: the first turn writes one `review` item of kind
  `plan` (≤ 6 lines) and stops in `waiting`; building starts once it is accepted.
- **A routed answer is applied, then recorded** in the fiche (`consumed`, the review's verdict, or
  `done`) — it arrives as one typed message: `DECISION d2 = B — note` · `REVIEW r1 = reopen —
  feedback` · `ACTION a1 = done` · `DECISION d2 = default (A)` (the deadline passed: record `defaulted`, `answer` = the reco).
- **Review and land are the sub-session's to run.** The supervisor asks for them by `SendMessage` —
  `/review`, then `/land` — and the sub-session runs them: Vera's verdict goes into `review[]` (a
  `result` item, with its evidence), the verify-gate outcome into `gate`; after `/land` it sets `state`
  `landed` and `head` = the landed sha and commits the fiche (`/review` and `/land` say so too).
- **A land in flight is announced (322.e).** Before running `/land`, the sub-session writes `/land` into
  `progress.doing` and refreshes the fiche (`updatedAt` from the real clock), so the supervisor sees a land
  in progress from the fiche, without a transcript; after the land it moves that item to `progress.done`.
- **The `Stop` hook holds it to this** (`chantier-status.mjs`): the stop is blocked, with a one-line
  reason, while the fiche is invalid against the schema or stale — a commit touching anything outside
  `docs/chantiers/` is newer than `updatedAt` (+120 s) — or `updatedAt` is in the future. When a Stop hook is already active it warns
  and lets the stop through.

**Finding the fiche, addressing the session (322.e).** Both come from the first live run (bananaevents ·
W42 cash), where the doctrine read the wrong place and used the wrong address.

- **The fiche is found by its branch, never by the session's `cwd`.** The app may create a worktree and
  the sub-session may then work in another, so `list_sessions` can point at the wrong one.
  `git -C <app root> worktree list --porcelain` gives the worktree holding the fiche's `branch` — read
  `docs/chantiers/{chantier}/{slice}.json` there: the latest copy, committed or not. No worktree holds the
  branch → `git -C <app root> show <branch>:docs/chantiers/{chantier}/{slice}.json`.
- **A sub-session is addressed by its `ListAgents` name** (+ `[ref]` when two share one) for
  `SendMessage` and `notify_when_idle` — never by `sessionId`, which is refused (`only supported for
  Claude sessions on this machine`). The name follows the session title: after every `set_session_title`
  the supervisor re-reads `ListAgents` before its next `SendMessage` or re-subscription.

**The supervisor's loop — event-driven, never polling.** Between two notices it does nothing.

1. **Open** — write the partition map; create the sidebar group `{app} · {chantier}` and set its section view to `group_by: "none"`, `sort_by: "alpha"`
   (`set_view(section_id, …)` — the sub-sessions' titles start with the slice code, so alpha order is slice order;
   "Sidebar contract" below), title itself `🧑‍✈️ {repo icon} {chantier}` and pin it (`set_pinned`) — a supervisor is
   started from a fresh top-level session, never from another session's task chip, and one that finds itself nested
   says so in its first message (only the operator can detach it: "Sidebar contract", rule 5); offer
   **one suggested-task chip per slice** carrying that sub-session's
   brief (its first action is the `adopt {slice}` message; it carries the supervisor's `ListAgents` name) —
   no start tool is exposed, so starting a sub-session is one operator click.
2. **Adopt** each new sub-session — on its `adopt {slice}` message, and on **every wake** any session of
   the group not yet adopted (`list_sessions`, group filter: it may have started and stopped before the
   supervisor looked) — `set_session_title`, `move_sessions` into the group, re-read `ListAgents`, then
   `SendMessage` with `notify_when_idle: true` by its `ListAgents` name. The notice is **one-shot**:
   re-subscribe after each.
3. **On each idle notice** — read the fiche **by branch** ("Finding the fiche" above), never from the
   session's `cwd`; read the transcript (`list_events`) **only** when the fiche is missing or stale;
   update the title's state icon; fold new decisions, operator actions and reviews into the
   control-tower table, and re-arm the deadline timer on the earliest open reversible decision (rule 3 of the inbox).
   `PushNotification` **only** when a slice is actually blocked — `1 question bloque {slice} — {n} s` — never for a new
   `review` item or a reversible decision.
   On a `landed` fiche, run the archive check below.
4. **Ask in batches, route answers** — ask the open items as small `AskUserQuestion` batches (≤ 4 closed questions, ordered
   by blocking cost: rule 2 of the inbox), never a long form; each operator answer, and each expired deadline, becomes one
   typed `SendMessage` into that sub-session, addressed by its `ListAgents` name.
5. **Close each slice** — `SendMessage` the sub-session `/review`, then `/land` (it runs both and
   records Vera's verdict in its fiche) → Sage's proof → the slice's `needsOperator` results, in one batch (rule 4 of the inbox)
   → **`archive_session` on its own, as soon as
   the slice is finished** (the four checks of "Archiving" below, no operator OK); the group goes
   when the chantier closes.
6. **Report** — the supervisor's Debrief is the chantier's only card; its body is the control-tower
   table, one row per slice, built from the fiches. Every archive done since the last card is named
   in it under `🤝 Décidé pour toi` — so is every defaulted decision (`par défaut, conteste si besoin`) and every result
   accepted by the recette (`accepté par la recette — rouvrable`). **No `▶ Prompt suivant`** (operator rule, 2026-10-14): the next step is
   an action the supervisor takes itself — a task chip carrying the brief, or a typed `SendMessage` to an
   existing sub-session — recorded as the `Suite` row of the pilot dashboard; the Debrief's `➡️ Suite` names
   that action, with no copy-paste block.

**Archiving — automatic and machine-checked (322.b; the operator's standing order, 2026-10-14).** A
finished session left in the sidebar hides where attention is needed, so the supervisor archives a
sub-session **on its own, without asking**, as soon as it is finished. *Finished* means four checks,
all run by command, all true:

1. **Landed on the trunk** — the fiche is `landed` and its `head` is on `origin/main`:
   `git fetch origin`, then `git merge-base --is-ancestor <head> origin/main`.
2. **Idle and clean** — `list_sessions` shows `isRunning: false`, and its worktree holds nothing
   that would be lost (archiving deletes the worktree): `git -C <worktree> status --porcelain` is empty
   and `git -C <worktree> log origin/main..HEAD` is empty (`<worktree>` = the one holding the branch,
   "Finding the fiche").
3. **Nothing open** — no `decisions[]`, `operatorActions[]` or `review[]` item with `status: open`.
4. **Declared** — the archive is named in the supervisor's Debrief under `🤝 Décidé pour toi`; it is
   reversible (`unarchive_session`).

Any check missing → **no archive**: the title goes 🟡 and the supervisor says which check blocks
(e.g. "T2: 2 uncommitted files in the worktree"). The check runs at the idle notice of a `landed`
fiche and again after each answer routed into that sub-session; a fiche that is not `landed` is never
archived. The operator's standing order is the authorization and `unarchive_session` is the undo, so
no OK is asked; the group `{app} · {chantier}` goes when its last sub-session is archived.

**Titles — applied by the supervisor, not by discipline.** Supervisor: `🧑‍✈️ {repo icon} {chantier}` (e.g.
`🧑‍✈️ 🍌 W42 cash`), pinned. Sub-session: `{slice} {avatar} {object} · {state icon}` (e.g. `D1 👩‍💼 Offre Santa · 🟡`) —
**the slice code comes first** (322.h; before it the avatar did), so the group's alphabetical sort follows the slices.
Avatars from the cohort table (`agents-method.md`); a domain owner's avatar is the one declared for it in the app's
business pack (`docs/project/business/README.md`), 🧑 by default; state icons `planning` 📝 · `working` ⏳ · `waiting` 🟡 ·
`blocked` 🔴 · `landed` ✅ · `parked` 💤. A `landed` slice that cannot be archived yet is retitled 🟡 until it can
("Archiving" above). Emoji live in titles and file contents, never in branch names (above). The `ListAgents` name follows
the title: re-read it after each `set_session_title`.

**Sidebar contract (322.h; the operator's rulings, 2026-10-16 — decided, not re-litigated).** The sidebar is the
operator's one always-open surface, so what stands in it is fixed by rule, not by whoever started a session.

1. **Pinned = supervisors only.** Every supervisor session is pinned and filed in its chantier group
   `{app} · {chantier}`; nothing else is ever pinned. A move un-pins a session — pin it again after any `move_sessions`.
2. **One group per chantier**, section view `group_by: "none"`, `sort_by: "alpha"`. Sub-sessions are task chips the
   supervisor offers, so they nest under it and follow its group on their own; their slice-first titles make the alpha
   sort follow the slices. This replaces the 2026-10-16 morning line `group_by: "state"` in the Open step: a session
   waiting on the operator is read from the 🟡 / 🔴 in its title, not from the sort.
3. **`🎯 Missions libres`** — one section for every session outside a chantier (a parallel one-off mission, not
   project mode), view `group_by: "state"`, `sort_by: "recency"`; title `{repo icon} {object}`.
4. **One icon per repo**, at the start of a free mission's title and right after 🧑‍✈️ in a supervisor's. The folder
   directly under `D:\Apps\` names the repo (table below). The machine-readable copy is
   `docs/METHOD/repo-icons.json` — `{ "bananaevents": "🍌", … , "_scratch": "💬", "_default": "📁" }` — which the sync
   carries with the rest of `docs/METHOD/**`, so supervisors in every app read the same map; `tests/repo-icons.test.mjs`
   fails when the two drift.
5. **Never nest a supervisor.** A session born from another session's task chip nests under it and moves with it — that
   is how four supervisors ended up inside "Today's handoff" and its group. A supervisor is started from a fresh
   top-level session, or the operator detaches it once (row menu → "Detach to top level"); Claude cannot detach a
   chip-born session.
6. **The janitor.** A scheduled task, `rangement-barre-laterale` (🧹), every 2 h from 08:07 to 20:07, re-applies rules
   1–5: it pins and files supervisors, retitles them, files every session outside a chantier into `🎯 Missions libres`,
   adds a missing repo icon (it never rewrites the object) and corrects both kinds of section view. It archives finished
   routine runs (e.g. Mailair's hourly sort: not running, older than 15 min) and, at the 20:07 pass only, finished free
   missions — inactive > 72 h, not running, no open PR, a `cwd` no other session shares, no child session (under
   `.claude/worktrees/` only when its PR is merged; otherwise it is reported "to verify"). It never deletes, never
   archives a supervisor, a running, pinned or PR-open session or a parent, and leaves a chantier's sub-sessions to their
   supervisor, which keeps archiving its own finished ones (322.b). A supervisor it cannot move because it is nested is
   reported "to detach by the operator". Routine runs archive themselves when they have nothing for the operator. The task
   lives in the operator's user-level `~/.claude/scheduled-tasks/` — outside the sync, its prompt is the file — and its
   prompt carries an inline copy of the repo-icon table: change the table here, then the prompt.

**Repo icons.** One per repo; the repo is the folder directly under `D:\Apps\` (matched case-insensitively), a `cwd`
under `scratch-workspaces` is the scratch workspace.

| Repo (folder under `D:\Apps\`) | Icon |
|:--|:--|
| bananaevents | 🍌 |
| Respirit | 🌬️ |
| BanaLog | 🚚 |
| BanaLazer | 🎯 |
| Bana-Share · Swanifly | 🦢 |
| Mailair | 📬 |
| Finasup | 💶 |
| Talkation | 🗣️ |
| versation | 🗂️ |
| gites-groupes | 🏡 |
| LeMansFC | ⚽ |
| Scapience | 🔬 |
| scratch workspace (`_scratch`) | 💬 |
| any other repo (`_default`) | 📁 |

**Chantier vs sprint.** The sprint stays the exception for work **planned ahead, multi-owner, with a
review gate** (`/plan-sprint`, Vera's closing review). A chantier needs none of that ceremony: it is
the default as soon as there is more than one code-writing slice.

#### One conversation relays

`method-core.md` → "`## Resume here` — the Relay home" states: *"One `## Resume here` block per app;
each `/relay` overwrites the previous."* There is exactly one slot, so exactly one lane may write it:
**the main conversation of the app** (the sprint conversation in sprint mode, the supervisor in a
chantier). A split session or a sub-session hands
back through its **task file and its commits** (a sub-session also through its fiche) — never `/relay`, which would overwrite the main
resume state with a single card's context. `/relay` is optional: a landed slice needs no relay at all.

---

## App Readiness Sprint Stack

When the app already has its core architecture and the main question becomes **"can we trust this for real use?"**, stop planning broad feature sprints for a moment.

Use a short **readiness wave** instead:
- fewer, sharper sprints
- one operator loop at a time
- truth over scope
- real usage over theoretical completeness

**Rule:** A readiness sprint must improve one of these directly:
- operator success
- product truthfulness
- recovery/safety
- tester readiness
- launch repeatability

If a sprint does not move one of those, it is probably not a readiness sprint.

### Recommended Order

#### 1. Operator Loop Realness

**Goal:** Make one end-to-end operator loop work in the real product, not just in isolated engines or IPC.

**Typical scope:**
- connect/select project
- trigger the core workflow from the real UI
- show progress and result states clearly
- review generated output/diff
- write safely to the real workspace
- verify or commit the result

**Exit gate:** The same operator loop works twice in a row on a real repo without hidden manual rescue.

#### 2. Truth Model and Dashboard Reality

**Goal:** Remove claim-vs-reality gaps so the app says only what it can actually prove.

**Typical scope:**
- persist stage/state in a real source of truth
- align dashboard labels with actual evidence
- replace placeholders and misleading estimates where possible
- mark estimated values clearly where replacement is not yet possible

**Exit gate:** No critical dashboard or readiness metric depends on hidden local state or mislabeled heuristics.

#### 3. Daily Dogfood Reliability

**Goal:** Use the app daily on one real project and survive failure cleanly.

**Typical scope:**
- error visibility
- retry / abort / recovery flows
- telemetry for real failures
- writeback safety and rollback validation
- issue capture from real operator sessions

**Exit gate:** 5-10 real sessions completed, failures are logged and triaged, and no data-loss incident is tolerated.

#### 4. External Beta Readiness

**Goal:** Make the product understandable and safe for a small number of testers.

**Typical scope:**
- onboarding and first-run path
- settings sanity and key/setup guidance
- empty states and fallback behavior
- feedback capture
- crash/error reporting
- privacy and boundary checks

**Exit gate:** 3 real testers complete the main CUJ with limited intervention.

#### 5. Launch and Release Readiness

**Goal:** Make shipping repeatable instead of heroic.

**Typical scope:**
- release checklist
- rollback plan
- staging -> production rehearsal
- support / ops runbook
- launch gate ownership
- business and user pulse checks

**Exit gate:** One release can be shipped and verified end-to-end without ad-hoc patching.

### What NOT to Schedule During Readiness

- new agent personas unless they unblock a core loop
- broad new feature surfaces
- speculative model/provider expansion
- cosmetic-only sprints unless they materially improve trust or onboarding
- refactors with no direct readiness impact

### Swanifly Example: Relevant Readiness Sprint Wave

For Swanifly specifically, the recent hardening work means the next useful wave should focus on **real usage readiness**, not another broad feature expansion.

Use the **next available sprint numbers in the repo**. At the moment, that likely means starting **after `027`**, since `027` is already used.

**Recommended sequence:**

1. **028 - Operator Loop Internal Alpha**
   - make the Atlas -> workflow -> progress -> diff -> writeback -> verification loop feel fully real in the desktop app
   - prove one real Swanifly repo task can be run twice in a row without hidden fixups
   - add a manual validation checklist for the exact operator loop

2. **029 - Dashboard Truth and Persisted Stage**
   - move project stage/readiness state out of renderer-local assumptions into a real persisted source of truth
   - make the dashboard explicitly truthful about what is real vs estimated
   - tighten launch-gate, user-pulse, and monetize-check surfaces around real artifacts

3. **030 - Daily Driver Dogfooding**
   - use Swanifly daily on one real project
   - capture friction, recovery failures, confusing states, and time-wasting steps
   - fix reliability and UX blockers found in real sessions rather than speculative polish

4. **031 - External Beta Gate**
   - make first-run setup, model/key configuration, project connection, and failure states understandable to a small tester group
   - add feedback capture and a lightweight tester guide
   - verify that non-builder users can complete the main flow with limited support

5. **032 - Launch and Release Readiness**
   - define the release checklist, rollback path, support expectations, and launch health checks
   - rehearse staging -> production -> verification
   - decide the real launch threshold instead of leaving readiness implicit

### Readiness Kill Gate

Do **not** move from one readiness sprint to the next if the current sprint still has:
- unverified core claims
- manual workaround steps that are not documented
- failing smoke tests on the main loop
- unresolved data-loss or trust issues
- ambiguous ownership for launch-critical checks

Readiness work compounds. If the current loop is dishonest or fragile, adding another layer only hides the real blocker.

---

## Sprint Artifacts

### Required Files

1. **Task files** (one per task)

### Optional Files

2. **Sprint overview** (if complex sprint, multiple CUJ steps)
3. **Retrospective** (if team, end of sprint lessons)

**Keep minimal:** Sprint structure is for tracking, not ceremony.

---

## Task Template Location

**Full template:** `docs/METHOD/templates/TASK-TEMPLATE.md`

**Use when:**
- Creating new sprint tasks
- Reference for task file structure
- Copy/paste starting point

**Link in task files:** "See TASK-TEMPLATE.md for format"

---

## Gotchas

**Task file too long?**
→ Split into multiple tasks

**Agent needs file not in entry?**
→ Add to task-specific resources section

**Sprint has many tasks?**
→ Keep all tasks in same sprint folder; use sprint overview to organize

**Intervention mid-sprint?**
→ Log in `interventions/`; link to sprint if related

**Prerequisites unclear?**
→ Ask the coordinator (or have Junia re-plan); don't guess dependencies

---

## Next Steps

1. **Today:** Managers Sync before planning a sprint (Junia drafts, the coordinator checks)
2. **Next sprint:** Agents use canonical task format (see example above)
3. **Ongoing:** Refine DoD based on real usage (lighter or stricter?)
4. **Future:** Automate task routing with external orchestration (ADK/MCP)

---

**Owner:** Junia  
**Last Updated:** 2026-10-15

