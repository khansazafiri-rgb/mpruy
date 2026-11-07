// Sirkuit hemodialisis (dunia): mesin di atas, Raka duduk di bawah dengan akses di lengan kiri layar. Darah merah mengalir: jarum arteri -> selang -> pompa -> dialiser (bawah ke atas) -> ruang tetes -> selang -> jarum vena.
// Koordinat dunia: Raka lokal (400 x 800) + RO. Mesin: kabinet x -150..490, y 40..740. Skema, bukan model alat tertentu.
import { f1, clamp, lerp, sm, eo, eio, MC, FONT, rad, pathPt, pathLen } from './core.js';
import { raka, rakaSvg, lerpState, rIdle, solveArm, toWorld, rakaBody } from './raka.js';
import * as A from './art.js';
import { armShape } from '../../../brand/characters/raka/raka.js';

export const RO = [60, 760];
export const W = (p) => [RO[0] + p[0], RO[1] + p[1]];
export const DZC = [260, 400], DZS = 0.9;
export const PUMP = [40, 600, 85], DRIP = [440, 330, 510];
const dz = (p) => [DZC[0] + p[0] * DZS, DZC[1] + p[1] * DZS];
export const PORT = { bIn: dz(A.DZ_BLOOD_IN), bOut: dz(A.DZ_BLOOD_OUT), dIn: dz(A.DZ_DIAL_IN), dOut: dz(A.DZ_DIAL_OUT) };

// ---- Raka duduk, lengan kiri layar terulur dengan lengan baju digulung; akses (jarum) di lengan bawah
const SIT = { on: 1, dir: 0, sit: 1, L: { dx: -8, lift: 0, kx: 0 }, R: { dx: 8, lift: 0, kx: 0 } };
export function patient(t, o = {}) {
  const e = o.expr ?? 'netral', base = raka(e, 'netral', { legs: SIT, yaw: o.yaw ?? -0.25, gazeX: o.gazeX ?? -0.5, gazeY: o.gazeY ?? -0.55 });
  if (o.state) Object.assign(base, o.state);
  const st = rIdle(base, t);
  const Hl = o.hand ?? [22, 548];
  st.armL = solveArm(st, 'L', Hl, { finger: 0, front: 1, len: 168, bend: 0.5 }); st.armL.roll = 0.78;
  st.armR = solveArm(st, 'R', o.handR ?? [300, 560], { finger: 0, front: 1, len: 150 });
  const sh = armShape('L', st.armL), dots = sh.dots;
  const pt = (i) => { const d = dots[i]; return toWorld(st, [d[0], d[1]]); };
  const nA = W(pt(32)), nV = W(pt(37));
  return { st, nA, nV, hand: W(toWorld(st, sh.hand)), body: rakaBody(st, o.uid ?? 'rk', { dark: true }) };
}

// ---- mesin
export function machine(t, o = {}) {
  const ph = o.pump ?? t * 2.4;
  const x0 = -150, y0 = 40, w = 640, h = 700;
  let g = `<g filter="url(#fSh)"><rect x="${x0}" y="${y0}" width="${w}" height="${h}" rx="46" fill="url(#gMach)"/></g><rect x="${x0}" y="${y0}" width="${w}" height="${h}" rx="46" fill="none" stroke="${MC.ink}" stroke-width="4" opacity=".5"/>`;
  g += `<rect x="${x0 + 22}" y="${y0 + 22}" width="${w - 44}" height="${h - 44}" rx="34" fill="#DCE8E7" stroke="${MC.ink}" stroke-width="2.5" opacity=".9"/><rect x="${x0 + 22}" y="${y0 + 22}" width="${w - 44}" height="${h - 44}" rx="34" fill="none" stroke="#fff" stroke-width="4" opacity=".6" transform="translate(-2 -2)"/>`;
  // layar
  g += `<rect x="${x0 + 60}" y="${y0 + 46}" width="190" height="96" rx="14" fill="#0E2A31" stroke="${MC.ink}" stroke-width="3"/><path d="M${x0 + 76} ${y0 + 108}H${x0 + 118}l10 -34 14 52 12 -36 10 18H${x0 + 234}" fill="none" stroke="#5FE0B8" stroke-width="4" stroke-linecap="round" stroke-linejoin="round"/>`;
  g += `<circle cx="${x0 + 310}" cy="${y0 + 74}" r="14" fill="url(#gMachDk)"/><circle cx="${x0 + 352}" cy="${y0 + 74}" r="14" fill="#F8C038" stroke="#9A6A08" stroke-width="2"/><rect x="${x0 + 400}" y="${y0 + 56}" width="150" height="14" rx="7" fill="#1B6E64" opacity=".85"/><rect x="${x0 + 400}" y="${y0 + 86}" width="104" height="14" rx="7" fill="#1B6E64" opacity=".5"/>`;
  // pompa darah (rotor berputar)
  const [px, py, pr] = PUMP;
  g += `<circle cx="${px}" cy="${py}" r="${pr + 12}" fill="#C7D6D6" stroke="${MC.ink}" stroke-width="3"/><circle cx="${px}" cy="${py}" r="${pr}" fill="#1D3B40" stroke="${MC.ink}" stroke-width="3"/>`;
  g += `<g transform="translate(${px} ${py}) rotate(${f1(ph * 57.3)})"><circle r="46" fill="#9FB6B8" stroke="${MC.ink}" stroke-width="3"/>${[0, 120, 240].map((a) => `<g transform="rotate(${a})"><rect x="-8" y="-66" width="16" height="42" rx="8" fill="#E9F2F2" stroke="${MC.ink}" stroke-width="2.5"/><circle cy="-66" r="10" fill="#F8C038" stroke="#9A6A08" stroke-width="2"/></g>`).join('')}<circle r="10" fill="#34555A"/></g>`;
  // kantong cairan dialisis (atas: baru, bawah: bekas)
  g += `<g filter="url(#fShS)"><path d="M385 62H470Q482 62 482 76V150Q482 168 466 168H392Q378 168 378 150V76Q378 62 385 62Z" fill="url(#gBag)" stroke="${MC.ink}" stroke-width="3"/></g><path d="M388 78H470" stroke="#fff" stroke-width="5" opacity=".6"/>`;
  g += `<g filter="url(#fShS)"><path d="M385 628H470Q482 628 482 642V716Q482 734 466 734H392Q378 734 378 716V642Q378 628 385 628Z" fill="url(#gBag)" opacity=".75" stroke="${MC.ink}" stroke-width="3"/></g>`;
  return g;
}
// ruang tetes (di depan kabinet)
export function drip(t, o = {}) {
  const [x, y0, y1] = DRIP, lvl = o.level ?? 0.55;
  return `<g filter="url(#fShS)"><rect x="${x - 34}" y="${y0 - 10}" width="68" height="${y1 - y0 + 20}" rx="30" fill="#E8F6FA" opacity=".55" stroke="${MC.ink}" stroke-width="3"/></g><rect x="${x - 28}" y="${f1(y0 + (y1 - y0) * (1 - lvl))}" width="56" height="${f1((y1 - y0) * lvl + 6)}" rx="24" fill="url(#gBlood)" opacity=".9"/><path d="M${x - 24} ${y0 + 6}V${y1 - 8}" stroke="#fff" stroke-width="5" stroke-linecap="round" opacity=".55"/>`;
}
