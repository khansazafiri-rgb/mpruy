// Adegan 1-8: hook (galeri penuh PDF, adik tingkat bingung), kirim ke MEDCOEL, kilas balik (PDF dari kakak tingkat, senang, bingung, kecewa), soal hilang/tenggelam.
import { raka, rakaSvg, PALETTE_KAKAK, PALETTE_ADIK } from '../../../brand/characters/raka/raka.js';
import { rk, RK, TK, tk, M, popK, topChip, f1, COL, A, R, C, E, P, L, T, chip, getKori, getLogo } from './core.js';
import { clamp, lerp, sm, eo, eob, win } from './core.js';
import * as S from './artS.js';
import * as K from './artK.js';
import { poseMascot } from './mascot.js';
import { panel, fr } from './panels.js';

export const koriSvg = (x, y, ks, t, o = {}) => {
  const Kx = getKori(); if (!Kx) return '';
  poseMascot(Kx.r, { t, mood: o.mood ?? 'happy', env: 0, wave: o.wave ?? 0, phase: 0.5, tilt: o.tilt ?? 0 });
  return `<g transform="translate(${f1(x - 160 * ks)} ${f1(y - 290 * ks)}) scale(${ks.toFixed(3)})" opacity="${(o.a ?? 1).toFixed(3)}">${Kx.r.root.outerHTML}</g>`;
};
export const logoCard = (cx, cy, k = 1, a = 1, w = 640) => { const h = w * 0.31, LG = getLogo(); return `<g transform="translate(${f1(cx)} ${f1(cy)}) scale(${k.toFixed(3)})" opacity="${a.toFixed(3)}"><rect x="${-w / 2}" y="${-h / 2 + 10}" width="${w}" height="${h}" rx="${h / 2}" fill="rgba(0,0,0,.3)"/><rect x="${-w / 2}" y="${-h / 2}" width="${w}" height="${h}" rx="${h / 2}" fill="#fff"/><image href="${LG}" x="${-w * 0.36}" y="${-w * 0.36 * 0.2015}" width="${w * 0.72}" height="${w * 0.72 * 0.2015}"/></g>`; };
export const tag = (x, y, txt, a = 1) => `<g opacity="${a.toFixed(3)}" transform="translate(${f1(x)} ${f1(y)})"><rect x="0" y="0" width="${Math.round(txt.length * 15.5 + 34)}" height="46" rx="23" fill="rgba(6,43,37,.88)"/>${T(17, 31, txt, '#fff', 24, '', 'start')}</g>`;
export const pa = (t, a, d = 0.12) => clamp((t - a) / d, 0, 1);
export const pk = (t, a, d = 0.3) => 0.8 + 0.2 * eob((t - a) / d);
const ARMS_DESK = { armL: { wx: 150, wy: 540, ex: 92, ey: 500, finger: 0, front: 1 }, armR: { wx: 250, wy: 540, ex: 308, ey: 500, finger: 0, front: 1 } };
const BIG = (lines, y, a, k, bg = '#3B4A8C') => `<g transform="translate(540 ${y}) scale(${k.toFixed(3)})" opacity="${a.toFixed(3)}">${R(-470, -90, 940, 120 + (lines.length - 1) * 98, 'rgba(0,0,0,.28)', 56, 'transform="translate(0 12)"')}${R(-470, -90, 940, 120 + (lines.length - 1) * 98, bg, 56)}${lines.map((l, i) => T(0, 12 + i * 98, l[0], l[1] ?? '#fff', l[2] ?? 76)).join('')}</g>`;
const phoneArms = (hx) => ({ armL: { wx: 160, wy: 470, ex: 84, ey: 520, finger: 0, front: 1 }, armR: { wx: hx, wy: 470, ex: 316, ey: 520, finger: 0, front: 1 } });
const DY = 1272;

// ================================================================ 1. HOOK: galeri penuh PDF soal lama (0 - 2.95)
function galeri(t) {
  let w = A.softBg('#1E4B70', '#0A2338', 'sg1');
  const sc = 50 * Math.min(t, 1.2), zi = sm((t - 1.6) / 0.8), zs = 1 + 0.9 * zi;
  const px = 400, py = 400, pw = 520, ph = 940, cw = (pw - 24) / 3;
  const kx = px + 6 + (cw + 6) + cw / 2, ky = py + 110 + (cw + 6) - sc + cw / 2;       // pusat keping PDF "UTS Anatomi 2025" di galeri
  const cxz = lerp(540, kx, 0), cyz = lerp(540, ky, 0);
  w += `<g transform="translate(${f1(lerp(540, 540, zi))} ${f1(lerp(900, 800, zi))}) scale(${zs.toFixed(3)}) translate(${f1(-lerp(540, kx, zi))} ${f1(-lerp(900, ky, zi))})">${S.phoneShell(px, py, pw, ph, S.gallery(pw, ph, t, { scroll: sc }), { id: 'g1', rot: 3 })}</g>`;
  // Raka melihat galeri, menggulir dengan ibu jari (ekspresi lesu lalu penasaran)
  const ex = t < 1.4 ? 'melongo' : 'berpikir';
  const st = rk(ex, 'menunjuk', { yaw: 0.45, gazeX: 0.9, gazeY: 0.1, armR: { wx: 318, wy: 420 + 14 * Math.sin(t * 7), ex: 332, ey: 480, finger: 1, fa: -70, front: 1 }, bags: 0.2, mouth: { w: 10, up: 1, lo: 8 } });
  w += `<g opacity="${(1 - zi).toFixed(2)}">${RK(st, 190, 1470 + 80 * zi, 0.95, { t, uid: 'rkS1', outfit: 'santai' })}</g>`;
  // PDF soal kakak tingkat membesar dari galeri
  if (t > 2.2) { const u = sm((t - 2.2) / 0.45); w += S.pdfPage(540, 560 + (1 - u) * 60, 460, 440, { title: 'UTS ANATOMI 2025', key: false, keyA: 0.0, s: 0.5 + 0.5 * u, a: u }); }
  let ov = BIG([['SOAL KAKAK TINGKAT', '#fff', 66]], 330, pa(t, 0, 0.1) * (1 - sm((t - 2.75) / 0.2)), pk(t, 0, 0.35), COL.indigo);
  if (t > 0.6) ov += chip(540, 470, 'Masih tersimpan di HP?', { bg: COL.coral, w: 760, fs: 40, a: win(t, 0.6, 2.9, 0.2), k: pk(t, 0.6) });
  return w + ov;
}

// ================================================================ 2. ADIK TINGKAT TAHUN DEPAN KEBINGUNGAN (2.95 - 6.40)
function adik(t) {
  let w = S.libraryBg(t);
  const ex = t < 4.2 ? 'bingung' : 'khawatir';
  const st = rk(ex, 'netral', { ...ARMS_DESK, gazeY: 0.5, tilt: -4 + 3 * Math.sin(t * 1.8), sweat: 0.6, bags: 0.15 });
  w += RK(st, 540, 1445, 0.95, { t, uid: 'ad', outfit: 'kuliah', palette: PALETTE_ADIK });
  w += S.deskTop(DY + 30) + S.deskFront(DY + 30) + S.lapLid(540, DY - 90, 300, 190);
  // gelembung pikiran: folder kosong + kaca pembesar
  const a = sm((t - 3.4) / 0.4);
  w += `<g opacity="${a.toFixed(2)}" transform="translate(0 ${f1(Math.sin(t * 2.4) * 5)})">${A.thought(260, 380, 560, 300, '#fff', [540, 760])}<g transform="translate(540 530)">${R(-90, -30, 180, 120, '#F8C038', 14)}${R(-90, -48, 80, 30, '#F8C038', 10)}${R(-76, -14, 152, 96, '#FFE08A', 10)}${T(0, 54, 'kosong', '#8A6A47', 28)}</g>${S.magnifier(690, 470 + Math.sin(t * 3) * 10, 1.0, -10)}</g>`;
  w += S.qm(540, 880, t, 0.9, 3);
  const cal = sm((t - 3.0) / 0.4) * (1 - sm((t - 5.9) / 0.3));
  let ov = chip(540, 300, 'ADIK TINGKAT, TAHUN DEPAN', { bg: COL.indigo, w: 900, fs: 40, a: cal, k: pk(t, 3.0) });
  ov += `<g opacity="${cal.toFixed(2)}" transform="translate(900 470)">${K.calendarFlip(0, 0, 0.62, '2027', t < 3.5 ? (t - 3.0) / 0.5 : 0, '')}</g>`;
  const z = 1 + 0.05 * clamp((t - 2.95) / 3.4, 0, 1);
  return `<g transform="translate(540 1000) scale(${z.toFixed(4)}) translate(-540 -1000)">${w}</g>${ov}`;
}

// ================================================================ 3. YUK, KIRIM KE MEDCOEL: Chat Admin asli (6.40 - 8.90)
const PHONE = [337, 450, 406, 880];
function kirim(t) {
  let w = A.softBg('#0F5F57', '#0A3830', 'sg3'), ov = '';
  const u = eob((t - 6.4) / 0.4);
  const rect = [PHONE[0], PHONE[1] + (1 - u) * 60, PHONE[2], PHONE[3]];
  panel('ph', { clip: 'alur', f: fr(t, 6.4, 0.75, 4), rect, view: [PHONE[2] / 430, 215, 466], a: pa(t, 6.4, 0.1), k: 0.9 + 0.1 * u, r: 40, noShadow: true });
  ov += S.bezelRound(rect[0], rect[1], rect[2], rect[3], 40, 16) + S.notch(rect[0] + rect[2] / 2, rect[1]);
  ov += logoCard(190, 560, 0.7 + 0.3 * eob((t - 6.55) / 0.4), pa(t, 6.55, 0.1), 300);
  ov += chip(540, 300, 'Kirim ke MEDCOEL!', { bg: COL.green, w: 760, fs: 52, a: 1, k: pk(t, 6.4) });
  const hop = eob((t - 6.45) / 0.45); ov += koriSvg(180, 1250 + (1 - hop) * 360, 0.95, t, { wave: 1 });
  // Raka dan PDF yang terbang ke HP
  w += RK(rk('senang', 'menunjuk', { yaw: -0.5, armR: { wx: 40, wy: 330, ex: 70, ey: 410, finger: 1, fa: -70, front: 1 }, flip: 1 }), 905, 1420, 0.62, { t, uid: 'rkS3', outfit: 'santai' });
  const fl = sm((t - 7.5) / 0.7);
  if (fl > 0 && fl < 1) ov += S.pdfIcon(lerp(850, 600, fl), lerp(1000, 800, fl) - 120 * Math.sin(Math.PI * fl), 0.9 * (1 - 0.3 * fl), { a: 1 - sm((fl - 0.8) / 0.2), rot: -12 * fl });
  ov += tag(rect[0] - 20, rect[1] - 60, 'REKAMAN LAYAR ASLI', 1);
  return { w, ov };
}

// ================================================================ 4. KILAS BALIK: PDF dari kakak tingkat (8.90 - 11.70)
function kilas(t) {
  let w = S.libraryBg(t);
  const u = eob((t - 8.9) / 0.5);
  const kk = rk('senang', 'sapa', { yaw: 0.3, armR: { wx: 322, wy: 520, ex: 336, ey: 540, finger: 0, front: 1 } });
  const rr = rk(t < 10.3 ? 'berpikir' : 'senang', 'netral', { yaw: -0.3, armL: { wx: 100, wy: 470, ex: 70, ey: 520, finger: 0, front: 1 } });
  w += RK(kk, 250, 1420 + (1 - u) * 60, 0.88, { t, uid: 'kk', outfit: 'kuliah', palette: PALETTE_KAKAK });
  w += RK(rr, 830, 1420, 0.88, { t, uid: 'rkS4', outfit: 'santai' });
  const px = lerp(430, 650, sm((t - 9.3) / 0.9));
  w += S.pdfIcon(px, 1000 - 40 * Math.sin(Math.PI * sm((t - 9.3) / 0.9)), 1.25, { rot: lerp(-8, 8, sm((t - 9.3) / 0.9)) });
  if (t > 10.3) w += S.sparkK(780, 800, 0.9 * sm((t - 10.3) / 0.3)) + S.sparkK(930, 760, 0.7 * sm((t - 10.4) / 0.3), '#fff') + S.sparkK(640, 840, 0.6 * sm((t - 10.5) / 0.3));
  let ov = chip(540, 300, 'TAHUN LALU', { bg: COL.indigo, w: 560, fs: 46, a: pa(t, 8.9, 0.15), k: pk(t, 8.9) });
  ov += chip(540, 410, 'Dapat PDF soal dari kakak tingkat', { bg: COL.green, w: 940, fs: 36, a: pa(t, 9.6, 0.15), k: pk(t, 9.6) });
  ov += `<g transform="translate(250 820)" opacity="${pa(t, 8.9).toFixed(2)}">${T(0, 0, 'KAKAK TINGKAT', '#fff', 30, 'stroke="#172B38" stroke-width="9" paint-order="stroke"')}</g>`;
  return w + ov;
}

// ================================================================ 5. SENANG: ADA BAHAN LATIHAN (11.70 - 14.62)
function senang(t) {
  let w = S.libraryBg(t);
  const hop = Math.max(0, Math.sin((t - 11.7) * 9)) * 18 * (1 - sm((t - 13.3) / 0.8));
  const st = rk('senang', 'senang', { bob: -hop * 0.5, armL: { wx: 70, wy: 330 - hop, ex: 40, ey: 420, finger: 0, front: 1 }, armR: { wx: 330, wy: 330 - hop, ex: 360, ey: 420, finger: 0, front: 1 } });
  w += RK(st, 540, 1445 - hop * 0.6, 0.95, { t, uid: 'rkS5', outfit: 'santai' });
  w += S.deskTop(DY + 30) + S.deskFront(DY + 30) + S.lapLid(540, DY - 70, 300, 190);
  const u = eob((t - 12.0) / 0.5);
  w += S.pdfPage(820, 470 + (1 - u) * 60 + Math.sin(t * 3) * 6, 360, 330, { title: 'UTS ANATOMI 2025', key: false, keyA: 0, s: 0.7 + 0.3 * u, a: u, rot: 5 });
  for (let i = 0; i < 7; i++) { const a = i * 0.9 + t * 1.5, r = 260 + (i % 3) * 40; w += S.sparkK(540 + Math.cos(a) * r, 760 + Math.sin(a) * r * 0.55, 0.45 + 0.2 * (i % 3), i % 2 ? '#F8C038' : '#fff'); }
  const ov = chip(540, 300, 'AKHIRNYA ADA BAHAN LATIHAN!', { bg: COL.green, w: 980, fs: 40, a: pa(t, 11.7, 0.15), k: pk(t, 11.7) });
  const z = 1 + 0.06 * clamp((t - 11.7) / 2.9, 0, 1);
  return `<g transform="translate(540 1000) scale(${z.toFixed(4)}) translate(-540 -1000)">${w}</g>${ov}`;
}

// ================================================================ 6-7. DIBUKA: JAWABANNYA MANA? (14.62 - 18.72) dan PEMBAHASANNYA JUGA TIDAK ADA (18.72 - 20.74)
function bingung(t) {
  let w = A.softBg('#2D4A7A', '#14243F', 'sg6');
  const z = 1.28 + 0.34 * clamp((t - 14.62) / 4.1, 0, 1);
  const ex = t < 15.1 ? 'senang' : t < 16.4 ? 'berpikir' : t < 17.2 ? 'bingung' : 'melongo';
  const st = rk(ex, 'netral', { ...ARMS_DESK, gazeY: t < 15.1 ? 0 : 0.5, tilt: t > 16.4 ? -5 * Math.sin(Math.min(1, (t - 16.4) / 0.5) * 3) : 0, sweat: sm((t - 16.4) / 0.6), ...(t > 17.2 ? { mouth: { w: 10, up: 0, lo: 22 } } : {}) });
  w += RK(st, 540, 1900 - 40 * (z - 1.28), z, { t, uid: 'rkS6', outfit: 'santai' });
  const u = eob((t - 14.7) / 0.4);
  w += S.pdfPage(820, 360 + (1 - u) * 40, 330, 380, { title: 'UTS ANATOMI', key: false, keyA: 0, s: 0.62 * (0.7 + 0.3 * u), a: u, rot: 4 });
  if (t > 16.2) w += `<g opacity="${sm((t - 16.2) / 0.3).toFixed(2)}">${S.qm(540, 560, t, 1.3, 3)}</g>`;
  let ov = chip(540, 300, 'Soalnya ada…', { bg: COL.green, w: 640, fs: 50, a: win(t, 14.65, 17.2, 0.15), k: pk(t, 14.65) });
  ov += chip(540, 300, 'JAWABANNYA MANA?', { bg: COL.coral, w: 860, fs: 50, a: win(t, 17.2, 18.72, 0.12), k: pk(t, 17.2) });
  return w + ov;
}
function kecewa(t) {
  let w = A.softBg('#3A3558', '#1B1830', 'sg7');
  const sd = sm((t - 18.72) / 0.6);
  const st = rk('sedih', 'netral', { ...ARMS_DESK, gazeY: 0.4, slump: sd, tilt: -4 * sd, bags: 0.3 });
  w += RK(st, 330, 1445, 0.95, { t, uid: 'rkS7', outfit: 'santai' });
  w += S.deskTop(DY + 30) + S.deskFront(DY + 30) + S.lapLid(330, DY - 70, 280, 170);
  const u = eob((t - 18.75) / 0.45);
  w += S.pdfPage(740, 380 + (1 - u) * 50, 440, 640, { title: 'UTS ANATOMI 2025', key: false, keyA: 0.4 + 0.6 * sm((t - 19.1) / 0.5), s: 0.85 + 0.15 * u, a: u, rot: 3 });
  w += S.qm(330, 700, t, 0.9, 2, '#E8665F');
  const ov = chip(540, 300, 'Pembahasannya?', { bg: COL.coral, w: 760, fs: 52, a: win(t, 18.72, 20.74, 0.15), k: pk(t, 18.72) });
  const z = 1 + 0.06 * clamp((t - 18.72) / 2.0, 0, 1);
  return `<g transform="translate(540 1000) scale(${z.toFixed(4)}) translate(-540 -1000)">${w}</g>${ov}`;
}

// ================================================================ 8. HILANG: ganti HP, tenggelam di chat (20.74 - 25.54)
function hilang(t) {
  let w = A.softBg('#1E4B70', '#0A2338', 'sg8'), ov = '';
  const pw = 400, ph = 800;
  if (t < 22.6) {
    const fade = sm((t - 21.9) / 0.5);
    w += S.phoneShell(340, 380, pw, ph, S.gallery(pw, ph, t, { scroll: 0 }), { id: 'g8a', rot: -3 });
    if (fade > 0) { w += `<g opacity="${fade.toFixed(2)}">${R(380 + 120, 380 + 240, 150, 150, '#F4F4F2')}</g>`; }
    w += S.pdfIcon(540, 650 - 60 * fade, 1.2 + 0.4 * fade, { a: 1 - fade });
    ov += chip(540, 300, 'SOAL HILANG', { bg: COL.coral, w: 620, fs: 54, a: win(t, 20.8, 22.6, 0.15), k: pk(t, 20.8) });
  } else if (t < 23.85) {
    const u = sm((t - 22.6) / 0.5), sw = sm((t - 23.1) / 0.5);
    w += S.phoneShell(110, 440, 340, 680, `${R(0, 0, 340, 680, '#2A2E3A')}${T(170, 340, 'HP lama', '#9AA9B0', 36)}`, { id: 'g8b', rot: -8 + 8 * sw, a: 1 - 0.3 * sw });
    w += S.phoneShell(630, 440, 340, 680, `${R(0, 0, 340, 680, '#F4F4F2')}${T(170, 300, 'HP baru', '#172B38', 36)}${T(170, 360, '(kosong)', '#9AA9B0', 28)}`, { id: 'g8c', rot: 8 - 8 * sw });
    w += S.arrowR(470, 780, 130, '#F8C038');
    w += `<g opacity="${(0.9 * sw).toFixed(2)}">${S.pdfIcon(280, 600 + 30 * Math.sin(t * 5), 0.9, { a: 0.5 })}${R(160, 640, 240, 10, '#E8665F', 5, 'transform="rotate(-20 280 645)"')}</g>`;
    ov += chip(540, 300, 'GANTI HP', { bg: COL.indigo, w: 520, fs: 54, a: win(t, 22.6, 23.85, 0.12), k: pk(t, 22.6) });
  } else {
    const sc = (t - 23.85) * 520;
    w += S.phoneShell(320, 380, 440, 900, S.chatGroup(440, 900, t, { scroll: sc }), { id: 'g8d', rot: 2 });
    ov += chip(540, 300, 'TENGGELAM DI CHAT ANGKATAN', { bg: COL.coral, w: 980, fs: 40, a: win(t, 23.85, 25.54, 0.12), k: pk(t, 23.85) });
  }
  return w + ov;
}

export const SCENES_S1 = [
  { t0: 0, draw: galeri },
  { t0: 2.95, tr: { type: 'wipe', d: 0.4 }, draw: adik },
  { t0: 6.4, draw: kirim },
  { t0: 8.9, draw: kilas },
  { t0: 11.7, tr: { type: 'wipe', d: 0.35 }, draw: senang },
  { t0: 14.62, tr: { type: 'iris', d: 0.4, cx: 540, cy: 900 }, draw: bingung },
  { t0: 18.72, tr: { type: 'wipe', d: 0.35 }, draw: kecewa },
  { t0: 20.74, tr: { type: 'iris', d: 0.45, cx: 540, cy: 900 }, draw: hilang },
];
