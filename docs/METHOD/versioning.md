# METHOD Versioning & Sync Protocol

**Owner:** Lucia  
**Version:** 336.b  
**Last Updated:** 2026-10-29  
**Purpose:** Version scheme, sync protocol, migration policy

---

## Version Scheme

**Format:** `MAJOR.LETTER`

- **MAJOR**: Epoch or significant release (300, 301, 400...)
- **LETTER**: Minor revision (a, b, c...)

**Current:** 336.b (Epoch 3: Modular & Multi-Entry)

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

### Renumber on collision (325.c — written after it bit twice in one day)

A release authored in a worktree can have its number taken by another session that lands first. It
happened twice to the same slice on 2026-10-18: the context diet's slice 2 was authored as **324.d**,
found **325.a** on the trunk at its first `/land` and became **325.b**; then, while it was in review,
the trunk landed a **325.b** of its own and it became **325.c**.

- **Before you pick a number**, read the trunk, not your branch:
  `git show origin/<default>:docs/METHOD/METHOD.md | head -1`.
- **On a collision at `/land`**, take the next free letter **after** the trunk's current version, and
  move your entry above it: the Version History is newest-first, and a release that shipped first is
  older whatever its number. Keep the increment class you had justified — a Minor stays Minor; the
  collision changes the letter, never the reasoning.
- **Say so in the entry.** The "Why a letter" bullet records what the release was authored as and what
  it became, so the gap in the sequence is explained and not read as a lost release.
- **Nothing mechanical catches this** — `doctor` E1/E2/E12 only check that the stamps agree with each
  other, so they are happily green on a number another release already used. A pre-`/land` check
  comparing the declared version with the trunk's is the obvious follow-up.

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

> **Only the newest 5 releases are kept here.** 80 older entries (`334.d` → `207.j`) were moved verbatim to `docs/archive/METHOD/versioning-history.md` (57 at 324.c, `323.a` at 325.a, `323.b` then `324.a` at 325.c, `324.b` at 326.a, `324.c` and `325.a` at 328.a, `325.b` at 329.a, `325.c` at 330.a, `326.a` at 330.b, `327.a` at 331.a, `328.a` at 332.a, `329.a` at 333.a, `330.a` at 333.b, `330.b` at 333.c, `331.a` at 334.a, `332.a` at 334.b, `333.a` at 334.c, `333.b` at 334.d, `333.c` at 334.e, `334.a` at 335.a, `334.b` at 335.b, `334.c` at 336.a, `334.d` at 336.b) (hub only — `docs/archive/` is not synced to apps) — grep it when you need an old release; it is not an entry file. A new release is written at the top of this section; when the section then holds more than 5 entries, move the oldest to the top of the archive.

**336.b** (2026-10-29) — **Minor: every agent has a character, a lesson and a wink — three new `## Identity` lines per agent, used at the occasion, in the conversation's language**

- **Problem.** The 18 agents had a voice and refusals but no character: two reports from two agents read the same, and a delegation taught the operator nothing beyond its result.
- **Decision (Nicolas, 2026-10-29, Cadrage quiz in chat: « make sure we're subtle, relevant and fun » · « mainly in conversation, with no strict places, at the occasion » · « same as the conversation going on, agents can even be inspired each by such or such French or international celebrity » · « they need to be teaching us and make us laugh subtly along the way »).** Design: `docs/interventions/2026-10-29-Lucia-agent-personality.md`.
- **CHANGED — all 18 `.claude/agents/*.md`**: `## Identity` gains **Character** · **I teach** · **My wink** after **I hand off to** (~500 B per agent, loaded only when that agent is launched).
- **NEW — `agents-method.md` → "How agents run" → "The character lines (336.b)"**: the rule — an inspiration, never an impersonation; one lesson, not a lecture; humour at the occasion, never at someone's expense, never softening a severity, never in customer-facing text (`lise`).
- **Not touched.** The `description:` frontmatter (the always-loaded surface), what any agent may do, the three dormant agents, `SOUL.md`.
- **Why Minor.** Agent prose only — no new file, agent, ritual or hook; no change of mandate or tools.
- **Sync effect (next sync).** The 18 hub-owned agent files, `docs/METHOD/**`, the version strings.
- **Rotation.** `334.d` moved verbatim to the top of `docs/archive/METHOD/versioning-history.md`.
- **Proof.** LANDED = `npm run doctor` green + `/land`. J+7 = the operator's read of the next real delegations — a lesson kept, a smile not paid for. No ratio is claimed.

**336.a** (2026-10-29) — **Major: finished work closes itself — a LANDED sub-session deletes its branch, reports its Fait / Suite up and archives itself; an exception PR is merged after kasper (opus) approves it, unless it is irreversible in production**

- **Problem.** The operator runs many sessions and never reviews PRs. A LANDED sub-session still waited for him to archive it, its branch stayed behind, and its closing never reached the parent's control tower. A PR held by the exception list sat open until he opened GitHub (journey `docs/project/journeys/nicolas-debloque-une-session-en-une-minute.md`).
- **Decision (Nicolas, 2026-10-29, in chat, through the coordinator).** Design: `docs/interventions/2026-10-29-Hugo-auto-close.md`. Kasper clears what he can judge. What is irreversible in production, and the `soul` / `hold` brakes, stay the operator's, as one quiz.
- **NEW — `method-core.md` → "Landing" → "Closing a finished sub-session (336.a)"**:
  - the done test: LANDED · nothing uncommitted · nothing unpushed · no open PR;
  - `npm run session:close -- --apply`: the branch is deleted through `branch-sweep` only (331.a);
  - Fait / Suite (335.a) is sent to the parent by `SendMessage`, then `archive_session self`, last.
- **NEW — "Exception PRs (336.a)"**: `kasper` on opus writes `.method/kasper/pr-<n>.json` `{verdict, summary, sha}`. `session:close -- --pr <n>` then squash-merges (`--match-head-commit`, gate green at the PR head; never `--admin`, never `--delete-branch`), or, for rules / indexes / migrations / secrets / `soul` / `hold`, prints one merge / close / defer quiz for the control tower.
- **CHANGED — the exception table** gains a "Cleared by" column: kasper for schema (not rules or indexes), security (not secrets) and infra; always the quiz for migration, `soul` and `hold`.
- **CHANGED — `.claude/agents/kasper.md`**: the automatic exception-PR review, its verdict file, never merges. **`.claude/agents/regine.md`**: the weekly `session:close -- --stale --days 3 --fleet`, one quiz per PR; self-archiving is the path, her sweep the fallback. `method-core-lite.md` → Git: one pointer; it also drops `deps` and `>60 files`, struck in 332.a.
- **Built alongside (`hugo`).** `.claude/hooks/session-close.mjs` (`--check` · `--apply` · `--pr <n>` · `--stale [--days N] [--fleet]`), the npm script `session:close`, and `land.mjs`'s next-step line.
- **Not touched.** `SOUL.md`, the exception classes themselves, `/deploy`. No fleet sync in this release: Bana-Share first.
- **Why Major.** A significant process change: a session archives itself, and a held PR can now merge without the operator. It also adds a new tool that the METHOD's landing path runs. `335.b → 336.a`. Trunk checked before numbering: `origin/main` at **335.b** (`1633ba0f`). It is not on the landing exception list (`SOUL.md` untouched).
- **Sync effect (next sync).** `docs/METHOD/**`, the hub-owned `kasper.md` and `regine.md` (neither carries an app-owned section), the hook payload, and the version strings.
- **Rotation.** `334.c` moved verbatim to the top of `docs/archive/METHOD/versioning-history.md`.
- **Proof.** LANDED = `npm run doctor` green + `node --test` for `session-close.mjs` + `/land`. PROVEN = one throwaway sub-session: its commit is on `origin/main`, its branch is gone locally and on `origin`, `list_sessions {include_archived: true}` shows it archived, and its Fait / Suite arrived in the parent.

**335.b** (2026-10-29) — **Minor: the operator lever — every answer serves the operator's decision speed; five delegates hand back closing-ready reports; the coach tip moves to Oscar's retro**

- **Problem.** 335.a fixed the shape of the closing. The coordinator still re-worked each delegate's report into it, by hunting for proof links, picking a fate and drafting the quiz. The 💡 coach tip that left the cards in 335.a had no home.
- **Decision (Nicolas, 2026-10-29, through the coordinator: « yes it seems good »).**
- **NEW — `method-core.md` → "The operator lever"**, next to the closing rules:
  - proof first;
  - choices prepared as a quiz;
  - a reversible in-scope step is done, not offered;
  - his replies are a measured signal: « donne moi le lien », « show me », a re-asked state or a typed confirmation each count as a miss, counted by IMP-029 at J+7.
- **CHANGED — `.claude/agents/{vera,sage,iris,regine,watson}.md`**: the Done / State / Next hand-back adds one proof link per point, a suggested fate (one of the six), and a ready quiz when a choice exists (≤ 4 options, recommendation first).
- **CHANGED — `.claude/agents/oscar.md`**: "One habit to change" is drawn from the operator's real misses (IMP-029 data). The coach tip lives there now.
- **Not touched.** `SOUL.md`, the cards' templates, the user-level `CLAUDE.md`.
- **Why Minor.** It refines 335.a's reporting rule the same day: no new file, agent, ritual or hook, no DoD change. `335.a → 335.b`. Trunk checked before numbering: `origin/main` at **335.a** (`df84907a`). It is not on the landing exception list.
- **Sync effect.** `docs/METHOD/**`, the six cohort agent files (hub-owned, none carries an app-owned section), the version strings.
- **Rotation.** `334.b` moved verbatim to the top of `docs/archive/METHOD/versioning-history.md`.
- **Proof.** LANDED = `npm run doctor` green + `/land`. PROVEN = the next delegated report from one of the five agents arrives closing-ready, and the J+7 miss counts (IMP-029).

**335.a** (2026-10-29) — **Major: every answer that did something ends with Fait / Suite — Suite bullet 1 is the session's fate (six fates, each with its « Prêt pour toi » kit), the title carries a state word, and the mission card shrinks to four parts**

- **Problem.** Iris's 2026-10-29 study (`docs/interventions/2026-10-29-Iris-ending-scenarios.md`, 30 sessions, 87 labelled endings) found three main causes of failed endings. **25/57** endings that Nicolas answered had failed: a question in prose (8/57), a state he had to re-ask for (6/57), a missing or unrunnable kit (6/57). **10/57** of his replies were typed confirmations. He runs many sessions at once and could not see in 2 s what to do with each one.
- **Decision (Nicolas, 2026-10-29, ratified through the coordinator: « c'est parfait ça !! »).** Proposal: `docs/interventions/2026-10-29-Lucia-answer-ending.md` + the rendered preview `docs/interventions/previews/2026-10-29-answer-ending-versions.html`, then Iris's additions.
- **CHANGED — `method-core.md` → "Closing by session type"** ("Shared by every closing", new bullets first):
  - **Fait / Suite**: 1–3 emoji bullets each, emoji chosen for its meaning, plain bold headings without emoji. Each Fait line carries one clickable proof.
  - **The fate is Suite's bullet 1**: 🗄️ Archive · 💬 Réponds · 🧪 Teste · 🔑 Agis · ⏳ Attends · 🔁 Continue ici. Each comes with a « Prêt pour toi » kit, and 🔑 has one kit per channel, closed by « C'est fait » / « Ça bloque » / « Fais-le avec moi ». A reversible step inside scope is done, not offered. Archive needs LANDED with nothing local. Attends names what runs, what wakes the agent, and what to do meanwhile.
  - **State word in every title**: CODÉ · ATTERRI · DÉPLOYÉ · PROUVÉ · en cours · bloqué. **🚨** leads the title on an incident.
  - The rest of the bullets:
    - a choice goes to the quiz, never prose;
    - commands are fenced as `bash`;
    - a readable-layout rule;
    - an inline `show_widget` card only with visual proofs or several actions.
- **NEW — "Choosing the fate".** Iris's 10-step decision algorithm, verbatim, including its final proof-and-lint step. Where it differs, the rules above win: `bash` fences, ≤ 9 lines.
- **CHANGED — the cards.**
  - **Mission card**: four parts, ≤ 9 rendered lines (was ≤ 8): title, 📸 proof, Fait, Suite. The ladder, 💡 tip and standing 🧠 / 🤝 bullets leave it.
  - **Debrief**: `🧠 À retenir` becomes **Fait**, `➡️ Suite` becomes **Suite**, fate first.
  - **Control tower**: ends with Fait / Suite before its quiz.
  - **Small answer**: two lines, no headings, replacing `✅ … · suite → …`.
- **CHANGED — the other copies.**
  - `method-core-lite.md` and the user-level `payload/user/CLAUDE.md` (French).
  - The Communication Contract bullet in `CLAUDE.md`, `AGENTS.md`, their payload copies and `payload/snippets/communication-contract.md`. Root `CLAUDE.md` is 13,309 / 13,312 B (E16).
- **NEW — `ACTIONS.md` → IMP-029**: a J+7 trial measured on Iris's baselines.
- **Not in this release.** The `closing-facts` script and the Stop-hook lint (Iris § 5). They are a separate `hugo` slice, trialled in Bana-Share first.
- **Why Major.** A significant change to the reporting process that every answer runs through, as 330.a was: `334.e → 335.a`. Trunk checked before numbering: `origin/main` at **334.e** (`d3ae0175`). It is not on the landing exception list (`SOUL.md` untouched).
- **Sync effect.** `docs/METHOD/**`, the merged Communication Contract section of each app's `CLAUDE.md` / `AGENTS.md`, the version strings. The user-level file reaches a machine only through `install.mjs --user`.
- **Rotation.** `334.a` moved verbatim to the top of `docs/archive/METHOD/versioning-history.md`.
- **Proof.** LANDED = `npm run doctor` green + `/land`. PROVEN = the next real session's closing observed in the new shape, and the J+7 numbers (IMP-029).

**334.e** (2026-10-28) — **Minor: jest and vitest lanes run serially with a 30 s per-test timeout — `verify-gate.mjs` appends `--runInBand` / `--no-file-parallelism` and `--testTimeout=30000` to a plain test script**

- **Problem.** BanaLog runs up to 6 Claude sessions' gates on one machine. HTTP authz specs in `backend/` (`directory.authz`, `control-room`, `brief-internal-routes.authz`, `breaks.authz`, `intake-link-throttle.spec`) each exceed jest's 5 s default under load — a different suite each pass — and each passes 12/12 alone. It held PR #128 for 4 passes and PR #135: a false red, not a defect. The frontend's vitest also died, twice, on `[vitest-pool-runner] Timeout waiting for worker to respond` (`prestaPrep.test.tsx`, then `membershipGate.test.tsx`) — even a land alone in the queue failed.
- **Decision (Nicolas, 2026-10-28, via the coordinator).** The gate runs jest tests serially and with a larger per-test timeout; the coordinator extended it to vitest lanes the same day (BanaLog `frontend/` runs vitest 4.0.16, which has `--no-file-parallelism`).
- **CHANGED — `.claude/hooks/verify-gate.mjs`** (+ payload copy, byte-identical). For the `test` check (`test:gate` or `test`), when the script is a plain `jest …` command (first word `jest` or `npx jest`; no `&&`, `||`, `;`, pipe, redirect or `$(`), the gate runs `npm run --silent <script> -- --runInBand --testTimeout=30000`, each flag only if the script does not already set it (worker count: `--runInBand`/`-i`/`--maxWorkers`/`-w`; timeout: `--testTimeout`). Likewise for `vitest` / `vitest run` (not watch, bench, related…) when the root's installed vitest (`node_modules/vitest/package.json`, own then hoisted) is ≥ 1: `--no-file-parallelism --testTimeout=30000`, unless the script already sets `--no-file-parallelism`/`--fileParallelism`/`--pool`/`--poolOptions`/`--maxWorkers`/`--no-threads`/`--singleThread`. The check records `runnerArgs` in the marker. Fail closed unchanged: a failing test is red; only the timeout is longer.
- **Not done, stated.** A vitest whose version cannot be read, or is older than 1, is left alone: the flag does not exist there and an unknown flag would be a false red. A composite script is left as written: npm would hand the flags to the last command. `--no-file-parallelism` removes the worker fan-out that timed out; it does not shorten a suite — a vitest lane is slower in wall-clock.
- **Tests.** `tests/verify-gate.runner-serial.test.mjs` (9 cases: jest — both flags added, script already sets them, only the missing one added, composite untouched, failing jest still red; vitest — flags added on 4.x, script already pins the pool, unresolvable or 0.x version left alone, watch untouched and failing vitest still red).
- **Why Minor.** A behaviour fix to the same hook as 334.c/334.d, same day — no new file, agent, ritual or hook wiring, no DoD change: `334.d → 334.e`. Trunk checked before numbering: `origin/main` at **334.d** (`46a2e75e`). Not on the landing exception list.
- **Sync effect.** As 334.d: payload `hooks/verify-gate.mjs`, `docs/METHOD/**`, the version strings. BanaLog is synced from a clean clone of its `origin/main` in the same session (operator ruling 2026-10-28), after the dry run.
- **Rotation.** `333.c` moved verbatim to the top of `docs/archive/METHOD/versioning-history.md`.
- **Proof.** LANDED = `npm run doctor` green + `npm run test:gate` green + `/land`. PROVEN = the next BanaLog `/land` with several gates running at once passes the backend test step with no timeout red, observed.

