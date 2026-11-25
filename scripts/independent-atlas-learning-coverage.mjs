// Count evidence-backed teaching checkpoints, not a percentage of human anatomy.
import assert from 'node:assert/strict';
import {groups} from '../apps/atlas-independent/src/inventory.js';
import {priorityPlan,priorityTargets} from './independent-atlas-priority-recovery.mjs';
import {learningPriorityTargets} from './atlas-learning-priority-targets.mjs';
import {checkpoints} from './audit-independent-system-coverage.mjs';
const key=n=>String(n).trim().toLowerCase().replace(/\s+/g,' ');
export function learningCoverage({sources,body,selection=[],recovery=[],results=[],specs}){
 const all=specs||[...priorityTargets,...learningPriorityTargets,...Object.entries(checkpoints).flatMap(([g,rows])=>rows.map(([, ...names])=>[g,names]))];
 const unique=new Map();
 for(const s of all){const k=s[0]+':'+key(s[1][0]),prior=unique.get(k);if(!prior){unique.set(k,[s[0],[...s[1]],s[2],s[3]]);continue;}assert(!prior[2]||!s[2]||prior[2]===s[2],'Conflicting checkpoint identity');assert(!prior[3]||!s[3]||prior[3]===s[3],'Conflicting checkpoint tree');unique.set(k,[s[0],[...new Set([...prior[1],...s[1]])],prior[2]||s[2],prior[3]||s[3]]);}
 const resolved=priorityPlan(sources,[...unique.values()]);
 const byFma=new Map();
 const add=(e,type)=>{const a=byFma.get(e.fmaId)||[];a.push({id:e.id,name:e.name,group:e.group,type});byFma.set(e.fmaId,a);};
 body.forEach(e=>add(e,'BODY_MODEL'));selection.forEach(e=>add(e,'EXACT_ELEMENT_SELECTION'));
 recovery.forEach(e=>add(e,e.contextCandidate?'NATIVE_CONTEXT_CANDIDATE':'ISOLATED_REFERENCE'));
 const rows=resolved.map(p=>{
  const candidates=p.fmaId?byFma.get(p.fmaId)||[]:[];
  const matches=candidates.filter(e=>e.group===p.group);
  const reasons=results.filter(r=>r.fmaId&&r.fmaId===p.fmaId).map(r=>({status:r.status,reason:r.reason||null}));
  const status=p.status!=='EXPORT_CANDIDATE'?p.status:matches.length?matches[0].type:candidates.length?'GROUP_REVIEW':reasons.some(r=>r.status==='HOLD_EXPORT'||r.status==='HOLD_STORAGE_BUDGET')?'EXPORT_HELD':'SOURCE_AVAILABLE_NOT_EXPORTED';
  return {group:p.group,target:p.target,status,fmaId:p.fmaId||null,officialName:p.name||null,representations:matches,otherGroupRepresentations:candidates.filter(e=>e.group!==p.group),recoveryEvidence:reasons};
 });
 const systems=Object.fromEntries(Object.keys(groups).map(g=>{
  const r=rows.filter(x=>x.group===g),counts={};for(const x of r)counts[x.status]=(counts[x.status]||0)+1;
  return [g,{targets:r.length,counts,unresolved:r.filter(x=>!['BODY_MODEL','EXACT_ELEMENT_SELECTION','NATIVE_CONTEXT_CANDIDATE','ISOLATED_REFERENCE'].includes(x.status)).map(x=>({target:x.target,status:x.status,fmaId:x.fmaId}))}];
 }));
 assert(Object.values(systems).reduce((n,s)=>n+s.targets,0)===rows.length);
 return {schema:1,publicRelease:'NO_GO',clinicalValidation:false,registrationValidated:false,lymphaticNetworkContinuity:'NOT_VERIFIED',scope:'Exact publisher checkpoint identity and currently available representations only; isolated references are not whole-body coverage; no completeness percentage.',targets:rows.length,systems,rows};
}
