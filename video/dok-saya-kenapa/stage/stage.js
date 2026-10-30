// "Dok, saya kenapa?": orkestrasi. renderFrame(t) deterministik (t = detik video).
import { raka, rakaSvg, lerpState, armShape, idle, PALETTE_ON_DARK } from './raka.js';
import { teman, temanSvg, lerpTeman, idleTeman } from './teman.js';
import { pasien, pasienSvg, lerpPasien, idlePasien } from './pasien.js';
import { SCENES, hasClock, clock, heldObject, TOP, FRONT, R, C, P, L, T, FONT, HAND } from './world.js';
import { lorongBg, lorongFg, periksaBg, periksaTop, periksaFg, gameBg, gameTop, gameFg, heldObject2, DOOR } from './world2.js';

const NS = 'http://www.w3.org/2000/svg';
const $ = (id) => document.getElementById(id);
const CLEAN = new URLSearchParams(location.search).has('clean');
const NOCAM = new URLSearchParams(location.search).has('nocam');
const clamp = (x, a, b) => Math.max(a, Math.min(b, x));
const lerp = (a, b, t) => a + (b - a) * t;
const sm = (x) => { x = clamp(x, 0, 1); return x * x * (3 - 2 * x); };
const eob = (x) => { x = clamp(x, 0, 1); const c1 = 1.70158, c3 = c1 + 1; return 1 + c3 * Math.pow(x - 1, 3) + c1 * Math.pow(x - 1, 2); };
const win = (t, a, b, f = 0.25) => clamp((t - a) / f, 0, 1) * clamp((b - t) / f, 0, 1);
const f1 = (n) => (Math.round(n * 10) / 10);
await document.fonts.load('800 40px "Plus Jakarta Sans"'); await document.fonts.load('700 30px "Plus Jakarta Sans"'); await document.fonts.ready;
const DATA = await (await fetch('data.json')).json();
const FPS = DATA.fps;
const LINE = Object.fromEntries(DATA.lines.map((l) => [l.id, l]));
const word = (id, i, edge = 's') => LINE[id].words[Math.min(i, LINE[id].words.length - 1)][edge];
const spk = (id, t) => t >= LINE[id].clip0 + 0.02 && t <= LINE[id].clip1 - 0.02;
const envAt = (arr, f) => { const i = clamp(f, 0, arr.length - 1); return clamp((arr[Math.max(0, i - 1)] + arr[i] * 2 + arr[Math.min(arr.length - 1, i + 1)]) / 4, 0, 1); };

function pchip(keys) {
  const n = keys.length, h = [], d = [], m = new Array(n).fill(0);
  for (let i = 0; i < n - 1; i++) { h[i] = keys[i + 1][0] - keys[i][0]; d[i] = (keys[i + 1][1] - keys[i][1]) / h[i]; }
  if (n > 2) for (let i = 1; i < n - 1; i++) { if (d[i - 1] * d[i] <= 0) m[i] = 0; else { const w1 = 2 * h[i] + h[i - 1], w2 = h[i] + 2 * h[i - 1]; m[i] = (w1 + w2) / (w1 / d[i - 1] + w2 / d[i]); } }
  m[0] = d[0]; m[n - 1] = d[n - 2];
  return (x) => {
    if (x <= keys[0][0]) return keys[0][1]; if (x >= keys[n - 1][0]) return keys[n - 1][1];
    let i = 0; while (x > keys[i + 1][0]) i++;
    const t = (x - keys[i][0]) / h[i], t2 = t * t, t3 = t2 * t;
    return (2 * t3 - 3 * t2 + 1) * keys[i][1] + (t3 - 2 * t2 + t) * h[i] * m[i] + (-2 * t3 + 3 * t2) * keys[i + 1][1] + (t3 - t2) * h[i] * m[i + 1];
  };
}
function stateAt(keys, t, lerpFn) {
  let i = 0; while (i + 1 < keys.length && t >= keys[i + 1].t) i++;
  if (i === 0) return keys[0].s;
  const k = keys[i], prev = keys[i - 1].s, u = sm((t - k.t) / k.d);
  return u >= 1 ? k.s : lerpFn(prev, k.s, u);
}
const clone = (o) => JSON.parse(JSON.stringify(o));

// ---------------------------------------------------------------- struktur dunia
const world = $('world'), ui = $('ui'), over = $('over');
world.innerHTML = `<defs><clipPath id="clipB"><circle id="clipBc" cx="540" cy="760" r="0"/></clipPath><clipPath id="peekClip"><rect x="0" y="1000" width="1080" height="388"/></clipPath><clipPath id="seatClip"><rect x="-600" y="0" width="2300" height="1262"/></clipPath><clipPath id="thClip"><circle cx="205" cy="440" r="150"/></clipPath></defs>
<g id="cam"><g id="gA"></g><g id="gB" clip-path="url(#clipB)"></g><g id="gX1"></g><g id="gTh"></g><g id="friend"></g><g id="rakaG"></g><g id="objG"></g><g id="gAfg"></g><g id="gBfg" clip-path="url(#clipB)"></g><g id="gX2"></g><g id="gX3"></g><g id="ring"></g></g>
<rect id="webDim" x="0" y="0" width="1080" height="1920" fill="#0A3830" opacity="0"/>`;
const G = Object.fromEntries(['cam', 'gA', 'gB', 'gX1', 'gTh', 'friend', 'rakaG', 'objG', 'gAfg', 'gBfg', 'gX2', 'gX3', 'ring', 'webDim', 'clipBc'].map((k) => [k, $(k)]));
if (CLEAN) { ui.style.display = 'none'; over.style.display = 'none'; $('cap').style.display = 'none'; }

// ---------------------------------------------------------------- Raka: keadaan
const SEAT = { armL: { wx: 166, wy: 526, ex: 98, ey: 500, finger: 0, front: 1 }, armR: { wx: 322, wy: 466, ex: 354, ey: 486, finger: 0, front: 0 } };
const REST = { armL: { wx: 166, wy: 526, ex: 98, ey: 500, finger: 0, front: 1 }, armR: { wx: 234, wy: 526, ex: 302, ey: 500, finger: 0, front: 1 } };
const CLIP = { armL: { wx: 176, wy: 496, ex: 96, ey: 524, finger: 0, front: 1 }, armR: { wx: 224, wy: 496, ex: 304, ey: 524, finger: 0, front: 1 } };
const HIPS = { armL: { wx: 118, wy: 540, ex: 60, ey: 480, finger: 0, front: 1 }, armR: { wx: 282, wy: 540, ex: 340, ey: 480, finger: 0, front: 1 } };
const LIMP = { armL: { wx: 120, wy: 580, ex: 80, ey: 520, finger: 0, front: 1 }, armR: { wx: 280, wy: 580, ex: 320, ey: 520, finger: 0, front: 1 } };
const M = { smile: { w: 20, up: 11, lo: 11 }, smile2: { w: 17, up: 9, lo: 9 }, small: { w: 14, up: 6, lo: 6 }, mid: { w: 12, up: 3, lo: 3 }, flat: { w: 12, up: 0, lo: 0 }, worry: { w: 11, up: -4, lo: -4 }, open: { w: 12, up: -2, lo: 14 }, wow: { w: 13, up: 1, lo: 26 }, grin: { w: 26, up: 10, lo: 26 }, o: { w: 8, up: -3, lo: 16 }, tight: { w: 22, up: 8, lo: 8 }, eee: { w: 22, up: 2, lo: 10 } };
const BR = (ly, lr, ry, rr) => ({ browL: { y: ly, rot: lr }, browR: { y: ry, rot: rr } });
const rk = (arms, ov = {}, expr = 'netral') => raka(expr, null, { ...arms, ...ov });

// --- Raka di ruang periksa/lorong (tau = waktu adegan; mode 'bad' = bayangan, 'good' = ulang)
const KB = [ // bayangan masa depan
  { t: 0, d: 0.01, s: rk(CLIP, { mouth: M.small, gazeY: 0.55, sweat: 0.25, ...BR(-2, 3, -2, -3) }) },
  { t: 1.2, d: 0.5, s: rk(CLIP, { mouth: M.smile2, gazeY: -0.1, sweat: 0.3, ...BR(-5, 4, -5, -4) }) },
  { t: 3.6, d: 0.5, s: rk(CLIP, { mouth: M.small, gazeY: 0.55, sweat: 0.4, ...BR(-3, 6, -3, -6) }) },
  { t: 5.3, d: 0.4, s: rk(CLIP, { mouth: M.mid, gazeY: -0.15, sweat: 0.5, ...BR(-6, 7, -6, -7) }) },
  { t: 6.5, d: 0.25, s: rk(CLIP, { mouth: M.o, wide: 0.7, yaw: 0.75, gazeX: 0.95, sweat: 0.7, ...BR(-12, 5, -12, -5) }) },
  { t: 7.75, d: 0.2, s: rk(REST, { mouth: M.mid, wide: 0.5, sweat: 0.6, ...BR(-9, 7, -9, -7) }) },
  { t: 8.4, d: 0.3, s: rk(REST, { mouth: M.open, wide: 0.85, yaw: 0.35, gazeX: 0.8, sweat: 0.7, ...BR(-12, 8, -12, -8) }) },
  { t: 10.0, d: 0.3, s: rk(REST, { mouth: M.small, wide: 0.55, yaw: 0.4, gazeX: 0.9, sweat: 0.7, ...BR(-9, 9, -9, -9) }) },
  { t: 12.4, d: 0.25, s: rk(REST, { mouth: M.wow, wide: 1, yaw: 0.0, gazeY: -0.8, sweat: 0.9, ...BR(-16, 8, -16, -8), fxBurst: 1 }) },
  { t: 13.6, d: 0.5, s: rk(REST, { mouth: M.open, wide: 0.9, gazeX: -0.5, gazeY: -0.5, sweat: 1, ...BR(-12, 8, -12, -8) }) },
  { t: 16.5, d: 0.2, s: rk(REST, { mouth: M.o, blink: 0.85, bob: -9, sweat: 0.8, ...BR(-10, 6, -10, -6) }) },
  { t: 17.7, d: 0.3, s: rk(REST, { mouth: M.flat, blink: 0.1, bob: 0, sweat: 0.8, ...BR(-4, 7, -4, -7) }) },
  { t: 18.45, d: 0.12, s: rk(REST, { mouth: M.grin, wide: 0.4, sweat: 1, ...BR(-9, 10, -9, -10) }) },
  { t: 19.45, d: 0.25, s: rk(REST, { mouth: M.open, wide: 0.55, sweat: 1, ...BR(-9, 10, -9, -10) }) },
  { t: 21.1, d: 0.2, s: rk(REST, { mouth: { w: 13, up: -1, lo: 20 }, wide: 0.95, gazeX: 0.5, sweat: 1, ...BR(-13, 8, -13, -8) }) },
  { t: 23.2, d: 0.25, s: rk(REST, { mouth: M.eee, wide: 0.7, sweat: 1, tilt: 3, ...BR(-9, 12, -9, -12) }) },
  { t: 24.3, d: 0.6, s: rk(LIMP, { mouth: M.wow, wide: 0.6, dizzy: 1, lean: -16, bob: 150, tilt: -8, sweat: 1, ...BR(-12, 6, -12, -6) }) },
];
const KG = [ // ulang (tau = t - 71)
  { t: 0, d: 0.01, s: rk(CLIP, { mouth: M.small, gazeX: 0.6, sweat: 0.3, ...BR(-2, 3, -2, -3) }) },
  { t: 2.3, d: 0.4, s: rk(CLIP, { mouth: M.mid, gazeY: 0.5, sweat: 0.45, ...BR(-4, 7, -4, -7) }) },
  { t: 3.4, d: 0.3, s: rk(CLIP, { mouth: M.worry, wide: 0.5, gazeX: 0.5, sweat: 1, ...BR(-7, 11, -7, -11) }) },
  { t: 4.2, d: 0.3, s: rk(CLIP, { mouth: M.worry, gazeY: 0.4, sweat: 0.9, ...BR(-5, 9, -5, -9) }) },
  { t: 4.7, d: 0.35, s: rk(HIPS, { mouth: M.small, gazeY: 0, wide: 0.1, sweat: 0.6, lean: 0, ...BR(-4, 4, -4, -4), tilt: -2 }) },
  { t: 6.4, d: 0.3, s: rk(CLIP, { mouth: M.flat, blink: 0.15, gazeY: 0.5, sweat: 0.6, ...BR(2, 6, 2, -6) }) },
  { t: 6.9, d: 0.4, s: rk(CLIP, { mouth: M.small, gazeY: -0.1, sweat: 0.4, ...BR(-3, 4, -3, -4) }) },
  { t: 7.3, d: 0.3, s: rk(CLIP, { mouth: M.mid, wide: 0.3, yaw: 0.7, gazeX: 0.9, sweat: 0.5, ...BR(-6, 5, -6, -5) }) },
  { t: 8.5, d: 0.2, s: rk(REST, { mouth: M.mid, wide: 0.3, sweat: 0.5, ...BR(-5, 6, -5, -6) }) },
  { t: 9.8, d: 0.4, s: rk(REST, { mouth: M.small, yaw: 0.4, gazeX: 0.9, sweat: 0.5, ...BR(-6, 7, -6, -7) }) },
  { t: 12.4, d: 0.35, s: rk(REST, { mouth: M.smile2, yaw: 0.4, gazeX: 0.9, sweat: 0.35, ...BR(-7, 5, -7, -5) }) },
  { t: 16.4, d: 0.5, s: rk(REST, { mouth: M.smile, sweat: 0.15, ...BR(-6, 3, -6, -3) }) },
];
// --- Raka mahasiswa (kilas balik dan web)
const KS_ = [
  { t: 0, d: 0.01, s: rk(SEAT, { mouth: M.mid, ...BR(0, 6, 0, -6), sweat: 0.2 }) },
  { t: 27.9, d: 0.3, s: rk(SEAT, { mouth: M.mid, gazeX: -0.7, gazeY: -0.7, yaw: -0.3, sweat: 0.4, ...BR(-6, 8, -6, -8) }) },
  { t: 28.9, d: 0.4, s: rk(SEAT, { mouth: M.smile2, ...BR(-3, 2, -3, -2) }) },
  { t: 33.5, d: 0.3, s: rk(SEAT, { mouth: M.grin, happyEyes: 0.5, yaw: 0.3, gazeX: 0.5, ...BR(-6, 0, -6, 0) }) },
  { t: 36.0, d: 0.4, s: rk(SEAT, { mouth: M.smile2, yaw: 0.35, gazeX: 0.7, ...BR(-3, 3, -3, -3) }) },
  { t: 38.3, d: 0.3, s: rk(SEAT, { mouth: M.small, wide: 0.3, yaw: 0.2, ...BR(-6, 7, -6, -7) }) },
  { t: 40.4, d: 0.3, s: rk(SEAT, { mouth: M.flat, blink: 0.25, yaw: 0.4, gazeX: 0.8, ...BR(2, 0, 2, 0) }) },
  { t: 42.9, d: 0.3, s: rk(SEAT, { mouth: M.small, blink: 0.1, ...BR(0, 4, 0, -4) }) },
  { t: 44.95, d: 0.35, s: rk(SEAT, { mouth: M.worry, wide: 0.3, gazeY: -0.7, ...BR(-7, 10, -7, -10), sweat: 0.4 }) },
  { t: 47.0, d: 0.3, s: rk(SEAT, { mouth: M.mid, gazeY: -0.8, ...BR(-5, 7, -5, -7), sweat: 0.5 }) },
  { t: 50.8, d: 0.3, s: rk(SEAT, { mouth: M.worry, wide: 0.5, gazeY: -0.8, ...BR(-9, 11, -9, -11), sweat: 0.8 }) },
  { t: 54.0, d: 0.5, s: rk(REST, { mouth: M.small, blink: 0.1, ...BR(-3, 5, -3, -5) }) },
  { t: 55.3, d: 0.3, s: rk(REST, { mouth: M.small, wide: 0.4, sparkle: 0.5, yaw: 0.45, gazeX: 0.9, gazeY: -0.9, ...BR(-9, 3, -9, -3) }) },
  { t: 57.6, d: 0.3, s: rk(REST, { mouth: M.mid, yaw: 0.45, gazeX: 0.9, gazeY: -0.9, ...BR(-5, 6, -5, -6) }) },
  { t: 62.5, d: 0.3, s: rk(REST, { mouth: M.worry, wide: 0.3, yaw: 0.45, gazeX: 0.9, gazeY: -0.9, ...BR(-6, 11, -6, -11) }) },
  { t: 66.8, d: 0.25, s: rk(REST, { mouth: M.worry, wide: 0.35, yaw: 0.45, gazeX: 0.9, gazeY: -0.9, ...BR(-8, 12, -8, -12) }) },
  { t: 68.5, d: 0.4, s: rk(REST, { mouth: M.small, yaw: 0.45, gazeX: 0.9, gazeY: -0.9, ...BR(-6, 4, -6, -4) }) },
  { t: 69.7, d: 0.3, s: rk(REST, { mouth: M.smile2, sparkle: 0.6, yaw: 0.45, gazeX: 0.9, gazeY: -0.9, ...BR(-9, 3, -9, -3) }) },
];

// --- Pasien dan teman
const PKB = [
  { t: 0, d: 0.01, s: pasien('sopan', 'duduk', { yaw: -0.35, gazeX: -0.8 }) },
  { t: 9.9, d: 0.2, s: pasien('tanya', 'duduk', { yaw: -0.35, gazeX: -0.8 }) },
  { t: 12.5, d: 0.3, s: pasien('sopan', 'duduk', { yaw: -0.35, gazeX: -0.8 }) },
  { t: 17.9, d: 0.3, s: pasien('hangat', 'duduk', { yaw: -0.35, gazeX: -0.8 }) },
  { t: 19.5, d: 0.3, s: pasien('sopan', 'duduk', { yaw: -0.35, gazeX: -0.8, lean: -1.5 }) },
  { t: 21.0, d: 0.3, s: pasien('peduli', 'duduk', { yaw: -0.35, gazeX: -0.8, blush: 0.8 }) },
  { t: 24.35, d: 0.18, s: pasien('peduli', 'duduk', { yaw: -0.35, gazeX: -0.8, browL: { y: -12, rot: 12 }, browR: { y: -12, rot: -12 }, mouth: { w: 9, up: -1, lo: 14, cl: 0, cr: 0 }, armR: { wx: 262, wy: 380, ex: 306, ey: 470, finger: 0, front: 1 } }) },
];
const PKG = [
  { t: 0, d: 0.01, s: pasien('sopan', 'duduk', { yaw: -0.35, gazeX: -0.8 }) },
  { t: 10.0, d: 0.2, s: pasien('tanya', 'duduk', { yaw: -0.35, gazeX: -0.8 }) },
  { t: 12.6, d: 0.3, s: pasien('sopan', 'duduk', { yaw: -0.35, gazeX: -0.8 }) },
  { t: 16.0, d: 0.5, s: pasien('hangat', 'duduk', { yaw: -0.35, gazeX: -0.8, lean: 1 }) },
];
const FR = [
  { t: 0, d: 0.01, s: teman('santai', 'dagu', { yaw: -0.4, gazeX: -0.8 }) },
  { t: 39.9, d: 0.2, s: teman('jahil', 'dagu', { yaw: -0.4, gazeX: -0.9 }) },
  { t: 41.9, d: 0.3, s: teman('datar', 'dagu', { yaw: -0.4, gazeX: -0.9 }) },
  { t: 44.4, d: 0.3, s: teman('heran', 'dagu', { yaw: -0.4, gazeX: -0.9 }) },
];

const bagsF = pchip([[0, 0], [90, 0]]); // tidak dipakai (Raka tanpa kantung mata di video ini)

// ---------------------------------------------------------------- pertanyaan berlarian
const QB = [
  { txt: 'Sejak kapan?', dx: -330, dy: -120, lx: -90, ly: -360, acc: 'koper', dir: [-1, -0.2] },
  { txt: 'Di mana sakitnya?', dx: -110, dy: -400, lx: 140, ly: -420, acc: 'kacamata', dir: [-0.5, -1] },
  { txt: 'Ada demam?', dx: 200, dy: -390, lx: 330, ly: -300, acc: 'payung', dir: [0.5, -1] },
  { txt: 'Riwayat alergi?', dx: -360, dy: 110, lx: 330, ly: -140, acc: 'topi', dir: [-1, 0.15] },
  { txt: 'Obat apa saja?', dx: 330, dy: -250, lx: -230, ly: -240, acc: 'flag', dir: [1, -0.5] },
  { txt: 'Merokok?', dx: -320, dy: 300, lx: 380, ly: 20, acc: 'koper', dir: [-1, 0.5] },
];
function qbSvg(tau, hc, lorong) {
  let out = '';
  QB.forEach((q, i) => {
    const t0 = 2.2 + 0.4 * i, tf = 12.8 + 0.3 * i;
    const a = eob((tau - t0) / 0.3); if (a <= 0.01) return;
    const u = Math.max(0, tau - tf);
    const dist = u * u * 520 + u * 240;
    const hop = u > 0 ? -Math.abs(Math.sin(u * 13)) * 20 : Math.sin(tau * 1.6 + i) * 6;
    const dl = Math.hypot(q.dir[0], q.dir[1]);
    const bx = lorong ? q.lx : q.dx, by = lorong ? q.ly : q.dy;
    const x = hc[0] + bx + (q.dir[0] / dl) * dist, y = hc[1] + by + (q.dir[1] / dl) * dist + hop;
    if (x < -260 || x > 1340 || y < -300) return;
    const ph = u * 15, sw = u > 0 ? 34 : 4;
    const leg = (sx, phase) => { const a1 = Math.sin(phase) * sw; return `<g transform="translate(${sx} 34) rotate(${f1(a1)})"><path d="M0 0L0 30" stroke="#0F5F57" stroke-width="9" stroke-linecap="round"/><ellipse cx="${Math.sign(q.dir[0] || 1) * 5}" cy="35" rx="11" ry="6" fill="#0F5F57"/></g>`; };
    const acc = { koper: `<g transform="translate(112 18)">${R(-4, -2, 44, 32, '#8F5F3C', 6)}${R(10, -12, 16, 12, 'none', 5, 'stroke="#5B341C" stroke-width="5"')}${R(-4, 10, 44, 5, '#5B341C')}</g>`,
      kacamata: `<g transform="translate(-20 -22)">${R(-26, -8, 52, 20, '#1B2A33', 8)}${R(26, -8, 52, 20, '#1B2A33', 8)}${R(20, -2, 12, 4, '#1B2A33')}</g>`.replace('translate(-20 -22)', 'translate(60 -42)'),
      payung: `<g transform="translate(-100 -20)">${L('M0 70V0', '#8F5F3C', 6)}${P('M-46 8Q0 -52 46 8Z', '#E8665F')}${P('M-46 8Q-23 -10 0 8Q23 -10 46 8Z', '#fff')}</g>`,
      topi: `<g transform="translate(-30 -52)">${P('M-40 14Q0 -34 40 14Z', '#F8C038')}${R(-52, 12, 104, 8, '#F2A950', 4)}</g>`,
      flag: `<g transform="translate(110 -30)">${L('M0 60V-30', '#8F5F3C', 5)}${R(0, -30, 78, 36, '#E8665F', 6)}<text x="39" y="-4" text-anchor="middle" ${FONT} font-size="20" fill="#fff">CUTI</text></g>` }[q.acc];
    out += `<g transform="translate(${f1(x)} ${f1(y)}) rotate(${f1(u > 0 ? Math.sin(ph) * 5 : 0)}) scale(${(0.35 + 0.65 * a).toFixed(3)})" opacity="${clamp(a, 0, 1)}">`
      + leg(-34, ph) + leg(34, ph + Math.PI)
      + `<path d="M-30 32L-46 56L-8 36Z" fill="#fff"/>` + R(-98, -40, 196, 76, 'rgba(10,56,48,.22)', 28, 'transform="translate(5 7)"') + R(-98, -40, 196, 76, '#fff', 28) + `<path d="M-34 34L-52 62L-6 36Z" fill="#fff"/>`
      + `<text x="0" y="6" text-anchor="middle" ${FONT} font-size="${q.txt.length > 14 ? 25 : 28}" fill="#0F5F57">${q.txt}</text>` + acc + `</g>`;
  });
  return out;
}

// ---------------------------------------------------------------- konfigurasi adegan
const SC_FLASH = [
  { t: 27.85, n: 'kuliah', obj: 'pena' },
  { t: word('N12', 5, 's') - 0.2, n: 'lab', obj: 'tabung' },
  { t: word('N12', 7, 's') - 0.15, n: 'group', obj: 'spidol' },
  { t: 33.4, n: 'game', obj: 'gamepad', friend: true },
  { t: 35.9, n: 'kantin', obj: 'esteh', friend: true },
  { t: 46.85, n: 'kamar', obj: null },
];
const EX_REPLAY = 71.0, EX_BAD_END = 25.4, REWIND0 = 25.85, REWIND1 = 27.85;
const examScene = (mode, tau) => (tau < (mode === 'bad' ? 7.7 : 8.4) ? 'lorong' : 'periksa');
const rewindTau = (t) => EX_BAD_END * (1 - sm((t - REWIND0) / (REWIND1 - REWIND0 - 0.1)));
const doorOpen = (mode, tau) => (mode === 'bad' ? sm((tau - 6.45) / 0.9) : sm((tau - 7.25) / 0.9));

function roomInside(tauNow) {
  const ps = pasien('sopan', 'duduk', { yaw: 0.3, gazeX: 0.5 });
  return `<rect x="680" y="430" width="340" height="780" fill="#EAF4F2"/><rect x="680" y="1010" width="340" height="200" fill="#D3E6E1"/>`
    + R(716, 520, 150, 170, '#BFE6F5', 12) + R(704, 1000, 280, 10, '#B9D2CB')
    + `<g transform="translate(814 828) scale(.46)">${pasienSvg(idlePasien(ps, tauNow, 1.1), { bare: true, uid: 'pd' })}</g>` + R(700, 1096, 300, 34, '#D8B58C') + R(700, 1130, 300, 80, '#C4996B');
}
function sceneStr(name, t, o, part) {
  if (name === 'lorong') return part === 'fg' ? '' : lorongBg(t, o) ;
  if (name === 'periksa') return part === 'fg' ? periksaFg() : periksaBg(t, o) + periksaTop();
  if (name === 'game') return part === 'fg' ? gameFg() : gameBg(t) + gameTop();
  const S = SCENES[name];
  if (part === 'fg') return S.fg(t, o);
  const speeds = { kantin: 0.5, lab: 1.4, group: 2.2, kuliah: 3.2 };
  return S.bg(t, o) + (hasClock[name] ? clock(t * (speeds[name] || 1), 1) : '') + S.top(t, o);
}

// ---------------------------------------------------------------- kamera
const camKeys = [[0, 540, 960, 1], [24.15, 540, 960, 1], [24.45, 520, 905, 1.12], [25.8, 520, 905, 1.12], [25.9, 540, 960, 1], [89.2, 540, 960, 1], [90.2, 540, 701, 0.85], [120, 540, 701, 0.85]];
const camCx = pchip(camKeys.map((k) => [k[0], k[1]])), camCy = pchip(camKeys.map((k) => [k[0], k[2]])), camS = pchip(camKeys.map((k) => [k[0], k[3]]));

// ---------------------------------------------------------------- UI
const mk = (parent, html, attrs = {}) => { const g = document.createElementNS(NS, 'g'); for (const k in attrs) g.setAttribute(k, attrs[k]); g.innerHTML = html; parent.appendChild(g); return g; };
const setT = (g, x, y, s, o, r = 0) => { g.setAttribute('transform', `translate(${f1(x)} ${f1(y)}) rotate(${f1(r)}) scale(${s.toFixed(3)})`); g.setAttribute('opacity', clamp(o, 0, 1).toFixed(3)); };
const pill = (txt, bg = '#fff', fg = '#0A3830', fs = 36, w = 0) => { const ww = w || txt.length * fs * 0.6 + 56; return `${R(-ww / 2, 7, ww, fs + 28, 'rgba(10,56,48,.22)', (fs + 28) / 2)}${R(-ww / 2, 0, ww, fs + 28, bg, (fs + 28) / 2)}<text x="0" y="${fs + 2}" text-anchor="middle" ${FONT} font-size="${fs}" fill="${fg}">${txt}</text>`; };
const LB = {
  title: mk(ui, pill('Dok, saya kenapa?', '#0A3830', '#fff', 46, 560)),
  bayangan: mk(ui, `${R(-390, 8, 780, 130, 'rgba(10,56,48,.22)', 40)}${R(-390, 0, 780, 130, '#FFF1C6', 40)}<text x="0" y="52" text-anchor="middle" ${FONT} font-size="42" fill="#0A3830">BAYANGAN RAKA</text><text x="0" y="104" text-anchor="middle" ${FONT} font-size="33" fill="#7A4A00">kalau ia terus menunda latihan</text>`),
  rewind: mk(ui, `<g>${R(-120, -60, 240, 120, 'rgba(10,56,48,.85)', 40)}<path d="M-8 -34L-62 0L-8 34Z M52 -34L-2 0L52 34Z" fill="#fff"/></g>`),
  play: mk(ui, `${R(-300, 8, 600, 98, 'rgba(10,56,48,.22)', 49)}${R(-300, 0, 600, 98, '#fff', 49)}<path d="M-250 22L-206 49L-250 76Z" fill="#E8665F"/><text x="30" y="66" text-anchor="middle" ${FONT} font-size="38" fill="#0A3830">ulang dari pintu tadi</text>`),
  tag: mk(ui, pill('bayangan, belum terjadi', '#fff', '#0A3830', 26, 360)),
};
Object.values(LB).forEach((g) => g.setAttribute('opacity', 0));
let logoUri = '';
{ const b = await (await fetch('logo-full.webp')).blob(); logoUri = await new Promise((r) => { const fr = new FileReader(); fr.onload = () => r(fr.result); fr.readAsDataURL(b); }); }
const endG = {
  logo: mk(ui, `${R(-300, -52, 600, 190, 'rgba(10,56,48,.22)', 54)}${R(-300, -62, 600, 190, '#fff', 54)}<image href="${logoUri}" x="-240" y="-20" width="480" height="96.7"/>`),
  ban: mk(ui, `${R(-470, -42, 940, 100, 'rgba(10,56,48,.2)', 50)}${R(-470, -50, 940, 100, '#DDF5EA', 50)}<text x="0" y="18" text-anchor="middle" ${FONT} font-size="54" fill="#0A3830">Simulasi Dokter gratis</text>`),
  url: mk(ui, `${R(-290, -42, 580, 110, 'rgba(10,56,48,.25)', 55)}${R(-290, -50, 580, 110, '#0A3830', 55)}<text x="0" y="22" text-anchor="middle" ${FONT} font-size="66" fill="#F8C038">medcoel.com</text>`),
};
Object.values(endG).forEach((g) => g.setAttribute('opacity', 0));
const flashR = document.createElementNS(NS, 'rect'); flashR.setAttribute('width', 1080); flashR.setAttribute('height', 1920); flashR.setAttribute('fill', '#fff'); flashR.setAttribute('opacity', 0); over.appendChild(flashR);
const vhs = mk(over, '', { opacity: 0 });
const peekG = mk(ui, '', { 'clip-path': 'url(#peekClip)' });
// gelembung pikiran (bayangan masa depan) membawa bingkai beku
let freezeUri = '';
try { const rs = await fetch('freeze.jpg'); if (!rs.ok) throw new Error('no freeze'); const b = await rs.blob(); freezeUri = await new Promise((r) => { const fr = new FileReader(); fr.onload = () => r(fr.result); fr.readAsDataURL(b); }); } catch (e) { freezeUri = ''; }

// ---------------------------------------------------------------- takarir
const CHUNKS = [];
for (const L_ of DATA.lines) {
  let cur = [], len = 0;
  const flush = () => { if (cur.length) { CHUNKS.push({ words: cur, who: L_.who, t0: cur[0].s, t1: cur[cur.length - 1].e }); cur = []; len = 0; } };
  for (const w of L_.words) {
    if (len + w.w.length + 1 > 46 && cur.length) flush();
    cur.push(w); len += w.w.length + 1;
    if (/[.?!…]$/.test(w.w) && len >= 16) flush();
  }
  flush();
}
CHUNKS.forEach((c) => { c.show0 = c.t0 - 0.06; c.show1 = c.t1 + 0.16; });
let capIdx = -2;
function updateCaption(t) {
  if (CLEAN) return;
  let ci = -1;
  for (let i = 0; i < CHUNKS.length; i++) if (t >= CHUNKS[i].show0 && t <= CHUNKS[i].show1) { ci = i; break; }
  const box = $('capbox');
  if (ci !== capIdx) {
    capIdx = ci;
    if (ci < 0) box.innerHTML = '';
    else {
      const c = CHUNKS[ci];
      box.className = 'box' + (c.who === 'P' ? ' t' : c.who === 'R' ? ' r' : '');
      const tag = c.who === 'P' ? '<span class="tag">Pasien</span>' : c.who === 'R' ? '<span class="tag">Raka</span>' : '';
      box.innerHTML = tag + c.words.map((w) => `<span class="w fut">${w.w}</span>`).join('');
    }
  }
  $('cap').style.opacity = ci < 0 ? 0 : 1;
  if (ci < 0) return;
  const c = CHUNKS[ci];
  box.querySelectorAll('.w').forEach((s, i) => { const w = c.words[i]; s.className = 'w ' + (t >= w.s && t < w.e ? 'on' : t >= w.e ? 'past' : 'fut'); });
}

// ---------------------------------------------------------------- panel web
const webImg = $('webimg'), panel = $('panel');
const WEBSEG = [ // [v0, v1, r0, rate]
  [54.9, 57.7, 0.2, 1], [57.7, 59.0, 4.2, 1], [59.0, 60.9, 9.8, 1], [60.9, 62.2, 28.9, 1], [62.2, 66.0, 50.7, 1], [66.0, 68.4, 32.9, 1], [68.4, 70.7, 64.9, 1],
];
const WEB_ON = [54.9, 70.7];
function webR(t) { for (const [a, b, r0, k] of WEBSEG) if (t >= a && t < b) return r0 + (t - a) * k; return WEBSEG[WEBSEG.length - 1][2]; }
let webSrc = '';
async function setWeb(r) {
  const idx = clamp(Math.round(r * 30) + 1, 1, 3000);
  const src = `web/w${String(idx).padStart(5, '0')}.jpg`;
  if (src !== webSrc) { webSrc = src; webImg.src = src; try { await webImg.decode(); } catch (e) { /* lanjut */ } }
}

// ---------------------------------------------------------------- kartu daftar, tabel mingguan
const CHK = [['Teori', '#5BD09B'], ['Praktikum', '#5BD0E6'], ['Tugas', '#8E7CE8'], ['Main', '#F8C038'], ['Latihan kasus', '#E8665F']];
function checklistSvg(t) {
  const a = win(t, 36.15, 46.0, 0.3); if (a <= 0.01) return '';
  const s = 0.85 + 0.15 * eob((t - 36.15) / 0.4);
  const last = clamp((t - 38.2) / 0.3, 0, 1);
  const out2 = clamp((t - 45.0) / 0.5, 0, 1);
  let rows = '';
  CHK.forEach(([lab, col], i) => {
    if (i < 4) {
      const ra = eob((t - (36.4 + i * 0.3)) / 0.25), ck = sm((t - (36.7 + i * 0.3)) / 0.18);
      if (ra <= 0) return;
      rows += `<g transform="translate(0 ${i * 64}) scale(${clamp(ra, 0, 1.1)})" opacity="${clamp(ra, 0, 1)}">${R(0, 0, 320, 54, '#fff', 16)}${C(30, 27, 15, col)}<path d="M22 27l6 7l12 -14" fill="none" stroke="#fff" stroke-width="5" stroke-linecap="round" stroke-linejoin="round" opacity="${ck}"/><text x="58" y="36" ${FONT} font-size="26" fill="#0A3830">${lab}</text></g>`;
    } else if (last > 0) {
      const sh = t > 38.5 && t < 39.6 ? Math.sin(t * 40) * 3 : 0;
      const slide = out2 * 120;
      rows += `<g transform="translate(${f1(sh + slide)} ${i * 64}) scale(${clamp(eob(last), 0, 1.1)})" opacity="${1 - out2 * 0.9}">${R(0, 0, 320, 54, '#FFE3DF', 16)}${R(0, 0, 320, 54, 'none', 16, 'stroke="#E8665F" stroke-width="4"')}${R(18, 12, 30, 30, 'none', 8, 'stroke="#E8665F" stroke-width="5"')}<text x="58" y="36" ${FONT} font-size="26" fill="#B7332B">${lab}</text></g>`;
    }
  });
  return `<g transform="translate(40 ${252 + (1 - a) * -30}) scale(${s.toFixed(3)})" opacity="${a}">${R(-14, -14, 348, 352, 'rgba(10,56,48,.2)', 28, 'transform="translate(0 7)"')}${R(-14, -14, 348, 352, '#EAF4F2', 28)}${rows}</g>`;
}
function stripSvg(t) {
  const a = win(t, 47.0, 54.2, 0.3); if (a <= 0.01) return '';
  const names = ['Minggu ini', 'Minggu depan', 'Depannya', 'Depannya lagi'];
  const x0 = 62, bw = 234, gap = 10, y0 = 214, bh = 198;
  const tosses = [word('N17', 4, 's') - 0.1, word('N18', 5, 's') - 0.15, word('N18', 7, 's') + 0.35];
  let boxes = '';
  names.forEach((nm, i) => {
    const bx = x0 + i * (bw + gap);
    const pop = eob((t - (47.1 + i * 0.12)) / 0.3);
    boxes += `<g transform="translate(${bx} ${y0}) scale(${clamp(pop, 0, 1.08).toFixed(3)})" transform-origin="${bw / 2} ${bh / 2}">${R(0, 6, bw, bh, 'rgba(10,56,48,.2)', 24)}${R(0, 0, bw, bh, '#fff', 24)}${R(0, 0, bw, 44, i === 0 ? '#0F5F57' : '#8FA6A0', 24)}${R(0, 22, bw, 22, i === 0 ? '#0F5F57' : '#8FA6A0')}<text x="${bw / 2}" y="32" text-anchor="middle" ${FONT} font-size="24" fill="#fff">${nm}</text>`
      + `<g transform="translate(${bw / 2} ${bh - 8}) scale(.26)">${rakaSvg(idle(rk(REST, { mouth: i === 0 ? M.small : M.worry, ...BR(-4, 8, -4, -8), sweat: i === 0 ? 0 : 0.4 }), t + i), { bare: true, uid: 'mn' + i, shadow: false }).replace(/^/, `<g transform="translate(-200 -520)">`) + '</g>'}</g>`
      + `</g>`;
  });
  // bubble "Nanti aja" pada kotak yang menjawab
  let bub = '';
  [[1, 'N18', 5, 6], [2, 'N18', 6, 7], [3, 'N18', 7, 8]].forEach(([i, id, s0, s1], k) => {
    const tt = k === 0 ? word('N18', 6, 's') : k === 1 ? word('N18', 7, 's') + 0.55 : word('N18', 7, 's') + 1.05;
    const u = (t - tt) / 0.25; if (u < 0 || t > tt + 1.2) return;
    const bx = x0 + i * (bw + gap) + bw / 2;
    bub += `<g transform="translate(${bx} ${y0 + bh + 38}) scale(${clamp(eob(u), 0, 1.1)})">${R(-80, -26, 160, 50, '#FFF1C6', 22)}<path d="M-12 -26L0 -40L12 -26Z" fill="#FFF1C6"/><text x="0" y="8" text-anchor="middle" ${FONT} font-size="26" fill="#7A4A00">Nanti aja</text></g>`;
  });
  // map yang dioper
  let from = 0, to = 0, u = 0;
  if (t >= tosses[0]) { from = 0; to = 1; u = (t - tosses[0]) / 0.6; }
  if (t >= tosses[1]) { from = 1; to = 2; u = (t - tosses[1]) / 0.6; }
  if (t >= tosses[2]) { from = 2; to = 3; u = (t - tosses[2]) / 0.6; }
  const pos = (i) => [x0 + i * (bw + gap) + bw / 2, y0 + 118];
  const uu = clamp(u, 0, 1), p0 = pos(from), p1 = pos(to);
  const fx = lerp(p0[0], p1[0], sm(uu)), fy = lerp(p0[1], p1[1], sm(uu)) - Math.sin(uu * Math.PI) * 90;
  const fold = folderMini(fx, fy);
  return `<g opacity="${a}">${boxes}${bub}${fold}</g>`;
}
function folderMini(x, y) { return `<g transform="translate(${f1(x)} ${f1(y)}) scale(.46)">${P('M-70 -46H-18L-4 -62H70Q80 -62 80 -50V46Q80 58 68 58H-68Q-80 58 -80 46V-34Q-80 -46 -70 -46Z', '#E8665F')}${R(-80, -28, 160, 86, '#E8665F', 14)}<text x="0" y="30" text-anchor="middle" ${FONT} font-size="26" fill="#fff">LATIHAN</text><text x="0" y="52" text-anchor="middle" ${FONT} font-size="22" fill="#FFE3DF">KASUS</text></g>`; }

// ================================================================ render
const KX = 220, KY = 361.6, K = 1.6;
const rkPos = (v) => [540 + (v[0] - 200) * K, 760 + (v[1] - 249) * K];
const FX = 644.5, FY = 576.3, FK = 1.3;
const SXs = 360, KSs = 1.2, FLOOR = 1290;
const rkPosStand = (v) => [SXs + (v[0] - 200) * KSs, FLOOR + (v[1] - 778) * KSs];
let lastWeb = false;

function layout(t) {
  // kembalikan {mode, tau, rewind, scene (A), prev (untuk iris), r}
  if (t >= EX_REPLAY) { const tau = t - EX_REPLAY; const n = examScene('good', tau); return { kind: 'ex', mode: 'good', tau, n, iris: n === 'periksa' && tau - 8.4 < 0.3 ? { from: 'lorong', k: (tau - 8.4) / 0.3 } : null }; }
  if (t < REWIND0) { const tau = Math.min(t, EX_BAD_END); const n = examScene('bad', tau); return { kind: 'ex', mode: 'bad', tau, n, iris: n === 'periksa' && tau - 7.7 < 0.3 ? { from: 'lorong', k: (tau - 7.7) / 0.3 } : null }; }
  if (t < REWIND1) { const tau = rewindTau(t); return { kind: 'ex', mode: 'bad', tau, n: examScene('bad', tau), rewind: true, iris: null }; }
  let i = 0; while (i + 1 < SC_FLASH.length && t >= SC_FLASH[i + 1].t) i++;
  const c = SC_FLASH[i];
  const iris = t - c.t < 0.3 ? { from: i === 0 ? 'lorong' : SC_FLASH[i - 1].n, k: (t - c.t) / 0.3 } : null;
  return { kind: 'fb', n: c.n, cfg: c, iris };
}

async function renderFrame(t) {
  const f = Math.round(t * FPS);
  const lay = layout(t);
  const ex = lay.kind === 'ex';
  const tau = ex ? lay.tau : 0;
  const sceneT = ex ? tau : t;
  // ---- kamera
  let cam = `translate(540 960) scale(${camS(t).toFixed(4)}) translate(${-camCx(t).toFixed(2)} ${-camCy(t).toFixed(2)})`;
  if (ex && lay.mode === 'bad' && tau > 24.3 && tau < 24.8) { const sh = Math.sin(t * 90) * 7 * (1 - (tau - 24.3) / 0.5); cam += ` translate(${sh.toFixed(1)} ${(sh * 0.7).toFixed(1)})`; }
  G.cam.setAttribute('transform', NOCAM ? 'translate(0 0)' : cam);

  // ---- latar (A) + iris (B)
  const door = ex && lay.n === 'lorong' ? doorOpen(lay.mode, tau) : 0;
  const optsA = { door, room: () => roomInside(tau), piles: 1 };
  let A = lay.n, B = null, rB = 0;
  if (lay.iris) { A = lay.iris.from; B = lay.n; rB = sm(lay.iris.k) * 1500; }
  const stage = (n) => (n === 'lorong' || n === 'periksa');
  G.gA.innerHTML = sceneStr(A, sceneT, A === 'lorong' ? { door: A === lay.n ? door : 1, room: () => roomInside(tau) } : optsA, 'bg');
  G.gAfg.innerHTML = sceneStr(A, sceneT, {}, 'fg');
  if (B) {
    G.gB.innerHTML = sceneStr(B, sceneT, { door, room: () => roomInside(tau), piles: 1 }, 'bg'); G.gBfg.innerHTML = sceneStr(B, sceneT, {}, 'fg');
    G.clipBc.setAttribute('r', rB.toFixed(1));
    G.ring.innerHTML = rB < 1400 ? `<circle cx="540" cy="760" r="${rB.toFixed(1)}" fill="none" stroke="#fff" stroke-width="12" opacity=".95"/>` : '';
  } else { G.gB.innerHTML = ''; G.gBfg.innerHTML = ''; G.ring.innerHTML = ''; }
  const cur = B && rB > 420 ? B : (B ? A : A);
  const curN = lay.n; // adegan sasaran menentukan pakaian dan posisi (pergantian disamarkan flash)

  // ---- Raka
  const examScene_ = ex ? lay.n : null;
  const standing = ex && lay.n === 'lorong';
  const coat = ex;
  const webOn = t >= WEB_ON[0] && t < WEB_ON[1];
  let s;
  if (ex) {
    s = clone(stateAt(lay.mode === 'bad' ? KB : KG, tau, lerpState));
  } else s = clone(stateAt(KS_, t, lerpState));
  s.bags = 0; s.slump = 0;
  // lipsync / animasi prosedural
  const rEnv = envAt(DATA.envR, f);
  if (ex && lay.mode === 'bad') {
    if (tau >= 2.0 && tau < 5.5) { const m = Math.max(0, Math.sin(tau * 9)) * Math.max(0, Math.sin(tau * 2.1)); s.mouth.lo = s.mouth.up + 6 * m; } // berlatih berbisik
    if (tau >= 19.55 && tau < 20.75) s.mouth.lo = 4 + 14 * (0.5 + 0.5 * Math.sin(t * 7));
    if (tau >= 18.45 && tau < 19.5) s.tilt += Math.sin(t * 38) * 1.3;
    if (spk('N10', lay.rewind ? 0 : t)) { s.mouth.lo = lerp(s.mouth.up + 4, s.mouth.up + 15, rEnv); s.mouth.w = 20 + 3 * rEnv; }
    if (tau >= 23.4) s.dizzy = clamp((tau - 23.4) / 0.8, 0, 1) * (tau < 24.3 ? 0.9 : 1);
    s.dizzyT = (tau * 7);
    if (tau >= 24.3) s.tilt += Math.sin(tau * 20) * 2 * Math.max(0, 1 - (tau - 24.3) / 0.8);
    // bulatan keringat meningkat saat bayangan memburuk
  }
  if (ex && lay.mode === 'good') {
    if (tau >= 4.7 && tau < 6.1) { s.tilt += -3; s.lean = -2; s.bob += -6 * Math.sin(Math.PI * clamp((tau - 4.7) / 1.4, 0, 1)); }
    if (spk('R03', t)) { s.mouth.lo = lerp(s.mouth.up + 3, s.mouth.up + 20, rEnv); s.mouth.w = 12 + 4 * rEnv; }
  }
  if (!ex && t >= 62.4 && t < 62.9) { s.tilt += 0; }
  s = idle(s, sceneT);
  const rp = undefined;
  const sd = webOn ? null : null;
  let rkHtml, objHtml = '';
  if (standing) {
    const hold = !lay.rewind || true;
    G.rakaG.innerHTML = `<g transform="translate(${SXs - 200 * KSs} ${FLOOR - 778 * KSs}) scale(${KSs})">${rakaSvg(s, { bare: true, uid: 'rk', shadow: false, coat: true, coatLong: true })}</g>`;
    if (lay.mode === 'bad' || (lay.mode === 'good' && !(tau >= 4.7 && tau < 6.4))) objHtml = heldObject2('papan', SXs, FLOOR - 270 * KSs + 20 + (s.bob || 0), 1.0);
  } else {
    G.rakaG.innerHTML = `<g clip-path="url(#seatClip)"><g transform="translate(${KX} ${KY}) scale(${K})">${rakaSvg(s, { bare: true, uid: 'rk', shadow: false, coat })}</g></g>`;
    const cfg = lay.cfg;
    if (!ex && cfg && cfg.obj && !webOn && !(t >= 46.85)) {
      const h = armShape('R', s.armR).hand, p = rkPos(h);
      objHtml = (cfg.obj === 'gamepad' ? heldObject2('gamepad', p[0], p[1] + 14, 1.1) : heldObject(cfg.obj, p[0], p[1] + 18, 1.1)) + C(p[0] - 1, p[1], 33, '#F7BC8E');
    }
  }
  G.objG.innerHTML = objHtml;
  const hide = webOn;
  G.rakaG.setAttribute('opacity', hide ? 0 : 1); G.objG.setAttribute('opacity', hide ? 0 : 1);

  // ---- pasien / teman
  let figs = '';
  const showPatient = ex && lay.n === 'periksa' && !(B && rB < 430);
  if (showPatient) {
    let ps = clone(stateAt(lay.mode === 'bad' ? PKB : PKG, tau, lerpPasien));
    const pt = lay.mode === 'bad' ? tau : tau - 8.4 + 8.4; // tau lokal
    const speaks = (lay.mode === 'bad' && spk('P01', t) && !lay.rewind) || (lay.mode === 'good' && spk('P01b', t));
    if (speaks) { const e = envAt(DATA.envP, f); ps.mouth.lo = lerp(ps.mouth.up + 1, ps.mouth.up + 18, e); ps.mouth.w = 12 + 3 * e; }
    else if (lay.mode === 'bad' && lay.rewind && tau > 9.9 && tau < 12.4) ps.mouth.lo = ps.mouth.up + 8 * Math.abs(Math.sin(tau * 12));
    ps = idlePasien(ps, tau, 0.9);
    figs = `<g transform="translate(${FX} ${FY}) scale(${FK})">${pasienSvg(ps, { bare: true, uid: 'ps' })}</g>`;
  } else if (!ex && lay.cfg && lay.cfg.friend && !webOn) {
    let fs = clone(stateAt(FR, t, lerpTeman));
    if (t >= 40.0 && t < 41.9) { fs.mouth.lo = fs.mouth.up + 3 + 12 * Math.abs(Math.sin(t * 11)); }
    fs = idleTeman(fs, t, 0.8);
    figs = `<g transform="translate(${FX} ${FY}) scale(${FK})">${temanSvg(fs, { bare: true, uid: 'tm' })}</g>`;
  }
  G.friend.innerHTML = figs;

  // ---- ekstra di dalam kamera
  let x1 = '', x2 = '';
  if (ex) {
    const hc = standing ? [SXs, FLOOR + (655 - 778) * 0 + (249 - 778) * KSs] : [540, 760];
    if (lay.mode === 'bad') x1 += qbSvg(tau, standing ? [SXs, 700] : [540, 760], standing);
    else if (standing && tau >= 6.05 && tau < 7.0) x1 += `<g transform="translate(${SXs + 190} 470)" opacity="${win(tau, 6.05, 7.0, 0.15)}">${R(-70, -34, 140, 68, 'rgba(10,56,48,.2)', 30, 'transform="translate(4 6)"')}${R(-70, -34, 140, 68, '#fff', 30)}<path d="M-30 30L-44 56L-2 32Z" fill="#fff"/>${C(-26, 0, 7, '#0F5F57')}${C(0, 0, 7, '#0F5F57')}${C(26, 0, 7, '#0F5F57')}</g>`;
    if (tau >= 23.9 && tau < 25.9 && lay.mode === 'bad' && !standing) {
      for (let i = 0; i < 3; i++) { const a = tau * 5 + i * 2.1; x1 += `<path transform="translate(${f1(540 + Math.cos(a) * 170)} ${f1(520 + Math.sin(a) * 34)}) rotate(${f1(a * 40)})" d="M0 -20Q4 -4 20 0Q4 4 0 20Q-4 4 -20 0Q-4 -4 0 -20Z" fill="#F8C038"/>`; }
    }
  } else {
    x1 += checklistSvg(t) + stripSvg(t);
    // balon ucapan teman
    const bt = win(t, 40.15, 41.95, 0.2);
    if (bt > 0.01) x1 += `<g transform="translate(800 520) scale(${(0.6 + 0.4 * eob((t - 40.15) / 0.3)).toFixed(3)})" opacity="${bt}">${R(-150, -40, 300, 78, 'rgba(10,56,48,.22)', 30, 'transform="translate(4 6)"')}${R(-150, -40, 300, 78, '#fff', 30)}<path d="M-30 36L-50 66L0 38Z" fill="#fff"/><text x="0" y="10" text-anchor="middle" ${FONT} font-size="32" fill="#3A2E7A">Yuk latihan kasus?</text></g>`;
  }
  G.gX1.innerHTML = x1;
  G.gX2.innerHTML = x2;
  // gelembung pikiran bayangan di kilas balik
  const thA = !ex ? win(t, 28.3, 35.85, 0.35) : 0;
  if (thA > 0.01 && freezeUri) {
    const sc = 0.5 + 0.5 * eob((t - 28.3) / 0.45);
    G.gTh.innerHTML = `<g opacity="${thA}"><circle cx="300" cy="640" r="12" fill="#fff"/><circle cx="340" cy="690" r="18" fill="#fff"/><g transform="translate(205 440) scale(${sc.toFixed(3)}) translate(-205 -440)"><circle cx="205" cy="440" r="162" fill="#fff"/><g clip-path="url(#thClip)"><image href="${freezeUri}" x="${205 - 640 * 0.43}" y="${440 - 880 * 0.43}" width="${1080 * 0.43}" height="${1920 * 0.43}"/></g></g></g>`;
  } else G.gTh.innerHTML = '';
  // buku/tag
  setT(LB.tag, 205, 622, 1, thA > 0.01 ? thA * clamp((t - 28.5) / 0.3, 0, 1) : 0);

  // ---- label & efek
  setT(LB.title, 540, 232, 0.9 + 0.1 * eob((t - 0.15) / 0.3), win(t, 0.15, 2.7, 0.25));
  setT(LB.bayangan, 540, 262, 1, win(t, 25.55, 28.3, 0.22));
  const rw = lay.rewind ? Math.sin(Math.PI * clamp((t - REWIND0) / (REWIND1 - REWIND0), 0, 1)) : 0;
  setT(LB.rewind, 540 + Math.sin(t * 40) * 5 * rw, 1000, 1 + 0.1 * Math.sin(t * 18), rw);
  setT(LB.play, 540, 262, 1, win(t, 71.25, 73.4, 0.2));
  // plat sepia/vhs
  let filt = 'none';
  if (lay.rewind) { const k = Math.sin(Math.PI * clamp((t - REWIND0) / (REWIND1 - REWIND0), 0, 1)); filt = `sepia(${(0.6 * k).toFixed(2)}) hue-rotate(${(-20 * k).toFixed(1)}deg) saturate(${(1.15).toFixed(2)})`; }
  else if (t >= EX_BAD_END && t < REWIND0) { filt = 'saturate(.6) brightness(1.05)'; }
  $('world').style.filter = filt;
  if (lay.rewind) {
    let h = ''; for (let i = 0; i < 16; i++) { const y = ((i * 131 + t * 1300) % 1920); h += `<rect x="0" y="${y.toFixed(0)}" width="1080" height="${6 + (i % 3) * 5}" fill="#fff" opacity="${(0.12 * rw).toFixed(3)}"/>`; }
    vhs.innerHTML = h; vhs.setAttribute('opacity', 1);
  } else { vhs.innerHTML = ''; vhs.setAttribute('opacity', 0); }
  // flash di pergantian pakaian/posisi
  const flashes = [[7.7, 0.12, 0.8], [REWIND0 - 0.04, 0.1, 0.5], [27.85, 0.14, 0.9], [71.0, 0.16, 0.9], [79.4, 0.12, 0.8], [24.3, 0.08, 0.5]];
  let fo = 0; for (const [ft, fd, fa] of flashes) { const u = (t - ft) / fd; if (u >= 0 && u < 1) fo = Math.max(fo, fa * (1 - u)); }
  flashR.setAttribute('opacity', fo.toFixed(3));

  // ---- panel web + Raka mengintip
  const wo = win(t, WEB_ON[0], WEB_ON[1], 0.3);
  G.webDim.setAttribute('opacity', (0.72 * wo).toFixed(3));
  panel.style.opacity = wo > 0.01 ? '1' : '0';
  panel.style.transform = `translateY(${f1((1 - sm(wo)) * 70)}px) scale(${(0.93 + 0.07 * sm(wo)).toFixed(3)})`;
  if (wo > 0.01) await setWeb(webR(t));
  if (webOn && !CLEAN) {
    const s2 = clone(s); s2.armL = clone(REST.armL); s2.armR = clone(REST.armR);
    peekG.innerHTML = `<g transform="translate(40 1143.7) scale(0.7)">${rakaSvg(s2, { bare: true, uid: 'pk', shadow: false })}</g>` + R(0, 1384, 1080, 8, '#0A3830');
  } else peekG.innerHTML = '';

  // ---- kartu akhir
  const evv = (g, a, x, y, sc = 1) => setT(g, x, y, sc * (0.7 + 0.3 * eob((t - a) / 0.35)), clamp((t - a) / 0.12, 0, 1));
  evv(endG.logo, 90.4, 540, 300); evv(endG.ban, word('N25', 9, 's') - 0.1, 540, 495); evv(endG.url, 93.7, 540, 620);
  updateCaption(t);
}
window.renderFrame = renderFrame;
window.__ready = true;
