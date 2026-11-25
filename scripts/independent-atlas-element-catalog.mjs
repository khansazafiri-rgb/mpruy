// Same-archive exact-element selection: additional concepts without duplicate geometry.
import assert from 'node:assert/strict';
import {createHash} from 'node:crypto';
import {loadVerifiedPublisherSources} from './plan-independent-atlas-coverage.mjs';
import {bodyDisplayEntry} from './load-independent-source-review.mjs';
const hash=s=>createHash('sha256').update(s).digest('hex');
export function buildElementCatalog(body,sources){
 const existing=new Set(body.map(m=>m.fmaId)),owners=new Map(),byFma=new Map(),items=[];
 for(const m of body){
  const e=bodyDisplayEntry(m);
  for(const p of m.sourceElements){
   const k=m.sourceTree+':'+p.id;
   const list=owners.get(k)||[];list.push({ownerId:e.id,elementId:p.id,group:m.group});owners.set(k,list);
  }
 }
 for(const s of sources)for(const n of s.names){
  if(existing.has(n.fmaId))continue;
  const ids=[...(s.elements.get(n.fmaId)||[])].sort();
  if(!ids.length||!ids.every(id=>s.archiveIndex.has(id)))continue;
  const bindings=ids.map(id=>owners.get(s.tree+':'+id)||[]);
  if(bindings.some(b=>b.length!==1))continue;
  const parts=bindings.map(b=>b[0]),groups=new Set(parts.map(b=>b.group));
  // Do not infer a system for a concept crossing tissue groups.
  if(groups.size!==1)continue;
  const group=parts[0].group;
  const entry={id:'sel-'+hash(s.tree+':'+n.fmaId+':'+n.bpId).slice(0,24),name:n.name,fmaId:n.fmaId,bpId:n.bpId,group,sourceTree:s.tree,regions:['whole'],selectionOnly:true,bindings:parts.map(({ownerId,elementId})=>({ownerId,elementId})),approvedForDistribution:false,clinicalValidation:false,classificationProvisional:true};
  const a=byFma.get(n.fmaId)||[];a.push(entry);byFma.set(n.fmaId,a);
 }
 for(const all of byFma.values()){
  const preferred=all.some(e=>e.sourceTree==='isa')?all.filter(e=>e.sourceTree==='isa'):all;
  if(preferred.length===1)items.push(preferred[0]);
 }
 items.sort((a,b)=>a.name.localeCompare(b.name)||a.id.localeCompare(b.id));
 assert(new Set(items.map(e=>e.id)).size===items.length);
 return {schema:1,publicRelease:'NO_GO',clinicalValidation:false,items};
}
export function createElementCatalog(pack){return buildElementCatalog(pack.inventory.bodyModels,loadVerifiedPublisherSources(pack.folder));}
