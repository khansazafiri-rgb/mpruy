import test from 'node:test';
import assert from 'node:assert/strict';
import {guidedTracks,guidedProgress} from '../src/guided-state.js';
const a={id:'bp-'+'a'.repeat(24),name:'Left lung',fmaId:'FMA1',group:'respiratory',approvedForDistribution:false};
const b={id:'sel-'+'b'.repeat(24),name:'Right lung',fmaId:'FMA2',group:'respiratory',selectionOnly:true,approvedForDistribution:false};
const rep=(e,type)=>({id:e.id,name:e.name,group:e.group,type});
const row=(e,type)=>({group:e.group,target:e.name,fmaId:e.fmaId,status:type,representations:[rep(e,type)]});
const rows=[row(a,'BODY_MODEL'),row(b,'EXACT_ELEMENT_SELECTION'),{group:'respiratory',target:'Pleura',status:'NOT_FOUND_BY_EXACT_CHECK',fmaId:null,representations:[]}];
const doc=rows=>({schema:1,publicRelease:'NO_GO',clinicalValidation:false,registrationValidated:false,rows,targets:rows.length});
test('guided steps include unavailable checkpoints but only available exact IDs count as opened',()=>{
 const [t]=guidedTracks(doc(rows),[a,b],{respiratory:'Respiratory'});
 assert.deepEqual(t.steps.map(s=>s.representations.length),[1,1,0]);
 assert.deepEqual(guidedProgress(t,new Set([t.steps[0].key,t.steps[2].key])),{total:3,available:2,visited:1,held:1});
});
test('never accept source ID with wrong identity, classification or release flag',()=>{
 const [t]=guidedTracks(doc(rows),[{...a,fmaId:'FMA9'},{...b,approvedForDistribution:true}],{respiratory:'Respiratory'});
 assert.equal(guidedProgress(t,new Set()).available,0);
 assert.throws(()=>guidedTracks({...doc(rows),publicRelease:'GO'},[a,b],{respiratory:'Respiratory'}));
 assert.throws(()=>guidedTracks(doc([rows[0],rows[0]]),[a,b],{respiratory:'Respiratory'}));
});

test('guided allows only explicit cross-system identity links, not arbitrary reassignment',()=>{const x={...a,name:'Thyroid cartilage',fmaId:'FMA55099',group:'skeletal'},r={...row(x,'BODY_MODEL'),group:'respiratory'};const [track]=guidedTracks(doc([r]),[x],{respiratory:'Respiratory'});assert.equal(track.steps[0].representations.length,1);const [bad]=guidedTracks(doc([{...r,group:'heart'}]),[x],{heart:'Heart'});assert.equal(bad.steps[0].representations.length,0);});

test('single reference element is separately accessible but never counts as completed structure',()=>{const e={id:'bp43-'+'c'.repeat(24),name:'Left median nerve',fmaId:'FMA37068',fj:'FJ4224',scope:'SINGLE_SOURCE_ELEMENT',approvedForDistribution:false,registrationValidated:false,clinicalValidation:false};const r={group:'nervous',target:'left median nerve',status:'NOT_FOUND_BY_EXACT_CHECK',representations:[],referenceCandidates:[{id:e.id,name:e.name,fmaId:e.fmaId,fj:e.fj,type:'BP43_SINGLE_SOURCE_ELEMENT'}]};const [track]=guidedTracks(doc([r]),[],{nervous:'Nervous'},[e]);assert.equal(track.steps[0].references.length,1);assert.equal(guidedProgress(track,new Set([track.steps[0].key])).available,0);assert.equal(guidedTracks(doc([r]),[],{nervous:'Nervous'},[{...e,fj:'FJ999'}])[0].steps[0].references.length,0);});
