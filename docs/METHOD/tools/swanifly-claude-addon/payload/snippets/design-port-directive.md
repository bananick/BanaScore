## Design port directive

> Guide: `docs/porting/PORTING-PLAYBOOK.md`. Spec: `design-method.md` → "§ Design Port Loop", run
> with `/port` (optional).

**`proto/` at the app root is the living UI directive, and it never ships.** Fake data is allowed there
and ONLY there; nothing under `app/`, `src/` or `components/` may import, link to or copy from it, and
it stays out of build, lint and deploy scope. A port **re-implements** against live Firestore/HubSpot,
one screen per land, tracked in `PORT-MAP.md`. If the proto implies a schema,
permission or feature change, **stop**: conflict gate, `### Needs decision` + PR, never a data-model
change you make yourself.
