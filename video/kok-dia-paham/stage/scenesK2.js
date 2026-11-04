// Adegan 8-14: perhatian dan tidur, paham cepat belum tentu diingat, latihan (tutup catatan, uji diri, pembahasan), MEDCOEL (rekaman layar asli), pilih cara belajar, penutup.
import { raka, rakaSvg } from '../../../brand/characters/raka/raka.js';
import { rk, RK, TK, tk, M, pop, topChip, f1, COL, A, R, C, E, P, L, T, chip, getLogo } from './core.js';
import { clamp, lerp, sm, eo, eob, win } from './core.js';
import * as K from './artK.js';
import { koriSvg } from './scenesK1.js';
import { panel, fr } from './panels.js';

const DESK_ARMS = { armL: { wx: 150, wy: 540, ex: 92, ey: 500, finger: 0, front: 1 }, armR: { wx: 250, wy: 540, ex: 308, ey: 500, finger: 0, front: 1 } };
const pa = (t, a, d = 0.12) => clamp((t - a) / d, 0, 1);
const pk = (t, a, d = 0.3) => 0.8 + 0.2 * eob((t - a) / d);
const logoCard = (cx, cy, k = 1, a = 1, w = 640) => { const h = w * 0.31, LG = getLogo(); return `<g transform="translate(${f1(cx)} ${f1(cy)}) scale(${k.toFixed(3)})" opacity="${a.toFixed(3)}"><rect x="${-w / 2}" y="${-h / 2 + 10}" width="${w}" height="${h}" rx="${h / 2}" fill="rgba(0,0,0,.3)"/><rect x="${-w / 2}" y="${-h / 2}" width="${w}" height="${h}" rx="${h / 2}" fill="#fff"/><image href="${LG}" x="${-w * 0.36}" y="${-w * 0.36 * 0.2015}" width="${w * 0.72}" height="${w * 0.72 * 0.2015}"/></g>`; };
const tag = (rect, txt, a = 1) => `<g opacity="${a.toFixed(3)}" transform="translate(${f1(rect[0] + 22)} ${f1(rect[1] + 22)})"><rect x="0" y="0" width="${Math.round(txt.length * 15.5 + 34)}" height="46" rx="23" fill="rgba(6,43,37,.88)"/>${T(17, 31, txt, '#fff', 24, '', 'start')}</g>`;

// ================================================================ 8. PERHATIAN DAN TIDUR (31.1 - 36.3)
function fokus(t) { // 31.1 - 33.3: mengantuk, notifikasi mengganggu
  const RX = 520;
  let w = K.studyBg(t, { clean: true }) + K.lamp(900, 1196, 1.1);
  const nod = Math.sin(t * 2.6) * 0.5 + 0.5, drift = Math.max(0, Math.sin((t - 31.1) * 1.8));
  const rs = rk('ngantuk', 'netral', { ...DESK_ARMS, gazeY: 0.7, tilt: -3 - 9 * drift, lean: 2 * drift, bags: 0.6, blink: 0.4 + 0.45 * nod });
  w += RK(rs, RX, 1450, 1.05, { t, uid: 'rk8', outfit: 'santai' });
  w += K.deskTop(1196) + K.deskFront(1196) + K.openBook(RX, 1262, 0.82, { cover: '#1D7B75' });
  w += K.phoneBuzz(880, 1250, t, 1.0, Math.sin(t * 7) > -0.2 ? 1 : 0);
  w += K.zz(RX + 110, 680, t, 0.9);
  let ov = '';
  const a1 = win(t, 31.1, 33.3, 0.15), a2 = win(t, 31.96, 33.3, 0.15);
  if (a1 > 0.01) ov += `<g opacity="${a1.toFixed(2)}" transform="translate(300 290) scale(${pk(t, 31.1).toFixed(3)})">${C(0, 0, 100, 'rgba(255,255,255,.14)')}${K.target(0, -10, 1.1, t)}${T(0, 104, 'PERHATIAN', '#fff', 40, 'stroke="#172B38" stroke-width="10" paint-order="stroke"')}</g>`;
  if (a2 > 0.01) ov += `<g opacity="${a2.toFixed(2)}" transform="translate(780 290) scale(${pk(t, 31.96).toFixed(3)})">${C(0, 0, 100, 'rgba(255,255,255,.14)')}${K.moonK(-6, -10, 50, '#24395A')}${T(0, 104, 'TIDUR', '#fff', 40, 'stroke="#172B38" stroke-width="10" paint-order="stroke"')}</g>`;
  return w + ov;
}
function tidurS(t) { // 33.3 - 34.9: beristirahat
  let w = K.studyBg(t, {}) + R(0, 0, 0, 0, '#000');
  w += K.bed(480, 1110, 1.15);
  const st = raka('lega', 'berbaring', { happyEyes: 0.9 });
  w += `<g transform="translate(215 818) scale(.74)">${rakaSvg(st, { bare: true, rebah: true, rebahTilt: -90, shadow: false, uid: 'rkT2', outfit: 'santai' })}</g>`;
  w += `<path d="M410 1104C470 1030 620 1006 730 1018C746 1024 750 1090 748 1140L410 1140Z" fill="#9DE0BD" opacity=".96"/>` + K.zz(700, 940, t, 1.0);
  const ov = topChip(t, 33.35, 34.85, 'ISTIRAHAT', { w: 520, fs: 46, bg: COL.indigo, y: 330 });
  return w + ov;
}
function segar(t) { // 34.9 - 36.3: kembali belajar dengan segar
  const RX = 520;
  let w = K.studyBg(t, { day: true });
  const rs = rk('mengerti', 'netral', { ...DESK_ARMS, gazeY: 0.2 });
  w += RK(rs, RX, 1450, 1.05, { t, uid: 'rk9', outfit: 'santai' });
  w += K.deskTop(1196) + K.deskFront(1196) + K.openBook(RX, 1262, 0.82, { cover: '#1D7B75' });
  w += K.sunK(880, 560, 44, t) + K.spark(300, 560, 0.8, '#F8C038') + K.spark(760, 700, 0.6, '#fff') + K.bulb(RX + 190, 700, 0.55 * sm((t - 35.2) / 0.3), sm((t - 35.2) / 0.3), t);
  const ov = topChip(t, 34.95, 36.3, 'KEMBALI BELAJAR', { w: 640, fs: 46, bg: COL.green, y: 330 });
  return w + ov;
}

// ================================================================ 9. CEPAT PAHAM BELUM TENTU DIINGAT TERUS (36.3 - 42.52)
function ingat(t) {
  let w = A.softBg('#0F5F57', '#0A3830', 'sbi');
  const lit = t >= 37.5 && t < 39.3 ? 1 : t >= 39.3 ? 0.45 + 0.2 * Math.sin(t * 5) : 0.8;
  const ex = t < 39.24 ? 'senang' : 'fokus';
  w += TK(tk(ex, 'berdiri', { bob: Math.sin(t * 3.2) * 4, lean: Math.sin(t * 1.7) * 1.5 }), 250, 1400, 0.9, { t, uid: 'tk9' });
  w += K.bulb(250, 600, (1.0 + 0.05 * Math.sin(t * 7)) * sm((t - 36.5) / 0.3), t >= 36.5 ? lit : 0, t) + (t >= 37.5 && t < 39.3 ? K.spark(150 + 20 * Math.sin(t * 4), 520, 0.6 + 0.2 * Math.sin(t * 6), '#F8C038') + K.spark(350, 540 + 12 * Math.sin(t * 5), 0.5 + 0.2 * Math.sin(t * 7 + 1), '#fff') : '');
  // kalender membalik halaman: hari ini -> besok -> lusa
  const day = t < 39.9 ? ['HARI INI', 'Kuliah'] : t < 40.9 ? ['BESOK', ''] : ['LUSA', ''];
  const fl = t >= 39.9 && t < 40.2 ? (t - 39.9) / 0.3 : t >= 40.9 && t < 41.2 ? (t - 40.9) / 0.3 : 0;
  const ca = sm((t - 36.9) / 0.4);
  w += `<g opacity="${ca.toFixed(2)}" transform="translate(0 ${f1((1 - ca) * 80 + Math.sin(t * 2.2) * 6)}) rotate(${f1(Math.sin(t * 1.6) * 1.6)} 770 900)">${K.calendarFlip(770, 900, 1.4, day[0], fl, day[1])}</g>`;
  if (t >= 39.3) w += K.qmarks(740, 620, t, 0.9, 3, '#F8C038') + K.qmarks(300, 480, t, 0.7, 1, '#F8C038');
  let ov = '';
  ov += chip(540, 290, 'CEPAT PAHAM SAAT KULIAH', { bg: COL.green, w: 900, fs: 40, a: win(t, 36.4, 39.2, 0.15), k: pk(t, 36.4) });
  ov += chip(540, 290, 'BELUM TENTU DIINGAT TERUS', { bg: COL.coral, w: 920, fs: 40, a: win(t, 39.25, 42.5, 0.15), k: pk(t, 39.25) });
  return w + ov;
}

// ================================================================ 10. LATIHAN: tutup catatan, uji diri, salah tidak apa-apa, pembahasan (42.52 - 56.3)
function latihan(t) {
  const RX = 540, FY = 1445, k = 0.85, DY = 1270;
  let w = K.studyBg(t) + K.lamp(960, 1270, 1.1);
  let ex = 'netral', pose = 'netral', ov = '', props = '';
  const arms = { ...DESK_ARMS };
  const closeU = clamp((t - 45.2) / 0.35, 0, 1), reopen = clamp((t - 52.9) / 0.35, 0, 1);
  const testing = t >= 46.3 && t < 52.9;
  if (t < 44.9) { ex = 'berpikir'; }
  else if (t < 46.3) { ex = 'berpikir'; pose = 'pegang_buku'; }
  else if (t < 50.26) ex = 'berpikir';
  else if (t < 51.6) ex = 'khawatir';
  else if (t < 52.9) ex = 'lega';
  else if (t < 54.9) ex = 'berpikir';
  else ex = 'mengerti';
  const st = pose === 'pegang_buku' ? rk(ex, 'pegang_buku', { gazeY: 0 }) : rk(ex, 'netral', { ...arms, gazeY: testing ? -0.2 : t < 44.9 || t > 52.9 ? 0.6 : 0, tilt: t >= 47.4 && t < 50 ? 4 * Math.sin(t * 3) : 3 * Math.sin(t * 1.7), bags: 0.3 });
  w += RK(st, RX, FY, k, { t, uid: 'rk10', outfit: 'santai' });
  w += K.deskTop(DY) + K.deskFront(DY);
  // buku: terbuka -> dipegang -> ditutup di samping -> dibuka lagi untuk pembahasan
  if (t < 45.2) props += K.openBook(RX, DY + 60, 0.7, { cover: '#1D7B75' }) + (t > 43.4 ? K.pencil(RX + 200 + 12 * Math.sin(t * 9), DY + 66 + 4 * Math.sin(t * 13), 0.9, -25 + 7 * Math.sin(t * 9)) : '');
  else if (t < 46.3) props += K.heldBook(RX, 1110, 0.8 + 0.05 * closeU, 0, '#1D7B75');
  else if (t < 52.9) props += K.closedBook(840, DY + 70, 0.7, -8, '#1D7B75');
  else props += K.openBook(RX, DY + 60, 0.7, { cover: '#1D7B75', flip: (t - 52.9) < 0.4 ? (t - 52.9) / 0.4 : 0 }) + (t > 53.7 ? K.hiliteBar(RX - 130, DY + 4, 210, sm((t - 53.7) / 0.9)) : '');
  w += props;
  const zl = 1 + 0.06 * clamp((t - 42.52) / 2.6, 0, 1) * (1 - sm((t - 45.2) / 1.1)); w = `<g transform="translate(540 1000) scale(${zl.toFixed(4)}) translate(-540 -1000)">${w}</g>`;
  // 42.52 - 45.2: chip latihan
  ov += chip(540, 310, 'LATIHAN ITU PENTING', { bg: COL.coral, w: 800, fs: 44, a: win(t, 42.6, 45.0, 0.15), k: pk(t, 42.6) });
  if (t >= 44.96 && t < 46.3) ov += chip(540, 310, 'TUTUP CATATANMU', { bg: COL.indigo, w: 720, fs: 44, a: win(t, 44.96, 46.3, 0.12), k: pk(t, 44.96) });
  // 46.3 - 52.9: kartu soal dan jawaban
  if (testing) {
    const ca = win(t, 46.4, 52.9, 0.25) * 1;
    const q = `<g>${R(-300, -40, 600, 20, '#C9D4D9', 10)}${R(-300, 0, 420, 20, '#C9D4D9', 10)}${T(0, 92, 'Jelaskan dengan kata-katamu sendiri', '#172B38', 32)}</g>`;
    ov += K.qCard(540, 480, 760, 270, `<g transform="translate(0 -20)">${q}</g>`, ca, 0.9 + 0.1 * eob((t - 46.4) / 0.4));
    // jawaban Raka tertulis perlahan, lalu ditandai "belum tepat" dengan lembut (kuning, bukan merah)
    const wr = clamp((t - 47.6) / 1.9, 0, 1);
    if (t >= 47.4 && t < 50.26) ov += `<g opacity="${win(t, 47.4, 50.2, 0.12).toFixed(2)}" transform="translate(540 725)">${R(-330, -70, 660, 140, '#fff', 40)}${R(-330, -70, 660, 140, 'none', 40, 'stroke="#8E7CE8" stroke-width="6"')}${R(-270, -36, 540 * wr, 16, '#9AA9B0', 8)}${R(-270, 0, 420 * clamp(wr * 1.3 - 0.2, 0, 1), 16, '#9AA9B0', 8)}${R(-270, 34, 300 * clamp(wr * 1.6 - 0.6, 0, 1), 16, '#9AA9B0', 8)}</g>`;
    if (t >= 50.26) { const u = sm((t - 50.26) / 0.35); ov += `<g opacity="${(u * (1 - sm((t - 52.5) / 0.35))).toFixed(2)}" transform="translate(540 725) scale(${(0.85 + 0.15 * u).toFixed(3)})">${R(-330, -70, 660, 140, '#FFF3D4', 40)}${R(-330, -70, 660, 140, 'none', 40, 'stroke="#F0A92C" stroke-width="7"')}${T(0, 18, 'Belum tepat. Nggak apa-apa!', '#7A4D0C', 42)}</g>`; }
  }
  if (t >= 51.66 && t < 52.9) { const hop = eob((t - 51.66) / 0.45); ov += koriSvg(900, 1250 + (1 - hop) * 300, 0.7, t, { wave: 1, a: pa(t, 51.66, 0.15) }) + `<g opacity="${(hop * (1 - sm((t - 52.5) / 0.35))).toFixed(2)}">${K.heartK(790, 1040, 0.8)}</g>`; }
  // 52.9 - 56.3: pembahasan, sorot bagian yang perlu dipelajari lagi
  if (t >= 52.9) {
    const a = win(t, 53.0, 56.3, 0.15);
    ov += chip(540, 310, 'CEK PEMBAHASAN', { bg: COL.green, w: 700, fs: 44, a: win(t, 52.95, 54.5, 0.15), k: pk(t, 52.95) });
    ov += chip(540, 310, 'BAGIAN YANG PERLU DIPELAJARI', { bg: COL.indigo, w: 960, fs: 38, a: win(t, 54.5, 56.3, 0.15), k: pk(t, 54.5) });
    if (t > 54.9) ov += K.spark(RX + 150, 780, 0.9 * sm((t - 54.9) / 0.3), '#F8C038') + K.spark(RX - 170, 820, 0.6 * sm((t - 55.1) / 0.3), '#fff') + `<g opacity="${sm((t - 55.0) / 0.3).toFixed(2)}">${K.bulb(RX + 210, 740, 0.6, 1, t)}</g>`;
  }
  return w + ov;
}

// ================================================================ 11. KENALKAN MEDCOEL (56.3 - 61.14)
function mulaiDari(t) {
  let w = A.softBg('#0F5F57', '#0A3830', 'sbm'), ov = '';
  const found = t >= 59.48;
  const st = rk(found ? 'senang' : 'bingung', found ? 'netral' : 'berpikir', { yaw: found ? 0.3 : 0 });
  const dx = found ? lerp(0, -50, sm((t - 59.48) / 0.4)) : 0;
  w += RK(st, 330 + dx, 1400, 0.82, { t, uid: 'rk11', outfit: 'kuliah' });
  // papan penunjuk ke segala arah: bingung mulai dari mana
  if (!found) {
    const signs = [['MATERI?', -24, 0], ['SOAL?', 14, 1], ['BUKU?', -10, 2], ['VIDEO?', 20, 3]];
    signs.forEach(([txt, rot, i]) => { const u = eob((t - 57.0 - i * 0.18) / 0.35), sw = Math.sin(t * 3 + i) * 5; w += `<g transform="translate(${f1(250 + i * 190)} ${f1(560 + (i % 2) * 120)}) rotate(${f1(rot + sw)}) scale(${u.toFixed(3)})" opacity="${clamp(u, 0, 1)}">${R(-95, -36, 190, 72, 'rgba(0,0,0,.25)', 16, 'transform="translate(0 8)"')}${R(-95, -36, 190, 72, i % 2 ? '#F8C038' : '#fff', 16)}${T(0, 13, txt, '#172B38', 34)}</g>`; });
    w += K.qmarks(330, 770, t, 0.9, 3);
    ov += chip(540, 290, 'BINGUNG MULAI DARI MANA?', { bg: COL.coral, w: 900, fs: 42, a: win(t, 56.4, 59.5, 0.15), k: pk(t, 56.4) });
  } else {
    const u = eob((t - 59.7) / 0.5);
    ov += logoCard(560, 680, 0.6 + 0.4 * u, pa(t, 59.7, 0.1), 860);
    ov += chip(540, 290, 'BELAJAR BARENG MEDCOEL', { bg: COL.green, w: 940, fs: 42, a: pa(t, 59.5, 0.15), k: pk(t, 59.5) });
    const hop = eob((t - 59.48) / 0.5); ov += koriSvg(850, 1330 + (1 - hop) * 340, 0.9, t, { wave: 1 });
    if (t > 60.4) ov += K.spark(160, 560, 1.0 * sm((t - 60.4) / 0.25), '#F8C038') + K.spark(960, 520, 0.8 * sm((t - 60.5) / 0.25), '#F8C038');
  }
  return w + ov;
}

// ================================================================ 12. FITUR ASLI (61.14 - 69.56): rekaman layar MEDCOEL, tidak digambar ulang
const PR = [24, 500, 1032, 712];
function fitur(t) {
  let w = A.softBg('#0F5F57', '#0A3830', 'sbf'), ov = '';
  const segs = [
    [61.14, 62.38, 'materi', 'CATATAN MATERI', COL.green],
    [62.38, 64.3, 'flash', 'FLASHCARD', COL.indigo],
    [64.3, 66.52, 'soal', 'LATIHAN SOAL', COL.coral],
    [66.52, 67.92, 'd', 'ANATOMI 3D', COL.green],
    [67.92, 69.56, 'sim', 'SIMULASI JADI DOKTER', COL.indigo],
  ];
  const cur = segs.find((s) => t >= s[0] && t < s[1]) || segs[segs.length - 1];
  const [a, b, clip, label, col] = cur, u = t - a, k = 0.92 + 0.08 * eob(u / 0.3);
  let o;
  if (clip === 'materi') o = { clip, f: fr(t, a, 1.0, 0), view: [0.9, 620, 396] };
  else if (clip === 'flash') o = { clip, f: fr(t, a, 1.25, 0), view: [0.9, 620, 396] };
  else if (clip === 'soal') o = { clip, f: fr(t, a, 1.0, 100), view: [0.9, 620, 396] };
  else if (clip === 'd') o = { clip, f: fr(t, a, 1.0, 0), view: [1.0, 704, 396] };
  else o = { clip, f: fr(t, a, 1.3, 57), view: [0.9, 640, 396] };
  panel('fx', { ...o, rect: PR, a: pa(t, a, 0.08), k });
  ov += chip(540, 305, label, { bg: col, w: Math.max(520, label.length * 31 + 110), fs: 46, a: 1, k: pk(t, a) });
  ov += tag([PR[0], PR[1] + PR[3] - 70, 0, 0], 'REKAMAN LAYAR ASLI', 1);
  ov += koriSvg(960, 340, 0.4, t, { wave: 1 });
  return { w, ov };
}

// ================================================================ 13. PILIH CARA BELAJAR (69.56 - 74.88)
const TILES = [
  { clip: 'materi', f: 20, view: [0.3, 520, 330], label: 'MATERI', x: 54, y: 370 },
  { clip: 'flash', f: 45, view: [0.3, 520, 330], label: 'FLASHCARD', x: 390, y: 370 },
  { clip: 'soal', f: 150, view: [0.3, 520, 400], label: 'LATIHAN SOAL', x: 726, y: 370 },
  { clip: 'd', f: 40, view: [0.42, 704, 396], label: 'ANATOMI 3D', x: 222, y: 650 },
  { clip: 'sim', f: 120, view: [0.3, 560, 400], label: 'SIMULASI', x: 558, y: 650 },
];
function pilih(t) {
  let w = A.softBg('#2A5E8A', '#0A3830', 'sbc'), ov = '';
  const seq = [[70.4, 0], [70.9, 1], [71.3, 3], [71.75, 4]];
  let hl = -1; if (t >= 70.4 && t < 72.5) { for (const [tt, i] of seq) if (t >= tt) hl = i; } else if (t >= 72.78) hl = 2;
  TILES.forEach((tl, i) => {
    const a0 = 69.62 + i * 0.12, on = hl === i;
    const rect = [tl.x, tl.y, 300, 210], kk = (0.7 + 0.3 * eob((t - a0) / 0.3)) * (on ? 1.07 : 1);
    panel('pt' + i, { clip: tl.clip, f: tl.f, rect, view: tl.view, a: pa(t, a0, 0.1), k: kk, r: 20 });
    ov += `<g transform="translate(${tl.x + 150} ${tl.y + 210 + 34}) scale(${kk.toFixed(3)})" opacity="${pa(t, a0, 0.1)}">${R(-140, -22, 280, 44, on ? '#F8C038' : 'rgba(6,43,37,.9)', 22)}${T(0, 12, tl.label, on ? '#172B38' : '#fff', 26)}</g>`;
  });
  ov += chip(540, 290, t < 72.5 ? 'PILIH SESUAI KEBUTUHANMU' : 'LALU KEMBALI LATIHAN', { bg: t < 72.5 ? COL.green : COL.coral, w: 940, fs: 42, a: 1, k: pk(t, t < 72.5 ? 69.6 : 72.78) });
  if (t >= 72.78) { // panah melingkar menuju latihan soal
    const u = sm((t - 72.78) / 0.7);
    ov += `<g opacity="${u.toFixed(2)}"><path d="M880 925C990 910 1040 780 960 662" fill="none" stroke="#F8C038" stroke-width="12" stroke-linecap="round" stroke-dasharray="26 18"/><path d="M946 636L1004 690L934 704Z" fill="#F8C038"/></g>`;
  }
  const pt = t >= 70.4 && t < 72.5;
  w += RK(rk('menunjuk', 'menunjuk', { yaw: 0.2 }), 300, 1400, 0.64, { t, uid: 'rk13', outfit: 'kuliah' });
  ov += koriSvg(780, 1370, 0.75, t, { wave: pt ? 0 : 1 });
  return { w, ov };
}

// ================================================================ 14. PENUTUP (74.88 - 77.92)
function penutup(t) {
  let w = A.softBg('#0F5F57', '#0A3830', 'sbz'), ov = '';
  w += `<g opacity=".5">${Array.from({ length: 12 }, (_, i) => { const a = i * Math.PI / 6 + t * 0.15; return `<path d="M540 900L${f1(540 + Math.cos(a) * 1400)} ${f1(900 + Math.sin(a) * 1400)}L${f1(540 + Math.cos(a + 0.13) * 1400)} ${f1(900 + Math.sin(a + 0.13) * 1400)}Z" fill="rgba(255,255,255,.035)"/>`; }).join('')}</g>`;
  const k1 = 0.8 + 0.2 * eob((t - 74.9) / 0.4), a1 = pa(t, 74.9, 0.15);
  ov += `<g opacity="${a1.toFixed(3)}" transform="translate(540 430) scale(${k1.toFixed(3)})">${T(0, 0, 'BELAJAR KEDOKTERAN', '#fff', 68, 'stroke="#062B25" stroke-width="18" paint-order="stroke" stroke-linejoin="round"')}${T(0, 124, 'GRATIS', '#F8C038', 140, 'stroke="#062B25" stroke-width="22" paint-order="stroke" stroke-linejoin="round"')}</g>`;
  ov += logoCard(540, 700, 0.7 + 0.3 * eob((t - 75.5) / 0.4), pa(t, 75.5, 0.1), 700);
  w += RK(rk('senang', 'senang', { yaw: -0.1 }), 330, 1410, 0.64, { t, uid: 'rk14', outfit: 'kuliah' });
  ov += koriSvg(790, 1340, 0.85, t, { wave: 1 });
  if (t > 76.7) ov += `<g transform="translate(540 890) scale(${(0.8 + 0.2 * eob((t - 76.7) / 0.3)).toFixed(3)})" opacity="${pa(t, 76.7, 0.1).toFixed(2)}">${R(-250, -52, 500, 120, 'rgba(0,0,0,.3)', 60, 'transform="translate(0 8)"')}${R(-250, -60, 500, 120, '#F8C038', 60)}${T(0, 20, 'medcoel.com', '#0A3830', 62)}</g>`;
  if (t > 76.0) ov += K.spark(150, 600, 0.9, '#F8C038') + K.spark(930, 560, 0.8, '#fff') + K.spark(880, 920, 0.6, '#F8C038');
  return w + ov;
}

export const SCENES_K2 = [
  { t0: 31.1, tr: { type: 'wipe', d: 0.35 }, draw: fokus },
  { t0: 33.3, tr: { type: 'iris', d: 0.4, cx: 540, cy: 1000 }, draw: tidurS },
  { t0: 34.9, tr: { type: 'iris', d: 0.4, cx: 540, cy: 1000 }, draw: segar },
  { t0: 36.3, tr: { type: 'wipe', d: 0.35 }, draw: ingat },
  { t0: 42.52, tr: { type: 'wipe', d: 0.4 }, draw: latihan },
  { t0: 56.3, tr: { type: 'iris', d: 0.45, cx: 540, cy: 900 }, draw: mulaiDari },
  { t0: 61.14, draw: fitur },
  { t0: 69.56, draw: pilih },
  { t0: 74.88, draw: penutup },
];
