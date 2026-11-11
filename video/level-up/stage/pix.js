// Dunia pixel "Level Up" (kode SVG, identitas MEDCOEL): langit/bintang/bulan/awan pixel, gunung bertingkat, tanah berpetak, blok BAB (tembok -> tangga), HUD gaya game (LV, PAHAM, ENERGI), teks ketik, kembang api pixel.
// Maskot MEDCOEL asli tidak digambar di sini (lihat mascot.js); semua yang ada di file ini adalah latar, benda, dan antarmuka video.
import { f1, clamp, lerp, sm, eo, ei, eio, eob, seg, MC, FONT, rnd } from './core.js';

export const PX = "'Press Start 2P', 'DejaVu Sans Mono', monospace";
export const R = (x, y, w, h, f, rx = 0, e = '') => `<rect x="${f1(x)}" y="${f1(y)}" width="${f1(w)}" height="${f1(h)}" rx="${rx}" fill="${f}" ${e}/>`;
export const T = (x, y, txt, f, size, e = '', anchor = 'middle', w = 800) => `<text x="${f1(x)}" y="${f1(y)}" font-family="${FONT}" font-weight="${w}" font-size="${size}" fill="${f}" text-anchor="${anchor}" ${e}>${txt}</text>`;
/** teks pixel (Press Start 2P, huruf besar ASCII); o.sw = tebal garis tepi ink, o.stroke=false = tanpa tepi */
export const pxt = (x, y, txt, fill, size, o = {}) => `<text x="${f1(x)}" y="${f1(y)}" font-family="${PX}" font-size="${size}" fill="${fill}" text-anchor="${o.anchor ?? 'middle'}"${o.stroke === false ? '' : ` stroke="${MC.ink}" stroke-width="${o.sw ?? Math.max(4, size / 4)}" paint-order="stroke" stroke-linejoin="round"`}${o.op !== undefined ? ` opacity="${f1(o.op)}"` : ''}>${txt}</text>`;

// ------------------------------------------------------------------ langit, bintang, bulan, awan
const SKY = ['#0A1F2C', '#0B2634', '#0C2D3C', '#0E3544', '#103C4B', '#124452', '#144C58', '#16545F', '#185C66'];
let _moon = null;
function moon() {
  if (_moon) return _moon; let s = ''; const cx = 872, cy = 640, r = 72, c = 8;
  for (let j = -9; j <= 9; j++) for (let i = -9; i <= 9; i++) { const x = i * c, y = j * c, d = Math.hypot(x, y); if (d > r) continue; const lit = Math.hypot(x + 26, y - 14) > 62 ? '#F6E9B8' : '#E8D79A'; s += `<rect x="${cx + x - 4}" y="${cy + y - 4}" width="8" height="8" fill="${lit}"/>`; }
  s += `<rect x="${cx + 12}" y="${cy - 30}" width="16" height="16" fill="#D9C27E"/><rect x="${cx - 20}" y="${cy + 18}" width="24" height="16" fill="#D9C27E"/><rect x="${cx + 28}" y="${cy + 22}" width="8" height="8" fill="#D9C27E"/>`;
  return (_moon = s);
}
let _stars = null;
function stars(t) {
  if (!_stars) { const r = rnd(11); _stars = Array.from({ length: 46 }, () => [Math.floor(r() * 1080 / 8) * 8, Math.floor((360 + r() * 880) / 8) * 8, r() < 0.28 ? 16 : 8, r() * 6]); }
  return _stars.map(([x, y, s, ph], i) => { const on = Math.floor(t * 1.6 + ph) % 3 !== 0; const gold = i % 4 === 0; return on ? `<rect x="${x}" y="${y}" width="${s}" height="${s}" fill="${gold ? MC.gold : '#E8F6EF'}" opacity="${s > 8 ? 0.95 : 0.7}"/>` : ''; }).join('');
}
function cloud(x, y, k = 1) { const u = 16 * k; return `<g fill="#1E6A74" opacity=".75">${R(x, y + u, u * 8, u * 2, '#1E6A74')}${R(x + u, y, u * 3, u, '#1E6A74')}${R(x + u * 4, y - u, u * 3, u * 2, '#1E6A74')}</g>`; }
function mountains(scroll) {
  let s = ''; const G = 1260;
  const layer = (col, step, base, amp, sp) => { for (let i = -2; i < 1080 / step + 3; i++) { const k = i + Math.floor(scroll * sp / step); const h = base + Math.round((Math.abs(Math.sin(k * 0.83) * 0.7 + Math.sin(k * 0.37 + 1.2) * 0.5)) * amp / 24) * 24; const x = i * step - ((scroll * sp) % step); s += `<rect x="${f1(x)}" y="${G - h}" width="${step + 1}" height="${h}" fill="${col}"/>`; } };
  layer('#0E3B47', 72, 96, 220, 0.25); layer('#10464F', 56, 48, 150, 0.5);
  return s;
}
function ground(scroll, G) {
  let s = `<rect x="0" y="${G}" width="1080" height="${1920 - G + 8}" fill="#6B4A2E"/><rect x="0" y="${G}" width="1080" height="10" fill="#8FE8C4"/><rect x="0" y="${G + 10}" width="1080" height="16" fill="#2FBF86"/><rect x="0" y="${G + 26}" width="1080" height="8" fill="#1B8A62"/>`;
  const off = ((scroll % 96) + 96) % 96; let d = '';
  for (let r = 0, y = G + 34; y < 1930; r++, y += 48) { d += `M0 ${y}H1080`; for (let x = -96 + (r % 2 ? 48 : 0) - off; x < 1100; x += 96) d += `M${f1(x)} ${y}v48`; }
  s += `<path d="${d}" stroke="#54381F" stroke-width="4" fill="none"/>`;
  [[G + 300, '#5A3C24', 0.55], [G + 470, '#43291A', 0.6]].filter(([y]) => y < 1920).forEach(([y, c, a]) => { s += `<rect x="0" y="${y}" width="1080" height="${1928 - y}" fill="${c}" opacity="${a}"/>`; });
  for (let i = 0; i < 16; i++) { const x = ((i * 197 + 61) % 1080) - off % 48, y = G + 80 + ((i * 131) % 520); s += `<rect x="${f1(x)}" y="${y}" width="${8 + (i % 3) * 8}" height="8" fill="${i % 2 ? '#7B583A' : '#4B3020'}"/>`; }
  for (let x = -48 - (off % 48); x < 1100; x += 48) s += `<rect x="${f1(x)}" y="${G - 8}" width="8" height="8" fill="#8FE8C4"/><rect x="${f1(x + 24)}" y="${G - 4}" width="8" height="4" fill="#2FBF86"/>`;
  return s;
}
/** latar dunia: langit pixel + bulan + awan + gunung + tanah. o.scroll = posisi gulir (px), o.G = garis tanah, o.dim = 0..1 gelap */
export function world(t, o = {}) {
  const G = o.G ?? 1260, sc = o.scroll ?? 0; let s = '';
  SKY.forEach((c, i) => { s += `<rect x="0" y="${i * 148}" width="1080" height="150" fill="${c}"/>`; });
  s += stars(t) + moon();
  s += cloud(((140 - t * 22) % 1400 + 1400) % 1400 - 220, 560, 1) + cloud(((700 - t * 14) % 1400 + 1400) % 1400 - 220, 740, 1.2);
  s += mountains(sc) + ground(sc, G);
  return s;
}

// ------------------------------------------------------------------ blok BAB (tembok -> tangga)
export const BS = 64;
export const WALL = Array.from({ length: 13 }, (_, i) => { const c = i < 7 ? 0 : 1, r = i < 7 ? i : i - 7; return [40 + c * 64, 1260 - BS / 2 - r * BS]; });
export const STAIRS = (() => { const cols = [272, 208, 144, 80, 16], hs = [1, 2, 3, 3, 4], a = []; cols.forEach((cx, c) => { for (let r = 0; r < hs[c]; r++) a.push([cx, 1260 - BS / 2 - r * BS]); }); return a; })();
const check = (x, y, k = 1) => `<g transform="translate(${f1(x)} ${f1(y)}) scale(${k})" fill="${MC.ink}">${[[0, 8], [4, 12], [8, 16], [12, 12], [16, 8], [20, 4], [24, 0]].map(([a, b]) => `<rect x="${a}" y="${b}" width="8" height="8"/>`).join('')}</g>`;
/** satu blok BAB: pusat (cx, cy), nomor n; gold = BAB selesai (emas + centang) */
export function block(cx, cy, n, o = {}) {
  const s = BS, x = cx - s / 2, y = cy - s / 2, gold = !!o.gold, face = gold ? '#F8C038' : '#2A8F89', hi = gold ? '#FFE58F' : '#5CCBBE', lo = gold ? '#C4891A' : '#176862', fg = gold ? MC.ink : MC.ivory;
  const num = String(n);
  return `<g shape-rendering="crispEdges" opacity="${f1(o.a ?? 1)}"><rect x="${f1(x)}" y="${f1(y)}" width="${s}" height="${s}" fill="${MC.ink}"/><rect x="${f1(x + 4)}" y="${f1(y + 4)}" width="${s - 8}" height="${s - 8}" fill="${face}"/><rect x="${f1(x + 4)}" y="${f1(y + 4)}" width="${s - 8}" height="6" fill="${hi}"/><rect x="${f1(x + 4)}" y="${f1(y + 4)}" width="6" height="${s - 8}" fill="${hi}"/><rect x="${f1(x + 4)}" y="${f1(y + s - 14)}" width="${s - 8}" height="10" fill="${lo}"/><rect x="${f1(x + s - 14)}" y="${f1(y + 4)}" width="10" height="${s - 8}" fill="${lo}"/></g>`
    + pxt(cx, cy - 6, 'BAB', fg, 11, { stroke: false, op: o.a ?? 1 }) + pxt(cx, cy + 22, num, fg, num.length > 1 ? 18 : 22, { stroke: false, op: o.a ?? 1 }) + (gold ? check(cx + 6, y + 6, 0.5) : '');
}
/** semua 13 blok. mode: 'drop' (jatuh membentuk tembok), 'wall', 'morph' (tembok -> tangga) ; t0 = awal fase */
export function blocks(t, o = {}) {
  let g = ''; const gold1 = o.gold1;
  const order = Array.from({ length: 13 }, (_, i) => i);
  for (const i of order) {
    let [x, y] = WALL[i], sq = 1, a = 1;
    if (o.drop !== undefined) { const u = clamp((t - (o.drop + i * 0.1)) / 0.35); if (u <= 0) continue; y -= (1 - ei(u)) * 1100; sq = u < 1 ? 1 : 1 + Math.max(0, 0.12 * Math.sin((t - o.drop - i * 0.1 - 0.35) * 30) * Math.exp(-(t - o.drop - i * 0.1 - 0.35) * 9)); }
    if (o.morph !== undefined) { const u = seg(t, o.morph + i * 0.05, o.morph + 0.9 + i * 0.05, eio), [sx, sy] = STAIRS[i]; x = lerp(x, sx, u); y = lerp(y, sy, u) - Math.sin(Math.PI * u) * 150; }
    g += `<g transform="translate(${f1(x)} ${f1(y)}) scale(${f1(1 / sq * 1000) / 1000} ${f1(sq * 1000) / 1000}) translate(${f1(-x)} ${f1(-y)})">${block(x, y, i + 1, { gold: gold1 && i === 0, a })}</g>`;
  }
  return g;
}

// ------------------------------------------------------------------ efek pixel
export function pxSpark(x, y, k = 1, c = MC.gold) { const u = 8 * k; return `<g fill="${c}"><rect x="${f1(x - u / 2)}" y="${f1(y - u * 2.5)}" width="${f1(u)}" height="${f1(u * 5)}"/><rect x="${f1(x - u * 2.5)}" y="${f1(y - u / 2)}" width="${f1(u * 5)}" height="${f1(u)}"/><rect x="${f1(x - u * 1.5)}" y="${f1(y - u * 1.5)}" width="${f1(u * 3)}" height="${f1(u * 3)}" fill="#FFF3C4"/></g>`; }
/** serpihan pixel yang melesat dari (x, y); u = detik sejak mulai */
export function confetti(x, y, u, n = 28, seed = 4, spread = 460) {
  if (u < 0) return ''; const r = rnd(seed), cs = [MC.gold, '#FFF3C4', '#7CE0B8', '#E8665F', '#F8F7F3', '#9DE0BD']; let s = '';
  for (let i = 0; i < n; i++) { const a = r() * Math.PI * 2, v = (0.35 + r() * 0.65) * spread, sz = [8, 12, 16][Math.floor(r() * 3)], px = x + Math.cos(a) * v * u, py = y + Math.sin(a) * v * u + 520 * u * u; s += `<rect x="${f1(Math.round(px / 4) * 4)}" y="${f1(Math.round(py / 4) * 4)}" width="${sz}" height="${sz}" fill="${cs[i % cs.length]}" opacity="${f1(clamp(1.2 - u * 0.8))}"/>`; }
  return s;
}
export function bonk(x, y, u) { if (u < 0 || u > 0.55) return ''; const k = eob(clamp(u / 0.12)), a = clamp((0.55 - u) / 0.15); return `<g transform="translate(${f1(x)} ${f1(y)}) scale(${f1(k)})" opacity="${f1(a)}">${pxSpark(0, 0, 1.6, '#FFF3C4')}${pxt(0, -92, 'BONK!', MC.gold, 40, { sw: 10 })}</g>`; }
export const flash = (a, c = '#fff') => (a > 0.01 ? `<rect width="1080" height="1920" fill="${c}" opacity="${f1(a)}"/>` : '');
export function scan() { return `<defs><pattern id="slp" width="4" height="4" patternUnits="userSpaceOnUse"><rect width="4" height="2" fill="#000" opacity=".09"/></pattern></defs><rect width="1080" height="1920" fill="url(#slp)"/>`; }
/** blok pixel (transisi digital): p 0..1, area rect */
export function pixelClip(id, p, rect, seed = 3, cell = 40) {
  const r = rnd(seed), cols = Math.ceil(rect.w / cell), rows = Math.ceil(rect.h / cell); let cp = '', edge = '';
  for (let j = 0; j < rows; j++) for (let i = 0; i < cols; i++) { const th = r() * 0.85 + (i / cols) * 0.15, x = rect.x + i * cell, y = rect.y + j * cell; if (th < p) cp += `<rect x="${x}" y="${y}" width="${cell}" height="${cell}"/>`; else if (th < p + 0.1) edge += `<rect x="${x + 4}" y="${y + 4}" width="${cell - 8}" height="${cell - 8}" fill="${(i + j) % 3 ? '#7CE0B8' : MC.gold}" opacity=".85"/>`; }
  return { clip: `<clipPath id="${id}">${cp}</clipPath>`, edge };
}

// ------------------------------------------------------------------ HUD gaya game
const heart = (x, y, on, k = 1) => { const px = 5 * k, P = ['01100110', '11111111', '11111111', '01111110', '00111100', '00011000']; let g = ''; P.forEach((row, r) => [...row].forEach((c, i) => { if (c === '1') g += `<rect x="${f1(x + i * px)}" y="${f1(y + r * px)}" width="${px}" height="${px}" fill="${on ? '#FF6A6A' : '#3E5560'}"/>`; })); return g; };
/** o: lv (1|2), paham 0..1, energy 0..5, bab (jumlah BAB yang selesai), pop (0..1 denyut LV), shake */
export function hud(o) {
  const { lv = 1, paham = 0, energy = 5, bab = 0, pop = 0, shake = 0, t = 0 } = o, sk = shake ? Math.sin(t * 70) * 4 * shake : 0, k = 1 + 0.25 * pop;
  let s = `<g transform="translate(${f1(sk)} 0)">${R(40, 250, 1000, 100, 'rgba(10,28,36,.95)', 0, `stroke="${MC.gold}" stroke-width="6" shape-rendering="crispEdges"`)}`;
  s += `<g transform="translate(70 296) scale(${f1(k * 100) / 100}) translate(-70 -296)">${pxt(70, 296, 'LV ' + lv, MC.gold, 30, { stroke: false, anchor: 'start' })}</g>`;
  s += pxt(300, 294, 'ENERGI', '#A9C3C8', 16, { stroke: false, anchor: 'start' });
  for (let i = 0; i < 5; i++) s += heart(430 + i * 58, 272, i < energy, 1.15);
  s += pxt(1010, 294, 'BAB ' + bab + '/13', MC.ivory, 18, { stroke: false, anchor: 'end' });
  s += pxt(70, 332, 'PAHAM', '#A9C3C8', 16, { stroke: false, anchor: 'start' });
  const n = 26, fill = paham * n;
  for (let i = 0; i < n; i++) { const on = i + 1 <= Math.round(fill); s += `<rect x="${f1(220 + i * 30.8)}" y="316" width="26" height="18" fill="${on ? (paham >= 0.999 ? MC.gold : '#7CE0B8') : '#27414C'}" shape-rendering="crispEdges"/>`; }
  return s + '</g>';
}
// ------------------------------------------------------------------ teks ketik gaya game
export function typer(txt, t, t0, t1, o = {}) {
  const a = clamp((t - t0) / 0.12) * clamp((t1 - t) / 0.15); if (a <= 0.01) return '';
  const n = Math.min(txt.length, Math.floor((t - t0) * (o.cps ?? 28))), vis = txt.slice(0, n), fs = o.fs ?? 54, y = o.y ?? 436, px = !!o.px;
  const w = o.w ?? (px ? txt.length * fs + 90 : Math.min(1000, 60 + txt.length * fs * 0.62));
  const cur = n < txt.length || Math.floor(t * 4) % 2 ? (px ? '_' : '▌') : '';
  const col = o.red ? '#FF8A7A' : MC.ivory, edge = o.red ? '#FF8A7A' : MC.gold;
  const font = px ? `font-family="${PX}"` : `font-family="${FONT}" font-weight="800"`;
  return `<g opacity="${f1(a)}">${R(540 - w / 2, y - fs - 14, w, fs + 44, 'rgba(10,28,36,.95)', px ? 0 : 18, `stroke="${edge}" stroke-width="${px ? 6 : 4}"${px ? ' shape-rendering="crispEdges"' : ''}`)}<text x="540" y="${y + (px ? 6 : 4)}" text-anchor="middle" ${font} font-size="${fs}" fill="${col}">${vis}<tspan fill="${MC.gold}">${cur}</tspan></text></g>`;
}
export { rnd };
