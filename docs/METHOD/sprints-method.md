# Sprint Structure

**Owner:** Junia  
**Version:** 311.a  
**Purpose:** Sprint system, DoD by mode, rituals

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
1. Junia reviews ROADMAP + active CUJ
2. Identifies next step
3. Creates task files for current week
4. Agents execute (sequence or parallel)
5. Junia consolidates → updates project/ → closes sprint

---

### 2. Interventions (Ad-hoc)

Expert or manager conducts focused mission.

**Process:**
1. Create: `docs/interventions/YYYY-MM-DD-{Agent}-{topic}.md`
2. Execute mission
3. Managers sync: update VISION/ROADMAP/DESIGN/AI-INFRA as needed
4. Link back to sprint or roadmap items

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
- [ ] CI passes
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

**Standard DoD for all tasks** (see `method-core.md` for full details):

- [ ] Feature works (smoke test)
- [ ] Unit tests for critical paths
- [ ] Typecheck passes (no `any`)
- [ ] EN/FR i18n strings externalized
- [ ] No linter errors
- [ ] Task report appended
- [ ] Review Gate passed (Vera) → task marked `☑️`
- [ ] Committed to git

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

### Task Review

- **Trigger:** Task is marked `✅` (executor done; ready for review)
- **Reviewer:** **Vera** — **T1 floor**: strongest reasoning model available (Fable/Opus on Claude; GPT-5.x-class elsewhere). The Review Gate never runs below T1 (`routing-method.md` → "Model Routing")
- **Output:** Reviewer appends a short review (use `docs/METHOD/templates/REVIEW-TEMPLATE.md`) and updates status:
  - `☑️` = approved / validated
  - `⚠️` = rejected (must-fix items + follow-up tasks required)
- **Fast-Track:** For micro-fixes (typos, one-line changes), Vera can validate immediately without full review

### Sprint Review

- **Trigger:** Junia is ready to close the sprint
- **Artifact:** `{sprint}-z ☑️ Vera - sprint review.md` in the sprint folder
- **Rule:** Sprint should not close until Review Gate is either **passed** or explicitly **deferred with follow-up tasks**.

---

## Rituals

### Junia (Sprint Planning)

**When:** When previous sprint completes (or starting new work)

**Steps:**
0. **CUJ Precision Gate** ← *Nouvelle étape obligatoire (v303.e)*
   - Vérifier que le CUJ actif (`docs/journeys/{cuj}.md`) a une section **Precision Gate ✅** complétée et validée par l'opérateur humain
   - **Si absent ou incomplet** → STOP. Convoquer April en mode **CUJ Definition Session** (voir `agents-method.md` → April)
   - **Si ambigu** (critère de succès pas testable) → Relancer April pour révision
   - **Ne pas continuer** avant que le Precision Gate soit ✅

1. **Check next sprint number:**
   - Review `docs/sprints/` folders
   - Use next sequential number (e.g., if `009/` exists, use `010/`)

2. **Run Managers Sync** (see below)

3. **Run METHOD sync:**
   ```bash
   npm run sync-method:all:dry   # preview drift; run sync-method:all to apply
   ```
   If drift detected, resolve before planning.

4. **Review active CUJ step** (`docs/journeys/`)

5. **Draft sprint plan** (3-7 bullets) → **95% Gate** (see below)

6. **Create task files:**
   - Use `docs/METHOD/templates/TASK-TEMPLATE.md`
   - Or helper script (cross-platform): `node scripts/create-sprint.mjs 015 "notifications"`

7. **Include agent instructions** in each task file (entry files to load)

8. **Issue prompts** (one conversation, role-switching as needed) — name that conversation `{NNN} {topic}`, starting with the sprint number (see *Conversation Naming* under Sprint Numbering)

---

### Managers Sync (Before Planning)

**Purpose:** Ensure all manager files are up-to-date before Junia plans sprint.

**Checklist:**

- [ ] **Junia:** `project/STRUCTURE.md` current? Routes/features/status accurate?
- [ ] **April:** `project/VISION.md` current? Any persona/JTBD changes?
- [ ] **Nova:** `project/DESIGN.md` current? New tokens/components documented?
- [ ] **Riley:** `project/AI-INFRA.md` current? New agents/evals/models added?
- [ ] **Sage:** Tech decisions documented? Hex boundaries clear?
- [ ] **Lucia:** METHOD synced? (`sync-method.mjs --check`)

**If any outdated:** Create intervention to update, THEN plan sprint.

**Why:** Avoid planning with stale context (leads to rework).

---

### 95% Certainty Gate (Managers Only)

**Applies to:** April, Junia, Nova, Riley, Sage, Lucia

**Rule:** If uncertainty about vision/requirements/scope > 5%, STOP and resolve before planning.

**Process:**
1. Batch concise questions (2-5)
2. Interview relevant expert:
   - Vision unclear? → April
   - Design unclear? → Nova
   - AI infra unclear? → Riley
   - Architecture unclear? → Sage
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
7. **Review Gate:** Vera reviews → sets `☑️` or `⚠️`
8. **Notify Junia**

---

### Junia (Consolidation)

**When:** All sprint tasks are `✅` (ready for review) or `⚠️` (problem)

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
8. **Firebase deploy (if sprint touches production):**
   - Run Firebase Deployment Readiness checklist (see `method-core.md`)
   - Deploy to staging → verify → then deploy to production
9. **Commit and push sprint artifacts:**
   ```bash
   git add docs/sprints/ docs/project/
   git commit -m "chore(sprint): complete 015 - notifications"
   git push origin main
   ```
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

### Conversation Naming

**Rule:** Every Desktop/Code conversation that works a sprint **starts its name with the sprint number** — `{NNN} {topic}` (e.g., `309 — METHOD refresh`).

- **Why:** a session is instantly traceable to its sprint (and its task files / folder) without opening it.
- **One sprint, one conversation** — keep all of a sprint's role-switching inside the conversation named for that sprint (matches "Issue prompts" below).
- **Non-sprint work** (interventions) uses the intervention slug instead: `INT {YYYY-MM-DD} {topic}` — mirrors `docs/interventions/YYYY-MM-DD-{Agent}-{topic}.md`.

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
→ Ask Junia; don't guess dependencies

---

## Next Steps

1. **Today:** Junia runs Managers Sync before planning
2. **Next sprint:** Agents use canonical task format (see example above)
3. **Ongoing:** Refine DoD based on real usage (lighter or stricter?)
4. **Future:** Automate task routing with external orchestration (ADK/MCP)

---

**Owner:** Junia  
**Last Updated:** 2026-07-10

