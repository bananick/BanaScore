#!/usr/bin/env node
/**
 * .claude/hooks/gate-lock.mjs — one landing at a time, per repository.
 *
 * Library, not a CLI: `land.mjs` and `verify-gate.mjs` import it. Node built-ins only.
 *
 * WHY (2026-09-29). Several Claude Code sessions land in parallel, each from its own git
 * worktree, and every heavy gate is lint → type-check → `test:gate` → `build` (which replays
 * prebuild). N gates at once starve the machine: vitest hits its timeouts and the gate goes
 * red on a diff that is fine — a false red that costs a 20+ minute re-run. Raising the test
 * timeouts would hide the starvation and slow every honest run, so the fix is scheduling:
 * ONE holder at a time per repository, every worktree sharing the same lock, the others
 * waiting with a visible message. The lock is a scheduling aid, never a check — the gate
 * itself stays fail-closed and a missing/broken lock only means "runs unserialized, as before".
 *
 * WHERE. `<main checkout>/.method/gate.lock` (`.method/` is gitignored). The main checkout is
 * resolved exactly as land.mjs does (`git rev-parse --git-common-dir` → its parent), so every
 * worktree of the repo lands on the same file. `METHOD_GATE_LOCK_FILE` overrides it (tests,
 * or a machine that wants one lock across several clones).
 *
 * HOW.
 *   - Acquire = `open(path, 'wx')`, the atomic create. Contents: who (label/worktree/branch/cmd),
 *     host, a random token, `pids` (DISPLAY ONLY — never used to judge liveness), and `startedAt`,
 *     stamped at the instant the create succeeds (a lock won after a long wait must not look old).
 *   - LIVENESS IS A HEARTBEAT, NOT A PID. Every process that holds the lock (the owner AND each
 *     re-entrant child) runs a small `worker_threads` Worker that, every `heartbeatMs`, touches the
 *     lock file's mtime — but only while the file still carries its token. A worker keeps running
 *     while the main thread is blocked in `spawnSync` / `Atomics.wait`, which is where a gate
 *     spends its whole life (the lock is not handed out until the worker has booted and beaten once —
 *     boot takes seconds under load, and a holder that went straight into spawnSync would look dead
 *     before its first beat); and it dies with the process, TerminateProcess included. A lock whose
 *     mtime is older than `staleAfterMs` therefore has no live holder. PIDs cannot say that: Windows
 *     recycles them within minutes, and a dead holder's pid worn by any idle node.exe (or a service)
 *     froze the gate for hours.
 *   - Re-entrancy WITHOUT writes. `land.mjs` takes the lock BEFORE merging the trunk (a session
 *     queued behind another would otherwise be rejected at push, the one ahead having just moved
 *     main), then spawns `verify-gate.mjs`, which also wants it. The token travels in the env
 *     (`METHOD_GATE_LOCK_TOKEN`); a child that finds the same token in the file (checked up front AND on
 *     every read of the wait loop — one failed read must not queue a child behind the parent that is
 *     waiting for it) just starts its own
 *     heartbeat and returns — it never rewrites the file, so it can never resurrect a stale token
 *     over a new owner's lock. If land is killed by a hook timeout, its heartbeat stops but the
 *     orphaned verify-gate keeps beating: the lock stays valid until verify exits, then goes stale.
 *   - Stale locks heal themselves — a crashed holder must never freeze every session: no heartbeat
 *     for `staleAfterMs`, or held longer than `maxHoldMs`, or a half-written file that old, or a file that
 *     has failed to be READ for `staleAfterMs` without a break (it has no mtime to age, so the failure is timed).
 *     An unreadable lock is only ever DELETED when it is an empty file (the instant between `open('wx')` and the
 *     write): METHOD_GATE_LOCK_FILE can point anywhere, and non-empty content we cannot parse is not ours to remove —
 *     the busy message names the file so a human can. Two
 *     waiters must not both delete the file and then each other's fresh lock, so a takeover goes
 *     through a mutex directory (`<lock>.takeover`, atomic mkdir), re-reads the lock under it and
 *     only deletes the very lock it judged (and only if it is STILL stale: a holder that woke from
 *     a laptop sleep and beat in the meantime keeps its lock). A takeover that cannot proceed
 *     (mutex busy) is retried on the next poll for as long as the wait budget lasts — never given up.
 *   - Release is idempotent and only ever removes OUR lock (token check). It runs on the process
 *     'exit' event. No SIGINT/SIGTERM/SIGHUP listeners on purpose: callers spend their lives inside
 *     spawnSync, where a JS signal handler cannot run — but merely registering one swallows Ctrl-C's
 *     default kill, so land would survive an abort and go on to push. A killed holder simply stops
 *     beating and is reclaimed after `staleAfterMs`.
 *
 * Waiting is synchronous (`Atomics.wait`) because both callers are spawnSync-based scripts.
 */
import { spawnSync } from 'node:child_process';
import { randomUUID } from 'node:crypto';
import { closeSync, mkdirSync, openSync, readFileSync, rmdirSync, statSync, unlinkSync, writeSync } from 'node:fs';
import { hostname } from 'node:os';
import { dirname, join, resolve } from 'node:path';
import { Worker } from 'node:worker_threads';

export const TOKEN_ENV = 'METHOD_GATE_LOCK_TOKEN';

const HEARTBEAT_START_MS = 15_000;  // how long we wait for the heartbeat thread to come online before giving the lock back
const MAX_VANISHED = 50;             // create fails yet no file to read (~5 s) → the directory is unusable
const BUSY = new Set(['EEXIST', 'EPERM', 'EACCES', 'EBUSY']); // Windows reports a delete-pending file as EPERM/EACCES

// Runs inside the heartbeat Worker (CommonJS: `eval: true` workers are scripts). Reads the lock and
// touches it only while it still carries our token — a lock taken over by someone else is left alone.
// It beats once at once, then raises the `ready` flag the main thread is parked on (see startHeartbeat).
const HEARTBEAT_SRC = `
const { workerData: w } = require('node:worker_threads');
const fs = require('node:fs');
const beat = () => {
  try {
    const d = JSON.parse(fs.readFileSync(w.path, 'utf8'));
    if (d && d.token === w.token) { const now = new Date(); fs.utimesSync(w.path, now, now); }
  } catch { /* file gone or mid-rewrite: nothing to keep alive */ }
};
beat();
const ready = new Int32Array(w.ready);
Atomics.store(ready, 0, 1);
Atomics.notify(ready, 0);
setInterval(beat, w.heartbeatMs);
`;

/** `<main checkout>/.method/gate.lock` — the same file from every worktree of the repo. */
export function gateLockPath(repoDir) {
  if (process.env.METHOD_GATE_LOCK_FILE) return resolve(process.env.METHOD_GATE_LOCK_FILE);
  const r = spawnSync('git', ['rev-parse', '--git-common-dir'], { cwd: repoDir, encoding: 'utf8', timeout: 60_000 });
  const common = (r.stdout ?? '').trim();
  const main = dirname(resolve(repoDir, common || '.git'));
  return join(main, '.method', 'gate.lock');
}

// A NaN from a mistyped `--lock-wait` would compare false against every deadline and wait forever.
const nonNeg = (v, d) => (Number.isFinite(v) && v >= 0 ? v : d);
const pos = (v, d) => (Number.isFinite(v) && v > 0 ? v : d);

/** Blocking sleep — the callers are synchronous scripts. */
function sleep(ms) {
  if (ms > 0) Atomics.wait(new Int32Array(new SharedArrayBuffer(4)), 0, 0, ms);
}

/**
 * Take the lock, waiting for it when another live session holds it.
 * → `{ ok: true, token, reentrant, waitedMs, release }` | `{ ok: false, holder, waitedMs, path }` (`path`: the lock file, for the busy message).
 * `maxWaitMs: 0` never waits (and never calls `onWait`) — hook mode. Throws only when the lock
 * cannot be created for a reason that is not "someone holds it" (or its heartbeat cannot start):
 * callers then run unserialized.
 *
 * Options: `path`, `info` ({ label, worktree, branch, cmd }), `maxWaitMs` (180 min), `pollMs` (10 s),
 * `noticeEveryMs` (5 min), `onWait(holder, waitedMs)`, `onStale(holder)`, and the liveness knobs
 * `heartbeatMs` (15 s), `staleAfterMs` (120 s — keep it well above heartbeatMs), `maxHoldMs`
 * (240 min — above land's own worst case: 2 h verify cap + merge + 10 min push), `mutexStaleMs` (60 s).
 */
export function acquireGateLock(opts) {
  const { path, info = {}, onWait = () => {}, onStale = () => {} } = opts;
  const maxWaitMs = nonNeg(opts.maxWaitMs, 180 * 60_000);
  const pollMs = Math.max(10, nonNeg(opts.pollMs, 10_000));
  const noticeEveryMs = Math.max(1, nonNeg(opts.noticeEveryMs, 5 * 60_000));
  const heartbeatMs = Math.max(10, pos(opts.heartbeatMs, 15_000));
  const cfg = {
    maxHoldMs: nonNeg(opts.maxHoldMs, 240 * 60_000),
    staleAfterMs: pos(opts.staleAfterMs, 120_000),
    mutexStaleMs: pos(opts.mutexStaleMs, 60_000),
  };

  // Test seam only: lets a case make a read fail the way a busy file does (EBUSY while another process
  // has it open). Everything else in the loop reads through it too, so the seam sees the same reads.
  const read = opts.readHolder ?? readHolder;

  // Re-entrancy: the env token only counts if the file STILL carries it (a token left over
  // from a lock that has since been released or taken over proves nothing). Checked here AND on
  // every read inside the wait loop below: land's own verify child must never queue behind its
  // parent (which is waiting for it) just because ONE read of the lock file failed.
  const reenterIfHeld = (h) => {
    const envToken = process.env[TOKEN_ENV];
    if (!envToken || h?.data?.token !== envToken) return null;
    const stopBeat = startHeartbeat(path, envToken, heartbeatMs);
    let released = false;
    const release = () => { if (!released) { released = true; stopBeat(); } }; // the env token stays: our own children may re-enter
    return { ok: true, token: envToken, reentrant: true, waitedMs: 0, release };
  };
  const first = reenterIfHeld(read(path));
  if (first) return first;

  mkdirSync(dirname(path), { recursive: true });
  const token = randomUUID();
  const started = Date.now();
  let noticedAt = -Infinity;
  let vanished = 0;
  let attempts = 0;
  let unreadable = 0;
  let failingSince = null;   // since when reads of the lock have been failing without a break
  for (;;) {
    // startedAt is stamped per attempt, i.e. at the moment the create succeeds — not before the wait.
    const data = { ...info, host: hostname(), token, pids: [process.pid], startedAt: new Date().toISOString() };
    const created = tryCreate(path, data);
    // waitedMs is time spent WAITING: exactly 0 when the first create wins (callers refetch the trunk on > 0).
    if (created === true) return owned(path, token, attempts ? Date.now() - started : 0, heartbeatMs);
    attempts++;
    let h = read(path);
    if (!h) { // the holder released between our create and our read — retry at once
      failingSince = null;
      if (++vanished > MAX_VANISHED) throw new Error(`cannot create ${path} (${created})`);
      sleep(100);
      continue;
    }
    vanished = 0;
    // A file that exists but cannot be read (EACCES, EBUSY, EISDIR…) has no trustworthy mtime: age it by how long the
    // reads have been failing, so a lock that is unreadable for good is judged stale like any other (see takeover).
    if (h.failed) { failingSince ??= Date.now(); h = { ...h, mtimeMs: failingSince }; } else failingSince = null;
    const joined = reenterIfHeld(h);
    if (joined) return joined;
    // A child of the holder (env token set) that could not READ the lock this time retries at once, a few
    // times, instead of sleeping a whole poll: it is almost certainly its own parent's lock.
    if (!h.data && process.env[TOKEN_ENV] && unreadable++ < MAX_VANISHED) { sleep(100); continue; }
    if (isStale(h, cfg) && takeover(path, h, cfg, onStale, read)) { sleep(250); continue; }
    // Held (or stale but not takeover-able right now: the next poll retries it, budget permitting).
    const waited = Date.now() - started;
    if (waited >= maxWaitMs) return { ok: false, holder: h.data, waitedMs: waited, path };
    if (waited - noticedAt >= noticeEveryMs) { onWait(h.data, waited, path); noticedAt = waited; }
    sleep(Math.min(pollMs, maxWaitMs - waited));
  }
}

/** Atomic create. `true` when we made the file, the errno code when somebody else holds it. */
function tryCreate(path, data) {
  let fd;
  try { fd = openSync(path, 'wx'); }
  catch (e) {
    if (BUSY.has(e?.code)) return e.code;
    throw e;
  }
  try { writeSync(fd, JSON.stringify(data, null, 2) + '\n'); }
  catch (e) {
    try { closeSync(fd); } catch { /* best effort */ }
    try { unlinkSync(path); } catch { /* an empty lock would only age out */ }
    throw e;
  }
  closeSync(fd);
  return true;
}

/** Keep `path` fresh while it carries `token`, from a thread that a blocked main thread cannot starve. */
function startHeartbeat(path, token, heartbeatMs) {
  const ready = new SharedArrayBuffer(4);
  // `execArgv: []`: a worker inherits the parent's node flags, and under `node --input-type=module -e …`
  // its eval'd source would be parsed as an ES module — `require` is undefined there, the worker dies
  // before it raises `ready`, and the parked main thread (which cannot see its 'error' event) times out.
  const worker = new Worker(HEARTBEAT_SRC, { eval: true, execArgv: [], workerData: { path, token, heartbeatMs, ready } });
  worker.on('error', () => { /* a dead heartbeat only makes the lock go stale — it must never crash the gate */ });
  worker.unref();
  const stop = () => { try { worker.terminate().catch(() => {}); } catch { /* already gone */ } };
  // A worker thread takes a while to boot (measured 0.2 s here, seconds under load) and the lock file
  // is only as alive as its heartbeat: a holder that goes straight into a blocking spawnSync would look
  // dead before the first beat and be taken over mid-gate. So do not hand the lock out until the thread
  // is running and has beaten once — the boot is a synchronous wait on a flag the worker raises itself.
  if (Atomics.wait(new Int32Array(ready), 0, 0, HEARTBEAT_START_MS) === 'timed-out') {
    stop();
    throw new Error(`heartbeat thread did not start within ${HEARTBEAT_START_MS / 1000} s`);
  }
  return stop;
}

/** We created the file: children re-enter through the env token, and the exit hook frees it. */
function owned(path, token, waitedMs, heartbeatMs) {
  let stopBeat;
  try { stopBeat = startHeartbeat(path, token, heartbeatMs); }
  catch (e) {
    // Without a heartbeat the lock would look dead after staleAfterMs and be taken from under a
    // running gate — worse than no lock. Give it back; the caller runs unserialized.
    try { unlinkSync(path); } catch { /* reclaimed as stale */ }
    throw e;
  }
  process.env[TOKEN_ENV] = token;
  let released = false;
  const release = () => {
    if (released) return;
    released = true;
    uninstall();
    stopBeat();
    // Only ever remove OUR lock — after a takeover (maxHoldMs) the file may be someone else's.
    if (readHolder(path)?.data?.token === token) { try { unlinkSync(path); } catch { /* reclaimed as stale */ } }
    if (process.env[TOKEN_ENV] === token) delete process.env[TOKEN_ENV];
  };
  const uninstall = onProcessExit(release);
  return { ok: true, token, reentrant: false, waitedMs, release };
}

function onProcessExit(fn) {
  process.once('exit', fn);
  return () => process.removeListener('exit', fn);
}

/** `null` = no file. `{ data: null }` = there is a file we cannot read as a lock — treated as held (`failed`: the read itself threw). */
export function readHolder(path) {
  let st;
  let text;
  try {
    st = statSync(path);
    text = readFileSync(path, 'utf8');
  } catch (e) {
    // ENOENT = no lock. Anything else: a file that exists but cannot be read — `failed`, so the caller can time it.
    return e?.code === 'ENOENT' ? null : { data: null, mtimeMs: Date.now(), failed: true };
  }
  try {
    const data = JSON.parse(text);
    if (data && typeof data === 'object' && !Array.isArray(data)) return { data, mtimeMs: st.mtimeMs };
  } catch { /* half-written */ }
  return { data: null, mtimeMs: st.mtimeMs };
}

/**
 * No heartbeat for `staleAfterMs` (a dead holder, or a half-written file that old) — or held for
 * longer than any honest landing. Deliberately no pid check: see the header.
 */
export function isStale(h, { maxHoldMs, staleAfterMs }) {
  const now = Date.now();
  if (h.data) {
    const startedAt = Date.parse(h.data.startedAt);
    if (Number.isFinite(startedAt) && now - startedAt > maxHoldMs) return true;
  }
  return now - h.mtimeMs > staleAfterMs;
}

/**
 * Remove a stale lock without racing another waiter. Both would see it stale; without the mutex
 * the slower one would delete the lock the faster one had just created. Under the mutex we
 * re-read and only delete the very lock we judged (same token — or, unparseable, same mtime / still failing to
 * be read) if it is still stale. A lock whose content we cannot read is deleted ONLY when it is an empty file.
 * `true` when something was removed (the lock, or a dead taker's mutex): retry now.
 */
function takeover(path, seen, cfg, onStale, read = readHolder) {
  const mutex = `${path}.takeover`;
  try { mkdirSync(mutex); }
  catch (e) {
    if (e?.code === 'EEXIST') {
      try { // a taker killed mid-takeover leaves its mutex behind: reap it once it is clearly dead
        if (Date.now() - statSync(mutex).mtimeMs > cfg.mutexStaleMs) { rmdirSync(mutex); return true; }
      } catch { /* the taker just finished */ }
    }
    return false;
  }
  let removed = false;
  try {
    let cur = read(path);
    // Reads that were failing and still fail are the same continuous failure: carry its start (the fresh read only has "now").
    if (cur?.failed && seen.failed) cur = { ...cur, mtimeMs: seen.mtimeMs };
    const same = cur && (seen.data && cur.data ? cur.data.token === seen.data.token : !seen.data && !cur.data && cur.mtimeMs === seen.mtimeMs);
    // Content we could not parse is not ours to delete unless there is none at all (the open('wx')→write instant).
    if (same && isStale(cur, cfg) && (typeof cur.data?.token === 'string' || isEmptyFile(path))) {
      unlinkSync(path);
      removed = true;
      onStale(seen.data);
    }
  } catch { /* could not remove it — the next poll tries again */ }
  finally { try { rmdirSync(mutex); } catch { /* best effort */ } }
  return removed;
}

/** A regular file of size 0 — the only unreadable lock content we ever remove. */
function isEmptyFile(path) {
  try { const st = statSync(path); return st.isFile() && st.size === 0; } catch { return false; }
}

/**
 * `worktree-name (branch) · land · pid 1234 · since 14:02 (37 min)` — the pid is for display, not for liveness.
 * With `path` (the lock file) the busy message says which file to look at, and for an unreadable one how to clear it.
 */
export function describeHolder(data, path) {
  if (!data) return `an unreadable lock file${path ? ` (${path} — delete it by hand if no landing is running)` : ''}`;
  const tail = (p) => String(p).split(/[\\/]/).filter(Boolean).pop();
  const name = data.worktree ? tail(data.worktree) : data.label ?? 'unknown';
  const parts = [`${name}${data.branch ? ` (${data.branch})` : ''}`, data.cmd ?? 'gate'];
  if (Array.isArray(data.pids) && data.pids.length) parts.push(`pid ${data.pids.join(',')}`);
  const at = Date.parse(data.startedAt);
  if (Number.isFinite(at)) {
    parts.push(`since ${new Date(at).toTimeString().slice(0, 5)} (${Math.max(0, Math.round((Date.now() - at) / 60_000))} min)`);
  }
  if (path) parts.push(`lock ${path}`);
  return parts.join(' · ');
}
