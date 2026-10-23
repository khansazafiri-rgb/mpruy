// Mengisi database LOKAL (dev) dengan soal contoh yang benar secara medis, supaya
// rekaman layar iklan menampilkan isi yang masuk akal (bukan soal uji "Pernyataan
// pertama benar"). JANGAN dijalankan ke server produksi.
//
//   PB_SU_EMAIL=... PB_SU_PASSWORD=... DEMO_ADMIN_PASSWORD=<password admin.dev dari seed-dev> node scripts/seed-demo.mjs
const B = process.env.PB_URL || 'http://127.0.0.1:8090';
const SU = { identity: process.env.PB_SU_EMAIL || 'dev@medcoel.local', password: process.env.PB_SU_PASSWORD || 'devpassword123' };
const ADMIN_PW = process.env.DEMO_ADMIN_PASSWORD;
if (!ADMIN_PW) { console.error('Isi DEMO_ADMIN_PASSWORD (password admin.dev yang dicetak seed-dev).'); process.exit(1); }

const call = async (method, p, body, token) => {
  const r = await fetch(B + p, { method, headers: { 'Content-Type': 'application/json', ...(token ? { Authorization: token } : {}) }, body: body ? JSON.stringify(body) : undefined });
  const d = await r.json().catch(() => ({}));
  if (!r.ok) throw new Error(`${method} ${p}: ${r.status} ${JSON.stringify(d).slice(0, 300)}`);
  return d;
};
const su = (await call('POST', '/api/collections/_superusers/auth-with-password', SU)).token;
const admin = (await call('POST', '/api/collections/users/auth-with-password', { identity: 'admin.dev', password: ADMIN_PW })).token;

// opsi: [teks, penjelasan?]; kunci = indeks. Pembahasan per opsi hanya bila ditulis.
const Q = (code, difficulty, text, opts, key, explanation) => ({
  type: 'A', difficulty, code, text,
  options: opts.map((o, i) => ({ text: o[0], correct: i === key, ...(o[1] ? { explanation: o[1] } : {}) })),
  ...(explanation ? { explanation: [{ type: 'note', variant: 'highyield', text: explanation }] } : {}),
});

const DATA = {
  anatomi: [
    { title: 'Anatomi Ekstremitas Atas', questions: [
      Q('DEMO-ANA-1', 'easy', 'Pasien tidak mampu memulai abduksi lengan atas pada 15° pertama. Otot yang paling mungkin terganggu adalah…', [
        ['M. deltoideus', 'Deltoid melanjutkan abduksi setelah 15° sampai sekitar 90°, bukan memulainya.'],
        ['M. supraspinatus', 'Supraspinatus memulai abduksi pada 0-15° pertama sebelum deltoid mengambil alih.'],
        ['M. infraspinatus', 'Infraspinatus berperan dalam rotasi lateral (eksternal) bahu.'],
        ['M. teres minor', 'Teres minor juga terutama memutar lengan ke lateral.'],
        ['M. subscapularis', 'Subscapularis memutar lengan ke medial (internal).']], 1, 'Rotator cuff = SITS: supraspinatus, infraspinatus, teres minor, subscapularis.'),
      Q('DEMO-ANA-2', 'medium', 'Fraktur collum chirurgicum humeri paling sering mencederai saraf…', [
        ['N. axillaris', 'Saraf ini mengitari collum chirurgicum bersama a. circumflexa humeri posterior.'],
        ['N. radialis', 'Saraf radialis berjalan di sulcus nervi radialis pada corpus humeri.'],
        ['N. ulnaris', 'Saraf ulnaris berjalan di belakang epicondylus medialis.'],
        ['N. medianus', 'Saraf medianus berjalan di sisi medial lengan atas bersama a. brachialis.'],
        ['N. musculocutaneus', 'Saraf ini mempersarafi kompartemen fleksor lengan atas.']], 0, 'Cedera n. axillaris: atrofi deltoid dan hilangnya sensasi di area "regimental badge".'),
      Q('DEMO-ANA-3', 'medium', 'Pasien dengan fraktur batang (corpus) humerus tidak dapat melakukan ekstensi pergelangan tangan (wrist drop). Saraf yang terkena adalah…', [
        ['N. radialis', 'Saraf radialis mempersarafi otot-otot ekstensor lengan bawah.'],
        ['N. medianus', 'Cedera medianus menyebabkan "ape hand" dan gangguan fleksi.'],
        ['N. ulnaris', 'Cedera ulnaris menyebabkan "claw hand".'],
        ['N. axillaris', 'Cedera axillaris mengganggu abduksi lengan oleh deltoid.'],
        ['N. musculocutaneus', 'Cedera saraf ini melemahkan fleksi siku.']], 0),
      Q('DEMO-ANA-4', 'easy', 'Kompresi saraf pada terowongan karpal (carpal tunnel syndrome) mengenai saraf…', [
        ['N. medianus', 'Saraf medianus melewati terowongan karpal bersama tendon otot fleksor; kompresinya menimbulkan parestesia ibu jari, telunjuk, dan jari tengah.'],
        ['N. ulnaris', 'Saraf ulnaris melewati kanalis Guyon, bukan terowongan karpal.'],
        ['N. radialis', 'Saraf radialis tidak melewati terowongan karpal; cedera tingginya menyebabkan wrist drop.'],
        ['N. axillaris', 'Saraf axillaris mempersarafi m. deltoideus dan m. teres minor.'],
        ['N. musculocutaneus', 'Saraf ini mempersarafi otot-otot fleksor kompartemen anterior lengan atas.']], 0, 'Gejala: parestesia ibu jari, telunjuk, jari tengah; tanda Tinel dan Phalen.'),
      Q('DEMO-ANA-5', 'easy', 'Berikut ini yang BUKAN bagian dari rotator cuff adalah…', [
        ['M. supraspinatus', 'Bagian rotator cuff (SITS).'],
        ['M. infraspinatus', 'Bagian rotator cuff (SITS).'],
        ['M. teres minor', 'Bagian rotator cuff (SITS).'],
        ['M. subscapularis', 'Bagian rotator cuff (SITS).'],
        ['M. deltoideus', 'Deltoid bukan bagian rotator cuff; ia penggerak utama abduksi setelah 15° pertama.']], 4),
      Q('DEMO-ANA-6', 'medium', 'Struktur yang berjalan di dalam sulcus nervi radialis humerus bersama n. radialis adalah…', [
        ['A. profunda brachii', 'Arteri ini mendampingi n. radialis di sulcus nervi radialis pada permukaan posterior humerus.'],
        ['A. brachialis', 'Berjalan di sisi medial lengan atas bersama n. medianus.'],
        ['A. axillaris', 'Berlanjut menjadi a. brachialis di tepi bawah m. teres major; tidak berada di sulcus nervi radialis.'],
        ['A. circumflexa humeri anterior', 'Melingkari collum chirurgicum di bagian depan, bukan di sulcus nervi radialis.'],
        ['V. cephalica', 'Vena superfisial di sisi lateral lengan; tidak berjalan di sulcus nervi radialis.']], 0),
    ] },
  ],
  fisiologi: [
    { title: 'Fisiologi Ginjal: Filtrasi, Reabsorpsi, Sekresi', questions: [
      Q('DEMO-FIS-1', 'medium', 'Saat tekanan perfusi ginjal turun, sel jukstaglomerular menyekresikan…', [
        ['Aldosteron', 'Aldosteron dihasilkan zona glomerulosa korteks adrenal, sebagai kelanjutan jalur RAA.'],
        ['Renin', 'Sel jukstaglomerular (granular) melepas renin saat perfusi ginjal turun, memulai jalur renin-angiotensin-aldosteron.'],
        ['ADH', 'ADH dibuat di hipotalamus dan dilepas dari hipofisis posterior.'],
        ['ANP', 'ANP dilepas miosit atrium saat atrium teregang; efeknya justru menurunkan tekanan darah.'],
        ['Eritropoietin', 'Eritropoietin dilepas sel interstisial peritubular ginjal terutama sebagai respons terhadap hipoksia.']], 1),
      Q('DEMO-FIS-2', 'easy', 'Hormon yang meningkatkan reabsorpsi air di duktus koligentes melalui pemasangan aquaporin-2 adalah…', [
        ['ADH (vasopresin)'], ['Aldosteron'], ['ANP'], ['Kortisol'], ['Oksitosin']], 0),
    ] },
    { title: 'Fisiologi Kardiovaskular: Siklus Jantung, Curah Jantung', questions: [
      Q('DEMO-FIS-3', 'medium', 'Katup aorta menutup pada awal fase…', [
        ['Pengisian cepat'], ['Kontraksi isovolumetrik'], ['Ejeksi cepat'], ['Relaksasi isovolumetrik'], ['Sistol atrium']], 3),
      Q('DEMO-FIS-4', 'easy', 'Efek utama stimulasi nervus vagus pada nodus sinoatrial adalah…', [
        ['Menurunkan laju denyut jantung'], ['Meningkatkan laju denyut jantung'], ['Meningkatkan kontraktilitas ventrikel'], ['Mempercepat konduksi di nodus AV'], ['Tidak ada efek pada jantung']], 0),
    ] },
    { title: 'Fisiologi Respirasi: Ventilasi, Difusi, Transport Gas', questions: [
      Q('DEMO-FIS-5', 'medium', 'Surfaktan yang menurunkan tegangan permukaan alveolus dihasilkan oleh…', [
        ['Pneumosit tipe I'], ['Pneumosit tipe II'], ['Makrofag alveolus'], ['Sel Clara'], ['Sel goblet']], 1),
    ] },
  ],
  biokimia: [
    { title: 'Metabolisme Kolesterol & Lipoprotein', questions: [
      Q('DEMO-BIO-1', 'medium', 'Enzim pembatas laju sintesis kolesterol, yang juga dihambat oleh statin, adalah…', [
        ['HMG-KoA sintase', 'Enzim ini membentuk HMG-KoA, tetapi bukan langkah pembatas laju.'],
        ['HMG-KoA reduktase', 'HMG-KoA reduktase mengubah HMG-KoA menjadi mevalonat. Inilah langkah pembatas laju dan target statin.'],
        ['Asetil-KoA karboksilase', 'Enzim ini pembatas laju sintesis asam lemak, bukan kolesterol.'],
        ['Skualen epoksidase', 'Enzim ini bekerja di tahap lanjut, setelah skualen terbentuk.'],
        ['Lipoprotein lipase', 'Lipoprotein lipase menghidrolisis trigliserida pada kilomikron dan VLDL.']], 1),
    ] },
    { title: 'Glikolisis & Glukoneogenesis', questions: [
      Q('DEMO-BIO-2', 'medium', 'Enzim pembatas laju (rate-limiting) pada glikolisis adalah…', [
        ['Heksokinase'], ['Fosfofruktokinase-1 (PFK-1)'], ['Piruvat kinase'], ['Aldolase'], ['Enolase']], 1),
      Q('DEMO-BIO-3', 'medium', 'Koenzim yang dibutuhkan piruvat karboksilase untuk mengubah piruvat menjadi oksaloasetat adalah…', [
        ['Biotin'], ['Tiamin pirofosfat'], ['Asam lipoat'], ['FAD'], ['Piridoksal fosfat']], 0),
      Q('DEMO-BIO-4', 'easy', 'Produk akhir glikolisis pada eritrosit, yang tidak memiliki mitokondria, adalah…', [
        ['Laktat'], ['Asetil-KoA'], ['Etanol'], ['Oksaloasetat'], ['Sitrat']], 0),
    ] },
    { title: 'Vitamin Larut Lemak & Larut Air', questions: [
      Q('DEMO-BIO-5', 'easy', 'Defisiensi vitamin yang menyebabkan beriberi adalah…', [
        ['Tiamin (B1)'], ['Riboflavin (B2)'], ['Niasin (B3)'], ['Piridoksin (B6)'], ['Kobalamin (B12)']], 0),
    ] },
    { title: 'Struktur & Fungsi Protein & Asam Amino', questions: [
      Q('DEMO-BIO-6', 'easy', 'Unit penyusun utama protein adalah…', [
        ['Asam lemak', 'Asam lemak menyusun lipid, bukan protein.'],
        ['Monosakarida', 'Monosakarida menyusun karbohidrat.'],
        ['Asam amino', 'Asam amino saling terhubung melalui ikatan peptida untuk membentuk rantai protein.'],
        ['Nukleotida', 'Nukleotida menyusun asam nukleat.'],
        ['Gliserol', 'Gliserol adalah tulang punggung trigliserida.']], 2),
    ] },
  ],
};

// 1) Bersihkan soal uji bawaan seed-dev (kode DEV-*) dan BAB tambahan yang dibuatnya.
const old = (await call('GET', `/api/collections/questions/records?perPage=200&filter=${encodeURIComponent('code ~ "DEV-"')}`, null, su)).items;
for (const q of old) await call('DELETE', `/api/collections/questions/records/${q.id}`, null, su);
for (const t of ['Osteologi', 'Miologi', 'Neuroanatomi']) {
  const f = (await call('GET', `/api/collections/chapters/records?filter=${encodeURIComponent(`title="${t}"`)}`, null, su)).items;
  for (const c of f) { try { await call('DELETE', `/api/collections/chapters/records/${c.id}`, null, su); } catch (_) { /* masih dipakai */ } }
}
console.log(`Soal uji lama dihapus: ${old.length}`);

// 2) Impor soal contoh.
let total = 0;
for (const [subject, chapters] of Object.entries(DATA)) {
  for (const ch of chapters) {
    const r = await call('POST', '/api/medcoel/agent/import', { subject, chapter: ch.title, scope: 'all', questions: ch.questions }, admin);
    total += r.created;
    console.log(`${subject} / ${ch.title}: ${r.created} dibuat, ${r.duplicates} dobel`);
  }
}

// 3) Mata kuliah yang sedang dipelajari akun contoh (tampil paling atas).
const subs = (await call('GET', '/api/medcoel/public-subjects')).items;
const ids = ['anatomi', 'fisiologi', 'biokimia'].map((s) => subs.find((x) => x.slug === s).id);
const u = (await call('GET', `/api/collections/users/records?filter=${encodeURIComponent('loginId="mahasiswa.dev"')}`, null, su)).items[0];
await call('PATCH', `/api/collections/users/records/${u.id}`, { studyingSubjects: ids }, su);
console.log(`Selesai. Soal contoh: ${total}.`);
