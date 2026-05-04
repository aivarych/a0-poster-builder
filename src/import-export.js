/**
 * Single-config JSON import/export and "Export print-ready HTML".
 *
 * Bundle (multi-project) export/import lives in src/persistence.js.
 */

import { state } from './state.js';
import { DEFAULT_CONFIG } from './default-config.js';
import { downloadFile, showToast, slugify } from './utils.js';
import { buildPosterHTML } from './renderer.js';
import { renderSidebar } from './sidebar.js';
import { renderEditor } from './editor.js';
import { refreshPreview } from './preview.js';
import { resetHistory } from './history.js';
import { migrateConfig } from './chart-migration.js';
import { t } from './i18n/index.js';

export async function exportPrintReadyHTML() {
  const html = await buildPosterHTML(state.config);
  const filename = slugify(state.config.header?.title || 'poster') + '.html';
  downloadFile(filename, html, 'text/html');
  showToast(t('toast.html_saved'), 'success');
}

export function exportJSON() {
  const json = JSON.stringify(state.config, null, 2);
  const filename = slugify(state.config.header?.title || 'poster') + '.json';
  downloadFile(filename, json, 'application/json');
  showToast(t('toast.json_saved'), 'success');
}

export function importJSON() {
  document.getElementById('import-file').click();
}

export function onImportFile(e) {
  const file = e.target.files[0];
  if (!file) return;
  const reader = new FileReader();
  reader.onload = () => {
    try {
      const cfg = JSON.parse(reader.result);
      if (!cfg.header || !cfg.sections || !cfg.footer) {
        throw new Error(t('toast.json_invalid_keys'));
      }
      state.config = migrateConfig(cfg);
      state.selected = { kind: 'header', index: -1 };
      resetHistory();
      renderSidebar();
      renderEditor();
      refreshPreview(true);
      showToast(t('toast.json_imported'), 'success');
    } catch (err) {
      showToast(t('toast.import_failed', { msg: err.message }), 'error');
    }
    e.target.value = '';
  };
  reader.readAsText(file);
}

export function resetConfig() {
  if (!confirm(t('confirm.reset'))) return;
  state.config = migrateConfig(structuredClone(DEFAULT_CONFIG));
  state.selected = { kind: 'header', index: -1 };
  resetHistory();
  renderSidebar();
  renderEditor();
  refreshPreview(true);
  showToast(t('toast.reset_done'), 'success');
}
