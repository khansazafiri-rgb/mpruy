// Adegan video "Kena gas air mata saat demo?". Setiap adegan: draw(t) -> { svg, ui, post }.
//   svg  = isi dunia (kamera sudah di dalamnya), koordinat kanvas 1080 x 1920
//   ui   = kartu dan teks di atas dunia (tidak ikut kamera)
//   post = { sat, bright } filter global (mis. beku-bingkai)
// Raka dipakai dari brand/characters/raka/raka.js tanpa salinan: pakaian 'demo' di jalan, 'harian' di rumah/akhir.
import { raka, rakaSvg, idle, lerpState, walkCycle, armShape } from '../../../brand/characters/raka/raka.js';
import { teman, temanSvg, idleTeman } from './teman.js';
import * as W from './world3.js';

const { R, C, P, L, T, FONT, FLOOR: FL } = W;
export const clamp = (x, a, b) => Math.max(a, Math.min(b, x));
export const lerp = (a, b, t) => a + (b - a) * t;
export const sm = (x) => { x = clamp(x, 0, 1); return x * x * (3 - 2 * x); };
export const eo = (x) => { x = clamp(x, 0, 1); return 1 - Math.pow(1 - x, 3); };
export const eob = (x) => { x = clamp(x, 0, 1); const c1 = 1.70158, c3 = c1 + 1; return 1 + c3 * Math.pow(x - 1, 3) + c1 * Math.pow(x - 1, 2); };
export const win = (t, a, b, f = 0.25) => clamp((t - a) / f, 0, 1) * clamp((b - t) / f, 0, 1);
const f1 = (n) => Math.round(n * 10) / 10;
export const clone = (o) => JSON.parse(JSON.stringify(o));
let DATA = null;
export function setData(d) { DATA = d; }
// waktu mulai/akhir kata ke-i pada baris id
export const wd = (id, i, e = 's') => { const l = DATA.lines.find((x) => x.id === id); return l.words[Math.min(i, l.words.length - 1)][e]; };
export const ln = (id, e = 't0') => DATA.lines.find((x) => x.id === id)[e];

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
// kamera dari kunci [t, cx, cy, s]
function camFn(keys) {
  const fx = pchip(keys.map((k) => [k[0], k[1]])), fy = pchip(keys.map((k) => [k[0], k[2]])), fs = pchip(keys.map((k) => [k[0], k[3]]));
  return (t) => [fx(t), fy(t), fs(t)];
}
const CAM = (c, rot = 0, sx = 0, sy = 0) => `translate(${540 + sx} ${960 + sy}) rotate(${rot}) scale(${c[2].toFixed(4)}) translate(${(-c[0]).toFixed(1)} ${(-c[1]).toFixed(1)})`;
function stateAt(keys, t) { // keys: [{t, d, s}]; lerpState antar kunci dengan sm
  let i = 0; while (i + 1 < keys.length && t >= keys[i + 1].t) i++;
  if (i === 0) return clone(keys[0].s);
  const k = keys[i], u = sm((t - k.t) / k.d);
  return u >= 1 ? clone(k.s) : lerpState(keys[i - 1].s, k.s, u);
}

// ---------------------------------------------------------------- Raka
const STAND = { legs: { on: 1, dir: 1, L: { dx: 0, lift: 0, kx: 0 }, R: { dx: 0, lift: 0, kx: 0 } } };
export const rk = (expr, pose = 'jalan', ov = {}) => raka(expr, pose, { ...STAND, ...ov, legs: { ...STAND.legs, ...(ov.legs || {}) } });
const M = { smile: { w: 20, up: 11, lo: 11 }, small: { w: 14, up: 6, lo: 6 }, mid: { w: 12, up: 3, lo: 3 }, flat: { w: 12, up: 0, lo: 0 }, worry: { w: 11, up: -4, lo: -4 }, open: { w: 12, up: -2, lo: 14 }, wow: { w: 13, up: 1, lo: 26 }, o: { w: 8, up: -3, lo: 16 } };
const BR = (ly, lr, ry, rr) => ({ browL: { y: ly, rot: lr }, browR: { y: ry, rot: rr } });
const ARM = { // lengan: pergelangan (wx, wy), siku (ex, ey)
  rest: { armL: { wx: 118, wy: 566, ex: 84, ey: 500, finger: 0, front: 1 }, armR: { wx: 282, wy: 566, ex: 316, ey: 500, finger: 0, front: 1 } },
  guard: { armL: { wx: 142, wy: 500, ex: 70, ey: 520, finger: 0, front: 1 }, armR: { wx: 258, wy: 500, ex: 330, ey: 520, finger: 0, front: 1 } },
  mouth: { armR: { wx: 226, wy: 336, ex: 322, ey: 400, finger: 0, front: 1 }, armL: { wx: 100, wy: 560, ex: 94, ey: 494, finger: 0, front: 0 } },
  eye: { armR: { wx: 258, wy: 272, ex: 332, ey: 360, finger: 0, front: 1 } },
};
// posisi kanvas titik (v) pada Raka yang digambar di (x, fy) skala k
const rpt = (v, x, fy, k, bob = 0) => [x + (v[0] - 200) * k, fy + (v[1] + bob - 778) * k];
function RK(s, x, fy, k, o = {}) {
  const st = o.noIdle ? s : idle(s, o.t ?? 0);
  const body = rakaSvg(st, { bare: true, uid: o.uid || 'rk', outfit: o.outfit || 'demo', shadow: o.shadow ?? true, dark: o.dark, coat: o.coat, logo: o.logo });
  return `<g transform="translate(${f1(x - 200 * k)} ${f1(fy - 778 * k)}) scale(${k})">${body}</g>`;
}
// kaki dasar teman (tidak ada di teman.js): satu bentuk celana yang menyatu dengan pinggang
const FRIEND_LEGS = `<path d="M130 566L194 566L190 736L134 736Z" fill="#2E3744" stroke="#2E3744" stroke-width="12" stroke-linejoin="round"/><path d="M206 566L270 566L266 736L210 736Z" fill="#2E3744" stroke="#2E3744" stroke-width="12" stroke-linejoin="round"/><path d="M88 778C82 750 112 734 152 736L190 738C202 752 200 778 188 778Z" fill="#1F2429"/><path d="M312 778C318 750 288 734 248 736L210 738C198 752 200 778 212 778Z" fill="#1F2429"/>`;
function FR(s, x, fy, k, o = {}) {
  return `<g transform="translate(${f1(x - 200 * k)} ${f1(fy - 778 * k)}) scale(${k})">${FRIEND_LEGS}${temanSvg(idleTeman(s, o.t ?? 0, 0.8), { bare: true, uid: o.uid || 'tm' })}</g>`;
}

// ---------------------------------------------------------------- jalan: kecepatan -> pan, fase
const GAIT = 0.9; // siklus langkah per detik
const speedF = (t) => 1 - sm((t - 6.5) / 0.45);
const STEP = 1 / 60, TAB = [0];
for (let i = 1; i <= 720; i++) TAB.push(TAB[i - 1] + speedF(i * STEP) * STEP);
const integ = (t) => { const x = clamp(t, 0, 11.9) / STEP, i = Math.floor(x), f = x - i; return TAB[i] * (1 - f) + TAB[Math.min(i + 1, TAB.length - 1)] * f; };
const groundSpeed = (k) => 136 * GAIT * k; // px/detik agar kaki tidak meluncur

// ================================================================ ADEGAN 1: jalan demo (0 - 14.26)
const KS = 0.7, RX = 470;
const streetCam = camFn([[0, RX, 960, 2.5], [1.5, RX + 20, 985, 1.55], [2.8, 520, 1010, 1.08], [4.3, 520, 1015, 1.0], [6.3, 560, 1015, 1.06], [6.95, 600, 1060, 1.15], [7.5, 620, 1100, 1.22], [7.8, 650, 1150, 1.38], [8.35, 580, 1060, 1.12], [9.3, 500, 990, 1.25], [9.9, 470, 960, 1.55], [10.5, 470, 955, 2.55], [12.5, 470, 955, 2.7], [14.26, 470, 955, 2.95]]);
const faceKeys = [
  { t: 0, d: 0.01, s: rk('khawatir', 'jalan', { ...BR(-4, 10, -4, -10), mouth: M.small, yaw: 0.45, gazeX: 0.5, gazeY: -0.1, sweat: 0.3 }) },
  { t: 1.4, d: 0.4, s: rk('khawatir', 'jalan', { ...BR(-6, 12, -6, -12), mouth: M.mid, yaw: 0.2, gazeX: -0.6, gazeY: -0.2, sweat: 0.4 }) },
  { t: 2.6, d: 0.4, s: rk('khawatir', 'jalan', { ...BR(-7, 12, -7, -12), mouth: M.small, wide: 0.5, yaw: 0.45, gazeX: 0.7, gazeY: -0.5, sweat: 0.5 }) },
  { t: 4.4, d: 0.5, s: rk('khawatir', 'jalan', { ...BR(-5, 9, -5, -9), mouth: M.mid, yaw: 0.45, gazeX: 0.6, sweat: 0.5 }) },
  { t: 6.3, d: 0.3, s: rk('khawatir', 'jalan', { ...BR(-9, 12, -9, -12), mouth: M.small, wide: 0.7, yaw: 0.5, gazeX: 0.9, gazeY: -0.9, sweat: 0.6 }) },
  { t: 7.85, d: 0.16, s: rk('kaget', 'kaget', { yaw: 0.35, gazeX: 0.9, gazeY: -0.3, fxBurst: 1, sweat: 0.8, legs: { dir: 1 } }) },
  { t: 8.5, d: 0.4, s: rk('khawatir', 'berhenti', { ...BR(-4, 12, -4, -12), mouth: M.o, wide: 0.5, yaw: 0.45, gazeX: 0.7, blink: 0.3, sweat: 1, tears: 0.3 }) },
  { t: 9.2, d: 0.4, s: rk('perih', 'batuk', { yaw: 0.35, tears: 0.7, sweat: 1, ...ARM.mouth }) },
  { t: 10.2, d: 0.35, s: rk('perih', 'usap_mata', { yaw: 0.2, tears: 1, sweat: 1 }) },
  { t: 11.9, d: 0.4, s: rk('perih', 'usap_mata', { yaw: 0.1, tears: 1, sweat: 1, blink: 0.88 }) },
  { t: 12.75, d: 0.18, s: rk('batuk', 'batuk', { yaw: 0.2, tears: 0.9, sweat: 1 }) },
];
function streetRaka(t) {
  const sf = speedF(t), ph = GAIT * integ(t);
  const F = stateAt(faceKeys, t);
  const wc = walkCycle(ph, { dir: 1 });
  const Wk = clone(F); Wk.legs = wc.legs; Wk.armL = wc.armL; Wk.armR = wc.armR; Wk.bob = wc.bob; Wk.lean = wc.lean;
  let s = sf > 0.001 ? lerpState(F, Wk, sf) : F;
  s.tearsT = t * 1.5;
  if (t > 12.75) { const q = Math.sin((t - 12.75) * 26); s.bob += q * 4; s.tilt += q * 2; s.lean += Math.max(0, q) * 2; }
  if (t > 10.2 && t < 12.7) { const rub = Math.sin(t * 9) * 5; s.armR.wx += rub; s.armR.wy += Math.cos(t * 9) * 3; }
  return s;
}
function street(t) {
  const k = KS, g = groundSpeed(k), pan = -g * integ(t), sf = speedF(t);
  const c = streetCam(t);
  const tPan = 7.9;
  const landT = 7.78;
  const fog = clamp((t - landT) / 3.5, 0, 1);
  const bgBlur = clamp((t - wd('K05', 3, 's') + 0.2) / 0.9, 0, 1) * (1 - clamp((t - 13.6) / 0.6, 0, 1)) * 8;
  let shake = 0; if (t > landT && t < landT + 0.4) shake = Math.sin(t * 120) * 9 * (1 - (t - landT) / 0.4);
  if (t > 0 && t < 1.2) shake += Math.sin(t * 60) * 2.5 * (1 - t / 1.2);
  const haze = 0.12 + 0.15 * clamp(t / 6, 0, 1) + 0.5 * fog;
  const bg = `<g style="filter:blur(${bgBlur.toFixed(2)}px)">${W.streetBg(t, { pan, haze })}${W.crowdBack(t, { pan, walkF: sf, panic: 1, tPanic: tPan, n: 44 })}</g>`;
  const rakaG = RK(streetRaka(t), RX, FL, k, { t, uid: 'rk' });
  const canister = W.canisterSvg(t, 6.95, landT, [-120, 760], [760, 1290]);
  const fw = 0.62 * (1 - 0.9 * sm((t - 8.6) / 0.7)); // asap di depan Raka menipis saat close-up supaya wajah terlihat
  const smokeA = W.smokeSvg(t, landT, 760, 1250, 1.9, 0.92 * fw, 1), smokeB = W.smokeSvg(t, landT + 0.25, 520, 1280, 1.6, 0.9 * fw, 5), smokeC = W.smokeSvg(t, landT + 0.7, 900, 1180, 1.7, 0.85, 9);
  const smokeBack = W.smokeSvg(t, landT + 0.1, 640, 1160, 2.2, 0.8, 13);
  const front = `<g style="filter:blur(${(bgBlur * 0.5).toFixed(2)}px)">${W.crowdFront(t, { pan, walkF: sf, avoid: [RX, 210], panic: 1, tPanic: tPan, n: 32 })}</g>`;
  const cough = t > 12.75 ? 1 : 0;
  const dust = fog > 0.01 ? R(-400, 600, 1900, 900, `rgba(226,218,198,${(0.4 * fog).toFixed(3)})`) : '';
  const svg = `<g transform="${CAM(c, 0, shake, shake * 0.6)}">${bg}${canister}${smokeBack}${dust}${smokeC}${rakaG}${smokeB}${front}${smokeA}</g>`;
  return { svg, ui: '', post: {} };
}

// ================================================================ ADEGAN 2: odol (14.26 - 26.28)
const OX = 720, OK = 0.8, FX = 200; // posisi Raka dan teman
const odolCam = camFn([[14.26, 540, 1000, 1.0], [15.3, 560, 1000, 1.06], [16.0, 380, 1010, 1.5], [17.0, 335, 1010, 2.3], [17.5, 380, 1020, 2.2], [18.2, 610, 990, 1.7], [18.8, 650, 960, 1.55], [20.9, 660, 900, 1.5], [23.9, 670, 880, 1.78], [24.2, 640, 940, 1.45], [26.28, 630, 960, 1.3]]);
function odol(t) {
  const FZ = 20.95, ZE = 23.92; // beku bingkai
  const tt = t < FZ ? t : (t < ZE ? FZ : FZ + (t - ZE)); // waktu animasi dunia
  const c = odolCam(t);
  // teman masuk dari kanan 14.4-15.4
  const fx = lerp(-350, FX, eo((tt - 14.35) / 1.0));
  const fExit = clamp((tt - 25.3) / 0.7, 0, 1); // mundur sedikit setelah ragu
  // tabung: di tangan teman -> tangan Raka
  const give = sm((tt - 17.35) / 0.55);
  // Raka
  const base = [
    { t: 0, d: 0.01, s: rk('perih', 'usap_mata', { yaw: 0.3, tears: 1, sweat: 1, ...ARM.guard }) },
    { t: 14.8, d: 0.35, s: rk('batuk', 'batuk', { yaw: 0.45, tears: 0.9, sweat: 1 }) },
    { t: 15.6, d: 0.35, s: rk('perih', 'jalan', { yaw: 0.6, gazeX: 0.9, tears: 1, sweat: 1, ...ARM.guard, armL: { wx: 142, wy: 500, ex: 70, ey: 520, finger: 0, front: 1 } }) },
    { t: 17.0, d: 0.35, s: rk('perih', 'jalan', { yaw: 0.5, gazeX: 0.9, tears: 1, blink: 0.7, sweat: 1, armL: { wx: 118, wy: 470, ex: 60, ey: 510, finger: 0, front: 1 } }) },
    { t: 17.5, d: 0.4, s: rk('perih', 'jalan', { yaw: 0.5, gazeX: 0.9, tears: 1, blink: 0.7, sweat: 1, armR: { wx: 258, wy: 420, ex: 320, ey: 470, finger: 0, front: 1 }, armL: { wx: 150, wy: 440, ex: 90, ey: 480, finger: 0, front: 1 } }) },
    { t: 19.0, d: 0.45, s: rk('perih', 'jalan', { yaw: 0.25, gazeX: 0.2, tears: 1, blink: 0.78, sweat: 1, armR: { wx: 262, wy: 308, ex: 332, ey: 386, finger: 0.55, fa: -100, front: 1 }, armL: { wx: 150, wy: 452, ex: 92, ey: 486, finger: 0, front: 1 } }) },
    { t: 20.0, d: 0.5, s: rk('perih', 'jalan', { yaw: 0.2, gazeX: 0.1, tears: 1, blink: 0.55, sweat: 1, armR: { wx: 262, wy: 296, ex: 336, ey: 380, finger: 0.55, fa: -104, front: 1 }, armL: { wx: 150, wy: 452, ex: 92, ey: 486, finger: 0, front: 1 } }) },
    { t: ZE - 0.01 + 0.0, d: 0.01, s: rk('perih', 'jalan', { yaw: 0.2, gazeX: 0.1, tears: 1, blink: 0.55, sweat: 1, armR: { wx: 262, wy: 296, ex: 336, ey: 380, finger: 0.55, fa: -104, front: 1 }, armL: { wx: 150, wy: 452, ex: 92, ey: 486, finger: 0, front: 1 } }) },
    { t: 24.0, d: 0.3, s: rk('khawatir', 'jalan', { ...BR(-10, 13, -10, -13), mouth: M.o, wide: 0.9, yaw: 0.0, gazeX: 0, gazeY: 0.2, tears: 1, sweat: 1, armR: { wx: 300, wy: 400, ex: 350, ey: 450, finger: 0, front: 1 }, armL: { wx: 150, wy: 452, ex: 92, ey: 486, finger: 0, front: 1 } }) },
  ];
  // Raka menghadap teman (kiri layar)
  // waktu untuk pergerakan keadaan Raka mengikuti tt (beku saat tt berhenti)
  const key = t < FZ ? t : (t < ZE ? FZ : ZE - 0.01 + (t - ZE));
  let s = stateAt(base.map((b) => ({ ...b, t: b.t >= 23.9 && b.t < 24.1 ? 24.0 : b.t })), key);
  if (t >= 20.0 && t < ZE) { /* beku */ }
  // bibir bergerak sedikit saat mendesis perih
  s.yaw = -Math.abs(s.yaw) - 0.1; s.gazeX = -Math.abs(s.gazeX);
  s.tearsT = tt * 1.4;
  const frozen = t >= FZ && t < ZE;
  const rakaG = RK(s, OX, FL, OK, { t: frozen ? FZ : tt, uid: 'rk' });
  // teman
  let fs = teman('heran', 'duduk', { yaw: 0.35, gazeX: 0.8, lid: 0.1 });
  // lengan menjulur ke Raka (sisi layar kiri teman): setelah flip, armR tampil di kiri
  const reach = sm((tt - 15.0) / 0.5) * (1 - give);
  fs.armR = { wx: lerp(250, 340, reach), wy: lerp(536, 456, reach), ex: lerp(308, 290, reach), ey: lerp(500, 522, reach), finger: 0, front: 1 };
  fs.armL = { wx: 150, wy: 536, ex: 92, ey: 500, finger: 0, front: 0 };
  const friendG = FR(fs, fx - fExit * 200, FL, 0.82, { t: tt, uid: 'tm' });
  // posisi tabung
  const handF = armShape('R', fs.armR).hand; // pada tubuh teman (sebelum flip): flip x
  const fK = 0.82, fxx = fx - fExit * 200;
  const hFx = fxx + (handF[0] - 200) * fK, hFy = FL + (handF[1] - 778) * fK;
  const rS = s; const handR = armShape('L', rS.armL).hand;
  const hRx = OX + (handR[0] - 200) * OK, hRy = FL + (handR[1] + rS.bob - 778) * OK;
  const tx = lerp(hFx - 6, hRx, give), ty = lerp(hFy - 50, hRy - 40, give);
  const tubeShown = tt > 15.2 && t < 26.28;
  const tubeBob = Math.sin(tt * 5) * 3 * (1 - give);
  const tubeG = tubeShown ? W.tubeSvg(tx, ty + tubeBob, 0.46, lerp(12, -12, give), 0) : '';
  // oles di ujung jari (belum menyentuh)
  const hR2 = armShape('R', s.armR).hand;
  const dabOn = t >= 19.1;
  const fa = (s.armR.fa ?? -100) * Math.PI / 180;
  const tip = rpt([hR2[0] + Math.cos(fa) * (12 + 52 * s.armR.finger), hR2[1] + Math.sin(fa) * (12 + 52 * s.armR.finger)], OX, FL, OK, s.bob);
  const dab = dabOn ? `<g transform="translate(${f1(tip[0])} ${f1(tip[1])})">${C(0, 0, 11, '#fff')}${C(-3, -3, 4, '#EAF4F2')}</g>` : '';
  // tanda tanya beku
  const qm = win(t, FZ + 0.1, ZE + 0.1, 0.25);
  let qs = '';
  if (qm > 0.01) {
    const qk = eob((t - FZ - 0.1) / 0.45);
    qs = `<g opacity="${qm}">` + [[-190, -630, 0.62, -14], [190, -610, 0.7, 12], [0, -735, 0.5, 4]].map(([dx, dy, sc, r], i) => `<g transform="translate(${f1(OX + dx)} ${f1(FL + dy + Math.sin((t - FZ) * 3 + i) * 8)}) rotate(${r}) scale(${(sc * clamp(qk, 0, 1.1)).toFixed(3)})">${T(0, 0, '?', '#F8C038', 200, 'stroke="#172B38" stroke-width="10" paint-order="stroke"')}</g>`).join('') + `</g>`;
  }
  // retak/seruan setelah beku
  const crack = t >= ZE ? clamp((t - ZE) / 0.25, 0, 1) : 0;
  const warn = crack ? `<g opacity="${crack}" transform="translate(${OX + 190} ${FL - 480}) scale(${(0.8 + 0.4 * eob((t - ZE) / 0.3)).toFixed(3)}) rotate(8)">${T(0, 0, '!', '#E8665F', 240, 'stroke="#fff" stroke-width="12" paint-order="stroke"')}</g>` : '';
  const shake = t >= ZE && t < ZE + 0.35 ? Math.sin(t * 100) * 6 * (1 - (t - ZE) / 0.35) : 0;
  // latar kabur kota berasap
  const pan = -34 * (tt - 14.26);
  const bg = `<g style="filter:blur(3px)">${W.streetBg(tt, { pan: -600 + pan * 0.4, haze: 0.75 })}${W.crowdBack(tt, { pan: -600 + pan * 0.4, walkF: 0.4, avoid: [OX, 150], n: 24 })}</g>`;
  const smoke = W.smokeSvg(99, 0, 540, 1250, 2.2, 0.28, 3);
  const svg = `<g transform="${CAM(c, 0, shake, 0)}">${bg}${R(-400, 800, 1900, 700, 'rgba(226,218,198,.3)')}${smoke}${friendG}${rakaG}${tubeG}${dab}${qs}${warn}</g>`;
  // UI: pita "pause" saat beku
  const pw = win(t, FZ, ZE, 0.2);
  const ui = pw > 0.01 ? `<g opacity="${pw}" transform="translate(120 330)"><circle r="46" fill="rgba(10,56,48,.88)"/><rect x="-16" y="-20" width="12" height="40" rx="4" fill="#fff"/><rect x="6" y="-20" width="12" height="40" rx="4" fill="#fff"/></g>` : '';
  return { svg, ui, post: { sat: t >= FZ && t < ZE ? 0.55 : 1 } };
}


// ---------------------------------------------------------------- bantu umum
const chip = (x, y, w, h, bg, txt, fg, fs, o = {}) => `<g transform="translate(${x} ${y})">${R(-w / 2, -h / 2 + 7, w, h, 'rgba(10,56,48,.26)', h / 2)}${R(-w / 2, -h / 2, w, h, bg, h / 2)}${T(0, fs * 0.36, txt, fg, fs)}</g>`;
const gx = (x, y, s, a, inner, r = 0) => (a > 0.005 ? `<g transform="translate(${f1(x)} ${f1(y)}) rotate(${f1(r)}) scale(${s.toFixed(3)})" opacity="${clamp(a, 0, 1).toFixed(3)}">${inner}</g>` : '');
const makeInteg = (fn, t0, t1) => { const n = Math.ceil((t1 - t0) / STEP), tab = [0]; for (let i = 1; i <= n; i++) tab.push(tab[i - 1] + fn(t0 + i * STEP) * STEP); return (t) => { const x = clamp(t - t0, 0, t1 - t0) / STEP, i = Math.floor(x), f = x - i; return tab[i] * (1 - f) + tab[Math.min(i + 1, n)] * f; }; };
const rnd = (i, k = 1) => { const x = Math.sin(i * 127.1 + k * 311.7) * 43758.5453; return x - Math.floor(x); };
const goo = (x, y, r, a = 1) => C(x, y, r, '#CDBF9A', `opacity="${a.toFixed(2)}"`); // butiran iritan
let KORI = null;
export function setKori(r, pose) { KORI = { r, pose }; }

// ================================================================ ADEGAN 3: tidak terbukti (26.28 - 35.97)
const TEAL_BG = (t, a = '#0F4F47', b = '#0A3830') => `<defs><linearGradient id="tg" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="${a}"/><stop offset="1" stop-color="${b}"/></linearGradient></defs>${R(-100, -100, 1300, 2200, 'url(#tg)')}` + [0, 1, 2, 3, 4, 5].map((i) => C(((rnd(i, 1) * 1300 + t * (6 + i * 3)) % 1300) - 100, 300 + rnd(i, 2) * 1100, 90 + rnd(i, 3) * 120, 'rgba(255,255,255,.05)')).join('');
function tidakTerbukti(t) { // E1 -> E2 dengan pudar cepat agar tidak ada potongan kasar
  if (t >= 30.74 && t < 31.04) { const A = tidakPart(t, 1), B = tidakPart(t, 2), k = sm((t - 30.74) / 0.3); return { svg: `<g>${A.svg}</g><g opacity="${k.toFixed(3)}">${B.svg}</g>`, ui: `<g opacity="${(1 - k).toFixed(3)}">${A.ui}</g><g opacity="${k.toFixed(3)}">${B.ui}</g>`, post: {} }; }
  return tidakPart(t, 0);
}
function tidakPart(t, mode) {
  let svg = '', ui = '';
  if (mode === 1 || (mode === 0 && t < 30.74)) {
    const u = t - 26.28;
    svg += TEAL_BG(t);
    // tabung, mata, tanda larangan
    const tubeIn = eob(u / 0.45);
    svg += gx(290, 960, 1.55 * tubeIn, tubeIn, W.tubeSvg(0, Math.sin(t * 3) * 6, 1.0, -8 + Math.sin(t * 2) * 3, 0));
    const eyeA = clamp((u - 0.5) / 0.35, 0, 1);
    svg += gx(790, 960, 1.15, eyeA, `<path d="M-190 -170Q0 -260 190 -170L170 60Q150 190 0 250Q-150 190 -170 60Z" fill="rgba(255,255,255,.08)" stroke="#9DE0BD" stroke-width="10" stroke-dasharray="26 18"/>${W.eyeIcon(0, 0, 0.8, 1)}`);
    // panah putus-putus dari tabung ke perisai mata, lalu dicoret
    const ar = clamp((u - 0.9) / 0.5, 0, 1);
    svg += `<path d="M430 960H${(430 + 190 * ar).toFixed(0)}" stroke="#fff" stroke-width="14" stroke-linecap="round" stroke-dasharray="1 28" opacity="${ar}"/>`;
    const st = clamp((u - 1.35) / 0.3, 0, 1);
    svg += gx(540, 960, lerp(2.4, 1, eob(st)), st, W.banSvg(0, 0, 190, 1));
    const bump = u > 1.35 && u < 1.6 ? Math.sin((u - 1.35) * 90) * 5 * (1 - (u - 1.35) / 0.25) : 0;
    svg = `<g transform="translate(${f1(bump)} ${f1(bump * 0.6)})">${svg}</g>`;
    ui += gx(540, 450, 0.85 + 0.15 * eob((u - 0.1) / 0.4), win(t, 26.34, 30.74, 0.2), `${R(-460, -118 + 8, 920, 236, 'rgba(0,0,0,.25)', 40)}${R(-460, -118, 920, 236, '#E8665F', 40)}${T(0, -6, 'BELUM TERBUKTI', '#fff', 84)}${T(0, 84, 'MELINDUNGI', '#FFF1C6', 96)}`);
    ui += gx(540, 1322, 1, win(t, 28.4, 30.74, 0.25), chip(0, 0, 800, 84, '#fff', 'Odol bukan perlindungan mata', '#0A3830', 40));
  } else {
    const u = t - 30.76, k = 1.5;
    svg += R(-100, -100, 1300, 2200, '#F6E3DD') + [0, 1, 2, 3].map((i) => C(((rnd(i, 7) * 1300 + t * 10) % 1300) - 100, 300 + rnd(i, 8) * 1000, 120 + rnd(i, 9) * 90, 'rgba(232,102,95,.10)')).join('');
    const sInt = lerpState(rk('perih', 'usap_mata', { yaw: 0, tears: 1, sweat: 1, ...BR(6, 16, 6, -16) }), rk('perih', 'jalan', { yaw: 0, tears: 1, sweat: 1, blink: 0.9, ...BR(7, 18, 7, -18), mouth: { w: 14, up: -5, lo: 4 } }), sm(u / 2));
    sInt.tearsT = t * 1.5;
    const head = [540, 900];
    const fy = head[1] - (242 - 778) * k;
    svg += `<clipPath id="cutB"><rect x="0" y="0" width="1080" height="1385"/></clipPath><g clip-path="url(#cutB)">${RK(sInt, head[0], fy, k, { t, uid: 'rk', shadow: false })}</g>`;
    // kemerahan di sekitar mata dan pipi
    const bob = Math.sin(t * 2.1) * 1.2;
    const eyeC = (hx) => [head[0] + (hx - 200) * k, head[1] + (252 - 242 + bob) * k];
    const red = clamp(u / 1.2, 0, 1) * 0.75;
    [152, 248].forEach((hx) => { const [cx, cy] = eyeC(hx); svg += `<ellipse cx="${f1(cx)}" cy="${f1(cy + 18)}" rx="${f1(66)}" ry="${f1(40)}" fill="#E8665F" opacity="${(red * 0.4).toFixed(2)}"/>`; });
    // garis iritasi yang berdenyut
    [[-118, -20, -1], [118, -20, 1]].forEach(([dx, dy, sg], i) => { const pu = 0.5 + 0.5 * Math.sin(t * 9 + i); svg += `<path d="M${f1(head[0] + dx * sg)} ${f1(head[1] + dy)}l${24 * sg} -16l${-8 * sg} 20l${24 * sg} -8" fill="none" stroke="#E8665F" stroke-width="9" stroke-linecap="round" stroke-linejoin="round" opacity="${(red * (0.5 + 0.5 * pu)).toFixed(2)}"/>`; });
    ui += gx(540, 450, 0.85 + 0.15 * eob((u - 0.05) / 0.4), win(t, 30.8, 35.97, 0.2), `${R(-470, -96 + 8, 940, 192, 'rgba(0,0,0,.25)', 40)}${R(-470, -96, 940, 192, '#0A3830', 40)}${T(0, -4, 'BISA MENAMBAH', '#fff', 80)}${T(0, 72, 'IRITASI', '#F8C038', 92)}`);
    ui += gx(900, 1180, 1, win(t, 31.0, 35.97, 0.3) * (0.6 + 0.4), `<g transform="scale(.6)">${W.tubeSvg(0, 0, 0.9, 10, 0)}${W.banSvg(0, 0, 130, 1)}</g>`);
  }
  return { svg, ui, post: {} };
}

// ================================================================ ADEGAN 4: tubuh (35.97 - 51.46)
const BODYCAM = { x: 540, y: 880, k: 1.3 };
function tubuh(t) {
  const u = t - 35.97;
  // posisi dan skala Raka: wajah besar lalu naik untuk kartu
  const mv = sm((t - 44.62) / 0.7);
  const k = lerp(1.3, 0.95, mv), hx = 540, hy = lerp(880, 560, mv);
  const fy = hy - (242 - 778) * k;
  const P2C = (v) => [hx + (v[0] - 200) * k, fy + (v[1] - 778) * k];
  let svg = TEAL_BG(t, '#12574F', '#0A3830');
  // keadaan Raka
  const tEyes = wd('K13', 5, 's'), tNose = wd('K13', 8, 's');
  let s;
  if (t < 40.28) s = rk('khawatir', 'jalan', { yaw: 0, ...BR(-3, 8, -3, -8), mouth: M.small, sweat: 0.4, tearsT: t });
  else if (t < 44.6) s = lerpState(rk('khawatir', 'jalan', { yaw: 0, ...BR(-3, 8, -3, -8), mouth: M.small, sweat: 0.4 }), rk('perih', 'jalan', { yaw: 0, tears: 1, sweat: 0.8, blink: 0.7, tearsT: t }), sm((t - tEyes) / 0.5));
  else {
    const cardKeys = [{ t: 0, d: 0.01, s: rk('perih', 'jalan', { yaw: 0, tears: 1, sweat: 0.8, blink: 0.7 }) }, { t: wd('K14', 5, 's') - 0.1, d: 0.3, s: rk('perih', 'jalan', { yaw: 0, tears: 1, sweat: 0.8, blink: 0.85 }) },
      { t: wd('K14', 7, 's') - 0.1, d: 0.3, s: rk('khawatir', 'jalan', { yaw: 0, tears: 0.7, sweat: 0.8, mouth: M.worry, wide: 0.2 }) },
      { t: wd('K14', 9, 's') - 0.1, d: 0.25, s: rk('batuk', 'batuk', { yaw: 0, tears: 0.7, sweat: 0.8 }) },
      { t: wd('K14', 11, 's') - 0.1, d: 0.3, s: rk('khawatir', 'jalan', { yaw: 0, tears: 0.5, sweat: 1, mouth: { w: 12, up: -5, lo: 10 }, wide: 0.6, armR: { wx: 232, wy: 470, ex: 322, ey: 500, finger: 0, front: 1 } }) }];
    s = stateAt(cardKeys, t);
  }
  s.tearsT = t * 1.5;
  if (t >= wd('K14', 9, 's') && t < wd('K14', 11, 's')) { const q = Math.sin((t - wd('K14', 9, 's')) * 26); s.bob += q * 3; s.tilt += q * 1.5; }
  svg += `<clipPath id="cutB2"><rect x="0" y="0" width="1080" height="1385"/></clipPath><g clip-path="url(#cutB2)">${RK(s, hx, fy, k, { t, uid: 'rk', dark: true, shadow: false })}</g>`;
  // butiran gas di sekitar wajah
  const eyes = [P2C([152, 252]), P2C([248, 252])], mouth = P2C([200, 314]);
  const lungsC = [820, 1010];
  let gz = '';
  const n = 46;
  for (let i = 0; i < n; i++) {
    const sp = 38 + rnd(i, 1) * 50, off = rnd(i, 2) * 1500;
    const x = 1220 - ((t * sp + off) % 1500), y = 520 + rnd(i, 3) * 760 + Math.sin(t * 1.3 + i) * 22 + (1220 - x) * 0.05;
    const a = clamp((u - 0.15) / 1.0, 0, 1) * (1 - mv);
    if (a <= 0.01) continue;
    gz += goo(x, y, 5 + rnd(i, 4) * 10, a * 0.85);
  }
  // fase K12: butiran menempel di seluruh wajah
  const stick = win(t, 36.3, 40.4, 0.4);
  if (stick > 0.01) for (let i = 0; i < 34; i++) { const a = rnd(i, 11) * Math.PI * 2, r = (0.3 + rnd(i, 12) * 0.7) * 150 * k; gz += goo(hx + Math.cos(a) * r * 1.0, hy + Math.sin(a) * r * 1.05 + 8 + Math.sin(t * 2 + i) * 3, 4 + rnd(i, 13) * 5, stick * 0.9); }
  // cincin sorot: bawah mata -> seluruh wajah
  const t1 = wd('K12', 7, 's'), t2 = wd('K12', 10, 's');
  const ringA = win(t, t1, 40.2, 0.25);
  if (ringA > 0.01) {
    const mu = sm((t - t2) / 0.55);
    const cx = lerp((eyes[0][0] + eyes[1][0]) / 2, hx, mu), cy = lerp(eyes[0][1] + 42 * k, hy + 10, mu), rx = lerp(150 * k, 190 * k, mu), ry = lerp(34 * k, 205 * k, mu);
    gz += `<ellipse cx="${f1(cx)}" cy="${f1(cy)}" rx="${f1(rx)}" ry="${f1(ry)}" fill="none" stroke="#F8C038" stroke-width="9" stroke-dasharray="22 14" opacity="${ringA}" transform="rotate(${(t * 12).toFixed(0)} ${f1(cx)} ${f1(cy)})"/>`;
  }
  // K13: butiran masuk ke mata, lalu ke hidung/mulut dan turun ke paru
  const inEyes = win(t, tEyes - 0.2, tNose + 0.1, 0.25);
  if (inEyes > 0.01) for (let i = 0; i < 12; i++) {
    const per = 1.3, ph = ((t - tEyes) / per + i / 12) % 1, e = eyes[i % 2];
    const sx = 980 + rnd(i, 21) * 80, sy = 560 + rnd(i, 22) * 200;
    const x = lerp(sx, e[0], eo(ph)), y = lerp(sy, e[1], eo(ph));
    gz += goo(x, y, 9 - 4 * ph, inEyes * (1 - clamp((ph - 0.85) / 0.15, 0, 1)));
  }
  const inAir = win(t, tNose - 0.1, 44.75, 0.3);
  if (inAir > 0.01) {
    gz += gx(lungsC[0], lungsC[1], 1.5, inAir, W.lungsIcon(0, 0, 1, 0));
    gz += `<g opacity="${inAir}">${T(lungsC[0], lungsC[1] - 270, 'saluran napas', '#fff', 38)}</g>`;
    const pts = [mouth, [mouth[0] + 160, mouth[1] + 30], [lungsC[0] - 20, lungsC[1] - 330], [lungsC[0], lungsC[1] - 200]];
    const bez = (p, q) => { const v = 1 - q; return [v * v * v * p[0][0] + 3 * v * v * q * p[1][0] + 3 * v * q * q * p[2][0] + q * q * q * p[3][0], v * v * v * p[0][1] + 3 * v * v * q * p[1][1] + 3 * v * q * q * p[2][1] + q * q * q * p[3][1]]; };
    gz += `<path d="M${f1(pts[0][0])} ${f1(pts[0][1])}C${f1(pts[1][0])} ${f1(pts[1][1])} ${f1(pts[2][0])} ${f1(pts[2][1])} ${f1(pts[3][0])} ${f1(pts[3][1])}" fill="none" stroke="rgba(255,255,255,.35)" stroke-width="8" stroke-dasharray="2 18" stroke-linecap="round" opacity="${inAir}"/>`;
    for (let i = 0; i < 10; i++) { const ph = ((t - tNose) / 1.6 + i / 10) % 1, b = bez(pts, ph); gz += goo(b[0], b[1], 9, inAir * (1 - clamp((ph - 0.9) / 0.1, 0, 1))); }
  }
  svg += gz;
  // kartu gejala (K14)
  let ui = '';
  const cards = [[['Mata berair'], 5, 'eye'], [['Hidung berair'], 7, 'nose'], [['Batuk'], 9, 'mouth'], [['Dada terasa', 'sesak'], 11, 'lung']];
  cards.forEach(([lab, wi, ic], i) => {
    const ta = wd('K14', wi, 's') - 0.05, a = clamp((t - ta) / 0.2, 0, 1) * clamp((51.3 - t) / 0.3, 0, 1); if (a <= 0.01) return;
    const col = i % 2, row = (i / 2) | 0, cx = 300 + col * 480, cy = 880 + row * 270;
    const sc = 0.6 + 0.4 * eob((t - ta) / 0.35);
    const icon = ic === 'eye' ? W.eyeIcon(-148, 0, 0.46, 1) : ic === 'nose' ? W.noseIcon(-150, -8, 0.55, 1) : ic === 'mouth' ? W.mouthIcon(-152, 6, 0.42) : W.lungsIcon(-150, 4, 0.5, 1);
    const txt = lab.length === 1 ? T(-72, 14, lab[0], '#0A3830', 42, '', 'start') : T(-72, -4, lab[0], '#0A3830', 42, '', 'start') + T(-72, 46, lab[1], '#0A3830', 42, '', 'start');
    ui += gx(cx, cy, sc, a, `${R(-225, -118 + 8, 450, 236, 'rgba(0,0,0,.28)', 36)}${R(-225, -118, 450, 236, '#fff', 36)}${icon}${txt}`);
  });
  return { svg, ui, post: {} };
}

// ================================================================ ADEGAN 5: menjauh, mulai membaik (51.46 - 57.19)
const GK = 0.8, GX = 400;
const sfG = (t) => 1 - sm((t - 53.0) / 0.55);
const integG = makeInteg(sfG, 51.46, 58);
function menjauh(t) {
  const u = t - 51.46, sf = sfG(t), ph = GAIT * integG(t), g = groundSpeed(GK), pan = -g * integG(t);
  const Fk = [
    { t: 51.46, d: 0.01, s: rk('perih', 'jalan', { yaw: 0.5, gazeX: 0.6, tears: 1, sweat: 0.8, blink: 0.45 }) },
    { t: 52.8, d: 0.5, s: rk('batuk', 'batuk', { yaw: 0.4, tears: 0.8, sweat: 0.7 }) },
    { t: 53.55, d: 0.3, s: rk('perih', 'usap_mata', { yaw: 0.3, tears: 0.7, sweat: 0.5 }) },
    { t: 54.62, d: 0.5, s: rk('lega', 'jalan', { yaw: 0.2, tears: 0.15, sparkle: 0.4, sweat: 0.2, ...ARM.rest }) },
    { t: 55.6, d: 0.6, s: rk('lega', 'jalan', { yaw: 0.1, tears: 0, sparkle: 0.5, ...ARM.rest }) },
  ];
  const F = stateAt(Fk, t);
  const wc = walkCycle(ph, { dir: 1 });
  const Wk = clone(F); Wk.legs = wc.legs; Wk.armL = wc.armL; Wk.armR = wc.armR; Wk.bob = wc.bob; Wk.lean = wc.lean;
  let s = sf > 0.001 ? lerpState(F, Wk, sf) : F;
  s.tearsT = t * 1.4;
  if (t > 52.8 && t < 53.5) { const q = Math.sin((t - 52.8) * 26); s.bob += q * 3; s.tilt += q * 1.5; }
  if (t > 53.55 && t < 54.55) { const rub = Math.sin(t * 8) * 4; s.armR.wx += rub; }
  const c = camFn([[51.46, 470, 1010, 1.0], [54, 480, 1000, 1.07], [57.19, 500, 980, 1.14]])(t);
  const farA = 1 - 0.65 * sm(u / 4);
  const warm = sm((t - 54.2) / 1.5);
  const bg = W.parkBg(t, { pan, warm: 0.15 + 0.35 * warm, farSmoke: farA });
  // sinar lembut saat membaik
  let rays = '';
  if (warm > 0.01) for (let i = 0; i < 5; i++) rays += `<path d="M${160 + i * 190} -100L${300 + i * 190} 1100L${380 + i * 190} 1100L${230 + i * 190} -100Z" fill="#FFF3C4" opacity="${(warm * 0.16).toFixed(3)}"/>`;
  // butiran/debu kecil jatuh dari baju saat membersihkan diri
  let dust = '';
  if (t > 53.55 && t < 54.7) for (let i = 0; i < 10; i++) { const p = ((t - 53.55) * 1.2 + i * 0.13) % 1; dust += goo(GX + (rnd(i, 4) - 0.3) * 160, 900 + p * 360, 6 + rnd(i, 5) * 5, 0.8 * (1 - p)); }
  const smokeFar = W.smokeSvg(99, 0, 70 + pan * 0.2, 1000, 1.4, 0.65 * farA, 17);
  const svg = `<g transform="${CAM(c)}">${bg}${smokeFar}${rays}${RK(s, GX, FL, GK, { t, uid: 'rk' })}${dust}</g>`;
  const ui = gx(540, 340, 0.9 + 0.1 * eob((t - 51.6) / 0.4), win(t, 51.6, 54.5, 0.25), chip(0, 0, 760, 80, 'rgba(255,255,255,.95)', 'Menjauh dari sumber paparan', '#0A3830', 38));
  return { svg, ui, post: {} };
}

// ================================================================ ADEGAN 6: keesokan harinya (57.19 - 62.31)
function kamar(t) {
  const u = t - 57.19;
  const dawn = 1 - sm(u / 1.8); // 1 = remang, 0 = pagi
  const c = camFn([[57.19, 560, 1010, 1.0], [62.31, 520, 1000, 1.12]])(t);
  const wall = R(-100, -100, 1300, 1330, '#F3E6D0') + R(-100, 1230, 1300, 800, '#C9A27A') + R(-100, 1226, 1300, 12, '#B08863');
  const win_ = `<g transform="translate(250 700)">${R(-180, -300, 360, 480, '#CFE8F3', 14)}${R(-180, -300, 360, 480, 'none', 14, 'stroke="#fff" stroke-width="16"')}${R(-6, -300, 12, 480, '#fff')}${R(-180, -70, 360, 12, '#fff')}${C(70, -170, 56 * (1 - dawn * 0.4), '#FFE08A', `opacity="${(1 - dawn).toFixed(2)}"`)}${R(-220, -330, 80, 520, '#8E7CE8', 20)}${R(140, -330, 80, 520, '#8E7CE8', 20)}</g>`;
  const beams = `<path d="M70 410L420 1230L-60 1230Z" fill="#FFF3C4" opacity="${((1 - dawn) * 0.35).toFixed(3)}"/>`;
  const bed = `<g transform="translate(820 1230)">${R(-230, -160, 460, 120, '#fff', 30)}${R(-230, -60, 460, 80, '#5BD0E6', 28)}${R(-250, -230, 40, 300, '#B3744A', 12)}${R(-190, -200, 150, 56, '#F7F2E4', 26)}${R(-230, 20, 24, 60, '#8A5A34')}${R(206, 20, 24, 60, '#8A5A34')}</g>`;
  const stand = `<g transform="translate(560 1230)">${R(-60, -130, 120, 130, '#B3744A', 12)}${R(-48, -120, 96, 8, '#8A5A34', 4)}${R(-14, -184, 28, 52, '#BFE6F5', 8)}${C(-34, -182, 30, '#F8C038')}${R(-40, -214, 80, 8, '#E8665F', 4)}</g>`;
  const calendar = `<g transform="translate(700 560)">${R(-86, -70, 172, 150, '#fff', 14)}${R(-86, -70, 172, 40, '#E8665F', 14)}${R(-86, -50, 172, 20, '#E8665F')}${T(0, 52, '31', '#0A3830', 66)}${T(0, -41, 'ESOK', '#fff', 26)}</g>`;
  const room = wall + beams + win_ + bed + stand + calendar;
  const tint = `<rect x="-200" y="-200" width="1500" height="2300" fill="rgb(30,46,110)" opacity="${(dawn * 0.52).toFixed(3)}"/>`;
  const KB = [
    { t: 57.19, d: 0.01, s: rk('khawatir', 'jalan', { yaw: -0.2, bags: 0.5, sweat: 0.2, mouth: M.mid, ...ARM.rest }) },
    { t: wd('K17', 5, 's') - 0.05, d: 0.2, s: rk('khawatir', 'jalan', { yaw: -0.2, bags: 0.5, wide: 0.4, mouth: M.small, ...ARM.rest }) },
    { t: wd('K17', 6, 's') - 0.05, d: 0.2, s: rk('batuk', 'batuk', { yaw: -0.2, bags: 0.5, tears: 0, sweat: 0.2 }) },
    { t: wd('K17', 8, 's'), d: 0.35, s: rk('khawatir', 'jalan', { yaw: -0.15, bags: 0.5, mouth: M.worry, ...BR(-8, 14, -8, -14), armR: { wx: 236, wy: 462, ex: 322, ey: 504, finger: 0, front: 1 }, armL: { wx: 118, wy: 566, ex: 84, ey: 500, finger: 0, front: 1 } }) },
  ];
  const s = stateAt(KB, t);
  if (t >= wd('K17', 6, 's') && t < wd('K17', 7, 's')) { const q = Math.sin((t - wd('K17', 6, 's')) * 28); s.bob += q * 3; s.tilt += q * 1.5; }
  const svg = `<g transform="${CAM(c)}">${room}${RK(s, 440, FL, 0.85, { t, uid: 'rk', outfit: 'harian' })}${tint}</g>`;
  const ui = gx(540, 340, 0.85 + 0.15 * eob((u - 0.15) / 0.4), win(t, 57.3, 62.2, 0.25), chip(0, 0, 640, 92, '#FFF1C6', 'KEESOKAN HARINYA', '#7A4A00', 46));
  return { svg, ui, post: {} };
}

// ================================================================ ADEGAN 7: peta + survei (62.31 - 71.19)
function peta(t) {
  const u = t - 62.31;
  let svg = R(-100, -100, 1300, 2200, '#F7F2E4') + [0, 1, 2].map((i) => C(((rnd(i, 4) * 1200 + t * 8) % 1300) - 100, 300 + rnd(i, 5) * 1100, 160, 'rgba(0,112,96,.06)')).join('');
  const prog = sm((t - 62.8) / 1.6);
  svg += `<defs><clipPath id="mapClip"><rect x="0" y="0" width="960" height="460" rx="40"/></clipPath></defs>`;
  const mp = 0.9 + 0.1 * eob((u - 0.05) / 0.5);
  svg += gx(60 + 480 * (1 - mp), 470 + 230 * (1 - mp), mp, clamp(u / 0.25, 0, 1), W.mapSvg(t, prog));
  let ui = gx(540, 380, 0.9 + 0.1 * eob((t - 63.9) / 0.4), clamp((t - 63.9) / 0.2, 0, 1), chip(0, 0, 820, 92, '#0A3830', 'Survei di Portland, Amerika Serikat', '#fff', 40));
  // jumlah responden (K19)
  const cnt = Math.round(2257 * sm((t - 65.3) / 2.6));
  const ca = clamp((t - 65.1) / 0.3, 0, 1);
  const num = String(cnt).replace(/\B(?=(\d{3})+(?!\d))/g, '.');
  ui += gx(540, 1075, 0.9 + 0.1 * eob((t - 65.1) / 0.4), ca, T(0, 0, num, '#007060', 150) + T(0, 76, 'responden', '#0A3830', 56));
  // titik (1 titik = 10 responden)
  let dots = '';
  const nd = 226, shown = Math.round(nd * sm((t - 65.3) / 2.6));
  for (let i = 0; i < nd; i++) { if (i >= shown) break; const col = i % 26, row = (i / 26) | 0; dots += C(-(25 * 18) / 2 + col * 18, row * 18, 6.4, i % 7 === 0 ? '#E8665F' : '#00A383'); }
  ui += gx(540, 1195, 1, ca, dots + T(0, 186, '1 titik ≈ 10 responden', '#5B6A72', 26));
  const rs = lerpState(rk('berpikir', 'berpikir', { yaw: -0.3, gazeX: -0.6, gazeY: -0.3, legs: { dir: -1 } }), rk('khawatir', 'jalan', { yaw: -0.3, gazeX: -0.5, ...BR(-4, 6, -4, -6), legs: { dir: -1 } }), sm((t - 66.0) / 0.6));
  svg += RK(rs, 920, FL, 0.55, { t, uid: 'rk', outfit: 'harian' });
  return { svg, ui, post: {} };
}

// ================================================================ ADEGAN 8: 47% (71.19 - 87.36)
function angka47(t) {
  const u = t - 71.19;
  let svg = TEAL_BG(t, '#0F4F47', '#0A3830');
  let ui = '';
  const pa = clamp(u / 0.3, 0, 1), sc = 0.88 + 0.12 * eob(u / 0.45);
  const tEnd = wd('K20', 2, 's'), tStart = wd('K20', 1, 's') - 0.2;
  const val = Math.round(47 * sm((t - tStart) / (tEnd - tStart + 0.2)));
  const angle = (val / 100) * 360;
  const ring = (() => { const r = 150, cx = 0, cy = 0; const a = (angle - 90) * Math.PI / 180; const x = cx + r * Math.cos(a), y = cy + r * Math.sin(a); const large = angle > 180 ? 1 : 0; return `<circle r="${r}" fill="none" stroke="#E4EBEC" stroke-width="44"/>` + (angle > 0.5 ? `<path d="M0 ${-r}A${r} ${r} 0 ${large} 1 ${x.toFixed(1)} ${y.toFixed(1)}" fill="none" stroke="#E8665F" stroke-width="44" stroke-linecap="round"/>` : ''); })();
  const card = `${R(-480, -370 + 10, 960, 740, 'rgba(0,0,0,.3)', 48)}${R(-480, -370, 960, 740, '#fff', 48)}`
    + T(-440, -300, 'HASIL SURVEI', '#007060', 34, 'letter-spacing="3"', 'start')
    + `<g transform="translate(-205 -110)">${T(0, 90, `${val}%`, '#E8665F', 224)}</g>` + `<g transform="translate(300 -90)">${ring}</g>`
    + `<text x="0" y="150" ${FONT_} font-size="38" fill="#0A3830" text-anchor="middle"><tspan x="0">Responden survei melaporkan masalah paru</tspan><tspan x="0" dy="48">atau dada 1–2 hari setelah paparan.</tspan></text>`
    + T(0, 276, 'Survei di Portland · 2.257 responden · laporan peserta.', '#5B6A72', 30)
    + T(0, 322, 'Torgrimson-Ojerio dkk., BMC Public Health, 2021 · doi.org/10.1186/s12889-021-10859-w', '#7B8E96', 22);
  ui += gx(540, 700 + Math.sin(t * 1.3) * 7, sc, pa, card);
  // K21: laporan peserta; K22: tidak berlaku untuk semua orang
  const a21 = win(t, wd('K21', 0, 's') - 0.1, 87.3, 0.3), a22 = win(t, wd('K22', 0, 's') - 0.1, 87.3, 0.3);
  ui += gx(540, 1185, 0.85 + 0.15 * eob((t - 78.3) / 0.4), a21, chip(0, 0, 900, 96, '#F8C038', 'Angka dari laporan peserta survei', '#0A3830', 42));
  const pe = eob((t - (wd('K22', 1, 's') - 0.1)) / 0.4);
  ui += gx(540, 1315, 0.85 + 0.15 * pe, a22 * clamp(pe, 0, 1), `${R(-460, -52 + 7, 920, 104, 'rgba(0,0,0,.28)', 52)}${R(-460, -52, 920, 104, '#FFE3DF', 52)}${T(-8, 17, '≠ semua orang yang terkena gas air mata', '#B7332B', 38)}`);
  return { svg, ui, post: {} };
}
const FONT_ = `font-family="Plus Jakarta Sans" font-weight="800"`;

// ================================================================ ADEGAN 9: pertolongan pertama (87.36 - 107.8)
const AK = 0.8;
function tenang(t) { // 87.36 - 90.31: tenang, bertanya
  const c = camFn([[87.36, 540, 1010, 1.0], [90.31, 540, 1000, 1.1]])(t);
  const u = t - 87.36;
  const s = lerpState(rk('khawatir', 'jalan', { yaw: 0, ...BR(-4, 6, -4, -6), mouth: M.small }), rk('netral', 'berpikir', { yaw: 0.15, gazeY: -0.5, gazeX: 0.5, legs: { dir: 1 } }), sm((t - 88.2) / 0.5));
  const svg = `<g transform="${CAM(c)}">${W.parkBg(t, { warm: 0.4, farSmoke: 0.3 })}${RK(s, 540, FL, AK + 0.05, { t, uid: 'rk' })}</g>`;
  const q = gx(760, 760, 0.6 + 0.4 * eob((t - wd('K23', 3, 's')) / 0.4), clamp((t - wd('K23', 3, 's')) / 0.2, 0, 1), T(0, 0, '?', '#F8C038', 220, 'stroke="#172B38" stroke-width="10" paint-order="stroke"'), 10);
  return { svg: svg.replace('</g>', `${q}</g>`), ui: '', post: {} };
}
const sfA = (t) => 1 - sm((t - 93.0) / 0.55);
const integA = makeInteg(sfA, 90.31, 94.2);
function udara(t) { // 90.31 - 94.16: menjauh ke udara segar
  const sf = sfA(t), ph = GAIT * integA(t), pan = -groundSpeed(AK) * integA(t);
  const c = camFn([[90.31, 470, 1010, 1.0], [94.16, 490, 1000, 1.08]])(t);
  const F = stateAt([{ t: 90.31, d: 0.01, s: rk('khawatir', 'jalan', { yaw: 0.5, gazeX: 0.6, mouth: M.small, ...BR(-3, 8, -3, -8) }) }, { t: 92.4, d: 0.8, s: rk('lega', 'jalan', { yaw: 0.35, gazeX: 0.5, mouth: M.smile }) }], t);
  const wc = walkCycle(ph, { dir: 1 });
  const Wk = clone(F); Wk.legs = wc.legs; Wk.armL = wc.armL; Wk.armR = wc.armR; Wk.bob = wc.bob; Wk.lean = wc.lean;
  const s = sf > 0.001 ? lerpState(F, Wk, sf) : F;
  let wind = ''; for (let i = 0; i < 7; i++) { const x = (((t * 260 + i * 330) % 1500) - 200), y = 560 + i * 90; wind += `<path d="M${f1(x)} ${y}h${120 + (i % 3) * 40}q30 0 30 -22" fill="none" stroke="rgba(255,255,255,.75)" stroke-width="8" stroke-linecap="round" opacity="${(0.4 + 0.3 * Math.sin(t * 2 + i)).toFixed(2)}"/>`; }
  const svg = `<g transform="${CAM(c)}">${W.parkBg(t, { pan, warm: 0.45, farSmoke: 0.3 * (1 - sm((t - 90.31) / 3)) })}${wind}${RK(s, 440, FL, AK, { t, uid: 'rk' })}</g>`;
  const ui = gx(540, 340, 0.9 + 0.1 * eob((t - 90.5) / 0.4), win(t, 90.5, 94.1, 0.25), chip(0, 0, 780, 84, 'rgba(255,255,255,.96)', 'Menjauh · cari udara segar', '#0A3830', 40));
  return { svg, ui, post: {} };
}
function bilas(t) { // 94.16 - 100.52: bilas mata dengan air bersih
  const u = t - 94.16, k = 1.5, hx = 540, hy = 960 + 40, fy = hy - (242 - 778) * k;
  const c = camFn([[94.16, 540, 1010, 1.0], [100.52, 540, 1010, 1.0]])(t);
  const tilt = lerp(0, 13, sm((t - 95.4) / 0.6));
  const start = wd('K26', 0, 's');
  const pour = sm((t - 95.6) / 0.4) * (1 - sm((t - 100.1) / 0.3));
  const KS_ = [
    { t: 94.16, d: 0.01, s: rk('perih', 'jalan', { yaw: 0, tears: 1, sweat: 0.6, blink: 0.4, armR: { wx: 258, wy: 420, ex: 320, ey: 470, finger: 0, front: 1 } }) },
    { t: 95.5, d: 0.5, s: rk('perih', 'jalan', { yaw: 0, tears: 1, blink: 0.85, armR: { wx: 292, wy: 252, ex: 356, ey: 350, finger: 0, front: 1 }, armL: { wx: 154, wy: 520, ex: 84, ey: 520, finger: 0, front: 1 } }) },
    { t: 98.6, d: 1.4, s: rk('perih', 'jalan', { yaw: 0, tears: 0.5, blink: 0.8, armR: { wx: 292, wy: 252, ex: 356, ey: 350, finger: 0, front: 1 }, armL: { wx: 154, wy: 520, ex: 84, ey: 520, finger: 0, front: 1 } }) },
    { t: 100.1, d: 0.35, s: rk('lega', 'jalan', { yaw: 0, tears: 0.1, armR: { wx: 292, wy: 252, ex: 356, ey: 350, finger: 0, front: 1 } }) },
  ];
  const s = stateAt(KS_, t); s.tilt += tilt; s.tearsT = t * 1.4;
  let svg = W.parkBg(t, { warm: 0.45, farSmoke: 0 });
  svg = `<g style="filter:blur(4px)">${svg}</g>${R(-100, -100, 1300, 2200, 'rgba(255,255,255,.25)')}`;
  svg += `<clipPath id="cutB3"><rect x="0" y="0" width="1080" height="1385"/></clipPath><g clip-path="url(#cutB3)">${RK(s, hx, fy, k, { t, uid: 'rk', shadow: false })}</g>`;
  // botol air di tangan kanan Raka (kanan layar)
  const h = armShape('R', s.armR).hand, hp = [hx + (h[0] - 200) * k, fy + (h[1] + s.bob - 778) * k];
  const bAng = lerp(0, -62, pour), bx = hp[0] + 12, by = hp[1] - 34;
  const eyeP = [hx + (248 - 200) * k + 4, fy + (270 - 778) * k + 14];
  svg += `<g transform="translate(${f1(bx)} ${f1(by)}) rotate(${f1(bAng)})">${R(-34, -132, 68, 150, '#BFE6F5', 16)}${R(-34, -70, 68, 84, '#5BD0E6', 8)}${R(-22, -158, 44, 28, '#007060', 8)}${R(-30, -110, 60, 8, 'rgba(255,255,255,.7)', 4)}</g>`;
  // aliran air dari mulut botol ke mata
  if (pour > 0.05) {
    const mouth = [bx + Math.sin(-bAng * Math.PI / 180) * 160 * -1 * -1, by - Math.cos(bAng * Math.PI / 180) * 160];
    const mx = bx + Math.sin(bAng * Math.PI / 180) * 160, my = by - Math.cos(bAng * Math.PI / 180) * 160;
    svg += `<path d="M${f1(mx)} ${f1(my)}Q${f1(mx - 20)} ${f1((my + eyeP[1]) / 2 - 30)} ${f1(eyeP[0])} ${f1(eyeP[1])}" fill="none" stroke="#7FD3F2" stroke-width="12" stroke-linecap="round" stroke-dasharray="26 16" stroke-dashoffset="${(-t * 160).toFixed(0)}" opacity="${pour}"/>`;
    for (let i = 0; i < 7; i++) { const p = ((t * 1.7) + i * 0.16) % 1; svg += C(eyeP[0] + (i % 2 ? 1 : -1) * p * 60, eyeP[1] + p * p * 140, 6 - 3 * p, '#9FD6F2', `opacity="${(pour * (1 - p)).toFixed(2)}"`); }
  }
  // teks besar + pengatur waktu
  let ui = gx(540, 420, 0.85 + 0.15 * eob((t - start) / 0.4), clamp((t - start + 0.1) / 0.15, 0, 1) * clamp((100.55 - t) / 0.2, 0, 1), `${R(-470, -100 + 8, 940, 200, 'rgba(0,0,0,.28)', 40)}${R(-470, -100, 940, 200, '#007060', 40)}${T(0, -6, 'BILAS MATA', '#fff', 92)}${T(0, 76, '10–15 MENIT', '#F8C038', 96)}`);
  const tm = clamp((t - start) / (100.3 - start), 0, 1);
  ui += gx(870, 700, 0.8 + 0.2 * eob((t - start - 0.2) / 0.4), clamp((t - start) / 0.3, 0, 1) * clamp((100.55 - t) / 0.2, 0, 1), `${C(0, 7, 78, 'rgba(0,0,0,.25)')}${C(0, 0, 78, '#fff')}<path d="M0 0L0 -58A58 58 0 ${tm * 360 > 180 ? 1 : 0} 1 ${(58 * Math.sin(tm * Math.PI * 2)).toFixed(1)} ${(-58 * Math.cos(tm * Math.PI * 2)).toFixed(1)}Z" fill="#5BD0E6"/>${C(0, 0, 8, '#0A3830')}`);
  ui += gx(250, 1245, 1, win(t, 95.0, 99.2, 0.25), chip(0, 0, 400, 72, '#fff', 'air bersih', '#007060', 38));
  return { svg: `<g transform="${CAM(c)}">${svg}</g>`, ui, post: {} };
}
const sfM = (t) => 1 - sm((t - 102.3) / 0.6);
const integM = makeInteg(sfM, 100.52, 108);
function medis(t) { // 100.52 - 107.8: tanda perlu bantuan medis
  const sf = sfM(t), ph = GAIT * integM(t);
  const x0 = lerp(120, 420, integM(t) / integM(107.8) );
  const F = stateAt([{ t: 100.52, d: 0.01, s: rk('khawatir', 'jalan', { yaw: 0.45, gazeX: 0.5, ...BR(-4, 8, -4, -8), mouth: M.small }) }, { t: 102.6, d: 0.5, s: rk('khawatir', 'jalan', { yaw: 0.2, gazeX: 0.6, ...BR(-6, 12, -6, -12), mouth: M.worry, wide: 0.5 }) }, { t: 106.4, d: 0.5, s: rk('lega', 'sapa', { yaw: 0.2, ...ARM.rest, legs: { dir: 1 } }) }], t);
  const wc = walkCycle(ph, { dir: 1 });
  const Wk = clone(F); Wk.legs = wc.legs; Wk.armL = wc.armL; Wk.armR = wc.armR; Wk.bob = wc.bob; Wk.lean = wc.lean;
  const s = sf > 0.001 ? lerpState(F, Wk, sf) : F;
  const c = camFn([[100.52, 520, 1010, 1.0], [107.8, 580, 1000, 1.08]])(t);
  // petugas medis di depan tenda
  const m = 1.0, mx = 780;
  const medic = `<g transform="translate(${mx} ${FL})">${R(-60, -118, 36, 118, '#2E3744', 14)}${R(24, -118, 36, 118, '#2E3744', 14)}${R(-80, -30, 70, 30, '#1F2429', 14)}${R(10, -30, 70, 30, '#1F2429', 14)}${R(-92, -340, 184, 240, '#fff', 56)}${R(-92, -340, 184, 240, 'none', 56, 'stroke="#DDF5EA" stroke-width="8"')}${R(14, -300, 52, 52, '#E8665F', 12)}${R(31, -290, 18, 32, '#fff', 4)}${R(24, -280, 38, 14, '#fff', 4)}${R(-52, -352, 104, 40, '#F2C29B', 18)}${C(0, -430, 70, '#E8B88E')}${P('M-70 -440Q0 -520 70 -440Q50 -470 0 -476Q-50 -470 -70 -440Z', '#2A2F3A')}${C(-24, -428, 8, '#172B38')}${C(24, -428, 8, '#172B38')}${P('M-20 -398Q0 -380 20 -398', 'none', 'stroke="#7A2D2E" stroke-width="7" stroke-linecap="round"')}<g transform="translate(0 0)">${L('M80 -290Q120 -330 130 -380', '#fff', 40)}${C(130, -390, 24, '#E8B88E')}</g></g>`;
  const svg = `<g transform="${CAM(c)}">${W.postBg(t)}${medic}${RK(s, x0, FL, AK, { t, uid: 'rk' })}</g>`;
  // tanda yang perlu diwaspadai
  const items = [[wd('K27', 3, 's'), 'Sulit bernapas', 'lung'], [wd('K28', 0, 's'), 'Penglihatan tetap terganggu', 'eye'], [wd('K28', 4, 's'), 'Gejala tidak membaik', 'down']];
  let ui = '';
  items.forEach(([ta, lab, ic], i) => {
    const a = clamp((t - ta + 0.05) / 0.2, 0, 1) * clamp((107.6 - t) / 0.2, 0, 1); if (a <= 0.01) return;
    const icon = ic === 'lung' ? `<g transform="translate(-355 4) scale(.2)">${W.lungsIcon(0, 0, 1, 0)}</g>` : ic === 'eye' ? `<g transform="translate(-355 0) scale(.2)">${W.eyeIcon(0, 0, 1, 0)}</g>` : `<g transform="translate(-355 0)">${L('M0 -18V14M-14 2L0 16L14 2', '#E8665F', 8)}</g>`;
    ui += gx(540, 325 + i * 90, 0.85 + 0.15 * eob((t - ta) / 0.3), a, `${R(-430, -42 + 7, 860, 84, 'rgba(0,0,0,.25)', 42)}${R(-430, -42, 860, 84, '#fff', 42)}${R(-430, -42, 12, 84, '#E8665F')}${icon}${T(20, 14, lab, '#0A3830', 38)}`);
  });
  const ta = wd('K29', 1, 's') - 0.05, ba = clamp((t - ta) / 0.2, 0, 1);
  ui += gx(540, 655, 0.8 + 0.2 * eob((t - ta) / 0.4), ba, `${R(-450, -62 + 8, 900, 124, 'rgba(0,0,0,.28)', 44)}${R(-450, -62, 900, 124, '#E8665F', 44)}<g transform="translate(-370 0)">${C(0, 0, 40, '#fff')}${R(-9, -26, 18, 52, '#E8665F', 3)}${R(-26, -9, 52, 18, '#E8665F', 3)}</g>${T(30, 20, 'CARI BANTUAN MEDIS', '#fff', 54)}`);
  return { svg, ui, post: {} };
}

// ================================================================ ADEGAN 10: penutup (107.8 - 115.57)
let logoUri = '';
export function setLogo(u) { logoUri = u; }
function penutup(t) {
  const u = t - 107.8;
  let svg = `<defs><linearGradient id="og" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#DDF5EA"/><stop offset="1" stop-color="#F7F2E4"/></linearGradient></defs>${R(-100, -100, 1300, 2200, 'url(#og)')}`;
  for (let i = 0; i < 6; i++) svg += `<path d="M540 760L${(-300 + i * 340)} -100L${(-100 + i * 340)} -100Z" fill="#fff" opacity="${(0.28 + 0.1 * Math.sin(t * 0.9 + i)).toFixed(2)}"/>`;
  svg += R(-100, 1330, 1300, 700, '#9DE0BD') + R(-100, 1330, 1300, 14, '#7FCBA3');
  const KB = [{ t: 107.8, d: 0.01, s: rk('khawatir', 'jalan', { yaw: 0.2 }) }, { t: 108.3, d: 0.4, s: rk('senang', 'sapa', { legs: { dir: 1 }, yaw: 0.2, happyEyes: 1 }) }];
  const s = stateAt(KB, t); if (t > 108.7) s.armR = { wx: 340 + Math.sin(t * 9) * 14, wy: 318, ex: 350, ey: 404, finger: 0, front: 1 };
  s.sparkle = 0.5 + 0.3 * Math.sin(t * 5);
  svg += RK(s, 300, FL + 4, 0.8, { t, uid: 'rk', outfit: 'harian' });
  if (KORI) {
    KORI.pose(KORI.r, { t, mood: 'happy', env: 0, wave: t > 108.4 ? 1 : 0, phase: 0.5 });
    const ks = lerp(1.2, 1.78, eob((t - 108.1) / 0.5)), ka = clamp((t - 108.0) / 0.2, 0, 1);
    svg += `<g transform="translate(${f1(800 - 160 * ks)} ${f1(1336 - 290 * ks)}) scale(${ks.toFixed(3)})" opacity="${ka}">${KORI.r.root.outerHTML}</g>`;
  }
  let ui = '';
  const a1 = clamp((t - 107.9) / 0.15, 0, 1);
  ui += gx(540, 370, 0.8 + 0.2 * eob((t - 107.9) / 0.4), a1, `${R(-310, -105 + 8, 620, 210, 'rgba(10,56,48,.22)', 56)}${R(-310, -105, 620, 210, '#fff', 56)}<image href="${logoUri}" x="-250" y="-50" width="500" height="100.8"/>`);
  const ta = wd('K31', 0, 's') - 0.1, a2 = clamp((t - ta) / 0.15, 0, 1);
  ui += gx(540, 545, 0.8 + 0.2 * eob((t - ta) / 0.4), a2, `${R(-470, -52 + 7, 940, 104, 'rgba(10,56,48,.22)', 52)}${R(-470, -52, 940, 104, '#DDF5EA', 52)}${T(0, 19, 'Belajar kedokteran gratis', '#0A3830', 58)}`);
  const tb = wd('K31', 5, 's') - 0.1, a3 = clamp((t - tb) / 0.15, 0, 1);
  ui += gx(540, 675, 0.7 + 0.3 * eob((t - tb) / 0.4), a3, `${R(-300, -58 + 8, 600, 116, 'rgba(10,56,48,.25)', 58)}${R(-300, -58, 600, 116, '#0A3830', 58)}${T(0, 24, 'medcoel.com', '#F8C038', 72)}`);
  return { svg, ui, post: {} };
}

export const SCENES = [
  { id: 'street', t0: 0, t1: 14.26, draw: street },
  { id: 'odol', t0: 14.26, t1: 26.28, draw: odol, tr: { type: 'whip', d: 0.4 } },
  { id: 'tidak', t0: 26.28, t1: 35.97, draw: tidakTerbukti, tr: { type: 'iris', d: 0.5, cx: 540, cy: 1000 } },
  { id: 'tubuh', t0: 35.97, t1: 51.46, draw: tubuh, tr: { type: 'whip', d: 0.4 } },
  { id: 'menjauh', t0: 51.46, t1: 57.19, draw: menjauh, tr: { type: 'iris', d: 0.5, cx: 540, cy: 900 } },
  { id: 'kamar', t0: 57.19, t1: 62.31, draw: kamar, tr: { type: 'fade', d: 0.6 } },
  { id: 'peta', t0: 62.31, t1: 71.19, draw: peta, tr: { type: 'iris', d: 0.5, cx: 540, cy: 700 } },
  { id: 'angka', t0: 71.19, t1: 87.36, draw: angka47, tr: { type: 'whip', d: 0.4 } },
  { id: 'tenang', t0: 87.36, t1: 90.31, draw: tenang, tr: { type: 'fade', d: 0.6 } },
  { id: 'udara', t0: 90.31, t1: 94.16, draw: udara, tr: { type: 'whip', d: 0.35 } },
  { id: 'bilas', t0: 94.16, t1: 100.52, draw: bilas, tr: { type: 'iris', d: 0.45, cx: 540, cy: 960 } },
  { id: 'medis', t0: 100.52, t1: 107.8, draw: medis, tr: { type: 'whip', d: 0.4 } },
  { id: 'penutup', t0: 107.8, t1: 115.57, draw: penutup, tr: { type: 'iris', d: 0.5, cx: 540, cy: 900 } },
];
