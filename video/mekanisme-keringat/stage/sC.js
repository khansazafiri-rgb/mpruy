// C. penampang kulit (13,8 - 30,8): saraf -> asetilkolin -> kelenjar ekrin -> cairan di gulungan -> saluran (garam diserap kembali) -> pori -> tetes.
// Satu orientasi sepanjang adegan: permukaan di ATAS (y = 0), kelenjar gulung di dermis bawah (y ~ 1500), saluran naik ke pori, saraf masuk dari kanan-bawah. Ilustrasi, tidak sesuai skala.
import { f1, clamp, lerp, sm, eo, eio, seg, pop, track, pathPt, pathLen, R, C, P, T, GOLD, FOREST, INK, rndf, K, W, caption, chip, tag, callout, op, mixc, ach, ion, molecule, sdrop, ka } from './common.js';

export const GL = { x: 0, y: 1500 };
// gulungan: kurva Lissajous 3:2 (pretzel) terbuka; ujungnya tersambung ke saluran
const coilPts = []; for (let i = 0; i <= 180; i++) { const s = 0.35 + i / 180 * Math.PI * 2 * 0.96; coilPts.push([GL.x + 168 * Math.sin(3 * s + 0.5) + 20 * Math.sin(7 * s), GL.y + 122 * Math.sin(2 * s) + 18 * Math.cos(5 * s)]); }
export const COIL_D = 'M' + coilPts.map((p) => `${f1(p[0])} ${f1(p[1])}`).join('L');
const ce = coilPts[coilPts.length - 1];
// saluran naik dari ujung gulungan ke pori (0, 70) dengan sedikit berliku
const duct = [[ce[0], ce[1]], [ce[0] * 0.8, 1340], [-26, 1240], [24, 1120], [-20, 1000], [22, 880], [-18, 760], [20, 640], [-14, 520], [16, 400], [-10, 280], [8, 180], [0, 90], [0, 6]];
// Catmull-Rom -> Bezier agar saluran melengkung halus
function smooth(pts) { let d = `M${f1(pts[0][0])} ${f1(pts[0][1])}`; for (let i = 0; i < pts.length - 1; i++) { const p0 = pts[Math.max(0, i - 1)], p1 = pts[i], p2 = pts[i + 1], p3 = pts[Math.min(pts.length - 1, i + 2)]; d += `C${f1(p1[0] + (p2[0] - p0[0]) / 6)} ${f1(p1[1] + (p2[1] - p0[1]) / 6)} ${f1(p2[0] - (p3[0] - p1[0]) / 6)} ${f1(p2[1] - (p3[1] - p1[1]) / 6)} ${f1(p2[0])} ${f1(p2[1])}`; } return d; }
export const DUCT_D = smooth(duct);
export const NERVE_D = 'M1150 2250C1000 1950 640 1800 420 1700S250 1580 205 1548';
export const TERM = [205, 1548];
const LC = pathLen(COIL_D), LD = pathLen(DUCT_D), VD = 245, TC = 1.4, T_FRONT = 23.1;
// kamera: pusat dunia (cx, cy) dan zoom
export const camC = track([[13.7, 0.62, -60, 900], [14.8, 1.45, 40, 1530], [19.0, 1.45, 40, 1530], [21.2, 1.2, 0, 1500], [22.8, 1.2, 0, 1480], [24.3, 1.2, 0, 1150], [26.0, 1.3, 0, 760], [27.6, 1.5, 0, 420], [29.0, 1.8, 0, 230], [30.9, 1.95, 0, 120]]);
const ox = 540, oy = 930;
export function ductPoint(d) { return pathPt(DUCT_D, clamp(d / LD)); }
export const frontD = (t) => clamp((t - T_FRONT) * VD, 0, LD);
// partikel dalam cairan: tiap partikel lahir di gulungan, lewat gulungan (TC dtk) lalu naik di saluran
const NPART = 44, PART = Array.from({ length: NPART }, (_, i) => ({ t0: 21.7 + i * 0.185, kind: (i % 9 === 4 || i % 9 === 8) ? 'w' : (i % 5 === 1 ? 'w' : 'i'), taken: i % 3 !== 0, side: i % 2 ? 1 : -1, off: (rndf(i + 3) - 0.5) * 10 }));
const ZONE = [1080, 520]; // y dunia tempat garam diserap kembali
function partPos(p, t) {
  const a = t - p.t0; if (a < 0) return null;
  if (a < TC) { const q = pathPt(COIL_D, clamp(a / TC)); return { x: q.x + p.off * 0.5, y: q.y, state: 'coil' }; }
  const d = (a - TC) * VD; if (d > LD) return null;
  const q = pathPt(DUCT_D, d / LD); let x = q.x + p.off * 0.4, y = q.y, o = 1, out = 0;
  if (p.kind === 'i' && p.taken && p.t0 + TC > 22.3 && t > 25.3) { const k = clamp((ZONE[0] - y) / 260), ramp = clamp((t - 25.3) / 0.9); out = sm(k) * ramp; x += p.side * out * (38 + 46 * out); }
  if (y < 60) o = clamp((y - 10) / 50);
  return { x, y, state: 'duct', out, o };
}
export function skinWorld(t, o = {}) {
  const act = seg(t, 18.4, 19.2), flow = clamp((t - 21.6) / 1.5);
  let w = `<rect x="-3000" y="-3000" width="6000" height="3000" fill="${K.air}"/><rect x="-3000" y="0" width="6000" height="3400" fill="${K.derm}"/>`;
  // tekstur dermis: serat dan titik
  for (let i = 0; i < 70; i++) { const x = (rndf(i) - 0.5) * 2400, y = 160 + rndf(i + 50) * 2100; w += `<path d="M${f1(x)} ${f1(y)}q30 ${f1(14 * (rndf(i + 7) - 0.5) * 2)} 64 0" stroke="${K.dermD}" stroke-width="7" fill="none" stroke-linecap="round" opacity=".7"/>`; }
  for (let i = 0; i < 40; i++) w += `<circle cx="${f1((rndf(i + 91) - 0.5) * 2400)}" cy="${f1(150 + rndf(i + 17) * 2200)}" r="${f1(8 + rndf(i + 5) * 12)}" fill="${K.dermD}" opacity=".55"/>`;
  // epidermis (lapisan atas, sedikit bergelombang)
  let ep = 'M-3000 0'; for (let x = -3000; x <= 3000; x += 40) ep += `L${x} ${f1(5 * Math.sin(x * 0.03))}`; ep += 'L3000 74L-3000 74Z';
  w += `<path d="${ep}" fill="${K.epi}"/><path d="M-3000 74L3000 74" stroke="${K.epiD}" stroke-width="5"/>`;
  // pembuluh kapiler di dekat gulungan (konteks; tanpa label)
  w += `<path d="M-520 1320C-380 1380 -330 1560 -420 1700S-640 1800 -700 1900" fill="none" stroke="#E0707D" stroke-width="22" stroke-linecap="round" opacity=".85"/><path d="M430 1240C330 1330 300 1500 360 1560" fill="none" stroke="#E0707D" stroke-width="18" stroke-linecap="round" opacity=".7"/>`;
  // saraf (dari kanan-bawah) + ujung (terminal)
  w += `<path d="${NERVE_D}" fill="none" stroke="${K.goldD}" stroke-width="30" stroke-linecap="round"/><path d="${NERVE_D}" fill="none" stroke="${K.nerve}" stroke-width="18" stroke-linecap="round"/>`;
  // saluran: dinding + lumen + cairan (bagian yang sudah terisi)
  const fd = frontD(t);
  w += `<path d="${DUCT_D}" fill="none" stroke="${K.glandD}" stroke-width="76" stroke-linecap="round" stroke-linejoin="round"/><path d="${DUCT_D}" fill="none" stroke="${K.gland}" stroke-width="64" stroke-linecap="round" stroke-linejoin="round"/><path d="${DUCT_D}" fill="none" stroke="${K.lumen}" stroke-width="40" stroke-linecap="round" stroke-linejoin="round"/>`;
  if (fd > 0.5) w += `<path d="${DUCT_D}" fill="none" stroke="${K.sweat}" stroke-width="40" stroke-linecap="round" stroke-linejoin="round" stroke-dasharray="${f1(fd)} ${f1(LD + 50)}"/>`;
  // gulungan
  w += (act > 0.02 ? `<circle cx="${GL.x}" cy="${GL.y}" r="${f1(190 + 14 * Math.sin(t * 6))}" fill="${K.gold}" opacity="${f1(0.22 * act)}"/>` : '') + `<path d="${COIL_D}" fill="none" stroke="${K.glandD}" stroke-width="92" stroke-linecap="round" stroke-linejoin="round"/><path d="${COIL_D}" fill="none" stroke="${mixc(K.gland, '#F29AAE', act)}" stroke-width="80" stroke-linecap="round" stroke-linejoin="round"/><path d="${COIL_D}" fill="none" stroke="${K.lumen}" stroke-width="48" stroke-linecap="round" stroke-linejoin="round"/>`;
  if (flow > 0.01) w += `<path d="${COIL_D}" fill="none" stroke="${K.sweat}" stroke-width="48" stroke-linecap="round" stroke-linejoin="round" stroke-dasharray="${f1(flow * LC)} ${f1(LC + 50)}"/>`;
  return w;
}
export function neuroLayer(t) {
  // denyut sinyal di sepanjang saraf, ujung saraf menyala, asetilkolin menyeberang celah ke dinding kelenjar
  let w = '';
  for (let i = 0; i < 4; i++) { const u = (t - 14.28 - i * 0.5) / 1.5; if (u > 0 && u < 1) { const p = pathPt(NERVE_D, u); w += `<circle cx="${f1(p.x)}" cy="${f1(p.y)}" r="44" fill="#fff" opacity=".85"/><circle cx="${f1(p.x)}" cy="${f1(p.y)}" r="26" fill="${K.gold}" stroke="${K.goldD}" stroke-width="6"/>`; } }
  const arrive = clamp((t - 15.6) / 0.4) * (1 - clamp((t - 18.6) / 0.6)), bulb = 30 + 8 * Math.sin(t * 9) * arrive;
  w += `<circle cx="${TERM[0]}" cy="${TERM[1]}" r="${f1(bulb + 26 * arrive)}" fill="#fff" opacity="${f1(0.5 * arrive)}"/><circle cx="${TERM[0]}" cy="${TERM[1]}" r="${f1(bulb)}" fill="${K.nerve}" stroke="${K.goldD}" stroke-width="8"/>`;
  const N = 12;
  for (let i = 0; i < N; i++) {
    const t0 = 16.1 + i * 0.12, a = (t - t0) / 1.5; if (a < 0) continue;
    const e = eio(clamp(a)), tx = 120 + 22 * Math.cos(i * 1.7), ty = 1540 + (i - 5.5) * 17;
    const x = lerp(TERM[0] - 12, tx, e) + (1 - e) * 6 * Math.sin(t * 5 + i), y = lerp(TERM[1], ty, e) + 5 * Math.sin(t * 4 + i * 2) * (1 - e);
    w += ach(x, y, 10, clamp(a * 5), 0);
  }
  return w;
}
export function particleLayer(t) {
  let w = '';
  for (let i = 0; i < NPART; i++) {
    const p = PART[i], q = partPos(p, t); if (!q) continue;
    const fadeIn = clamp((t - p.t0) / 0.3), o = (q.o ?? 1) * fadeIn;
    if (p.kind === 'i') w += ion(q.x, q.y, 13, o * (q.out ? 1 - q.out * 0.25 : 1));
    else w += molecule(q.x, q.y, 11, o);
  }
  // garam yang diserap kembali: titik teal di jaringan (menetap dan perlahan bergeser menjauh)
  for (let i = 0; i < NPART; i++) {
    const p = PART[i]; if (p.kind !== 'i' || !p.taken) continue;
    const a = t - p.t0 - TC; if (a < 0) continue;
    // titik keluar duct: hitung posisi saat y melewati zona (state 'out' bernilai 1)
    const dEnd = (a * VD); const dOut = ductDistAtY(380 + (rndf(i + 31)) * 120);
    if (dEnd >= dOut && t > 25.3) {
      const q = pathPt(DUCT_D, dOut / LD), k = clamp((t - (p.t0 + TC + dOut / VD)) / 1.4);
      w += ion(q.x + p.side * (84 + 70 * eo(k)), q.y + 30 * k, 9, clamp(1.1 - k * 0.5));
    }
  }
  return w;
}
function ductDistAtY(y) { const L = LD; let lo = 0, hi = L; for (let i = 0; i < 18; i++) { const m = (lo + hi) / 2; if (pathPt(DUCT_D, m / L).y > y) lo = m; else hi = m; } return (lo + hi) / 2; }
export function dropOnSurface(t, r0 = 0) {
  const g = clamp((t - 28.75) / 1.7); if (g <= 0) return '';
  const r = 26 + 40 * eo(g); return `<path d="M${f1(-r)} 2A${f1(r)} ${f1(r * 0.85)} 0 0 1 ${f1(r)} 2Z" fill="${K.sweat}" stroke="${K.sweatD}" stroke-width="6" stroke-linejoin="round"/><ellipse cx="${f1(-r * 0.35)}" cy="${f1(-r * 0.42)}" rx="${f1(r * 0.12)}" ry="${f1(r * 0.2)}" fill="#fff" opacity=".7" transform="rotate(-24 ${f1(-r * 0.35)} ${f1(-r * 0.42)})"/>`;
}
export function sceneC(t, out) {
  const [z, cx, cy] = camC(t), tr = `translate(${ox} ${oy}) scale(${f1(z * 1000) / 1000}) translate(${f1(-cx)} ${f1(-cy)})`;
  out.A += `<g transform="${tr}">${skinWorld(t)}${neuroLayer(t)}${particleLayer(t)}${dropOnSurface(t)}</g>`;
  const S = (x, y) => [ox + (x - cx) * z, oy + (y - cy) * z];
  let u = '';
  u += chip(['KELENJAR EKRIN'], t, 13.9, 16.0, { size: 58, bg: '#fff' }) + chip(['ASETILKOLIN'], t, 16.0, 19.0, { size: 62, bg: K.gold, fg: INK }) + chip(['BAGIAN GULUNGAN'], t, 19.0, 21.5, { size: 54, bg: '#fff' }) + chip(['CAIRAN DIBUAT'], t, 21.5, 25.9, { size: 60, bg: K.sweat, fg: INK }) + chip(['SEBAGIAN GARAM', 'DISERAP KEMBALI'], t, 25.9, 27.7, { size: 52, bg: '#C9F3EC', fg: INK }) + chip(['KELUAR LEWAT PORI'], t, 27.7, 30.9, { size: 58, bg: '#fff' });
  const gl = S(GL.x - 100, GL.y - 120), tm = S(TERM[0], TERM[1]), ac = S(110, 1545);
  u += callout('ujung saraf', 150, 1090, tm[0] + 8, tm[1] - 14, ka(t, 14.9, 16.3, 0.25), { size: 34, col: K.gold });
  u += callout('asetilkolin', 270, 1000, ac[0], ac[1] - 8, ka(t, W.asetilkolin - 0.3, 19.0, 0.25), { size: 38, col: K.gold, k: eo(clamp((t - W.asetilkolin + 0.3) / 0.4)) });
  u += callout('kelenjar ekrin', 760, 700, S(150, GL.y - 140)[0], S(150, GL.y - 140)[1], ka(t, 14.0, 15.2, 0.25) * (z < 1 ? 1 : 0), { size: 36, col: K.gland });
  u += callout('gulungan: cairan dibuat', 300, 640, S(-120, GL.y - 110)[0], S(-120, GL.y - 110)[1], ka(t, W.gulungan - 0.2, 23.0, 0.25), { size: 36, col: K.gland });
  const dp = ductPoint(clamp((t - T_FRONT) * VD - 40, 0, LD)), dps = S(dp.x, dp.y);
  u += callout('saluran', 790, 640 + 0, S(20, 900)[0], S(20, 900)[1], ka(t, W.saluran - 0.2, 25.6, 0.25) * (t > 24.2 ? 1 : 0), { size: 38, col: K.gland });
  u += callout('garam (Na⁺, Cl⁻)', 280, 1020, S(70, 760)[0], S(70, 760)[1], ka(t, 26.0, 27.9, 0.25), { size: 36, col: K.salt });
  u += callout('pori', 800, 700, S(0, 40)[0], S(0, 40)[1], ka(t, W.pori - 0.8, 30.7, 0.25), { size: 40, col: K.gland });
  // legenda warna
  const lg = (y, col, txt, a) => a > 0.01 ? `<g opacity="${f1(a)}"><circle cx="72" cy="${y}" r="15" fill="${col[0]}" stroke="${col[1]}" stroke-width="5"/>${T(txt, 100, y + 12, { size: 30, anchor: 'start', fill: INK })}</g>` : '';
  const la = clamp((t - 15.0) / 0.4) * (1 - clamp((t - 30.4) / 0.4));
  u += (la > 0.01 ? `<g opacity="${f1(la)}"><rect x="34" y="1160" width="370" height="128" rx="26" fill="rgba(255,255,255,.88)"/></g>` : '') + lg(1190, [K.gold, K.goldD], 'sinyal / asetilkolin', la) + lg(1226, [K.sweat, K.sweatD], 'cairan keringat', la) + lg(1262, [K.salt, K.saltD], 'garam', la);
  u += tag('ilustrasi, tidak sesuai skala', 800, 1260, ka(t, 14.0, 16.0, 0.3), { size: 26 });
  out.U += u;
}
