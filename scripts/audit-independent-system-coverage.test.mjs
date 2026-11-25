import test from 'node:test';
import assert from 'node:assert/strict';
import {discoverSystem} from './independent-anatomy-system-discovery.mjs';
import {systemCoverage} from './audit-independent-system-coverage.mjs';
test('all 13 systems have conservative discovery examples; conflicting labels stay unclassified',()=>{
 const examples={skeletal:'Left femur',muscular:'Biceps brachii muscle',joints:'Left knee joint',arterial:'Left femoral artery',venous:'Left femoral vein',heart:'Left ventricle',nervous:'Spinal cord',lymphatic:'Thoracic duct',respiratory:'Left lung',digestive:'Stomach',urinary:'Right kidney',reproductive:'Left ovary',endocrine:'Left adrenal gland'};
 for(const [g,n] of Object.entries(examples)){const r=discoverSystem(n);assert.equal(r?.group,g);assert.equal(r.clinicalValidation,false);}
 for(const n of ['Unclassified structure','Muscle and nerve','Branch of femoral artery','Nerve of artery','Fossa of femur','Part of kidney'])assert.equal(discoverSystem(n),null);
});
test('coverage counts body models separately from HRA; empty systems and nodal-only gaps stay visible',()=>{
 const body=[{id:'one',name:'Left femur',group:'skeletal',fmaId:'FMA1',sourceElements:[{id:'FJ1'}]},{id:'two',name:'Left kidney',group:'urinary',fmaId:'FMA2',sourceElements:[{id:'FJ2'}]},{id:'node',name:'Axillary lymph node',group:'lymphatic',fmaId:'FMA3',sourceElements:[{id:'FJ3'}]}];
 const r=systemCoverage(body,[{name:'heart'}],[{group:'urinary',status:'NO_EXACT_PUBLISHER_MATCH'}],[{targetId:'a',group:'urinary',status:'EXISTING_SOURCE_ALIAS_REVIEW'}]);
 assert.equal(Object.keys(r.systems).length,13);
 assert.equal(r.systemsWithBodyModels,3);assert.equal(r.hraReferences,1);
 assert.equal(r.systems.heart.bodyModels,0);assert(r.emptySystems.includes('heart'));
 assert.equal(r.systems.lymphatic.sourceLabelTypes.nodes,1);assert.equal(r.systems.lymphatic.sourceLabelTypes.vesselOrTrunk,0);
 assert.equal(r.systems.lymphatic.networkContinuity,'NOT_VERIFIED');
 assert.equal(r.systems.urinary.checkpointsFound,1);assert.equal(r.systems.urinary.aliasReviewCounts.EXISTING_SOURCE_ALIAS_REVIEW,1);
 assert.equal(r.clinicalValidation,false);assert.equal(r.publicRelease,'NO_GO');
});
