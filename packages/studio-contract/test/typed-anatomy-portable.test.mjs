import assert from 'node:assert/strict';
import fs from 'node:fs';
import { test } from 'node:test';
import { normalizeTerm, checkTypedAnswer } from '../typed-anatomy.mjs';
test('TYPED-PORT-001 the grader avoids regex features the PocketBase JSVM lacks (Unicode property escapes)', () => {
  assert.equal(/\\p\{/.test(fs.readFileSync(new URL('../typed-anatomy.mjs', import.meta.url), 'utf8')), false);
});
test('TYPED-PORT-002 accents and ligatures fold; Latin-script terms survive normalisation', () => {
  assert.equal(normalizeTerm('Gyrus Frontális  Superior-Sinister'), 'gyrus frontalis superior sinister');
  assert.equal(normalizeTerm('Œsophagus'), 'oesophagus');
  const term = { status: 'approved', conceptId: 'c', forms: [{ language: 'la', value: 'gyrus frontalis superior sinister', side: 'left' }] };
  assert.equal(checkTypedAnswer('Gyrus Frontális Superior Sinister', { conceptId: 'c', side: 'left' }, term).verdict, 'correct');
  assert.equal(checkTypedAnswer('gyrus frontalis superior dexter', { conceptId: 'c', side: 'left' }, term).verdict, 'wrong');
});
