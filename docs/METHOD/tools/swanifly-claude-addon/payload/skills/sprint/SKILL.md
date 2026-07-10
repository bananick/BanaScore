---
name: sprint
description: >-
  Create, audit, or align SprintOS sprints. Use when the user says "check the sprints",
  "prepare sprints", "plan a sprint", "sprint NNN", or wants sprint files reviewed
  against the app vision and current state. Produces task files in the exact SprintOS
  emoji/agent/sequence format.
---

# sprint

Manages sprints in the SprintOS convention. Two modes: **plan/create** and **audit/align**.

## Conventions (must match exactly)

- Folder: `docs/sprints/{NNN}/` (3-digit, left-padded).
- Task file: `{sprint}-{seq} {status} {Agent} - {title}.md` — **status emoji is the first character**.
- Status: `⬜` Todo · `✅` Done · `☑️` Validated · `⚠️` Problem.
- Agents: Junia, Brian, Vera, April, Nova, Lucia, Teddy, Aiko, Watson, Sage, Kasper, Gordon, Iris (see `CLAUDE.md`).
- Each task file has: header (Sprint, Agent, **Tier** `T1|T2|T3` — judge/plan / build / mechanical, Prereqs, Status, Created) · **Context** (what/why/where) · **Acceptance Criteria** · **Definition of Done** · **Entry Files** · **Report** (appended after completion, or in `reports/`).

## Before doing anything

Load `docs/project/STATE.md` (current state + blockers) and the relevant vision/roadmap (`docs/project/ROADMAP.web.md`, VISION if present). Respect the hierarchy of truth.

## Plan / create mode

1. Confirm the sprint's objective against STATE.md + vision.
2. Break it into ordered tasks, each assigned to the right agent role.
3. Write the folder + task files in the exact format above, status `⬜`.
4. Keep tasks bounded (token-aware) — prefer several small `/task-start`-sized tasks over one giant one.

## Audit / align mode

1. List existing `docs/sprints/*` and read STATE.md.
2. Check: are the **required** sprints present for the app vision? Is each sprint fully detailed, clear, and persona-complete (admin/sales/partner/organizer)?
3. Report gaps and inconsistencies; propose/add the missing sprints or task detail.
4. Verify naming/emoji/agent conventions are correct; fix drift.

## Output

For audit: a short table of sprint → status → gaps, then the concrete additions. For planning: the created files + a one-line plan summary. Don't restate file contents already written.
