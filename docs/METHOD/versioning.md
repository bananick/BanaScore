# METHOD Versioning & Sync Protocol

**Owner:** Lucia  
**Version:** 315.b  
**Last Updated:** 2026-09-01  
**Purpose:** Version scheme, sync protocol, migration policy

---

## Version Scheme

**Format:** `MAJOR.LETTER`

- **MAJOR**: Epoch or significant release (300, 301, 400...)
- **LETTER**: Minor revision (a, b, c...)

**Current:** 315.b (Epoch 3: Modular & Multi-Entry)

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
- New agent in cohort
- DoD changes
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
4. **`npm run doctor` must be green before you sync.** A red doctor means the hub is
   internally inconsistent — syncing would copy that inconsistency into every app, 17 times
   over. Fix the hub, then push.

---

## Sync Tools

METHOD is authored in **Bana-Share** (the source of truth) and pushed out to all apps.

### Push METHOD → all apps (from Bana-Share root)
```bash
npm run sync-method:all          # → node scripts/sync-method-to-all-apps.mjs
npm run sync-method:all:dry      # preview without writing
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
- **DELIBERATELY NOT ADDED — no `Session:` field on the task template.** Its neighbour `Tier:` has been mandatory since v311.a and is present in `templates/TASK-TEMPLATE.md`, yet a grep over `Apps/*/docs/sprints/` finds it filled in **0 of 85** task files (all 18 `tier` hits in those files are domain prose — customer tiers, pricing tiers). A second dead field beside a dead field is not automation, only more surface to sync. The trigger list is checked by whoever executes, when the trigger fires.
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

