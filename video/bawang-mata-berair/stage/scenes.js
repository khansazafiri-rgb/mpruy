// Urutan adegan (t = detik video = detik narasi). Peralihan lensa (iris) selalu berpusat di benda yang sedang diikuti kamera.
import { clamp, caption, op, iris } from './common.js';
import { sceneHook, sceneFlight } from './sKitchen.js';
import { sceneCell } from './sCell.js';
import { sceneEye } from './sEye.js';
import { sceneFace } from './sEnd.js';
const mixU = (a, b, p) => (p < 0.5 ? op(1 - p * 2, a) : '') + (p >= 0.5 ? op((p - 0.5) * 2, b) : '');
export async function frame(t) {
  const out = { A: '', U: '' };
  const hk = { A: '', U: '' }, ce = { A: '', U: '' }, fl = { A: '', U: '' }, ey = { A: '', U: '' }, fc = { A: '', U: '' };
  if (t < 6.1) sceneHook(t, hk);
  if (t >= 5.6 && t < 11.95) sceneCell(t, ce);
  if (t >= 11.4 && t < 13.9) sceneFlight(t, fl);
  if (t >= 13.1 && t < 20.3) sceneEye(t, ey);
  if (t >= 19.55) sceneFace(t, fc);
  const tr = (a, b, t0, d, cx, cy, id) => ({ A: iris(a.A, b.A, cx, cy, (t - t0) / d, id), U: mixU(a.U, b.U, clamp((t - t0) / d)) });
  let r;
  if (t < 5.65) r = hk;
  else if (t < 6.1) r = tr(hk, ce, 5.65, 0.45, 540, 960, 'i1');
  else if (t < 11.45) r = ce;
  else if (t < 11.95) r = tr(ce, fl, 11.45, 0.5, 540, 330, 'i2');
  else if (t < 13.2) r = fl;
  else if (t < 13.8) r = tr(fl, ey, 13.2, 0.6, 412, 945, 'i3');
  else if (t < 19.65) r = ey;
  else if (t < 20.3) r = tr(ey, fc, 19.65, 0.65, 540, 960, 'i4');
  else r = fc;
  out.A = r.A; out.U = r.U + caption(t);
  return out;
}
