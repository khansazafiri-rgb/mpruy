// Helper umum video "Apa bedanya introvert & ekstrovert?". Raka dan Tala (teman Raka) dipakai langsung dari brand/characters (tanpa salinan, tanpa desain ulang).
// draw(t) -> string SVG (kanvas 1080 x 1920). Semua ilustrasi buatan; tidak ada rekaman web.
import { raka, rakaSvg, idle as rIdle, lerpState as rLerp } from '../../../brand/characters/raka/raka.js';
import { teman, temanSvg, idleTeman, lerpTeman, PENELITI, walkCycle } from '../../../brand/characters/teman/teman.js';
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
function TK(s, x, fy, k, o = {}) { // Tala (teman Raka); o.peneliti = varian peneliti
  const st = o.noIdle ? s : idleTeman(s, o.t ?? 0, o.off ?? 0.7);
  const opts = { bare: true, uid: o.uid || 'tk' };
  if (o.peneliti) Object.assign(opts, { outfit: 'jas', glasses: true, palette: PENELITI });
  return `<g transform="translate(${f1(x - 200 * k)} ${f1(fy - 778 * k)}) scale(${k})">${temanSvg(st, opts)}</g>`;
}
const tk = (expr, pose = 'berdiri', ov = {}) => teman(expr, pose, ov);
const popK = (t, t0, d = 0.4) => 0.6 + 0.4 * A.clamp(eob((t - t0) / d), 0, 1.2);
const popA = (t, t0) => clamp((t - t0) / 0.12, 0, 1);
const pop = (t, t0, x, y, inner, d = 0.4) => (t < t0 ? '' : `<g transform="translate(${f1(x)} ${f1(y)}) scale(${popK(t, t0, d).toFixed(3)}) translate(${-f1(x)} ${-f1(y)})" opacity="${popA(t, t0).toFixed(2)}">${inner}</g>`);
// cincin sinyal / "grrk" bergetar
const _rumble = (x, y, t, a = 1, c = '#FFD9A0') => `<g opacity="${a.toFixed(2)}" transform="translate(${f1(x)} ${f1(y)})">${T(0, 0, 'grrk…', c, 46, `transform="rotate(${f1(-8 + Math.sin(t * 22) * 4)})"`)}</g>`;
const topChip = (t, a, b, text, o = {}) => { const al = win(t, a, b, 0.25); if (al <= 0.01) return ''; return chip(o.x ?? 540, o.y ?? 330, text, { ...o, k: 0.85 + 0.15 * eob((t - a) / 0.4), a: al }); };

export { rk, RK, TK, tk, M, BR, keyed, pchip, camFn, CAM, pop, popK, popA, topChip, rLerp, rIdle, lerpTeman, idleTeman, walkCycle, f1, COL, A, R, C, E, P, L, T, chip, card, clone };
export const getLogo = () => LOGO, getKori = () => KORI;
