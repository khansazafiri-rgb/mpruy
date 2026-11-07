// ADEGAN 3 (33,7 - 64,6 dtk): hemodialisis. Darah mengalir ke dialiser; di dalam ada serat halus (potongan melintang); darah DI DALAM serat, cairan dialisis DI LUAR, BERLAWANAN arah, dipisahkan membran;
// urea melintasi membran menuju cairan dialisis; kelebihan cairan keluar terkontrol; sel darah tetap di jalur darah; darah yang sudah disaring kembali ke tubuh. Skema (bukan skala).
import { f1, clamp, lerp, sm, eo, ei, eio, seg, win, MC, FONT, pchip, pathPt, rnd, step } from './core.js';
import * as A from './art.js';
import { worldCircuit, camTf, toScr, PATH, NA, NV } from './scene1.js';
import { DZC, DZS, PUMP, DRIP, PORT } from './circuit.js';

// ---- kamera dunia sirkuit untuk 33,7-44,4 dan 60,2-64,8
const pa = (k, u) => { const p = pathPt(PATH[k], u); return [p.x, p.y]; };
const ln = Math.log;
const K = [
  [33.0, 170, 830, ln(1.2)], [34.8, 150, 1010, ln(1.5)], [36.5, 120, 1180, ln(1.75)], [37.7, 250, 620, ln(1.35)], [38.9, ...pa('A3', 0.45), ln(1.8)], [40.0, DZC[0] + 10, DZC[1] + 230, ln(2.1)], [41.5, DZC[0], DZC[1] + 20, ln(2.3)], [43.4, DZC[0], DZC[1] - 20, ln(4.2)], [44.6, DZC[0], DZC[1] - 20, ln(5.2)],
  [59.8, DZC[0], DZC[1], ln(2.2)], [61.3, DZC[0] + 10, 70, ln(1.9)], [62.2, ...pa('A4', 0.7), ln(1.7)], [63.0, ...pa('A5', 0.5), ln(1.5)], [64.0, ...pa('A5', 0.9), ln(1.8)], [65.2, NA[0] + 40, NA[1] - 120, ln(2.3)],
];
const fx = pchip(K.map((k) => [k[0], k[1]])), fy = pchip(K.map((k) => [k[0], k[2]])), fs = pchip(K.map((k) => [k[0], k[3]]));
export const camS3 = (t) => ({ cx: fx(t), cy: fy(t), s: Math.exp(fs(t)) });
export const cutAt = (t) => (t < 41.4 ? 0.0 : seg(t, 41.6, 42.4, eio));

// ---- tampak potongan melintang: bundel serat (lingkaran), darah di dalam serat, cairan dialisis di luar
export function endView(t) {
  const a = seg(t, 44.2, 44.9) * (1 - seg(t, 46.0, 46.7)); if (a <= 0.01) return '';
  const C = [540, 930], R = 400, sp = 112, r = 52, rl = 34;
  const zk = 1 + 0.16 * seg(t, 44.2, 46.6, eio);
  let g = `<g opacity="${f1(a)}"><rect width="1080" height="1920" fill="#0B2F38" opacity=".92"/><g transform="translate(540 930) scale(${zk.toFixed(3)}) translate(-540 -930)"><g filter="url(#fSh)"><circle cx="${C[0]}" cy="${C[1]}" r="${R + 22}" fill="#DCE8EA" stroke="${MC.ink}" stroke-width="6"/></g><circle cx="${C[0]}" cy="${C[1]}" r="${R}" fill="${A.COL.dial}"/><circle cx="${C[0]}" cy="${C[1]}" r="${R}" fill="url(#gGlass)" opacity=".5"/>`;
  const pos = [[0, 0]]; for (let ring = 1; ring <= 2; ring++) for (let k = 0; k < 6 * ring; k++) { const a0 = (k / (6 * ring)) * Math.PI * 2, rr = ring * sp * (ring === 2 && k % 2 ? 0.88 : 1) ; pos.push([Math.cos(a0) * ring * sp, Math.sin(a0) * ring * sp]); }
  // dialisat (cyan) bergerak: titik kecil menembus bidang (menuju pembaca) sebagai penanda aliran berlawanan: tanda panah masuk/keluar
  pos.forEach(([x, y], i) => {
    const cx = C[0] + x, cy = C[1] + y, pulse = 0.5 + 0.5 * Math.sin(t * 5 - i);
    g += `<circle cx="${f1(cx)}" cy="${f1(cy)}" r="${r}" fill="${A.COL.memDk}"/><circle cx="${f1(cx)}" cy="${f1(cy)}" r="${r - 6}" fill="${A.COL.mem}"/><circle cx="${f1(cx)}" cy="${f1(cy)}" r="${rl}" fill="url(#gBlood)"/><circle cx="${f1(cx - 9)}" cy="${f1(cy - 10)}" r="9" fill="#fff" opacity=".35"/>`;
    g += A.cellP(cx + Math.sin(t * 2 + i) * 6, cy + Math.cos(t * 1.7 + i * 2) * 6, 11, i * 40, 1);
    g += `<circle cx="${f1(cx)}" cy="${f1(cy)}" r="${f1(rl * (0.45 + 0.5 * pulse))}" fill="none" stroke="#FFB3BC" stroke-width="2.5" opacity="${f1(0.5 * (1 - pulse))}"/>`;
  });
  // titik dialisat di celah (arah berlawanan = "keluar" dari layar vs "masuk" untuk darah)
  for (let i = 0; i < 34; i++) { const ang = i * 2.399, rr = 80 + (i * 37 % 300), x = C[0] + Math.cos(ang) * rr, y = C[1] + Math.sin(ang) * rr, p = (t * 0.8 + i * 0.13) % 1; if (Math.hypot(Math.cos(ang) * rr % sp, 0) >= 0) g += `<circle cx="${f1(x)}" cy="${f1(y)}" r="${f1(3 + 3 * Math.sin(p * Math.PI))}" fill="#E5FCFF" opacity="${f1(0.55 * Math.sin(p * Math.PI))}"/>`; }
  g += '</g>';
  const la = seg(t, 44.7, 45.0, eo) * (1 - seg(t, 46.0, 46.4)); if (la > 0.01) g += A.chip(C[0] + 6, C[1] - 4, 'Darah di dalam serat', { cx: 540, cy: 1560, a: la, maxw: 520 }) + A.tag(540, 380, 'Potongan melintang', { a: la, fs: 34 });
  return g + '</g>';
}

// ---- tampak memanjang satu serat: DEFINISI geometri (layar)
const F = { x: 540, hw: 104, wall: 34, y0: 300, y1: 1760, pore: [], pitch: 92 };
for (let y = F.y0 + 70; y < F.y1 - 40; y += F.pitch) F.pore.push(y);
const VB = 120, VD = 150;   // kecepatan darah (naik, px/dtk) dan cairan dialisis (turun)
const rr = rnd(11);
const mkP = (n, t0a, t0b, y0lo, y0hi) => Array.from({ length: n }, (_, i) => ({ tStart: lerp(t0a, t0b, rr()), y0: lerp(y0lo, y0hi, rr()), x: (rr() - 0.5) * 120, side: i % 2 ? 1 : -1, lag: rr() }));
const UREA = mkP(30, 38.0, 52.5, F.y0 + 900, F.y1 + 1500);
const WATER = mkP(14, 49.0, 57.5, F.y0 + 900, F.y1 + 1300);
const CELLS = Array.from({ length: 11 }, (_, i) => ({ y0: F.y1 + 40 + i * 190, x: (rr() - 0.5) * 70, ph: rr() * 6 }));
const nearestPoreAbove = (y) => { let best = F.pore[0]; for (const v of F.pore) if (v <= y - 8) best = v; return best; };
// partikel naik bersama darah; mulai tcs0 (+ lag) berhenti di pori terdekat di atasnya, lalu melintasi membran dan hanyut TURUN bersama cairan dialisis
function crossingP(p, t, tcs0, spread, tCross = 0.7) {
  const yB = (tt) => p.y0 - VB * (tt - p.tStart);
  if (t < p.tStart) return null;
  const tExit = p.tStart + (p.y0 - (F.y0 + 70)) / VB, tcs = Math.min(tcs0 + p.lag * spread, tExit - 1.0);
  if (t < tcs) return { x: F.x + p.x, y: yB(t), st: 0 };
  const yAt = yB(tcs), pk = nearestPoreAbove(yAt), tc = tcs + Math.max(0, (yAt - pk) / VB);
  if (t < tc) return { x: F.x + p.x, y: yB(t), st: 0 };
  const u = clamp((t - tc) / tCross), x = lerp(F.x + p.x, F.x + p.side * (F.hw + F.wall + 44), eio(u));
  return { x, y: pk + (u >= 1 ? VD * (t - tc - tCross) : 0), st: u >= 1 ? 2 : 1 };
}
export function fiber(t) {
  const a = seg(t, 46.0, 46.7) * (1 - seg(t, 62.0, 62.8)); if (a <= 0.01) return '';
  let g = `<g opacity="${f1(a)}">`;
  const { x, hw, wall, y0, y1 } = F, phB = t * VB, phD = t * VD;
  // cairan dialisis (cyan) di luar, aliran TURUN
  const dl = x - hw - wall, dr = x + hw + wall;
  g += `<rect x="130" y="${y0}" width="${dl - 130}" height="${y1 - y0}" rx="20" fill="url(#gBag)" opacity=".55"/><rect x="${dr}" y="${y0}" width="${950 - dr}" height="${y1 - y0}" rx="20" fill="url(#gBag)" opacity=".55"/>`;
  for (let i = 0; i < 9; i++) for (const [xa, xb] of [[150, dl - 20], [dr + 20, 930]]) { const xx = lerp(xa, xb, (i + 0.5) / 9); g += `<path d="M${f1(xx)} ${y0 + 10}V${y1 - 10}" stroke="#E5FCFF" stroke-width="3.2" stroke-linecap="round" stroke-dasharray="26 60" stroke-dashoffset="${f1(-phD - i * 17)}" opacity=".55"/>`; }
  // lumen (darah) NAIK
  g += `<rect x="${x - hw}" y="${y0}" width="${2 * hw}" height="${y1 - y0}" fill="url(#gBlood)"/><rect x="${x - hw}" y="${y0}" width="${2 * hw}" height="${y1 - y0}" fill="#8E1428" opacity=".18"/>`;
  for (let i = 0; i < 5; i++) { const xx = x - hw + (i + 0.5) * (2 * hw) / 5; g += `<path d="M${f1(xx)} ${y1 - 10}V${y0 + 10}" stroke="#FFB3BC" stroke-width="3.2" stroke-linecap="round" stroke-dasharray="26 70" stroke-dashoffset="${f1(-phB - i * 21)}" opacity=".55"/>`; }
  // membran (dua dinding) dengan pori
  const wallSeg = (xl) => { let s = `<rect x="${xl}" y="${y0}" width="${wall}" height="${y1 - y0}" fill="${A.COL.memDk}"/><rect x="${xl + 4}" y="${y0}" width="${wall - 8}" height="${y1 - y0}" fill="${A.COL.mem}"/>`; F.pore.forEach((py) => { s += `<rect x="${xl - 1}" y="${py - 13}" width="${wall + 2}" height="26" rx="9" fill="#7FE6F2" stroke="#2B3F6A" stroke-width="3"/>`; }); return s; };
  g += wallSeg(x - hw - wall) + wallSeg(x + hw) + `<path d="M${x - hw - wall + 5} ${y0}V${y1}" stroke="#fff" stroke-width="5" opacity=".35"/>`;
  // sel darah (tetap di lumen; memantul bila mendekati dinding)
  CELLS.forEach((c, i) => { const y = ((c.y0 - VB * (t - 46.0)) - y0) % (y1 - y0 + 240); const yy = y0 + ((y + (y1 - y0 + 240)) % (y1 - y0 + 240)) - 60, xx = x + Math.max(-(hw - 40), Math.min(hw - 40, c.x + Math.sin(t * 1.3 + c.ph) * 24)); g += A.cellP(xx, yy, 29, (t * 40 + i * 50) % 360, 1); });
  const arr = (cx, cy, up, col) => `<g transform="translate(${cx} ${cy}) rotate(${up ? 0 : 180})"><path d="M0 70V-70M-34 -34L0 -78L34 -34" fill="none" stroke="#06202A" stroke-width="18" stroke-linecap="round" stroke-linejoin="round" opacity=".6"/><path d="M0 70V-70M-34 -34L0 -78L34 -34" fill="none" stroke="${col}" stroke-width="10" stroke-linecap="round" stroke-linejoin="round"/></g>`;
  g += `<g opacity="${f1(seg(t, 46.8, 47.4))}">${arr(x, 560, true, '#FFB3BC')}${arr(250, 560, false, '#E5FCFF')}${arr(830, 560, false, '#E5FCFF')}${arr(250, 1500, false, '#E5FCFF')}${arr(830, 1500, false, '#E5FCFF')}${arr(x, 1500, true, '#FFB3BC')}</g>`;
  // urea (zat sisa) melintasi pori; air (cairan berlebih) keluar terkontrol
  UREA.forEach((p, i) => { const q = crossingP(p, t, 50.66, 6.5); if (!q || q.y < y0 - 20 || q.y > y1 + 20) return; g += A.ureaP(q.x, q.y, 12, 1, i * 37 + t * 15); });
  if (t > 55.0) WATER.forEach((p, i) => { const q = crossingP(p, t, 55.3, 2.6, 0.9); if (!q || q.y < y0 - 20 || q.y > y1 + 20) return; g += A.waterP(q.x, q.y, 10, 1); });
  return g + '</g>';
}
export const fiberA = (t) => seg(t, 46.0, 46.7) * (1 - seg(t, 62.0, 62.8));
const ln2 = Math.log;
const KF = [[46.0, 540, 1000, ln2(0.95)], [47.4, 540, 930, ln2(1.0)], [49.0, 380, 1120, ln2(1.25)], [50.5, 540, 1040, ln2(1.0)], [51.2, 690, 1200, ln2(1.9)], [54.2, 690, 1000, ln2(1.8)], [55.2, 400, 1300, ln2(1.7)], [57.8, 400, 1000, ln2(1.6)], [58.7, 540, 1230, ln2(2.2)], [60.6, 540, 1000, ln2(2.0)], [61.4, 540, 1000, ln2(0.95)], [63.0, 540, 1000, ln2(0.95)]];
const fcx = pchip(KF.map((k) => [k[0], k[1]])), fcy = pchip(KF.map((k) => [k[0], k[2]])), fcs = pchip(KF.map((k) => [k[0], k[3]]));
export const camF = (t) => ({ cx: fcx(t), cy: fcy(t), s: Math.exp(fcs(t)) });
export const camFTf = (c) => `translate(540 960) scale(${c.s.toFixed(4)}) translate(${f1(-c.cx)} ${f1(-c.cy)})`;
// ---- label dan penanda arah (tampak memanjang)
export function fiberMarks(t, cam) {
  const a = seg(t, 46.6, 47.2) * (1 - seg(t, 62.0, 62.6)); if (a <= 0.01) return '';
  const m = (x, y) => [540 + (x - cam.cx) * cam.s, 960 + (y - cam.cy) * cam.s];
  const { x, hw, wall } = F, arrow = (cx, cy, up, col, txt) => `<g opacity="${f1(a)}"><g transform="translate(${cx} ${cy}) rotate(${up ? 0 : 180})"><path d="M0 70V-70M-34 -34L0 -78L34 -34" fill="none" stroke="#06202A" stroke-width="18" stroke-linecap="round" stroke-linejoin="round" opacity=".6"/><path d="M0 70V-70M-34 -34L0 -78L34 -34" fill="none" stroke="${col}" stroke-width="10" stroke-linecap="round" stroke-linejoin="round"/></g></g>`;
  let g = '';
  const L = [[47.0, 50.5, 'Darah\n(di dalam serat)', [x, 720], 'R'], [48.2, 50.6, 'Cairan dialisis\n(di luar)', [x - hw - wall - 60, 1000], 'L'], [49.3, 50.8, 'Arah\nberlawanan', [x + hw + wall + 60, 1180], 'R'],
    [51.6, 53.3, 'Urea', [x + hw + wall + 46, 1300], 'R'], [53.0, 55.0, 'Membran', [x + hw + wall / 2, 1090], 'R'], [56.0, 58.2, 'Cairan berlebih\nkeluar terkontrol', [x - hw - wall - 50, 1250], 'L'], [58.8, 60.8, 'Sel darah\ntetap di dalam', [x, 1190], 'R']];
  L.forEach(([t0, t1, txt, anc, side]) => { const al = seg(t, t0, t0 + 0.3, eo) * (1 - seg(t, t1 - 0.3, t1)); if (al <= 0.01) return; const [sx, sy] = m(anc[0], anc[1]); const w = A.chipW(txt); g += A.chip(sx, sy, txt, { cx: side === 'L' ? 24 + w / 2 : 1056 - w / 2, cy: clamp(sy, 340, 1620), a: al }); });
  return g;
}
// penanda ultrafiltrasi (55,1 - 58,4): tekanan kecil dan katup/dial "terkontrol"
export function controlDial(t) {
  const a = seg(t, 55.2, 55.7) * (1 - seg(t, 58.1, 58.6)); if (a <= 0.01) return '';
  const c = [900, 480], needle = -50 + 28 * Math.sin(t * 0.8) * 0.2 + 25 * seg(t, 55.4, 57.6);
  return `<g opacity="${f1(a)}"><circle cx="${c[0]}" cy="${c[1]}" r="96" fill="#06202A" stroke="${MC.ivory}" stroke-width="5"/><path d="M${c[0] - 70} ${c[1] + 20}A74 74 0 0 1 ${c[0] + 70} ${c[1] + 20}" fill="none" stroke="#6EE0B8" stroke-width="12" stroke-linecap="round"/><path d="M${c[0]} ${c[1] + 20}L${f1(c[0] + 58 * Math.sin(needle * Math.PI / 180))} ${f1(c[1] + 20 - 58 * Math.cos(needle * Math.PI / 180))}" stroke="${MC.ivory}" stroke-width="8" stroke-linecap="round"/><circle cx="${c[0]}" cy="${c[1] + 20}" r="11" fill="${MC.gold}" stroke="${MC.ink}" stroke-width="3"/><text x="${c[0]}" y="${c[1] + 74}" text-anchor="middle" font-family="${FONT}" font-weight="700" font-size="26" fill="${MC.ivory}">terkontrol</text></g>`;
}
