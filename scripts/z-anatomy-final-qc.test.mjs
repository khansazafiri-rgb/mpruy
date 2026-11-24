import test from 'node:test';
import assert from 'node:assert/strict';
import {createHash} from 'node:crypto';
import {inspectNativeGlb,finalQcSummary} from './z-anatomy-final-qc.mjs';
function fixture(){
 const pos=Buffer.alloc(36),norm=Buffer.alloc(36);
 [0,0,0,1,0,0,0,1,0].forEach((v,i)=>pos.writeFloatLE(v,4*i));
 [0,0,1,0,0,1,0,0,1].forEach((v,i)=>norm.writeFloatLE(v,4*i));
 const lineage={geometryPositionSHA256:createHash('sha256').update(pos).digest('hex'),approvedForDistribution:false};
 const doc={asset:{version:'2.0'},scene:0,scenes:[{nodes:[0]}],nodes:[{mesh:0}],meshes:[{primitives:[{attributes:{POSITION:0,NORMAL:1}}]}],
 buffers:[{byteLength:72}],bufferViews:[{buffer:0,byteOffset:0,byteLength:36},{buffer:0,byteOffset:36,byteLength:36}],
 accessors:[{bufferView:0,componentType:5126,count:3,type:'VEC3',min:[0,0,0],max:[1,1,0]},{bufferView:1,componentType:5126,count:3,type:'VEC3'}],
 extras:{reviewStatus:'candidate-only',provenance:lineage}};
 const j=Buffer.from(JSON.stringify(doc));const jp=Buffer.concat([j,Buffer.alloc((4-j.length%4)%4,32)]);
 const bytes=Buffer.alloc(28+jp.length+72);
 [0x46546c67,2,bytes.length,jp.length,0x4e4f534a].forEach((v,i)=>bytes.writeUInt32LE(v,i*4));
 jp.copy(bytes,20);const at=20+jp.length;bytes.writeUInt32LE(72,at);bytes.writeUInt32LE(0x004e4942,at+4);pos.copy(bytes,at+8);norm.copy(bytes,at+44);
 return {bytes,entry:{name:'synthetic triangle',triangles:1,privateAtlasMeta:{box:[0,0,0,1,1,0]}},lineage,at};
}
test('native geometry verification rejects corrupted GLB, wrong bounds, hash, normals and approval',()=>{
 const {bytes,entry,lineage,at}=fixture();
 assert.equal(inspectNativeGlb(bytes,entry,lineage).triangles,1);
 const bad=Buffer.from(bytes);bad.writeUInt32LE(1,4);assert.throws(()=>inspectNativeGlb(bad,entry,lineage),/header/);
 assert.throws(()=>inspectNativeGlb(bytes,{...entry,privateAtlasMeta:{box:[0,0,0,2,1,0]}},lineage),/bounds/);
 assert.throws(()=>inspectNativeGlb(bytes,entry,{...lineage,geometryPositionSHA256:'0'.repeat(64)}),/digest/);
 const wrong=Buffer.from(bytes);wrong.writeFloatLE(0,at+52);assert.throws(()=>inspectNativeGlb(wrong,entry,lineage),/normal/);
 assert.throws(()=>inspectNativeGlb(bytes,entry,{...lineage,approvedForDistribution:true}),/approval/);
});
test('missing system, lobe, vessel, endocrine and nodal-only gaps never become release approval',()=>{
 const r=finalQcSummary({inv:{source:{},converted:[{}]},nativeAudit:{groups:{arterial:1,venous:0}},geometry:{verified:1},
 vascular:{rows:[]},neural:{summary:{}},lymphatic:{hasExportedVesselCandidates:false,exportedByKind:{node:10}},
 organs:{fiveLobeCandidatesExported:false,summary:{}},clinical:{groups:{vascular:[{name:'left common carotid artery',status:'NOT_MATERIALIZED'}],endocrine:[{name:'thyroid gland',status:'NOT_MATERIALIZED'}]},summary:{}},hra:null});
 assert.equal(r.blockers.length,5);assert.equal(r.publicRelease,'NO_GO');assert.equal(r.browserRuntime,'PENDING');
 assert.equal(r.groups[1].technicalStatus,'MISSING_GROUP');assert.equal(r.anatomicalCompleteness,'NOT_VALIDATED');
});
