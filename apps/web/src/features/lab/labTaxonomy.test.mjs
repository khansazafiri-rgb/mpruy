import assert from 'node:assert/strict';
import test from 'node:test';
import { DISCIPLINES, disciplineOf, groupByDiscipline, legacyDomainTitle } from './labTaxonomy.js';

test('canonical academic order is fixed', () => {
  assert.deepEqual(DISCIPLINES.map((d) => d.title), ['Pencitraan Medis', 'Oftalmologi', 'Histologi & Histopatologi', 'Patologi Klinik', 'Mikrobiologi', 'Parasitologi', 'Anatomi']);
});

test('legacy domain keys and old names map to canonical disciplines', () => {
  assert.equal(legacyDomainTitle('imaging'), 'Pencitraan Medis');
  assert.equal(legacyDomainTitle('anatomy'), 'Anatomi');
  assert.equal(legacyDomainTitle('unknown'), 'unknown');
  assert.equal(disciplineOf({ domain: 'clinical_pathology' }).key, 'patologi-klinik');
  assert.equal(disciplineOf({ domainTitle: 'Medical Imaging' }).key, 'pencitraan-medis');
  assert.equal(disciplineOf({ domainTitle: 'Histologi dan Histopatologi' }).key, 'histologi-histopatologi');
  assert.equal(disciplineOf({ domainTitle: 'Histologi & Histopatologi' }).key, 'histologi-histopatologi');
  assert.equal(disciplineOf({ domainTitle: 'Sesuatu yang lain' }), null);
});

const item = (id, domainTitle, modality, extra = {}) => ({ id, title: id, domainTitle, modality, ...extra });

test('groups follow canonical order, then topic; empty disciplines are reported as soon', () => {
  const { groups, soon } = groupByDiscipline([
    item('hema', 'Patologi Klinik', 'Hematologi'),
    item('cxr', 'Pencitraan Medis', 'Chest X-Ray'),
    item('oct', 'Oftalmologi', 'OCT Retina'),
    item('coll', 'Histologi & Histopatologi', 'Histologi Kolorektal'),
  ]);
  assert.deepEqual(groups.map((g) => g.title), ['Pencitraan Medis', 'Oftalmologi', 'Histologi & Histopatologi', 'Patologi Klinik']);
  assert.deepEqual(groups[0].topics.map((t) => t.title), ['Chest X-Ray']);
  assert.deepEqual(soon.map((d) => d.title), ['Mikrobiologi', 'Parasitologi', 'Anatomi']);
});

test('legacy items join the same discipline as authored modules and never disappear', () => {
  const { groups } = groupByDiscipline([
    item('mod', 'Pencitraan Medis', 'Chest X-Ray'),
    { id: 'old', title: 'old', domain: 'imaging', modality: 'Chest X-Ray' },
    { id: 'odd', title: 'odd', domainTitle: 'Disiplin Baru', modality: '' },
  ]);
  assert.equal(groups[0].title, 'Pencitraan Medis');
  assert.equal(groups[0].count, 2);
  assert.equal(groups[0].topics.length, 1);
  assert.equal(groups.at(-1).title, 'Disiplin Baru');
});
