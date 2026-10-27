import assert from 'node:assert/strict';
import test from 'node:test';
import { authoredExplore, authoredRootOptions, modulePath } from './labDiscovery.js';

const catalog = {
  nodes: [{ key: 'oftalmologi', title: 'Oftalmologi', parent: '' },
    { key: 'oct-retina', title: 'OCT Retina', parent: 'oftalmologi' },
    { key: 'patologi', title: 'Patologi', parent: '' }],
  placements: [{ key: 'oct-home', catalog: 'oct-retina', module: 'oct-retina-dasar-v1' },
    { key: 'oct-second', catalog: 'oftalmologi', module: 'oct-retina-dasar-v1' },
    { key: 'unpublished', catalog: 'patologi', module: 'draft-only' }],
  modules: [{ key: 'oct-retina-dasar-v1', title: 'Dasar Interpretasi OCT Retina', summary: 'Pengenalan OCT.' }],
};

test('published authored module joins Explore once and has its existing URL', () => {
  const cards = authoredExplore(catalog);
  assert.equal(cards.length, 1);
  assert.equal(cards[0].href, '/lab/modul/oct-retina-dasar-v1');
  assert.equal(cards[0].domainTitle, 'Oftalmologi');
  assert.equal(cards[0].modality, 'OCT Retina');
  assert.equal(authoredExplore(catalog, { page: 2 }).length, 0);
});

test('dynamic root filter and title, summary, root and child search', () => {
  assert.deepEqual(authoredRootOptions(catalog), [{ key: 'catalog:oftalmologi', title: 'Oftalmologi' }]);
  assert.equal(authoredExplore(catalog, { domain: 'catalog:oftalmologi' }).length, 1);
  assert.equal(authoredExplore(catalog, { domain: 'imaging' }).length, 0);
  for (const q of ['OCT', 'retina', 'oftalmologi', 'pengenalan']) assert.equal(authoredExplore(catalog, { q }).length, 1);
  assert.equal(authoredExplore(catalog, { q: 'jantung' }).length, 0);
});

test('unpublished module cannot be discovered even with a stale placement', () => {
  assert.ok(!authoredExplore(catalog).some((card) => card.href.includes('draft-only')));
  assert.ok(!authoredRootOptions(catalog).some((option) => option.title === 'Patologi'));
});

test('module path shows discipline then topic, and is empty when unknown', () => {
  assert.deepEqual(modulePath(catalog, 'oct-retina-dasar-v1'), ['Oftalmologi', 'OCT Retina']);
  assert.deepEqual(modulePath(catalog, 'draft-only'), []);
  assert.deepEqual(modulePath(null, 'x'), []);
});
