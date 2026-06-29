# Prototype Config Template — `app-config.js`

**Purpose:** Per-app configuration file for Proto-Kit.  
**Location:** `docs/definition/prototypes/app-config.js`  
**Loaded before:** `docs/METHOD/proto-kit/proto-kit.js`

---

## Template

```javascript
/**
 * {AppName} — Proto-Kit Configuration
 * Defines design tokens, page navigation, and framework config.
 */

/* ── Design Tokens (override proto-kit defaults) ── */
window.APP_TOKENS = {
  // Brand — REQUIRED
  priColor: '#057bfa',       // Primary brand color
  pri2Color: '#0ec4c0',      // Secondary / gradient end
  accentColor: '#0ec4c0',    // Active state accent

  // Typography — adjust to brand
  fontFamily: "'DM Sans',sans-serif",
  baseFontSize: 16,

  // Mode — 'dark' or 'light'
  bgMode: 'dark',

  // Only override tokens that differ from defaults.
  // Full token list: proto-kit/base-tokens.js (121 tokens)
};

/* ── Prototype Pages ── */
window.PROTO_PAGES = [
  // { key: unique_id, label: display_name, icon: svg_path_d, file: filename.html }
  { key: 'home',  label: 'Home',  icon: 'M3 12l2-2m0 0l7-7 7 7M5 10v10a1 1 0 001 1h3m10-11l2 2m-2-2v10a1 1 0 01-1 1h-3m-4 0h4', file: 'HOME.html' },
  { key: 'admin', label: 'Admin', icon: 'M12 20h9M16.5 3.5a2.121 2.121 0 013 3L7 19l-4 1 1-4L16.5 3.5z',                          file: 'ADMIN.html' },
  // Add one entry per prototype HTML page
];

/* ── Proto-Kit Config ── */
window.PROTO_CONFIG = {
  appName: '{AppName}',
  mobileFile: 'MOBILE.html',  // optional — omit if no mobile prototype
  skipPages: [],               // pages that should NOT show the panel bar
};
```

---

## Notes

- **Only override tokens that differ from `base-tokens.js` defaults.** Most apps only need: `priColor`, `pri2Color`, `fontFamily`, `bgMode`.
- **Icons use SVG path `d` values** — get them from [Feather Icons](https://feathericons.com/) or [Heroicons](https://heroicons.com/).
- **The Design Tuner** will apply the tokens live. Use "Save" in the tuner to export final values back into `app-config.js`.
