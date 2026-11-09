import { test } from 'node:test';
import assert from 'node:assert/strict';
import { mkdtemp, mkdir, writeFile, readlink, rm } from 'node:fs/promises';
import { createHash } from 'node:crypto';
import os from 'node:os';
import path from 'node:path';
import { stageLab, validateLab } from './stage-4d-lab.mjs';

import { approveSyntheticFixture } from './commercial-release-fixture.mjs';
async function stageFixture(options) { if (options.rollback || options.dest.includes('/apps/web/dist/')) return stageLab(options); const commercialManifest = path.join(path.dirname(options.dest), 'synthetic-commercial-approval.json'); await approveSyntheticFixture(options.source, '4d-lab', commercialManifest); return stageLab({ ...options, commercialManifest }); }

async function fakeBuild(dir, tag) {
  await mkdir(path.join(dir, 'assets'), { recursive: true }); await mkdir(path.join(dir, 'data/phantom'), { recursive: true });
  await writeFile(path.join(dir, 'index.html'), `<script type="module" src="/anatomy/4d-lab/assets/index-${tag}.js"></script>`);
  await writeFile(path.join(dir, 'assets', `index-${tag}.js`), 'export {}');
  for (const f of ['ct.nrrd', 'labels.nrrd', 'skin.glb', 'organs.glb']) await writeFile(path.join(dir, 'data/phantom', f), f + tag);
  await writeFile(path.join(dir, 'data/phantom/anatomy.json'), JSON.stringify({ schema: 'medcoel.anatomy.v1' }));
  const sha = (f) => createHash('sha256').update(f + tag).digest('hex');
  await writeFile(path.join(dir, 'data/phantom/registration.json'), JSON.stringify({ meshes: [{ file: 'skin.glb', sha256: sha('skin.glb') }, { file: 'organs.glb', sha256: sha('organs.glb') }] }));
}

test('stages releases atomically, validates hashes and rolls back', async () => {
  const tmp = await mkdtemp(path.join(os.tmpdir(), 'lab4d-'));
  try {
    const a = path.join(tmp, 'a'), b = path.join(tmp, 'b'), dest = path.join(tmp, 'live', '4d-lab');
    await fakeBuild(a, 'A'); await fakeBuild(b, 'B'); await mkdir(path.dirname(dest), { recursive: true });
    await validateLab(a);
    const r1 = await stageFixture({ source: a, dest, releaseId: 'r1' });
    assert.equal(await readlink(dest), r1.currentTarget);
    const r2 = await stageFixture({ source: b, dest, releaseId: 'r2' });
    assert.equal(r2.previousTarget, r1.currentTarget);
    await assert.rejects(stageFixture({ source: b, dest, releaseId: 'r2' }), /already exists/);
    const rb = await stageFixture({ dest, rollback: true });
    assert.equal(await readlink(dest), r1.currentTarget); assert.equal(rb.currentTarget, r1.currentTarget);
    await writeFile(path.join(b, 'data/phantom/skin.glb'), 'tampered');
    await assert.rejects(stageFixture({ source: b, dest, releaseId: 'r3' }), /hash mismatch/);
    await assert.rejects(stageFixture({ source: a, dest: path.join(process.cwd(), 'apps/web/dist/x'), releaseId: 'r4' }), /outside the main web dist/);
  } finally { await rm(tmp, { recursive: true, force: true }); }
});

test('atlas model check: matching hashes pass, a changed model is refused', async () => {
  const { checkAtlasModels } = await import('./stage-4d-lab.mjs');
  const { mkdtemp, mkdir, writeFile } = await import('node:fs/promises');
  const { tmpdir } = await import('node:os');
  const { createHash } = await import('node:crypto');
  const d = await mkdtemp(path.join(tmpdir(), 'atlas-check-'));
  await mkdir(path.join(d, 'lab/data/atlas'), { recursive: true }); await mkdir(path.join(d, 'atlas/models'), { recursive: true });
  await writeFile(path.join(d, 'atlas/models/visceral.glb'), 'model-v1');
  await writeFile(path.join(d, 'lab/data/atlas/anatomy.json'), JSON.stringify({ build: { sourceModels: { 'visceral.glb': createHash('sha256').update('model-v1').digest('hex') } } }));
  assert.equal((await checkAtlasModels(path.join(d, 'lab'), path.join(d, 'atlas'))).checked, 1);
  await writeFile(path.join(d, 'atlas/models/visceral.glb'), 'model-v2');
  await assert.rejects(checkAtlasModels(path.join(d, 'lab'), path.join(d, 'atlas')), /differ/);
});
