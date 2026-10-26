import test from 'node:test';
import assert from 'node:assert/strict';
import { MODULE_TEMPLATE, actionCounts, bundleSummary, catalogHierarchy, describeEntry, licenseWarnings } from './labAuthoringUi.mjs';

test('minimal template is a full module bundle and summaries include its sections', () => {
  assert.equal(MODULE_TEMPLATE.schemaVersion, 1);
  assert.deepEqual(MODULE_TEMPLATE.records.map((r) => r.kind), ['module']);
  assert.deepEqual(bundleSummary(MODULE_TEMPLATE), { sources: 0, guides: 0, catalogs: 0, modules: 1, placements: 0, chapters: 1, sections: 1, banks: 0, questions: 0, assets: 0 });
});

test('preview labels create, update and unchanged while retaining human titles', () => {
  const entries = [{ kind: 'module', key: 'contoh-modul', action: 'create' }, { kind: 'module', key: 'contoh-modul', action: 'update', changes: ['chapters[pengenalan].sections[orientasi].blocks[tujuan].text'] }, { kind: 'source', action: 'unchanged' }];
  assert.deepEqual(actionCounts(entries), { create: 1, update: 1, unchanged: 1 });
  assert.deepEqual(describeEntry(entries[0], MODULE_TEMPLATE), ['Bab baru: Pengenalan', 'Bagian baru: Pengenalan → Orientasi']);
  const previous = [{ kind: 'module', key: 'contoh-modul', data: MODULE_TEMPLATE.records[0].data }];
  assert.deepEqual(describeEntry(entries[1], MODULE_TEMPLATE, previous), ['Bab diperbarui: Pengenalan', 'Bagian diperbarui: Pengenalan → Orientasi']);
});

test('asset warnings distinguish human license review from draft publication', () => {
  const bundle = { schemaVersion: 1, records: [{ kind: 'source', data: { key: 's', title: 'Sumber', role: 'asset', license: { verified: false } } }, { kind: 'module', data: { key: 'm', chapters: [{ sections: [{ blocks: [{ asset: 'a' }] }] }], questionBanks: [] } }] };
  const media = [{ key: 'a', title: 'Gambar', sourceKey: 's', status: 'draft' }];
  assert.equal(bundleSummary(bundle).assets, 1);
  const warnings = licenseWarnings(bundle, [], media);
  assert.equal(warnings.length, 3);
  assert.ok(warnings.some((w) => w.includes('belum diperiksa manusia')));
  assert.ok(warnings.some((w) => w.includes('masih draft')));
});

test('catalog view shows one module in multiple placements', () => {
  const records = [
    { kind: 'catalog', key: 'a', title: 'Histologi', data: {} },
    { kind: 'catalog', key: 'b', title: 'Kolon', data: { parent: 'a' } },
    { kind: 'module', key: 'm', title: 'Jaringan Kolon' },
    { kind: 'placement', key: 'p1', data: { catalog: 'a', module: 'm' } },
    { kind: 'placement', key: 'p2', data: { catalog: 'b', module: 'm' } },
  ];
  const view = catalogHierarchy(records);
  assert.equal(view[1].title, 'Histologi → Kolon');
  assert.equal(view.flatMap((x) => x.placements).length, 2);
  assert.ok(view.every((x) => x.placements[0].title === 'Jaringan Kolon'));
});
