export default {
  id: 'boxplot',
  labelKey: 'preset.boxplot.label',
  descKey: 'preset.boxplot.desc',
  columns: [
    { key: 'group', label: 'Group', type: 'string' },
    { key: 'value', label: 'Value', type: 'number' },
  ],
  defaultRows: [
    { group: 'A', value: 28 }, { group: 'A', value: 32 },
    { group: 'A', value: 35 }, { group: 'A', value: 39 },
    { group: 'A', value: 42 }, { group: 'A', value: 45 },
    { group: 'B', value: 18 }, { group: 'B', value: 22 },
    { group: 'B', value: 25 }, { group: 'B', value: 28 },
    { group: 'B', value: 32 }, { group: 'B', value: 36 },
    { group: 'C', value: 55 }, { group: 'C', value: 58 },
    { group: 'C', value: 60 }, { group: 'C', value: 62 },
    { group: 'C', value: 64 }, { group: 'C', value: 67 },
  ],
  buildSpec: function (rows, theme, labels) {
    var clean = rows.filter(function (r) { return r && r.group != null && r.group !== '' && r.value != null; });
    return {
      $schema: 'https://vega.github.io/schema/vega-lite/v5.json',
      width: 'container',
      height: 'container',
      background: 'transparent',
      config: { font: 'Helvetica', view: { stroke: null } },
      data: { values: clean },
      mark: { type: 'boxplot', extent: 1.5, color: theme.navy, median: { color: theme.accentRed } },
      encoding: {
        x: { field: 'group', type: 'nominal', title: labels.group, sort: null },
        y: { field: 'value', type: 'quantitative', title: labels.value },
        color: {
          field: 'group', type: 'nominal', legend: null,
          scale: { range: [theme.navy, theme.accentRed, theme.navyDark, theme.accentSoft] },
        },
      },
    };
  },
};
