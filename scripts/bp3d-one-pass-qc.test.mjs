import test from 'node:test';
import assert from 'node:assert/strict';
import {readReleaseDecision} from './bp3d-one-pass-qc.mjs';
const policy={products:{
 'atlas-viewer':{status:'blocked',blockers:['NC application licence'],approvedBuilds:[],ownerOverride:{enabled:false}},
 '4d-lab':{status:'blocked',blockers:['unverified Atlas provenance'],approvedBuilds:[],ownerOverride:{enabled:false}}
}};
const manifest={approvedForCommercialDistribution:false,geometryRegisteredToMEDCOEL:false,
 legalStatus:'NOT-CLEARED',converted:[{name:'Femur.l'}],summary:{converted:1,failed:0}};
const audit={errors:[],summary:{converted:1,commercialReleaseApproved:0,geometryAnatomyValidated:0}};
test('one-pass source QC never reports GO for public distribution when real rights and clinical evidence are blocked',()=>{
 const r=readReleaseDecision({commercial:policy,inventory:manifest,audit});
 assert.equal(r.publicRelease,'NO_GO');
 assert.ok(r.blockers.some(x=>x.includes('atlas-viewer')));
 assert.ok(r.blockers.some(x=>x.includes('4d-lab')));
 assert.ok(r.blockers.some(x=>x.includes('Anatomical identity')));
 assert.ok(r.blockers.some(x=>x.includes('licence terms conflict')));
});
test('injected or partially converted geometry adds blockers instead of being silently promoted',()=>{
 const r=readReleaseDecision({commercial:policy,
  inventory:{...manifest,approvedForCommercialDistribution:true,summary:{failed:2}},
  audit:{...audit,errors:['GLB changed']},distributionErrors:['bp3d/inventory.json']});
 assert.equal(r.publicRelease,'NO_GO');
 assert.ok(r.blockers.some(x=>x.includes('quarantine')));
 assert.ok(r.blockers.some(x=>x.includes('incomplete')));
 assert.ok(r.blockers.some(x=>x.includes('integrity')));
 assert.ok(r.blockers.some(x=>x.includes('withheld files')));
});
test('even forged status=approved cannot bypass blocked anatomy/asset rights in a source-only preflight',()=>{
 const pretend={products:{'atlas-viewer':{status:'approved',approvedBuilds:['fake']},
  '4d-lab':{status:'approved',approvedBuilds:['fake']}}};
 const r=readReleaseDecision({commercial:pretend,inventory:manifest,audit});
 assert.equal(r.publicRelease,'NO_GO');
 assert.ok(r.blockers.length>=2);
});
