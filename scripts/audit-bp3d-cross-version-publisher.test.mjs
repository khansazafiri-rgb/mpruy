import test from 'node:test';import assert from 'node:assert/strict';import {createHash} from 'node:crypto';import {comparePublisherElement,summarizePublisherIds} from './audit-bp3d-cross-version-publisher.mjs';
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
