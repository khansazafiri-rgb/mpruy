// Waktu kata dari ASR audio asli (audio/asr.json). tn = detik narasi; t video = tn + OFF.
export const OFF = 0.3;
export const NAR = 54.12;                                      // panjang narasi-edukasi.wav
export const EDU = Math.ceil((OFF + NAR + 0.55) * 30) / 30;    // panjang bagian edukasi (detik)
export const OUT = 16.2;                                       // master outro
export const DUR = EDU + OUT;
export const A = {
  dua: 0.0, garis: 0.5, tespek: 0.98, muncul: 2.30, mana: 2.74, qEnd: 2.96,
  saat: 3.76, ujung: 4.18, urin: 5.20, cairannya: 5.82, merambat: 6.22, melalui: 6.76, strip: 7.16, berpori: 7.76, poriEnd: 8.3,
  didalam: 8.66, partikel: 9.86, berwarna: 10.22, protein: 10.94, penangkap: 11.26, antibody: 12.36, abEnd: 12.9,
  kalau: 13.42, hormon: 14.20, hcg: 14.60, kadar: 15.42, terdeteksi: 16.16, menempel: 17.68, partikel2: 18.38, penanda: 18.76,
  ketika: 19.64, area: 20.66, T: 20.84, gabungannya: 21.72, tertangkap: 22.14, tEnd: 22.6,
  partikel3: 22.96, menumpuk: 23.98, muncul2: 24.94, garisTes: 25.68, tes: 25.90,
  cairan: 26.10, terus: 27.22, areaC: 27.94, C: 28.10, disini: 28.88, terbentuk: 29.34, garisKontrol: 29.82, kontrol: 30.10, tanda: 30.94, berjalan: 31.94, jEnd: 32.5,
  kalauC: 32.94, C2: 33.66, tidakMuncul: 33.84, hasilnya: 34.92, tidakValid: 35.38, valid: 35.56, vEnd: 36.2,
  jadi: 36.64, dua2: 37.18, berarti: 37.88, hcg2: 38.38, terdeteksi2: 39.02, tdEnd: 39.58,
  satu: 40.02, C3: 40.80, berarti2: 41.06, hcg3: 41.78, belum: 42.40, terdeteksi3: 42.76, saat2: 43.50, dilakukan: 44.02, dEnd: 44.46,
  tapi: 45.08, kalauTes: 45.40, terlalu: 46.22, dini: 46.64, hcg4: 47.32, mungkin: 47.84, belum2: 48.24, cukup: 48.50, tinggi: 48.84, terbaca: 49.26, tbEnd: 49.74,
  karena: 50.20, baca: 51.14, hasil: 51.52, waktu: 52.10, tertulis: 52.56, petunjuk: 53.16, tespek2: 53.44, end: 54.05,
};
// takarir (kalimat naskah apa adanya)
export const KAL = [
  [0.0, 2.96, 'Dua garis di test pack ini sebenarnya muncul dari mana?'],
  [3.76, 8.3, 'Saat ujung test pack terkena urine, cairannya merambat melalui strip yang berpori.'],
  [8.66, 12.9, 'Di dalam strip ada partikel berwarna dan protein penangkap yang disebut antibodi.'],
  [13.42, 19.2, 'Kalau ada hormon hCG dalam kadar yang bisa terdeteksi, hormon itu menempel pada partikel penanda.'],
  [19.64, 22.7, 'Ketika sampai di area T, gabungannya tertangkap.'],
  [22.96, 26.1, 'Partikel berwarna menumpuk, lalu muncullah garis tes.'],
  [26.1, 28.7, 'Cairan terus bergerak ke area C.'], [28.88, 32.5, 'Di sini terbentuk garis kontrol, tanda bahwa tesnya berjalan.'],
  [32.94, 36.3, 'Kalau garis C tidak muncul, hasilnya tidak valid.'], [36.64, 39.6, 'Jadi, dua garis berarti hCG terdeteksi.'],
  [40.02, 44.5, 'Satu garis di C berarti hCG belum terdeteksi saat tes dilakukan.'],
  [45.08, 49.8, 'Tapi kalau tes dilakukan terlalu dini, hCG mungkin belum cukup tinggi untuk terbaca.'],
  [50.2, 54.05, 'Karena itu, baca hasil pada waktu yang tertulis di petunjuk test pack.'],
];
