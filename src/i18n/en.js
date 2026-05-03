/**
 * English UI strings.
 *
 * Flat dotted keys grouped by area: toolbar.* / sidebar.* / preview.* /
 * editor.section.* / editor.subgroup.* / editor.subcard.* / editor.field.* /
 * editor.hint.* / editor.option.* / editor.action.* / editor.empty.* /
 * project.* / confirm.* / prompt.* / toast.* / time.* / section_type.* / tpl.*
 *
 * Placeholders use {name} / {n} syntax.
 *
 * NB: tpl.* keys feed SECTION_TEMPLATES and the dynamic "+ Add" handlers.
 * They produce CONTENT (poster data, persisted in projects/exports), so
 * switching locale after creation will NOT retroactively retranslate them —
 * that's intentional, the user immediately replaces these with real text.
 */

export default {
  // ── toolbar ─────────────────────────────────────────────────────
  'toolbar.import_json':        '↑ Import JSON',
  'toolbar.export_json':        '↓ Export JSON',
  'toolbar.reset':              '↺ Reset to demo',
  'toolbar.export_html':        'Export print-ready HTML →',
  'toolbar.untitled':           'Untitled',

  // ── save indicator (toolbar) ────────────────────────────────────
  'project.indicator.loaded':              'Loaded',
  'project.indicator.no_storage':          'No storage',
  'project.indicator.saving':              'Saving…',
  'project.indicator.saved':               'Saved',
  'project.indicator.save_failed':         'Save failed (quota?)',
  'project.indicator.storage_unavailable': 'Storage unavailable',

  // ── sidebar ─────────────────────────────────────────────────────
  'sidebar.structure':       'Structure',
  'sidebar.editor':          'Editor',
  'sidebar.preview':         'Preview',
  'sidebar.add_section':     '+ Add section',
  'sidebar.untitled_poster': 'Untitled poster',
  'sidebar.footer_label':    'Footer · Disclosures · Contact',
  'sidebar.empty_section':   '(empty)',
  'sidebar.move_up':         'Move up',
  'sidebar.move_down':       'Move down',
  'sidebar.delete':          'Delete',
  'sidebar.duplicate':       'Duplicate',
  'sidebar.header_icon':     'H',
  'sidebar.footer_icon':     'F',

  // ── preview overlay ────────────────────────────────────────────
  'preview.size_label': 'A0 · 841 × 1189 mm',
  'preview.zoom_in':    'Zoom in',
  'preview.zoom_out':   'Zoom out',
  'preview.zoom_fit':   'Fit',
  'preview.overflow_banner': '⚠ Content overflows the A0 frame by {n} mm — trim text or shrink charts before printing',

  // ── editor empty states ────────────────────────────────────────
  'editor.empty.select_or_add': 'Select a section from the left, or add a new one.',
  'editor.empty.no_renderer':   'No editor for type "{type}".',
  'editor.empty.select_item':   'Select an item from the left.',

  // ── editor section headers ─────────────────────────────────────
  'editor.section.header.label':           'Header',
  'editor.section.header.badge':           'title · authors · logos',
  'editor.section.header.meta':            'Top block of the poster',

  'editor.section.footer.label':           'Footer',
  'editor.section.footer.badge':           'disclosures · ethics · contact',
  'editor.section.footer.meta':            'Bottom row of the poster',

  'editor.section.intro_row.label':        'Intro row',
  'editor.section.intro_row.meta':         'Section #{n} · two columns side by side',

  'editor.section.case_grid.label':        'Card grid',
  'editor.section.case_grid.meta':         'Section #{n} · half / full-width cards',

  'editor.section.chart_with_aside.label': 'Chart + aside',
  'editor.section.chart_with_aside.meta':  'Section #{n} · big chart + decision panel',

  'editor.section.charts_row.label':       'Charts row',
  'editor.section.charts_row.meta':        'Section #{n} · multiple SVG charts in a row',

  'editor.section.findings_block.label':   'Findings + take-home',
  'editor.section.findings_block.meta':    'Section #{n} · key findings + limitations + take-home',

  // ── section type catalog (add menu) ────────────────────────────
  'section_type.intro_row.label':        'Intro row',
  'section_type.intro_row.desc':         'Two columns (wide + narrow)',
  'section_type.case_grid.label':        'Card grid',
  'section_type.case_grid.desc':         'Half / full-width cards',
  'section_type.chart_with_aside.label': 'Chart + decision box',
  'section_type.chart_with_aside.desc':  'Big SVG + side panel',
  'section_type.charts_row.label':       'Charts row',
  'section_type.charts_row.desc':        'Multiple SVG charts in a row',
  'section_type.findings_block.label':   'Findings + take-home',
  'section_type.findings_block.desc':    'Findings + limitations + take-home',

  // ── editor subgroups ───────────────────────────────────────────
  'editor.subgroup.authors':            'Authors',
  'editor.subgroup.logos':              'Logos (right side of header)',
  'editor.subgroup.affiliations':       'Affiliations',
  'editor.subgroup.disclosures_col':    'Disclosures column',
  'editor.subgroup.ethics_col':         'Ethics column',
  'editor.subgroup.contact_col':        'Contact column',
  'editor.subgroup.column_n':           'Column {n}',
  'editor.subgroup.cards':              'Cards',
  'editor.subgroup.chart_left':         'Chart (left, ~70%)',
  'editor.subgroup.aside_right':        'Aside / decision box (right, ~30%)',
  'editor.subgroup.charts':             'Charts',
  'editor.subgroup.findings_left':      'Findings (left)',
  'editor.subgroup.limitations_middle': 'Limitations (middle, red)',
  'editor.subgroup.takehome_right':     'Take-home (right, navy)',

  // ── editor subcard headers ─────────────────────────────────────
  'editor.subcard.author_n':   'Author #{n}',
  'editor.subcard.logo_n':     'Logo #{n}',
  'editor.subcard.card_n':     'Card #{n}',
  'editor.subcard.chart_n':    'Chart #{n}',
  'editor.subcard.subgroup_n': 'Subgroup #{n}',
  'editor.subcard.finding_n':  'Finding #{n}',
  'editor.subcard.item_n':     '#{n}',

  // ── editor field labels ────────────────────────────────────────
  'editor.field.poster_title':     'Poster title',
  'editor.field.subtitle':         'Subtitle / note',
  'editor.field.name':             'Name',
  'editor.field.role':             'Role',
  'editor.field.affiliation_num':  'Affiliation #',
  'editor.field.image_src':        'Image src (path or data URI)',
  'editor.field.image_embedded':   'Embedded image · {kb} KB · ↑ to replace, ✕ to remove',
  'editor.field.alt':              'Alt text',
  'editor.field.heading':          'Heading',
  'editor.field.disclosure_text':  'Disclosure text',
  'editor.field.ethics_text':      'Ethics text',
  'editor.field.contact_label':    'Label (e.g. "Corresponding author")',
  'editor.field.email':            'Email',
  'editor.field.note':             'Note',
  'editor.field.qr_url':           'Contact URL (auto-generates QR)',
  'editor.field.qr_svg':           'QR code SVG',
  'editor.field.width':            'Width',
  'editor.field.title':            'Title',
  'editor.field.section_title':    'Section title',
  'editor.field.paragraphs':       'Paragraphs (HTML allowed)',
  'editor.field.body_html':        'Body (HTML allowed)',
  'editor.field.body':             'Body',
  'editor.field.chart_title':      'Chart title',
  'editor.field.svg_full':         'SVG markup (paste full <svg>…</svg>)',
  'editor.field.svg':              'SVG markup',
  'editor.field.vega_spec':        'Vega-Lite spec (JSON)',

  // ── chart editor tabs (Data / Encoding / Spec / SVG) ───────────
  'editor.tab.data':         'Data',
  'editor.tab.encoding':     'Encoding',
  'editor.tab.spec':         'Spec',
  'editor.tab.svg':          'SVG',
  'editor.chart.no_data_yet':    'No data yet — paste CSV or add a row to start.',
  'editor.chart.csv_placeholder': 'Paste CSV or TSV. First line = column headers.\\nweek,score,group\\n0,65,Eccentric\\n4,58,Eccentric',
  'editor.chart.parse_csv':      'Parse CSV',
  'editor.chart.paste_csv':      'Paste CSV / TSV',
  'editor.chart.add_row':        'Add row',
  'editor.chart.add_column':     'Add column',
  'editor.chart.external_data':  'External data ({url}). Edit the spec directly in the Spec tab.',
  'editor.chart.encoding_coming': 'Encoding builder is coming next. For now, edit the chart in the Spec tab or paste CSV in Data.',
  'editor.chart.encoding_no_spec': 'No spec yet — paste data in Data tab or write a spec in Spec tab first.',
  'editor.chart.encoding_no_data': 'No data yet — paste CSV in the Data tab first.',
  'editor.chart.mark_label':       'Mark',
  'editor.chart.mark_point':       'Show points',
  'editor.chart.mark.line':        'Line',
  'editor.chart.mark.bar':         'Bar',
  'editor.chart.mark.point':       'Point (scatter)',
  'editor.chart.mark.area':        'Area',
  'editor.chart.mark.boxplot':     'Box plot',
  'editor.chart.mark.tick':        'Tick',
  'editor.chart.channel.x':        'X axis',
  'editor.chart.channel.y':        'Y axis',
  'editor.chart.channel.color':    'Color',
  'editor.chart.type.quantitative': 'Quantitative (number)',
  'editor.chart.type.temporal':    'Temporal (date)',
  'editor.chart.type.ordinal':     'Ordinal',
  'editor.chart.type.nominal':     'Nominal (category)',
  'editor.chart.axis_title_placeholder': 'Axis title (optional)',
  'editor.chart.insert_preset':  'Insert preset ▾',
  'editor.chart.preset_overwrite_confirm': 'Replace the current chart with this preset?',
  'preset.visap.label':          'VISA-P trajectory (line by group)',
  'preset.boxplot.label':        'Boxplot by group',
  'preset.forest.label':         'Forest plot (effect size + 95% CI)',
  'preset.bar_error.label':      'Bar with error bars',
  'preset.scatter.label':        'Scatter with regression line',
  'prompt.column_name':          'Column name:',
  'toast.csv_empty':             'Could not parse any rows from CSV',
  'toast.not_image':             'Not an image file',
  'editor.field.caption':          'Caption',
  'editor.field.icon_char':        'Icon character',
  'editor.field.subgroup_title':   'Subgroup title',
  'editor.field.items':            'Items',
  'editor.field.outcome':          'Outcome (green box at bottom)',
  'editor.field.references':       'References',
  'editor.field.limitation_items': 'Limitation items',
  'editor.field.takehome_items':   'Take-home items',

  // ── color themes (toolbar selector + custom palette popover) ───
  'toolbar.theme_label':       'Theme:',
  'theme.navy_red.label':      'Navy & Red',
  'theme.teal_orange.label':   'Teal & Orange',
  'theme.monochrome.label':    'Monochrome',
  'theme.warm_rust.label':     'Warm Rust',
  'theme.custom.label':        'Custom',
  'theme.edit_colors':         'Edit colors',
  'theme.popover_title':       'Custom palette',
  'theme.reset_palette':       'Reset palette',
  'theme.var.navy':            'Header & dark blocks',
  'theme.var.navy_dark':       'Section titles',
  'theme.var.navy_light':      'Card background',
  'theme.var.accent_red':      'Accent (numbers, bullets)',
  'theme.var.accent_soft':     'Accent box background',

  // ── editor field hints (NB: viewbox stays EN in both locales) ──
  'editor.hint.subtitle': 'Optional italic line below authors',
  'editor.hint.aff_eg':   'e.g. 1',
  'editor.hint.qr_gen':    'Generate at e.g. qr-code-generator.com',
  'editor.hint.qr_auto':   'Paste a URL — the QR SVG below regenerates',
  'editor.hint.qr_manual': 'Auto-filled from URL above; or paste raw SVG',
  'editor.hint.viewbox':  'viewBox controls scaling',
  'editor.hint.vega_priority': 'When set, takes priority over SVG markup below',
  'editor.hint.icon_eg':  'e.g. ! or ◆',

  // ── select options ─────────────────────────────────────────────
  'editor.option.width.wide':   'Wide (~58%)',
  'editor.option.width.narrow': 'Narrow (~42%)',
  'editor.option.width.half':   'Half (1/2)',
  'editor.option.width.full':   'Full width',

  // ── add buttons ────────────────────────────────────────────────
  'editor.action.add_author':         '+ Add author',
  'editor.action.add_logo':           '+ Add logo',
  'editor.action.upload_logo':        'Upload image',
  'editor.action.drop_logo_hint':     'Drop image here or click ↑ to upload',
  'editor.action.add_affiliation':    'Add affiliation',
  'editor.action.add_reference':      'Add reference',
  'editor.action.add_paragraph':      'Add paragraph',
  'editor.action.add_card':           '+ Add card',
  'editor.action.add_aside_subgroup': '+ Add subgroup',
  'editor.action.add_item':           'Add item',
  'editor.action.add_chart':          '+ Add chart',
  'editor.action.add_finding':        '+ Add finding',
  'editor.action.add_limitation':     'Add limitation',
  'editor.action.add_takehome':       'Add take-home point',

  // ── project menu ───────────────────────────────────────────────
  'project.menu.list_title':    'Projects ({n})',
  'project.menu.empty':         'No projects yet',
  'project.menu.storage_warn':  '⚠ Storage unavailable — projects won’t persist',
  'project.menu.new':           '＋ New project',
  'project.menu.rename':        '✎ Rename current',
  'project.menu.export_bundle': '↓ Export all projects (backup)',
  'project.menu.import_bundle': '↑ Import bundle',
  'project.imported_fallback':  'Imported',

  // ── confirm / prompt ───────────────────────────────────────────
  'confirm.delete_section': 'Delete this section?',
  'confirm.delete_project': 'Delete project "{name}"? This cannot be undone.',
  'confirm.reset':          'Reset to default demo poster? Unsaved changes in this project will be lost.',
  'prompt.rename_project':  'Rename project:',

  // ── toasts ─────────────────────────────────────────────────────
  'toast.added_section':     'Added: {label}',
  'toast.storage_warn':      'localStorage unavailable — changes won’t persist between sessions',
  'toast.save_failed':       'Save failed — localStorage may be full. Export your projects as backup.',
  'toast.new_project':       'New project created',
  'toast.renamed':           'Renamed',
  'toast.deleted':           'Deleted',
  'toast.bundle_exported':   'Exported: {n}',
  'toast.bundle_invalid':    'Not a valid bundle file',
  'toast.bundle_imported':   'Imported: {n}',
  'toast.import_failed':     'Import failed: {msg}',
  'toast.html_saved':        'Saved print-ready HTML — open in Chrome, print to PDF (A0)',
  'toast.json_saved':        'Saved JSON config',
  'toast.json_imported':     'Imported JSON config',
  'toast.json_invalid_keys': 'JSON must have header, sections, and footer keys',
  'toast.reset_done':        'Reset to default',

  // ── relative time (save indicator) ─────────────────────────────
  'time.just_saved': 'Saved',
  'time.s_ago':      '{n}s ago',
  'time.m_ago':      '{n}m ago',
  'time.h_ago':      '{n}h ago',

  // ── section template starters (content created on "+ Add") ─────
  'tpl.section_title':       'Section title',
  'tpl.lead_paragraph':      'Lead paragraph here.',
  'tpl.side_panel':          'Side panel',
  'tpl.short_complementary': 'Short complementary text.',
  'tpl.card_a':              'Card A',
  'tpl.card_a_body':         'Body text for card A.',
  'tpl.card_b':              'Card B',
  'tpl.card_b_body':         'Body text for card B.',
  'tpl.figure_title':        'Figure title',
  'tpl.figure_caption':      'Figure caption / interpretation.',
  'tpl.aside_title':         'Aside Title',
  'tpl.subgroup_a':          'Subgroup A',
  'tpl.point_one':           'Point one',
  'tpl.point_two':           'Point two',
  'tpl.outcome_statement':   '✓ Outcome statement',
  'tpl.figure_a':            'Figure A',
  'tpl.figure_b':            'Figure B',
  'tpl.caption_a':           'Caption A',
  'tpl.caption_b':           'Caption B',
  'tpl.key_findings':        'Key Findings',
  'tpl.finding_one_title':   'Finding one.',
  'tpl.finding_one_body':    'Body text for finding one.',
  'tpl.finding_two_title':   'Finding two.',
  'tpl.finding_two_body':    'Body text for finding two.',
  'tpl.limitations_title':   '⚠ Limitations',
  'tpl.limitation_one':      'Limitation one.',
  'tpl.limitation_two':      'Limitation two.',
  'tpl.takehome_title':      '◆ Take-home',
  'tpl.takehome_one':        'Take-home one.',
  'tpl.takehome_two':        'Take-home two.',

  // dynamic adds (editor.js onEditorButton)
  'tpl.new_author':   'New Author',
  'tpl.new_card':     'New card',
  'tpl.new_chart':    'New chart',
  'tpl.new_subgroup': 'New subgroup',
  'tpl.new_finding':  'New finding.',

  // SVG placeholder text (rendered inside chart svg in templates)
  'tpl.svg_paste':       'Paste your SVG here',
  'tpl.svg_placeholder': 'SVG placeholder',
  'tpl.svg_paste_short': 'Paste SVG',
};
