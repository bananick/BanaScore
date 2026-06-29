---
name: landing-page
description: >-
  Build or optimize a conversion landing page in the Swanifly pattern. Use when the
  user says "create a landing page", "optimize this LP", "team-building landing page",
  "lead magnet page", or wants a marketing page that converts and feeds the CRM. Wires
  visitor tracking to the CRM and is deployable via the deploy skill.
---

# landing-page

Creates/optimizes high-converting landing pages for the Bana/Swanifly app family (team-building, events, campaigns).

## Pattern (the structure that works here)

1. **Hero** — sharp value prop + visual; one primary CTA above the fold.
2. **CTA with loss-aversion subline** — under the button, a short line stating concretely *what they lose by not clicking* (the user's explicit preference).
3. **Proof** — the "pièges" / pain framing, social proof, logos, results.
4. **Offer / lead magnet** — clear, with a low-friction form.
5. **Close** — repeat CTA.

## Build rules

- Next.js + Tailwind + CSS-variable tokens; **dark mode**; M3 baseline (see `AGENTS.md`).
- **Images:** `next/image`, light + lazy-loaded, art-directed/compressed. Reworking source images to be as light as possible is in-scope.
- **i18n EN/FR** for all copy.
- **Performance first** — LP must load fast (it's a paid-traffic destination); minimize blocking assets; route-level `loading.tsx`.
- Accessible (WCAG AA), mobile + desktop.

## Visitor → CRM tracking (required)

- Capture visitor/lead events and route them to the CRM (HubSpot/Firestore), so landing-page analytics and lead info show up in the pipeline.
- Tag by campaign/segment (e.g. buralistes, banamag, CSE, team-building) so `/hubspot-sync` and the sales dashboards can filter by campaign.
- **No mock data** — real tracking only (`SOUL.md`).

## Optimize mode

When improving an existing LP: audit copy (CTA clarity, loss-aversion), hierarchy, load speed (image weight, lazy-load), form friction, and tracking coverage. Report concrete before/after changes, then apply.

## Ship

Run `/ux-review` then `/ship-check`, and `/deploy` to the page's Firebase site.
