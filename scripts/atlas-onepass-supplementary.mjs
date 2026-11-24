// One-pass supplementary-source acquisition and QC for the private MEDCOEL Atlas.
// HRA GLBs are staged, NOT mounted onto the BodyParts3D coordinate frame.
import fs from 'node:fs';
import path from 'node:path';
import {createHash,randomUUID} from 'node:crypto';
import {createReadStream,createWriteStream} from 'node:fs';
import {Readable,Transform} from 'node:stream';
import {pipeline} from 'node:stream/promises';

export const HRA_ENDPOINT='https://apps.humanatlas.io/api/v1/reference-organs';
export const HRA_LIBRARY='https://humanatlas.io/3d-reference-library';
const MAX_ASSET=128*1024*1024, MAX_TOTAL=1024*1024*1024, MAX_METADATA=16*1024*1024;
const sha=x=>createHash('sha256').update(x).digest('hex');
const write=(p,v)=>fs.writeFileSync(p,JSON.stringify(v,null,2)+'\n');
const ensure=(b,m)=>{if(!b)throw Error(m);};
const safeDirectory=dir=>{
  fs.mkdirSync(dir,{recursive:true});
  ensure(fs.realpathSync(dir)===path.resolve(dir),'Symlinked private source directory');
};
async function fileHash(p){
  const h=createHash('sha256');
  for await(const chunk of createReadStream(p))h.update(chunk);
  return h.digest('hex');
}
export function safeHraAssetUrl(value){
  if(typeof value!=='string')return null;
  try{
    const u=new URL(value);
    if(u.protocol!=='https:'||u.username||u.password||u.port||u.search||u.hash||
       u.hostname!=='cdn.humanatlas.io'||!u.pathname.endsWith('.glb'))return null;
    return u.href;
  }catch{return null;}
}
export function planHraAssets(data){
  ensure(Array.isArray(data)&&data.length>0&&data.length<=500,'Unexpected published HRA response schema');
  const byUrl=new Map(),rejected=[];
  for(const record of data){
    const url=safeHraAssetUrl(record?.object?.file);
    if(!url){rejected.push({id:record?.['@id']||record?.id||null,reason:'no-allowlisted-official-GLB'});continue;}
    if(!byUrl.has(url))byUrl.set(url,{url,records:[]});
    byUrl.get(url).records.push(record);
  }
  return {assets:[...byUrl.values()],rejected};
}
async function boundedJson(url){
  const res=await fetch(url,{redirect:'error',signal:AbortSignal.timeout(60000),headers:{accept:'application/json'}});
  ensure(res.ok&&res.body,'HRA API HTTP '+res.status);
  const chunks=[];let n=0;
  for await(const chunk of Readable.fromWeb(res.body)){
    n+=chunk.length;ensure(n<=MAX_METADATA,'HRA metadata too large');chunks.push(chunk);
  }
  const bytes=Buffer.concat(chunks);
  return {data:JSON.parse(bytes.toString('utf8')),bytes};
}
export function inspectGlb(bytes){
  ensure(bytes.length>=20&&bytes.readUInt32LE(0)===0x46546c67&&bytes.readUInt32LE(4)===2&&bytes.readUInt32LE(8)===bytes.length,'Invalid GLB v2 header');
  const len=bytes.readUInt32LE(12);
  ensure(len>0&&len%4===0&&20+len<=bytes.length&&bytes.readUInt32LE(16)===0x4e4f534a,'Invalid GLB JSON chunk');
  const data=JSON.parse(bytes.subarray(20,20+len).toString('utf8').trim());
  ensure(data.asset?.version==='2.0'&&Array.isArray(data.meshes)&&data.meshes.length>0,'GLB has no mesh data');
  ensure(![...(data.buffers||[]),...(data.images||[])].some(x=>typeof x.uri==='string'&&!x.uri.startsWith('data:')),'GLB refers to external resources');
  return {meshCount:data.meshes.length,nodeCount:data.nodes?.length||0,extensionsUsed:data.extensionsUsed||[]};
}
async function acquireHraAsset(dir,item,budget){
  const id=sha(item.url).slice(0,24),file=path.join(dir,id+'.glb'),receipt=file+'.json';
  if(fs.existsSync(file)||fs.existsSync(receipt)){
    ensure(fs.existsSync(file)&&fs.existsSync(receipt),'Incomplete HRA cache receipt');
    ensure(fs.realpathSync(file)===file&&fs.realpathSync(receipt)===receipt,'Symlinked HRA input');
    const old=JSON.parse(fs.readFileSync(receipt,'utf8'));
    ensure(old.url===item.url&&old.sha256===await fileHash(file)&&fs.statSync(file).size<=MAX_ASSET,'HRA cache hash mismatch');
    const info=inspectGlb(fs.readFileSync(file));
    budget.used+=fs.statSync(file).size;ensure(budget.used<=MAX_TOTAL,'HRA total source budget exceeded');
    return {...old,...info,metadata:item.records,cache:'verified'};
  }
  const res=await fetch(item.url,{redirect:'error',signal:AbortSignal.timeout(180000)});
  ensure(res.ok&&res.body,'HRA GLB HTTP '+res.status);
  let n=0;
  const counter=new Transform({transform(chunk,enc,cb){
    n+=chunk.length;budget.used+=chunk.length;
    if(n>MAX_ASSET||budget.used>MAX_TOTAL)return cb(Error('HRA download byte budget exceeded'));
    cb(null,chunk);
  }});
  const tmp=file+'.'+randomUUID()+'.partial';
  try{
    await pipeline(Readable.fromWeb(res.body),counter,createWriteStream(tmp,{flags:'wx'}));
    const info=inspectGlb(fs.readFileSync(tmp));
    const result={url:item.url,sha256:await fileHash(tmp),bytes:n,file:path.basename(file),
      ...info,source:'Human Reference Atlas published reference-organ API',library:HRA_LIBRARY,
      acquiredAt:new Date().toISOString(),metadata:item.records,licenseStatus:'PER_ASSET_REVIEW_REQUIRED',
      registrationValidated:false,geometryAnatomyValidated:false,approvedForDistribution:false,atlasMounted:false};
    fs.renameSync(tmp,file);write(receipt,result);return result;
  }finally{if(fs.existsSync(tmp))fs.unlinkSync(tmp);}
}
export async function stagePublishedHra(privateRoot){
  const dir=path.join(privateRoot,'hra-reference-organs-private');safeDirectory(dir);
  const report={source:HRA_ENDPOINT,library:HRA_LIBRARY,publicRelease:'NO_GO',
    atlasMounted:false,registrationValidated:false,approvedForDistribution:false,assets:[],blocked:[]};
  try{
    const {data,bytes}=await boundedJson(HRA_ENDPOINT);
    const {assets,rejected}=planHraAssets(data);
    const metadataSha=sha(bytes);
    fs.writeFileSync(path.join(dir,'published-reference-organs-'+metadataSha+'.json'),bytes);
    report.metadataSha256=metadataSha;report.discovered=assets.length;report.blocked.push(...rejected);
    const queue=[...assets],budget={used:0};
    async function worker(){
      while(queue.length){
        const item=queue.shift();
        try{
          const r=await acquireHraAsset(dir,item,budget);report.assets.push(r);
          console.log('HRA PRIVATE STAGED',r.file,r.meshCount+' meshes');
        }catch(e){report.blocked.push({url:item.url,reason:String(e.message)});}
      }
    }
    await Promise.all(Array.from({length:Math.min(3,assets.length)},worker));
    report.status=report.assets.length?'STAGED_NOT_REGISTERED':'BLOCKED';
    report.bytes=report.assets.reduce((n,r)=>n+r.bytes,0);
  }catch(e){report.status='BLOCKED';report.error=String(e.message);}
  report.assets.sort((a,b)=>a.url.localeCompare(b.url));
  write(path.join(dir,'hra-source-report.json'),report);
  console.log('HRA RESULT',JSON.stringify({status:report.status,discovered:report.discovered||0,staged:report.assets.length,
    blocked:report.blocked.length,error:report.error||null,atlasMounted:false}));
  return report;
}
export function coverageReport(catalog,converted){
  const mounted=new Map(),duplicateIds=new Set(),perSystem={};
  for(const e of converted){
    if(mounted.has(e.name))duplicateIds.add(e.name);
    mounted.set(e.name,e);
    const group=perSystem[e.system]??={catalog:0,mapped:0,missing:0,extra:0,modelCount:0,flagged:0};
    group.modelCount++;
    if(e.diagnostics?.flags?.length)group.flagged++;
  }
  const missing=[],mismatch=[],extras=[];
  for(const [name,meta] of Object.entries(catalog)){
    const system=meta.source,group=perSystem[system]??={catalog:0,mapped:0,missing:0,extra:0,modelCount:0,flagged:0};
    group.catalog++;
    const e=mounted.get(name);
    if(e?.system===system)group.mapped++;
    else{
      group.missing++;missing.push({name,system,group:meta.group,regions:meta.regions||[]});
      if(e)mismatch.push({name,expected:system,actual:e.system});
    }
  }
  for(const e of converted)if(!Object.hasOwn(catalog,e.name)){
    perSystem[e.system].extra++;
    extras.push({name:e.name,system:e.system,fmaId:e.fmaId,bpId:e.bpId});
  }
  for(const group of Object.values(perSystem))group.coverage=group.catalog?Math.round(group.mapped/group.catalog*10000)/100:null;
  return {catalogCount:Object.keys(catalog).length,mappedCatalog:Object.keys(catalog).length-missing.length,
    missingCatalog:missing.length,privateSourceModels:converted.length,extraSourceLabels:extras.length,
    duplicateIds:[...duplicateIds],systemMismatch:mismatch,perSystem,missing,extras,
    scope:'Private preview candidate inventory only; not rendered/validated clinical completeness',
    geometryAnatomyValidated:false,commercialRelease:'NO_GO'};
}
