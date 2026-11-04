// Adegan 1-5: hook (Raka bingung dengan slide PPT), solusi (Chat Admin asli di iPad), kuliah (slide cuma sebentar), di rumah (gambar dan istilah), punchline (slide berikutnya).
import { PALETTE_DOSEN } from '../../../brand/characters/raka/raka.js';
import { rk, RK, TK, tk, M, f1, COL, A, R, C, E, P, L, T, chip, getSlide } from './core.js';
import { clamp, lerp, sm, eo, eob, win } from './core.js';
import * as S from './artS.js';
import * as K from './artK.js';
import { panel, fr } from './panels.js';
import { koriSvg, logoCard, tag, pa, pk, lerpKeys, mix, ipadFrame } from './shared.js';

const ARMS_DESK = { armL: { wx: 150, wy: 540, ex: 92, ey: 500, finger: 0, front: 1 }, armR: { wx: 250, wy: 540, ex: 308, ey: 500, finger: 0, front: 1 } };
const DY = 1272;
export const TAB = [160, 340, 760, 1020];               // iPad (potret) menampilkan rekaman Chat Admin asli
const cam = (g, [x, y, s]) => `<g transform="translate(540 960) scale(${s.toFixed(4)}) translate(${f1(-x)} ${f1(-y)})">${g}</g>`;
const camKeys = (t, keys) => [lerpKeys(t, keys.map((k) => [k[0], k[1]])), lerpKeys(t, keys.map((k) => [k[0], k[2]])), lerpKeys(t, keys.map((k) => [k[0], k[3]]))].map((v, i) => v);
const smoothKeys = (t, keys) => { // interpolasi mulus (smoothstep) antar kunci [t, x, y, s]
  let i = 0; while (i + 1 < keys.length && t >= keys[i + 1][0]) i++; if (i + 1 >= keys.length) return keys[keys.length - 1].slice(1);
  const a = keys[i], b = keys[i + 1], u = sm((t - a[0]) / (b[0] - a[0])); return [lerp(a[1], b[1], u), lerp(a[2], b[2], u), lerp(a[3], b[3], u)];
};
const slideCard = (n, x, y, w, o = {}) => { const h = w * 9 / 16; return `<g transform="translate(${f1(x)} ${f1(y)})" opacity="${o.a ?? 1}">${R(-6, 14, w + 12, h + 12, 'rgba(0,0,0,.28)', 20)}${R(-8, -8, w + 16, h + 16, '#1B2430', 20)}<image href="${getSlide(n)}" x="0" y="0" width="${w}" height="${h}"/></g>`; };
const SC_W = 852, SC_X = 114, SC_Y = 360;                // kartu slide: sudut kiri atas
const scPt = (px, py) => [SC_X + px * SC_W / 1600, SC_Y + py * SC_W / 1600];   // titik pada gambar slide (1600 x 900) -> kanvas
const ring = (x, y, r, t, c = '#F8C038') => `<circle cx="${f1(x)}" cy="${f1(y)}" r="${f1(r * (1 + 0.06 * Math.sin(t * 6)))}" fill="none" stroke="${c}" stroke-width="7" stroke-dasharray="14 9"/>`;

// ================================================================ 1. HOOK: PPT dibuka, Raka makin bingung (0 - 4.04)
function hook(t) {
  let w = K.studyBg(t, { day: true });
  const ex = t < 1.2 ? 'berpikir' : t < 2.6 ? 'bingung' : 'melongo';
  const st = rk(ex, 'netral', { ...ARMS_DESK, gazeY: -0.4, tilt: -4 * sm((t - 1.2) / 0.6) + 2 * Math.sin(t * 2), sweat: sm((t - 1.4) / 0.8), bags: 0.15 });
  w += RK(st, 540, 1450, 0.82, { t, uid: 'rkP1', outfit: 'kuliah' });
  w += S.deskTop(DY + 30) + S.deskFront(DY + 30) + S.lapLid(540, DY - 80, 320, 190);
  const u = eob((t - 0.1) / 0.5);
  w += slideCard(1, SC_X, SC_Y + (1 - u) * 60, SC_W, { a: pa(t, 0.1, 0.1) });
  // lingkaran sorot: gambar, lalu istilah
  if (t > 2.7) { const [gx, gy] = scPt(640, 430); w += ring(gx, gy, 62, t); w += S.qm(gx + 30, gy - 110, t, 1.0, 2); }
  if (t > 3.2) { const [tx, ty] = scPt(1380, 440); w += ring(tx, ty, 78, t, '#E8665F'); }
  // kamera: kartu penuh -> wajah Raka -> gambar pada slide
  const c = smoothKeys(t, [[0, 540, 960, 1], [1.2, 540, 960, 1], [1.8, 540, 1060, 1.55], [2.5, 540, 1060, 1.55], [3.0, 480, 580, 2.2], [4.04, 480, 580, 2.3]]);
  let ov = chip(540, 300, 'PPT-nya ada…', { bg: COL.green, w: 700, fs: 54, a: win(t, 0.3, 2.3, 0.15), k: pk(t, 0.3) });
  ov += chip(540, 300, 'Tapi ini maksudnya apa?', { bg: COL.coral, w: 940, fs: 48, a: win(t, 2.4, 4.04, 0.15), k: pk(t, 2.4) });
  return cam(w, c) + ov;
}

// ================================================================ 2. SOLUSI: ajukan PPT-mu ke MEDCOEL, Chat Admin asli (4.04 - 7.20)
function solusi(t) {
  let w = A.softBg('#0F5F57', '#0A3830', 'sp2'), ov = '';
  const u = eob((t - 4.04) / 0.4);
  const rect = [TAB[0], TAB[1] + (1 - u) * 60, TAB[2], TAB[3]];
  panel('tb', { clip: 'alur', f: fr(t, 4.04, 0.7, 4), rect, view: [TAB[2] / 820, 410, 550], a: pa(t, 4.04, 0.1), k: 0.92 + 0.08 * u, r: 30, noShadow: true });
  ov += ipadFrame(rect[0], rect[1], rect[2], rect[3]);
  ov += chip(540, 290, 'Ajukan PPT-mu ke MEDCOEL!', { bg: COL.green, w: 980, fs: 40, a: 1, k: pk(t, 4.04) });
  ov += logoCard(210, 440, 0.7 + 0.3 * eob((t - 4.2) / 0.4), pa(t, 4.2, 0.1), 300);
  const hop = eob((t - 4.1) / 0.45); ov += koriSvg(150, 1330 + (1 - hop) * 360, 0.95, t, { wave: 1 });
  ov += tag(rect[0] + 40, rect[1] + rect[3] - 120, 'REKAMAN LAYAR ASLI', 1);
  return { w, ov };
}

// ================================================================ 3. KULIAH: dosen menjelaskan satu slide cuma sebentar (7.20 - 9.82)
function kuliah(t) {
  let w = K.classBg(t);
  const n = t < 7.9 ? 1 : t < 8.6 ? 2 : 3;
  w += slideCard(n, 150, 330, 780, { a: 1 });
  const ds = rk('netral', 'menunjuk', { yaw: 0.4, gazeX: 0.6, mouth: M.mid, armR: { wx: 330, wy: 330 + 18 * Math.sin(t * 5), ex: 340, ey: 400, finger: 1, fa: -60, front: 1 } });
  w += RK(ds, 90, 1010, 0.6, { t, uid: 'dsP', palette: PALETTE_DOSEN });
  // Raka mencatat, kewalahan
  const st = rk('kaget', 'netral', { ...ARMS_DESK, gazeY: 0.6, armR: { wx: 250 + 8 * Math.sin(t * 14), wy: 540, ex: 308, ey: 500, finger: 0, front: 1 }, sweat: 0.7, wide: 0.5 });
  w += RK(st, 640, 1445, 0.84, { t, uid: 'rkP3', outfit: 'kuliah' });
  w += S.deskTop(DY + 30) + S.deskFront(DY + 30) + K.openBook(640, DY + 90, 0.52, { cover: '#E8665F', ink: '#C9D4D9' });
  w += `<g transform="translate(850 1130)">${A.wallClock(0, 0, 72, 9 + (t - 7.2) / 6, '')}</g>`;
  let ov = chip(540, 290, 'Dosen: satu slide cuma sebentar', { bg: COL.indigo, w: 980, fs: 38, a: win(t, 7.2, 9.82, 0.12), k: pk(t, 7.2) });
  const z = 1 + 0.05 * clamp((t - 7.2) / 2.6, 0, 1);
  return `<g transform="translate(540 1000) scale(${z.toFixed(4)}) translate(-540 -1000)">${w}</g>${ov}`;
}

// ================================================================ 4. DI RUMAH: gambar dan istilah yang bikin mikir (9.82 - 16.26)
function rumah(t) {
  let w = K.studyBg(t) + K.lamp(960, 1196, 1.1);
  const ex = t < 11.4 ? 'netral' : t < 13.1 ? 'berpikir' : t < 14.2 ? 'bingung' : 'melongo';
  const st = rk(ex, 'netral', { ...ARMS_DESK, gazeY: -0.3, tilt: t > 13.1 ? -5 + 3 * Math.sin(t * 2) : 0, sweat: sm((t - 13.1) / 0.8), bags: 0.25 });
  w += RK(st, 540, 1450, 0.82, { t, uid: 'rkP4', outfit: 'santai' });
  w += S.deskTop(DY + 30) + S.deskFront(DY + 30) + S.lapLid(540, DY - 80, 320, 190);
  const u = eob((t - 9.9) / 0.5);
  w += slideCard(1, SC_X, SC_Y + (1 - u) * 60, SC_W, { a: pa(t, 9.9, 0.12) });
  const [gx, gy] = scPt(640, 430), [tx, ty] = scPt(1380, 440);
  if (t > 11.38 && t < 12.5) w += ring(gx, gy, 66, t);
  if (t > 12.42 && t < 14.4) w += ring(tx, ty, 82, t, '#E8665F');
  if (t > 13.3) w += S.qm(540, 840, t, 1.1, 3);
  if (t > 14.2) w += `<g opacity="${sm((t - 14.2) / 0.3).toFixed(2)}">${K.spiral(700, 900, t, 0.7)}</g>`;
  const c = smoothKeys(t, [[9.82, 540, 960, 1], [11.2, 540, 960, 1], [11.9, gx, gy + 20, 2.0], [12.3, gx, gy + 20, 2.0], [12.9, tx - 30, ty, 2.0], [13.8, tx - 30, ty, 2.0], [14.6, 540, 1000, 1.3], [16.26, 540, 960, 1.05]]);
  let ov = chip(540, 290, 'Isinya gambar dan istilah…', { bg: COL.green, w: 980, fs: 40, a: win(t, 11.2, 14.1, 0.12), k: pk(t, 11.2) });
  ov += chip(540, 290, '“Ini maksudnya apa?”', { bg: COL.coral, w: 900, fs: 48, a: win(t, 14.2, 16.26, 0.12), k: pk(t, 14.2) });
  ov += chip(540, 290, 'Di rumah, slide yang sama', { bg: COL.indigo, w: 900, fs: 40, a: win(t, 9.9, 11.2, 0.12), k: pk(t, 9.9) });
  return cam(w, c) + ov;
}

// ================================================================ 5. PUNCHLINE: mau ke slide berikutnya, yang ini belum paham (16.26 - 20.50)
function punch(t) {
  let w = K.studyBg(t) + K.lamp(960, 1196, 1.1);
  const ex = t < 17.9 ? 'netral' : t < 18.4 ? 'kaget' : 'bingung';
  const st = rk(ex, 'netral', { ...ARMS_DESK, gazeY: -0.3, tilt: t > 18.4 ? 5 * Math.sin(t * 3) : 0, sweat: 0.5 });
  w += RK(st, 540, 1450, 0.82, { t, uid: 'rkP5', outfit: 'santai' });
  w += S.deskTop(DY + 30) + S.deskFront(DY + 30) + S.lapLid(540, DY - 80, 320, 190);
  w += slideCard(1, SC_X, SC_Y, SC_W);
  // tombol "berikutnya" pada tampilan PPT (ilustrasi pemutar slide umum, bukan tampilan MEDCOEL)
  const bx = SC_X + SC_W - 70, by = SC_Y + SC_W * 9 / 32;
  const near = sm((t - 16.8) / 0.7) * (1 - sm((t - 18.2) / 0.5));
  w += `<g transform="translate(${f1(bx)} ${f1(by)}) scale(${(1 + 0.12 * near).toFixed(3)})">${C(0, 0, 44, '#0B4A8F')}${P('M-12 -22L18 0L-12 22Z', '#fff')}</g>`;
  w += `<g transform="translate(${f1(SC_X + 60)} ${f1(SC_Y + SC_W * 9 / 16 + 50)})">${R(0, -22, 130, 44, 'rgba(0,0,0,.55)', 22)}${T(65, 9, 'Slide 1/3', '#fff', 26)}</g>`;
  // kursor bergerak ke tombol, ragu, lalu kembali ke gambar slide 1
  const cxp = lerpKeys(t, [[16.26, 700], [17.4, bx - 8], [18.3, bx - 8], [19.1, 360], [20.5, 360]]);
  const cyp = lerpKeys(t, [[16.26, 1000], [17.4, by + 6], [18.3, by + 6], [19.1, SC_Y + 250], [20.5, SC_Y + 250]]) + (t > 17.5 && t < 18.3 ? Math.sin(t * 30) * 4 : 0);
  w += `<g transform="translate(${f1(cxp)} ${f1(cyp)})"><path d="M0 0 L0 38 L10 29 L17 46 L25 42 L18 26 L31 26Z" fill="#fff" stroke="#0A3830" stroke-width="3" stroke-linejoin="round"/></g>`;
  if (t > 18.3) w += S.qm(560, 800, t, 1.1, 3);
  if (t > 19.0) w += `<g transform="translate(${f1(cxp + 40)} ${f1(cyp - 20)})">${ring(0, 0, 70, t)}</g>`;
  let ov = chip(540, 290, 'Mau lanjut ke slide berikutnya…', { bg: COL.green, w: 1000, fs: 38, a: win(t, 16.3, 18.4, 0.12), k: pk(t, 16.3) });
  ov += chip(540, 290, 'Yang ini aja belum paham!', { bg: COL.coral, w: 940, fs: 46, a: win(t, 18.4, 20.5, 0.12), k: pk(t, 18.4) });
  const z = 1 + 0.04 * clamp((t - 16.26) / 4.2, 0, 1);
  return `<g transform="translate(540 1000) scale(${z.toFixed(4)}) translate(-540 -1000)">${w}</g>${ov}`;
}

export const SCENES_P1 = [
  { t0: 0, draw: hook },
  { t0: 4.04, draw: solusi },
  { t0: 7.2, draw: kuliah },
  { t0: 9.82, tr: { type: 'iris', d: 0.45, cx: 540, cy: 900 }, draw: rumah },
  { t0: 16.26, tr: { type: 'wipe', d: 0.35 }, draw: punch },
];
