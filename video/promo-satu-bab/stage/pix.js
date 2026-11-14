// Lapisan gaya game piksel modern. Latar & meja digambar sebagai SVG vektor lalu di-rasterisasi ke kanvas kecil (180 x 320, blok 6 px),
// diposterisasi + dither Bayer, dan diperbesar tanpa penghalusan. KARAKTER (Raka, Nilo, Kila) TIDAK pernah dipikselkan: mereka digambar vektor asli di atas lapisan ini.
import { f1, clamp, MC, FONT } from './core.js';
export const BLK = 6, GW = 1080 / BLK, GH = 1920 / BLK;
const BAYER = [0, 8, 2, 10, 12, 4, 14, 6, 3, 11, 1, 9, 15, 7, 13, 5];
export const mkCanvas = (w, h) => { const c = document.createElement('canvas'); c.width = w; c.height = h; return c; };
const work = mkCanvas(GW, GH), wctx = work.getContext('2d', { willReadFrequently: true });
// svgInner (koordinat 1080 x 1920) -> ImageData (GW x GH) terposterisasi. alpha: bila true, piksel transparan tetap transparan (ambang 0,5)
export async function rasterize(svgInner, o = {}) {
  const s = `<svg xmlns="http://www.w3.org/2000/svg" width="${GW}" height="${GH}" viewBox="0 0 1080 1920" shape-rendering="crispEdges">${svgInner}</svg>`;
  const img = new Image(); img.src = 'data:image/svg+xml;charset=utf-8,' + encodeURIComponent(s); await img.decode();
  wctx.clearRect(0, 0, GW, GH); wctx.drawImage(img, 0, 0, GW, GH);
  const d = wctx.getImageData(0, 0, GW, GH), a = d.data, L = o.levels ?? 14, st = 255 / (L - 1);
  for (let y = 0; y < GH; y++) for (let x = 0; x < GW; x++) {
    const i = (y * GW + x) * 4, th = (BAYER[(y & 3) * 4 + (x & 3)] / 16 - 0.47) * st * (o.dither ?? 0.3);
    if (o.alpha) { if (a[i + 3] < 128) { a[i + 3] = 0; continue; } a[i + 3] = 255; }
    for (let k = 0; k < 3; k++) a[i + k] = clamp(Math.round((a[i + k] + th) / st) * st, 0, 255);
  }
  return d;
}
export const blit = (canvas, d) => canvas.getContext('2d').putImageData(d, 0, 0);
// mosaik: blok 90 x 90 px (15 x 15 piksel latar) berurutan diagonal + acak; k 0..1 -> kumpulan blok yang sudah berganti
export const MB = 90, MC_ = 12, MR = Math.ceil(1920 / MB);
const hash = (i, j) => { const s = Math.sin(i * 127.1 + j * 311.7) * 43758.5453; return s - Math.floor(s); };
export const mosaicOrder = (i, j) => (i / (MC_ - 1) * 0.5 + j / (MR - 1) * 0.5) * 0.7 + hash(i, j) * 0.3;
export const inB = (i, j, k) => mosaicOrder(i, j) < k * 1.0001 - 0.0001;
export function mergeData(dA, dB, k) {
  const out = new ImageData(GW, GH), pa = dA.data, pb = dB.data, po = out.data, per = MB / BLK;
  for (let y = 0; y < GH; y++) for (let x = 0; x < GW; x++) {
    const i = (y * GW + x) * 4, src = inB(Math.floor(x / per), Math.floor(y / per), k) ? pb : pa;
    po[i] = src[i]; po[i + 1] = src[i + 1]; po[i + 2] = src[i + 2]; po[i + 3] = src[i + 3];
  }
  return out;
}
export const clipB = (id, k, inv = false) => {
  let r = ''; for (let j = 0; j < MR; j++) for (let i = 0; i < MC_; i++) if (inB(i, j, k) !== inv) r += `<rect x="${i * MB}" y="${j * MB}" width="${MB}" height="${MB}"/>`;
  return `<clipPath id="${id}">${r || '<rect width="0" height="0"/>'}</clipPath>`;
};
// ---- font piksel 5 x 7 (angka, titik, titik dua) untuk jam agenda
const GLY = { '0': ['01110', '10001', '10011', '10101', '11001', '10001', '01110'], '1': ['00100', '01100', '00100', '00100', '00100', '00100', '01110'], '2': ['01110', '10001', '00001', '00010', '00100', '01000', '11111'], '3': ['11110', '00001', '00001', '01110', '00001', '00001', '11110'], '4': ['00010', '00110', '01010', '10010', '11111', '00010', '00010'], '5': ['11111', '10000', '11110', '00001', '00001', '10001', '01110'], '6': ['00110', '01000', '10000', '11110', '10001', '10001', '01110'], '7': ['11111', '00001', '00010', '00100', '01000', '01000', '01000'], '8': ['01110', '10001', '10001', '01110', '10001', '10001', '01110'], '9': ['01110', '10001', '10001', '01111', '00001', '00010', '01100'], '.': ['00000', '00000', '00000', '00000', '00000', '01100', '01100'], ':': ['00000', '01100', '01100', '00000', '01100', '01100', '00000'] };
/** teks piksel; (x, y) = pojok kiri-atas, u = ukuran satu piksel font */
export function pixText(txt, x, y, u, fill, o = {}) {
  let s = '', cx = x; const sh = o.shadow;
  for (const ch of txt) {
    const g = GLY[ch]; if (!g) { cx += 4 * u; continue; }
    for (let r = 0; r < 7; r++) for (let c = 0; c < 5; c++) if (g[r][c] === '1') {
      if (sh) s += `<rect x="${f1(cx + c * u + u * 0.5)}" y="${f1(y + r * u + u * 0.5)}" width="${u}" height="${u}" fill="${sh}"/>`;
      s += `<rect x="${f1(cx + c * u)}" y="${f1(y + r * u)}" width="${u}" height="${u}" fill="${fill}"/>`;
    }
    cx += 6 * u;
  }
  return s;
}
export const pixTextW = (txt, u) => txt.length * 6 * u - u;
/** plat bergaya piksel: sudut bertangga, bingkai tebal, bayangan blok */
export function pixPlate(x, y, w, h, o = {}) {
  const b = o.b ?? 6, fill = o.fill ?? MC.ivory, edge = o.edge ?? MC.ink, sh = o.shadow ?? 'rgba(2,16,20,.45)', c = o.c ?? 12;
  const poly = (x0, y0, w0, h0) => `M${x0 + c} ${y0}H${x0 + w0 - c}V${y0 + c}H${x0 + w0}V${y0 + h0 - c}H${x0 + w0 - c}V${y0 + h0}H${x0 + c}V${y0 + h0 - c}H${x0}V${y0 + c}H${x0 + c}Z`;
  return `<path d="${poly(x + 8, y + 10, w, h)}" fill="${sh}"/><path d="${poly(x, y, w, h)}" fill="${edge}"/><path d="${poly(x + b, y + b, w - 2 * b, h - 2 * b)}" fill="${fill}"/>`;
}
