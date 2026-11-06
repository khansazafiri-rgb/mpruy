// Keadaan fisiologi skematis sebagai fungsi waktu (satu sumber untuk gambar dan audio). Semua nilai 0..1 kecuali hr (denyut/menit).
// Kurva ini ILUSTRASI perubahan arah (naik/turun), bukan data pengukuran.
import { kf, clamp, ease, lerp } from './util.mjs';
import { M } from './waktu.mjs';

const K = (t, ks) => kf(t, ks, ease.sm);
export const DURASI_TOTAL = 80.6;

export function negara(T) {
  const tembus = K(T, [[6.5, 0], [8.2, 1], [62.4, 1], [63.6, 0]]);
  // darah berkumpul di kaki dan perut (kalimat 3), berkurang saat pembuluh menyempit (kalimat 8), kambuh bila respons terlambat (kalimat 9)
  const pool = K(T, [[7.2, 0], [11.2, 0.92], [26.6, 1], [29.4, 0.38], [30.4, 0.38], [32.0, 0.95], [34.2, 0.95], [36.4, 0.15], [39.0, 0], [100, 0]]);
  // darah kembali ke jantung (kalimat 4)
  const vr = K(T, [[0, 1], [11.9, 1], [13.8, 0.4], [26.6, 0.44], [29.4, 0.92], [30.4, 0.92], [32.0, 0.38], [34.2, 0.38], [36.4, 0.9], [39.0, 1], [100, 1]]);
  // tekanan (kalimat 5, 8)
  const tek = K(T, [[0, 1], [11.9, 1], [13.8, 0.86], [16.8, 0.6], [26.6, 0.6], [28.8, 0.95], [30.4, 0.97], [31.9, 0.55], [34.2, 0.5], [36.4, 0.92], [39, 1], [100, 1]]);
  // aliran ke otak (kalimat 5, 8, 9)
  const bf0 = K(T, [[0, 1], [14.2, 0.96], [17.2, 0.5], [26.6, 0.52], [28.6, 0.78], [29.8, 0.98], [30.4, 0.98], [31.8, 0.3], [34.0, 0.26], [36.2, 0.95], [39, 1], [100, 1]]);
  // volume darah beredar (kalimat 10, 13)
  const vol = K(T, [[0, 1], [M.s10.cairan, 1], [M.s10.cairan + 1.7, 0.76], [M.s10.darah, 0.76], [M.s10.darah + 2.0, 0.54], [39.5, 0.54], [40.2, 1], [48.8, 1], [53.8, 0.5], [55.0, 0.5], [55.8, 1], [100, 1]]);
  const dil = K(T, [[M.s10.obat - 0.2, 0], [M.s10.obat + 0.7, 0.85], [M.s10.darah - 0.1, 0.85], [M.s10.darah + 0.7, 0], [100, 0]]);
  const vaso = K(T, [[26.4, 0], [28.6, 0.85], [30.4, 0.8], [31.4, 0], [100, 0]]);
  // sensor tekanan dan sinyal saraf
  const sensor = K(T, [[22.0, 0], [23.0, 1], [29.0, 0.8], [30.0, 0.1], [32.0, 0.14], [33.6, 0.5], [34.5, 0.1], [100, 0]]);
  const aff = K(T, [[22.4, 0], [23.2, 1], [26.0, 1], [29.4, 0.2], [29.8, 0], [30.4, 0], [31.0, 0.3], [33.8, 0.3], [34.4, 0], [100, 0]]);
  const eff = K(T, [[24.4, 0], [24.95, 1], [28.0, 1], [29.6, 0.2], [30.0, 0], [30.4, 0], [31.4, 0.3], [33.8, 0.35], [34.4, 0], [100, 0]]);
  const hr = K(T, [[0, 70], [14.0, 70], [16.0, 76], [24.6, 78], [27.0, 106], [29.4, 100], [30.4, 94], [31.4, 78], [34.2, 76], [36.4, 84], [38.0, 92], [40.2, 72], [48.8, 74], [52.5, 98], [54.5, 102], [56.5, 90], [60, 84], [64, 72], [100, 70]]);
  // perempuan
  const rahim = K(T, [[39.7, 0], [41.0, 1], [54.6, 1], [55.6, 0], [100, 0]]);
  const hamil = K(T, [[43.4, 0], [45.6, 1], [48.4, 1], [49.0, 0], [100, 0]]);
  const haid = K(T, [[M.s13.haid, 0], [M.s13.haid + 1.2, 1], [54.2, 1], [55.2, 0], [100, 0]]);
  // pembuluh rileks (kehamilan): melebar, tonus turun
  const rileks = K(T, [[43.8, 0], [46.0, 1], [48.3, 1], [49.0, 0], [100, 0]]);
  const efTekanan = clamp(tek - 0.2 * rileks - 0.7 * (1 - vol) - 0.12 * dil, 0, 1);
  const efBf = clamp(bf0 - 0.18 * (1 - vol) - 0.06 * dil - 0.1 * rileks, 0, 1);
  const efVr = clamp(vr - 0.5 * (1 - vol), 0, 1);
  return { tembus, pool, vr: efVr, tek: efTekanan, bf: efBf, vol, dil, vaso, sensor, aff, eff, hr, rahim, hamil, haid, rileks };
}

// ---- fase terintegrasi (agar kecepatan berubah mulus dan frame(t) tetap fungsi murni dari t) ----
const DT = 1 / 60, N = Math.ceil(DURASI_TOTAL / DT) + 4;
function tabel(fn) { const a = new Float32Array(N); let s = 0; for (let i = 1; i < N; i++) { s += fn(negara(i * DT)) * DT; a[i] = s; } return a; }
const TB = {
  denyut: tabel((n) => n.hr / 60),
  art: tabel((n) => 0.32 * (0.25 + 0.75 * n.tek) * (0.7 + 0.3 * n.hr / 70) * (0.5 + 0.5 * n.vol)),
  car: tabel((n) => 0.4 * (0.12 + 0.88 * n.bf)),
  jug: tabel((n) => 0.36 * (0.12 + 0.88 * n.bf)),
  venKaki: tabel((n) => 0.28 * (0.1 + 0.9 * n.vr) * (1 - 0.3 * n.pool)),
  venIvc: tabel((n) => 0.34 * (0.08 + 0.92 * n.vr)),
  saraf: tabel(() => 0.5),
  sarafLambat: tabel((n) => 0.5 * (n.aff > 0 ? 1 : 1)),
  putar: tabel(() => 1),
};
export function fase(kanal, T) { const a = TB[kanal]; const x = Math.max(0, T) / DT, i = Math.min(N - 2, Math.floor(x)); return a[i] + (a[i + 1] - a[i]) * (x - i); }
/** Waktu setiap denyut (detik) untuk audio. */
export function waktuDenyut() { const o = []; let k = 1; for (let i = 1; i < N; i++) if (TB.denyut[i] >= k) { o.push(i * DT); k++; } return o; }
