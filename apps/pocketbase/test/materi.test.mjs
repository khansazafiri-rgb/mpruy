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
      const hit = rows[name].find((r) => (name === 'subjects' ? r.getString('slug') === p.s || (p.n && r.getString('name') === p.n)
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
  const histologi = cat.find((s) => s.slug === 'histologi').chapters;
  assert.deepEqual(index.filter((e) => e.subject === 'histologi').map((e) => e.chapter).sort(), [...histologi].sort(), 'ke-12 BAB Histologi lengkap');
  const fisiologi = cat.find((s) => s.slug === 'fisiologi').chapters;
  assert.deepEqual(index.filter((e) => e.subject === 'fisiologi').map((e) => e.chapter).sort(), [...fisiologi].sort(), 'ke-20 BAB Fisiologi lengkap');
  const biokimia = cat.find((s) => s.slug === 'biokimia').chapters;
  assert.deepEqual(index.filter((e) => e.subject === 'biokimia').map((e) => e.chapter).sort(), [...biokimia].sort(), 'ke-18 BAB Biokimia lengkap');
  const genetika = cat.find((s) => s.slug === 'genetika-kedokteran').chapters;
  assert.deepEqual(index.filter((e) => e.subject === 'genetika-kedokteran').map((e) => e.chapter).sort(), [...genetika].sort(), 'ke-6 BAB Genetika Kedokteran lengkap');
  // BAB Genetika yang ikut terketik di dokumen Biokimia tidak boleh masuk Biokimia.
  for (const e of index.filter((x) => x.subject === 'biokimia')) {
    const text = readFileSync(new URL(e.file, contentRoot), 'utf8');
    assert.ok(!/Hereditas Mendel|Down Syndrome|Autosomal Dominant — Pola Dasar/.test(text), `${e.file}: isi Genetika masuk Biokimia`);
  }
  for (const e of index) assert.ok(e.subjectName, `${e.file}: subjectName`);
  const patologi = cat.find((s) => s.slug === 'patologi-anatomi').chapters;
  assert.deepEqual(index.filter((e) => e.subject === 'patologi-anatomi').map((e) => e.chapter).sort(), [...patologi].sort(), 'ke-13 BAB Patologi Anatomi lengkap');
  const parasit = cat.find((s) => s.slug === 'parasitologi').chapters;
  assert.deepEqual(index.filter((e) => e.subject === 'parasitologi').map((e) => e.chapter).sort(), [...parasit].sort(), 'ke-8 BAB Parasitologi lengkap');
  // Mikrobiologi: BAB 10 (Virus Eksantematous) masih kosong di dokumen sumber, jadi sengaja belum ada catatannya.
  const mikro = cat.find((s) => s.slug === 'mikrobiologi').chapters;
  const have = index.filter((e) => e.subject === 'mikrobiologi').map((e) => e.chapter);
  assert.deepEqual([...mikro.filter((c) => !have.includes(c))], ['Virus Eksantematous (Campak, Rubella, Varicella)']);
  assert.equal(have.length, 11);
});

function seeded() {
  const f = fixture();
  const subjects = {};
  [...new Set(index.map((e) => e.subject))].forEach((slug) => { const r = new Record(f.cols.subjects); r.set('slug', slug); f.app.save(r); subjects[slug] = r; });
  const chapters = index.map((e) => {
    const c = new Record(f.cols.chapters); c.set('subject', subjects[e.subject].id); c.set('title', e.chapter); c.set('drilling', false); f.app.save(c); return c;
  });
  return { ...f, chapters, subjects };
}

test('migrasi memasukkan catatan, dan aman dijalankan ulang', () => {
  const f = seeded();
  const logs = runMigration('1800002500_seed_materi.js', f.app);
  assert.equal(f.rows.chapter_notes.length, index.length);
  assert.match(logs.at(-1), new RegExp(`${index.length} dibuat, 0 diperbarui, 0 dilewati`));
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
  assert.match(logs.at(-1), new RegExp(`${index.length - 2} dibuat, 1 diperbarui, 1 dilewati`));
});

test('BAB yang tidak ditemukan hanya dilaporkan', () => {
  const f = fixture();
  const subject = new Record(f.cols.subjects); subject.set('slug', 'anatomi'); f.app.save(subject);
  const logs = runMigration('1800002500_seed_materi.js', f.app);
  assert.equal(f.rows.chapter_notes.length, 0);
  assert.match(logs.at(-1), new RegExp(`0 dibuat.*${index.length} BAB tidak ditemukan`));
});

// ---- pemasangan saat PocketBase mulai (pb_hooks/lib/materiSync.js) ----
import { createHash } from 'node:crypto';

function runSync(app) {
  const mod = { exports: {} };
  const logs = [];
  vm.runInNewContext(readFileSync(new URL('../pb_hooks/lib/materiSync.js', import.meta.url), 'utf8'), {
    module: mod, __hooks: hooks, $os: { readFile: (p) => readFileSync(p) }, toString: (b) => b.toString('utf8'), Record, JSON,
    $security: { sha256: (t) => createHash('sha256').update(t).digest('hex') },
    console: { log: (m) => logs.push(m) },
  });
  return { r: mod.exports.sync(app), logs };
}
const sha = (t) => createHash('sha256').update(t).digest('hex');
const fileOf = (i) => readFileSync(new URL(index[i].file, contentRoot), 'utf8');

test('sinkronisasi: mata kuliah dengan slug lama dicocokkan lewat nama (Genetika: "genetika")', () => {
  const f = fixture();
  const subject = new Record(f.cols.subjects); subject.set('slug', 'genetika'); subject.set('name', 'Genetika Kedokteran'); f.app.save(subject);
  const e = index.find((x) => x.subject === 'genetika-kedokteran');
  const c = new Record(f.cols.chapters); c.set('subject', subject.id); c.set('title', e.chapter); c.set('drilling', false); f.app.save(c);
  const { r } = runSync(f.app);
  assert.equal(r.made, 1);
  assert.equal(f.rows.chapter_notes[0].getString('chapter'), c.id);
});

test('sinkronisasi: membuat catatan, berikut sidik jarinya, dan idempoten', () => {
  const f = seeded();
  const { r } = runSync(f.app);
  assert.equal(r.made, index.length);
  assert.ok(f.rows.chapter_notes.every((n) => n.getString('seedHash') === sha(n.getString('content'))));
  const again = runSync(f.app).r;
  assert.deepEqual([again.made, again.updated, again.same], [0, 0, index.length]);
});

test('sinkronisasi: memperbarui yang belum disunting, melewati yang disunting admin atau tulisan tangan', () => {
  const f = seeded();
  runSync(f.app);
  const [a, b, c, d] = f.rows.chapter_notes;
  const idxA = f.chapters.findIndex((ch) => ch.id === a.getString('chapter'));
  // a: versi lama hasil impor yang belum disunting (hash cocok) -> diperbarui
  a.set('content', `${MARK}\n\n## Versi lama`); a.set('seedHash', sha(a.getString('content')));
  // b: hasil impor yang kemudian disunting admin (hash tidak cocok) -> dilewati
  b.set('seedHash', sha(b.getString('content'))); b.set('content', `${MARK}\n\n## Disunting admin`); const bBefore = b.getString('content');
  // c: tulisan tangan tanpa penanda dan tanpa sidik jari -> dilewati
  c.set('content', '**Tulisan admin**'); c.set('seedHash', '');
  // d: hasil pemasangan lama (penanda, belum ada sidik jari) -> diperbarui
  d.set('content', `${MARK}\n\n## Lama`); d.set('seedHash', '');
  const r = runSync(f.app).r;
  assert.equal(r.updated, 2);
  assert.equal(r.skipped, 2);
  assert.equal(a.getString('content'), fileOf(idxA));
  assert.equal(b.getString('content'), bBefore);
  assert.equal(c.getString('content'), '**Tulisan admin**');
  assert.ok(d.getString('content').length > 5000);
  assert.equal(d.getString('seedHash'), sha(d.getString('content')));
});

test('sinkronisasi: BAB hilang dilaporkan, tanpa berkas index tidak apa-apa', () => {
  const f = fixture();
  const s0 = new Record(f.cols.subjects); s0.set('slug', 'anatomi'); f.app.save(s0);
  assert.equal(runSync(f.app).r.missing, index.length);
});
