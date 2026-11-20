import test from 'node:test';
import assert from 'node:assert/strict';
import { createRequire } from 'node:module';
const require = createRequire(import.meta.url);
globalThis.BadRequestError ??= class extends Error {};
globalThis.NotFoundError ??= class extends Error {};
const { TRACKS, REVIEW } = require('../pb_hooks/lib/labTracks.js');
const shared = require('../../../shared/lab-tracks.json');

test('server track registry matches shared/lab-tracks.json (keys and planned steps)', () => {
  const fromShared = Object.fromEntries(shared.tracks.map((t) => [t.key, Object.fromEntries(t.steps.map((s) => [s.key, s.kind === 'planned']))]));
  assert.deepEqual(TRACKS, fromShared);
});

test('steps waiting for clinical review match shared/lab-tracks.json', () => {
  const fromShared = {};
  for (const t of shared.tracks) for (const s of t.steps) if (s.review) (fromShared[t.key] ||= {})[s.key] = s.review;
  assert.deepEqual(REVIEW, fromShared);
  assert.ok(Object.keys(fromShared).length, 'the ECG module is gated');
});
