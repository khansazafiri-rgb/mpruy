// Waktu narasi video "Kenapa asam urat bisa bikin sendi sakit banget?" Narasi = WAV Google AI Studio dari pemesan (51,16 dtk), tidak diubah.
// Batas kalimat dari jeda senyap (ffmpeg silencedetect, -38 dB, >= 0,18 dtk) dan, bila jeda tak terdeteksi, dari penanda waktu kata pengenalan suara (faster-whisper small,
// bahasa Indonesia; ejaan dibetulkan di sini: "ginjal", "bereaksi", "gout", "sekadar", "melainkan", "MEDCOEL"). Ketelitian batas kalimat sekitar 0,05 dtk, posisi kata sekitar 0,2-0,3 dtk.
export const NARASI_DTK = 51.16, TAIL = 0.6, DURASI = +(NARASI_DTK + TAIL).toFixed(2);
export const KALIMAT = [
  { id: 'k1', a: 0.226, z: 2.80, t: 'Kenapa asam urat bisa bikin sendi sakit banget?' },
  { id: 'k2a', a: 3.613, z: 7.02, t: 'Saat tubuh mengurai purin yang berasal dari sel tubuh dan makanan,' },
  { id: 'k2b', a: 7.44, z: 9.176, t: 'terbentuk zat bernama urat.' },
  { id: 'k3', a: 9.62, z: 12.11, t: 'Biasanya, ginjal membuangnya lewat urin.' },
  { id: 'k4a', a: 12.448, z: 14.44, t: 'Kalau kadar urat dalam darah terlalu tinggi,' },
  { id: 'k4b', a: 14.98, z: 16.847, t: 'kristal urat bisa terbentuk di sendi.' },
  { id: 'k5', a: 17.478, z: 19.252, t: 'Tubuh bereaksi terhadap kristal itu.' },
  { id: 'k6a', a: 19.525, z: 21.64, t: 'Akibatnya, sendi bisa tiba-tiba nyeri,' },
  { id: 'k6b', a: 21.905, z: 24.414, t: 'bengkak, merah, dan terasa hangat.' },
  { id: 'k7a', a: 25.025, z: 26.80, t: 'Serangan peradangan ini disebut gout,' },
  { id: 'k7b', a: 27.06, z: 29.642, t: 'atau yang sering kita sebut penyakit asam urat.' },
  { id: 'k8a', a: 30.067, z: 31.76, t: 'Pangkal ibu jari kaki sering terkena,' },
  { id: 'k8b', a: 31.9855, z: 33.318, t: 'tapi sendi lain juga bisa.' },
  { id: 'k9', a: 34.059, z: 38.92, t: 'Tapi ingat, hasil tes asam urat yang tinggi tidak otomatis berarti seseorang mengalami gout.' },
  { id: 'k10a', a: 39.44, z: 42.95, t: 'Jadi, yang membuat sendi meradang bukan sekadar angka di hasil lab,' },
  { id: 'k10b', a: 43.32, z: 45.96, t: 'melainkan reaksi tubuh terhadap kristal yang terbentuk.' },
  { id: 'k11a', a: 46.737, z: 48.966, t: 'Belajar cara kerja tubuh lebih seru di MEDCOEL.' },
  { id: 'k11b', a: 49.229, z: 50.78, t: 'Gratis di medcoel.com.' },
];
export const K = Object.fromEntries(KALIMAT.map((k) => [k.id, k]));
// Kata kunci (detik nyata): dari penanda kata pengenalan suara; dipakai untuk memunculkan visual tepat saat disebut
export const W = {
  sakit: 2.16, purin: 4.54, sel: 5.94, makanan: 6.60, terbentuk: 7.44, urat1: 8.60, ginjal: 10.50, urin: 11.40, kadar: 12.62, tinggi: 13.98,
  kristal1: 14.98, terbentuk2: 15.78, sendi1: 16.44, bereaksi: 17.74, kristal2: 18.54, nyeri: 21.08, bengkak: 21.94, merah: 22.76, hangat: 23.94,
  gout: 26.40, asamurat: 28.60, pangkal: 29.84, sendiLain: 32.22, hasilTes: 34.92, tidakOtomatis: 36.50, mengalami: 38.18, angka: 41.94, reaksi: 43.76, kristal3: 44.92,
  belajar: 46.737, gratis: 49.229,
};
// Adegan: [mulai, akhir)
export const ADEGAN = {
  hook: [0, 3.45], purin: [3.45, 9.45], ginjal: [9.45, 14.6], sendi: [14.6, 24.7], gout: [24.7, 29.75], lokasi: [29.75, 33.8], bagi: [33.8, 46.35], raka: [46.35, DURASI],
};
export const LOGO = [48.97, DURASI];       // kartu logo: 2,8 dtk (dari "Gratis di medcoel.com" sampai akhir)
