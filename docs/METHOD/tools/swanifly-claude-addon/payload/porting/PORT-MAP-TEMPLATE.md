# Port Map — {APP}

> The bridge between the living proto directive and this codebase.
> Generated once per app (setup step 3 of the porting playbook), then kept as the living checklist.

- **Design directive:** `proto/` at the app root — seeded from Claude Design on {DATE}, evolved in place
- **Stack / adapter:** {MUI | Tailwind v4 @theme | Tailwind v3} — see the foundation row
- **Status legend:** ⬜ designing (proto not settled) · 🔄 porting (in PR) · ✅ ported (merged) · ⚠️ diverged / conflict (needs your decision)

## Foundation (once per app — bridge the token contract, then stop)
| Status | Item |
|---|---|
| ⬜ | Token contract bridged in `globals.css` / theme via the app's adapter (`--pri`, `--pri2`, `--grad`, `--bg`, `--s1..s4`, `--text*`, `--border`, `--r*`, semantic, `--ease`) |
| ⬜ | Theme reads the contract (MUI `createTheme` ← **hex values**; or Tailwind `@theme`/config ← `var(--…)`) |
| ⬜ | Font = Inter · Icons = Lucide (icon swap is its own build-verified step) |

## Screens (nav / shell first, then page by page)
| Status | Design element / screen | Current component (or NEW) | Change needed | Data binding (Firestore) | Tokens / components | Notes / conflicts |
|---|---|---|---|---|---|---|
| ⬜ | Nav / app shell | `components/AppShell.tsx`, `PrimaryNavigation.tsx` | rail + drawer + mobile bottom-nav per design | — (chrome) | `--pri`, `--grad`, rail classes | e.g. Settings → utility, not a destination |
| ⬜ | _(page)_ | _(file or NEW)_ | _(what changes)_ | `teams/{teamId}/…` | _(tokens/components)_ | |
| ⬜ | | | | | | |

## Conflicts needing your decision
> Anything the design implies that touches schema / permissions / feature scope. The builder lists
> these here **and** in the PR; you decide — the builder does not.

- [ ] …
