// Latar dan properti sehari-hari: warung gorengan, makanan, membran sel, tubuh (hati, jantung, pembuluh). Semua buatan (ilustrasi 2D).
import { R, C, E, P, L, T, f1, clamp, COL } from './art.js';
import { MC } from './artM.js';

// ---------------------------------------------------------------- makanan
export const tempe = (x, y, s = 1) => `<g transform="translate(${f1(x)} ${f1(y)}) scale(${s})">${P('M-62 -14Q-44 -42 0 -40Q50 -42 64 -10Q70 18 40 30Q0 40 -48 30Q-70 20 -62 -14Z', '#E8A838', 'stroke="#B97A1C" stroke-width="4"')}${C(-26, -8, 7, '#FFE08A')}${C(8, -16, 6, '#FFE08A')}${C(30, 4, 7, '#FFE08A')}${C(-8, 12, 6, '#C98A1E')}</g>`;
export const bakwan = (x, y, s = 1) => `<g transform="translate(${f1(x)} ${f1(y)}) scale(${s})">${C(0, 0, 46, '#E3A23A', 'stroke="#B97A1C" stroke-width="4"')}${[[-20, -14, 10], [14, -22, 9], [22, 8, 11], [-10, 16, 9], [-28, 10, 7]].map(([a, b, r]) => C(a, b, r, '#F2C660')).join('')}${C(4, -2, 8, '#6FA85A')}</g>`;
export const pisangGoreng = (x, y, s = 1) => `<g transform="translate(${f1(x)} ${f1(y)}) scale(${s}) rotate(-12)">${R(-70, -22, 140, 44, '#E9A93A', 22, 'stroke="#B97A1C" stroke-width="4"')}${R(-52, -10, 104, 14, '#F6D277', 7)}</g>`;
export const tahuIsi = (x, y, s = 1) => `<g transform="translate(${f1(x)} ${f1(y)}) scale(${s})">${R(-44, -34, 88, 68, '#E8B147', 18, 'stroke="#B97A1C" stroke-width="4"')}${R(-30, -20, 60, 14, '#6FA85A', 7)}${C(-14, 10, 6, '#C98A1E')}${C(16, 14, 6, '#C98A1E')}</g>`;
export const gorenganPlate = (x, y, s = 1) => `<g transform="translate(${f1(x)} ${f1(y)}) scale(${s})">${E(0, 40, 150, 26, 'rgba(0,0,0,.25)')}${E(0, 24, 146, 24, '#fff')}${E(0, 20, 118, 17, '#EFF3F5')}${tempe(-52, -6, 0.8)}${bakwan(34, -12, 0.8)}${pisangGoreng(-2, 8, 0.7)}</g>`;
export function ikan(x, y, s = 1) { return `<g transform="translate(${f1(x)} ${f1(y)}) scale(${s})">${P('M-70 0Q-30 -50 40 -22L84 -48L84 48L40 22Q-30 50 -70 0Z', '#7FB2D6', 'stroke="#4F83A8" stroke-width="4"')}${P('M-60 6Q-20 34 40 20Q-20 38 -60 6Z', '#EAF4FA')}${C(-44, -8, 6, '#172B38')}${L('M-20 -26Q-6 0 -20 28M6 -28Q20 0 6 28', '#4F83A8', 4)}</g>`; }
export const kacang = (x, y, s = 1) => `<g transform="translate(${f1(x)} ${f1(y)}) scale(${s})">${P('M-90 -10Q-90 50 0 50Q90 50 90 -10Z', '#B47A4B', 'stroke="#8A5A34" stroke-width="4"')}${[[-50, -22], [-20, -34], [14, -26], [46, -18], [-4, -4], [-38, -2], [28, 2], [60, 4]].map(([a, b], i) => E(a, b, 17, 11, i % 2 ? '#E7C28A' : '#D9A96A', `transform="rotate(${i * 25} ${a} ${b})" stroke="#B88A4E" stroke-width="2"`)).join('')}</g>`;
export const alpukat = (x, y, s = 1) => `<g transform="translate(${f1(x)} ${f1(y)}) scale(${s})">${P('M0 -78Q60 -60 62 8Q60 70 0 74Q-60 70 -62 8Q-60 -60 0 -78Z', '#3B6B34', 'stroke="#27491F" stroke-width="4"')}${P('M0 -62Q48 -48 50 8Q48 58 0 62Q-48 58 -50 8Q-48 -48 0 -62Z', '#C7DE7A')}${P('M0 -50Q36 -40 38 6Q36 46 0 50Q-36 46 -38 6Q-36 -40 0 -50Z', '#E3EF9E')}${C(0, 14, 24, '#9A6A3A', 'stroke="#6D4723" stroke-width="3"')}${C(-8, 6, 6, 'rgba(255,255,255,.5)')}</g>`;
export const butter = (x, y, s = 1) => `<g transform="translate(${f1(x)} ${f1(y)}) scale(${s})">${P('M-70 10L-40 -34L72 -34L72 26L-40 26Z', '#FFE38A', 'stroke="#D9B33F" stroke-width="4"')}${P('M-70 10L-40 -34L-40 26L-70 52Z', '#F4CF5C', 'stroke="#D9B33F" stroke-width="4"')}${R(-34, -10, 90, 8, '#FFF3C2', 4)}</g>`;
export const santan = (x, y, s = 1) => `<g transform="translate(${f1(x)} ${f1(y)}) scale(${s})">${R(-36, -60, 72, 110, '#F8F3E6', 14, 'stroke="#C9BFA6" stroke-width="4"')}${R(-36, -60, 72, 26, '#6FA85A', 14)}${C(0, 0, 22, '#fff', 'stroke="#C9BFA6" stroke-width="3"')}${P('M-8 10Q0 -20 12 4Q0 18 -8 10Z', '#8A5A34')}</g>`;
export const ayamGoreng = (x, y, s = 1) => `<g transform="translate(${f1(x)} ${f1(y)}) scale(${s}) rotate(-20)">${P('M-54 -28Q10 -60 52 -20Q64 14 30 34Q-20 52 -56 16Q-70 -8 -54 -28Z', '#D98A2E', 'stroke="#A85F16" stroke-width="4"')}${R(40, 10, 46, 14, '#F6F0E4', 7)}${C(86, 12, 10, '#F6F0E4')}${C(-10, -8, 7, '#F2C660')}${C(14, 6, 8, '#F2C660')}</g>`;
export function nasiSayurPiring(x, y, s = 1) { return `<g transform="translate(${f1(x)} ${f1(y)}) scale(${s})">${E(0, 30, 180, 32, 'rgba(0,0,0,.22)')}${E(0, 14, 176, 30, '#fff')}${E(0, 10, 144, 22, '#EFF3F5')}${E(-50, 4, 54, 24, '#F8F4E8')}${E(30, 0, 40, 16, '#5FA55A')}${E(44, 10, 28, 12, '#E8A838')}${E(-6, -8, 30, 10, '#F0743E')}</g>`; }

// ---------------------------------------------------------------- warung
export function warungBg(t) {
  let s = R(-100, -100, 1300, 1300, '#EFD9B0') + R(-100, 1010, 1300, 1000, '#B58A5E') + R(-100, 1002, 1300, 14, '#8A6440');
  // papan nama dan kain
  s += `<g transform="translate(540 340)">${R(-250, -52, 500, 104, '#C2352B', 20)}${R(-236, -40, 472, 80, 'none', 14, 'stroke="#FBE3A5" stroke-width="4"')}${T(0, 20, 'WARUNG', '#FBE3A5', 64)}</g>`;
  s += `<g>${[0, 1, 2, 3, 4, 5, 6].map((i) => P(`M${i * 160 - 60} 250L${i * 160 + 80} 250L${i * 160 + 80} 292Q${i * 160 + 10} 312 ${i * 160 - 60} 292Z`, i % 2 ? '#F6F0E4' : '#E8665F')).join('')}</g>`;
  // etalase kaca berisi gorengan
  s += `<g transform="translate(540 760)">${R(-420, -230, 840, 460, 'rgba(255,255,255,.35)', 26, 'stroke="#8A6440" stroke-width="12"')}${R(-420, 40, 840, 14, '#8A6440')}${R(-420, -90, 840, 12, '#8A6440', 4, 'opacity=".6"')}`;
  for (let i = 0; i < 5; i++) s += tempe(-340 + i * 170, -40, 0.85) + bakwan(-340 + i * 170, 110, 0.8);
  for (let i = 0; i < 4; i++) s += pisangGoreng(-250 + i * 170, -150, 0.7);
  s += `</g>`;
  s += R(-100, 1010, 1300, 40, '#8A6440') + R(-100, 1050, 1300, 220, '#6E4C2E');
  return s;
}

// ---------------------------------------------------------------- membran sel (lapisan lemak ganda) dengan kolesterol
export function membrane(x, y, w, t = 0, o = {}) { // y = garis tengah
  let g = ''; const n = Math.floor(w / 46);
  for (let i = 0; i < n; i++) {
    const px = x + 23 + i * 46, wob = Math.sin(t * 1.4 + i) * 2;
    // lapisan atas
    g += `<g>${L(`M${f1(px - 7)} ${f1(y - 60)}q${f1(-4 + wob)} 26 0 52`, '#E8A838', 6)}${L(`M${f1(px + 7)} ${f1(y - 60)}q${f1(4 - wob)} 26 0 52`, '#E8A838', 6)}${C(px, y - 76, 15, '#2E86C1')}</g>`;
    // lapisan bawah
    g += `<g>${L(`M${f1(px - 7)} ${f1(y + 8)}q${f1(-4 - wob)} 26 0 52`, '#E8A838', 6)}${L(`M${f1(px + 7)} ${f1(y + 8)}q${f1(4 + wob)} 26 0 52`, '#E8A838', 6)}${C(px, y + 76, 15, '#2E86C1')}</g>`;
  }
  // kolesterol: molekul pipih dengan gugus hidroksil, terselip di antara fosfolipid
  for (let i = 0; i < Math.floor(n / 3); i++) { const px = x + 46 * (2 + i * 3) + 20; g += `<g transform="translate(${f1(px)} ${f1(y - 30 + (i % 2) * 70)})">${R(-6, -22, 12, 44, '#E67E22', 6)}${C(0, i % 2 ? 26 : -26, 7, '#C0392B')}</g>`; }
  return g;
}

// ---------------------------------------------------------------- tubuh: dada dan perut dengan hati, jantung, pembuluh besar (skema)
export function torso(cx, cy, s = 1, o = {}) {
  const k = s, X = (v) => cx + v * k, Y = (v) => cy + v * k;
  let g = `<path d="M${X(-250)} ${Y(-330)}Q${X(-330)} ${Y(-300)} ${X(-320)} ${Y(-120)}L${X(-300)} ${Y(320)}Q${X(0)} ${Y(380)} ${X(300)} ${Y(320)}L${X(320)} ${Y(-120)}Q${X(330)} ${Y(-300)} ${X(250)} ${Y(-330)}Q${X(0)} ${Y(-360)} ${X(-250)} ${Y(-330)}Z" fill="#F6D2B0" stroke="#D9A97F" stroke-width="${f1(6 * k)}"/>`;
  // paru (samar), hati (kanan tubuh = kiri layar), jantung (agak ke kiri tubuh), lambung/usus samar
  g += `<path d="M${X(-230)} ${Y(-250)}Q${X(-260)} ${Y(-120)} ${X(-170)} ${Y(-60)}Q${X(-110)} ${Y(-130)} ${X(-110)} ${Y(-260)}Z" fill="#F4B8B8" opacity=".8"/><path d="M${X(230)} ${Y(-250)}Q${X(260)} ${Y(-120)} ${X(170)} ${Y(-60)}Q${X(110)} ${Y(-130)} ${X(110)} ${Y(-260)}Z" fill="#F4B8B8" opacity=".8"/>`;
  g += `<path d="M${X(-250)} ${Y(-20)}Q${X(-120)} ${Y(-70)} ${X(40)} ${Y(-20)}Q${X(60)} ${Y(60)} ${X(-30)} ${Y(110)}Q${X(-170)} ${Y(140)} ${X(-250)} ${Y(60)}Z" fill="#9B4D3E" stroke="#6E3226" stroke-width="${f1(5 * k)}"/>`;   // hati
  return g;
}
export const dna = (x, y, s = 1, t = 0) => `<g transform="translate(${f1(x)} ${f1(y)}) scale(${s})">${Array.from({ length: 9 }, (_, i) => { const yy = -80 + i * 20, a = Math.sin(t * 2 + i * 0.7) * 26, b = -a; return `${L(`M${f1(a)} ${yy}L${f1(b)} ${yy}`, '#C9D4D9', 4)}${C(a, yy, 7, i % 2 ? '#E8665F' : '#2E86C1')}${C(b, yy, 7, i % 2 ? '#2E86C1' : '#E8665F')}`; }).join('')}</g>`;
