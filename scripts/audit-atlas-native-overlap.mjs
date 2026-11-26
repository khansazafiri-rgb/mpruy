// Exact cross-version source-element coordinate comparisons, never a global registration.
import assert from 'node:assert/strict';
import fs from 'node:fs';
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

const evidenceRoot=new URL('../licensing/atlas-publication/',import.meta.url);
const readEvidence=p=>JSON.parse(fs.readFileSync(new URL(p,evidenceRoot),'utf8'));
const pairKey=r=>JSON.stringify([r.fj,r.fma,r.bp43,r.bp40,r.tree]);
export function loadVersionedCandidateEvidence(){
 const e=readEvidence('checkpoint-evidence/bp3d-versioned-native-candidates-20261126.json'),d=readEvidence('checkpoint-evidence/bp3d-versioned-identity-diagnostics-20261126.json');
 assert(e.schema===1&&e.commit==='d007491a0a92dfdd4ad6857c6870bf62584a2f06'&&e.runId===45793847310&&e.jobId===139819331163&&e.publicRelease==='NO_GO'&&e.verifiedCrosswalk===false&&e.registrationValidated===false&&e.clinicalValidation===false&&e.approvedForDistribution===false);
 assert(e.rows.length===358&&new Set(e.rows.map(pairKey)).size===358&&new Set(e.rows.map(r=>r.fj)).size===205&&e.rows.every(r=>r.status==='EXACT_ORDERED_NATIVE_TRIANGLES'));
 assert.deepEqual(e.rows.map(pairKey).sort(),d.candidates.map(pairKey).sort());
 const receipts=readEvidence('dbcls-full-geometry-audit-20261125.json').report.receipts;
 assert(receipts.length===6);
 const pins={isa:{},partof:{}};
 for(const r of receipts){assert(Object.hasOwn(pins,r.tree)&&['archive','names','elements'].includes(r.kind)&&!pins[r.tree][r.kind]&&/^[a-f0-9]{64}$/.test(r.sha256));pins[r.tree][r.kind]=r.sha256;}
 return {rows:e.rows,pins};
}
// A retained publisher candidate is not a verified identity crosswalk. Match
// the actual body pack's version-specific IDs and pinned tree before reading
// both exact GLB receipts. Never interpret a missing local match as anatomy absent.
export function auditVersionedLocalCandidates(body,refs,evidence,{readBody,readReference}){
 const byFj=new Map(refs.map(r=>[r.fj,r])),byBodyFj=new Map(),seen=new Set();
 assert(byFj.size===refs.length);
 for(const m of body){assert(m.approvedForDistribution===false&&m.frame==='native-official-OBJ'&&!seen.has(m.id));seen.add(m.id);for(const e of m.sourceElements){const a=byBodyFj.get(e.id)||[];a.push(m);byBodyFj.set(e.id,a);}}
 const keys=new Set(),rows=[];
 for(const c of evidence.rows){
  assert(/^FJ\d+[A-Za-z]?$/.test(c.fj)&&/^FMA\d+$/.test(c.fma)&&/^BP\d+$/.test(c.bp40)&&/^BP\d+$/.test(c.bp43)&&['isa','partof'].includes(c.tree)&&c.status==='EXACT_ORDERED_NATIVE_TRIANGLES'&&!keys.has(pairKey(c)));keys.add(pairKey(c));
  const ref=byFj.get(c.fj);if(!ref)continue;
  const base={fj:c.fj,fmaId:c.fma,bp40:c.bp40,bp43:c.bp43,tree:c.tree,referenceId:ref.id,verifiedCrosswalk:false,registrationValidated:false,approvedForDistribution:false};
  assert(ref.fmaId===c.fma&&ref.bpId===c.bp43&&ref.approvedForDistribution===false&&ref.registrationValidated===false,'Reference candidate identity changed');
  const local=byBodyFj.get(c.fj)||[],identity=local.filter(m=>m.fmaId===c.fma&&m.bpId===c.bp40&&m.sourceTree===c.tree&&norm(m.name)===norm(ref.name));
  if(!identity.length){rows.push({...base,status:local.length?'HOLD_LOCAL_IDENTITY_MISMATCH':'NO_LOCAL_ELEMENT_ID_MATCH'});continue;}
  if(identity.length!==1){rows.push({...base,status:'HOLD_AMBIGUOUS_LOCAL_MATCH'});continue;}
  const m=identity[0],pin=evidence.pins[c.tree];assert(pin&&['archive','names','elements'].every(k=>/^[a-f0-9]{64}$/.test(pin[k])));
  if(!['archive','names','elements'].every(k=>m.sourceHashes?.[k]===pin[k])){rows.push({...base,bodyModelId:m.id,status:'HOLD_LOCAL_SOURCE_PIN_MISMATCH'});continue;}
  try{const result=compareNativeElement(readBody(m.id),readReference(ref.id),c.fj);
   rows.push({...base,bodyModelId:m.id,...result,status:result.sameNativeFloat32Positions?'EXACT_CANDIDATE_LOCAL_NATIVE_COORDINATES':'HOLD_LOCAL_COORDINATES_DIFFER',entireLocalModelPositionArrayMatchesReferenceElement:result.sameNativeFloat32Positions&&result.otherBodyElements===0});
  }catch(error){rows.push({...base,bodyModelId:m.id,status:'HOLD_LOCAL_COORDINATE_REPLAY',reason:String(error.message)});}
 }
 const counts={};for(const r of rows)counts[r.status]=(counts[r.status]||0)+1;
 const matched=rows.filter(r=>r.status==='EXACT_CANDIDATE_LOCAL_NATIVE_COORDINATES');
 return {schema:1,scope:'Versioned publisher candidate overlap with actual local verified GLBs, not exact raw-byte identity or whole-body registration. Counts by archive pair and unique FJ are separate.',candidatePairs:rows.length,candidateElements:new Set(rows.map(r=>r.fj)).size,matchedPairs:matched.length,matchedElements:new Set(matched.map(r=>r.fj)).size,matchedBodyModels:new Set(matched.map(r=>r.bodyModelId)).size,counts,rows,verifiedCrosswalk:false,clinicalValidation:false,registrationValidated:false,bodyFrameRegistrationValidated:false,publicRelease:'NO_GO'};
}
export function auditPackVersionedCandidates(pack,suite){
 assert(pack.inventory.publicRelease==='NO_GO'&&suite.publicRelease==='NO_GO'&&suite.bp.inventory.registrationValidated===false);
 const body=pack.inventory.bodyModels,byId=new Map(body.map(m=>[m.id,m]));
 return auditVersionedLocalCandidates(body,suite.bp.inventory.items,loadVersionedCandidateEvidence(),{readBody:id=>{const m=byId.get(id),route='/anatomy/viewer/models/'+bodyDisplayEntry(m).id+'.glb',receipt=pack.modelReceipts.get(route);assert(receipt?.sha256===m.sha256);return readVerifiedPrivateModel(receipt);},readReference:id=>{const item=suite.bp.inventory.items.find(r=>r.id===id),asset=suite.bp.assets.get(id);assert(asset?.sha256===item?.glbSHA256);return readVerifiedPrivateModel(asset);}});
}
