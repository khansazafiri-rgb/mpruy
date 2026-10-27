import assert from 'node:assert/strict';
import test from 'node:test';
import { citationAnchor, citationIndex, citationParts } from './labCitations.js';

const index = citationIndex({ b: { key: 'b', title: 'Source B' }, a: { key: 'a', title: 'Source A' } });

test('single, multiple and repeated citations reuse stable numbers', () => {
  const first = citationParts('Cari pola. [Sumber: Source A]', index);
  assert.equal(first[0].value, 'Cari pola.');
  assert.deepEqual(first.at(-1).sources.map((source) => source.number), [1]);
  const two = citationParts('Bandingkan. [Sumber: Source B; Source A] Lanjut. [Sumber: Source A]', index);
  assert.deepEqual(two.filter((part) => part.type === 'citations').map((part) => part.sources.map((source) => source.number)), [[2, 1], [1]]);
  assert.ok(!JSON.stringify(two).includes('[Sumber:'));
  assert.equal(citationAnchor('oct-retina', 'a'), 'oct-retina-source-a');
});

test('unknown marker remains visible rather than losing provenance', () => {
  const parts = citationParts('Ciri. [Sumber: Source A; Missing]', index);
  assert.equal(parts.map((part) => part.value || '').join(''), 'Ciri. [Sumber: Source A; Missing]');
});
