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
 *   doc      docs/, *.md, proto/, qa/, prompts/, *.jsonl → nothing to run (green)
 *   tooling  scripts/, .claude/, tools/, registries      → `node --check` on JS
 *   rules    telemetry-backend/firestore.{rules,indexes.json} → parsed and sanity-checked (below)
 *   app      real app code under an app root             → that app's npm checks
 *
 * Toolchain policy (operator's call, 2026-08-10): most roots in this fleet have no
 * `node_modules`, so `eslint`/`tsc`/`next` are absent — a missing toolchain, not broken
 * code. Failing the root on that froze it: nothing could land, so nothing got fixed. The
 * gate now runs what CAN run, requires that at least ONE verifying check actually
 * executed (else `blocked`), and names every skipped check in the report and the marker.
 * It never reports a skipped check as a pass.
 *
 * On green it stamps `.method/verify-ok.json` pinned to the current HEAD sha.
 * `scripts/land.mjs` refuses to land unless that marker matches HEAD, so a stale
 * green from three commits ago cannot wave work through.
 *
 * Usage:
 *   node scripts/verify-gate.mjs [--base origin/main] [--json] [--quiet]
 * Exit: 0 green · 1 red (a check failed) · 2 blocked (nothing can verify it)
 */
import { spawnSync } from 'node:child_process';
import { existsSync, mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import { dirname, join, relative, resolve } from 'node:path';

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
    for (const f of gitOut(['diff', '--name-only', `${mergeBase}..HEAD`], REPO).split('\n')) {
      if (f) out.add(unquote(f));
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
    if (f) out.add(f);
  }
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
];
// Firestore rules + indexes of the telemetry backend (`telemetry-backend/`, project swanifly-ia). Scoped to
// that folder on purpose: everywhere else these files stay "unclassifiable (fail closed)". Its `functions/`
// folder is an ordinary app root (own package.json: typecheck + test + build, needs `npm ci`).
const RULES = [/^telemetry-backend\/firestore\.(rules|indexes\.json)$/];
const CODE_EXT = /\.(ts|tsx|js|jsx|mjs|cjs|vue|svelte|css|scss|html)$/i;
// Narrower than CODE_EXT on purpose: the set a repo-root app's typecheck/test/build
// scripts would actually plausibly compile. css/html/vue/svelte at the repo root stay
// on the CODE_EXT/tooling fallback below even when the root is a verifying app root.
// `json` is app data the build consumes (`src/messages/*.json` i18n catalogues — a missing
// key fails `next build`); without it every i18n diff fell through all lanes into
// "unclassifiable (fail closed)" (2026-09-14). Root-level `*.json` never gets here:
// TOOLING's `/^[^/]+\.json$/` catches package.json & co first.
const ROOT_APP_EXT = /\.(ts|tsx|js|jsx|mjs|cjs|json)$/i;

/** Nearest ancestor directory holding a package.json (an "app root"), repo-relative. */
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
  if (TOOLING.some((r) => r.test(file))) return { lane: 'tooling' };
  if (RULES.some((r) => r.test(file))) return { lane: 'rules' };
  const root = appRootOf(file);
  if (root && root !== '.') return { lane: 'app', root };
  if (root === '.' && ROOT_APP_EXT.test(file) && rootHasVerifyingScript()) return { lane: 'app', root: '.' };
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

function runScript(root, script, timeoutMs = TIMEOUT) {
  const started = Date.now();
  const res = spawnSync(`npm run --silent ${script}`, {
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

// ── run ─────────────────────────────────────────────────────────────────────
const files = changedFiles();
const lanes = { doc: [], tooling: [], rules: [], app: [], unknown: [] };
const appRoots = new Set();
for (const f of files) {
  const c = classify(f);
  lanes[c.lane].push(f);
  if (c.lane === 'app') appRoots.add(c.root);
}

const checks = [];
const reasons = [];
const skipped = [];
let verdict = 'green';

if (!files.length) {
  reasons.push('nothing changed against ' + BASE);
}

if (lanes.unknown.length) {
  verdict = 'blocked';
  reasons.push(`unclassifiable paths (fail closed): ${lanes.unknown.slice(0, 5).join(', ')}`);
}

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

  // Self-gating: the gate cannot trust itself on prose alone. If this diff touches the
  // gate's own source or its test suite, and the root exposes `test:gate`, actually run
  // it — a passing `node --check` on `verify-gate.mjs` proves only that it parses, not
  // that it still behaves. Stays in the tooling lane on purpose: `.` is never added to
  // `appRoots` for this, it is a gate-specific check, not app verification.
  if (lanes.tooling.some((f) => /(^|\/)verify-gate\.mjs$|^tests\//.test(f))) {
    const rootScripts = readScripts('.');
    if (rootScripts['test:gate']) {
      say('tooling  self-test: npm run test:gate …');
      const r = runScript('.', 'test:gate');
      checks.push({ root: '.', check: 'test:gate', ok: r.ok, ms: r.ms, tail: r.tail });
      if (!r.ok) { verdict = 'red'; reasons.push('gate self-test failed'); }
    }
  }
}

if (lanes.rules.length) {
  const rc = rulesCheck(lanes.rules);
  checks.push({ root: '.', check: 'rules static check', ok: rc.bad.length === 0, files: rc.count, tail: rc.bad.join('\n') });
  if (rc.bad.length) { verdict = 'red'; reasons.push(`${rc.bad.length} invalid Firestore rules/indexes file(s): ${rc.bad.slice(0, 3).join('; ')}`); }
  say(`rules    ${rc.count} file(s) · static check ${rc.bad.length ? '✗' : '✓'}`);
}

for (const root of [...appRoots].sort()) {
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
    say(`app      ${root} · ${script} …`);
    const r = runScript(root, script, c.timeoutSec ? c.timeoutSec * 1000 : TIMEOUT);
    checks.push({ root, check: script, ok: r.ok, ms: r.ms, tail: r.tail });
    if (VERIFYING.has(c.id)) ranVerifying++;
    if (!r.ok) {
      verdict = 'red';
      reasons.push(`${root}: \`npm run ${script}\` failed`);
      red = true;
      break; // first red stops that app — fix it before spending on the rest
    }
  }
  // The floor: skipping is allowed, verifying nothing is not.
  if (!red && ranVerifying === 0) {
    verdict = 'blocked';
    reasons.push(`${root}: no verifying check could actually run — every one needs a toolchain that is not installed. Install its deps, or give it a zero-install test script (\`node --test\`).`);
    checks.push({ root, check: 'capability', ok: false, tail: 'all verifying checks skipped (toolchain absent)' });
  }
}

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

const mode = appRoots.size ? 'app' : lanes.rules.length ? 'rules' : lanes.tooling.length ? 'tooling' : 'docs-only';
const marker = {
  sha: HEAD,
  branch: BRANCH,
  base: BASE,
  at: new Date().toISOString(),
  mode,
  verdict,
  reasons,
  files: files.length,
  lanes: Object.fromEntries(Object.entries(lanes).map(([k, v]) => [k, v.length])),
  apps: [...appRoots],
  skipped,
  checks,
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
  for (const r of reasons) console.log(`  – ${r}`);
  for (const c of checks.filter((c) => !c.ok && c.tail)) console.log(`\n[${c.root} ${c.check}]\n${c.tail}`);
}

process.exit(verdict === 'green' ? 0 : verdict === 'red' ? 1 : 2);

function fail(msg) { console.error(`verify-gate: ${msg}`); process.exit(2); }
