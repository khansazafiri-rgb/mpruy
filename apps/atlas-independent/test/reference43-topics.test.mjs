import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {REFERENCE43_TOPIC_ROWS} from '../src/reference43-topic-catalog.js';
import {referenceTopic,browseReferenceTopics,topicOptions} from '../src/reference43-topics.js';
const dir=new URL('../../../licensing/atlas-publication/',import.meta.url);
const proofs=['bp3d43-dual-source-audit-20261125.json','bp3d43-gap-batch-dual-source-audit-20261125.json','bp3d43-nerves32-dual-source-audit-20261125.json','bp3d43-discs-23-dual-source-audit-20261125.json','bp3d43-costal-20-dual-source-audit-20261125.json','bp3d43-head-neck-cartilage-14-dual-source-audit-20261125.json','bp3d43-visceral-18-dual-source-audit-20261126.json'].flatMap(f=>JSON.parse(readFileSync(new URL(f,dir),'utf8')).matches);
const entries=proofs.map(e=>({fj:e.fj,bpId:e.bp,fmaId:e.fma,name:e.name,rawSHA256:e.rawSHA256,source:'BodyParts3D 4.3',version:'4.3 · '+e.fj}));
test('all 147 topic rows are bound to exact evidence and remain label-only categories',()=>{
 assert.equal(entries.length,147);assert.equal(REFERENCE43_TOPIC_ROWS.length,147);
 assert.equal(new Set(REFERENCE43_TOPIC_ROWS.map(e=>e.fj)).size,147);
 assert(entries.every(e=>referenceTopic(e).region!=='unknown'));
 assert.equal(browseReferenceTopics(entries,{region:'neck-upper-limb',system:'nervous'}).length,6);
 assert.equal(browseReferenceTopics(entries,{system:'ligament'}).length,16);
 assert.equal(browseReferenceTopics(entries,{region:'thorax',system:'respiratory'}).length,3);
 assert.equal(browseReferenceTopics(entries,{region:'foot',query:'FJ1424M'}).length,1);
 assert.equal(browseReferenceTopics(entries,{region:'foot',system:'nervous'}).length,0);
 assert.equal(topicOptions(entries,'region').filter(o=>o.value!=='all').reduce((s,o)=>s+o.count,0),147);
});
test('do not classify modified labels, identities, source versions or raw hashes',()=>{
 const e=entries[0];
 for(const wrong of [{...e,name:'Changed label'},{...e,bpId:'BP0'},{...e,fmaId:'FMA0'},{...e,rawSHA256:'0'.repeat(64)},{...e,source:'BodyParts3D 4.0'}]){
  assert.deepEqual(referenceTopic(wrong),{region:'unknown',system:'unknown'});
  assert.equal(browseReferenceTopics([wrong],{region:'unknown'}).length,1);
 }
 assert.deepEqual(browseReferenceTopics(entries,{region:'not-real'}),[]);
});

test('axial cartilage browsing preserves exact regional counts',()=>{assert.equal(browseReferenceTopics(entries,{system:'cartilage'}).length,57);assert.equal(browseReferenceTopics(entries,{system:'cartilage',region:'spine'}).length,23);assert.equal(browseReferenceTopics(entries,{system:'cartilage',region:'thorax'}).length,20);});

test('laryngeal and nasal cartilage have exact source region labels',()=>{assert.equal(browseReferenceTopics(entries,{system:'cartilage',region:'neck'}).length,9);assert.equal(browseReferenceTopics(entries,{system:'cartilage',region:'head-neck'}).length,5);});

test('visceral source labels support precise provisional systems without claiming lymphatic vessels',()=>{const v=entries.filter(e=>["FJ2561","FJ2563","FJ2564","FJ2565","FJ2566","FJ2567","FJ2571","FJ2572","FJ2573","FJ2816","FJ2817","FJ3129","FJ3130","FJ3144","FJ3145","FJ3146","FJ3147","FJ3149"].includes(e.fj));assert.equal(v.length,18);for(const [system,n] of [['digestive',10],['urinary',5],['endocrine',2],['lymphoid',1]])assert.equal(browseReferenceTopics(v,{system}).length,n);assert.equal(browseReferenceTopics(v,{region:'pelvis'}).length,2);assert.equal(browseReferenceTopics(v,{region:'abdomen-pelvis',system:'urinary'}).length,2);});
