import test from 'node:test';import assert from 'node:assert/strict';import {createHash} from 'node:crypto';import {comparePublisherElement,summarizePublisherIds,compareNativeTriangles,comparePublisherNative,classifyIdentityGate,summarizeIdentityGates,compareVersionedCandidates} from './audit-bp3d-cross-version-publisher.mjs';
const obj=Buffer.from('v 0 0 0\nv 1 0 0\nv 0 1 0\nf 1 2 3\n'),hash=createHash('sha256').update(obj).digest('hex'),ref={fj:'FJ1',fma:'FMA1',bp:'BP1',name:'Fixture only',rawSHA256:hash,triangles:1};
const s={tree:'isa',names:[{fmaId:'FMA1',bpId:'BP1',name:'Fixture only'}],elements:new Map([['FMA1',new Set(['FJ1','FJ2'])]]),archiveIndex:new Map([['FJ1','FJ1.obj']])};
test('exact publisher bytes with unique identity and membership do not imply whole concept',()=>{const r=comparePublisherElement(ref,[s],()=>obj);assert.equal(r.status,'EXACT_IDENTITY_AND_RAW_BYTES');assert.equal(r.trees[0].conceptElementCount,2);assert.equal(r.wholeConceptClaim,false);});
test('same raw bytes with different identity, different raw bytes, and missing FJ are distinct',()=>{assert.equal(comparePublisherElement({...ref,bp:'BP2'},[s],()=>obj).status,'EXACT_RAW_BYTES_IDENTITY_REVIEW');assert.equal(comparePublisherElement(ref,[s],()=>Buffer.from('different')).status,'REUSED_FJ_DIFFERENT_RAW_BYTES');assert.equal(comparePublisherElement(ref,[{...s,archiveIndex:new Map()}],()=>{throw Error('not called')}).status,'FJ_NOT_IN_EITHER_ARCHIVE');assert.throws(()=>comparePublisherElement({...ref,triangles:2},[s],()=>obj));});

test('CI evidence lists each source ID once without exposing geometry or claiming approval',()=>{
 const rows=[{fj:'FJ2',status:'EXACT_IDENTITY_AND_RAW_BYTES',positions:[0,1,2]},{fj:'FJ1',status:'EXACT_IDENTITY_AND_RAW_BYTES'},{fj:'FJ3',status:'FJ_NOT_IN_EITHER_ARCHIVE'}];
 assert.deepEqual(summarizePublisherIds(rows),{EXACT_IDENTITY_AND_RAW_BYTES:['FJ1','FJ2'],EXACT_RAW_BYTES_IDENTITY_REVIEW:[],REUSED_FJ_DIFFERENT_RAW_BYTES:[],FJ_NOT_IN_EITHER_ARCHIVE:['FJ3']});
 assert.throws(()=>summarizePublisherIds([...rows,rows[0]]));
 assert.throws(()=>summarizePublisherIds([{fj:'FJ4',status:'APPROVED'}]));
 assert.throws(()=>summarizePublisherIds([{fj:'../FJ4',status:'FJ_NOT_IN_EITHER_ARCHIVE'}]));
});

test('native triangle equality distinguishes order, winding, count and actual coordinate changes',()=>{
 const a=new Float32Array([0,0,0,1,0,0,0,1,0]),same=new Float32Array(a),reordered=new Float32Array([0,1,0,1,0,0,0,0,0]),shifted=new Float32Array([0,0,1,1,0,1,0,1,1]);
 assert.equal(compareNativeTriangles(a,same).status,'EXACT_ORDERED_NATIVE_TRIANGLES');
 assert.equal(compareNativeTriangles(a,reordered).status,'EXACT_UNORDERED_NATIVE_TRIANGLES');
 assert.equal(compareNativeTriangles(a,shifted).status,'DIFFERENT_NATIVE_TRIANGLE_MULTISET');
 assert.equal(compareNativeTriangles(a,new Float32Array([...a,...a])).status,'DIFFERENT_TRIANGLE_COUNT');
 assert.throws(()=>compareNativeTriangles(a,new Float32Array([NaN,...a.slice(1)])));
});
test('native comparison requires exact source membership and unchanged archive bytes',()=>{
 const row=comparePublisherElement(ref,[s],()=>obj);
 const r=comparePublisherNative(ref,row,[s],()=>obj,()=>new Float32Array([0,0,0,1,0,0,0,1,0]));
 assert.equal(r.trees[0].status,'EXACT_ORDERED_NATIVE_TRIANGLES');assert.equal(r.registrationValidated,false);
 assert.throws(()=>comparePublisherNative(ref,row,[s],()=>Buffer.from('changed'),()=>new Float32Array([0,0,0,1,0,0,0,1,0])));
 const ambiguous={...row,trees:[{...row.trees[0],exactConcept:false}]};
 assert.equal(comparePublisherNative(ref,ambiguous,[s],()=>{throw Error('must not read')},()=>{throw Error('must not read')}).trees[0].status,'HOLD_IDENTITY_REVIEW');
});

test('a version-specific BP change is only a candidate; exact native gate remains closed',()=>{
 const changed={...s,names:[{fmaId:'FMA1',bpId:'BP9',name:'Fixture only'}]};
 const row=comparePublisherElement(ref,[changed],()=>obj);
 assert.equal(classifyIdentityGate(ref,row.trees[0]),'CANDIDATE_VERSIONED_BP_CHANGE');
 const summary=summarizeIdentityGates([row]);
 assert.deepEqual(summary.candidates,[{fj:'FJ1',fma:'FMA1',bp43:'BP1',bp40:'BP9',tree:'isa'}]);
 assert.equal(summary.verifiedCrosswalk,false);
 assert.equal(comparePublisherNative(ref,row,[changed],()=>{throw Error('held')},()=>{throw Error('held')}).trees[0].status,'HOLD_IDENTITY_REVIEW');
 assert.equal(classifyIdentityGate(ref,{...row.trees[0],conceptIncludesFJ:false}),'HOLD_FJ_NOT_IN_FMA_MEMBERSHIP');
 assert.equal(classifyIdentityGate(ref,{...row.trees[0],conceptNames:[]}),'HOLD_FMA_ABSENT');
 assert.equal(classifyIdentityGate(ref,{...row.trees[0],conceptNames:[{bpId:'BP9',name:'Other'}]}),'HOLD_NAME_MISMATCH');
 assert.equal(classifyIdentityGate(ref,{...row.trees[0],conceptNames:[...row.trees[0].conceptNames,{bpId:'BP10',name:'Other'}]}),'HOLD_AMBIGUOUS_REPRESENTATION');
});

test('exploratory BP candidate geometry never opens exact identity or release gates',()=>{
 const changed={...s,names:[{fmaId:'FMA1',bpId:'BP9',name:'Fixture only'}]};
 const row=comparePublisherElement(ref,[changed],()=>obj),positions=new Float32Array([0,0,0,1,0,0,0,1,0]);
 const results=compareVersionedCandidates(ref,row,[changed],()=>obj,()=>positions);
 assert.equal(results.length,1);assert.equal(results[0].status,'EXACT_ORDERED_NATIVE_TRIANGLES');
 assert.equal(results[0].identityStatus,'CANDIDATE_VERSIONED_BP_CHANGE');assert.equal(results[0].verifiedCrosswalk,false);assert.equal(results[0].registrationValidated,false);assert.equal(results[0].approvedForDistribution,false);
 assert.throws(()=>compareVersionedCandidates(ref,row,[changed],()=>Buffer.from('altered'),()=>positions));
 assert.throws(()=>compareVersionedCandidates(ref,row,[changed],()=>obj,()=>new Float32Array(18)));
 const bad={...row,trees:[{...row.trees[0],conceptIncludesFJ:false}]};
 assert.deepEqual(compareVersionedCandidates(ref,bad,[changed],()=>{throw Error('held')},()=>{throw Error('held')}),[]);
 assert.equal(comparePublisherNative(ref,row,[changed],()=>{throw Error('held')},()=>{throw Error('held')}).trees[0].status,'HOLD_IDENTITY_REVIEW');
});
