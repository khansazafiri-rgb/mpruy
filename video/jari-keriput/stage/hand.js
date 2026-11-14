// Tangan (telapak menghadap kamera) dan kaki (telapak) berproporsi nyata, digambar dari kode. Satuan = sentimeter, sumbu y ke bawah.
// Ukuran: panjang tangan ±19 cm (telapak 10,4 cm + jari tengah 8,7 cm), lebar telapak 8,4 cm, kaki ±26 cm. Kamera hanya mengubah skala tampilan, bukan ukuran tangan.
import { f1, clamp, lerp, sm } from './core.js';
const D2R = Math.PI / 180;
const SKIN = { base: '#D8946A', light: '#EDB68B', dark: '#B97B52', edge: '#8E5A38', crease: 'rgba(120,70,40,.42)', wet: '#E9DDD2' };
export { SKIN };
const r2 = (v) => Math.round(v * 100) / 100;
// ---- rantai ruas jari: pts[0..n]; flex = lentur ke arah kamera (memendekkan ruas secara proyeksi)
export function chain(def, flex, spread) {
  let x = def.x, y = def.y, a = (def.ang + spread) * D2R, cum = 0; const pts = [[x, y]];
  def.len.forEach((L, i) => { cum += flex[i] || 0; const l = L * Math.cos(cum * D2R * 0.92); x += Math.sin(a) * l; y -= Math.cos(a) * l; pts.push([x, y]); });
  return pts;
}
function catmull(p0, p1, p2, p3, t) {
  const t2 = t * t, t3 = t2 * t;
  return [0, 1].map((k) => 0.5 * ((2 * p1[k]) + (-p0[k] + p2[k]) * t + (2 * p0[k] - 5 * p1[k] + 4 * p2[k] - p3[k]) * t2 + (-p0[k] + 3 * p1[k] - 3 * p2[k] + p3[k]) * t3));
}
/** garis tengah halus + lebar (diameter) sepanjang ruas */
export function centerline(pts, widths, per = 10) {
  const n = pts.length, P = [pts[0].map((v, k) => 2 * v - pts[1][k]), ...pts, pts[n - 1].map((v, k) => 2 * v - pts[n - 2][k])]; const out = [];
  for (let i = 0; i < n - 1; i++) for (let s = 0; s < per; s++) { const t = s / per, c = catmull(P[i], P[i + 1], P[i + 2], P[i + 3], t), w = lerp(widths[i], widths[i + 1], sm(t)); out.push({ x: c[0], y: c[1], w }); }
  const e = pts[n - 1]; out.push({ x: e[0], y: e[1], w: widths[n - 1] });
  for (let i = 0; i < out.length; i++) { const a = out[Math.max(0, i - 1)], b = out[Math.min(out.length - 1, i + 1)]; let tx = b.x - a.x, ty = b.y - a.y; const l = Math.hypot(tx, ty) || 1; out[i].tx = tx / l; out[i].ty = ty / l; }
  return out;
}
/** kontur kapsul meruncing (ujung bulat) dari garis tengah */
export function outline(cl) {
  const L = [], Rr = [];
  cl.forEach((p) => { const nx = -p.ty, ny = p.tx, h = p.w / 2; L.push([p.x + nx * h, p.y + ny * h]); Rr.push([p.x - nx * h, p.y - ny * h]); });
  const e = cl[cl.length - 1], r = e.w / 2, cap = [];
  for (let k = 1; k < 10; k++) { const th = Math.PI * k / 10, nx = -e.ty, ny = e.tx; cap.push([e.x + (nx * Math.cos(th) + e.tx * Math.sin(th)) * r, e.y + (ny * Math.cos(th) + e.ty * Math.sin(th)) * r]); }
  const pts = [...L, ...cap, ...Rr.reverse()];
  return 'M' + pts.map((p) => `${r2(p[0])} ${r2(p[1])}`).join('L') + 'Z';
}
// ---- tangan: definisi ruas (cm)
export const FINGERS = {
  index: { x: -2.85, y: 0.55, ang: -5, len: [3.7, 2.2, 1.9], w: [1.95, 1.82, 1.66, 1.46] },
  middle: { x: -0.95, y: 0.3, ang: -1, len: [4.1, 2.6, 2.0], w: [2.0, 1.86, 1.7, 1.5] },
  ring: { x: 0.95, y: 0.55, ang: 3, len: [3.8, 2.4, 1.9], w: [1.9, 1.76, 1.6, 1.4] },
  pinky: { x: 2.7, y: 1.1, ang: 9, len: [3.0, 1.8, 1.6], w: [1.66, 1.5, 1.35, 1.2] },
  thumb: { x: -3.6, y: 6.2, ang: -44, len: [3.3, 3.0, 2.4], w: [2.8, 2.4, 2.1, 1.85] },
};
const ORDER = ['pinky', 'ring', 'middle', 'index', 'thumb'];
/** pose gerak lembut di dalam air; t detik, m = skala amplitudo (0..1) */
export function pose(t, m = 1) {
  const f = {}, ph = { index: 0.0, middle: 0.55, ring: 1.1, pinky: 1.65, thumb: 2.3 };
  ORDER.forEach((k) => {
    const s = Math.sin(2 * Math.PI * t / 3.4 - ph[k]), s2 = Math.sin(2 * Math.PI * t / 2.3 - ph[k] * 1.3);
    const base = k === 'thumb' ? [10, 14, 8] : [9, 14, 9], amp = k === 'thumb' ? [8, 8, 6] : [9, 12, 8];
    f[k] = { flex: base.map((b, i) => b + amp[i] * m * (0.5 + 0.5 * (i === 1 ? s2 : s))), spread: 3.2 * m * Math.sin(2 * Math.PI * t / 4.1 - ph[k]) + (k === 'pinky' ? 4 : k === 'index' ? -2 : 0) };
  });
  return f;
}
export function handGeometry(P) {
  const g = {};
  ORDER.forEach((k) => { const d = FINGERS[k]; g[k] = chain(d, P[k].flex, P[k].spread); });
  return g;
}
const PALM = 'M-4.2 0.2L4.0 1.0C4.55 3.5 4.3 7.2 3.3 10.6L-3.0 10.8C-5.4 8.5 -5.7 5.2 -4.55 3.2C-4.4 2.0 -4.3 1.0 -4.2 0.2Z';
const FOREARM = 'M-3.1 10.0L3.2 10.0C3.6 16 4.1 24 4.4 34L-4.5 34C-4.2 24 -3.6 16 -3.1 10.0Z';
// ---- garis kerutan basah di bantalan ujung jari (lentur: sepanjang jari, bercabang di dekat ujung)
function wr(seed) { let s = seed * 9301 + 49297; return () => { s = (s * 9301 + 49297) % 233280; return s / 233280; }; }
export function tipWrinkles(cl0, wrk, seed) {
  if (wrk <= 0.01) return '';
  const cl = cl0.slice(), e = cl0[cl0.length - 1];
  for (let k = 1; k <= 4; k++) { const d = e.w / 2 * 0.62 * k / 4, ww = e.w * Math.sqrt(Math.max(0.05, 1 - Math.pow(0.62 * k / 4 * 1.3, 2))); cl.push({ x: e.x + e.tx * d, y: e.y + e.ty * d, w: ww, tx: e.tx, ty: e.ty }); }
  const n = cl.length, i0 = Math.floor(n * 0.7), rnd = wr(seed), w = cl[n - 1].w; let s = '';
  const lines = 9, ph0 = rnd() * 6.28;
  for (let j = 0; j < lines; j++) {
    const fr = (j / (lines - 1) - 0.5) * 0.86, reveal = clamp((wrk * 1.35 - 0.12 - Math.abs(fr) * 0.35) * 1.5);
    if (reveal <= 0.01) continue;
    const uS = i0 + (j % 3), uE = n - 1 - (j % 2), pts = [];
    for (let i = uS; i <= uE; i++) {
      const p = cl[i], u = (i - uS) / Math.max(1, uE - uS), wob = Math.sin(u * 7.2 + ph0 + j * 0.55) * (0.028 + 0.05 * wrk) * 1.0, off = fr * p.w * (1 - 0.45 * u * u) + wob * (0.5 + 0.5 * u);
      pts.push([p.x + (-p.ty) * off, p.y + p.tx * off]);
    }
    const d = 'M' + pts.map((p) => `${r2(p[0])} ${r2(p[1])}`).join('L');
    s += `<path d="${d}" fill="none" stroke="rgba(112,66,40,${f1(0.4 * reveal)})" stroke-width="${f1(0.034 + 0.02 * wrk)}" stroke-linecap="round" stroke-linejoin="round"/><path d="${d}" fill="none" stroke="rgba(255,240,224,${f1(0.32 * reveal)})" stroke-width="0.02" stroke-linecap="round" transform="translate(0.04 0.025)"/>`;
  }
  for (let j = 0; j < 4; j++) {
    const i = i0 + 2 + Math.floor(rnd() * (n - i0 - 6)), p = cl[i], off = (rnd() - 0.5) * 0.55 * p.w, cx = p.x + (-p.ty) * off, cy = p.y + p.tx * off, len = (0.1 + rnd() * 0.1) * p.w, reveal = clamp(wrk * 1.5 - 0.5);
    if (reveal > 0.01) s += `<path d="M${r2(cx - p.ty * 0 - (-p.ty) * len)} ${r2(cy - p.tx * len)}Q${r2(cx + p.tx * 0.04)} ${r2(cy + p.ty * 0.04)} ${r2(cx + (-p.ty) * len)} ${r2(cy + p.tx * len)}" stroke="rgba(112,66,40,${f1(0.34 * reveal)})" stroke-width="0.04" stroke-linecap="round" fill="none"/>`;
  }
  return s;
}
let _wid = 0;
const wetTint = (cl, wrk) => {
  if (wrk <= 0.01) return '';
  const i0 = Math.floor(cl.length * 0.6), a = cl[i0], b = cl[cl.length - 1], id = 'wt' + (_wid++ % 12);
  return `<linearGradient id="${id}" gradientUnits="userSpaceOnUse" x1="${r2(a.x)}" y1="${r2(a.y)}" x2="${r2(b.x)}" y2="${r2(b.y)}"><stop offset="0" stop-color="${SKIN.wet}" stop-opacity="0"/><stop offset=".55" stop-color="${SKIN.wet}" stop-opacity="${f1(0.38 * wrk)}"/><stop offset="1" stop-color="${SKIN.wet}" stop-opacity="${f1(0.46 * wrk)}"/></linearGradient><path d="${outline(cl.slice(i0))}" fill="url(#${id})"/>`;
};
function creases(pts, w) {
  let s = '';
  for (let i = 1; i < pts.length - 1; i++) { const a = pts[i - 1], b = pts[i], c = pts[i + 1], tx = c[0] - a[0], ty = c[1] - a[1], l = Math.hypot(tx, ty) || 1, nx = -ty / l, ny = tx / l, hw = w[i] * 0.36; for (const o of [-0.09, 0.09]) s += `<path d="M${r2(b[0] + nx * hw + tx / l * o)} ${r2(b[1] + ny * hw + ty / l * o)}Q${r2(b[0] + tx / l * (o + 0.06))} ${r2(b[1] + ty / l * (o + 0.06))} ${r2(b[0] - nx * hw + tx / l * o)} ${r2(b[1] - ny * hw + ty / l * o)}" stroke="${SKIN.crease}" stroke-width="0.05" fill="none" stroke-linecap="round"/>`; }
  return s;
}
/** satu tangan lengkap (pergelangan di y≈10,6). wrk = tingkat kerutan ujung jari 0..1. */
export function hand(t, wrk, m = 1) {
  const P = pose(t, m), G = handGeometry(P), cl = {};
  ORDER.forEach((k) => { cl[k] = centerline(G[k], FINGERS[k].w, 9); });
  const shapes = ORDER.map((k) => outline(cl[k])), parts = [FOREARM, PALM, ...shapes];
  let s = `<defs><linearGradient id="skinG" x1="0" y1="0" x2="1" y2="1"><stop offset="0" stop-color="${SKIN.light}"/><stop offset="1" stop-color="${SKIN.base}"/></linearGradient><radialGradient id="thenar" cx=".5" cy=".5" r=".5"><stop offset="0" stop-color="#C98A60" stop-opacity=".5"/><stop offset="1" stop-color="#C98A60" stop-opacity="0"/></radialGradient></defs>`;
  s += `<g stroke="${SKIN.edge}" stroke-width="0.07" stroke-linejoin="round" fill="${SKIN.edge}">${parts.map((d) => `<path d="${d}"/>`).join('')}</g>`;
  s += `<g fill="url(#skinG)">${parts.map((d) => `<path d="${d}"/>`).join('')}</g>`;
  // bayangan lembut + garis telapak
  s += `<ellipse cx="-3.1" cy="6.2" rx="1.9" ry="3.1" transform="rotate(-18 -3.1 6.2)" fill="url(#thenar)"/>`;
  s += `<g fill="none" stroke="${SKIN.crease}" stroke-width="0.07" stroke-linecap="round"><path d="M-4.0 3.4C-2.2 3.2 0.6 3.0 3.5 3.8"/><path d="M-4.2 5.0C-2 5.3 -0.6 6.3 -0.1 8.6"/><path d="M-3.4 2.6C-1.5 3 0.3 4.3 -0.1 6.4" opacity=".7"/></g>`;
  ORDER.forEach((k) => { s += creases(G[k].slice(0, 3), FINGERS[k].w); });
  // sorot tipis sepanjang jari
  s += ORDER.map((k) => `<path d="M${cl[k].filter((_, i) => i % 3 === 0).map((p) => `${r2(p.x + p.ty * p.w * 0.2)} ${r2(p.y - p.tx * p.w * 0.2)}`).join('L')}" fill="none" stroke="rgba(255,236,214,.2)" stroke-width="${0.1}" stroke-linecap="round"/>`).join('');
  ORDER.forEach((k, i) => { s += wetTint(cl[k], wrk) + tipWrinkles(cl[k], wrk, 11 + i * 7); });
  return { svg: s, G, cl, P };
}
// ---- kaki (telapak menghadap kamera): jari kaki pendek, kerutan di ujung
const TOES = {
  t1: { x: -3.2, y: 2.0, ang: -7, len: [3.9, 2.3], w: [3.0, 2.8, 2.4] },
  t2: { x: -1.25, y: 1.7, ang: -3, len: [3.6, 2.0], w: [1.85, 1.75, 1.5] },
  t3: { x: 0.15, y: 2.3, ang: 1, len: [3.3, 1.7], w: [1.65, 1.55, 1.35] },
  t4: { x: 1.4, y: 2.9, ang: 5, len: [3.0, 1.5], w: [1.5, 1.4, 1.2] },
  t5: { x: 2.55, y: 3.7, ang: 10, len: [2.7, 1.2], w: [1.4, 1.3, 1.1] },
};
const SOLE = 'M-4.3 1.0C-3 -0.2 3.2 0.3 3.6 2.4C3.9 5 3.0 8 3.1 11C3.3 15 3.0 20 2.0 23.6C0.8 26.4 -2.4 26.4 -3.2 23.6C-4.4 19 -2.6 13 -3.0 9.5C-3.3 6.5 -4.8 4 -4.3 1.0Z';
export function foot(t, wrk) {
  const parts = [SOLE], cl = [];
  Object.keys(TOES).forEach((k, i) => { const d = TOES[k], fl = [6 + 4 * Math.sin(t * 2.1 + i), 8 + 5 * Math.sin(t * 2.1 + i + 0.6)], pts = chain(d, fl, 1.5 * Math.sin(t * 1.7 + i)), c = centerline(pts, d.w, 8); cl.push(c); parts.push(outline(c)); });
  let s = `<g transform="scale(1.18 1)"><g stroke="${SKIN.edge}" stroke-width="0.07" stroke-linejoin="round" fill="${SKIN.edge}">${parts.map((d) => `<path d="${d}"/>`).join('')}</g><g fill="url(#skinG)">${parts.map((d) => `<path d="${d}"/>`).join('')}</g>`;
  s += `<path d="M-3.4 8.5C-1.5 7.6 1.5 7.8 3.0 8.8" fill="none" stroke="${SKIN.crease}" stroke-width="0.08" stroke-linecap="round"/>`;
  cl.forEach((c, i) => { s += wetTint(c, wrk) + tipWrinkles(c, wrk, 31 + i * 5); });
  s += '</g>';
  return { svg: s, cl };
}
export { ORDER };
