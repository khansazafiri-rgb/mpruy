import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { test } from 'node:test';
import vm from 'node:vm';

// Memuat lib/submissions.js apa adanya dengan util/storage tiruan; yang diuji hanya teks pesan (fungsi murni).
function load() {
  const file = new URL('../pb_hooks/lib/submissions.js', import.meta.url);
  const mod = { exports: {} };
  vm.runInNewContext(readFileSync(file, 'utf8'), { module: mod, exports: mod.exports, require: () => ({}), console, __hooks: '/x' });
  return mod.exports;
}
const { buildNotice, NOTICE_STATUSES } = load();
const base = { code: 'MC261117-AB23', kind: 'soal', subjectName: 'Anatomi', count: 40, days: 3 };

test('statuses that notify the student are exactly the meaningful ones', () => {
  assert.deepEqual([...NOTICE_STATUSES].sort(), ['antre', 'dibatalkan', 'kedaluwarsa', 'perlu_perbaikan', 'selesai']);
  for (const s of NOTICE_STATUSES) assert.ok(buildNotice(s, base), s);
  for (const s of ['draft', 'menunggu_konfirmasi', 'diproses']) assert.equal(buildNotice(s, base), null, s);
});

test('selesai names the submission code, count and subject', () => {
  const n = buildNotice('selesai', base);
  assert.match(n.chat, /MC261117-AB23/);
  assert.match(n.chat, /40 soal di Anatomi/);
  assert.match(n.chat, /sudah terupload dan tayang/);
  assert.match(n.title, /sudah tayang/);
});

test('a second publication reads as an update, and a deck says slides', () => {
  assert.match(buildNotice('selesai', { ...base, wasLive: true }).chat, /sudah diperbarui/);
  const deck = buildNotice('selesai', { ...base, kind: 'materi', count: 25 });
  assert.match(deck.chat, /PPT materi/);
  assert.match(deck.chat, /25 slide materi/);
});

test('perlu_perbaikan carries the admin note', () => {
  const n = buildNotice('perlu_perbaikan', { ...base, note: 'PDF tidak terbaca' });
  assert.match(n.chat, /PDF tidak terbaca/);
  assert.match(n.mailLines.join(' '), /PDF tidak terbaca/);
});

test('antre mentions the estimate', () => {
  assert.match(buildNotice('antre', base).chat, /sekitar 3 hari/);
});

test('selesai tells the student where to open it (Kampusmu or Latihan soal), never a guess', () => {
  assert.match(buildNotice('selesai', { ...base, kind: 'materi', where: 'kampusmu' }).chat, /menu Kampusmu → Anatomi.*Buka materi/);
  assert.match(buildNotice('selesai', { ...base, where: 'matkul' }).chat, /Latihan soal → Anatomi.*Kerjakan soal/);
  assert.doesNotMatch(buildNotice('selesai', base).chat, /Bukanya lewat/);
});
