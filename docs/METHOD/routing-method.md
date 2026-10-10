# Routing & Entry Points

**Owner:** Lucia  
**Version:** 320.a  
**Last Updated:** 2026-10-10  
**Purpose:** Define multi-entry system, orchestration patterns, model routing, session telemetry, and output compression

---


## Entry Point Matrix

### By Agent

> Cohort = **12 active mandates** (`.claude/agents/*.md` canonical + Desktop Skill stubs), plus
> **3 dormant** agent files listed below the table — not loaded, not delegable. An agent earns a
> name when its mandate is one you would otherwise have to retype.
> **Riley** (API/automation) is a demoted advisory hat — no sub-agent, no routing row. An app
> MAY still re-use a demoted name as a repo-specific domain owner, if its business pack declares it
> (`agents-method.md` → "Domain owners & the business pack (app-level)").

| Agent   | Mandate     | Sub-agent              | Default model | Entry Files                                                       |
|---------|-------------|------------------------|---------------|-------------------------------------------------------------------|
| Junia   | plan        | `junia`                | opus          | `sprints-method.md` → `project/` (STATE, FOCUS, journeys)         |
| Brian   | build       | `brian`                | sonnet        | `method-core.md` → `project/DESIGN.md` → task file                |
| Sage    | prove       | `sage`                 | sonnet        | `tests-method.md` → task / intervention file → `journeys/{cuj}.md` |
| Watson  | repair      | `watson`               | sonnet        | `method-core.md` → `tests-method.md` → `project/STATE.md`        |
| Kasper  | guard       | `kasper`               | opus          | `method-core.md` (Security Baseline) → `project/SCHEMA.md` → the diff |
| Vera    | judge       | `vera` (read-only)     | opus          | `method-core.md` → `design-method.md` → `templates/REVIEW-TEMPLATE.md` → task file |
| Nova    | draw        | `nova`                 | sonnet        | `design-method.md` → `project/DESIGN.md`                          |
| Gordon  | commercial & growth | `gordon`       | sonnet        | `agents-method.md` → `project/VISION.md` → `docs/growth/`         |
| Iris    | study & deliverables | `iris` (read-only on code) | sonnet | `method-core-lite.md` → `project/STATE.md` → the object of study |
| Lucia   | METHOD release | `lucia`             | opus          | `versioning.md` → `METHOD.md` → the files the change touches      |
| Penny   | token economy | `penny` (read-only on code) | sonnet | `routing-method.md` → `docs/project/telemetry/` → the ledgers |
| Oscar   | coach         | `oscar` (read-only on code) | opus | `method-core.md` → `project/STATE.md` + `FOCUS.md` → the week's evidence |

#### Dormant (not loaded, not delegable)

Agent files parked under `.claude/_dormant/`, outside the scanned agent root. Bringing one back is
a `git mv` and a release — the operator's call.

| Agent  | Was | Covered by |
|--------|-----|------------|
| Teddy  | mobile development | Brian — mobile is a mode, not a person; no mobile app in flight |
| Aiko   | AI integration | Brian — wiring AI is building |
| April  | vision, copy, CUJ gate | Junia's Cadrage draft (vision) + Gordon (copy) |

### By Task Type

| Task         | Entry Files                                                |
|--------------|------------------------------------------------------------|
| Build        | `method-core.md` → `project/DESIGN.md` → task              |
| Debug        | `method-core.md` → `tests-method.md` → logs/status         |
| Design       | `design-method.md` → `project/DESIGN.md`                   |
| Plan         | `sprints-method.md` → `project/ROADMAP.*.md` → `journeys/` |
| Map structure | `project/STRUCTURE.md` → `project/VISION.md`              |
| Prove        | `tests-method.md` → task / intervention file → `journeys/{cuj}.md` |
| Study / deliverable | `method-core-lite.md` → `project/STATE.md` → the object of study |
| AI Feature   | `ai-infra-method.md` → `project/AI-INFRA.md` → task        |
| i18n         | `method-core.md` (i18n section) → `locales/`               |
| Review       | `method-core.md` → `design-method.md` → `templates/REVIEW-TEMPLATE.md` → task |
| METHOD release | `versioning.md` → `METHOD.md` → the files the change touches |
| Token economy / telemetry report | `routing-method.md` → `docs/project/telemetry/` → the ledgers |
| Weekly retro / coaching | `/retro` → Penny's numbers → `oscar` → `docs/project/coaching/RETRO-YYYY-Www.md` |
| Port design  | `design-method.md` → `docs/porting/PORTING-PLAYBOOK.md` → PORT-MAP → screen |

### By Slash-Command (Claude Code rituals)

| Command         | Driver | What it does | Delegates to |
|-----------------|--------|--------------|--------------|
| `/land`         | the coordinator | Commit + local verify gate + merge to the trunk — **the default close** (LANDED, nothing more) | — |
| `/ship`         | the coordinator | Commit + push + open/update the PR — **the exception path** | — |
| `/intervention` | the coordinator | Open and run a targeted slice: Cadrage → build → Recette → land | the lane owner |
| `/plan-sprint`  | the coordinator | Cadrage with the operator, then a sprint folder + task files (exception mode) | `junia` |
| `/review`       | the coordinator | Run the slice's one Review Gate (read-only, opus) | `vera` |
| `/brief`        | the coordinator | Pick up a fresh conversation from git, PRs and memory (Flight Deck) | — |
| `/retro`        | the coordinator | The weekly coaching pass (or on demand after a slice that closes a journey) — never once per Debrief | `penny` (sonnet) → `oscar` (opus) |
| `/port` *(optional)* | Nova/Brian | Port one screen from the app's living `proto/` directive — one screen = one land | `brian` |
| `/relay` *(optional)* | the coordinator | Flush live working-state into `STATE.md` → `## Resume here` (dropoff) | — |

> Rituals (9), all in `.claude/commands/`. The orchestration chain the coordinator runs is defined
> **once**, in `agents-method.md` → "Orchestration chain" — reference it, never restate it here.
> A slice closes on **`/land`**: the trunk is then **LANDED** — `DEPLOYED` and `PROVEN` need their
> own evidence (a served revision, an observed run); the gate is local, there is no CI on this
> account. `/ship` is reserved for the exception list in `method-core.md` → "Landing (the default)
> & the exception list". Only one conversation per app runs `/relay` (one `## Resume here` per app,
> `sprints-method.md` → "Sessions & branches").

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
| **Workflow** | ≥ 3 near-identical items, or work that earns an adversarial verification pass — **every worker gets an explicit `model`** (default sonnet), the **cost is announced at Cadrage**, **< 10 agents** unless the operator agrees ("Token economy" below) | parallel, deterministic |
| **Parallel sessions** | only on an **observed** trigger, never a predicted one: 3rd build→test→fix loop on the same task · a different repo · a deploy loop with the operator in it · two tasks writing code at once (→ one branch + worktree each) | one human click |

Nothing else justifies a second window — not size, not an estimate, not "it looks big".

### Capability tiers (tool-agnostic)

| Tier | Work | Claude | Other tools (Cursor / Codex / …) |
|---|---|---|---|
| **T1 — Judge / Orchestrator** | plan, arbitrate, review gate, security, architecture, METHOD release, ranked recommendations | Fable / Opus | strongest reasoning model available (GPT-5.x-class, Opus-class) |
| **T2 — Builder** | implement, port, design code, prove/write tests, debug/ops, copy, studies, docs needing judgment | Sonnet | mid-tier coding model |
| **T3 — Mechanical** | scaffolding, renames, i18n extraction, bulk edits, mirror/doc sync, formatting | Haiku | cheapest competent model |

### Per-agent defaults (Claude Code — `model:` frontmatter in `.claude/agents/`)

- **T1 (opus):** `junia`, `vera`, `kasper`, `lucia`, `oscar`
- **T2 (sonnet):** `brian`, `sage`, `watson`, `nova`, `gordon`, `iris`, `penny`
- **T3 (haiku):** no agent *defaults* to T3 — it is a **delegation-time override** for mechanical sub-tasks
- **Opus by override (318.a):** `nova` for a deep UX-architecture study · `gordon` for a pricing or
  positioning recommendation · `iris` for a ranked recommendation the operator will act on
- **Dormant agents** (`teddy`, `aiko`, `april`) are not loaded, so they have no tier to route to.

**Why 318.a moved Nova and Gordon to sonnet.** Over 120 days opus produced **61.4%** of output tokens
and haiku **0.4%**; delegated work ran 58% on opus. Design code and copy are T2 work by this table's
own definition, and Vera ran once per task (172 opus passes). Defaults now match the tier table;
judgement stays one override away.

### Delegation-time overrides (the orchestrator's job)

1. **At planning**, Junia (or the coordinator, for a plan written inline) tags each item with its
   tier (`Tier: T1|T2|T3`) next to the owner.
2. **At delegation**, pass a `model` override when the task's tier differs from the sub-agent's
   default — e.g. `brian` + `model: haiku` for pure scaffolding; `sage` + `model: opus` for a
   hard test-architecture call. No override needed when tier and default already match.
3. **Escalation rule:** at most **one retry at the same tier**; a second failure escalates one
   tier. Never burn three cheap attempts — a failed T3 loop costs more than starting at T2.
4. **Quality floors:** the Vera review gate and Kasper security passes never run below T1. Vera
   runs **once per slice, at the Recette** — not after every task.
5. **Workflow workers** (the `Workflow` tool) get an **explicit `model` per worker — default
   `sonnet`**; `haiku` for purely mechanical items (renames, extraction, formatting), `opus` only for
   a verification or judgement pass. Before 319.a a worker with no `model` inherited the
   coordinator's (usually opus) — the model was unrecorded for half of 6,180 workflow workers, which is
   how mechanical fan-out ended up billed at T1. The rule alone did not hold: 14 days after 318.a,
   122 of the 123 sub-agents that were pinned neither per call nor by frontmatter ran on opus ($1,456, 9.8 % of API-equivalent cost; 2,032 named a model per call, 61 were pinned by frontmatter). Since
   319.a a **user-level default sub-agent model** backs the rule for the sub-agents that name none:
   `env.CLAUDE_CODE_SUBAGENT_MODEL = "sonnet"` in `~/.claude/settings.json`, guaranteed by
   `install.mjs --user` (doctor **W7** warns when it is missing). **Precedence, highest first:** the
   per-call `model` of the delegation → the agent's `model:` frontmatter → `CLAUDE_CODE_SUBAGENT_MODEL`
   → the parent's model. So the default never replaces an explicit `model`, and the T1 floors of rule 4
   still win. A frontmatter or per-call value of **`inherit`** is explicit: it takes the parent's model
   and does **not** fall through to the env default. **Never set `CLAUDE_CODE_SUBAGENT_MODEL_FORCE`** —
   it outranks every explicit `model`, so it would silently downgrade `vera` and `kasper` below T1, and
   it applies to Workflow workers too. **The default makes forgetting cheap, not safe:** a review,
   verification or judgement worker that forgets its `model` now runs on sonnet, below its floor — so
   those workers always name `opus` explicitly.
6. **A `general-purpose` sub-agent never runs on opus** unless its task is judgement (T1 by the
   table above): measured at **$11.5 per agent on opus vs $4.1 on sonnet** for the same kind of work.

### Token economy (319.a) — the unit is the cost of a finished task

> Measured over 14 days on 2,934 transcripts (2026-10-09, API-equivalent at list prices, not a bill —
> `docs/interventions/2026-10-10-Lucia-token-economy.md`): **$14,714**, of which sub-agents and
> Workflows **86.2 %** (opus 50.2 %), Workflows alone **37.5 %** (71 runs, 1,170 agents), and the
> main thread 13.8 % (cache writes at 1.25×; restated by `npm run telemetry:report -- --days 14 --json` on 2026-10-10 with 1-hour cache writes priced at 2×: total $14,805, cache writes 24.6 %, sub-agent opus 48.9 % of total cost (58.3 % of sub-agent cost)). **Cache reads were 62.9 % of
> cost, cache writes 22.7 %, output 14.4 %** — a
> session costs *calls × context*, not what it writes. The rules below act on calls and context.

1. **A review→fix loop stops after 2 rounds** — then the operator decides (accept with the open
   point recorded, reopen with a narrower scope, or drop the point). A re-review reads **the diff
   since the last round only**, never the whole slice again. **One reviewer per point** — `vera` *or*
   `kasper`, not both on the same findings. **Full gates** (complete test suite, build, e2e
   campaigns) run **once, at the end of the slice** — not after every round. *Why:* one review loop
   on one verdict ran 5 rounds without converging and cost 34 % of a ~$610 session (BanaLog,
   2026-10-09).
2. **Tiers beat modes.** Ultracode, "cost is not a constraint" or any other session mode never
   overrides T1/T2/T3: a mode changes how hard an agent works, not which tier it runs on. *Why:*
   57 of 70 sub-agents ran on opus under Ultracode in that same session.
3. **Every Workflow announces its cost at Cadrage** — agents × expected calls per agent, stated as
   a share of the weekly quota — and stays **under 10 agents** unless the operator agrees; every
   worker has an explicit `model` ("Delegation-time overrides", rule 5). *Why:* Workflows were
   37.5 % of 14 days' cost.
4. **Minimal sub-agent context.** A delegation prompt passes **file paths, never pasted inventories**
   (the sub-agent reads what it needs). **Screenshots and images** enter a sub-agent's context only for
   `nova` or `sage`, and only the ones the task needs. The brief **caps the sub-agent's tool calls**
   when the task is bounded. *Why:* a sub-agent made ≈ 55 calls on average (124,966 calls / 2,262
   sub-agents), each re-reading ≈ 198k tokens of cache on opus and ≈ 261k on sonnet; Nova agents carrying screenshots wrote ≈ 6× the cache of Brian agents.
5. **Memory index budget — `MEMORY.md` ≤ 5 kB**, one-line pointers only; the detail lives in the
   memory files it points to. It is loaded on every turn of every session. `npm run doctor` warns
   above 5 kB. *Why:* the two costliest repos carried the two heaviest indexes (BanaLog 17.7 kB,
   bananaevents 16.4 kB; 57.1 % of cost between them).
6. **Cost per finished task is the unit**, not cost per call: a cheaper tier that needs three passes
   is not cheaper. One retry at a tier, then escalate ("Delegation-time overrides", rule 3) — the
   same rule, read as economics.

**Who watches it: `penny`** (T2) — measures by project, task type, period, sprint, agent and model;
publishes a periodic report; coaches the cohort and the operator; proposes METHOD changes on this
axis to `lucia`, who releases them. At the Recette, when a slice ran a Workflow or more than 10
sub-agents, the Debrief carries Penny's one-paragraph cost note — a note, not a gate.

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

A **Stop hook** (`.claude/hooks/session-telemetry.mjs`) appends one JSON row per invocation to the
repo's **local** ledger, `docs/project/telemetry/sessions.jsonl` — gitignored. Hooks no longer commit
the ledger (318.a); the file becomes untracked in a follow-up once every checkout runs the 318.a hooks.

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
- **Which agent ran (319.b, `schemaVersion` 2).** `subAgents.byAgent` has one entry per sub-agent transcript that
  made a call (capped at 150 per row, costliest first; `byAgentTruncated` counts the rest):
  `{ agentType, description, workflowId, requestedModel, model, pin, calls, inputTokens, outputTokens,
  cacheCreationInputTokens, cacheReadInputTokens, apiCostUsd, startedAt, endedAt }`. `model` is the family that cost
  most inside that agent; `pin` is `explicit` (a per-call `model` in `meta.json`), `frontmatter` (`model:` in
  `.claude/agents/<agentType>.md`, looked up in the agent's cwd, the project dir, then the main checkout; `inherit`
  counts as none) or `unpinned` (neither — it inherits the coordinator unless the user-level default is set).
  `subAgents.byType` is the complete roll-up, keyed `"<agentType>|<model>"`: `{ count, calls, inputTokens,
  outputTokens, cacheCreationInputTokens, cacheReadInputTokens, apiCostUsd, pins: { explicit, frontmatter, unpinned } }`.
  `description` is the short task label the caller gave the agent (`meta.json`), whitespace-collapsed and cut to 80
  chars, `null` when absent — a label, never a prompt. Rows written before 319.b (`schemaVersion` 1) have neither
  field and stay valid; the hook is standalone, so its price table and pin lookup are duplicated from
  `scripts/lib/token-economy.mjs` and a test asserts the two agree.
- **Shape** — user-message count, assistant API-call count, start/end timestamps, duration,
  git branch, app (repo folder name).
- **No prompt text, ever.** The ledger is local, but aggregators read it and reports quote it, so
  operator wording must never enter it. There is no `topic` field.
- **Best-effort hint** — `sprint`, a regex match on sprint paths seen in the transcript. It accepts
  `docs/sprints/{NNN}` and `docs/project/sprints/{YYYY}/week-{N}/{NNN}`, skips the year/week
  segments, and requires a non-digit after the 3 digits so a year can't be captured. Can be `null`.
  *Before the 2026-09-01 fix it matched 3 digits after `docs/sprints/`, so `…/2025/…` logged sprint
  `"202"` — those rows are wrong and stay wrong: the ledger is append-only and history is never
  rewritten.*
- **`outcome` / `efficiencyNote`** — always `null` from the hook. **Manual, optional** fields; in
  120 days of practice they were filled **0%** of the time, so do not plan on them — the accepted
  outcome lives in the Recette (the intervention or task file), not in the ledger.
- **No billed cost.** Pricing changes and varies by plan — the token counters are exact and raw. The
  only money field is `apiCostUsd` on `byAgent` / `byType` (319.b): an **API-equivalent** figure at list prices (cache
  read 0.1x, cache write 1.25x / 2x for the 5-minute / 1-hour tier), good for comparing agents, not a bill.

### Mechanics worth knowing

- **Fires after every assistant turn, not just at the true end of a conversation** (Stop hooks
  don't have a cleaner signal than that in Claude Code today). Each firing re-parses the whole
  transcript and appends a **fresh cumulative snapshot** — the file is append-only, never
  rewritten in place, which is what makes it safe under concurrent sessions. **Consumers must
  dedupe by `sessionId` and keep the newest row** — don't sum every row, that double-counts.
- **Fails open.** Any error (missing file, malformed JSON, mid-write truncation) is swallowed
  silently — a telemetry bug must never block Claude from stopping.
- **Silent on success** — no `systemMessage`, to avoid noise on every single turn.
- **Hooks no longer commit the ledger (318.a).** From 2026-08-01 the hook committed and pushed its row
  (every `Stop`, then once per `SessionEnd` from 317.a). Over 120 days that was **364
  `chore(telemetry)` commits — 6.5% of all commits** — for a ledger nobody aggregated. The ledger is
  now gitignored and the `--commit` step is gone (the flag is still accepted and ignored): the hook
  only appends. The file becomes untracked in a follow-up once every checkout runs the 318.a hooks —
  until then a repo that tracked it keeps tracking it, and rows already committed stay in history.

### Reading it — `npm run telemetry:report`

**From the ledger alone (319.b).** When rows carry `byType`, the report prints **"Sub-agents by type × model"** (agents,
calls, tokens, API-equivalent cost, and the explicit / frontmatter / unpinned split) and **"per sprint / branch"**
(agents, cost, opus share, unpinned-on-opus) — both work with `--no-transcripts`. `--json` adds `byAgentType`,
`bySprintOrBranch` and `agentRows`. Rows are cumulative per session: the tables use the newest row per `sessionId`.

`scripts/telemetry-aggregate.mjs` (in the hub) reads the local ledgers of the hub and of the sibling
repos on this machine, keeps the **newest row per `sessionId`** (never sums cumulative snapshots),
and reports tokens and models per scope (main loop vs sub-agents), per repo and per month. A repo
with no ledger is reported as missing, never extrapolated.

**Token economy part (319.a, `scripts/lib/token-economy.mjs`).** The ledger stores per-scope totals,
so a scope that ran two models reads as one lump ("opus+sonnet"). The report therefore also reads the
raw Claude Code transcripts and prints the **API-equivalent** cost (list prices, not a bill) split
main thread vs sub-agents per model family, the Workflow share, agent type × model, per-repo totals
(worktrees folded), every sub-agent classed as **explicit** (a per-call `model`), **frontmatter-pinned**
(`model:` in its agent file) or **truly unpinned** (neither — the Proof metric, `proof.unpinnedOpus` in
`--json`) with the opus count of each, and a **"Ledger gap"** line naming the repos that spent in the window
but have no ledger. Flags:

| Flag | Effect |
|---|---|
| `--days N` | transcript window, default **7** |
| `--since <date>` | narrows the window start (e.g. the day a rule went live) |
| `--projects <dir>` | transcripts directory, default `~/.claude/projects` |
| `--no-transcripts` | ledger roll-up only |
| `--json` | machine-readable: the ledger roll-up plus an `economy` block |

**The 319.a J+7 measurement:** `npm run telemetry:report -- --since 2026-10-10 --days 7` — PROVEN
when the sub-agent opus share is < 35 % **and** truly-unpinned → opus = 0 (no sub-agent pinned neither
per call nor by frontmatter ran on opus). The window opens ≈ 6 h before the env default went live
(2026-10-10 06:14).

Its owner is **`penny`**, who turns it into a periodic report,
`docs/project/telemetry/REPORT-YYYY-MM-DD.md` — committed, unlike the raw ledger.

**Doctor checks (319.a, warnings only).** `npm run doctor` → **W6**: this repo's Claude memory index
(`~/.claude/projects/<slug>/memory/MEMORY.md`, the larger of the worktree's and the main checkout's)
is over 5 kB; **W7**: the user settings carry no default sub-agent model (fix:
`node docs/METHOD/tools/swanifly-claude-addon/install.mjs --user --env-only`, which writes only
`env.CLAUDE_CODE_SUBAGENT_MODEL` when it is absent and touches nothing else).
`npm run doctor:fleet` adds a **`MEMORY.md`** column (size per repo, `!` over 5 kB, skipped repos
included — they are not synced but still pay for their index).

### Where it lives / how it ships

- **Hub-owned copy:** `.claude/hooks/session-telemetry.mjs`, wired in `.claude/settings.json` →
  `hooks.Stop` (append only).
- **Fleet distribution:** mirrored at
  `docs/METHOD/tools/swanifly-claude-addon/payload/hooks/session-telemetry.mjs`; the installer
  (`install.mjs`) copies it into every app and merges its hook entry into the app's own
  `.claude/settings.json` idempotently (preserves any hook the app already has — appends alongside,
  never replaces).
- **Per-repo and local.** Each checkout accumulates its own ledger; the aggregator is the rollup.
- **Ledger-only repos (319.a).** The sync discovers targets by their `docs/METHOD`, so a repo the
  METHOD never reached had no ledger. `LEDGER_ONLY_REPOS` (`scripts/lib/fleet-ledger.mjs`; today
  `Talkation`, `IApocalypse`) gets **only** the ledger from `sync-method:all`: the hook
  file, its `Stop` wiring in `.claude/settings.json`, and the three paths in the repo's local
  `.git/info/exclude` — no METHOD mirror, no `CLAUDE.md`, no tracked change. A differing hook file is
  kept unless `--force`; a `settings.json` that git tracks, or that is not a JSON object, is left
  alone. `IAcademy` left the list: it is in `SKIP_REPOS`, because the GitHub sync matches by remote
  name and `Respirit`'s origin is `bananick/IAcademy`. **Accepted gap:** a session in a *worktree* of such a repo leaves no row —
  the hook and its wiring live, untracked, in the main checkout only.

### Central store (319.c) — one Firestore store for every repo and worktree on a machine

The per-repo ledgers cannot see a worktree of a repo that has no hook, and Penny would have to walk every checkout.
So the same row also goes to **Firestore project `swanifly-ia`**, `teams/banana/telemetrySessions/{sessionId}`
(schema: `docs/project/SCHEMA.md` → "Telemetry store"). **Numbers only:** the hook sends no `cwd`, no `gitBranch`, no
`app`, no `topic` and no `description` — `project` (main checkout name) + `worktree` (boolean) + `sprint` replace them —
and free text is refused by the strict Zod schema. `CLAUDE_TELEMETRY_DIR` (hook and enroll) is test-only: honoured
only with `CLAUDE_TELEMETRY_TEST=1`.

- **Write path:** the hook POSTs the row (3 s timeout) to the HTTPS function `ingestTelemetry` (europe-west1,
  `telemetry-backend/`) with `Authorization: Bearer <machineId>.<secret>`. The function stores only a SHA-256 of the
  secret per machine (`teams/banana/telemetryMachines/{machineId}`), writes with the Admin SDK in a transaction
  (newest `capturedAt` wins, never summed), and refuses without a valid token (401/403, nothing written).
  Firestore rules deny every client read/write on `teams/*/telemetry*`.
- **Offline:** a failed send is queued in `~/.claude/telemetry/outbox.jsonl` (newest row per session, bounded) and
  retried on the next Stop. No `~/.claude/telemetry/config.json` → no network, behaviour unchanged.
- **Enrol a machine:** `npm run telemetry:enroll` (needs `npm --prefix telemetry-backend/functions install` and
  `gcloud auth application-default login`). `--rotate` replaces a token, `--revoke <id>` kills one.
- **Cover repos without the hook:** `node docs/METHOD/tools/swanifly-claude-addon/install.mjs --user --telemetry`
  puts the hook in `~/.claude/hooks` with one `Stop` entry run as `--user` (central store only, never writes a ledger
  into a repo). When the repo-level and user-level hook both fire for one Stop, a per-(session, transcript size) claim
  in `~/.claude/telemetry/claims/` makes the first send and the second skip.
- **Read:** `npm run telemetry:report -- --source firestore [--project X] [--days N | --since DATE] [--json]` — same
  aggregation, worktrees folded into their repo, no local transcripts unless `--with-transcripts`.
- **Deploy:** `cd telemetry-backend && firebase deploy --only functions,firestore:rules --project swanifly-ia`
  (the project must be on the Blaze plan). Deploying the rules file replaces the project's whole Firestore ruleset.

### Cross-tool status (Codex, Cursor)

Not wired — no automated equivalent exists today:

- **Codex CLI** exposes `/status` (session snapshot) and `/usage` (account rollups), but there's
  no established Claude-Code-style hook mechanism here to auto-capture per-session data yet.
- **Cursor** only exposes account-level usage (Dashboard → Usage, or the Enterprise "AI code
  tracking" API) — per-conversation export isn't natively available; treat as a known gap, not
  a bug, until Cursor ships it or the team builds a scraper against the Enterprise API.
- If you're working in Codex or Cursor, self-report the same fields manually in the task report
  (tokens from `/usage` or the dashboard, sprint/outcome by hand) rather than leaving the
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
  build chatter, but the orchestrator has no other view of that work; `coordinator → brian →
  coordinator` is the default execution path, so a compressed sub-agent report loses the slice's
  actual state.
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

Treat `✅` as **executor done / ready for review** and `☑️` as **validated**. Vera reviews **once
per slice, at the Recette** (always opus), covering every task in the slice — not after each task.

- **Executor:** `⬜` → `✅`
- **Vera (high-model Analyzer), once per slice:** every `✅` in the slice → `☑️` (pass) OR `⚠️` (fail
  with must-fix + follow-ups)

Use `docs/METHOD/templates/REVIEW-TEMPLATE.md` for slice and sprint reviews.

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

#### Step 6: Back to the coordinator (Consolidation)

**Prompt to LLM:**
```
[Back to the coordinator]

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

#### Step 8: Back to the coordinator (Close Sprint)

**Prompt to LLM:**
```
[Back to the coordinator]

Vera has passed the Review Gate with minor follow-ups.

Task: Close sprint 010.
- Commit all artifacts
- Note follow-up for FR i18n fix
```

**LLM Output:**
- Commits sprint artifacts and lands them (`npm run land`) — LANDED, not deployed
- Closes sprint 010
- Adds follow-up to next sprint backlog

---

### Trade-off

✅ Fast in one context window; works with any single powerful LLM.
⚠️ No parallelization, role-confusion risk, long context windows — which is exactly why this is the
**fallback**, not the default (see "Delegation is the default" above).

