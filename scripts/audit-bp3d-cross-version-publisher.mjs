// Compare exact, pinned publisher archives with retained 4.3 source receipts.
import fs from 'node:fs';import path from 'node:path';import assert from 'node:assert/strict';
import {createHash} from 'node:crypto';import {fileURLToPath} from 'node:url';
import {execFileSync} from 'node:child_process';
import {fetchOfficialFile,parseOfficialNames,parseOfficialElements,checkArchiveEntryNames} from '../licensing/tools/prepare-bodyparts3d-source.mjs';
import {parseObj,encodeNativeGlb} from './independent-bp3d-export.mjs';
import {auditVersionedLocalCandidates,loadVersionedCandidateEvidence} from './audit-atlas-native-overlap.mjs';
import {BP43_SUITE,BP43_HYOID,BP43_EXPANSION} from './atlas-reference-suite-spec.mjs';
import {retainedReceipt,replayPlan,readRetainedReports} from './replay-audited-bp3d43-suite.mjs';
import {load43Elements,select43Acquisition} from './load-bp3d43-private-elements.mjs';
import {parseNativePositions,comparePositions} from './audit-bp3d-publication-geometry.mjs';
import {readVerifiedPrivateModel} from './serve-verified-private-model.mjs';
const root=fs.realpathSync(fileURLToPath(new URL('../',import.meta.url))),q=path.join(root,'local-data/licensing-quarantine');
const sha=b=>createHash('sha256').update(b).digest('hex');
const read=p=>JSON.parse(fs.readFileSync(path.join(root,'licensing/atlas-publication',p),'utf8'));
const norm=s=>s.trim().toLowerCase().replace(/\s+/g,' ');
export function exactSourceCandidates(ref,sources){
 return sources.map(s=>{
  const names=s.names.filter(n=>n.fmaId===ref.fma);
  const exact=names.filter(n=>n.bpId===ref.bp&&norm(n.name)===norm(ref.name));
  const members=s.elements.get(ref.fma)||new Set();
  return {tree:s.tree,conceptNames:names.map(n=>({bpId:n.bpId,name:n.name})),exactConcept:exact.length===1,conceptIncludesFJ:members.has(ref.fj),sourceElementPresent:s.archiveIndex.has(ref.fj),conceptElementCount:members.size};
 });
}
// Distinguish possible version-specific representation changes from missing
// concept membership. A candidate is not a verified crosswalk or geometry match.
export function classifyIdentityGate(ref,c){
 if(!c.sourceElementPresent)return 'FJ_NOT_IN_ARCHIVE';
 if(c.exactConcept&&c.conceptIncludesFJ)return 'EXACT_IDENTITY_ELIGIBLE';
 if(!c.conceptNames.length)return 'HOLD_FMA_ABSENT';
 if(!c.conceptIncludesFJ)return 'HOLD_FJ_NOT_IN_FMA_MEMBERSHIP';
 const names=c.conceptNames.filter(n=>norm(n.name)===norm(ref.name));
 if(names.length===1&&c.conceptNames.length===1&&names[0].bpId!==ref.bp)return 'CANDIDATE_VERSIONED_BP_CHANGE';
 if(names.length===0)return 'HOLD_NAME_MISMATCH';
 return 'HOLD_AMBIGUOUS_REPRESENTATION';
}
export function summarizeIdentityGates(rows){
 const counts={},candidates=[];
 for(const r of rows)for(const c of r.trees){
  const status=classifyIdentityGate(r,c);counts[status]=(counts[status]||0)+1;
  if(status==='CANDIDATE_VERSIONED_BP_CHANGE')candidates.push({fj:r.fj,fma:r.fma,bp43:r.bp,bp40:c.conceptNames[0].bpId,tree:c.tree});
 }
 return {archiveComparisons:rows.reduce((n,r)=>n+r.trees.length,0),counts,candidates,verifiedCrosswalk:false,registrationValidated:false,publicRelease:'NO_GO'};
}
export function comparePublisherElement(ref,sources,readElement){
 assert(/^FJ\d+[A-Za-z]?$/.test(ref.fj)&&/^FMA\d+$/.test(ref.fma)&&/^BP\d+$/.test(ref.bp)&&/^[a-f0-9]{64}$/.test(ref.rawSHA256)&&Number.isInteger(ref.triangles)&&ref.triangles>0);
 const trees=exactSourceCandidates(ref,sources).map((c,i)=>{
  if(!c.sourceElementPresent)return {...c,status:'FJ_NOT_IN_ARCHIVE'};
  const b=readElement(sources[i],ref.fj),rawSHA256=sha(b);
  // Do not infer positions from different source bytes, and never fit a transform.
  if(rawSHA256!==ref.rawSHA256)return {...c,rawSHA256,status:'RAW_BYTES_DIFFER'};
  const p=parseObj(b.toString('utf8').replace(/\r\n|\r/g,'\n'));
  assert.equal(p.positions.length/9,ref.triangles,'Same raw bytes must produce retained triangle count');
  return {...c,rawSHA256,triangles:ref.triangles,status:c.exactConcept&&c.conceptIncludesFJ?'EXACT_IDENTITY_AND_RAW_BYTES':'EXACT_RAW_BYTES_IDENTITY_REVIEW'};
 });
 const same=trees.filter(t=>t.status==='EXACT_IDENTITY_AND_RAW_BYTES');
 const raw=trees.filter(t=>t.status.startsWith('EXACT_'));
 return {fj:ref.fj,fma:ref.fma,bp:ref.bp,name:ref.name,rawSHA256:ref.rawSHA256,trees,status:same.length?'EXACT_IDENTITY_AND_RAW_BYTES':raw.length?'EXACT_RAW_BYTES_IDENTITY_REVIEW':trees.some(t=>t.sourceElementPresent)?'REUSED_FJ_DIFFERENT_RAW_BYTES':'FJ_NOT_IN_EITHER_ARCHIVE',wholeConceptClaim:false};
}
// Retain only already-public source identifiers and audit classifications in CI logs.
// No OBJ bytes, positions, names, paths, or new rights claims leave quarantine.
export function summarizePublisherIds(rows){
 const statuses=['EXACT_IDENTITY_AND_RAW_BYTES','EXACT_RAW_BYTES_IDENTITY_REVIEW','REUSED_FJ_DIFFERENT_RAW_BYTES','FJ_NOT_IN_EITHER_ARCHIVE'];
 const byStatus=Object.fromEntries(statuses.map(status=>[status,[]])),seen=new Set();
 for(const {fj,status} of rows){assert(/^FJ\d+[A-Za-z]?$/.test(fj)&&!seen.has(fj)&&Object.hasOwn(byStatus,status),'Invalid or duplicate publisher audit result');seen.add(fj);byStatus[status].push(fj);}
 for(const ids of Object.values(byStatus))ids.sort();
 return byStatus;
}
async function loadSources(folder){
 const receipt=read('dbcls-full-geometry-audit-20261125.json').report;assert(receipt.publicRelease==='NO_GO'&&receipt.geometryPublished===0&&receipt.receipts.length===6);
 const sources=[];
 for(const tree of ['isa','partof']){
  const entries=receipt.receipts.filter(r=>r.tree===tree),files={};
  assert(entries.length===3);
  for(const r of entries){const basename={archive:tree+'_BP3D_4.0_obj_99.zip',names:tree+'_parts_list_e.txt',elements:tree+'_element_parts.txt'}[r.kind];assert(basename&&!files[r.kind]&&r.url==='https://dbarchive.biosciencedbc.jp/data/bodyparts3d/LATEST/'+basename&&/^[a-f0-9]{64}$/.test(r.sha256)&&r.bytes>0);
   const f=path.join(folder,basename);await fetchOfficialFile(r.url,f,r.bytes);assert(fs.realpathSync(f)===f&&fs.statSync(f).size===r.bytes&&sha(fs.readFileSync(f))===r.sha256,'Publisher receipt changed');files[r.kind]=f;
  }
  const names=parseOfficialNames(fs.readFileSync(files.names,'utf8')),elements=parseOfficialElements(fs.readFileSync(files.elements,'utf8'));
  const list=execFileSync('unzip',['-Z','-1',files.archive],{encoding:'utf8',maxBuffer:16*1024*1024}).trim().split(/\r?\n/);checkArchiveEntryNames(list);const archiveIndex=new Map();
  for(const name of list.filter(n=>/\.obj$/i.test(n))){const fj=path.basename(name).replace(/\.obj$/i,'');assert(/^FJ\d+[A-Za-z]?$/.test(fj)&&!archiveIndex.has(fj)&&/^[A-Za-z0-9_./-]+\.obj$/i.test(name));archiveIndex.set(fj,name);}
  sources.push({tree,names,elements,archiveIndex,archive:files.archive});
 }
 return {sources,receipts:receipt.receipts};
}
// Native float32 triangle comparison only; no resampling, transforms or tolerance.
// Equal unordered triangle multisets ignore winding, cyclic order and face order.
export function compareNativeTriangles(a,b){
 for(const p of [a,b])assert(p instanceof Float32Array&&p.length>0&&p.length%9===0&&p.every(Number.isFinite),'Invalid native triangles');
 const base={archiveTriangles:a.length/9,referenceTriangles:b.length/9};
 if(a.length!==b.length)return {...base,status:'DIFFERENT_TRIANGLE_COUNT'};
 if(comparePositions(a,b))return {...base,status:'EXACT_ORDERED_NATIVE_TRIANGLES'};
 if(a.length/9>250000)return {...base,status:'HOLD_UNORDERED_COMPARISON_LIMIT'};
 const keys=p=>{const out=[];for(let i=0;i<p.length;i+=9){const vertices=[];for(let j=0;j<9;j+=3)vertices.push(JSON.stringify([p[i+j],p[i+j+1],p[i+j+2]]));out.push(vertices.sort().join('|'));}return out.sort();};
 const x=keys(a),y=keys(b);
 return {...base,status:x.every((v,i)=>v===y[i])?'EXACT_UNORDERED_NATIVE_TRIANGLES':'DIFFERENT_NATIVE_TRIANGLE_MULTISET'};
}
export function comparePublisherNative(ref,row,sources,readElement,readReference){
 assert(ref.fj===row.fj&&ref.rawSHA256===row.rawSHA256&&row.trees.length===sources.length);
 const eligible=row.trees.some(t=>t.sourceElementPresent&&t.exactConcept&&t.conceptIncludesFJ);
 const reference=eligible?readReference(ref):null;
 if(reference)assert(reference.length/9===ref.triangles,'Reference triangle receipt differs');
 return {fj:ref.fj,trees:row.trees.map((t,i)=>{
  assert(t.tree===sources[i].tree);
  if(!t.sourceElementPresent)return {tree:t.tree,status:'FJ_NOT_IN_ARCHIVE'};
  if(!t.exactConcept||!t.conceptIncludesFJ)return {tree:t.tree,status:'HOLD_IDENTITY_REVIEW'};
  const raw=readElement(sources[i],ref.fj);assert(sha(raw)===t.rawSHA256,'Publisher raw bytes changed between comparisons');
  const a=parseObj(raw.toString('utf8').replace(/\r\n|\r/g,'\n')).positions;
  return {tree:t.tree,...compareNativeTriangles(a,reference)};
 }),registrationValidated:false};
}
// Exploratory comparison of metadata-supported BP changes. Separate from
// the exact identity gate; never returns a verified crosswalk or registration.
export function compareVersionedCandidates(ref,row,sources,readElement,readReference){
 assert(ref.fj===row.fj&&ref.fma===row.fma&&ref.bp===row.bp&&ref.name===row.name&&ref.rawSHA256===row.rawSHA256&&row.trees.length===sources.length);
 const selected=row.trees.map((c,i)=>({c,i})).filter(({c})=>classifyIdentityGate(ref,c)==='CANDIDATE_VERSIONED_BP_CHANGE');
 if(!selected.length)return [];
 const reference=readReference(ref);
 assert(reference.length/9===ref.triangles,'Reference triangle receipt differs');
 return selected.map(({c,i})=>{
  assert(c.tree===sources[i].tree);
  const raw=readElement(sources[i],ref.fj);assert(sha(raw)===c.rawSHA256,'Publisher raw bytes changed between comparisons');
  const a=parseObj(raw.toString('utf8').replace(/\r\n|\r/g,'\n')).positions;
  return {fj:ref.fj,fma:ref.fma,bp43:ref.bp,bp40:c.conceptNames[0].bpId,tree:c.tree,identityStatus:'CANDIDATE_VERSIONED_BP_CHANGE',...compareNativeTriangles(a,reference),verifiedCrosswalk:false,registrationValidated:false,approvedForDistribution:false};
 });
}
// Reconstruct complete publisher concepts in memory, then exercise the same
// GLB overlap function used on the workstation. This is NOT its body pack.
export function replayPublisherConceptCandidates(evidence,refs,sources,readElement,readReferenceBytes){
 const grouped=new Map(),byFj=new Map(refs.map(r=>[r.fj,r]));
 for(const c of evidence.rows){const k=JSON.stringify([c.tree,c.fma,c.bp40]),a=grouped.get(k)||[];a.push(c);grouped.set(k,a);}
 const rows=[],conceptCounts={};
 for(const candidates of grouped.values()){
  const c=candidates[0],source=sources.find(s=>s.tree===c.tree);assert(source);
  const names=source.names.filter(n=>n.fmaId===c.fma&&n.bpId===c.bp40),members=[...(source.elements.get(c.fma)||[])].sort();
  assert(names.length===1&&candidates.every(x=>members.includes(x.fj)&&byFj.get(x.fj)?.fma===x.fma&&byFj.get(x.fj)?.bp===x.bp43&&norm(byFj.get(x.fj).name)===norm(names[0].name)),'Candidate metadata changed');
  const hold=status=>{conceptCounts[status]=(conceptCounts[status]||0)+1;for(const x of candidates)rows.push({...x,status});};
  if(!members.every(fj=>source.archiveIndex.has(fj))){hold('HOLD_INCOMPLETE_PUBLISHER_CONCEPT');continue;}
  if(members.length>64){hold('HOLD_CONCEPT_ELEMENT_BUDGET');continue;}
  const parts=[],proof=[];let triangles=0,held=false;
  for(const fj of members){
   const raw=readElement(source,fj),parsed=parseObj(raw.toString('utf8').replace(/\r\n|\r/g,'\n'));triangles+=parsed.positions.length/9;
   if(triangles>500000){held=true;break;}
   parts.push({id:fj,...parsed});proof.push({id:fj,sha256:sha(raw)});
  }
  if(held){hold('HOLD_CONCEPT_TRIANGLE_BUDGET');continue;}
  const pins=evidence.pins[c.tree],id='publisher-'+c.tree+'-'+c.fma+'-'+c.bp40;
  const encoded=encodeNativeGlb(parts,{fmaId:c.fma,bpId:c.bp40,tree:c.tree,officialName:names[0].name,sourceHashes:pins,sourceElements:proof},'4.0');
  const body={id,name:names[0].name,fmaId:c.fma,bpId:c.bp40,sourceTree:c.tree,sourceHashes:pins,sourceElements:proof,sha256:encoded.sha256,frame:'native-official-OBJ',approvedForDistribution:false};
  const items=candidates.map(x=>{const r=byFj.get(x.fj);return {id:r.fj,fj:r.fj,fmaId:r.fma,bpId:r.bp,name:r.name,approvedForDistribution:false,registrationValidated:false};});
  const result=auditVersionedLocalCandidates([body],items,{pins:evidence.pins,rows:candidates},{readBody:requested=>{assert(requested===id);return encoded.bytes;},readReference:fj=>readReferenceBytes(byFj.get(fj))});
  assert(result.candidatePairs===candidates.length);
  const status=result.matchedPairs===candidates.length?'COMPLETE_CONCEPT_GLBS_MATCHED':'HOLD_CONCEPT_GLBS';
  conceptCounts[status]=(conceptCounts[status]||0)+1;rows.push(...result.rows);
 }
 assert.equal(rows.length,evidence.rows.length);
 const counts={};for(const r of rows)counts[r.status]=(counts[r.status]||0)+1;
 const matched=rows.filter(r=>r.status==='EXACT_CANDIDATE_LOCAL_NATIVE_COORDINATES');
 return {scope:'In-memory reconstruction of complete pinned publisher concepts, using actual 4.3 GLBs; not the workstation inventory.',concepts:grouped.size,conceptCounts,pairs:rows.length,uniqueElements:new Set(rows.map(r=>r.fj)).size,matchedPairs:matched.length,matchedElements:new Set(matched.map(r=>r.fj)).size,counts,rows,workstationInventoryCompared:false,verifiedCrosswalk:false,clinicalValidation:false,registrationValidated:false,publicRelease:'NO_GO'};
}
function verifiedReferenceReader(){
 const reports=readRetainedReports(q),byFj=new Map();
 for(const [,file,count] of [...BP43_SUITE,BP43_HYOID,...BP43_EXPANSION]){
  const {evidence}=retainedReceipt(file);replayPlan(evidence,count);
  const r=load43Elements(q,select43Acquisition(reports,evidence),evidence,count);
  for(const item of r.inventory.items){assert(!byFj.has(item.fj));byFj.set(item.fj,{item,asset:r.assets.get(item.id)});}
 }
 assert.equal(byFj.size,376);
 const readBytes=ref=>{const entry=byFj.get(ref.fj);assert(entry?.item.rawSHA256===ref.rawSHA256&&entry.item.glbSHA256===ref.publisherGLBSHA256&&entry.item.fmaId===ref.fma&&entry.item.bpId===ref.bp);return readVerifiedPrivateModel(entry.asset);};
 const readPositions=ref=>{const p=parseNativePositions(readBytes(ref),'4.3');assert(p.size===1&&p.has(ref.fj));return p.get(ref.fj);};readPositions.readBytes=readBytes;return readPositions;
}
export async function auditPublisher({compareNative=false}={}){
 fs.mkdirSync(q,{recursive:true,mode:0o700});assert(fs.realpathSync(q)===q);const folder=fs.mkdtempSync(path.join(q,'bp3d-cross-version-publisher-'));fs.chmodSync(folder,0o700);
 const {sources,receipts}=await loadSources(folder);
 const refs=[...BP43_SUITE,BP43_HYOID,...BP43_EXPANSION].flatMap(([,file,count])=>{const {evidence}=retainedReceipt(file);replayPlan(evidence,count);return evidence.matches;});
 assert.equal(refs.length,376);assert.equal(new Set(refs.map(x=>x.fj)).size,376);
 const readElement=(s,fj)=>execFileSync('unzip',['-p',s.archive,s.archiveIndex.get(fj)],{maxBuffer:96*1024*1024});
 const rows=refs.map(ref=>comparePublisherElement(ref,sources,readElement));
 const counts={};for(const r of rows)counts[r.status]=(counts[r.status]||0)+1;
 const report={schema:1,scope:'Pinned official BP3D 4.0 ISA and PARTOF archives versus 376 retained dual-source-audited BP3D 4.3 element receipts. Exact raw identity is not whole concept completeness or spatial registration. Exact native comparisons require exact identity; separate exploratory comparisons of versioned BP candidates do not verify identity. Not the workstation body inventory.',receipts,referenceElements:refs.length,sourceArchiveElementCounts:Object.fromEntries(sources.map(s=>[s.tree,s.archiveIndex.size])),counts,rows,clinicalValidation:false,registrationValidated:false,fullBodyInventoryCompared:false,approvedForDistribution:false,geometryPublished:0,publicRelease:'NO_GO'};
 report.identityDiagnostics=summarizeIdentityGates(rows);
 console.log('BP3D CROSS VERSION IDENTITY DIAGNOSTICS '+JSON.stringify(report.identityDiagnostics));
 if(compareNative){
  const readReference=verifiedReferenceReader();
  const nativeRows=refs.map((ref,i)=>comparePublisherNative(ref,rows[i],sources,readElement,readReference));
  const nativeCounts={};
  for(const r of nativeRows)for(const t of r.trees)nativeCounts[t.status]=(nativeCounts[t.status]||0)+1;
  report.nativeComparison={scope:'Per-archive source element comparison in native float32 coordinates, without registration; unordered equality ignores winding. Different triangle count or multiset is not proof of a spatial misalignment.',referenceElements:nativeRows.length,archiveComparisons:nativeRows.reduce((n,r)=>n+r.trees.length,0),counts:nativeCounts,rows:nativeRows,registrationValidated:false};
  const candidateRows=refs.flatMap((ref,i)=>compareVersionedCandidates(ref,rows[i],sources,readElement,readReference));
  const key=r=>JSON.stringify([r.fj,r.fma,r.bp43,r.bp40,r.tree]);
  assert.deepEqual(candidateRows.map(key).sort(),report.identityDiagnostics.candidates.map(key).sort(),'Candidate audit incomplete');
  const candidateCounts={};
  for(const r of candidateRows)candidateCounts[r.status]=(candidateCounts[r.status]||0)+1;
  report.candidateComparison={scope:'Exploratory native float32 triangle comparison for versioned BP candidates only; not an anatomical crosswalk, registration, or release decision.',pairs:candidateRows.length,uniqueElements:new Set(candidateRows.map(r=>r.fj)).size,counts:candidateCounts,rows:candidateRows,verifiedCrosswalk:false,registrationValidated:false,publicRelease:'NO_GO'};
  console.log('BP3D CROSS VERSION CANDIDATE COUNTS '+JSON.stringify({...report.candidateComparison,rows:undefined}));
  console.log('BP3D CROSS VERSION CANDIDATE RESULTS '+JSON.stringify(candidateRows.map(({fj,fma,bp43,bp40,tree,status})=>({fj,fma,bp43,bp40,tree,status}))));
  const retained=loadVersionedCandidateEvidence();
  assert.deepEqual(candidateRows.filter(r=>r.status==='EXACT_ORDERED_NATIVE_TRIANGLES').map(key).sort(),retained.rows.map(key).sort(),'Previously exact candidate geometry changed');
  report.publisherConceptReplay=replayPublisherConceptCandidates(retained,refs,sources,readElement,readReference.readBytes);
  console.log('BP3D PUBLISHER CONCEPT GLB REPLAY '+JSON.stringify({...report.publisherConceptReplay,rows:undefined}));
  console.log('BP3D CROSS VERSION NATIVE COUNTS '+JSON.stringify({referenceElements:nativeRows.length,archiveComparisons:report.nativeComparison.archiveComparisons,counts:nativeCounts,registrationValidated:false,publicRelease:'NO_GO'}));
 }
 fs.writeFileSync(path.join(folder,'report.json'),JSON.stringify(report,null,2)+'\n',{flag:'wx',mode:0o600});
 console.log('BP3D CROSS VERSION PUBLISHER IDS '+JSON.stringify(summarizePublisherIds(rows)));
 console.log('BP3D CROSS VERSION PUBLISHER PASS '+JSON.stringify({...report,rows:undefined,identityDiagnostics:{...report.identityDiagnostics,candidates:undefined},candidateComparison:report.candidateComparison?{...report.candidateComparison,rows:undefined}:undefined,publisherConceptReplay:report.publisherConceptReplay?{...report.publisherConceptReplay,rows:undefined}:undefined,nativeComparison:report.nativeComparison?{...report.nativeComparison,rows:undefined}:undefined,folder:path.basename(folder)}));return report;
}
if(process.argv[1]===fileURLToPath(import.meta.url)){const args=process.argv.slice(2);assert(args.length===1&&['--audit-private','--compare-native-private'].includes(args[0]));await auditPublisher({compareNative:args[0]==='--compare-native-private'});}
