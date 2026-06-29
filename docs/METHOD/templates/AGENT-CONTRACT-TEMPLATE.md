# Agent Contract Template

**Usage:** Copy this template to `project/AI-INFRA.md` for each AI agent integrated into the application (not METHOD development agents — those are defined in `agents-method.md`).

---

## Agent Contract — {AgentName}

**Mission:** {one sentence describing what this agent exists to do}  
**Model:** {default model — e.g., "gemini-2.5-pro"}  
**Delegation Level:** {assisted / supervised / autonomous}  
**Status:** {active / paused / deprecated}

### Assigned Processes

| Process ID | Process Name | Steps | Delegation |
|---|---|---|---|
| PROC-{NNN} | {name} | {step numbers} | {delegation type} |

### Scope

**Can do:**
- {explicit capability 1}
- {explicit capability 2}
- {explicit capability 3}

**Cannot do:**
- {explicit exclusion 1 — prevents scope creep}
- {explicit exclusion 2}

**Tools authorized:**
- {MCP server, API, Firestore collection, Cloud Function it can call}

### Success Criteria

| Metric | Target | Measurement Method |
|---|---|---|
| {metric name} | {target value} | {how to measure} |
| {e.g., "Quote accuracy"} | {> 90%} | {human review sample} |
| {e.g., "Response time"} | {< 5s} | {p95 latency from traces} |

### Stop Conditions

The agent must halt and escalate to a human when:
- {condition 1 — e.g., "Confidence score < 0.7"}
- {condition 2 — e.g., "Transaction amount exceeds $10,000"}
- {condition 3 — e.g., "3 consecutive step failures"}
- {condition 4 — e.g., "Input data missing critical fields"}

### Escalation Path

When stopped, the agent should:
1. **Log** the escalation reason in `process_runs`
2. **Notify** {who — e.g., "team admin via notification"}
3. **Preserve context** — save current state for human to resume
4. **Wait** — do not retry without human instruction

### Memory & Context

| Data Source | Access Level | Retention |
|---|---|---|
| {e.g., "teams/{teamId}/quotes"} | Read | N/A (live data) |
| {e.g., "process_runs for this agent"} | Read | Last 30 days |
| {e.g., "teams/{teamId}/contacts"} | Read + Write | N/A (live data) |

### Cost Budget

- **Max cost per execution:** ${X}
- **Monthly budget cap:** ${X}
- **Model downgrade threshold:** {when budget > X%, use cheaper model}

### Version History

| Date | Change | Reason |
|---|---|---|
| {YYYY-MM-DD} | Created | {initial implementation} |

---

## Notes

- **This contract is a living document.** Update it when processes change, delegation levels are promoted/demoted, or scope adjusts.
- **Review frequency:** Monthly (during Lucia's Process Review)
- **See:** `process-method.md` for delegation types, trust progression, and promotion criteria
