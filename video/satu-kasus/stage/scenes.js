// Ruang diskusi kasus + benda-bendanya (lembar kasus, kartu materi, catatan, tab, garis hubungan) untuk "Satu Kasus, Banyak yang Harus Nyambung".
// Estetika pixel modern yang hangat: tepi tebal bersudut dipotong, warna krem-kayu, aksen teal MEDCOEL. Raka dan maskot TIDAK digambar di sini (lihat stage.js: raka.js dan mascot.js kanonik).
import { f1, clamp, lerp, sm, eo, ei, eio, eob, MC, FONT, rnd } from './core.js';
import { R, T, pxt, pxBox, pxSpark, PX } from './fx.js';

export const DESK_Y = 1156;
export const RAKA_POS = { x: 270, s: 1.2 };
export const LAPTOP = { cx: 700, cy: 1030, w: 440, h: 280 };
export const CW = 210, CH = 232;
export const SLOT = { S: [140, 1318], A: [385, 1318], F: [615, 1318], P: [845, 1318] };       // posisi rapi di meja
export const MESSY = { A: [372, 1296, -9], F: [650, 1346, 7], P: [850, 1286, -5] };            // posisi berantakan (x, y, rotasi)
const WOOD = { top: '#DDA571', top2: '#CF9560', edge: '#8A5A34', front: '#A06A3C', front2: '#8C5A31', line: '#7A4D2B' };
const HUE = { A: '#1D7B75', F: '#3F72D8', P: '#7F6BDC', BAB: '#E59A3A' };

// ------------------------------------------------------------------ ruangan
export function roomBack(t) {
  let s = '';
  const bands = ['#FBEFD6', '#F9EBCF', '#F7E6C6', '#F5E2BE', '#F2DDB5', '#EFD8AC'];
  bands.forEach((c, i) => { s += R(0, i * 200, 1080, 202, c); });
  s += R(0, 960, 1080, 200, '#E9C99A') + R(0, 956, 1080, 8, '#C99F6A');                                    // dinding bawah (wainscot)
  // berkas cahaya jendela (samar)
  s += `<polygon points="0,260 360,260 760,1000 120,1000" fill="#FFF6DC" opacity="${f1(0.16 + 0.03 * Math.sin(t * 0.8))}"/>`;
  // papan tulis diskusi
  const bx = 560, by = 500, bw = 460, bh = 340;
  s += `<g shape-rendering="crispEdges">${R(bx + 8, by + 12, bw, bh, '#000', 0, 'opacity=".12"')}${pxBox(bx, by, bw, bh, '#FBFAF4', { sw: 6, n: 10 })}${R(bx + 20, by + bh - 34, bw - 40, 10, '#D8CDB4')}</g>`;
  s += pxt(bx + bw / 2, by + 62, 'DISKUSI KASUS', MC.brand, 24, { stroke: false });
  s += `<g stroke="#C9D3D6" stroke-width="8" stroke-linecap="round">${[[100, 108, 400], [100, 148, 330], [100, 188, 380]].map(([x, y, e]) => `<path d="M${bx + x - 40} ${by + y}H${bx + e - 40}"/>`).join('')}</g>`;
  s += `<g shape-rendering="crispEdges">${R(bx + 60, by + 230, 56, 56, '#E8F2EF')}${R(bx + 202, by + 230, 56, 56, '#E8F2EF')}${R(bx + 344, by + 230, 56, 56, '#E8F2EF')}${R(bx + 116, by + 254, 86, 8, '#C9D3D6')}${R(bx + 258, by + 254, 86, 8, '#C9D3D6')}</g>`;
  // debu cahaya melayang
  const r = rnd(5);
  for (let i = 0; i < 14; i++) { const x = r() * 1080, y = 300 + r() * 650, ph = r() * 6; s += `<rect x="${f1(Math.round(((x + t * 10 * (0.4 + r())) % 1080) / 4) * 4)}" y="${f1(Math.round((y + Math.sin(t * 0.7 + ph) * 12) / 4) * 4)}" width="${i % 3 ? 4 : 8}" height="${i % 3 ? 4 : 8}" fill="${MC.gold}" opacity="${f1(0.25 + 0.2 * Math.sin(t * 1.4 + ph))}"/>`; }
  return s;
}
/** meja: permukaan atas, sisi depan, dan benda kecil (gelas, pulpen) */
export function deskTop() {
  let s = R(0, DESK_Y, 1080, 360, WOOD.top) + R(0, DESK_Y, 1080, 8, WOOD.edge) + R(0, DESK_Y + 8, 1080, 6, '#F0C79B', 0, 'opacity=".75"');
  for (let i = 0; i < 9; i++) s += R(((i * 211) % 1000), DESK_Y + 40 + (i * 37) % 300, 70 + (i * 29) % 90, 5, WOOD.top2);
  s += R(0, DESK_Y + 360, 1080, 14, WOOD.edge) + R(0, DESK_Y + 374, 1080, 700, WOOD.front);
  for (let y = DESK_Y + 430; y < 1920; y += 64) s += R(0, y, 1080, 4, WOOD.line, 0, 'opacity=".55"');
  s += `<g shape-rendering="crispEdges">${pxBox(36, DESK_Y + 20, 46, 54, '#FFFDF6', { sw: 4, n: 4 })}${R(44, DESK_Y + 30, 30, 12, '#8A5A34')}${R(82, DESK_Y + 34, 14, 24, '#FFFDF6', 0, `stroke="${MC.ink}" stroke-width="4"`)}</g>`;   // gelas
  return s;
}
/** laptop Raka (menghadap penonton): state off|on; glow = cahaya layar */
export function laptop(t, state = 'on') {
  const { cx, cy, w, h } = LAPTOP, x = cx - w / 2, y = cy - h / 2;
  let s = `<g>${R(x - 14, y - 14, w + 28, h + 28, '#1A252E', 20, 'stroke="#3B4D5B" stroke-width="3"')}`;
  if (state === 'off') s += R(x, y, w, h, '#14222D', 10) + `<polygon points="${x + 40},${y + h} ${x + 150},${y} ${x + 215},${y} ${x + 105},${y + h}" fill="#fff" opacity=".05"/><polygon points="${x + 250},${y + h} ${x + 360},${y} ${x + 390},${y} ${x + 280},${y + h}" fill="#fff" opacity=".04"/>` + `<rect x="${cx - 5}" y="${y + h - 26}" width="10" height="10" fill="${MC.gold}" opacity="${f1(0.35 + 0.35 * Math.sin(t * 3))}"/>`;
  else s += R(x, y, w, h, '#EAF6F1', 10) + `<image href="logo-full.webp" x="${cx - 130}" y="${y + 40}" width="260" height="52" preserveAspectRatio="xMidYMid meet"/>` + `<g opacity="${f1(0.7 + 0.3 * Math.sin(t * 6))}">${R(cx - 92, y + 150, 184, 56, MC.brand, 28, `stroke="${MC.ink}" stroke-width="3"`)}${T(cx, y + 187, 'COBA', '#fff', 26)}</g>`;
  s += '</g>' + R(cx - 28, cy + h / 2 + 12, 56, 38, '#1A252E') + R(cx - 280, cy + h / 2 + 46, 560, 22, '#2A3A46', 8) + R(cx - 150, cy + h / 2 + 36, 300, 14, '#1A252E', 6);
  return s;
}

// ------------------------------------------------------------------ ilustrasi kartu (koordinat lokal, pusat area gambar = 0,0; lebar ±90, tinggi ±62)
const PINK = '#F08A92', PINKD = '#B94E5C', TRACH = '#F4C2BC';
function lungs(sc = 1, o = {}) {
  const L = `M-18 -26C-52 -20-70 24-64 60C-60 76-34 76-22 60C-14 32-16 2-18 -26Z`;
  const Rr = `M18 -26C52 -20 70 24 64 60C60 76 34 76 22 60C16 50 18 36 14 22C16 6 16 -10 18 -26Z`;
  return `<g transform="scale(${f1(sc * 1000) / 1000})"><g stroke-linejoin="round"><rect x="-7" y="-60" width="14" height="44" rx="5" fill="${TRACH}" stroke="${PINKD}" stroke-width="3"/><path d="M0 -20L-22 6M0 -20L22 6M-22 6L-38 22M-22 6L-30 30M22 6L36 24" stroke="${PINKD}" stroke-width="4" fill="none" stroke-linecap="round"/><path d="${L}" fill="${PINK}" stroke="${PINKD}" stroke-width="3.5"/><path d="${Rr}" fill="${PINK}" stroke="${PINKD}" stroke-width="3.5"/><path d="M-62 14C-44 18-30 30-22 42M-60 36C-46 38-34 46-26 56" stroke="${PINKD}" stroke-width="3" fill="none" stroke-linecap="round" opacity=".8"/><path d="M62 18C46 24 34 34 28 46" stroke="${PINKD}" stroke-width="3" fill="none" stroke-linecap="round" opacity=".8"/></g></g>`;
}
function artAnatomi(t) { return `<g transform="translate(0 6)">${lungs(0.88)}${[[-70, -48, 1.1], [74, -40, 0.8]].map(([x, y, k], i) => pxSpark(x, y + Math.sin(t * 3 + i) * 3, k * (0.7 + 0.3 * Math.sin(t * 5 + i)), '#FFF3C4')).join('')}</g>`; }
function artNapas(t) {
  const ph = Math.sin(t * 3.4), k = 0.9 + 0.08 * ph, dome = 6 * ph;
  return `<g transform="translate(0 4)"><g fill="none" stroke="#C9B48E" stroke-width="5" stroke-linecap="round"><path d="M-82 -30C-92 4-84 40-62 58M82 -30C92 4 84 40 62 58M-78 -52C-92 -34-94-12-92 8M78 -52C92 -34 94 -12 92 8"/></g><g transform="translate(0 ${f1(-6 + ph * -2)})">${lungs(0.76 * k)}</g><path d="M-76 ${f1(62 + dome)}C-40 ${f1(40 + dome)} 40 ${f1(40 + dome)} 76 ${f1(62 + dome)}Z" fill="#E5B07A" stroke="${MC.ink}" stroke-width="3.5"/><g fill="${MC.brand}"><path d="M-88 ${f1(-6 - ph * 8)}l-8 12h16zM88 ${f1(-6 - ph * 8)}l-8 12h16z" opacity=".9"/><path d="M-88 ${f1(20 + ph * 8)}l-8 -12h16zM88 ${f1(20 + ph * 8)}l-8 -12h16z" opacity=".5"/></g></g>`;
}
function artKasus(t) {
  return `<g transform="translate(-6 4)"><g shape-rendering="crispEdges"><rect x="-44" y="-52" width="88" height="112" fill="#F4E2B8" stroke="${MC.ink}" stroke-width="4"/><rect x="-24" y="-60" width="48" height="16" fill="${MC.gold}" stroke="${MC.ink}" stroke-width="4"/><rect x="-30" y="-24" width="60" height="7" fill="#8B7F66"/><rect x="-30" y="-6" width="46" height="7" fill="#8B7F66"/><rect x="-30" y="12" width="56" height="7" fill="#8B7F66"/><rect x="-30" y="30" width="38" height="7" fill="#8B7F66"/></g></g><g transform="translate(46 ${f1(-22 + Math.sin(t * 3) * 4)})"><path d="M-30 -30h60v50h-24l-12 14v-14h-24z" fill="#FFFDF6" stroke="${MC.ink}" stroke-width="4" stroke-linejoin="round"/>${pxt(0, 12, '?', '#7F6BDC', 40, { sw: 8 })}</g>`;
}
const ART = { A: artAnatomi, F: artNapas, P: artKasus };
const LINES = { A: ['ANATOMI', 'PARU'], F: ['FISIOLOGI', 'NAPAS'], P: ['PENALARAN', 'KASUS'], BAB: ['SATU BAB', 'DULU'] };
/** kartu materi. kind: A | F | P | BAB. o: { rot, k, a, pop (0..1 sorotan judul), t, bab (0..1 ubah jadi kartu BAB) } */
export function card(kind, x, y, o = {}) {
  const { rot = 0, k = 1, a = 1, t = 0, bab = 0 } = o; if (a <= 0.005 || k <= 0.01) return '';
  const hue = bab > 0.5 ? HUE.BAB : HUE[kind], ln = bab > 0.5 ? LINES.BAB : LINES[kind], art = ART[kind === 'BAB' ? 'A' : kind];
  const w = CW, h = CH;
  let s = `<g transform="translate(${f1(x)} ${f1(y)}) rotate(${f1(rot)}) scale(${f1(k * 1000) / 1000})" opacity="${f1(a)}">`;
  s += pxBox(-w / 2 + 7, -h / 2 + 9, w, h, 'rgba(23,43,56,.28)', { sw: 0, n: 8 });
  s += pxBox(-w / 2, -h / 2, w, h, '#FFFDF6', { sw: 5, n: 8 });
  s += R(-w / 2 + 3, -h / 2 + 3, w - 6, 74, hue, 0, 'shape-rendering="crispEdges"') + R(-w / 2 + 3, -h / 2 + 71, w - 6, 6, MC.ink, 0, 'opacity=".18" shape-rendering="crispEdges"');
  s += pxt(0, -h / 2 + 34, ln[0], '#fff', ln[0].length > 8 ? 17 : 20, { stroke: false }) + pxt(0, -h / 2 + 62, ln[1], '#FFF3C4', 20, { stroke: false });
  s += `<g transform="translate(0 ${f1(h / 2 - 78)})">${art(t)}</g>`;
  if (bab > 0.5) s += R(-w / 2 + 14, h / 2 - 46, w - 28, 34, '#FFF3C4', 8, `stroke="${MC.ink}" stroke-width="3"`) + T(0, h / 2 - 22, 'Anatomi Paru &amp; Saluran Napas', MC.ink, 13, '', 'middle', 800);
  return s + '</g>';
}
/** lembar kasus (kertas): "KELUHAN UTAMA: PASIEN SESAK" */
export function sheet(x, y, o = {}) {
  const { rot = 0, k = 1, a = 1, t = 0, hl = 0 } = o; if (a <= 0.005) return '';
  const w = 190, h = 250;
  let s = `<g transform="translate(${f1(x)} ${f1(y)}) rotate(${f1(rot)}) scale(${f1(k * 1000) / 1000})" opacity="${f1(a)}">`;
  s += pxBox(-w / 2 + 7, -h / 2 + 9, w, h, 'rgba(23,43,56,.28)', { sw: 0, n: 8 }) + pxBox(-w / 2, -h / 2, w, h, '#FFFDF6', { sw: 5, n: 8 });
  s += R(-w / 2 + 3, -h / 2 + 3, w - 6, 40, MC.brand, 0, 'shape-rendering="crispEdges"') + pxt(0, -h / 2 + 30, 'LEMBAR KASUS', '#fff', 14, { stroke: false });
  s += T(-w / 2 + 16, -h / 2 + 70, 'KELUHAN UTAMA', '#7A6F58', 13, '', 'start', 800);
  s += `<g><rect x="${-w / 2 + 12}" y="${-h / 2 + 82}" width="${w - 24}" height="${74}" fill="${hl > 0 ? '#FFE9A8' : '#FFF6D6'}" stroke="${MC.ink}" stroke-width="3" shape-rendering="crispEdges"/>${pxt(0, -h / 2 + 116, 'PASIEN', '#D2473A', 22, { stroke: false })}${pxt(0, -h / 2 + 146, 'SESAK', '#D2473A', 22, { stroke: false })}</g>`;
  if (hl > 0) s += `<rect x="${-w / 2 + 16}" y="${-h / 2 + 154}" width="${(w - 32) * clamp(hl)}" height="6" fill="${MC.gold}" shape-rendering="crispEdges"/>`;
  s += `<g shape-rendering="crispEdges" fill="#CBBF9F">${R(-w / 2 + 16, -h / 2 + 178, 120, 7, '#CBBF9F')}${R(-w / 2 + 16, -h / 2 + 196, 140, 7, '#CBBF9F')}${R(-w / 2 + 16, -h / 2 + 214, 96, 7, '#CBBF9F')}</g>`;
  return s + '</g>';
}
const NOTE_C = ['#FFF1A8', '#BDE7D6', '#F9C9C4', '#CFE0FA'];
/** kertas catatan kecil (penambah kesan penuh) */
export function note(x, y, rot, i, a = 1, k = 1) {
  if (a <= 0.005) return '';
  return `<g transform="translate(${f1(x)} ${f1(y)}) rotate(${rot}) scale(${f1(k * 1000) / 1000})" opacity="${f1(a)}">${pxBox(-60, -44, 120, 88, NOTE_C[i % 4], { sw: 4, n: 5 })}${R(-44, -22, 76, 7, '#8B7F66', 0, 'opacity=".7"')}${R(-44, -6, 88, 7, '#8B7F66', 0, 'opacity=".7"')}${R(-44, 10, 52, 7, '#8B7F66', 0, 'opacity=".7"')}</g>`;
}
const TAB_T = [['Catatan Anatomi', '#1D7B75'], ['Slide Fisiologi', '#3F72D8'], ['Buku Kasus', '#7F6BDC'], ['Jurnal Napas', '#E59A3A']];
/** jendela/tab melayang. i = 0..3 */
export function tab(x, y, rot, i, a = 1, k = 1) {
  if (a <= 0.005) return '';
  const [title, hue] = TAB_T[i % 4];
  return `<g transform="translate(${f1(x)} ${f1(y)}) rotate(${rot}) scale(${f1(k * 1000) / 1000})" opacity="${f1(a)}">${pxBox(-124 + 6, -72 + 8, 248, 144, 'rgba(23,43,56,.25)', { sw: 0, n: 6 })}${pxBox(-124, -72, 248, 144, '#FFFDF6', { sw: 4, n: 6 })}${R(-121, -69, 242, 34, hue, 0, 'shape-rendering="crispEdges"')}${T(-108, -45, title, '#fff', 17, '', 'start', 800)}${R(96, -58, 14, 14, '#FFFDF6', 0, 'shape-rendering="crispEdges"')}${R(-104, -16, 150, 9, '#B9AE92')}${R(-104, 4, 196, 9, '#CFC5AB')}${R(-104, 24, 170, 9, '#CFC5AB')}${R(-104, 44, 110, 9, '#CFC5AB')}</g>`;
}

// ------------------------------------------------------------------ garis hubungan antar-kartu: putus-putus (belum tersambung) -> utuh (nyambung)
export function link(p1, p2, o = {}) {
  const { k = 0, a = 1, t = 0, lift = 80, id = 'l' } = o; if (a <= 0.005) return '';
  const mx = (p1[0] + p2[0]) / 2, my = Math.min(p1[1], p2[1]) - lift, d = `M${f1(p1[0])} ${f1(p1[1])}Q${f1(mx)} ${f1(my)} ${f1(p2[0])} ${f1(p2[1])}`;
  const qx = 0.25 * p1[0] + 0.5 * mx + 0.25 * p2[0], qy = 0.25 * p1[1] + 0.5 * my + 0.25 * p2[1];
  const dash = `${f1(14 + k * 160)} ${f1(Math.max(0, 12 * (1 - k)))}`;
  let s = `<g opacity="${f1(a)}">`;
  s += `<path d="${d}" fill="none" stroke="${MC.ink}" stroke-width="${f1(10 + 3 * k)}" stroke-linecap="round" stroke-dasharray="${dash}" opacity=".35"/>`;
  s += `<path d="${d}" fill="none" stroke="${k > 0.95 ? MC.brand : '#E8665F'}" stroke-width="${f1(8 + 3 * k)}" stroke-linecap="round" stroke-dasharray="${dash}"/>`;
  if (k < 0.5) s += `<g opacity="${f1(1 - k * 2)}" transform="translate(${f1(qx)} ${f1(qy + Math.sin(t * 4) * 3)})">${R(-32, -32, 64, 64, '#FFFDF6', 0, `stroke="${MC.ink}" stroke-width="5" shape-rendering="crispEdges"`)}${pxt(0, 16, '?', '#E8665F', 40, { sw: 8 })}</g>`;
  else s += `<g shape-rendering="crispEdges"><rect x="${f1(p1[0] - 9)}" y="${f1(p1[1] - 9)}" width="18" height="18" fill="${MC.gold}" stroke="${MC.ink}" stroke-width="4"/><rect x="${f1(p2[0] - 9)}" y="${f1(p2[1] - 9)}" width="18" height="18" fill="${MC.gold}" stroke="${MC.ink}" stroke-width="4"/>${[0, 1, 2].map((i) => { const u = ((t * 0.7 + i / 3) % 1), x = (1 - u) * (1 - u) * p1[0] + 2 * (1 - u) * u * mx + u * u * p2[0], y = (1 - u) * (1 - u) * p1[1] + 2 * (1 - u) * u * my + u * u * p2[1]; return `<rect x="${f1(x - 5)}" y="${f1(y - 5)}" width="10" height="10" fill="#FFF3C4" opacity="${f1(clamp(k * 2 - 1))}"/>`; }).join('')}</g>`;
  return s + '</g>';
}

/** buku catatan terbuka yang dipegang Raka (pose pegang_buku): pusat (x, y) di layar */
export function notebook(x, y, a = 1, bob = 0, k = 1) {
  if (a <= 0.01) return '';
  return `<g transform="translate(${f1(x)} ${f1(y + bob)}) scale(${f1(k)})" opacity="${f1(a)}">${pxBox(-84 + 5, -56 + 7, 168, 112, 'rgba(23,43,56,.25)', { sw: 0, n: 6 })}${pxBox(-84, -56, 168, 112, '#1D7B75', { sw: 5, n: 6 })}${R(-76, -48, 74, 96, '#FFFDF6')}${R(2, -48, 74, 96, '#FFFDF6')}${[-30, -14, 2, 18].map((yy) => R(-66, yy, 54, 6, '#B9AE92') + R(12, yy, 54, 6, '#B9AE92')).join('')}${R(-3, -48, 6, 96, '#8A5A34')}</g>`;
}
