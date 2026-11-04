// .claude/hooks/lib/claude-drift.mjs — do the files the app seeds from the MAIN checkout still match the trunk's addon payload?
//
// The Claude desktop app seeds every new or recycled worktree with exactly the main checkout's IGNORED .claude/ files
// (`git ls-files --others --ignored --exclude-standard -- .claude`, proved byte for byte on 2026-11-02). Every worktree
// therefore runs the main checkout's land.mjs, verify-gate.mjs and commands, whatever its own branch says, and
// `git status` shows nothing. A METHOD sync landed from a worktree moves the trunk's payload on and leaves the main
// checkout where it was; only a fleet sync run on that checkout reinstalls it. This check names the difference, so
// flight-deck's SessionStart(startup) hook can say it in one line.
//
// The silent path spawns no git process: one spawn costs ~300 ms on the operator's machine and the hook has 200 ms.
// The worktree link, HEAD and the trunk ref (loose or packed) are read from .git directly, and the main checkout's
// index (v2/v3/v4) only once something differs. Only an untracked file that differs or is missing pays for one
// `git check-ignore`, which keeps the warning true: the app copies ignored files, not merely untracked ones. The reference is THIS checkout's payload, used only when its HEAD is the
// trunk commit, so an old branch neither raises nor hides a warning (reftable, sha256 surprises or any read error →
// null, silent). A main checkout whose methodVersion is newer than this checkout's is skipped: a fleet sync got there
// before the trunk, and "fixing" it would install older hooks. CRLF-insensitive.
import { spawnSync } from 'node:child_process';
import { existsSync, readFileSync, readdirSync } from 'node:fs';
import { basename, dirname, join, resolve } from 'node:path';

export const PAYLOAD_REL = 'docs/METHOD/tools/swanifly-claude-addon/payload';
/** Payload sub-trees install.mjs copies file for file into `.claude/` (skills are tracked in the apps, so never seeded). */
export const CHECKED_DIRS = ['hooks', 'commands'];
/** Files under CHECKED_DIRS that install.mjs does not install, relative to the payload. tests/claude-drift.test.mjs keeps it honest. */
export const NOT_INSTALLED = [];
/** Present only in the hub, whose own tracked .claude is held to the payload by the doctor (E5). */
export const HUB_MARKER = 'scripts/sync-method-to-all-apps.mjs';
/** Tried in order; the first that resolves is the trunk. */
export const TRUNK_REFS = ['refs/remotes/origin/HEAD', 'refs/remotes/origin/main', 'refs/heads/main'];
/** Declares the METHOD version of a checkout; a sync bumps it. */
const SETTINGS_REL = 'docs/METHOD/app-settings.json';

const lf = (buf) => buf.toString('latin1').replace(/\r\n/g, '\n');

/** cwd → { root, gitDir, commonDir } of the checkout that contains it, or null. */
export function locateRepo(cwd) {
  let dir = resolve(cwd);
  for (let i = 0; i < 64; i++) {
    const dotGit = join(dir, '.git');
    if (existsSync(dotGit)) {
      let gitDir = dotGit;
      try {
        const link = /^gitdir:\s*(.+?)\s*$/m.exec(readFileSync(dotGit, 'utf8'));
        if (link) gitDir = resolve(dir, link[1]);
      } catch { /* a directory: the main checkout */ }
      let commonDir = gitDir;
      const cd = join(gitDir, 'commondir');
      if (existsSync(cd)) commonDir = resolve(gitDir, readFileSync(cd, 'utf8').trim());
      return { root: dir, gitDir, commonDir };
    }
    const up = dirname(dir);
    if (up === dir) return null;
    dir = up;
  }
  return null;
}

/** A ref → its object id: HEAD from the checkout's own git dir, every other ref from the common dir, loose then packed. */
export function readRef(repo, name, depth = 0) {
  if (depth > 5) return null;
  try {
    const s = readFileSync(join(name === 'HEAD' ? repo.gitDir : repo.commonDir, name), 'utf8').trim();
    if (s.startsWith('ref: ')) return readRef(repo, s.slice(5).trim(), depth + 1);
    if (/^[0-9a-f]{40}([0-9a-f]{24})?$/.test(s)) return s;
  } catch { /* not loose */ }
  try {
    for (const line of readFileSync(join(repo.commonDir, 'packed-refs'), 'utf8').split('\n')) {
      const m = /^([0-9a-f]{40}(?:[0-9a-f]{24})?) (.+?)\r?$/.exec(line);
      if (m && m[2] === name) return m[1];
    }
  } catch { /* no packed-refs */ }
  return null;
}

/**
 * Paths in a git index (v2/v3/v4) that start with `prefix`. Throws on a format it does not understand. A split index
 * lists fewer entries: a tracked file then reaches the comparison, and keepSeeded drops it before anything is said.
 */
export function indexPaths(file, { prefix = '', hashLen = 20 } = {}) {
  const buf = readFileSync(file);
  if (buf.toString('latin1', 0, 4) !== 'DIRC') throw new Error('not an index');
  const version = buf.readUInt32BE(4);
  if (version < 2 || version > 4) throw new Error(`index v${version}`);
  const count = buf.readUInt32BE(8);
  const pre = Buffer.from(prefix, 'utf8');
  const preBytes = pre.toString('latin1');
  const out = new Set();
  let at = 12;
  let prev = '';
  for (let i = 0; i < count; i++) {
    const flagsAt = at + 40 + hashLen;
    const flags = buf.readUInt16BE(flagsAt);
    let p = flagsAt + 2;
    if (version >= 3 && (flags & 0x4000)) p += 2;
    if (version === 4) {
      // Prefix-compressed names: every one is needed to rebuild the next. The strip count is in bytes, so `prev`
      // holds bytes (latin1) and only a kept name is decoded.
      let c = buf[p++];
      let strip = c & 127;
      while (c & 128) { c = buf[p++]; strip = ((strip + 1) << 7) + (c & 127); }
      const end = buf.indexOf(0, p);
      if (end < 0 || strip > prev.length) throw new Error('bad v4 entry');
      prev = prev.slice(0, prev.length - strip) + buf.toString('latin1', p, end);
      if (prev.startsWith(preBytes)) out.add(Buffer.from(prev, 'latin1').toString('utf8'));
      at = end + 1;
    } else {
      const end = buf.indexOf(0, p);
      if (end < 0) throw new Error('bad entry');
      // Decode only the names under the prefix: ~13 k entries in an app, a few dozen wanted.
      if (end - p >= pre.length && buf.compare(pre, 0, pre.length, p, p + pre.length) === 0) out.add(buf.toString('utf8', p, end));
      at += (p - at + (end - p) + 8) & ~7;
    }
  }
  return out;
}

function walk(dir, rel = '') {
  const out = [];
  for (const e of readdirSync(join(dir, rel), { withFileTypes: true })) {
    const r = rel ? `${rel}/${e.name}` : e.name;
    if (e.isDirectory()) out.push(...walk(dir, r));
    else if (e.isFile()) out.push(r);
  }
  return out;
}

/** Payload-relative files the installer copies under CHECKED_DIRS, hooks first: if the budget cuts the comparison, they matter most. */
export function payloadFiles(payload, notInstalled = NOT_INSTALLED) {
  const skip = new Set(notInstalled);
  return CHECKED_DIRS.flatMap((d) => (existsSync(join(payload, d)) ? walk(payload, d).sort() : [])).filter((r) => !skip.has(r));
}

/**
 * The payload-relative `rels` the app really seeds from `mainRoot`: git ignores their `.claude/` path there. A tracked
 * or merely untracked file is neither copied nor reported. null when git fails.
 */
export function keepSeeded(mainRoot, rels) {
  if (!rels.length) return [];
  const r = spawnSync('git', ['-C', mainRoot, 'check-ignore', '-z', '--stdin'], {
    input: rels.map((x) => `.claude/${x}\0`).join(''), encoding: 'utf8', timeout: 2000, windowsHide: true,
  });
  if (r.error || (r.status !== 0 && r.status !== 1)) return null;
  const ignored = new Set(r.stdout.split('\0').filter(Boolean));
  return rels.filter((x) => ignored.has(`.claude/${x}`));
}

/** `338.a` against `337.d`: > 0 when `a` is newer; 0 when either cannot be read. */
export function compareMethodVersions(a, b) {
  const parse = (v) => /^(\d+)\.([a-z]+)$/.exec(String(v ?? ''));
  const [x, y] = [parse(a), parse(b)];
  if (!x || !y) return 0;
  return Number(x[1]) - Number(y[1]) || x[2].length - y[2].length || x[2].localeCompare(y[2]);
}

function methodVersionOf(root) {
  try { return JSON.parse(readFileSync(join(root, SETTINGS_REL), 'utf8')).methodVersion ?? null; } catch { return null; }
}

/**
 * @returns {null | { mainRoot: string, ref: string|null, differs: string[], missing: string[], cut?: boolean, skipped?: string }}
 *   null when anything fails; `differs` / `missing` are payload-relative.
 *   `skipped`: not-at-trunk · hub · main-ahead · no-payload · not-installed · over-budget — nothing to say.
 *   `budgetMs`: past it the comparison stops (a busy disk can turn 60 ms of reads into 500). With nothing found yet it is
 *   silent and the next session retries; with something found it says that, `cut: true`, since the dry-run lists the rest.
 */
export function findClaudeDrift({ cwd = process.cwd(), refs = TRUNK_REFS, notInstalled = NOT_INSTALLED, budgetMs = 200, now = () => performance.now() } = {}) {
  const deadline = now() + budgetMs;
  try {
    const repo = locateRepo(cwd);
    if (!repo || basename(repo.commonDir) !== '.git') return null;
    const mainRoot = dirname(repo.commonDir).replace(/\\/g, '/');
    const none = (ref, skipped) => ({ mainRoot, ref, differs: [], missing: [], skipped });

    const head = readRef(repo, 'HEAD');
    let ref = null;
    let trunk = null;
    for (const r of refs) { trunk = readRef(repo, r); if (trunk) { ref = r; break; } }
    if (!head || !trunk) return null;
    if (head !== trunk) return none(ref, 'not-at-trunk');
    if (existsSync(join(repo.root, HUB_MARKER))) return none(ref, 'hub');
    if (compareMethodVersions(methodVersionOf(mainRoot), methodVersionOf(repo.root)) > 0) return none(ref, 'main-ahead');

    const payload = join(repo.root, PAYLOAD_REL);
    const files = payloadFiles(payload, notInstalled);
    if (!files.length) return none(ref, 'no-payload');

    const differs = [];
    const missing = [];
    const present = [];
    let cut = false;
    for (const rel of files) {
      if (now() > deadline) { cut = true; break; }
      const target = join(mainRoot, '.claude', rel);
      if (!existsSync(target)) { missing.push(rel); continue; }
      present.push(rel);
      if (lf(readFileSync(target)) !== lf(readFileSync(join(payload, rel)))) differs.push(rel);
    }
    if (!differs.length && !missing.length) return cut ? none(ref, 'over-budget') : { mainRoot, ref, differs, missing };

    // Something differs: only now is the index worth reading. A tracked file is not seeded, and git shows its drift.
    const tracked = indexPaths(join(repo.commonDir, 'index'), { prefix: '.claude/', hashLen: head.length / 2 });
    const untracked = (rel) => !tracked.has(`.claude/${rel}`);
    // Nothing installed at all is a checkout that does not use the addon, not a drift.
    if (!present.some(untracked)) return none(ref, cut ? 'over-budget' : 'not-installed');
    const seeded = keepSeeded(mainRoot, [...differs, ...missing].filter(untracked));
    if (seeded === null) return null;
    const keep = new Set(seeded);
    const found = { mainRoot, ref, differs: differs.filter((r) => keep.has(r)), missing: missing.filter((r) => keep.has(r)) };
    if (!cut) return found;
    return found.differs.length || found.missing.length ? { ...found, cut } : none(ref, 'over-budget');
  } catch {
    return null;
  }
}

/** One line for the operator, '' when there is nothing to say. */
export function formatDriftLine(drift, { max = 6 } = {}) {
  if (!drift || (!drift.differs.length && !drift.missing.length)) return '';
  const list = (xs) => xs.slice(0, max).join(', ') + (xs.length > max ? ` (+${xs.length - max})` : '');
  const parts = [];
  if (drift.differs.length) parts.push(`differs: ${list(drift.differs)}`);
  if (drift.missing.length) parts.push(`missing: ${list(drift.missing)}`);
  const root = drift.mainRoot;
  const cmd = `node ${dirname(PAYLOAD_REL)}/install.mjs ${/\s/.test(root) ? `"${root}"` : root} --seeded-only`;
  if (drift.cut) parts.push('check cut short, the dry-run lists everything');
  return `⚠ ${root}/.claude differs from the trunk's addon payload, and every new worktree inherits it — ${parts.join('; ')}. `
    + `Fix from a checkout at the trunk: \`${cmd} --dry-run\`, then the same without --dry-run.`;
}
