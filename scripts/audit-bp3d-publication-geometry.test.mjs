import test from 'node:test';
import assert from 'node:assert/strict';
import {validateIdentity,parseNativePositions,comparePositions,validateCandidateEntry,normalizeSourceLineage} from './audit-bp3d-publication-geometry.mjs';
const e={name:'Femur.l',fmaId:'FMA1',bpId:'BP2'},l={officialName:'Left femur',officialFMAId:'FMA1',officialRepresentationId:'BP2',elements:[{id:'FJ3'}]};
const names=[{name:'Left femur',fmaId:'FMA1',bpId:'BP2'}],elements=new Map([['FMA1',new Set(['FJ3'])]]);
const doc={asset:{version:'2.0'},buffers:[{byteLength:36}],extras:{reviewStatus:'candidate-only',source:'Official BodyParts3D 4.0'},scenes:[{nodes:[0]}],nodes:[{mesh:0,extras:{officialElementFileId:'FJ3'}}],meshes:[{primitives:[{attributes:{POSITION:0}}]}],accessors:[{componentType:5126,type:'VEC3',count:3,bufferView:0}],bufferViews:[{buffer:0,byteLength:36}]};
function fixture(d,values=[0,0,0,1,0,0,0,1,0]){
 const j=Buffer.from(JSON.stringify(d)),json=Buffer.concat([j,Buffer.alloc((4-j.length%4)%4,32)]);
 const off=20+json.length,b=Buffer.alloc(off+8+36);
 [0x46546c67,2,b.length,json.length,0x4e4f534a].forEach((n,i)=>b.writeUInt32LE(n,i*4));
 json.copy(b,20);b.writeUInt32LE(36,off);b.writeUInt32LE(0x004e4942,off+4);
 values.forEach((n,i)=>b.writeFloatLE(n,off+8+i*4));return b;
}
test('exact official identity does not infer laterality or substitute incomplete geometry',()=>{
 assert.deepEqual(validateIdentity(e,l,names,elements),['FJ3']);
 assert.throws(()=>validateIdentity({...e,name:'Femur.r'},l,names,elements));
 assert.throws(()=>validateIdentity(e,l,[...names,...names],elements));
 assert.throws(()=>validateIdentity(e,l,names,new Map([['FMA1',new Set(['FJ3','FJ4'])]])));
});
test('binary native positions must match raw triangle sequence exactly and contain no guessed transforms',()=>{
 const expected=new Float32Array([0,0,0,1,0,0,0,1,0]);
 assert(comparePositions(parseNativePositions(fixture(doc)).get('FJ3'),expected));
 assert(!comparePositions(parseNativePositions(fixture(doc,[0,0,0,2,0,0,0,1,0])).get('FJ3'),expected));
 assert.throws(()=>parseNativePositions(fixture({...doc,nodes:[{...doc.nodes[0],translation:[1,0,0]}]})));
 assert.throws(()=>parseNativePositions(fixture({...doc,accessors:[{...doc.accessors[0],count:6}]})));
 assert.throws(()=>parseNativePositions(fixture({...doc,buffers:[{byteLength:36,uri:'external.bin'}]})));
 assert.throws(()=>parseNativePositions(fixture({...doc,meshes:[{primitives:[{attributes:{POSITION:0},indices:1}]}]})));
});

test('legacy baseline entry uses parent and lineage private flags, not nonexistent per-entry flag',()=>{
 const item={id:'fixture-123',name:'Left femur',fmaId:'FMA1',bpId:'BP2',state:'converted-unverified',modelPath:'./structures/fixture-123/model.glb'};
 const inv={approvedForCommercialDistribution:false};
 assert.doesNotThrow(()=>validateCandidateEntry(item,inv,new Set()));
 assert.throws(()=>validateCandidateEntry({...item,approvedForDistribution:true},inv,new Set()));
 assert.throws(()=>validateCandidateEntry(item,{approvedForCommercialDistribution:true},new Set()));
 assert.throws(()=>validateCandidateEntry({...item,modelPath:'../model.glb'},inv,new Set()));
 assert.throws(()=>validateCandidateEntry(item,inv,new Set([item.id])));
});
test('staged legacy source identity is bound to FMA/BP, source digest and exact FJ set',()=>{
 const sha='a'.repeat(64),item={id:'expansion-fma1-bp2',fmaId:'FMA1',bpId:'BP2',glbSha256:sha};
 const l={originalStaging:'private-staging',name:'Left femur',fma:'FMA1',bp:'BP2',sha256:sha,sourceArchiveSHA256:sha,sourceFJ:['FJ3'],elements:[{id:'FJ3'}]};
 const n=normalizeSourceLineage(item,l);assert.equal(n.archiveSHA256,sha);assert.equal(n.sourceArchive,'isa_BP3D_4.0_obj_99.zip');
 assert.throws(()=>normalizeSourceLineage(item,{...l,sourceFJ:['FJ4']}));
 assert.throws(()=>normalizeSourceLineage(item,{...l,sha256:'b'.repeat(64)}));
 assert.throws(()=>normalizeSourceLineage(item,{...l,fma:'FMA9'}));
});
