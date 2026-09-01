# METHOD v315.b

**Version:** 315.b  
**Epoch:** 3 (Modular & Multi-Entry)  
**Released:** 2026-09-01  
**Status:** ✅ Production-Ready

---

## Quick Start

**Load what you need. Nothing more.**

| I want to... | Load | Agent |
|---|---|---|
| **Define a new app** | `definition-method.md` → `project/definition/` | April + Nova |
| **Plan a sprint** | `sprints-method.md` → `journeys/` → `project/` | Junia |
| **Build a feature** | `method-core.md` → `project/DESIGN.md` → task | Brian / Teddy |
| **Design UI** | `design-method.md` → `project/DESIGN.md` | Nova |
| **Add AI capability** | `ai-infra-method.md` → `project/AI-INFRA.md` | Aiko |
| **Define app processes** | `process-method.md` → `project/PROCESSES.md` | Aiko + Lucia |
| **Review work** | `method-core.md` → `design-method.md` → task | Vera |
| **Sync METHOD** | `versioning.md` → BanaPilot or CLI | Lucia |
| **Debug** | `method-core.md` → `tests-method.md` | Watson |
| **Test** | `tests-method.md` | Sage |
| **Write copy / CUJ** | `agents-method.md` → `journeys/` | April |
| **Evolve METHOD** | ALL method files | Lucia |

---

## File Structure (17 docs + native layer)

```
CLAUDE.md                                       ← Repo root: canonical context (Claude Code auto-loads)
.claude/skills/                                 ← Agent personas as Claude Skills (Desktop)
.claude/agents/                                 ← 13 delegatable sub-agents + README (Claude Code)
.claude/commands/                               ← 7 rituals: /land, /ship, /plan-sprint, /review, /intervention, /port, /relay
.claude/settings.json                           ← Enforcement hooks (gates-as-hooks)
.claude/hooks/land.mjs                          ← Stop + SessionEnd: lands the slice on main (v313.a)
.claude/hooks/verify-gate.mjs                   ← The local gate: lane-aware checks + HEAD-pinned marker
.claude/hooks/no-mock-guard.ps1                 ← PostToolUse: SOUL non-negotiable #1 (Windows only — see intervention 2026-08-10)
.claude/hooks/ship-push.sh                      ← Stop hook: pushes committed work on feature branches
.claude/hooks/session-telemetry.mjs             ← Stop hook: appends session token/shape data

scripts/method-doctor.mjs                       ← `npm run doctor`: METHOD consistency checks (v313.b)

docs/METHOD/                                    ← Synced across all apps
  METHOD.md                  # Index, routing tables, innovations
  method-core.md             # Principles, tech stack, DoD
  agents-method.md           # 13 agents, roles, rituals, models
  agents-engineering-method.md  # Claude suite: Desktop + Code + Artifacts
  routing-method.md          # Entry points, agent routing, model routing (tiers), session telemetry
  ai-infra-method.md         # Multi-provider architecture
  sprints-method.md          # Sprint structure, gates
  tests-method.md            # Testing strategy
  design-method.md           # Global design constraints
  definition-method.md       # DISCOVER → SPECIFY → PROTOTYPE pipeline
  process-method.md          # Process-First governance
  prompting-method.md        # AI prompting activity logging
  claude-rules.md            # Claude working agreements (Desktop + Code)
  code-rules.md              # TypeScript strict, no any, Zod
  versioning.md              # Version scheme, sync protocol
  agent-launch-prompts.md    # Pre-built launch prompts per agent

docs/project/                                   ← App-specific (local)
  VISION.md, DESIGN.md, SCHEMA.md, FOCUS.md, STATE.md, ROADMAP.web.md, AI-INFRA.md
  telemetry/sessions.jsonl   # Session telemetry ledger (auto-appended by the Stop hook)
```

---

## What's New in v315.b
1. **The Debrief and the Flight Deck leave the code fence.** A `text` fence renders small, monospace and unstyled — no bold, no colour, no clickable paths — which is why the card was still not being read. Both cards are now **plain markdown** framed by `---` rules: a `### ✅ Debrief · {lane}` title carrying the status emoji, then fixed section landmarks 📊 `Avancement` · 🧠 `À retenir` · 🤝 `Décidé pour toi` · ⚖️ `Tu décides` · ➡️ `Suite` · ⚠️ `Vigilance`. The progress bar is 5 emoji blocks 🟩/⬜. The ≤ 68-character and ≤ 16-line caps are **dropped** — they were workarounds for the fence; the rule is now one idea per bullet, no paragraph, six blocks max. Paths become clickable links. The `▶ Prompt suivant` stays fenced, because it is copy-paste. Placeholders switch to `{braces}` so a renderer cannot swallow them as HTML tags.

## What's New in v315.a

1. **Operator Reporting — the Debrief closes every substantial answer.** The end-of-intervention card was rewritten around the three questions the operator kept having to ask by hand: *ce qui vient d'être fait · où ça met le projet global · ce que je dois décider maintenant*. `Avancement` positions the work in the global project with a real count (never an invented ratio); `À RETENIR` carries 2–4 one-line key facts including a `Décidé pour toi :` line for every reversible call made without asking; `TU DÉCIDES` surfaces the operator's calls, recommendation first. Hard line discipline (≤ 16 lines, ≤ 68 characters, no wrapping paragraph in the card) — the old `ORIENTATION` frame failed because prose blobs were stuffed into framed rows. Cadence: full card on substantial answers, one landing line on small ones, no card when nothing was done; delegated sub-agents never emit one. The **Flight Deck** is now the **pickup** card only (`/brief`, resume, cold start), which removes the two-overlapping-summaries redundancy. Canonical: `method-core.md` → "Operator Reporting".

## What's New in v314.b

1. **One sprint = one conversation = one branch = one worktree.** `agents-engineering-method.md` said "one thread per task" while `sprints-method.md` said "one sprint, one conversation" — mutually exclusive, and neither owned. Arbitrated once in **`sprints-method.md` → "Conversation Naming"**, now the canonical home; every other file points to it. The rule follows the two `Stop` hooks in `.claude/settings.json` (`ship-push.sh`, `session-telemetry.mjs`): both no-op on `main` and both push the current branch while **swallowing a rejected push**, so two sessions on one branch leave the second's work local and invisible while every downstream reader sees a stalled branch. Three lanes with ASCII titles (Sprint · Split · Intervention), the operator's `PILOT - `/`PROD - `/`AUTOM - `/`GROWTH - ` prefixes documented as the non-sprint form, and a **runtime** choice rule: sub-agent by default, workflow at ≥ 3 near-identical items, a new session only once one of four facts has already happened. No `Session:` field was added to the task template — `Tier:`, mandatory since v311.a, is filled in 0 of 85 app task files.
2. **"Délégation par défaut" is now the default, not a sentence to retype.** New section in the hub `CLAUDE.md` and `payload/CLAUDE.md`: coordination stays in the conversation, each delegation goes out on the cheapest model that meets the bar, a workflow at ≥ 3 similar items, a parallel session only on an observed trigger, and offloading context is a goal in itself.
3. **Count drift fixed:** `.claude/commands/` 4 → **6** rituals (`/relay`, `/ship` were undocumented), `.claude/agents/` 12 → **13** sub-agents, addon README 5 → **6** commands and 8 → **9** skills.

## What's New in v314.a

1. **The hub stops versioning 17 copies of itself.** 2,031 mirror files (`Apps/**/docs/METHOD/`, `Apps/**/.claude/`, seeded `PORT-MAP-TEMPLATE.md`) are gitignored — generated output, not versioned content. They were the cause of the drift, not a symptom: 18 places per rule change, 3,511-item release diffs. **After pulling, run `npm run sync-method:all` once per machine** to repopulate the mirrors on disk. Never author inside one.
2. **Doctor E8** fails if a mirror is ever tracked again; **W1** now means "stale generated output on this machine"; `Apps/_archived/**` is out of the sync scope.
3. **Landing gate lanes are depth-agnostic** — `docs/` and `.claude/` were root-anchored, so fleet-wide changes fell through to the app lane and would have triggered a build per nested app.

## What's New in v313.b

1. **`npm run doctor` — METHOD consistency is machine-checked.** Version stamps that disagree, a release with no changelog entry, an addon payload file that has drifted from the hub copy (how apps silently inherit a stale hook), a wired hook that does not exist, a dangling `docs/METHOD/*.md` reference: all now fail a check instead of surviving unnoticed. Warns on fleet mirrors behind the hub and on app roots the landing gate cannot verify. **Doctor green before you sync.**
2. **One metadata block per file** — four duplicate footer stamps removed; convention written down in `versioning.md` → "Per-file version stamps".

## What's New in v313.a

1. **Land, don't ship — the operator stops managing pull requests.** Every conversation ends on `main`; a PR is the **exception** (a decision only the operator can make), never the normal path. `.claude/hooks/verify-gate.mjs` classifies the diff into lanes (docs → nothing to run · tooling → `node --check` · app code → that app's `lint`/`typecheck`/`test`/`build`) and stamps `.method/verify-ok.json` **pinned to the HEAD sha**; `.claude/hooks/land.mjs` refuses to land without a green marker at the current commit, then fast-forwards `main` — never checking out the trunk, so it is worktree-safe. Fails **closed**: an app with no `typecheck`/`test`/`build` cannot land app code.
2. **The exception list, decided once instead of per PR.** schema/Firestore rules · auth, secrets, middleware · `SOUL.md` · dependency or lockfile changes · migrations · deploy/CI wiring · >60 files or >2000 deleted lines · `[no-auto-merge]`/`Needs decision` · red or stale verify · trunk conflict. Held back → one PR with the exact reason + a `### Needs decision` block. Deliberate override: `[land-anyway]` in the commit subject.
3. **Automatic:** `Stop` lands the docs/tooling lane every turn, `SessionEnd` attempts a full land, `/land` is the explicit close. `npm run land:sweep` shows every open PR and what blocks it, so a backlog cannot rebuild silently. Canonical: `method-core.md` → "Landing (the default) & the exception list" + "Slice discipline".

## What's New in v312.b

1. **Output Compression boundary.** One rule settles how terse an agent may be: **compress the conversation, never the artifact**. Chat narration during build/debug compresses freely; committed docs, EN/FR copy and Vera/Kasper verdicts do not — and code, commands, paths, errors and numbers stay verbatim everywhere. Third-party compression skills (Caveman & co.) are opt-in per session under the same boundary, measured against the telemetry ledger rather than a vendor's headline number. Canonical: `routing-method.md` → "Output Compression".

*(v312.a added the Session Telemetry Ledger — a Stop hook appending per-session token rows to `docs/project/telemetry/sessions.jsonl`, the feedback loop for Model Routing. v311.a added default Model Routing — T1/T2/T3 tiers, orchestrate high/execute cheap. v310.a added the `/relay` handoff ritual + `## Resume here` convention — see `versioning.md`.)*

## What's New in v309.a

1. **Runners & Orchestration layer** — Native sub-agents (`.claude/agents/`, default) → Agent Teams (parallel) → Cowork → Swanifly (one runner, not *the* engine). See the section below.
2. **Cohort 10 → 12** — Promoted **Gordon** (Sales/Marketing) + **Kasper** (Security) to sub-agents + Skills. **Riley** (API/automation) stays a demoted advisory hat.
3. **Native sub-agents + slash-commands** — Delegatable in Claude Code via `.claude/agents/`; rituals as `/plan-sprint`, `/review`, `/intervention`, `/port`.
4. **Parallel + fleet model** — Worktree isolation, fan-out, dependency gates, merge policy, multi-repo dimension.
5. **Gates** — only the no-mock guard (`PostToolUse`), the `permissions.deny` Bash blocklist and per-agent `tools:` frontmatter are wired in `.claude/settings.json`. There is no `PreToolUse` block; DoD and write-path scoping are prose.
6. **Design Port Loop** — PORT-MAP-first, one-screen-per-PR, MUI-hex token bridge.
7. **AI infra refresh + stack caveat** — `ai-infra` re-owned to Aiko, 2026 model lineup; declared stack = TARGET (detect actual stack first).

---

## Core Principles

1. **Docs-First** — Write docs before code. Update docs with code.
2. **Focus-First** — One objective at a time. The ratchet moves forward only.
3. **Process-First** — Business processes are first-class citizens.
4. **Adaptive** — Core Loop handles most work; specialists join when needed.
5. **Lightweight** — No heavy process unless necessary.
6. **Local-First** — Everything lives in the repo. Markdown is truth.

---

## Agent Cohort (13)

Each agent runs as a Claude **Skill** (`.claude/skills/`, Desktop) AND a delegatable native **sub-agent** (`.claude/agents/`, Claude Code — web + Cowork).

| Group | Agents |
|---|---|
| **Core Loop** | Junia (planning), Brian (web dev), Vera (review) |
| **Managers** | April (vision), Nova (design), Lucia (method) |
| **Specialists** | Teddy, Aiko, Watson, Sage, Gordon (sales/marketing), Kasper (security), Iris (research) |

> **Advisory hat (not executable):** Riley (API & multi-agent automation) is wielded in a
> Desktop chat — no sub-agent or Skill. See `agents-method.md`.

---

## The Claude Suite

| Surface | When to use |
|---|---|
| **Claude Desktop** 🧭 | Plan, scope, review, design (Artifacts) — you decide here; **Cowork** = its local Code tab |
| **Claude Code** ⚙️ | Multi-file build, tests, autonomous sprint execution via native sub-agents |
| **Claude Design** 🎨 | Interactive prototypes as Artifacts, from the spec + M3 tokens |

---

## Runners & Orchestration

The METHOD is **runner-agnostic** — the same cohort + task docs execute on any of four runners. **Swanifly is one runner, not *the* engine.**

| Runner | What it is | Parallel? |
|---|---|---|
| **Native sub-agents** (default) | `.claude/agents/*.md` delegated inside one Claude Code session | Sequential |
| **Agent Teams** | Sub-agents fanned out across git worktrees | ✅ true parallel |
| **Cowork** | Desktop's local Code tab (same `.claude/agents` + `.claude/commands`) | Sequential |
| **Swanifly** | `Swanifly/web/lib/engine/` spawns the `claude` CLI per persona for unattended runs | ✅ orchestrated batch |

**Flow (Junia orchestrates):** `/plan-sprint` → delegate to owner sub-agents (independent tasks fan out as a team) → `sage` tests → `watson` if red → `/review` (Vera, read-only) → merge. Gates (`sage`→tests-only, `vera`→review-only, Bash blocklist) are enforced as `.claude/settings.json` hooks.

**See:** `agents-engineering-method.md`, `.claude/agents/README.md`.

---

## Version Information

**Current:** 315.b  
**Previous:** 315.a → 314.b → 314.a → 313.b → 313.a → 312.b → 312.a → 311.a → 310.a → 309.a → 308.a → 307.a → 305.a → 304.a → 303.a → 302.a

**See:** `versioning.md` for full changelog.

---

**Owner:** Lucia  
**Last Updated:** 2026-09-01  
**Status:** ✅ Production-Ready
