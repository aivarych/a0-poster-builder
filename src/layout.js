/**
 * Workspace layout: resizable columns + responsive panel tabs + auto-fit on resize.
 *
 * Layout prefs are global (not per-project), persisted in localStorage under
 * 'a0pb:layout': { sidebarW, editorW, activePanel }.
 *
 * Below NARROW_BREAKPOINT the three panels collapse to a single visible panel
 * picked via tab buttons. Above it, two drag handles between panels resize
 * --sidebar-w / --editor-w CSS variables (consumed by .workspace grid).
 *
 * A ResizeObserver on #preview-wrap triggers fitZoom() whenever the preview
 * area changes size, unless state.userZoomed is true (user has manually zoomed
 * in/out and we don't want to override their choice).
 */

import { state } from './state.js';
import { fitZoom } from './preview.js';

const LS_KEY = 'a0pb:layout';
const SIDEBAR_MIN = 180, SIDEBAR_MAX = 480, SIDEBAR_DEFAULT = 240;
const EDITOR_MIN = 280, EDITOR_MAX = 800, EDITOR_DEFAULT = 480;
const PREVIEW_MIN = 240;
const HANDLE_SPACE = 10; // 2 × 5px resizers
const NARROW_BREAKPOINT = 900;

const prefs = {
  sidebarW: SIDEBAR_DEFAULT,
  editorW: EDITOR_DEFAULT,
  activePanel: 'preview'
};

function loadPrefs() {
  try {
    const raw = localStorage.getItem(LS_KEY);
    if (raw) Object.assign(prefs, JSON.parse(raw));
  } catch { /* localStorage unavailable — fall back to defaults */ }
}

function savePrefs() {
  try { localStorage.setItem(LS_KEY, JSON.stringify(prefs)); }
  catch { /* ignore */ }
}

function applyColumnSizes() {
  const root = document.documentElement;
  root.style.setProperty('--sidebar-w', prefs.sidebarW + 'px');
  root.style.setProperty('--editor-w', prefs.editorW + 'px');
}

/** Make sure (sidebar + editor + preview-min + handles) fits inside workspace. */
function clampToWorkspace() {
  prefs.sidebarW = Math.max(SIDEBAR_MIN, Math.min(SIDEBAR_MAX, prefs.sidebarW));
  prefs.editorW = Math.max(EDITOR_MIN, Math.min(EDITOR_MAX, prefs.editorW));

  const ws = document.querySelector('.workspace');
  const wsW = ws?.clientWidth || window.innerWidth;
  if (wsW < SIDEBAR_MIN + EDITOR_MIN + PREVIEW_MIN + HANDLE_SPACE) {
    // Narrow mode handles layout differently — don't trim.
    return;
  }
  const overflow = (prefs.sidebarW + prefs.editorW + HANDLE_SPACE + PREVIEW_MIN) - wsW;
  if (overflow > 0) {
    const editorTrim = Math.min(overflow, prefs.editorW - EDITOR_MIN);
    prefs.editorW -= editorTrim;
    const remaining = overflow - editorTrim;
    if (remaining > 0) {
      prefs.sidebarW = Math.max(SIDEBAR_MIN, prefs.sidebarW - remaining);
    }
  }
}

function setupResizer(el, target) {
  let startX = 0;
  let startW = 0;
  let wsW = 0;
  let activePointerId = null;

  const onPointerMove = (e) => {
    const dx = e.clientX - startX;
    let w = startW + dx;
    if (target === 'sidebar') {
      w = Math.max(SIDEBAR_MIN, Math.min(SIDEBAR_MAX, w));
      const maxByPreview = wsW - prefs.editorW - PREVIEW_MIN - HANDLE_SPACE;
      w = Math.min(w, maxByPreview);
      prefs.sidebarW = Math.max(SIDEBAR_MIN, w);
    } else {
      w = Math.max(EDITOR_MIN, Math.min(EDITOR_MAX, w));
      const maxByPreview = wsW - prefs.sidebarW - PREVIEW_MIN - HANDLE_SPACE;
      w = Math.min(w, maxByPreview);
      prefs.editorW = Math.max(EDITOR_MIN, w);
    }
    applyColumnSizes();
  };

  const onPointerUp = (e) => {
    document.removeEventListener('pointermove', onPointerMove);
    document.removeEventListener('pointerup', onPointerUp);
    document.body.classList.remove('is-resizing');
    el.classList.remove('dragging');
    if (activePointerId !== null) {
      try { el.releasePointerCapture(activePointerId); } catch {}
      activePointerId = null;
    }
    savePrefs();
  };

  el.addEventListener('pointerdown', (e) => {
    if (e.button !== 0) return;
    e.preventDefault();
    activePointerId = e.pointerId;
    try { el.setPointerCapture(e.pointerId); } catch {}
    startX = e.clientX;
    wsW = document.querySelector('.workspace').clientWidth;
    startW = target === 'sidebar' ? prefs.sidebarW : prefs.editorW;
    document.body.classList.add('is-resizing');
    el.classList.add('dragging');
    document.addEventListener('pointermove', onPointerMove);
    document.addEventListener('pointerup', onPointerUp);
  });

  el.addEventListener('dblclick', () => {
    if (target === 'sidebar') prefs.sidebarW = SIDEBAR_DEFAULT;
    else prefs.editorW = EDITOR_DEFAULT;
    clampToWorkspace();
    applyColumnSizes();
    savePrefs();
  });

  el.addEventListener('keydown', (e) => {
    const step = e.shiftKey ? 40 : 10;
    if (e.key !== 'ArrowLeft' && e.key !== 'ArrowRight') return;
    e.preventDefault();
    const dir = e.key === 'ArrowLeft' ? -1 : 1;
    if (target === 'sidebar') {
      prefs.sidebarW = Math.max(SIDEBAR_MIN, Math.min(SIDEBAR_MAX, prefs.sidebarW + dir * step));
    } else {
      prefs.editorW = Math.max(EDITOR_MIN, Math.min(EDITOR_MAX, prefs.editorW + dir * step));
    }
    clampToWorkspace();
    applyColumnSizes();
    savePrefs();
  });
}

function applyActivePanel() {
  const map = {
    sidebar: document.getElementById('panel-sidebar'),
    editor: document.getElementById('panel-editor'),
    preview: document.getElementById('preview-wrap')
  };
  for (const [k, el] of Object.entries(map)) {
    el?.classList.toggle('is-active', k === prefs.activePanel);
  }
  document.querySelectorAll('.workspace-tabs button[data-tab]').forEach(b => {
    b.classList.toggle('active', b.dataset.tab === prefs.activePanel);
  });
}

function setupTabs() {
  const wrap = document.getElementById('workspace-tabs');
  if (!wrap) return;
  wrap.addEventListener('click', (e) => {
    const btn = e.target.closest('button[data-tab]');
    if (!btn) return;
    prefs.activePanel = btn.dataset.tab;
    savePrefs();
    applyActivePanel();
    if (prefs.activePanel === 'preview' && !state.userZoomed) {
      // Wait for the panel to be visible and laid out before measuring.
      requestAnimationFrame(() => fitZoom());
    }
  });
}

function setupPreviewResizeObserver() {
  const wrap = document.getElementById('preview-wrap');
  if (!wrap || typeof ResizeObserver === 'undefined') return;
  let timer = null;
  const ro = new ResizeObserver(() => {
    clearTimeout(timer);
    timer = setTimeout(() => {
      if (state.userZoomed) return;
      if (wrap.clientWidth < 50 || wrap.clientHeight < 50) return;
      fitZoom();
    }, 60);
  });
  ro.observe(wrap);
}

export function setupLayout() {
  loadPrefs();
  clampToWorkspace();
  applyColumnSizes();
  applyActivePanel();
  document.querySelectorAll('.resizer[data-resize]').forEach(el => {
    setupResizer(el, el.dataset.resize);
  });
  setupTabs();
  setupPreviewResizeObserver();

  window.addEventListener('resize', () => {
    clampToWorkspace();
    applyColumnSizes();
  });
}
