// Alat geometri untuk bentuk organik: sampel spline Catmull-Rom, pita (tabung) meruncing, titik/normal sepanjang kurva.
import { f1, lerp, mulus, poli } from '../tensi/util.mjs';

export function sampel(pts, n = 14) {
  const P = (i) => pts[Math.max(0, Math.min(pts.length - 1, i))], out = [];
  for (let i = 0; i < pts.length - 1; i++) {
    const p0 = P(i - 1), p1 = P(i), p2 = P(i + 1), p3 = P(i + 2);
    for (let k = 0; k < n; k++) {
      const t = k / n, t2 = t * t, t3 = t2 * t;
      out.push([0.5 * ((2 * p1[0]) + (-p0[0] + p2[0]) * t + (2 * p0[0] - 5 * p1[0] + 4 * p2[0] - p3[0]) * t2 + (-p0[0] + 3 * p1[0] - 3 * p2[0] + p3[0]) * t3),
        0.5 * ((2 * p1[1]) + (-p0[1] + p2[1]) * t + (2 * p0[1] - 5 * p1[1] + 4 * p2[1] - p3[1]) * t2 + (-p0[1] + 3 * p1[1] - 3 * p2[1] + p3[1]) * t3)]);
    }
  }
  out.push(pts[pts.length - 1]); return out;
}
export function normalDi(s, i) { const a = s[Math.max(0, i - 1)], b = s[Math.min(s.length - 1, i + 1)]; let dx = b[0] - a[0], dy = b[1] - a[1]; const l = Math.hypot(dx, dy) || 1; return [-dy / l, dx / l]; }
/** Titik pada kurva (sampel) di fraksi u (0..1) beserta normal. */
export function di(s, u) {
  const c = [0]; for (let i = 1; i < s.length; i++) c.push(c[i - 1] + Math.hypot(s[i][0] - s[i - 1][0], s[i][1] - s[i - 1][1]));
  const d = Math.max(0, Math.min(1, u)) * c[c.length - 1]; let i = 1; while (i < c.length - 1 && c[i] < d) i++;
  const k = (d - c[i - 1]) / (c[i] - c[i - 1] || 1), p = [lerp(s[i - 1][0], s[i][0], k), lerp(s[i - 1][1], s[i][1], k)], n = normalDi(s, i);
  return { p, n, i };
}
/** Pita sepanjang sampel dengan setengah-lebar wf(t) (t 0..1); ujung dibulatkan (cap: 'akhir' | 'awal' | 'dua' | false). Kontur tertutup. */
export function pita(s, wf, cap = 'akhir') {
  const L = [], R = [], n = s.length;
  for (let i = 0; i < n; i++) { const t = i / (n - 1), nm = normalDi(s, i), w = wf(t); L.push([s[i][0] + nm[0] * w, s[i][1] + nm[1] * w]); R.push([s[i][0] - nm[0] * w, s[i][1] - nm[1] * w]); }
  const tutup = (idx, arah) => { const e = s[idx], nm = normalDi(s, idx), w = wf(idx / (n - 1)), t = [nm[1] * arah, -nm[0] * arah], o = [], k = 7; for (let j = 1; j < k; j++) { const th = (j / k) * Math.PI; o.push([e[0] + nm[0] * w * Math.cos(th) * arah * arah + t[0] * w * Math.sin(th), e[1] + nm[1] * w * Math.cos(th) * arah * arah + t[1] * w * Math.sin(th)]); } return o; };
  const end = cap === 'akhir' || cap === 'dua' ? tutup(n - 1, 1) : [];
  const st = cap === 'awal' || cap === 'dua' ? tutup(0, -1).reverse() : [];
  return [...L, ...end, ...R.reverse(), ...st];
}
export const pitaD = (s, wf, cap = true) => mulus(pita(s, wf, cap), true);
export const garis = (s) => poli(s);
