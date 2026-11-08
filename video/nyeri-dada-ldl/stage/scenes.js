// Adegan dan overlay: label terjadwal, kamera dunia pembuluh, efek putar balik waktu, penanda tahun, panel otot jantung, lembar lab, kartu pencegahan.
import { f1, clamp, lerp, sm, eo, eio, ei, seg, win, pchip, MC, FONT } from './core.js';
import * as A from './art.js';
import { FL, SPL, flowPhase, XR, H0, ldl, rbc } from './vessel.js';

// ---- kamera dunia pembuluh (11,6 - 44,8)
const kS = pchip([[11.6, 0.22], [13.0, 0.95], [16.8, 1.12], [17.0, 1.12], [19.8, 0.8], [20.9, 3.2], [21.7, 8.2], [23.2, 8.2], [23.84, 2.4], [28, 2.3], [32.3, 2.1], [36.3, 0.86], [38.5, 0.9], [40.2, 1.15], [41.6, 1.9], [43.2, 1.2], [44.8, 0.95]]);
const kX = pchip([[11.6, 0], [13.0, 40], [16.8, 70], [19.8, 60], [23.84, 150], [32.3, 160], [36.3, 70], [40.2, 120], [41.6, 140], [44.8, 60]]);
const kY = pchip([[11.6, 0], [13.0, -20], [17.0, -30], [19.8, 0], [23.84, 0], [32.3, 0], [36.3, 0], [40.2, -30], [41.6, -50], [44.8, -50]]);
// LDL yang diikuti kamera (21 - 23,8 dtk): posisi dunianya
const J_STAR = 4;
export const ldlStar = (t) => { const y = (((J_STAR * SPL + flowPhase(t) * 0.95 + 140) % FL) + FL) % FL - FL / 2; const xr = XR(y, 0), w = xr + H0 - 90; return [-H0 + 45 + (((J_STAR * 0.37 + 0.11) % 1)) * w, y]; };
export function camV(t) {
  let S = kS(t), cx = kX(t), cy = kY(t);
  const w = seg(t, 20.2, 21.1) * (1 - seg(t, 23.3, 24.2));
  if (w > 0) { const [lx, ly] = ldlStar(t); cx = lerp(cx, lx, w); cy = lerp(cy, ly, w); }
  return { cx, cy, S };
}
export const worldTf = (c) => `translate(${f1(540 - c.cx * c.S)} ${f1(960 - c.cy * c.S)}) scale(${f1(c.S * 1000) / 1000})`;
export const toScr = (c, x, y) => [540 + (x - c.cx) * c.S, 960 + (y - c.cy) * c.S];

// ---- label terjadwal (koordinat layar) untuk adegan jantung dan dunia pembuluh
const clampS = ([x, y]) => [clamp(x, 40, 1040), clamp(y, 340, 1700)];
export function chipsHeart(t, cam, toS) {
  const P = (x, y) => clampS(toS(cam, x, y));
  const [ax, ay] = P(389, 770);
  return A.chips(t, [
    [8.3, 10.8, 'Bisa jadi serangan jantung', 0, 0, 540, 392, { noLine: true, fs: 44, bg: MC.gold }],
    [9.4, 11.2, 'Arteri koroner', ax, ay, 790, 1640],
  ]);
}
export function chipsVessel(t, c) {
  const P = (x, y) => clampS(toScr(c, x, y));
  const g = clamp(((t < 18 ? 1 : 0)) || 0);
  const [px, py] = P(110, 0), [cx2, cy2] = P(-80, -50), [rx, ry] = P(175, -80);
  const surf = (y) => P(H0 + 4, y);
  const [ex, ey] = surf(-200), [ix, iy] = P(H0 + 40, -210), [lx, ly] = P(H0 + 30, 10);
  const mono = (() => { const m = Math.min(1, Math.max(0, t - 28.8)); return P(H0 + 40, -78 + 40 * m); })();
  return A.chips(t, [
    [11.2, 13.8, 'Kolesterol LDL tinggi', 0, 0, 540, 392, { noLine: true, fs: 44, bg: MC.gold }],
    [13.0, 15.2, 'Aliran terhambat\ndi satu cabang', cx2, cy2, 330, 1560],
    [15.2, 17.0, 'Plak', px, py, 800, 1560],
    [17.2, 19.8, 'Bertahun-tahun sebelumnya', 0, 0, 540, 392, { noLine: true, fs: 44, bg: MC.gold }],
    [21.7, 23.5, 'Partikel LDL', 540, 960, 540, 470],
    [22.4, 23.5, 'Inti berisi kolesterol', 540, 960, 540, 760],
    [23.9, 25.5, 'Endotel', ex, ey, 300, 520],
    [24.7, 27.2, 'Intima', ix, iy, 300, 640],
    [25.9, 28.0, 'LDL masuk dan\ntertahan di dinding', lx, ly, 330, 1560],
    [28.8, 30.5, 'Sel imun (monosit)', mono[0], mono[1], 330, 560],
    [30.3, 31.8, 'Peradangan', P(H0 + 60, 80)[0], P(H0 + 60, 80)[1], 760, 1500],
    [31.8, 33.4, 'Plak mulai terbentuk', P(H0 + 40, 0)[0], P(H0 + 40, 0)[1], 540, 1560],
    [33.3, 35.5, 'Bertahun-tahun', 0, 0, 540, 392, { noLine: true, fs: 44, bg: MC.gold }],
    [37.0, 38.9, 'Lumen menyempit', P(0, 0)[0], P(0, 0)[1], 330, 520],
    [38.1, 40.0, 'Aliran ke otot jantung\nberkurang', 540, 1470, 540, 1215],
    [35.4, 36.8, 'Tanpa gejala', 245, 1320, 700, 1230],
    [40.3, 42.2, 'Kejadian akut: menit sampai jam', 0, 0, 540, 392, { noLine: true, fs: 40, bg: '#FFB3A8' }],
    [40.6, 42.2, 'Tudung plak pecah', P(H0 - 200, -60)[0], P(H0 - 200, -60)[1], 780, 1500],
    [41.9, 43.5, 'Bekuan darah', P(-60, -30)[0], P(-60, -30)[1], 330, 1500],
    [43.4, 44.8, 'Pembuluh tertutup', P(-60, 120)[0], P(-60, 120)[1], 540, 1600],
  ]);
}

// ------------------------------------------------------------------ overlay: lembar profil lipid + putar balik waktu (17 - 20,2 dtk)
const labRow = (y, txt, bar, hot, t) => `<text x="46" y="${y}" font-family="${FONT}" font-weight="700" font-size="34" fill="${MC.ink}">${txt}</text><rect x="46" y="${y + 14}" width="320" height="22" rx="11" fill="#E4E1D6"/><rect x="46" y="${y + 14}" width="${f1(320 * bar)}" height="22" rx="11" fill="${hot ? '#E8665F' : '#7FB8A6'}"/>${hot ? `<g transform="translate(${f1(46 + 320 * bar + 44)} ${y + 25 + Math.sin(t * 9) * 3})"><path d="M0 18V-14M-14 0L0 -16L14 0" fill="none" stroke="#E8665F" stroke-width="8" stroke-linecap="round" stroke-linejoin="round"/></g>` : ''}`;
export function labSheet(t) {
  const a = seg(t, 17.05, 17.5, eo) * (1 - seg(t, 19.9, 20.4)); if (a <= 0.01) return '';
  const k = 0.9 + 0.1 * eo(clamp((t - 17.05) / 0.5)), hot = seg(t, 17.9, 18.3);
  return `<g opacity="${f1(a)}" transform="translate(70 ${f1(560 - (1 - a) * 80)}) rotate(-4) scale(${f1(k * 1000) / 1000})"><rect x="12" y="16" width="470" height="600" rx="30" fill="#021014" opacity=".35"/><rect width="470" height="600" rx="30" fill="#FBFAF4" stroke="${MC.ink}" stroke-width="3"/>`
    + `<rect x="0" y="0" width="470" height="84" rx="30" fill="${MC.brand}"/><rect x="0" y="40" width="470" height="44" fill="${MC.brand}"/><text x="46" y="58" font-family="${FONT}" font-weight="800" font-size="33" fill="#fff">HASIL LAB: PROFIL LIPID</text>`
    + labRow(170, 'Kolesterol total', 0.62, false, t) + labRow(280, 'LDL', 0.86, hot > 0.5, t) + labRow(390, 'HDL', 0.45, false, t) + labRow(500, 'Trigliserida', 0.5, false, t)
    + `<g opacity="${f1(hot)}"><rect x="-8" y="228" width="486" height="86" rx="18" fill="none" stroke="${MC.gold}" stroke-width="6"/></g></g>`;
}
export function rewindDial(t) {
  const a = seg(t, 17.1, 17.5, eo) * (1 - seg(t, 19.7, 20.2)); if (a <= 0.01) return '';
  const rot = -((t - 17.1) * 150 + 40 * Math.sin((t - 17.1) * 2) ) * (1 + 1.2 * seg(t, 17.1, 18.5));
  let ticks = ''; for (let i = 0; i < 24; i += 1) { const an = (i / 24) * Math.PI * 2; ticks += `<path d="M${f1(Math.cos(an) * 118)} ${f1(Math.sin(an) * 118)}L${f1(Math.cos(an) * (i % 6 === 0 ? 96 : 106))} ${f1(Math.sin(an) * (i % 6 === 0 ? 96 : 106))}" stroke="${MC.ivory}" stroke-width="${i % 6 === 0 ? 6 : 3.4}" stroke-linecap="round"/>`; }
  return `<g opacity="${f1(a)}" transform="translate(830 790)"><circle r="150" fill="${MC.ink}" opacity=".78" stroke="${MC.gold}" stroke-width="5"/><g transform="rotate(${f1(rot)})">${ticks}</g><path d="M-44 -4A50 50 0 1 1 -18 42" fill="none" stroke="${MC.gold}" stroke-width="14" stroke-linecap="round"/><path d="M-62 -26L-40 6L-16 -22Z" fill="${MC.gold}"/></g>`;
}
// ------------------------------------------------------------------ overlay: kolesterol dibutuhkan tubuh (21,2 - 23,8)
function iconCard(cx, cy, label, draw, a, k) {
  if (a <= 0.01) return '';
  return `<g opacity="${f1(a)}" transform="translate(${cx} ${f1(cy - (1 - a) * 40)}) scale(${f1(k * 1000) / 1000})"><rect x="-150" y="-110" width="300" height="236" rx="34" fill="#021014" opacity=".3" transform="translate(6 10)"/><rect x="-150" y="-110" width="300" height="236" rx="34" fill="${MC.ivory}" stroke="${MC.ink}" stroke-width="3"/>${draw}<text y="104" text-anchor="middle" font-family="${FONT}" font-weight="800" font-size="38" fill="${MC.ink}">${label}</text></g>`;
}
const icoMembran = () => { let d = ''; for (let i = 0; i < 9; i += 1) { const x = -112 + i * 28; d += `<circle cx="${x}" cy="-52" r="10" fill="#F5C24A" stroke="#B98410" stroke-width="2.4"/><path d="M${x - 3} -42v28M${x + 3} -42v28" stroke="#B98410" stroke-width="3" stroke-linecap="round"/><circle cx="${x}" cy="8" r="10" fill="#F5C24A" stroke="#B98410" stroke-width="2.4"/><path d="M${x - 3} -18v-12M${x + 3} -18v-12" stroke="#B98410" stroke-width="3" stroke-linecap="round" opacity="0"/>`; } return d; };
const icoHormon = () => `<g transform="translate(0 -22)"><path d="M-30 -34L10 -34L30 0L10 34L-30 34L-50 0Z" fill="#8E7CE8" stroke="${MC.ink}" stroke-width="4" stroke-linejoin="round"/><path d="M30 0L72 -34M-50 0L-86 22" stroke="${MC.ink}" stroke-width="5" stroke-linecap="round"/><circle cx="76" cy="-38" r="16" fill="#F8C038" stroke="${MC.ink}" stroke-width="4"/><circle cx="-92" cy="26" r="14" fill="#E8665F" stroke="${MC.ink}" stroke-width="4"/></g>`;
const icoVitD = () => `<g transform="translate(0 -26)"><circle r="34" fill="#F8C038" stroke="${MC.ink}" stroke-width="4"/>${Array.from({ length: 10 }, (_, i) => { const an = i * Math.PI / 5; return `<path d="M${f1(Math.cos(an) * 46)} ${f1(Math.sin(an) * 46)}L${f1(Math.cos(an) * 66)} ${f1(Math.sin(an) * 66)}" stroke="#F8C038" stroke-width="7" stroke-linecap="round"/>`; }).join('')}</g>`;
export function ldlCards(t) {
  const win0 = (1 - seg(t, 23.4, 23.9)); if (t < 21.3 || win0 <= 0.01) return '';
  const item = (t0, cx, lab, ico) => iconCard(cx, 1560, lab, ico, seg(t, t0, t0 + 0.4, eo) * win0, 0.9 + 0.1 * eo(clamp((t - t0) / 0.5)));
  return `<g>${A.tag(540, 1330, 'Kolesterol dibutuhkan tubuh', { fs: 40, a: seg(t, 21.2, 21.6) * win0, bg: MC.gold, fg: MC.ink, stroke: MC.ink })}${item(21.7, 190, 'Membran sel', icoMembran())}${item(22.2, 540, 'Hormon', icoHormon())}${item(22.7, 890, 'Vitamin D', icoVitD())}</g>`;
}

// ------------------------------------------------------------------ overlay: bertahun-tahun (33,1 - 36,9): pita waktu + Raka sehat berjalan (tanpa gejala)
import { raka, rakaBody } from './raka.js';
import { walkCycle } from '../../../brand/characters/raka/raka.js';
export function yearsRibbon(t) {
  const a = seg(t, 33.1, 33.5) * (1 - seg(t, 36.4, 36.9)); if (a <= 0.01) return '';
  const p = seg(t, 33.3, 36.3, sm);
  let g = `<g opacity="${f1(a)}"><rect x="70" y="470" width="940" height="92" rx="46" fill="${MC.ink}" opacity=".82" stroke="${MC.gold}" stroke-width="3"/>`;
  for (let i = 0; i <= 10; i += 1) { const x = 130 + i * 82, on = p * 10 >= i - 0.01; g += `<path d="M${x} ${i % 5 === 0 ? 496 : 505}V545" stroke="${on ? MC.gold : MC.ivory}" stroke-width="${i % 5 === 0 ? 6 : 3.4}" stroke-linecap="round" opacity="${on ? 1 : 0.5}"/>`; }
  g += `<path d="M130 520H${f1(130 + p * 820)}" stroke="${MC.gold}" stroke-width="8" stroke-linecap="round"/><circle cx="${f1(130 + p * 820)}" cy="520" r="14" fill="${MC.gold}" stroke="${MC.ink}" stroke-width="4"/><path d="M968 520l-18 -14v28Z" fill="${MC.ivory}" opacity=".8"/></g>`;
  return g;
}
export function rakaHealthy(t) {
  const a = seg(t, 33.3, 33.8, eo) * (1 - seg(t, 36.5, 37.0)); if (a <= 0.01) return '';
  const wc = walkCycle(t * 1.35, { dir: 1, stride: 30, swing: 22 });
  const st = raka('senang', 'jalan', { ...wc, yaw: 0.35, gazeX: 0.6 });
  const k = 0.52;
  return `<g opacity="${f1(a)}" transform="translate(0 ${f1((1 - a) * 60)})"><rect x="46" y="1300" width="410" height="560" rx="40" fill="#021014" opacity=".3" transform="translate(6 10)"/><rect x="40" y="1290" width="410" height="560" rx="40" fill="${MC.ivory}" stroke="${MC.ink}" stroke-width="3"/><path d="M60 1782H430" stroke="#C4D6CC" stroke-width="8" stroke-linecap="round"/><g transform="translate(${f1(245 - 200 * k)} ${f1(1782 - 778 * k)}) scale(${k})">${rakaBody(st, 'rkY', { dark: false })}</g></g>`;
}
// ------------------------------------------------------------------ overlay: otot jantung di hilir kekurangan aliran (36,6 - 40,4)
export function myoPanel(t) {
  const a = seg(t, 36.7, 37.2, eo) * (1 - seg(t, 40.0, 40.5)); if (a <= 0.01) return '';
  const dim = seg(t, 37.0, 39.6, sm), y0 = 1470;
  let g = `<g opacity="${f1(a)}" transform="translate(0 ${f1((1 - a) * 80)})"><path d="M0 ${y0 + 50}Q0 ${y0} 50 ${y0}H1030Q1080 ${y0} 1080 ${y0 + 50}V1920H0Z" fill="#6B2433"/><clipPath id="clipMyo"><path d="M0 ${y0 + 50}Q0 ${y0} 50 ${y0}H1030Q1080 ${y0} 1080 ${y0 + 50}V1920H0Z"/></clipPath><g clip-path="url(#clipMyo)">`;
  for (let r = 0; r < 8; r += 1) for (let c = -1; c < 7; c += 1) { const x = c * 190 + (r % 2) * 95 + 10, y = y0 + 40 + r * 56, sh = 0.04 * Math.sin(t * 5 + r + c * 0.6) * (1 - dim * 0.6); g += `<g transform="translate(${f1(x)} ${y}) scale(${f1(1 + sh)} 1)"><rect width="176" height="44" rx="22" fill="${dim > 0.01 ? '#' + ['C4585E', 'B65870', 'A05A82', '8A5C94'][Math.min(3, Math.floor(dim * 4))] : '#C4585E'}" stroke="#7A2536" stroke-width="3"/><path d="M30 8v28M58 8v28M86 8v28M114 8v28M142 8v28" stroke="#7A2536" stroke-width="3" opacity=".5"/></g>`; }
  g += `<rect x="0" y="${y0}" width="1080" height="460" fill="#241140" opacity="${f1(0.5 * dim)}"/>`;
  const n = Math.round(10 * (1 - 0.8 * dim)); for (let i = 0; i < n; i += 1) { const ph = ((t * 0.55 + i * 0.173) % 1), x = 250 + ((i * 97) % 580), y = y0 - 40 + ph * 380; g += `<circle cx="${x}" cy="${f1(y)}" r="13" fill="#9ED8FF" stroke="#3C8BC0" stroke-width="3" opacity="${f1(0.95 * Math.sin(Math.PI * ph))}"/>`; }
  g += '</g></g>';
  return g + A.tag(540, y0 - 40, 'Otot jantung di hilir', { fs: 36, a: a, bg: MC.ink });
}
