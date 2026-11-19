import test from 'node:test';
import assert from 'node:assert/strict';
import { fmtMinutes, hLabel, planStatus, countdownText, byDay, newTopic } from './studyLib.js';

test('formatting helpers', () => {
  assert.equal(fmtMinutes(45), '45 mnt'); assert.equal(fmtMinutes(120), '2 jam'); assert.equal(fmtMinutes(135), '2 j 15 mnt');
  assert.equal(hLabel('2026-11-20', '2026-11-25'), 'H-5'); assert.equal(hLabel('2026-11-25', '2026-11-25'), 'Hari H');
  const now = Date.parse('2026-11-20T00:00:00Z');
  assert.equal(countdownText('2026-11-22 03:00:00.000Z', now), '2 hari 3 jam lagi');
  assert.equal(countdownText('2026-11-19 00:00:00.000Z', now), 'Sudah dimulai');
});

test('plan status prefers the most important message', () => {
  assert.equal(planStatus(null).key, 'none');
  assert.equal(planStatus({ status: 'active', stale: ['missed'], shortfall: { minutes: 30 } }).key, 'stale');
  assert.equal(planStatus({ status: 'active', stale: [], shortfall: { minutes: 30 } }).key, 'short');
  assert.equal(planStatus({ status: 'active', stale: [], shortfall: null }).key, 'ok');
});

test('sessions grouped by day; new topics get unique keys', () => {
  const g = byDay([{ date: '2026-11-21', minutes: 30, status: 'planned' }, { date: '2026-11-20', minutes: 60, status: 'done' }, { date: '2026-11-21', minutes: 20, status: 'skipped' }]);
  assert.deepEqual(g.map((d) => [d.date, d.minutes]), [['2026-11-20', 60], ['2026-11-21', 30]]);
  assert.notEqual(newTopic().key, newTopic().key);
});
