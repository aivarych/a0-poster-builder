export default {
  id: 'line_by_group',
  labelKey: 'preset.line_by_group.label',
  descKey: 'preset.line_by_group.desc',
  columns: [
    { key: 'x',     label: 'X',     type: 'number' },
    { key: 'y',     label: 'Y',     type: 'number' },
    { key: 'group', label: 'Group', type: 'string' },
  ],
  defaultRows: [
    { x:  0, y: 65, group: 'A' }, { x:  4, y: 58, group: 'A' },
    { x:  8, y: 42, group: 'A' }, { x: 12, y: 28, group: 'A' },
    { x:  0, y: 67, group: 'B' }, { x:  4, y: 52, group: 'B' },
    { x:  8, y: 35, group: 'B' }, { x: 12, y: 22, group: 'B' },
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
      mark: { type: 'line', point: { filled: true, size: 70 }, strokeWidth: 3 },
      encoding: {
        x: { field: 'x', type: 'quantitative', title: labels.x },
        y: { field: 'y', type: 'quantitative', title: labels.y },
        color: {
          field: 'group', type: 'nominal', title: labels.group,
          scale: { range: [theme.navy, theme.accentRed, theme.navyDark, theme.accentSoft] },
        },
      },
    };
  },
};
