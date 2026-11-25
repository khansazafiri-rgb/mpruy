import test from 'node:test';
import assert from 'node:assert/strict';
import {planContextRecovery} from './independent-atlas-context-recovery.mjs';
const row=(n,fma,fjs,group='respiratory')=>({id:'bp-'+String(n).padStart(24,'0'),fmaId:'FMA'+fma,group,status:'EXPORTED_ISOLATED_CONCEPT',sourceElements:fjs.map(id=>({id}))});
test('reuse a publisher element only once, prefer granular disjoint concepts',()=>{
 const body=[{fmaId:'FMA1',sourceElements:[{id:'FJ1'}]}];
 const all=[row(2,2,['FJ2','FJ3']),row(3,3,['FJ2']),row(4,4,['FJ3']),row(5,5,['FJ1','FJ4']),row(6,1,['FJ5']),row(7,7,['FJ6'])];
 const r=planContextRecovery(body,all,['FMA7']);
 assert.deepEqual(r.accepted.map(e=>e.fmaId),['FMA3','FMA4']);
 assert.equal(r.held.length,4);
 assert.equal(r.held.find(e=>e.fmaId==='FMA2').reason,'SHARED_PUBLISHER_ELEMENT');
 assert.equal(r.held.find(e=>e.fmaId==='FMA7').reason,'EXISTING_FMA');
 assert.equal(r.registrationValidated,false);
 assert.equal(r.clinicalValidation,false);
 assert.equal(r.publicRelease,'NO_GO');
});
test('reject malformed or duplicated publisher element lists',()=>{
 assert.throws(()=>planContextRecovery([], [row(1,1,['FJ1','FJ1'])]));
 assert.throws(()=>planContextRecovery([], [row(1,1,['arbitrary'])]));
});
