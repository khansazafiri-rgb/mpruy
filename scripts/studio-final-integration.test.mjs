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
// Two references: the pinned PRE-INTEGRATION commit (legacy state before any studio integration; every "legacy unchanged"
// comparison uses it) and the trusted CI event base (the PR base). The pinned commit must be an ancestor of the event base,
// so a later PR (whose base already contains #233) still compares legacy code against the same original bytes.
const PRE_INTEGRATION = 'c489f724d7ad926f6b6083f60556ebecbcfa89d6';
const eventBase = process.env.STUDIOS_INTEGRATION_BASE_SHA || PRE_INTEGRATION;
assert.match(eventBase, /^[a-f0-9]{40}$/);
git('merge-base', '--is-ancestor', PRE_INTEGRATION, eventBase);
const base = PRE_INTEGRATION;
const source = '970f6435790b7b1add33467226440ea7b6d840fa';
const before = p => execFileSync('git', ['show', base + ':' + p], { cwd: root, encoding: 'utf8' });
const sha = b => crypto.createHash('sha256').update(b).digest('hex');
const catalog = json('shared/studios/catalog.v1.json');
const clinical = catalog.studios.filter(s => !s.internal);
const resources = json('licensing/resources.v1.json');
const records = json('licensing/commercial-rights-evidence.json').records;
const summaries = [];

test('INTEGRATION-001 preserves target and original WS1-WS5 ancestry', () => {
  for (const ref of [base, eventBase, source, '9d047551e052fd9de19dbcc1520086a527be891f',
    '612b2d63455989a959898d5cecf4e898006db045', '46fbdab5ed2a79e73ad37401f961f4a4660cc20f',
    '3dca0c6025a470b73c8a7fbbe53a7bbe7bab79d5']) git('merge-base', '--is-ancestor', ref, 'HEAD');
});

test('INTEGRATION-002 canonical identities and quarantine remain unchanged; later licence policy may only tighten', () => {
  for (const p of ['shared/studios/catalog.v1.json', 'shared/studios/catalog.schema.json',
    'shared/studios/frozen-ids.json', 'licensing/quarantine-policy.json',
    'licensing/quarantined-hashes.json']) assert.equal(read(p), before(p), p);

  // The 2026-11-22 licence-safe batch explicitly disabled the old owner-risk
  // overrides. Historical byte equality would incorrectly demand that
  // unsupported noncommercial builds still be publishable by override.
  // Compare every legacy commercial policy field except the narrowly reviewed
  // tightening: purpose, ownerOverride.enabled and its explanatory reason.
  const original = JSON.parse(before('licensing/commercial-release.json'));
  const current = json('licensing/commercial-release.json');
  assert.equal(current.schemaVersion, original.schemaVersion);
  assert.deepEqual(Object.keys(current.products).sort(), Object.keys(original.products).sort());
  assert.match(current.purpose, /verified redistributable\/commercial rights/);
  for (const [product, legacy] of Object.entries(original.products)) {
    const actual = current.products[product];
    assert.equal(actual.status, 'blocked', product + ': no implicit rights approval');
    assert.deepEqual(actual.blockers, legacy.blockers, product + ': rights blockers preserved');
    assert.deepEqual(actual.approvedBuilds, legacy.approvedBuilds, product + ': no forged build approval');
    assert.equal(actual.ownerOverride.enabled, false, product + ': owner override disabled');
    assert.match(actual.ownerOverride.disabledReason, /owner direction.*do not rely/i);
    const withoutTightening = structuredClone(actual);
    withoutTightening.ownerOverride.enabled = legacy.ownerOverride.enabled;
    delete withoutTightening.ownerOverride.disabledReason;
    assert.deepEqual(withoutTightening, legacy, product + ': other policy terms unchanged');
  }
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
  assert.equal(records.length, 39);
  for (const old of original.records) assert.deepEqual(records.find(r => r.id === old.id), old, old.id);
  const oldIds = new Set(original.records.map(r => r.id));
  const added = records.filter(r => !oldIds.has(r.id));
  // 16 derived-output records (one per studio with private data) + 1 BLOCKED record (LPBA40-derived brain-mri labels,
  // LONI non-commercial licence) + 8 official-source records (one per source).
  assert.equal(added.length, 25);
  assert.equal(added.filter(r => r.id.startsWith('studio-res-')).length, 17);
  assert.equal(added.filter(r => r.id.startsWith('studio-src-')).length, 8);
  assert.deepEqual(added.filter(r => r.status !== 'needs-review').map(r => [r.id, r.status, r.sourceCommercialUse]), [['studio-res-brain-mri-lpba40', 'blocked', false]]);
  assert.equal(records.filter(r => r.status === 'verified').length, 0);
});

test('INTEGRATION-005 resource metadata is valid but every asset remains pending medical/privacy review', () => {
  const validated = validateResources(resources, json('licensing/resource-manifest.schema.json'));
  assert.equal(validated.ok, true, JSON.stringify(validated.errors));
  assert.equal(resources.sources.length, 8);
  // 54 derived assets shipped in private builds + 46 official raw inputs (parents; logical "source/" paths, never shipped).
  const parents = resources.assets.filter(a => a.sourceFile), derived = resources.assets.filter(a => !a.sourceFile);
  assert.equal(derived.length, 54);
  assert.equal(parents.length, 46);
  for (const a of parents) {
    assert.equal(a.sourceFile.sha256, a.sha256, a.id);
    assert.match(a.path, /^source\//, a.id);
    assert.equal(a.protected, true, a.id);
    assert.deepEqual(a.dependsOn, [], a.id);
  }
  for (const a of derived) {
    assert.ok(a.dependsOn.length > 0, a.id + ' has lineage');
    for (const d of a.dependsOn) assert.equal(parents.find(p => p.id === d.assetId)?.sha256, d.sha256, a.id + ' -> ' + d.assetId);
    assert.match(a.derivation.pipelineCommit, /^[a-f0-9]{40}$/);
    assert.notEqual(a.derivation.pipelineCommit, '0'.repeat(40), a.id);
    assert.match(a.derivation.tool, /^apps\/studios\/tools\/prepare-[a-z0-9-]+\.mjs@sha256:[a-f0-9]{64}$/, a.id);
  }
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
  const phaseStatus = 'apps/4d-lab/PHASE_STATUS.md';
  // Master-execution additions (reviewed, studio-only): the studio page/host in apps/web, the migration-level bump the
  // web app enforces, and ONE additive migration. Existing migrations may never be modified or deleted.
  const studioOnly = new Set(['apps/web/src/features/studios/StudioHost.jsx', 'apps/web/src/features/studios/studioProgress.mjs',
    'apps/web/src/features/studios/studioProgress.test.mjs', 'apps/web/src/pages/StudioEntry.jsx', 'apps/web/src/lib/serverVersion.js',
    'apps/web/src/lib/serverVersion.test.mjs', 'apps/pocketbase/pb_migrations/1800003300_studio_progress.js']);
  const legacyDelta = git('diff', '--name-only', base, 'HEAD', '--', ...unchanged).split('\n').filter(Boolean);
  assert.deepEqual(legacyDelta.filter(p => p !== harness && p !== phaseStatus && !studioOnly.has(p)), []);
  assert.equal(git('diff', '--name-only', '--diff-filter=MDR', base, 'HEAD', '--', 'apps/pocketbase/pb_migrations'), '', 'existing migrations unchanged');
  assert.deepEqual(git('diff', '--name-only', base, 'HEAD', '--', 'apps/web/src/lib/serverVersion.js') ? git('diff', base, 'HEAD', '--', 'apps/web/src/lib/serverVersion.js').split('\n').filter(l => /^[+-][^+-]/.test(l)) : [],
    ['-export const REQUIRED_MIGRATION = 1800003200;', '+export const REQUIRED_MIGRATION = 1800003300;'], 'only the required migration level changes');
  // Reverse only reviewed setup/cleanup additions. The original 16 case bodies and assertions must survive intact.
  let normalized = read(harness);
  for (const [tag, original] of [
    ['tri-return', "  await page.getByTestId('mon-split').click();\n"],
    ['keyboard-context', ''],
    ['keyboard-targets', ''],
  ]) {
    const block = new RegExp('^  // BEGIN UX-RECOVERY: ' + tag + '\\n[\\s\\S]*?^  // END UX-RECOVERY: ' + tag + '\\n', 'gm');
    assert.equal([...normalized.matchAll(block)].length, 1, 'Exactly one reviewed ' + tag + ' block');
    normalized = normalized.replace(block, original);
  }
  normalized = normalized.replace(
    "await p.goto(url, { waitUntil: 'domcontentloaded', timeout: 180000 }); await p.waitForFunction(() => document.body.dataset.ready === '1', null, { timeout: 180000 });",
    "await p.goto(url); await p.waitForFunction(() => document.body.dataset.ready === '1', null, { timeout: 180000 });");
  assert.equal(normalized, before(harness), 'No legacy UX assertion or case may be edited or removed');
  // Integration may add guards/workflows/docs and strengthen an API test, never rewrite WS implementation.
  // Pinned to the integration merge (PR #233); later, separately reviewed work is guarded by its own tests.
  const integration = process.env.STUDIOS_INTEGRATION_MERGE_SHA || '6e1a1fb8426f2027b01260c1a6f4ecac07e34c29';
  const delta = git('diff', '--name-only', source, integration).split('\n').filter(Boolean);
  const permitted = new Set(['.github/workflows/studios-integration.yml', 'scripts/studio-final-integration.test.mjs',
    'docs/clinical-studios/14-final-integration-readiness.md', 'docs/clinical-studios/README.md',
    'apps/pocketbase/test/studios-api.test.mjs', 'apps/4d-lab/test/e2e/ux-e2e.mjs', 'apps/4d-lab/PHASE_STATUS.md']);
  assert.deepEqual(delta.filter(p => !permitted.has(p)), []);
});

after(() => {
  const report = { commit: git('rev-parse', 'HEAD'), base, eventBase, source, canonicalStudios: clinical.length,
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
