# A0 Poster Builder

[Русский](#a0-poster-builder-ru) ниже.

Visual editor for A0 (841 × 1189 mm) scientific posters. JSON-driven runtime, exports a single self-contained HTML file you print to PDF at A0.

**Live demo:** https://aivarych.github.io/a0-poster-builder/

## Quick start

```bash
npm install
npm run dev          # http://localhost:5173
npm run build        # → dist/
npm run preview      # preview the production build
```

Requires Node 18+ (for `structuredClone` in Vite tooling). The runtime itself works in any modern browser.

## What the tool does

You build a poster by editing a JSON config through a visual interface (sidebar with sections, center panel with forms, right pane with live preview). On **Export print-ready HTML** the tool generates one self-contained `.html` file with the runtime, CSS, and config inlined — open it in Chrome, print to PDF at custom A0 size, done.

Projects persist to `localStorage` (auto-save on edit, switcher in the toolbar). Bundle export/import lets you back up everything to a single JSON file.

## Features

- **5 section types**: `intro_row`, `case_grid`, `chart_with_aside`, `charts_row`, `findings_block` — each renderable as proper scientific-poster blocks.
- **Vega-Lite chart builder**: paste/edit a Vega-Lite spec, attach CSV data, preview live. Charts ship inside the exported HTML (no external deps).
- **5 colour themes** + custom palette editor.
- **EN / RU localisation** of the builder UI.
- **Drag-and-drop reordering** of sections.
- **Undo / redo** (`Cmd/Ctrl+Z`, `Cmd/Ctrl+Shift+Z`).
- **Logo drag-and-drop** with embedded base64 storage.
- **QR-code generation** for the contact block.
- **Auto-save** to `localStorage`; bundle export/import for backups.

## Architecture

Two distinct codebases coexist in this repo:

**`src/`** — the **builder** (editor UI at `localhost:5173`). ES modules via Vite. Mutates `state.config` directly and calls render functions explicitly. No framework.

**`poster-runtime/`** — the **poster runtime** (JS + CSS that ships inside every exported HTML). Plain files with proper syntax highlighting; inlined as raw strings into exported HTML by `src/renderer.js` using Vite's `?raw` import suffix.

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
├── sidebar.js           section list, add menu, drag-and-drop, controls
├── editor.js            form editor — one renderer per section type
├── persistence.js       projects in localStorage + project switcher menu
├── import-export.js     single-config JSON + print-ready HTML export
├── history.js           undo/redo snapshots
├── themes/              colour theme catalogue + custom palette
├── chart-presets/       Vega-Lite chart starters
├── i18n/                en.js, ru.js, t() helper
├── qr.js                QR-code generation (qrcode-svg wrapper)
└── styles/builder.css   all builder UI styles (IBM Plex Sans/Mono, dark IDE)

poster-runtime/
├── poster.css           all poster styles (Helvetica, navy/red palette, A0 grid)
├── runtime.js           sectionRenderers + DOM construction
└── vendor/              vega.min.js + vega-lite.min.js (lazy-loaded chunk)

index.html               thin shell — script type=module to /src/main.js
vite.config.js           single-file output, ES2020 target
```

### Adding a new section type

Four edits in four files. The moving parts are intentionally decoupled:

1. **`src/section-types.js`** — add an entry to `SECTION_TYPES` (label + 1-line desc) and a starter to `SECTION_TEMPLATES` (factory returning a fresh section object)
2. **`poster-runtime/runtime.js`** — add a renderer to `sectionRenderers[type]` (returns a DOM Element)
3. **`src/editor.js`** — add a renderer to `sectionEditorRenderers[type]` (returns HTML string for the form)
4. **`poster-runtime/poster.css`** — add styles for new classes if needed

That's it. The sidebar, add-menu, and persistence pick up the new type automatically.

### Editor field conventions

All form inputs carry `data-path="dotted.path.to.field"` for delegated input handling (one listener per editor render, not per field). All array buttons carry `data-action="duplicate|delete|add-*"` plus `data-list` and/or `data-index`. See `attachEditorHandlers()` and `onEditorButton()` in `src/editor.js`.

### Why iframe for preview

The poster CSS has very generic class names (`.header`, `.card`, `.intro-row`) that would collide with the builder UI. Iframe gives clean isolation. We use `sandbox="allow-scripts"` (without `allow-same-origin`) so scripts run but can't reach the parent.

### Storage

`localStorage` keys:
- `a0_poster_projects_v1` — JSON of `{ [id]: { id, name, updatedAt, config, userNamed } }`
- `a0_poster_current_id_v1` — id of the active project
- `a0_poster_locale_v1` — `'en'` or `'ru'`

Quota is ~5 MB on most browsers. Each project ≈ 30–300 KB depending on SVG content. Bundle export is the escape hatch for backups and machine-to-machine moves.

## Deployment

Auto-deploys to GitHub Pages on every push to `main` via `.github/workflows/deploy.yml`.

## License

Personal project, no license set yet.

---

<a id="a0-poster-builder-ru"></a>

# A0 Poster Builder (RU)

Визуальный редактор научных постеров формата A0 (841 × 1189 мм). Хранит постер в JSON, экспортирует один самодостаточный HTML-файл, который печатается в PDF на A0.

**Живая демка:** https://aivarych.github.io/a0-poster-builder/

## Быстрый старт

```bash
npm install
npm run dev          # http://localhost:5173
npm run build        # → dist/
npm run preview      # просмотр продакшен-сборки
```

Требуется Node 18+ (Vite использует `structuredClone`). Сам рантайм постера работает в любом современном браузере.

## Что умеет

Постер собирается через визуальный редактор: слева — список секций, посередине — формы для выбранной секции, справа — живое превью. По кнопке **Export print-ready HTML** получается один HTML-файл со всем нужным внутри (рантайм, CSS, конфиг). Открываешь в Chrome, печатаешь в PDF с произвольным размером A0 — готово.

Проекты автоматически сохраняются в `localStorage` (переключатель проектов в тулбаре). Bundle-экспорт/импорт позволяет сохранить всё в один JSON для бэкапа или переноса между машинами.

## Возможности

- **5 типов секций**: `intro_row`, `case_grid`, `chart_with_aside`, `charts_row`, `findings_block` — все верстаются как полноценные блоки научного постера.
- **Конструктор графиков на Vega-Lite**: можно вставить/отредактировать spec, прикрепить CSV-данные, увидеть превью. Графики попадают внутрь экспортируемого HTML без внешних зависимостей.
- **5 цветовых тем** + редактор кастомной палитры.
- **Локализация EN / RU** интерфейса редактора.
- **Drag-and-drop** для перестановки секций.
- **Undo / redo** (`Cmd/Ctrl+Z`, `Cmd/Ctrl+Shift+Z`).
- **Drag-and-drop логотипов** с встраиванием в base64.
- **Генерация QR-кода** для контактного блока.
- **Автосохранение** в `localStorage`, экспорт/импорт всех проектов одним JSON.

## Архитектура

В репо сосуществуют два независимых кодовых блока:

**`src/`** — **редактор** (то, что открывается на `localhost:5173`). ES-модули через Vite. Прямо мутирует `state.config` и явно вызывает функции рендера. Без фреймворка.

**`poster-runtime/`** — **рантайм постера** (JS + CSS, которые попадают внутрь каждого экспортированного HTML). Обычные файлы (с подсветкой синтаксиса), которые `src/renderer.js` инлайнит как сырые строки через Vite-импорт `?raw`.

Обе половины используют одну и ту же JSON-схему. Рантайм специально маленький и без зависимостей — экспортированные HTML работают вечно, без npm и сборки.

### Структура модулей

См. `Module layout` в английской секции выше — комментарии в коде дублировать здесь не имеет смысла.

### Добавить новый тип секции

Четыре правки в четырёх файлах (детали см. в английской секции). Узлы намеренно развязаны: каталог типов, рантайм, форма редактора и стили правятся независимо.

### Соглашения по полям редактора

Все инпуты несут `data-path="dotted.path.to.field"` — это нужно для делегированной обработки ввода (один слушатель на рендер, а не на каждое поле). Кнопки массивов несут `data-action="duplicate|delete|add-*"` плюс `data-list` и/или `data-index`. Реализация: `attachEditorHandlers()` и `onEditorButton()` в `src/editor.js`.

### Почему iframe для превью

CSS постера использует очень общие имена классов (`.header`, `.card`, `.intro-row`), которые бы конфликтовали с интерфейсом редактора. Iframe даёт чистую изоляцию. Используется `sandbox="allow-scripts"` (без `allow-same-origin`) — скрипты работают, но не могут дотянуться до родительской страницы.

### Хранилище

Ключи `localStorage`:
- `a0_poster_projects_v1` — JSON `{ [id]: { id, name, updatedAt, config, userNamed } }`
- `a0_poster_current_id_v1` — id текущего проекта
- `a0_poster_locale_v1` — `'en'` или `'ru'`

Лимит браузера ~5 МБ. Один проект — 30–300 КБ в зависимости от SVG. Bundle-экспорт — запасной выход для бэкапов и переноса между машинами.

## Деплой

Автоматический деплой на GitHub Pages при каждом push в `main` через `.github/workflows/deploy.yml`.

## Лицензия

Персональный проект, лицензия пока не выбрана.
