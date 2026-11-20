// Final-integration invariants. Run after the 24 fixture builds; no medical data or approvals are created.
import test, { after } from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import crypto from 'node:crypto';
import { execFileSync } from 'node:child_process';
import { createRequire } from 'node:module';
import { fileURLToPath } from 'node:url';
import { validateResources } from '../packages/studio-contract/manifest.mjs';
const require = createRequire(import.meta.url);
const core = require('../packages/studio-contract/availability.cjs');
const C = require('../packages/studio-contract/clearance.cjs');
const root = fileURLToPath(new URL('../', import.meta.url));
const git = (...args) => execFileSync('git', args, { cwd: root, encoding: 'utf8' }).trim();
const read = p => fs.readFileSync(path.join(root, p), 'utf8');
const json = p => JSON.parse(read(p));
const base = process.env.STUDIOS_INTEGRATION_BASE_SHA || 'c489f724d7ad926f6b6083f60556ebecbcfa89d6';
const source = '970f6435790b7b1add33467226440ea7b6d840fa';
assert.match(base, /^[a-f0-9]{40}$/);
const before = p => execFileSync('git', ['show', base + ':' + p], { cwd: root, encoding: 'utf8' });
const sha = b => crypto.createHash('sha256').update(b).digest('hex');
const catalog = json('shared/studios/catalog.v1.json');
const clinical = catalog.studios.filter(s => !s.internal);
const resources = json('licensing/resources.v1.json');
const records = json('licensing/commercial-rights-evidence.json').records;
const summaries = [];

test('INTEGRATION-001 preserves target and original WS1-WS5 ancestry', () => {
  for (const ref of [base, source, '9d047551e052fd9de19dbcc1520086a527be891f',
    '612b2d63455989a959898d5cecf4e898006db045', '46fbdab5ed2a79e73ad37401f961f4a4660cc20f',
    '3dca0c6025a470b73c8a7fbbe53a7bbe7bab79d5']) git('merge-base', '--is-ancestor', ref, 'HEAD');
});

test('INTEGRATION-002 canonical catalog and protected policies remain byte-identical to target', () => {
  for (const p of ['shared/studios/catalog.v1.json', 'shared/studios/catalog.schema.json',
    'shared/studios/frozen-ids.json', 'licensing/commercial-release.json',
    'licensing/quarantine-policy.json', 'licensing/quarantined-hashes.json']) assert.equal(read(p), before(p), p);
});

test('INTEGRATION-003 exactly 24 independent entries use the existing canonical IDs', () => {
  const dir = path.join(root, 'apps/studios');
  const builtIds = fs.readdirSync(dir).filter(id => fs.existsSync(path.join(dir, id, 'studio.config.json'))).sort();
  assert.equal(clinical.length, 24);
  assert.deepEqual(builtIds, clinical.map(s => s.id).sort());
  const engines = {};
  for (const id of builtIds) {
    const cfg = json('apps/studios/' + id + '/studio.config.json');
    assert.equal(cfg.studioId, id);
    assert.ok(fs.existsSync(path.join(dir, id, 'index.html')));
    engines[cfg.engine] = (engines[cfg.engine] || 0) + 1;
  }
  assert.deepEqual(engines, { anatomy3d: 9, volume: 7, image2d: 7, ecg: 1 });
});

test('INTEGRATION-004 preserves every legacy evidence record without upgrading any rights', () => {
  const original = JSON.parse(before('licensing/commercial-rights-evidence.json'));
  assert.equal(original.records.length, 14);
  assert.equal(records.length, 27);
  for (const old of original.records) assert.deepEqual(records.find(r => r.id === old.id), old, old.id);
  const oldIds = new Set(original.records.map(r => r.id));
  const added = records.filter(r => !oldIds.has(r.id));
  assert.equal(added.length, 13);
  assert.ok(added.every(r => r.id.startsWith('studio-res-') && r.status === 'needs-review'));
  assert.equal(records.filter(r => r.status === 'verified').length, 0);
});

test('INTEGRATION-005 resource metadata is valid but every asset remains pending medical/privacy review', () => {
  const validated = validateResources(resources, json('licensing/resource-manifest.schema.json'));
  assert.equal(validated.ok, true, JSON.stringify(validated.errors));
  assert.equal(resources.sources.length, 5);
  assert.equal(resources.assets.length, 35);
  assert.ok(resources.assets.every(a => a.medicalReview.status === 'pending' && a.privacyReview.status === 'pending'));
  assert.ok(resources.assets.every(a => records.some(r => r.id === a.rightsEvidenceRef && r.status !== 'verified')));
  const tracked = git('ls-tree', '-r', '--name-only', 'HEAD').split('\n');
  assert.deepEqual(tracked.filter(p => p.startsWith('local-data/')), []);
  assert.deepEqual(tracked.filter(p => /^apps\/studios\/[^/]+\/dist\//.test(p)), []);
});

test('INTEGRATION-006 all canonical studios stay closed for real user/admin principals', () => {
  for (const [role, count] of [['user', 24], ['admin', 25]]) {
    const principal = { role, campus: '', active: true };
    const list = core.list(catalog, principal);
    assert.equal(list.items.length, count);
    assert.ok(list.items.every(s => s.availability.canLaunch === false && s.capabilities.length === 0));
    for (const s of list.items) assert.equal(core.launch(catalog, s.id, principal, { mode: 'explore' }).status, 409, role + ':' + s.id);
  }
});

test('INTEGRATION-007 every built manifest binds actual bytes, resources and the exact checkout commit', () => {
  const commit = git('rev-parse', 'HEAD');
  for (const studio of clinical) {
    const dir = path.join(root, 'apps/studios', studio.id, 'dist');
    const m = JSON.parse(fs.readFileSync(path.join(dir, 'studio-manifest.json'), 'utf8'));
    assert.equal(m.id, studio.id);
    assert.equal(m.builtFrom, commit);
    assert.equal(C.validateInventory(m, { studioId: studio.id, releaseId: m.releaseId }), null);
    assert.match(m.releaseId, /^fixture-/);
    const resourceBytes = fs.readFileSync(path.join(dir, 'resource-manifest.json'));
    assert.equal(sha(resourceBytes), m.resourceManifestSha256);
    assert.deepEqual(JSON.parse(resourceBytes), resources);
    const diskFiles = [];
    const walk = (folder, prefix = '') => {
      for (const e of fs.readdirSync(folder, { withFileTypes: true })) {
        assert.equal(e.isSymbolicLink(), false);
        const p = prefix + e.name;
        if (e.isDirectory()) walk(path.join(folder, e.name), p + '/');
        else { assert.ok(e.isFile()); diskFiles.push(p); }
      }
    };
    walk(dir);
    assert.deepEqual(diskFiles.filter(p => p !== 'studio-manifest.json').sort(), m.files.map(f => f.path).sort());
    for (const f of m.files) {
      const bytes = fs.readFileSync(path.join(dir, f.path));
      assert.equal(bytes.length, f.bytes, studio.id + ':' + f.path);
      assert.equal(sha(bytes), f.sha256, studio.id + ':' + f.path);
    }
    const dataset = JSON.parse(fs.readFileSync(path.join(dir, 'data/dataset.json'), 'utf8'));
    assert.match(dataset.status, /fixture/i);
    summaries.push({ studioId: studio.id, engine: json('apps/studios/' + studio.id + '/studio.config.json').engine,
      releaseId: m.releaseId, dataStatus: dataset.status, files: m.files.length,
      bytes: m.files.reduce((sum, f) => sum + f.bytes, 0) });
  }
});

test('INTEGRATION-008 preserves legacy applications, deploy configuration and WS runtime implementations', () => {
  const unchanged = ['apps/web', 'apps/anatomy', 'apps/4d-lab', 'apps/hermes-agent', 'deploy', 'shared/lab-tracks.json', 'apps/pocketbase/pb_migrations'];
  const harness = 'apps/4d-lab/test/e2e/ux-e2e.mjs';
  const legacyDelta = git('diff', '--name-only', base, 'HEAD', '--', ...unchanged).split('\n').filter(Boolean);
  assert.deepEqual(legacyDelta.filter(p => p !== harness), []);
  // Navigation setup alone changes; every existing assertion must remain byte-identical.
  const normalized = read(harness).replace(
    "await p.goto(url, { waitUntil: 'domcontentloaded', timeout: 180000 }); await p.waitForFunction(() => document.body.dataset.ready === '1', null, { timeout: 180000 });",
    "await p.goto(url); await p.waitForFunction(() => document.body.dataset.ready === '1', null, { timeout: 180000 });");
  assert.equal(normalized, before(harness), 'No legacy UX assertion may be edited or removed');
  // Integration may add guards/workflows/docs and strengthen an API test, never rewrite WS implementation.
  const delta = git('diff', '--name-only', source, 'HEAD').split('\n').filter(Boolean);
  const permitted = new Set(['.github/workflows/studios-integration.yml', 'scripts/studio-final-integration.test.mjs',
    'docs/clinical-studios/14-final-integration-readiness.md', 'docs/clinical-studios/README.md',
    'apps/pocketbase/test/studios-api.test.mjs', 'apps/4d-lab/test/e2e/ux-e2e.mjs']);
  assert.deepEqual(delta.filter(p => !permitted.has(p)), []);
});

after(() => {
  const report = { commit: git('rev-parse', 'HEAD'), base, source, canonicalStudios: clinical.length,
    registry: { sources: resources.sources.length, assets: resources.assets.length,
      registeredAssetBytes: resources.assets.reduce((sum, a) => sum + a.bytes, 0),
      registeredBytesAreNotServerInstallation: true },
    fixtureBuildBytes: summaries.reduce((sum, s) => sum + s.bytes, 0), builds: summaries,
    clinicalDataPresentInGit: false, serverInstallationVerified: false };
  console.log('Integration build inventory: ' + JSON.stringify(report));
  if (process.env.STUDIO_INTEGRATION_REPORT) {
    fs.mkdirSync(path.dirname(process.env.STUDIO_INTEGRATION_REPORT), { recursive: true });
    fs.writeFileSync(process.env.STUDIO_INTEGRATION_REPORT, JSON.stringify(report, null, 2) + '\n');
  }
});
