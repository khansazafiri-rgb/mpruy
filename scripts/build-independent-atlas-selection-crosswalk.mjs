// Private source-element selection crosswalk. No new geometry or public assets.
// Same-tree membership only; names are discovery aids, not clinical equivalence.
import fs from 'node:fs';
import path from 'node:path';
import assert from 'node:assert/strict';
import {createHash,randomUUID} from 'node:crypto';
import {fileURLToPath} from 'node:url';
import {loadIndependentReview,bodyDisplayEntry} from './load-independent-source-review.mjs';
import {loadVerifiedPublisherSources} from './plan-independent-atlas-coverage.mjs';
const root=fs.realpathSync(fileURLToPath(new URL('../',import.meta.url))),q=path.join(root,'local-data/licensing-quarantine');
const hash=b=>createHash('sha256').update(b).digest('hex');
const focusRules={
 respiratory:/\b(?:lung|pulmonary lobe|bronchus|bronchi|bronchial|trachea|larynx|pleura|pleural|bronchiole)\b/i,
 lymphatic:/\b(?:lymphatic|lymph node|lymph nodes|thoracic duct|cisterna chyli|spleen|thymus)\b/i,
 nervous:/\b(?:nerve|nerves|plexus|ganglion|ganglia|spinal cord|brain|cerebrum|cerebellum|pons|medulla oblongata|midbrain|brainstem)\b/i,
 joints:/\b(?:joint|articulation|ligament|meniscus|intervertebral disc)\b/i,
 muscular:/\b(?:muscle|tendon|aponeurosis)\b/i,
 heart:/\b(?:heart|atrium|ventricle|myocardium|mitral|tricuspid|aortic valve|pulmonary valve)\b/i
};
const focus=Object.keys(focusRules);
const add=(map,k,v)=>{const a=map.get(k)||[];a.push(v);map.set(k,a);};
const key=(tree,id)=>tree+':'+id;
export function createCrosswalk(body,sources,heldRows=[]){
 const byFma=new Map(),owners=new Map(),sourceConcepts=new Map(),heldGroups=new Map();
 for(const row of heldRows){if(row.status==='OVERLAPPING_ELEMENT_REVIEW'&&focus.includes(row.group))add(heldGroups,row.fmaId,row.group);}
 for(const m of body){
  const displayId=bodyDisplayEntry(m).id;
  assert(!byFma.has(m.fmaId),'Duplicate body FMA');
  byFma.set(m.fmaId,m);
  for(const e of m.sourceElements)add(owners,key(m.sourceTree,e.id),{modelId:m.id,displayId,group:m.group,elementId:e.id});
 }
 for(const s of sources)for(const n of s.names){
  const ids=[...(s.elements.get(n.fmaId)||[])].sort();
  if(!ids.length||!ids.every(id=>s.archiveIndex.has(id)))continue;
  add(sourceConcepts,n.fmaId,{...n,tree:s.tree,elementIds:ids});
 }
 const rows=[];
 for(const [fmaId,reps] of sourceConcepts){
  const m=byFma.get(fmaId),suggestions=new Set(heldGroups.get(fmaId)||[]);
  for(const n of reps)for(const [g,re] of Object.entries(focusRules))if(re.test(n.name))suggestions.add(g);
  if(m&&focus.includes(m.group))suggestions.add(m.group);
  if(!suggestions.size)continue;
  // If already exported, only its exact publisher representation is eligible.
  // Otherwise prefer ISA, matching the existing exporter, without guessing identity.
  const preferred=m?reps.filter(r=>r.tree===m.sourceTree&&r.bpId===m.bpId&&r.name===m.name):reps.some(r=>r.tree==='isa')?reps.filter(r=>r.tree==='isa'):reps;
  const common={fmaId,groups:[...suggestions].sort(),names:[...new Set(reps.map(r=>r.name))],clinicalValidation:false,approvedForDistribution:false};
  if(preferred.length!==1){rows.push({...common,status:'AMBIGUOUS_REPRESENTATION',choices:preferred});continue;}
  const r=preferred[0],bindings=[],missing=[],ambiguous=[];
  for(const id of r.elementIds){
   const hits=owners.get(key(r.tree,id))||[];
   if(hits.length===1)bindings.push(hits[0]);
   else if(hits.length===0)missing.push(id);
   else ambiguous.push({elementId:id,owners:hits});
  }
  const status=ambiguous.length?'AMBIGUOUS_ELEMENT_OWNERSHIP':missing.length?(bindings.length?'PARTIAL_SOURCE_ELEMENTS':'NO_DISPLAYED_SOURCE_ELEMENTS'):m?'EXISTING_FMA':'FULL_ELEMENT_SELECTION_CANDIDATE';
  rows.push({...common,name:r.name,bpId:r.bpId,tree:r.tree,status,elementIds:r.elementIds,bindings,missing,ambiguous,existingModelId:m?.id||null});
 }
 rows.sort((a,b)=>a.fmaId.localeCompare(b.fmaId));
 const systems=Object.fromEntries(focus.map(g=>{
  const relevant=rows.filter(r=>r.groups.includes(g)),counts={};
  for(const r of relevant)counts[r.status]=(counts[r.status]||0)+1;
  return [g,{concepts:relevant.length,counts,unrepresented:relevant.filter(r=>['PARTIAL_SOURCE_ELEMENTS','NO_DISPLAYED_SOURCE_ELEMENTS'].includes(r.status)).map(r=>({name:r.name,fmaId:r.fmaId,tree:r.tree,missing:r.missing.length})),selectableCandidates:relevant.filter(r=>r.status==='FULL_ELEMENT_SELECTION_CANDIDATE').map(r=>({name:r.name,fmaId:r.fmaId,tree:r.tree,elements:r.elementIds.length}))}];
 }));
 return {schema:1,scope:'Exact publisher element membership within same archive tree only. Provisional name discovery, not anatomical classification or clinical validation. No new model export.',publicRelease:'NO_GO',clinicalValidation:false,rows,systems};
}
export function run(folder){
 assert(/^independent-source-review-[A-Za-z0-9_-]+$/.test(folder));
 const pack=loadIndependentReview(q,folder),sources=loadVerifiedPublisherSources(pack.folder);
 const read=(rel)=>{const p=path.join(pack.folder,rel);assert(fs.realpathSync(p)===p&&fs.statSync(p).isFile());return fs.readFileSync(p);};
 const inventoryHash=hash(read('inventory.json'));
 const held=pack.inventory.expansion?JSON.parse(read('evidence/expansion-plan.json')).rows:[];
 const result=createCrosswalk(pack.inventory.bodyModels,sources,held);
 result.sourcePack=folder;result.inventorySHA256=inventoryHash;result.bodyModels=pack.inventory.bodyModels.length;
 result.hraReferences=pack.inventory.independentReferences.map(r=>({id:r.id,name:r.name,frame:'Independent HRA source frame',registrationValidated:false,approvedForDistribution:false}));
 const out=path.join(pack.folder,'selection-crosswalk-'+randomUUID()+'.json');
 fs.writeFileSync(out,JSON.stringify(result,null,2)+'\n',{flag:'wx',mode:0o600});
 const compact={...result,rows:undefined,hraReferences:undefined,systems:Object.fromEntries(Object.entries(result.systems).map(([g,s])=>[g,{concepts:s.concepts,counts:s.counts,unrepresentedExamples:s.unrepresented.slice(0,8),selectableExamples:s.selectableCandidates.slice(0,8)}])),file:out};
 console.log('ATLAS SELECTION CROSSWALK',JSON.stringify(compact));return result;
}
if(process.argv[1]===fileURLToPath(import.meta.url))run(process.argv[2]||'');
