// .claude/hooks/lib/chantier-status.mjs — pure helpers for the chantier-status Stop hook.
// Node built-ins only (a dependency = a lockfile change = a landing exception). No I/O here.
//
// validateFiche() is the HAND-ROLLED MIRROR of docs/METHOD/templates/chantier-status.schema.json
// (schema `chantier-status/1`). Change the schema and this file together;
// tests/chantier-status.lib.test.mjs fails if the enums, required fields or caps drift apart.

/** The 12 cohort ids. Informational since 322.b: `agent` is validated by AGENT_RE, so a domain owner passes too. */
export const AGENTS = ['junia', 'brian', 'sage', 'watson', 'kasper', 'vera', 'nova', 'gordon', 'iris', 'lucia', 'penny', 'oscar'];
/** `agent` = a cohort id or a domain owner declared in the app's business pack (docs/project/business/README.md): a lowercase slug. */
export const AGENT_RE = /^[a-z][a-z0-9-]{1,23}$/;
export const STATES = ['planning', 'working', 'waiting', 'blocked', 'landed', 'parked'];
export const GATE_KEYS = ['lint', 'typecheck', 'tests', 'build'];
export const GATE_VALUES = ['pass', 'fail', 'skip', 'unknown'];
export const TOP_FIELDS = ['v', 'chantier', 'slice', 'agent', 'title', 'branch', 'journey', 'state', 'updatedAt', 'head', 'gate', 'progress', 'decisions', 'operatorActions', 'review'];
/** String length caps that the spec fixes (the rest live inline below, mirrored in the schema). */
export const CAPS = { slice: 8, title: 40, progressItem: 100 };
/** An `updatedAt` later than now + this many seconds is a guessed clock, not a write time. */
export const FUTURE_SLACK_SECONDS = 120;

const SLUG_RE = /^[a-z0-9]+(-[a-z0-9]+)*$/;
const SHA_RE = /^[0-9a-f]{7,40}$/;
const ISO_RE = /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}(\.\d+)?(Z|[+-]\d{2}:\d{2})$/;

const isObj = (x) => typeof x === 'object' && x !== null && !Array.isArray(x);
const fmt = (v) => {
  const s = JSON.stringify(v) ?? String(v);
  return s.length > 30 ? `${s.slice(0, 27)}...` : s;
};
const at = (path, key) => (path ? `${path}.${key}` : key);

/** @param {string[]} errs @param {string} path @param {unknown} v @param {number} max */
function str(errs, path, v, max, { min = 1, re = null, nullable = false } = {}) {
  if (v === null && nullable) return;
  if (typeof v !== 'string') { errs.push(`${path}: expected a string${nullable ? ' or null' : ''}, got ${fmt(v)}`); return; }
  if (v.length < min) errs.push(`${path}: must not be empty`);
  if (v.length > max) errs.push(`${path}: ${v.length} chars, max ${max}`);
  if (re && !re.test(v)) errs.push(`${path}: bad format, got ${fmt(v)}`);
}

function oneOf(errs, path, v, allowed) {
  if (!allowed.includes(v)) errs.push(`${path}: must be one of ${allowed.join('|')}, got ${fmt(v)}`);
}

/** Checks required/unknown keys; `keys` maps field -> required?. Returns false when `v` is not an object. */
function obj(errs, path, v, keys) {
  if (!isObj(v)) { errs.push(`${path || 'fiche'}: expected an object, got ${fmt(v)}`); return false; }
  for (const [k, required] of Object.entries(keys)) if (required && !(k in v)) errs.push(`${at(path, k)}: missing`);
  for (const k of Object.keys(v)) if (!(k in keys)) errs.push(`${at(path, k)}: unknown field`);
  return true;
}

function arr(errs, path, v, each, { min = 0, max = Infinity } = {}) {
  if (!Array.isArray(v)) { errs.push(`${path}: expected an array, got ${fmt(v)}`); return; }
  if (v.length < min) errs.push(`${path}: needs at least ${min} item(s)`);
  if (v.length > max) errs.push(`${path}: ${v.length} items, max ${max}`);
  v.forEach((item, i) => each(item, `${path}[${i}]`));
}

/** Runs `fn(value, path)` for each present key of `o` that has a checker. */
function fields(o, path, checkers) {
  for (const [k, fn] of Object.entries(checkers)) if (k in o) fn(o[k], at(path, k));
}

const strList = (errs, max) => (v, path) => arr(errs, path, v, (s, p) => str(errs, p, s, max));

function checkDecision(errs, d, path) {
  if (!obj(errs, path, d, { id: true, question: true, options: true, reco: true, ifNoAnswer: true, status: true, answer: false })) return;
  fields(d, path, {
    id: (v, p) => str(errs, p, v, 16),
    question: (v, p) => str(errs, p, v, 300),
    options: (v, p) => arr(errs, p, v, (s, q) => str(errs, q, s, 120), { min: 1 }),
    reco: (v, p) => str(errs, p, v, 300),
    ifNoAnswer: (v, p) => str(errs, p, v, 200),
    status: (v, p) => oneOf(errs, p, v, ['open', 'answered', 'consumed']),
    answer: (v, p) => str(errs, p, v, 500, { nullable: true, min: 0 }),
  });
}

function checkAction(errs, a, path) {
  if (!obj(errs, path, a, { id: true, action: true, why: true, status: true })) return;
  fields(a, path, {
    id: (v, p) => str(errs, p, v, 16),
    action: (v, p) => str(errs, p, v, 200),
    why: (v, p) => str(errs, p, v, 200),
    status: (v, p) => oneOf(errs, p, v, ['open', 'done']),
  });
}

function checkQuestion(errs, q, path) {
  if (!obj(errs, path, q, { q: true, options: true, reco: true })) return;
  fields(q, path, {
    q: (v, p) => str(errs, p, v, 200),
    options: (v, p) => arr(errs, p, v, (s, x) => str(errs, x, s, 120), { min: 1 }),
    reco: (v, p) => str(errs, p, v, 120),
  });
}

function checkReview(errs, r, path) {
  if (!obj(errs, path, r, { id: true, kind: true, what: true, evidence: true, script: true, questions: true, status: true, feedback: false })) return;
  fields(r, path, {
    id: (v, p) => str(errs, p, v, 16),
    kind: (v, p) => oneOf(errs, p, v, ['plan', 'result']),
    what: (v, p) => str(errs, p, v, 200),
    evidence: (v, p) => arr(errs, p, v, (s, x) => str(errs, x, s, 200)),
    script: (v, p) => str(errs, p, v, 600, { min: 0 }),
    questions: (v, p) => arr(errs, p, v, (q, x) => checkQuestion(errs, q, x), { min: 1, max: 3 }),
    status: (v, p) => oneOf(errs, p, v, ['open', 'accepted', 'reopened', 'deferred']),
    feedback: (v, p) => str(errs, p, v, 500, { nullable: true, min: 0 }),
  });
}

/**
 * Validates a parsed fiche against `chantier-status/1`.
 * @param {unknown} f
 * @param {number} [nowMs] the clock, epoch ms (injectable for tests); `updatedAt` beyond now + 120 s is invalid
 * @returns {string[]} one human-readable line per problem; empty = valid
 */
export function validateFiche(f, nowMs = Date.now()) {
  const errs = [];
  if (!obj(errs, '', f, Object.fromEntries(TOP_FIELDS.map((k) => [k, true])))) return errs;
  fields(f, '', {
    v: (v, p) => { if (v !== 1) errs.push(`${p}: must be 1, got ${fmt(v)}`); },
    chantier: (v, p) => str(errs, p, v, 60, { re: SLUG_RE }),
    slice: (v, p) => str(errs, p, v, CAPS.slice),
    agent: (v, p) => { if (typeof v !== 'string' || !AGENT_RE.test(v)) errs.push(`${p}: must be a lowercase slug (${AGENT_RE.source}) naming a cohort id or a business-pack domain owner, got ${fmt(v)}`); },
    title: (v, p) => str(errs, p, v, CAPS.title),
    branch: (v, p) => str(errs, p, v, 200),
    journey: (v, p) => str(errs, p, v, 200),
    state: (v, p) => oneOf(errs, p, v, STATES),
    updatedAt: (v, p) => {
      str(errs, p, v, 40, { re: ISO_RE });
      if (typeof v !== 'string' || !ISO_RE.test(v)) return;
      const ms = Date.parse(v);
      if (Number.isNaN(ms)) errs.push(`${p}: not a real date, got ${fmt(v)}`);
      else if (ms > nowMs + FUTURE_SLACK_SECONDS * 1000) errs.push(`${p} is in the future (got ${v}, now=${new Date(nowMs).toISOString()}) — stamp it from the real clock`);
    },
    head: (v, p) => str(errs, p, v, 40, { re: SHA_RE, nullable: true }),
    gate: (v, p) => {
      if (obj(errs, p, v, Object.fromEntries(GATE_KEYS.map((k) => [k, true])))) fields(v, p, Object.fromEntries(GATE_KEYS.map((k) => [k, (x, q) => oneOf(errs, q, x, GATE_VALUES)])));
    },
    progress: (v, p) => {
      if (obj(errs, p, v, { done: true, doing: true, todo: true })) fields(v, p, { done: strList(errs, CAPS.progressItem), doing: strList(errs, CAPS.progressItem), todo: strList(errs, CAPS.progressItem) });
    },
    decisions: (v, p) => arr(errs, p, v, (d, x) => checkDecision(errs, d, x)),
    operatorActions: (v, p) => arr(errs, p, v, (a, x) => checkAction(errs, a, x)),
    review: (v, p) => arr(errs, p, v, (r, x) => checkReview(errs, r, x)),
  });
  return errs;
}

/**
 * True when a commit outside docs/chantiers/ is newer than the fiche's `updatedAt` + slack.
 * Strictly newer: a commit exactly `slackSeconds` after `updatedAt` is still fresh.
 * No such commit (null / NaN) -> not stale. Unparseable `updatedAt` -> stale (freshness cannot be shown).
 * @param {string} updatedAtIso
 * @param {number|string|null|undefined} lastNonFicheCommitEpoch committer time, epoch SECONDS (`git log --format=%ct`)
 * @param {number} [slackSeconds]
 */
export function isStale(updatedAtIso, lastNonFicheCommitEpoch, slackSeconds = 120) {
  if (lastNonFicheCommitEpoch === null || lastNonFicheCommitEpoch === undefined || lastNonFicheCommitEpoch === '') return false;
  const last = Number(lastNonFicheCommitEpoch);
  if (!Number.isFinite(last)) return false;
  const updatedMs = Date.parse(updatedAtIso);
  if (Number.isNaN(updatedMs)) return true;
  return last > updatedMs / 1000 + slackSeconds;
}
