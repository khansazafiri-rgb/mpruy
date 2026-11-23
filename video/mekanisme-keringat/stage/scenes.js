import { clamp, op, caption, NAVY } from './common.js';
import { sceneA } from './sA.js';
import { sceneB } from './sB.js';
import { sceneC } from './sC.js';
import { sceneD, sceneE } from './sD.js';
import { sceneF, sceneG } from './sF.js';
export async function frame(t) {
  const out = { A: '', U: '' };
  out.A += `<rect width="1080" height="1920" fill="${NAVY}"/>`;
  const seq = (t0, t1, fn, fi = 0.15, fo = 0.15) => { if (t < t0 - 0.01 || t >= t1 + 0.01) return; const o = { A: '', U: '' }; fn(t, o); const a = (fi <= 0 ? 1 : clamp((t - t0) / fi)) * clamp((t1 - t) / fo); const dx = 3 * Math.sin(t * 0.9), dy = 4 * Math.sin(t * 0.7 + 1); out.A += op(a, `<g transform="translate(${dx.toFixed(1)} ${dy.toFixed(1)})">${o.A}</g>`); out.U += op(a, o.U); };
  seq(0, 4.9, sceneA, 0, 0.1); seq(4.7, 14.0, sceneB, 0.2, 0.2); seq(13.8, 30.9, sceneC, 0.25, 0.15); seq(30.8, 38.75, sceneD, 0.2, 0.1); seq(38.65, 43.95, sceneE, 0.15, 0.15); seq(43.85, 59.7, sceneF, 0.2, 0.2); seq(59.5, 67.0, sceneG, 0.2, 0.0);
  out.U += caption(t);
  return out;
}
