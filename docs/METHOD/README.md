# METHOD v339.a

**Version:** 339.a  
**Epoch:** 3 (Modular & Multi-Entry)  
**Released:** 2026-11-04  
**Status:** ✅ Production-Ready

---

## Quick Start

**Load what you need. Nothing more.**

| I want to... | Load | Agent |
|---|---|---|
| **Define a new app** | `definition-method.md` → `project/definition/` | Nova (vision: the operator) |
| **Plan a slice or a sprint** | `sprints-method.md` → `journeys/` → `project/` | Junia |
| **Build a feature** | `method-core.md` → `project/DESIGN.md` → task | Brian |
| **Design UI** | `design-method.md` → `project/DESIGN.md` | Nova |
| **Add AI capability** | `ai-infra-method.md` → `project/AI-INFRA.md` | Brian |
| **Define app processes** | `process-method.md` → `project/PROCESSES.md` | Junia |
| **Review a slice** | `method-core.md` → `design-method.md` → task | Vera |
| **Prove a journey** | `tests-method.md` → task → `journeys/` | Sage |
| **Study / client deliverable** | `method-core-lite.md` → `project/STATE.md` | Iris |
| **Sync METHOD** | `versioning.md` → `npm run doctor:fleet` → `sync-method:all:dry` | Lucia |
| **Debug** | `method-core.md` → `tests-method.md` | Watson |
| **Write copy (EN/FR), sell, run ads** | `agents-method.md` → `project/VISION.md` → `docs/growth/` | Gordon |
| **Evolve METHOD** | `versioning.md` → the files the change touches | Lucia |

---

## File Structure (18 docs + native layer)

```
CLAUDE.md                                       ← Repo root: canonical context (Claude Code auto-loads)
.claude/skills/                                 ← 13 capability skills (no persona stubs since 327.a)
.claude/agents/                                 ← 19 active sub-agents + README (3 dormant in .claude/_dormant/)
.claude/commands/                               ← 13 rituals: /land, /ship, /intervention, /plan-sprint, /review, /brief, /retro, /hire, /clean, /project, /projects (hub only), /port (optional), /relay (optional)
.claude/settings.json                           ← Enforcement hooks (gates-as-hooks)
.claude/hooks/land.mjs                          ← Stop + SessionEnd: lands the slice on main (v313.a)
.claude/hooks/verify-gate.mjs                   ← The local gate: lane-aware checks + HEAD-pinned marker
.claude/hooks/no-mock-guard.ps1                 ← PostToolUse: SOUL non-negotiable #1 (Windows only — see intervention 2026-08-10)
.claude/hooks/ship-push.sh                      ← Stop hook: pushes committed work on feature branches
.claude/hooks/session-telemetry.mjs             ← Stop hook: appends session token/shape data to a local, gitignored ledger

scripts/method-doctor.mjs                       ← `npm run doctor`: METHOD consistency checks (v313.b)

docs/METHOD/                                    ← Synced across all apps
  METHOD.md                  # Index, routing tables, innovations
  method-core.md             # Principles, tech stack, DoD
  agents-method.md           # 19 active + 3 dormant agents, roles, rituals, models
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
  tone-method.md             # Voice frame, tone review, the evolution loop (Lise)
  chief-contract.md          # What Chief reads, and the rule for changing it (D24)

docs/project/                                   ← App-specific (local)
  VISION.md, DESIGN.md, SCHEMA.md, FOCUS.md, STATE.md, ROADMAP.web.md, AI-INFRA.md
  telemetry/REPORT-YYYY-MM-DD.md  # Penny's periodic token report (committed)
  coaching/RETRO-YYYY-Www.md       # Oscar's weekly retro (committed; hub)
  telemetry/sessions.jsonl   # Session telemetry ledger (auto-appended by the Stop hook; local, gitignored — hooks no longer commit it (318.a), untracked in a follow-up)
```

---

## What's New in v339.a
**Agathe 🎓 joins the cohort — 19 active mandates, on probation.** Recruit & train: `/hire {domain}`, an entrance exam on real closed cases, a learning store versioned in the app with a two-speed gate, and a score that can park an agent, herself included. Crew checks C1–C6 in the doctor, WARN only. See `METHOD.md` → "What's New in v339.a".

## What's New in v338.a
**A main checkout out of step with the trunk is said at session start.** New worktrees inherit the main checkout's ignored `.claude/` files; when they differ from the trunk's payload, the startup hook names them and the fix, `install.mjs --seeded-only`. `session-close` now reaches the apps, merge path included, by the operator's call. See `METHOD.md` → "What's New in v338.a".

## What's New in v337.d
**Régine's night pass.** At 04:00 Régine reviews every session (git + transcripts that moved), pushes unpushed commits, archives finished sessions already fully on origin and republishes « Régie des sessions » with one GO to paste per session; `scripts/regie/gitstate.sh` is versioned in the hub. See `METHOD.md` → "What's New in v337.d".

## What's New in v337.c
**The review page.** Beyond 4 decisions, or for a result not built yet, a review page replaces the quiz: eight invariants, a template (`templates/review-page.html`), five formats and an open census. See `METHOD.md` -> "What's New in v337.c".

## What's New in v337.b
**`wip-sync` survives a path git cannot index.** A stray `nul` (or any Windows device name) is skipped instead of aborting the whole snapshot of uncommitted work, and the error names its cause. See `METHOD.md` → "What's New in v337.b".

## What's New in v337.a
**`/projects`, the fleet board.** Every chantier fiche on the machine in one snapshot and one desk; answers go back through the sub-session, never into the fiche by hand; `chantier-status/1` gains optional board fields. See `METHOD.md` → "What's New in v337.a".

## What's New in v336.d
**The compact closing card, by default.** Mission cards, Debriefs and control towers render a fixed ~2 k-token `show_widget` template (`templates/closing-card-compact.html`); the ~6 k full card only with visual proofs. See `METHOD.md` → "What's New in v336.d".

## What's New in v336.c
**Brand voices come in three layers — family · brand · signer.** One hub family file, a **Signers** table in each brand file, the signer's file kept constant; precedence channel > brand > signer > family; every voice listed in the hub registry `docs/project/brand/VOICES.md` (`tone-method.md` § 1).

## What's New in v336.b
**Every agent has a character, a lesson and a wink.** Three new `## Identity` lines per agent — who it is like, what it teaches, how it makes you smile — used at the occasion, in the conversation's language. See `METHOD.md` → "What's New in v336.b".

## What's New in v336.a
**Finished work closes itself.** A LANDED sub-session deletes its branch, reports up and archives itself (`node .claude/hooks/session-close.mjs`); an exception PR merges after `kasper` approves it, unless it is irreversible in production — then one quiz. See `METHOD.md` → "What's New in v336.a".

## What's New in v335.b
**The operator lever.** Every answer serves the operator's decision speed, five delegates hand back closing-ready reports, and the coach tip moves to Oscar's retro. See `METHOD.md` → "What's New in v335.b".

## What's New in v335.a
**Answers end with Fait / Suite: the session's fate first.** Suite's bullet 1 is one of six fates (🗄️ 💬 🧪 🔑 ⏳ 🔁), each with its ready-made kit. The title carries a state word, and the mission card has four parts. See `METHOD.md` → "What's New in v335.a".

## What's New in v334.e
**Jest and vitest lanes run serially with a 30 s timeout** — the gate appends `--runInBand` (jest) or `--no-file-parallelism` (`vitest run`) plus `--testTimeout=30000` to a plain test script, so load on the machine stops producing false reds. See `METHOD.md` → "What's New in v334.e".

## What's New in v334.d
**Lint is red only on new problems** — per (file, rule), HEAD vs the merge base, on the changed files; a file already in debt no longer holds a branch that does not add to it; an eslint crash is red. See `METHOD.md` → "What's New in v334.d".

## What's New in v334.c
**Lint judges the diff, not the lane** — `verify-gate.mjs` lints a root's changed files only when its `lint` is a plain `eslint …` command; pre-existing lint debt no longer holds an unrelated landing, an error in a changed file is still red. Trigger: BanaLog `backend/` (PR #128). See `METHOD.md` → "What's New in v334.c".

## What's New in v334.b
**A sub-session is archived only once traced; a held slice is driven to an exit** — `sprints-method.md` → « Archiving » gains check 5 « Traced » and the « held slice is driven to an exit, never left 🟡 » clause (no `gh pr merge --admin`, no hand-run branch delete). Operator ruling 2026-10-27; IMP-025.

## What's New in v334.a
**At most two heavy gates at once on the machine** — `verify-gate.mjs` takes one of two machine-wide heavy slots (`heavy-slot.mjs`, new hook, `~/.claude/heavy-slot/`) after the repository lock; a third gate waits and starts when one frees, gives up after 40 min ("heavy-slot busy", nothing ran). Low RAM: one at a time. Heavy commands run by hand stay outside: `node .claude/hooks/heavy-slot.mjs run -- <cmd>` — but never wrap `/land` or `npm run verify` (they take their own slot). See `METHOD.md` → "What's New in v334.a".

## What's New in v333.c
**Vera and Oscar read the notes left for them in the Cockpit** (`/review`, `/retro`, hub only — operator data, answered by note id and recorded on the page), and **`/retro` works from the trunk** (a fresh worktree at `origin/main` when the hub checkout is stale or dirty). See `METHOD.md` → "What's New in v333.c".

## What's New in v333.b
**Régine's `wip(rescue)` push may skip the app's pre-push gate** (`SKIP_QUALITY_GATES=1`, that commit only, never `--no-verify`, never forced): bananaevents' pre-push outlasted every pass and left rescue commits local. The proto leak guard and the `/land` gate still run. See `METHOD.md` → "What's New in v333.b".

## What's New in v333.a
**Stella 🔭 joins the cohort — 18 active mandates.** Organic visibility gets one owner: classic SEO, GEO/AEO (visibility in AI answers), social search, forums, directories & entity, blog and digital PR. She takes `seo-audit` and `search-growth` from Gordon, who keeps offer, funnel, copy and paid ads; she drafts, and nothing is published or submitted without the operator's GO per batch. See `METHOD.md` → "What's New in v333.a".

## What's New in v332.a
**`/land` stops holding branches for a benign reason.** A dependency/lockfile change or a big diff lands by itself after the verify gate; only schema/rules, auth/secrets, `SOUL.md`, migrations, deploy wiring and the explicit holds still wait for the operator. See `METHOD.md` → "What's New in v332.a".

## What's New in v331.a
**Régine deletes integrated branches, through `branch-sweep.mjs --apply` only** — `is-ancestor` of the trunk, or a squash whose `merge-tree --write-tree` equals the trunk's tree; `backup/*`, a dirty or active worktree, an open PR and a running session block; every deletion is logged to `<git-common-dir>/branch-deletions.log` first. See `METHOD.md` → "What's New in v331.a".

## What's New in v330.b
**Proof asks are findable.** Every request to prove or accept a journey carries a 🔎 Preuve à jouer block — real URL(s), numbered steps → expected, evidence links, what is not proven — and the chantier fiche requires `review[].urls` on a result. See `METHOD.md` → "What's New in v330.b".


## What's New in v330.a
**Session closings by type.** An autonomous mission closes with a ≤ 8-line mission card, a chantier supervisor with a
control tower, the full Debrief stays for handoffs; every closing puts the one-click proof first, ends with a « go »
quiz, and prepares the path whenever the operator must act. See `METHOD.md` → "What's New in v330.a".

## What's New in v329.a
**The sidebar in three zones.** Pinned holds only what waits on the operator (`· 🟡` / `· 🔴`), supervisors included —
reopening 322.h's « supervisors always pinned »; each supervisor lives in its chantier group (a nested one keeps its pin
until detached); `🎯 Missions libres` keeps what is alive and recent, because the 20:07 pass now rescues, then archives,
every `· 💤` session idle > 24 h, with a shell for the rescue only. See `METHOD.md` → "What's New in v329.a".

## What's New in v328.a
**The Chief contract.** Chief 🥷 (`bananick/chief`) reads the fleet under a formal read contract — new
`chief-contract.md`: every artefact it reads, per app and in the hub, the fields relied upon, a stability mark,
and the rule that a release altering one says so (`**Chief contract impact.**`). Chief is read-only and acts only
through METHOD rituals; the Cockpit stays the source of fleet data and scoring (D24). See `METHOD.md` → "What's New in v328.a".

## What's New in v327.a
**Maya 🧭, Alba 🖌️ and Hugo ⚙️ join the cohort (17 active + 3 dormant); Nova drops from 25 assignments to 9; the ten colliding mandates each get one owner; the 14 persona Skill stubs are deleted.** UX research & IA (Maya, opus), the brand in use (Alba, sonnet), and the METHOD's own machinery (Hugo, sonnet — 78 commits that had no owner). Riley, a name with no file, is gone: integration is Brian's. The always-loaded description surface shrinks **27.5 %** (14,033 → 10,171 chars) — the deleted stubs pay for the recruits 5.7× over. See `METHOD.md` → "What's New in v327.a" and `docs/interventions/2026-10-19-Lucia-cohort-restructure.md`.

## What's New in v326.a
**Lise 🗣️ joins the cohort (14 active + 3 dormant, opus): tone and voice.** New `tone-method.md` and two templates — one voice file per brand persona,
hosted in each repo at `docs/project/brand/tone/`, reviewed by Lise and evolved by a ledger-driven loop the operator ratifies. A rule in
`CLAUDE.md` → Agent Cohort summons her. See `METHOD.md` → "What's New in v326.a".

## What's New in v325.c

1. **Context diet, slice 2** — the root `CLAUDE.md` 32,683 → 12,480 B (−61.8 %) and the five `payload/snippets/*.md` 21,073 → 6,936 B (−67.1 %); reference material now sits in the METHOD file that owns it, behind a one-line pointer. Startup reads `STATE.md` → "§ Resume here" + `FOCUS.md` → "§ The north star" instead of both files whole (55,470 → 3,689 B). All 13 `Entry files:` lines are section-scoped. **The delegation default becomes a four-condition test** (verbose-and-discardable · self-contained · summarisable · needs a tool restriction); tiers, Workflow rules and the 2-round review cap unchanged. `npm run doctor` E16 is now an **error** at 13,312 B.

## What's New in v325.b

1. **The verify gate classifies nested YAML data of a verifying root** — a `*.ya?ml` below a verifying repo root runs that root's checks instead of failing closed; root-level YAML and YAML under a non-verifying root stay fail-closed (Chief `memory/facts.yaml`).

## What's New in v325.a

1. **A session that waits on the operator is pinned while it waits** — pinned = supervisors + any session whose title ends with ` · 🟡` (it appends the 🟡 and pins itself right before an `AskUserQuestion`, removes both right after the answer; Régine is the safety net; a 🟡 session is never 💤 nor archived by a clock).
2. **`/clean` and `/project`** — Régine on demand as a sub-agent, and the chantier opening by the contract; 11 rituals.

## What's New in v324.c

1. **Context diet, slice 1** — `versioning.md` 180.7 → 29.5 kB (older releases in `docs/archive/METHOD/versioning-history.md`); 10 agents' `Entry files:` name sections, not whole files, under a `read ≤ 12 kB of reference` cap; median sub-agent launch 102.7 → 61.5 kB. `npm run doctor` E16 warns when `CLAUDE.md` is over 8,192 B.

## What's New in v324.b

1. **The landing gate verifies a no-deps repo with Node alone** — an app root without `node_modules` whose diff is plain Node JS gets `node --test` on every changed `node:test` file (found by content, not name) instead of `blocked`, plus `node --check` as an extra check that never verifies alone; skipped npm scripts are named `no-deps`, the report says `⚠ NO-DEPS`; a JS diff with no `node:test` file, non-Node files and other test runners still fail closed (`verify-gate.mjs`, `tests/verify-gate.no-deps.test.mjs`).
2. **BanaLog receives the sync again** — off `SKIP_REPOS` (`scripts/lib/fleet-skip.mjs`); BanaLazer stays.

## What's New in v324.a

1. **Régine 🧑‍🔧 — Régie** joins the cohort (13 active + 3 dormant, sonnet): session, worktree and work-in-progress hygiene. She owns the sidebar pass (`rangement-barre-laterale` now runs as her), routines close their previous runs via `list_task_runs`, and the clocks — 24 h `💤`, 72 h rescue + archive, merged/`✅` archive — always rescue (`wip(rescue)` pushed) before archiving. Archive, never delete. Why: `docs/interventions/2026-10-17-Junia-hygiene-sessions.md`.

## What's New in v323.b

1. **The landing gate files study data as doc** — `*.csv`, `*.tsv`, `*.geojson` and a nested `.json` no app root owns no longer fail `/land` closed as "unclassifiable"; app json, root json and `firestore.indexes.json` keep their lane (`verify-gate.mjs`, hub + addon payload).

## What's New in v323.a

1. **The sidebar contract reaches hand-made sessions at birth** — a `SessionStart` (`startup`) hook, `session-sidebar.mjs`, makes a session title itself `{repo icon} {objet}` and file itself under `🎯 Missions libres` on its first reply; the janitor stays the safety net.

## What's New in v322.h

1. **The sidebar contract** — only supervisors are pinned, one alpha-sorted group per chantier, sub-session titles slice-code first (`D1 👩‍💼 Offre Santa · 🟡`), `🎯 Missions libres` for sessions outside a chantier.
2. **One icon per repo** — `docs/METHOD/repo-icons.json`, the same map for every supervisor; a supervisor never nests under another session; a janitor re-applies the contract every 2 h.

## What's New in v322.g

1. **Operator input is an inbox** — the chantier dashboard is read-only; the supervisor asks in batches of ≤ 4 closed questions ordered by blocking cost, and pushes only when a slice is actually blocked.
2. **Reversible decisions default after 2 h** — fiche `decisions[]` gains `reversible` + `deadline` and the status `defaulted`; only the conflict gate blocks a slice.
3. **The operator reviews only client/money results** — `review[].needsOperator`; the rest is accepted by Vera + Sage and stays reopenable. A v1 fiche adds the new fields on its next write.

## What's New in v322.f

1. **A per-repository landing lock** — `gate-lock.mjs` serializes the heavy gate across worktrees (`<main>/.method/gate.lock`, heartbeat liveness); a scheduling aid, never a check.
2. **The gate takes three app fixes** — npm-workspaces roll-up (fail-closed), a tooling lane for root `*.rules` (still held by the `schema` exception), `.snap` as code; `proto/` exempt from the no-mock guard.
3. **Six names leave `SKIP_REPOS`** — fleet sync after each app's own cleanup (IMP-012).

## What's New in v322.e

1. **Supervision v2 proof fixes** — the chantier supervisor finds a fiche by branch and addresses a sub-session by its `ListAgents` name; a sub-session announces itself first ("adopt {slice}") and writes `/land` into `progress.doing` before landing.
2. **No `▶ Prompt suivant` in a chantier** — the next step is the supervisor's own action (task chip or typed `SendMessage`) and a `Suite` row of the pilot dashboard.

## What's New in v322.d

1. **GitHub mirrors active work** — `wip-sync.mjs` (Stop, on by default, fail-closed guards, kill switch
   `git config wip-sync.enabled false`) pushes uncommitted work to `refs/wip/<branch>`; rejected pushes are reported.
2. **Three exits per branch** — landed-and-deleted, draft PR when held, abandoned-and-deleted; `branch-sweep.mjs` at
   SessionStart cleans what `land.mjs` landed; "Travail actif" in the Flight Deck.

## What's New in v322.c

1. **Questions are quizzes, never prose** — every question to the operator is prepared and asked with `AskUserQuestion` (recommended first), never written into the chat text.

## What's New in v322.b

1. **Fiche `agent` = a slug** — a cohort id or an app domain owner declared in its business pack; no longer a 12-id enum.
2. **Automatic archiving** — the chantier supervisor archives a finished sub-session on its own (landed and on
   `origin/main`, idle, clean worktree, nothing open, named in its Debrief); a missing condition turns the title 🟡.

## What's New in v322.a

1. **Supervision v2** — one fiche per chantier sub-session (`chantier-status/1`, the only report), a `Stop` hook that
   blocks an invalid or stale fiche, an event-driven supervisor on the session tools, `{avatar} {slice} {title} · {state}` titles.

## What's New in v321.c

1. **Telemetry v3** — sessions attach to a journey through `.method/journey` (Cadrage, `npm run method:journey`) and
   carry tool / MCP / skill / command / launch counters, flow and result; names and counters only. Cockpit enrolment.

## What's New in v321.b

1. **Known domain owners** — `agents-method.md` lists the app-level owners (bananaevents: sacha, riley, elena,
   gordon), which `gordon.md` wins where, and how to declare one; none joins the cohort or the payload.

## What's New in v321.a

1. **The chantier** — ≥ 2 code-writing slices → one supervision session (opus, no code) + one sub-session per
   slice (sonnet, own branch + worktree), grouped as `{app} · {chantier}`; sub-agents stay the default inside a slice.

## What's New in v320.d

1. **The verify gate ignores deleted paths** — a deleted `package.json` is no longer an app root, deletions are
   counted apart (`deleted` in the marker), and a deletion-only change is green; `land.mjs`'s mass-deletion exception is unchanged.

## What's New in v320.c

1. **`/retro` feeds the "Swanifly Rétro" dashboard** — a JSON doc beside the retro file, published by the
   coordinator; the operator's answers in the page are read first by next week's retro.

## What's New in v320.b

1. **Hub repo renamed Swanifly** (Patch). The fleet skip list knows both names, repo URLs and the sync commit message
   say Swanifly, and `scripts/ops/rename-hub-to-swanifly.ps1` performs the operator's side of the rename.

## What's New in v320.a

1. **Oscar — the coach** joins the cohort (12 active + 3 dormant, opus): a weekly `/retro` (9th ritual),
   on demand after a slice that closes a journey, never once per Debrief. One file per week,
   `docs/project/coaching/RETRO-YYYY-Www.md` — objectives vs journeys proven, focus, three sourced
   observations, one habit to change, 0–2 METHOD proposals for Lucia.

## What's New in v319.b

1. **The ledger says which agent ran.** Each ledger row (`schemaVersion` 2) carries `subAgents.byAgent` — one
   entry per sub-agent transcript: `agentType`, a ≤ 80-char task label, `workflowId`, `requestedModel`, the
   `model` that ran (majority by cost), `pin` (`explicit` / `frontmatter` / `unpinned`), calls, tokens and
   timestamps — and a complete `subAgents.byType` roll-up keyed `<agentType>|<model>`. `npm run telemetry:report`
   prints "by agent type × model" and "per sprint / branch" tables from the ledger alone, so the question
   "did anything inherit opus?" no longer needs the transcripts. v1 rows still parse. No prompt text enters the row.

---

## What's New in v319.a

1. **Token economy rules** (`routing-method.md` → "Token economy"), from a 14-day study: $14,714
   API-equivalent, sub-agents + Workflows 86.2 % (opus 50.2 %), cache 85.6 % of cost. A review→fix
   loop stops after 2 rounds; tiers beat modes (Ultracode); a Workflow announces its cost at Cadrage
   and stays < 10 agents; minimal sub-agent context; `MEMORY.md` ≤ 5 kB; cost per finished task is
   the unit.
2. **A user-level default sub-agent model** (sonnet, `install.mjs --user`) backs "every sub-agent names
   its model" — 122 truly unpinned sub-agents ran on opus ($1,456) in 14 days. The doctor warns when it is missing and when
   a `MEMORY.md` passes 5 kB.
3. **Penny — telemetry & token-economy coach** joins the cohort (11 active + 3 dormant, sonnet): owns
   `npm run telemetry:report` (model / inheritance split, `--days`, `--json`), a periodic committed
   report and the J+7 measurements; coaches; proposes METHOD changes to Lucia.
4. **The ledger reaches more of the fleet** — `LEDGER_ONLY_REPOS` get the telemetry hook alone, and
   `telemetry:report` (`--days`, `--since`, `--json`) names any "Ledger gap".

## What's New in v318.a

1. **Cohort: 10 active mandates + 3 dormant, fitted to 120 days of practice.** Iris returns as *Study
   & Deliverables* (client-grade studies, sourced numbers, `inconnu` when unknown, and the new
   **anonymisation/GDPR rule**); Lucia returns as *METHOD release manager* (versioning, sync with a
   clobber report, upstreaming, `ACTIONS.md`); Sage becomes *Prove*, Junia *Plan* (the coordinating
   conversation orchestrates), Gordon *Commercial & growth*. April, Aiko, Teddy stay dormant.
2. **Routing:** Nova and Gordon default to sonnet; Vera runs once per slice at the Recette, always
   opus; every Workflow worker gets an explicit `model` (default sonnet).
3. **SOUL split** — `## Non-negotiables` + `## Boundaries` hub-owned, the rest app-owned; the payload
   `SOUL.md` becomes a neutral seed.
4. **Five `CLAUDE.md` sections merged into every app** (Agent Cohort · Model Routing · Landing &
   conversation size · Communication Contract · Design port directive).
5. **Safe sync** — dormant agents relocated to `.claude/_dormant/` in apps, app-enriched agents kept,
   `--dry-run` clobber report, a CLOBBER file skipped and an app-authored section kept without `--force`; `npm run doctor` green and
   `npm run doctor:fleet` showing no **blocking** finding — or each blocking repo skipped / declaring
   `claudeAddon.ownedSections` — before any sync.
6. **Mechanical Cadrage, telemetry no longer committed** — `/land` refuses a new intervention/task file
   without `Journey:` + `Proof:`. Hooks no longer commit the ledger (318.a); the file becomes untracked
   in a follow-up once every checkout runs the 318.a hooks. `npm run telemetry:report` aggregates it.
7. **Cuts and fixes** — `sprint` + `ship-check` skills parked, the conversation-title convention
   dropped, `/port` + `/relay` optional; LANDED ≠ DEPLOYED everywhere (records PR #43), one screen =
   one land, dormant never delegable, 8 rituals, `agent-personas.ts` hand-maintained and parked.

## What's New in v317.c

1. **The landing gate classifies `.codex/agents/*.toml` as tooling.** Apps that mirror their agents for Codex were failing `/land` closed ("unclassifiable") on any crew change; `verify-gate.mjs` (hub + addon payload) now files `.codex/` with the tooling lane, and a new case (`e3` in `tests/verify-gate.lanes.test.mjs`) pins it. Apps get the fix at their next METHOD sync.
2. **Domain owners & the business pack (app-level).** New `agents-method.md` section: an app may keep its business knowledge in `docs/project/business/` (owner table + the human-GO rule) and add domain-owner agents with four fixed sections (Charger d'abord · Règle de GO · Pièges · Frontières). They stay app-level — never in the hub cohort — and an app MAY re-use a demoted name such as Riley. Reference: bananaevents.

## What's New in v317.b

1. **One lineage for the landing gate.** The addon payload's `verify-gate.mjs` is now the superset of the three copies that had drifted (payload · main checkout · worktrees): `test:gate` before `test`, 64 MB spawn buffer (the `ENOBUFS` false red), 30 min per script, `src/**/*.json` in the app lane, `apphosting`/`scheduler.yaml` in tooling, quotepath-safe paths.
2. **Worktrees run the main checkout's hooks.** `land.mjs` resolves the main checkout (`git rev-parse --git-common-dir`) and runs *its* `verify-gate.mjs`; a worktree copy re-execs the main copy. Worktrees created before 317.b: recopy the hooks once before `/land` (`method-core.md` → "Landing").

## What's New in v317.a

1. **Two-moment contract: Cadrage · Recette.** The operator is invited in at the two ends of the
   work — **🎯 Cadrage** (one `AskUserQuestion` fixing Journey/Proof/out-of-scope before the first
   edit) and **✅ Recette** (recette table + the four states `CODED`/`LANDED`/`DEPLOYED`/`PROVEN`,
   never merged, before the Debrief) — never the middle, which stays autonomous outside the
   conflict gate. Canonical: `method-core.md` → "The two-moment contract — Cadrage · Recette".
2. **The CUJ is the unit, no gatekeeper agent.** `templates/CUJ-TEMPLATE.md` becomes a slim
   ~35-line shape; `TASK-TEMPLATE.md` requires `Journey:`/`Proof:`; `method-doctor.mjs` (E9) fails
   any task/intervention file created on or after 2026-09-06 missing them.
3. **Telemetry off the Stop-commit loop.** `session-telemetry.mjs` appends on every `Stop`;
   committing and pushing moved to `SessionEnd` (`--commit`), once per conversation.
4. **`AGENTS.md` no longer imported into Claude's context.** `CLAUDE.md` drops `@AGENTS.md`;
   `AGENTS.md` stays the non-Claude mirror, hand-kept in sync.

## What's New in v316.a

1. **Thirteen job titles become 8 active mandates + 5 dormant.** `junia brian sage watson kasper vera nova gordon` are the active cohort; **Teddy, Aiko, April, Lucia, Iris** move to `.claude/_dormant/` — outside the folders Claude Code scans, so they are neither loaded nor delegable until deliberately revived. `_optional/` would have changed nothing: agent discovery is **recursive**, so a renamed subfolder stays discovered. **Gordon** absorbs the SEA/ads mandate.
2. **Every agent carries an identity, not just a job description.** Each `.claude/agents/*.md` gains a `## Identity` section (**Voice** · **I refuse** · **I defer to** · **I hand off to**) and closes on a `## Non-negotiables` block that is byte-identical across the cohort — one place to change what no agent may do.
3. **`.claude/agents/*.md` is the single source for personas.** The `SKILL.md` files become stubs that point at it, and `agent-personas.ts` is derived from it rather than maintained beside it. Its silent fallback to Brian for an unknown persona — the bug that let a typo run the wrong agent unnoticed — now **throws**.
4. **CI claims purged from 12 documents.** GitHub Actions is billing-blocked account-wide **by choice**, so no doc may promise a pipeline that cannot run: the gate is the **local** verify (`.claude/hooks/verify-gate.mjs`), and merging to `main` was then called the deployment (corrected in 318.a: it is LANDED). Canonical: `method-core.md` → "Merge Gate".
5. **Telemetry & installer fixes.** The session ledger records **models per scope** instead of collapsing them into one field, and the `guessSprint` regex no longer mis-parses sprint folder names. The addon installer's content-guarded section merge is generalised, so a re-run stops clobbering hand-edited sections.

> **Renumbering note:** this lot was authored in-branch as 315.b–315.e while the trunk published its
> own 315.b and 315.c. The trunk numbers stand; the whole cohort refactor lands here as **one**
> release, 316.a.

## What's New in v315.c
1. **Every line earns its place.** Two rules turn the Debrief from readable into **actionable**. A bullet survives only if it changes a **decision**, an **action**, or a **mental model** — anything else is **deleted, not shortened**. And **name the object, never the activity**: `method-core.md:393` not "the method file", `npm run doctor` not "the checker", `afd4cd7` not "the last commit" — every nameable thing rendered as a clickable link or a runnable command, which only became possible once v315.b took the card out of the code fence.

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

## Agent Cohort (19 active mandates + 3 dormant)

Each agent runs **one way**: a delegatable native **sub-agent** in `.claude/agents/{agent}.md`, on every Claude surface (the Desktop Skill stubs were deleted in 327.a). An agent earns a name when its mandate is one you would otherwise have to retype; nineteen mandates hold that bar. **The coordinating conversation orchestrates them.**

| Agent | Mandate |
|---|---|
| **Junia** | Plan — request → plan/to-do (or a sprint) + its Cadrage |
| **Brian** | Build — web development |
| **Sage** | Prove — the observed proof of a journey, then its regression test |
| **Watson** | Repair — reliability & ops |
| **Kasper** | Guard — security |
| **Vera** | Judge — one review per slice, at the Recette (no commits) |
| **Maya** | UX research & IA — discovery, navigation taxonomy, shell, layout patterns, port order |
| **Nova** | Draw — design system, tokens, motion, a11y, dark mode, `proto/`, visual validation |
| **Alba** | Brand & visual assets — logo usage, icon system, imagery, `/media` |
| **Gordon** | Commercial & growth — offers, funnels, EN/FR copy, campaigns, ads |
| **Iris** | Study & deliverables — client-grade studies; owns anonymisation/GDPR |
| **Hugo** | METHOD tooling — hooks, `verify-gate`, `land`, sync engine, installer, doctor, telemetry |
| **Lucia** | METHOD release manager — versioning, sync, upstreaming, `ACTIONS.md`, and the operating model |
| **Penny** | Token economy — measure, report, coach; proposes METHOD changes to Lucia |
| **Oscar** | Coach — weekly retro: effectiveness, focus, objectivity, lucidity, objectives |
| **Régine** | Régie — session, worktree & work-in-progress hygiene; archives, never deletes |
| **Lise** | Tone & voice — reviews public-facing text against the repo's voice files; runs the tone loop |
| **Stella** | Organic visibility — SEO, GEO/AEO, social search, forums, directories & entity, blog, digital PR; drafts only |
| **Agathe** | Recruit & train — spot, hire, onboard, examine, train, score, propose parking; on probation |

#### Dormant (not loaded, not delegable)

Parked under `.claude/_dormant/`, outside the directories Claude Code scans: documented, never loaded. Bringing one back is a `git mv` plus a release.

| Agent | Was | Covered by |
|---|---|---|
| **Teddy** | Mobile Development | Brian |
| **Aiko** | AI Integration | Brian |
| **April** | Vision, Copy, CUJ | Junia's Cadrage draft + Gordon |

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
| **Swanifly** *(parked)* | `Swanifly/web/lib/engine/` spawned the `claude` CLI per persona for unattended runs | ✅ orchestrated batch |

**Flow (the coordinating conversation orchestrates):** the chain is defined once, in `agents-method.md` → "Orchestration chain". Mechanically enforced: the Bash blocklist (`.claude/settings.json` `permissions.deny`) and `vera`→review-only (she holds no write tool). **Prompt-enforced only:** `sage`→tests + proof records only and `iris`→`docs/analysis/` + the named deliverable path — their frontmatter grants `Write, Edit` with no path restriction. See `.claude/agents/README.md`.

**See:** `agents-engineering-method.md`, `.claude/agents/README.md`.

---

## Version Information

**Current:** 339.a  
**Previous:** 338.a → 337.d → 337.c → 337.b → 337.a → 336.d → 336.c → 336.b → 336.a → 335.b → 335.a → 334.e → 334.d → 334.c → 334.b → 334.a → 333.c → 333.b → 333.a → 332.a → 331.a → 330.b → 330.a → 329.a → 328.a → 327.a → 326.a → 325.c → 325.a → 324.c → 324.b → 324.a → 323.b → 323.a → 322.h → 322.g → 322.f → 322.e → 322.d → 322.c → 322.b → 322.a → 321.c → 321.b → 321.a → 320.d → 320.c → 320.b → 320.a → 319.b → 319.a → 318.a → 317.c → 317.b → 317.a → 316.a → 315.c → 315.b → 315.a → 314.b → 314.a → 313.b → 313.a → 312.b → 312.a → 311.a → 310.a → 309.a → 308.a → 307.a → 305.a → 304.a → 303.a → 302.a

**Token economy — measured rules, a default sub-agent model, Penny (11 + 3) and a fleet-wide
ledger** ship as **319.a**; **the per-agent ledger (`byAgent` / `byType`, `schemaVersion` 2)** ships as **319.b**; **Oscar, the coach, and `/retro` (12 + 3, 9 rituals)** ship as **320.a**; **the hub renamed Swanifly** ships as **320.b** — see `versioning.md` for the full changelog.

**See:** `versioning.md` for the newest 5 releases; older releases are in `docs/archive/METHOD/versioning-history.md` (hub only).

---

**Owner:** Lucia  
**Last Updated:** 2026-11-04  
**Status:** ✅ Production-Ready
