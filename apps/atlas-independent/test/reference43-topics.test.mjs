import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {REFERENCE43_TOPIC_ROWS} from '../src/reference43-topic-catalog.js';
import {referenceTopic,browseReferenceTopics,topicOptions} from '../src/reference43-topics.js';
const dir=new URL('../../../licensing/atlas-publication/',import.meta.url);
const proofs=['bp3d43-dual-source-audit-20261125.json','bp3d43-gap-batch-dual-source-audit-20261125.json','bp3d43-nerves32-dual-source-audit-20261125.json','bp3d43-discs-23-dual-source-audit-20261125.json','bp3d43-costal-20-dual-source-audit-20261125.json','bp3d43-head-neck-cartilage-14-dual-source-audit-20261125.json','bp3d43-visceral-18-dual-source-audit-20261126.json','bp3d43-cns-30-dual-source-audit-20261126.json','bp3d43-pelvic-digestive-15-dual-source-audit-20261126.json','bp3d43-cardiopulmonary-32-dual-source-audit-20261126.json','bp3d43-bronchial-thymus-22-dual-source-audit-20261126.json'].flatMap(f=>JSON.parse(readFileSync(new URL(f,dir),'utf8')).matches);
const entries=proofs.map(e=>({fj:e.fj,bpId:e.bp,fmaId:e.fma,name:e.name,rawSHA256:e.rawSHA256,source:'BodyParts3D 4.3',version:'4.3 · '+e.fj}));
test('all 246 topic rows are bound to exact evidence and remain label-only categories',()=>{
 assert.equal(entries.length,246);assert.equal(REFERENCE43_TOPIC_ROWS.length,246);
 assert.equal(new Set(REFERENCE43_TOPIC_ROWS.map(e=>e.fj)).size,246);
 assert(entries.every(e=>referenceTopic(e).region!=='unknown'));
 assert.equal(browseReferenceTopics(entries,{region:'neck-upper-limb',system:'nervous'}).length,6);
 assert.equal(browseReferenceTopics(entries,{system:'ligament'}).length,16);
 assert.equal(browseReferenceTopics(entries,{region:'thorax',system:'respiratory'}).length,23);
 assert.equal(browseReferenceTopics(entries,{region:'foot',query:'FJ1424M'}).length,1);
 assert.equal(browseReferenceTopics(entries,{region:'foot',system:'nervous'}).length,0);
 assert.equal(topicOptions(entries,'region').filter(o=>o.value!=='all').reduce((s,o)=>s+o.count,0),246);
});
test('do not classify modified labels, identities, source versions or raw hashes',()=>{
 const e=entries[0];
 for(const wrong of [{...e,name:'Changed label'},{...e,bpId:'BP0'},{...e,fmaId:'FMA0'},{...e,rawSHA256:'0'.repeat(64)},{...e,source:'BodyParts3D 4.0'}]){
  assert.deepEqual(referenceTopic(wrong),{region:'unknown',system:'unknown'});
  assert.equal(browseReferenceTopics([wrong],{region:'unknown'}).length,1);
 }
 assert.deepEqual(browseReferenceTopics(entries,{region:'not-real'}),[]);
});

test('axial cartilage browsing preserves exact regional counts',()=>{assert.equal(browseReferenceTopics(entries,{system:'cartilage'}).length,58);assert.equal(browseReferenceTopics(entries,{system:'cartilage',region:'spine'}).length,23);assert.equal(browseReferenceTopics(entries,{system:'cartilage',region:'thorax'}).length,20);});

test('laryngeal and nasal cartilage have exact source region labels',()=>{assert.equal(browseReferenceTopics(entries,{system:'cartilage',region:'neck'}).length,10);assert.equal(browseReferenceTopics(entries,{system:'cartilage',region:'head-neck'}).length,5);});

test('visceral source labels support precise provisional systems without claiming lymphatic vessels',()=>{const ids=new Set(JSON.parse(readFileSync(new URL('bp3d43-visceral-18-dual-source-audit-20261126.json',dir),'utf8')).matches.map(e=>e.fj));const v=entries.filter(e=>ids.has(e.fj));assert.equal(v.length,18);for(const [system,n] of [['digestive',10],['urinary',5],['endocrine',2],['lymphoid',1]])assert.equal(browseReferenceTopics(v,{system}).length,n);assert.equal(browseReferenceTopics(v,{region:'pelvis'}).length,2);assert.equal(browseReferenceTopics(v,{region:'abdomen-pelvis',system:'urinary'}).length,2);});

test('CNS source labels have brain and spinal teaching topics, not spatial registration',()=>{const ids=new Set(JSON.parse(readFileSync(new URL('bp3d43-cns-30-dual-source-audit-20261126.json',dir),'utf8')).matches.map(e=>e.fj));const c=entries.filter(e=>ids.has(e.fj));assert.equal(c.length,30);assert.equal(browseReferenceTopics(c,{system:'nervous',region:'brain'}).length,28);assert.equal(browseReferenceTopics(c,{system:'nervous',region:'spine'}).length,2);});

test('pelvic and digestive topics use exact receipt identifiers',()=>{const ids=new Set(JSON.parse(readFileSync(new URL('bp3d43-pelvic-digestive-15-dual-source-audit-20261126.json',dir),'utf8')).matches.map(e=>e.fj));const p=entries.filter(e=>ids.has(e.fj));assert.equal(p.length,15);for(const [system,n] of [['digestive',7],['reproductive',7],['urinary',1]])assert.equal(browseReferenceTopics(p,{system}).length,n);assert.equal(browseReferenceTopics(p,{system:'reproductive',region:'scrotum'}).length,4);assert.equal(browseReferenceTopics(p,{system:'reproductive',region:'pelvis'}).length,3);});

test('cardiovascular and airway topics use exact receipt identities; no complete chamber or vessel claim',()=>{const ids=new Set(JSON.parse(readFileSync(new URL('bp3d43-cardiopulmonary-32-dual-source-audit-20261126.json',dir),'utf8')).matches.map(e=>e.fj));const p=entries.filter(e=>ids.has(e.fj));assert.equal(p.length,32);for(const [system,n] of [['vascular',26],['heart',4],['cartilage',1],['respiratory',1]])assert.equal(browseReferenceTopics(p,{system}).length,n);assert.equal(browseReferenceTopics(p,{region:'lower-limb',system:'vascular'}).length,2);assert.equal(browseReferenceTopics(p,{region:'neck-thorax',system:'respiratory'}).length,1);});

test('bronchial and thymic source elements remain thoracic single-element references',()=>{const ids=new Set(JSON.parse(readFileSync(new URL('bp3d43-bronchial-thymus-22-dual-source-audit-20261126.json',dir),'utf8')).matches.map(e=>e.fj));const p=entries.filter(e=>ids.has(e.fj));assert.equal(p.length,22);assert.equal(browseReferenceTopics(p,{region:'thorax',system:'respiratory'}).length,20);assert.equal(browseReferenceTopics(p,{region:'thorax',system:'lymphoid'}).length,2);});
