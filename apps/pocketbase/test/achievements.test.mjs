import test from 'node:test';
import assert from 'node:assert/strict';
import { createRequire } from 'node:module';
const require = createRequire(import.meta.url);
const ach = require('../pb_hooks/lib/achievements.js');

const subjects = [{ id: 'ana', name: 'Anatomi', total: 100 }, { id: 'fis', name: 'Fisiologi', total: 40 }, { id: 'kos', name: 'Kosong', total: 0 }];
const ladder = (r, key) => r.ladders.find((l) => l.key === key);

test('akun baru: belum ada pencapaian atau julukan, tier pertama jadi target', () => {
  const r = ach.evaluate({}, subjects);
  assert.equal(r.title, null);
  assert.equal(r.earned, 0);
  assert.deepEqual(ladder(r, 'soal').next, { goal: 10, name: 'Langkah pertama' });
  assert.deepEqual(r.subjects.map((s) => s.id), ['ana', 'fis']); // mata kuliah tanpa soal tidak ditampilkan
  assert.equal(r.subjects[0].level, null);
});

test('tangga soal: 100 dan 1000 soal membuka tier, target berikutnya disebut', () => {
  const r = ach.evaluate({ answered: 1000, correct: 300 }, subjects);
  assert.equal(ladder(r, 'soal').best.name, 'Seribu soal');
  assert.deepEqual(ladder(r, 'soal').next, { goal: 5000, name: 'Penghuni bank soal' });
  assert.equal(ladder(r, 'benar').best.name, 'Tajam');
  assert.equal(r.title.title, 'Seribu soal');
});

test('Master of mata kuliah butuh cakupan dan akurasi; mengalahkan julukan umum', () => {
  const master = ach.evaluate({ answered: 5000, correct: 900, subjects: { ana: { answered: 85, correct: 70, scored: 80 } } }, subjects);
  const ana = master.subjects.find((s) => s.id === 'ana');
  assert.equal(ana.level, 'master'); assert.equal(ana.title, 'Master of Anatomi');
  assert.equal(master.title.title, 'Master of Anatomi');
  assert.ok(master.titles.includes('Penghuni bank soal'));
  // Cakupan tinggi tapi akurasi rendah: hanya Penjelajah, dengan target Ahli.
  const rushed = ach.evaluate({ subjects: { ana: { answered: 90, correct: 20, scored: 80 } } }, subjects).subjects.find((s) => s.id === 'ana');
  assert.equal(rushed.level, 'penjelajah');
  assert.deepEqual(rushed.next, { level: 'ahli', title: 'Ahli Anatomi', coverage: 50, accuracy: 70 });
  // Mata kuliah dengan soal terlalu sedikit tidak memberi gelar Ahli/Master.
  const tiny = ach.evaluate({ subjects: { fis: { answered: 40, correct: 40, scored: 40 } } }, [{ id: 'fis', name: 'Fisiologi', total: 25 }]).subjects[0];
  assert.equal(tiny.level, 'penjelajah');
});

test('simulasi dokter, CBT, dan kontributor punya tangga sendiri', () => {
  const r = ach.evaluate({ simCases: 12, simDxOk: 6, exams: 1, contributions: 1 }, subjects);
  assert.equal(ladder(r, 'dokter').best.name, 'Dokter jaga');
  assert.equal(ladder(r, 'diagnosis').best.name, 'Diagnostik');
  assert.equal(ladder(r, 'cbt').best.name, 'Uji coba pertama');
  assert.equal(ladder(r, 'kontributor').best.name, 'Kontributor');
  assert.equal(r.earned, 2 + 1 + 1 + 1);
});

test('rantai hari aktif terpanjang, tanggal ganda dan acak tetap benar', () => {
  assert.equal(ach.longestStreak([]), 0);
  assert.equal(ach.longestStreak(['2026-10-01', '2026-10-03', '2026-10-02', '2026-10-02', '2026-10-05']), 3);
  assert.equal(ach.longestStreak(['2026-02-28', '2026-03-01']), 2); // lintas bulan
});
