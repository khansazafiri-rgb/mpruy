import test from 'node:test';
import assert from 'node:assert/strict';
import {buildElementCatalog} from './independent-atlas-element-catalog.mjs';
const model=(id,fma,group,els,tree='isa')=>({id,name:id,group,fmaId:fma,bpId:'BP'+fma.slice(3),frame:'native-official-OBJ',approvedForDistribution:false,license:'CC-BY-4.0',path:'bp3d/'+id+'.glb',sourceTree:tree,sourceElements:els.map(id=>({id}))});
const source=(tree,spec)=>({tree,names:spec.map(([fmaId,name])=>({fmaId,name,bpId:'BP'+fmaId.slice(3)})),elements:new Map(spec.map(([id,,els])=>[id,new Set(els)])),archiveIndex:new Map(spec.flatMap(([,,els])=>els.map(id=>[id,id+'.obj'])))});
test('exact complete membership is reused without exporting another mesh',()=>{
 const body=[model('one','FMA1','nervous',['FJ1','FJ2']),model('two','FMA2','nervous',['FJ3']),model('three','FMA3','heart',['FJ4'])];
 const isa=source('isa',[['FMA1','existing',['FJ1']],['FMA4','part',['FJ2','FJ3']],['FMA5','partial',['FJ2','FJ9']],['FMA6','mixed groups',['FJ2','FJ4']]]);
 const partof=source('partof',[['FMA7','wrong tree',['FJ2']]]);
 const result=buildElementCatalog(body,[isa,partof]);
 assert.equal(result.publicRelease,'NO_GO');
 assert.deepEqual(result.items.map(e=>e.fmaId),['FMA4']);
 assert.equal(result.items[0].bindings.length,2);
 assert.equal(result.items[0].group,'nervous');
 assert.equal(result.items[0].approvedForDistribution,false);
});
test('reject ambiguous ownership within the same tree',()=>{
 const body=[model('one','FMA1','nervous',['FJ1']),model('two','FMA2','nervous',['FJ1'])];
 assert.equal(buildElementCatalog(body,[source('isa',[['FMA3','duplicate',['FJ1']]])]).items.length,0);
});
