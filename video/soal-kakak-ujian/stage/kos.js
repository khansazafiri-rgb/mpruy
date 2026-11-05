// Dunia luar: kamar kos (malam dan siang), buku atlas, ruang praktikum anatomi (sopan, tanpa detail), label nama yang beterbangan.
import { C, clamp, lerp, ease, easeOut, easeInOut, backOut, seg, win, kf, r1, rnd, g, rect, circ, txt, poly } from './lib.js';
import { raka, rakaSvg, lerpState, idle } from '../../../brand/characters/raka/raka.js';

export const W = 1080, H = 1920, DESK_Y = 1130, FLOOR = 1200;
export const RK = { x: 540, s: 1.3 };
const P = { wall: '#1E3247', wall2: '#243A52', wood: '#8A6240', woodD: '#69472C', lamp: '#F6C770', blanket: '#7E9BD6', bedD: '#46609E' };
const mixHex = (a, b, k) => { const A = [1, 3, 5].map((i) => parseInt(a.slice(i, i + 2), 16)), B = [1, 3, 5].map((i) => parseInt(b.slice(i, i + 2), 16)); return '#' + A.map((v, i) => Math.round(lerp(v, B[i], clamp(k, 0, 1))).toString(16).padStart(2, '0')).join(''); };

/** Raka duduk di balik meja (pinggang tepat di tepi meja). */
export function rakaDesk(st, { x = RK.x, s = RK.s, uid = 'rk', outfit = 'harian', dy = 0 } = {}) {
  return `<g transform="translate(${r1(x - 200 * s)} ${r1(DESK_Y + dy - 580 * s)}) scale(${s})">${rakaSvg(st, { bare: true, shadow: false, uid, outfit })}</g>`;
}
/** Raka berdiri: kaki di lantai y = floorY, tengah badan di x. */
export function rakaStand(st, { x = 300, floorY = 1200, s = 1, uid = 'rs', outfit = 'harian' } = {}) {
  return `<g transform="translate(${r1(x - 200 * s)} ${r1(floorY - 778 * s)}) scale(${s})">${rakaSvg(st, { bare: true, shadow: true, uid, outfit })}</g>`;
}

// ---------- kamar kos ----------
const note = (x, y, col, r, seed) => g(rect(0, 0, 118, 118, col, 6) + [0, 1, 2, 3].map((i) => rect(14, 20 + i * 24, 60 + rnd(seed + i) * 30, 7, 'rgba(23,43,56,.45)', 3)).join(''), { x, y, r });
/** Kamar kos. day 0 = malam, 1 = siang. time = jam digital. */
export function kos(t, { day = 0, time = '01:40', lamp = 1 } = {}) {
  const wall = mixHex('#1E3247', '#F4E6CB', day), wall2 = mixHex('#243A52', '#EBDAB8', day), sky = mixHex('#15304A', '#BFE3F5', day);
  let s = rect(0, 0, W, DESK_Y + 20, wall) + rect(0, 760, W, 400, wall2) + rect(0, 756, W, 8, 'rgba(0,0,0,.05)');
  // jendela
  s += rect(70, 330, 290, 400, mixHex('#0F1E2C', '#FFFFFF', day), 26) + rect(90, 350, 250, 360, sky, 16);
  if (day < 0.5) { s += circ(270, 450, 42, '#F4EBD8') + circ(288, 436, 36, sky); for (let i = 0; i < 8; i++) s += circ(110 + rnd(i) * 210, 380 + rnd(i + 5) * 300, 2.5 + rnd(i + 2) * 3, '#fff', `opacity="${r1(0.35 + 0.4 * Math.sin(t * 2 + i))}"`); }
  else s += circ(260, 450, 46, '#FFE08A') + circ(260, 450, 80, '#FFE08A', 'opacity=".25"');
  s += rect(205, 330, 8, 400, mixHex('#0F1E2C', '#FFFFFF', day)) + rect(70, 520, 290, 8, mixHex('#0F1E2C', '#FFFFFF', day));
  // papan catatan tempel (nama-nama yang dihafal)
  s += rect(690, 250, 320, 220, '#B58A5A', 14) + rect(700, 260, 300, 200, '#D9B98A', 8);
  [[716, 274, '#F8C038', -6, 1], [830, 270, '#9DE0BD', 5, 2], [760, 360, '#F29B8A', 3, 3], [880, 352, '#8EC7F0', -4, 4]].forEach(([x, y, col, r, sd]) => { s += note(x, y, col, r, sd).replace('scale', 'scale'); });
  // jam digital
  s += g(rect(0, 0, 250, 112, '#101B25', 22) + txt(time, 125, 82, { size: 74, fill: C.gold, weight: 800, ls: 3 }), { x: 720, y: 500 });
  // tempat tidur di kanan (di balik meja)
  s += `<g transform="translate(${W} 0) scale(-1 1)">` + rect(-30, 960, 470, 200, P.bedD, 18) + rect(-30, 920, 130, 240, '#3A4F82', 18) + rect(10, 932, 270, 66, '#EAF0FA', 30) + rect(-10, 990, 460, 140, P.blanket, 24) + '</g>';
  // lampu meja di kiri
  if (lamp > 0.02) s += `<polygon points="120,880 -40,${DESK_Y} 560,${DESK_Y}" fill="${P.lamp}" opacity="${r1(0.12 * lamp * (1 - day * 0.8) * 100) / 100}"/>`;
  s += `<g transform="translate(70 ${DESK_Y})"><path d="M0 -10L40 -300" stroke="#2A3446" stroke-width="12" stroke-linecap="round"/><path d="M40 -300L10 -480" stroke="#2A3446" stroke-width="12" stroke-linecap="round"/><path d="M-48 -480q50 -44 112 0l-14 46h-84z" fill="#2A3446"/><ellipse cx="8" cy="-434" rx="52" ry="12" fill="${lamp > 0.4 ? P.lamp : '#3C4660'}"/></g>`;
  return s;
}
export function deskFront() {
  const y = DESK_Y;
  let s = rect(0, y, W, 56, P.wood) + rect(0, y + 56, W, H - y - 56, P.woodD) + rect(0, y + 44, W, 12, 'rgba(0,0,0,.14)');
  for (let i = 0; i < 6; i++) s += rect(0, y + 130 + i * 84, W, 5, 'rgba(0,0,0,.07)') + rect(((i * 337) % 900), y + 100 + i * 84, 220 + (i % 3) * 90, 4, 'rgba(255,255,255,.06)', 2);
  return s;
}
/** Atlas anatomi terbuka di meja: halaman kiri rangka, kanan otot, penanda warna. */
export function atlasBook(cx, t, { tilt = 0 } = {}) {
  const w = 520, h = 170;
  let s = rect(-w / 2 - 12, -26, w + 24, h + 30, '#6B4A33', 16) + rect(-w / 2, -14, w / 2 - 4, h, '#FFFDF6', 10) + rect(6, -14, w / 2 - 4, h, '#F7F1E0', 10) + rect(-3, -14, 6, h, '#D9CFB4');
  // halaman kiri: rangka sederhana
  s += circ(-w / 4, 24, 20, '#EFE3C8') + rect(-w / 4 - 4, 42, 8, 70, '#EFE3C8', 4) + [0, 1, 2].map((i) => `<path d="M${-w / 4 - 8} ${58 + i * 16}q-26 4 -34 18M${-w / 4 + 8} ${58 + i * 16}q26 4 34 18" stroke="#EFE3C8" stroke-width="7" fill="none" stroke-linecap="round"/>`).join('') + rect(-w / 4 - 30, 112, 60, 8, '#EFE3C8', 4);
  // halaman kanan: otot
  s += circ(w / 4, 26, 18, '#E89A8A') + rect(w / 4 - 30, 44, 60, 74, '#D9604F', 22) + rect(w / 4 - 44, 48, 20, 60, '#D9604F', 10) + rect(w / 4 + 24, 48, 20, 60, '#D9604F', 10);
  s += `<path d="M${w / 4 - 20} 56V110M${w / 4} 52V114M${w / 4 + 20} 56V110" stroke="#F0A89B" stroke-width="4"/>`;
  s += rect(-w / 2 + 20, 130, 90, 8, 'rgba(248,192,56,.9)', 3) + rect(w / 2 - 120, 134, 100, 6, '#B8B2A0', 3);
  // penanda halaman
  s += rect(w / 2 - 8, 20, 22, 60, '#E8665F', 4) + rect(w / 2 - 8, 90, 22, 40, '#6BA3C4', 4);
  return g(s, { x: cx, y: DESK_Y - 150, r: tilt });
}
export function mugOnDesk(x, t) {
  let st = '';
  for (let i = 0; i < 2; i++) st += `<path d="M${30 + i * 26} -8q-12 -22 0 -44t0 -44" fill="none" stroke="#fff" stroke-width="7" stroke-linecap="round" opacity=".3" transform="translate(0 ${r1(Math.sin(t * 2 + i) * 4)})"/>`;
  return `<g transform="translate(${r1(x)} ${DESK_Y - 94})">${st}${rect(0, 0, 92, 84, '#F4EBD8', 14)}<path d="M92 18q34 0 34 26t-34 26" fill="none" stroke="#F4EBD8" stroke-width="12"/>${rect(8, 8, 76, 14, '#6B4A33', 7)}${rect(0, 40, 92, 10, '#1D7B75')}</g>`;
}
/** Laptop menghadap penonton; screen = SVG isi layar (opsional). */
export function laptopQuiz(x, screenImg) {
  const w = 330, h = 220, y = DESK_Y - h - 22;
  return `<g transform="translate(${x} ${y})">` + rect(0, 0, w, h, '#2A3446', 20) + rect(12, 12, w - 24, h - 24, '#EAF6EE', 10) + (screenImg || '') + rect(-30, h, w + 60, 22, '#3A455B', 11) + '</g>';
}

// ---------- ruang praktikum (sopan: meja bersarung kain putih, tanpa detail) ----------
export function lab(t, { cold = 0 } = {}) {
  let s = rect(0, 0, W, H, '#DDEBF0') + rect(0, 330, W, 12, '#C4D6DD');
  // ubin dinding
  for (let r = 0; r < 6; r++) for (let c = 0; c < 9; c++) s += rect(c * 124 + (r % 2) * 62 - 62, 342 + r * 90, 120, 86, r % 2 ? '#E8F2F5' : '#EDF5F8', 6);
  // papan nama struktur kosong dan lemari berisi model tengkorak
  s += rect(700, 410, 300, 230, '#F8FBFC', 14, 'stroke="#B9CCD4" stroke-width="6"') + circ(850, 500, 56, '#EDE3CF') + rect(822, 548, 56, 40, '#EDE3CF', 8) + circ(832, 494, 10, '#4A4036') + circ(870, 494, 10, '#4A4036') + rect(840, 536, 20, 16, '#4A4036', 4);
  s += rect(60, 400, 220, 250, '#C6D7DE', 10) + rect(74, 414, 192, 108, '#E8F2F5', 6) + rect(74, 534, 192, 100, '#E8F2F5', 6);
  // lampu gantung
  for (const x of [250, 760]) s += rect(x - 4, 0, 8, 150, '#9FB2BF') + `<path d="M${x - 90} 190Q${x} 120 ${x + 90} 190Z" fill="#F4F8FA"/><ellipse cx="${x}" cy="196" rx="86" ry="12" fill="#FFFBE6" opacity=".9"/>`;
  // lantai
  s += rect(0, FLOOR, W, 800, '#B8C7CF') + rect(0, FLOOR - 8, W, 16, '#9FB1BB');
  for (let i = 0; i < 6; i++) s += rect(0, FLOOR + 60 + i * 80, W, 4, '#A9BAC3', 0, 'opacity=".7"');
  return s;
}
/** Meja praktikum baja dengan sosok tertutup kain putih (bentuk umum saja, tanpa detail). */
export function labTable(x, y) {
  let s = rect(x - 330, y, 660, 26, '#C9D4DA', 10) + rect(x - 300, y + 26, 600, 18, '#AEBBC3', 6);
  for (const dx of [-290, 270]) s += rect(x + dx, y + 44, 20, 200, '#9FB0BA', 6);
  s += rect(x - 330, y + 150, 660, 12, '#B6C3CB', 6);
  // sosok tertutup kain: lengkung umum, lipatan halus
  s += `<path d="M${x - 300} ${y} C${x - 290} ${y - 60} ${x - 200} ${y - 66} ${x - 150} ${y - 44} C${x - 100} ${y - 80} ${x - 40} ${y - 84} ${x + 20} ${y - 52} C${x + 90} ${y - 66} ${x + 190} ${y - 50} ${x + 304} ${y - 8} L${x + 304} ${y} Z" fill="#F8FBFC"/>`;
  s += `<path d="M${x - 150} ${y - 44}C${x - 140} ${y - 20} ${x - 150} ${y - 8} ${x - 154} ${y}M${x + 20} ${y - 52}C${x + 30} ${y - 26} ${x + 22} ${y - 10} ${x + 18} ${y}M${x + 150} ${y - 56}C${x + 160} ${y - 30} ${x + 156} ${y - 10} ${x + 150} ${y}" fill="none" stroke="#D5E0E5" stroke-width="5" stroke-linecap="round"/>`;
  return s;
}
/** Label nama (kertas dengan lubang dan tali) yang bisa terbang. */
export function nameTag(x, y, r, text, col, o = 1, s = 1) {
  const w = 40 + text.length * 17;
  return g(rect(-w / 2, -26, w, 52, col, 10, 'stroke="rgba(10,56,48,.25)" stroke-width="3"') + circ(-w / 2 + 14, 0, 6, 'rgba(255,255,255,.85)') + `<path d="M${-w / 2 + 14} 0q-20 -18 -34 -22" stroke="#7A6A55" stroke-width="3" fill="none"/>` + txt(text, 8, 11, { size: 30, fill: '#0A3830', weight: 800 }), { x, y, r, o, s });
}
