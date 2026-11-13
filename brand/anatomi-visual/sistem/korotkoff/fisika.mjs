// Model skematis yang menjadi SATU sumber untuk gambar dan bunyi: tekanan manset, denyut arteri, bukaan arteri di bawah manset, ketukan.
// Skema pengajaran (bukan simulasi hemodinamik): angka tekanan tidak ditampilkan di layar; Ps dan Pd hanya menentukan posisi jarum.
//   - Tekanan arteri proksimal berdenyut antara PD (diastolik) dan PS (sistolik).
//   - Arteri terbuka di titik x bila tekanan arteri > tekanan manset di titik itu. Manset menekan paling kuat di tengah dan meruncing di tepi distal.
//   - P manset > PS: arteri terjepit, tidak ada ketukan. PD < P < PS: arteri terbuka sebentar tiap puncak denyut (ketukan). P < PD: terbuka sepanjang siklus (tanpa ketukan).
import { EV, DURASI } from './waktu.mjs';
import { clamp, seg, lerp, ease } from '../tensi/util.mjs';

export const PS = 128, PD = 86, PMAKS = 190;           // satuan sembarang pada skala jarum (tanpa angka di layar)
export const T_BEAT = 0.8;
export const DAHULU = 0.12;                           // puncak tekanan arteri di manset mendahului bunyi di stetoskop 0,12 dtk (waktu rambat getaran)                              // 75 denyut/menit
export const BEKU = EV.beku, DBEKU = BEKU[1] - BEKU[0];

/** Waktu animasi: berhenti selama momen beku. */
export const tAnim = (T) => (T <= BEKU[0] ? T : T < BEKU[1] ? BEKU[0] : T - DBEKU);
export const tNyata = (Ta) => (Ta <= BEKU[0] ? Ta : Ta + DBEKU);

/** Tekanan manset P(Ta): tiga remasan bola, tahan, lalu turun linear; tinggi pada ketukan pertama = PS-1, hilang pada PD. */
const Ta_duk = EV.duk, Ta_hilang = EV.hilang - DBEKU;
export function tekananManset(Ta) {
  if (Ta < EV.pompa[0]) return 0;
  const stepsT = EV.pompa;
  if (Ta < stepsT[2] + 0.55) {
    let p = 0; stepsT.forEach((t0, i) => { p += (PMAKS / 3) * ease.sm(clamp((Ta - t0) / 0.34)); }); return p;
  }
  if (Ta < EV.kempis) return PMAKS - 0.4 * seg(Ta, EV.pompa[2] + 0.55, EV.kempis, ease.lin);
  if (Ta <= Ta_duk) return lerp(PMAKS - 0.4, PS - 1, (Ta - EV.kempis) / (Ta_duk - EV.kempis));
  if (Ta <= Ta_hilang) return lerp(PS - 1, PD - 1, (Ta - Ta_duk) / (Ta_hilang - Ta_duk));
  return Math.max(0, PD - 1 - 7 * (Ta - Ta_hilang));
}
/** Manset dikempiskan penuh pada adegan penutup (jarum kembali ke 0) */
export const tekananNyata = (T) => tekananManset(tAnim(T));

// ---- denyut: puncak tiba di manset pada Ta_duk + k*T_BEAT (k bilangan bulat)
export const waktuDenyut = (Ta) => { const k = Math.round((Ta - Ta_duk) / T_BEAT); return Ta_duk + k * T_BEAT; };
/** Bentuk gelombang tekanan arteri 0..1 pada jarak tau (detik) dari puncak: naik cepat, turun lambat, takik dikrotik kecil. */
export function bentukDenyut(tau) {
  if (tau < -0.14 || tau > 0.62) return 0;
  if (tau < 0.04) return ease.sm(clamp((tau + 0.14) / 0.18));
  const d = Math.exp(-(tau - 0.04) / 0.2); return clamp(0.12 + 0.88 * d + 0.07 * Math.exp(-Math.pow((tau - 0.36) / 0.07, 2)), 0, 1);
}
/** Tekanan arteri proksimal pada waktu animasi Ta (satuan skala). */
export function tekananArteri(Ta) {
  const k = Math.round((Ta - Ta_duk) / T_BEAT);
  let b = 0; for (const kk of [k - 1, k, k + 1]) b = Math.max(b, bentukDenyut(Ta - (Ta_duk + kk * T_BEAT) + DAHULU));
  return PD + (PS - PD) * b;
}
/** Semua denyut yang tiba di manset antara Ta0 dan Ta1. */
export function denyutAntara(Ta0, Ta1) { const r = []; for (let k = Math.ceil((Ta0 - Ta_duk) / T_BEAT); Ta_duk + k * T_BEAT <= Ta1; k++) r.push(Ta_duk + k * T_BEAT); return r; }

/** Amplitudo ketukan (0..1) untuk tekanan manset P pada puncak denyut: lemah di awal, keras di tengah, menyusut mendekati diastolik, nol di bawahnya. */
export function amplitudoKetukan(P) {
  if (P >= PS) return 0; if (P <= PD) return 0;
  const u = (PS - P) / (PS - PD);                       // 0 di PS, 1 di PD
  return u < 0.12 ? 0.6 + 3.3 * u : clamp((1 - u) / 0.88, 0, 1) ** 0.8;
}

/** Daftar ketukan terdengar (waktu NYATA, amplitudo). Hook: dua "duk" pada awal. Ketukan pertama pada EV.duk; lalu mengikuti denyut sampai menghilang. */
export function daftarKetukan() {
  const r = [];
  r.push({ t: EV.duk1, a: 0.85, jenis: 'hook' }, { t: EV.duk2, a: 0.85, jenis: 'hook' });
  for (const Ta of denyutAntara(Ta_duk - 0.001, 36)) {
    const P = tekananManset(Ta); const a = amplitudoKetukan(P);
    if (a > 0.03) r.push({ t: +tNyata(Ta).toFixed(3), a: +a.toFixed(3), jenis: 'korotkoff', P: +P.toFixed(1) });
  }
  // ringkasan penutup: satu "duk" saat "Bunyi pertama muncul" lalu hening
  r.push({ t: 40.50, a: 0.7, jenis: 'ringkas' });
  return r;
}
if (typeof process !== 'undefined' && process.argv[1] && process.argv[1].endsWith('fisika.mjs')) console.log(JSON.stringify({ durasi: DURASI, ketukan: daftarKetukan() }, null, 1));
