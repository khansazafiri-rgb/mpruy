// What to listen for at each site (draft, for clinical review). Sounds are SYNTHESISED (sim/auscultation.js).
export const SITE_GUIDE = {
  aortic: { listen: 'S2 (A2) paling keras di basis jantung.', why: 'Penutupan katup aorta; area di SIC II kanan parasternal.', refs: ['A1'] },
  pulmonic: { listen: 'S2 dengan komponen P2; split S2 melebar saat inspirasi.', why: 'Inspirasi menambah aliran balik ke jantung kanan sehingga P2 tertunda.', refs: ['A1'] },
  erb: { listen: 'S1 dan S2 sama-sama terdengar.', why: 'Titik transisi antara basis dan apeks.', refs: ['A1'] },
  tricuspid: { listen: 'S1 (T1) relatif lebih keras.', why: 'Dekat katup trikuspid di batas sternum kiri bawah.', refs: ['A1'] },
  mitral: { listen: 'S1 paling keras; S3 bernada rendah dengan bell pada skenario HFrEF.', why: 'Apeks/area mitral di SIC V kiri garis midklavikula.', refs: ['A1', 'R4'] },
  lung_ant_r: { listen: 'Bunyi napas vesikular: inspirasi lebih panjang dan keras dari ekspirasi.', why: 'Aliran udara turbulen di jalan napas besar disaring parenkim paru.', refs: ['A2'] },
  lung_ant_l: { listen: 'Bunyi napas vesikular.', why: 'Bandingkan kiri dan kanan pada ketinggian yang sama.', refs: ['A2'] },
  lung_lat_r: { listen: 'Vesikular; berkurang pada efusi kanan.', why: 'Cairan memisahkan paru dari dinding dada sehingga bunyi melemah.', refs: ['A2', 'R5'] },
  lung_lat_l: { listen: 'Vesikular.', why: 'Basal lateral kiri.', refs: ['A2'] },
  lung_post_r: { listen: 'Vesikular; jelas berkurang pada efusi kanan (cairan dependen di posterior).', why: 'Pada pasien terlentang cairan bebas berkumpul di posterior-basal.', refs: ['A2', 'R5'] },
  lung_post_l: { listen: 'Vesikular.', why: 'Pembanding sisi kiri.', refs: ['A2'] },
  abd_ruq: { listen: 'Bunyi usus sintetis berselang.', why: 'Bunyi usus tidak dipakai untuk mendiagnosis gastroparesis.', refs: ['A1', 'R8'] },
  abd_luq: { listen: 'Bunyi usus sintetis.', why: 'Simulasi sederhana, bukan penanda diagnosis.', refs: ['A1'] },
  abd_rlq: { listen: 'Bunyi usus sintetis.', why: 'Simulasi sederhana.', refs: ['A1'] },
  abd_llq: { listen: 'Bunyi usus sintetis.', why: 'Simulasi sederhana.', refs: ['A1'] },
};

/** Optional adventitious-sound DEMOS (pattern recognition only, not tied to a scenario). */
export const ADVENTITIOUS = {
  none: { label: 'Tidak ada', text: '' },
  crackles: { label: 'Ronki basah halus (crackles) — demo', text: 'Bunyi diskontinu singkat (<20 ms) di akhir inspirasi. Demo sintetis untuk pengenalan pola; belum ditinjau klinis.', refs: ['A2'] },
  wheeze: { label: 'Mengi (wheeze) — demo', text: 'Bunyi kontinu bernada musikal (±400 Hz), terutama saat ekspirasi. Demo sintetis; belum ditinjau klinis.', refs: ['A2'] },
};
