// Pembantu gambar bersama untuk adegan (koordinat layar 1080 x 1920).
import { f1, clamp, lerp, sm, eo, eio, MC, FONT } from './core.js';
import { raka, rakaBody, lerpState, rIdle, solveArm, handWorld } from './raka.js';
export { f1, clamp, lerp, sm, eo, eio, MC, FONT, raka, rakaBody, lerpState, rIdle, solveArm, handWorld };
export const R = (x, y, w, h, f, e = '') => `<rect x="${f1(x)}" y="${f1(y)}" width="${f1(w)}" height="${f1(h)}" fill="${f}" ${e}/>`;
export const C = (x, y, r, f, e = '') => `<circle cx="${f1(x)}" cy="${f1(y)}" r="${f1(r)}" fill="${f}" ${e}/>`;
export const P = (d, f, e = '') => `<path d="${d}" fill="${f}" ${e}/>`;
export const T = (x, y, txt, f, size, e = '', anchor = 'middle', w = 800, fam = FONT) => `<text x="${f1(x)}" y="${f1(y)}" font-family="${fam}" font-weight="${w}" font-size="${size}" fill="${f}" text-anchor="${anchor}" ${e}>${txt}</text>`;
export const seg = (t, a, b, e = sm) => e(clamp((t - a) / (b - a)));
export const win = (t, a, b, f = 0.2) => clamp((t - a) / f) * clamp((b - t) / f);
// ---- penempatan Raka: s = skala, (rx, ryf) = titik tengah x dan garis lantai lokal (y = 778) di layar
export const SEAT = { s: 1.2, rx: 540, ryf: 1272 };
export const STAND = { s: 1.12, rx: 540, ryf: 1590 };
export const loc = (pl, x, y) => [(x - (pl.rx - 200 * pl.s)) / pl.s, (y - (pl.ryf - 778 * pl.s)) / pl.s];
export const scr = (pl, lx, ly) => [pl.rx - 200 * pl.s + lx * pl.s, pl.ryf - 778 * pl.s + ly * pl.s];
export const handScr = (st, pl, side) => scr(pl, ...handWorld(st, side));
export const rk = (st, pl, uid, o = {}) => `<g transform="translate(${f1(pl.rx - 200 * pl.s)} ${f1(pl.ryf - 778 * pl.s)}) scale(${pl.s})">${rakaBody(st, uid, o)}</g>`;
/** Raka digambar ulang, dipotong lingkaran di sekitar tangan: dipasang DI ATAS meja/buku supaya tangan yang memegang pena/alat tidak tertutup */
export function rkHand(st, pl, uid, o, side, r = 90, ox = 0, oy = 0) {
  const [hx, hy] = handScr(st, pl, side); const id = 'hc' + uid;
  return `<clipPath id="${id}"><circle cx="${f1(hx + ox)}" cy="${f1(hy + oy)}" r="${r}"/></clipPath><g clip-path="url(#${id})">${rk(st, pl, uid, o)}</g>`;
}
/** hanya lengan 'side' Raka digambar ulang (di atas meja/buku) supaya tangan yang memegang pena/alat tidak tertutup lapisan depan */
export function rkArm(st, pl, uid, o, side) {
  const body = rakaBody(st, uid, o), m = body.match(new RegExp('<g class="raka-arm-' + side + '"[\\s\\S]*?</g>'));
  return `<g transform="translate(${f1(pl.rx - 200 * pl.s)} ${f1(pl.ryf - 778 * pl.s)}) scale(${pl.s})">${m ? m[0] : ''}</g>`;
}
export const lerpArm = (a, b, k) => { const o = {}; for (const key of Object.keys(a)) o[key] = typeof a[key] === 'number' ? lerp(a[key], b[key], k) : a[key]; return o; };
/** lengan yang tangannya ditaruh di titik layar (x, y) */
export const armTo = (st, pl, side, x, y, o = {}) => {
  const L = loc(pl, x, y), sh = side === 'L' ? [104, 410 + (st.bob || 0)] : [296, 410 + (st.bob || 0)];
  const len = o.auto ? Math.max(165, Math.hypot(L[0] - sh[0], L[1] - sh[1]) * 1.02) : (o.len ?? 200);
  return solveArm(st, side, L, { finger: 0, front: 1, ...o, len });
};
// ---- pena (digambar di tangan)
export const pen = (x, y, ang = -60, len = 92, col = '#2B3A8C') => `<g transform="translate(${f1(x)} ${f1(y)}) rotate(${ang})"><rect x="0" y="-6" width="${len}" height="12" rx="4" fill="${col}" stroke="${MC.ink}" stroke-width="3"/><path d="M0 -6L-16 0L0 6Z" fill="#F4D9B0" stroke="${MC.ink}" stroke-width="3" stroke-linejoin="round"/><path d="M-12 -1.5L-16 0L-12 1.5Z" fill="${MC.ink}"/><rect x="${len - 22}" y="-2" width="16" height="4" rx="2" fill="${MC.gold}"/></g>`;
// ---- kursi dan meja kecil
export const chair = (pl, col = '#31506A') => { const s = pl.s; return `<g transform="translate(${f1(pl.rx - 150 * s)} ${f1(pl.ryf - 778 * s + 330 * s)})">${R(0, 0, 300 * s, 330 * s, col)}${R(0, 0, 300 * s, 22, 'rgba(255,255,255,.12)')}</g>`; };
