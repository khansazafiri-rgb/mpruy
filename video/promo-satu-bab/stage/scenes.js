// Adegan animasi (koordinat layar 1080 x 1920). Setiap adegan = { back, mid, front, top } berupa string SVG:
//   back/front = lapisan latar & meja (dipikselkan, pix.js); mid = karakter vektor asli (Raka/Nilo/Kila, tidak dipikselkan); top = teks, kartu, tangan yang digambar ulang.
import { f1, clamp, lerp, sm, eo, eio, MC, FONT, raka, rakaBody, lerpState, rIdle, solveArm, R, C, P, T, seg, win, SEAT, STAND, loc, scr, handScr, rk, rkHand, rkArm, lerpArm, armTo, pen, chair } from './common.js';
import { pixText, pixTextW, pixPlate } from './pix.js';
import { mascot } from './mascot.js';
import { AGENDA } from './timeline.mjs';
import { walkCycle } from '../../../brand/characters/raka/raka.js';

const INK = MC.ink, GOLD = MC.gold;
const GD = `<defs><radialGradient id="gl" cx=".5" cy=".5" r=".5"><stop offset="0" stop-color="#FFD98A" stop-opacity=".6"/><stop offset="1" stop-color="#FFD98A" stop-opacity="0"/></radialGradient><radialGradient id="gm" cx=".5" cy=".5" r=".5"><stop offset="0" stop-color="#BFE9FF" stop-opacity=".55"/><stop offset="1" stop-color="#BFE9FF" stop-opacity="0"/></radialGradient></defs>`;
const rowsOf = (n, f) => Array.from({ length: n }, (_, i) => f(i)).join('');
const wood = { top: '#D9A06C', topHi: '#EFC596', front: '#8A5A34', frontDk: '#6E4223', edge: '#B9784A' };

// ------------------------------------------------------------------ kamar (pagi / malam)
function roomBack(t, night) {
  const wall = night ? '#1A3C4C' : '#F3E3BF', band = night ? '#142F3D' : '#E5D0A2', ceil = night ? '#10242F' : '#D9C393';
  let s = GD + R(0, 0, 1080, 1920, wall) + R(0, 0, 1080, 110, ceil) + R(0, 800, 1080, 400, band) + R(0, 796, 1080, 8, night ? '#0E2230' : '#CDB98A');
  // jendela kiri
  s += R(56, 420, 320, 390, '#8A5A34') + R(74, 438, 284, 354, night ? '#10264A' : '#8FD3F2');
  if (night) { s += C(250, 560, 44, '#F4EBC8') + C(272, 544, 38, '#10264A'); for (let i = 0; i < 9; i++) s += C(110 + ((i * 53) % 230), 470 + ((i * 41) % 270), 3 + (i % 2) * 2, '#FFF3C4', `opacity="${f1(0.45 + 0.4 * Math.sin(t * 2 + i))}"`); }
  else { s += C(290, 520, 46, '#FFE27A') + R(110, 640, 120, 30, '#FFFFFF') + R(140, 620, 80, 30, '#FFFFFF') + R(240, 700, 100, 28, '#FFFFFF'); }
  s += R(212, 438, 12, 354, '#8A5A34') + R(74, 604, 284, 12, '#8A5A34');
  // poster anatomi sederhana (kanan atas)
  s += R(736, 400, 280, 360, '#8A5A34') + R(752, 416, 248, 328, night ? '#27546A' : '#CFE8E2') + C(876, 500, 38, night ? '#9FC4CF' : '#FFFFFF') + R(862, 540, 28, 120, night ? '#9FC4CF' : '#FFFFFF') + R(826, 566, 100, 18, night ? '#9FC4CF' : '#FFFFFF') + R(826, 604, 100, 14, night ? '#9FC4CF' : '#FFFFFF') + R(830, 640, 92, 12, night ? '#9FC4CF' : '#FFFFFF') + R(770, 690, 200, 12, MC.brand) + R(770, 712, 140, 12, MC.gold);
  // rak buku
  s += R(60, 880, 300, 16, '#8A5A34');
  const bc = ['#E8665F', '#4F7FE0', '#F8C038', '#55C79D', '#8E7CE8', '#E59A3A', '#1D7B75'];
  for (let i = 0; i < 7; i++) s += R(72 + i * 40, 880 - 74 - (i % 3) * 14, 34, 74 + (i % 3) * 14, bc[i]);
  if (night) s += `<ellipse cx="200" cy="1010" rx="330" ry="260" fill="url(#gl)"/>`;
  return s;
}
function deskFront(t, night, o = {}) {
  let s = R(-10, 1040, 1100, 290, wood.top) + R(-10, 1040, 1100, 10, wood.topHi) + R(-10, 1326, 1100, 14, wood.edge) + R(-10, 1340, 1100, 600, wood.front) + R(60, 1420, 420, 330, wood.frontDk) + R(600, 1420, 420, 330, wood.frontDk) + R(240, 1560, 60, 14, GOLD) + R(780, 1560, 60, 14, GOLD);
  // lampu meja (kiri) dan cangkir (kanan) di atas meja
  s += R(150, 960, 12, 90, '#4D5A66') + P('M100 960L190 960L160 910L130 910Z', night ? '#F8C038' : '#E8C466') + R(120, 1040, 76, 12, '#4D5A66');
  s += R(222, 985, 66, 62, '#F2EDE0') + R(288, 1000, 18, 30, '#F2EDE0') + R(230, 993, 50, 14, '#7A4A2A');
  return s;
}
// ------------------------------------------------------------------ buku catatan kecil di meja (di bawah tangan Raka) + teks tulisan tangan di papan atas
const PAGE = { x: 410, y: 1066, w: 260, h: 200 };
const pageSvg = (extra = '') => R(PAGE.x - 12, PAGE.y - 10, PAGE.w + 24, PAGE.h + 22, '#3B6E8F') + R(PAGE.x, PAGE.y, PAGE.w, PAGE.h, '#FBFAF4') + rowsOf(3, (i) => R(PAGE.x + 14, PAGE.y + 60 + i * 56, PAGE.w - 28, 4, '#BFD3E0')) + R(PAGE.x + 36, PAGE.y, 4, PAGE.h, '#F2A7A0') + rowsOf(4, (i) => C(PAGE.x - 2, PAGE.y + 24 + i * 50, 7, '#CFD8DE')) + extra;
const mctx = document.createElement('canvas').getContext('2d');
const tw = (txt, size, w = 700) => { mctx.font = `${w} ${size}px Caveat`; return mctx.measureText(txt).width; };
const HAND = ['Nanti malam aku', 'nyicil satu bab.'];
/** adegan 1: Raka menulis di buku; tulisan muncul huruf demi huruf di papan atas selaras gerak pena (pena sudah bergerak sejak bingkai pertama) */
export function sceneDesk(t) {
  const SZ = 88, T0 = 2.7, u = clamp(0.06 + 0.94 * t / T0);
  const wA = tw(HAND[0], SZ), wB = tw(HAND[1], SZ), lenTotal = wA + wB + 60, pos = u * lenTotal;
  const w1 = clamp(pos, 0, wA), w2 = clamp(pos - wA - 30, 0, wB), line = pos < wA + 30 ? 0 : 1, done = t > T0;
  const cy0 = 255, h = 250, base = [cy0 + 112, cy0 + 214];
  const txt = `<g opacity="${f1(clamp(t / 0.04 + 1))}">${pixPlate(150, cy0, 780, h, { fill: MC.ivory, edge: INK, b: 6, c: 14 })}<clipPath id="c1"><rect x="${f1(540 - wA / 2 - 6)}" y="${base[0] - 90}" width="${f1(w1 + 12)}" height="120"/></clipPath><clipPath id="c2"><rect x="${f1(540 - wB / 2 - 6)}" y="${base[1] - 90}" width="${f1(w2 + 12)}" height="120"/></clipPath>`
    + `<g font-family="Caveat" font-weight="700" font-size="${SZ}" fill="#23408F" text-anchor="middle"><text x="540" y="${base[0]}" clip-path="url(#c1)">${HAND[0]}</text><text x="540" y="${base[1]}" clip-path="url(#c2)">${HAND[1]}</text></g></g>`;
  // ujung pena di buku kecil: coretan bolak-balik, bergeser sepanjang baris mengikuti kemajuan tulisan
  const frac = line === 0 ? w1 / wA : w2 / wB, ly = PAGE.y + 82 + line * 56;
  const tipX = PAGE.x + 70 + frac * 150 + Math.sin(t * 34) * 9, tipY = (done ? PAGE.y + 140 : ly) - 4 + Math.abs(Math.sin(t * 34)) * 4 - (done ? 10 * seg(t, T0, T0 + 0.4) : 0);
  const pl = SEAT, G = { dark: false };
  const k = seg(t, T0, T0 + 0.7);
  const st0 = raka(done ? 'lega' : 'netral', 'duduk', { yaw: lerp(0.0, 0, k), gazeX: 0, gazeY: lerp(0.9, 0.2, k), tilt: lerp(4, 0, k) });
  st0.bags = 0; st0.armL = armTo(st0, pl, 'L', 400, 1150, { len: 215 });
  st0.armR = armTo(st0, pl, 'R', tipX + 22, tipY - 38, { auto: true, fa: -60 });
  const st = rIdle(st0, t);
  // coretan di buku
  const sc = rowsOf(2, (ln) => { const f = ln === 0 ? Math.min(1, w1 / wA) : Math.min(1, w2 / wB); return f > 0 ? R(PAGE.x + 50, PAGE.y + 70 + ln * 56, 150 * f + 10, 8, '#23408F', 'opacity=".8"') : ''; });
  return {
    back: roomBack(t, false), mid: chair(pl) + rk(st, pl, 'rk1', G),
    front: deskFront(t, false) + pageSvg(sc),
    top: txt + rkArm(st, pl, 'rk1h', G, 'R') + pen(tipX, tipY, -62),
  };
}

// ------------------------------------------------------------------ plat agenda gaya piksel (jam piksel + label)
export function agendaPlate(t, t0, hm, label, o = {}) {
  const k = clamp((t - t0) / 0.32), ey = Math.round((1 - eo(k)) * -170 / 6) * 6;    // turun bertangga 6 px
  const cx = o.cx ?? 540, y = (o.y ?? 270) + ey, w = 600, h = 178;
  if (k <= 0) return '';
  const pulse = (t - t0) < 0.5 && Math.floor((t - t0) * 12) % 2 === 0 ? GOLD : MC.ivory;
  const u = 8, dw = pixTextW(hm, u);
  return `<g>${pixPlate(cx - w / 2, y, w, h, { fill: INK, edge: GOLD, b: 6, c: 18 })}`
    + pixText(hm, cx - dw / 2, y + 26, u, pulse, { shadow: '#0A3830' })
    + T(cx, y + 142, label, MC.ivory, 54, '', 'middle', 800) + `</g>`;
}
// ------------------------------------------------------------------ kuliah (07.00)
function lectureBack(t) {
  let s = GD + R(0, 0, 1080, 1920, '#27455C') + R(0, 0, 1080, 120, '#1A3042') + R(0, 840, 1080, 330, '#1F3A4E');
  // lampu langit-langit
  s += rowsOf(4, (i) => R(70 + i * 270, 40, 150, 24, '#F5F1C4'));
  // layar proyektor: slide berganti setiap ketukan (0,5 dtk)
  const idx = Math.floor((t - 3.0) / 0.5), pal = ['#1D7B75', '#4F7FE0', '#8E7CE8', '#E59A3A', '#E8665F', '#55C79D'];
  const c = pal[((idx % 6) + 6) % 6], v = ((idx % 3) + 3) % 3;
  s += R(110, 330, 860, 480, '#9AA9B3') + R(126, 346, 828, 448, '#F4F7F8') + R(126, 346, 828, 70, c);
  if (v === 0) s += rowsOf(4, (i) => R(170, 450 + i * 66, 560 - i * 60, 24, '#B9C5CC')) + R(780, 450, 140, 130, c, 'opacity=".5"');
  else if (v === 1) s += R(170, 450, 330, 300, c, 'opacity=".35"') + R(530, 450, 380, 24, '#B9C5CC') + R(530, 500, 300, 24, '#B9C5CC') + R(530, 560, 360, 24, '#B9C5CC') + R(530, 620, 250, 24, '#B9C5CC');
  else s += rowsOf(5, (i) => R(170 + i * 150, 740 - (60 + (i * 53) % 190), 110, 60 + (i * 53) % 190, c, 'opacity=".7"'));
  // baris kursi kosong
  s += rowsOf(3, (i) => R(40 + i * 340, 900, 250, 110, '#2F6F85') + R(40 + i * 340, 990, 250, 22, '#244F5F'));
  return s;
}
function benchFront() { return R(-10, 1040, 1100, 270, '#C69262') + R(-10, 1040, 1100, 10, '#E3B98A') + R(-10, 1310, 1100, 14, '#9B6A40') + R(-10, 1324, 1100, 600, '#7A5030') + R(80, 1400, 360, 300, '#5E3C22') + R(640, 1400, 360, 300, '#5E3C22'); }
function scribblePage(t, t0) {
  const n = Math.floor(clamp((t - t0) / 1.9) * 6);
  return pageSvg(rowsOf(Math.min(n, 6), (i) => R(PAGE.x + 50, PAGE.y + 70 + (i % 3) * 50, [150, 110, 140][i % 3] * (i > 2 ? 0.7 : 1), 8, '#23408F', 'opacity=".75"')));
}
export function sceneKuliah(t) {
  const lt = t - 3.0, pl = SEAT, G = { outfit: 'kuliah' };
  // menulis cepat mengikuti ketukan: tangan mengayun, kepala bergantian layar <-> buku
  const beat = Math.floor(lt / 0.5), look = (beat % 2 === 0) ? 0 : 1;
  const px = PAGE.x + 60 + ((lt * 190) % 150), py = PAGE.y + 78 + (Math.floor(lt / 0.8) % 3) * 50 + Math.abs(Math.sin(lt * 40)) * 5;
  const st0 = raka('netral', 'duduk', { yaw: look ? 0.05 : 0.15, gazeX: look ? 0 : 0.2, gazeY: look ? 0.9 : -0.8, tilt: look ? 5 : -2 });
  st0.bags = 0.2; st0.armL = armTo(st0, pl, 'L', 410, 1150, { len: 215 }); st0.armR = armTo(st0, pl, 'R', px + 20, py - 36, { auto: true, fa: -60 });
  const st = rIdle(st0, t);
  return { back: lectureBack(t), mid: chair(pl, '#2F6F85') + rk(st, pl, 'rkK', G), front: benchFront() + scribblePage(t, 3.0), top: rkArm(st, pl, 'rkKh', G, 'R') + pen(px, py, -62) + agendaPlate(t, 3.0, AGENDA[0][1], AGENDA[0][2]) };
}

// ------------------------------------------------------------------ skill lab (10.00): memompa manset tensimeter pada lengan latihan
function labBack(t) {
  let s = GD + R(0, 0, 1080, 1920, '#DDEFEA');
  for (let x = 0; x < 1080; x += 90) s += R(x, 0, 4, 1500, '#BCD9D1');
  for (let y = 0; y < 1500; y += 90) s += R(0, y, 1080, 4, '#BCD9D1');
  s += R(0, 0, 1080, 110, '#9CC3BA') + R(0, 1480, 1080, 440, '#9DB7B4');
  // lemari kaca (kanan) dan bagan dinding (kiri)
  s += R(730, 430, 310, 340, '#6B7B88') + R(746, 446, 135, 308, '#BFE3F0') + R(889, 446, 135, 308, '#BFE3F0') + rowsOf(3, (i) => R(746, 520 + i * 84, 278, 8, '#6B7B88')) + R(780, 470, 28, 46, '#E8665F') + R(830, 480, 28, 36, '#F8C038') + R(920, 470, 28, 46, '#55C79D') + R(970, 560, 30, 40, '#4F7FE0');
  s += R(60, 440, 300, 290, '#F8F7F3') + R(60, 440, 300, 40, MC.brand) + R(84, 506, 252, 36, '#E8665F') + R(84, 556, 252, 36, '#F8C038') + R(84, 606, 252, 36, '#55C79D') + R(84, 656, 252, 36, '#4F7FE0');
  return s;
}
const LAB = { arm: { x: 300, y: 1318, w: 450, h: 62 }, bulb: [850, 1352], gauge: [215, 1330] };
function labFront(t, lt) {
  const pump = Math.floor(lt / 0.35), ph = (lt % 0.35) / 0.35, sq = ph < 0.4 ? Math.sin(ph / 0.4 * Math.PI) : 0;
  const pr = clamp(0.08 + pump * 0.07, 0, 0.88), ang = -130 + pr * 260 + (sq > 0 ? 0 : 0);
  let s = R(-10, 1380, 1100, 50, '#EEF2F3') + R(-10, 1380, 1100, 8, '#FFFFFF') + R(-10, 1430, 1100, 14, '#B7C6CA') + R(-10, 1444, 1100, 480, '#8FA8AE') + R(70, 1520, 380, 300, '#7A949B') + R(630, 1520, 380, 300, '#7A949B');
  const a = LAB.arm;
  s += R(a.x, a.y, a.w, a.h, '#E9C7AE') + C(a.x, a.y + a.h / 2, a.h / 2, '#E9C7AE') + C(a.x + a.w, a.y + a.h / 2, a.h / 2, '#D9B096') + R(a.x + a.w - 10, a.y + 10, 14, a.h - 20, '#CFA588');
  s += R(470, 1300, 130, 96, '#3C6FB5') + R(470, 1300, 130, 14, '#5B8FD1') + R(470, 1382, 130, 14, '#2F5A96') + R(520, 1316, 10, 64, '#7FA9DE');
  s += R(600, 1346, 130, 9, '#2A2F36') + R(730, 1346, 9, 20, '#2A2F36');
  const [bx, by] = LAB.bulb, bs = 1 - 0.18 * sq;
  s += `<ellipse cx="${bx}" cy="${by + 14 * (1 - bs)}" rx="${f1(44 * (2 - bs))}" ry="${f1(30 * bs)}" fill="#2A2F36"/><ellipse cx="${bx - 12}" cy="${by - 8}" rx="14" ry="8" fill="#55616C"/>`;
  const [gx, gy] = LAB.gauge;
  s += C(gx, gy, 76, '#6B7B88') + C(gx, gy, 64, '#F8F7F3') + rowsOf(9, (i) => { const an = (-130 + i * 32.5) * Math.PI / 180; return `<path d="M${f1(gx + Math.sin(an) * 50)} ${f1(gy - Math.cos(an) * 50)}L${f1(gx + Math.sin(an) * 60)} ${f1(gy - Math.cos(an) * 60)}" stroke="${INK}" stroke-width="6"/>`; });
  s += `<path d="M${gx} ${gy}L${f1(gx + Math.sin(ang * Math.PI / 180) * 52)} ${f1(gy - Math.cos(ang * Math.PI / 180) * 52)}" stroke="#E8433A" stroke-width="8" stroke-linecap="square"/>` + C(gx, gy, 9, INK);
  s += R(gx - 8, gy + 74, 16, 60, '#6B7B88');
  return s;
}
export function sceneLab(t) {
  const lt = t - 5.0, pl = STAND, G = { outfit: 'jas' };
  const pump = Math.floor(lt / 0.35), ph = (lt % 0.35) / 0.35, sq = ph < 0.4 ? Math.sin(ph / 0.4 * Math.PI) : 0;
  const st0 = raka('berpikir', 'netral', { yaw: -0.25, gazeX: -0.7, gazeY: 0.6, tilt: -3 }); st0.bags = 0.35; st0.sweat = clamp(lt / 1.6) * 0.5;
  st0.armR = armTo(st0, pl, 'R', LAB.bulb[0] - 6, LAB.bulb[1] - 40 + sq * 18, { len: 240 }); st0.armL = armTo(st0, pl, 'L', 470, 1290, { len: 215 });
  const st = rIdle(st0, t);
  return { back: labBack(t), mid: rk(st, pl, 'rkL', G), front: labFront(t, lt), top: rkArm(st, pl, 'rkLr', G, 'R') + rkArm(st, pl, 'rkLl', G, 'L') + agendaPlate(t, 5.0, AGENDA[1][1], AGENDA[1][2]) };
}
// ------------------------------------------------------------------ diskusi kasus (13.00): papan tulis, kartu pertanyaan menempel satu per satu
const CARDS = [[7.35, 'Diagnosis banding?', 950, 990], [7.85, 'Pemeriksaan penunjang?', 800, 1150], [8.35, 'Tatalaksana?', 725, 985]];
function kasusBack(t) {
  let s = GD + R(0, 0, 1080, 1920, '#EBDFC6') + R(0, 0, 1080, 110, '#C9B98F') + R(0, 1300, 1080, 600, '#B79A6E');
  s += R(70, 420, 940, 790, '#8E99A3') + R(88, 438, 904, 754, '#FAFCFC') + R(88, 438, 904, 70, '#4F7FE0') + rowsOf(5, (i) => R(120, 560 + i * 80, [360, 300, 420, 240, 330][i], 16, '#C4CED6')) + R(88, 1168, 904, 24, '#B7C1C9');
  s += R(700, 540, 200, 20, '#E8665F') + R(700, 580, 150, 20, '#E8665F', 'opacity=".6"');
  return s;
}
function kasusFront(t) {
  let s = R(-10, 1400, 1100, 60, '#8A5A34') + R(-10, 1400, 1100, 10, '#B9784A') + R(-10, 1460, 1100, 460, '#6E4223') + R(70, 1540, 420, 280, '#5A361C') + R(590, 1540, 420, 280, '#5A361C');
  s += R(110, 1352, 150, 56, '#FBFAF4') + R(130, 1330, 150, 56, '#F2F6F8') + R(800, 1340, 70, 64, '#F2EDE0') + R(870, 1356, 16, 28, '#F2EDE0');
  return s;
}
export function sceneKasus(t) {
  const lt = t - 7.0, pl = { s: 1.12, rx: 300, ryf: 1590 }, G = { outfit: 'kuliah' };
  const live = CARDS.filter((c) => t >= c[0]), last = live.length ? live[live.length - 1] : CARDS[0];
  const point = seg(t, 7.2, 7.6, eo);
  const st0 = raka(lt < 1.1 ? 'berpikir' : 'khawatir', 'menunjuk', { yaw: 0.45, gazeX: 0.9, gazeY: -0.2, tilt: 2 }); st0.bags = 0.5; st0.sweat = seg(t, 7.6, 8.8) * 0.7;
  const tx = last[2] - 190, ty = last[3] + 10 + Math.sin(lt * 7) * 5;
  st0.armR = lerpArm(solveArm(st0, 'R', loc(pl, 560, 1330), { len: 200, front: 1 }), armTo(st0, pl, 'R', tx, ty, { len: 245, finger: 0.55, fa: -20 }), point);
  st0.armL = armTo(st0, pl, 'L', 250, 1300, { len: 210 });
  const st = rIdle(st0, t);
  let cards = `<g font-family="${FONT}" font-weight="800">`;
  CARDS.forEach(([t0, txt, x, y], i) => {
    const k = clamp((t - t0) / 0.28); if (k <= 0) return;
    const sc = 1 + (1 - eo(k)) * 0.35, rot = [-3, 4, -2][i], lines = txt.split(' ');
    const l1 = lines.length > 2 ? lines.slice(0, 1).join(' ') : lines[0], l2 = lines.length > 2 ? lines.slice(1).join(' ') : lines.slice(1).join(' ');
    cards += `<g transform="translate(${x} ${y}) rotate(${rot}) scale(${f1(sc)})" opacity="${f1(Math.min(1, k * 3))}"><rect x="-118" y="-74" width="236" height="156" fill="#021014" opacity=".3" transform="translate(7 9)"/><rect x="-118" y="-74" width="236" height="156" fill="#F8D868" stroke="${INK}" stroke-width="5"/><rect x="-118" y="-74" width="236" height="22" fill="#E8B23A"/><text x="0" y="0" text-anchor="middle" font-size="36" fill="${INK}">${l1}</text><text x="0" y="46" text-anchor="middle" font-size="36" fill="${INK}">${l2}</text></g>`;
  });
  cards += '</g>';
  const head = `<text x="260" y="498" font-family="${FONT}" font-weight="800" font-size="46" fill="#fff" text-anchor="start">KASUS 3</text>`;
  return { back: kasusBack(t), mid: rk(st, pl, 'rkD', G), front: kasusFront(t), top: head + cards + rkArm(st, pl, 'rkDr', G, 'R') + agendaPlate(t, 7.0, AGENDA[2][1], AGENDA[2][2]) };
}
// ------------------------------------------------------------------ tugas kelompok (18.00): menyusun slide, notifikasi grup masuk
const NOTIFS = [[9.35, 'Revisi PPT|kelompok', 185, 560], [9.85, 'Daftar pustaka|belum ada', 895, 650], [10.35, 'Kumpul|20.00', 185, 760]];
function kelompokBack(t) {
  let s = GD + R(0, 0, 1080, 1920, '#3A2D5C') + R(0, 0, 1080, 110, '#2A2046') + R(0, 780, 1080, 500, '#31254F');
  s += R(56, 420, 330, 390, '#7A5A9A') + R(74, 438, 294, 354, '#F28A4B') + R(74, 560, 294, 232, '#F5B25C') + C(220, 640, 52, '#FFE27A') + R(212, 438, 12, 354, '#7A5A9A') + R(74, 604, 294, 12, '#7A5A9A');
  s += R(700, 420, 330, 380, '#5A3F7E');
  const bc = ['#E8665F', '#4F7FE0', '#F8C038', '#55C79D', '#8E7CE8', '#E59A3A'];
  for (let r = 0; r < 3; r++) { s += R(700, 520 + r * 100, 330, 12, '#3B2A55'); for (let i = 0; i < 8; i++) s += R(712 + i * 40, 440 + r * 100 + (i % 3) * 8, 32, 74 - (i % 3) * 8, bc[(i + r) % 6]); }
  return s;
}
export const LAPTOP = { x: 315, y: 800, w: 450, h: 280 };
function laptopSvg(open, lit, content) {
  const L = LAPTOP, h = L.h * open;
  let s = '';
  if (open > 0.02) {
    s += R(L.x - 16, L.y + L.h - h - 16, L.w + 32, h + 16, '#2B3440') + R(L.x, L.y + L.h - h, L.w, h, lit ? '#EAF4F2' : '#10181F');
    if (lit && open > 0.9) s += content;
  } else s += R(L.x - 16, L.y + L.h - 10, L.w + 32, 12, '#2B3440');
  s += P(`M${L.x - 40} ${L.y + L.h + 6}H${L.x + L.w + 40}L${L.x + L.w + 70} ${L.y + L.h + 70}H${L.x - 70}Z`, '#C9D3D8') + R(L.x - 70, L.y + L.h + 70, L.w + 140, 12, '#97A3AB');
  for (let r = 0; r < 3; r++) for (let i = 0; i < 12; i++) s += R(L.x - 36 + i * 38 + r * 6, L.y + L.h + 18 + r * 16, 28, 9, '#8E9BA3');
  return s;
}
const slideEditor = (t) => R(LAPTOP.x, LAPTOP.y, 90, LAPTOP.h, '#DCE6EA') + rowsOf(4, (i) => R(LAPTOP.x + 12, LAPTOP.y + 14 + i * 64, 66, 48, i === 1 ? '#4F7FE0' : '#B6C6CE')) + R(LAPTOP.x + 110, LAPTOP.y + 24, 320, 28, '#4F7FE0') + rowsOf(4, (i) => R(LAPTOP.x + 110, LAPTOP.y + 76 + i * 44, [280, 230, 300, 160][i], 16, '#B6C6CE')) + (Math.floor(t * 3) % 2 ? R(LAPTOP.x + 110 + 190, LAPTOP.y + 236, 4, 30, INK) : '');
export function sceneKelompok(t) {
  const lt = t - 9.0, pl = SEAT, G = { outfit: 'kuliah' };
  const st0 = raka('ngantuk', 'duduk', { yaw: 0, gazeX: 0, gazeY: 0.4, tilt: 3 }); st0.bags = 0.85; st0.sweat = 0.5;
  const tap = Math.sin(lt * 22) * 6;
  st0.armL = armTo(st0, pl, 'L', 440, 1112 + tap, { len: 215 }); st0.armR = armTo(st0, pl, 'R', 650, 1112 - tap, { len: 215 });
  const st = rIdle(st0, t);
  const front = R(-10, 1040, 1100, 290, '#9C7A52') + R(-10, 1040, 1100, 10, '#BE9A6E') + R(-10, 1326, 1100, 14, '#6F5236') + R(-10, 1340, 1100, 600, '#5E4429') + laptopSvg(1, true, slideEditor(t));
  // ponsel bergetar di kanan meja
  const sh = Math.sin(t * 60) * 4 * (NOTIFS.some((n) => t > n[0] && t < n[0] + 0.3) ? 1 : 0);
  const phone = R(880 + sh, 1090, 96, 170, '#1B2530') + R(888 + sh, 1102, 80, 140, '#8CC8F2');
  let nt = `<g font-family="${FONT}" font-weight="800">`;
  NOTIFS.forEach(([t0, txt, x, y]) => {
    const k = clamp((t - t0) / 0.25); if (k <= 0) return;
    const ey = Math.round((1 - eo(k)) * 40 / 6) * 6;
    nt += `<g transform="translate(${x} ${y + ey})" opacity="${f1(Math.min(1, k * 3))}">${pixPlate(-150, -56, 300, 124, { fill: MC.ivory, edge: INK, b: 5, c: 10 })}${C(-118, 6, 12, '#E8433A')}${txt.split('|').map((l, i) => `<text x="-92" y="${-2 + i * 40}" font-size="32" fill="${INK}">${l}</text>`).join('')}</g>`;
  });
  nt += '</g>';
  return { back: kelompokBack(t), mid: chair(pl, '#4B3A78') + rk(st, pl, 'rkG', G), front: front + phone, top: nt + agendaPlate(t, 9.0, AGENDA[3][1], AGENDA[3][2]) };
}
// ------------------------------------------------------------------ pulang (21.00): Raka masuk kamar malam hari
export function scenePulang(t) {
  const lt = t - 11.0, ph = lt * 1.7, G = { outfit: 'kuliah' };
  const x = lerp(140, 560, eio(clamp(lt / 1.15))), walking = lt < 1.2;
  const st = raka('ngantuk', 'jalan', walkingState(ph, walking));
  st.bags = 0.9; st.slump = 0.6;
  const pl = { s: 1.06, rx: x, ryf: 1560 };
  let back = GD + R(0, 0, 1080, 1920, '#1A3C4C') + R(0, 0, 1080, 110, '#10242F') + R(0, 1560, 1080, 400, '#5B4638') + rowsOf(10, (i) => R(i * 112, 1560, 4, 400, '#463428')) + R(0, 1552, 1080, 10, '#3A2A20');
  back += R(20, 380, 270, 1190, '#0E2230') + R(40, 400, 230, 1170, '#FFE9B0') + P('M40 400L190 440V1540L40 1570Z', '#8A5A34') + R(150, 960, 18, 18, GOLD);
  back += R(780, 1380, 260, 40, '#8A5A34') + R(780, 1420, 260, 140, '#6E4223') + R(800, 1340, 90, 40, '#E8665F') + R(910, 1348, 90, 32, '#F8F7F3');
  back += `<ellipse cx="540" cy="900" rx="420" ry="300" fill="url(#gl)" opacity=".55"/>`;
  const top = agendaPlate(t, 11.0, '21.00', 'Pulang');
  return { back, mid: rk(st, pl, 'rkP', G), front: '', top };
}
const walkingState = (ph, walking) => { return walking ? walkCycle(ph, { dir: 1 }) : walkCycle(0.25, { dir: 1, stride: 8, swing: 4 }); };

// ------------------------------------------------------------------ malam: laptop dibuka, pengingat kuis, catatan menumpuk, Nilo menunjuk satu bab
const NOTES = [
  [13.65, 'Revisi PPT\nkelompok', 115, 1205, '#F8D868'], [13.9, 'Laporan\nskill lab', 330, 1275, '#8FD9B4'], [14.15, 'Resume diskusi\nkasus', 760, 1280, '#F4A8C2'],
  [14.4, 'Catatan\nkuliah', 965, 1205, '#8FD0F2'], [14.65, 'Slide dosen\nbelum dibaca', 120, 1050, '#F2A07B'], [14.9, 'Daftar\npustaka', 955, 1050, '#C9B8F2'],
  [15.15, 'Kuis anatomi\nbesok', 760, 1125, '#F8D868'], [15.4, 'Latihan soal\ndi mana?', 335, 1118, '#8FD9B4'],
];
const TARGET = [16.9, 'Anatomi:\nEkstremitas Atas', 545, 1290, '#FFF1A8'];   // BAB yang sama dengan rekaman web (Anatomi Ekstremitas Atas)
function noteSvg(n, x, y, k, sc = 1, glow = 0) {
  const [, txt, , , col] = n, lines = txt.split('\n'), w = Math.max(190, Math.max(...lines.map((l) => l.length)) * 17 + 36), h = 150;
  return `<g transform="translate(${f1(x)} ${f1(y)}) scale(${f1(sc * 1000) / 1000})" opacity="${f1(Math.min(1, k * 3))}">${glow > 0 ? `<rect x="${-w / 2 - 14}" y="${-h / 2 - 14}" width="${w + 28}" height="${h + 28}" fill="${GOLD}" opacity="${f1(glow)}"/>` : ''}<rect x="${-w / 2 + 8}" y="${-h / 2 + 10}" width="${w}" height="${h}" fill="#021014" opacity=".3"/><rect x="${-w / 2}" y="${-h / 2}" width="${w}" height="${h}" fill="${col}" stroke="${INK}" stroke-width="5"/><rect x="${-w / 2}" y="${-h / 2}" width="${w}" height="20" fill="rgba(0,0,0,.12)"/>${lines.map((l, i) => `<text x="0" y="${(i - (lines.length - 1) / 2) * 38 + 22}" text-anchor="middle" font-family="Caveat" font-weight="700" font-size="${txt.length > 22 ? 34 : 38}" fill="${INK}">${l}</text>`).join('')}</g>`;
}
const caption = (t, t0, t1, lines, size = 66) => { const a = clamp((t - t0) / 0.2) * clamp((t1 - t) / 0.2); if (a <= 0.01) return ''; const w = 880, h = 40 + lines.length * (size * 1.18) + 30, y = 255 + Math.round((1 - eo(clamp((t - t0) / 0.3))) * -60 / 6) * 6;
  return `<g opacity="${f1(a)}">${pixPlate(540 - w / 2, y, w, h, { fill: MC.ivory, edge: INK, b: 6, c: 14 })}${lines.map((l, i) => T(540, y + 36 + size * 0.95 + i * size * 1.18, l, INK, size, '', 'middle', 800)).join('')}</g>`; };
export function sceneLaptop(t, cover = false) {
  const pl = SEAT, G = { outfit: 'santai', dark: true }, lt = t - 12.3;
  const open = seg(t, 12.45, 13.05, eo), lit = t > 13.0;
  // ekspresi Raka: lelah -> kaget (pengingat) -> khawatir (penuh) -> berpikir -> mengerti
  let ex = raka('ngantuk', 'duduk', { gazeY: 0.3 });
  const E = (n, o = {}) => raka(n, 'duduk', o);
  const kag = cover ? 0 : seg(t, 13.35, 13.6), kh = cover ? 0 : seg(t, 14.7, 15.2), th = cover ? 0 : seg(t, 16.8, 17.3), mg = cover ? 1 : seg(t, 18.2, 18.7);
  ex = lerpState(ex, E('kaget', { gazeY: 0.2 }), kag); ex = lerpState(ex, E('khawatir', { gazeY: 0.4, tilt: -4 }), kh); ex = lerpState(ex, E('berpikir', { yaw: 0.35, gazeX: 0.9, gazeY: 0.5, tilt: 3 }), th); ex = lerpState(ex, E('mengerti', { yaw: 0.2, gazeX: 0.5, gazeY: 0.4 }), mg);
  ex.bags = 0.9 - 0.45 * mg; ex.sweat = 0.6 * (1 - seg(t, 17.3, 18.2));
  const tap = Math.sin(lt * 20) * 5 * (1 - seg(t, 14.6, 15.0));
  ex.armL = armTo(ex, pl, 'L', 440, 1122 + tap, { len: 215 }); ex.armR = armTo(ex, pl, 'R', 640, 1122 - tap, { len: 215 });
  const st = rIdle(ex, t);
  const screen = `${R(LAPTOP.x + 20, LAPTOP.y + 20, 120, 20, '#B6C6CE')}${R(LAPTOP.x + 20, LAPTOP.y + 60, 410, 190, '#FFFFFF')}${rowsOf(3, (i) => R(LAPTOP.x + 40, LAPTOP.y + 80 + i * 52, [300, 240, 330][i], 22, i === 1 ? '#F8C038' : '#C4D4DA'))}${t > 13.3 ? R(LAPTOP.x + 390, LAPTOP.y + 26, 28, 28, '#E8433A') : ''}`;
  const front = deskFront(t, true).replace(/<ellipse[^>]*>/, '') + laptopSvg(open, lit, screen) + (lit ? `<ellipse cx="540" cy="1000" rx="420" ry="230" fill="url(#gm)" opacity=".5"/>` : '');
  // catatan: muncul satu per satu; setelah 17,4 semuanya menyingkir kecuali satu bab
  let notes = '';
  const out = cover ? 1 : seg(t, 17.5, 18.5, eio);
  NOTES.forEach((n, i) => {
    const k = clamp((t - n[0]) / 0.25); if (k <= 0 || out >= 1) return;
    const side = n[2] < 540 ? -1 : 1, dx = Math.round(out * 900 * side / 6) * 6 * (0.6 + (i % 3) * 0.3);
    notes += noteSvg(n, n[2] + dx, n[3] + (1 - eo(k)) * -90, k);
  });
  const tk = clamp((t - TARGET[0]) / 0.3), mv = seg(t, 18.0, 18.8, eio), cxx = lerp(TARGET[2], 540, mv), cyy = lerp(TARGET[3], 1235, mv);
  if (tk > 0 && !cover) notes += noteSvg(TARGET, cxx, cyy + (1 - eo(tk)) * -90, tk, lerp(1, 1.35, mv), 0.45 * mv * (0.6 + 0.4 * Math.sin(t * 9)));
  // banner pengingat + keterangan
  const bk = clamp((t - 13.3) / 0.3) * clamp((14.95 - t) / 0.25), by = 255 + Math.round((1 - eo(clamp((t - 13.3) / 0.3))) * -80 / 6) * 6;
  const banner = (bk > 0.01 && !cover) ? `<g opacity="${f1(bk)}">${pixPlate(90, by, 900, 150, { fill: MC.ivory, edge: INK, b: 6, c: 14 })}${R(120, by + 28, 90, 90, MC.brand)}${P(`M165 ${by + 46}a22 22 0 0 1 22 22v18l8 12h-60l8-12v-18a22 22 0 0 1 22-22z`, GOLD)}${C(165, by + 106, 8, GOLD)}${T(236, by + 62, 'Pengingat', '#6B7B88', 30, '', 'start', 700)}${T(236, by + 112, 'Besok: kuis anatomi', INK, 54, '', 'start', 800)}</g>` : '';
  const cap1 = cover ? '' : caption(t, 14.95, 16.1, ['Baru mau mulai…', 'kok sudah penuh?'], 62), cap2 = cover ? '' : caption(t, 17.0, 19.5, ['Satu bab dulu.'], 92);
  // Nilo (maskot asli): masuk dari kanan, menunjuk catatan, melayang
  const nin = seg(t, 16.15, 16.9, eo), nout = seg(t, 19.0, 19.3), nx = lerp(1300, 830, nin) + nout * 60, ny = 1010 + Math.sin(t * 3.2) * 12 - (1 - nin) * 60;
  const pointK = seg(t, 16.9, 17.3, eo) * (1 - seg(t, 18.9, 19.2));
  let nilo = '';
  if (t > 16.1 && t < 19.4) nilo = mascot('nilo', { x: nx, y: ny, s: 1.2, flip: -1, arm: lerp(0, 24, pointK) + Math.sin(t * 8) * 3 * pointK, eyes: t > 18.3 ? 'happy' : 'normal', mouth: t > 18.3 ? 'happy' : 'normal', bob: Math.sin(t * 3) * 6, a: 1 - nout });
  // panah emas piksel yang menunjuk catatan satu bab (17,2 - 18,4)
  const ak = clamp((t - 17.2) / 0.2) * clamp((18.5 - t) / 0.25), ab = Math.round(Math.sin(t * 9) * 10 / 6) * 6;
  const arrow = (ak > 0.01 && !cover) ? `<g opacity="${f1(ak)}" transform="translate(545 ${1150 + ab})">${R(-12, -48, 24, 40, GOLD, `stroke="${INK}" stroke-width="5"`)}${P('M-36 -12H36L0 28Z', GOLD, `stroke="${INK}" stroke-width="5" stroke-linejoin="miter"`)}</g>` : '';
  return { back: roomBack(t, true), mid: chair(pl, '#31506A') + rk(st, pl, 'rkN', G), front, top: notes + arrow + banner + cap1 + cap2 + nilo };
}

// ------------------------------------------------------------------ lapisan di atas rekaman web asli (t >= 20)
const STEPS = [[20.15, 23.3, '1  Pilih mata kuliah & satu BAB'], [23.35, 24.85, '2  Baca materi'], [24.9, 25.9, '3  Coba flashcard'], [25.95, 27.6, '4  Latihan soal']];
function stepPlate(t, t0, t1, txt, gold = false) {
  const a = clamp((t - t0) / 0.2) * clamp((t1 - t) / 0.2); if (a <= 0.01) return '';
  const w = Math.min(1000, txt.length * 23 + 84), y = 262 + Math.round((1 - eo(clamp((t - t0) / 0.28))) * -60 / 6) * 6;
  return `<g opacity="${f1(a)}">${pixPlate(540 - w / 2, y, w, 84, { fill: gold ? GOLD : INK, edge: gold ? INK : GOLD, b: 5, c: 10 })}${T(540, y + 56, txt, gold ? INK : MC.ivory, 36, '', 'middle', 800)}</g>`;
}
export function overlay(t) {
  let s = '';
  for (const [a, b, txt] of STEPS) s += stepPlate(t, a, b, txt);
  s += stepPlate(t, 27.7, 29.3, 'Gratis di medcoel.com', true);
  // Raka paham satu pembahasan + Kila (maskot asli) mengintip
  const k = clamp((t - 29.1) / 0.35) * clamp((31.8 - t) / 0.3);
  if (k > 0.01) {
    const e = eo(clamp((t - 29.1) / 0.35)), y0 = 1450 + (1 - e) * 280, G = {};
    const st = rIdle(raka('mengerti', 'netral', { yaw: 0.15, gazeX: 0.3, gazeY: 0.3 }), t);
    const pl = { s: 0.62, rx: 125, ryf: 1930.8 + (1 - e) * 280 };
    s += `<g opacity="${f1(Math.min(1, k * 2))}"><clipPath id="pipc"><rect x="30" y="${f1(y0)}" width="360" height="240"/></clipPath>${pixPlate(24, y0 - 6, 372, 252, { fill: MC.mint, edge: INK, b: 6, c: 12 })}<g clip-path="url(#pipc)">${rk(st, pl, 'rkPip', G)}${mascot('kila', { x: 300, y: y0 + 232, s: 0.52, eyes: 'happy', mouth: 'happy', spark: 1, bob: Math.sin(t * 6) * 4 })}</g></g>`;
  }
  // penutup: teks besar di atas tampilan web penuh
  if (t >= 32.0) {
    const sc = `<defs><linearGradient id="scr" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#0A2A32" stop-opacity="0"/><stop offset=".22" stop-color="#0A2A32" stop-opacity=".9"/><stop offset=".8" stop-color="#0A2A32" stop-opacity=".9"/><stop offset="1" stop-color="#0A2A32" stop-opacity="0"/></linearGradient></defs>`;
    const a0 = clamp((t - 32.3) / 0.4);
    s += sc + `<rect x="0" y="780" width="1080" height="720" fill="url(#scr)" opacity="${f1(a0)}"/>`;
    const A = clamp((t - 32.45) / 0.3) * clamp((35.75 - t) / 0.2), B = clamp((t - 35.9) / 0.3);
    const dy = (k0) => Math.round((1 - eo(k0)) * 50 / 6) * 6;
    if (A > 0.01) s += `<g opacity="${f1(A)}" transform="translate(0 ${dy(clamp((t - 32.45) / 0.3))})">${T(540, 1100, 'BELAJAR FK,', MC.ivory, 104, 'letter-spacing="2"', 'middle', 800)}${T(540, 1235, 'SATU BAB DULU', GOLD, 104, 'letter-spacing="2"', 'middle', 800)}${R(300, 1285, 480, 12, GOLD)}</g>`;
    if (B > 0.01) s += `<g opacity="${f1(B)}" transform="translate(0 ${dy(clamp((t - 35.9) / 0.3))})">${T(540, 1085, 'GRATIS DI', MC.ivory, 92, 'letter-spacing="3"', 'middle', 800)}${T(540, 1235, 'MEDCOEL.COM', GOLD, 112, 'letter-spacing="2"', 'middle', 800)}${R(210, 1285, 660, 12, GOLD)}</g>`;
  }
  return s;
}

// ------------------------------------------------------------------ cover vertikal (1080 x 1920; isi penting di y 240 - 1680 agar aman terpotong 3:4)
export function sceneCover() {
  const L = sceneLaptop(18.9, true);
  const ui = `<clipPath id="uic"><rect x="170" y="1150" width="740" height="440" rx="0"/></clipPath><g clip-path="url(#uic)"><image href="/video/promo-satu-bab/rekam/web/pilih/f0070.jpg" x="0" y="${1150 - 892}" width="1080" height="1920" preserveAspectRatio="none"/></g><rect x="170" y="1150" width="740" height="440" fill="none" stroke="${INK}" stroke-width="8"/>`;
  const title = `${pixPlate(110, 250, 860, 232, { fill: INK, edge: GOLD, b: 8, c: 18 })}${T(540, 356, 'BELAJAR FK,', MC.ivory, 92, 'letter-spacing="2"', 'middle', 800)}${T(540, 454, 'SATU BAB DULU', GOLD, 92, 'letter-spacing="2"', 'middle', 800)}`;
  const foot = `${pixPlate(120, 1600, 840, 100, { fill: GOLD, edge: INK, b: 6, c: 14 })}${T(540, 1668, 'GRATIS DI MEDCOEL.COM', INK, 58, 'letter-spacing="1"', 'middle', 800)}`;
  const raw = L.top;
  return { back: L.back, mid: L.mid, front: L.front, top: raw + ui + title + foot };
}
