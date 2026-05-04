/**
 * One-shot migration of legacy chart objects into the new {mode, ...} schema.
 *
 * Old shape: { title, caption, svg?, vegaSpec? }
 * New shape: { title, caption, mode, type?, rows?, specOverride?, svg? }
 *
 * Rules (first match wins):
 *   1. Non-empty `svg`        → mode:'svg', keeps svg as-is
 *   2. Non-empty `vegaSpec`   → mode:'spec', specOverride = pretty JSON of the spec
 *   3. else                   → mode:'builder', type=DEFAULT_PRESET_ID, rows=[]
 *
 * Mutates the chart objects in place. After migration the legacy fields
 * (`vegaSpec`, the unused alternative of svg/spec) are removed so subsequent
 * loads find a clean shape.
 *
 * Called from every entry point that brings a config into state (initial
 * load, project switch, JSON import, bundle import).
 */

import { DEFAULT_PRESET_ID } from './chart-presets/index.js';

function migrateChart(chart) {
  if (!chart || typeof chart !== 'object') return;

  // Rename: altitude_profile → annotated_timeline, with row-key remap
  // (old keys day/altitude → new keys time/value; event stays).
  if (chart.type === 'altitude_profile') {
    chart.type = 'annotated_timeline';
    if (Array.isArray(chart.rows)) {
      chart.rows = chart.rows.map(r => {
        if (!r || typeof r !== 'object') return r;
        const out = { ...r };
        if ('day'      in r && !('time'  in r)) { out.time  = r.day;      delete out.day; }
        if ('altitude' in r && !('value' in r)) { out.value = r.altitude; delete out.altitude; }
        return out;
      });
    }
  }

  if (chart.mode === 'builder' || chart.mode === 'spec' || chart.mode === 'svg') {
    // Already in new shape — just ensure required fields exist.
    if (chart.mode === 'builder') {
      if (!chart.type) chart.type = DEFAULT_PRESET_ID;
      if (!Array.isArray(chart.rows)) chart.rows = [];
    }
    return;
  }

  const hasSvg = typeof chart.svg === 'string' && chart.svg.trim() !== '';
  const hasSpec = chart.vegaSpec != null && (
    typeof chart.vegaSpec === 'string'
      ? chart.vegaSpec.trim() !== ''
      : (typeof chart.vegaSpec === 'object' && Object.keys(chart.vegaSpec).length > 0)
  );

  if (hasSvg) {
    chart.mode = 'svg';
    delete chart.vegaSpec;
    chart.specOverride = null;
    chart.type = chart.type || DEFAULT_PRESET_ID;
    chart.rows = [];
  } else if (hasSpec) {
    chart.mode = 'spec';
    let specText = '';
    if (typeof chart.vegaSpec === 'string') specText = chart.vegaSpec;
    else { try { specText = JSON.stringify(chart.vegaSpec, null, 2); } catch { specText = ''; } }
    chart.specOverride = specText;
    chart.svg = null;
    chart.type = chart.type || DEFAULT_PRESET_ID;
    chart.rows = [];
    delete chart.vegaSpec;
  } else {
    chart.mode = 'builder';
    chart.type = chart.type || DEFAULT_PRESET_ID;
    chart.rows = Array.isArray(chart.rows) ? chart.rows : [];
    chart.specOverride = null;
    chart.svg = null;
    delete chart.vegaSpec;
  }
}

export function migrateConfig(config) {
  if (!config || !Array.isArray(config.sections)) return config;
  for (const sec of config.sections) {
    if (!sec || typeof sec !== 'object') continue;
    if (sec.type === 'chart_with_aside' && sec.chart) {
      migrateChart(sec.chart);
    } else if (sec.type === 'charts_row' && Array.isArray(sec.charts)) {
      for (const ch of sec.charts) migrateChart(ch);
    }
  }
  return config;
}
