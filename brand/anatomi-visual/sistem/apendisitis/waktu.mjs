// Waktu narasi (detik) pada audio Gemini TTS yang diberikan (73,0 dtk). Batas kalimat diselaraskan dari jeda senyap dan jumlah suku kata
// (selaraskan-narasi.py); penanda frasa memakai jeda koma yang terdeteksi, selain itu proporsi suku kata (ketelitian sekitar +-0,2 dtk).
// Teks takarir = naskah persis (tag <breath> dan <short pause> adalah arahan suara dan tidak ditampilkan).
export const AUDIO_DURASI = 73.0;
export const DURASI = 75.2;   // narasi + 2,2 dtk kartu penutup
export const KALIMAT = [
  { id: 1, t0: 0.35, t1: 5.36, teks: 'Dokter memasukkan kamera lewat sayatan kecil, lalu mengangkat satu kantong di ujung usus.' },
  { id: 2, t0: 5.86, t1: 7.27, teks: 'Kenapa bagian itu harus diangkat?' },
  { id: 3, t0: 7.81, t1: 10.01, teks: 'Kantong kecil itu bernama apendiks.' },
  { id: 4, t0: 10.35, t1: 12.29, teks: 'Ia menempel pada bagian awal usus besar.' },
  { id: 5, t0: 12.70, t1: 16.72, teks: 'Ketika meradang, kondisinya disebut apendisitis, atau radang usus buntu.' },
  { id: 6, t0: 17.59, t1: 20.28, teks: 'Pada sebagian kasus, pintu saluran apendiks tersumbat.' },
  { id: 7, t0: 20.79, t1: 24.90, teks: 'Penyumbatnya bisa berupa tinja yang mengeras, atau jaringan di dinding apendiks yang membengkak.' },
  { id: 8, t0: 25.55, t1: 27.89, teks: 'Nah, dinding apendiks tetap menghasilkan lendir.' },
  { id: 9, t0: 28.28, t1: 30.97, teks: 'Karena jalan keluarnya tertutup, lendir tertahan di dalam.' },
  { id: 10, t0: 31.39, t1: 36.55, teks: 'Tekanannya meningkat, apendiks meregang, aliran darah di dindingnya terganggu, dan bakteri dapat berkembang.' },
  { id: 11, t0: 37.53, t1: 39.91, teks: 'Awalnya nyeri bisa terasa samar di sekitar pusar.' },
  { id: 12, t0: 40.36, t1: 45.36, teks: 'Ketika peradangan menjalar dan mengiritasi lapisan dinding perut, nyerinya dapat terasa lebih jelas di kanan bawah.' },
  { id: 13, t0: 45.95, t1: 51.60, teks: 'Mual, hilang nafsu makan, atau demam bisa menyertai, tetapi gejalanya tidak selalu sama pada setiap orang.' },
  { id: 14, t0: 52.52, t1: 57.32, teks: 'Dokter menilai gejala, memeriksa perut, dan bila perlu menggunakan tes darah atau pencitraan.' },
  { id: 15, t0: 58.07, t1: 63.48, teks: 'Pengangkatan apendiks sering menjadi penanganan; pada kasus tertentu, dokter dapat mempertimbangkan antibiotik.' },
  { id: 16, t0: 64.29, t1: 67.12, teks: 'Belum ada cara yang terbukti pasti mencegah apendisitis.' },
  { id: 17, t0: 67.52, t1: 72.69, teks: 'Yang penting, jangan menunda pemeriksaan saat nyeri perut makin berat, terutama bila menetap di kanan bawah.' },
];
// penanda frasa (detik)
export const M = {
  s1: { kamera: 0.35, lalu: 2.83, kantong: 3.85, usus: 4.95 },
  s5: { meradang: 12.7, apendisitis: 14.0, usbuntu: 15.75 },
  s7: { tinja: 21.7, jaringan: 23.0 },
  s8: { lendir: 26.1 },
  s9: { tertutup: 28.9, tertahan: 29.78 },
  s10: { tekanan: 31.39, meregang: 32.55, aliran: 33.75, bakteri: 35.35 },
  s12: { menjalar: 40.36, kananBawah: 44.85 },
  s13: { mual: 45.95, nafsu: 46.7, demam: 48.1, takSama: 49.3 },
  s14: { gejala: 52.9, periksa: 53.9, tes: 54.9, citra: 56.5 },
  s15: { angkat: 58.07, tertentu: 60.59, antibiotik: 61.79 },
  s16: { belum: 64.29 },
  s17: { jangan: 68.34, kananBawah: 70.97 },
};
export const kalimatAktif = (T) => KALIMAT.find((k) => T >= k.t0 - 0.05 && T <= k.t1 + 0.35) || null;
