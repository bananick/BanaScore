#!/usr/bin/env node
/**
 * .claude/hooks/wip-sync.mjs — Stop hook: mirror UNCOMMITTED work on a private ref of GitHub.
 *
 * On a feature branch with a dirty tree it builds a snapshot commit (changed + untracked files,
 * .gitignore honoured) and pushes it to `refs/wip/<branch>`:
 *   - the snapshot is built in a TEMPORARY index (GIT_INDEX_FILE) — the real index, the working
 *     tree and the branch are never touched, no commit lands on the branch;
 *   - parent = HEAD, so the WIP shows as "the branch + one commit of uncommitted work";
 *   - the push is `+<sha>:refs/wip/<branch>` — forced on that private ref only, never on a branch.
 * Clean tree ⇒ the WIP ref (remote + local mirror) is deleted if it exists.
 *
 * A push cannot be undone (deleting a ref does not purge objects on GitHub), so every guard below is
 * best-effort defence in depth — a denylist is NOT a guarantee that no secret ever leaves the machine.
 * The guards fail CLOSED: any doubt means nothing is pushed.
 *   1. Kill switch: `git config wip-sync.enabled false` (any git boolean: no/off/0/false) disables the hook for that repo.
 *   2. Only when HEAD is already on a branch of `origin` (so the snapshot adds only the uncommitted delta).
 *   3. Only when `origin` is private (`gh repo view <origin url> --json visibility`; a PRIVATE answer
 *      is cached 1 h in `<gitdir>/wip-sync.visibility`, anything else never); unknown / gh unavailable ⇒ no push.
 *      Refused unless origin has exactly ONE fetch URL and ONE push URL and they are equal (pushurl,
 *      pushInsteadOf, extra `remote.origin.url` entries).
 *   4. The path list is filtered BEFORE `git add`, so a denied file is never hashed into .git/objects:
 *      secret-shaped names, build/dependency dirs, files over 5 MB, `.method/`, the telemetry ledger, and any
 *      file whose CONTENT looks like a credential (private key, service-account JSON, and the well-known API token shapes of GitHub, Stripe, AWS, Google, Anthropic, OpenAI, HubSpot and Slack).
 *      A tracked file that is denied keeps its HEAD entry (it is not recorded as deleted).
 *   5. After write-tree, every path that differs from HEAD is re-checked against the same rules.
 * What was skipped, and why (names only, never contents), is in `<gitdir>/wip-sync.last-skipped`.
 *
 * Ordering: Stop hooks run in parallel, so this hook is independent of `land.mjs --auto` and `ship-push.sh`
 * and safe in either order — land refuses a dirty tree, this one only reads the tree and writes a private ref.
 *
 * Fail-open for the session: always exits 0. A failure is NEVER swallowed: it goes to stderr, to a
 * systemMessage, and to `<gitdir>/wip-sync.last-error`; a success clears that marker.
 * No-op on the trunk / master / detached HEAD / no `origin`.
 */
import { spawnSync } from 'node:child_process';
import { existsSync, lstatSync, mkdirSync, readFileSync, rmSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';
import { dirtyPaths, runGh, trunkOf } from './lib/branch-hygiene.mjs';

const MAX_UNTRACKED = 5000;
const MAX_FILE_BYTES = 5 * 1024 * 1024;
const VISIBILITY_TTL_MS = 3_600_000; // only a PRIVATE answer is ever cached
const NUL = String.fromCharCode(0);

const git = (args, opts = {}) => spawnSync('git', args, { encoding: 'utf8', timeout: 25_000, ...opts });
const out = (args, opts) => (git(args, opts).stdout ?? '').trim();
/** Every git call in the snapshot path goes through here: a non-zero exit, a timeout or a lock is an error. */
function must(args, opts = {}) {
  const r = git(args, opts);
  if (r.error || r.status !== 0) {
    const why = r.error ? (r.error.code ?? r.error.message) : ((r.stderr ?? '').trim().split('\n').pop() || `exit ${r.status}`);
    throw new Error(`git ${args.slice(0, 3).join(' ')}: ${why}`);
  }
  return r.stdout ?? '';
}

// ── what must never leave the machine ────────────────────────────────────────
const DENY_DIRS = new Set(['node_modules', 'dist', 'out', '.next', 'build', 'coverage', '.firebase', '.turbo', '.vercel', '.auth']);
const DENY_NAMES = [
  /^\.env/i, /\.env$/i, /\.(pem|key|p12|pfx|keystore|p8|jks|ppk|har)$/i, /^id_rsa/i, /^id_ed25519/i,
  /^credentials.*\.json$/i, /^service-account.*\.json$/i, /-firebase-adminsdk-.*\.json$/i, /^serviceAccountKey.*\.json$/i,
  /^\.runtimeconfig\.json$/i, /^token\.json$/i, /^\.mcp\.json$/i, /secret/i, /^\.npmrc$/i, /^\.netrc$/i,
  /^\.yarnrc\.yml$/i, /^\.git-credentials$/i, /^trace\.zip$/i,
];
// Written so that this very file does not match its own patterns.
const SECRET_CONTENT = [
  /-----BEGIN [A-Z ]*PRIVATE KEY-----/, /"private_key"\s*:/, /"type"\s*:\s*"service_account"/,
  /ghp_[A-Za-z0-9]{20,}/, /sk_li[v]e_/, /AKIA[0-9A-Z]{16}/,
  /sk-ant-[A-Za-z0-9_-]{20,}/, /sk-proj-[A-Za-z0-9_-]{20,}/, /AIza[0-9A-Za-z_-]{35}/, /pat-(na|eu)1-[0-9a-f-]{20,}/,
  /github_pat_[A-Za-z0-9_]{20,}/, /gh[ousr]_[A-Za-z0-9]{20,}/, /rk_li[v]e_/, /whse[c]_/, /xox[abprs]-[A-Za-z0-9-]{10,}/,
];

function denyReason(path) {
  const parts = path.split('/');
  if (parts.slice(0, -1).some((d) => DENY_DIRS.has(d.toLowerCase()))) return 'build/dependency/auth directory';
  if (path.startsWith('.method/') || path === 'docs/project/telemetry/sessions.jsonl') return 'local state';
  return DENY_NAMES.some((re) => re.test(parts[parts.length - 1])) ? 'secret-shaped name' : null;
}

/** Why a worktree file must not be hashed, or null. Reads the file itself — nothing is written to .git/objects. */
function fileReason(path) {
  const byName = denyReason(path);
  if (byName) return byName;
  let st;
  try { st = lstatSync(path); } catch { return null; } // gone: a deletion, nothing to read
  if (st.isSymbolicLink() || !st.isFile()) return null;
  if (st.size > MAX_FILE_BYTES) return `larger than ${MAX_FILE_BYTES / 1024 / 1024} MB`;
  const buf = readFileSync(path);
  if (buf.subarray(0, 8000).includes(0)) return null; // binary: judged by name only
  const text = buf.toString('latin1');
  return SECRET_CONTENT.some((re) => re.test(text)) ? 'content looks like a credential' : null;
}

function fail(gitDir, msg) {
  console.error(`wip-sync: ${msg}`);
  try { writeFileSync(join(gitDir, 'wip-sync.last-error'), `${new Date().toISOString()} ${msg}\n`); } catch { /* the stderr line above is the record */ }
  console.log(JSON.stringify({ systemMessage: `⚠ wip-sync failed — uncommitted work is NOT mirrored on GitHub: ${msg}` }));
}

/** `true` only on a positive PRIVATE/INTERNAL answer; anything else (gh missing, unknown, public) is `false` + a note. */
function originIsPrivate(root, gitDir, notes) {
  const cache = join(gitDir, 'wip-sync.visibility');
  const url = out(['remote', 'get-url', 'origin']);
  let visibility = null;
  try {
    const c = JSON.parse(readFileSync(cache, 'utf8'));
    if (c.url === url && Date.now() - c.at < VISIBILITY_TTL_MS && typeof c.visibility === 'string') visibility = c.visibility;
  } catch { /* no usable cache */ }
  if (!visibility) {
    const r = runGh(['repo', 'view', url, '--json', 'visibility'], { cwd: root, timeout: 15_000 });
    try { visibility = r.error || r.status !== 0 ? null : String(JSON.parse(r.stdout || '{}').visibility ?? '').toUpperCase() || null; } catch { visibility = null; }
    if (!visibility) { notes.push('NOT PUSHED: origin visibility unknown (gh unavailable or no answer)'); return false; }
    // Only a positive answer is cached; a non-private (or unknown) answer is asked again next time.
    if (visibility === 'PRIVATE' || visibility === 'INTERNAL') {
      try { writeFileSync(cache, JSON.stringify({ at: Date.now(), url, visibility })); } catch { /* cache is an optimisation */ }
    }
  }
  if (visibility !== 'PRIVATE' && visibility !== 'INTERNAL') { notes.push(`NOT PUSHED: origin is ${visibility}, not private`); return false; }
  return true;
}

function main() {
  const root = out(['rev-parse', '--show-toplevel']);
  if (!root) return;
  process.chdir(root);
  const gitDir = out(['rev-parse', '--absolute-git-dir']);
  const branch = out(['rev-parse', '--abbrev-ref', 'HEAD']);
  if (!branch || branch === 'HEAD' || branch === 'master' || branch === trunkOf(root)) return;
  // Kill switch, read as a git boolean: no/off/0/false disable it; an unparsable value also disables it (fail closed).
  const sw = git(['config', '--type=bool', '--get', 'wip-sync.enabled']);
  if ((sw.status === 0 && sw.stdout.trim() === 'false') || (sw.status !== 0 && sw.status !== 1)) return;
  if (git(['remote', 'get-url', 'origin']).status !== 0) return;

  const ref = `refs/wip/${branch}`;
  const mirror = git(['rev-parse', '--verify', '--quiet', ref]);
  const clearMarker = () => rmSync(join(gitDir, 'wip-sync.last-error'), { force: true });
  const skippedFile = join(gitDir, 'wip-sync.last-skipped');
  const notes = [];
  const writeSkipped = (names) => {
    const lines = [...notes.map((n) => `# ${n}`), ...names];
    if (lines.length) writeFileSync(skippedFile, lines.join('\n') + '\n');
    else rmSync(skippedFile, { force: true });
  };

  // Nothing uncommitted: the WIP ref (if we ever pushed one) has served its purpose.
  const dropWip = () => {
    if (mirror.status === 0) {
      const r = git(['push', 'origin', `:${ref}`], { env: { ...process.env, SKIP_QUALITY_GATES: '1' } });
      if (r.status === 0 || /remote ref does not exist/i.test(r.stderr ?? '')) { git(['update-ref', '-d', ref]); clearMarker(); }
      else fail(gitDir, `could not delete ${ref}: ${(r.stderr ?? '').trim().split('\n').pop()}`);
    } else clearMarker();
  };
  if (dirtyPaths(root).length === 0) { writeSkipped([]); return dropWip(); }

  // Guards that need no snapshot at all.
  const urls = (args) => { const r = git(['remote', 'get-url', ...args, 'origin']); return r.status === 0 ? (r.stdout ?? '').split(/\r?\n/).map((l) => l.trim()).filter(Boolean) : null; };
  const fetchUrls = urls(['--all']);
  const pushUrls = urls(['--push', '--all']);
  if (!fetchUrls || !pushUrls || fetchUrls.length !== 1 || pushUrls.length !== 1 || fetchUrls[0] !== pushUrls[0]) {
    notes.push('NOT PUSHED: origin must have exactly one fetch URL and one equal push URL (pushurl / pushInsteadOf / extra url entries) — refusing'); return writeSkipped([]);
  }
  if (!out(['for-each-ref', '--contains', 'HEAD', '--format=%(refname)', 'refs/remotes/origin'])) {
    notes.push('NOT PUSHED: HEAD is not on any origin branch yet (push the branch first)'); return writeSkipped([]);
  }

  mkdirSync(gitDir, { recursive: true });
  const tmpIndex = join(gitDir, 'wip-sync.index');
  const env = { ...process.env, GIT_INDEX_FILE: tmpIndex, GIT_LITERAL_PATHSPECS: '1' };
  try {
    rmSync(tmpIndex, { force: true });
    const head = must(['rev-parse', 'HEAD']).trim();
    // 1 ─ the candidate list, from the REAL tree: changed tracked files + untracked (ignore rules honoured).
    const changed = must(['diff', '--no-renames', '--name-only', '-z', 'HEAD']).split(NUL).filter(Boolean);
    const untracked = must(['ls-files', '--others', '--exclude-standard', '-z']).split(NUL).filter(Boolean);
    if (untracked.length > MAX_UNTRACKED) return fail(gitDir, `${untracked.length} untracked files (> ${MAX_UNTRACKED}) — refusing to snapshot; fix .gitignore`);
    // 2 ─ judged BEFORE hashing: name, size, content. A denied tracked file keeps its HEAD entry in the temp index.
    const allowed = new Set();
    const skipped = [];
    for (const p of new Set([...changed, ...untracked])) {
      const why = fileReason(p);
      if (why) skipped.push(`${p}  (${why})`); else allowed.add(p);
    }
    // 3 ─ the temp index = HEAD + only the allowed paths.
    must(['read-tree', 'HEAD'], { env });
    if (allowed.size) must(['add', '-A', '--pathspec-from-file=-', '--pathspec-file-nul'], { env, input: [...allowed].join(NUL) });
    const tree = must(['write-tree'], { env }).trim();
    if (!tree) throw new Error('write-tree produced nothing');
    // 4 ─ verify the result, independently of the filter above: every path that differs from HEAD must be one we vetted.
    const delta = must(['diff-tree', '-r', '--no-renames', '--name-only', '-z', head, tree]).split(NUL).filter(Boolean);
    for (const p of delta) {
      if (!allowed.has(p) || denyReason(p)) throw new Error(`verification failed: ${p} is in the snapshot but was not cleared`);
    }
    writeSkipped(skipped);
    if (!delta.length) return dropWip(); // everything dirty was denied (or a no-op edit): nothing worth mirroring
    // Unchanged since the last snapshot (same tree, same parent)? Nothing to push.
    const prev = mirror.status === 0 ? out(['rev-parse', ref]) : '';
    if (prev && out(['rev-parse', `${prev}^{tree}`]) === tree && out(['rev-parse', `${prev}^`]) === head) return clearMarker();
    // 5 ─ only now ask whether GitHub may receive it.
    if (!originIsPrivate(root, gitDir, notes)) return writeSkipped(skipped);
    // Author/committer fall back to a fixed identity when the machine has none configured.
    const ident = git(['var', 'GIT_COMMITTER_IDENT']).status === 0 ? [] : ['-c', 'user.name=wip-sync', '-c', 'user.email=wip-sync@localhost'];
    const sha = must([...ident, 'commit-tree', tree, '-p', head, '-m', `wip-sync snapshot of ${branch}`], { env }).trim();
    if (!sha) throw new Error('commit-tree produced nothing');
    git(['update-ref', ref, sha]);
    const push = git(['push', 'origin', `+${sha}:${ref}`], { env: { ...process.env, SKIP_QUALITY_GATES: '1' }, timeout: 25_000 });
    if (push.status !== 0) {
      if (prev) git(['update-ref', ref, prev]); else git(['update-ref', '-d', ref]);
      return fail(gitDir, `push to ${ref} rejected: ${(push.stderr ?? '').trim().split('\n').slice(-2).join(' ') || `git exit ${push.status ?? push.error?.code ?? '?'}`}`);
    }
    clearMarker();
    console.log(JSON.stringify({ systemMessage: `☁ uncommitted work mirrored on GitHub: ${ref} (${sha.slice(0, 7)})` }));
  } catch (e) {
    fail(gitDir, e?.message ?? String(e)); // fail closed: nothing was pushed
  } finally {
    if (existsSync(tmpIndex)) rmSync(tmpIndex, { force: true });
  }
}

try { main(); } catch (e) { console.error(`wip-sync: ${e?.message ?? e}`); }
process.exit(0);
