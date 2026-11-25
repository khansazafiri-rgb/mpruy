import test from 'node:test';
import assert from 'node:assert/strict';
import {planCoverage} from './plan-independent-atlas-coverage.mjs';
import {bodyDisplayEntry} from './load-independent-source-review.mjs';
import {validateInventory} from '../apps/atlas-independent/src/inventory.js';
test('source-native independent display does not invent regional or layer metadata',()=>{
 const e=bodyDisplayEntry({id:'fixture',name:'Femur',group:'skeletal',fmaId:'FMA1',bpId:'BP2',frame:'native-official-OBJ',approvedForDistribution:false,license:'CC-BY-4.0',path:'bp3d/fixture.glb'});
 e.path='models/'+e.id+'.glb';
 const doc={schema:1,mode:'private-review',publicRelease:'NO_GO',sourceKind:'independent-bp3d',sourceFrame:'native-official-OBJ',entries:[e]};
 assert.equal(validateInventory(doc,'127.0.0.1').length,1);
 assert.throws(()=>validateInventory(doc,'medcoel.com'));
 assert.throws(()=>validateInventory({...doc,sourceFrame:'guessed'},'127.0.0.1'));
 assert.throws(()=>validateInventory({...doc,entries:[{...e,layer:0}]},'127.0.0.1'));
 assert.throws(()=>validateInventory({...doc,entries:[{...e,regions:['thorax']}]},'127.0.0.1'));
});
test('coverage expansion demands exact official names, complete element sets and unique concept',()=>{
 const targets=['Left femur','Right femur','Spinal cord','Thoracic duct','Left kidney','Brain'].map(name=>({name,group:'skeletal'}));
 const body=[{name:'Left femur',fmaId:'FMA1'}];
 const names=[['FMA2','BP2','Right femur'],['FMA3','BP3','Spinal cord'],['FMA4','BP4','Thoracic duct'],['FMA5','BP5','Thoracic duct'],['FMA6','BP6','Right kidney']].map(([fmaId,bpId,name])=>({fmaId,bpId,name}));
 const elements=new Map(names.map((n,i)=>[n.fmaId,new Set(['FJ'+(i+1)])]));
 const r=planCoverage(targets,body,[{tree:'isa',names,elements,archiveIndex:new Map(['FJ1','FJ3','FJ4','FJ5'].map(x=>[x,x+'.obj']))}]);
 assert.deepEqual(r.counts,{PRESENT_EXACT_NAME:1,EXACT_SOURCE_EXPANSION_CANDIDATE:1,NO_EXACT_PUBLISHER_MATCH:3,AMBIGUOUS_PUBLISHER_MATCH:1});
 assert.equal(r.rows[1].fmaId,'FMA2');assert.equal(r.publicRelease,'NO_GO');assert.equal(r.clinicalValidation,false);
});
