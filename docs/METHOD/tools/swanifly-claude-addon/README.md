# swanifly-claude-addon

Claude Code integration for the Swanifly **METHOD**, shipped as a METHOD tool. It makes Claude Code a
first-class citizen of the methodology in **every** app, not just Bana-Share.

## What it installs into an app (METHOD v318.a)

| Target | Files | Policy |
|:--|:--|:--|
| App `SOUL.md` | `## Non-negotiables` + `## Boundaries` | **merge** — the two **hub-owned** sections are rewritten from the payload; every other section (identity, mission, personas, voice) is **app-owned** and never touched. Created from the payload seed (neutral placeholders) only when the app has no `SOUL.md`. |
| App `AGENTS.md` | the non-Claude mirror | refreshed from the payload, unless the app owns its identity files (the BanaLazer 041-g rule, upstreamed in 318.a: CRLF-insensitive compare, app-owned identity kept) |
| App `CLAUDE.md` | the whole file (seed) | **create-if-missing** — an existing `CLAUDE.md` is app-owned |
| App `CLAUDE.md` | five hub-owned sections: `## Agent Cohort` · `## Model Routing` · `## Landing & conversation size` · `## Communication Contract` · `## Design port directive` | **merge** — matched by heading prefix, added when absent, refreshed when the hub text changes; the rest of the file is left alone. An app keeps its own version of one by listing it in `docs/METHOD/app-settings.json` → `claudeAddon.ownedSections`. |
| `.claude/agents/` | the 11 active cohort agents | **overwrite** — except an **app-enriched** agent (carries `## Frontières`, `## Pièges` or `## Règle de GO`, or is listed in `claudeAddon.ownedAgents`), which is kept as is |
| `.claude/agents/` → `.claude/_dormant/agents/` | `teddy`, `aiko`, `april` | **move** (never delete) — unless the app lists the agent in `claudeAddon.activeAgents` |
| `.claude/commands/` | `brief`, `intervention`, `land`, `plan-sprint`, `port`, `relay`, `review`, `ship` (8) | **overwrite** — canonical METHOD rituals (`port` and `relay` are optional) |
| `.claude/skills/` | `ads-ops`, `deploy`, `hubspot-sync`, `implement-plan`, `landing-page`, `media`, `ux-review` (7) | **overwrite** — canonical tooling (`sprint` and `ship-check` parked in 318.a) |
| `docs/project/design/` | `PORT-MAP-TEMPLATE.md` | **overwrite** — reference template the `/port` loop starts from (the live `PORT-MAP.md` is never touched) |
| `.claude/hooks/` | `no-mock-guard.ps1`, `session-telemetry.mjs`, `ship-push.sh`, `land.mjs`, `verify-gate.mjs`, `flight-deck.mjs`, `pilotage-refresh.mjs` | **overwrite** |
| `.claude/settings.json` | `PostToolUse(Write\|Edit)` no-mock guard · `Stop` (ship-push, session-telemetry append, land docs-lane) · `SessionEnd` (full land) · `SessionStart(resume)` (flight-deck) | **merge** — idempotent per hook, preserves other settings (incl. any custom hook the app already has) |

Canonical text of the five merged sections: the sections of the same name in `payload/CLAUDE.md`
(byte-identical copies in `payload/snippets/*.md` and in the hub's own `CLAUDE.md`). Edit them in
the hub, never in an app.

## Before a sync — Sync Protocol rule 4

`npm run doctor` green and `npm run doctor:fleet` showing no **blocking** finding — or each blocking repo
skipped (`scripts/lib/fleet-skip.mjs`) / declaring `claudeAddon.ownedSections` — then
`npm run sync-method:all:dry`: it prints a **clobber report** — every file the sync would overwrite whose
content is not a known hub version — and the sync skips each of those files, and carries on, without
`--force`. It is fail-closed on sections too: a hub-owned SOUL section or a merged `CLAUDE.md` /
`AGENTS.md` section whose current text matches no historical hub version is app-authored and is kept,
reported `kept (app-authored section: <heading>, N lines)` and counted under `sections kept`. `--force` is the operator's call, never an agent's. A real sync also refuses unless the hub is
landed and clean (`--allow-unlanded` is for testing only). Worktree copies (`.claude/worktrees/**`) are
skipped. Owner: Lucia
(`.claude/agents/lucia.md`).

## The design-port loop (Claude Design → app code)

The addon makes every app able to run `/port` (an optional ritual) without restating instructions:
it ships the `/port` command, merges the **"Design port directive"** section into the app's
`CLAUDE.md`, and drops `PORT-MAP-TEMPLATE.md`. The full operating guide is
`docs/porting/PORTING-PLAYBOOK.md`; the method spec is `docs/METHOD/design-method.md` → "Design Port
Loop". Per app: seed `proto/`, generate `PORT-MAP.md` from the template, then run
`/port foundation` → `/port nav` → `/port <screen>` (one screen = one land).

## The no-mock guard

`no-mock-guard.ps1` runs after every `Write`/`Edit`. If it sees mock/fixture signals (`mockData`, `fixtures/`, `faker`, `sampleData`, …) in a source file (`.ts/.tsx/.js/.jsx/.mjs`, excluding tests/docs/qa) it returns exit 2, feeding the violation back to Claude. This enforces **REAL — Data Integrity** (`code-rules.md` §6 / `SOUL.md` non-negotiable #1). Fails open on any error, so it never blocks a legitimate edit.

## Session telemetry

`session-telemetry.mjs` runs on `Stop` (after every assistant turn). It parses the session's transcript — plus any delegated sub-agent/Workflow transcripts alongside it — deduped per API-response `message.id`, and appends one JSON row (tokens, message counts, duration, model(s), best-effort sprint) to the app's local ledger `docs/project/telemetry/sessions.jsonl` — gitignored. Hooks no longer commit the ledger (318.a); the file becomes untracked in a follow-up once every checkout runs the 318.a hooks. Consumers dedupe by `sessionId` and keep the newest row; the hub aggregates with `npm run telemetry:report`. No dollar cost computed — raw tokens only. Fails open, silent on success. See `routing-method.md` → "Session Telemetry Ledger".

## Usage

**Automatic** — `npm run sync-method:all` seeds every app after copying METHOD. Skip with `--no-claude`.

**Manual** — into one app:
```bash
node docs/METHOD/tools/swanifly-claude-addon/install.mjs <path-to-app> [--dry-run]
```

## User level (`--user`)

Separate from the per-app install: restores the operator's **user-level** Claude Code config on a new machine.

```bash
node docs/METHOD/tools/swanifly-claude-addon/install.mjs --user [--dry-run] [--only <file[,file]>] [--env-only]
```

- **Installs** exactly three files from `payload/user/` into `~/.claude/` (override the target with `CLAUDE_HOME`): `CLAUDE.md` (the operator's global instructions, verbatim), `settings.json` (permissions, `SessionStart` + `statusLine` hooks, notification flags, `autoMode.soft_deny`) and `scripts/flight-deck.ps1` (the PowerShell script those hooks call; verbatim, no secrets or machine paths). `__HOME__` in `settings.json` is replaced by `os.homedir()`.
- **Backup rule:** a target that exists and differs is copied to `<name>.bak-<YYYYMMDD-HHMMSS>` first (beside the file, e.g. `scripts/flight-deck.ps1.bak-...`), then overwritten; an identical one is skipped. `--dry-run` prints the actions and writes nothing.
- **`settings.json` is merged, not replaced (319.a).** Every key already in the operator's file wins; the payload only fills the keys that are missing, and `env` is merged key by key — a machine-specific value is never dropped. `env.CLAUDE_CODE_SUBAGENT_MODEL = "sonnet"` is guaranteed (added when absent, an explicit operator value still wins): it is the model of a sub-agent with neither a per-call `model` nor a `model:` frontmatter, which would otherwise inherit the coordinator (opus). The `_FORCE` variant is never written — it would override the explicit opus of `vera` and `kasper`. A changed file is backed up first as above; an existing file that is not valid JSON is left untouched (`SKIP`) and the run exits 1 with a counted warning. Policy: `docs/METHOD/routing-method.md` → "Delegation-time overrides", rule 5.
- **`--only <file[,file]>`** restricts the install to some of the three files, e.g. `--only settings.json` to merge the settings without touching `CLAUDE.md`.
- **`--env-only`** writes only `env.CLAUDE_CODE_SUBAGENT_MODEL` into `~/.claude/settings.json`, and only when it is absent — no other key, no other file. It is the fix doctor W7 prints.
- **NOT synced:** logins and OAuth sessions, API tokens, connectors (MCP), `.env` files, `memory/`, transcripts, and anything else under `~/.claude/`. `settings.json` is sanitized: machine-specific `env` (temp dirs), temp-path permissions and the transcript-mined `autoMode.environment` block are left out.
- **New machine:** install Claude Code and log in -> clone BanaShare -> `node docs/METHOD/tools/swanifly-claude-addon/install.mjs --user --dry-run`, then without `--dry-run` -> reconnect connectors by hand -> restart Claude Code. Re-run after editing `payload/user/` in the hub; the previous file is kept as `.bak-*`.

## Notes

- The generic skills (`deploy`, `implement-plan`, `ux-review`, `landing-page`, `ads-ops`) are also installed at user level (`~/.claude/skills/`) on the dev's machine, so they already work in every repo; the per-app copies make each app self-contained for collaborators.
- The no-mock guard's command is Windows PowerShell (`powershell.exe`). A POSIX variant would need a `.sh` guard + a second hook entry. The session-telemetry hook is Node (`node`), so it's already cross-platform.
- This addon is the **canonical source** for portable app seeding; edit it here (Lucia owns releases), then re-sync. Bana-Share's live copies (root + `.claude/`) mirror this payload where the doctor expects it (commands and hooks byte-equal; `SOUL.md` equal on its two hub-owned sections only).
