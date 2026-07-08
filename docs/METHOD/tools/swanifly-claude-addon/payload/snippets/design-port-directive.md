## Design port directive

> How a design crosses into this live app. Standing order — never restate it; run `/port`.
> Full operating guide: `docs/porting/PORTING-PLAYBOOK.md`. Method spec: `docs/METHOD/design-method.md` → "Design Port Loop".

- **Directive = the living proto, committed.** The current UI directive for this app is the HTML
  prototype in **`proto/` at the app root** — seeded from a Claude Design export (source HTML +
  tokens, never a screenshot), then evolved **in place** to work out design and features before
  they are developed. Follow it for UX, layout, IA and features. Design change? Evolve `proto/`
  first, commit, then re-port the screen. *(Apps not yet migrated: fall back to
  `docs/project/design/artifacts/{app}/`.)*
- **`proto/` never ships.** It is a design workspace, not an app path: fake data is allowed there
  and ONLY there; nothing under `app/`, `src/` or `components/` may import, link or copy from it;
  keep it out of build/lint/deploy scope. Ports **re-implement** against live Firestore/HubSpot.
- **`docs/project/design/PORT-MAP.md`** is the proto-screen → component → Firestore map + checklist
  (start from `PORT-MAP-TEMPLATE.md`; per-screen state: ⬜ designing · 🔄 porting · ✅ ported · ⚠️ diverged).
- **One token vocabulary.** The proto and PORT-MAP speak the METHOD **token contract**
  (`--pri`, `--pri2`, `--grad`, `--bg`, `--s1..s4`, `--text`/`--text2`/`--text3`, `--border`,
  `--r`/`--r-btn`/`--r-card`/`--r-input`/`--r-tag`, `--error`/`--success`/`--warning`/`--info`, `--ease`).
  Each app's `/port foundation` maps the contract to its idiom **once** (MUI → mirror values as hex in
  the theme; Tailwind v4 → alias the contract over `@theme`; Tailwind v3 → config). Never feed
  `var(--…)` into a MUI palette — it throws.
- **Conflict gate — reconcile, never overwrite.** If the proto implies a schema / permission /
  feature change, STOP and list it in the PR under "Needs decision" — never change the data model yourself.
- **Order:** tokens (foundation) → nav / shell → one page per PR. Each `/port <screen>` = one PR.
