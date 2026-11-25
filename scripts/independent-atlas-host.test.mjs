import test from 'node:test';
import assert from 'node:assert/strict';
import {hostRoute} from './independent-atlas-host.mjs';
import {STATUS,PING,validStatus,validPing} from '../apps/atlas-independent/src/host-protocol.js';
import {rawRequestPath,classifyIndependentPath} from './independent-atlas-routes.mjs';
test('main-web preview exposes only approved static host routes and explicit local fixtures',()=>{
 for(const p of ['/anatomy','/anatomy/explore','/anatomy/explore/'])assert.deepEqual(hostRoute(p),{kind:'file',rel:'index.html'});
 assert.deepEqual(hostRoute('/assets/example-a.js'),{kind:'file',rel:'assets/example-a.js'});
 assert.deepEqual(hostRoute('/api/medcoel/public-settings'),{kind:'fixture',path:'/api/medcoel/public-settings'});
 for(const p of ['/anatomy/viewer/','/anatomy/library','/anatomy/live','/anatomy/study','/anatomy/4d-lab/','/local-data/','/assets/../private.js','/assets/a.glb','/assets/a.json','/api/a?x=1'])assert.equal(hostRoute(p),null);
 assert.equal(classifyIndependentPath('/anatomy/viewer/'),'independent');
 assert.equal(rawRequestPath('/assets/%2e%2e/private.js'),null);
});
test('host readiness and ping require exact origin, actual frame and protocol version',()=>{
 const origin='http://127.0.0.1:4186',frame={},parent={};
 const d={type:STATUS,version:1,state:'interactive',message:'Initial model loaded'};
 const event={origin,source:frame,data:d};
 assert(validStatus(event,origin,frame));
 for(const patch of [{origin:'https://other.invalid'},{source:{}},{data:{...d,version:2}},{data:{...d,state:'approved'}},{data:{...d,message:'x'.repeat(241)}}])assert(!validStatus({...event,...patch},origin,frame));
 assert(!validStatus(event,origin,null));
 const ping={origin,source:parent,data:{type:PING,version:1}};
 assert(validPing(ping,origin,parent));assert(!validPing({...ping,source:{}},origin,parent));assert(!validPing({...ping,origin:'https://other.invalid'},origin,parent));
});
