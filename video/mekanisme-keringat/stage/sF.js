// F. dua gangguan berlawanan (43,8 - 59,6): hiperhidrosis (terlalu banyak) vs hipohidrosis/anhidrosis (terlalu sedikit); ukuran tubuh sama.
// G. kembali ke Raka (59,5 - 67,0): heat stroke bisa terjadi walau masih berkeringat (dan juga bila kulit kering) - bukan satu-satunya penentu.
import { f1, clamp, lerp, sm, eo, eio, seg, pop, R, C, P, T, GOLD, FOREST, INK, rndf, K, W, CREAM, bgCream, chip, tag, callout, op, armTo, rk, raka, rIdle, sdrop, thermo, mixc, heatArrow, ka } from './common.js';

// pemancar tetes pada wajah/tangan Raka (koordinat kanvas Raka) -> tetes jatuh periodik
const EM = [[232, 120], [118, 152], [286, 190], [112, 236], [198, 300], [150, 128], [278, 262], [92, 552], [308, 552], [200, 640]];
function drops(t, r, n, k, rate, tOn) {
  let s = ''; for (let i = 0; i < n; i++) {
    const [ex, ey] = EM[i % EM.length], per = rate * (0.9 + 0.5 * rndf(i + 2)), ph = (t - tOn) / per + rndf(i + 9) * 3; if (t < tOn) continue;
    const u = ph - Math.floor(ph), p = r.at(ex, ey), h = (11 + 15 * Math.min(1, u * 3)) * k, fall = (u > 0.35 ? (u - 0.35) / 0.65 : 0), y = p[1] + fall * fall * 220 * k, o = u < 0.1 ? u * 10 : (u > 0.8 ? (1 - u) * 5 : 1);
    s += sdrop(p[0], y, h * 1.4, o);
  }
  return s;
}
function aura(cx, cy, rr, a, t) { return `<circle cx="${cx}" cy="${cy}" r="${f1(rr + 14 * Math.sin(t * 3))}" fill="${K.heat}" opacity="${f1(a * 0.22)}"/><circle cx="${cx}" cy="${cy}" r="${f1(rr * 0.72 + 10 * Math.sin(t * 3 + 1))}" fill="${K.heat}" opacity="${f1(a * 0.18)}"/>`; }
export function sceneF(t, out) {
  const K1 = 0.98, ty = 430, hiAct = clamp((t - 45.9) / 0.4) * (1 - clamp((t - 51.4) / 0.5)), loAct = clamp((t - 52.5) / 0.4), base = t < 45.9 ? 0.92 : 1;
  const dL = lerp(1, 0.55, clamp((t - 51.6) / 0.5)), dR = t < 52.5 ? lerp(1, 0.6, clamp((t - 46) / 0.5)) : 1;
  const wipe = clamp((t - 46.1) / 0.5) * (1 - clamp((t - 51.4) / 0.5)), fan = clamp((t - 52.9) / 0.5);
  const sL = rIdle(raka('khawatir', 'netral', { armR: armTo('R', lerp(330, 250 + 36 * Math.sin(t * 3.4), wipe), lerp(556, 172 + 6 * Math.sin(t * 6.8), wipe)), armL: armTo('L', 70, 556), tilt: 2 * wipe * Math.sin(t * 3.4) }), t);
  const sR = rIdle(raka(t < 52.5 ? 'netral' : 'sedih', 'netral', { armR: armTo('R', 330, 556), armL: armTo('L', lerp(70, 112 + 12 * Math.sin(t * 5), fan), lerp(556, 360 + 16 * Math.cos(t * 5), fan)), lean: 2.5 * fan * Math.sin(t * 1.7), tilt: 2.5 * fan * Math.sin(t * 1.3) }), t);
  const rl = rk(sL, 285, ty, K1, 'rFL'), rr = rk(sR, 795, ty, K1, 'rFR');
  let w = bgCream;
  w += `<rect x="20" y="360" width="520" height="940" rx="40" fill="#fff" opacity=".7"/><rect x="540" y="360" width="520" height="940" rx="40" fill="#fff" opacity=".7"/>`;
  // kiri: hiperhidrosis (tetes banyak walau suhu tubuh normal)
  const nL = t < 45.9 ? 2 : Math.round(lerp(2, 10, clamp((t - 46.1) / 1.2)));
  w += `<g opacity="${f1(dL)}">${rl.svg}${drops(t, rl, nL, K1, t < 46 ? 2.6 : 1.1, 44.0)}</g>`;
  // kanan: hipohidrosis/anhidrosis (tetes sedikit/tidak ada; panas menumpuk di tubuh)
  const heatR = clamp((t - 53.8) / 3.5);
  w += `<g opacity="${f1(dR)}">${aura(795, 820, 300, heatR, t)}${rr.svg}${t < 52.5 ? drops(t, rr, 2, K1, 2.6, 44.0) : (t < 55 ? drops(t, rr, 1, K1, 4.5, 53.0) : '')}`;
  // panas tertahan: panah koral berhenti/memantul di kulit (tidak keluar)
  if (t > 57.6) { const a = clamp((t - 57.6) / 0.5); for (let i = 0; i < 3; i++) { const ph = ((t * 0.9 + i / 3) % 1), x = 640 + i * 155, y0 = 780 + 40 * (i % 2), dy = -60 * Math.min(1, ph * 1.5) + 22 * Math.max(0, ph - 0.66) * 3; w += `<g opacity="${f1(a * (1 - ph * 0.3))}">${heatArrow(x, y0, -90, 60 * Math.min(1, ph * 1.5), 1, 12)}</g>`; } }
  // gelombang panas bergerak di sekitar Raka kanan saat panas menumpuk
  if (heatR > 0.01) for (let i = 0; i < 4; i++) { const ph = (t * 0.8 + i / 4) % 1, x = 600 + i * 130 + 10 * Math.sin(t * 2 + i); w += `<path d="M${f1(x)} ${f1(1100 - ph * 380)}q16 -26 0 -52t0 -52" fill="none" stroke="${K.heat}" stroke-width="9" stroke-linecap="round" opacity="${f1(heatR * 0.55 * Math.sin(ph * Math.PI))}"/>`; }
  w += '</g>';
  out.A += w;
  const thL = 0.42, thR = lerp(0.5, 0.94, clamp((t - 52.6) / 6.4));
  let u = chip(['SISTEM BISA TERGANGGU'], t, 43.9, 45.95, { size: 54, bg: '#fff' });
  u += tag('HIPERHIDROSIS', 280, 410, 1, { size: 34, bg: hiAct > 0.1 ? K.sweat : '#fff', fg: INK });
  u += tag('HIPOHIDROSIS /', 800, 395, 1, { size: 28, bg: loAct > 0.1 ? '#FFD9D1' : '#fff', fg: INK }) + tag('ANHIDROSIS', 800, 445, 1, { size: 28, bg: loAct > 0.1 ? '#FFD9D1' : '#fff', fg: INK });
  u += op(dL, thermo(70, 560, 280, thL, { w: 30 }) + tag('suhu normal', 80, 520, ka(t, 48.4, 51.5, 0.3), { size: 24 }));
  u += op(dR, thermo(590, 560, 280, thR, { w: 30 }) + tag('suhu naik', 600, 520, ka(t, 55.0, 59.5, 0.3), { size: 24 }));
  u += tag('TERLALU BANYAK', 280, 1230, ka(t, W.berlebihan - 0.3, 51.5, 0.3), { size: 40, bg: K.sweat, fg: INK });
  u += tag('meski suhu tubuh tidak menuntut', 280, 1170, ka(t, W.bahkan, 51.5, 0.3), { size: 26, bg: '#fff' });
  u += tag('TERLALU SEDIKIT', 800, 1230, ka(t, W.sedikit - 0.3, 59.5, 0.3), { size: 40, bg: '#FFD9D1', fg: '#8A2F22' });
  u += tag('panas sulit keluar', 800, 1170, ka(t, W.sulit - 0.3, 59.5, 0.3), { size: 28, bg: '#fff' });
  out.U += u;
}
export function sceneG(t, out) {
  const k = 1.1, ty = 520, bad = clamp((t - 60.2) / 1.5);
  const st = rIdle(raka(t < 61.4 ? 'sedih' : 'bingung', 'netral', { armR: armTo('R', 330, 556), armL: armTo('L', 70, 556), tilt: -2 * bad + 2.2 * bad * Math.sin(t * 1.9), lean: 2 * bad * Math.sin(t * 1.3) }), t);
  const r = rk(st, 540, ty, k, 'rG');
  let w = bgCream + aura(540, 960, 300, 0.7 * bad, t);
  for (let i = 0; i < 6; i++) { const ph = (t * 0.7 + i / 6) % 1, x = 200 + i * 135 + 14 * Math.sin(t * 2 + i); w += `<path d="M${f1(x)} ${f1(1250 - ph * 560)}q18 -26 0 -52t0 -52" fill="none" stroke="${K.heat}" stroke-width="10" stroke-linecap="round" opacity="${f1(0.5 * bad * Math.sin(ph * Math.PI))}"/>`; }
  w += r.svg;
  // tetap berkeringat: tetes muncul di wajah dan tangan
  w += drops(t, r, 4, k, 1.3, 59.8);
  out.A += w;
  const th = lerp(0.8, 0.98, bad), pulse = 0.5 + 0.5 * Math.sin(t * 4);
  let u = chip(['HEAT STROKE BISA', 'TETAP BERKERINGAT'], t, 59.7, 67.1, { size: 60, bg: '#fff' });
  u += thermo(90, 480, 360, th, { w: 36 }) + tag('SUHU TUBUH', 90, 430, 1, { size: 26 });
  u += tag('KULIT KERING', 240, 920, ka(t, 63.3, 67.1, 0.3), { size: 32, bg: '#fff' }) + tag('MASIH BERKERINGAT', 860, 920, ka(t, 64.7, 67.1, 0.3), { size: 32, bg: K.sweat, fg: INK });
  u += tag('keduanya bisa terjadi pada heat stroke', 540, 475, ka(t, 65.8, 67.1, 0.3), { size: 30, bg: '#FFD9D1', fg: '#8A2F22' });
  out.U += u;
}
