/**
 * Section type registry.
 * Adding a new section type means:
 *   1. Add the id to SECTION_TYPES (rendered in "+ Add section" menu)
 *   2. Add label/desc keys under section_type.{id}.* to src/i18n/{en,ru}.js
 *   3. Add a starter to SECTION_TEMPLATES (factory returning a fresh section object)
 *   4. Add a renderer in poster-runtime/runtime.js (sectionRenderers[type])
 *   5. Add an editor in src/editor.js (sectionEditorRenderers[type])
 *
 * The five concerns are intentionally decoupled — each lives in its own module.
 *
 * NB: template strings come from i18n (tpl.*). They produce CONTENT that ends
 * up in saved projects; subsequent locale switches do NOT retranslate them
 * (and shouldn't — the user immediately edits these placeholders).
 */

import { t } from './i18n/index.js';
import { getPreset } from './chart-presets/index.js';

/** Fresh chart object in 'builder' mode with the preset's defaultRows seeded. */
export function makeBuilderChart(presetId, title, caption) {
  const preset = getPreset(presetId);
  return {
    title: title || '',
    caption: caption || '',
    mode: 'builder',
    type: presetId,
    rows: preset ? preset.defaultRows.map(r => ({ ...r })) : [],
    labels: {},
    specOverride: null,
    svg: null,
  };
}

export const SECTION_TYPES = [
  'intro_row',
  'case_grid',
  'chart_with_aside',
  'charts_row',
  'findings_block',
];

export function getSectionLabel(type) {
  return t(`section_type.${type}.label`);
}

export function getSectionDesc(type) {
  return t(`section_type.${type}.desc`);
}

export const SECTION_TEMPLATES = {
  intro_row: () => ({
    type: 'intro_row',
    columns: [
      { width: 'wide',   title: t('tpl.section_title'), paragraphs: [t('tpl.lead_paragraph')] },
      { width: 'narrow', title: t('tpl.side_panel'),    paragraphs: [t('tpl.short_complementary')] }
    ]
  }),
  case_grid: () => ({
    type: 'case_grid',
    title: t('tpl.section_title'),
    items: [
      { width: 'half', title: t('tpl.card_a'), body: t('tpl.card_a_body') },
      { width: 'half', title: t('tpl.card_b'), body: t('tpl.card_b_body') }
    ]
  }),
  chart_with_aside: () => ({
    type: 'chart_with_aside',
    chart: makeBuilderChart('annotated_timeline', t('tpl.figure_title'), t('tpl.figure_caption')),
    aside: {
      title: t('tpl.aside_title'),
      icon: '!',
      sections: [
        { title: t('tpl.subgroup_a'), items: [t('tpl.point_one'), t('tpl.point_two')] }
      ],
      outcome: t('tpl.outcome_statement')
    }
  }),
  charts_row: () => ({
    type: 'charts_row',
    title: t('tpl.section_title'),
    charts: [
      makeBuilderChart('line_by_group', t('tpl.figure_a'), t('tpl.caption_a')),
      makeBuilderChart('bar_error',     t('tpl.figure_b'), t('tpl.caption_b')),
    ]
  }),
  findings_block: () => ({
    type: 'findings_block',
    findings: {
      title: t('tpl.key_findings'),
      items: [
        { title: t('tpl.finding_one_title'), body: t('tpl.finding_one_body') },
        { title: t('tpl.finding_two_title'), body: t('tpl.finding_two_body') }
      ]
    },
    limitations: {
      title: t('tpl.limitations_title'),
      items: [t('tpl.limitation_one'), t('tpl.limitation_two')]
    },
    takehome: {
      title: t('tpl.takehome_title'),
      items: [t('tpl.takehome_one'), t('tpl.takehome_two')]
    }
  })
};
