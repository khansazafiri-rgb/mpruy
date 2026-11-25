// Candidate native-frame assembly, not registration or clinical validation.
// One FJ element and one FMA concept may be used only once in the body scene.
// Alternate whole-organ representations remain isolated.
import assert from 'node:assert/strict';
export function planContextRecovery(body,exported,coveredFma=[]){
 const usedFma=new Set([...body.map(m=>m.fmaId),...coveredFma]),usedElements=new Set(body.flatMap(m=>m.sourceElements.map(e=>e.id)));
 const rows=exported.filter(r=>r.status==='EXPORTED_ISOLATED_CONCEPT').slice();
 const known=new Set();
 for(const row of rows){
  assert(/^FMA\d+$/.test(row.fmaId)&&/^bp-[a-f0-9]{24}$/.test(row.id)&&!known.has(row.id));
  assert(Array.isArray(row.sourceElements)&&row.sourceElements.length>0);
  const elements=row.sourceElements.map(e=>e.id);
  assert(elements.every(id=>/^FJ\d+[A-Za-z]?$/.test(id))&&new Set(elements).size===elements.length);
  known.add(row.id);
 }
 // Prefer granular concepts over enclosing composite concepts. Deterministic
 // tie breaking; this is a conservative membership gate, not a collision test.
 rows.sort((a,b)=>a.sourceElements.length-b.sourceElements.length||a.fmaId.localeCompare(b.fmaId)||a.id.localeCompare(b.id));
 const accepted=[],held=[];
 for(const row of rows){
  const fjs=row.sourceElements.map(e=>e.id);
  const overlaps=fjs.filter(id=>usedElements.has(id));
  const reason=usedFma.has(row.fmaId)?'EXISTING_FMA':overlaps.length?'SHARED_PUBLISHER_ELEMENT':null;
  if(reason){held.push({id:row.id,fmaId:row.fmaId,reason,overlapElements:overlaps});continue;}
  accepted.push({id:row.id,fmaId:row.fmaId,group:row.group,elementIds:fjs});
  usedFma.add(row.fmaId);fjs.forEach(id=>usedElements.add(id));
 }
 return {schema:1,mode:'NATIVE_FRAME_CANDIDATE',accepted,held,registrationValidated:false,clinicalValidation:false,publicRelease:'NO_GO',scope:'FMA/FJ disjointness only; source coordinates unchanged. Anatomical relationships and spatial overlaps require separate review.'};
}
