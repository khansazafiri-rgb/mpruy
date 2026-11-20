// Model fisik sederhana (ILUSTRATIF) termometer klinis merkuri; satu sumber kebenaran untuk gambar luar, penampang, label, dan audio.
// Geometri (koordinat penampang, satuan piksel pada zoom 1): wadah (bulb) di KIRI, saluran sempit ke KANAN, penyempitan tepat di sisi kanan wadah,
// skala di sisi ATAS saluran, kolom perak naik ke KANAN. Orientasi ini sama pada tampilan luar dan penampang.
import { clamp, lerp, sm, eio } from './lib.js';
import { A } from './timeline.js';
export const G = { bx: 170, by: 900, brx: 85, bry: 48, y: 900, neckX: 285, capX0: 300, capX1: 990, tubeX0: 248, tubeX1: 1012, tubeH: 90, tHold: 37.6, tRest: 33 };
export const xOfT = (T) => 300 + 75 * (T - 33);          // posisi ujung kolom (px) untuk suhu wadah T (derajat C); 35 -> 450, 37,6 -> 645, 42 -> 975
export const TIP_HOLD = xOfT(G.tHold);
// keadaan simulasi pada waktu narasi tn:
//   Tb  = suhu wadah (C); tip = posisi ujung kolom (px); gap = panjang celah putus di penyempitan (px); zone = kontak tubuh 0..1; mode = 'hold' | 'rest' | 'heat' | 'cool' | 'reset'
export function sim(tn) {
  const a = A;
  // hook: sudah dilepas -> kolom TERTAHAN pada tHold, wadah mendingin
  if (tn < a.pertama) {
    const cool = sm((tn - 0.6) / 10);
    const Tb = lerp(G.tHold, 31.5, cool);
    return { mode: 'hold', Tb, tip: TIP_HOLD, gap: gapFor(Tb), zone: 1 - sm((tn - 0.2) / 1.3) };
  }
  // penjelasan struktur: termometer BELUM DIPAKAI (dari awal)
  if (tn < a.panas - 0.4) return { mode: 'rest', Tb: G.tRest, tip: G.capX0, gap: 0, zone: 0 };
  // dipanaskan tubuh: kontak -> Tb naik -> kolom naik
  const tHeat0 = a.panas - 0.4, tHeat1 = a.semakinTinggi - 0.5;
  if (tn < a.dilepas) {
    const zone = sm((tn - tHeat0) / 1.0);
    const Tb = G.tRest + (G.tHold - G.tRest) * sm((tn - (a.panas + 0.3)) / (tHeat1 - (a.panas + 0.3)));
    return { mode: 'heat', Tb, tip: Math.max(G.capX0, xOfT(Tb)), gap: 0, zone, T: Tb };
  }
  // dilepas: tubuh menjauh, wadah dingin, kolom putus di penyempitan dan TERTAHAN
  if (tn < a.diatur) {
    const k = (tn - a.dilepas);
    const zone = 1 - sm(k / 0.9);
    const Tb = lerp(G.tHold, 31.0, sm(k / (a.membaca - a.dilepas + 1.5)));
    return { mode: 'cool', Tb, tip: TIP_HOLD, gap: gapFor(Tb), zone };
  }
  // diatur ulang: kolom kembali ke wadah (ilustrasi alat historis)
  const r = clamp((tn - a.diatur) / 3.2);
  const gap0 = gapFor(31.0), rr = eio(r);
  return { mode: 'reset', Tb: lerp(31.0, G.tRest, sm(r)), tip: lerp(TIP_HOLD, G.capX0, rr), gap: gap0 * (1 - sm(clamp(r * 1.6 - 0.45))), zone: 0, r };
}
export function gapFor(Tb) { return clamp((G.tHold - Tb - 0.25) / 5, 0, 1) * 58; }
