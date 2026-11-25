// Load only locally retained, dual-source-audited 4.3 assets. Never body inventory.
import fs from 'node:fs';
import path from 'node:path';
import assert from 'node:assert/strict';
import {createHash} from 'node:crypto';
import {parseObj} from './independent-bp3d-export.mjs';
import {parseNativePositions,comparePositions} from './audit-bp3d-publication-geometry.mjs';
const sha=b=>createHash('sha256').update(b).digest('hex');
const read=(folder,name,max=64*1024*1024)=>{
 const f=path.join(folder,name);
 assert(fs.realpathSync(f)===f&&fs.statSync(f).isFile()&&fs.statSync(f).size<=max,'Invalid private file');
 return fs.readFileSync(f);
};
export function load43Elements(privateRoot,folderName,evidence,expectedCount=12){
 assert([12,28,32,23,20,14].includes(expectedCount));
 assert(/^bp3d43-element-intake-[A-Za-z0-9_-]+$/.test(folderName),'Explicit local acquisition folder required');
 assert(fs.realpathSync(privateRoot)===privateRoot&&path.basename(privateRoot)==='licensing-quarantine');
 const folder=path.join(privateRoot,folderName);assert(fs.realpathSync(folder)===folder);
 assert(evidence.schema===1&&evidence.publicRelease==='NO_GO'&&evidence.clinicalValidation===false&&evidence.registrationValidated===false&&evidence.geometryPublished===0&&evidence.matches?.length===expectedCount);
 const report=JSON.parse(read(folder,'report.json',1024*1024));
 assert(report.version==='4.3'&&report.publicRelease==='NO_GO'&&report.registrationValidated===false&&report.clinicalValidation===false&&report.geometryPublished===0&&report.held===0&&report.parsed===expectedCount&&report.results?.length===expectedCount);
 assert(report.manifestSHA256===evidence.publisher.manifestSHA256&&sha(read(folder,'FMA2Obj.txt'))===report.manifestSHA256);
 const ids=new Set(),assets=new Map(),items=[];
 for(const proof of evidence.matches){
  const {fj,bp,fma,name,rawSHA256,publisherGLBSHA256,triangles}=proof;
  assert(/^FJ\d+[A-Za-z]?$/.test(fj)&&!ids.has(fj)&&/^BP\d+$/.test(bp)&&/^FMA\d+$/.test(fma)&&typeof name==='string'&&name.trim());ids.add(fj);
  assert(/^[a-f0-9]{64}$/.test(rawSHA256)&&/^[a-f0-9]{64}$/.test(publisherGLBSHA256));
  const row=report.results.find(r=>r.fj===fj);assert(row?.status==='EXACT_SOURCE_ELEMENT_GEOMETRY_MATCH'&&row.bp===bp&&row.fma===fma&&row.name===name&&row.rawSHA256===rawSHA256&&row.glbSHA256===publisherGLBSHA256&&row.triangles===triangles);
  const raw=read(folder,fj+'.obj'),glb=read(folder,fj+'.glb');
  assert(sha(raw)===rawSHA256&&sha(glb)===publisherGLBSHA256,'Dual-source audited bytes differ');
  const source=parseObj(raw.toString('utf8').replace(/\r\n|\r/g,'\n')),positions=parseNativePositions(glb,'4.3');
  assert(source.positions.length/9===triangles&&positions.size===1&&comparePositions(source.positions,positions.get(fj)),'Native geometry replay differs');
  const id='bp43-'+sha(Buffer.from(fj+':'+rawSHA256)).slice(0,24);
  items.push({id,fj,bpId:bp,fmaId:fma,name,triangles,source:'BodyParts3D 4.3',scope:'SINGLE_SOURCE_ELEMENT',coordinateFrame:'native-4.3-not-registered',sourceLicense:'CC-BY-SA-2.1-JP (reported; version-specific review pending)',clinicalValidation:false,registrationValidated:false,approvedForDistribution:false,rawSHA256,glbSHA256:publisherGLBSHA256});
  assets.set(id,{file:path.join(folder,fj+'.glb'),sha256:publisherGLBSHA256,bytes:glb.length});
 }
 assert(assets.size===expectedCount);
 return {inventory:{schema:1,publicRelease:'NO_GO',clinicalValidation:false,registrationValidated:false,scope:'Separate source elements only; no whole-body alignment or full concept claim',items},assets};
}

export function serve43Reference(req,res,registry){
 const prefix='/anatomy/viewer/bp3d43-reference/',p=req.url?.split('?')[0]||'';
 if(!p.startsWith(prefix))return false;
 const send=(status,body,type='text/plain; charset=utf-8')=>{
  res.writeHead(status,{'Content-Type':type,'Content-Length':Buffer.byteLength(body),'Cache-Control':'no-store','X-Content-Type-Options':'nosniff'});
  res.end(req.method==='HEAD'?undefined:body);return true;
 };
 if(!['GET','HEAD'].includes(req.method)||!registry)return send(404,'Not found');
 const rel=p.slice(prefix.length);
 if(rel==='inventory.json')return send(200,JSON.stringify(registry.inventory),'application/json');
 const match=rel.match(/^(bp43-[a-f0-9]{24})\.glb$/),asset=match&&registry.assets.get(match[1]);
 if(!asset)return send(404,'Not found');
 try{
  assert(fs.realpathSync(asset.file)===asset.file&&fs.statSync(asset.file).size===asset.bytes);
  const bytes=fs.readFileSync(asset.file);assert(sha(bytes)===asset.sha256,'Audited asset changed');
  return send(200,bytes,'model/gltf-binary');
 }catch{return send(404,'Reference unavailable');}
}

export function combine43Registries(registries){
 assert(registries.length>=1&&registries.length<=6);
 const items=[],assets=new Map(),fjs=new Set(),hashes=new Set();
 for(const registry of registries){
  assert(registry.inventory.publicRelease==='NO_GO'&&registry.inventory.registrationValidated===false&&registry.inventory.clinicalValidation===false&&registry.assets.size===registry.inventory.items.length);
  for(const e of registry.inventory.items){
   const a=registry.assets.get(e.id);
   assert(a&&a.sha256===e.glbSHA256&&e.approvedForDistribution===false&&e.registrationValidated===false&&e.clinicalValidation===false&&!assets.has(e.id)&&!fjs.has(e.fj)&&!hashes.has(e.rawSHA256),'Repeated or invalid source element');
   fjs.add(e.fj);hashes.add(e.rawSHA256);items.push(e);assets.set(e.id,a);
  }
 }
 assert([12,14,20,23,26,28,32,34,35,37,40,42,43,44,46,48,49,51,52,54,55,57,58,60,62,63,64,65,66,67,69,71,72,74,75,77,78,80,81,83,85,86,87,89,92,94,95,97,101,103,106,109,115,117,129].includes(items.length));
 return {inventory:{schema:1,publicRelease:'NO_GO',registrationValidated:false,clinicalValidation:false,scope:'Separate 4.3 source elements, not registered body geometry',items},assets};
}
