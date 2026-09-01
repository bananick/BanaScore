# Definition Pipeline Method

**Owner:** April + Nova  
**Version:** 308.a  
**Last Updated:** 2026-06-01  
**Purpose:** Structured pre-BUILD pipeline to define, specify, and prototype apps

---

## Overview

Every app must pass through 3 phases before BUILD begins.  
This prevents building the wrong thing by forcing clarity early.

```
DISCOVER ──→ SPECIFY ──→ PROTOTYPE ──→ BUILD
  (1 week)    (1-2 weeks)   (3-5 days)
```

**Why:** Building without specs is gambling. Specs without prototypes are blind. Prototypes without research are guessing.

---

## Phase 1: DISCOVER

**Agent:** April  
**Output folder:** `docs/definition/fundations/`  
**Duration:** ~1 week  
**Gate:** Human validates brief

### Deliverables

| File | Content | Size Guide |
|---|---|---|
| `brief.md` | Problem, idea, core principles, MVP scope, tech direction | 2-4 KB |
| `competitive-analysis.md` | 3-5 competitors, positioning matrix, differentiation | 2-4 KB |
| `master-prompt.md` | System prompt for AI agents on this project | 1-2 KB |

### Brief Template

```markdown
# Brief — {AppName}

## Problem
{What pain point does this solve?}

## Idea
{One-paragraph elevator pitch}

## Core Principles
1. {principle}
2. {principle}
3. {principle}

## MVP Scope
- {feature 1}
- {feature 2}
- {feature 3}

## Non-Goals (v1)
- {explicitly out of scope}

## Tech Direction
- {stack choices if any}
```

---

## Phase 2: SPECIFY

**Agent:** April (content) + Nova (design chapters) + Aiko (AI chapters)  
**Output folder:** `docs/definition/specs/`  
**Duration:** 1-2 weeks  
**Gate:** Human validates spec book

### Specification Book Structure

Write chapters as individual markdown files. Not all chapters are required — use what's relevant.

| # | Chapter | Required? | Content |
|---|---|---|---|
| 01 | `01-vision.md` | ✅ | Executive summary, problem, value prop, success metrics |
| 02 | `02-tech-stack.md` | ✅ | Architecture, frameworks, hosting, CI/CD |
| 03 | `03-data-models.md` | ✅ | Collections, schemas, relationships, Zod types |
| 04 | `04-personas.md` | ✅ | 2-4 user archetypes with goals and pain points |
| 05 | `05-features.md` | ✅ | Module inventory with priority (P0/P1/P2) |
| 06 | `06-navigation.md` | ✅ | Routes, views, navigation patterns |
| 07 | `07-design-system.md` | ✅ | M3 tokens, color palette, typography, components |
| 08 | `08-ai-strategy.md` | If AI | Models, capabilities, costs, prompt templates |
| 09 | `09-cuj.md` | ✅ | Critical User Journeys (A→Z flows) |
| 10 | `10-business.md` | Optional | Pricing, monetization, market strategy |
| 11 | `11-security.md` | Optional | Auth, data protection, GDPR |
| 12 | `12-scaling.md` | Optional | Performance targets, caching, CDN |
| 13 | `13-processes.md` | If AI | Process registry, delegation map, agent contracts (see `process-method.md`) |
| 14-19 | Domain-specific | Optional | Whatever the app needs |

### Chapter Template

```markdown
# {Chapter Title}

**Status:** [DRAFT] / [REVIEW] / [APPROVED]

## Summary
{2-3 sentences}

## Details
{structured content}

## Open Questions
- {anything unresolved}
```

---

## Phase 3: PROTOTYPE

**Agent:** Nova (design) + Brian (implementation)  
**Output folder:** `docs/definition/prototypes/`  
**Duration:** 3-5 days  
**Gate:** Human validates prototype

### Rules

Prototypes are generated as **interactive Claude Artifacts** in Claude Desktop (Nova). See
`design-method.md` → "Prototyping — Claude Artifacts" for the token + class contract.

1. **Single-file Artifact** — React or HTML in one Artifact; no repo build step to preview
2. **Design system via CSS variables** — use `var(--bg)`, `var(--pri)`, `var(--text)`, etc. — never hardcode colors
3. **All navigation functional** — clicking links switches views
4. **Realistic data** — use real app names, real numbers, real content (not lorem ipsum)
5. **Every key view prototyped** — not just the happy path
6. **Mobile top-nav-only** — mobile prototypes must NOT use a bottom nav bar. Navigation tabs go as a compact horizontal strip below the status bar, above the scrollable content.
7. **Dark mode + `prefers-reduced-motion`** respected from the start

> [!TIP]
> Generate the Artifact from the relevant spec chapter + the M3 token contract in
> `design-method.md`. Iterate live with the operator; on approval, export the Artifact and
> record the resolved token values in `project/DESIGN.md`.

### Output

```
docs/definition/prototypes/
├── {view}.artifact.tsx   (exported Artifact source per key view, or)
└── prototype.html        (single exported HTML walkthrough)
```

> [!IMPORTANT]
> The approved Artifact + its resolved tokens are the handoff Brian/Teddy implement against.
> No separate proto-kit tuner or sync step — the Artifact regenerates live in the conversation.

### What to Prototype

- Main dashboard / home
- Key feature views (the "money screens")
- Settings / configuration
- Empty states
- Error states (optional but recommended)

---

## Pipeline Tracking

Track progress in `project/FOCUS.md` and in BanaPilot (if available).

### Status per Phase

| Status | Meaning |
|---|---|
| `[ ]` | Not started |
| `[/]` | In progress |
| `[x]` | Complete, awaiting gate |
| `[v]` | Gate passed (human validated) |

### Example

```markdown
## Definition Pipeline
- [v] DISCOVER — Brief validated Mar 1
- [v] SPECIFY — 12 chapters validated Mar 10
- [x] PROTOTYPE — 7 views ready for review
- [ ] BUILD — Sprint 001 pending
```

---

## Integration with Sprints

1. Definition work happens **before** Sprint 001
2. It can be tracked as "Sprint 000" or as interventions
3. Once PROTOTYPE gate passes → Junia plans Sprint 001
4. Sprint 001 tasks reference spec chapters: `See: specs/06-navigation.md`

---

## Anti-Patterns

| ❌ Don't | ✅ Do |
|---|---|
| Skip DISCOVER and jump to code | Write brief first, validate with human |
| Write 100-page specs nobody reads | Write concise chapters with clear structure |
| Prototype with React/Next.js | Use plain HTML for speed |
| Use placeholder text ("Lorem ipsum") | Use realistic content |
| Prototype only happy path | Cover key flows + empty/error states |
| Start BUILD without human gate | Get explicit "go" on prototype |
