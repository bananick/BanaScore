---
name: ux-review
description: >-
  Audit a screen or flow against the Swanifly UX bar, per persona, on mobile and
  desktop. Use when the user says "review the ui/ux", "is this fluid/ergonomic",
  "check this screen", or wants a design/usability pass before shipping. Checks the
  team's specific layout, performance, M3, dark-mode, and accessibility rules.
---

# ux-review

Reviews UI against the standing bar in `SOUL.md`: **fluid, ergonomic, clean, fast, complete — for every persona**.

## Before reviewing

- Read `docs/project/DESIGN-GUIDELINES.md` if present (dark-first palette, agent colors, typography, breakpoints).
- Identify which persona(s) the screen serves: **admin · commercial/sales · partner · event organizer**. Review for each relevant one.
- If the app is running, look at it on **mobile and desktop** widths; otherwise review the component/markup.

## Checklist

**Layout & ergonomics**
- [ ] Project/section **header stays visible** (sticky), never scrolls away
- [ ] Side menus / lists are **full screen height**, never overflow off-screen
- [ ] Popovers/menus **centered** on their drawer/context, stay in viewport
- [ ] Lists offer the right views (cards / list / Kanban-pipeline) with **search + filters** where it helps
- [ ] Flow is fluid — minimal steps, clear next action, no dead ends per persona

**Performance**
- [ ] `next/image` (never raw `<img>`), images **light + lazy-loaded**
- [ ] `next/dynamic` for heavy components; route-level `loading.tsx` / `error.tsx`
- [ ] Page stays quick to load (no large blocking assets)

**Design language (AGENTS.md)**
- [ ] CSS variables for color (never hardcoded); gradient-forward primary CTAs
- [ ] Dark mode correct; 12–16px card radius, pills full-round; Inter, bold headings
- [ ] Icon + label together (Lucide)

**Accessibility (WCAG AA)**
- [ ] Contrast 4.5:1 text / 3:1 UI · touch targets ≥48px · visible focus rings
- [ ] `aria-label` on standalone icons · respects `prefers-reduced-motion`

**i18n**
- [ ] All user-facing text externalized, **EN + FR** present

## Output

Group findings by **persona** then severity (blocker / should-fix / polish). For each: what's wrong, where (`file:line`), and the concrete fix. End with a one-line verdict: ship / fix-first.
