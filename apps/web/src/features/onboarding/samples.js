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

// Catatan dan flashcard contoh untuk langkah "Belajar materi" dan "Flashcard" pada tutorial.
// Isinya kecil dan sengaja sejalan dengan soal contoh di atas. Format sama persis dengan catatan sungguhan
// (materi:v2), jadi tampilan di tutorial memakai komponen asli, bukan tiruan.
export const TUT_STUDY = {
  anatomi: {
    chapter: 'Ekstremitas atas',
    notes: `<!-- materi:v2 -->

## Tujuan Belajar {tujuan}

Setelah membaca catatan contoh ini, kamu bisa:

- menyebutkan empat otot rotator cuff;
- menjelaskan fungsi tiap otot pada gerakan bahu;
- menghubungkan sulitnya memulai abduksi dengan otot yang terganggu.

## Otot Rotator Cuff

Rotator cuff adalah empat otot yang membungkus sendi glenohumeral dan menjaga kepala humerus tetap pada fossa glenoidalis. Singkatannya **SITS**: ==supraspinatus==, ==infraspinatus==, ==teres minor==, dan ==subscapularis==.

### Fungsi masing-masing otot

- **M. supraspinatus**: memulai abduksi lengan pada 15° pertama.
- **M. infraspinatus** dan **M. teres minor**: rotasi lateral (eksternal) lengan.
- **M. subscapularis**: rotasi medial (internal) lengan.

## Abduksi Lengan

Abduksi dimulai oleh supraspinatus pada sekitar 0–15°. Setelah itu M. deltoideus mengambil alih sampai sekitar 90°, lalu rotasi skapula membantu gerakan sampai lengan terangkat di atas kepala.

> [!klinis] Nyeri bahu dan robekan rotator cuff
> Tendon supraspinatus paling sering robek. Pasien sulit memulai abduksi dan sering nyeri saat lengan diangkat sekitar 60–120° (painful arc).

## Poin High-Yield {highyield}

- SITS: supraspinatus, infraspinatus, teres minor, subscapularis.
- Supraspinatus memulai abduksi (0–15°); deltoid melanjutkan.
- Infraspinatus dan teres minor memutar lengan ke lateral; subscapularis ke medial.
`,
    cards: [
      ['Empat otot rotator cuff', 'Supraspinatus, infraspinatus, teres minor, subscapularis (SITS).'],
      ['Otot yang memulai abduksi lengan (0–15°)', 'M. supraspinatus.'],
      ['Otot rotator cuff yang memutar lengan ke medial', 'M. subscapularis.'],
      ['Otot rotator cuff yang memutar lengan ke lateral', 'M. infraspinatus dan M. teres minor.'],
      ['Saraf yang mempersarafi M. supraspinatus', 'N. suprascapularis.'],
    ],
  },
  fisiologi: {
    chapter: 'Fisiologi ginjal',
    notes: `<!-- materi:v2 -->

## Tujuan Belajar {tujuan}

Setelah membaca catatan contoh ini, kamu bisa:

- menyebutkan pemicu pelepasan renin;
- menjelaskan urutan jalur renin–angiotensin–aldosteron;
- menghubungkan jalur ini dengan tekanan darah dan volume cairan.

## Pelepasan Renin

Sel jukstaglomerular (granular) pada arteriol aferen ginjal melepas ==renin==. Pemicunya: tekanan perfusi ginjal turun, stimulasi simpatis (reseptor β1), dan berkurangnya NaCl yang sampai ke makula densa.

## Jalur Renin–Angiotensin–Aldosteron

1. Renin mengubah angiotensinogen (dari hati) menjadi angiotensin I.
2. ACE (angiotensin-converting enzyme), terutama di endotel paru, mengubah angiotensin I menjadi angiotensin II.
3. Angiotensin II menyebabkan vasokonstriksi dan merangsang sekresi aldosteron dari zona glomerulosa korteks adrenal.
4. Aldosteron meningkatkan reabsorpsi Na+ dan air sehingga volume dan tekanan darah naik.

> [!klinis] Obat penghambat ACE
> ACE inhibitor menurunkan pembentukan angiotensin II sehingga tekanan darah turun. Efek samping khasnya batuk kering.

## Poin High-Yield {highyield}

- Sel jukstaglomerular melepas renin saat perfusi ginjal turun.
- Renin → angiotensin I → (ACE) → angiotensin II → aldosteron.
- Aldosteron berasal dari zona glomerulosa korteks adrenal.
`,
    cards: [
      ['Sel penghasil renin', 'Sel jukstaglomerular (granular) ginjal.'],
      ['Pemicu pelepasan renin', 'Tekanan perfusi ginjal turun, stimulasi simpatis β1, dan NaCl di makula densa berkurang.'],
      ['Enzim yang mengubah angiotensin I menjadi II', 'ACE, terutama di endotel paru.'],
      ['Tempat aldosteron dibuat', 'Zona glomerulosa korteks adrenal.'],
      ['Efek khas obat penghambat ACE', 'Batuk kering.'],
    ],
  },
  biokimia: {
    chapter: 'Metabolisme lipid',
    notes: `<!-- materi:v2 -->

## Tujuan Belajar {tujuan}

Setelah membaca catatan contoh ini, kamu bisa:

- menyebutkan enzim pembatas laju sintesis kolesterol;
- menjelaskan target obat statin;
- membedakannya dengan enzim pembatas laju sintesis asam lemak.

## Sintesis Kolesterol

Kolesterol disintesis terutama di hati dari ==asetil-KoA==: asetil-KoA → HMG-KoA → mevalonat → … → kolesterol. Langkah pembatas lajunya adalah ==HMG-KoA reduktase==, yang mengubah HMG-KoA menjadi mevalonat.

## Sintesis Asam Lemak

Asam lemak disintesis di sitosol. Langkah pembatas lajunya adalah ==asetil-KoA karboksilase==, yang mengubah asetil-KoA menjadi malonil-KoA.

> [!klinis] Statin
> Statin menghambat HMG-KoA reduktase secara kompetitif, sehingga sintesis kolesterol di hati turun dan reseptor LDL meningkat.

## Poin High-Yield {highyield}

- Pembatas laju sintesis kolesterol: HMG-KoA reduktase (target statin).
- Pembatas laju sintesis asam lemak: asetil-KoA karboksilase.
- HMG-KoA reduktase menghasilkan mevalonat.
`,
    cards: [
      ['Enzim pembatas laju sintesis kolesterol', 'HMG-KoA reduktase.'],
      ['Target obat statin', 'HMG-KoA reduktase (dihambat secara kompetitif).'],
      ['Produk reaksi HMG-KoA reduktase', 'Mevalonat.'],
      ['Enzim pembatas laju sintesis asam lemak', 'Asetil-KoA karboksilase.'],
      ['Prekursor awal sintesis kolesterol', 'Asetil-KoA.'],
    ],
  },
};

// Bentuk yang dipakai FlashcardDeck.
export function toCards(key) {
  const s = TUT_STUDY[key];
  return s ? s.cards.map(([front, back], i) => ({ id: `tutorial-${key}-${i}`, ctx: s.chapter, front, back })) : [];
}
