import test from 'node:test';
import assert from 'node:assert/strict';
import { evaluateStrictPublicExposure } from './audit-live-rights-strict.mjs';

test('STRICT-LIVE-001: current candidate model bytes are not mistaken for licensed assets', () => {
  const report = { results: [
    { id:'nervous-glb', result:'not-served', severity:'ok', httpStatus:404 },
    { id:'skeletal-glb', route:'/anatomy/viewer/models/skeletal.glb',
      result:'matches-repository-candidate-not-commercially-cleared', severity:'review', httpStatus:200 },
    { id:'visceral-glb', route:'/anatomy/viewer/models/visceral.glb',
      result:'matches-repository-candidate-not-commercially-cleared', severity:'review', httpStatus:200 },
    { id:'atlas-ct-endpoint', route:'/anatomy/4d-lab/data/atlas/ct.nrrd',
      result:'served-ct-identity-unverified', severity:'unknown', httpStatus:200 }
  ]};
  const v = evaluateStrictPublicExposure(report);
  assert.equal(v.strictExposureCheckPassed, false);
  assert.equal(v.releaseCleared, false);
  assert.deepEqual(v.observedUnclearedOrUnverifiedAssets.map(x=>x.id),
    ['skeletal-glb','visceral-glb','atlas-ct-endpoint']);
});

test('STRICT-LIVE-002: missing withdrawn files are safe but not legal release approval', () => {
  const v = evaluateStrictPublicExposure({results: [
    {id:'nervous-glb', result:'not-served', severity:'ok', httpStatus:404}
  ]});
  assert.equal(v.strictExposureCheckPassed, true);
  assert.equal(v.releaseCleared, false);
});
