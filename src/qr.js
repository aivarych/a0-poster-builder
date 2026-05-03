/**
 * QR-code generation. Wraps the qrcode-svg npm package so the rest of the
 * builder doesn't need to know its API. Output is an inline SVG string ready
 * to drop into the poster's contact-card slot.
 *
 * Empty input → empty string (lets the runtime fall back to "no QR").
 */

import QRCode from 'qrcode-svg';

export function generateQR(content) {
  const text = (content == null ? '' : String(content)).trim();
  if (!text) return '';
  const qr = new QRCode({
    content: text,
    width: 200,
    height: 200,
    padding: 0,
    color: '#000',
    background: '#fff',
    ecl: 'M',
    join: true,             // single <path> — ~10× smaller than per-cell <rect>s
    container: 'svg-viewbox' // emit viewBox attribute for clean scaling
  });
  return qr.svg();
}
