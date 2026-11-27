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
  // PR #268 independently reviewed a targeted Caddy containment for
  // unverified skeletal/visceral GLBs and Atlas CT. Earlier "legacy unchanged"
  // checks predate that security fix. Permit only the exact reviewed Caddy bytes;
  // any later change to either route continues to fail this integration guard.
  const securityReviewCommit = '2296bee6ece0af192a2c72df125a0d62ca652fbb';
  git('merge-base', '--is-ancestor', securityReviewCommit, 'HEAD');
  const reviewedSecurityPaths = new Set(['deploy/Caddyfile', 'deploy/anatomy.caddy.snippet']);
  for (const file of reviewedSecurityPaths) {
    // git(...) trims stdout; use raw bytes for the pinned production security comparison.
    const original=execFileSync('git',['show',securityReviewCommit+':'+file],{cwd:root,encoding:'utf8'});
    // Sole allowable Caddy difference is ONE additive deny for private BodyParts3D
    // files before the general anatomy file-server. Removing it must reproduce the
    // exact, independently reviewed PR #268 bytes, including all existing blocks.
    const pad=file==='deploy/Caddyfile'?'\t':'';
    const inserted=[
      pad+'# Additional private BodyParts3D review models are NEVER public, even if accidentally copied.',
      pad+'handle /anatomy/viewer/bp3d/* {',
      pad+'\theader Cache-Control "private, no-store, max-age=0"',
      pad+'\trespond "Not Found" 404',
      pad+'}', ''
    ].join('\n');
    const actual=read(file);
    assert.equal(actual.split(inserted).length,2,'Exactly one reviewed private BP3D deny required: '+file);
    assert.ok(actual.indexOf(inserted)<actual.search(/^[\t ]*handle_path \/anatomy\/viewer\/\*\s*\{/m),
      'Private BP3D deny must precede public file-server: '+file);
    assert.equal(actual.replace(inserted,''),original,
      'Reviewed security Caddy config drift outside explicit private BP3D containment: '+file);
  }
  // Original emergency recovery is pinned here; subsequent 4D dataset recovery
  // is sealed to the tested Atlas checkpoint below. These application
  // files. Keep all other legacy application and 4D code protected.
  const recoveryReviewCommit='aaec5d1bd30fc6679ea84642f9ee547b5fe91516';
  git('merge-base','--is-ancestor',recoveryReviewCommit,'HEAD');
  const reviewedRecoveryPaths=new Set([
    'apps/anatomy/src/viewer/loadModel.js'
  ]);
  for(const file of reviewedRecoveryPaths)
    assert.equal(read(file),execFileSync('git',['show',recoveryReviewCommit+':'+file],{cwd:root,encoding:'utf8'}),
      'Emergency recovery file drift since reviewed code commit: '+file);
  // Scoped original Human Anatomy host correction (PR #290): the
  // application engine and production Caddyfile remain byte-for-byte intact.
  // New host protocols, tests and separate Caddy review snippet are vetted
  // by anatomy-4d-host-integration and the web unit suite.
  const reviewedHumanAnatomyPaths=new Set([
    'apps/web/src/features/anatomy/hostProtocol.mjs',
    'apps/web/src/features/anatomy/hostProtocol.test.mjs',
    'apps/web/src/features/anatomy/liveLab.mjs',
    'apps/web/src/features/anatomy/liveLab.test.mjs',
    'deploy/4d-lab.caddy.snippet'
  ]);
  for(const file of reviewedHumanAnatomyPaths)
    if(legacyDelta.includes(file))assert.ok(fs.existsSync(path.join(root,file)),
      'Missing reviewed Human Anatomy integration file: '+file);
  // The consolidated Atlas PR intentionally contains later Atlas recovery,
  // source-audit, private-host and backup work. Seal those explicit paths to
  // the tested WS6/WS7 checkpoint instead of demanding the pre-Studio bytes.
  // This is technical scope evidence, never commercial or release approval.
  const atlasCheckpoint='1111bc5fbf2227ff3f9fbd983189fd895bf610d8';
  git('merge-base','--is-ancestor',atlasCheckpoint,'HEAD');
  const atlasCheckpointPaths=new Map([
    ["apps/4d-lab/src/app/datasetRecovery.js","8640a8e7658ef66cac3f63527de2cb012a85f465"],
    ["apps/4d-lab/src/app/main.js","30fae45c35fb9d9bba30e6acf88d664f01385f81"],
    ["apps/4d-lab/test/bp3d-all-systems-exact-sources.test.mjs","00f56826af7f641d9d21668144395ed922185b3a"],
    ["apps/4d-lab/test/bp3d-all-systems-triage.test.mjs","a10a7c4ba4aaf1e493714d14dd932345e745f345"],
    ["apps/4d-lab/test/bp3d-batch.test.mjs","c10afb5f77ee9fd65089428d8c064ef8d08acc2f"],
    ["apps/4d-lab/test/bp3d-completeness.test.mjs","0973fd38067afe3aaac954778a72b8bf3a2f2d2e"],
    ["apps/4d-lab/test/bp3d-exact-vertebra-sources.test.mjs","a54c51858cad2053346c2f216cb0b93857cb7832"],
    ["apps/4d-lab/test/bp3d-focus-official-source-leads.test.mjs","a3d0c8adfe599123b6708fb42be1c9e0242c6bba"],
    ["apps/4d-lab/test/bp3d-focus-source-cache.test.mjs","ddba13e28514117e60ff6a16b8684e99c1c1184f"],
    ["apps/4d-lab/test/bp3d-focus-source-shortlist.test.mjs","e12fd4a0cfc43c308d6641826a68c17a1c8ced4f"],
    ["apps/4d-lab/test/bp3d-provisional.test.mjs","d10750d803f1dc1ff77f2feeb8a75560d23a2b55"],
    ["apps/4d-lab/test/bp3d-reviewed-mappings.test.mjs","d83978162c301c8951d6a56bf2f3965addc30c2b"],
    ["apps/4d-lab/test/bp3d-visible-gap-review.test.mjs","38b51e8707c5aad65f480814a37a6def9d75c296"],
    ["apps/4d-lab/test/datasetRecovery.test.mjs","14d68af65b86493e70804b6adbf4c846074247a2"],
    ["apps/4d-lab/test/workstationParse.test.mjs","4f286ad366b9ec51d445f34e30d11f42111d9390"],
    ["apps/4d-lab/tools/audit-bp3d-completeness.mjs","3bd807075ad400da2898cbff73f21d21cde14130"],
    ["apps/4d-lab/tools/batch-bp3d-candidates.mjs","aa1655b4f782a1d3ebf3202558a6a3a6f3a4ed64"],
    ["apps/4d-lab/tools/bp3d-all-systems-exact-sources.mjs","e29818d26ffd5a0754c2d591fcf5637839d85332"],
    ["apps/4d-lab/tools/bp3d-all-systems-triage.mjs","af2cb52347345a335019a52957042c1fbad988cf"],
    ["apps/4d-lab/tools/bp3d-exact-vertebra-sources.mjs","c68abbcea7eb3defd1586de98c03ad472c475bc9"],
    ["apps/4d-lab/tools/bp3d-focus-official-source-leads.mjs","153b25d9a266b8ebd6f82634a06e0d191555453e"],
    ["apps/4d-lab/tools/bp3d-focus-source-shortlist.mjs","4db7786d171d5ddc59f0c03255e1840ef54b2295"],
    ["apps/4d-lab/tools/bp3d-provisional-mappings.mjs","87c357f8c64ffadcd0e07a1da91bc5fc266be830"],
    ["apps/4d-lab/tools/bp3d-review-materials.mjs","af6ed4142b247010d26dba1813e75aabfb9c8605"],
    ["apps/4d-lab/tools/bp3d-reviewed-mappings.mjs","178c5f241c835afc184220a0e273469eeaad6538"],
    ["apps/4d-lab/tools/bp3d-source-name-priority.mjs","8595010cd19c541d39254a74e3be04987e3b427a"],
    ["apps/4d-lab/tools/bp3d-visible-gap-review.mjs","4d856282a40a909a826a1592800d30693e22d9d7"],
    ["apps/4d-lab/tools/prepare-bp3d-focus-leads.mjs","5bac3ecdb2788a75e268eec87182706605ea9b0c"],
    ["apps/anatomy/src/atlas/bp3dPanel.js","c3f48b3cc53a41bc0b79048a6ee29ebe46da2eeb"],
    ["apps/anatomy/src/atlas/catalog.js","6edda44efe4f394cef4804769e53a0dd47b679b1"],
    ["apps/anatomy/src/atlas/engine.js","62769d295f2badeb4e785da9995952edbd917ab7"],
    ["apps/anatomy/src/atlas/privateOrganRepresentations.js","ce83c3a024aa2fbee21e5097a48ccdfb0025c8ac"],
    ["apps/anatomy/src/atlas/publicContainment.js","99884a820d29eb29f5c2f7ce8fbf5f7fbe42d757"],
    ["apps/anatomy/src/atlas/ui.js","49fc62b676ee3ccc1374471de8aee4dbc36646a0"],
    ["apps/anatomy/src/main.js","37c0622a77199d5868d69f9bf1dd6be1818c7a2c"],
    ["apps/anatomy/src/viewer/bp3dMaterials.js","a3d073e917b64931839b20042d52aba4703f776a"],
    ["apps/anatomy/src/viewer/bp3dSource.js","1fd2e9bb6b8c8c72d4016280c6f94d22f876e156"],
    ["apps/anatomy/src/viewer/hraPrivateReference.js","e02edf483466e2be79c6af4657dc96e3795ebca0"],
    ["apps/anatomy/tests/bp3d.test.js","372c09d97afe96bda0a9a9d3f599726604b14bb7"],
    ["apps/anatomy/tests/publicContainment.test.js","ac54d1fa591ba5a3d8def6ac5ff29f6ed4372335"],
    ["apps/web/package.json","2f88eef2b989207ed1e08e794066a550c5a325a7"],
    ["apps/web/public/medcoel-research-preview.html","a19c7b3dbc892a32f7e860603d24c5cbc6e13d81"],
    ["apps/web/src/features/anatomy/independentRegistry.mjs","5777b6b8b0d3c673dfcd5ce735ef07b83c26b148"],
    ["apps/web/src/features/anatomy/independentRegistry.test.mjs","89280d9636df93b375e7e96289d4fe7cd34830b1"],
    ["apps/web/src/features/anatomy/LibraryData.jsx","c614620ed74326acf7e9d2ed9a938c7c9a4e39d5"],
    ["apps/web/src/features/anatomy/StructureThumbnail.jsx","13a3d13cac395bb599cbca5e83a1fe349cda8085"],
    ["apps/web/src/pages/AnatomyLibrary.jsx","d8c382ff628095834cdcdbaf68fd2fc0c3e3ae04"],
    ["apps/web/src/pages/IndependentAtlasPreview.css","a6b4406097226b553c0a78998c7752688c8b7c22"],
    ["apps/web/src/pages/IndependentAtlasPreview.jsx","0020bd698271e114faefaa56cc834a2ba11fcf7b"],
    ["apps/web/vite.atlas-independent-preview.config.js","839884c034b0d9daea1a010a0371e53c6dfd108c"],
    ["deploy/ATLAS_WS6_WS7_REHEARSAL.md","4ad65a13745af0bc24377d478ce0a0806d411fe4"],
    ["deploy/backup.py","af994d0cbc2fd4f575f41384dd98c029751f1a98"],
    ["deploy/backup.sh","4a53d16695536e19e61f2bea13f0bc84d7b69009"],
    ["deploy/research-showcase-web-only.sh","900f4dd8bc9343bb78f9310e8b2144cfb9f2c8fe"]
  ]);
  for(const [file,blob] of atlasCheckpointPaths){
    assert.equal(git('rev-parse',atlasCheckpoint+':'+file),blob,'Atlas scope pin changed: '+file);
    assert.equal(read(file),execFileSync('git',['show',atlasCheckpoint+':'+file],{cwd:root,encoding:'utf8'}),'Atlas checkpoint drift: '+file);
  }
  assert.deepEqual(legacyDelta.filter(p =>
    p !== harness && p !== phaseStatus && !studioOnly.has(p) &&
    !reviewedSecurityPaths.has(p) && !reviewedRecoveryPaths.has(p) &&
    !reviewedHumanAnatomyPaths.has(p) && !atlasCheckpointPaths.has(p)), []);
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
