# Claude Working Agreements

**Owner:** Lucia (method-level) + Junia (repo-specific)  
**Version:** 308.a  
**Purpose:** Light working agreements for the Claude suite (Claude Desktop + Claude Code)

---

## Philosophy

This file contains **thin** agreements for working with Claude. No heavy ceremony.

Reflect these in your **global Desktop custom instructions**, and rely on `CLAUDE.md`
auto-load in **Claude Code**. They are working agreements, not gates.

---

## Core Agreements

### 1. Status Updates

**Before using tools,** provide a brief 1-3 sentence status:

```
I'll read the sprint task file, then implement the settings page component.
```

**Then execute in the same turn.**

**Why:** Clarity on what you're about to do (vs. what you think you should do).

---

### 2. Code Citation

**For existing code** (in codebase):
```
```startLine:endLine:filepath
// code content
```
```

**For new/proposed code** (not yet in codebase):
```language
// code content
```

**Why:** Claude Code renders `file_path:line` as clickable references; cite existing code by path + line.

---

### 3. Message Style

- **Concise sections** with bullets (not paragraphs)
- **Backticks** for file/dir/function names (e.g., `method-core.md`, `src/lib/auth.ts`)
- **No emojis** unless user explicitly requests
- **Math:** Use `\( ... \)` for inline, `\[ ... \]` for block

**Why:** Clean, scannable, professional.

---

### 4. .env Policy

**DO NOT edit `.env`** unless user explicitly instructs.

**If .env changes needed:**
1. Propose in chat
2. Wait for approval
3. Update `.env.example` (committed to git)

**Why:** Secrets management; avoid accidental leaks.

---

### 5. Ports

**Run app on `.env` PORT** (or default if not set).

**DO NOT override locally** (e.g., `--port 3001`).

**Why:** Consistency; firewall rules; team coordination.

---

### 6. Sprint Artifacts

**Use weekly folder structure:**
```
docs/sprints/{year}/week-{##}/
```

**Task file format:**
```
{sprint}-{seq} {status} {Agent} - {title}.md
```

**Status tags (emoji):**
- `⬜` Todo
- `✅` Done (executor complete; ready for review)
- `⚠️` Problem
- `☑️` Validated (Review Gate passed)


---

### 7. Tests

**Prefer Vitest** for new tests (unit, integration, component).

**Use Playwright** for E2E tests.

**Keep fixtures/builders clear** — no magic, explicit setup.

**Why:** Standardization; readability; maintainability.

---

### 8. i18n

**EN and FR required** for all user-facing strings.

**ES optional** until activated in app-settings.json.

**Avoid hard-coded UI strings** — use `t('key')` from next-intl.

**Why:** Bilingual baseline (Canada); expansion-ready.

---

### 9. Git Commits

**Follow conventional commits** (optional but recommended):
```
feat: add user settings page
fix: resolve caching issue in settings
chore: update METHOD to v308.a
docs: clarify sprint DoD
```

**Why:** Clear history; automated changelogs; semantic versioning.

---

### 10. File Operations

**Use the dedicated tools** (Read / Write / Edit), not shell `cat` / `echo >` / `sed`.

**Why:** They handle encoding, permissions, and error handling, and keep file state tracked.

---

## Project Context (instead of repo rules)

- **Claude Code** auto-loads root `CLAUDE.md` — keep code conventions there.
- **Claude Desktop** uses the app **Project's custom instructions** (paste `CLAUDE.md`) plus
  **Project knowledge** (`STATE.md`/`DESIGN.md`/`SCHEMA.md`) and the agent **Skills**
  (`.claude/skills/`).
- No `.cursor/rules/` — that mechanism is retired in v308.a.

---

## Working with METHOD

### Sync Before Planning

**Junia:** Run this before sprint planning (from Bana-Share root):
```bash
npm run sync-method:all:dry   # preview drift; run sync-method:all to apply
```

**Why:** Get latest METHOD updates.

---

### Load Only What You Need

**Don't load full METHOD/** — use entry points:
- AGENT ENTRY (your role)
- TASK ENTRY (specific work)

**See:** `METHOD.md` for routing tables.

**Why:** Faster context loading; less noise.

---

### Propose METHOD Changes

**Don't edit `docs/METHOD/` files directly** — they sync from upstream.

**To propose changes:**
1. Create `docs/interventions/YYYY-MM-DD-Lucia-{topic}.md`
2. Lucia reviews → mini-RFC if major
3. Updates upstream (Bana-Share)
4. All apps sync

**Why:** METHOD is authoritative; avoid drift.

---

## Debugging Workflow

1. **Read error** (terminal, browser console, logs)
2. **Identify file/line** (stack trace)
3. **Read context** (surrounding code, tests, docs)
4. **Form hypothesis** (what went wrong?)
5. **Test hypothesis** (add logging, breakpoints)
6. **Fix** (minimal change)
7. **Verify** (run tests, smoke test)
8. **Document** (if bug, create BUG-###.md)

**Why:** Systematic approach; avoids guessing.

---

## Testing Workflow

1. **Write test first** (TDD optional but encouraged in FULL)
2. **Red:** Test fails
3. **Green:** Implement until test passes
4. **Refactor:** Clean up code
5. **Commit:** Atomic change with test

**Why:** Tests as contracts; confidence in changes.

---

## When to Ask for Clarification

**If uncertainty > 5%** (Managers only: April, Junia, Nova, Sage, Lucia):
1. Batch concise questions (2-5)
2. Ask user
3. Update docs FIRST (VISION, ROADMAP, DESIGN, AI-INFRA)
4. Then execute

**Developers** (Brian, Teddy, Aiko, Watson): Proceed with best judgment; flag uncertainty in report.

**Why:** Docs as truth; avoid incorrect assumptions.

---

## Communication Style

- **Be concise** — Respect user's time
- **Be specific** — File paths, line numbers, exact error messages
- **Be proactive** — Do what you say in the same turn
- **Be honest** — Flag blockers, uncertainties, mistakes

**Why:** Trust, efficiency, clarity.

---

## Next Steps

1. **Read:** `METHOD.md` (5 min) to understand routing
2. **Choose:** Your entry method (AGENT/TASK/WORKFLOW)
3. **Load:** Only relevant files (2-4, not all)
4. **Execute:** Follow DoD
5. **Report:** Append to sprint task file

---

**Owner:** Lucia (method-level) + Junia (repo-specific)  
**Last Updated:** 2026-06-01
