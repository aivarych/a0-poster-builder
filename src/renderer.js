/**
 * Builds a standalone print-ready HTML document from a poster config.
 *
 * The same output is used both for:
 *   1. Live preview (injected into iframe.srcdoc by src/preview.js)
 *   2. "Export print-ready HTML" download (src/import-export.js)
 *
 * The poster runtime (CSS + JS) lives in /poster-runtime/ as proper files
 * with syntax highlighting and linting, and is inlined here via Vite's
 * `?raw` import suffix at build/dev time.
 *
 * Vega-Lite vendor (vega-core + vega-lite) is inlined into the EXPORTED
 * HTML when at least one chart is in builder/spec mode (so exports work
 * offline). On the BUILDER side the same sources are loaded lazily as a
 * separate chunk — the builder bundle stays small for posters with only
 * SVG-mode charts.
 *
 * Chart preset buildSpec() functions are serialised to JS via
 * Function.toString() and injected into a `window.__PRESETS__` block. The
 * runtime looks them up by chart.type. This keeps preset definitions in one
 * place (src/chart-presets/) while still letting the exported HTML render
 * builder-mode charts standalone.
 *
 * We deliberately skip vega-embed and call vega.View.toSVG() ourselves —
 * vega-embed wraps the chart in its own DOM and injects global CSS that
 * collides with the poster's flex layout.
 *
 * Vendor copies live in poster-runtime/vendor/ and are checked in. They
 * mirror node_modules/{vega/build/vega-core.min, vega-lite/build/vega-lite.min}.js
 * — re-copy after upgrading the deps.
 */

import posterCss from '../poster-runtime/poster.css?raw';
import posterRuntime from '../poster-runtime/runtime.js?raw';
import { escapeHtml } from './utils.js';
import { buildThemeCSS } from './themes/index.js';
import { PRESETS, defaultLabelsFor } from './chart-presets/index.js';

function needsVega(config) {
  for (const sec of config?.sections || []) {
    const charts = [];
    if (sec?.chart) charts.push(sec.chart);
    if (Array.isArray(sec?.charts)) charts.push(...sec.charts);
    for (const c of charts) {
      if (!c) continue;
      const mode = c.mode || (c.svg ? 'svg' : 'builder');
      if (mode !== 'svg') return true;
    }
  }
  return false;
}

let vendorPromise = null;
function loadVegaVendor() {
  if (!vendorPromise) {
    vendorPromise = Promise.all([
      import('../poster-runtime/vendor/vega.min.js?raw'),
      import('../poster-runtime/vendor/vega-lite.min.js?raw'),
    ]).then(([v, vl]) => ({ vega: v.default, vegaLite: vl.default }));
  }
  return vendorPromise;
}

/**
 * Inline preset buildSpec functions + their default column labels into the
 * exported HTML. The runtime looks up `window.__PRESETS__[chart.type]` to
 * get { defaults, build } and calls build(rows, theme, labels) where labels
 * = { ...defaults, ...chart.labels }.
 *
 * Function.toString() returns the source; ESM bundlers preserve it. We use
 * `function (...) { ... }` form (NOT method shorthand) in each preset so
 * the source is a valid object-literal value.
 */
function buildPresetsScript() {
  const entries = PRESETS.map(p => {
    const defaults = JSON.stringify(defaultLabelsFor(p));
    return `${JSON.stringify(p.id)}: { defaults: ${defaults}, build: ${p.buildSpec.toString()} }`;
  });
  return `<script>window.__PRESETS__={${entries.join(',\n')}};<\/script>`;
}

export async function buildPosterHTML(config) {
  const title = escapeHtml(config?.header?.title || 'A0 Poster');
  // JSON inside <script> tags must escape any literal </script sequences
  const safeJson = JSON.stringify(config, null, 2).replace(/<\/script/g, '<\\/script');
  const themeCss = buildThemeCSS(config);

  let vegaBlock = '';
  let presetsBlock = '';
  if (needsVega(config)) {
    const v = await loadVegaVendor();
    vegaBlock = `<script>${v.vega}<\/script>\n<script>${v.vegaLite}<\/script>`;
    presetsBlock = buildPresetsScript();
  }

  return `<!DOCTYPE html>
<html lang="en">
<head>
<meta charset="UTF-8">
<title>${title}</title>
<style>
${posterCss}
${themeCss}
</style>
</head>
<body>
<div class="poster" id="poster-root"></div>
<script type="application/json" id="poster-config">
${safeJson}
<\/script>
${vegaBlock}
${presetsBlock}
<script>
${posterRuntime}
<\/script>
</body>
</html>`;
}
