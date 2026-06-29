# Routing & Entry Points

**Owner:** Lucia  
**Version:** 309.a  
**Purpose:** Define multi-entry system and orchestration patterns

---


## Entry Point Matrix

### By Agent

> Cohort = 12 executable agents (Skills + `.claude/agents/` sub-agents). **Riley** (API/automation)
> is a demoted advisory hat — no sub-agent, no routing row.

| Agent   | Sub-agent              | Entry Files                                                       |
|---------|------------------------|-------------------------------------------------------------------|
| April   | `april`                | `agents-method.md` → `project/VISION.md`                          |
| Junia   | `junia`                | `agents-method.md` → `sprints-method.md` → `project/` (all)      |
| Nova    | `nova`                 | `design-method.md` → `project/DESIGN.md`                          |
| Lucia   | `lucia`                | ALL `method/` files                                               |
| Brian   | `brian`                | `method-core.md` → `project/DESIGN.md` → sprint task file         |
| Teddy   | `teddy`                | `method-core.md` → `project/DESIGN.md` → `project/mobile-*.md` → sprint task file |
| Watson  | `watson`               | `method-core.md` → `tests-method.md` → `project/STATE.md`        |
| Gordon  | `gordon`               | `project/VISION.md` → `project/ROADMAP.*.md` → analytics          |
| Aiko    | `aiko`                 | `ai-infra-method.md` → `project/AI-INFRA.md` → sprint task file   |
| Sage    | `sage`                 | `tests-method.md` → `project/ROADMAP.*.md` → sprint task file     |
| Kasper  | `kasper`               | `code-rules.md` → `project/` → security configs                  |
| Vera    | `vera` (read-only)     | `method-core.md` → `design-method.md` → `templates/REVIEW-TEMPLATE.md` → task/sprint file |

### By Task Type

| Task         | Entry Files                                                |
|--------------|------------------------------------------------------------|
| Build        | `method-core.md` → `project/DESIGN.md` → sprint task       |
| Debug        | `method-core.md` → `tests-method.md` → logs/status         |
| Design       | `design-method.md` → `project/DESIGN.md`                   |
| Plan         | `sprints-method.md` → `project/ROADMAP.*.md` → `journeys/` |
| Map structure | `project/STRUCTURE.md` → `project/VISION.md`              |
| Test         | `tests-method.md` → sprint task                            |
| AI Feature   | `ai-infra-method.md` → `project/AI-INFRA.md` → sprint task |
| i18n         | `method-core.md` (i18n section) → `locales/`               |
| Review       | `method-core.md` → `design-method.md` → `templates/REVIEW-TEMPLATE.md` → task/sprint |
| Port design  | `design-method.md` → `docs/porting/PORTING-PLAYBOOK.md` → PORT-MAP → screen |

### By Slash-Command (Claude Code rituals)

| Command         | Driver | What it does | Delegates to |
|-----------------|--------|--------------|--------------|
| `/plan-sprint`  | Junia  | Create sprint folder + task files | — |
| `/review`       | Vera   | Run the Review Gate (read-only) | — |
| `/intervention` | Lucia  | Open a METHOD intervention RFC | — |
| `/port`         | Nova/Brian | Port a Claude-Design Artifact screen to code | `brian`/`teddy` |

> Rituals live in `.claude/commands/`. Junia orchestrates the loop:
> `/plan-sprint` → build (`brian`/`teddy`) → `sage` → `watson` (if red) → `/review` (`vera`).

---

## Context Loading Rules

1. **Always load your agent entry files** (see matrix above)
2. **Load sprint task file if executing a task**
3. **DO NOT load entire METHOD/ in every chat** → use entry points
4. **DO NOT load unrelated project/ files** → check info surfaces in `agents-method.md`
5. **Load journeys/ only if working on CUJ step**
6. **Load tests-method.md only if task involves testing**

---

## Review Gate

After every task, treat `✅` as **executor done / ready for review** and `☑️` as **validated**.

- **Executor:** `⬜` → `✅`
- **Vera (high-model Analyzer):** `✅` → `☑️` (pass) OR `⚠️` (fail with must-fix + follow-ups)

Use `docs/METHOD/templates/REVIEW-TEMPLATE.md` for task and sprint reviews.

---

## Worked Example: Sprint in a Single Conversation

### Scenario

Solo developer (you) using one powerful LLM (GPT-5, Claude Sonnet 4.5) to play all agents in sequence.

### Setup

- **App:** Firedance (invoice generator)
- **Sprint:** 010 — User settings page
- **Tasks:** 3 tasks (010-a, 010-b, 010-c)

### Execution

#### Step 1: Junia Plans Sprint

**Prompt to LLM:**
```
You are Junia, Planning & Orchestration agent.

Context to load:
- docs/METHOD/agents-method.md
- docs/METHOD/sprints-method.md
- docs/project/VISION.md
- docs/project/ROADMAP.web.md
- docs/project/status.md
- docs/journeys/onboarding-cuj.md (step 3: user settings)

Task: Plan sprint 010 for user settings page.

Create 3 task files:
- 010-a: Implement settings UI
- 010-b: Wire to Firestore
- 010-c: Add to navigation
```

**LLM Output:**
- Creates `docs/sprints/2025/week-47/010-a ⬜ Brian - implement settings UI.md`
- Creates `docs/sprints/2025/week-47/010-b ⬜ Brian - wire settings to Firestore.md`
- Creates `docs/sprints/2025/week-47/010-c ⬜ Brian - add settings to navigation.md`
- Updates `docs/project/status.md` with sprint 010 active

---

#### Step 2: Switch to Brian (Execute 010-a)

**Prompt to LLM:**
```
[Switching to Brian]

You are Brian, Web Development agent.

Context to load:
- docs/METHOD/method-core.md
- docs/project/DESIGN.md
- docs/sprints/2025/week-47/010-a ⬜ Brian - implement settings UI.md

Task: Execute 010-a fully.

Follow DoD:
- Feature works
- Unit tests added
- Typecheck passes
- EN/FR i18n strings externalized
- Append report to task file
- Update status tag: ⬜ → ✅
```

**LLM Output:**
- Implements settings page component
- Writes unit tests
- Adds i18n strings to `locales/en/common.json`, `locales/fr/common.json`
- Appends report to `010-a.md`
- Renames file to `010-a ✅ Brian - implement settings UI.md`

---

#### Step 3: Switch to Brian (Execute 010-b)

**Prompt to LLM:**
```
[Switching to Brian]

Context to load:
- docs/METHOD/method-core.md
- docs/project/DESIGN.md
- docs/sprints/2025/week-47/010-b ⬜ Brian - wire settings to Firestore.md
- docs/sprints/2025/week-47/010-a ✅ ... (check prerequisites)

Task: Execute 010-b fully.
```

**LLM Output:**
- Wires settings to Firestore (teams/{teamId}/members/{uid}/settings)
- Writes integration test with Firebase emulator
- Appends report
- Updates status tag to `✅`

---

#### Step 4: Switch to Watson (Smoke Test)

**Prompt to LLM:**
```
[Switching to Watson]

You are Watson, Reliability & Ops agent.

Context to load:
- docs/METHOD/method-core.md
- docs/METHOD/tests-method.md
- docs/project/status.md

Task: Run smoke test after 010-a and 010-b completion.

Steps:
1. Start app on .env PORT
2. Test critical path: login → select team → settings → update → save → verify
3. Check logs for errors
4. Report in docs/sprints/2025/week-47/010-smoke.md
```

**LLM Output:**
- Runs smoke test
- Creates smoke test report
- Flags issue: settings not persisting on refresh (caching bug)
- Status: `⚠️` (problem found)

---

#### Step 5: Switch to Brian (Hotfix)

**Prompt to LLM:**
```
[Switching to Brian]

Context: Watson found caching bug in 010-smoke report.

Task: Fix caching issue, update 010-b report with fix details.
```

**LLM Output:**
- Fixes caching (add useEffect dependency)
- Updates 010-b report with hotfix section
- Watson re-runs smoke test → `✅`

---

#### Step 6: Back to Junia (Consolidation)

**Prompt to LLM:**
```
[Back to Junia]

Context to load:
- All task files from sprint 010
- docs/project/status.md
- docs/project/ROADMAP.web.md

Task: Consolidate sprint 010.

Steps:
1. Read all task reports (010-a, 010-b, 010-c, 010-smoke)
2. Update project/status.md (mark sprint 010 complete)
3. Update project/ROADMAP.web.md (mark "user settings" done)
4. Run final smoke test (or delegate to Watson)
5. Commit sprint artifacts
```

**LLM Output:**
- Reads all reports
- Updates status.md and ROADMAP.web.md
- Runs final verification
- Ready for Review Gate

---

#### Step 7: Switch to Vera (Review Gate)

**Prompt to LLM:**
```
[Switching to Vera]

You are Vera, Review & Validation agent (High-Model Analyzer).

Context to load:
- docs/METHOD/method-core.md
- docs/METHOD/design-method.md (a11y/design guardrails)
- docs/METHOD/templates/REVIEW-TEMPLATE.md
- All task files from sprint 010 (010-a, 010-b, 010-c, 010-smoke)
- docs/project/VISION.md, docs/project/DESIGN.md

Task: Run Review Gate on sprint 010.

Checklist:
- Vision/UX: Does settings page match VISION? Acceptance criteria met?
- Design/a11y: Uses DESIGN tokens? Keyboard/focus OK?
- Security: No secrets? AuthZ for settings update? Input validation?
- Tests/Quality: Unit + smoke tests pass? DoD met?
- Docs: Task reports complete? ROADMAP updated?

Output: Append review to sprint folder as `010-z ☑️ Vera - sprint review.md`
```

**LLM Output:**
- Reviews all task reports + diff
- Checks security (settings save is membership-gated + authenticated ✅)
- Checks design (uses DESIGN tokens ✅, keyboard nav OK ✅)
- Checks tests (unit + smoke pass ✅)
- Minor finding: FR i18n string "Paramètres" missing accent → Should Fix
- Verdict: **PASS_WITH_FOLLOWUPS**
- Creates `010-z ☑️ Vera - sprint review.md`
- Notes follow-up: fix FR accent in next sprint

---

#### Step 8: Back to Junia (Close Sprint)

**Prompt to LLM:**
```
[Back to Junia]

Vera has passed the Review Gate with minor follow-ups.

Task: Close sprint 010.
- Commit all artifacts
- Note follow-up for FR i18n fix
```

**LLM Output:**
- Commits sprint artifacts
- Closes sprint 010
- Adds follow-up to next sprint backlog

---

### Outcome

**Time:** 1 long conversation with multiple role switches  
**Files modified:** 6 (3 tasks + smoke test + status + roadmap)  
**Tests:** Unit, integration, smoke  
**DoD:** Met  
**Status:** Sprint 010 complete

### Advantages

✅ Fast iteration (single context window)  
✅ No orchestration overhead  
✅ Works today with any powerful LLM  
✅ Natural for solo developer

### Disadvantages

⚠️ No true parallelization  
⚠️ Risk of role confusion if not disciplined  
⚠️ Long context windows required


---

**Owner:** Lucia  
**Last Updated:** 2026-03-11
