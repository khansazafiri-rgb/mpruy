import { createRequire } from 'node:module';
import assert from 'node:assert/strict';
import test from 'node:test';
const require = createRequire(import.meta.url);
const clinical = require('../pb_hooks/lib/clinicalEnglish.js');
const en = require('../pb_hooks/lib/explanationEnglish.js');

test('clinical translation targets prose only; diagnostic IDs, relevance ratings and case actions cannot change', () => {
  const data = { id: 'Pak A, 25 tahun', pas: 'bapak', expr: 'lemas', dxOk: 'pneumonia', ddx: ['pneumonia', 'tb'], K: 'ku vital', U: 'dl', B: 'pulang', intro: [{ w: 'pas', e: 'lemas', t: 'Saya demam.' }], ref: 'Acuan sumber', A: { ku: { say: 'Saya demam.', note: 'Demam (+)', e: 'lemas' }, vital: { title: 'Tanda vital', rows: 'Nadi=90 x/menit;Suhu=38 °C' } } };
  const parts = clinical.parts(data);
  assert.ok(!parts.some((p) => p.path.includes('dxOk') || p.path.includes('K') || p.path.includes('e')));
  const result = clinical.apply(data, parts.map((p) => p.source === 'Saya demam.' ? 'I have a fever.' : p.source));
  assert.equal(result.intro[0].t, 'I have a fever.'); assert.equal(result.A.ku.say, 'I have a fever.');
  for (const k of ['pas', 'expr', 'dxOk', 'ddx', 'K', 'U', 'B']) assert.deepEqual(result[k], data[k]);
  assert.equal(data.intro[0].t, 'Saya demam.');
  const values = parts.map((p) => p.source);
  assert.deepEqual(clinical.validate(data, values), []);
  values[parts.findIndex((p) => p.path.at(-1) === 'rows')] = 'Pulse 90, Temperature 38';
  assert.equal(clinical.validate(data, values).length, 1);
});

test('full-question segments include stem, options, type K statements and subquestions but never accepted answers', () => {
  const q = { stem: 'Soal sumber', hint: 'Petunjuk', statements: ['Pernyataan 1'], options: [{ label: 'A', text: 'nervus medianus' }], subQuestions: [{ label: 'x', question: 'Pertanyaan', validAnswers: ['kunci rahasia'] }], explanation: 'Pembahasan' };
  const parts = en.segments(q, true);
  assert.ok(parts.some((p) => p.id === 'stem'));
  assert.ok(parts.some((p) => p.id === 'options.0.text'));
  assert.ok(!JSON.stringify(parts).includes('kunci rahasia'));
  const rendered = en.apply(q, parts.map((p) => ({ id: p.id, text: p.id === 'stem' ? 'English question' : p.source })), true);
  assert.equal(rendered.stem, 'English question');
  assert.ok(!('validAnswers' in rendered.subQuestions[0])); assert.ok(!('answer' in rendered));
});
