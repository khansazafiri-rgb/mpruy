// Adegan 11-15: jantung (arteri koroner), luruskan miskonsepsi, langkah praktis, penutup MEDCOEL.
import { PALETTE_ADIK } from '../../../brand/characters/raka/raka.js';
import { rk, RK, TK, tk, M, f1, COL, A, R, C, E, P, L, T, chip } from './core.js';
import { clamp, lerp, sm, eo, eob, win } from './core.js';
import * as K from './artK.js';
import * as MD from './artM.js';
import * as W from './artW.js';
import { panel, fr } from './panels.js';
import { koriSvg, logoCard, tag, pa, pk, lerpKeys, mix, laptopFrame } from './shared.js';
import { bannerBig } from './scenesL1.js';

const darkBg = (id, c0 = '#12474A', c1 = '#0A2F33') => A.softBg(c0, c1, id);
const pill = (x, y, txt, a, c = '#fff', fs = 27, anchor = 'start') => `<g opacity="${a.toFixed(2)}">${R(anchor === 'start' ? x - 10 : x - txt.length * fs * 0.52 - 14, y - fs * 0.8, txt.length * fs * 0.52 + 28, fs * 1.6, 'rgba(6,28,32,.9)', fs * 0.8)}${T(anchor === 'start' ? x + 4 : x - 4, y + fs * 0.34, txt, c, fs, '', anchor)}</g>`;
const note = (txt, y = 1335, a = 1) => `<g opacity="${a.toFixed(2)}">${T(540, y, txt, '#C9D4D9', 26, 'opacity=".9"')}</g>`;
const wristAt = (st, x, fy, k) => [x - 200 * k + st.armR.wx * k, fy - 778 * k + (st.armR.wy + (st.bob || 0)) * k];

// ================================================================ 10. JANTUNG: ARTERI KORONER DISUMBAT (63.4 - 67.64)
function jantung(t) {
  let w = darkBg('sl10'), ov = '';
  const hs = 1.0, hx = 540, hy = 800, pull = sm((t - 63.4) / 1.3);
  const occl = sm((t - 63.9) / 0.8), isk = sm((t - 65.7) / 1.0) * (0.85 + 0.15 * Math.sin(t * 6));
  w += MD.heart(hx, hy, hs * (0.7 + 0.3 * pull), { occl, isk });
  const lad = [hx + 50 * hs * (0.7 + 0.3 * pull), hy - 60 * hs * (0.7 + 0.3 * pull)];
  // arteri (penampang) menyusut ke titik sumbatan saat kamera menarik keluar
  if (pull < 1) { const sc = 1 - 0.82 * pull, ax = lerp(540, lad[0], pull), ay = lerp(760, lad[1], pull); w += `<g opacity="${(1 - pull).toFixed(2)}">${MD.artery(ax, ay, 300 * sc, { growth: 0.85, angle: Math.PI * 0.5, rupture: 1, thrombus: 0.95, rbc: 4 })}</g>`; }
  const sx = (v) => hx + v * hs, sy = (v) => hy + v * hs;
  ov += `<g opacity="${pa(t, 64.3, 0.2).toFixed(2)}">${MD.label(sx(50), sy(-60), 860, 560, 'Bekuan menyumbat', { anchor: 'end', fs: 30, line: '#D9C2EC' })}</g>`;
  ov += `<g opacity="${pa(t, 65.0, 0.2).toFixed(2)}">${MD.label(sx(-250), sy(-10), 60, 640, 'Arteri koroner', { anchor: 'start', fs: 30, line: '#E5382E' })}${MD.label(sx(48), sy(110), 880, 820, 'Arteri koroner (LAD)', { anchor: 'end', fs: 26, line: '#E5382E' })}</g>`;
  ov += `<g opacity="${pa(t, 65.9, 0.2).toFixed(2)}">${MD.label(sx(190), sy(70), 860, 1090, 'Otot jantung kurang darah', { anchor: 'end', fs: 28, line: '#C77DBA' })}</g>`;
  ov += `<g opacity="${pa(t, 64.7, 0.2).toFixed(2)}">${MD.label(sx(-100), sy(110), 60, 960, 'Ruang jantung (bukan pembuluh)', { anchor: 'start', fs: 26, line: '#fff' })}</g>`;
  ov += chip(540, 290, 'Bekuan menyumbat arteri koroner', { bg: COL.coral, w: 1040, fs: 36, a: win(t, 63.4, 65.8, 0.12), k: pk(t, 63.4) });
  ov += chip(540, 290, 'SERANGAN JANTUNG', { bg: '#B8322A', w: 880, fs: 50, a: pa(t, 65.8, 0.12), k: pk(t, 65.8) });
  ov += `<g opacity="${pa(t, 66.5, 0.2).toFixed(2)}">${chip(540, 1250, 'kemungkinan akibat proses ini, bukan akibat pasti setiap makanan berlemak', { bg: 'rgba(6,28,32,.9)', w: 1040, fs: 26, a: 1, k: 1 })}</g>`;
  ov += note('Ilustrasi skematis, tidak sesuai skala', 1335);
  return w + ov;
}

// ================================================================ 11. MISKONSEPSI: BUKAN AKIBAT SATU KALI MAKAN (67.64 - 77.28)
function miskonsepsi(t) {
  let w = W.warungBg(t), ov = '';
  const phase2 = t >= 72.64;
  const st = rk(phase2 ? 'senang' : 'lega', 'netral', { yaw: -0.2, armR: { wx: 262, wy: 400, ex: 322, ey: 430, finger: 0, front: 1 } });
  w += RK(st, 760, 1500, 0.72, { t, uid: 'rkL11', outfit: 'santai' });
  const [hx, hy] = wristAt(st, 760, 1500, 0.72); w += W.tempe(hx + 4, hy - 30, 0.7);
  ov += koriSvg(250, 1440, 0.95, t, { wave: 1 });
  if (!phase2) {
    ov += bannerBig([['BUKAN AKIBAT', '#fff', 84], ['SATU KALI MAKAN', '#F8C038', 84]], 560, pa(t, 67.7, 0.12), 0.85 + 0.15 * eob((t - 67.7) / 0.4));
    ov += chip(540, 880, 'Satu kali makan gorengan ≠ pembuluh langsung tersumbat', { bg: COL.green, w: 1040, fs: 28, a: pa(t, 69.0, 0.2), k: pk(t, 69.0) });
  } else {
    ov += chip(540, 290, 'Risiko dipengaruhi:', { bg: COL.indigo, w: 760, fs: 44, a: pa(t, 72.64, 0.12), k: pk(t, 72.64) });
    const cards = [[73.1, 'Pola makan jangka panjang', `<g>${K.calendarFlip(0, 0, 0.28, '', 0, '')}${A.T(0, 12, '…', '#E8665F', 40)}</g>`], [75.0, 'Genetik', W.dna(0, 0, 0.55, t)], [75.9, 'Faktor lain', `<g>${A.T(0, 18, '+', '#1D7B75', 80)}</g>`]];
    cards.forEach(([t0, txt, ic], i) => { const a = pa(t, t0, 0.15), y = 560 + i * 190;
      ov += `<g opacity="${a.toFixed(2)}" transform="translate(540 ${y}) scale(${(0.88 + 0.12 * eob((t - t0) / 0.3)).toFixed(3)})">${R(-440, -78, 880, 156, 'rgba(0,0,0,.25)', 42, 'transform="translate(6 12)"')}${R(-440, -78, 880, 156, '#fff', 42)}<g transform="translate(-340 0)">${C(0, 0, 58, '#EAF4F0')}${ic}</g>${T(-250, 14, txt, '#172B38', 40, '', 'start')}</g>`; });
  }
  return w + ov;
}

// ================================================================ 12. LANGKAH PRAKTIS (77.28 - 94.46)
function langkah(t) {
  let w, ov = '';
  if (t < 81.84) { // 77.28 - 81.84: apa yang bisa kamu lakukan, kurangi lemak jenuh dan lemak trans
    w = A.softBg('#2C5E6B', '#0A2F33', 'sl12a');
    w += RK(rk(t < 79.6 ? 'berpikir' : 'senang', 'netral', { yaw: 0.2 }), 330, 1480, 0.7, { t, uid: 'rkL12' , outfit: 'santai' });
    ov += koriSvg(780, 1440, 0.9, t, { wave: 1 });
    if (t < 79.62) ov += chip(540, 290, 'Jadi, apa yang bisa kamu lakukan?', { bg: COL.indigo, w: 1040, fs: 38, a: pa(t, 77.3, 0.12), k: pk(t, 77.3) }) + `<g opacity="${pa(t, 77.6, 0.2).toFixed(2)}">${T(540, 760, '?', '#F8C038', 360, 'stroke="#0A2F33" stroke-width="18" paint-order="stroke"')}</g>`;
    else {
      ov += chip(540, 290, 'Kurangi lemak jenuh & lemak trans', { bg: COL.coral, w: 1040, fs: 36, a: pa(t, 79.62, 0.12), k: pk(t, 79.62) });
      const it = [[79.8, W.gorenganPlate(0, 0, 0.9), 'Gorengan'], [80.3, W.ayamGoreng(0, 0, 0.9), 'Kulit/lemak daging'], [80.8, W.butter(0, 0, 0.85), 'Mentega'], [81.1, W.santan(0, 0, 0.85), 'Santan kental']];
      it.forEach(([t0, ic, txt], i) => { const a = pa(t, t0, 0.15), x = 270 + (i % 2) * 540, y = 640 + Math.floor(i / 2) * 280;
        ov += `<g opacity="${a.toFixed(2)}" transform="translate(${x} ${y}) scale(${(0.85 + 0.15 * eob((t - t0) / 0.3)).toFixed(3)})">${R(-240, -120, 480, 240, 'rgba(255,255,255,.95)', 36)}<g transform="translate(0 -14)">${ic}</g>${T(0, 100, txt, '#172B38', 28)}<g transform="translate(150 -78)">${C(0, 0, 30, '#E8665F')}${P('M-14 -4L0 14L14 -4', 'none', 'stroke="#fff" stroke-width="7" stroke-linecap="round" stroke-linejoin="round"')}</g></g>`; });
    }
    return w + ov;
  }
  if (t < 88.06) { // 81.84 - 88.06: pilih lemak tak jenuh lebih sering
    w = A.softBg('#2F6B4B', '#0A2F33', 'sl12c');
    ov += chip(540, 290, 'Pilih lemak tak jenuh lebih sering', { bg: COL.green, w: 1040, fs: 38, a: pa(t, 81.84, 0.12), k: pk(t, 81.84) });
    const fd = [[85.18, 'Ikan', W.ikan(0, 0, 1.4), 270, 650], [86.14, 'Kacang-kacangan', W.kacang(0, 0, 1.4), 810, 650], [87.2, 'Alpukat', W.alpukat(0, 0, 1.4), 540, 1020]];
    fd.forEach(([t0, txt, ic, x, y]) => { const a = pa(t, t0 - 0.2, 0.2);
      ov += `<g opacity="${a.toFixed(2)}" transform="translate(${x} ${y}) scale(${(0.85 + 0.15 * eob((t - t0 + 0.2) / 0.3)).toFixed(3)})">${R(-250, -190, 500, 380, 'rgba(255,255,255,.96)', 40)}<g transform="translate(0 -18)">${ic}</g>${T(0, 150, txt, '#172B38', 38)}<g transform="translate(180 -140)">${C(0, 0, 32, '#3DB46E')}${P('M-14 0L-4 12L16 -10', 'none', 'stroke="#fff" stroke-width="8" stroke-linecap="round" stroke-linejoin="round"')}</g></g>`; });
    ov += `<g opacity="${pa(t, 82.6, 0.2).toFixed(2)}">${T(540, 420, 'lemak tak jenuh (mis. mono- dan poli-tak jenuh)', '#E8F3EC', 28, '', 'middle')}</g>`;
    w += RK(rk('senang', 'senang', { bob: -Math.max(0, Math.sin(t * 4)) * 4 }), 200, 1470, 0.62, { t, uid: 'rkL12c', outfit: 'santai' });
    for (let q = 0; q < 6; q++) { const a = q * 1.1 + t * 1.3; w += K.bulb ? '' : ''; w += `<g opacity=".55">${C(540 + Math.cos(a) * (360 + 30 * q), 760 + Math.sin(a * 0.8) * 250, 12 + (q % 3) * 6, '#E8F3EC')}</g>`; }
    ov += koriSvg(930, 1400, 0.7, t, { wave: 1 });
    return w + ov;
  }
  // 88.06 - 94.46: bukan sekadar menghindari semua lemak, tapi memahami jenis dan jumlah
  w = A.softBg('#2C5E6B', '#0A2F33', 'sl12d');
  w += R(-100, 1000, 1300, 900, '#B58A5E') + R(-100, 992, 1300, 18, '#8A6440');
  const st = rk(t < 91.0 ? 'berpikir' : 'mengerti', 'netral', { ...{ armL: { wx: 150, wy: 540, ex: 92, ey: 500, finger: 0, front: 1 }, armR: { wx: 250, wy: 540, ex: 308, ey: 500, finger: 0, front: 1 } }, gazeY: 0.4, tilt: 3 * Math.sin(t * 1.6), bob: Math.sin(t * 2.4) * 3 });
  w += RK(st, 330, 1420, 0.8, { t, uid: 'rkL12d', outfit: 'santai' });
  for (let q = 0; q < 5; q++) { const a = q * 1.3 + t * 1.1; w += `<g opacity=".5">${C(700 + Math.cos(a) * 240, 620 + Math.sin(a * 0.9) * 160, 10 + (q % 3) * 5, '#E8F3EC')}</g>`; }
  w += R(-100, 1190, 1300, 40, '#C98F5E') + R(-100, 1230, 1300, 400, '#8A5A34');
  w += `<g transform="translate(700 1190)">${W.nasiSayurPiring(0, 0, 0.9)}${W.ikan(-120, -26, 0.32)}${W.alpukat(110, -34, 0.28)}${W.kacang(10, -80, 0.2)}</g>`;
  ov += chip(540, 290, 'Bukan sekadar menghindari semua lemak', { bg: COL.indigo, w: 1040, fs: 32, a: win(t, 88.06, 90.8, 0.12), k: pk(t, 88.06) });
  ov += chip(540, 290, 'Pahami JENIS dan JUMLAH', { bg: COL.green, w: 880, fs: 46, a: pa(t, 90.8, 0.12), k: pk(t, 90.8) });
  if (t > 91.1) { const u = eob((t - 91.1) / 0.5);
    ov += `<g opacity="${pa(t, 91.1, 0.2).toFixed(2)}" transform="translate(540 700) scale(${u.toFixed(3)})">${R(-380, -130, 760, 260, 'rgba(255,255,255,.95)', 44)}${T(-190, -10, 'JENIS', '#1D7B75', 64)}${T(-190, 60, 'lemak apa', '#6B7A83', 30)}${T(190, -10, 'JUMLAH', '#E8665F', 64)}${T(190, 60, 'seberapa banyak', '#6B7A83', 30)}${L('M0 -90V90', '#C9D4D9', 6)}</g>`; }
  ov += koriSvg(930, 1100, 0.7, t, { wave: 1 });
  return w + ov;
}

// ================================================================ 13. PENUTUP MEDCOEL (94.46 - 100.12)
function penutupWeb(t) { // 94.46 - 96.68: cara kerja tubuh lainnya (rekaman asli Human Anatomy 3D)
  let w = darkBg('sl13'), ov = '';
  const u = eob((t - 94.46) / 0.4), L0 = [60, 470, 960, 600];
  panel('lp', { clip: 'd', f: fr(t, 94.46, 1.0, 0), rect: [L0[0], L0[1] + (1 - u) * 40, L0[2], L0[3]], view: [0.75, 704, 396], a: pa(t, 94.46, 0.1), r: 18, noShadow: true });
  ov += laptopFrame(L0[0], L0[1] + (1 - u) * 40, L0[2], L0[3]);
  ov += chip(540, 290, 'Penasaran cara kerja tubuh lainnya?', { bg: COL.green, w: 1040, fs: 36, a: 1, k: pk(t, 94.46) });
  ov += tag(L0[0], 380, 'REKAMAN LAYAR ASLI: Human Anatomy 3D', 1);
  ov += koriSvg(900, 1380, 0.8, t, { wave: 1 });
  w += RK(rk('senang', 'senang', { bob: -Math.max(0, Math.sin(t * 4)) * 5 }), 250, 1450, 0.6, { t, uid: 'rkL13', outfit: 'santai' });
  return { w, ov };
}
function finale(t) { // 96.68 - 100.12
  let w = A.softBg('#0F5F57', '#0A3830', 'sl14'), ov = '';
  w += `<g opacity=".5">${Array.from({ length: 12 }, (_, i) => { const a = i * Math.PI / 6 + t * 0.12; return `<path d="M540 900L${f1(540 + Math.cos(a) * 1400)} ${f1(900 + Math.sin(a) * 1400)}L${f1(540 + Math.cos(a + 0.13) * 1400)} ${f1(900 + Math.sin(a + 0.13) * 1400)}Z" fill="rgba(255,255,255,.035)"/>`; }).join('')}</g>`;
  w += RK(rk('senang', 'senang', { bob: -Math.max(0, Math.sin(t * 4)) * 5 }), 300, 1440, 0.66, { t, uid: 'rkL14', outfit: 'santai' });
  ov += koriSvg(790, 1410, 0.9, t, { wave: 1 });
  ov += logoCard(540, 740, 0.7 + 0.3 * eob((t - 96.8) / 0.4), pa(t, 96.8, 0.1), 720);
  const k1 = 0.8 + 0.2 * eob((t - 97.0) / 0.4); ov += `<g opacity="${pa(t, 97.0, 0.12).toFixed(3)}" transform="translate(540 440) scale(${k1.toFixed(3)})">${T(0, 0, 'BELAJAR KEDOKTERAN', '#fff', 66, 'stroke="#062B25" stroke-width="18" paint-order="stroke" stroke-linejoin="round"')}${T(0, 120, 'GRATIS', '#F8C038', 136, 'stroke="#062B25" stroke-width="22" paint-order="stroke" stroke-linejoin="round"')}</g>`;
  if (t > 98.5) ov += `<g transform="translate(540 915) scale(${(0.8 + 0.2 * eob((t - 98.5) / 0.3)).toFixed(3)})" opacity="${pa(t, 98.5, 0.1).toFixed(2)}">${R(-300, -60, 600, 124, 'rgba(0,0,0,.3)', 62, 'transform="translate(0 8)"')}${R(-300, -62, 600, 124, '#F8C038', 62)}${T(0, 22, 'medcoel.com', '#0A3830', 68)}</g>`;
  return { w, ov };
}

export const SCENES_L3 = [
  { t0: 63.4, tr: { type: 'iris', d: 0.5, cx: 540, cy: 900 }, draw: jantung },
  { t0: 67.64, tr: { type: 'wipe', d: 0.4 }, draw: miskonsepsi },
  { t0: 77.28, tr: { type: 'wipe', d: 0.4 }, draw: langkah },
  { t0: 94.46, noZoom: true, draw: penutupWeb },
  { t0: 96.68, draw: finale },
];
