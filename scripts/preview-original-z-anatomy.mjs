#!/usr/bin/env node
// Full original source private preview; separate source-native frame, no public distribution.
import fs from 'node:fs';
import path from 'node:path';
import assert from 'node:assert/strict';
import {execFileSync,spawnSync} from 'node:child_process';
import {createHash} from 'node:crypto';
import {createReadStream} from 'node:fs';
import {createRequire} from 'node:module';
import {fileURLToPath,pathToFileURL} from 'node:url';
import {createServer} from 'node:http';
import {privateAtlasPlugin} from './preview-private-atlas-expansion.mjs';
import {patchPrivateSourceRuntime,patchPrivatePanel} from './z-anatomy-private-runtime.mjs';
import {createLabPreviewServer,checkBuilds,ROOTS} from './preview-4d-lab.mjs';
const root=fs.realpathSync(fileURLToPath(new URL('../',import.meta.url)));
const privateRoot=path.join(root,'local-data/licensing-quarantine');
const atlasRoot=path.join(root,'apps/anatomy');
const revision='3c1679595d89aa508ddffc72cd5e125c5d609a59';
const source='https://raw.githubusercontent.com/Z-Anatomy/Models-of-human-anatomy/'+revision+'/';
const read=p=>JSON.parse(fs.readFileSync(p,'utf8'));
const write=(p,v)=>fs.writeFileSync(p,JSON.stringify(v,null,2)+'\n');
async function hash(p){const h=createHash('sha256');for await(const b of createReadStream(p))h.update(b);return h.digest('hex');}
function local(base,rel){
 const p=path.resolve(base,rel);
 assert(p.startsWith(base+path.sep)&&fs.realpathSync(p)===p&&fs.statSync(p).isFile(),'Unsafe source path '+rel);return p;
}
async function acquire(dir,name,max){
 const file=path.join(dir,name),receipt=file+'.receipt.json',url=source+name;
 if(fs.existsSync(file)&&fs.existsSync(receipt)){
  local(dir,name);local(dir,name+'.receipt.json');const r=read(receipt);
  assert(r.url===url&&r.sha256===await hash(file)&&r.bytes===fs.statSync(file).size,'Cached source changed');return file;
 }
 assert(!fs.existsSync(file)&&!fs.existsSync(receipt),'Incomplete local source receipt; retain for review');
 const tmp=file+'.partial';
 try{
  execFileSync('curl',['--fail','--location','--proto','=https','--proto-redir','=https','--max-redirs','3','--max-filesize',String(max),'--connect-timeout','20','--max-time','600','--output',tmp,url],{stdio:'inherit'});
  assert(fs.statSync(tmp).size>0&&fs.statSync(tmp).size<=max,'Invalid source size');
  if(name.endsWith('.zip')){const fd=fs.openSync(tmp,'r');try{const b=Buffer.alloc(4);fs.readSync(fd,b,0,4,0);assert.equal(b.readUInt32LE(),0x04034b50,'Not an archive');}finally{fs.closeSync(fd);}}
  const r={url,sha256:await hash(tmp),bytes:fs.statSync(tmp).size,revision,approvedForDistribution:false};
  fs.renameSync(tmp,file);write(receipt,r);return file;
 }finally{if(fs.existsSync(tmp))fs.unlinkSync(tmp);}
}
function blender(){
 const p=process.env.BLENDER_BIN||'/Applications/Blender.app/Contents/MacOS/Blender';
 const r=spawnSync(p,['--version'],{encoding:'utf8'});
 if(r.status===0)return p;
 if(!process.env.BLENDER_BIN&&spawnSync('blender',['--version'],{encoding:'utf8'}).status===0)return 'blender';
 throw Error('Blender unavailable. Install from https://www.blender.org/download/ or set BLENDER_BIN to the executable. No source data changed.');
}
function sourcePlugin(applied){
 return {name:'medcoel-z-anatomy-private-native-frame',enforce:'pre',transform(code,id){
  const p=path.relative(atlasRoot,id.split('?')[0]).split(path.sep).join('/');
  if(p==='src/viewer/bp3dSource.js'){
   const start='function frameGroup() {';
   assert.equal(code.split(start).length,2);
   code=code.replace(start,"function frameGroup() { return new THREE.Group(); }\nfunction unusedBp3dFrameGroup() {");
   code=code.replace("node.userData.source = 'bodyparts3d'","node.userData.source = 'z-anatomy-original-private'");
   code=patchPrivateSourceRuntime(code);
  }else if(p==='src/atlas/bp3dPanel.js'){
   code=patchPrivatePanel(code);
   code=code.replaceAll('BodyParts3D','Z-Anatomy (sumber asli)').replaceAll('Kembali ke model Atlas','Keluar dari pratinjau privat');
  }else if(p==='src/atlas/engine.js'){
   code=code.replaceAll('BodyParts3D (pratinjau lokal','Z-Anatomy (pratinjau lokal');
   code=code.replace('} catch {\n        failed.push(source);','} catch (error) {\n        console.error(\"[Private Z-Anatomy] system failed\", source, error);\n        failed.push(source);');
  }else if(p==='src/main.js'){
   // Retain the old catalogue as the denominator for coverage; the existing
   // bp3dHas filter prevents unavailable names from being loaded.
   const anchor='    systems.nervous=[];';
   assert.equal(code.split(anchor).length,2,'Private inventory transform missing');
   code=code.replace("    if (!systems.nervous.length) throw new Error('No private nervous structures');","    // Absence is reported as unavailable, not filled by a legacy source.");
  }else return null;
  applied.add(p);return {code,map:null};
 }};
}
async function main(){
 assert.equal(fs.realpathSync(privateRoot),privateRoot);
 const bin=blender();
 execFileSync(bin,['--background','--factory-startup','--disable-autoexec','--python-exit-code','1','--python',path.join(root,'scripts/test-original-z-anatomy-export.py')],{stdio:'inherit'});
 const sourceDir=path.join(privateRoot,'z-anatomy-official-'+revision.slice(0,12));fs.mkdirSync(sourceDir,{recursive:true});assert.equal(fs.realpathSync(sourceDir),sourceDir);
 const archive=await acquire(sourceDir,'Z-Anatomy.zip',200*1024*1024),license=await acquire(sourceDir,'License.txt',256*1024);
 const out=fs.mkdtempSync(path.join(privateRoot,'z-anatomy-native-preview-')),pack=path.join(out,'pack'),dist=path.join(out,'atlas-dist');
 console.log('EXPORTING ORIGINAL Z-ANATOMY SOURCE',revision);
 execFileSync(bin,['--background','--factory-startup','--disable-autoexec','--python-exit-code','1','--python',path.join(root,'scripts/export-original-z-anatomy-private.py'),'--',archive,license,path.join(atlasRoot,'public/data/atlas-catalog.json'),out,revision],{stdio:'inherit'});
 const inv=read(local(pack,'inventory.json')),report=read(local(out,'source-recovery-report.json'));
 assert(inv.kind==='z-anatomy-original-source-private'&&inv.approvedForCommercialDistribution===false&&report.publicRelease==='NO_GO');
 assert.equal(inv.converted.length,report.total);
 const names=new Set(),ids=new Set();
 for(const e of inv.converted){
  assert(!names.has(e.name)&&!ids.has(e.id)&&e.approvedForDistribution===false);
  assert(/^[a-z0-9-]+$/.test(e.id)&&e.modelPath==='./structures/'+e.id+'/model.glb');
  const l=read(local(pack,'structures/'+e.id+'/lineage.json'));
  assert.equal(l.approvedForDistribution,false);assert.equal(l.generatedGLBSHA256,e.glbSha256);assert.equal(await hash(local(pack,e.modelPath)),e.glbSha256);
  names.add(e.name);ids.add(e.id);
 }
 const req=createRequire(path.join(atlasRoot,'package.json')), {build}=await import(pathToFileURL(req.resolve('vite')).href);
 const applied=new Set(),specific=new Set();
 process.chdir(atlasRoot);
 try{await build({root:atlasRoot,configFile:path.join(atlasRoot,'vite.config.js'),base:'/anatomy/viewer/',
  plugins:[privateAtlasPlugin(applied),sourcePlugin(specific)],build:{outDir:dist,emptyOutDir:true}});}
 finally{process.chdir(root);}
 assert.equal(applied.size,4,'Private containment patches not applied');
 assert.equal(specific.size,4,'Source frame/label patches not applied');
 const roots={...ROOTS,atlas:dist,bp3d:pack},checked=await checkBuilds(roots);
 assert(checked.ok,'Preview preflight: '+checked.problems.join('; '));
 const port=Number(process.env.PORT||4184);assert(Number.isInteger(port)&&port>=1024&&port<=65535);
 const handler=createLabPreviewServer(roots).listeners('request')[0];
 const server=createServer((req,res)=>{
  if(req.headers.host!=='127.0.0.1:'+port||!['GET','HEAD'].includes(req.method)||!req.url?.startsWith('/anatomy/viewer/')){
   res.writeHead(403);res.end('Private loopback only');return;
  }
  const u=new URL(req.url,'http://127.0.0.1:'+port);
  if(u.pathname.startsWith('/anatomy/viewer/models/')&&u.pathname.endsWith('.glb')){
   res.writeHead(404);res.end('Legacy model unavailable in this source-specific preview');return;
  }
  if((u.pathname==='/anatomy/viewer/'||u.pathname==='/anatomy/viewer/index.html')&&(u.searchParams.get('models')!=='bp3d'||u.searchParams.get('privateExpansion')!=='1')){
   res.writeHead(302,{Location:'/anatomy/viewer/?models=bp3d&privateExpansion=1'});res.end();return;
  }
  handler(req,res);
 });
 await new Promise((resolve,reject)=>{server.once('error',reject);server.listen(port,'127.0.0.1',resolve);});
 const base='http://127.0.0.1:'+port;
 try{
  const resp=await fetch(base+'/anatomy/viewer/bp3d/inventory.json');assert(resp.ok);assert.equal((await resp.json()).converted.length,inv.converted.length);
  assert.equal((await fetch(base+'/anatomy/viewer/models/nervous.glb',{method:'HEAD'})).status,404);
  console.log('VASCULAR SOURCE AUDIT:',path.join(out,'vascular-source-audit.json'));
  console.log('SOURCE RECOVERY REPORT:',path.join(out,'source-recovery-report.json'));
  console.log('Z-ANATOMY SOURCE PREVIEW READY:',base+'/anatomy/viewer/?models=bp3d&privateExpansion=1');
  console.log('Source-native independent body; no overlay, no production changes. Public release NO_GO.');
 }catch(e){server.close();throw e;}
}
main().catch(e=>{console.error('ORIGINAL SOURCE PREVIEW BLOCKED:',e.message);process.exitCode=1;});
