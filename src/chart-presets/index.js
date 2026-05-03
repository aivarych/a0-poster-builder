/**
 * Built-in Vega-Lite presets — starters for common scientific chart types.
 *
 * Each preset is a fresh-object factory: build() returns a new spec every
 * call so we never share mutable state across charts. Sample data lives
 * inside each preset so the user gets a working chart immediately and can
 * just edit values in the Data tab.
 *
 * Adding a preset:
 *   1. Append to PRESETS with { id, labelKey, build }
 *   2. Add a translation under preset.{id}.label in src/i18n/{en,ru}.js
 */

const visapTrajectory = () => ({
  $schema: 'https://vega.github.io/schema/vega-lite/v5.json',
  data: {
    values: [
      { week:  0, score: 65, group: 'Eccentric' },
      { week:  4, score: 58, group: 'Eccentric' },
      { week:  8, score: 42, group: 'Eccentric' },
      { week: 12, score: 28, group: 'Eccentric' },
      { week:  0, score: 67, group: 'HSR' },
      { week:  4, score: 52, group: 'HSR' },
      { week:  8, score: 35, group: 'HSR' },
      { week: 12, score: 22, group: 'HSR' },
    ]
  },
  mark: { type: 'line', point: true, strokeWidth: 3 },
  encoding: {
    x:     { field: 'week',  type: 'quantitative', title: 'Week' },
    y:     { field: 'score', type: 'quantitative', title: 'VISA-P score' },
    color: { field: 'group', type: 'nominal',      title: 'Protocol' },
  },
});

const boxplotByGroup = () => ({
  $schema: 'https://vega.github.io/schema/vega-lite/v5.json',
  data: {
    values: [
      { group: 'Eccentric', value: 28 }, { group: 'Eccentric', value: 32 },
      { group: 'Eccentric', value: 35 }, { group: 'Eccentric', value: 39 },
      { group: 'Eccentric', value: 42 }, { group: 'Eccentric', value: 45 },
      { group: 'Eccentric', value: 48 }, { group: 'Eccentric', value: 51 },
      { group: 'HSR', value: 18 }, { group: 'HSR', value: 22 },
      { group: 'HSR', value: 25 }, { group: 'HSR', value: 28 },
      { group: 'HSR', value: 32 }, { group: 'HSR', value: 36 },
      { group: 'HSR', value: 40 }, { group: 'HSR', value: 45 },
      { group: 'Control', value: 55 }, { group: 'Control', value: 58 },
      { group: 'Control', value: 60 }, { group: 'Control', value: 62 },
      { group: 'Control', value: 64 }, { group: 'Control', value: 67 },
      { group: 'Control', value: 70 }, { group: 'Control', value: 72 },
    ]
  },
  mark: { type: 'boxplot', extent: 1.5 },
  encoding: {
    x:     { field: 'group', type: 'nominal',      title: 'Group' },
    y:     { field: 'value', type: 'quantitative', title: 'VISA-P at week 12' },
    color: { field: 'group', type: 'nominal',      legend: null },
  },
});

const forestPlot = () => ({
  $schema: 'https://vega.github.io/schema/vega-lite/v5.json',
  data: {
    values: [
      { study: 'Study 1 (2018)', mean: 0.45, ci_low: 0.20, ci_high: 0.70 },
      { study: 'Study 2 (2020)', mean: 0.32, ci_low: 0.10, ci_high: 0.54 },
      { study: 'Study 3 (2021)', mean: 0.58, ci_low: 0.34, ci_high: 0.82 },
      { study: 'Study 4 (2023)', mean: 0.41, ci_low: 0.18, ci_high: 0.64 },
      { study: 'Pooled (RE)',    mean: 0.44, ci_low: 0.31, ci_high: 0.57 },
    ]
  },
  encoding: {
    y: { field: 'study', type: 'nominal', sort: null, title: null,
         axis: { labelLimit: 200, labelFontSize: 12 } },
  },
  layer: [
    { mark: { type: 'rule', color: 'gray', strokeDash: [4, 4] },
      encoding: { x: { datum: 0 } } },
    { mark: { type: 'errorbar', ticks: true },
      encoding: {
        x:  { field: 'ci_low',  type: 'quantitative',
              title: 'Effect size (Hedges g)' },
        x2: { field: 'ci_high' },
      } },
    { mark: { type: 'point', filled: true, size: 120, color: '#3c5a7a' },
      encoding: { x: { field: 'mean', type: 'quantitative' } } },
  ],
});

const barWithErrorBars = () => ({
  $schema: 'https://vega.github.io/schema/vega-lite/v5.json',
  data: {
    values: [
      { group: 'Control',    mean: 68, sd: 8 },
      { group: 'Eccentric',  mean: 42, sd: 6 },
      { group: 'HSR',        mean: 38, sd: 7 },
    ]
  },
  transform: [
    { calculate: 'datum.mean - datum.sd', as: 'low'  },
    { calculate: 'datum.mean + datum.sd', as: 'high' },
  ],
  encoding: {
    x: { field: 'group', type: 'ordinal', title: 'Group' },
  },
  layer: [
    { mark: { type: 'bar', color: '#3c5a7a' },
      encoding: { y: { field: 'mean', type: 'quantitative',
                       title: 'VISA-P (mean ± SD)' } } },
    { mark: { type: 'errorbar', color: 'black' },
      encoding: {
        y:  { field: 'low',  type: 'quantitative' },
        y2: { field: 'high' },
      } },
  ],
});

const scatterRegression = () => ({
  $schema: 'https://vega.github.io/schema/vega-lite/v5.json',
  data: {
    values: [
      { x:  1, y:  2.1 }, { x:  2, y:  3.4 }, { x:  3, y:  4.0 },
      { x:  4, y:  5.8 }, { x:  5, y:  6.5 }, { x:  6, y:  7.2 },
      { x:  7, y:  9.1 }, { x:  8, y: 10.0 }, { x:  9, y: 11.5 },
      { x: 10, y: 13.2 }, { x: 11, y: 13.8 }, { x: 12, y: 15.0 },
    ]
  },
  layer: [
    { mark: { type: 'point', filled: true, size: 80, color: '#3c5a7a' },
      encoding: {
        x: { field: 'x', type: 'quantitative', title: 'Predictor' },
        y: { field: 'y', type: 'quantitative', title: 'Outcome' },
      } },
    { mark: { type: 'line', color: '#c0392b', strokeWidth: 2 },
      transform: [{ regression: 'y', on: 'x' }],
      encoding: {
        x: { field: 'x', type: 'quantitative' },
        y: { field: 'y', type: 'quantitative' },
      } },
  ],
});

export const PRESETS = [
  { id: 'visap_trajectory',   labelKey: 'preset.visap.label',      build: visapTrajectory },
  { id: 'boxplot_groups',     labelKey: 'preset.boxplot.label',    build: boxplotByGroup },
  { id: 'forest_plot',        labelKey: 'preset.forest.label',     build: forestPlot },
  { id: 'bar_error',          labelKey: 'preset.bar_error.label',  build: barWithErrorBars },
  { id: 'scatter_regression', labelKey: 'preset.scatter.label',    build: scatterRegression },
];

export function buildPreset(id) {
  const p = PRESETS.find(x => x.id === id);
  return p ? p.build() : null;
}
