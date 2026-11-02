// Dunia luar: ruang kelas ber-AC, tanda toilet, lorong; plus Raka berjaket (menggigil, memeluk jaket, berjalan).
import { C, clamp, lerp, ease, easeOut, easeInOut, backOut, seg, win, kf, r1, rnd, g, rect, circ, txt, poly } from './lib.js';
import { raka, rakaSvg, lerpState, idle, walkCycle } from '../../../brand/characters/raka/raka.js';

export const W = 1080, H = 1920;
export const FLOOR = 1190;       // garis lantai kelas
export const DESK_Y = 1130;      // permukaan meja Raka
const P = { wall: '#E9EFF2', wall2: '#D9E4EA', floor: '#B8C7CF', floor2: '#A9BAC3', board: '#F8FBFC', wood: '#B98B5E', woodD: '#9A6F46', ac: '#FFFFFF', cold: '#BDE6FF', coldD: '#7FC8F5' };

// ---------- keadaan Raka berjaket ----------
export const HUG = { armL: { wx: 246, wy: 496, ex: 134, ey: 520, finger: 0, fa: -90, front: 1 }, armR: { wx: 154, wy: 504, ex: 268, ey: 524, finger: 0, fa: -90, front: 1 } };
/** Raka menggigil: getar halus badan, gigi gemeletuk, alis khawatir. k = 0..1 kekuatan. */
export function shiver(st, t, k = 1) {
  const s = JSON.parse(JSON.stringify(st));
  s.bob += Math.sin(t * 58) * 2.2 * k; s.lean += Math.sin(t * 47 + 1) * 1.0 * k; s.tilt += Math.sin(t * 52) * 1.3 * k;
  const ch = (0.5 + 0.5 * Math.sin(t * 36)) * k;
  s.mouth = { w: 12, up: 3, lo: 3 + ch * 7 };
  return s;
}
export const jacketFx = (st) => st;

// ---------- ruang kelas ----------
/** AC dinding: unit putih dengan bilah; aliran udara dingin (garis lengkung biru muda + kristal salju) mengalir ke bawah. */
export function acUnit(x, y, t, power = 1) {
  let s = `<g transform="translate(${x} ${y})">`;
  s += rect(0, 0, 360, 96, P.ac, 22, 'stroke="#C9D8DF" stroke-width="4"') + rect(18, 62, 324, 14, '#CFE0E8', 7) + circ(318, 28, 7, '#62D0A8') + rect(30, 24, 120, 8, '#E4EEF3', 4);
  s += `<path d="M24 92Q180 ${r1(132 + 8 * Math.sin(t * 3))} 336 92" fill="#DDEBF2"/>`;
  s += '</g>';
  // aliran dingin
  for (let i = 0; i < 6; i++) {
    const u = ((t * 0.55 + i / 6) % 1), sx = x + 40 + i * 56, sy = y + 100;
    s += `<path d="M${r1(sx)} ${r1(sy + u * 90)}q${r1(14 * Math.sin(u * 9 + i))} 40 0 80t0 80" fill="none" stroke="${P.coldD}" stroke-width="7" stroke-linecap="round" opacity="${r1(0.55 * Math.sin(u * Math.PI) * power)}"/>`;
  }
  for (let i = 0; i < 7; i++) {
    const u = ((t * 0.4 + i * 0.37) % 1), fx = x + 20 + ((i * 97) % 330) + Math.sin(u * 6 + i) * 18, fy = y + 130 + u * 300;
    s += flake(fx, fy, 0.5 + 0.2 * (i % 3), t * 40 + i * 30, 0.8 * Math.sin(u * Math.PI) * power);
  }
  return s;
}
export function flake(x, y, s = 1, r = 0, o = 1, col = '#8ED3FF') {
  let p = '';
  for (let k = 0; k < 3; k++) p += `<path d="M0 -26V26" stroke="${col}" stroke-width="7" stroke-linecap="round" transform="rotate(${k * 60})"/>`;
  return g(p, { x, y, s, r, o });
}
/** Pintu toilet dengan plakat WC (pria/wanita sederhana). open 0..1 membuka pintu. */
export function toiletDoor(x, y, t, { glow = 0, open = 0 } = {}) {
  let s = `<g transform="translate(${x} ${y})">`;
  s += rect(-14, -14, 208, 560, '#8E9FA8', 10) + rect(0, 0, 180, 532, '#6FB4C9', 8);
  if (open > 0.01) s += poly([[0, 0], [180 * (1 - 0.62 * open), 18 * open], [180 * (1 - 0.62 * open), 520 - 18 * open], [0, 532]], '#4E96AD') + rect(0, 0, 180, 532, '#17323E', 8, `opacity="${r1(0.4 * open)}"`);
  s += rect(30, 76, 120, 120, '#fff', 20, 'stroke="#2A5667" stroke-width="5"');
  s += circ(66, 112, 11, '#2A5667') + rect(56, 126, 20, 44, '#2A5667', 6) + circ(116, 112, 11, '#2A5667') + `<path d="M104 126h24l8 44h-40z" fill="#2A5667"/>`;
  s += txt('WC', 90, 236, { size: 48, fill: '#fff', ls: 4 });
  s += circ(150, 300, 10, '#F8C038');
  if (glow > 0.02) s += rect(-20, -20, 220, 580, '#FFE9A8', 12, `opacity="${r1(0.35 * glow * (0.6 + 0.4 * Math.sin(t * 8)))}"`);
  return s + '</g>';
}
/** Ruang kelas: dinding, papan dengan slide, AC, lantai. cold 0..1 menebalkan nuansa dingin. */
export function classroom(t, { cold = 1, door = 0, slide = true } = {}) {
  let s = rect(0, 0, W, FLOOR + 30, P.wall) + rect(0, 700, W, 500, P.wall2) + rect(0, 694, W, 8, 'rgba(0,0,0,.05)');
  // jendela samar
  s += rect(660, 520, 230, 160, '#DDEFFA', 12) + rect(670, 530, 210, 140, '#BFE3F5', 8) + rect(770, 530, 10, 140, '#DDEFFA');
  // papan + slide anatomi sederhana
  if (slide) {
    s += rect(60, 330, 520, 380, '#fff', 18, 'stroke="#C9D8DF" stroke-width="6"') + rect(80, 350, 480, 340, '#F2F8FA', 10);
    s += txt('FISIOLOGI', 320, 410, { size: 44, fill: '#0A3830', ls: 4 }) + circ(250, 540, 62, '#F4C9A4') + rect(210, 600, 80, 70, '#F4C9A4', 20) + `<path d="M430 470q-40 40 0 80q40 -40 0 -80z" fill="#B4535C"/><path d="M500 470q40 40 0 80q-40 -40 0 -80z" fill="#B4535C"/>`;
    s += rect(330, 580, 200, 10, '#B8C9D2', 5) + rect(330, 610, 150, 10, '#B8C9D2', 5);
  }
  s += acUnit(640, 300, t, cold);
  // lantai
  s += rect(0, FLOOR, W, 800, P.floor) + rect(0, FLOOR - 8, W, 16, '#9FB1BB');
  for (let i = 0; i < 6; i++) s += rect(0, FLOOR + 60 + i * 80, W, 4, P.floor2, 0, 'opacity=".7"');
  s += toiletDoor(890, 650, t, { glow: door });
  // tint dingin
  s += rect(0, 0, W, 1920, '#6FC3F0', 0, `opacity="${r1(0.1 * cold * 100) / 100}"`);
  return s;
}
/** Meja mahasiswa (tampak depan) dengan Raka di baliknya; x = tengah badan. */
export function studentDesk(x) {
  return rect(x - 270, DESK_Y, 540, 40, P.wood, 12) + rect(x - 250, DESK_Y + 40, 500, 210, P.woodD, 10) + rect(x - 250, DESK_Y + 40, 500, 12, 'rgba(0,0,0,.12)');
}
export function rakaSeat(st, x, { s = 1.3, uid = 'rk', dx = 0 } = {}) {
  return `<g transform="translate(${r1(x + dx - 200 * s)} ${r1(DESK_Y - 580 * s)}) scale(${s})">${rakaSvg(st, { bare: true, shadow: false, uid, outfit: 'jaket' })}</g>`;
}
/** Lorong menuju toilet (tampak samping) untuk adegan penutup. */
export function hallway(t, { door = 0, open = 0 } = {}) {
  let s = rect(0, 0, W, 1200, '#EEF3F5') + rect(0, 230, W, 14, '#D6E1E7') + rect(0, 1170, W, 800, '#B8C7CF') + rect(0, 1160, W, 14, '#9FB1BB');
  for (let i = 0; i < 4; i++) s += rect(40 + i * 280, 360, 200, 260, '#DDEFFA', 14) + rect(52 + i * 280, 372, 176, 236, '#BFE3F5', 8);
  for (let i = 0; i < 5; i++) s += rect(0, 1230 + i * 70, W, 4, '#A9BAC3', 0, 'opacity=".7"');
  s += toiletDoor(790, 600, t, { glow: door, open });
  return s;
}
