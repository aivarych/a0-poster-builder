# PLAN.md

Roadmap of features queued for the builder. Listed in suggested order — each step is independently shippable.

## Status legend

- ✅ done
- 🔵 in progress / next up
- 🟡 planned
- ⚪ idea, not committed

---

## ✅ Done

- Modular Vite project structure (migrated from single-file HTML)
- 5 section types: `intro_row`, `case_grid`, `chart_with_aside`, `charts_row`, `findings_block`
- Visual editor: sidebar / center forms / iframe preview with zoom
- Print-ready HTML export (single file, opens anywhere, prints to A0)
- JSON config import/export (single project)
- localStorage projects: auto-save, project switcher, rename, delete
- Bundle export/import (all projects → one JSON for backup/migration)
- IBM Plex typography, dark IDE-style builder UI
- Russian localization of the builder UI (EN / RU toggle, persisted)
- 5 colour themes + custom palette editor
- Vega-Lite chart builder (Data / Encoding / Spec / SVG tabs, with chart presets)
- Drag-and-drop section reordering
- Section duplication
- Undo / redo (`Cmd/Ctrl+Z`, `Cmd/Ctrl+Shift+Z`)
- Logo drag-and-drop with embedded base64 storage
- QR-code generation for the contact block

---

## 🔵 In progress — Chart editor refactor (single primary path)

**Why:** the current chart editor exposes five parallel input mechanisms (`Insert preset` dropdown + `Data` / `Encoding` / `Spec` / `SVG` tabs). They overlap, none is clearly primary, and there's no source-of-truth rule when more than one is filled in. Real users (Maximiliano on the Aconcagua altitude profile) get stuck — they fill in one section, the chart doesn't render, no clear feedback as to why.

### Approach

Collapse to one primary path with one escape hatch.

**Primary path (visible by default):**
1. **Chart type selector** at the top (replaces "Insert preset"). Mandatory choice.
2. **Data table** below, columns determined by the chosen chart type. Standard `data-path` pattern, "Add row" button, delete-row per row.
3. **Live preview** — runtime takes `chart.type` + `chart.rows`, looks up preset, builds Vega-Lite spec, renders.

The Encoding tab is removed entirely — encoding is determined by chart type.

**Advanced (collapsed):** single `▸ Advanced` disclosure with two escape hatches: edit Vega-Lite spec directly, or paste raw SVG. Only one is active at a time, controlled by `chart.mode`.

### Schema

```js
chart: {
  title, caption,
  mode: 'builder' | 'spec' | 'svg',
  type: 'altitude_profile',  // when mode === 'builder'
  rows: [...],               // when mode === 'builder'
  specOverride: null | str,  // when mode === 'spec'
  svg: null | str,           // when mode === 'svg'
}
```

### Initial preset list

`altitude_profile`, `line_by_group`, `bar_error`, `boxplot`, `scatter_regression`, `forest_plot`. Six is enough for the medical conferences this is used for.

### Acceptance criteria

- Fresh chart shows: title → chart type dropdown → empty data table → collapsed Advanced. No tabs.
- Switching chart type with non-empty rows triggers `confirm()`.
- Existing projects (Aconcagua demo, anything in `localStorage`) load and render unchanged via migration.
- Pasting raw SVG into Advanced still works.
- `npm run build` clean.

### Out of scope

- No CSV upload — typing rows is enough (≤30 rows typical for scientific posters).
- No visual encoding editor — encoding is per-preset.
- No new chart types beyond the six listed.

---

## 🟡 Next — Image drop & autoscale for charts

**Why:** even after the refactor, "paste raw SVG" still requires opening the file in a text editor and copying its contents. The same drop-zone pattern that already works for logos solves this in one motion, and naturally extends to PNG / JPG / WebP — useful for screenshots from PowerPoint or graphs exported as bitmap.

### Approach

Rename `mode: 'svg'` to `mode: 'image'`. The chart editor's Advanced section gains a drop zone accepting `.svg`, `.png`, `.jpg`, `.webp`. On drop:

- SVG → stored inline, rendered as before
- Raster → auto-downscale via canvas (max 2400px on long side), convert to WebP, store as data URI, render via `<img>`

Schema: `chart.image = { type: 'svg' | 'image', dataUri: string }`. Single field, runtime branches on `type`.

### Print-quality safeguard

After downscale, if final raster width is < ~1800px, show a banner: *"This image may look pixelated at A0 print size. SVG or images > 2400px wide are recommended."* Don't block — sometimes pixelation is acceptable (drafts, "this is roughly what we want here" placeholders).

### Reuse

The logo drag-and-drop module already handles file → base64 conversion and the canvas-downscale path. Refactor it to a shared `src/file-drop.js` so both call sites use the same code.

### Out of scope

- No `IndexedDB` storage layer for large images — raster compression to WebP keeps configs small enough for `localStorage` in practice. If real users hit the 5 MB quota, that's the trigger to revisit.
- No image editing inside the builder (crop, rotate). If the user needs that, they edit in their own tool first.

### Don't start until

The chart editor refactor (single primary path) is shipped and tested. Both touch `chart.mode`; no point editing the same surface twice.

---

## 🟡 Quality-of-life polish (remaining)

The original Step 4 list — most items already shipped, one left:

- **Overflow indicator** — when poster content overflows the A0 frame, show a red bar at the bottom of the preview with byte/pixel info. Helps catch posters that look fine in preview but truncate on actual print.

---

## ⚪ Step — Deploy to Mark's Astro site

**Goal:** make the builder available at `tvojdomen.com/poster-builder` so colleagues can use it without downloading anything.

### Approach

Two options:

**Option A — Iframe embed.** Build with Vite, deploy `dist/` as static asset under Astro's `/public/poster-builder/`. Astro page contains a single iframe pointing to it. Easiest, full isolation.

**Option B — Astro page with the builder mounted.** Refactor `main.js` into a function `mountBuilder(rootEl)` that takes a target element. Astro page imports it as a client island. Tighter integration, more work.

Recommend A unless integration with the rest of the site is wanted (shared header/footer, analytics, etc.).

### Acceptance criteria

- Public URL works in incognito (no logged-in state assumed)
- Print-ready export downloads correctly from the deployed version
- localStorage scoped to the deployment domain (so projects persist for visitors)
- Optional: Plausible analytics tag for visitor counts (privacy-friendly, no consent banner)

---

## ⚪ Ideas (not committed)

- **More section types:** `methods_grid` (RCT methods box), `prisma_flow` (systematic review flow diagram), `consort_diagram`, `forest_plot_table`, `risk_of_bias_summary`
- **Multi-language poster content** — toggle showing translations side by side for bilingual conferences
- **Template marketplace** — share/download community-made section types as JSON manifests
- **Print preview math** — compute character counts per section vs known overflow thresholds
- **Aconcagua content port** — paste the original Aconcagua case-report content into a project as a real-world stress test of the section types
- **Chart editor: more presets** — heatmap, dose-response curve, Kaplan-Meier survival curve. Add when a real conference poster needs them, not before.

---

## Notes for whoever's working on this

- Read `CLAUDE.md` first if you're an AI agent
- Each step above is intentionally one-PR-sized
- Don't cross step boundaries — finish one, ship it, then start the next
- If a step turns out 2–3× bigger than estimated, stop and ask — usually means the design is wrong, not just the estimate
