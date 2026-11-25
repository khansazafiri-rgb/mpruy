// Distinguish concept overlap, reused element identifiers, and exact OBJ bytes.
import assert from 'node:assert/strict';
const validHash=s=>/^[a-f0-9]{64}$/.test(s||'');
function add(map,k,value){if(!k)return;const a=map.get(k)||[];a.push(value);map.set(k,a);}
export function auditCrossVersionOverlap(bodyModels,referenceItems,officialSamples=[]){
 assert(Array.isArray(bodyModels)&&Array.isArray(referenceItems)&&Array.isArray(officialSamples));
 const byFma=new Map(),byFj=new Map(),byHash=new Map(),byOfficial=new Map(),seen=new Set();
 let elements=0,hashed=0;
 for(const m of bodyModels){
  assert(typeof m.id==='string'&&!seen.has(m.id)&&/^FMA\d+$/.test(m.fmaId)&&/^BP\d+$/.test(m.bpId)&&m.frame==='native-official-OBJ'&&m.approvedForDistribution===false&&Array.isArray(m.sourceElements));
  seen.add(m.id);const identity={modelId:m.id,fmaId:m.fmaId,bpId:m.bpId};
  add(byFma,m.fmaId,identity);
  for(const e of m.sourceElements){
   assert(/^FJ\d+[A-Za-z]?$/.test(e.id));elements++;
   const record={...identity,fj:e.id};add(byFj,e.id,record);
   // Only an explicit raw source OBJ digest qualifies, never the GLB hash.
   if(validHash(e.sha256)){hashed++;add(byHash,e.sha256,record);}
  }
 }
 for(const s of officialSamples)if(s.status==='EXACT_SOURCE_GEOMETRY_MATCH'&&/^FMA\d+$/.test(s.fmaId))add(byOfficial,s.fmaId,{bpId:s.bpId,tree:s.tree,triangles:s.triangles});
 const ids=new Set(),rows=referenceItems.map(e=>{
  assert(/^FJ\d+[A-Za-z]?$/.test(e.fj)&&!ids.has(e.fj)&&/^FMA\d+$/.test(e.fmaId)&&validHash(e.rawSHA256)&&e.approvedForDistribution===false&&e.registrationValidated===false);ids.add(e.fj);
  const concept=byFma.get(e.fmaId)||[],element=byFj.get(e.fj)||[],exactBytes=byHash.get(e.rawSHA256)||[],official=byOfficial.get(e.fmaId)||[];
  return {fj:e.fj,fmaId:e.fmaId,name:e.name,localConceptMatches:concept,localElementIdMatches:element,localExactRawByteMatches:exactBytes,officialAuditedConceptMatches:official,status:exactBytes.length?'EXACT_RAW_BYTES_IN_LOCAL_PACK':element.length?'SOURCE_ID_OVERLAP':concept.length?'CONCEPT_OVERLAP':hashed===elements&&elements>0?'NO_MATCH_IN_LOCAL_INDEX':'INCOMPLETE_LOCAL_RAW_DIGEST_INDEX'};
 });
 const counts=Object.fromEntries(['localConceptMatches','localElementIdMatches','localExactRawByteMatches','officialAuditedConceptMatches'].map(k=>[k,rows.filter(r=>r[k].length>0).length]));
 return {schema:1,scope:'Local BP3D 4.0 body inventory only; isolated recovery and HRA not included. Same FMA or FJ does not establish same geometry. No net-new count or registration claim.',bodyModels:bodyModels.length,sourceElementOccurrences:elements,rawDigestOccurrences:hashed,referenceElements:rows.length,counts,rows,clinicalValidation:false,registrationValidated:false,publicRelease:'NO_GO'};
}
