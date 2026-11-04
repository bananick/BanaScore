/**
 * wip-sync.test.mjs — the Stop hook that mirrors uncommitted work on `refs/wip/<branch>`.
 *
 * Run: node --test docs/METHOD/tools/swanifly-claude-addon/tests/wip-sync.test.mjs
 *
 * Born from the 2026-11-01 failure: a stray file named `nul` made `git add` die with
 * "short read while indexing nul" / "fatal: adding files failed", and the whole batch — every other
 * file — went unmirrored. Cases:
 *   - the end-to-end run (real git, a bare `origin`, a stub `gh` through METHOD_GH_SCRIPT) mirrors the
 *     good files and NEVER a secret — `.env*`, a key-shaped name, a credential-shaped content;
 *   - a Windows device name (`nul`) is skipped by name and listed in `wip-sync.last-skipped`;
 *   - a path git cannot index no longer aborts the batch (`addPaths`: the others are still indexed);
 *   - the pure helpers (`denyReason`, `indexFailures`).
 *
 * Imports the PAYLOAD copy (`payload/hooks/`, tracked in git), not `.claude/hooks/` (gitignored). Every
 * case works in its own temp dir; nothing touches a real repository.
 */
import assert from 'node:assert/strict';
import { spawnSync } from 'node:child_process';
import { chmodSync, existsSync, mkdirSync, mkdtempSync, readFileSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { dirname, join } from 'node:path';
import { after, before, describe, test } from 'node:test';
import { fileURLToPath, pathToFileURL } from 'node:url';

const HERE = dirname(fileURLToPath(import.meta.url));
const HOOK = join(HERE, '..', 'payload', 'hooks', 'wip-sync.mjs');
const WIN = process.platform === 'win32';

// Credential-shaped content, assembled so that this file does not itself look like a leak to a scanner.
const FAKE_KEY = ['-----BEGIN ', 'RSA PRIVATE KEY-----', '\nMIIB\n-----END ', 'RSA PRIVATE KEY-----\n'].join('');

const git = (cwd, args, opts = {}) => {
  const r = spawnSync('git', args, { cwd, encoding: 'utf8', ...opts });
  assert.equal(r.status, 0, `git ${args.join(' ')} failed: ${r.stderr}`);
  return (r.stdout ?? '').trim();
};

let tmp;
let seq = 0;

/** A clone of a bare origin, on `feature/x`, HEAD already pushed, one tracked file `a.txt`. */
function fixture() {
  const dir = join(tmp, `case-${seq++}`);
  mkdirSync(dir, { recursive: true });
  const bare = join(dir, 'origin.git');
  const work = join(dir, 'work');
  git(dir, ['init', '--bare', '-b', 'main', bare]);
  git(dir, ['clone', bare, work]);
  git(work, ['config', 'user.name', 'test']);
  git(work, ['config', 'user.email', 'test@example.invalid']);
  git(work, ['checkout', '-b', 'main']);
  writeFileSync(join(work, 'a.txt'), 'one\n');
  git(work, ['add', 'a.txt']);
  git(work, ['commit', '-m', 'init']);
  git(work, ['push', '-u', 'origin', 'main']);
  git(work, ['checkout', '-b', 'feature/x']);
  git(work, ['push', '-u', 'origin', 'feature/x']);
  return { dir, bare, work };
}

/** Runs the hook in `work`. `gh` is a stub that answers PRIVATE. */
function runHook(work) {
  const r = spawnSync(process.execPath, [HOOK], {
    cwd: work, encoding: 'utf8',
    env: { ...process.env, METHOD_GH_SCRIPT: join(tmp, 'fake-gh.mjs'), WIP_SYNC_NO_MAIN: '' },
  });
  return { status: r.status, stdout: r.stdout ?? '', stderr: r.stderr ?? '' };
}

const mirrored = (bare, branch = 'feature/x') => {
  const r = spawnSync('git', ['ls-tree', '-r', '--name-only', `refs/wip/${branch}`], { cwd: bare, encoding: 'utf8' });
  return r.status === 0 ? r.stdout.split('\n').filter(Boolean) : null;
};
const skippedNames = (work) => {
  const f = join(work, '.git', 'wip-sync.last-skipped');
  return existsSync(f) ? readFileSync(f, 'utf8') : '';
};

before(() => {
  tmp = mkdtempSync(join(tmpdir(), 'wip-sync-test-'));
  writeFileSync(join(tmp, 'fake-gh.mjs'), "console.log(JSON.stringify({ visibility: 'PRIVATE' }));\n");
});
after(() => { try { rmSync(tmp, { recursive: true, force: true }); } catch { /* best effort: a locked temp file is not a test failure */ } });

describe('wip-sync — end to end', () => {
  test('mirrors the good files and never a secret, even when the ignore rules do not catch it', () => {
    const { bare, work } = fixture();
    writeFileSync(join(work, 'a.txt'), 'two\n'); // tracked, modified
    writeFileSync(join(work, 'ok.txt'), 'fine\n'); // untracked
    writeFileSync(join(work, '.env.local'), 'API_KEY=hunter2\n'); // not in any .gitignore here
    writeFileSync(join(work, 'secret-plan.txt'), 'x\n'); // secret-shaped name
    writeFileSync(join(work, 'notes.txt'), FAKE_KEY); // innocent name, credential-shaped content
    const r = runHook(work);
    assert.equal(r.status, 0);
    assert.match(r.stdout, /mirrored on GitHub/, `stdout=${r.stdout} stderr=${r.stderr}`);
    const files = mirrored(bare);
    assert.deepEqual(files?.sort(), ['a.txt', 'ok.txt']);
    const skipped = skippedNames(work);
    assert.match(skipped, /\.env\.local/);
    assert.match(skipped, /secret-plan\.txt/);
    assert.match(skipped, /notes\.txt/);
    assert.ok(!existsSync(join(work, '.git', 'wip-sync.last-error')), 'a success clears the error marker');
  });

  test('a stray Windows device-name file does not cost the others (the 2026-11-01 `nul`)', { skip: !WIN && 'Windows-only failure' }, () => {
    const { bare, work } = fixture();
    writeFileSync(join(work, 'ok.txt'), 'fine\n');
    writeFileSync(join(work, 'nul'), "Le chemin d'acces specifie est introuvable.\r\n");
    assert.ok(existsSync(join(work, 'nul')), 'precondition: a real file called nul exists, not the device');
    const r = runHook(work);
    assert.equal(r.status, 0);
    assert.match(r.stdout, /mirrored on GitHub/, `stdout=${r.stdout} stderr=${r.stderr}`);
    assert.deepEqual(mirrored(bare)?.sort(), ['a.txt', 'ok.txt']); // HEAD's tree + the delta; no nul
    assert.match(skippedNames(work), /nul {2}\(not addable on Windows/);
    assert.ok(!existsSync(join(work, '.git', 'wip-sync.last-error')));
  });

  test('a clean tree mirrors nothing and leaves no WIP ref', () => {
    const { bare, work } = fixture();
    const r = runHook(work);
    assert.equal(r.status, 0);
    assert.equal(mirrored(bare), null);
  });
});

describe('wip-sync — a path git cannot index', () => {
  test('addPaths indexes the others and names the culprit', { skip: (!WIN && process.getuid?.() === 0) && 'root can read a chmod 000 file' }, async () => {
    process.env.WIP_SYNC_NO_MAIN = '1';
    const { addPaths } = await import(pathToFileURL(HOOK).href);
    const { dir, work } = fixture();
    writeFileSync(join(work, 'good.txt'), 'fine\n');
    let bad;
    if (WIN) { bad = 'nul'; writeFileSync(join(work, bad), 'device shadow\r\n'); }
    else { bad = 'locked.txt'; writeFileSync(join(work, bad), 'x\n'); chmodSync(join(work, bad), 0o000); }
    const env = { ...process.env, GIT_INDEX_FILE: join(dir, 'tmp.index'), GIT_LITERAL_PATHSPECS: '1' };
    git(work, ['read-tree', 'HEAD'], { env });
    const failed = addPaths(['good.txt', bad], env, work);
    assert.deepEqual(failed, [bad]);
    const indexed = git(work, ['ls-files'], { env }).split('\n');
    assert.ok(indexed.includes('good.txt'), 'the good file is in the index although another failed');
    assert.ok(!indexed.includes(bad));
    if (!WIN) chmodSync(join(work, bad), 0o644);
  });

  test('a failure that names no path is a real error, not a silent skip', async () => {
    process.env.WIP_SYNC_NO_MAIN = '1';
    const { addPaths } = await import(pathToFileURL(HOOK).href);
    const { dir, work } = fixture();
    const env = { ...process.env, GIT_INDEX_FILE: join(dir, 'tmp.index'), GIT_LITERAL_PATHSPECS: '1' };
    git(work, ['read-tree', 'HEAD'], { env });
    assert.throws(() => addPaths(['does-not-exist.txt'], { ...env, GIT_DIR: join(dir, 'not-a-repo') }, work), /git add:/);
  });
});

describe('wip-sync — pure helpers', () => {
  let mod;
  before(async () => { process.env.WIP_SYNC_NO_MAIN = '1'; mod = await import(pathToFileURL(HOOK).href); });

  test('secrets are denied by name and by directory, on every platform', () => {
    for (const p of ['.env', '.env.local', 'src/.env.production', 'app/key.pem', 'a/b/service-account-prod.json', 'x/secret-plan.txt', '.env/anything.txt', 'node_modules/x/index.js']) {
      assert.ok(mod.denyReason(p), `${p} must be denied`);
    }
    for (const p of ['a.txt', 'src/app/page.tsx', 'docs/environment.md', 'docs/METHOD/tools/swanifly-claude-addon/tests/wip-sync.test.mjs']) {
      assert.equal(mod.denyReason(p), null, `${p} must be allowed`);
    }
  });

  test('Windows device names are denied whole-segment only, with or without an extension', { skip: !WIN && 'the rule applies on Windows only' }, () => {
    for (const p of ['nul', 'NUL', 'nul.txt', 'docs/con', 'docs/aux.md', 'a/COM1', 'LPT9.log', 'a/b/trailing.', 'a/b/trailing ']) {
      assert.ok(mod.denyReason(p), `${p} must be denied on Windows`);
    }
    for (const p of ['nullable.ts', 'console.ts', 'docs/connect.md', 'com10.txt', 'a/null', 'src/aux-utils.ts']) {
      assert.equal(mod.denyReason(p), null, `${p} must be allowed`);
    }
  });

  test('indexFailures reads the culprits out of git stderr, ignoring CRLF warnings', () => {
    const stderr = [
      "warning: in the working copy of 'a.txt', LF will be replaced by CRLF the next time Git touches it",
      'error: short read while indexing nul',
      'error: nul: failed to insert into database',
      "error: unable to index file 'nul'",
      "error: unable to index file 'dir/with space/it's.txt'",
      'fatal: adding files failed',
    ].join('\n');
    assert.deepEqual(mod.indexFailures(stderr), ['nul', "dir/with space/it's.txt"]);
    assert.deepEqual(mod.indexFailures(''), []);
    assert.deepEqual(mod.indexFailures(undefined), []);
  });
});
