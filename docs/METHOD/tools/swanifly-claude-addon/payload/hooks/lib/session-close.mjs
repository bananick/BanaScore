// .claude/hooks/lib/session-close.mjs — the pure decisions behind session-close.mjs (METHOD 336.a).
// No I/O here: facts in, verdict out, so tests/session-close.test.mjs can pin every rule.

/** The two app-tool steps the agent runs after `--apply` / `--pr` (hooks cannot call the app's session tools). */
export const NEXT_LINES = [
  'NEXT 1: SendMessage to the parent session (to: "parent" or its local_ id) — your Fait / Suite closing (METHOD 335.a)',
  'NEXT 2: mcp__ccd_session_mgmt__archive_session {session_id: "self"} — reversible',
];

/** Irreversible in production: a merge here is not undone by a revert. Subset of land.mjs's EXCEPTIONS, deliberately narrower. */
export const IRREVERSIBLE = [
  { id: 'rules', why: 'Firestore / Storage rules or Firebase wiring', test: (f) => /\.rules(\.json)?$/.test(f) || /(^|\/)(firebase\.json|\.firebaserc)$/.test(f) },
  { id: 'indexes', why: 'Firestore indexes', test: (f) => /\.indexes\.json$/.test(f) },
  { id: 'migration', why: 'data migration / backfill', test: (f) => /(^|\/)migrations?\//.test(f) || /(^|\/)[^/]*migrate[^/]*\.(mjs|ts|js)$/i.test(f) || /backfill/i.test(f) },
  { id: 'secrets', why: 'secrets / credentials', test: (f) => /(^|\/)\.env/.test(f) || /service[-_]?account/i.test(f) || /(^|\/)secrets\//.test(f) || /\.(pem|p12|key)$/.test(f) || /credentials[^/]*\.json$/.test(f) },
  { id: 'soul', why: 'the non-negotiables (SOUL.md)', test: (f) => /(^|\/)SOUL\.md$/.test(f) },
  // A PR must not judge its own merge: the gate, the hooks and their wiring are the operator's.
  { id: 'method-tooling', why: 'METHOD tooling (hooks, settings) — a PR must not judge its own merge', test: (f) => /(^|\/)\.claude\/hooks\//.test(f) || /(^|\/)\.claude\/settings\.json$/.test(f) || /(^|\/)payload\/hooks\//.test(f) },
];

const norm = (f) => String(f).replace(/\\/g, '/');

/** Files → the irreversible classes they hit (`[]` = reversible). */
export function classifyFiles(files) {
  const hits = [];
  for (const e of IRREVERSIBLE) {
    const m = files.map(norm).filter(e.test);
    if (m.length) hits.push({ id: e.id, why: e.why, files: m.slice(0, 3) });
  }
  return hits;
}

/** Holds are the operator's brake: commit SUBJECTS and the branch name only (never bodies — land.mjs's rule). */
export function holdReasons({ subjects = [], branch = '' }) {
  const out = [];
  if (/\bwip\b/i.test(branch)) out.push('branch is marked WIP');
  if (subjects.some((s) => /\[(no-auto-merge|wip|hold)\]/i.test(s))) out.push('a commit subject asks for a human merge');
  if (subjects.some((s) => /needs decision/i.test(s))) out.push('a commit subject flags "Needs decision"');
  return out;
}

/** kasper's "no" — block, or its alias reject. This goes back to the session, never to the operator's quiz. */
/** Bumped when decidePr gains a check: session-close.mjs refuses an older copy rather than silently skip it. */
export const LIB_VERSION = 2;

export const isKasperNo = (v) => !!v && (v.verdict === 'block' || v.verdict === 'reject');

/**
 * Merge or quiz? `verdict` is kasper's `.method/kasper/pr-<n>.json` (null when missing).
 * `pr.files` comes from LOCAL git (`filesError` when that failed); `subjectsError` likewise. Anything but a clean
 * approve of exactly the PR head, by kasper, on the trunk, in this repo, goes to the operator.
 */
export function decidePr({ pr, verdict, subjects = [], trunk = null, filesError = null, subjectsError = null }) {
  const reasons = [];
  let klass = 'ok';
  const set = (k) => { if (klass === 'ok') klass = k; };
  const irr = classifyFiles((pr.files ?? []).map((f) => (typeof f === 'string' ? f : f.path)));
  // Fallback: a list that may be truncated could hide an irreversible path, so fail closed.
  if ((pr.files ?? []).length >= 100) { set('irreversible'); reasons.push('100+ files — the file list is too long to trust, judged by a human'); }
  if (filesError) { set('irreversible'); reasons.push(`could not read the changed files (${filesError}), failing closed`); }
  for (const h of irr) { set(h.id === 'method-tooling' ? 'method-tooling' : 'irreversible'); reasons.push(`${h.why}: ${h.files.join(', ')}`); }
  const holds = holdReasons({ subjects, branch: pr.headRefName });
  if (holds.length) { set('hold'); reasons.push(...holds); }
  if (subjectsError) { set('hold'); reasons.push('could not read commit subjects, failing closed'); }
  if (trunk && pr.baseRefName !== trunk) { set('wrong-base'); reasons.push(`PR targets ${pr.baseRefName ?? '?'}, not the trunk ${trunk}`); }
  if (pr.isCrossRepository) { set('cross-repo'); reasons.push('PR comes from a fork / another repository'); }
  if (!verdict) { set('no-review'); reasons.push('no kasper verdict (.method/kasper/pr-<n>.json missing or unreadable)'); }
  else if (verdict.reviewer !== 'kasper') { set('no-review'); reasons.push('the verdict does not carry reviewer: "kasper"'); }
  else if (isKasperNo(verdict)) { set('kasper-block'); reasons.push('kasper blocked this PR'); }
  else if (verdict.verdict !== 'approve') { set('no-review'); reasons.push(`unknown kasper verdict "${verdict.verdict}"`); }
  else if (!verdict.sha || verdict.sha !== pr.headRefOid) { set('stale-review'); reasons.push(`kasper reviewed ${String(verdict.sha ?? '?').slice(0, 7)}, the PR head is ${String(pr.headRefOid).slice(0, 7)}`); }
  if (pr.state && pr.state !== 'OPEN') { klass = 'closed'; reasons.push(`PR is ${pr.state}`); }
  return { action: reasons.length ? 'quiz' : 'merge', klass, reasons };
}

/** The payload the coordinator turns into an AskUserQuestion: always merge / close / defer, merge never first by default unless it is safe. */
export function buildQuiz({ pr, verdict, klass, reasons }) {
  return {
    quiz: true, pr: pr.number, url: pr.url, title: pr.title, class: klass, reasons,
    kasper: verdict ? { verdict: verdict.verdict, summary: verdict.summary ?? '' } : null,
    options: [
      { id: 'merge', label: 'Merge', consequence: klass === 'irreversible' || klass === 'method-tooling' ? 'squash-merges it; the production-facing change then needs /deploy — only if you accept it cannot be reverted by a git revert' : 'squash-merges it into the trunk (LANDED, nothing deployed)' },
      { id: 'close', label: 'Close', consequence: 'closes the PR and leaves the branch for the next sweep; the work is abandoned' },
      { id: 'defer', label: 'Defer', consequence: 'nothing changes; regine lists it again in the weekly pass' },
    ],
  };
}

export function quizMarkdown(q) {
  return [
    `### Needs decision — PR #${q.pr}: ${q.title}`, q.url, '',
    `**Why it reached you (${q.class}):**`, ...q.reasons.map((r) => `- ${r}`), '',
    q.kasper ? `**Kasper (${q.kasper.verdict}):** ${q.kasper.summary || '(no summary)'}` : '**Kasper:** no verdict', '',
    ...q.options.map((o) => `- **${o.label}** — ${o.consequence}`),
  ].join('\n');
}

/** The done verdict of `--check`. `facts`: { landed, dirty:[], unpushed:[], openPr:{number}|null, prError } */
export function evaluateDone(facts) {
  const reasons = [];
  if (!facts.landed) reasons.push('not landed — the branch tip is not on the trunk (run npm run land)');
  if (facts.dirty.length) reasons.push(`${facts.dirty.length} uncommitted path(s)`);
  if (facts.unpushed.length) reasons.push(`${facts.unpushed.length} commit(s) on no remote`);
  if (facts.unpushedError) reasons.push('could not count unpushed commits — failing closed');
  if (facts.openPr) reasons.push(`open PR #${facts.openPr.number}`);
  if (facts.prError) reasons.push(`could not ask GitHub for open PRs (${facts.prError}) — failing closed`);
  return { done: reasons.length === 0, reasons };
}

/** Open PRs created more than `days` ago, oldest first, each with the quiz options. */
export function staleFilter(prs, days, now = Date.now()) {
  return prs
    .map((p) => ({ ...p, ageDays: Math.floor((now - Date.parse(p.createdAt)) / 86_400_000) }))
    .filter((p) => Number.isFinite(p.ageDays) && p.ageDays > days)
    .sort((a, b) => b.ageDays - a.ageDays)
    .map((p) => ({
      ...p,
      repo: p.repository?.nameWithOwner ?? p.repository?.name ?? null,
      options: [
        { id: 'merge', consequence: 'squash-merge it (after kasper if it is an exception)' },
        { id: 'close', consequence: 'close the PR, abandon the work' },
        { id: 'defer', consequence: 'keep it open; listed again next week' },
      ],
    }));
}
