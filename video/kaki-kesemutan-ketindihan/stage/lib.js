// Pembantu: easing, SVG datar, interpolasi kunci, teks pil. Semua murni (waktu -> string SVG).
export * from './core.js';
import { f1, clamp, lerp, sm, eo, eio, MC, FONT } from './core.js';
export const INK = MC.ink, GOLD = MC.gold, FOREST = MC.forest, MINT = MC.mint;
export const COL = {
  red: '#FF4A3D', redDk: '#C42B22', ir: '#B452FF', irDk: '#7A2FC0',               // lampu merah dan inframerah (inframerah = warna ilustratif)
  oxy: '#F0463C', oxyDk: '#B8281F', deoxy: '#7B2F6B', deoxyDk: '#4D1A44', co: '#FF8FB1',  // Hb beroksigen, Hb tanpa oksigen, Hb-CO
  skin: '#F3BE98', skinDk: '#D99A74', nail: '#F7E3E4', bone: '#E9DEC8', vessel: '#B23A48', plasma: '#E7766F', metal: '#2E3F4D', body: '#DCE9EA', accent: '#00A383',
};
export const R = (x, y, w, h, fill, rx = 0, e = '') => `<rect x="${f1(x)}" y="${f1(y)}" width="${f1(w)}" height="${f1(h)}" rx="${rx}" fill="${fill}" ${e}/>`;
export const C = (x, y, r, fill, e = '') => `<circle cx="${f1(x)}" cy="${f1(y)}" r="${f1(r)}" fill="${fill}" ${e}/>`;
export const P = (d, fill, e = '') => `<path d="${d}" fill="${fill}" ${e}/>`;
export const T = (s, x, y, o = {}) => `<text x="${f1(x)}" y="${f1(y)}" font-family="${o.font || FONT}" font-weight="${o.w ?? 800}" font-size="${o.size ?? 40}" fill="${o.fill ?? INK}" text-anchor="${o.anchor ?? 'middle'}" ${o.ls ? `letter-spacing="${o.ls}"` : ''} ${o.e || ''}>${s}</text>`;
export const G = (inner, o = {}) => `<g transform="translate(${f1(o.x ?? 0)} ${f1(o.y ?? 0)}) rotate(${f1(o.r ?? 0)}) scale(${o.sx ?? o.s ?? 1} ${o.sy ?? o.s ?? 1})" opacity="${f1((o.o ?? 1) * 1000) / 1000}">${inner}</g>`;
export const pop = (t, t0, d = 0.35) => { const x = clamp((t - t0) / d); if (t < t0) return 0; const c1 = 1.70158, c3 = c1 + 1; return 1 + c3 * Math.pow(x - 1, 3) + c1 * Math.pow(x - 1, 2); };
export const rndf = (i) => { const x = Math.sin(i * 127.1 + 311.7) * 43758.5453; return x - Math.floor(x); };
// ukuran teks (px) lewat kanvas, untuk pil dan takarir
const mc = document.createElement('canvas').getContext('2d');
export const tw = (s, size, w = 800, fam = "'Plus Jakarta Sans'") => { mc.font = `${w} ${size}px ${fam}`; return mc.measureText(s).width; };
/** pil putih (gaya MEDCOEL): teks 1-2 baris, tengah (cx), atas y */
export function pill(lines, cx, y, o = {}) {
  const a = o.a ?? 1; if (a <= 0.004) return '';
  const ls = Array.isArray(lines) ? lines : [lines], size = o.size ?? 50, lh = size * 1.16, w = Math.min(960, Math.max(...ls.map((l) => tw(l.replace(/<[^>]+>/g, ''), size))) + 70), h = ls.length * lh + 34;
  const k = o.k ?? 1, bg = o.bg ?? '#fff', fg = o.fg ?? FOREST, sh = o.sh ?? 'rgba(0,0,0,.28)';
  return `<g opacity="${f1(a * 1000) / 1000}" transform="translate(${f1(cx)} ${f1(y)}) scale(${f1(k * 1000) / 1000}) translate(${f1(-cx)} ${f1(-y)})">${R(cx - w / 2, y + 8, w, h, sh, h < 90 ? h / 2 : 34)}${R(cx - w / 2, y, w, h, bg, h < 90 ? h / 2 : 34)}${ls.map((l, i) => `<text x="${f1(cx)}" y="${f1(y + 17 + size * 0.86 + i * lh)}" text-anchor="middle" font-family="${FONT}" font-weight="800" font-size="${size}" fill="${fg}">${l}</text>`).join('')}</g>`;
}
