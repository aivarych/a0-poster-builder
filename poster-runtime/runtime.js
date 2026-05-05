// Poster rendering runtime — embedded into exported HTML
// Loaded as a raw string by src/renderer.js via Vite ?raw import

const $ = (sel, p=document) => p.querySelector(sel);
const el = (tag, cls, html) => { const n = document.createElement(tag); if (cls) n.className = cls; if (html != null) n.innerHTML = html; return n; };

// Chart rendering — switches on chart.mode. No fallback chain.
//   builder → look up window.__PRESETS__[chart.type], call buildSpec(rows,theme)
//   spec    → JSON.parse(chart.specOverride)
//   svg     → innerHTML = chart.svg
//
// For builder/spec we use vega.View.toSVG() (NOT vega-embed: it wraps the
// chart in extra DOM and injects global CSS that collides with the poster
// layout). __PRESETS__ is populated by a <script> block injected by
// src/renderer.js — that block contains the buildSpec function source for
// every preset, so the exported HTML is self-contained.
function resolveTheme() {
  const cs = getComputedStyle(document.documentElement);
  const get = (k) => cs.getPropertyValue(k).trim();
  return {
    navy:       get('--navy')        || '#3c5a7a',
    navyDark:   get('--navy-dark')   || '#2e4661',
    navyLight:  get('--navy-light')  || '#e4ecf4',
    accentRed:  get('--accent-red')  || '#c0392b',
    accentSoft: get('--accent-soft') || '#f4d9d5',
  };
}

function chartErrorBox(msg) {
  return '<div style="color:#c00;padding:5mm;font-family:monospace;font-size:12pt;">' + msg + '</div>';
}

function renderChartSlot(parentEl, chart, minHeightMm) {
  if (!chart) return;
  const slot = el('div');
  slot.style.flex = '1 1 auto';
  slot.style.minHeight = minHeightMm + 'mm';
  slot.style.display = 'flex';
  parentEl.appendChild(slot);

  const styleSvg = (sv) => {
    if (!sv) return;
    sv.removeAttribute('width');
    sv.removeAttribute('height');
    sv.style.width = '100%';
    sv.style.flex = '1 1 auto';
    sv.style.minHeight = minHeightMm + 'mm';
    sv.style.display = 'block';
  };

  const mode = chart.mode || 'builder';

  if (mode === 'svg') {
    if (chart.svg) {
      slot.innerHTML = chart.svg;
      styleSvg(slot.querySelector('svg'));
    }
    return;
  }

  if (!window.vega || !window.vegaLite || typeof window.vegaLite.compile !== 'function') {
    slot.innerHTML = chartErrorBox('Vega-Lite vendor not loaded');
    return;
  }

  let spec = null;
  if (mode === 'spec') {
    const text = chart.specOverride;
    if (!text || !String(text).trim()) return;
    try { spec = JSON.parse(text); }
    catch (err) { slot.innerHTML = chartErrorBox('Spec JSON parse error: ' + err.message); return; }
  } else {
    const entry = window.__PRESETS__ && window.__PRESETS__[chart.type];
    if (!entry || typeof entry.build !== 'function') {
      slot.innerHTML = chartErrorBox('Unknown chart type: ' + chart.type);
      return;
    }
    const labels = Object.assign({}, entry.defaults || {}, chart.labels || {});
    try { spec = entry.build(Array.isArray(chart.rows) ? chart.rows : [], resolveTheme(), labels); }
    catch (err) { slot.innerHTML = chartErrorBox('Preset build error: ' + err.message); return; }
  }

  if (!spec) return;

  try {
    // toSVG needs numeric width/height — 'container' is valid in vega-embed
    // but not in headless mode. Fill in sensible defaults sized for the slot.
    const specSafe = { ...spec };
    if (typeof specSafe.width !== 'number')  specSafe.width  = 1200;
    if (typeof specSafe.height !== 'number') specSafe.height = Math.round(minHeightMm * 3.78);
    const vlOut = window.vegaLite.compile(specSafe);
    const view = new window.vega.View(window.vega.parse(vlOut.spec), { renderer: 'none' });
    view.toSVG().then(svgString => {
      slot.innerHTML = svgString;
      styleSvg(slot.querySelector('svg'));
    }).catch(err => {
      slot.innerHTML = chartErrorBox('Vega error: ' + (err && err.message ? err.message : err));
    });
  } catch (err) {
    slot.innerHTML = chartErrorBox('Vega-Lite compile error: ' + (err && err.message ? err.message : err));
  }
}

function renderHeader(h) {
  const header = el('header', 'header');
  const content = el('div', 'header-content');
  content.appendChild(el('h1', null, h.title || ''));
  if (h.authors && h.authors.length) {
    const authors = el('div', 'authors');
    h.authors.forEach(a => {
      const block = el('div', 'author-block');
      const sup = a.affiliation ? '<sup>'+a.affiliation+'</sup>' : '';
      block.innerHTML = '<span class="author-name">'+a.name+sup+'</span>' + (a.role ? '<span class="author-role">'+a.role+'</span>' : '');
      authors.appendChild(block);
    });
    if (h.affiliations && h.affiliations.length) {
      const aff = el('div', 'author-block');
      aff.style.flex = '1';
      aff.style.minWidth = '80mm';
      const items = h.affiliations.map((s, i) => {
        const cleaned = String(s).replace(/^\s*\d+\s*[.\)]?\s+/, '');
        return '<sup>'+(i+1)+'</sup>'+cleaned;
      });
      aff.innerHTML = '<span class="affiliations-list">'+items.join('<span class="affiliation-sep">·</span>')+'</span>';
      authors.appendChild(aff);
    }
    content.appendChild(authors);
  }
  if (h.subtitle) content.appendChild(el('div', 'expedition-note', h.subtitle));
  header.appendChild(content);
  if (h.logos && h.logos.length) {
    const logos = el('div', 'header-logos');
    h.logos.forEach(l => {
      const tile = el('div', 'logo-tile');
      tile.innerHTML = '<img src="'+l.src+'" alt="'+(l.alt||'')+'" onerror="this.style.opacity=0.2;this.alt=&quot;[logo missing]&quot;">';
      logos.appendChild(tile);
    });
    header.appendChild(logos);
  }
  return header;
}

const sectionRenderers = {
  intro_row(s) {
    const row = el('div', 'intro-row');
    (s.columns || []).forEach(c => {
      const col = el('div', 'intro-col ' + (c.width === 'narrow' ? 'narrow' : 'wide'));
      const inner = el('div');
      if (c.title) inner.appendChild(el('h3', null, c.title));
      (c.paragraphs || []).forEach((p, i) => inner.appendChild(el('p', i > 0 ? 'mt-2' : null, p)));
      col.appendChild(inner);
      row.appendChild(col);
    });
    return row;
  },
  case_grid(s) {
    const section = el('section', 'card');
    if (s.title) section.appendChild(el('h2', 'section-title', s.title));
    const grid = el('div', 'case-grid');
    (s.items || []).forEach(it => {
      const w = it.width === 'full' ? 'full-width' : 'case-half';
      const item = el('div', 'case-item ' + w);
      const body = el('div');
      if (it.title) body.appendChild(el('h4', null, it.title));
      if (it.body) body.appendChild(el('p', null, it.body));
      item.appendChild(body);
      grid.appendChild(item);
    });
    section.appendChild(grid);
    return section;
  },
  chart_with_aside(s) {
    const section = el('section', 'expedition-section');
    const block = el('div', 'expedition-block');
    const chart = el('div', 'chart-wrap');
    if (s.chart && s.chart.title) chart.appendChild(el('h3', null, s.chart.title));
    if (s.chart) renderChartSlot(chart, s.chart, 170);
    if (s.chart && s.chart.caption) chart.appendChild(el('p', 'chart-caption', s.chart.caption));
    block.appendChild(chart);
    if (s.aside) {
      const aside = el('aside', 'decision-box');
      const ico = s.aside.icon ? '<span class="icon-circle">'+s.aside.icon+'</span>' : '';
      aside.appendChild(el('h4', null, ico + ' ' + (s.aside.title||'')));
      (s.aside.sections || []).forEach(ds => {
        const dsec = el('div', 'decision-section');
        if (ds.title) dsec.appendChild(el('div', 'decision-section-title', ds.title));
        if (ds.items && ds.items.length) {
          const ul = el('ul');
          ds.items.forEach(i => ul.appendChild(el('li', null, i)));
          dsec.appendChild(ul);
        }
        aside.appendChild(dsec);
      });
      if (s.aside.outcome) aside.appendChild(el('div', 'decision-outcome', s.aside.outcome));
      block.appendChild(aside);
    }
    section.appendChild(block);
    return section;
  },
  charts_row(s) {
    const section = el('section', 'card physio-section');
    if (s.title) section.appendChild(el('h2', 'section-title', s.title));
    const row = el('div', 'physio-row');
    (s.charts || []).forEach(ch => {
      const card = el('div', 'physio-card');
      if (ch.title) card.appendChild(el('h4', null, ch.title));
      renderChartSlot(card, ch, 110);
      if (ch.caption) card.appendChild(el('p', 'chart-caption', ch.caption));
      row.appendChild(card);
    });
    section.appendChild(row);
    return section;
  },
  findings_block(s) {
    const section = el('section', 'findings-section');
    const block = el('div', 'findings-block');
    if (s.findings) {
      const list = el('div', 'findings-list');
      if (s.findings.title) {
        const h = el('h2', 'section-title', s.findings.title);
        h.style.marginBottom = '5mm'; h.style.textAlign = 'left';
        list.appendChild(h);
      }
      (s.findings.items || []).forEach(it => {
        const f = el('div', 'finding');
        f.appendChild(el('div', 'check', '✓'));
        const body = el('div');
        body.innerHTML = '<h4>'+(it.title||'')+'</h4><p>'+(it.body||'')+'</p>';
        f.appendChild(body);
        list.appendChild(f);
      });
      block.appendChild(list);
    }
    const stack = el('div', 'limitations-stack');
    if (s.limitations) {
      const lim = el('div', 'limitations-box');
      lim.appendChild(el('h4', null, s.limitations.title || ''));
      const ul = el('ul');
      (s.limitations.items || []).forEach(i => ul.appendChild(el('li', null, i)));
      lim.appendChild(ul);
      stack.appendChild(lim);
    }
    if (s.takehome) {
      const th = el('div', 'takehome-box');
      th.appendChild(el('h4', null, s.takehome.title || ''));
      const ul = el('ul');
      (s.takehome.items || []).forEach(i => ul.appendChild(el('li', null, i)));
      th.appendChild(ul);
      stack.appendChild(th);
    }
    block.appendChild(stack);
    section.appendChild(block);
    return section;
  }
};

function renderFooter(f) {
  const footer = el('footer', 'footer');
  if (f.disclosures) {
    const c = el('div', 'footer-col');
    c.appendChild(el('h4', null, f.disclosures.title || 'Disclosures'));
    if (f.disclosures.text) c.appendChild(el('p', null, f.disclosures.text));
    if (f.disclosures.references && f.disclosures.references.length) {
      const ol = el('ol', 'refs-list mt-2');
      f.disclosures.references.forEach(r => ol.appendChild(el('li', null, r)));
      c.appendChild(ol);
    }
    footer.appendChild(c);
  }
  if (f.ethics) {
    const c = el('div', 'footer-col');
    c.appendChild(el('h4', null, f.ethics.title || 'Ethics'));
    c.appendChild(el('p', null, f.ethics.text || ''));
    footer.appendChild(c);
  }
  if (f.contact) {
    const c = el('div', 'footer-col');
    c.style.display = 'flex'; c.style.flexDirection = 'column'; c.style.justifyContent = 'center';
    c.appendChild(el('h4', null, f.contact.title || 'Contact'));
    const flex = el('div', 'contact-flex');
    if (f.contact.qr_svg) {
      const qr = el('div', 'qr-placeholder'); qr.innerHTML = f.contact.qr_svg;
      flex.appendChild(qr);
    }
    const info = el('div', 'contact-info');
    info.innerHTML =
      (f.contact.label ? '<p><strong>'+f.contact.label+'</strong></p>' : '') +
      (f.contact.email ? '<p class="email">'+f.contact.email+'</p>' : '') +
      (f.contact.note ? '<p class="mt-2" style="font-size: 10.5pt;">'+f.contact.note+'</p>' : '');
    flex.appendChild(info); c.appendChild(flex);
    footer.appendChild(c);
  }
  return footer;
}

function renderPoster(config) {
  const root = $('#poster-root');
  root.innerHTML = '';
  if (config.header) root.appendChild(renderHeader(config.header));
  (config.sections || []).forEach(s => {
    const r = sectionRenderers[s.type];
    if (r) root.appendChild(r(s));
  });
  if (config.footer) root.appendChild(renderFooter(config.footer));
}

// Reports the poster's actual content height vs the A0 frame so the builder
// can show an overflow indicator. The iframe is sandboxed without
// allow-same-origin, so postMessage is the only legal channel back.
function reportMetrics() {
  try {
    const poster = document.querySelector('.poster');
    if (!poster) return;
    const scrollHeight = poster.scrollHeight;
    const clientHeight = poster.clientHeight;
    parent.postMessage({
      type: 'a0poster:metrics',
      scrollHeight, clientHeight,
      overflow: scrollHeight > clientHeight + 4
    }, '*');
  } catch (e) { /* iframe may be detached */ }
}

document.addEventListener('DOMContentLoaded', () => {
  try {
    const cfg = JSON.parse($('#poster-config').textContent);
    renderPoster(cfg);
  } catch (err) {
    document.body.insertAdjacentHTML('afterbegin', '<div style="background:#fee;padding:20px;font-family:monospace;color:#c00;"><strong>JSON error:</strong> '+err.message+'</div>');
  }
  reportMetrics();
  // Vega charts render asynchronously (~hundreds of ms) — re-measure once
  // they've had a chance to settle so the overflow banner is accurate.
  setTimeout(reportMetrics, 700);
});
