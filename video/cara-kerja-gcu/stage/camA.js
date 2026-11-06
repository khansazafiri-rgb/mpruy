// kamera adegan A: pusat = campuran terbobot beberapa target dunia yang bergerak (ujung jari/tetes, titik darah di strip, layar meter, tengah wajah+tangan, ruang reaksi)
import { f1, clamp, pchip, MC } from './core.js';
import { worldPts, fillAt } from './shotA.js';
const W = {
  A: [[0, 1], [1.25, 1], [1.7, 0], [2.4, 0], [2.85, 1], [3.15, 1], [3.45, 0]],
  C: [[3.15, 0], [3.45, 1], [4.55, 1], [5.0, 0]],
  E: [[4.6, 0], [5.1, 1], [6.5, 1], [6.95, 0]],
  M: [[0, 0], [1.25, 0], [1.7, 1], [2.4, 1], [2.85, 0], [6.5, 0], [6.95, 1], [9.2, 1], [9.9, 0]],
  F: [[9.2, 0], [9.9, 1], [11.4, 1]],
};
const WF = Object.fromEntries(Object.entries(W).map(([k, v]) => [k, pchip(v)]));
const SC = pchip([[0, Math.log(5.0)], [1.0, Math.log(5.6)], [1.5, Math.log(3.2)], [2.4, Math.log(3.3)], [2.9, Math.log(8.2)], [3.15, Math.log(9.5)], [3.5, Math.log(10.5)], [4.5, Math.log(10.5)], [5.15, Math.log(5.2)], [5.8, Math.log(8.2)], [6.5, Math.log(8.0)], [7.05, Math.log(3.1)], [9.2, Math.log(3.4)], [9.9, Math.log(6.5)], [11.4, Math.log(67.4)]]);
export function camA(t) {
  const P = worldPts(t), fill = fillAt(t);
  const T = {
    A: t < 2.4 ? [(P.F.tip[0] * 0.6 + P.tip[0] * 0.4), (P.F.tip[1] * 0.6 + P.tip[1] * 0.4) + 30] : [(P.F.tip[0] + P.D[0]) / 2 + 6, (P.F.tip[1] + P.D[1]) / 2 + 6],
    C: P.su([0, lerpY(fill)]),
    E: P.su([0, 560]),
    M: [232, 392],
    F: P.su([0, 112]),
  };
  let wx = 0, wy = 0, ws = 0;
  for (const k of Object.keys(T)) { const w = Math.max(0, WF[k](t)); wx += w * T[k][0]; wy += w * T[k][1]; ws += w; }
  if (ws < 1e-6) { wx = T.M[0]; wy = T.M[1]; ws = 1; }
  return { cx: wx / ws, cy: wy / ws, s: Math.exp(SC(t)) };
}
const lerpY = (f) => -3 + 144 * f;
export const camTf = (c) => `translate(540 960) scale(${c.s.toFixed(4)}) translate(${f1(-c.cx)} ${f1(-c.cy)})`;
