// Compare exact, pinned publisher archives with retained 4.3 source receipts.
import fs from 'node:fs';import path from 'node:path';import assert from 'node:assert/strict';
import {createHash} from 'node:crypto';import {fileURLToPath} from 'node:url';
import {execFileSync} from 'node:child_process';
import {fetchOfficialFile,parseOfficialNames,parseOfficialElements,checkArchiveEntryNames} from '../licensing/tools/prepare-bodyparts3d-source.mjs';
import {parseObj} from './independent-bp3d-export.mjs';
import {BP43_SUITE,BP43_HYOID,BP43_EXPANSION} from './atlas-reference-suite-spec.mjs';
import {retainedReceipt,replayPlan} from './replay-audited-bp3d43-suite.mjs';
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
 for(const {fj,status} of rows){assert(/^FJ\\d+[A-Za-z]?$/.test(fj)&&!seen.has(fj)&&Object.hasOwn(byStatus,status),'Invalid or duplicate publisher audit result');seen.add(fj);byStatus[status].push(fj);}
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
export async function auditPublisher(){
 fs.mkdirSync(q,{recursive:true,mode:0o700});assert(fs.realpathSync(q)===q);const folder=fs.mkdtempSync(path.join(q,'bp3d-cross-version-publisher-'));fs.chmodSync(folder,0o700);
 const {sources,receipts}=await loadSources(folder);
 const refs=[...BP43_SUITE,BP43_HYOID,...BP43_EXPANSION].flatMap(([,file,count])=>{const {evidence}=retainedReceipt(file);replayPlan(evidence,count);return evidence.matches;});
 assert.equal(refs.length,376);assert.equal(new Set(refs.map(x=>x.fj)).size,376);
 const rows=refs.map(ref=>comparePublisherElement(ref,sources,(s,fj)=>execFileSync('unzip',['-p',s.archive,s.archiveIndex.get(fj)],{maxBuffer:96*1024*1024})));
 const counts={};for(const r of rows)counts[r.status]=(counts[r.status]||0)+1;
 const report={schema:1,scope:'Pinned official BP3D 4.0 ISA and PARTOF archives versus 376 retained dual-source-audited BP3D 4.3 element receipts. Exact raw identity is not whole concept completeness or spatial registration. Different bytes are not compared geometrically. Not the workstation body inventory.',receipts,referenceElements:refs.length,sourceArchiveElementCounts:Object.fromEntries(sources.map(s=>[s.tree,s.archiveIndex.size])),counts,rows,clinicalValidation:false,registrationValidated:false,fullBodyInventoryCompared:false,approvedForDistribution:false,geometryPublished:0,publicRelease:'NO_GO'};
 fs.writeFileSync(path.join(folder,'report.json'),JSON.stringify(report,null,2)+'\n',{flag:'wx',mode:0o600});
 console.log('BP3D CROSS VERSION PUBLISHER IDS '+JSON.stringify(summarizePublisherIds(rows)));
 console.log('BP3D CROSS VERSION PUBLISHER PASS '+JSON.stringify({...report,rows:undefined,folder:path.basename(folder)}));return report;
}
if(process.argv[1]===fileURLToPath(import.meta.url)){assert.deepEqual(process.argv.slice(2),['--audit-private']);await auditPublisher();}
