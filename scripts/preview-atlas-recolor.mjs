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
import {expandNativeOrganComponents} from './expand-native-organ-components.mjs';
import {fixEndocrine,buildHraRegistry,serveHraReference} from './atlas-hra-private-reference.mjs';
import {writeClinicalPriorityAudit} from './atlas-clinical-priority-audit.mjs';
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
function chooseExistingExpansion(){
 const found=[];
 for(const d of fs.readdirSync(privateRoot).filter(x=>/^bp3d-organ-expansion-preview-[A-Za-z0-9_-]+$/.test(x))){
  try{
   const folder=local(privateRoot,d,true),report=read(local(folder,'organ-component-report.json'));
   const completed=local(folder,'recolor-report.json'),recolor=read(completed),pack=local(folder,'pack',true),inv=read(local(pack,'inventory.json'));
   assert(report.publicRelease==='NO_GO'&&recolor.publicRelease==='NO_GO'&&inv.approvedForCommercialDistribution===false);
   assert(inv.sourceTree==='isa'&&inv.sourceNativeDisplayOnly===true&&report.total===inv.converted.length&&recolor.count===inv.converted.length);
   found.push({d,pack,inv,mtime:fs.statSync(completed).mtimeMs});
  }catch{}
 }
 found.sort((a,b)=>b.mtime-a.mtime);
 return found[0]||null;
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
 const hraEnabled=process.env.MEDCOEL_HRA_REFERENCE==='1';
 const expand=process.env.MEDCOEL_EXPAND_ORGANS==='1';
 const original=hraEnabled&&tree==='isa'&&!explicit&&!expand?(chooseExistingExpansion()||choose(tree,explicit)):choose(tree,explicit);
 let {pack,inv}=original;
 console.log('Reusing materialized '+tree.toUpperCase()+' models from '+original.d);
 let counts=await verify(pack,inv);console.log('Verified existing GLBs:',inv.converted.length,JSON.stringify(counts));
 const out=fs.mkdtempSync(path.join(privateRoot,expand?'bp3d-organ-expansion-preview-':'bp3d-recolor-preview-')),dist=path.join(out,'atlas-dist');
 let expansion=null;
 if(expand){
  assert.equal(tree,'isa','Organ expansion requires IS-A original pack');
  expansion=await expandNativeOrganComponents({root,privateRoot,pack,inv,out});
  ({pack,inv,counts}=expansion);
  await verify(pack,inv);
 }
 const endocrine=fixEndocrine(inv.converted);
 inv={...inv,converted:endocrine.converted};
 console.log('ENDOCRINE GROUP',JSON.stringify({corrected:endocrine.changed,confirmed:endocrine.confirmed}));
 let hra=null;
 if(hraEnabled){try{hra=await buildHraRegistry(privateRoot);}catch(error){hra={assets:new Map(),blocked:[{reason:String(error.message)}]};console.warn('HRA REFERENCE BLOCKED:',error.message);}}
 if(hra)console.log('HRA LOCAL REFERENCE',JSON.stringify({verified:hra.assets.size,blocked:hra.blocked.length,bodyOverlay:false}));
 const clinical=writeClinicalPriorityAudit(out,{inventory:inv,hra});
 const atlasReq=createRequire(path.join(atlasRoot,'package.json'));
 const {build}=await import(pathToFileURL(atlasReq.resolve('vite')).href);
 const applied=new Set();
 process.chdir(atlasRoot);
 try{
  await build({root:atlasRoot,configFile:path.join(atlasRoot,'vite.config.js'),base:'/anatomy/viewer/',
   plugins:[privateAtlasPlugin(applied),...(hraEnabled?[{name:'medcoel-private-hra-dialog',enforce:'pre',transform(code,id){if(path.resolve(id.split('?')[0])!==path.join(atlasRoot,'src/main.js'))return null;return "import {mountHraReference} from './viewer/hraPrivateReference.js';\nif(document.readyState==='loading')document.addEventListener('DOMContentLoaded',mountHraReference,{once:true});else mountHraReference();\n"+code;}}]:[])],build:{outDir:dist,emptyOutDir:true}});
 }finally{process.chdir(root);}
 assert.equal(applied.size,4,'Original private viewer patches not applied');
 const roots={...ROOTS,atlas:dist,bp3d:pack},checked=await checkBuilds(roots);
 assert(checked.ok,'Preview preflight: '+checked.problems.join('; '));
 const port=Number(process.env.PORT||(hraEnabled?4183:expand?4181:tree==='isa'?4179:4180));
 assert(Number.isInteger(port)&&port>=1024&&port<=65535,'Invalid loopback port');
 const handle=createLabPreviewServer(roots).listeners('request')[0];
 const server=createServer((req,res)=>{
  if(req.headers.host!=='127.0.0.1:'+port||!['GET','HEAD'].includes(req.method)||!req.url?.startsWith('/anatomy/viewer/')){
   res.writeHead(403);res.end('Private loopback only');return;
  }
  if(req.url.split('?')[0]==='/anatomy/viewer/bp3d/inventory.json'){
   res.writeHead(200,{'Content-Type':'application/json','Cache-Control':'no-store'});
   res.end(req.method==='HEAD'?undefined:JSON.stringify(inv));return;
  }
  if(hra&&serveHraReference(req,res,hra))return;
  handle(req,res);
 });
 await new Promise((resolve,reject)=>{server.once('error',reject);server.listen(port,'127.0.0.1',resolve);});
 const base='http://127.0.0.1:'+port;
 try{
  const data=await fetch(base+'/anatomy/viewer/bp3d/inventory.json');assert(data.ok);assert.equal((await data.json()).converted.length,inv.converted.length);
  assert.equal((await fetch(base+'/anatomy/viewer/models/nervous.glb',{method:'HEAD'})).status,404);
  const page=await fetch(base+'/anatomy/viewer/');assert(page.ok&&(await page.text()).includes('loadingOverlay'));
  if(hra){const response=await fetch(base+'/anatomy/viewer/hra-reference/inventory.json');assert(response.ok);assert.equal((await response.json()).items.length,hra.assets.size);}
  const url=base+'/anatomy/viewer/?models=bp3d&privateExpansion=1';
  fs.writeFileSync(path.join(out,'recolor-report.json'),JSON.stringify({tree,pack,count:inv.converted.length,perSystem:counts,url,geometryUnchanged:!expand,addedComponents:expansion?.report.added.length||0,endocrineCorrected:endocrine.changed,hraReferenceModels:hra?.assets.size||0,hraBodyOverlay:false,clinicalPriorityReport:clinical.summary,visualQA:'PENDING',publicRelease:'NO_GO'},null,2)+'\n');
  console.log('RECOLOR PREVIEW READY:',url);
  if(expansion)console.log('ORGAN EXPANSION REPORT:',path.join(out,'organ-component-report.json'));
  console.log('CLINICAL PRIORITY REPORT:',path.join(out,'clinical-priority-audit.json'));
  console.log('Original preview unchanged. Visual QA pending; public release NO_GO.');
 }catch(e){server.close();throw e;}
}
main().catch(e=>{console.error('RECOLOR PREVIEW BLOCKED:',e.message);process.exitCode=1;});
