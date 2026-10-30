import { clamp, lerp, ease } from './rig.js';
export function kf(t, keys, fn = ease) {
  if (t <= keys[0][0]) return keys[0][1];
  for (let i = 0; i + 1 < keys.length; i++) {
    const [t0, v0] = keys[i], [t1, v1] = keys[i + 1];
    if (t <= t1) { const k = fn((t - t0) / (t1 - t0 || 1)); return Array.isArray(v0) ? v0.map((x, j) => lerp(x, v1[j], k)) : lerp(v0, v1, k); }
  }
  return keys[keys.length - 1][1];
}
export const lin = (x) => clamp(x, 0, 1);
export const win = (t, a, b, fi = 0.25, fo = 0.25) => clamp((t - a) / fi, 0, 1) * clamp((b - t) / fo, 0, 1);
export const blinkAt = (t, period, off) => { const ph = (((t + off) % period) + period) % period; const d = Math.abs(ph - 0.12); return d < 0.12 ? 1 - d / 0.12 : 0; };
