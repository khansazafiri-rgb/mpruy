// Alat gambar bersama untuk video "tensi rendah": pembulatan, kurva mulus, tumpukan bentuk bervolume (cahaya kiri atas), filter blur terdaftar.
export const f1 = (n) => Math.round(n * 10) / 10;
export const f2 = (n) => Math.round(n * 100) / 100;
export const clamp = (x, a = 0, b = 1) => Math.min(b, Math.max(a, x));
export const lerp = (a, b, u) => a + (b - a) * u;
export const mixA = (A, B, u) => A.map((v, i) => lerp(v, B[i], u));
export const ease = {
  inOut: (t) => (t < 0.5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2),
  out: (t) => 1 - Math.pow(1 - t, 3),
  in: (t) => t * t * t,
  lin: (t) => t,
  sm: (t) => t * t * (3 - 2 * t),
};
/** Kemajuan 0..1 dari detik a ke b. */
export const seg = (t, a, b, e = ease.sm) => e(clamp((t - a) / (b - a)));
/** Jendela: naik di [a,a+m], turun di [b-m,b]. */
export const jendela = (t, a, b, m = 0.4) => seg(t, a, a + m) * (1 - seg(t, b - m, b));
/** Interpolasi keyframe skalar [[t,v],...] dengan easing halus antar titik. */
export function kf(t, ks, e = ease.sm) {
  if (t <= ks[0][0]) return ks[0][1];
  for (let i = 0; i < ks.length - 1; i++) if (t <= ks[i + 1][0]) { const u = (t - ks[i][0]) / (ks[i + 1][0] - ks[i][0]); return lerp(ks[i][1], ks[i + 1][1], e(u)); }
  return ks[ks.length - 1][1];
}

// ---- filter blur terdaftar tetap (id bl<sd>) ----
export const SD = [0.8, 1.5, 2.5, 4, 6, 9, 14, 22, 34];
export const BLUR_DEFS = `<defs>${SD.map((s) => `<filter id="bl${String(s).replace('.', '_')}" x="-60%" y="-60%" width="220%" height="220%" color-interpolation-filters="sRGB"><feGaussianBlur stdDeviation="${s}"/></filter>`).join('')}</defs>`;
export const B = (s) => { const k = SD.reduce((a, b) => (Math.abs(b - s) < Math.abs(a - s) ? b : a)); return `url(#bl${String(k).replace('.', '_')})`; };

/** Titik -> path mulus (Catmull-Rom ke Bezier). closed: tutup kurva. */
export function mulus(pts, closed = false, k = 0.5) {
  const n = pts.length; if (n < 2) return '';
  const P = (i) => (closed ? pts[(i + n) % n] : pts[Math.max(0, Math.min(n - 1, i))]);
  let d = `M${f1(pts[0][0])} ${f1(pts[0][1])}`;
  const m = closed ? n : n - 1;
  for (let i = 0; i < m; i++) {
    const p0 = P(i - 1), p1 = P(i), p2 = P(i + 1), p3 = P(i + 2);
    const c1 = [p1[0] + (p2[0] - p0[0]) * k / 3 * 2 * 0.5 * 1.0, p1[1] + (p2[1] - p0[1]) * k / 3 * 2 * 0.5 * 1.0];
    const c2 = [p2[0] - (p3[0] - p1[0]) * k / 3 * 2 * 0.5 * 1.0, p2[1] - (p3[1] - p1[1]) * k / 3 * 2 * 0.5 * 1.0];
    d += `C${f1(c1[0])} ${f1(c1[1])} ${f1(c2[0])} ${f1(c2[1])} ${f1(p2[0])} ${f1(p2[1])}`;
  }
  return d + (closed ? 'Z' : '');
}
export const poli = (pts, closed = false) => 'M' + pts.map((p) => `${f1(p[0])} ${f1(p[1])}`).join('L') + (closed ? 'Z' : '');
export const pusat = (pts) => [pts.reduce((a, p) => a + p[0], 0) / pts.length, pts.reduce((a, p) => a + p[1], 0) / pts.length];

/** Tumpukan bentuk bervolume: lapisan gelap penuh lalu lapisan makin terang, mengecil, bergeser ke kiri atas (arah cahaya), blur makin besar. */
export function tumpuk(d, c, L) {
  let s = '';
  for (const l of L) {
    const sx = l.s ?? 1, dx = l.dx ?? 0, dy = l.dy ?? 0;
    const tr = `translate(${f1(c[0] + dx)} ${f1(c[1] + dy)}) scale(${sx}) translate(${f1(-c[0])} ${f1(-c[1])})`;
    s += `<path d="${d}" transform="${tr}" fill="${l.fill}"${l.o != null ? ` opacity="${l.o}"` : ''}${l.b ? ` filter="${B(l.b)}"` : ''}/>`;
  }
  return s;
}
/** Warna: campur dua heks. */
const hx = (h) => [1, 3, 5].map((i) => parseInt(h.slice(i, i + 2), 16));
export const mix = (a, b, t) => '#' + hx(a).map((v, i) => Math.round(lerp(v, hx(b)[i], clamp(t))).toString(16).padStart(2, '0')).join('');
export const terang = (c, t) => mix(c, '#ffffff', t);
export const gelap = (c, t) => mix(c, '#000000', t);
/** Tumpukan standar dari satu warna dasar (gelap -> terang). */
export function volum(d, c, base, { k = 1, tipis = false, hl = 1 } = {}) {
  const L = tipis
    ? [{ fill: gelap(base, 0.34) }, { fill: gelap(base, 0.08), dx: -3 * k, dy: -4 * k, s: 0.97, b: 2.5 }, { fill: terang(base, 0.2 * hl), dx: -6 * k, dy: -9 * k, s: 0.82, b: 4, o: 0.9 }]
    : [{ fill: gelap(base, 0.36) }, { fill: gelap(base, 0.1), dx: -4 * k, dy: -5 * k, s: 0.97, b: 2.5 }, { fill: base, dx: -8 * k, dy: -10 * k, s: 0.88, b: 4 }, { fill: terang(base, 0.2 * hl), dx: -14 * k, dy: -18 * k, s: 0.62, b: 6, o: 0.8 }, { fill: terang(base, 0.4 * hl), dx: -20 * k, dy: -28 * k, s: 0.36, b: 9, o: 0.5 }];
  return tumpuk(d, c, L);
}
