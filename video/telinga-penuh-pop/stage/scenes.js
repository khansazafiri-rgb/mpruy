import { clamp, op, caption, NAVY } from './common.js';
import { sceneA, sceneSwallow, sceneRelief } from './sA.js';
import { sceneB, sceneC, sceneD, sceneE } from './sB.js';
export async function frame(t) {
  const out = { A: '', U: '' };
  out.A += `<rect width="1080" height="1920" fill="${NAVY}"/>`;
  const seq = (t0, t1, fn, fi = 0.15, fo = 0.15) => { if (t < t0 - 0.01 || t >= t1 + 0.01) return; const o = { A: '', U: '' }; fn(t, o); const a = (fi <= 0 ? 1 : clamp((t - t0) / fi)) * clamp((t1 - t) / fo); out.A += op(a, o.A); out.U += op(a, o.U); };
  seq(0, 5.4, sceneA, 0, 0.2); seq(5.2, 18.7, sceneB, 0.25, 0.2); seq(18.55, 20.95, sceneSwallow, 0.2, 0.2); seq(20.75, 27.15, sceneC, 0.2, 0.15); seq(27.0, 28.45, sceneRelief, 0.15, 0.15); seq(28.3, 30.35, sceneD, 0.2, 0.15); seq(30.2, 33.48, sceneE, 0.2, 0.0);
  out.U += caption(t);
  return out;
}
