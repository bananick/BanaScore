# Design Method

**Owner:** Nova  
**Version:** 309.b  
**Purpose:** Global design constraints only (project-level UI lives in project/DESIGN.md)

---

## Overview

This file defines **method-level design guardrails** that apply to ALL apps using this METHOD.

**Project-specific design** (color palettes, component library, mockups) lives in `project/DESIGN.md`.

---

## Swanifly Design Philosophy (What “good” looks like)

This section translates our design inspirations (Swanifly identity, MD3 optionally, Google Store, Airbnb, Insightly, Stripe, Apple + Firedance principles) into **concrete rules** for Swanifly apps.

### Core values

- **Minimalism**: Remove non-essential UI. Every screen has a clear “main job”.
- **Efficiency**: Reduce steps and cognitive load. Optimize for repeat use (power users).
- **Empowerment**: Users feel in control (clarity, previews, undo, no surprises).
- **Clear structure**: Predictable layouts and navigation; consistent terminology and patterns.

### What this means in practice

#### 1) Information architecture (structure first)
- Keep navigation shallow (≤2 levels). Prefer search + filters over deep trees.
- Use progressive disclosure: show the 20% most used actions, hide the rest behind panels/menus.
- Make “where am I?” always obvious (active state, page title, breadcrumbs when needed).

#### 2) Layout & hierarchy (Apple / Google Store influence)
- One primary focus per screen (one primary CTA; secondary actions de-emphasized).
- Use whitespace intentionally; don’t fill space “because we can”.
- Use clear typographic hierarchy (title → section headings → body → helper text).
- Favor simple, modular layouts (cards, sections) with consistent spacing and alignment.

#### 3) Forms & conversion flows (Stripe influence)
- Default to the shortest happy path; move advanced options behind “Advanced”.
- Inline validation (actionable messages). Avoid vague “Invalid input”.
- Provide safe defaults and explain consequences (especially billing, permissions, destructive actions).
- Prefer explicit confirmations for irreversible actions; provide undo where possible.

#### 4) Discovery & browsing (Airbnb influence)
- Scannable card galleries, clear badges (New / Popular / Recommended).
- Filters are first-class: easy to open, easy to reset, results count visible.
- Preserve user state (filters, scroll, view mode) when navigating back and forth.

#### 5) B2B productivity & data density (Insightly influence)
- Tables/lists must be fast to scan: meaningful columns, consistent spacing, sticky headers when needed.
- Search and filters should be reachable in ≤1 interaction from the main workspace.
- Support “power use”: keyboard shortcuts, command palette, saved filters/views when relevant.

#### 6) “Empowerment” as UX contract
- No hidden context: always show current **tenant/team** where decisions apply.
- No state loss: keep drafts, preserve selections, and make back/forward predictable.
- Transparent system status: loading states, skeletons, empty states, and error recovery.

#### 7) Quality bar (invisible but felt)
- Fast: prefetch, skeletons, minimal layout shift (CLS). Avoid “jumpy” UIs.
- Accessible by default: keyboard, focus rings, touch targets, screen reader semantics.
- Internationalization: EN/FR baseline; layouts must tolerate text expansion.

### Design outputs expected from Nova (per feature)
- **Navigation impact**: does it add/remove a destination or a panel?
- **Screen states**: loading / empty / error / success.
- **Responsive**: desktop + mobile behavior (what collapses into drawer/sheet).
- **Copy**: primary CTA label + key microcopy (errors, empty states).

### Reference Models

| Source | What to learn | URL |
|--------|--------------|-----|
| **Material Design 3** *(optional — see below)* | Component specs, motion, color system, tokens | https://m3.material.io/ |
| **Google Play Store** | Card layouts, browsing UX, discovery patterns | https://play.google.com/store |
| **Apple HIG** | Typography, spacing, touch targets, layout clarity | https://developer.apple.com/design/human-interface-guidelines/ |

---

## Navigation Taxonomy — Destinations, Actions, Utilities

> [!IMPORTANT]
> Every UI element in the app shell **must** be classified into exactly one of three types before placement. This taxonomy resolves the recurring question: "Should X go in the header, the nav bar, the drawer, or a menu?"

### The Three Types

| Type | Definition | Where it lives | Examples |
|------|-----------|---------------|----------|
| **Destination** | A "place" the user visits often and wants to return to in one tap | Bottom nav (mobile), rail/sidebar (desktop) | Home, Events, Dashboard, Messages, Analytics |
| **Action** | A verb tied to the current screen context | Header toolbar, FAB, overflow menu (⋮) | Create, Edit, Share, Filter, Delete, Export |
| **Utility** | A transversal tool or secondary setting | Avatar/profile menu, drawer bottom zone, header right (1–2 icons max) | Search, Dark mode, Profile/Account, Help, Notifications (if infrequent) |

### Decision Framework

```text
Is it a "place" the user visits multiple times per session?
  → YES → Destination (bottom nav / rail)
  → NO →
    Is it a verb tied to what's on screen right now?
      → YES → Action (toolbar / FAB / overflow)
      → NO → Utility (drawer / avatar menu / header icon)
```

### Edge Cases (common debates resolved)

| Item | Classification | Rationale |
|------|---------------|-----------|
| **Messages** | Destination (if checked multiple times/session) OR Utility (if checked occasionally) | If messages are a core workflow → bottom nav tab. If secondary → badge on avatar or drawer |
| **Notifications** | Usually Utility | Rarely a "place" — best as a badge on an icon, with a sheet/panel for the feed |
| **Search** | Utility with prominent placement | Not a destination (you don't "visit" search), but deserves high visibility. Header icon (mobile) or drawer top (desktop) |
| **Settings** | Utility (in drawer/avatar menu) | Not visited often enough for bottom nav. Lives in user/avatar panel |
| **Create / Add** | Action (FAB or header CTA) | A verb, not a place. Can occupy center bottom nav slot as a prominent FAB on creation-heavy apps |
| **Profile / Account** | Utility (avatar icon → panel) | Lives in the "account zone" (bottom of rail, or drawer bottom) |

### Rule: Same Classification Across Window Sizes

A Destination on mobile must remain a Destination on desktop (and vice versa). Only the **chrome** changes (bottom nav → rail → sidebar), never the classification. This ensures the information architecture stays constant while the shell adapts to screen size.

---

## Swanifly Design Language (Evolved Direction)

> [!IMPORTANT]
> This section supersedes any MD3-specific prescriptions where the two conflict. The Swanifly design language is the **primary reference**; MD3 is a **useful optional substrate** — not a constraint.

Swanifly's evolved aesthetic is **gradient-forward, icon-inline, minimalist, and modern** — closer to Linear or Vercel than to a stock Material app.

### Visual Identity Pillars

#### 1) Gradient as Brand Expression
- Primary CTA buttons and key accents use **gradient fills** (purple-to-indigo or brand-specific direction defined in `project/DESIGN.md`).
- Gradient appears on: primary buttons, active rail items, logo mark, hero CTAs, badge pill backgrounds.
- Gradient must **not** be overused — max 2–3 elements per viewport at once. Whitespace is the counterweight.
- Use `background: linear-gradient(135deg, var(--pri), var(--pri2))` as the canonical pattern; update stops in `project/DESIGN.md`.

#### 2) Inline Icons as Functional Anchors
- Icons are **always inline with their label** in buttons, chips, nav items, and input prefixes — never floating or orphaned.
- Preferred size: **16px inline with text**, **20px in buttons/inputs**, **24px in rail**.
- Use **Lucide** as the primary icon set (clean, consistent stroke weight). Material Symbols acceptable when already present.
- Gradient-icon treatment: apply brand gradient to standalone icon marks (logo, AI indicators), not to every-day UI icons.

#### 3) Minimalist Surface Treatment
- Default to **light surfaces with subtle depth** (slight shadow or low-opacity border, no heavy card fills).
- Dark mode surfaces: deep neutral (not pure black), translucent overlays, blur where appropriate.
- Avoid decorative dividers; use **spacing and alignment** to separate sections.
- Rounded corners: lean generous (`12–16px` for cards, `full` for pills/badges).

#### 4) Typography Feel
- **Inter** as the primary typeface across all apps (replaces Roboto as the Swanifly default).
- Bold headings (`700–800 weight`); light supporting copy (`400`).
- Tight letter-spacing on large headings (`-0.02em` to `-0.04em`).

---

## Surface & Depth System

### Glassmorphism

The Swanifly design language uses glassmorphism for interactive, elevated surfaces:

- **Backdrop blur:** `blur(16px) saturate(1.2)` — standard for glass surfaces
- **Background:** Semi-transparent gradient overlays, NOT solid colors
- **Borders:** Very low opacity (6–8%) — structural, not decorative
- **Utility class:** `.backdrop-glass` for standalone blur (floating toolbars, bottom nav overlays)

**Rules:**
- Use glass for interactive containers (cards the user will click/tap)
- Use solid surfaces for informational/metric blocks
- Don't apply glass to everything — it's expensive on mobile. Max 3–4 glass surfaces visible at once

### Shadow / Glow System

Swanifly apps use brand-tinted glow shadows instead of generic neutral shadows:

| Level | Name | Usage |
|-------|------|-------|
| 0 | none | Flat surface, no elevation |
| 1 | `shadow-glow-sm` | Subtle hover accents on solid cards |
| 2 | `shadow-glow-md` | Focused elements, brand emphasis |
| 3 | `shadow-glow-lg` | Hero elements, featured cards |
| 4 | `shadow-card` / `shadow-card-hover` | Standard card rest/hover states (dark, not brand-tinted) |
| 5 | `shadow-elevated` | Drawers, side panels, elevated surfaces |
| 6 | `shadow-float` | Modals, popovers, highest elevation |

**Status glows** for data visualization and status indicators:
- `.glow-success` — green tint for positive states
- `.glow-warning` — amber tint for caution states
- `.glow-error` — red tint for error states

### Background Textures

- **`.bg-grid`** — 24×24px dot grid pattern at low opacity. Use for: empty state backgrounds, landing sections, hero areas
- **`.bg-noise`** — SVG fractal noise overlay at 3% opacity (via `::before`). Use for: premium card backgrounds, hero sections, login screens. Requires `position: relative`

---

## Material Design 3 (MD3) — Optional Reference

> [!NOTE]
> MD3 is no longer the mandatory foundation. It is a **useful reference** for component thinking, state layers, and elevation logic — but apps are **not required** to follow MD3 component APIs, naming, or the full token system.
> Use MD3 concepts when they align with the Swanifly design language; skip or adapt freely when they don't.

### Useful MD3 Concepts (adopt selectively)

**Component variant thinking** (still valid as mental model):
- **Filled** — Primary actions
- **Outlined** — Secondary actions
- **Text/Ghost** — Tertiary actions

**State Layers** (adopt if not using hover gradient):
- Hover: 8% overlay; Focus: 12%; Pressed: 12%; Dragged: 16%

**Motion** (good defaults, not mandatory):
- Duration: 200–300ms for most UI transitions
- Easing: `cubic-bezier(0.2, 0.0, 0, 1.0)` for enters; `ease-out` acceptable

**Elevation** (use as a conceptual model only; box-shadow rules live in the M3 design tokens):
- 0 → surface, 1 → card, 2 → app bar, 4 → drawer, 5 → modal

**Reference:** https://m3.material.io/

---

## Accessibility Baselines (WCAG AA)

### Color Contrast

- **Text (normal):** 4.5:1 minimum
- **Text (large ≥18pt):** 3:1 minimum
- **UI components:** 3:1 minimum
- **Graphical objects:** 3:1 minimum

**Tool:** Chrome DevTools Color Picker (shows contrast ratio)

### Keyboard Navigation

- **All interactive elements** must be keyboard accessible
- **Tab order** must be logical (top-to-bottom, left-to-right)
- **Focus indicators** must be visible (2px outline, 3:1 contrast)
- **Skip links** for main content

### Screen Reader Support

- **Semantic HTML:** Use `<button>`, `<nav>`, `<main>`, `<article>`, etc.
- **ARIA labels:** For icons, images, complex widgets
- **Alt text:** For all images (empty `alt=""` for decorative)
- **Live regions:** For dynamic content (`aria-live="polite"`)

### Touch Target Size

- **Minimum:** 44x44px (iOS HIG, Android Material)
- **Recommended:** 48x48px
- **Spacing:** 8px minimum between targets

### Form Accessibility

- **Labels:** Visible and associated (`<label for="id">`)
- **Error messages:** Clear, specific, associated with field
- **Required fields:** Indicated visually AND semantically (`required` attribute)
- **Autocomplete:** Use `autocomplete` attribute for common fields

---

## Adaptive Layout System (Window Size Classes)

> [!IMPORTANT]
> This replaces the older "Responsive Design" section. The Swanifly approach is **adaptive** — one information architecture, three chrome expressions. Based on Android window size classes (adopted industry-wide).

### Window Size Classes

| Window Class | Width | Nav Chrome | Typical Devices |
|-------------|-------|------------|-----------------|
| **Compact** | < 600px | Bottom nav + top bar + drawer | Phones |
| **Medium** | 600–839px | Navigation rail (icon-only, 64px) + top bar | Tablets portrait, foldables |
| **Expanded** | ≥ 840px | Expanded rail/sidebar (240px) OR rail + panel (64px + 280px) | Tablets landscape, desktop |

### Transformation Rules

The **information architecture never changes** — only the chrome changes:

- **Compact → Medium:** Bottom nav morphs to left rail. Same destinations, same order, same icons. Top bar may drop hamburger (rail replaces it)
- **Medium → Expanded:** Rail can expand to show labels (State A), or open secondary panels (State B). Content area may split into list-detail
- **Expanded → Compact (reverse):** Rail collapses to bottom nav. Panels become sheets. List-detail becomes push-navigation

### Breakpoints (Tailwind Mapping)

While window size classes are the conceptual model, Tailwind breakpoints remain the implementation tool:

| Window Class | Primary Breakpoint | Tailwind |
|-------------|-------------------|----------|
| Compact | < 640px | default (mobile-first) |
| Medium | 640px – 1023px | `sm:` and `md:` |
| Expanded | ≥ 1024px | `lg:`, `xl:`, `2xl:` |

### Fluid Typography

Use `clamp()` for responsive font sizes that scale smoothly:
```css
font-size: clamp(1rem, 0.9rem + 0.5vw, 1.25rem);
```

### Design-First, Not Breakpoint-First

Don't design for "mobile" then "desktop." Design the **information architecture** once (destinations, content patterns, data model), then let the chrome adapt:

1. Define 3–5 destinations (Navigation Taxonomy)
2. Choose a content-level layout pattern per destination
3. Apply the window size class transformations automatically

---

## State Preservation & SPA Navigation Contract

> [!IMPORTANT]
> A premium SPA must feel native. These rules are **non-negotiable** for any Swanifly app. They separate amateur SPAs from world-class ones.

### Per-Destination State

Each bottom nav tab / rail destination preserves its own:
- **Scroll position** — returning to a tab restores where the user left off
- **Filter state** — active filters, sort order, view mode (grid/list)
- **Drill-down depth** — if the user navigated from a list to a detail to a sub-detail, switching away and back should restore the full stack
- **Selected items** — multi-select, active item in list-detail

**Implementation:** Use multiple navigation stacks (React Router nested routes, Next.js parallel routes, or a client-side state manager per destination).

### Back / Forward Contract

- Browser back/forward and Android system back **must** work predictably
- Every navigation push creates a history entry. Use `router.push()` not `router.replace()` for drill-downs
- **Closing a modal or sheet** should NOT create a history entry (use UI state, not URL)
- **Predictive back** (Android): Support the Android predictive back gesture — show the previous screen peeking behind during the back gesture

### Deep Linking

Every meaningful screen must have a URL that reproduces the same view:
- **Routes** → pathname (e.g., `/events/123`)
- **Panels** → `?panel=settings` (preferred for secondary panels)
- **Filters** → `?status=active&sort=date` (for filterable views)
- **Tabs** → `?tab=upcoming` (for in-destination tab selection)

A shared URL must land the recipient on the exact same screen state.

### Draft Preservation

- Unsaved form data must survive accidental back navigation
- Use `beforeunload` on web to warn about unsaved changes
- Auto-save drafts to `localStorage` (fast) or Firestore (persistent) every 5–10 seconds
- Show "Draft saved" indicator (subtle, non-intrusive)

### Loading States

- **Never show a blank screen.** Skeleton should match the expected layout shape
- Use `loading.tsx` at route level (Next.js App Router)
- Sequence: instant skeleton → data fetch → content render → interactive
- Avoid layout shift (CLS) — skeleton dimensions must match final content dimensions

### Optimistic Updates

- For user-initiated actions (toggle, create, delete), update the UI **immediately** and reconcile with the server
- Show **undo snackbar** for destructive actions (delete, archive). Delay server-side deletion by the snackbar duration (4–6s)
- If server rejects the optimistic update, revert UI and show error toast

---

## Dark Mode

### System Preference Detection

```typescript
const prefersDark = window.matchMedia('(prefers-color-scheme: dark)').matches;
```

### Manual Toggle

Store user preference in localStorage or Firestore:
```typescript
localStorage.setItem('theme', 'dark'); // or 'light'
```

### MD3 Dark Theme Tokens

- **Surface:** #1C1B1F
- **On-surface:** #E6E1E5
- **Primary:** #D0BCFF
- **On-primary:** #381E72
- **Secondary:** #CCC2DC
- **Error:** #F2B8B5

**Apply:** Use Tailwind's `dark:` variant or CSS variables

---

## Theming

### Color Tokens

All apps must define these semantic tokens:

- **Primary:** Brand color (buttons, links, accents)
- **Secondary:** Supporting color
- **Tertiary:** Additional accent
- **Error:** Red-ish (errors, warnings)
- **Surface:** Background for cards, sheets
- **Background:** Page background
- **On-primary:** Text/icons on primary color
- **On-surface:** Text/icons on surface

**Define in:** Tailwind config or CSS variables

### Typography Scale

- **Display:** 57px / 64px (hero headings)
- **Headline:** 32px / 40px (section headings)
- **Title:** 22px / 28px (card titles)
- **Body:** 16px / 24px (main content)
- **Label:** 14px / 20px (form labels, captions)

**Font:** Inter (default). Roboto acceptable as fallback. Custom per `project/DESIGN.md`

### Spacing Scale

Use 4px base unit (Tailwind default):
- **0:** 0px
- **1:** 4px
- **2:** 8px
- **3:** 12px
- **4:** 16px
- **6:** 24px
- **8:** 32px
- **12:** 48px
- **16:** 64px

### Border Radius Scale

- **sm:** 2px
- **DEFAULT:** 4px
- **md:** 6px
- **lg:** 8px
- **xl:** 12px
- **2xl:** 16px
- **full:** 9999px (circles)

### Elevation Scale (Box Shadow)

- **sm:** 0 1px 2px rgba(0,0,0,0.05)
- **DEFAULT:** 0 1px 3px rgba(0,0,0,0.1)
- **md:** 0 4px 6px rgba(0,0,0,0.1)
- **lg:** 0 10px 15px rgba(0,0,0,0.1)
- **xl:** 0 20px 25px rgba(0,0,0,0.1)

---

## i18n Considerations

### Text Expansion

French text is ~20% longer than English on average.

**Design for expansion:**
- Don't hard-code button widths
- Use flexible layouts (flex, grid)
- Test UI with longest expected strings

### RTL Support (Future)

For Arabic, Hebrew:
- Use logical properties (`margin-inline-start` instead of `margin-left`)
- Flip layouts automatically (CSS `dir="rtl"`)
- Mirror icons where appropriate

**Not required initially; add when supporting RTL languages**

### Date/Time Formatting

Use `Intl.DateTimeFormat`:
```typescript
new Intl.DateTimeFormat('fr-CA', {
  year: 'numeric',
  month: 'long',
  day: 'numeric',
}).format(new Date()); // "15 novembre 2025"
```

### Number Formatting

Use `Intl.NumberFormat`:
```typescript
new Intl.NumberFormat('fr-CA', {
  style: 'currency',
  currency: 'CAD',
}).format(1234.56); // "1 234,56 $"
```

---

## Animation Guidelines

### Performance

- Use `transform` and `opacity` only (GPU-accelerated)
- Avoid animating `width`, `height`, `top`, `left` (causes reflow)
- Use `will-change` sparingly (only during animation)

### Accessibility

- Respect `prefers-reduced-motion`:
```css
@media (prefers-reduced-motion: reduce) {
  * {
    animation-duration: 0.01ms !important;
    transition-duration: 0.01ms !important;
  }
}
```

### Easing Curves (Standard Library)

All apps should define these three curves in their CSS/Tailwind theme:

| Name | Value | Usage |
|------|-------|-------|
| `ease-spring` | `cubic-bezier(0.34, 1.56, 0.64, 1)` | Bouncy entrances: modals, FABs, scale-in effects |
| `ease-smooth` | `cubic-bezier(0.4, 0, 0.2, 1)` | **Default.** Hover states, color changes, layout shifts |
| `ease-out-expo` | `cubic-bezier(0.16, 1, 0.3, 1)` | Fast-start deceleration: slide-ins, fade-in-up, content appearing |

### Animation Vocabulary (Standard Library)

Apps should define these named keyframe animations in `globals.css`. Agents must use these classes rather than creating one-off `@keyframes`.

| Class | Effect | Duration | Easing | Use for |
|-------|--------|----------|--------|--------|
| `.animate-fade-in-up` | Opacity 0→1 + translateY 12px→0 | 400ms | `ease-out-expo` | Page content, card entrances, list items |
| `.animate-fade-in` | Opacity 0→1 | 300ms | `ease-smooth` | Subtle reveals, overlay backgrounds |
| `.animate-scale-in` | Opacity 0→1 + scale 0.96→1 | 250ms | `ease-spring` | Modals, dialogs, popovers, dropdowns |
| `.animate-slide-in-right` | translateX 100%→0 | 350ms | `ease-out-expo` | Side panels, drawers, sheets |
| `.animate-pulse-glow` | Box-shadow pulsing (brand, 2s loop) | 2s | ease-in-out | Active AI indicator, live status, attention |
| `.animate-bounce-subtle` | translateY 0→-4px→0 (1.5s loop) | 1.5s | ease-in-out | Scroll hint, empty state arrow |
| `.animate-gradient` | Background-position shift (3s loop) | 3s | ease | Animated gradient backgrounds, loading |

### Stagger System

For lists, grids, and groups of items entering the screen:

```css
.stagger > * { animation: fade-in-up 400ms var(--ease-out-expo) both; }
.stagger > *:nth-child(1) { animation-delay: 0ms; }
.stagger > *:nth-child(2) { animation-delay: 50ms; }
/* ...up to 8th child at 350ms */
```

- 50ms increment per child, up to 8 children
- Use for: card grids, list items, dashboard widgets on page load
- Don't use for items that load asynchronously at different times

### Micro-Interaction Patterns

- **Hover lift:** `transform: translateY(-1px)` + shadow increase
- **Active press:** `transform: translateY(0)` + shadow decrease
- **Focus ring:** `outline: 2px solid var(--pri); outline-offset: 2px` (global via `:focus-visible`)
- **Selection highlight:** `::selection { background: rgba(pri, 0.3); color: white; }`

---

## Icon System

### Icon Library

Use **Lucide** as the primary icon set (clean, consistent stroke weight, tree-shakeable):
- Default stroke width: 1.5px (matches Inter's visual weight)
- Consistent 24px grid, rounded line caps
- Import individual icons for tree-shaking: `import { Home } from 'lucide-react'`

**Legacy fallback:** Material Symbols (acceptable when already present in a codebase)
**Do not mix** icon sets within the same component or screen

### Icon Sizes & Stroke Weights

| Context | `size` prop | `strokeWidth` | Example |
|---------|------------|---------------|---------|
| Inline with text | `14`–`16` | `1.5` | Labels, breadcrumbs, metadata |
| Buttons, inputs | `16`–`18` | `1.75` | `.btn-primary`, `.btn-ghost`, search icon |
| Nav items (rail, bottom nav) | `20` | `1.75` inactive, `2.25`–`2.5` active | Destination icons |
| Default / standalone | `24` | `1.5` | Section headers, list item icons |
| Large / hero | `32`–`48` | `1.5` | Empty states, feature highlights, onboarding |

**Active nav pattern:** Increase `strokeWidth` on the active destination icon to visually reinforce selection (the thicker weight adds perceived "boldness" matching the active color).

### Accessibility

```tsx
// Standalone icon (no adjacent text) — needs label
<SearchIcon size={20} aria-label="Search" />

// Decorative icon (next to text label) — hide from screen readers
<HomeIcon size={20} aria-hidden="true" />
<span>Home</span>
```

- **Standalone icons** MUST have `aria-label`
- **Decorative icons** (next to visible text) MUST have `aria-hidden="true"`
- Never rely on icon alone for meaning — always pair with a label (visible or `aria-label`)

---

## Logo & Brand Identity

### Logo Type

All Swanifly apps use a **gradient inline icon/favicon** as the primary logo mark:

- **Format:** Inline SVG icon with on-brand gradient fill
- **Favicon:** Same icon at 16×16, 32×32, 180×180 (Apple touch icon)
- **Placement in nav:** Top of the rail (desktop) — clicking it toggles collapse/expand
- **Public surface:** Top-left of header (landing / logged-out)
- **Gradient spec:** Define gradient stops and direction in `project/DESIGN.md` (app-specific)
- **Mono variant:** Single-color (white or `currentColor`) for dark backgrounds and small sizes

### Logo Usage Rules

- Never stretch or distort; maintain aspect ratio
- Minimum clear space: 8px on all sides
- Minimum size: 24px (inline), 32px (standalone) — below that use favicon only
- Both light and dark variants required (gradient on light; white/mono on dark)

---

## Navigation Patterns

### Two-Surface Navigation Model

**Purpose:** Different surfaces have fundamentally different jobs. Swanifly apps operate across two distinct surface types, each with its own layout contract.

| Surface | Who | Shell |
|---------|-----|-------|
| **Sales Front** | Visitors, prospects, logged-out users | Top Header |
| **SaaS Tool / Back** | Logged-in operators, admins | Rail + Drawer + (optional) AI Right Bar |

### Surface A — Sales Front (Top Header)

For landing pages, discovery, pricing, and any pre-auth flow:

```text
┌─────────────────────────────────────────────────────────────────────┐
│  [◉ Logo]    Nav link   Nav link   Nav link       [CTA Button]  ☽ 🔒 👤 │
└─────────────────────────────────────────────────────────────────────┘
```

**Header anatomy:**
- **Left:** Logo mark (gradient inline icon) + brand name
- **Center:** 2–4 nav links (Activités, Lieux, Blog…). Sparse. No mega-menus.
- **Right:** Primary CTA (gradient button, icon-inline), then utility icons (dark mode, cart, account)
- **Style:** Light background, no bottom border. Subtle shadow on scroll only. Transparent-to-solid on scroll is acceptable.

**Rules:**
- No rail. No sidebar. The header is the only chrome.
- One primary gradient CTA. Secondary links are text weight.
- Collapses to hamburger + drawer on mobile.

### Surface B — SaaS Tool / Back (Rail + Drawer + AI Right Bar)

#### Shell overview

```text
┌────┬────────────────┬───────────────────────────────────┬───────────────┐
│Rail│ Secondary       │                                   │  AI Right Bar │
│    │ Drawer (panel)  │        Main Content               │  (contextual) │
│    │                 │                                   │               │
│[🏠]│                 │                                   │ ✦ Suggestions │
│[📅]│                 │                                   │ ✦ Insights    │
│[📊]│                 │                                   │ ✦ Actions     │
│    │                 │                                   │               │
│[✨]│                 │                                   │               │
│[🔔]│                 │                                   │               │
│[💬]│                 │                                   │               │
│[👤]│                 │                                   │               │
└────┴────────────────┴───────────────────────────────────┴───────────────┘
 64px    ~280px                remaining space                  ~320px
```

#### AI Right Bar (new)

The right bar is an **optional, content-aware AI panel** that sits alongside the main content area on desktop.

- **Width:** ~300–360px (collapsible; default state depends on available viewport).
- **Trigger:** Can be toggled by the user OR automatically surfaced when AI has contextual content to show (e.g., page loads with relevant insights).
- **Content is dynamic:** Responds to the active route and current data context. Examples:
  - On a CRM lead → AI surfaces deal score, next action suggestion, email drafts
  - On analytics → AI surfaces anomaly callouts, trend summaries
  - On content editing → AI surfaces rewrite suggestions, SEO tips
- **Layout:** Vertical feed of AI cards (icon + micro-headline + body + optional action).
- **Style:** Light surface (`var(--s2)`), subtle left border accent (`var(--pri)`), no heavy shadow — feels attached, not modal.
- **Responsive:** Hidden by default on tablet (<1280px); user can slide it in as a drawer/sheet.
- **A11y:** Full keyboard dismissal, live region updates for new AI content.

**Implementation note:** The AI right bar is part of the app shell layout grid. Main content reflows (does not get overlaid). It should be architecturally decoupled — the bar registers to a content context and AI modules push cards into it.

### Double Drawer / Rail+Panel (SaaS Back — unchanged))

**This is the default logged-in navigation system:**
- Desktop: **Left Navigation Rail + Secondary Panel** (double drawer)
- Mobile: **Bottom Nav (max 4) + Drawer**, optionally with a minimal top bar

**App-level documentation:** Every app must document its concrete navigation map in `project/DESIGN.md` using `templates/NAVIGATION-TEMPLATE.md` (routes, labels, persona/workspace mapping, panel contents).

#### Structure (Canonical)
- **Primary Drawer (Level 1)** — Navigation Rail (icons; optionally expandable)
- **Secondary Panel (Level 2)** — Contextual drawer/panel (submenus, search, feeds, settings)

#### Canonical Rail Layout (Mono-Rail)
The rail is vertically structured and predictable:

1. **Top (branding)**
   - App logo (click toggles collapse/expand on desktop)

2. **Primary actions + main sections**
   - **Search** icon (opens global search panel)
   - 3–6 core destinations (max; keep it sparse)

3. **Bottom “account zone” (from bottom upwards)**
   - **User / Settings** (always last item at bottom)
   - **Messages** (optional; if app has messaging)
   - **Notifications** (optional)
   - **AI Agent** (optional; if app embeds assistant)

If a feature doesn’t exist in the app, **omit the icon** (don’t leave dead affordances).

#### Primary Drawer Behavior (Desktop)
- **Expanded:** Icon + title visible (~240px width)
- **Collapsed:** Icons only (~64px width)
- **Hover (collapsed):** Show a floating label chip (tooltip-like), not a full drawer expansion
- **Click (icon):**
  - If the item is a **destination** (`route` type) → navigate; drawer stays expanded (State A)
  - If the item is a **panel trigger** (`panel` type) → drawer collapses to rail + secondary panel opens (State B)
- **Active state:** Always highlight current destination (and current panel trigger if a panel is open)

#### Mutual Exclusivity Rule (State A ↔ State B)
Expanded drawer and secondary panel are **mutually exclusive**:

| State | Left Column | Right of Left Column | Trigger |
|-------|------------|---------------------|--------|
| **A — Expanded Drawer** | Icons + labels (~240px) | Main content (no panel) | Clicking a `route` item, or closing a panel |
| **B — Collapsed Rail + Panel** | Icons only (~64px) + hover popover labels | Secondary panel (~280px) + main content | Clicking a `panel` item |

- Opening a panel **always** collapses the drawer to icon-only rail
- Closing all panels **restores** the expanded drawer (default; app may override to stay collapsed)
- The user can also manually toggle expand/collapse via the logo button

#### Secondary Panel Behavior
- **Width:** ~280px (desktop)
- **Trigger:** Clicking a rail item that has contextual content
- **Typical panels:**
  - Search → global search / command palette / recent
  - Section → submenu (2–8 items max; avoid deep trees)
  - Messages → conversations list
  - Notifications → feed
  - User → settings/account panel
- **Close:** Click outside, press Escape, or click the same rail icon again

#### Multitenancy Contract (Settings Panel)
All apps are multitenant by default (teams / workspaces / tenants).

In the **User / Settings** panel:
- Always display **current tenant/team** (name + context)
- If user is **admin/super_admin**, show:
  - Tenant switcher (or workspace switcher) when relevant
  - Tenant/team settings entry points (team profile, members, roles, billing if applicable)
  - Clear separation between **personal settings** and **team settings**

#### Mobile Shell Architecture (Compact Window)

On mobile (compact window class, < 600px), the shell transforms completely. Prioritize content area, thumb-reach ergonomics, and clear wayfinding.

##### Shell Layout (Compact)

```text
┌──────────────────────────────────┐
│  [≡/Logo]   Destination    [⚙][🔍] │  ← Top bar (56px)
├──────────────────────────────────┤
│                                  │
│         Main Content             │
│         (scrollable, full-width) │
│                                  │
├──────────────────────────────────┤
│  🏠    📅    ✚    💬    ≡      │  ← Bottom nav (56–64px)
│ Home  Events Create Chat  Menu   │
└──────────────────────────────────┘
```

##### Top Bar Anatomy (3 zones, 56px height)

| Zone | Content | Rules |
|------|---------|-------|
| **Left** | Logo mark OR hamburger (≡) OR Back (←) | Root screens: logo mark or hamburger. Detail/deep screens: Back arrow. Never both simultaneously. Hamburger can be logo-inspired (brand mark that opens drawer) |
| **Center** | Current destination name | Wayfinding > branding on mobile. Use the destination label, not the app logo. Render as `<h1>` for semantics |
| **Right** | 1–2 high-frequency utilities | Limit to the single most-used utility (e.g., search 🔍) + optional overflow (⋮). **Never more than 2 icons.** This zone is NOT for navigation |

**Top bar behavior:**
- Scrolls away on down-scroll, reappears on up-scroll (Material "scroll to hide" pattern)
- On root destinations: show destination name in center
- On detail/deep screens: show Back arrow (left) + contextual title (center)
- On search-dominant apps: right icon can expand to full-width search bar overlay

##### Bottom Navigation Rules

- **3–5 destinations** (4 recommended + 1 overflow "Menu" slot)
- **Icon + label always** — never icon-only for primary destinations. NN/g research confirms labels improve recognition by ~60%
- **Active state:** filled icon variant + gradient indicator bar (or dot) + label weight 600
- **Inactive:** outlined icon variant + label weight 400
- **Center slot (optional):** can be a prominent create/add FAB — elevated, gradient-filled, circular. Use when the primary user action is creation (e.g., "New Event")
- **State preservation:** each tab maintains its own navigation stack. Switching tabs and returning must restore scroll position, filter state, and drill-down depth (Apple/Android standard)
- **Hide on scroll:** optional behavior (content gains space), but always visible on root screens
- **Style:** `background: var(--bg)`, subtle top border or shadow. 48×48px minimum touch targets

##### Left Drawer (Mobile)

Triggered by: hamburger icon (top-left), avatar tap, or "Menu" bottom nav item.

**Behavior:** slide-in from left, scrim overlay (50% black). Swipe-to-dismiss.

**Content model (top to bottom):**
1. **App logo + app name** (or current tenant/team name if multitenant)
2. **Search bar** — full-width, always visible in drawer. Command+K / Ctrl+K shortcut
3. **All navigation destinations** — with icons + labels, matching bottom nav items + any extras not in bottom nav
4. **Separator** (spacing, not decorative line)
5. **Dark/light toggle** — pill toggle, single tap to switch
6. **User avatar + name** — tap opens settings sub-navigation in-drawer (account, team settings, billing, help)
7. **Logout** — always last item, with destructive styling

##### Panels on Mobile

Secondary panels (desktop) transform into sheets on mobile:
- **Search:** Full-screen takeover (not a narrow panel)
- **Sub-menus / Messages / Notifications:** Full-height bottom sheets (swipe-to-dismiss)
- **Settings:** Push-navigation to dedicated settings screens
- Ensure 48×48px touch targets on all interactive elements

##### Gesture Navigation

- Swipe right to go back — respect standard OS behavior (Android predictive back, iOS edge swipe)
- Swipe between tabs — optional; only if content is genuinely tab-like (e.g., swiping between feed categories)
- Pull-to-refresh — supported on feed and list views

#### Public/Sales Variant (Header-First)
Refer to **Surface A — Sales Front** section above for the full spec.

Short rule: guest/logged-out → top header only; logged-in/in-app → rail + panels (+optional AI right bar).

This creates a clear "funnel → app mode" transition.

#### Mobile Behavior (Responsive)
On mobile, prioritize content and thumb-reach:

- **Default:** Bottom navigation with **max 4 items** (MD3 guideline)
  - 3 primary destinations + 1 “Menu” (drawer trigger), OR
  - 4 primary destinations + overflow inside “Menu” if needed
- **Drawer:** Slide-in menu for secondary items and workspace/tenant switching
- **Secondary panels:** Prefer full-height sheets (side sheet or bottom sheet) instead of a narrow 280px panel
- **Consistency:** Same symbols + same labels across desktop and mobile (don’t rename destinations)

#### Information Architecture Constraints (from UX research)
- Keep rail entries **4–6 maximum** for recognition and speed
- Avoid deep nesting (2 levels max). If content is large, rely on:
  - search
  - filters
  - in-page navigation

#### Implementation Requirements (Non-negotiable)
- **Layout model (desktop):** Content-push. Rail/drawer/panel occupy CSS grid or flex columns; main content fills remaining space. **No overlay on desktop** — the nav is never on top of the page content; the page content reflows
- **Motion:** 200ms `ease-out` for rail/panel transitions
- **Transition choreography (A↔B):** Animate concurrently — drawer width shrinks (240→64px) while panel slides in (0→280px) over 200ms. Use CSS grid `transition` or layout animation library (e.g., `framer-motion`). Main content reflows smoothly
- **Elevation:** Primary drawer Level 4; secondary panel above it (layered)
- **A11y:** Full keyboard navigation, visible focus rings, Escape to close, tooltips accessible
- **Touch targets:** 48×48px minimum on mobile
- **i18n:** Never hard-code labels; EN/FR baseline strings must exist

#### URL / State Contract (Recommended)
To preserve Back/Forward behavior and deep linking, prefer:
- Primary destination → pathname
- Secondary panel selection → query param (e.g., `?panel=...`) OR a persisted UI state

Query-driven panels (?panel=...) are preferred for correctness and deep linking; click-state is acceptable for rapid prototypes if Back behavior is preserved.

#### Visual Specifications (Conceptual)

**State A — Expanded Drawer (no panel open):**
```text
┌──────────────────┬──────────────────────────────────────────────┐
│  [Logo]          │                                              │
│                  │                                              │
│  [🏠] Home       │              Main Content                    │
│  [📅] Events     │              (pushed by drawer)              │
│  [📊] Dashboard  │                                              │
│                  │                                              │
│                  │                                              │
│  [✨] AI Agent   │                                              │
│  [🔔] Notifs     │                                              │
│  [💬] Messages   │                                              │
│  [👤] User       │                                              │
└──────────────────┴──────────────────────────────────────────────┘
   ~240px                        remaining space
```

**State B — Collapsed Rail + Secondary Panel:**
```text
┌────┬────────────────┬───────────────────────────────────────────┐
│[◀] │ Panel title     │                                           │
│    │                 │                                           │
│[🏠]│  ┌───────────┐  │            Main Content                   │
│[📅]│  │ Sub-item 1 │  │            (pushed by rail + panel)       │
│[📊]│  │ Sub-item 2 │  │                                           │
│    │  │ Sub-item 3 │  │                                           │
│    │  └───────────┘  │                                           │
│[✨]│                 │                                           │
│[🔔]│                 │                                           │
│[💬]│                 │                                           │
│[👤]│                 │                                           │
└────┴────────────────┴───────────────────────────────────────────┘
 64px    ~280px                    remaining space
```

**Collapsed Rail with Hover Popover (no panel open):**
```text
┌────┐
│[🏠]│ ╭─────────╮
│[⚙]│◄│ Settings │  ← Floating chip on hover (right of icon)
│[🔔]│ ╰─────────╯
│[🔍]│
└────┘
```

#### Suggested Components (document in `project/DESIGN.md`)
- `AppRail.tsx` / `PrimaryNav.tsx` — Rail container (logo, items, account zone)
- `RailItem.tsx` / `NavItem.tsx` — Icon + label + hover chip + badges
- `SecondaryPanel.tsx` — Contextual content renderer
- `SettingsPanel.tsx` — Account + tenant settings surface
- `MobileBottomNav.tsx` + `MobileDrawer.tsx` — Mobile shell

#### Reference Implementations
- Instagram Web sidebar
- Instantly.ai mail client
- Linear app navigation

---

## Content-Level Layout Patterns

Each destination's interior layout should be chosen from these canonical patterns during design (Nova) and documented in `project/DESIGN.md`. The layout pattern can change per window class (e.g., list-detail is push-nav on compact, side-by-side on expanded).

### Canonical Patterns

| Pattern | When to use | Key characteristics |
|---------|-------------|-------------------|
| **Feed** | Social, news, activity logs, timelines | Infinite scroll, card-based, pull-to-refresh, chronological or algorithmic sort |
| **List-Detail** | Messages, CRM, email, file browsers | Master list (scrollable) + detail pane. Selection persists. Compact: push navigation. Expanded: side-by-side |
| **Dashboard** | Analytics, overview screens, KPIs | Card grid, data visualization, at-a-glance metrics. Scannable. Filterable by time range |
| **Create/Edit Flow** | Forms, wizards, content creation | Focused single-task. Minimal chrome. Clear save/cancel. Step indicator for multi-step. Inline validation |
| **Gallery/Browse** | Products, venues, media, discovery | Card grid with filters. Image-forward. Badges (New/Popular). Preserve scroll + filters on back |
| **Viewer** | Documents, images, videos, maps | Full-bleed content area. Minimal chrome (auto-hide). Zoom/pan controls. Share action |
| **Settings** | Preferences, configuration, account | Grouped sections with toggles, selects, inputs. Search within settings for large apps. Immediate apply or explicit save |

### Content Area Adaptations by Window Class

| Pattern | Compact (< 600px) | Medium (600–839px) | Expanded (≥ 840px) |
|---------|-------------------|-------------------|-------------------|
| **Feed** | Single column | Single column (wider) | Single column (max-width 680px, centered) OR 2-column masonry |
| **List-Detail** | Full-screen list → full-screen detail (push nav) | Side-by-side (list 280px + detail) | Side-by-side (list 320px + detail + optional supporting pane) |
| **Dashboard** | Stacked cards (1 col) | 2-column grid | 3–4 column grid |
| **Create/Edit** | Full-screen form | Centered form (max 600px) | Centered form (max 600px) + live preview pane |
| **Settings** | Stacked sections | Stacked sections (max 600px) | List-detail (categories left, options right) |

### Local Navigation Within Destinations

- **Tabs / Segmented Controls:** Use to switch views or datasets within a single destination (e.g., "Upcoming" / "Past" / "Draft" events). Max 2–5 tabs. Labels short. Swipeable on mobile
- **Filters:** First-class UX element. Easy to open, easy to reset, results count always visible. Bottom sheet on mobile; inline chips or sidebar on desktop
- **Do not confuse** local navigation (tabs within a destination) with global navigation (bottom nav / rail). They solve different problems

---

## Supporting Surfaces — Sheets, FABs, Snackbars

Supporting surfaces display secondary content without leaving the current screen. Choosing the right surface by form factor is critical for ergonomics.

### Surface Selection Matrix

| Surface | Mobile (Compact) | Desktop (Expanded) | Use for |
|---------|-----------------|-------------------|---------|
| **Bottom sheet** | ✅ Primary choice | ❌ Use side sheet | Filters, quick actions, confirmations, mini-forms, overflow menus |
| **Side sheet** | ❌ Use bottom sheet | ✅ Right-anchored (280–360px) | Inspectors, detail panels, filters, contextual tools |
| **Modal dialog** | ✅ Centered, max 90vw | ✅ Centered, max 560px | Confirmations, critical decisions, focused forms. Use sparingly |
| **Snackbar/Toast** | ✅ Bottom, above bottom nav | ✅ Bottom-left or bottom-center | Feedback messages, undo actions. Auto-dismiss 4–6s |
| **FAB** | ✅ Bottom-right, above bottom nav | ✅ Bottom-right (or use header CTA instead) | Single primary creation action per screen. Gradient-filled, 56px |

### FAB Rules

- Maximum **ONE FAB per screen** — it represents the most important creation action (Create Event, New Message, Add Item)
- **Never use FAB for navigation** — that's what bottom nav / rail is for
- **Extended FAB** (icon + label) is preferred on expanded screens for discoverability
- FAB should scroll-hide on down-scroll, reappear on up-scroll
- Style: `background: var(--grad)`, circular (compact) or pill (extended), elevation level 3
- Touch target: 56px minimum (compact), 48px height + padding (extended)

### Bottom Sheet Best Practices

- **Standard (non-modal):** Content remains interactive behind it. User dismisses by swiping down or tapping outside
- **Modal:** Scrim behind (50% black), blocks content. Use for destructive confirmations only
- **Peek height:** Show 2–3 items or a clear drag handle. User pulls up for more
- **Max height:** 90% of screen (always leave top bar visible for orientation)
- **Avoid nested scrolling conflicts** — bottom sheet scroll should take priority once at peek

### Side Sheet Best Practices (Desktop)

- **Right-anchored** to avoid colliding with left rail/drawer navigation
- **Content-push layout** — main content reflows, never overlaid
- Width: 280–360px (same range as secondary panel)
- Dismiss: close button (×), Escape key, or clicking outside
- Use for: property inspectors, contextual details, advanced filters, quick-edit forms

### Snackbar Rules

- Position: bottom-center (mobile, above bottom nav) or bottom-left (desktop)
- Max 1 snackbar visible at a time (queue if multiple)
- Auto-dismiss: 4–6 seconds. Include a dismiss button (×) always
- **Undo pattern:** For destructive actions (delete, archive), show "Undo" action button in snackbar. Delay server-side deletion by the snackbar duration
- Never use snackbar for errors that require user action — use inline error or modal instead

---

## Component Patterns (Implementation)

### CSS Class Library

All apps should define these standard component classes in `globals.css`. Using shared class names ensures consistency across the codebase and reduces ad-hoc styling.

### Buttons

#### `.btn-primary` — Primary CTA

- Height: `2.25rem` (36px). Padding: `0 1rem`. Font: `0.8125rem`, weight 500
- Background: `linear-gradient(135deg, var(--pri), var(--pri2))`
- Border-radius: project-level radius token (recommended: 12px)
- Hover: `translateY(-1px)` + brand glow shadow
- Active: `translateY(0)` + shadow contracts
- Layout: `inline-flex, align-items: center, gap: 0.5rem` (icon + label)
- **Rule:** Max ONE `.btn-primary` per screen. All other actions use `.btn-ghost`

#### `.btn-ghost` — Secondary/Tertiary

- Same dimensions as primary. Background: transparent. No border by default
- Color: muted text token. Hover: subtle fill `rgba(text, 0.08)`, text brightens
- Use for: toolbar actions, cancel buttons, filter toggles, secondary nav

### Cards

#### `.card-glass` — Interactive Surfaces

- Background: gradient overlay with `backdrop-filter: blur(16px) saturate(1.2)`
- Border: `1px solid rgba(text, 0.08)` — nearly invisible, structural
- Radius: large token (16px recommended)
- Hover: border brightens, shadow increases, `translateY(-1px)`
- Use for: feature cards, settings panels, modal bodies, clickable surfaces

#### `.card-solid` — Metric/Stat Blocks

- Background: first surface elevation token (flat, no gradient)
- Border: `1px solid rgba(text, 0.06)` — barely visible
- Radius: same as glass
- Hover: border shifts to brand tint, adds brand glow
- Use for: KPI cards, stat widgets, data readouts — informational, less interactive

#### Decision Tree

```text
Is this an interactive container the user will click/tap?
  → YES → .card-glass
  → NO →
    Is it a metric, stat, or data readout?
      → YES → .card-solid
      → NO → Use plain surface (bg token + border as needed)
```

### Inputs

#### `.input-glass` — Standard Input

- Height: `2.5rem` (40px). Padding: `0 1rem`. Font: `0.875rem`
- Background: translucent surface + `blur(8px)`
- Border: `1px solid rgba(text, 0.1)`
- Focus: brand border, 3px outer ring at brand/10% opacity, brand glow
- Placeholder: muted text token

### Badges

#### `.badge` — Status Chip

- Padding: `0.125rem 0.5rem`. Font: `0.6875rem` (11px), weight 600, uppercase
- Border-radius: `99px` (full pill)
- **Pattern:** Background = status color at 15% opacity; text = full status color
- Example: `class="badge bg-success/15 text-success"`

### Navigation Links

#### `.nav-link` — Tab/Section Link

- Padding: `0.375rem 0.625rem`. Font: `0.8125rem`, weight 500
- Inactive: muted text. Hover: bright text + subtle background
- Active: brand color + brand background at 8% + underline indicator bar

### Progress Bar

```html
<div class="progress-track"><div class="progress-fill" style="width: 65%"></div></div>
```

- Track: 4px height, muted background, full-radius
- Fill: brand gradient, smooth 500ms transition

### Skeleton Loader

```html
<div class="skeleton h-4 w-3/4 mb-3"></div>
```

- Shimmer animation (1.5s, infinite)
- 3-step gradient background (surface → lighter → surface)
- Border-radius: small token

### Forms

- **Labels:** Always visible (no placeholder-only)
- **Validation:** Inline, on blur
- **Error messages:** Below field, error color text, icon
- **Success states:** Success color check, brief animation

### Modals

- **Backdrop:** 50% black overlay
- **Card:** Centered, max-width 600px, highest elevation shadow
- **Close:** X button top-right, ESC key
- **Focus trap:** Tab cycles within modal
- **Enter animation:** `.animate-scale-in`

### Loading States

- **Spinners:** For async actions (<5s)
- **Skeletons:** For content loading (5s+). Use `.skeleton` class
- **Progress bars:** For deterministic progress (file uploads). Use `.progress-track/.progress-fill`

---

## Error States

### Empty States

- **Icon:** Large, friendly
- **Heading:** "No items yet"
- **Description:** 1-2 sentences
- **Action:** Button to create first item

### Error Messages

- **Inline:** Below form field (validation)
- **Toast:** Brief notification (3-5s)
- **Alert:** Persistent banner (top of screen)
- **Modal:** Critical errors (block action)

### Retry Patterns

- **Button:** "Try again" for transient errors
- **Auto-retry:** With exponential backoff (network errors)
- **Fallback:** Graceful degradation (show cached data)

---

## Implementation Anti-Patterns

| ❌ Don't | ✅ Do Instead |
|----------|---------------|
| Hardcode hex colors in components | Use CSS variables or Tailwind theme tokens |
| Use neutral shadow utilities (`shadow-md`) | Use the brand-tinted shadow/glow system |
| Create one-off `@keyframes` per component | Use the 7 standard animation classes |
| Apply motion without `prefers-reduced-motion` | Already handled globally — but check JS animations too |
| Mix icon libraries in the same screen | Use Lucide exclusively; migrate legacy on touch |
| Use `rounded-lg` for cards (generic) | Use the project-level radius token |
| Put more than 2 icons in mobile top-bar right | Move extras to drawer or overflow menu |
| Use decorative dividers between sections | Use spacing and alignment to separate |

---

## Design Tokens Checklist

Every app must define in `project/DESIGN.md`:

- [ ] Color palette (primary, secondary, tertiary, error, surface, background)
- [ ] Typography scale (font family, sizes, weights)
- [ ] Spacing scale (margins, paddings, gaps)
- [ ] Border radius scale
- [ ] Elevation scale (shadows)
- [ ] Icon system (library, sizes)
- [ ] Breakpoints (if customizing Tailwind defaults)
- [ ] Dark mode tokens (**required** — system preference + manual toggle)

---

## Prototyping — Claude Artifacts

**Owner:** Nova · **Surface:** Claude Design (Artifacts in Claude Desktop)

> **Migrated in v308.a.** The home-made proto-kit live tuner is retired. Prototypes are now
> generated as **interactive Artifacts** in Claude Desktop, from the spec chapter + the M3
> token set below. Iterate live with the operator; when approved, the Artifact's markup +
> tokens become the reference Brian/Teddy implement against.
>
> **Evolved in v309.b.** Claude Design is the **bootstrap only**: on approval the Artifact source
> is exported into the app's **`proto/` workspace** (app root), where the prototype keeps living
> and evolving — see "Design Port Loop" below.

### How Nova prototypes

1. Load the relevant spec chapter (`project/definition/`) + the **token contract** below.
2. Generate a single-file React/HTML Artifact: click-through navigation, realistic data
   (not lorem ipsum), M3 applied, dark mode, `prefers-reduced-motion` respected.
3. Tune live in the conversation (colors, spacing, motion) — no separate tuner panel needed;
   the Artifact regenerates on request.
4. On approval, **export the Artifact source into the app's `proto/` folder** (its seed commit —
   the proto then evolves in the repo) and record the resolved token values in `project/DESIGN.md`.

### Token Contract (Artifacts must use these — never hardcode colors)

```css
/* Surfaces */     var(--bg), var(--s1), var(--s2), var(--s3), var(--s4)
/* Brand */        var(--pri), var(--pri2), var(--grad)
/* Text */         var(--text), var(--text2), var(--text3)
/* Border */       var(--border)
/* Radius */       var(--r), var(--r-btn), var(--r-card), var(--r-input), var(--r-tag)
/* Semantic */     var(--error), var(--success), var(--warning), var(--info)
/* Motion */       var(--ease)
```

### Class Contract (consistent component class names)

| Category | Classes |
|---|---|
| Rail | `.rail`, `.ri`, `.ri.active`, `.ri .tip`, `.ri .dot` |
| Drawer | `.drawer`, `.drawer.open`, `.di`, `.di.active` |
| Search | `.search-drawer`, `.search-input`, `.sf`, `.sf.active` |
| Cards | `.dc`, `.ac`, `.sc`, `.card`, `.task` |
| Buttons | `.btn`, `.action-btn`, `.tf`, `.cvf` |
| Tags | `.tag`, `.tk-tag`, `.ch`, `.badge`, `.status-badge` |

### Token categories to expose when tuning

Colors (brand, dark/light surfaces, text hierarchy, semantic, glassmorphism) · Typography
(family, scale, weights, spacing, line height) · Components (buttons, cards, inputs, tags,
pills, tables) · Rail · Layout (spacing, drawer, search, elevation, scrollbars) · Motion
(easing, speed, reduced motion).

---

## Design Port Loop (Claude Design → code)

**Owner:** Nova (directive) + Brian/Teddy (port) · **Ritual:** `/port` · **Added in v309.a · Evolved in v309.b (living `proto/` directive).**

> Promoted from `docs/porting/PORTING-PLAYBOOK.md` (pilot-validated 2026-06-15). This is how a
> prototype crosses into a live React/Firebase app — across many apps — **without restating
> instructions each session**. Since **v309.b**, Claude Design only **bootstraps** the prototype;
> the prototype then lives in the repo (`proto/` at the app root) where design and features are
> worked out in HTML **before** they are developed. The port loop encodes *"obey the current
> proto"* once, as committed files.

### Principle — the directive is a living committed prototype, not a chat

The standing order lives in **committed files per app**, all pointing at the living proto. You
never retype the instruction; you run `/port`.

| File | Role | Re-touched |
|---|---|---|
| `proto/` (app root) | The living HTML prototype = the **directive** (seeded from a Claude Design export — *source* HTML + tokens, never a screenshot) | continuously — design + features evolve here first |
| `docs/project/design/PORT-MAP.md` | proto screen → component → Firestore map + checklist | once, then per-screen state updates |
| `.claude/commands/port.md` | the standing order as the `/port` ritual | once (installed or synced by the Claude addon) |

Plus a **Design port directive** block in the app's `CLAUDE.md` so every session inherits the rule.

> **Migration note (v309.a → v309.b).** The drop-zone `docs/project/design/artifacts/{app}/` is
> retired for new work — the Claude Design export now lands directly in `proto/` as its seed
> commit. `/port` falls back to the old folder only where `proto/` doesn't exist yet.

### Proto workspace — `proto/` at the app root (v309.b)

The proto is where design **and features** are worked out before development — clickable, cheap to
change, committed. Its rules:

1. **Seeded once from Claude Design** (bootstrap only), then evolved **in place** with Claude Code.
   The git history of `proto/` *is* the design history — no re-export loop.
2. **Plain HTML/CSS/JS** — no build step, no framework, no dependencies. The **token contract and
   class contract are mandatory** (they are what keeps `/port foundation` mechanical).
3. **Fake data is allowed here and ONLY here.** `proto/` is a design workspace, not a shipped path.
   The seam is absolute: nothing under `app/`, `src/` or `components/` may import, link or copy
   from `proto/`; keep it out of build/lint/deploy scope. Ports **re-implement** against live
   Firestore/HubSpot — never lift data plumbing from the proto.
4. **Per-screen lifecycle, tracked in PORT-MAP:** ⬜ designing → 🔄 porting → ✅ ported →
   ⚠️ diverged. A screen is portable when its proto is settled. After it ships, design changes
   still go **proto-first**, then a re-port PR — the proto leads, the app follows.
5. **The proto never pre-decides the data model.** However complete it looks, schema / permissions /
   feature scope stay behind the conflict gate below.

### PORT-MAP first (element → component → Firestore)

Before porting any pixels, run `/port` once to **generate `PORT-MAP.md`** from the proto
(start from `PORT-MAP-TEMPLATE.md`): map **each element → a component file → a Firestore path**.
This is the only place app specifics are encoded — review it before building.

### Foundation / token bridge first

Port in dependency order: **foundation (tokens) → nav / shell → one page per PR.** The first
`/port foundation` run establishes the token bridge so every later screen inherits it.

> [!IMPORTANT]
> **MUI rule (token bridge).** When the app uses MUI, **mirror the token *values* as hex in the MUI
> theme** — **never** put `var(--…)` into the MUI palette (it breaks at theme-creation time). Use CSS
> variables only in component `sx` and in `globals.css`. This keeps one source of truth (the design
> tokens) while satisfying MUI's palette contract. (See `app-settings.json` `web.styling` / `design`.)
>
> **Icon swap is its own step.** MUI-icons → Lucide is cross-cutting and dependency-adding — never
> bundle it with a screen port.

### One screen per PR

Each `/port <page>` run opens **one PR**. Claude-in-Chrome (or Cowork) reviews it side-by-side with
the prototype — Chrome/Cowork are your **eyes (supervisor), not the decider**. The back-and-forth
runs through PR review comments, not retyped prompts. Merge, then port the next screen.

### Conflict gate — reconcile, don't overwrite

The design is **directive** for UX / IA / features. It is **reconciled, never authoritative**, over
**schema, permissions, and feature scope** — a prototype ran on fake data and knows nothing about the
tenant model or business rules. Any such change **stops for the operator**, listed in the PR under
**"Needs decision"**. The builder never changes the data model on its own.

### Updating the directive

Changed the design? **Evolve `proto/` in place and commit**, then re-port the affected screen(s) —
one PR each. The `/port` command and the `CLAUDE.md` block already say *"follow the current proto"* —
nothing to retype, no re-export loop.

### CLAUDE.md block (paste into each app)

```
## Design port directive
- The current UI directive for this app is the living HTML prototype in `proto/` at the app
  root (seeded from Claude Design, evolved in place). Follow it for UX, layout, IA and features.
- `proto/` never ships: fake data lives there and only there; nothing in the app may import,
  link or copy from it — ports re-implement against live data.
- `docs/project/design/PORT-MAP.md` is the proto-screen→component→data map and checklist.
- Reconcile, never overwrite: if the proto implies a schema / permission / feature change,
  STOP and list it in the PR under "Needs decision" — do not change the data model yourself.
- Design changes go proto-first, then a re-port PR. Tokens first, then nav / shell, then one
  page per PR. Run with `/port`.
```

> **Runner note.** Today the loop runs on a Claude Code (web) or **Cowork** session driving `/port`,
> supervised via GitHub PRs. When **Swanifly** is ready it can drive Brian per task instead (it has
> `askHuman` for conflict pauses + a permission matrix) — the directive files don't change, only the
> runner does.

---

## Design Log

Maintain in `project/DESIGN.md`:
- Date | Decision | Rationale
- Link to mockups, Figma files (if applicable)

**Example:**
```
2025-11-15 | Chose Roboto font | Better readability than Inter on small screens
2025-11-16 | Primary color #3B82F6 | Brand alignment with company logo
```

---


**Owner:** Nova  
**Last Updated:** 2026-06-16

