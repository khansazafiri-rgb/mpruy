// Tes murni aktivitas siswa (pb_hooks/lib/activity.js). Jalankan: npm test
import { createRequire } from 'node:module';
import { test } from 'node:test';
import assert from 'node:assert/strict';

const require = createRequire(import.meta.url);
const A = require('../pb_hooks/lib/activity.js');

test('daftar halaman: kunci unik, bagian dikenal, label ada', () => {
  const keys = A.PAGES.map((p) => p[0]);
  assert.equal(new Set(keys).size, keys.length);
  for (const [key, section, label] of A.PAGES) { assert.ok(key.startsWith('/'), key); assert.ok(A.SECTIONS[section], key); assert.ok(label, key); }
});

test('hanya pola dari daftar yang diterima; alamat asli, ID, query, dan kunci prototipe ditolak', () => {
  assert.deepEqual(A.cleanEvent({ key: '/beranda', views: 1, seconds: 10 }), { key: '/beranda', views: 1, seconds: 10 });
  for (const key of ['/mata-kuliah/anatomi', '/kerjakan/abc123', '/beranda?x=1', '/admin', '/masuk', '__proto__', 'constructor', 'toString', '', 5, null, undefined]) {
    assert.equal(A.cleanEvent({ key, views: 1, seconds: 5 }), null, String(key));
  }
});

test('angka dibersihkan: views paling banyak 1, detik dibatasi, nol dan sampah dibuang', () => {
  assert.deepEqual(A.cleanEvent({ key: '/lab', views: 9, seconds: 99999 }), { key: '/lab', views: 1, seconds: A.MAX_SECONDS_PER_REPORT });
  assert.deepEqual(A.cleanEvent({ key: '/lab', views: -4, seconds: 7.9 }), { key: '/lab', views: 0, seconds: 7 });
  assert.deepEqual(A.cleanEvent({ key: '/lab', views: 'abc', seconds: '30' }), { key: '/lab', views: 0, seconds: 30 });
  assert.equal(A.cleanEvent({ key: '/lab', views: 0, seconds: 0 }), null);
  assert.equal(A.cleanEvent({ key: '/lab', views: NaN, seconds: Infinity }), null);
  assert.equal(A.cleanEvent('/lab'), null);
});

test('isi permintaan: satu laporan atau events[]; paling banyak 10', () => {
  assert.equal(A.cleanBody({ key: '/progres', views: 1 }).length, 1);
  const many = { events: Array.from({ length: 25 }, () => ({ key: '/progres', views: 1 })) };
  assert.equal(A.cleanBody(many).length, A.MAX_EVENTS_PER_REQUEST);
  assert.deepEqual(A.cleanBody({ events: [{ key: '/x' }, { key: '/lab', seconds: 3 }] }), [{ key: '/lab', views: 0, seconds: 3 }]);
  assert.deepEqual(A.cleanBody(null), []);
  assert.deepEqual(A.cleanBody({ events: 'x' }), []);
});

test('hari dihitung menurut WIB (UTC+7)', () => {
  assert.equal(A.dayOf(new Date('2026-11-17T16:59:59Z')), '2026-11-17');
  assert.equal(A.dayOf(new Date('2026-11-17T17:00:00Z')), '2026-11-18');
  assert.equal(A.dayOf(new Date('2026-11-17T17:00:00Z'), 0), '2026-11-17');
});

test('rentang: hanya 1, 7, 30, 90; selain itu 7', () => {
  assert.equal(A.rangeOf('30'), 30); assert.equal(A.rangeOf(90), 90); assert.equal(A.rangeOf('3'), 7); assert.equal(A.rangeOf(''), 7); assert.equal(A.rangeOf('abc'), 7);
  const now = new Date('2026-11-17T05:00:00Z');
  assert.equal(A.fromDay(7, now), '2026-11-11'); assert.equal(A.fromDay(1, now), '2026-11-17');
  assert.equal(A.listDays(3, now).join(), '2026-11-15,2026-11-16,2026-11-17');
});

test('ringkasan: urut, bagian menggabungkan siswa yang berbeda, hari kosong diisi nol, pola tak dikenal diabaikan', () => {
  const now = new Date('2026-11-17T05:00:00Z');
  const r = A.summarize({
    days: 3, now, firstDay: '2026-11-10', total: 3,
    keyRows: [
      { key: '/mata-kuliah/:slug', views: 30, seconds: 3000, students: 3 },
      { key: '/kerjakan/:id', views: 60, seconds: 6000, students: 2 },
      { key: '/anatomy/live', views: 10, seconds: 1200, students: 1 },
      { key: '/pola/lama', views: 999, seconds: 99999, students: 9 },
    ],
    pairRows: [
      { key: '/mata-kuliah/:slug', user: 'a' }, { key: '/mata-kuliah/:slug', user: 'b' }, { key: '/mata-kuliah/:slug', user: 'c' },
      { key: '/kerjakan/:id', user: 'a' }, { key: '/kerjakan/:id', user: 'b' }, { key: '/anatomy/live', user: 'c' },
    ],
    dayRows: [{ day: '2026-11-16', views: 70, seconds: 7000, students: 3 }, { day: '2026-11-17', views: 30, seconds: 3200, students: 2 }],
  });
  assert.equal(r.totals.views, 100); assert.equal(r.totals.students, 3); assert.equal(r.totals.minutes, Math.round(10200 / 60));
  assert.equal(r.sections[0].section, 'soal'); assert.equal(r.sections[0].views, 90); assert.equal(r.sections[0].students, 3, 'a, b dan c berbeda: 3, bukan 2+3');
  assert.equal(r.sections[0].share, 90); assert.equal(r.sections[1].label, 'Anatomi 3D & 4D');
  assert.equal(r.pages[0].key, '/kerjakan/:id'); assert.equal(r.pages[0].label, 'Mengerjakan soal');
  assert.ok(!r.pages.some((p) => p.key === '/pola/lama'));
  assert.deepEqual(r.daily.map((d) => d.views), [0, 70, 30]); assert.equal(r.from, '2026-11-15'); assert.equal(r.to, '2026-11-17');
  assert.equal(r.trackingStartedOn, '2026-11-10');
});

test('ringkasan kosong tetap berbentuk lengkap', () => {
  const r = A.summarize({ days: 7, now: new Date('2026-11-17T05:00:00Z'), keyRows: [], pairRows: [], dayRows: [], total: 0 });
  assert.deepEqual(r.totals, { views: 0, students: 0, minutes: 0 }); assert.equal(r.sections.length, 0); assert.equal(r.pages.length, 0); assert.equal(r.daily.length, 7);
});
