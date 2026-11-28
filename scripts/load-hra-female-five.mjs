// Explicit local-only staging and replay of five audited female reference objects.
// No body registration, derived assets, public distribution or legacy cache mutation.
import fs from 'node:fs';
import path from 'node:path';
import assert from 'node:assert/strict';
import {createHash} from 'node:crypto';
import {fileURLToPath} from 'node:url';
import {inspectGlb} from './atlas-onepass-supplementary.mjs';
import {gitBlob} from './audit-hra-female-five.mjs';
import {verifyHraGroupRows} from '../apps/atlas-independent/src/reference-state.js';
const root=new URL('../',import.meta.url),dir='licensing/atlas-publication/';
const read=p=>JSON.parse(fs.readFileSync(p,'utf8'));
const sha=b=>createHash('sha256').update(b).digest('hex');
const configs={
 'female-five':{source:'hra-female-five-pinned-candidates-20261126.json',proof:'hra-female-five-pinned-audit-20261126.json',count:5,labels:19},
 'cardiopulmonary-four':{source:'hra-cardiopulmonary-four-pinned-candidates-20261126.json',proof:'hra-cardiopulmonary-four-source-audit-20261126.json',count:4,labels:141},
 'urogenital-7':{source:'hra-urogenital-7-pinned-candidates-20261126.json',proof:'hra-urogenital-7-pinned-audit-20261126.json',count:7,labels:123,expanded:true},
 'ureter-four':{source:'hra-ureter-four-pinned-candidates-20261126.json',proof:'hra-ureter-four-pinned-audit-20261126.json',count:4,labels:58,expanded:true},
 'cns-four':{source:'hra-cns-four-pinned-candidates-20261126.json',proof:'hra-cns-four-pinned-audit-20261126.json',count:4,labels:265,expanded:true},
 'digestive-six':{source:'hra-digestive-six-pinned-candidates-20261127.json',proof:'hra-digestive-six-pinned-audit-20261127.json',count:6,labels:66,expanded:true},
 'knee-larynx-six':{source:'hra-knee-larynx-six-pinned-candidates-20261127.json',proof:'hra-knee-larynx-six-pinned-audit-20261127.json',count:6,labels:70,expanded:true},
 'tonsil-four':{source:'hra-tonsil-four-pinned-candidates-20261127.json',proof:'hra-tonsil-four-pinned-audit-20261127.json',count:4,labels:4,expanded:true},
 'pelvis-two':{source:'hra-pelvis-two-pinned-candidates-20261127.json',proof:'hra-pelvis-two-pinned-audit-20261127.json',count:2,labels:28,expanded:true}
};
function batchRows(batch){
 assert(Object.hasOwn(configs,batch),'Unknown HRA reference batch');
 const c=configs[batch],source=read(new URL(dir+c.source,root)),proof=read(new URL(dir+c.proof,root));
 assert(source.publicRelease==='NO_GO'&&proof.publicRelease==='NO_GO'&&source.rows.length===c.count&&proof.rows.length===c.count&&proof.matched===c.count&&proof.held===0&&proof.exactNamedMeshNodes===c.labels&&source.publisherRevision===proof.publisherRevision);
 if(c.expanded)assert(proof.conclusion==='success'&&proof.browserReplayVerified===false&&Number.isSafeInteger(proof.workflowRun)&&Number.isSafeInteger(proof.workflowJob));
 const rows=source.rows.map(s=>{const a=proof.rows.find(x=>x.id===s.id&&x.version===s.version);assert(a?.status==='EXACT_PUBLISHER_AND_PINNED_GLTF_BYTES'&&a.assetURL===s.assetURL&&a.bytes===s.bytes&&a.license===s.sourceLicense&&a.doi===s.doi&&a.approvedForDistribution===false&&a.registrationValidated===false&&a.clinicalValidation===false);assert(/^[a-f0-9]{64}$/.test(a.sha256));return {s,a,id:sha(s.assetURL).slice(0,24)};});
 assert.equal(new Set(rows.map(r=>r.id)).size,c.count);
 return rows;
}
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
export async function stageHraBatch(q,batch){
 const rows=batchRows(batch);
 fs.mkdirSync(q,{recursive:true,mode:0o700});checkRoot(q);
 const folder=fs.mkdtempSync(path.join(q,'hra-'+batch+'-'));fs.chmodSync(folder,0o700);
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
export function loadHraBatch(q,folder,batch,includeGroups=false){
 const rows=batchRows(batch);checkRoot(q);const prefix='hra-'+batch+'-';assert(typeof folder==='string'&&folder.startsWith(prefix)&&/^[A-Za-z0-9_-]+$/.test(folder.slice(prefix.length)),'Explicit matching reference folder required');
 const base=path.join(q,folder);assert(fs.realpathSync(base)===base);
 const expanded=configs[batch].expanded===true;
 assert(!includeGroups||!['tonsil-four','pelvis-two'].includes(batch),'No retained group audit for this batch');
 const groupProof=includeGroups?read(new URL(dir+(expanded?'hra-'+batch+'-group-audit-20261127.json':'hra-source-group-hierarchy-audit-20261126.json'),root)):null;
 if(groupProof){assert(groupProof.publicRelease==='NO_GO');if(expanded){const expected={'urogenital-7':26,'ureter-four':12,'cns-four':12,'digestive-six':14,'knee-larynx-six':16}[batch];assert(groupProof.batch===batch&&groupProof.conclusion==='success'&&groupProof.sourceObjects===rows.length&&groupProof.rows.length===rows.length&&groupProof.exactSourceGroups===expected&&groupProof.remainingHeld===0&&groupProof.clinicalValidation===false&&groupProof.registrationValidated===false&&groupProof.rows.reduce((n,r)=>n+r.groups.length,0)===expected);}else assert(groupProof.exactSourceGroups===37&&groupProof.remainingHeld===1&&groupProof.sourceObjects===9);}
 const assets=new Map();
 for(const {s,a,id} of rows){
  const file=path.join(base,id+'.glb');assert(fs.realpathSync(file)===file&&fs.statSync(file).isFile()&&fs.statSync(file).size===s.bytes);
  const bytes=fs.readFileSync(file),crosswalk=verifyBytes(bytes,s,a);let sourceGroups;
  if(groupProof){const p=groupProof.rows.find(x=>x.assetURL===s.assetURL&&x.sha256===a.sha256&&x.id===s.id);assert(p,'Group evidence does not bind to exact source');if(expanded){const held=a.labels.filter(x=>x.status!=='EXACT_NAMED_MESH_NODE');assert(p.groups.length===held.length&&p.groups.every(g=>g.status==='EXACT_SOURCE_GROUP_DESCENDANTS'&&held.some(x=>x.nodeName===g.nodeName&&x.ontologyId===g.ontologyId&&x.label===g.label)));}const gltf=JSON.parse(bytes.subarray(20,20+bytes.readUInt32LE(12)).toString('utf8'));sourceGroups=p.groups.filter(x=>x.status==='EXACT_SOURCE_GROUP_DESCENDANTS').map(({index,nodeName,label,ontologyId,descendantMeshes})=>({index,nodeName,label,ontologyId,descendantMeshes}));verifyHraGroupRows(gltf,sourceGroups);}
  assets.set(id,{file,bytes:a.bytes,sha256:a.sha256,public:{id,name:s.id.replaceAll('-',' '),version:s.version,source:s.assetURL,meshCount:a.meshCount,frame:'HRA '+(s.id.includes('-female')?'female':'male')+' reference source frame (not registered to BP3D)',sourceCrosswalk:crosswalk,...(a.sourceMethod?{sourceMethod:a.sourceMethod,clinicalLimitations:a.clinicalLimitations||[]}:{}),...(includeGroups?{sourceGroups}:{}),sourceLicense:'CC-BY-4.0 (publisher stated; release held)',approvedForDistribution:false,registrationValidated:false}});
 }
 assert.equal(assets.size,rows.length);return {assets,blocked:[]};
}
export const stageHraFemaleFive=q=>stageHraBatch(q,'female-five');
export const loadHraFemaleFive=(q,folder,groups=false)=>loadHraBatch(q,folder,'female-five',groups);
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
 const args=process.argv.slice(2);assert(args[0]==='--stage'&&args.length<=2,'Explicit --stage [batch] only');
 const q=fileURLToPath(new URL('local-data/licensing-quarantine',root));
 const folder=await stageHraBatch(q,args[1]||'female-five');console.log('HRA PRIVATE FOLDER '+folder);
}
