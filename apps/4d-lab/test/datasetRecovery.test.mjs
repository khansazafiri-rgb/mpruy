import test from 'node:test';
import assert from 'node:assert/strict';
import {recoverBundledDataset} from '../src/app/datasetRecovery.js';

test('4D-RECOVERY-001: blocked atlas CT uses separate procedural phantom and reports downgrade',async()=>{
 const attempts=[],reasons=[];
 const result=await recoverBundledDataset('atlas',async key=>{
  attempts.push(key);
  if(key==='atlas')throw new Error('Gagal memuat ct.nrrd (HTTP 404)');
 },error=>reasons.push(error.message));
 assert.deepEqual(attempts,['atlas','phantom']);
 assert.deepEqual(reasons,['Gagal memuat ct.nrrd (HTTP 404)']);
 assert.deepEqual(result,{dataset:'phantom',recovered:true});
});
test('4D-RECOVERY-002: a valid atlas stays original; no phantom download',async()=>{
 const attempts=[];
 const result=await recoverBundledDataset('atlas',async key=>{attempts.push(key)});
 assert.deepEqual(attempts,['atlas']);
 assert.deepEqual(result,{dataset:'atlas',recovered:false});
});
test('4D-RECOVERY-003: phantom missing never retries a blocked Atlas path',async()=>{
 const attempts=[];
 await assert.rejects(()=>recoverBundledDataset('phantom',async key=>{
  attempts.push(key);throw new Error('phantom unavailable');
 }),/phantom unavailable/);
 assert.deepEqual(attempts,['phantom']);
});
test('4D-RECOVERY-004: both missing explicitly fail; no alternative Atlas or patient data',async()=>{
 const attempts=[];
 await assert.rejects(()=>recoverBundledDataset('atlas',async key=>{
  attempts.push(key);throw new Error(key+' unavailable');
 }),/Atlas tidak tersedia .*phantom prosedural juga gagal/);
 assert.deepEqual(attempts,['atlas','phantom']);
});
