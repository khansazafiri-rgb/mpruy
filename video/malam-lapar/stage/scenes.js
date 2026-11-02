// Adegan "Kenapa malam-malam lapar?". Raka, Grelin, Jambi dipakai langsung dari brand/characters (tanpa salinan, tanpa desain ulang).
// draw(t) -> string SVG (kanvas 1080 x 1920). Semua ilustrasi buatan; tidak ada rekaman web.
import { raka, rakaSvg, idle as rIdle, lerpState as rLerp } from '../../../brand/characters/raka/raka.js';
import { grelin, grelinSvg, idle as gIdle, lerpState as gLerp } from '../../../brand/characters/grelin/grelin.js';
import { jambi, jambiSvg, idle as jIdle, lerpState as jLerp } from '../../../brand/characters/jambi/jambi.js';
import * as A from './art.js';

const { R, C, E, P, L, T, chip, card, f1, COL } = A;
export const clamp = (x, a, b) => Math.max(a, Math.min(b, x));
export const lerp = (a, b, t) => a + (b - a) * t;
export const sm = (x) => { x = clamp(x, 0, 1); return x * x * (3 - 2 * x); };
export const eo = (x) => { x = clamp(x, 0, 1); return 1 - Math.pow(1 - x, 3); };
export const eob = (x) => { x = clamp(x, 0, 1); const c1 = 1.70158, c3 = c1 + 1; return 1 + c3 * Math.pow(x - 1, 3) + c1 * Math.pow(x - 1, 2); };
export const win = (t, a, b, f = 0.25) => clamp((t - a) / f, 0, 1) * clamp((b - t) / f, 0, 1);
const clone = (o) => JSON.parse(JSON.stringify(o));
let LOGO = ''; export function setLogo(l) { LOGO = l; }
let KORI = null; export function setKori(r, pose) { KORI = { r, pose }; }

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
const camFn = (keys) => { const fx = pchip(keys.map((k) => [k[0], k[1]])), fy = pchip(keys.map((k) => [k[0], k[2]])), fs = pchip(keys.map((k) => [k[0], k[3]])); return (t) => [fx(t), fy(t), fs(t)]; };
const CAM = (c) => `translate(540 960) scale(${c[2].toFixed(4)}) translate(${(-c[0]).toFixed(1)} ${(-c[1]).toFixed(1)})`;
const keyed = (keys, t, lerpFn) => { let i = 0; while (i + 1 < keys.length && t >= keys[i + 1].t) i++; if (i === 0) return clone(keys[0].s); const k = keys[i], u = sm((t - k.t) / k.d); return u >= 1 ? clone(k.s) : lerpFn(keys[i - 1].s, k.s, u); };

// ---------------------------------------------------------------- pembungkus tokoh
const STAND = { legs: { on: 1, dir: 1, L: { dx: 0, lift: 0, kx: 0 }, R: { dx: 0, lift: 0, kx: 0 } } };
const rk = (expr, pose = 'netral', ov = {}) => raka(expr, pose, { ...STAND, ...ov, legs: { ...STAND.legs, ...(ov.legs || {}) } });
const M = { small: { w: 14, up: 6, lo: 6 }, mid: { w: 12, up: 3, lo: 3 }, flat: { w: 12, up: 0, lo: 0 }, worry: { w: 11, up: -4, lo: -4 }, open: { w: 12, up: -2, lo: 14 }, wow: { w: 13, up: 1, lo: 26 }, smile: { w: 20, up: 11, lo: 11 }, grin: { w: 24, up: 8, lo: 24 }, o: { w: 8, up: -3, lo: 16 }, hungry: { w: 11, up: 2, lo: 13 } };
const BR = (ly, lr, ry, rr) => ({ browL: { y: ly, rot: lr }, browR: { y: ry, rot: rr } });
function RK(s, x, fy, k, o = {}) {
  const st = o.noIdle ? s : rIdle(s, o.t ?? 0);
  const body = rakaSvg(st, { bare: true, uid: o.uid || 'rk', outfit: o.outfit || 'harian', shadow: o.shadow ?? true });
  return `<g transform="translate(${f1(x - 200 * k)} ${f1(fy - 778 * k)}) scale(${k})">${body}</g>`;
}
function GR(s, x, fy, k, o = {}) {
  const st = o.noIdle ? s : gIdle(s, o.t ?? 0);
  return `<g transform="translate(${f1(x - 100 * k)} ${f1(fy - 250 * k)}) scale(${k})">${grelinSvg(st, { bare: true, uid: o.uid || 'gr', shadow: o.shadow ?? true })}</g>`;
}
function JB(s, x, fy, k, o = {}) {
  const st = o.noIdle ? s : jIdle(s, o.t ?? 0);
  return `<g transform="translate(${f1(x - 110 * k)} ${f1(fy - 270 * k)}) scale(${k})">${jambiSvg(st, { bare: true, uid: o.uid || 'jb', shadow: o.shadow ?? true })}</g>`;
}
const popK = (t, t0, d = 0.4) => 0.6 + 0.4 * A.clamp(eob((t - t0) / d), 0, 1.2);
const popA = (t, t0) => clamp((t - t0) / 0.12, 0, 1);
const pop = (t, t0, x, y, inner, d = 0.4) => (t < t0 ? '' : `<g transform="translate(${f1(x)} ${f1(y)}) scale(${popK(t, t0, d).toFixed(3)}) translate(${-f1(x)} ${-f1(y)})" opacity="${popA(t, t0).toFixed(2)}">${inner}</g>`);
// cincin sinyal / "grrk" bergetar
const rumble = (x, y, t, a = 1, c = '#FFD9A0') => `<g opacity="${a.toFixed(2)}" transform="translate(${f1(x)} ${f1(y)})">${T(0, 0, 'grrk…', c, 46, `transform="rotate(${f1(-8 + Math.sin(t * 22) * 4)})"`)}</g>`;
const topChip = (t, a, b, text, o = {}) => { const al = win(t, a, b, 0.25); if (al <= 0.01) return ''; return chip(o.x ?? 540, o.y ?? 330, text, { ...o, k: 0.85 + 0.15 * eob((t - a) / 0.4), a: al }); };

// ================================================================ 1. HOOK kos + kulkas (0 - 8.26)
const camH = camFn([[0, 540, 960, 1.0], [3.4, 560, 980, 1.05], [5.7, 560, 980, 1.04], [6.5, 690, 970, 1.18], [8.3, 690, 970, 1.2]]);
const HK = { x: 748, fy: 1330, k: 0.92 };
const hookKeys = [
  { t: 0, d: 0.01, s: rk('lapar', 'pegang_perut', { flip: 1, yaw: 0.45, gazeX: 0.8, bags: 0.45, ...BR(-9, 14, -3, -6) }) },
  { t: 3.4, d: 0.4, s: rk('bingung', 'pegang_perut', { flip: 1, yaw: 0.45, gazeX: 0.5, gazeY: -0.3, bags: 0.45, mouth: M.worry, sweat: 0.2, ...BR(-6, 10, -6, -10) }) },
  { t: 5.78, d: 0.25, s: rk('lapar', 'pegang_perut', { flip: 1, yaw: 0.45, gazeX: 0.8, gazeY: 0.5, bags: 0.45, wide: 0.9, mouth: M.hungry, ...BR(-10, 16, -8, -12) }) },
];
function hook(t) {
  const c = camH(t);
  const s = keyed(hookKeys, t, rLerp);
  if (t > 5.9) { s.tilt = (s.tilt || 0) + Math.sin(t * 24) * 1.4 * clamp((8.2 - t) / 1.2, 0, 1); }
  const world = `${A.nightBg(t, { noWindow: true, noPoster: true })}<g transform="translate(70 520)">${A.fridge()}</g>${A.fridgeGlow(420, 960, 0.9)}${A.wallClock(945, 585, 64, 23 + 47 / 60, '23.47')}${RK(s, HK.x, HK.fy, HK.k, { t, uid: 'rkA' })}`;
  const gr = t > 6.2 ? pop(t, 6.2, 920, 1250, GR(grelin('lapar', 'pegang_perut', { flip: 1, wide: 1, drool: 0.8 }), 925, 1255, 0.62, { t, uid: 'gA' }), 0.45) : '';
  let ov = '';
  // gelembung pikiran "sore tadi sudah makan"
  const tb = win(t, 3.45, 5.55, 0.3);
  if (tb > 0.01) ov += `<g opacity="${tb.toFixed(2)}" transform="translate(0 ${f1((1 - eo((t - 3.45) / 0.4)) * 20)})">${A.thought(300, 420, 430, 200, '#fff', [660, 680])}${A.plate(430, 540, 0.62, 'nasi')}${A.check(650, 490, 0.95)}${T(530, 480, '17.30', COL.forest, 40)}${T(570, 575, 'sudah makan', COL.green, 30)}</g>`;
  ov += topChip(t, 0.2, 3.3, 'KENAPA MALAM-MALAM LAPAR?', { w: 880, fs: 40, bg: COL.coral });
  ov += topChip(t, 6.0, 8.2, 'PERUTMU MINTA DIISI LAGI', { w: 800, fs: 38, bg: COL.indigo });
  const q = win(t, 1.2, 3.2, 0.3); if (q > 0.01) ov += [0, 1, 2].map((i) => A.qmark(690 + i * 90, 480 + Math.sin(t * 5 + i) * 10 + (i % 2) * 40, 0.9, Math.sin(t * 4 + i) * 12)).join('').replace(/<g /, `<g opacity="${q}" `);
  return `<g transform="${CAM(c)}">${world}${gr}${t > 6.1 ? rumble(950, 1105, t, win(t, 6.1, 8.3, 0.2)) : ''}</g>${ov}`;
}

// ================================================================ 2. GHRELIN -> OTAK (8.26 - 13.98)
const SIG = [[710, 1080], [690, 900], [730, 760], [770, 650]];
const sigAt = (u) => { const n = SIG.length - 1, x = clamp(u, 0, 1) * n, i = Math.min(n - 1, Math.floor(x)), v = x - i, a = SIG[i], b = SIG[i + 1]; return [lerp(a[0], b[0], sm(v)), lerp(a[1], b[1], v)]; };
function ghrelin(t) {
  let o = A.softBg('#0F5F57', '#0A3830', 'sb2');
  const rs = keyed([{ t: 0, d: 0.01, s: rk('netral', 'netral', { yaw: 0.45, gazeX: 0.5, bags: 0.4, mouth: M.worry }) }, { t: 13.1, d: 0.3, s: rk('lapar', 'pegang_perut', { yaw: 0.45, gazeX: 0.5, bags: 0.4, wide: 0.8, mouth: M.hungry, ...BR(-9, 14, -9, -14) }) }], t, rLerp);
  o += RK(rs, 280, 1300, 0.9, { t, uid: 'rkB' });
  // jendela lambung
  const wk = 0.7 + 0.3 * eob((t - 8.3) / 0.5), wa = clamp((t - 8.3) / 0.2, 0, 1);
  const wx = 700, wy = 1030, wr = 250;
  const belly = [275, 1070];
  o += `<g opacity="${wa}"><line x1="${belly[0]}" y1="${belly[1]}" x2="${wx - wr + 14}" y2="${wy - 50}" stroke="#fff" stroke-width="5" stroke-dasharray="3 14" stroke-linecap="round"/><line x1="${belly[0]}" y1="${belly[1]}" x2="${wx - wr + 40}" y2="${wy + 110}" stroke="#fff" stroke-width="5" stroke-dasharray="3 14" stroke-linecap="round"/>`;
  o += `<g transform="translate(${wx} ${wy}) scale(${wk.toFixed(3)}) translate(${-wx} ${-wy})"><defs><clipPath id="wclip"><circle cx="${wx}" cy="${wy}" r="${wr}"/></clipPath></defs>${C(wx, wy + 10, wr + 14, 'rgba(0,0,0,.25)')}${C(wx, wy, wr + 14, '#fff')}<g clip-path="url(#wclip)">${R(wx - wr, wy - wr, wr * 2, wr * 2, '#FFEFE4')}<g transform="translate(${wx} ${wy - 20})">${A.stomach({ pulse: t, rumble: 1 })}</g>${R(wx - 12, wy - 300, 34, 190, '#F0B6AC', 16)}</g></g></g>`;
  // Grelin di dalam lambung
  const gs = keyed([{ t: 0, d: 0.01, s: grelin('netral', 'berdiri') }, { t: 9.9, d: 0.3, s: grelin('lapar', 'sapa', { hold: 0 }) }, { t: 10.9, d: 0.35, s: grelin('serius', 'kirim_sinyal') }, { t: 12.9, d: 0.3, s: grelin('semangat', 'hore') }], t, gLerp);
  if (t > 9.4) o += pop(t, 9.4, wx, wy + 90, GR(gs, wx, wy + 175, 0.86, { t, uid: 'gB' }), 0.45);
  // label ghrelin dan lambung
  o += pop(t, 10.25, 700, 1345, `<g transform="translate(700 1345)">${R(-130, -30, 260, 60, COL.gold, 30)}${T(0, 13, 'GHRELIN', COL.forest, 36)}</g>`, 0.4);
  o += topChip(t, 8.4, 10.2, 'DI LAMBUNGMU', { w: 560, fs: 40, bg: COL.coral });
  o += topChip(t, 10.3, 13.9, 'HORMON GHRELIN', { w: 620, fs: 40, bg: COL.gold, fg: COL.forest });
  // otak
  const ba = clamp((t - 10.9) / 0.3, 0, 1), bf = t > 13.0 ? clamp((t - 13.0) / 0.2, 0, 1) : 0;
  if (ba > 0) o += `<g opacity="${ba}" transform="translate(790 520) scale(${(0.7 + 0.3 * eob((t - 10.9) / 0.5)).toFixed(3)})">${C(0, 8, 136, 'rgba(0,0,0,.22)')}${C(0, 0, 136, '#fff')}<g transform="scale(.82)">${A.brain({ glow: bf })}</g></g><g transform="translate(790 700)">${R(-60, -28, 120, 52, COL.forest, 26)}${T(0, 11, 'OTAK', '#fff', 30)}</g>`;
  if (t > 13.1) o += `<g transform="translate(470 520) rotate(-8) scale(${(0.8 + 0.3 * eob((t - 13.1) / 0.4)).toFixed(3)})">${R(-98, -34, 196, 68, COL.coral, 34)}${T(0, 14, 'LAPAR!', '#fff', 40)}</g>`;
  // sinyal bergerak
  const su = clamp((t - 11.35) / 1.75, 0, 1);
  if (su > 0 && su < 1) {
    for (let i = 5; i >= 0; i--) { const p = sigAt(su - i * 0.045); if (su - i * 0.045 >= 0) o += C(f1(p[0]), f1(p[1]), 6 - i * 0.6, COL.gold, `opacity="${(0.9 - i * 0.14).toFixed(2)}"`); }
    const p = sigAt(su); o += `<g transform="translate(${f1(p[0])} ${f1(p[1])}) scale(${(1 + 0.12 * Math.sin(t * 24)).toFixed(3)})">${C(0, 0, 32, COL.gold)}${P('M6 -22L-12 4H-1L-6 22L12 -4H1Z', '#fff')}</g>`;
  }
  if (su >= 1 && t < 13.9) o += A.sparkle(840, 600, 1.1 + 0.3 * Math.sin(t * 20), COL.gold) + A.sparkle(740, 620, 0.8, '#fff') + A.sparkle(880, 540, 0.7, COL.gold);
  return o;
}

// ================================================================ 3. GRAFIK GHRELIN (13.98 - 19.06)
const CH = { x0: 150, x1: 900, yb: 1130, yt: 560 };
const PTS = [[150, 1050], [340, 930], [520, 600], [720, 960], [900, 1050]];
const peakX = 520;
function chart(t) {
  let o = A.softBg('#0F5F57', '#0A3830', 'sb3');
  const ca = clamp((t - 13.9) / 0.3, 0, 1);
  o += `<g opacity="${ca}" transform="translate(0 ${f1((1 - eo((t - 13.9) / 0.5)) * 50)})">${card(80, 440, 920, 900, '#FFFDF4', 44)}`;
  // sumbu
  o += L(`M${CH.x0 - 20} ${CH.yt - 20}V${CH.yb}H${CH.x1 + 20}`, '#B7C6CC', 6);
  o += T(CH.x0 - 10, CH.yt - 40, 'KADAR GHRELIN', COL.forest, 26, '', 'start');
  // penanda waktu makan
  o += `<line x1="${peakX}" y1="${CH.yt}" x2="${peakX}" y2="${CH.yb}" stroke="#E8665F" stroke-width="5" stroke-dasharray="4 14" stroke-linecap="round"/>`;
  o += A.plate(peakX, CH.yb + 78, 0.5, 'nasi') + T(peakX, CH.yb + 140, 'WAKTU MAKAN', COL.coral, 28);
  o += T(CH.x0 + 60, CH.yb + 50, 'sebelum', '#6D7C84', 26, '', 'middle') + T(CH.x1 - 60, CH.yb + 50, 'setelah', '#6D7C84', 26, '', 'middle');
  // kurva
  const p = pchip([[14.3, 0], [16.32, (peakX - CH.x0) / (CH.x1 - CH.x0)], [16.72, 0.5], [18.5, 0.94], [19.1, 0.94]])(t);
  o += A.curve(PTS, p, COL.coral, 14);
  const gx = CH.x0 + (CH.x1 - CH.x0) * p, gy = A.curveY(PTS, gx);
  const rising = t < 16.5;
  const gs = rising ? grelin('lapar', 'berdiri', { drool: clamp((t - 14.8) / 1.4, 0, 1) * 0.8, wide: 1, spark: 0 }) : grelin('kenyang', 'berdiri', { happyEyes: 0.5 });
  o += GR(gs, f1(gx), f1(gy + 6), 0.5, { t, uid: 'gC', shadow: false });
  // label naik / turun
  o += pop(t, 15.2, 250, 760, `<g transform="translate(250 760) rotate(-18)">${R(-85, -30, 170, 60, COL.coral, 30)}${T(0, 13, '↗ NAIK', '#fff', 34)}</g>`, 0.35);
  o += pop(t, 17.15, 820, 760, `<g transform="translate(820 760) rotate(18)">${R(-95, -30, 190, 60, COL.leaf, 30)}${T(0, 13, '↘ TURUN', '#fff', 34)}</g>`, 0.35);
  o += T(540, 1310, 'ILUSTRASI POLA UMUM, BUKAN DATA', '#9AA9AF', 22);
  o += `</g>`;
  o += topChip(t, 14.0, 19.0, 'GHRELIN NAIK, LALU TURUN', { w: 800, fs: 38, bg: COL.gold, fg: COL.forest });
  return o;
}

// ================================================================ 4. JAMBI (19.06 - 25.26)
function jam(t) {
  let o = A.softBg('#16406A', '#0B2540', 'sb4');
  const rs = keyed([{ t: 0, d: 0.01, s: rk('netral', 'pegang_perut', { yaw: 0.45, gazeX: 0.4, bags: 0.4, mouth: M.mid }) }, { t: 20.3, d: 0.3, s: rk('bingung', 'pegang_perut', { yaw: 0.45, gazeX: 0.6, bags: 0.4, mouth: M.worry, ...BR(-6, 10, -6, -10) }) }, { t: 22.2, d: 0.3, s: rk('berpikir', 'berpikir', { yaw: 0.45, gazeX: 0.7, bags: 0.4, mouth: M.mid }) }], t, rLerp);
  o += RK(rs, 290, 1300, 1.12, { t, uid: 'rkC' });
  o += GR(grelin('lapar', 'pegang_perut'), 100, 1304, 0.6, { t, uid: 'gD' });
  if (t > 20.25) {
    const jv = jambi('semangat', t < 21.8 ? 'sapa' : 'menunjuk', { jam: lerp(7, 20, sm((t - 21.9) / 3)) });
    const fy = 1300 - Math.max(0, 1 - clamp((t - 20.25) / 0.45, 0, 1)) * 400 * (1 - clamp((t - 20.25) / 0.45, 0, 1));
    o += `<g opacity="${clamp((t - 20.25) / 0.1, 0, 1)}">${JB(jv, 800, f1(fy), 1.4, { t, uid: 'jbA' })}</g>`;
  }
  // panah dari Jambi ke perut dan kepala
  const aa = win(t, 22.0, 25.3, 0.3);
  if (aa > 0.01) o += `<g opacity="${aa.toFixed(2)}" stroke="${COL.gold}" stroke-width="8" stroke-dasharray="2 18" stroke-linecap="round" fill="none"><path d="M650 1060Q520 1060 400 1050"/><path d="M720 960Q560 700 420 640"/></g>${A.sparkle(395, 1050, 0.8, COL.gold, aa)}${A.sparkle(410, 636, 0.8, COL.gold, aa)}`;
  o += topChip(t, 19.2, 21.8, 'LAMBUNG TIDAK SENDIRIAN', { w: 860, fs: 38, bg: COL.indigo });
  o += topChip(t, 21.9, 25.2, 'JAM BIOLOGIS', { w: 560, fs: 42, bg: COL.gold, fg: COL.forest });
  return o;
}

// ================================================================ daftar adegan (ditambah di bawah)
export const SCENES = [
  { id: 'hook', t0: 0, draw: hook },
  { id: 'ghrelin', t0: 8.26, draw: ghrelin, tr: { type: 'iris', d: 0.5, cx: 720, cy: 1000 } },
  { id: 'chart', t0: 13.9, draw: chart, tr: { type: 'whip', d: 0.35 } },
  { id: 'jam', t0: 19.0, draw: jam, tr: { type: 'whip', d: 0.35 } },
];
export { SIG, PTS, rk, RK, GR, JB, M, BR, keyed, pchip, camFn, CAM, pop, popK, popA, topChip, rumble, rLerp, gLerp, jLerp, rIdle, gIdle, jIdle, grelin, jambi };
export const getLogo = () => LOGO, getKori = () => KORI;
