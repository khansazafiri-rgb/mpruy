// Tes format impor soal (pb_hooks/lib/format.js). Jalankan: npm test
import { createRequire } from 'node:module';
import assert from 'node:assert/strict';

const require = createRequire(import.meta.url);
const f = require('../pb_hooks/lib/format.js');

let lulus = 0;
const tes = (nama, fn) => {
  try { fn(); lulus++; } catch (e) { console.error('GAGAL:', nama, '\n', e); process.exitCode = 1; }
};

tes('array JS dengan kunci tanpa kutip, kutip tunggal, koma di akhir, komentar', () => {
  const teks = `const soal = [
    // komentar
    { questionText: 'Tulang terpanjang?', difficulty: 'mudah', options: [
      { text: 'Femur', correct: true, explanation: 'Femur terpanjang' },
      { text: 'Tibia', },
      'Humerus',
    ], },
  ];`;
  const r = f.parseImport(teks, { chapterTitle: 'Osteologi' });
  assert.equal(r.items.length, 1);
  const it = r.items[0];
  assert.deepEqual(it.errors, []);
  assert.equal(it.question.qtype, 'A');
  assert.equal(it.question.answer, 'A');
  assert.equal(it.question.difficulty, 'easy');
  assert.equal(it.question.options[2].text, 'Humerus');
  assert.equal(it.question.options[0].explanation, 'Femur terpanjang');
  assert.equal(it.question.chapterTitle, 'Osteologi');
});

tes('format Web Olimp optionA-E + correctAnswer + explanation objek', () => {
  const r = f.parseImport([{ questionText: 'Q', optionA: 'a', optionB: 'b', optionC: 'c', correctAnswer: 'c', explanation: { reasoning: 'karena c', distractors: { A: 'a salah' }, pearl: 'ingat c' } }]);
  const q = r.items[0].question;
  assert.equal(q.answer, 'C');
  assert.equal(q.options[0].explanation, 'a salah');
  assert.ok(Array.isArray(q.explanation));
  assert.equal(q.explanation[1].type, 'note');
});

tes('tipe K dengan trueStatements', () => {
  const r = f.parseImport([{ type: 'K', text: 'Pernyataan benar?', statements: ['s1', 's2', 's3', 's4'], trueStatements: [2, 4], difficulty: 'hard' }]);
  const q = r.items[0].question;
  assert.equal(q.qtype, 'K');
  assert.equal(q.answer, 'C');
  assert.equal(q.options.length, 5);
  assert.equal(q.options[4].text, 'Semua benar');
});

tes('tipe K kombinasi tidak baku ditolak', () => {
  const r = f.parseImport([{ type: 'K', text: 'x', statements: ['1', '2', '3', '4'], trueStatements: '1,2' }]);
  assert.equal(r.items[0].question, null);
  assert.match(r.items[0].errors.join(' '), /bukan kombinasi baku/);
});

tes('amplop lama PCV (options.qtype isian)', () => {
  const r = f.parseImport([{ text: 'Sebutkan', options: { qtype: 'isian', subQuestions: [{ label: 'A', question: 'obat', validAnswers: ['Albendazol'] }] } }]);
  const q = r.items[0].question;
  assert.equal(q.qtype, 'isian');
  assert.equal(q.subQuestions[0].validAnswers[0], 'Albendazol');
});

tes('field tidak dikenal hanya peringatan', () => {
  const r = f.parseImport([{ text: 'Q', options: ['a', 'b'], answer: 'B', fooBar: 1 }]);
  assert.ok(r.items[0].question);
  assert.match(r.items[0].warnings.join(' '), /fooBar/);
});

tes('kunci hilang dan dua kunci jadi error bernomor', () => {
  const r = f.parseImport([
    { text: 'Q1', options: ['a', 'b'] },
    { text: 'Q2', options: [{ text: 'a', correct: true }, { text: 'b', correct: true }] },
  ]);
  assert.equal(r.items[0].question, null);
  assert.equal(r.items[1].question, null);
  assert.equal(r.items[1].index, 2);
});

tes('konten kaya: tabel, daftar, catatan, gambar drive -> lh3', () => {
  const r = f.parseImport({
    schemaVersion: 1,
    chapters: [{ title: 'BAB 1', questions: [{
      text: [{ type: 'p', text: 'Lihat **tabel**' }, { type: 'table', header: 'row', rows: [['A', 'B'], ['1', { image: 'https://drive.google.com/file/d/1AbCdEfGhIjKlMnOpQrStUv/view' }]] }],
      options: ['x', 'y'], answer: 1,
      explanation: [{ type: 'ul', items: ['satu', 'dua'] }, { type: 'highyield', text: 'penting' }, { type: 'gambar', url: 'bukan url' }],
    }] }],
  });
  const q = r.items[0].question;
  assert.equal(q.chapterTitle, 'BAB 1');
  assert.equal(q.stem[1].type, 'table');
  assert.equal(q.stem[1].rows[1][1].image, 'https://lh3.googleusercontent.com/d/1AbCdEfGhIjKlMnOpQrStUv');
  assert.equal(q.explanation[0].type, 'list');
  assert.equal(q.explanation[1].variant, 'highyield');
  assert.match(r.items[0].warnings.join(' '), /gambar tanpa tautan/);
});

tes('perbaikan teks rusak karena encoding', () => {
  const r = f.parseImport([{ text: 'tersebutâ€¦', options: ['T1â€“T4', 'b'], answer: 'A' }]);
  assert.equal(r.items[0].question.stem, 'tersebut…');
  assert.equal(r.items[0].question.options[0].text, 'T1–T4');
});

tes('teks yang bukan data ditolak dengan pesan jelas, tidak dijalankan', () => {
  assert.throws(() => f.parseLoose('[1, alert(1)]'), /tidak dikenali/);
  assert.throws(() => f.parseLoose('[{a: 1}'), /tidak ditutup|terpotong/);
});

tes('kampus di file diabaikan', () => {
  const r = f.parseImport({ campus: 'X', questions: [{ text: 'Q', options: ['a', 'b'], answer: 'A' }] });
  assert.match(r.warnings.join(' '), /kampus/);
});

console.log(`format.test: ${lulus} tes lulus`);
