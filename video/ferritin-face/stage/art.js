// Objek pixel art kode untuk video "ferritin face". Semua digambar sebagai SVG di koordinat 1080 x 1920, lalu dipikselkan oleh stage.js (kanvas resolusi rendah + palet tetap).
// Palet utama: biru navy gelap, krem terang, cyan, merah darah, kuning hangat.
import { f1, clamp, lerp, sm } from './core.js';
export const C = { navy: '#0B1F3A', navy2: '#102A4C', navy3: '#173963', line: '#1F4B7D', cream: '#FFF3DC', cream2: '#E4D2B4', cyan: '#19C3D9', cyan2: '#5CE1E6', red: '#E63946', red2: '#B3202F', red3: '#7A1220', gold: '#F8C038', gold2: '#FFD866', gold3: '#B8860B', ink: '#07142B', white: '#FFFFFF', steel: '#8E97A3', steel2: '#5C6B7A' };
const r = (x, y, w, h, f, e = '') => `<rect x="${f1(x)}" y="${f1(y)}" width="${f1(w)}" height="${f1(h)}" fill="${f}" ${e}/>`;
const PX = "'Press Start 2P', monospace";
export const pxt = (x, y, txt, fill, size, anchor = 'middle', e = '') => `<text x="${f1(x)}" y="${f1(y)}" font-family="${PX}" font-size="${size}" fill="${fill}" text-anchor="${anchor}" ${e}>${txt}</text>`;
/** papan belajar tampak atas: latar navy + garis kisi + bingkai */
export function board(o = {}) {
  let s = r(0, 0, 1080, 1920, C.navy), g = '';
  for (let x = 60; x < 1080; x += 120) g += `M${x} 0V1920`;
  for (let y = 60; y < 1920; y += 120) g += `M0 ${y}H1080`;
  s += `<path d="${g}" stroke="${C.navy2}" stroke-width="6" fill="none"/>`;
  s += `<rect x="30" y="250" width="1020" height="960" fill="none" stroke="${C.line}" stroke-width="10"/>`;
  [[30, 250], [1050, 250], [30, 1210], [1050, 1210]].forEach(([x, y]) => { s += r(x - 14, y - 14, 28, 28, C.cyan); });
  return s;
}
/** butir zat besi (kotak kuning dengan tepi gelap dan kilau) */
export function grain(x, y, s = 30, a = 1) {
  return `<g opacity="${f1(a)}">${r(x - s / 2 - 5, y - s / 2 - 5, s + 10, s + 10, C.gold3)}${r(x - s / 2, y - s / 2, s, s, C.gold)}${r(x - s / 2, y - s / 2, s * 0.45, s * 0.45, C.gold2)}</g>`;
}
/** kotak penyimpanan FERRITIN: peti navy bertepi cyan dengan tutup, jendela isi (level 0..1) berisi butiran */
export function box(cx, cy, w, h, level, o = {}) {
  const x = cx - w / 2, y = cy - h / 2, lid = h * 0.2;
  let s = r(x - 8, y - 8, w + 16, h + 16, C.ink) + r(x, y, w, h, C.navy3) + r(x, y, w, lid, C.line) + r(x - 12, y - 6, w + 24, lid * 0.55, C.cyan);
  // jendela isi
  const wx = x + w * 0.14, wy = y + lid + 22, ww = w * 0.72, wh = h - lid - 44;
  s += r(wx - 6, wy - 6, ww + 12, wh + 12, C.ink) + r(wx, wy, ww, wh, C.navy);
  const n = Math.round(clamp(level) * 24), cols = 6, cell = ww / cols, sz = cell * 0.78;
  for (let i = 0; i < n; i++) { const col = i % cols, row = Math.floor(i / cols); s += grain(wx + cell * (col + 0.5), wy + wh - cell * (row + 0.5), sz); }
  if (o.glow) s += `<rect x="${f1(x - 18)}" y="${f1(y - 18)}" width="${f1(w + 36)}" height="${f1(h + 36)}" fill="none" stroke="${C.gold}" stroke-width="8" opacity="${f1(o.glow)}"/>`;
  return s;
}
/** kantong sumber zat besi (tumpukan butiran) */
export function pile(cx, cy, n = 10, a = 1) {
  let s = ''; const pos = [[0, 0], [34, 0], [-34, 0], [17, -34], [-17, -34], [0, -68], [51, -34], [-51, -34], [68, 0], [-68, 0], [34, -68], [-34, -68]];
  for (let i = 0; i < Math.min(n, pos.length); i++) s += grain(cx + pos[i][0], cy + pos[i][1], 30, a);
  return s;
}
/** molekul hemoglobin (empat bulatan merah tua dengan inti besi kuning) */
export function hb(x, y, k = 1, a = 1, empty = false) {
  if (empty) return `<g opacity="${f1(a)}"><circle cx="${f1(x)}" cy="${f1(y)}" r="${f1(30 * k)}" fill="none" stroke="${C.red2}" stroke-width="5" stroke-dasharray="10 9"/></g>`;
  const o = 14 * k, d = (dx, dy) => `<circle cx="${f1(x + dx * o)}" cy="${f1(y + dy * o)}" r="${f1(15 * k)}" fill="${C.red3}"/><circle cx="${f1(x + dx * o - 3 * k)}" cy="${f1(y + dy * o - 3 * k)}" r="${f1(6 * k)}" fill="${C.red2}"/>`;
  return `<g opacity="${f1(a)}">${d(-1, -1)}${d(1, -1)}${d(-1, 1)}${d(1, 1)}${r(x - 7 * k, y - 7 * k, 14 * k, 14 * k, C.gold)}</g>`;
}
/** sel darah merah tampak atas: cakram merah dengan lekuk tengah; slots = [{x,y,on,a}] posisi relatif ke pusat */
export function rbc(cx, cy, rad, o = {}) {
  let s = `<circle cx="${cx}" cy="${cy}" r="${rad + 10}" fill="${C.red3}"/><circle cx="${cx}" cy="${cy}" r="${rad}" fill="${C.red}"/><circle cx="${cx}" cy="${cy}" r="${f1(rad * 0.62)}" fill="${C.red2}" opacity=".55"/>`;
  s += `<path d="M${f1(cx - rad * 0.78)} ${f1(cy - rad * 0.3)}A${f1(rad * 0.84)} ${f1(rad * 0.84)} 0 0 1 ${f1(cx - rad * 0.3)} ${f1(cy - rad * 0.78)}" stroke="#FF6B6B" stroke-width="12" fill="none" stroke-linecap="square" opacity=".9"/>`;
  for (const sl of o.slots || []) s += hb(cx + sl.x, cy + sl.y, sl.k ?? 1.15, sl.a ?? 1, sl.empty);
  return s;
}
/** tanda tanya besar pixel */
export function qmark(cx, cy, size, a = 1, bob = 0) {
  return `<g opacity="${f1(a)}" transform="translate(0 ${f1(bob)})">${pxt(cx + 8, cy + 8, '?', C.ink, size)}${pxt(cx, cy, '?', C.gold, size)}</g>`;
}
/** tabung sampel darah + tetes + lembar hasil sederhana (tanpa angka) */
export function bloodTest(cx, cy, k = 1, a = 1) {
  const X = (v) => cx + v * k, Y = (v) => cy + v * k, w = (v) => v * k;
  let s = `<g opacity="${f1(a)}">`;
  // lembar hasil (kertas krem dengan bilah abu-abu kosong, tanpa angka)
  s += r(X(-150), Y(-120), w(170), w(230), C.ink) + r(X(-142), Y(-112), w(154), w(214), C.cream);
  s += r(X(-126), Y(-92), w(90), w(16), C.steel) + [0, 1, 2].map((i) => r(X(-126), Y(-52 + i * 40), w(122 - i * 22), w(14), C.cream2)).join('') + r(X(-126), Y(66), w(60), w(18), C.cyan);
  // tabung
  s += r(X(30), Y(-130), w(64), w(250), C.ink) + r(X(38), Y(-30), w(48), w(140), C.red) + r(X(38), Y(-30), w(14), w(140), '#FF6B6B') + r(X(38), Y(-122), w(48), w(92), '#A9F0F5', 'opacity=".35"');
  s += r(X(24), Y(-150), w(76), w(36), C.gold) + r(X(24), Y(-150), w(76), w(10), C.gold2);
  // tetes darah
  s += `<path d="M${f1(X(130))} ${f1(Y(-40))}l${w(26)} ${w(46)}a${w(30)} ${w(30)} 0 1 1 ${-w(52)} 0z" fill="${C.red}"/><circle cx="${f1(X(122))}" cy="${f1(Y(40))}" r="${f1(w(7))}" fill="#FF6B6B"/>`;
  return s + `</g>`;
}
/** ponsel tampak depan (pixel): badan, layar, kartu "FERRITIN FACE" */
export function phone(cx, cy, w, h, o = {}) {
  const x = cx - w / 2, y = cy - h / 2;
  let s = r(x - 14, y - 14, w + 28, h + 28, C.ink) + r(x - 8, y - 8, w + 16, h + 16, C.steel2) + r(x, y, w, h, C.navy);
  s += r(cx - 40, y + 14, 80, 12, C.ink);
  // kartu tunggal
  const cw = w * 0.84, ch = h * 0.34, cyy = cy - h * 0.04;
  s += r(cx - cw / 2 - 8, cyy - ch / 2 - 8, cw + 16, ch + 16, C.ink) + r(cx - cw / 2, cyy - ch / 2, cw, ch, C.cream) + r(cx - cw / 2, cyy - ch / 2, cw, 14, C.cyan);
  s += pxt(cx, cyy - ch * 0.04, 'FERRITIN', C.ink, o.fs ?? 30) + pxt(cx, cyy + ch * 0.3, 'FACE', C.red2, o.fs ?? 30);
  return s;
}
/** laptop tampak dari belakang punggung Raka: layar menghadap kamera. open 0..1 (tinggi layar terlihat), glow 0..1 */
export function laptop(cx, baseY, w, h, open, glow = 0) {
  const x = cx - w / 2, lh = h * clamp(open);
  let s = r(x - 20, baseY, w + 40, 34, C.steel2) + r(x - 6, baseY + 34, w + 12, 12, C.steel) + r(cx - 60, baseY + 4, 120, 14, C.steel);
  if (lh > 6) {
    s += r(x - 12, baseY - lh - 12, w + 24, lh + 12, C.ink) + r(x, baseY - lh, w, lh - 4, glow > 0.01 ? C.cream : C.navy3);
    if (glow > 0.01) s += r(x, baseY - lh, w, lh - 4, C.cyan2, `opacity="${f1(0.28 * glow)}"`);
  }
  return s;
}

/** tangan pixel (bulatan kulit + ibu jari) memegang tepi benda; (x, y) = pusat telapak */
export function hand(x, y) {
  return `<circle cx="${f1(x)}" cy="${f1(y)}" r="34" fill="#F7BC8E"/><rect x="${f1(x - 8)}" y="${f1(y - 54)}" width="26" height="52" rx="13" fill="#F7BC8E"/><rect x="${f1(x + 6)}" y="${f1(y - 6)}" width="40" height="22" rx="11" fill="#EAA676"/>`;
}

/** punggung ponsel (kamera menghadap penonton), dipegang di depan dada */
export function phoneBack(cx, cy, w, h, shake = 0) {
  const x = cx - w / 2 + shake, y = cy - h / 2;
  return r(x - 8, y - 8, w + 16, h + 16, C.ink) + r(x, y, w, h, C.steel2) + r(x, y, w, h * 0.12, C.steel) + r(x + w * 0.12, y + h * 0.05, w * 0.26, h * 0.1, C.ink) + r(x + w * 0.2, y + h * 0.09, w * 0.1, h * 0.04, C.gold) + r(x + w * 0.35, y + h * 0.7, w * 0.3, h * 0.07, C.cyan);
}
/** ponsel tampak depan besar (POV): bezel, layar navy, satu kartu krem "FERRITIN FACE" (press 0..1 menekan kartu) */
export function phoneScreen(cx, cy, w, h, press = 0, pop = 1) {
  const x = cx - w / 2, y = cy - h / 2;
  let s = r(x - 22, y - 22, w + 44, h + 44, C.ink) + r(x - 12, y - 12, w + 24, h + 24, C.steel2) + r(x, y, w, h, C.navy);
  s += r(cx - 70, y + 20, 140, 18, C.ink) + r(x + 36, y + 70, w - 72, 22, C.navy2) + r(x + 36, y + 110, (w - 72) * 0.6, 22, C.navy2);
  const k = pop * (1 - 0.05 * press), cw = w * 0.84 * k, ch = 300 * k, cyy = cy - 20;
  s += r(cx - cw / 2 - 10, cyy - ch / 2 - 10, cw + 20, ch + 20, C.ink) + r(cx - cw / 2, cyy - ch / 2, cw, ch, C.cream) + r(cx - cw / 2, cyy - ch / 2, cw, 20 * k, C.cyan);
  s += pxt(cx, cyy - ch * 0.03, 'FERRITIN', C.ink, 46 * k) + pxt(cx, cyy + ch * 0.32, 'FACE', C.red2, 46 * k);
  s += r(x + 36, y + h - 130, w - 72, 22, C.navy2) + r(x + 36, y + h - 90, (w - 72) * 0.45, 22, C.navy2);
  return s;
}
/** ibu jari menekan layar dari bawah (POV) */
export function thumb(x, y, a = 1) {
  return `<g opacity="${f1(a)}"><rect x="${f1(x - 44)}" y="${f1(y)}" width="88" height="260" rx="44" fill="#F7BC8E"/><rect x="${f1(x - 30)}" y="${f1(y + 8)}" width="30" height="20" rx="10" fill="#FFD9B8"/></g>`;
}
/** laptop tampak dari belakang (punggung layar menghadap penonton), open 0..1 mengangkat penutup */
export function laptopBack(cx, baseY, w, h, open) {
  const x = cx - w / 2, lh = h * clamp(open);
  let s = r(x - 14, baseY - 2, w + 28, 34, C.steel2) + r(x - 4, baseY + 30, w + 8, 10, C.steel);
  if (lh > 6) s += r(x - 10, baseY - lh - 10, w + 20, lh + 12, C.ink) + r(x, baseY - lh, w, lh, C.steel2) + r(x, baseY - lh, w, 12, C.steel) + r(cx - 30, baseY - lh / 2 - 14, 60, 28, C.steel);
  return s;
}
/** laptop tampak depan (POV): layar menyala krem, bezel, papan ketik */
export function laptopFront(cx, cy, w, h, glow = 1) {
  const x = cx - w / 2, y = cy - h / 2;
  let s = r(x - 20, y - 20, w + 40, h + 40, C.ink) + r(x - 10, y - 10, w + 20, h + 20, C.steel2) + r(x, y, w, h, glow > 0.01 ? C.cream : C.navy3);
  s += r(x - 90, y + h + 20, w + 180, 40, C.steel) + r(x - 60, y + h + 60, w + 120, 130, C.steel2) + r(cx - 90, y + h + 90, 180, 22, C.steel);
  for (let i = 0; i < 6; i++) s += r(x - 30 + i * ((w + 60) / 6), y + h + 120, (w + 60) / 6 - 12, 20, C.ink);
  return s;
}
