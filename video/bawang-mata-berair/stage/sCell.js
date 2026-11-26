// B. PENAMPANG SEL BAWANG (5,8 - 11,9): pisau memutus sel -> isi sel bertemu (enzim biru + bahan reaksi jingga) -> iritan hijau terbentuk -> naik lewat celah potongan.
// Naik di layar = arah menuju mata Raka (sama dengan peta dapur). Ilustrasi skematis edukatif; jumlah dan gerak komponen disederhanakan.
import { f1, clamp, lerp, sm, eo, eio, eob, track, pchip, R, C, T, K, chip, tag, op, camG, ka, tw, rndf } from './common.js';
import { mol } from './sKitchen.js';
import { navyBg } from './sCellBg.js';

const GX = 60, GY = 600, CW = 320, CH = 270, COLS = 3, ROWS = 2, CUTX = 540;
const cellC = (c, r) => [GX + CW * c + CW / 2, GY + CH * r + CH / 2];
const ENZ = [[-48, -22], [38, -38], [-24, 34], [50, 24]];                 // enzim awalnya di dalam vakuola
const PRE = [[-136, 10], [134, 10], [-74, 100], [72, 100], [-72, -104], [72, -104]];   // bahan reaksi di sitoplasma
const dxOf = (t) => 22 * sm((t - 6.0) / 0.9);
export const knifeY = (t) => t < 5.35 ? 360 : t < 6.55 ? lerp(360, 1090, eio((t - 5.35) / 1.2)) : t < 7.3 ? lerp(1090, 360, sm((t - 6.55) / 0.75)) : 360;
function cellShape(c, r, o = {}) {
  const [cx, cy] = cellC(c, r), burst = o.burst ?? 0, vo = 1 - 0.85 * burst;
  return `<rect x="${cx - CW / 2 + 8}" y="${cy - CH / 2 + 8}" width="${CW - 16}" height="${CH - 16}" rx="30" fill="${K.cyto}"/>`
    + `<ellipse cx="${cx}" cy="${cy + 6}" rx="${f1(98 * (0.4 + 0.6 * vo))}" ry="${f1(82 * (0.4 + 0.6 * vo))}" fill="${K.vac}" stroke="${K.vacD}" stroke-width="5" opacity="${f1(vo)}"/>`;
}
function tissue(burst) {
  let s = `<rect x="${GX}" y="${GY}" width="${CW * COLS}" height="${CH * ROWS}" rx="26" fill="${K.wall}" stroke="${K.wallD}" stroke-width="6"/>`;
  for (let r = 0; r < ROWS; r++) for (let c = 0; c < COLS; c++) s += cellShape(c, r, { burst: c === 1 ? burst : 0 });
  return s;
}
const hexa = (x, y, r, rt = 0) => `<path d="M${f1(x + r * Math.cos(rt))} ${f1(y + r * Math.sin(rt))}` + [1, 2, 3, 4, 5].map((i) => `L${f1(x + r * Math.cos(rt + i * Math.PI / 3))} ${f1(y + r * Math.sin(rt + i * Math.PI / 3))}`).join('') + `Z" fill="${K.pre}" stroke="${K.preD}" stroke-width="3" stroke-linejoin="round"/>`;
const enzy = (x, y, r = 12) => `<circle cx="${f1(x)}" cy="${f1(y)}" r="${r}" fill="${K.enz}" stroke="${K.enzD}" stroke-width="3"/><circle cx="${f1(x - 3)}" cy="${f1(y - 3)}" r="3" fill="#fff" opacity=".7"/>`;
/** komponen di dalam satu sel; cut = sel yang terpotong (pecah dan bereaksi), lainnya utuh */
function dotsOf(t, c, r, cut, idx, side) {
  const [cx, cy] = cellC(c, r); let s = ''; const off = side * dxOf(t) * (cut ? 1 : 0) * 0;
  if (!cut) {
    ENZ.forEach(([a, b], i) => { s += enzy(cx + a + Math.sin(t * 2 + i + c) * 2, cy + b + Math.cos(t * 2.3 + i + r) * 2); });
    PRE.forEach(([a, b], i) => { s += hexa(cx + a + Math.sin(t * 1.7 + i) * 2, cy + b + Math.cos(t * 2.1 + i) * 2, 12, i); });
    return s;
  }
  const t0 = idx * 0.12;
  PRE.forEach(([a, b], i) => {
    const gone = i < 4 && t >= 8.7 + 0.25 * i + t0;     // empat bahan reaksi bereaksi
    if (!gone) s += hexa(cx + a + Math.sin(t * 1.7 + i) * 2, cy + b + Math.cos(t * 2.1 + i) * 2, 12, i);
  });
  ENZ.forEach(([a, b], i) => {
    const rel = 6.78 + 0.07 * i + t0, tm = 8.7 + 0.25 * i + t0, tgt = PRE[i];
    if (t >= tm) return;
    const u = sm((t - rel) / (tm - rel)), x = lerp(cx + a, cx + tgt[0] + 16, u) + (t > rel ? Math.sin(t * 7 + i) * 6 * Math.sin(Math.PI * u) : 0), y = lerp(cy + b, cy + tgt[1] - 4, u) + (t > rel ? Math.cos(t * 6 + i) * 6 * Math.sin(Math.PI * u) : 0);
    s += enzy(x, y);
  });
  // reaksi: kilatan lalu molekul iritan; naik lewat celah mulai "mudah menguap" (10,68)
  for (let i = 0; i < 4; i++) {
    const tm = 8.7 + 0.25 * i + t0, d = t - tm; if (d < 0) continue; const tgt = PRE[i], px = cx + tgt[0], py = cy + tgt[1];
    if (d < 0.35) s += `<circle cx="${f1(px)}" cy="${f1(py)}" r="${f1(8 + 40 * eo(d / 0.35))}" fill="none" stroke="#fff" stroke-width="${f1(7 * (1 - d / 0.35))}" opacity="${f1(1 - d / 0.35)}"/>`;
    const te = 10.62 + 0.1 * i + t0 * 0.6, uu = clamp((t - te) / 1.7);
    let x = px, y = py, sc = eob(clamp(d / 0.5)), a = 1;
    if (t >= te) { x = lerp(px, CUTX + (i % 2 ? 6 : -6), sm(uu / 0.4)); y = lerp(py, 120, eio(uu)); a = clamp((1 - uu) / 0.25); } else { y += Math.sin(t * 3 + i) * 5; x += Math.cos(t * 2.4 + i) * 4; }
    s += mol(x, y, 1.15 * sc, t * 40 + i * 70, a);
  }
  return s;
}
const camKeys = (() => {
  const k = [[5.8, 540, 870, Math.log(0.98)], [6.8, 540, 862, Math.log(1.06)], [8.0, 540, 860, Math.log(1.14)], [10.0, 540, 850, Math.log(1.14)], [10.9, 540, 760, Math.log(1.05)], [11.9, 540, 520, Math.log(0.95)]];
  const f = pchip(k.map((q) => [q[0], q[1]])), g = pchip(k.map((q) => [q[0], q[2]])), h = pchip(k.map((q) => [q[0], q[3]]));
  return (t) => [f(t), g(t), Math.exp(h(t))];
})();
const pill = (txt, x, y, col, size = 32, a = 1) => { const w = tw(txt, size) + 80; return `<g opacity="${f1(a)}"><rect x="${f1(x - w / 2)}" y="${f1(y - size * 0.95)}" width="${f1(w)}" height="${f1(size * 1.9)}" rx="${f1(size * 0.95)}" fill="#fff"/>${col}${T(txt, x + 22, y + size * 0.36, { size, fill: K.forest })}</g>`; };
export function sceneCell(t, out) {
  const burst = sm((t - 6.7) / 0.7), dx = dxOf(t), [cx, cy, z] = camKeys(t);
  let w = navyBg;
  const L = `<clipPath id="cl"><rect x="-500" y="0" width="${CUTX + 500}" height="2000"/></clipPath><clipPath id="cr"><rect x="${CUTX}" y="0" width="1500" height="2000"/></clipPath>`;
  w += `<defs>${L}</defs><g transform="translate(${f1(-dx)} 0)" clip-path="url(#cl)">${tissue(burst)}</g><g transform="translate(${f1(dx)} 0)" clip-path="url(#cr)">${tissue(burst)}</g>`;
  // komponen: sel utuh (4 sel) + dua sel terpotong (tengah)
  let d = '';
  for (let r = 0; r < ROWS; r++) for (let c = 0; c < COLS; c++) { if (c === 1) continue; d += `<g transform="translate(${f1(c === 0 ? -dx : dx)} 0)">${dotsOf(t, c, r, false, 0, 0)}</g>`; }
  d += dotsOf(t, 1, 0, true, 0, 0) + dotsOf(t, 1, 1, true, 1, 0);
  w += d;
  // tetesan cairan vakuola dari tepi potongan
  if (t > 6.7 && t < 8.4) for (let i = 0; i < 6; i++) { const u = clamp((t - 6.75 - i * 0.07) / 0.9); if (u > 0 && u < 1) w += `<circle cx="${f1(CUTX + (i % 2 ? 1 : -1) * (10 + dx + 8 * u))}" cy="${f1(660 + i * 90 + 30 * u)}" r="${f1(7 * (1 - u * 0.5))}" fill="${K.vac}" stroke="${K.vacD}" stroke-width="2" opacity="${f1(1 - u)}"/>`; }
  // pisau: baji baja menembus sel (tampak samping; ujung bergerak turun lalu naik)
  const ky = knifeY(t); if (t > 5.2 && t < 7.4) w += `<path d="M${CUTX - 36} ${f1(ky - 700)}L${CUTX + 36} ${f1(ky - 700)}L${CUTX + 3} ${f1(ky)}L${CUTX - 3} ${f1(ky)}Z" fill="${K.steel}" stroke="${K.steelD}" stroke-width="5" stroke-linejoin="round"/><path d="M${CUTX - 20} ${f1(ky - 700)}L${CUTX - 3} ${f1(ky - 20)}" stroke="#fff" stroke-width="6" stroke-linecap="round" opacity=".75"/>`;
  out.A += camG(w, z, cx, cy, 540, 880);
  // ------------- teks
  out.U += chip('SEL BAWANG PECAH', t, 5.9, 7.85, { size: 60 });
  out.U += chip('ISI SEL BERTEMU', t, 7.9, 9.7, { size: 60 });
  out.U += chip('SENYAWA IRITAN', t, 9.75, 11.85, { size: 64, bg: K.irr, fg: '#143300' });
  const sub = ka(t, 9.95, 11.7, 0.3); if (sub > 0.01) out.U += `<g opacity="${f1(sub)}"><rect x="190" y="375" width="700" height="62" rx="31" fill="rgba(255,255,255,.94)"/>${T('syn-propanethial S-oxide', 540, 416, { size: 36, fill: K.forest, w: 700 })}</g>`;
  // legenda warna komponen (di atas takarir)
  const lg = (txt, x, dot, a) => pill(txt, x, 1262, dot, 32, a);
  out.U += lg('ENZIM', 215, `<circle cx="${215 - tw('ENZIM', 32) / 2 - 8}" cy="1262" r="13" fill="${K.enz}" stroke="${K.enzD}" stroke-width="3"/>`, ka(t, 6.1, 11.4, 0.3))
    + lg('BAHAN REAKSI', 560, `<circle cx="${560 - tw('BAHAN REAKSI', 32) / 2 - 8}" cy="1262" r="13" fill="${K.pre}" stroke="${K.preD}" stroke-width="3"/>`, ka(t, 6.1, 11.4, 0.3))
    + lg('IRITAN', 905, `<circle cx="${905 - tw('IRITAN', 32) / 2 - 8}" cy="1262" r="13" fill="${K.irr}" stroke="${K.irrD}" stroke-width="3"/>`, ka(t, 9.2, 11.4, 0.3));
  const up = ka(t, 10.7, 11.85, 0.25); if (up > 0.01) out.U += tag('mudah menguap', 810, 520, up, { size: 40, bg: K.irrHi, fg: '#143300' });
}
