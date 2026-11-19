// Bagian 2 video: hasil di layar, kegunaan, batas akurasi (gangguan sinyal), CO2/CO, cara membaca, penutup edukasi.
import { f1, clamp, lerp, R, C, P, T, COL, INK, GOLD, MC, FONT, FOREST, seg, win, eo, eio, sm, pill, pop, rndf, tw } from './lib.js';
import { raka, rakaSvg, lerpState, idle as rIdle } from '../../../brand/characters/raka/raka.js';
import { GEO, fingerBody, vesselSvg, vesselD, cellsSvg, clipSvg, beamSvg, mixHex, cell } from './anatomy.js';
import { phase, pulse, effMu, D0, DA, HR } from './physics.js';
import * as TL from './timeline.js';
const W = TL.W;
export const bgDark = `<defs><linearGradient id="g2" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#103F4A"/><stop offset="1" stop-color="#0A2B34"/></linearGradient></defs>${R(-1000, -1000, 4000, 5000, 'url(#g2)')}`;
const ka = (tn, t0, t1, f = 0.25) => clamp((tn - t0) / f) * clamp((t1 - tn) / f);
const pillAt = (tn, t0, t1, lines, y, o = {}) => { const k = ka(tn, t0, t1, 0.3); return k > 0.01 ? pill(lines, o.cx ?? 540, y + (1 - eo(clamp((tn - t0) / 0.35))) * -44, { a: k, size: o.size ?? 52, bg: o.bg, fg: o.fg }) : ''; };
const rk2 = (st, x, top, s, uid, o = {}) => `<g transform="translate(${f1(x - 200 * s)} ${f1(top)}) scale(${s})">${rakaSvg(st, { bare: true, shadow: false, uid, dark: true, ...o })}</g>`;
const heartP = (cx, cy, r, f = '#FF5A6A') => `<path transform="translate(${f1(cx)} ${f1(cy)}) scale(${f1(r / 30 * 1000) / 1000})" d="M0 26C-34 2 -30 -26 -12 -26C-3 -26 0 -18 0 -14C0 -18 3 -26 12 -26C30 -26 34 2 0 26Z" fill="${f}" stroke="${INK}" stroke-width="4"/>`;
// ---------------------------------------------------------------- ikon
export const ico = {
  lungs: (x, y, s = 1, col = '#F28F9C') => `<g transform="translate(${x} ${y}) scale(${s})"><path d="M-8 -80V-20M8 -80V-20M-8 -30Q-30 -10 -34 0M8 -30Q30 -10 34 0" stroke="${INK}" stroke-width="12" stroke-linecap="round" fill="none"/><path d="M-12 -40C-60 -50 -98 10 -92 70C-90 96 -60 98 -42 84C-24 70 -12 40 -12 -40Z" fill="${col}" stroke="${INK}" stroke-width="7" stroke-linejoin="round"/><path d="M12 -40C60 -50 98 10 92 70C90 96 60 98 42 84C24 70 12 40 12 -40Z" fill="${col}" stroke="${INK}" stroke-width="7" stroke-linejoin="round"/></g>`,
  tank: (x, y, s = 1) => `<g transform="translate(${x} ${y}) scale(${s})"><rect x="-34" y="-70" width="68" height="150" rx="30" fill="#4FA3D9" stroke="${INK}" stroke-width="7"/><rect x="-14" y="-92" width="28" height="30" rx="8" fill="#C9D9DB" stroke="${INK}" stroke-width="6"/><rect x="-34" y="-12" width="68" height="40" fill="#fff" opacity=".9"/><text y="18" text-anchor="middle" font-family="${FONT}" font-weight="800" font-size="30" fill="#1E6FA8">O₂</text><path d="M14 -80C60 -110 110 -80 100 -30C94 0 60 20 60 60" fill="none" stroke="#C9D9DB" stroke-width="8" stroke-linecap="round"/></g>`,
  snow: (x, y, s = 1, col = '#BFE6FF') => `<g transform="translate(${x} ${y}) scale(${s})" stroke="${col}" stroke-width="9" stroke-linecap="round" fill="none">${[0, 60, 120].map((a) => `<path transform="rotate(${a})" d="M0 -50V50M-14 -36L0 -22L14 -36M-14 36L0 22L14 36"/>`).join('')}</g>`,
  motion: (x, y, s = 1, col = GOLD) => `<g transform="translate(${x} ${y}) scale(${s})" stroke="${col}" stroke-width="9" stroke-linecap="round" stroke-linejoin="round" fill="none"><path d="M-60 -20H60M44 -36L60 -20L44 -4M-60 20H60M-44 4L-60 20L-44 36"/></g>`,
  weak: (x, y, s = 1) => `<g transform="translate(${x} ${y}) scale(${s})"><rect x="-70" y="-14" width="140" height="28" rx="14" fill="${COL.plasma}" stroke="${COL.vessel}" stroke-width="6"/><path d="M-40 0H40M26 -10L40 0L26 10" stroke="#fff" stroke-width="6" stroke-linecap="round" fill="none" opacity=".7"/></g>`,
  polish: (x, y, s = 1, col = '#8E2CB0') => `<g transform="translate(${x} ${y}) scale(${s})"><rect x="-26" y="-6" width="52" height="64" rx="12" fill="${col}" stroke="${INK}" stroke-width="6"/><rect x="-14" y="-40" width="28" height="36" rx="6" fill="#222" stroke="${INK}" stroke-width="5"/></g>`,
  skin: (x, y, s = 1) => `<g transform="translate(${x} ${y}) scale(${s})">${['#F8D5B8', '#E0A97F', '#B77B52', '#7A4A2E', '#4E2E1C'].map((c, i) => `<circle cx="${(i - 2) * 38}" cy="0" r="19" fill="${c}" stroke="${INK}" stroke-width="4"/>`).join('')}</g>`,
  co2: (x, y, s = 1) => `<g transform="translate(${x} ${y}) scale(${s})"><circle cx="0" cy="0" r="30" fill="#6B7B88" stroke="${INK}" stroke-width="5"/><circle cx="-56" cy="0" r="22" fill="#E8665F" stroke="${INK}" stroke-width="5"/><circle cx="56" cy="0" r="22" fill="#E8665F" stroke="${INK}" stroke-width="5"/><text y="12" text-anchor="middle" font-family="${FONT}" font-weight="800" font-size="30" fill="#fff">C</text></g>`,
  cross: (x, y, s = 1, col = '#E8433A') => `<g transform="translate(${x} ${y}) scale(${s})"><path d="M-40 -40L40 40M40 -40L-40 40" stroke="${INK}" stroke-width="22" stroke-linecap="round"/><path d="M-40 -40L40 40M40 -40L-40 40" stroke="${col}" stroke-width="12" stroke-linecap="round"/></g>`,
  warn: (x, y, s = 1) => `<g transform="translate(${x} ${y}) scale(${s})"><path d="M0 -46L48 38H-48Z" fill="${GOLD}" stroke="${INK}" stroke-width="7" stroke-linejoin="round"/><path d="M0 -14V12" stroke="${INK}" stroke-width="9" stroke-linecap="round"/><circle cx="0" cy="26" r="5.5" fill="${INK}"/></g>`,
  check: (x, y, s = 1, col = '#00A383') => `<g transform="translate(${x} ${y}) scale(${s})"><circle r="32" fill="${col}" stroke="${INK}" stroke-width="5"/><path d="M-15 0L-4 11L16 -11" stroke="#fff" stroke-width="9" fill="none" stroke-linecap="round" stroke-linejoin="round"/></g>`,
  med: (x, y, s = 1) => `<g transform="translate(${x} ${y}) scale(${s})"><rect x="-36" y="-36" width="72" height="72" rx="18" fill="#E8433A" stroke="${INK}" stroke-width="6"/><path d="M0 -20V20M-20 0H20" stroke="#fff" stroke-width="12" stroke-linecap="round"/></g>`,
};
// ---------------------------------------------------------------- layar alat besar (kartu angka)
export function readout(x, y, scr, pr, o = {}) {
  const w = o.w ?? 520, h = o.h ?? 250, s = o.s ?? 1;
  return `<g transform="translate(${x} ${y}) scale(${s})">${R(-w / 2, -h / 2 + 8, w, h, 'rgba(0,0,0,.3)', 36)}${R(-w / 2, -h / 2, w, h, '#0B1A20', 36, `stroke="${COL.body}" stroke-width="10"`)}${T('SpO₂', -w / 4, -h / 2 + 52, { size: 34, fill: '#9DE0BD', w: 800 })}${T(scr, -w / 4, h / 2 - 44, { size: o.big ?? 120, fill: o.scrCol ?? '#fff' })}${T('PR', w / 4, -h / 2 + 52, { size: 34, fill: '#FFD166', w: 800 })}${T(pr, w / 4, h / 2 - 44, { size: o.big ?? 120, fill: '#fff' })}${o.unit === true ? `${T('%', -w / 4 + 150, h / 2 - 50, { size: 44, fill: '#9DE0BD', anchor: 'start' })}${T('/mnt', w / 4 + 120, h / 2 - 50, { size: 30, fill: '#FFD166', anchor: 'start' })}` : ''}</g>`;
}
// ---------------------------------------------------------------- B6: hasil (kamera keluar kembali ke alat) - ring SpO2 dan PR di alat luar
/** proyeksi titik lokal-alat -> layar untuk kamera A: (hx,hy) pusat tangan (dunia), skala Raka 1.5 */
export function uiResult(tn, projA) {
  let u = '';
  const [sx, sy] = projA(-4 + 26, -31), [px, py] = projA(-4 + 62, -31);
  const k1 = ka(tn, 34.92, 36.45), k2 = ka(tn, 36.4, 39.15);
  const ring = (x, y, r, col, a, ph = 0) => `<g opacity="${f1(a * 100) / 100}"><circle cx="${f1(x)}" cy="${f1(y)}" r="${f1(r + ph)}" fill="none" stroke="${INK}" stroke-width="16" opacity=".5"/><circle cx="${f1(x)}" cy="${f1(y)}" r="${f1(r + ph)}" fill="none" stroke="${col}" stroke-width="8"/></g>`;
  if (k1 > 0.01) { u += ring(sx, sy, 130, '#9DE0BD', k1, Math.sin(tn * 8) * 4); u += pill(['SpO₂: estimasi saturasi'], 540, 330 + (1 - eo(clamp((tn - 34.92) / 0.35))) * -50, { a: k1, size: 48, bg: '#00A383', fg: '#fff' }); }
  if (k2 > 0.01) {
    const ph = phase(tn), beat = Math.max(0, 1 - ((ph - Math.floor(ph)) * 3.0));
    u += ring(px, py, 130, GOLD, k2, beat * 14);
    u += pill(['PR: denyut nadi', 'per menit'], 540, 1060 + (1 - eo(clamp((tn - 36.4) / 0.35))) * 50, { a: k2, size: 46, bg: GOLD, fg: INK });
    u += `<g opacity="${f1(k2 * 100) / 100}">${heartP(px, py - 210, 48 + beat * 14)}</g>`;
  }
  return u;
}
// ---------------------------------------------------------------- B7: kegunaan (tiga potongan singkat)
function monitorOR(tn) {
  const ph = phase(tn);
  let ecg = ''; for (let i = 0; i <= 90; i++) { const x = i / 90, t2 = (ph - 0.6 + x * 2.2) % 1, y = (t2 > 0.46 && t2 < 0.5) ? -50 : (t2 > 0.5 && t2 < 0.53) ? 40 : (t2 > 0.2 && t2 < 0.3) ? -12 : 0; ecg += `${i ? 'L' : 'M'}${f1(-250 + x * 500)} ${f1(-30 + y)}`; }
  let pl = ''; for (let i = 0; i <= 90; i++) { const x = i / 90, v = pulse(ph - 0.7 + x * 2.2); pl += `${i ? 'L' : 'M'}${f1(-250 + x * 500)} ${f1(120 - v * 60)}`; }
  return `<g>${R(-330, -270, 660, 520, '#0B1A20', 36, `stroke="${COL.body}" stroke-width="12"`)}${R(-12, 250, 24, 90, '#9DB0B7')}${R(-110, 336, 220, 26, '#9DB0B7', 12)}`
    + `<path d="${ecg}" fill="none" stroke="#35D07F" stroke-width="6" stroke-linejoin="round"/><path d="${pl}" fill="none" stroke="#5BB8FF" stroke-width="6" stroke-linejoin="round"/>`
    + `${T('SpO₂ 97', -190, -150, { size: 56, fill: '#5BB8FF' })}${T('PR 72', 150, -150, { size: 56, fill: '#FFD166' })}</g>`;
}
export function sceneUse(tn) {
  let A = bgDark, U = '';
  const k1 = ka(tn, 39.58, 42.95, 0.15), k2 = ka(tn, 42.75, 44.85, 0.15), k3 = ka(tn, 44.6, 48.95, 0.15);
  if (k1 > 0.01) {
    A += `<g opacity="${f1(k1 * 100) / 100}" transform="translate(540 760)">${monitorOR(tn)}</g>`;
    U += pillAt(tn, 39.9, 42.9, ['Memantau saat operasi'], 250, { bg: '#fff' });
  }
  if (k2 > 0.01) {
    const st = rIdle(raka('batuk', 'batuk', { yaw: 0.1, tears: 0, armR: { wx: 226, wy: 336, ex: 322, ey: 400, finger: 0, front: 1 }, armL: { wx: 70, wy: 410, ex: 66, ey: 480, finger: 1, fa: 0, front: 1 }, bags: 0.5 }), tn);
    const br = Math.abs(Math.sin(tn * 7));
    A += `<g opacity="${f1(k2 * 100) / 100}">${rk2(st, 560, 470, 1.35, 'rkU')}<g opacity="0.8" transform="translate(830 840)"><path d="M-80 -30Q-40 -50 0 -30T80 -30M-80 10Q-40 -10 0 10T80 10" stroke="#BFE6FF" stroke-width="8" fill="none" stroke-linecap="round" transform="scale(${f1(0.8 + br * 0.4)} 1)"/></g></g>`;
    U += pillAt(tn, 42.9, 44.8, ['Keluhan pernapasan'], 250);
  }
  if (k3 > 0.01) {
    const kL = seg(tn, 46.4, 46.9, eo), kO = seg(tn, 48.0, 48.5, eo);
    A += `<g opacity="${f1(k3 * 100) / 100}">${ico.lungs(310, 790, 2.1)}${R(190, 1000, 240, 70, '#fff', 35)}${T('Penyakit paru', 310, 1050, { size: 36, fill: FOREST })}${ico.tank(780, 800, 2.0)}${R(655, 1010, 250, 70, '#fff', 35)}${T('Terapi oksigen', 780, 1060, { size: 36, fill: FOREST })}`
      + `${C(310, 790, 190, 'none', `stroke="${GOLD}" stroke-width="${f1(10 * kL)}"`)}${C(780, 800, 190, 'none', `stroke="${GOLD}" stroke-width="${f1(10 * kO)}"`)}</g>`;
    U += pillAt(tn, 44.9, 48.9, ['Kondisi tertentu'], 250);
  }
  return { A, U };
}
// ---------------------------------------------------------------- B8: angka bukan diagnosis
export function sceneDx(tn) {
  const k = ka(tn, 49.64, 51.75, 0.25), kd = pop(tn, W.bukanDx, 0.35);
  let A = bgDark + `<g opacity="${f1(k * 100) / 100}">${readout(300, 800, '97', '72', { w: 440, h: 230, big: 100, s: 1 })}`;
  A += `<g transform="translate(300 1030)">${T('angka di layar', 0, 0, { size: 34, fill: '#CFE8E2', w: 700 })}</g>`;
  A += `${R(640, 700, 340, 200, '#fff', 30, `stroke="${INK}" stroke-width="6"`)}${T('Diagnosis', 810, 790, { size: 44, fill: FOREST })}${T('(dokter menilai', 810, 835, { size: 28, fill: '#4D6B66', w: 700 })}${T('gejala + pemeriksaan)', 810, 870, { size: 28, fill: '#4D6B66', w: 700 })}`;
  A += `<g transform="translate(540 800) scale(${f1(Math.min(1.1, kd) * 1000) / 1000})" opacity="${f1(Math.min(1, kd) * 100) / 100}">${R(-52, -52, 104, 104, '#E8433A', 26, `stroke="${INK}" stroke-width="6"`)}${T('≠', 0, 34, { size: 92, fill: '#fff' })}</g></g>`;
  return { A, U: pillAt(tn, 49.7, 51.7, ['Angka bukan diagnosis'], 250, { bg: '#D9382F', fg: '#fff' }) };
}

// ---------------------------------------------------------------- B9: empat/lima gangguan sinyal (perubahan nyata pada sinyal dan berkas)
import { sceneCut, trace, panel, labelDot, camT, proj, leader } from './scenes.js';
const DIST = [
  { t0: W.dingin, t1: W.gerakan, key: 'dingin', label: 'Jari dingin', icon: (x, y) => ico.snow(x, y, 1.1), v: { cold: 1, base: 44, amp: 0.45 }, vv: { amp: 0.45, base: 44, noise: 0.35 }, note: 'pembuluh menyempit, denyut mengecil' },
  { t0: W.gerakan, t1: W.aliran, key: 'gerakan', label: 'Gerakan', icon: (x, y) => ico.motion(x, y, 1.1), v: { motion: 1 }, vv: { motion: 1 }, note: 'jari bergerak, sinyal berantakan' },
  { t0: W.aliran, t1: W.catKuku, key: 'aliran', label: 'Aliran darah lemah', icon: (x, y) => ico.weak(x, y, 1.1), v: { base: 50, amp: 0.2 }, vv: { amp: 0.2, base: 50, noise: 0.15 }, note: 'denyut nyaris tak terbaca' },
  { t0: W.catKuku, t1: W.warnaKulit, key: 'kuku', label: 'Cat kuku', icon: (x, y) => ico.polish(x, y, 1.0), v: { polish: '#7B2D9E', pre: 0.35 }, vv: { amp: 0.8, noise: 0.5 }, note: 'lapisan cat meredam cahaya' },
  { t0: W.warnaKulit, t1: 57.45, key: 'kulit', label: 'Warna kulit', icon: (x, y) => ico.skin(x, y, 0.8), v: { melanin: 0.85, pre: 0.55 }, vv: { amp: 0.85, noise: 0.4 }, note: 'pigmen kulit meredam cahaya' },
];
export function sceneDist(tn) {
  const cur = DIST.find((d) => tn >= d.t0 && tn < d.t1) || (tn < W.dingin ? null : null);
  const intro = tn < W.dingin, summary = tn >= 57.45;
  const v = cur ? { ...cur.v, mode: 'normal' } : {};
  const sy = 560, cam = { cx: 620, cy: 856, z: 0.72, sy };
  const jit = cur && cur.key === 'gerakan' ? `translate(${f1(Math.sin(tn * 41) * 12)} ${f1(Math.cos(tn * 33) * 8)})` : '';
  const cut = sceneCut(tn, { amp: v.amp ?? 1, base: v.base, polish: v.polish, melanin: v.melanin, cold: v.cold, pre: v.pre, ledR: 1, ledI: 1, reach: 1 });
  let B = bgDark + `<g transform="${camT(cam.cx, cam.cy, cam.z, sy)}"><g transform="${jit}">${cut.svg}</g></g>`;
  // panel grafik: sinyal sesuai gangguan
  const vv = cur ? { ...cur.vv, t0: -1e9 } : { amp: 1 };
  let U = pillAt(tn, 51.7, 59.0, ['Angka bisa keliru'], 250, { bg: '#D9382F', fg: '#fff' });
  U += panel(40, 950, 1000, 300, 'Sinyal pada alat', 1);
  U += `${trace(tn, 80, 985, 700, 110, 'i', COL.ir, { gain: 400, win: 3.2, vv, t0: -1e9 })}${trace(tn, 80, 1110, 700, 110, 'r', COL.red, { gain: 400, win: 3.2, vv, t0: -1e9 })}${labelDot('inframerah', 600, 1040, COL.ir, 22)}${labelDot('merah', 600, 1165, COL.red, 22)}`;
  // angka di layar: berubah-ubah dan diberi tanda tanya saat ada gangguan
  const flick = (k) => ['97', '94', '98', '92', '96'][Math.floor(tn * 3 + k) % 5];
  const rd = cur ? (cur.key === 'aliran' ? '--' : flick(cur.key.length)) : '97';
  U += `<g>${R(800, 990, 200, 230, '#0B1A20', 28, `stroke="${COL.body}" stroke-width="8"`)}${T('SpO₂', 900, 1036, { size: 26, fill: '#9DE0BD' })}${T(rd, 900, 1140, { size: 90, fill: '#fff' })}${cur ? `<g transform="translate(965 1005)">${C(0, 0, 26, GOLD, `stroke="${INK}" stroke-width="4"`)}${T('?', 0, 14, { size: 38, fill: INK })}</g>` : ''}</g>`;
  if (cur) {
    const k = clamp((tn - cur.t0) / 0.25) * clamp((cur.t1 - tn) / 0.2);
    U += `<g opacity="${f1(Math.min(1, k) * 100) / 100}">${C(150, 830, 62, '#fff', `stroke="${INK}" stroke-width="5"`)}${cur.icon(150, 830)}${pill([cur.label], 620, 790, { size: 50, bg: '#fff' })}${T(cur.note, 620, 890, { size: 30, fill: '#E6F3F1', w: 700 })}</g>`;
  } else if (summary) {
    const ks = clamp((tn - 57.45) / 0.3);
    U += `<g opacity="${f1(ks * 100) / 100}">${[['snow', 240], ['motion', 390], ['weak', 540], ['polish', 690], ['skin', 840]].map(([k, x]) => `<circle cx="${x}" cy="838" r="52" fill="#fff" stroke="${INK}" stroke-width="5"/>${k === 'snow' ? ico.snow(x, 838, 0.9) : k === 'motion' ? ico.motion(x, 838, 0.7) : k === 'weak' ? ico.weak(x, 838, 0.55) : k === 'polish' ? ico.polish(x, 838, 0.7, '#7B2D9E') : ico.skin(x, 838, 0.38)}`).join('')}${T('semuanya dapat memengaruhi akurasi', 540, 922, { size: 30, fill: '#fff', anchor: 'middle', w: 700 })}</g>`;
  } else if (intro) {
    U += `<g>${T('sinyal normal sebagai pembanding', 540, 880, { size: 32, fill: '#CFE8E2', w: 700 })}</g>`;
  }
  return { B, U };
}
// ---------------------------------------------------------------- B10: tidak mengukur CO2
export function sceneCO2(tn) {
  const k = ka(tn, 59.32, 61.5, 0.25), x = pop(tn, W.co2 + 1.0, 0.4);
  let A = bgDark + `<g opacity="${f1(k * 100) / 100}"><g transform="translate(300 800)">${ico.co2(0, 0, 1.6)}${R(-170, 100, 340, 70, '#fff', 35)}${T('karbon dioksida', 0, 150, { size: 34, fill: FOREST })}</g><g transform="translate(790 800)">${readout(0, 0, '97', '72', { w: 380, h: 220, big: 84, s: 1 })}${T('hanya SpO₂ dan nadi', 0, 160, { size: 32, fill: '#CFE8E2', w: 700 })}</g>`;
  A += `<g transform="translate(300 800) scale(${f1(Math.min(1.1, x) * 1000) / 1000})" opacity="${f1(Math.min(1, x) * 100) / 100}">${ico.cross(0, 0, 2.6)}</g></g>`;
  return { A, U: pillAt(tn, 59.4, 61.4, ['Tidak mengukur CO₂'], 250, { bg: '#fff' }) };
}
// ---------------------------------------------------------------- B11: keracunan karbon monoksida (CO)
export function sceneCO(tn) {
  const mode = tn >= W.co ? 'co' : 'normal', cam = { cx: 650, cy: 905, z: 1.4, sy: 880 };
  const cut = sceneCut(tn, { amp: 1, mode, ledR: 1, ledI: 1, reach: 1, scr: '98', pr: '72' });
  // molekul CO masuk pembuluh dari kiri (62,0 - 63,6)
  let mol = ''; const km = clamp((tn - 62.0) / 1.6);
  if (km > 0 && km < 1) for (let i = 0; i < 9; i++) { const xx = lerp(-40, 440 + (rndf(i) - 0.5) * 140, eo(km)), yy = 914 + (rndf(i + 5) - 0.5) * 40; mol += `<g transform="translate(${f1(xx)} ${f1(yy)})" opacity="${f1(1 - km * 0.2)}"><circle r="9" fill="#444"/><circle cx="14" r="8" fill="#E8665F"/></g>`; }
  const B = bgDark + `<g transform="${camT(cam.cx, cam.cy, cam.z, cam.sy)}">${cut.svg}${mol}</g>`;
  let U = pillAt(tn, 61.98, 66.0, ['Keracunan karbon monoksida (CO)'], 250, { bg: '#D9382F', fg: '#fff', size: 46 });
  const kl = ka(tn, W.co, 66.9, 0.3);
  if (kl > 0.01) U += `<g opacity="${f1(kl * 100) / 100}">${R(60, 1140, 520, 110, 'rgba(8,18,30,.92)', 28)}${cell(130, 1178, 'co', { s: 1.2 })}${T('Hb–CO terbaca seperti', 360, 1185, { size: 28, fill: '#fff' })}${T('Hb beroksigen', 360, 1220, { size: 28, fill: '#FFC2D6' })}</g>`;
  const kr = ka(tn, 64.06, 68.5, 0.3);
  if (kr > 0.01) U += `<g opacity="${f1(kr * 100) / 100}">${readout(800, 480, '98', '72', { w: 360, h: 200, big: 78, s: 1, scrCol: '#7CFFB6' })}${tn > 66.1 ? `<g transform="translate(960 380) scale(${f1(Math.min(1.1, pop(tn, 66.1, 0.35)) * 1000) / 1000})">${ico.check(0, 0, 1)}</g>` : ''}${tn > 66.1 ? T('tampak meyakinkan', 800, 616, { size: 30, fill: '#CFF7E3', w: 800 }) : ''}</g>`;
  const kd = pop(tn, 67.02, 0.4) * clamp((68.55 - tn) / 0.3);
  if (kd > 0.01) {
    const st = rIdle(raka('khawatir', 'netral', { dizzy: 1, dizzyT: tn * 4, sweat: 1, bags: 0.6, yaw: 0.1 }), tn);
    U += `<g opacity="${f1(Math.min(1, kd) * 100) / 100}"><clipPath id="cop"><circle cx="190" cy="1150" r="130"/></clipPath><circle cx="190" cy="1150" r="140" fill="#102A33" stroke="#D9382F" stroke-width="10"/><g clip-path="url(#cop)">${rk2(st, 190, 1060, 0.62, 'rkCO', {}).replace(/^/, '')}</g>${pill(['Tapi kondisinya', 'berbahaya'], 650, 1110, { size: 44, bg: '#D9382F', fg: '#fff', a: 1 })}${ico.warn(420, 1060, 0.9)}</g>`;
  }
  return { B, U };
}

// ---------------------------------------------------------------- B12: cara memakai (hangatkan tangan, lepas cat kuku, diam, tunggu angka stabil)
const HOLD = (x, y, s, uid) => '';
export function sceneHow(tn) {
  const k = ka(tn, 68.95, 77.05, 0.3);
  const rub = ka(tn, 70.64, 71.74, 0.2), nail = ka(tn, 71.74, 73.95, 0.2), still = ka(tn, 74.04, 75.1, 0.2), wait = ka(tn, 75.14, 77.0, 0.2);
  const osc = Math.sin(tn * 22) * 14;
  const down = { armL: { wx: 86, wy: 556, ex: 88, ey: 488, finger: 0, front: 0 }, armR: { wx: 314, wy: 556, ex: 312, ey: 488, finger: 0, front: 0 } };
  const rubArm = { armL: { wx: 176 + osc, wy: 480, ex: 90, ey: 520, finger: 0, front: 1 }, armR: { wx: 224 - osc, wy: 480 + osc * 0.4, ex: 310, ey: 520, finger: 0, front: 1 } };
  const nailArm = { armL: { wx: 150, wy: 470, ex: 96, ey: 520, finger: 0, front: 1 }, armR: { wx: 252, wy: 418, ex: 326, ey: 470, finger: 1, fa: -90, front: 1 } };
  const waitArm = { armL: { wx: 86, wy: 556, ex: 88, ey: 488, finger: 0, front: 0 }, armR: { wx: 300, wy: 400, ex: 336, ey: 470, finger: 1, fa: -70, front: 1 } };
  const mixArm = (a, b, f) => ({ armL: { ...Object.fromEntries(Object.keys(a.armL).map((k2) => [k2, lerp(a.armL[k2], b.armL[k2], f)])) }, armR: { ...Object.fromEntries(Object.keys(a.armR).map((k2) => [k2, lerp(a.armR[k2], b.armR[k2], f)])) } });
  let arms = down;
  if (tn >= 70.5) arms = mixArm(down, rubArm, seg(tn, 70.5, 70.8));
  if (tn >= 71.6) arms = mixArm(rubArm, nailArm, seg(tn, 71.6, 72.0));
  if (tn >= 73.9) arms = mixArm(nailArm, down, seg(tn, 73.9, 74.3));
  if (tn >= 75.05) arms = mixArm(down, waitArm, seg(tn, 75.05, 75.5));
  const happy = seg(tn, 76.0, 76.5);
  let st = raka(happy > 0.5 ? 'lega' : 'netral', 'netral', { ...arms, yaw: still > 0 ? 0 : 0.1, bags: 0.2 });
  st = rIdle(st, tn);
  const RX = 540, TOP = 400, S = 1.35;
  let A = bgDark + `<g opacity="${f1(k * 100) / 100}">${rk2(st, RX, TOP, S, 'rkHow')}${R(-300, 1215, 1700, 900, '#7C5B3C')}${R(-300, 1215, 1700, 26, '#A67C52')}`;
  // alat di meja (rahang terbuka) saat "Saat memakainya"; lalu di jari saat menunggu
  const onFinger = tn >= 75.1;
  const dpos = onFinger ? [RX - 200 * S + (waitArm.armR.wx + 17) * S, TOP + waitArm.armR.wy * S] : [860, 1160];
  const disp = tn < 75.14 ? { scr: '--', pr: '--' } : { scr: tn < 75.5 ? '91' : tn < 75.85 ? '95' : tn < 76.2 ? '96' : '97', pr: tn < 75.5 ? '66' : tn < 75.85 ? '70' : '72' };
  A += `<g transform="translate(${f1(dpos[0])} ${f1(dpos[1])}) scale(${onFinger ? S : 2.2})">${deviceExtX({ jaw: onFinger ? 1 : 0.15, ...disp, glowR: onFinger ? 1 : 0 })}</g>`;
  // gelombang hangat saat menggosok tangan
  if (rub > 0.01) A += `<g opacity="${f1(rub * 100) / 100}" stroke="#FFB070" stroke-width="9" fill="none" stroke-linecap="round">${[-70, 0, 70].map((dx, i) => `<path d="M${f1(RX + dx)} ${f1(TOP + 420 * S - 20 - Math.abs(Math.sin(tn * 6 + i)) * 20)}q-18 -30 0 -60t0 -60"/>`).join('')}</g>`;
  // inset kuku: cat dihapus kapas
  if (nail > 0.01) {
    const wipe = seg(tn, 72.1, 73.5), pc = 1 - wipe, padx = 800 + Math.sin(tn * 12) * 60 * (1 - seg(tn, 73.5, 73.8));
    A += `<g opacity="${f1(nail * 100) / 100}"><clipPath id="nl"><circle cx="800" cy="1000" r="190"/></clipPath><circle cx="800" cy="1000" r="200" fill="#102A33" stroke="${GOLD}" stroke-width="10"/><g clip-path="url(#nl)">${R(560, 880, 480, 360, COL.skin)}<rect x="690" y="880" width="220" height="250" rx="48" fill="${mixHex('#F7E3E4', '#7B2D9E', pc)}" stroke="#D9B7BC" stroke-width="6"/>${wipe > 0.02 && wipe < 0.99 ? `<g transform="translate(${f1(padx)} ${f1(1000)})"><circle r="52" fill="#fff" stroke="#CFD8DE" stroke-width="5"/><circle r="30" fill="#fff" opacity=".7"/></g>` : ''}</g></g>`;
  }
  // meter diam (sinyal stabil) saat "diam sejenak"
  A += '</g>';
  let U = '';
  const chips = [[70.64, 71.74, '1  Hangatkan tangan'], [71.74, 73.95, '2  Lepaskan cat kuku'], [74.04, 75.1, '3  Diam sejenak'], [75.14, 77.0, '4  Tunggu angka stabil']];
  for (const [a, b, t2] of chips) U += pillAt(tn, a, b, [t2], 250, { bg: '#fff', size: 50 });
  U += pillAt(tn, 69.2, 70.62, ['Cara membaca dengan benar'], 250);
  if (wait > 0.01) U += `<g opacity="${f1(wait * 100) / 100}">${readout(540, 1010, disp.scr, disp.pr, { w: 520, h: 230, big: 100, s: 1, scrCol: tn > 76.2 ? '#7CFFB6' : '#fff' })}${tn > 76.2 ? `<g transform="translate(830 905)">${ico.check(0, 0, 1)}</g>` : ''}</g>`;
  if (still > 0.01) {
    const vv = { amp: 1, t0: -1e9 };
    U += `<g opacity="${f1(still * 100) / 100}">${panel(120, 930, 840, 190, 'Sinyal tenang', 1)}${trace(tn, 160, 960, 760, 120, 'i', COL.ir, { gain: 430, win: 3.2, vv, t0: -1e9 })}</g>`;
  }
  return { A, U };
}
// kecil: alat luar versi sama dengan hook (disalin supaya scenes2 tidak bergantung pada urutan impor)
import { deviceExt as deviceExtX } from './scenes.js';
// ---------------------------------------------------------------- B13 - B14: gejala + perubahan angka, dan cari pertolongan
export function sceneSym(tn) {
  const k = ka(tn, 77.04, 79.15, 0.25);
  const st = rIdle(raka('khawatir', 'netral', { bags: 0.4, sweat: 0.4, yaw: 0.1 }), tn);
  let A = bgDark + `<g opacity="${f1(k * 100) / 100}">${R(40, 520, 480, 560, 'rgba(8,18,30,.8)', 34, 'stroke="rgba(255,255,255,.2)" stroke-width="3"')}${T('Gejala', 280, 580, { size: 44, fill: '#fff' })}<clipPath id="symc"><rect x="60" y="600" width="440" height="330"/></clipPath><g clip-path="url(#symc)">${rk2(st, 280, 590, 0.9, 'rkSym')}</g>${R(70, 950, 200, 70, '#fff', 35)}${T('sesak?', 170, 1000, { size: 38, fill: FOREST })}${R(290, 950, 200, 70, '#fff', 35)}${T('pusing?', 390, 1000, { size: 38, fill: FOREST })}`;
  // kartu perubahan angka: 97 -> 96 -> 94 -> 92
  const vals = [97, 96, 94, 92], t = clamp((tn - 77.5) / 1.3);
  A += `${R(560, 520, 480, 560, 'rgba(8,18,30,.8)', 34, 'stroke="rgba(255,255,255,.2)" stroke-width="3"')}${T('Perubahan angka', 800, 580, { size: 44, fill: '#fff' })}`;
  let pts = ''; vals.forEach((v, i) => { const x = 620 + i * 120, y = 700 + (97 - v) * 40; pts += `${i ? 'L' : 'M'}${x} ${y}`; });
  A += `<path d="${pts}" fill="none" stroke="#7CFFB6" stroke-width="9" stroke-linecap="round" stroke-linejoin="round" stroke-dasharray="${f1(520 * t)} 600"/>${vals.map((v, i) => `<g opacity="${f1(clamp(t * 4 - i * 0.9) * 100) / 100}">${C(620 + i * 120, 700 + (97 - v) * 40, 12, '#fff', `stroke="${INK}" stroke-width="4"`)}${T(String(v), 620 + i * 120, 700 + (97 - v) * 40 - 26, { size: 34, fill: '#fff' })}</g>`).join('')}`;
  A += `${T('dari waktu ke waktu', 800, 1010, { size: 30, fill: '#CFE8E2', w: 700 })}</g>`;
  return { A, U: pillAt(tn, 77.1, 79.1, ['Lihat angka + gejala'], 250, { bg: GOLD, fg: INK }) };
}
export function sceneHelp(tn) {
  const k = ka(tn, 79.1, TL.EDU_END + 0.4, 0.25);
  const st = rIdle(raka('khawatir', 'netral', { bags: 0.5, sweat: 0.8, yaw: 0.15, armR: { wx: 244, wy: 490, ex: 330, ey: 510, finger: 0, front: 1 } }), tn);
  const k1 = pop(tn, 79.3, 0.35), k2 = pop(tn, 81.45, 0.35), k3 = pop(tn, 82.65, 0.35);
  let A = bgDark + `<g opacity="${f1(k * 100) / 100}">${rk2(st, 290, 470, 1.25, 'rkHelp')}${R(-300, 1215, 1700, 900, '#7C5B3C')}${R(-300, 1215, 1700, 26, '#A67C52')}</g>`;
  let U = '';
  const chipAt = (txt, cx, y, o, a) => pill(txt, cx, y, { ...o, a: clamp(a) });
  U += chipAt(['Sesak atau', 'kondisi memburuk'], 740, 540, { size: 46, bg: '#D9382F', fg: '#fff' }, k1 * k);
  if (k2 > 0.01) U += `<g opacity="${f1(Math.min(1, k2) * k * 100) / 100}">${pill(['Menunggu satu angka'], 740, 800, { size: 42, bg: '#fff' })}<path d="M470 858H1010" stroke="#D9382F" stroke-width="10" stroke-linecap="round"/>${ico.cross(1000, 820, 0.7)}</g>`;
  if (k3 > 0.01) U += `<g opacity="${f1(Math.min(1, k3) * k * 100) / 100}" transform="translate(0 ${f1((1 - Math.min(1, k3)) * 40)})">${pill(['Cari pertolongan'], 740, 1040, { size: 50, bg: '#00A383', fg: '#fff' })}${ico.med(470, 1080, 0.9)}</g>`;
  U += `<g opacity="${f1(k1 * k * 100) / 100}"><path d="M740 700V770" stroke="${GOLD}" stroke-width="8" stroke-linecap="round" stroke-dasharray="2 14"/></g>`;
  return { A, U };
}
// ---------------------------------------------------------------- outro: web asli + master suara
export const OUTRO_FRAMES = 455;
const RECT_A = { x: 70, y: 340, w: 940, h: 1156 }, RECT_B = { x: 280, y: 800, w: 520, h: 639 };
export function outroState(t) {
  const to = t - TL.O0, kk = seg(to, 9.0, 9.75, eio);
  const rect = { x: lerp(RECT_A.x, RECT_B.x, kk), y: lerp(RECT_A.y, RECT_B.y, kk), w: lerp(RECT_A.w, RECT_B.w, kk), h: lerp(RECT_A.h, RECT_B.h, kk) };
  return { to, rect, frame: clamp(Math.round(to * 30), 0, OUTRO_FRAMES - 1), cream: kk, kk };
}
export function outroUI(t) {
  const { to, rect, cream, kk } = outroState(t);
  const a = seg(to, 0, 0.35);
  let bg = `<g opacity="${f1(a * 100) / 100}">${R(-10, -10, 1100, 1940, '#0B2F38')}</g>` + `<g opacity="${f1(cream * 100) / 100}">${R(-10, -10, 1100, 1940, '#F7F2E4')}<circle cx="0" cy="1500" r="300" fill="#EAF3E0"/><circle cx="1040" cy="260" r="260" fill="#EAF3E0"/></g>`;
  let u = '';
  // bingkai panel web
  u += `<g opacity="${f1(a * 100) / 100}"><rect x="${f1(rect.x - 8)}" y="${f1(rect.y - 8)}" width="${f1(rect.w + 16)}" height="${f1(rect.h + 16)}" rx="${f1(lerp(28, 22, kk))}" fill="none" stroke="${cream > 0.5 ? FOREST : GOLD}" stroke-width="8"/></g>`;
  const lab = [[5.0, 6.7, 'Materi per bab'], [6.7, 7.75, 'Latihan soal + pembahasan'], [7.75, 9.2, 'Simulasi Dokter']];
  for (const [a0, a1, tx] of lab) { const k = ka(to, a0, a1, 0.25); if (k > 0.01) u += pill([tx], 540, 255 + (1 - eo(clamp((to - a0) / 0.3))) * -40, { a: k, size: 50, bg: '#fff' }); }
  // logo + pesan akhir (ditahan sampai akhir)
  const ke = seg(to, 9.35, 9.95, eo);
  if (ke > 0.01) {
    u += `<g opacity="${f1(ke * 100) / 100}" transform="translate(0 ${f1((1 - ke) * -30)})"><image href="logo-full.webp" x="170" y="290" width="740" height="${f1(740 * 160 / 794)}" preserveAspectRatio="xMidYMid meet"/>${T('Belajar FK gratis di MEDCOEL', 540, 520, { size: 56, fill: FOREST })}${R(250, 590, 580, 128, FOREST, 64)}${T('medcoel.com', 540, 680, { size: 82, fill: GOLD })}</g>`;
  }
  // takarir suara outro (teks master; ejaan nama MEDCOEL)
  const caps = [[1.2, 4.56, 'Masih penasaran? Lanjutkan belajarnya di MEDCOEL.'], [5.06, 8.98, 'Jelajahi materi per bab, latihan soal, dan simulasi dokter.'], [9.54, 11.7, 'Semuanya gratis di medcoel.com.']];
  for (const [a0, a1, tx] of caps) { const k = ka(to, a0, a1, 0.12); if (k > 0.01 && to < 9.4 || (k > 0.01 && a0 > 9)) { const ls = wrapText(tx, 48, 820); const y = a0 > 9 ? 1470 : 1330, h = ls.length * 58 + 30; u += `<g opacity="${f1(k * 100) / 100}">${R(100, y + 6, 880, h, 'rgba(0,0,0,.25)', 30)}${R(100, y, 880, h, 'rgba(8,16,28,.92)', 30)}${ls.map((l, i) => T(l, 540, y + 14 + 42 + i * 58, { size: 48, fill: '#fff' })).join('')}</g>`; } }
  return { bg, u };
}
function wrapText(s, size, maxW) { const words = s.split(' '), lines = []; let cur = ''; for (const w of words) { const t = cur ? cur + ' ' + w : w; if (cur && tw(t, size) > maxW) { lines.push(cur); cur = w; } else cur = t; } if (cur) lines.push(cur); return lines; }
