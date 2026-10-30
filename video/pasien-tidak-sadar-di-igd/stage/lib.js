// Pembantu umum: matematika, easing, dan pembuat string SVG.
export const clamp = (x, a, b) => Math.max(a, Math.min(b, x));
export const lerp = (a, b, t) => a + (b - a) * t;
export const ease = (t) => { t = clamp(t, 0, 1); return t * t * (3 - 2 * t); };
export const easeOut = (t) => 1 - Math.pow(1 - clamp(t, 0, 1), 3);
export const easeInOut = (t) => { t = clamp(t, 0, 1); return t < 0.5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2; };
export const backOut = (x) => { x = clamp(x, 0, 1); const c1 = 1.70158, c3 = c1 + 1; return 1 + c3 * Math.pow(x - 1, 3) + c1 * Math.pow(x - 1, 2); };
export const seg = (t, a, b) => clamp((t - a) / (b - a), 0, 1);
export const win = (t, a, b, fi = 0.25, fo = 0.25) => clamp((t - a) / fi, 0, 1) * clamp((b - t) / fo, 0, 1);
export const r1 = (n) => Math.round(n * 10) / 10;
export const rnd = (i) => { const x = Math.sin(i * 127.1 + 311.7) * 43758.5453; return x - Math.floor(x); };
export function kf(t, keys, fn = ease) {
  if (t <= keys[0][0]) return keys[0][1];
  for (let i = 0; i + 1 < keys.length; i++) {
    const [t0, v0] = keys[i], [t1, v1] = keys[i + 1];
    if (t <= t1) { const k = fn((t - t0) / (t1 - t0 || 1)); return Array.isArray(v0) ? v0.map((x, j) => lerp(x, v1[j], k)) : lerp(v0, v1, k); }
  }
  return keys[keys.length - 1][1];
}
export const blinkAt = (t, period = 3.6, off = 1.1) => { const x = (((t - off) % period) + period) % period; return x > 0.16 ? 0 : Math.sin((x / 0.16) * Math.PI); };
// penempatan: titik pijakan (x, y) di lantai, skala; sumber digambar pada canvas 400 x 800 dengan lantai y = 778
export const place = (inner, x, y, s = 1, extra = '') => `<g transform="translate(${r1(x)} ${r1(y)}) scale(${r1(s * 1000) / 1000}) translate(-200 -778)"${extra}>${inner}</g>`;
// penempatan lewat pusat kepala (untuk potongan wajah): kepala berpusat di (hx, hy)
export const placeHead = (inner, hx, hy, s = 1, rot = 0) => `<g transform="translate(${r1(hx)} ${r1(hy)}) rotate(${rot}) scale(${r1(s * 1000) / 1000}) translate(-200 -232)">${inner}</g>`;
export const g = (inner, { x = 0, y = 0, s = 1, r = 0, o = 1, sx, sy } = {}) => `<g transform="translate(${r1(x)} ${r1(y)}) rotate(${r1(r)}) scale(${r1((sx ?? s) * 1000) / 1000} ${r1((sy ?? s) * 1000) / 1000})" opacity="${r1(o * 100) / 100}">${inner}</g>`;
export const rect = (x, y, w, h, fill, rx = 0, extra = '') => `<rect x="${r1(x)}" y="${r1(y)}" width="${r1(w)}" height="${r1(h)}" rx="${rx}" fill="${fill}" ${extra}/>`;
export const circ = (x, y, r, fill, extra = '') => `<circle cx="${r1(x)}" cy="${r1(y)}" r="${r1(r)}" fill="${fill}" ${extra}/>`;
export const txt = (s, x, y, { size = 40, fill = '#0A3830', weight = 800, anchor = 'middle', ls = 0, extra = '' } = {}) =>
  `<text x="${r1(x)}" y="${r1(y)}" text-anchor="${anchor}" font-family="'Plus Jakarta Sans',sans-serif" font-weight="${weight}" font-size="${size}" fill="${fill}" letter-spacing="${ls}" ${extra}>${s}</text>`;
export const poly = (pts, fill, extra = '') => `<polygon points="${pts.map((p) => r1(p[0]) + ',' + r1(p[1])).join(' ')}" fill="${fill}" ${extra}/>`;
export const C = { ink: '#172B38', forest: '#0A3830', green: '#00A383', mint: '#9DE0BD', cream: '#FBF3E2', gold: '#F8C038', coral: '#E8665F', red: '#D9382F', blue: '#58B9EA' };
