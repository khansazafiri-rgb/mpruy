// Urutan adegan (t = detik video = detik narasi). Satu peta ruang: Raka duduk menghadap kanan, kaki R (dekat kamera) = kaki yang terkena; penampang betis di titik tekanan yang sama.
import { clamp, lerp, sm, caption, op, iris } from './common.js';
import { sceneHook } from './outer.js';
import { sceneKebas, sceneEnd } from './outer.js';
import { sceneTissue } from './sTissue.js';
const mixU = (a, b, p) => (p < 0.5 ? op(1 - p * 2, a) : '') + (p >= 0.5 ? op((p - 0.5) * 2, b) : '');
export async function frame(t) {
  const out = { A: '', U: '' };
  const hk = { A: '', U: '' }, ti = { A: '', U: '' }, kb = { A: '', U: '' }, en = { A: '', U: '' };
  if (t < 7.3) sceneHook(t, hk);
  if (t >= 6.5 && t < 24.9) sceneTissue(t, ti);
  if (t >= 24.3 && t < 29.0) sceneKebas(t, kb);
  if (t >= 28.4 && t < 41.2) sceneTissue(t, ti.B || (ti.B = { A: '', U: '' }));
  if (t >= 40.3) sceneEnd(t, en);
  const tB = ti.B || ti;
  let r;
  if (t < 6.5) r = hk;
  else if (t < 7.2) { const p = (t - 6.5) / 0.7, c = hk.hookPt || [540, 960]; r = { A: iris(hk.A, ti.A, c[0], c[1], p, 'i1'), U: mixU(hk.U, ti.U, p) }; }
  else if (t < 24.3) r = ti;
  else if (t < 24.9) { const p = (t - 24.3) / 0.6, c = kb.hookPt || [540, 960]; r = { A: iris(ti.A, kb.A, c[0], c[1], p, 'i2'), U: mixU(ti.U, kb.U, p) }; }
  else if (t < 28.4) r = kb;
  else if (t < 29.0) { const p = (t - 28.4) / 0.6, c = kb.hookPt || [540, 960]; r = { A: iris(kb.A, tB.A, c[0], c[1], p, 'i3'), U: mixU(kb.U, tB.U, p) }; }
  else if (t < 40.3) r = tB;
  else if (t < 40.9) { const p = (t - 40.3) / 0.6; r = { A: iris(tB.A, en.A, 540, 1150, p, 'i4'), U: mixU(tB.U, en.U, p) }; }
  else r = en;
  out.A = r.A; out.U = r.U + caption(t);
  return out;
}
