#!/usr/bin/env node
/**
 * scripts/verify-gate.mjs — the METHOD verify gate (the only brake before main).
 *
 * There is no GitHub Actions CI and no branch protection on this account
 * (workflows removed 2026-06-28 `8b989e9`; protection API returns 403 on this plan).
 * Merging to `main` IS the deploy. So the gate runs locally, and it must be
 * machine-checkable — not prose an agent can claim to have honored.
 *
 * It classifies the diff against the trunk into three lanes, and only spends
 * build time on the lane that can actually break production:
 *
 *   doc      docs/, *.md, proto/, qa/, prompts/, *.jsonl → nothing to run (green)
 *   tooling  scripts/, .claude/, tools/, registries      → `node --check` on JS
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
const TIMEOUT = Number(flag('timeout', 900)) * 1000;

const say = (...a) => { if (!QUIET) console.log(...a); };

// ── git helpers ──────────────────────────────────────────────────────────────
const git = (args, cwd = process.cwd()) =>
  spawnSync('git', args, { cwd, encoding: 'utf8', timeout: 60_000 });
const gitOut = (args, cwd) => (git(args, cwd).stdout ?? '').trim();

const REPO = gitOut(['rev-parse', '--show-toplevel']);
if (!REPO) fail('not a git repository');

const HEAD = gitOut(['rev-parse', 'HEAD'], REPO);
const BRANCH = gitOut(['rev-parse', '--abbrev-ref', 'HEAD'], REPO);
const BASE = String(flag('base', 'origin/main'));

// ── the changed set (committed vs trunk + anything still in the tree) ────────
function changedFiles() {
  const out = new Set();
  const mergeBase = gitOut(['merge-base', 'HEAD', BASE], REPO);
  if (mergeBase) {
    for (const f of gitOut(['diff', '--name-only', `${mergeBase}..HEAD`], REPO).split('\n')) {
      if (f) out.add(f);
    }
  }
  // `git status --porcelain` lines carry a 2-char status field, and for an UNSTAGED
  // modification the first char is a SPACE. `gitOut` trims the whole output, which ate
  // that leading space and shifted the FIRST line's path by one character — surfacing as
  // a bogus "unclassifiable paths (fail closed)" that killed the gate. Parse untrimmed.
  const status = git(['status', '--porcelain'], REPO).stdout ?? '';
  for (const line of status.split('\n')) {
    if (line.length < 4) continue;
    const f = line.slice(3).split(' -> ').pop().trim().replace(/^"|"$/g, '');
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
  /^[^/]+\.json$/, /(^|\/)\.gitignore$/, /(^|\/)\.env\.example$/,
  /(^|\/)firebase\.json$/, /(^|\/)\.firebaserc$/,
];
const CODE_EXT = /\.(ts|tsx|js|jsx|mjs|cjs|vue|svelte|css|scss|html)$/i;

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

function classify(file) {
  if (DOC.some((r) => r.test(file))) return { lane: 'doc' };
  if (TOOLING.some((r) => r.test(file))) return { lane: 'tooling' };
  const root = appRootOf(file);
  if (root && root !== '.') return { lane: 'app', root };
  if (CODE_EXT.test(file)) return { lane: 'tooling' };       // loose hub-level script
  return { lane: 'unknown' };
}

// ── the checks ──────────────────────────────────────────────────────────────
const CHECK_ORDER = [
  { id: 'lint', scripts: ['lint'] },
  { id: 'typecheck', scripts: ['typecheck', 'type-check'] },
  { id: 'test', scripts: ['test'] },
  { id: 'build', scripts: ['build'] },
];
const VERIFYING = new Set(['typecheck', 'test', 'build']); // lint alone proves nothing ships

function readScripts(root) {
  try {
    return JSON.parse(readFileSync(join(REPO, root, 'package.json'), 'utf8')).scripts ?? {};
  } catch { return {}; }
}

function runScript(root, script) {
  const started = Date.now();
  const res = spawnSync(`npm run --silent ${script}`, {
    cwd: join(REPO, root),
    encoding: 'utf8',
    shell: true,
    timeout: TIMEOUT,
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
const lanes = { doc: [], tooling: [], app: [], unknown: [] };
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
  checks.push({ root: '.', check: 'node --check', ok: syn.bad.length === 0, files: syn.count, tail: syn.bad.join('\n') });
  if (syn.bad.length) { verdict = 'red'; reasons.push(`syntax error in ${syn.bad.length} tooling file(s)`); }
  say(`tooling  ${lanes.tooling.length} file(s) · node --check ${syn.bad.length ? '✗' : '✓'}`);
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
      checks.push({ root, check: script, ok: true, skipped: 'toolchain-absent' });
      skipped.push(`${root}:${script}`);
      say(`app      ${root} · ${script} — SKIPPED, no node_modules`);
      continue;
    }
    say(`app      ${root} · ${script} …`);
    const r = runScript(root, script);
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

const mode = appRoots.size ? 'app' : lanes.tooling.length ? 'tooling' : 'docs-only';
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
