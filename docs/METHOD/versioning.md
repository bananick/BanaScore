# METHOD Versioning & Sync Protocol

**Owner:** Lucia  
**Version:** 325.a  
**Last Updated:** 2026-10-18  
**Purpose:** Version scheme, sync protocol, migration policy

---

## Version Scheme

**Format:** `MAJOR.LETTER`

- **MAJOR**: Epoch or significant release (300, 301, 400...)
- **LETTER**: Minor revision (a, b, c...)

**Current:** 325.a (Epoch 3: Modular & Multi-Entry)

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

> **Only the newest 5 releases are kept here.** 58 older entries (`323.a` → `207.j`) were moved verbatim to `docs/archive/METHOD/versioning-history.md` (57 at 324.c, `323.a` at 325.a) (hub only — `docs/archive/` is not synced to apps) — grep it when you need an old release; it is not an entry file. A new release is written at the top of this section; when the section then holds more than 5 entries, move the oldest to the top of the archive.

**325.a** (2026-10-18) — **Major: `/clean` and `/project` join the rituals (9 → 11); a session that waits on the operator is pinned while it waits**

- **Problem.** (operator, quiz 2026-10-18; written, not re-litigated) (1) "Pinned = supervisors only" (322.h) left a question hidden: a session waiting for the operator's answer sat unpinned among sessions whose titles he does not read. (2) Two procedures were retyped by hand each time: Régine's on-demand pass, and the opening of a chantier (refuse if nested, Cadrage, partition map, sidebar group, one task chip per slice).
- **CHANGED — "Sidebar contract" rule 1** (`sprints-method.md`): supervisors are always pinned; any other session is pinned **while it waits for the operator's answer**, with ` · 🟡` at the end of its title. For every session, chantier or not: right before an `AskUserQuestion` it will block on it appends ` · 🟡` to its own title (`set_session_title` self, re-read `ListAgents` after if it is a chantier member) and pins itself (`set_pinned` self true); right after the answer it removes the 🟡 and unpins itself — never a supervisor. Rule 6 (Régine): she pins non-supervisor sessions whose title ends with `· 🟡` and unpins those whose title no longer has it. **🟡 wins over the clocks** (coordinator, from the session that owns Régine): a title ending with `· 🟡` is never 💤 and never archived by the 72 h clock — a pending question would be lost; reported when waiting > 48 h. Rule 7 and the hook table name the hook's new sentence. `agents-method.md` (Régine's responsibilities and clocks line) aligned.
- **CHANGED — Régine, the smallest edit** (`.claude/agents/regine.md`, last touched by `7368556`; owned by the hub session « 🦢 Audit sessions et worktrees », which allowed the edit): "Each pass" step 2 (pinned = supervisors + sessions waiting on Nicolas), one new first row in the clocks table (`title ends with · 🟡` → never 💤, never archive; report if waiting > 48 h), `🟡 > 48 h` in the scheduled report's list of what waits on Nicolas, `/clean` in her hand-off line. Nothing else in the file moved. The scheduled task prompt lives outside the repo and is the coordinator's to update.
- **CHANGED — `session-sidebar.mjs` (hub hook + addon payload copy, byte-identical).** The injected instruction (French) gains one sentence for every session — « Toute session : avant une AskUserQuestion bloquante, ajoute ` · 🟡` à ton titre et épingle-toi (`mcp__ccd_sidebar__set_pinned` self true) ; après la réponse, retire-le et désépingle-toi (jamais un superviseur) » — placed after the title-and-file step, whose clause now reads « Sinon ignore ce rangement » so the pin rule also reaches supervisors and sub-sessions. Still ≤ 900 chars (asserted for every icon of `repo-icons.json`). `tests/session-sidebar.test.mjs` gains the 325.a test.
- **NEW — `/clean`** (`.claude/commands/clean.md` + payload copy). Runs Régine on demand **as a sub-agent** (`Agent`, `subagent_type: "regine"`, `model: "sonnet"`) so the caller's context stays small: rescue before archive, the sidebar contract incl. pin-while-waiting, clocks, WIP limits, `fleet-clean --apply --caches-only` with a protect file built from `list_sessions`, the weekly table on Mondays or when asked. The coordinator relays her `Done / State / Next` in ≤ 10 lines; what she flags for the operator becomes one `AskUserQuestion` batch (≤ 4, recommended first). Never a Debrief card from Régine.
- **NEW — `/project`** (`.claude/commands/project.md` + payload copy). Opens a chantier by the contract: (a) refuses when the session is nested (`get_session self` → `parentSessionId` and `detached: false`); (b) Cadrage in one `AskUserQuestion` (journey, proof, out-of-scope, slices with agent and plan-first); (c) `docs/chantiers/{chantier}/README.md`; (d) the sidebar group `{app} · {chantier}` (`create_section`, `set_view` `group_by: "none"` / `sort_by: "alpha"`), itself moved in, titled `🧑‍✈️ {repo icon} {chantier}` and pinned last (a move un-pins); (e) one task chip per slice (`spawn_task`) carrying the v2 sub-session brief; (f) the supervisor loop. It points to `sprints-method.md` and restates nothing.
- **Counts.** Rituals 9 → 11 in `CLAUDE.md` (Rituals line, Skills Workflows rows) and its payload copy, `snippets/agent-cohort.md`, `.claude/agents/README.md`, `METHOD.md` ×2, `README.md`, `routing-method.md` ("By Slash-Command" table + count). `AGENTS.md` and its payload copy carry no ritual count: version string only.
- **No installer change.** `install.mjs` copies every file of `payload/commands/` (its `readdirSync` loop over the commands folder), so both commands reach every app through the existing path; `.claude/settings.json` and `settings.snippet.json` are untouched (no new hook wiring).
- **Why Major.** "New slash-command ritual added to `.claude/commands/`" (`versioning.md` → "When to Increment"), twice: `324.c → 325.a`. Not on the landing exception list (no schema, rules, auth, dependency or deploy change; `SOUL.md` untouched).
- **Known consequence — to rule on.** A chantier sub-session's title already ends with `· 🟡` when its fiche is `waiting` ("Titles"); by the letter of rule 1 and of Régine's step 2 it is pinned for as long as the 🟡 stays, out of its group's order. Not changed here: the operator's ruling covers "every session, chantier or not"; if pinned sub-sessions crowd the top, restrict the pin to non-members in Régine's step 2.
- **Sync effect.** Hub-owned surfaces only: two **new command files** in every app (`.claude/commands/clean.md`, `project.md`), the refreshed payload `hooks/session-sidebar.mjs` and `.claude/agents/regine.md`, `docs/METHOD/**`, the version string and the Rituals line in `CLAUDE.md` / `AGENTS.md` and their payload copies. No app-owned file is overwritten. **Behaviour change in every app:** a new session pins itself with ` · 🟡` while it waits on the operator. Gate before any sync (Sync Protocol rule 4): `npm run doctor` green, `npm run doctor:fleet` with no blocking finding, then `sync-method:all:dry` and its clobber report to the operator — never `--force`. Not landed, not synced.
- **Where it was authored.** In the hub, on `claude/supervision-mode-workflow-5af304`, on top of its unlanded commit `18a55f2b` (fleet-clean caches-only; chantier archive check 1 verifies the whole branch), merged with `origin/main` at 324.c (`0030faca` + `21c5e120`; 324.b and 324.c came in with that merge, so this release numbers after 324.c, not 324.b). `docs/interventions/2026-10-18-Lucia-clean-project-commands.md`; IMP-014 note in `docs/improvement/ACTIONS.md`.
- **Proof.** LANDED = `npm run doctor` green + `npm run test:gate` green + `/land`. PROVEN = on the live sidebar: a hand-made session about to ask the operator a blocking question carries ` · 🟡` and is pinned, and is neither pinned nor 🟡 once he has answered; a Régine pass pins a session whose title ends with `· 🟡` and leaves a 🟡 session unarchived past 72 h; `/clean` hands back her table in ≤ 10 lines without a Debrief; `/project` from a nested session refuses, and from a fresh one produces the README, the group, the pinned supervisor title and one chip per slice. Not run yet.

**324.c** (2026-10-18) — **Minor: context diet, slice 1 — `versioning.md` sheds its 57 oldest releases, 10 agents' `Entry files:` name sections instead of whole files, `CLAUDE.md` gets a size budget (warning)**

- **Problem.** Study 2026-10-18, stream D (`docs/improvement/study-2026-10-18/D-context-economy.md`): a sub-agent re-pays the shared root plus the *whole* METHOD files its `Entry files:` line names. Median launch 102.7 kB, Lucia 285.2 kB — of which `versioning.md` (96 % changelog, read by no one else) was 180.7 kB. Bytes here are LF-normalised (the study's were taken on CRLF copies, +1 B per line).
- **CHANGED — `versioning.md`.** "Version History" keeps the newest 5 releases; 57 older entries (`322.h` → `207.j`) moved **verbatim** to `docs/archive/METHOD/versioning-history.md` — outside `docs/METHOD/`, so not synced and not an entry file; the rotation rule is in the pointer paragraph. 180.7 → 29.5 kB; the operative sections are identical except the three version / date stamp lines.
- **CHANGED — `Entry files:` of 10 agents** now name `file → "§ Section"` and state a cap (`read ≤ 12 kB of reference`): `lucia`, `junia`, `vera`, `oscar`, `regine`, `gordon`, `kasper`, `brian`, `watson` by section, and `iris` (whole `method-core-lite.md`, 6 kB, plus the cap); `nova`'s identity line only (VISION). `sage`, `penny` and `nova`'s entry line are deliberately unchanged — their picks conflict with the cap or with each other (`### Needs decision` in the intervention). `project/VISION.md` and `STRUCTURE.md` are app-level files (present in the apps, absent from the hub): their pointers became "where the app has one", not deletions. `routing-method.md` → Entry Point Matrix: a note that the agent file's line is the canonical one.
- **NEW — `npm run doctor` E16.** `CLAUDE.md` over 8,192 B (LF-normalised) is a **warning**; slice 2 flips it to an error once the file is cut. Covered by `tests/method-doctor.test.mjs` (warn · clean · CRLF).
- **Free wins.** `GEMINI.md` 5,110 → 188 B (redirect stub). The tracked `docs/METHOD/tools/banaguard/banaguard.log` (1,064,547 B, a runtime log untouched since April) was held back here by the landing gate's `scale` rule (12,776 deleted lines) and untracked + gitignored meanwhile by hub cleanup II (`docs/interventions/2026-10-18-Watson-hub-cleanup.md`), not by this release.
- **Why a letter.** Read against "When to Increment": no new METHOD file (the archive sits outside `docs/METHOD/`), agent, ritual or hook; DoD unchanged; installer and sync behaviour unchanged — the edited agent files and `docs/METHOD/**` ride the existing sync. "Significant process change" was weighed and not retained: no rule changed, only where an agent is told to look. The version token in `CLAUDE.md` / `AGENTS.md` and their payload copies is the only byte changed in them (slice 2 owns the rest). Not on the landing exception list (`SOUL.md` untouched; no schema, auth, dependency or deploy change). `324.b → 324.c`.
- **Sync effect.** Hub-owned surfaces only: 11 agent files, `docs/METHOD/**` (`versioning.md` is 29.5 kB in every app instead of 180.7), the version string. Nothing app-owned. Gate before any sync (rule 4): `npm run doctor` green, `npm run doctor:fleet` with no blocking finding, then `sync-method:all:dry` and its clobber report — never `--force`. Not synced.
- **Proof.** LANDED = `npm run doctor` green + `npm run test:gate` green + `/land`. PROVEN = the intervention's table — startup bytes before/after for the 13 agents, and one real task per tier (lucia T1 · brian T2 · watson on haiku T3) — the first T2 run found two `method-core.md` sections the thinnest pick had dropped (§ i18n Baseline, § Security Baseline); restored on `brian`'s line, the retry passed; T1 and T3 lost nothing (`docs/interventions/2026-10-18-Lucia-context-diet-slice1.md`). Median launch 102.7 → 61.5 kB, Lucia 285.2 → 54.0 kB.

**324.b** (2026-10-17) — **Minor: the verify gate verifies a no-deps root with Node alone; BanaLog leaves `SKIP_REPOS`**

- **Problem (1) — a docs + tests repo could not land.** BanaLog PR #108 (2026-10-17, chantier « suivi ») changed only `tests/chantier-fiches.test.mjs`. The repo root has no `node_modules`, no `test` or `typecheck`, and `build` = `cd frontend && npm run build` (needs an install). `verify-gate.mjs` skipped `build` as `toolchain-absent`, then its floor ("no verifying check could actually run") returned `blocked`; the operator merged the PR after replaying `node --test` by hand. A file Node can verify on its own was held because the npm scripts could not run.
- **FIXED — `verify-gate.mjs` (hub hook + addon payload copy, identical modulo line endings, `npm run doctor` E5).** A **no-deps lane** before the floor, for an app root with no `node_modules` where no npm script verified anything and every changed app file is plain Node JS (`*.mjs`/`*.cjs`/`*.js`). Each changed JS file is classified by its **content**, not its name (comments stripped): a real `import`/`require` of `node:test` makes it a Node test; an import of `vitest`, `@jest/globals`, `jest`, `mocha`, `ava` or `tap`, or a test-looking path or name (`test/`, `tests/`, `__tests__/`, `*.test.*`, `*.spec.*`, `*_test.*`) without `node:test`, means another runner → the floor, `blocked`, its reason naming the file. The gate runs `node --check` on every changed JS (`check: 'node-check (no-deps)'`) as an **extra** check — red on a syntax error, **never verifying on its own** — then `node --test` on every `node:test` file found (`check: 'node-test (no-deps)'`), the only check that verifies. A JS diff with no `node:test` file stays `blocked` ("no-deps: N JS file(s) changed but no node:test file in the diff — install deps or add a zero-install test"): a change to `lib/a.mjs` can break an unchanged `tests/a.test.mjs`. When `node --test` ran, every npm script that could not run — `build` included — is recorded `skipped: 'no-deps'` (`ok: null`, never a pass), the marker gains `noDeps: [roots]`, and the report prints `⚠ NO-DEPS <root>: ran node --test on N file(s), node --check on M file(s); skipped npm scripts: …`. A non-Node file (ts/tsx/jsx/vue…) keeps the floor, unchanged. A no-deps root is not heavy (no gate lock), as before. Amended from the proposal: `node --check` covers every changed JS (a helper no test imports is still parsed); Vera's review (round 2) moved test detection from the file name to the content (`test/foo.mjs`, `tests/foo_test.mjs` and a vitest `tests/x.spec.mjs` all passed on the name rule) and took `node --check` out of the verifying set.
- **CHANGED (2) — `scripts/lib/fleet-skip.mjs`.** `BanaLog` leaves `SKIP_REPOS` (`['Swanifly', 'Bana-Share', 'BanaLazer', 'DeezLoad']`). It sat there with BanaLazer for a diverged history; it was reconciled by hand and runs METHOD 323.a (three slices landed 2026-10-17, journey suivi-swanifly PROVEN), so the hub fix above reaches it through the sync instead of living in the app. BanaLazer stays. `tests/fleet-guards.test.mjs` and `tests/fleet-doctor.test.mjs` use BanaLazer / DeezLoad as their skipped examples and assert BanaLog syncs. `method-core.md` → "What the gate actually runs": one sentence on the no-deps lane.
- **Tests.** New `tests/verify-gate.no-deps.test.mjs`: (a) BanaLog's shape, a passing `node:test` file → `green`, `node-test (no-deps)` ok, `build` `skipped: 'no-deps'`, `noDeps: ['.']` in the marker, and the `⚠ NO-DEPS` report line; (b) the same test failing → `red`; (c) a `.ts` beside it → `blocked`, no no-deps check, the floor names `src/thing.ts`; (d) a vitest file → `blocked`; (e) JS without a `node:test` file → `blocked` (`node --check` ran, did not verify), a syntax error → `red`; Vera's probes (f) a failing `node:test` `test/foo.mjs` → `red`, (g) a failing `tests/foo_test.mjs` → `red`, (h) a failing vitest `tests/x.spec.mjs` → `blocked`; (i) a helper with its test → `green`, a commented-out `node:test` import is not a test → `blocked`; `--plan` → not heavy.
- **Why a letter.** Read against "When to Increment": a bug fix in an existing hook, like 323.b and 320.d, numbered after 324.a (Régine) landed on `main` during the review — no new METHOD file, agent, ritual or hook wired in `.claude/settings.json`, no DoD change, the installer's copy list unchanged (the payload copy of an existing hook is refreshed). The clause "installer or sync behaviour that changes what lands in an app" was weighed for the `SKIP_REPOS` change and not retained, as in 322.f (IMP-012, six names off the list, a letter): the sync's behaviour and its hub-owned set are unchanged; a name returning to the fleet is roster data. Not on the landing exception list (no schema, rules, auth, dependency or deploy change; `SOUL.md` untouched). `324.a → 324.b`.
- **Sync effect.** Hub-owned surfaces only: payload `hooks/verify-gate.mjs` (refreshed in every app), `docs/METHOD/**` (`method-core.md`, the stamps), the version string in `CLAUDE.md` / `AGENTS.md` and their payload copies. **Behaviour change in every app:** a toolchain-less root whose diff is plain Node JS is verified by Node instead of held `blocked`. **BanaLog becomes a sync target**: `npm run sync-method:all:dry -- --root=C:/Apps --only=BanaLog --allow-unlanded` (2026-10-17, played with the 323.c stamps, before the renumber to 324.b) lists it as the one target — 131 same · 8 known-hub-version · 1 new · **0 CLOBBER**, `SOUL.md` kept (app-owned identity), `app-settings.json` methodVersion 323.a → 324.b (the run printed `323.a → 323.c`; only the number changed since), `verify-gate.mjs` refreshed — 10 items would change. Gate before any sync (Sync Protocol rule 4): `npm run doctor` green, `npm run doctor:fleet` with no blocking finding, then `sync-method:all:dry` and its clobber report to the operator — never `--force`.
- **Where it was authored.** In the hub, on `claude/bold-gates-e35718` (cut from `9e4d2d7f`, authored as 323.c, merged with `origin/main` at 324.a in `fc5c02a5` and renumbered 324.b); the trigger repo, BanaLog, receives it through the sync. `docs/interventions/2026-10-17-Lucia-gate-no-deps-sync-banalog.md`; IMP-016 and IMP-017 in `docs/improvement/ACTIONS.md`. Not landed, not synced.
- **Proof.** LANDED = `npm run doctor` green + `npm run test:gate` green + `/land`. PROVEN = after the sync, BanaLog's next tests-only branch lands through `/land` with `⚠ NO-DEPS .` in the report and no hand-run `node --test`. Not run yet.

**324.a** (2026-10-17) — **Régine 🧑‍🔧 — Régie joins the cohort (13 active mandates + 3 dormant): session, worktree and work-in-progress hygiene; she owns the sidebar pass**

- **Problem.** The 2026-10-17 audit (`docs/interventions/2026-10-17-Junia-hygiene-sessions.md`, inputs in commit `b5e9d23d`) counted 66 non-archived Code sessions, 11 duplicate passes of the janitor `rangement-barre-laterale` left open (it found its own runs by title), 11 free sessions idle > 72 h (8 titled `⚠️ non commité/poussé/atterri`), 164 worktrees across 24 repos (80 dirty, 24 unlanded) and 35.4 GB held by app-made worktrees. 322.h gave the sidebar to an anonymous scheduled task with no mandate, no clocks and no rule for unsaved work; nobody owned the pile.
- **NEW — agent `regine`** (`.claude/agents/regine.md`, sonnet; Desktop stub `.claude/skills/regine/SKILL.md`). One outcome: the Code tab shows only the work really in progress. Mandate: routines close their previous runs via `list_task_runs` (never the title); the sidebar contract; the clocks — PR merged → archive · `✅` idle > 2 h → rescue, archive · idle > 24 h → `· 💤` · idle > 72 h → rescue, archive · open PR / pinned / running / parent → never; **rescue before archive** (`wip(rescue) … [wip]` pushed on the session's own branch, never forced; a refused push means no archive); WIP limits flagged, never forced; a weekly storage / branch / stash table. Archive, never delete; never `main`, never product code.
- **CHANGED — doctrine.** `sprints-method.md` → "The chantier", rule 6: Régine owns the sidebar pass and replaces the anonymous janitor; the scheduled task runs as her, has no shell, so it lists rescue-needing sessions « à sauver » instead of archiving them, and reports « à détacher » once a day (08:07). Rule 7 names her pass as the safety net. Cohort enumerations: `CLAUDE.md` (Agent Cohort table, count, fan-out line, Model Routing defaults) and its payload copy + `snippets/agent-cohort.md` + `snippets/model-routing.md`; `AGENTS.md` + payload copy; `agents-method.md` (roster, fan-out, section 13, routing tree); `routing-method.md` (cohort table, T2 list); `METHOD.md` + `README.md` (entry table, cohort tables, counts, What's New); `.claude/agents/README.md`; `.claude/skills/README.md`; addon `README.md`; `chantier-status.mjs` `AGENTS` (hub + payload, byte-identical) so a fiche may name `regine` as owner.
- **Why Major.** "New agent in cohort" and "New native sub-agent added to `.claude/agents/`" (`versioning.md` → "When to Increment"): `323.b → 324.a`. Not on the landing exception list (no schema, rules, auth, dependency or deploy change; `SOUL.md` untouched). Ratified by the operator in chat on 2026-10-17 (« publication complète oui »), relayed by the coordinator.
- **Sync effect.** Hub-owned surfaces only: a **new agent file** `.claude/agents/regine.md` and a **new skill stub** in every app, `docs/METHOD/**`, the payload `hooks/lib/chantier-status.mjs`, the merged `CLAUDE.md` sections (Agent Cohort, Model Routing) and `AGENTS.md`. No app-owned file is overwritten. The scheduled task prompt lives in the operator's `~/.claude/scheduled-tasks/`, outside the sync, and is updated by hand in the same release. Gate before any sync (Sync Protocol rule 4): `npm run doctor` green, `npm run doctor:fleet` with no blocking finding, then `sync-method:all:dry` and its clobber report — never `--force`.
- **Proof.** LANDED = `npm run doctor` green + `npm run test:gate` green + `/land`. PROVEN = the intervention's Proof: after one Régine pass, `list_sessions` (non-archived) ≤ 25, 0 duplicate routine passes, 0 session idle > 72 h without a named reason, 0 worktree held by a session inactive > 30 days. Not run yet.

**323.b** (2026-10-17) — **Minor: the verify gate files study data (`*.csv`, `*.tsv`, `*.geojson`, an unowned nested `.json`) in the doc lane**

- **Problem.** versation's `Cabasse-GFV/` study dossier (commit `5ffa7e8`, PR bananick/versation#21, 2026-10-17) was held by `land.mjs`: `verify-gate.mjs` matched none of its 14 data files — 10 `.csv`, 1 `.geojson`, 4 nested `.json` under no app root — and filed them under "unclassifiable paths (fail closed)". A study with no code could not land, and a local patch in the app would not last: `install.mjs` writes `.claude/hooks/` in overwrite mode, so the next sync would revert it. The fix had to come upstream.
- **FIXED — `verify-gate.mjs` (hub hook + addon payload copy, byte-identical, `npm run doctor` E5; commit `06f1cb29`).** (1) `DOC` gains `/.(csv|tsv|geojson)$/i`, depth-agnostic like the rest of the list. (2) A new `STUDY_JSON` check in `classify()` files a `.json` as doc only **after** `TOOLING` and **after** the app-root lookup, so root-level json, `scripts/`, `.claude/`, `firebase.json` and every app's json — the `src/messages/*.json` i18n catalogues first — keep their lane and their checks. Two cases stay "unclassifiable (fail closed)" on purpose: `firestore.indexes.json` (deploy config, see `RULES`) and any `.json` under a `src/` folder no app owns.
- **CHANGED — doctrine.** `method-core.md` → "What the gate actually runs": one sentence naming the study-data rule. The version string in `CLAUDE.md` / `AGENTS.md` and their payload copies.
- **Tests.** `tests/verify-gate.lanes.test.mjs` gains **j1** (the Cabasse-GFV layout — a repo-root `package.json` that verifies nothing, a study folder of csv / tsv / geojson / nested json — is `docs-only`, 5 doc, 0 unknown, green; red on the old gate) and **j2** (narrowness guard: an app's json keeps the app lane and the app's failing test stays the verdict; json under an orphan `src/` and an unknown type such as `.kmz` stay unclassifiable, verdict `blocked`).
- **Why a letter.** A bug fix in an existing hook, like 317.c (`.codex/` into tooling) and 320.d (deleted paths): no new METHOD file, agent, ritual or hook wired in `.claude/settings.json`, no DoD change, and the installer's copy list is unchanged — the payload copy of an existing hook is refreshed (`versioning.md` → "When to Increment"). Not on the landing exception list (no schema, rules, auth, dependency or deploy change; `SOUL.md` untouched). `323.a → 323.b`.
- **Sync effect.** Hub-owned surfaces only: payload `hooks/verify-gate.mjs` (refreshed in every app), `docs/METHOD/**` (`method-core.md`, the stamps), the version string in `CLAUDE.md` / `AGENTS.md` and their payload copies. No app-owned file is touched. **Behaviour change in every app:** a diff of study data lands through the doc lane instead of being held at `/land`. Gate before any sync (Sync Protocol rule 4): `npm run doctor` green, `npm run doctor:fleet` with no blocking finding, then `sync-method:all:dry` and its clobber report to the operator — never `--force`.
- **Where it was authored.** In the hub, on `claude/gate-study-data-lane` (cut from `c0d1c14f`); the trigger repo, versation, receives it through the sync. Not landed, not synced.
- **Proof.** LANDED = `npm run doctor` green + `npm run test:gate` green + `/land`. PROVEN = after the sync to versation, `/land` on PR #21's branch (`5ffa7e8`) files the 14 data files in the doc lane and lands the dossier. Not run yet.

---

**Owner:** Lucia  
**Last Updated:** 2026-10-14  

