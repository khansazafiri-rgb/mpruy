import test from 'node:test';
import assert from 'node:assert/strict';
import { generateReconciliation, summarizeRights } from '../licensing/tools/reconcile-implemented-rights.mjs';

test('actual MEDCOEL tracked mitigation work is recognized, not erased by a 0/14 rights count', () => {
  const report = generateReconciliation();
  assert.equal(report.trackedControls.total, 7);
  assert.deepEqual(report.trackedControls.checks.filter(c=>!c.passed).map(c=>c.id), [],
    'unexpected repository regression of implemented compliance controls');
  assert.ok(report.trackedControls.checks.some(c=>c.id === 'published-source-tree' && c.passed));
  assert.ok(report.trackedControls.checks.some(c=>c.id === 'separate-viewer-app' && c.passed));
  assert.ok(report.trackedControls.checks.some(c=>c.id === 'atlas-ct-rebuild-trace' && c.passed));
  assert.ok(report.trackedControls.checks.some(c=>c.id === 'known-nc-model-quarantine' && c.passed));
  assert.equal(report.reportType, 'rights-gap-reconciliation-not-clearance');
  assert.ok(report.unverifiedLiveFacts.includes('second physical VM status'));
});

test('opening source code cannot clear upstream NC rights nor exact-build gate', () => {
  const data = { records: [
    {id:'atlas-code',products:['atlas-viewer','4d-lab'],status:'blocked'},
    {id:'models',products:['atlas-viewer','4d-lab'],status:'needs-review'},
    {id:'phantom-code',products:['4d-lab'],status:'verified'},
  ] };
  const pending = {products:{
    'atlas-viewer': {status:'blocked',approvedBuilds:[]},
    '4d-lab': {status:'blocked',approvedBuilds:[]},
  }};
  const a = summarizeRights(data,pending);
  assert.equal(a.verified,1);
  assert.deepEqual(a.products['atlas-viewer'].unresolvedIds,['atlas-code','models']);
  assert.equal(a.products['atlas-viewer'].blockedForCommercialRelease,true);
  assert.equal(a.products['4d-lab'].blockedForCommercialRelease,true);
  // Even a manually edited "cleared" flag cannot make the product ready
  // if unresolved component rights or exact release digest approval remain.
  const fake = {products:{
    'atlas-viewer':{status:'cleared',approvedBuilds:['digest']},
    '4d-lab':{status:'cleared',approvedBuilds:['digest']},
  }};
  const b=summarizeRights(data,fake);
  assert.equal(b.products['atlas-viewer'].blockedForCommercialRelease,true);
  assert.equal(b.products['4d-lab'].blockedForCommercialRelease,true);
});

test('rights-report model allows a genuinely reviewed future release to be distinguished', () => {
  const data={records:[{id:'a',products:['atlas-viewer'],status:'verified'},
    {id:'b',products:['4d-lab'],status:'verified'}]};
  const gate={products:{'atlas-viewer':{status:'cleared',approvedBuilds:['a']},
    '4d-lab':{status:'cleared',approvedBuilds:['b']}}};
  const report=summarizeRights(data,gate);
  assert.equal(report.products['atlas-viewer'].blockedForCommercialRelease,false);
  assert.equal(report.products['4d-lab'].blockedForCommercialRelease,false);
});
