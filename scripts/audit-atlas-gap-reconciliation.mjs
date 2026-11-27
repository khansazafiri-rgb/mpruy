// Read-only reconciliation of the running private workstation, never promotes geometry.
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import {fileURLToPath} from 'node:url';
import {groups,validateInventory} from '../apps/atlas-independent/src/inventory.js';
import {validateElementCatalog} from '../apps/atlas-independent/src/element-selection.js';
import {reference43Entries,referenceEntries} from '../apps/atlas-independent/src/reference-state.js';
import {muscleCheckpointAliases} from '../apps/atlas-independent/src/learning-links.js';
import {guidedTracks} from '../apps/atlas-independent/src/guided-state.js';
const key=s=>String(s).trim().toLowerCase().replace(/\s+/g,' ');
export const format=s=>key(s).replace(/^(.*)\.([lr])$/,(_,n,x)=>(x==='l'?'left ':'right ')+n);
const crossGroup={'FMA55099':['respiratory','skeletal'],'FMA9615':['respiratory','skeletal'],'FMA55109':['respiratory','skeletal'],'FMA4706':['heart','venous']};
// Explicit synonym candidates only, pinned to already resolved publisher FMA.
// These are not automatic label/identity changes or proof of full anatomy.
const lungAliases={'apical segment of right lung':'FMA7338','posterior segment of right lung':'FMA7339','anterior segment of right lung':'FMA7359','lateral segment of right lung':'FMA7361','medial segment of right lung':'FMA7360','superior segment of right lower lobe':'FMA7366','apical posterior segment of left lung':'FMA7372','anterior segment of left lung':'FMA7373','superior lingular segment':'FMA7374','inferior lingular segment':'FMA7375'};
const available=new Set(['BODY_MODEL','EXACT_ELEMENT_SELECTION','ISOLATED_REFERENCE','NATIVE_CONTEXT_CANDIDATE']);
export function reconcile(coverage,body,selection,recovery,refs){
 assert(coverage.publicRelease==='NO_GO'&&coverage.clinicalValidation===false&&coverage.registrationValidated===false&&coverage.targets===coverage.rows.length);
 const records=[...body.map(e=>({...e,kind:'BODY_MODEL'})),...selection.map(e=>({...e,kind:'EXACT_ELEMENT_SELECTION'})),...recovery.map(e=>({...e,kind:'ISOLATED_REFERENCE'})),...refs.map(e=>({...e,kind:'BP43_SINGLE_SOURCE_ELEMENT'}))];
 assert(records.every(e=>e.approvedForDistribution===false&&/^FMA\d+$/.test(e.fmaId)&&typeof e.name==='string'));
 const summarize=e=>({id:e.id,name:e.name,fmaId:e.fmaId,group:e.group||null,kind:e.kind,...(e.fj?{fj:e.fj}:{})});
 const rows=coverage.rows.filter(r=>!available.has(r.status)).map(r=>{
  const t=format(r.target),same=records.filter(e=>format(e.name)===t),local=same.filter(e=>e.kind!=='BP43_SINGLE_SOURCE_ELEMENT'&&e.group===r.group),bp43=same.filter(e=>e.kind==='BP43_SINGLE_SOURCE_ELEMENT');
  const link=crossGroup[r.fmaId],cross=link&&link[0]===r.group?records.filter(e=>e.fmaId===r.fmaId&&e.group===link[1]&&e.kind!=='BP43_SINGLE_SOURCE_ELEMENT'):[];
  const aliasFma=r.group==='respiratory'?lungAliases[t]:null,aliases=aliasFma?records.filter(e=>e.fmaId===aliasFma&&e.group===r.group&&e.kind!=='BP43_SINGLE_SOURCE_ELEMENT'):[];
  // Laterality and trunk/component distinctions must NEVER be erased in identity matching.
  // Related source elements are only displayed as partial evidence.
  const related=r.group==='nervous'?refs.filter(e=>{const n=format(e.name);return ['left '+t,'right '+t,'trunk of '+t,'trunk of left '+t,'trunk of right '+t].includes(n)||(['left brachial plexus','right brachial plexus','brachial plexus'].includes(t)&&n.includes('brachial nerve plexus')&&(!t.startsWith('left ')||n.includes('left '))&&(!t.startsWith('right ')||n.includes('right ')));}):[];
  const status=cross.length?'EXACT_FMA_CROSS_SYSTEM_LINK':local.length&&new Set(local.map(e=>e.fmaId)).size===1?'LOCAL_FORMAT_MATCH_REVIEW':aliases.length?'PINNED_SYNONYM_REVIEW':bp43.length?'BP43_EXACT_LABEL_ELEMENT_REVIEW':related.length?'RELATED_COMPONENT_ONLY':same.length?'OTHER_GROUP_OR_AMBIGUOUS_REVIEW':'NO_MATCH_IN_CURRENT_INVENTORIES';
  return {group:r.group,target:r.target,previousStatus:r.status,status,local:local.map(summarize),crossSystem:cross.map(summarize),synonyms:aliases.map(summarize),bp43:bp43.map(summarize),related:related.map(summarize),otherExact:same.filter(e=>!local.includes(e)&&!bp43.includes(e)).map(summarize)};
 });
 const counts={},systems=Object.fromEntries(Object.keys(groups).map(g=>[g,{}]));
 for(const r of rows){counts[r.status]=(counts[r.status]||0)+1;systems[r.group][r.status]=(systems[r.group][r.status]||0)+1;}
 return {schema:1,scope:'Candidate evidence only. Exact labels do not imply complete geometry. No geometry, coverage, or release status promoted.',baselineTargets:coverage.targets,baselineAvailable:coverage.rows.length-rows.length,unresolved:rows.length,inventoryCounts:{body:body.length,selection:selection.length,recovery:recovery.length,bp43:refs.length},counts,systems,rows,clinicalValidation:false,registrationValidated:false,publicRelease:'NO_GO'};
}
// Re-run the same identity checks as Guided Learning, not just raw name matches.
export function learningAccess(coverage,entries,refs,hra){
 const tracks=guidedTracks(coverage,entries,groups,refs,hra),steps=tracks.flatMap(t=>t.steps);
 assert.equal(steps.length,coverage.targets);
 const expected=new Map(coverage.rows.map(r=>[r.group+':'+key(r.target),r]));
 const rows=steps.map(s=>{
  const row=expected.get(s.key);assert(row,'Checkpoint key drift');
  assert.equal(s.representations.length,row.representations.length,'Invalid or duplicated representation: '+s.key);
  assert.equal(s.references.length,(row.referenceCandidates?.length||0)+(row.hraCandidates?.length||0),'Invalid or duplicated source reference: '+s.key);
  const bp43=s.references.filter(r=>r.type==='BP43_SINGLE_SOURCE_ELEMENT'),hra=s.references.filter(r=>r.type==='HRA_SOURCE_COMPONENT');
  const status=s.representations.length?'VERIFIED_REPRESENTATION':bp43.length&&hra.length?'BOTH_REFERENCE_SOURCES':bp43.length?'BP43_REFERENCE_ONLY':hra.length?'HRA_REFERENCE_ONLY':'NO_GUIDED_REPRESENTATION';
  return {key:s.key,group:row.group,target:s.target,status,bodyStatus:row.status,representations:s.representations,bp43,hra};
 });
 const summarize=rows=>{
  const counts={VERIFIED_REPRESENTATION:0,BOTH_REFERENCE_SOURCES:0,BP43_REFERENCE_ONLY:0,HRA_REFERENCE_ONLY:0,NO_GUIDED_REPRESENTATION:0};
  for(const row of rows)counts[row.status]++;
  return {targets:rows.length,...counts,referenceOnly:counts.BOTH_REFERENCE_SOURCES+counts.BP43_REFERENCE_ONLY+counts.HRA_REFERENCE_ONLY,accessible:rows.length-counts.NO_GUIDED_REPRESENTATION,pinnedMuscleReferenceTargets:rows.filter(r=>r.bp43.some(x=>x.relation==='PINNED_MUSCLE_LABEL')).length,levelSpecificReferenceTargets:rows.filter(r=>r.bp43.some(x=>x.relation==='LEVEL_SPECIFIC_REFERENCE')).length,relatedComponentOnlyTargets:rows.filter(r=>r.bp43.length&&r.bp43.every(x=>x.relation==='RELATED_COMPONENT_ONLY')).length};
 };
 return {scope:'Validated Guided Learning links only; not browser rendering, anatomy completeness or clinical validation.',...summarize(rows),systems:Object.fromEntries(Object.keys(groups).map(g=>[g,summarize(rows.filter(r=>r.group===g))])),rows};
}

async function run(){
 const [url,...rest]=process.argv.slice(2);assert(!rest.length&&/^http:\/\/127\.0\.0\.1:\d{4,5}\/$/.test(url||''),'Explicit loopback URL required');
 const base=new URL('anatomy/viewer/',url),read=async rel=>{const r=await fetch(new URL(rel,base),{redirect:'error'});assert(r.ok,'Missing '+rel);const d=await r.json();assert(d.publicRelease==='NO_GO','Private inventory required');return d;};
 const [cov,b,s,p,r,h]=await Promise.all(['learning-coverage.json','inventory.json','element-selection.json','priority-recovery/inventory.json','bp3d43-reference/inventory.json','hra-reference/inventory.json'].map(read));
 const body=validateInventory(b,'127.0.0.1');assert(b.sourceKind==='independent-bp3d'&&body.length===1016&&s.items.length===906&&p.items.length>=185&&p.items.length<=209&&[376,400].includes(r.items.length)&&h.items.length===9&&cov.targets===464,'Expected audited workstation baseline; do not silently compare a different build');
 assert(r.registrationValidated===false&&r.clinicalValidation===false&&r.items.every(e=>e.scope==='SINGLE_SOURCE_ELEMENT'));
 const refs=reference43Entries(r),hra=referenceEntries(h),selection=validateElementCatalog(s,body);
 const supplementCount=p.supplementCount??0;assert(Number.isInteger(supplementCount)&&supplementCount>=0&&supplementCount<=24&&(p.baselineCount??p.items.length)===185&&p.items.length===185+supplementCount);const pins=new Map(Object.values(muscleCheckpointAliases));assert(p.items.slice(185).every(e=>e.group==='muscular'&&pins.get(e.fmaId)===key(e.name)),'Invalid pinned muscular supplement');
 assert(p.registrationValidated===false&&p.clinicalValidation===false&&p.items.every(e=>e.priorityOnly===true&&e.contextCandidate!==true&&e.approvedForDistribution===false&&e.source==='BodyParts3D 4.0'&&/^bp-[a-f0-9]{24}$/.test(e.id)&&e.path==='priority-recovery/'+e.id+'.glb'));
 const entries=[...body,...selection,...p.items];assert.equal(new Set(entries.map(e=>e.id)).size,entries.length);
 const access=learningAccess(cov,entries,refs,hra),report={...reconcile(cov,body,s.items,p.items,r.items),guidedAccess:access,inventoryCounts:{body:body.length,selection:selection.length,recovery:p.items.length,bp43:refs.length,hra:hra.length}};
 const q=fs.realpathSync(fileURLToPath(new URL('../local-data/licensing-quarantine/',import.meta.url)));assert(path.basename(q)==='licensing-quarantine');
 const out=fs.mkdtempSync(path.join(q,'atlas-gap-reconciliation-'));fs.chmodSync(out,0o700);
 fs.writeFileSync(path.join(out,'report.json'),JSON.stringify(report,null,2)+'\n',{flag:'wx',mode:0o600});
 console.log('ATLAS GAP RECONCILIATION '+JSON.stringify({...report,rows:undefined,guidedAccess:{...report.guidedAccess,rows:undefined},folder:path.basename(out)}));
}
if(process.argv[1]===fileURLToPath(import.meta.url))await run();
