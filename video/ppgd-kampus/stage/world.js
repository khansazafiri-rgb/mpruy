// Dunia pixel koridor kampus (kode SVG). Semua dari kotak berukuran kelipatan 12 px; setelah itu seluruh lapisan dunia dipikselkan (stage.js).
import { f1, clamp } from './core.js';
const R = (x, y, w, h, f, e = '') => `<rect x="${f1(x)}" y="${f1(y)}" width="${f1(w)}" height="${f1(h)}" fill="${f}" ${e}/>`;
export const FLOOR_Y = 1236;            // garis lantai tempat kaki berdiri
const C = { wall: '#C9DEDA', wallDk: '#A9CBC6', band: '#2E6F73', ceil: '#27484F', lamp: '#FFF6D2', door: '#6C7E8F', doorDk: '#566878', glass: '#9FD3E6', floorA: '#E8E1D1', floorB: '#D6CDB9', base: '#F5F1E6', board: '#C9A56B', wood: '#9C7448' };
function lamp(x, t) { const fl = 1 + 0.02 * Math.sin(t * 7 + x); return `${R(x - 120, 120, 240, 24, '#3B5C63')}${R(x - 108, 144, 216, 18, C.lamp)}<path d="M${x - 108} 162L${x + 108} 162L${x + 260} 560L${x - 260} 560Z" fill="rgba(255,246,210,${f1(0.10 * fl)})"/>`; }
function door(x, w, side) {
  let s = R(x, 252, w, 984, C.doorDk) + R(x + 12, 264, w - 24, 960, C.door) + R(x + 36, 300, w - 72, 360, C.glass) + R(x + 36, 300, w - 72, 12, 'rgba(255,255,255,.55)') + R(x + 60, 330, 36, 300, 'rgba(255,255,255,.28)');
  s += R(x + 36, 684, w - 72, 24, C.doorDk) + R(side === 'L' ? x + w - 64 : x + 36, 880, 28, 84, '#D9D0B8') + R(x + 24, 744, w - 48, 12, C.doorDk);
  return s;
}
function board(x, y) {
  let s = R(x, y, 372, 264, C.wood) + R(x + 12, y + 12, 348, 240, C.board);
  const paper = [['#FFFFFF', 24, 30, 96, 120], ['#FBE7A6', 144, 24, 84, 96], ['#CFE8F6', 252, 36, 84, 108], ['#F6C9C0', 36, 160, 108, 72], ['#E9F3D2', 168, 140, 96, 96], ['#FFFFFF', 288, 168, 60, 72]];
  paper.forEach(([c, dx, dy, w, h], i) => { s += R(x + 12 + dx, y + 12 + dy, w, h, c) + R(x + 12 + dx + w / 2 - 6, y + 12 + dy + 6, 12, 12, '#D9534F'); for (let k = 0; k < Math.floor((h - 36) / 24); k++) s += R(x + 12 + dx + 12, y + 12 + dy + 30 + k * 24, w - 24 - (k % 2) * 24, 8, '#B6C4C8'); });
  return s;
}
function windowBig(x, y, w, h) {
  let s = R(x, y, w, h, '#F5F1E6') + R(x + 12, y + 12, w - 24, h - 24, '#8CCBEA') + R(x + 12, y + h * 0.58, w - 24, h * 0.42 - 12, '#63B07A') + R(x + 12, y + h * 0.58, w - 24, 12, '#4B9763');
  s += R(x + 60, y + 36, 96, 24, '#FFFFFF') + R(x + 84, y + 24, 72, 24, '#FFFFFF') + R(x + w - 200, y + 72, 120, 24, '#FFFFFF');
  s += R(x + w / 2 - 6, y + 12, 12, h - 24, '#F5F1E6') + R(x + 12, y + h * 0.5 - 6, w - 24, 12, '#F5F1E6');
  return s;
}
function aedSign(x, y) { return R(x, y, 156, 156, '#1F8F5F') + R(x + 8, y + 8, 140, 140, '#2FB07A') + `<path d="M${x + 78} ${y + 116}L${x + 36} ${y + 72}C${x + 20} ${y + 52} ${x + 44} ${y + 28} ${x + 62} ${y + 40}C${x + 70} ${y + 46} ${x + 76} ${y + 54} ${x + 78} ${y + 58}C${x + 80} ${y + 54} ${x + 86} ${y + 46} ${x + 94} ${y + 40}C${x + 112} ${y + 28} ${x + 136} ${y + 52} ${x + 120} ${y + 72}Z" fill="#FFFFFF"/><path d="M${x + 84} ${y + 50}L${x + 66} ${y + 88}L${x + 80} ${y + 88}L${x + 72} ${y + 118}L${x + 98} ${y + 76}L${x + 83} ${y + 76}Z" fill="#F8C038"/>`; }
/** koridor kampus; satu lapisan datar (tampak samping) */
export function corridor(t = 0) {
  let s = R(0, 0, 1080, 1920, C.wall);
  s += R(0, 0, 1080, 168, C.ceil) + R(0, 168, 1080, 12, '#3C5E66');
  s += R(0, 1008, 1080, 228, C.wallDk) + R(0, 1008, 1080, 12, '#8DB5B0') + R(0, 1224, 1080, 12, C.base);       // dinding bawah + plint
  s += R(0, 520, 1080, 24, C.band) + R(0, 544, 1080, 12, '#4B9296');                                           // garis dekor
  s += windowBig(396, 252, 300, 330) + board(24, 600) + aedSign(900, 600);
  s += door(24, 252, 'L') + door(804, 252, 'R');
  s += R(600, 660, 144, 264, '#D8433B') + R(612, 672, 120, 240, '#E9645C') + R(660, 700, 24, 120, '#2B2B2B');                     // apar
  s += lamp(210, t) + lamp(540, t) + lamp(870, t);
  // lantai berpetak
  s += R(0, 1236, 1080, 684, C.floorA);
  for (let r = 0, y = 1236; y < 1920; r++, y += 72) for (let x = (r % 2) * 72 - 72; x < 1080; x += 144) s += R(x, y, 72, 72, C.floorB);
  s += R(0, 1236, 1080, 12, '#B8AF99') + R(0, 1248, 1080, 36, 'rgba(60,40,20,.10)');
  return s;
}
// ---------------------------------------------------------------- benda kecil
export function pxShadow(x, y, w) { return `<ellipse cx="${f1(x)}" cy="${f1(y)}" rx="${f1(w / 2)}" ry="${f1(w / 14)}" fill="rgba(30,30,40,.22)"/>`; }
/** AED: kotak putih bergagang, ikon jantung + petir, lampu status; on 0..1 (menyala), pulse = kedip tombol */
export function aed(x, y, s = 1, on = 0, t = 0) {
  const blink = on > 0.5 ? (Math.floor(t * 2.6) % 2 ? 1 : 0.3) : 0, lamp = on > 0.5 ? '#42E58C' : '#7A8892';
  return `<g transform="translate(${f1(x)} ${f1(y)}) scale(${s})">`
    + R(-26, -190, 52, 26, '#2A3A44') + R(-12, -204, 24, 26, '#2A3A44')                                                 // gagang
    + R(-110, -168, 220, 168, '#2A3A44') + R(-98, -156, 196, 156, '#F4F6F5') + R(-98, -156, 196, 24, '#2FB07A')
    + `<path d="M0 -50L-30 -84C-42 -100 -24 -118 -10 -110C-4 -106 -1 -100 0 -97C1 -100 4 -106 10 -110C24 -118 42 -100 30 -84Z" fill="#E8665F"/><path d="M6 -112L-8 -82L2 -82L-4 -58L14 -90L4 -90Z" fill="#F8C038"/>`
    + R(-84, -28, 40, 20, '#DFE5E3') + R(-30, -26, 24, 16, lamp, `opacity="${f1(0.4 + 0.6 * blink)}"`) + R(8, -28, 76, 20, '#DFE5E3')
    + R(-70, -148, 12, 12, lamp, `opacity="${f1(0.35 + 0.65 * blink)}"`) + `</g>`;
}
export function padIcon(x, y, w = 96, h = 72, a = 1) { return `<g opacity="${f1(a)}">${R(x - w / 2, y - h / 2, w, h, '#2A3A44')}${R(x - w / 2 + 6, y - h / 2 + 6, w - 12, h - 12, '#FF8A7A')}${R(x - 6, y - 14, 12, 28, '#FFFFFF')}${R(x - 14, y - 6, 28, 12, '#FFFFFF')}</g>`; }
export function phone(x, y, s = 1, tilt = 0, glow = 1) {
  return `<g transform="translate(${f1(x)} ${f1(y)}) rotate(${tilt}) scale(${s})">${R(-30, -54, 60, 108, '#1C2630')}${R(-24, -46, 48, 84, glow > 0.5 ? '#4FD6A2' : '#2B3A46')}${R(-8, 42, 16, 6, '#5B6B78')}<path d="M-12 -24Q-14 -10 0 4Q10 14 18 8L12 -2L6 2Q-2 -4 -4 -12L2 -16L-4 -26Z" fill="#fff"/></g>`;
}
/** kepulan debu pixel saat jatuh (u 0..1) */
export function dust(x, y, u) {
  if (u <= 0 || u >= 1) return ''; let s = ''; const a = 1 - u;
  for (let i = 0; i < 9; i++) { const dir = i % 2 ? 1 : -1, d = (30 + i * 22) * (0.4 + u), sz = 24 + (i % 3) * 12; s += R(Math.round((x + dir * d) / 12) * 12, Math.round((y - 12 - u * (30 + i * 5)) / 12) * 12, sz, sz, `rgba(246,240,225,${f1(0.85 * a)})`); }
  return s;
}
export const PX = "'Press Start 2P', 'DejaVu Sans Mono', monospace";
