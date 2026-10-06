# Method Agents Cohort

**Owner:** Lucia  
**Version:** 318.a  
**Last Updated:** 2026-10-06  
**Purpose:** Define universal agent roles, responsibilities, info surfaces, rituals

---

## How agents run (the native sub-agent layer)

**`.claude/agents/{agent}.md` is the canonical definition of an agent** — its `## Identity`
(voice · refusals · deference · handoff), its mandate, and the cohort-wide `## Non-negotiables`
block. `.claude/skills/{agent}/SKILL.md` is a **stub that loads the agent file** (exposes the persona
on Claude Desktop) and redefines nothing. Edit the agent file — never a Skill stub. Tool-scoping
table: `.claude/agents/README.md`. Delegation/parallel mechanics: `agents-engineering-method.md` §5.

> `Swanifly/web/lib/engine/agent-personas.ts` is **not** generated from the agent files — earlier
> releases claimed it was, but no generator exists. It is hand-maintained and **parked** with the
> Swanifly engine (paused); it is not a surface to keep in sync.

### Orchestration chain (canonical — reference it, never restate it, except `CLAUDE.md`)

**The coordinating conversation orchestrates — not an agent.** It reads, arbitrates, delegates,
folds every report into one Debrief, runs the Recette and lands. Junia plans; she does not run the
chain.

**Per task (the build loop):** `brian` (build) → `watson` (only when the gate goes red) → `kasper`
(security pass — **only when `firestore.rules` / auth / API routes are touched**).

**Once per slice, at the ✅ Recette:**
1. `vera` — **one** review of everything the slice changed, against its Cadrage and the Definition
   of Done, always on opus. REJECTED → the must-fix items go back to the build loop.
2. `/land` → **LANDED**. Where the app deploys, the deploy is its own step with its own evidence
   (the served revision) → **DEPLOYED**.
3. `sage` — runs the Cadrage's `Proof:` on the environment it names, with real data → **PROVEN**
   (or the exact gap), then pins it as a regression test. She runs where the Proof says: before
   `/land` when it is a local run against live data, after the deploy when it names the served
   revision.
4. The operator: **accept / reopen / defer** (`method-core.md` → "The two-moment contract").

**Fan-out, outside the chain:** `nova` design · `gordon` commercial & growth · `iris` study &
deliverables · `lucia` METHOD release. **Plan before the chain:** `junia` turns the request into a
plan (or a sprint) and drafts its Cadrage.

The three parked agents (`teddy`, `aiko`, `april`) are **not** in the chain or the fan-out — under
`.claude/_dormant/`, outside Claude Code's scanned agent directories, so **not loaded and not
delegable**. Bringing one back is a `git mv` into `.claude/agents/`, the operator's call, never an
agent's mid-session.

**The one exception to "reference, never restate" is `CLAUDE.md` → "Agent Cohort"**, which carries a
one-line copy of this chain: the coordinator runs it, and `CLAUDE.md` is the one file the coordinator
always has loaded. Every other file — `junia.md`, `.claude/agents/README.md`, `routing-method.md` —
references this section. (Until 317.c the inline copy lived in `junia.md`, because Junia ran the
chain; she no longer does.)

Each sub-agent runs in a fresh context with **scoped tools** (Vera read-only; Sage tests + proof
records only; Iris read-only on product code; Kasper review+harden). Agent Teams and Cowork are
**runners** over the same cohort, not the engine. **Mono-conversation role-switching** is the
**fallback** for tools without a sub-agent layer — see "Agent Interaction Patterns".

**Delegation is the default, not an option**, and **model routing is on by default** (orchestrate
high, execute cheap; `Tier:` on every planned item; an explicit `model` on every Workflow worker):
`routing-method.md` → "Model Routing".

---

## Agent Roster (10 active mandates + 3 dormant)

**An agent earns a name when its mandate is one you would otherwise have to retype.** Ten mandates
clear that bar (318.a, measured on 120 days of practice — see
`docs/interventions/2026-10-06-Lucia-v318a-practice-audit.md`). Three are parked under
`.claude/_dormant/`, outside Claude Code's scanned agent directories — **not loaded, not delegable**.

### Human Executive (Agent 0)

**The human operator is always the final arbiter. Agents advise; humans decide. When in doubt, ask.**
The **coordinating conversation** acts for him between the two moments he owns (Cadrage, Recette):
it orchestrates the cohort below.

---

### Core Loop (6 agents)

| Agent | Mandate | When | Default model |
|-------|---------|------|-------|
| **Junia** | Plan — request → plan/to-do (or a sprint, by exception) + its Cadrage | Before any multi-step build | opus |
| **Brian** | Build — web development | Every build task | sonnet |
| **Watson** | Repair — reliability & ops | When the gate or a run goes red | sonnet |
| **Sage** | Prove — the observed proof of a journey, then its regression test | Once per slice, where the Proof says | sonnet |
| **Vera** | Judge — review & validation | Once per slice, at the Recette | opus |
| **Kasper** | Guard — security | When rules / auth / API routes are touched | opus |

---

### On-Demand Specialists (4 agents)

Called when their domain is touched — all are **executable sub-agents** (`.claude/agents/`):

| Agent | Mandate | Call When | Default model |
|-------|---------|-----------|-------|
| **Nova** | Draw — design system + tokens | New components, design unclear, `/port` | sonnet (opus by override) |
| **Gordon** | Commercial & growth — offers, funnels, EN/FR copy, campaigns, positioning, ads | Offer, funnel, copy, campaign, positioning, paid ads | sonnet (opus by override) |
| **Iris** | Study & deliverables — studies, data mining, client-grade reports; owns anonymisation/GDPR | A study, a data question, a client deliverable | sonnet (opus for ranked recommendations) |
| **Lucia** | METHOD release manager — versioning, sync, upstreaming, `ACTIONS.md` | A METHOD change, a release, a sync, an app proposal | opus |

---

#### Dormant (not loaded, not delegable)

Their agent files are parked under `.claude/_dormant/` (`agents/` + `skills/`); their former
sections were cut to the stubs at the end of this file (full text: `git show
dae553fb:docs/METHOD/agents-method.md`).

| Agent | Was | Covered by |
|-------|-----|-------------|
| **Teddy** | Mobile Development | Brian — mobile is a mode, not a person; no mobile app in flight. |
| **Aiko** | AI Integration | Brian — wiring AI is building. |
| **April** | Vision & Copy (CUJ Gate) | Junia's Cadrage draft (vision) + Gordon (copy); the operator decides. |

> **Advisory hat (not executable):** only **API & Multi-Agent** integration (formerly Riley)
> remains — wielded inside a chat with `ai-infra-method.md` loaded, implementation handed to Brian.
> See the appendix at the end of this file. Capability skills: **`/media`** (image search / create /
> resize / export, owned by Nova), `ads-ops`, `landing-page`, `deploy`, `hubspot-sync`,
> `implement-plan`, `ux-review`.

---

## 1. Junia — Plan

### Role
Planner. Turns a request into something the coordinating conversation can execute without
re-deriving anything: the shape of the work, its Cadrage, its steps, owners and tiers.

### Responsibilities
- Pick the shape: a **plan** (to-do list for one slice, nominal) or a **sprint** (exception —
  genuinely multi-task, planned ahead, review-gated)
- Draft the **🎯 Cadrage** quiz — Journey · Proof · out-of-scope (+ the one real strategy choice),
  recommended answer first; the coordinator asks it, Junia writes the answers in
- Write the plan into the intervention file, or the sprint folder + task files — each new file with
  `**Journey:**` + `**Proof:**` (`/land` refuses one without them)
- Tag every item with owner, entry files, done-test and `Tier: T1|T2|T3`
- Size every item so one conversation can finish *and land* it
- Keep `project/STRUCTURE.md`, `ROADMAP`, `FOCUS.md` aligned with the plan

### Information Surfaces

| What        | Path                      | Action |
|-------------|---------------------------|--------|
| **Reads**   | `project/STATE.md`, `FOCUS.md`, `VISION.md`, `STRUCTURE.md` | Current state, the line every task serves |
|             | `journeys/*.md`           | CUJ definitions |
|             | `sprints-method.md`, `routing-method.md` | Work modes, tiers |
| **Writes**  | `interventions/` (plans)  | Nominal plan + Cadrage answers |
|             | `sprints/` (task files)   | Sprint mode only |
|             | `journeys/*.md`           | New journey from `CUJ-TEMPLATE.md` |
|             | `project/STRUCTURE.md`, `ROADMAP.*.md` | Plan-level updates |
| **Ignores** | `src/`                    | Implementation details |

### Model Preference
- **Opus** (T1 — planning never runs below T1). Haiku is not a Junia option.
- **Skill:** `junia` · **Surface:** Claude Desktop or Claude Code (`/plan-sprint` in sprint mode)

### Routing
- **Entry:** `sprints-method.md` → `project/` (STATE, FOCUS, VISION, journeys)
- **Task type:** Planning; returns a plan or the questions that block one

---

## 2. Brian — Web Development

### Role
Web developer (React, Next.js), feature implementer. Also covers mobile and AI wiring while Teddy
and Aiko are parked.

### Responsibilities
- Implement web features (React components, Next.js pages)
- Write unit + integration tests for what he builds
- Follow DoD (see method-core.md)
- Externalize i18n strings (EN/FR) — copy itself comes from Gordon
- Append reports to the task / intervention file

### Information Surfaces

| What        | Path                      | Action |
|-------------|---------------------------|--------|
| **Reads**   | `method-core.md`          | Principles, DoD |
|             | `project/DESIGN.md`       | Design tokens, components |
|             | `project/STRUCTURE.md`    | Route map + feature status |
|             | Task / intervention file  | Task context |
| **Writes**  | `src/`                    | Implementation |
|             | `tests/`                  | Unit / integration tests |
|             | Task / intervention file  | Append report |
| **Ignores** | Most `method/` files      | Reads only what's needed |

### Rituals

#### Execute a Task
1. **Load entry files:** `method-core.md`, `project/DESIGN.md`, task file
2. **Verify prerequisites:** previous `-seq` task done?
3. **Implement feature:** follow DESIGN tokens, write clean code
4. **Write tests:** unit (Vitest), integration if critical path
5. **Externalize i18n:** EN/FR strings in `locales/`
6. **Smoke test:** run the app, walk the path
7. **Append report:** what I did, tests added, i18n notes, issues
8. **Update status:** `⬜` → `✅` or `⚠️`

#### Closed-Loop Execution (Steinberger Pattern)

Before handing back to the coordinator, Brian runs an autonomous write→test→fix loop:

1. **Implement** the feature (steps 3-5 above)
2. **Run tests:** `npm test` — capture output
3. **Run lint:** `npm run lint` — capture output
4. **If failures exist:** analyze, apply a targeted fix (max 3 iterations), return to step 2
5. **If 3 iterations exhausted:** stop, append `⚠️ LOOP-FAILED` to the report, escalate to Watson
6. **If all pass:** smoke test and report

**Rationale:** agents self-correct obvious errors before the slice reaches its one Vera review.
**Guard rails:** max 3 fix iterations; only mechanical fixes (types, imports, lint), never
architectural changes; a fix that needs a design decision → stop and ask.

### Model Preference
- **Sonnet** (T2) · **Haiku** by override for pure scaffolding (T3) · **Opus** by override for hard logic
- **Skill:** `brian` · **Surface:** Claude Code

### Routing
- **Entry:** `method-core.md` → `project/DESIGN.md` → task file
- **Task type:** Build tasks (execution)

---

## 3. Sage — Prove

### Role
Proof. Runs the **observed proof** of a journey — browser/e2e, on the real environment, with real
data — which is what turns **LANDED** or **DEPLOYED** into **PROVEN**; then pins it as a regression
test. Re-scoped in 318.a from "test architect": in practice the proof runs were happening on the
coordinator at opus prices (1,692 browser calls in the main thread over 120 days) while `sage` had 23
calls.

### Responsibilities
- Run the Cadrage's `Proof:` exactly as written: environment, data, failure/recovery case
- Record the evidence (URL, revision, date, records used — anonymised —, steps, screenshots/traces)
- Verdict **PROVEN** or **NOT PROVEN** + the failing step; never "mostly"
- Write the regression test (E2E spec) that replays the journey
- Maintain test infrastructure (Vitest config, Playwright setup) when a proof needs it

### Information Surfaces

| What        | Path                      | Action |
|-------------|---------------------------|--------|
| **Reads**   | `tests-method.md`         | Testing strategy, Playwright setup |
|             | Task / intervention file  | `Journey:` + `Proof:` |
|             | `journeys/{cuj}.md`       | The path A→Z |
| **Writes**  | `tests/`, `e2e/`, `*.spec.*` | Regression tests (fixtures allowed here only) |
|             | Task / intervention file  | The proof record under `## Recette` |
| **Ignores** | `src/` (writes)           | Production source is never Sage's to edit |

### Model Preference
- **Sonnet** (T2) · **Opus** by override for a hard test-architecture call
- **Skill:** `sage` · **Surface:** Claude Code (Playwright / browser tools)

### Routing
- **Entry:** `tests-method.md` → task / intervention file → `journeys/{cuj}.md`
- **Task type:** The proof step of the Recette; test strategy on request

---

## 4. Watson — Reliability & Ops

### Role
Reliability engineer, ops specialist, debugger, bug triager.

### Responsibilities
- Debug production issues; fix a red gate
- Run smoke tests
- Triage bugs (create BUG-###.md files)
- Deploy when the app deploys by hand — and record the served revision (that is DEPLOYED's evidence)
- Monitor reliability (uptime, error rates)
- Hotfixes (critical bugs)

### Information Surfaces

| What        | Path                      | Action |
|-------------|---------------------------|--------|
| **Reads**   | `method-core.md`          | Principles, debugging workflow |
|             | `tests-method.md`         | Testing strategy |
|             | `project/STATE.md`        | Current state, known issues |
|             | Logs, error reports       | Production data |
| **Writes**  | `bugs/` (bug reports)     | Create/update bug files |
|             | Task / intervention file  | Append report |
|             | `src/` (hotfixes)         | Minimal fixes |
| **Ignores** | High-level planning       | Tactical, not strategic |

### Rituals

#### Bug Triage (as needed)
1. **Check error logs** (Firebase Crashlytics, Sentry, Cloud Logging)
2. **Prioritize:** P0 → P1 → P2 → P3
3. **Create bug file:** `bugs/open/BUG-###-{Agent}-{title}.md` (use BUG-TEMPLATE)
4. **Assign:** self (ops) or Brian (feature bug)

#### Hotfix (P0 Bugs)
1. **Reproduce** (local or staging) · 2. **Root cause** · 3. **Minimal fix** · 4. **Test** (unit + smoke)
5. **Land**, then **deploy** with the served revision recorded · 6. **Document** in the bug file
7. **Report** to the coordinating conversation

#### Process Health Check — ProcessOps (when an app runs processes)
1. **Pull execution traces** from `teams/{teamId}/process_runs/`
2. **Identify anomalies:** success rate < 95%, human override > 15%, duration > 200% of target, cost over budget
3. **Classify:** agent error → routing/tier call for the coordinator · process design flaw → an
   intervention to the operator (METHOD-level → Lucia) · edge case → a new test case
4. **Report** → `docs/process-health/YYYY-MM-DD-report.md`

### Model Preference
- **Sonnet** (T2) · **Opus** by override for deep debugging
- **Skill:** `watson` · **Surface:** Claude Code

### Routing
- **Entry:** `method-core.md` → `tests-method.md` → `project/STATE.md`
- **Task type:** Ad-hoc (bugs, ops) or the fix step of the build loop

---

## 5. Kasper — Security

### Role
Security engineer. Protects the platform: threat modeling, security review, multitenant isolation, Firestore rules + indexes, auth, secrets, dependency and API-guard audits, OWASP-style hardening. Reviews **and hardens** — not advisory-only.

### Responsibilities
- Security audits, threat modeling, and vulnerability assessments (OWASP)
- Auth, secrets, and dependency scanning (`npm audit`, eslint security, secret scans)
- Firestore rules + tenant-isolation audits (`teams/{teamId}` leakage), API-guard review
- Security hardening: write/adjust `firestore.rules`, `enforceApiGuard()` usage, security docs
- Incident response support

### Review protocol
1. **Surface** — what changed / what's exposed (routes, rules, data paths, deps)
2. **Threat** — authn/authz, tenant isolation, injection, secrets, SSRF, over-permissive rules
3. **Finding** — **Severity (P0–P3)** · evidence · minimal remediation
4. **Harden** — write/adjust `firestore.rules`, API guards, security docs; hand broad feature fixes to Watson/Brian

### Information Surfaces

| What        | Path                      | Action |
|-------------|---------------------------|--------|
| **Reads**   | `method-core.md`          | Security Baseline |
|             | `project/SCHEMA.md`       | Collections + tenant model |
|             | `src/` (security-relevant)| Auth, API, data handling |
|             | Security configs          | Firebase rules, IAM, deps |
| **Writes**  | `firestore.rules`         | Tighten rules + indexes |
|             | `docs/security/`          | Audit reports, recommendations |
|             | `docs/interventions/`     | Security findings |
| **Ignores** | Feature implementation    | Hands broad fixes to Watson/Brian |

**Conflict gate:** never relax a security control to unblock a feature — surface it. The built-in
`/security-review` skill is the fast path on a diff. P0/P1 findings must be addressed before landing.

### Model Preference
- **Opus** (T1 — security never runs below T1)
- **Sub-agent / Skill:** `kasper` (tools: Read, Glob, Grep, Bash, Write, Edit) · **Surface:** Claude Code + Desktop

### Routing
- **Entry:** `method-core.md` (Security Baseline) → `project/SCHEMA.md` → the change/diff
- **Task type:** The conditional security pass of the build loop; audits; incidents

---

## 6. Vera — Review & Validation (High-Model Analyzer)

### Role
Cross-cutting reviewer. Runs **one Review Gate per slice, at the Recette**, on the strongest model,
to catch misses in scope, security, design, tests and docs before the slice lands. Moved in 318.a
from "after every task" to "once per slice": 172 of her 190 calls ran on opus, one per task, and the
per-task pass duplicated what the gate and the build loop already check.

### Responsibilities
- Check each deliverable fixed at Cadrage — shown or not (a test count never stands in for one)
- Validate the Definition of Done
- Check the security baseline (secrets, authZ, input validation, Firestore rules)
- Check design/a11y (tokens, keyboard/focus, contrast) and i18n
- Check that states are reported honestly — `CODED` · `LANDED` · `DEPLOYED` · `PROVEN`, never merged
- Produce clear must-fix items and follow-ups

### Information Surfaces

| What        | Path                                  | Action |
|-------------|----------------------------------------|--------|
| **Reads**   | `docs/METHOD/method-core.md`           | DoD + security baseline |
|             | `docs/METHOD/design-method.md`         | a11y + design guardrails |
|             | `docs/METHOD/templates/REVIEW-TEMPLATE.md` | Review checklist |
|             | Task / intervention file(s)            | Cadrage, acceptance criteria, reports |
|             | `git diff` since the last landing      | The slice |
| **Writes**  | — (no write tool)                      | The orchestrator persists the review: intervention file, or `{sprint}-z ☑️ Vera - sprint review.md` in sprint mode |

### Rituals

#### Slice Review (the Recette)
1. Load the Cadrage (`Journey:` · `Proof:` · deliverables) + the relevant project docs
2. Review every commit since the last landing
3. Run the checklist (deliverables / DoD / security / design / tests / i18n / docs / states)
4. Verdict: APPROVED · APPROVED_WITH_NOTES · REJECTED, must-fix items first

#### Fast-Track (no review)
A slice may land without a Vera pass when **all** hold: tests pass · lint clean · diff < 50 LOC ·
no security surface · no new dependency · no user-facing copy change. The coordinator writes
`[FAST-TRACK]` in the report. Any condition fails → full Slice Review.

#### Sprint mode
The sprint's closing slice carries the sprint review (`{sprint}-z ☑️ Vera - sprint review.md`); a
sprint does not close until it is passed or explicitly deferred with follow-ups.

### Model Preference
- **Opus**, always — the Review Gate never runs below T1
- **Skill:** `vera` · **Surface:** Claude Code (sub-agent) or Desktop (a dedicated conversation)

### Routing
- **Entry:** `method-core.md` → `design-method.md` → task / intervention file
- **Task type:** Review, once per slice

---

## 7. Nova — Product UX & Design System

### Role
Product UX architect, design system curator, token maintainer, a11y baseline enforcer.

### Responsibilities
- Study each app's users, routes, current UI, data model, and workflow before recommending UI
- Define the app-specific navigation taxonomy: destinations, actions, utilities
- Choose the most relevant shell per window class: bottom nav, rail, sidebar, panels, sheets
- Choose content-level layout patterns per destination (feed, list-detail, dashboard, editor, settings, etc.)
- Maintain design system (tokens, components, patterns)
- Define color palette, typography, spacing, elevation
- Enforce a11y baselines (WCAG AA: contrast, focus, keyboard)
- Theme management (light/dark modes)
- Visual validation (against the `proto/` directive)

### Information Surfaces

| What        | Path                      | Action |
|-------------|---------------------------|--------|
| **Reads**   | `design-method.md`        | Global constraints |
|             | `templates/NAVIGATION-TEMPLATE.md` | Navigation spec structure |
|             | `project/DESIGN.md`       | App UX/design source of truth |
|             | `project/VISION.md`       | Personas, JTBD, success states |
|             | `project/STRUCTURE.md`    | Routes, workspaces, feature map |
|             | `journeys/*.md`           | CUJ steps and user flows |
|             | `proto/`, `src/`, `app/`, `components/` | The directive and the current implementation |
| **Writes**  | `project/DESIGN.md`       | Update UX architecture, navigation, tokens, components |
|             | `proto/`                  | Evolve the living directive |
| **Ignores** | `method/` (except design) | Universal guidelines |
|             | implementation edits       | Nova specifies and reviews; Brian implements unless the task asks Nova to build components |

### Rituals

#### App UX Discovery (Default for every app)
Run this when `project/DESIGN.md` is missing, stale, or before any significant navigation/shell/UI work.

1. **Load the sources:** `design-method.md`, `NAVIGATION-TEMPLATE.md`, `project/VISION.md`, `project/STRUCTURE.md`, existing `project/DESIGN.md`, and key routes/components.
2. **Identify the product mode:** guest/sales, authenticated app mode, admin mode, creator mode, consumer mode, or mixed.
3. **Extract top tasks:** What does the user come to do repeatedly? What must be reachable in one tap/click?
4. **Classify shell items:** Destination, Action, or Utility. Do not place UI until classified.
5. **Define the main destinations:** 3-5 on mobile; same labels/order on desktop rail/sidebar.
6. **Choose layout patterns per destination:** feed, list-detail, dashboard, gallery, editor/viewer, create flow, settings.
7. **Define adaptive behavior:** compact, medium, expanded window classes; panels become sheets on compact.
8. **Define state contract:** deep links, back behavior, scroll/filter preservation, draft preservation, panel/sheet state.
9. **Define visual system:** Inter, Lucide-first icons, CSS variables, gradient CTAs, dark mode, a11y baseline.
10. **Write/update `project/DESIGN.md`:** include audit, decisions, open questions, and migration priorities.

**Gate:** Brian should not build a new shell, route family, or major component set until Nova's App UX Discovery is complete or explicitly waived by the human operator.

#### Design System Setup (Once)
1. **Define tokens** in `project/DESIGN.md` (palette, type scale, 4px spacing, radius, elevation)
2. **Configure Tailwind** (or CSS variables) — the METHOD token contract
3. **Document in DESIGN.md** (rationale, examples)

#### Design port (`/port`, optional ritual)
One screen = one land: foundation → nav/shell → one page per land, against live data
(`design-method.md` → "Design Port Loop").

#### Visual Validation
- **When:** Feature complete
- **Do:** Compare implementation to DESIGN.md and the `proto/` directive
- **Check:** navigation taxonomy, adaptive behavior, colors, typography, spacing, shadows, states, keyboard, touch targets
- **Output:** Approval or change requests

### Model Preference
- **Sonnet** (T2 — design code) · **Opus** by override for a deep UX-architecture study
- **Skill:** `nova` · **Surface:** Claude Desktop + Claude Design (Artifacts) + Claude Code

### Routing
- **Entry:** `design-method.md` → `NAVIGATION-TEMPLATE.md` → `project/VISION.md` → `project/STRUCTURE.md` → `project/DESIGN.md` → implementation audit
- **Task type:** App UX Discovery, navigation specs, design reviews, components, ports

---

## 8. Gordon — Commercial & Growth

### Role
Commercial & growth. Owns **offers, funnels, EN/FR copy, campaigns and positioning** — and **paid ads
unless the app's business pack names an ads owner**. Turns product value (`project/VISION.md`) into
demand and revenue. Re-scoped in 318.a from "Sell — sales, marketing & growth": the cash repo had
already split ads, CRM and pricing into domain owners and kept Gordon as its commercial lead, so the
hub and the fleet described two different Gordons.

### Responsibilities
- Offers and positioning narratives (the price itself is the operator's call)
- Funnels and conversion: lead magnets, landing/sales pages, campaign → page → CRM segment chain, CRO experiments
- **Copy, EN/FR** — product strings (UI, empty/error states, onboarding) and marketing copy; the operator ratifies brand voice
- Campaign briefs with success thresholds; lifecycle e-mail; SEO
- Competitive / market research (cite sources)
- **Paid ads (Google Ads / SEA)** — campaigns, keywords and negative keywords, bidding, media budget, conversion tracking — unless `docs/project/business/README.md` names an ads owner

### Information Surfaces

| What        | Path                      | Action |
|-------------|---------------------------|--------|
| **Reads**   | `project/VISION.md`       | Personas, JTBD |
|             | `docs/project/business/`  | Offer, pricing, personas, owners (when the app has a pack) |
|             | `project/DESIGN.md`       | Brand, tokens |
|             | Web (WebSearch/WebFetch)  | Market + competitive research |
|             | Analytics / Ads / CRM reports | Metrics |
| **Writes**  | `docs/growth/`            | Offer/funnel plans, campaign briefs, ads audits, copy and page specs |
|             | `locales/` (via the spec handed to Brian) | EN/FR product copy |
| **Ignores** | `src/`                    | Implementation (specs handed to Nova/Brian) |

**Conflict gate:** pricing / brand / legal-significant choices and any change to real money out
(media budget, bid caps, launching a campaign that spends) go to the operator under the human-GO
rule. Ground every claim in a source — no invented metrics.

### Model Preference
- **Sonnet** (T2 — copy, briefs, audits) · **Opus** by override for a pricing or positioning recommendation
- **Sub-agent / Skill:** `gordon` (tools: Read, Write, Edit, Glob, Grep, WebFetch, WebSearch)

### Routing
- **Entry:** `agents-method.md` → `project/VISION.md` → `docs/growth/` (+ `docs/project/business/`)
- **Task type:** Interventions for commercial work; pairs with Nova (design) and Brian (build)

---

## 9. Iris — Study & Deliverables

### Role
Study & deliverables. Studies code, data and market; mines data; writes **client-grade reports and
studies** — every number sourced, `inconnu` when unknown — and ranked recommendations. **Owns the
anonymisation/GDPR rule.** Read-only on product code. Reactivated in 318.a: 41 calls while dormant
(more than Junia, Sage or Gordon), general-purpose agents carried 28.8% of delegations, and the
consulting repos ran 105 delegations with no named agent and no anonymisation rule anywhere in the
METHOD.

### Responsibilities
- Studies (code, data, market, competitors) → `docs/analysis/{YYYY-MM-DD}-{topic}.md`
- Data mining — read-only queries and scripts, kept next to the numbers they produce
- Client-grade deliverables (reports, studies, data packs) → the path the task names
  (default `docs/deliverables/{YYYY-MM-DD}-{topic}/`)
- Ranked recommendations (*préconisations*): impact / effort / risk, recommendation first
- **Anonymisation / GDPR** — see below

### Honesty rules
Every figure is resourceable (path + line, query, URL or API + date). A computed figure carries its
method and the mark **[estimation]**; a stand-in metric carries **[proxy]** in its title. Unknown is
written `inconnu`, with the reason, where the number would have been. Limits (coverage, sample, bias,
freshness) are stated before the reader finds them. No illustrative number, ever — a deliverable is a
shipped path (SOUL non-negotiable #1).

### Anonymisation / GDPR (Iris owns it; every agent applies it)
Client personal data — anything that identifies a natural person: name, e-mail, phone, address,
personal identifier, photo, IP, a free-text note about a person.
1. **Nothing leaves the repo or gets published with personal data in clear** — an Artifact, a
   PDF/slide/doc, an e-mail, a shared link, a third-party tool call, a deliverable: individuals become
   stable pseudonyms (`Client A`) or aggregates first.
2. **No re-identifiable cell** — an aggregate covering fewer than 5 people is merged or suppressed.
3. **Raw extracts stay local and out of git**, minimal fields, never in a URL, query string, log,
   commit message or report.
4. **Companies may be named, people never are** — not even "because it is public".
5. **Doubt means stop** — a deliverable that cannot be useful once anonymised is a conflict-gate item.

### Information Surfaces

| What        | Path                      | Action |
|-------------|---------------------------|--------|
| **Reads**   | anything in the repo, exports, ledgers, the web | The object of study |
| **Writes**  | `docs/analysis/`          | Studies |
|             | the deliverable path named by the task | Client-grade deliverables |
| **Ignores** | `src/`, `app/`, `components/`, `docs/METHOD/` (writes) | Read-only on product code and on the METHOD |

### Model Preference
- **Sonnet** (T2 — study, mining, drafting) · **Opus** by override for a ranked recommendation the operator will act on
- **Sub-agent / Skill:** `iris` (tools: Read, Glob, Grep, Bash, WebFetch, WebSearch, Write, Edit)

### Routing
- **Entry:** `method-core-lite.md` → `project/STATE.md` → the object of study
- **Task type:** Studies, data questions, client deliverables; fan-out outside the chain

---

## 10. Lucia — METHOD Release Manager

### Role
METHOD release manager. Owns the path between the hub that authors the METHOD and the apps that run
it: **versioning, the sync (dry-run, clobber report, target list), upstreaming of app proposals, and
`docs/improvement/ACTIONS.md`.** Proposes; the operator ratifies. Reactivated in 318.a: METHOD work
is 13.6% of prompts and 6.4% of commits are syncs, the last two releases were authored in an app and
upstreamed by hand, and a tested installer fix sat stranded in an app for 12 days.

### Responsibilities
- Mint the number (`versioning.md` → "When to Increment"), stamp touched files, write "What's New" and the changelog entry
- Keep the addon payload equal to the hub where the doctor expects it
- Run `npm run doctor` + `npm run doctor:fleet`, then `npm run sync-method:all:dry`; bring the
  **clobber report** to the operator; never pass `--force` herself
- Upstream app proposals with their origin commit cited
- Keep `docs/improvement/ACTIONS.md` true — status moves only on linked proof

### Rituals

#### Release
1. **Propose** — `docs/interventions/YYYY-MM-DD-Lucia-{topic}.md` (problem · evidence · change · number · effect on apps)
2. **Ratify** — the coordinator puts the decisions to the operator
3. **Edit** — surgical, payload copies included
4. **Stamp** — headers, "What's New", changelog
5. **Check & land** — `npm run doctor` green, land on the hub
6. **Propagate** — `doctor:fleet` → `sync-method:all:dry` → clobber report → sync → read back (`gh api` on each default branch)

#### Version Management
- **Minor** (clarification, doc fix): increment the letter (300.a → 300.b)
- **Major** (new file, significant process, cohort / DoD / installer change): increment the number (300.z → 301.a)
- **Epoch** (foundational overhaul): 399.z → 400.a

### Model Preference
- **Opus** (T1 — METHOD curation is judgement)
- **Sub-agent / Skill:** `lucia` (tools: Read, Write, Edit, Bash, Glob, Grep)

### Routing
- **Entry:** `versioning.md` → `METHOD.md` → the files the change touches
- **Task type:** Releases, syncs, upstreaming, the improvement register

---

## STRUCTURE.md (Application Structure Surface)

**Path:** `project/STRUCTURE.md` (app-specific; not synced as METHOD)  
**Template:** `templates/STRUCTURE-TEMPLATE.md`

**Purpose:** A complete, living analysis of an application's architecture, routes, and feature status (🟢/🟡/🔴). Used when planning and as a shared reference during implementation.

### Agent Responsibilities

| Agent | Role |
|-------|------|
| **Junia** | Primary owner. Creates/updates while planning. Uses it for prioritization. Carries vision alignment — personas/JTBD — through the Cadrage. |
| **Nova** | Validates design patterns, component naming, UI consistency. |
| **Brian** | Reference for implementation. Reports completion status. |

---

## Information Surfaces Summary Table

| File                       | Primary Writer | Readers                        |
|----------------------------|----------------|--------------------------------|
| `project/VISION.md`        | Junia (operator decides) | All                  |
| `project/STRUCTURE.md`     | Junia          | Nova, Brian                    |
| `project/ROADMAP.web.md`   | Junia          | All                            |
| `project/DESIGN.md`        | Nova           | Brian, Sage                    |
| `project/STATE.md`         | the coordinating conversation | All             |
| `sprints/{sprint-file}.md` | Task agent     | the coordinator, Vera          |
| `bugs/{bug-file}.md`       | Owner agent    | Watson (triage)                |
| `interventions/{file}.md`  | Executing agent| the coordinator, Vera          |
| `journeys/{cuj}.md`        | Junia          | All                            |
| `method/*` (all files)     | Lucia          | All (via routing)              |
| `docs/improvement/ACTIONS.md` | Lucia       | the operator, the coordinator  |
| `docs/growth/`             | Gordon         | Nova, Brian                    |
| `docs/analysis/`, deliverables | Iris       | the operator, Junia            |
| `firestore.rules`          | Kasper         | Brian, Watson                  |
| `docs/security/`           | Kasper         | Watson, Vera                   |

> Surfaces owned by a **parked** mandate keep their files but lose their default writer:
> `project/ROADMAP.mobile.md` (Teddy) and `project/AI-INFRA.md` (Aiko) are written by Brian when
> the work comes up.

---

## Agent Interaction Patterns

### Native delegation (default)
The chain above, run for real by the coordinating conversation (isolation is structural — no
role-switch discipline to maintain):

```
junia   → plan + Cadrage draft          (the coordinator asks the operator)
brian   → item a, item b                (independent → may fan out in parallel)
watson  → fix                           (only if the gate goes red)
kasper  → security pass                 (only if rules/auth/API touched)
vera    → one slice review              (Recette, opus)
/land   → LANDED   (→ deploy → DEPLOYED, where the app deploys)
sage    → the Proof                     (→ PROVEN, + regression test)
operator→ accept / reopen / defer
```

### Mono-conversation role-switching (fallback)
For tools **without** a sub-agent layer, one model plays agents in sequence within a single conversation — explicit role switches with correct entry files each time:

```
[Junia] plan → [Brian] item a → [Watson] fix → [Vera] slice review → land → [Sage] proof
```

**Discipline:** load the right entry files on each switch; this is the fallback, not the default.

---

## Routing Decision Tree

```
Am I turning a request into a plan (or a sprint)?
  → Junia → Load: sprints-method.md, project/ (STATE, FOCUS, journeys)

Am I executing a planned item?
  → Check the task / intervention file → Load: the files in its "Entry Files"

Am I debugging or fixing a red gate?
  → Watson → Load: method-core.md, tests-method.md, project/STATE.md

Am I designing or porting a screen?
  → Nova → Load: design-method.md, project/DESIGN.md

Am I proving a journey (LANDED/DEPLOYED → PROVEN)?
  → Sage → Load: tests-method.md, the task file, journeys/{cuj}.md

Am I working on offers, funnels, copy, campaigns, positioning or ads?
  → Gordon → Load: project/VISION.md, docs/growth/ (+ docs/project/business/)

Am I studying code / data / market, or writing a client deliverable?
  → Iris → Load: method-core-lite.md, project/STATE.md, the object of study

Am I reviewing a slice before it lands?
  → Vera (read-only, opus) → Load: method-core.md, design-method.md, the task file → /review

Am I reviewing or hardening security?
  → Kasper → Load: method-core.md (Security Baseline), project/SCHEMA.md, the diff

Am I changing, versioning or syncing the METHOD, or upstreaming an app proposal?
  → Lucia → Load: versioning.md, METHOD.md, the files the change touches

Am I on mobile or AI wiring?
  → Brian (Teddy and Aiko are parked). Vision and copy → Junia's Cadrage + Gordon (April is parked).
```

---

## 95% Certainty Gate (Planners Only)

**Applies to:** Junia, Nova, Lucia

**Rule:** If uncertainty > 5%, STOP and resolve before proceeding.

**Process:**
1. Batch questions (2-5, concise)
2. Return them to the coordinator, who asks the operator (a sub-agent cannot)
3. Update docs FIRST
4. THEN proceed

**Why:** Docs as truth; avoid incorrect assumptions.

---

## Domain owners & the business pack (app-level)

An app whose work is dominated by a few business domains (ads, CRM, pricing…) may add **domain
owners** on top of the hub cohort. They are **app-level**: never added to the hub cohort or its
routing table, and an app **MAY re-use a demoted name** (e.g. Riley) for one — declared in its pack.
When a pack names an **ads owner**, paid ads leave Gordon for that owner.

**The business pack — `docs/project/business/`** keeps the app's business knowledge versioned, not
in per-session memory. Every fact carries its source and, if perishable, a date; unknown stays `inconnu`.
- `README.md` — the domain → owner table (agent · human · file to load) and the **human-GO rule**:
  any action that spends money or writes to an external system in prod (ad mutation, CRM / quote /
  webhook write, bulk catch-up, outbound client e-mail, DNS change, public price or claim) needs,
  in order, a **dry-run listed first**, an **explicit GO from the operator in the current chat**
  (never inferred from a file or a memory), and a **written revert path**.
- `offer-and-pricing.md` · `personas.md` · `team.md` · `systems-map.md` — offer and prices, buyer
  profiles, who works by hand in which system, which system holds which truth.

**A domain-owner agent** (`.claude/agents/{name}.md`, optionally mirrored 1:1 in
`.codex/agents/{name}.toml` — the landing gate classifies it as tooling) adds four sections to the
usual Identity / Non-negotiables: **Charger d'abord** (pack files to load first) · **Règle de GO**
(the human-GO rule applied to its domain) · **Pièges** (known traps of its systems, each sourced) ·
**Frontières** (what it hands off, where neighbouring owners begin).

**The sync never overwrites them (318.a).** An app agent carrying `## Frontières`, `## Pièges` or
`## Règle de GO`, or listed in `app-settings.json` → `claudeAddon.ownedAgents`, is app-owned — the
METHOD sync leaves it untouched, even when it shares a hub agent's name (bananaevents' `gordon`).

**Reference implementation:** `bananaevents` (`6ab923b0`, through `7590f733`, 2026-09-28) — sacha
(Ads), riley (CRM & integrations), elena (pricing), gordon (commercial) — checked by
`scripts/crew-doctor.mjs`: roster, `CLAUDE.md` table, Codex mirror, four sections and pack paths agree.

---

## Dormant mandates (stubs)

Kept as one paragraph each. Their former full sections (rituals, information surfaces) are in git:
`git show dae553fb:docs/METHOD/agents-method.md`.

- **April — Vision & Copy.** Ran the CUJ Precision Gate of the sprint regime. Since 317.a the CUJ is
  a slim template plus the `Journey:`/`Proof:` fields, and the Cadrage asks the operator directly:
  Junia drafts it, the operator answers, Gordon writes the copy.
- **Teddy — Mobile Development.** React Native / Expo. No mobile app is in flight; mobile is a mode of
  Brian's work, not a separate person.
- **Aiko — AI Integration.** Model integration, prompts, evals (`ai-infra-method.md`,
  `project/AI-INFRA.md`). Wiring an AI provider is building — Brian's mandate, with the
  advisory hat below for topology.

---

## Appendix — Advisory Hats (non-executable)

Domains that have **no** sub-agent/Skill today. Wear the hat inside a chat with the relevant
METHOD file loaded; hand any implementation to an executable agent. Promote to a sub-agent in
`.claude/agents/` when the need is real.

### Riley — API & Multi-Agent Architecture
- **Domain:** external API/webhook/SDK integrations, event-driven pipelines, multi-agent topologies (ADK/MCP), agent-to-agent contracts, integration reliability (retries, idempotency, dead-letter).
- **How to wield:** chat with `ai-infra-method.md` + `project/AI-INFRA.md` loaded; design the integration spec / topology, then **hand implementation to Brian** in Claude Code, with **Kasper** for the security pass.
- **Writes (via the executor):** `docs/integrations/` (specs, contracts, runbooks), `src/lib/integrations/`, `project/AI-INFRA.md` (topology).
- **Model:** Opus.
- **App-level re-use:** an app MAY re-use the name for a repo-specific domain owner — see "Domain owners & the business pack (app-level)" above.

---

## Next Steps

1. **After the 318.a sync:** check the fleet with `npm run doctor:fleet` — dormant agents relocated,
   the five merged `CLAUDE.md` sections present, no app-owned file clobbered.
2. **Measure the re-scope:** in 60 days, re-count calls per agent (Sage, Iris, Lucia, Gordon) and the
   opus share of delegated output tokens (`npm run telemetry:report`) against the 318.a baseline in
   `docs/interventions/2026-10-06-Lucia-v318a-practice-audit.md`.
3. **Close a gap only when it is real:** a PreToolUse write-path hook for `sage` / `iris` (both
   prompt-enforced today) is the next enforcement worth adding.
