import test from 'node:test';
import assert from 'node:assert/strict';
import {parseObj,encodeNativeGlb} from './independent-bp3d-export.mjs';
import {parseNativePositions,comparePositions} from './audit-bp3d-publication-geometry.mjs';
import {verifySourceBinding} from './assemble-independent-source-review.mjs';
test('independent exporter produces exact untransformed positions and candidate-only metadata',()=>{
 const obj='v 0 0 0\nv 1 0 0\nv 0 1 0\nf 1 2 3\nf 1 1 2\n';
 const p=parseObj(obj);assert.equal(p.omitted,1);
 assert.deepEqual([...p.positions],[0,0,0,1,0,0,0,1,0]);
 assert.deepEqual([...p.normals],[0,0,1,0,0,1,0,0,1]);
 const out=encodeNativeGlb([{id:'FJ1',...p}],{officialName:'Synthetic test only',approvedForDistribution:true});
 const m=parseNativePositions(out.bytes);assert(comparePositions(p.positions,m.get('FJ1')));assert.equal(out.triangles,1);
 const d=JSON.parse(out.bytes.subarray(20,20+out.bytes.readUInt32LE(12)).toString('utf8'));
 assert.equal(d.extras.provenance.approvedForDistribution,false);
 assert.throws(()=>parseObj('v 0 0 0\nf 1 2 3'));
 assert.throws(()=>encodeNativeGlb([{id:'FJ1',...p},{id:'FJ1',...p}],{}));
});
test('source binding rejects altered identity, source element and implied approval',()=>{
 const g={id:'fixture',sha256:'a'.repeat(64),fmaId:'FMA1',bpId:'BP2',tree:'isa',sourceHashes:{archive:'b'.repeat(64)},sourceElements:[{id:'FJ3',sha256:'c'.repeat(64)}],status:'EXACT_RAW_GEOMETRY_MATCH_LABEL_REVIEW',approvedForDistribution:false};
 const l={...g,displayName:'Publisher name',labelAmbiguous:false,license:'CC-BY-4.0',attribution:'Fixture',historicalNotice:'Fixture'};
 assert.doesNotThrow(()=>verifySourceBinding(l,g));
 for(const c of [{bpId:'BP9'},{approvedForDistribution:true},{labelAmbiguous:true},{sourceElements:[]},{sourceHashes:{}},{license:'CC-BY-NC-4.0'}])assert.throws(()=>verifySourceBinding({...l,...c},g));
});
