import test from 'node:test';
import assert from 'node:assert/strict';
import {learningCoverage} from './independent-atlas-learning-coverage.mjs';
const names=['left lung','right lung','trachea','left main bronchus','right main bronchus','thyroid gland','spleen','thymus'];
const source={tree:'isa',names:names.map((name,i)=>({name,fmaId:'FMA'+(i+1),bpId:'BP'+(i+1)})),elements:new Map(names.map((_,i)=>['FMA'+(i+1),new Set(['FJ'+(i+1)])])),archiveIndex:new Map(names.map((_,i)=>['FJ'+(i+1),'FJ'+(i+1)+'.obj']))};
const row=(n,group,extra={})=>({id:'model-'+n,name:names[n-1],fmaId:'FMA'+n,group,...extra});
test('coverage distinguishes body, exact selection, candidate context, isolated reference, held and absent',()=>{
 const r=learningCoverage({sources:[source],body:[row(1,'respiratory'),row(6,'digestive')],selection:[row(2,'respiratory')],recovery:[row(3,'respiratory',{contextCandidate:true}),row(4,'respiratory',{contextCandidate:false})],results:[{fmaId:'FMA5',status:'HOLD_EXPORT',reason:'budget'}],specs:[...names.slice(0,5).map(n=>['respiratory',[n]]),['endocrine',['thyroid gland']],['lymphatic',['spleen']],['lymphatic',['thoracic duct']]]});
 assert.deepEqual(r.rows.map(x=>x.status),['BODY_MODEL','EXACT_ELEMENT_SELECTION','NATIVE_CONTEXT_CANDIDATE','ISOLATED_REFERENCE','EXPORT_HELD','GROUP_REVIEW','SOURCE_AVAILABLE_NOT_EXPORTED','NOT_FOUND_BY_EXACT_CHECK']);
 assert.equal(r.systems.respiratory.targets,5);assert.equal(r.systems.lymphatic.unresolved.length,2);
 assert.equal(Object.keys(r.systems).length,13);assert.equal(r.lymphaticNetworkContinuity,'NOT_VERIFIED');assert.equal(r.publicRelease,'NO_GO');
});
test('merge literal synonyms and keep pinned source identity',()=>{
 const r=learningCoverage({sources:[source],body:[row(1,'respiratory')],specs:[['respiratory',['left pulmonary organ'],'FMA1'],['respiratory',['left pulmonary organ','left lung']]]});
 assert.equal(r.targets,1);assert.equal(r.rows[0].status,'BODY_MODEL');assert.equal(r.rows[0].fmaId,'FMA1');
 assert.throws(()=>learningCoverage({sources:[source],body:[],specs:[['respiratory',['left lung'],'FMA1'],['respiratory',['left lung'],'FMA2']]}));
});
