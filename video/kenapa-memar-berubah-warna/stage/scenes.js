// Urutan adegan (t = detik video = detik narasi). Satu area memar (sisi luar tungkai bawah kaki dekat-kamera, u = 0,72) di seluruh video; peralihan lensa berpusat di memar itu.
import { clamp, caption, op, iris } from './common.js';
import { sceneHook } from './room.js';
import { sceneTissue } from './sTissue.js';
import { sceneEnd } from './sEnd.js';
const mixU = (a, b, p) => (p < 0.5 ? op(1 - p * 2, a) : '') + (p >= 0.5 ? op((p - 0.5) * 2, b) : '');
export async function frame(t) {
  const out = { A: '', U: '' };
  const hk = { A: '', U: '' }, ti = { A: '', U: '' }, en = { A: '', U: '' };
  if (t < 6.1) sceneHook(t, hk);
  if (t >= 5.5 && t < 24.6) sceneTissue(t, ti);
  if (t >= 23.85) sceneEnd(t, en);
  let r;
  if (t < 5.55) r = hk;
  else if (t < 6.05) r = { A: iris(hk.A, ti.A, 540, 960, (t - 5.55) / 0.5, 'i1'), U: mixU(hk.U, ti.U, clamp((t - 5.55) / 0.5)) };
  else if (t < 23.9) r = ti;
  else if (t < 24.5) r = { A: iris(ti.A, en.A, 540, 960, (t - 23.9) / 0.6, 'i2'), U: mixU(ti.U, en.U, clamp((t - 23.9) / 0.6)) };
  else r = en;
  out.A = r.A; out.U = r.U + caption(t);
  return out;
}
