// Pembantu bersama adegan "Darah tinggi itu sebahaya apa?": stasiun periksa tekanan darah (kursi, meja, alat tensi, manset), pemetaan lokal-ke-kanvas
// untuk lengan Raka (agar manset dan tangan menempel di lengan), dan keyframe halus.
import { RK, rk, TK, tk, clamp, sm, eo, eob, lerp, rLerp, lerpTeman, walkCycle, win, f1, A, R, C, E, P, L, T, chip, keyed, pop } from './core.js';
import { armShape } from '../../../brand/characters/raka/raka.js';
import { koriSvg, lerpKeys } from './shared.js';
import * as H from './artH.js';

export { clamp, sm, eo, eob, lerp, rLerp, lerpTeman, walkCycle, win, f1, A, R, C, E, P, L, T, chip, keyed, pop, rk, tk, RK, TK, koriSvg, H };
export const COLR = { forest: '#0A3830', green: '#007060', mint: '#9DE0BD', cream: '#F7F2E4', gold: '#F8C038', coral: '#E8665F', ink: '#172B38' };
// kunci halus: [[t, nilai], ...] -> nilai pada t (smoothstep antar kunci)
export const ks = (t, keys) => { if (t <= keys[0][0]) return keys[0][1]; for (let i = 1; i < keys.length; i++) if (t <= keys[i][0]) { const [a, va] = keys[i - 1], [b, vb] = keys[i]; return va + (vb - va) * sm((t - a) / (b - a)); } return keys[keys.length - 1][1]; };
export const lin = lerpKeys;
// keadaan Raka berkunci: keys = [{t, d, s}] (transisi dari keadaan sebelumnya mulai di t selama d detik)
export const trackR = (t, keys) => keyed(keys, t, rLerp);
export const trackT = (t, keys) => keyed(keys, t, lerpTeman);

// lokal Raka (400 x 800, termasuk bob dan lean) -> kanvas
export function toCv(st, p, X0, FY, k) {
  const a = (st.lean || 0) * Math.PI / 180, dx = p[0] - 200, dy = p[1] - 580;
  const rx = dx * Math.cos(a) - dy * Math.sin(a), ry = dx * Math.sin(a) + dy * Math.cos(a);
  return [X0 + rx * k, FY + (580 + ry + (st.bob || 0) - 778) * k];
}
export function armPts(st, side, X0, FY, k) {
  const a = side === 'L' ? st.armL : st.armR, sh = armShape(side, a);
  return { dots: sh.dots.map((d) => [...toCv(st, d, X0, FY, k), d[2] * k]), hand: toCv(st, sh.hand, X0, FY, k) };
}
export function cuffAt(st, X0, FY, k, inflate = 0, idx = 13) {
  const { dots } = armPts(st, 'L', X0, FY, k), a = dots[idx - 3], b = dots[idx + 3], c = dots[idx];
  const ang = Math.atan2(b[1] - a[1], b[0] - a[0]) * 180 / Math.PI;
  return H.cuffBand(c[0], c[1], ang + 90, 58 * k / 0.85, c[2] * 2.25, inflate);
}

// stasiun periksa: meja di kiri (x 0..580), kursi Raka di X0
export const STN = { X0: 700, FY: 1290, k: 0.85, tableTop: 1137, devX: 230, devS: 1.25 };
const CH = H.chair(STN.X0, STN.FY, 220);
export function stationBg() { return H.stationBg() + CH.back + H.sideTable(0, 580, STN.tableTop) + CH.seat; }
// tabung dari manset ke alat (kurva rendah di atas meja)
export function tube(x0, y0, x1, y1) { return `<path d="M${f1(x0)} ${f1(y0)}C${f1(x0 - 60)} ${f1(y0 + 40)} ${f1(x1 + 90)} ${f1(y1 + 30)} ${f1(x1)} ${f1(y1)}" fill="none" stroke="#2C3E50" stroke-width="9" stroke-linecap="round"/>`; }
export const devPort = () => [STN.devX + 110 * STN.devS, STN.tableTop - 62 * STN.devS];
// Kori yang melayang dan menunjuk: arm = derajat lengan (negatif = naik), flip = menghadap kiri
export const kori = (x, y, ks_, t, o = {}) => koriSvg(x, y, ks_, t, o);
// panah kecil "klik" / cincin tekan
export const ringPulse = (x, y, u, c = '#fff', r0 = 20, r1_ = 70) => (u <= 0 || u >= 1 ? '' : `<circle cx="${f1(x)}" cy="${f1(y)}" r="${f1(lerp(r0, r1_, u))}" fill="none" stroke="${c}" stroke-width="${f1(8 * (1 - u))}" opacity="${f1(1 - u)}"/>`);
export const exMark = (x, y, s = 1, a = 1) => `<g transform="translate(${f1(x)} ${f1(y)}) scale(${s})" opacity="${a}">${R(-9, -44, 18, 50, '#F8C038', 9, 'stroke="#172B38" stroke-width="5"')}${C(0, 22, 10, '#F8C038', 'stroke="#172B38" stroke-width="5"')}</g>`;
export const qMark = (x, y, s = 1, a = 1) => `<g transform="translate(${f1(x)} ${f1(y)}) scale(${s})" opacity="${a}">${T(0, 0, '?', '#F8C038', 90, 'stroke="#172B38" stroke-width="9" paint-order="stroke"')}</g>`;
// kartu judul/keterangan ber-pil di atas gambar medis
export const note = (cx, cy, text, o = {}) => chip(cx, cy, text, { bg: o.bg ?? '#0A3830', fg: o.fg ?? '#fff', fs: o.fs ?? 36, k: o.k ?? 1, a: o.a ?? 1, w: o.w });
export const lab2 = (cx, cy, txt, o = {}) => { const fs = o.fs ?? 32, w = txt.length * fs * 0.54 + 40; return `<g opacity="${o.a ?? 1}" transform="translate(${f1(cx)} ${f1(cy)}) scale(${(o.k ?? 1).toFixed(3)})">${R(-w / 2, -fs * 0.9, w, fs * 1.8, o.bg ?? 'rgba(6,28,32,.9)', fs * 0.9)}${T(0, fs * 0.36, txt, o.fg ?? '#fff', fs)}</g>`; };

// kamera tetap untuk adegan stasiun (diperbesar 1.15x supaya tokoh lebih besar di bingkai)
export const CAMK = 1.15;
export const camG = (inner) => `<g transform="translate(540 1290) scale(${CAMK}) translate(-560 -1290)">${inner}</g>`;
export const w2s = (x, y) => [540 + (x - 560) * CAMK, 1290 + (y - 1290) * CAMK];
export const camX = (inner, k, wx, wy, sx, sy) => `<g transform="translate(${sx} ${sy}) scale(${k}) translate(${-wx} ${-wy})">${inner}</g>`;
