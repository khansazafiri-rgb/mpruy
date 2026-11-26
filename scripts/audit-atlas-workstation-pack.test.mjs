import test from 'node:test';import assert from 'node:assert/strict';import {summarizeVerifiedBody,auditWorkstation,workstationProfile} from './audit-atlas-workstation-pack.mjs';
const h='a'.repeat(64),body=[{id:'a',fmaId:'FMA1',bpId:'BP1',group:'skeletal',frame:'native-official-OBJ',approvedForDistribution:false,sourceElements:[{id:'FJ1',sha256:h}]},{id:'b',fmaId:'FMA2',bpId:'BP2',group:'visceral',frame:'native-official-OBJ',approvedForDistribution:false,sourceElements:[{id:'FJ2'}]}],ref=(fj,fma,rawSHA256)=>({fj,fmaId:fma,name:'fixture',rawSHA256,approvedForDistribution:false,registrationValidated:false});
test('aggregate body inventory counts and exact bytes separately; incomplete raw index never claims absence',()=>{const r=summarizeVerifiedBody(body,[{regions:['whole']},{regions:['whole','thorax'],layer:1}],[ref('FJ1','FMA1',h),ref('FJ9','FMA2','b'.repeat(64)),ref('FJ8','FMA8','c'.repeat(64))],[]);assert.equal(r.bodyModels,2);assert.equal(r.bodyRawDigestOccurrences,1);assert.equal(r.localRawDigestIndexComplete,false);assert.equal(r.overlapCounts.localExactRawByteMatches,1);assert.equal(r.localReferenceConceptMatches,2);assert.equal(r.displayMetadata.nonWholeRegionAssigned,1);assert.equal(r.displayMetadata.integerLayerAssigned,1);assert.equal(r.fullHumanCompletenessClaim,false);assert.equal(r.publicRelease,'NO_GO');});
test('deny unsafe pack selection and public body entries',async()=>{await assert.rejects(auditWorkstation('../outside'));assert.throws(()=>summarizeVerifiedBody([{...body[0],approvedForDistribution:true}],[{}],[],[]));assert.throws(()=>summarizeVerifiedBody(body,[{}],[],[]));});

test('separate exact bytes from conflicting anatomical identities and incomplete indices',()=>{
 const other={...body[1],sourceElements:[{id:'FJ1',sha256:h}]};
 const r=summarizeVerifiedBody([body[0],other],[{regions:['whole']},{regions:['whole']}],[ref('FJ1','FMA1',h),ref('FJ1a','FMA3',h),ref('FJ9','FMA9','b'.repeat(64)),ref('FJ10','FMA9','c'.repeat(64))],[]);
 assert.equal(r.identityEvidence.exactRawSameFMA,1);
 assert.equal(r.identityEvidence.exactRawSameFMAAndFJ,1);
 assert.equal(r.identityEvidence.exactRawDifferentFMA,2);
 assert.equal(r.identityEvidence.exactRawDifferentFMAOnly,1);
 assert.equal(r.identityEvidence.reusedFJDifferentFMA,1);
 assert.equal(r.identityEvidence.referenceConceptsNotInBodyIndex,2);
 assert.equal(r.identityEvidence.referenceElementsWithoutAnyMatch,2);
 assert.equal(r.identityEvidence.referenceElementsUnresolvedRawIndex,0);
 assert.equal(r.displayMetadata.wholeOnly,2);assert.equal(r.displayMetadata.withoutLayer,2);
 assert.equal(r.registrationValidated,false);assert.equal(r.publicRelease,'NO_GO');
});
test('unknown raw coverage stays unresolved rather than net-new',()=>{
 const r=summarizeVerifiedBody(body,[{regions:['whole']},{regions:['whole']}],[ref('FJ9','FMA9','b'.repeat(64))],[]);
 assert.equal(r.identityEvidence.referenceElementsWithoutAnyMatch,0);
 assert.equal(r.identityEvidence.referenceElementsUnresolvedRawIndex,1);
});

test('explicit read-only workstation profiles match the retained evidence inventory',()=>{assert.deepEqual(workstationProfile(),{includeHyoid:false,includeExpansion:false,expectedElements:246,expectedConcepts:239});assert.equal(workstationProfile(['--include-hyoid']).expectedElements,248);assert.deepEqual(workstationProfile(['--include-expansion']),{includeHyoid:true,includeExpansion:true,expectedElements:376,expectedConcepts:368});assert.throws(()=>workstationProfile(['--unknown']));assert.throws(()=>workstationProfile(['--include-expansion','--include-expansion']));});
