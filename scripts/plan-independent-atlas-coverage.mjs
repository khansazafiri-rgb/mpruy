// Private coverage comparison and exact publisher expansion plan. A name match is not clinical equivalence.
import fs from 'node:fs';
import path from 'node:path';
import assert from 'node:assert/strict';
import {createHash,randomUUID} from 'node:crypto';
import {fileURLToPath} from 'node:url';
import {execFileSync} from 'node:child_process';
import {parseOfficialNames,parseOfficialElements,checkArchiveEntryNames} from '../licensing/tools/prepare-bodyparts3d-source.mjs';
import {loadIndependentReview} from './load-independent-source-review.mjs';
const root=fs.realpathSync(fileURLToPath(new URL('../',import.meta.url))),q=path.join(root,'local-data/licensing-quarantine');
const hash=b=>createHash('sha256').update(b).digest('hex');
const key=n=>String(n).trim().toLowerCase().replace(/\s+/g,' ');
function regular(dir,rel){const p=path.resolve(dir,rel);assert(p.startsWith(dir+path.sep)&&fs.realpathSync(p)===p&&fs.statSync(p).isFile());return p;}
function read(dir,rel){return JSON.parse(fs.readFileSync(regular(dir,rel),'utf8'));}
export function planCoverage(targets,body,sources){
 const current=new Map(),used=new Set(body.map(m=>m.fmaId)),rows=[];
 for(const m of body){const k=key(m.name),arr=current.get(k)||[];arr.push(m);current.set(k,arr);}
 for(const e of targets){
  const k=key(e.name),direct=current.get(k)||[];
  if(direct.length===1){rows.push({name:e.name,group:e.group,status:'PRESENT_EXACT_NAME',fmaId:direct[0].fmaId});continue;}
  if(direct.length>1){rows.push({name:e.name,group:e.group,status:'AMBIGUOUS_CURRENT_NAME'});continue;}
  const hits=[];
  for(const s of sources)for(const n of s.names){
   if(key(n.name)!==k)continue;
   const ids=[...(s.elements.get(n.fmaId)||[])].sort();
   if(ids.length&&ids.every(id=>s.archiveIndex.has(id)))hits.push({tree:s.tree,fmaId:n.fmaId,bpId:n.bpId,officialName:n.name,elementIds:ids});
  }
  const identities=new Set(hits.map(h=>h.fmaId));
  if(identities.size!==1){rows.push({name:e.name,group:e.group,status:hits.length?'AMBIGUOUS_PUBLISHER_MATCH':'NO_EXACT_PUBLISHER_MATCH',candidates:hits});continue;}
  const fmaId=hits[0].fmaId;
  if(used.has(fmaId)){rows.push({name:e.name,group:e.group,status:'EXISTING_FMA_LABEL_REVIEW',fmaId,candidates:hits});continue;}
  const preferred=hits.filter(h=>h.tree==='isa');
  const chosen=preferred.length?preferred:hits;
  if(chosen.length!==1){rows.push({name:e.name,group:e.group,status:'AMBIGUOUS_REPRESENTATION',candidates:hits});continue;}
  rows.push({name:e.name,group:e.group,status:'EXACT_SOURCE_EXPANSION_CANDIDATE',...chosen[0],clinicalValidation:false,approvedForDistribution:false});
 }
 const byFma=new Map();
 for(const r of rows.filter(r=>r.status==='EXACT_SOURCE_EXPANSION_CANDIDATE')){const a=byFma.get(r.fmaId)||[];a.push(r);byFma.set(r.fmaId,a);}
 for(const a of byFma.values())if(a.length>1)for(const r of a)r.status='DUPLICATE_TARGET_FMA_REVIEW';
 const groups={};for(const r of rows){const g=groups[r.group]??={total:0};g.total++;g[r.status]=(g[r.status]||0)+1;}
 const counts={};for(const r of rows)counts[r.status]=(counts[r.status]||0)+1;
 return {targets:targets.length,currentBodyModels:body.length,counts,groups,rows,publicRelease:'NO_GO',clinicalValidation:false};
}
export function run(packFolder,zaFolder){
 assert(/^z-anatomy-native-preview-[A-Za-z0-9_-]+$/.test(zaFolder)&&fs.realpathSync(q)===q);
 const pack=loadIndependentReview(q,packFolder),dir=path.join(q,zaFolder);assert(fs.realpathSync(dir)===dir);
 const target=read(dir,'pack/inventory.json');
 assert(target.kind==='z-anatomy-original-source-private'&&target.approvedForCommercialDistribution===false);
 const receipt=read(pack.folder,'evidence/source-receipts.json'),sources=[];
 for(const tree of ['isa','partof']){
  const source=path.join(q,tree==='isa'?'bp3d-4.0':'bp3d-4.0-partof');assert(fs.realpathSync(source)===source);
  const r=receipt.sources[tree];assert(r?.complete===true&&r.files.length===3);
  const files={};for(const f of r.files){assert(['archive','names','elements'].includes(f.kind)&&!files[f.kind]);const b=fs.readFileSync(regular(source,f.name));assert(hash(b)===f.sha256&&b.length===f.bytes);files[f.kind]=f.name;}
  const archive=regular(source,files.archive),listing=execFileSync('unzip',['-Z','-1',archive],{encoding:'utf8',maxBuffer:16*1024*1024}).trim().split(/\r?\n/);
  checkArchiveEntryNames(listing);
  const archiveIndex=new Map();
  for(const entry of listing){const m=path.basename(entry).match(/^(FJ\d+[A-Za-z]?)\.obj$/i);if(!m)continue;assert(!archiveIndex.has(m[1]),'Ambiguous source member');archiveIndex.set(m[1],entry);}
  sources.push({tree,names:parseOfficialNames(fs.readFileSync(regular(source,files.names),'utf8')),elements:parseOfficialElements(fs.readFileSync(regular(source,files.elements),'utf8')),archiveIndex});
 }
 const report=planCoverage(target.converted,pack.inventory.bodyModels,sources);
 report.scope='Exact case-insensitive names only; no inferred synonym or cross-frame equivalence. Z-Anatomy comparison stays private.';
 report.sourcePack=packFolder;report.targetPack=zaFolder;
 report.sourceInventorySHA256=hash(fs.readFileSync(regular(pack.folder,'inventory.json')));
 const out=path.join(pack.folder,'coverage-expansion-plan-'+randomUUID()+'.json');
 fs.writeFileSync(out,JSON.stringify(report,null,2)+'\n',{flag:'wx',mode:0o600});
 console.log('INDEPENDENT COVERAGE PLAN',JSON.stringify({...report,rows:undefined,file:out}));return report;
}
if(process.argv[1]===fileURLToPath(import.meta.url))run(process.argv[2]||'',process.argv[3]||'');
