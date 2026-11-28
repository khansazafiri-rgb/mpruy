import { clamp, op, caption, NAVY } from './common.js';
import { sceneHook, sceneOuter, sceneOther } from './sA.js';
import { sceneFollicle } from './sB.js';
import { sceneE } from './sC.js';
export async function frame(t) {
  const out = { A: '', U: '' };
  out.A += `<rect width="1080" height="1920" fill="${NAVY}"/>`;
  const seq = (t0, t1, fn, fi = 0.15, fo = 0.15) => { if (t < t0 - 0.01 || t >= t1 + 0.01) return; const o = { A: '', U: '' }; fn(t, o); const a = (fi <= 0 ? 1 : clamp((t - t0) / fi)) * clamp((t1 - t) / fo); out.A += op(a, o.A); out.U += op(a, o.U); };
  seq(0, 5.0, sceneHook, 0, 0.2); seq(4.8, 28.95, sceneFollicle, 0.25, 0.2); seq(28.55, 32.9, sceneOuter, 0.25, 0.2); seq(32.7, 47.1, sceneE, 0.25, 0.2); seq(46.9, 52.94, sceneOther, 0.25, 0.0);
  out.U += caption(t);
  return out;
}
