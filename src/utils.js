/**
 * General-purpose utilities shared across modules.
 */

export function escapeHtml(s) {
  return String(s).replace(/[&<>"]/g, c => ({
    '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;'
  }[c]));
}

export function escapeAttr(s) {
  return String(s == null ? '' : s)
    .replace(/&/g, '&amp;')
    .replace(/"/g, '&quot;')
    .replace(/</g, '&lt;');
}

/* ---------- Object path helpers (e.g. ['sections', 0, 'items', 2, 'title']) ---------- */

export function getAtPath(obj, path) {
  let cur = obj;
  for (const key of path) {
    if (cur == null) return undefined;
    cur = cur[key];
  }
  return cur;
}

export function setAtPath(obj, path, value) {
  let cur = obj;
  for (let i = 0; i < path.length - 1; i++) cur = cur[path[i]];
  cur[path[path.length - 1]] = value;
}

export function deleteAtPath(obj, path) {
  let cur = obj;
  for (let i = 0; i < path.length - 1; i++) cur = cur[path[i]];
  const last = path[path.length - 1];
  if (Array.isArray(cur)) cur.splice(last, 1);
  else delete cur[last];
}

export function pathToString(path) {
  return path.join('.');
}

export function stringToPath(s) {
  return s.split('.').map(p => /^\d+$/.test(p) ? Number(p) : p);
}

/* ---------- File download ---------- */

export function downloadFile(filename, content, mime = 'text/plain') {
  const blob = new Blob([content], { type: mime });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  setTimeout(() => URL.revokeObjectURL(url), 1000);
}

/* ---------- Toast notifications ---------- */

export function showToast(msg, type = '') {
  const t = document.getElementById('toast');
  if (!t) return;
  t.textContent = msg;
  t.className = 'toast show ' + type;
  setTimeout(() => { t.className = 'toast'; }, 2400);
}

/* ---------- CSV parser ---------- */

/**
 * Minimal CSV/TSV parser. Auto-detects tab vs comma delimiter.
 * First non-empty line = headers. Numeric-looking values are coerced.
 * Returns { columns: string[], rows: object[] }.
 *
 * Honors quoted fields with embedded commas/newlines and "" escaped quotes.
 */
export function parseCSV(text) {
  if (!text) return { columns: [], rows: [] };
  const trimmed = text.replace(/^﻿/, '').trimEnd();
  const tabs = (trimmed.match(/\t/g) || []).length;
  const commas = (trimmed.match(/,/g) || []).length;
  const delim = tabs > commas ? '\t' : ',';

  // Tokeniser: walk char by char respecting quoted strings.
  const rows = [];
  let row = [], field = '', i = 0, quoted = false;
  while (i < trimmed.length) {
    const c = trimmed[i];
    if (quoted) {
      if (c === '"' && trimmed[i + 1] === '"') { field += '"'; i += 2; continue; }
      if (c === '"') { quoted = false; i++; continue; }
      field += c; i++; continue;
    }
    if (c === '"') { quoted = true; i++; continue; }
    if (c === delim) { row.push(field); field = ''; i++; continue; }
    if (c === '\n' || c === '\r') {
      row.push(field); rows.push(row); row = []; field = '';
      if (c === '\r' && trimmed[i + 1] === '\n') i += 2; else i++;
      continue;
    }
    field += c; i++;
  }
  row.push(field); rows.push(row);

  const cleaned = rows.filter(r => r.length > 1 || (r[0] && r[0].trim()));
  if (!cleaned.length) return { columns: [], rows: [] };
  const headers = cleaned[0].map(h => String(h).trim());
  const out = [];
  for (let j = 1; j < cleaned.length; j++) {
    const r = cleaned[j];
    const obj = {};
    headers.forEach((h, k) => {
      const v = r[k] != null ? String(r[k]).trim() : '';
      if (v === '') { obj[h] = null; return; }
      const n = Number(v);
      obj[h] = (v !== '' && !isNaN(n) && /^-?\d*\.?\d+(e[+-]?\d+)?$/i.test(v)) ? n : v;
    });
    out.push(obj);
  }
  return { columns: headers, rows: out };
}

/* ---------- Slugify a string for use in filenames ---------- */

export function slugify(s, maxLen = 50) {
  return String(s || '')
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-|-$/g, '')
    .slice(0, maxLen) || 'untitled';
}
