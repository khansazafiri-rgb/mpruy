import { clamp, op, caption, NAVY } from './common.js';
import { sceneHook, sceneThink, sceneEvidence, sceneLocal, sceneRegional, sceneTotal, sceneSummary } from './sA.js';
import { sceneNormal, sceneBlock } from './sB.js';
export async function frame(t) {
  const out = { A: '', U: '' };
  out.A += `<rect width="1080" height="1920" fill="${NAVY}"/>`;
  const seq = (t0, t1, fn, fi = 0.15, fo = 0.15) => { if (t < t0 - 0.01 || t >= t1 + 0.01) return; const o = { A: '', U: '' }; fn(t, o); const a = (fi <= 0 ? 1 : clamp((t - t0) / fi)) * clamp((t1 - t) / fo); out.A += op(a, o.A); out.U += op(a, o.U); };
  seq(0, 4.45, sceneHook, 0, 0.2); seq(4.25, 15.25, sceneNormal, 0.25, 0.2); seq(15.0, 19.15, sceneThink, 0.2, 0.2); seq(19.0, 33.5, sceneBlock, 0.25, 0.2); seq(33.3, 38.3, sceneEvidence, 0.2, 0.15); seq(38.05, 42.2, sceneLocal, 0.2, 0.15); seq(41.95, 48.7, sceneRegional, 0.2, 0.15); seq(48.45, 54.3, sceneTotal, 0.2, 0.15); seq(54.0, 59.52, sceneSummary, 0.2, 0.0);
  out.U += caption(t);
  return out;
}
