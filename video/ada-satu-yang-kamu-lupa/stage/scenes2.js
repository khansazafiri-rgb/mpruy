// Adegan 4-9 "Ada Satu yang Kamu Lupa": ujian (puncak), reveal, penjelasan, bukti penelitian, penutup cerita, identitas MEDCOEL.
import { C, clamp, lerp, ease, easeOut, easeInOut, backOut, pop, seg, win, r1, rnd, g, rect, circ, txt, hand, mug, paperStack, qmark, sparkle, checkDot } from './lib.js';
import { W, H, DESK_Y, atDesk, SKIN, person, deskFront, roomNight, roomMorning, openBook, bookStack, examHall, examPaper } from './world.js';

const cam = (inner, x, y, k) => g(inner, { x, y, s: k, ox: x, oy: y });
const chipL = (label, x, y, p, { fill = '#fff', ink = C.forest, size = 44 } = {}) => {
  const w = 60 + label.length * size * 0.56;
  return g(rect(0, 0, w, size * 1.6, fill, size * 0.8, 'stroke="rgba(10,56,48,.16)" stroke-width="3"') + txt(label, w / 2, size * 1.12, { size, fill: ink }), { x: x + w / 2, y: y + size * 0.8, o: clamp(p, 0, 1), s: clamp(p, 0, 1.05), ox: w / 2, oy: size * 0.8 });
};
const THREAD = ['#F8C038', '#9DE0BD', '#F2A58F', '#9CC8E0', '#C9A8E8', '#F59E6B'];
/** Potongan ingatan: kartu kecil dengan coretan. */
const piece = (i, x, y, r, o = 1, s = 1) => g(rect(-44, -34, 88, 68, THREAD[i % 6], 14) + rect(-28, -14, 56, 8, 'rgba(10,56,48,.45)', 4) + rect(-28, 6, 38, 8, 'rgba(10,56,48,.35)', 4), { x, y, r, o, s });

/* ------------------------------------------------------------ 4. UJIAN 36.05 - 54.4 */
export function examBounds(A, D, T = { start: 0, end: 0 }) {
  return [T.start, A('N4', 'Kamu') - 0.05, A('N4', 'Istilah') - 0.05, A('N4', 'bahkan') - 0.3, A('N4', 'Tapi') - 0.05, D.clips.R2.start - 0.05, D.clips.R2.end + 0.12, T.end];
}
function hall(t, push) {
  let s = examHall(t, { clockAng: t * 6 });
  // barisan meja + siswa lain (menghadap penonton)
  const rows = [[430, 0.5, 5], [640, 0.7, 5], [860, 0.9, 4]];
  rows.forEach(([y, sc, n], ri) => {
    for (let i = 0; i < n; i++) {
      const x = 540 + (i - (n - 1) / 2) * (300 * sc + 90);
      if (ri === 2 && i === 2) continue;
      s += person(x, y, sc, { skin: (i + ri) % 5, hair: (i * 2 + ri) % 6, shirt: (i + ri * 3) % 8, look: Math.sin(t + i) * 0.4, tilt: Math.sin(t * 0.7 + i + ri) * 2, style: (i + ri) % 3 });
      s += rect(x - 110 * sc * 1.4, y + 170 * sc, 220 * sc * 1.4, 18 * sc * 2, '#C9B58F', 6) + rect(x - 110 * sc * 1.4, y + 170 * sc + 18 * sc * 2, 220 * sc * 1.4, 140 * sc, '#B49C72', 8);
    }
  });
  // pengawas
  s += person(940, 700, 0.8, { skin: 2, hair: 2, shirt: 5, style: 2 });
  return s;
}
export function sceneExam(X, T) {
  const { t } = X, A = X.at;
  const tUjian = A('N4', 'ujian'), tBaca = A('N4', 'membaca'), tIstilah = A('N4', 'Istilah'), tHal = A('N4', 'halaman'), tTapi = A('N4', 'Tapi'), tSusah = A('N4', 'susah');
  const r2 = X.D.clips.R2;
  const b = examBounds(A, X.D, T);
  // 1. aula lebar, kamera pelan mendekat
  if (t < b[1]) {
    const u = (t - b[0]) / (b[1] - b[0]);
    let s = hall(t, u);
    s += X.rk([[0, 'netral', 'netral', { gazeX: 0.2, gazeY: 0.4 }]], { x: 540 - 200 * 1.05, y: 1040 - 580 * 1.05, s: 1.05, uid: 'rk' }) + rect(250, 1040, 580, 24, '#C9B58F', 6) + rect(250, 1064, 580, 150, '#B49C72', 8)
      + g(rect(0, 0, 360, 24, '#FFFDF6', 6), { x: 360, y: 1030 });
    return cam(s, 540, 760, lerp(1, 1.12, easeInOut(u)));
  }
  const back = examHall(t, { clockAng: t * 6 }) + rect(0, 1040, W, H, '#B49C72') + rect(0, 1040, W, 12, 'rgba(0,0,0,.1)');
  // 2. Raka membaca soal, mata menyapu
  if (t < b[2]) {
    const u = (t - b[1]);
    const gz = lerp(-0.7, 0.8, clamp(u / 1.3, 0, 1)), gy = lerp(0.6, 0.8, clamp(u / 1.3, 0, 1));
    const raka = X.rk([[0, 'netral', 'netral', { gazeX: gz, gazeY: gy, lean: 2 }]], { ...atDesk(1.3, 540, 0), uid: 'rk' });
    const paper = examPaper(540, 960, 640, { s: 0.9, glow: 0, r: -2 });
    return back + person(130, 800, 0.8, { skin: 3, hair: 4, shirt: 2 }) + person(950, 780, 0.75, { skin: 1, hair: 0, shirt: 6 }) + raka + deskFront({ wood: '#B49C72', woodD: '#9C855E' }) + paper;
  }
  // 3. istilah familier: kata menyala, Raka mengenali
  if (t < b[3]) {
    const gl = pop(t, tIstilah + 0.1, 0.4);
    const raka = X.rk([[0, 'netral', 'netral', { gazeX: -0.6, gazeY: 0.5 }], [tIstilah + 0.25, 'senang', 'netral', { happyEyes: 0, wide: 0.35, gazeX: -0.5, gazeY: 0.4, browL: { y: -10, rot: 4 }, browR: { y: -10, rot: -4 } }]], { ...atDesk(1.25, 700, 0), uid: 'rk' });
    const paper = examPaper(300, 640, 560, { s: 1.0, glow: clamp(gl, 0, 1), r: -4, hi: [[1, 30, 120], [3, 140, 150]] });
    let spark = '';
    [[160, 470], [420, 440], [500, 600]].forEach(([x, y], i) => { const p = pop(t, tIstilah + 0.2 + i * 0.12, 0.35); spark += sparkle(x, y, 0.8 * clamp(p, 0, 1), C.gold, clamp(p, 0, 1)); });
    return back + raka + deskFront({ wood: '#B49C72', woodD: '#9C855E' }) + paper + spark;
  }
  // 4. ingat halaman tempat membaca
  if (t < b[4]) {
    const bp = pop(t, A('N4', 'ingat') - 0.15, 0.45);
    const page = rect(-150, -118, 300, 236, '#FFFDF6', 14, 'stroke="#D9CFB4" stroke-width="3"') + [0, 1, 2, 3, 4].map((i) => rect(-118, -84 + i * 34, 200 - (i % 2) * 40, 8, '#B8B2A0', 4)).join('')
      + rect(-118, -50, 150, 14, 'rgba(248,192,56,.9)', 4) + rect(-118, 18, 110, 14, 'rgba(248,192,56,.9)', 4) + txt('hal. 47', 70, 96, { size: 30, fill: C.green, weight: 800 }) + circ(104, -88, 22, 'rgba(120,72,40,.35)');
    const raka = X.rk([[0, 'berpikir', 'berpikir', { gazeX: 0.5, gazeY: -0.7, tilt: 4 }]], { ...atDesk(1.25, 540, 0), uid: 'rk' });
    const bubble = g(circ(-20, 232, 12, '#fff', 'stroke="rgba(10,56,48,.14)" stroke-width="3"') + circ(-6, 200, 18, '#fff', 'stroke="rgba(10,56,48,.14)" stroke-width="3"') + rect(-210, -170, 420, 340, '#fff', 90, 'stroke="rgba(10,56,48,.14)" stroke-width="3"') + `<g transform="rotate(-3)">${page}</g>`, { x: 560, y: 385, o: clamp(bp, 0, 1), s: 0.85 * clamp(bp, 0, 1.04) });
    return back + raka + deskFront({ wood: '#B49C72', woodD: '#9C855E' }) + bubble;
  }
  // 5. mencoba menjawab: potongan tidak tersambung
  const tryT = t - tTapi;
  const showClose = t >= b[5];
  const kz = showClose ? lerp(1, 1.12, clamp((t - b[5]) / 4.5, 0, 1)) : lerp(1, 1.25, easeInOut(seg(t, tTapi, tSusah + 0.3)));
  let pieces = '';
  const cxP = 540, cyP = showClose ? 700 : 620;
  const nP = 6;
  for (let i = 0; i < nP; i++) {
    const ang = i / nP * Math.PI * 2 + t * 0.35, rad = 250 + Math.sin(t * 1.3 + i * 2) * 36 + (showClose ? 120 : 0);
    const out = showClose ? 1 : pop(t, tTapi + 0.2 + i * 0.12, 0.4);
    pieces += piece(i, cxP + Math.cos(ang) * rad * 1.2, cyP + Math.sin(ang) * rad * 0.62, Math.sin(t * 2 + i) * 14, clamp(out, 0, 1) * (showClose ? 0.9 * (1 - seg(t, r2.end, r2.end + 1.2)) : 1), 1.45);
  }
  // garis penghubung yang putus
  let links = '';
  for (let i = 0; i < nP; i++) {
    const a0 = i / nP * Math.PI * 2 + t * 0.35, a1 = (i + 1) / nP * Math.PI * 2 + t * 0.35;
    const x0 = cxP + Math.cos(a0) * 250 * 1.2, y0 = cyP + Math.sin(a0) * 250 * 0.62, x1 = cxP + Math.cos(a1) * 250 * 1.2, y1 = cyP + Math.sin(a1) * 250 * 0.62;
    const broke = (Math.sin(t * 3 + i * 1.7) + 1) / 2;
    links += `<path d="M${r1(x0)} ${r1(y0)} L${r1(lerp(x0, x1, 0.45 * broke))} ${r1(lerp(y0, y1, 0.45 * broke))}" stroke="${C.coral}" stroke-width="6" stroke-dasharray="3 14" stroke-linecap="round" opacity=".8"/>`;
  }
  if (!showClose) {
    const sweat = pop(t, tSusah, 0.5);
    const raka = X.rk([[0, 'berpikir', 'berpikir', { gazeX: -0.3, gazeY: 0.6 }], [tSusah - 0.3, 'sedih', 'berpikir', { gazeY: 0.7, tilt: -4 }]], { ...atDesk(1.25, 540, 0), uid: 'rk' });
    const pen = g(rect(-6, -90, 12, 90, C.gold, 4) + `<path d="M-6 0h12l-6 18z" fill="#2A3446"/>`, { x: 640 + Math.sin(t * 1.4) * 10, y: 1010 + Math.sin(t * 2) * 4, r: 28 });
    return cam(back + links + pieces + raka + deskFront({ wood: '#B49C72', woodD: '#9C855E' }) + examPaper(540, 1080, 520, { s: 0.7, r: -2 }) + pen, 540, 700, kz);
  }
  // 6. close-up wajah; hening
  const quiet = t > r2.end + 0.12;
  const sweatDrop = g(`<path d="M0 -26Q22 6 0 26Q-22 6 0 -26Z" fill="#9CD0F0"/>`, { x: 760, y: 470 + ((t * 70) % 120), o: 0.9 * (1 - ((t * 70) % 120) / 130), s: 0.9 });
  const ex = quiet ? 'sedih' : 'sedih';
  const keys = [[0, 'sedih', 'berpikir', { gazeX: 0.2, gazeY: 0.55, tilt: -3 }], [r2.start + 1.6, 'sedih', 'berpikir', { gazeX: -0.5, gazeY: 0.3, tilt: 3, wide: 0.1 }], [r2.end - 0.4, 'sedih', 'netral', { gazeX: 0.1, gazeY: 0.7, tilt: -2, blink: 0.3 }]];
  const sc = lerp(2.45, 2.2, clamp((t - b[5]) / 6, 0, 1));
  const raka = X.rk(keys, { x: 540 - 200 * sc, y: 760 - 270 * sc, s: sc, uid: 'rk' });
  const bg = rect(0, 0, W, H, '#E4DAC1') + g(rect(0, 0, W, 360, '#D9CDB0'), {}) + rect(0, 1090, W, H, '#B49C72');
  return bg + links + pieces + raka + deskFront({ wood: '#B49C72', woodD: '#9C855E', y: 1160 }) + examPaper(540, 1330, 600, { s: 0.9, r: -2 }) + sweatDrop;
}

/* ------------------------------------------------------------ 5. REVEAL 54.4 - 62.0 */
export const revealBounds = (A, D) => [D.words.filter((w) => w.clip === 'N5' && w.w.toLowerCase() === 'kamu')[1].s - 0.1];
export function sceneReveal(X, T) {
  const { t } = X, A = X.at;
  const tLupaBawa = A('N5', 'lupa'), tSesuatu = A('N5', 'sesuatu'), tKamu2 = A('N5', 'Kamu') + 0, tOtak = A('N5', 'otakmu'), tWaktu = A('N5', 'waktu'), tSemua = A('N5', 'semua');
  const kamu2 = X.D.words.filter((w) => w.clip === 'N5' && w.w.toLowerCase() === 'kamu')[1].s;
  const b = [T.start, kamu2 - 0.1, T.end];
  if (t < b[1]) {
    // perlengkapan lengkap: semuanya ada
    const back = examHall(t, { clockAng: 20 }) + rect(0, 1040, W, H, '#B49C72') + rect(0, 1040, W, 12, 'rgba(0,0,0,.1)');
    const raka = X.rk([[0, 'netral', 'netral', { gazeY: 0.6, gazeX: -0.4 }], [kamu2 - 0.7, 'netral', 'netral', { gazeX: 0, gazeY: 0.1 }]], { ...atDesk(1.3, 540, 0), uid: 'rk' });
    const items = [
      { x: 170, label: 'pensil', draw: rect(-14, -120, 28, 130, C.gold, 8) + `<path d="M-14 10h28l-14 28z" fill="#E8C9A0"/>` + rect(-14, -132, 28, 18, '#F2735E', 6), t0: A('N5', 'nggak') },
      { x: 400, label: 'kartu', draw: rect(-90, -110, 180, 112, '#fff', 14, 'stroke="#C9C3B0" stroke-width="4"') + circ(-44, -66, 24, SKIN[0]) + rect(0, -88, 70, 10, '#B8B2A0', 5) + rect(0, -66, 54, 10, '#B8B2A0', 5), t0: A('N5', 'lupa') + 0.15 },
      { x: 650, label: 'botol', draw: rect(-40, -150, 80, 150, '#9CC8E0', 22) + rect(-22, -178, 44, 34, '#2A3446', 10) + rect(-34, -90, 68, 14, 'rgba(255,255,255,.55)', 7), t0: A('N5', 'membawa') },
    ];
    let it = '';
    items.forEach((m, i) => {
      const p = pop(t, m.t0, 0.4), ck = pop(t, m.t0 + 0.35, 0.3);
      it += g(m.draw, { x: m.x + 100, y: 1052 - (1 - clamp(p, 0, 1)) * 50, o: clamp(p, 0, 1), s: 1.0 * clamp(p, 0, 1.04) });
      it += checkDot(m.x + 100, 880 - (1 - clamp(ck, 0, 1)) * 20, 1.3 * clamp(ck, 0, 1.05), clamp(ck, 0, 1));
    });
    return back + raka + deskFront({ wood: '#B49C72', woodD: '#9C855E' }) + it;
  }
  // tiga kilas balik: lampu belajar, waktu istirahat yang digeser, kantuk di kelas
  let s = rect(0, 0, W, H, C.forest);
  for (let i = 0; i < 40; i++) s += circ(((i * 211) % 1080), ((i * 389) % 1920), 5 + (i % 3) * 2, 'rgba(157,224,189,.08)');
  const PW = 840, PHh = 290, PX = 60;
  const panels = [
    { y: 270, t0: A('N5', 'lupa') + 0, draw: (tt) => panelLamp(X, tt) },
    { y: 580, t0: A('N5', 'waktu'), draw: (tt) => panelRest(X, tt) },
    { y: 890, t0: A('N5', 'semua'), draw: (tt) => panelClass(X, tt) },
  ];
  const starts = [kamu2 + 0.45, A('N5', 'waktu') - 0.1, A('N5', 'semua') - 0.1];
  panels.forEach((p, i) => {
    const u = pop(t, starts[i], 0.45);
    if (u <= 0.01) return;
    const inner = `<svg x="0" y="0" width="${PW}" height="${PHh}" viewBox="0 0 ${PW} ${PHh}" overflow="hidden">${p.draw(t)}</svg>`;
    s += g(rect(-6, -6, PW + 12, PHh + 12, '#fff', 38) + `<clipPath id="pc${i}"><rect x="0" y="0" width="${PW}" height="${PHh}" rx="32"/></clipPath><g clip-path="url(#pc${i})">${inner}</g>`, { x: PX + (1 - clamp(u, 0, 1)) * 140, y: p.y, o: clamp(u, 0, 1), s: clamp(u, 0, 1.03) });
  });
  return s;
}
function panelLamp(X, t) {
  // lampu belajar yang tidak kunjung padam
  let s = rect(0, 0, 840, 290, '#16222E') + rect(0, 0, 840, 290, 'rgba(246,199,112,.07)');
  s += `<polygon points="640,70 470,290 810,290" fill="${C.lamp}" opacity="${r1(0.16 + 0.04 * Math.sin(t * 6)) }"/>`;
  s += `<g transform="translate(690 240)"><path d="M0 0L-30 -90" stroke="#4A5668" stroke-width="10" stroke-linecap="round"/><path d="M-30 -90L-4 -170" stroke="#4A5668" stroke-width="10" stroke-linecap="round"/><path d="M-50 -170q46 -40 100 0l-12 40h-76z" fill="#4A5668"/><ellipse cx="0" cy="-130" rx="42" ry="10" fill="${C.lamp}"/></g>`;
  s += g(rect(0, 0, 220, 100, '#101B25', 20) + txt('02:10', 110, 74, { size: 66, fill: C.gold, weight: 800, ls: 3 }), { x: 60, y: 60 });
  s += X.rk([[0, 'netral', 'netral', { blink: 0.4, gazeY: 0.5, tilt: 5 }]], { x: 330 - 200 * 0.48, y: 316 - 580 * 0.48, s: 0.48, uid: 'pA' });
  s += rect(0, 220, 840, 70, C.woodD) + rect(220, 190, 200, 30, '#FFFDF6', 6);
  return s;
}
function panelRest(X, t) {
  // jadwal harian: blok istirahat terus bergeser ke kanan dan menyusut
  let s = rect(0, 0, 840, 290, '#F7F2E4');
  const u = clamp((t - X.at('N5', 'waktu')) / 2, 0, 1);
  s += txt('hari ini', 40, 56, { size: 34, fill: '#7B8794', anchor: 'start', weight: 700 });
  const bars = [[0, 220, '#9DE0BD'], [220, 190, '#F8C038'], [410, 130, '#F2A58F']];
  bars.forEach(([x, w, c]) => { s += rect(40 + x, 100, w - 6, 70, c, 18); });
  const x0 = lerp(540, 640, ease(u)), w0 = lerp(220, 120, ease(u));
  s += rect(40 + x0, 100, w0, 70, '#34406A', 18) + circ(40 + x0 + w0 / 2 - 14, 135, 20, '#F4EBD8') + circ(40 + x0 + w0 / 2 - 4, 128, 17, '#34406A');
  s += `<path d="M${r1(40 + x0 - 60)} 205 L${r1(40 + x0 + w0 + 40)} 205" stroke="${C.coral}" stroke-width="8" stroke-linecap="round" stroke-dasharray="2 16"/>`;
  s += `<path d="M${r1(40 + x0 + w0 + 40)} 205 l-22 -16 M${r1(40 + x0 + w0 + 40)} 205 l-22 16" stroke="${C.coral}" stroke-width="8" stroke-linecap="round"/>`;
  return s;
}
function panelClass(X, t) {
  let s = rect(0, 0, 840, 290, '#E6DBC0') + rect(60, 36, 340, 150, '#2A3446', 14) + rect(72, 48, 316, 126, '#F7F2E4', 8) + rect(90, 72, 180, 14, '#C6BDA5', 7) + rect(90, 100, 240, 14, '#C6BDA5', 7);
  s += person(640, 130, 0.9, { skin: 2, hair: 3, shirt: 1 }) + person(760, 150, 0.7, { skin: 3, hair: 0, shirt: 4 });
  s += X.rk([[0, 'netral', 'netral', { blink: 0.65, lean: 4, tilt: 11, gazeY: 0.6, bob: Math.sin(t * 3.2) * 5 }]], { x: 430 - 200 * 0.52, y: 300 - 580 * 0.52, s: 0.52, uid: 'pC' });
  s += rect(0, 250, 840, 50, '#B58A5A');
  return s;
}

/* ------------------------------------------------------------ 6. PENJELASAN 62.0 - 69.2 */
export const explainBounds = (A) => [A('N6', 'Akibatnya') - 0.1, A('N6', 'materi') - 0.1];
export function sceneExplain(X, T) {
  const { t } = X, A = X.at;
  const tTidur = A('N6', 'tidur'), tAkib = A('N6', 'Akibatnya'), tFokus = A('N6', 'fokus'), tMateri = A('N6', 'materi'), tMelekat = A('N6', 'melekat');
  const b = [T.start, tAkib - 0.1, tMateri - 0.1, T.end];
  let s = rect(0, 0, W, DESK_Y, '#1D3042') + rect(0, 0, W, 520, '#16222E') + rect(0, 516, W, 6, 'rgba(255,255,255,.05)');
  let info = '', keys;
  if (t < b[1]) {
    // bar 24 jam: belajar tumbuh, waktu tidur menyusut
    const u = ease(seg(t, T.start + 0.3, tTidur + 0.9));
    const total = 880, sx = 100, by = 300, bh = 104;
    const rest = lerp(300, 150, u), study = lerp(300, 470, u);
    info += rect(sx, by, total, bh, 'rgba(255,255,255,.1)', 52);
    info += rect(sx, by, 200, bh, '#9DE0BD', 52) + rect(sx + 206, by, study - 6, bh, C.gold, 52);
    info += rect(sx + total - rest, by, rest, bh, '#34406A', 52) + circ(sx + total - rest / 2 - 12, by + 52, 28, '#F4EBD8') + circ(sx + total - rest / 2 + 2, by + 43, 24, '#34406A');
    info += txt('kuliah', sx + 100, by + 66, { size: 38, fill: C.forest, weight: 800 }) + txt('belajar', sx + 206 + (study - 6) / 2, by + 66, { size: 38, fill: C.forest, weight: 800 });
    const lp = pop(t, tTidur - 0.1, 0.45);
    info += chipL('waktu tidur', sx + total - rest - 120, by + bh + 28 - (1 - clamp(lp, 0, 1)) * 20, lp, { fill: '#F4EBD8', ink: '#2A3446', size: 46 });
    info += `<path d="M${sx + total - rest - 10} ${by - 28} l-30 -26 M${sx + total - rest - 10} ${by - 28} l-30 26" stroke="${C.coral}" stroke-width="10" stroke-linecap="round" opacity="${r1(clamp(u * 2, 0, 1))}"/>`;
    keys = [[0, 'netral', 'netral', { gazeY: -0.5, gazeX: 0.2, blink: 0.25 }]];
  } else if (t < b[2]) {
    // fokus: cincin yang tidak stabil
    const u = (t - b[1]);
    const p = pop(t, b[1] + 0.1, 0.4);
    let ring = '';
    for (let i = 3; i >= 1; i--) ring += circ(0, 0, 28 + i * 34 + Math.sin(t * 5 + i * 2) * (6 + u * 3), 'none', `stroke="${i % 2 ? C.gold : C.coral}" stroke-width="10" stroke-dasharray="${34 + i * 10} ${22 + (i * 7) % 26}" transform="rotate(${r1(t * 40 * (i % 2 ? 1 : -1))})"`);
    ring += circ(Math.sin(t * 3) * 26 * (0.4 + u * 0.4), Math.cos(t * 2.4) * 20 * (0.4 + u * 0.4), 22, C.coral);
    info += g(ring, { x: 540, y: 372, o: clamp(p, 0, 1), s: clamp(p, 0, 1.03) });
    info += chipL('fokus', 690, 330, pop(t, tFokus - 0.1, 0.4), { size: 46, fill: '#fff' });
    keys = [[0, 'sedih', 'berpikir', { gazeX: -0.8, gazeY: -0.3 }], [tFokus + 0.4, 'sedih', 'netral', { gazeX: 0.8, gazeY: -0.2 }], [tFokus + 1.2, 'sedih', 'netral', { gazeX: -0.2, gazeY: 0.5, blink: 0.4 }]];
  } else {
    // materi baru yang sulit melekat: sebagian menempel di papan, sebagian jatuh (tetap ada, hanya belum tersimpan)
    info += rect(80, 280, 880, 230, '#2A3A52', 30, 'stroke="#4A5E7A" stroke-width="6"') + txt('ingatan', 520, 336, { size: 40, fill: '#8FA6C4', ls: 4 });
    const N = 6;
    for (let i = 0; i < N; i++) {
      const t0 = tMateri + i * 0.32, x = 190 + i * 128, y = 430;
      const flyP = ease(seg(t, t0, t0 + 0.5));
      const sticks = i % 3 !== 2 && i !== 4;
      const sx = lerp(-100, x, flyP), sy = lerp(640, y, flyP);
      if (t < t0) continue;
      if (sticks) { info += piece(i, sx, sy, (i - 2.5) * 4, 1, 1.05); }
      else {
        const fallT = clamp((t - (t0 + 0.65)) / 0.9, 0, 1);
        const px = x + fallT * (i % 2 ? 60 : -50), py = y + fallT * fallT * 700, rr = (i - 2.5) * 4 + fallT * (i % 2 ? 90 : -80);
        info += piece(i, flyP < 1 ? sx : px, flyP < 1 ? sy : Math.min(py, 1090), flyP < 1 ? (i - 2.5) * 4 : rr, 1, 1.05);
      }
    }
    info += chipL('materi baru', 70, 540, pop(t, tMateri - 0.1, 0.4), { size: 42, fill: '#fff' });
    keys = [[0, 'sedih', 'berpikir', { gazeX: 0.3, gazeY: -0.4 }], [tMelekat, 'sedih', 'netral', { gazeX: 0.5, gazeY: 0.5, tilt: -3 }]];
  }
  const raka = X.rk(keys, { ...atDesk(1.15, 540, 0), uid: 'rk' });
  return s + info + raka + deskFront() + paperStack(70, DESK_Y, 5, { w: 240 }) + openBook(540, DESK_Y - 4, 360) + mug(860, DESK_Y - 90, 1, 1, t);
}

/* ------------------------------------------------------------ 7. BUKTI PENELITIAN 69.2 - 86.2 */
function library(t) {
  let s = rect(0, 0, W, DESK_Y, '#F0E4C8') + rect(0, 0, W, 700, '#E9DBB8');
  for (let r = 0; r < 3; r++) {
    s += rect(40, 640 + r * 0, 0, 0, '#000');
  }
  // rak buku tinggi di belakang
  for (let r = 0; r < 4; r++) {
    s += rect(40, 560 + r * 150, 1000, 14, '#A57F54', 4);
    for (let i = 0; i < 18; i++) { const h = 80 + rnd(i + r * 20) * 44; s += rect(60 + i * 54, 560 + r * 150 - h, 44, h, ['#E8665F', '#F8C038', '#9DE0BD', '#6BA3C4', '#B48CD6', '#F4EBD8'][(i + r) % 6], 6); }
  }
  return s;
}
export const evidenceBounds = (A) => [A('N7', 'Mereka') - 0.1, A('N7', 'Saat') - 0.15];
export function sceneEvidence(X, T) {
  const { t } = X, A = X.at;
  const tCrow = A('N7', 'Crowley'), t39 = A('N7', '39'), t1200 = A('N7', '1.200'), tSaat = A('N7', 'Saat'), tIng = A('N7', 'ingatan');
  const b = [T.start, A('N7', 'Mereka') - 0.1, tSaat - 0.15, T.end];
  // kartu sumber di atas: tiga keping muncul bertahap (judul, jumlah laporan, jumlah peserta)
  const cp = pop(t, tCrow - 0.15, 0.45);
  const chips = [['Crowley dkk., 2024', tCrow - 0.15, 36, 104, C.forest, '#fff'], ['39 laporan', t39 - 0.1, 36, 180, '#E3F6EC', C.forest], ['1.234 peserta', t1200 - 0.1, 316, 180, '#E3F6EC', C.forest]];
  let parts = '';
  chips.forEach(([m, t0, x, y, bg, ink]) => { const p = pop(t, t0, 0.35); if (p <= 0.01) return; const w = 40 + m.length * 24; parts += g(rect(0, 0, w, 62, bg, 31) + txt(m, w / 2, 44, { size: 36, fill: ink, weight: 800 }), { x, y, o: clamp(p, 0, 1), s: clamp(p, 0, 1.05), ox: 0, oy: 31 }); });
  const card = g(rect(0, 0, 860, 236, '#fff', 40, 'stroke="rgba(10,56,48,.16)" stroke-width="3"') + txt('Sumber penelitian', 36, 52, { size: 30, anchor: 'start', fill: '#7B8794', weight: 700 }) + parts, { x: 40, y: 262, o: clamp(cp, 0, 1), s: clamp(cp, 0, 1.02), ox: 0, oy: 0 });
  const fict = chipL('Raka adalah tokoh fiksi', 40, 520, pop(t, T.start + 0.3, 0.4), { size: 32, fill: 'rgba(255,255,255,.92)', ink: '#5A6672' });
  let s;
  const wood = { wood: '#C79E6A', woodD: '#A57F54' };
  if (t < b[1]) {
    // Raka belajar di perpustakaan (siang)
    s = library(t) + X.rk([[0, 'berpikir', 'netral', { gazeX: -0.5, gazeY: 0.55, blink: 0.1 }], [tCrow, 'netral', 'netral', { gazeX: 0.2, gazeY: 0.2 }]], { ...atDesk(1.15, 600, 0), uid: 'rk' }) + deskFront(wood) + bookStack(120, DESK_Y, 3, 230) + openBook(600, DESK_Y - 4, 360);
  } else if (t < b[2]) {
    // 39 laporan dan para peserta
    s = library(t);
    s += rect(40, 520, 900, 180, 'rgba(255,253,246,.99)', 30);
    let docs = '';
    for (let i = 0; i < 39; i++) {
      const p = pop(t, t39 + i * 0.012 - 0.2, 0.3); if (p <= 0) continue;
      const c = i % 13, r = Math.floor(i / 13);
      docs += g(rect(-18, -24, 36, 48, '#fff', 6, 'stroke="#C9C3B0" stroke-width="3"') + rect(-11, -14, 22, 4, C.green, 2) + rect(-11, -5, 22, 4, '#C6BDA5', 2) + rect(-11, 4, 15, 4, '#C6BDA5', 2), { x: 90 + c * 66, y: 564 + r * 52, o: clamp(p, 0, 1), s: 0.9 * clamp(p, 0, 1.06) });
    }
    s += docs;
    s += rect(40, 712, 900, 96, 'rgba(255,253,246,.99)', 30);
    let ppl = '';
    for (let i = 0; i < 52; i++) {
      const p = pop(t, t1200 - 0.3 + i * 0.02, 0.3); if (p <= 0) continue;
      const c = i % 26, r = Math.floor(i / 26);
      ppl += g(circ(0, -14, 11, SKIN[i % 5]) + rect(-13, -2, 26, 26, ['#E8665F', '#6BA3C4', '#F8C038', '#9DE0BD', '#B48CD6'][i % 5], 12), { x: 76 + c * 33, y: 748 + r * 38, o: clamp(p, 0, 1), s: 0.78 * clamp(p, 0, 1.05) });
    }
    s += ppl + X.rk([[0, 'netral', 'netral', { gazeY: -0.3 }], [t1200, 'berpikir', 'berpikir', { gazeY: -0.5, gazeX: 0.3 }]], { ...atDesk(0.62, 540, 0), uid: 'rk' }) + deskFront(wood) + openBook(540, DESK_Y - 4, 260);
  } else {
    // dua lajur: tidur dibatasi vs tidur normal; kartu ingatan baru
    s = rect(0, 0, W, H, '#F0E4C8') + deskFront(wood);
    const lanes = [{ x: 40, label: 'Tidur dibatasi', ok: false }, { x: 500, label: 'Tidur normal', ok: true }];
    lanes.forEach((L, li) => {
      const lp = pop(t, tSaat - 0.05 + li * 0.2, 0.45);
      let ln = rect(0, 0, 440, 600, L.ok ? '#E3F6EC' : '#EFE2DA', 40, 'stroke="rgba(10,56,48,.14)" stroke-width="3"');
      ln += chipL(L.label, 22, 20, 1, { size: 36, fill: '#fff' });
      ln += rect(40, 230, 360, 14, '#A57F54', 5) + txt('ingatan baru', 220, 206, { size: 28, fill: '#7B8794', weight: 700 });
      for (let i = 0; i < 5; i++) {
        const t0 = tIng - 0.1 + i * 0.42;
        const fall = ease(seg(t, t0, t0 + 0.45));
        if (t < t0) continue;
        const stick = L.ok ? true : (i === 0 || i === 3);
        const x = 86 + i * 66;
        let y = lerp(110, 196, fall);
        let rot = (i - 2) * 6;
        const k2 = clamp((t - (t0 + 0.55)) / 0.7, 0, 1);
        if (!stick && fall >= 1) { y = 196 + k2 * k2 * 520; rot += k2 * (i % 2 ? 60 : -50); }
        ln += piece(i, x + (stick ? 0 : k2 * (i % 2 ? 30 : -30)), y, rot, 1, 0.74);
      }
      const keys = L.ok ? [[0, 'senang', 'netral', { mouth: { w: 18, up: 4, lo: 14 } }]] : [[0, 'netral', 'netral', { blink: 0.55, lean: 3, tilt: 9, gazeY: 0.5, bob: Math.sin(t * 3) * 3, mouth: { w: 12, up: 3, lo: 3 } }]];
      const rs = 0.55;
      ln += `<svg x="0" y="270" width="440" height="330" viewBox="0 0 440 330" overflow="hidden">${X.rk(keys, { x: 220 - 200 * rs, y: 300 - 580 * rs, s: rs, uid: 'rl' + li })}${rect(40, 296, 360, 60, '#C79E6A', 14)}</svg>`;
      s += g(ln, { x: L.x, y: 570 + (1 - clamp(lp, 0, 1)) * 60, o: clamp(lp, 0, 1), s: clamp(lp, 0, 1.02) });
    });
  }
  return s + fict + card;
}

/* ------------------------------------------------------------ 8. PENUTUP CERITA 86.2 - 94.95 */
export function sceneWinddown(X, T) {
  const { t } = X, A = X.at;
  const tIngat = A('N8', 'ingat'), tBerhenti = A('N8', 'berhenti'), r3 = X.D.clips.R3;
  const off = ease(seg(t, tBerhenti + 1.55, tBerhenti + 2.25));
  const lamp = 1 - off;
  const back = roomNight(t, { time: '23:40', lamp, shelf: true });
  // buku menutup di sekitar "berhenti"
  const closeP = ease(seg(t, tBerhenti + 0.2, tBerhenti + 0.9));
  const book = closeP < 0.5
    ? openBook(520, DESK_Y - 4, 400 * (1 - closeP * 0.8))
    : g(rect(-120, -36, 240, 40, '#E8665F', 10) + rect(-114, -30, 228, 10, '#F4EBD8', 4), { x: 520, y: DESK_Y - 4, s: 1 + 0.06 * Math.sin(closeP * Math.PI) });
  const happy = t >= r3.start - 0.2;
  const keys = [
    [0, 'netral', 'netral', { blink: 0.4, lean: 3, tilt: 6, gazeY: 0.5 }],
    [tIngat, 'netral', 'netral', { gazeY: 0, gazeX: 0, lean: 0, blink: 0, tilt: 0 }],
    [tBerhenti + 0.5, 'netral', 'netral', { gazeY: 0.1, lean: -3, bob: 4, breath: 1 }],
    [tBerhenti + 1.1, 'netral', 'sapa', { yaw: 0.5, gazeX: 0.9, armR: { wx: 372, wy: 420, ex: 346, ey: 470, finger: 0, front: 1 }, lean: -2 }],
    [tBerhenti + 2.0, 'netral', 'netral', { yaw: 0.1, gazeX: 0.2, lean: -3 }],
    [r3.start - 0.25, 'senang', 'netral', { happyEyes: 1, lean: -2 }],
  ];
  const props = deskFront() + paperStack(70, DESK_Y, 9, { w: 250 }) + mug(850, DESK_Y - 90, 1, 1, t) + book;
  let s = back + X.rk(keys, { ...atDesk(1.45, 520), uid: 'rk' }) + props;
  // cahaya bulan hangat setelah lampu mati
  if (off > 0.01) s += rect(0, 0, W, H, '#0B1730', 0, `opacity="${r1(off * 0.16 * 100) / 100}"`);
  return s;
}

/* ------------------------------------------------------------ 9. IDENTITAS MEDCOEL 94.95 - 107 */
export function sceneBrand(X, T) {
  const { t } = X, A = X.at;
  const t38 = A('N9', '38'), tSoal = A('N9', 'soal'), tGratis = A('N9', 'gratis'), tMed = A('N9', 'MEDCOEL'), tSatu = A('N9', 'Satu'), tSek = A('N9', 'Sekarang');
  const endT = tSek + 1.6;
  const back = roomMorning(t);
  const keys = [
    [0, 'netral', 'netral', { gazeY: 0.5 }],
    [A('N9', 'lanjut'), 'senang', 'netral', { gazeY: 0.5 }],
    [tSatu - 0.1, 'menunjuk', 'menunjuk', {}],
    [tSek - 0.1, 'senang', 'senang', { happyEyes: 1 }],
  ];
  const props = deskFront({ wood: '#C79E6A', woodD: '#A57F54' }) + paperStack(70, DESK_Y, 6, { w: 240 }) + mug(870, DESK_Y - 90, 1, 1, t) + openBook(500, DESK_Y - 4, 380, { marks: false });
  let s = back + X.rk(keys, { ...atDesk(0.98, 500), uid: 'rk' }) + props;
  // tipografi: hitung naik ke 38 ribu+
  const cp = pop(t, t38 - 0.1, 0.45), cu = ease(seg(t, t38 - 0.05, t38 + 1.0));
  const n = Math.round(38 * cu);
  const sp = pop(t, tSoal - 0.05, 0.4);
  s += g(rect(0, 0, 880, 440, 'rgba(255,255,255,.92)', 56, 'stroke="rgba(10,56,48,.12)" stroke-width="3"'), { x: 40, y: 262, o: clamp(cp, 0, 1) });
  s += g(txt(`${n} ribu+`, 0, 0, { size: 150, fill: C.green, weight: 800 }) + g(txt('soal dan pembahasan', 0, 84, { size: 60, fill: C.forest, weight: 800 }), { o: clamp(sp, 0, 1) }), { x: 480, y: 440, o: clamp(cp, 0, 1), s: clamp(cp, 0, 1.05) });
  const gp = pop(t, tGratis - 0.05, 0.45), lg = pop(t, tMed - 0.05, 0.5);
  s += g(rect(0, 0, 250, 100, C.coral, 50) + txt('Gratis', 125, 72, { size: 58, fill: '#fff' }), { x: 76, y: 548 - (1 - clamp(gp, 0, 1)) * 30, o: clamp(gp, 0, 1), s: clamp(gp, 0, 1.06), r: -4 });
  s += g(rect(-12, -10, 480, 116, '#fff', 36, 'stroke="rgba(10,56,48,.14)" stroke-width="3"') + `<image href="/apps/web/src/assets/logo-full.webp" x="0" y="0" width="456" height="91.7"/>`, { x: 356, y: 540 - (1 - clamp(lg, 0, 1)) * 30, o: clamp(lg, 0, 1), s: clamp(lg, 0, 1.05) });
  if (lg > 0.4) s += sparkle(880, 300, 0.9 * clamp(lg, 0, 1), C.gold, clamp(lg, 0, 1));
  if (t > endT) s += endCard(X, endT);
  return s;
}
function endCard(X, t0) {
  const { t } = X;
  const p = pop(t, t0, 0.5);
  let s = rect(0, 0, W, H, C.forest);
  for (let i = 0; i < 40; i++) s += circ(((i * 211) % 1080), ((i * 389) % 1920), 5 + (i % 3) * 2, 'rgba(157,224,189,.08)');
  const wipe = ease(seg(t, t0 - 0.0, t0 + 0.4));
  s = g(s, { o: clamp(wipe, 0, 1) });
  const lg = pop(t, t0 + 0.2, 0.5);
  s += g(rect(-16, -12, 600, 138, '#fff', 44) + `<image href="/apps/web/src/assets/logo-full.webp" x="0" y="0" width="568" height="114.2"/>`, { x: 540, y: 330, o: clamp(lg, 0, 1), s: clamp(lg, 0, 1.04), ox: 284, oy: 57 });
  const t1 = pop(t, t0 + 0.55, 0.45), t2 = pop(t, t0 + 0.85, 0.45);
  s += g(txt('38 ribu+ soal dan pembahasan', 0, 0, { size: 62, fill: '#fff' }), { x: 540, y: 500 + (1 - clamp(t1, 0, 1)) * 30, o: clamp(t1, 0, 1) });
  s += g(txt('Gratis di MEDCOEL', 0, 0, { size: 86, fill: C.gold }), { x: 540, y: 610 + (1 - clamp(t2, 0, 1)) * 30, o: clamp(t2, 0, 1) });
  s += X.rk([[0, 'senang', 'sapa', {}]], { x: 540 - 200 * 0.78, y: 1180 - 778 * 0.78, s: 0.78, uid: 'rk' });
  return s;
}
