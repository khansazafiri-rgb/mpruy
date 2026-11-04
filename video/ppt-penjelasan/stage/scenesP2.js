// Adegan 6-8: pengajuan PPT (rekaman Chat Admin asli + tahapan), contoh penjelasan per slide (rekaman Drilling asli di laptop), penutup.
import { PALETTE_DOSEN } from '../../../brand/characters/raka/raka.js';
import { rk, RK, TK, tk, M, f1, COL, A, R, C, E, P, L, T, chip } from './core.js';
import { clamp, lerp, sm, eo, eob, win } from './core.js';
import * as S from './artS.js';
import * as K from './artK.js';
import { panel, fr } from './panels.js';
import { koriSvg, logoCard, tag, pa, pk, lerpKeys, mix, ipadFrame, laptopFrame } from './shared.js';
import { TAB } from './scenesP1.js';

const ZOOM = [50, 400, 980, 860];
const LAP = [60, 470, 960, 600];

// ================================================================ 6a. PENGAJUAN: rekaman Chat Admin asli di iPad (20.50 - 23.50)
function ajukan(t) {
  let w = A.softBg('#0F5F57', '#0A3830', 'sp6'), ov = '';
  const f = lerpKeys(t, [[20.5, 40], [21.1, 100], [21.5, 135], [21.9, 180], [22.3, 230], [22.7, 290], [23.1, 345], [23.5, 380]]);
  const z = sm((t - 20.9) / 0.6), rect = mix(TAB, ZOOM, z), s = lerp(TAB[2] / 820, ZOOM[2] / 820, z), vcy = lerp(550, 640, z);
  panel('tb', { clip: 'alur', f, rect, view: [s, 410, vcy], a: pa(t, 20.5, 0.1), r: lerp(30, 26, z), noShadow: true });
  ov += ipadFrame(rect[0], rect[1], rect[2], rect[3], 1);
  ov += chip(540, 290, 'AJUKAN LEWAT CHAT ADMIN', { bg: COL.green, w: 960, fs: 40, a: win(t, 20.5, 21.4, 0.1), k: pk(t, 20.5) });
  ov += chip(540, 290, 'PILIH: PPT MATERI', { bg: COL.indigo, w: 760, fs: 44, a: win(t, 21.4, 22.2, 0.1), k: pk(t, 21.4) });
  ov += chip(540, 290, 'PPT diekspor ke PDF dulu', { bg: COL.coral, w: 900, fs: 42, a: win(t, 22.2, 23.5, 0.1), k: pk(t, 22.2) });
  ov += tag(rect[0] + 40, rect[1] + rect[3] - 120, 'REKAMAN LAYAR ASLI', 1);
  ov += koriSvg(975, 340, 0.36, t, { wave: 1 });
  return { w, ov };
}

// ================================================================ 6b. TAHAPAN: diperiksa dan diproses admin (23.50 - 25.36)
function tahap(t) {
  let w = A.softBg('#1B5E84', '#0A3830', 'sp6b'), ov = '';
  const steps = [
    [23.5, 'Kirim PDF lewat Chat Admin', S.pdfIcon(0, 0, 0.55)],
    [23.85, 'Konfirmasi ke admin', `<g>${C(0, -4, 30, '#25D366')}${P('M-12 6L-8 -12L10 -12L14 4L0 14Z', 'none', 'stroke="#fff" stroke-width="5" stroke-linejoin="round"')}</g>`],
    [24.3, 'Admin menyiapkan penjelasan tiap slide', `<g>${S.magnifier(0, -6, 0.6, -10)}</g>`],
    [24.85, 'Tayang di Drilling > Materi', `<g>${R(-30, -32, 60, 64, '#fff', 8, 'stroke="#1D7B75" stroke-width="5"')}${R(-18, -20, 36, 8, '#C9D4D9', 4)}${R(-18, -4, 36, 8, '#C9D4D9', 4)}${R(-18, 12, 24, 8, '#C9D4D9', 4)}</g>`],
  ];
  steps.forEach(([t0, label, icon], i) => {
    const a = pa(t, t0 - 0.15, 0.15), y = 470 + i * 170, on = t >= t0 && (i === 3 || t < steps[i + 1][0]);
    ov += `<g opacity="${a.toFixed(2)}" transform="translate(540 ${y}) scale(${(0.9 + 0.1 * eob((t - t0 + 0.15) / 0.3)).toFixed(3)})">${R(-440, -64, 880, 128, 'rgba(0,0,0,.25)', 40, 'transform="translate(6 12)"')}${R(-440, -64, 880, 128, '#fff', 40, on ? 'stroke="#F8C038" stroke-width="8"' : '')}${C(-370, 0, 44, on ? '#F8C038' : '#E8F0F2')}${T(-370, 14, String(i + 1), '#172B38', 44)}<g transform="translate(-270 0)">${icon}</g>${T(-190, 14, label, '#172B38', label.length > 28 ? 29 : 34, '', 'start')}</g>`;
  });
  ov += chip(540, 290, 'Diperiksa dan diproses admin', { bg: COL.indigo, w: 960, fs: 40, a: pa(t, 23.5, 0.12), k: pk(t, 23.5) });
  w += TK(tk('fokus', 'catat'), 210, 1440, 0.6, { t, uid: 'tkP', peneliti: true });
  ov += koriSvg(860, 1400, 0.8, t, { wave: 1 });
  return { w, ov };
}

// ================================================================ 7. CONTOH PENJELASAN: Drilling > Materi asli di laptop (25.36 - 32.24)
const CSS = (rect, s, cx, cy) => (x, y) => [rect[0] + rect[2] / 2 + (x - cx) * s, rect[1] + rect[3] / 2 + (y - cy) * s];
function contoh(t) {
  let w = A.softBg('#0F5F57', '#0A3830', 'sp7'), ov = '';
  const z = sm((t - 26.9) / 0.5) * (1 - sm((t - 29.5) / 0.4));
  const rect = mix(LAP, [30, 430, 1020, 720], z), s = lerp(960 / 1280, 1.06, z) * (1 + 0.04 * clamp((t - 25.36) / 6.9, 0, 1)), cx = lerp(640, 700, z), cy = lerp(400, 270, z);
  const f = t < 29.62 ? lerpKeys(t, [[25.36, 8], [26.4, 112], [26.9, 196], [29.6, 196]]) : lerpKeys(t, [[29.62, 330], [32.24, 414]]);
  const u = eob((t - 25.36) / 0.4);
  panel('lp', { clip: 'baca', f, rect: [rect[0], rect[1] + (1 - u) * 50, rect[2], rect[3]], view: [s, cx, cy], a: pa(t, 25.36, 0.1), r: 18, noShadow: true });
  ov += laptopFrame(rect[0], rect[1] + (1 - u) * 50, rect[2], rect[3], z < 0.5 ? 1 : 1 - (z - 0.5) * 2);
  const pt = CSS(rect, s, cx, cy);
  // hubungan slide - gambar - penjelasan (sorotan sederhana di atas rekaman asli)
  if (t > 27.3 && t < 29.55) {
    const [bx, by] = pt(718, 262), [bx2, by2] = pt(1176, 322), [gx, gy] = pt(335, 250);
    const a1 = pa(t, 27.5, 0.2), a2 = pa(t, 28.3, 0.2), a3 = pa(t, 28.9, 0.2);
    ov += `<rect x="${f1(bx - 8)}" y="${f1(by - 8)}" width="${f1(bx2 - bx + 16)}" height="${f1(by2 - by + 16)}" rx="14" fill="rgba(248,192,56,.28)" stroke="#F8C038" stroke-width="6" opacity="${a1.toFixed(2)}"/>`;
    ov += `<circle cx="${f1(gx)}" cy="${f1(gy)}" r="${f1(46 * s)}" fill="none" stroke="#E8665F" stroke-width="7" stroke-dasharray="14 9" opacity="${a2.toFixed(2)}"/>`;
    ov += `<path d="M${f1(gx + 46 * s)} ${f1(gy)}C${f1(gx + 200)} ${f1(gy - 80)} ${f1(bx - 140)} ${f1(by - 40)} ${f1(bx - 10)} ${f1(by + 22)}" fill="none" stroke="#F8C038" stroke-width="7" stroke-linecap="round" stroke-dasharray="16 12" opacity="${a3.toFixed(2)}"/>`;
  }
  ov += chip(540, 290, 'Dibahas per slide', { bg: COL.green, w: 700, fs: 48, a: win(t, 25.4, 27.3, 0.1), k: pk(t, 25.4) });
  ov += chip(540, 290, 'Konsep + gambar di dalamnya', { bg: COL.indigo, w: 980, fs: 42, a: win(t, 27.3, 29.58, 0.1), k: pk(t, 27.3) });
  ov += chip(540, 290, 'Lebih mudah mengikuti isinya', { bg: COL.green, w: 980, fs: 40, a: win(t, 29.58, 32.24, 0.1), k: pk(t, 29.58) });
  ov += tag(LAP[0], 360, 'REKAMAN LAYAR ASLI', pa(t, 25.4, 0.1) * (1 - z));
  ov += koriSvg(975, 345, 0.36, t, { wave: 1 });
  return { w, ov };
}

// ================================================================ 8. PENUTUP (32.88 - 43.32)
function pendamping(t) { // 32.88 - 37.70: punya penjelasan untuk mendampingi slide kuliah
  let w = A.softBg('#0F5F57', '#0A3830', 'sp8'), ov = '';
  const u = eob((t - 32.88) / 0.4), R2 = [60, 340, 960, 600];
  panel('lp', { clip: 'baca', f: lerpKeys(t, [[32.88, 330], [37.7, 414]]), rect: [R2[0], R2[1] + (1 - u) * 40, R2[2], R2[3]], view: [(960 / 1280) * (1 + 0.05 * clamp((t - 32.88) / 4.8, 0, 1)), 640, 400], a: pa(t, 32.88, 0.1), r: 18, noShadow: true });
  ov += laptopFrame(R2[0], R2[1] + (1 - u) * 40, R2[2], R2[3]);
  const st = rk('mengerti', 'netral', { yaw: -0.2, tilt: 3 * Math.sin(t * 1.5), bob: Math.sin(t * 2.2) * 3 });
  w += RK(st, 330, 1450, 0.6, { t, uid: 'rkP8', outfit: 'santai' });
  ov += koriSvg(750, 1400, 0.85, t, { wave: 1 });
  ov += chip(540, 290, 'Slide + penjelasan', { bg: COL.green, w: 760, fs: 48, a: 1, k: pk(t, 32.88) });
  return { w, ov };
}
function penutup(t) { // 37.70 - 43.32
  let w = A.softBg('#0F5F57', '#0A3830', 'sp9'), ov = '';
  w += `<g opacity=".5">${Array.from({ length: 12 }, (_, i) => { const a = i * Math.PI / 6 + t * 0.12; return `<path d="M540 900L${f1(540 + Math.cos(a) * 1400)} ${f1(900 + Math.sin(a) * 1400)}L${f1(540 + Math.cos(a + 0.13) * 1400)} ${f1(900 + Math.sin(a + 0.13) * 1400)}Z" fill="rgba(255,255,255,.035)"/>`; }).join('')}</g>`;
  w += RK(rk('senang', 'senang', { bob: -Math.max(0, Math.sin(t * 4)) * 5 }), 300, 1440, 0.66, { t, uid: 'rkP9', outfit: 'santai' });
  ov += koriSvg(790, 1410, 0.9, t, { wave: 1 });
  ov += logoCard(540, 740, 0.7 + 0.3 * eob((t - 38.3) / 0.4), pa(t, 38.3, 0.1), 720);
  const g = t >= 39.0;
  if (g) { const k1 = 0.8 + 0.2 * eob((t - 39.0) / 0.4); ov += `<g opacity="${pa(t, 39.0, 0.12).toFixed(3)}" transform="translate(540 440) scale(${k1.toFixed(3)})">${T(0, 0, 'BELAJAR KEDOKTERAN', '#fff', 66, 'stroke="#062B25" stroke-width="18" paint-order="stroke" stroke-linejoin="round"')}${T(0, 120, 'GRATIS', '#F8C038', 136, 'stroke="#062B25" stroke-width="22" paint-order="stroke" stroke-linejoin="round"')}</g>`; }
  else ov += chip(540, 300, 'Penjelasan untuk mendampingi slide-mu', { bg: COL.green, w: 1000, fs: 36, a: win(t, 37.7, 39.0, 0.1), k: pk(t, 37.7) });
  if (t > 40.8) ov += `<g transform="translate(540 915) scale(${(0.8 + 0.2 * eob((t - 40.8) / 0.3)).toFixed(3)})" opacity="${pa(t, 40.8, 0.1).toFixed(2)}">${R(-300, -60, 600, 124, 'rgba(0,0,0,.3)', 62, 'transform="translate(0 8)"')}${R(-300, -62, 600, 124, '#F8C038', 62)}${T(0, 22, 'medcoel.com', '#0A3830', 68)}</g>`;
  if (t > 39) ov += S.sparkK(150, 560, 0.9, '#F8C038') + S.sparkK(930, 520, 0.8, '#fff') + S.sparkK(900, 830, 0.6, '#F8C038');
  return { w, ov };
}

export const SCENES_P2 = [
  { t0: 20.5, draw: ajukan },
  { t0: 23.5, draw: tahap },
  { t0: 25.36, draw: contoh },
  { t0: 32.88, draw: pendamping },
  { t0: 37.7, draw: penutup },
];
