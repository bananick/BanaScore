# Sprint Structure

**Owner:** Junia  
**Version:** 318.a  
**Purpose:** Sprint system, DoD by mode, rituals

> **When a sprint is justified — and when it isn't.** The sprint is the **exceptional** mode: open
> one only for work that is genuinely multi-task and planned ahead — several ordered tasks with
> real dependencies, more than one owner/agent, or a milestone that warrants a review gate. The
> **nominal** mode is a single targeted slice: an **intervention** (`/intervention`, logged in
> `docs/interventions/`) or a **plan** executed to the end, then the local merge gate, then the
> landing on `main` (LANDED — deploying is its own step, with its own evidence). A single fix, a single screen, a single analysis is never a sprint — wrapping
> one in sprint ceremony produces folders nobody closes. Everything below remains the reference for
> the sprint mode, and applies in full once a sprint is actually open. See `CLAUDE.md` →
> "Work Modes" for the nominal path.

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

A `Stop` hook runs at the end of every Claude Code turn and writes to git:

| Hook | What it does at Stop |
|---|---|
| `.claude/hooks/ship-push.sh` | `exit 0` on `main`/`master`/`HEAD`; otherwise pushes the current branch (`git push`, or `git push -u origin "$branch"` when no upstream). Never commits, never force-pushes. |

(`session-telemetry.mjs` also runs at `Stop`, but since 318.a it only appends to a local, gitignored
ledger — it no longer commits or pushes anything.)

The hook is branch-scoped and **swallows a rejected push** (`ship-push.sh` redirects the push to
`>/dev/null 2>&1`). Two consequences follow directly, and they are the whole reason for the rule:

1. **Two sessions on the same branch ⇒ silent divergence.** The second session's push is rejected
   non-fast-forward and the rejection is discarded. The work exists locally; every downstream reader
   — `/brief`, GitHub, the operator — sees that branch as stalled. Nothing surfaces the error. This is
   the expensive failure mode: not a lost commit, a *lie about progress*.
2. **Two sessions in the same worktree ⇒ a shared index.** `git add` in `/ship` stages whatever the
   other session is mid-edit. One session's commit ships the other's half-finished file.

The hook is not defensive against concurrency, and should not become so — the cheap fix is one
branch and one worktree per session. *(If you are reading this in an app mirror and the hook above
is not what `.claude/settings.json` wires there, trust the file, not this table, and report the
drift.)*

#### The lanes (branches, not titles)

Do not put a literal emoji in a branch name: a `.ps1` without a BOM is read as the ANSI codepage by
PowerShell 5.1, so a literal emoji silently breaks every `match` (precedent: `versioning.md`, v313.a
`flight-deck.ps1`). Emoji belong in **file** status markers.

| Lane | Branch | Lifespan |
|---|---|---|
| **Slice** (default — intervention or plan) | `{type}/{scope}` (cloud sessions: `claude/{concern}`) | one slice |
| **Sprint** (exception) | `sprint/{NNN}-{slug}` | one sprint |
| **Split** (exception inside a sprint) | `sprint/{NNN}-{seq}` + its own worktree | one card |

#### Choosing the lane — a runtime rule, never a planning-time one

The choice is made **while executing**, on an observed fact — never predicted while planning.
At planning time the planner holds the least information it will ever hold about the card: it has not
seen the code, the test output, or how many fix loops the card will actually cost. A session split
decided in advance is a guess, and a wrong guess is expensive in both directions (a needless window
loses the slice's context; a missing one produces the silent-divergence failure above).

```
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

#### One conversation relays

`method-core.md` → "`## Resume here` — the Relay home" states: *"One `## Resume here` block per app;
each `/relay` overwrites the previous."* There is exactly one slot, so exactly one lane may write it:
**the main conversation of the app** (the sprint conversation, in sprint mode). A split session hands
back through its **task file and its commits** — never `/relay`, which would overwrite the main
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
**Last Updated:** 2026-07-10

