# Prompting Activity Log

This folder tracks AI-assisted development sessions for this app.

## Files

- **`log.jsonl`** — One JSON entry per session (append-only)
- **This README** — Synced from METHOD

## How to Log

After each significant AI session, append a line to `log.jsonl`:

```jsonc
{"id":"2026-03-12-appname-debug","date":"2026-03-12","durationMin":30,"app":"appname","model":"gemini-2.5-pro","objective":"Fix auth error","promptType":"debug","outcome":"success","diffScore":0.8}
```

**Minimum fields:** `id`, `date`, `durationMin`, `app`, `model`, `objective`, `promptType`, `outcome`

**Full schema:** See `docs/METHOD/prompting-method.md`

## Sync

This log is pushed to BanaShare via `push-to-banashare.mjs` for cross-app analysis.
