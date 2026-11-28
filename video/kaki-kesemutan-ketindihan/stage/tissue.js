// PENAMPANG (potongan memanjang betis di titik tekanan; satu skala dan satu sudut di SEMUA keadaan): kulit di atas, lemak, otot; saraf (kuning) dan pembuluh darah kecil (merah) berjalan sejajar,
// terpisah. Sinyal saraf = pulsa teal yang SELALU bergerak ke KIRI (dari kaki menuju otak); darah = sel merah di pembuluh (bergerak ke kanan, arah kaki). Koordinat layar (tanpa kamera).
import { f1, clamp, lerp, sm, eo, K, T, tw, op, callout, tag, rndf, pathPt } from './common.js';
export const Y = { skin: 560, skinB: 606, fatB: 700, nerve: 800, vess: 1020 }, ZX = 540;
// ---- keadaan yang berubah (satu sumber): p = tekanan, pf = aliran darah, pn = fungsi saraf
export const press = (t) => sm((t - 15.7) / 1.7) * (1 - sm((t - 28.55) / 2.05));
export const pf = (t) => press(t - 0.8 * (t > 22 ? 1 : 0.5));
export const pn = (t) => press(t - (t > 22 ? 1.4 : 1.0));
const gauss = (x, w = 230) => Math.exp(-(((x - ZX) / w) ** 2));
export const dent = (x, p) => p * 74 * gauss(x);
const flowOf = (t) => 1 - 0.62 * pf(t);
// integral aliran darah (posisi sel darah), tabel 1/60 dtk
const FT = new Float32Array(60 * 56 + 2); { let a = 0; for (let i = 0; i < FT.length; i++) { FT[i] = a; a += 150 * flowOf(i / 60) / 60; } }
const bloodPos = (t) => FT[Math.min(FT.length - 2, Math.floor(clamp(t, 0, 55) * 60))];
// ---- pulsa saraf
const NERVE = `M1000 612L1000 ${Y.nerve}L20 ${Y.nerve}`, V = 600, LEN = 178 + 980, TRAV = LEN / V;
export const EM = (() => {
  const L = []; let t = 7.35, i = 0;
  while (t < 41.4) {
    let a = 1, j = 0, dt = 0.95;
    if (t > 31.2 && t < 38.2) { const u = (38.2 - t) / 7; j = clamp(u * 1.2); dt = 0.2 + rndf(i * 3 + 1) * 0.7 * (0.35 + 0.65 * (1 - u)); a = 0.55 + rndf(i * 5 + 2) * 0.75; }
    else if (t >= 38.2) { j = clamp((40.6 - t) / 2.4) * 0.3; dt = 0.95; }
    L.push({ t, a, j, i }); t += dt; i++;
  }
  return L;
})();
// ---- bentuk berlapis
const xs = []; for (let x = -20; x <= 1100; x += 20) xs.push(x);
const poly = (top, bot) => `M${xs.map((x) => `${f1(x)} ${f1(top(x))}`).join('L')}L${[...xs].reverse().map((x) => `${f1(x)} ${f1(bot(x))}`).join('L')}Z`;
function star(x, y, r, col, a) { return `<path d="M${f1(x)} ${f1(y - r)}L${f1(x + r * 0.28)} ${f1(y - r * 0.28)}L${f1(x + r)} ${f1(y)}L${f1(x + r * 0.28)} ${f1(y + r * 0.28)}L${f1(x)} ${f1(y + r)}L${f1(x - r * 0.28)} ${f1(y + r * 0.28)}L${f1(x - r)} ${f1(y)}L${f1(x - r * 0.28)} ${f1(y - r * 0.28)}Z" fill="${col}" opacity="${f1(a * 100) / 100}"/>`; }
/** gambar penampang pada waktu t (p/pf/pn boleh dipaksa lewat o untuk kartu pembanding) */
export function sectionSvg(t, o = {}) {
  const p = o.p ?? press(t), pff = o.pf ?? pf(t), pnn = o.pn ?? pn(t), d = (x) => dent(x, p);
  let s = '';
  // jaringan
  s += `<rect x="-20" y="${Y.skinB}" width="1140" height="760" fill="${K.muscle}"/>`;
  for (let i = 0; i < 9; i++) { const y0 = 740 + i * 62; s += `<path d="M${xs.map((x) => `${f1(x)} ${f1(y0 + d(x) * (0.55 * Math.exp(-i * 0.25)) + 6 * Math.sin(x / 90 + i))}`).join('L')}" fill="none" stroke="${K.muscleD}" stroke-width="5" opacity=".35"/>`; }
  s += `<path d="${poly((x) => Y.skinB + d(x) * 0.92, (x) => Y.fatB + d(x) * 0.8)}" fill="${K.fat}"/><path d="M${xs.map((x) => `${f1(x)} ${f1(Y.fatB + d(x) * 0.8)}`).join('L')}" fill="none" stroke="${K.fatD}" stroke-width="5"/>`;
  s += `<path d="${poly((x) => Y.skin + d(x), (x) => Y.skinB + d(x) * 0.92)}" fill="${K.skin}"/><path d="M${xs.map((x) => `${f1(x)} ${f1(Y.skin + d(x))}`).join('L')}" fill="none" stroke="${K.skinD}" stroke-width="7" stroke-linejoin="round"/>`;
  // pembuluh darah (merah)
  const vy = (x) => Y.vess + d(x) * 0.18, vr = (x) => 44 * (1 - 0.4 * pff * gauss(x, 210));
  s += `<path d="${poly((x) => vy(x) - vr(x) - 8, (x) => vy(x) + vr(x) + 8)}" fill="${K.vess}" stroke="${K.vessD}" stroke-width="5"/><path d="${poly((x) => vy(x) - vr(x), (x) => vy(x) + vr(x))}" fill="${K.lumen}"/>`;
  const off = bloodPos(o.tb ?? t), sp = 92;
  for (let i = -1; i < 14; i++) { const x = ((i * sp + off) % (sp * 12)); const xx = x - sp; const r = vr(xx), ry = Math.min(17, r - 6); if (xx < -30 || xx > 1110) continue; s += `<ellipse cx="${f1(xx)}" cy="${f1(vy(xx) + 4 * Math.sin(i * 2.1))}" rx="25" ry="${f1(Math.max(7, ry + 2))}" fill="${K.blood}" stroke="${K.bloodD}" stroke-width="3"/><ellipse cx="${f1(xx)}" cy="${f1(vy(xx) + 4 * Math.sin(i * 2.1))}" rx="8" ry="${f1(Math.max(2.5, ry * 0.4))}" fill="${K.bloodD}" opacity=".5"/>`; }
  // saraf (kuning gading): warna redup bila suplai/fungsi turun
  const ny = (x) => Y.nerve + d(x) * 0.45, nh = (x) => 31 * (1 - 0.22 * p * gauss(x, 200)), dull = clamp(pnn * 0.72);
  const nc = mixHex(K.nerve, K.nerveDull, dull), ncd = mixHex(K.nerveD, K.nerveDullD, dull);
  s += `<path d="${poly((x) => ny(x) - nh(x) - 6, (x) => ny(x) + nh(x) + 6)}" fill="${ncd}"/><path d="${poly((x) => ny(x) - nh(x), (x) => ny(x) + nh(x))}" fill="${nc}"/><path d="M${xs.map((x) => `${f1(x)} ${f1(ny(x) - nh(x) * 0.45)}`).join('L')}" fill="none" stroke="#fff" stroke-width="5" stroke-linecap="round" opacity="${f1(0.5 * (1 - dull))}"/>`;
  // serat dari kulit ke saraf (ujung sentuhan)
  s += `<path d="M1000 ${Y.skin + 34}L1000 ${Y.nerve - 30}" stroke="${ncd}" stroke-width="12" stroke-linecap="round"/><path d="M1000 ${Y.skin + 34}L1000 ${Y.nerve - 30}" stroke="${nc}" stroke-width="6" stroke-linecap="round"/>`;
  // suplai dari pembuluh ke saraf (panah merah putus-putus halus)
  for (const sx of [230, 540, 850]) { const a = clamp(1 - 0.85 * pff); s += `<path d="M${sx} ${f1(vy(sx) - vr(sx) - 14)}L${sx} ${f1(ny(sx) + nh(sx) + 14)}" stroke="${K.blood}" stroke-width="6" stroke-dasharray="4 14" stroke-linecap="round" opacity="${f1(0.55 * a)}"/>`; }
  return s;
}
const hx = (c) => [1, 3, 5].map((i) => parseInt(c.slice(i, i + 2), 16));
function mixHex(a, b, t) { const A = hx(a), B = hx(b); return '#' + A.map((v, i) => Math.round(lerp(v, B[i], clamp(t))).toString(16).padStart(2, '0')).join(''); }
// ---- pulsa sinyal (teal) di atas saraf
export function pulsesSvg(t, o = {}) {
  const pnn = o.pn ?? pn;
  let s = '';
  for (const e of EM) {
    const age = t - e.t; if (age < 0 || age > TRAV + 0.1) continue;
    const dist = age * V; let x, y;
    if (dist < 178) { x = 1000; y = lerp(612, Y.nerve, dist / 178); } else { x = 1000 - (dist - 178); y = Y.nerve; }
    if (x < 10) continue;
    const tz = e.t + (178 + (1000 - ZX)) / V, g = 1 - 0.88 * (typeof pnn === 'function' ? pnn(tz) : pnn), pass = clamp((700 - x) / 240), gain = lerp(1, g, sm(pass));
    const jit = e.j * 14 * Math.sin(age * 23 + e.i * 1.7), amp = e.a * gain;
    if (amp < 0.07) continue;
    const dy = x < 1000 ? jit * (0.5 + 0.5 * Math.sin(age * 9 + e.i)) : 0, fl = (e.j > 0.02 ? 0.55 + 0.45 * Math.sin(age * 31 + e.i * 2) : 1) * (gain < 0.6 ? 0.65 + 0.35 * Math.sin(age * 19) : 1);
    const L = x < 1000 ? 96 : 30, r = 22 * Math.min(1.25, 0.45 + amp * 0.65);
    const vert = x >= 1000 && y < Y.nerve - 4;
    s += `<g opacity="${f1(clamp(amp * fl) * 100) / 100}">`
      + (vert ? `<rect x="${f1(x - r)}" y="${f1(y - L / 2)}" width="${f1(2 * r)}" height="${L}" rx="${f1(r)}" fill="${K.sig}" opacity=".35"/><rect x="${f1(x - r * 0.62)}" y="${f1(y - L / 2 + 4)}" width="${f1(r * 1.24)}" height="${L - 8}" rx="${f1(r * 0.6)}" fill="${K.sig}" stroke="#fff" stroke-width="3"/>`
        : `<rect x="${f1(x - L / 2 - 8)}" y="${f1(y + dy - r * 1.35)}" width="${f1(L + 16)}" height="${f1(r * 2.7)}" rx="${f1(r * 1.35)}" fill="${K.sig}" opacity=".32"/><rect x="${f1(x - L / 2)}" y="${f1(y + dy - r * 0.82)}" width="${L}" height="${f1(r * 1.64)}" rx="${f1(r * 0.82)}" fill="${K.sig}" stroke="${K.sigD}" stroke-width="4"/><path d="M${f1(x - L * 0.2)} ${f1(y + dy)}h${f1(L * 0.4)}" stroke="#fff" stroke-width="3.5" stroke-linecap="round" opacity=".85"/>`)
      + `</g>`;
  }
  return s;
}
/** percikan "kesemutan": kilau amber kecil dan tidak teratur di sekitar saraf (bukan makhluk yang berjalan) */
export function touchSvg(t) {
  let s = `<circle cx="1000" cy="${Y.skin + 2}" r="9" fill="${K.sig}" stroke="#fff" stroke-width="3"/>`;
  for (const e of EM) { const a = t - e.t; if (a < 0 || a > 0.5) continue; const u = a / 0.5; s += `<circle cx="1000" cy="${Y.skin + 2}" r="${f1(14 + 40 * u)}" fill="none" stroke="${K.sig}" stroke-width="${f1(6 * (1 - u))}" opacity="${f1(1 - u)}"/>`; }
  return s;
}
export function sparksSvg(t) {
  const env = clamp((t - 32.3) / 1.0) * clamp((40.4 - t) / 2.2) * (t > 38.2 ? 0.55 : 1); if (env <= 0.01) return '';
  let s = '';
  for (let i = 0; i < 16; i++) {
    const per = 0.45 + rndf(i * 7) * 0.5, ph = rndf(i * 11 + 3) * 10, u = ((t * 0.9 + ph) / per) % 1, on = Math.sin(Math.PI * u) ** 2;
    const bx = 120 + rndf(i * 13 + 5) * 860 + 40 * Math.sin(t * 0.7 + i) * 0, by = Y.nerve + (rndf(i * 17 + 9) - 0.5) * 120 + (i % 5 === 0 ? -60 : 0);
    const seed = Math.floor((t * 0.9 + ph) / per), bx2 = 120 + rndf(i * 13 + seed * 7) * 860, by2 = Y.nerve + (rndf(i * 17 + seed * 3) - 0.5) * 130;
    s += star(bx2, by2, 9 + 11 * rndf(i + seed), K.spark, on * env);
  }
  return s;
}
