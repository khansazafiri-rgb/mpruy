import assert from 'node:assert/strict';
import { test } from 'node:test';
import { createRequire } from 'node:module';
const require = createRequire(import.meta.url);
globalThis.BadRequestError = class extends Error {};
const lab = require('../pb_hooks/lib/lab.js');
test('lab engine respects exact boundaries and only matches complete rules', () => {
  const data = { rows: [{ key: 'a', value: 10, low: 10, high: 20 }, { key: 'b', value: 9, low: 10, high: 20 }], rules: [{ label: 'match', all: [{ key: 'a', flag: 'normal' }, { key: 'b', flag: 'low' }] }, { label: 'no', all: [{ key: 'a', flag: 'low' }] }, { label: 'empty', all: [] }] };
  assert.deepEqual(lab.labResult(data).matches, ['match']);
  data.rows[0].value = 20; assert.equal(lab.labResult(data).rows[0].flag, 'normal');
  data.rows[0].value = 21; assert.equal(lab.labResult(data).rows[0].flag, 'high');
});
test('coordinates reject invalid, negative, zero-size and out-of-frame regions', () => {
  for (const region of [{ x: 0, y: 0, width: 0, height: 1 }, { x: -1, y: 0, width: 1, height: 1 }, { x: 0.9, y: 0, width: 0.2, height: 1 }, { x: NaN, y: 0, width: 1, height: 1 }]) assert.throws(() => lab.rect(region));
  assert.deepEqual(lab.rect({ x: 0, y: 0, width: 1, height: 1 }), { x: 0, y: 0, width: 1, height: 1 });
});
test('license publishing fails closed for unknown commercial/redistribution rights and attribution', () => {
  const l = { verified: true, commercial_use: true, redistribution: true, attribution_required: true, citation: 'Source' };
  assert.equal(lab.licenseReady({ license: l }), true);
  for (const patch of [{ verified: false }, { commercial_use: false }, { redistribution: false }, { citation: '' }]) assert.ok(!lab.licenseReady({ license: { ...l, ...patch } }));
});
test('unsafe source URLs cannot be saved', () => {
  for (const url of ['javascript:alert(1)', 'data:image/svg+xml,x', '//example.com/x', 'http://example.com/x', 'https://user:pass@example.com/x']) assert.equal(lab.safeUrl(url), false);
  assert.equal(lab.safeUrl('https://example.com/image.png'), true);
});
test('question schema supports reusable objects and rejects invalid MCQ keys', () => {
  const b = { slug: 'test', title: 'Test', objects: ['aaaaaaaaaaaaaaa', 'bbbbbbbbbbbbbbb'], data: { type: 'single_best_answer', prompt: 'Choose', options: [{ label: 'A', text: 'one' }, { label: 'B', text: 'two' }], answer: 'C', explanation: 'Reason' } };
  assert.throws(() => lab.validate('questions', b)); b.data.answer = 'A'; b.data.internalAiPrompt = 'private';
  const v = lab.validate('questions', b); assert.equal(v.objects.length, 2); assert.equal(v.data.internalAiPrompt, undefined);
});
test('structured lab validation rejects incomplete, duplicate or arbitrary rule expressions', () => {
  const b = { slug: 'test', title: 'Test', domain: 'clinical_pathology', data: { lab: { rows: [{ key: 'hb', name: 'Hb', value: 9, unit: 'g/dL', low: 12, high: 16 }], rules: [{ label: 'low', all: [{ key: 'hb', flag: 'low' }] }] } } };
  assert.equal(lab.validate('objects', b).data.lab.rows.length, 1);
  b.data.lab.rules[0].all[0].flag = 'eval'; assert.throws(() => lab.validate('objects', b));
  b.data.lab.rules = []; b.data.lab.rows.push(b.data.lab.rows[0]); assert.throws(() => lab.validate('objects', b));
});
