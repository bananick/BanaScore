## Design port directive

> How a Claude Design redesign crosses into a live app. Standing order — never restate it; run `/port`.
> Full operating guide: `docs/porting/PORTING-PLAYBOOK.md`. Method spec: `docs/METHOD/design-method.md` → "Design Port Loop".

- **Directive = a committed export, not a chat.** The current UI directive for this app is its exported
  Claude Design artifact in `docs/project/design/artifacts/{app}/` (the *source* HTML/JSX + tokens,
  never a screenshot). Follow it for UX, layout, IA and features. Changed the design? Re-export over
  that folder and commit — nothing to retype.
- **`docs/project/design/PORT-MAP.md`** is the element → component → Firestore map + checklist
  (start from `PORT-MAP-TEMPLATE.md`, generated once per app).
- **One token vocabulary.** The directive and PORT-MAP speak the METHOD **token contract**
  (`--pri`, `--pri2`, `--grad`, `--bg`, `--s1..s4`, `--text`/`--text2`/`--text3`, `--border`,
  `--r`/`--r-btn`/`--r-card`/`--r-input`/`--r-tag`, `--error`/`--success`/`--warning`/`--info`, `--ease`).
  Each app's `/port foundation` maps the contract to its idiom **once** (MUI → mirror values as hex in
  the theme; Tailwind v4 → alias the contract over `@theme`; Tailwind v3 → config). Never feed
  `var(--…)` into a MUI palette — it throws.
- **Conflict gate — reconcile, never overwrite.** If the design implies a schema / permission /
  feature change, STOP and list it in the PR under "Needs decision" — never change the data model yourself.
- **Order:** tokens (foundation) → nav / shell → one page per PR. Each `/port <screen>` = one PR.
