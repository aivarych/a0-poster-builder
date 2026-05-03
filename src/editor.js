/**
 * Center panel — form editor for the selected item.
 *
 * Architecture:
 *   - sectionEditorRenderers[type] returns HTML string for one section type
 *   - All inputs carry data-path="dotted.path.to.field" for delegated input handling
 *   - All array controls carry data-action + data-list / data-index for delegated button handling
 *   - When the user types in an input we update state and refresh preview WITHOUT
 *     re-rendering the editor (to avoid losing focus). When structure changes
 *     (add/remove/move inside a list) we call rerenderEditorAndPreview.
 *
 * To add an editor for a new section type: add a function to sectionEditorRenderers
 * mirroring the shape produced by SECTION_TEMPLATES[type].
 *
 * Strings come from i18n (see src/i18n/{en,ru}.js). Only static field metadata
 * is via t(); section type ids (intro_row, charts_row, ...) are literal identifiers
 * shown verbatim in the type badge — they're a public schema, not chrome.
 */

import { state } from './state.js';
import {
  escapeHtml, escapeAttr,
  getAtPath, setAtPath, pathToString, stringToPath,
  parseCSV, showToast
} from './utils.js';
import { refreshPreview } from './preview.js';
import { renderSidebar } from './sidebar.js';
import { t } from './i18n/index.js';
import { PRESETS, buildPreset } from './chart-presets/index.js';
import { generateQR } from './qr.js';

/* ---------- Chart-editor helpers (used by chart_with_aside / charts_row) ---------- */

function getChartTab(pathStr) {
  return state.chartTabs[pathStr] || 'data';
}
function setChartTab(pathStr, tab) {
  state.chartTabs[pathStr] = tab;
}

/**
 * Read chart.vegaSpec as an object. Migrates string → object on first read
 * (legacy projects stored vegaSpec as a JSON string). Returns null when
 * the spec is empty or the string fails to parse.
 */
function getSpecObject(chart) {
  if (!chart) return null;
  const raw = chart.vegaSpec;
  if (raw == null || raw === '') return null;
  if (typeof raw === 'object') return raw;
  if (typeof raw === 'string') {
    try {
      const obj = JSON.parse(raw);
      chart.vegaSpec = obj;
      return obj;
    } catch { return null; }
  }
  return null;
}

/** Make sure chart.vegaSpec exists as an object — used before we mutate it. */
function ensureSpec(chart) {
  if (!chart.vegaSpec || typeof chart.vegaSpec === 'string') {
    let obj = null;
    if (typeof chart.vegaSpec === 'string') {
      try { obj = JSON.parse(chart.vegaSpec); } catch {}
    }
    chart.vegaSpec = obj || {};
  }
}

function chartFromPathStr(pathStr) {
  return getAtPath(state.config, stringToPath(pathStr));
}

/** Parse a cell's text input into number/null/string the way Data table expects. */
function coerceCellValue(raw) {
  const s = String(raw).trim();
  if (s === '') return null;
  if (/^-?\d*\.?\d+(e[+-]?\d+)?$/i.test(s)) {
    const n = Number(s);
    if (!isNaN(n)) return n;
  }
  return s;
}

/**
 * Reconcile the spec with the data after a CSV import or column rename.
 *
 * - If encoding still references columns that exist in the data, leave it.
 * - If any field in encoding has gone stale (column dropped/renamed) OR
 *   encoding doesn't exist yet, regenerate it from the data: first two
 *   numeric columns → x/y, first string column → color.
 * - Mark is preserved when the user already set one; only filled in if
 *   missing (line+point for 2+ numerics, bar otherwise).
 *
 * Skips entirely if the spec uses layer/facet/concat/repeat (compound
 * specs are too varied to second-guess).
 */
function autoFillBareSpec(chart) {
  const spec = chart && chart.vegaSpec;
  if (!spec || typeof spec !== 'object') return;
  if (spec.layer || spec.facet ||
      spec.concat || spec.hconcat || spec.vconcat || spec.repeat) return;
  const values = spec.data && spec.data.values;
  if (!Array.isArray(values) || !values.length) return;

  const cols = new Set();
  values.forEach(r => Object.keys(r || {}).forEach(k => cols.add(k)));

  let needsEncoding = !spec.encoding;
  if (spec.encoding) {
    for (const channel of ['x', 'y', 'color', 'size', 'opacity', 'shape']) {
      const f = spec.encoding[channel] && spec.encoding[channel].field;
      if (f && !cols.has(f)) { needsEncoding = true; break; }
    }
  }

  if (needsEncoding) {
    const numericCols = [];
    const stringCols  = [];
    cols.forEach(c => {
      let allNumeric = true;
      let sawValue = false;
      for (const r of values) {
        const v = r[c];
        if (v == null || v === '') continue;
        sawValue = true;
        if (typeof v !== 'number') { allNumeric = false; break; }
      }
      if (sawValue && allNumeric) numericCols.push(c);
      else stringCols.push(c);
    });

    spec.encoding = {};
    if (numericCols[0]) spec.encoding.x = { field: numericCols[0], type: 'quantitative' };
    if (numericCols[1]) spec.encoding.y = { field: numericCols[1], type: 'quantitative' };
    if (stringCols[0])  spec.encoding.color = { field: stringCols[0], type: 'nominal' };
    if (!spec.mark) spec.mark = numericCols.length >= 2 ? { type: 'line', point: true } : 'bar';
    return;
  }

  // Encoding already valid — just make sure mark exists.
  if (!spec.mark) spec.mark = 'point';
}

/* ---------- Field helpers ---------- */

function inputField(label, path, value, opts = {}) {
  const v = value == null ? '' : value;
  const hint = opts.hint ? `<span class="field-hint">${escapeHtml(opts.hint)}</span>` : '';
  return `
    <div class="field">
      <label class="field-label">${escapeHtml(label)} ${hint}</label>
      <input type="text" data-path="${pathToString(path)}" value="${escapeAttr(v)}">
    </div>`;
}

function textareaField(label, path, value, opts = {}) {
  const v = value == null ? '' : value;
  const cls = opts.svg ? 'svg-input' : (opts.code ? 'code-input' : '');
  const rows = opts.rows || (opts.svg ? 7 : 3);
  const hint = opts.hint ? `<span class="field-hint">${escapeHtml(opts.hint)}</span>` : '';
  return `
    <div class="field">
      <label class="field-label">${escapeHtml(label)} ${hint}</label>
      <textarea class="${cls}" rows="${rows}" data-path="${pathToString(path)}">${escapeHtml(v)}</textarea>
    </div>`;
}

function selectField(label, path, value, options) {
  const opts = options.map(([val, lab]) => `<option value="${val}" ${val === value ? 'selected' : ''}>${escapeHtml(lab)}</option>`).join('');
  return `
    <div class="field">
      <label class="field-label">${escapeHtml(label)}</label>
      <select data-path="${pathToString(path)}">${opts}</select>
    </div>`;
}

function stringListField(label, path, items, opts = {}) {
  const placeholder = opts.placeholder || t('editor.action.add_item');
  const itemFields = (items || []).map((v, i) => `
    <div class="subcard">
      <div class="subcard-header">
        <span class="subcard-title">${escapeHtml(t('editor.subcard.item_n', { n: i + 1 }))}</span>
        <div class="subcard-controls">
          <button data-action="up" data-list="${pathToString(path)}" data-index="${i}">▲</button>
          <button data-action="down" data-list="${pathToString(path)}" data-index="${i}">▼</button>
          <button data-action="delete" data-list="${pathToString(path)}" data-index="${i}" class="danger">✕</button>
        </div>
      </div>
      <textarea data-path="${pathToString([...path, i])}" rows="2">${escapeHtml(v)}</textarea>
    </div>
  `).join('');
  return `
    <div class="subgroup">
      <div class="subgroup-title">${escapeHtml(label)}</div>
      ${itemFields}
      <button class="add-item-btn" data-action="add-string" data-list="${pathToString(path)}">+ ${escapeHtml(placeholder)}</button>
    </div>`;
}

function widthSelect(path, value, narrowOpt = 'narrow') {
  const opts = narrowOpt === 'narrow'
    ? [['wide',   t('editor.option.width.wide')], ['narrow', t('editor.option.width.narrow')]]
    : [['half',   t('editor.option.width.half')], ['full',   t('editor.option.width.full')]];
  return selectField(t('editor.field.width'), path, value, opts);
}

/* ---------- Chart editor (Data / Encoding / Spec / SVG tabs) ---------- */

function renderChartEditor(pathStr, chart) {
  const tab = getChartTab(pathStr);
  const tabBtn = (name) => `
    <button class="chart-tab ${tab === name ? 'active' : ''}"
            data-action="set-chart-tab"
            data-chart-path="${escapeAttr(pathStr)}"
            data-tab="${name}">${escapeHtml(t('editor.tab.' + name))}</button>
  `;
  let body = '';
  if (tab === 'data')          body = renderChartDataTab(chart, pathStr);
  else if (tab === 'encoding') body = renderChartEncodingTab(chart, pathStr);
  else if (tab === 'spec')     body = renderChartSpecTab(chart, pathStr);
  else if (tab === 'svg')      body = renderChartSvgTab(chart, pathStr);
  return `
    <div class="chart-editor">
      <div class="chart-actions">
        <details class="chart-preset-control">
          <summary>${escapeHtml(t('editor.chart.insert_preset'))}</summary>
          <div class="chart-preset-menu">
            ${PRESETS.map(p => `
              <button data-action="apply-preset"
                      data-chart-path="${escapeAttr(pathStr)}"
                      data-preset-id="${p.id}">${escapeHtml(t(p.labelKey))}</button>
            `).join('')}
          </div>
        </details>
      </div>
      <div class="chart-tabs">
        ${tabBtn('data')}${tabBtn('encoding')}${tabBtn('spec')}${tabBtn('svg')}
      </div>
      <div class="chart-tab-body">
        ${body}
      </div>
    </div>
  `;
}

function renderChartDataTab(chart, pathStr) {
  const spec = getSpecObject(chart);
  const data = spec && spec.data;

  if (data && data.url) {
    return `<div class="chart-tab-note">${escapeHtml(t('editor.chart.external_data', { url: data.url }))}</div>`;
  }

  const values = (data && Array.isArray(data.values)) ? data.values : [];

  if (!values.length) {
    return `
      <div class="chart-tab-empty">${escapeHtml(t('editor.chart.no_data_yet'))}</div>
      ${renderCsvPasteBlock(pathStr, true)}
      <div class="chart-data-actions">
        <button class="add-item-btn" data-action="add-row" data-chart-path="${escapeAttr(pathStr)}">+ ${escapeHtml(t('editor.chart.add_row'))}</button>
        <button class="add-item-btn" data-action="add-column" data-chart-path="${escapeAttr(pathStr)}">+ ${escapeHtml(t('editor.chart.add_column'))}</button>
      </div>
    `;
  }

  // Union of keys across rows so a partial row doesn't drop columns.
  const colSet = new Set();
  values.forEach(r => { Object.keys(r || {}).forEach(k => colSet.add(k)); });
  const columns = [...colSet];

  const headers = columns.map(c => `
    <th>
      <span class="col-name">${escapeHtml(c)}</span>
      <button class="col-del" data-action="delete-column" data-chart-path="${escapeAttr(pathStr)}" data-col="${escapeAttr(c)}" title="${escapeAttr(t('sidebar.delete'))}">✕</button>
    </th>
  `).join('');

  const body = values.map((row, i) => `
    <tr>
      ${columns.map(c => `
        <td><input type="text"
                   data-chart-cell="1"
                   data-chart-path="${escapeAttr(pathStr)}"
                   data-row="${i}"
                   data-col="${escapeAttr(c)}"
                   value="${escapeAttr(row[c] != null ? String(row[c]) : '')}"></td>
      `).join('')}
      <td class="row-del-cell"><button class="row-del" data-action="delete-row" data-chart-path="${escapeAttr(pathStr)}" data-row="${i}" title="${escapeAttr(t('sidebar.delete'))}">✕</button></td>
    </tr>
  `).join('');

  return `
    <div class="chart-data-table">
      <table>
        <thead><tr>${headers}<th class="row-del-cell"></th></tr></thead>
        <tbody>${body}</tbody>
      </table>
      <div class="chart-data-actions">
        <button class="add-item-btn" data-action="add-row" data-chart-path="${escapeAttr(pathStr)}">+ ${escapeHtml(t('editor.chart.add_row'))}</button>
        <button class="add-item-btn" data-action="add-column" data-chart-path="${escapeAttr(pathStr)}">+ ${escapeHtml(t('editor.chart.add_column'))}</button>
      </div>
    </div>
    ${renderCsvPasteBlock(pathStr, false)}
  `;
}

function renderCsvPasteBlock(pathStr, expanded) {
  return `
    <details class="chart-csv-paste"${expanded ? ' open' : ''}>
      <summary>${escapeHtml(t('editor.chart.paste_csv'))}</summary>
      <textarea class="chart-csv-input code-input"
                data-csv-input="${escapeAttr(pathStr)}"
                rows="5"
                placeholder="${escapeAttr(t('editor.chart.csv_placeholder'))}"></textarea>
      <button class="add-item-btn" data-action="parse-csv" data-chart-path="${escapeAttr(pathStr)}">${escapeHtml(t('editor.chart.parse_csv'))}</button>
    </details>
  `;
}

const MARK_TYPES = ['line', 'bar', 'point', 'area', 'boxplot', 'tick'];
const ENC_TYPES  = ['quantitative', 'temporal', 'ordinal', 'nominal'];
const ENC_CHANNELS = ['x', 'y', 'color'];

function renderChartEncodingTab(chart, pathStr) {
  const spec = getSpecObject(chart);
  if (!spec) {
    return `<div class="chart-tab-empty">${escapeHtml(t('editor.chart.encoding_no_spec'))}</div>`;
  }
  const data = spec.data;
  const values = (data && Array.isArray(data.values)) ? data.values : [];
  if (!values.length && !data?.url) {
    return `<div class="chart-tab-empty">${escapeHtml(t('editor.chart.encoding_no_data'))}</div>`;
  }
  const cols = [];
  const seen = new Set();
  values.forEach(r => Object.keys(r || {}).forEach(k => {
    if (!seen.has(k)) { seen.add(k); cols.push(k); }
  }));

  return `
    ${renderMarkSection(spec, pathStr)}
    ${ENC_CHANNELS.map(ch => renderEncodingChannelSection(ch, spec, pathStr, cols)).join('')}
  `;
}

function renderMarkSection(spec, pathStr) {
  const markObj = typeof spec.mark === 'string' ? { type: spec.mark } : (spec.mark || {});
  const type = markObj.type || 'point';
  const point = markObj.point === true;

  const opts = MARK_TYPES.map(m =>
    `<option value="${m}" ${m === type ? 'selected' : ''}>${escapeHtml(t('editor.chart.mark.' + m))}</option>`
  ).join('');

  const showPointToggle = (type === 'line' || type === 'area');

  return `
    <div class="enc-section">
      <div class="enc-label">${escapeHtml(t('editor.chart.mark_label'))}</div>
      <div class="enc-row">
        <select data-enc-mark-type data-chart-path="${escapeAttr(pathStr)}">${opts}</select>
        ${showPointToggle ? `
          <label class="enc-check">
            <input type="checkbox" data-enc-mark-point data-chart-path="${escapeAttr(pathStr)}" ${point ? 'checked' : ''}>
            ${escapeHtml(t('editor.chart.mark_point'))}
          </label>
        ` : ''}
      </div>
    </div>
  `;
}

function renderEncodingChannelSection(channel, spec, pathStr, cols) {
  const enc = (spec.encoding && spec.encoding[channel]) || {};
  const field = enc.field || '';
  const type  = enc.type  || '';
  const title = enc.title != null ? enc.title : '';

  const fieldOpts = `<option value="">—</option>` + cols.map(c =>
    `<option value="${escapeAttr(c)}" ${c === field ? 'selected' : ''}>${escapeHtml(c)}</option>`
  ).join('');

  const typeOpts = `<option value="">—</option>` + ENC_TYPES.map(tp =>
    `<option value="${tp}" ${tp === type ? 'selected' : ''}>${escapeHtml(t('editor.chart.type.' + tp))}</option>`
  ).join('');

  return `
    <div class="enc-section">
      <div class="enc-label">${escapeHtml(t('editor.chart.channel.' + channel))}</div>
      <div class="enc-row">
        <select data-enc-field data-channel="${channel}" data-chart-path="${escapeAttr(pathStr)}">${fieldOpts}</select>
        <select data-enc-type data-channel="${channel}" data-chart-path="${escapeAttr(pathStr)}">${typeOpts}</select>
      </div>
      <input type="text"
             class="enc-title-input"
             data-enc-title data-channel="${channel}" data-chart-path="${escapeAttr(pathStr)}"
             value="${escapeAttr(title)}"
             placeholder="${escapeAttr(t('editor.chart.axis_title_placeholder'))}">
    </div>
  `;
}

function detectFieldType(values, field) {
  for (const r of values) {
    const v = r[field];
    if (v == null || v === '') continue;
    if (typeof v === 'number') return 'quantitative';
    if (typeof v === 'string') {
      if (/^\d{4}-\d{2}-\d{2}/.test(v)) return 'temporal';
      return 'nominal';
    }
  }
  return 'nominal';
}

function renderChartSpecTab(chart, pathStr) {
  let txt = '';
  if (typeof chart.vegaSpec === 'string') txt = chart.vegaSpec;
  else if (chart.vegaSpec) txt = JSON.stringify(chart.vegaSpec, null, 2);
  return `
    <div class="field">
      <label class="field-label">${escapeHtml(t('editor.field.vega_spec'))} <span class="field-hint">${escapeHtml(t('editor.hint.vega_priority'))}</span></label>
      <textarea class="chart-spec-input code-input"
                data-spec-textarea="${escapeAttr(pathStr)}"
                rows="14"
                spellcheck="false">${escapeHtml(txt)}</textarea>
    </div>
  `;
}

function renderChartSvgTab(chart, pathStr) {
  const path = stringToPath(pathStr);
  const svgPath = [...path, 'svg'];
  const v = chart.svg || '';
  return `
    <div class="field">
      <label class="field-label">${escapeHtml(t('editor.field.svg_full'))} <span class="field-hint">${escapeHtml(t('editor.hint.viewbox'))}</span></label>
      <textarea class="svg-input" rows="8" data-path="${pathToString(svgPath)}">${escapeHtml(v)}</textarea>
    </div>
  `;
}

/* ---------- Top-level editor dispatch ---------- */

export function renderEditor() {
  const body = document.getElementById('editor-body');
  const sel = state.selected;

  if (sel.kind === 'header') {
    body.innerHTML = renderHeaderEditor(state.config.header);
  } else if (sel.kind === 'footer') {
    body.innerHTML = renderFooterEditor(state.config.footer);
  } else if (sel.kind === 'section') {
    const sec = state.config.sections[sel.index];
    if (!sec) {
      body.innerHTML = `<div class="editor-empty">${escapeHtml(t('editor.empty.select_or_add'))}</div>`;
      return;
    }
    const renderer = sectionEditorRenderers[sec.type];
    if (!renderer) {
      body.innerHTML = `<div class="editor-empty">${escapeHtml(t('editor.empty.no_renderer', { type: sec.type }))}</div>`;
      return;
    }
    body.innerHTML = renderer(sec, sel.index);
  } else {
    body.innerHTML = `<div class="editor-empty">${escapeHtml(t('editor.empty.select_item'))}</div>`;
  }

  attachEditorHandlers();
}

/* ---------- Header / Footer editors ---------- */

function renderHeaderEditor(h) {
  if (!h) h = {};
  return `
    <div class="editor-section-title">${escapeHtml(t('editor.section.header.label'))} <span class="type-badge">${escapeHtml(t('editor.section.header.badge'))}</span></div>
    <div class="editor-section-meta">${escapeHtml(t('editor.section.header.meta'))}</div>

    ${inputField(t('editor.field.poster_title'), ['header', 'title'], h.title)}
    ${textareaField(t('editor.field.subtitle'), ['header', 'subtitle'], h.subtitle, { rows: 2, hint: t('editor.hint.subtitle') })}

    <div class="subgroup">
      <div class="subgroup-title">${escapeHtml(t('editor.subgroup.authors'))}</div>
      ${(h.authors || []).map((a, i) => `
        <div class="subcard">
          <div class="subcard-header">
            <span class="subcard-title">${escapeHtml(t('editor.subcard.author_n', { n: i + 1 }))}</span>
            <div class="subcard-controls">
              <button data-action="up" data-list="header.authors" data-index="${i}">▲</button>
              <button data-action="down" data-list="header.authors" data-index="${i}">▼</button>
              <button data-action="delete" data-list="header.authors" data-index="${i}" class="danger">✕</button>
            </div>
          </div>
          ${inputField(t('editor.field.name'), ['header', 'authors', i, 'name'], a.name)}
          <div class="field-row">
            ${inputField(t('editor.field.role'), ['header', 'authors', i, 'role'], a.role)}
            ${inputField(t('editor.field.affiliation_num'), ['header', 'authors', i, 'affiliation'], a.affiliation, { hint: t('editor.hint.aff_eg') })}
          </div>
        </div>
      `).join('')}
      <button class="add-item-btn" data-action="add-author">${escapeHtml(t('editor.action.add_author'))}</button>
    </div>

    ${stringListField(t('editor.subgroup.affiliations'), ['header', 'affiliations'], h.affiliations, { placeholder: t('editor.action.add_affiliation') })}

    <div class="subgroup">
      <div class="subgroup-title">${escapeHtml(t('editor.subgroup.logos'))}</div>
      ${(h.logos || []).map((l, i) => {
        const isDataUri = typeof l.src === 'string' && l.src.startsWith('data:');
        const sizeKb = isDataUri ? Math.round(l.src.length / 1024) : 0;
        return `
        <div class="subcard logo-card" data-logo-index="${i}">
          <div class="subcard-header">
            <span class="subcard-title">${escapeHtml(t('editor.subcard.logo_n', { n: i + 1 }))}</span>
            <div class="subcard-controls">
              <button data-action="upload-logo" data-logo-index="${i}" title="${escapeAttr(t('editor.action.upload_logo'))}">↑</button>
              <button data-action="delete" data-list="header.logos" data-index="${i}" class="danger">✕</button>
            </div>
          </div>
          ${l.src ? `<div class="logo-preview"><img src="${escapeAttr(l.src)}" alt="" onerror="this.parentNode.style.display='none'"></div>` : ''}
          <div class="logo-drop-hint">${escapeHtml(t('editor.action.drop_logo_hint'))}</div>
          ${isDataUri
            ? `<div class="logo-embedded-note">${escapeHtml(t('editor.field.image_embedded', { kb: sizeKb }))}</div>`
            : inputField(t('editor.field.image_src'), ['header', 'logos', i, 'src'], l.src)}
          ${inputField(t('editor.field.alt'), ['header', 'logos', i, 'alt'], l.alt)}
        </div>
      `;
      }).join('')}
      <button class="add-item-btn" data-action="add-logo">${escapeHtml(t('editor.action.add_logo'))}</button>
    </div>
  `;
}

function renderFooterEditor(f) {
  if (!f) f = {};
  const d = f.disclosures || {};
  const e = f.ethics || {};
  const c = f.contact || {};
  return `
    <div class="editor-section-title">${escapeHtml(t('editor.section.footer.label'))} <span class="type-badge">${escapeHtml(t('editor.section.footer.badge'))}</span></div>
    <div class="editor-section-meta">${escapeHtml(t('editor.section.footer.meta'))}</div>

    <div class="subgroup">
      <div class="subgroup-title">${escapeHtml(t('editor.subgroup.disclosures_col'))}</div>
      ${inputField(t('editor.field.heading'), ['footer', 'disclosures', 'title'], d.title)}
      ${textareaField(t('editor.field.disclosure_text'), ['footer', 'disclosures', 'text'], d.text, { rows: 3 })}
      ${stringListField(t('editor.field.references'), ['footer', 'disclosures', 'references'], d.references, { placeholder: t('editor.action.add_reference') })}
    </div>

    <div class="subgroup">
      <div class="subgroup-title">${escapeHtml(t('editor.subgroup.ethics_col'))}</div>
      ${inputField(t('editor.field.heading'), ['footer', 'ethics', 'title'], e.title)}
      ${textareaField(t('editor.field.ethics_text'), ['footer', 'ethics', 'text'], e.text, { rows: 3 })}
    </div>

    <div class="subgroup">
      <div class="subgroup-title">${escapeHtml(t('editor.subgroup.contact_col'))}</div>
      ${inputField(t('editor.field.heading'), ['footer', 'contact', 'title'], c.title)}
      ${inputField(t('editor.field.contact_label'), ['footer', 'contact', 'label'], c.label)}
      ${inputField(t('editor.field.email'), ['footer', 'contact', 'email'], c.email)}
      ${textareaField(t('editor.field.note'), ['footer', 'contact', 'note'], c.note, { rows: 2 })}
      <div class="field">
        <label class="field-label">${escapeHtml(t('editor.field.qr_url'))} <span class="field-hint">${escapeHtml(t('editor.hint.qr_auto'))}</span></label>
        <input type="text" data-path="footer.contact.qr_url" data-qr-source="1" value="${escapeAttr(c.qr_url || '')}">
      </div>
      ${textareaField(t('editor.field.qr_svg'), ['footer', 'contact', 'qr_svg'], c.qr_svg, { svg: true, hint: t('editor.hint.qr_manual') })}
    </div>
  `;
}

/* ---------- Section editors ---------- */

const sectionEditorRenderers = {
  intro_row(s, idx) {
    return `
      <div class="editor-section-title">${escapeHtml(t('editor.section.intro_row.label'))} <span class="type-badge">intro_row</span></div>
      <div class="editor-section-meta">${escapeHtml(t('editor.section.intro_row.meta', { n: idx + 1 }))}</div>
      ${(s.columns || []).map((c, i) => `
        <div class="subgroup">
          <div class="subgroup-title">${escapeHtml(t('editor.subgroup.column_n', { n: i + 1 }))}</div>
          ${widthSelect(['sections', idx, 'columns', i, 'width'], c.width || 'wide', 'narrow')}
          ${inputField(t('editor.field.title'), ['sections', idx, 'columns', i, 'title'], c.title)}
          ${stringListField(t('editor.field.paragraphs'), ['sections', idx, 'columns', i, 'paragraphs'], c.paragraphs, { placeholder: t('editor.action.add_paragraph') })}
        </div>
      `).join('')}
    `;
  },

  case_grid(s, idx) {
    return `
      <div class="editor-section-title">${escapeHtml(t('editor.section.case_grid.label'))} <span class="type-badge">case_grid</span></div>
      <div class="editor-section-meta">${escapeHtml(t('editor.section.case_grid.meta', { n: idx + 1 }))}</div>
      ${inputField(t('editor.field.section_title'), ['sections', idx, 'title'], s.title)}
      <div class="subgroup">
        <div class="subgroup-title">${escapeHtml(t('editor.subgroup.cards'))}</div>
        ${(s.items || []).map((it, i) => `
          <div class="subcard">
            <div class="subcard-header">
              <span class="subcard-title">${escapeHtml(t('editor.subcard.card_n', { n: i + 1 }))}</span>
              <div class="subcard-controls">
                <button data-action="up" data-list="sections.${idx}.items" data-index="${i}">▲</button>
                <button data-action="down" data-list="sections.${idx}.items" data-index="${i}">▼</button>
                <button data-action="delete" data-list="sections.${idx}.items" data-index="${i}" class="danger">✕</button>
              </div>
            </div>
            ${widthSelect(['sections', idx, 'items', i, 'width'], it.width || 'half', 'half')}
            ${inputField(t('editor.field.title'), ['sections', idx, 'items', i, 'title'], it.title)}
            ${textareaField(t('editor.field.body_html'), ['sections', idx, 'items', i, 'body'], it.body, { rows: 3 })}
          </div>
        `).join('')}
        <button class="add-item-btn" data-action="add-card" data-section-index="${idx}">${escapeHtml(t('editor.action.add_card'))}</button>
      </div>
    `;
  },

  chart_with_aside(s, idx) {
    const ch = s.chart || {};
    const a = s.aside || {};
    return `
      <div class="editor-section-title">${escapeHtml(t('editor.section.chart_with_aside.label'))} <span class="type-badge">chart_with_aside</span></div>
      <div class="editor-section-meta">${escapeHtml(t('editor.section.chart_with_aside.meta', { n: idx + 1 }))}</div>

      <div class="subgroup">
        <div class="subgroup-title">${escapeHtml(t('editor.subgroup.chart_left'))}</div>
        ${inputField(t('editor.field.chart_title'), ['sections', idx, 'chart', 'title'], ch.title)}
        ${renderChartEditor(`sections.${idx}.chart`, ch)}
        ${textareaField(t('editor.field.caption'), ['sections', idx, 'chart', 'caption'], ch.caption, { rows: 2 })}
      </div>

      <div class="subgroup">
        <div class="subgroup-title">${escapeHtml(t('editor.subgroup.aside_right'))}</div>
        ${inputField(t('editor.field.title'), ['sections', idx, 'aside', 'title'], a.title)}
        ${inputField(t('editor.field.icon_char'), ['sections', idx, 'aside', 'icon'], a.icon, { hint: t('editor.hint.icon_eg') })}
        ${(a.sections || []).map((ds, i) => `
          <div class="subcard">
            <div class="subcard-header">
              <span class="subcard-title">${escapeHtml(t('editor.subcard.subgroup_n', { n: i + 1 }))}</span>
              <div class="subcard-controls">
                <button data-action="up" data-list="sections.${idx}.aside.sections" data-index="${i}">▲</button>
                <button data-action="down" data-list="sections.${idx}.aside.sections" data-index="${i}">▼</button>
                <button data-action="delete" data-list="sections.${idx}.aside.sections" data-index="${i}" class="danger">✕</button>
              </div>
            </div>
            ${inputField(t('editor.field.subgroup_title'), ['sections', idx, 'aside', 'sections', i, 'title'], ds.title)}
            ${stringListField(t('editor.field.items'), ['sections', idx, 'aside', 'sections', i, 'items'], ds.items, { placeholder: t('editor.action.add_item') })}
          </div>
        `).join('')}
        <button class="add-item-btn" data-action="add-aside-subgroup" data-section-index="${idx}">${escapeHtml(t('editor.action.add_aside_subgroup'))}</button>
        ${textareaField(t('editor.field.outcome'), ['sections', idx, 'aside', 'outcome'], a.outcome, { rows: 2 })}
      </div>
    `;
  },

  charts_row(s, idx) {
    return `
      <div class="editor-section-title">${escapeHtml(t('editor.section.charts_row.label'))} <span class="type-badge">charts_row</span></div>
      <div class="editor-section-meta">${escapeHtml(t('editor.section.charts_row.meta', { n: idx + 1 }))}</div>
      ${inputField(t('editor.field.section_title'), ['sections', idx, 'title'], s.title)}
      <div class="subgroup">
        <div class="subgroup-title">${escapeHtml(t('editor.subgroup.charts'))}</div>
        ${(s.charts || []).map((ch, i) => `
          <div class="subcard">
            <div class="subcard-header">
              <span class="subcard-title">${escapeHtml(t('editor.subcard.chart_n', { n: i + 1 }))}</span>
              <div class="subcard-controls">
                <button data-action="up" data-list="sections.${idx}.charts" data-index="${i}">▲</button>
                <button data-action="down" data-list="sections.${idx}.charts" data-index="${i}">▼</button>
                <button data-action="delete" data-list="sections.${idx}.charts" data-index="${i}" class="danger">✕</button>
              </div>
            </div>
            ${inputField(t('editor.field.title'), ['sections', idx, 'charts', i, 'title'], ch.title)}
            ${renderChartEditor(`sections.${idx}.charts.${i}`, ch)}
            ${textareaField(t('editor.field.caption'), ['sections', idx, 'charts', i, 'caption'], ch.caption, { rows: 2 })}
          </div>
        `).join('')}
        <button class="add-item-btn" data-action="add-row-chart" data-section-index="${idx}">${escapeHtml(t('editor.action.add_chart'))}</button>
      </div>
    `;
  },

  findings_block(s, idx) {
    const fi = s.findings || {};
    const li = s.limitations || {};
    const th = s.takehome || {};
    return `
      <div class="editor-section-title">${escapeHtml(t('editor.section.findings_block.label'))} <span class="type-badge">findings_block</span></div>
      <div class="editor-section-meta">${escapeHtml(t('editor.section.findings_block.meta', { n: idx + 1 }))}</div>

      <div class="subgroup">
        <div class="subgroup-title">${escapeHtml(t('editor.subgroup.findings_left'))}</div>
        ${inputField(t('editor.field.heading'), ['sections', idx, 'findings', 'title'], fi.title)}
        ${(fi.items || []).map((it, i) => `
          <div class="subcard">
            <div class="subcard-header">
              <span class="subcard-title">${escapeHtml(t('editor.subcard.finding_n', { n: i + 1 }))}</span>
              <div class="subcard-controls">
                <button data-action="up" data-list="sections.${idx}.findings.items" data-index="${i}">▲</button>
                <button data-action="down" data-list="sections.${idx}.findings.items" data-index="${i}">▼</button>
                <button data-action="delete" data-list="sections.${idx}.findings.items" data-index="${i}" class="danger">✕</button>
              </div>
            </div>
            ${inputField(t('editor.field.title'), ['sections', idx, 'findings', 'items', i, 'title'], it.title)}
            ${textareaField(t('editor.field.body'), ['sections', idx, 'findings', 'items', i, 'body'], it.body, { rows: 2 })}
          </div>
        `).join('')}
        <button class="add-item-btn" data-action="add-finding" data-section-index="${idx}">${escapeHtml(t('editor.action.add_finding'))}</button>
      </div>

      <div class="subgroup">
        <div class="subgroup-title">${escapeHtml(t('editor.subgroup.limitations_middle'))}</div>
        ${inputField(t('editor.field.heading'), ['sections', idx, 'limitations', 'title'], li.title)}
        ${stringListField(t('editor.field.limitation_items'), ['sections', idx, 'limitations', 'items'], li.items, { placeholder: t('editor.action.add_limitation') })}
      </div>

      <div class="subgroup">
        <div class="subgroup-title">${escapeHtml(t('editor.subgroup.takehome_right'))}</div>
        ${inputField(t('editor.field.heading'), ['sections', idx, 'takehome', 'title'], th.title)}
        ${stringListField(t('editor.field.takehome_items'), ['sections', idx, 'takehome', 'items'], th.items, { placeholder: t('editor.action.add_takehome') })}
      </div>
    `;
  }
};

/* ---------- Delegated event handlers ---------- */

function attachEditorHandlers() {
  const body = document.getElementById('editor-body');

  body.querySelectorAll('[data-path]').forEach(field => {
    field.addEventListener('input', onFieldInput);
    field.addEventListener('change', onFieldInput);
  });

  body.querySelectorAll('button[data-action]').forEach(btn => {
    btn.addEventListener('click', onEditorButton);
  });

  body.querySelectorAll('input[data-chart-cell]').forEach(inp => {
    inp.addEventListener('input', onChartCellInput);
  });

  body.querySelectorAll('textarea[data-spec-textarea]').forEach(ta => {
    ta.addEventListener('input', onSpecTextareaInput);
  });

  body.querySelectorAll('.logo-card').forEach(card => {
    card.addEventListener('dragover', onLogoDragOver);
    card.addEventListener('dragleave', onLogoDragLeave);
    card.addEventListener('drop', onLogoDrop);
  });

  body.querySelectorAll('[data-enc-mark-type]').forEach(el => el.addEventListener('change', onMarkTypeChange));
  body.querySelectorAll('[data-enc-mark-point]').forEach(el => el.addEventListener('change', onMarkPointChange));
  body.querySelectorAll('[data-enc-field]').forEach(el => el.addEventListener('change', onEncFieldChange));
  body.querySelectorAll('[data-enc-type]').forEach(el => el.addEventListener('change', onEncTypeChange));
  body.querySelectorAll('[data-enc-title]').forEach(el => el.addEventListener('input', onEncTitleInput));

  // Live-sync sidebar header label when typing the poster title
  body.querySelectorAll('input[data-path="header.title"]').forEach(input => {
    input.addEventListener('input', () => {
      const headerRow = document.querySelector('.section-row[data-kind="header"] .section-row-title');
      if (headerRow) headerRow.textContent = input.value || t('sidebar.untitled_poster');
    });
  });
}

function onFieldInput(e) {
  const path = stringToPath(e.target.dataset.path);
  setAtPath(state.config, path, e.target.value);

  // Side-effect: typing into the QR-URL field regenerates the QR SVG.
  // We poke the qr_svg textarea directly because we don't rerender the
  // editor on plain field input (would steal focus from the URL input).
  if (e.target.dataset.qrSource) {
    const svg = generateQR(e.target.value);
    setAtPath(state.config, ['footer', 'contact', 'qr_svg'], svg);
    const ta = document.querySelector('textarea[data-path="footer.contact.qr_svg"]');
    if (ta && ta !== e.target) ta.value = svg;
  }

  refreshPreview();
}

function onChartCellInput(e) {
  const inp = e.target;
  const pathStr = inp.dataset.chartPath;
  const rowIdx = Number(inp.dataset.row);
  const colKey = inp.dataset.col;
  const chart = chartFromPathStr(pathStr);
  if (!chart) return;
  ensureSpec(chart);
  chart.vegaSpec.data = chart.vegaSpec.data || {};
  chart.vegaSpec.data.values = chart.vegaSpec.data.values || [];
  const row = chart.vegaSpec.data.values[rowIdx];
  if (!row) return;
  row[colKey] = coerceCellValue(inp.value);
  refreshPreview();
}

function normalizeMark(spec) {
  if (typeof spec.mark === 'string') spec.mark = { type: spec.mark };
  if (!spec.mark) spec.mark = { type: 'point' };
}

function onMarkTypeChange(e) {
  const pathStr = e.target.dataset.chartPath;
  const chart = chartFromPathStr(pathStr);
  if (!chart) return;
  ensureSpec(chart);
  normalizeMark(chart.vegaSpec);
  chart.vegaSpec.mark.type = e.target.value;
  rerenderEditorAndPreview(); // sub-options depend on mark type
}

function onMarkPointChange(e) {
  const pathStr = e.target.dataset.chartPath;
  const chart = chartFromPathStr(pathStr);
  if (!chart) return;
  ensureSpec(chart);
  normalizeMark(chart.vegaSpec);
  if (e.target.checked) chart.vegaSpec.mark.point = true;
  else delete chart.vegaSpec.mark.point;
  refreshPreview();
}

function onEncFieldChange(e) {
  const pathStr = e.target.dataset.chartPath;
  const channel = e.target.dataset.channel;
  const chart = chartFromPathStr(pathStr);
  if (!chart) return;
  ensureSpec(chart);
  chart.vegaSpec.encoding = chart.vegaSpec.encoding || {};
  const newField = e.target.value;
  if (!newField) {
    delete chart.vegaSpec.encoding[channel];
    rerenderEditorAndPreview();
    return;
  }
  const enc = chart.vegaSpec.encoding[channel] || {};
  enc.field = newField;
  // Re-detect type whenever the field changes — type follows the data.
  const values = chart.vegaSpec.data?.values || [];
  enc.type = detectFieldType(values, newField);
  chart.vegaSpec.encoding[channel] = enc;
  rerenderEditorAndPreview();
}

function onEncTypeChange(e) {
  const pathStr = e.target.dataset.chartPath;
  const channel = e.target.dataset.channel;
  const chart = chartFromPathStr(pathStr);
  if (!chart) return;
  ensureSpec(chart);
  chart.vegaSpec.encoding = chart.vegaSpec.encoding || {};
  const enc = chart.vegaSpec.encoding[channel] || {};
  if (!e.target.value) delete enc.type;
  else enc.type = e.target.value;
  chart.vegaSpec.encoding[channel] = enc;
  refreshPreview();
}

function onEncTitleInput(e) {
  const pathStr = e.target.dataset.chartPath;
  const channel = e.target.dataset.channel;
  const chart = chartFromPathStr(pathStr);
  if (!chart) return;
  ensureSpec(chart);
  chart.vegaSpec.encoding = chart.vegaSpec.encoding || {};
  const enc = chart.vegaSpec.encoding[channel] || {};
  const v = e.target.value;
  if (v === '') delete enc.title;
  else enc.title = v;
  chart.vegaSpec.encoding[channel] = enc;
  refreshPreview();
}

function onSpecTextareaInput(e) {
  const ta = e.target;
  const pathStr = ta.dataset.specTextarea;
  const chart = chartFromPathStr(pathStr);
  if (!chart) return;
  const text = ta.value;
  if (!text.trim()) {
    chart.vegaSpec = '';
    ta.classList.remove('invalid');
    refreshPreview();
    return;
  }
  try {
    chart.vegaSpec = JSON.parse(text);
    ta.classList.remove('invalid');
    refreshPreview();
  } catch {
    ta.classList.add('invalid');
    // Keep last valid spec in chart.vegaSpec; preview unchanged.
  }
}

function onEditorButton(e) {
  const btn = e.currentTarget;
  const action = btn.dataset.action;

  if (action === 'set-chart-tab') {
    setChartTab(btn.dataset.chartPath, btn.dataset.tab);
    rerenderEditorOnly();
    return;
  }

  if (action === 'apply-preset') {
    const pathStr = btn.dataset.chartPath;
    const presetId = btn.dataset.presetId;
    const chart = chartFromPathStr(pathStr);
    if (!chart) return;
    const cur = chart.vegaSpec;
    const hasContent = (typeof cur === 'string' && cur.trim()) ||
      (cur && typeof cur === 'object' && (
        cur.mark || cur.layer ||
        (cur.data && Array.isArray(cur.data.values) && cur.data.values.length)
      ));
    if (hasContent && !confirm(t('editor.chart.preset_overwrite_confirm'))) return;
    const built = buildPreset(presetId);
    if (built) {
      chart.vegaSpec = built;
      // After applying a preset jump straight to the Data tab so the user
      // sees concrete values they'll likely want to edit first.
      setChartTab(pathStr, 'data');
      rerenderEditorAndPreview();
    }
    return;
  }

  if (action === 'parse-csv') {
    const pathStr = btn.dataset.chartPath;
    const ta = document.querySelector(`textarea[data-csv-input="${CSS.escape(pathStr)}"]`);
    if (!ta || !ta.value.trim()) return;
    const { rows } = parseCSV(ta.value);
    if (!rows.length) {
      showToast(t('toast.csv_empty'), 'error');
      return;
    }
    const chart = chartFromPathStr(pathStr);
    if (!chart) return;
    ensureSpec(chart);
    chart.vegaSpec.data = chart.vegaSpec.data || {};
    chart.vegaSpec.data.values = rows;
    autoFillBareSpec(chart);
    rerenderEditorAndPreview();
    return;
  }

  if (action === 'add-row') {
    const pathStr = btn.dataset.chartPath;
    const chart = chartFromPathStr(pathStr);
    if (!chart) return;
    ensureSpec(chart);
    chart.vegaSpec.data = chart.vegaSpec.data || {};
    chart.vegaSpec.data.values = chart.vegaSpec.data.values || [];
    const cols = chart.vegaSpec.data.values[0] ? Object.keys(chart.vegaSpec.data.values[0]) : [];
    const empty = {};
    cols.forEach(c => { empty[c] = null; });
    chart.vegaSpec.data.values.push(empty);
    rerenderEditorAndPreview();
    return;
  }

  if (action === 'add-column') {
    const pathStr = btn.dataset.chartPath;
    const name = (prompt(t('prompt.column_name'), '') || '').trim();
    if (!name) return;
    const chart = chartFromPathStr(pathStr);
    if (!chart) return;
    ensureSpec(chart);
    chart.vegaSpec.data = chart.vegaSpec.data || {};
    chart.vegaSpec.data.values = chart.vegaSpec.data.values || [];
    if (!chart.vegaSpec.data.values.length) chart.vegaSpec.data.values.push({});
    chart.vegaSpec.data.values.forEach(r => { if (!(name in r)) r[name] = null; });
    rerenderEditorAndPreview();
    return;
  }

  if (action === 'delete-row') {
    const pathStr = btn.dataset.chartPath;
    const rowIdx = Number(btn.dataset.row);
    const chart = chartFromPathStr(pathStr);
    if (chart?.vegaSpec?.data?.values) {
      chart.vegaSpec.data.values.splice(rowIdx, 1);
    }
    rerenderEditorAndPreview();
    return;
  }

  if (action === 'delete-column') {
    const pathStr = btn.dataset.chartPath;
    const col = btn.dataset.col;
    const chart = chartFromPathStr(pathStr);
    if (chart?.vegaSpec?.data?.values) {
      chart.vegaSpec.data.values.forEach(r => { delete r[col]; });
    }
    rerenderEditorAndPreview();
    return;
  }

  if (action === 'add-string') {
    const path = stringToPath(btn.dataset.list);
    let arr = getAtPath(state.config, path);
    if (!Array.isArray(arr)) {
      setAtPath(state.config, path, []);
      arr = getAtPath(state.config, path);
    }
    arr.push('');
    rerenderEditorAndPreview();
    return;
  }

  if (action === 'add-author') {
    state.config.header.authors = state.config.header.authors || [];
    state.config.header.authors.push({ name: t('tpl.new_author'), role: '', affiliation: '' });
    rerenderEditorAndPreview();
    return;
  }

  if (action === 'add-logo') {
    state.config.header.logos = state.config.header.logos || [];
    state.config.header.logos.push({ src: '', alt: '' });
    rerenderEditorAndPreview();
    return;
  }

  if (action === 'upload-logo') {
    const idx = Number(btn.dataset.logoIndex);
    triggerLogoFilePicker(idx);
    return;
  }

  if (action === 'add-card') {
    const i = Number(btn.dataset.sectionIndex);
    state.config.sections[i].items.push({ width: 'half', title: t('tpl.new_card'), body: '' });
    rerenderEditorAndPreview();
    return;
  }

  if (action === 'add-row-chart') {
    const i = Number(btn.dataset.sectionIndex);
    state.config.sections[i].charts.push({
      title: t('tpl.new_chart'),
      svg: `<svg viewBox='0 0 400 260' xmlns='http://www.w3.org/2000/svg'><rect width='400' height='260' fill='#f2f6fb'/><text x='200' y='140' text-anchor='middle' font-size='14' fill='#3c5a7a' font-family='Helvetica'>${t('tpl.svg_paste_short')}</text></svg>`,
      caption: ''
    });
    rerenderEditorAndPreview();
    return;
  }

  if (action === 'add-aside-subgroup') {
    const i = Number(btn.dataset.sectionIndex);
    const arr = state.config.sections[i].aside.sections = state.config.sections[i].aside.sections || [];
    arr.push({ title: t('tpl.new_subgroup'), items: [t('tpl.point_one')] });
    rerenderEditorAndPreview();
    return;
  }

  if (action === 'add-finding') {
    const i = Number(btn.dataset.sectionIndex);
    state.config.sections[i].findings.items.push({ title: t('tpl.new_finding'), body: '' });
    rerenderEditorAndPreview();
    return;
  }

  // Generic list controls (up/down/delete)
  if (action === 'up' || action === 'down' || action === 'delete') {
    const path = stringToPath(btn.dataset.list);
    const idx = Number(btn.dataset.index);
    const arr = getAtPath(state.config, path);
    if (!Array.isArray(arr)) return;
    if (action === 'delete') {
      arr.splice(idx, 1);
    } else {
      const dir = action === 'up' ? -1 : 1;
      const ni = idx + dir;
      if (ni < 0 || ni >= arr.length) return;
      [arr[idx], arr[ni]] = [arr[ni], arr[idx]];
    }
    rerenderEditorAndPreview();
    return;
  }
}

/* ---------- Logo upload (button + drag-and-drop) ---------- */

function triggerLogoFilePicker(idx) {
  const fi = document.createElement('input');
  fi.type = 'file';
  fi.accept = 'image/*';
  fi.onchange = (ev) => {
    const file = ev.target.files && ev.target.files[0];
    if (file) readLogoFile(file, idx);
  };
  fi.click();
}

function readLogoFile(file, idx) {
  if (!file.type || !file.type.startsWith('image/')) {
    showToast(t('toast.not_image'), 'error');
    return;
  }
  const reader = new FileReader();
  reader.onload = () => {
    state.config.header.logos = state.config.header.logos || [];
    if (!state.config.header.logos[idx]) state.config.header.logos[idx] = { src: '', alt: '' };
    state.config.header.logos[idx].src = reader.result;
    rerenderEditorAndPreview();
  };
  reader.readAsDataURL(file);
}

function onLogoDragOver(e) {
  if (!e.dataTransfer || !Array.from(e.dataTransfer.items || []).some(it => it.kind === 'file')) return;
  e.preventDefault();
  e.currentTarget.classList.add('drag-over');
}

function onLogoDragLeave(e) {
  e.currentTarget.classList.remove('drag-over');
}

function onLogoDrop(e) {
  e.preventDefault();
  e.currentTarget.classList.remove('drag-over');
  const idx = Number(e.currentTarget.dataset.logoIndex);
  const file = e.dataTransfer.files && e.dataTransfer.files[0];
  if (file) readLogoFile(file, idx);
}

function rerenderEditorAndPreview() {
  const scrollY = document.getElementById('editor-body').scrollTop;
  renderEditor();
  document.getElementById('editor-body').scrollTop = scrollY;
  renderSidebar();
  refreshPreview(true);
}

/** Re-render editor only (no preview rebuild). Used for tab switches. */
function rerenderEditorOnly() {
  const scrollY = document.getElementById('editor-body').scrollTop;
  renderEditor();
  document.getElementById('editor-body').scrollTop = scrollY;
}
