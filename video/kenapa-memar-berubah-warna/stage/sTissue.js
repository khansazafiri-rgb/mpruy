// B. PENAMPANG KULIT (5,5 - 24,1): kamera masuk ke titik benturan (zoom ke bercak) -> permukaan kulit di atas, jaringan di bawah -> benturan -> pembuluh kecil cedera -> darah merembes (kulit utuh)
// -> darah terperangkap + tampak luar (kartu) di lokasi yang sama -> sel pembersih menguraikan hemoglobin -> pigmen dan warna permukaan berubah bertahap.
import { f1, clamp, lerp, sm, eo, eio, K, chip, tag, callout, op, camG, pchip, ka, T, mixc } from './common.js';
import { TS, layers, vessels, flowing, leaked, poolWash, macrophages, pigments, wedge, surfaceCard, linkLine, CARD, leakFinal, MAC } from './tissue.js';
import { bruiseAt } from './bruise.js';

export const camT = (() => {
  const k = [[5.5, 540, 1000, Math.log(1.45)], [11.8, 540, 1000, Math.log(1.45)], [12.9, 540, 960, 0], [14.7, 540, 960, 0], [15.4, 545, 1010, Math.log(2.0)], [16.9, 545, 1010, Math.log(2.0)], [17.9, 540, 960, 0], [24.2, 540, 960, 0]];
  const f = pchip(k.map((q) => [q[0], q[1]])), g = pchip(k.map((q) => [q[0], q[2]])), h = pchip(k.map((q) => [q[0], q[3]]));
  return (t) => [f(t), g(t), Math.exp(h(t))];
})();
const AIR = '#F2EFE6';
export function timelineBar(t, a) {
  if (a <= 0.01) return ''; const x0 = 170, x1 = 910, y = 372, p = clamp((t - 17.7) / (24.1 - 17.7)), stops = [[0.12, '#B4547A'], [0.40, K.green], [0.62, K.yellow], [0.86, '#EFD79A']];
  let s = `<g opacity="${f1(a)}"><rect x="${x0 - 14}" y="${y - 18}" width="${x1 - x0 + 28}" height="36" rx="18" fill="rgba(255,255,255,.92)"/><rect x="${x0}" y="${y - 5}" width="${x1 - x0}" height="10" rx="5" fill="#D9D2BD"/><rect x="${x0}" y="${y - 5}" width="${f1((x1 - x0) * p)}" height="10" rx="5" fill="${K.forest}" opacity=".35"/>`;
  for (const [u, c] of stops) s += `<circle cx="${f1(lerp(x0, x1, u))}" cy="${y}" r="${f1(11 + (p > u - 0.04 && p < u + 0.14 ? 4 : 0))}" fill="${c}" stroke="#fff" stroke-width="3"/>`;
  s += `<circle cx="${f1(lerp(x0, x1, p))}" cy="${y}" r="9" fill="#fff" stroke="${K.forest}" stroke-width="4"/></g>`;
  return s;
}
export function sceneTissue(t, out) {
  const [cx, cy, z] = camT(t), sc = (x, y) => [540 + (x - cx) * z, 960 + (y - cy) * z];
  const cardA = sm((t - 12.3) / 0.7) * (1 - sm((t - 14.8) / 0.5) * (1 - sm((t - 17.2) / 0.6))) * 1;
  let w = `<rect x="-3000" y="-3000" width="8000" height="8000" fill="${AIR}"/>` + layers(t) + poolWash(t) + vessels(t) + flowing(t) + leaked(t) + macrophages(t) + pigments(t) + wedge(t);
  // kulit tetap utuh: sorot permukaan
  const ig = ka(t, 10.95, 12.2, 0.2); if (ig > 0.01) w += `<path d="M-200 ${TS.ys}L1300 ${TS.ys}" stroke="#fff" stroke-width="${f1(14 + 5 * Math.sin(t * 8))}" stroke-linecap="round" opacity="${f1(0.85 * ig)}"/><path d="M-200 ${TS.ys}L1300 ${TS.ys}" stroke="#2F9E6E" stroke-width="5" opacity="${f1(ig)}"/>`;
  w += linkLine(cardA) + surfaceCard(t, cardA);
  out.A += camG(w, z, cx, cy, 540, 960);
  // ---------------- teks
  const A = (a, b, f = 0.25) => ka(t, a, b, f);
  const v = sc(300, TS.vy + TS.vh + 4), sk = sc(250, TS.ys + 12), rc = (() => { const [x, y] = leakFinal(6); return sc(x, y); })();
  out.U += callout('PEMBULUH DARAH KECIL', 300, 1245, v[0], v[1], A(7.1, 8.6), { size: 40, col: '#F8C9CF', k: sm((t - 7.1) / 0.35) });
  out.U += callout('KULIT', 150, 520, sk[0], sk[1], A(8.0, 8.9), { size: 42, col: K.epiD, k: sm((t - 8.0) / 0.3) });
  out.U += chip(['DARAH MEREMBES', 'DI BAWAH KULIT'], t, 8.9, 12.25, { size: 62 });
  out.U += callout('SEL DARAH MERAH', 800, 1245, rc[0], rc[1], A(9.5, 10.9), { size: 40, col: K.rbc, k: sm((t - 9.5) / 0.35) });
  out.U += tag('KULIT UTUH', 540, 1235, A(10.95, 12.2), { size: 52, bg: '#2F9E6E', fg: '#fff' });
  out.U += chip(['DARAH TERPERANGKAP'], t, 12.9, 15.1, { size: 56 });
  const tl = sm((t - 12.7) / 0.5) * (1 - sm((t - 14.8) / 0.4)); if (tl > 0.01) out.U += tag('TAMPAK LUAR', 270, 432, tl, { size: 32 }) + tag('POTONGAN KULIT', 300, 812, tl, { size: 32 });
  const mp = MAC(0, 14.2), mm = sc(mp.x, mp.y - 44); out.U += callout('SEL PEMBERSIH', 170, 1010, mm[0], mm[1], A(13.8, 15.0), { size: 36, col: K.mac, k: sm((t - 13.8) / 0.35) });
  out.U += chip(['HEMOGLOBIN DIURAIKAN'], t, 15.15, 17.5, { size: 56, bg: '#fff', fg: K.forest });
  out.U += chip(['WARNA BERUBAH BERTAHAP'], t, 17.75, 24.1, { size: 48 });
  out.U += timelineBar(t, A(17.8, 24.0, 0.3));
}
