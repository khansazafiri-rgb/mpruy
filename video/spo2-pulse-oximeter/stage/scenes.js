// Semua adegan. frame(t) -> { A, B, U, web }: A = dunia Raka/alat luar, B = dunia penampang, U = teks/label (koordinat layar).
// Waktu narasi tn = t - OFF. Kata-kata kunci (merah, inframerah, sensor, denyut, SpO2, PR) mengikuti ASR audio/asr.json.
import { f1, clamp, lerp, R, C, P, T, G, COL, INK, GOLD, MC, FONT, FOREST, seg, win, eo, eio, sm, pill, pop, rndf, tw, track } from './lib.js';
import { raka, rakaSvg, lerpState, idle as rIdle } from '../../../brand/characters/raka/raka.js';
import { GEO, fingerBody, vesselSvg, vesselD, cellsSvg, cellType, cellX, cell, clipSvg, beamSvg, beamTrans, detLevel, mixHex } from './anatomy.js';
import { MU, phase, pulse, D0, DA, effMu, spo2FromR, R_OF, T0_BEAT } from './physics.js';
import * as TL from './timeline.js';
export const OFF = TL.OFF;

// ================================================================ kamera dan proyeksi
export const camT = (cx, cy, z, sy = 880) => `translate(${f1(540 - cx * z)} ${f1(sy - cy * z)}) scale(${f1(z * 1000) / 1000})`;
export const proj = (cam, x, y) => [540 + (x - cam.cx) * cam.z, (cam.sy ?? 880) + (y - cam.cy) * cam.z];
// kamera dunia penampang (B): kunci [tn, cx, cy, z]
const camB = track([[0, 650, 856, 1.16, 880], [6.5, 650, 856, 1.16, 880], [7.4, 650, 856, 1.3, 880], [11.0, 650, 856, 1.3, 880], [11.8, 600, 800, 1.5, 880], [15.5, 540, 960, 1.55, 880], [16.3, 540, 960, 1.55, 880], [17.3, 540, 905, 3.2, 880], [22.9, 540, 905, 3.2, 880], [23.9, 610, 856, 1.1, 664], [26.4, 610, 856, 1.1, 664], [27.4, 620, 856, 0.78, 560], [34.2, 620, 856, 0.78, 560], [35.2, 620, 856, 0.5, 700]]);
// ================================================================ Raka + alat luar (dunia A)
const RK = { x: 380, top: 420, s: 1.5 };
const FINGER_ARM = { wx: 330, wy: 362, ex: 356, ey: 462, finger: 1, fa: 0, front: 1 };
const HANDLOC = [FINGER_ARM.wx + 17, FINGER_ARM.wy];       // pusat tangan (lokal Raka)
const rkG = (st, uid, o = {}) => `<g transform="translate(${f1(RK.x - 200 * RK.s)} ${f1(RK.top)}) scale(${RK.s})">${rakaSvg(st, { bare: true, shadow: false, uid, dark: true, ...o })}</g>`;
const loc2w = (lx, ly) => [RK.x - 200 * RK.s + lx * RK.s, RK.top + ly * RK.s];
/** alat tampak luar di jari (koordinat lokal Raka; sumbu jari = sumbu x). jaw 0 = terbuka, 1 = menutup. Layar di bidang atas: kiri SpO2, kanan PR. */
export function deviceExt({ jaw = 1, scr = '97', pr = '72', glowR = 0, glowI = 0, ring = 0, heart = 0 } = {}) {
  const ang = -22 * (1 - jaw), L = 88, H0 = -2;
  let s = `<g transform="translate(-4 0)">`;
  s += `<rect x="0" y="4" width="${L}" height="19" rx="7" fill="${COL.body}" stroke="${INK}" stroke-width="2.4"/><rect x="30" y="3" width="26" height="4" rx="2" fill="#5E7E96"/>`;
  s += `<g transform="rotate(${f1(ang)} ${L - 4} ${H0})"><rect x="0" y="-25" width="${L}" height="23" rx="8" fill="${COL.body}" stroke="${INK}" stroke-width="2.4"/>`
    + `<path d="M6 -25 L${L - 6} -25 L${L - 12} -42 L12 -42 Z" fill="#102A33" stroke="${INK}" stroke-width="2"/>`
    + `<text x="26" y="-37" text-anchor="middle" font-family="${FONT}" font-weight="800" font-size="4.6" fill="#9DE0BD">SpO₂</text><text x="26" y="-28.2" text-anchor="middle" font-family="${FONT}" font-weight="800" font-size="10.5" fill="#fff">${scr}</text>`
    + `<text x="62" y="-37" text-anchor="middle" font-family="${FONT}" font-weight="800" font-size="4.6" fill="#FFD166">PR</text><text x="62" y="-28.2" text-anchor="middle" font-family="${FONT}" font-weight="800" font-size="10.5" fill="#fff">${pr}</text>`
    + `<rect x="26" y="-4" width="11" height="4" rx="1.6" fill="${glowR > 0.05 ? COL.red : '#40525C'}"/><rect x="46" y="-4" width="11" height="4" rx="1.6" fill="${glowI > 0.05 ? COL.ir : '#40525C'}"/></g>`;
  s += `<rect x="${L - 6}" y="-25" width="10" height="48" rx="4" fill="#C9D9DB" stroke="${INK}" stroke-width="2.4"/>`;
  s += `</g>`;
  if (glowR > 0.02 || glowI > 0.02) s += `<ellipse cx="42" cy="0" rx="40" ry="14" fill="${glowR > glowI ? COL.red : COL.ir}" opacity="${f1(0.32 * Math.max(glowR, glowI) * 100) / 100}"/>`;
  return s;
}
// tampilan angka pada layar alat selama hook: berubah sebelum stabil (94 -> 96 -> 97), PR naik ke 72
export const dispAt = (tn) => ({
  scr: tn < 0.25 ? '86' : tn < 0.6 ? '90' : tn < 0.95 ? '92' : tn < 1.3 ? '94' : tn < 1.65 ? '93' : tn < 2.0 ? '96' : tn < 2.4 ? '95' : '97',
  pr: tn < 0.25 ? '58' : tn < 0.6 ? '63' : tn < 1.1 ? '67' : tn < 1.6 ? '70' : tn < 2.0 ? '71' : '72',
});
function sceneHook(tn) {
  const disp = dispAt(tn), jaw = seg(tn, 0.0, 0.42, eo) * 0.85 + 0.15 * (tn > 0.42 ? 1 : 0), jawV = clamp(0.35 + jaw * 0.65 + (tn < 0.02 ? 0 : 0), 0, 1);
  const ledOn = 1, alt = Math.floor(tn * 4) % 2;
  // Raka: melihat dua angka (tn 1,0 - 4,6), lalu bertanya (5,0 - 6,5)
  let st = raka('netral', 'netral', { armR: FINGER_ARM, yaw: -0.15, gazeX: 0.45, gazeY: 0.25, tilt: 2 });
  const look = seg(tn, 0.7, 1.4);
  st = lerpState(raka('kaget', 'netral', { armR: FINGER_ARM, yaw: -0.2, gazeX: 0.7, gazeY: 0.2, wide: 0.5 }), st, 0.0 * look + (tn > 1.0 ? 1 : 0));
  const ask = seg(tn, 4.9, 5.4);
  st = lerpState(raka('netral', 'netral', { armR: FINGER_ARM, yaw: -0.15, gazeX: 0.45, gazeY: 0.25, tilt: 2 }), raka('berpikir', 'netral', { armR: FINGER_ARM, yaw: -0.1, gazeX: 0.7, gazeY: -0.1, tilt: -3 }), ask);
  st = rIdle(st, tn);
  const [hx, hy] = loc2w(...HANDLOC);
  const dev = `<g transform="translate(${f1(hx)} ${f1(hy)}) scale(${RK.s})">${deviceExt({ jaw: jawV, scr: disp.scr, pr: disp.pr, glowR: ledOn * (alt ? 0 : 1), glowI: ledOn * (alt ? 1 : 0) })}</g>`;
  // tanda tanya melayang ketika Raka bertanya
  const q = seg(tn, 5.0, 5.4, eo) * (1 - seg(tn, 6.2, 6.6));
  const qs = q > 0.01 ? [0, 1, 2].map((i) => `<text x="${f1(250 + i * 70)}" y="${f1(520 - Math.abs(Math.sin(tn * 5 + i)) * 20 - i * 14)}" font-family="${FONT}" font-weight="800" font-size="${70 - i * 8}" fill="${GOLD}" stroke="${INK}" stroke-width="6" paint-order="stroke" text-anchor="middle" opacity="${f1(q)}">?</text>`).join('') : '';
  return { svg: `<defs><linearGradient id="hg" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#103F4A"/><stop offset="1" stop-color="#0A2B34"/></linearGradient></defs>${R(-800, -600, 3000, 3800, 'url(#hg)')}${C(700, 960, 380, '#16505B', 'opacity=".5"')}${rkG(st, 'rkH')}${R(-300, 1215, 1700, 900, '#7C5B3C')}${R(-300, 1215, 1700, 26, '#A67C52')}${dev}${qs}`, hand: [hx, hy] };
}
// ================================================================ kamera dunia A (hook) dan transisi masuk/keluar
const camA = track([[0, 650, 960, 5.0], [0.8, 650, 960, 4.6], [2.4, 530, 850, 2.3], [4.9, 530, 850, 2.3], [5.6, 590, 900, 2.8], [6.3, 640, 960, 3.4], [7.0, 650, 960, 5.4]]);

// ================================================================ pembantu UI
export const chip = (txt, cx, y, o = {}) => pill(txt, cx, y, o);
export function leader(x0, y0, x1, y1, col = GOLD, a = 1) {
  if (a <= 0.01) return '';
  return `<g opacity="${f1(a * 100) / 100}"><path d="M${f1(x0)} ${f1(y0)}L${f1(x1)} ${f1(y1)}" stroke="${INK}" stroke-width="9" opacity=".5" stroke-linecap="round"/><path d="M${f1(x0)} ${f1(y0)}L${f1(x1)} ${f1(y1)}" stroke="${col}" stroke-width="4.5" stroke-linecap="round"/>${C(x1, y1, 10, col, `stroke="${INK}" stroke-width="3"`)}</g>`;
}
const wrap = (s, size, maxW) => { const words = s.split(' '), lines = []; let cur = ''; for (const w of words) { const t = cur ? cur + ' ' + w : w; if (cur && tw(t, size) > maxW) { lines.push(cur); cur = w; } else cur = t; } if (cur) lines.push(cur); return lines; };
/** takarir bawah (kotak gelap) mengikuti narasi; teks apa adanya */
export function captions(tn) {
  const c = TL.CAPS.find(([a, b]) => tn >= a - 0.02 && tn <= b + 0.12); if (!c) return '';
  const size = 50, lines = wrap(c[2], size, 830), a = clamp((tn - c[0] + 0.02) / 0.15) * clamp((c[1] + 0.12 - tn) / 0.12 + 0.2), lh = size * 1.22, h = lines.length * lh + 30;
  const y = 1300 + (3 - lines.length) * 0;
  return `<g opacity="${f1(a * 100) / 100}">${R(540 - 440, y + 6, 880, h, 'rgba(0,0,0,.28)', 34)}${R(540 - 440, y, 880, h, 'rgba(8,16,28,.92)', 34)}${lines.map((l, i) => T(l, 540, y + 14 + size * 0.88 + i * lh, { size, fill: '#fff', w: 800 })).join('')}</g>`;
}
// ================================================================ dunia penampang (B)
const beamXAt = (w, y) => { const x0 = w === 'r' ? GEO.led.r[0] : GEO.led.i[0], xe = GEO.det[0] + (w === 'r' ? -6 : 6); return x0 + (xe - x0) * (y - 694) / (1014 - 694); };
/** peredam berkas pada sel yang sedang melintas (mode cerita Hb): rata-rata koefisien serap sel di sekitar berkas */
function cellMuAt(tn, w, mode = 'normal') {
  const x = beamXAt(w, GEO.vesselY); let ws = 0, mu = 0;
  for (let k = -3; k <= 40; k++) { const dx = Math.abs(cellX(tn, k) - x); const wt = Math.max(0, 1 - dx / 40); if (wt > 0) { mu += wt * MU[cellType(k, mode)][w]; ws += wt; } }
  const base = 0.07; ws = Math.min(1, ws); return mu / Math.max(ws, 1e-6) * ws + (1 - ws) * base;
}
export function sceneCut(tn, v = {}) {
  const amp = v.amp ?? seg(tn, 23.2, 23.7), baseD = v.base ?? D0, d = vesselD(tn, { amp, base: baseD });
  const alt = tn > 9.4 && tn < 16.4 ? Math.floor(tn * 3) % 2 : -1;
  const ledR = v.ledR ?? (tn >= TL.W.merah ? (alt === 1 ? 0.25 : 1) : 0), ledI = v.ledI ?? (tn >= TL.W.inframerah ? (alt === 0 ? 0.25 : 1) : 0);
  const story = tn > 16.3 && tn < 23.3;
  const reach = v.reach ?? (tn < TL.W.cahayaMelewati ? 0.13 : 0.13 + 0.87 * seg(tn, TL.W.cahayaMelewati, TL.W.cahayaMelewati + 1.1, eio));
  const mode = v.mode || 'normal';
  const bo = (w) => ({ d, amp, base: baseD, reach, pre: v.pre ?? 1, frac: v.frac ?? 0.97, cellMu: story ? cellMuAt(tn, w, mode) : (v.cellMu ? cellMuAt(tn, w, mode) : undefined), photons: 14 });
  const oR = bo('r'), oI = bo('i');
  const detLv = reach >= 1 ? detLevel(tn, { ...oR, cellMu: undefined }) * 0 + (beamTrans(tn, 'r', oR).post + beamTrans(tn, 'i', oI).post) * 0.55 : 0;
  const hi = (k) => (tn > 17.15 && tn < 18.75 && k === 0) || (tn > 18.95 && tn < 20.05 && k === 1);
  let s = fingerBody({ polish: v.polish, melanin: v.melanin ?? 0, cold: v.cold ?? 0 }) + vesselSvg(d) + cellsSvg(tn, { x0: -40, x1: 770, hi: story ? hi : null, mode, tag: true });
  s += clipSvg({ ledR, ledI, det: clamp(detLv, 0, 1), chipGlow: tn > 26 ? 1 : 0, scr: v.scr, pr: v.pr });
  if (ledR > 0.02) s += beamSvg(tn, 'r', { ...oR, on: ledR });
  if (ledI > 0.02) s += beamSvg(tn, 'i', { ...oI, on: ledI });
  return { svg: s, d, detLv, hi };
}

// ================================================================ grafik sinyal (cahaya yang tiba di sensor)
/** nilai sinyal ternormalisasi AC/DC untuk panjang gelombang w pada waktu tt: turun saat pembuluh membengkak. vv: gangguan {amp, base, noise, motion, mu} */
export function ppgVal(tt, w, vv = {}) {
  const amp = vv.amp ?? seg(tt, 23.2, 23.7), d = vesselD(tt, { amp, base: vv.base ?? D0 }), mu = (vv.mu ?? effMu(0.97))[w];
  let y = -(mu * (d - (vv.base ?? D0) - DA * amp * 0.35) / 40);
  if (vv.noise) y += vv.noise * (rndf(Math.floor(tt * 60) * 1.3 + (w === 'r' ? 0 : 9)) - 0.5) * 0.18;
  if (vv.motion) y += vv.motion * (Math.sin(tt * 7.3) * 0.09 + Math.sin(tt * 17.1 + 1) * 0.05 + (rndf(Math.floor(tt * 4) * 2.1) - 0.5) * 0.22);
  return y;
}
/** satu jalur grafik: rect [x,y,w,h], warna, jendela detik. gain px per satuan AC/DC. tEnd = detik sekarang (narasi). */
export function trace(tn, x, y, w, h, w_, col, o = {}) {
  const win_ = o.win ?? 3.4, N = 110, gain = o.gain ?? 430, vv = o.vv || {}; let pts = '';
  const t0 = o.t0 ?? 23.3;
  for (let i = 0; i <= N; i++) { const tt = tn - win_ + (win_ * i) / N; const v = tt < t0 ? 0 : ppgVal(tt, w_, vv); pts += `${i ? 'L' : 'M'}${f1(x + (w * i) / N)} ${f1(y + h / 2 - v * gain)} `; }
  const grid = `<path d="M${x} ${y + h / 2}H${x + w}" stroke="rgba(255,255,255,.18)" stroke-width="2" stroke-dasharray="6 8"/>`;
  const cid = 'tc' + Math.round(x + y * 7 + w);
  return `<clipPath id="${cid}"><rect x="${x - 6}" y="${y - 4}" width="${w + 12}" height="${h + 8}"/></clipPath><g clip-path="url(#${cid})">${grid}<path d="${pts}" fill="none" stroke="${INK}" stroke-width="12" opacity=".35" stroke-linejoin="round" stroke-linecap="round"/><path d="${pts}" fill="none" stroke="${col}" stroke-width="6" stroke-linejoin="round" stroke-linecap="round"/></g>`;
}
export function panel(x, y, w, h, title, a = 1) { return `<g opacity="${f1(a * 100) / 100}">${R(x, y + 8, w, h, 'rgba(0,0,0,.3)', 26)}${R(x, y, w, h, 'rgba(8,18,30,.9)', 26, 'stroke="rgba(255,255,255,.18)" stroke-width="3"')}${title ? T(title, x + 28, y + 40, { size: 30, fill: '#CFE8E2', anchor: 'start', w: 800 }) : ''}</g>`; }
export const labelDot = (txt, x, y, col, size = 28) => `${C(x, y - 9, 10, col)}${T(txt, x + 20, y, { size, fill: '#fff', anchor: 'start', w: 700 })}`;
// ================================================================ UI per bagian (layar)
function uiCut(tn, cam) {
  let u = '';
  const W = TL.W, p = (x, y) => proj(cam, x, y);
  // --- pil teks utama
  const PILL = [[7.0, 11.2, ['Merah + inframerah'], 'plain'], [20.0, 23.3, ['Dua cahaya, dua pola serapan'], 'plain'], [23.4, 26.6, ['Sinyal berubah tiap denyut'], 'plain'], [31.4, 34.4, ['SpO₂: estimasi saturasi'], 'plain']];
  for (const [a, b, l] of PILL) { const k = clamp((tn - a) / 0.3) * clamp((b - tn) / 0.3); if (k > 0.01) u += chip(l, 540, 250 + (1 - eo(clamp((tn - a) / 0.35))) * -50, { a: k, size: 52 }); }
  // --- B1: label lampu dan sensor
  const cR = p(...GEO.led.r), cI = p(...GEO.led.i), cD = p(...GEO.det);
  const ka = (t0, t1) => clamp((tn - t0) / 0.25) * clamp((t1 - tn) / 0.3);
  const k1 = ka(W.merah, 11.1), k2 = ka(W.inframerah, 11.1), k3 = ka(W.sensor, 11.1);
  if (k1 > 0.01) { u += leader(cR[0], cR[1] - 16, 280, 440, COL.red, k1); u += chip(['Lampu merah'], 280, 360, { a: k1, size: 40, bg: COL.red, fg: '#fff' }); }
  if (k2 > 0.01) { u += leader(cI[0], cI[1] - 16, 780, 470, COL.ir, k2); u += chip(['Lampu inframerah'], 780, 360, { a: k2, size: 40, bg: COL.ir, fg: '#fff' }); u += T('warna ilustratif, tak terlihat mata', 780, 462, { size: 26, fill: '#E6D3FF', w: 700, e: `opacity="${f1(k2)}"` }); }
  if (k3 > 0.01) { u += leader(cD[0], cD[1] + 8, cD[0] + 60, 1198, '#FFF2A8', k3); u += chip(['Sensor (fotodetektor)'], 560, 1198, { a: k3, size: 38, bg: '#FFF2A8', fg: INK }); }
  // --- B2: pengukur cahaya yang tiba di sensor
  const kg = ka(13.1, 16.5);
  if (kg > 0.01) {
    const lv = clamp(0.2 + 1.45 * (beamTrans(tn, 'r', { amp: 0 }).post + beamTrans(tn, 'i', { amp: 0 }).post) * 0.5, 0, 1);
    u += `<g opacity="${f1(kg * 100) / 100}">${R(24, 700, 110, 400, 'rgba(8,18,30,.92)', 24)}${R(48, 724, 62, 300, 'rgba(255,255,255,.1)', 14)}${R(48, 724 + 300 * (1 - lv), 62, 300 * lv, '#FFF2A8', 14)}${T('Cahaya', 79, 1056, { size: 26, fill: '#fff', w: 800 })}${T('di sensor', 79, 1086, { size: 24, fill: '#CFE8E2', w: 700 })}</g>`;
  }
  // --- B3: label Hb (mengikuti sel) dan grafik serapan
  if (tn > 16.9 && tn < 23.3) {
    for (const [k, t0, t1, txt, bg] of [[0, 17.15, 18.9, 'Hb + O₂', COL.oxy], [1, 18.95, 20.3, 'Hb tanpa O₂', COL.deoxy]]) {
      const a = ka(t0, t1); if (a > 0.01) { const [sx, sy] = p(cellX(tn, k), 880); u += chip([txt], clamp(sx, 200, 880), 560, { a, size: 44, bg, fg: '#fff' }); u += leader(clamp(sx, 200, 880), 640, sx, sy - 36, bg, a); }
    }
    const kb = clamp((tn - 20.2) / 0.4) * clamp((23.3 - tn) / 0.3);
    if (kb > 0.01) {
      u += panel(60, 960, 960, 320, 'Penyerapan cahaya oleh hemoglobin (relatif)', kb);
      const gr = (gx, name, m, t0) => { const gk = seg(tn, t0, t0 + 0.7, eo); let s = ''; for (const [j, w, c, cn] of [[0, 'r', COL.red, 'merah'], [1, 'i', COL.ir, 'inframerah']]) { const hh = 150 * m[w] * gk, bx = gx + j * 110; s += R(bx, 1210 - hh, 90, hh, c, 8, `stroke="${INK}" stroke-width="3"`) + T(cn, bx + 45, 1236, { size: 24, fill: '#fff', w: 700 }); } return s + T(name, gx + 100, 1272, { size: 30, fill: '#fff', w: 800 }); };
      u += `<g opacity="${f1(kb * 100) / 100}">${gr(150, 'Hb + O₂', MU.oxy, 20.3)}${gr(610, 'Hb tanpa O₂', MU.deoxy, 21.2)}</g>`;
    }
  }
  return u;
}

// ================================================================ komposisi per bingkai
import * as S2 from './scenes2.js';
const bgB = `<defs><linearGradient id="bgb" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#0E3A45"/><stop offset="1" stop-color="#0A2B34"/></linearGradient></defs>${R(-1000, -1000, 4000, 5000, 'url(#bgb)')}`;
const bgDarkS = `<defs><linearGradient id="g3" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#103F4A"/><stop offset="1" stop-color="#0A2B34"/></linearGradient></defs>${R(-1000, -1000, 4000, 5000, 'url(#g3)')}`;
const gOp = (svg, a) => `<g opacity="${f1(clamp(a) * 100) / 100}">${svg}</g>`;
const kw = (tn, t0, t1, f = 0.22) => clamp((tn - t0) / f) * clamp((t1 - tn) / f);
export async function frame(t) {
  const tn = t - OFF; let A = '', B = '', U = '', web = null;
  const E = TL.EDU_END;
  // ---- A: hook (Raka + alat luar) sampai masuk ke penampang
  if (tn < 7.1) {
    const h = sceneHook(tn), [cx, cy, z] = camA(tn), a = 1 - seg(tn, 6.72, 7.02);
    A += gOp(`<g transform="${camT(cx, cy, z)}">${h.svg}</g>`, a);
  }
  // ---- B: dunia penampang (6,5 - 35,4)
  if (tn >= 6.5 && tn < 35.4) {
    const [cx, cy, z, sy] = camB(tn), a = seg(tn, 6.55, 6.95) * (1 - seg(tn, 34.7, 35.2));
    const cut = sceneCut(tn), cam = { cx, cy, z, sy };
    B += gOp(`${bgB}<g transform="${camT(cx, cy, z, sy)}">${cut.svg}</g>`, a);
    U += uiCut(tn, cam) + uiSig(tn, cam);
  }
  // ---- A2: kamera keluar kembali ke alat (hasil di layar), 34,4 - 39,6: alat besar di jari, angka terbaca
  if (tn >= 34.4 && tn < 39.7) {
    const a = seg(tn, 34.5, 35.0) * (1 - seg(tn, 39.2, 39.6)), ph = phase(tn), SC = 6.2;
    const dev = `<g transform="translate(250 860) scale(${SC})"><rect x="-120" y="-7" width="150" height="14.5" rx="7" fill="${COL.skin}" stroke="${INK}" stroke-width="1.6"/>${deviceExt({ jaw: 1, scr: '97', pr: '72', glowR: 1, glowI: 0 })}</g>`;
    A += gOp(`${bgDarkS}<ellipse cx="540" cy="880" rx="520" ry="400" fill="#16505B" opacity=".5"/>${dev}`, a);
    const projA = (lx, ly) => [250 + lx * SC, 860 + ly * SC];
    U += gOp(S2.uiResult(tn, projA), a);
  }
  // ---- adegan lain
  const parts = [[39.5, 48.95, S2.sceneUse], [49.55, 51.8, S2.sceneDx], [59.25, 61.55, S2.sceneCO2], [68.9, 77.1, S2.sceneHow], [77.0, 79.2, S2.sceneSym], [79.05, E + 0.45, S2.sceneHelp]];
  for (const [a0, a1, fn] of parts) if (tn >= a0 && tn < a1) { const o = fn(tn); if (o.A) A += o.A; if (o.B) B += o.B; if (o.U) U += o.U; }
  if (tn >= 51.55 && tn < 59.3) { const o = S2.sceneDist(tn), a = kw(tn, 51.6, 59.3); B += gOp(o.B, a); U += gOp(o.U, a); }
  if (tn >= 61.9 && tn < 68.7) { const o = S2.sceneCO(tn), a = kw(tn, 61.95, 68.6); B += gOp(o.B, a); U += gOp(o.U, a); }
  // ---- takarir + teks hook
  if (tn < 6.7) U += chip(['KOK BISA TAHU', 'OKSIGEN?'], 540, 250, { size: 60, bg: '#D9382F', fg: '#fff', a: 1 - seg(tn, 6.4, 6.7) });
  if (tn < E + 0.2) U += captions(tn);
  // ---- outro: web asli
  if (t >= TL.O0 - 0.25) {
    const o = S2.outroState(t), ui = S2.outroUI(t), a = seg(t, TL.O0 - 0.25, TL.O0 + 0.05);
    A = A.length && t < TL.O0 + 0.1 ? gOp(A, 1 - a) : (t < TL.O0 + 0.1 ? A : '');
    B = ''; U = (t < TL.O0 + 0.05 ? gOp(U, 1 - a) : '') + ui.u;
    A = ui.bg + A;
    web = { frame: o.frame, rect: o.rect, a };
  }
  return { A, B, U, web };
}

// ================================================================ B4 - B5: denyut, dua sinyal, perbandingan, perkiraan SpO2
const PP = { r: effMu(0.97).r * DA / 40 * 480, i: effMu(0.97).i * DA / 40 * 480 };
const Rratio = R_OF(0.97), SPO2 = spo2FromR(Rratio);
function uiSig(tn, cam) {
  let u = '';
  const p = (x, y) => proj(cam, x, y), ka = (t0, t1) => clamp((tn - t0) / 0.3) * clamp((t1 - tn) / 0.3);
  // ---- B4 (23,36 - 26,5): panel grafik + penanda pembuluh mengembang
  const k4 = ka(23.4, 26.6);
  if (k4 > 0.01) {
    u += panel(60, 1020, 960, 262, 'Cahaya yang tiba di sensor', k4);
    u += `<g opacity="${f1(k4 * 100) / 100}">${trace(tn, 100, 1062, 880, 92, 'i', COL.ir, { gain: 400, win: 3.6 })}${trace(tn, 100, 1170, 880, 92, 'r', COL.red, { gain: 400, win: 3.6 })}${labelDot('inframerah', 110, 1082, COL.ir, 24)}${labelDot('merah', 110, 1190, COL.red, 24)}</g>`;
    const d = vesselD(tn, { amp: 1 }), [bx, by] = p(700, GEO.vesselY), hh = d * cam.z / 2;
    u += `<g opacity="${f1(k4 * 100) / 100}"><path d="M${f1(bx)} ${f1(by - hh - 26)}V${f1(by - hh)}M${f1(bx)} ${f1(by + hh + 26)}V${f1(by + hh)}" stroke="${GOLD}" stroke-width="7" stroke-linecap="round"/><path d="M${f1(bx - 12)} ${f1(by - hh - 12)}L${f1(bx)} ${f1(by - hh)}L${f1(bx + 12)} ${f1(by - hh - 12)}M${f1(bx - 12)} ${f1(by + hh + 12)}L${f1(bx)} ${f1(by + hh)}L${f1(bx + 12)} ${f1(by + hh + 12)}" fill="none" stroke="${GOLD}" stroke-width="7" stroke-linecap="round" stroke-linejoin="round"/></g>`;
    const ph = phase(tn), beat = Math.max(0, 1 - ((ph - Math.floor(ph)) * 3.2));
    if (tn > TL.W.denyut1 - 0.05) u += `<g opacity="${f1(k4 * beat * 100) / 100}"><circle cx="${f1(bx)}" cy="${f1(by)}" r="${f1(40 + (1 - beat) * 70)}" fill="none" stroke="${GOLD}" stroke-width="7"/></g>`;
    u += chip(['1 denyut (diperlambat)'], 540, 940, { a: k4 * seg(tn, 24.1, 24.4), size: 34, bg: GOLD, fg: INK });
  }
  // ---- B5 (26,48 - 34,1)
  const k5 = clamp((tn - 26.55) / 0.4) * clamp((31.2 - tn) / 0.35);
  if (k5 > 0.01) {
    u += panel(40, 830, 1000, 450, 'Dua sinyal dari satu denyut yang sama', k5);
    u += `<g opacity="${f1(k5 * 100) / 100}">${trace(tn, 80, 880, 560, 150, 'r', COL.red, { gain: 480, win: 3.2 })}${trace(tn, 80, 1075, 560, 170, 'i', COL.ir, { gain: 480, win: 3.2 })}${labelDot('merah', 90, 905, COL.red, 26)}${labelDot('inframerah', 90, 1100, COL.ir, 26)}</g>`;
    const km = seg(tn, 27.38, 27.9, eo), kr = seg(tn, 28.1, 28.7, eo) * (1 - seg(tn, 29.0, 29.3)), kc = seg(tn, 28.9, 29.4) * (1 - seg(tn, 31.0, 31.3));
    if (km > 0.01) for (const [w, cy, col] of [['r', 955, COL.red], ['i', 1160, COL.ir]]) { const hh = PP[w] * km; u += `<g opacity="${f1(k5 * 100) / 100}"><path d="M655 ${f1(cy - hh / 2)}V${f1(cy + hh / 2)}" stroke="${col}" stroke-width="9" stroke-linecap="round"/><path d="M640 ${f1(cy - hh / 2)}H670M640 ${f1(cy + hh / 2)}H670" stroke="${col}" stroke-width="7" stroke-linecap="round"/></g>`; }
    if (kr > 0.01) {
      const bx = 740, base = 1190;
      u += `<g opacity="${f1(k5 * kr * 100) / 100}">${R(bx, base - PP.r * 1.15, 90, PP.r * 1.15, COL.red, 10, `stroke="${INK}" stroke-width="3"`)}${R(bx + 150, base - PP.i * 1.15, 90, PP.i * 1.15, COL.ir, 10, `stroke="${INK}" stroke-width="3"`)}${T('÷', bx + 120, base - 50, { size: 70, fill: '#fff', w: 800 })}${T('tinggi denyut', bx + 120, 900, { size: 28, fill: '#CFE8E2', w: 700 })}${T('merah', bx + 45, base + 34, { size: 24, fill: '#fff', w: 700 })}${T('inframerah', bx + 195, base + 34, { size: 24, fill: '#fff', w: 700 })}</g>`;
    }
    if (kc > 0.01) {
      const x0 = 720, y0 = 1215, w = 270, h = 250, xr = (R_) => x0 + (R_ - 0.3) / 0.9 * w, yr = (S_) => y0 - (S_ - 80) / 22 * h;
      let cv = ''; for (let i = 0; i <= 30; i++) { const R_ = 0.3 + 0.9 * i / 30, S_ = Math.min(102, spo2FromR(R_)); cv += `${i ? 'L' : 'M'}${f1(xr(R_))} ${f1(yr(S_))}`; }
      const kd = seg(tn, 29.1, 29.75, eio), Rd = lerp(1.05, Rratio, kd), Sd = spo2FromR(Rd);
      u += `<g opacity="${f1(k5 * kc * 100) / 100}">${T('kurva kalibrasi alat', x0 + w / 2, 892, { size: 26, fill: '#CFE8E2', w: 700 })}<path d="M${x0} ${y0 - h - 6}V${y0}H${x0 + w + 10}" fill="none" stroke="#9DB0B7" stroke-width="4"/><path d="${cv}" fill="none" stroke="${GOLD}" stroke-width="6" stroke-linecap="round"/>`
        + `<path d="M${f1(xr(Rd))} ${y0}V${f1(yr(Sd))}H${x0}" fill="none" stroke="#fff" stroke-width="3" stroke-dasharray="7 7"/>${C(xr(Rd), yr(Sd), 11, '#fff', `stroke="${INK}" stroke-width="3"`)}${T('rasio merah ÷ inframerah', x0 + w / 2, y0 + 36, { size: 22, fill: '#9DB0B7', w: 700 })}</g>`;
    }
    const kv = pop(tn, TL.W.spo2, 0.4) * clamp((31.2 - tn) / 0.35);
    if (kv > 0.01) u += `<g opacity="${f1(Math.min(1, kv) * 100) / 100}" transform="translate(540 760) scale(${f1(0.6 + 0.4 * Math.min(1.1, kv))})">${R(-230, -64, 460, 128, '#00A383', 40, `stroke="${INK}" stroke-width="5"`)}${T(`SpO₂ ≈ ${Math.round(SPO2)}%`, 0, 24, { size: 76, fill: '#fff' })}</g>`;
    const kp = clamp((tn - 28.0) / 0.3) * clamp((29.7 - tn) / 0.3);
    if (kp > 0.01) { const [px, py] = p(GEO.jawL + 326, GEO.fingerTop - 66); u += leader(px, py, 520, 340, '#2FBF92', kp) + chip(['Prosesor membandingkan'], 540, 250, { a: kp, size: 46, bg: '#2FBF92', fg: '#fff' }); }
  }
  const kh = clamp((tn - 31.34) / 0.45) * clamp((34.35 - tn) / 0.3);
  if (kh > 0.01) {
    u += panel(40, 880, 1000, 380, 'Hemoglobin dalam darah arteri', kh);
    const bx = 90, bw = 900, by = 1020, bh = 100, ox = bw * 0.97, ek = seg(tn, 31.6, 32.4, eo);
    u += `<g opacity="${f1(kh * 100) / 100}">${R(bx, by, bw, bh, COL.deoxy, 18, `stroke="${INK}" stroke-width="5"`)}${R(bx, by, ox * ek, bh, COL.oxy, 18, `stroke="${INK}" stroke-width="5"`)}`
      + [0, 1, 2, 3, 4, 5].map((i) => `<g fill="#fff"><circle cx="${f1(bx + 80 + i * 140)}" cy="${by + 30}" r="7" opacity="${f1(ek)}"/><circle cx="${f1(bx + 102 + i * 140)}" cy="${by + 30}" r="7" opacity="${f1(ek)}"/></g>`).join('')
      + `${T('Hb membawa O₂', bx + 220, by + bh + 50, { size: 36, fill: '#fff' })}${T('tanpa O₂', bx + bw - 40, by + bh + 50, { size: 28, fill: '#E7B6DD', anchor: 'end' })}${T('≈ 97%', bx + ox / 2 + 140, by + 66, { size: 60, fill: '#fff' })}${T('persentase Hb yang membawa oksigen', 540, 1230, { size: 32, fill: '#CFE8E2', w: 700 })}</g>`;
  }
  return u;
}

// ================================================================ sampul vertikal (?cover=1)
export function coverFrame() {
  const tn = 18.55, z = 1.25, cx = 650, cy = 856, sy = 1030;
  const cut = sceneCut(tn, { amp: 1, ledR: 1, ledI: 1, reach: 1 });
  const B = `${bgB}<g transform="${camT(cx, cy, z, sy)}">${cut.svg}</g>`;
  let U = `${R(80, 250, 920, 300, 'rgba(0,0,0,.28)', 44)}${R(70, 240, 920, 300, '#fff', 44)}${T('Bagaimana penjepit jari', 530, 360, { size: 78, fill: FOREST })}${T('bisa membaca SpO₂?', 530, 458, { size: 82, fill: '#D9382F' })}`;
  U += chip(['Merah + inframerah'], 540, 585, { size: 46, bg: COL.ir, fg: '#fff' });
  U += `${R(150, 1440, 780, 120, GOLD, 60)}${T('belajar FK gratis di medcoel.com', 540, 1518, { size: 46, fill: INK })}`;
  U += `<g><rect x="940" y="1310" width="1" height="1" fill="none"/></g>`;
  return { B, U };
}
