import test from 'node:test';
import assert from 'node:assert/strict';
import { evaluateStrictPublicExposure } from './audit-live-rights-strict.mjs';
import { REQUIRED_PUBLIC_PROBE_IDS } from './audit-live-anatomy-exposure.mjs';

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
  const v = evaluateStrictPublicExposure({results: REQUIRED_PUBLIC_PROBE_IDS.map(id=>
    ({id, result:'not-served', severity:'ok', httpStatus:404}))});
  assert.equal(v.strictExposureCheckPassed, true);
  assert.equal(v.releaseCleared, false);
});

test('STRICT-LIVE-003: incomplete, duplicate and malformed observations are never a complete PASS',()=>{
  for(const report of [null,{}, {results:[]}, {results:[null]},
    {results:[{id:'nervous-glb',result:'not-served',httpStatus:404}]},
    {results:REQUIRED_PUBLIC_PROBE_IDS.map(()=>({id:'nervous-glb',result:'not-served',httpStatus:404}))}]){
    assert.equal(evaluateStrictPublicExposure(report).strictExposureCheckPassed,false);
  }
});

test('STRICT-LIVE-004: HTTP errors, SPA fallback and future/unknown classifications fail closed',()=>{
  for(const row of [
    {result:'unexpected-http-status',httpStatus:503},
    {result:'unexpected-http-status',httpStatus:401},
    {result:'spa-fallback-not-proof-of-ct-deployment',httpStatus:200},
    {result:'new-unknown-outcome',httpStatus:200},
    {result:'not-served',httpStatus:200}
  ]){
    const results=REQUIRED_PUBLIC_PROBE_IDS.map(id=>({id,result:'not-served',httpStatus:404}));
    Object.assign(results[4],row);
    assert.equal(evaluateStrictPublicExposure({results}).strictExposureCheckPassed,false);
  }
});
