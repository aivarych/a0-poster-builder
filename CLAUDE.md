# CLAUDE.md

Context for Claude Code working in this repo. Read this before making any non-trivial changes.

## What this project is

A0 Poster Builder — a visual editor for A0 (841 × 1189 mm) scientific posters. The user (Mark, sports medicine doctor in La Plata, Argentina) and his partner (Natalia, mountain medicine) make conference posters several times a year. This is a personal/small-team tool, **not a SaaS** — see "Decisions already made" below.

The repo started as a single-file HTML built in conversation, then was modularized for further work in Claude Code. See README.md for module map and architecture.

## Decisions already made (do not re-litigate without explicit ask)

- **No backend, no accounts, no payments.** Variant A from earlier discussion. Persistence via localStorage + JSON bundle export. If Mark later changes his mind about SaaS, that's a separate conversation, not a default.
- **No framework.** Vanilla JS + Vite. No React / Vue / Svelte. The codebase is small enough that a framework adds ceremony without payoff. Don't suggest migrating.
- **Vite only as build tool.** Single-file output preferred where possible. Vite is here because of `?raw` imports for the poster runtime — that pattern is load-bearing.
- **Iframe for preview.** Not Shadow DOM. Iframe gives both CSS isolation AND a single source of truth (the same `buildPosterHTML` powers preview and export).
- **Poster CSS uses generic class names** (`.header`, `.card`, `.intro-row`) on purpose — those classes are the public schema for the runtime. They live in `poster-runtime/poster.css` and must NOT be prefixed/scoped.
- **English UI for now.** Russian localization is on the PLAN but not yet done. Don't add half-baked Russian strings ad-hoc; do it as a proper i18n pass when scheduled.

## Conventions

### State
Single mutable `state` object in `src/state.js`. Mutate directly. After mutation, call the relevant render function (`renderSidebar`, `renderEditor`, `refreshPreview`). No reducers, no events, no observables.

### Renders
- `renderSidebar()` — left panel (section list)
- `renderEditor()` — center panel (form for selected item)
- `refreshPreview()` — right panel (iframe srcdoc); also schedules auto-save
- `renderProjectMenu()` — toolbar dropdown
- `updateCurrentProjectName()` — toolbar label only

`refreshPreview()` is debounced 220 ms. Auto-save is debounced 700 ms. Both fire on every edit; that's fine, the preview is cheap because it just sets `iframe.srcdoc`.

### Editor inputs
Form inputs carry `data-path="dotted.path.to.field"`. `onFieldInput` reads the path, calls `setAtPath(state.config, path, value)`, then `refreshPreview()`. Don't add per-input listeners — use the delegated pattern.

When you change the structure (add/remove array item, switch project), call `rerenderEditorAndPreview()` which re-renders the editor (preserving scroll position), the sidebar, and the preview.

### Adding sections
Four edits in four files (see README → "Adding a new section type"). Don't try to be clever and merge them — keeping them separate makes the four concerns (catalog / runtime / form / styles) independently editable.

### Styles
- **Builder UI styles** → `src/styles/builder.css`. Dark IDE aesthetic. IBM Plex Sans (UI) + IBM Plex Mono (labels/values). Warm amber accent (`--accent: #f0883e`). Don't drift to Inter or system sans.
- **Poster styles** → `poster-runtime/poster.css`. Helvetica / scientific publishing style. Navy + red palette. Print-grade typography. Don't apply the builder's aesthetic to the poster — they're intentionally different worlds.

### File creation
This is a small project. Don't over-modularize. New utility belongs in `utils.js` unless it brings ≥ 50 lines of cohesive code. New top-level concept (e.g. theme system, i18n) gets its own module.

## Things to verify after any change

```bash
npm run build    # must succeed without warnings
npm run dev      # open localhost:5173, smoke-test:
                 #   - poster renders in preview
                 #   - editing title updates preview within ~500 ms
                 #   - "Export print-ready HTML" downloads a working file
                 #   - Open the exported file in a separate tab — poster renders
                 #   - Reload the page — last project persists
```

The exported HTML is the most important artifact. If the builder works but the export doesn't render, the user has no product. Test it.

## Common traps

- **Don't break the iframe sandbox.** `sandbox="allow-scripts"` (no `allow-same-origin`) is intentional. Removing or changing it has security and behavior implications.
- **Don't escape JSON content twice.** `buildPosterHTML` already escapes `</script` sequences in JSON. Double-escaping breaks the runtime.
- **Don't use `localStorage` directly outside `persistence.js`.** Always go through the wrapped functions — they handle the case where storage is unavailable (private browsing, quota full, sandboxed contexts).
- **Don't add CSS framework.** The total builder UI CSS is ~700 lines and works. Tailwind/UnoCSS would multiply file size and add a build step.
- **Don't add a chart library to the builder.** Charts go IN the runtime if anywhere (so exported HTMLs are self-contained). See PLAN.md for the Vega-Lite plan.

## When in doubt

Read `README.md` for architecture, `PLAN.md` for what's queued. If a decision isn't covered, ask Mark — don't guess about product direction.
