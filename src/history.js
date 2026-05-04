/**
 * Undo/redo for state.config.
 *
 * Snapshot-based: every meaningful edit pushes a deep copy of config onto
 * `past`. `future` accumulates the redo stack. Cmd+Z pops from past (after
 * pushing current state to future), Cmd+Shift+Z does the inverse.
 *
 * Dedup: we compare JSON.stringify of the new snapshot against the top of
 * `past` to avoid recording sequences of identical states (refreshPreview
 * fires on every keystroke and many of those don't actually change config).
 *
 * Other state — selection, projects — is intentionally NOT in
 * the snapshot: it's UI/session state, not document state.
 */

import { state } from './state.js';

const LIMIT = 30;

const past = [];
const future = [];

let lastSerialized = null;
let suppressNext = false;

export function takeSnapshot() {
  if (suppressNext) {
    suppressNext = false;
    lastSerialized = JSON.stringify(state.config);
    return;
  }
  const serialized = JSON.stringify(state.config);
  if (serialized === lastSerialized) return;
  if (lastSerialized != null) {
    past.push(lastSerialized);
    if (past.length > LIMIT) past.shift();
    // Any new edit invalidates redo.
    future.length = 0;
  }
  lastSerialized = serialized;
}

export function undo() {
  if (past.length === 0) return false;
  const prev = past.pop();
  future.push(lastSerialized);
  if (future.length > LIMIT) future.shift();
  state.config = JSON.parse(prev);
  lastSerialized = prev;
  suppressNext = true;
  return true;
}

export function redo() {
  if (future.length === 0) return false;
  const next = future.pop();
  past.push(lastSerialized);
  if (past.length > LIMIT) past.shift();
  state.config = JSON.parse(next);
  lastSerialized = next;
  suppressNext = true;
  return true;
}

export function canUndo() { return past.length > 0; }
export function canRedo() { return future.length > 0; }

/** Reset history — call this when loading a different project. */
export function resetHistory() {
  past.length = 0;
  future.length = 0;
  lastSerialized = JSON.stringify(state.config);
  suppressNext = false;
}
