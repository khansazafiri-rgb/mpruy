// Aset bersama video "Nyeri dada mendadak. Ada hubungannya dengan LDL?": gradien/filter, label (chip), penanda waktu, ikon.
// Semua dari kode (SVG). Cahaya kunci dari kiri-atas, bayangan jatuh ke kanan-bawah (aturan seri anatomi MEDCOEL).
import { f1, clamp, lerp, sm, eo, MC, FONT } from './core.js';

export const COL = {
  blood: '#B8283A', bloodDk: '#6E0F1E', bloodLt: '#E5505F', plasma: '#7A1424',
  ldl: '#F5C24A', ldlDk: '#B98410', ldlLt: '#FFE79A', oxy: '#C66A1E',
  endo: '#F4B7B0', endoDk: '#C77E78', intima: '#F7D9CF', intimaDk: '#E2B3A6', media: '#C46A6A', mediaDk: '#8E3A44', adv: '#F2DFC0', advDk: '#CDB08A',
  imm: '#8E7CE8', immDk: '#5A47B8', immLt: '#C3B8FF', foam: '#F7D766', cap: '#F3E3B3', capDk: '#C9A95A', core: '#E9B93C', coreDk: '#A8780E',
  clot: '#7A0F22', fibrin: '#F5C6CF', plt: '#E6B2FF', ink: MC.ink, ivory: MC.ivory, gold: MC.gold,
};

export function defs() {
  const lg = (id, stops, x1 = 0, y1 = 0, x2 = 1, y2 = 1) => `<linearGradient id="${id}" x1="${x1}" y1="${y1}" x2="${x2}" y2="${y2}">${stops.map(([o, c, a]) => `<stop offset="${o}" stop-color="${c}"${a !== undefined ? ` stop-opacity="${a}"` : ''}/>`).join('')}</linearGradient>`;
  const rg = (id, stops, cx = 0.38, cy = 0.32, r = 0.8) => `<radialGradient id="${id}" cx="${cx}" cy="${cy}" r="${r}">${stops.map(([o, c, a]) => `<stop offset="${o}" stop-color="${c}"${a !== undefined ? ` stop-opacity="${a}"` : ''}/>`).join('')}</radialGradient>`;
  return `<defs>
${lg('gLumen', [[0, '#8A1A2C'], [1, '#5C0F1F']], 0, 0, 1, 0)}
${lg('gIntima', [[0, '#FBE6DD'], [1, '#EFC6B8']], 0, 0, 1, 0)}
${lg('gMedia', [[0, '#D27A78'], [1, '#A04A55']], 0, 0, 1, 0)}
${lg('gAdv', [[0, '#F6E7CE'], [1, '#DCC29A']], 0, 0, 1, 0)}
${lg('gAdvFadeR', [[0, '#DCC29A', 0.9], [1, '#DCC29A', 0]], 0, 0, 1, 0)}
${lg('gAdvFadeL', [[0, '#DCC29A', 0], [1, '#DCC29A', 0.9]], 0, 0, 1, 0)}
${lg('gCap', [[0, '#FFF3CC'], [1, '#E7C976']], 0, 0, 1, 0)}
${lg('gCore', [[0, '#F7CD58'], [1, '#C99318']], 0, 0, 1, 1)}
${rg('gRbc', [[0, '#F0707C'], [0.6, '#C8283C'], [1, '#7F1022']])}
${rg('gLdl', [[0, '#FFF0B8'], [0.55, '#F5C24A'], [1, '#B98410']])}
${rg('gLdlOx', [[0, '#F7C98A'], [0.55, '#C66A1E'], [1, '#7A3A0A']])}
${rg('gImm', [[0, '#C9BEFF'], [0.55, '#8E7CE8'], [1, '#5A47B8']])}
${rg('gFoam', [[0, '#FFF1A8'], [0.6, '#F2CD4C'], [1, '#C79614']])}
${rg('gPlt', [[0, '#F6D2FF'], [1, '#B66FE0']])}
${rg('gGlowR', [[0, '#FF6A5A', 0.75], [1, '#FF6A5A', 0]], 0.5, 0.5, 0.5)}
${rg('gGlowG', [[0, '#F8C038', 0.7], [1, '#F8C038', 0]], 0.5, 0.5, 0.5)}
<filter id="fSh" x="-30%" y="-30%" width="170%" height="170%"><feDropShadow dx="8" dy="12" stdDeviation="9" flood-color="#021014" flood-opacity=".45"/></filter>
<filter id="fShS" x="-30%" y="-30%" width="170%" height="170%"><feDropShadow dx="3" dy="5" stdDeviation="3.5" flood-color="#021014" flood-opacity=".42"/></filter>
<filter id="fGl" x="-60%" y="-60%" width="220%" height="220%"><feGaussianBlur stdDeviation="6"/></filter>
<filter id="fGlS" x="-60%" y="-60%" width="220%" height="220%"><feGaussianBlur stdDeviation="2.4"/></filter>
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
