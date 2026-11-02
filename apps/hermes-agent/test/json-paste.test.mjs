import test from 'node:test';
import assert from 'node:assert/strict';
import { parsePut, pdfNumberFromName, resolvePdf, stripFences, joinChunks, tryParse, countQuestions, findSubmissionCode, TELEGRAM_MESSAGE_LIMIT } from '../src/json-paste.mjs';

test('parsePut membaca kode dan isi di baris yang sama atau baris berikutnya', () => {
  assert.deepEqual(parsePut('/put MC261024-ABCD\n[1,2]'), { code: 'MC261024-ABCD', pdf: 0, body: '[1,2]' });
  assert.deepEqual(parsePut('/put MC261024-ABCD [1,2]'), { code: 'MC261024-ABCD', pdf: 0, body: '[1,2]' });
  assert.deepEqual(parsePut('/put@medcoel_bot MC261024-ABCD'), { code: 'MC261024-ABCD', pdf: 0, body: '' });
});

test('parsePut tanpa kode tidak menganggap JSON sebagai kode', () => {
  assert.deepEqual(parsePut('/put [{"a":1}]'), { code: '', pdf: 0, body: '[{"a":1}]' });
  assert.deepEqual(parsePut('/put\n{"questions":[]}'), { code: '', pdf: 0, body: '{"questions":[]}' });
  assert.deepEqual(parsePut('/put'), { code: '', pdf: 0, body: '' });
  assert.equal(parsePut('/putar'), null);
  assert.equal(parsePut('halo'), null);
});

test('stripFences membuang pagar kode markdown', () => {
  assert.equal(stripFences('```json\n[1]\n```'), '[1]');
  assert.equal(stripFences('```\n[1]\n```'), '[1]');
  assert.equal(stripFences('  [1]  '), '[1]');
});

test('joinChunks: pesan pendek dipisah baris baru, pesan sepanjang batas Telegram disambung rapat', () => {
  assert.equal(joinChunks(['[', '1,', '2]']), '[\n1,\n2]');
  const full = '"' + 'x'.repeat(TELEGRAM_MESSAGE_LIMIT - 2);
  assert.equal(joinChunks(['[' + full, 'yy"]']).endsWith('xyy"]'), true);
});

test('tryParse memberi posisi galat', () => {
  assert.equal(tryParse('[1,2]').ok, true);
  const bad = tryParse('[\n  {"a": 1,}\n]');
  assert.equal(bad.ok, false);
  assert.equal(bad.line, 2);
});

test('countQuestions dan findSubmissionCode', () => {
  assert.equal(countQuestions([{}, {}]), 2);
  assert.equal(countQuestions({ questions: [{}] }), 1);
  assert.equal(countQuestions({}), 0);
  assert.equal(findSubmissionCode('file MC261024-abcd.json'), 'MC261024-ABCD');
  assert.equal(findSubmissionCode('tanpa kode'), '');
});

test('parsePut membaca nomor PDF setelah kode (angka polos, #, no, nomor, pdf)', () => {
  assert.deepEqual(parsePut('/put MC261024-ABCD 2\n[1]'), { code: 'MC261024-ABCD', pdf: 2, body: '[1]' });
  assert.deepEqual(parsePut('/put MC261024-ABCD #3 [1]'), { code: 'MC261024-ABCD', pdf: 3, body: '[1]' });
  assert.deepEqual(parsePut('/put MC261024-ABCD pdf 10'), { code: 'MC261024-ABCD', pdf: 10, body: '' });
  assert.deepEqual(parsePut('/put MC261024-ABCD nomor 4\n{"slides":[]}'), { code: 'MC261024-ABCD', pdf: 4, body: '{"slides":[]}' });
  // JSON yang diawali angka bukan nomor PDF karena JSON dimulai dengan [ atau {
  assert.equal(parsePut('/put MC261024-ABCD [2]').pdf, 0);
  assert.equal(parsePut('/put 5').pdf, 0);
});

test('nomor PDF dari nama berkas JSON yang meniru nama PDF kiriman Hermes', () => {
  assert.equal(pdfNumberFromName('MC261029-SGV2_PDF-03-dari-10_Tissue Bahas.json'), 3);
  assert.equal(pdfNumberFromName('MC261029-SGV2_MATERI_PDF-2-dari-3_Bab 2.json'), 2);
  assert.equal(pdfNumberFromName('soal-bab-1.json'), 0);
});

test('resolvePdf: satu PDF otomatis, beberapa PDF lewat nomor, nomor salah ditandai', () => {
  const f = [{ n: 1, title: 'Satu' }, { n: 2, title: 'Dua' }, { n: 3, title: 'Tiga' }];
  assert.deepEqual(resolvePdf([f[0]], 0), { title: 'Satu', pdf: 1, count: 1 });
  assert.deepEqual(resolvePdf(f, 2), { title: 'Dua', pdf: 2, count: 3 });
  assert.deepEqual(resolvePdf(f, 0), { title: '', pdf: 0, count: 3 });
  assert.equal(resolvePdf(f, 9).missing, true);
  assert.deepEqual(resolvePdf(undefined, 0), { title: '', pdf: 0, count: 0 });
});
