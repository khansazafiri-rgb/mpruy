// Pembantu bersama adegan: Kori, logo, label, perangkat (iPad dan laptop) untuk rekaman web asli.
import { f1, getKori, getLogo } from './core.js';
import { clamp, eob } from './core.js';
import { R, C, E, P, L, T } from './art.js';
import { poseMascot } from './mascot.js';
export const koriSvg = (x, y, ks, t, o = {}) => {
  const Kx = getKori(); if (!Kx) return '';
  poseMascot(Kx.r, { t, mood: o.mood ?? 'happy', env: o.env ?? 0, wave: o.wave ?? 0, arm: o.arm ?? 0, phase: o.phase ?? 0.5, tilt: o.tilt ?? 0, blink: o.blink ?? 0 });
  const fl = o.flip ? -1 : 1;
  return `<g transform="translate(${f1(x - 160 * ks * fl)} ${f1(y - 290 * ks)}) scale(${(ks * fl).toFixed(3)} ${ks.toFixed(3)})" opacity="${(o.a ?? 1).toFixed(3)}">${Kx.r.root.outerHTML}</g>`;
};
export const logoCard = (cx, cy, k = 1, a = 1, w = 640) => { const h = w * 0.31, LG = getLogo(); return `<g transform="translate(${f1(cx)} ${f1(cy)}) scale(${k.toFixed(3)})" opacity="${a.toFixed(3)}"><rect x="${-w / 2}" y="${-h / 2 + 10}" width="${w}" height="${h}" rx="${h / 2}" fill="rgba(0,0,0,.3)"/><rect x="${-w / 2}" y="${-h / 2}" width="${w}" height="${h}" rx="${h / 2}" fill="#fff"/><image href="${LG}" x="${-w * 0.36}" y="${-w * 0.36 * 0.2015}" width="${w * 0.72}" height="${w * 0.72 * 0.2015}"/></g>`; };
export const tag = (x, y, txt, a = 1) => `<g opacity="${a.toFixed(3)}" transform="translate(${f1(x)} ${f1(y)})"><rect x="0" y="0" width="${Math.round(txt.length * 15.5 + 34)}" height="46" rx="23" fill="rgba(6,43,37,.88)"/>${T(17, 31, txt, '#fff', 24, '', 'start')}</g>`;
export const pa = (t, a, d = 0.12) => clamp((t - a) / d, 0, 1);
export const pk = (t, a, d = 0.3) => 0.8 + 0.2 * eob((t - a) / d);
export const lerpKeys = (t, keys) => { if (t <= keys[0][0]) return keys[0][1]; for (let i = 1; i < keys.length; i++) if (t <= keys[i][0]) { const [t0, v0] = keys[i - 1], [t1, v1] = keys[i]; return v0 + (v1 - v0) * (t - t0) / (t1 - t0); } return keys[keys.length - 1][1]; };
export const mix = (a, b, u) => a.map((v, i) => v + (b[i] - v) * u);
// bingkai iPad (potret) dan laptop (lanskap) untuk rekaman web asli
export const ipadFrame = (x, y, w, h, a = 1) => `<g opacity="${a.toFixed(2)}"><rect x="${f1(x - 26)}" y="${f1(y - 26)}" width="${f1(w + 52)}" height="${f1(h + 52)}" rx="58" fill="none" stroke="#1B2430" stroke-width="52"/><circle cx="${f1(x + w / 2)}" cy="${f1(y - 13)}" r="6" fill="#3A4656"/></g>`;
export const laptopFrame = (x, y, w, h, a = 1) => `<g opacity="${a.toFixed(2)}"><rect x="${f1(x - 14)}" y="${f1(y - 14)}" width="${f1(w + 28)}" height="${f1(h + 28)}" rx="26" fill="none" stroke="#1B2430" stroke-width="28"/><circle cx="${f1(x + w / 2)}" cy="${f1(y - 7)}" r="4" fill="#3A4656"/><path d="M${f1(x - 60)} ${f1(y + h + 28)}H${f1(x + w + 60)}L${f1(x + w + 24)} ${f1(y + h + 62)}H${f1(x - 24)}Z" fill="#C9D4D9"/><rect x="${f1(x + w / 2 - 70)}" y="${f1(y + h + 28)}" width="140" height="10" rx="5" fill="#AEBBC2"/></g>`;
