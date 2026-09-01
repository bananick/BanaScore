# Process Architecture Method

**Owner:** Lucia (method-level) + Aiko (project-level)  
**Version:** 306.c  
**Last Updated:** 2026-04-11  
**Purpose:** Define how to model, delegate, trace, and improve business processes in AI-native applications

---

## Overview

This file defines **method-level process governance**. At the project level:
- **Process registries and delegation maps** live in `docs/project/PROCESSES.md`
- **Agent contracts** live in `docs/project/AI-INFRA.md` (alongside the AI configuration they depend on)

**Key Principle:**

> A well-designed AI application doesn't automate tasks — it carries processes, assigns execution roles to agents, and continuously learns from execution reality.

**Why Process-First:**

1. **Clarity** — Without explicit processes, agents have fuzzy responsibilities and unpredictable behavior
2. **Accountability** — Each step has a named operator (human, code, or agent)
3. **Measurability** — Structured processes produce structured traces → data for improvement
4. **Evolvability** — Processes can be tuned step by step (e.g., promote from `assisted` to `autonomous`)

---

## What is a Process?

A **process** is a sequence of steps that transforms an input into a desired outcome. Each step has:
- An **operator** (who does it)
- A **delegation type** (how much autonomy)
- **Inputs and outputs** (data contracts)
- A **success criterion** (how to know it worked)

### Process vs CUJ vs Feature

| Concept | Focus | Example |
|---|---|---|
| **Feature** | What the app can do | "Send quotes via email" |
| **CUJ** | User's journey through features | "Prospect receives and accepts a quote" |
| **Process** | How the work actually gets done (including non-user steps) | "Extract needs → Calculate price → Review → Generate PDF → Send → Track opens → Follow up" |

> [!IMPORTANT]
> A CUJ describes the *user's experience*. A process describes the *system's execution*, including steps with no user involvement (agent actions, scheduled jobs, background pipelines).

---

## Delegation Types

Every process step has a delegation type that defines the relationship between human and automation:

| Type | Symbol | Description | Human Role | Example |
|---|---|---|---|---|
| `manual` | 🔵 | Human does everything | Execute | Writing a strategic brief |
| `assisted` | 🟡 | Agent proposes, human decides | Validate | AI suggests prices, human approves |
| `supervised` | 🟠 | Agent executes, human reviews after | Audit | Auto-send follow-ups, human reviews weekly |
| `autonomous` | 🟢 | Agent executes solo with guardrails | Monitor | Lead scoring, classification |
| `automated` | ⚪ | Traditional code, no AI | None | Tax calculation, PDF generation |

### Trust Progression

Processes should start with higher human involvement and earn autonomy:

```
manual → assisted → supervised → autonomous
```

**Promotion criteria:**
- Success rate > 95% over 50+ runs
- Human override rate < 5%
- No P0/P1 incidents in last 30 days
- Human explicitly approves promotion

**Demotion triggers:**
- Success rate drops below 85%
- Human override rate exceeds 15%
- Any P0 incident
- Quality score drops below threshold

---

## Process Definition Template

Every process in `project/PROCESSES.md` follows this structure:

```markdown
### PROC-{NNN} — {Process Name}

**Objective:** {what this process accomplishes}  
**Trigger:** {event that starts the process}  
**Expected Result:** {end state when successful}  
**Owner Agent:** {primary agent responsible}

#### Steps

| # | Step | Operator | Delegation | Input | Output | Success Criterion |
|---|---|---|---|---|---|---|
| 1 | {step name} | {Human/Agent/Code} | {manual/assisted/supervised/autonomous/automated} | {data} | {data} | {testable criterion} |
| 2 | ... | ... | ... | ... | ... | ... |

#### Guardrails

- **Escalation:** {when to stop and ask a human}
- **Timeout:** {max duration before alert}
- **Rollback:** {how to undo if something goes wrong}

#### Metrics

| Metric | Target | Current |
|---|---|---|
| Success rate | > 95% | — |
| Avg duration | < {time} | — |
| Human override rate | < 5% | — |
| Cost per execution | < ${amount} | — |
```

---

## Agent Contracts

Every AI agent integrated **into the application** (not METHOD development agents) must have a formal contract in `project/AI-INFRA.md`:

```markdown
### Agent Contract — {AgentName}

**Mission:** {one sentence describing the agent's purpose}  
**Model:** {default model used}  
**Delegation Level:** {assisted/supervised/autonomous}

#### Assigned Processes

| Process ID | Steps | Delegation |
|---|---|---|
| PROC-001 | 2, 3, 5 | autonomous |
| PROC-004 | 1 | assisted |

#### Scope

- **Can do:** {explicit list}
- **Cannot do:** {explicit list — prevents scope creep}
- **Tools authorized:** {MCP servers, APIs, Firestore collections}

#### Success Criteria

- {metric 1 — e.g., "Quote accuracy > 90%"}
- {metric 2 — e.g., "Response time < 5s"}

#### Stop Conditions

When to halt and escalate to human:
- {condition 1 — e.g., "Confidence score < 0.7"}
- {condition 2 — e.g., "Involves amount > $10,000"}
- {condition 3 — e.g., "3 consecutive failures"}

#### Memory & Context

- {what historical data the agent can access}
- {retention period}
```

---

## Process Execution Tracing

### What to Trace

For every process execution, store:

```typescript
// Firestore: teams/{teamId}/process_runs/{runId}
interface ProcessRun {
  // Identity
  processId: string;        // "PROC-001"
  processName: string;      // "Quote Generation"
  runId: string;            // auto-generated
  
  // Context
  teamId: string;
  triggeredBy: 'user' | 'agent' | 'system' | 'schedule';
  triggeredByUserId?: string;
  triggeredByAgentId?: string;
  
  // Timing
  startedAt: Timestamp;
  completedAt?: Timestamp;
  durationMs?: number;
  
  // Result
  status: 'running' | 'success' | 'failure' | 'escalated' | 'cancelled';
  
  // Steps
  steps: ProcessStepRun[];
  
  // AI Metrics
  llmCalls: number;
  totalTokens: number;
  totalCost: number;
  
  // Quality Signals
  humanOverrideCount: number;
  qualityScore?: number;        // 0-1, evaluated post-run
  
  // Diagnostics
  errorMessage?: string;
  errorStep?: number;
  escalationReason?: string;
}

interface ProcessStepRun {
  stepNumber: number;
  stepName: string;
  operator: 'human' | 'agent' | 'code';
  agentId?: string;
  
  status: 'pending' | 'running' | 'success' | 'failure' | 'skipped';
  startedAt: Timestamp;
  completedAt?: Timestamp;
  
  // If agent
  llmCalls?: number;
  tokensUsed?: number;
  costUsd?: number;           // step-level cost (tokens × pricing)
  
  // If human corrected
  humanOverride?: boolean;
  overrideReason?: string;
}
```

### Storage Strategy

| Phase | Strategy | Duration |
|---|---|---|
| First 3 months | Full traces (every execution) | Keep all |
| After stabilization | Aggregate metrics + sample traces | Weekly aggregates, keep 10% of traces |
| Production mature | Aggregates only + anomaly traces | Keep failures and edge cases |

### Querying Traces

```typescript
// Get process health for last 7 days
const sevenDaysAgo = Timestamp.fromMillis(Date.now() - 7 * 24 * 60 * 60 * 1000);

const runs = await db
  .collection(`teams/${teamId}/process_runs`)
  .where('processId', '==', 'PROC-001')
  .where('startedAt', '>=', sevenDaysAgo)
  .get();

const successRate = runs.docs.filter(d => d.data().status === 'success').length / runs.size;
const avgDuration = runs.docs.reduce((sum, d) => sum + (d.data().durationMs ?? 0), 0) / runs.size;
const overrideRate = runs.docs.reduce((sum, d) => sum + d.data().humanOverrideCount, 0) / runs.size;
```

---

## Process Health Monitoring

### Metrics Dashboard

Every AI-native app should expose a **Process Monitor** view (admin-only):

```
┌─────────────────────────────────────────────────┐
│ Process Monitor                     Last 7 days │
├─────────────────────────────────────────────────┤
│                                                 │
│  PROC-001 Quote Generation          ●● 98%  ✅ │
│  ├─ Step 1: Extract needs    [Agent]    ~2s     │
│  ├─ Step 2: Calculate price  [Code]     ~0.1s   │
│  ├─ Step 3: Human review     [Human]    ~4min   │
│  └─ Step 4: Send quote       [Agent]    ~3s     │
│                                                 │
│  PROC-002 Lead Scoring              ●● 94%  ✅ │
│  ├─ Step 1: Enrich data     [Agent]     ~5s     │
│  └─ Step 2: Score & classify [Agent]    ~1s     │
│                                                 │
│  PROC-003 Follow-up Sequence        ●○ 76%  ⚠  │
│  ├─ Step 1: Draft message   [Agent]     ~4s     │
│  ├─ Step 2: Review          [Human]    ~12min   │ ← friction
│  └─ Step 3: Send            [Code]      ~0.5s   │
│                                                 │
│  ⚠ PROC-003 step 2: 42% override rate          │
│    → Suggestion: improve draft quality           │
│      or promote to supervised delegation         │
│                                                 │
└─────────────────────────────────────────────────┘
```

### Health Thresholds

| Metric | 🟢 Healthy | 🟡 Warning | 🔴 Critical |
|---|---|---|---|
| Success rate | > 95% | 85-95% | < 85% |
| Avg duration vs target | < 120% | 120-200% | > 200% |
| Human override rate | < 5% | 5-15% | > 15% |
| Cost per execution vs budget | < 80% | 80-100% | > 100% |

---

## Process Improvement Loop

### Continuous Improvement Cycle

```
EXECUTE → TRACE → ANALYZE → PROPOSE → REVIEW → UPDATE
    ↑                                              │
    └──────────────────────────────────────────────┘
```

### Watson's Process Health Check (Bi-weekly)

1. **Pull execution traces** from `process_runs/` (last 2 weeks)
2. **Identify anomalies:**
   - Processes with success rate below threshold
   - Steps with unusually high override rates
   - Duration spikes or regressions
3. **Classify incidents:**
   - Agent error (prompt/model issue)
   - Process design flaw (step missing or wrong order)
   - Edge case (new scenario not covered)
4. **Propose improvements** → create intervention for Lucia
5. **Report** → `docs/process-health/YYYY-MM-DD-report.md`

### Lucia's Process Review (Monthly)

1. **Read** Watson's health reports
2. **Evaluate:**
   - Is the process well-structured?
   - Are delegations at the right level?
   - Should any step be promoted or demoted?
3. **Propose changes:**
   - New process needed?
   - Process needs restructuring?
   - Delegation level change?
4. **Mini-RFC** for major changes (e.g., promoting from assisted to autonomous)
5. **Update** `project/PROCESSES.md` and agent contracts in `project/AI-INFRA.md`

---

## Integration with Definition Pipeline

### Spec Chapter 13: Process Architecture

During the SPECIFY phase, apps with AI features must produce `specs/13-processes.md`:

```markdown
# 13 — Process Architecture

**Status:** [DRAFT] / [REVIEW] / [APPROVED]

## Process Registry

| ID | Process | Steps | Primary Agent | Delegation | Priority |
|---|---|---|---|---|---|
| PROC-001 | {name} | {count} | {agent} | {type} | P0/P1/P2 |

## Delegation Map

For each process, detail which steps are manual, assisted, supervised, autonomous, or automated.

## Agent Contracts

For each AI agent in the app, define mission, scope, limits, and success criteria.

## Observability Plan

How will process executions be traced? What metrics? What storage?

## Open Questions

- {unresolved process design decisions}
```

---

## Anti-Patterns

| ❌ Don't | ✅ Do |
|---|---|
| Put an agent on every step immediately | Start manual, earn autonomy with data |
| Define agent responsibilities vaguely | Write explicit contracts with scope limits |
| Skip execution tracing | Trace all runs — you can't improve what you don't measure |
| Promote to autonomous without data | Require 50+ successful supervised runs first |
| Ignore human overrides | Every override is a signal — analyze them |
| Design processes only at build time | Review and evolve processes monthly |
| Let agents decide their own scope | Humans define scope, agents execute within it |

---

## Glossary

| Term | Definition |
|---|---|
| **Process** | A sequence of steps that transforms input into a desired outcome |
| **Step** | A single unit of work within a process |
| **Operator** | The entity executing a step (human, agent, or code) |
| **Delegation** | The level of autonomy granted to an operator |
| **Agent Contract** | Formal specification of an AI agent's mission, scope, and limits |
| **Process Run** | A single execution of a process |
| **Override** | When a human corrects an agent's output |
| **Escalation** | When an agent stops and asks a human for guidance |
| **Promotion** | Moving a step from lower to higher autonomy |
| **Demotion** | Moving a step from higher to lower autonomy |

---

## Next Steps

- **Start:** Identify the 3-5 core processes of your app
- **Define:** Write process definitions in `project/PROCESSES.md`
- **Instrument:** Add execution tracing (start simple — log start/end/status)
- **Monitor:** Review traces after 2 weeks (Watson health check)
- **Improve:** Adjust processes based on data (Lucia monthly review)
