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
    chart: {
      title: t('tpl.figure_title'),
      svg: `<svg viewBox='0 0 1200 540' xmlns='http://www.w3.org/2000/svg'><rect width='1200' height='540' fill='#f2f6fb'/><text x='600' y='280' text-anchor='middle' font-size='40' fill='#3c5a7a' font-family='Helvetica'>${t('tpl.svg_paste')}</text></svg>`,
      caption: t('tpl.figure_caption')
    },
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
      { title: t('tpl.figure_a'), svg: `<svg viewBox='0 0 400 260' xmlns='http://www.w3.org/2000/svg'><rect width='400' height='260' fill='#f2f6fb'/><text x='200' y='140' text-anchor='middle' font-size='16' fill='#3c5a7a' font-family='Helvetica'>${t('tpl.svg_placeholder')}</text></svg>`, caption: t('tpl.caption_a') },
      { title: t('tpl.figure_b'), svg: `<svg viewBox='0 0 400 260' xmlns='http://www.w3.org/2000/svg'><rect width='400' height='260' fill='#f2f6fb'/><text x='200' y='140' text-anchor='middle' font-size='16' fill='#3c5a7a' font-family='Helvetica'>${t('tpl.svg_placeholder')}</text></svg>`, caption: t('tpl.caption_b') }
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
