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
