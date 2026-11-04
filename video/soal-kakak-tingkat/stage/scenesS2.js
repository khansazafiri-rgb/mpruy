// Adegan 9-16: ajukan lewat Chat Admin (rekaman asli), diperiksa dan diproses, bahan latihan + pembahasan (rekaman asli), manfaat antarangkatan, soal khusus kampus (rekaman asli), penutup.
import { PALETTE_ADIK } from '../../../brand/characters/raka/raka.js';
import { rk, RK, TK, tk, M, topChip, f1, COL, A, R, C, E, P, L, T, chip } from './core.js';
import { clamp, lerp, sm, eo, eob, win } from './core.js';
import * as S from './artS.js';
import * as K from './artK.js';
import { panel, fr } from './panels.js';
import { koriSvg, logoCard, tag, pa, pk } from './scenesS1.js';

const lerpKeys = (t, keys) => { if (t <= keys[0][0]) return keys[0][1]; for (let i = 1; i < keys.length; i++) if (t <= keys[i][0]) { const [t0, f0] = keys[i - 1], [t1, f1_] = keys[i]; return lerp(f0, f1_, (t - t0) / (t1 - t0)); } return keys[keys.length - 1][1]; };
const PHONE = [337, 450, 406, 880], ZOOM = [40, 400, 1000, 860];
const mix = (a, b, u) => a.map((v, i) => lerp(v, b[i], u));
const DY = 1272;

// Panel HP asli yang membesar menjadi kartu lebar (zoom halus). z: 0 = HP penuh, 1 = kartu lebar.
function phonePanel(id, clip, f, z, cy, t, a = 1) {
  const rect = mix(PHONE, ZOOM, z), s = lerp(PHONE[2] / 430, ZOOM[2] / 430, z), vcy = lerp(466, cy, z);
  panel(id, { clip, f, rect, view: [s, 215, vcy], a, r: lerp(40, 34, z), noShadow: z < 0.5 });
  return S.bezelRound(rect[0], rect[1], rect[2], rect[3], lerp(40, 34, z), lerp(16, 8, z)) + `<g opacity="${(1 - z).toFixed(2)}">${S.notch(rect[0] + rect[2] / 2, rect[1])}</g>`;
}

// ================================================================ 9. AJUKAN LEWAT CHAT ADMIN, rekaman asli (25.54 - 29.50)
function ajukan(t) {
  let w = A.softBg('#0F5F57', '#0A3830', 'sg9'), ov = '';
  const f = lerpKeys(t, [[25.54, 38], [27.0, 150], [28.2, 250], [28.45, 300], [29.5, 405]]);
  const z = sm((t - 25.95) / 0.6);
  ov += phonePanel('p9', 'alur', f, z, 440, t, pa(t, 25.54, 0.1));
  ov += chip(540, 300, 'AJUKAN PDF LEWAT CHAT ADMIN', { bg: COL.green, w: 980, fs: 38, a: 1, k: pk(t, 25.54) });
  ov += tag(ZOOM[0] + 4, ZOOM[1] - 56, 'REKAMAN LAYAR ASLI', pa(t, 25.54, 0.1));
  ov += koriSvg(970, 345, 0.38, t, { wave: 1 });
  return { w, ov };
}

// ================================================================ 10. DIPERIKSA DAN DIPROSES (29.50 - 31.90)
function periksa(t) {
  let w = A.softBg('#1B5E84', '#0A3830', 'sg10'), ov = '';
  const boxes = [
    [190, 'Kirim PDF', 29.5, S.pdfIcon(0, -50, 1.0)],
    [540, 'Diperiksa & diproses', 30.15, `<g transform="translate(0 -52)">${S.pdfIcon(-10, 0, 0.8)}${S.magnifier(44, 20, 0.9, -10)}</g>`],
    [890, 'Bahan latihan', 31.3, `<g transform="translate(0 -52)">${R(-48, -50, 96, 108, '#fff', 12, 'stroke="#1D7B75" stroke-width="6"')}${S.checkK(-22, -24, 0.55)}${R(-4, -30, 40, 8, '#C9D4D9', 4)}${S.checkK(-22, 4, 0.55)}${R(-4, -2, 40, 8, '#C9D4D9', 4)}${S.checkK(-22, 32, 0.55)}${R(-4, 26, 40, 8, '#C9D4D9', 4)}</g>`],
  ];
  boxes.forEach(([x, title, t0, icon], i) => {
    const a = pa(t, t0 - 0.2, 0.15), on = t >= t0 && (i === 2 ? true : t < t0 + 1.2 || i === 0 ? true : false);
    ov += S.stepBox(x, 680, 300, 340, title, '', { k: 0.8 + 0.2 * eob((t - t0 + 0.2) / 0.35), a, on: t >= t0 && t < (boxes[i + 1] ? boxes[i + 1][2] : 99), icon, fs: title.length > 14 ? 28 : 36 });
    if (i < 2) ov += `<g opacity="${pa(t, boxes[i + 1][2] - 0.3, 0.2)}">${S.arrowR(x + 170, 680, 60, '#F8C038')}</g>`;
  });
  ov += chip(190, 900, 'lalu konfirmasi ke admin', { bg: COL.indigo, w: 380, fs: 24, a: pa(t, 29.8, 0.2), k: 1 });
  ov += chip(540, 300, 'DIPERIKSA & DIPROSES TIM', { bg: COL.indigo, w: 900, fs: 42, a: pa(t, 29.5, 0.15), k: pk(t, 29.5) });
  // admin (Tala varian peneliti) memeriksa; Kori mendukung
  w += TK(tk('fokus', 'catat'), 300, 1440, 0.7, { t, uid: 'tk10', peneliti: true });
  w += `<g transform="translate(0 ${f1(Math.sin(t * 3) * 6)})">${S.magnifier(470, 1130, 1.1, -15)}</g>`;
  w += S.pdfIcon(560, 1210, 0.8, { rot: -6 });
  if (t > 30.9) { const u = eob((t - 30.9) / 0.35); w += `<g transform="translate(560 1160) rotate(-12) scale(${u.toFixed(3)})" opacity="${pa(t, 30.9, 0.1)}">${R(-120, -34, 240, 68, 'none', 14, 'stroke="#3DB46E" stroke-width="8"')}${T(0, 14, 'DIPERIKSA', '#3DB46E', 38)}</g>`; }
  ov += koriSvg(850, 1420, 0.8, t, { wave: 1 });
  return { w, ov };
}

// ================================================================ 11. BAHAN LATIHAN + PEMBAHASAN, rekaman asli (31.90 - 35.18)
const LAP = [24, 470, 1032, 600];
function bahan(t) {
  let w = A.softBg('#0F5F57', '#0A3830', 'sg11'), ov = '';
  const u = eob((t - 31.9) / 0.4);
  const rect = [LAP[0], LAP[1] + (1 - u) * 50, LAP[2], LAP[3]];
  panel('lp', { clip: 'soal', f: lerpKeys(t, [[31.9, 96], [33.5, 135], [34.2, 150], [35.18, 176]]), rect, view: [1.2, 400, 340], a: pa(t, 31.9, 0.1), k: 0.94 + 0.06 * u, r: 20, noShadow: true });
  ov += S.bezelRound(rect[0], rect[1], rect[2], rect[3], 20, 22) + `<path d="M0 ${f1(rect[1] + rect[3] + 20)}H1080L1020 ${f1(rect[1] + rect[3] + 62)}H60Z" fill="#C9D4D9"/>`;
  ov += chip(540, 300, 'BAHAN LATIHAN', { bg: COL.green, w: 700, fs: 52, a: 1, k: pk(t, 31.9) });
  ov += chip(540, 1190, 'lengkap dengan pembahasan', { bg: COL.indigo, w: 760, fs: 38, a: pa(t, 33.6, 0.2), k: pk(t, 33.6) });
  ov += tag(rect[0] + 4, rect[1] - 62, 'REKAMAN LAYAR ASLI', 1);
  ov += koriSvg(975, 345, 0.38, t, { wave: 1 });
  return { w, ov };
}

// ================================================================ 12. BERBAGI UNTUK TEMAN SEANGKATAN (35.18 - 39.90)
function berbagi(t) {
  let w = S.libraryBg(t), ov = '';
  const u = eob((t - 35.2) / 0.4), SR = [170, 400, 740, 416];
  panel('sc', { clip: 'soal', f: 100 + ((t - 35.2) * 30 * 0.5) % 70, rect: [SR[0], SR[1] + (1 - u) * 40, SR[2], SR[3]], view: [0.9, 520, 330], a: pa(t, 35.2, 0.1), k: 0.94 + 0.06 * u, r: 18, noShadow: true });
  ov += S.bezelRound(SR[0], SR[1] + (1 - u) * 40, SR[2], SR[3], 18, 18);
  const ex = t < 38.1 ? 'mengerti' : 'senang';
  w += RK(rk(ex, 'netral', { ...{ armL: { wx: 150, wy: 540, ex: 92, ey: 500, finger: 0, front: 1 }, armR: { wx: 250, wy: 540, ex: 308, ey: 500, finger: 0, front: 1 } }, gazeY: -0.3, yaw: 0.3 }), 250, 1455, 0.74, { t, uid: 'rkS12', outfit: 'santai' });
  w += TK(tk(ex === 'senang' ? 'senang' : 'fokus', 'catat', { yaw: -0.2, gazeY: -0.3 }), 830, 1455, 0.74, { t, uid: 'tk12' });
  w += S.deskTop(DY + 60) + S.deskFront(DY + 60) + S.lapLid(250, DY - 30, 220, 140) + S.lapLid(830, DY - 30, 220, 140);
  for (let i = 0; i < 5; i++) { const a = i * 1.3 + t * 1.2; w += S.sparkK(540 + Math.cos(a) * 420, 700 + Math.sin(a) * 120, 0.4 + 0.15 * (i % 3), i % 2 ? '#F8C038' : '#fff'); }
  ov += chip(540, 300, 'BERBAGI HARI INI', { bg: COL.green, w: 800, fs: 50, a: win(t, 35.2, 38.2, 0.12), k: pk(t, 35.2) });
  ov += chip(540, 300, 'TEMAN SEANGKATAN IKUT BELAJAR', { bg: COL.indigo, w: 980, fs: 38, a: win(t, 38.2, 39.9, 0.12), k: pk(t, 38.2) });
  ov += tag(SR[0] + 4, SR[1] - 56, 'REKAMAN LAYAR ASLI', 1);
  const zb = 1 + 0.05 * clamp((t - 35.2) / 4.7, 0, 1);
  return { w: `<g transform="translate(540 1100) scale(${zb.toFixed(4)}) translate(-540 -1100)">${w}</g>`, ov };
}

// ================================================================ 13. TAHUN DEPAN: adik tingkat menemukan bahan latihan (39.90 - 42.12)
function tahun(t) {
  let w = S.libraryBg(t), ov = '';
  const u = eob((t - 40.9) / 0.4), SR = [190, 400, 700, 394];
  panel('ad', { clip: 'soal', f: 100 + ((t - 40.2) * 30 * 0.5) % 70, rect: [SR[0], SR[1] + (1 - u) * 40, SR[2], SR[3]], view: [0.9, 520, 330], a: pa(t, 40.2, 0.1), k: 0.94 + 0.06 * u, r: 18, noShadow: true });
  ov += `<g opacity="${pa(t, 40.2, 0.1)}">${S.bezelRound(SR[0], SR[1] + (1 - u) * 40, SR[2], SR[3], 18, 18)}</g>`;
  const mg = t < 41.0 ? 'mengerti' : 'mengerti';
  w += RK(rk(mg, 'netral', { armL: { wx: 150, wy: 540, ex: 92, ey: 500, finger: 0, front: 1 }, armR: { wx: 250, wy: 540, ex: 308, ey: 500, finger: 0, front: 1 }, gazeY: -0.3 }), 540, 1455, 0.8, { t, uid: 'ad13', outfit: 'kuliah', palette: PALETTE_ADIK });
  w += S.deskTop(DY + 60) + S.deskFront(DY + 60) + S.lapLid(540, DY - 40, 260, 160);
  w += S.sparkK(190, 880, 0.8 * sm((t - 41)) / 1) + S.sparkK(880, 840, 0.7 * sm((t - 41.1)), '#fff');
  // kalender membalik pelan: 2026 -> 2027
  const ca = win(t, 39.9, 41.2, 0.2);
  if (ca > 0.01) { const fl = clamp((t - 40.2) / 0.5, 0, 1); ov += `<g opacity="${ca.toFixed(2)}"><rect width="1080" height="1920" fill="rgba(10,56,48,.55)"/>${K.calendarFlip(540, 860, 2.0, t < 40.45 ? '2026' : '2027', fl > 0 && fl < 1 ? fl : 0, '')}</g>`; }
  ov += chip(540, 300, 'BERMANFAAT UNTUK ANGKATAN BERIKUTNYA', { bg: COL.green, w: 1000, fs: 34, a: pa(t, 41.0, 0.15), k: pk(t, 41.0) });
  ov += chip(540, 1190, 'tahun depan', { bg: COL.indigo, w: 420, fs: 38, a: pa(t, 40.6, 0.15), k: 1 });
  ov += tag(SR[0] + 4, SR[1] - 56, 'REKAMAN LAYAR ASLI', pa(t, 40.4, 0.1));
  return { w, ov };
}

// ================================================================ 14. SOAL KHUSUS KAMPUS: pesan ke admin, rekaman asli (42.12 - 45.94)
function khusus(t) {
  let w = A.softBg('#0F5F57', '#0A3830', 'sg14'), ov = '';
  const f = lerpKeys(t, [[42.12, 0], [42.9, 42], [44.7, 98], [45.2, 136], [45.94, 172]]);
  const z = sm((t - 42.95) / 0.6);
  ov += phonePanel('p14', 'tanya', f, z, 470, t, pa(t, 42.12, 0.1));
  ov += chip(540, 300, 'SOAL KHUSUS KAMPUS?', { bg: COL.coral, w: 880, fs: 44, a: win(t, 42.12, 44.4, 0.12), k: pk(t, 42.12) });
  ov += chip(540, 300, 'DISKUSIKAN DENGAN ADMIN', { bg: COL.indigo, w: 940, fs: 42, a: win(t, 44.4, 45.94, 0.12), k: pk(t, 44.4) });
  ov += tag(ZOOM[0] + 4, ZOOM[1] - 56, 'REKAMAN LAYAR ASLI', pa(t, 25.54, 0.1));
  ov += koriSvg(970, 345, 0.38, t, { wave: 1 });
  return { w, ov };
}

// ================================================================ 15. SATU ANGKATAN BERBAGI, ANGKATAN BERIKUTNYA BELAJAR (45.94 - 49.74)
function satu(t) {
  let w = A.softBg('#1B5E84', '#0A3830', 'sg15'), ov = '';
  w += RK(rk('senang', 'sapa', { yaw: 0.3 }), 130, 1430, 0.72, { t, uid: 'rkS15', outfit: 'santai' });
  w += TK(tk('senang', 'ajak', { yaw: 0.2 }), 410, 1430, 0.72, { t, uid: 'tk15' });
  const u = sm((t - 47.2) / 0.5);
  w += RK(rk(t < 47.3 ? 'netral' : 'mengerti', 'netral', { yaw: -0.3 }), 900, 1430, 0.72, { t, uid: 'ad15', outfit: 'kuliah', palette: PALETTE_ADIK });
  // PDF terbang melengkung dari angkatan ini ke angkatan berikutnya
  for (let i = 0; i < 4; i++) { const tt = (t - 46.3 - i * 0.45) / 1.4; if (tt < 0 || tt > 1) continue; const x = lerp(330, 800, tt), y = 900 - 360 * Math.sin(Math.PI * tt); ov += S.pdfIcon(x, y, 0.8, { rot: -12 + 24 * tt, a: Math.sin(Math.PI * tt) }); }
  w += `<g opacity="${pa(t, 45.94, 0.15)}">${A.T(270, 1010, '2026', '#fff', 40, 'stroke="#0A3830" stroke-width="10" paint-order="stroke"')}${A.T(900, 1010, '2027', '#fff', 40, 'stroke="#0A3830" stroke-width="10" paint-order="stroke"')}</g>`;
  w += `<g opacity="${(0.9 * pa(t, 46.5, 0.2)).toFixed(2)}">${S.arrowR(500, 1000, 230, '#F8C038')}</g>`;
  if (u > 0) w += K.bulb(900, 640, 0.8 * u, u, t);
  ov += chip(540, 300, 'SATU ANGKATAN BERBAGI', { bg: COL.green, w: 960, fs: 44, a: win(t, 46.0, 47.3, 0.1), k: pk(t, 46.0) });
  ov += chip(540, 300, 'ANGKATAN BERIKUTNYA BELAJAR', { bg: COL.indigo, w: 1020, fs: 40, a: win(t, 47.3, 49.74, 0.12), k: pk(t, 47.3) });
  ov += koriSvg(640, 1400, 0.7, t, { wave: 1 });
  return { w, ov };
}

// ================================================================ 16. PENUTUP (49.74 - 55.56)
function penutup(t) {
  let w = A.softBg('#0F5F57', '#0A3830', 'sg16'), ov = '';
  w += `<g opacity=".5">${Array.from({ length: 12 }, (_, i) => { const a = i * Math.PI / 6 + t * 0.15; return `<path d="M540 900L${f1(540 + Math.cos(a) * 1400)} ${f1(900 + Math.sin(a) * 1400)}L${f1(540 + Math.cos(a + 0.13) * 1400)} ${f1(900 + Math.sin(a + 0.13) * 1400)}Z" fill="rgba(255,255,255,.035)"/>`; }).join('')}</g>`;
  const gr = t >= 53.3;
  w += RK(rk('senang', 'senang', { bob: -Math.max(0, Math.sin(t * 5)) * 6 }), 210, 1440, 0.62, { t, uid: 'rkS16', outfit: 'santai' });
  w += RK(rk('mengerti', 'senang', { yaw: 0, bob: -Math.max(0, Math.sin(t * 5 + 1.4)) * 6 }), 540, 1440, 0.62, { t, uid: 'ad16', outfit: 'kuliah', palette: PALETTE_ADIK });
  ov += koriSvg(850, 1420, 0.9, t, { wave: 1 });
  ov += logoCard(540, 740, 0.7 + 0.3 * eob((t - 50.0) / 0.4), pa(t, 50.0, 0.1), 720);
  ov += chip(540, 300, 'BANTU BANGUN TEMPAT BELAJAR', { bg: COL.green, w: 960, fs: 40, a: win(t, 49.8, 53.3, 0.12), k: pk(t, 49.8) });
  if (gr) { const k1 = 0.8 + 0.2 * eob((t - 53.3) / 0.4); ov += `<g opacity="${pa(t, 53.3, 0.12).toFixed(3)}" transform="translate(540 440) scale(${k1.toFixed(3)})">${T(0, 0, 'BELAJAR KEDOKTERAN', '#fff', 66, 'stroke="#062B25" stroke-width="18" paint-order="stroke" stroke-linejoin="round"')}${T(0, 120, 'GRATIS', '#F8C038', 136, 'stroke="#062B25" stroke-width="22" paint-order="stroke" stroke-linejoin="round"')}</g>`; }
  if (t > 54.3) ov += `<g transform="translate(540 910) scale(${(0.8 + 0.2 * eob((t - 54.3) / 0.3)).toFixed(3)})" opacity="${pa(t, 54.3, 0.1).toFixed(2)}">${R(-250, -52, 500, 120, 'rgba(0,0,0,.3)', 60, 'transform="translate(0 8)"')}${R(-250, -60, 500, 120, '#F8C038', 60)}${T(0, 20, 'medcoel.com', '#0A3830', 62)}</g>`;
  if (t > 51) ov += S.sparkK(150, 560, 0.9, '#F8C038') + S.sparkK(930, 520, 0.8, '#fff') + S.sparkK(900, 820, 0.6, '#F8C038');
  return { w, ov };
}

export const SCENES_S2 = [
  { t0: 25.54, draw: ajukan },
  { t0: 29.5, draw: periksa },
  { t0: 31.9, draw: bahan },
  { t0: 35.18, draw: berbagi },
  { t0: 39.9, draw: tahun },
  { t0: 42.12, draw: khusus },
  { t0: 45.94, draw: satu },
  { t0: 49.74, tr: { type: 'wipe', d: 0.4 }, draw: penutup },
];
