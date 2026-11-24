import test from 'node:test';
import assert from 'node:assert/strict';
import {buildVisibleGapReview,visibleGapMarkdown,visibleGapCsv,FOCUS_AREAS} from '../tools/bp3d-visible-gap-review.mjs';
const mock=(name,system,regions,status='unmatched')=>({name,system,regions,status,
  geometryFlags:[],omittedZeroAreaTriangles:0});
test('focus report classifies all distinct digiti minimi types by HAND versus FOOT and preserves left/right',()=>{
 const names=[
   ['Abductor digiti minimi of hand.l','upperLimb','converted'],
   ['Abductor digiti minimi of hand.r','upperLimb','unmatched'],
   ['Flexor digiti minimi of hand.l','upperLimb','unmatched'],
   ['Flexor digiti minimi of hand.r','upperLimb','unmatched'],
   ['Opponens digiti minimi muscle of hand.l','upperLimb','unmatched'],
   ['Opponens digiti minimi muscle of hand.r','upperLimb','unmatched'],
   ['Extensor digiti minimi.l','upperLimb','unmatched'],
   ['Extensor digiti minimi.r','upperLimb','unmatched'],
   ['Abductor digiti minimi of foot.l','lowerLimb','unmatched'],
   ['Abductor digiti minimi of foot.r','lowerLimb','unmatched'],
   ['Flexor digiti minimi of foot.l','lowerLimb','unmatched'],
   ['Flexor digiti minimi of foot.r','lowerLimb','unmatched'],
   ['(Opponens digiti minimi muscle of foot).l','lowerLimb','unmatched'],
   ['(Opponens digiti minimi muscle of foot).r','lowerLimb','unmatched']
 ];
 const structures=names.map(([n,r,s])=>mock(n,'muscular',[r],s));
 const triage={queue:[{atlasName:'Abductor digiti minimi of hand.r',
   tier:'IDENTITY_COLLISION_REVIEW',candidate:{officialName:'unrelated source',
     fmaId:'FMA9',bpId:'BP9',warnings:['OFFICIAL_IDENTITY_USED_OR_SHARED']}}]};
 const out=buildVisibleGapReview({structures},triage);
 const hand=out.areas.find(x=>x.id==='digiti-minimi-hand');
 const foot=out.areas.find(x=>x.id==='digiti-minimi-foot');
 assert.deepEqual([hand.total,hand.withMesh,hand.missing],[8,1,7]);
 assert.deepEqual([foot.total,foot.withMesh,foot.missing],[6,0,6]);
 assert.equal(out.rows.length,14);
 assert.equal(out.rows.find(x=>x.atlasName==='Abductor digiti minimi of hand.r').reviewTier,'IDENTITY_COLLISION_REVIEW');
 assert.equal(out.rows.every(x=>!x.clinicallyValidated&&!x.commerciallyApproved),true);
 assert.match(visibleGapMarkdown(out),/Opponens digiti minimi muscle of foot/);
 assert.match(visibleGapCsv(out),/OFFICIAL_IDENTITY_USED_OR_SHARED/);
});
test('nasal bones, vertebral column, sternum and visceral remain separate without inventing source equivalents',()=>{
 const structures=[
  mock('Nasal bone.l','skeletal',['headNeck']),
  mock('Ethmoid bone','skeletal',['headNeck'],'converted'),
  mock('Vertebra C7','skeletal',['headNeck','back']),
  mock('Sacrum','skeletal',['pelvis']),
  mock('Manubrium of sternum','skeletal',['thorax']),
  mock('Body of sternum','skeletal',['thorax'],'converted'),
  mock('Stomach','visceral',['abdomen'],'converted'),
  mock('Duodenum','visceral',['abdomen'])
 ];
 const out=buildVisibleGapReview({structures},{queue:[]});
 const by=Object.fromEntries(out.areas.map(x=>[x.id,x]));
 assert.equal(by['nasal-skeleton'].missing,1);
 assert.equal(by['vertebral-skeleton'].total,2);
 assert.equal(by.sternum.missing,1);
 assert.equal(by.visceral.total,2);
 assert.equal(by.visceral.missing,1);
 assert.equal(out.releaseApproved,false);
 assert.equal(out.clinicalValidationCount,0);
 assert.ok(out.caveats.some(x=>x.includes('Do not backfill')));
});
test('empty areas are transparent about zero catalog structures, not claimed complete',()=>{
 const x=buildVisibleGapReview({structures:[]},{queue:[]});
 assert.equal(x.areas.length,FOCUS_AREAS.length);
 assert.ok(x.areas.every(a=>a.total===0 && a.coveragePercent===0));
 assert.throws(()=>buildVisibleGapReview({structures:[]},{}),/triage/);
});
