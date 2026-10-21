import { test } from 'node:test';
import assert from 'node:assert/strict';
import { safeInternalPath as s } from './safePath.js';

test('jalur internal biasa diterima', () => {
  assert.equal(s('/mata-kuliah/anatomi'), '/mata-kuliah/anatomi');
  assert.equal(s('/kerjakan/abc123?x=1#y'), '/kerjakan/abc123?x=1#y');
  assert.equal(s('/admin/soal?id=abc'), '/admin/soal?id=abc');
});

test('alamat situs lain ditolak', () => {
  for (const bad of ['//evil.com', '/\\evil.com', '/\\/evil.com', '\\\\evil.com', 'https://evil.com', 'javascript:alert(1)',
    '/%5Cevil.com', '/%2F%2Fevil.com', '/%2Fevil.com/..', ' //evil.com', '/\tevil', '/javascript:alert(1)', '', null, undefined, 42]) {
    assert.equal(s(bad), '/beranda', `harus ditolak: ${JSON.stringify(bad)}`);
  }
});

test('fallback bisa diatur', () => {
  assert.equal(s('//x', '/'), '/');
});
