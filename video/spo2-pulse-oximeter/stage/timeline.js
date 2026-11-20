// Waktu bersama (stage + audio). tn = detik narasi (audio/narasi-edukasi.wav); t = tn + OFF.
export const OFF = 0.3;            // jeda awal sebelum narasi (klik penjepit menutup)
export const EDU_END = 83.9;       // narasi dipotong di jeda alami setelah "...pertolongan." (83,60 - 84,14); 3 kalimat promo di akhir berkas diganti master outro
export const O0 = EDU_END + OFF + 0.45;   // outro mulai (web asli terlihat) pada detik video
export const MASTER_AT = O0 + 1.2;        // medcoel-outro-master.wav mulai setelah web terlihat
export const MASTER_LEN = 10.84;
export const DUR = MASTER_AT + MASTER_LEN + 3.1;
// kata kunci (hasil ASR audio/asr.json, detik narasi)
export const W = { merah: 8.30, inframerah: 8.72, sensor: 10.42, cahayaMelewati: 11.36, hbOks: 17.60, hbTanpa: 19.12, serap: 20.02, denyut1: 25.62, spo2: 29.70, pr: 36.52, denyut2: 38.08, bukanDx: 50.76, dingin: 53.12, gerakan: 53.86, aliran: 54.80, catKuku: 56.18, warnaKulit: 56.80, co2: 59.32, co: 63.22, caraPakai: 69.20 };
// takarir (teks narasi apa adanya, ejaan baku): [tn0, tn1, teks]
export const CAPS = [
  [0.0, 4.6, 'Alat kecil yang dijepit di jari ini bisa menampilkan angka oksigen dalam beberapa detik.'],
  [5.04, 6.3, 'Tapi bagaimana ia tahu?'],
  [6.84, 9.5, 'Di satu sisi penjepit ada lampu merah dan inframerah.'],
  [9.64, 10.7, 'Di sisi lain ada sensor.'],
  [11.36, 13.05, 'Cahaya melewati ujung jari,'],
  [13.12, 16.0, 'lalu sensor membaca berapa banyak yang berhasil menembusnya.'],
  [16.86, 19.95, 'Hemoglobin yang membawa oksigen dan hemoglobin yang tidak membawanya'],
  [20.02, 22.45, 'menyerap kedua cahaya itu dengan pola berbeda.'],
  [23.36, 26.5, 'Alat juga mencari perubahan cahaya yang mengikuti denyut darah arteri.'],
  [26.48, 30.6, 'Dari perbandingan sinyal inilah, ia memperkirakan SpO₂,'],
  [31.34, 34.15, 'persentase hemoglobin dalam darah arteri yang membawa oksigen.'],
  [34.92, 39.1, 'Angka lain yang biasanya muncul adalah PR atau jumlah denyut nadi per menit.'],
  [39.58, 42.5, 'Pulse oximeter berguna untuk memantau pasien saat operasi,'],
  [42.84, 44.5, 'menilai orang dengan keluhan pernapasan,'],
  [44.72, 48.9, 'serta mengikuti kondisi tertentu, seperti penyakit paru atau penggunaan terapi oksigen.'],
  [49.64, 51.7, 'Tetapi angka di layar bukan diagnosis.'],
  [51.64, 58.9, 'Jari yang dingin, gerakan, aliran darah yang lemah, cat kuku dan warna kulit dapat memengaruhi akurasinya.'],
  [59.32, 61.5, 'Alat ini juga tidak mengukur karbon dioksida.'],
  [61.96, 68.4, 'Bahkan pada keracunan karbon monoksida, pulse oximeter biasa bisa memberi angka yang tampak meyakinkan padahal kondisinya berbahaya.'],
  [69.2, 73.7, 'Saat memakainya, hangatkan tangan, lepaskan cat kuku pada jari yang diperiksa,'],
  [74.04, 76.4, 'diam sejenak, dan tunggu angkanya stabil.'],
  [77.04, 79.12, 'Selalu lihat juga gejala dan perubahan angkanya.'],
  [79.1, 83.65, 'Kalau sesak atau kondisi memburuk, jangan menunggu satu angka untuk mencari pertolongan.'],
];
