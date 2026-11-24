import test from 'node:test';
import assert from 'node:assert/strict';
import {selectProvisionalMappings} from '../tools/bp3d-provisional-mappings.mjs';
import {planBatch} from '../tools/batch-bp3d-candidates.mjs';

const existing=[{name:'Femur.l',fmaId:'FMA1',bpId:'BP1'}];
const officialRows=[
 {name:'left genicular vein',fmaId:'FMA2',bpId:'BP2'},
 {name:'sesamoid bone of left foot',fmaId:'FMA3',bpId:'BP3'},
 {name:'left anconeus',fmaId:'FMA4',bpId:'BP4'},
 {name:'left femur',fmaId:'FMA1',bpId:'BP1'},
 {name:'right genicular vein',fmaId:'FMA5',bpId:'BP5'}
];
const elements=new Map(officialRows.map((x,i)=>[x.fmaId,new Set(['FJ'+(i+1)])]));
const zipFiles=officialRows.map((x,i)=>'objects/FJ'+(i+1)+'.obj');
function candidate(name,system,tier,official,options={}){
 const [fmaId,bpId,officialName]=official;
 return {atlasName:name,system,tier,
  candidate:{fmaId,bpId,officialName,fjIds:[...elements.get(fmaId)],
    confidence:'high-review',score:1,warnings:[],approved:false,...options},
  medicalIdentityValidated:false,anatomyGeometryValidated:false,approvedForDistribution:false};
}
const samples=[
 candidate('Genicular veins.l','cardiovascular','TERMINOLOGY_EQUIVALENT_REVIEW',
   ['FMA2','BP2','left genicular vein']),
 candidate('Sesamoid bones of foot.l','skeletal','TERMINOLOGY_EQUIVALENT_REVIEW',
   ['FMA3','BP3','sesamoid bone of left foot']),
 candidate('Anconeus muscle.l','muscular','PROMISING_IDENTITY_REVIEW',
   ['FMA4','BP4','left anconeus'])
];
const input=(opts={})=>selectProvisionalMappings({
 triage:{status:'REVIEW_QUEUE_NOT_APPROVED',queue:samples},
 officialRows,elements,zipFiles,existing,...opts
});
test('private provisional model list starts with only unique unapproved official identity suggestions',()=>{
 const selected=input();
 assert.equal(selected.candidates.length,2);
 assert.equal(selected.summary.approved,0);
 assert.equal(selected.candidates[0].matches[0].sourceObjs[0].archivePath,'objects/FJ1.obj');
 assert.equal(selected.candidates[1].matches[0].sourceObjs[0].archivePath,'objects/FJ2.obj');
 for(const row of selected.candidates){
  assert.match(row.matchMethod,/NOT-validated/);
  assert.equal(row.geometryIdentityVerified,false);
  assert.equal(row.redistributionApproved,false);
 }
 const extended=input({includePromising:true});
 assert.equal(extended.candidates.length,3);
 const built=planBatch({candidates:extended.candidates});
 assert.equal(built.eligible.length,3);
 assert.equal(built.summary.publicReleaseApproved,0);
 assert.equal(input({limitNew:1,includePromising:true}).candidates.length,1);
});
test('candidate matching cannot bypass source warnings, laterality, FMA/BP identity, or FJ integrity',()=>{
 const invalid=[
  candidate('Genicular veins.l','cardiovascular','TERMINOLOGY_EQUIVALENT_REVIEW',
    ['FMA5','BP5','right genicular vein']),
  candidate('Right femur.r','skeletal','PROMISING_IDENTITY_REVIEW',
    ['FMA1','BP1','left femur']),
  candidate('Anconeus muscle.l','muscular','PROMISING_IDENTITY_REVIEW',
    ['FMA4','BP4','left anconeus'],{warnings:['NO_SHARED_SPECIFIC_ANATOMICAL_ANCHOR']}),
  candidate('Genicular veins.l','cardiovascular','PROMISING_IDENTITY_REVIEW',
    ['FMA2','BP2','left genicular vein'],{fjIds:['FJ999']}),
  candidate('Genicular veins.l','cardiovascular','PROMISING_IDENTITY_REVIEW',
    ['FMA2','BP2','left genicular vein'],{approved:true})
 ];
 const got=input({triage:{status:'REVIEW_QUEUE_NOT_APPROVED',queue:invalid},includePromising:true});
 assert.equal(got.candidates.length,0);
 assert.equal(got.rejected.length,5);
});
test('two Atlas parts cannot claim same official source representation in provisional preview',()=>{
 const a=candidate('Genicular veins.l','cardiovascular','PROMISING_IDENTITY_REVIEW',
   ['FMA2','BP2','left genicular vein']);
 const b=candidate('Genicular veins alternate.l','cardiovascular','PROMISING_IDENTITY_REVIEW',
   ['FMA2','BP2','left genicular vein']);
 const got=input({triage:{status:'REVIEW_QUEUE_NOT_APPROVED',queue:[a,b]},includePromising:true});
 assert.equal(got.candidates.length,1);
 assert.equal(got.rejected[0].reason,'identity-collision');
});
test('an invalid triage, changed FMA name or invalid budget cannot be silently converted',()=>{
 assert.throws(()=>input({limitNew:0}),/1..200/);
 assert.throws(()=>input({triage:{status:'APPROVED',queue:samples}}),/Unapproved/);
 const changed=candidate('Genicular veins.l','cardiovascular','TERMINOLOGY_EQUIVALENT_REVIEW',
    ['FMA2','BP2','some other artery']);
 assert.equal(input({triage:{status:'REVIEW_QUEUE_NOT_APPROVED',queue:[changed]}}).summary.provisionalSelected,0);
});
