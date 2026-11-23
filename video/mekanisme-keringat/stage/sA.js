// A. hook (0 - 4,9): Raka kepanasan, suhu tubuh naik, tetes keringat muncul. B. peta tubuh (4,7 - 14,0): hipotalamus -> saraf simpatis -> kelenjar ekrin.
import { f1, clamp, lerp, sm, eo, eio, seg, pop, track, pathPt, R, C, P, T, GOLD, FOREST, INK, rndf, K, W, CREAM, bgCream, chip, tag, callout, camG, op, armTo, rk, raka, rIdle, sdrop, thermo, mixc, heatArrow, ach, ka, dashed } from './common.js';

export const RAK_A = { cx: 520, ty: 400, k: 1.62 };
// matahari + gelombang panas + lantai
function hotWorld(t, floorY) {
  const rays = Array.from({ length: 12 }, (_, i) => { const a = i * 30 + t * 12; return `<path d="M${f1(900 + Math.cos(a * Math.PI / 180) * 128)} ${f1(560 + Math.sin(a * Math.PI / 180) * 128)}L${f1(900 + Math.cos(a * Math.PI / 180) * 176)} ${f1(560 + Math.sin(a * Math.PI / 180) * 176)}" stroke="${K.gold}" stroke-width="14" stroke-linecap="round"/>`; }).join('');
  let waves = ''; for (let i = 0; i < 5; i++) { const x0 = 150 + i * 190, ph = t * 3 + i; waves += `<path d="M${x0} ${f1(floorY - 30)}q18 ${f1(-30 + 8 * Math.sin(ph))} 0 -60t0 -60t0 -60" fill="none" stroke="${K.heat}" stroke-width="9" stroke-linecap="round" opacity="${f1(0.45 + 0.2 * Math.sin(ph))}"/>`; }
  return `${bgCream}<rect x="-100" y="${floorY}" width="1300" height="600" fill="#E8D9B5"/><rect x="-100" y="${floorY}" width="1300" height="10" fill="#D6C497"/>${rays}<circle cx="900" cy="560" r="105" fill="${K.gold}" stroke="#E5A81F" stroke-width="8"/>${waves}`;
}
export function sceneA(t, out) {
  const { cx, ty, k } = RAK_A, wipe = seg(t, 0.6, 1.5), lv = lerp(0.3, 0.86, seg(t, 0, 4.6));
  const st = rIdle(raka('sedih', 'netral', { armR: armTo('R', lerp(330, 268, wipe), lerp(560, 176, wipe)), armL: armTo('L', 92, 552), tilt: -3 * seg(t, 2, 3), browL: { y: 4, rot: 14 }, browR: { y: 4, rot: -14 } }), t);
  const r = rk(st, cx, ty, k, 'rA'), floorY = ty + 778 * k;
  let w = hotWorld(t, floorY) + r.svg;
  // tetes keringat di dahi/pelipis (koordinat Raka); tetes ke-3 meluncur di pipi tepat saat "keringat"
  const D = (u, x, y, h0, h1) => { const g = pop(t, u, 0.5); return g > 0.01 ? (() => { const p = r.at(x, y); return sdrop(p[0], p[1], lerp(h0, h1, clamp((t - u) / 1.8)) * g, 1); })() : ''; };
  w += D(-0.3, 232, 120, 12, 38) + D(1.7, 118, 152, 10, 30);
  const slide = clamp((t - W.keringat + 0.2) / 1.3); if (t > 2.9) { const p = r.at(266, 150), q = r.at(286, 276); w += sdrop(lerp(p[0], q[0], eio(slide)), lerp(p[1], q[1], eio(slide)), 46 - 8 * slide, 1 - clamp((t - 4.5) * 3)); }
  const f = r.at(200, 250), zk = track([[0, 540, 960, 0], [2.4, 540, 960, 0], [4.3, f[0] + 30, f[1] - 50, Math.log(2.1)], [4.9, f[0] + 30, f[1] - 50, Math.log(2.1)]])(t);
  out.A += camG(w, Math.exp(zk[2]), zk[0], zk[1], 540, lerp(960, 900, sm((t - 2.4) / 1.8)));
  const th = camG(thermo(120, 600, 520, lv) + tag('SUHU TUBUH', 120, 548, 1, { size: 30 }), 1, 540, 960, 540, 960);
  out.U += chip(['KENAPA TUBUH', 'BERKERINGAT?'], t, -0.4, 4.8, { size: 62, bg: '#fff' }) + op(1 - sm((t - 3.6) / 0.6), th) + `<g opacity="${f1(1 - sm((t - 3.6) / 0.6))}">${heatArrow(120, 480, -90, 0, 0)}</g>`;
}
