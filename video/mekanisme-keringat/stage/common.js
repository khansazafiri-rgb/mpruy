// Pembantu bersama video "Mekanisme tubuh berkeringat" (1080 x 1920, 30 fps). Gaya datar 2D MEDCOEL, Raka kanonik (rakaSvg).
// Kode warna tetap: sinyal saraf + asetilkolin = emas, cairan keringat = biru muda, garam (Na+/Cl-) = teal, panas = koral.
import { f1, clamp, lerp, sm, eo, eio, seg, win, pop, track, pchip, R, C, P, T, G, FONT, tw, pill, rndf, GOLD, FOREST, INK } from './lib.js';
import { raka, rakaSvg, armShape, idle as rIdle } from '../../../brand/characters/raka/raka.js';
export { raka, rIdle };
export * from './lib.js';
export const CUES = await (await fetch('../cues.json')).json(); export const W = CUES.w;
export const NOCAP = new URLSearchParams(location.search).has('nocap');
export const CREAM = '#F7F2E4', NAVY = '#0F3A47', TEAL = '#0B2F38', CORAL = '#F2735E', MINT = '#9DE0BD';
export const K = { gold: '#F8C038', goldD: '#B9861A', sweat: '#8FD8F5', sweatD: '#3FA8D6', salt: '#14B8A6', saltD: '#0B7F73', heat: '#F2735E', heatD: '#C4432F', skin: '#F7BC8E', skinD: '#EAA676', epi: '#F2B08E', epiD: '#D98E6C', derm: '#FAD9C6', dermD: '#F0BFA8', gland: '#E27C93', glandD: '#B8506A', lumen: '#FFF3EE', nerve: '#FFD65A', air: '#E9F6FB', airD: '#CBE9F4', ink: '#172B38' };
export const ka = (t, t0, t1, f = 0.25) => clamp((t - t0) / f) * clamp((t1 - t) / f);
// ------------------------------------------------------------------ teks layar
export function chip(lines, t, t0, t1, o = {}) { const k = ka(t, t0, t1, o.f ?? 0.3); return k > 0.01 ? pill(lines, 540, (o.y ?? 250) + (1 - eo(clamp((t - t0) / 0.35))) * -40, { a: k, size: o.size ?? 54, bg: o.bg, fg: o.fg }) : ''; }
export function tag(txt, x, y, a = 1, o = {}) {
  if (a <= 0.01) return ''; const size = o.size ?? 36, w = tw(txt, size) + 46, h = size + 26;
  return `<g opacity="${f1(a * 100) / 100}"><rect x="${f1(x - w / 2)}" y="${f1(y - h / 2 + 5)}" width="${f1(w)}" height="${h}" rx="${h / 2}" fill="rgba(0,0,0,.28)"/><rect x="${f1(x - w / 2)}" y="${f1(y - h / 2)}" width="${f1(w)}" height="${h}" rx="${h / 2}" fill="${o.bg ?? '#fff'}"/>${T(txt, x, y + size * 0.36, { size, fill: o.fg ?? FOREST })}</g>`;
}
/** label dengan garis penunjuk: kotak di (tx, ty), ujung garis di (ax, ay) pada benda */
export function callout(txt, tx, ty, ax, ay, a, o = {}) {
  if (a <= 0.01) return ''; const size = o.size ?? 38, w = tw(txt, size) + 46, h = size + 26, col = o.col ?? GOLD, k = o.k ?? 1;
  const ex = ax < tx ? tx - w / 2 : tx + w / 2, ey = ty;
  const ux = lerp(ex, ax, k), uy = lerp(ey, ay, k);
  return `<g opacity="${f1(a * 100) / 100}"><path d="M${f1(ex)} ${f1(ey)}L${f1(ux)} ${f1(uy)}" stroke="#000" stroke-opacity=".3" stroke-width="9" stroke-linecap="round" transform="translate(0 4)"/><path d="M${f1(ex)} ${f1(ey)}L${f1(ux)} ${f1(uy)}" stroke="${col}" stroke-width="6" stroke-linecap="round"/><circle cx="${f1(ux)}" cy="${f1(uy)}" r="${f1(11 * k)}" fill="${col}" stroke="${INK}" stroke-width="3"/></g>` + tag(txt, tx, ty, a, { size, bg: o.bg, fg: o.fg });
}
export function caption(t) {
  if (NOCAP || t >= CUES.t_web) return '';
  const c = CUES.cap.find(([a, b]) => t >= a - 0.04 && t < b); if (!c) return '';
  const a = clamp((t - c[0]) / 0.12), size = 50, w = Math.min(980, tw(c[2], size) + 70);
  return `<g opacity="${f1(a * 100) / 100}">${R(540 - w / 2, 1306, w, 96, 'rgba(8,18,30,.92)', 34)}${T(c[2], 540, 1371, { size, fill: '#fff' })}</g>`;
}
export const dashed = (x1, y1, x2, y2, col = GOLD, a = 1, w = 5) => `<path d="M${f1(x1)} ${f1(y1)}L${f1(x2)} ${f1(y2)}" stroke="${col}" stroke-width="${w}" stroke-dasharray="14 12" stroke-linecap="round" opacity="${f1(a * 100) / 100}"/>`;
// ------------------------------------------------------------------ alat bantu umum
export const mod = (a, b) => ((a % b) + b) % b;
export const camG = (inner, z, cx, cy, ox = 540, oy = 960) => `<g transform="translate(${f1(ox)} ${f1(oy)}) scale(${f1(z * 1000) / 1000}) translate(${f1(-cx)} ${f1(-cy)})">${inner}</g>`;
const bgNavy = `<defs><linearGradient id="nbg" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#12485A"/><stop offset="1" stop-color="#0A2B36"/></linearGradient></defs><rect x="-9000" y="-9000" width="18000" height="18000" fill="url(#nbg)"/><circle cx="90" cy="560" r="220" fill="#134B5C" opacity=".6"/><circle cx="1000" cy="1100" r="260" fill="#134B5C" opacity=".5"/>`;
export const bgCream = `<rect x="-9000" y="-9000" width="18000" height="18000" fill="${CREAM}"/><circle cx="110" cy="480" r="190" fill="#EADFC4"/><circle cx="980" cy="1040" r="230" fill="#EADFC4" opacity=".7"/>`;
export const op = (a, inner) => `<g opacity="${f1(clamp(a) * 1000) / 1000}">${inner}</g>`;
export const armTo = (side, hx, hy, extra = {}) => { const a = { wx: hx, wy: hy, ex: side === 'R' ? Math.max(330, hx + 70) : Math.min(70, hx - 70), ey: hy + 90, finger: 0, fa: -90, front: 1, roll: 0, hold: 0, holdRot: 0, ...extra }; const h = armShape(side, a).hand; a.wx += hx - h[0]; a.wy += hy - h[1]; return a; };
export const rk = (st, cx, ty, k, uid) => { const tx = cx - 200 * k; return { svg: `<g transform="translate(${f1(tx)} ${f1(ty)}) scale(${k})">${rakaSvg(st, { bare: true, uid, shadow: false })}</g>`, at: (x, y) => [tx + x * k, ty + y * k], hand: (side) => { const h = armShape(side, st['arm' + side]).hand; return [tx + h[0] * k, ty + h[1] * k]; }, tx, ty, k }; };

// ---- bentuk umum
export const bgSky = `<rect x="-9000" y="-9000" width="18000" height="18000" fill="#F4FAFC"/>`;
/** tetes keringat (bentuk tetes): pusat (x,y), tinggi h */
export const sdrop = (x, y, h, o = 1, rot = 0) => { const w = h * 0.62; return `<g transform="translate(${f1(x)} ${f1(y)}) rotate(${f1(rot)})" opacity="${f1(clamp(o) * 100) / 100}"><path d="M0 ${f1(-h * 0.55)}C${f1(w * 0.15)} ${f1(-h * 0.25)} ${f1(w * 0.55)} ${f1(h * 0.05)} ${f1(w * 0.5)} ${f1(h * 0.22)}C${f1(w * 0.45)} ${f1(h * 0.5)} ${f1(-w * 0.45)} ${f1(h * 0.5)} ${f1(-w * 0.5)} ${f1(h * 0.22)}C${f1(-w * 0.55)} ${f1(h * 0.05)} ${f1(-w * 0.15)} ${f1(-h * 0.25)} 0 ${f1(-h * 0.55)}Z" fill="${K.sweat}" stroke="${K.sweatD}" stroke-width="${f1(Math.max(2, h * 0.06))}" stroke-linejoin="round"/><ellipse cx="${f1(-w * 0.17)}" cy="${f1(h * 0.18)}" rx="${f1(w * 0.09)}" ry="${f1(h * 0.13)}" fill="#fff" opacity=".7"/></g>`; };
/** termometer HUD vertikal: level 0..1, pusat atas (x,y0), tinggi H */
export const thermo = (x, y0, H, level, o = {}) => {
  const w = o.w ?? 46, lv = clamp(level), by = y0 + H, fillH = (H - 30) * lv + 22, col = o.col ?? mixc('#F5B445', K.heat, lv);
  return `<g opacity="${f1((o.a ?? 1) * 100) / 100}"><rect x="${f1(x - w / 2 + 4)}" y="${f1(y0 + 6)}" width="${w}" height="${f1(H)}" rx="${w / 2}" fill="rgba(0,0,0,.18)"/><rect x="${f1(x - w / 2)}" y="${f1(y0)}" width="${w}" height="${f1(H)}" rx="${w / 2}" fill="#fff" stroke="#C9D5DA" stroke-width="4"/><circle cx="${x}" cy="${f1(by - 6)}" r="${f1(w * 0.78)}" fill="#fff" stroke="#C9D5DA" stroke-width="4"/><rect x="${f1(x - w * 0.24)}" y="${f1(by - fillH)}" width="${f1(w * 0.48)}" height="${f1(fillH)}" rx="${f1(w * 0.24)}" fill="${col}"/><circle cx="${x}" cy="${f1(by - 6)}" r="${f1(w * 0.58)}" fill="${col}"/></g>`;
};
export function mixc(a, b, t) { const p = (h) => [1, 3, 5].map((i) => parseInt(h.slice(i, i + 2), 16)); const A = p(a), B = p(b), c = A.map((v, i) => Math.round(lerp(v, B[i], clamp(t)))); return '#' + c.map((v) => v.toString(16).padStart(2, '0')).join(''); }
/** panah panas (koral) naik/keluar: dari (x,y) ke arah (dx,dy) panjang L */
export const heatArrow = (x, y, ang, L, o = 1, w = 14) => { const a = ang * Math.PI / 180, dx = Math.cos(a), dy = Math.sin(a), ex = x + dx * L, ey = y + dy * L, px = -dy, py = dx; return `<g opacity="${f1(clamp(o) * 100) / 100}"><path d="M${f1(x)} ${f1(y)}L${f1(ex)} ${f1(ey)}" stroke="${K.heat}" stroke-width="${w}" stroke-linecap="round"/><path d="M${f1(ex + dx * w * 0.9)} ${f1(ey + dy * w * 0.9)}L${f1(ex - dx * w * 0.6 + px * w * 1.2)} ${f1(ey - dy * w * 0.6 + py * w * 1.2)}L${f1(ex - dx * w * 0.6 - px * w * 1.2)} ${f1(ey - dy * w * 0.6 - py * w * 1.2)}Z" fill="${K.heat}" stroke="${K.heat}" stroke-width="3" stroke-linejoin="round"/></g>`; };
export const molecule = (x, y, r, o = 1) => `<circle cx="${f1(x)}" cy="${f1(y)}" r="${f1(r)}" fill="${K.sweat}" stroke="${K.sweatD}" stroke-width="${f1(Math.max(1.5, r * 0.2))}" opacity="${f1(clamp(o) * 100) / 100}"/>`;
export const ion = (x, y, r, o = 1) => `<circle cx="${f1(x)}" cy="${f1(y)}" r="${f1(r)}" fill="${K.salt}" stroke="${K.saltD}" stroke-width="${f1(Math.max(1.5, r * 0.22))}" opacity="${f1(clamp(o) * 100) / 100}"/>`;
export const ach = (x, y, r, o = 1, ring = 0) => `<circle cx="${f1(x)}" cy="${f1(y)}" r="${f1(r)}" fill="${K.gold}" stroke="${K.goldD}" stroke-width="${f1(Math.max(1.5, r * 0.25))}" opacity="${f1(clamp(o) * 100) / 100}"/>${ring > 0.01 ? `<circle cx="${f1(x)}" cy="${f1(y)}" r="${f1(r * 2.2)}" fill="none" stroke="#fff" stroke-width="${f1(r * 0.3)}" opacity="${f1(ring * 100) / 100}"/>` : ''}`;
export { f1, clamp, lerp };
