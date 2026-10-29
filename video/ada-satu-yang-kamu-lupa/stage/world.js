// Latar dan properti datar untuk video "Ada Satu yang Kamu Lupa": kamar malam/pagi, kampus, kelas, lab, ruang ujian.
// Semua fungsi murni (waktu -> string SVG). Area aman platform: konten penting di y 250..1180, takarir di 1210..1430.
import { C, clamp, lerp, ease, easeOut, easeInOut, pop, seg, win, r1, rnd, g, rect, circ, txt, hand, mug, paperStack } from './lib.js';

export const W = 1080, H = 1920, DESK_Y = 1130;
/** Raka duduk di balik meja: pinggang (y=580 koordinat Raka) tepat di tepi meja, cx = tengah badan di layar. */
export const atDesk = (s = 1.45, cx = 540, dy = 0) => ({ x: cx - 200 * s, y: DESK_Y + dy - 580 * s, s });

export const SKIN = ['#F7BC8E', '#E3A878', '#C98B5E', '#9A6440', '#F2C9A6'];
export const HAIR = ['#212739', '#4A2F22', '#171717', '#7A4B2A', '#2F3A52', '#A8603C'];
const SHIRT = ['#E8665F', '#6BA3C4', '#F8C038', '#9DE0BD', '#B48CD6', '#F4EBD8', '#7BC4A4', '#F59E6B'];

/** Orang lain (bukan Raka): kepala bulat, rambut, dua titik mata. kind 'bust' = kepala+bahu saja. */
export function person(x, y, s = 1, { skin = 0, hair = 0, shirt = 0, look = 0, tilt = 0, eyes = 1, style = 0, name = '' } = {}) {
  const sk = SKIN[skin % SKIN.length], hr = HAIR[hair % HAIR.length], sh = SHIRT[shirt % SHIRT.length];
  let h = '';
  h += rect(-58, 56, 116, 150, sh, 44);                         // bahu/badan
  h += rect(-14, 40, 28, 30, sk, 8);                            // leher
  h += `<g transform="rotate(${r1(tilt)} 0 40)">`;
  if (style === 1) h += rect(-48, -30, 96, 100, hr, 40);        // rambut panjang di belakang
  h += circ(0, 0, 46, sk);
  h += style === 2 ? `<path d="M-48 -4a48 48 0 0 1 96 0q-40 -34 -96 0z" fill="${hr}"/>` : `<path d="M-48 2a48 48 0 0 1 96 0q-10 -26 -48 -24q-38 -2 -48 24z" fill="${hr}"/>`;
  const lx = look * 5;
  if (eyes > 0.1) h += circ(-16 + lx, 8, 4.5 * eyes, '#2A2A33') + circ(16 + lx, 8, 4.5 * eyes, '#2A2A33');
  else h += `<path d="M-22 8q6 6 12 0M10 8q6 6 12 0" stroke="#2A2A33" stroke-width="4" fill="none" stroke-linecap="round"/>`;
  h += `<path d="M-9 28q9 7 18 0" stroke="#8B3F37" stroke-width="4" fill="none" stroke-linecap="round"/>`;
  h += `</g>`;
  if (name) h += rect(-28, 98, 56, 34, '#fff', 6) + rect(-20, 108, 40, 5, '#C9C3B0', 2) + rect(-20, 118, 28, 5, '#C9C3B0', 2);
  return g(h, { x, y, s });
}

/* ------------------------------------------------------------ meja dan kamar */
export function deskFront({ wood = C.wood, woodD = C.woodD, y = DESK_Y } = {}) {
  let s = rect(0, y, W, 56, wood) + rect(0, y + 56, W, H - y - 56, woodD) + rect(0, y + 44, W, 12, 'rgba(0,0,0,.14)');
  for (let i = 0; i < 9; i++) s += rect(0, y + 130 + i * 84, W, 5, 'rgba(0,0,0,.07)') + rect(((i * 337) % 900), y + 100 + i * 84, 220 + (i % 3) * 90, 4, 'rgba(255,255,255,.06)', 2);
  return s;
}
/** Kamar malam. dim 0..1 menggelapkan (lampu dimatikan). */
export function roomNight(t, { time = '23:10', lamp = 1, moon = true, cal = null, shelf = true, sky = null } = {}) {
  const dark = 1 - lamp;
  let s = rect(0, 0, W, DESK_Y, C.night2) + rect(0, 0, W, 700, C.night) + rect(0, 696, W, 6, 'rgba(255,255,255,.05)');
  // jendela
  s += rect(70, 270, 300, 420, '#0F1E2C', 26) + rect(90, 290, 260, 380, sky || '#14283A', 16);
  if (moon) s += circ(280, 400, 46, '#F4EBD8') + circ(300, 386, 40, sky || '#14283A');
  for (let i = 0; i < 9; i++) s += circ(110 + rnd(i) * 220, 320 + rnd(i + 5) * 320, 3 + rnd(i + 2) * 3, '#fff', `opacity="${r1(0.35 + 0.4 * Math.sin(t * 2 + i))}"`);
  s += rect(215, 270, 8, 420, '#0F1E2C') + rect(70, 475, 300, 8, '#0F1E2C');
  // jam digital
  if (time) s += g(rect(0, 0, 250, 112, '#101B25', 22) + txt(time, 125, 82, { size: 74, fill: C.gold, weight: 800, ls: 3 }), { x: 700, y: 300 });
  // rak buku
  if (shelf) {
    s += rect(690, 560, 300, 14, C.woodD, 4);
    const cols = ['#E8665F', '#F8C038', '#9DE0BD', '#6BA3C4', '#E8665F', '#F4EBD8'];
    for (let i = 0; i < 6; i++) s += rect(706 + i * 42, 560 - 90 - (i % 3) * 14, 34, 90 + (i % 3) * 14, cols[i], 5);
  }
  if (cal) s += cal;
  // kerucut cahaya lampu
  if (lamp > 0.02) s += `<polygon points="830,900 540,${DESK_Y} 1050,${DESK_Y}" fill="${C.lamp}" opacity="${r1(0.11 * lamp * 100) / 100}"/>`;
  // lampu meja (di dinding, di belakang Raka)
  s += `<g transform="translate(985 ${DESK_Y})"><path d="M0 -10L-40 -300" stroke="#2A3446" stroke-width="12" stroke-linecap="round"/><path d="M-40 -300L-10 -500" stroke="#2A3446" stroke-width="12" stroke-linecap="round"/>`
    + `<path d="M-64 -500q50 -44 112 0l-14 46h-84z" fill="#2A3446"/><ellipse cx="-8" cy="-454" rx="52" ry="12" fill="${lamp > 0.4 ? C.lamp : '#3C4660'}"/></g>`;
  if (dark > 0.02) s += rect(0, 0, W, DESK_Y, '#070E1A', 0, `opacity="${r1(dark * 0.42 * 100) / 100}"`);
  return s;
}
export function roomMorning(t, { mugSteam = 1 } = {}) {
  let s = rect(0, 0, W, DESK_Y, '#F6E7C8') + rect(0, 690, W, 6, 'rgba(0,0,0,.05)');
  // jendela terang + sinar
  s += rect(70, 270, 320, 440, '#fff', 28) + rect(88, 288, 284, 404, '#BFE3F2', 18) + circ(300, 380, 54, '#FFE08A') + circ(300, 380, 90, '#FFE08A', 'opacity=".25"');
  s += rect(226, 288, 10, 404, '#fff') + rect(88, 484, 284, 10, '#fff');
  s += `<polygon points="120,700 380,700 760,${DESK_Y} 420,${DESK_Y}" fill="#FFF3C4" opacity=".28"/>`;
  s += rect(690, 560, 300, 14, '#B58A5A', 4);
  const cols = ['#E8665F', '#F8C038', '#9DE0BD', '#6BA3C4', '#E8665F', '#F4EBD8'];
  for (let i = 0; i < 6; i++) s += rect(706 + i * 42, 560 - 90 - (i % 3) * 14, 34, 90 + (i % 3) * 14, cols[i], 5);
  // tanaman kecil
  s += rect(880, 700, 70, 60, '#C9855A', 12) + `<path d="M915 700q-40 -60 -10 -120M915 700q30 -70 60 -100M915 700q-6 -90 20 -150" stroke="#4E9B6C" stroke-width="14" fill="none" stroke-linecap="round"/>`;
  return s;
}

/** Kalender dinding: BESOK dilingkari. progress 0..1 menggambar lingkaran. */
export function wallCalendar(x, y, { ring = 0, o = 1, s = 1, flip = 0 } = {}) {
  let h = rect(0, 0, 330, 380, '#FFFDF6', 22, 'stroke="#D9CFB4" stroke-width="4"') + rect(0, 0, 330, 80, C.coral, 22) + rect(0, 50, 330, 30, C.coral);
  h += txt('UJIAN', 165, 58, { size: 44, fill: '#fff', ls: 4 });
  for (let r = 0; r < 4; r++) for (let c = 0; c < 5; c++) {
    const cx = 44 + c * 60, cy = 128 + r * 58, last = r === 2 && c === 3;
    h += circ(cx, cy, 20, last ? 'rgba(242,115,94,.22)' : '#F1EAD6');
    if (!last) h += rect(cx - 10, cy - 3, 20, 6, '#C6BDA5', 3);
  }
  h += hand('BESOK', 44 + 3 * 60, 128 + 2 * 58 + 12, { size: 34, fill: C.coral, anchor: 'middle' });
  // lingkaran digambar (stroke-dash)
  const L = 2 * Math.PI * 34;
  h += `<circle cx="${44 + 3 * 60}" cy="${128 + 2 * 58}" r="34" fill="none" stroke="${C.coral}" stroke-width="7" stroke-linecap="round" stroke-dasharray="${r1(L)}" stroke-dashoffset="${r1(L * (1 - clamp(ring, 0, 1)))}" transform="rotate(-90 ${44 + 3 * 60} ${128 + 2 * 58})"/>`;
  return g(h, { x, y, o, s, ox: 165, oy: 190 });
}

/** Buku terbuka di meja (tampak depan, tipis) dengan halaman bergaris. */
export function openBook(x, y, w = 360, { tilt = 0, marks = true, flip = 0 } = {}) {
  let h = rect(-w / 2, -24, w, 30, '#6B4A33', 8) + rect(-w / 2 + 8, -52, w / 2 - 12, 40, '#FFFDF6', 6) + rect(4, -52, w / 2 - 12, 40, '#F7F1E0', 6);
  for (let i = 0; i < 3; i++) h += rect(-w / 2 + 24, -44 + i * 11, w / 2 - 56, 4, '#B8B2A0', 2) + rect(24, -44 + i * 11, w / 2 - 56, 4, '#B8B2A0', 2);
  if (marks) h += rect(-w / 2 + 24, -44, 90, 8, 'rgba(248,192,56,.85)', 3);
  return g(h, { x, y, r: tilt });
}
export function bookStack(x, y, n = 3, w = 250) {
  const cols = ['#E8665F', '#F8C038', '#6BA3C4', '#9DE0BD', '#B48CD6'];
  let s = '';
  for (let i = 0; i < n; i++) s += rect(x + (rnd(i + 3) - 0.5) * 24, y - (i + 1) * 36, w - i * 14, 34, cols[i % 5], 8);
  return s;
}

/* ------------------------------------------------------------ kampus */
/** Gerbang kampus lebar: langit, gedung FK, spanduk OSPEK, kerumunan. */
export function campusWide(t, { pan = 0 } = {}) {
  let s = rect(0, 0, W, 1000, '#BFE3F2') + rect(0, 1000, W, H - 1000, '#CDE8C4');
  // awan bergeser pelan
  for (let i = 0; i < 3; i++) { const x = ((i * 420 + t * 12) % 1500) - 200; s += `<g opacity=".85">${rect(x, 330 + i * 70, 220, 56, '#fff', 28)}${rect(x + 40, 300 + i * 70, 120, 56, '#fff', 28)}</g>`; }
  // gedung
  s += rect(120 - pan, 520, 840, 480, '#EFE6D2', 16) + rect(80 - pan, 480, 920, 60, C.forest, 14);
  s += txt('FK UNIVERSITAS', 540 - pan, 526, { size: 46, fill: C.cream, ls: 6 });
  for (let r = 0; r < 2; r++) for (let c = 0; c < 6; c++) s += rect(170 + c * 130 - pan, 600 + r * 160, 84, 110, '#BFE3F2', 10) + rect(170 + c * 130 - pan, 600 + r * 160, 84, 14, '#fff', 4);
  s += rect(430 - pan, 800, 220, 200, '#8A6240', 14) + rect(440 - pan, 810, 94, 190, '#A97C52', 10) + rect(546 - pan, 810, 94, 190, '#A97C52', 10);
  // pohon
  for (const [tx, ty] of [[60, 900], [1010, 880]]) s += rect(tx - 16, ty, 32, 140, '#7A5636', 8) + circ(tx, ty - 20, 90, '#4E9B6C') + circ(tx - 50, ty + 20, 60, '#5DAF7A') + circ(tx + 52, ty + 14, 62, '#5DAF7A');
  // spanduk OSPEK
  s += `<g transform="translate(${540 - pan} 960)">${rect(-330, -30, 660, 90, C.gold, 16)}${txt('OSPEK MABA FK', 0, 34, { size: 52, fill: C.forest, ls: 4 })}</g>`;
  s += rect(0, 1000, W, 8, 'rgba(0,0,0,.06)');
  return s;
}
/** Lorong dengan papan pengumuman; boardFill 0..1 mengisi papan dengan kertas jadwal. */
export function corridorBoard(t, { fill = 0, pan = 0 } = {}) {
  let s = rect(0, 0, W, H, '#EFE6D2') + rect(0, 1050, W, H - 1050, '#C9B58F') + rect(0, 1040, W, 14, 'rgba(0,0,0,.08)');
  s += rect(0, 250, W, 24, '#E2D6BC');
  // pintu di kiri-kanan
  for (const x of [-20, 860]) s += rect(x, 380, 220, 670, '#9C7A55', 16) + rect(x + 20, 400, 180, 300, '#B48F66', 10) + circ(x + (x < 100 ? 190 : 30), 740, 12, C.gold);
  // papan
  s += rect(210, 360, 660, 520, '#C79E6A', 22) + rect(232, 382, 616, 476, '#E8D5A8', 14);
  const cols = ['#9DE0BD', '#F8C038', '#F2735E', '#6BA3C4', '#B48CD6', '#F59E6B'];
  const N = 14;
  for (let i = 0; i < N; i++) {
    const p = clamp(fill * (N + 4) - i, 0, 1); if (p <= 0) continue;
    const x = 250 + (i % 5) * 116, y = 400 + Math.floor(i / 5) * 140;
    s += g(rect(0, 0, 100, 120, '#fff', 8, 'stroke="#D9CFB4" stroke-width="3"') + rect(12, 14, 76, 10, cols[i % 6], 4) + rect(12, 34, 62, 6, '#C6BDA5', 3) + rect(12, 48, 70, 6, '#C6BDA5', 3) + rect(12, 62, 50, 6, '#C6BDA5', 3) + rect(12, 86, 30, 22, cols[(i + 2) % 6], 6),
      { x: x + 50, y: y + 60 + (1 - ease(p)) * 40, r: (rnd(i) - 0.5) * 8, o: ease(p), s: 0.8 + 0.2 * ease(p), ox: 50, oy: 60 });
  }
  s += txt('JADWAL', 540, 330, { size: 40, fill: '#9C7A55', ls: 8 });
  return s;
}
/** Ruang kuliah: layar slide di depan, barisan bangku. slide = string SVG isi layar (1000x420). */
export function lectureHall(t, { slide = '', glow = 1 } = {}) {
  let s = rect(0, 0, W, H, '#D9CDB0') + rect(0, 300, W, 700, '#E6DBC0');
  s += rect(110, 330, 860, 470, '#2A3446', 24) + `<svg x="130" y="350" width="820" height="430" viewBox="0 0 820 430" overflow="hidden">${rect(0, 0, 820, 430, '#F7F2E4', 12)}${slide}</svg>`;
  s += rect(300, 800, 480, 22, '#9C7A55', 8);
  // dosen (siluet kecil di samping layar)
  s += person(930, 700, 0.9, { skin: 2, hair: 2, shirt: 5, style: 2 });
  s += rect(0, 1000, W, 12, 'rgba(0,0,0,.08)');
  return s;
}
export function labBench(t) {
  let s = rect(0, 0, W, H, '#DCEBEC') + rect(0, 320, W, 12, 'rgba(0,0,0,.05)');
  // rak dinding dengan botol
  s += rect(60, 520, 420, 14, '#7B8F95', 5);
  const cols = ['#F2735E', '#9DE0BD', '#F8C038', '#6BA3C4', '#B48CD6'];
  for (let i = 0; i < 5; i++) s += rect(80 + i * 76, 440, 52, 80, cols[i], 12, 'opacity=".9"') + rect(94 + i * 76, 422, 24, 22, '#fff', 5);
  // model kerangka kecil (tengkorak sederhana)
  s += `<g transform="translate(820 470)">${rect(-4, 0, 8, 360, '#9AA5A8', 4)}${circ(0, -60, 70, '#F4EEDC')}${rect(-30, -10, 60, 26, '#F4EEDC', 8)}${circ(-24, -66, 18, '#2A3446')}${circ(24, -66, 18, '#2A3446')}${rect(-8, -36, 16, 18, '#2A3446', 4)}</g>`;
  return s;
}
/** Mikroskop sederhana. */
export function microscope(x, y, s = 1) {
  return g(rect(-70, -10, 140, 24, '#33405A', 10) + rect(-12, -190, 24, 190, '#415070', 8) + rect(-20, -230, 70, 30, '#415070', 12) + rect(-8, -270, 28, 60, '#2A3446', 8) + rect(-34, -130, 70, 14, '#9AA5A8', 5), { x, y, s });
}
export function examHall(t, { clockAng = 0 } = {}) {
  let s = rect(0, 0, W, H, '#E4DAC1') + rect(0, 300, W, 760, '#EDE4CE');
  // jam dinding
  s += g(circ(0, 0, 80, '#fff', 'stroke="#2A3446" stroke-width="8"') + `<g transform="rotate(${r1(clockAng)})">${rect(-3, -62, 6, 66, '#2A3446', 3)}</g>${rect(-3, -4, 6, 46, '#F2735E', 3)}${circ(0, 0, 8, '#2A3446')}`, { x: 540, y: 330, s: 0.8 });
  return s;
}
export function examPaper(x, y, w = 560, { glow = 0, o = 1, s = 1, r = 0, hi = [] } = {}) {
  let h = rect(0, 0, w, 420, '#FFFDF6', 14, 'stroke="#D9CFB4" stroke-width="3"') + txt('SOAL', 40, 62, { size: 30, fill: C.green, anchor: 'start', ls: 4 });
  for (let i = 0; i < 6; i++) h += rect(40, 96 + i * 36, (w - 80) * (0.92 - (i % 3) * 0.14), 10, '#B8B2A0', 5);
  for (const [i, a, b] of hi) h += rect(40 + a, 94 + i * 36, b, 16, `rgba(248,192,56,${r1(0.9 * glow * 100) / 100})`, 6);
  for (let i = 0; i < 4; i++) h += circ(60, 332 + i * 0 + 0, 0, '#fff') + rect(40, 306 + i * 24, (w - 80) * (0.6 - (i % 2) * 0.2), 8, '#D0CAB6', 4);
  return g(h, { x, y, o, s, r, ox: w / 2, oy: 210 });
}
export function perspective(rows) { return rows; }

/** Papan nama lantai: garis lantai halus. */
export function floorLine(y, col = 'rgba(0,0,0,.08)') { return rect(0, y, W, 10, col); }
