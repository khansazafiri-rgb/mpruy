import { clamp, caption, op, iris, K } from './common.js';
import { sceneHook } from './sHook.js';
import { sceneBody } from './sBody.js';
import { sceneEnd } from './sEnd.js';
export async function frame(t) {
  const out = { A: '', U: '' };
  const hk = { A: '', U: '' }, bd = { A: '', U: '' }, en = { A: '', U: '' };
  if (t < 6.4) sceneHook(t, hk);
  if (t >= 5.7 && t < 21.2) sceneBody(t, bd);
  if (t >= 20.5) sceneEnd(t, en);
  if (t < 5.75) { out.A = hk.A; out.U = hk.U; }
  else if (t < 6.35) { out.A = iris(hk.A, bd.A, 540, 960, (t - 5.75) / 0.6, 'irisA'); out.U = (t < 6.0 ? hk.U : '') + op(clamp((t - 6.1) / 0.25), bd.U); }
  else if (t < 20.55) { out.A = bd.A; out.U = bd.U; }
  else if (t < 21.15) { out.A = iris(bd.A, en.A, 540, 960, (t - 20.55) / 0.6, 'irisB'); out.U = (t < 20.85 ? bd.U : '') + op(clamp((t - 20.85) / 0.3), en.U); }
  else { out.A = en.A; out.U = en.U; }
  out.U += caption(t);
  return out;
}
