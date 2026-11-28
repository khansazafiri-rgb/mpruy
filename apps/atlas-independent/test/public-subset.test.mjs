import test from 'node:test';
import assert from 'node:assert/strict';
import {createHash,webcrypto} from 'node:crypto';
import {assetPinRows,verifySubsetInventory,verifiedSubsetModel,SUBSET_PRODUCT} from '../src/public-subset.js';
import {quizPool,labelKey} from '../src/public-learning.js';
const sha=b=>createHash('sha256').update(b).digest('hex');
const model=Buffer.from('Engineering checksum fixture; no anatomy');
const id='bp-'+'a'.repeat(24),entry={id,name:'Fixture label',group:'skeletal',fmaId:'FMA1',bpId:'BP1',regions:['whole'],path:'models/'+id+'.glb',source:'BodyParts3D 4.0',classificationProvisional:true,license:'CC-BY-4.0',approvedForDistribution:true,sha256:sha(model),bytes:model.length,attribution:'The Database Center for Life Science'};
const pin=sha(JSON.stringify(assetPinRows([entry]))),doc={schema:1,mode:'licensed-educational-subset',product:SUBSET_PRODUCT,publicRelease:'PUBLIC_LICENSE_EVIDENCE_VERIFIED',sourceKind:'independent-bp3d',sourceFrame:'native-official-OBJ',assetSetSHA256:pin,clinicalValidation:false,registrationValidated:false,entries:[entry]};
test('public product is byte-pinned, scoped and cannot promote a private inventory',async()=>{
 assert.equal((await verifySubsetInventory(doc,'medcoel.com',pin,webcrypto.subtle)).length,1);
 for(const [changed,host,p]of [[{...doc,publicRelease:'NO_GO'},'medcoel.com',pin],[doc,'evil.example',pin],[doc,'medcoel.com',''],[{...doc,entries:[{...entry,name:'Changed identity'}]},'medcoel.com',pin],[{...doc,entries:[{...entry,path:'../private.glb'}]},'medcoel.com',pin],[{...doc,clinicalValidation:true},'medcoel.com',pin]])await assert.rejects(()=>verifySubsetInventory(changed,host,p,webcrypto.subtle));
});
test('changed or truncated model bytes are rejected before decoding',async()=>{
 await verifiedSubsetModel(model,entry,webcrypto.subtle);
 await assert.rejects(()=>verifiedSubsetModel(Buffer.from(model.toString().replace('fixture','FIXTURE')),entry,webcrypto.subtle));
 await assert.rejects(()=>verifiedSubsetModel(model.subarray(1),entry,webcrypto.subtle));
});
test('learning excludes ambiguous source labels and duplicate FMA concepts',()=>{
 const es=[{id:'1',name:'same',fmaId:'FMA1',group:'a'},{id:'2',name:'SAME',fmaId:'FMA2',group:'a'},{id:'3',name:'unique',fmaId:'FMA3',group:'a'},{id:'4',name:'other',fmaId:'FMA3',group:'b'}];
 assert.deepEqual(quizPool(es).map(x=>x.id),['3']);assert.equal(labelKey('  Some  LABEL '),'some label');
});
