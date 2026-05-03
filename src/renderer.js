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
 * HTML when the config uses chart.vegaSpec (so exports work offline). On
 * the BUILDER side the same sources are loaded lazily as a separate chunk
 * — the builder bundle stays small for posters without Vega-Lite charts.
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

function hasVegaSpec(config) {
  for (const sec of config?.sections || []) {
    if (sec?.chart?.vegaSpec) return true;
    if (Array.isArray(sec?.charts)) {
      for (const c of sec.charts) if (c?.vegaSpec) return true;
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

export async function buildPosterHTML(config) {
  const title = escapeHtml(config?.header?.title || 'A0 Poster');
  // JSON inside <script> tags must escape any literal </script sequences
  const safeJson = JSON.stringify(config, null, 2).replace(/<\/script/g, '<\\/script');
  const themeCss = buildThemeCSS(config);

  let vegaBlock = '';
  if (hasVegaSpec(config)) {
    const v = await loadVegaVendor();
    vegaBlock = `<script>${v.vega}<\/script>\n<script>${v.vegaLite}<\/script>`;
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
<script>
${posterRuntime}
<\/script>
</body>
</html>`;
}
