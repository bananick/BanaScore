#!/usr/bin/env bash
# .claude/hooks/ship-push.sh — auto-push committed work on feature branches when Claude stops.
# Part of the "ship when finished" rule. SAFETY: never main/master, never commits,
# never force-pushes — it only pushes commits the agent already made.
set -uo pipefail

root=$(git rev-parse --show-toplevel 2>/dev/null) || exit 0
cd "$root" || exit 0

branch=$(git rev-parse --abbrev-ref HEAD 2>/dev/null) || exit 0
case "$branch" in
  main|master|HEAD|"") exit 0 ;;   # never auto-push the trunk or a detached HEAD
esac

if git rev-parse --abbrev-ref --symbolic-full-name '@{u}' >/dev/null 2>&1; then
  # Upstream exists — push only if there are unpushed commits.
  [ -z "$(git log '@{u}..HEAD' --oneline 2>/dev/null)" ] && exit 0
  git push >/dev/null 2>&1 && echo "{\"systemMessage\":\"🚀 auto-pushed committed work to $branch\"}"
else
  # No upstream yet — set it.
  git push -u origin "$branch" >/dev/null 2>&1 && echo "{\"systemMessage\":\"🚀 auto-pushed $branch (set upstream)\"}"
fi
exit 0
