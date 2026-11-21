import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import os from 'node:os';
import crypto from 'node:crypto';
import { fileURLToPath } from 'node:url';
import { spawnSync } from 'node:child_process';
import {
  selectedSourceIds, sourceEntries, localSourcePath,
  recoveryPlan, assertPrivateDefaults, tciaDerivedHashCheck, tciaDerivedAudit,
  classifyHc18Source, isZipRangeProtocolFailure,
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

test('RECOVER-008: HC18 ZIP-range transport failure is distinguishable from bad member integrity', () => {
  for (const error of ['EOCD not found', 'Range not supported (200)', 'Invalid HTTP Content-Range',
    'ZIP endpoint does not provide correct byte ranges', 'Bad central directory entry'])
    assert.equal(isZipRangeProtocolFailure(new Error(error)), true);
  for (const error of ['CRC/size mismatch for image', 'SHA-256 mismatch', 'Download blocked by rights'])
    assert.equal(isZipRangeProtocolFailure(new Error(error)), false);
});

test('RECOVER-009: three exact TCIA derived hashes must match old registry before accepting a changed ZIP', t => {
  const root = fs.mkdtempSync(path.join(os.tmpdir(), 'tcia-repack-proof-'));
  t.after(() => fs.rmSync(root, { recursive: true, force: true }));
  const names = ['data/ct.nii.gz', 'data/readers.nii.gz', 'data/annotations.json'];
  const registry = { assets: names.map((p, i) => ({
    id: 'chest-ct.' + i, path: p, sourceFile: null,
    sha256: crypto.createHash('sha256').update('verified-' + i).digest('hex'),
  })) };
  for (let i = 0; i < names.length; i++) {
    const file = path.join(root, names[i]);
    fs.mkdirSync(path.dirname(file), { recursive: true });
    fs.writeFileSync(file, 'verified-' + i);
  }
  const ok = tciaDerivedHashCheck({ registry, privateBuildRoot: root });
  assert.equal(ok.registeredDerivedCount, 3);
  assert.equal(ok.previousRawZipShaStillUnverified, true);
  assert.equal(ok.releaseApproved, false);
  fs.writeFileSync(path.join(root, names[1]), 'untrusted-different-pixels');
  assert.throws(() => tciaDerivedHashCheck({ registry, privateBuildRoot: root }), /TCIA_DERIVED_SHA_MISMATCH/);
});

test('RECOVER-010: an incomplete TCIA pinned derivative set cannot be treated as equivalent', t => {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'tcia-empty-proof-'));
  t.after(() => fs.rmSync(dir, { recursive: true, force: true }));
  assert.throws(() => tciaDerivedHashCheck({
    registry: { assets: [{ id: 'chest-ct.ct.nii.gz', path: 'data/ct.nii.gz', sha256: 'a'.repeat(64) }] },
    privateBuildRoot: dir,
  }), /TCIA_PINNED_DERIVATIVE_RECORDS_INCOMPLETE/);
});

test('RECOVER-011: HC18 metadata CSV is a direct verified file and PNGs are ZIP members', () => {
  const items = sourceEntries({ registry: read(), sourceId: 'hc18-zenodo' });
  assert.equal(items.length, 9);
  assert.deepEqual(items.map(classifyHc18Source).filter(v => v === 'direct-verified-csv').length, 1);
  assert.deepEqual(items.map(classifyHc18Source).filter(v => v === 'zip-member').length, 8);
  const csv = items.find(v => v.member.endsWith('.csv'));
  assert.equal(classifyHc18Source(csv), 'direct-verified-csv');
  assert.throws(() => classifyHc18Source({ ...csv, url: csv.url.replace('.csv/content', '.zip/content') }), /Unexpected HC18/);
  assert.throws(() => classifyHc18Source({ ...csv, member: '../bad.csv' }), /Unexpected HC18/);
  assert.throws(() => classifyHc18Source({ sourceId: 'amos-zenodo', member: 'dataset.json' }), /Not an HC18/);
});

test('RECOVER-012: TCIA diagnostic identifies exact mismatched derived file without exposing image or clinical records', t => {
  const root = fs.mkdtempSync(path.join(os.tmpdir(), 'tcia-exact-output-'));
  t.after(() => fs.rmSync(root, { recursive: true, force: true }));
  const names = ['data/ct.nii.gz', 'data/readers.nii.gz', 'data/annotations.json'];
  const registry = { assets: names.map((name, i) => ({
    id: 'chest-ct.' + i, path: name, sha256: crypto.createHash('sha256').update('expected-' + i).digest('hex'),
  })) };
  for (let i = 0; i < names.length; i++) {
    const dest = path.join(root, names[i]); fs.mkdirSync(path.dirname(dest), { recursive: true });
    fs.writeFileSync(dest, 'expected-' + i);
  }
  let audit = tciaDerivedAudit({ registry, privateBuildRoot: root });
  assert.equal(audit.allDerivedHashesMatch, true);
  assert.equal(audit.originalZipParentHashVerified, false);
  fs.writeFileSync(path.join(root, names[1]), 'different-reader-mask');
  audit = tciaDerivedAudit({ registry, privateBuildRoot: root });
  assert.equal(audit.allDerivedHashesMatch, false);
  assert.deepEqual(audit.outputs.filter(x => !x.matches).map(x => x.path), ['data/readers.nii.gz']);
  assert.equal(audit.releaseApproved, false);
  assert.ok(audit.outputs.every(x => !Object.keys(x).some(k => /patient|name|imageData|pixelBytes/i.test(k))));
  assert.throws(() => tciaDerivedHashCheck({ registry, privateBuildRoot: root }), /TCIA_DERIVED_SHA_MISMATCH/);
});

test('RECOVER-013: changed CT source cannot promote rights and keeps mismatched candidate outside canonical build', () => {
  const source = fs.readFileSync(path.join(ROOT, 'licensing/tools/recover-private-studio-sources.mjs'), 'utf8');
  assert.match(source, /tcia-derived-mismatch\\.json/);
  assert.match(source, /privateCandidateQuarantine/);
  assert.match(source, /fs\\.renameSync\\(ctOutput, candidate\\)/);
  assert.doesNotMatch(source, /status:\\s*['"]publishable['"]/);
});
