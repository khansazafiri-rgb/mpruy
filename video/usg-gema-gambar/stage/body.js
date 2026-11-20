// Model penampang tubuh ILUSTRATIF (2D) dipakai bersama oleh gambar vektor penampang dan oleh pembentuk citra B-mode, sehingga
// struktur yang digambar di penampang SAMA dengan struktur yang menghasilkan gema di citra. Orientasi tetap: kulit di y = 0, kedalaman ke bawah (y positif), x ke kanan.
// Impedansi akustik dan hamburan bersifat relatif/ilustratif (bukan nilai klinis).
import { f1, clamp } from './lib.js';
const DEEP = { id: 'dalam', Z: 1.58, sc: 0.3, col: '#C79F8A' };
export const TIS = {
  kulit: { id: 'kulit', Z: 1.7, sc: 0.55, col: '#F2BF9F' }, lemak: { id: 'lemak', Z: 1.38, sc: 0.14, col: '#F9E7B0' }, otot: { id: 'otot', Z: 1.7, sc: 0.36, col: '#E58F86' },
  hati: { id: 'hati', Z: 1.66, sc: 0.52, col: '#B56552' }, cairan: { id: 'cairan', Z: 1.48, sc: 0.02, col: '#7CC1DE' }, ginjal: { id: 'ginjal', Z: 1.63, sc: 0.26, col: '#9A78B4' },
  tulang: { id: 'tulang', Z: 7.0, sc: 0.9, col: '#EEE7D3' }, dalam: DEEP,
};
export const SHAPES = { liver: { cx: -110, cy: 400, rx: 340, ry: 205 }, vessel: { cx: 120, cy: 330, r: 66 }, kidney: { cx: 330, cy: 520, rx: 120, ry: 78 }, ribs: [[-300, 172, 30, 15], [250, 178, 30, 15]] };
export const bSkin = (x) => 22 + 3 * Math.sin(x / 60), bFat = (x) => 84 + 14 * Math.sin(x / 90 + 1), bMus = (x) => 150 + 22 * Math.sin(x / 110 + 2);
const inEll = (x, y, e) => ((x - e.cx) / e.rx) ** 2 + ((y - e.cy) / e.ry) ** 2 <= 1;
export function tissueAt(x, y) {
  if (y < 0) return null;
  if (y < bSkin(x)) return TIS.kulit; if (y < bFat(x)) return TIS.lemak;
  for (const [cx, cy, rx, ry] of SHAPES.ribs) if (((x - cx) / rx) ** 2 + ((y - cy) / ry) ** 2 <= 1) return TIS.tulang;
  if (y < bMus(x)) return TIS.otot;
  if ((x - SHAPES.vessel.cx) ** 2 + (y - SHAPES.vessel.cy) ** 2 <= SHAPES.vessel.r ** 2) return TIS.cairan;
  if (inEll(x, y, SHAPES.kidney)) return TIS.ginjal; if (inEll(x, y, SHAPES.liver)) return TIS.hati;
  return DEEP;
}
// ---------------------------------------------------------------- gambar vektor penampang (koordinat dunia)
const wavy = (f, x0, x1) => { let d = ''; for (let x = x0; x <= x1; x += 10) d += `${x === x0 ? 'M' : 'L'}${x} ${f1(f(x))}`; return d; };
export function sectionSvg(x0 = -620, x1 = 620, ybot = 760) {
  const band = (f, col) => `<path d="${wavy(f, x0, x1)}L${x1} 0L${x0} 0Z" fill="${col}"/>`;
  const L = SHAPES.liver, K = SHAPES.kidney, V = SHAPES.vessel;
  let s = `<rect x="${x0}" y="0" width="${x1 - x0}" height="${ybot}" fill="${DEEP.col}"/>`;
  s += `<ellipse cx="${L.cx}" cy="${L.cy}" rx="${L.rx}" ry="${L.ry}" fill="${TIS.hati.col}"/>`;
  s += `<ellipse cx="${K.cx}" cy="${K.cy}" rx="${K.rx}" ry="${K.ry}" fill="${TIS.ginjal.col}"/>`;
  s += `<circle cx="${V.cx}" cy="${V.cy}" r="${V.r}" fill="${TIS.cairan.col}"/>`;
  s += band(bMus, TIS.otot.col);
  for (const [cx, cy, rx, ry] of SHAPES.ribs) s += `<ellipse cx="${cx}" cy="${cy}" rx="${rx}" ry="${ry}" fill="${TIS.tulang.col}"/>`;
  s += band(bFat, TIS.lemak.col) + band(bSkin, TIS.kulit.col);
  return s;
}
// ---------------------------------------------------------------- probe (vektor datar). Titik kontak = (0, 0); badan di atas kulit (y negatif); tilt = derajat, berputar pada titik kontak
export function probeSvg(o = {}) {
  const w = o.w ?? 150, hi = o.glow ?? 0;
  return `<g transform="rotate(${f1(o.tilt ?? 0)})"><path d="M${-w / 2 - 8} -4 L${-w / 2 + 6} -34 L${w / 2 - 6} -34 L${w / 2 + 8} -4 Z" fill="#9FE3D8" stroke="#172B38" stroke-width="5" stroke-linejoin="round"/>`
    + `<path d="M${-w / 2 + 6} -34 L${-w / 2 + 24} -150 L${w / 2 - 24} -150 L${w / 2 - 6} -34 Z" fill="#3E74A6" stroke="#172B38" stroke-width="5" stroke-linejoin="round"/>`
    + `<rect x="${-w / 2 + 30}" y="-112" width="${w - 60}" height="12" rx="6" fill="#00A383"/>`
    + `<path d="M${-w / 2 + 24} -150 L${-w / 2 + 38} -270 L${w / 2 - 38} -270 L${w / 2 - 24} -150 Z" fill="#1A3550" stroke="#172B38" stroke-width="5" stroke-linejoin="round"/>`
    + `<path d="M0 -270 C 10 -330, 150 -330, 160 -430" fill="none" stroke="#172B38" stroke-width="16" stroke-linecap="round"/><path d="M0 -270 C 10 -330, 150 -330, 160 -430" fill="none" stroke="#3A4F66" stroke-width="8" stroke-linecap="round"/>`
    + (hi > 0.02 ? `<rect x="${-w / 2 - 8}" y="-36" width="${w + 16}" height="34" rx="12" fill="none" stroke="#FFFFFF" stroke-width="${f1(8 * hi)}" opacity="${f1(hi)}"/>` : '') + `</g>`;
}
// ---------------------------------------------------------------- pembentuk citra B-mode (kanvas 2D)
const hsh = (i, j) => { const x = Math.sin(i * 127.1 + j * 311.7) * 43758.5453; return x - Math.floor(x); };
function vnoise(x, y) { const i = Math.floor(x), j = Math.floor(y), fx = x - i, fy = y - j, a = hsh(i, j), b = hsh(i + 1, j), c = hsh(i, j + 1), d = hsh(i + 1, j + 1), ux = fx * fx * (3 - 2 * fx), uy = fy * fy * (3 - 2 * fy); return a + (b - a) * ux + (c - a) * uy + (a - b - c + d) * ux * uy; }
const off = document.createElement('canvas');
/**
 * Menggambar citra B-mode irisan tubuh ke ctx pada persegi dst = {x, y, w, h}. Apeks sektor di (dst.x + dst.w / 2, dst.y). pose = {px, tilt(derajat)}.
 * o: half (derajat), depth (satuan dunia), reveal = {theta (rad; garis < theta sudah terbentuk), r (satuan dunia; kedalaman garis saat ini)} atau null = utuh, gain.
 * Kecerahan titik = (hamburan jaringan + pantulan batas) x redaman kedalaman: batas dengan beda impedansi besar -> terang, kedalaman besar -> redup.
 */
export function renderBmode(ctx, dst, pose, o = {}) {
  const half = (o.half ?? 40) * Math.PI / 180, depth = o.depth ?? 560, sc = dst.h / depth, st = o.step ?? 2, gain = o.gain ?? 1.15;
  const W = Math.ceil(dst.w / st), H = Math.ceil(dst.h / st); off.width = W; off.height = H;
  const octx = off.getContext('2d'), img = octx.createImageData(W, H), d = img.data, tl = (pose.tilt || 0) * Math.PI / 180, lw = 0.018;
  for (let j = 0; j < H; j++) for (let i = 0; i < W; i++) {
    const dx = i * st - dst.w / 2, dy = j * st, r = Math.hypot(dx, dy), th = Math.atan2(dx, dy), k = (j * W + i) * 4;
    if (Math.abs(th) > half || r > dst.h || r < 6) { d[k + 3] = 0; continue; }
    let a = 1;
    if (o.reveal) { const re = o.reveal; if (th > re.theta + lw) a = 0; else if (th > re.theta - lw) a = r / sc <= re.r ? 1 : 0; }
    if (!a) { d[k + 3] = 0; continue; }
    const rw = r / sc, ph = tl + th, xw = pose.px + rw * Math.sin(ph), yw = rw * Math.cos(ph);
    const t1 = tissueAt(xw, yw), t0 = tissueAt(pose.px + (rw - 6) * Math.sin(ph), (rw - 6) * Math.cos(ph));
    let b = 0;
    if (t1) {
      const n = 0.35 + 0.65 * vnoise(xw * 0.33, yw * 0.33) * vnoise(xw * 0.13 + 9, yw * 0.21 + 4) * 1.4;
      const Zp = t0 ? t0.Z : t1.Z, R = ((t1.Z - Zp) / (t1.Z + Zp)) ** 2 * 70;
      b = (t1.sc * n * 0.8 + R) * Math.exp(-rw / 640);
    }
    b = Math.pow(clamp(b * gain), 0.82); const edge = clamp((half - Math.abs(th)) / 0.02) * clamp((dst.h - r) / 8) * a;
    d[k] = 238 * b; d[k + 1] = 248 * b; d[k + 2] = 250 * b; d[k + 3] = 255 * edge;
  }
  octx.putImageData(img, 0, 0); ctx.save(); ctx.imageSmoothingEnabled = true; ctx.imageSmoothingQuality = 'high'; ctx.drawImage(off, dst.x, dst.y, W * st, H * st); ctx.restore();
}
