import assert from 'node:assert/strict';
import { test } from 'node:test';
import { createTracker, IDLE_MS } from './activityTracker.js';

function rig({ visible = true } = {}) {
  const sent = []; let t = 1_000_000; let vis = visible;
  const tr = createTracker({ send: (p) => sent.push(p), now: () => t, isVisible: () => vis });
  return { tr, sent, advance: (ms) => { t += ms; }, setVisible: (v) => { vis = v; } };
}

test('satu halaman: dihitung dibuka sekali, detik aktif dikirim saat pindah', () => {
  const { tr, sent, advance } = rig();
  tr.enter('/beranda'); advance(30_000); tr.touch(); advance(10_000);
  tr.enter('/progres');
  assert.deepEqual(sent, [{ key: '/beranda', views: 1, seconds: 40 }]);
});

test('detak berkala mengirim detik tanpa menghitung buka lagi', () => {
  const { tr, sent, advance } = rig();
  tr.enter('/kerjakan/:id'); advance(60_000); tr.touch(); tr.tick(); advance(45_000); tr.touch(); tr.tick();
  assert.deepEqual(sent, [{ key: '/kerjakan/:id', views: 1, seconds: 60 }, { key: '/kerjakan/:id', views: 0, seconds: 45 }]);
});

test('tab disembunyikan: waktu berhenti dan laporan dikirim; terlihat lagi: lanjut tanpa buka ganda', () => {
  const { tr, sent, advance, setVisible } = rig();
  tr.enter('/lab'); advance(20_000); tr.touch();
  setVisible(false); tr.hide(); advance(600_000);
  setVisible(true); tr.show(); advance(15_000); tr.touch(); tr.tick();
  assert.deepEqual(sent, [{ key: '/lab', views: 1, seconds: 20 }, { key: '/lab', views: 0, seconds: 15 }]);
});

test('diam lebih dari 5 menit: hanya 5 menit yang dihitung, lalu berhenti sampai disentuh', () => {
  const { tr, sent, advance } = rig();
  tr.enter('/anatomy/explore'); advance(IDLE_MS + 120_000); tr.tick();
  assert.deepEqual(sent, [{ key: '/anatomy/explore', views: 1, seconds: IDLE_MS / 1000 }]);
  advance(60_000); tr.tick(); assert.equal(sent.length, 1, 'masih diam: tidak ada tambahan');
  tr.touch(); advance(10_000); tr.tick();
  assert.deepEqual(sent.at(-1), { key: '/anatomy/explore', views: 0, seconds: 10 });
});

test('tab dibuka di latar belakang: baru dihitung dibuka saat terlihat', () => {
  const { tr, sent, advance, setVisible } = rig({ visible: false });
  tr.enter('/jadwal'); advance(50_000); tr.tick(); tr.enter('/profil');
  assert.deepEqual(sent, [], 'tidak pernah terlihat: tidak ada laporan');
  setVisible(true); tr.show(); advance(8_000); tr.touch(); tr.leave();
  assert.deepEqual(sent, [{ key: '/profil', views: 1, seconds: 8 }]);
});

test('halaman yang tidak dicatat (key null) tidak mengirim apa pun; pindah ke halaman sama tidak mengirim ganda', () => {
  const { tr, sent, advance } = rig();
  tr.enter(null); advance(10_000); tr.tick(); tr.enter('/beranda'); tr.enter('/beranda'); advance(5_000); tr.enter(null);
  assert.deepEqual(sent, [{ key: '/beranda', views: 1, seconds: 5 }]);
});

test('sisa milidetik tidak hilang antar laporan', () => {
  const { tr, sent, advance } = rig();
  tr.enter('/riwayat'); advance(1_400); tr.touch(); tr.tick(); advance(1_400); tr.touch(); tr.tick(); advance(1_400); tr.touch(); tr.leave();
  assert.equal(sent.reduce((s, p) => s + p.seconds, 0), 4, '4200 ms = 4 detik utuh');
});
