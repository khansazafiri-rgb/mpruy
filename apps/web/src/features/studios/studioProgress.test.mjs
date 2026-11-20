import test from 'node:test';
import assert from 'node:assert/strict';
import { modeFrom, progressLines, modeErrorText } from './studioProgress.mjs';

test('mode comes from the query and defaults to explore', () => {
  assert.equal(modeFrom('?mode=challenge'), 'challenge');
  assert.equal(modeFrom('?mode=admin'), 'explore');
  assert.equal(modeFrom(''), 'explore');
});
test('progress summary is honest about server-graded vs self-reported', () => {
  assert.deepEqual(progressLines(null), []);
  assert.deepEqual(progressLines({ attempts: [] }), []);
  const lines = progressLines({ attempts: [{ mode: 'challenge' }, { mode: 'guided' }], best: { correct: 4, total: 5 }, challengeAttempts: 2, completedChallenges: 1, guidedCompleted: false });
  assert.deepEqual(lines, ['Skor Challenge terbaik: 4 / 5', '2 percobaan Challenge, 1 selesai (dinilai server)', 'Guided sudah dimulai (dicatat dari perangkat Anda)']);
  assert.equal(modeErrorText('MODE_NOT_AVAILABLE'), 'Mode ini belum tersedia untuk studio ini.');
});
