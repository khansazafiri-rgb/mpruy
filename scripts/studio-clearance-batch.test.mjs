import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import { createBatchSnapshot, checkBatch, renderMarkdown } from '../licensing/tools/clinical-clearance-batch.mjs';

const read = p => JSON.parse(fs.readFileSync(new URL('../' + p, import.meta.url), 'utf8'));
const data = () => ({
  catalog: read('shared/studios/catalog.v1.json'),
  resources: read('licensing/resources.v1.json'),
  ledger: read('licensing/commercial-rights-evidence.json'),
  status: read('docs/clinical-studios/studio-status.v1.json'),
  reviewers: read('licensing/reviews/reviewers.v1.json'),
  decisions: read('licensing/reviews/decisions.v1.json'),
  policy: read('licensing/medcoel-usage-intent.v1.json'),
});

test('BATCH-001: one complete non-approving worklist covers exactly 24 distinct Clinical Studios', () => {
  const args = data(), result = createBatchSnapshot(args);
  assert.equal(result.totalStudios, 24);
  assert.equal(new Set(result.studios.map(x => x.id)).size, 24);
  assert.equal(result.releaseAuthorizedByThisTool, false);
  assert.ok(result.studios.every(x => x.studentAccess === false && !x.releaseAuthorizedByThisTool));
  assert.deepEqual(checkBatch(result, args), []);
  assert.equal(Object.values(result.counts).reduce((a, b) => a + b, 0), 24);
  assert.equal(result.humanReviewersRegistered, 0);
  assert.equal(result.signedReviewerDecisionsRecorded, 0);
});

test('BATCH-002: source licenses and exact asset digests are grounded in current registry', () => {
  const args = data(), out = createBatchSnapshot(args);
  const byId = new Map(args.resources.assets.map(x => [x.id, x]));
  for (const s of out.studios) for (const a of s.exactAssetDigests) {
    assert.match(a.sha256, /^[a-f0-9]{64}$/);
    assert.equal(a.sha256, byId.get(a.id).sha256);
  }
  const ecg = out.studios.find(x => x.id === 'ecg');
  assert.equal(ecg.sourceLicenses[0].licenseId, 'CC-BY-4.0');
  assert.ok(ecg.risks.includes('rights-evidence-pending'));
  const fixture = out.studios.find(x => x.id === 'brain-ct');
  assert.equal(fixture.derivedAssetCount, 0);
  assert.ok(fixture.risks.includes('no-real-data'));
});

test('BATCH-003: ambiguous BodyParts3D/AMOS and LONI LPBA40 restrictions are never treated as permissions', () => {
  const args = data(), out = createBatchSnapshot(args);
  assert.match(out.sourceConflicts['bodyparts3d-dbcls'].note, /2013 OBJ headers/);
  assert.match(out.sourceConflicts['amos-zenodo'].note, /dataset\.json/);
  const anatomy = out.studios.find(s => s.id === 'brain-anatomy');
  assert.ok(anatomy.risks.includes('source-license-review'));
  const mri = out.studios.find(s => s.id === 'brain-mri');
  assert.ok(mri.historicalBlockers.includes('studio-res-brain-mri-lpba40'));
  assert.ok(mri.risks.includes('restricted-resource-blocked'));
  assert.ok(out.studios.every(s => s.nextSteps.length > 0));
});

test('BATCH-004: free MEDCOEL core and hypothetical separate videos cannot be represented as a paid studio', () => {
  const args = data();
  assert.equal(createBatchSnapshot(args).product.paidCoreFeatureAllowed, false);
  args.policy.core.paywallAllowed = true;
  assert.throws(() => createBatchSnapshot(args), /FREE_CORE_POLICY_NOT_CONFIRMED/);
});

test('BATCH-005: forging source release statuses or unblocking NC code must fail closed', () => {
  let args = data(), out = createBatchSnapshot(args);
  args.resources.sources.find(s => s.id === 'amos-zenodo').status = 'VERIFIED_SOURCE';
  assert.ok(checkBatch(out, args).some(x => x.includes('AMOS')));
  args = data(); args.ledger.records.find(r => r.id === 'atlas-code').status = 'verified';
  assert.throws(() => createBatchSnapshot(args), /HISTORIC_NC_OR_LPBA40_BLOCK_MUST_REMAIN/);
  args = data(); args.ledger.records.find(r => r.id === 'studio-res-brain-mri-lpba40').status = 'verified';
  assert.throws(() => createBatchSnapshot(args), /HISTORIC_NC_OR_LPBA40_BLOCK_MUST_REMAIN/);
});

test('BATCH-006: human-ready markdown is reproducible and never invents approvals', () => {
  const args = data(), x = createBatchSnapshot(args);
  const a = renderMarkdown(x), b = renderMarkdown(createBatchSnapshot(args));
  assert.equal(a, b);
  assert.match(a, /No public rights or student-access status is modified/);
  assert.match(a, /24/);
  assert.match(a, /B1 inspector/);
  assert.match(a, /brain-mri/);
  assert.match(a, /bodyparts3d-dbcls/);
  assert.doesNotMatch(a, /all 24 studios (?:approved|licensed for release)/i);
});
