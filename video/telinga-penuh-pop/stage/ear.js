// Penampang telinga 2D (ilustrasi edukatif). Orientasi TETAP: kiri = luar (liang telinga), gendang di x = 0, telinga tengah di kanan gendang, tuba Eustachius turun ke kanan-bawah menuju belakang hidung.
// Warna: tekanan/udara LUAR = jingga, tekanan/udara TELINGA TENGAH = biru. Tekanan digambarkan lewat kerapatan titik udara dan panjang panah.
import { f1, clamp, lerp, sm, eo, eio, seg, rndf, pathPt, pathLen, mixc } from './common.js';
export const EK = { tissue: '#EBBCA2', tissueD: '#C98A6C', bone: '#F3DCC2', air: '#F7EEF4', out: '#FF8A3D', outD: '#C25A14', mid: '#26A8EA', midD: '#0F6FA8', drum: '#F29A9A', drumD: '#B85A5A', wall: '#DE9393', swell: '#E65E5E', ossi: '#FFF4DC', ossiD: '#B9985E', ink: '#172B38', bg: '#1E2B55' };
export const TUBE_D = 'M170 190C205 330 300 440 385 560';
const LT = pathLen(TUBE_D);
const CAV = 'M0 -130C60 -190 250 -195 330 -130C390 -70 390 70 330 130C270 200 100 210 20 160L0 130Z';
const cavPos = Array.from({ length: 44 }, (_, i) => { const a = rndf(i + 21) * 6.283, r = Math.sqrt(rndf(i + 5)); return [185 + 128 * r * Math.cos(a) * 0.95, 8 + 100 * r * Math.sin(a)]; });
const canPos = Array.from({ length: 34 }, (_, i) => [-680 + (i % 9) * 70 + 20 * rndf(i + 3), -38 + Math.floor(i / 9) * 26 + 6 * rndf(i + 9) - (i % 2) * 4]);
const nasPos = Array.from({ length: 16 }, (_, i) => { const a = rndf(i + 61) * 6.283, r = Math.sqrt(rndf(i + 41)); return [430 + 105 * r * Math.cos(a), 650 + 56 * r * Math.sin(a)]; });
const dot = (x, y, r, col, colD, o = 1) => `<circle cx="${f1(x)}" cy="${f1(y)}" r="${r}" fill="${col}" stroke="${colD}" stroke-width="2.5" opacity="${f1(clamp(o) * 100) / 100}"/>`;
export const arrowR = (x, y, L, col, colD, o = 1, w = 14, dir = 1) => { const ex = x + dir * L, hw = w * 1.3; return `<g opacity="${f1(clamp(o) * 100) / 100}"><path d="M${f1(x)} ${f1(y)}L${f1(ex - dir * hw)} ${f1(y)}" stroke="${colD}" stroke-width="${w + 7}" stroke-linecap="round"/><path d="M${f1(ex + dir * 6)} ${f1(y)}L${f1(ex - dir * hw)} ${f1(y - hw)}L${f1(ex - dir * hw)} ${f1(y + hw)}Z" fill="${colD}" stroke="${colD}" stroke-width="7" stroke-linejoin="round"/><path d="M${f1(x)} ${f1(y)}L${f1(ex - dir * hw)} ${f1(y)}" stroke="${col}" stroke-width="${w}" stroke-linecap="round"/><path d="M${f1(ex + dir * 6)} ${f1(y)}L${f1(ex - dir * hw)} ${f1(y - hw)}L${f1(ex - dir * hw)} ${f1(y + hw)}Z" fill="${col}"/></g>`; };
// jadwal kedatangan partikel udara lewat tuba: arr = daftar waktu tiba di telinga tengah
export const arrivals = (t0, n, gap) => Array.from({ length: n }, (_, k) => t0 + gap * k);
/** st = { t, nOut (10..30), arr (waktu tiba), nMidBase, open (0..1), swell (0..1), pop (waktu pop atau null) } */
export function earState(t, st) {
  const arrived = (st.arr || []).filter((a) => t >= a).length, nMid = (st.nMidBase ?? 10) + arrived;
  const delta = clamp((st.nOut - nMid) / 20), drumD = 54 * sm(delta);
  return { nOut: st.nOut, nMid, delta, drumD };
}
export function earWorld(t, st, o = {}) {
  const S = earState(t, st), d = S.drumD, lumen = 7 + 34 * (st.open || 0) * (1 - 0.7 * (st.swell || 0)), wallW = lumen + 32 + 50 * (st.swell || 0);
  let w = `<rect x="-1600" y="-900" width="3200" height="2400" fill="${EK.tissue}"/>`;
  for (let i = 0; i < 26; i++) w += `<circle cx="${f1(-560 + rndf(i) * 1100)}" cy="${f1(-240 + rndf(i + 30) * 1100)}" r="${f1(10 + rndf(i + 4) * 18)}" fill="#E3AE92" opacity=".6"/>`;
  // bagian dalam tulang temporal (latar telinga dalam) di sekitar telinga tengah
  w += `<path d="M-30 -230C150 -300 440 -280 600 -120C660 -40 650 160 580 260C470 400 250 330 120 290C30 262 -30 230 -30 130Z" fill="${EK.bone}" opacity=".9"/>`;
  // liang telinga, tuba, nasofaring, telinga tengah (ruang udara)
  w += `<path d="M-1000 -58L0 -58L0 58L-1000 58Z" fill="${EK.air}" stroke="${EK.tissueD}" stroke-width="8"/>`;
  w += `<ellipse cx="430" cy="650" rx="150" ry="100" fill="${EK.air}" stroke="${EK.tissueD}" stroke-width="8"/><path d="M405 740L405 1000" stroke="${EK.tissueD}" stroke-width="104" stroke-linecap="round"/><path d="M405 740L405 1000" stroke="${EK.air}" stroke-width="88" stroke-linecap="round"/>`;
  w += `<path d="${CAV}" fill="${EK.air}" stroke="${EK.tissueD}" stroke-width="8" stroke-linejoin="round"/>`;
  // tuba Eustachius: dinding + lumen (menyempit/membengkak saat pilek)
  w += `<path d="${TUBE_D}" fill="none" stroke="${mixc(EK.wall, EK.swell, st.swell || 0)}" stroke-width="${f1(wallW + 10)}" stroke-linecap="round"/><path d="${TUBE_D}" fill="none" stroke="${mixc('#F1B3B3', '#F08C8C', st.swell || 0)}" stroke-width="${f1(wallW)}" stroke-linecap="round"/><path d="${TUBE_D}" fill="none" stroke="${EK.air}" stroke-width="${f1(lumen)}" stroke-linecap="round"/>`;
  // koklea + tulang pendengaran
  let sp = ''; for (let i = 0; i <= 60; i++) { const a = i / 60 * 6.283 * 2.4, r = 74 - 56 * i / 60; sp += `${i ? 'L' : 'M'}${f1(455 + r * Math.cos(a))} ${f1(8 + r * Math.sin(a))}`; }
  w += `<path d="${sp}" fill="none" stroke="#9BA9D9" stroke-width="34" stroke-linecap="round" stroke-linejoin="round"/><path d="${sp}" fill="none" stroke="#C9D2F2" stroke-width="22" stroke-linecap="round" stroke-linejoin="round"/>`;
  w += `<path d="M24 -18L98 -92" stroke="${EK.ossiD}" stroke-width="26" stroke-linecap="round"/><path d="M24 -18L98 -92" stroke="${EK.ossi}" stroke-width="16" stroke-linecap="round"/><circle cx="112" cy="-98" r="26" fill="${EK.ossi}" stroke="${EK.ossiD}" stroke-width="6"/><circle cx="158" cy="-82" r="22" fill="${EK.ossi}" stroke="${EK.ossiD}" stroke-width="6"/><path d="M168 -66L214 -10L330 -20" fill="none" stroke="${EK.ossiD}" stroke-width="20" stroke-linecap="round" stroke-linejoin="round"/><path d="M168 -66L214 -10L330 -20" fill="none" stroke="${EK.ossi}" stroke-width="11" stroke-linecap="round" stroke-linejoin="round"/>`;
  // partikel udara: luar (liang telinga) jingga, telinga tengah biru, nasofaring jingga
  const kOut = Math.round(S.nOut), kMid = Math.round(S.nMid);
  for (let i = 0; i < kOut && i < canPos.length; i++) { const [x, y] = canPos[i], a = clamp(((i < 10 ? 99 : (S.nOut - i) + 0.6)) * 1); w += dot(x + 13 * Math.sin(t * 2.3 + i * 2.1) + 6 * Math.sin(t * 5 + i), y + 9 * Math.cos(t * 2.9 + i * 1.7), 10, EK.out, EK.outD, a); }
  for (let i = 0; i < kMid && i < cavPos.length; i++) { const [x, y] = cavPos[i]; w += dot(x + 11 * Math.sin(t * 2.1 + i * 1.9), y + 9 * Math.cos(t * 2.6 + i * 1.3), 9, EK.mid, EK.midD, 1); }
  for (let i = 0; i < nasPos.length; i++) { const [x, y] = nasPos[i]; w += dot(x + 12 * Math.sin(t * 1.9 + i * 2.3), y + 8 * Math.cos(t * 2.4 + i * 1.1), 9, EK.out, EK.outD, 1); }
  // partikel yang lewat tuba (jingga -> biru) menuju telinga tengah
  for (const a of st.arr || []) { const u = (t - (a - 1.5)) / 1.5; if (u <= 0 || u >= 1) continue; const q = pathPt(TUBE_D, 1 - eio(u)); w += dot(q.x + 4 * Math.sin(t * 9 + a), q.y, 9, mixc(EK.out, EK.mid, eio(u)), mixc(EK.outD, EK.midD, eio(u)), 1); }
  // gendang telinga (membran) mengembung ke arah telinga tengah (kanan) saat tekanan luar > tengah
  const dd = `M0 -128Q${f1(d * 2)} 0 0 128`;
  w += `<path d="${dd}" fill="none" stroke="${EK.drumD}" stroke-width="26" stroke-linecap="round"/><path d="${dd}" fill="none" stroke="${EK.drum}" stroke-width="15" stroke-linecap="round"/>`;
  // panah tekanan di kedua sisi gendang
  const pl = 1 + 0.1 * Math.sin(t * 5), Lo = (30 + 70 * (S.nOut / 30)) * pl, Lm = (30 + 70 * (S.nMid / 30)) * (1 + 0.1 * Math.sin(t * 5 + 2));
  if (!o.noArrows) w += arrowR(-30 - Lo - 20, -22, Lo, EK.out, EK.outD, 0.95, 15, 1) + arrowR(34 + Lm + 22, 22, Lm, EK.mid, EK.midD, 0.95, 15, -1);
  return { svg: w, S };
}
// alat ukur tekanan (dua batang): luar (jingga) dan telinga tengah (biru)
export function gauges(x, y, H, S, a = 1) {
  const bar = (bx, v, col, colD, lab) => `<rect x="${bx - 26}" y="${y}" width="52" height="${H}" rx="26" fill="rgba(255,255,255,.9)"/><rect x="${bx - 20}" y="${f1(y + H - 6 - (H - 12) * v)}" width="40" height="${f1((H - 12) * v)}" rx="20" fill="${col}" stroke="${colD}" stroke-width="3"/>`;
  return `<g opacity="${a}">${bar(x, S.nOut / 30, EK.out, EK.outD)}${bar(x + 86, S.nMid / 30, EK.mid, EK.midD)}</g>`;
}
