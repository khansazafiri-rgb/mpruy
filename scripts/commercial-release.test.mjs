import { test } from 'node:test';
import assert from 'node:assert/strict';
import { mkdtemp, mkdir, writeFile, readFile, rm } from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';
import { assertCommercialReleaseReady, releaseDigest, ownerOverrideProblem, OWNER_OVERRIDE_ACKNOWLEDGEMENT } from '../licensing/tools/check-commercial-release.mjs';
import { approveSyntheticFixture } from './commercial-release-fixture.mjs';
import { stageLab } from './stage-4d-lab.mjs';


const REAL_MANIFEST = path.join(path.dirname(new URL(import.meta.url).pathname), '../licensing/commercial-release.json');
/** The committed manifest, with the owner overrides removed or replaced, written to a temp file. */
async function manifestVariant(dir, change) {
  const data = JSON.parse(await readFile(REAL_MANIFEST, 'utf8'));
  for (const policy of Object.values(data.products)) change(policy);
  const file = path.join(dir, 'variant.json'); await writeFile(file, JSON.stringify(data)); return file;
}
const goodOverride = (extra = {}) => ({ enabled: true, decidedBy: 'owner', decidedOn: '2026-11-10', expiresOn: '2027-02-08', rightsVerified: false, acknowledgement: OWNER_OVERRIDE_ACKNOWLEDGEMENT, scope: 'test', ...extra });
const NOW = new Date('2026-11-12T00:00:00Z');

test('without an owner override the Atlas and Lab releases are blocked despite clean local fixtures', async (t) => {
  const dir = await mkdtemp(path.join(os.tmpdir(), 'commercial-block-')); t.after(() => rm(dir, { recursive: true, force: true }));
  await writeFile(path.join(dir, 'index.html'), 'local preview');
  const none = await manifestVariant(dir, (p) => { delete p.ownerOverride; });
  assert.throws(() => assertCommercialReleaseReady('atlas-viewer', dir, none), /Commercial release blocked.*CC BY-NC-SA/);
  assert.throws(() => assertCommercialReleaseReady('4d-lab', dir, none), /Commercial release blocked.*provenance/);
});

test('the committed manifest carries the owner override: allowed, but never presented as verified rights', async (t) => {
  const dir = await mkdtemp(path.join(os.tmpdir(), 'commercial-owner-')); t.after(() => rm(dir, { recursive: true, force: true }));
  await writeFile(path.join(dir, 'index.html'), 'local preview');
  const data = JSON.parse(await readFile(REAL_MANIFEST, 'utf8'));
  for (const product of ['atlas-viewer', '4d-lab']) {
    assert.equal(data.products[product].status, 'blocked', 'status stays blocked: an override is not a clearance');
    assert.ok(data.products[product].blockers.length > 0, 'the blockers stay listed');
    assert.deepEqual(data.products[product].approvedBuilds, []);
    const r = assertCommercialReleaseReady(product, dir, REAL_MANIFEST, { now: new Date('2026-11-12T00:00:00Z') });
    assert.equal(r.ownerOverride, true); assert.equal(r.rightsVerified, false); assert.ok(r.blockers.length > 0); assert.match(r.warning, /NOT verified/);
  }
});

test('an owner override must be complete, honest and unexpired', () => {
  assert.equal(ownerOverrideProblem(goodOverride(), NOW), null);
  assert.match(ownerOverrideProblem(undefined, NOW), /no owner override/);
  assert.match(ownerOverrideProblem(goodOverride({ enabled: false }), NOW), /no owner override/);
  assert.match(ownerOverrideProblem(goodOverride({ rightsVerified: true }), NOW), /cannot claim clearance/);
  assert.match(ownerOverrideProblem(goodOverride({ rightsVerified: undefined }), NOW), /rightsVerified: false/);
  assert.match(ownerOverrideProblem(goodOverride({ acknowledgement: 'ok' }), NOW), /acknowledgement/);
  assert.match(ownerOverrideProblem(goodOverride({ decidedBy: '' }), NOW), /decidedBy/);
  assert.match(ownerOverrideProblem(goodOverride({ expiresOn: '2026-11-11' }), NOW), /expired/);
  assert.match(ownerOverrideProblem(goodOverride({ expiresOn: '2027-06-01' }), NOW), /at most 120 days/);
  assert.match(ownerOverrideProblem(goodOverride({ decidedOn: '2026-12-31' }), NOW), /future/);
  assert.match(ownerOverrideProblem(goodOverride({ expiresOn: 'soon' }), NOW), /dates/);
});

test('an expired or invalid override blocks the release again, naming the real blockers', async (t) => {
  const dir = await mkdtemp(path.join(os.tmpdir(), 'commercial-expired-')); t.after(() => rm(dir, { recursive: true, force: true }));
  await writeFile(path.join(dir, 'index.html'), 'x');
  const expired = await manifestVariant(dir, (p) => { p.ownerOverride = goodOverride({ expiresOn: '2026-11-11' }); });
  assert.throws(() => assertCommercialReleaseReady('4d-lab', dir, expired, { now: NOW }), /Commercial release blocked.*provenance/);
  const claimsRights = await manifestVariant(dir, (p) => { p.ownerOverride = goodOverride({ rightsVerified: true }); });
  assert.throws(() => assertCommercialReleaseReady('atlas-viewer', dir, claimsRights, { now: NOW }), /Commercial release blocked/);
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

test('staging a locally valid Lab fixture is refused without an owner override and accepted, with a record, with one', async (t) => {
  const dir = await mkdtemp(path.join(os.tmpdir(), 'commercial-stage-')); t.after(() => rm(dir, { recursive: true, force: true }));
  const source = path.join(dir, 'source'), dest = path.join(dir, 'live', 'lab');
  await mkdir(path.join(source, 'assets'), { recursive: true }); await mkdir(path.join(source, 'data/phantom'), { recursive: true });
  await writeFile(path.join(source, 'index.html'), '<script src="/anatomy/4d-lab/assets/index.js"></script>');
  await writeFile(path.join(source, 'assets/index.js'), 'export {}');
  for (const file of ['ct.nrrd', 'labels.nrrd', 'skin.glb', 'organs.glb']) await writeFile(path.join(source, 'data/phantom', file), file);
  await writeFile(path.join(source, 'data/phantom/anatomy.json'), JSON.stringify({ schema: 'medcoel.anatomy.v1' }));
  await writeFile(path.join(source, 'data/phantom/registration.json'), JSON.stringify({ meshes: [] }));
  const none = await manifestVariant(dir, (p) => { delete p.ownerOverride; });
  await assert.rejects(stageLab({ source, dest, releaseId: 'blocked', commercialManifest: none }), /Commercial release blocked/);
  await assert.rejects(readFile(path.join(dest + '-releases', 'blocked', 'index.html')));
  // with a valid owner override the same fixture stages, and the decision is recorded with the release
  const owner = await manifestVariant(dir, (p) => { p.ownerOverride = goodOverride({ expiresOn: '2099-01-01', decidedOn: '2026-11-10' }); });
  const loose = JSON.parse(await readFile(owner, 'utf8')); for (const p of Object.values(loose.products)) p.ownerOverride.expiresOn = new Date(Date.now() + 60 * 86400000).toISOString().slice(0, 10);
  await writeFile(owner, JSON.stringify(loose));
  const staged = await stageLab({ source, dest, releaseId: 'owner', commercialManifest: owner });
  assert.equal(staged.commercialRights.ownerOverride, true);
  assert.equal(staged.commercialRights.rightsVerified, false);
  assert.match(staged.commercialRights.warning, /NOT verified/);
});
