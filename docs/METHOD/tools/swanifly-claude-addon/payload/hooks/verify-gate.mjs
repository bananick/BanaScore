#!/usr/bin/env node
/**
 * scripts/verify-gate.mjs — the METHOD verify gate (the only brake before main).
 *
 * There is no GitHub Actions CI and no branch protection on this account
 * (workflows removed 2026-06-28 `8b989e9`; protection API returns 403 on this plan).
 * Landing on `main` is LANDED, not deployed (deploy is a separate step with its own evidence),
 * but it is the last brake before every other step. So the gate runs locally, and it must be
 * machine-checkable — not prose an agent can claim to have honored.
 *
 * It classifies the diff against the trunk into three lanes, and only spends
 * build time on the lane that can actually break production:
 *
 *   doc      docs/, *.md, proto/, qa/, prompts/, *.jsonl, study data (*.csv/tsv/geojson, unowned *.json) → nothing to run (green)
 *   tooling  scripts/, .claude/, tools/, registries      → `node --check` on JS
 *   rules    telemetry-backend/firestore.{rules,indexes.json} → parsed and sanity-checked (below)
 *   app      real app code under an app root             → that app's npm checks (334.c: a plain `eslint` lint
 *                                                          runs on the root's changed files only, red on NEW problems (334.d) — see "lint judges the diff")
 *
 * Toolchain policy (operator's call, 2026-08-10): most roots in this fleet have no
 * `node_modules`, so `eslint`/`tsc`/`next` are absent — a missing toolchain, not broken
 * code. Failing the root on that froze it: nothing could land, so nothing got fixed. The
 * gate now runs what CAN run, requires that at least ONE verifying check actually
 * executed (else `blocked`), and names every skipped check in the report and the marker.
 * It never reports a skipped check as a pass.
 *
 * No-deps lane (324.b, from BanaLog PR #108, 2026-10-17): a root with no `node_modules` whose diff
 * is plain Node JS only (`*.mjs`/`*.cjs`/`*.js`, no ts/tsx/jsx/vue…) — a docs + tests repo — can
 * still be verified with zero install. Each changed JS file is classified by its CONTENT, not its name:
 * one that imports/requires `node:test` is a Node test and is run by `node --test`; one that imports
 * another runner (vitest, @jest/globals, jest, mocha, ava, tap), or looks like a test (under `test/`,
 * `tests/`, `__tests__/`, or named `*.test.*` / `*.spec.*` / `*_test.*`) without `node:test`, needs
 * its runner installed → the floor, `blocked`, naming the file. `node --check` runs on every changed
 * JS file as an extra check (red on a syntax error) but NEVER verifies on its own: the lane is green
 * only if at least one `node:test` file ran and passed — a JS diff with no Node test stays `blocked`
 * (a change to `lib/a.mjs` can break an unchanged test). Checks are recorded as
 * `node-check (no-deps)` / `node-test (no-deps)` with their real `ok`; every npm script that could
 * not run (build included) is `skipped: 'no-deps'`; the marker lists the root under `noDeps` and the
 * report prints a `⚠ NO-DEPS` line. Any non-Node file keeps the floor too: fail closed.
 *
 * On green it stamps `.method/verify-ok.json` pinned to the current HEAD sha.
 * `scripts/land.mjs` refuses to land unless that marker matches HEAD, so a stale
 * green from three commits ago cannot wave work through.
 *
 * Serialization (2026-09-29, upstreamed from bananaevents). Several sessions land in parallel from git
 * worktrees, and N heavy gates at once (lint · type-check · test:gate · build) starve the machine — vitest
 * times out and the gate goes red on a fine diff. So the HEAVY phase (an app root whose scripts will really
 * execute, or the gate's own self-test) takes ONE lock per repository, shared by all worktrees:
 * `<main checkout>/.method/gate.lock` (`METHOD_GATE_LOCK_FILE` overrides it). Others wait with a
 * visible message, up to `--lock-wait` minutes (default 180); past that the verdict is `blocked`
 * — nothing ran, fail closed, never a pass. Light diffs (docs, tooling, roots with no toolchain)
 * never queue. `land.mjs` holds the same lock for the whole landing (merge → verify → push) and
 * its verify child re-enters through `METHOD_GATE_LOCK_TOKEN`. The lock is a scheduling aid, not a check:
 * if `gate-lock.mjs` is missing or throws, the gate warns and runs unserialized, exactly as before.
 * See gate-lock.mjs.
 *
 * Machine-wide heavy slots (334.a, 2026-10-27). The repository lock above cannot see other repositories, and on
 * 2026-10-26 Windows ran out of virtual memory with gates of several repos running at once. So the heavy phase
 * also takes one of the MACHINE's two heavy slots (`~/.claude/heavy-slot/slot{1,2}.lock`, see heavy-slot.mjs) —
 * after the repository lock, never before, so the two can never deadlock. A wait that runs out (`--slot-wait`,
 * default 40 min) is `blocked`, "heavy-slot busy", nothing ran; a semaphore that cannot work (no lock directory)
 * only warns and the gate runs as before. The slot is given back as soon as the heavy phase ends, and on exit.
 *
 * `--plan` prints ONE JSON line (mode, heavy, lane counts, app roots) and exits 0 — no marker,
 * no script, no lock. `land.mjs` uses it to know, before it merges, whether the gate is heavy.
 *
 * Usage:
 *   node scripts/verify-gate.mjs [--base origin/main] [--json] [--quiet] [--plan] [--lock-wait <min>] [--slot-wait <min>]
 * Exit: 0 green · 1 red (a check failed) · 2 blocked (nothing can verify it)
 */
import { spawnSync } from 'node:child_process';
import { createRequire } from 'node:module';
import { existsSync, mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import { basename, dirname, join, relative, resolve } from 'node:path';

const argv = process.argv.slice(2);
const flag = (name, fallback = null) => {
  const i = argv.indexOf(`--${name}`);
  return i === -1 ? fallback : (argv[i + 1] ?? true);
};
const has = (name) => argv.includes(`--${name}`);
const AS_JSON = has('json');
const QUIET = has('quiet') || AS_JSON;
// 30 min per script, not 15 (2026-09-16): `test:gate` alone is ~3 min, but under parallel
// load (other sessions building) the same suite stretched to 185-200 s and `type-check` on
// a large app passes 10 min — the cap has to cover the worst honest run, not the median.
// `build` keeps its own explicit cap in CHECK_ORDER (it replays `prebuild`).
const TIMEOUT = Number(flag('timeout', 1800)) * 1000;

const say = (...a) => { if (!QUIET) console.log(...a); };

// The lock library sits next to this file. Optional by design: a copy without it (or with one
// that fails to load) still gates — the lock only schedules heavy gates, it never judges a diff.
const LOCK = await import('./gate-lock.mjs').catch(() => null);
const LOCK_WAIT_MIN = (() => { const m = Number(flag('lock-wait', 180)); return Number.isFinite(m) && m >= 0 ? m : 180; })();
// The machine-wide heavy slots (see the header). Optional the same way: without the library the gate runs unchanged.
const HEAVY = await import('./heavy-slot.mjs').catch(() => null);
const SLOT_WAIT_MIN = (() => { const m = Number(flag('slot-wait', 40)); return Number.isFinite(m) && m >= 0 ? m : 40; })();
const mins = (ms) => Math.round(ms / 60_000);

// ── git helpers ──────────────────────────────────────────────────────────────
const git = (args, cwd = process.cwd()) =>
  spawnSync('git', args, { cwd, encoding: 'utf8', timeout: 60_000 });
const gitOut = (args, cwd) => (git(args, cwd).stdout ?? '').trim();

const REPO = gitOut(['rev-parse', '--show-toplevel']);
if (!REPO) fail('not a git repository');

const HEAD = gitOut(['rev-parse', 'HEAD'], REPO);
const BRANCH = gitOut(['rev-parse', '--abbrev-ref', 'HEAD'], REPO);
// The trunk is the remote's default branch (`refs/remotes/origin/HEAD` → strip `origin/`), `main` when that
// ref is not set — the same rule as land.mjs, so a standalone `npm run verify` in a `master` repo (IAcademy,
// LeMansFC, bizia) diffs against origin/master, not a branch that does not exist. `--base` always wins.
function defaultTrunk() {
  const m = /^refs\/remotes\/origin\/(.+)$/.exec(gitOut(['symbolic-ref', '--quiet', 'refs/remotes/origin/HEAD'], REPO));
  return m ? m[1] : 'main';
}
const BASE = String(flag('base', `origin/${defaultTrunk()}`));

// ── the changed set (committed vs trunk + anything still in the tree) ────────
// Deleted paths are NOT code to verify: a deleted `package.json` must not become an app root
// ("no verify capability"), a deleted root dump must not be "unclassifiable". They are collected
// apart (`deletedFiles`) and only reported. land.mjs computes its own deletion exception.
const deletedFiles = new Set();
function changedFiles() {
  const out = new Set();
  // `core.quotepath` (on by default) wraps any path holding a non-ASCII byte — an
  // accented filename like "Mélanie.jpg" — in double quotes with the bytes octal-escaped
  // ("M\303\251lanie.jpg"), in BOTH `git diff --name-only` and `git status --porcelain`.
  // Left on, the leading `"` breaks every `(^|\/)`-anchored lane regex (DOC's
  // `/(^|\/)docs\//` no longer matches a string starting with `"docs/`) — the path falls
  // through every lane into "unclassifiable paths (fail closed)". Only the wrapping quotes
  // need stripping to fix classification; the octal escapes inside are cosmetic (unchanged
  // paths still resolve on disk via `existsSync`/`join`, which take raw bytes, not the
  // display string) and are left alone.
  const unquote = (f) => f.replace(/^"|"$/g, '');
  const mergeBase = gitOut(['merge-base', 'HEAD', BASE], REPO);
  if (mergeBase) {
    for (const f of gitOut(['diff', '--name-only', '--diff-filter=d', `${mergeBase}..HEAD`], REPO).split('\n')) {
      if (f) out.add(unquote(f));
    }
    for (const f of gitOut(['diff', '--name-only', '--diff-filter=D', `${mergeBase}..HEAD`], REPO).split('\n')) {
      if (f) deletedFiles.add(unquote(f));
    }
  }
  // `git status --porcelain` lines carry a 2-char status field, and for an UNSTAGED
  // modification the first char is a SPACE. `gitOut` trims the whole output, which ate
  // that leading space and shifted the FIRST line's path by one character — surfacing as
  // a bogus "unclassifiable paths (fail closed)" that killed the gate. Parse untrimmed.
  const status = git(['status', '--porcelain'], REPO).stdout ?? '';
  for (const line of status.split('\n')) {
    if (line.length < 4) continue;
    const f = unquote(line.slice(3).split(' -> ').pop().trim());
    if (!f) continue;
    if (line.slice(0, 2).includes('D')) deletedFiles.add(f); else out.add(f);
  }
  // A path deleted then re-created (or still present) is live, not deleted.
  for (const f of out) deletedFiles.delete(f);
  // `.method/` is this gate's own scratch state — never part of the diff it judges,
  // whether or not the repo has gotten around to gitignoring it.
  return [...out].filter(Boolean).map((f) => f.replace(/\\/g, '/')).filter((f) => !f.startsWith('.method/'));
}

// ── lane classification ─────────────────────────────────────────────────────
// Depth-agnostic on purpose. A fleet-wide change touches `Apps/{app}/docs/METHOD/...`
// and `Apps/{app}/.claude/...`; with these anchored at the repo root they fell through to
// the app lane and would have triggered a real `npm run build` per nested app.
const DOC = [
  /(^|\/)docs\//, /\.mdx?$/i, /(^|\/)proto\//, /(^|\/)qa\//, /(^|\/)prompts\//, /(^|\/)_agents\//,
  /\.jsonl$/, /(^|\/)TEMPLATES\//, /(^|\/)projects\//, /(^|\/)README/i, /\.(png|jpe?g|svg|webp|gif|pdf)$/i,
  /(^|\/)(SOUL|CLAUDE|AGENTS|GEMINI)\.md$/,
  // Study data — tables and maps a study folder commits next to its report: no runtime, nothing a gate can run.
  // Fell through every lane into "unclassifiable paths (fail closed)" and held a whole study dossier at /land
  // (versation Cabasse-GFV 5ffa7e8, PR #21, 2026-10-17). Depth-agnostic like the rest of this list. A study's
  // `.json` is the same kind of file but cannot be matched here — see STUDY_JSON below.
  /\.(csv|tsv|geojson)$/i,
];
const TOOLING = [
  /(^|\/)scripts\//, /(^|\/)\.claude\//, /(^|\/)tools\//, /(^|\/)\.github\//,
  /^[^/]+\.json$/, /(^|\/)\.gitignore$/, /(^|\/)\.gitattributes$/, /(^|\/)\.env\.example$/,
  /(^|\/)firebase\.json$/, /(^|\/)\.firebaserc$/,
  // deploy wiring — `node --check` lane. Was "unclassifiable (fail closed)" on any diff that
  // touched it, even a comment (apphosting 2026-09-13, scheduler 2026-09-15).
  /(^|\/)apphosting\.ya?ml$/, /(^|\/)scheduler\.ya?ml$/,
  // Codex agent definitions (`.codex/agents/*.toml`) — agent config, no runtime, no node-checkable
  // syntax. Fell through every lane into "unclassifiable paths (fail closed)" and blocked /land on the
  // first crew diff that touched them (bananaevents crew reshape 6ab923b0, 2026-09-28).
  /(^|\/)\.codex\//,
  // Firebase security rules AT THE REPO ROOT — deploy config, no node-checkable syntax. Fell through every lane
  // into "unclassifiable (fail closed)" (bananaevents venues admin-only, 2026-09-24). Classifying them does
  // NOT wave them through: land.mjs's `schema` exception still holds any rules diff (nested ones too) for an
  // explicit `[land-anyway]` / `--force-land` backed by an operator decision.
  // Anchored to the root on purpose (Kasper, 322.f): a nested `espace/firestore.rules` belongs to its app and keeps
  // that app's gate — classify() reaches it through the app-root lookup, not through this list.
  /^(firestore|storage)\.rules$/,
];
// Firestore rules + indexes of the telemetry backend (`telemetry-backend/`, project swanifly-ia). Scoped to
// that folder on purpose: they get a static check (see rulesCheck) that the generic `*.rules` tooling entry above
// does not give, so `classify()` tests this list BEFORE TOOLING. Everywhere else `firestore.indexes.json` stays
// "unclassifiable (fail closed)", a root-level `*.rules` is plain deploy config and a nested one goes to its app's
// gate. Its `functions/` folder is an ordinary app root (own package.json: typecheck + test + build, needs `npm ci`).
const RULES = [/^telemetry-backend\/firestore\.(rules|indexes\.json)$/];
const CODE_EXT = /\.(ts|tsx|js|jsx|mjs|cjs|vue|svelte|css|scss|html|snap)$/i;
// Narrower than CODE_EXT on purpose: the set a repo-root app's typecheck/test/build
// scripts would actually plausibly compile. css/html/vue/svelte at the repo root stay
// on the CODE_EXT/tooling fallback below even when the root is a verifying app root.
// `json` is app data the build consumes (`src/messages/*.json` i18n catalogues — a missing
// key fails `next build`); without it every i18n diff fell through all lanes into
// "unclassifiable (fail closed)" (2026-09-14). Root-level `*.json` never gets here:
// TOOLING's `/^[^/]+\.json$/` catches package.json & co first.
// `snap` is a vitest file snapshot (`__tests__/__snapshots__/*.snap`) — a test artifact the
// app's own `test:gate` consumes: a missing or drifted snapshot fails the gate exactly like a
// missing i18n key fails the build. Without it the first committed snapshot (bananaevents 195-e,
// 2026-09-18, upstreamed from 887092749) fell through every lane into "unclassifiable (fail closed)"
// AFTER lint, type-check, test:gate and build had all passed.
const ROOT_APP_EXT = /\.(ts|tsx|js|jsx|mjs|cjs|json|snap)$/i;
// YAML data, the nested half only (325.b, 2026-10-18, Chief `s1-memory-core`): `memory/facts.yaml` and the
// `tests/fixtures/**/memory/**/*.yaml` that Chief's root `test:gate` validates with Zod (`scripts/memory-check.mjs`)
// fell through every lane into "unclassifiable (fail closed)" — and so would every memory-capture commit. A NESTED
// `*.ya?ml` under a verifying repo root now takes that root's app lane: fail-safe, it runs the root's checks, it
// never waves the file through. Two stay out on purpose: a ROOT-level `*.ya?ml` (`app.yaml`, `cloudbuild.yaml`,
// `docker-compose.yml` — deploy wiring no app check reads; the `/` in the pattern keeps it "unclassifiable (fail
// closed)"), and any YAML under a root that verifies nothing (this hub). `apphosting`/`scheduler.ya?ml` and
// `.github/` keep the tooling lane: TOOLING is tested first.
const ROOT_APP_DATA = /\/[^/]+\.ya?ml$/i;
// Study data, the `.json` half (2026-10-17, versation Cabasse-GFV 5ffa7e8 — scraped series, registry extracts, a
// report's data file). A `.json` is study data only when no one else owns it, so classify() tests this AFTER
// TOOLING (root-level `*.json`, `scripts/`, `.claude/`, `firebase.json` keep their lane) and AFTER the app-root
// lookup (a `.json` under an app's package.json — the i18n catalogues `src/messages/*.json` first — keeps that
// app's lane and its checks). What is left: a nested `.json` under no package.json, or under a repo root that
// verifies nothing. Two stay "unclassifiable (fail closed)" on purpose: `firestore.indexes.json` (deploy config,
// see RULES) and anything under a `src/` folder (app data with no app able to verify it).
const STUDY_JSON = /\.json$/i;
const STUDY_JSON_EXCLUDED = [/(^|\/)firestore\.indexes\.json$/i, /(^|\/)src\//];

/**
 * npm workspaces roll-up (upstreamed from Respirit `01a866e`). A package.json that is a workspace of a parent
 * package.json declaring `"workspaces"` is verified through that parent: a change in `app/shared` must run
 * `app`'s lint/typecheck/test/build over every workspace, not only shared's own scripts. Members are matched
 * against the parent's `workspaces` (array or `{ packages }`): an exact directory, or a one-level `dir/*` glob;
 * any other pattern (`**`, negation) is not understood and leaves the root as it was.
 * `workspacesRoot('app/shared')` → 'app'; any other directory → itself. Memoized per root.
 *
 * It only RE-ROUTES which root verifies an app file; it never decides the lane. `classify()` decides the lane from
 * the file's OWN package.json, and a member that rolls up to `.` is still app code: the repo root then goes through
 * the same capability check as any app root, so a root with no scripts is `blocked`, never a silent pass (Kasper, 322.f).
 */
const _workspacesRoot = new Map();
function workspacesRoot(root) {
  if (root === '.') return root;
  if (_workspacesRoot.has(root)) return _workspacesRoot.get(root);
  let found = root;
  const child = resolve(REPO, root);
  const stop = resolve(REPO);
  let dir = dirname(child);
  while (dir.length >= stop.length) {
    const manifest = join(dir, 'package.json');
    if (existsSync(manifest)) {
      let globs = [];
      try {
        const ws = JSON.parse(readFileSync(manifest, 'utf8')).workspaces;
        globs = Array.isArray(ws) ? ws : (ws?.packages ?? []);
      } catch { globs = []; }
      const rel = relative(dir, child).replace(/\\/g, '/');
      const isMember = globs.some((g) => {
        const glob = String(g).replace(/^\.\//, '').replace(/\/+$/, '');
        return glob === rel || (glob.endsWith('/*') && dirname(rel) === glob.slice(0, -2));
      });
      if (isMember) { found = relative(REPO, dir).replace(/\\/g, '/') || '.'; break; }
    }
    const up = dirname(dir);
    if (up === dir) break;
    dir = up;
  }
  _workspacesRoot.set(root, found);
  return found;
}

/** Nearest ancestor directory holding a package.json (the file's OWN root), repo-relative — before any workspace roll-up. */
function appRootOf(file) {
  let dir = dirname(resolve(REPO, file));
  const stop = resolve(REPO);
  while (dir.length >= stop.length) {
    if (existsSync(join(dir, 'package.json'))) {
      return relative(REPO, dir).replace(/\\/g, '/') || '.';
    }
    const up = dirname(dir);
    if (up === dir) break;
    dir = up;
  }
  return null;
}

/**
 * A repo-root package.json only counts as an app root if it exposes at least one
 * verifying script (typecheck/test/build). Otherwise the root is a tooling root (this
 * hub's own package.json: dev/doctor/land/sync scripts only) and its loose .ts/.tsx/.js
 * files must stay in the tooling lane, not silently skip verification in an app lane
 * with no capability. Memoized: `readScripts('.')` is called once per changed root file.
 *
 * `test:gate` deliberately does NOT count here (2026-09-16): it is an alias of `test` for
 * RUNNING an app lane, not evidence that a root is an app. A root whose only verifying
 * script is the gate's own self-test (this hub: `test:gate` = `node --test tests/`) stays a
 * tooling root, and the self-gating block below runs that suite when the gate or its tests
 * change — otherwise any loose root file would drag the hub into an app lane it cannot verify.
 */
let _rootVerifying = null;
function rootHasVerifyingScript() {
  if (_rootVerifying === null) {
    const scripts = readScripts('.');
    _rootVerifying = CHECK_ORDER.some((c) => VERIFYING.has(c.id) && c.scripts.some((s) => s !== 'test:gate' && scripts[s]));
  }
  return _rootVerifying;
}

function classify(file) {
  if (DOC.some((r) => r.test(file))) return { lane: 'doc' };
  if (RULES.some((r) => r.test(file))) return { lane: 'rules' };
  if (TOOLING.some((r) => r.test(file))) return { lane: 'tooling' };
  // The lane comes from the file's OWN nearest package.json; only the root that verifies it is rolled up to the
  // workspaces parent. Deciding the lane from the rolled-up root would send a member's .vue/.css (or any file under
  // a script-less repo root) through the repo-root rules below — tooling lane, node --check on nothing, green.
  const own = appRootOf(file);
  if (own && own !== '.') return { lane: 'app', root: workspacesRoot(own) };
  if (own === '.' && (ROOT_APP_EXT.test(file) || ROOT_APP_DATA.test(file)) && rootHasVerifyingScript()) return { lane: 'app', root: '.' };
  if (STUDY_JSON.test(file) && !STUDY_JSON_EXCLUDED.some((r) => r.test(file))) return { lane: 'doc' };   // unowned study data
  if (CODE_EXT.test(file)) return { lane: 'tooling' };       // loose hub-level script
  return { lane: 'unknown' };
}

// ── the checks ──────────────────────────────────────────────────────────────
const CHECK_ORDER = [
  { id: 'lint', scripts: ['lint'] },
  { id: 'typecheck', scripts: ['typecheck', 'type-check'] },
  // `test:gate` before `test` (2026-09-13): where a root exposes the explicit build gate —
  // the allowlist `prebuild` runs in the App Hosting build container — that IS the suite
  // that can break production. The full `test` there needs the Firestore emulator + live
  // network and did not finish in 10 min, holding app landings back for reasons unrelated
  // to the diff. Roots without `test:gate` keep running `test`.
  { id: 'test', scripts: ['test:gate', 'test'] },
  // `build` gets 30 min (2026-09-13): `npm run build` replays `prebuild` (type-check + test:gate)
  // before `next build` generates ~2 700 static pages — the 15 min cap of the time killed it
  // mid-way, leaving a tail of harmless compile warnings and no error line. Explicit even now
  // that TIMEOUT defaults to 30 min: a `--timeout` override must never shorten the build.
  { id: 'build', scripts: ['build'], timeoutSec: 1800 },
];
const VERIFYING = new Set(['typecheck', 'test', 'build']); // lint alone proves nothing ships

function readScripts(root) {
  try {
    return JSON.parse(readFileSync(join(REPO, root, 'package.json'), 'utf8')).scripts ?? {};
  } catch { return {}; }
}

// ── jest and vitest run serially, with a roomy per-test timeout (334.e, 2026-10-28) ─────────────────────────────
// BanaLog: up to 6 Claude sessions run gates on one machine. `backend/` HTTP authz specs (jest, 5 s default per test)
// timed out under load — a different suite each pass, each green 12/12 alone — and held PR #128 for 4 passes; the
// frontend's vitest died on "[vitest-pool-runner] Timeout waiting for worker to respond" (two files in a row). When a
// lane's test script is a plain `jest …` / `vitest run …` command the gate appends, each only if the script does not
// already set it (npm: `npm run <script> -- …`):
//   jest   → `--runInBand` (set already by `--runInBand`/`-i`/`--maxWorkers`/`-w`) · `--testTimeout=30000`
//   vitest → `--no-file-parallelism` (set already by `--no-file-parallelism`/`--fileParallelism`/`--pool`/`--poolOptions`/
//            `--maxWorkers`/`--no-threads`/`--singleThread`) · `--testTimeout=30000`
// vitest only when the root's installed vitest is ≥ 1 (`--no-file-parallelism` does not exist before; unresolvable
// version = left alone, an unknown flag must never be a false red), and only for `vitest` / `vitest run` (not watch,
// bench, related…). A composite command (`&&`, pipes, `;`) or another runner gets nothing: npm would hand the extra
// arguments to the wrong command. Fail-closed is untouched: a failing test is still red, the timeout is longer.
const JEST_SERIAL = ['--runInBand', '-i', '--maxWorkers', '-w'];
const VITEST_SERIAL = ['--no-file-parallelism', '--fileParallelism', '--pool', '--poolOptions', '--maxWorkers', '--max-workers', '--no-threads', '--singleThread'];
const TEST_TIMEOUT = '--testTimeout';

/** Installed vitest major for a root (its own node_modules, then the repo's hoisted one); null = unknown. */
function vitestMajor(root) {
  for (const base of [join(REPO, root), REPO]) {
    try {
      const v = JSON.parse(readFileSync(join(base, 'node_modules', 'vitest', 'package.json'), 'utf8')).version;
      const m = /^(\d+)\./.exec(String(v));
      if (m) return Number(m[1]);
    } catch { /* try the next */ }
  }
  return null;
}

/** Extra arguments to append to a plain `jest …` / `vitest run …` script command; `[]` = leave the script alone. */
function testExtraArgs(root, command) {
  const cmd = String(command ?? '').trim();
  if (!cmd || /&&|\|\||[;|<>`]|\$\(/.test(cmd)) return [];
  const tokens = splitArgs(cmd);
  if (tokens[0] === 'npx') tokens.shift();
  const has = (names) => tokens.some((t) => names.some((n) => t === n || t.startsWith(`${n}=`)));
  const extra = [];
  if (tokens[0] === 'jest') {
    if (!has(JEST_SERIAL)) extra.push('--runInBand');
  } else if (tokens[0] === 'vitest') {
    if (tokens[1] && !tokens[1].startsWith('-') && tokens[1] !== 'run') return [];
    const major = vitestMajor(root);
    if (major === null || major < 1) return [];
    if (!has(VITEST_SERIAL)) extra.push('--no-file-parallelism');
  } else return [];
  if (!has([TEST_TIMEOUT])) extra.push(`${TEST_TIMEOUT}=30000`);
  return extra;
}

function runScript(root, script, timeoutMs = TIMEOUT, extraArgs = []) {
  const started = Date.now();
  const res = spawnSync(`npm run --silent ${script}${extraArgs.length ? ` -- ${extraArgs.join(' ')}` : ''}`, {
    cwd: join(REPO, root),
    encoding: 'utf8',
    shell: true,
    timeout: timeoutMs,
    // 64 MB, not the 1 MB default (measured 2026-09-14): under CI=true — which this gate
    // forces — vitest's gate config switches its reporter to `["json","github-actions"]`, so
    // `test:gate` writes > 1 MB of JSON to stdout; a full `next build` log (Sentry traces)
    // is in the same range. Past the cap spawnSync returns ENOBUFS in `res.error` and the
    // check reads "failed" with an EMPTY tail while every test passed.
    maxBuffer: 64 * 1024 * 1024,
    env: { ...process.env, CI: 'true', FORCE_COLOR: '0' },
  });
  const ms = Date.now() - started;
  const ok = res.status === 0 && !res.error;
  const log = `${res.stdout ?? ''}\n${res.stderr ?? ''}`.trim();
  return { ok, ms, tail: ok ? '' : log.split('\n').slice(-25).join('\n') };
}

// ── lint judges the diff, not the lane (334.c, 2026-10-28) ──────────────────
// BanaLog: ~6 500 pre-existing problems in `backend/` (e.g. `backend/test/builder*`) turned every land that
// touched the backend red on lint, whatever the branch changed — `land.mjs` has no baseline and `[land-anyway]`
// does not bypass the verify step (PR #128 held). So when the root's `lint` script is a plain `eslint …`
// command, the gate runs that same eslint — same config, same flags, minus `--fix` / output / cache — on the
// root's CHANGED files only (added/modified vs `--base`, plus the tree), narrowed to the script's own path or
// glob arguments and to lintable extensions. No changed lintable file → lint passes (`files: 0`). Still fail
// closed on a real error in a changed file. Anything the gate cannot read with certainty — a composite command
// (`&&`, pipes), another linter (`next lint`, biome), an unknown flag, eslint not resolvable from the root —
// keeps the whole-lane run, unchanged. Typecheck, tests and build are untouched: they still judge the whole lane.
//
// New problems only (334.d, same day): the file is too coarse a unit — PR #128 touched `events.service.ts`, which
// carries 147 errors on the trunk, so 334.c still held it. Eslint errors are now counted per (file, rule) at HEAD and,
// for a file that existed at the merge base, on the merge-base text (`git show <mb>:<file>` fed through `--stdin`,
// same config, same project). Red when a (file, rule) count grows, or when a file new since the merge base has an
// error. Warnings are not counted (eslint does not fail on them either). Fail closed: an eslint run that crashes
// (exit ≥ 2, unreadable JSON) at HEAD or on the baseline is red, never a pass.
// The baseline text goes through the checkout filters (`git cat-file --filters`, i.e. core.autocrlf): eslint-plugin-prettier
// counts one more error on a CRLF working copy of BanaLog's `events.service.ts` than on its LF blob, which read as a new one.
const LINTABLE = /\.(?:[cm]?[jt]sx?|vue|svelte|astro)$/i;
const ESLINT_DROP = new Set(['--fix', '--fix-dry-run', '--cache']);
const ESLINT_DROP_VALUE = new Set(['--fix-type', '-o', '--output-file', '--cache-location', '--cache-strategy', '-f', '--format']);
const ESLINT_VALUE = new Set(['-c', '--config', '--max-warnings', '--ext', '--parser', '--parser-options', '--plugin', '--rule',
  '--rulesdir', '--resolve-plugins-relative-to', '--ignore-path', '--ignore-pattern', '--env', '--global',
  '--report-unused-disable-directives-severity', '--flag']);
const ESLINT_BOOL = new Set(['--quiet', '--no-eslintrc', '--no-config-lookup', '--no-inline-config', '--no-ignore',
  '--report-unused-disable-directives', '--no-warn-ignored', '--no-error-on-unmatched-pattern', '--pass-on-no-patterns',
  '--color', '--no-color', '--stats']);

/** Split a script command on whitespace, honouring "…" and '…' (what `npm run` hands the shell). */
function splitArgs(cmd) {
  const out = [];
  const re = /"([^"]*)"|'([^']*)'|(\S+)/g;
  let m;
  while ((m = re.exec(cmd))) out.push(m[1] ?? m[2] ?? m[3]);
  return out;
}

/** An eslint path argument → a matcher on root-relative paths: `*`, `**`, `?`, `{a,b}`; a plain path = itself or a folder. */
function patternMatcher(pattern) {
  const p = pattern.replace(/\\/g, '/').replace(/^\.\//, '').replace(/\/+$/, '');
  if (p === '' || p === '.') return () => true;
  if (!/[*?{]/.test(p)) return (f) => f === p || f.startsWith(`${p}/`);
  let re = '';
  let depth = 0;
  for (let i = 0; i < p.length; i++) {
    const ch = p[i];
    if (ch === '*' && p[i + 1] === '*') {
      i++;
      if (p[i + 1] === '/') { i++; re += '(?:.*/)?'; } else re += '.*';
    } else if (ch === '*') re += '[^/]*';
    else if (ch === '?') re += '[^/]';
    else if (ch === '{') { re += '(?:'; depth++; }
    else if (ch === '}' && depth) { re += ')'; depth--; }
    else if (ch === ',' && depth) re += '|';
    else re += ch.replace(/[.+^$()|[\]\\]/g, '\\$&');
  }
  const rx = new RegExp(`^${re}$`);
  return (f) => rx.test(f);
}

/**
 * The changed-files lint plan for one root, or `null` = run the whole `lint` script as before.
 * `rootFiles` are the repo-relative changed app files of that root. Returns `{ flags, files }`, `files` root-relative.
 */
function lintPlan(root, command, rootFiles) {
  const cmd = String(command ?? '').trim();
  if (/&&|\|\||[;|<>`]|\$\(/.test(cmd)) return null;
  const tokens = splitArgs(cmd);
  if (tokens[0] !== 'eslint') return null;
  const flags = [];
  const patterns = [];
  for (let i = 1; i < tokens.length; i++) {
    const t = tokens[i];
    if (!t.startsWith('-')) { patterns.push(t); continue; }
    const name = t.split('=')[0];
    const inline = t.includes('=');
    if (ESLINT_DROP.has(name)) continue;
    if (ESLINT_DROP_VALUE.has(name)) { if (!inline) i++; continue; }
    if (ESLINT_VALUE.has(name)) {
      flags.push(t);
      if (!inline) { if (i + 1 >= tokens.length) return null; flags.push(tokens[++i]); }
      continue;
    }
    if (ESLINT_BOOL.has(name)) { flags.push(t); continue; }
    return null; // an option this gate does not know could take a value it would read as a path — keep the whole lane
  }
  const matchers = patterns.map(patternMatcher);
  const files = [];
  for (const f of rootFiles) {
    if (!existsSync(join(REPO, f))) continue;
    const rel = root === '.' ? f : relative(root, f).replace(/\\/g, '/');
    if (rel.startsWith('..') || !LINTABLE.test(rel)) continue;
    if (matchers.length && !matchers.some((m) => m(rel))) continue;
    files.push(rel);
  }
  return { flags, files };
}

/** eslint's own bin, resolved from the root the way `npm run` finds it (hoisted workspaces included); null = unknown. */
function eslintBin(root) {
  try {
    const req = createRequire(join(REPO, root, 'package.json'));
    const pkgPath = req.resolve('eslint/package.json');
    const pkg = JSON.parse(readFileSync(pkgPath, 'utf8'));
    const bin = typeof pkg.bin === 'string' ? pkg.bin : pkg.bin?.eslint;
    return bin ? join(dirname(pkgPath), bin) : null;
  } catch { return null; }
}

/** eslint `-f json` → { ok, counts: Map<root-relative file, Map<rule, errors>>, tail }. ok=false = eslint crashed (fail closed). */
function eslintCounts(root, bin, flags, args, input) {
  const res = spawnSync(process.execPath, [bin, ...flags, '-f', 'json', ...args], {
    cwd: join(REPO, root),
    encoding: 'utf8',
    timeout: TIMEOUT,
    maxBuffer: 64 * 1024 * 1024,
    env: { ...process.env, CI: 'true', FORCE_COLOR: '0' },
    ...(input !== undefined ? { input } : {}),
  });
  const crash = (why) => ({ ok: false, counts: new Map(), tail: `${why}\n${`${res.stdout ?? ''}\n${res.stderr ?? ''}`.trim().split('\n').slice(-25).join('\n')}`.trim() });
  if (res.error) return crash(`eslint did not run: ${res.error.message}`);
  if (res.status !== 0 && res.status !== 1) return crash(`eslint crashed (exit ${res.status})`);
  let out;
  try { out = JSON.parse(res.stdout); } catch { return crash('eslint output is not JSON'); }
  if (!Array.isArray(out)) return crash('eslint output is not a result array');
  const counts = new Map();
  for (const r of out) {
    const rel = relative(join(REPO, root), String(r.filePath ?? '')).replace(/\\/g, '/');
    const m = counts.get(rel) ?? new Map();
    for (const msg of r.messages ?? []) {
      if (msg.severity !== 2) continue;
      const rule = msg.ruleId ?? (msg.fatal ? 'fatal' : 'unknown');
      m.set(rule, (m.get(rule) ?? 0) + 1);
    }
    counts.set(rel, m);
  }
  return { ok: true, counts, tail: '' };
}

/**
 * Lint `files` (root-relative) at HEAD, then on the merge-base text of every file that has errors — red only on
 * a (file, rule) count that grew, or an error in a file new since the merge base. 40 files per call, no shell.
 */
function runLintOnFiles(root, bin, flags, files) {
  const started = Date.now();
  const head = new Map();
  for (let i = 0; i < files.length; i += 40) {
    const r = eslintCounts(root, bin, flags, files.slice(i, i + 40));
    if (!r.ok) return { ok: false, ms: Date.now() - started, tail: r.tail, crashed: true };
    for (const [f, m] of r.counts) head.set(f, m);
  }
  const mergeBase = gitOut(['merge-base', 'HEAD', BASE], REPO);
  const grown = [];
  let baselined = 0;
  for (const [f, m] of head) {
    if (![...m.values()].some((n) => n > 0)) continue;
    const repoPath = root === '.' ? f : `${root}/${f}`;
    const shown = mergeBase
      ? spawnSync('git', ['cat-file', '--filters', `${mergeBase}:${repoPath}`], { cwd: REPO, encoding: 'utf8', maxBuffer: 64 * 1024 * 1024, timeout: 60_000 })
      : null;
    let base = new Map();
    if (shown && shown.status === 0 && !shown.error) {
      const r = eslintCounts(root, bin, flags, ['--stdin', '--stdin-filename', f], shown.stdout);
      if (!r.ok) return { ok: false, ms: Date.now() - started, tail: `baseline ${f}: ${r.tail}`, crashed: true };
      base = r.counts.get(f) ?? new Map();
      baselined++;
    }
    const isNew = !(shown && shown.status === 0);
    for (const [rule, n] of m) {
      const was = base.get(rule) ?? 0;
      if (n > was) grown.push(`${f}: ${rule} ${was} → ${n}${isNew ? ' (new file)' : ''}`);
    }
  }
  const total = [...head.values()].reduce((a, m) => a + [...m.values()].reduce((x, y) => x + y, 0), 0);
  return { ok: grown.length === 0, ms: Date.now() - started, tail: grown.slice(0, 25).join('\n'), newProblems: grown.length, errorsAtHead: total, baselined };
}

/**
 * A script whose executable is plain `node` runs without an install (Node ships the test
 * runner and strips TS types itself); anything else — eslint, tsc, next, vitest — is a
 * local binary that only exists under `node_modules`.
 * Compared without a regex on purpose: an escape here previously became a literal
 * backspace byte (0x08), which matched nothing and silently skipped every check.
 */
function needsInstall(command) {
  return command.trim().split(/\s+/)[0] !== 'node';
}

/**
 * Static checks for the rules lane — no emulator, no firebase CLI. Indexes must parse as JSON with an
 * `indexes` array; rules must be non-empty, declare `rules_version` + `service cloud.firestore`, and
 * have balanced braces (comments and string literals stripped first). A deleted file is red: firebase.json
 * still points at it.
 */
function rulesCheck(files) {
  const bad = [];
  for (const f of files) {
    const abs = join(REPO, f);
    if (!existsSync(abs)) { bad.push(`${f}: missing (firebase.json still references it)`); continue; }
    const body = readFileSync(abs, 'utf8');
    if (/\.json$/i.test(f)) {
      try {
        const j = JSON.parse(body);
        if (!j || typeof j !== 'object' || !Array.isArray(j.indexes)) bad.push(`${f}: no "indexes" array`);
      } catch (e) { bad.push(`${f}: invalid JSON (${e.message})`); }
      continue;
    }
    const code = body
      .replace(/\/\*[\s\S]*?\*\//g, '')
      .replace(/\/\/.*$/gm, '')
      .replace(/'(?:[^'\\\n]|\\.)*'|"(?:[^"\\\n]|\\.)*"/g, '""');
    if (!code.trim()) { bad.push(`${f}: empty`); continue; }
    if (!/^\s*rules_version\s*=/m.test(code)) bad.push(`${f}: no rules_version`);
    if (!/service\s+cloud\.firestore\s*\{/.test(code)) bad.push(`${f}: no "service cloud.firestore" block`);
    let depth = 0;
    let broken = false;
    for (const ch of code) {
      if (ch === '{') depth++;
      else if (ch === '}' && --depth < 0) { broken = true; break; }
    }
    if (broken || depth !== 0) bad.push(`${f}: unbalanced braces`);
  }
  return { count: files.length, bad };
}

function nodeSyntaxCheck(files) {
  const targets = files.filter((f) => /\.(mjs|cjs|js)$/i.test(f) && existsSync(join(REPO, f)));
  const bad = [];
  for (const f of targets) {
    const res = spawnSync(process.execPath, ['--check', join(REPO, f)], { encoding: 'utf8', timeout: 30_000 });
    if (res.status !== 0) bad.push(`${f}: ${(res.stderr ?? '').split('\n')[0]}`);
  }
  return { count: targets.length, bad };
}

/**
 * No-deps lane (see the header): can this toolchain-less root be verified with zero install?
 * Every changed app file of the root must be plain Node JS. Each one is then classified by its content:
 * a real `node:test` import/require → a Node test (run); another runner's import, or a test-looking
 * path/name without `node:test` → blocked (its runner is not installed). Comments are stripped first,
 * so a `// import 'node:test'` line does not make a file a test.
 * @returns {{ok:true, js:string[], tests:string[]} | {ok:false, why:string}}
 */
const OTHER_RUNNER = /(?:\bfrom\s*|\bimport\s*\(?\s*|\brequire\s*\(\s*)['"](?:vitest|@jest\/globals|jest|mocha|ava|tap)(?:\/[^'"]*)?['"]/;
const NODE_TEST = /(?:\bfrom\s*|\bimport\s*\(?\s*|\brequire\s*\(\s*)['"]node:test['"]/;
const TEST_LIKE = /(^|\/)(test|tests|__tests__)\/|\.(test|spec)\.[cm]?js$|_test\.[cm]?js$/i;
const stripComments = (src) => src.replace(/\/\*[\s\S]*?\*\//g, '').replace(/(^|[^:'"`])\/\/.*$/gm, '$1');
function noDepsPlan(rootFiles) {
  const present = rootFiles.filter((f) => existsSync(join(REPO, f)));
  if (!present.length) return { ok: false, why: 'no changed file left on disk' };
  const foreign = present.filter((f) => !/\.(mjs|cjs|js)$/i.test(f));
  if (foreign.length) return { ok: false, why: `not plain Node JS: ${foreign.slice(0, 5).join(', ')}` };
  const tests = [];
  const otherRunner = [];
  for (const f of present) {
    const code = stripComments(readFileSync(join(REPO, f), 'utf8'));
    if (NODE_TEST.test(code)) tests.push(f);
    else if (OTHER_RUNNER.test(code) || TEST_LIKE.test(f)) otherRunner.push(f);
  }
  if (otherRunner.length) return { ok: false, why: `test file(s) not on node:test (their runner must be installed): ${otherRunner.slice(0, 5).join(', ')}` };
  return { ok: true, js: present, tests };
}

/** `node --test` on the given repo-relative files, from the root's directory. No npm, no install. */
function runNodeTest(root, tests) {
  const started = Date.now();
  // A gate launched from inside a `node --test` run inherits NODE_TEST_CONTEXT, which turns the
  // nested runner into a reporting child of a parent that is not listening — drop it.
  const env = { ...process.env, CI: 'true', FORCE_COLOR: '0' };
  delete env.NODE_TEST_CONTEXT;
  const res = spawnSync(process.execPath, ['--test', ...tests.map((f) => join(REPO, f))], {
    cwd: join(REPO, root), encoding: 'utf8', timeout: TIMEOUT, maxBuffer: 64 * 1024 * 1024, env,
  });
  const ok = res.status === 0 && !res.error;
  const log = `${res.stdout ?? ''}\n${res.stderr ?? ''}`.trim();
  return { ok, ms: Date.now() - started, tail: ok ? '' : log.split('\n').slice(-25).join('\n') };
}

// ── run ─────────────────────────────────────────────────────────────────────
const files = changedFiles();
const lanes = { doc: [], tooling: [], rules: [], app: [], unknown: [] };
const appRoots = new Set();
const appFilesByRoot = new Map(); // root → its changed app-lane files (the no-deps lane judges these)
for (const f of files) {
  const c = classify(f);
  lanes[c.lane].push(f);
  if (c.lane === 'app') {
    appRoots.add(c.root);
    appFilesByRoot.set(c.root, [...(appFilesByRoot.get(c.root) ?? []), f]);
  }
}

// Self-gating: the gate cannot trust itself on prose alone. If this diff touches the gate's own
// source or its test suite, and the root exposes `test:gate`, actually run it — a passing
// `node --check` on `verify-gate.mjs` proves only that it parses, not that it still behaves.
// Stays in the tooling lane on purpose: `.` is never added to `appRoots` for this, it is a
// gate-specific check, not app verification. The gate's own libraries count as its source (334.a: a diff touching
// only `heavy-slot.mjs` or `gate-lock.mjs` landed without the suite that tests them).
const selfTest = lanes.tooling.some((f) => /(^|\/)(verify-gate|gate-lock|heavy-slot)\.mjs$|^tests\//.test(f)) && Boolean(readScripts('.')['test:gate']);

// Heavy = a real npm script will actually execute. A root with no toolchain skips its checks in
// milliseconds (see the app loop) — it must not queue behind a 20-minute gate for nothing.
// Mirrors the app loop's own test: a check has a script AND (node_modules exists OR the script
// is plain `node`). Docs / tooling-only diffs are never heavy (`node --check` is cheap), and neither
// is a no-deps root (324.b): its `node --check` / `node --test` on the diff's own files is light.
const rootRunsSomething = (root) => {
  const scripts = readScripts(root);
  const installed = existsSync(join(REPO, root, 'node_modules'));
  return CHECK_ORDER.some((c) => {
    const script = c.scripts.find((s) => scripts[s]);
    return Boolean(script) && (installed || !needsInstall(String(scripts[script] ?? '')));
  });
};
const heavy = selfTest || [...appRoots].some(rootRunsSomething);
const mode = appRoots.size ? 'app' : lanes.rules.length ? 'rules' : lanes.tooling.length ? 'tooling' : 'docs-only';
const laneCounts = Object.fromEntries(Object.entries(lanes).map(([k, v]) => [k, v.length]));

// `--plan`: say what this diff would cost, run nothing, write nothing (no marker), take no lock.
// land.mjs asks before it merges, so it can queue for the lock only when the gate is heavy.
if (has('plan')) {
  console.log(JSON.stringify({ plan: 1, sha: HEAD, base: BASE, mode, heavy, files: files.length, lanes: laneCounts, apps: [...appRoots] }));
  process.exit(0);
}

const checks = [];
const reasons = [];
const skipped = [];
const noDepsRoots = []; // { root, tests, js, skippedScripts } — roots verified through the no-deps lane
let verdict = 'green';

if (!files.length) {
  reasons.push(deletedFiles.size
    ? `deletion-only change against ${BASE}: ${deletedFiles.size} path(s) removed, nothing to verify`
    : 'nothing changed against ' + BASE);
}

if (lanes.unknown.length) {
  verdict = 'blocked';
  reasons.push(`unclassifiable paths (fail closed): ${lanes.unknown.slice(0, 5).join(', ')}`);
}

// One heavy gate at a time per repository (see the header). Taken before anything expensive
// runs, held until process exit (the lib's exit hook frees it, whatever the verdict).
let lockInfo = null;   // → marker.lock, only the keys that apply
let gateDenied = false;
if (heavy) {
  if (!LOCK) {
    console.error('⚠ gate-lock.mjs missing — heavy phase runs unserialized');
    lockInfo = { unavailable: true };
  } else {
    let got = null;
    try {
      got = LOCK.acquireGateLock({
        path: LOCK.gateLockPath(REPO),
        info: { label: basename(REPO), worktree: REPO, branch: BRANCH, cmd: 'verify-gate' },
        maxWaitMs: LOCK_WAIT_MIN * 60_000,
        onWait: (h, waitedMs, lockFile) => console.error(`⏳ gate lock held by ${LOCK.describeHolder(h, lockFile)} — waiting (${mins(waitedMs)} min so far, up to ${LOCK_WAIT_MIN} min)`),
        onStale: (h) => console.error(`♻ removed a stale gate lock left by ${LOCK.describeHolder(h)}`),
      });
    } catch (e) {
      console.error(`⚠ gate lock unavailable (${e?.message ?? e}) — heavy phase runs unserialized`);
      lockInfo = { unavailable: true };
    }
    if (got?.ok) lockInfo = { waitedMs: got.waitedMs, ...(got.reentrant ? { reentrant: true } : {}) };
    else if (got) {
      // Fail closed: waiting out the budget is not a pass. Nothing heavy runs, the verdict says so.
      gateDenied = true;
      lockInfo = { waitedMs: got.waitedMs, denied: true };
      verdict = 'blocked';
      reasons.push(`gate lock busy — held by ${LOCK.describeHolder(got.holder, got.path)}; waited ${mins(got.waitedMs)} min, nothing ran (fail closed). Re-run when it frees, or pass --lock-wait <min>.`);
    }
  }
}

// One of the machine's two heavy slots, AFTER the repository lock (see the header). Owner = the branch.
let slotInfo = null;   // → marker.heavySlot
let slot = null;
let slotDenied = false;
if (heavy && !gateDenied) {
  const unserialized = (why) => { console.error(`⚠ heavy-slot ${why} — heavy phase runs without the machine-wide semaphore`); };
  if (!HEAVY) { unserialized('library missing'); slotInfo = { unavailable: true }; }
  else if (HEAVY.heavySlotOff()) { unserialized('off (METHOD_HEAVY_SLOT=off)'); slotInfo = { off: true }; }
  else {
    try {
      slot = await HEAVY.acquireHeavySlot({
        owner: BRANCH,
        maxWaitMs: SLOT_WAIT_MIN * 60_000,
        onWait: (why, waitedMs) => console.error(`⏳ heavy-slot: ${why} — waiting (${mins(waitedMs)} min so far, up to ${SLOT_WAIT_MIN} min)`),
        onStale: (s) => console.error(`♻ heavy-slot: removed a stale ${s.name} left by ${s.owner ?? 'an unreadable file'}`),
      });
    } catch (e) {
      unserialized(`unavailable (${e?.message ?? e})`);
      slotInfo = { unavailable: true };
    }
    if (slot?.ok) {
      slotInfo = { slot: slot.name, waitedMs: slot.waitedMs, ...(slot.reentrant ? { reentrant: true } : {}), ...(slot.inherited ? { inherited: true } : {}), ...(slot.heartbeat === false ? { heartbeat: false } : {}) };
      if (!slot.reentrant) console.error(`🎟 heavy-slot: ${slot.name} taken by ${BRANCH}${slot.waitedMs ? ` after ${mins(slot.waitedMs)} min` : ''}`);
      if (slot.heartbeat === false) console.error('⚠ heavy-slot: heartbeat thread did not start — the slot is kept and ages by the 45-min rule');
    } else if (slot) {
      // Fail closed, like a busy repository lock: waiting out the budget is not a pass.
      slotDenied = true;
      slotInfo = { waitedMs: slot.waitedMs, denied: true };
      verdict = 'blocked';
      reasons.push(`heavy-slot busy — ${slot.why}; waited ${mins(slot.waitedMs)} min, nothing ran (fail closed). Re-run when a slot frees, or pass --slot-wait <min>.`);
    }
  }
}
const heavyDenied = gateDenied || slotDenied;

if (lanes.tooling.length) {
  const syn = nodeSyntaxCheck(lanes.tooling);
  // node --check only understands .mjs/.cjs/.js; a .ts/.tsx that lands in the tooling
  // lane (e.g. a repo root with no verifying script) is silently unchecked by that tool —
  // name it in the tail rather than letting the check imply coverage it doesn't have.
  const uncheckedTs = lanes.tooling.filter((f) => /\.tsx?$/i.test(f));
  const tail = [syn.bad.join('\n'), uncheckedTs.length ? `not checked (no TS syntax checker): ${uncheckedTs.join(', ')}` : '']
    .filter(Boolean).join('\n');
  checks.push({ root: '.', check: 'node --check', ok: syn.bad.length === 0, files: syn.count, tail });
  if (syn.bad.length) { verdict = 'red'; reasons.push(`syntax error in ${syn.bad.length} tooling file(s)`); }
  say(`tooling  ${lanes.tooling.length} file(s) · node --check ${syn.bad.length ? '✗' : '✓'}${uncheckedTs.length ? ` · not checked: ${uncheckedTs.join(', ')}` : ''}`);

  // Self-gating (`selfTest`, computed above the lock): run the root's `test:gate` when this diff
  // touches the gate itself. Skipped — never passed — when the lock or the heavy slot was denied.
  if (selfTest && !heavyDenied) {
    say('tooling  self-test: npm run test:gate …');
    const r = runScript('.', 'test:gate');
    checks.push({ root: '.', check: 'test:gate', ok: r.ok, ms: r.ms, tail: r.tail });
    if (!r.ok) { verdict = 'red'; reasons.push('gate self-test failed'); }
  }
}

if (lanes.rules.length) {
  const rc = rulesCheck(lanes.rules);
  checks.push({ root: '.', check: 'rules static check', ok: rc.bad.length === 0, files: rc.count, tail: rc.bad.join('\n') });
  if (rc.bad.length) { verdict = 'red'; reasons.push(`${rc.bad.length} invalid Firestore rules/indexes file(s): ${rc.bad.slice(0, 3).join('; ')}`); }
  say(`rules    ${rc.count} file(s) · static check ${rc.bad.length ? '✗' : '✓'}`);
}

// A denied lock or slot skips every app root: nothing heavy ran, and the verdict is already `blocked`.
for (const root of heavyDenied ? [] : [...appRoots].sort()) {
  const scripts = readScripts(root);
  const available = CHECK_ORDER.filter((c) => c.scripts.some((s) => scripts[s]));
  const verifying = available.filter((c) => VERIFYING.has(c.id));
  if (!verifying.length) {
    verdict = 'blocked';
    reasons.push(`${root} has no typecheck/test/build script — cannot verify app code (fail closed)`);
    checks.push({ root, check: 'capability', ok: false, tail: 'no typecheck/test/build script' });
    say(`app      ${root} · ✗ no verify capability`);
    continue;
  }
  // Run what CAN run. Most roots in this fleet have no `node_modules`, so `eslint`/`tsc`/
  // `next` are simply absent — that is a missing toolchain, not broken code, and failing
  // the whole root on it froze those roots entirely (nothing could land, so nothing got
  // fixed). A script that only shells out to `node` needs no install; everything else does.
  // Never silent: skipped checks are named in the report and stored in the marker.
  const installed = existsSync(join(REPO, root, 'node_modules'));
  const noDeps = installed ? null : noDepsPlan(appFilesByRoot.get(root) ?? []);
  let ranVerifying = 0;
  let red = false;
  for (const c of available) {
    const script = c.scripts.find((s) => scripts[s]);
    if (!installed && needsInstall(String(scripts[script] ?? ''))) {
      // `ok` is deliberately omitted (not `true`) — a skipped check is neither a pass nor
      // a failure, and a marker reader must not be able to mistake it for a green check.
      checks.push({ root, check: script, ok: null, skipped: 'toolchain-absent' });
      skipped.push(`${root}:${script}`);
      say(`app      ${root} · ${script} — SKIPPED, no node_modules`);
      continue;
    }
    // Lint judges the diff (334.c): this root's changed files only, when its `lint` is a plain eslint command;
    // red only on NEW problems vs the merge base, per (file, rule) (334.d).
    const plan = c.id === 'lint' ? lintPlan(root, scripts[script], appFilesByRoot.get(root) ?? []) : null;
    const bin = plan ? eslintBin(root) : null;
    if (plan && bin) {
      if (!plan.files.length) {
        checks.push({ root, check: script, scope: 'changed', files: 0, ok: true, ms: 0, tail: '' });
        say(`app      ${root} · ${script} — no changed lintable file in this root ✓`);
        continue;
      }
      say(`app      ${root} · ${script} on ${plan.files.length} changed file(s) …`);
      const r = runLintOnFiles(root, bin, plan.flags, plan.files);
      checks.push({ root, check: script, scope: 'changed', files: plan.files.length, ok: r.ok, ms: r.ms, tail: r.tail,
        ...(r.crashed ? { crashed: true } : { newProblems: r.newProblems, errorsAtHead: r.errorsAtHead, baselined: r.baselined }) });
      if (r.ok && r.errorsAtHead) say(`app      ${root} · ${script} — ${r.errorsAtHead} pre-existing error(s) in changed files, none new ✓`);
      if (!r.ok) {
        verdict = 'red';
        reasons.push(r.crashed ? `${root}: eslint crashed on the changed files (fail closed)` : `${root}: ${r.newProblems} new eslint problem(s) in ${plan.files.length} changed file(s) — ${r.tail.split('\n')[0]}`);
        red = true;
        break;
      }
      continue;
    }
    const runnerArgs = c.id === 'test' ? testExtraArgs(root, scripts[script]) : [];
    say(`app      ${root} · ${script}${runnerArgs.length ? ` (${runnerArgs.join(' ')})` : ''} …`);
    const r = runScript(root, script, c.timeoutSec ? c.timeoutSec * 1000 : TIMEOUT, runnerArgs);
    checks.push({ root, check: script, ...(c.id === 'lint' ? { scope: 'lane' } : {}), ...(runnerArgs.length ? { runnerArgs } : {}), ok: r.ok, ms: r.ms, tail: r.tail });
    if (VERIFYING.has(c.id)) ranVerifying++;
    if (!r.ok) {
      verdict = 'red';
      reasons.push(`${root}: \`npm run ${script}\` failed`);
      red = true;
      break; // first red stops that app — fix it before spending on the rest
    }
  }
  // No-deps lane (324.b): nothing npm could run, but the diff is plain Node JS — verify it with Node alone.
  // `node --check` is an extra check (red on a syntax error), never a verifying one: only a `node:test`
  // file that ran counts, so a JS diff with no Node test still meets the floor below.
  let noDepsWhy = noDeps && !noDeps.ok ? noDeps.why : null;
  if (!red && ranVerifying === 0 && noDeps?.ok) {
    const syn = nodeSyntaxCheck(noDeps.js);
    checks.push({ root, check: 'node-check (no-deps)', ok: syn.bad.length === 0, files: syn.count, tail: syn.bad.join('\n') });
    say(`app      ${root} · node --check (no-deps) on ${syn.count} file(s) ${syn.bad.length ? '✗' : '✓'}`);
    if (syn.bad.length) {
      verdict = 'red'; red = true;
      reasons.push(`${root}: syntax error in ${syn.bad.length} file(s) (no-deps lane, node --check)`);
    } else if (!noDeps.tests.length) {
      noDepsWhy = `no-deps: ${syn.count} JS file(s) changed but no node:test file in the diff — install deps or add a zero-install test`;
    } else {
      const skippedScripts = checks.filter((c) => c.root === root && c.skipped === 'toolchain-absent').map((c) => c.check);
      for (const c of checks) if (c.root === root && c.skipped === 'toolchain-absent') c.skipped = 'no-deps';
      say(`app      ${root} · node --test (no-deps) on ${noDeps.tests.length} file(s) …`);
      const r = runNodeTest(root, noDeps.tests);
      checks.push({ root, check: 'node-test (no-deps)', ok: r.ok, ms: r.ms, files: noDeps.tests.length, tail: r.tail });
      ranVerifying++;
      if (!r.ok) { verdict = 'red'; red = true; reasons.push(`${root}: \`node --test\` failed (no-deps lane)`); }
      noDepsRoots.push({ root, tests: noDeps.tests.length, js: syn.count, skippedScripts });
    }
  }
  // The floor: skipping is allowed, verifying nothing is not.
  if (!red && ranVerifying === 0) {
    verdict = 'blocked';
    reasons.push(`${root}: no verifying check could actually run — every one needs a toolchain that is not installed. Install its deps, or give it a zero-install test script (\`node --test\`). The no-deps lane (node --check / node --test, no install) covers a diff of plain Node JS with at least one node:test file${noDepsWhy ? ` — not this one: ${noDepsWhy}` : ''}.`);
    checks.push({ root, check: 'capability', ok: false, tail: 'all verifying checks skipped (toolchain absent)' });
  }
}

// The heavy phase is over (green or red): give the slot back now — what follows is light. The exit hook covers a throw.
if (slot?.ok && !slot.reentrant && slot.release()) console.error(`heavy-slot: ${slot.name} released`);

// ── Cadrage (v318.a): a NEW intervention / task file must carry Journey + Proof ──────────────
// The two-moment contract was honour-system outside the hub: only `npm run doctor` (E9) checked
// it, and apps never run the hub doctor — Journey 37% / Proof 28% of new files. Judged here, at
// /land, in every app. ADDED files only (committed vs the trunk, plus staged/untracked): a file
// that already exists is never retro-failed. Accepted forms are exactly the ones
// scripts/method-doctor.mjs E9 accepts — keep the two in sync — and so is its FORWARD-ONLY rule: a file
// created before the cutover was written before the rule existed. Three guards keep a status change from
// reading as a new file (the false red on `001-a ⬜ …` → `001-a ✅ …` with a report appended):
//   1. `git diff --find-renames`, so a rename is `R`, not `A`;
//   2. a task whose `NNN-x` sequence ID already exists at the merge base is the same task under a new name
//      (appending a report can push similarity under git's rename threshold, so 1 alone is not enough);
//   3. `**Created:**` before the cutover (tasks) / a date before it in the filename (interventions).
const CUJ_CUTOVER = '2026-09-06';
const createdOf = (body) => (/\*\*Created\*\*:\s*(\d{4}-\d{2}-\d{2})/.exec(body) ?? /\*\*Created:\*\*\s*(\d{4}-\d{2}-\d{2})/.exec(body))?.[1];
const sequenceId = (f) => /^(\d+-[a-z0-9]+)\b/i.exec(f.split('/').pop())?.[1].toLowerCase() ?? null;
// `core.quotepath=off`: a task file is named `047-a ⬜ Brian - …` — with the default, git prints it
// octal-escaped and the path no longer resolves on disk, so the file would silently go unjudged.
const PLAIN = ['-c', 'core.quotepath=off'];

/** The task sequence IDs that already exist in the tree at `mergeBase` (`git ls-tree -r --name-only`). */
function taskIdsAt(mergeBase) {
  const ids = new Set();
  if (!mergeBase) return ids;
  for (const f of gitOut([...PLAIN, 'ls-tree', '-r', '--name-only', mergeBase], REPO).split('\n')) {
    const path = f.replace(/^"|"$/g, '').replace(/\\/g, '/');
    if (path && isCadrageFile(path) && sequenceId(path)) ids.add(sequenceId(path));
  }
  return ids;
}

function addedFiles() {
  const out = new Set();
  const unquote = (f) => f.replace(/^"|"$/g, '');
  const plain = PLAIN;
  const mergeBase = gitOut(['merge-base', 'HEAD', BASE], REPO);
  if (mergeBase) {
    for (const f of gitOut([...plain, 'diff', '--find-renames', '--name-only', '--diff-filter=A', `${mergeBase}..HEAD`], REPO).split('\n')) {
      if (f) out.add(unquote(f));
    }
  }
  for (const line of (git([...plain, 'status', '--porcelain'], REPO).stdout ?? '').split('\n')) {
    if (line.length < 4) continue;
    const code = line.slice(0, 2);
    if (code === '??' || code[0] === 'A') {
      const f = unquote(line.slice(3).split(' -> ').pop().trim());
      if (f) out.add(f);
    }
  }
  return [...out].map((f) => f.replace(/\\/g, '/'));
}
/** An intervention (`docs/interventions/*.md`) or a sprint task file (`docs/sprints/**`, named `NNN-x …`). */
function isCadrageFile(f) {
  if (!/\.md$/i.test(f)) return false;
  const base = f.split('/').pop();
  if (/^(README|CLOSED)\.md$/i.test(base) || /-REVIEW\.md$/i.test(base)) return false;
  if (/(^|\/)docs\/(project\/)?interventions\/[^/]+\.md$/.test(f)) return true;
  return /(^|\/)docs\/(project\/)?sprints\/.+\.md$/.test(f) && !/(^|\/)reports\//.test(f) && /^\d+-[a-z0-9]+\b/i.test(base);
}
// `**Journey:**` / `**Journey**:` inline, or a `## Journey` heading — both record the Cadrage.
const hasCadrageField = (body, field) => new RegExp(`\\*\\*${field}(?::\\*\\*|\\*\\*:)|^#{2,3} ${field}\\b`, 'm').test(body);

const noCadrage = [];
const baseTaskIds = taskIdsAt(gitOut(['merge-base', 'HEAD', BASE], REPO));
for (const f of addedFiles().filter(isCadrageFile)) {
  if (!existsSync(join(REPO, f))) continue;
  const base = f.split('/').pop();
  const isIntervention = /(^|\/)docs\/(project\/)?interventions\//.test(f);
  const id = isIntervention ? null : sequenceId(f);
  if (id && baseTaskIds.has(id)) continue; // the same task, renamed (status emoji, folder) — not a new file
  const body = readFileSync(join(REPO, f), 'utf8');
  const dated = isIntervention ? /^(\d{4}-\d{2}-\d{2})-/.exec(base)?.[1] : createdOf(body);
  if (dated && dated < CUJ_CUTOVER) continue; // forward-only: written before the rule existed
  const missing = ['Journey', 'Proof'].filter((field) => !hasCadrageField(body, field));
  if (missing.length) noCadrage.push(`${f} (no ${missing.join(' / ')})`);
}
if (noCadrage.length) {
  checks.push({ root: '.', check: 'cadrage', ok: false, tail: `new file(s) without Journey/Proof — Cadrage was skipped:\n${noCadrage.join('\n')}` });
  if (verdict !== 'blocked') verdict = 'red';
  reasons.push(`cadrage: ${noCadrage.length} new intervention/task file(s) without Journey + Proof — ${noCadrage.slice(0, 3).join('; ')}${noCadrage.length > 3 ? ` +${noCadrage.length - 3} more` : ''}`);
  say(`cadrage  ${noCadrage.length} new file(s) without Journey/Proof ✗`);
}

const marker = {
  sha: HEAD,
  branch: BRANCH,
  base: BASE,
  at: new Date().toISOString(),
  mode,
  verdict,
  reasons,
  files: files.length,
  deleted: deletedFiles.size,
  lanes: laneCounts,
  apps: [...appRoots],
  skipped,
  checks,
  ...(noDepsRoots.length ? { noDeps: noDepsRoots.map((n) => n.root) } : {}),
  ...(lockInfo ? { lock: lockInfo } : {}),
  ...(slotInfo ? { heavySlot: slotInfo } : {}),
};

const dir = join(REPO, '.method');
if (!existsSync(dir)) mkdirSync(dir, { recursive: true });
writeFileSync(join(dir, 'verify-ok.json'), JSON.stringify(marker, null, 2) + '\n');

if (AS_JSON) console.log(JSON.stringify(marker, null, 2));
else {
  const icon = { green: '✓', red: '✗', blocked: '⛔' }[verdict];
  say('');
  console.log(`${icon} verify ${verdict} · mode=${mode} · ${files.length} file(s) · ${HEAD.slice(0, 7)}`);
  if (skipped.length) {
    console.log(`  ⚠ NOT CHECKED (no node_modules): ${skipped.join(', ')} — this is not a pass, it is an unrun check`);
  }
  for (const n of noDepsRoots) {
    console.log(`  ⚠ NO-DEPS ${n.root}: ran node --test on ${n.tests} file(s), node --check on ${n.js} file(s); skipped npm scripts: ${n.skippedScripts.join(', ') || 'none'}`);
  }
  for (const r of reasons) console.log(`  – ${r}`);
  for (const c of checks.filter((c) => !c.ok && c.tail)) console.log(`\n[${c.root} ${c.check}]\n${c.tail}`);
}

process.exit(verdict === 'green' ? 0 : verdict === 'red' ? 1 : 2);

function fail(msg) { console.error(`verify-gate: ${msg}`); process.exit(2); }
