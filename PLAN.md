# PLAN.md

Roadmap of features queued for the builder. Listed in suggested order — each step is independently shippable.

## Status legend

- ✅ done
- 🔵 next up
- 🟡 planned
- ⚪ idea, not committed

---

## ✅ Done (current state)

- Modular Vite project structure (migrated from single-file HTML)
- 5 section types: `intro_row`, `case_grid`, `chart_with_aside`, `charts_row`, `findings_block`
- Visual editor: sidebar / center forms / iframe preview with zoom
- Print-ready HTML export (single file, opens anywhere, prints to A0)
- JSON config import/export (single project)
- localStorage projects: auto-save, project switcher, rename, delete
- Bundle export/import (all projects → one JSON for backup/migration)
- IBM Plex typography, dark IDE-style builder UI

---

## 🔵 Step 1 — Russian localization

**Why first:** simplest of the queued items, useful immediately, exercises the i18n boilerplate that themes will reuse.

### Approach

1. Create `src/i18n/index.js` exporting:
   - `setLocale(code)` — switches active locale, re-renders UI
   - `t(key, params?)` — returns translated string
   - `getLocale()` / `availableLocales`
2. Create `src/i18n/en.js` and `src/i18n/ru.js` — flat objects of `{ key: string }`. Group keys by area: `toolbar.*`, `sidebar.*`, `editor.field.*`, `editor.section.*`, `project.*`, `toast.*`, etc.
3. Replace every UI string in `src/` with `t(...)`. **Do not** translate poster content (the user's data) — only chrome.
4. Add a locale toggle in the toolbar (RU / EN). Persist choice to `localStorage` under `a0_poster_locale_v1`. Default: detect from `navigator.language`, fall back to EN.

### Out of scope for this step

- Don't translate `poster-runtime/`. Poster CONTENT is user data and stays in whatever language the user types.
- Don't translate field hints that reference HTML/CSS terms (e.g. "viewBox controls scaling") — keep technical labels English even in RU mode for clarity.

### Acceptance criteria

- Toggling locale switches all UI chrome instantly without page reload
- Choice persists across reloads
- Toast messages and `confirm()`/`prompt()` dialogs translated
- No layout breakage (Russian strings can be ~30% longer — verify forms don't overflow)

---

## 🔵 Step 2 — Color themes

**Why second:** clean win, visible upgrade, validates the architecture before the bigger Vega-Lite work.

### Approach

1. The poster CSS already uses CSS variables (`--navy`, `--navy-dark`, `--accent-red`, etc.) — themes just override these.
2. Create `src/themes/index.js` with a registry of named themes:
   ```js
   export const THEMES = {
     navy_red:    { name: 'Navy & Red (default)',    vars: { ... } },
     teal_orange: { name: 'Teal & Orange',           vars: { ... } },
     monochrome:  { name: 'Monochrome (journals)',    vars: { ... } },
     warm_rust:   { name: 'Warm Rust (medical)',     vars: { ... } },
     // …
   };
   ```
3. Add `theme` field to the config schema. Default to `navy_red`. Selection happens in the **header editor** (it's a poster-level setting, not a section setting).
4. In `buildPosterHTML`, inject theme variables into `:root` of the exported HTML. The runtime CSS already references the variables; no changes to `poster.css` needed.
5. Optional: a "Custom" preset with color pickers for each variable. Save the custom palette in the config so it travels with the project.

### Acceptance criteria

- Theme dropdown in header editor
- Switching theme updates preview within debounce window
- Theme persists in saved projects and exported HTML
- All 4–5 presets feel intentional, not just hue rotations

---

## 🟡 Step 3 — Chart builder via Vega-Lite

**The big one.** Replace raw SVG-paste with a structured chart editor.

### Why Vega-Lite

- JSON grammar fits our "everything is JSON" model perfectly
- Covers all common scientific chart types: line, bar, scatter, boxplot, error bars, layered annotations
- Renders to SVG natively — same output format we already use
- One CDN script (~400 KB gzipped); reasonable for the scope
- Existing Vega-Lite editor (vega.github.io/editor) provides a known reference UX

### Approach

**Phase 3a — preview integration.** Inside the runtime, when a chart object has `vegaSpec` instead of `svg`, load Vega-Lite (lazy, from CDN) and render to SVG into the chart slot. Falls back to `svg` field if Vega is unavailable (offline).

**Phase 3b — builder UX.** In the chart editors (`chart_with_aside.chart` and `charts_row.charts[i]`), add a tabbed interface:
- **Data** — table editor (paste CSV / type rows / column types)
- **Encoding** — visual mapping (X = column A, Y = column B, color = column C, mark = line/bar/point/...)
- **Spec** — raw Vega-Lite JSON for power users
- **SVG** — fallback raw SVG (still supported)

**Phase 3c — chart presets.** Common scientific chart types as starters: VISA-P trajectory (line by group), boxplot of outcome by group, forest plot (effect sizes with CIs), bar chart with error bars, scatter with regression line.

### Risks

- Bundle size jumps. Mitigate by lazy-loading Vega-Lite only if a chart with `vegaSpec` exists.
- Print quality: verify SVG fonts render correctly when Chrome prints A0 PDF. Embed font-family explicitly in spec (don't rely on browser defaults).
- Backward compat: old projects with raw SVG keep working. Don't auto-migrate.

### Out of scope

- Real-time data connections (CSV upload + paste is enough)
- Vega (full grammar) — Vega-Lite only

---

## 🟡 Step 4 — Quality-of-life polish

Once 1–3 are in, these become the obvious next gaps:

- **QR generator from URL** — replace the "paste raw SVG" field with a URL input + auto-generated QR (qrcode-svg or similar, ~10 KB)
- **Logo uploader** — drag-and-drop image → auto base64 data URI (current `src` field is fine for power users, but UX is rough)
- **Overflow indicator** — when poster content overflows the A0 frame, show a red bar at the bottom of the preview with byte/pixel info
- **Drag-and-drop section reordering** — replace `▲▼` buttons with native HTML5 drag (sortable.js or hand-rolled)
- **Section duplication** — `⎘ Duplicate` next to `✕ Delete`
- **Undo/redo** — keep a history stack of last N config snapshots; Cmd+Z / Cmd+Shift+Z

---

## ⚪ Step 5 — Deploy to Mark's Astro site

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

---

## Notes for whoever's working on this

- Read `CLAUDE.md` first if you're an AI agent
- Each step above is intentionally one-PR-sized
- Don't cross step boundaries — finish one, ship it, then start the next
- If a step turns out 2–3× bigger than estimated, stop and ask — usually means the design is wrong, not just the estimate
