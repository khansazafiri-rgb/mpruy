// Adegan video "Bayangin kamu jadi anak FK". Tiap adegan: (X) -> { svg, cam? }
//   X = { t, D, rk(keys, opts), at(klip, frasa), q (soal dari rekaman web), W, H }
//   rk(...) menggambar Raka KANONIK dari brand/characters/raka/raka.js (state diinterpolasi dari keyframe).
import { C, clamp, lerp, ease, easeOut, easeInOut, backOut, pop, seg, win, r1, rnd, g, rect, circ, txt, hand, laptop, paperStack, folder, mug, clock, phone, wallet, notePage, chatBubble, badge, qmark, sparkle, checkDot } from './lib.js';

export const W = 1080, H = 1920, DESK_Y = 1330;
const RAKA_DESK = { x: 200, y: 344, s: 1.7 };            // pinggang Raka tepat di tepi meja
const RAKA_STAND = { x: 230, y: 274, s: 1.55 };          // berdiri, kaki di y = 1480
export const FLOOR_Y = 1480;
/** Posisi Raka di balik meja: pinggang (y=580 pada koordinat Raka) tepat di tepi meja; cx = titik tengah badan di layar. */
const atDesk = (s = 1.7, cx = 540) => ({ x: cx - 200 * s, y: DESK_Y - 580 * s, s });

/* ------------------------------------------------------------ latar */
function wallNight(t, { time = '02:00', windowOn = true } = {}) {
  let s = rect(0, 0, W, DESK_Y, C.night2) + rect(0, 0, W, 760, C.night) + rect(0, 756, W, 6, 'rgba(255,255,255,.05)');
  if (windowOn) {
    s += rect(70, 190, 300, 430, '#0F1E2C', 26) + rect(90, 210, 260, 390, '#14283A', 16);
    s += circ(280, 320, 46, '#F4EBD8') + circ(300, 306, 40, '#14283A');
    for (let i = 0; i < 9; i++) s += circ(110 + rnd(i) * 220, 240 + rnd(i + 5) * 330, 3 + rnd(i + 2) * 3, '#fff', `opacity="${r1(0.35 + 0.4 * Math.sin(t * 2 + i))}"`);
    s += rect(215, 190, 8, 430, '#0F1E2C') + rect(70, 395, 300, 8, '#0F1E2C');
  }
  s += clock(690, 230, time);
  s += rect(700, 470, 300, 14, C.woodD, 4);
  const cols = ['#E8665F', '#F8C038', '#9DE0BD', '#6BA3C4', '#E8665F', '#F4EBD8'];
  for (let i = 0; i < 6; i++) s += rect(716 + i * 42, 470 - 90 - (i % 3) * 14, 34, 90 + (i % 3) * 14, cols[i], 5);
  s += `<polygon points="860,860 560,${DESK_Y} 1060,${DESK_Y}" fill="${C.lamp}" opacity=".10"/>`;
  s += `<g transform="translate(990 ${DESK_Y})"><path d="M0 -10L-40 -300" stroke="#2A3446" stroke-width="12" stroke-linecap="round"/><path d="M-40 -300L-10 -520" stroke="#2A3446" stroke-width="12" stroke-linecap="round"/>`
    + `<path d="M-64 -520q50 -44 112 0l-14 46h-84z" fill="#2A3446"/><ellipse cx="-8" cy="-472" rx="52" ry="12" fill="${C.lamp}"/></g>`;
  return s;
}
function deskTop() {
  let s = rect(0, DESK_Y, W, 70, C.wood) + rect(0, DESK_Y + 70, W, H - DESK_Y - 70, C.woodD) + rect(0, DESK_Y + 56, W, 14, 'rgba(0,0,0,.14)');
  return s;
}
function roomDay(t, { sky = C.sky, wall = C.wall, floor = '#C9B58F', windows = true, scroll = 0 } = {}) {
  let s = rect(0, 0, W, H, wall) + rect(0, FLOOR_Y - 40, W, H - FLOOR_Y + 40, floor) + rect(0, FLOOR_Y - 40, W, 12, 'rgba(0,0,0,.08)');
  if (windows) for (let i = -1; i < 4; i++) {
    const x = ((i * 380 - scroll) % 1520 + 1520) % 1520 - 380;
    s += rect(x + 40, 160, 240, 520, sky, 22) + rect(x + 154, 160, 12, 520, wall) + rect(x + 40, 400, 240, 12, wall) + rect(x + 28, 148, 264, 18, '#fff', 9, 'opacity=".7"');
  }
  return s;
}

/* ------------------------------------------------------------ properti khusus */
function notif(x, y, w, title, sub, color, icon, o = 1, s = 1) {
  const ic = {
    cal: rect(-14, -10, 28, 26, '#fff', 5) + rect(-14, -10, 28, 8, 'rgba(0,0,0,.25)', 4),
    doc: rect(-12, -16, 24, 32, '#fff', 4) + rect(-7, -8, 14, 3, color) + rect(-7, 0, 14, 3, color) + rect(-7, 8, 9, 3, color),
    mega: `<path d="M-16 -4h10l16 -12v32l-16 -12h-10z" fill="#fff"/>`,
    ppl: circ(-8, -8, 7, '#fff') + circ(9, -6, 6, '#fff') + rect(-17, 2, 18, 12, '#fff', 6) + rect(1, 3, 16, 11, '#fff', 6),
  }[icon] || '';
  return g(rect(0, 0, w, 118, '#fff', 30, 'stroke="rgba(10,56,48,.12)" stroke-width="2"') + rect(18, 19, 80, 80, color, 24) + `<g transform="translate(58 59)">${ic}</g>`
    + txt(title, 118, 56, { size: 34, anchor: 'start', fill: C.ink }) + txt(sub, 118, 92, { size: 27, anchor: 'start', fill: '#6B7A82', weight: 600 }), { x, y, s, o });
}
function termChip(x, y, label, color = C.mint, o = 1, s = 1, r = 0) {
  const w = 38 + label.length * 21;
  return g(rect(0, 0, w, 66, color, 22) + txt(label, w / 2, 46, { size: 32, fill: C.forest }), { x, y, o, s, r, ox: w / 2, oy: 33 });
}

export function qlayout(q) {
  const words = q.stem.split(' ');
  let lines = [], cur = '';
  for (const wd of words) { if ((cur + ' ' + wd).trim().length > 34) { lines.push(cur.trim()); cur = wd; } else cur += ' ' + wd; }
  if (cur.trim()) lines.push(cur.trim());
  const lh = 44, h0 = 110 + lines.length * lh;
  return { lines, lh, h0, h: h0 + q.options.length * 74 + 30 };
}
/** Kartu soal (dari rekaman web). jumble 0..1 mengacak kata. */
function questionCard(x, y, w, q, { jumble = 0, o = 1, s = 1, pick = -1, hi = -1, hiO = 1 } = {}) {
  const { lines, lh, h0, h } = qlayout(q);
  let body = rect(0, 0, w, h, '#fff', 36, 'stroke="rgba(10,56,48,.14)" stroke-width="3"') + txt('SOAL', 36, 54, { size: 26, fill: C.green, anchor: 'start', ls: 3 });
  let k = 0;
  lines.forEach((ln, li) => {
    let xx = 36;
    ln.split(' ').forEach((wd) => {
      const wdW = wd.length * 19 + 12; const j = jumble;
      const dx = (rnd(k * 3 + 1) - 0.5) * 120 * j, dy = (rnd(k * 3 + 2) - 0.5) * 90 * j, rot = (rnd(k * 3 + 3) - 0.5) * 50 * j;
      body += g(txt(wd, 0, 0, { size: 32, anchor: 'start', fill: j > 0.3 ? (k % 3 === 0 ? C.coral : C.ink) : C.ink, weight: 700 }), { x: xx + dx, y: 108 + li * lh + dy, r: rot });
      xx += wdW; k++;
    });
  });
  q.options.forEach((op, i) => {
    const yy = h0 + i * 74 + 6, hit = pick === i;
    const dx = (rnd(40 + i) - 0.5) * 80 * jumble, dy = (rnd(50 + i) - 0.5) * 50 * jumble, rot = (rnd(60 + i) - 0.5) * 16 * jumble;
    const good = hi === i ? hiO : 0;
    body += g(rect(30, 0, w - 60, 62, hit ? '#FDE7E3' : (good > 0.5 ? '#E3F6EC' : '#F7F2E4'), 18, good > 0 ? `stroke="${C.green}" stroke-width="${r1(6 * good)}"` : '') + circ(66, 31, 20, hit ? C.coral : (good > 0.5 ? C.green : C.mint)) + txt('ABCDE'[i], 66, 42, { size: 26, fill: hit || good > 0.5 ? '#fff' : C.forest }) + txt(op, 104, 42, { size: 30, anchor: 'start', weight: 600 })
      + (good > 0 ? checkDot(w - 100, 31, 0.95 * good, good) : ''), { x: dx, y: yy + dy, r: rot });
  });
  return g(body, { x, y, o, s, ox: w / 2, oy: h / 2 });
}

/* ------------------------------------------------------------ S1 HOOK 0 - 6.6 */
export function sceneHook(X) {
  const { t } = X, cx = 230, cy = 1170, PW = 330, PH = 392;
  const kFull = 3.72;
  let k;
  if (t < 1.1) k = kFull; else if (t < 2.9) k = lerp(kFull, 1, easeInOut(seg(t, 1.1, 2.9))); else if (t < 4.5) k = 1; else k = lerp(1, kFull, easeInOut(seg(t, 4.5, 5.0)));
  const near = seg(k, 1, kFull);
  const px = lerp(cx, 540, near), py = lerp(cy, 840, near);
  const speaking = t >= 4.9;
  const inner = X.rk([[0, 'senang', 'netral', { yaw: 0.0 }], [4.5, 'senang', 'senang', {}]], { x: 53, y: 41, s: 0.46, uid: 'ph', speak: speaking });
  const photo = g(polaroid(inner, { w: PW, h: PH }), { x: cx, y: cy, r: -5, ox: PW / 2, oy: PH / 2 });
  const back = wallNight(t);
  const onDesk = deskTop() + paperStack(120, DESK_Y, 9, { w: 250 }) + paperStack(330, DESK_Y, 4, { w: 210, tilt: 1.6 }) + mug(940, DESK_Y - 84, 1, 1, t);
  const lap = g(rect(0, 0, 360, 230, '#2A3446', 20) + rect(18, 18, 324, 194, '#33405A', 12) + circ(180, 115, 46, '#EAF6EE') + `<image href="/apps/web/src/assets/logo-mark.webp" x="144" y="79" width="72" height="72"/>`, { x: 600, y: DESK_Y - 232 }) + rect(580, DESK_Y - 10, 400, 18, '#3A455B', 9);
  const raka = X.rk([[0, 'berpikir', 'berpikir', { blink: 0.5, tilt: 5, lean: 2 }]], { ...RAKA_DESK, uid: 'rk' });
  return { svg: g(back + raka + onDesk + lap + photo, { x: px, y: py, s: k, ox: cx, oy: cy }) };
}
function polaroid(rakaInner, { w = 330, h = 392, label = 'Hari pertama FK' } = {}) {
  const pw = w - 40;
  let s = rect(0, 0, w, h, '#FFFDF6', 12, 'stroke="#E5DCC4" stroke-width="3"');
  s += `<svg x="20" y="20" width="${pw}" height="${pw}" viewBox="0 0 ${pw} ${pw}" overflow="hidden">`
    + rect(0, 0, pw, pw, '#BFE3F2') + rect(0, pw * 0.7, pw, pw * 0.3, '#CDE8C4')
    + rect(pw * 0.04, pw * 0.2, pw * 0.2, pw * 0.5, '#E8D6B0', 6) + rect(pw * 0.76, pw * 0.2, pw * 0.2, pw * 0.5, '#E8D6B0', 6) + rect(pw * 0.04, pw * 0.1, pw * 0.92, pw * 0.11, C.forest, 6)
    + txt('FK UNIVERSITAS', pw / 2, pw * 0.185, { size: 18, fill: C.cream, weight: 800, ls: 4 })
    + rakaInner + `</svg>`;
  s += hand(label, w / 2, h - 28, { size: 40, fill: '#3A4A57' });
  return s;
}

/* ------------------------------------------------------------ S2 grup chat, 6.6 - 17.6 */
export function sceneChat(X) {
  const { t } = X;
  let back = roomDay(t, { scroll: 0 });
  const tN = (p) => X.at('N02', p);
  const items = [
    [tN('Jadwal ospek'), 'Jadwal ospek', 'Grup angkatan', C.green, 'cal', 80, 330],
    [tN('tugas'), 'Tugas pertama', 'Grup angkatan', C.coral, 'doc', 560, 390],
    [tN('pengumuman'), 'Pengumuman', 'Grup angkatan', C.gold, 'mega', 70, 690],
    [tN('nama-nama'), 'Nama-nama baru', 'Grup angkatan', '#6BA3C4', 'ppl', 520, 880],
  ];
  const tSpam = tN('notifikasi sudah');
  let over = '';
  items.forEach(([t0, a, b, col, ic, x, y], i) => { const p = pop(t, t0, 0.42); if (p > 0) over += notif(x, y + (1 - p) * 30 + Math.sin(t * 2 + i) * 5, 450, a, b, col, ic, clamp(p, 0, 1), 0.92 + 0.08 * p); });
  // notifikasi membanjir
  const sp = seg(t, tSpam, tSpam + 3.6);
  const n = Math.floor(sp * 14);
  for (let i = 0; i < n; i++) {
    const t0 = tSpam + i * 0.24, p = pop(t, t0, 0.3);
    over += notif(30 + rnd(i + 11) * 580, (i % 2 ? 250 + rnd(i + 21) * 220 : 840 + rnd(i + 21) * 260), 450, ['Tugas', 'Info', 'Jadwal', 'Revisi', 'Reminder'][i % 5], 'Grup angkatan', [C.green, C.coral, C.gold, '#6BA3C4'][i % 4], ['cal', 'doc', 'mega', 'ppl'][i % 4], clamp(p, 0, 1) * 0.96, 0.9 + 0.1 * Math.min(1, p));
  }
  const cnt = Math.min(99, Math.floor(seg(t, tSpam, tSpam + 3.8) * 120));
  if (cnt > 0) over += badge(930, 330, cnt >= 99 ? '99+' : String(cnt), 1 + 0.15 * Math.sin(t * 9));
  const rl = X.at('N02', 'letak');
  const qs = pop(t, rl, 0.3) * (1 - seg(t, tSpam - 0.1, tSpam + 0.2));
  if (qs > 0) over += qmark(750, 620 - qs * 30, 1.1, clamp(qs, 0, 1)) + qmark(330, 520, 0.8, clamp(qs, 0, 1), -10);
  const r02 = X.D.clips.R02.start;
  const keys = [[0, 'senang', 'sapa', {}], [rl - 0.1, 'berpikir', 'berpikir', { gazeX: -0.6, gazeY: -0.5 }], [tSpam, 'kaget', 'kaget', {}], [r02 - 0.2, 'sedih', 'berpikir', { gazeX: 0.4 }]];
  return { svg: back + X.rk(keys, { ...RAKA_STAND, uid: 'rk' }) + over };
}

/* ------------------------------------------------------------ S3 ritme -> bulan pertama, 17.6 - 38.1 */
export function sceneMonth1(X) {
  const { t } = X;
  const tPagi = X.at('N03', 'Pagi berangkat'), tPulang = X.at('N03', 'pulang membawa'), tMalam = X.at('N03', 'malam membuka'), tBulan = X.at('N03', 'Bulan pertama'), tFolder = X.at('N03', 'Folder kuliah'), tMenandai = X.at('N03', 'Kamu menandai');
  const r03 = X.D.clips.R03.start;
  // fase hari: ritme (siang) -> pagi -> sore -> malam -> meja
  if (t < tMalam) {
    const morning = seg(t, tPagi - 0.3, tPagi + 0.4), evening = seg(t, tPulang - 0.3, tPulang + 0.3);
    const sky = morning < 1 && evening === 0 ? (morning > 0 ? '#FFE6A8' : C.sky) : (evening > 0 ? '#F9B98B' : '#FFE6A8');
    const wall = t < tPagi - 0.3 ? C.wall : (evening > 0 ? '#EBCFA9' : '#F3E6C4');
    const scroll = Math.max(0, t - (tPagi - 0.3)) * 360;
    let back = roomDay(t, { sky, wall, scroll });
    // matahari / bulan
    const sun = t < tPulang - 0.3 ? circ(880, 250, 90 + 6 * Math.sin(t * 3), '#F8C038') : circ(880, 300, 100, '#F26B4E');
    back += t >= tPagi - 0.3 ? sun : '';
    let over = '';
    if (t < tPagi) {  // ritme: lima titik berdenyut berurutan
      for (let i = 0; i < 5; i++) { const ph = (t * 1.9 - i * 0.28); const sc = 1 + 0.35 * Math.max(0, Math.sin(ph * 3.14)); over += circ(250 + i * 145, 1620, 26 * sc, i % 2 ? C.green : C.teal, `opacity=".9"`); }
    }
    if (t >= tPulang) {  // membawa cerita: gelembung ikon
      const p = pop(t, tPulang + 0.2, 0.4);
      over += g(rect(0, 0, 250, 170, '#fff', 40) + txt('...', 125, 108, { size: 90, fill: C.green }) + `<path d="M80 168l-26 46l66 -26z" fill="#fff"/>`, { x: 700, y: 820, s: clamp(p, 0, 1.1), o: clamp(p, 0, 1), ox: 125, oy: 170 });
      over += sparkle(930, 800, 0.8 * clamp(p, 0, 1), C.gold) + sparkle(640, 760, 0.6 * clamp(p, 0, 1), C.coral);
    }
    const bob = t >= tPagi ? Math.sin(t * 9) * 7 : 0;
    const raka = X.rk([[0, 'netral', 'netral', {}], [tPagi, 'senang', 'netral', { lean: 2 }], [tPulang, 'senang', 'senang', { lean: -1 }]], { ...RAKA_STAND, y: RAKA_STAND.y + Math.abs(bob), uid: 'rk' });
    return { svg: back + raka + over };
  }
  // malam: meja, materi menumpuk; lalu bulan pertama
  const wall = wallNight(t, { time: t < tBulan ? '23:40' : '00:50' });
  const stacks = Math.floor(2 + seg(t, tMalam, tBulan) * 12 + seg(t, tBulan, tMenandai) * 4);
  let items = deskTop() + paperStack(50, DESK_Y, stacks, { w: 240 }) + paperStack(260, DESK_Y, Math.max(2, Math.floor(stacks * 0.6)), { w: 190, tilt: 1.6 });
  // folder muncul di dinding setelah "Folder kuliah bertambah"
  const labels = ['Anatomi', 'Fisiologi', 'Biokimia', 'Histologi', 'Biologi sel', 'Embriologi'];
  const cols = ['#E8665F', '#F8C038', '#6BA3C4', '#55C79D', '#B58DE0', '#F59E5B'];
  let fl = '';
  labels.forEach((lb, i) => { const p = pop(t, tFolder + i * 0.22, 0.4); if (p > 0 && t < tMenandai + 0.2) fl += g(folder(0, 0, 210, 150, cols[i], lb), { x: 130 + (i % 2) * 40, y: 470 + i * 120 - (1 - p) * 60, r: (i % 2 ? 4 : -4), o: clamp(p, 0, 1), s: clamp(p, 0, 1.08), ox: 105, oy: 75 }); });
  // halaman catatan yang disorot
  let page = '';
  if (t >= tMenandai - 0.2) {
    const cnt = Math.floor(seg(t, tMenandai, r03 - 0.1) * 11);
    const marks = {}; const mc = [C.gold, '#9DE0BD', '#F9A7A0', '#A9D4F5'];
    for (let i = 0; i < Math.min(cnt, 11); i++) marks[i] = mc[i % 4];
    const p = pop(t, tMenandai - 0.2, 0.45);
    page = g(notePage(0, 0, 640, 760, 12, marks, 3), { x: 270, y: 700 - (1 - p) * 40, r: -3, o: clamp(p, 0, 1), s: 0.8 * clamp(p, 0.2, 1.04), ox: 320, oy: 380 });
  }
  const mood = t < tBulan ? [[0, 'kaget', 'netral', { blink: 0.2 }]] : [[tBulan, 'berpikir', 'berpikir', {}], [tMenandai, 'berpikir', 'senang', { gazeX: -0.4 }], [r03 - 0.2, 'kaget', 'kaget', {}]];
  return { svg: wall + fl + X.rk(mood, { ...atDesk(1.7, 730), uid: 'rk' }) + items + page };
}

/* ------------------------------------------------------------ S4 bulan kedua, 38.6 - 55.8 */
export function sceneMonth2(X) {
  const { t, q } = X;
  const tBaca = X.at('N04', 'Kamu baca'), tSoal = X.at('N04', 'Begitu mencoba'), tCampur = X.at('N04', 'mendadak'), tFile = X.D.clips.N04.start + 1.9;
  const r04 = X.D.clips.R04.start, nEnd = X.D.clips.N04.end;
  const wall = wallNight(t, { time: t < tBaca ? '20:30' : (t < tSoal ? '01:10' : '02:00') });
  let behind = '';
  if (t < tBaca) {   // ponsel: grup ramai, lalu pencarian satu file
    const files = ['Materi_final.pdf', 'Materi_final_REVISI.pdf', 'fix_beneran_2.pdf', 'Catatan anatomi (1).pdf', 'Slide minggu 3.pptx', 'Materi_final_FIX.pdf'];
    const sw = seg(t, tFile, tFile + 0.35);
    const search = rect(0, 0, 400, 800, '#F7F2E4') + rect(0, 0, 400, 90, C.forest) + txt('Cari file', 28, 58, { size: 34, fill: '#fff', anchor: 'start' })
      + files.map((f, i) => rect(16, 110 + i * 86, 368, 70, i === 2 ? '#FFF0C2' : '#fff', 18) + txt(f, 34, 154 + i * 86, { size: 25, anchor: 'start', weight: 600 })).join('');
    const screen = sw < 1 ? chatList(t, 400) : search;
    behind += phone(40, 330, 456, 880, screen);
    if (sw >= 1) behind += g(`<circle cx="0" cy="0" r="40" fill="none" stroke="${C.coral}" stroke-width="12"/><path d="M28 28l44 44" stroke="${C.coral}" stroke-width="14" stroke-linecap="round"/>`, { x: 250 + Math.sin(t * 2.4) * 40, y: 540 + ((Math.sin(t * 3) * 0.5 + 0.5) * 4) * 86 });
  }
  const pos = (() => { const k = ease(seg(t, tSoal - 0.2, tSoal + 0.5)); const s = lerp(1.7, 1.25, k), cx = lerp(730, 540, k); return atDesk(s, cx); })();
  let desk = deskTop() + (t < tSoal ? paperStack(520, DESK_Y, t < tBaca ? 3 : 16, { w: 250 }) : '');
  let card = '';
  if (t >= tSoal - 0.1) {
    const pp = pop(t, tSoal, 0.5), jum = seg(t, tCampur - 0.4, tCampur + 1.2) * (t < nEnd + 0.05 ? 1 : Math.max(0, 1 - seg(t, nEnd + 0.1, nEnd + 0.8)));
    const shrink = ease(seg(t, nEnd + 0.15, nEnd + 0.9));          // setelah "campur aduk": soal mengecil ke pojok
    const wob = t > tCampur ? Math.sin(t * 7) * 3 * jum : 0;
    card = questionCard(lerp(540, 300, shrink), 380 + wob, 860, q, { jumble: jum, o: clamp(pp, 0, 1) * lerp(1, 0.9, shrink), s: 0.8 * lerp(0.62 + 0.38 * clamp(pp, 0, 1), 0.52, shrink) });
    if (t >= tCampur - 0.2 && t < nEnd + 0.9) {
      const tm = ['skafoideum', 'lunatum', 'N. medianus', 'kapitatum', 'retrograd', 'avaskular', 'humerus', 'M. biseps', 'ulnaris', 'radius'];
      tm.forEach((w, i) => { const pr = clamp(seg(t, tCampur + i * 0.06, tCampur + 0.9), 0, 1); const fade = 1 - seg(t, nEnd + 0.1, nEnd + 0.9); card += termChip(60 + rnd(i + 70) * 760 + Math.sin(t * 2 + i) * 30, 120 + rnd(i + 90) * 560 + Math.cos(t * 2.3 + i) * 30, w, i % 2 ? '#F8D26B' : '#F9A7A0', pr * fade * 0.95, 1, (rnd(i + 5) - 0.5) * 40); });
    }
  }
  let bubble = '';
  if (t >= r04 - 0.3) {
    const p = pop(t, r04 - 0.1, 0.5), dots = Math.floor(((t - r04) * 1.6) % 4);
    bubble = g(rect(0, 0, 400, 210, '#fff', 105) + `<path d="M150 208l-38 62l84 -40z" fill="#fff"/>` + txt('.'.repeat(Math.max(1, dots)), 200, 150, { size: 190, fill: '#9AA8B0', weight: 800, ls: 6 }), { x: 600, y: 520, s: clamp(p, 0, 1), o: clamp(p, 0, 1), ox: 200, oy: 210 });
  }
  const keys = [[0, 'berpikir', 'berpikir', { gazeX: -0.5, gazeY: 0.2 }], [tBaca, 'sedih', 'berpikir', { blink: 0.45, tilt: 4 }], [tSoal, 'berpikir', 'berpikir', { gazeX: 0, gazeY: -0.3 }], [tCampur - 0.2, 'kaget', 'kaget', { wide: 0.5 }], [nEnd, 'sedih', 'netral', { gazeY: -0.2 }], [r04, 'sedih', 'netral', { gazeX: 0.0, gazeY: -0.6, tilt: 4 }]];
  return { svg: wall + behind + X.rk(keys, { ...pos, uid: 'rk' }) + desk + card + bubble };
}
function chatList(t, w = 432) {
  let s = rect(0, 0, w, 872, '#F7F2E4') + rect(0, 0, w, 90, C.forest) + txt('Grup Angkatan', 28, 58, { size: 34, fill: '#fff', anchor: 'start' });
  const msgs = ['Info jadwal!', 'Ada yang punya slide?', 'Tugas dikumpul besok', 'Materi baru ya', 'Cek pengumuman', 'Revisi jadwal', 'Ruang pindah', 'Ada kuis dadakan?', 'Kumpul kelompok', 'File dikirim'];
  const off = (t * 220) % 110;
  for (let i = 0; i < 10; i++) { const yy = 110 + i * 110 - off; s += chatBubble(16 + (i % 2) * 30, yy, 350, 78, msgs[(i + Math.floor(t * 2)) % msgs.length], { side: i % 2 ? 'r' : 'l', avatar: [C.mint, C.gold, C.coral][i % 3], size: 26 }); }
  return s;
}

/* ------------------------------------------------------------ S5 akhir tahun pertama, 55.8 - 64 */
export function sceneYear1(X) {
  const { t } = X;
  const tAkhir = X.at('N05', 'Akhir tahun'), tTapi = X.at('N05', 'Tapi setiap');
  const tTahun2 = X.at('N05', 'Masuk tahun');
  let back = roomDay(t, { sky: '#CDE9F0', wall: '#F3EBD7', windows: true, scroll: t * 16 });
  let over = '';
  // istilah yang sudah dikenali: centang bermunculan
  const terms = ['Fraktur skafoid', 'N. medianus', 'Pleksus brakialis', 'Os lunatum', 'M. biseps brakii'];
  terms.forEach((w, i) => {
    const p = pop(t, tAkhir + 0.8 + i * 0.55, 0.4);
    if (p <= 0) return;
    const x = 590, y = 250 + i * 96;
    over += g(rect(0, 0, 400, 80, '#fff', 26, 'stroke="rgba(10,56,48,.12)" stroke-width="2"') + txt(w, 24, 52, { size: 32, anchor: 'start', weight: 700 }) + `<g transform="translate(360 40)">${checkDot(0, 0, 1)}</g>`, { x, y: y + (1 - p) * 20, o: clamp(p, 0, 1), s: 0.92 });
  });
  // kalender ujian yang terus bergeser + materi baru menumpuk
  const cal = pop(t, tTapi, 0.4);
  if (cal > 0) {
    const sh = seg(t, tTapi + 0.5, tTapi + 2.0);
    let c = rect(0, 0, 440, 380, '#fff', 30, 'stroke="rgba(10,56,48,.14)" stroke-width="3"') + rect(0, 0, 440, 78, C.coral, 30) + rect(0, 40, 440, 38, C.coral) + txt('Ujian', 220, 56, { size: 38, fill: '#fff' });
    for (let r = 0; r < 4; r++) for (let k = 0; k < 7; k++) c += circ(44 + k * 58, 126 + r * 62, 20, '#F1EAD6');
    const px = 44 + (3 + Math.round(sh * 3)) % 7 * 58, py = 126 + (1 + Math.floor((3 + Math.round(sh * 3)) / 7) + 0) * 62;
    c += circ(px, py, 24, C.coral) + circ(44 + 3 * 58, 126 + 62, 20, 'none', `stroke="${C.coral}" stroke-width="5" opacity="${r1(1 - sh)}" stroke-dasharray="6 6"`);
    over += g(c, { x: 790, y: 950, o: clamp(cal, 0, 1), s: 0.9 * clamp(cal, 0, 1.04), ox: 220, oy: 190 });
    const nm = Math.floor(seg(t, tTapi + 0.4, tTahun2) * 4);
    for (let i = 0; i < nm; i++) { const p = pop(t, tTapi + 0.6 + i * 0.5, 0.35); over += g(folder(0, 0, 200, 140, ['#B58DE0', '#F59E5B', '#6BA3C4', '#E8665F'][i], 'Materi baru'), { x: 660 + i * 50, y: 1290 - i * 24 - (1 - p) * 120, r: -4 + i * 3, o: clamp(p, 0, 1), s: 0.9 }); }
  }
  const keys = [[0, 'netral', 'netral', {}], [tAkhir + 0.7, 'senang', 'netral', { gazeX: 0.2 }], [tTapi, 'kaget', 'kaget', { wide: 0.3 }], [tTapi + 1.8, 'berpikir', 'berpikir', { gazeX: 0.3, gazeY: -0.3 }]];
  return { svg: back + X.rk(keys, { ...RAKA_STAND, x: RAKA_STAND.x - 240, uid: 'rk' }) + over };
}

/* ------------------------------------------------------------ S6 tahun kedua, 64 - 73.4 */
export function sceneYear2(X) {
  const { t, q } = X;
  const tT2 = X.at('N05', 'Masuk tahun'), tAna = X.at('N05', 'anatomi'), tFis = X.at('N05', 'fisiologi'), tFar = X.at('N05', 'farmakologi');
  const r05 = X.D.clips.R05.start;
  let s = rect(0, 0, W, H, '#F3EBD7') + rect(0, FLOOR_Y - 40, W, H - FLOOR_Y + 40, '#C9B58F') + rect(0, 0, W, 520, '#E4F1EA');
  // satu soal di tengah, tiga mata kuliah terhubung
  const p = pop(t, tT2 + 0.3, 0.5);
  const cx = 540, cy = 640;
  let lines = '', nodes = '';
  const nd = [[tAna, 'Anatomi', 190, 360, C.green], [tFis, 'Fisiologi', 400, 960, '#4C8FD0'], [tFar, 'Farmakologi', 890, 360, C.coral]];
  nd.forEach(([t0, lb, x, y, col]) => {
    const pr = pop(t, t0 - 0.2, 0.45), grow = seg(t, t0 - 0.1, t0 + 0.6);
    if (pr <= 0) return;
    lines += `<path d="M${cx} ${cy} L${r1(lerp(cx, x, easeOut(grow)))} ${r1(lerp(cy, y, easeOut(grow)))}" stroke="${col}" stroke-width="12" stroke-linecap="round" stroke-dasharray="2 24" opacity=".9"/>`;
    nodes += g(rect(-120, -50, 240, 100, col, 50) + txt(lb, 0, 14, { size: 38, fill: '#fff' }), { x, y, s: clamp(pr, 0, 1.08), o: clamp(pr, 0, 1) });
  });
  const small = g(rect(0, 0, 460, 300, '#fff', 36, 'stroke="rgba(10,56,48,.14)" stroke-width="3"') + txt('SATU SOAL', 230, 80, { size: 28, fill: C.green, ls: 4 })
    + rect(40, 112, 380, 16, '#D9D2BE', 8) + rect(40, 148, 330, 16, '#D9D2BE', 8) + rect(40, 184, 360, 16, '#D9D2BE', 8) + rect(40, 232, 200, 40, '#F7F2E4', 14), { x: cx, y: cy, s: clamp(p, 0, 1.04), o: clamp(p, 0, 1), ox: 230, oy: 150 });
  // "tahun lalu" menyala saat Raka berbicara
  const lastY = pop(t, r05 - 0.3, 0.4);
  const lastYear = g(folder(0, 0, 260, 180, '#8E7AB5', 'Tahun lalu'), { x: 80, y: 1200 - (1 - lastY) * 70, o: clamp(lastY, 0, 1), s: 1 });
  const link = lastY > 0 ? `<path d="M${r1(200)} ${r1(1200)} Q 260 900 ${cx - 150} ${cy + 130}" stroke="${C.gold}" stroke-width="12" fill="none" stroke-linecap="round" opacity="${r1(clamp(lastY, 0, 1))}" stroke-dasharray="4 22"/>` : '';
  const keys = [[0, 'berpikir', 'berpikir', {}], [tFar, 'kaget', 'kaget', { wide: 0.6 }], [r05 - 0.2, 'kaget', 'berpikir', { gazeX: -0.4 }]];
  return { svg: s + lines + link + small + nodes + lastYear + X.rk(keys, { x: 840 - 200 * 0.62, y: 1480 - 778 * 0.62, s: 0.62, uid: 'rk' }) };
}

/* ------------------------------------------------------------ S7 uang jajan, 73.4 - 81.1 */
export function sceneMoney(X) {
  const { t } = X;
  const tBuku = X.at('N06', 'buku'), tFoto = X.at('N06', 'fotokopi'), tJalan = X.at('N06', 'perjalanan'), tKopi = X.at('N06', 'kopi');
  const start = X.D.clips.N06.start;
  const wall = wallNight(t, { time: '23:15' });
  const book = pop(t, tBuku - 0.15, 0.4), photo = pop(t, tFoto - 0.15, 0.4), trip = pop(t, tJalan - 0.15, 0.4), coffee = pop(t, tKopi - 0.1, 0.4);
  const pin = g(`<path d="M0 -120C-46 -120 -70 -88 -70 -54C-70 -10 0 56 0 56C0 56 70 -10 70 -54C70 -88 46 -120 0 -120Z" fill="${C.coral}"/>${circ(0, -62, 24, '#fff')}<path d="M-120 90q60 -50 120 0t120 0" stroke="#fff" stroke-width="10" fill="none" stroke-dasharray="4 18" stroke-linecap="round"/>`, { x: 880, y: 640, o: clamp(trip, 0, 1), s: clamp(trip, 0, 1.05) });
  let items = deskTop();
  items += g(rect(0, 0, 230, 40, '#E8665F', 8) + rect(10, -38, 214, 38, '#F8C038', 8) + rect(0, -74, 230, 36, '#6BA3C4', 8), { x: 60, y: DESK_Y - 4, o: clamp(book, 0, 1), s: clamp(book, 0, 1.05), ox: 115, oy: 40 });
  items += g(paperStack(0, 0, 6, { w: 210 }) + rect(24, -90, 160, 14, '#CFC8B4', 6) + txt('fotokopi', 105, -112, { size: 24, fill: '#9A927C', weight: 700 }), { x: 300, y: DESK_Y - 4, o: clamp(photo, 0, 1), s: clamp(photo, 0, 1.05), ox: 105, oy: 0 });
  items += g(mug(0, 0, 1.2, 1, t), { x: 780, y: DESK_Y - 100, o: clamp(coffee, 0, 1), s: clamp(coffee, 0, 1.05), ox: 60, oy: 90 });
  const wp = pop(t, tKopi + 0.5, 0.5);
  items += g(wallet(0, 0, 1, 0.12), { x: 540, y: DESK_Y + 112, o: clamp(wp, 0, 1), s: clamp(wp, 0, 1.04), ox: 130, oy: 85 });
  const noteOp = win(t, start + 0.5, X.D.clips.N06.end + 0.3, 0.5);
  const note = hand('Ilustrasi cerita Raka. Kondisi tiap mahasiswa berbeda.', 540, 1590, { size: 50, fill: 'rgba(255,255,255,.92)', weight: 700 });
  const keys = [[0, 'berpikir', 'berpikir', { gazeX: -0.3 }], [tKopi + 0.4, 'sedih', 'netral', { gazeY: 0.6 }]];
  return { svg: wall + pin + X.rk(keys, { ...atDesk(1.7, 540), uid: 'rk' }) + items + g(note, { o: noteOp }) };
}

/* ------------------------------------------------------------ S9 lega + penutup, meja malam (86.6 - 89.3 dan 111 - 117.6) */
export function sceneRelief(X) {
  const { t } = X;
  const wall = wallNight(t, { time: '22:10' });
  const lap = g(rect(0, 0, 360, 230, '#2A3446', 20) + rect(18, 18, 324, 194, '#33405A', 12) + circ(180, 115, 46, '#EAF6EE') + `<image href="/apps/web/src/assets/logo-mark.webp" x="144" y="79" width="72" height="72"/>`, { x: 640, y: DESK_Y - 232 });
  const sp = sparkle(300, 1080, 1.1, C.gold, win(t, 87.2, 89.2, 0.3)) + sparkle(800, 1000, 0.8, C.mint, win(t, 87.5, 89.2, 0.3));
  const keys = [[0, 'sedih', 'netral', { gazeY: 0.6 }], [87.0, 'berpikir', 'berpikir', { gazeX: 0.4, gazeY: -0.2 }], [88.1, 'netral', 'netral', {}]];
  return { svg: wall + X.rk(keys, { ...atDesk(1.7, 540), uid: 'rk' }) + deskTop() + paperStack(60, DESK_Y, 6, { w: 240 }) + lap + g(wallet(0, 0, 1, 0.12), { x: 540, y: DESK_Y + 112, ox: 130, oy: 85 }) + sp };
}
export function sceneFinal(X) {
  const { t, q } = X;
  const t0 = 111.0;
  const wall = wallNight(t, { time: '22:40' });
  const pp = pop(t, t0 + 0.15, 0.5);
  const good = q.options.findIndex((o) => /skafo/i.test(o));
  const hiO = easeOut(seg(t, 112.55, 112.95));
  const card = questionCard(540, 380, 860, q, { o: clamp(pp, 0, 1), s: 0.8 * (0.8 + 0.2 * clamp(pp, 0, 1)), hi: t > 112.5 ? good : -1, hiO });
  const keys = [[0, 'berpikir', 'berpikir', { gazeY: -0.3 }], [111.9, 'berpikir', 'berpikir', { gazeX: 0.3, gazeY: -0.5, tilt: -3 }], [112.55, 'senang', 'netral', {}], [113.4, 'senang', 'menunjuk', {}]];
  const lap = g(rect(0, 0, 300, 190, '#2A3446', 18) + rect(15, 15, 270, 160, '#33405A', 10) + circ(150, 95, 38, '#EAF6EE') + `<image href="/apps/web/src/assets/logo-mark.webp" x="120" y="65" width="60" height="60"/>`, { x: 700, y: DESK_Y - 192 });
  return { svg: wall + X.rk(keys, { ...atDesk(1.25, 540), uid: 'rk' }) + deskTop() + paperStack(60, DESK_Y, 5, { w: 240 }) + lap + card };
}
