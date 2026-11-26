// Guided learning from verified inventory links only. No guessed identity,
// clinical completeness claim, or score for an unavailable representation.
import {permittedLearningGroup} from './learning-links.js';
const kinds=new Set(['BODY_MODEL','EXACT_ELEMENT_SELECTION','NATIVE_CONTEXT_CANDIDATE','ISOLATED_REFERENCE']);
const validId=id=>/^(bp|sel)-[a-f0-9]{24}$/.test(id||'');
export function guidedTracks(doc,entries,groups){
 if(doc?.schema!==1||doc.publicRelease!=='NO_GO'||doc.clinicalValidation!==false||doc.registrationValidated!==false||!Array.isArray(doc.rows)||doc.rows.length!==doc.targets||doc.rows.length>3000)throw Error('Laporan belajar tidak valid');
 const byId=new Map(entries.map(e=>[e.id,e])),seen=new Set(),tracks=new Map(Object.entries(groups).map(([id,label])=>[id,{id,label,steps:[]}]));
 for(const r of doc.rows){
  if(!tracks.has(r.group)||typeof r.target!=='string'||!r.target.trim()||typeof r.status!=='string'||!Array.isArray(r.representations))throw Error('Checkpoint tidak valid');
  const key=r.group+':'+r.target.trim().toLowerCase();if(seen.has(key))throw Error('Checkpoint duplikat');seen.add(key);
  const candidates=[];
  if(kinds.has(r.status)&&/^FMA\d+$/.test(r.fmaId||''))for(const a of r.representations){
   const e=byId.get(a.id);
   if(!validId(a.id)||!e||e.fmaId!==r.fmaId||!permittedLearningGroup(r.fmaId,r.group,e.group)||a.group!==e.group||a.name!==e.name||!kinds.has(a.type)||e.approvedForDistribution!==false)continue;
   const type=e.selectionOnly?'EXACT_ELEMENT_SELECTION':e.contextCandidate?'NATIVE_CONTEXT_CANDIDATE':e.priorityOnly?'ISOLATED_REFERENCE':'BODY_MODEL';
   if(type!==a.type||candidates.some(c=>c.id===e.id))continue;
   candidates.push({id:e.id,type,name:e.name});
  }
  tracks.get(r.group).steps.push({key,target:r.target,fmaId:r.fmaId||null,status:r.status,representations:candidates});
 }
 return [...tracks.values()].filter(t=>t.steps.length);
}
export function guidedProgress(track,visited){
 const available=track.steps.filter(s=>s.representations.length);
 return {total:track.steps.length,available:available.length,visited:available.filter(s=>visited.has(s.key)).length,held:track.steps.length-available.length};
}
