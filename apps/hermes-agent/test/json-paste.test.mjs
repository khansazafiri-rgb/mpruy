import test from 'node:test';
import assert from 'node:assert/strict';
import { parsePut, stripFences, joinChunks, tryParse, countQuestions, findSubmissionCode, TELEGRAM_MESSAGE_LIMIT } from '../src/json-paste.mjs';

test('parsePut membaca kode dan isi di baris yang sama atau baris berikutnya', () => {
  assert.deepEqual(parsePut('/put MC261024-ABCD\n[1,2]'), { code: 'MC261024-ABCD', body: '[1,2]' });
  assert.deepEqual(parsePut('/put MC261024-ABCD [1,2]'), { code: 'MC261024-ABCD', body: '[1,2]' });
  assert.deepEqual(parsePut('/put@medcoel_bot MC261024-ABCD'), { code: 'MC261024-ABCD', body: '' });
});

test('parsePut tanpa kode tidak menganggap JSON sebagai kode', () => {
  assert.deepEqual(parsePut('/put [{"a":1}]'), { code: '', body: '[{"a":1}]' });
  assert.deepEqual(parsePut('/put\n{"questions":[]}'), { code: '', body: '{"questions":[]}' });
  assert.deepEqual(parsePut('/put'), { code: '', body: '' });
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
