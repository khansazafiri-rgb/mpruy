// D. permukaan kulit, close-up makro (30,8 - 38,8): tetes basah belum mendinginkan; PENGUAPAN: molekul air meninggalkan tetes membawa panas.
// E. perbandingan udara kering vs udara lembap (38,6 - 43,9): dua panel, penguapan jauh lebih sedikit di udara lembap.
import { f1, clamp, lerp, sm, eo, eio, seg, pop, R, C, P, T, GOLD, FOREST, INK, rndf, K, W, bgCream, chip, tag, callout, op, mixc, heatArrow, molecule, thermo, ka, dashed } from './common.js';

const heatCol = (h) => mixc(K.epi, '#F2735E', clamp(h) * 0.85);
function dome(R0, o = 1) { const r = R0; return `<g opacity="${o}"><path d="M${f1(-r)} 3A${f1(r)} ${f1(r * 0.88)} 0 0 1 ${f1(r)} 3Z" fill="${K.sweat}" stroke="${K.sweatD}" stroke-width="7" stroke-linejoin="round"/><ellipse cx="${f1(-r * 0.4)}" cy="${f1(-r * 0.42)}" rx="${f1(r * 0.1)}" ry="${f1(r * 0.2)}" fill="#fff" opacity=".75" transform="rotate(-26 ${f1(-r * 0.4)} ${f1(-r * 0.42)})"/></g>`; }
// molekul air (biru) dan ion garam (teal) bergerak di dalam tetes
function dropInside(t, R0, seed = 0) {
  let s = ''; for (let k = 0; k < 13; k++) { const x = R0 * 0.72 * Math.sin(t * (0.55 + 0.07 * k) + k * 2.1 + seed), hh = Math.sqrt(Math.max(0, 1 - (x / R0) ** 2)) * R0 * 0.84, y = -10 - (0.5 + 0.5 * Math.sin(t * (0.5 + 0.06 * k) + k * 1.7)) * (hh - 24);
    s += k % 4 === 3 ? `<circle cx="${f1(x)}" cy="${f1(y)}" r="9" fill="${K.salt}" stroke="${K.saltD}" stroke-width="2.5"/>` : `<circle cx="${f1(x)}" cy="${f1(y)}" r="8" fill="#BFEAFB" stroke="${K.sweatD}" stroke-width="2.5" opacity=".95"/>`; }
  return s;
}
// permukaan kulit (dunia lokal): y = 0 permukaan, udara di atas. c: heat, R (jari-jari tetes), mols (HTML molekul), ambient (jumlah uap air di udara)
function surface(t, c) {
  let w = `<rect x="-900" y="-1200" width="1800" height="1200" fill="${K.air}"/>`;
  // uap air di udara (lembap): titik biru muda yang melayang pelan
  const na = c.ambient || 0; for (let i = 0; i < na; i++) { const x = -330 + rndf(i + c.seed) * 660 + 18 * Math.sin(t * 1.3 + i * 2), y = -40 - rndf(i + c.seed + 40) * 420 + 14 * Math.cos(t * 1.1 + i); w += `<circle cx="${f1(x)}" cy="${f1(y)}" r="11" fill="${K.sweat}" stroke="${K.sweatD}" stroke-width="3" opacity=".8"/>`; }
  w += `<rect x="-900" y="0" width="1800" height="1500" fill="${K.derm}"/>`;
  for (let i = 0; i < 26; i++) w += `<path d="M${f1((rndf(i) - 0.5) * 900)} ${f1(150 + rndf(i + 3) * 700)}q22 ${f1(10 * (rndf(i + 7) - 0.5) * 2)} 48 0" stroke="${K.dermD}" stroke-width="7" fill="none" stroke-linecap="round" opacity=".7"/>`;
  let ep = 'M-900 0'; for (let x = -900; x <= 900; x += 30) ep += `L${x} ${f1(4 * Math.sin(x * 0.04))}`; ep += 'L900 86L-900 86Z';
  w += `<path d="${ep}" fill="${heatCol(c.heat)}"/><path d="M-900 86L900 86" stroke="${K.epiD}" stroke-width="5"/>`;
  // pori + ujung saluran
  w += `<path d="M0 3L0 700" stroke="${K.glandD}" stroke-width="72" stroke-linecap="round"/><path d="M0 3L0 700" stroke="${K.gland}" stroke-width="60" stroke-linecap="round"/><path d="M0 3L0 700" stroke="${K.sweat}" stroke-width="36" stroke-linecap="round"/>`;
  // panas dari tubuh naik ke kulit (koral), lebih terang saat kulit panas
  if (c.arrows) for (let i = 0; i < 3; i++) { const ph = ((t * 0.7 + i / 3) % 1), x = (i - 1) * 170; w += `<g opacity="${f1(c.arrows * Math.sin(ph * Math.PI))}">${heatArrow(x, lerp(520, 150, ph), -90, 90, 1, 16)}</g>`; }
  w += dome(c.R) + dropInside(t, c.R, c.seed) + (c.mols || '');
  return w;
}
// molekul yang meninggalkan tetes. dry: banyak dan naik; humid: sedikit naik, sebagian kembali turun. halo = tampil halo koral "membawa panas"
function leaving(t, o) {
  let s = ''; const { t0, gap, n, R0, v = 150, halo = true, ret = false, seed = 0 } = o;
  for (let i = 0; i < n; i++) {
    const a = t - (t0 + i * gap + rndf(i + seed) * gap * 0.5); if (a < 0 || a > 3.2) continue;
    const x0 = (rndf(i + seed + 11) - 0.5) * R0 * 1.3, y0 = -Math.sqrt(Math.max(0, 1 - (x0 / R0) ** 2)) * R0 * 0.88 + 8;
    let x, y, op_ = clamp(a * 6) * clamp((2.3 - a) / 0.8);
    if (ret && (i % 2 === 0)) { const H = 60 + 60 * rndf(i + seed + 3), d = 1.5, u = a / d; if (u > 1) continue; y = y0 - H * Math.sin(Math.PI * Math.min(1, u)) ; x = x0 + 10 * Math.sin(a * 5 + i); op_ = 1; }
    else { y = y0 - v * a - 18 * a * a; x = x0 + 26 * Math.sin(a * 3 + i * 2) + (rndf(i + seed + 5) - 0.5) * 20 * a; }
    if (halo && !(ret && i % 2 === 0)) s += `<circle cx="${f1(x)}" cy="${f1(y)}" r="${f1(30 + 5 * Math.sin(a * 8))}" fill="${K.heat}" opacity="${f1(0.38 * op_)}"/>`;
    s += molecule(x, y, 13, op_);
  }
  return s;
}
export function sceneD(t, out) {
  const ev = seg(t, 36.4, 38.6, (x) => x), heat = t < 36.4 ? 1 : lerp(1, 0.4, sm(ev)), R0 = t < 30.9 ? lerp(66, 98, sm((t - 30.4) / 0.5)) : lerp(98, 84, sm(ev));
  const mols = leaving(t, { t0: 36.4, gap: 0.095, n: 26, R0, halo: true, seed: 1 });
  const arrows = t < 36.4 ? 0.85 : 0.85 - 0.45 * sm(ev);
  const ox = 540, oy = 1010, z = 2.35, tr = `translate(${ox} ${oy}) scale(${z})`;
  out.A += `<g transform="${tr}">${surface(t, { heat, R: R0, mols, seed: 5, arrows })}</g>`;
  // panas yang dibawa pergi: panah koral besar dari kulit menembus tetes ke atas (36,6+)
  const lv = t < 36.4 ? 0.86 : lerp(0.86, 0.45, sm(ev));
  let u = chip(['KULIT BASAH SAJA', 'BELUM TENTU DINGIN'], t, 30.9, 34.1, { size: 54, bg: '#fff' }) + chip(['YANG MENDINGINKAN:', 'PENGUAPAN'], t, 34.1, 38.75, { size: 58, bg: K.sweat, fg: INK });
  u += thermo(100, 520, 380, lv, { w: 38 }) + tag('SUHU KULIT', 100, 470, 1, { size: 26 });
  u += tag('tetes ada, kulit masih panas', 600, 1240, ka(t, 31.6, 34.1, 0.3), { size: 32, bg: '#fff' });
  u += tag('molekul air melepaskan diri ke udara', 760, 700, ka(t, 36.5, 38.6, 0.3), { size: 32, bg: K.sweat, fg: INK });
  u += tag('membawa panas dari kulit', 590, 1195, ka(t, 37.3, 38.7, 0.3), { size: 32, bg: '#FFD9D1', fg: '#8A2F22' });
  u += tag('ilustrasi, tidak sesuai skala', 840, 480, ka(t, 31.0, 33.5, 0.3), { size: 24 });
  out.U += u;
}
export function sceneE(t, out) {
  const a = t - 38.6, P0 = { z: 1.55, ox: 275, oy: 1020 };
  const panel = (px, humid) => {
    const evap = humid ? 0.12 : 1, ev = clamp(a / 5.0);
    const R0 = lerp(88, humid ? 84 : 50, sm(ev)), heat = humid ? lerp(0.9, 0.92, ev) : lerp(0.9, 0.3, sm(clamp(a / 4.5)));
    const mols = leaving(t, { t0: 38.7, gap: humid ? 0.62 : 0.12, n: humid ? 8 : 34, R0, v: humid ? 90 : 150, halo: true, ret: humid, seed: humid ? 40 : 7 }) + (humid ? leaving(t, { t0: 38.9, gap: 0.5, n: 10, R0, v: 0, halo: false, ret: true, seed: 90 }) : '');
    const x0 = px, id = humid ? 'pR' : 'pL';
    return `<defs><clipPath id="${id}"><rect x="${x0}" y="400" width="520" height="880" rx="36"/></clipPath></defs><g clip-path="url(#${id})"><g transform="translate(${x0 + 260} ${P0.oy}) scale(${P0.z})">${surface(t, { heat, R: R0, mols, seed: humid ? 70 : 9, ambient: humid ? 36 : 3, arrows: 0 })}</g></g><rect x="${x0}" y="400" width="520" height="880" rx="36" fill="none" stroke="#fff" stroke-width="10"/>`;
  };
  out.A += `<rect width="1080" height="1920" fill="${K.air}"/>` + panel(20, false) + panel(540, true);
  const hL = lerp(0.9, 0.3, sm(clamp(a / 4.5))), hR = 0.9;
  let u = chip(['UDARA LEMBAP', 'MENGHAMBAT PENGUAPAN'], t, 39.2, 43.95, { size: 54, bg: '#fff' });
  u += tag('UDARA KERING', 280, 450, 1, { size: 30, bg: '#fff' }) + tag('UDARA LEMBAP', 800, 450, 1, { size: 30, bg: '#DDF3FB', fg: INK });
  u += thermo(70, 600, 240, hL, { w: 28 }) + thermo(590, 600, 240, hR, { w: 28 });
  u += tag('banyak molekul keluar', 300, 1120, ka(t, 40.0, 43.9, 0.3), { size: 28, bg: K.sweat, fg: INK }) + tag('sedikit yang keluar', 810, 1120, ka(t, W.lembap - 0.2, 43.9, 0.3), { size: 28, bg: '#fff' });
  u += tag('LEBIH DINGIN', 300, 1200, ka(t, 41.6, 43.9, 0.3), { size: 32, bg: '#CFF5E6', fg: '#0A4A3A' }) + tag('TETAP GERAH', 810, 1200, ka(t, W.gerah - 0.1, 43.9, 0.3), { size: 32, bg: '#FFD9D1', fg: '#8A2F22' });
  out.U += u;
}
