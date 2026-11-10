import { test } from 'node:test';
import assert from 'node:assert/strict';
import { checkLiveLab, LIVE_LAB_PATH, LIVE_LAB_MANIFEST } from './liveLab.mjs';

const respond = (body, type, status = 200) => async () => new globalThis.Response(body, { status, headers: { 'content-type': type } });
test('live lab is mounted outside the SPA at /anatomy/4d-lab/', () => {
  assert.equal(LIVE_LAB_PATH, '/anatomy/4d-lab/');
  assert.ok(LIVE_LAB_MANIFEST.startsWith(LIVE_LAB_PATH));
});
test('accepts only the real lab manifest (never the SPA fallback)', async () => {
  assert.deepEqual(await checkLiveLab(respond(JSON.stringify({ schema: 'medcoel.anatomy.v1', synthetic: true }), 'application/json')), { synthetic: true });
  await assert.rejects(checkLiveLab(respond('<!doctype html>', 'text/html')), /belum diarahkan/);
  await assert.rejects(checkLiveLab(respond('nope', 'text/plain', 404)), /HTTP 404/);
  await assert.rejects(checkLiveLab(respond('{"schema":"x"}', 'application/json')), /tidak dikenali/);
});

test('liveLabAvailability: ready when installed, missing when absent or answered by the SPA fallback; one check is shared', async () => {
  const { liveLabAvailability } = await import('./liveLab.mjs');
  const ok = async () => ({ ok: true, headers: { get: () => 'application/json' }, json: async () => ({ schema: 'medcoel.anatomy.v1' }) });
  const spa = async () => ({ ok: true, headers: { get: () => 'text/html' }, json: async () => ({}) });
  const gone = async () => ({ ok: false, status: 404, headers: { get: () => '' } });
  let calls = 0; const counting = async (...a) => { calls++; return ok(...a); };
  assert.equal(await liveLabAvailability(counting, { fresh: true }), 'ready');
  assert.equal(await liveLabAvailability(counting), 'ready'); assert.equal(calls, 1);
  assert.equal(await liveLabAvailability(spa, { fresh: true }), 'missing');
  assert.equal(await liveLabAvailability(gone, { fresh: true }), 'missing');
  assert.equal(await liveLabAvailability(async () => { throw new Error('offline'); }, { fresh: true }), 'missing');
});
