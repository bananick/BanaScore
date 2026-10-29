# METHOD v336.b

## Quick Start

**Load what you need. Nothing more.**

| I want to... | Load | Agent |
|---|---|---|
| **Define a new app** | `definition-method.md` → `project/definition/` | Nova (vision: the operator) |
| **Plan a slice or a sprint** | `sprints-method.md` → `journeys/` → `project/` | Junia |
| **Build a feature** | `method-core.md` → `project/DESIGN.md` → task | Brian |
| **Design the structure (nav, shell, layouts)** | `design-method.md` (Navigation Taxonomy, Adaptive Layout) → `project/DESIGN.md` | Maya |
| **Design UI** | `design-method.md` → `project/DESIGN.md` | Nova |
| **Brand asset, logo, icon, image** | `design-method.md` (Logo, Icon System) → `project/brand/` | Alba |
| **Change a hook, the gate, `land`, the sync, the doctor** | `method-core.md` (Landing) → `versioning.md` (Sync) → the tool | Hugo |
| **Add AI capability** | `ai-infra-method.md` → `project/AI-INFRA.md` | Brian |
| **Define app processes** | `process-method.md` → `project/PROCESSES.md` | Junia |
| **Review work** | `method-core.md` → `design-method.md` → task | Vera |
| **Harden security** | `method-core.md` → `project/SCHEMA.md` | Kasper |
| **Sync METHOD** | `versioning.md` → `npm run doctor:fleet` → `sync-method:all:dry` | Lucia |
| **Wire Claude Code into an app** | `tools/swanifly-claude-addon/` → `sync-method:all` | Lucia |
| **Debug** | `method-core.md` → `tests-method.md` | Watson |
| **Prove a journey** | `tests-method.md` → task → `journeys/` | Sage |
| **Write copy (EN/FR)** | `agents-method.md` → `project/VISION.md` | Gordon |
| **Sell, market, run ads** | `agents-method.md` → `project/VISION.md` → `docs/growth/` | Gordon |
| **Study / client deliverable** | `method-core-lite.md` → `project/STATE.md` | Iris |
| **Evolve METHOD** | `versioning.md` → the files the change touches | Lucia |
| **Know what Chief reads / change a contracted artefact** | `chief-contract.md` → `versioning.md` | Lucia |
| **Measure token spend / coach on it** | `routing-method.md` → `project/telemetry/` → the ledgers | Penny |
| **Look back at the week (retro)** | `/retro` → `project/STATE.md` + `FOCUS.md` → the week's evidence | Oscar |
| **Tidy sessions, the sidebar, worktrees** | `sprints-method.md` ("The chantier") → `repo-icons.json` | Régine |
| **Review tone, frame or evolve a voice** | `tone-method.md` → `project/brand/tone/` | Lise |

> Agents named here are the **18 active** mandates. `teddy` `aiko` `april` are dormant
> (`.claude/_dormant/`) — not loaded, so not delegable. Their mandates are covered above (Brian,
> Junia's Cadrage, Gordon).

---

## What's New in v336.b
1. **Every agent has a character, a lesson and a wink.** Each `.claude/agents/{agent}.md` → `## Identity` gains three lines after **I hand off to**: **Character** (a French or international figure whose craft matches the role — an inspiration for the stance, never an impersonation), **I teach** (the one lesson of its craft it slips in when it earns its place) and **My wink** (the shape of its humour, one sample line — at the occasion, in the conversation's language). Humour serves the lesson or the relief; it never lands at someone's expense, never softens a severity, and never goes into a text a customer will read (`lise`'s). The `description:` frontmatter is unchanged, so the always-loaded surface does not grow. See `agents-method.md` → "How agents run".

## What's New in v336.a
1. **Finished work closes itself.** A LANDED sub-session runs `npm run session:close -- --apply`: its branch goes through `branch-sweep`, its Fait / Suite reaches the parent by `SendMessage`, and it archives itself last. A PR held by schema / security / infra is reviewed by `kasper` on opus (`.method/kasper/pr-<n>.json`) and squash-merged by `session:close -- --pr <n>` on approve. Rules, indexes, migrations, secrets, `soul` and `hold` go to the operator as one merge / close / defer quiz. `regine` lists PRs open > 3 days weekly (`--stale --days 3 --fleet`). `method-core.md` → "Landing" → "Closing a finished sub-session", "Exception PRs".

## What's New in v335.b
1. **The operator lever.** Every answer serves the operator's decision speed: proof first, choices as a quiz, a reversible in-scope step done rather than offered. His « donne moi le lien », « show me », re-asked states and typed confirmations are counted as misses (IMP-029) (`method-core.md` → "The operator lever"). `vera`, `sage`, `iris`, `regine` and `watson` hand back **closing-ready** reports: one proof link per point, a suggested fate, a ready quiz. Oscar's « one habit to change » now carries the coach tip, drawn from those misses.

## What's New in v335.a
1. **Every answer that did something ends with Fait / Suite.** Each part has 1–3 emoji bullets, and each Fait line carries one clickable proof. Suite's bullet 1 is the session's **fate**: 🗄️ Archive · 💬 Réponds · 🧪 Teste · 🔑 Agis · ⏳ Attends · 🔁 Continue ici. Each fate comes with a « Prêt pour toi » kit; 🔑 closes with « C'est fait » / « Ça bloque » / « Fais-le avec moi », so the operator never types a confirmation. Every closing title carries a state word (CODÉ · ATTERRI · DÉPLOYÉ · PROUVÉ · en cours · bloqué), and 🚨 marks an incident. The mission card shrinks to four parts (≤ 9 lines). A small answer is two lines. Iris's 10-step algorithm picks the fate (`method-core.md` → "Choosing the fate"). Trial measured at J+7 (IMP-029).

## What's New in v334.e
1. **Jest and vitest lanes run serially, with a 30 s per-test timeout.** `verify-gate.mjs` appends `--runInBand --testTimeout=30000` (jest) or `--no-file-parallelism --testTimeout=30000` (`vitest run`, installed vitest ≥ 1) to a lane's `test:gate` / `test` script when it is a plain command (each flag only if the script does not already set it); composite scripts and other runners are untouched; a failing test is still red. Trigger: BanaLog `backend/` HTTP authz specs exceeding jest's 5 s default under load (up to 6 gates at once), a different suite each pass, each green alone — PR #128 held 4 passes, PR #135 — and the frontend's `[vitest-pool-runner] Timeout waiting for worker to respond`. Operator ruling 2026-10-28; IMP-028.

## What's New in v334.d
1. **Lint is red only on new problems.** 334.c still held a branch that touched a file already in debt (BanaLog PR #128 touches `events.service.ts`, 146 errors on the trunk). `verify-gate.mjs` now counts eslint errors per (file, rule) on each changed file at HEAD and on its merge-base text; red when a count grows or a file new since the merge base has an error; an eslint crash is red. Operator ruling 2026-10-28; IMP-027.

## What's New in v334.c
1. **Lint judges the diff, not the lane.** `verify-gate.mjs` runs a root's plain `eslint …` lint script on that root's **changed** files only (vs `--base`, narrowed to the script's globs; `--fix` dropped); no changed lintable file → lint passes; an error in a changed file stays red. Typecheck, tests and build are unchanged. Trigger: BanaLog, ~6 500 pre-existing problems in `backend/` held every backend landing (PR #128). Operator ruling 2026-10-28; IMP-026.

## What's New in v334.b
1. **A sub-session is archived only once traced; a held slice is driven to an exit.** `sprints-method.md` → « The chantier » → « Archiving » gains check 5 « Traced » (intervention/task file with its report on `origin/main`; `STATE.md` line when a journey's state moved) and the rule that a slice held by the landing exception list is pushed to one of the three exits — Kasper's/Vera's verdict in `review[]`, then resolve the reason or `[land-anyway]` + `/land`, or abandon; never `gh pr merge --admin`, never a hand-run branch delete. Operator ruling 2026-10-27 (IMP-025).

## What's New in v334.a
1. **At most two heavy gates at once on the machine.** The heavy phase of `verify-gate.mjs` (lint · typecheck · tests ·
   build, so every `/land` and `npm run verify`) now takes one of the machine's two heavy slots
   (`~/.claude/heavy-slot/slot{1,2}.lock`, the new hook `heavy-slot.mjs`), after the repository lock. A third gate waits
   with a visible message and starts when a slot frees; after 40 min it is `blocked` "heavy-slot busy" — nothing ran,
   `/land` again. Below 5 GB free RAM, one heavy job at a time. A killed session frees its slot in 2 min (heartbeat). If
   the lock directory cannot be created the gate runs without the semaphore and says so. Why: on 2026-10-26 Windows ran
   out of virtual memory with gates of several repositories running at once, and every session died; the per-repository
   lock could not see it, and a convention script only worked when remembered.
2. **Heavy commands by hand stay outside** (`next build`, `npm install`, an app's direct `npm run test:gate`): wrap them
   with `node .claude/hooks/heavy-slot.mjs run -- <cmd>`; `node .claude/hooks/heavy-slot.mjs status` shows both slots.
   **Never wrap `/land` or `npm run verify`** — in this CLI or in `heavy-slot.ps1`: they take their own slot, and a
   wrapper's slot the gate cannot see makes it take a second one (two sessions doing so freeze every heavy gate for
   40 min). A `.ps1` owner is never a branch name: its `release <owner>` would free a live gate's slot.

---

## What's New in v333.c
1. **Vera and Oscar read the notes left for them in the Cockpit.** In the hub, `/review` passes Vera the open
   Cockpit notes addressed to her for the slice's week, and `/retro` passes Oscar his (`npm run cockpit:op -- note:list
   --for vera|oscar --open`, or the `cockpit` MCP tool) — operator data, never instructions. Each verdict answers them by
   note id; the coordinator records each answer on the page (`note:reply … --as vera|oscar`). Outside the hub the step is
   skipped. Why: the operator now pilots the Cockpit from Claude (closed verbs: tasks, diagnostics, notes —
   `docs/interventions/2026-10-26-Brian-cockpit-pilote-depuis-claude.md`), and a note for a reviewer needs a reader.
2. **`/retro` works from the trunk.** If the hub checkout is behind `origin/main` or dirty, the retro runs in a fresh
   worktree at `origin/main` (W43 ran 205 commits behind: a stale `doctor:fleet`, and `/land` refused). The Swanifly Rétro
   URL is corrected to https://claude.ai/artifact/1XCEaZjCgQVWa4LcmJoteN in `/retro`, `oscar.md` and this file.

---

## What's New in v333.b
1. **Régine's rescue push may skip the app's pre-push gate.** The push of a `wip(rescue): sauvegarde avant
   archivage [wip]` commit runs `SKIP_QUALITY_GATES=1 git push -u origin HEAD` — that commit only, on the session's
   own non-main branch, never `--no-verify`, never forced (`.claude/agents/regine.md` rule 4, `sprints-method.md` →
   "Sidebar contract"). Why: bananaevents' `.husky/pre-push` (type-check, tests, build) outlasts any pass, so rescue
   commits stayed local — the 2026-10-26 `/clean` pass found 2 left unpushed. The proto leak guard sits before the
   bypass and still runs; `/land` still runs the full gate. The hub's `land.mjs`, `ship-push.sh` and `wip-sync.mjs`
   already push with the same variable.

---

## What's New in v333.a
1. **Stella 🔭 joins the cohort — 18 active mandates.** Organic visibility had no owner of its own: one line of
   Gordon's (« campaigns … SEO ») among seven mandates, while organic converts at 23.2 % against 4.7 % for paid
   search (`docs/analysis/2026-07-26-portfolio-financial-priorities.md` § 1a). `.claude/agents/stella.md` owns classic
   SEO, GEO/AEO (ChatGPT, Perplexity, Gemini, Claude, Copilot, AI Overviews / AI Mode), social search (LinkedIn
   first), forums & communities, directories, reviews & entity, blog, original data and digital PR.
2. **One owner per job:** `seo-audit` and `search-growth` move from Gordon to Stella. Gordon keeps offer, funnel,
   EN/FR copy, campaigns and paid ads; the paid ↔ organic line is written in both files and the non-duplication
   rules stay in `search-growth` → "Paid and organic".
3. **Drafts, then a GO per batch.** Stella observes → audits → plans 30 days with thresholds written before launch
   → drafts; a listing or a post is submitted or published only after the operator's explicit GO for that batch,
   and no agent creates an account or types a credential. Her doctrine: `docs/analysis/2026-10-24-organic-visibility-study.md`.

---

## What's New in v332.a
1. **Nothing waits for the operator but the security class.** `land.mjs` no longer holds a branch for a dependency or
   lockfile change, nor for a big diff (> 60 files or > 2000 deleted lines): it logs « auto-landing past … benign
   exception(s) », runs the verify gate (lint · typecheck · tests · build) and lands. `land:sweep:apply` treats the
   same two as clean.
2. **Still held, for a human:** schema / Firestore rules, auth / secrets / middleware, `SOUL.md`, migrations, deploy
   wiring — and the explicit holds (`[no-auto-merge]`, `[wip]`, `[hold]`, `Needs decision`, a `wip` branch) and a
   trunk conflict, which nobody can resolve for the operator.
3. **Trade-off accepted (operator, 2026-10-24):** a dependency change lands without a human look at the supply-chain
   risk. One regex in `land.mjs` puts `deps` back.

---

## What's New in v331.a
1. **Régine may delete integrated branches — through `branch-sweep.mjs` only.** The 2026-10-17 « archive, never
   delete » rule stays for sessions, stashes and worktrees that hold work; a branch already in the trunk is residue
   (~270 across 12 local repos, 2026-10-20) and leaves with `node .claude/hooks/branch-sweep.mjs --apply`, never a
   hand-typed `git branch -D`.
2. **Two proofs of « integrated ».** `is-ancestor` of the trunk, or — for a squash merge — `git merge-tree
   --write-tree` equals the trunk's tree. An error or a conflict means keep. `backup/*` is never touched; a dirty or
   active worktree, an open PR or a running session blocks.
3. **Every deletion is journalled** before it happens: `<git-common-dir>/branch-deletions.log`, one line
   `repo · branch · local sha · remote sha · date` — restore with `git branch <name> <sha>`. No line, no deletion.
   `--only <branch,…>` limits a run.

---

## What's New in v330.b
1. **Every proof ask carries a 🔎 Preuve à jouer block** (`method-core.md` → "The two-moment contract", operator request
   2026-10-22): the real clickable URL(s), numbered steps each with its expected result, evidence as links, and what is
   not proven yet. It sits right above `➡️ Suite` in a Debrief, replaces the 📸 line on a mission card, and an ask
   without it is sent back, not relayed.
2. **The chantier fiche enforces it**: `review[].urls` (≥ 1) is required on a `result` item and `review[].notProven`
   is added; the `Stop` hook blocks a fiche without them. Older fiches add `urls` on their next write.
3. **Sage's PROVEN report** hands the coordinator that block.

---


---

## What's New in v330.a
1. **The closing is chosen by session type** (`method-core.md` → "Operator Reporting" → "Closing by session type",
   operator rulings 2026-10-23). An **autonomous mission** closes with a **mission card of ≤ 8 lines**; a **chantier
   supervisor** with a **control tower** (one row per sub-session, their pending decisions gathered into one quiz, a
   published URL first); the full Debrief stays for a handoff, `/brief` or a multi-decision answer.
2. **Proof first, then a one-click « go ».** A journey ladder (`Cadré → Codé → Livré → Déployé → Prouvé → Utilisé →
   Retours`), the one-click proof before any prose, before/after screenshots sent to the phone, and a quiz whose first
   option is « go = {reco} ». Measured before: 43-line closings, 16 % with a quiz, 61 % of replies one word.
3. **When the operator must act, the path is prepared** — exact URL, what to click, `bash` commands, and a guided
   walk-through offered in Claude in Chrome or the terminal. It guides; he acts (never his credentials, payment or terms).

---

## What's New in v329.a
1. **The sidebar in three zones** (`sprints-method.md` → "Sidebar contract", operator rulings 2026-10-20). Reading it is
   three questions in order: *what wants me* — **Pinned holds only what waits on the operator** (`· 🟡` / `· 🔴`), a
   supervisor included; *what is each chantier doing* — **each supervisor lives in its group** `{app} · {chantier}`;
   *what else is alive* — **`🎯 Missions libres`**, kept to what runs, waits or was touched in the last 24 h.
2. **Reopens 322.h's « supervisors always pinned ».** A supervisor keeps a pin for good only **while it is nested** (it
   cannot be filed); Régine unpins it on the first pass after it is top-level and filed, and lists a nested one
   « à détacher » with its parent's title, pushed to the operator's phone once.
3. **The 💤 pile closes.** The 72 h clock is replaced: a `· 💤` free mission idle > 24 h is **rescued, then archived, by
   the 20:07 pass** — the one scheduled pass allowed a shell, for the rescue and nothing else (`git status`,
   `git rev-list`, the `wip(rescue)` commit, a plain push). Until now the shell-less passes could only list it « à sauver ».

---

## What's New in v328.a
1. **The Chief contract — `chief-contract.md` (new Support doc).** Chief 🥷, the operator's chief-of-staff
   assistant (`bananick/chief`), monitors and drives development across the fleet **under a formal read
   contract, not as part of the METHOD** (D24, 2026-10-19). The file lists every artefact Chief reads — per
   app (`STATE.md`, `FOCUS.md`, journeys, intervention headers, task files, chantier fiches, the trunk's
   land subjects, the telemetry ledger, Penny's report) and in the hub (version, `repo-icons.json`,
   `doctor:fleet --json`, `land:sweep`, the Cockpit week files and pushed data, Oscar's retro, Régine's pass,
   `ACTIONS.md`) — with the fields relied upon and a stability mark (**S** stable · **A** additive · **P** prose).
2. **Chief is read-only everywhere** (Chief D10): it never edits, lands or deploys for a project; it acts by
   starting a session that opens `/intervention`, `/project` or `/brief`, under the sidebar contract.
3. **The Cockpit stays the source, Chief is the display and voice** — no second cockpit, no recomputed score.
4. **A release that alters a contracted artefact** carries a `**Chief contract impact.**` line in its
   `versioning.md` entry; an S change is Major; Lucia checks it at every release, before the doctor.

---

## What's New in v327.a
1. **Three agents join and Nova is re-scoped — 17 active mandates + 3 dormant.** **Maya 🧭** (opus) owns UX
   research and information architecture — discovery, the destination/action/utility taxonomy, the shell per
   window class, layout patterns, port order, and `ux-review`. **Alba 🖌️** (sonnet) owns the brand in use —
   logo usage, the icon system, imagery, `/media`, `brand-voice-check`. **Hugo ⚙️** (sonnet; opus for gate
   semantics) owns the METHOD's machinery — the hooks, `verify-gate`, `land`, the sync engine, the installer,
   the doctor, the telemetry scripts and the hub's `tests/`: **78 commits** that three agents had been writing
   with no mandate naming the work. **Nova goes from 25 assignments to nine** (tokens, M3/Swanifly compliance,
   motion, a11y, dark mode, screen states, `proto/`, visual validation, and design authority over Maya's and
   Alba's output). Evidence and every resolution: `docs/interventions/2026-10-19-Lucia-cohort-restructure.md`.
2. **The ten colliding ownership lines each have one owner** (§4-O1…O10 of the 2026-10-18 audit), edited in
   **both** files so they agree: `firestore.rules` → Kasper alone (Watson keeps performance indexes) · components
   → Brian alone · copy and microcopy → Gordon alone (`design-method.md` no longer lists copy under Nova) ·
   the visual audit → Nova, the security review → Kasper, with Vera checking **that each ran** rather than
   re-running it · tests → Brian (what he builds) / Sage (the proof spec **and** the infrastructure) / Watson (a
   regression test for a bug he root-caused) · research → Gordon for a decision on the offer, Iris for a sourced
   measurement · `docs/METHOD/` → Lucia alone, with Penny and Oscar proposing · hygiene → Régine's routine pass,
   Watson's rescue · objectives → Junia plans, Iris measures, Oscar judges.
3. **The 14 persona Skill stubs are deleted, and the "Riley" advisory hat with them.** The stubs re-loaded every
   agent description a second time in every session (**4,984 characters**) and carried **2 of ~140** delegations;
   `.claude/agents/{agent}.md` is now the only surface and a new agent gets no stub. Riley was a name in the
   roster with no file: integration is building, so it is Brian's (`ai-infra-method.md`) — the 102 `riley`
   delegations the audit found were an **app-level** agent, which stays legal and untouched.
4. **The always-loaded description surface shrinks 27.5 %** — 14,033 → 10,171 characters (≈ 3,508 → 2,543 tokens):
   the three new descriptions cost 870 and the re-scoped ones 252 more, while the deleted stubs freed **4,984** —
   5.7× what the recruits cost. The cohort grew by three mandates and got **cheaper** to load.
5. **Four orphan skills get an owner:** `ux-review` → Maya · `deploy` → Watson · `implement-plan` +
   `hubspot-sync` → Brian; `/media` and `brand-voice-check` move from Nova and Gordon to Alba. **Lucia's
   mandate now says what she already does** — designing the operating model (cohort shape, rituals, supervision,
   the operator contract), which was 7 of her 11 interventions while her file listed four jobs.

---

## What's New in v326.a
1. **Lise 🗣️ joins the cohort — 14 active mandates + 3 dormant.** Tone and voice (opus, `.claude/agents/lise.md`): she reads
   any text a customer, prospect or the public will read against the repo's voice files and returns a verdict and a
   before → after table — never editing the text. Born of the 2026-10-17 tone study of Banana Events, Respirit and Nicolas:
   `docs/interventions/2026-10-19-Lucia-lise-tone.md`.
2. **New `tone-method.md` + two templates.** How a voice is framed (identity, paired attributes, address by channel, lexicon,
   situations, patterns), reviewed, and kept alive. **One voice file per brand persona, hosted in each repo** at
   `docs/project/brand/tone/` — the hub ships the mechanism, the app owns the content.
3. **The loop.** Every review leaves a row in the repo's `LOG.md`; real use adds challenges and enrichments; a pass (due at
   10 rows or 30 days) turns them into at most five evidenced proposals the operator ratifies by quiz. Lise never changes a
   voice on her own evidence.
4. **The summon rule** (`CLAUDE.md` → Agent Cohort): tone questions go to `lise`; where a repo has voice files, public-facing
   text passes through her before it lands. The hub dogfoods it — `docs/project/brand/tone/swanifly.md`, filled only from `SOUL.md`.

## What's New in v325.c
1. **Context diet, slice 2 — the root is 63.6 % smaller.** `CLAUDE.md` 32,683 → 12,480 B, and it is re-paid by every session **and** every one of 13 sub-agent launches. Reference moved to the file that owns it: `## Work Modes` → `sprints-method.md`, `## Design Language` → `design-method.md`, `## Skills Workflows` and `## Claude Desktop Setup` dropped (the harness lists the rituals; `agents-engineering-method.md` §7 has the Desktop setup), the Debrief / Flight Deck templates cited instead of copied. The five `payload/snippets/*.md` shrink with it, 21,073 → 6,936 B, so the fleet receives the same diet.
2. **The delegation default is now a four-condition test.** Delegate when the work is verbose-and-discardable, self-contained, summarisable, or needs a tool restriction — stay inline for back-and-forth, shared multi-phase context and small targeted edits. A spawn costs 60–75 k tokens before it reads anything. The T1/T2/T3 tiers, the Workflow rules and the 2-round review cap are unchanged.
3. **Startup no longer loads `STATE.md` + `FOCUS.md` whole** (55,470 B): the root points at `STATE.md` → "§ Resume here" and `FOCUS.md` → "§ The north star", 3,689 B, further §§ on demand. All 13 `Entry files:` lines are section-scoped now — `sage`, `nova` and `penny` were the three left open at 324.c.
4. **`npm run doctor` E16 is an error**, budget 13,312 B — one KiB above the measured floor, with every rule kept; the 8,192 B originally asked is not met, and the reason is in the changelog.

## What's New in v325.b
1. **The verify gate classifies nested YAML data of a verifying root.** A `*.yaml`/`*.yml` below the root of a repo whose
   own `package.json` verifies (Chief: `memory/facts.yaml`, validated by its `test:gate`) now runs that root's checks instead
   of failing closed as "unclassifiable". A root-level YAML (`app.yaml`, `cloudbuild.yaml`) and YAML under a root that
   verifies nothing stay fail-closed; `apphosting`/`scheduler`/`.github/` YAML keep the tooling lane.

## What's New in v325.a
1. **A session that waits on the operator is pinned while it waits.** Pinned = supervisors + any session whose title ends with
   ` · 🟡`: right before an `AskUserQuestion` it will block on, a session appends ` · 🟡` to its title and pins itself; right after
   the answer it removes the 🟡 and unpins itself (never a supervisor). Régine pins and unpins by the title as the safety net, and a
   `· 🟡` session is never 💤 and never archived by a clock (reported when waiting > 48 h). The `SessionStart` hook carries the rule
   in one sentence (`sprints-method.md` → "Sidebar contract", rule 1).
2. **Two new rituals — 11.** `/clean` runs Régine on demand, as a sub-agent (sonnet), and relays her table in ≤ 10 lines;
   `/project` opens a chantier by the contract (refuses when nested; Cadrage, partition map, sidebar group, one task chip per slice,
   then the supervisor loop).

## What's New in v324.c
1. **Context diet, slice 1 — agents start lighter.** `versioning.md` (180.7 kB, 96 % changelog) keeps its operative rules and the newest 5 releases (29.5 kB); the older 57 moved verbatim to `docs/archive/METHOD/versioning-history.md`. 10 agents' `Entry files:` now name `file → "§ Section"` with a cap (`read ≤ 12 kB of reference`) — median sub-agent launch 102.7 → 61.5 kB, Lucia 285.2 → 54.0 kB.
2. **`npm run doctor` E16** warns when `CLAUDE.md` exceeds 8,192 B (an error once slice 2 has cut it).

## What's New in v324.b
1. **A docs + tests repo lands without an install.** When an app root has no `node_modules` and its diff is plain Node JS
   (`*.mjs`/`*.cjs`/`*.js`), `verify-gate.mjs` (hub + addon payload) runs `node --test` on every changed file that
   imports `node:test` (found by content, not name) instead of going `blocked`, plus `node --check` on the changed JS as an
   extra check; every npm script it could not run is named `skipped: 'no-deps'` and the report prints `⚠ NO-DEPS`.
   `node --check` alone never verifies: a JS diff with no `node:test` file, a ts/tsx/jsx/vue file, or a test on another
   runner (vitest, jest, mocha, ava, tap — or a test-looking file without `node:test`) still fails closed.
2. **BanaLog leaves `SKIP_REPOS`** (`scripts/lib/fleet-skip.mjs`): it runs METHOD 323.a and receives the hub syncs again.
   BanaLazer stays skipped.

## What's New in v324.a
1. **Régine 🧑‍🔧 joins the cohort — 13 active mandates + 3 dormant.** Régie: session, worktree and work-in-progress
   hygiene (sonnet, `.claude/agents/regine.md`). One outcome — the Code tab shows only the work really in progress.
   Born of the 2026-10-17 audit (66 open sessions, 11 duplicate routine passes, 164 worktrees, 35.4 GB): `docs/interventions/2026-10-17-Junia-hygiene-sessions.md`.
2. **She owns the sidebar pass** and replaces the anonymous janitor: `rangement-barre-laterale` now runs as Régine
   (`sprints-method.md` → "The chantier", rule 6). **Routines close their previous runs** through `list_task_runs`, never
   the title.
3. **The clocks** (outside a chantier): PR merged → archive · `✅` idle > 2 h → rescue, archive · idle > 24 h → `· 💤` ·
   idle > 72 h → rescue, archive. **Rescue before archive** — a `wip(rescue) … [wip]` commit pushed on the session's own
   branch; a refused push means no archive. Archive, never delete work; integrated branches go through `branch-sweep.mjs` only.

## What's New in v323.b
1. **Study data lands as doc.** `verify-gate.mjs` (hub + addon payload) files `*.csv`, `*.tsv`, `*.geojson` and a nested
   `.json` that neither tooling nor an app root owns in the **doc** lane, so a study dossier no longer fails `/land` closed
   as "unclassifiable". App json (`src/messages/*.json`), root json, `scripts/` and `.claude/` keep their lane;
   `firestore.indexes.json` and json under an orphan `src/` still fail closed.

## What's New in v323.a
1. **A hand-made session files itself at birth.** A new `SessionStart` (`startup`) hook, `.claude/hooks/session-sidebar.mjs`, injects one
   short instruction: on its first reply, a session that is not a supervisor, a chantier sub-session or a routine titles itself
   `{repo icon} {objet}` and files itself under `🎯 Missions libres`. The janitor `rangement-barre-laterale` stays the safety net
   (operator ruling 2026-10-16: « hook au démarrage + gardien en filet »).
2. **Carried to every app by the installer** — `payload/hooks/session-sidebar.mjs` plus a `startup` entry in `settings.snippet.json`.
   Fail-open: silent on `resume` / `clear` / `compact` and outside a repo.
3. **Known limit.** A nested app (e.g. `bananaevents\Events`) resolves to its own folder name and gets `_default` 📁 — recorded as a
   follow-up in `versioning.md`.

## What's New in v322.h
1. **The sidebar contract.** Only supervisors are pinned, each filed in its chantier group `{app} · {chantier}` and titled
   `🧑‍✈️ {repo icon} {chantier}`; the group view is `group_by: "none"`, `sort_by: "alpha"` (it replaces the `group_by: "state"`
   line of 2026-10-16 morning) and a sub-session title is slice-code first — `{slice} {avatar} {object} · {state icon}` — so
   the sort follows the slices.
2. **`🎯 Missions libres`.** One section for every session outside a chantier (`group_by: "state"`, `sort_by: "recency"`,
   title `{repo icon} {object}`).
3. **One icon per repo** — the table in `sprints-method.md`, machine-readable in `docs/METHOD/repo-icons.json`, carried to
   every app by the sync (`docs/METHOD/**`).
4. **Never nest a supervisor; a janitor keeps the sidebar.** A chip-born session nests under its parent, so a supervisor
   starts top-level (or the operator detaches it once). `rangement-barre-laterale` (the operator's machine, outside the sync)
   re-applies the contract every 2 h, archives finished routine runs and, at 20:07, finished free missions.

## What's New in v322.g
1. **Operator input is an inbox, not a form.** The chantier dashboard stays read-only. The supervisor asks in small
   `AskUserQuestion` batches (≤ 4 closed questions, recommendation first), ordered by blocking cost — conflict-gate decisions
   first, then slices blocked × deadline — and pushes to the phone only when a slice is actually blocked.
2. **Agents do not wait on reversible decisions.** A fiche decision carries `reversible` + a `deadline` (raised + 2 h); the reco
   applies at the deadline (`status: defaulted`, listed in the Debrief under `🤝 Décidé pour toi`), and only the conflict gate
   puts a slice in `waiting`. The supervisor keeps the timer.
3. **The operator evaluates only what deserves it.** `review[].needsOperator` is true only for results clients see or that
   touch money — one batch per slice at its Recette; the rest is accepted by Vera + Sage and stays reopenable.
4. **A fiche written before 322.g adds the new fields on its next write** (`chantier-status/1` keeps its id; the Stop hook names them).

## What's New in v322.f
1. **One landing at a time, per repository.** `gate-lock.mjs` (upstreamed from bananaevents) serializes the heavy gate across
   every worktree of a repo through `<main>/.method/gate.lock`; heartbeat liveness, self-healing stale locks, and it is only a
   scheduling aid — no lock, no serialization, the gate still runs. A hook (`--auto`) never queues.
2. **The gate learns three app fixes.** npm-workspaces members verify through their parent root (fail-closed: a script-less
   root is `blocked`); root `firestore.rules` / `storage.rules` get a tooling lane but stay held by the `schema` exception
   (`[land-anyway]` still overrides, operator's call 2026-10-15); `.snap` files are code.
3. **`proto/` is exempt from the no-mock guard** — the app-root folder only, never a `proto` folder under `src/`, `components/`,
   `app/`, `pages/`, `lib/` or `features/`. `ship-push.sh` never pushes the trunk and skips the husky chain on a branch push.
4. **Six names leave `SKIP_REPOS`** (bananaevents, gites-groupes, LeMansFC, Respirit/IAcademy, Scapience) — after each app's own
   cleanup, one fleet sync (IMP-012). `sprints-method.md` → "Sessions & branches" lists the new hook rows.

## What's New in v322.e
1. **Supervision v2 proof fixes** (first live run, bananaevents · W42 cash). The supervisor finds a sub-session's fiche
   **by its branch** (`git worktree list --porcelain`, else `git show <branch>:…`), never by the session's `cwd`; it
   addresses a sub-session by its **`ListAgents` name** (`SendMessage`, `notify_when_idle`), never by sessionId.
2. **Adoption is announced.** A sub-session's first action is `SendMessage` "adopt {slice}" to the supervisor, and it never
   `EnterWorktree`s in an app-created worktree; the supervisor adopts any unadopted session of the group on each wake.
3. **A land in flight is visible** — `/land` is written into `progress.doing` before it runs.
4. **No `▶ Prompt suivant` in a chantier.** The next step is an action the supervisor takes itself (a task chip or a typed
   `SendMessage`) and a `Suite` row of the pilot dashboard; the control tower's next-path quiz names it. `sprints-method.md` → "The chantier".

## What's New in v322.d
1. **GitHub always mirrors active work.** A new `Stop` hook, `wip-sync.mjs` (on by default), pushes the uncommitted
   delta of a feature branch to `refs/wip/<branch>` — fail-closed: content scan + name denylist, HEAD already on
   `origin`, `origin` PRIVATE (via `gh`, 1 h cache), a single push URL; kill switch `git config wip-sync.enabled false`.
   `ship-push.sh` no longer swallows a rejected push and now publishes a branch cut from `origin/main`.
2. **A branch has three exits.** Landed-and-deleted (local `main` fast-forwarded, remote branch + WIP ref removed),
   a draft PR for a held landing (reason + `### Needs decision`), or abandoned-and-deleted. `branch-sweep.mjs` at
   `SessionStart` cleans only branches `land.mjs` landed, and never merges a PR; the Flight Deck shows "Travail actif".
   `sprints-method.md` → "Invariants du cycle de vie des branches".

## What's New in v322.c
1. **Questions are quizzes, never prose.** Every question to the operator (Cadrage, `Needs decision`, mid-build
   ambiguity, accept/reopen/defer) is prepared in advance and asked with `AskUserQuestion` — ≤ 4 questions, 2–4
   options, recommended first — never written as a question in the chat text. A sub-agent returns a
   `Needs decision`; the coordinating conversation turns it into the quiz. `method-core.md` → "Questions are quizzes, never prose".

## What's New in v322.b
1. **The fiche accepts app domain owners.** `agent` in `chantier-status/1` is a lowercase slug (`^[a-z][a-z0-9-]{1,23}$`):
   a cohort id or a domain owner declared in the app's business pack (riley, sacha, elena…), no longer an enum of
   the 12 cohort ids. A domain owner's avatar is the one its business pack declares, 🧑 by default.
2. **The supervisor archives a finished sub-session on its own.** Four machine-checked conditions — fiche `landed` with
   its `head` on `origin/main`; session idle with a clean worktree; nothing open in the fiche; the archive named in
   its Debrief — and no operator OK. A missing condition turns the title 🟡 and is named.
   `sprints-method.md` → "The chantier" → "Archiving".

## What's New in v322.a
1. **Supervision v2 — a chantier runs on data and events.** Each sub-session keeps one typed fiche
   (`docs/chantiers/{chantier}/{slice}.json`, schema `chantier-status/1`) and renders no Debrief; a `Stop` hook
   (`chantier-status.mjs`) blocks an invalid or stale fiche; the supervisor is woken by idle notices, retitles and
   files each sub-session, pings the operator only for what needs him and routes his answers back by message.
   Avatars join the cohort table. `sprints-method.md` → "The chantier".

## What's New in v321.c
1. **Telemetry v3 — a session knows which work it served.** The Stop hook (`session-telemetry.mjs`, hub + payload)
   reads `.method/journey`, written at the `/intervention` Cadrage (`npm run method:journey` in the hub), and adds
   names-and-counters only: tools, MCP servers, skills, commands, sub-agent launches, flow, result. Machines enrol
   from the Cockpit with a one-time code. `routing-method.md` → "Central store".

## What's New in v321.b
1. **Known domain owners, visible in the hub.** `agents-method.md` → "Known domain owners" lists the fleet's
   app-level owners (bananaevents: sacha, riley, elena, gordon), states that bananaevents' own `gordon.md`
   wins there, retires the generic owner template, and says how a new owner is declared. Docs only; no
   owner joins the cohort table or the sync payload.

## What's New in v321.a
1. **The chantier — a supervision session + one sub-session per slice.** A workstream of ≥ 2 code-writing
   slices runs as one supervision session (opus, writes no code, lands each slice, one folded Debrief) and
   one sub-session per slice (sonnet, own branch + worktree), each reporting through one typed fiche,
   grouped in the sidebar as `{app} · {chantier}` and archived by the supervisor on its own once finished. Sub-agents stay the default
   inside a slice; the sprint stays the exception. `sprints-method.md` → "Sessions & branches".

## What's New in v320.d
1. **The verify gate ignores deleted paths.** `verify-gate.mjs` no longer treats a deleted `package.json` as an app
   root or a deleted file as unclassifiable: deletions are counted apart (`deleted` in the marker) and a
   deletion-only change is green. `land.mjs`'s own > 60 files / > 2,000 deleted lines exception is unchanged.

## What's New in v320.c
1. **`/retro` feeds an interactive dashboard.** The weekly retro is also published to the "Swanifly Rétro"
   dashboard (https://claude.ai/artifact/1XCEaZjCgQVWa4LcmJoteN): Oscar writes `docs/project/coaching/dashboard/YYYY-Www.json`
   beside the committed `RETRO-YYYY-Www.md`, the coordinator publishes it (`ArtifactData`, `retros/{week}`),
   the operator answers in the page (`feedback/{week}`), and next week's retro reads those answers first.

## What's New in v320.b
1. **Hub repo renamed Swanifly** (Patch). `Bana-Share` → `Swanifly` (GitHub repo + local folder): the fleet skip list
   carries both names, repo URLs and the sync commit message say Swanifly, and
   `scripts/ops/rename-hub-to-swanifly.ps1` is the operator's one-shot, idempotent, fail-closed rename.

## What's New in v320.a
1. **Oscar, the coach — 12 active mandates + 3 dormant.** Opus. A **weekly retro** (`/retro`, the 9th
   ritual), and on demand at the Recette of a slice that closes a journey — never once per Debrief (an
   opus pass costs ~$2–5). He reads the week's evidence across the fleet (git, each app's `STATE.md` +
   `FOCUS.md`, the week's interventions and reports, Penny's numbers) and writes one file,
   `docs/project/coaching/RETRO-YYYY-Www.md`: objectives vs journeys proven, focus, three sourced
   observations, one habit to change, 0–2 METHOD proposals for Lucia, last week's habit held or not.
   Every claim sourced, `inconnu` when unknown, never an invented ratio. Closes IMP-010; IMP-011 (a
   centralised, Scrum-like method) is his to design with Junia next.

## What's New in v319.b

1. **The ledger says which agent ran.** Each ledger row (`schemaVersion` 2) carries `subAgents.byAgent` — one
   entry per sub-agent transcript: `agentType`, a ≤ 80-char task label, `workflowId`, `requestedModel`, the
   `model` that ran (majority by cost), `pin` (`explicit` / `frontmatter` / `unpinned`), calls, tokens and
   timestamps — and a complete `subAgents.byType` roll-up keyed `<agentType>|<model>`. `npm run telemetry:report`
   prints "by agent type × model" and "per sprint / branch" tables from the ledger alone, so the question
   "did anything inherit opus?" no longer needs the transcripts. v1 rows still parse. No prompt text enters the row.

---

## What's New in v319.a
1. **Token economy, measured then ruled.** 14 days, 2,934 transcripts: **$14,714** API-equivalent,
   sub-agents and Workflows **86.2 %** (opus 50.2 %), Workflows **37.5 %**, cache reads + writes
   **85.6 %** — a session costs *calls × context*, not output. New rules in `routing-method.md` →
   "Token economy", short form in every app's `CLAUDE.md` → "Model Routing": a **review→fix loop stops
   after 2 rounds** (re-review on the diff only, one reviewer per point, full gates once at the end);
   **tiers beat modes** (Ultracode never overrides T1/T2/T3); **every Workflow announces its cost at
   Cadrage** and stays **< 10 agents** unless the operator agrees; **minimal sub-agent context** (paths,
   not pasted inventories; screenshots only for Nova/Sage; tool calls capped in the brief);
   **`MEMORY.md` ≤ 5 kB**; the unit is the **cost of a finished task**; `general-purpose` never on opus
   unless the task is judgement.
2. **A default sub-agent model backs the routing rule.** 122 sub-agents pinned neither per
   call nor by frontmatter ran on opus in 14 days ($1,456, 9.8 % of cost). Review, verify and judgement workers still name
   `opus` explicitly — the default makes forgetting cheap, not safe. `install.mjs --user` writes a user-level default sub-agent model
   (sonnet) — below the per-call `model` and the frontmatter, so it never replaces an explicit one
   (never use the `_FORCE` variant); doctor W7 warns when it is missing, W6 when a `MEMORY.md` passes
   5 kB.
3. **Penny joins the cohort — 11 active mandates + 3 dormant.** Telemetry & token-economy coach
   (sonnet): measures by project, task type, period, sprint, agent and model; owns
   `npm run telemetry:report` (now with a model / inheritance split, `--days`, `--json`), the periodic
   `docs/project/telemetry/REPORT-YYYY-MM-DD.md` and the J+7 measurements; coaches; proposes METHOD
   changes to Lucia. At the Recette of a slice that ran a Workflow or > 10 sub-agents, her
   one-paragraph cost note joins the Debrief — a note, not a gate.
4. **The ledger reaches more of the fleet.** Repos the METHOD never reached (`LEDGER_ONLY_REPOS`:
   Talkation, IApocalypse) get the telemetry hook alone; `telemetry:report` reads the
   transcripts too and names any "Ledger gap" (77.8 % of sessions had a ledger). Five blocking repos
   sit in `SKIP_REPOS` for this sync, to be reconciled one by one.

## What's New in v318.a
1. **The cohort follows the practice: 10 active mandates + 3 dormant.** Measured on 120 days
   (318 sessions, 1,469 delegations). **Iris** returns as *Study & Deliverables* — studies, data
   mining, client-grade reports, every number sourced, `inconnu` when unknown — and owns the new
   **anonymisation/GDPR rule** (client personal data is anonymised before anything leaves the repo or
   is published). **Lucia** returns as *METHOD release manager* — versioning, the sync (dry-run,
   clobber report, targets), upstreaming app proposals, `docs/improvement/ACTIONS.md`. **Sage** becomes
   *Prove* (the observed run that turns LANDED/DEPLOYED into PROVEN, then its regression test).
   **Junia** becomes *Plan* — **the coordinating conversation orchestrates**, not Junia. **Gordon**
   becomes *Commercial & growth* (ads unless the app's business pack names an owner). April, Aiko and
   Teddy stay dormant. Canonical: `agents-method.md`.
2. **Model routing recalibrated.** Nova and Gordon default to sonnet (opus by override), **Vera runs
   once per slice at the Recette** (always opus) instead of after every task, and **every Workflow
   worker gets an explicit `model`** (default sonnet). Opus produced 61.4% of output tokens; haiku 0.4%.
3. **SOUL split.** `## Non-negotiables` and `## Boundaries` are hub-owned and rewritten by every sync;
   identity, mission, personas and voice are app-owned and never touched. The payload `SOUL.md` is now
   a neutral seed.
4. **The contract reaches every app's `CLAUDE.md`.** The sync merges five sections by heading prefix —
   `## Agent Cohort`, `## Model Routing`, `## Landing & conversation size`, `## Communication Contract`,
   `## Design port directive` — so the delegation order, the Debrief and LANDED ≠ DEPLOYED stop being
   retyped (47 restatements in 120 days).
5. **A sync that cannot clobber.** Dormant agents move to `.claude/_dormant/` in apps (never deleted;
   `claudeAddon.activeAgents` keeps one), app-enriched agents are never overwritten, `--dry-run`
   prints a clobber report and the sync skips each CLOBBER file without `--force`; **Sync Protocol
   rule 4: `npm run doctor` green and `npm run doctor:fleet` showing no blocking finding — or each
   blocking repo skipped / declaring `claudeAddon.ownedSections` — before any sync.**
6. **Cadrage becomes mechanical, hooks stop committing telemetry.** `/land` refuses a newly added
   intervention or task file without `Journey:` + `Proof:`, in every app. Hooks no longer commit the
   ledger (318.a; 364 telemetry commits in 120 days); the file becomes untracked in a follow-up once
   every checkout runs the 318.a hooks. `npm run telemetry:report` aggregates it.
7. **Three dead weights cut, five contradictions fixed.** `sprint` and `ship-check` skills parked, the
   conversation-title convention dropped (0 of 301 titles), `/port` and `/relay` marked optional; every
   claim that landing deploys now reads LANDED (records PR #43), `/port` = one screen = one land, no file
   calls a dormant agent delegable, the ritual count is 8, and `agent-personas.ts` is documented as
   hand-maintained and parked.

## What's New in v317.a
1. **Two-moment contract: Cadrage · Recette.** The operator is invited in at the two ends of the
   work only — **🎯 Cadrage** (one `AskUserQuestion` fixing Journey/Proof/out-of-scope before the
   first edit) and **✅ Recette** (a recette table + the four states `CODED`/`LANDED`/`DEPLOYED`/
   `PROVEN`, never merged, before the Debrief) — never the middle, which stays autonomous except for
   the conflict gate. Canonical: `method-core.md` → "The two-moment contract — Cadrage · Recette".
2. **The CUJ is the unit, no gatekeeper agent.** Every conversation/sprint/task names the journey(s)
   it closes; `docs/METHOD/templates/CUJ-TEMPLATE.md` is a slim ~35-line shape (Persona · Raison ·
   Chemin A→Z · Preuve · Hors-champ · Fermé par) replacing the old Precision-Gate/Exit-Gate
   machinery; `TASK-TEMPLATE.md` requires `Journey:`/`Proof:` in its header; `scripts/method-doctor.mjs`
   (E9) fails any task/intervention file created on or after 2026-09-06 that omits them.
3. **Telemetry off the Stop-commit loop.** `session-telemetry.mjs` now only appends on `Stop`;
   committing and pushing the ledger moved to a `SessionEnd` hook (`--commit` flag), once per
   conversation instead of once per turn.
4. **`AGENTS.md` no longer imported into Claude's context.** `CLAUDE.md` dropped its `@AGENTS.md`
   import — `AGENTS.md` stays the non-Claude mirror, hand-kept in sync, but Claude Code loads its
   rules from `CLAUDE.md` directly.

## What's New in v316.a
1. **Cohort: 8 active mandates + 5 dormant.** Active — `junia` `brian` `sage` `watson` `kasper` `vera` `nova` `gordon`. Dormant — `teddy` `aiko` `april` `lucia` `iris`, parked under `.claude/_dormant/`, outside Claude Code's **recursive** agent discovery and outside the sync scope, so documented but neither loaded nor delegable. Gordon absorbs the SEA / Google Ads mandate. A dormant mandate can no longer own a live METHOD file — everything Lucia / Aiko / April owned reverts to **Junia**. Reactivating one is a `git mv` back into `.claude/agents/`: the operator's call, never an agent's mid-session decision.
2. **`.claude/agents/*.md` is the single source of truth per agent.** Each carries its own `## Identity` block (voice · refusals · deference · handoff) plus the cohort-wide `## Non-negotiables`; *(327.a: the Skill stub this entry describes no longer exists — `.claude/agents/` is the only surface.)* `.claude/skills/{agent}/SKILL.md` was a stub that loaded it and `Swanifly/web/lib/engine/agent-personas.ts` derives from it — its silent fallback to Brian is now a `throw`. The hand-mirrored copies that caused the drift are gone. Same rule for the **orchestration chain**, canonical in `agents-method.md` (`junia.md` carries the only authorized inline copy, since it is the file loaded at delegation time), with `kasper` **conditional** — only when `firestore.rules` / auth / API routes are touched.
3. **CI claims purged across 12 documents.** GitHub Actions is billing-blocked account-wide **by choice**, unrelated to the active GCP/Firebase billing (`SOUL.md` → "Boundaries"). No METHOD text, template or table may claim a pipeline runs automatically: the quality gate is the **local** Merge Gate (lint, typecheck, tests, build) and landing on `main` **is** the deploy. Alongside it: telemetry separates models by scope (`mainLoop.models` / `subAgents.models`), `guessSprint` no longer reads a year as a sprint number, and the addon installer generalises the content-guarded section merge into a table-driven `mergeSection()`.

> **Renumbered.** This lot was drafted as 315.b–315.e while the trunk published its own 315.b and
> 315.c (report-card format). The published numbers stand; the cohort work lands as this single
> 316.a entry. Per-item history: `versioning.md`.

## What's New in v315.c
1. **Every line earns its place.** Two rules turn the Debrief from readable into **actionable**. A bullet survives only if it changes a **decision**, an **action**, or a **mental model** — anything else is **deleted, not shortened**. And **name the object, never the activity**: `method-core.md:393` not "the method file", `npm run doctor` not "the checker", `afd4cd7` not "the last commit" — every nameable thing rendered as a clickable link or a runnable command, which only became possible once v315.b took the card out of the code fence.

## What's New in v315.b
1. **The Debrief and the Flight Deck leave the code fence.** A `text` fence renders small, monospace and unstyled — no bold, no colour, no clickable paths — which is why the card was still not being read. Both cards are now **plain markdown** framed by `---` rules: a `### ✅ Debrief · {lane}` title carrying the status emoji, then fixed section landmarks 📊 `Avancement` · 🧠 `À retenir` · 🤝 `Décidé pour toi` · ⚖️ `Tu décides` · ➡️ `Suite` · ⚠️ `Vigilance`. The progress bar is 5 emoji blocks 🟩/⬜. The ≤ 68-character and ≤ 16-line caps are **dropped** — they were workarounds for the fence; the rule is now one idea per bullet, no paragraph, six blocks max. Paths become clickable links. The `▶ Prompt suivant` stays fenced, because it is copy-paste. Placeholders switch to `{braces}` so a renderer cannot swallow them as HTML tags.

## What's New in v315.a
1. **Operator Reporting — the Debrief replaces the closing Orientation frame.** Every substantial answer now ends with one card built around the three questions the operator kept asking by hand: *ce qui vient d'être fait · où ça met le projet global · ce que je dois décider maintenant*. Rows: a one-line headline + status glyph, **`Avancement`** (position in the global project — a real count from sprint task files / plan to-dos / PORT-MAP rows / PRs, **never an invented ratio**), **`À RETENIR`** (2–4 one-line key facts, including a `Décidé pour toi :` line for every reversible call made without asking), **`TU DÉCIDES`** (0–2 operator calls, recommendation first, or `rien — j'ai tranché : …`), **`SUITE`** (exactly one next action) and an optional `⚠` line, then the `▶ Prompt suivant` block. Hard discipline: ≤ 16 lines, ≤ 68 characters, **no wrapping paragraph inside the card** — the previous frame failed precisely because prose blobs were stuffed into framed rows. Cadence: full card on substantial answers · one landing line on small ones · no card when nothing was done. **Delegated sub-agents never emit a Debrief** — they hand their orchestrator a `Done / State / Next` report and the orchestrator renders one card for the whole chain. The **Flight Deck** becomes the **pickup** card only (`/brief`, resume hook, cold start), ending the two-overlapping-summaries redundancy, and the 3-line header is scoped to written artifacts (PR bodies, task reports). Canonical: `method-core.md` → "Operator Reporting". Tooling: `flight-deck.ps1 -Mode context` now emits `sprint` + `sprint_progress` (counts both the METHOD emoji markers and the ASCII `[ ]`/`[x]` convention most app repos actually use), so `Avancement` is grounded for free on `/brief` and on resume.

## What's New in v314.b
1. **One sprint = one conversation = one branch = one worktree.** Two canonical rules contradicted each other — `agents-engineering-method.md` §9 said *"One thread per task"*, `sprints-method.md` said *"One sprint, one conversation"* — so an operator reading both did not know how many windows to open. Arbitrated once, in **`sprints-method.md` → "Conversation Naming"**, which is now the single home of the session-splitting rule; everywhere else points to it. The rule is dictated by the two `Stop` hooks in `.claude/settings.json`: `ship-push.sh` and `session-telemetry.mjs` both no-op on `main`/`master`/`HEAD` and both push the current branch **swallowing a rejected push** — so two sessions on one branch make the second one's work invisible to every downstream reader while it exists only locally, and two sessions in one worktree share an index (`/ship`'s `git add` stages the other's mid-edit files). Three lanes, ASCII titles, sprint number first: **Sprint** `{NNN} {sujet}` / `sprint/{NNN}-{slug}` · **Split** `{NNN} {sujet} · {seq} {titre}` / `sprint/{NNN}-{seq}` + its own worktree · **Intervention** `INT {YYYY-MM-DD} {sujet}` / `int/{date}-{slug}`; the operator's uppercase lane prefixes (`PILOT - `, `PROD - `, `AUTOM - `, `GROWTH - `) are documented as the non-sprint form. **The choice is runtime, never planning-time** — default to a sub-agent inside the sprint conversation; a workflow at ≥ 3 near-identical items; a new session only once one of four facts has *already* happened (3rd build→test→fix loop on the same card · another repo · its own deploy+verify loop with the operator · two code-writing cards concurrently). **No `Session:` field was added to the task template** — its neighbour `Tier:` is mandatory since v311.a and is filled in **0 of 85** task files under `Apps/*/docs/sprints/`. Only the sprint conversation runs `/relay` (one `## Resume here` per app, `method-core.md`).
2. **Delegation by default, as a standing order.** New **"Délégation par défaut"** section in the hub `CLAUDE.md` and in `payload/CLAUDE.md` (kept identical), under Model Routing: coordination stays in the conversation; every delegation goes out on the cheapest model that meets the bar (haiku mechanical · sonnet build/tests/ops · opus judgment/review/security); a workflow at ≥ 3 similar items; a parallel session only on an observed trigger; and **offloading context is a goal in itself** — residue-heavy exploration goes to a sub-agent that returns only its conclusion. It was being retyped by hand every session.
3. **Count drift corrected** (each verified against the filesystem): `.claude/commands/` **4 → 6** rituals (`/relay` and `/ship` were undocumented) in `METHOD.md` ×2, `docs/METHOD/README.md`, `routing-method.md` ("By Slash-Command" table), hub `CLAUDE.md`, `.claude/agents/README.md`; `.claude/agents/` **12 → 13** sub-agents in `METHOD.md` ×2; addon README **5 → 6** commands and **8 → 9** skills (`media` was missing).

## What's New in v314.a
1. **The hub stops versioning 17 copies of itself.** 2,031 mirror files under `Apps/**/docs/METHOD/`, `Apps/**/.claude/` and the seeded `PORT-MAP-TEMPLATE.md` are now **gitignored** (files stay on disk, the sync still writes them). They were the *cause* of the version drift v313.b detects: 18 places to change one rule, a 3,511-item diff per release that tripped the landing gate's `scale` exception every time, and `grep` returning 18 hits for one sentence. Verified safe first — every mirror file was payload-generated and all 18 app `settings.json` were byte-identical. **Pulling this release removes the mirrors from a checkout's disk; run `npm run sync-method:all` once per machine to repopulate.** Never author inside a mirror: the sync overwrites it and git has no copy.
2. **Doctor E8 locks the decision in.** Any `Apps/**/docs/METHOD/*` or `Apps/**/.claude/*` path that gets tracked again fails `npm run doctor`. W1 now reports stale *generated output*, not repo drift; W3 notes that `Apps/_archived/**` is out of the sync scope so its mirror can only rot.
3. **Landing gate lane patterns are depth-agnostic.** `verify-gate.mjs` anchored `docs/` and `.claude/` at the repo root, so a fleet-wide change fell through to the **app** lane and would have run a real build per nested app. Fixed in the hub and the payload together (doctor E5 keeps them identical).

## What's New in v313.b
1. **METHOD consistency is now machine-checked — `npm run doctor`.** `scripts/method-doctor.mjs` fails on: the declared version disagreeing across `METHOD.md`/`README.md`/`versioning.md`, a release with no changelog entry, a file declaring two different `**Version:**` stamps, a stamp newer than declared, **an addon payload file that no longer matches the hub copy** (how apps silently receive a stale hook), a hook wired in `.claude/settings.json` that does not exist, and a `docs/METHOD/*.md` reference that does not resolve. It warns on duplicate-but-agreeing stamps, fleet mirrors behind the hub, and app roots the v313.a landing gate cannot verify. **Sync Protocol rule 4: doctor green before you sync** — a sync multiplies any hub inconsistency by 17.
2. **One metadata block per file.** Four duplicate footer stamps removed (`ai-infra-method.md`'s had disagreed with its own header since 306.c and still named a demoted owner); `**Last Updated:**` folded into each header. The convention is written down in `versioning.md` → "Per-file version stamps" instead of being folklore.

## What's New in v313.a
1. **Land, don't ship — the operator stops managing pull requests.** Every conversation now ends on `main`, and a PR is the **exception** (the artifact of a decision only the operator can make), never the normal path. Two new machine-checked pieces, both portable via the addon: **`.claude/hooks/verify-gate.mjs`** classifies the diff into lanes — `doc` (nothing to run) · `tooling` (`node --check`) · `app` (that app's `lint`/`typecheck`/`test`/`build`) — and stamps `.method/verify-ok.json` **pinned to the HEAD sha**; **`.claude/hooks/land.mjs`** refuses to land without a green marker *at the current commit*, merges `origin/main` in (never rebases), then `git push origin HEAD:main` — so any open PR for the branch closes itself as merged and the trunk is never checked out (worktree-safe). Fails **closed**: app code in an app exposing no `typecheck`/`test`/`build` cannot land at all.
2. **The exception list, decided once instead of per PR.** schema / Firestore rules · auth, secrets, middleware · `SOUL.md` · real dependency or lockfile changes (a `scripts`-only `package.json` touch does not block) · migrations · deploy/CI wiring · >60 files or >2000 deleted lines · `[no-auto-merge]` / `[wip]` / `[hold]` / `Needs decision` in a commit · `wip` branch name · red, absent or stale verify · trunk conflict. Held back → the branch is pushed, a PR is opened or commented **once** with the exact reason, and the report carries a `### Needs decision` block. Harmless false positive → land it with **`[land-anyway]`** in the commit subject and say why.
3. **It happens without being asked.** `Stop` hook lands the **docs/tooling lane only** after every turn (zero build risk, and where the PR backlog actually came from); `SessionEnd` attempts a **full land** when the conversation ends; `/land` is the explicit close at slice end. `npm run land:sweep` reports every open PR with what blocks it, `land:sweep:apply` squash-merges the clean ones — so a backlog can't rebuild silently.
4. **Slice discipline = the token control.** One conversation = one slice = one landing. A landed slice needs no `/relay` (`main` *is* the state), and an open PR is a token liability — the work returns in a new window with the context re-derived from scratch. `/ship` is demoted to the exception path; `/land` is the default. Canonical: `method-core.md` → "Landing (the default) & the exception list" + "Slice discipline".

## What's New in v312.b
1. **Output Compression — terse where it's cheap, complete where it matters.** One boundary settles the question: compress the **conversation**, never the **artifact**. Compress freely in build/debug/ops chat, status pings and settled context; never compress committed docs (task files, `STATE.md`, `DESIGN.md`, `SCHEMA.md`, PR bodies, `/relay` blocks), user-facing EN/FR copy, Vera verdicts / Kasper findings, the 3-line header or a `### Needs decision` block. Two invariants hold everywhere: code, commands, paths, error strings and numbers verbatim; the handoff is always a doc. Third-party compression skills (Caveman & co.) are **opt-in per session, not a fleet default** — output tokens are the minority of agentic spend, such skills add ~1–1.5k input tokens per turn, so measure the delta with the Session Telemetry Ledger before adopting one. Canonical: `routing-method.md` → "Output Compression".

## What's New in v312.a
1. **Session Telemetry Ledger — the Model Routing feedback loop.** A Claude Code Stop hook (`.claude/hooks/session-telemetry.mjs`) appends one JSON row per invocation to `docs/project/telemetry/sessions.jsonl`: tokens (main-loop + delegated sub-agents/workflows, deduped per API call), message counts, duration, model(s), best-effort topic/sprint. Fails open, silent on success, append-only (dedupe by `sessionId`, keep the newest row when reading). No dollar-cost computed — raw tokens only, pricing changes too often to hardcode. Ships to every app via the addon (`install.mjs` now also merges the `Stop` hook, idempotent, preserves any custom `Stop` hook an app already has). Codex/Cursor have no automated equivalent yet — self-report manually. Canonical: `routing-method.md` → "Session Telemetry Ledger".

## What's New in v311.a
1. **Model routing by default — orchestrate high, execute cheap.** The coordinator (Junia / review gates / security) runs on the strongest model of its surface (**Fable/Opus** on Claude); every delegated task runs on the **cheapest model that meets its quality bar**. Three tool-agnostic tiers — **T1** judge/plan/review/security (opus) · **T2** build/tests/ops (sonnet) · **T3** mechanical (haiku, delegation-time override only). Junia tags every task file `Tier: T1|T2|T3` at planning and overrides the sub-agent's default `model:` frontmatter at delegation when tiers differ; one retry max per tier, then escalate; Vera/Kasper never below T1. **Environment awareness:** on non-Claude surfaces (Cursor, Codex), the coordinator first inventories the models the tool actually exposes and maps them onto the tiers — never assumes a vendor lineup. Canonical: `routing-method.md` → "Model Routing".

## What's New in v310.a
1. **`/relay` handoff ritual (alias `/handoff`)** — the **dropoff** half of context handoff, the inverse of `/brief`. Where `/brief` rehydrates a fresh conversation from git + `STATE.md` + memory, `/relay` flushes the current conversation's volatile working-state (settled decisions, dead ends, exact next action) into `STATE.md`'s new **`## Resume here`** section and emits a pasteable Relay block. Six-row schema — **But · Acquis · État · Charge · Prochaine · Pièges** (pointers, never payloads). Relay only at a clean boundary (state already in git + STATE.md + task report), never mid-thrash. Complementary rule: offload residue-heavy exploration to sub-agents (Iris / Explore) so fewer Relays are needed. Ships to every app via the addon payload. See `.claude/commands/relay.md` + `method-core.md` → "Project State & Handoff".

## What's New in v309.b
1. **Design Port Loop v2 — living `proto/` directive** — Claude Design is **bootstrap only**: it seeds `proto/` at each app's root, where the prototype **evolves in place** (design + features worked out in HTML *before* development). `/port` implements one screen per PR **from the proto**; design changes go proto-first, then a re-port PR. `docs/project/design/artifacts/{app}/` retired for new work (fallback kept). Proto rules: token/class contract mandatory; fake data confined to `proto/`, never shipped/imported; conflict gate unchanged. See `design-method.md` → "Design Port Loop" + "Proto workspace".
2. **Addon merge is now content-guarded** — `swanifly-claude-addon/install.mjs` refreshes the "Design port directive" block in app `CLAUDE.md` when the canonical snippet changes (was add-once), and tolerates symlinked `.claude/skills`.

## What's New in v309.a
1. **Runners & Orchestration layer** — Documented the native execution stack: **native sub-agents** (`.claude/agents/`, the default) → **Agent Teams** (parallel) → **Cowork** (desktop) → **Swanifly** (one runner, not *the* engine). See the new section below.
2. **Cohort 10 → 12 executable agents** — Promoted **Gordon** (Sales/Marketing) and **Kasper** (Security) to native sub-agents + Skills. **Riley** (API/automation) stays a demoted advisory hat (not executable).
3. **Native sub-agents + slash-commands** — The cohort is delegatable in Claude Code via `.claude/agents/`; rituals run as `/plan-sprint`, `/review`, `/intervention`, `/port`. `routing-method.md` now teaches the native flow, not manual role-switching.
4. **Parallel + fleet model** — Worktree isolation, fan-out on independent tasks, dependency gates, merge policy, and the multi-repo (~30-app) dimension.
5. **Gates** — the no-mock guard (`PostToolUse`), the `permissions.deny` Bash blocklist and per-agent `tools:` frontmatter are wired. DoD, Kill-Gate and `sage`'s write-path scoping are prose, not hooks.
6. **Design Port Loop** — `docs/porting/PORTING-PLAYBOOK.md` promoted into the design method: PORT-MAP-first, one-screen-per-PR, reconcile-don't-overwrite + the MUI-hex token bridge.
7. **AI infra refresh** — `ai-infra-method.md` re-owned to **Aiko**; model lineup → 2026 baseline (Fable 5 / Opus 4.8 / Sonnet 4.6 / Haiku 4.5 + 1M context).
8. **Stack-drift caveat** — Declared stack = TARGET; detect the app's actual stack first (`Apps/web` = Next 14 + MUI flat; BanAventures = Vite + Tailwind).
9. **Claude Code addon** — `tools/swanifly-claude-addon/` seeds `SOUL.md`, `CLAUDE.md`, Skills, and a no-mock-data guard hook into apps through `sync-method:all` (skip with `--no-claude`).

---

## Philosophy

```
METHOD > VISION > PLAN > FOCUS > TASK > CODE
```

| Principle | Rule |
|---|---|
| **Docs-First** | Write docs before code. Update docs with code. |
| **Focus-First** | One objective at a time per app. Taquet: finish before switching. |
| **Process-First** | An AI app carries processes, not just features. Define processes before assigning agents. |
| **Adaptive** | Core Loop (plan → build → one review per slice → land → prove). Specialists join on demand. |
| **Lightweight** | No process unless it prevents a real problem. |
| **Local-First** | Filesystem is truth. No external DB for project state. |

---

## METHOD Files (19 docs + native layer)

> 19 synced METHOD docs (9 Core + 10 Support), **plus** the repo-root native layer:
> `CLAUDE.md`, `.claude/agents/` (18 active sub-agents + README; 3 dormant under `.claude/_dormant/`), `.claude/skills/` (13 capability skills, no persona stubs since 327.a), `.claude/commands/` (11 rituals).

### Core (9) — Always synced

| File | Owner | Purpose | Size |
|---|---|---|---|
| `METHOD.md` | Lucia | This file. Entry point + routing. | ~16 KB |
| `method-core.md` | Lucia | Principles, tech stack, DoD | ~13 KB |
| `agents-method.md` | Lucia | 18 active + 3 dormant agents, roles, rituals | ~60 KB |
| `sprints-method.md` | Junia | Sprint system, gates, rituals | ~16 KB |
| `design-method.md` | Nova · Maya · Alba (per section) | M3 design constraints, nav patterns, brand | ~66 KB |
| `ai-infra-method.md` | Brian | Multi-provider AI architecture | ~41 KB |
| `tests-method.md` | Sage | Testing strategy, visual snapshots | ~14 KB |
| `definition-method.md` | Junia | Definition pipeline (3 phases) | ~7 KB |
| `process-method.md` | Junia | Process architecture for AI-native apps | ~14 KB |

> Lucia is active again (318.a) as METHOD release manager and owns the core METHOD files; Aiko and
> April stay dormant and own nothing live — AI infra goes to **Brian**, planning files to **Junia**.

### Support (10) — Load on demand

| File | Purpose |
|---|---|
| `routing-method.md` | Agent routing worked examples |
| `code-rules.md` | Smart code rules (types, perf, security) |
| `claude-rules.md` | Working agreements (status, citations, i18n) — Claude Desktop + Code |
| `prompting-method.md` | AI prompting activity logging |
| `versioning.md` | Version scheme + sync protocol |
| `README.md` | Quick start for new projects |
| `agents-engineering-method.md` | Agent team architecture on the Claude suite (Desktop + Code + Artifacts) |
| `agent-launch-prompts.md` | Pre-built launch prompts per METHOD agent |
| `tone-method.md` | Voice frame, tone review, the evolution loop (Lise) — plus `templates/TONE-*-TEMPLATE.md` |
| `chief-contract.md` | What Chief reads in every repo and the hub, the fields relied upon, the change rule (D24) |

> Plus root `CLAUDE.md` (canonical context), `.claude/skills/` (13 capability skills — no persona stubs),
> **`.claude/agents/` (18 active delegatable sub-agents + README), and `.claude/commands/` (11 rituals:
> `/land`, `/ship`, `/intervention`, `/plan-sprint`, `/review`, `/brief`, `/retro`, `/clean`, `/project`, and the optional `/port`,
> `/relay`)**. See `agents-engineering-method.md`.

### Tools (synced to all apps)

| Tool | Purpose | Command |
|---|---|---|
| `tools/lucia-analytics/` | Dev-transcript harvester + analytics dashboard | `node analyze.mjs` |
| `tools/banaguard/` | System RAM/CPU watchdog | `start.vbs` / `banaguard.ps1` |
| `tools/swanifly-claude-addon/` | Seed Claude Code skills, project context, and no-mock guard into apps | `npm run sync-method:all` |

> The Antigravity IDE patchers (`banabooster/`, `swanifly-antigravity-addon/`) and the
> `proto-kit/` live tuner were **removed in v308.a** — see the Claude suite migration in
> `agents-engineering-method.md`.

### App-Level (editable per app)

- `app-settings.json` — App config (name, version, sync, features)
- `project/` — App-specific docs (VISION, DESIGN, ROADMAP, FOCUS, etc.)

---

## Definition Pipeline (NEW)

**Before BUILD, every app must pass through 3 phases.**

```
DISCOVER ──→ SPECIFY ──→ PROTOTYPE ──→ BUILD
   │             │             │
   ▼             ▼             ▼
 brief.md    specs/01..19   Claude Artifacts
 competitive  (book)       (interactive, M3 tokens)
 master-prompt              → project/DESIGN.md
```

### Phase 1: DISCOVER

| Deliverable | Content |
|---|---|
| `fundations/brief.md` | Problem, idea, principles, MVP scope, tech direction |
| `fundations/competitive-analysis.md` | Market positioning, competitors, differentiation |
| `fundations/master-prompt.md` | System prompt for AI agents working on this project |

**Gate:** Human validates brief before moving to SPECIFY.

### Phase 2: SPECIFY

**Output: Specification Book** — Up to 19 chapters covering:

| # | Chapter | Content |
|---|---|---|
| 01 | Vision | Executive summary, problem, solution |
| 02 | Tech Stack | Architecture decisions |
| 03 | Data Models | Schemas, relationships |
| 04 | Personas | User archetypes |
| 05 | Features | Module inventory |
| 06 | Navigation | Routes, views, flows |
| 07 | Design System | Tokens, components, patterns |
| 08 | AI Strategy | Models, capabilities, costs |
| 09 | CUJ | Critical User Journeys |
| 10-19 | Domain-specific | Business, security, scaling, etc. |

**Gate:** Human validates spec book before PROTOTYPE.

### Phase 3: PROTOTYPE

**Output: Interactive HTML prototypes** — one per key view.

- Static HTML + CSS + JS (no framework needed)
- M3 design system applied
- All navigation functional (click-through)
- Realistic data (not lorem ipsum)

**Gate:** Human validates prototype before BUILD starts.

**See:** `definition-method.md` for detailed templates and examples.

---

## Focus System (NEW)

Every app has a `project/FOCUS.md` — the single-objective tracker.

```markdown
# FOCUS — {AppName}

## 🔴 NOW (1 seul objectif — effet taquet)
**Ne pas passer au suivant tant que non ✅**

- [ ] {objective description}
  - Sprint: {sprint ref}
  - Owner: {agent}

## 🟡 NEXT (3 max)
1. {next objective}
2. {next objective}
3. {next objective}

## 🟢 LATER
- {big picture item}

## 📝 PARKING LOT
- {idea to explore later}
```

**Rules:**
1. Only 1 item in NOW at any time
2. NOW must be ✅ before promoting from NEXT
3. FOCUS.md is auto-injected in AI chat context
4. Updated at sprint boundaries by Junia

---

## Cross-App Governance (NEW)

**BanaPilot** provides visual governance:

| Feature | Mechanism |
|---|---|
| METHOD version tracking | Per-app badge (synced / outdated / drift) |
| Drift detection | Hash comparison of METHOD files vs source |
| Sync actions | Force Update / Resolve Conflict per app |
| Focus visibility | Cross-app NOW/NEXT view |
| Health scoring | % of METHOD files present and up-to-date |

**Sync CLI (run from Bana-Share root):**
```bash
# Push METHOD → all apps
npm run sync-method:all        # node scripts/sync-method-to-all-apps.mjs
npm run sync-method:all:dry    # preview without writing
```

---

## Agent Cohort (18 active mandates + 3 dormant)

Each agent runs **one way**: as a delegatable **native sub-agent** in `.claude/agents/{agent}.md`, on every Claude surface. The fourteen Desktop Skill stubs were deleted in 327.a — they re-loaded each description a second time in every session and carried 2 of ~140 delegations; `.claude/skills/` now holds **capabilities** only, each naming its owner. (`Swanifly/web/lib/engine/agent-personas.ts` is hand-maintained and parked — not derived from the agent files.) An agent earns a name when its mandate is one you would otherwise have to retype; eighteen mandates hold that bar. **The coordinating conversation orchestrates them** — not an agent.

| Agent | Mandate | Entry Files |
|---|---|---|
| **Junia** | Plan — request → plan/to-do (or a sprint) + its Cadrage | `sprints-method.md` → `project/` |
| **Brian** | Build — web development | `method-core.md` → `project/DESIGN.md` → task |
| **Sage** | Prove — the observed proof of a journey, then its regression test | `tests-method.md` → task → `journeys/` |
| **Watson** | Repair — reliability & ops | `method-core.md` → `tests-method.md` |
| **Kasper** | Guard — security | `method-core.md` (Security Baseline) → `project/SCHEMA.md` |
| **Vera** | Judge — one review per slice, at the Recette (no commits) | `method-core.md` → `design-method.md` → task |
| **Maya** | UX research & IA — discovery, navigation taxonomy, shell, layout patterns, port order | `design-method.md` (her four §§) → `project/DESIGN.md` → `SOUL.md` (Personas) |
| **Nova** | Draw — design system, tokens, motion, a11y, dark mode, `proto/`, visual validation | `design-method.md` → `project/DESIGN.md` |
| **Alba** | Brand & visual assets — logo usage, icon system, imagery, `/media` | `design-method.md` (her three §§) → `project/brand/` |
| **Gordon** | Commercial & growth — offers, funnels, EN/FR copy, campaigns, paid ads | `agents-method.md` → `project/VISION.md` → `docs/growth/` |
| **Iris** | Study & deliverables — studies, data mining, client-grade reports; owns anonymisation/GDPR | `method-core-lite.md` → `project/STATE.md` |
| **Hugo** | METHOD tooling — hooks, `verify-gate`, `land`, sync engine, installer, doctor, telemetry | `method-core.md` (Landing) → `versioning.md` (Sync) → the tool |
| **Lucia** | METHOD release manager — versioning, sync, upstreaming, `ACTIONS.md`, **and the operating model** | `versioning.md` → `METHOD.md` |
| **Penny** | Token economy — measure, report, coach; proposes METHOD changes to Lucia | `routing-method.md` → `project/telemetry/` |
| **Oscar** | Coach — weekly retro: effectiveness, focus, objectivity, lucidity, objectives | `method-core.md` → `project/STATE.md` + `FOCUS.md` |
| **Régine** | Régie — session, worktree & work-in-progress hygiene; archives, never deletes work; removes integrated branches through `branch-sweep` | `sprints-method.md` ("The chantier") → `repo-icons.json` |
| **Lise** | Tone & voice — reviews public-facing text against the repo's voice files; runs the tone loop | `tone-method.md` → `project/brand/tone/` |
| **Stella** | Organic visibility — SEO, GEO/AEO, social search, forums, directories & entity, blog, digital PR; drafts only, published on the operator's GO per batch | `agents-method.md` → the organic-visibility study → `docs/growth/` |

### Dormant (not loaded, not delegable)

Parked under `.claude/_dormant/`, outside the directories Claude Code scans: documented, but neither loaded nor delegable. Bringing one back is a `git mv` plus a release — the operator's call.

| Agent | Was | Covered by |
|---|---|---|
| **Teddy** | Mobile Development | Brian — mobile is a mode, not a person. |
| **Aiko** | AI Integration | Brian — wiring AI is building. |
| **April** | Vision, Copy, CUJ | Junia's Cadrage draft (vision) + Gordon (copy). |

> **Advisory hat (not executable):** **Riley** (API & multi-agent automation) is wielded inside
> a Desktop chat with the relevant METHOD file loaded — there is no Riley sub-agent or Skill.
> Promote to a Skill / sub-agent when the work becomes recurrent.

**See:** `agents-method.md` for detailed rituals and info-surfaces.

---

## Runners & Orchestration

The METHOD is **runner-agnostic**. The same cohort + the same task docs execute on any of four runners — pick the lightest that fits the job. Swanifly is **one runner, not *the* engine**.

| Runner | What it is | When to use | Parallel? |
|---|---|---|---|
| **Native sub-agents** (default) | `.claude/agents/*.md` — delegatable personas with scoped tools, invoked inside one Claude Code session | Everyday work; the coordinating conversation delegates task-by-task | Sequential (one delegate at a time) |
| **Agent Teams** | Multiple sub-agents fanned out across **git worktrees** in parallel | Independent tasks in a sprint (same `-seq` letter); fleet-scale work | ✅ true parallel |
| **Cowork** | Claude Desktop's local **Code tab** — same `.claude/agents` + `.claude/commands`, driven from the desktop cockpit | Operator wants Desktop's plan/review surface with local execution | Sequential |
| **Swanifly** *(parked)* | `Swanifly/web/lib/engine/` spawned the `claude` CLI per persona to automate execute→test→commit→push→PR | Paused — nothing in the METHOD depends on it | ✅ orchestrated batch |

**Orchestration (the coordinating conversation owns it):**
1. **Plan** → Junia writes the plan (or, by exception, the sprint folder + task files) and drafts the Cadrage; the coordinator asks the operator.
2. The coordinator **delegates** each task to its owner sub-agent (`brian`/`nova`/`gordon`/`iris`/…). Independent tasks fan out as an **Agent Team** across worktrees; dependent tasks gate in sequence.
3. The rest of the order is the one defined once in `agents-method.md` → "Orchestration chain" — fix-if-red, the conditional security pass, then the Recette. Reference it, don't restate it.
4. `/review` → **Vera** validates the slice once (read-only, opus, never commits) → `☑️`.
5. **Land** on `main` once the **local** verify gate is green — `.claude/hooks/verify-gate.mjs` classifies the diff into lanes (`doc` · `tooling` · `app`) and runs that lane's `lint`/`typecheck`/`test`/`build`, then `.claude/hooks/land.mjs` merges `origin/main` in and pushes `HEAD:main`. `/land` is the default close; `/ship` (a PR) is the exception list (`method-core.md` → "Landing (the default) & the exception list"). There is no CI: GitHub Actions is billing-blocked account-wide, by choice (`SOUL.md` → Boundaries) — the gate is local, and landing on `main` is **LANDED**: deploying is its own step (DEPLOYED, the served revision), and `sage`'s observed run of the Proof makes it PROVEN.

**What is actually machine-enforced** (`.claude/settings.json` — there is no `PreToolUse` block): a `PostToolUse` no-mock guard on `Write|Edit`, three `Stop` hooks (auto-push, session telemetry, `land --auto --lane docs`), a `SessionEnd` full-land attempt, a `permissions.deny` Bash blocklist, per-agent `tools:` frontmatter in `.claude/agents/`, and (318.a) the landing gate's refusal of a newly added intervention or task file without `Journey:` + `Proof:`. Tool omission is real enforcement — `vera` has no `Write`/`Edit`. Everything else is prose: `sage`'s tests-only rule, the DoD, the Kill Gate and the E2E-green gate are honor-system, and `sage`'s tool list is identical to `brian`'s.

**See:** `agents-engineering-method.md` (runner architecture), `.claude/agents/README.md` (delegation + hooks), `sprints-method.md` (parallel/fleet model).

---

## Sprint Structure

**Folder:** `docs/sprints/{NNN} {status} {name}/`

**Status tags:** `⬜` Todo · `✅` Done · `☑️` Validated · `⚠️` Problem

**Files:**
```
docs/sprints/007 ⬜ venue-proto/
├── 007-a ☑️ Brian - Hero section.md
├── 007-b ✅ Nova  - Venue card component.md
├── 007-c ⬜ Brian - Booking flow.md
└── 007 ⬜ 🚀 Launch Prompt.md
```

**Task completion protocol:**
1. Update task status → `✅`
2. Commit: `007-a done — Hero section`
3. Land it (`npm run land`) — LANDED, not deployed
4. Update sprint folder status if needed

**See:** `sprints-method.md` for gates, rituals, launch prompts.

---

## Definition of Done

**9 items. No bloat.** One canonical list — **`method-core.md` → "Definition of Done"**, plus the task-specific gates below it. It is not restated here: five divergent copies (9 / 9 / 11 / 8 / 8) were live until 2026-08-04, so the template every task was generated from could not satisfy the gate it was judged by.

---

## Tech Stack (Default)

| Layer | Stack |
|---|---|
| Web | Next.js (App Router) · TypeScript strict · **Material Design 3** · Firebase |
| Mobile | React Native + Expo · TypeScript · NativeWind + MD3 · Firebase |
| AI | Gemini-first · Multi-provider (Claude, Mistral, GPT-4o) · Vertex AI |
| Testing | Vitest (unit) · Playwright (E2E) · Visual snapshots |
| i18n | next-intl (EN/FR baseline) |
| Design | **M3 mandatory** — Tonal surfaces, shape tokens, state layers |

**Override:** Apps can override in `project/tech-stack.md`.

---

## Context Loading Rules

1. **Load your agent entry files** (see Quick Start table)
2. **Load the task file if executing a task**
3. **Load FOCUS.md** — always know the current objective
4. **DO NOT load entire METHOD/** — use entry points
5. **Max 3 METHOD files per chat** — be surgical
6. **Load journeys/ only for CUJ work**
7. **No `Journey:` / `Proof:`?** → run the Cadrage (Junia drafts, the operator answers) — `/land` will refuse a new task or intervention file without them

---

## Core Innovations (v306.c)

| # | Innovation | File |
|---|---|---|
| 1 | Modular Architecture — 15 focused files | `METHOD.md` |
| 2 | Multi-Entry Routing — load 2-3 files, not 15 | `routing-method.md` |
| 3 | Two Namespaces — `method/` (synced) + `project/` (local) | `versioning.md` |
| 4 | Global Agent Cohort — 18 active + 3 dormant (native sub-agents; no Skill stubs since 327.a), 3 tiers | `agents-method.md` |
| 5 | **Definition Pipeline** — DISCOVER → SPECIFY → PROTOTYPE | `definition-method.md` |
| 6 | **Focus System** — Single-objective taquet per app | `project/FOCUS.md` |
| 7 | **Cross-App Governance** — BanaPilot drift detection | `versioning.md` |
| 8 | **M3 Design Standard** — Material Design 3 mandatory | `design-method.md` |
| 9 | CUJ-First Motion — Cadrage before planning | `method-core.md` |
| 10 | Commit & Sync per Task — push after every `✅` | `method-core.md` |
| 11 | Sprint Folder Status — `✅`/`☑️`/`⚠️` in folder name | `sprints-method.md` |
| 12 | Sprint Launch Prompts — copy-paste ready for new chat | `sprints-method.md` |
| 13 | Data Governance — Zod schemas, migration protocol | `method-core.md` |
| 14 | Visual Snapshot Testing — screenshots at sprint end | `tests-method.md` |
| 15 | **Artifacts Prototyping** — Claude Design replaces the proto-kit tuner | `design-method.md` |
| 16 | **Process Architecture** — Process-first AI governance | `process-method.md` |
| 17 | **Trust Progression** — Data-driven delegation promotion/demotion | `process-method.md` |
| 18 | **Agent Contracts** — Formal specs for application-level AI agents | `process-method.md` |
| 19 | **Claude Suite Migration** — Desktop + Code + Artifacts replace Cursor/Antigravity | `agents-engineering-method.md` |
| 20 | **Agent Skills + Sub-agents** — Cohort as Claude Skills (Desktop) AND delegatable sub-agents (Code) | `agents-engineering-method.md`, `.claude/skills/`, `.claude/agents/` |
| 21 | **Runners & Orchestration** — Sub-agents → Agent Teams → Cowork → Swanifly (one runner); gates-as-hooks | `agents-engineering-method.md`, `.claude/settings.json` |

---

## Version & Sync

**Current Version:** 336.b  
**Epoch:** 3 (Modular & Multi-Entry)  
**Released:** 2026-10-29

### Version Scheme

- **Minor (a→b):** Clarifications, bug fixes
- **Major (308→309):** New file, significant change, new sub-agent / command / hook, cohort or installer change
- **Epoch (399→400):** Foundational overhaul

**See:** `versioning.md` for the newest 5 releases and the sync protocol; older releases are in `docs/archive/METHOD/versioning-history.md` (hub only).

---

## Support

| Need | Action |
|---|---|
| Question | Read this file → check specific method file |
| Bug | `docs/bugs/BUG-###-{agent}-{issue}.md` |
| Proposal | `docs/interventions/YYYY-MM-DD-{agent}-{topic}.md` |

---

**Owner:** Junia  
**Last Updated:** 2026-10-17
