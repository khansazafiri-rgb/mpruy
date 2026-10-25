// Original schematic and fictional values. Seed only via explicit admin action.
const HOOKS = typeof __hooks !== 'undefined' ? __hooks : __dirname + '/..';
const lab = require(HOOKS + '/lib/lab.js');
function create(app) {
  const output = [];
  app.runInTransaction((tx) => {
    function add(kind, body) {
      let existing; try { existing = lab.find(tx, kind, body.slug, false); } catch (_) {}
      if (existing) { const out = lab.adminOut(tx, kind, existing); output.push({ kind, id: out.id, existing: true }); return out; }
      const out = lab.save(tx, kind, '', body); output.push({ kind, id: out.id, existing: false }); return out;
    }
    const a = add('assets', { slug: 'demo-cells', title: 'Ilustrasi sel sintetis', data: {
      url: '/lab-demo/cells.svg', alt: 'Diagram skematis dengan beberapa lingkaran dan satu sel berbentuk elips. Bukan preparat pasien.', synthetic: true,
      license: { source: 'Ilustrasi geometris asli MEDCOEL Lab', dataset: '', license: 'CC0-1.0', commercial_use: true, redistribution: true, modification: true, attribution_required: false, source_url: 'original:medcoel-lab-demo', citation: 'MEDCOEL Lab — ilustrasi demo sintetis, 2026', verified: true },
      annotations: [{ id: 'ellipse', label: 'Contoh bentuk elips (skematis)', layer: 'abnormality', region: { x: 0.61, y: 0.36, width: 0.25, height: 0.28 } }],
    } });
    const image = add('objects', { slug: 'demo-identifikasi-bentuk', title: 'Mengenali bentuk pada gambar', domain: 'histology', modality: 'Ilustrasi mikroskopi', summary: 'Coba zoom, lapisan anotasi, dan latihan memilih area pada ilustrasi sintetis.', tags: ['demo', 'mikroskopi', 'morfologi'], assets: [a.id], data: { demo: true, definition: 'Latihan penggunaan viewer pada ilustrasi geometris. Ini bukan foto histologi dan tidak merepresentasikan diagnosis.', keyFindings: ['Bandingkan lingkaran dengan bentuk elips.'], interpretation: 'Bentuk elips dipakai sebagai target latihan navigasi, bukan tanda penyakit.' } });
    const blood = add('objects', { slug: 'demo-pola-laboratorium', title: 'Membaca pola hasil laboratorium', domain: 'clinical_pathology', modality: 'CBC + ferritin', summary: 'Data fiktif untuk mencoba penanda rendah/normal/tinggi dan interpretasi berbasis aturan.', tags: ['demo', 'anemia', 'CBC', 'ferritin'], related: [image.id], data: { demo: true,
      definition: 'Bandingkan setiap hasil dengan rentang yang dicantumkan untuk kasus latihan ini. Rentang bukan nilai universal.', keyFindings: ['Perhatikan Hb, MCV, MCH, dan ferritin bersama-sama.'], interpretation: 'Pola ini dapat mendukung defisiensi besi. Interpretasi klinis memerlukan konteks pasien dan pemeriksaan lain; ferritin juga dipengaruhi inflamasi.', differentials: ['Penyebab mikrositosis lain perlu dinilai sesuai konteks klinis.'],
      references: [{ title: 'Merck Manual — Evaluation of Anemia', url: 'https://www.merckmanuals.com/professional/hematology/approach-to-the-patient-with-anemia/evaluation-of-anemia' }],
      lab: { context: 'Data sintetis dewasa untuk demonstrasi. Rentang latihan ditetapkan oleh penulis, bukan acuan diagnosis pasien.', rows: [
        { key: 'hb', name: 'Hemoglobin', value: 9, unit: 'g/dL', low: 12, high: 16 },
        { key: 'mcv', name: 'MCV', value: 68, unit: 'fL', low: 80, high: 100 },
        { key: 'mch', name: 'MCH', value: 22, unit: 'pg', low: 27, high: 33 },
        { key: 'ferritin', name: 'Ferritin', value: 8, unit: 'ng/mL', low: 15, high: 150 },
      ], rules: [{ label: 'Pola latihan: anemia mikrositik dengan MCH dan ferritin rendah; pertimbangkan defisiensi besi sesuai konteks.', all: [{ key: 'hb', flag: 'low' }, { key: 'mcv', flag: 'low' }, { key: 'mch', flag: 'low' }, { key: 'ferritin', flag: 'low' }] }] },
    } });
    add('questions', { slug: 'demo-pilih-elips', title: 'Pilih bentuk elips', objects: [image.id], asset: a.id, data: { type: 'hotspot', prompt: 'Klik bagian tengah bentuk elips pada ilustrasi. Kamu juga dapat memakai tombol panah pada gambar.', region: { x: 0.61, y: 0.36, width: 0.25, height: 0.28 }, explanation: 'Elips berada di sisi kanan gambar. Ini latihan memilih area, bukan identifikasi penyakit.' } });
    add('questions', { slug: 'demo-bentuk-mcq', title: 'Identifikasi bentuk', objects: [image.id], asset: a.id, data: { type: 'image_identification', prompt: 'Apa bentuk objek yang memanjang di sisi kanan?', options: [{ label: 'A', text: 'Elips' }, { label: 'B', text: 'Segitiga' }], answer: 'A', explanation: 'Bentuk tersebut adalah elips pada ilustrasi geometris sintetis.' } });
    add('questions', { slug: 'demo-lab-interpretasi', title: 'Interpretasi pola latihan', objects: [blood.id], data: { type: 'structured_lab', prompt: 'Tuliskan pola yang kamu amati dari Hb, MCV, MCH, dan ferritin kasus ini.', answer: 'Hb, MCV, MCH, dan ferritin berada di bawah rentang latihan; pola mendukung anemia mikrositik dengan cadangan besi rendah.', explanation: 'Bandingkan jawabanmu dengan contoh. Latihan uraian ini dinilai mandiri dan tidak menambah poin atau leaderboard.' } });
    add('pathways', { slug: 'demo-lab-fundamentals', title: 'Mulai mengenal MEDCOEL Lab', summary: 'Dua langkah singkat; kamu boleh membuka langkah mana pun.', data: {}, steps: [image.id, blood.id] });
  }); return { items: output };
}
module.exports = { create };
