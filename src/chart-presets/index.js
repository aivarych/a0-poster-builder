/**
 * Chart preset registry.
 *
 * Each preset is a flat module that exports:
 *   { id, labelKey, descKey, columns, defaultRows, buildSpec(rows, theme) }
 *
 * - columns:     [{ key, labelKey, type: 'number' | 'string' }]
 *                Drives the data-table editor — column count and labels.
 * - defaultRows: starter data when the user picks the preset for the first time.
 * - buildSpec:   takes the user's row array and a resolved theme palette
 *                ({ navy, navyDark, navyLight, accentRed, accentSoft }) and
 *                returns a fresh Vega-Lite spec object. Always uses
 *                font:'Helvetica' and width/height:'container'. Runtime
 *                substitutes 'container' with numeric pixel sizes (toSVG
 *                requires numerics).
 *
 * To add a preset: drop a new file in this folder, import it, push to PRESETS,
 * and add `preset.<id>.{label,desc}` to src/i18n/{en,ru}.js.
 */

import annotatedTimeline  from './annotated_timeline.js';
import lineByGroup        from './line_by_group.js';
import barError           from './bar_error.js';
import boxplot            from './boxplot.js';
import scatterRegression  from './scatter_regression.js';
import forestPlot         from './forest_plot.js';

export const PRESETS = [
  annotatedTimeline,
  lineByGroup,
  barError,
  boxplot,
  scatterRegression,
  forestPlot,
];

/** Returns a preset's column-key → default-label map (derived from columns). */
export function defaultLabelsFor(preset) {
  const out = {};
  for (const c of preset.columns) out[c.key] = c.label;
  return out;
}

/** Resolve a chart's effective labels: preset defaults overlaid with chart.labels. */
export function resolveChartLabels(chart) {
  const preset = getPreset(chart && chart.type);
  if (!preset) return {};
  return Object.assign(defaultLabelsFor(preset), (chart && chart.labels) || {});
}

const BY_ID = Object.fromEntries(PRESETS.map(p => [p.id, p]));

export function getPreset(id) {
  return BY_ID[id] || null;
}

export function presetIds() {
  return PRESETS.map(p => p.id);
}

/** Default preset id for fresh charts (first in list). */
export const DEFAULT_PRESET_ID = PRESETS[0].id;
