/**
 * Project persistence — projects live in localStorage as a single bundle.
 *
 * Schema:
 *   localStorage[LS_PROJECTS] = JSON of { [id]: { id, name, updatedAt, config, userNamed } }
 *   localStorage[LS_CURRENT]  = id of the project currently being edited
 *   localStorage[LS_LOCALE]   = 'en' | 'ru'
 *
 * Auto-save: every refreshPreview() call (i.e. every edit) schedules a
 * debounced save. If localStorage throws (private mode, full quota, etc.)
 * we surface the error in the save indicator and via toast.
 *
 * Bundle export/import is a separate JSON shape so users can back up
 * everything to one file and restore on another machine.
 *
 * All UI strings go through t(). Cycle persistence ↔ i18n is safe: i18n
 * only calls our load/save-locale helpers from inside its own functions.
 */

import { state } from './state.js';
import { DEFAULT_CONFIG } from './default-config.js';
import { escapeHtml, downloadFile, showToast } from './utils.js';
import { renderSidebar } from './sidebar.js';
import { renderEditor } from './editor.js';
import { refreshPreview } from './preview.js';
import { resetHistory } from './history.js';
import { migrateConfig } from './chart-migration.js';
import { t } from './i18n/index.js';

const LS_PROJECTS = 'a0_poster_projects_v1';
const LS_CURRENT  = 'a0_poster_current_id_v1';
const LS_LOCALE   = 'a0_poster_locale_v1';

let autoSaveTimer = null;
let storageAvailable = true;
/** Last save timestamp for the current project, used by refreshSaveIndicator on locale change. */
let lastSavedAt = null;

function safeLS(fn, fallback) {
  try { return fn(); }
  catch (e) { storageAvailable = false; return fallback; }
}

export function loadProjectsFromStorage() {
  const raw = safeLS(() => localStorage.getItem(LS_PROJECTS), null);
  if (!raw) return {};
  let parsed;
  try { parsed = JSON.parse(raw) || {}; } catch { return {}; }
  for (const id of Object.keys(parsed)) {
    if (parsed[id] && parsed[id].config) migrateConfig(parsed[id].config);
  }
  return parsed;
}

export function saveProjectsToStorage(projects) {
  return safeLS(() => {
    localStorage.setItem(LS_PROJECTS, JSON.stringify(projects));
    return true;
  }, false);
}

export function loadCurrentIdFromStorage() {
  return safeLS(() => localStorage.getItem(LS_CURRENT), null);
}

export function saveCurrentIdToStorage(id) {
  safeLS(() => localStorage.setItem(LS_CURRENT, id || ''), null);
}

export function loadLocaleFromStorage() {
  return safeLS(() => localStorage.getItem(LS_LOCALE), null);
}

export function saveLocaleToStorage(code) {
  safeLS(() => localStorage.setItem(LS_LOCALE, code || ''), null);
}

export function isStorageAvailable() {
  return storageAvailable;
}

function makeProjectId() {
  return 'p_' + Date.now().toString(36) + '_' + Math.random().toString(36).slice(2, 7);
}

export function ensureCurrentProject() {
  if (!state.currentProjectId || !state.projects[state.currentProjectId]) {
    const ids = Object.keys(state.projects).sort(
      (a, b) => state.projects[b].updatedAt - state.projects[a].updatedAt
    );
    if (ids.length) {
      state.currentProjectId = ids[0];
    } else {
      const id = makeProjectId();
      state.projects[id] = {
        id, name: t('sidebar.untitled_poster'),
        updatedAt: Date.now(),
        config: structuredClone(state.config)
      };
      state.currentProjectId = id;
      saveProjectsToStorage(state.projects);
      saveCurrentIdToStorage(id);
    }
  }
}

/* ---------- Save indicator ---------- */

function setSaveStatus(status, text) {
  const ind = document.getElementById('save-indicator');
  if (!ind) return;
  ind.classList.remove('saving', 'saved', 'error');
  if (status) ind.classList.add(status);
  ind.querySelector('.save-text').textContent = text || '';
}

/**
 * Re-render the save indicator's text in the current locale. Called by main.js
 * after setLocale() so the relative-time label flips to RU/EN immediately.
 */
export function refreshSaveIndicator() {
  const ind = document.getElementById('save-indicator');
  if (!ind) return;
  if (!storageAvailable) {
    setSaveStatus('error', t('project.indicator.storage_unavailable'));
    return;
  }
  if (ind.classList.contains('saving')) {
    setSaveStatus('saving', t('project.indicator.saving'));
    return;
  }
  if (lastSavedAt) {
    const txt = ind.classList.contains('saved')
      ? t('project.indicator.saved')
      : formatRelativeTime(lastSavedAt);
    setSaveStatus(ind.classList.contains('saved') ? 'saved' : '', txt);
  } else {
    setSaveStatus(ind.classList.contains('saved') ? 'saved' : '', t('project.indicator.loaded'));
  }
}

export function scheduleAutoSave() {
  if (!storageAvailable) {
    setSaveStatus('error', t('project.indicator.storage_unavailable'));
    return;
  }
  setSaveStatus('saving', t('project.indicator.saving'));
  clearTimeout(autoSaveTimer);
  autoSaveTimer = setTimeout(() => {
    const id = state.currentProjectId;
    if (!id || !state.projects[id]) return;
    state.projects[id].config = structuredClone(state.config);
    state.projects[id].updatedAt = Date.now();
    if (!state.projects[id].userNamed) {
      const title = state.config.header?.title?.trim();
      if (title) state.projects[id].name = title.slice(0, 60);
    }
    const ok = saveProjectsToStorage(state.projects);
    if (ok) {
      lastSavedAt = state.projects[id].updatedAt;
      setSaveStatus('saved', t('project.indicator.saved'));
      updateCurrentProjectName();
      setTimeout(() => {
        const indicator = document.getElementById('save-indicator');
        if (indicator?.classList.contains('saved')) {
          setSaveStatus('', formatRelativeTime(lastSavedAt));
        }
      }, 1500);
    } else {
      setSaveStatus('error', t('project.indicator.save_failed'));
      showToast(t('toast.save_failed'), 'error');
    }
  }, 700);
}

function formatRelativeTime(ts) {
  const diff = Math.floor((Date.now() - ts) / 1000);
  if (diff < 5)    return t('time.just_saved');
  if (diff < 60)   return t('time.s_ago', { n: diff });
  if (diff < 3600) return t('time.m_ago', { n: Math.floor(diff / 60) });
  return t('time.h_ago', { n: Math.floor(diff / 3600) });
}

export function updateCurrentProjectName() {
  const p = state.projects[state.currentProjectId];
  const el = document.getElementById('current-project-name');
  if (el) el.textContent = p ? p.name : t('toolbar.untitled');
}

/* ---------- Project lifecycle ---------- */

export function newProject() {
  const id = makeProjectId();
  state.projects[id] = {
    id, name: t('sidebar.untitled_poster'),
    updatedAt: Date.now(),
    config: structuredClone(DEFAULT_CONFIG),
    userNamed: false
  };
  state.currentProjectId = id;
  state.config = migrateConfig(structuredClone(DEFAULT_CONFIG));
  state.selected = { kind: 'header', index: -1 };
  resetHistory();
  saveProjectsToStorage(state.projects);
  saveCurrentIdToStorage(id);
  renderSidebar();
  renderEditor();
  refreshPreview(true);
  updateCurrentProjectName();
  closeProjectMenu();
  showToast(t('toast.new_project'), 'success');
}

export function switchProject(id) {
  if (!state.projects[id]) return;
  // Flush current edits to the outgoing project first
  if (state.currentProjectId && state.projects[state.currentProjectId]) {
    state.projects[state.currentProjectId].config = structuredClone(state.config);
    state.projects[state.currentProjectId].updatedAt = Date.now();
    saveProjectsToStorage(state.projects);
  }
  state.currentProjectId = id;
  state.config = migrateConfig(structuredClone(state.projects[id].config));
  state.selected = { kind: 'header', index: -1 };
  resetHistory();
  saveCurrentIdToStorage(id);
  renderSidebar();
  renderEditor();
  refreshPreview(true);
  updateCurrentProjectName();
  closeProjectMenu();
  setSaveStatus('saved', t('project.indicator.loaded'));
}

export function renameCurrentProject() {
  const p = state.projects[state.currentProjectId];
  if (!p) return;
  const newName = prompt(t('prompt.rename_project'), p.name);
  if (!newName || !newName.trim()) return;
  p.name = newName.trim().slice(0, 80);
  p.userNamed = true;
  saveProjectsToStorage(state.projects);
  updateCurrentProjectName();
  renderProjectMenu();
  showToast(t('toast.renamed'), 'success');
}

export function deleteProject(id) {
  const p = state.projects[id];
  if (!p) return;
  if (!confirm(t('confirm.delete_project', { name: p.name }))) return;
  delete state.projects[id];
  saveProjectsToStorage(state.projects);
  if (state.currentProjectId === id) {
    state.currentProjectId = null;
    ensureCurrentProject();
    state.config = migrateConfig(structuredClone(state.projects[state.currentProjectId].config));
    state.selected = { kind: 'header', index: -1 };
    resetHistory();
    saveCurrentIdToStorage(state.currentProjectId);
    renderSidebar();
    renderEditor();
    refreshPreview(true);
    updateCurrentProjectName();
  }
  renderProjectMenu();
  showToast(t('toast.deleted'), 'success');
}

/* ---------- Bundle export / import ---------- */

export function exportAllProjects() {
  if (state.currentProjectId && state.projects[state.currentProjectId]) {
    state.projects[state.currentProjectId].config = structuredClone(state.config);
    state.projects[state.currentProjectId].updatedAt = Date.now();
  }
  const bundle = {
    _format: 'a0-poster-bundle',
    _version: 1,
    _exportedAt: new Date().toISOString(),
    projects: Object.values(state.projects)
  };
  const stamp = new Date().toISOString().slice(0, 10);
  downloadFile(`a0-poster-bundle-${stamp}.json`, JSON.stringify(bundle, null, 2), 'application/json');
  closeProjectMenu();
  showToast(t('toast.bundle_exported', { n: Object.keys(state.projects).length }), 'success');
}

export function importBundle() {
  const input = document.createElement('input');
  input.type = 'file';
  input.accept = '.json,application/json';
  input.onchange = (e) => {
    const file = e.target.files[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = () => {
      try {
        const data = JSON.parse(reader.result);
        if (data._format !== 'a0-poster-bundle' || !Array.isArray(data.projects)) {
          throw new Error(t('toast.bundle_invalid'));
        }
        let added = 0;
        data.projects.forEach(p => {
          if (!p.id || !p.config) return;
          const newId = state.projects[p.id] ? makeProjectId() : p.id;
          state.projects[newId] = {
            id: newId,
            name: p.name || t('project.imported_fallback'),
            updatedAt: p.updatedAt || Date.now(),
            config: migrateConfig(p.config),
            userNamed: !!p.userNamed
          };
          added++;
        });
        saveProjectsToStorage(state.projects);
        renderProjectMenu();
        showToast(t('toast.bundle_imported', { n: added }), 'success');
      } catch (err) {
        showToast(t('toast.import_failed', { msg: err.message }), 'error');
      }
    };
    reader.readAsText(file);
  };
  input.click();
  closeProjectMenu();
}

/* ---------- Project menu UI ---------- */

export function renderProjectMenu() {
  const menu = document.getElementById('project-menu');
  if (!menu) return;
  const sorted = Object.values(state.projects).sort((a, b) => b.updatedAt - a.updatedAt);
  const items = sorted.map(p => {
    const isActive = p.id === state.currentProjectId;
    return `
      <div class="project-menu-item ${isActive ? 'active' : ''}" data-id="${p.id}">
        <div class="item-name">
          <span class="item-title">${escapeHtml(p.name)}</span>
          <span class="item-meta">${formatRelativeTime(p.updatedAt)} · ${(JSON.stringify(p.config).length / 1024).toFixed(1)} KB</span>
        </div>
        <div class="item-actions">
          <button data-action="delete" data-id="${p.id}" class="danger" title="${escapeHtml(t('sidebar.delete'))}">✕</button>
        </div>
      </div>
    `;
  }).join('');

  const storageWarn = !storageAvailable
    ? `<div class="project-menu-section" style="color: var(--danger);">${escapeHtml(t('project.menu.storage_warn'))}</div>`
    : '';

  const emptyMsg = `<div class="project-menu-section" style="color: var(--text-2);">${escapeHtml(t('project.menu.empty'))}</div>`;

  menu.innerHTML = `
    ${storageWarn}
    <div class="project-menu-section">${escapeHtml(t('project.menu.list_title', { n: sorted.length }))}</div>
    ${items || emptyMsg}
    <div class="project-menu-divider"></div>
    <button class="project-menu-action" data-act="new">${escapeHtml(t('project.menu.new'))}</button>
    <button class="project-menu-action" data-act="rename">${escapeHtml(t('project.menu.rename'))}</button>
    <div class="project-menu-divider"></div>
    <button class="project-menu-action" data-act="export-bundle">${escapeHtml(t('project.menu.export_bundle'))}</button>
    <button class="project-menu-action" data-act="import-bundle">${escapeHtml(t('project.menu.import_bundle'))}</button>
  `;

  menu.querySelectorAll('.project-menu-item').forEach(row => {
    row.addEventListener('click', (e) => {
      const delBtn = e.target.closest('button[data-action="delete"]');
      if (delBtn) { e.stopPropagation(); deleteProject(delBtn.dataset.id); return; }
      switchProject(row.dataset.id);
    });
  });
  menu.querySelectorAll('.project-menu-action').forEach(btn => {
    btn.addEventListener('click', () => {
      const act = btn.dataset.act;
      if (act === 'new') newProject();
      else if (act === 'rename') renameCurrentProject();
      else if (act === 'export-bundle') exportAllProjects();
      else if (act === 'import-bundle') importBundle();
    });
  });
}

export function toggleProjectMenu() {
  const menu = document.getElementById('project-menu');
  if (menu.classList.contains('open')) closeProjectMenu();
  else { renderProjectMenu(); menu.classList.add('open'); }
}

export function closeProjectMenu() {
  document.getElementById('project-menu')?.classList.remove('open');
}
