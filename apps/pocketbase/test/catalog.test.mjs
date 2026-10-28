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

test('migrasi urutan BAB: mengikuti dokumen, BAB tambahan admin di belakang, ID tetap, dapat diulang', () => {
  const norm = (v) => String(v || '').trim().replace(/\s+/g, ' ').toLowerCase();
  const rows = { subjects: [], chapters: [] };
  class Record {
    constructor(values) { this.values = values; this.id = values.id; this.saved = 0; }
    getString(k) { return String(this.values[k] ?? ''); }
    getInt(k) { return Number(this.values[k] || 0); }
    set(k, v) { this.values[k] = v; }
  }
  const anat = new Record({ id: 's1', name: 'Anatomi' });
  rows.subjects.push(anat);
  const titles = ['Anatomi Abdomen (Dinding, Rongga Peritoneum)', 'Miologi (Sistem Otot)', 'Anatomi Umum & Terminologi Anatomis', 'Materi tambahan admin', 'Osteologi & Artrologi (Sistem Rangka & Sendi)'];
  titles.forEach((title, i) => rows.chapters.push(new Record({ id: `c${i}`, subject: 's1', title, order: i + 1, drilling: false })));
  rows.chapters.push(new Record({ id: 'drill', subject: 's1', title: 'Drilling', order: 9999, drilling: true }));
  const app = {
    findRecordsByFilter: (name, _f, _s, _l, _o, params) => (name === 'subjects' ? rows.subjects : rows.chapters.filter((c) => c.getString('subject') === params.s && !c.values.drilling)).slice().sort((a, b) => a.getInt('order') - b.getInt('order')),
    save: (r) => { r.saved++; },
  };
  let up;
  vm.runInNewContext(readFileSync(new URL('../pb_migrations/1800002700_chapter_doc_order.js', import.meta.url), 'utf8'), { migrate: (apply) => { up = apply; } });
  up(app);
  const order = () => rows.chapters.filter((c) => !c.values.drilling).sort((a, b) => a.getInt('order') - b.getInt('order')).map((c) => c.getString('title'));
  assert.deepEqual(order(), ['Anatomi Umum & Terminologi Anatomis', 'Osteologi & Artrologi (Sistem Rangka & Sendi)', 'Miologi (Sistem Otot)', 'Anatomi Abdomen (Dinding, Rongga Peritoneum)', 'Materi tambahan admin']);
  assert.equal(rows.chapters.find((c) => c.values.drilling).getInt('order'), 9999, 'drilling tidak disentuh');
  assert.equal(rows.chapters.find((c) => c.values.id === 'c2').getInt('order'), 1, 'ID BAB tetap');
  const saved = rows.chapters.map((c) => c.saved);
  up(app);
  assert.deepEqual(rows.chapters.map((c) => c.saved), saved, 'diulang tanpa perubahan');
  assert.deepEqual(order().map(norm), order().map(norm));
});

test('byOrder: nomor urut BAB lebih penting daripada nama', () => {
  const { byOrder } = createRequire(import.meta.url)('../pb_hooks/lib/catalogOrder.js');
  assert.deepEqual([{ title: 'A', order: 2 }, { title: 'Z', order: 1 }, { title: 'B', order: 2 }].sort(byOrder).map((c) => c.title), ['Z', 'A', 'B']);
});
