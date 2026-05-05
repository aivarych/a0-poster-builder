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
  showToast
} from './utils.js';
import { refreshPreview } from './preview.js';
import { renderSidebar } from './sidebar.js';
import { t } from './i18n/index.js';
import { PRESETS, getPreset, DEFAULT_PRESET_ID, defaultLabelsFor, resolveChartLabels } from './chart-presets/index.js';
import { makeBuilderChart } from './section-types.js';
import { generateQR } from './qr.js';

/* ---------- Chart-editor helpers (used by chart_with_aside / charts_row) ----------
 *
 * Schema: chart = { title, caption, mode, type, rows, specOverride, svg }
 *   mode='builder'  → rows seed a preset (selected by `type`) → live spec
 *   mode='spec'     → specOverride (raw Vega-Lite JSON text) is parsed & rendered
 *   mode='svg'      → svg string is dropped into the slot as-is
 *
 * Only the field matching the active mode is consulted. The runtime never
 * falls back across modes.
 */

function chartFromPathStr(pathStr) {
  return getAtPath(state.config, stringToPath(pathStr));
}

/** Parse a cell input into number/null/string per the column type. */
function coerceCellValue(raw, colType) {
  const s = String(raw).trim();
  if (s === '') return null;
  if (colType === 'number') {
    if (/^-?\d*\.?\d+(e[+-]?\d+)?$/i.test(s)) {
      const n = Number(s);
      if (!isNaN(n)) return n;
    }
    return s; // keep raw string so the user sees their typo, doesn't silently swallow
  }
  return s;
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

/* ---------- Chart editor (single primary path + Advanced disclosure) ---------- */

function renderChartEditor(pathStr, chart) {
  const mode = chart.mode || 'builder';
  if (mode === 'svg')   return renderChartSvgMode(pathStr, chart);
  if (mode === 'spec')  return renderChartSpecMode(pathStr, chart);
  return renderChartBuilderMode(pathStr, chart);
}

function renderChartBuilderMode(pathStr, chart) {
  const presetId = chart.type || DEFAULT_PRESET_ID;
  const preset = getPreset(presetId) || getPreset(DEFAULT_PRESET_ID);
  const rows = Array.isArray(chart.rows) ? chart.rows : [];

  const typeOpts = PRESETS.map(p =>
    `<option value="${p.id}" ${p.id === presetId ? 'selected' : ''}>${escapeHtml(t(p.labelKey))}</option>`
  ).join('');

  const desc = preset.descKey ? `<div class="chart-preset-desc">${escapeHtml(t(preset.descKey))}</div>` : '';

  const labels = resolveChartLabels(chart);

  const headers = preset.columns.map(c => `
    <th>
      <div class="col-header-inner">
        <input type="text"
               class="col-label-input"
               data-chart-label="1"
               data-chart-path="${escapeAttr(pathStr)}"
               data-col-key="${escapeAttr(c.key)}"
               value="${escapeAttr(labels[c.key] || '')}"
               title="${escapeAttr(t('editor.chart.label_tooltip'))}">
        <span class="col-type">${escapeHtml(c.type === 'number' ? '#' : 'a')}</span>
      </div>
    </th>
  `).join('');

  const body = rows.length ? rows.map((row, i) => `
    <tr>
      ${preset.columns.map(c => `
        <td><input type="text"
                   data-chart-cell="1"
                   data-chart-path="${escapeAttr(pathStr)}"
                   data-row="${i}"
                   data-col="${escapeAttr(c.key)}"
                   data-col-type="${escapeAttr(c.type)}"
                   value="${escapeAttr(row[c.key] != null ? String(row[c.key]) : '')}"></td>
      `).join('')}
      <td class="row-del-cell"><button class="row-del" data-action="delete-row" data-chart-path="${escapeAttr(pathStr)}" data-row="${i}" title="${escapeAttr(t('sidebar.delete'))}">✕</button></td>
    </tr>
  `).join('') : `
    <tr><td colspan="${preset.columns.length + 1}" class="chart-data-empty">${escapeHtml(t('editor.chart.no_rows'))}</td></tr>
  `;

  return `
    <div class="chart-editor">
      <div class="chart-type-row">
        <label class="chart-type-label">${escapeHtml(t('editor.chart.type_label'))}</label>
        <select class="chart-type-select"
                data-action="change-chart-type"
                data-chart-path="${escapeAttr(pathStr)}">${typeOpts}</select>
      </div>
      ${desc}
      <div class="chart-data-table">
        <table>
          <thead><tr>${headers}<th class="row-del-cell"></th></tr></thead>
          <tbody>${body}</tbody>
        </table>
      </div>
      <div class="chart-data-actions">
        <button class="add-item-btn"
                data-action="add-row"
                data-chart-path="${escapeAttr(pathStr)}">+ ${escapeHtml(t('editor.chart.add_row'))}</button>
      </div>
      ${renderAdvancedDisclosure(pathStr, chart, 'builder')}
    </div>
  `;
}

function renderChartSpecMode(pathStr, chart) {
  const txt = typeof chart.specOverride === 'string' ? chart.specOverride : '';
  return `
    <div class="chart-editor">
      <div class="chart-mode-banner">
        <span class="banner-text">${escapeHtml(t('editor.chart.spec_banner'))}</span>
        <button class="banner-btn"
                data-action="exit-chart-mode"
                data-chart-path="${escapeAttr(pathStr)}">${escapeHtml(t('editor.chart.back_to_builder'))}</button>
      </div>
      <div class="field">
        <label class="field-label">${escapeHtml(t('editor.field.vega_spec'))}</label>
        <textarea class="chart-spec-input code-input"
                  data-spec-textarea="${escapeAttr(pathStr)}"
                  rows="16"
                  spellcheck="false">${escapeHtml(txt)}</textarea>
      </div>
    </div>
  `;
}

function renderChartSvgMode(pathStr, chart) {
  const path = stringToPath(pathStr);
  const svgPath = [...path, 'svg'];
  const v = chart.svg || '';
  return `
    <div class="chart-editor">
      <div class="chart-mode-banner">
        <span class="banner-text">${escapeHtml(t('editor.chart.svg_banner'))}</span>
        <button class="banner-btn"
                data-action="exit-chart-mode"
                data-chart-path="${escapeAttr(pathStr)}">${escapeHtml(t('editor.chart.back_to_builder'))}</button>
      </div>
      <div class="field">
        <label class="field-label">${escapeHtml(t('editor.field.svg_full'))} <span class="field-hint">${escapeHtml(t('editor.hint.viewbox'))}</span></label>
        <textarea class="svg-input" rows="10" data-path="${pathToString(svgPath)}">${escapeHtml(v)}</textarea>
      </div>
    </div>
  `;
}

function renderAdvancedDisclosure(pathStr, chart, currentMode) {
  return `
    <details class="chart-advanced">
      <summary>${escapeHtml(t('editor.chart.advanced'))}</summary>
      <div class="chart-advanced-body">
        <button class="advanced-action"
                data-action="enter-spec-mode"
                data-chart-path="${escapeAttr(pathStr)}">
          <span class="advanced-action-title">${escapeHtml(t('editor.chart.enter_spec'))}</span>
          <span class="advanced-action-desc">${escapeHtml(t('editor.chart.enter_spec_desc'))}</span>
        </button>
        <button class="advanced-action"
                data-action="enter-svg-mode"
                data-chart-path="${escapeAttr(pathStr)}">
          <span class="advanced-action-title">${escapeHtml(t('editor.chart.enter_svg'))}</span>
          <span class="advanced-action-desc">${escapeHtml(t('editor.chart.enter_svg_desc'))}</span>
        </button>
      </div>
    </details>
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

  body.querySelectorAll('input[data-chart-label]').forEach(inp => {
    inp.addEventListener('input', onChartLabelInput);
  });

  body.querySelectorAll('textarea[data-spec-textarea]').forEach(ta => {
    ta.addEventListener('input', onSpecTextareaInput);
  });

  body.querySelectorAll('.logo-card').forEach(card => {
    card.addEventListener('dragover', onLogoDragOver);
    card.addEventListener('dragleave', onLogoDragLeave);
    card.addEventListener('drop', onLogoDrop);
  });

  body.querySelectorAll('select[data-action="change-chart-type"]').forEach(sel => {
    sel.addEventListener('change', onChartTypeChange);
  });

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
  const colType = inp.dataset.colType || 'string';
  const chart = chartFromPathStr(pathStr);
  if (!chart || !Array.isArray(chart.rows)) return;
  const row = chart.rows[rowIdx];
  if (!row) return;
  row[colKey] = coerceCellValue(inp.value, colType);
  refreshPreview();
}

function onChartLabelInput(e) {
  const inp = e.target;
  const pathStr = inp.dataset.chartPath;
  const colKey = inp.dataset.colKey;
  const chart = chartFromPathStr(pathStr);
  if (!chart) return;
  if (!chart.labels || typeof chart.labels !== 'object') chart.labels = {};
  chart.labels[colKey] = inp.value;
  refreshPreview();
}

function onSpecTextareaInput(e) {
  const ta = e.target;
  const pathStr = ta.dataset.specTextarea;
  const chart = chartFromPathStr(pathStr);
  if (!chart) return;
  const text = ta.value;
  chart.specOverride = text;
  if (!text.trim()) {
    ta.classList.remove('invalid');
    refreshPreview();
    return;
  }
  try {
    JSON.parse(text);
    ta.classList.remove('invalid');
    refreshPreview();
  } catch {
    ta.classList.add('invalid');
    // Keep specOverride raw; runtime will catch parse errors and surface them.
  }
}

function onChartTypeChange(e) {
  const sel = e.target;
  const pathStr = sel.dataset.chartPath;
  const newType = sel.value;
  const chart = chartFromPathStr(pathStr);
  if (!chart) return;
  if (chart.type === newType) return;

  const hadRows = Array.isArray(chart.rows) && chart.rows.length > 0;
  if (hadRows && !confirm(t('editor.chart.type_switch_confirm'))) {
    sel.value = chart.type;
    return;
  }
  const preset = getPreset(newType);
  if (!preset) return;
  chart.type = newType;
  chart.rows = preset.defaultRows.map(r => ({ ...r }));
  // Column keys differ between presets; old label overrides no longer apply.
  chart.labels = {};
  rerenderEditorAndPreview();
}

function onEditorButton(e) {
  const btn = e.currentTarget;
  const action = btn.dataset.action;

  if (action === 'enter-spec-mode') {
    const pathStr = btn.dataset.chartPath;
    const chart = chartFromPathStr(pathStr);
    if (!chart) return;
    if (!chart.specOverride) {
      // Seed the textarea with the spec the builder is currently producing,
      // so the user can tweak from a working baseline.
      const preset = getPreset(chart.type) || getPreset(DEFAULT_PRESET_ID);
      const seed = preset ? preset.buildSpec(chart.rows || [], { navy: '#3c5a7a', navyDark: '#2e4661', navyLight: '#e4ecf4', accentRed: '#c0392b', accentSoft: '#f4d9d5' }) : {};
      chart.specOverride = JSON.stringify(seed, null, 2);
    }
    chart.mode = 'spec';
    rerenderEditorAndPreview();
    return;
  }

  if (action === 'enter-svg-mode') {
    const pathStr = btn.dataset.chartPath;
    const chart = chartFromPathStr(pathStr);
    if (!chart) return;
    chart.mode = 'svg';
    if (chart.svg == null) chart.svg = '';
    rerenderEditorAndPreview();
    return;
  }

  if (action === 'exit-chart-mode') {
    const pathStr = btn.dataset.chartPath;
    const chart = chartFromPathStr(pathStr);
    if (!chart) return;
    if (!confirm(t('editor.chart.exit_mode_confirm'))) return;
    chart.mode = 'builder';
    chart.specOverride = null;
    chart.svg = null;
    if (!chart.type) chart.type = DEFAULT_PRESET_ID;
    if (!Array.isArray(chart.rows) || !chart.rows.length) {
      const preset = getPreset(chart.type) || getPreset(DEFAULT_PRESET_ID);
      chart.rows = preset ? preset.defaultRows.map(r => ({ ...r })) : [];
    }
    rerenderEditorAndPreview();
    return;
  }

  if (action === 'add-row') {
    const pathStr = btn.dataset.chartPath;
    const chart = chartFromPathStr(pathStr);
    if (!chart) return;
    const preset = getPreset(chart.type) || getPreset(DEFAULT_PRESET_ID);
    if (!preset) return;
    chart.rows = Array.isArray(chart.rows) ? chart.rows : [];
    const empty = {};
    preset.columns.forEach(c => { empty[c.key] = null; });
    chart.rows.push(empty);
    rerenderEditorAndPreview();
    return;
  }

  if (action === 'delete-row') {
    const pathStr = btn.dataset.chartPath;
    const rowIdx = Number(btn.dataset.row);
    const chart = chartFromPathStr(pathStr);
    if (chart && Array.isArray(chart.rows)) {
      chart.rows.splice(rowIdx, 1);
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
    state.config.sections[i].charts.push(makeBuilderChart('line_by_group', t('tpl.new_chart'), ''));
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

