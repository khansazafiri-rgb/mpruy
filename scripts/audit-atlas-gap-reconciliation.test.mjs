import test from 'node:test';import assert from 'node:assert/strict';import {reconcile,format} from './audit-atlas-gap-reconciliation.mjs';
const e=(name,fmaId,group)=>({id:name,name,fmaId,group,approvedForDistribution:false});
const row=(target,group='nervous',fmaId=null)=>({target,group,fmaId,status:'NOT_FOUND_BY_EXACT_CHECK'});
test('never promote related trunks, opposite sides or isolated source elements',()=>{
 const rows=[row('left median nerve'),row('right median nerve'),row('vagus nerve'),row('thyroid cartilage','respiratory','FMA55099'),row('apical segment of right lung','respiratory'),row('left radial nerve')];
 const r=reconcile({rows,targets:rows.length,publicRelease:'NO_GO',clinicalValidation:false,registrationValidated:false},[e('thyroid cartilage','FMA55099','skeletal'),e('radial nerve.L','FMA4','nervous')],[],[e('right apical bronchopulmonary segment','FMA7338','respiratory')],[e('Left median nerve','FMA1'),e('Trunk of left vagus nerve','FMA2')]);
 assert.deepEqual(r.rows.map(x=>x.status),['BP43_EXACT_LABEL_ELEMENT_REVIEW','NO_MATCH_IN_CURRENT_INVENTORIES','RELATED_COMPONENT_ONLY','EXACT_FMA_CROSS_SYSTEM_LINK','PINNED_SYNONYM_REVIEW','LOCAL_FORMAT_MATCH_REVIEW']);
 assert.equal(r.baselineAvailable,0);assert.equal(r.unresolved,6);assert.equal(r.publicRelease,'NO_GO');assert.equal(format('radial nerve.R'),'right radial nerve');
});
