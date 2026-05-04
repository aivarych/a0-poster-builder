export default {
  id: 'scatter_regression',
  labelKey: 'preset.scatter_regression.label',
  descKey: 'preset.scatter_regression.desc',
  columns: [
    { key: 'x', label: 'X', type: 'number' },
    { key: 'y', label: 'Y', type: 'number' },
  ],
  defaultRows: [
    { x:  1, y:  2.1 }, { x:  2, y:  3.4 }, { x:  3, y:  4.0 },
    { x:  4, y:  5.8 }, { x:  5, y:  6.5 }, { x:  6, y:  7.2 },
    { x:  7, y:  9.1 }, { x:  8, y: 10.0 }, { x:  9, y: 11.5 },
    { x: 10, y: 13.2 }, { x: 11, y: 13.8 }, { x: 12, y: 15.0 },
  ],
  buildSpec: function (rows, theme, labels) {
    var clean = rows.filter(function (r) { return r && r.x != null && r.y != null; });
    return {
      $schema: 'https://vega.github.io/schema/vega-lite/v5.json',
      width: 'container',
      height: 'container',
      background: 'transparent',
      config: { font: 'Helvetica', view: { stroke: null } },
      data: { values: clean },
      layer: [
        { mark: { type: 'point', filled: true, size: 80, color: theme.navy },
          encoding: {
            x: { field: 'x', type: 'quantitative', title: labels.x },
            y: { field: 'y', type: 'quantitative', title: labels.y },
          } },
        { mark: { type: 'line', color: theme.accentRed, strokeWidth: 2 },
          transform: [{ regression: 'y', on: 'x' }],
          encoding: {
            x: { field: 'x', type: 'quantitative' },
            y: { field: 'y', type: 'quantitative' },
          } },
      ],
    };
  },
};
