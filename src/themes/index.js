/**
 * Color theme registry.
 *
 * Themes override the CSS custom properties already declared in
 * poster-runtime/poster.css :root — no changes to poster.css are required.
 * The override block is appended AFTER posterCss in buildPosterHTML so it
 * wins by source order.
 *
 * The 'custom' preset reads its vars from config.themeCustom (which the
 * toolbar palette editor writes to). Missing keys fall back to navy_red.
 *
 * Schema in config:
 *   config.theme       — preset id ('navy_red' | 'teal_orange' | … | 'custom')
 *   config.themeCustom — { '--navy': '#…', … } — only when theme === 'custom'
 *                         (kept around even if user switches to a preset, so
 *                          coming back to Custom restores their last palette)
 *
 * Layout-affecting vars (--text, --border, --white) stay shared across themes;
 * themes change the *color story*, not contrast/typography.
 */

export const DEFAULT_THEME = 'navy_red';

export const THEME_VAR_KEYS = [
  '--navy',
  '--navy-dark',
  '--navy-light',
  '--navy-lighter',
  '--accent-red',
  '--accent-soft',
];

/** ordered (var, i18n key) pairs for the palette editor labels */
export const THEME_VAR_LABEL_KEYS = [
  ['--navy',         'theme.var.navy'],
  ['--navy-dark',    'theme.var.navy_dark'],
  ['--navy-light',   'theme.var.navy_light'],
  ['--navy-lighter', 'theme.var.navy_lighter'],
  ['--accent-red',   'theme.var.accent_red'],
  ['--accent-soft',  'theme.var.accent_soft'],
];

export const THEMES = {
  navy_red: {
    vars: {
      '--navy':         '#3c5a7a',
      '--navy-dark':    '#2e4661',
      '--navy-light':   '#e4ecf4',
      '--navy-lighter': '#f2f6fb',
      '--accent-red':   '#c0392b',
      '--accent-soft':  '#f4d9d5',
    },
  },
  teal_orange: {
    vars: {
      '--navy':         '#0f766e',
      '--navy-dark':    '#115e59',
      '--navy-light':   '#ccfbf1',
      '--navy-lighter': '#f0fdfa',
      '--accent-red':   '#ea580c',
      '--accent-soft':  '#fed7aa',
    },
  },
  monochrome: {
    vars: {
      '--navy':         '#1f2937',
      '--navy-dark':    '#111827',
      '--navy-light':   '#e5e7eb',
      '--navy-lighter': '#f3f4f6',
      '--accent-red':   '#4b5563',
      '--accent-soft':  '#d1d5db',
    },
  },
  warm_rust: {
    vars: {
      '--navy':         '#7c2d12',
      '--navy-dark':    '#581c0f',
      '--navy-light':   '#fef3c7',
      '--navy-lighter': '#fffbeb',
      '--accent-red':   '#b45309',
      '--accent-soft':  '#fde68a',
    },
  },
  /** 'custom' is a marker — actual vars come from config.themeCustom */
  custom: {
    vars: { ...{
      '--navy':         '#3c5a7a',
      '--navy-dark':    '#2e4661',
      '--navy-light':   '#e4ecf4',
      '--navy-lighter': '#f2f6fb',
      '--accent-red':   '#c0392b',
      '--accent-soft':  '#f4d9d5',
    } },
  },
};

export function listThemeIds() {
  return Object.keys(THEMES);
}

/**
 * Resolve the active palette for a config. Custom reads from config.themeCustom
 * with per-key fallback to navy_red so partial customisations remain valid.
 */
export function getThemeVars(config) {
  const id = (config && config.theme) || DEFAULT_THEME;
  if (id === 'custom') {
    const fallback = THEMES[DEFAULT_THEME].vars;
    const overrides = (config && config.themeCustom) || {};
    const out = {};
    for (const k of THEME_VAR_KEYS) out[k] = overrides[k] || fallback[k];
    return out;
  }
  return (THEMES[id] || THEMES[DEFAULT_THEME]).vars;
}

/**
 * CSS string injected into the exported poster's <style> AFTER posterCss.
 * Returns a `:root { … }` block; safe to embed verbatim.
 */
export function buildThemeCSS(config) {
  const vars = getThemeVars(config);
  const decls = Object.entries(vars).map(([k, v]) => `${k}:${v};`).join('');
  return `:root{${decls}}`;
}
