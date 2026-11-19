// Penampang samping ujung jari + penjepit (oximeter) dalam SATU orientasi ruang untuk seluruh video:
//   ujung jari menunjuk ke KANAN, kuku di ATAS; rahang atas penjepit (lampu merah + inframerah, prosesor, layar) di atas jari;
//   rahang bawah (fotodetektor) di bawah jari; engsel di sisi kanan; cahaya selalu merambat dari ATAS ke BAWAH melewati jari.
//   Pembuluh arteri digital horizontal di bawah tulang; darah mengalir dari KIRI (pangkal jari) ke KANAN (ujung jari).
import { f1, clamp, lerp, R, C, P, T, G, COL, INK, GOLD, rndf, MC, FONT } from './lib.js';
import { MU, phase, pulse, D0, DA, effMu, trans } from './physics.js';

export const GEO = {
  fingerTop: 700, fingerBot: 1010, tip: 840, vesselY: 914, boneTop: 764, boneBot: 846,
  led: { r: [505, 700], i: [575, 700] }, det: [540, 1010], beamX: 540,
  jawL: 360, jawR: 940, upperTop: 552, lowerBot: 1160,
};
const { fingerTop: FT, fingerBot: FB, tip: TIP, vesselY: VY } = GEO;

/** badan jari: kulit, tulang, kuku (polish = warna cat kuku atau null), melanin 0..1 (lapisan kulit lebih gelap), dingin 0..1 (kebiruan) */
export function fingerBody({ polish = null, melanin = 0, cold = 0 } = {}) {
  const skin = mixHex(mixHex(COL.skin, '#7A4A2E', melanin * 0.8), '#9FB4D6', cold * 0.45);
  const dk = mixHex(skin, '#000000', 0.12);
  const d = `M -40 ${FT} L ${TIP - 40} ${FT} Q ${TIP + 28} ${FT} ${TIP + 40} ${(FT + FB) / 2} Q ${TIP + 28} ${FB} ${TIP - 40} ${FB} L -40 ${FB} Z`;
  let s = `<path d="${d}" fill="${skin}" stroke="${INK}" stroke-width="5" stroke-linejoin="round"/>`;
  // bagian dalam: lapisan lebih gelap tipis di tepi atas dan bawah (epidermis)
  s += `<path d="M -36 ${FT + 3} L ${TIP - 40} ${FT + 3} Q ${TIP + 22} ${FT + 3} ${TIP + 33} ${(FT + FB) / 2 - 20}" fill="none" stroke="${dk}" stroke-width="${f1(6 + 10 * melanin)}" opacity=".7" stroke-linecap="round"/>`;
  s += `<path d="M -36 ${FB - 3} L ${TIP - 40} ${FB - 3} Q ${TIP + 22} ${FB - 3} ${TIP + 33} ${(FT + FB) / 2 + 20}" fill="none" stroke="${dk}" stroke-width="${f1(6 + 10 * melanin)}" opacity=".6" stroke-linecap="round"/>`;
  if (melanin > 0.05) for (let i = 0; i < 26; i++) s += C(40 + rndf(i) * (TIP - 60), FT + 8 + rndf(i + 40) * 14, 2.4 + rndf(i + 9) * 2, '#4A2A18', `opacity=".5"`);
  // tulang falang distal
  s += `<path d="M -40 ${GEO.boneTop} L ${TIP - 120} ${GEO.boneTop} Q ${TIP - 50} ${GEO.boneTop} ${TIP - 40} ${(GEO.boneTop + GEO.boneBot) / 2} Q ${TIP - 50} ${GEO.boneBot} ${TIP - 120} ${GEO.boneBot} L -40 ${GEO.boneBot} Z" fill="${COL.bone}" stroke="#B7A98A" stroke-width="4"/>`;
  // kuku di atas jari
  const nailFill = polish || COL.nail;
  s += `<path d="M 470 ${FT - 2} L ${TIP - 30} ${FT - 2} Q ${TIP + 4} ${FT - 2} ${TIP + 12} ${FT + 22} L 470 ${FT + 22} Z" fill="${nailFill}" stroke="${polish ? mixHex(polish, '#000', 0.35) : '#D9B7BC'}" stroke-width="4"/>`;
  return s;
}
export const mixHex = (a, b, k) => { const h = (c) => [1, 3, 5].map((i) => parseInt(c.slice(i, i + 2), 16)); const A = h(a), B = h(b); return '#' + A.map((v, i) => Math.round(v + (B[i] - v) * k).toString(16).padStart(2, '0')).join(''); };

// ---------------------------------------------------------------- pembuluh dan sel darah
/** tebal pembuluh pada waktu narasi tn: dasar D0 * (1 - konstriksi) + denyut */
export function vesselD(tn, { amp = 1, base = D0 } = {}) { return base + DA * amp * pulse(phase(tn)); }
export function vesselSvg(d, { dark = false, cold = 0 } = {}) {
  const y0 = VY - d / 2, y1 = VY + d / 2;
  return `<rect x="-60" y="${f1(y0)}" width="${TIP - 40 + 60}" height="${f1(d)}" fill="${dark ? '#8F3B3F' : COL.plasma}" opacity=".92"/>`
    + `<path d="M -60 ${f1(y0)} H ${TIP - 40} M -60 ${f1(y1)} H ${TIP - 40}" stroke="${COL.vessel}" stroke-width="9" stroke-linecap="round" fill="none"/>`
    + `<path d="M ${TIP - 40} ${f1(y0)} Q ${TIP - 8} ${VY} ${TIP - 40} ${f1(y1)}" stroke="${COL.vessel}" stroke-width="9" fill="none"/>`;
}
const FLOW = 100, T_C0 = 17.95, SP = 1.5;      // kecepatan alir (satuan dunia/detik), waktu sel k=0 tepat di berkas, jarak antarsel (detik)
/** jenis sel ke-k: urutan cerita 17,95 - 22,5 (O, D, O, D), selebihnya sebagian besar beroksigen. mode: 'normal' | 'co' */
export function cellType(k, mode = 'normal') {
  if (k < 0 && k >= -8) return 'oxy';
  if (k >= 0 && k <= 3) return ['oxy', 'deoxy', 'oxy', 'deoxy'][k];
  const r = rndf(k * 7.3 + 1);
  if (mode === 'co') return r < 0.5 ? 'co' : r < 0.9 ? 'oxy' : 'deoxy';
  return r < 0.07 ? 'deoxy' : 'oxy';
}
export const cellX = (tn, k) => GEO.beamX + FLOW * (tn - T_C0 - SP * k);
export function cellsList(tn, x0 = -40, x1 = 880) {
  const kmax = Math.ceil((tn - T_C0 - (x0 - GEO.beamX) / FLOW) / SP), kmin = Math.floor((tn - T_C0 - (x1 - GEO.beamX) / FLOW) / SP);
  const out = []; for (let k = kmin - 1; k <= kmax + 1; k++) { const x = cellX(tn, k); if (x > x0 - 30 && x < x1 + 30) out.push({ k, x }); }
  return out;
}
/** satu sel darah merah (pandangan samping, bikonkaf). tag: gambar penanda O2 / CO */
export function cell(x, y, type, { s = 1, rot = 0, tag = true, glow = 0 } = {}) {
  const c = { oxy: [COL.oxy, COL.oxyDk], deoxy: [COL.deoxy, COL.deoxyDk], co: [COL.co, '#C7527A'] }[type];
  let g = `<g transform="translate(${f1(x)} ${f1(y)}) rotate(${rot}) scale(${s})">`;
  if (glow > 0.02) g += `<ellipse rx="34" ry="24" fill="${GOLD}" opacity="${f1(0.55 * glow * 100) / 100}"/>`;
  g += `<ellipse rx="22" ry="14.5" fill="${c[0]}" stroke="${c[1]}" stroke-width="3"/><ellipse rx="10" ry="4.6" fill="${c[1]}" opacity=".55"/>`;
  if (tag) {
    if (type === 'oxy') g += `<g fill="#fff"><circle cx="-9" cy="-9.5" r="2.6"/><circle cx="-4" cy="-9.5" r="2.6"/><circle cx="4" cy="-9.5" r="2.6"/><circle cx="9" cy="-9.5" r="2.6"/></g><path d="M-9 -9.5H-4M4 -9.5H9" stroke="#fff" stroke-width="1.8"/>`;
    if (type === 'co') g += `<text y="-7" text-anchor="middle" font-family="${FONT}" font-weight="800" font-size="12" fill="#5C1230">CO</text>`;
  }
  return g + `</g>`;
}
export function cellsSvg(tn, o = {}) {
  const lo = VY - 0, list = cellsList(tn, o.x0 ?? -40, o.x1 ?? 880); let s = '';
  for (const { k, x } of list) {
    const r1v = rndf(k * 3.1) - 0.5, yy = VY + r1v * (o.spread ?? 14) * (o.dmul ?? 1), rot = (rndf(k * 5.7) - 0.5) * 24;
    const near = Math.abs(x - GEO.beamX); const gl = o.hi && o.hi(k, x) ? 1 : 0;
    s += cell(x, yy, cellType(k, o.mode), { s: 1, rot, tag: o.tag !== false, glow: gl });
  }
  return s;
}
// ---------------------------------------------------------------- penjepit (potongan)
export function clipSvg({ ledR = 0, ledI = 0, det = 0, scr = '97', pr = '72', chipGlow = 0 } = {}) {
  const J = GEO; let s = '';
  const dk = '#14343C';
  // engsel kanan (menghubungkan rahang), saluran kabel dari detektor ke prosesor
  s += R(J.jawR - 70, J.upperTop, 70, J.lowerBot - J.upperTop, COL.body, 18, `stroke="${INK}" stroke-width="5"`) + R(J.jawR - 48, J.upperTop + 20, 26, J.lowerBot - J.upperTop - 40, dk, 8);
  // rahang atas: rumah + rongga
  s += P(`M ${J.jawL} ${J.upperTop + 20} Q ${J.jawL} ${J.upperTop} ${J.jawL + 22} ${J.upperTop} H ${J.jawR - 20} Q ${J.jawR} ${J.upperTop} ${J.jawR} ${J.upperTop + 20} V ${FT - 6} H ${J.jawL} Z`, COL.body, `stroke="${INK}" stroke-width="5" stroke-linejoin="round"`);
  s += R(J.jawL + 16, J.upperTop + 42, J.jawR - J.jawL - 32, FT - 6 - (J.upperTop + 42) - 12, dk, 12);
  s += R(J.jawL + 34, J.upperTop + 10, J.jawR - J.jawL - 68, 22, '#0B1A20', 8) + T(`SpO₂ ${scr}   PR ${pr}`, (J.jawL + J.jawR) / 2 - 20, J.upperTop + 28, { size: 17, fill: '#9DE0BD', w: 800 });
  // papan sirkuit + LED
  s += R(J.jawL + 30, FT - 26, 360, 12, '#3E7A57', 3);
  const ledSvg = (x, on, col, colDk) => R(x - 17, FT - 20, 34, 18, on > 0.05 ? col : '#40525C', 5, `stroke="${INK}" stroke-width="3"`) + (on > 0.05 ? C(x, FT - 10, 12, '#FFFFFF', `opacity="${f1(0.55 * on * 100) / 100}"`) : '');
  s += ledSvg(J.led.r[0], ledR, COL.red) + ledSvg(J.led.i[0], ledI, COL.ir);
  // prosesor (di rahang atas, dekat engsel)
  s += R(J.jawL + 270, FT - 92, 112, 52, chipGlow > 0.05 ? '#2FBF92' : '#2F6F66', 8, `stroke="${INK}" stroke-width="3"`) + `<path d="M${J.jawL + 270} ${FT - 80}h-14M${J.jawL + 270} ${FT - 66}h-14M${J.jawL + 270} ${FT - 52}h-14M${J.jawL + 382} ${FT - 80}h14M${J.jawL + 382} ${FT - 66}h14M${J.jawL + 382} ${FT - 52}h14" stroke="#9DB0B7" stroke-width="4"/>`;
  // rahang bawah: rumah + fotodetektor
  s += P(`M ${J.jawL} ${FB + 6} H ${J.jawR} V ${J.lowerBot - 20} Q ${J.jawR} ${J.lowerBot} ${J.jawR - 20} ${J.lowerBot} H ${J.jawL + 22} Q ${J.jawL} ${J.lowerBot} ${J.jawL} ${J.lowerBot - 20} Z`, COL.body, `stroke="${INK}" stroke-width="5" stroke-linejoin="round"`);
  s += R(J.jawL + 16, FB + 18, J.jawR - J.jawL - 32, J.lowerBot - FB - 40, dk, 12);
  s += R(J.det[0] - 34, FB + 4, 68, 22, det > 0.05 ? mixHex('#5E7E96', '#FFF2A8', clamp(det, 0, 1)) : '#5E7E96', 6, `stroke="${INK}" stroke-width="3"`);
  // kabel detektor -> prosesor melewati engsel (garis tipis)
  s += `<path d="M ${J.det[0] + 40} ${FB + 24} H ${J.jawR - 36} V ${FT - 66} H ${J.jawL + 270 + 112 + 14}" fill="none" stroke="#9DB0B7" stroke-width="4" stroke-dasharray="2 8" stroke-linecap="round"/>`;
  s += `<path d="M ${J.led.r[0] - 8} ${FT - 26} V ${FT - 66} H ${J.jawL + 256}" fill="none" stroke="#9DB0B7" stroke-width="4" stroke-dasharray="2 8" stroke-linecap="round"/>`;
  return s;
}
// ---------------------------------------------------------------- berkas cahaya
/** transmisi berkas pada waktu tn untuk panjang gelombang w ('r' | 'i'): sebelum/sesudah pembuluh. env: {nailT, skinT} peredam tambahan di jaringan atas */
export function beamTrans(tn, w, o = {}) {
  const d = o.d ?? vesselD(tn, { amp: o.amp ?? 1, base: o.base }), frac = o.frac ?? 0.97;
  let mu = effMu(frac)[w];
  if (o.cellMu != null) mu = o.cellMu;
  const pre = (o.pre ?? 1) * 0.78;      // kuku + dermis + tulang (konstan, peredam bersama)
  const tv = Math.exp(-mu * d / 40);
  return { pre, tv, post: pre * tv * 0.92 };
}
const LED_X = { r: GEO.led.r[0], i: GEO.led.i[0] };
export function beamSvg(tn, w, o = {}) {
  const col = w === 'r' ? COL.red : COL.ir, on = o.on ?? 1; if (on <= 0.01) return '';
  const tr = beamTrans(tn, w, o), x0 = LED_X[w], y0 = FT - 6, y1 = FB + 4, xe = GEO.det[0] + (w === 'r' ? -6 : 6);
  const yv0 = VY - 36, yv1 = VY + 36;
  const xAt = (y) => lerp(x0, xe, (y - y0) / (y1 - y0));
  const a0 = 0.62 * on, a1 = a0 * tr.pre, a2 = a1 * tr.tv, a3 = a2 * 0.95;
  const id = 'bg' + w + (o.id || '');
  const wd = (y) => 13 + 11 * Math.sin(Math.PI * (y - y0) / (y1 - y0));
  const poly = `M ${f1(xAt(y0) - wd(y0))} ${y0} L ${f1(xAt(y0) + wd(y0))} ${y0} L ${f1(xAt(y1) + wd(y1))} ${y1} L ${f1(xAt(y1) - wd(y1))} ${y1} Z`;
  const stops = [[0, a0], [(GEO.boneTop - y0) / (y1 - y0), a0 * 0.95], [(GEO.boneBot - y0) / (y1 - y0), a1], [(yv0 - y0) / (y1 - y0), a1], [(yv1 - y0) / (y1 - y0), a2], [1, a3]];
 const reach = o.reach ?? 1, yLim = y0 + reach * (y1 - y0);
  let s = `<defs><clipPath id="${id}c"><rect x="0" y="${y0 - 2}" width="1200" height="${f1(Math.max(0, yLim - y0 + 2))}"/></clipPath><linearGradient id="${id}" gradientUnits="userSpaceOnUse" x1="0" y1="${y0}" x2="0" y2="${y1}">${stops.map(([o2, a]) => `<stop offset="${f1(clamp(o2, 0, 1) * 1000) / 1000}" stop-color="${col}" stop-opacity="${f1(clamp(a, 0, 1) * 1000) / 1000}"/>`).join('')}</linearGradient></defs>`;
  s += `<g clip-path="url(#${id}c)"><path d="${poly}" fill="url(#${id})"/></g>`;
  // foton: bergerak turun; tiap foton punya "nasib" tetap -> hidup melewati pembuluh bila nasib < transmisi (kepadatan sesudah pembuluh mengikuti transmisi)
  const N = o.photons ?? 15, speed = o.speed ?? 190;
  for (let n = 0; n < N; n++) {
    const u0 = rndf(n * 2.3 + (w === 'r' ? 0 : 50)), fate = rndf(n * 4.1 + 7), fatePre = rndf(n * 9.2 + 3);
    const u = ((tn * speed / (y1 - y0) + u0) % 1 + 1) % 1, y = y0 + u * (y1 - y0), xx = xAt(y) + (rndf(n * 1.7 + 4) - 0.5) * wd(y) * 1.3;
    let alive = 1;
    if (y > GEO.boneBot && fatePre > tr.pre) alive = 0;
    if (y > VY && fate > tr.tv) alive = 0;
    if (!alive || y > yLim) continue;
    s += `<g opacity="${f1(on * 0.95 * 100) / 100}"><circle cx="${f1(xx)}" cy="${f1(y)}" r="5.2" fill="#fff"/><circle cx="${f1(xx)}" cy="${f1(y)}" r="10" fill="${col}" opacity=".55"/></g>`;
  }
  return s;
}
export const detLevel = (tn, o = {}) => { const a = beamTrans(tn, 'r', { ...o }).post, b = beamTrans(tn, 'i', { ...o }).post; return clamp((a + b) * 0.9, 0, 1); };
