import test from 'node:test';
import assert from 'node:assert/strict';
import {buildIndependentRegistry,fetchIndependentRegistry} from './independentRegistry.mjs';
import {filterStructures,exploreHref} from './registry.mjs';
const id=n=>'bp-'+n.repeat(24);
const body=(n,fma,group,name)=>({id:id(n),name,group,regions:['whole'],fmaId:'FMA'+fma,bpId:'BP'+fma,path:'models/'+id(n)+'.glb',approvedForDistribution:false,source:'BodyParts3D 4.0',classificationProvisional:true});
const entries=[body('a',1,'skeletal','Fixture bone'),body('b',2,'nervous','Fixture nerve')];
const manifest={schema:1,mode:'private-review',publicRelease:'NO_GO',sourceKind:'independent-bp3d',sourceFrame:'native-official-OBJ',entries};
const selection={schema:1,publicRelease:'NO_GO',clinicalValidation:false,items:[{id:'sel-'+'c'.repeat(24),name:'Fixture nerve component',group:'nervous',fmaId:'FMA3',bpId:'BP3',sourceTree:'isa',regions:['whole'],selectionOnly:true,bindings:[{ownerId:id('b'),elementId:'FJ2'}],clinicalValidation:false,approvedForDistribution:false,classificationProvisional:true}]};
const recovery={schema:1,publicRelease:'NO_GO',registrationValidated:false,clinicalValidation:false,contextMode:'NATIVE_FRAME_CANDIDATE',items:[{...body('d',4,'respiratory','Fixture organ'),sourceTree:'partof',priorityOnly:true,contextCandidate:true,clinicalValidation:false,path:'priority-recovery/'+id('d')+'.glb'},{...body('e',2,'nervous','Alternative fixture nerve'),sourceTree:'partof',priorityOnly:true,contextCandidate:false,clinicalValidation:false,path:'priority-recovery/'+id('e')+'.glb'}]};
test('original library schema uses exact independent IDs, preserves systems and no fabricated region/thumbnail',()=>{
 const r=buildIndependentRegistry(manifest,selection,recovery);
 assert.equal(r.rows.length,4);
 assert.equal(r.byId.get(id('d')).system,'visceral');
 assert.equal(r.byId.get(id('d')).representation,'native-context-candidate');
 assert.equal(r.byId.has(id('e')),false);
 assert.equal(filterStructures(r,{query:'FMA3'})[0].id,selection.items[0].id);
 assert.equal(filterStructures(r,{system:'nervous'}).length,2);
 assert.equal(filterStructures(r,{region:'headNeck'}).length,0);
 assert.deepEqual(r.regions.map(x=>x.id),['whole']);
 for(const row of r.rows){assert.equal(row.thumbnail,null);assert.equal(row.clinicalValidation,false);assert.deepEqual(row.regions,[]);}
 assert.equal(exploreHref(id('b')),'/anatomy/explore?structure='+id('b'));
});
test('reject legacy, wrong host, approval flag, malformed recovery and duplicate ID',()=>{
 assert.throws(()=>buildIndependentRegistry({...manifest,sourceKind:'legacy'}));
 assert.throws(()=>buildIndependentRegistry(manifest,null,null,'example.com'));
 assert.throws(()=>buildIndependentRegistry({...manifest,entries:[{...entries[0],approvedForDistribution:true}]}));
 assert.throws(()=>buildIndependentRegistry(manifest,null,{...recovery,items:[{...recovery.items[0],path:'../unknown.glb'}]}));
 assert.throws(()=>buildIndependentRegistry({...manifest,entries:[entries[0],entries[0]]}));
});
test('only fetch private inventory paths; optional missing sources are not replaced by legacy',async()=>{
 const paths=[];
 const r=await fetchIndependentRegistry(async u=>{
  paths.push(u);return u.endsWith('/inventory.json')&&!u.includes('priority-recovery')?{ok:true,headers:{get:()=> 'application/json'},json:async()=>manifest}:{ok:false,status:404};
 },'127.0.0.1');
 assert.equal(r.rows.length,2);
 assert.deepEqual(paths,['/anatomy/viewer/inventory.json','/anatomy/viewer/element-selection.json','/anatomy/viewer/priority-recovery/inventory.json']);
 await assert.rejects(()=>fetchIndependentRegistry(async()=>{throw Error('unexpected fetch');},'example.com'),/loopback/);
});
