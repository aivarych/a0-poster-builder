# A0 Poster Builder

Visual editor for A0 scientific posters. JSON-driven runtime, exports a single self-contained HTML file you print to PDF at 841 × 1189 mm.

## Quick start

```bash
npm install
npm run dev          # http://localhost:5173
npm run build        # → dist/
npm run preview      # preview the production build
```

Requires Node 18+ (for `structuredClone` in Vite tooling). The runtime itself works in any modern browser.

## What the tool does

The user builds a poster by editing a JSON config through a visual interface (sidebar with sections, center panel with forms, right pane with live preview). On "Export print-ready HTML" we generate one self-contained `.html` file with the runtime, CSS, and config inlined — the user opens it in Chrome, prints to PDF at custom A0 size, done.

Projects persist to `localStorage` (auto-save on edit, switcher in the toolbar). Bundle export/import lets users back up everything to a single JSON file.

## Architecture

Two distinct codebases coexist in this repo:

**`src/`** — the **builder** (the editor UI you see at `localhost:5173`). Loaded as ES modules via Vite. Mutates `state.config` directly, calls render functions explicitly. No framework.

**`poster-runtime/`** — the **poster runtime** (the JS+CSS that ships INSIDE every exported HTML file). Plain files with proper syntax highlighting; inlined as raw strings into exported HTML by `src/renderer.js` using Vite's `?raw` import suffix.

Both halves share the same JSON schema. The poster runtime is intentionally tiny and dependency-free so exported HTMLs work forever without npm or a build step.

### Module layout

```
src/
├── main.js              entry point — wires DOM events, kicks off init
├── state.js             single mutable state object
├── default-config.js    DEFAULT_CONFIG (the demo poster)
├── section-types.js     SECTION_TYPES + SECTION_TEMPLATES (the registry)
├── utils.js             escapeHtml, path helpers, downloadFile, showToast
├── renderer.js          buildPosterHTML(config) → standalone HTML string
├── preview.js           iframe.srcdoc + zoom controls
├── sidebar.js           section list, add menu, ▲▼✕ controls
├── editor.js            form editor — one renderer per section type
├── persistence.js       projects in localStorage + project switcher menu
├── import-export.js     single-config JSON + print-ready HTML export
└── styles/builder.css   all builder UI styles (IBM Plex Sans/Mono, dark IDE)

poster-runtime/
├── poster.css           all poster styles (Helvetica, navy/red palette, A0 grid)
└── runtime.js           sectionRenderers + DOM construction

index.html               thin shell — script type=module to /src/main.js
vite.config.js           single-file output, ES2020 target
```

### Adding a new section type

Five edits, one per file. The four moving parts are intentionally decoupled:

1. **`src/section-types.js`** — add an entry to `SECTION_TYPES` (label + 1-line desc) and a starter to `SECTION_TEMPLATES` (factory returning a fresh section object)
2. **`poster-runtime/runtime.js`** — add a renderer to `sectionRenderers[type]` (returns a DOM Element)
3. **`src/editor.js`** — add a renderer to `sectionEditorRenderers[type]` (returns HTML string for the form)
4. **`poster-runtime/poster.css`** — add styles for new classes if needed

That's it. The sidebar, add-menu, and persistence pick up the new type automatically.

### Editor field conventions

All form inputs carry `data-path="dotted.path.to.field"` for delegated input handling (one listener per editor render, not per field). All array buttons carry `data-action="up|down|delete|add-*"` plus `data-list` and/or `data-index`. See `attachEditorHandlers()` and `onEditorButton()` in `src/editor.js`.

### Why iframe for preview

The poster CSS has very generic class names (`.header`, `.card`, `.intro-row`) that would collide with the builder UI. Iframe gives clean isolation. We use `sandbox="allow-scripts"` (without `allow-same-origin`) so scripts run but can't reach the parent.

### Storage

`localStorage` keys:
- `a0_poster_projects_v1` — JSON of `{ [id]: { id, name, updatedAt, config, userNamed } }`
- `a0_poster_current_id_v1` — id of the active project

Quota is ~5 MB on most browsers. Each project ≈ 30–300 KB depending on SVG content. Bundle export is the user's escape hatch for backups and machine-to-machine moves.

## License

Personal project, no license set yet.
