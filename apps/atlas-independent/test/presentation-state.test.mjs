import test from 'node:test';
import assert from 'node:assert/strict';
import {initialPresentation,setGroupOpacity,effectiveOpacity,materialKey,chooseEvictions,fitParameters,nextPickedId} from '../src/presentation-state.js';
const bone={id:'bone',group:'skeletal'},nerve={id:'nerve',group:'nervous'};
test('opacity is independent by system, selected tissue stays highlighted and context is reversible',()=>{
 const initial=initialPresentation();
 const s=setGroupOpacity(initial,'skeletal',40);
 assert.equal(effectiveOpacity(bone,s,null),.4);assert.equal(effectiveOpacity(nerve,s,null),1);
 assert.equal(effectiveOpacity(bone,s,'bone'),1);assert.equal(effectiveOpacity(bone,{...s,context:true},'nerve'),.22);
 assert.equal(effectiveOpacity(nerve,{...s,context:true},'nerve'),1);
 assert.equal(effectiveOpacity(bone,{...s,context:true},null),.4);
 assert.equal(setGroupOpacity(s,'skeletal',0).opacity.skeletal,15);
 assert.equal(setGroupOpacity(s,'skeletal',200).opacity.skeletal,100);
 assert.equal(setGroupOpacity(s,'skeletal',NaN),s);assert.deepEqual(initial.opacity,{});
 assert.equal(materialKey(bone,'skeletal',{...s,wireframe:true},null),'skeletal:0.40:wire');
 assert.equal(materialKey(bone,'skeletal',{...s,wireframe:true},'bone'),'highlight:1.00:solid');
});
test('cache eviction protects visible, selected and in-flight models and reports residual budget',()=>{
 const rows=[{id:'visible',visible:true,bytes:80,lastUsed:1},{id:'selected',visible:false,bytes:30,lastUsed:2},{id:'loading',visible:false,bytes:20,lastUsed:3},{id:'old',visible:false,bytes:30,lastUsed:4},{id:'new',visible:false,bytes:10,lastUsed:5}];
 const r=chooseEvictions(rows,{limit:145,selectedId:'selected',inflight:new Set(['loading'])});
 assert.deepEqual(r.ids,['old']);assert.equal(r.remaining,140);assert.equal(r.aboveBudget,false);
 const tight=chooseEvictions(rows,{limit:100,selectedId:'selected',inflight:new Set(['loading'])});
 assert.deepEqual(tight.ids,['old','new']);assert.equal(tight.remaining,130);assert.equal(tight.aboveBudget,true);
});
test('camera fits same source frame at different scales and viewport aspect ratios',()=>{
 const wide=fitParameters([10,20,5],40,2),tall=fitParameters([10,20,5],40,.5);
 assert(tall.distance>wide.distance);assert(wide.near>0&&wide.far>wide.distance);
 const large=fitParameters([10000,20000,5000],40,2);assert(Math.abs(large.distance/wide.distance-1000)<1e-9);
 assert.throws(()=>fitParameters([0,NaN,1],40,2));assert.throws(()=>fitParameters([1,2,3],40,0));
});
test('multi-hit picking cycles unique structures instead of triangles',()=>{
 assert.equal(nextPickedId(['a','a','b','c'],'a',true),'b');
 assert.equal(nextPickedId(['a','a','b','c'],'c',true),'a');
 assert.equal(nextPickedId(['a','b'],'b',false),'a');
 assert.equal(nextPickedId(['a','b'],'x',true),'a');assert.equal(nextPickedId([],null,true),null);
});
