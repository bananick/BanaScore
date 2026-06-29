# [App Name] — Navigation Spec (Rail + Panels)
# Status: Draft | Approved
# Owner: Nova
# Last Updated: YYYY-MM-DD
#
# Purpose:
# Fill this into `project/DESIGN.md` (or link from it) to define a concrete navigation map
# using METHOD’s canonical pattern: Left Navigation Rail + Secondary Panels + Mobile Bottom Nav.
#
# Reference:
# - METHOD: `docs/METHOD/design-method.md` → Navigation Patterns

---

## 0) Navigation Taxonomy (classify every item)

Before defining items, classify each as one of:

| Type | Definition | Placement |
|------|-----------|----------|
| **Destination** | A "place" visited frequently | Bottom nav / rail |
| **Action** | A verb tied to the current screen | Header toolbar / FAB / overflow |
| **Utility** | A transversal tool or setting | Avatar menu / drawer / header right (1-2 max) |

If visited often as a "place" → Destination. If it's a verb → Action. If secondary tool → Utility.

See `design-method.md` → Navigation Taxonomy for the full decision framework.

---

## 1) Context

### Product mode vs Sales mode
- **Sales / discovery surfaces** (guest): <header-first? which CTAs?>
- **App mode** (logged-in): <rail + panels?>

### Personas / Workspaces
List the workspaces/personas that alter navigation.

| Workspace | Who | Entry route | Notes |
|----------|-----|-------------|-------|
| guest | logged out | `/` | header only |
| organizer | ... | `/...` | rail |
| provider | ... | `/...` | rail |
| internal | ... | `/...` | rail |

---

## 2) Desktop Navigation (Dual-State: Drawer ↔ Rail + Panel)

### Layout model
- **Content-push:** Rail/drawer/panel occupy CSS grid columns; main content fills remaining space. **No overlay on desktop** — nav is never on top of page content
- **State A — Expanded Drawer:** Icons + labels (~240px), no secondary panel. Triggered by `route` items or closing a panel
- **State B — Rail + Panel:** Icons only (~64px) + secondary panel (~280px). Triggered by `panel` items
- States A and B are **mutually exclusive** (see §5 Interaction Contract)

### Rail skeleton (must match METHOD)
Top:
- Logo (collapse toggle / manual expand-collapse)

Primary:
- Search (panel)
- 3–6 core destinations (max)

Bottom “account zone” (from bottom upwards):
- User / Settings (panel)
- Messages (panel, optional)
- Notifications (panel, optional)
- AI Agent (panel, optional)

### Rail items (top section)
> **Type matters:** `route` items keep State A (expanded drawer). `panel` items trigger State B (collapsed rail + panel opens).

| Item | Icon | Type | Route / Panel | Badge | Permissions |
|------|------|------|---------------|-------|-------------|
| Search | 🔍 | panel | `panel=search` | - | all |
| <Item> | <icon> | route/panel | <route or panelId> | <count?> | <perm> |

### Account zone items (bottom section)
| Item | Icon | Type | Route / Panel | Badge | Permissions |
|------|------|------|---------------|-------|-------------|
| AI Agent | ✨ | panel | `panel=ai` | - | optional |
| Notifications | 🔔 | panel | `panel=notifications` | unread count | optional |
| Messages | 💬 | panel | `panel=messages` | unread count | optional |
| User | 👤 | panel | `panel=settings` | - | all |

### Secondary panels
Define content per panel. Keep depth ≤2 levels.

| Panel ID | Trigger | Contents | Primary CTA | Notes |
|----------|---------|----------|-------------|------|
| search | rail: Search | global search / command palette | - | keyboard shortcut: Cmd/Ctrl+K |
| settings | rail: User | account + tenant | logout | must show current tenant |
| <panel> | <trigger> | <subnav/actions> | <cta> | <notes> |

---

## 3) Multitenancy in Settings (Required)

### Always show
- Current tenant/team name
- Current workspace/persona (if applicable)

### Admin-only
- Tenant switcher (if user can access multiple tenants)
- Team settings entry points (members/roles/billing as applicable)

### Navigation placement
Specify where team settings live:
- As entries inside Settings panel (recommended)
- Or as dedicated routes linked from Settings panel

---

## 4) Mobile Navigation

### Strategy (choose one)
- **Bottom nav (max 4–5) + Drawer** (default; 4 = MD3 strict, 5 = acceptable if icons are distinct)
- **Hamburger-only + header** (only if destinations >5 and bottom nav doesn't fit)
- **Bottom nav + contextual sheets** (if panel-heavy)

### Bottom nav items (max 4–5)
| Slot | Label | Destination | Notes |
|------|-------|-------------|------|
| 1 | <label> | <route> | |
| 2 | <label> | <route> | |
| 3 | <label> | <route> or create action | center slot can be a FAB/create CTA |
| 4 | <label> | <route> | |
| 5 | Menu | drawer | required if overflow exists |

### Bottom nav style
- **Icon + label** recommended (NN/g research: labels improve recognition by ~60%)
- Active state: filled icon variant + gradient indicator bar + label weight 600
- Inactive: outlined icon variant + label weight 400

### Drawer (mobile)
- Includes full navigation map (same labels/icons as desktop)
- Includes workspace/tenant switcher (if relevant)
- Triggered by avatar tap or hamburger icon

### Panels on mobile
- **Search:** Full-screen takeover (not a narrow panel)
- **Sub-menus / messages / notifications:** Full-height sheets (side or bottom sheet)
- Ensure 48×48 touch targets

### Gesture navigation (optional)
- Swipe right to go back (standard OS behavior)
- Swipe between tabs (optional; only if content is tab-like)

### Content-level layout per destination
For each destination, specify which canonical layout pattern applies:
- **Feed** — Infinite scroll, cards, chronological/algorithmic
- **List-Detail** — Master list + detail pane (push nav on mobile, side-by-side on desktop)
- **Dashboard** — Card grid, KPIs, data viz, filterable
- **Create/Edit** — Focused form, minimal chrome, inline validation
- **Gallery/Browse** — Card grid with filters, image-forward, badges
- **Settings** — Grouped sections, toggles/selects, search-within for large apps

See `design-method.md` → Content-Level Layout Patterns for the full reference.

---

## 5) Interaction Contract

### Dual-state model (desktop)
- **State A (Expanded Drawer):** Clicking a `route` item navigates; drawer stays expanded with labels
- **State B (Rail + Panel):** Clicking a `panel` item collapses drawer to icon-only rail and opens secondary panel
- States are **mutually exclusive** — expanded drawer and secondary panel never coexist
- **Transition:** Animate concurrently (drawer width + panel width) over 200ms `ease-out`

### Restore-on-close behavior
When the user closes the secondary panel (Escape / click-same-icon / click-outside):
- [ ] **Auto-expand:** Rail restores to expanded drawer (default, Instagram-style)
- [ ] **Stay collapsed:** Rail stays icon-only until user manually expands

*(Check one — this is an app-level preference)*

### Open/close rules
- Clicking the same rail icon toggles its panel
- Escape closes: modal → panel → drawer precedence
- Focus returns to trigger on close

### Active state rules
- Route items active by pathname
- Panel items active by current panel state (query param or UI state)

### URL/state contract (recommended)
- Route navigation: pathname
- Panel state: `?panel=...` (preferred for Back/Forward and deep links)

---

## 6) Accessibility (WCAG AA)
- Keyboard navigation complete (Tab/Shift+Tab)
- Visible focus rings
- Tooltips/hover chips accessible (not hover-only)
- ARIA labels for icon-only buttons
- Skip links present (when applicable)

---

## 7) i18n Keys (EN/FR baseline)
List required keys:
- `nav.items.*`
- `nav.panels.*`
- `nav.a11y.*`

---

## 8) Analytics (optional but recommended)
Define events:
- `nav_rail_click` (itemId, workspace, locale)
- `nav_panel_open` / `nav_panel_close` (panelId)
- `tenant_switch` (fromTenant, toTenant)

---

## 9) Open Questions / Follow-ups
- Restore-on-close behavior preference (see §5)
- Mobile bottom nav: 4 or 5 items?
- Center slot: route or create/FAB action?

