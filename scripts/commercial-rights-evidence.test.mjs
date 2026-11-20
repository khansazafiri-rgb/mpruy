import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { inspectCommercialEvidence, MODEL_SYSTEMS, readCommercialEvidence, REQUIRED_IDS } from '../licensing/tools/audit-commercial-evidence.mjs';

const committed = readCommercialEvidence();
// Legacy (Atlas / 4D) inventory. Clinical Studio records ("studio-res-*" derived outputs, "studio-src-*" official raw inputs)
// are checked separately below.
const isStudioRecord = r => /^studio-(res|src)-/.test(String(r.id));
const source = { ...committed, records: committed.records.filter(r => !isStudioRecord(r)) };
const CATALOG_IDS = JSON.parse(readFileSync(fileURLToPath(new URL('../shared/studios/catalog.v1.json', import.meta.url)), 'utf8')).studios.map(s => s.id);
const pkg = JSON.parse(readFileSync(fileURLToPath(new URL('../apps/anatomy/package.json', import.meta.url)), 'utf8'));
const inspect = data => inspectCommercialEvidence(data, { atlasPackage: pkg });
const clone = () => structuredClone(source);

test('commercial-rights inventory has exact required code, model, derived-data and software coverage', () => {
  const r = inspectCommercialEvidence(source, { verifyLocal: true });
  assert.equal(r.total, REQUIRED_IDS.length);
  assert.equal(MODEL_SYSTEMS.length, 6);
  assert.equal(r.statusCounts.blocked, 1);
  assert.equal(r.statusCounts['needs-review'], 13);
  assert.equal(r.statusCounts.verified, 0);
  assert.equal(r.products['atlas-viewer'].evidenceComplete, false);
  assert.equal(r.products['4d-lab'].evidenceComplete, false);
  assert.equal(r.readyForReview, false);
});

test('upstream Atlas application licence really is CC BY-NC-SA (not the CC BY-SA asset licence)', () => {
  assert.equal(pkg.license, 'CC-BY-NC-SA-4.0');
  const code = source.records.find(r => r.id === 'atlas-code');
  assert.equal(code.sourceLicense, pkg.license);
  assert.equal(code.sourceCommercialUse, false);
  assert.equal(code.status, 'blocked');
  assert.match(code.evidence[0].url, /nqwrc\/3d-anatomy/);
  const bad = clone(); bad.records.find(r => r.id === 'atlas-code').sourceLicense = 'MIT';
  assert.throws(() => inspect(bad), /disagrees with actual package/);
});

test('an inferred source cannot be promoted by changing its status without verified rights evidence', () => {
  const bad = clone();
  const model = bad.records.find(r => r.id === 'model-skeletal');
  model.status = 'verified';
  assert.throws(() => inspect(bad), /inferred provenance cannot be verified/);
});

test('even if someone fakes a cleared provenance label, rights-holder evidence and exact asset hashes are mandatory', () => {
  const bad = clone();
  const model = bad.records.find(r => r.id === 'model-cardiovascular');
  model.provenance = 'per-asset-confirmed';
  model.status = 'verified';
  model.clearance = { reviewer: 'unknown', reviewedAt: '2026-11-09', commercialUse: true };
  assert.throws(() => inspect(bad), /rights-holder identity, exact asset hashes/);
});

test('explicit commercial grant is mandatory to re-use original NC software', () => {
  const bad = clone();
  const code = bad.records.find(r => r.id === 'atlas-code');
  code.provenance = 'ownership-documented';
  code.status = 'verified';
  code.clearance = {
    rightsHolder: 'test only', reviewer: 'test only', reviewedAt: '2026-11-09',
    assetSha256: ['a'.repeat(64)], commercialUse: true,
    redistribution: true, adaptation: true, attribution: 'test',
    shareAlike: 'test', evidence: [{kind: 'upstream-license', url: 'https://example.org/notice'}],
  };
  assert.throws(() => inspect(bad), /explicit written commercial permission/);
});

test('all six cleared-model candidate bundles must remain in the rights worklist', () => {
  const bad = clone();
  bad.records = bad.records.filter(r => r.id !== 'model-lymphatic');
  assert.throws(() => inspect(bad), /Missing mandatory audit component: model-lymphatic/);
  const renamed = clone();
  renamed.records.find(r => r.id === 'model-skeletal').scope = ['apps/anatomy/public/models/skeletal-new.glb'];
  assert.throws(() => inspect(renamed), /required shipped GLB is not tracked/);
});

test('derivatives cannot be approved while model inputs remain unresolved', () => {
  const bad = clone();
  const thumbs = bad.records.find(r => r.id === 'atlas-previews');
  thumbs.provenance = 'per-asset-confirmed'; thumbs.status = 'verified';
  thumbs.clearance = {
    rightsHolder: 'test only', reviewer: 'test only', reviewedAt: '2026-11-09',
    assetSha256: ['a'.repeat(64)], commercialUse: true,
    redistribution: true, adaptation: true, attribution: 'test',
    shareAlike: 'test', evidence: [{kind: 'written-grant', url: 'https://example.org/notice'}],
  };
  assert.throws(() => inspect(bad), /derived asset dependency not verified/);
});

test('duplicate IDs, unknown products and unverifiable source references are rejected', () => {
  const duplicate = clone(); duplicate.records.push(structuredClone(duplicate.records[0]));
  assert.throws(() => inspect(duplicate), /duplicate/);
  const wrongProduct = clone(); wrongProduct.records[0].products = ['surprise-public-site'];
  assert.throws(() => inspect(wrongProduct), /unknown product/);
  const missing = clone(); missing.records[0].evidence = [];
  assert.throws(() => inspect(missing), /nonempty evidence/);
});

test('multi-node rights dependency cycles are rejected even in pending records', () => {
  const bad = clone();
  bad.records.find(r => r.id === 'model-skeletal').dependencies = ['model-muscular'];
  bad.records.find(r => r.id === 'model-muscular').dependencies = ['model-skeletal'];
  assert.throws(() => inspect(bad), /dependency cycle/);
});

test('studio product scopes require a trusted catalog ID; legacy default does not admit them', () => {
  const data = clone();
  data.records.find(r => r.id === 'model-skeletal').products.push('studio:brain-mri');
  assert.throws(() => inspect(data), /unknown product/);
  assert.equal(inspectCommercialEvidence(data, { studioIds: ['brain-mri'] }).products['studio:brain-mri'].evidenceComplete, false);
  assert.throws(() => inspectCommercialEvidence(data, { studioIds: ['unrelated'] }), /unknown product/);
});


test('Clinical Studio resource records are honest: catalog-scoped, needs-review, never verified', () => {
  const studio = committed.records.filter(isStudioRecord);
  assert.ok(studio.some(r => r.id.startsWith('studio-src-')) && studio.some(r => r.id.startsWith('studio-res-')));
  for (const r of studio) {
    assert.equal(r.status, 'needs-review', r.id);
    assert.ok(r.products.every(p => /^studio:/.test(p) && CATALOG_IDS.includes(p.slice(7))), r.id);
    assert.ok(r.blockingReason && r.blockingReason.length > 20, r.id);
  }
  const report = inspectCommercialEvidence(committed, { studioIds: CATALOG_IDS });
  for (const r of studio) for (const p of r.products) assert.equal(report.products[p].evidenceComplete, false, p);
  assert.throws(() => inspectCommercialEvidence(committed), /unknown product/, 'legacy default still refuses studio scopes');
  // Derived records depend on the needs-review record of their official source, so they can never verify ahead of it.
  for (const r of studio.filter(x => x.id.startsWith('studio-res-'))) for (const d of r.dependencies) {
    const dep = studio.find(x => x.id === d);
    assert.ok(dep && dep.id.startsWith('studio-src-') && dep.status === 'needs-review', r.id + ' -> ' + d);
  }
});
