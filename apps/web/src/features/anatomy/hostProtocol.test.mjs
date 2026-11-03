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
test('interactive reveals the viewer before background ready, while progress never regresses a usable state',async()=>{
 const {nextAtlasStatus}=await import('./hostProtocol.mjs');
 assert.equal(nextAtlasStatus('loading','medcoel:anatomy-interactive'),'interactive');assert.equal(nextAtlasStatus('interactive','medcoel:anatomy-loading'),'interactive');assert.equal(nextAtlasStatus('ready','medcoel:anatomy-interactive'),'ready');assert.equal(nextAtlasStatus('ready','medcoel:anatomy-error'),'error');
});
test('progress is accepted only from the exact frame/origin with bounded lifecycle-only data',()=>{
 const frame={},origin='https://medcoel.example',base={source:frame,origin,data:{type:'medcoel:anatomy-loading',version:1,progress:50,phase:'model'}};
 assert.equal(acceptsAtlasMessage(base,origin,frame),true);
 for(const event of [{...base,source:{}},{...base,origin:'https://foreign.example'},{...base,data:{...base.data,progress:NaN}},{...base,data:{...base.data,progress:200}},{...base,data:{...base.data,token:'private'}}])assert.equal(acceptsAtlasMessage(event,origin,frame),false);
});
test('viewer asset health distinguishes a missing static mount from a slow model',async()=>{
 const {checkViewerAsset}=await import('./hostProtocol.mjs');let method;
 await checkViewerAsset(async(path,options)=>{assert.equal(path,'/anatomy/viewer/');method=options.method;return new globalThis.Response('',{headers:{'content-type':'text/html'}});});assert.equal(method,'HEAD');
 await assert.rejects(checkViewerAsset(async()=>new globalThis.Response('',{status:404})),/HTTP 404/);
 await assert.rejects(checkViewerAsset(async()=>new globalThis.Response('{}',{headers:{'content-type':'application/json'}})),/tipe file/);
});

test('back link for the atlas survives structure ids with brackets and keeps the atlas hash',async()=>{
 const {withBackLink,atlasFrameSrc}=await import('./hostProtocol.mjs');
 const {structureHref}=await import('./registry.mjs');
 const src=withBackLink(ANATOMY_VIEWER_PATH,{path:structureHref('(Muscle variant).l'),label:'Detail struktur'});
 const params=new URL(src,'https://medcoel.example').searchParams;
 assert.match(params.get('back'),/^\/(anatomy|lab|beranda)(\/[\w%.\-/]*)?$/);
 assert.equal(decodeURIComponent(params.get('back').slice('/anatomy/structure/'.length)),'(Muscle variant).l');
 assert.equal(params.get('backLabel'),'Detail struktur');
 const withHash=withBackLink(atlasFrameSrc('#atlas=x'),{path:'/anatomy'});
 assert.equal(new URL(withHash,'https://medcoel.example').hash,'#atlas=x');
 assert.equal(withBackLink('/anatomy/viewer/',null),'/anatomy/viewer/');
});
