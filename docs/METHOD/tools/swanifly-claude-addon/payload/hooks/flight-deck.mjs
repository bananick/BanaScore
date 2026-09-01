#!/usr/bin/env node
// .claude/hooks/flight-deck.mjs — fleet-portable pickup context for /brief and the
// SessionStart resume hook.
//
// This is the Node port of the machine-local ~/.claude/scripts/flight-deck.ps1: that script
// only exists on Nicolas's own machine, is PowerShell-only, and reads a machine-absolute
// memory path — so it never travelled with the METHOD and gave every OTHER checkout (a
// sibling GitHub repo, Claude Code cloud, a teammate's machine) no pickup card at all. This
// file ships via the addon like land.mjs / verify-gate.mjs / session-telemetry.mjs, so /brief
// and the resume hook work identically on every surface, not just this one PowerShell profile.
//
// Modes:
//   context      — print `flight_deck_context:` (git + sprint + memory summary), used by the
//                  /brief command's `!`...`` live-context injection.
//   resume-hook  — same summary, wrapped as SessionStart hookSpecificOutput JSON.
//
// Deliberately NOT ported: `statusline` mode. The statusline is a per-machine terminal
// decoration configured once in ~/.claude/settings.json; it already works across every repo
// from that one global config and gains nothing from living in each app.
//
// Fails open on every step: a missing `gh`, an unreadable memory dir, or a repo with no
// docs/sprints all degrade to "none" rather than throwing. This must never block a session.

import { existsSync, readdirSync, readFileSync } from 'node:fs';
import { homedir } from 'node:os';
import { join, dirname, basename, resolve } from 'node:path';
import { spawnSync } from 'node:child_process';

function readStdin() {
  try {
    return readFileSync(0, 'utf8');
  } catch {
    return '';
  }
}

function parseJsonSafe(text) {
  if (!text || !text.trim()) return null;
  try {
    return JSON.parse(text);
  } catch {
    return null;
  }
}

function runGit(args, cwd) {
  const res = spawnSync('git', ['-C', cwd, ...args], { encoding: 'utf8' });
  if (res.status !== 0 || res.error) return '';
  return (res.stdout || '').trim();
}

function getPrSummary(cwd) {
  const ghCheck = spawnSync('gh', ['--version'], { encoding: 'utf8' });
  if (ghCheck.error) return 'none (gh unavailable)';
  const res = spawnSync(
    'gh',
    ['pr', 'view', '--json', 'number,title,state,isDraft,url'],
    { cwd, encoding: 'utf8' }
  );
  if (res.status !== 0 || !res.stdout || !res.stdout.trim()) return 'none';
  const pr = parseJsonSafe(res.stdout);
  if (!pr) return 'none';
  const draft = pr.isDraft ? ' draft' : '';
  return `#${pr.number} ${pr.state}${draft} - ${pr.title} - ${pr.url}`;
}

// Claude Code keys each project's memory dir by the sanitized absolute cwd path
// (":" and "/" or "\" -> "-"), same convention the resume hook and /brief rely on
// globally. Exact-match only — a fuzzy "repo name contains X" fallback would bleed
// memory across unrelated projects and across two checkouts of the same repo.
function getMemorySummary(cwd) {
  const projectsRoot = join(homedir(), '.claude', 'projects');
  if (!existsSync(projectsRoot)) return null;
  let resolved = cwd;
  try {
    resolved = resolve(cwd);
  } catch {
    /* keep raw cwd */
  }
  const sanitized = resolved.replace(/:/g, '-').replace(/[\\/]+/g, '-');
  const memoryDir = join(projectsRoot, sanitized, 'memory');
  if (!existsSync(memoryDir)) return null;
  let files = [];
  try {
    files = readdirSync(memoryDir, { withFileTypes: true })
      .filter((e) => e.isFile() && e.name.endsWith('.md'))
      .map((e) => e.name);
  } catch {
    files = [];
  }
  return { directory: memoryDir, files };
}

// Sprint numbers are {NNN} (1-3 digits) per sprints-method.md; capping at 3 digits keeps a
// year-named folder ("2025") from sorting to the top and being reported as the sprint.
const SPRINT_FOLDER_RE = /^\s*(\d{1,3})(\D|$)/;
// Two status vocabularies coexist across the fleet: the METHOD emoji convention and the
// ASCII checkbox one most app repos actually use ("023-a [ ] Brian - ..."). Count both, or
// this silently reports 0/0 on the majority of apps.
const DONE_MARK = /(\[[xX]\])|[✅☑]/;
const TODO_MARK = /(\[ ?\])|⬜/;
const PROBLEM_MARK = /(\[!\])|⚠/;
const ANY_MARK = new RegExp(`${DONE_MARK.source}|${TODO_MARK.source}|${PROBLEM_MARK.source}`);
// A sprint's own index file ("023 <status> <name>.md") is not a task file.
const TASK_NAME_RE = /^\s*\d{1,4}\s*-\s*[a-zA-Z0-9]+\b/;

// Walk up from the working directory to find docs/sprints, stopping at the git root. A
// nested app mirror (Bana-Share/Apps/Banadoo) keeps its own docs/sprints while sharing the
// hub's git root, so anchoring only on the git root would report "no sprint" for it.
function resolveSprintsRoot(startDir, repoRoot) {
  let current = startDir;
  const normalizedRoot = repoRoot ? resolve(repoRoot) : null;
  for (let i = 0; i < 12 && current; i++) {
    const candidate = join(current, 'docs', 'sprints');
    if (existsSync(candidate)) return candidate;
    if (normalizedRoot && resolve(current) === normalizedRoot) return null;
    const parent = dirname(current);
    if (parent === current) return null;
    current = parent;
  }
  return null;
}

function getSprintSummary(startDir, repoRoot) {
  const sprintsRoot = resolveSprintsRoot(startDir, repoRoot);
  if (!sprintsRoot) return null;

  let entries;
  try {
    entries = readdirSync(sprintsRoot, { withFileTypes: true }).filter((e) => e.isDirectory());
  } catch {
    return null;
  }
  const folders = entries
    .filter((e) => SPRINT_FOLDER_RE.test(e.name))
    .sort((a, b) => {
      const na = parseInt(a.name.match(SPRINT_FOLDER_RE)[1], 10);
      const nb = parseInt(b.name.match(SPRINT_FOLDER_RE)[1], 10);
      return na - nb;
    });
  if (folders.length === 0) return null;

  // Prefer the highest-numbered sprint not itself marked done/validated; if every sprint is
  // closed, report the latest one so the row still says something true.
  const open = folders.filter((f) => !DONE_MARK.test(f.name));
  const target = open.length > 0 ? open[open.length - 1] : folders[folders.length - 1];

  let files;
  try {
    files = readdirSync(join(sprintsRoot, target.name), { withFileTypes: true })
      .filter((e) => e.isFile() && e.name.endsWith('.md'))
      .map((e) => e.name)
      .filter((name) => ANY_MARK.test(name) && TASK_NAME_RE.test(name));
  } catch {
    files = [];
  }

  if (files.length === 0) {
    return { name: target.name, total: 0, done: 0, todo: 0, problem: 0 };
  }
  return {
    name: target.name,
    total: files.length,
    done: files.filter((n) => DONE_MARK.test(n)).length,
    todo: files.filter((n) => TODO_MARK.test(n)).length,
    problem: files.filter((n) => PROBLEM_MARK.test(n)).length,
  };
}

function getGitSummary(cwd, includePr) {
  const inside = runGit(['rev-parse', '--is-inside-work-tree'], cwd);
  if (inside !== 'true') return null;

  const root = runGit(['rev-parse', '--show-toplevel'], cwd);
  let branch = runGit(['branch', '--show-current'], cwd);
  if (!branch) branch = runGit(['rev-parse', '--short', 'HEAD'], cwd);

  const upstream = runGit(['rev-parse', '--abbrev-ref', '--symbolic-full-name', '@{u}'], cwd);
  let ahead = 0;
  let behind = 0;
  if (upstream) {
    const counts = runGit(['rev-list', '--left-right', '--count', `${upstream}...HEAD`], cwd).split(/\s+/);
    if (counts.length >= 2) {
      behind = parseInt(counts[0], 10) || 0;
      ahead = parseInt(counts[1], 10) || 0;
    }
  }

  const statusRaw = runGit(['status', '--porcelain=v1'], cwd);
  const statusLines = statusRaw ? statusRaw.split(/\r?\n/).filter((l) => l.trim()) : [];
  let staged = 0;
  let unstaged = 0;
  let untracked = 0;
  const paths = [];
  for (const line of statusLines) {
    if (line.startsWith('??')) {
      untracked++;
    } else {
      if (line[0] && line[0] !== ' ') staged++;
      if (line[1] && line[1] !== ' ') unstaged++;
    }
    let path = line.length > 3 ? line.slice(3).trim() : line;
    if (path.includes(' -> ')) path = path.split(' -> ').pop();
    paths.push(path);
  }

  return {
    root,
    repo: basename(root || cwd),
    branch,
    upstream,
    ahead,
    behind,
    changedCount: statusLines.length,
    staged,
    unstaged,
    untracked,
    changedPaths: paths.slice(0, 12),
    lastCommit: runGit(['log', '-1', '--pretty=format:%h %s'], cwd),
    pr: includePr ? getPrSummary(cwd) : 'not fetched',
  };
}

function buildContext(cwd, git, memory, sprint) {
  if (!git) {
    return ['flight_deck_context:', `  cwd: ${cwd}`, '  git: not a git repository'].join('\n');
  }

  const paths = git.changedPaths.length > 0 ? git.changedPaths.join(', ') : 'none';
  const memoryDir = memory ? memory.directory : 'none';
  const memoryFiles = memory && memory.files.length > 0 ? memory.files.join(', ') : 'none';

  let sprintName = 'none';
  let sprintProgress = 'none';
  if (sprint) {
    sprintName = sprint.name;
    sprintProgress =
      sprint.total > 0
        ? `${sprint.done}/${sprint.total} tasks done (${sprint.todo} todo, ${sprint.problem} problem)`
        : 'no status-tagged task files';
  }

  return [
    'flight_deck_context:',
    `  cwd: ${cwd}`,
    `  repo_root: ${git.root}`,
    `  repo: ${git.repo}`,
    `  branch: ${git.branch}`,
    `  upstream: ${git.upstream}`,
    `  ahead: ${git.ahead}`,
    `  behind: ${git.behind}`,
    `  changed_files: ${git.changedCount}`,
    `  staged: ${git.staged}`,
    `  unstaged: ${git.unstaged}`,
    `  untracked: ${git.untracked}`,
    `  changed_paths: ${paths}`,
    `  last_commit: ${git.lastCommit}`,
    `  pr: ${git.pr}`,
    `  sprint: ${sprintName}`,
    `  sprint_progress: ${sprintProgress}`,
    `  project_memory_dir: ${memoryDir}`,
    `  project_memory_files: ${memoryFiles}`,
  ].join('\n');
}

// Priority matches the PS1 original exactly: an explicit --cwd flag, then the cwd Claude
// Code pipes in as JSON on stdin for the resume hook, then process.cwd() — which is already
// the project root for both the resume-hook subprocess and the /brief `!`command`` shell, so
// no CLAUDE_PROJECT_DIR env lookup is needed (and would be actively wrong: it reflects the
// CALLING session's project, not necessarily the cwd this invocation actually cares about).
function resolveCwd(explicitCwd, inputData) {
  let candidate = explicitCwd;
  if (!candidate && inputData) candidate = inputData.cwd;
  if (!candidate && inputData && inputData.workspace) candidate = inputData.workspace.current_dir;
  if (!candidate) candidate = process.cwd();
  try {
    return resolve(candidate);
  } catch {
    return candidate;
  }
}

function main() {
  const args = process.argv.slice(2);
  const modeIdx = args.indexOf('--mode');
  const mode = modeIdx >= 0 ? args[modeIdx + 1] : 'context';
  const cwdIdx = args.indexOf('--cwd');
  const explicitCwd = cwdIdx >= 0 ? args[cwdIdx + 1] : '';

  // Context mode (used by /brief) must not block on an open-but-empty redirected stdin —
  // only resume-hook mode gets JSON piped in (and closed) by Claude Code.
  let inputData = null;
  if (mode !== 'context') {
    inputData = parseJsonSafe(readStdin());
  }
  const cwd = resolveCwd(explicitCwd, inputData);

  const includePr = mode !== 'statusline';
  const git = getGitSummary(cwd, includePr);
  const memory = getMemorySummary(cwd);
  const sprint = git ? getSprintSummary(cwd, git.root) : null;
  const context = buildContext(cwd, git, memory, sprint);

  if (mode === 'resume-hook') {
    const additionalContext = `Resume Flight Deck context:\n${context}\n\nOn the next assistant reply after this resume, start with the six-line Flight Deck from CLAUDE.md (pickup card). Keep it grounded in this context; read listed memory files only if needed. Close that reply with the Debrief card, using sprint_progress above for its Avancement row.`;
    process.stdout.write(
      JSON.stringify({
        hookSpecificOutput: {
          hookEventName: 'SessionStart',
          additionalContext,
        },
      })
    );
    return;
  }

  process.stdout.write(context + '\n');
}

main();
