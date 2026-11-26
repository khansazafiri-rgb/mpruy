// Audit only exact named source hierarchy. No clinical group or spatial registration claim.
import fs from 'node:fs';
import path from 'node:path';
import assert from 'node:assert/strict';
import {fileURLToPath} from 'node:url';
import {stageHraBatch,loadHraBatch} from './load-hra-female-five.mjs';
const root=new URL('../',import.meta.url),dir='licensing/atlas-publication/';
export function resolveSourceGroups(gltf,labels){
 const nodes=gltf.nodes||[],meshes=gltf.meshes||[];
 assert(nodes.length<=10000&&meshes.length<=10000,'Source graph cap');
 const parents=new Map();
 for(const [i,n] of nodes.entries()){
  assert(!n.children||Array.isArray(n.children),'Invalid source children');
  if(n.mesh!==undefined)assert(Number.isInteger(n.mesh)&&n.mesh>=0&&n.mesh<meshes.length,'Invalid source mesh');
  for(const child of n.children||[]){assert(Number.isInteger(child)&&child>=0&&child<nodes.length&&!parents.has(child),'Repeated/invalid source parent');parents.set(child,i);}
 }
 const scene=gltf.scenes?.[gltf.scene??0];assert(scene&&Array.isArray(scene.nodes),'Missing default source scene');
 const reachable=new Set(),active=new Set();
 function visit(i){assert(Number.isInteger(i)&&i>=0&&i<nodes.length&&!active.has(i)&&!reachable.has(i),'Repeated/cyclic source scene node');active.add(i);reachable.add(i);for(const c of nodes[i].children||[])visit(c);active.delete(i);}
 for(const i of scene.nodes){assert(!parents.has(i),'Scene root is a child');visit(i);}
 const result=[];
 for(const row of labels.filter(x=>x.status!=='EXACT_NAMED_MESH_NODE')){
  const hits=nodes.map((n,i)=>({n,i})).filter(x=>x.n.name===row.nodeName);
  const base={nodeName:row.nodeName,ontologyId:row.ontologyId,label:row.label};
  if(hits.length!==1||!reachable.has(hits[0].i)||hits[0].n.mesh!==undefined){result.push({...base,status:'HOLD_NO_UNIQUE_SOURCE_GROUP'});continue;}
  const descendants=[];
  function collect(i){const n=nodes[i];if(Number.isInteger(n.mesh))descendants.push({index:i,nodeName:n.name??null,meshIndex:n.mesh});for(const c of n.children||[])collect(c);}
  for(const i of hits[0].n.children||[])collect(i);
  if(!descendants.length||descendants.some(x=>!reachable.has(x.index))){result.push({...base,status:'HOLD_EMPTY_SOURCE_GROUP'});continue;}
  result.push({...base,index:hits[0].i,descendantMeshes:descendants,status:'EXACT_SOURCE_GROUP_DESCENDANTS',clinicalValidation:false,registrationValidated:false});
 }
 return result;
}
export async function auditGroups(){
 const q=fileURLToPath(new URL('local-data/licensing-quarantine',root)),staged=[],rows=[];
 try{
  for(const [batch,receipt] of [['female-five','hra-female-five-pinned-audit-20261126.json'],['cardiopulmonary-four','hra-cardiopulmonary-four-source-audit-20261126.json']]){
   const folder=await stageHraBatch(q,batch);staged.push(path.join(q,folder));const registry=loadHraBatch(q,folder,batch);
   const report=JSON.parse(fs.readFileSync(new URL(dir+receipt,root),'utf8'));
   for(const a of registry.assets.values()){
    const proof=report.rows.find(x=>x.assetURL===a.public.source&&x.sha256===a.sha256);assert(proof);
    const b=fs.readFileSync(a.file),doc=JSON.parse(b.subarray(20,20+b.readUInt32LE(12)).toString('utf8'));
    const groups=resolveSourceGroups(doc,proof.labels);
    rows.push({id:proof.id,assetURL:proof.assetURL,sha256:proof.sha256,groups});
   }
  }
  const all=rows.flatMap(x=>x.groups);
  assert.equal(rows.length,9);assert.equal(all.length,38);
  const result={schema:1,sourceObjects:9,heldLabelRows:all.length,exactSourceGroups:all.filter(x=>x.status==='EXACT_SOURCE_GROUP_DESCENDANTS').length,remainingHeld:all.filter(x=>x.status!=='EXACT_SOURCE_GROUP_DESCENDANTS').length,scope:'Exact source hierarchy only; overlapping ancestor/descendant groups are not unique anatomy or medically validated completeness.',rows,clinicalValidation:false,registrationValidated:false,publicRelease:'NO_GO'};
  console.log('HRA EXACT SOURCE GROUP AUDIT '+JSON.stringify(result));return result;
 }finally{for(const p of staged)fs.rmSync(p,{recursive:true,force:true});}
}
if(process.argv[1]===fileURLToPath(import.meta.url))await auditGroups();
