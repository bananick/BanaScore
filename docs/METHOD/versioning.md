# METHOD Versioning & Sync Protocol

**Owner:** Lucia  
**Version:** 339.a  
**Last Updated:** 2026-11-04  
**Purpose:** Version scheme, sync protocol, migration policy

---

## Version Scheme

**Format:** `MAJOR.LETTER`

- **MAJOR**: Epoch or significant release (300, 301, 400...)
- **LETTER**: Minor revision (a, b, c...)

**Current:** 339.a (Epoch 3: Modular & Multi-Entry)

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

> **Only the newest 5 releases are kept here.** 88 older entries (`337.a` → `207.j`) were moved verbatim to `docs/archive/METHOD/versioning-history.md` (57 at 324.c, `323.a` at 325.a, `323.b` then `324.a` at 325.c, `324.b` at 326.a, `324.c` and `325.a` at 328.a, `325.b` at 329.a, `325.c` at 330.a, `326.a` at 330.b, `327.a` at 331.a, `328.a` at 332.a, `329.a` at 333.a, `330.a` at 333.b, `330.b` at 333.c, `331.a` at 334.a, `332.a` at 334.b, `333.a` at 334.c, `333.b` at 334.d, `333.c` at 334.e, `334.a` at 335.a, `334.b` at 335.b, `334.c` at 336.a, `334.d` at 336.b, `334.e` at 336.c, `335.a` at 336.d, `335.b` at 337.a, `336.a` at 337.b, `336.b` at 337.c, `336.c` at 337.d, `336.d` at 338.a, `337.a` at 339.a) (hub only — `docs/archive/` is not synced to apps) — grep it when you need an old release; it is not an entry file. A new release is written at the top of this section; when the section then holds more than 5 entries, move the oldest to the top of the archive.

**339.a** (2026-11-04) — **Major: Agathe 🎓 joins the cohort, 19 active mandates, on probation — `/hire`, an entrance exam on real closed cases, versioned learning with a two-speed gate, crew checks in the doctor (WARN only)**

- **Problem.** Hiring an agent had been done twice, by hand, and nobody tested one before trusting it. What agents learned stayed in per-machine memory: bananaevents' reshape found ~43 known pitfalls living only there, and a memory index over its 5 kB cap had no outlet. Teaching a hub cohort agent in place freezes it out of the sync: bananaevents' `brian`, `iris`, `junia`, `nova` and `watson` carry an owner section and have received nothing since 2026-09-28 / 10-06, 336.b's character lines included. The only crew doctor in the fleet has a hard-coded roster and is red on 4 of its checks.
- **Origin.** Proposal `Finasup@bb12b48:docs/improvement/2026-11-03-Lucia-recrutement-formation-agents.md`. Finasup's `justine` and `cleo` (`c91db63`) are the live reference, and their learning loop gives the two-speed gate.
- **Operator's ruling, 2026-11-04: a new mandate, over Lucia's recommendation to extend existing ones.** *"i feel this is going to be a main evolution of our method, this needs to B"*. By count, two hiring rounds in 36 days would not clear the agent bar; the ruling stands in for it, as it did for Oscar (320.a). At J+60 from the fleet sync Penny reports hires, exams, parkings and cost per finished hire, and 60 idle days make her a parking candidate under her own rule.
- **It goes against audit verdict D6 for this hire.** D6 of `docs/interventions/2026-11-02-Iris-method-audit.md` (*"Gel à 18"* until a 60-day per-agent count) was retained by relay and never released. The ruling is later and direct. **Operator's quiz, 2026-11-04: the freeze is lifted.** D6 is superseded: a new cohort agent passes the usual bar and his decision, with no prior count.
- **NEW — `.claude/agents/agathe.md`** (opus; description 233 B, +3 % on the always-loaded descriptions). Six jobs: spot, hire, onboard, examine, train, score & park. Never per Debrief, never per Recette. Her boundaries sit under `## One owner per job`, not `## Frontières`, which would make her app-owned.
- **NEW — `.claude/commands/hire.md`** + payload copy: the 13th ritual, run from the target app only. Evidence (H1, plus H2 or H3; H4 decides agent vs skill) → one quiz → resumed, one spawn → one dossier in one commit → exam → crew checks → `/land`. The hub's "Known domain owners" row comes at Lucia's next release, batched, as a Minor.
- **CHANGED — `agents-method.md`:** roster → 19 (On-Demand 13); "§ 19. Agathe"; in "Domain owners", "§ Hiring an owner", "§ The entrance exam", "§ Training", "§ Evaluation and parking", "§ Crew checks" and the hard-coded-roster lesson; "Known domain owners" + `justine`, `cleo`; a carnet is the second file split by section.
- **CHANGED — 18 cohort files:** one `Entry files` line each, reading `docs/project/carnets/{name}.md` → `## Règles`, `## Candidats`, if it exists, and carrying the `Appris:` rule (~300 B per launch of that agent, no always-loaded cost). `regine` has it inline, `vera`'s says the coordinator appends for her.
- **CHANGED — boundary lines in both files of all nine pairs:** `lucia`, `oscar`, `penny`, `hugo`, `vera`, `sage`, `junia`, `kasper`, `regine`, and `agathe.md`. `penny.md` also gains the per-agent measures and the J+60 report; `/retro` passes Oscar the `## Crew` line.
- **CHANGED — `method-core.md` → Recette item (5), and `method-core-lite.md` and `/land`, which are what a coordinator actually reads:** an `Appris:` line sends the coordinator to the gate, without spawning `agathe`. `docs/project/carnets/vera.md`, the hub's first carnet, holds the line her review of this release left.
- **CHANGED — listing surfaces:** `CLAUDE.md`, `AGENTS.md`, their payload copies and `snippets/agent-cohort.md` (row + three trims, since the root sat exactly on its 13,312 B budget: now 13,309 B); `.claude/agents/README.md`, `.claude/skills/README.md`, `routing-method.md` (matrix, T1), `METHOD.md`, `README.md` (which also lacked Stella's row since 333.a), `agents-engineering-method.md`, the addon `README.md` (whose command list had stopped at 9), `chantier-status.mjs`'s `AGENTS` (informational) and `scripts/ops/verify-cohort-overlaps.mjs` (S3 → 19, new O13).
- **NEW — crew checks (Hugo):** `scripts/lib/crew-checks.mjs` + `crew-stores.mjs`, doctor ids C0–C6 (WARN only, exit code unchanged), `npm run crew:report`, a never-blocking `crew` column in `doctor:fleet`. Read from the files, never a hard-coded roster; based on bananaevents' `crew-doctor.mjs`, which is neither copied nor edited. C4 reuses the sync's `APP_OWNED_AGENT`, now exported. Hub only: `scripts/` does not sync, so an app is checked with `--repo <path>` from a hub checkout. H1 stays `inconnu` in the report (no prompt text in the ledger, no operator-turn counter to reuse); Penny counts it from the transcripts. **Lucia's ruling on Hugo's open point:** a hub-named agent is a legal owner only when the roster names it with a complete four-section dossier, or `ownedAgents` lists it, so bananaevents' `gordon` is legal and its `watson` (named in the roster, `## Frontières` + `## Pièges (deploy)`) counts as frozen, as the proposal's §2.5 reads it.
- **Decided by Lucia at authoring, each fixing a disagreement inside the proposal** (`docs/interventions/2026-11-04-Lucia-agathe-recruit-train.md` → "Findings"): all nine pairs edited, not the six of §12; `## Candidats` read with `## Règles`; the `CLAUDE.md` pointer and the Codex mirror in her write scope, and `git commit` in her `Bash`; the coordinator runs the owner during an exam; the `Appris:` rule carried by the per-agent line.
- **Not touched.** The orchestration chain, `SOUL.md`, the sync engine's behaviour for apps, `docs/METHOD/chief-contract.md` (the roster's two new columns come last in the table and Chief reads only the slugs), and every app repo.
- **Limits, stated.** The exam is untried: its cost and whether it predicts real performance are `inconnu`. Its read-only is prompt-enforced, so an owner holding a provider tool keeps it during the run. The store it reads is seeded from the same interventions as the cases, so a pass can measure recall rather than judgement. H1 counts are keyword counts, not readings. A session can register only the agents of a main checkout that lags (`hugo` was refused in this session), so `agathe` may not be delegable by name until that checkout catches up; `/hire` carries the fallback. Real cost per hire: `inconnu` until Penny's first note.
- **Why Major.** A new agent in the cohort, a new native sub-agent, a new slash-command ritual and a doctor change (→ "When to Increment"). Not an Epoch: the orchestration chain does not change. **Authored as 338.a** in the proposal, with `origin/main` at 337.d; the trunk landed its own **338.a** (`75154829`) first, so this release became **339.a** (→ "Renumber on collision"). Trunk read before numbering: `origin/main` at **338.a** (`8b45ca2e`).
- **Sync effect.** The operator chose the whole fleet (quiz, 2026-11-04). Rule 4 sets aside the four GitHub repos `doctor:fleet` calls blocking (`BanaLog`, `gites-groupes`, `Respirit`, `Scapience`), each to reconcile in its own session. Adds `agathe`, `/hire`, the carnet line and the boundary lines everywhere a cohort file is not app-owned: **not** to bananaevents' five frozen files until that app moves their sections out. `crew:report` and the checks stay in the hub. New WARNs where the survey found something. It writes no store and no owner anywhere.
- **Rotation.** `337.a` moved verbatim to the top of `docs/archive/METHOD/versioning-history.md`.
- **Proof.** CODED = `node --test tests/crew-checks.test.mjs tests/method-doctor.test.mjs` 44/44, and a mutation (whole heading → substring) fails the inline-mention case; `node scripts/ops/verify-cohort-overlaps.mjs` 16/16; `npm run doctor` 0 error; `crew:report` read-only on the hub, bananaevents and `Finasup@bb12b48` (table in the intervention). Vera (opus): REJECTED on round 1, for three missing sentences (`/retro` read only the hub, a new owner was never told to record `Appris:`, the gate sat only in the full `method-core.md`) and a placeholder; these and her notes are fixed here, a dynamic import in `doctor:fleet` excepted, since a hub module that fails to load is a visible failure and touches no landing. Round 2, on the diff only: APPROVED_WITH_NOTES, five one-line text notes, applied before landing. Not PROVEN: the proof comes after the sync, in Finasup, and step (1) needs that app to declare `ownedAgents` first.

**338.a** (2026-11-03) — **Major: the startup hook says, in one line, when the files the app seeds from the main checkout differ from the trunk's addon payload; `install.mjs --seeded-only` fixes those and nothing else; `session-close` reaches the apps, merge path included**

- **Problem.** The Claude desktop app seeds every new or recycled worktree with exactly the main checkout's ignored `.claude/` files (`git ls-files --others --ignored --exclude-standard -- .claude`; proved byte for byte in bananaevents on 2026-11-02, 45/45 files). A main checkout that lags the trunk therefore freezes every worktree's `land.mjs`, `verify-gate.mjs`, `flight-deck.mjs` and commands, and overwrites the files the trunk tracks but its own branch ignores: on 2026-11-02 that handed the v325.a fiche validator to a chantier sub-session, which refused a valid v336.b fiche in a loop. `git status` shows none of it. bananaevents was repaired by hand on 2026-11-03 (main checkout moved to a trunk-based branch, payload installed: 15 paths); nothing stopped a later sync landed from a worktree from reopening the gap.
- **Origin.** bananaevents, side-session brief of 2026-11-03 (agent `hugo`): make the drift visible after a sync, and settle why `session-close.mjs` never reached an app.
- **Operator's call, 2026-11-03 (quiz): ship `session-close` whole.** From the next sync on, a held PR that `kasper` approves can merge in an app without the operator (`--pr`, the doctrine of 336.a, which had no code in the apps until now). Rules, indexes, migrations, secrets, `SOUL.md` and METHOD tooling still go to him; auth and middleware do not, and the verdict file stays an honour-system brake (`method-core.md` → "Exception PRs").
- **NEW — `.claude/hooks/lib/claude-drift.mjs`** (payload + hub copy): compares the main checkout's seeded `.claude/{hooks,commands}/**` with the payload of the checkout the session starts in, only when that checkout's HEAD is the trunk commit (an old branch neither raises nor hides a warning). CRLF-insensitive. Skipped: files the main checkout tracks or merely leaves untracked (the app copies ignored files only), the hub (E5 holds it), a checkout where none of the files is installed, and a main checkout whose `methodVersion` is newer than the session's, because a fleet sync got there before the trunk and "fixing" it would install older hooks. The silent path spawns no git process, since one spawn costs ~300 ms on the operator's machine: the worktree link and the refs (loose or packed) are read from `.git`, and the main checkout's index (v2/v3/v4) only once something differs. Only an untracked file that differs or is missing pays for one `git check-ignore`. Hooks are compared before commands. A 200 ms deadline stops the comparison: with nothing found it is silent, with something found it says so and that it was cut short. Any read error is silent.
- **CHANGED — `flight-deck.mjs --mode startup-hook`**: when the lib finds a difference, one line — as `systemMessage` and at the top of `additionalContext` — names the files and the fix, run from a checkout at the trunk: `node docs/METHOD/tools/swanifly-claude-addon/install.mjs <main checkout> --seeded-only --dry-run`, then the same without `--dry-run`.
- **NEW — `install.mjs --seeded-only`**: writes only the hooks and commands git ignores in the target checkout, names each path, and keeps each replaced copy in `.method/claude-backup/`, because an ignored file has no git history. No tracked file, section, skill, `.gitignore` or settings, so it cannot dirty a main checkout or block its next fast-forward. The bare installer would have overwritten the tracked `lib/chantier-status.mjs` in bananaevents' main checkout, 54 commits behind the trunk that day.
- **CHANGED — `install.mjs`**: the hook list is exported (`ADDON_HOOKS`) and gains `lib/claude-drift.mjs`, `session-close.mjs` and `lib/session-close.mjs`. The last two were in the payload since 336.b and never installed. They are a command-line tool, not a wired hook, so `settings.snippet.json` is unchanged.
- **CHANGED — `land.mjs`, `method-core.md`, `method-core-lite.md`, `METHOD.md`, `README.md`, `kasper.md`, `regine.md`**: the next step is written `node .claude/hooks/session-close.mjs …`. The npm script `session:close` exists only in the hub, so the step `land.mjs` printed could not run in an app.
- **NEW — `tests/claude-drift.test.mjs`** (13 cases): a differing or missing seeded file → the line, with the command; up to date with CRLF copies and a differing tracked file → silent; not at the trunk, hub, not installed, over budget, unreadable index, main ahead, untracked but not ignored → silent; the deadline cuts the comparison and what was found is still said; warning → `--seeded-only` → silent with the main checkout still clean; the index parser equals `git ls-files` on v2, v3 and v4, accented paths and a two-byte strip count included; every file under `payload/hooks/` is installed or listed in `NOT_INSTALLED`, so a hook can no longer ship uninstalled.
- **Limits, stated.** Only a session started at the trunk commit, within the budget, reports: on a busy machine or an older branch it says nothing and a later session does. The cost is the file reads: 50–80 ms measured on a quieter machine, but on 2026-11-03 under load (2.3 GB of RAM free) the silent path took 150–490 ms and stopped at the deadline in 6 of 10 runs. The deadline bounds the comparison, not one stalled read, and a warning costs more (450–970 ms, `git check-ignore` included). `.claude/settings.json` is seeded too but not compared, and `--seeded-only` does not touch it: a release that adds a hook wiring still needs the full installer or a fleet sync.
- **Not touched.** The doctor (the check lives where a session sees it, not in a run nobody makes after a sync); `settings.snippet.json`; the sync engine; `SOUL.md`, and `CLAUDE.md` beyond the version string. The hook never writes an app's main checkout: running the fix stays a gesture, on the operator's GO typed in that app's session.
- **Why Major.** A new hook file every app receives and a change to what the installer lands — "Installer or sync behaviour that changes what lands in an app" (→ "When to Increment"), the 334.a precedent. `337.d → 338.a`; trunk read before numbering: `origin/main` at **337.d** (`8f52c039`). Not on the landing exception list.
- **Sync effect.** Every app's tracked addon payload and `install.mjs`; on install, `.claude/hooks/lib/claude-drift.mjs`, `session-close.mjs`, `lib/session-close.mjs` and the new `flight-deck.mjs` and `land.mjs`. **The warning works only once an app's main checkout holds the new `flight-deck.mjs`**: after this sync, run the fix once on each main checkout the fleet sync skipped (bananaevents: `node docs/METHOD/tools/swanifly-claude-addon/install.mjs D:/Apps/bananaevents --seeded-only --dry-run`, then without). From then on, a later sync landed from a worktree is said by the next session at the trunk.
- **Rotation.** `336.d` moved verbatim to the top of `docs/archive/METHOD/versioning-history.md`.
- **Proof.** CODED = `node --test tests/claude-drift.test.mjs` 13/13, and a mutation (no CRLF normalisation) fails the up-to-date case; the method-doctor and method-sync tests 59/59; `npm run doctor` 0 error. Vera (opus): PASS WITH FIXES; F1, F2 and F4–F8 are fixed here, F3 went to the operator; her re-read of the fix diff left one sentence of release text and three small hardenings, applied. Not PROVEN: a session started in a fresh bananaevents worktree after the sync and the one-time fix shows no line, and the first session after a sync that leaves the main checkout behind shows it.

**337.d** (2026-11-03) — **Minor: Régine's night pass (04:00) is written down — what it reads, what it may do alone, what it never does, what it outputs; one GO to paste per session; `scripts/regie/gitstate.sh` versioned in the hub**

- **Problem.** On 2026-11-03 a manual review of 66 sessions (11 archived, 8 unpushed branches saved, one page with a section per project — figures from the coordinating session's brief of 2026-11-03) became the scheduled task `regie-de-nuit` (04:00), at the operator's request, run as Régine. It pushes to origin every night, yet `regine.md` did not describe it and its git script lived outside any repo (`~/.claude/scheduled-tasks/regie-de-nuit/gitstate.sh`) — a routine with no versioned rule and a script nobody reviews.
- **Origin.** The coordinating session's brief of 2026-11-03 (the operator chose Régine, not Lucia or Oscar, and 04:00). Proposal `docs/interventions/2026-11-03-Lucia-regie-de-nuit.md`. **Operator ratification pending** — landed on the brief; the fleet sync waits for it.
- **NEW — `regine.md` → « Passe de nuit (04:00) »**: reads `list_sessions` + the git state of every session, and transcripts only for a session new or whose `lastActivityAt` moved (sonnet sub-agents beyond 8, read-only); may alone push the unpushed commits of an idle worktree session (rule-4 checks, `SKIP_QUALITY_GATES=1`, never force, never commits a live session's work) a chantier sub-session's included, even when it is not archived; archives finished sessions already fully on origin — (a) rule 1, (b) verdict ✅ + 0 real dirty file + integrated + 0 unpushed + idle > 2 h, (c) PR `MERGED` — ≤ 15 a night, never a 🟡, a supposed duplicate or a chantier sub-session; (b) is the night pass's exception to rule 3's « à sauver », since `gitstate.sh` proves nothing is left to rescue; never merges or closes a PR, answers a quiz, sends a message or a GO, touches a main checkout's working tree (a stale or dirty one becomes a decision on the page), runs a gate, or deletes; outputs the page « Régie des sessions » (`https://claude.ai/artifact/57fVxrcEFqFqsAbHYLUfkw`) and one `PushNotification` only when a gesture is due before the next 04:00. The frontmatter `description:` names the pass.
- **NEW — the rule observed on 2026-11-03.** A session refuses a GO relayed by another session (rightly — only the operator's words authorize it), so the page relays nothing: each waiting point whose recommendation is a clear yes carries the GO, in the operator's first person, that he pastes into that session himself.
- **NEW — `scripts/regie/gitstate.sh`** (hub only): byte-identical copy of the task's script — one line per session: `WT` / `WT?` / `MAIN` / `NO_DIR` / `NOT_GIT`, real vs METHOD-noise dirty files, unpushed, ahead/behind the trunk, `integrated` (ancestor / squashed / NO). From its landing the task reads it with `git show origin/main:scripts/regie/gitstate.sh`, like `machine-check.mjs` (its `SKILL.md` repointed right after `/land`, the local copy renamed), so the hub copy is the only one that runs.
- **CHANGED — `agents-method.md` → Régine**: the roster row and the Ritual line name the 04:00 night review. `regine.md` rule 7: the machine pass is not run by the night pass.
- **Not touched.** The routine's prompt beyond the script path; `rangement-barre-laterale`; the clocks themselves; `page.html` (stays in the task folder, outside the repo); `SOUL.md`, `CLAUDE.md` beyond the version string, hooks, the doctor.
- **Why Minor.** Writes down a routine the operator already runs; it extends rule 4's push to idle worktree sessions that are not archived — a write that destroys nothing, same class as 333.b — and adds no agent, slash ritual, hook or DoD change. By 331.a's precedent a new standing permission could read Major: the operator rules at ratification (Vera, 2026-11-03). `337.c → 337.d`; trunk read before numbering: `origin/main` at **337.c** (`d5ed701c`), IMP-031 free on the trunk. Not on the landing exception list.
- **Sync effect.** `regine.md`, `agents-method.md` and the version strings reach every app; `scripts/regie/` and `docs/improvement/` stay in the hub. No app file expected in the clobber report; the dry-run says.
- **Rotation.** `336.c` moved verbatim to the top of `docs/archive/METHOD/versioning-history.md`.
- **Proof.** CODED = doctor green and the script, read with `git show HEAD:scripts/regie/gitstate.sh`, run on a real two-session TSV (`1  WT  swanifly/suspicious-tesla-4214b9  0/0  1  1  0  NO …`; `2  MAIN  claude/gate-root-app-imp001  171/1  4  4  287  NO …`). Vera's review (opus, one pass): PASS WITH FIXES, fixes applied in one round. Not PROVEN: the 04:00 run of 2026-11-04 reads it from `origin/main` and republishes the page (IMP-031).

**337.c** (2026-11-01) — **Minor: the review page — when the quiz is too small, a claude.ai artifact with its own storage takes over (more than 4 decisions, or a result not built yet); eight invariants, a template, five formats from a study that stays open**

- **Problem.** The quiz (`AskUserQuestion`, ≤ 4 questions, no drip) cannot carry 19 details ready at once, nor show a result that does not exist yet. Two real pages proved the instrument (2026-10-31: 19 decisions, commit `21513a7`; 2026-11-01: 12 screens, 49 points, commit `7889720`, both in bananaevents) and the operator asked for it to become METHOD.
- **Origin.** Lucia's proposal `docs/interventions/2026-11-01-Lucia-page-de-revue.md` (bananaevents, `81f0ff7`), **ratified by the operator on 2026-11-01** (quiz): option A — a § in `method-core.md`, a template, a line in `design-method.md`; a conflict-gate decision may go through a page in a block of its own, never a production GO; apply now. He added: study the formats per use case and keep studying past and future cases.
- **NEW — `method-core.md` → "The two-moment contract" → "When the quiz is too small — the review page (337.c)"**: two triggers, eight invariants, conflict-gate block, formats, limits (coordinator publishes and reads; private page shared by the operator only; no real client data; republish with the URL; judges, does not direct).
- **NEW — `docs/METHOD/templates/review-page.html`**: fixed skeleton + one JSON data block (`#review-data`), kinds `choice` · `verdict` · `rank` · `list`, a mockup frame slot with pins, conflict-gate block first, live summary, overall verdict, probe write, local fallback, light/dark, phone first. Smoke-checked in a browser (render, click, no-`db` fallback); the first real page proves it with `db` (IMP-030).
- **NEW — `docs/improvement/review-pages-census.md`** (hub only, open): the five families (trigger, blocks, storage), nine pages recorded (what worked, what the operator had to redo), eight lessons, open questions. One row per new page.
- **CHANGED —** `method-core.md` "The operator lever" (choices come prepared: or a page); `method-core-lite.md` (quiz rule); `design-method.md` → "Prototyping — Claude Artifacts" (a review page is not a prototype; Nova carries accepted points into `proto/`); `sprints-method.md` → "The chantier" (Cadrage beyond 4 details → a page); the « Questions are quizzes » bullet of `CLAUDE.md`, `AGENTS.md`, payload `CLAUDE.md`, payload `AGENTS.md`, `snippets/communication-contract.md` (E15 byte-equal). To stay inside the 13,312 B gate (E16) the same bullets lost a few words (`accept/reopen/defer`, « never imply done », two connectors): the budget itself was **not** touched.
- **Not touched.** `SOUL.md`, the Recette (still one quiz question), the closing card (336.d), `.claude/` hooks and agents, the doctor. The operator's user-level `CLAUDE.md` (`payload/user/CLAUDE.md`, « Questions = quiz ») gets the same half-sentence by the coordinator — installed, not synced.
- **Why Minor.** A rule clarified and a template added — no agent, ritual, hook or DoD change (same class as 336.d). `337.b → 337.c`; trunk read before numbering: `origin/main` at **337.b** (`b9ccb840`), IMP-030 free on the trunk. Not on the landing exception list.
- **Sync effect.** `docs/METHOD/**` (including the template), the merged « Communication Contract » section of `CLAUDE.md`, the addon payload, the version strings. `docs/improvement/` is hub only. No app file expected in the clobber report; the dry-run says.
- **Rotation.** `336.b` moved verbatim to the top of `docs/archive/METHOD/versioning-history.md`.
- **Proof.** CODED = doctor green. Not PROVEN: the next review page in any app passes the eight invariants and its answers are carried before any action (IMP-030, J+7).

**337.b** (2026-11-01) — **Minor: `wip-sync` survives a path git cannot index — Windows device names (`nul`, `con`, `com1`…) are skipped by name, `git add --ignore-errors` names the culprit instead of aborting the snapshot, and the error says why**

- **Problem.** On 2026-11-01 the Stop hook `wip-sync` (uncommitted work mirrored on `refs/wip/<branch>`) mirrored nothing at the bananaevents root. A stray 45-byte file named `nul` (a `… > nul` that landed as a real file on 2026-10-06) is listed by `git ls-files --others`, but git on Windows opens it as the NUL device: `git add` dies with `short read while indexing nul`. The hook passed every candidate in one `git add -A --pathspec-from-file`, so one bad path aborted the whole batch, and `must()` kept only the last stderr line (`fatal: adding files failed`), which hid the cause.
- **Origin.** Watson's diagnosis and fix in bananaevents, `0fa07d07f`, LANDED there (merge `4a0629d06`); upstreamed as hub branch `swanifly/wip-sync-device-names` (`838045c8`). A fix that lives only in an app is erased by the next sync: without this release, the sync would put the old hook back.
- **CHANGED — `.claude/hooks/wip-sync.mjs`** and its payload copy `docs/METHOD/tools/swanifly-claude-addon/payload/hooks/wip-sync.mjs` (same bytes, doctor E5):
  - `denyReason`: Windows device names (`con prn aux nul com1-9 lpt1-9`, any extension, in any path segment) and names ending in a dot or a space are skipped, on win32 only; `.env*` directories are denied too;
  - `addPaths`: `git add --ignore-errors`; the culprits are read from `unable to index file '<p>'`, skipped and listed in `.git/wip-sync.last-skipped`; an all-failed batch, or a failure that names no path, still throws (fail-closed);
  - `must()` carries the cause line (warnings filtered out); `maxBuffer` 64 MB (CRLF warnings overflowed 1 MB on big trees);
  - seam: `WIP_SYNC_NO_MAIN=1` imports the helpers without running the hook (unset = runs as before).
- **NEW — `docs/METHOD/tools/swanifly-claude-addon/tests/wip-sync.test.mjs`** (8 tests): end to end, a `nul` path is skipped and the rest is mirrored; `.env.local`, a key-shaped name and key-shaped content are never mirrored even when no `.gitignore` catches them; `addPaths` and the helpers.
- **Not touched.** The secrets guard (already there, now proven by the test), the hook's wiring in `settings.json`, every other hook, `SOUL.md`, `CLAUDE.md` beyond its version string. The stray `D:/Apps/bananaevents/nul` itself stays the operator's gesture (`cmd /c del "\\?\D:\Apps\bananaevents\nul"`).
- **Why Minor.** A bug fix inside an existing hook — no new hook, ritual, agent, wiring or DoD change (same class as 334.e's gate fix). `337.a → 337.b`; trunk checked before numbering: `origin/main` at **337.a** (`e6e9c183`). Not on the landing exception list.
- **Sync effect.** The payload hook and the new test under `docs/METHOD/**`, the version strings, and the merged `CLAUDE.md` version string. A live worktree keeps its frozen copy of `.claude/` until it is recreated (`install.mjs` refreshes the main checkout only); it only fails if it holds a device-name file.
- **Rotation.** `336.a` moved verbatim to the top of `docs/archive/METHOD/versioning-history.md`.
- **Proof.** CODED = `node --test` green on the new payload test (8) and on the hub's `tests/wip-sync*.test.mjs` against the new `.claude` copy + `npm run doctor` green. Replay (Watson, bananaevents root, 2026-11-01): the old hook's batch exits 128, a bisect names exactly one path, `nul`; the fixed hook prints `☁ uncommitted work mirrored on GitHub: refs/wip/feat/pandadoc-signed-mail (772290b)`, `git ls-remote origin 'refs/wip/*'` lists it, `.git/wip-sync.last-skipped` = `nul (not addable on Windows …)`. LANDED = hub `/land`.
