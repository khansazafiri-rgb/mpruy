// Exact retained source and extracted-byte evidence only; local quarantine.
import fs from 'node:fs';
import path from 'node:path';
import assert from 'node:assert/strict';
import {createHash} from 'node:crypto';
import {fileURLToPath} from 'node:url';
const dir=new URL('../licensing/atlas-publication/',import.meta.url);
const read=name=>JSON.parse(fs.readFileSync(new URL(name,dir),'utf8'));
const sha=bytes=>createHash('sha256').update(bytes).digest('hex');
export function expectedPriorityMeshes(){
 const proof=read('hra-priority-isolation-roundtrip-audit-20261127.json'),plan=read('hra-united-mouth-priority-extraction-plan-20261127.json'),manifest=read('hra-united-pelvis-mouth-gap-discovery-20261127.json');
 for(const d of [proof,plan,manifest])assert.equal(d.publicRelease,'NO_GO');
 assert.equal(proof.isolatedMeshes,15);assert.equal(proof.clinicalValidation,false);assert.equal(proof.registrationValidated,false);
 const expected=new Map();
 for(const item of plan.rows){
  const matches=manifest.rows.filter(r=>r.id===item.id),receipts=proof.rows.filter(r=>r.id===item.id);assert.equal(matches.length,1);assert.equal(receipts.length,1);
  const [r]=matches,[p]=receipts;assert.equal(p.sourceSHA256,item.sourceSHA256);assert.equal(p.approvedForDistribution,false);assert.equal(p.materialsPreserved,false);assert.equal(p.geometryPersisted,false);assert.equal(p.results.length,item.targets.length);
  for(const t of item.targets){
   const hits=p.results.filter(x=>x.nodeIndex===t.nodeIndex&&x.ontologyId===t.ontologyId&&x.label===t.label);assert.equal(hits.length,1);
   const [a]=hits;assert.equal(a.status,'EXACT_GEOMETRY_AND_TRANSFORM_CHAIN_ROUNDTRIP');assert(/^[a-f0-9]{64}$/.test(a.isolatedSHA256)&&a.isolatedBytes>0&&a.isolatedBytes<=1024*1024);
   const id=sha(r.sourceURL+'#isolated-node='+t.nodeIndex).slice(0,24);assert(!expected.has(id));
   expected.set(id,{id,source:r.sourceURL,version:r.version,sourceId:r.id,sourceSHA256:item.sourceSHA256,sha256:a.isolatedSHA256,bytes:a.isolatedBytes,originalNodeIndex:t.nodeIndex,nodeName:t.nodeName,label:t.label,ontologyId:t.ontologyId,triangles:t.orderedLocalPrimitiveFingerprints.reduce((n,p)=>n+p.triangles,0),doi:r.doi,license:r.sourceLicense});
  }
 }
 assert.equal(expected.size,15);assert.equal([...expected.values()].reduce((n,x)=>n+x.bytes,0),proof.totalIsolatedBytes);return expected;
}
export function validatePriorityFile(bytes,e){
 assert.equal(bytes.length,e.bytes);assert.equal(sha(bytes),e.sha256);
 assert.equal(bytes.toString('ascii',0,4),'glTF');assert.equal(bytes.readUInt32LE(4),2);assert.equal(bytes.readUInt32LE(8),bytes.length);
 const end=20+bytes.readUInt32LE(12);assert(end+8<=bytes.length&&bytes.toString('ascii',16,20)==='JSON');
 const doc=JSON.parse(bytes.subarray(20,end).toString('utf8'));assert.equal(doc.meshes.length,1);
 const selected=doc.nodes.map((n,i)=>({n,i})).filter(x=>x.n.mesh!==undefined);assert.equal(selected.length,1);assert.equal(selected[0].n.mesh,0);assert.equal(selected[0].n.name,e.nodeName);
 assert.equal(doc.meshes[0].primitives.reduce((sum,p)=>sum+doc.accessors[p.indices].count/3,0),e.triangles);
 return {id:e.id,name:e.label+' · '+e.sourceId+' · isolated geometry only',source:e.source,version:e.version,meshCount:1,triangles:e.triangles,sha256:e.sha256,sourceSHA256:e.sourceSHA256,originalNodeIndex:e.originalNodeIndex,geometryOnly:true,materialsPreserved:false,approvedForDistribution:false,registrationValidated:false,clinicalValidation:false,doi:e.doi,sourceLicense:e.license,componentLineage:'PENDING_SOURCE_COMPONENT_REVIEW',sourceCrosswalk:[{index:selected[0].i,nodeName:e.nodeName,label:e.label,ontologyId:e.ontologyId}]};
}
export function loadPriorityHra(q,folder){
 assert.equal(fs.realpathSync(q),q);assert.equal(path.basename(q),'licensing-quarantine');assert(/^hra-priority-isolated-[A-Za-z0-9_-]+$/.test(folder),'Explicit exact priority folder required');
 const local=path.join(q,folder);assert.equal(fs.realpathSync(local),local);assert(fs.statSync(local).isDirectory());assert(!(fs.statSync(local).mode&0o077),'Private directory permissions required');
 const expected=expectedPriorityMeshes(),files=fs.readdirSync(local).sort();assert.deepEqual(files,[...expected.keys()].map(id=>id+'.glb').sort(),'Exact file set required');
 const assets=new Map();for(const [id,e] of expected){const file=path.join(local,id+'.glb');assert.equal(fs.realpathSync(file),file);assert(fs.statSync(file).isFile());const bytes=fs.readFileSync(file);const entry=validatePriorityFile(bytes,e);assets.set(id,{file,bytes:e.bytes,sha256:e.sha256,public:entry});}
 return {assets,blocked:[]};
}
