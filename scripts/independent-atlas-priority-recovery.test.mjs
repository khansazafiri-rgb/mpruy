import test from 'node:test';
import assert from 'node:assert/strict';
import {priorityPlan,broadRecoveryPlan} from './independent-atlas-priority-recovery.mjs';
const make=(tree,names,elementMap,files)=>({tree,names,elements:new Map(Object.entries(elementMap).map(([k,v])=>[k,new Set(v)])),archiveIndex:new Map(files.map(x=>[x,x+'.obj']))});
test('uses exact named identity and pinned tree, never a substring or wrong FMA',()=>{
 const names=[{fmaId:'FMA26661',bpId:'BP1',name:'right bronchial tree'},{fmaId:'FMA2',bpId:'BP2',name:'bronchial branch of arch of aorta'}];
 const source=make('partof',names,{FMA26661:['FJ1'],FMA2:['FJ2']},['FJ1','FJ2']);
 const rows=priorityPlan([source],[['respiratory',['right bronchial tree'],'FMA26661','partof'],['respiratory',['right bronchial tree'],'FMA2','partof'],['respiratory',['bronchial tree']],['respiratory',['right bronchial tree'],'FMA26661','isa']]);
 assert.equal(rows[0].status,'EXPORT_CANDIDATE');assert.deepEqual(rows[0].elementIds,['FJ1']);
 assert(rows.slice(1).every(r=>r.status==='NOT_FOUND_BY_EXACT_CHECK'));
});
test('holds incomplete source sets and ambiguous anatomical identities',()=>{
 const names=[{fmaId:'FMA1',bpId:'BP1',name:'brain'},{fmaId:'FMA2',bpId:'BP2',name:'brain'},{fmaId:'FMA3',bpId:'BP3',name:'spinal cord'}];
 const source=make('isa',names,{FMA1:['FJ1'],FMA2:['FJ2'],FMA3:['FJ3','FJ4']},['FJ1','FJ2','FJ3']);
 const [a,b]=priorityPlan([source],[['nervous',['brain']],['nervous',['spinal cord']]]);
 assert.equal(a.status,'AMBIGUOUS_SOURCE');assert.equal(b.status,'NOT_FOUND_BY_EXACT_CHECK');
});
test('does not collapse different FMA concepts across source trees',()=>{
 const a=make('isa',[{fmaId:'FMA1',bpId:'BP1',name:'left lung'}],{FMA1:['FJ1']},['FJ1']);
 const b=make('partof',[{fmaId:'FMA2',bpId:'BP2',name:'left lung'}],{FMA2:['FJ2']},['FJ2']);
 assert.equal(priorityPlan([a,b],[['respiratory',['left lung']]])[0].status,'AMBIGUOUS_SOURCE');
});

test('broad recovery skips existing FMA and priority FMA, rejects conflicting identities',()=>{
 const names=[{fmaId:'FMA1',bpId:'BP1',name:'left femur'},{fmaId:'FMA2',bpId:'BP2',name:'right femur'},{fmaId:'FMA3',bpId:'BP3',name:'left sciatic nerve'},{fmaId:'FMA4',bpId:'BP4',name:'right lung'},{fmaId:'FMA5',bpId:'BP5',name:'unclassified thing'}];
 const a=make('isa',names,{FMA1:['FJ1'],FMA2:['FJ2'],FMA3:['FJ3'],FMA4:['FJ4'],FMA5:['FJ5']},['FJ1','FJ2','FJ3','FJ4','FJ5']);
 const b=make('partof',[{fmaId:'FMA3',bpId:'BP3',name:'left femur'}],{FMA3:['FJ6']},['FJ6']);
 const rows=broadRecoveryPlan([a,b],[{fmaId:'FMA1'}],[{fmaId:'FMA2',status:'EXPORT_CANDIDATE'}]);
 assert.deepEqual(rows.map(x=>x.fmaId),['FMA4']);
 assert.equal(rows[0].group,'respiratory');
});

import {learningPriorityTargets} from './atlas-learning-priority-targets.mjs';
test('learning checkpoints explicitly cover all 13 systems and bilateral nerve, joint and renal targets',()=>{
 const groups=new Set(learningPriorityTargets.map(([g])=>g));
 assert.equal(groups.size,13);
 const keys=learningPriorityTargets.map(([g,n])=>g+':'+n[0]);
 assert.equal(new Set(keys).size,keys.length);
 for(const side of ['left','right'])for(const [g,n] of [['nervous','median nerve'],['urinary','renal cortex'],['joints','knee joint']])assert(keys.includes(g+':'+side+' '+n));
 assert(keys.includes('lymphatic:lymphatic vessel'));assert(keys.includes('respiratory:visceral pleura'));
});
