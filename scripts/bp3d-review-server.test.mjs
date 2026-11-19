import test from 'node:test';
import assert from 'node:assert/strict';
import { mkdtemp, writeFile, mkdir } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import path from 'node:path';
import { createReviewServer } from './bp3d-review-server.mjs';

test('review server is read-only, local, traversal-safe and serves GLB with the right type', async () => {
  const dir = await mkdtemp(path.join(tmpdir(), 'bp3d-review-'));
  await mkdir(path.join(dir, 'structures'));
  await writeFile(path.join(dir, 'body.html'), '<body>');
  await writeFile(path.join(dir, 'structures/a.glb'), 'glb');
  await writeFile(path.join(path.dirname(dir), 'secret.txt'), 'secret');
  const srv = createReviewServer(dir);
  await new Promise((r) => srv.listen(0, '127.0.0.1', r));
  const base = `http://127.0.0.1:${srv.address().port}`;
  const get = (p, init) => fetch(base + p, { redirect: 'manual', ...init });
  try {
    let r = await get('/'); assert.equal(r.status, 302); assert.equal(r.headers.get('location'), '/body.html');
    r = await get('/body.html'); assert.equal(r.status, 200); assert.match(r.headers.get('content-type'), /text\/html/); assert.equal(r.headers.get('x-robots-tag'), 'noindex, nofollow');
    r = await get('/structures/a.glb'); assert.equal(r.headers.get('content-type'), 'model/gltf-binary');
    r = await get('/structures/missing.glb'); assert.equal(r.status, 404);
    r = await get('/..%2fsecret.txt'); assert.equal(r.status, 400, 'encoded traversal rejected');
    r = await get('/body.html', { method: 'POST' }); assert.equal(r.status, 405);
  } finally { srv.close(); }
  assert.equal(srv.address(), null);
});
