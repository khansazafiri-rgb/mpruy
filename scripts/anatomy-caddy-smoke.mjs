// Optional real Caddy smoke test. Never contacts or changes production.
// CADDY_BINARY=/absolute/path/caddy ANATOMY_DIST=/absolute/path/dist node scripts/anatomy-caddy-smoke.mjs
import fs from 'node:fs/promises';import os from 'node:os';import path from 'node:path';import net from 'node:net';import {spawn} from 'node:child_process';import assert from 'node:assert/strict';import {once} from 'node:events';
import {stageAnatomy} from './stage-anatomy.mjs';
import {createServer} from 'node:http';
const binary=process.env.CADDY_BINARY;if(!binary)throw Error('Set CADDY_BINARY to a locally installed Caddy');
const source=path.resolve(process.env.ANATOMY_DIST||'apps/anatomy/dist');const tmp=await fs.mkdtemp(path.join(os.tmpdir(),'medcoel-caddy-'));
let child;let output='';
const freePort=async()=>{const s=net.createServer();s.listen(0,'127.0.0.1');await once(s,'listening');const port=s.address().port;await new Promise(r=>s.close(r));return port;};
try{
 const port=await freePort(),deadBackend=await freePort(),dest=path.join(tmp,'persistent/viewer'),web=path.join(tmp,'web/dist');
 await fs.mkdir(path.dirname(dest),{recursive:true});await fs.mkdir(web,{recursive:true});await fs.writeFile(path.join(web,'index.html'),'Main web');
 await stageAnatomy({source,dest,releaseId:'smoke'});
 const snippet=(await fs.readFile(new URL('../deploy/anatomy.caddy.snippet',import.meta.url),'utf8')).replaceAll('/var/lib/medcoel/anatomy-viewer',dest);
 const config=path.join(tmp,'Caddyfile');await fs.writeFile(config,`{\nadmin off\nauto_https off\n}\nhttp://127.0.0.1:${port} {\nencode gzip\nheader X-Frame-Options DENY\nhandle /api/* {\nreverse_proxy 127.0.0.1:${deadBackend}\n}\n${snippet}\nhandle {\nroot * ${web}\ntry_files {path} /index.html\nfile_server\n}\n}\n`);
 const start=async()=>{child=spawn(binary,['run','--config',config,'--adapter','caddyfile'],{stdio:['ignore','pipe','pipe']});child.stdout.on('data',b=>output+=b);child.stderr.on('data',b=>output+=b);for(let i=0;i<80;i++){try{if((await fetch(`http://127.0.0.1:${port}/anatomy/viewer/`)).ok)return;}catch{}await new Promise(r=>setTimeout(r,50));}throw Error('Local Caddy did not start: '+output);};
 const stop=async()=>{const p=child;if(!p||p.exitCode!==null)return;const done=once(p,'exit');p.kill('SIGTERM');const timer=setTimeout(()=>p.kill('SIGKILL'),5000);try{await done;}finally{clearTimeout(timer);child=null;}};
 const request=async(file,options)=>fetch(`http://127.0.0.1:${port}${file}`,options);await start();
 const base='/anatomy/viewer/';const html=await request(base);assert.equal(html.status,200);assert.equal(html.headers.get('x-frame-options'),'SAMEORIGIN');assert.match(html.headers.get('cache-control'),/no-cache/);const text=await html.text();
 const js=text.match(/src="(\/anatomy\/viewer\/assets\/[^" ]+\.js)"/)[1];
 for(const file of ['data/systems.json','data/atlas-catalog.json','data/lexicon.json','data/definitions.json','draco/draco_wasm_wrapper.js','draco/draco_decoder.wasm',...['skeletal','muscular','joints','cardiovascular','nervous','lymphatic','visceral'].map(s=>'models/'+s+'.glb')]){
  const res=await request(base+file,{method:'HEAD'});assert.equal(res.status,200,file);assert.ok(Number(res.headers.get('content-length'))>0,file);
  if(file.endsWith('.glb'))assert.equal(res.headers.get('content-type'),'model/gltf-binary');if(file.endsWith('.wasm'))assert.equal(res.headers.get('content-type'),'application/wasm');
 }
 const asset=await request(js);assert.match(asset.headers.get('cache-control'),/31536000, immutable/);await asset.arrayBuffer();
 const model=await request(base+'models/skeletal.glb',{method:'HEAD'});assert.match(model.headers.get('cache-control'),/3600/);
 assert.equal((await request(base+'models/skeletal.glb',{headers:{'If-None-Match':model.headers.get('etag')}})).status,304);
 const range=await request(base+'models/skeletal.glb',{headers:{Range:'bytes=0-11'}});assert.equal(range.status,206);assert.equal((await range.arrayBuffer()).byteLength,12);
 const gzip=await request(base+'data/systems.json',{headers:{'Accept-Encoding':'gzip'}});assert.equal(gzip.headers.get('content-encoding'),'gzip');await gzip.text();
 for(const file of ['assets/missing.js','models/missing.glb','draco/missing.wasm']){const res=await request(base+file);assert.equal(res.status,404);assert.doesNotMatch(res.headers.get('cache-control')||'',/immutable/);}
 assert.equal((await request('/anatomy/viewer',{redirect:'manual'})).status,308);assert.equal((await request('/anatomy/structure/ulna')).status,200);
 await fs.rm(web,{recursive:true});await fs.mkdir(web,{recursive:true});await fs.writeFile(path.join(web,'index.html'),'Rebuilt main web');assert.equal((await request(base)).status,200);
 // A backend outage/restart cannot remove or gate static viewer assets.
 assert.equal((await request('/api/health')).status,502);assert.equal((await request(base)).status,200);
 const backend=createServer((_,res)=>res.end('ok'));backend.listen(deadBackend,'127.0.0.1');await once(backend,'listening');assert.equal((await request('/api/health')).status,200);backend.closeAllConnections();await new Promise(r=>backend.close(r));assert.equal((await request(base)).status,200);
 await stop();await start();assert.equal((await request(base)).status,200);await stop();
 console.log('PASS: real local Caddy; 200/MIME/length/cache/ETag304/range206/gzip/404/frame policy; web-dist rebuild; Caddy restart; mock backend outage/restart. No production changes.');
}finally{if(child&&child.exitCode===null){const done=once(child,'exit');child.kill('SIGTERM');await done;}await fs.rm(tmp,{recursive:true,force:true});}
