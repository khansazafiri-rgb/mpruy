import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { spawnSync } from 'node:child_process';
import {
  selectedSourceIds, sourceEntries, localSourcePath,
  recoveryPlan, assertPrivateDefaults,
} from '../licensing/tools/recover-private-studio-sources.mjs';

const ROOT = fileURLToPath(new URL('../', import.meta.url));
const read = () => JSON.parse(fs.readFileSync(path.join(ROOT, 'licensing/resources.v1.json'), 'utf8'));

test('RECOVER-001: default plan includes exactly the five source-verified teaching subsets', () => {
  assert.deepEqual(selectedSourceIds(), [
    'ptbxl-physionet', 'spider-zenodo', 'ptx498-zenodo', 'hc18-zenodo', 'lidc-idri-tcia',
  ]);
  const plan = recoveryPlan({ registry: read() });
  assert.equal(plan.sources.length, 5);
  assert.equal(plan.releaseApproved, false);
  assert.equal(plan.userAccess, false);
  assert.ok(plan.sources.every(s => s.requiredFiles > 0));
  assert.equal(assertPrivateDefaults(read()), 37);
});

test('RECOVER-002: high-uncertainty BodyParts3D/SRI24 explicitly opt in and exclude LPBA40', () => {
  const flags = ['--include-bodyparts', '--include-sri24-tissue'];
  assert.deepEqual(selectedSourceIds(flags).slice(-2), ['bodyparts3d-dbcls', 'sri24-nitrc']);
  const plan = recoveryPlan({ registry: read(), flags });
  assert.equal(plan.sources.length, 7);
  assert.equal(sourceEntries({ registry: read(), sourceId: 'sri24-nitrc' }).length, 2);
  assert.ok(plan.sources.find(s => s.id === 'sri24-nitrc').assets.every(a => !/labels|lpba40/i.test(a.member)));
  assert.ok(plan.sources.every(s => s.id !== 'amos-zenodo'));
});

test('RECOVER-003: every selected source has pinned official URL, exact asset sha and safe private path', () => {
  const reg = read(), ids = selectedSourceIds(['--include-bodyparts', '--include-sri24-tissue']);
  for (const id of ids) for (const e of sourceEntries({ registry: reg, sourceId: id })) {
    assert.match(e.url, /^https:\/\//);
    assert.match(e.sha256, /^[a-f0-9]{64}$/);
    assert.ok(e.destination.startsWith(path.join(ROOT, 'local-data') + path.sep), e.destination);
    assert.ok(!e.destination.includes('/public/'));
  }
  assert.equal(path.basename(localSourcePath('spider-zenodo', { member: 'masks/1_t2.mha' })), '1_t2_mask.mha');
  assert.equal(path.basename(localSourcePath('spider-zenodo', { member: 'images/1_t2.mha' })), '1_t2.mha');
});

test('RECOVER-004: registry URL, sha and license tampering is fail closed', () => {
  let r = read(); r.sources.find(x => x.id === 'ptbxl-physionet').status = 'REVIEW_REQUIRED';
  assert.throws(() => sourceEntries({ registry: r, sourceId: 'ptbxl-physionet' }), /licensing changed/);
  r = read(); r.sources.find(x => x.id === 'ptbxl-physionet').licenseId = 'CC-BY-NC-4.0';
  assert.throws(() => sourceEntries({ registry: r, sourceId: 'ptbxl-physionet' }), /licensing changed/);
  r = read(); r.assets.find(x => x.sourceRef === 'spider-zenodo' && x.sourceFile).sourceFile.url = 'https://mirror.invalid/zip';
  assert.throws(() => sourceEntries({ registry: r, sourceId: 'spider-zenodo' }), /Unpinned source/);
  r = read(); r.assets.find(x => x.sourceRef === 'hc18-zenodo' && x.sourceFile).sourceFile.sha256 = 'a'.repeat(64);
  assert.throws(() => sourceEntries({ registry: r, sourceId: 'hc18-zenodo' }), /Unpinned source/);
});

test('RECOVER-005: source ZIP member mapping refuses path traversal and unknown SPIDER source', () => {
  assert.throws(() => localSourcePath('ptbxl-physionet', { member: '../secrets' }), /Unsafe/);
  assert.throws(() => localSourcePath('spider-zenodo', { member: 'masks/other_case.mha' }), /Unexpected SPIDER/);
  assert.throws(() => localSourcePath('hc18-zenodo', { member: '/etc/passwd' }), /Unsafe/);
});

test('RECOVER-006: CLI defaults to no network or filesystem writes and rejects accidental unsupported flags', () => {
  const cmd = path.join(ROOT, 'licensing/tools/recover-private-studio-sources.mjs');
  const one = spawnSync(process.execPath, [cmd, '--plan'], { cwd: ROOT, encoding: 'utf8', timeout: 15000 });
  assert.equal(one.status, 0, one.stderr);
  assert.match(one.stdout, /OFFLINE PLAN ONLY/);
  assert.match(one.stdout, /ptbxl-physionet/);
  const bad = spawnSync(process.execPath, [cmd, '--publish'], { cwd: ROOT, encoding: 'utf8', timeout: 15000 });
  assert.equal(bad.status, 2);
});

test('RECOVER-007: repo retains blocked upstream LPBA40 and NC Atlas rights; this tool does not grant clearance', () => {
  const rights = JSON.parse(fs.readFileSync(path.join(ROOT, 'licensing/commercial-rights-evidence.json'), 'utf8'));
  for (const id of ['studio-res-brain-mri-lpba40', 'atlas-code'])
    assert.equal(rights.records.find(r => r.id === id).status, 'blocked');
  const script = fs.readFileSync(path.join(ROOT, 'licensing/tools/recover-private-studio-sources.mjs'), 'utf8');
  assert.match(script, /rightsAndHumanReviews: 'pending'/);
  assert.doesNotMatch(script, /status:\s*'verified'\s*[,}]/i);
  assert.doesNotMatch(script, /issueReceipt|signDecision|ownerOverride/);
});
