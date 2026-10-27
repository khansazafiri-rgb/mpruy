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
  const records = [], media = [], saves = [];
  return { records, media, saves,
    findCollectionByNameOrId: (name) => ({ name }),
    findFirstRecordByFilter: (collection, _filter, params) => {
      const found = (collection === 'lab_authoring' ? records : media).find((r) => r.getString('key') === params.key && (!params.kind || r.getString('kind') === params.kind));
      if (!found) throw new Error('missing'); return found;
    },
    findRecordsByFilter: (collection, _filter, _sort, _limit, _offset, params) => (collection === 'lab_authoring' ? records : media).filter((r) => !params?.kind || r.getString('kind') === params.kind),
    save(r) { const list = r.collection === 'lab_authoring' ? records : media; if (!list.includes(r)) list.push(r); saves.push((r.collection === 'lab_media' ? 'asset' : r.getString('kind')) + '/' + r.getString('key')); },
    runInTransaction(fn) {
      const before = [...records, ...media].map((r) => [r, structuredClone(r.values)]), recordCount = records.length, mediaCount = media.length, savesCount = saves.length;
      try { fn(this); } catch (e) { before.forEach(([r, values]) => { r.values = values; }); records.length = recordCount; media.length = mediaCount; saves.length = savesCount; throw e; }
    },
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
test('rich gallery items validate references, preserve metadata, and export without changing legacy galleries', () => {
  const db = app();
  const legacyInput = structuredClone(example.records.find((r) => r.kind === 'module').data);
  legacyInput.chapters[0].sections[0].blocks.push({ key: 'legacy-gallery', type: 'gallery', assets: ['image-example'] });
  const legacy = author.validate('module', legacyInput);
  assert.deepEqual(legacy.chapters[0].sections[0].blocks.find((b) => b.type === 'gallery').assets, ['image-example']);
  const asset = new Record({ name: 'lab_media' });
  asset.set('key', 'image-example'); asset.set('sourceKey', 'original-images'); asset.set('title', 'Image');
  asset.set('alt', 'Image'); asset.set('externalUrl', 'https://example.org/image.png'); asset.set('status', 'published'); db.save(asset);
  const rich = structuredClone(example);
  const module = rich.records.find((r) => r.kind === 'module').data;
  const gallery = { key: 'rich-gallery', type: 'gallery', items: [{ asset: 'image-example', title: 'Normal · Contoh 1', caption: 'Ciri yang perlu dicari. [Sumber: Test]' }] };
  module.chapters[0].sections[0].blocks.push(gallery);
  assert.equal(author.preview(db, rich).ok, true);
  const p = author.preview(db, rich); author.apply(db, { bundle: rich, token: p.token });
  assert.deepEqual(author.exportModule(db, module.key).records.find((r) => r.kind === 'module').data.chapters[0].sections[0].blocks.find((b) => b.type === 'gallery').items, gallery.items);
  assert.equal(author.preview(app(), author.exportModule(db, module.key)).ok, false); // media dependency remains required
  const missing = structuredClone(rich); missing.records.find((r) => r.kind === 'module').data.chapters[0].sections[0].blocks.find((b) => b.type === 'gallery').items[0].asset = 'missing';
  assert.equal(author.preview(db, missing).ok, false);
  const html = structuredClone(rich); html.records.find((r) => r.kind === 'module').data.chapters[0].sections[0].blocks.find((b) => b.type === 'gallery').items[0].caption = '<script>bad</script>';
  assert.equal(author.preview(db, html).ok, false);
  const reviewDb = app(); imageMedia(reviewDb);
  const reviewBundle = imageBundle(true);
  reviewBundle.records.find((r) => r.kind === 'module').data.chapters[0].sections[0].blocks = [{ key: 'rich', type: 'gallery', items: [{ asset: 'image-a', caption: 'Look for a pattern.' }] }];
  const plan = author.preview(reviewDb, reviewBundle);
  assert.equal(plan.ok, true);
  const applied = author.apply(reviewDb, { bundle: reviewBundle, token: plan.token });
  assert.ok(author.reviewBundle(reviewDb, applied.bundle).items.some((item) => item.kind === 'asset' && item.key === 'image-a'));
});
function simpleBundle() {
  return { schemaVersion: 1, records: [
    { kind: 'catalog', data: { key: 'root', title: 'Root' } },
    { kind: 'catalog', data: { key: 'child', title: 'Child', parent: 'root' } },
    { kind: 'module', data: { key: 'lesson', title: 'Lesson', chapters: [{ key: 'one', title: 'One', sections: [{ key: 'intro', title: 'Intro', blocks: [{ key: 'text', type: 'text', text: 'Hello.' }] }] }], sources: [], questionBanks: [], pathways: [] } },
    { kind: 'placement', data: { key: 'placed', title: 'Lesson', module: 'lesson', catalog: 'child' } },
  ] };
}
test('bundle review publishes catalogs in parent order, then module and placement, with one human confirmation', () => {
  const db = app(), bundle = simpleBundle(), plan = author.preview(db, bundle);
  const applied = author.apply(db, { bundle, token: plan.token });
  assert.equal(applied.bundle.records.length, 4);
  assert.equal(author.studentCatalog(db).modules.length, 0); // Apply alone never publishes.
  const review = author.reviewBundle(db, applied.bundle);
  assert.equal(review.ready, true); assert.equal(review.readyCount, 4);
  assert.deepEqual(review.items.map((x) => x.kind + '/' + x.key), ['catalog/root', 'catalog/child', 'module/lesson', 'placement/placed']);
  assert.deepEqual(db.saves.slice(-4), ['catalog/root', 'catalog/child', 'module/lesson', 'placement/placed']); // Draft writes; trial publication rolled back.
  assert.throws(() => author.publishBundle(db, { bundle: applied.bundle, token: review.token, confirmReviewed: false }, { id: 'admin' }), /pemeriksaan manusia/);
  const out = author.publishBundle(db, { bundle: applied.bundle, token: review.token, confirmReviewed: true }, { id: 'admin' });
  assert.equal(out.published, 4);
  assert.deepEqual(db.saves.slice(-4), ['catalog/root', 'catalog/child', 'module/lesson', 'placement/placed']);
  assert.equal(author.studentCatalog(db).modules.length, 1);
  assert.equal(author.studentCatalog(db).placements.length, 1);
  assert.equal(author.studentModule(db, 'lesson', false).title, 'Lesson');
  const again = author.reviewBundle(db, applied.bundle);
  assert.equal(author.publishBundle(db, { bundle: applied.bundle, token: again.token, confirmReviewed: true }, { id: 'admin' }).published, 0);
});
function imageBundle(verified) {
  return { schemaVersion: 1, records: [
    { kind: 'source', data: { key: 'image-source', title: 'Image source', role: 'asset', ingestionAllowed: true, url: 'https://example.org/source', license: { name: 'CC BY', url: 'https://example.org/license', citation: 'Image source', verified, commercialUse: true, redistribution: true } } },
    { kind: 'module', data: { key: 'image-lesson', title: 'Image lesson', sources: [], chapters: [{ key: 'one', title: 'One', sections: [{ key: 'images', title: 'Images', blocks: [{ key: 'image', type: 'image', asset: 'image-a' }] }] }], questionBanks: [], pathways: [] } },
  ] };
}
function imageMedia(db) {
  const asset = new Record({ name: 'lab_media' }); asset.set('key', 'image-a'); asset.set('title', 'Image A'); asset.set('alt', 'An image'); asset.set('sourceKey', 'image-source'); asset.set('externalUrl', 'https://example.org/image.png'); asset.set('status', 'draft'); asset.set('revision', 1); db.save(asset); return asset;
}
test('source, asset and module preflight is all-or-none and lists unverified license blockers', () => {
  const db = app(); imageMedia(db);
  const bundle = imageBundle(false), plan = author.preview(db, bundle), applied = author.apply(db, { bundle, token: plan.token });
  const review = author.reviewBundle(db, applied.bundle);
  assert.equal(review.ready, false); assert.equal(review.total, 3);
  assert.ok(review.problems.some((s) => s.includes('Lisensi aset belum siap')));
  assert.ok(review.problems.some((s) => s.includes('Sumber dan lisensi belum siap')));
  assert.throws(() => author.publishBundle(db, { bundle: applied.bundle, token: review.token, confirmReviewed: true }, { id: 'admin' }), /Bundle belum siap/);
  assert.equal(db.records.every((r) => !r.get('publishedData')), true);
  assert.equal(db.media[0].getString('status'), 'draft');
});
test('source, asset and module publish atomically in dependency order', () => {
  const db = app(); imageMedia(db);
  const bundle = imageBundle(true), plan = author.preview(db, bundle), applied = author.apply(db, { bundle, token: plan.token });
  const review = author.reviewBundle(db, applied.bundle);
  assert.equal(review.ready, true); assert.deepEqual(review.items.map((x) => x.kind), ['source', 'asset', 'module']);
  const out = author.publishBundle(db, { bundle: applied.bundle, token: review.token, confirmReviewed: true }, { id: 'admin' });
  assert.equal(out.published, 3);
  assert.deepEqual(db.saves.slice(-3), ['source/image-source', 'asset/image-a', 'module/image-lesson']);
  assert.equal(author.studentModule(db, 'image-lesson', false).assets['image-a'].url, 'https://example.org/image.png');
});
test('missing dependency and stale review revision block the whole bundle', () => {
  const db = app(), bundle = simpleBundle(), plan = author.preview(db, bundle), applied = author.apply(db, { bundle, token: plan.token });
  const onlyPlacement = { records: applied.bundle.records.filter((r) => r.kind === 'placement') };
  const blocked = author.reviewBundle(db, onlyPlacement);
  assert.equal(blocked.ready, false); assert.ok(blocked.problems.some((s) => s.includes('belum terbit')));
  assert.throws(() => author.publishBundle(db, { bundle: onlyPlacement, token: blocked.token, confirmReviewed: true }, { id: 'admin' }), /Bundle belum siap/);
  const review = author.reviewBundle(db, applied.bundle);
  author.find(db, 'module', 'lesson', true).set('revision', 2);
  assert.throws(() => author.publishBundle(db, { bundle: applied.bundle, token: review.token, confirmReviewed: true }, { id: 'admin' }), /Revisi berubah setelah review/);
  assert.equal(db.records.every((r) => !r.get('publishedData')), true);
  // The original individual action remains available for isolated maintenance.
  author.publish(db, 'catalog', 'root', { revision: 1, confirmReviewed: true }, { id: 'admin' });
  assert.ok(author.find(db, 'catalog', 'root', true).get('publishedData'));
});
test('review token also catches draft mutation when a revision was not incremented', () => {
  const db = app(), bundle = simpleBundle(), plan = author.preview(db, bundle), applied = author.apply(db, { bundle, token: plan.token });
  const review = author.reviewBundle(db, applied.bundle);
  author.find(db, 'module', 'lesson', true).get('data').title = 'Changed behind review';
  assert.throws(() => author.publishBundle(db, { bundle: applied.bundle, token: review.token, confirmReviewed: true }, { id: 'admin' }), /Revisi berubah setelah review/);
  assert.equal(db.records.every((r) => !r.get('publishedData')), true);
});
