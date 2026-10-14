#!/usr/bin/env bash
# .claude/hooks/ship-push.sh — auto-push committed work on feature branches when Claude stops.
# Part of the "ship when finished" rule. SAFETY: never main/master, never commits,
# never force-pushes — it only pushes commits the agent already made.
# A rejected push is NEVER swallowed: the error goes to stderr, to a systemMessage and to
# `<gitdir>/ship-push.last-error`; the next successful (or unnecessary) push clears that marker.
set -uo pipefail

root=$(git rev-parse --show-toplevel 2>/dev/null) || exit 0
cd "$root" || exit 0

branch=$(git rev-parse --abbrev-ref HEAD 2>/dev/null) || exit 0
case "$branch" in
  main|master|HEAD|"") exit 0 ;;   # never auto-push the trunk or a detached HEAD
esac

marker="$(git rev-parse --absolute-git-dir 2>/dev/null)/ship-push.last-error"

# Nothing of its own ahead of the trunk (just landed, or a fresh branch)? Do not (re)publish the branch.
trunk=$(git symbolic-ref --quiet --short refs/remotes/origin/HEAD 2>/dev/null | sed 's|^origin/||')
trunk=${trunk:-main}
# The trunk is never pushed from here, whatever its name (`develop`, `release`…): the case above only knows main/master.
[ "$branch" = "$trunk" ] && exit 0
if git rev-parse --verify --quiet "refs/remotes/origin/$trunk" >/dev/null 2>&1 \
   && [ -z "$(git log "origin/$trunk..HEAD" --oneline 2>/dev/null)" ]; then
  rm -f "$marker"; exit 0
fi

# Only an upstream that IS this branch on origin counts: a branch cut from origin/main tracks the trunk,
# and a bare `git push` from there fails (it used to fail silently) — publish it under its own name instead.
upstream=$(git rev-parse --abbrev-ref --symbolic-full-name '@{u}' 2>/dev/null || true)
if [ "$upstream" = "origin/$branch" ]; then
  # Upstream exists — push only if there are unpushed commits.
  if [ -z "$(git log '@{u}..HEAD' --oneline 2>/dev/null)" ]; then rm -f "$marker"; exit 0; fi
  args=(push); ok="🚀 auto-pushed committed work to $branch"
else
  # No upstream yet — set it.
  args=(push -u origin "$branch"); ok="🚀 auto-pushed $branch (set upstream)"
fi

# SKIP_QUALITY_GATES=1 (2026-09-29, upstreamed from bananaevents). The husky pre-push chain (type-check → test:unit →
# test:components → test:scripts → test:coverage → lint → build → test:rules) cannot finish inside this hook's
# 30 s: every Stop either killed it — the branch never reached origin — or, on Windows, left an orphaned
# type-check/vitest/build chain competing with the land gate for the machine. The brake for main is the land gate
# (verify-gate); a branch push deploys nothing. The proto anti-leak guard sits BEFORE the bypass in
# .husky/pre-push and still runs.
if err=$(SKIP_QUALITY_GATES=1 git "${args[@]}" 2>&1); then
  rm -f "$marker"
  echo "{\"systemMessage\":\"$ok\"}"
else
  printf '%s %s\n' "$(date -u +%Y-%m-%dT%H:%M:%SZ)" "$err" > "$marker" 2>/dev/null
  printf 'ship-push: push of %s was REJECTED:\n%s\n' "$branch" "$err" >&2
  last=$(printf '%s' "$err" | tail -n 1 | tr -d '"\\' | cut -c1-200)
  echo "{\"systemMessage\":\"⚠ ship-push: push of $branch rejected — NOT on GitHub ($last)\"}"
fi
exit 0
