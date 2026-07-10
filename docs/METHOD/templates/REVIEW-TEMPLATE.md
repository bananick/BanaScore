# REVIEW ⬜ — <TASK|SPRINT> — <short-title>

> Use this template to run the **Review Gate** with a high-model Analyzer (Claude/GPT).
> - **TASK review:** append into the task file (recommended) OR create a dedicated review file.
> - **SPRINT review:** create `{sprint}-z ☑️ Vera - sprint review.md` in the sprint folder.

## Header
- **Scope**: TASK | SPRINT
- **Sprint**: <###>
- **Task**: <###-a ...> (TASK only)

- **Reviewed by**: Vera (High-Model Analyzer)
- **Model**: T1 — Fable/Opus | GPT-5.x-class (the Review Gate never runs below T1; `routing-method.md` → "Model Routing")
- **Verdict**: PASS | FAIL | PASS_WITH_FOLLOWUPS
- **Date**: YYYY-MM-DD
- **Inputs**:
  - Task/sprint files:
  - Diff/PR/commit:
  - Docs loaded (as needed): `project/VISION.md`, `project/DESIGN.md`, `project/ROADMAP.*.md`, `project/status.md`, `project/AI-INFRA.md`

---

## Checklist (high-signal)

### Vision & UX
- [ ] Matches VISION/JTBD/success state (no scope drift)
- [ ] Acceptance criteria met (from task file)
- [ ] Copy/UX is consistent (errors, empty states, labels)

### Design & a11y
- [ ] Uses DESIGN tokens/components (MD3 patterns)
- [ ] Keyboard + focus states correct; no obvious a11y regressions
- [ ] Responsive basics OK; FR text expansion considered

### Security
- [ ] No secrets committed; server/client env vars handled correctly
- [ ] AuthZ enforced for sensitive operations (server + rules)
- [ ] Input validation present (client + server where relevant)
- [ ] Firestore rules/permissions least-privilege (if touched)
- [ ] Multitenancy isolation enforced (tenant-scoped data under `teams/{teamId}/...`, membership-gated; no cross-tenant queries)

### Testing & Quality
- [ ] DoD met for selected mode (tests, typecheck, lint, smoke test)
- [ ] Error handling + logging are reasonable for risk level
- [ ] No obvious perf footguns introduced (hot loops, large renders)

### Docs & Project Surfaces
- [ ] Task report is complete and honest
- [ ] ROADMAP/status updated (sprint close)
- [ ] DESIGN/VISION updated if a decision changed them

### Data & Schema
- [ ] Schema changes reflected in `project/SCHEMA.md`
- [ ] Zod validation schema matches Firestore structure
- [ ] No untyped Firestore writes (all pass through Zod)
- [ ] Migration script provided (if required field added/renamed)

---

## Findings

### Must Fix (blocking)
- <item>

### Should Fix (non-blocking)
- <item>

### Nice To Have
- <item>

---

## Decision & Next Actions

### If PASS
- Mark task status `☑️` (or mark sprint review file `☑️`)

### If FAIL
- Mark task status `⚠️`
- Create follow-up task(s) with clear acceptance criteria
- Re-run Review Gate after fixes (aim for `☑️`)

---

## Vera Prompt (copy-paste)

Use this prompt to run Vera in Claude or GPT. Replace placeholders with actual file contents.

```
You are Vera, the Review & Validation agent (High-Model Analyzer).

Your job: Run a Review Gate on the completed task/sprint below. Check for cross-cutting misses in **security**, **vision alignment**, **design/a11y**, **testing/i18n**, and **docs consistency**.

---

**Scope:** <TASK|SPRINT>

---

**Task/Sprint file(s):**
<paste task file content or list of task reports>

**Changed files / diff:**
<paste git diff or PR link>

**Project docs (as needed):**
- VISION.md: <paste relevant excerpts>
- DESIGN.md: <paste relevant excerpts>
- ROADMAP/status: <paste relevant excerpts>

---

**Instructions:**
1. Run through the checklist below.
2. For each item, mark ✅ (pass), ⚠️ (minor issue), or ❌ (must fix).
3. List findings: Must Fix / Should Fix / Nice To Have.
4. Give a verdict: PASS, FAIL, or PASS_WITH_FOLLOWUPS.
5. If FAIL, specify follow-up tasks needed.

**Checklist:**
- Vision & UX: Matches VISION/JTBD? Acceptance criteria met? Copy consistent?
- Design & a11y: Uses DESIGN tokens? Keyboard/focus OK? Responsive + FR expansion?
- Security: No secrets? AuthZ enforced? Input validation? Firestore rules least-privilege?
- Security: Multitenancy isolation enforced (tenant-scoped data membership-gated; no cross-tenant reads)?
- Testing & Quality: DoD met? Error handling OK? No perf footguns?
- Docs: Task report complete? ROADMAP/status updated? DESIGN/VISION updated if needed?
- Data & Schema: Schema changes in SCHEMA.md? Zod schemas match Firestore? No untyped writes? Migration script if needed?

---

Output your review in the format of the REVIEW-TEMPLATE.md.
```


