#!/usr/bin/env node
// Rebuild the ORIGINAL private Atlas using existing materialized models.
// No model conversion, archive downloads, Codex, or changes to public files.
import fs from 'node:fs';
import path from 'node:path';
import assert from 'node:assert/strict';
import {createHash} from 'node:crypto';
import {createReadStream} from 'node:fs';
import {createRequire} from 'node:module';
import {createServer} from 'node:http';
import {fileURLToPath,pathToFileURL} from 'node:url';
import {privateAtlasPlugin} from './preview-private-atlas-expansion.mjs';
import {createLabPreviewServer,checkBuilds,ROOTS} from './preview-4d-lab.mjs';
const root=fs.realpathSync(fileURLToPath(new URL('../',import.meta.url)));
const privateRoot=path.join(root,'local-data/licensing-quarantine');
const atlasRoot=path.join(root,'apps/anatomy');
const read=p=>JSON.parse(fs.readFileSync(p,'utf8'));
const systems=['skeletal','muscular','joints','cardiovascular','lymphatic','visceral','nervous'];
async function hashFile(p){const h=createHash('sha256');for await(const b of createReadStream(p))h.update(b);return h.digest('hex');}
function local(base,rel,dir=false){
 const p=path.resolve(base,rel);
 assert(p.startsWith(path.resolve(base)+path.sep)&&fs.realpathSync(p)===p,'Unsafe input '+rel);
 assert(dir?fs.statSync(p).isDirectory():fs.statSync(p).isFile(),'Wrong input type '+rel);
 return p;
}
function choose(tree,explicit){
 const candidates=explicit?[explicit]:fs.readdirSync(privateRoot).filter(x=>/^bp3d-native-frame-preview-[A-Za-z0-9_-]+$/.test(x));
 const found=[];
 for(const d of candidates){
  assert(/^bp3d-native-frame-preview-[A-Za-z0-9_-]+$/.test(d),'Invalid native pack directory name');
  try{
   const p=local(privateRoot,d,true),report=local(p,'materialization-report.json');
   const r=read(report),result=r.results?.find(x=>x.tree===tree);
   assert(r.publicRelease==='NO_GO'&&result?.materialized>0&&result.sourceNativeDisplayOnly===true);
   const pack=local(p,tree+'/pack',true),inv=read(local(pack,'inventory.json'));
   assert(inv.sourceTree===tree&&inv.sourceNativeDisplayOnly===true&&inv.approvedForCommercialDistribution===false);
   found.push({pack,inv,mtime:fs.statSync(report).mtimeMs,d});
  }catch(e){if(explicit)throw e;}
 }
 found.sort((a,b)=>b.mtime-a.mtime);
 assert(found.length,'No materialized '+tree+' native pack found. Existing preview assets are required.');
 return found[0];
}
async function verify(pack,inv){
 assert(Array.isArray(inv.converted)&&inv.converted.length>0,'Missing inventory');
 const names=new Set(),ids=new Set(),counts={};
 for(const e of inv.converted){
  assert(typeof e.name==='string'&&!names.has(e.name)&&!ids.has(e.id),'Duplicate identity');
  assert(systems.includes(e.system)&&e.approvedForDistribution===false,'Unexpected source or approval');
  assert(e.modelPath==='./structures/'+e.id+'/model.glb'&&/^[a-z0-9-]+$/.test(e.id),'Unexpected model path');
  const glb=local(pack,e.modelPath),lineage=read(local(pack,'structures/'+e.id+'/lineage.json'));
  assert(lineage.approvedForDistribution===false&&lineage.generatedGLBSHA256===e.glbSha256,'Invalid candidate lineage');
  assert(await hashFile(glb)===e.glbSha256,'Existing GLB checksum differs: '+e.name);
  names.add(e.name);ids.add(e.id);counts[e.system]=(counts[e.system]||0)+1;
 }
 assert(systems.every(s=>counts[s]>0),'Incomplete source coverage; do not fall back to legacy assets');
 return counts;
}
async function main(){
 const tree=process.argv[2]||'isa',explicit=process.argv[3];assert(['isa','partof'].includes(tree)&&process.argv.length<=4,'Usage: node scripts/preview-atlas-recolor.mjs [isa|partof] [native-folder]');
 assert(fs.realpathSync(privateRoot)===privateRoot,'Private source root is symlinked');
 const {pack,inv,d}=choose(tree,explicit);
 console.log('Reusing materialized '+tree.toUpperCase()+' models from '+d);
 const counts=await verify(pack,inv);console.log('Verified existing GLBs:',inv.converted.length,JSON.stringify(counts));
 const out=fs.mkdtempSync(path.join(privateRoot,'bp3d-recolor-preview-')),dist=path.join(out,'atlas-dist');
 const atlasReq=createRequire(path.join(atlasRoot,'package.json'));
 const {build}=await import(pathToFileURL(atlasReq.resolve('vite')).href);
 const applied=new Set();
 process.chdir(atlasRoot);
 try{
  await build({root:atlasRoot,configFile:path.join(atlasRoot,'vite.config.js'),base:'/anatomy/viewer/',
   plugins:[privateAtlasPlugin(applied)],build:{outDir:dist,emptyOutDir:true}});
 }finally{process.chdir(root);}
 assert.equal(applied.size,4,'Original private viewer patches not applied');
 const roots={...ROOTS,atlas:dist,bp3d:pack},checked=await checkBuilds(roots);
 assert(checked.ok,'Preview preflight: '+checked.problems.join('; '));
 const port=Number(process.env.PORT||(tree==='isa'?4179:4180));
 assert(Number.isInteger(port)&&port>=1024&&port<=65535,'Invalid loopback port');
 const handle=createLabPreviewServer(roots).listeners('request')[0];
 const server=createServer((req,res)=>{
  if(req.headers.host!=='127.0.0.1:'+port||!['GET','HEAD'].includes(req.method)||!req.url?.startsWith('/anatomy/viewer/')){
   res.writeHead(403);res.end('Private loopback only');return;
  }
  handle(req,res);
 });
 await new Promise((resolve,reject)=>{server.once('error',reject);server.listen(port,'127.0.0.1',resolve);});
 const base='http://127.0.0.1:'+port;
 try{
  const data=await fetch(base+'/anatomy/viewer/bp3d/inventory.json');assert(data.ok);assert.equal((await data.json()).converted.length,inv.converted.length);
  assert.equal((await fetch(base+'/anatomy/viewer/models/nervous.glb',{method:'HEAD'})).status,404);
  const page=await fetch(base+'/anatomy/viewer/');assert(page.ok&&(await page.text()).includes('loadingOverlay'));
  const url=base+'/anatomy/viewer/?models=bp3d&privateExpansion=1';
  fs.writeFileSync(path.join(out,'recolor-report.json'),JSON.stringify({tree,pack,count:inv.converted.length,perSystem:counts,url,geometryUnchanged:true,visualQA:'PENDING',publicRelease:'NO_GO'},null,2)+'\n');
  console.log('RECOLOR PREVIEW READY:',url);
  console.log('No geometry rebuilt; old preview unchanged. Visual QA pending; public release NO_GO.');
 }catch(e){server.close();throw e;}
}
main().catch(e=>{console.error('RECOLOR PREVIEW BLOCKED:',e.message);process.exitCode=1;});
