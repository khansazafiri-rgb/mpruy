// Explicit local-only staging and replay of five audited female reference objects.
// No body registration, derived assets, public distribution or legacy cache mutation.
import fs from 'node:fs';
import path from 'node:path';
import assert from 'node:assert/strict';
import {createHash} from 'node:crypto';
import {fileURLToPath} from 'node:url';
import {inspectGlb} from './atlas-onepass-supplementary.mjs';
import {gitBlob} from './audit-hra-female-five.mjs';
const root=new URL('../',import.meta.url),dir='licensing/atlas-publication/';
const read=p=>JSON.parse(fs.readFileSync(p,'utf8'));
const sha=b=>createHash('sha256').update(b).digest('hex');
const source=read(new URL(dir+'hra-female-five-pinned-candidates-20261126.json',root));
const proof=read(new URL(dir+'hra-female-five-pinned-audit-20261126.json',root));
assert(source.publicRelease==='NO_GO'&&proof.publicRelease==='NO_GO'&&proof.matched===5&&proof.held===0&&proof.exactNamedMeshNodes===19&&source.publisherRevision===proof.publisherRevision);
const rows=source.rows.map(s=>{const a=proof.rows.find(x=>x.id===s.id&&x.version===s.version);assert(a?.status==='EXACT_PUBLISHER_AND_PINNED_GLTF_BYTES'&&a.assetURL===s.assetURL&&a.bytes===s.bytes&&a.license===s.sourceLicense&&a.doi===s.doi&&a.approvedForDistribution===false&&a.registrationValidated===false&&a.clinicalValidation===false);assert(/^[a-f0-9]{64}$/.test(a.sha256));return {s,a,id:sha(s.assetURL).slice(0,24)};});
function checkRoot(q){assert(fs.realpathSync(q)===q&&path.basename(q)==='licensing-quarantine','Explicit quarantine root required');}
function verifyBytes(b,s,a){
 assert(b.length===s.bytes&&sha(b)===a.sha256&&gitBlob(b)===s.glbBlob,'Audited HRA bytes changed');
 const info=inspectGlb(b);assert.equal(info.meshCount,a.meshCount);assert.equal(info.nodeCount,a.nodeCount);
 const gltf=JSON.parse(b.subarray(20,20+b.readUInt32LE(12)).toString('utf8'));
 const labels=a.labels.filter(x=>x.status==='EXACT_NAMED_MESH_NODE').map(x=>{
  assert(x.meshNodeIndices.length===1);const index=x.meshNodeIndices[0],n=gltf.nodes[index];assert(n?.name===x.nodeName&&Number.isInteger(n.mesh)&&n.mesh>=0&&n.mesh<gltf.meshes.length);return {index,nodeName:x.nodeName,label:x.label,ontologyId:x.ontologyId};
 });
 assert.equal(labels.length,a.exactMeshNodeCount);
 return labels;
}
export async function stageHraFemaleFive(q){
 fs.mkdirSync(q,{recursive:true,mode:0o700});checkRoot(q);
 const folder=fs.mkdtempSync(path.join(q,'hra-female-five-'));fs.chmodSync(folder,0o700);
 try{
  for(const {s,a,id} of rows){
   const response=await fetch(s.assetURL,{redirect:'error',signal:AbortSignal.timeout(60000)});
   assert(response.ok&&response.url===s.assetURL&&response.body);
   let n=0;const chunks=[];for await(const c of response.body){n+=c.length;assert(n<=s.bytes,'HRA asset too large');chunks.push(c);}
   const b=Buffer.concat(chunks);verifyBytes(b,s,a);
   fs.writeFileSync(path.join(folder,id+'.glb'),b,{flag:'wx',mode:0o600});
  }
  return path.basename(folder);
 }catch(e){fs.rmSync(folder,{recursive:true,force:true});throw e;}
}
export function loadHraFemaleFive(q,folder){
 checkRoot(q);assert(/^hra-female-five-[A-Za-z0-9_-]+$/.test(folder),'Explicit female reference folder required');
 const base=path.join(q,folder);assert(fs.realpathSync(base)===base);
 const assets=new Map();
 for(const {s,a,id} of rows){
  const file=path.join(base,id+'.glb');assert(fs.realpathSync(file)===file&&fs.statSync(file).isFile()&&fs.statSync(file).size===s.bytes);
  const crosswalk=verifyBytes(fs.readFileSync(file),s,a);
  assets.set(id,{file,bytes:a.bytes,sha256:a.sha256,public:{id,name:s.id.replaceAll('-',' '),version:s.version,source:s.assetURL,meshCount:a.meshCount,frame:'HRA female reference source frame (not registered to BP3D)',sourceCrosswalk:crosswalk,sourceLicense:'CC-BY-4.0 (publisher stated; release held)',approvedForDistribution:false,registrationValidated:false}});
 }
 assert.equal(assets.size,5);return {assets,blocked:[]};
}
export function mergeHraFemaleReferences(existing,added){
 const assets=new Map(existing.assets);
 for(const [id,a] of added.assets){
  const old=assets.get(id);
  if(old)assert(old.sha256===a.sha256,'Conflicting HRA version bytes');
  assets.set(id,a);
 }
 return {assets,blocked:[...existing.blocked,...added.blocked]};
}
if(process.argv[1]===fileURLToPath(import.meta.url)){
 assert.deepEqual(process.argv.slice(2),['--stage'],'Explicit --stage only');
 const q=fileURLToPath(new URL('local-data/licensing-quarantine',root));
 const folder=await stageHraFemaleFive(q);console.log('HRA FEMALE PRIVATE FOLDER '+folder);
}
