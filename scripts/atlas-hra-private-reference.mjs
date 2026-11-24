// Private endocrine correction and independently framed HRA reference assets.
// No new geometry, guessed transforms, downloads or release approval.
import fs from 'node:fs';
import path from 'node:path';
import assert from 'node:assert/strict';
import {createHash} from 'node:crypto';
import {createReadStream} from 'node:fs';
import {safeHraAssetUrl,inspectGlb} from './atlas-onepass-supplementary.mjs';
const read=p=>JSON.parse(fs.readFileSync(p,'utf8'));
const sha=b=>createHash('sha256').update(b).digest('hex');
const hashFile=async p=>{const h=createHash('sha256');for await(const b of createReadStream(p))h.update(b);return h.digest('hex');};
const exact=new Map([
 ['FMA13889',{names:['pituitary gland','hypophysis'],region:'headNeck'}],
 ['FMA15629',{names:['right adrenal gland','right suprarenal gland'],region:'abdomen'}],
 ['FMA15630',{names:['left adrenal gland','left suprarenal gland'],region:'abdomen'}]
]);
export function fixEndocrine(entries){
 const changed=[];
 const converted=entries.map(e=>{
  const target=exact.get(e.fmaId);
  if(e.system!=='visceral'||!target||!target.names.includes(e.name.toLowerCase())||!e.privateAtlasMeta)return e;
  if(e.group!=='endocrine'||!e.privateAtlasMeta.regions?.includes(target.region))changed.push(e.name);
  return {...e,group:'endocrine',privateAtlasMeta:{...e.privateAtlasMeta,source:'visceral',group:'endocrine',layer:0,regions:[target.region]}};
 });
 return {converted,changed,confirmed:converted.filter(e=>exact.has(e.fmaId)&&e.group==='endocrine').map(e=>e.name)};
}
function local(base,name){
 assert(/^[a-z0-9-]+\.glb(?:\.json)?$/.test(name),'Unsafe HRA filename');
 const p=path.join(base,name);assert(fs.realpathSync(p)===p&&fs.statSync(p).isFile(),'Unsafe cached source');return p;
}
export async function buildHraRegistry(privateRoot){
 const dir=path.join(privateRoot,'hra-reference-organs-private'),assets=new Map(),blocked=[];
 if(!fs.existsSync(dir))return {assets,blocked:[{reason:'No local HRA cache'}]};
 assert.equal(fs.realpathSync(dir),dir);
 const reportPath=path.join(dir,'hra-source-report.json');
 assert.equal(fs.realpathSync(reportPath),reportPath);
 const report=read(reportPath);
 assert.equal(report.source,'https://apps.humanatlas.io/api/v1/reference-organs');
 assert.equal(report.publicRelease,'NO_GO');
 assert.equal(report.atlasMounted,false);
 assert.equal(report.approvedForDistribution,false);
 for(const a of report.assets||[]){
  try{
   const url=safeHraAssetUrl(a.url);assert(url,'Source URL not approved for local staging');
   const match=new URL(url).pathname.match(/^\/digital-objects\/ref-organ\/([a-z0-9-]+)\/(v\d+\.\d+(?:\.\d+)?)\/assets\/[a-z0-9-]+\.glb$/);
   assert(match,'Unrecognized published object path');
   const id=sha(url).slice(0,24),name=id+'.glb';
   assert.equal(a.file,name);assert.equal(a.approvedForDistribution,false);assert.equal(a.registrationValidated,false);
   const file=local(dir,name),receipt=read(local(dir,name+'.json'));
   assert.equal(receipt.url,url);assert.equal(receipt.sha256,a.sha256);assert.equal(receipt.approvedForDistribution,false);
   assert.equal(receipt.atlasMounted,false);assert.equal(receipt.registrationValidated,false);
   assert(fs.statSync(file).size<=128*1024*1024&&fs.statSync(file).size===a.bytes,'Source size differs');
   assert.equal(await hashFile(file),a.sha256,'Source hash differs');
   const info=inspectGlb(fs.readFileSync(file));
   assert.equal(info.meshCount,a.meshCount);assert(!assets.has(id),'Duplicate cache ID');
   assets.set(id,{file,bytes:a.bytes,public:{id,name:match[1].replaceAll('-',' '),version:match[2],source:url,meshCount:info.meshCount,
    frame:'HRA source frame (independent of BP3D)',approvedForDistribution:false,registrationValidated:false}});
  }catch(e){blocked.push({url:a.url||null,reason:String(e.message)});}
 }
 return {assets,blocked};
}
export function serveHraReference(req,res,registry){
 const u=req.url?.split('?')[0]||'',prefix='/anatomy/viewer/hra-reference/';
 if(!u.startsWith(prefix))return false;
 const rel=u.slice(prefix.length);
 const send=(status,body,type='text/plain; charset=utf-8')=>{res.writeHead(status,{'Content-Type':type,'Cache-Control':'no-store','X-Content-Type-Options':'nosniff'});res.end(req.method==='HEAD'?undefined:body);};
 if(rel==='inventory.json'){
  const items=[...registry.assets.values()].map(x=>x.public).sort((a,b)=>a.name.localeCompare(b.name));
  send(200,JSON.stringify({items,blockedCount:registry.blocked.length,publicRelease:'NO_GO',registrationValidated:false}),'application/json');return true;
 }
 const match=rel.match(/^([a-f0-9]{24})\.glb$/),a=match&&registry.assets.get(match[1]);
 if(!a){send(404,'Not found');return true;}
 res.writeHead(200,{'Content-Type':'model/gltf-binary','Content-Length':a.bytes,'Cache-Control':'no-store','X-Content-Type-Options':'nosniff'});
 if(req.method==='HEAD'){res.end();return true;}
 const stream=createReadStream(a.file);stream.on('error',()=>res.destroy());res.on('close',()=>stream.destroy());stream.pipe(res);return true;
}
