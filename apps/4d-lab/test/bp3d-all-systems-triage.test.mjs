import test from 'node:test';
import assert from 'node:assert/strict';
import {buildAllSystemsTriage,triageCsv,geometryCsv,unapprovedTemplate,semanticSourceFlags} from '../tools/bp3d-all-systems-triage.mjs';

const zipSha='a'.repeat(64);
const structures=[
  {name:'Femur.l',system:'skeletal',group:'skeletal',regions:['lowerLimb'],status:'converted',
    fmaId:'FMA1',bpId:'BP1',geometryFlags:['thin-or-planar-element'],triangles:1234,sourceMeshCount:1},
  {name:'Costal cartilage.l',system:'skeletal',group:'skeletal',regions:['thorax'],status:'unmatched'},
  {name:'Nose sample.l',system:'skeletal',group:'skeletal',regions:['headNeck'],status:'unmatched'},
  {name:'Unknown organ',system:'visceral',group:'digestive',regions:['abdomen'],status:'unmatched'},
  {name:'Liver variant',system:'visceral',group:'digestive',regions:['abdomen'],status:'unmatched'}
];
const candidate=(name,fmaId,bpId,extra={})=>({
  officialName:name,fmaId,bpId,sourceElementIds:['FJ1'],missingElements:[],
  similarity:0.9,confidence:'high-review',warnings:[],approved:false,...extra
});
const mappingReview={queue:[
 {name:'Costal cartilage.l',suggestions:[candidate('left costal cartilage','FMA2','BP2')]},
 {name:'Nose sample.l',suggestions:[candidate('left nose sample','FMA1','BP1')]},
 {name:'Unknown organ',suggestions:[]},
 {name:'Liver variant',suggestions:[candidate('liver','FMA4','BP4',{confidence:'medium-review',similarity:0.7})]}
]};
const audit={structures};
test('triage accounts for every Atlas structure and keeps converted flagged geometry separate',()=>{
 const t=buildAllSystemsTriage(audit,mappingReview);
 assert.equal(t.summary.totalAtlasStructures,5);
 assert.equal(t.summary.existingConverted,1);
 assert.equal(t.summary.unmapped,4);
 assert.equal(t.summary.sourceGeometryFlagged,1);
 assert.equal(t.summary.addedModels,0);
 assert.equal(t.summary.suggestedIdentitiesApproved,0);
 assert.equal(t.summary.distributionApproved,0);
 assert.equal(t.queue.find(x=>x.atlasName==='Costal cartilage.l').tier,'TERMINOLOGY_EQUIVALENT_REVIEW');
 assert.equal(t.queue.find(x=>x.atlasName==='Nose sample.l').tier,'IDENTITY_COLLISION_REVIEW');
 assert.equal(t.queue.find(x=>x.atlasName==='Unknown organ').tier,'NO_PUBLISHER_CANDIDATE');
 assert.equal(t.queue.find(x=>x.atlasName==='Liver variant').tier,'PROMISING_IDENTITY_REVIEW');
 assert.equal(t.bySystem.skeletal.total,2);
 assert.equal(t.bySystem.visceral.total,2);
 assert.equal(triageCsv(t).trim().split('\n').length,5);
 assert.equal(geometryCsv(t).trim().split('\n').length,2);
});
test('unapproved template remains invalid for the guarded conversion pipeline',()=>{
 const t=buildAllSystemsTriage(audit,mappingReview);
 const draft=unapprovedTemplate(t,zipSha);
 assert.equal(draft.entries.length,1);
 assert.equal(draft.entries[0].atlasName,'Costal cartilage.l');
 assert.equal(draft.entries[0].reviewedSourceIdentity,false);
 assert.equal(draft.entries[0].approvedForDistribution,false);
 assert.equal(draft.entries[0].reviewer,'');
 assert.equal(draft.entries[0].identityEvidence,'');
 assert.throws(()=>unapprovedTemplate(t,'bogus'),/SHA256/);
});
test('ambiguous and geometry-missing candidates cannot be promoted to terminology-equivalent tier',()=>{
 const mr={queue:[
  {name:'Costal cartilage.l',suggestions:[candidate('left costal cartilage','FMA2','BP2',
    {confidence:'ambiguous-review',warnings:['tied-best-match']})]},
  {name:'Liver variant',suggestions:[candidate('liver','FMA4','BP4',
    {sourceElementIds:[],warnings:['missing-source-geometry']})]}
 ]};
 const r=buildAllSystemsTriage(audit,mr);
 assert.equal(r.queue.find(x=>x.atlasName==='Costal cartilage.l').tier,'MANUAL_ANATOMICAL_REVIEW');
 assert.equal(r.queue.find(x=>x.atlasName==='Liver variant').tier,'SOURCE_GEOMETRY_MISSING');
 assert.equal(r.summary.suggestedIdentitiesApproved,0);
});
test('the same official representation suggested for two Atlas names is a collision',()=>{
 const expanded={structures:[...structures,
  {name:'Nose sample alternative.l',system:'skeletal',status:'unmatched'}]};
 const mr={queue:[...mappingReview.queue,
  {name:'Nose sample alternative.l',suggestions:[candidate('left nose sample','FMA1','BP1')]}]};
 const r=buildAllSystemsTriage(expanded,mr);
 assert.equal(r.queue.find(x=>x.atlasName==='Nose sample alternative.l').tier,'IDENTITY_COLLISION_REVIEW');
});

test('obvious wrong-name matches cannot enter the promising tier or lose evidence of mismatch',()=>{
  const palatine=semanticSourceFlags('Descending palatine artery.l','left descending genicular artery');
  assert.ok(palatine.includes('NO_SHARED_SPECIFIC_ANATOMICAL_ANCHOR'));
  assert.ok(semanticSourceFlags('Anterior semilunar leaflet of pulmonary valve','anterior leaflet of mitral valve')
    .includes('NO_SHARED_SPECIFIC_ANATOMICAL_ANCHOR'));
  assert.ok(semanticSourceFlags('Posterior tibiofibular ligament.l','left stylohyoid ligament')
    .includes('NO_SHARED_SPECIFIC_ANATOMICAL_ANCHOR'));
  assert.ok(semanticSourceFlags('Inferior pancreatic nodes','inferior pancreatic artery')
    .includes('EXPLICIT_ANATOMY_TYPE_MISMATCH'));
  assert.ok(semanticSourceFlags('Intermediate bronchus.r','right intermediate tendon')
    .includes('EXPLICIT_ANATOMY_TYPE_MISMATCH'));
  assert.ok(semanticSourceFlags('Costal cartilage of eighth rib.l','left eighth rib')
    .includes('CARTILAGE_NOT_RIB_BONE'));
  assert.ok(semanticSourceFlags('Left atrium','cavity of left atrium')
    .includes('SOURCE_SUBPART_NOT_WHOLE'));
  const fake={structures:[{name:'Descending palatine artery.l',system:'cardiovascular',
    group:'arterial',status:'unmatched'}]};
  const fakeReview={queue:[{name:'Descending palatine artery.l',suggestions:[{
    officialName:'left descending genicular artery',fmaId:'FMA9',bpId:'BP9',
    sourceElementIds:['FJ9'],missingElements:[],similarity:0.6,
    warnings:[],confidence:'medium-review',approved:false}]}]};
  const found=buildAllSystemsTriage(fake,fakeReview).queue[0];
  assert.equal(found.tier,'MANUAL_ANATOMICAL_REVIEW');
  assert.ok(found.candidate.warnings.includes('NO_SHARED_SPECIFIC_ANATOMICAL_ANCHOR'));
});
test('conservative guard does not reject actual reordered or suffix-variant anatomical terms',()=>{
  assert.deepEqual(semanticSourceFlags('Costal cartilage of seventh rib.l','left seventh costal cartilage'),[]);
  assert.deepEqual(semanticSourceFlags('Genicular veins.l','left genicular vein'),[]);
  assert.deepEqual(semanticSourceFlags('Manubrium of sternum','manubrium'),[]);
  assert.deepEqual(semanticSourceFlags('Sternocleidomastoid muscle.l','left sternocleidomastoid'),[]);
  assert.deepEqual(semanticSourceFlags('Inferior nasal concha bone.l','left inferior nasal concha'),[]);
  assert.deepEqual(semanticSourceFlags('Proper hepatic artery','hepatic artery proper'),[]);
});
