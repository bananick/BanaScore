# {AppName} — Project Design Values

**Owner:** Nova
**Status:** Draft
**Last updated:** {date}
**Companion to:** [`design-method.md`](../METHOD/design-method.md) (universal patterns, synced)

---

## Purpose

`design-method.md` defines universal patterns (synced to all apps).
This file defines **{AppName}-specific values** — palette, breakpoint decisions, typography scale, and identity colors unique to this app. This file does NOT sync to other repos.

---

## 1. Color Palette

### Design Mode

<!-- Choose one: dark-first | light-first | both (with system preference) -->
**Mode:** {dark-first | light-first | both}

### Primary Palette

| Token | Hex | Tailwind Class | Usage |
|-------|-----|----------------|-------|
| `--color-primary` | `#{hex}` | `text-primary`, `bg-primary` | Brand accent, active states, gradient start |
| `--color-primary-light` | `#{hex}` | `text-primary-light` | Gradient end, hover states |
| `--color-primary-dark` | `#{hex}` | `text-primary-dark` | Pressed states |

### Accent & Tertiary

| Token | Hex | Usage |
|-------|-----|-------|
| `--color-accent` | `#{hex}` | Secondary CTAs, complementary accent |
| `--color-tertiary` | `#{hex}` | Warm/cool tertiary accent (optional) |

### Surface Scale

<!-- Define your surface hierarchy. Dark-first apps go 900→50; light-first go 50→900 -->

| Token | Hex | Semantic Role |
|-------|-----|---------------|
| `surface-900` | `#{hex}` | Deepest background (dark-first page bg) |
| `surface-800` | `#{hex}` | Card background |
| `surface-700` | `#{hex}` | Elevated elements, drawer backgrounds |
| `surface-600` | `#{hex}` | Borders, dividers |
| `surface-400` | `#{hex}` | Muted text, icons, placeholders |
| `surface-300` | `#{hex}` | Body text |
| `surface-100` | `#{hex}` | Primary text |
| `surface-50` | `#{hex}` | Heading text, strongest contrast |

### Status Colors

| Token | Hex | Usage |
|-------|-----|-------|
| `success` | `#{hex}` | Positive states, completion |
| `warning` | `#{hex}` | Caution, pending |
| `error` | `#{hex}` | Errors, failures |
| `info` | `#{hex}` | Informational callouts |

---

## 2. Typography Scale

<!-- Choose: dashboard-density (tight, data-heavy) | content (spacious, reading) | marketing (large, bold) -->
**Density:** {dashboard-density | content | marketing}

| Element | Size | Weight | Letter-spacing |
|---------|------|--------|----------------|
| `h1` | `{size}rem` | {weight} | `{spacing}em` |
| `h2` | `{size}rem` | {weight} | `{spacing}em` |
| `h3` | `{size}rem` | {weight} | `{spacing}em` |
| `h4` | `{size}rem` | {weight} | `{spacing}em` |
| Body | `{size}rem` | {weight} | `{spacing}em` |

### Font Stack

| Token | Stack |
|-------|-------|
| `--font-sans` | `'Inter', ui-sans-serif, system-ui, sans-serif` |
| `--font-mono` | `'JetBrains Mono', ui-monospace, monospace` |

---

## 3. Breakpoint Contract

<!-- Choose: two-state (compact/expanded at lg:1024px) | three-state (compact/medium/expanded at md:768px + lg:1024px) -->
**Model:** {two-state | three-state}

| Window Class | Breakpoint | Shell Behavior |
|-------------|-----------|----------------|
| **Compact** | < {breakpoint}px | {describe: bottom nav, hamburger, etc.} |
| **Medium** (if three-state) | {min}–{max}px | {describe: rail without labels, etc.} |
| **Expanded** | ≥ {breakpoint}px | {describe: full rail, side panels, etc.} |

### Shell Dimensions

| Component | Size | Position |
|-----------|------|----------|
| TopBar | {height}px | `sticky top-0` |
| NavRail | {width}px | `sticky`, left side |
| BottomNav | {height}px | `fixed bottom-0` |

---

## 4. Identity Colors (if applicable)

<!-- For multi-agent/multi-user apps, define identity colors here -->

| Entity | Hex | Usage |
|--------|-----|-------|
| {name} | `#{hex}` | {role/context} |

---

## 5. Data Visualization (if applicable)

### Chart Color Palette

| Series | Color | Hex |
|--------|-------|-----|
| Primary | primary | `#{hex}` |
| Secondary | accent | `#{hex}` |
| Tertiary | tertiary | `#{hex}` |

---

## 6. Token Namespace Mapping

<!-- Map Proto-Kit shorthand tokens to your production tokens -->

| Proto-Kit | Production | Notes |
|-----------|-----------|-------|
| `--pri` | `--color-primary` | Brand color |
| `--pri2` | `--color-primary-light` | Gradient end |
| `--bg` | `--color-surface-900` | Page background |
| `--s1` | `--color-surface-800` | First elevation |
| `--text` | `--color-surface-100` | Primary text |
| `--border` | `--color-surface-600` | Border color |

---

## Design Log

| Date | Decision | Rationale |
|------|----------|-----------|
| {date} | Created DESIGN-GUIDELINES.md | Initial project design values |
