// A. HOOK (0 - 4,5): palu mendekat dan mengetuk tendon patela Raka sejak frame 0; tungkai bawah terangkat sesaat; Raka heran. Kamera mulai dari lutut lalu mundur memperlihatkan wajah Raka.
import { f1, clamp, lerp, sm, eo, eio, K, chip, op, camG, pchip, rk, raka, rIdle, lerpState } from './common.js';
import { SK, rg, room, chair, hammerSvg, impact, seated, withKick, kick } from './seat.js';

export const TAPS_HOOK = [0.62, 3.40];
export const thetaHook = (t) => kick(t, 0.66, 0.28, 32) + kick(t, 3.44, 0.28, 30);
export function hookRaka(t, th) {
  const A = seated('netral', { yaw: 0.4, gazeX: 0.9, gazeY: 0.1 }), KA = seated('kaget', { yaw: 0.4, gazeX: 0.9, gazeY: 0.9 }), TH = seated('berpikir', { yaw: 0.4, gazeX: 0.9, gazeY: 0.9, tilt: 4 });
  let st;
  if (t < 0.95) st = A;
  else if (t < 2.25) st = lerpState(A, KA, sm((t - 0.95) / 0.3));
  else if (t < 3.4) st = lerpState(KA, TH, sm((t - 2.25) / 0.6));
  else if (t < 3.9) st = lerpState(TH, KA, sm((t - 3.4) / 0.15) * 0.7);
  else st = lerpState(lerpState(TH, KA, 0.7), TH, sm((t - 3.9) / 0.5));
  st = rIdle(st, t);
  return withKick(st, th);
}
export const hookCam = (() => {
  const k = [[0, 520, 1110, Math.log(1.7)], [0.8, 520, 1100, Math.log(1.55)], [1.9, 540, 990, Math.log(1.08)], [4.1, 540, 975, Math.log(1.02)], [4.5, 540, 975, Math.log(1.0)]];
  const f = pchip(k.map((q) => [q[0], q[1]])), g = pchip(k.map((q) => [q[0], q[2]])), h = pchip(k.map((q) => [q[0], q[3]]));
  return (t) => [f(t), g(t), Math.exp(h(t))];
})();
export function worldBase(t, th, st, taps, extra = '') {
  const r = rk(st, SK.cx, SK.ty, SK.k, 'rS');
  return { svg: room() + rg(chair()) + r.svg + extra, r };
}
export function sceneHook(t, out) {
  const th = thetaHook(t), st = hookRaka(t, th);
  const { svg } = worldBase(t, th, st, TAPS_HOOK);
  const w = svg + hammerSvg(t, TAPS_HOOK) + impact(t, TAPS_HOOK);
  const [cx, cy, z] = hookCam(t);
  out.A += camG(w, z, cx, cy, 540, 960);
  out.U += chip(['KOK KAKI LANGSUNG', 'BERGERAK?'], t, 2.5, 4.5, { size: 66, bg: K.red, fg: '#fff' });
}
