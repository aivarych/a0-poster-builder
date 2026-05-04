export default {
  id: 'annotated_timeline',
  labelKey: 'preset.annotated_timeline.label',
  descKey: 'preset.annotated_timeline.desc',
  columns: [
    { key: 'time',  label: 'Day',              type: 'number' },
    { key: 'value', label: 'Altitude (m)',     type: 'number' },
    { key: 'event', label: 'Event (optional)', type: 'string' },
  ],
  defaultRows: [
    { time:  0, value:  500, event: 'Mendoza' },
    { time:  1, value: 2900, event: 'Penitentes' },
    { time:  2, value: 3300, event: 'Confluencia' },
    { time:  4, value: 4300, event: 'Plaza de Mulas' },
    { time:  6, value: 5050, event: 'Nido de Cóndores' },
    { time:  8, value: 5900, event: 'Cólera' },
    { time:  9, value: 6962, event: 'Summit' },
  ],
  buildSpec: function (rows, theme, labels) {
    var clean = rows.filter(function (r) { return r && r.time != null && r.value != null; });
    return {
      $schema: 'https://vega.github.io/schema/vega-lite/v5.json',
      width: 'container',
      height: 'container',
      background: 'transparent',
      config: { font: 'Helvetica', view: { stroke: null } },
      data: { values: clean },
      layer: [
        { mark: { type: 'area', color: theme.navy, opacity: 0.18, line: false },
          encoding: {
            x: { field: 'time', type: 'quantitative', title: labels.time },
            y: { field: 'value', type: 'quantitative', title: labels.value },
          } },
        { mark: { type: 'line', color: theme.navy, strokeWidth: 3 },
          encoding: {
            x: { field: 'time', type: 'quantitative' },
            y: { field: 'value', type: 'quantitative' },
          } },
        { mark: { type: 'point', filled: true, size: 80, color: theme.accentRed },
          encoding: {
            x: { field: 'time', type: 'quantitative' },
            y: { field: 'value', type: 'quantitative' },
          } },
        { transform: [{ filter: "datum.event != null && datum.event !== ''" }],
          mark: { type: 'text', dy: -12, fontSize: 11, fontWeight: 600, color: theme.navyDark },
          encoding: {
            x: { field: 'time', type: 'quantitative' },
            y: { field: 'value', type: 'quantitative' },
            text: { field: 'event', type: 'nominal' },
          } },
      ],
    };
  },
};
