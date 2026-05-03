/**
 * Entry point. Wires up the DOM, loads persisted state, kicks off initial render.
 *
 * Module map:
 *   state.js          — single mutable state object
 *   default-config.js — DEFAULT_CONFIG (the demo poster)
 *   section-types.js  — registry: SECTION_TYPES, SECTION_TEMPLATES, getSectionLabel
 *   utils.js          — escape / path helpers / downloadFile / showToast
 *   renderer.js       — buildPosterHTML(config) → standalone HTML string
 *   preview.js        — iframe.srcdoc + zoom (refreshPreview, applyZoom, fitZoom)
 *   sidebar.js        — section list, add menu (renderSidebar, renderAddSectionMenu)
 *   editor.js         — form editor for selected item (renderEditor + handlers)
 *   persistence.js    — projects in localStorage + project switcher menu
 *   import-export.js  — single-file JSON import/export + print-ready HTML
 *   i18n/             — t(), setLocale, applyStaticTranslations
 *
 * The poster runtime (CSS + JS that ships INSIDE every exported HTML) lives in
 * /poster-runtime/ and is inlined by renderer.js via Vite's `?raw` import.
 */

import { state } from './state.js';
import { showToast, escapeAttr } from './utils.js';
import { renderSidebar, renderAddSectionMenu } from './sidebar.js';
import { renderEditor } from './editor.js';
import { refreshPreview, applyZoom, fitZoom } from './preview.js';
import {
  loadProjectsFromStorage, loadCurrentIdFromStorage,
  ensureCurrentProject, updateCurrentProjectName,
  toggleProjectMenu, closeProjectMenu, isStorageAvailable,
  refreshSaveIndicator, renderProjectMenu
} from './persistence.js';
import {
  exportPrintReadyHTML, exportJSON, importJSON, onImportFile, resetConfig
} from './import-export.js';
import {
  detectInitialLocale, setLocale, getLocale, applyStaticTranslations, t
} from './i18n/index.js';
import {
  THEMES, DEFAULT_THEME, THEME_VAR_LABEL_KEYS, listThemeIds
} from './themes/index.js';
import { undo, redo } from './history.js';
import { setupLayout } from './layout.js';

document.addEventListener('DOMContentLoaded', () => {
  // ---- Locale: detect → apply BEFORE first render so all strings come out right
  setLocale(detectInitialLocale());
  applyStaticTranslations();
  setupLocaleToggle();
  setupThemeControl();

  // ---- Toolbar buttons ----
  document.getElementById('btn-import').addEventListener('click', importJSON);
  document.getElementById('btn-export-json').addEventListener('click', exportJSON);
  document.getElementById('btn-export-html').addEventListener('click', exportPrintReadyHTML);
  document.getElementById('btn-reset').addEventListener('click', resetConfig);
  document.getElementById('import-file').addEventListener('change', onImportFile);

  // ---- Project switcher ----
  document.getElementById('project-switcher-btn').addEventListener('click', (e) => {
    e.stopPropagation();
    toggleProjectMenu();
  });
  document.addEventListener('click', (e) => {
    const menu = document.getElementById('project-menu');
    const btn = document.getElementById('project-switcher-btn');
    if (menu && !menu.contains(e.target) && e.target !== btn && !btn.contains(e.target)) {
      closeProjectMenu();
    }
  });

  // ---- Load persisted projects ----
  state.projects = loadProjectsFromStorage();
  state.currentProjectId = loadCurrentIdFromStorage();
  ensureCurrentProject();
  if (state.projects[state.currentProjectId]) {
    state.config = structuredClone(state.projects[state.currentProjectId].config);
  }
  updateCurrentProjectName();

  const indicator = document.getElementById('save-indicator');
  if (isStorageAvailable()) {
    indicator.classList.add('saved');
    indicator.querySelector('.save-text').textContent = t('project.indicator.loaded');
  } else {
    indicator.classList.add('error');
    indicator.querySelector('.save-text').textContent = t('project.indicator.no_storage');
    showToast(t('toast.storage_warn'), 'error');
  }

  // ---- Add section menu ----
  const addBtn = document.getElementById('btn-add-section');
  const addMenu = document.getElementById('add-section-menu');
  renderAddSectionMenu();
  addBtn.addEventListener('click', (e) => {
    e.stopPropagation();
    addMenu.classList.toggle('open');
  });
  document.addEventListener('click', (e) => {
    if (!addMenu.contains(e.target) && e.target !== addBtn) {
      addMenu.classList.remove('open');
    }
  });

  // ---- Zoom ----
  document.getElementById('zoom-in').addEventListener('click', () => {
    state.userZoomed = true;
    applyZoom(state.zoom * 1.15);
  });
  document.getElementById('zoom-out').addEventListener('click', () => {
    state.userZoomed = true;
    applyZoom(state.zoom / 1.15);
  });
  document.getElementById('zoom-fit').addEventListener('click', () => {
    state.userZoomed = false;
    fitZoom();
  });

  // ---- Undo/redo ----
  setupUndoRedoShortcuts();

  // ---- Layout: resizable columns + responsive panel tabs + auto-fit on resize.
  // Set up before initial render so column widths are applied before fitZoom.
  setupLayout();

  // Bounce focus off the preview iframe — once Safari hands focus to the
  // sandboxed iframe, our document-level keydown listener stops seeing Cmd+Z.
  setupPreviewFocusBounce();

  // ---- Initial render ----
  renderSidebar();
  renderEditor();
  refreshPreview(true);
  setTimeout(fitZoom, 100);
});

function setupPreviewFocusBounce() {
  const iframe = document.getElementById('preview-iframe');
  if (!iframe) return;
  iframe.setAttribute('tabindex', '-1');
  iframe.addEventListener('focus', () => {
    setTimeout(() => {
      iframe.blur();
      document.body.focus();
    }, 0);
  });
}

function setupUndoRedoShortcuts() {
  // Safari only delivers Cmd+Z keydown to the page if a focusable element
  // owns focus — otherwise the shortcut goes to the browser menu (Undo Close
  // Tab). Make <body> programmatically focusable and grab focus immediately,
  // so document-level shortcuts work straight after page load.
  document.body.setAttribute('tabindex', '-1');
  document.body.focus();

  // Capture phase + window-level listener so we see the event before any
  // descendant or browser default has a chance to consume it.
  //
  // We intercept Cmd+Z even inside text inputs because Safari's native
  // field-undo doesn't always reliably fire an `input` event — the field
  // value reverts but state.config and the preview drift out of sync.
  // Routing every undo through our snapshot history keeps everything
  // consistent. We restore focus and caret position to the same field after
  // the editor re-renders.
  window.addEventListener('keydown', (e) => {
    if (!(e.metaKey || e.ctrlKey)) return;
    const key = e.key.toLowerCase();
    const isUndo = key === 'z' && !e.shiftKey;
    const isRedo = (key === 'z' && e.shiftKey) || key === 'y';
    if (!isUndo && !isRedo) return;

    e.preventDefault();
    e.stopPropagation();

    // Snapshot focus before re-render so we can restore it on the same field.
    const ae = document.activeElement;
    let focusPath = null, selStart = null, selEnd = null;
    if (ae && ae.dataset && ae.dataset.path && (ae.tagName === 'INPUT' || ae.tagName === 'TEXTAREA')) {
      focusPath = ae.dataset.path;
      try { selStart = ae.selectionStart; selEnd = ae.selectionEnd; } catch {}
    }

    const ok = isUndo ? undo() : redo();
    if (!ok) return;
    clampSelection();
    renderSidebar();
    renderEditor();
    refreshPreview(true);

    if (focusPath) {
      const next = document.querySelector(
        `[data-path="${focusPath.replace(/"/g, '\\"')}"]`
      );
      if (next && (next.tagName === 'INPUT' || next.tagName === 'TEXTAREA')) {
        next.focus();
        try {
          const len = next.value.length;
          const s = selStart != null ? Math.min(selStart, len) : len;
          const en = selEnd != null ? Math.min(selEnd, len) : len;
          next.setSelectionRange(s, en);
        } catch {}
      }
    }
  }, { capture: true });
}

/** After undo/redo the selected section index might point past the new end. */
function clampSelection() {
  if (state.selected.kind !== 'section') return;
  const len = state.config.sections.length;
  if (len === 0) {
    state.selected = { kind: 'header', index: -1 };
  } else if (state.selected.index >= len) {
    state.selected.index = len - 1;
  } else if (state.selected.index < 0) {
    state.selected.index = 0;
  }
}

function setupLocaleToggle() {
  const wrap = document.getElementById('locale-toggle');
  if (!wrap) return;
  paintLocaleToggle();
  wrap.querySelectorAll('button[data-locale]').forEach(btn => {
    btn.addEventListener('click', () => {
      const code = btn.dataset.locale;
      if (code === getLocale()) return;
      setLocale(code);
      paintLocaleToggle();
      // Re-render dynamic UI; preview content is user data, no need to
      // refresh — except we re-render to retranslate the overflow banner.
      renderSidebar();
      renderAddSectionMenu();
      renderEditor();
      updateCurrentProjectName();
      refreshSaveIndicator();
      paintThemeControl();
      refreshPreview(true);
      const menu = document.getElementById('project-menu');
      if (menu?.classList.contains('open')) renderProjectMenu();
    });
  });
}

function paintLocaleToggle() {
  const wrap = document.getElementById('locale-toggle');
  if (!wrap) return;
  const active = getLocale();
  wrap.querySelectorAll('button[data-locale]').forEach(btn => {
    btn.classList.toggle('active', btn.dataset.locale === active);
  });
}

/* ---------- Theme control (toolbar selector + custom palette popover) ---------- */

function setupThemeControl() {
  const sel = document.getElementById('theme-select');
  const btn = document.getElementById('theme-edit-btn');
  const popover = document.getElementById('theme-popover');
  if (!sel) return;

  paintThemeControl();

  sel.addEventListener('change', () => {
    const newId = sel.value;
    if (newId === 'custom' && !state.config.themeCustom) {
      // Seed custom palette from whatever preset was active
      const prevId = state.config.theme || DEFAULT_THEME;
      const seed = (THEMES[prevId] || THEMES[DEFAULT_THEME]).vars;
      state.config.themeCustom = { ...seed };
    }
    state.config.theme = newId;
    refreshPreview();
    paintThemeControl();
    if (newId !== 'custom') popover.hidden = true;
  });

  btn.addEventListener('click', (e) => {
    e.stopPropagation();
    if (popover.hidden) {
      renderThemePopover();
      popover.hidden = false;
    } else {
      popover.hidden = true;
    }
  });

  document.addEventListener('click', (e) => {
    if (popover.hidden) return;
    if (popover.contains(e.target)) return;
    if (e.target === btn || btn.contains(e.target)) return;
    popover.hidden = true;
  });
}

function paintThemeControl() {
  const sel = document.getElementById('theme-select');
  const btn = document.getElementById('theme-edit-btn');
  if (!sel) return;
  const cur = state.config.theme || DEFAULT_THEME;
  sel.innerHTML = listThemeIds().map(id =>
    `<option value="${id}">${escapeAttr(t(`theme.${id}.label`))}</option>`
  ).join('');
  sel.value = cur;
  btn.hidden = cur !== 'custom';
}

function renderThemePopover() {
  const popover = document.getElementById('theme-popover');
  state.config.themeCustom = state.config.themeCustom || {
    ...(THEMES[DEFAULT_THEME].vars)
  };
  const cur = state.config.themeCustom;
  popover.innerHTML = `
    <div class="theme-popover-title">${escapeAttr(t('theme.popover_title'))}</div>
    ${THEME_VAR_LABEL_KEYS.map(([k, labelKey]) => `
      <div class="theme-row">
        <label>${escapeAttr(t(labelKey))}</label>
        <input type="color" data-var="${k}" value="${cur[k] || '#000000'}">
        <code>${k}</code>
      </div>
    `).join('')}
    <div class="theme-popover-actions">
      <button data-action="reset">${escapeAttr(t('theme.reset_palette'))}</button>
    </div>
  `;
  popover.querySelectorAll('input[type="color"]').forEach(inp => {
    inp.addEventListener('input', () => {
      state.config.themeCustom[inp.dataset.var] = inp.value;
      refreshPreview();
    });
  });
  popover.querySelector('button[data-action="reset"]').addEventListener('click', () => {
    state.config.themeCustom = { ...(THEMES[DEFAULT_THEME].vars) };
    renderThemePopover();
    refreshPreview();
  });
}

