# METHOD Versioning & Sync Protocol

**Owner:** Lucia  
**Version:** 319.a  
**Last Updated:** 2026-10-10  
**Purpose:** Version scheme, sync protocol, migration policy

---

## Version Scheme

**Format:** `MAJOR.LETTER`

- **MAJOR**: Epoch or significant release (300, 301, 400...)
- **LETTER**: Minor revision (a, b, c...)

**Current:** 319.a (Epoch 3: Modular & Multi-Entry)

### Per-file version stamps

**One metadata block per file, in the header, and only there** — `**Owner:**` / `**Version:**` /
`**Last Updated:**` / `**Purpose:**`. A file's stamp is the version at which **that file** last
changed, so lagging behind the declared version is normal and honest; what is not allowed is:

- **two stamps in one file** — a footer copy is a drift generator, never a second source of truth
  (v313.b removed the last four, one of which had disagreed with its own header since 306.c);
- **a stamp newer than the declared version** — nothing may claim to ship ahead of `METHOD.md`;
- **a release with no `Version History` entry** in this file.

All three are checked by `npm run doctor` (`scripts/method-doctor.mjs`), so the rule is enforced
rather than remembered.

### Epochs

- `100-199`: Epoch 1 (Prototype)
- `200-299`: Epoch 2 (Production-ready)
- `300-399`: Epoch 3 (Modular & Multi-Entry) ← **Current**
- `400-499`: Epoch 4 (Future: Advanced Orchestration)

---

## When to Increment

### Minor (300.a → 300.b)
- Documentation clarification
- Bug template improvement
- Typo fixes
- Cross-link corrections

### Major (300.z → 301.a)
- New METHOD file added
- Significant process change
- New agent in cohort, or an agent reactivated / re-scoped
- DoD changes
- Installer or sync behaviour that changes what lands in an app
- Breaking file structure changes
- **New native sub-agent** added to `.claude/agents/` (delegatable persona)
- **New slash-command ritual** added to `.claude/commands/` (e.g. `/plan-sprint`, `/review`, `/port`)
- **New enforcement hook** wired in `.claude/settings.json` (gate-as-hook)

### Epoch (399.z → 400.a)
- Foundational overhaul
- New orchestration paradigm
- Complete METHOD rewrite

---

## Sync Protocol

### Direction of Truth

> **Source of truth = `Bana-Share`.** METHOD files are authored here and pushed out to all
> apps. (`SprintOS` was the legacy name of this hub; the repo is now `Bana-Share`.)

> **The mirrors are generated output, not versioned content (v314.a).** `Apps/**/docs/METHOD/`,
> `Apps/**/.claude/` and the seeded `PORT-MAP-TEMPLATE.md` are **gitignored in the hub**. They
> still exist on disk and the sync still writes them — the hub simply stopped versioning 2,031
> copies of its own content. Tracking them meant 18 places to update one rule and a 3,511-item
> diff per release, which is precisely what produced the version drift the doctor now catches.
> **After pulling a release, run `npm run sync-method:all` once** to repopulate this machine.
> Corollary: never author anything inside a mirror — the sync overwrites it and git has no copy.
> Doctor check **E8** fails if a mirror path is ever tracked again.

| Content | Truth Source | Direction | Frequency |
|---------|-------------|-----------|-----------|
| METHOD files | Bana-Share | Bana-Share → apps | On demand |
| project/ | Each app | Apps → Bana-Share | Daily |
| sprints/ | Each app | Apps → Bana-Share | Daily |
| bugs/ | Each app | Apps → Bana-Share | Real-time |

### Rules

1. **METHOD is read-only in apps** (except app-settings.json)
2. **Apps push project files to Bana-Share**
3. **Bana-Share never modifies app project files**
4. **`npm run doctor` green and `npm run doctor:fleet` shows no **blocking** finding — or each
   blocking repo is skipped / declares `claudeAddon.ownedSections` — before any sync** (318.a). A
   red doctor means the hub is internally inconsistent — syncing would copy that inconsistency into
   every app. A **blocking** `doctor:fleet` finding is app-written content the sync cannot bring up to
   date: a CLOBBER file, or a hub-owned / merged section whose current text matches no historical
   hub version (app-authored text). Both syncs are **fail-closed** on it — they keep the file or the
   section as it is and report it (`kept (app-authored section: <heading>, N lines)`; `--force` is
   the only thing that overwrites it) — so nothing is lost, but the repo stays behind the hub text
   until it is reconciled; that is what makes this rule mechanical rather than a promise. Sync-fixes — a stale version, live
   dormant agents, missing sections, a section at a known earlier hub version — are **not**
   blocking: they are what the sync repairs. Resolve a blocking repo by reconciling it by hand, by
   declaring the section in `claudeAddon.ownedSections`, or by putting the repo on `SKIP_REPOS`
   (`scripts/lib/fleet-skip.mjs`, the one list both syncs and `doctor:fleet` read). Then run
   `npm run sync-method:all:dry`, read its clobber report, and only then sync — from a landed,
   clean hub: a real sync refuses unless the hub `HEAD` is `origin/<default>` after a fetch and the
   synced paths are committed (`--allow-unlanded` is for testing only). Owner: Lucia.
5. **The sync owns only hub-owned content** (318.a): `docs/METHOD/**`, the addon payload, cohort
   agents with no app-owned section, `SOUL.md` → Non-negotiables + Boundaries, and the five merged
   `CLAUDE.md` sections. Everything else in an app is the app's — the sync never overwrites it.

---

## Sync Tools

METHOD is authored in **Bana-Share** (the source of truth) and pushed out to all apps.

### Push METHOD → all apps (from Bana-Share root)
```bash
npm run doctor && npm run doctor:fleet -- --strict   # rule 4 — doctor green, no BLOCKING fleet finding (--strict fails on blocking only)
npm run sync-method:all:dry      # preview + clobber report, writes nothing
npm run sync-method:all          # → node scripts/sync-method-to-all-apps.mjs
```

### Push METHOD → GitHub (from Bana-Share root)
```bash
npm run sync-method              # → node Apps/script/sync-method-to-github.mjs
npm run sync-method:dry-run      # preview
```

> Older docs referenced `docs/METHOD/script/sync-method.mjs` — that path does not exist in
> Bana-Share. Use the `npm run sync-method*` scripts above.

---

## Migration to v303.a

1. Backup: `cp -r docs/METHOD docs/METHOD-backup`
2. Pull: `npm run sync-method:all` (from Bana-Share root)
3. Update `app-settings.json`: `"methodVersion": "303.a"`
4. Remove any mode references in project files
5. Test with small sprint task
6. Commit

---

## Version History

**319.a** (2026-10-10) — **Major: token economy — measured rules, a default sub-agent model, Penny (11 + 3), a fleet-wide ledger**

- **Problem.** The account hit its 5-hour window and its monthly extra-usage cap (40 EUR, reached on 2026-10-09). A read-only study of 14 days (2,934 transcripts under `~/.claude/projects`, 2026-10-09, API-equivalent at list prices — not a bill; `docs/interventions/2026-10-10-Lucia-token-economy.md`) found **$14,714**, of which sub-agents and Workflows **86.2 %** (opus 50.2 %, sonnet 35.8 %, haiku 0.1 %) and the main thread 13.8 %; Workflows alone **37.5 %** (71 runs, 1,170 agents); **122** of the **123** sub-agents pinned neither per call nor by frontmatter ran on opus ($1,456, 9.8 %; 2,032 named a model per call, 61 were pinned by frontmatter — 29 of them on opus by design: vera, junia, kasper, lucia) (the first count, 184 / 151 / $1,604, also counted frontmatter-pinned agents and is superseded) although 318.a already required an explicit `model` on every Workflow worker; cache reads **62.9 %** and cache writes **22.7 %** of cost against output **14.4 %**; a `general-purpose` sub-agent cost $11.5 on opus vs $4.1 on sonnet; 15 sessions made 70.9 % of cost and two repos (BanaLog, bananaevents) 57.1 % — the two that carry the heaviest `MEMORY.md` (17.7 kB, 16.4 kB); five repos had no ledger at all (77.8 % of sessions covered). One evening in BanaLog (~$610) concentrated the pattern: 57 of 70 sub-agents on opus under Ultracode, one review loop on one verdict that ran 5 rounds without converging (34 % of the session), Nova agents carrying screenshots at ≈ 6× the cache writes of Brian agents.
- **Operator decisions (Cadrage, 2026-10-10), binding:** review loop capped at 2 rounds · tiers beat Ultracode + a cost estimate before any Workflow · minimal sub-agent context · `MEMORY.md` budget · default sub-agent model = sonnet at user level · an inheritance alert in telemetry and the doctor · the ledger on the whole fleet · a telemetry & token-economy coach agent · scope: hub release + fleet sync. Parked: a generalist coach agent and a centralised project-management method (proposal only, `ACTIONS.md`); trimming each app's own `MEMORY.md` (the doctor flags it); raising the extra-usage cap.
- **NEW — "Token economy" (`routing-method.md` → "Model Routing"), each rule with its measured number.** (1) A **review→fix loop stops after 2 rounds**, then the operator decides; a re-review reads the diff since the last round only; one reviewer per point (`vera` *or* `kasper`); full gates (complete suite, build, e2e) once at the end of the slice. (2) **Tiers beat modes** — Ultracode or "cost is not a constraint" never overrides T1/T2/T3. (3) **Every Workflow announces its cost at Cadrage** (agents × expected calls, as a share of the weekly quota) and stays **< 10 agents** unless the operator agrees. (4) **Minimal sub-agent context** — file paths, never pasted inventories; screenshots only for `nova` / `sage`, only the needed ones; tool calls capped in the brief ≈ 55 calls per sub-agent on average — 124,966 calls / 2,262 sub-agents — each re-reading ≈ 198k tokens of cache on opus and ≈ 261k on sonnet. (5) **`MEMORY.md` ≤ 5 kB**, one-line pointers. (6) **Cost per finished task** is the unit — the existing one-retry-then-escalate rule, read as economics. Also: **a `general-purpose` sub-agent never runs on opus** unless the task is judgement ("Delegation-time overrides", rule 6), and the Workflow row of the forms table carries the cost announcement and the 10-agent ceiling.
- **CHANGED — the short form reaches every app.** `CLAUDE.md` → "## Model Routing" (hub, `payload/CLAUDE.md`, `payload/snippets/model-routing.md`, byte-identical) gains the token-economy bullets and the default-model sentence; `AGENTS.md` (hub + payload) mirrors them in tool-agnostic words.
- **NEW — a user-level default sub-agent model.** `install.mjs --user` now merges `~/.claude/settings.json` instead of replacing it (existing keys win, missing keys are filled, `env` merged key by key, a file that is not valid JSON is left untouched) and guarantees `env.CLAUDE_CODE_SUBAGENT_MODEL = "sonnet"`. Precedence, documented in `routing-method.md` → "Delegation-time overrides", rule 5: per-call `model` → frontmatter `model:` → `CLAUDE_CODE_SUBAGENT_MODEL` → the parent; `inherit` is explicit and does not fall through to the env default. So the T1 floors (Vera, Kasper) hold. `CLAUDE_CODE_SUBAGENT_MODEL_FORCE` is never used — it outranks every explicit `model` and reaches Workflow workers. `--only <file[,file]>` restricts the user install; `--env-only` writes only `env.CLAUDE_CODE_SUBAGENT_MODEL` when absent (the W7 fix). An existing `settings.json` that is not valid JSON is left untouched and the run exits 1 with a counted warning. Addon README → "User level".
- **NEW — Penny, telemetry & token-economy coach (`.claude/agents/penny.md` + Desktop stub `.claude/skills/penny/SKILL.md`), sonnet.** Measures by project, task type, period, sprint, agent and model; owns `npm run telemetry:report`, the periodic `docs/project/telemetry/REPORT-YYYY-MM-DD.md` (committed — the raw ledger stays gitignored) and the J+7 measurements; coaches the cohort and the operator; proposes METHOD changes on this axis to Lucia, who releases them. Read-only on product code, scripts and the METHOD; never invents a number (`inconnu`), labels API-equivalent as such. Orchestration: fan-out, plus — at the Recette of a slice that ran a Workflow or > 10 sub-agents — a one-paragraph cost note folded into the Debrief, a note and never a gate. **Cohort: 11 active mandates + 3 dormant**, updated in `CLAUDE.md` (+ payload + snippet), `AGENTS.md` (+ payload), `agents-method.md` (roster, chain, section 11, surfaces, decision tree, next steps), `routing-method.md` (cohort table, task type, T2 defaults), `.claude/agents/README.md`, `.claude/skills/README.md`, `METHOD.md`, `README.md`, and the addon README.
- **`SOUL.md` — the cohort count leaves "Core Identity".** The hub's own "Core Identity" now says "Claude Code's native agent cohort (see `CLAUDE.md` → "Agent Cohort")" instead of a count, so a cohort change never touches `SOUL.md` again (Vera, 319.a review). The payload `SOUL.md` carries no count. That section is app-owned (the sync never carries it), but `SOUL.md` is on the landing exception list, so this release lands with `[land-anyway]` in the commit subject after the operator's decision, as 318.a did.
- **TOOLING (Brian, shipped with this release — scripts are not doctrine; see their own diffs):**
  - **`scripts/telemetry-aggregate.mjs` + new `scripts/lib/token-economy.mjs`** (`npm run telemetry:report`): besides the ledger roll-up, reads the Claude Code transcripts and prints API-equivalent cost split main thread vs sub-agents per model family, Workflow share, agent type × model, per-repo totals (worktrees folded), every sub-agent classed explicit / frontmatter-pinned / truly unpinned with the opus count of each (`proof.unpinnedOpus` in `--json`), and a **"Ledger gap"** line. Flags: `--days N` (default 7), `--since <date>`, `--projects <dir>`, `--no-transcripts`, `--json`. The 319.a J+7 command: `npm run telemetry:report -- --since 2026-10-10 --days 7`.
  - **`scripts/method-doctor.mjs`**: **W6** — this repo's Claude memory index (`MEMORY.md`) is over 5 kB; **W7** — the user settings carry no default sub-agent model. Warnings, not errors. **`scripts/method-doctor-fleet.mjs`**: a `MEMORY.md` column (`!` over 5 kB, skipped repos included). Shared helpers: new `scripts/lib/claude-config.mjs`.
  - **Ledger-only repos** — new `scripts/lib/fleet-ledger.mjs`, called by `sync-method-to-all-apps.mjs`: `LEDGER_ONLY_REPOS = [Talkation, IApocalypse]` get only the telemetry hook, its `Stop` wiring and a local `.git/info/exclude` entry — no METHOD mirror, no `CLAUDE.md`; a `settings.json` that git tracks or that is not a JSON object is left alone. `IAcademy` is in `SKIP_REPOS` instead (the GitHub sync matches by remote name, and `Respirit`'s origin is `bananick/IAcademy`). Respirit and VisioEscape, which the study also found without a ledger, are ordinary sync targets and get the hook through the normal installer (`Respirit` is the local checkout of the `IAcademy` repo, so the study's five may be four).
  - **Tests**: new `tests/token-economy-tooling.test.mjs`.
- **NEW — the core rules at user level (`payload/user/CLAUDE.md` → "Délégation").** The repos that make most of the cost are skipped by this sync, so the rules that matter most also go where every repo reads them: the review loop capped at 2 rounds, tiers beat modes, the Workflow cost estimate and < 10 agents, minimal sub-agent context, and review / verify / judgement workers naming `opus` explicitly. The live `~/.claude/CLAUDE.md` receives them only when the operator applies it (`install.mjs --user --only CLAUDE.md`, with a backup, or by hand).
- **CHANGED — "a worker without a `model` inherits the coordinator's" is history now.** Since 319.a it runs on the sonnet default; `CLAUDE.md` → "Model Routing" and `routing-method.md` say that the default makes forgetting cheap, not safe, so review / verify / judgement workers name `opus` explicitly.
- **RECORDED — `453dab35` (2026-10-07), `install.mjs --user`.** It shipped the user-level Claude config (`payload/user/`: `CLAUDE.md`, a sanitised `settings.json`, `scripts/flight-deck.ps1`; backup / skip-identical / `--dry-run`) with `[land-anyway]` and no changelog entry; this entry is its record. The `payload/user/CLAUDE.md` copy had fallen behind the live `~/.claude/CLAUDE.md` (it lacked "Garde-fous machine (Windows)"), so a `--user` run would have removed that section: the payload is brought level with the live file.
- **Decisions taken for this sync (2026-10-10, relayed by the coordinator; each reversible):**
  - **The five repos `doctor:fleet` calls blocking — `bananaevents`, `gites-groupes`, `LeMansFC`, `Respirit`, `Scapience` — join `SKIP_REPOS`** (`scripts/lib/fleet-skip.mjs`) for the 319.a sync, with `IAcademy` (the GitHub name of `Respirit`, so the GitHub sync skips it too), so Sync Protocol rule 4 holds; each is reconciled one by one afterwards (Lucia) and leaves the list once reconciled or once it declares `claudeAddon.ownedSections`. Side effect, accepted: Respirit does not receive the telemetry hook in this sync. Reverse: remove the names from `SKIP_REPOS`.
  - **Worktree sessions in ledger-only repos are an accepted gap** — the hook and its wiring are untracked and live in the main checkout only, so a session in a linked worktree of Talkation / IApocalypse / IAcademy leaves no ledger row. The transcript part of `telemetry:report` still sees them. Reverse: make those repos METHOD targets (the tracked installer then wires every checkout).
- **Improvement register.** `IMP-009` (this release; proof = the J+7 measurement) opens IN PROGRESS; `IMP-010` (a generalist coach agent) and `IMP-011` (a centralised, Scrum-like project-management method across the fleet, with Junia) are recorded as PROPOSED, each with a first step.
- **Proof.** LANDED = `npm run doctor` green + `npm run sync-method:all:dry` clean + `/land`. PROVEN = on **2026-10-17**, `npm run telemetry:report -- --since 2026-10-10 --days 7` shows the sub-agent opus share of API-equivalent cost **< 35 %** (baseline 48.9 %) **and** truly-unpinned → opus **= 0** — no sub-agent pinned neither per call nor by frontmatter ran on opus (baseline 122 of 123 in 14 days; `proof.unpinnedOpus` in `--json`). Baselines restated by `npm run telemetry:report -- --days 14 --json` on 2026-10-10 with 1-hour cache writes priced at 2×: total $14,805, cache writes 24.6 %, sub-agent opus 48.9 % of total cost (58.3 % of sub-agent cost) — measured by Penny. **What it measures:** BanaLog, bananaevents and Respirit made 84.8 % of the last 3 days' cost and are all in `SKIP_REPOS`, so the synced doctrine does not reach them; J+7 measures mostly the user-level default sub-agent model (live since 2026-10-10 06:14) and the user-level rules. The window opens ≈ 6 h before the default went live.
- **Why Major.** A new agent in the cohort, a significant process change (review-loop cap, Workflow cost gate), and installer behaviour that changes what lands on the operator's machine.
- **Where it was authored.** In the hub, branch `claude/token-economy-optimization-fd2182`: the doctrine (Lucia) and the tooling (Brian), in parallel. **Not synced yet** — the fleet sync follows the landing, behind `doctor` + `doctor:fleet`.

**318.a** (2026-10-06) — **Major: the METHOD fitted to 120 days of practice — a 10 + 3 cohort, the SOUL split, five synced `CLAUDE.md` sections, a sync that cannot clobber, a mechanical Cadrage, a telemetry ledger no hook commits**

- **Problem.** v317.c passed `npm run doctor`, but the doctor only compared the hub with itself; nothing checked what the sync does to an app, and nothing compared the doctrine with the practice. A read-only audit of 120 days (318 sessions, 1,469 delegations, 5,597 commits in 33 repos — `docs/interventions/2026-10-06-Lucia-v318a-practice-audit.md`) found: the sync would overwrite BanaLazer's own `SOUL.md` (it already had, once) and bananaevents' app-enriched agents; 28 of 30 METHOD repos still loaded the five dormant agents as pre-316.a files (65 "dormant" calls); `sage`, `junia` and `gordon` ran about 10× less than `brian` while general-purpose agents carried 28.8% of delegations; opus produced 61.4% of output tokens (haiku 0.4%); the delegation order was retyped 47 times, 28 of them in a repo whose `CLAUDE.md` never received it; Journey/Proof sat on 37% / 28% of new files; telemetry and sync made ~13% of all commits; 0 of 301 conversation titles followed the naming rule; nine rituals and skills had zero calls; and nine files still said "`main` is the deploy" after PR #43.
- **Operator decisions (quiz, 2026-10-06), binding:** (1) mint 318.a and sync the whole fleet; (2) split SOUL — hub-owned Non-negotiables + Boundaries, app-owned rest; (3) the sync moves dormant agents to `_dormant/` and never overwrites app-enriched agents; (4) cohort 10 — Iris and Lucia back, Sage / Junia / Gordon re-scoped; (5) Nova and Gordon on sonnet, Vera once per slice, explicit model per Workflow worker; (6) five `CLAUDE.md` sections merged into every app; (7) cut `sprint`, `ship-check` and the title convention, keep `/port` + `/relay` optional; (8) Journey/Proof enforced at `/land`, telemetry off git with an aggregator.
- **CHANGED — cohort: 10 active mandates + 3 dormant.** `iris` and `lucia` move back from `.claude/_dormant/` to `.claude/agents/` and `.claude/skills/`. **Iris — Study & Deliverables** (sonnet; opus by override for ranked recommendations): studies, data mining, client-grade reports — every figure sourced, `inconnu` when unknown, `[estimation]` / `[proxy]` marked — read-only on product code, and owner of the new **anonymisation/GDPR rule**: client personal data is pseudonymised or aggregated before anything leaves the repo or is published, no re-identifiable cell under 5 people, raw extracts out of git, companies may be named and people never are. **Lucia — METHOD release manager** (opus): versioning, the sync (doctor + `doctor:fleet`, dry-run, clobber report, targets — never `--force` herself), upstreaming app proposals, `docs/improvement/ACTIONS.md`; she proposes, the operator ratifies. **Sage — Prove** (sonnet): runs the Cadrage's `Proof:` on the environment it names with real data — the only way LANDED/DEPLOYED becomes PROVEN — then pins it as a regression test. **Junia — Plan** (opus): request → plan/to-do (nominal) or sprint (exception) + its Cadrage draft; she loses the `Agent` tool — **the coordinating conversation orchestrates** and lands. **Gordon — Commercial & growth** (sonnet): offers, funnels, EN/FR copy (product and marketing), campaigns, positioning; paid ads are his unless the app's business pack names an ads owner. **Nova** keeps her mandate on sonnet. April, Aiko and Teddy stay dormant; domain owners stay app-level. Handoffs that pointed at roles nobody runs (`vera`→junia, `watson`/`kasper`→vera per task, `brian`→sage tests) now point at the coordinating conversation; copy ownership is Gordon's everywhere (L7); no active agent file mentions dormancy.
- **CHANGED — the orchestration chain.** Per task: `brian` → `watson` (only if the gate goes red) → `kasper` (only when rules / auth / API routes are touched). Once per slice, at the Recette: `vera` (one review, always opus) → `/land` → `sage` (the Proof, where it says) → the operator accepts. The one inline copy moves from `junia.md` to `CLAUDE.md` → "Agent Cohort", the file the coordinator always has loaded.
- **CHANGED — model routing.** Defaults: opus `junia`, `vera`, `kasper`, `lucia`; sonnet `brian`, `sage`, `watson`, `nova`, `gordon`, `iris`. Vera runs once per slice at the Recette instead of after every task. New rule in `routing-method.md`: **every Workflow worker gets an explicit `model`, default sonnet** (haiku for mechanical items, opus only for a judgement pass).
- **CHANGED — SOUL split (`SOUL.md` + payload).** `## Non-negotiables` and `## Boundaries` are hub-owned, byte-identical in the hub and the payload, and rewritten in every app by the sync; identity, mission, personas and voice are app-owned and never touched. The hub-owned text is generalised (the app's live source of truth; "the app's single data-access module (`src/lib/firebase/` by default)"; the QA gate is `/land`, not `ship-check`). The payload `SOUL.md` becomes a neutral seed (no BanaShare persona). The retired `GEMINI.md` reference and the claim that Swanifly runs the loop are gone. **`SOUL.md` is on the landing exception list: this release lands with `[land-anyway]` in the commit subject, after the operator's decision — not through a PR.**
- **NEW — five merged `CLAUDE.md` sections.** `## Agent Cohort`, `## Model Routing`, `## Landing & conversation size`, `## Communication Contract`, `## Design port directive` — byte-identical in the hub `CLAUDE.md`, `payload/CLAUDE.md` and `payload/snippets/*.md`, app-agnostic, carrying the delegation standing order, the Debrief contract, landing, and LANDED ≠ DEPLOYED. The payload's separate "Délégation par défaut" section is folded into Model Routing; its "Operator reporting" and "Landing (the default)" sections become the Communication Contract and Landing sections.
- **CHANGED — three dead weights cut.** The `sprint` and `ship-check` skills move to `.claude/_dormant/skills/` (their identical payload copies are removed, so apps stop receiving them); skills that pointed at `/ship-check` now point at `/land`. The conversation-title convention is dropped from `sprints-method.md` (the section is renamed "Sessions & branches") and `method-core-lite.md`. `/port` and `/relay` are marked optional.
- **FIX — contradictions.** Every "`main` is the deploy" now says the trunk is LANDED and DEPLOYED/PROVEN need their own evidence (`CLAUDE.md`, `.claude/agents/README.md`, `land.md` + payload, `method-core.md`, `method-core-lite.md`, `routing-method.md`, `sprints-method.md`, `tests-method.md`, `METHOD.md`) — D4, IMP-002. No file calls a dormant agent "delegable on explicit request" (D8). `/port`, `nova.md`, `design-method.md` and the porting playbook say one screen = one land (D9). The ritual count is 8 (`/brief` was uncounted), SOUL's QA gate is `/land` (D10). `agent-personas.ts` is documented as hand-maintained and parked, not generated (L1). Sprint-only wording in `junia.md` / `vera.md` is gone (L3).
- **RECORDED — PR #43** (`888de820`, merged as `04bb8f0a` on 2026-10-06): it rewrote SOUL non-negotiable #1 (no fabricated data in a shipped path; the isolated test-fixture / emulator exception) and added the Boundaries sentence "Merging to `main` is LANDED … a landing hook deploys nothing". It shipped with no changelog entry; this entry is its record (D5).
- **TOOLING (shipped with this release — `*.mjs`, `package.json`, `.gitignore`):**
  - **installer** (`install.mjs`): merges the two hub-owned SOUL sections instead of overwriting the file; app-owned identity kept (BanaLazer intervention 041-g upstreamed); CRLF-insensitive compare; three more merged `CLAUDE.md` sections (five in all) with `claudeAddon.ownedSections` to let an app keep one. **Also:** it **removes** `## Délégation par défaut` from an app `CLAUDE.md` (its content now lives in `## Model Routing`) — except where the app owns that section, or owns `## Model Routing` (the replacement would never arrive) — and **claims legacy headings in place** (`## Landing (the default)`, `## Operator reporting`, `## Agent cohort` …) instead of appending a duplicate beside the stale copy; in an existing **`AGENTS.md`** it refreshes the merged sections the file already carries (never adds one; the file is still create-if-missing); it appends `docs/deliverables/**/raw/` to an app `.gitignore` when missing, the same way it handles the ledger line, so Iris's raw extracts stay out of git (named in `iris.md`, rule 3); a markdown code fence closes only on the same character, at least as long as the opening one (CommonMark), so a fenced `## ` is never mistaken for a heading.
  - **sync** (`sync-method-to-all-apps.mjs`): relocates non-reactivated dormant agents to `.claude/_dormant/` in each app, honouring `claudeAddon.activeAgents`; keeps app-enriched agents (`## Frontières` / `## Pièges` / `## Règle de GO`, or `claudeAddon.ownedAgents`); skips worktree copies; `--dry-run` prints a clobber report, and a real run skips each CLOBBER file individually and carries on with the rest of the target (it never refuses a whole target) unless `--force`; it also keeps, as they are, the sections the app wrote itself (see "Fail closed on app-written sections" below).
  - **GitHub sync** (`Apps/script/sync-method-to-github.mjs`, on the shared engine): fresh shallow clones; mirrors `docs/METHOD` including deletions; runs the addon install in the clone; a truly read-only dry-run; comma-separated `--repo`. **Scope change:** until 318.a it pushed `docs/METHOD` only; it now also carries `.claude/{agents,_dormant,skills,commands,hooks}`, `.claude/settings.json`, the root identity files (`CLAUDE.md`, `SOUL.md`, `AGENTS.md`) and `.gitignore` — never anything else a clone holds, and never a path the target gitignores. **Hooks policy:** `.claude/settings.json` and `.claude/hooks/**` are staged only where the target repo already tracks the path (refresh existing wiring); new wiring and new hook files are never introduced into a repo's committed config — such a repo reports `hooks: not installed (no committed wiring)`. A *tracked* `settings.json` is itself **withheld** when the wiring the merge adds points to a hook script the repo does not track (a dangling reference) — `hooks: settings withheld (dangling: <files>)`; wiring that points only to tracked scripts is staged. The local filesystem sync (`sync-method-to-all-apps.mjs`) keeps writing hooks and `settings.json`. A repo's dry run prints the hook files and the `settings.json` wiring (`hooksMerged`) it would touch, so the dry-run shows exactly which repos would get hooks.
  - **`land.mjs`**: the trunk is auto-detected from `origin/HEAD` (IAcademy — local directory `Respirit` —, LeMansFC and bizia use `master`); the telemetry ledger (`docs/project/telemetry/sessions.jsonl`) no longer counts as dirty work, so a repo that still tracks it does not block its own landing after every turn.
  - **`verify-gate.mjs`**: refuses a newly added intervention or task file without `Journey:` + `Proof:` (the hub doctor's E9, now enforced in every app).
  - **telemetry**: no hook commits the ledger any more (it is gitignored; the `--commit` step is gone — the flag is still accepted and ignored); the hub's own `docs/project/telemetry/sessions.jsonl` **stays tracked in 318.a**, and the fleet repos are not untracked by the sync either — ignoring a tracked file changes nothing, so untracking (`git rm --cached`) is a follow-up, once every checkout runs the 318.a hooks. A row written from a linked worktree, or from a nested app with no `.git` of its own, goes to the main checkout's / enclosing repo's ledger (`git rev-parse --git-common-dir`) — a gitignored file inside a worktree would vanish with it. `scripts/telemetry-aggregate.mjs` (`npm run telemetry:report`) keeps the newest row per `sessionId` across the ledgers.
  - **doctor**: **E13** cohort consistency (agent files = the cohort tables; no active agent file mentions dormancy; no file calls a dormant agent delegable), **E14** forbidden contradictions ("`main` is the deploy", "one screen = one PR", a ritual count that disagrees with `.claude/commands/`), **E15** SOUL ownership (hub-owned sections byte-equal in the payload; no product persona in the payload seed) replacing **E11**, and `npm run doctor:fleet` (per sibling repo: declared version, live dormant files, missing merged sections, files the next sync would clobber).
- **FIX PASS — after Vera's review (PASS WITH FIXES), before any fleet sync.** Everything below is hub tooling and doctrine; no app was touched.
  - **Credentials.** The GitHub sync passes its auth in the git child's environment (`GIT_CONFIG_COUNT` / `KEY_n` / `VALUE_n`), never in argv, and scrubs the token, its base64 Basic form and any `Authorization:` value from every error and report — the base64 used to leak into `error.message` (`execFileSync` copies argv into it).
  - **One skip list.** `scripts/lib/fleet-skip.mjs` (`Bana-Share`, `BanaLog`, `BanaLazer`, `DeezLoad`, matched case-insensitively on the repo directory / GitHub name) is read by both syncs and `doctor:fleet`; reports say `skipped (SKIP_REPOS)`. The local sync had no list at all before. The retired `scripts/sync-method-to-github.mjs` is now a stub that prints "Retired in v318.a" and exits 1; `npm run sync-method` runs `Apps/script/sync-method-to-github.mjs`.
  - **Source guard.** A real sync (either one) refuses unless the hub `HEAD` equals `origin/<default>` after a `git fetch` and `docs/METHOD .claude CLAUDE.md SOUL.md AGENTS.md` have no uncommitted change (the telemetry ledger excepted); it prints why. A dry run only warns. `--allow-unlanded` overrides, for testing only.
  - **Fail closed on app-written sections — in BOTH syncs.** Files already were (CLOBBER); sections were not: a hub-owned SOUL section (`## Non-negotiables`, `## Boundaries`), a merged `CLAUDE.md` / `AGENTS.md` section or the folded `## Délégation par défaut` whose current text matches **no historical hub version** was overwritten (or deleted) by a real run. It is now **kept**, never overwritten, unless `--force`; reported `kept (app-authored section: <heading>, N lines)` (dry run reports the same); listed in the summary tables under a `sections kept` column. A section at a *known earlier hub version* is still brought up to date, a missing one is still appended, `claudeAddon.ownedSections` still removes a section from the sync altogether, and with no readable hub history every differing section is kept (like the files). A sync can therefore no longer silently overwrite app-written text, which is what enforces rule 4 mechanically (the four repos `doctor:fleet` calls blocking today keep their text until reconciled: LeMansFC and Scapience `## Agent Cohort`, gites-groupes SOUL `## Non-negotiables`, `bananaevents` four sections).
  - **`doctor:fleet`: blocking vs sync-fixes.** Blocking = CLOBBER files, and the app-authored sections above (`kept`), printed with their `sectionLines`. Sync-fixes = stale version, live dormant agents, missing sections, a known-hub-version drift. `--strict` exits non-zero on blocking only. The ledger-tracked column is information, not a finding. The doctor reads the sync's own verdict, it does not re-derive it.
  - **Known hub versions** are read from `origin/<default>` + tags, not `git log --all`: an unlanded branch or a stash no longer makes app text "known". `-m` is added to that read — a file as RESOLVED by a conflict merge was invisible, which made two or three shared files (`sprints-method.md`, `agents-engineering-method.md`, `.claude/agents/README.md`) read as false CLOBBER in all 31 local repos.
  - **Cadrage gate is forward-only and rename-proof.** `verify-gate.mjs` skips a task whose `**Created:**` precedes 2026-09-06 (and an intervention dated before it), skips an added task whose `NNN-x` sequence ID already exists at the merge base, and diffs with `--find-renames` — so `001-a ⬜ …` → `001-a ✅ …` with a report appended is no longer a false red (doctor E9's rule, mirrored). Without `--base` it now diffs against `origin/<default>`, not a hardcoded `origin/main`. The addon payload copy stays byte-equal.
  - **doctor.** **E15** also compares the hub's own `CLAUDE.md` five shared sections with `payload/snippets/*.md` (LF-normalised). **E13** also reads every `**Owner:**` line of `docs/METHOD/*.md`: a dormant agent may not own a live METHOD file. Owners reassigned to the active agent that fits — `ai-infra-method.md` Aiko → Brian (AI infrastructure is building), `process-method.md` Aiko → Lucia (process is method-level and project-level), `design-method.md` Teddy → Nova for the mobile port (Brian keeps the web port).
  - **Telemetry ledger stays tracked in 318.a.** The deletion of `docs/project/telemetry/sessions.jsonl` is reverted: ignoring a tracked file changes nothing, and untracking it here would collide with checkouts still running the old hooks. The `.gitignore` line, the hooks that no longer commit it and `land.mjs`'s dirty-exclusion stay. Untracking (`git rm --cached`, hub and fleet) is a follow-up, once every checkout runs the 318.a hooks. **Wording corrected everywhere it is fleet-synced or user-facing** (`CLAUDE.md` Model Routing section and its payload copies, `AGENTS.md`, `routing-method.md`, `README.md`, `METHOD.md`, the addon README, `.claude/agents/README.md`, the `.gitignore` comment the installer writes, the hook comments): "Hooks no longer commit the ledger (318.a); the file becomes untracked in a follow-up once every checkout runs the 318.a hooks" — replacing "off git since 318.a".
  - **Smaller.** A push is labelled non-fast-forward only when git says `non-fast-forward` / `fetch first` (a hook decline now surfaces as the failure it is); `## Délégation par défaut` is kept when `## Model Routing` is app-owned.
- **RECORDED — Q8 exception: `bananaevents`.** The sync skips its CLOBBER files — 11 in the local checkout (8 on GitHub's `main`): `.claude/hooks/land.mjs`, `verify-gate.mjs` and `ship-push.sh`; the installer `docs/METHOD/tools/swanifly-claude-addon/install.mjs` and its three payload hook copies; `.claude/agents/README.md`, `kasper.md`, `sage.md`, `vera.md` — so, until it is reconciled, `bananaevents` does **not** receive the mechanical Cadrage gate (decision 8) nor `land.mjs`'s ledger exclusion. `doctor:fleet` also reports four app-authored sections there (SOUL Non-negotiables and Boundaries, Agent Cohort, Design port directive) as blocking — the sync keeps them as they are. The reconciliation — port its local hook changes into the hub, declare `claudeAddon.ownedSections`, or leave the repo on `SKIP_REPOS` — is **owned by Lucia**.
- **CHANGED — Sync Protocol rule 4:** `npm run doctor` green and `npm run doctor:fleet` shows no **blocking** finding — or each blocking repo is skipped / declares `claudeAddon.ownedSections` — before any sync.
- **Why Major.** A cohort change (two agents reactivated, four re-scoped), a DoD/Cadrage rule that is now machine-enforced, a SOUL rewrite, and new installer and sync behaviour.
- **Where it was authored.** In the hub, in two lots: the doctrine (Lucia) and the tooling. **Not synced yet** — the fleet sync follows the landing, behind `doctor` + `doctor:fleet`; proof is `gh api` reading v318.a on every fleet default branch.

**317.c** (2026-09-29) — **Minor: the landing gate files `.codex/agents/*.toml` under tooling; domain owners & the business pack documented as an app-level pattern**

- **Problem.** `bananaevents` mirrors its agent crew as Codex definitions (`.codex/agents/*.toml`). The gate's lane classifier had no rule for `.codex/`, so any diff touching a crew file fell to "unclassifiable (fail closed)" and `/land` was blocked. A local-only patch in the app would not have lasted: `install.mjs` writes `.claude/hooks/` in OVERWRITE mode, so the next METHOD sync would have reverted it — the fix had to go upstream, into the hub and the addon payload.
- **FIX — `.codex/` joins the TOOLING lane**: `/(^|\/)\.codex\//` added to the `TOOLING` list of `verify-gate.mjs` (hub `.claude/hooks/` and the addon payload copy, kept identical for E5), plus a new gate test `e3` in `tests/verify-gate.lanes.test.mjs` — a diff touching only `.codex/agents/*.toml` lands in the tooling lane (red without the regex, green with it). Apps receive the fix at their next `npm run sync-method:all`.
- **CHANGED — Riley stays demoted in the hub; an app MAY re-use the name.** `routing-method.md` keeps "no sub-agent, no routing row" and now says an app may re-use a demoted name as a repo-specific domain owner when its business pack declares it; the addon payload `CLAUDE.md` template says the same in one sentence (it already carried no Riley row). The 28 sibling apps that still carry a `| **Riley** | API & Multi-Agent | … |` row got it before the template was cleaned, and keep it because `install.mjs` seeds `CLAUDE.md` create-if-missing (only `## Design port directive` and `## Model Routing` are merged into an existing one) — a sync cannot remove it, each needs a per-app edit. They are listed in `docs/interventions/2026-09-29-Watson-codex-lane-business-pack.md` and are not touched here.
- **NEW — the business pack, as a concept note**: `agents-method.md` → "Domain owners & the business pack (app-level)". An app keeps its canonical business knowledge in `docs/project/business/` (`README.md` with the domain → owner table and the human-GO rule, `offer-and-pricing.md`, `personas.md`, `team.md`, `systems-map.md`); domain-owner agents in `.claude/agents/` (optionally mirrored to `.codex/agents/*.toml`) carry four sections — Charger d'abord · Règle de GO · Pièges · Frontières. Domain owners are app-level and never join the hub cohort. Reference implementation: `bananaevents`, with `scripts/crew-doctor.mjs` as its consistency check.
- **Why Minor.** No new METHOD file, no new cohort agent, no DoD change: one gate rule, one clarification of the Riley line, one documented pattern.
- **Where it was authored.** In the app mirror `bananaevents` — the crew reshape landed there as `6ab923b0` (branch tip `7590f733`, 2026-09-28) — then upstreamed to the hub. **Not synced to any other repo in this change.**

**317.b** (2026-09-17) — **Minor: one lineage for the landing gate — verify-gate.mjs / land.mjs reconciled, worktrees run the main checkout's hooks**

- **Problem.** Three copies of `verify-gate.mjs` had drifted: the addon payload, the main checkout's gitignored `.claude/hooks/` (installed by `install.mjs` in OVERWRITE mode, then patched by hand), and one frozen copy per git worktree. None was a superset of the others, so every `/land` re-tripped a bug another copy had already fixed — three red landings on 2026-09-14 alone, all for reasons unrelated to the diff.
- **FIX — the payload is now the superset**: `core.quotepath` unquoting (accented filenames fell to "unclassifiable"), `ROOT_APP_EXT` + `rootHasVerifyingScript` (loose root files stay in the tooling lane unless the root can verify — and `test:gate` alone does not make a root an app, or the hub's own `tests/` would leave the self-test path; caught by the hub suite, 15/15 green with 9 new cases), gate self-test on its own diff, `ok: null` on skipped checks, `apphosting.yaml` / `scheduler.yaml` in the tooling lane, **`test:gate` before `test`**, **`maxBuffer` 64 MB** (under `CI=true` vitest's `["json","github-actions"]` reporter writes > 1 MB to stdout → `ENOBUFS` → "failed" with an empty tail while 2 695/2 695 passed), **30 min per script** (`TIMEOUT` 900 → 1800; `build` explicit, it replays `prebuild`), and **`json` in `ROOT_APP_EXT`** (`src/messages/*.json` fell to "unclassifiable (fail closed)" on every i18n diff; root `*.json` is still caught first by the tooling rule).
- **FIX — `land.mjs` runs the main checkout's hooks from any worktree**: it resolves the main checkout via `git rev-parse --git-common-dir` and spawns *its* `verify-gate.mjs`; a worktree copy of `land.mjs` re-execs the main copy with the same arguments (`METHOD_LAND_REEXEC` guard). Its outer cap on the gate goes 30 min → 2 h so it can no longer kill an honest gate before the per-script caps speak. The push itself runs with `SKIP_QUALITY_GATES=1` and a 10 min cap: an app's `pre-push` hook re-running its full gates (prod build included) outlived the 2 min git cap and every landing died as "push rejected:" with an empty reason — the verify gate is the gate; the hook's proto guard still runs. `method-core.md` → "Landing" documents both, plus the one-time recopy for worktrees created before this release.
- **Where it was authored.** In the app mirror `bananaevents` (the repo that measured every failure) as "316.b" — landed there as `577a2f99` — then ported here as 317.b; the mirror's number is superseded by the next sync.
- **Hub caveat.** The hub tracks its own `.claude/hooks/`, so "the main checkout's hooks" there means whatever branch the main checkout has out — keep the hub's main checkout on `main`.

**317.a** (2026-09-05) — **Two-moment contract (Cadrage · Recette), CUJ as the unit, telemetry off the Stop commit loop, AGENTS.md no longer imported into Claude context**

- **Problem.** The operator was being pulled into the middle of the work ("shall I continue?") while the two moments that actually need him — what proves this is worth building, and what proves it actually got built — had no fixed shape. Separately, "done" collapsed four different states (coded, landed, deployed, proven) into one claim, and the CUJ Precision Gate (owned by a now-dormant April) had quietly become dead weight nobody ran.
- **NEW — the two-moment contract.** `method-core.md` → "The two-moment contract — Cadrage · Recette": one `AskUserQuestion` (≤ 4, recommended answer first) at **🎯 Cadrage** fixes Journey / Proof / out-of-scope before the first edit; the **middle stays autonomous** except for the conflict gate; **✅ Recette** — a recette table (asked → shown/not) plus the four states `CODED`/`LANDED`/`DEPLOYED`/`PROVEN`, never merged, plus an accept/reopen/defer question when `PROVEN` is claimed — runs before the Debrief. `Avancement` now counts journeys proven, not tasks closed.
- **CHANGED — the CUJ is the unit, no gatekeeper agent.** `templates/CUJ-TEMPLATE.md` drops the Precision Gate / Exit Gates / Automation Hooks machinery for a slim ~35-line shape (Persona · Raison · Chemin A→Z · Preuve · Hors-champ · Fermé par); `docs/project/journeys/template.md` mirrors it. `templates/TASK-TEMPLATE.md` requires `Journey:`/`Proof:` in its header. `.claude/agents/junia.md`, `.claude/commands/intervention.md`, `.claude/commands/plan-sprint.md` and `.claude/commands/land.md` route through Cadrage/Recette instead of the retired Precision Gate.
- **NEW — `scripts/method-doctor.mjs` E9.** Any task file under `docs/sprints/`/`docs/project/sprints/` or intervention file under `docs/interventions/`/`docs/project/interventions/` created on or after **2026-09-06** must carry both `**Journey:**` and `**Proof:**`; older files are never retro-failed. **W4** warns when `docs/project/journeys/` holds only the template.
- **CHANGED — telemetry off the Stop-commit loop.** `.claude/hooks/session-telemetry.mjs` now only appends the row on `Stop`; committing and pushing (`commitAndPushLedger`) runs only behind a new `--commit` flag, wired as a `SessionEnd` hook (before `land.mjs --auto`) so the ledger commits once per conversation instead of once per turn. Mirrored in the addon payload (`docs/METHOD/tools/swanifly-claude-addon/payload/hooks/session-telemetry.mjs` + `settings.snippet.json`).
- **CHANGED — `AGENTS.md` is no longer imported into Claude's context.** `CLAUDE.md` drops the `@AGENTS.md` import; `AGENTS.md` remains the tool-agnostic mirror for Cursor/Codex/Cline/Antigravity, hand-kept in sync, not auto-loaded by Claude Code.
- New contract + template overhaul + a doctor check + a hook behaviour change + an import removal, none of them additive-only → Major bump. Version 316.a → 317.a.

**316.a** (2026-09-01) — **Major: 8 mandates with an identity — `.claude/agents/` becomes the source of truth**

- **Problem.** The cohort was 13 **job titles**, not 13 mandates. Every persona file described a role and none described what its holder *refuses*, *defers*, or *hands off*, so two agents asked the same question returned two different answers and nothing said which one was entitled to answer. In parallel the persona text existed three times — `.claude/agents/{agent}.md`, `.claude/skills/{agent}/SKILL.md` and `Swanifly/web/lib/engine/agent-personas.ts` — with the **engine file documented as canonical**, the inverse of the file the operator actually edits.
- **NEW — every agent carries an `## Identity` section:** **Voice** (how it writes), **I refuse** (what it will not do even when asked), **I defer to** (whose call outranks its own), **I hand off to** (where its output goes next). A shared **`## Non-negotiables`** block, byte-identical across all of them, closes every `.claude/agents/*.md` — the rules that hold whatever the mandate, restated in the one file an agent actually loads when it executes.
- **CHANGED — 13 job titles → 8 active mandates + 5 dormant.** Active: `junia`, `brian`, `sage`, `watson`, `kasper`, `vera`, `nova`, `gordon`. Dormant: `teddy`, `aiko`, `april`, `lucia`, `iris` — moved to **`.claude/_dormant/`**, kept and documented with a one-line reason each, but **outside the directories Claude Code scans**, so they are neither loaded nor delegable. The location is the whole mechanism: discovery is **recursive**, so a `.claude/agents/_optional/` would have left all five live; only a sibling directory outside `agents/` actually deactivates them. **Gordon absorbs the SEA / paid-ads mandate.**
- **CHANGED — one source of truth for persona text: `.claude/agents/{agent}.md`.** `SKILL.md` files become stubs that load the agent file, and `agent-personas.ts` is a **derived artifact** generated from it. Its silent fallback to Brian on an unknown persona key is now a **throw** — a mistyped agent name used to run as Brian and look like it had worked.
- **CHANGED — the "CI exists" residue purged from 12 documents.** GitHub Actions is billing-blocked account-wide **by choice** (`SOUL.md` → "Boundaries"), unrelated to the active GCP/Firebase billing; the quality gate runs **locally** and merging to `main` **is** the deploy. `templates/CI-TEMPLATE.yml` is kept and flagged inert rather than deleted — a future account could un-block Actions.
- **FIX — telemetry:** model names are recorded **per scope** (main loop vs delegated sub-agents) instead of being flattened into one list, and the `guessSprint` regex no longer mis-reads the sprint number off a touched path.
- **CHANGED — installer:** the addon's content-guarded section merge is generalized, so every payload section merges into an app's file idempotently instead of only the ones that had been special-cased.
- **Numbering, recorded once so the history stays readable.** This lot was authored as four stacked entries (`315.b` … `315.e`) while `origin/main` published its own **315.b** ("the two cards become markdown") and **315.c** ("every line earns its place"). The published numbers stand untouched; this work — one coherent change — is consolidated here as **316.a** rather than four entries. No earlier entry was dropped or rewritten.
- New agent-file contract + restructured cohort directory + a behaviour change in the engine → Major bump. Version 315.c → 316.a.

**315.c** (2026-09-01) — **Minor: every line earns its place — the card becomes actionable, not just readable**

- **Operator direction, recorded as a rule rather than an intention:** *"le plus structuré et clair et actionnable, le mieux"*. v315.a fixed **what** the card says, v315.b fixed **how it renders**; this fixes **which lines are allowed to exist**.
- **NEW — "every line earns its place."** A bullet survives only if it changes one of three things: a **decision** the operator might take, an **action** he might run, or a **mental model** he carries into tomorrow. A bullet that changes none of the three is **deleted, not shortened** — "we also touched X" is changelog, and the diff already says it. This is the rule the earlier "not a changelog" line implied without making testable.
- **NEW — "name the object, never the activity."** `docs/METHOD/method-core.md:393` not "the method file"; `npm run doctor` not "the checker"; `afd4cd7` not "the last commit". Everything nameable is named, as a clickable link or a runnable command. This is what separates an actionable card from a merely informative one, and it is only possible because v315.b took the card out of the code fence.
- **CHANGED — mirrors:** `method-core.md` (canonical), `method-core-lite.md` (one condensed bullet), addon `payload/CLAUDE.md` + `payload/AGENTS.md`, and the global `~/.claude/CLAUDE.md` (machine-local, not carried by the sync).
- Two rules added to an existing contract; no new METHOD file, command or hook. Minor bump. Version 315.b to 315.c.

**315.b** (2026-09-01) — **Minor: the two cards become markdown, not a code fence**

- **Problem.** v315.a shipped the Debrief inside a `text` fence. The operator's verdict after one day: *"en fenêtre de code c'est petit et pas très paginé"*. The fence was the wrong container — it renders in small monospace with **no bold, no colour, no clickable paths**, at a fixed width that forces content to wrap badly. The v315.a line discipline (≤ 68 characters, no wrapping paragraph) existed only to work around that container, and the ASCII bar `▓▓░░` reads as noise at that size.
- **CHANGED — both cards are now plain markdown**, framed by two `---` rules that span the window: a `### ✅ Debrief · {lane}` title carrying the status emoji, then bold section labels with **fixed emoji landmarks** — 📊 `Avancement` · 🧠 `À retenir` · 🤝 `Décidé pour toi` · ⚖️ `Tu décides` · ➡️ `Suite` · ⚠️ `Vigilance`. The emojis are deliberately invariant: the eye learns their position, which is what makes a recurring card scannable.
- **CHANGED — the progress bar is emoji**, 5 blocks 🟩/⬜ instead of 7 ASCII `▓`/`░`: bigger, legible at a glance, and it survives a proportional font.
- **DROPPED — the ≤ 68 character and ≤ 16 line caps.** They were container workarounds. Markdown wraps with the window, so the rule is now qualitative and stronger: **one idea per bullet, never a paragraph inside the card, six blocks maximum, an empty block deleted rather than filled with "none".**
- **NEW — link what is clickable.** Paths render as markdown links (`[method-core.md](docs/METHOD/method-core.md)`), commits/commands/error strings as inline code. Inside a fence none of that worked; this is half the reason the card left the fence.
- **UNCHANGED — the `▶ Prompt suivant` stays fenced**, because it exists to be copy-pasted; fenced as `bash` for a command so the app renders a Run button. It is the only fenced block in a closing.
- **CHANGED — the Flight Deck follows the same grammar** (`### 🛫 Flight Deck · {projet}`, six bold rows with 🎯 📍 🔀 ➡️ ⚖️ 🚧), so pickup and dropoff read as one system.
- **CHANGED — placeholders use `{braces}`, not `<angle brackets>`.** A markdown renderer can swallow `<lane>` as an unknown HTML tag, which would silently empty the template in `CLAUDE.md` and in every synced app.
- **CHANGED — mirrors:** `method-core.md` (canonical), `method-core-lite.md`, hub `CLAUDE.md` + `AGENTS.md`, addon `payload/CLAUDE.md` + `payload/AGENTS.md`, and the global `~/.claude/CLAUDE.md` "Output style" (machine-local, not carried by the sync).
- Presentation of an existing contract; no new METHOD file, command or hook. Minor bump. Version 315.a to 315.b.

**315.a** (2026-09-01) — **Major: Operator Reporting — the Debrief card**

- **Problem.** The closing `ORIENTATION` frame (Vue / Etat / Suite / Vigilance) had stopped being read. Two failures, both structural: long prose was wrapped into framed rows, so a "3-second landing strip" rendered as a five-line paragraph inside a box; and three overlapping summary devices coexisted — the 3-line header at the top, the Flight Deck at substantial stops, and the Orientation frame at the close — so the same information appeared up to three times per answer under three different vocabularies. The operator ended every intervention asking by hand: *"où en est le projet global ? qu'est-ce qui a été fait ? qu'est-ce que je dois décider maintenant ?"*.
- **NEW — "Operator Reporting" section** in `method-core.md`, right after "Project State & Handoff": the canonical spec for the two cards, their moments, the Debrief template, its hard rules and its cadence. A condensed copy lives in `method-core-lite.md` (the file most routine sessions actually load).
- **NEW — the Debrief**, closing card of every substantial answer: one-line headline + status glyph (`✅` fait · `🟡` besoin de toi · `🔴` bloqué · `👀` en observation), then **`Avancement`** (the row that was missing — position in the *global* project: sprint tasks closed, plan to-dos, screens ported, PRs, as a 7-block bar plus the ratio), **`À RETENIR`** (2–4 one-line key facts, with a `Décidé pour toi :` bullet for every reversible call made without asking, so it can be objected to cheaply), **`TU DÉCIDES`** (0–2 operator calls, recommendation first, or `rien — j'ai tranché : …`), **`SUITE`** (exactly one action), an optional `⚠` line, then the `▶ Prompt suivant` block.
- **Hard rules that carry the readability:** ≤ 16 lines, ≤ 68 characters per line, **no wrapping paragraph inside the card**, one idea per bullet. Every number grounded in a command run or a file read that turn — unknown stays `inconnu`, and a ratio is **never invented** (the card is the most-read surface of the METHOD; a wrong number there is worse than a missing one).
- **CHANGED — one card per moment, ending the redundancy.** The **Flight Deck** is now the **pickup** card only (`/brief`, resume hook, cold start); the Debrief is the **dropoff** card. An answer may open with a Flight Deck and close with a Debrief, but the Debrief then carries only what the Flight Deck didn't. The **3-line header** (`Done / State / Next`) is scoped to **written artifacts** — PR bodies, task reports, sub-agent reports to an orchestrator; chat replies lead with the answer instead.
- **CHANGED — cadence.** Full card on substantial answers (code/docs changed, slice closed, decision taken, handoff, `/brief`, `/ship`, `/relay`, `/review`) · one landing line (`✅ <fait> · suite → <action>`) on small ones · no card when nothing was done. **A delegated sub-agent never emits a Debrief** — otherwise a `junia → brian → sage → vera` chain lands four cards in one answer; the orchestrator folds every report into one.
- **CHANGED — mirrors:** hub `CLAUDE.md` + `AGENTS.md` Communication Contract now lead with the Debrief bullet; addon `payload/CLAUDE.md` gains an "Operator reporting" section and `payload/AGENTS.md` an "Operator Reporting" section (both carrying the template, so a synced app is self-sufficient); `.claude/commands/relay.md` and `ship.md` (+ their payload copies) close with the Debrief instead of `Done / State / Next`; `.claude/agents/junia.md` gains the fold-the-cohort's-reports-into-one-card rule.
- **CHANGED — tooling (`~/.claude/scripts/flight-deck.ps1`):** `-Mode context` and `-Mode resume-hook` now emit `sprint` and `sprint_progress`, so `Avancement` is grounded for free on `/brief` and on resume. The counter resolves `docs/sprints` by walking up from the working directory to the git root (a nested app mirror keeps its own sprints under the hub's git root), caps sprint numbers at 3 digits (so a `2025/` folder is not mistaken for the current sprint), excludes the sprint's own index file from the task count, and counts **both** status vocabularies — the METHOD emoji markers and the ASCII `[ ]`/`[x]` convention most app repos actually use. Verified against ACOSH (`023`, 0/3), BanaLog (`121`, 0/7), the nested `Apps/Banadoo` mirror (`001`, 0/1), AuSalon (`020`, index file only, reports "no status-tagged task files") and the hub itself (no `docs/sprints`, reports `none`). The file is kept **pure ASCII** — emoji are matched by Unicode code-point escapes, because a `.ps1` without a BOM is read as the ANSI codepage by PowerShell 5.1 and literal emoji would silently break every match.
- **Global (cross-project) layer:** `~/.claude/CLAUDE.md` "Output style" rewritten around the same two cards, and `~/.claude/skills/brief/SKILL.md` now closes `/brief` with a Debrief whose `Avancement` reads `sprint_progress` from the live context.
- New reporting contract + reworked rituals and hook output. Major bump. Version 314.b to 315.a.

**314.b** (2026-09-01) — **Minor: One sprint = one conversation = one branch = one worktree**

- **Problem.** Two canonical rules shipped side by side and excluded each other. `agents-engineering-method.md` §9 "Context Hygiene" item 1 said *"One thread per task. Start a new Desktop chat / Claude Code session for each sprint task."*; `sprints-method.md` → "Conversation Naming" said *"One sprint, one conversation — keep all of a sprint's role-switching inside the conversation named for that sprint."* Neither had an owner, so an operator who read one and then the other could not tell how many windows to open. Both were prescriptions about the same thing written in two files that never referenced each other.
- **ARBITRATED — `sprints-method.md` → "Conversation Naming" is the canonical home** of the session-splitting rule, and is now flagged as such at the top of the section. The existing rules are kept verbatim: a sprint conversation's title starts with the sprint number (`{NNN} {topic}`), and tracked interventions use `INT {YYYY-MM-DD} {topic}`.
- **NEW — the rule: "one sprint = one conversation = one branch = one worktree."** It is not a style preference; it follows from what `.claude/settings.json` actually wires. Two `Stop` hooks run at the end of every Claude Code turn and both write to git: `ship-push.sh` (`exit 0` on `main`/`master`/`HEAD`, otherwise `git push`, or `git push -u origin "$branch"` when there is no upstream — never commits, never force-pushes) and `session-telemetry.mjs` (appends one row to `docs/project/telemetry/sessions.jsonl`, then commits and pushes that row only, behind the same guard `if (!branch || ['main','master','HEAD'].includes(branch)) return;`). Both **swallow a rejected push** — `ship-push.sh` redirects it to `>/dev/null 2>&1`, and the telemetry hook states the same choice in its own comments: *"Never force-pushes. A rejected push leaves the row committed locally; the next turn retries."* Consequence: two sessions on one branch make the second's push fail non-fast-forward and vanish — the work exists locally while `/brief`, the telemetry ledger, GitHub and the operator all read that branch as stalled. That is the expensive failure: not a lost commit, a *lie about progress*. Two sessions in one worktree share an index, so `/ship`'s `git add` stages the other session's mid-edit files. The fix is the naming rule, not more hook logic.
- **NEW — three lanes, ASCII titles, sprint number first:** **Sprint** (default) `{NNN} {sujet}` / `sprint/{NNN}-{slug}` / one sprint · **Split** (exception) `{NNN} {sujet} · {seq} {titre}` / `sprint/{NNN}-{seq}` + its own worktree / one card · **Intervention** `INT {YYYY-MM-DD} {sujet}` / `int/{date}-{slug}` / one fix. No literal emoji in a title or branch name — the precedent is this file's own v315.a entry (`flight-deck.ps1` is kept pure ASCII because a `.ps1` without a BOM is read as the ANSI codepage by PowerShell 5.1 and literal emoji silently break every match) and its mirror-image at v306.b (`[ ]` read as a PowerShell wildcard). Emoji stay in **file** status markers.
- **NEW — the operator's uppercase lane prefixes are documented, not overruled.** Outside a sprint he already writes `PILOT - …`, `PROD - …`, `AUTOM - …`, `GROWTH - …`. That form is now the documented shape for conversations belonging to no sprint: it sorts cleanly, does not compete with `{NNN}`, and a convention already in use beats a stricter one that gets ignored. `INT {YYYY-MM-DD} {topic}` remains the form for a *tracked* intervention (the one that writes `docs/interventions/`).
- **NEW — the choice rule is runtime, never planning-time.** At planning the planner holds the least information it will ever hold about a card: it has not seen the code, the test output, or how many fix loops the card will cost. Default: **sub-agent inside the sprint conversation**. Workflow at **≥ 3 near-identical items + a verification pass**. **New session only if one of four facts has already happened**: the 3rd build→test→fix loop has started on the same card · the card lives in another repo than the sprint · it needs its own deploy + verify loop with the operator in it · two code-writing cards must run concurrently (each on `sprint/{NNN}-{seq}` in its own worktree). Nothing else — not size, not estimate, not "it looks big".
- **DELIBERATELY NOT ADDED — no `Session:` field on the task template.** Its neighbour `Tier:` has been mandatory since v311.a and is present in `templates/TASK-TEMPLATE.md`, yet a grep over `Apps/*/docs/sprints/` finds it filled in **0 of 85** task files (all 5 `tier` hits in those files are domain prose — customer tiers, pricing tiers). A second dead field beside a dead field is not automation, only more surface to sync. The trigger list is checked by whoever executes, when the trigger fires.
- **NEW — one conversation relays.** `method-core.md` → "`## Resume here` — the Relay home" allows exactly one block per app (*"One `## Resume here` block per app; each `/relay` overwrites the previous."*), so only the sprint conversation runs `/relay`. A split session hands back through its task file and its commits.
- **CHANGED — pointers, never copies:** `agents-engineering-method.md` §9 item 1 replaced (was "One thread per task") and §5 "When to use subagents" gains a pointer; `method-core.md` gains the missing half beside the sub-agent offload rule (a sub-agent returns a conclusion into a context you keep; a separate session carries the context away and returns a document, owns its branch, and does not relay); `method-core-lite.md` — the file routine sessions actually load — gains a short `## Sessions` block with the rule and the pointer.
- **NEW — "Délégation par défaut"** in the hub `CLAUDE.md` and `payload/CLAUDE.md` (kept identical), under Model Routing: a standing order the operator was retyping by hand every session. Coordination stays in the conversation; each delegation goes out on the cheapest model that meets the bar (haiku mechanical · sonnet build/tests/ops · opus judgment/review/security, one retry per tier then escalate); a workflow at ≥ 3 similar items; a parallel session only on an observed trigger; and offloading context is a goal in itself — residue-heavy exploration goes to a sub-agent that returns **only its conclusion**.
- **FIX — count drift, each number verified against the filesystem.** `.claude/commands/` holds **6** files (`intervention`, `plan-sprint`, `port`, `relay`, `review`, `ship`), documented as 4 — corrected in `METHOD.md` (both the native-layer note and the Support-files footer), `docs/METHOD/README.md` (file structure), `routing-method.md` ("By Slash-Command" table, which was missing `/relay` and `/ship` as rows), hub `CLAUDE.md`, `.claude/agents/README.md`. `.claude/agents/` holds **13** personas + README, documented as 12 in `METHOD.md` ×2 — corrected. Addon `README.md` listed **5** commands (missing `relay`) and **8** skills (missing `media`) against a payload holding **6** and **9** — corrected.
- Clarification + cross-link corrections + count fixes; no new METHOD file, no new command, no new hook. Minor bump. Version 314.a to 314.b.

**314.a** (2026-08-10) — **Major: the hub stops versioning 17 copies of itself**
- **Problem it fixes.** The hub tracked **2,031** mirror files — `Apps/**/docs/METHOD/` (1,404), `Apps/**/.claude/` (608) and 38 seeded `PORT-MAP-TEMPLATE.md` — i.e. 18 copies of every rule. That duplication was the *cause* of the drift v313.b was built to detect: one rule change meant 18 places to update, a release diff was 3,511 items (tripping the landing gate's >60-file `scale` exception **every single time**, so a gate had to be overridden as routine), and `grep ship-push` in the hub returned 30 files, 28 of them the same sentence repeated.
- **CHANGED — mirrors are gitignored, not deleted.** `git rm -r --cached` on all 2,031 paths; files stay on disk; `.gitignore` now carries `Apps/**/docs/METHOD/`, `Apps/**/.claude/`, `Apps/**/docs/project/design/PORT-MAP-TEMPLATE.md` with the rationale inline. Verified safe first: every tracked mirror file was payload-generated, and all 18 app `.claude/settings.json` were **byte-identical** (md5 `8c142fc2`) — zero app customization was at risk. `installClaudeAddon` recreates `settings.json` when absent, and the sync recreates `.claude/agents/` + `.claude/commands/`, so everything untracked is regenerable.
- **Operational consequence, stated because it bites once:** pulling this release **deletes the mirrors from a checkout's disk** (they were tracked, now they are not). Run `npm run sync-method:all` once per machine to repopulate. Never author inside a mirror.
- **NEW — doctor check E8:** fails if any `Apps/**/docs/METHOD/*` or `Apps/**/.claude/*` path is tracked again, so one careless `git add -f` cannot silently undo this. **W1** re-worded — it now reports *stale generated output on this machine*, not repo drift. **W3** re-worded: `Apps/_archived/**` is excluded from the sync scope (`EXCLUDE_PATTERNS`), so an archived mirror can only rot — delete it or promote the app.
- **FIXED — landing gate lane patterns were root-anchored.** `verify-gate.mjs` matched `^docs/` and `^\.claude/`, so `Apps/{app}/docs/METHOD/...` and `Apps/{app}/.claude/...` fell through to the **app** lane — this very change would have kicked off a real `npm run build` per nested app. Both are now depth-agnostic (`(^|/)docs/`, `(^|/)\.claude/`, same for `scripts/`, `tools/`, `.github/`, `qa/`, `prompts/`, `TEMPLATES/`, `projects/`). Fixed in the hub copy and the addon payload together, which doctor **E5** enforces.
- **REMOVED — `docs/project/rescued-stash-0-sprint-captain-verify-gate.patch`**: superseded by the landed v313.a implementation; keeping it invited someone to re-apply a stale design.
- Breaking file-structure change → Major bump. Version 313.b → 314.a.

**313.b** (2026-08-10) — **Minor: METHOD consistency becomes machine-checked (`npm run doctor`)**
- **Problem it fixes.** v313.a made *merging* machine-checked; METHOD consistency itself was still prose. An audit found `ai-infra-method.md` carrying two stamps that had disagreed since 306.c (309.a in the header, 306.c in a footer that also still named Riley as owner, two releases after the file was re-owned to Aiko), three more files carrying duplicate stamps waiting to drift the same way, and 17 tracked fleet mirrors a release behind — none of it caught by anything.
- **NEW — `scripts/method-doctor.mjs` (`npm run doctor`).** Seven ERROR checks: the declared version agrees across `METHOD.md`/`README.md`/`versioning.md` · a `Version History` entry exists for it · no file declares two *different* stamps · no file claims a version newer than declared · **the addon payload byte-matches the hub for every file it ships** (line-ending agnostic — this is what stops apps receiving a stale copy of a hook the hub already fixed) · every hook path wired in `.claude/settings.json` exists · every `docs/METHOD/<file>.md` reference resolves. Three WARN classes: duplicate-but-agreeing stamps, fleet mirrors behind the hub, and **app roots the landing gate cannot verify** (no `typecheck`/`type-check`/`test`/`build`) — which ties the doctor to the v313.a gate.
- **CHANGED — one metadata block per file.** Removed the duplicate footer stamps from `agents-method.md`, `definition-method.md`, `process-method.md` and the stale one from `ai-infra-method.md`, folding `**Last Updated:**` into each header. The convention is now written down under "Per-file version stamps" instead of being folklore.
- **CHANGED — Sync Protocol rule 4:** `npm run doctor` must be green before a sync, because a sync multiplies any hub inconsistency by 17.
- Known-and-reported, not silently tolerated: 17 mirrors at 312.b awaiting the sync · `Apps/_archived/Banapilot` still carries a mirror inside the sync scope · `Swanifly` (root), `Swanifly/web`, `SprintOS/web`, `Apps/HarryQuote` have no `test` script, so their app code lands untested.
- No new METHOD file, sub-agent, slash-command or enforcement hook → Minor bump. Version 313.a → 313.b.

**313.a** (2026-08-10) — **Major: Land, don't ship — the operator stops managing pull requests**
- **Problem it fixes.** Every conversation ended by pushing a branch and opening a PR, and the operator had to remember to merge each one. Nine PRs had accumulated on the hub (oldest 278 days, several conflicting or draft), so "finished work" routinely meant "work waiting on attention". Branch protection is unavailable on this plan (HTTP 403) and CI was removed for billing (`8b989e9`), so the human merge click was carrying a gate that nothing else enforced.
- **NEW — `.claude/hooks/verify-gate.mjs`:** classifies the diff against the trunk into lanes and only spends build time where production can break — `doc` (`docs/`, `*.md`, `proto/`, `qa/`, `*.jsonl` → nothing to run) · `tooling` (`scripts/`, `.claude/`, `tools/`, registries → `node --check`) · `app` (nearest package.json root → its `lint`, `typecheck`|`type-check`, `test`, `build`, stopping at the first red). Writes `.method/verify-ok.json` **pinned to the HEAD sha**. Exits 0 green / 1 red / 2 blocked, and **fails closed**: app code under a root exposing none of `typecheck`/`test`/`build` is `blocked`, not green (this is why `Swanifly/web` cannot land app code until its tests are backfilled).
- **NEW — `.claude/hooks/land.mjs`:** refuses on trunk / detached HEAD / dirty tree / nothing ahead; scans the exception list; merges `origin/main` into the branch (**never** rebases); runs the verify gate and demands a green marker whose sha equals HEAD (a stale green is not a green light); then `git push origin HEAD:refs/heads/main`. Because the trunk is never checked out, it is worktree-safe by construction, and GitHub marks any open PR for the branch as merged on its own — no PR dance. Also `--sweep` (every open PR + what blocks it) and `--sweep --apply` (squash-merge the clean ones).
- **NEW — the exception list, decided once instead of per PR** (fail-closed, machine-checked): schema / Firestore rules · auth, secrets, middleware · `SOUL.md` · a real `dependencies`/`devDependencies` or lockfile edit (a `scripts`-only `package.json` touch does **not** block) · migrations · deploy/CI wiring · >60 files or >2000 deleted lines · `[no-auto-merge]`/`[wip]`/`[hold]`/`Needs decision` in a commit · `wip` in the branch name · red/absent/stale verify · trunk conflict. Held back → the branch is pushed and a PR opened (or commented) **once** with the exact reason, plus a `### Needs decision` block in the report. Deliberate override: **`[land-anyway]`** in the commit subject.
- **NEW — hooks + command.** `Stop` → `land.mjs --auto --lane docs` (docs/tooling only, so a half-built feature can never reach `main` between two turns); `SessionEnd` → `land.mjs --auto` (full land: the "results of each conversation reach `main`" guarantee); `/land` = the explicit close at slice end. `npm run verify` / `land` / `land:dry` / `land:sweep` / `land:sweep:apply`.
- **CHANGED — `/ship` demoted to the exception path** (open a PR *because the operator must decide something*, stated as a `### Needs decision` block). `method-core.md`: "Branches" rewritten around the **slice** (branch lifetime = one conversation), "Merge Gate" replaced by **"Landing (the default) & the exception list"**, new **"Slice discipline"** section tying landing to token cost. `method-core-lite.md`, `docs/cicd/DEPLOY.md` (now "Land & Deploy"), hub `CLAUDE.md` + `AGENTS.md` (loop step 5 is **Land**) updated to match; addon payload + `settings.snippet.json` carry all of it to every app.
- **Trade recorded:** green = land = deploy to prod, the same call made on 2026-06-28. The verify gate is the only brake, so keeping it honest (every shipping app exposes `typecheck`/`test`/`build`) is now a METHOD obligation, not a nice-to-have.
- New hooks + new slash-command + a rewritten core section → Major bump. Version 312.b → 313.a.

**312.b** (2026-08-01) — **Minor: Output Compression boundary — terse chat, complete artifacts**
- **NEW — "Output Compression" section** in `routing-method.md`, right after "Session Telemetry Ledger": names the one boundary that matters — compress the **conversation**, never the **artifact**. Two-column table (compress freely / never compress), plus the two invariants: code/commands/paths/errors/numbers verbatim everywhere, and the handoff is always a doc.
- **CHANGED — mirrors:** hub `CLAUDE.md` + `AGENTS.md` gain a "compress the chat, never the artifact" bullet in their **Communication Contract**; addon `payload/AGENTS.md` (`### Output Compression`) + `payload/CLAUDE.md` gain the same rule under **Model Routing** — neither payload file carries a Communication Contract section, and both already host the Session Telemetry Ledger there, so the rule reaches every synced app by the established shape.
- **Scope call — third-party compression skills (Caveman & co.) stay opt-in per session, not a fleet default.** Rationale recorded in the new section: output tokens are the minority of agentic spend (input + cache reads dominate, and code never compresses), such skills add standing instructions to the context, and the Session Telemetry Ledger already exists to measure the real delta instead of trusting a headline number.
- No new METHOD file, sub-agent, slash-command or hook → Minor bump. Version 312.a → 312.b.

**312.a** (2026-07-12) — **Major: Session Telemetry Ledger — the Model Routing feedback loop**
- **NEW — Claude Code Stop hook `.claude/hooks/session-telemetry.mjs`:** appends one JSON row per invocation to `docs/project/telemetry/sessions.jsonl` — tokens (input/output/cache-creation/cache-read, split into `mainLoop` and delegated `subAgents`, deduped per API-response `message.id` so streamed content-block splits are never double-counted), user/assistant message counts, start/end timestamps + duration, model(s) used, git branch, app name, best-effort `topic` (first user message, truncated) and `sprint` (regex on touched `docs/sprints/{NNN}` paths). `outcome`/`efficiencyNote` are always `null` from the hook — optional manual fields for the closing agent, Vera, or Iris to backfill.
- **Deliberately no dollar-cost field.** Pricing changes and varies by plan; raw token counts are the source of truth, apply your current rate card at analysis time rather than trusting a hardcoded (and likely stale) table baked into the hook.
- **Fires after every assistant turn** (Stop hooks have no cleaner "true end of conversation" signal in Claude Code today) — each firing re-parses the whole transcript and appends a fresh cumulative snapshot. Append-only by design (safe under concurrent sessions); consumers dedupe by `sessionId` and keep the newest row. Fails open on any error; silent on success (no `systemMessage`, to avoid per-turn noise).
- **NEW — canonical "Session Telemetry Ledger" section** in `routing-method.md`, positioned right after "Model Routing": frames the ledger explicitly as that policy's feedback loop, documents the schema, mechanics, distribution, and the **cross-tool gap** — no automated equivalent exists yet for Codex CLI (`/status`/`/usage` exist but no hook mechanism) or Cursor (account-level only, per-conversation export not natively available); both call for manual self-reporting in the interim.
- **CHANGED — addon distribution:** hook mirrored to `docs/METHOD/tools/swanifly-claude-addon/payload/hooks/session-telemetry.mjs`; `settings.snippet.json` gained a `Stop` entry; `install.mjs` now copies the hook file and merges the `Stop` hook into an app's `.claude/settings.json` idempotently (checked independently from the existing `PostToolUse` no-mock-guard merge; preserves any custom `Stop` hook the app already has — appends alongside, never replaces). Verified against a fresh app (both hooks merged, correct JSON) and a re-run (idempotent, no duplication) and an app with a pre-existing custom `Stop` hook (preserved + appended correctly).
- **Verified against real data:** ran the hook against this session's own live transcript before wiring it in — correctly summed tokens across the main loop and 32 sub-agent/workflow transcript files with no double-counting.
- Version bumped 311.a → 312.a.

**311.a** (2026-07-10) — **Major: Model routing by default — tiered delegation, environment-aware**
- **NEW — "Model Routing" canonical section** (`routing-method.md`): **orchestrate high, execute cheap** — the coordinator runs on the strongest model of its surface; every delegated task runs on the **cheapest model that meets its quality bar**. Three tool-agnostic tiers: **T1** judge/plan/review/security (Fable/Opus) · **T2** build/tests/ops (Sonnet) · **T3** mechanical — scaffolding, renames, i18n extraction, bulk edits (Haiku, delegation-time override only, no agent defaults to it). Escalation rule: one retry max at a tier, then escalate one tier. Quality floors: Vera review gate + Kasper security never below T1.
- **NEW — Environment-awareness rule:** before routing, the coordinator **inventories the models its surface actually exposes** and maps them onto T1/T2/T3 by capability & price — Claude Code (frontmatter + per-delegation override), Claude Desktop (per-chat pick), **Cursor** (workspace model list), **Codex/other CLIs** (tool's model options). Missing tier → nearest available, preferring upward; single-model surface → run inline and flag the tier mismatch in the report.
- **CHANGED — Junia orchestrates cost:** `/plan-sprint` (hub + addon payload) and `TASK-TEMPLATE.md` now carry a **`Tier: T1|T2|T3`** field per task, assigned at planning; `junia` sub-agent passes a `model` override at delegation when the task tier differs from the sub-agent's default (`.claude/agents/` frontmatter = the default tier; documented in `.claude/agents/README.md`).
- **CHANGED — mirrors aligned:** hub + payload `CLAUDE.md` (new "Model Routing" section; Desktop model line re-expressed in tiers; stale v308.a/v307.a stamps + duplicated sub-agents blockquote fixed) and hub + payload `AGENTS.md` (cross-tool Model Routing section for Cursor/Codex); `agents-method.md` ("How agents run" policy paragraph); `agents-engineering-method.md` (§5 delegation-cost note, §7.5 tiers); `.claude/skills/junia` + `/sprint` skill (hub + payload) carry the `Tier:` contract.
- **FIX — reconciliation sweep (adversarially verified):** purged below-T1 Vera instructions (`sprints-method.md` Review Gate line, `REVIEW-TEMPLATE.md` model default, `agents-method.md` Vera/Junia Model Preferences); re-tiered the stale model tables (`agents-engineering-method.md` §4 — Watson→Sonnet, +Gordon/Kasper/Iris rows, advisory-hat note corrected; `agent-launch-prompts.md` Quick Reference); Riley residue removed (TASK-TEMPLATE, `/sprint` skill, sprints-method canonical example → Brian + `Tier: T2`); roster counts 12→13; `docs/METHOD/README.md` refreshed from 309.a; version stamps aligned on every touched file.
- Version bumped 310.a → 311.a.

**310.a** (2026-07-08) — **Major: `/relay` handoff ritual — the dropoff half of context handoff**
- **NEW — `/relay` slash-command ritual** (alias `/handoff`; `.claude/commands/relay.md` + addon payload `payload/commands/relay.md`): the inverse of `/brief`. `/brief` *picks up* a fresh conversation from git + `STATE.md` + memory; `/relay` *drops off* — it flushes a conversation's volatile working-state (settled decisions, dead ends tried, exact next action) into `STATE.md` before the window ends and emits a pasteable Relay block. Ships to every app via the installer payload, same as `/port`.
- **NEW — `## Resume here` convention on `project/STATE.md`** (documented in `method-core.md` → "Project State & Handoff"): the durable Relay home, auto-loaded so `/brief` reads it for free. Six-row schema — **But · Acquis · État · Charge · Prochaine · Pièges** — pointers, never payloads. One block per app; each `/relay` overwrites it. Seeded as a placeholder into the hub `project/STATE.md`.
- **CHANGED — operating-loop step 5 "Report & hand off"** (`CLAUDE.md` §"How Agents Operate" + `AGENTS.md` §"Operating Loop"): now emits a Relay at clean handoff boundaries, with the trigger rule — relay only once state already lives in git + `STATE.md` + task report, never mid-thrash (a premature handoff costs more in re-exploration than it saves).
- **NEW — sub-agent offload rule** (`method-core.md`): route residue-heavy exploration / research through sub-agents (Iris / Explore) that return conclusions only, so the main context accumulates less residue and needs fewer Relays.
- **CHANGED — Relay ≠ memory boundary** noted in `agents-engineering-method.md` §7.6: a Relay is volatile per-workstream *resume* state (owned by `STATE.md`); memory is durable cross-session *facts*.
- **Updated:** `.claude/commands/relay.md` (+ payload mirror), `method-core.md`, `CLAUDE.md`, `AGENTS.md`, `agents-engineering-method.md`, `METHOD.md` (version line + What's New), `versioning.md`, `app-settings.json`, `project/STATE.md`.
- Version bumped 309.b → 310.a; synced to the fleet via `npm run sync-method:all` + `npm run sync-method`.

**309.b** (2026-07-05) — **Minor: Design Port Loop v2 — living `proto/` directive**
- **CHANGED — The design directive is now the living HTML prototype in `proto/` at each app's root.** Claude Design is demoted to **bootstrap only**: it generates the initial prototype, whose source seeds `proto/`; the proto then evolves **in place** (design + features worked out in HTML *before* development). Git history of `proto/` = design history — the re-export loop is gone.
- **RETIRED — `docs/project/design/artifacts/{app}/`** as the directive drop-zone for new work; `/port` falls back to it only where `proto/` doesn't exist yet.
- **NEW — Proto workspace rules** (`design-method.md` → "Proto workspace"): plain HTML/CSS/JS, token + class contract mandatory; fake data confined to `proto/` (never shipped — no import/link/copy into `app/`/`src/`/`components/`); per-screen lifecycle in PORT-MAP (⬜ designing · 🔄 porting · ✅ ported · ⚠️ diverged); proto-first for post-ship design changes; conflict gate unchanged (the proto never pre-decides the data model).
- **Updated:** `design-method.md` (Prototyping + Design Port Loop), `/port` command (hub + addon payload), addon snippet `design-port-directive.md`, payload + hub `CLAUDE.md` blocks, `docs/porting/PORTING-PLAYBOOK.md`.

**309.a** (2026-06-16) — **Major: Native Orchestration + Reconciliation Refresh**
- **NEW — Runners & Orchestration layer:** documented the native execution stack in `METHOD.md` / `README.md` — native sub-agents (`.claude/agents/`, **default**) → Agent Teams (parallel) → Cowork (desktop) → Swanifly (**one runner, not THE engine**). Reframed every "Swanifly is the engine" line across the docs.
- **REWRITE — `routing-method.md` (306.c → 309.a):** replaced the manual "[Switching to Brian]" role-switching worked example with a native flow (`/plan-sprint` → Junia delegates to sub-agents → build → `sage` → `watson` if red → `/review` Vera → merge) + an Agent-Teams parallel variant; added sub-agent and slash-command routing rows; purged retired agents from the routing tables.
- **CHANGED — Cohort 10 → 12 executable agents:** promoted **Gordon** (Sales/Marketing) and **Kasper** (Security) to native sub-agents (`.claude/agents/`) + Skills. **Riley** (API/automation) remains a demoted advisory hat (not executable). Agents now run in Claude Code (web + Cowork's local Code tab) as sub-agents AND in Claude Desktop as Skills.
- **NEW — Parallel + fleet model:** worktree isolation, fan-out on independent tasks, dependency gates and merge policy; the multi-repo (~30-app) dimension (shared cohort vs per-app sync).
- **NEW — Gates as hooks:** ~~DoD / Kill-Gate / write-path scoping (sage→tests, vera→review-only) wired as `.claude/settings.json` PreToolUse hooks instead of honor-system prose.~~ **Corrected 2026-08-04:** this never shipped. `.claude/settings.json` has no `PreToolUse` block. What exists is tool-list scoping in `.claude/agents/` frontmatter — real for `vera` (no `Write`/`Edit`), absent for `sage` (identical tools to `brian`). DoD and Kill-Gate remain prose.
- **NEW — Design Port Loop:** promoted `docs/porting/PORTING-PLAYBOOK.md` into the design method — directive-as-file, PORT-MAP-first, one-screen-per-PR, reconcile-don't-overwrite, plus the multi-stack token bridge (incl. the **MUI-hex** rule).
- **CHANGED — AI infra model refresh:** `ai-infra-method.md` re-owned to **Aiko**; model lineup refreshed to the 2026 baseline (Fable 5 / Opus 4.8 / Sonnet 4.6 / Haiku 4.5 + 1M context) with prompt-caching cost levers.
- **CHANGED — Stack drift caveat:** `method-core.md` / `method-core-lite.md` / `code-rules.md` now state **declared stack = TARGET**; detect the app's actual stack first (e.g. `Apps/web` = Next 14 + MUI flat; BanAventures = Vite + Tailwind). `code-rules.md` folder-structure rule made conditional (target `src/features/` vs legacy flat `app/`+`components/`) and re-owned **Kasper → Brian (+ Kasper security review)**.
- **FIX — Retired-agent purge:** removed Gordon/Riley/Kasper residue from owner lines, routing trees and worked examples across the reconciliation sweep.
- **FIX — Hygiene:** resolved the `versioning.md` truth-source contradiction (**Bana-Share** is the source of truth) and extended "When to Increment" to cover new sub-agents / slash-commands / hooks; unified the sprint-folder scheme to `docs/sprints/{NNN} {status} {name}/` (purged `{year}/week-##`); removed "(FULL)" / "FULL" mode residue and restored the orphaned debugging-section heading in `method-core.md`; fixed the "mixutils" typo; corrected stale file counts to include `.claude/agents/` + `.claude/commands/`.
- Version bumped from 308.a → 309.a; synced to the fleet via `npm run sync-method:all`.

**308.a** (2026-06-01) — **Major: Claude Suite Migration**
- **REWRITE:** `agents-engineering-method.md` — replaced the Cursor + Antigravity 2.0 dual-tool model with the **Claude suite**: Claude Desktop (cockpit/plan/review/design), Claude Code (autonomous executor + Swanifly engine), Claude Design/Artifacts (prototyping)
- **NEW FILE:** root `CLAUDE.md` — canonical project context, auto-loaded by Claude Code and pasted into Desktop Projects (merges the useful content of `AGENTS.md` + `GEMINI.md`)
- **NEW:** `.claude/skills/` — the agent cohort as Claude Skills (10 personas), mirroring `Swanifly/web/lib/engine/agent-personas.ts` as source of truth
- **NEW:** Claude Desktop settings section — Projects, Skills, MCP connectors, custom instructions, model selection
- **CHANGED:** Prototyping moved to **Claude Artifacts** (Nova), replacing the home-made proto-kit live tuner
- **CHANGED:** Agent cohort pruned 13 → **10** to match what the engine can actually spawn; Gordon, Riley, Kasper reframed as advisory hats (not executable Skills)
- **FIX:** `method-core.md` DoD corrected from a stale 15-item list to the streamlined 9 items (as 305.a intended)
- **FIX:** duplicate/misnumbered `306.c` changelog entry relabeled to `304.b`
- **DEPRECATED:** `GEMINI.md` (→ redirect stub), `.cursor/rules/`, `proto-kit/`, `tools/banabooster/`, `tools/swanifly-antigravity-addon/`
- Version bumped from 307.a → 308.a

**307.a** (2026-05-21) — **Major: Antigravity 2.0 Tool-Tier Overhaul**
- **REWRITE:** `agents-engineering-method.md` (formerly `vibe-coding-method.md`) — replaced 3-tier model (Ollama/Cline Kanban/Antigravity) with 2-tool model (Cursor + Antigravity 2.0)
- **NEW:** Cursor vs Antigravity decision tree — practical guidance for dual-tool workflow
- **NEW:** Antigravity subagent patterns for Brian, Sage, Watson — parallel sprint execution without Cline Kanban
- **NEW:** Updated sprint execution loop diagram for AG 2.0 (subagents, browser tool, background tasks)
- **CHANGED:** Agent→tool mapping table rewritten — all agents now map to Antigravity (primary) or Cursor (quick edits); Cline Kanban removed
- **CHANGED:** `agents-method.md` — refreshed all 14 agent model preferences: Claude Opus 4.6 for deep reasoning/review, Gemini 2.5 Pro for fast iteration, removed GPT-5 Codex references
- **CHANGED:** `agents-method.md` — added **Tool** field to every agent's Model Preference section
- **DEPRECATED:** `.clinerules`, `kanban-templates/` — kept for compatibility but no longer actively maintained
- Version bumped from 306.c → 307.a

**306.c** (2026-04-16) — **Minor: BanaBooster Auto-Retry Watcher**
- **NEW TOOL:** `docs/METHOD/tools/banabooster/patch.js` — added Auto-Retry Watcher: a `MutationObserver` IIFE injected into Antigravity's workbench that automatically clicks **Retry** on the "Agent terminated due to error" dialog (e.g. HTTP 400 from Claude's Vertex endpoint)
- **CHANGED:** Retry watcher injected independently of the AutoRun patch — works even when autorun pattern-match fails for a given AG version
- **CHANGED:** `--check` now reports `+retry` / `(no retry)` status; `--revert` strips both patches cleanly
- Version bumped from 306.b → 306.c

**306.b** (2026-04-16) — **Minor: Emoji Status Tags + PowerShell Fix**
- **CHANGED:** Replaced bracket-based sprint status tags (`[ ]`, `[x]`, `[v]`, `[!]`) with emoji equivalents (`⬜`, `✅`, `☑️`, `⚠️`) in all METHOD files, templates, and workflow scripts
- **CHANGED:** `sprints-method.md`, `METHOD.md`, `TASK-TEMPLATE.md`, `sprint-plan.md`, `sprint-close.md`, `task-start.md` — updated all filename format examples and status references
- **FIX:** PowerShell treats `[ ]` as wildcard pattern matchers in paths, causing errors when referencing sprint task files; emojis are safe
- Version bumped from 306.a → 306.b; synced to all repos


**306.a** (2026-04-11) — **Major: Process-First AI Architecture**
- **NEW FILE:** `process-method.md` — Process architecture standard: delegation types (manual→autonomous), trust progression, ProcessRun/ProcessStepRun schemas, process health monitoring, continuous improvement loops
- **NEW TEMPLATE:** `PROCESS-TEMPLATE.md` — Reusable template for defining business processes in `project/PROCESSES.md`
- **NEW TEMPLATE:** `AGENT-CONTRACT-TEMPLATE.md` — Formal agent contract template targeting `project/AI-INFRA.md`
- **CHANGED:** `definition-method.md` — Added Chapter 13 (`13-processes.md`, required for AI-native apps) to the Specification Book
- **CHANGED:** `ai-infra-method.md` — Added Process Execution Tracing section with `ProcessTraceLogger` utility (Admin SDK, subcollection-based steps, atomic counters, costUsd per step)
- **CHANGED:** `agents-method.md` — Added ProcessOps rituals: Watson (bi-weekly Process Health Check), Lucia (monthly Process Review)
- **CHANGED:** `METHOD.md` — Process-First added to core principles, file count 14→15, Quick Start entry, innovations 16-18
- Total METHOD files: 14 → 15 (added `process-method.md`), templates: 9 → 11

**305.b** (2026-03-28) — **Minor: Antigravity Update Stability**
- **NEW:** Explicit requirement to re-run `ag-autorun` patch after Antigravity IDE updates to prevent UI regressions (blank screens) and restore checksum-bypassed auto-execution.
- Documentation sync with current repo state.

**305.a** (2026-03-21) — **Major: Definition Pipeline + Focus + Cross-App Governance**
- **NEW FILE:** `definition-method.md` — 3-phase pipeline (DISCOVER → SPECIFY → PROTOTYPE) with templates, gates, anti-patterns
- **NEW:** Focus System — single-objective taquet (NOW/NEXT/LATER) per app via `project/FOCUS.md`
- **NEW:** Cross-App Governance — BanaPilot visual sync, drift detection, health scoring
- **NEW:** M3 Design Standard — Material Design 3 made mandatory baseline for all apps
- **CHANGED:** DoD streamlined from 15 → 9 items (removed redundant schema/state checks, folded into task-specific gates)
- **CHANGED:** METHOD.md rewritten with table-first formatting for fast scanning
- **CHANGED:** Context loading rule added: max 3 METHOD files per chat session
- **CHANGED:** Quick Start table replaces triple entry-point sections
- Total METHOD files: 12 → 14 (added `definition-method.md`, kept all existing)

**304.b** (2026-03-14) — **Minor: Consistency & Cleanup**
- Added `**Version:**` headers to `prompting-method.md` and `cursor-rules.md`
- Fixed stale `v303.a` and `MODE` references in `cursor-rules.md`
- All 12 METHOD files now carry consistent version headers
- *(Note: previously mislabeled `306.c`; corrected in 308.a — it predates 305.a.)*

**304.a** (2026-03-11) — **Major: Data Governance + AI Agent Management + Automation**
- **NEW:** Data Structure Governance — `SCHEMA-TEMPLATE.md` (schema registry with collections, fields, relationships, migration log, Zod spec); `method-core.md` adds 5 governance rules (docs-first, Zod required, no untyped writes, migration protocol, schema review)
- **NEW:** DoD extended from 8 → 15 items: +Zod schemas, +SCHEMA.md updates, +empty states, +error states, +loading states, +pushed to GitHub
- **NEW:** `REVIEW-TEMPLATE.md` now includes Data & Schema checklist for Vera
- **NEW:** `STRUCTURE-TEMPLATE.md` now includes Data Model quick reference section
- **NEW:** Antigravity Workflow Automation — 3 workflow files created (`_agents/workflows/sprint-plan.md`, `sprint-close.md`, `task-start.md`) for METHOD rituals triggered by slash commands
- **NEW:** AI Agent Management overhaul in `ai-infra-method.md` — Gemini-first task-type routing (8 task types: fast-text, fast-vision, emotion, copy-review, logic, design, embedding, batch), Mistral adapter, Vertex AI integration, A2A pipeline pattern, AI-native app design guidelines, vectorization strategy
- Fixed stale `FULL Mode` label in `agents-method.md`
- Removed obsolete Next Steps from `ai-infra-method.md`
- Updated pricing table with Mistral models
- Updated `agents-project.json` to use task-type routing

**303.f** (2026-03-11) — **Minor: MODE Cleanup + Firebase + Visual Testing**
- **BREAKING:** Removed FAST/FORTH and all remaining Orchestration Mode references (Single-LLM, Multi-Agent, Hybrid, SplitOS) from active documentation across all METHOD files
- Renamed "Agent Interaction Patterns" section → Mono-Conversation pattern only (`agents-method.md`)
- Updated Riley's role description and responsibilities to remove SplitOS; now references ADK/MCP (`agents-method.md`)
- Removed Core Innovations items 5 (Three Orchestration Modes) and 8 (SplitOS Readiness); renumbered to 12 items (`METHOD.md`, `README.md`)
- **NEW:** `Firebase Deployment Readiness` checklist section added (`method-core.md`) — env, rules, build, hosting, staging → prod flow
- **NEW:** Git Sync Cadence made explicit — commit + push required after every `[x]` task, not only at sprint end (`method-core.md`)
- **NEW:** Visual Snapshot Testing section — Antigravity browser tool captures screenshots at sprint end, saved to `docs/sprints/{sprint}/screenshots/` (`tests-method.md`)
- Junia Consolidation ritual updated: added step 7 (Visual Snapshot), step 8 (Firebase deploy), renumbered to 10 steps (`sprints-method.md`)
- **design-method.md:** Added Reference Models table (MD3, Google Play Store, Apple HIG with URLs); added Logo & Brand Identity section (gradient inline icon/favicon, mono variant, favicon sizes); dark mode marked **required**; removed Next Steps
- Epoch 4 label updated: "Advanced Orchestration" (was "SplitOS native") (`versioning.md`)

**303.e** (2026-03-08) — **Minor: Riley Reorientation + CUJ-First Motion**
- Reoriented Riley from No-code Automation → API & Multi-Agent Architecture
- Added CUJ-First Motion / Precision Gate ritual (April, Junia) to `sprints-method.md`
- Added CUJ-TEMPLATE.md updates and Sprint Launch Prompt requirement

**303.d** (2026-03-05) — **Minor: Core Innovations + i18n**
- Added Commit & Sync per Task rule to Core Innovations
- Added Sprint Folder Status tagging convention
- Hardened i18n requirements (EN/FR baseline for all apps)

**303.c** (2026-03-01) — **Minor: Navigation Behaviour Characterization**
- Added **Mutual Exclusivity Rule** (State A: Expanded Drawer ↔ State B: Collapsed Rail + Panel) to `design-method.md` and `NAVIGATION-TEMPLATE.md`
- Added **Content-push layout** rule: nav never overlays page content on desktop (no z-index layering)
- Added **Transition choreography** documentation (concurrent drawer shrink + panel slide, 200ms)
- Updated rail item click behavior to explain visual consequence of `route` vs `panel` types
- Added **Restore-on-close** behavior preference field to `NAVIGATION-TEMPLATE.md`
- Expanded **Mobile Navigation** spec: icon-only bottom nav style, full-screen search takeover, gesture nav, center FAB slot, 5-item option
- Updated ASCII visual specs in `design-method.md` to show both State A and State B diagrams

**303.b** (2026-02-12) — **Minor: Sprint Launch Prompts**
- Added Sprint Launch Prompt requirement to `METHOD.md` and `sprints-method.md`

**303.a** (2026-01-31) — **Major version: Design Baselines + Navigation Spec**
- Added **Swanifly Design Philosophy** (minimalism, efficiency, empowerment, clear structure) to `design-method.md`
- Expanded **Navigation Patterns** to formalize the canonical “mono-rail + secondary panels” + sales/guest header variant + mobile matrix
- Added `templates/NAVIGATION-TEMPLATE.md` for app-level navigation maps in `project/DESIGN.md`

**302.a** (2026-01-28) — **Major version: Governance & Simplification**
- **BREAKING:** Removed FAST/FORTH/FULL modes entirely → single standard DoD
- Added Hierarchy of Truth: METHOD > VISION > PLAN > TASK > CODE
- Added Document States: [LIVING] and [FROZEN]
- Restructured agent roster: Core Loop (4) vs On-Demand (9)
- Added Human Executive (Agent 0) clarification
- Added Pre-Flight checklist, Vera Fast-Track, Kill Gate rituals
- Created project/STATE.md as single source of truth
- Cleaned up unused templates (4) and scripts (5)

**301.b** (2026-01-28)
- Multitenancy-by-default baseline (Teams as tenants) documented in `method-core.md`
- Tenant-aware examples across METHOD (routing, sprints, review template, AI infra MCP example)
- `app-settings.json` updated with `multitenant` + `tenantNoun` defaults

**301.a** (2026-01-24)
- Added `project/STRUCTURE.md` as a first-class planning surface (routing + agent info surfaces)
- Added `templates/STRUCTURE-TEMPLATE.md`
- Added Double Drawer navigation pattern in `design-method.md`

**300.d** (2026-01-07)
- Added Review Gate (Vera high-model Analyzer) and `[v]` validation workflow
- Added `templates/REVIEW-TEMPLATE.md` for task + sprint reviews
- Expanded cohort to 13 agents (added Vera)

**300.b** (2025-11-30)
- Corrected agent roles to match v207.j historical definitions
- 12 agents: 4 Managers, 2 Developers, 6 Experts
- Gordon = Marketing & Growth (not QA)
- Teddy = Mobile Development (restored)
- Aiko = AI Integration (not Mobile)
- Sage = Test Architect (not Architect)
- Riley = No-code Automation (not AI Engineer)
- Kasper = Security (added)

**300.a** (2025-11-15)
- Initial modular METHOD release
- 10 focused files
- Multi-entry routing
- Global agent cohort (10 agents)
- Bug tracking loop
- SplitOS readiness

**207.j** (2025-11-10)
- Last monolithic METHOD

---

**Owner:** Lucia  
**Last Updated:** 2026-08-01

