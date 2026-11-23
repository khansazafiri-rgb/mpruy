// Waktu kata dari ASR audio asli (audio/asr.json). tn = detik narasi; t video = tn + OFF.
export const OFF = 0.3;
export const NAR = 59.08;                                      // panjang narasi-edukasi.wav
export const EDU = Math.ceil((OFF + NAR + 0.6) * 30) / 30;     // panjang bagian edukasi (detik)
export const OUT = 16.2;                                       // master outro
export const DUR = EDU + OUT;
export const A = {
  bayangkan: 0, makan: 1.30, bentol: 3.04, suara: 4.02, berubah: 4.48, sulit: 5.36, pingsan: 6.34, pingsanEnd: 7.0,
  ini: 7.50, anafilaksis: 8.46, reaksi: 9.48, cepat: 11.18,
  saat: 12.30, sel: 13.68, lepas: 14.06, histamin: 15.08,
  pembuluh: 16.10, melebar: 16.64, bocor: 17.90, tekanan: 18.96, turun: 19.70,
  saluran: 20.64, napas: 21.02, membengkak: 21.52, otot: 22.66, menyempit: 23.52, mEnd: 23.96,
  itulah: 24.32, semakin: 25.86, sulit2: 26.32,
  disini: 26.66, pena: 28.00, autoinjektor: 28.18, adrenalin: 28.90, digunakan: 29.44, dEnd: 29.74,
  alat: 30.12, menyalurkan: 30.80, luar: 32.32, paha: 32.56, jarum: 33.20, otomatis: 34.18, oEnd: 34.72,
  setelah: 35.28, tubuh: 36.10, adr2: 36.64, reseptor: 37.94,
  alfa: 38.92, alfaEnd: 42.02, beta2: 42.48, beta2End: 45.18, beta1: 45.48, beta1End: 47.52,
  jadi: 48.28, anafil2: 49.98, bukan: 50.88, gatal: 51.58, bersin: 52.02, alergi: 52.50,
  setelahPakai: 53.42, bantuan: 55.00, karena: 55.64, dinilai: 57.68, dipantau: 58.34, end: 59.0,
};
export const KAL = [
  [0.0, 7.0, 'Bayangkan setelah makan sesuatu, seseorang tiba-tiba muncul bentol, suaranya berubah, sulit bernapas, dan hampir pingsan.'],
  [7.5, 11.6, 'Ini bisa menjadi anafilaksis: reaksi alergi berat yang terjadi cepat.'],
  [12.3, 15.6, 'Saat reaksi ini berlangsung, sel imun melepaskan zat seperti histamin.'],
  [16.1, 20.1, 'Pembuluh darah melebar dan menjadi lebih mudah bocor, sehingga tekanan darah bisa turun.'],
  [20.64, 24.0, 'Saluran napas dapat membengkak, sementara otot di sekitarnya menyempit.'],
  [24.32, 26.7, 'Itulah sebabnya napas bisa terasa semakin sulit.'],
  [26.66, 29.8, 'Di sinilah pena autoinjektor adrenalin digunakan.'],
  [30.12, 34.8, 'Alat ini menyalurkan adrenalin ke bagian luar paha melalui jarum yang bekerja otomatis.'],
  [35.28, 38.6, 'Setelah masuk ke tubuh, adrenalin bekerja pada beberapa reseptor.'],
  [38.92, 42.1, 'Efek alfa membantu menyempitkan pembuluh darah dan mengurangi pembengkakan.'],
  [42.48, 45.3, 'Efek beta dua membantu otot saluran napas mengendur.'],
  [45.48, 47.6, 'Efek beta satu mendukung kerja jantung.'],
  [48.28, 53.0, 'Jadi, pena ini ditujukan untuk anafilaksis, bukan untuk setiap gatal atau bersin karena alergi.'],
  [53.42, 58.95, 'Setelah digunakan, segera cari bantuan medis karena kondisi orang tersebut tetap perlu dinilai dan dipantau.'],
];
