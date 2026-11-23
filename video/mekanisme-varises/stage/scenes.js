import { clamp, op, caption, NAVY } from './common.js';
import { sceneA } from './sA.js';
import { sceneB, sceneD } from './sB.js';
import { sceneC, sceneC2 } from './sC.js';
export async function frame(t) {
  const out = { A: '', U: '' };
  out.A += `<rect width="1080" height="1920" fill="${NAVY}"/>`;
  const seq = (t0, t1, fn, fi = 0.15, fo = 0.15) => { if (t < t0 - 0.01 || t >= t1 + 0.01) return; const o = { A: '', U: '' }; fn(t, o); const a = (fi <= 0 ? 1 : clamp((t - t0) / fi)) * clamp((t1 - t) / fo); out.A += op(a, o.A); out.U += op(a, o.U); };
  seq(0, 3.3, sceneA, 0, 0.2); seq(3.1, 12.5, sceneB, 0.25, 0.2); seq(12.4, 17.0, sceneC, 0.25, 0.2); seq(16.85, 20.4, sceneC2, 0.2, 0.2); seq(20.2, 29.4, sceneD, 0.2, 0.0);
  out.U += caption(t);
  return out;
}
