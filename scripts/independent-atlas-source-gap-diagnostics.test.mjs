import test from 'node:test';
import assert from 'node:assert/strict';
import {diagnoseSourceGaps} from './independent-atlas-source-gap-diagnostics.mjs';
test('gap diagnosis does not promote incomplete, reordered, wrong-side or conflicting pinned labels',()=>{
 const names=['muscle of left arm','right knee joint','left ankle joint','left testis','left testis'];
 const source={tree:'isa',names:names.map((name,i)=>({name,fmaId:'FMA'+(i+1),bpId:'BP'+(i+1)})),elements:new Map([['FMA1',['FJ1']],['FMA2',['FJ2']],['FMA3',['FJ3','FJ4']],['FMA4',['FJ5']],['FMA5',['FJ6']]]),archiveIndex:new Map(['FJ1','FJ2','FJ3','FJ5','FJ6'].map(x=>[x,x+'.obj']))};
 const specs=[['muscular',['left arm muscle of']],['joints',['left knee joint']],['joints',['left ankle joint']],['reproductive',['left testis']],['joints',['left knee joint'],'FMA2'],['joints',['right knee joint']]];
 const result=diagnoseSourceGaps([source],specs,specs.map((_,i)=>({status:i===5?'EXPORT_CANDIDATE':'NOT_FOUND_BY_EXACT_CHECK'})));
 assert.deepEqual(result.map(r=>r.status),['TOKEN_ORDER_REVIEW','NO_MATCH_IN_CHECKED_TABLES','EXACT_LABEL_INCOMPLETE_MESH','AMBIGUOUS_COMPLETE_IDENTITY','PINNED_LABEL_MISMATCH']);
 assert(result.every(r=>r.autoExport===false));assert.equal(result[2].candidates[0].missingElementCount,1);
});

test('format-only discovery preserves side and vertebral level and does not export',()=>{const s={tree:'isa',names:[{name:'Femoral nerve.l',fmaId:'FMA1',bpId:'BP1'},{name:'Intervertebral disk of fourth lumbar vertebra',fmaId:'FMA2',bpId:'BP2'}],elements:new Map([['FMA1',['FJ1']],['FMA2',['FJ2']]]),archiveIndex:new Map([['FJ1','FJ1.obj'],['FJ2','FJ2.obj']])};const specs=[['nervous',['left femoral nerve']],['nervous',['right femoral nerve']],['joints',['intervertebral disc of fourth lumbar vertebra']],['joints',['intervertebral disc of fifth lumbar vertebra']]];const r=diagnoseSourceGaps([s],specs,specs.map(()=>({status:'NOT_FOUND_BY_EXACT_CHECK'})));assert.deepEqual(r.map(x=>x.status),['FORMAT_ONLY_REVIEW','NO_MATCH_IN_CHECKED_TABLES','FORMAT_ONLY_REVIEW','NO_MATCH_IN_CHECKED_TABLES']);assert(r.every(x=>!x.autoExport));});
