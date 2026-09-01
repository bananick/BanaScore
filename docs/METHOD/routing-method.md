# Routing & Entry Points

**Owner:** Lucia  
**Version:** 315.a  
**Purpose:** Define multi-entry system, orchestration patterns, model routing, session telemetry, and output compression

---


## Entry Point Matrix

### By Agent

> Cohort = **8 active mandates** (`.claude/agents/*.md` canonical + Desktop Skill stubs), plus
> **5 dormant** agent files listed below the table. An agent earns a name when its mandate is one
> you would otherwise have to retype.
> **Riley** (API/automation) is a demoted advisory hat — no sub-agent, no routing row.

| Agent   | Mandate     | Sub-agent              | Entry Files                                                       |
|---------|-------------|------------------------|-------------------------------------------------------------------|
| Junia   | orchestrate | `junia`                | `agents-method.md` → `sprints-method.md` → `project/` (all)      |
| Brian   | build       | `brian`                | `method-core.md` → `project/DESIGN.md` → sprint task file         |
| Sage    | prove       | `sage`                 | `tests-method.md` → `project/ROADMAP.*.md` → sprint task file     |
| Watson  | repair      | `watson`               | `method-core.md` → `tests-method.md` → `project/STATE.md`        |
| Kasper  | guard       | `kasper`               | `code-rules.md` → `project/` → security configs                  |
| Vera    | judge       | `vera` (read-only)     | `method-core.md` → `design-method.md` → `templates/REVIEW-TEMPLATE.md` → task/sprint file |
| Nova    | draw        | `nova`                 | `design-method.md` → `project/DESIGN.md`                          |
| Gordon  | sell        | `gordon`               | `project/VISION.md` → `project/ROADMAP.*.md` → analytics          |

#### Dormant (delegable on explicit request)

Out of the routing tables and the default rotation. Agent files parked under `.claude/_dormant/`;
their entry files stand.

| Agent  | Sub-agent               | Entry Files                                                       | Why dormant |
|--------|-------------------------|-------------------------------------------------------------------|-------------|
| Teddy  | `teddy`                 | `method-core.md` → `project/DESIGN.md` → `project/mobile-*.md` → sprint task file | mobile is a mode, not a person — no mobile app in flight |
| Aiko   | `aiko`                  | `ai-infra-method.md` → `project/AI-INFRA.md` → sprint task file   | wiring AI is building — Brian's mandate |
| April  | `april`                 | `agents-method.md` → `project/VISION.md`                          | her CUJ Gate belonged to the sprint regime, now retired |
| Lucia  | `lucia`                 | ALL `method/` files                                               | METHOD curation happens in conversation |
| Iris   | `iris` (read-only on code) | `method-core-lite.md` → `project/STATE.md` → `docs/analysis/` | a generic `Agent()` already does exactly this |

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
| `/intervention` | Junia  | Open a METHOD intervention RFC (was Lucia — dormant; curation happens in conversation) | — |
| `/port`         | Nova/Brian | Port one screen from the app's living `proto/` directive to code | `brian` |
| `/relay`        | any    | Flush live working-state into `STATE.md` → `## Resume here` (dropoff) | — |
| `/land`         | any    | Commit + local verify gate + merge to `main` — **the default close** | — |
| `/ship`         | any    | Commit + push + open/update the PR — **the exception path** | — |

> 7 rituals, all in `.claude/commands/`. The orchestration chain Junia drives is defined **once**,
> in `agents-method.md` → "Orchestration chain" — reference it, never restate it here.
> A slice closes on **`/land`** (`main` is the deploy; the gate is local — there is no CI on this
> account); `/ship` is reserved for the exception list in `method-core.md` → "Landing (the default)
> & the exception list".
> Only the sprint conversation runs `/relay` — one `## Resume here` per app
> (`sprints-method.md` → "Conversation Naming").

---

## Model Routing — orchestrate high, execute cheap

> **Canonical policy (v311.a), all tools.** The coordinating agent runs on the strongest model
> available on its surface; every delegated task runs on the **cheapest model that meets the
> task's quality bar**. Cost is a routed variable, not an afterthought.

### Delegation is the default (standing order — comes before the tiers)

**Never do yourself, in the coordinating conversation, work a cheaper agent can deliver.**
Coordination stays put: the conversation reads reports, arbitrates, decides, reports to the
operator. Everything executable and delegable leaves it — building, testing, fixing, high-residue
exploration (finding where a thing lives, reading ten files to extract three lines, mapping a repo),
bulk mechanical edits. **This is the default, not an option**; doing delegable work inline is the
exception you must justify. Offloading context is a goal in itself — the coordinator's context
carries the decision, not the raw material.

| Form | When | Cost |
|---|---|---|
| **Sub-agent** (`Agent`) | **default** — a bounded task that returns a conclusion, with no round-trip through the operator | fresh context; the coordinator's stays clean |
| **Workflow** | ≥ 3 near-identical items, or work that earns an adversarial verification pass | parallel, deterministic |
| **Parallel sessions** | only on an **observed** trigger, never a predicted one: 3rd build→test→fix loop on the same task · a different repo · a deploy loop with the operator in it · two tasks writing code at once (→ one branch + worktree each) | one human click |

Nothing else justifies a second window — not size, not an estimate, not "it looks big".

### Capability tiers (tool-agnostic)

| Tier | Work | Claude | Other tools (Cursor / Codex / …) |
|---|---|---|---|
| **T1 — Judge / Orchestrator** | plan, arbitrate, review gate, security, architecture, METHOD curation | Fable / Opus | strongest reasoning model available (GPT-5.x-class, Opus-class) |
| **T2 — Builder** | implement, port, write tests, debug/ops, docs needing judgment | Sonnet | mid-tier coding model |
| **T3 — Mechanical** | scaffolding, renames, i18n extraction, bulk edits, mirror/doc sync, formatting | Haiku | cheapest competent model |

### Per-agent defaults (Claude Code — `model:` frontmatter in `.claude/agents/`)

- **T1 (opus):** `junia`, `vera`, `kasper`, `nova`, `gordon`
- **T2 (sonnet):** `brian`, `sage`, `watson`
- **T3 (haiku):** no agent *defaults* to T3 — it is a **delegation-time override** for mechanical sub-tasks
- **Dormant agents** keep their tiers if you call one explicitly: T1 `april`, `lucia`, `aiko`, `iris` · T2 `teddy`

### Delegation-time overrides (the orchestrator's job)

1. **At planning**, Junia tags each task file with its tier (`Tier: T1|T2|T3`) next to the owner.
2. **At delegation**, pass a `model` override when the task's tier differs from the sub-agent's
   default — e.g. `brian` + `model: haiku` for pure scaffolding; `sage` + `model: opus` for a
   hard test-architecture call. No override needed when tier and default already match.
3. **Escalation rule:** at most **one retry at the same tier**; a second failure escalates one
   tier. Never burn three cheap attempts — a failed T3 loop costs more than starting at T2.
4. **Quality floors:** the Vera review gate and Kasper security passes never run below T1.

### Environment awareness (know your surface before routing)

Before delegating, the coordinator **inventories its environment** and maps what is actually
available onto the tiers — never assume the Claude lineup exists everywhere:

- **Claude Code** — sub-agent `model:` frontmatter is the default; override per delegation
  (Agent-tool `model` param / Swanifly threads a `model` option through the runner).
- **Claude Desktop** — model is picked per chat: T1 for plan/review/design, T2 build, T3 cheap/fast.
- **Cursor** — list the models enabled in this workspace; map each onto T1/T2/T3 by capability
  and price; orchestrate on the best T1, delegate each task on its tier's cheapest fit.
- **Codex / other CLI agents** — same mapping over whatever models the tool exposes.
- **Single-model surface** — run inline; if the model sits below the task's tier, say so in the
  task report (don't silently under-deliver a T1 review on a T3 model).
- **Degrade gracefully:** a missing tier never blocks — take the nearest available tier,
  preferring upward (quality) over downward (cost).

---

## Session Telemetry Ledger

> **The feedback loop for Model Routing.** Tiering is a hypothesis ("T3 delegations are cheaper
> and still good enough") — this ledger is how you check it against real usage instead of vibes.

### What it captures (Claude Code, on by default since v312.a)

A **Stop hook** (`.claude/hooks/session-telemetry.mjs`) appends one JSON row per invocation to
`docs/project/telemetry/sessions.jsonl` in the current repo:

- **Tokens** — input / output / cache-creation / cache-read, split into `mainLoop` (the top-level
  conversation) and `subAgents` (every delegated sub-agent and Workflow-tool agent spawned during
  the session), plus a combined `totals`. Deduped per API response (`message.id`) so a single
  streamed reply split across several transcript lines is never double-counted.
- **Models, per scope** — `mainLoop.models` and `subAgents.models`, plus a global `models` union
  kept for existing readers. **Read the per-scope arrays, not the union:** a global
  `["opus","sonnet"]` is identical whether opus coordinated and sonnet executed (compliant with
  "orchestrate high, execute cheap") or the reverse (a routing violation). Only
  `mainLoop.models = ["opus"]` + `subAgents.models = ["sonnet"]` actually proves the policy held.
  Rows written before the 2026-09-01 hook fix carry the union alone and cannot be audited
  for routing.
- **Shape** — user-message count, assistant API-call count, start/end timestamps, duration,
  git branch, app (repo folder name).
- **No prompt text, ever.** The row is committed and pushed automatically, so operator wording
  must never enter it. There is no `topic` field.
- **Best-effort hint** — `sprint`, a regex match on sprint paths seen in the transcript. It accepts
  `docs/sprints/{NNN}` and `docs/project/sprints/{YYYY}/week-{N}/{NNN}` (the layout this fleet
  actually uses), skips the year/week segments, and requires a non-digit after the 3 digits so a
  year can't be captured. Can be `null`. *Before the 2026-09-01 fix it matched 3 digits after
  `docs/sprints/`, so `…/2025/…` logged sprint `"202"` — 219 of the hub's 227 rows say `"202"`.
  Those rows are wrong and stay wrong: the ledger is append-only and history is never rewritten.*
- **`outcome` / `efficiencyNote`** — always `null` from the hook. These are **manual, optional**
  fields — the closing agent or Vera can backfill them (e.g. during a Review Gate or a
  periodic audit) when there's a real verdict worth recording. Don't force every row to have one.
- **No dollar cost.** Pricing changes and varies by plan — the ledger stores exact raw token
  counts only; apply your current rate card when you actually need a $ figure.

### Mechanics worth knowing

- **Fires after every assistant turn, not just at the true end of a conversation** (Stop hooks
  don't have a cleaner signal than that in Claude Code today). Each firing re-parses the whole
  transcript and appends a **fresh cumulative snapshot** — the file is append-only, never
  rewritten in place, which is what makes it safe under concurrent sessions. **Consumers must
  dedupe by `sessionId` and keep the newest row** — don't sum every row, that double-counts.
- **Fails open.** Any error (missing file, malformed JSON, mid-write truncation) is swallowed
  silently — a telemetry bug must never block Claude from stopping.
- **Silent on success** — no `systemMessage`, to avoid noise on every single turn.
- **It commits and pushes its own row** (since 2026-08-01). Because it fires every turn, the
  ledger otherwise leaves the working tree dirty after *every* turn — including turns that touched
  no file at all. The git-check Stop hook then asks the agent to commit and push, and since a
  merged PR cannot track new work, the agent opens a **fresh PR per turn**. That is not
  hypothetical: three pull requests were merged whose entire content was hook output before this
  was added. The ledger cleans up after itself.
  - **Pathspec commit only** — `git commit -- docs/project/telemetry/sessions.jsonl`, never
    `git add -A`. Sweeping the agent's in-progress work into a telemetry commit would be far
    worse than the noise it removes; the agent's staged index is left untouched.
  - **Never on `main`/`master` or a detached HEAD**, same rule as `ship-push.sh`.
  - **Committer pinned to `noreply@anthropic.com`**, or GitHub renders the commit *Unverified*
    and the git-check hook correctly objects.
  - **Never force-pushes, never auto-rebases.** A rejected push leaves the row committed locally
    and the next turn retries — an unpushed commit is a real state worth reporting.

### Where it lives / how it ships

- **Hub-owned copy:** `.claude/hooks/session-telemetry.mjs` + wired in `.claude/settings.json`
  → `hooks.Stop`.
- **Fleet distribution:** mirrored at
  `docs/METHOD/tools/swanifly-claude-addon/payload/hooks/session-telemetry.mjs`; the installer
  (`install.mjs`) copies it into every app and merges the `Stop` hook entry into the app's own
  `.claude/settings.json` idempotently (preserves any hook the app already has, incl. its own
  custom `Stop` hooks — appends alongside, never replaces).
- **Per-repo, not centralized.** Each app accumulates its own `docs/project/telemetry/sessions.jsonl`.
  There is no fleet-wide rollup (yet) — if you want one, delegate a generic `Agent()` to walk the
  fleet and aggregate.

### Cross-tool status (Codex, Cursor)

Not wired — no automated equivalent exists today:

- **Codex CLI** exposes `/status` (session snapshot) and `/usage` (account rollups), but there's
  no established Claude-Code-style hook mechanism here to auto-capture per-session data yet.
- **Cursor** only exposes account-level usage (Dashboard → Usage, or the Enterprise "AI code
  tracking" API) — per-conversation export isn't natively available; treat as a known gap, not
  a bug, until Cursor ships it or the team builds a scraper against the Enterprise API.
- If you're working in Codex or Cursor, self-report the same fields manually in the task report
  (tokens from `/usage` or the dashboard, topic/sprint/outcome by hand) rather than leaving the
  ledger silently thinner for that tool's work.

---

## Output Compression — terse where it's cheap, complete where it matters

> **The third cost lever**, after tiering (Model Routing) and context discipline (max 3 METHOD
> files per conversation). Also the **smallest** of the three: in agentic sessions spend is
> dominated by input and cache reads, and most output tokens are code and tool arguments, which
> never compress. Treat this as hygiene, not a budget strategy.

### The boundary

Compression applies to the **conversation**, never to the **artifact**.

| Compress freely | Never compress |
|---|---|
| Chat narration during build / debug / ops (T2–T3 work) | Committed docs — task files, `STATE.md`, `DESIGN.md`, `SCHEMA.md`, PR bodies, `/relay` blocks |
| Status pings, progress checklists, tool-result summaries | User-facing copy (EN/FR), product and marketing strings |
| Settled context — don't restate it, just drop it | Review verdicts (Vera) and security findings (Kasper) — severity and nuance *are* the deliverable |
| Preambles, apologies, hedging | The 3-line header and every `### Needs decision` block |

Two edge cases the table doesn't settle on its own:

- **A delegated agent's final report is a handoff, not narration** — right column. It reads like
  build chatter, but the orchestrator has no other view of that work; `junia → brian → junia` is
  the default execution path, so a compressed sub-agent report loses the sprint's actual state.
- **Commit subjects stay conventional-terse** (`type(scope): summary`); commit **bodies** are an
  artifact and follow the right column.

Two rules hold in both columns:

- **Code, commands, paths, error strings and numbers are reproduced verbatim** — never
  abbreviated, never paraphrased, never "summarized".
- **The handoff is always a doc.** A terse doc costs more in re-exploration than the tokens it
  saved — that is the whole reason `/relay` and the task report exist.

### Third-party compression skills (Caveman & co.)

Opt-in **per session**, never a fleet default, and bound by the table above. Reasonable use:
long `brian` / `watson` build-and-debug runs where the chat is scaffolding, not
deliverable. Keep them off for Gordon / Nova (copy), Vera / Kasper (verdicts), and any
doc-writing task.

Before adopting one anywhere, **measure it**: the Session Telemetry Ledger above already records
`outputTokens` per session — compare rows across comparable sessions and write the delta into
`efficiencyNote`. Don't buy a vendor's headline number — including the one in this section. Note
also that such skills add ~1–1.5k tokens of standing instructions to the context (paid once at
cache-creation, then served as cheap cache reads) and leave reasoning tokens untouched, so on
short sessions the saving is thin.

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

> **Single-model surface** (see "Model Routing" above): run everything inline, still tag task files
> with `Tier:`, and flag any below-tier pass in the task report — e.g. running the Step-7 Vera
> review on a T2-class model is an acknowledged tier mismatch to note, not silently accept.

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
- Tags each task file `Tier: T2` (build work — see "Model Routing")
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

### Trade-off

✅ Fast in one context window; works with any single powerful LLM.
⚠️ No parallelization, role-confusion risk, long context windows — which is exactly why this is the
**fallback**, not the default (see "Delegation is the default" above).

---

**Owner:** Lucia  
**Last Updated:** 2026-08-01
