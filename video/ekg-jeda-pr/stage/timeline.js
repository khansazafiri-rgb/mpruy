// Waktu kata dari ASR audio asli (audio/asr.json). tn = detik narasi; t video = tn + OFF.
export const OFF = 0.3;
export const NAR = 26.68;                                      // panjang narasi-edukasi.wav
export const EDU = Math.ceil((OFF + NAR + 0.6) * 30) / 30;     // bagian edukasi (detik); jeda ± 0,6 dtk sebelum outro
export const OUT = 16.2;                                       // master outro
export const DUR = EDU + OUT;
export const A = {
  kenapa: 0, setelah: 0.82, p0: 1.74, garis: 2.42, mendatar: 2.96, qEnd: 3.68,
  gelombang: 4.54, p: 5.18, aktivitas: 6.24, listrik: 6.66, serambi: 7.04, sEnd: 7.62,
  impuls: 8.12, melambat: 8.80, melewati: 9.40, nodus: 9.80, av: 10.12, avEnd: 10.36,
  dilayar: 11.02, datar: 12.04, segmen: 12.86, pr: 13.34, prEnd: 13.62,
  jeda: 14.60, waktu: 15.88, bilik: 16.04, terisi: 16.40, darah: 16.64, sebelum: 17.02, berkontraksi: 17.40, bEnd: 17.98,
  ketika: 18.62, menyebar: 19.18, keBilik: 19.60, kompleks: 20.22, qrs: 20.58, muncul: 20.94, mEnd: 21.46,
  jadi: 22.00, garisDatar: 22.76, bagian: 23.80, urutan: 24.34, jantung: 24.94, terkoordinasi: 25.50, end: 26.30,
};
export const KAL = [
  [0.0, 3.7, 'Kenapa setelah gelombang P, garis EKG mendatar sebentar?'],
  [4.54, 7.7, 'Gelombang P menunjukkan aktivitas listrik di serambi.'],
  [8.12, 10.5, 'Impuls lalu melambat saat melewati nodus AV.'],
  [11.02, 13.7, 'Di layar, bagian datar ini disebut segmen PR.'],
  [14.6, 18.05, 'Jeda singkat itu memberi waktu bilik terisi darah sebelum berkontraksi.'],
  [18.62, 21.55, 'Ketika impuls menyebar ke bilik, kompleks QRS muncul.'],
  [22.0, 26.4, 'Jadi, garis yang tampak datar itu bagian dari urutan kerja jantung yang terkoordinasi.'],
];
/** pemetaan waktu narasi tn -> "waktu lambat" s milik heart.js. Jantung dan grafik EKG memakai SATU s ini. */
const L = (tn, a, b, sa, sb) => sa + (sb - sa) * (tn - a) / (b - a);
export function sOf(tn) {
  if (tn < 3.9) return tn < 1.0 ? L(tn, 0, 1.0, 19.3, 20.9) : L(tn, 1.0, 3.9, 20.9, 22.25);      // hook: P selesai, lalu penunjuk melaju di ruas datar
  if (tn < 4.7) return L(tn, 3.9, 4.7, 15.6, 17.0);                                              // nodus sinus mulai
  if (tn < 5.2) return L(tn, 4.7, 5.2, 17.0, 18.8);
  if (tn < 7.5) return L(tn, 5.2, 7.5, 18.8, 20.9);                                              // gelombang P
  if (tn < 19.6) return L(tn, 7.5, 19.6, 20.9, 24.75);                                           // segmen PR (kecepatan tetap; impuls tertahan di nodus AV)
  if (tn < 21.4) return L(tn, 19.6, 21.4, 24.75, 25.85);                                         // QRS
  if (tn < 22.0) return L(tn, 21.4, 22.0, 25.85, 26.5);
  return L(tn, 22.0, 26.4, 18.0, 26.4);                                                          // putar ulang singkat: P -> PR -> QRS
}
