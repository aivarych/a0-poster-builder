// Poster rendering runtime — embedded into exported HTML
// Loaded as a raw string by src/renderer.js via Vite ?raw import

const $ = (sel, p=document) => p.querySelector(sel);
const el = (tag, cls, html) => { const n = document.createElement(tag); if (cls) n.className = cls; if (html != null) n.innerHTML = html; return n; };

function parseVegaSpec(raw) {
  if (!raw) return null;
  if (typeof raw === 'object') return raw;
  if (typeof raw === 'string') {
    try { return JSON.parse(raw); } catch { return null; }
  }
  return null;
}

// Single chart slot: tries Vega-Lite first, falls back to raw SVG.
//
// We compile Vega-Lite ourselves and use vega.View.toSVG() to get a plain
// SVG string. We deliberately AVOID vega-embed: it wraps the chart in a
// .vega-embed <div>, injects global CSS into <head>, and ships an actions
// menu — all of which collides with the poster's flex/grid layout. Pure
// toSVG() drops the SVG into the slot with no surprises.
//
// vega+vega-lite are present only when the builder detected a vegaSpec
// (see hasVegaSpec in src/renderer.js); without them we go straight to the
// SVG fallback.
function renderChartSlot(parentEl, chart, minHeightMm) {
  if (!chart) return;
  const slot = el('div');
  slot.style.flex = '1 1 auto';
  slot.style.minHeight = minHeightMm + 'mm';
  slot.style.display = 'flex';
  parentEl.appendChild(slot);

  const styleSvg = (sv) => {
    if (!sv) return;
    // Vega emits explicit width/height attrs; strip them so the viewBox
    // controls scaling and our flex layout owns the actual pixel size.
    sv.removeAttribute('width');
    sv.removeAttribute('height');
    sv.style.width = '100%';
    sv.style.flex = '1 1 auto';
    sv.style.minHeight = minHeightMm + 'mm';
    sv.style.display = 'block';
  };

  const spec = parseVegaSpec(chart.vegaSpec);
  if (spec && window.vega && window.vegaLite && typeof window.vegaLite.compile === 'function') {
    try {
      // toSVG needs numeric width/height — "container" or undefined are
      // valid in vega-embed but not in headless mode. Fill in sensible
      // defaults sized for our slot.
      const specSafe = { ...spec };
      if (typeof specSafe.width !== 'number')  specSafe.width  = 1200;
      if (typeof specSafe.height !== 'number') specSafe.height = Math.round(minHeightMm * 3.78);
      const vlOut = window.vegaLite.compile(specSafe);
      const view = new window.vega.View(window.vega.parse(vlOut.spec), { renderer: 'none' });
      view.toSVG().then(svgString => {
        slot.innerHTML = svgString;
        styleSvg(slot.querySelector('svg'));
      }).catch(err => {
        slot.innerHTML = '<div style="color:#c00;padding:5mm;font-family:monospace;font-size:12pt;">Vega error: ' + (err && err.message ? err.message : err) + '</div>';
      });
      return;
    } catch (err) {
      slot.innerHTML = '<div style="color:#c00;padding:5mm;font-family:monospace;font-size:12pt;">Vega-Lite compile error: ' + (err && err.message ? err.message : err) + '</div>';
      return;
    }
  }

  if (chart.svg) {
    slot.innerHTML = chart.svg;
    styleSvg(slot.querySelector('svg'));
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
      aff.innerHTML = '<span class="xs" style="color: rgba(255,255,255,0.85); font-size: 15pt;">'+h.affiliations.join(' &nbsp; ')+'</span>';
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
    if (s.chart && (s.chart.vegaSpec || s.chart.svg)) renderChartSlot(chart, s.chart, 170);
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
      if (ch.vegaSpec || ch.svg) renderChartSlot(card, ch, 110);
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
