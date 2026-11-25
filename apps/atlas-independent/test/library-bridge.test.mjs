import test from 'node:test';
import assert from 'node:assert/strict';
import {OPEN,RESULT,validOpen,validResult,deepLink,openKnownStructure} from '../src/library-bridge.js';
const origin='http://127.0.0.1:4186',parent={},self={},frame={},id='bp-'+'a'.repeat(24),requestId='test-request-1';
const command={type:OPEN,version:1,structureId:id,requestId};
test('only exact independent IDs and safe deep links',()=>{
 assert.equal(deepLink('?structure='+id),id);
 assert.equal(deepLink('?utm_source=chatgpt.com'),'');
 assert.equal(deepLink('?structure=Humerus.r'),null);
 assert.equal(deepLink('?structure='+id+'&structure='+id),null);
 assert.equal(deepLink('?structure='+id,'#atlas=x'),null);
 assert.equal(deepLink('?landmarks=1'),null);
});
test('require same origin, parent/frame identity, version and matching request',()=>{
 const e={origin,source:parent,data:command};
 assert(validOpen(e,origin,parent,self));
 assert(!validOpen({...e,source:{}},origin,parent,self));
 assert(!validOpen({...e,origin:'https://other.invalid'},origin,parent,self));
 assert(!validOpen({...e,data:{...command,mode:'find'}},origin,parent,self));
 assert(!validOpen({...e,data:{...command,structureId:'Humerus.r'}},origin,parent,self));
 const reply={origin,source:frame,data:{...command,type:RESULT,ok:true,message:'Visible'}};
 assert(validResult(reply,origin,frame,requestId,id));
 assert(!validResult(reply,origin,frame,'wrong-request',id));
 assert(!validResult(reply,origin,{},requestId,id));
});
test('success requires actual visible highlighted mesh; missing or failed entries never succeed',async()=>{
 const e={id},lookup=k=>k===id?e:undefined;
 let selected=false;
 assert.equal((await openKnownStructure(command,lookup,async()=>{selected=true;return true;},()=>selected)).ok,true);
 assert.equal((await openKnownStructure(command,lookup,async()=>true,()=>false)).ok,false);
 assert.equal((await openKnownStructure(command,lookup,async()=>false,()=>true)).ok,false);
 assert.equal((await openKnownStructure({...command,structureId:'bp-'+'b'.repeat(24)},lookup,async()=>{throw Error('must not load');},()=>true)).ok,false);
});
