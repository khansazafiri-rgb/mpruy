// Aset medis berlapis (kode) untuk video "Hemodialisis": ginjal, dialiser, serat berongga, mesin, selang, partikel, label. Cahaya kunci dari kiri-atas, bayangan jatuh ke kanan-bawah (aturan seri anatomi MEDCOEL).
// Warna fungsi: darah = merah (tidak pernah berubah warna), cairan dialisis = cyan, zat sisa (urea) = ambar, mineral = ungu muda, cairan berlebih = biru muda. Semua skema penjelasan, bukan skala nyata.
import { f1, clamp, lerp, sm, eo, MC, FONT, pathPt, pathLen, rad } from './core.js';

export const COL = {
  blood: '#D63447', bloodDk: '#8E1428', bloodHi: '#FF8D9A', dial: '#3CC4D6', dialLt: '#A6EEF5', dialDk: '#1B8EA3',
  urea: '#F2A33A', ureaDk: '#9A5E0C', ion: '#A99BFF', water: '#7CC8FF', mem: '#C9C4E6', memDk: '#7F78A8', ink: MC.ink, ivory: MC.ivory, gold: MC.gold,
};

export function defs() {
  const lg = (id, stops, x1 = 0, y1 = 0, x2 = 1, y2 = 1) => `<linearGradient id="${id}" x1="${x1}" y1="${y1}" x2="${x2}" y2="${y2}">${stops.map(([o, c, a]) => `<stop offset="${o}" stop-color="${c}"${a !== undefined ? ` stop-opacity="${a}"` : ''}/>`).join('')}</linearGradient>`;
  return `<defs>
${lg('gKid', [[0, '#F29A82'], [0.5, '#D26A5C'], [1, '#8E3D3A']])}
${lg('gKidMed', [[0, '#B9524B'], [1, '#6E2630']])}
${lg('gKidDim', [[0, '#8C7E86'], [1, '#4F4650']])}
${lg('gPelvis', [[0, '#FFE2A8'], [1, '#E0A850']])}
${lg('gBlood', [[0, '#E4505F'], [0.6, '#C8283C'], [1, '#8E1428']])}
${lg('gMach', [[0, '#FFFFFF'], [0.55, '#E2EBEA'], [1, '#A9BDBD']])}
${lg('gMachDk', [[0, '#1B6E64'], [1, '#0B3F38']])}
${lg('gGlass', [[0, '#FFFFFF', 0.5], [0.3, '#CFEFF5', 0.18], [1, '#7FB9C6', 0.3]], 0, 0, 1, 0)}
${lg('gCap', [[0, '#F3F7F8'], [1, '#A7B9C0']], 0, 0, 1, 0)}
${lg('gBag', [[0, '#9AF0F7', 0.85], [1, '#2BA6B8', 0.9]])}
<radialGradient id="gCell" cx=".38" cy=".32" r=".8"><stop offset="0" stop-color="#F26A78"/><stop offset=".6" stop-color="#D63447"/><stop offset="1" stop-color="#8E1428"/></radialGradient>
<filter id="fSh" x="-30%" y="-30%" width="170%" height="170%"><feDropShadow dx="8" dy="12" stdDeviation="9" flood-color="#021014" flood-opacity=".45"/></filter>
<filter id="fShS" x="-30%" y="-30%" width="170%" height="170%"><feDropShadow dx="3" dy="5" stdDeviation="3.5" flood-color="#021014" flood-opacity=".42"/></filter>
<filter id="fGl" x="-60%" y="-60%" width="220%" height="220%"><feGaussianBlur stdDeviation="6"/></filter>
<filter id="fGlS" x="-60%" y="-60%" width="220%" height="220%"><feGaussianBlur stdDeviation="2.4"/></filter>
</defs>`;
}

// ------------------------------------------------------------------ selang/pembuluh berisi cairan bergerak
// d = path; w = lebar isi; o: {ph (fase aliran, satuan px), kind: 'blood'|'dial'|'urine', wall: bool, a}
export function tube(d, w, o = {}) {
  const k = o.kind ?? 'blood', P = {
    blood: { base: COL.bloodDk, mid: COL.blood, hi: COL.bloodHi, dash: '#FF9AA6' },
    dial: { base: COL.dialDk, mid: COL.dial, hi: COL.dialLt, dash: '#D8FBFF' },
    urine: { base: '#B98418', mid: '#F2C24A', hi: '#FFF0B0', dash: '#FFF7CF' },
  }[k], ph = o.ph ?? 0, a = o.a ?? 1;
  const wall = o.wall === false ? '' : `<path d="${d}" fill="none" stroke="#D9EEF2" stroke-width="${f1(w + 8)}" stroke-linecap="round" stroke-linejoin="round" opacity="${f1(0.5 * a)}"/><path d="${d}" fill="none" stroke="${MC.ink}" stroke-width="${f1(w + 11)}" stroke-linecap="round" stroke-linejoin="round" opacity="${f1(0.28 * a)}" transform="translate(2.5 3.5)"/>`;
  const dash = `stroke-dasharray="${f1(w * 1.5)} ${f1(w * 3.2)}" stroke-dashoffset="${f1(-ph)}"`;
  return `<g opacity="${a}" class="tube">${wall}<path d="${d}" fill="none" stroke="${P.base}" stroke-width="${f1(w)}" stroke-linecap="round" stroke-linejoin="round"/><path d="${d}" fill="none" stroke="${P.mid}" stroke-width="${f1(w * 0.74)}" stroke-linecap="round" stroke-linejoin="round" transform="translate(${f1(-w * 0.06)} ${f1(-w * 0.06)})"/><path d="${d}" fill="none" stroke="${P.dash}" stroke-width="${f1(w * 0.3)}" stroke-linecap="round" ${dash} opacity=".55"/><path d="${d}" fill="none" stroke="${P.hi}" stroke-width="${f1(Math.max(1.5, w * 0.14))}" stroke-linecap="round" stroke-linejoin="round" transform="translate(${f1(-w * 0.2)} ${f1(-w * 0.2)})" opacity=".6"/></g>`;
}
// partikel (titik/ikon) yang bergerak sepanjang path. items: n buah, kecepatan v (fraksi path per detik), fase t
export function along(d, n, t, v, draw, o = {}) {
  let s = ''; const L = pathLen(d), seed = o.seed ?? 0;
  for (let i = 0; i < n; i++) {
    const u0 = (i / n + seed * 0.137) % 1, u = (((u0 + t * v) % 1) + 1) % 1, p = pathPt(d, o.rev ? 1 - u : u), off = o.spread ? Math.sin(i * 12.9 + seed) * o.spread : 0, nx = -Math.sin(p.ang), ny = Math.cos(p.ang);
    s += draw(p.x + nx * off, p.y + ny * off, i, u, p.ang);
  }
  return s;
}

// ------------------------------------------------------------------ partikel skematis
export const ureaP = (x, y, r = 5, a = 1, rot = 0) => `<g transform="translate(${f1(x)} ${f1(y)}) rotate(${f1(rot)})" opacity="${f1(a)}"><path d="M0 ${-r * 1.25}L${r * 1.15} 0L0 ${r * 1.25}L${-r * 1.15} 0Z" fill="${COL.urea}" stroke="${COL.ureaDk}" stroke-width="${f1(r * 0.22)}" stroke-linejoin="round"/><circle cx="${f1(-r * 0.25)}" cy="${f1(-r * 0.3)}" r="${f1(r * 0.22)}" fill="#fff" opacity=".7"/></g>`;
export const ionP = (x, y, r = 4.5, a = 1) => `<g transform="translate(${f1(x)} ${f1(y)})" opacity="${f1(a)}"><circle r="${f1(r)}" fill="${COL.ion}" stroke="#5B4FC4" stroke-width="${f1(r * 0.24)}"/><path d="M${f1(-r * 0.45)} 0H${f1(r * 0.45)}M0 ${f1(-r * 0.45)}V${f1(r * 0.45)}" stroke="#fff" stroke-width="${f1(r * 0.28)}" stroke-linecap="round"/></g>`;
export const waterP = (x, y, r = 4.5, a = 1) => `<g transform="translate(${f1(x)} ${f1(y)})" opacity="${f1(a)}"><path d="M0 ${f1(-r * 1.5)}C${f1(r * 0.3)} ${f1(-r * 0.7)} ${f1(r)} ${f1(-r * 0.4)} ${f1(r)} ${f1(r * 0.3)}A${r} ${r} 0 0 1 ${f1(-r)} ${f1(r * 0.3)}C${f1(-r)} ${f1(-r * 0.4)} ${f1(-r * 0.3)} ${f1(-r * 0.7)} 0 ${f1(-r * 1.5)}Z" fill="${COL.water}" stroke="#2F7FC0" stroke-width="${f1(r * 0.2)}"/></g>`;
export const cellP = (x, y, r = 11, rot = 0, a = 1) => `<g transform="translate(${f1(x)} ${f1(y)}) rotate(${f1(rot)})" opacity="${f1(a)}"><ellipse rx="${f1(r)}" ry="${f1(r * 0.78)}" fill="url(#gCell)" stroke="${COL.bloodDk}" stroke-width="${f1(r * 0.12)}"/><ellipse rx="${f1(r * 0.42)}" ry="${f1(r * 0.3)}" fill="${COL.bloodDk}" opacity=".45"/><ellipse cx="${f1(-r * 0.3)}" cy="${f1(-r * 0.32)}" rx="${f1(r * 0.22)}" ry="${f1(r * 0.12)}" fill="#fff" opacity=".5"/></g>`;

// ------------------------------------------------------------------ ginjal (2.5D), pusat (0,0), tinggi ±275, hilus di sisi kiri (-95, 40)
export const KID_D = 'M20 -270C140 -278 205 -175 198 -20C190 130 130 262 20 272C-70 280 -125 214 -95 150C-75 108 -62 72 -92 36C-122 -2 -132 -52 -108 -112C-84 -200 -42 -262 20 -270Z';
export const KID = { arteri: [-98, -10], vena: [-98, 70], ureter: [-72, 150], hilus: [-90, 36] };
/** o: fn 0..1 (fungsi: tint abu saat turun + sedikit mengerut), glow 0..1, id, cut 0..1 (potongan: tampilkan korteks, medula, pelvis) */
export function kidney(o = {}) {
  const fn = clamp(o.fn ?? 1), id = o.id ?? 'k', dim = 1 - fn, sc = 1 - 0.1 * dim;
  const base = fn > 0.995 ? 'url(#gKid)' : 'url(#gKid)';
  const pyr = [[-10, -190, 0.2], [60, -200, -0.15], [120, -140, -0.5], [135, -50, -0.9], [130, 40, -1.2], [105, 120, -1.55], [50, 175, -1.9], [-10, 180, -2.4]];
  let med = '';
  pyr.forEach(([x, y, a], i) => { med += `<g transform="translate(${x} ${y}) rotate(${f1(a * 57.3 + 90)})"><path d="M-30 -34Q0 -52 30 -34L8 34Q0 42 -8 34Z" fill="url(#gKidMed)" stroke="#5A1E28" stroke-width="2" opacity=".95"/><path d="M-18 -26Q0 -38 18 -26" fill="none" stroke="#E08A80" stroke-width="3" opacity=".35"/></g>`; });
  const dimOverlay = dim > 0.01 ? `<path d="${KID_D}" fill="url(#gKidDim)" opacity="${f1(0.8 * dim)}"/>` : '';
  return `<g class="kidney" transform="scale(${sc.toFixed(3)})" ${o.shadow === false ? '' : 'filter="url(#fSh)"'}>
<path d="${KID_D}" fill="${base}"/>
<clipPath id="${id}c"><path d="${KID_D}"/></clipPath>
<g clip-path="url(#${id}c)">
<path d="${KID_D}" fill="none" stroke="#FFC7B8" stroke-width="22" opacity=".35" filter="url(#fGl)" transform="translate(-6 -6)"/>
<path d="${KID_D}" fill="none" stroke="#4A1620" stroke-width="40" opacity=".4" filter="url(#fGl)" transform="translate(14 18)"/>
<g opacity="${f1(0.35 + 0.65 * clamp(o.cut ?? 0))}">${med}</g>
<path d="M-70 -20C-20 -52 34 -32 44 10C50 54 12 96 -42 94C-84 84 -96 30 -70 -20Z" fill="url(#gPelvis)" stroke="#9A6A20" stroke-width="3" opacity="${f1(0.4 + 0.6 * clamp(o.cut ?? 0))}"/>
<path d="M-60 -10C-10 -10 40 -60 60 -140M-40 30C40 20 90 -10 118 -40M-48 70C20 90 70 130 92 120M-50 60C-10 110 -10 150 -4 168" fill="none" stroke="#E9B863" stroke-width="9" stroke-linecap="round" opacity="${f1(0.3 + 0.7 * clamp(o.cut ?? 0))}"/>
</g>
<path d="${KID_D}" fill="none" stroke="#3E1018" stroke-width="3" opacity=".55"/>
<path d="M40 -250C110 -250 172 -190 178 -100" fill="none" stroke="#fff" stroke-width="7" stroke-linecap="round" opacity=".38"/>
${dimOverlay}
${(o.glow ?? 0) > 0.01 ? `<path d="${KID_D}" fill="none" stroke="${o.glowColor ?? '#FFE9A8'}" stroke-width="16" opacity="${f1(0.6 * o.glow)}" filter="url(#fGl)"/>` : ''}
</g>`;
}

// ------------------------------------------------------------------ dialiser: pusat (0,0), tinggi ±330, lebar ±95; darah masuk dari bawah, keluar di atas; cairan dialisis masuk di atas-samping, keluar di bawah-samping (BERLAWANAN)
export const DZ = { w: 95, h: 330, nF: 11 };
export const DZ_BLOOD_IN = [0, 372], DZ_BLOOD_OUT = [0, -372], DZ_DIAL_IN = [115, -250], DZ_DIAL_OUT = [115, 250];
/** o: cut 0..1 (cangkang bening, serat terlihat), phB (fase aliran darah, naik), phD (fase dialisat, turun), id */
export function dialyzer(o = {}) {
  const cut = clamp(o.cut ?? 1), id = o.id ?? 'dz', w = DZ.w, h = DZ.h, phB = o.phB ?? 0, phD = o.phD ?? 0;
  const housing = `M${-w} ${-h + 22}Q${-w} ${-h} ${-w + 24} ${-h}H${w - 24}Q${w} ${-h} ${w} ${-h + 22}V${h - 22}Q${w} ${h} ${w - 24} ${h}H${-w + 24}Q${-w} ${h} ${-w} ${h - 22}Z`;
  let fib = '', dg = '';
  const xs = Array.from({ length: DZ.nF }, (_, i) => -w + 18 + (i + 0.5) * ((2 * w - 36) / DZ.nF));
  xs.forEach((x, i) => {
    fib += `<path d="M${f1(x)} ${-h + 10}V${h - 10}" stroke="${COL.memDk}" stroke-width="10" stroke-linecap="round" opacity=".9"/><path d="M${f1(x)} ${-h + 10}V${h - 10}" stroke="${COL.mem}" stroke-width="7.5" stroke-linecap="round"/><path d="M${f1(x)} ${-h + 10}V${h - 10}" stroke="${COL.blood}" stroke-width="4.6" stroke-linecap="round"/><path d="M${f1(x)} ${h - 10}V${-h + 10}" stroke="#FFB3BC" stroke-width="2.4" stroke-linecap="round" stroke-dasharray="14 30" stroke-dashoffset="${f1(-phB)}" opacity=".8"/>`;
    if (i < xs.length - 1) { const gx = (x + xs[i + 1]) / 2; dg += `<path d="M${f1(gx)} ${-h + 14}V${h - 14}" stroke="#E5FCFF" stroke-width="2.6" stroke-linecap="round" stroke-dasharray="12 26" stroke-dashoffset="${f1(-phD)}" opacity=".85"/>`; }
  });
  const clip = `<clipPath id="${id}c"><path d="${housing}"/></clipPath>`;
  const inner = `${clip}<g clip-path="url(#${id}c)" opacity="${f1(cut)}"><rect x="${-w}" y="${-h}" width="${2 * w}" height="${2 * h}" fill="${COL.dial}" opacity=".5"/>${dg}${fib}</g>`;
  const caps = [-1, 1].map((s) => `<path d="M${-w + 4} ${s * (h - 2)}H${w - 4}L${w - 22} ${s * (h + 34)}H${-w + 22}Z" fill="url(#gCap)" stroke="${MC.ink}" stroke-width="3" opacity=".96"/><rect x="-22" y="${s > 0 ? h + 28 : -h - 52}" width="44" height="24" rx="6" fill="url(#gCap)" stroke="${MC.ink}" stroke-width="3"/>`).join('');
  const ports = [[1, -250], [1, 250]].map(([s, y]) => `<rect x="${w - 4}" y="${y - 14}" width="30" height="28" rx="6" fill="url(#gCap)" stroke="${MC.ink}" stroke-width="3"/>`).join('');
  return `<g class="dialiser" ${o.shadow === false ? '' : 'filter="url(#fSh)"'}><path d="${housing}" fill="url(#gGlass)" opacity="${f1(1)}"/>${inner}${caps}${ports}<path d="${housing}" fill="none" stroke="${MC.ink}" stroke-width="4" opacity=".55"/><path d="M${-w + 14} ${-h + 40}V${h - 60}" stroke="#fff" stroke-width="7" stroke-linecap="round" opacity=".5"/><path d="M${-w + 6} ${-h + 20}V${-h + 40}" stroke="#fff" stroke-width="7" stroke-linecap="round" opacity=".3"/></g>`;
}

// ------------------------------------------------------------------ label pil gading (gaya MEDCOEL): chip berpusat (cx, cy), garis penuntun ke (x, y)
export function chip(x, y, txt, o = {}) {
  const fs = o.fs ?? 32, a = o.a ?? 1; if (a <= 0.003) return '';
  let lines = txt.split('\n');
  if (lines.length === 1 && o.maxw && lines[0].length * fs * 0.6 + 44 > o.maxw && lines[0].includes(' ')) { const ws = lines[0].split(' '), mid = Math.ceil(ws.length / 2); lines = [ws.slice(0, mid).join(' '), ws.slice(mid).join(' ')]; }
  const w = Math.max(...lines.map((l) => l.length * fs * 0.6 + 44)), h = lines.length === 1 ? fs * 1.78 : fs * 2.55, cx = o.cx, cy = o.cy ?? y, left = cx - w / 2, right = cx + w / 2;
  const ex = x < left ? left : x > right ? right : x, ey = x >= left && x <= right ? (y < cy ? cy - h / 2 : cy + h / 2) : cy;
  const txts = lines.map((l, i) => `<text x="${f1(cx)}" y="${f1(cy + (lines.length === 1 ? fs * 0.35 : (i === 0 ? -fs * 0.22 : fs * 0.98)))}" text-anchor="middle" font-family="${FONT}" font-weight="700" font-size="${fs}" fill="${MC.ink}">${l}</text>`).join('');
  const line = o.noLine ? '' : `<path d="M${f1(x)} ${f1(y)}L${f1(ex)} ${f1(ey)}" stroke="${MC.ink}" stroke-width="7" opacity=".5" stroke-linecap="round"/><path d="M${f1(x)} ${f1(y)}L${f1(ex)} ${f1(ey)}" stroke="${MC.gold}" stroke-width="3.6" stroke-linecap="round"/><circle cx="${f1(x)}" cy="${f1(y)}" r="9" fill="${MC.gold}" stroke="${MC.ink}" stroke-width="3"/><circle cx="${f1(x)}" cy="${f1(y)}" r="3" fill="${MC.ivory}"/>`;
  return `<g opacity="${f1(a)}">${line}<rect x="${f1(left)}" y="${f1(cy - h / 2)}" width="${f1(w)}" height="${f1(h)}" rx="${f1(Math.min(h / 2, 40))}" fill="${MC.ivory}" stroke="${MC.ink}" stroke-width="2.5"/>${txts}</g>`;
}
export const chipW = (txt, fs = 32) => Math.max(...txt.split('\n').map((l) => l.length * fs * 0.6 + 44));
export const tag = (cx, cy, txt, o = {}) => { const fs = o.fs ?? 30, w = chipW(txt, fs), h = fs * 1.7; return `<g opacity="${f1(o.a ?? 1)}"><rect x="${f1(cx - w / 2)}" y="${f1(cy - h / 2)}" width="${f1(w)}" height="${f1(h)}" rx="${f1(h / 2)}" fill="${o.bg ?? MC.ink}" stroke="${o.stroke ?? MC.gold}" stroke-width="3"/><text x="${f1(cx)}" y="${f1(cy + fs * 0.35)}" text-anchor="middle" font-family="${FONT}" font-weight="800" font-size="${fs}" fill="${o.fg ?? MC.ivory}">${txt}</text></g>`; };
