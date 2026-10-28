import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { test } from 'node:test';
import vm from 'node:vm';

const MARK = '<!-- materi:v2 -->';
const hooks = new URL('../pb_hooks', import.meta.url).pathname;
const contentRoot = new URL('../content/materi/', import.meta.url);
const index = JSON.parse(readFileSync(new URL('index.json', contentRoot), 'utf8'));

class Record {
  constructor(collection) { this.collection = collection; this.values = {}; this.id = ''; }
  getString(key) { return String(this.values[key] ?? ''); }
  getBool(key) { return !!this.values[key]; }
  set(key, value) { this.values[key] = value; }
}

// Aplikasi PocketBase tiruan: hanya yang dipakai migrasi.
function fixture() {
  let seq = 0;
  const cols = { subjects: { name: 'subjects' }, chapters: { name: 'chapters' }, chapter_notes: { name: 'chapter_notes' } };
  const rows = { subjects: [], chapters: [], chapter_notes: [] };
  const app = {
    findCollectionByNameOrId: (name) => cols[name],
    findRecordsByFilter: (name) => rows[name],
    findFirstRecordByFilter(name, _filter, p) {
      const hit = rows[name].find((r) => (name === 'subjects' ? r.getString('slug') === p.s
        : name === 'chapters' ? r.getString('subject') === p.s && r.getString('title') === p.t && !r.getBool('drilling')
          : r.getString('chapter') === p.c));
      if (!hit) throw new Error('sql: no rows');
      return hit;
    },
    save(r) { if (!r.id) { r.id = `rec${++seq}`; rows[r.collection.name].push(r); } },
  };
  return { app, rows, cols };
}

function runMigration(file, app, extra = {}) {
  let up;
  const logs = [];
  vm.runInNewContext(readFileSync(new URL(`../pb_migrations/${file}`, import.meta.url), 'utf8'), {
    migrate: (apply) => { up = apply; },
    Record,
    __hooks: hooks,
    $os: { readFile: (p) => readFileSync(p) },
    toString: (b) => b.toString('utf8'),
    console: { log: (m) => logs.push(m) },
    JSON,
    ...extra,
  });
  up(app);
  return logs;
}

// Katalog sungguhan dari migrasi: daftar mata kuliah dan BAB ditulis sebagai literal `catalog`.
function catalog() {
  const text = readFileSync(new URL('../pb_migrations/1800000400_subject_catalog.js', import.meta.url), 'utf8');
  const start = text.indexOf('const catalog = [') + 'const catalog = '.length;
  const end = text.indexOf('\n];', start) + 3;
  return vm.runInNewContext(text.slice(start, end));
}

test('setiap catatan di index.json menunjuk BAB yang ada di katalog', () => {
  const cat = catalog();
  assert.ok(index.length >= 20);
  for (const e of index) {
    const subject = cat.find((s) => s.slug === e.subject);
    assert.ok(subject, `mata kuliah ${e.subject} tidak ada`);
    assert.ok(subject.chapters.includes(e.chapter), `BAB tidak ada di katalog: ${e.subject} / ${e.chapter}`);
    assert.ok(readFileSync(new URL(e.file, contentRoot), 'utf8').startsWith(MARK), `${e.file}: penanda`);
  }
  const anatomi = cat.find((s) => s.slug === 'anatomi').chapters;
  assert.deepEqual(index.filter((e) => e.subject === 'anatomi').map((e) => e.chapter).sort(), [...anatomi].sort(), 'ke-20 BAB Anatomi lengkap, tanpa kurang atau lebih');
});

function seeded() {
  const f = fixture();
  const subject = new Record(f.cols.subjects); subject.set('slug', 'anatomi'); f.app.save(subject);
  const chapters = index.filter((e) => e.subject === 'anatomi').map((e) => {
    const c = new Record(f.cols.chapters); c.set('subject', subject.id); c.set('title', e.chapter); c.set('drilling', false); f.app.save(c); return c;
  });
  return { ...f, chapters };
}

test('migrasi memasukkan catatan, dan aman dijalankan ulang', () => {
  const f = seeded();
  const logs = runMigration('1800002500_seed_materi.js', f.app);
  assert.equal(f.rows.chapter_notes.length, index.length);
  assert.match(logs.at(-1), /20 dibuat, 0 diperbarui, 0 dilewati/);
  assert.ok(f.rows.chapter_notes.every((n) => n.getString('content').startsWith(MARK)));
  runMigration('1800002500_seed_materi.js', f.app);
  assert.equal(f.rows.chapter_notes.length, index.length, 'tidak ada catatan ganda');
});

test('catatan tulisan admin tidak ditimpa, catatan hasil impor boleh diperbarui', () => {
  const f = seeded();
  const hand = new Record(f.cols.chapter_notes); hand.set('chapter', f.chapters[0].id); hand.set('content', '**Tulisan admin**'); f.app.save(hand);
  const old = new Record(f.cols.chapter_notes); old.set('chapter', f.chapters[1].id); old.set('content', `${MARK}\n\n## Versi lama`); f.app.save(old);
  const logs = runMigration('1800002500_seed_materi.js', f.app);
  assert.equal(hand.getString('content'), '**Tulisan admin**');
  assert.ok(old.getString('content').length > 5000, 'versi impor lama diganti');
  assert.match(logs.at(-1), /18 dibuat, 1 diperbarui, 1 dilewati/);
});

test('BAB yang tidak ditemukan hanya dilaporkan', () => {
  const f = fixture();
  const subject = new Record(f.cols.subjects); subject.set('slug', 'anatomi'); f.app.save(subject);
  const logs = runMigration('1800002500_seed_materi.js', f.app);
  assert.equal(f.rows.chapter_notes.length, 0);
  assert.match(logs.at(-1), /0 dibuat.*20 BAB tidak ditemukan/);
});
