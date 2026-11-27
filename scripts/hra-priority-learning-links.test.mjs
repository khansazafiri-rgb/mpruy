import test from 'node:test';
import assert from 'node:assert/strict';
import {HRA_PRIORITY_LEARNING_LINKS,hraLearningReferences} from '../apps/atlas-independent/src/hra-learning-links.js';
import {expectedPriorityMeshes} from './load-hra-priority-isolated.mjs';
const entries=[...expectedPriorityMeshes().values()].map(e=>({id:e.id,source:e.source,geometryOnly:true,materialsPreserved:false,clinicalValidation:false,approvedForDistribution:false,registrationValidated:false,meshCount:1,originalNodeIndex:e.originalNodeIndex,sha256:e.sha256,sourceSHA256:e.sourceSHA256,sourceCrosswalk:[{index:2,nodeName:e.nodeName,ontologyId:e.ontologyId,label:e.label}]}));
test('15 isolated assets link only to seven exact checkpoints, using derived node indices',()=>{
 const pairs=[...new Map(HRA_PRIORITY_LEARNING_LINKS.map(x=>[x.group+':'+x.target,x])).values()];
 assert.equal(pairs.length,7);const refs=pairs.flatMap(x=>hraLearningReferences(x.group,x.target,entries));assert.equal(refs.length,15);assert.equal(new Set(refs.map(x=>x.assetId)).size,15);assert(refs.every(x=>x.nodeIndex===2));
 assert.equal(hraLearningReferences('digestive','parotid gland',entries).length,4);assert.equal(hraLearningReferences('joints','left medial meniscus',entries).length,0);
});
test('isolated metadata is fail-closed for wrong source, original node, digest, label, release state, or mapping',()=>{
 const l=HRA_PRIORITY_LEARNING_LINKS[0],e=entries.find(x=>x.sha256===l.sha256);
 for(const bad of [{...e,geometryOnly:false},{...e,originalNodeIndex:999},{...e,sha256:'0'.repeat(64)},{...e,sourceSHA256:'0'.repeat(64)},{...e,registrationValidated:true},{...e,approvedForDistribution:true},{...e,sourceCrosswalk:[{...e.sourceCrosswalk[0],nodeName:'wrong'}]},{...e,sourceCrosswalk:[]}])assert.equal(hraLearningReferences(l.group,l.target,[bad]).length,0);
});
