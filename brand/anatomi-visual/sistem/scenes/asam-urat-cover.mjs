// Cover vertikal 1080x1920 "KENAPA ASAM URAT SESAKIT INI?": judul di area aman profil 3:4 (y 240-1680), jendela penampang sendi MTP (kristal jarum + sel pertahanan + radang), kaki meradang, pil logo.
import { FONT, MEREK } from '../tokens.mjs';
import { latar, bintang } from '../latar.mjs';
import { f1, BLUR_DEFS } from '../tensi/util.mjs';
import { sendi } from '../asam-urat/sendi.mjs';
import { kaki } from '../asam-urat/kamar.mjs';
import { C } from '../asam-urat/bentuk.mjs';
export const meta = { id: 'asam-urat-cover', judul: 'Cover asam urat', sub: '', organ: 'sendi', durasi: 1, fps: 30 };
const GADING = MEREK.gading, EMAS = MEREK.emas, TINTA = MEREK.tinta;
export function frame(T) {
  const S = { T: 20.4, larut: 1, kristal: 1, sel: 1, infl: 0.9, bengkak: 0.5, merah: 0.7, hangat: 0.4, nyeri: 1 };
  let svg = `<svg xmlns="http://www.w3.org/2000/svg" xmlns:xlink="http://www.w3.org/1999/xlink" width="1080" height="1920" viewBox="0 0 1080 1920"><defs><clipPath id="vp"><rect width="1080" height="1920"/></clipPath><clipPath id="jd"><rect x="60" y="640" width="960" height="620" rx="60"/></clipPath></defs>${BLUR_DEFS}<g clip-path="url(#vp)">`;
  svg += latar('sendi', 0);
  const w = (t, y, size, fill, sw = 14) => `<text x="540" y="${y}" text-anchor="middle" font-family="${FONT}" font-weight="800" font-size="${size}" fill="${fill}" stroke="#06161A" stroke-width="${sw}" stroke-linejoin="round" paint-order="stroke" letter-spacing="2">${t}</text>`;
  svg += w('KENAPA ASAM URAT', 400, 92, GADING) + w('SESAKIT INI?', 540, 150, EMAS, 16);
  svg += bintang(930, 316, 30, EMAS, 0.9) + bintang(130, 596, 18, EMAS, 0.7);
  svg += `<rect x="60" y="650" width="960" height="620" rx="60" fill="#000" opacity=".35"/><g clip-path="url(#jd)"><g transform="translate(540 950) scale(1.5) translate(-585 -975)">${sendi(S, { id: 'cv' })}</g></g><rect x="60" y="640" width="960" height="620" rx="60" fill="none" stroke="${GADING}" stroke-opacity=".55" stroke-width="6"/>`;
  svg += `<g transform="translate(0 0)"><circle cx="830" cy="1300" r="190" fill="#0E2A33" stroke="${GADING}" stroke-width="7"/><clipPath id="kd"><circle cx="830" cy="1300" r="186"/></clipPath><g clip-path="url(#kd)"><rect x="640" y="1110" width="380" height="380" fill="#D99A56"/><g transform="translate(0 0)">${kaki(808, 1170, 0.62, 1, 0)}</g></g></g>`;
  svg += `<g><rect x="190" y="1566" width="700" height="96" rx="48" fill="#000" opacity=".3" transform="translate(0 6)"/><rect x="190" y="1566" width="700" height="96" rx="48" fill="${GADING}"/><image href="logo-mark.webp" x="214" y="1580" width="68" height="68"/><text x="300" y="1630" font-family="${FONT}" font-weight="800" font-size="46" letter-spacing="5" fill="${TINTA}">MEDCOEL</text><text x="872" y="1626" text-anchor="end" font-family="${FONT}" font-weight="700" font-size="28" fill="#1D7B75">belajar gratis</text></g>`;
  return svg + `</g></svg>`;
}
