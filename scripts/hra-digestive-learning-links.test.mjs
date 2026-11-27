import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import {createHash} from 'node:crypto';
import {HRA_DIGESTIVE_LEARNING_LINKS as links,HRA_SUPPLEMENT_LEARNING_LINKS as supplement,hraLearningReferences} from '../apps/atlas-independent/src/hra-learning-links.js';
const proof=JSON.parse(fs.readFileSync(new URL('../licensing/atlas-publication/hra-digestive-six-pinned-audit-20261127.json',import.meta.url),'utf8'));
const entries=proof.rows.map(r=>({id:createHash('sha256').update(r.assetURL).digest('hex').slice(0,24),source:r.assetURL,approvedForDistribution:false,registrationValidated:false,sourceCrosswalk:r.labels.filter(x=>x.status==='EXACT_NAMED_MESH_NODE').map(x=>({index:x.meshNodeIndices[0],label:x.label,ontologyId:x.ontologyId}))}));
test('five digestive checkpoints have ten exact versioned source nodes, not body geometry',()=>{
 assert.equal(links.length,10);
 for(const target of new Set(links.map(x=>x.target))){
  const hits=hraLearningReferences('digestive',target,entries);
  assert.equal(hits.length,2);assert(hits.every(x=>x.kind==='NODE'&&x.type==='HRA_SOURCE_COMPONENT'));
  assert.equal(hraLearningReferences('nervous',target,entries).length,0);
  assert.equal(hraLearningReferences('digestive',target,entries.map(e=>({...e,approvedForDistribution:true}))).length,0);
  assert.equal(hraLearningReferences('digestive',target,entries.map(e=>({...e,source:e.source.replace(/\/v\d+\.\d+\//,'/v9.9/')}))).length,0);
  assert.equal(hraLearningReferences('digestive',target,entries.map(e=>({...e,sourceCrosswalk:e.sourceCrosswalk.map(x=>({...x,index:x.index+10000}))}))).length,0);
 }
 assert.equal(new Set(links.map(x=>x.target)).size,5);
 for(const target of ['pancreas','common bile duct','anal canal'])assert.equal(hraLearningReferences('digestive',target,entries).length,0);
});

test('five supplemental checkpoints bind twelve source-native references to retained receipts',()=>{const read=n=>JSON.parse(fs.readFileSync(new URL('../licensing/atlas-publication/'+n,import.meta.url),'utf8'));const g=read('hra-knee-larynx-six-group-audit-20261127.json'),p=read('hra-pelvis-two-pinned-audit-20261127.json'),t=read('hra-tonsil-four-pinned-audit-20261127.json');const e=[...g.rows.map(r=>({...r,sourceGroups:r.groups})),...p.rows,...t.rows].map(r=>({id:createHash('sha256').update(r.assetURL).digest('hex').slice(0,24),source:r.assetURL,approvedForDistribution:false,registrationValidated:false,sourceGroups:r.sourceGroups,sourceCrosswalk:r.labels?.filter(l=>l.status==='EXACT_NAMED_MESH_NODE').map(l=>({index:l.meshNodeIndices[0],label:l.label,ontologyId:l.ontologyId}))}));assert.equal(supplement.length,12);for(const {group,target} of new Map(supplement.map(x=>[x.target,x])).values()){const hits=hraLearningReferences(group,target,e);assert.equal(hits.length,target==='palatine tonsil'?4:2);assert(hits.every(x=>x.type==='HRA_SOURCE_COMPONENT'));assert.equal(hraLearningReferences(group,target,e.map(x=>({...x,registrationValidated:true}))).length,0);assert.equal(hraLearningReferences(group,target,e.map(x=>({...x,source:x.source.replace(/\/v\d+\.\d+\//,'/v9.9/')}))).length,0);}assert.equal(hraLearningReferences('joints','left anterior cruciate ligament',e).length,0);assert.equal(hraLearningReferences('lymphatic','mesenteric lymph node',e).length,0);});
