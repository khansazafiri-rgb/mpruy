import assert from 'node:assert/strict';
import { existsSync, readFileSync } from 'node:fs';
import { createRequire } from 'node:module';
import { test } from 'node:test';
import vm from 'node:vm';
const { byName, byPreference } = createRequire(import.meta.url)('../pb_hooks/lib/catalogOrder.js');

test('selected subjects come first, with A-Z order inside both groups', () => {
  const subjects = [{ name: 'Mikrobiologi', order: 1 }, { name: 'Histologi', studying: true, order: 2 }, { name: 'Anatomi', order: 4 }, { name: 'Biokimia', studying: true, order: 9 }];
  assert.deepEqual(subjects.sort(byPreference).map((s) => s.name), ['Biokimia', 'Histologi', 'Anatomi', 'Mikrobiologi']);
  assert.deepEqual([{ title: 'Zat' }, { title: 'Anatomi' }, { title: 'biologi' }].sort(byName).map((c) => c.title), ['Anatomi', 'biologi', 'Zat']);
});

function fixture() {
  let seq = 0;
  class Record {
    constructor(collection) { this.collection = collection; this.values = {}; this.id = ''; }
    getString(key) { return String(this.values[key] || ''); }
    set(key, value) { this.values[key] = value; }
  }
  const illustration = { values: ['anatomi', 'histologi', 'fisiologi', 'biokimia', 'parasitologi', 'mikrobiologi', 'patologi', 'farmakologi', 'imunologi', 'genetika', 'umum'] };
  const cols = { subjects: { name: 'subjects', fields: { getByName: () => illustration } }, chapters: { name: 'chapters' } };
  const rows = { subjects: [], chapters: [] };
  const app = {
    findCollectionByNameOrId: (name) => cols[name],
    findRecordsByFilter: (name, _filter, _sort, _limit, _offset, params) => rows[name].filter((r) => !params?.s || r.getString('subject') === params.s),
    save(r) { if (r.collection && !r.id) { r.id = `rec${++seq}`; rows[r.collection.name].push(r); } },
  };
  const add = (name, data) => { const r = new Record(cols[name]); Object.entries(data).forEach(([k, v]) => r.set(k, v)); app.save(r); return r; };
  const old = {};
  for (const slug of ['anatomi', 'histologi', 'fisiologi', 'biokimia', 'parasitologi', 'mikrobiologi', 'genetika']) old[slug] = add('subjects', { slug, name: slug, hidden: slug === 'histologi', illustration: slug === 'anatomi' ? 'custom.webp' : '', description: slug === 'anatomi' ? 'Deskripsi admin' : '' });
  const chapter = add('chapters', { subject: old.anatomi.id, title: 'Anatomi Kepala & Leher', hidden: true });
  const extraChapter = add('chapters', { subject: old.anatomi.id, title: 'Materi tambahan admin' });
  const extraSubject = add('subjects', { slug: 'materi-admin', name: 'Materi Admin', hidden: true });
  let up, down;
  vm.runInNewContext(readFileSync(new URL('../pb_migrations/1800000400_subject_catalog.js', import.meta.url), 'utf8'), { Record, migrate: (apply, rollback) => { up = apply; down = rollback; } });
  return { app, rows, illustration, old, chapter, extraChapter, extraSubject, up, down };
}

test('32 subjects and 384 chapters preserve existing IDs, uploads, visibility and custom content', () => {
  const f = fixture(); const anatomyId = f.old.anatomi.id; const chapterId = f.chapter.id;
  f.up(f.app);
  assert.equal(f.rows.subjects.length, 33); // 32 source subjects + unrelated admin content.
  assert.equal(f.rows.chapters.length, 385); // 384 source chapters + unrelated admin content.
  assert.equal(f.rows.subjects.find((s) => s.getString('slug') === 'anatomi').id, anatomyId);
  assert.equal(f.old.biokimia.getString('name'), 'Biokimia & Biologi Molekuler');
  assert.equal(f.old.genetika.getString('name'), 'Genetika Kedokteran');
  assert.equal(f.old.genetika.getString('slug'), 'genetika');
  assert.equal(f.old.anatomi.getString('illustration'), 'custom.webp');
  assert.equal(f.old.anatomi.getString('description'), 'Deskripsi admin');
  assert.equal(f.old.histologi.values.hidden, true);
  assert.equal(f.chapter.values.hidden, true);
  assert.ok(f.rows.chapters.some((r) => r.id === chapterId));
  assert.ok(f.rows.chapters.some((r) => r.id === f.extraChapter.id));
  assert.ok(f.rows.subjects.some((r) => r.id === f.extraSubject.id));
  assert.ok(f.illustration.values.includes('sistem-indra-mata'));
  assert.ok(f.illustration.values.includes('umum'));
});

test('reapplying and rolling back never duplicate or remove catalog content', () => {
  const f = fixture(); f.up(f.app); const snapshot = JSON.stringify(f.rows);
  f.up(f.app); assert.equal(JSON.stringify(f.rows), snapshot);
  f.down(f.app); f.up(f.app); assert.equal(JSON.stringify(f.rows), snapshot);
});

 test('every catalog subject has a bundled illustration', () => {
  const f = fixture(); f.up(f.app);
  const keys = f.rows.subjects.filter((s) => s !== f.extraSubject).map((s) => s.getString('illustrationKey'));
  assert.equal(new Set(keys).size, 32);
  for (const key of keys) assert.ok(existsSync(new URL(`../../web/public/illustrations/${key}.webp`, import.meta.url)), `Missing ${key}`);
});
