// Waktu narasi video "Bunyi tensi dari mana?" (Korotkoff). Narasi = berkas WAV Google AI Studio dari pemesan (43,16 dtk), tidak diubah.
// Batas kalimat/frasa diukur dari jeda senyap (ffmpeg silencedetect, -38 dB, >= 0,18 dtk: ketelitian kira-kira 0,05 dtk). Teks kalimat = hasil pengenalan suara
// (faster-whisper small, bahasa Indonesia) yang dibetulkan ejaannya; kata-kata yang dipakai sebagai patokan: lihat `transkrip-whisper.json`.
export const NARASI_DTK = 43.16, PENUTUP = 2.8, DURASI = +(NARASI_DTK + PENUTUP).toFixed(2);

export const KALIMAT = [
  { id: 'k1a', a: 0.233, z: 1.198, t: 'Pernah dengar bunyi' },
  { id: 'duk1', a: 1.403, z: 1.535, t: 'duk' }, { id: 'duk2', a: 2.283, z: 2.477, t: 'duk' },
  { id: 'k1b', a: 2.929, z: 4.155, t: 'saat mengukur tensi manual?' },
  { id: 'k2', a: 4.742, z: 5.881, t: 'Sebenarnya itu bunyi apa?' },
  { id: 'k3', a: 6.961, z: 9.704, t: 'Saat manset dipompa, arteri di lengan tertekan.' },
  { id: 'k4', a: 10.280, z: 13.191, t: 'Ketika tekanannya masih tinggi, belum ada ketukan yang terdengar.' },
  { id: 'k5', a: 13.985, z: 15.768, t: 'Lalu, manset dikempiskan perlahan.' },
  { id: 'k6', a: 16.349, z: 19.755, t: 'Setiap denyut jantung mulai menggerakkan bagian arteri yang masih tertekan.' },
  { id: 'k7', a: 20.458, z: 24.483, t: 'Getarannya merambat melalui jaringan, lalu terdengar lewat stetoskop sebagai ketukan.' },
  { id: 'k8a', a: 25.625, z: 27.543, t: 'Ketukan pertama menjadi patokan angka atas,' },
  { id: 'k8b', a: 27.913, z: 28.669, t: 'tekanan sistolik.' },
  { id: 'k9a', a: 29.729, z: 31.114, t: 'Saat manset makin longgar,' },
  { id: 'k9b', a: 31.294, z: 32.106, t: 'ketukannya menghilang.' },
  { id: 'k10a', a: 32.703, z: 34.175, t: 'Di titik itulah angka bawah,' },
  { id: 'k10b', a: 34.360, z: 35.694, t: 'tekanan diastolik dibaca.' },
  { id: 'k11a', a: 36.686, z: 38.539, t: 'Jadi, saat mengukur tensi manual,' },
  { id: 'k11b', a: 38.856, z: 39.676, t: 'perhatikan dua momen.' },
  { id: 'k12a', a: 40.132, z: 41.236, t: 'Bunyi pertama muncul,' },
  { id: 'k12b', a: 41.532, z: 42.843, t: 'lalu bunyinya hilang.' },
];
export const K = Object.fromEntries(KALIMAT.map((k) => [k.id, k]));

// Peristiwa kunci (detik nyata) yang ditautkan ke narasi
export const EV = {
  duk1: K.duk1.a, duk2: K.duk2.a,                 // "duk-duk" yang diucapkan narator: ketukan hook jatuh pada awal kedua "duk"
  tanya: K.k2.a,                                   // teks "BUNYI INI DARI MANA?"
  pompa: [7.30, 7.72, 8.14],                      // tiga remasan bola ("manset dipompa" 7,26-8,14)
  masuk: [8.36, 9.30],                             // kamera masuk ke lengan dan penampang terbuka ("arteri di lengan tertekan" 8,5-9,7)
  tinggi: [10.28, 13.19],                          // tekanan tinggi, denyut tiba tanpa bunyi
  kempis: 14.30,                                   // manset mulai dikempiskan ("dikempiskan" 14,76; katup dibuka sedikit lebih dulu)
  gerak: 16.80,                                    // dinding arteri yang tertekan mulai bergerak halus ("mulai menggerakkan" 17,4-18,2)
  getar: 20.46,                                    // getaran merambat ("Getarannya" 20,46)
  duk: 24.00,                                      // ketukan pertama terdengar ("sebagai ketukan" 23,88-24,48)
  beku: [24.05, 25.95],                            // momen pertama dibekukan sesaat
  labelS: K.k8a.a,                                 // "BUNYI PERTAMA -> SISTOLIK" ("Ketukan pertama" 25,63)
  hilang: 31.8,                                    // ketukan terakhir tidak terdengar; arteri terbuka sepanjang siklus
  labelD: K.k10a.a,                                // "BUNYI HILANG -> DIASTOLIK" ("Di titik itulah angka bawah" 32,70)
  dua: K.k11a.a,                                   // dua penanda pada satu pengukur
  raka: [39.72, 40.5],                             // kembali ke Raka
  tutup: NARASI_DTK,                               // kartu penutup 2,8 dtk
};
