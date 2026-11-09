import { test } from 'node:test';
import assert from 'node:assert/strict';
import { mkdtemp, mkdir, writeFile, readFile, rm } from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';
import { assertCommercialReleaseReady, releaseDigest } from '../licensing/tools/check-commercial-release.mjs';
import { approveSyntheticFixture } from './commercial-release-fixture.mjs';
import { stageLab } from './stage-4d-lab.mjs';

test('current Atlas and Lab commercial releases are blocked despite clean local fixtures', async (t) => {
  const dir = await mkdtemp(path.join(os.tmpdir(), 'commercial-block-')); t.after(() => rm(dir, { recursive: true, force: true }));
  await writeFile(path.join(dir, 'index.html'), 'local preview');
  assert.throws(() => assertCommercialReleaseReady('atlas-viewer', dir), /Commercial release blocked.*CC BY-NC-SA/);
  assert.throws(() => assertCommercialReleaseReady('4d-lab', dir), /Commercial release blocked.*provenance/);
});

test('a synthetic rights approval is bound to the complete build bytes and obligations', async (t) => {
  const dir = await mkdtemp(path.join(os.tmpdir(), 'commercial-hash-')); t.after(() => rm(dir, { recursive: true, force: true }));
  const build = path.join(dir, 'build'), manifest = path.join(dir, 'approval.json');
  await mkdir(build); await writeFile(path.join(build, 'index.html'), 'first');
  await approveSyntheticFixture(build, '4d-lab', manifest);
  assert.equal(assertCommercialReleaseReady('4d-lab', build, manifest).digest, releaseDigest(build));
  await writeFile(path.join(build, 'index.html'), 'changed');
  assert.throws(() => assertCommercialReleaseReady('4d-lab', build, manifest), /no complete rights approval/);
  await writeFile(path.join(build, 'index.html'), 'first');
  const data = JSON.parse(await readFile(manifest, 'utf8'));
  delete data.products['4d-lab'].approvedBuilds[0].shareAlike;
  await writeFile(manifest, JSON.stringify(data));
  assert.throws(() => assertCommercialReleaseReady('4d-lab', build, manifest), /no complete rights approval/);
});

test('staging a locally valid Lab fixture still refuses the unresolved commercial rights', async (t) => {
  const dir = await mkdtemp(path.join(os.tmpdir(), 'commercial-stage-')); t.after(() => rm(dir, { recursive: true, force: true }));
  const source = path.join(dir, 'source'), dest = path.join(dir, 'live', 'lab');
  await mkdir(path.join(source, 'assets'), { recursive: true }); await mkdir(path.join(source, 'data/phantom'), { recursive: true });
  await writeFile(path.join(source, 'index.html'), '<script src="/anatomy/4d-lab/assets/index.js"></script>');
  await writeFile(path.join(source, 'assets/index.js'), 'export {}');
  for (const file of ['ct.nrrd', 'labels.nrrd', 'skin.glb', 'organs.glb']) await writeFile(path.join(source, 'data/phantom', file), file);
  await writeFile(path.join(source, 'data/phantom/anatomy.json'), JSON.stringify({ schema: 'medcoel.anatomy.v1' }));
  await writeFile(path.join(source, 'data/phantom/registration.json'), JSON.stringify({ meshes: [] }));
  await assert.rejects(stageLab({ source, dest, releaseId: 'blocked' }), /Commercial release blocked/);
  await assert.rejects(readFile(path.join(dest + '-releases', 'blocked', 'index.html')));
});
