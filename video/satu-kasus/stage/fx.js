// Efek dan bentuk pixel modern (ringan, hangat) untuk video "Satu Kasus, Banyak yang Harus Nyambung". Semua dari kode SVG.
import { f1, clamp, lerp, sm, eo, MC, FONT, rnd } from './core.js';
export const PX = "'Press Start 2P', 'DejaVu Sans Mono', monospace";
export const R = (x, y, w, h, f, rx = 0, e = '') => `<rect x="${f1(x)}" y="${f1(y)}" width="${f1(w)}" height="${f1(h)}" rx="${rx}" fill="${f}" ${e}/>`;
export const T = (x, y, txt, f, size, e = '', anchor = 'middle', w = 800) => `<text x="${f1(x)}" y="${f1(y)}" font-family="${FONT}" font-weight="${w}" font-size="${size}" fill="${f}" text-anchor="${anchor}" ${e}>${txt}</text>`;
/** teks pixel (Press Start 2P, huruf besar ASCII) */
export const pxt = (x, y, txt, fill, size, o = {}) => `<text x="${f1(x)}" y="${f1(y)}" font-family="${PX}" font-size="${size}" fill="${fill}" text-anchor="${o.anchor ?? 'middle'}"${o.stroke === false ? '' : ` stroke="${o.stroke ?? MC.ink}" stroke-width="${o.sw ?? Math.max(4, size / 4)}" paint-order="stroke" stroke-linejoin="round"`}${o.op !== undefined ? ` opacity="${f1(o.op)}"` : ''}>${txt}</text>`;
/** kotak dengan sudut dipotong (kesan pixel): n = ukuran potongan */
export function pxBox(x, y, w, h, fill, o = {}) {
  const n = o.n ?? 6, sw = o.sw ?? 4, st = o.stroke ?? MC.ink;
  const d = `M${x + n} ${y}H${x + w - n}V${y + n}H${x + w}V${y + h - n}H${x + w - n}V${y + h}H${x + n}V${y + h - n}H${x}V${y + n}H${x + n}Z`;
  return `<path d="${d}" fill="${fill}" stroke="${st}" stroke-width="${sw}" stroke-linejoin="miter" shape-rendering="crispEdges"${o.op !== undefined ? ` opacity="${f1(o.op)}"` : ''}/>`;
}
export function pxSpark(x, y, k = 1, c = MC.gold) { const u = 6 * k; return `<g fill="${c}" shape-rendering="crispEdges"><rect x="${f1(x - u / 2)}" y="${f1(y - u * 2.5)}" width="${f1(u)}" height="${f1(u * 5)}"/><rect x="${f1(x - u * 2.5)}" y="${f1(y - u / 2)}" width="${f1(u * 5)}" height="${f1(u)}"/><rect x="${f1(x - u * 1.5)}" y="${f1(y - u * 1.5)}" width="${f1(u * 3)}" height="${f1(u * 3)}" fill="#FFF3C4"/></g>`; }
/** cincin blip: delapan kotak kecil memancar dari (x, y); u = detik sejak mulai */
export function ping(x, y, u, c = MC.gold, r = 90) {
  if (u < 0 || u > 0.5) return ''; const k = eo(u / 0.5), a = 1 - u / 0.5; let s = '';
  for (let i = 0; i < 8; i++) { const an = i * Math.PI / 4 + 0.4; s += `<rect x="${f1(Math.round((x + Math.cos(an) * r * k) / 4) * 4 - 5)}" y="${f1(Math.round((y + Math.sin(an) * r * k) / 4) * 4 - 5)}" width="10" height="10" fill="${c}" opacity="${f1(a)}"/>`; }
  return `<g shape-rendering="crispEdges">${s}</g>`;
}
export function confetti(x, y, u, n = 24, seed = 4, spread = 420) {
  if (u < 0) return ''; const r = rnd(seed), cs = [MC.gold, '#FFF3C4', '#7CE0B8', '#E8665F', '#F8F7F3', '#9DE0BD']; let s = '';
  for (let i = 0; i < n; i++) { const a = r() * Math.PI * 2, v = (0.35 + r() * 0.65) * spread, sz = [8, 12, 16][Math.floor(r() * 3)], px = x + Math.cos(a) * v * u, py = y + Math.sin(a) * v * u + 520 * u * u; s += `<rect x="${f1(Math.round(px / 4) * 4)}" y="${f1(Math.round(py / 4) * 4)}" width="${sz}" height="${sz}" fill="${cs[i % cs.length]}" opacity="${f1(clamp(1.2 - u * 0.8))}"/>`; }
  return s;
}
export const flash = (a, c = '#fff') => (a > 0.01 ? `<rect width="1080" height="1920" fill="${c}" opacity="${f1(a)}"/>` : '');
/** blok pixel (transisi digital singkat): p 0..1 */
export function pixelClip(id, p, rect, seed = 3, cell = 36) {
  const r = rnd(seed), cols = Math.ceil(rect.w / cell), rows = Math.ceil(rect.h / cell); let cp = '', edge = '';
  for (let j = 0; j < rows; j++) for (let i = 0; i < cols; i++) { const th = r() * 0.85 + (i / cols) * 0.15, x = rect.x + i * cell, y = rect.y + j * cell; if (th < p) cp += `<rect x="${x}" y="${y}" width="${cell}" height="${cell}"/>`; else if (th < p + 0.1) edge += `<rect x="${x + 4}" y="${y + 4}" width="${cell - 8}" height="${cell - 8}" fill="${(i + j) % 3 ? '#7CE0B8' : MC.gold}" opacity=".85"/>`; }
  return { clip: `<clipPath id="${id}">${cp}</clipPath>`, edge };
}
/** teks ketik gaya game (kotak ink + garis emas); px = huruf pixel */
export function typer(txt, t, t0, t1, o = {}) {
  const a = clamp((t - t0) / 0.12) * clamp((t1 - t) / 0.15); if (a <= 0.01) return '';
  const n = Math.min(txt.length, Math.floor((t - t0) * (o.cps ?? 28))), vis = txt.slice(0, n), fs = o.fs ?? 54, y = o.y ?? 345, px = !!o.px;
  const w = o.w ?? (px ? txt.length * fs + 90 : Math.min(1000, 60 + txt.length * fs * 0.62));
  const cur = n < txt.length || Math.floor(t * 4) % 2 ? (px ? '_' : '▌') : '';
  const col = o.red ? '#FF8A7A' : MC.ivory, edge = o.red ? '#FF8A7A' : MC.gold;
  const font = px ? `font-family="${PX}"` : `font-family="${FONT}" font-weight="800"`;
  return `<g opacity="${f1(a)}">${R(540 - w / 2, y - fs - 14, w, fs + 44, 'rgba(10,28,36,.95)', px ? 0 : 18, `stroke="${edge}" stroke-width="${px ? 6 : 4}"${px ? ' shape-rendering="crispEdges"' : ''}`)}<text x="540" y="${y + (px ? 6 : 4)}" text-anchor="middle" ${font} font-size="${fs}" fill="${col}">${vis}<tspan fill="${MC.gold}">${cur}</tspan></text></g>`;
}
export { rnd };
