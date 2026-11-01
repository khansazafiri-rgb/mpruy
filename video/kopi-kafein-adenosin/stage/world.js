// Dunia luar: kamar belajar Raka (malam), meja, laptop, tempat tidur, cangkir kopi, dan ikon kecil.
import { C, clamp, lerp, ease, easeOut, backOut, seg, win, kf, r1, rnd, g, rect, circ, txt, poly } from './lib.js';
import { raka, rakaSvg, lerpState, idle } from '../../../brand/characters/raka/raka.js';

export const W = 1080, H = 1920, DESK_Y = 1130;
export const RK = { x: 540, s: 1.3 };            // Raka duduk di balik meja: pinggang (y = 580 di koordinat Raka) tepat di tepi meja
export const rkOrigin = () => ({ x: RK.x - 200 * RK.s, y: DESK_Y - 580 * RK.s });

/** Raka duduk di balik meja. st = keadaan; uid unik. */
export function rakaDesk(st, { x = RK.x, s = RK.s, uid = 'rk', dy = 0 } = {}) {
  return `<g transform="translate(${r1(x - 200 * s)} ${r1(DESK_Y + dy - 580 * s)}) scale(${s})">${rakaSvg(st, { bare: true, shadow: false, uid })}</g>`;
}

const P = { wall: '#1E3247', wall2: '#243A52', floor: '#16222E', wood: '#8A6240', woodD: '#69472C', lamp: '#F6C770', bed: '#5C78B8', bedD: '#46609E', blanket: '#7E9BD6' };

/** Kamar malam. lamp 0..1 (kecerahan lampu meja), time = jam digital, dim 0..1 menggelapkan seluruh kamar. */
export function room(t, { lamp = 1, time = '23:10', dim = 0, bedFocus = 0, curtain = 0 } = {}) {
  let s = rect(0, 0, W, DESK_Y + 20, P.wall) + rect(0, 760, W, 400, P.wall2) + rect(0, 756, W, 8, 'rgba(255,255,255,.05)');
  // jendela berbulan + bintang
  s += rect(70, 330, 290, 400, '#0F1E2C', 26) + rect(90, 350, 250, 360, '#15304A', 16) + circ(270, 450, 42, '#F4EBD8') + circ(288, 436, 36, '#15304A');
  for (let i = 0; i < 8; i++) s += circ(110 + rnd(i) * 210, 380 + rnd(i + 5) * 300, 2.5 + rnd(i + 2) * 3, '#fff', `opacity="${r1(0.35 + 0.4 * Math.sin(t * 2 + i))}"`);
  s += rect(205, 330, 8, 400, '#0F1E2C') + rect(70, 520, 290, 8, '#0F1E2C');
  // jam digital
  s += g(rect(0, 0, 250, 112, '#101B25', 22) + txt(time, 125, 82, { size: 74, fill: C.gold, weight: 800, ls: 3 }), { x: 720, y: 460 });
  // rak buku
  s += rect(690, 700, 300, 14, P.woodD, 4);
  const cols = ['#E8665F', '#F8C038', '#9DE0BD', '#6BA3C4', '#E8665F', '#F4EBD8'];
  for (let i = 0; i < 6; i++) s += rect(706 + i * 42, 700 - 90 - (i % 3) * 14, 34, 90 + (i % 3) * 14, cols[i], 5);
  // tempat tidur di sudut kanan (di balik meja); digambar terbalik dari sisi kiri
  s += `<g transform="translate(${W} 0) scale(-1 1)">`
    + rect(-30, 900, 470, 240, P.bedD, 18) + rect(-30, 860, 130, 280, '#3A4F82', 18)
    + rect(10, 872, 270, 70, '#EAF0FA', 30) + rect(-10, 930, 460, 160, P.blanket, 24) + rect(-10, 930, 460, 36, '#9DB5E8', 18)
    + `<path d="M120 1000Q220 970 320 1000M110 1040Q220 1010 330 1040" stroke="#6F8CC8" stroke-width="10" fill="none" stroke-linecap="round" opacity=".7"/></g>`;
  if (bedFocus > 0.02) s += `<ellipse cx="880" cy="960" rx="${r1(250 + 30 * bedFocus)}" ry="${r1(150 + 20 * bedFocus)}" fill="#FFE9B0" opacity="${r1(0.16 * bedFocus)}"/>`;
  // lampu meja di sisi kiri meja, kerucut cahaya
  if (lamp > 0.02) s += `<polygon points="120,880 -40,${DESK_Y} 560,${DESK_Y}" fill="${P.lamp}" opacity="${r1(0.12 * lamp * 100) / 100}"/>`;
  s += `<g transform="translate(70 ${DESK_Y})"><path d="M0 -10L40 -300" stroke="#2A3446" stroke-width="12" stroke-linecap="round"/><path d="M40 -300L10 -480" stroke="#2A3446" stroke-width="12" stroke-linecap="round"/>`
    + `<path d="M-48 -480q50 -44 112 0l-14 46h-84z" fill="#2A3446"/><ellipse cx="8" cy="-434" rx="52" ry="12" fill="${lamp > 0.4 ? P.lamp : '#3C4660'}"/></g>`;
  if (dim > 0.01) s += rect(0, 0, W, DESK_Y + 20, '#070E1A', 0, `opacity="${r1(dim * 0.5 * 100) / 100}"`);
  return s;
}
export function deskFront(t = 0) {
  const y = DESK_Y;
  let s = rect(0, y, W, 56, P.wood) + rect(0, y + 56, W, H - y - 56, P.woodD) + rect(0, y + 44, W, 12, 'rgba(0,0,0,.14)');
  for (let i = 0; i < 6; i++) s += rect(0, y + 130 + i * 84, W, 5, 'rgba(0,0,0,.07)') + rect(((i * 337) % 900), y + 100 + i * 84, 220 + (i % 3) * 90, 4, 'rgba(255,255,255,.06)', 2);
  return s;
}
/** Cangkir di meja (tidak dipegang). */
export function mugOnDesk(x, t, steam = 1) {
  let st = '';
  for (let i = 0; i < 2; i++) st += `<path d="M${30 + i * 26} -8q-12 -22 0 -44t0 -44" fill="none" stroke="#fff" stroke-width="7" stroke-linecap="round" opacity="${r1(0.35 * steam)}" transform="translate(0 ${r1(Math.sin(t * 2 + i) * 4)})"/>`;
  return `<g transform="translate(${r1(x)} ${DESK_Y - 94})">${st}${rect(0, 0, 92, 84, '#F4EBD8', 14)}<path d="M92 18q34 0 34 26t-34 26" fill="none" stroke="#F4EBD8" stroke-width="12"/>${rect(8, 8, 76, 14, '#6B4A33', 7)}${rect(0, 40, 92, 10, '#1D7B75')}</g>`;
}
/** Laptop menghadap penonton: layar dengan daftar tugas; open 0..1 (1 = terbuka, 0 = tertutup). */
export function laptopTasks(x, t, open = 1, checks = 0) {
  const w = 330, h = 220, y = DESK_Y - h - 22;
  let s = `<g transform="translate(${x} ${y})">`;
  if (open > 0.03) {
    s += `<g transform="translate(0 ${h}) scale(1 ${r1(open * 1000) / 1000}) translate(0 ${-h})">` + rect(0, 0, w, h, '#2A3446', 20) + rect(12, 12, w - 24, h - 24, '#EAF6EE', 10);
    s += txt('TUGAS MALAM INI', w / 2, 52, { size: 24, fill: '#0A3830', ls: 2 });
    for (let i = 0; i < 4; i++) s += rect(40, 74 + i * 30, 22, 22, '#fff', 5, 'stroke="#7A8F88" stroke-width="3"') + rect(78, 80 + i * 30, 150 + (i % 2) * 50, 10, '#9AB3AB', 5);
    s += '</g>';
  }
  s += rect(-30, h, w + 60, 22, '#3A455B', 11) + `</g>`;
  if (open > 0.1) s += `<ellipse cx="${x + w / 2}" cy="${y + h / 2}" rx="${w * 0.7}" ry="${h * 0.7}" fill="#9DE0BD" opacity="${r1(0.08 * open * 100) / 100}"/>`;
  return s;
}
export function bookPile(x) {
  const cols = ['#E8665F', '#F8C038', '#6BA3C4', '#9DE0BD'];
  let s = '';
  for (let i = 0; i < 4; i++) s += rect(x + (rnd(i + 3) - 0.5) * 20, DESK_Y - (i + 1) * 34, 230 - i * 14, 32, cols[i], 8);
  return s;
}

// ---------- ikon ----------
export const ICON = {
  bed: (x, y, s = 1, o = 1) => g(rect(-90, 10, 180, 40, '#7E9BD6', 12) + rect(-98, -40, 20, 90, '#46609E', 8) + rect(-84, -22, 60, 28, '#EAF0FA', 14) + rect(-98, 50, 14, 24, '#46609E') + rect(84, 50, 14, 24, '#46609E'), { x, y, s, o }),
  cup: (x, y, s = 1, o = 1) => g(rect(-46, -42, 92, 84, '#F4EBD8', 14) + `<path d="M46 -22q34 0 34 26t-34 26" fill="none" stroke="#F4EBD8" stroke-width="12"/>` + rect(-38, -34, 76, 14, '#6B4A33', 7) + rect(-46, -4, 92, 10, '#1D7B75'), { x, y, s, o }),
  qmark: (x, y, s = 1, o = 1, col = '#E8665F') => g(txt('?', 0, 0, { size: 130, fill: col }), { x, y, s, o }),
  person: (x, y, r, fill) => circ(x, y - r * 0.55, r * 0.42, fill) + `<path d="M${r1(x - r * 0.6)} ${r1(y + r * 0.8)}Q${r1(x)} ${r1(y - r * 0.2)} ${r1(x + r * 0.6)} ${r1(y + r * 0.8)}Z" fill="${fill}"/>`,
  check: (x, y, s = 1, o = 1) => g(circ(0, 0, 30, '#00A383') + `<path d="M-13 0l9 10 19 -22" fill="none" stroke="#fff" stroke-width="8" stroke-linecap="round" stroke-linejoin="round"/>`, { x, y, s, o }),
  cross: (x, y, s = 1, o = 1) => g(circ(0, 0, 30, '#E8665F') + `<path d="M-12 -12l24 24M12 -12l-24 24" stroke="#fff" stroke-width="8" stroke-linecap="round"/>`, { x, y, s, o }),
  capsule: (x, y, s, left, right, r = 0) => g(`<path d="M-44 -22h44v44h-44a22 22 0 0 1 0-44z" fill="${left}"/><path d="M0 -22h44a22 22 0 0 1 0 44h-44z" fill="${right}"/>`, { x, y, s, r }),
};
