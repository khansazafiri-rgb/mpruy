// "Masih Dua Minggu": orkestrasi. renderFrame(t) deterministik (t = detik video).
import { raka, rakaSvg, lerpState, armShape, idle, PALETTE_ON_DARK } from './raka.js';
import { teman, temanSvg, lerpTeman, idleTeman } from './teman.js';
import { SCENES, hasClock, clock, heldObject, beachBg, TOP, FRONT, R, C, P, L, T, FONT, HAND } from './world.js';

const NS = 'http://www.w3.org/2000/svg';
const $ = (id) => document.getElementById(id);
const clamp = (x, a, b) => Math.max(a, Math.min(b, x));
const lerp = (a, b, t) => a + (b - a) * t;
const sm = (x) => { x = clamp(x, 0, 1); return x * x * (3 - 2 * x); };
const eob = (x) => { x = clamp(x, 0, 1); const c1 = 1.70158, c3 = c1 + 1; return 1 + c3 * Math.pow(x - 1, 3) + c1 * Math.pow(x - 1, 2); };
const win = (t, a, b, f = 0.25) => clamp((t - a) / f, 0, 1) * clamp((b - t) / f, 0, 1);
const f1 = (n) => (Math.round(n * 10) / 10);
await document.fonts.load('800 40px "Plus Jakarta Sans"'); await document.fonts.load('700 30px "Plus Jakarta Sans"'); await document.fonts.load('700 40px Caveat'); await document.fonts.ready;
const DATA = await (await fetch('data.json')).json();
const FPS = DATA.fps;
const LINE = Object.fromEntries(DATA.lines.map((l) => [l.id, l]));
const word = (id, i, edge = 's') => LINE[id].words[Math.min(i, LINE[id].words.length - 1)][edge];

// ---------------------------------------------------------------- pchip
function pchip(keys) {
  const n = keys.length, h = [], d = [], m = new Array(n).fill(0);
  for (let i = 0; i < n - 1; i++) { h[i] = keys[i + 1][0] - keys[i][0]; d[i] = (keys[i + 1][1] - keys[i][1]) / h[i]; }
  if (n > 2) {
    for (let i = 1; i < n - 1; i++) { if (d[i - 1] * d[i] <= 0) m[i] = 0; else { const w1 = 2 * h[i] + h[i - 1], w2 = h[i] + 2 * h[i - 1]; m[i] = (w1 + w2) / (w1 / d[i - 1] + w2 / d[i]); } }
  }
  m[0] = d[0]; m[n - 1] = d[n - 2];
  return (x) => {
    if (x <= keys[0][0]) return keys[0][1]; if (x >= keys[n - 1][0]) return keys[n - 1][1];
    let i = 0; while (x > keys[i + 1][0]) i++;
    const t = (x - keys[i][0]) / h[i], t2 = t * t, t3 = t2 * t;
    return (2 * t3 - 3 * t2 + 1) * keys[i][1] + (t3 - 2 * t2 + t) * h[i] * m[i] + (-2 * t3 + 3 * t2) * keys[i + 1][1] + (t3 - t2) * h[i] * m[i + 1];
  };
}

// ---------------------------------------------------------------- struktur dunia
const world = $('world'), ui = $('ui'), over = $('over');
world.innerHTML = `<defs><clipPath id="clipB"><circle id="clipBc" cx="540" cy="760" r="0"/></clipPath><mask id="holeM"><rect x="-10" y="-10" width="1100" height="1940" fill="#fff"/><circle id="holeC" cx="540" cy="760" r="0" fill="#000"/></mask><clipPath id="peekClip"><rect x="0" y="1000" width="1080" height="388"/></clipPath></defs>
<g id="cam"><g id="gA"></g><g id="gB" clip-path="url(#clipB)"></g><g id="gX1"></g><g id="friend"></g><g id="rakaG"></g><g id="objG"></g><g id="gAfg"></g><g id="gBfg" clip-path="url(#clipB)"></g><g id="gX2"></g><g id="gX3"></g><g id="ring"></g></g>
<rect id="webDim" x="0" y="0" width="1080" height="1920" fill="#0A3830" opacity="0"/>
<g id="hook" mask="url(#holeM)"><rect x="0" y="0" width="1080" height="1920" fill="#0A3830"/></g>`;
const G = Object.fromEntries(['cam', 'gA', 'gB', 'gX1', 'friend', 'rakaG', 'objG', 'gAfg', 'gBfg', 'gX2', 'gX3', 'ring', 'webDim', 'hook', 'clipBc', 'holeC'].map((k) => [k, $(k)]));

// ---------------------------------------------------------------- Raka: keadaan
const SEAT = { armL: { wx: 166, wy: 526, ex: 98, ey: 500, finger: 0, front: 1 }, armR: { wx: 322, wy: 466, ex: 354, ey: 486, finger: 0, front: 0 } };
const ARMS_PANIC = { armL: { wx: 176, wy: 468, ex: 92, ey: 524, finger: 0, front: 1 }, armR: { wx: 226, wy: 468, ex: 308, ey: 524, finger: 0, front: 1 } };
const ARMS_PRAY = { armL: { wx: 180, wy: 440, ex: 94, ey: 510, finger: 0, front: 1 }, armR: { wx: 222, wy: 440, ex: 306, ey: 510, finger: 0, front: 1 } };
const ARMS_REST = { armL: { wx: 166, wy: 526, ex: 98, ey: 500, finger: 0, front: 1 }, armR: { wx: 234, wy: 526, ex: 302, ey: 500, finger: 0, front: 1 } };
const ARMS_TAP = { armL: SEAT.armL, armR: { wx: 330, wy: 392, ex: 362, ey: 450, finger: 0.4, fa: -70, front: 1 } };
const M = { smile: { w: 20, up: 11, lo: 11 }, smile2: { w: 17, up: 9, lo: 9 }, small: { w: 14, up: 6, lo: 6 }, mid: { w: 12, up: 3, lo: 3 }, flat: { w: 12, up: 0, lo: 0 }, worry: { w: 11, up: -4, lo: -4 }, sad: { w: 12, up: -8, lo: -8 }, open: { w: 12, up: -2, lo: 14 }, wow: { w: 13, up: 1, lo: 26 }, grin: { w: 24, up: 6, lo: 30 }, o: { w: 8, up: -3, lo: 16 } };
const BR = (ly, lr, ry, rr) => ({ browL: { y: ly, rot: lr }, browR: { y: ry, rot: rr } });
const rk = (ov = {}, expr = 'netral', pose = null) => raka(expr, pose, { ...SEAT, ...ov });

const RK = [
  { t: 0, d: 0.01, s: rk({ mouth: M.smile, ...BR(0, 0, 0, 0) }) },
  { t: 3.7, d: 0.6, s: rk({ mouth: M.smile, yaw: 0.2, gazeX: 0.7, gazeY: -0.8, ...BR(-6, 0, -6, 0), tilt: 2 }) },
  { t: 8.3, d: 0.3, s: rk({ mouth: M.smile2, yaw: 0.5, gazeX: 0.9, ...BR(-2, 0, -2, 0) }) },
  { t: 10.82, d: 0.18, s: rk({ mouth: { w: 24, up: 8, lo: 26 }, sparkle: 1, wide: 0.55, ...BR(-12, 0, -12, 0), lean: -1.5, bob: -4 }) },
  { t: 11.62, d: 0.2, s: rk({ mouth: M.grin, shades: 1, shadesY: 4, ...BR(-6, 0, -6, 0), lean: -2.5, tilt: -3 }) },
  { t: 12.9, d: 0.8, s: rk({ mouth: M.grin, shades: 1, shadesY: 22, ...BR(-10, 0, -10, 0), lean: -3, tilt: -4 }) },
  { t: 14.45, d: 0.12, s: rk({ mouth: M.smile, happyEyes: 1, tilt: 3, ...BR(-8, 0, -8, 0), lean: -1 }) },
  { t: 15.55, d: 0.35, s: rk({ mouth: M.smile2, ...BR(0, 2, 0, -2) }) },
  { t: 17.97, d: 0.35, s: rk({ mouth: M.small, ...BR(-1, 6, -1, -6) }) },
  { t: 20.29, d: 0.35, s: rk({ mouth: M.mid, ...BR(-2, 9, -2, -9), blink: 0.12 }) },
  { t: 22.32, d: 0.14, s: rk({ mouth: M.worry, wide: 0.35, ...BR(-8, 13, -8, -13), bob: 3 }) },
  { t: 24.35, d: 0.45, s: rk({ mouth: M.flat, ...BR(0, 12, 0, -12), blink: 0.3, gazeY: 0.7, tilt: 4, gazeX: -0.3 }) },
  { t: 27.78, d: 0.18, s: rk({ mouth: M.open, wide: 0.9, ...BR(-12, 9, -12, -9), gazeX: 0.8, yaw: 0.25 }) },
  { t: 29.7, d: 0.25, s: rk({ ...ARMS_REST, mouth: M.worry, wide: 0.45, ...BR(-6, 11, -6, -11) }) },
  { t: 32.5, d: 0.35, s: rk({ ...ARMS_REST, mouth: M.worry, wide: 0.7, ...BR(-9, 11, -9, -11), blink: 0.1 }, 'netral') },
  { t: 35.42, d: 0.12, s: raka('kaget', null, { ...ARMS_PANIC, mouth: M.wow, wide: 1, fxBurst: 1, ...BR(-16, 9, -16, -9), bob: -6 }) },
  { t: 36.78, d: 0.42, s: rk({ ...ARMS_PRAY, mouth: { w: 13, up: 6, lo: 6 }, wide: 0.55, sparkle: 0.7, ...BR(-12, 15, -12, -15), tilt: 4, gazeY: -0.5 }) },
  { t: 38.66, d: 0.04, s: rk({ ...ARMS_PRAY, mouth: M.flat, blink: 0.45, ...BR(3, 0, 3, 0), tilt: 0 }) },
  { t: 39.75, d: 0.7, s: rk({ ...ARMS_REST, mouth: M.flat, blink: 0.4, ...BR(2, 2, 2, -2), tilt: 1 }) },
  { t: 44.55, d: 0.4, s: rk({ ...ARMS_REST, mouth: M.small, ...BR(-3, 4, -3, -4), blink: 0.1, gazeX: -0.4 }) },
  { t: 46.2, d: 0.3, s: rk({ mouth: M.mid, ...BR(-3, 6, -3, -6), yaw: 0.45, gazeX: 0.9, gazeY: -0.9 }) },
  { t: 49.8, d: 0.25, s: rk({ mouth: M.small, wide: 0.3, ...BR(-8, 5, -8, -5), yaw: 0.45, gazeX: 0.9, gazeY: -0.9 }) },
  { t: 53.72, d: 0.15, s: rk({ mouth: M.worry, wide: 0.25, ...BR(-6, 12, -6, -12), yaw: 0.45, gazeX: 0.9, gazeY: -0.9 }) },
  { t: 54.9, d: 0.4, s: rk({ mouth: M.mid, ...BR(-2, 6, -2, -6), blink: 0.15, yaw: 0.45, gazeX: 0.9, gazeY: -0.9 }) },
  { t: 56.95, d: 0.3, s: rk({ ...ARMS_REST, mouth: M.flat, blink: 0.35, ...BR(-6, 0, -6, 0), yaw: -0.4, gazeX: -0.8, gazeY: 0.2 }) },
  { t: 58.9, d: 0.3, s: rk({ ...ARMS_REST, mouth: M.small, blink: 0.15, ...BR(-4, 4, -4, -4) }) },
  { t: 59.8, d: 0.3, s: rk({ mouth: M.mid, ...BR(-2, 6, -2, -6), yaw: 0.45, gazeX: 0.9, gazeY: -0.9, blink: 0.1 }) },
  { t: 61.3, d: 0.3, s: rk({ mouth: M.o, wide: 0.45, sparkle: 0.5, ...BR(-12, 4, -12, -4), yaw: 0.45, gazeX: 0.9, gazeY: -0.9 }) },
  { t: 62.5, d: 0.4, s: rk({ mouth: M.small, wide: 0.1, ...BR(-4, 4, -4, -4), yaw: 0.45, gazeX: 0.9, gazeY: -0.9 }) },
  { t: 63.75, d: 0.25, s: rk({ mouth: M.flat, blink: 0.38, ...BR(2, 0, 2, 0), yaw: 0.35, gazeX: 0.6 }) },
  { t: 65.5, d: 0.25, s: rk({ mouth: M.flat, blink: 0.45, ...BR(3, 0, 3, 0), yaw: 0.0, gazeX: 0 }) },
  { t: 68.3, d: 0.5, s: rk({ mouth: M.small, blink: 0.2, ...BR(0, 3, 0, -3), yaw: 0.0, gazeX: 0 }) },
  { t: 69.3, d: 0.5, s: rk({ mouth: M.smile2, blink: 0.12, ...BR(-3, 4, -3, -4), gazeY: 0.2 }) },
  { t: 77.1, d: 0.3, s: rk({ mouth: M.smile, blink: 0.1, ...BR(-5, 3, -5, -3), tilt: 2, gazeY: 0.35 }) },
];
function stateAt(keys, t, lerpFn) {
  let i = 0; while (i + 1 < keys.length && t >= keys[i + 1].t) i++;
  if (i === 0) return keys[0].s;
  const k = keys[i], prev = keys[i - 1].s;
  const u = sm((t - k.t) / k.d);
  return u >= 1 ? k.s : lerpFn(prev, k.s, u);
}
const bagsF = pchip([[0, 0], [11, 0], [15.5, 0.12], [17.9, 0.3], [20.3, 0.46], [24.3, 0.72], [27.7, 0.9], [29.7, 1], [90, 1]]);
const slumpF = pchip([[0, 0], [11, 0], [15.5, 1], [20, 7], [24, 13], [29.7, 19], [38, 22], [44, 18], [50, 12], [58, 8], [70, 6], [90, 6]]);
const sweatF = pchip([[0, 0], [27.7, 0], [28.2, 0.7], [29.6, 0.5], [32, 0.9], [35.4, 1], [36.8, 0.4], [38.6, 0], [90, 0]]);

// ---------------------------------------------------------------- kartu tab (ruang Raka)
const SUBJ = ['Anatomi', 'Fisiologi', 'Biokimia', 'Histologi', 'Farmakologi', 'Patologi', 'Mikrobiologi', 'Parasitologi', 'Ilmu Gizi', 'Biostatistik', 'Embriologi', 'Imunologi', 'Neuroanatomi', 'Radiologi', 'Forensik', 'Epidemiologi', 'Kardiologi', 'Pulmonologi', 'Nefrologi', 'Gastro', 'Ilmu Bedah', 'Ilmu Anak', 'Obgyn', 'Psikiatri', 'Dermatologi', 'THT', 'Mata', 'Neurologi', 'Etika Medis', 'Bioetik', 'Anestesi', 'Genetika'];
const CARDS = (() => {
  const a = [];
  const left = [[150, 520], [926, 560], [136, 770], [940, 800], [150, 1010], [926, 1040], [330, 320], [760, 316], [128, 1190], [950, 1200], [140, 330], [940, 340]];
  left.forEach(([x, y], i) => a.push({ x, y, s: 1, lab: SUBJ[a.length] }));
  const second = [[60, 640], [1020, 680], [70, 880], [1010, 920], [60, 1120], [1020, 1130], [520, 270], [930, 440], [150, 430], [900, 1100], [260, 1090], [830, 1080]];
  second.forEach(([x, y]) => a.push({ x, y, s: 0.8, lab: SUBJ[a.length] }));
  const third = [[48, 520], [1032, 560], [40, 760], [1040, 800], [60, 1020], [1020, 1020], [420, 262], [690, 262]];
  third.forEach(([x, y]) => a.push({ x, y, s: 0.64, lab: SUBJ[a.length] }));
  return a;
})();
const COL = ['#E8665F', '#0A7A67', '#F8C038', '#8E7CE8', '#5BD0E6', '#F2A950'];
CARDS.forEach((c, i) => {
  c.col = COL[i % 6];
  c.t0 = i < 8 ? 29.78 + 0.29 * i : i < 12 ? 32.7 + 0.2 * (i - 8) : 39.9 + 0.12 * (i - 12);
  c.t1 = i === 0 ? 1e9 : 44.62 + 0.045 * i;
});
function cardsSvg(t) {
  let out = '';
  const jit = t >= 35.42 && t < 36.8;
  CARDS.forEach((c, i) => {
    const o = (t - c.t0) / 0.26; if (o <= 0) return;
    const e = eob(o), out1 = clamp((c.t1 - t) / 0.18, 0, 1); if (out1 <= 0) return;
    const bob = Math.sin(t * 1.7 + i * 1.3) * 5, jx = jit ? Math.sin(t * 61 + i * 2.3) * 4 : 0, jy = jit ? Math.cos(t * 53 + i) * 4 : 0;
    const sc = c.s * (0.3 + 0.7 * e) * (0.4 + 0.6 * out1), rot = Math.sin(i * 2.1) * 4;
    out += `<g transform="translate(${f1(c.x + jx)} ${f1(c.y + bob + jy)}) rotate(${f1(rot)}) scale(${sc.toFixed(3)})" opacity="${clamp(e, 0, 1) * out1}">`
      + R(-118, -26, 236, 74, 'rgba(10,56,48,.2)', 20) + R(-118, -34, 236, 74, '#fff', 20) + R(-118, -34, 236, 26, '#EAF0F4', 20) + R(-118, -18, 236, 10, '#EAF0F4') + C(-96, -21, 8, c.col)
      + `<text x="-80" y="26" ${FONT} font-size="27" fill="#172B38">${c.lab}</text>` + R(-100, -8, 40, 5, '#D5DEE4', 3) + `</g>`;
  });
  return out;
}

// ---------------------------------------------------------------- kalender di muka meja
const CH = Array.from({ length: 14 }, (_, k) => ({ d: 14 - k, x: 96 + k * 64 }));
const BUSY = { 13: [15.62, 'P'], 12: [16.4, 'P'], 10: [18.02, 'T'], 9: [18.8, 'T'], 8: [19.4, 'T'], 7: [20.4, 'K'], 6: [22.4, 'T'], 5: [23.2, 'T'], 4: [24.6, 'P'] };
const FALL = { 14: 26.55, 11: 26.7, 3: 26.85, 2: 27.0, 1: 27.15 };
function chipsSvg(t) {
  if (t < 2.2 || t > 29.7) return '';
  let out = '';
  const fade = clamp((29.7 - t) / 0.3, 0, 1);
  CH.forEach((c, k) => {
    const t0 = 2.2 + k * 0.07, e = eob((t - t0) / 0.25); if (e <= 0) return;
    const b = BUSY[c.d], busy = b && t >= b[0];
    let y = FRONT + 24, rot = 0, op = 1;
    const fl = FALL[c.d];
    if (fl && t >= fl) { const u = t - fl; y += 2600 * u * u * 0.5 * 0.5; rot = u * 160; op = clamp(1 - u * 1.4, 0, 1); if (op <= 0) return; }
    const pop = busy ? 1 + 0.18 * Math.max(0, 1 - (t - b[0]) / 0.25) : 1;
    out += `<g transform="translate(${c.x + 28} ${f1(y + 26)}) rotate(${f1(rot)}) scale(${(clamp(e, 0, 1.1) * pop).toFixed(3)})" opacity="${op * fade}">`
      + R(-28, -22, 56, 52, 'rgba(10,56,48,.22)', 14) + R(-28, -26, 56, 52, busy ? '#E8665F' : '#9DE0BD', 14)
      + `<text x="0" y="${busy ? 2 : 8}" text-anchor="middle" ${FONT} font-size="${busy ? 21 : 27}" fill="${busy ? '#fff' : '#0A3830'}">${c.d}</text>`
      + (busy ? `<text x="0" y="20" text-anchor="middle" ${FONT} font-size="17" fill="#FFE3DF">${b[1]}</text>` : '') + `</g>`;
  });
  return out;
}

// ---------------------------------------------------------------- pantai: papan, ombak, map
const FOLDS = [['Anatomi', '#F8C038'], ['Fisiologi', '#5BD0E6'], ['Biokimia', '#E8665F'], ['Histologi', '#8E7CE8'], ['Farmako', '#5BD09B'], ['Patologi', '#F2A950']];
function folder(x, y, lab, col, rot = 0, s = 1) {
  return `<g transform="translate(${f1(x)} ${f1(y)}) rotate(${f1(rot)}) scale(${s})">${P('M-70 -46 H-18 L-4 -62 H70 Q80 -62 80 -50 V46 Q80 58 68 58 H-68 Q-80 58 -80 46 V-34 Q-80 -46 -70 -46Z', col)}${R(-80, -28, 160, 86, 'rgba(255,255,255,.35)', 14)}${R(-80, -28, 160, 86, col, 14)}${L('M-52 6H52M-52 26H20', 'rgba(23,43,56,.35)', 7)}<text x="0" y="-6" text-anchor="middle" ${FONT} font-size="24" fill="#172B38">${lab}</text></g>`;
}
function beachExtras(t, o) {
  const tau = o.tau;
  let out = '';
  const sx = 210, sy = 1090;
  const sign = (txt, fill, tw) => `${L(`M0 0V-170`, '#A77449', 12)}<g transform="translate(0 -230)">${R(-160, -48, 320, 96, 'rgba(10,56,48,.25)', 16, 'transform="translate(0 8)"')}${R(-160, -48, 320, 96, fill, 16)}<text x="0" y="16" text-anchor="middle" ${FONT} font-size="${tw}" fill="#fff" letter-spacing="1">${txt}</text></g>`;
  if (o.nosign) { /* gelembung kecil: tanpa papan */ } else if (!o.storm && tau < 0) {
    out += `<g transform="translate(${sx} ${sy}) rotate(${f1(Math.sin(t * 1.2) * 1.4)})">${sign('LIBURAN', '#E8665F', 50)}</g>`;
  } else {
    const xc = lerp(1700, -100, sm((tau - 0.25) / 1.2));
    const fly = clamp((tau - 1.1) / 0.4, 0, 1);
    if (fly < 1) {
      const sw = fly > 0 ? `translate(${f1(-520 * fly)} ${f1(-260 * Math.sin(fly * Math.PI) - 80 * fly)}) rotate(${f1(-150 * fly)})` : '';
      out += `<g transform="translate(${sx} ${sy})"><g transform="${sw}" opacity="${f1(1 - clamp((fly - 0.7) / 0.3, 0, 1))}">${sign('LIBURAN', '#E8665F', 50)}</g></g>`;
    }
    if (tau > 0.2 && tau < 1.7) {
      const k = 0;
      out += `<g>${P(`M${f1(xc - 900)} 1300 L${f1(xc - 900)} 960 Q${f1(xc - 560)} 820 ${f1(xc - 160)} 880 Q${f1(xc + 40)} 910 ${f1(xc + 120)} 990 Q${f1(xc + 200)} 1120 ${f1(xc + 60)} 1300Z`, '#2B8DA3')}`
        + P(`M${f1(xc - 900)} 1000 L${f1(xc - 900)} 960 Q${f1(xc - 560)} 820 ${f1(xc - 160)} 880 Q${f1(xc + 40)} 910 ${f1(xc + 120)} 990 Q${f1(xc + 60)} 960 ${f1(xc - 120)} 940 Q${f1(xc - 500)} 880 ${f1(xc - 900)} 1000Z`, '#EAF8FB')
        + FOLDS.map(([lab, col], i) => folder(xc - 120 - i * 150, 835 - Math.sin(t * 7 + i) * 10 + (i % 2) * 18, lab, col, -14 + i * 7 + Math.sin(t * 5 + i) * 6, 0.86)).join('') + `</g>`;
    }
    if (tau > 1.5) {
      const u = eob((tau - 1.5) / 0.28), sc = lerp(2.2, 1, clamp(u, 0, 1.2));
      out += `<g transform="translate(${sx} ${sy}) scale(${sc.toFixed(3)})" opacity="${clamp((tau - 1.5) / 0.08, 0, 1)}">${sign('H-3 UJIAN', '#0A3830', 40)}</g>`;
    }
  }
  return out;
}
function bgFor(name, t, o) {
  const S = SCENES[name];
  if (name === 'pantai') return beachBg(t, { storm: o.storm }) + beachExtras(t, o);
  return S.bg(t, o);
}
function sceneStr(name, t, o, part) {
  const S = SCENES[name];
  if (part === 'fg') return S.fg(t, o);
  const speeds = { kantin: 0.5, lab: 1.4, group: 2.2, kuliah: 3.2 };
  return bgFor(name, t, o) + (hasClock[name] ? clock(t * (speeds[name] || 1), 1) : '') + S.top(t, o);
}

// ---------------------------------------------------------------- linimasa adegan
const BASE = [
  { t: 0, n: 'kantin', iris: 0, obj: 'esteh', friend: true },
  { t: 11.62, n: 'pantai', iris: 0.22, obj: 'kelapa', storm: 0 },
  { t: 14.4, n: 'kantin', iris: 0, obj: 'esteh', friend: true, snap: true },
  { t: 15.52, n: 'lab', iris: 0.3, obj: 'tabung' },
  { t: 17.94, n: 'group', iris: 0.3, obj: 'spidol' },
  { t: 20.26, n: 'kuliah', iris: 0.3, obj: 'pena' },
  { t: 24.32, n: 'jalan', iris: 0.3, obj: 'hp', dark: true },
  { t: 27.74, n: 'pantai', iris: 0.28, obj: 'kelapa', real3: true },
  { t: 29.62, n: 'kamar', iris: 0.3, obj: null },
  { t: 63.62, n: 'kantin', iris: 0.32, obj: 'esteh', friend: true },
];
const INSET = [
  { n: 'pantai', cx: 540, cy: 700, keys: [[14.4, 1700], [14.95, 340], [15.5, 340]], ring: true },
  { n: 'pantai', cx: 540, cy: 680, keys: [[63.62, 0], [64.02, 430], [67.75, 430], [68.3, 0]], ring: true },
  { n: 'pantai', cx: 540, cy: 760, keys: [[69.05, 0], [70.0, 640], [90, 640]], ring: true },
];
const insetFns = INSET.map((e) => pchip(e.keys));

// kamera: [t, cx, cy, s]
const camKeys = [[0, 540, 960, 1], [36.55, 540, 960, 1], [37.0, 540, 835, 1.7], [38.58, 540, 835, 1.7], [38.68, 540, 845, 1.86], [39.7, 540, 845, 1.86], [41.7, 540, 900, 1.2], [43.6, 540, 960, 0.95], [44.4, 540, 960, 0.95], [45.1, 540, 960, 1], [70.5, 540, 960, 1], [71.6, 540, 701, 0.85], [90, 540, 701, 0.85]];
const camCx = pchip(camKeys.map((k) => [k[0], k[1]])), camCy = pchip(camKeys.map((k) => [k[0], k[2]])), camS = pchip(camKeys.map((k) => [k[0], k[3]]));

// ---------------------------------------------------------------- label & UI
const mk = (parent, html, attrs = {}) => { const g = document.createElementNS(NS, 'g'); for (const k in attrs) g.setAttribute(k, attrs[k]); g.innerHTML = html; parent.appendChild(g); return g; };
const setT = (g, x, y, s, o, r = 0) => { g.setAttribute('transform', `translate(${f1(x)} ${f1(y)}) rotate(${f1(r)}) scale(${s.toFixed(3)})`); g.setAttribute('opacity', clamp(o, 0, 1).toFixed(3)); };
function plate(big, w = 330) {
  return `${R(0, 8, w, 136, 'rgba(10,56,48,.25)', 30)}${R(0, 0, w, 136, '#0A3830', 30)}<text x="${w / 2}" y="104" text-anchor="middle" ${FONT} font-size="104" fill="#fff" letter-spacing="-2">${big}</text>`;
}
function subPill(txt, bg = '#F8C038', fg = '#0A3830', fs = 32) {
  const w = txt.length * fs * 0.66 + 54;
  return `${R(0, 6, w, 58, 'rgba(10,56,48,.22)', 29)}${R(0, 0, w, 58, bg, 29)}<text x="${w / 2}" y="41" text-anchor="middle" ${FONT} font-size="${fs}" fill="${fg}" letter-spacing=".5">${txt}</text>`;
}
const LB = {
  slam: mk(ui, `${R(-420, -190, 840, 380, 'rgba(0,0,0,.25)', 70, 'transform="translate(0 14)"')}${R(-420, -190, 840, 380, '#0A3830', 70, 'stroke="#F8C038" stroke-width="10"')}<text x="0" y="40" text-anchor="middle" ${FONT} font-size="210" fill="#fff" letter-spacing="-4">H-14</text><text x="0" y="150" text-anchor="middle" ${FONT} font-size="100" fill="#F8C038" letter-spacing="6">UJIAN</text>`),
  h14: mk(ui, `${R(0, 8, 460, 84, 'rgba(10,56,48,.22)', 42)}${R(0, 0, 460, 84, '#0A3830', 42)}<text x="230" y="60" text-anchor="middle" ${FONT} font-size="46" fill="#fff">H-14 <tspan fill="#F8C038">UJIAN</tspan></text>`),
  tiga: mk(ui, `${R(0, 6, 360, 78, 'rgba(10,56,48,.22)', 39)}${R(0, 0, 360, 78, '#fff', 39)}<g transform="translate(46 40)"><circle r="22" fill="none" stroke="#E8665F" stroke-width="7"/><path d="M0 -4V-14M0 -4L9 3" stroke="#E8665F" stroke-width="5" stroke-linecap="round"/><rect x="-6" y="-32" width="12" height="7" rx="3" fill="#E8665F"/></g><text x="214" y="56" text-anchor="middle" ${FONT} font-size="42" fill="#0A3830">3 detik</text>`),
  h13: mk(ui, plate('H-13')), h10: mk(ui, plate('H-10')), h7: mk(ui, plate('H-7')), h3: mk(ui, plate('H-3')),
  praktikum: mk(ui, subPill('PRAKTIKUM')), kelompok: mk(ui, subPill('TUGAS KELOMPOK', '#8E7CE8', '#fff', 30)), kuliah: mk(ui, subPill('KULIAH')), tugasbaru: mk(ui, subPill('+ TUGAS BARU', '#E8665F', '#fff', 30)),
  malam: mk(ui, subPill('PULANG MALAM', '#fff', '#0A3830', 32)),
  ujian: mk(ui, subPill('UJIAN', '#E8665F', '#fff', 32)),
  tab: mk(ui, `${R(0, 6, 430, 78, 'rgba(10,56,48,.22)', 39)}${R(0, 0, 430, 78, '#fff', 39)}<text id="tabn" x="215" y="55" text-anchor="middle" ${FONT} font-size="40" fill="#0A3830">8 tab terbuka</text>`),
};
Object.values(LB).forEach((g) => g.setAttribute('opacity', 0));
// zonk: 3 lampu merah
const zonkG = mk(ui, [-90, 0, 90].map((x) => `<g transform="translate(${x} 0)">${C(0, 6, 36, 'rgba(10,56,48,.25)')}${C(0, 0, 36, '#7A1E18')}<circle class="zl" cx="0" cy="0" r="30" fill="#FF3B30"/></g>`).join('') + `<text x="0" y="86" text-anchor="middle" ${FONT} font-size="36" fill="#fff" opacity="0">.</text>`);
zonkG.setAttribute('opacity', 0);
const zl = [...zonkG.querySelectorAll('.zl')];
// buku ensiklopedia
const bookG = mk(world.querySelector('#gX3'), `<g transform="translate(0 0)">${R(-200, -26, 420, 370, 'rgba(0,0,0,.18)', 22, 'transform="translate(14 16)"')}${R(-210, -40, 420, 370, '#7A4A2B', 22)}${R(-196, -28, 392, 346, '#A5683F', 14)}${R(-210, -40, 40, 370, '#5B341C', 18)}${R(-110, 40, 270, 110, '#F7E0B8', 10)}<text x="25" y="110" text-anchor="middle" ${FONT} font-size="31" fill="#5B341C" letter-spacing="0">ENSIKLOPEDIA</text>${L('M-110 190H160M-110 232H130M-110 274H100', '#7A4A2B', 9)}</g>`);
bookG.setAttribute('opacity', 0);
// kartu akhir
let logoUri = '';
{ const b = await (await fetch('logo-full.webp')).blob(); logoUri = await new Promise((r) => { const fr = new FileReader(); fr.onload = () => r(fr.result); fr.readAsDataURL(b); }); }
const endG = {
  logo: mk(ui, `${R(-300, -52, 600, 190, 'rgba(10,56,48,.22)', 54)}${R(-300, -62, 600, 190, '#fff', 54)}<image href="${logoUri}" x="-240" y="-20" width="480" height="96.7"/>`),
  ban: mk(ui, `${R(-470, -42, 940, 100, 'rgba(10,56,48,.2)', 50)}${R(-470, -50, 940, 100, '#DDF5EA', 50)}<text x="0" y="18" text-anchor="middle" ${FONT} font-size="54" fill="#0A3830">38.400 soal + pembahasan</text>`),
  url: mk(ui, `${R(-290, -42, 580, 110, 'rgba(10,56,48,.25)', 55)}${R(-290, -50, 580, 110, '#0A3830', 55)}<text x="0" y="22" text-anchor="middle" ${FONT} font-size="66" fill="#F8C038">medcoel.com</text>`),
  gratis: mk(ui, `${R(-86, -30, 172, 60, '#E8665F', 30)}<text x="0" y="12" text-anchor="middle" ${FONT} font-size="32" fill="#fff" letter-spacing="1">GRATIS</text>`),
};
Object.values(endG).forEach((g) => g.setAttribute('opacity', 0));
// pop sparkle bintang (Raka, "dua minggu")
const sparkG = mk(over, '', { opacity: 0 });
// efek layar
const flashR = document.createElementNS(NS, 'rect'); flashR.setAttribute('width', 1080); flashR.setAttribute('height', 1920); flashR.setAttribute('fill', '#fff'); flashR.setAttribute('opacity', 0); over.appendChild(flashR);
const vigG = mk(over, `<defs><radialGradient id="vg" cx="50%" cy="42%" r="75%"><stop offset="55%" stop-color="#0A1830" stop-opacity="0"/><stop offset="100%" stop-color="#0A1830" stop-opacity="1"/></radialGradient></defs><rect width="1080" height="1920" fill="url(#vg)"/>`, { opacity: 0 });
over.insertBefore(vigG, over.firstChild);

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
  let ci = -1;
  for (let i = 0; i < CHUNKS.length; i++) if (t >= CHUNKS[i].show0 && t <= CHUNKS[i].show1) { ci = i; break; }
  const box = $('capbox');
  if (ci !== capIdx) {
    capIdx = ci;
    if (ci < 0) box.innerHTML = '';
    else {
      const c = CHUNKS[ci];
      box.className = 'box' + (c.who === 'T' ? ' t' : c.who === 'R' ? ' r' : '');
      const tag = c.who === 'T' ? '<span class="tag">Teman</span>' : c.who === 'R' ? '<span class="tag">Raka</span>' : '';
      box.innerHTML = tag + c.words.map((w, i) => `<span class="w fut">${w.w}</span>`).join('');
    }
  }
  $('cap').style.opacity = ci < 0 ? 0 : 1;
  if (ci < 0) return;
  const c = CHUNKS[ci];
  box.querySelectorAll('.w').forEach((s, i) => { const w = c.words[i]; s.className = 'w ' + (t >= w.s && t < w.e ? 'on' : t >= w.e ? 'past' : 'fut'); });
}

// ---------------------------------------------------------------- panel web
const webImg = $('webimg'), panel = $('panel');
const WEB = [[46.2, 56.9], [59.7, 63.7]];
function webR(t) {
  if (t < 48.5) return 0.7 + (t - 46.2);
  if (t < 50.707) return 3.0 + (t - 48.5) * 1.45;
  if (t < 55.107) return 6.2 + (t - 50.707);
  if (t < 57) return 17.6 + (t - 55.107);
  return 11.9 + (t - 59.7);
}
let webSrc = '';
async function setWeb(r) {
  const idx = clamp(Math.round(r * 30) + 1, 1, 609);
  const src = `web/w${String(idx).padStart(5, '0')}.jpg`;
  if (src !== webSrc) { webSrc = src; webImg.src = src; try { await webImg.decode(); } catch (e) {} }
}
const peekG = mk(ui, '', { 'clip-path': 'url(#peekClip)' });

// ---------------------------------------------------------------- util lipsync
const envAt = (arr, f) => { const i = clamp(f, 0, arr.length - 1); return clamp((arr[Math.max(0, i - 1)] + arr[i] * 2 + arr[Math.min(arr.length - 1, i + 1)]) / 4, 0, 1); };
const spk = (id, t) => t >= LINE[id].clip0 + 0.02 && t <= LINE[id].clip1 - 0.02;

// ---------------------------------------------------------------- Teman: keadaan
const FR = [
  { t: 0, d: 0.01, s: teman('santai', 'dagu') },
  { t: 3.8, d: 0.5, s: teman('santai', 'dagu', { yaw: -0.35, gazeX: -0.7 }) },
  { t: 8.35, d: 0.25, s: teman('jahil', 'dagu', { yaw: -0.3, gazeX: -0.8 }) },
  { t: 11.7, d: 0.25, s: teman('jahil', 'dagu', { yaw: -0.35, gazeX: -0.9 }) },
  { t: 14.45, d: 0.15, s: teman('heran', 'duduk', { yaw: -0.6, gazeX: -0.9 }) },
  { t: 63.7, d: 0.01, s: teman('datar', 'dagu', { yaw: -0.45, gazeX: -0.9 }) },
  { t: 63.95, d: 0.2, s: teman('jahil', 'dagu', { yaw: -0.4, gazeX: -0.9 }) },
  { t: 65.5, d: 0.3, s: teman('datar', 'duduk', { yaw: -0.45, gazeX: -0.9 }) },
  { t: 67.75, d: 0.18, s: teman('geli', 'dagu', { yaw: -0.4, gazeX: -0.8 }) },
  { t: 68.9, d: 0.5, s: teman('santai', 'dagu', { yaw: -0.4, gazeX: -0.8 }) },
  { t: 76.9, d: 0.3, s: teman('jahil', 'dagu', { yaw: -0.35, gazeX: -0.6 }) },
];

// ================================================================ render
const KX = 220, KY = 361.6, K = 1.6;
const rkPos = (v) => [540 + (v[0] - 200) * K, 760 + (v[1] - 249) * K];
const FX = 644.5, FY = 576.3, FK = 1.3;
let lastRk = '';

async function renderFrame(t) {
  const f = Math.round(t * FPS);
  // ---- kamera
  G.cam.setAttribute('transform', `translate(540 960) scale(${camS(t).toFixed(4)}) translate(${-camCx(t).toFixed(2)} ${-camCy(t).toFixed(2)})`);
  const shk = t >= 38.62 && t < 38.95 ? Math.sin(t * 90) * 6 * (1 - (t - 38.62) / 0.33) : t >= 27.75 && t < 28.2 ? Math.sin(t * 70) * 4 : t >= 29.2 && t < 29.5 ? Math.sin(t * 80) * 5 : 0;
  if (shk) G.cam.setAttribute('transform', G.cam.getAttribute('transform') + ` translate(${shk.toFixed(1)} ${(shk * 0.6).toFixed(1)})`);

  // ---- adegan dasar + iris / inset
  let bi = 0; while (bi + 1 < BASE.length && t >= BASE[bi + 1].t) bi++;
  const base = BASE[bi]; let A = base, B = null, rB = 0, cxB = 540, cyB = 760, ringB = false;
  if (bi > 0 && base.iris > 0 && t - base.t < base.iris) { A = BASE[bi - 1]; B = base; rB = sm((t - base.t) / base.iris) * 1500; ringB = true; }
  for (let i = 0; i < INSET.length; i++) { const e = INSET[i], r = insetFns[i](t); if (t >= e.keys[0][0] && t <= e.keys[e.keys.length - 1][0] && r > 1) { if (A.n === 'kantin' && !B) { B = { n: e.n, inset: true }; rB = r; cxB = e.cx; cyB = e.cy; ringB = e.ring; } } }
  const stormK = (n) => (n.real3 ? sm((t - n.t) / 0.45) : 0);
  const optsFor = (n, inset) => ({ storm: stormK(n), tau: n.real3 ? t - n.t : -1, nosign: !!inset && rB < 480 });
  G.gA.innerHTML = sceneStr(A.n, t, { ...optsFor(A), piles: pilesF(t) }, 'bg');
  G.gAfg.innerHTML = sceneStr(A.n, t, {}, 'fg');
  if (B) {
    G.gB.innerHTML = sceneStr(B.n, t, optsFor(B.inset ? { n: 'pantai' } : B, B.inset), 'bg'); G.gBfg.innerHTML = sceneStr(B.n, t, {}, 'fg');
    G.clipBc.setAttribute('cx', cxB); G.clipBc.setAttribute('cy', cyB); G.clipBc.setAttribute('r', rB.toFixed(1));
    G.ring.innerHTML = ringB && rB < 1400 ? `<circle cx="${cxB}" cy="${cyB}" r="${rB.toFixed(1)}" fill="none" stroke="#fff" stroke-width="12" opacity=".95"/><circle cx="${cxB}" cy="${cyB}" r="${(rB + 12).toFixed(1)}" fill="none" stroke="rgba(10,56,48,.25)" stroke-width="6"/>` : '';
  } else { G.gB.innerHTML = ''; G.gBfg.innerHTML = ''; G.ring.innerHTML = ''; }
  const cur = B && B.iris ? (rB > 420 ? B : A) : A;       // objek di tangan ikut adegan setelah iris melewati tangan
  const friendOn = (B && B.iris ? (rB > 500 ? B : A) : A).friend;
  const darkNow = (B && B.iris ? (rB > 30 ? B : A) : A).dark;

  // ---- ekstra di belakang karakter (kartu tab) & di meja (kalender, buku)
  const inRoom = A.n === 'kamar' || (B && B.n === 'kamar');
  G.gX1.innerHTML = inRoom ? cardsSvg(t) : '';
  G.gX2.innerHTML = chipsSvg(t) + folderSvg(t);
  // buku ensiklopedia
  const bk = win(t, 57.3, 59.5, 0.18);
  const bu = eob((t - 57.3) / 0.3);
  bookG.setAttribute('opacity', clamp(bk, 0, 1));
  bookG.setAttribute('transform', `translate(300 ${f1(1000 + (1 - clamp(bu, 0, 1)) * -500 + (bk < 1 ? (1 - bk) * 80 : 0))}) rotate(${f1(-6 + (1 - clamp(bu, 0, 1)) * 14)}) scale(${(0.72 * (t > 59.2 ? Math.max(0.01, 1 - (t - 59.2) / 0.3) : 1)).toFixed(3)})`);

  // ---- teman
  const fv = friendOn && !(t >= 46.2 && t < 63.6) ? 1 : 0;
  if (fv) {
    let fs = stateAt(FR, t, lerpTeman); fs = JSON.parse(JSON.stringify(fs));
    const lt = Math.max(spk('T01', t) ? 1 : 0, 0);
    if (spk('T01', t) || spk('T02', t)) { const e = envAt(DATA.envT, f); fs.mouth.lo = lerp(fs.mouth.up + 1, fs.mouth.up + 20, e); fs.mouth.w = 13 + 3 * e; fs.tilt += Math.sin(t * 9) * 0.8 * e; }
    if (t >= 67.75 && t < 68.8) fs.bob += Math.sin(t * 34) * 2.2;       // tertawa tertahan
    fs = idleTeman(fs, t, 0.8);
    G.friend.innerHTML = `<g transform="translate(${FX} ${FY}) scale(${FK})">${temanSvg(fs, { bare: true, uid: 'tm' })}</g>`;
  } else G.friend.innerHTML = '';

  // ---- Raka
  const webOn = WEB.some(([a, b]) => t >= a && t < b);
  let s = stateAt(RK, t, lerpState); s = JSON.parse(JSON.stringify(s));
  s.bags = bagsF(t); s.slump = slumpF(t); s.sweat = Math.max(s.sweat || 0, sweatF(t));
  // pandangan memindai kartu tab
  if (t >= 29.7 && t < 33.0) {
    const ks = [[29.7, 0, 0]];
    for (let i = 0; i < 8; i++) { const c = CARDS[i], tt = c.t0 + 0.05; ks.push([tt, clamp((c.x - 540) / 280, -1, 1), clamp((c.y - 760) / 360, -1, 1)]); }
    ks.push([32.5, 0, 0]); ks.push([33.0, 0, 0]);
    const gx = pchip(ks.map((k) => [k[0], k[1]]))(t), gy = pchip(ks.map((k) => [k[0], k[2]]))(t);
    s.gazeX = gx; s.gazeY = gy; s.yaw = gx * 0.55; s.tilt += gx * 2;
  }
  if (t >= 44.55 && t < 46.2) { s.yaw = Math.sin((t - 44.55) * 5) * 0.4; s.gazeX = Math.sin((t - 44.55) * 5) * 0.9; }
  // sparkle bintang kecil + efek senang saat "dua minggu"
  if (spk('R01', t)) { const e = envAt(DATA.envR, f); s.mouth.lo = lerp(s.mouth.up + 4, s.mouth.up + 30, e); s.mouth.w = 11 + 4 * e; }
  if (spk('R02', t)) { const e = envAt(DATA.envR, f); s.mouth.lo = lerp(s.mouth.up, s.mouth.up + 10, e); }
  // lengan mengetuk saat menutup tab
  if (t >= 44.6 && t < 46.1) { const u = (t - 44.6) / 0.28; const tap = Math.max(0, Math.sin(u * Math.PI * 2 * 1.2)); s.armR = { ...s.armR, wx: lerp(322, 330, 1), wy: lerp(466, 410 - tap * 16, 1), ex: 360, ey: 452, finger: 0.4, fa: -70, front: 1 }; }
  s = idle(s, t);
  const holdK = !webOn && cur.obj && !(t >= 35.42 && t < 39.7) && !(cur.real3 && t > 28.75) && !(t >= 59.7 && t < 63.6) ? 1 : 0;
  const rise = t < 0.85 ? 1 - eob((t - 0.42) / 0.45) : 0;
  const rp = darkNow ? PALETTE_ON_DARK : undefined;
  const rkHtml = rakaSvg(s, { bare: true, uid: 'rk', shadow: false, palette: rp });
  G.rakaG.innerHTML = `<g transform="translate(${KX} ${f1(KY + rise * 520)}) scale(${K})">${rkHtml}</g>`;
  G.rakaG.setAttribute('opacity', webOn || t < 0.42 ? 0 : 1);
  if (holdK) {
    const h = armShape('R', s.armR).hand, p = rkPos(h);
    const sw = Math.sin(t * 2.1) * 0.6;
    G.objG.innerHTML = heldObject(cur.obj, p[0], p[1] + 18 + rise * 520, 1.1) + C(p[0] - 1, p[1] + rise * 520, 33, '#F7BC8E');
    G.objG.setAttribute('opacity', webOn || t < 0.42 ? 0 : 1);
  } else G.objG.innerHTML = '';
  // objek terlempar saat gelombang (kelapa)
  if (B === null && A.real3 && t > 28.75 && t < 29.35) {
    const u = (t - 28.75) / 0.65; G.objG.innerHTML = heldObject('kelapa', lerp(760, -150, u), 1150 - 110 * Math.sin(u * Math.PI), 1.1);
  }
  // ---- Raka mengintip di bawah panel web
  if (webOn) {
    const s2 = JSON.parse(JSON.stringify(s)); s2.armL = { ...ARMS_REST.armL }; s2.armR = { ...ARMS_REST.armR };
    peekG.innerHTML = `<g transform="translate(40 1143.7) scale(0.7)">${rakaSvg(s2, { bare: true, uid: 'pk', shadow: false })}</g>`
      + R(0, 1384, 1080, 8, '#0A3830');
  } else peekG.innerHTML = '';

  // ---- hook: slam, mask, flash
  const holeR = sm((t - 0.42) / 0.45) * 1500;
  G.holeC.setAttribute('r', holeR.toFixed(1));
  G.hook.setAttribute('opacity', t < 0.9 ? 1 : 0);
  // plat slam
  if (t < 1.1) {
    const u = t - 0.0; const sc = u < 0.14 ? lerp(2.6, 1, eob(u / 0.14)) : lerp(1, 0.3, sm((u - 0.62) / 0.42));
    const px = lerp(540, 70 + 230, sm((u - 0.62) / 0.42)), py = lerp(900, 300 + 40, sm((u - 0.62) / 0.42));
    const shake = u > 0.1 && u < 0.35 ? Math.sin(u * 140) * 9 * (1 - (u - 0.1) / 0.25) : 0;
    setT(LB.slam, px + shake, py, sc, u < 0.03 ? 0 : 1 - clamp((u - 1.02) / 0.08, 0, 1));
  } else LB.slam.setAttribute('opacity', 0);
  setT(LB.h14, 70, 262, 0.9 + 0.1 * eob((t - 1.0) / 0.3), win(t, 1.05, 11.5, 0.25));
  setT(LB.tiga, 70, 360, 1, win(t, word('N03', 1, 's') - 0.15, 7.9, 0.2));
  // montage labels (kiri atas)
  const lab = (g, a, b) => setT(g, 70, 256, 0.85 + 0.15 * eob((t - a) / 0.25), win(t, a, b, 0.18));
  lab(LB.h13, 15.52, 17.94); lab(LB.h10, 17.94, 20.26); lab(LB.h7, 20.26, 24.32); lab(LB.h3, 27.76, 29.6);
  const sub = (g, a, b, y = 410) => setT(g, 70, y, 0.8 + 0.2 * eob((t - a) / 0.25), win(t, a, b, 0.16));
  sub(LB.praktikum, word('N06', 1, 's') - 0.05, 17.94); sub(LB.kelompok, word('N07', 1, 's') - 0.05, 20.26); sub(LB.kuliah, word('N08', 1, 's') - 0.05, 24.32);
  sub(LB.tugasbaru, word('N08', 2, 's') - 0.1, 24.32, 480);
  sub(LB.malam, 24.4, 27.7, 256); sub(LB.ujian, 28.5, 29.6, 410);
  const ntab = Math.min(CARDS.filter((c) => t >= c.t0).length, 32);
  const tn = Math.min(32, Math.round(ntab * (32 / CARDS.length) + (t > 40 ? 0 : 0)));
  $('tabn') && ($('tabn').textContent = `${ntab >= CARDS.length ? 32 : Math.round(ntab * 1.0)} tab terbuka`);
  setT(LB.tab, 70, 252, 0.9 + 0.1 * eob((t - 30) / 0.3), win(t, 29.9, 45.6, 0.3) * (t >= 36.5 && t < 39.6 ? 0.0 : 1));
  // zonk
  const zo = win(t, 38.55, 39.45, 0.05);
  setT(zonkG, 540, 168, 1, zo);
  zl.forEach((c, i) => c.setAttribute('opacity', (t >= 38.66 + i * 0.22 && t < 38.66 + i * 0.22 + 0.15) ? 1 : 0.12));
  // kartu akhir
  const ev = (g, a, x, y, sc = 1) => setT(g, x, y, sc * (0.7 + 0.3 * eob((t - a) / 0.35)), clamp((t - a) / 0.12, 0, 1));
  ev(endG.logo, 71.7, 540, 300); ev(endG.ban, word('N24', 4, 's') - 0.1, 540, 495); ev(endG.url, 74.1, 540, 620);
  setT(endG.gratis, 800, 436, 1 + 0.08 * Math.sin(t * 6), clamp((t - word('N24', 8, 's') + 0.05) / 0.12, 0, 1) * 1);
  // bintang sparkle saat "dua minggu"
  const sp0 = word('T01', 4, 's');
  if (t > sp0 - 0.05 && t < sp0 + 1.0) {
    const u = (t - sp0 + 0.05) / 1.05; let h = '';
    for (let i = 0; i < 7; i++) { const a = i * 0.9 + 0.4, r = 150 + 210 * u + i * 8, x = 540 + Math.cos(a) * r * 1.2, y = 700 + Math.sin(a) * r * 0.9, sz = (14 + (i % 3) * 7) * (1 - u * 0.6); h += `<path transform="translate(${f1(x)} ${f1(y)}) rotate(${f1(u * 90)})" d="M0 -${sz}Q3 -3 ${sz} 0Q3 3 0 ${sz}Q-3 3 -${sz} 0Q-3 -3 0 -${sz}Z" fill="#F8C038"/>`; }
    sparkG.innerHTML = h; sparkG.setAttribute('opacity', (1 - u).toFixed(2));
  } else sparkG.setAttribute('opacity', 0);
  // flash: potongan keras
  const flashes = [[11.62, 0.1, 0.7], [14.4, 0.14, 0.9], [38.62, 0.06, 0.5], [27.74, 0.08, 0.4]];
  let fo = 0; for (const [ft, fd, fa] of flashes) { const u = (t - ft) / fd; if (u >= 0 && u < 1) fo = Math.max(fo, fa * (1 - u)); }
  flashR.setAttribute('opacity', fo.toFixed(3));
  // vinyet stres
  const vg = pchip([[0, 0], [15, 0], [24, 0.28], [36, 0.42], [38.6, 0.5], [44, 0.2], [56, 0.1], [90, 0.1]])(t);
  vigG.setAttribute('opacity', vg.toFixed(3));
  // panel web
  const wo = Math.max(...WEB.map(([a, b]) => win(t, a, b, 0.3)));
  G.webDim.setAttribute('opacity', (0.72 * wo).toFixed(3));
  panel.style.opacity = wo > 0.01 ? '1' : '0';
  panel.style.transform = `translateY(${f1((1 - sm(wo)) * 70)}px) scale(${(0.93 + 0.07 * sm(wo)).toFixed(3)})`;
  if (wo > 0.01) await setWeb(webR(t));
  updateCaption(t);
}
// tinggi tumpukan buku di kamar
function pilesF(t) { return t < 44.7 ? 1 : 1 - 0.65 * sm((t - 44.7) / 1.2); }
// map folder di meja (satu BAB)
function folderSvg(t) {
  if (t < 44.9) return '';
  const a = t < 46 ? eob((t - 44.9) / 0.4) : 1;
  let out = '';
  if (t >= 44.9 && t < 63.6) out = folder(640, TOP - 56, 'BAB 1', '#F8C038', -3, 1.0 * clamp(a, 0, 1.15));
  if (t >= 69.2) { const u = eob((t - 69.2) / 0.4); out = folder(300, TOP - 52, '1 BAB', '#F8C038', -3, clamp(u, 0, 1.15) * (1 + (t > 77.1 && t < 78.2 ? 0.08 * Math.sin((t - 77.1) * 12) : 0))); }
  return out;
}
window.renderFrame = renderFrame;
window.__ready = true;
