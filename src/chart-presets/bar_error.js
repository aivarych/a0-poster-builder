export default {
  id: 'bar_error',
  labelKey: 'preset.bar_error.label',
  descKey: 'preset.bar_error.desc',
  columns: [
    { key: 'category', label: 'Category', type: 'string' },
    { key: 'mean',     label: 'Mean',     type: 'number' },
    { key: 'sd',       label: 'SD',       type: 'number' },
  ],
  defaultRows: [
    { category: 'Control',   mean: 68, sd: 8 },
    { category: 'Treatment', mean: 42, sd: 6 },
    { category: 'Combined',  mean: 38, sd: 7 },
  ],
  buildSpec: function (rows, theme, labels) {
    var clean = rows
      .filter(function (r) { return r && r.category != null && r.category !== '' && r.mean != null; })
      .map(function (r) { return Object.assign({}, r, { sd: r.sd != null ? r.sd : 0 }); });
    return {
      $schema: 'https://vega.github.io/schema/vega-lite/v5.json',
      width: 'container',
      height: 'container',
      background: 'transparent',
      config: { font: 'Helvetica', view: { stroke: null } },
      data: { values: clean },
      transform: [
        { calculate: 'datum.mean - datum.sd', as: 'low'  },
        { calculate: 'datum.mean + datum.sd', as: 'high' },
      ],
      encoding: { x: { field: 'category', type: 'ordinal', title: labels.category, sort: null } },
      layer: [
        { mark: { type: 'bar', color: theme.navy, size: 48 },
          encoding: { y: { field: 'mean', type: 'quantitative', title: labels.mean + ' ± ' + labels.sd } } },
        { mark: { type: 'errorbar', ticks: true, color: theme.navyDark },
          encoding: {
            y:  { field: 'low',  type: 'quantitative' },
            y2: { field: 'high' },
          } },
      ],
    };
  },
};
