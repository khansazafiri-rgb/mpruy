// Raka kanonik (rakaSvg) berputar di tempat searah jarum jam dilihat dari atas: muka menoleh ke KIRI layar dulu. Putaran 2D: badan dipipihkan |cos|, paruh belakang memakai penutup rambut di atas kepala (tanpa mengubah raka.js).
import { f1, clamp } from './common.js';
import { rakaSvg } from '../../../brand/characters/raka/raka.js';
const HEADSKIN = 'M200 92C270 92 308 138 308 204C308 262 264 304 200 304C136 304 92 262 92 204C92 138 130 92 200 92Z';
export function spinRaka(st, th, cx, ty, k, uid, o = {}) {
  const r = th * Math.PI / 180, c = Math.cos(r), s = Math.sin(r), back = c < 0, sx = 0.4 + 0.6 * Math.abs(c);
  const s2 = { ...st, yaw: back ? 0 : clamp(-s, -1, 1) };
  const mask = back ? `<g transform="translate(200 362) rotate(${f1(st.tilt || 0)}) scale(1.2) translate(-200 -306)"><path d="${HEADSKIN}" fill="#212739"/><path d="M128 150C150 120 214 112 262 142M140 196C160 168 224 160 270 190" fill="none" stroke="#2F3858" stroke-width="7" stroke-linecap="round"/></g>` : '';
  const sh = o.shadow === false ? '' : `<ellipse cx="${f1(cx)}" cy="${f1(ty + 778 * k)}" rx="${f1(120 * k * (0.55 + 0.45 * sx))}" ry="${f1(14 * k)}" fill="#10212B" opacity=".16"/>`;
  return sh + `<g transform="translate(${f1(cx)} ${f1(ty)}) scale(${f1(k * sx * 1000) / 1000} ${k}) translate(-200 0)">${rakaSvg(s2, { bare: true, uid, shadow: false, logo: back ? false : undefined })}${mask}</g>`;
}
