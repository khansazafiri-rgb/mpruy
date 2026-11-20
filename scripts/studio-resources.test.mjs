import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { spawnSync } from 'node:child_process';
import { fixture } from './studio-resource-fixture.mjs';
import { inspectStudioResources, digest } from '../licensing/tools/inspect-studio-resources.mjs';
import { validateCatalog, validateResources, publicResourceSummary } from '../packages/studio-contract/manifest.mjs';
import { validateSchema } from '../packages/studio-contract/validation.mjs';
import { assertCommercialReleaseReady, OWNER_OVERRIDE_ACKNOWLEDGEMENT } from '../licensing/tools/check-commercial-release.mjs';
import { inspectCommercialEvidence } from '../licensing/tools/audit-commercial-evidence.mjs';
const read = p => JSON.parse(fs.readFileSync(new URL('../' + p, import.meta.url), 'utf8'));
const inspect = f => inspectStudioResources(f);
const denied = (f, code) => { const r = inspect(f); assert.equal(r.decision.eligible, false, JSON.stringify(r)); if (code) assert.ok(r.errors.some(e => e.code === code), JSON.stringify(r)); return r; };

test('RESOURCE-001: canonical 24 studios + internal fixture remain fail-closed', t => {
  const f = fixture(t), c = read('shared/studios/catalog.v1.json');
  assert.equal(c.studios.length, 25); assert.equal(c.studios.filter(s => !s.internal).length, 24);
  for (const s of c.studios) { assert.equal(s.runtime.entry, null); assert.equal(s.runtime.releaseId, null); assert.notEqual(s.licensing.status, 'verified'); }
  assert.equal(validateCatalog(c, f.catalogSchema).ok, true);
});
test('RESOURCE-002: unknown studio/source/dataset bindings do not create a registry entry', t => {
  const f = fixture(t); f.studioId = 'unknown-studio'; denied(f, 'unknown-studio');
  f.studioId = 'foundation-fixture'; f.studio.datasets[0].id = 'missing-dataset'; denied(f, 'dataset-coverage');
  f.resources.assets[0].sourceRef = 'missing-source'; denied(f, 'unknown-source');
});
test('RESOURCE-003: verified source is not approval of a missing/pending asset', t => {
  const f = fixture(t); f.resources.assets[0].sha256 = null; f.resources.assets[0].bytes = null; f.sync(); denied(f);
  f.resources.assets = []; f.sync(); denied(f);
});
test('RESOURCE-004: catalog approval flags cannot replace exact rights evidence', t => {
  const f = fixture(t); f.evidence.records.find(r => r.id === 'fixture-data-rights').status = 'needs-review'; f.evidence.records.at(-1).blockingReason = 'No real evidence'; denied(f, 'rights-unverified');
});
test('RESOURCE-005: NC, unknown, unverified sources and conflicting source grants fail closed', t => {
  const f = fixture(t);
  for (const license of ['CC-BY-NC-4.0', 'unknown']) { f.resources.sources[0].licenseId = license; f.sync(); denied(f, 'licence-not-allowed'); }
  f.resources.sources[0].licenseId = 'CC-BY-4.0'; f.sync(); denied(f, 'source-rights-conflict');
  f.resources.sources[0].licenseId = 'MIT'; f.resources.sources[0].status = 'REVIEW_REQUIRED'; f.sync(); denied(f, 'source-unverified');
  f.resources.sources[0].status = 'VERIFIED_SOURCE'; f.resources.sources[0].licenseId = 'CC-BY-SA-3.0';
  for (const r of f.evidence.records.filter(r => r.id.startsWith('fixture-'))) r.sourceLicense = 'CC-BY-SA-3.0';
  f.sync(); denied(f, 'sharealike-conflict');
});
test('RESOURCE-006: protected verified dataset and protected asset cannot enter static public output', t => {
  const f = fixture(t); f.studio.datasets[0].protected = true; denied(f);
  f.studio.datasets[0].protected = false; f.resources.assets[1].protected = true; f.sync(); denied(f, 'protected-asset');
});
test('RESOURCE-007: invalid evidence refs, duplicate IDs, dates, hashes and unsupported keywords fail closed', t => {
  const f = fixture(t); f.resources.assets[0].rightsEvidenceRef = 'missing-rights'; f.resources.assets[0].attributionRef = 'missing-rights'; f.sync(); denied(f, 'rights-unverified');
  f.resources.sources.push(structuredClone(f.resources.sources[0])); denied(f, 'duplicate-source'); f.resources.sources.pop();
  f.resources.assets[0].medicalReview.reviewedAt = '2026-02-30'; denied(f, 'review-evidence');
  f.resources.assets[0].sha256 = 'bad'; assert.equal(validateResources(f.resources, f.resourceSchema).ok, false);
  assert.equal(validateSchema({ type: 'object', if: {} }, {}).ok, false);
});
test('RESOURCE-008: technical and rights lineage reject unknown/self and multi-node cycles', t => {
  const f = fixture(t), [a, b] = f.resources.assets;
  a.dependsOn = [{ assetId: b.id, version: b.version, sha256: b.sha256 }]; b.dependsOn = [{ assetId: a.id, version: a.version, sha256: a.sha256 }];
  for (const x of [a, b]) x.derivation = { operation: 'engineering', tool: 'fixture', toolVersion: '1', pipelineCommit: 'a'.repeat(40), parametersSha256: 'b'.repeat(64) };
  denied(f, 'lineage-cycle'); a.dependsOn[0].assetId = 'missing'; denied(f, 'unknown-parent');
  const e = structuredClone(f.evidence); e.records[1].dependencies = [e.records[2].id]; e.records[2].dependencies = [e.records[1].id];
  assert.throws(() => inspectCommercialEvidence(e, { studioIds: ['foundation-fixture'] }), /cycle/);
});
test('RESOURCE-009: stale parent hashes, derived approvals and missing transform metadata are rejected', t => {
  const f = fixture(t), [a, b] = f.resources.assets; b.dependsOn = [{ assetId: a.id, version: a.version, sha256: '0'.repeat(64) }]; denied(f, 'parent-hash');
  b.dependsOn[0].sha256 = a.sha256; denied(f, 'derivation');
  b.dependsOn = []; b.medicalReview.reviewedSha256 = '0'.repeat(64); f.sync(); denied(f, 'medical-review');
});
test('RESOURCE-010: original-source identity and private/pixel review cannot be fabricated from a public URL', t => {
  const f = fixture(t); f.resources.assets[1].sourceFile = null; f.sync(); denied(f, 'source-file');
  f.resources.assets[1].privacyReview.status = 'pending'; f.sync(); denied(f, 'privacy-review');
});
test('RESOURCE-011: annotation/geometry metadata and source evidence are required when applicable', t => {
  const f = fixture(t); f.resources.assets[1].kind = 'annotation'; f.sync(); denied(f, 'missing-geometry');
  f.resources.sources[0].evidence[0].snapshotSha256 = null; f.sync(); denied(f, 'source-evidence');
});
test('RESOURCE-012: signal metadata does not bypass clinical review or become a diagnosis key', t => {
  const f = fixture(t); const a = f.resources.assets[1]; a.kind = 'waveform'; a.geometry = { spaceId: 'signal-fixture', units: 'ms,mV', details: '12 leads; 500Hz; engineering only' }; a.medicalReview.status = 'pending'; f.sync(); denied(f, 'medical-review');
  a.medicalReview.status = 'not-required'; f.sync(); denied(f, 'medical-review');
});
test('RESOURCE-013: provenance and original byte changes cannot masquerade as approved clinical imagery', t => {
  const f = fixture(t); const rights = f.evidence.records.at(-1); rights.provenance = 'per-structure-inferred'; denied(f, 'clearance-failed');
  rights.provenance = 'ownership-documented'; f.resources.assets[1].sourceFile.sha256 = '0'.repeat(64); f.sync(); denied(f, 'missing-derivation');
});
test('RESOURCE-014: traversal, URLs, symlinks, duplicate and unmanifested files are rejected', t => {
  const f = fixture(t);
  for (const value of ['a/../index.html', '/index.html', 'https://example.org/x', 'a//b', 'a\\b', 'a/%2e%2e/x']) { f.studio.runtime.entry = value; denied(f); }
  f.studio.runtime.entry = 'index.html'; fs.writeFileSync(path.join(f.buildRoot, 'untracked.bin'), 'test'); denied(f, 'unmanifested-file'); fs.unlinkSync(path.join(f.buildRoot, 'untracked.bin'));
  f.manifest.files.push(f.manifest.files[0]); f.approve(); denied(f, 'unsafe-inventory'); f.sync();
  fs.symlinkSync(path.join(f.buildRoot, 'fixture.bin'), path.join(f.buildRoot, 'linked.bin')); denied(f, 'unsafe-path');
});
test('RESOURCE-015: studio uses strict release mode; legacy override semantics stay honest and compatible', t => {
  const f = fixture(t), p = f.policy.products['studio:' + f.studioId]; p.status = 'blocked'; p.blockers = ['engineering-test']; p.ownerOverride = { enabled: true, decidedBy: 'test only', decidedOn: '2026-11-10', expiresOn: '2027-02-08', rightsVerified: false, acknowledgement: OWNER_OVERRIDE_ACKNOWLEDGEMENT };
  fs.writeFileSync(f.commercialManifest, JSON.stringify(f.policy));
  assert.equal(assertCommercialReleaseReady('studio:' + f.studioId, f.buildRoot, f.commercialManifest, { now: new Date('2026-11-20') }).rightsVerified, false);
  assert.throws(() => assertCommercialReleaseReady('studio:' + f.studioId, f.buildRoot, f.commercialManifest, { allowOwnerOverride: false }), /blocked/);
  denied(f, 'clearance-failed');
});
test('RESOURCE-016: missing policy/notice/review or wrong exact build digest is never eligible', t => {
  const f = fixture(t); f.policy.products['studio:' + f.studioId].approvedBuilds[0].sha256 = '0'.repeat(64); fs.writeFileSync(f.commercialManifest, JSON.stringify(f.policy)); denied(f, 'clearance-failed');
  f.sync(); fs.writeFileSync(path.join(f.buildRoot, 'fixture-data-NOTICE.txt'), 'wrong credit'); denied(f, 'attribution-notice');
  f.sync(); fs.unlinkSync(f.commercialManifest); denied(f, 'clearance-failed');
});
test('RESOURCE-017: only a fully bound neutral engineering fixture is eligible; legacy records stay closed', t => {
  const f = fixture(t), r = inspect(f); assert.equal(r.decision.eligible, true, JSON.stringify(r));
  const old = f.evidence.records.filter(r => !r.id.startsWith('fixture-'));
  assert.equal(old.length, 14); assert.equal(old.filter(r => r.status === 'verified').length, 0);
});
test('RESOURCE-018: empty committed resource registry validates but no clinical studio is eligible; CLI is read-only', t => {
  const f = fixture(t), resources = read('licensing/resources.v1.json'); assert.deepEqual(resources, { schemaVersion: 1, sources: [], assets: [] });
  assert.equal(validateResources(resources, f.resourceSchema).ok, true);
  f.catalog = read('shared/studios/catalog.v1.json'); f.resources = resources;
  for (const s of f.catalog.studios) { f.studioId = s.id; denied(f); }
  const cli = spawnSync(process.execPath, ['licensing/tools/inspect-studio-resources.mjs', 'brain-mri'], { cwd: new URL('../', import.meta.url), encoding: 'utf8' }); assert.equal(cli.status, 1); assert.equal(JSON.parse(cli.stdout).decision.eligible, false);
});
test('RESOURCE-019: safe public projection excludes private paths, documents and answer keys', t => {
  const f = fixture(t), a = f.resources.assets[0]; const projected = publicResourceSummary({ ...a, answerKey: 'secret', consent: 'private', reviewDocument: 'private' });
  assert.deepEqual(Object.keys(projected), ['id', 'version', 'kind', 'dataNature', 'format']);
  for (const key of ['path', 'rightsEvidenceRef', 'medicalReview', 'privacyReview', 'answerKey', 'consent']) assert.equal(key in projected, false);
});
test('RESOURCE-020: editing catalog and frozen list together cannot remove or rename trusted historical IDs', t => {
  const f = fixture(t), before = read('shared/studios/frozen-ids.json').ids;
  f.catalog.studios.shift(); assert.equal(validateCatalog(f.catalog, f.catalogSchema, { previousFrozenIds: before }).ok, false);
  f.catalog = read('shared/studios/catalog.v1.json'); f.catalog.studios[0].id = 'renamed-brain'; assert.equal(validateCatalog(f.catalog, f.catalogSchema, { previousFrozenIds: before }).ok, false);
});

test('withheld hashes and ancestors are denied even when their synthetic rights metadata says verified', t => {
  const f = fixture(t); f.quarantine = { hashes: new Map([[f.resources.assets[1].sha256, 'WITHHELD ENGINEERING TEST']]), structures: new Set(), systems: new Set() };
  denied(f, 'quarantined');
  const parent = structuredClone(f.resources.assets[1]);
  parent.id = 'private-raw-parent'; parent.path = 'raw-parent.bin'; parent.sha256 = digest('RAW ENGINEERING INPUT'); parent.bytes = 21;
  parent.medicalReview.reviewedSha256 = parent.sha256; parent.privacyReview.reviewedSha256 = parent.sha256;
  parent.sourceFile = { url: 'https://example.org/raw', member: 'raw-parent.bin', sha256: parent.sha256 };
  parent.rightsEvidenceRef = 'raw-parent-rights'; parent.attributionRef = parent.rightsEvidenceRef;
  f.resources.assets.push(parent);
  const parentRights = structuredClone(f.evidence.records.at(-1)); parentRights.id = parent.rightsEvidenceRef; parentRights.scope = [parent.path]; parentRights.clearance.assetSha256 = [parent.sha256]; f.evidence.records.push(parentRights);
  const child = f.resources.assets[1]; child.dependsOn = [{ assetId: parent.id, version: parent.version, sha256: parent.sha256 }];
  child.derivation = { operation: 'neutral test transform', tool: 'fixture', toolVersion: '1', pipelineCommit: 'a'.repeat(40), parametersSha256: 'b'.repeat(64) };
  f.evidence.records.find(r => r.id === child.rightsEvidenceRef).dependencies = [parentRights.id];
  f.sync(); f.manifest.assetRefs = f.manifest.assetRefs.filter(r => r.assetId !== parent.id); f.approve();
  f.quarantine.hashes = new Map(); assert.equal(inspect(f).decision.eligible, true, JSON.stringify(inspect(f)));
  f.quarantine.hashes = new Map([[parent.sha256, 'WITHHELD RAW PARENT']]); denied(f, 'quarantined');
  f.quarantine.hashes.clear(); parentRights.clearance.attribution = 'Required original ancestor credit missing'; denied(f, 'attribution-notice');
});

test('mutating shipped code bytes, manifest bindings or original review scope invalidates the release', t => {
  const f = fixture(t); fs.writeFileSync(path.join(f.buildRoot, 'index.html'), 'changed code'); denied(f, 'asset-bytes');
  f.sync(); f.manifest.resourceManifestSha256 = '0'.repeat(64); f.approve(); denied(f, 'resource-binding');
  f.sync(); f.resources.assets[1].medicalReview.scope = ['different-use']; f.sync(); denied(f, 'medical-review');
});
test('new studio products must be explicitly named in the canonical catalog, never admitted by prefix alone', t => {
  const f = fixture(t); f.evidence.records.at(-1).products = ['studio:unknown-studio']; assert.throws(() => inspectCommercialEvidence(f.evidence, { studioIds: ['foundation-fixture'] }), /unknown product/);
});
