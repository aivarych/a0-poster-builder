/**
 * Live preview pane: iframe whose srcdoc is rebuilt from state.config
 * on every edit (debounced). Also handles zoom.
 *
 * Zoom math: A0 is 841 × 1189 mm. CSS transform: scale() doesn't shrink
 * the layout box, so we apply negative margins to compensate for the
 * "lost" space, otherwise scrollbars treat the poster as full-size.
 */

import { state } from './state.js';
import { buildPosterHTML } from './renderer.js';
import { scheduleAutoSave } from './persistence.js';
import { takeSnapshot } from './history.js';
import { t } from './i18n/index.js';

const MM_TO_PX = 3.7795275591;
const POSTER_W_MM = 841;
const POSTER_H_MM = 1189;

let previewDebounceTimer = null;
let metricsListenerAttached = false;

function ensureMetricsListener() {
  if (metricsListenerAttached) return;
  metricsListenerAttached = true;
  window.addEventListener('message', (e) => {
    if (!e.data || e.data.type !== 'a0poster:metrics') return;
    updateOverflowBanner(e.data);
  });
}

function updateOverflowBanner({ overflow, scrollHeight, clientHeight }) {
  const banner = document.getElementById('overflow-banner');
  if (!banner) return;
  if (!overflow) {
    banner.classList.remove('visible');
    return;
  }
  const overflowMm = Math.round((scrollHeight - clientHeight) / MM_TO_PX);
  banner.textContent = t('preview.overflow_banner', { n: overflowMm });
  banner.classList.add('visible');
}

export function refreshPreview(immediate = false) {
  ensureMetricsListener();
  takeSnapshot();
  // buildPosterHTML is async — it lazy-loads the Vega vendor chunk the
  // first time a poster with chart.vegaSpec is rendered. After the chunk
  // is cached the subsequent calls resolve synchronously enough to feel
  // instant. We don't bother de-duplicating in-flight builds: the debounce
  // already collapses bursts of edits.
  const doIt = async () => {
    const html = await buildPosterHTML(state.config);
    document.getElementById('preview-iframe').srcdoc = html;
  };
  clearTimeout(previewDebounceTimer);
  if (immediate) doIt();
  else previewDebounceTimer = setTimeout(doIt, 220);
  scheduleAutoSave();
}

export function applyZoom(z) {
  state.zoom = Math.max(0.08, Math.min(1.0, z));
  document.documentElement.style.setProperty('--preview-scale', state.zoom);
  document.getElementById('zoom-display').textContent = Math.round(state.zoom * 100) + '%';

  const frame = document.getElementById('preview-frame');
  const lostW = POSTER_W_MM * MM_TO_PX * (1 - state.zoom);
  const lostH = POSTER_H_MM * MM_TO_PX * (1 - state.zoom);
  // transform-origin is "top center" — symmetric horizontal, vertical from top
  frame.style.marginLeft = -(lostW / 2) + 'px';
  frame.style.marginRight = -(lostW / 2) + 'px';
  frame.style.marginBottom = -lostH + 'px';
}

export function fitZoom() {
  const wrap = document.getElementById('preview-wrap');
  const padding = 60;
  const availW = wrap.clientWidth - padding;
  const availH = wrap.clientHeight - padding;
  const posterW = POSTER_W_MM * MM_TO_PX;
  const posterH = POSTER_H_MM * MM_TO_PX;
  const z = Math.min(availW / posterW, availH / posterH);
  applyZoom(z);
}
