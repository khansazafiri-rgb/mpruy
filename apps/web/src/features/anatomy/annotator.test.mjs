import {test} from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {URL} from 'node:url';
import {PREFIX,acceptsAnnotatorCommand,acceptsAnnotationEvent} from './annotatorProtocol.mjs';
import {parseDocument,validateDocument,transitionLandmark} from './annotationSchema.mjs';
import {loadDraft,storeDraft,exportFilename,draftKey} from './annotationStorage.mjs';
import {acceptsAtlasMessage} from './hostProtocol.mjs';
const pilot=()=>JSON.parse(readFileSync(new URL('./pilot.json',import.meta.url),'utf8'));
test('annotation drafts round-trip versioned JSON and remain scoped to the account and source',()=>{
 const values=new Map(),storage={getItem:key=>values.get(key)||null,setItem:(key,v)=>values.set(key,v)};
 const d=pilot();storeDraft(storage,'admin',d);assert.deepEqual(loadDraft(storage,'admin',pilot()),d);assert.equal(exportFilename(d),'humerus.r.v1.rev-0.json');assert.notEqual(draftKey('admin'),draftKey('student'));assert.match(draftKey('admin'),/a874a3d/);
 values.set(draftKey('admin'),'{bad');assert.throws(()=>loadDraft(storage,'admin',pilot()));assert.throws(()=>storeDraft({setItem:()=>{throw Error('quota');}},'admin',d));
});
test('rejects invalid annotation JSON and never auto-verifies',()=>{
 const d=pilot();assert.equal(parseDocument(JSON.stringify(d)).landmarks.length,6);assert.throws(()=>parseDocument('{}'));d.spatialSource.sourceCommit='old';assert.throws(()=>validateDocument(d));assert.throws(()=>transitionLandmark(pilot().landmarks[0],'VERIFIED',{manual:false}));
});
test('annotator protocol rejects cross-origin, other frames, versions and unknown payloads',()=>{
 const frame={},self={},origin='https://medcoel.example',session='test-session-123',base={version:1,session,type:PREFIX+'enter',document:pilot()},event={origin,source:frame,data:base};
 assert.equal(acceptsAnnotatorCommand(event,origin,frame,self),true);
 for(const bad of [{...event,origin:'https://other.example'},{...event,source:{}},{...event,data:{...base,version:2}},{...event,data:{...base,type:'unknown'}},{...event,data:{...base,document:{}}}])assert.equal(acceptsAnnotatorCommand(bad,origin,frame,self),false);
 const change={origin,source:frame,data:{...base,type:'medcoel:anatomy-annotation-change'}};assert.equal(acceptsAnnotationEvent(change,origin,frame,session),true);assert.equal(acceptsAnnotationEvent(change,origin,frame,'old-session'),false);
});
test('existing ready and error messages are still accepted without annotator metadata',()=>{
 const frame={},origin='https://medcoel.example';for(const type of ['medcoel:anatomy-ready','medcoel:anatomy-error'])assert.equal(acceptsAtlasMessage({origin,source:frame,data:{type,version:1}},origin,frame),true);
});
test('admin anatomy route inherits existing admin role guard',()=>{
 const app=readFileSync(new URL('../../App.jsx',import.meta.url),'utf8'),layout=readFileSync(new URL('../../pages/admin/AdminLayout.jsx',import.meta.url),'utf8');
 assert.match(app,/<Route path="\/admin" element={<RequireAuth admin><AdminLayout/);assert.match(app,/<Route path="anatomy" element={<AnatomyAnnotator/);assert.match(layout,/to: '\/admin\/anatomy', label: 'Human Anatomy'/);
});
