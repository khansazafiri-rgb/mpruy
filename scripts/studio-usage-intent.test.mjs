import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';

const read = p => JSON.parse(readFileSync(new URL('../' + p, import.meta.url), 'utf8'));
const policy = read('licensing/medcoel-usage-intent.v1.json');
const catalog = read('shared/studios/catalog.v1.json');
const evidence = read('licensing/commercial-rights-evidence.json');
const resources = read('licensing/resources.v1.json');

test('USAGE-001: core Clinical Studios and legacy learning tools remain explicitly free', () => {
  assert.equal(policy.schema, 'medcoel.usage-intent.v1');
  assert.equal(policy.core.accessModel, 'free-for-all-learners');
  assert.equal(policy.core.paywallAllowed, false);
  assert.equal(policy.core.subscriptionRequired, false);
  assert.ok(policy.core.includes.includes('all 24 Clinical Studios'));
  assert.ok(policy.core.includes.includes('Anatomy Atlas'));
  assert.ok(policy.core.includes.includes('Anatomy Live 4D Lab'));
  assert.equal(catalog.studios.filter(s => !s.internal).length, 24);
});

test('USAGE-002: hypothetical paid explanations are distinct and do not weaken any third-party terms', () => {
  assert.equal(policy.optionalFuturePaidOffering.status, 'not-authorized-or-launched-by-this-policy');
  assert.equal(policy.optionalFuturePaidOffering.type, 'separately produced video explanations of practice questions');
  assert.equal(policy.optionalFuturePaidOffering.mustNotRestrictCoreFeatures, true);
  assert.equal(policy.optionalFuturePaidOffering.mayNotReuseThirdPartyRestrictedContentWithoutRights, true);
  assert.equal(policy.resourceInterpretation.freeAccessDoesNotWaiveLicenseTerms, true);
  assert.equal(policy.resourceInterpretation.noAutomaticNCOrResearchOnlyClearance, true);
  assert.equal(policy.resourceInterpretation.noAutomaticReleasePolicyModification, true);
});

test('USAGE-003: research-only LPBA40 and NC Atlas code remain blocked despite free access', () => {
  for (const id of ['studio-res-brain-mri-lpba40', 'atlas-code']) {
    assert.ok(policy.knownRestrictedResources.some(r => r.ref === id), id);
    const r = evidence.records.find(x => x.id === id);
    assert.ok(r, id);
    assert.equal(r.status, 'blocked', id);
    assert.equal(r.sourceCommercialUse, false, id);
  }
});

test('USAGE-004: BodyParts3D and AMOS version conflicts cannot be auto-approved', () => {
  for (const [id, license] of [
    ['bodyparts3d-dbcls', 'CC-BY-SA-2.1-JP'],
    ['amos-zenodo', 'CC-BY-SA-4.0']
  ]) {
    const src = resources.sources.find(s => s.id === id);
    assert.ok(src, id);
    assert.equal(src.licenseId, license);
    assert.equal(src.status, 'REVIEW_REQUIRED');
    const rights = evidence.records.find(r => r.id === 'studio-src-' + id);
    assert.ok(rights && rights.status === 'needs-review');
  }
});
