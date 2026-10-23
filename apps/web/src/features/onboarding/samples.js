// Data contoh untuk tutorial latihan soal. Tidak berasal dari bank soal, jadi
// tutorial tetap jalan walau mata kuliah pengguna belum punya soal.
// Soal sama dengan contoh di landing page (sudah ditinjau).
export const TUT_SUBJECTS = [
  {
    key: 'anatomi', name: 'Anatomi', desc: 'Struktur tubuh manusia dari tulang sampai saraf.',
    chapters: ['Ekstremitas atas', 'Osteologi', 'Neuroanatomi'],
    q: {
      level: 'easy', stem: 'Pasien tidak mampu memulai abduksi lengan atas pada 15° pertama. Otot yang paling mungkin terganggu adalah…', answer: 'B',
      options: [
        ['A', 'M. deltoideus', 'Deltoid melanjutkan abduksi setelah 15° sampai sekitar 90°, bukan memulainya.'],
        ['B', 'M. supraspinatus', 'Supraspinatus memulai abduksi pada 0–15° pertama sebelum deltoid mengambil alih.'],
        ['C', 'M. infraspinatus', 'Infraspinatus berperan dalam rotasi lateral (eksternal) bahu.'],
        ['D', 'M. teres minor', 'Teres minor juga terutama memutar lengan ke lateral.'],
        ['E', 'M. subscapularis', 'Subscapularis memutar lengan ke medial (internal).'],
      ],
    },
  },
  {
    key: 'fisiologi', name: 'Fisiologi', desc: 'Cara kerja organ dan sistem tubuh.',
    chapters: ['Fisiologi ginjal', 'Fisiologi kardiovaskular', 'Fisiologi sel dan membran'],
    q: {
      level: 'medium', stem: 'Saat tekanan perfusi ginjal turun, sel jukstaglomerular menyekresikan…', answer: 'B',
      options: [
        ['A', 'Aldosteron', 'Aldosteron dihasilkan zona glomerulosa korteks adrenal, sebagai kelanjutan jalur RAA.'],
        ['B', 'Renin', 'Sel jukstaglomerular (granular) melepas renin saat perfusi ginjal turun, memulai jalur renin-angiotensin-aldosteron.'],
        ['C', 'ADH', 'ADH dibuat di hipotalamus dan dilepas dari hipofisis posterior.'],
        ['D', 'ANP', 'ANP dilepas miosit atrium saat atrium teregang, efeknya justru menurunkan tekanan darah.'],
        ['E', 'Eritropoietin', 'Eritropoietin dilepas sel interstisial peritubular ginjal terutama sebagai respons terhadap hipoksia.'],
      ],
    },
  },
  {
    key: 'biokimia', name: 'Biokimia & Biologi Molekuler', desc: 'Reaksi kimia dan metabolisme di dalam sel.',
    chapters: ['Metabolisme lipid', 'Metabolisme karbohidrat', 'Enzim'],
    q: {
      level: 'medium', stem: 'Enzim pembatas laju pada sintesis kolesterol, yang juga dihambat oleh statin, adalah…', answer: 'B',
      options: [
        ['A', 'HMG-KoA sintase', 'Enzim ini membentuk HMG-KoA, tetapi bukan langkah pembatas laju.'],
        ['B', 'HMG-KoA reduktase', 'HMG-KoA reduktase mengubah HMG-KoA menjadi mevalonat. Inilah langkah pembatas laju dan target statin.'],
        ['C', 'Asetil-KoA karboksilase', 'Enzim ini pembatas laju sintesis asam lemak, bukan kolesterol.'],
        ['D', 'Skualen epoksidase', 'Enzim ini bekerja di tahap lanjut, setelah skualen terbentuk.'],
        ['E', 'Lipoprotein lipase', 'Lipoprotein lipase menghidrolisis trigliserida pada kilomikron dan VLDL.'],
      ],
    },
  },
];

// Ubah ke bentuk yang dipakai QuestionView.
export function toQuestion(s) {
  return {
    id: `tutorial-${s.key}`,
    qtype: 'A',
    difficulty: s.q.level,
    stem: s.q.stem,
    answer: s.q.answer,
    options: s.q.options.map(([label, text, explanation]) => ({ label, text, explanation })),
  };
}

export const PACKAGES = [
  { id: 'p100', name: 'Paket 100', total: 100, per: 5, desc: 'Pemanasan: 5 soal per BAB dari semua BAB.' },
  { id: 'p150', name: 'Paket 150', total: 150, per: 7, desc: 'Latihan menengah: 7 soal per BAB.' },
  { id: 'p200', name: 'Paket 200', total: 200, per: 10, desc: 'Persiapan ujian: 10 soal per BAB.' },
];
