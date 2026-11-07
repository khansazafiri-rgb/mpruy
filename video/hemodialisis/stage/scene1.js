// ADEGAN 1 (0 - 8,4 dtk): darah mengalir dari akses di lengan -> selang -> pompa -> dialiser -> ruang tetes -> kembali ke lengan; kamera mengikuti aliran. 6,06-7,8: "Apa yang sebenarnya dilakukan mesin itu?"
import { f1, clamp, lerp, sm, eo, eio, MC, FONT, pchip, pathPt, pathLen } from './core.js';
import * as A from './art.js';
import { RO, W, patient, machine, drip, PORT, DZC, DZS, PUMP, DRIP } from './circuit.js';
import { dialyzer } from './art.js';

const P0 = patient(0);   // posisi jarum (statis; gerak napas Raka kecil)
export const NA = P0.nA, NV = P0.nV;
export const PATH = {
  A1: `M${f1(NA[0])} ${f1(NA[1])}C${f1(NA[0] - 60)} ${f1(NA[1] - 150)} -95 980 -95 720C-95 650 -80 600 -45 600`,
  A2: 'M-45 600A85 85 0 0 1 125 600',
  A3: 'M125 600C135 690 190 800 260 792L260 738',
  A4: `M260 58C260 -26 440 -26 440 322`,
  A5: `M440 520C440 700 330 900 215 1090C${f1(NV[0] + 60)} ${f1(NV[1] - 100)} ${f1(NV[0] + 12)} ${f1(NV[1] - 40)} ${f1(NV[0])} ${f1(NV[1])}`,
  D1: 'M430 168C428 188 398 175 374 175', D2: 'M374 625C398 625 428 612 430 632',
};
const PHs = (t) => t * 150;
function flowTubes(t, o = {}) {
  const ph = PHs(t), w = 22;
  let g = '';
  g += A.tube(PATH.A1, w, { ph }) + A.tube(PATH.A2, w, { ph }) + A.tube(PATH.A3, w, { ph }) + A.tube(PATH.A4, w, { ph }) + A.tube(PATH.A5, w, { ph });
  g += A.tube(PATH.D1, 14, { kind: 'dial', ph }) + A.tube(PATH.D2, 14, { kind: 'dial', ph });
  // zat sisa (skema) dalam darah: banyak sebelum dialiser, sedikit sesudahnya
  const dots = (d, n, sd, a = 1) => A.along(d, n, t, 0.11, (x, y, i, u, ang) => A.ureaP(x, y, 6.4, a, i * 40), { seed: sd, spread: 5 });
  g += dots(PATH.A1, 9, 1) + dots(PATH.A2, 3, 2) + dots(PATH.A3, 3, 3) + dots(PATH.A4, 2, 4, 0.9) + dots(PATH.A5, 1, 5, 0.9);
  return g;
}
export function worldCircuit(t, o = {}) {
  const cutV = o.cut ?? 1;
  const P = patient(t, { expr: o.expr ?? 'netral', gazeX: o.gazeX, gazeY: o.gazeY, yaw: o.yaw, uid: 'rk1', hand: o.hand });
  // kursi (belakang Raka)
  const chair = `<g filter="url(#fSh)"><rect x="${RO[0] - 70}" y="${RO[1] + 150}" width="540" height="600" rx="90" fill="#35788A"/></g><rect x="${RO[0] - 40}" y="${RO[1] + 180}" width="480" height="540" rx="70" fill="#4A93A6" opacity=".8"/><rect x="${RO[0] - 70}" y="${RO[1] + 560}" width="540" height="200" rx="60" fill="#2A6070"/>`;
  const mach = machine(t, { pump: t * 2.2 });
  const dzSvg = `<g transform="translate(${DZC[0]} ${DZC[1]}) scale(${DZS})">${dialyzer({ cut: cutV, phB: PHs(t) * 0.9, phD: PHs(t) * 0.9, id: 'dzc' })}</g>`;
  return { svg: chair + mach + dzSvg + flowTubes(t) + drip(t) + `<g transform="translate(${RO[0]} ${RO[1]})">${P.body}</g>` + needles(P), P };
}
function needles(P) {
  const n = (p, col) => `<g transform="translate(${f1(p[0])} ${f1(p[1])})"><rect x="-4" y="-16" width="8" height="26" rx="3" fill="#E9F2F2" stroke="${MC.ink}" stroke-width="2" transform="rotate(8)"/><circle cy="-6" r="7" fill="${col}" stroke="${MC.ink}" stroke-width="2"/><rect x="-14" y="2" width="28" height="9" rx="4" fill="#F7F2E4" stroke="#C8BFA0" stroke-width="1.5" opacity=".95"/></g>`;
  return n(P.nA, '#E8665F') + n(P.nV, '#4F7FE0');
}
// kamera: kunci (t, x, y, ln s); pusat mengikuti titik pada path
const pa = (k, u) => { const p = pathPt(PATH[k], u); return [p.x, p.y]; };
const K = [
  [0.0, NA[0] + 8, NA[1] + 6, Math.log(4.0)], [0.5, ...pa('A1', 0.12), Math.log(3.2)], [1.4, ...pa('A1', 0.55), Math.log(2.4)], [2.2, ...pa('A1', 1.0), Math.log(2.2)],
  [2.9, PUMP[0] + 40, PUMP[1], Math.log(2.2)], [3.5, ...pa('A3', 0.9), Math.log(1.8)], [4.3, DZC[0], DZC[1] - 140, Math.log(1.7)], [4.9, DRIP[0], 420, Math.log(1.9)],
  [5.6, ...pa('A5', 0.6), Math.log(1.45)], [6.1, 170, 830, Math.log(1.2)], [7.2, DZC[0] - 20, DZC[1] + 60, Math.log(1.55)], [8.6, DZC[0] - 10, DZC[1] + 40, Math.log(1.7)],
];
const fx = pchip(K.map((k) => [k[0], k[1]])), fy = pchip(K.map((k) => [k[0], k[2]])), fs = pchip(K.map((k) => [k[0], k[3]]));
export const camS1 = (t) => ({ cx: fx(t), cy: fy(t), s: Math.exp(fs(t)) });
export const camTf = (c) => `translate(540 960) scale(${c.s.toFixed(4)}) translate(${f1(-c.cx)} ${f1(-c.cy)})`;
export const toScr = (c, x, y) => [540 + (x - c.cx) * c.s, 960 + (y - c.cy) * c.s];
