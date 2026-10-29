## Model Routing (default: orchestrate high, execute cheap)

> Canonical policy — **do not restate it here**: `docs/METHOD/routing-method.md`, whose other §§ own
> what is not below: "§ Token economy" (incl. the `MEMORY.md` ≤ 5 kB cap and cost-per-finished-task),
> "§ Session Telemetry Ledger", "§ Output Compression", "§ Environment awareness" (non-Claude surfaces).

- **Delegate on the four-condition test, not by default.** Send work out when it is
  **verbose-and-discardable**, **self-contained** (one brief, no back-and-forth), **summarisable**, or
  **needs a tool restriction**. Stay **inline** for back-and-forth, shared multi-phase context and
  small targeted edits — a spawn costs 60–75 k tokens before it reads anything.
- **Tiers:** **T1** judge/plan/review/security/METHOD release → `opus` · **T2** build/prove/ops/design/
  copy/study → `sonnet` · **T3** mechanical (scaffolding, renames, i18n, bulk edits) → `haiku`. One
  retry per tier, then escalate one. **Tiers beat modes**: Ultracode or "cost is no constraint" never
  overrides them.
- **Name `model` explicitly** on every sub-agent and Workflow worker — unnamed runs `sonnet`. **Review,
  security and judgement never below T1**; `vera` once per slice, not per task.
- **Review→fix loop: 2 rounds max**, then the operator decides. A re-review reads the diff only; one
  reviewer per point; full gates (suite, build, e2e) once, at the end of the slice.
- **Workflow at ≥ 3 near-identical items** + a verification pass; it announces its cost at Cadrage and
  stays **< 10 agents** unless the operator agrees.
- **≥ 2 code-writing slices = a chantier**; inside a slice, a parallel session only on an **observed**
  trigger (`sprints-method.md` → "§ The chantier").
