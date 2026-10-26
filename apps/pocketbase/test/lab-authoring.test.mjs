import test from 'node:test';
import assert from 'node:assert/strict';
import { createRequire } from 'node:module';
import { createHash } from 'node:crypto';
const require = createRequire(import.meta.url);
globalThis.BadRequestError = class extends Error {};
globalThis.NotFoundError = class extends Error {};
globalThis.$security = { sha256: (s) => createHash('sha256').update(s).digest('hex') };
let next = 1;
globalThis.Record = class {
  constructor(collection) { this.collection = collection.name; this.id = String(next++).padStart(15, '0'); this.values = {}; }
  get(k) { return this.values[k] ?? null; }
  getString(k) { return this.values[k] ?? ''; }
  getInt(k) { return this.values[k] ?? 0; }
  set(k, v) { this.values[k] = v; }
};
const author = require('../pb_hooks/lib/labAuthoring.js');
const example = require('../../../docs/LAB_AUTHORING_EXAMPLE.json');
function app() {
  const records = [], media = [];
  return { records, media,
    findCollectionByNameOrId: (name) => ({ name }),
    findFirstRecordByFilter: (collection, _filter, params) => {
      const found = (collection === 'lab_authoring' ? records : media).find((r) => r.getString('key') === params.key && (!params.kind || r.getString('kind') === params.kind));
      if (!found) throw new Error('missing'); return found;
    },
    findRecordsByFilter: (collection, _filter, _sort, _limit, _offset, params) => (collection === 'lab_authoring' ? records : media).filter((r) => !params?.kind || r.getString('kind') === params.kind),
    save(r) { const list = r.collection === 'lab_authoring' ? records : media; if (!list.includes(r)) list.push(r); },
    runInTransaction(fn) { fn(this); },
  };
}
test('complete example previews and applies as draft; publish is explicit and answer keys stay server-side', () => {
  const db = app(); const p = author.preview(db, example);
  assert.equal(p.ok, true); assert.equal(p.entries.length, 6); assert.ok(p.entries.every((e) => e.action === 'create'));
  assert.equal(author.apply(db, { bundle: example, token: p.token }).changed, 6);
  assert.equal(author.preview(db, example).entries.every((e) => e.action === 'unchanged'), true);
  assert.deepEqual(author.studentCatalog(db), { nodes: [], placements: [], modules: [] });
  assert.throws(() => author.studentModule(db, 'observasi-visual-dasar', false), /belum terbit/);
  const publish = (kind, key) => author.publish(db, kind, key, { revision: 1, confirmReviewed: true }, { id: 'admin-id' });
  assert.throws(() => publish('placement', 'observasi-di-visual'), /belum terbit/);
  publish('catalog', 'visual-learning'); publish('catalog', 'latihan-observasi'); publish('guide', 'panduan-observasi-dasar');
  publish('module', 'observasi-visual-dasar'); publish('placement', 'observasi-di-latihan'); publish('placement', 'observasi-di-visual');
  const catalog = author.studentCatalog(db);
  assert.equal(catalog.placements.length, 2); assert.equal(catalog.modules.length, 1);
  const student = author.studentModule(db, 'observasi-visual-dasar', false);
  assert.equal(student.questionBanks['bank-observasi'][0].answer, undefined);
  assert.equal(author.answer(db, 'observasi-visual-dasar', 'bank-observasi', 'q-observasi-1', { response: 'A' }).correct, true);
});
test('partial module upsert retains siblings and published snapshot until review', () => {
  const db = app(); const p = author.preview(db, example); author.apply(db, { bundle: example, token: p.token });
  author.publish(db, 'guide', 'panduan-observasi-dasar', { revision: 1, confirmReviewed: true }, { id: 'admin-id' });
  author.publish(db, 'module', 'observasi-visual-dasar', { revision: 1, confirmReviewed: true }, { id: 'admin-id' });
  const patch = { schemaVersion: 1, records: [{ kind: 'module', data: { key: 'observasi-visual-dasar', chapters: [{ key: 'orientasi', sections: [{ key: 'langkah-awal', blocks: [{ key: 'tujuan', type: 'text', text: 'Teks baru.' }] }] }] } }] };
  // Existing block title persists only when supplied; partial block update deliberately requires a complete block.
  assert.equal(author.preview(db, patch).ok, true);
  assert.ok(author.preview(db, patch).entries[0].changes.some((path) => path.includes('tujuan')));
  const result = author.apply(db, { bundle: patch, token: author.preview(db, patch).token });
  assert.equal(result.changed, 1); const m = author.find(db, 'module', 'observasi-visual-dasar', true).get('data');
  assert.equal(m.chapters[0].sections[0].blocks.length, 4);
  assert.equal(m.questionBanks[0].questions.length, 1);
  assert.equal(m.chapters[0].sections[0].blocks[0].text, 'Teks baru.');
  assert.equal(author.studentModule(db, 'observasi-visual-dasar', false).chapters[0].sections[0].blocks[0].text, 'Pisahkan pengamatan dari interpretasi.');
});
test('invalid references, unsupported blocks and restrictive source policy fail closed', () => {
  const db = app();
  const bad = structuredClone(example); bad.records.find((r) => r.kind === 'module').data.chapters[0].sections[0].blocks.push({ key: 'unsafe', type: 'html', text: '<script>alert(1)</script>' });
  assert.equal(author.preview(db, bad).ok, false);
  const orphan = structuredClone(example); orphan.records.find((r) => r.kind === 'placement').data.catalog = 'missing';
  assert.equal(author.preview(db, orphan).ok, false);
  assert.throws(() => author.validate('source', { key: 's', title: 'S', role: 'asset', url: 'http://example.org', license: {} }), /HTTPS/);
  assert.throws(() => author.validate('source', { key: 'reference', title: 'Reference', role: 'reference', ingestionAllowed: true, url: 'https://example.org', license: { name: 'Reference', url: 'https://example.org/license' } }), /reference-only/);
  const restriction = { schemaVersion: 1, records: [
    { kind: 'source', data: { key: 'reference-one', title: 'Reference', role: 'reference', url: 'https://example.org/reference', license: { name: 'Reference', url: 'https://example.org/license', verified: false, commercialUse: false, redistribution: false }, policies: [{ collection: 'module-one', allowed: false, note: 'Restricted' }] } },
    { kind: 'module', data: { key: 'module-one', title: 'Module', sources: ['reference-one'], chapters: [], questionBanks: [], pathways: [] } },
  ] };
  const plan = author.preview(db, restriction); assert.equal(plan.ok, true);
  author.apply(db, { bundle: restriction, token: plan.token });
  author.publish(db, 'source', 'reference-one', { revision: 1, confirmReviewed: true }, { id: 'admin-id' });
  assert.throws(() => author.publish(db, 'module', 'module-one', { revision: 1, confirmReviewed: true }, { id: 'admin-id' }), /Restricted/);
  assert.throws(() => author.preview(db, { schemaVersion: 1, records: [{ op: 'delete', kind: 'module', data: { key: 'module-one' } }] }), /belum didukung/);
});
test('export is re-importable and contains each reused module only once', () => {
  const db = app(), p = author.preview(db, example); author.apply(db, { bundle: example, token: p.token });
  const exported = author.exportModule(db, 'observasi-visual-dasar');
  assert.equal(exported.records.filter((r) => r.kind === 'module').length, 1);
  assert.equal(exported.records.filter((r) => r.kind === 'placement').length, 2);
  assert.equal(author.preview(app(), exported).ok, true);
});
test('registered media key resolves to a URL only after source and asset review', () => {
  const db = app(); const bundle = { schemaVersion: 1, records: [
    { kind: 'source', data: { key: 'original-images', title: 'Original images', role: 'asset', ingestionAllowed: true, url: 'https://example.org/source', license: { name: 'CC BY', url: 'https://example.org/license', citation: 'Original images', verified: true, commercialUse: true, redistribution: true } } },
    { kind: 'module', data: { key: 'image-module', title: 'Image module', sources: [], chapters: [{ key: 'first', title: 'First', sections: [{ key: 'image-section', title: 'Image section', blocks: [{ key: 'picture', type: 'image', asset: 'image-one' }] }] }], questionBanks: [], pathways: [] } },
  ] };
  assert.equal(author.preview(db, bundle).ok, false); // missing media blocks the whole bundle
  const asset = new Record({ name: 'lab_media' }); asset.set('key', 'image-one'); asset.set('title', 'Image'); asset.set('alt', 'Image description'); asset.set('sourceKey', 'original-images'); asset.set('externalUrl', 'https://example.org/image.png'); asset.set('status', 'draft'); asset.set('revision', 1); db.save(asset);
  const p = author.preview(db, bundle); assert.equal(p.ok, true); author.apply(db, { bundle, token: p.token });
  assert.throws(() => author.publish(db, 'module', 'image-module', { revision: 1, confirmReviewed: true }, { id: 'admin-id' }), /belum siap/);
  author.publish(db, 'source', 'original-images', { revision: 1, confirmReviewed: true }, { id: 'admin-id' });
  asset.set('status', 'published'); author.publish(db, 'module', 'image-module', { revision: 1, confirmReviewed: true }, { id: 'admin-id' });
  assert.equal(author.studentModule(db, 'image-module', false).assets['image-one'].url, 'https://example.org/image.png');
});
