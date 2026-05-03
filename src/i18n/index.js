/**
 * i18n entry point.
 *
 * Conventions:
 *   - Flat dotted keys, see en.js / ru.js
 *   - Placeholders use {name} / {n}; missing params are left literal
 *   - Missing keys fall back to English; missing in EN too → return the key
 *
 * Static markup carries `data-i18n="key"` (text content) or
 * `data-i18n-title="key"` (tooltip). applyStaticTranslations() walks both.
 *
 * Dynamic UI (sidebar, editor, project menu) calls t(...) directly inside
 * its render functions — no virtualization, just plain string substitution.
 *
 * Persistence is done through src/persistence.js to keep the "all localStorage
 * goes through persistence" rule (CLAUDE.md). Cycle is import-safe: persistence
 * imports t() lazily inside its functions, not at module top level.
 */

import en from './en.js';
import ru from './ru.js';
import { loadLocaleFromStorage, saveLocaleToStorage } from '../persistence.js';

const DICT = { en, ru };

export const availableLocales = [
  { code: 'en', label: 'EN' },
  { code: 'ru', label: 'RU' },
];

let currentLocale = 'en';

export function getLocale() {
  return currentLocale;
}

export function detectInitialLocale() {
  const stored = loadLocaleFromStorage();
  if (stored && DICT[stored]) return stored;
  const nav = (navigator.language || 'en').toLowerCase();
  return nav.startsWith('ru') ? 'ru' : 'en';
}

/**
 * Set the active locale and re-apply any static translations in the DOM.
 * Re-rendering of dynamic UI (sidebar/editor/project menu) is the caller's
 * responsibility — we don't import those modules to avoid cycles.
 */
export function setLocale(code) {
  if (!DICT[code]) return;
  currentLocale = code;
  saveLocaleToStorage(code);
  applyStaticTranslations();
}

export function t(key, params) {
  const dict = DICT[currentLocale] || DICT.en;
  let s = dict[key];
  if (s == null) s = DICT.en[key];
  if (s == null) return key;
  if (params) {
    s = s.replace(/\{(\w+)\}/g, (m, k) => (params[k] != null ? params[k] : m));
  }
  return s;
}

export function applyStaticTranslations() {
  document.documentElement.lang = currentLocale;
  document.querySelectorAll('[data-i18n]').forEach(el => {
    el.textContent = t(el.dataset.i18n);
  });
  document.querySelectorAll('[data-i18n-title]').forEach(el => {
    el.title = t(el.dataset.i18nTitle);
  });
}
