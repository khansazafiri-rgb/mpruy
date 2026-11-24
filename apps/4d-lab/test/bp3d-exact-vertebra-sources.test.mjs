import test from 'node:test';
import assert from 'node:assert/strict';
import {EXPECTED_VERTEBRA_LEVELS,selectExactVertebraSources}
 from '../tools/bp3d-exact-vertebra-sources.mjs';

const ord=['','first','second','third','fourth','fifth','sixth','seventh','eighth',
  'ninth','tenth','eleventh','twelfth'];
function atlasName(level){return level==='c1'?'Atlas (C1)':level==='c2'?'Axis (C2)':
  level==='coccyx'?'Coccyx':'Vertebra '+level.toUpperCase();}
function sourceName(level){return level==='c1'?'atlas':level==='c2'?'axis':
  level==='coccyx'?'coccyx':ord[Number(level.slice(1))]+' '+
  {c:'cervical',t:'thoracic',l:'lumbar'}[level[0]]+' vertebra';}
const fixture=()=>{
 const catalog=Object.fromEntries(EXPECTED_VERTEBRA_LEVELS.map(x=>[atlasName(x),{source:'skeletal'}]));
 const officialRows=EXPECTED_VERTEBRA_LEVELS.map((x,i)=>({
   name:sourceName(x),fmaId:'FMA'+(10000+i),bpId:'BP'+(8000+i)}));
 const elements=new Map(officialRows.map((x,i)=>[x.fmaId,new Set(['FJ'+(4000+i)])]));
 const archiveFiles=officialRows.map((x,i)=>'zip/obj/FJ'+(4000+i)+'.obj');
 return {catalog,officialRows,elements,archiveFiles,existing:[]};
};
test('EXACT whole C1–C7, T1–T12, L1–L5 and coccyx publisher meshes can be privately previewed',()=>{
 const x=selectExactVertebraSources(fixture());
 assert.deepEqual([x.summary.targeted,x.summary.selected,x.summary.rejected],[25,25,0],
   JSON.stringify(x.rejected));
 const selected=new Set(x.candidates.map(c=>c.atlasName));
 assert.ok(selected.has('Atlas (C1)'));
 assert.ok(selected.has('Axis (C2)'));
 assert.ok(selected.has('Vertebra C3'));
 assert.ok(selected.has('Vertebra T12'));
 assert.ok(selected.has('Vertebra L5'));
 assert.ok(selected.has('Coccyx'));
 assert.equal(new Set(x.candidates.map(c=>c.matches[0].sourceObjs[0].fileId)).size,25);
 assert.ok(x.candidates.every(c=>!c.geometryIdentityVerified&&!c.redistributionApproved));
 assert.equal(x.summary.approvedForDistribution,0);
});
test('generic vertebra, discs, aggregates and neighboring levels never stand in for missing C3',()=>{
 const f=fixture();
 const c3=f.officialRows.find(x=>x.name==='third cervical vertebra');
 f.officialRows=f.officialRows.filter(x=>x!==c3);
 f.officialRows.push(
  {name:'vertebra',fmaId:'FMA9914',bpId:'BP7847'},
  {name:'cervical vertebra',fmaId:'FMA9915',bpId:'BP7846'},
  {name:'intervertebral disk of third cervical vertebra',fmaId:'FMA9999',bpId:'BP9999'},
  {name:'left vertebral artery at third cervical vertebra',fmaId:'FMA9998',bpId:'BP9998'}
 );
 const chosen=selectExactVertebraSources(f);
 assert.ok(!chosen.candidates.some(x=>x.atlasName==='Vertebra C3'));
 assert.ok(chosen.rejected.some(x=>x.atlasName==='Vertebra C3'&&x.reason==='NO_EXACT_OFFICIAL_BONE_LEVEL'));
 assert.ok(chosen.candidates.some(x=>x.atlasName==='Vertebra C4'));
});
test('exact label duplicated by publisher ID, missing OBJ, missing FJ and used geometry fail closed',()=>{
 const f=fixture(),name='third cervical vertebra',third=f.officialRows.find(x=>x.name===name);
 const f2={...f,officialRows:[...f.officialRows,{...third,fmaId:'FMA9991',bpId:'BP9991'}]};
 assert.ok(selectExactVertebraSources(f2).rejected.some(x=>
   x.atlasName==='Vertebra C3'&&x.reason==='AMBIGUOUS_OFFICIAL_BONE_LEVEL'));
 const f3={...f,archiveFiles:f.archiveFiles.filter(x=>!x.endsWith('FJ4002.obj'))};
 assert.ok(selectExactVertebraSources(f3).rejected.some(x=>
   x.atlasName==='Vertebra C3'&&x.reason.includes('OFFICIAL_OBJ_MISSING')));
 const f4={...f,existing:[{name:'Prior skeletal structure',fmaId:third.fmaId,bpId:third.bpId}]};
 assert.ok(selectExactVertebraSources(f4).rejected.some(x=>
   x.atlasName==='Vertebra C3'&&x.reason.includes('OFFICIAL_GEOMETRY_ALREADY_USED')));
 const f5={...f,elements:new Map([...f.elements].filter(([id])=>id!==third.fmaId))};
 assert.ok(selectExactVertebraSources(f5).rejected.some(x=>
   x.atlasName==='Vertebra C3'&&x.reason.includes('NO_OFFICIAL_FJ_ELEMENTS')));
});
test('a preexisting Atlas vertebra is preserved, never replaced or converted a second time',()=>{
 const f=fixture();
 const x=selectExactVertebraSources({...f,
   existing:[{name:'Atlas (C1)',fmaId:'FMA10000',bpId:'BP8000'}]});
 assert.equal(x.summary.selected,24);
 assert.ok(x.rejected.some(r=>r.atlasName==='Atlas (C1)'&&r.reason==='ATLAS_MODEL_ALREADY_PRESENT'));
});
