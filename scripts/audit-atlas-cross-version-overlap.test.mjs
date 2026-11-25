import test from 'node:test';
import assert from 'node:assert/strict';
import {auditCrossVersionOverlap} from './audit-atlas-cross-version-overlap.mjs';
const h='a'.repeat(64),k='b'.repeat(64);
const model=(id,fma,els)=>({id,fmaId:fma,bpId:'BP1',frame:'native-official-OBJ',approvedForDistribution:false,sourceElements:els});
const ref=(fj,fma,sha)=>({fj,fmaId:fma,name:'Fixture',rawSHA256:sha,approvedForDistribution:false,registrationValidated:false});
test('distinguish reused identifier, FMA concept and identical raw source bytes',()=>{
 const report=auditCrossVersionOverlap([model('a','FMA1',[{id:'FJ1',sha256:h}])],[ref('FJ1','FMA2',k),ref('FJ2','FMA1',k),ref('FJ3','FMA3',h),ref('FJ4','FMA4',k)]);
 assert.deepEqual(report.rows.map(x=>x.status),['SOURCE_ID_OVERLAP','CONCEPT_OVERLAP','EXACT_RAW_BYTES_IN_LOCAL_PACK','NO_MATCH_IN_LOCAL_INDEX']);
 assert.equal(report.registrationValidated,false);assert.equal(report.publicRelease,'NO_GO');
});
test('missing raw digests cannot prove new geometry; reject duplicate references',()=>{
 const body=[model('a','FMA1',[{id:'FJ1'}])],r=ref('FJ2','FMA2',k);
 assert.equal(auditCrossVersionOverlap(body,[r]).rows[0].status,'INCOMPLETE_LOCAL_RAW_DIGEST_INDEX');
 assert.throws(()=>auditCrossVersionOverlap(body,[r,r]));
});
