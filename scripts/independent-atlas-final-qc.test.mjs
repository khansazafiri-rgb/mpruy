import test from 'node:test';
import assert from 'node:assert/strict';
import {rawRequestPath,classifyIndependentPath} from './independent-atlas-routes.mjs';
import {referenceEntries,filterReferences,requestTracker} from '../apps/atlas-independent/src/reference-state.js';
import {validateReviewManifest} from './validate-independent-atlas-staging.mjs';
test('raw HTTP path rejects traversal before normalization and legacy routes stay denied',()=>{
 for(const p of ['/a/../b','/a/%2e%2e/b','//host/a','/a//b','/a\\b','/a%2fb','https://example.invalid/a','/a#b','/a\u0000'])assert.equal(rawRequestPath(p),null);
 assert.equal(rawRequestPath('/anatomy/viewer/?models=bp3d'),'/anatomy/viewer/');
 assert.equal(classifyIndependentPath('/anatomy/viewer/'),'independent');
 assert.equal(classifyIndependentPath('/anatomy/viewer'),'redirect');
 assert.equal(classifyIndependentPath('/anatomy/explore'),'host');
 for(const p of ['/anatomy/4d-lab/','/local-data/','/anatomy/viewer-old/'])assert.equal(classifyIndependentPath(p),'deny');
});
test('HRA remains independent with source version and private flags enforced',()=>{
 const e={id:'a'.repeat(24),name:'Kidney female left',version:'v1.3',source:'https://cdn.humanatlas.io/digital-objects/ref-organ/kidney-female-left/v1.3/assets/fixture.glb',approvedForDistribution:false,registrationValidated:false,meshCount:1};
 const doc={items:[e],publicRelease:'NO_GO',registrationValidated:false};
 assert.equal(referenceEntries(doc).length,1);
 assert.equal(filterReferences(doc.items,'kidney').length,1);
 assert.equal(filterReferences(doc.items,'lung').length,0);
 for(const x of [{version:'v1.2'},{approvedForDistribution:true},{registrationValidated:true},{source:'https://example.invalid/a.glb'}])assert.throws(()=>referenceEntries({...doc,items:[{...e,...x}]}));
 assert.throws(()=>referenceEntries({...doc,items:[e,e]}));
 const t=requestTracker(),a=t.begin(),b=t.begin();assert(!t.current(a));assert(t.current(b));t.cancel();assert(!t.current(b));
});
test('staging manifest rejects altered attribution, different coordinate frame and implicit approval',()=>{
 const id='za-'+'a'.repeat(24),sha='b'.repeat(64),e={id,name:'fixture',group:'skeletal',regions:['whole'],path:'models/'+id+'.glb',sha256:sha,approvedForDistribution:false};
 const inv={schema:1,mode:'private-review',publicRelease:'NO_GO',sourceFrame:'z-anatomy-world-y-up-metres',entries:[e]};
 const a={id,name:e.name,sha256:sha,license:'CC-BY-SA-4.0',rightsHolder:'fixture',attribution:'fixture',shareAlike:'fixture',changeDescription:'fixture',sourceURL:'https://example.invalid'};
 const att={schema:1,entries:[a]},rev={schema:1,publicRelease:'NO_GO',approvedBuild:false,selected:1,excluded:0,selectionSHA256:sha,sourceArchiveSHA256:sha};
 assert.equal(validateReviewManifest(inv,att,rev).length,1);
 assert.throws(()=>validateReviewManifest(inv,{...att,entries:[]},rev));
 assert.throws(()=>validateReviewManifest(inv,{...att,entries:[{...a,license:'CC-BY-NC-4.0'}]},rev));
 assert.throws(()=>validateReviewManifest(inv,{...att,entries:[{...a,sha256:'c'.repeat(64)}]},rev));
 assert.throws(()=>validateReviewManifest(inv,att,{...rev,approvedBuild:true}));
 assert.throws(()=>validateReviewManifest({...inv,sourceFrame:'different'},att,rev));
});
