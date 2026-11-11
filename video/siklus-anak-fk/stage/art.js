// Aset bersama video promo "Besok ujian blok": gradien, label (chip/tag), ikon kecil. Semua dari kode (SVG). Warna dan tipografi dari identitas MEDCOEL (core.js: MC, FONT).
import { f1, clamp, lerp, sm, eo, MC, FONT } from './core.js';
export const COL = { wood: '#C98F5E', woodDk: '#8A5A34', woodLt: '#E0AE7C', paper: '#FBFAF4', ink: MC.ink, gold: MC.gold, coral: '#E8665F', sky: '#16315A' };
export function defs() {
  const lg = (id, stops, x1 = 0, y1 = 0, x2 = 0, y2 = 1) => `<linearGradient id="${id}" x1="${x1}" y1="${y1}" x2="${x2}" y2="${y2}">${stops.map(([o, c, a]) => `<stop offset="${o}" stop-color="${c}"${a !== undefined ? ` stop-opacity="${a}"` : ''}/>`).join('')}</linearGradient>`;
  return `<defs>
${lg('gDesk', [[0, '#D9A06C'], [1, '#B9784A']])}
${lg('gDeskF', [[0, '#9A6338'], [1, '#6E4223']])}
${lg('gNight', [[0, '#0F2547'], [1, '#27508A']])}
${lg('gChair', [[0, '#31506A'], [1, '#203648']])}
${lg('gPhone', [[0, '#2A3946'], [1, '#141D26']])}
<radialGradient id="gLamp" cx=".5" cy=".5" r=".5"><stop offset="0" stop-color="#FFD98A" stop-opacity=".55"/><stop offset="1" stop-color="#FFD98A" stop-opacity="0"/></radialGradient>
<filter id="fSh" x="-30%" y="-30%" width="170%" height="170%"><feDropShadow dx="8" dy="12" stdDeviation="9" flood-color="#021014" flood-opacity=".42"/></filter>
<filter id="fShS" x="-30%" y="-30%" width="170%" height="170%"><feDropShadow dx="3" dy="5" stdDeviation="3.5" flood-color="#021014" flood-opacity=".4"/></filter>
</defs>`;
}

// ------------------------------------------------------------------ label pil gading (gaya MEDCOEL): pusat chip (cx, cy), garis penuntun ke (x, y)
export const chipW = (txt, fs = 40) => Math.max(...txt.split('\n').map((l) => l.length * fs * 0.58 + 52));
export function chip(x, y, txt, o = {}) {
  const fs = o.fs ?? 40, a = o.a ?? 1; if (a <= 0.003) return '';
  const lines = txt.split('\n');
  const w = chipW(txt, fs), h = lines.length === 1 ? fs * 1.78 : fs * 2.55, cx = o.cx, cy = o.cy ?? y, left = cx - w / 2, right = cx + w / 2;
  const ex = x < left ? left : x > right ? right : x, ey = x >= left && x <= right ? (y < cy ? cy - h / 2 : cy + h / 2) : cy;
  const txts = lines.map((l, i) => `<text x="${f1(cx)}" y="${f1(cy + (lines.length === 1 ? fs * 0.35 : (i === 0 ? -fs * 0.22 : fs * 0.98)))}" text-anchor="middle" font-family="${FONT}" font-weight="700" font-size="${fs}" fill="${o.fg ?? MC.ink}">${l}</text>`).join('');
  const line = o.noLine ? '' : `<path d="M${f1(x)} ${f1(y)}L${f1(ex)} ${f1(ey)}" stroke="${MC.ink}" stroke-width="7" opacity=".5" stroke-linecap="round"/><path d="M${f1(x)} ${f1(y)}L${f1(ex)} ${f1(ey)}" stroke="${MC.gold}" stroke-width="3.6" stroke-linecap="round"/><circle cx="${f1(x)}" cy="${f1(y)}" r="9" fill="${MC.gold}" stroke="${MC.ink}" stroke-width="3"/><circle cx="${f1(x)}" cy="${f1(y)}" r="3" fill="${MC.ivory}"/>`;
  const k = o.k ?? 1;
  return `<g opacity="${f1(a)}">${line}<g transform="translate(${f1(cx)} ${f1(cy)}) scale(${f1(k)}) translate(${f1(-cx)} ${f1(-cy)})"><rect x="${f1(left)}" y="${f1(cy - h / 2)}" width="${f1(w)}" height="${f1(h)}" rx="${f1(Math.min(h / 2, 44))}" fill="${o.bg ?? MC.ivory}" stroke="${o.stroke ?? MC.ink}" stroke-width="2.5"/>${txts}</g></g>`;
}
export const tag = (cx, cy, txt, o = {}) => { const fs = o.fs ?? 36, w = chipW(txt, fs), h = fs * 1.7; return `<g opacity="${f1(o.a ?? 1)}"><rect x="${f1(cx - w / 2)}" y="${f1(cy - h / 2)}" width="${f1(w)}" height="${f1(h)}" rx="${f1(h / 2)}" fill="${o.bg ?? MC.ink}" stroke="${o.stroke ?? MC.gold}" stroke-width="3"/><text x="${f1(cx)}" y="${f1(cy + fs * 0.35)}" text-anchor="middle" font-family="${FONT}" font-weight="800" font-size="${fs}" fill="${o.fg ?? MC.ivory}">${txt}</text></g>`; };
// label yang terjadwal: items = [[t0, t1, teks, x, y, cx, cy, opsi?]] dalam koordinat layar; masuk 0,3 dtk, keluar 0,3 dtk
export function chips(t, items) {
  let g = '';
  for (const [t0, t1, txt, x, y, cx, cy, o = {}] of items) {
    const a = clamp((t - t0) / 0.3) * clamp((t1 - t) / 0.3); if (a <= 0.01) continue;
    const e = eo(clamp((t - t0) / 0.35)), k = 0.92 + 0.08 * e;
    g += chip(x, y, txt, { cx, cy, a: sm(a), k, ...o });
  }
  return g;
}
