// B. PENAMPANG (5,8 - 21,0): diafragma berkontraksi mendadak -> kamera mengikuti jalur udara naik ke laring -> pita suara menutup cepat -> bunyi "hik".
import { f1, clamp, lerp, sm, eo, eio, eob, seg, track, pchip, R, C, T, W, K, chip, tag, callout, op, camG, ka, hikBubble, tw } from './common.js';
import { anatomy, navyBg, larynx, airArrow, soundArcs, miniMap, domeY, LAR } from './anat.js';

// kontraksi diafragma c(t): satu sentakan di 12,38 (cegukan sebenarnya); ulangan singkat di 19,55 hanya terlihat di peta mini
const snap = (t, t0, hold = 0.45, rel = 0.95) => { const d = t - t0; if (d < 0) return 0; if (d < 0.1) return eo(d / 0.1) * 1.06; if (d < 0.18) return lerp(1.06, 1, (d - 0.1) / 0.08); if (d < hold) return 1; return 1 - sm((d - hold) / rel); };
export const cDia = (t) => Math.max(snap(t, 12.38), snap(t, 19.55, 0.3, 0.7));
// celah pita suara g(t): terbuka 24; menutup cepat di 16,18; terbuka lagi 17,85; menutup di 19,70 (tepat "hik" 19,74); terbuka lagi 20,75
export const gCord = (t) => {
  const open = 24, shut = -2;
  const cl = (t0, dur = 0.09) => clamp((t - t0) / dur), op_ = (t0, dur = 0.8) => sm(clamp((t - t0) / dur));
  if (t < 16.12) return open;
  if (t < 17.85) return lerp(open, shut, eo(cl(16.12)));
  if (t < 19.66) return lerp(shut, open, op_(17.85, 0.8));
  if (t < 20.75) return lerp(open, shut, eo(cl(19.66)));
  return lerp(shut, open, op_(20.75, 0.6));
};
const camKeys = (() => {
  const k = [[5.8, 540, 800, Math.log(1.35)], [6.8, 540, 800, Math.log(1.08)], [8.0, 540, 800, Math.log(1.1)], [8.95, 540, 878, Math.log(1.28)], [11.4, 540, 886, Math.log(1.34)], [13.85, 540, 886, Math.log(1.34)],
    [14.75, 540, 500, Math.log(2.2)], [15.62, 540, 216, Math.log(5.2)], [20.2, 540, 216, Math.log(5.45)], [20.95, 540, 700, Math.log(0.9)]];
  const f = pchip(k.map((q) => [q[0], q[1]])), g = pchip(k.map((q) => [q[0], q[2]])), h = pchip(k.map((q) => [q[0], q[3]]));
  return (t) => [f(t), g(t), Math.exp(h(t))];
})();
const oyOf = (t) => lerp(960, 1000, sm(clamp((t - 14.2) / 1.4))) + 0 * t;
export function sceneBody(t, out) {
  const c = cDia(t), g = gCord(t);
  let [cx, cy, z] = camKeys(t), oy = oyOf(t);
  const sh = 6 * Math.max(snap(t, 12.38, 0.2, 0.3) * (t < 12.9 ? 1 : 0), (t > 19.7 && t < 20.1 ? 1 - (t - 19.7) / 0.4 : 0)) * Math.sin(t * 95);
  const glow = sm((t - 8.2) / 0.7) * (t < 14.2 ? 1 : 1 - sm((t - 14.2) / 0.5));
  const dim = sm((t - 8.3) / 0.7) * (t < 14.0 ? 1 : 1 - sm((t - 14.0) / 0.6)) * 0.9;
  const pulse = 0.5 + 0.5 * Math.sin(t * 7);
  const sc = (x, y) => [540 + (x - cx) * z, oy + (y - cy) * z];
  let w = anatomy({ c, g, glow, dim, pulse, uid: 'B', airKeep: 0.9 });
  // panah gerak diafragma (kontraksi mendadak): dua panah turun + garis kecepatan, hanya sekitar sentakan
  const mt = clamp((t - 12.38) / 0.75), ma = (t >= 12.36 && t < 13.3) ? (1 - sm(clamp((t - 12.7) / 0.6))) : 0;
  if (ma > 0.01) {
    const ar = (x, y0) => { const y = y0 + 26 * eo(mt); return `<g opacity="${f1(ma)}"><path d="M${x} ${y - 62}L${x} ${y + 10}" stroke="#fff" stroke-width="22" stroke-linecap="round"/><path d="M${x - 34} ${y - 6}L${x} ${y + 40}L${x + 34} ${y - 6}Z" fill="#fff" stroke="#fff" stroke-width="10" stroke-linejoin="round"/><path d="M${x} ${y - 62}L${x} ${y + 10}" stroke="#B05A00" stroke-width="12" stroke-linecap="round"/><path d="M${x - 28} ${y - 4}L${x} ${y + 32}L${x + 28} ${y - 4}Z" fill="#B05A00" stroke="#B05A00" stroke-width="8" stroke-linejoin="round"/></g>`; };
    w += ar(385, 740) + ar(705, 775) + `<g opacity="${f1(ma * 0.8)}" stroke="#fff" stroke-width="7" stroke-linecap="round"><path d="M300 770L300 806M470 770L470 806M640 800L640 832M770 800L770 832"/></g>`;
  }
  // udara terisap masuk lewat trakea (turun) tepat sesudah sentakan
  const ta = (t - 12.42) / 0.7; if (ta > 0 && ta < 1) w += airArrow(540, lerp(290, 450, eio(ta)), 64, Math.min(1, ta * 6) * (1 - ta * 0.7), 13, true);
  // laring: udara turun lewat celah terbuka lalu terhenti saat pita suara menutup (15,5 - 16,2 dan 18,95 - 19,74)
  const dn = (t0, t1) => { const q = (t - t0) / (t1 - t0); return q > 0 && q < 1 ? q : 0; };
  let q = dn(15.45, 16.17); if (q) w += airArrow(540, lerp(70, 208, eio(q)) - 28, 62, Math.min(1, q * 5) * (q > 0.9 ? 1 - (q - 0.9) * 10 : 1), 11, true);
  q = dn(18.9, 19.72); if (q) w += airArrow(540, lerp(70, 208, eio(q)) - 28, 62, Math.min(1, q * 5) * (q > 0.92 ? 1 - (q - 0.92) * 12 : 1), 11, true);
  w += soundArcs(540, 196, clamp((t - 19.74) / 0.85) * (t >= 19.74 ? 1 : 0));
  out.A += navyBg + camG(w, z, cx, cy + sh * 0, 540 + sh, oy);
  // ------------------------------- teks
  const U = {};
  // 6,6 "Di bawah paru-paru": label paru-paru
  const a1 = ka(t, 6.55, 8.3, 0.3), pl = sc(330, 610);
  out.U += callout('PARU-PARU', 215, 575, pl[0], pl[1], a1, { col: K.lungD, k: sm(clamp((t - 6.55) / 0.4)) });
  // 8,96 diafragma
  const a2 = ka(t, 8.9, 14.0, 0.3), pd = sc(715, 868);
  out.U += callout('DIAFRAGMA', 850, 640, pd[0], pd[1], a2, { col: K.gold, k: sm(clamp((t - 8.9) / 0.35)) });
  out.U += chip('DIAFRAGMA BERKONTRAKSI', t, 11.45, 14.0, { size: 52, bg: K.gold, fg: '#172B38' });
  const pt = sc(540, 960); out.U += tag('tanpa disengaja', 540, 1180, ka(t, 12.85, 14.0, 0.25), { size: 36 });
  // peta mini + urutan (13,9 - 20,8)
  const mm = ka(t, 13.9, 20.75, 0.35);
  if (mm > 0.01) out.U += op(mm, miniMap(22, 430, 226, 450, { c, a1: 1, a2: smoothA(t), p1: 0.5 + 0.5 * Math.sin(t * 8) * (t < 14.6 || (t > 19.4 && t < 19.9) ? 1 : 0), p2: t > 16.1 && t < 16.5 || t > 19.7 && t < 20.1 ? 1 : 0 }));
  // pita suara (15,5 - 20,7)
  out.U += chip('PITA SUARA MENUTUP CEPAT', t, 15.5, 20.75, { size: 54 });
  const closed = g < 10, fp = sc(closed ? 526 : 522, 218), lab = closed ? 'menutup!' : 'terbuka';
  const la = ka(t, 15.75, 20.75, 0.2);
  out.U += callout(lab, 150, 1010, fp[0], fp[1], la, { col: closed ? K.cord : '#5FC79D', bg: closed ? K.cord : '#fff', fg: closed ? '#fff' : K.forest, k: 1 });
  // bunyi hik (narator mengucapkan; tanpa efek suara tambahan)
  const hb = clamp((t - 19.74) / 0.12), hf = ka(t, 19.74, 20.75, 0.12) * (t > 20.4 ? clamp((20.75 - t) / 0.35) : 1);
  out.U += hikBubble(830, 640, (0.6 + 0.45 * eob(hb)) * 1.15, hf, 'HIK!', { size: 86, rot: -8 });
}
const smoothA = (t) => (t < 14.5 ? 0.2 : 1);
