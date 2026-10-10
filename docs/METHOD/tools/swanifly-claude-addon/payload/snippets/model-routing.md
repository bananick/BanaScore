## Model Routing (default: orchestrate high, execute cheap)

> Canonical policy — **do not restate it here**: `docs/METHOD/routing-method.md` → "Model Routing".
> This section is synced from the METHOD hub; change the policy there, never in an app.

- **Delegation is the default, not an option.** Standing order — it never has to be re-requested
  per task: never do yourself, in the main conversation, work a cheaper sub-agent can hand back.
  **The conversation coordinates** — it reads, arbitrates, decides and reports to the operator;
  the executable work goes out to sub-agents.
- **Offloading context is a goal in itself.** Any high-residue exploration (finding where something
  lives, reading ten files to extract three lines, mapping a repo) goes to a sub-agent that returns
  only its conclusion. The coordinator's context carries the decision, not the raw material.
- **Coordinator high, delegates cheap.** The orchestrator runs on the strongest model the surface
  exposes; every delegated task runs on the **cheapest model that meets its quality bar**.
- **Tiers:** **T1** judge/plan/review/security/METHOD release → opus · **T2** build/prove/ops/design/
  copy/study → sonnet · **T3** mechanical (scaffolding, renames, i18n extraction, bulk edits) → haiku.
- **Defaults + overrides:** each sub-agent's `model:` frontmatter is its default tier (opus: junia,
  vera, kasper, lucia · sonnet: brian, sage, watson, nova, gordon, iris, penny); pass a `model`
  override at delegation when the task's tier differs. One retry max at a tier, then escalate one
  tier. Review and security never run below T1, and **Vera runs once per slice, at the Recette** —
  not per task. A `general-purpose` sub-agent never runs on opus unless the task is judgement
  ($11.5/agent on opus vs $4.1 on sonnet).
- **Workflow at ≥ 3 near-identical items** (+ a verification pass), and **every Workflow worker gets
  an explicit `model`** — default sonnet, haiku for mechanical items, opus only for a judgement pass.
  Since 319.a a worker or sub-agent that names none runs on the user-level default, **sonnet**
  (`CLAUDE_CODE_SUBAGENT_MODEL`, set by `install.mjs --user`); before it, unpinned sub-agents
  inherited the coordinator's opus (122 of 123 truly unpinned, $1,456 = 9.8 % of 14 days' cost). The default makes forgetting cheap,
  not safe: **review, verify and judgement workers name `opus` explicitly**. It never replaces an
  explicit `model`; never use its `_FORCE` variant (it would downgrade `vera`/`kasper`).
  **A Workflow announces its cost at Cadrage** (agents × expected calls, as a share of the weekly quota) and stays **< 10 agents**
  unless the operator agrees — Workflows were 37.5 % of 14 days' cost.
- **Token economy (319.a) — cost = calls × context, not output** (cache 85.6 % of cost). Canonical:
  `routing-method.md` → "Token economy".
  - **Review→fix loop: 2 rounds max**, then the operator decides; a re-review reads the diff only;
    one reviewer per point (`vera` *or* `kasper`); full gates (suite, build, e2e) once at the end of
    the slice. (One loop ran 5 rounds and cost 34 % of a ~$610 session.)
  - **Tiers beat modes** — Ultracode or "cost is not a constraint" never overrides T1/T2/T3
    (57/70 sub-agents ran on opus under one).
  - **Minimal sub-agent context** — pass file paths, never pasted inventories; screenshots only for
    `nova`/`sage`, only the needed ones; cap tool calls in the brief (≈ 55 calls per sub-agent on
    average, each re-reading ≈ 200–260k tokens).
  - **`MEMORY.md` ≤ 5 kB**, one-line pointers — loaded every turn; the doctor warns above it.
  - **Cost per finished task** is the unit: a cheaper tier that needs three passes is not cheaper.
- **A parallel session only on an observed trigger**, never a predicted one: a 3rd build→test→fix
  loop on the same task · another repo · a deploy loop with the operator in it · two tasks writing
  code at once (each its own branch + worktree). Rule: `docs/METHOD/sprints-method.md` → "Sessions &
  branches".
- **Environment awareness:** on a non-Claude surface (Cursor, Codex), inventory the models the tool
  actually exposes, map them onto T1/T2/T3 by capability and price, then apply the same policy.
  Missing tier → nearest available, preferring upward. Single-model surface → run inline and flag
  the tier mismatch in the task report.
- **A delegated sub-agent reports, it does not render the operator card.** It hands back a
  `Done / State / Next` header + its findings; the coordinator folds every report into one Debrief.

### Session Telemetry Ledger

A Claude Code Stop hook appends token usage, message count, duration and model(s) to the repo's
local ledger `docs/project/telemetry/sessions.jsonl` — gitignored. Hooks no longer commit the
ledger (318.a); the file becomes untracked in a follow-up once every checkout runs the 318.a
hooks. One cumulative row per turn: dedupe by `sessionId`, keep the newest row, never sum. The
hub rolls the ledgers up with `npm run telemetry:report`. Raw tokens only, no dollar estimate.
Codex/Cursor have no automated equivalent — self-report the same fields by hand in the task report.
Schema: `docs/METHOD/routing-method.md` → "Session Telemetry Ledger".

### Output Compression

**Compress the chat, never the artifact.** Terse in conversation (no filler, preambles, hedging,
tool narration); full prose in committed docs, EN/FR copy and review/security verdicts. Code,
commands, paths, errors and numbers verbatim everywhere. Compression skills (Caveman & co.) are
opt-in per session under the same boundary — measure the delta in the telemetry ledger before
adopting one. Canonical: `docs/METHOD/routing-method.md` → "Output Compression".
