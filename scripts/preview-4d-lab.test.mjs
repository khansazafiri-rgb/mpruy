// The local staging preview must route like production (deploy/*.caddy.snippet): the lab and the atlas never
// get an SPA fallback, /anatomy/live does, framing headers match, and the server is read-only.
import test from 'node:test';
import assert from 'node:assert/strict';
import { mkdtemp, mkdir, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import path from 'node:path';
import { createLabPreviewServer } from './preview-4d-lab.mjs';

test('preview server mirrors production routing and headers', async () => {
  const dir = await mkdtemp(path.join(tmpdir(), 'lab-preview-'));
  const roots = { main: path.join(dir, 'main'), lab: path.join(dir, 'lab'), atlas: path.join(dir, 'atlas') };
  for (const d of [roots.main + '/assets', roots.lab + '/assets', roots.lab + '/data/atlas', roots.lab + '/atlas-assets/models', roots.atlas + '/models', roots.atlas + '/draco']) await mkdir(d, { recursive: true });
  await writeFile(roots.main + '/index.html', '<main-spa>');
  await writeFile(roots.lab + '/index.html', '<lab>');
  await writeFile(roots.lab + '/data/atlas/anatomy.json', '{}');
  await writeFile(roots.lab + '/atlas-assets/models/visceral.glb', 'glb');
  await writeFile(roots.lab + '/atlas-assets/models/nervous.glb', 'withheld accidental file');
  await writeFile(roots.atlas + '/index.html', '<atlas>');
  await writeFile(roots.atlas + '/models/visceral.glb', 'glb');
  await writeFile(roots.atlas + '/draco/draco_decoder.wasm', 'wasm');
  const srv = createLabPreviewServer(roots);
  await new Promise((r) => srv.listen(0, '127.0.0.1', r));
  const base = `http://127.0.0.1:${srv.address().port}`;
  const get = (p, init) => fetch(base + p, { redirect: 'manual', ...init });
  try {
    let r = await get('/anatomy/live');
    assert.equal(r.status, 200); assert.equal(await r.text(), '<main-spa>'); assert.equal(r.headers.get('x-frame-options'), 'DENY');
    r = await get('/anatomy/4d-lab'); assert.equal(r.status, 308); assert.equal(r.headers.get('location'), '/anatomy/4d-lab/');
    r = await get('/anatomy/4d-lab/'); assert.equal(await r.text(), '<lab>'); assert.equal(r.headers.get('x-frame-options'), 'SAMEORIGIN');
    assert.match(r.headers.get('content-security-policy'), /frame-ancestors 'self'/);
    r = await get('/anatomy/4d-lab/data/atlas/anatomy.json'); assert.equal(r.status, 200); assert.match(r.headers.get('content-type'), /json/);
    r = await get('/anatomy/4d-lab/data/phantom/anatomy.json'); assert.equal(r.status, 404, 'lab miss is a 404, never the SPA');
    r = await get('/anatomy/4d-lab/assets/missing.js'); assert.equal(r.status, 404);
    r = await get('/anatomy/4d-lab/atlas-assets/models/visceral.glb'); assert.equal(r.status, 200);
    assert.equal(r.headers.get('content-type'), 'model/gltf-binary', 'Lab pack serves GLB without Viewer');
    r = await get('/anatomy/4d-lab/atlas-assets/models/nervous.glb'); assert.equal(r.status, 404, 'quarantined nervous model refused even from stale Lab pack');
    r = await get('/anatomy/viewer/models/visceral.glb'); assert.equal(r.status, 200); assert.equal(r.headers.get('content-type'), 'model/gltf-binary');
    r = await get('/anatomy/viewer/draco/draco_decoder.wasm'); assert.equal(r.headers.get('content-type'), 'application/wasm');
    r = await get('/anatomy/viewer/models/missing.glb'); assert.equal(r.status, 404, 'atlas miss is a 404');
    r = await get('/anatomy/4d-lab/%2e%2e%2f%2e%2e%2fetc%2fpasswd'); assert.equal(r.status, 400, 'encoded traversal rejected');
    r = await get('/anatomy/live', { method: 'POST' }); assert.equal(r.status, 405, 'read-only');
    r = await get('/api/collections/anything'); assert.equal(r.headers.get('x-content-type-options'), 'nosniff');
  } finally { srv.close(); }
});
