// Adegan Raka: ruang praktikum (jas lab), kamar kos malam (baju santai), penutup. draw(t) -> { svg, needs? }.
// Raka dipakai langsung dari brand/characters/raka/raka.js (tanpa salinan, tanpa desain ulang).
import { raka, rakaSvg, idle, lerpState, armShape } from '../../../brand/characters/raka/raka.js';
import * as A from './art.js';

const { R, C, E, P, L, T, FLOOR: FL } = A;
export const clamp = (x, a, b) => Math.max(a, Math.min(b, x));
export const lerp = (a, b, t) => a + (b - a) * t;
export const sm = (x) => { x = clamp(x, 0, 1); return x * x * (3 - 2 * x); };
export const eo = (x) => { x = clamp(x, 0, 1); return 1 - Math.pow(1 - x, 3); };
export const eob = (x) => { x = clamp(x, 0, 1); const c1 = 1.70158, c3 = c1 + 1; return 1 + c3 * Math.pow(x - 1, 3) + c1 * Math.pow(x - 1, 2); };
export const win = (t, a, b, f = 0.25) => clamp((t - a) / f, 0, 1) * clamp((b - t) / f, 0, 1);
const f1 = (n) => Math.round(n * 10) / 10;
const clone = (o) => JSON.parse(JSON.stringify(o));
let MEDIA = null; export function setMedia(m) { MEDIA = m; }

function pchip(keys) {
  const n = keys.length, h = [], d = [], m = new Array(n).fill(0);
  for (let i = 0; i < n - 1; i++) { h[i] = keys[i + 1][0] - keys[i][0]; d[i] = (keys[i + 1][1] - keys[i][1]) / h[i]; }
  for (let i = 1; i < n - 1; i++) { if (d[i - 1] * d[i] <= 0) m[i] = 0; else { const w1 = 2 * h[i] + h[i - 1], w2 = h[i] + 2 * h[i - 1]; m[i] = (w1 + w2) / (w1 / d[i - 1] + w2 / d[i]); } }
  m[0] = d[0]; m[n - 1] = d[n - 2];
  return (x) => {
    if (x <= keys[0][0]) return keys[0][1]; if (x >= keys[n - 1][0]) return keys[n - 1][1];
    let i = 0; while (x > keys[i + 1][0]) i++;
    const t = (x - keys[i][0]) / h[i], t2 = t * t, t3 = t2 * t;
    return (2 * t3 - 3 * t2 + 1) * keys[i][1] + (t3 - 2 * t2 + t) * h[i] * m[i] + (-2 * t3 + 3 * t2) * keys[i + 1][1] + (t3 - t2) * h[i] * m[i + 1];
  };
}
export const pchipFn = pchip;
const camFn = (keys) => { const fx = pchip(keys.map((k) => [k[0], k[1]])), fy = pchip(keys.map((k) => [k[0], k[2]])), fs = pchip(keys.map((k) => [k[0], k[3]])); return (t) => [fx(t), fy(t), fs(t)]; };
const CAM = (c, rot = 0, sx = 0, sy = 0) => `translate(${540 + sx} ${960 + sy}) rotate(${rot}) scale(${c[2].toFixed(4)}) translate(${(-c[0]).toFixed(1)} ${(-c[1]).toFixed(1)})`;
function stateAt(keys, t) {
  let i = 0; while (i + 1 < keys.length && t >= keys[i + 1].t) i++;
  if (i === 0) return clone(keys[0].s);
  const k = keys[i], u = sm((t - k.t) / k.d);
  return u >= 1 ? clone(k.s) : lerpState(keys[i - 1].s, k.s, u);
}
// ---------------------------------------------------------------- Raka
const STAND = { legs: { on: 1, dir: 1, L: { dx: 0, lift: 0, kx: 0 }, R: { dx: 0, lift: 0, kx: 0 } } };
const rk = (expr, pose = 'jalan', ov = {}) => raka(expr, pose, { ...STAND, ...ov, legs: { ...STAND.legs, ...(ov.legs || {}) } });
const M = { small: { w: 14, up: 6, lo: 6 }, mid: { w: 12, up: 3, lo: 3 }, flat: { w: 12, up: 0, lo: 0 }, worry: { w: 11, up: -4, lo: -4 }, open: { w: 12, up: -2, lo: 14 }, wow: { w: 13, up: 1, lo: 26 }, smile: { w: 20, up: 11, lo: 11 }, grin: { w: 24, up: 8, lo: 24 }, o: { w: 8, up: -3, lo: 16 }, wavy: { w: 14, up: -2, lo: 4 } };
const BR = (ly, lr, ry, rr) => ({ browL: { y: ly, rot: lr }, browR: { y: ry, rot: rr } });
function RK(s, x, fy, k, o = {}) {
  const st = o.noIdle ? s : idle(s, o.t ?? 0);
  const body = rakaSvg(st, { bare: true, uid: o.uid || 'rk', outfit: o.outfit || 'harian', shadow: o.shadow ?? true, coat: o.coat, coatLong: o.coatLong });
  return `<g transform="translate(${f1(x - 200 * k)} ${f1(fy - 778 * k)}) scale(${k})">${body}</g>`;
}
// lengan menuju titik kanvas (tx, ty) pada Raka berposisi (x, fy) skala k
const reach = (side, tx, ty, x, fy, k, bend = 1) => { const wx = (tx - x) / k + 200, wy = (ty - fy) / k + 778; return { wx, wy, ex: wx + (side === 'R' ? 70 : -70) * bend, ey: wy + 90, finger: 0, front: 1 }; };

// ================================================================ RUANG PRAKTIKUM (0 - 16.42)
const PRX = 800, PRK = 0.92, MODEL_X = 320, MODEL_Y = 1130;
const camP = camFn([[0, 540, 960, 1.0], [2.5, 560, 940, 1.06], [5.2, 600, 930, 1.12], [5.9, 560, 960, 1.05], [7.9, 540, 960, 1.0], [11.8, 600, 930, 1.08], [13.2, 740, 900, 1.35], [14.2, 790, 880, 2.35], [15.9, 790, 880, 2.35], [16.4, 700, 930, 1.5]]);
const thetaFn = pchip([[0, 0], [5.0, 0], [5.8, 0], [7.9, 0], [9.0, 90], [11.3, 92], [12.7, 150], [13.4, 150], [13.9, 40], [14.4, 170], [14.9, 60], [15.4, 200], [15.9, 110], [16.4, 110]]);
const prKeys = [
  { t: 0, d: 0.01, s: rk('berpikir', 'berpikir', { flip: 1, yaw: 0.45, gazeX: 0.8, gazeY: -0.2, mouth: M.mid, sweat: 0.15, ...BR(-3, 8, -3, -8) }) },
  { t: 2.6, d: 0.5, s: rk('berpikir', 'berpikir', { flip: 1, yaw: 0.45, gazeX: 0.8, gazeY: -0.5, wide: 0.3, tilt: 5, mouth: M.small, sweat: 0.2 }) },
  { t: 5.75, d: 0.35, s: rk('senang', 'menunjuk', { flip: 1, yaw: 0.45, gazeX: 0.8, mouth: M.smile, ...BR(-8, 0, -8, 0), happyEyes: 0.3 }) },
  { t: 7.7, d: 0.3, s: rk('netral', 'menunjuk', { flip: 1, yaw: 0.45, gazeX: 0.8, mouth: M.smile, ...BR(-6, 0, -6, 0) }) },
  { t: 9.1, d: 0.5, s: rk('khawatir', 'berpikir', { flip: 1, yaw: 0.45, gazeX: 0.8, mouth: M.worry, sweat: 0.35, ...BR(-5, 10, -5, -10) }) },
  { t: 11.0, d: 0.6, s: rk('bingung', 'berpikir', { flip: 1, yaw: 0.35, gazeX: 0.6, tilt: -6, sweat: 0.7 }) },
  { t: 12.9, d: 0.5, s: rk('bingung', 'kaget', { flip: 1, yaw: 0.2, gazeX: 0.3, tilt: -9, sweat: 1, fxBurst: 0 }) },
  { t: 14.0, d: 0.6, s: rk('bingung', 'kaget', { flip: 1, yaw: 0, gazeX: 0, tilt: -12, sweat: 1, dizzy: 1, mouth: M.wavy, armL: { wx: 90, wy: 420, ex: 70, ey: 520, finger: 0, front: 1 }, armR: { wx: 310, wy: 420, ex: 330, ey: 520, finger: 0, front: 1 } }) },
];
function modelPins(theta, t) {
  const th = theta * Math.PI / 180, ct = Math.cos(th), st = Math.sin(th);
  const pts = [[70, -560, 40, '1'], [-80, -400, 30, '2'], [40, -770, 55, '3']];
  let o = '';
  pts.forEach(([x, y, z, n], i) => { const xp = x * ct + z * st, vis = (-x * st + z * ct) > -20; if (!vis && theta < 100) return; const q = t > 13.4 && t < 16.4; o += A.pin(xp, y - 8, q ? '?' : n, ['#E8665F', '#5BD0E6', '#8E7CE8'][i], 0.95 * clamp((t - 0.9 - i * 0.25) / 0.35, 0, 1)); });
  return o;
}
function praktikum(t) {
  const c = camP(t), th = thetaFn(t);
  const sw = t > 13.4 && t < 16.4 ? Math.sin(t * 14) * 6 : 0;
  let s = stateAt(prKeys, t); s.dizzyT = t * 9; s.sweat = clamp(s.sweat, 0, 1);
  if (t > 13.9) { s.tilt += Math.sin(t * 7) * 5; s.lean += Math.sin(t * 5) * 3; }
  if (t > 2.4 && t < 5.4) { s.armR = reach('R', 800, 780, PRX, FL, PRK); s.armR.finger = 0; s.tilt += Math.sin(t * 6) * 2; } // garuk kepala
  const raka_ = RK(s, PRX, FL, PRK, { t, uid: 'rk', outfit: 'jas', coat: true, coatLong: true });
  const model = `<g transform="translate(${MODEL_X} ${MODEL_Y}) scale(0.78)">${A.skeletonModel(th, { dir: 1 })}${modelPins(th, t)}</g>`;
  let marks = '';
  if (t > 13.4 && t < 16.4) marks = `<g transform="translate(${MODEL_X + 40} 560)">${A.qmarks(t, 3, 150)}</g>`;
  const svg = `<g transform="${CAM(c, sw * 0.15, sw, sw * 0.5)}">${A.labBg(t)}${A.labTable()}${model}${raka_}${marks}</g>`;
  return { svg };
}

// ================================================================ KAMAR KOS (16.42 - 34.6)
const KX = 290, KK = 0.95, KFY = 1470, DESKTOP = 1190;
const BOOK_REST = [660, 1040, 0.8];
const rawAngle = (t) => (t < 19.2 ? 0 : t < 21.78 ? 190 * sm((t - 19.2) / 1.9) : 190 + (Math.min(t, 23.84) - 21.78) * 400 * (1 + 0.15 * Math.sin(Math.min(t, 23.84) * 3)));
const bookAngle = (t) => { const a = rawAngle(t); if (t < 23.84) return a; const end = rawAngle(23.84), tgt = Math.round(end / 360 - 0.2) * 360 + 360 * 0; return lerp(end, Math.ceil(end / 360) * 360, sm((t - 23.84) / 0.8)); };
const BOOK = (t) => {
  let p;
  if (t < 21.78) p = BOOK_REST; else if (t < 23.84) p = [BOOK_REST[0] + Math.sin((t - 21.78) * 3) * 110, BOOK_REST[1] + Math.cos((t - 21.78) * 4.2) * 50, BOOK_REST[2] + 0.08 * Math.sin((t - 21.78) * 5)];
  else { const q = [BOOK_REST[0] + Math.sin(2.06 * 3) * 110, BOOK_REST[1] + Math.cos(2.06 * 4.2) * 50, BOOK_REST[2] + 0.08 * Math.sin(2.06 * 5)]; const u = sm((t - 23.84) / 0.8); p = [lerp(q[0], BOOK_REST[0], u), lerp(q[1], BOOK_REST[1], u), lerp(q[2], BOOK_REST[2], u)]; }
  const out = sm((t - 33.0) / 0.8); return [lerp(p[0], -260, out), lerp(p[1], 1300, out), p[2]];
};
const camK = camFn([[16.4, 540, 1000, 1.0], [17.5, 500, 1000, 1.08], [19.0, 540, 1020, 1.12], [21.6, 560, 1020, 1.12], [22.2, 560, 1000, 1.2], [23.9, 560, 1000, 1.14], [24.4, 540, 880, 1.0], [26.9, 540, 900, 1.05], [28.5, 520, 880, 1.0], [33.0, 560, 930, 1.05], [33.7, 840, 1090, 1.3], [34.1, 860, 1075, 2.3], [34.7, 860, 1072, 4.6]]);
function kosRaka(t) {
  // sikap duduk: tangan memegang buku / laptop
  const bk = BOOK(t);
  const sc = bk[2], handL = reach('L', bk[0] - 170 * sc, bk[1] + 140 * sc, KX, KFY, KK), handR = reach('R', bk[0] + 150 * sc, bk[1] + 150 * sc, KX, KFY, KK);
  const keys = [
    { t: 16.4, d: 0.01, s: rk('bingung', 'jalan', { yaw: 0.35, gazeX: 0.9, gazeY: 0.5, bags: 0.4, sweat: 0.2, mouth: M.small, armL: handL, armR: handR }) },
    { t: 17.0, d: 0.6, s: rk('bingung', 'jalan', { yaw: 0.35, gazeX: 0.9, gazeY: 0.6, tilt: 20, bags: 0.4, sweat: 0.3, mouth: M.wavy, armL: handL, armR: handR }) },
    { t: 19.0, d: 0.5, s: rk('berpikir', 'jalan', { yaw: 0.3, gazeX: 0.9, gazeY: 0.3, tilt: -16, bags: 0.45, sweat: 0.4, armL: handL, armR: handR }) },
    { t: 21.6, d: 0.3, s: rk('kaget', 'jalan', { yaw: 0.3, gazeX: 0.9, tilt: 6, bags: 0.45, sweat: 0.7, armL: handL, armR: handR }) },
    { t: 23.9, d: 0.5, s: rk('sedih', 'jalan', { yaw: 0.2, gazeX: 0.5, gazeY: 0.5, bags: 0.6, sweat: 0.4, mouth: M.worry, armL: reach('L', 330, 1190, KX, KFY, KK), armR: reach('R', 520, 1190, KX, KFY, KK) }) },
    { t: 26.9, d: 0.6, s: rk('berpikir', 'berpikir', { yaw: 0.15, gazeX: 0.4, gazeY: -0.7, tilt: 7, bags: 0.6, sweat: 0.4, ...BR(-5, 11, -5, -11) }) },
    { t: 31.5, d: 0.6, s: rk('bingung', 'berpikir', { yaw: 0.15, gazeX: 0.4, gazeY: -0.8, tilt: -8, bags: 0.65, sweat: 0.8 }) },
    { t: 33.4, d: 0.4, s: rk('lega', 'menunjuk', { yaw: 0.35, gazeX: 0.9, gazeY: 0.2, bags: 0.5, mouth: M.smile, sparkle: 0.5, armR: reach('R', 840, 1170, KX, KFY, KK) }) },
  ];
  let s = stateAt(keys, t);
  if (t > 21.78 && t < 24.0) { const a = (t - 21.78) * 5; s.gazeX = Math.cos(a) * 0.9; s.gazeY = Math.sin(a) * 0.9; s.tilt = Math.sin(a) * 14; s.dizzy = clamp((t - 22.4) / 0.8, 0, 0.8); s.dizzyT = t * 10; }
  return s;
}
function bubbleCloud(x, y, w, h, tail = true) { return `<g transform="translate(${x} ${y})">${E(0, 0, w / 2, h / 2, 'rgba(0,0,0,.18)', 'transform="translate(5 8)"')}${E(0, 0, w / 2, h / 2, '#fff')}${E(-w * 0.32, -h * 0.4, w * 0.24, h * 0.25, '#fff')}${E(w * 0.1, -h * 0.46, w * 0.28, h * 0.24, '#fff')}${E(w * 0.36, -h * 0.28, w * 0.22, h * 0.26, '#fff')}${tail ? C(-w * 0.34, h * 0.62, 22, '#fff') + C(-w * 0.42, h * 0.84, 13, '#fff') : ''}</g>`; }
function kos(t) {
  const c = camK(t); const bk = BOOK(t), ba = bookAngle(t);
  const s = kosRaka(t);
  const shake = t > 21.78 && t < 23.9 ? Math.sin(t * 40) * 4 : 0;
  const rakaG = RK(s, KX, KFY, KK, { t, uid: 'rk', outfit: 'harian', shadow: false });
  const clipId = 'kosClip';
  const book = `<g transform="translate(${f1(bk[0])} ${f1(bk[1])}) scale(${f1(bk[2])})">${A.atlasBook(ba, 1)}</g>`;
  const motion = t > 21.78 && t < 23.9 ? `<g transform="translate(${f1(bk[0])} ${f1(bk[1])})" opacity=".5">${L('M-300 -200A360 360 0 0 1 0 -330M300 200A360 360 0 0 1 0 330', '#fff', 10, 'stroke-dasharray="40 30"')}</g>${[0, 1, 2].map((i) => `<g transform="translate(${f1(bk[0] + Math.cos(t * 3 + i * 2.1) * 330)} ${f1(bk[1] - 130 + Math.sin(t * 4 + i * 2.1) * 90)}) rotate(${f1(Math.sin(t * 6 + i) * 18)})">${T(0, 0, '?', '#F8C038', 76, 'stroke="#172B38" stroke-width="7" paint-order="stroke"')}</g>`).join('')}` : '';
  const notes = `<g transform="translate(320 1160) rotate(-6)">${R(-80, -50, 160, 100, '#FFF9EA', 6)}${L('M-56 -24H56M-56 0H40M-56 22H56', '#B7C6CC', 6)}</g><g transform="translate(980 1180) rotate(8)">${R(-8, -100, 16, 120, '#E8665F', 8)}${R(-8, -112, 16, 20, '#F8C038', 8)}</g>`;
  // laptop terbuka di kanan meja (layar menyala saat 33.4+)
  const lp = clamp((t - 33.0) / 0.5, 0, 1);
  const lapScreen = lp > 0 ? `<g transform="translate(0 0)">${R(-190, -214, 380, 192, '#0A3830', 8)}${T(0, -108, 'MEDCOEL', '#9DE0BD', 54)}${E(0, -60, 70, 8, 'rgba(255,255,255,.12)')}</g>` : '';
  const laptop_ = `<g transform="translate(860 ${DESKTOP})">${A.laptop(lp > 0 ? 1 : 0.92, lp > 0 ? '#0A3830' : '#1B2A3A', '')}${lapScreen}</g>`;
  const thought = (t >= 24.3 && t < 27.2) ? 'bulb' : (t >= 26.86 && t < 33.7) ? 'layers' : null;
  let tb = '';
  if (thought === 'bulb') {
    const u = t - 24.3, wob = Math.sin(u * 3) * 18, px = 520 + Math.sin(u * 1.6) * 150, py = 440;
    const pop = eob(u / 0.4);
    tb = `<g transform="translate(0 0) scale(1)" opacity="${clamp(u / 0.2, 0, 1) * clamp((27.2 - t) / 0.35, 0, 1)}">${bubbleCloud(560, 520, 800, 520)}`
      + `<path d="M170 650C320 600 380 450 540 520C700 590 760 420 940 470" fill="none" stroke="#B7C6CC" stroke-width="8" stroke-dasharray="3 22" stroke-linecap="round"/>`
      + `<g transform="translate(${f1(px)} ${f1(py + wob * 0.2)}) scale(${(0.85 * pop).toFixed(3)}) rotate(${f1(Math.sin(u * 2.4) * 8)})">${A.bulb(t)}</g>`
      + `<g transform="translate(850 620)">${L('M0 40V-90', '#8A5A34', 10)}${R(-70, -150, 150, 56, '#F8C038', 10)}${T(5, -112, 'PULANG', '#172B38', 28)}${P('M-70 -122l-34 -0l20 -22z', '#F8C038')}</g>`
      + `<g transform="translate(${f1(px + 60)} ${f1(py - 100)})">${A.qmarks(t, 2, 60)}</g>`
      + T(560, 720, 'PEMAHAMAN', '#8A9AA3', 30) + `</g>`;
  } else if (thought === 'layers') {
    const u = t - 26.86;
    tb = `<g opacity="${clamp(u / 0.35, 0, 1) * clamp((33.7 - t) / 0.35, 0, 1)}">${bubbleCloud(580, 470, 860, 640)}<g transform="translate(580 500) scale(${(0.82 * eob(u / 0.5)).toFixed(3)})">${A.layersBody(t, 1)}</g><g transform="translate(580 300)">${A.qmarks(t * 0.8, 3, 230)}</g></g>`;
  }
  const svg = `<g transform="${CAM(c, 0, shake, shake)}">${A.kosBg(t)}${A.lampCone(t)}${A.lamp()}${R(-100, 1190, 1280, 34, '#B3744A', 8)}${rakaG}${R(-100, 1224, 1280, 220, '#8A5A34')}${R(40, 1224, 380, 150, '#7A4D2C', 10)}${notes}${laptop_}${book}${motion}${tb}</g>`;
  return { svg };
}

// ================================================================ PENUTUP KOS: memutar model lewat layar (56.9 - 61.4)
function tutupKos(t) {
  const u = t - 56.9;
  const c = camFn([[56.9, 600, 1010, 1.2], [58.5, 580, 1030, 1.18], [61.4, 560, 1000, 1.06]])(t);
  const s0 = rk('lega', 'jalan', { yaw: 0.3, gazeX: 0.8, gazeY: 0.1, bags: 0, mouth: M.smile, sparkle: 0.7, tilt: 0, armR: reach('R', 840, 1190, KX + 30, KFY, KK), armL: { wx: 118, wy: 566, ex: 84, ey: 500, finger: 0, front: 1 } });
  s0.happyEyes = 0.5 * sm((t - 58) / 0.8);
  const rakaG = RK(s0, KX + 30, KFY, KK, { t, uid: 'rk', outfit: 'harian', shadow: false });
  const frames = MEDIA.skel || []; let img = '';
  if (frames.length) { const i = Math.floor(Math.max(0, u) * 30) % frames.length; img = `<clipPath id="lsc"><rect x="-190" y="-214" width="380" height="192" rx="8"/></clipPath><g clip-path="url(#lsc)">${R(-190, -214, 380, 192, '#0F4F47')}<image href="${frames[i]}" x="-92" y="-232" width="184" height="438" preserveAspectRatio="xMidYMid slice"/></g>`; }
  const lap = `<g transform="translate(770 1190) scale(1.3)">${A.laptop(1, '#0A3830', '')}${img}</g>`;
  const house = `<g transform="translate(250 650)">${bubbleCloud(0, 0, 340, 230, false)}<g transform="translate(0 20) scale(.5)">${A.bulb(t * 0.5)}</g>${T(0, 118, 'sudah pulang', '#007060', 26)}</g>`;
  const svg = `<g transform="${CAM(c)}">${A.kosBg(t)}${A.lampCone(t)}${A.lamp()}${R(-100, 1190, 1280, 34, '#B3744A', 8)}${rakaG}${R(-100, 1224, 1280, 220, '#8A5A34')}${R(40, 1224, 380, 150, '#7A4D2C', 10)}${lap}${house}</g>`;
  return { svg, needs: img ? [frames[Math.floor(Math.max(0, u) * 30) % frames.length]] : [] };
}

// ================================================================ PENUTUP (61.4 - akhir)
let KORI = null; export function setKori(r, pose) { KORI = { r, pose }; }
function outro(t) {
  const u = t - 61.3;
  let svg = `<defs><linearGradient id="og" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#DDF5EA"/><stop offset="1" stop-color="#F7F2E4"/></linearGradient></defs>${R(-100, -100, 1300, 2200, 'url(#og)')}`;
  for (let i = 0; i < 6; i++) svg += `<path d="M540 760L${(-300 + i * 340)} -100L${(-100 + i * 340)} -100Z" fill="#fff" opacity="${(0.28 + 0.1 * Math.sin(t * 0.9 + i)).toFixed(2)}"/>`;
  svg += R(-100, 1330, 1300, 700, '#9DE0BD') + R(-100, 1330, 1300, 14, '#7FCBA3');
  const keys = [{ t: 61.3, d: 0.01, s: rk('lega', 'jalan', { yaw: 0.2, mouth: M.smile }) }, { t: 62.2, d: 0.4, s: rk('senang', 'sapa', { yaw: 0.2, happyEyes: 1 }) }];
  const s = stateAt(keys, t); if (t > 62.6) s.armR = { wx: 340 + Math.sin(t * 9) * 14, wy: 318, ex: 350, ey: 404, finger: 0, front: 1 };
  s.sparkle = 0.5 + 0.3 * Math.sin(t * 5);
  svg += RK(s, 300, FL + 4, 0.8, { t, uid: 'rk', outfit: 'harian' });
  if (KORI) { KORI.pose(KORI.r, { t, mood: 'happy', env: 0, wave: t > 62.4 ? 1 : 0, phase: 0.5 }); const ks = lerp(1.2, 1.78, eob((t - 61.7) / 0.5)), ka = clamp((t - 61.6) / 0.2, 0, 1); svg += `<g transform="translate(${f1(800 - 160 * ks)} ${f1(1336 - 290 * ks)}) scale(${ks.toFixed(3)})" opacity="${ka}">${KORI.r.root.outerHTML}</g>`; }
  return { svg };
}

// ================================================================ daftar adegan (Raka)
export const SCENES = [
  { id: 'praktikum', t0: 0, t1: 16.42, draw: praktikum },
  { id: 'kos', t0: 16.42, t1: 34.8, draw: kos, tr: { type: 'whip', d: 0.35 } },
  { id: 'tutup', t0: 56.7, t1: 61.4, draw: tutupKos },
  { id: 'outro', t0: 61.3, t1: 70, draw: outro, tr: { type: 'iris', d: 0.5, cx: 540, cy: 900 } },
];
