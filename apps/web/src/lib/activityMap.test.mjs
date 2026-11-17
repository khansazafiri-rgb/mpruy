import assert from 'node:assert/strict';
import { createRequire } from 'node:module';
import { test } from 'node:test';
import { ACTIVITY_PAGES, activityKey } from './activityMap.mjs';

const server = createRequire(import.meta.url)('../../../pocketbase/pb_hooks/lib/activity.js');

test('daftar halaman web sama persis dengan daftar yang diizinkan server', () => {
  assert.deepEqual(ACTIVITY_PAGES, server.PAGES);
});

test('alamat asli dipetakan ke pola; ID, slug, dan query tidak ikut', () => {
  const cases = {
    '/beranda': '/beranda', '/beranda/': '/beranda',
    '/mata-kuliah': '/mata-kuliah', '/mata-kuliah/anatomi': '/mata-kuliah/:slug',
    '/mata-kuliah/anatomi/materi/ab12': '/mata-kuliah/:slug/materi/:chapterId',
    '/mata-kuliah/anatomi/flashcard/ab12': '/mata-kuliah/:slug/flashcard/:chapterId',
    '/kerjakan/xyz789?lanjut=1#a': '/kerjakan/:id', '/drilling/materi/7': '/drilling/materi/:id', '/drilling/biokimia': '/drilling/:slug',
    '/lab/modul/k.1': '/lab/modul/:key', '/anatomy': '/anatomy', '/anatomy/explore': '/anatomy/explore', '/anatomy/live': '/anatomy/live',
    '/anatomy/structure/Femur.l': '/anatomy/structure/:id', '/simulasi-dokter': '/simulasi-dokter', '/progres': '/progres',
  };
  for (const [path, key] of Object.entries(cases)) assert.equal(activityKey(path), key, path);
});

test('halaman yang tidak dicatat: login, daftar, landing, admin, 404, dan viewer yang dibingkai', () => {
  for (const path of ['/', '/masuk', '/daftar', '/lupa-password', '/kebijakan-privasi', '/admin', '/admin/aktivitas', '/anatomy/viewer/', '/anatomy/4d-lab/', '/tidak-ada', '/mata-kuliah/a/b', '', null, undefined]) {
    assert.equal(activityKey(path), null, String(path));
  }
});

test('setiap pola yang dikembalikan ada di daftar server', () => {
  for (const [key] of ACTIVITY_PAGES) assert.ok(Object.prototype.hasOwnProperty.call(server.KEYS, key));
});
