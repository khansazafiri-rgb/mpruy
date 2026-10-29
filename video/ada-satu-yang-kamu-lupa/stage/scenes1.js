// Adegan 1-3 "Ada Satu yang Kamu Lupa": hook, rutinitas FK (montase), siklus kantuk dan belajar malam.
// Tiap adegan: (X) -> svg. X = { t, rk(keys, opts), at(klip, frasa), D }. Semua dihitung dari waktu t.
import { C, clamp, lerp, ease, easeOut, easeInOut, backOut, pop, seg, win, r1, rnd, g, rect, circ, txt, hand, mug, paperStack, clock, qmark, badge, sparkle, checkDot } from './lib.js';
import { W, H, DESK_Y, atDesk, SKIN, person, deskFront, roomNight, roomMorning, wallCalendar, openBook, bookStack, campusWide, corridorBoard, lectureHall, labBench, microscope, examPaper } from './world.js';

const cam = (inner, x, y, k) => g(inner, { x, y, s: k, ox: x, oy: y });
const banner = (label, x, y, p, { size = 64, fill = '#fff', ink = C.forest, rx = 40 } = {}) => {
  const w = 90 + label.length * size * 0.56;
  return g(rect(-w / 2, -size * 0.85, w, size * 1.5, fill, rx, 'stroke="rgba(10,56,48,.18)" stroke-width="4"') + txt(label, 0, size * 0.18, { size, fill: ink, weight: 800 }),
    { x, y, o: clamp(p, 0, 1), s: clamp(p, 0, 1.06) });
};
const thinkBubble = (x, y, w, h, inner, p = 1, tailDX = -w * 0.25) => {
  const st = 'stroke="rgba(10,56,48,.14)" stroke-width="3"';
  const tail = circ(w / 2 + tailDX, h + 30, 14, '#fff', st) + circ(w / 2 + tailDX + 30, h + 72, 22, '#fff', st) + circ(w / 2 + tailDX + 62, h + 122, 30, '#fff', st);
  return g(tail + rect(0, 0, w, h, '#fff', Math.min(h / 2, 70), st) + `<g transform="translate(${w / 2} ${h / 2})">${inner}</g>`, { x, y: y + h / 2, o: clamp(p, 0, 1), s: clamp(p, 0, 1.04), ox: w / 2, oy: h / 2 });
};

/* ------------------------------------------------------------ 1. HOOK 0 - 9.9 */
export function sceneHook(X) {
  const { t } = X, A = X.at;
  const tBesok = A('N1', 'Besok'), tAda = A('N1', 'Ada'), tLupa = A('N1', 'lupakan'), tSadar = A('N1', 'sadar'), tSoal = A('N1', 'soalnya');
  const ring = seg(t, tBesok + 0.05, tBesok + 0.85);
  const cal = wallCalendar(790, 520, { ring, s: 1.12 });
  const back = roomNight(t, { time: null, shelf: false, cal });
  // kamera: dorong ke kalender saat "Besok ujian", lalu kembali ke Raka
  let k = 1, cx = 790, cy = 520;
  if (t > tBesok - 0.35 && t < tAda - 0.1) k = lerp(1, 1.5, easeInOut(seg(t, tBesok - 0.35, tBesok + 0.45))) * 1;
  if (t >= tAda - 0.1 && t < tAda + 0.7) k = lerp(1.5, 1, easeInOut(seg(t, tAda - 0.1, tAda + 0.7)));
  if (t >= tSadar - 0.2) { cx = 430; cy = 700; k = lerp(1, 1.18, easeInOut(seg(t, tSadar - 0.2, tSadar + 1.2))); }
  const keys = [
    [0, 'netral', 'netral', { yaw: 0.65, gazeX: 0.85, blink: 0, lean: 1 }],
    [tBesok + 0.15, 'kaget', 'kaget', { yaw: 0.35, gazeX: 0.6, fxBurst: 0.6 }],
    [tAda - 0.1, 'berpikir', 'berpikir', { gazeX: -0.7, gazeY: 0.1 }],
    [tAda + 0.9, 'berpikir', 'berpikir', { gazeX: 0.7, gazeY: -0.3, tilt: -3 }],
    [tLupa - 0.3, 'berpikir', 'berpikir', { gazeX: -0.4, gazeY: -0.5, tilt: 4 }],
    [tSadar, 'kaget', 'kaget', { yaw: 0, fxBurst: 0.8 }],
    [tSoal + 0.3, 'kaget', 'kaget', { fxBurst: 1, wide: 1 }],
  ];
  const cxR = 400;
  const flip = Math.sin(t * 6) * 3 * (t < 2.6 ? 1 : 0);
  // halaman buku berkibar di awal (langsung ada gerak)
  const bookMove = t < 2.6 ? Math.sin(t * 5) * 3 : 0;
  let props = deskFront() + paperStack(60, DESK_Y, 8, { w: 250 }) + paperStack(780, DESK_Y, 5, { w: 220, tilt: 1.6 }) + openBook(cxR, DESK_Y - 4 + bookMove, 400) + mug(880, DESK_Y - 90, 1, 1, t);
  const raka = X.rk(keys, { ...atDesk(1.4, cxR), uid: 'rk' });
  let s = cam(back + raka + props, cx, cy, k);
  // tanda tanya dan banner pertanyaan (tidak menjawab)
  const qp = pop(t, tLupa - 0.1, 0.4);
  s += qmark(cxR + 190, 520 + Math.sin(t * 3) * 6, 1.1 * clamp(qp, 0, 1), clamp(qp, 0, 1), 10);
  s += qmark(cxR - 200, 590 + Math.sin(t * 3 + 1) * 6, 0.8 * clamp(qp, 0, 1), clamp(qp, 0, 1), -12);
  s += banner('Apa yang kelupaan?', 500, 330, pop(t, tLupa - 0.15, 0.45) * (1 - seg(t, 9.55, 9.85)), { size: 66 });
  // kertas soal tiba-tiba muncul
  const fp = pop(t, tSoal - 0.05, 0.45);
  if (fp > 0.01) s += examPaper(540, 1000 - (1 - clamp(fp, 0, 1)) * 640 + Math.sin(t * 40) * 3 * (1 - clamp(fp, 0, 1)), 560, { glow: 0, s: 0.8 * clamp(fp, 0, 1.05), r: -5, o: clamp(fp, 0, 1) });
  return s;
}

/* ------------------------------------------------------------ 2. RUTINITAS FK 9.9 - 24.84 */
function ospek(X, T0) {
  const { t } = X, u = t - T0;
  const back = campusWide(t, { pan: 0 });
  let crowd = '';
  const xs = [80, 230, 370, 710, 850, 990];
  xs.forEach((x, i) => { crowd += person(x, 1070 + (i % 2) * 18, 0.8, { skin: i, hair: i + 1, shirt: i + 2, look: Math.sin(t * 2 + i) * 0.5, name: 'tag', style: i % 3 }); });
  const waveR = X.rk([[0, 'senang', 'sapa', {}]], { x: 540 - 200 * 0.72, y: 1190 - 778 * 0.72, s: 0.72, uid: 'rk' });
  return cam(back + crowd + waveR, 540, 760, lerp(1, 1.08, clamp(u / 1.1, 0, 1)));
}
function jadwal(X, T0, T1) {
  const { t } = X, A = X.at;
  const fill = seg(t, T0 + 0.15, A('N2', 'kosong') + 0.45);
  const back = corridorBoard(t, { fill });
  const kosong = A('N2', 'kosong');
  const keys = [[0, 'netral', 'netral', { yaw: 0.55, gazeX: 0.8 }], [kosong - 0.1, 'kaget', 'kaget', { yaw: 0.2, fxBurst: 1 }]];
  const raka = X.rk(keys, { x: 540 - 200 * 0.62, y: 1170 - 778 * 0.62, s: 0.62, uid: 'rk' });
  return cam(back + raka, 540, 700, lerp(1, 1.06, clamp((t - T0) / 2, 0, 1)));
}
function slideBlocks(n, colors) {
  let s = rect(40, 36, 380, 34, C.forest, 8) + rect(40, 100, 250, 14, '#C6BDA5', 7) + rect(40, 130, 330, 14, '#C6BDA5', 7);
  for (let i = 0; i < n; i++) s += rect(40 + (i % 3) * 250, 200 + Math.floor(i / 3) * 90, 220, 66, colors[i % colors.length], 14);
  return s;
}
function kuliah(X, T0, { drowsy = 0, overload = 0, nod = 0 } = {}) {
  const { t } = X;
  const cols = ['#9DE0BD', '#F8C038', '#F2A58F', '#9CC8E0'];
  const hall = lectureHall(t, { slide: slideBlocks(Math.round(2 + overload * 7), cols) });
  // teman sebangku (mata terbuka, mencatat)
  let mates = '';
  [[180, 880, 0.95], [900, 880, 0.95]].forEach(([x, y, s], i) => { mates += person(x, y, s, { skin: i + 1, hair: i + 3, shirt: i + 4, look: 0.4, tilt: Math.sin(t * 1.5 + i) * 2, style: i * 2 }); });
  mates += person(110, 740, 0.7, { skin: 3, hair: 0, shirt: 1, look: 0.2 }) + person(970, 740, 0.7, { skin: 0, hair: 4, shirt: 6 }) + person(300, 730, 0.62, { skin: 4, hair: 5, shirt: 3 }) + person(780, 730, 0.62, { skin: 2, hair: 1, shirt: 7, style: 1 });
  const bob = nod ? Math.sin(t * 3.2) * 6 * nod : 0;
  const keys = overload > 0.5
    ? [[0, 'kaget', 'kaget', { fxBurst: 1, wide: 0.9 }]]
    : [[0, 'netral', 'netral', { blink: 0.6 * drowsy, lean: 4 * drowsy, tilt: 10 * drowsy, bob: bob, gazeY: 0.5 * drowsy, browL: { y: 4 * drowsy, rot: 8 * drowsy }, browR: { y: 4 * drowsy, rot: -8 * drowsy }, mouth: { w: 13 - 2 * drowsy, up: 9 - 7 * drowsy, lo: 9 - 6 * drowsy } }]];
  const raka = X.rk(keys, { ...atDesk(1.28, 540, 0), uid: 'rk' });
  const desk = deskFront({ wood: '#B58A5A', woodD: '#8A6A44' }) + openBook(540, DESK_Y - 4 + (nod ? Math.sin(t * 3.2) * 2 : 0), 380, { marks: false });
  return hall + mates + raka + desk;
}
function praktikum(X, T0) {
  const { t } = X;
  const back = labBench(t);
  const keys = [[0, 'berpikir', 'berpikir', { gazeX: 0.5, gazeY: 0.3 }], [T0 + 0.5, 'netral', 'netral', { gazeX: 0.2, gazeY: 0.5 }]];
  const raka = X.rk(keys, { ...atDesk(1.28, 450, 0), uid: 'rk' });
  const bench = rect(0, DESK_Y, W, 56, '#F1EBDD') + rect(0, DESK_Y + 56, W, H - DESK_Y - 56, '#9AA5A8') + rect(0, DESK_Y + 44, W, 12, 'rgba(0,0,0,.12)');
  // tabung reaksi bergoyang
  let tubes = '';
  ['#F2735E', '#9DE0BD', '#F8C038'].forEach((c, i) => { const x = 780 + i * 56; tubes += rect(x, DESK_Y - 150, 34, 150, 'rgba(255,255,255,.6)', 14, 'stroke="#8CA0A6" stroke-width="3"') + rect(x + 4, DESK_Y - 70 - Math.sin(t * 5 + i) * 4, 26, 70 + Math.sin(t * 5 + i) * 4, c, 10); });
  return back + raka + bench + microscope(250, DESK_Y, 0.9) + tubes;
}
function kelompok(X, T0) {
  const { t } = X;
  const u = t - T0;
  let s = rect(0, 0, W, H, '#EFE6D2') + rect(0, DESK_Y, W, H - DESK_Y, C.wood);
  const msgs = [['Siapa kebagian slide 3?', 'l'], ['Deadline besok pagi!', 'l'], ['Revisi lagi ya...', 'l']];
  let bub = '';
  msgs.forEach(([m, side], i) => {
    const p = pop(t, T0 + 0.15 + i * 0.28, 0.3);
    bub += g(rect(0, 0, 560, 110, '#fff', 40, 'stroke="rgba(10,56,48,.12)" stroke-width="3"') + circ(54, 55, 30, ['#9DE0BD', '#F8C038', '#F2A58F'][i]) + txt(m, 98, 68, { size: 34, anchor: 'start', fill: C.ink, weight: 700 }), { x: 330, y: 360 + i * 140 - (1 - clamp(p, 0, 1)) * 40, o: clamp(p, 0, 1), s: clamp(p, 0, 1.04), ox: 0, oy: 55 });
  });
  const keys = [[0, 'netral', 'netral', { yaw: -0.4, gazeX: -0.5 }], [T0 + 0.7, 'kaget', 'kaget', { yaw: -0.2 }]];
  const raka = X.rk(keys, { ...atDesk(1.1, 250, 0), uid: 'rk' });
  return s + bub + badge(920, 340 + Math.sin(u * 8) * 3, '9+', 1.1) + raka + deskFront();
}
function kuis(X, T0) {
  const { t } = X, u = t - T0;
  let s = rect(0, 0, W, H, '#EFE6D2');
  const sweep = seg(t, T0 + 0.1, T0 + 0.9);
  const L = 2 * Math.PI * 130;
  s += g(circ(0, 0, 150, '#fff', 'stroke="rgba(10,56,48,.14)" stroke-width="4"') + `<circle cx="0" cy="0" r="130" fill="none" stroke="${C.coral}" stroke-width="22" stroke-linecap="round" stroke-dasharray="${r1(L)}" stroke-dashoffset="${r1(L * sweep)}" transform="rotate(-90)"/>` + txt('KUIS', 0, 24, { size: 76, fill: C.forest, weight: 800 }), { x: 700, y: 560, s: pop(t, T0, 0.35) });
  s += g(rect(0, 0, 360, 460, '#FFFDF6', 20, 'stroke="#D9CFB4" stroke-width="4"') + [0, 1, 2, 3, 4].map((i) => rect(36, 56 + i * 56, 200 + (i % 3) * 40, 12, '#B8B2A0', 6) + circ(310, 62 + i * 56, 14, i < 3 ? C.mint : '#E8E2D0')).join(''), { x: 100, y: 330, r: -4, o: clamp(pop(t, T0 + 0.1, 0.3), 0, 1) });
  const keys = [[0, 'netral', 'netral', {}], [T0 + 0.35, 'kaget', 'kaget', { fxBurst: 1 }]];
  return s + X.rk(keys, { ...atDesk(1.1, 460, 0), uid: 'rk' }) + deskFront();
}
function malamBab(X, T0, T1) {
  const { t } = X, A = X.at;
  const tMalam = A('N2', 'malam'), tBab = A('N2', 'bab'), tSel = A('N2', 'selesai'), tR = X.D.clips.R1.start;
  // jam bergerak malam: 21:40 -> 23:55
  const m = Math.round(lerp(21 * 60 + 40, 23 * 60 + 55, clamp((t - T0) / (T1 - T0), 0, 1)));
  const time = `${String(Math.floor(m / 60)).padStart(2, '0')}:${String(m % 60).padStart(2, '0')}`;
  const back = roomNight(t, { time });
  // kartu BAB menumpuk di kiri meja
  let babs = '';
  const names = ['Bab 9', 'Bab 10', 'Bab 11', 'Bab 12'];
  names.forEach((n, i) => { const p = pop(t, tMalam + 0.1 + i * 0.35, 0.35); if (p > 0) babs += g(rect(0, 0, 230, 78, ['#F8C038', '#9DE0BD', '#F2A58F', '#9CC8E0'][i], 18) + txt(n, 115, 54, { size: 42, fill: C.forest }), { x: 150 + (i % 2) * 60, y: 560 + i * 94 - (1 - clamp(p, 0, 1)) * 40, r: (i % 2 ? 3 : -3), o: clamp(p, 0, 1), s: clamp(p, 0, 1.05), ox: 115, oy: 39 }); });
  const pb = pop(t, tBab - 0.05, 0.4);
  if (pb > 0) babs += g(rect(0, 0, 250, 86, C.coral, 20) + txt('Bab 13', 125, 60, { size: 46, fill: '#fff' }), { x: 170, y: 560 + 4 * 94 - (1 - clamp(pb, 0, 1)) * 60, r: 4, o: clamp(pb, 0, 1), s: clamp(pb, 0, 1.08), ox: 125, oy: 43 });
  const talk = t >= tR - 0.1;
  const keys = [[0, 'netral', 'netral', { lean: 2, gazeY: 0.5 }], [tBab, 'berpikir', 'berpikir', { gazeX: 0.3, gazeY: 0.4 }], [tR - 0.15, 'menunjuk', 'menunjuk', { yaw: 0, gazeX: 0, gazeY: 0, armR: { wx: 340, wy: 380, ex: 332, ey: 430, finger: 1, fa: -70, front: 1 } }]];
  const props = deskFront() + paperStack(80, DESK_Y, 9, { w: 250 }) + openBook(520, DESK_Y - 4, 400) + mug(840, DESK_Y - 90, 1, 1, t);
  return back + babs + X.rk(keys, { ...atDesk(1.45, 520), uid: 'rk' }) + props;
}

export function sceneRoutine(X, T) {
  const { t } = X, A = X.at;
  const b = [T.start, A('N2', 'jadwalmu') - 0.05, A('N2', 'Kuliah') - 0.05, A('N2', 'praktikum') - 0.05, A('N2', 'tugas') - 0.05, A('N2', 'kuis') - 0.05, A('N2', 'Setiap') - 0.05, T.end];
  if (t < b[1]) return ospek(X, b[0]);
  if (t < b[2]) return jadwal(X, b[1], b[2]);
  if (t < b[3]) return kuliah(X, b[2], {});
  if (t < b[4]) return praktikum(X, b[3]);
  if (t < b[5]) return kelompok(X, b[4]);
  if (t < b[6]) return kuis(X, b[5]);
  return malamBab(X, b[6], b[7]);
}
export const routineBounds = (A, T) => [A('N2', 'jadwalmu') - 0.05, A('N2', 'Kuliah') - 0.05, A('N2', 'praktikum') - 0.05, A('N2', 'tugas') - 0.05, A('N2', 'kuis') - 0.05, A('N2', 'Setiap') - 0.05];

/* ------------------------------------------------------------ 3. SIKLUS 24.84 - 36.05 */
function siklusMalam(X, T0, T1) {
  const { t } = X, A = X.at;
  const u = (t - T0) / (T1 - T0);
  const cyc = u * 2.2;                               // dua putaran hari-malam
  const ph = cyc - Math.floor(cyc);
  const night = ph < 0.5 ? 1 : 0;
  const sky = night ? '#14283A' : '#8CC9E8';
  const m = Math.round((22 * 60 + 20 + cyc * 160) % 1440);
  const time = `${String(Math.floor(m / 60)).padStart(2, '0')}:${String(m % 60).padStart(2, '0')}`;
  // kalender yang halamannya terlepas tiap putaran
  const flipN = Math.floor(cyc), fp = ph;
  let cal = g(rect(0, 0, 230, 260, '#FFFDF6', 18, 'stroke="#D9CFB4" stroke-width="4"') + rect(0, 0, 230, 62, C.coral, 18) + rect(0, 36, 230, 26, C.coral) + txt('UJIAN', 115, 46, { size: 34, fill: '#fff', ls: 3 })
    + [0, 1, 2].map((r) => [0, 1, 2, 3].map((c) => circ(34 + c * 54, 110 + r * 52, 16, '#F1EAD6')).join('')).join(''), { x: 790, y: 420, s: 0.8 });
  // halaman yang terlepas
  const peel = clamp((ph - 0.78) / 0.2, 0, 1);
  if (peel > 0) cal += g(rect(0, 0, 230, 260, '#FFFDF6', 18, 'stroke="#D9CFB4" stroke-width="4"') + rect(0, 0, 230, 62, C.coral, 18), { x: 790 + peel * 40, y: 420 + peel * peel * 700, r: peel * 22, o: 1 - peel * 0.7, s: 0.8 });
  const back = roomNight(t, { time, moon: night > 0, sky, cal: cal, shelf: false }).replace('fill="#14283A" rx="16"', 'fill="' + sky + '" rx="16"');
  // bar jam belajar bertambah
  const bar = g(rect(0, 0, 290, 54, 'rgba(255,255,255,.14)', 27) + rect(0, 0, 90 + 200 * clamp(u * 1.1, 0, 1), 54, C.gold, 27) + txt('jam belajar', 145, 38, { size: 26, fill: C.forest, weight: 800 }), { x: 60, y: 730 });
  const keys = [[0, 'netral', 'netral', { blink: 0.45 * (1 - night * 0.2), lean: 3, tilt: 6, gazeY: 0.5 }]];
  const props = deskFront() + paperStack(80, DESK_Y, 9, { w: 250 }) + openBook(520, DESK_Y - 4, 400) + mug(850, DESK_Y - 90, 1, 1, t);
  return back + bar + X.rk(keys, { ...atDesk(1.45, 520), uid: 'rk' }) + props;
}
function bersalah(X, T0, T1) {
  const { t } = X, A = X.at;
  const tSeb = A('N3', 'sebentar'), tSalah = A('N3', 'bersalah');
  const back = roomNight(t, { time: '00:50' });
  const reach = seg(t, tSeb - 0.6, tSeb + 0.2) * (1 - seg(t, tSeb + 0.8, tSeb + 1.5));
  const keys = [[0, 'berpikir', 'berpikir', { blink: 0.3 }],
    [tSeb - 0.5, 'netral', 'netral', { armR: { wx: 330 - 30 * 0, wy: 560, ex: 318, ey: 500, finger: 0, fa: -90, front: 1 }, gazeY: 0.6 }],
    [tSeb + 0.2, 'sedih', 'netral', { armR: { wx: 250, wy: 612, ex: 300, ey: 540, finger: 0, fa: -90, front: 1 }, gazeY: 0.6, lean: -2 }],
    [tSeb + 1.1, 'sedih', 'berpikir', { gazeY: 0.5 }],
    [tSalah - 0.1, 'sedih', 'netral', { lean: 4, tilt: -6, bob: 6, gazeY: 0.7 }]];
  // daftar tugas yang belum dicentang (bubble pikiran)
  const bp = pop(t, tSeb + 0.35, 0.4);
  const list = [0, 1, 2].map((i) => rect(-130, -64 + i * 46, 36, 36, '#fff', 8, 'stroke="#B8B2A0" stroke-width="4"') + rect(-80, -52 + i * 46, 190 - i * 36, 12, '#B8B2A0', 6)).join('');
  const bubble = thinkBubble(780, 300, 340, 210, list, bp, -60);
  // beban rasa bersalah turun ke bahu
  const wp = pop(t, tSalah - 0.1, 0.5);
  const cloud = g(circ(-80, 0, 60, '#4A5568') + circ(0, -24, 78, '#4A5568') + circ(86, 6, 58, '#4A5568') + rect(-130, 4, 260, 56, '#4A5568', 28) + txt('bab', 0, 40, { size: 40, fill: '#CBD2DC', weight: 800 }), { x: 520, y: 380 + 160 * clamp(wp, 0, 1), o: clamp(wp, 0, 1), s: 0.9 });
  const props = deskFront() + paperStack(80, DESK_Y, 10, { w: 250 }) + openBook(520, DESK_Y - 4, 400) + mug(850, DESK_Y - 90, 1, 1, t);
  return back + X.rk(keys, { ...atDesk(1.45, 520), uid: 'rk' }) + props + bubble + cloud;
}
export function sceneCycle(X, T) {
  const { t } = X, A = X.at;
  const b = [T.start, A('N3', 'matamu') - 0.05, A('N3', 'Kamu') - 0.05, A('N3', 'Jadi') - 0.05, A('N3', 'Berhenti') - 0.05, T.end];
  if (t < b[1]) {   // pagi: sinar masuk, Raka melangkah ke kelas
    const u = (t - b[0]);
    const back = roomMorning(t);
    const keys = [[0, 'netral', 'netral', { blink: 0.55, lean: 3, tilt: 7, gazeY: 0.5, mouth: { w: 12, up: 3, lo: 3 } }]];
    return back + X.rk(keys, { ...atDesk(1.45, 520), uid: 'rk' }) + deskFront({ wood: '#B58A5A', woodD: '#8A6A44' }) + paperStack(80, DESK_Y, 9, { w: 250 }) + mug(850, DESK_Y - 90, 1, 1, t);
  }
  if (t < b[2]) return kuliah(X, b[1], { drowsy: 1, nod: 1 });
  if (t < b[3]) return kuliah(X, b[2], { overload: seg(t, b[2], b[2] + 1.2), drowsy: 0 });
  if (t < b[4]) return siklusMalam(X, b[3], b[4]);
  return bersalah(X, b[4], b[5]);
}
export const cycleBounds = (A) => [A('N3', 'matamu') - 0.05, A('N3', 'Kamu') - 0.05, A('N3', 'Jadi') - 0.05, A('N3', 'Berhenti') - 0.05];
