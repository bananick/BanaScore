---
description: Port the next screen from the app's living proto/ directive into this app (one screen, one PR)
argument-hint: [screen name | "next" | "foundation"]
---

# /port — run the standing design-port order

You are porting this app's UI to its **design directive**. Do **not** wait for the operator to
restate any of the rules below — they are standing orders. Read the three sources, then act.

## Sources of truth (priority order)
1. **The living HTML prototype** in `proto/` at the app root — the design directive (UX, information
   architecture, layout, components, feature intent). Seeded from Claude Design, evolved in place;
   it leads, the app follows. *Fallback (apps not yet migrated): the exported artifact in
   `docs/project/design/artifacts/`.*
2. **`docs/project/design/PORT-MAP.md`** — the element → component → data map and the checklist of
   what is already done.
3. **The existing code, specs and Firestore schema** — current reality.

**Precedence:** the design directive wins for UX / IA / feature intent. The **data model is
reconciled, never silently overwritten** (see the Conflict gate).

## Task
Port the screen named **"$ARGUMENTS"**.
- empty or `next` → take the first unfinished row in PORT-MAP (nav / app shell first).
- `foundation` → do the foundation step only, then stop.

## Token contract (the one vocabulary)
The directive and PORT-MAP always speak the METHOD **token contract** — never an app-specific name:

`--pri` `--pri2` `--grad` · `--bg` `--s1` `--s2` `--s3` `--s4` · `--text` `--text2` `--text3` ·
`--border` · `--r` `--r-btn` `--r-card` `--r-input` `--r-tag` · `--error` `--success` `--warning` `--info` · `--ease`

The **foundation step** maps that contract into the target app's idiom **once**, then every screen
inherits it. Pick the adapter by the app's stack:

| Stack | Adapter (foundation step) |
|---|---|
| **MUI** (e.g. `Apps/web`) | Mirror the contract **values as hex** in `lib/theme.ts` (`createTheme`). Use `var(--…)` only in component `sx` and `globals.css`. **Never** put `var(--…)` in the MUI palette — `alpha()`/`darken()` throw at theme-creation. |
| **Tailwind v4** (`@theme`, e.g. `Swanifly/web`) | Keep the app's `@theme` tokens; add a `:root` block aliasing the contract over them — `--pri: var(--color-primary)`, `--grad: linear-gradient(135deg, var(--pri), var(--pri2))`, `--bg: var(--color-surface-900)`, etc. Both the contract and the app's `bg-primary` utilities then resolve. |
| **Tailwind v3** (`tailwind.config`, e.g. `BanAventures`) | Add the contract vars to `:root` in `globals.css` with concrete values from the artifact; map Tailwind theme keys to `var(--…)` in the config. |

## Standing rules (every run — no reminder needed)
1. **Foundation before screens.** Run `npm install` first. If the token contract is not yet bridged in
   `globals.css` / theme (per the adapter table above), do that first with **Inter**, taking values from
   the proto. Swapping to **Lucide** adds a dependency, so do it as its own build-verified
   step. Once per app.
2. **One screen = one PR.** Branch, implement, open the PR. Small and reviewable.
3. **Real data only.** Wire to the Firestore path named for this screen in PORT-MAP. No mock data —
   and never import, link or copy data plumbing from `proto/`; re-implement against live data.
4. **Conflict gate — reconcile, don't overwrite.** If the design implies a change to the schema, a
   tenant/permission rule, or adding/dropping a feature: **do not change the data model.** List it in
   the PR body under `## Needs decision` and continue with everything that isn't blocked.
5. **Update PORT-MAP.** Mark the row (⬜ designing · 🔄 porting · ✅ ported · ⚠️ diverged), record
   the component file(s) touched.
6. **Fidelity note.** In the PR body, compare the result against the proto and the acceptance
   criteria from PORT-MAP.

Stop after this one screen. Do not chain to the next.
