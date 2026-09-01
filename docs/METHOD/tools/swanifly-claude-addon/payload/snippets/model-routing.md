## Model Routing (default: orchestrate high, execute cheap)

> Canonical policy — **do not restate it here**: `docs/METHOD/routing-method.md` → "Model Routing".
> This section is synced from the METHOD hub; change the policy there, never in this repo.

- **Delegation is the default, not an option.** Standing order — it never has to be re-requested
  per task: never do yourself, in the main conversation, work a cheaper sub-agent can hand back.
  **The conversation coordinates** — it reads, arbitrates, decides and reports to the operator;
  the executable work goes out to sub-agents.
- **Offloading context is a goal in itself.** Any high-residue exploration (finding where something
  lives, reading ten files to extract three lines, mapping a repo) goes to a sub-agent that returns
  only its conclusion. The coordinator's context carries the decision, not the raw material.
- **Coordinator high, delegates cheap.** The orchestrator runs on the strongest model the surface
  exposes; every delegated task runs on the **cheapest model that meets its quality bar**.
- **Tiers:** **T1** judge/plan/review/security → opus · **T2** build/tests/ops → sonnet ·
  **T3** mechanical (scaffolding, renames, i18n extraction, bulk edits) → haiku.
- **Defaults + overrides:** each sub-agent's `model:` frontmatter is its default tier; the planner
  tags tasks `Tier: T1|T2|T3` and passes a `model` override at delegation when they differ. One
  retry max at a tier, then escalate one tier. Review and security never run below T1.
- **Environment awareness:** on a non-Claude surface (Cursor, Codex), inventory the models the tool
  actually exposes, map them onto T1/T2/T3 by capability and price, then apply the same policy.
  Missing tier → nearest available, preferring upward. Single-model surface → run inline and flag
  the tier mismatch in the task report.
- **A delegated sub-agent reports, it does not render the operator card.** It hands back a
  `Done / State / Next` header + its findings; the coordinator folds every report into one Debrief.

### Session Telemetry Ledger

A Claude Code Stop hook appends token usage, message count, duration and model(s) to
`docs/project/telemetry/sessions.jsonl` — append-only, one row per invocation (dedupe by
`sessionId`, keep the newest row; never sum them). It is how the tiers above get checked against
real usage instead of guessed. Raw tokens only, no dollar estimate. Codex/Cursor have no automated
equivalent — self-report the same fields by hand in the task report. Schema:
`docs/METHOD/routing-method.md` → "Session Telemetry Ledger".

### Output Compression

**Compress the chat, never the artifact.** Terse in conversation (no filler, preambles, hedging,
tool narration); full prose in committed docs, EN/FR copy and review/security verdicts. Code,
commands, paths, errors and numbers verbatim everywhere. Compression skills (Caveman & co.) are
opt-in per session under the same boundary — measure the delta in the telemetry ledger before
adopting one. Canonical: `docs/METHOD/routing-method.md` → "Output Compression".
