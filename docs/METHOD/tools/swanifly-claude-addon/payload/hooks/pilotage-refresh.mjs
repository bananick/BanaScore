#!/usr/bin/env node
// .claude/hooks/pilotage-refresh.mjs — Stop hook.
// Keeps docs/pilotage/index.html in sync with its two real inputs — docs/sprints/**
// and docs/pilotage/chantiers.mjs — without paying the ~4.4s build on every turn.
//
// Contract, mirrored from session-telemetry.mjs (read that file before changing this one):
//   · No-ops in well under a second on a turn that didn't touch either input — the common
//     case, and the whole point: Stop fires after every assistant turn, so a hook that
//     always rebuilds would tax every turn of every session for a page most turns never
//     change.
//   · Fails open on ANY error — a bad stdin payload, a missing/unreadable transcript, a
//     build-pilotage.mjs crash (e.g. assertProvenance rejecting an in-progress edit to
//     chantiers.mjs) — never blocks Claude from stopping, never prints anything, never
//     returns a systemMessage. A comfort hook that talks is a comfort hook that eventually
//     breaks a session.
//   · Never commits, never pushes. It only regenerates docs/pilotage/index.html; landing
//     that file is the job of the existing land.mjs Stop hook, on its own schedule.
//
// Detecting "did THIS turn touch the inputs": grep-ing `git status --porcelain` for those
// paths was the first idea and is wrong — the land.mjs Stop hook (also wired on Stop, lane
// "docs") can commit docs/sprints/**.md and chantiers.mjs to main before this hook runs,
// which would make the working tree look clean even on the turn that changed them. Instead
// this reads the SAME transcript session-telemetry.mjs already parses and looks for Edit/
// Write tool_use calls whose file_path falls under docs/sprints/ or
// docs/pilotage/chantiers.mjs, scoped to entries after the last genuine human message (a
// "turn" = everything since the operator's last real prompt; tool-result replies are also
// logged as type:'user' and must not be mistaken for one — see session-telemetry.mjs's own
// comment on `isMeta` for why). That boundary is what keeps a long session from re-running
// the build on every subsequent Stop just because sprints were touched once, ten turns ago.
//
// Deliberately NOT scanned: sub-agent transcripts (session-telemetry.mjs aggregates those
// for token totals). A delegated agent editing docs/sprints/** on this session's behalf
// will be caught by ITS OWN Stop-equivalent lifecycle in most flows; adding subagent-file
// scanning here would need its own "already accounted for" bookkeeping to avoid re-rebuilding
// on every later turn, which is more machinery than this comfort hook is worth. Known gap,
// not a silent one.

import { readFileSync, existsSync } from 'node:fs';
import { spawnSync } from 'node:child_process';
import { join } from 'node:path';

const TARGET_RE = /[\\/]docs[\\/](sprints[\\/]|pilotage[\\/]chantiers\.mjs$)/i;

function readStdin() {
  try {
    return readFileSync(0, 'utf8');
  } catch {
    return '';
  }
}

/** Everything from the last genuine human message to the end of the transcript. */
function lastTurnEntries(transcriptPath) {
  const raw = readFileSync(transcriptPath, 'utf8');
  const entries = [];
  for (const line of raw.split('\n')) {
    if (!line.trim()) continue;
    try {
      entries.push(JSON.parse(line));
    } catch {
      // tolerate a truncated last line if the transcript is being written concurrently
    }
  }
  let start = 0;
  for (let i = entries.length - 1; i >= 0; i--) {
    const e = entries[i];
    if (
      e.type === 'user' &&
      e.message?.role === 'user' &&
      typeof e.message.content === 'string' &&
      !e.isMeta
    ) {
      start = i;
      break;
    }
  }
  return entries.slice(start);
}

function turnTouchedTargets(entries) {
  for (const e of entries) {
    if (e.type !== 'assistant' || e.message?.role !== 'assistant') continue;
    const content = e.message?.content;
    if (!Array.isArray(content)) continue;
    for (const block of content) {
      if (block?.type !== 'tool_use') continue;
      if (block.name !== 'Edit' && block.name !== 'Write') continue;
      const p = block.input?.file_path;
      if (typeof p === 'string' && TARGET_RE.test(p)) return true;
    }
  }
  return false;
}

function main() {
  const raw = readStdin();
  if (!raw) return;
  let payload;
  try {
    payload = JSON.parse(raw);
  } catch {
    return;
  }

  const transcriptPath = payload.transcript_path ?? payload.transcriptPath;
  const projectDir = process.env.CLAUDE_PROJECT_DIR || payload.cwd || process.cwd();
  if (!transcriptPath || !existsSync(transcriptPath)) return;

  const entries = lastTurnEntries(transcriptPath);
  if (!turnTouchedTargets(entries)) return; // nothing this turn touched the build's inputs

  const script = join(projectDir, 'scripts', 'build-pilotage.mjs');
  if (!existsSync(script)) return;

  spawnSync(process.execPath, [script], {
    cwd: projectDir,
    stdio: 'ignore',
    timeout: 60_000,
  });
}

try {
  main();
} catch {
  // Fail open — a refresh bug must never block Claude from stopping.
}
process.exit(0);
