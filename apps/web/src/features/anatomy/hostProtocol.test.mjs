import {test} from 'node:test';import assert from 'node:assert/strict';
import {URL} from 'node:url';
import {acceptsAtlasMessage,ANATOMY_VIEWER_PATH} from './hostProtocol.mjs';
test('same-origin atlas protocol rejects foreign frames, origins and unknown messages',()=>{
 const frame={},origin='https://medcoel.example';const event={origin,source:frame,data:{type:'medcoel:anatomy-ready',version:1}};
 assert.equal(acceptsAtlasMessage(event,origin,frame),true);
 for(const bad of [{...event,origin:'https://elsewhere.example'},{...event,source:{}},{...event,data:{type:'arbitrary',version:1}},{...event,data:{type:'medcoel:anatomy-ready',version:2}}])assert.equal(acceptsAtlasMessage(bad,origin,frame),false);
 assert.equal(acceptsAtlasMessage(event,origin,null),false);assert.equal(ANATOMY_VIEWER_PATH,'/anatomy/viewer/');
});
test('forward only anatomy study state to the frame',async()=>{
 const {atlasFrameSrc}=await import('./hostProtocol.mjs');
 assert.equal(atlasFrameSrc('#other=private'),'/anatomy/viewer/');
 const state=JSON.stringify({settings:{region:'thorax'}});
 const result=atlasFrameSrc('#atlas='+encodeURIComponent(state)+'&unrelated=x');
 assert.equal(new URL(result,'https://medcoel.example').hash,'#atlas='+encodeURIComponent(state));
});
