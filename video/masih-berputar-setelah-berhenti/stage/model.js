// Model gerak bersama (satu-satunya sumber kebenaran untuk dinding saluran, cairan, kupula, sinyal). Semua dalam detik video = detik narasi.
// Dinding (= kepala) berputar searah jarum jam (dilihat dari atas); cairan mengikuti dengan jeda (inersia) dan, saat dinding berhenti mendadak, masih bergerak sesaat.
// Konstanta waktu di sini hanya mengatur kecepatan animasi sesuai narasi; TIDAK ditampilkan sebagai angka detik di layar.
import { clamp, sm, lerp } from './common.js';
export const T_START = 11.5, T_RAMP = 1.3, T_STOP = 32.36, STOP_D = 0.16, TAU_UP = 6.0, TAU_DN = 4.2, W0 = 100, T_SIG = 21.5, TRAVEL = 1.35;
const DT = 1 / 120, N = Math.ceil(58 / DT);
const aW = new Float32Array(N + 2), aF = new Float32Array(N + 2), aTW = new Float32Array(N + 2), aTF = new Float32Array(N + 2), aB = new Float32Array(N + 2);
const wall = (t) => (t < T_STOP ? sm((t - T_START) / T_RAMP) : t < T_STOP + STOP_D ? 1 - sm((t - T_STOP) / STOP_D) : 0);
export const PULSES = [];
{
  let f = 0, a = 0, b = 0, bs = 0, cum = 0, nextP = 1;
  for (let i = 0; i <= N + 1; i++) {
    const t = i * DT, w = wall(t); aW[i] = w; aF[i] = f; aTW[i] = a; aTF[i] = b;
    const tgt = 40 * Math.tanh(2.2 * (f - w)) / Math.tanh(2.2); bs += (tgt - bs) * (1 - Math.exp(-DT / 0.22)); aB[i] = bs;   // kupula: derajat, + = searah gerak jarum jam (kanan)
    if (t >= T_SIG) { const lam = 0.7 + 4.6 * Math.abs(bs) / 40; cum += lam * DT; while (cum >= nextP) { PULSES.push(t); nextP++; } }
    f += (w - f) * (1 - Math.exp(-DT / (w >= f ? TAU_UP : TAU_DN))); a += w * W0 * DT; b += f * W0 * DT;
  }
}
const at = (arr, t) => { const x = clamp(t / DT, 0, N), i = Math.floor(x), u = x - i; return lerp(arr[i], arr[i + 1], u); };
export const wallV = (t) => at(aW, t);      // 0..1 kecepatan dinding
export const fluidV = (t) => at(aF, t);     // 0..1 kecepatan cairan
export const wallTh = (t) => at(aTW, t);    // derajat, searah jarum jam
export const fluidTh = (t) => at(aTF, t);
export const bendDeg = (t) => at(aB, t);
export const relFlow = (t) => fluidV(t) - wallV(t);
/** kilatan otak: jumlah sinyal yang baru tiba */
export const flash = (t) => { let s = 0; for (const p of PULSES) { const d = t - (p + TRAVEL); if (d >= 0 && d < 0.8) s += Math.exp(-d / 0.16); } return Math.min(1.4, s); };
