import test from 'node:test';
import assert from 'node:assert/strict';
import {planBatchExpansion} from './expand-independent-source-review.mjs';
test('batch exports unique complete publisher concept only; no overlapping geometry or guessed system',()=>{
 const names=[['FMA1','BP1','Left femur'],['FMA2','BP2','Right femur'],['FMA3','BP3','Femoral structure'],['FMA4','BP4','Spinal cord'],['FMA5','BP5','Unclassified structure'],['FMA6','BP6','Missing element'],['FMA7','BP7','Thoracic duct'],['FMA7','BP8','Thoracic duct']].map(([fmaId,bpId,name])=>({fmaId,bpId,name}));
 const elements=new Map([['FMA1',new Set(['FJ1'])],['FMA2',new Set(['FJ2'])],['FMA3',new Set(['FJ1','FJ3'])],['FMA4',new Set(['FJ4'])],['FMA5',new Set(['FJ5'])],['FMA6',new Set(['FJ6'])],['FMA7',new Set(['FJ7'])]]);
 const source={tree:'isa',names,elements,archiveIndex:new Map(['FJ1','FJ2','FJ3','FJ4','FJ5','FJ7'].map(x=>[x,x+'.obj']))};
 const base=[{fmaId:'FMA1',sourceElements:[{id:'FJ1'}]}];
 const targets=[{name:'(Femur).r',group:'skeletal'},{name:'Femoral structure',group:'skeletal'},{name:'Spinal cord',group:'nervous'},{name:'Thoracic duct',group:'lymphatic'}];
 // Legacy classification is merely a discovery claim; conflicting groups must be held.
 const legacy=[{fmaId:'FMA2',bpId:'BP2',name:'Right femur',group:'skeletal'},{fmaId:'FMA4',bpId:'BP4',name:'Spinal cord',group:'muscular'}];
 const r=planBatchExpansion(base,targets,legacy,[source]);
 assert.deepEqual(r.counts,{PRESENT_FMA:1,CONFLICTING_SYSTEM_REVIEW:1,UNCLASSIFIED_SOURCE_CONCEPT:1,AMBIGUOUS_REPRESENTATION:1,EXPORT_CANDIDATE:1,OVERLAPPING_ELEMENT_REVIEW:1});
 assert.equal(r.rows.find(x=>x.status==='EXPORT_CANDIDATE').fmaId,'FMA2');
 assert.equal(r.rows.some(x=>x.fmaId==='FMA6'),false);
 assert.equal(r.publicRelease,'NO_GO');
});
