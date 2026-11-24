import test from 'node:test';
import assert from 'node:assert/strict';
import {validateInventory,matchesRegion,searchEntries} from '../src/inventory.js';
const id='za-'+'a'.repeat(24);
const e={id,name:'Synthetic fixture',group:'arterial',regions:['headNeck'],path:'models/'+id+'.glb',approvedForDistribution:false};
const doc={schema:1,mode:'private-review',publicRelease:'NO_GO',entries:[e]};
test('private inventory is available only to loopback and cannot imply approval',()=>{
 assert.equal(validateInventory(doc,'127.0.0.1').length,1);
 assert.throws(()=>validateInventory(doc,'medcoel.com'));
 assert.throws(()=>validateInventory({...doc,publicRelease:'GO'},'127.0.0.1'));
 assert.throws(()=>validateInventory({...doc,entries:[{...e,approvedForDistribution:true}]},'127.0.0.1'));
 assert.throws(()=>validateInventory({...doc,entries:[{...e,path:'../restricted.glb'}]},'127.0.0.1'));
 assert.throws(()=>validateInventory({...doc,entries:[e,e]},'127.0.0.1'));
});
test('study filters and case-insensitive search',()=>{
 assert(matchesRegion(e,'whole'));assert(matchesRegion(e,'headNeck'));assert(!matchesRegion(e,'abdomen'));
 assert.equal(searchEntries([e],'FIXTURE').length,1);assert.equal(searchEntries([e],'f').length,0);
});
