#!/usr/bin/env node
/**
 * .claude/hooks/heavy-slot.mjs — at most two heavy jobs at once on this machine, whatever the repository.
 *
 * Library (verify-gate.mjs imports it) and a small CLI. Node built-ins only.
 *
 * WHY (2026-10-27). On 2026-10-26 between 19:07 and 19:27 Windows ran out of virtual memory with 13 Claude
 * sessions open and several lands / test:gate / next build running in parallel on a 22.9 GB machine: the
 * desktop app and every session died. `gate-lock.mjs` serializes heavy gates per REPOSITORY; the crash was
 * ACROSS repositories (each landing alone in its own repo, all at once). A coordinating session then wrote
 * `~/.claude/heavy-slot/heavy-slot.ps1` and asked every session to wrap its heavy jobs with it — a convention,
 * which holds only as long as every session remembers it. This module is the same semaphore, taken by the gate
 * itself, so no session can skip it by forgetting.
 *
 * COMPATIBLE WITH THE CONVENTION SCRIPT. Same directory (`~/.claude/heavy-slot/`, `METHOD_HEAVY_SLOT_DIR`
 * overrides it), same two files (`slot1.lock`, `slot2.lock`), same atomic create (`open(…, 'wx')` = CreateNew),
 * same content (`<owner> <ISO time>`; the owner is the branch, whitespace replaced), same 45-min stale rule
 * (no write for 45 min → abandoned). A slot taken by the .ps1 and one taken here exclude each other.
 *
 * HOW.
 *   - Liveness is a heartbeat, as in gate-lock.mjs: a `worker_threads` Worker touches our slot's mtime every
 *     `heartbeatMs` while the file still holds our exact content — it keeps beating while the main thread is
 *     blocked in spawnSync, and dies with the process. A slot written HERE (its time is `toISOString()`, ending
 *     in `Z`; the .ps1 writes `Get-Date -Format s`, no `Z`) is therefore dead after `deadAfterMs` (2 min) without
 *     a beat: a session killed mid-gate frees its slot in 2 min, not 45. Any other slot keeps the 45-min rule.
 *   - Stale slots are removed under a takeover mutex (`<slot>.takeover`, atomic mkdir), re-read under it and only
 *     deleted if they are still the very stale slot that was judged — two waiters can never delete each other's
 *     fresh slot.
 *   - Free RAM (`os.freemem()`): under `minFreeGb` (5 GB, never more than a quarter of the machine) a heavy job
 *     starts only when NO slot is held — low RAM means one at a time, never zero (the machine always makes
 *     progress). Skipped on macOS, where `freemem` counts only free pages and would read "low" for ever.
 *   - The wait is asynchronous (setTimeout), polled every `pollMs` (30 s), with a notice at once and every 5 min,
 *     for at most `maxWaitMs` (40 min). Running out is `{ ok: false }` — the caller fails closed: nothing ran.
 *   - Re-entrancy: the holder exports `METHOD_HEAVY_SLOT_TOKEN`; a child that carries it is inside its parent's
 *     heavy job and takes no slot, and NEVER waits (the hub's self-test runs `test:gate`, whose fixture gates are
 *     heavy too — they must not queue behind the parent that is waiting for them). `reentrant` when the parent's
 *     slot still holds its content; `inherited` when it does not (reclaimed under it): the parent already went
 *     through the queue, and a child that queued now would read red at its script cap instead of blocked.
 *   - Release is idempotent and only ever removes OUR slot (content check). It runs when the caller is done and on
 *     the process 'exit' event (green, red, blocked, an uncaught throw). Signal listeners (SIGINT / SIGTERM / SIGHUP /
 *     SIGBREAK) are installed ONLY with `signals: true` — the CLI, which awaits its child, so a handler can run. Never
 *     in verify-gate: it lives in spawnSync, where a handler cannot run, and merely registering one swallows Ctrl-C's
 *     default kill (see gate-lock.mjs) — an aborted /land would leave an orphan gate running every check. A process
 *     killed outright (Ctrl-C there, TerminateProcess, a hook timeout) runs nothing: its heartbeat stops and the slot
 *     is reclaimed after `deadAfterMs`.
 *   - A heartbeat that does not start (seconds to boot a thread on a machine out of memory — exactly when the
 *     semaphore matters most) does not give the slot back: it is rewritten with a time WITHOUT `Z`, so it ages by
 *     the 45-min rule instead, and the caller is told (`heartbeat: false`).
 *   - Fail open on the semaphore only: a lock directory that cannot be created, a slot that cannot be written for
 *     a reason that is not "someone holds it" → `acquireHeavySlot` throws, and the caller runs the job without the
 *     semaphore, saying so. It never decides whether a diff is good.
 *     `METHOD_HEAVY_SLOT=off` turns it off on purpose (the hub's test fixtures); callers record it.
 *   - Never wrap `/land` or `npm run verify` in this CLI or in the .ps1: they take their own slot, and a slot taken
 *     by a wrapper the gate cannot see (the .ps1 exports no token) makes the gate take a second one.
 *
 * CLI:
 *   node .claude/hooks/heavy-slot.mjs status
 *   node .claude/hooks/heavy-slot.mjs run [--owner <name>] [--wait <min>] -- <command> [args…]
 *     exit = the command's; 75 when the wait ran out (the command did not run)
 */
import { spawn, spawnSync } from 'node:child_process';
import { closeSync, mkdirSync, openSync, readFileSync, realpathSync, rmdirSync, statSync, unlinkSync, writeFileSync, writeSync } from 'node:fs';
import { freemem, homedir, totalmem } from 'node:os';
import { join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { Worker } from 'node:worker_threads';

export const TOKEN_ENV = 'METHOD_HEAVY_SLOT_TOKEN';
export const SLOT_NAMES = ['slot1', 'slot2'];
const GB = 1024 ** 3;
const BUSY = new Set(['EEXIST', 'EPERM', 'EACCES', 'EBUSY']); // Windows reports a delete-pending file as EPERM/EACCES
const MAX_UNUSABLE = 50;            // create refused yet no file there (~5 s of retries) → the directory is unusable
const HEARTBEAT_START_MS = 15_000;
const SIGNALS = ['SIGINT', 'SIGTERM', 'SIGHUP', ...(process.platform === 'win32' ? ['SIGBREAK'] : [])];

const HEARTBEAT_SRC = `
const { workerData: w } = require('node:worker_threads');
const fs = require('node:fs');
const beat = () => {
  try { if (fs.readFileSync(w.path, 'utf8') === w.content) { const now = new Date(); fs.utimesSync(w.path, now, now); } }
  catch { /* gone or taken over: nothing to keep alive */ }
};
beat();
const ready = new Int32Array(w.ready);
Atomics.store(ready, 0, 1);
Atomics.notify(ready, 0);
setInterval(beat, w.heartbeatMs);
`;

/** `~/.claude/heavy-slot` — the convention script's directory. */
export function slotDir() {
  return process.env.METHOD_HEAVY_SLOT_DIR ? resolve(process.env.METHOD_HEAVY_SLOT_DIR) : join(homedir(), '.claude', 'heavy-slot');
}

export const heavySlotOff = (env = process.env) => String(env.METHOD_HEAVY_SLOT ?? '').toLowerCase() === 'off';

const num = (v, d) => (Number.isFinite(v) && v >= 0 ? v : d);
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

/** Free RAM against the floor. `ok` also when the check does not apply (macOS) — `skipped` says so. */
export function memoryCheck({ minFreeGb, free = freemem, total = totalmem, platform = process.platform } = {}) {
  const want = num(minFreeGb ?? Number(process.env.METHOD_HEAVY_SLOT_MIN_FREE_GB ?? 5), 5);
  const needGb = Math.min(want, total() / GB / 4);
  const freeGb = free() / GB;
  if (platform === 'darwin') return { ok: true, skipped: 'darwin', freeGb, needGb };
  return { ok: freeGb >= needGb, freeGb, needGb };
}

/** One slot as found on disk: `{ name, path, exists, owner, at, ours, heartbeat, mtimeMs, failed }`. */
export function readSlot(dir, name) {
  const path = join(dir, `${name}.lock`);
  let st;
  let text;
  try { st = statSync(path); text = readFileSync(path, 'utf8'); }
  catch (e) { return e?.code === 'ENOENT' ? { name, path, exists: false } : { name, path, exists: true, failed: true, mtimeMs: Date.now() }; }
  const content = text.trim();
  const cut = content.lastIndexOf(' ');
  const at = cut > 0 ? content.slice(cut + 1) : '';
  return { name, path, exists: true, content: text, owner: cut > 0 ? content.slice(0, cut) : content || null, at, heartbeat: /Z$/.test(at), mtimeMs: st.mtimeMs };
}

export const readSlots = (dir = slotDir()) => SLOT_NAMES.map((n) => readSlot(dir, n));

/** Abandoned: no write for `staleAfterMs` (45 min); one of ours without a beat for `deadAfterMs`; an empty file that old. */
export function isStale(s, { staleAfterMs = 45 * 60_000, deadAfterMs = 120_000 } = {}) {
  if (!s.exists || s.failed) return false;
  const age = Date.now() - s.mtimeMs;
  return age > staleAfterMs || ((s.heartbeat || !s.owner) && age > deadAfterMs);
}

/** `slot1: feat/x since 14:02 (37 min) · slot2: free` */
export function describeSlots(slots) {
  return slots.map((s) => {
    if (!s.exists) return `${s.name}: free`;
    if (s.failed || !s.owner) return `${s.name}: unreadable (${s.path})`;
    const at = Date.parse(s.at);
    return `${s.name}: ${s.owner}${Number.isFinite(at) ? ` since ${new Date(at).toTimeString().slice(0, 5)} (${Math.max(0, Math.round((Date.now() - at) / 60_000))} min)` : ''}`;
  }).join(' · ');
}

/**
 * Take a slot, waiting for one. → `{ ok: true, name, path, waitedMs, reentrant, release }`
 * | `{ ok: false, why, waitedMs, slots }`. Throws when the semaphore itself is unusable (caller fails open).
 * Options: `owner`, `dir`, `maxWaitMs` (40 min), `pollMs` (30 s), `noticeEveryMs` (5 min), `minFreeGb` (5),
 * `heartbeatMs` (15 s), `deadAfterMs` (2 min), `staleAfterMs` (45 min), `mutexStaleMs` (60 s),
 * `onWait(why, waitedMs)`, `onStale(slot)`, `signals` (false — see the header) with `onSignal(signal)`, and the
 * seams `freemem` / `totalmem` / `startHeartbeat`.
 */
export async function acquireHeavySlot(opts = {}) {
  const dir = opts.dir ? resolve(opts.dir) : slotDir();
  const owner = String(opts.owner || 'unknown').replace(/\s+/g, '_');
  const maxWaitMs = num(opts.maxWaitMs, 40 * 60_000);
  const pollMs = Math.max(10, num(opts.pollMs, 30_000));
  const noticeEveryMs = Math.max(1, num(opts.noticeEveryMs, 5 * 60_000));
  const heartbeatMs = Math.max(10, num(opts.heartbeatMs, 15_000));
  const cfg = { staleAfterMs: num(opts.staleAfterMs, 45 * 60_000), deadAfterMs: num(opts.deadAfterMs, 120_000), mutexStaleMs: num(opts.mutexStaleMs, 60_000) };
  const { onWait = () => {}, onStale = () => {} } = opts;
  const hold = { heartbeatMs, signals: opts.signals === true, onSignal: opts.onSignal ?? (() => {}), beat: opts.startHeartbeat ?? startHeartbeat };

  const joined = reenter();
  if (joined) return joined;

  mkdirSync(dir, { recursive: true });   // throws → fail open
  const started = Date.now();
  let noticedAt = -Infinity;
  for (let attempt = 0; ; attempt++) {
    let slots = readSlots(dir);
    if (slots.some((s) => isStale(s, cfg))) {
      for (const s of slots.filter((x) => isStale(x, cfg))) if (takeover(s, cfg)) onStale(s);
      slots = readSlots(dir);
    }
    const held = slots.filter((s) => s.exists);
    const mem = memoryCheck({ minFreeGb: opts.minFreeGb, free: opts.freemem, total: opts.totalmem });
    const lowRam = !mem.ok && held.length > 0;
    if (!lowRam) {
      for (const s of slots.filter((x) => !x.exists)) {
        const content = `${owner} ${new Date().toISOString()}`;
        // waitedMs is time spent WAITING: exactly 0 when the first look finds a free slot.
        if (tryCreate(s.path, content)) return owned(s, content, attempt ? Date.now() - started : 0, hold);
      }
    }
    const waited = Date.now() - started;
    const why = lowRam
      ? `free RAM ${mem.freeGb.toFixed(1)} GB < ${mem.needGb.toFixed(1)} GB and a heavy job already runs (${describeSlots(slots)})`
      : `both slots busy (${describeSlots(readSlots(dir))})`;
    if (waited >= maxWaitMs) return { ok: false, why, waitedMs: waited, slots };
    if (waited - noticedAt >= noticeEveryMs) { onWait(why, waited); noticedAt = waited; }
    await sleep(Math.min(pollMs, maxWaitMs - waited));
  }
}

/** Inside a parent's heavy job (its token): take nothing, never wait — `inherited` when its slot was reclaimed. */
function reenter() {
  let t;
  try { t = JSON.parse(process.env[TOKEN_ENV] ?? 'null'); } catch { return null; }
  if (!t?.path || typeof t.content !== 'string') return null;
  let held = false;
  try { held = readFileSync(t.path, 'utf8') === t.content; } catch { /* reclaimed or gone */ }
  return { ok: true, name: t.name, path: t.path, waitedMs: 0, reentrant: true, ...(held ? {} : { inherited: true }), release: () => false };
}

/** Atomic create. `true` = ours; `false` = someone holds it. Throws when the directory refuses us for good. */
function tryCreate(path, content) {
  for (let refused = 0; ; refused++) {
    let fd;
    try { fd = openSync(path, 'wx'); }
    catch (e) {
      if (!BUSY.has(e?.code)) throw e;
      if (e.code === 'EEXIST' || statExists(path)) return false;   // held, or delete-pending: busy, not broken
      if (refused >= MAX_UNUSABLE) throw new Error(`cannot create ${path} (${e.code})`);
      Atomics.wait(new Int32Array(new SharedArrayBuffer(4)), 0, 0, 100);
      continue;
    }
    try { writeSync(fd, content); }
    catch (e) {
      try { closeSync(fd); } catch { /* best effort */ }
      try { unlinkSync(path); } catch { /* an empty slot ages out */ }
      throw e;
    }
    closeSync(fd);
    return true;
  }
}

const statExists = (p) => { try { statSync(p); return true; } catch { return false; } };

/** We created the slot: heartbeat, env token for children, release on done / exit (and signals, CLI only). */
function owned(slot, created, waitedMs, { heartbeatMs, signals, onSignal, beat }) {
  let content = created;
  let stopBeat = () => {};
  let heartbeat = true;
  try { stopBeat = beat(slot.path, content, heartbeatMs); }
  catch {
    // Keep the slot, judged by the 45-min rule (a time without `Z`), rather than run unserialized (see the header).
    heartbeat = false;
    const d = new Date();   // local time, no offset: the format the .ps1 writes (`Get-Date -Format s`)
    content = `${created.slice(0, created.lastIndexOf(' '))} ${new Date(d - d.getTimezoneOffset() * 60_000).toISOString().slice(0, 19)}`;
    // A rewrite that fails too leaves the `Z` content: still ours for release, but it then ages by the 2-min rule.
    try { writeFileSync(slot.path, content); } catch { content = created; }
  }
  const token = JSON.stringify({ name: slot.name, path: slot.path, content });
  let released = false;
  const release = () => {
    if (released) return false;
    released = true;
    process.removeListener('exit', release);
    for (const sig of Object.keys(handlers)) process.removeListener(sig, handlers[sig]);
    stopBeat();
    if (process.env[TOKEN_ENV] === token) delete process.env[TOKEN_ENV];
    try {
      const now = readFileSync(slot.path, 'utf8');
      if (now === content || now === created) { unlinkSync(slot.path); return true; }
    } catch { /* already gone */ }
    return false;
  };
  const handlers = signals ? Object.fromEntries(SIGNALS.map((sig) => [sig, () => {
    try { onSignal(sig); } catch { /* the release below matters more */ }
    release();
    process.exit(sig === 'SIGINT' ? 130 : 143);
  }])) : {};
  process.env[TOKEN_ENV] = token;
  process.once('exit', release);
  for (const sig of Object.keys(handlers)) process.once(sig, handlers[sig]);
  return { ok: true, name: slot.name, path: slot.path, waitedMs, reentrant: false, heartbeat, release };
}

function startHeartbeat(path, content, heartbeatMs) {
  const ready = new SharedArrayBuffer(4);
  // `execArgv: []` — see gate-lock.mjs: under `--input-type=module -e` the eval'd CommonJS source would not parse.
  const worker = new Worker(HEARTBEAT_SRC, { eval: true, execArgv: [], workerData: { path, content, heartbeatMs, ready } });
  worker.on('error', () => { /* a dead heartbeat only makes the slot look dead — never crash the job */ });
  worker.unref();
  const stop = () => { try { worker.terminate().catch(() => {}); } catch { /* gone */ } };
  if (Atomics.wait(new Int32Array(ready), 0, 0, HEARTBEAT_START_MS) === 'timed-out') {
    stop();
    throw new Error(`heartbeat thread did not start within ${HEARTBEAT_START_MS / 1000} s`);
  }
  return stop;
}

/** Remove a stale slot without racing another waiter (see the header). `true` when it was removed. */
function takeover(seen, cfg) {
  const mutex = `${seen.path}.takeover`;
  try { mkdirSync(mutex); }
  catch (e) {
    try { if (e?.code === 'EEXIST' && Date.now() - statSync(mutex).mtimeMs > cfg.mutexStaleMs) rmdirSync(mutex); } catch { /* the taker just finished */ }
    return false;
  }
  try {
    const cur = readSlot(join(seen.path, '..'), seen.name);
    if (cur.exists && cur.content === seen.content && isStale(cur, cfg)) { unlinkSync(seen.path); return true; }
  } catch { /* the next poll tries again */ }
  finally { try { rmdirSync(mutex); } catch { /* best effort */ } }
  return false;
}

// ── CLI ──────────────────────────────────────────────────────────────────────
const isMain = () => {
  try {
    const norm = (p) => (process.platform === 'win32' ? realpathSync(p).toLowerCase() : realpathSync(p));
    return Boolean(process.argv[1]) && norm(process.argv[1]) === norm(fileURLToPath(import.meta.url));
  } catch { return false; }
};
if (isMain()) await cli(process.argv.slice(2));

async function cli(argv) {
  const sep = argv.indexOf('--');
  const head = sep === -1 ? argv : argv.slice(0, sep);
  const cmd = sep === -1 ? [] : argv.slice(sep + 1);
  const opt = (n) => { const i = head.indexOf(`--${n}`); return i === -1 ? null : head[i + 1] ?? null; };
  if (head[0] === 'status' || !head.length) {
    const m = memoryCheck();
    console.log(`${describeSlots(readSlots())}\nfree RAM ${m.freeGb.toFixed(1)} GB (floor ${m.needGb.toFixed(1)} GB${m.skipped ? `, not applied: ${m.skipped}` : ''}) · ${slotDir()}`);
    return;
  }
  if (head[0] !== 'run' || !cmd.length) { console.error('usage: heavy-slot.mjs status | run [--owner <name>] [--wait <min>] -- <command> [args…]'); process.exit(2); }
  const owner = opt('owner') || (spawnSync('git', ['rev-parse', '--abbrev-ref', 'HEAD'], { encoding: 'utf8', timeout: 30_000 }).stdout ?? '').trim() || 'unknown';
  const waitMin = num(Number(opt('wait') ?? 40), 40);
  let child = null;
  let slot = null;
  if (heavySlotOff()) console.error('⚠ heavy-slot off (METHOD_HEAVY_SLOT=off) — running without the machine-wide semaphore');
  else {
    try {
      slot = await acquireHeavySlot({
        owner, maxWaitMs: waitMin * 60_000,
        onWait: (why, ms) => console.error(`⏳ heavy-slot: ${why} — waiting (${Math.round(ms / 60_000)} min so far, up to ${waitMin} min)`),
        onStale: (s) => console.error(`♻ heavy-slot: removed a stale ${s.name} left by ${s.owner ?? 'an unreadable file'}`),
        signals: true,   // this process awaits its child, so a handler can run (see the header)
        onSignal: (sig) => { try { child?.kill(sig); } catch { /* gone */ } },
      });
    } catch (e) { console.error(`⚠ heavy-slot unavailable (${e?.message ?? e}) — running without the machine-wide semaphore`); }
    if (slot && !slot.ok) { console.error(`⛔ heavy-slot busy — ${slot.why}; waited ${Math.round(slot.waitedMs / 60_000)} min, \`${cmd.join(' ')}\` did not run`); process.exit(75); }
    if (slot?.ok && !slot.reentrant) console.error(`🎟 heavy-slot: ${slot.name} taken by ${owner}`);
  }
  // `node` runs as this very executable, no shell (a `tests/*.test.mjs` glob reaches `node --test` intact). Anything else
  // on Windows (npm, npx are .cmd files) needs a shell, given ONE quoted string — an args array with `shell` is DEP0190.
  const quote = (a) => (/[\s"&|<>^]/.test(a) ? `"${a.replace(/"/g, '\\"')}"` : a);
  if (/^node(\.exe)?$/i.test(cmd[0])) child = spawn(process.execPath, cmd.slice(1), { stdio: 'inherit' });
  else if (process.platform === 'win32') child = spawn(cmd.map(quote).join(' '), { stdio: 'inherit', shell: true });
  else child = spawn(cmd[0], cmd.slice(1), { stdio: 'inherit' });
  const code = await new Promise((r) => { child.on('error', (e) => { console.error(`heavy-slot: ${e.message}`); r(127); }); child.on('exit', (c, s) => r(c ?? (s ? 128 : 1))); });
  if (slot?.release()) console.error(`heavy-slot: ${slot.name} released`);
  process.exit(code);
}
