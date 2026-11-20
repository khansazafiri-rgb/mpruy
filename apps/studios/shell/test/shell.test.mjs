import assert from 'node:assert/strict';
import { test } from 'node:test';
import { createGuide } from '../guided.js';
import { sanitizeLaunch } from '../bridge.js';
import { createScore } from '../challenge.js';

test('guided steps advance only when the live state satisfies the check', () => {
  const g = createGuide([{ id: 'a', check: s => s.x < 0 }, { id: 'b', check: s => s.view === 'sagittal' }]);
  assert.equal(g.update({ x: 5 }), false); assert.equal(g.next(), 0, 'cannot advance an unfinished step');
  assert.equal(g.update({ x: -3 }), true); assert.equal(g.next(), 1);
  assert.equal(g.update({ view: 'axial' }), false); assert.equal(g.update({ view: 'sagittal' }), true);
  assert.equal(g.finished, true);
  const throwing = createGuide([{ id: 'x', check: () => { throw Error('boom'); } }]);
  assert.equal(throwing.update({}), false);
});
test('launch context is bounded; unknown modes fall back to explore', () => {
  assert.deepEqual(sanitizeLaunch({ studioId: 'brain-mri', releaseId: 'r', mode: 'admin', token: 'x', language: 'fr' }), { studioId: 'brain-mri', releaseId: 'r', mode: 'explore', language: 'id', standalone: false });
});
test('score counts each item once (first answer)', () => {
  const s = createScore(); s.record('a', false); s.record('a', true); s.record('b', true);
  assert.equal(s.answered, 2); assert.equal(s.correct, 1);
});

test('score prefers server-persisted progress; guided reports completed steps (and nothing outside a hosted launch)', async () => {
  const client = { lastProgress: null };
  const s = createScore(client); s.record('a', true);
  assert.deepEqual([s.answered, s.correct, s.persisted], [1, 1, false]);
  client.lastProgress = { graded: 3, correct: 1, total: 5 };
  assert.deepEqual([s.answered, s.correct, s.persisted], [3, 1, true]);
  const reports = [];
  const g = createGuide([{ id: 'a', check: st => st.ok }, { id: 'b', check: st => st.ok }], { report: (done, total) => reports.push([done, total]) });
  g.update({ ok: false }); g.update({ ok: true }); g.next(); g.update({ ok: true });
  assert.deepEqual(reports, [[1, 2], [2, 2]]);
  const { reportGuided } = await import('../guided.js');
  assert.equal(await reportGuided(1, 2), null, 'not hosted: no network call');
});
