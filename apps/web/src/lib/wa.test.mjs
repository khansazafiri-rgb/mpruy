import { test } from 'node:test';
import assert from 'node:assert/strict';
import { waLink, waNumber } from './wa.js';

test('nomor admin dalam berbagai format jadi 62...', () => {
  for (const n of ['085144902681', '+62 851-4490-2681', '6285144902681', '85144902681']) {
    assert.equal(waNumber(n), '6285144902681', n);
  }
});

test('tautan wa.me dengan pesan', () => {
  assert.equal(waLink('085144902681', 'Halo Admin'), 'https://wa.me/6285144902681?text=Halo%20Admin');
  assert.equal(waLink('', 'x'), 'https://wa.me/?text=x');
});
