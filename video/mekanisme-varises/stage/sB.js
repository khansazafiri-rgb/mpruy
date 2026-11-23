// B. mekanisme katup (3,1 - 12,5): katup normal membuka/menutup, lalu melemah, sebagian sel berbalik dan berkumpul di bawah katup, dinding melebar bertahap.
// D. perbandingan (20,2 - 29,4): kamera dan ukuran vena sama; katup menutup rapat vs tidak menutup rapat. Raka memandu.
import { f1, clamp, lerp, sm, eo, eio, seg, T, GOLD, INK, rndf, K, W, chip, tag, callout, op, armTo, rk, raka, rIdle, ka } from './common.js';
import { VK, cell, flowArrow, halfW, veinShape, valve, pulse, flowCells, refluxCells, P, TF } from './vein.js';

const bgMech = `<rect x="-9000" y="-9000" width="18000" height="18000" fill="${VK.bg}"/><circle cx="80" cy="520" r="230" fill="${VK.bg2}"/><circle cx="1010" cy="1180" r="270" fill="${VK.bg2}"/>`;
// satu adegan vena: o = { x0, t0, wFn, grow, events, cy }
export function veinWorld(t, o) {
  const pu = pulse(t, o.t0), w = o.wFn(t), grow = o.grow ? o.grow(t) : 0, cy = o.cy ? o.cy(t) : 0;
  const VAL_Y = 840;
  let g = veinShape(grow) + flowCells(t, o.t0, grow) + (o.events ? refluxCells(t, o.events, grow) : '') + valve(pu.c, w);
  // panah aliran: teal naik (selalu), jingga turun (saat ada aliran balik)
  const upA = 0.95, refluxing = o.events && w > 0.6 ? o.events.some((e) => t > e + 0.2 && t < e + 1.5) : false;
  const ax = o.ax ?? 340; g += flowArrow(ax, -300, -90, 190, VK.up, VK.upD, upA, 30);
  const dn = refluxing ? 1 : 0; if (dn) g += flowArrow(ax, 120, 90, 170, VK.down, VK.downD, 0.95, 30);
  return { svg: `<g transform="translate(${o.x0} ${VAL_Y - cy})">${g}</g>`, cy, pu, w, sy: (wy) => VAL_Y - cy + wy, sx: (wx) => o.x0 + wx };
}
export function sceneB(t, out) {
  const cfg = { x0: 540, t0: 3.0, wFn: (tt) => seg(tt, 7.5, 9.0), grow: (tt) => seg(tt, 10.4, 12.4), events: [9.6, 10.6, 11.4], cy: (tt) => 440 * eio((tt - 10.2) / 2.0) };
  const v = veinWorld(t, cfg);
  out.A += bgMech + v.svg;
  let u = chip(['KATUP VENA'], t, 3.2, 7.4, { size: 66, bg: '#fff' }) + chip(['KATUP TIDAK', 'MENUTUP RAPAT'], t, 7.45, 9.65, { size: 56, bg: '#FFE1CF', fg: INK }) + chip(['SEBAGIAN BERBALIK ↓'], t, 9.7, 12.55, { size: 54, bg: VK.down, fg: INK });
  u += callout('daun katup', 250, 740 - v.cy * 0 , v.sx(-170), v.sy(-30), ka(t, W.katup1 - 0.1, 7.3, 0.25), { size: 36, col: VK.leaf, k: eo(clamp((t - W.katup1 + 0.1) / 0.4)) });
  u += tag('KE JANTUNG ↑', v.sx(340), v.sy(-110), ka(t, 5.2, 12.5, 0.3) * (1 - clamp((t - 10.3) / 0.4)), { size: 30, bg: '#CFF5E6', fg: '#0A4A3A' });
  u += tag('darah naik, katup membuka', 330, 1190, ka(t, 4.6, 7.2, 0.3) , { size: 30, bg: '#fff' });
  u += tag('katup menutup: darah tertahan', 330, 1190 + 0, ka(t, 5.9, 7.2, 0.3) * 0, { size: 30 });
  out.U += u;
}
export function sceneD(t, out) {
  const weakAt = 25.58, cfg = { x0: 690, t0: 20.3, ax: 298, wFn: (tt) => seg(tt, weakAt, 25.95), events: t >= weakAt ? [26.4, 27.6, 28.8] : null };
  const v = veinWorld(t, cfg);
  const st = rIdle(raka(t < 25.5 ? 'senang' : 'khawatir', 'menunjuk', { yaw: 0.55, gazeX: 0.9, gazeY: -0.1 }), t);
  const r = rk(st, 195, 470, 1.0, 'rD');
  out.A += bgMech + r.svg + v.svg;
  const healthy = t < 25.5;
  let u = chip(['MENUTUP RAPAT'], t, 20.3, 25.5, { size: 66, bg: '#CFF5E6', fg: '#0A4A3A' }) + chip(['TIDAK MENUTUP', 'RAPAT'], t, 25.55, 29.5, { size: 58, bg: '#FFE1CF', fg: '#8A3F0E' });
  u += tag('aliran tetap naik', 700, 1245, ka(t, W.menjaga, 25.4, 0.3), { size: 32, bg: '#CFF5E6', fg: '#0A4A3A' });
  u += tag('sebagian darah turun lagi', 700, 1245, ka(t, W.membiarkan, 29.5, 0.3), { size: 32, bg: '#FFE1CF', fg: '#8A3F0E' });
  u += tag('KE JANTUNG ↑', v.sx(290), v.sy(-250), ka(t, 20.5, 29.5, 0.3), { size: 24, bg: '#CFF5E6', fg: '#0A4A3A' });
  out.U += u;
}
