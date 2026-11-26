// Private source review queue. Never exports, serves, registers or approves geometry.
import assert from 'node:assert/strict';
import fs from 'node:fs';
import {diagnoseSourceGaps} from './independent-atlas-source-gap-diagnostics.mjs';
const key=s=>String(s).trim().toLowerCase().replace(/\s+/g,' ');
const read=name=>JSON.parse(fs.readFileSync(new URL('../licensing/atlas-publication/checkpoint-evidence/'+name,import.meta.url),'utf8'));
export function retainedNerveCandidates(){
 const z=read('z-anatomy-native-nerve-lymphatic-audit-20261126.json'),o=read('open3dmodel-lower-limb-private-draco-audit-20261126.json');
 assert(z.publicRelease==='NO_GO'&&o.publicRelease==='NO_GO'&&z.assetRightsReviewed===false&&o.assetRightsReviewed===false&&z.geometryExported===0&&o.geometryExported===0);
 assert(z.clinicalValidation===false&&o.clinicalValidation===false&&z.registrationValidated===false&&o.registrationValidated===false);
 const candidates=new Map();
 for(const r of z.nerveRows){assert(!candidates.has(key(r.target)));candidates.set(key(r.target),[]);if(r.status!=='EVALUATED_SOURCE_SURFACE')continue;assert(r.sourceObjects.length===1&&r.approvedForDistribution===false&&Number.isSafeInteger(r.triangles)&&r.triangles>0&&/^[a-f0-9]{64}$/.test(r.sourcePositionSHA256));candidates.get(key(r.target)).push({source:'Z-Anatomy',identity:r.sourceObjects[0].name,triangles:r.triangles,sourcePositionSHA256:r.sourcePositionSHA256,workflowRun:z.workflowRun,sourceStatus:r.status,assetRightsReviewed:false});}
 for(const r of o.rows){assert(r.side==='right'&&r.status==='EXACT_SOURCE_DRACO_DECODE'&&r.approvedForDistribution===false&&Number.isSafeInteger(r.triangles)&&r.triangles>0);const target=key(r.side+' '+r.target);assert(candidates.has(target));candidates.get(target).push({source:'Open3DModel',identity:r.sourceName,nodeIndex:r.nodeIndex,meshIndex:r.meshIndex,triangles:r.triangles,sourceSHA256:o.sourceSHA256,workflowRun:o.workflowRun,sourceStatus:r.status,assetRightsReviewed:false});}
 assert.equal(candidates.size,28);assert.equal([...candidates.values()].filter(a=>a.length).length,27);
 return {candidates,lymphatic:{source:'Z-Anatomy',targets:z.lymphaticTargets,summary:z.lymphaticSummary,scope:'Exact checked source labels only; not absence in all datasets.'}};
}
const available=new Set(['BODY_MODEL','EXACT_ELEMENT_SELECTION','ISOLATED_REFERENCE','NATIVE_CONTEXT_CANDIDATE']);
export function buildSourceReviewQueue(coverage,sources){
 assert(coverage.publicRelease==='NO_GO'&&coverage.registrationValidated===false&&coverage.clinicalValidation===false&&coverage.targets===coverage.rows.length);
 const {candidates,lymphatic}=retainedNerveCandidates();
 const unresolved=coverage.rows.filter(r=>!available.has(r.status)&&!r.referenceCandidates?.length&&!r.hraCandidates?.length);
 const diagnostics=diagnoseSourceGaps(sources,unresolved.map(r=>[r.group,[key(r.target)],r.fmaId||undefined]),unresolved);
 assert.equal(diagnostics.length,unresolved.length);
 const rows=unresolved.map((r,i)=>{const d=diagnostics[i],external=r.group==='nervous'?candidates.get(key(r.target))||[]:[];const complete=d.candidates.filter(x=>x.complete);return {group:r.group,target:r.target,status:r.status,diagnostic:d,completePublisherCandidates:complete.length,heldExternalEvidence:external,action:complete.length?'REVIEW_PINNED_PUBLISHER_IDENTITY':external.length?'HOLD_EXTERNAL_RIGHTS_AND_CLINICAL_REVIEW':'DISCOVER_NEW_SOURCE',autoExport:false};});
 const counts={};for(const r of rows)counts[r.action]=(counts[r.action]||0)+1;
 return {schema:1,scope:'Only checkpoints without Guided Learning representation. Publisher label/membership review and external held evidence, never approval or coverage promotion.',baselineTargets:coverage.targets,unresolved:rows.length,counts,externalNerveEvidence:{targets:28,withEvidence:27,withoutEvidence:1,rightsApproved:0},lymphatic,rows,clinicalValidation:false,registrationValidated:false,publicRelease:'NO_GO'};
}
