// Waktu narasi (detik pada audio Google AI Studio yang dilampirkan, 78,4 dtk). Batas kalimat diselaraskan dari jeda senyap (ffmpeg silencedetect) dan jumlah suku kata
// (selaraskan-narasi.py); batas frasa di dalam kalimat memakai jeda koma bila terdeteksi, selain itu dibagi menurut suku kata. Ketelitian sekitar +-0,2 dtk.
// Teks takarir = naskah persis (tanda <breath> dan <short pause> adalah arahan suara, tidak ditampilkan).
export const AUDIO_DURASI = 78.4;
export const DURASI = 80.6;   // narasi + 2,2 dtk penutup dengan logo
export const KALIMAT = [
  { id: 1, t0: 1.08, t1: 3.72, teks: 'Baru berdiri dari kursi, pandangannya mendadak gelap.' },
  { id: 2, t0: 4.50, t1: 6.09, teks: 'Kenapa tubuhnya seperti mau jatuh?' },
  { id: 3, t0: 7.08, t1: 11.44, teks: 'Saat kita berdiri, gravitasi membuat sebagian darah berkumpul di kaki dan perut.' },
  { id: 4, t0: 11.99, t1: 13.80, teks: 'Darah yang kembali ke jantung berkurang.' },
  { id: 5, t0: 14.36, t1: 18.43, teks: 'Tekanan bisa turun sesaat, dan aliran darah ke otak ikut berkurang.' },
  { id: 6, t0: 19.49, t1: 21.83, teks: 'Tapi tubuh biasanya cepat mengimbangi.' },
  { id: 7, t0: 22.48, t1: 24.50, teks: 'Sensor tekanan di pembuluh darah memberi sinyal.' },
  { id: 8, t0: 24.95, t1: 29.41, teks: 'Jantung berdetak lebih cepat, pembuluh menyempit, dan tekanan kembali terjaga.' },
  { id: 9, t0: 30.31, t1: 33.96, teks: 'Kalau respons itu terlambat, kita bisa merasa pusing atau bahkan pingsan.' },
  { id: 10, t0: 34.86, t1: 38.97, teks: 'Kurang cairan, obat tertentu, dan kehilangan darah juga bisa membuat tekanan turun.' },
  { id: 11, t0: 39.76, t1: 42.60, teks: 'Lalu, apakah ada hal khusus pada perempuan?' },
  { id: 12, t0: 43.46, t1: 48.07, teks: 'Saat hamil, pembuluh darah cenderung lebih rileks sehingga tekanan bisa lebih rendah.' },
  { id: 13, t0: 48.87, t1: 54.23, teks: 'Perdarahan haid yang sangat banyak juga perlu diperhatikan: kehilangan darah yang berat bisa menurunkan tekanan.' },
  { id: 14, t0: 55.19, t1: 58.47, teks: 'Tapi jangan samakan anemia dengan tensi rendah.' },
  { id: 15, t0: 59.11, t1: 63.47, teks: 'Haid banyak bisa menyebabkan anemia dan pusing, meskipun tekanan darahnya tidak rendah.' },
  { id: 16, t0: 64.29, t1: 68.42, teks: 'Angka di bawah sembilan puluh per enam puluh sering disebut tensi rendah.' },
  { id: 17, t0: 68.95, t1: 71.71, teks: 'Namun, yang penting juga adalah gejalanya dan penyebabnya.' },
  { id: 18, t0: 72.40, t1: 78.11, teks: 'Kalau sampai pingsan, perdarahannya banyak, atau pusingnya berat dan menetap, segera cari pertolongan medis.' },
];
// penanda frasa penting (detik)
export const M = {
  s8: { jantung: 24.95, pembuluh: 26.75, tekanan: 27.91 },
  s9: { terlambat: 30.31, pusing: 31.68 },
  s10: { cairan: 34.86, obat: 35.8, darah: 36.8 },
  s13: { haid: 48.87, hilangDarah: 51.83 },
  s14: { anemia: 56.21 },
  s15: { anemia: 59.11, tekananNormal: 61.57 },
  s17: { gejala: 70.0, penyebab: 70.95 },
  s18: { pingsan: 72.40, perdarahan: 73.54, pusing: 74.85, medis: 76.64 },
};
export const kalimatAktif = (T) => KALIMAT.find((k) => T >= k.t0 - 0.05 && T <= k.t1 + 0.35) || null;
export const adaNarasi = (T) => KALIMAT.some((k) => T >= k.t0 && T <= k.t1);
