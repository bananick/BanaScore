# Process Template

**Usage:** Copy this template to `project/PROCESSES.md` for each business process in the application.

---

## PROC-{NNN} — {Process Name}

**Objective:** {what this process accomplishes — one sentence}  
**Trigger:** {event or condition that starts the process}  
**Expected Result:** {end state when the process completes successfully}  
**Owner Agent:** {primary AI agent or "Human" if no agent involved}  
**Priority:** {P0 critical / P1 high / P2 medium}

### Steps

| # | Step | Operator | Delegation | Input | Output | Success Criterion |
|---|---|---|---|---|---|---|
| 1 | {step name} | {Human / Agent:{name} / Code} | 🔵 manual / 🟡 assisted / 🟠 supervised / 🟢 autonomous / ⚪ automated | {data in} | {data out} | {testable criterion} |
| 2 | | | | | | |
| 3 | | | | | | |

### Guardrails

- **Escalation conditions:** {when to stop and involve a human — e.g., "confidence < 0.7", "amount > $10K"}
- **Timeout:** {max acceptable duration per step and total — e.g., "Step 1: 30s, Total: 5min"}
- **Rollback procedure:** {how to undo if the process fails mid-way}
- **Retry policy:** {how many retries, with what backoff}

### Delegation Map

| Step | Current Delegation | Target Delegation | Promotion Criteria |
|---|---|---|---|
| 1 | 🟡 assisted | 🟠 supervised | 50+ runs, <5% override, >95% success |
| 2 | ⚪ automated | ⚪ automated | N/A (deterministic) |
| 3 | 🔵 manual | 🟡 assisted | Build AI suggestion feature first |

### Metrics

| Metric | Target | Measurement |
|---|---|---|
| Success rate | > {X}% | `process_runs` where status = 'success' |
| Average duration | < {X}s | `completedAt - startedAt` |
| Human override rate | < {X}% | overrides / total runs |
| Cost per execution | < ${X} | sum of LLM costs per run |
| {custom KPI} | {target} | {how measured} |

### Version History

| Date | Change | Reason | Author |
|---|---|---|---|
| {YYYY-MM-DD} | Created | {initial sprint} | {agent/human} |

---

## Notes

- **Delegation symbols:** 🔵 Manual · 🟡 Assisted · 🟠 Supervised · 🟢 Autonomous · ⚪ Automated
- **See:** `process-method.md` for full delegation type definitions and trust progression rules
- **Promotion requires:** 50+ successful runs at current level, human explicit approval
