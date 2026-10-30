import assert from 'node:assert/strict';
import test from 'node:test';
import { describeFile, pickFiles } from '../src/files.mjs';

test('nama berkas memuat kode, nomor, dan jumlah; nama asli dipertahankan', () => {
  const d = describeFile('MC261029-SGV2', 2, 10, 'Tissue Bahas Pena B15 UB.docx_compressed.pdf');
  assert.equal(d.filename, 'MC261029-SGV2_PDF-03-dari-10_Tissue Bahas Pena B15 UB.docx_compressed.pdf');
  assert.equal(d.caption, 'MC261029-SGV2 · PDF 3/10 · Tissue Bahas Pena B15 UB.docx_compressed');
});

test('nomor diberi nol di depan sesuai jumlah berkas, supaya urut di daftar unduhan', () => {
  assert.match(describeFile('K', 0, 5, 'a.pdf').filename, /^K_PDF-1-dari-5_/);
  assert.match(describeFile('K', 8, 12, 'a.pdf').filename, /^K_PDF-09-dari-12_/);
});

test('karakter berbahaya dibuang dan nama kosong atau terlalu panjang dirapikan', () => {
  assert.equal(describeFile('K', 0, 1, 'a/b\\c:d*e?.pdf').filename, 'K_PDF-1-dari-1_a_b_c_d_e_.pdf');
  assert.equal(describeFile('K', 0, 1, '').filename, 'K_PDF-1-dari-1_tanpa-nama.pdf');
  assert.ok(describeFile('K', 0, 1, 'x'.repeat(300)).filename.length < 130);
});

test('pickFiles: semua, satu nomor, atau null bila nomor tidak ada', () => {
  const f = ['a', 'b', 'c'];
  assert.equal(pickFiles(f).length, 3);
  assert.deepEqual(pickFiles(f, '2'), [{ file: 'b', index: 1 }]);
  assert.equal(pickFiles(f, '4'), null);
  assert.equal(pickFiles(f, '0'), null);
  assert.equal(pickFiles(f, 'x'), null);
});
