export default {
  id: 'forest_plot',
  labelKey: 'preset.forest_plot.label',
  descKey: 'preset.forest_plot.desc',
  columns: [
    { key: 'study',   label: 'Study',   type: 'string' },
    { key: 'effect',  label: 'Effect',  type: 'number' },
    { key: 'ci_low',  label: 'CI low',  type: 'number' },
    { key: 'ci_high', label: 'CI high', type: 'number' },
  ],
  defaultRows: [
    { study: 'Study 1 (2018)', effect: 0.45, ci_low: 0.20, ci_high: 0.70 },
    { study: 'Study 2 (2020)', effect: 0.32, ci_low: 0.10, ci_high: 0.54 },
    { study: 'Study 3 (2021)', effect: 0.58, ci_low: 0.34, ci_high: 0.82 },
    { study: 'Study 4 (2023)', effect: 0.41, ci_low: 0.18, ci_high: 0.64 },
    { study: 'Pooled (RE)',    effect: 0.44, ci_low: 0.31, ci_high: 0.57 },
  ],
  buildSpec: function (rows, theme, labels) {
    var clean = rows.filter(function (r) {
      return r && r.study != null && r.study !== '' && r.effect != null;
    });
    return {
      $schema: 'https://vega.github.io/schema/vega-lite/v5.json',
      width: 'container',
      height: 'container',
      background: 'transparent',
      config: { font: 'Helvetica', view: { stroke: null } },
      data: { values: clean },
      encoding: {
        y: { field: 'study', type: 'nominal', sort: null, title: labels.study,
             axis: { labelLimit: 200, labelFontSize: 12 } },
      },
      layer: [
        { mark: { type: 'rule', color: theme.navyLight, strokeDash: [4, 4] },
          encoding: { x: { datum: 0 } } },
        { mark: { type: 'errorbar', ticks: true, color: theme.navyDark },
          encoding: {
            x:  { field: 'ci_low',  type: 'quantitative', title: labels.effect },
            x2: { field: 'ci_high' },
          } },
        { mark: { type: 'point', filled: true, size: 140, color: theme.accentRed },
          encoding: { x: { field: 'effect', type: 'quantitative' } } },
      ],
    };
  },
};
