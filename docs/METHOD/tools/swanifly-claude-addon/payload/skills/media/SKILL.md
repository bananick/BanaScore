---
name: media
description: Produce and manage visual assets — search images, generate or rework imagery, resize and export for UI, prototypes, and marketing. Use when the user says "find an image", "make a hero image", "generate an icon/illustration", "resize this", or "export at 2x", or needs assets for a screen or campaign. Owned by Nova; wires real asset URLs into Storage, never fakes venue data.
---

# /media — Visual Asset Ops (Nova)

Search, create, rework, and export visual assets. This is the capability layer for the
design / marketing surface — **Nova** owns it. (Not a persona: a skill any agent can call.)

## When to use
- **Find** — source an image / photo / icon (web search, stock, brand assets).
- **Create / rework** — generate an illustration, hero, icon, or edit an existing asset.
- **Resize / export** — responsive sizes, 1x/2x/3x, format conversion (WebP/AVIF/PNG/SVG),
  aspect-ratio crops.

## Tools (priority order)
1. **Canva MCP** — `generate-design`, `resize-design`, `export-design`, `upload-asset-from-url`,
   `get-export-formats`. Primary for creation, resize, and export. (Load via ToolSearch if deferred.)
2. **Web search / browse** — WebSearch + Chrome MCP for sourcing images and references
   (always verify licensing).
3. **Local (Bash)** — `sharp` / ImageMagick for deterministic resize / crop / format when the file
   is already on disk. Prefer this for batch responsive exports into `public/`.

## Rules (non-negotiable)
- **`proto/` + marketing assets only — never fake product data.** Generated or placeholder imagery
  may live in `proto/`, prototypes, and marketing pages. It must **never** masquerade as a real
  venue's photos in shipped app data paths (`app/`, `src/`, live Firestore listings). Real listings
  use real, uploaded assets. (SOUL non-negotiable #1.)
- **Real asset pipeline:** app images go through Firebase Storage → a real URL in Firestore,
  rendered with `next/image`. Never hardcode a data-URI or a `proto/` path into app code.
- **Provenance & licensing:** record the source + license of any sourced image. No unlicensed stock
  in shipped surfaces.
- **Token contract:** any UI chrome around an asset uses METHOD tokens (`--pri`, `--r-card`, …) —
  never hardcoded colors.
- **Performance:** lazy-load, responsive `sizes`, prefer WebP/AVIF; respect the UX bar (light, fast).

## Output
Assets written to `public/` (app) or `proto/assets/` (prototype), plus a one-line manifest per
asset: source, license, sizes/formats produced, and where each is wired.
