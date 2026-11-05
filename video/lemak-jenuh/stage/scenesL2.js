// Adegan 6-10: struktur arteri dan LDL, pembentukan plak, bertahun-tahun, normal vs plak, plak pecah dan bekuan. (ilustrasi buatan; skala partikel tidak nyata)
import { rk, RK, TK, tk, M, f1, COL, A, R, C, E, P, L, T, chip } from './core.js';
import { clamp, lerp, sm, eo, eob, win } from './core.js';
import * as K from './artK.js';
import * as MD from './artM.js';
import * as W from './artW.js';
import { koriSvg, pa, pk, lerpKeys, mix } from './shared.js';

const darkBg = (id, c0 = '#12474A', c1 = '#0A2F33') => A.softBg(c0, c1, id);
const smoothKeys = (t, keys) => { let i = 0; while (i + 1 < keys.length && t >= keys[i + 1][0]) i++; if (i + 1 >= keys.length) return keys[keys.length - 1].slice(1); const a = keys[i], b = keys[i + 1], u = sm((t - a[0]) / (b[0] - a[0])); return a.slice(1).map((v, j) => lerp(v, b[j + 1], u)); };
const camG = (g, [x, y, s]) => `<g transform="translate(540 960) scale(${s.toFixed(4)}) translate(${f1(-x)} ${f1(-y)})">${g}</g>`;
const note = (txt, y = 1335, a = 1) => `<g opacity="${a.toFixed(2)}">${T(540, y, txt, '#C9D4D9', 26, 'opacity=".9"')}</g>`;
const pill = (x, y, txt, a, c = '#fff', fs = 27, anchor = 'start') => `<g opacity="${a.toFixed(2)}">${R(anchor === 'start' ? x - 10 : x - txt.length * fs * 0.52 - 14, y - fs * 0.8, txt.length * fs * 0.52 + 28, fs * 1.6, 'rgba(6,28,32,.9)', fs * 0.8)}${T(anchor === 'start' ? x + 4 : x - 4, y + fs * 0.34, txt, c, fs, '', anchor)}</g>`;

// ================================================================ 5. STRUKTUR ARTERI DAN LDL (30.44 - 34.24)
function struktur(t) {
  let w = darkBg('sl5'), ov = '';
  const u = eob((t - 30.5) / 0.5), cx = 540, cy = 730, Rr = 360;
  const zoom = smoothKeys(t, [[30.44, 540, 960, 1], [33.1, 540, 960, 1], [34.24, 540, 1010, 1.55]]);
  let g = MD.artery(cx, cy, Rr * (0.85 + 0.15 * u), { growth: 0, ldlN: 10, rbc: 6 });
  // label lapisan dinding (muncul bertahap)
  const labs = [[31.0, 'Lumen', cx + 30, cy - 40, 840, 400, 'start'], [31.4, 'Endotel', cx - 150, cy + 100, 60, 560, 'end'], [31.8, 'Intima', cx + 200, cy + 130, 860, 560, 'start'], [32.2, 'Media', cx - 215, cy - 20, 60, 680, 'end'], [32.6, 'Adventitia', cx + 270, cy + 150, 840, 760, 'start']];
  labs.forEach(([t0, txt, px, py, tx, ty, an]) => { ov += MD.label(px, py, tx, ty, txt, { anchor: an, fs: 32, a: pa(t, t0, 0.2), line: '#fff' }); });
  ov += MD.label(cx + 90, cy - 70, 1000, 1010, 'LDL membawa kolesterol', { anchor: 'end', fs: 30, a: pa(t, 31.5, 0.2), line: '#F8C038' }).replace('stroke="#fff"', 'stroke="#F8C038"');
  const c = `<g opacity="${pa(t, 32.0, 0.25).toFixed(2)}">${C(220, 1180, 160, '#FFF8E1')}${C(220, 1180, 160, 'none', 'stroke="#F8C038" stroke-width="8"')}<g transform="translate(220 1180)">${MD.ldl(0, 0, 112, {})}</g></g>`;
  ov += c;
  ov += `<g opacity="${pa(t, 32.3, 0.25).toFixed(2)}">${MD.label(300, 1100, 420, 1090, 'Kulit fosfolipid + apoB-100', { anchor: 'start', fs: 28, line: '#fff' })}${MD.label(230, 1190, 420, 1190, 'Inti: kolesterol ester', { anchor: 'start', fs: 28, line: '#fff' })}</g>`;
  ov += chip(540, 290, 'LDL membawa kolesterol di aliran darah', { bg: COL.coral, w: 1040, fs: 34, a: pa(t, 30.5, 0.15), k: pk(t, 30.5) });
  ov += note('Ilustrasi: ukuran partikel tidak sesuai skala', 1335);
  return camG(w + g, zoom) + ov;
}

// ================================================================ 6. PEMBENTUKAN PLAK (34.24 - 47.5)
const PK = [[34.24, 0], [35.6, 0.1], [36.8, 0.2], [39.2, 0.3], [40.06, 0.32], [41.9, 0.5], [42.92, 0.52], [44.6, 0.78], [47.0, 1.0]];
function plak(t) {
  let w = darkBg('sl6'), ov = '';
  const p = lerpKeys(t, PK), X0 = 40, Y0 = 480, WW = 770, HH = 660;
  w += MD.wallSection(X0, Y0, WW, HH, p, t);
  const lx = 836, ly = (f) => Y0 + HH * f;
  const labs = [[34.4, 36.4, 'Lumen (darah)', 0.08, 380, 0.1], [34.6, 37.0, 'LDL', 0.17, 500, 0.15], [36.0, 40.2, 'Endotel', 0.27, 450, 0.27], [37.6, 41.0, 'LDL di dinding', 0.45, 220, 0.45], [38.8, 41.5, 'Dinding arteri', 0.62, 700, 0.6], [40.6, 43.0, 'LDL teroksidasi', 0.4, 560, 0.4], [42.9, 46.6, 'Sel imun', 0.36, 290, 0.3], [44.8, 47.5, 'Sel busa', 0.58, 380, 0.55], [46.2, 47.5, 'Plak', 0.3, 520, 0.28]];
  labs.forEach(([t0, t1, txt, fy, px, py]) => { const a = win(t, t0, t1, 0.2); if (a > 0.01) ov += `<g opacity="${a.toFixed(2)}"><line x1="${f1(X0 + px)}" y1="${f1(ly(py))}" x2="${lx - 12}" y2="${f1(ly(fy))}" stroke="#fff" stroke-width="3" opacity=".7"/><circle cx="${f1(X0 + px)}" cy="${f1(ly(py))}" r="6" fill="#fff"/>${pill(lx, ly(fy), txt, 1, '#fff', 26)}</g>`; });
  const chips = [[34.24, 36.3, 'Kadar tinggi dalam waktu lama', COL.coral], [36.3, 40.06, 'Kolesterol masuk & terkumpul di dinding', COL.indigo], [40.06, 42.92, 'Tubuh memicu peradangan', COL.coral], [42.92, 47.5, 'Sel imun datang, plak terbentuk', COL.green]];
  chips.forEach(([a, b, txt, bg]) => { ov += chip(540, 290, txt, { bg, w: 1040, fs: 34, a: win(t, a, b, 0.12), k: pk(t, a) }); });
  // bilah waktu: proses bertahap, memakan waktu lama
  const bx = 70, by = 1230, bw = 940;
  ov += `<g opacity="${pa(t, 34.5, 0.3).toFixed(2)}">${R(bx, by, bw, 26, 'rgba(255,255,255,.16)', 13)}${R(bx, by, bw * p, 26, '#F8C038', 13)}${T(bx, by + 70, 'Berlangsung bertahap', '#fff', 30, '', 'start')}${p > 0.4 ? T(bx + bw, by + 70, 'dalam waktu yang lama (bertahun-tahun)', '#F8C038', 28, '', 'end') : ''}</g>`;
  ov += note('Ilustrasi: ukuran dan jumlah sel tidak sesuai skala', 1335);
  ov += koriSvg(975, 345, 0.34, t, { wave: 1 });
  return w + ov;
}

// ================================================================ 7. BERTAHUN-TAHUN TANPA KAMU SADARI (47.5 - 52.64)
function tahun(t) {
  let w = darkBg('sl7'), ov = '';
  const g = lerp(0.2, 0.62, sm((t - 47.5) / 4.6));
  w += MD.artery(540, 640, 280, { growth: g, rbc: 6, angle: Math.PI * 0.5 });
  w += `<g opacity="${pa(t, 47.8, 0.2).toFixed(2)}">${MD.label(540, 860, 1000, 990, 'Plak tumbuh perlahan', { anchor: 'end', fs: 32, line: '#F8C038' })}</g>`;
  // garis waktu bertahun-tahun (kalender)
  for (let i = 0; i < 4; i++) { const a = pa(t, 47.9 + i * 0.7, 0.2); w += `<g opacity="${a.toFixed(2)}" transform="translate(${170 + i * 247} 1130)">${K.calendarFlip(0, 0, 0.5, 'Tahun', 0, '')}</g>`; }
  w += `<g opacity="${pa(t, 50.4, 0.2).toFixed(2)}" transform="translate(540 1130)">${T(0, 0, '…', '#F8C038', 80)}</g>`;
  w += RK(rk(t < 50.7 ? 'senang' : 'netral', 'netral', { yaw: 0.1 }), 900, 1440, 0.5, { t, uid: 'rkL7', outfit: 'harian' });
  ov += chip(540, 290, 'Berlangsung bertahun-tahun', { bg: COL.indigo, w: 960, fs: 40, a: win(t, 47.6, 50.7, 0.12), k: pk(t, 47.6) });
  ov += chip(540, 290, '…tanpa kamu sadari', { bg: COL.coral, w: 880, fs: 44, a: pa(t, 50.7, 0.12), k: pk(t, 50.7) });
  return w + ov;
}

// ================================================================ 8. NORMAL VS PLAK, ALIRAN DARAH TERGANGGU (52.64 - 59.0)
function banding(t) {
  let w = darkBg('sl8'), ov = '';
  const gr = lerp(0.2, 0.85, sm((t - 52.64) / 3.4));
  w += MD.artery(270, 600, 230, { growth: 0, rbc: 6 }) + MD.artery(810, 600, 230, { growth: gr, angle: Math.PI * 0.5, rbc: 4 });
  ov += pill(270 - 120, 880, 'Arteri normal', 1, '#fff', 32);
  ov += pill(810 - 170, 880, 'Arteri dengan plak', pa(t, 53.2, 0.2), '#F8C038', 32);
  // penyempitan lumen: tanda diameter
  const r0 = 230 * 0.55; ov += `<g opacity="${pa(t, 53.6, 0.2).toFixed(2)}"><path d="M${270 - r0} 600H${270 + r0}" stroke="#fff" stroke-width="4" stroke-dasharray="10 8"/>${T(270, 640, 'lumen lebar', '#fff', 26)}<path d="M${810 - 90} ${600 - r0 * 0.95}V${600 + r0 * 0.95 - 230 * 0.4 * gr}" stroke="#F8C038" stroke-width="4" stroke-dasharray="10 8"/><text x="${810 - 78}" y="${600 - r0 * 0.5}" fill="#F8C038" font-size="26" font-family="Plus Jakarta Sans" font-weight="800">lumen menyempit</text></g>`;
  const nar = lerp(0.1, 0.9, sm((t - 52.64) / 3.4));
  w += MD.longVessel(40, 960, 470, 200, { narrow: 0, t, rbc: 8 }) + MD.longVessel(570, 960, 470, 200, { narrow: nar, t, rbc: 8 });
  ov += pill(60, 1220, 'Aliran lancar', 1, '#fff', 30) + pill(590, 1220, 'Aliran terganggu', pa(t, 56.7, 0.2), '#F8C038', 30);
  ov += chip(540, 290, 'Plak membuat pembuluh semakin sempit', { bg: COL.coral, w: 1040, fs: 34, a: win(t, 52.7, 56.7, 0.12), k: pk(t, 52.7) });
  ov += chip(540, 290, 'Aliran darah bisa terganggu', { bg: COL.indigo, w: 940, fs: 40, a: win(t, 56.7, 59.0, 0.12), k: pk(t, 56.7) });
  ov += note('Ilustrasi: penampang, tidak sesuai skala', 1335);
  return w + ov;
}

// ================================================================ 9. PLAK PECAH, BEKUAN TERBENTUK (59.0 - 63.4)
function pecah(t) {
  let w = darkBg('sl9'), ov = '';
  const rup = sm((t - 60.08) / 0.7), thr = sm((t - 61.3) / 1.9) * 0.95, cx = 540, cy = 760, Rr = 340;
  const cam = smoothKeys(t, [[59.0, 540, 930, 1.45], [60.0, 540, 880, 1.45], [62.0, 540, 800, 1.1], [63.4, 540, 780, 1.0]]);
  const g = MD.artery(cx, cy, Rr, { growth: 0.85, angle: Math.PI * 0.5, rupture: rup, thrombus: thr, rbc: 5 });
  w += camG(g, cam);
  const s = cam[2], px = (x) => 540 + (x - cam[0]) * s, py = (y) => 960 + (y - cam[1]) * s;
  ov += `<g opacity="${win(t, 59.2, 60.2, 0.15).toFixed(2)}">${MD.label(px(540), py(900), 90, 1190, 'Plak (inti lemak + tudung fibrosa)', { anchor: 'start', fs: 28, line: '#F8C038' })}</g>`;
  ov += `<g opacity="${pa(t, 60.3, 0.2).toFixed(2)}">${MD.label(px(540), py(835), 940, 1010, 'Tudung plak pecah', { anchor: 'end', fs: 30, line: '#fff' })}</g>`;
  ov += `<g opacity="${pa(t, 61.4, 0.2).toFixed(2)}">${MD.label(px(540), py(745), 60, 520, 'Bekuan darah (trombus):', { anchor: 'start', fs: 28, line: '#D9C2EC' })}${pill(70, 580, 'trombosit + fibrin + sel darah', pa(t, 61.6, 0.2), '#D9C2EC', 26)}</g>`;
  ov += chip(540, 290, 'Plak pecah, bekuan terbentuk di atasnya', { bg: COL.coral, w: 1040, fs: 34, a: pa(t, 59.0, 0.15), k: pk(t, 59.0) });
  ov += note('Ilustrasi: ukuran tidak sesuai skala', 1335);
  return w + ov;
}

export const SCENES_L2 = [
  { t0: 30.44, tr: { type: 'wipe', d: 0.4 }, draw: struktur },
  { t0: 34.24, tr: { type: 'iris', d: 0.5, cx: 540, cy: 1000 }, draw: plak },
  { t0: 47.5, tr: { type: 'wipe', d: 0.4 }, draw: tahun },
  { t0: 52.64, tr: { type: 'wipe', d: 0.4 }, draw: banding },
  { t0: 59.0, tr: { type: 'iris', d: 0.45, cx: 540, cy: 900 }, draw: pecah },
];
