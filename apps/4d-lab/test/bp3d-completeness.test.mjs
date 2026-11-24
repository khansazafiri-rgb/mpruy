import test from 'node:test';
import assert from 'node:assert/strict';
import {auditCompleteness,structureCsv} from '../tools/audit-bp3d-completeness.mjs';
const catalog={
 'Femur.l':{source:'skeletal',group:'skeletal',regions:['lowerLimb']},
 'Sternum':{source:'skeletal',group:'skeletal',regions:['thorax']},
 'Nasal bone.l':{source:'skeletal',group:'skeletal',regions:['headNeck']},
 'Liver':{source:'visceral',group:'digestive',regions:['abdomen']}
};
const officialRows=[
 {name:'left femur',fmaId:'FMA1',bpId:'BP1'},
 {name:'sternum',fmaId:'FMA2',bpId:'BP2'},
 {name:'left nasal bone with different terminology',fmaId:'FMA3',bpId:'BP3'},
 {name:'unlinked organ',fmaId:'FMA4',bpId:'BP4'}
];
const elementIndex=new Map([
 ['FMA1',new Set(['FJ1'])],['FMA2',new Set(['FJ2'])],
 ['FMA3',new Set(['FJ3'])],['FMA4',new Set(['FJ4'])]
]);
const manifest={approvedForCommercialDistribution:false,geometryRegisteredToMEDCOEL:false,
 converted:[{name:'Femur.l',id:'femur-1',fmaId:'FMA1',bpId:'BP1',modelPath:'./structures/femur-1/model.glb'}]};
const archiveFiles=['FJ1.obj','FJ2.obj','FJ3.obj','FJ4.obj'];
function build(extra={}){
 return auditCompleteness({catalog,officialRows,elementIndex,archiveFiles,inventory:manifest,
 mappingReview:{queue:[{name:'Nasal bone.l',suggestions:[{officialName:'left nasal bone with different terminology',
   fmaId:'FMA3',bpId:'BP3',confidence:'low-review',sourceElementIds:['FJ3'],warnings:['different-terminology'],approved:false}]}]},
 ...extra});
}
test('full audit covers EVERY catalog item across systems, groups and regions',()=>{
 const r=build();
 assert.equal(r.structures.length,4);
 assert.equal(r.summary.converted,1);
 assert.equal(r.summary.missing,3);
 assert.equal(r.summary.exactNameNotConverted,1);
 assert.equal(r.summary.unmatched,2);
 assert.equal(r.systems.skeletal.catalog,3);
 assert.equal(r.systems.skeletal.converted,1);
 assert.equal(r.groups.digestive.catalog,1);
 assert.equal(r.regions.thorax.catalog,1);
 assert.equal(r.structures.find(x=>x.name==='Sternum').status,'exactNotConverted');
 assert.equal(r.summary.geometryAnatomyValidated,0);
 assert.equal(r.summary.commercialReleaseApproved,0);
 assert.deepEqual(r.errors,[]);
 assert.equal(structureCsv(r).trim().split('\n').length,5);
});
test('unlinked official FMA/BP/FJ assets and fuzzy candidate are never auto-promoted',()=>{
 const r=build();
 const nose=r.structures.find(x=>x.name==='Nasal bone.l');
 assert.equal(nose.status,'unmatched');
 assert.equal(nose.suggestedIdentity.approved,false);
 assert.equal(nose.distributionApproved,false);
 assert.equal(r.unlinkedOfficial.some(x=>x.fmaId==='FMA3'),true);
 assert.equal(r.unlinkedOfficial.some(x=>x.fmaId==='FMA4'),true);
});
test('rejects an unsafe, duplicated or non-quarantined inventory',()=>{
 assert.throws(()=>build({inventory:{...manifest,approvedForCommercialDistribution:true}}),/rights-blocked/);
 assert.deepEqual(build({inventory:{...manifest,converted:[...manifest.converted,{...manifest.converted[0]}]}}).errors.filter(x=>x.includes('duplicate')).length,1);
 assert.ok(build({inventory:{...manifest,converted:[{...manifest.converted[0],modelPath:'../../etc/passwd'}]}}).errors.some(x=>x.includes('invalid model')));
});

test('a private provisional FMA/BP match is audited but never marked geometrically or medically validated',()=>{
 const names=[...officialRows,{name:'left nasal bone extension',fmaId:'FMA8',bpId:'BP8'}];
 const extra={name:'Nasal bone.l',id:'nasal-provisional',fmaId:'FMA8',bpId:'BP8',
   mappingMethod:'provisional-name-review-NOT-validated',
   modelPath:'./structures/nasal-provisional/model.glb'};
 const a=auditCompleteness({catalog,officialRows:names,elementIndex,archiveFiles,
   inventory:{...manifest,provisionalSource:true,converted:[...manifest.converted,extra]},
   mappingReview:{queue:[]}});
 assert.equal(a.summary.converted,2);
 assert.equal(a.summary.geometryAnatomyValidated,0);
 assert.equal(a.summary.commercialReleaseApproved,0);
 assert.equal(a.structures.find(x=>x.name==='Nasal bone.l').mappingMethod,
   'provisional-name-review-NOT-validated');
 assert.deepEqual(a.errors,[]);
 const b=auditCompleteness({catalog,officialRows:names,elementIndex,archiveFiles,
   inventory:{...manifest,provisionalSource:false,converted:[...manifest.converted,extra]},
   mappingReview:{queue:[]}});
 assert.ok(b.errors.some(x=>x.includes('source identity not corroborated')));
});

test('provisional mapping cannot assert the wrong anatomy even with real FMA/BP identifiers',()=>{
 const falseNames=[...officialRows,{name:'right femur',fmaId:'FMA8',bpId:'BP8'}];
 const extra={name:'Nasal bone.l',id:'nasal-provisional',fmaId:'FMA8',bpId:'BP8',
   mappingMethod:'provisional-name-review-NOT-validated',
   modelPath:'./structures/nasal-provisional/model.glb'};
 const result=auditCompleteness({catalog,officialRows:falseNames,elementIndex,archiveFiles,
   inventory:{...manifest,provisionalSource:true,converted:[...manifest.converted,extra]},
   mappingReview:{queue:[]}});
 assert.ok(result.errors.some(x=>x.includes('source identity not corroborated')));
});
