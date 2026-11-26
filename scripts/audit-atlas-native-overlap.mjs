// Exact cross-version source-element coordinate comparisons, never a global registration.
import assert from 'node:assert/strict';
import {auditCrossVersionOverlap} from './audit-atlas-cross-version-overlap.mjs';
import {parseNativePositions,comparePositions} from './audit-bp3d-publication-geometry.mjs';
import {readVerifiedPrivateModel} from './serve-verified-private-model.mjs';
import {bodyDisplayEntry} from './load-independent-source-review.mjs';
const norm=s=>String(s).trim().toLowerCase().replace(/\s+/g,' ');
export function planNativeOverlap(body,refs){
 const index=auditCrossVersionOverlap(body,refs),byId=new Map(body.map(x=>[x.id,x])),byFj=new Map(refs.map(x=>[x.fj,x]));
 return index.rows.map(row=>{
  const ref=byFj.get(row.fj),base={fj:row.fj,fmaId:row.fmaId,bpId:ref.bpId,sourceName:row.name,referenceId:ref.id,rawSHA256:ref.rawSHA256};
  if(!row.localExactRawByteMatches.length)return {...base,status:index.sourceElementOccurrences===0||index.rawDigestOccurrences!==index.sourceElementOccurrences?'HOLD_INCOMPLETE_RAW_INDEX':'NO_EXACT_RAW_MATCH'};
  if(row.localExactRawByteMatches.length!==1||row.localElementIdMatches.length!==1)return {...base,status:'HOLD_AMBIGUOUS_ELEMENT_IDENTITY'};
  const match=row.localExactRawByteMatches[0],m=byId.get(match.modelId);
  if(match.fmaId!==ref.fmaId||match.bpId!==ref.bpId||match.fj!==ref.fj||norm(m.name)!==norm(ref.name))return {...base,status:'HOLD_IDENTITY_MISMATCH'};
  return {...base,bodyModelId:m.id,bodyGLBSHA256:m.sha256,referenceGLBSHA256:ref.glbSHA256,bodyElementCount:m.sourceElements.length,status:'EXACT_IDENTITY_CANDIDATE'};
 });
}
export function compareNativeElement(bodyBytes,referenceBytes,fj){
 const a=parseNativePositions(bodyBytes,'4.0'),b=parseNativePositions(referenceBytes,'4.3');
 assert(a.has(fj)&&b.size===1&&b.has(fj),'Expected exact element ID in both encodings');
 const p=a.get(fj),q=b.get(fj);return {sameNativeFloat32Positions:comparePositions(p,q),bodyTriangles:p.length/9,referenceTriangles:q.length/9,otherBodyElements:a.size-1};
}
export function auditNativeOverlap(body,refs,{readBody,readReference}){
 const rows=planNativeOverlap(body,refs).map(r=>{
  if(r.status!=='EXACT_IDENTITY_CANDIDATE')return r;
  try{const result=compareNativeElement(readBody(r.bodyModelId),readReference(r.referenceId),r.fj);assert(result.sameNativeFloat32Positions,'Native coordinates differ');return {...r,...result,status:'EXACT_ELEMENT_NATIVE_COORDINATES',entireLocalModelPositionArrayMatchesReferenceElement:result.otherBodyElements===0};}
  catch(error){return {...r,status:'HOLD_COORDINATE_REPLAY',reason:String(error.message)};}
 });
 const counts={};for(const r of rows)counts[r.status]=(counts[r.status]||0)+1;
 return {schema:1,scope:'Identical recorded raw digests, exact FMA/BP/FJ and source name, then actual GLB float32 coordinate arrays. One exact element is not whole-body registration or clinical identity; no transforms estimated. Raw archive replay is a separate check.',referenceElements:refs.length,bodyModels:body.length,counts,rows,clinicalValidation:false,registrationValidated:false,bodyFrameRegistrationValidated:false,publicRelease:'NO_GO'};
}
export function auditPackNativeOverlap(pack,suite){
 assert(pack.inventory.publicRelease==='NO_GO'&&suite.publicRelease==='NO_GO'&&suite.bp.inventory.registrationValidated===false);
 const body=pack.inventory.bodyModels,byId=new Map(body.map(m=>[m.id,m]));
 return auditNativeOverlap(body,suite.bp.inventory.items,{readBody:id=>{const m=byId.get(id),route='/anatomy/viewer/models/'+bodyDisplayEntry(m).id+'.glb',receipt=pack.modelReceipts.get(route);assert(receipt?.sha256===m.sha256);return readVerifiedPrivateModel(receipt);},readReference:id=>readVerifiedPrivateModel(suite.bp.assets.get(id))});
}
