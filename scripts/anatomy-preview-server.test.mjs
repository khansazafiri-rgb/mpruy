import {test} from 'node:test';import assert from 'node:assert/strict';import {mkdtemp,mkdir,writeFile,rm} from 'node:fs/promises';import os from 'node:os';import path from 'node:path';import {once} from 'node:events';
import {createPreviewServer} from './anatomy-preview-server.mjs';
test('same-origin host preserves direct routes, exact atlas asset MIME and asset 404',async t=>{
 const root=await mkdtemp(path.join(os.tmpdir(),'medcoel-route-'));const main=path.join(root,'main'),atlas=path.join(root,'atlas');
 await mkdir(path.join(main,'assets'),{recursive:true});await mkdir(path.join(atlas,'models'),{recursive:true});await mkdir(path.join(atlas,'draco'),{recursive:true});await mkdir(path.join(atlas,'assets'),{recursive:true});
 await writeFile(path.join(main,'index.html'),'MAIN SPA');await writeFile(path.join(main,'assets/main.js'),'MAIN JS');await writeFile(path.join(atlas,'index.html'),'ANATOMY');await writeFile(path.join(atlas,'models/body.glb'),Buffer.from([0x67,0x6c,0x54,0x46]));await writeFile(path.join(atlas,'draco/decoder.wasm'),Buffer.from([0,97,115,109]));await writeFile(path.join(atlas,'assets/style.css'),'body{}');
 const server=createPreviewServer({mainRoot:main,atlasRoot:atlas});server.listen(0,'127.0.0.1');await once(server,'listening');const base=`http://127.0.0.1:${server.address().port}`;
 t.after(async()=>{await new Promise(r=>server.close(r));await rm(root,{recursive:true,force:true});});
 for(const route of ['/anatomy','/anatomy/','/lab','/anatomy/library','/anatomy/structure/Humerus.r','/anatomy/structure/Ulna.r','/anatomy/structure/Unknown.r','/anatomy/region/upperLimb','/anatomy/system/skeletal','/anatomy/study','/anatomy/explore?structure=Ulna.r']){const res=await fetch(base+route);assert.equal(res.status,200);assert.equal(await res.text(),'MAIN SPA');}
 const viewer=await fetch(base+'/anatomy/viewer/');assert.equal(await viewer.text(),'ANATOMY');assert.equal(viewer.headers.get('x-frame-options'),'SAMEORIGIN');assert.equal(viewer.headers.get('content-security-policy'),"frame-ancestors 'self'");
 for(const [route,type] of [['models/body.glb','model/gltf-binary'],['draco/decoder.wasm','application/wasm'],['assets/style.css','text/css']]){const res=await fetch(base+'/anatomy/viewer/'+route);assert.equal(res.status,200);assert.ok(res.headers.get('content-type').startsWith(type));}
 for(const route of ['/anatomy/viewer/models/absent.glb','/anatomy/viewer/assets/absent.js','/assets/absent.js']){const res=await fetch(base+route);assert.equal(res.status,404);assert.ok(!(await res.text()).includes('MAIN SPA'));}
 const redirect=await fetch(base+'/anatomy/viewer',{redirect:'manual'});assert.equal(redirect.status,308);assert.equal(redirect.headers.get('location'),'/anatomy/viewer/');
 assert.equal((await fetch(base+'/api/medcoel/lab/catalog',{method:'POST'})).status,405);
 assert.equal((await fetch(base+'/api/collections/users/auth-with-password',{method:'POST'})).status,405);
});
