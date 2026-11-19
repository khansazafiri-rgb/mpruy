// Model sinyal sederhana (ILUSTRATIF) dipakai bersama oleh semua adegan agar denyut, grafik, berkas cahaya, dan angka selalu konsisten.
// Hukum Beer-Lambert: cahaya yang tiba di sensor turun bila darah arteri yang dilalui lebih tebal (tiap denyut). Koefisien serap relatif (satuan bebas):
//   Hb beroksigen   : merah rendah, inframerah tinggi;  Hb tanpa oksigen: merah tinggi, inframerah lebih rendah;  Hb-CO: seperti beroksigen pada merah.
import { clamp } from './lib.js';
export const MU = { oxy: { r: 0.24, i: 0.50 }, deoxy: { r: 1.00, i: 0.30 }, co: { r: 0.24, i: 0.12 } };
export const HR = 1.2;                       // 72 denyut per menit
export const T0_BEAT = 25.62;                // denyut pertama selaras kata "denyut" pada narasi (detik narasi)
export const SLOW = [[23.4, 26.5, 0.55]];    // pelan-pelan saat "satu siklus denyut" diperbesar
export function phase(tn) {                  // fase denyut kumulatif (siklus)
  let ph = HR * (tn - T0_BEAT);
  for (const [a, b, r] of SLOW) ph += (r - HR) * (clamp(tn, a, b) - clamp(T0_BEAT, a, b));
  return ph;
}
/** bentuk gelombang denyut arteri 0..1 (naik cepat, turun lambat, takik dikrotik) */
export function pulse(ph) {
  const x = ph - Math.floor(ph);
  const rise = x < 0.16 ? Math.sin((x / 0.16) * Math.PI / 2) ** 2 : 0;
  const fall = x >= 0.16 ? Math.exp(-(x - 0.16) * 3.6) : 0;
  const notch = 0.13 * Math.exp(-(((x - 0.46) / 0.055) ** 2));
  return clamp(rise + fall * (x >= 0.16 ? 1 : 0) + notch, 0, 1.05);
}
export const D0 = 66, DA = 17;               // tebal pembuluh dasar dan penambahan saat denyut (satuan dunia)
export const effMu = (frac) => ({ r: frac * MU.oxy.r + (1 - frac) * MU.deoxy.r, i: frac * MU.oxy.i + (1 - frac) * MU.deoxy.i });   // frac = bagian Hb beroksigen
export const K_T = 1 / 40;                    // skala tebal -> transmisi
export const trans = (mu, d) => Math.exp(-mu * d * K_T);
/** kurva kalibrasi ilustratif: rasio R = (AC/DC merah)/(AC/DC inframerah) -> SpO2 (%), kurva linear turun */
export const spo2FromR = (R) => 110 - 25 * R;
export const R_OF = (frac) => { const m = effMu(frac); return m.r / m.i; };
