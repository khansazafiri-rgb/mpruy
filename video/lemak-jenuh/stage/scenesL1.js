// Adegan 1-5: hook di warung, kolesterol dan peringatan, fungsi lemak dan kolesterol (membran sel), lemak jenuh dan LDL (hati dan darah).
import { rk, RK, TK, tk, M, f1, COL, A, R, C, E, P, L, T, chip } from './core.js';
import { clamp, lerp, sm, eo, eob, win } from './core.js';
import * as K from './artK.js';
import * as MD from './artM.js';
import * as W from './artW.js';
import { koriSvg, pa, pk, lerpKeys, mix } from './shared.js';

const ARMS = { armL: { wx: 150, wy: 540, ex: 92, ey: 500, finger: 0, front: 1 }, armR: { wx: 250, wy: 540, ex: 308, ey: 500, finger: 0, front: 1 } };
const wristAt = (st, x, fy, k) => [x - 200 * k + st.armR.wx * k, fy - 778 * k + (st.armR.wy + (st.bob || 0)) * k];
const outline = (txt, x, y, size, fill = '#fff', sw = 14) => T(x, y, txt, fill, size, `stroke="#0A1A2E" stroke-width="${sw}" paint-order="stroke" stroke-linejoin="round"`);
const smoothKeys = (t, keys) => { let i = 0; while (i + 1 < keys.length && t >= keys[i + 1][0]) i++; if (i + 1 >= keys.length) return keys[keys.length - 1].slice(1); const a = keys[i], b = keys[i + 1], u = sm((t - a[0]) / (b[0] - a[0])); return a.slice(1).map((v, j) => lerp(v, b[j + 1], u)); };
const camG = (g, [x, y, s]) => `<g transform="translate(540 960) scale(${s.toFixed(4)}) translate(${f1(-x)} ${f1(-y)})">${g}</g>`;
const darkBg = (id, c0 = '#12474A', c1 = '#0A2F33') => A.softBg(c0, c1, id);
export const bannerBig = (lines, y, a, k, bg = 'rgba(10,26,46,.82)') => `<g transform="translate(540 ${y}) scale(${k.toFixed(3)})" opacity="${a.toFixed(3)}">${R(-500, -92, 1000, 100 + lines.length * 98, bg, 56)}${lines.map((l, i) => T(0, 6 + i * 98, l[0], l[1] ?? '#fff', l[2] ?? 80)).join('')}</g>`;

// ================================================================ 1. HOOK: gorengan, freeze, masuk ke dalam tubuh (0 - 5.16)
function hook(t) {
  const RX = 540, FY = 1500, k = 1.0, frozen = t < 1.9;
  const st = rk(frozen ? 'senang' : 'senang', 'netral', { ...ARMS, armR: { wx: 262, wy: 330 + (frozen ? 0 : 0), ex: 322, ey: 420, finger: 0, front: 1 }, gazeY: -0.2 });
  let a = W.warungBg(t);
  a += RK(st, RX, FY, k, { t, uid: 'rkL1', outfit: 'santai', noIdle: frozen });
  const [hx, hy] = wristAt(st, RX, FY, k);
  a += W.tempe(hx + 6, hy - 40, 0.95);
  const u = sm((t - 2.2) / 1.5);
  // tubuh bagian dalam: dada dan perut (skema) dengan jantung dan arteri koroner
  let b = darkBg('sl1') + W.torso(540, 960, 1.55) + MD.heart(470, 760, 0.85, {});
  const world = u < 1 ? `<g opacity="${(1 - u).toFixed(3)}">${camG(a, [540, 1130, 1 + 2.4 * u])}</g>` : '';
  const inner = u > 0 ? `<g opacity="${u.toFixed(3)}">${camG(b, [540, 900, 0.55 + 0.45 * u + 0.4 * sm((t - 3.7) / 1.4)])}</g>` : '';
  let ov = bannerBig([['LEMAK DAN', '#fff', 84], ['KOLESTEROL:', '#F8C038', 96], ['APA HUBUNGANNYA?', '#fff', 70]], 350, pa(t, 0.25, 0.12), 0.85 + 0.15 * eob((t - 0.25) / 0.4));
  if (frozen) ov += `<rect width="1080" height="1920" fill="rgba(255,255,255,${(0.1 * (1 - sm((t - 0.2) / 0.3))).toFixed(3)})"/>${t > 0.5 ? `<g opacity="${(0.9 * win(t, 0.5, 1.9, 0.15)).toFixed(2)}">${chip(540, 1250, 'FREEZE', { bg: COL.coral, w: 360, fs: 40 })}</g>` : ''}`;
  return world + inner + ov;
}

// ================================================================ 2. SITUASI RELATE: "Hati-hati, nanti kolesterol!" (5.16 - 14.42)
function peringatan(t) {
  let w = W.warungBg(t);
  const rx = 720, tx = 300, FY = 1500, k = 0.9;
  const eating = t < 7.4;
  const ex = t < 7.5 ? 'senang' : t < 8.6 ? 'kaget' : t < 10.9 ? 'bingung' : 'berpikir';
  const st = rk(ex, 'netral', { ...ARMS, armR: { wx: 262, wy: eating ? 330 : 400, ex: 322, ey: 430, finger: 0, front: 1 }, gazeX: t > 7.5 ? -0.7 : 0, tilt: t > 9 ? -4 : 0, sweat: t > 8.6 ? 0.5 : 0 });
  w += RK(st, rx, FY, k, { t, uid: 'rkL2', outfit: 'santai' });
  const [hx, hy] = wristAt(st, rx, FY, k); w += W.tempe(hx + 4, hy - 34, 0.85);
  const tin = sm((t - 7.4) / 0.6);
  w += TK(tk('jahil', 'berdiri', { yaw: 0.3 }), lerp(-120, tx, tin), FY, k, { t, uid: 'tkL2' });
  let ov = '';
  ov += chip(540, 290, 'Kamu lagi menikmati gorengan…', { bg: COL.green, w: 1000, fs: 38, a: win(t, 5.2, 7.5, 0.15), k: pk(t, 5.2) });
  if (t > 8.4) ov += `<g transform="translate(330 760) scale(${(0.8 + 0.2 * eob((t - 8.4) / 0.35)).toFixed(3)})" opacity="${win(t, 8.4, 10.9, 0.12).toFixed(2)}">${A.bubble(-300, -150, 600, 190, '#fff', 'bl')}${T(0, -62, '“Hati-hati,', '#172B38', 56)}${T(0, 4, 'nanti kolesterol!”', '#C0392B', 56)}</g>`;
  // 10.94: pertanyaan hubungan makanan - pembuluh darah
  if (t > 11.0) { const q = sm((t - 11.0) / 0.4), pb = 0.5 + 0.5 * sm((t - 12.4) / 0.5);
    ov += `<g opacity="${q.toFixed(2)}">${A.thought(120, 330, 840, 300, '#fff', [720, 700])}<g transform="translate(260 480)">${W.tempe(0, 0, 0.9)}</g>${T(540, 520, '?', '#E8665F', 120)}<g transform="translate(800 480)"><circle r="76" fill="#F5E3C8"/><circle r="52" fill="#D9786C"/><circle r="34" fill="#B8322A"/></g>${L('M350 480H450M630 480H720', '#9AA9B0', 8, 'stroke-dasharray="14 12"')}</g>`;
    ov += chip(540, 290, 'Apa hubungannya dengan pembuluh darah?', { bg: COL.indigo, w: 1040, fs: 34, a: win(t, 11.0, 14.42, 0.12), k: pk(t, 11.0) }); }
  ov += koriSvg(120, 1420, 0.8, t, { wave: t < 7 ? 1 : 0, a: pa(t, 5.3, 0.2) });
  return w + ov;
}

// ================================================================ 3. LEMAK DAN KOLESTEROL PUNYA FUNGSI (15.18 - 22.86)
function fungsi(t) {
  let w = darkBg('sl3'), ov = '';
  const mem = pa(t, 15.2, 0.25);
  w += `<g opacity="${mem.toFixed(2)}" transform="translate(0 ${f1((1 - mem) * 40)})">${R(40, 420, 1000, 360, 'rgba(255,255,255,.06)', 40)}${W.membrane(70, 600, 940, t)}</g>`;
  ov += chip(540, 290, 'Tubuh tetap membutuhkan lemak & kolesterol', { bg: COL.green, w: 1040, fs: 34, a: pa(t, 15.2, 0.15), k: pk(t, 15.2) });
  ov += MD.label(110, 520, 190, 450, 'Membran sel: lapisan lemak ganda', { anchor: 'start', fs: 30, a: pa(t, 16.6, 0.2) });
  ov += MD.label(300, 590, 500, 800, 'Kolesterol (di dalam membran)', { anchor: 'start', fs: 30, a: pa(t, 17.9, 0.2), line: '#F8C038' });
  // empat fungsi
  const cards = [[19.3, 'Menyusun membran', `<g transform="scale(.8)">${W.membrane(-60, 0, 120, 0)}</g>`], [20.0, 'Bahan hormon', `<g>${P('M-30 -18L0 -36L30 -18L30 18L0 36L-30 18Z', 'none', 'stroke="#E8665F" stroke-width="7"')}${C(0, 0, 9, '#E8665F')}</g>`], [20.7, 'Bahan vitamin D', `<g>${C(-6, -8, 18, '#F8C038')}${T(14, 22, 'D', '#E8A838', 46)}</g>`], [21.4, 'Bahan garam empedu', `<g>${P('M0 -36Q28 -4 22 18Q16 36 0 36Q-16 36 -22 18Q-28 -4 0 -36Z', '#7FB26A')}</g>`]];
  cards.forEach(([t0, txt, icon], i) => { const a = pa(t, t0, 0.15), x = 270 + (i % 2) * 540, y = 960 + Math.floor(i / 2) * 200;
    ov += `<g opacity="${a.toFixed(2)}" transform="translate(${x} ${y}) scale(${(0.85 + 0.15 * eob((t - t0) / 0.3)).toFixed(3)})">${R(-250, -80, 500, 160, 'rgba(0,0,0,.28)', 40, 'transform="translate(5 10)"')}${R(-250, -80, 500, 160, '#fff', 40)}<g transform="translate(-170 0)">${C(0, 0, 54, '#EAF4F0')}${icon}</g>${T(-90, 12, txt, '#172B38', 28, '', 'start')}</g>`; });
  ov += chip(540, 1285, 'Bukan untuk dihindari sepenuhnya', { bg: COL.indigo, w: 880, fs: 36, a: win(t, 19.0, 22.86, 0.15), k: pk(t, 19.0) });
  ov += koriSvg(940, 1420, 0.7, t, { wave: 1 });
  return w + ov;
}

// ================================================================ 4a. LEMAK JENUH (22.86 - 26.72)
function jenuh(t) {
  let w = darkBg('sl4a'), ov = '';
  w += R(-100, 1040, 1300, 700, '#B58A5E') + R(-100, 1030, 1300, 18, '#8A6440');
  const items = [[22.9, 'Santan kental', W.santan(0, 0, 1.7)], [23.7, 'Lemak/kulit daging', W.ayamGoreng(0, 0, 1.6)], [24.5, 'Mentega', W.butter(0, 0, 1.7)]];
  items.forEach(([t0, txt, ic], i) => { const a = pa(t, t0, 0.15), x = 190 + i * 350;
    w += `<g opacity="${a.toFixed(2)}" transform="translate(${x} ${f1(900 - (1 - eob((t - t0) / 0.4)) * 80)})">${E(0, 120, 150, 24, 'rgba(0,0,0,.22)')}${ic}</g>`;
    ov += `<g opacity="${a.toFixed(2)}" transform="translate(${x} 1130)">${R(-150, -26, 300, 52, 'rgba(6,28,32,.88)', 26)}${T(0, 10, txt, '#fff', 28)}</g>`; });
  ov += chip(540, 290, 'Makanan tinggi lemak jenuh', { bg: COL.coral, w: 880, fs: 44, a: pa(t, 22.86, 0.15), k: pk(t, 22.86) });
  ov += chip(540, 460, 'terlalu sering (jangka panjang)', { bg: COL.indigo, w: 880, fs: 36, a: pa(t, 24.0, 0.2), k: pk(t, 24.0) });
  ov += `<g opacity="${pa(t, 26.0, 0.2).toFixed(2)}">${T(540, 1290, 'Contoh, bukan daftar lengkap', '#fff', 30, 'opacity=".85"')}</g>`;
  return w + ov;
}

// ================================================================ 4b. KADAR LDL DALAM DARAH MENINGKAT (26.72 - 30.44)
function ldlNaik(t) {
  let w = darkBg('sl4b'), ov = '';
  const u = sm((t - 26.72) / 2.2);
  // hati (organ) di kiri, pembuluh dengan LDL di kanan; panah dari makanan ke hati
  w += `<g transform="translate(250 610)">${P('M-170 -20Q-70 -90 120 -40Q150 40 40 110Q-100 140 -170 60Z', '#9B4D3E', 'stroke="#6E3226" stroke-width="6"')}${P('M-40 -30Q20 -60 80 -30', 'none', 'stroke="#B96A58" stroke-width="8" stroke-linecap="round"')}</g>`;
  ov += MD.label(250, 640, 90, 800, 'Hati', { anchor: 'start', fs: 36 });
  w += MD.longVessel(430, 560, 600, 200, { narrow: 0, t, rbc: 6 });
  // LDL yang beredar bertambah
  const n = Math.round(3 + 13 * u), rr = (i) => ((i * 53) % 100) / 100;
  for (let i = 0; i < n; i++) { const px = 450 + (((i * 600 / 16 + t * 90) % 560)), py = 600 + 120 * rr(i) + 30; w += MD.ldl(px, py, 16, { rot: i * 50 }); }
  ov += MD.label(900, 640, 900, 880, 'LDL', { anchor: 'end', fs: 36, line: '#F8C038' });
  ov += `<g transform="translate(730 520)">${T(0, 0, 'Darah', '#fff', 34, 'opacity=".9"')}</g>`;
  // alat ukur kadar LDL
  const gx = 140, gy = 1010, gh = 300;
  w += `<g>${R(gx, gy, 90, gh, 'rgba(255,255,255,.14)', 28)}${R(gx, gy + gh * (1 - 0.2 - 0.6 * u), 90, gh * (0.2 + 0.6 * u), '#F8C038', 28)}</g>`;
  ov += `<g transform="translate(280 ${f1(gy + gh * (1 - 0.2 - 0.6 * u) + 12)})">${T(0, 0, 'LDL naik', '#F8C038', 50, '', 'start')}</g>${T(185, 1350, 'Kadar LDL dalam darah', '#fff', 30)}`;
  ov += chip(540, 290, 'Kadar LDL dalam darah bisa meningkat', { bg: COL.coral, w: 1040, fs: 36, a: pa(t, 26.74, 0.15), k: pk(t, 26.74) });
  ov += `<g opacity="${pa(t, 28.0, 0.25).toFixed(2)}">${R(480, 1040, 540, 250, 'rgba(255,255,255,.1)', 30)}${T(750, 1096, 'Pada sebagian orang.', '#fff', 30)}${T(750, 1142, 'Salah satu mekanisme: pembersihan', '#C9D4D9', 25)}${T(750, 1178, 'LDL oleh hati berkurang.', '#C9D4D9', 25)}${T(750, 1224, 'Faktor lain ikut berperan.', '#C9D4D9', 25)}</g>`;
  ov += `<g opacity="${pa(t, 26.9, 0.2).toFixed(2)}" transform="translate(360 880)">${W.santan(0, 0, 0.6)}${W.butter(80, 14, 0.5)}</g>`;
  ov += `<g opacity="${pa(t, 27.0, 0.2).toFixed(2)}" transform="translate(270 740)">${P('M0 -22L-0 22L-40 0Z', '#F8C038')}</g>`;
  return w + ov;
}

export const SCENES_L1 = [
  { t0: 0, draw: hook },
  { t0: 5.16, draw: peringatan },
  { t0: 15.18, tr: { type: 'wipe', d: 0.4 }, draw: fungsi },
  { t0: 22.86, tr: { type: 'iris', d: 0.45, cx: 540, cy: 900 }, draw: jenuh },
  { t0: 26.72, tr: { type: 'wipe', d: 0.4 }, draw: ldlNaik },
];
