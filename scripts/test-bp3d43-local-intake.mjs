// Run only in a fresh temporary CI acquisition workspace; no synthetic anatomy.
import fs from 'node:fs';
import path from 'node:path';
import assert from 'node:assert/strict';
import {fileURLToPath} from 'node:url';
import {createServer} from 'node:http';
import {createHash} from 'node:crypto';
import {load43Elements,serve43Reference} from './load-bp3d43-private-elements.mjs';
const root=fs.realpathSync(fileURLToPath(new URL('../',import.meta.url))),q=path.join(root,'local-data/licensing-quarantine');
const folders=fs.readdirSync(q).filter(x=>/^bp3d43-element-intake-[A-Za-z0-9_-]+$/.test(x));
assert.equal(folders.length,1,'Fresh single acquisition required');
const evidence=JSON.parse(fs.readFileSync(path.join(root,'licensing/atlas-publication/bp3d43-dual-source-audit-20261125.json'),'utf8'));
const registry=load43Elements(q,folders[0],evidence);
const server=createServer((req,res)=>{if(!serve43Reference(req,res,registry)){res.writeHead(404);res.end();}});
await new Promise(resolve=>server.listen(0,'127.0.0.1',resolve));
try{
 const base='http://127.0.0.1:'+server.address().port+'/anatomy/viewer/bp3d43-reference/';
 const r=await fetch(base+'inventory.json');assert(r.ok);assert.equal((await r.json()).items.length,12);
 for(const [id,asset] of registry.assets){
  const h=await fetch(base+id+'.glb',{method:'HEAD'});assert(h.ok&&Number(h.headers.get('content-length'))===asset.bytes);
  const g=await fetch(base+id+'.glb');assert(g.ok);assert.equal(createHash('sha256').update(Buffer.from(await g.arrayBuffer())).digest('hex'),asset.sha256);
 }
 assert.equal((await fetch(base+'unknown.glb')).status,404);
 const [id,a]=registry.assets.entries().next().value,bytes=fs.readFileSync(a.file),changed=Buffer.from(bytes);changed[changed.length-1]^=1;
 try{fs.writeFileSync(a.file,changed);assert.equal((await fetch(base+id+'.glb')).status,404);assert.throws(()=>load43Elements(q,folders[0],evidence));}
 finally{fs.writeFileSync(a.file,bytes);}
 console.log('BP3D43 PRIVATE LOADER AND HTTP PASS: 12 exact audited GLBs; modified file rejected; no publication.');
}finally{await new Promise(resolve=>server.close(resolve));}
