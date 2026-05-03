/**
 * Left sidebar — structure outline.
 * - Renders Header / Sections / Footer entries
 * - Click to select, hover for ▲▼✕ controls
 * - "+ Add section" button with type picker menu
 */

import { state } from './state.js';
import {
  SECTION_TYPES, SECTION_TEMPLATES,
  getSectionLabel, getSectionDesc
} from './section-types.js';
import { escapeHtml, escapeAttr, showToast } from './utils.js';
import { refreshPreview } from './preview.js';
import { renderEditor } from './editor.js';
import { t } from './i18n/index.js';

export function renderSidebar() {
  const list = document.getElementById('section-list');
  const rows = [];

  rows.push(makeSectionRow({
    kind: 'header',
    icon: t('sidebar.header_icon'),
    title: state.config.header?.title || t('sidebar.untitled_poster'),
    typeLabel: 'header',
    fixed: true
  }));

  rows.push('<div class="section-divider"></div>');

  (state.config.sections || []).forEach((sec, idx) => {
    rows.push(makeSectionRow({
      kind: 'section',
      index: idx,
      icon: String(idx + 1),
      title: getSectionDisplayTitle(sec),
      typeLabel: sec.type,
      canMove: true
    }));
  });

  rows.push('<div class="section-divider"></div>');

  rows.push(makeSectionRow({
    kind: 'footer',
    icon: t('sidebar.footer_icon'),
    title: t('sidebar.footer_label'),
    typeLabel: 'footer',
    fixed: true
  }));

  list.innerHTML = rows.join('');
  attachSidebarHandlers();
}

function getSectionDisplayTitle(sec) {
  if (!sec) return t('sidebar.empty_section');
  if (sec.title) return sec.title;
  if (sec.chart && sec.chart.title) return sec.chart.title;
  if (sec.findings && sec.findings.title) return sec.findings.title;
  if (sec.columns && sec.columns[0] && sec.columns[0].title) return sec.columns[0].title;
  return getSectionLabel(sec.type) || sec.type;
}

function makeSectionRow({ kind, index = -1, icon, title, typeLabel, fixed = false, canMove = false }) {
  const isActive = state.selected.kind === kind && state.selected.index === index;
  const cls = ['section-row'];
  if (isActive) cls.push('active');
  if (fixed) cls.push('fixed');
  let controls = '';
  if (canMove) {
    controls = `
      <div class="section-row-controls">
        <button data-action="duplicate" title="${escapeAttr(t('sidebar.duplicate'))}">⎘</button>
        <button data-action="delete" class="danger" title="${escapeAttr(t('sidebar.delete'))}">✕</button>
      </div>`;
  }
  const dragAttr = canMove ? 'draggable="true"' : '';
  return `
    <div class="${cls.join(' ')}" data-kind="${kind}" data-index="${index}" ${dragAttr}>
      <div class="section-row-icon">${escapeHtml(icon)}</div>
      <div class="section-row-label">
        <span class="section-row-title">${escapeHtml(title)}</span>
        <span class="section-row-type">${typeLabel}</span>
      </div>
      ${controls}
    </div>
  `;
}

let dragSourceIndex = null;

function attachSidebarHandlers() {
  document.querySelectorAll('.section-row').forEach(row => {
    row.addEventListener('click', (e) => {
      const ctrl = e.target.closest('button[data-action]');
      const kind = row.dataset.kind;
      const index = Number(row.dataset.index);
      if (ctrl) {
        e.stopPropagation();
        const action = ctrl.dataset.action;
        if (action === 'duplicate') duplicateSection(index);
        else if (action === 'delete') deleteSection(index);
        return;
      }
      selectItem(kind, index);
    });
  });

  document.querySelectorAll('.section-row[draggable="true"]').forEach(row => {
    row.addEventListener('dragstart', onSectionDragStart);
    row.addEventListener('dragend', onSectionDragEnd);
  });
  document.querySelectorAll('.section-row[data-kind="section"]').forEach(row => {
    row.addEventListener('dragover',  onSectionDragOver);
    row.addEventListener('dragleave', onSectionDragLeave);
    row.addEventListener('drop',      onSectionDrop);
  });
}

function onSectionDragStart(e) {
  dragSourceIndex = Number(e.currentTarget.dataset.index);
  e.dataTransfer.effectAllowed = 'move';
  // Some browsers require dataTransfer.setData() for drag to actually start.
  e.dataTransfer.setData('text/plain', String(dragSourceIndex));
  e.currentTarget.classList.add('dragging');
}

function onSectionDragEnd(e) {
  e.currentTarget.classList.remove('dragging');
  document.querySelectorAll('.drag-over-above, .drag-over-below').forEach(r => {
    r.classList.remove('drag-over-above', 'drag-over-below');
  });
  dragSourceIndex = null;
}

function onSectionDragOver(e) {
  if (dragSourceIndex == null) return;
  const target = e.currentTarget;
  const idx = Number(target.dataset.index);
  if (idx === dragSourceIndex) return;
  e.preventDefault();
  e.dataTransfer.dropEffect = 'move';
  const rect = target.getBoundingClientRect();
  const above = (e.clientY - rect.top) < rect.height / 2;
  target.classList.toggle('drag-over-above', above);
  target.classList.toggle('drag-over-below', !above);
}

function onSectionDragLeave(e) {
  e.currentTarget.classList.remove('drag-over-above', 'drag-over-below');
}

function onSectionDrop(e) {
  e.preventDefault();
  if (dragSourceIndex == null) return;
  const target = e.currentTarget;
  const targetIndex = Number(target.dataset.index);
  const rect = target.getBoundingClientRect();
  const above = (e.clientY - rect.top) < rect.height / 2;

  // Compute insertion index BEFORE we splice — because removing src shifts
  // everything after it down by one.
  let insertIdx = above ? targetIndex : targetIndex + 1;
  if (insertIdx > dragSourceIndex) insertIdx -= 1;
  if (insertIdx === dragSourceIndex) {
    target.classList.remove('drag-over-above', 'drag-over-below');
    return;
  }

  const sections = state.config.sections;
  const [moved] = sections.splice(dragSourceIndex, 1);
  sections.splice(insertIdx, 0, moved);

  // Keep current selection pointing at the same logical item after reorder.
  if (state.selected.kind === 'section') {
    const sel = state.selected.index;
    if (sel === dragSourceIndex) state.selected.index = insertIdx;
    else if (dragSourceIndex < sel && insertIdx >= sel) state.selected.index -= 1;
    else if (dragSourceIndex > sel && insertIdx <= sel) state.selected.index += 1;
  }

  target.classList.remove('drag-over-above', 'drag-over-below');
  dragSourceIndex = null;

  renderSidebar();
  renderEditor();
  refreshPreview(true);
}

export function selectItem(kind, index) {
  state.selected = { kind, index };
  renderSidebar();
  renderEditor();
}

function duplicateSection(idx) {
  const orig = state.config.sections[idx];
  if (!orig) return;
  state.config.sections.splice(idx + 1, 0, structuredClone(orig));
  state.selected = { kind: 'section', index: idx + 1 };
  renderSidebar();
  renderEditor();
  refreshPreview(true);
}

function deleteSection(idx) {
  if (!confirm(t('confirm.delete_section'))) return;
  state.config.sections.splice(idx, 1);
  if (state.selected.kind === 'section') {
    if (state.selected.index >= state.config.sections.length) {
      state.selected.index = Math.max(0, state.config.sections.length - 1);
    }
    if (state.config.sections.length === 0) {
      state.selected = { kind: 'header', index: -1 };
    }
  }
  renderSidebar();
  renderEditor();
  refreshPreview(true);
}

/* ---------- Add section menu ---------- */

export function renderAddSectionMenu() {
  const menu = document.getElementById('add-section-menu');
  menu.innerHTML = SECTION_TYPES.map(type => `
    <button data-type="${type}">
      <span>${escapeHtml(getSectionLabel(type))}</span>
      <span class="menu-type">${type} · ${escapeHtml(getSectionDesc(type))}</span>
    </button>
  `).join('');
  menu.querySelectorAll('button').forEach(b => {
    b.addEventListener('click', () => {
      addSection(b.dataset.type);
      menu.classList.remove('open');
    });
  });
}

function addSection(type) {
  const tmpl = SECTION_TEMPLATES[type];
  if (!tmpl) return;
  state.config.sections.push(tmpl());
  state.selected = { kind: 'section', index: state.config.sections.length - 1 };
  renderSidebar();
  renderEditor();
  refreshPreview(true);
  showToast(t('toast.added_section', { label: getSectionLabel(type) }), 'success');
}
