// Urutan adegan (t = detik video = detik narasi). Satu peta ruang: Raka duduk menghadap kanan; kamera mengikuti palu -> tendon -> otot -> saraf -> sumsum -> otot -> tungkai.
import { clamp, caption, op } from './common.js';
import { sceneHook } from './sHook.js';
import { sceneBody } from './sBody.js';
import { sceneRecap, sceneCompare } from './sEnd.js';
export async function frame(t) {
  const out = { A: '', U: '' };
  if (t < 4.4) sceneHook(t, out);
  else if (t < 23.95) { sceneBody(t, out); sceneRecap(t, out); }
  if (t >= 23.5) { const body = { A: '', U: '' }; sceneCompare(t, body); if (t >= 23.95) { out.A = ''; out.U = ''; } out.A += body.A; out.U += body.U; }
  out.U += caption(t);
  return out;
}
