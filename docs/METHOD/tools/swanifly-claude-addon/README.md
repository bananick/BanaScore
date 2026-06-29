# swanifly-claude-addon

Claude Code integration for the Swanifly **METHOD**, shipped as a METHOD tool (sibling of `swanifly-antigravity-addon`). It makes Claude Code a first-class citizen of the methodology in **every** app, not just Bana-Share.

## What it installs into an app

| Target | Files | Policy |
|:--|:--|:--|
| App root | `AGENTS.md`, `SOUL.md`, `CLAUDE.md` | **create-if-missing** — never clobbers an app's own identity |
| App `CLAUDE.md` | the **"Design port directive"** block | **merge** — marker-guarded; reaches apps that already had a CLAUDE.md (create-if-missing alone never would) |
| `.claude/commands/` | `plan-sprint`, `port`, `review`, `intervention`, `ship` | **overwrite** — canonical METHOD rituals |
| `.claude/skills/` | `deploy`, `implement-plan`, `ux-review`, `landing-page`, `ads-ops`, `ship-check`, `sprint`, `hubspot-sync` | **overwrite** — canonical tooling |
| `docs/project/design/` | `PORT-MAP-TEMPLATE.md` | **overwrite** — reference template the `/port` loop starts from (the live `PORT-MAP.md` is never touched) |
| `.claude/hooks/` | `no-mock-guard.ps1` | **overwrite** |
| `.claude/settings.json` | the `PostToolUse(Write\|Edit)` no-mock hook | **merge** — idempotent, preserves other settings |

`CLAUDE.md` is auto-loaded by Claude Code; it `@import`s `SOUL.md` + `AGENTS.md` and mirrors `GEMINI.md` (agent cohort, context-loading rules, hierarchy of truth, sprint conventions, Definition of Done).

## The design-port loop (Claude Design → app code)

The addon makes every app able to run `/port` without restating instructions: it ships the `/port`
command, merges the **"Design port directive"** block into the app's `CLAUDE.md`
(source: `payload/snippets/design-port-directive.md`), and drops `PORT-MAP-TEMPLATE.md`. The full
operating guide is `docs/porting/PORTING-PLAYBOOK.md`; the method spec is
`docs/METHOD/design-method.md` → "Design Port Loop". Per-app, the operator commits a Claude Design
export to `docs/project/design/artifacts/{app}/`, generates `PORT-MAP.md` from the template, then runs
`/port foundation` → `/port nav` → `/port <screen>` (one PR each).

## The no-mock guard

`no-mock-guard.ps1` runs after every `Write`/`Edit`. If it sees mock/fixture signals (`mockData`, `fixtures/`, `faker`, `sampleData`, …) in a source file (`.ts/.tsx/.js/.jsx/.mjs`, excluding tests/docs/qa) it returns exit 2, feeding the violation back to Claude. This enforces **REAL — Data Integrity** (`code-rules.md` §6 / `SOUL.md` non-negotiable #1). Fails open on any error, so it never blocks a legitimate edit.

## Usage

**Automatic** — `npm run sync-method:all` seeds every app after copying METHOD. Skip with `--no-claude`.

**Manual** — into one app:
```bash
node docs/METHOD/tools/swanifly-claude-addon/install.mjs <path-to-app> [--dry-run]
```

## Notes

- The 5 generic skills (`deploy`, `implement-plan`, `ux-review`, `landing-page`, `ads-ops`) are also installed at user level (`~/.claude/skills/`) on the dev's machine, so they already work in every repo; the per-app copies make each app self-contained for collaborators / CI.
- The hook command is Windows PowerShell (`powershell.exe`). A POSIX variant would need a `.sh` guard + a second hook entry.
- This addon is the **canonical source** for portable app seeding; edit it here (Lucia curates), then re-sync. Bana-Share's live copies (root + `.claude/`) should mirror this payload.
