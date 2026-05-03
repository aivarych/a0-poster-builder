/**
 * Global mutable state.
 *
 * Mutated directly by other modules — no reducer / event-bus ceremony.
 * After any mutation, the caller is responsible for calling the relevant
 * render function (renderSidebar / renderEditor / refreshPreview).
 *
 * Persistence and project switching live in src/persistence.js and read/write
 * `state.config`, `state.projects`, `state.currentProjectId` directly.
 */

import { DEFAULT_CONFIG } from './default-config.js';

export const state = {
  /** The poster JSON currently being edited */
  config: structuredClone(DEFAULT_CONFIG),

  /** What's open in the editor panel: { kind: 'header' | 'footer' | 'section', index: number } */
  selected: { kind: 'header', index: -1 },

  /** Preview zoom factor (1.0 = 100%) */
  zoom: 0.32,

  /** True after user zoomed in/out manually — disables auto-fit on layout changes until they click "Fit". */
  userZoomed: false,

  /** All saved projects keyed by id: { [id]: { id, name, updatedAt, config, userNamed } } */
  projects: {},

  /** Id of the project currently being edited */
  currentProjectId: null,

  /** Active tab per chart, keyed by dotted path (e.g. "sections.2.chart"). UI-only, not persisted. */
  chartTabs: {}
};
