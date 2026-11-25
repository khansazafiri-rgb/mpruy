// Batch independent expansion: publisher identities and exact OBJ bytes only.
import fs from 'node:fs';
import path from 'node:path';
import assert from 'node:assert/strict';
import {createHash} from 'node:crypto';
import {fileURLToPath} from 'node:url';
import {execFileSync} from 'node:child_process';
import {groups} from '../apps/atlas-independent/src/inventory.js';
import {loadIndependentReview} from './load-independent-source-review.mjs';
import {loadVerifiedPublisherSources,formattingKey} from './plan-independent-atlas-coverage.mjs';
import {parseObj,encodeNativeGlb} from './independent-bp3d-export.mjs';
import {parseNativePositions,comparePositions} from './audit-bp3d-publication-geometry.mjs';
const root=fs.realpathSync(fileURLToPath(new URL('../',import.meta.url))),q=path.join(root,'local-data/licensing-quarantine');
const hash=b=>createHash('sha256').update(b).digest('hex');
const attribution='BodyParts3D, © The Database Center for Life Science licensed under CC Attribution 4.0 International';
const baseURL='https://dbarchive.biosciencedbc.jp/data/bodyparts3d/LATEST/';
function safe(dir,rel){const p=path.resolve(dir,rel);assert(p.startsWith(dir+path.sep)&&fs.realpathSync(p)===p&&fs.statSync(p).isFile(),'Unsafe input '+rel);return p;}
const read=(dir,p)=>JSON.parse(fs.readFileSync(safe(dir,p),'utf8'));
const write=(dir,p,d)=>fs.writeFileSync(path.join(dir,p),JSON.stringify(d,null,2)+'\n',{flag:'wx',mode:0o600});
export function planBatchExpansion(body,targets,legacy,sources){
 const claims=new Map(),byFma=new Map(),byFormat=new Map(),existing=new Set(body.map(x=>x.fmaId));
 function add(map,k,v){const a=map.get(k)||[];a.push(v);map.set(k,a);}
 for(const s of sources)for(const n of s.names){
  const elementIds=[...(s.elements.get(n.fmaId)||[])].sort();
  if(!elementIds.length||!elementIds.every(id=>s.archiveIndex.has(id)))continue;
  const row={...n,tree:s.tree,elementIds};
  add(byFma,n.fmaId,row);add(byFormat,formattingKey(n.name),row);
 }
 for(const e of legacy){
  if(!Object.hasOwn(groups,e.group)||!/^FMA\d+$/.test(e.fmaId||'')||!/^BP\d+$/.test(e.bpId||''))continue;
  const hit=(byFma.get(e.fmaId)||[]).filter(x=>x.tree==='isa'&&x.bpId===e.bpId);
  if(hit.length===1)add(claims,e.fmaId,{group:e.group,method:'legacy-FMA-BP-discovery',targetName:e.name});
 }
 for(const t of targets){
  if(!Object.hasOwn(groups,t.group))continue;
  const matches=byFormat.get(formattingKey(t.name))||[];
  const fmas=new Set(matches.map(x=>x.fmaId));
  if(fmas.size===1)add(claims,matches[0].fmaId,{group:t.group,method:'unique-format-discovery',targetName:t.name});
 }
 const usedElements=new Set(body.flatMap(m=>m.sourceElements.map(e=>e.id))),rows=[],candidates=[];
 for(const [fmaId,all] of [...byFma].sort(([a],[b])=>Number(a.slice(3))-Number(b.slice(3)))){
  if(existing.has(fmaId)){rows.push({fmaId,status:'PRESENT_FMA'});continue;}
  const c=claims.get(fmaId)||[],g=new Set(c.map(x=>x.group));
  if(g.size!==1){rows.push({fmaId,status:g.size?'CONFLICTING_SYSTEM_REVIEW':'UNCLASSIFIED_SOURCE_CONCEPT',officialNames:[...new Set(all.map(x=>x.name))],claims:c});continue;}
  const isa=all.filter(x=>x.tree==='isa'),preferred=isa.length?isa:all;
  if(preferred.length!==1){rows.push({fmaId,status:'AMBIGUOUS_REPRESENTATION',choices:preferred,claims:c});continue;}
  candidates.push({...preferred[0],group:[...g][0],claims:c});
 }
 // Prefer individual source elements before composites, and never add a new overlapping
 // representation to the automatically displayed collection. Held concepts remain catalogued.
 candidates.sort((a,b)=>a.elementIds.length-b.elementIds.length||a.fmaId.localeCompare(b.fmaId));
 for(const c of candidates){
  if(c.elementIds.some(id=>usedElements.has(id))){rows.push({...c,status:'OVERLAPPING_ELEMENT_REVIEW'});continue;}
  c.elementIds.forEach(id=>usedElements.add(id));
  rows.push({...c,status:'EXPORT_CANDIDATE'});
 }
 const counts={};for(const r of rows)counts[r.status]=(counts[r.status]||0)+1;
 return {schema:1,counts,rows,officialConcepts:byFma.size,publicRelease:'NO_GO',clinicalValidation:false};
}
export function expand(packFolder,targetFolder){
 assert(/^z-anatomy-native-preview-[A-Za-z0-9_-]+$/.test(targetFolder)&&fs.realpathSync(q)===q);
 const pack=loadIndependentReview(q,packFolder),targetDir=path.join(q,targetFolder);assert(fs.realpathSync(targetDir)===targetDir);
 const target=read(targetDir,'pack/inventory.json');assert(target.kind==='z-anatomy-original-source-private'&&target.approvedForCommercialDistribution===false);
 const sources=loadVerifiedPublisherSources(pack.folder),isa=sources.find(s=>s.tree==='isa');
 let legacy=[],legacyStatus='NOT_AVAILABLE';
 const oldDir=path.join(q,'bp3d-all-systems');
 if(fs.existsSync(oldDir)){
  try{assert(fs.realpathSync(oldDir)===oldDir);const old=read(oldDir,'inventory.json');
   assert(old.approvedForCommercialDistribution===false&&old.geometryRegisteredToMEDCOEL===false&&old.legalStatus==='NOT-CLEARED');
   assert(old.sourceHashes?.archiveSha256===isa.hashes.archive&&old.sourceHashes?.namesSha256===isa.hashes.names&&old.sourceHashes?.elementsSha256===isa.hashes.elements);
   legacy=old.converted;assert(Array.isArray(legacy));legacyStatus='SOURCE_HASH_MATCH';
  }catch(e){legacy=[];legacyStatus='HELD: '+String(e.message);}
 }
 const inv=pack.inventory;assert(!inv.expansion,'Use original independent base pack for deterministic batch expansion');
 const plan=planBatchExpansion(inv.bodyModels,target.converted,legacy,sources);
 plan.legacyStatus=legacyStatus;plan.basePack=packFolder;plan.targetPack=targetFolder;
 const out=fs.mkdtempSync(path.join(q,'independent-source-review-'));fs.chmodSync(out,0o700);
 const results=[],models=[...inv.bodyModels],added=[];let newBytes=0;
 const maxNewBytes=2*1024*1024*1024;
 try{
  for(const sub of ['bp3d','hra','evidence'])fs.mkdirSync(path.join(out,sub),{mode:0o700});
  const copy=(rel,digest)=>{const b=fs.readFileSync(safe(pack.folder,rel));if(digest)assert(hash(b)===digest);fs.writeFileSync(path.join(out,rel),b,{mode:0o600,flag:'wx'});};
  for(const m of inv.bodyModels)copy(m.path,m.sha256);
  for(const r of inv.independentReferences){copy(r.path,r.sha256);copy('evidence/'+r.id+'.yaml',r.metadataSHA256);}
  for(const n of ['source-receipts.json','source-labels.json','source-geometry.json','software-notices.json','hra-rights.json'])copy('evidence/'+n);
  for(const c of plan.rows.filter(r=>r.status==='EXPORT_CANDIDATE')){
   if(newBytes>=maxNewBytes){results.push({fmaId:c.fmaId,status:'HOLD_STORAGE_BUDGET'});continue;}
   const id='source-'+c.tree+'-'+c.fmaId.toLowerCase()+'-'+c.bpId.toLowerCase();
   const file='bp3d/'+id+'.glb';
   try{
    assert(!models.some(m=>m.id===id||m.fmaId===c.fmaId),'Duplicate identity');
    const source=sources.find(s=>s.tree===c.tree);assert(source);
    const identity=source.names.filter(n=>n.fmaId===c.fmaId&&n.bpId===c.bpId&&n.name===c.name);assert(identity.length===1);
    assert.deepEqual([...source.elements.get(c.fmaId)].sort(),c.elementIds);
    const parts=[],proof=[];
    for(const fj of c.elementIds){
     const entry=source.archiveIndex.get(fj);assert(typeof entry==='string'&&/^[A-Za-z0-9_./-]+\.obj$/i.test(entry)&&!entry.startsWith('/')&&!entry.split('/').includes('..')&&path.basename(entry).replace(/\.obj$/i,'')===fj,'Unsafe archive member');
     const raw=execFileSync('unzip',['-p',source.archive,entry],{maxBuffer:96*1024*1024});
     const parsed=parseObj(raw.toString('utf8'));parts.push({id:fj,...parsed});proof.push({id:fj,zipEntry:entry,sha256:hash(raw),triangles:parsed.positions.length/9});
    }
    const encoded=encodeNativeGlb(parts,{fmaId:c.fmaId,bpId:c.bpId,tree:c.tree,officialName:c.name,sourceHashes:source.hashes,sourceElements:proof});
    const verified=parseNativePositions(encoded.bytes);assert(verified.size===parts.length&&parts.every(p=>comparePositions(p.positions,verified.get(p.id))));
    if(newBytes+encoded.bytes.length>maxNewBytes){results.push({fmaId:c.fmaId,status:'HOLD_STORAGE_BUDGET'});continue;}
    fs.writeFileSync(path.join(out,file),encoded.bytes,{flag:'wx',mode:0o600});newBytes+=encoded.bytes.length;
    const m={id,name:c.name,group:c.group,fmaId:c.fmaId,bpId:c.bpId,path:file,sha256:encoded.sha256,triangles:encoded.triangles,sourceTree:c.tree,sourceHashes:source.hashes,sourceElements:proof,license:'CC-BY-4.0',licenseURL:'https://creativecommons.org/licenses/by/4.0/',attribution,sourceArchive:baseURL+c.tree+'_BP3D_4.0_obj_99.zip',changes:'Source OBJ converted to native GLB; degenerate triangles omitted; no transforms.',historicalNotice:'Retain original CC BY-SA 2.1 Japan notices; record reconciliation before distribution.',frame:'native-official-OBJ',classificationProvisional:true,approvedForDistribution:false};
    models.push(m);added.push({id,sha256:m.sha256,fmaId:m.fmaId,bpId:m.bpId,sourceTree:m.sourceTree,sourceHashes:m.sourceHashes,sourceElements:m.sourceElements});results.push({fmaId:c.fmaId,id,status:'EXPORTED'});
    if(added.length%100===0)console.log('BATCH EXPANSION',added.length);
   }catch(e){const partial=path.join(out,file);if(fs.existsSync(partial))fs.unlinkSync(partial);results.push({fmaId:c.fmaId,status:'HOLD_EXPORT',reason:String(e.message)});}
  }
  const baseHash=hash(fs.readFileSync(safe(pack.folder,'inventory.json')));
  // Bind original receipt report to base count; do not rewrite original acquisition evidence.
  const expansion={schema:1,basePack:packFolder,baseInventorySHA256:baseHash,baseModels:inv.bodyModels.map(m=>({id:m.id,sha256:m.sha256})),added,results,publicRelease:'NO_GO',approved:0};
  write(out,'evidence/expansion.json',expansion);
  write(out,'evidence/expansion-plan.json',plan);
  write(out,'inventory.json',{...inv,bodyModels:models,expansion:{baseModels:inv.bodyModels.length,added:added.length},publicRelease:'NO_GO'});
  write(out,'MODEL-ATTRIBUTIONS.json',{schema:1,body:models.map(m=>({id:m.id,name:m.name,sha256:m.sha256,license:m.license,licenseURL:m.licenseURL,attribution:m.attribution,source:m.sourceArchive,changes:m.changes,historicalNotice:m.historicalNotice})),references:pack.attributions.references});
  const summary={...pack.summary,bodyModels:models.length,sourceReceipts:models.length,baseModels:inv.bodyModels.length,added:added.length,exportHeld:results.filter(r=>r.status!=='EXPORTED').length,publicRelease:'NO_GO',approved:0};
  write(out,'review-summary.json',summary);
  const verified=loadIndependentReview(q,path.basename(out));assert(verified.inventory.bodyModels.length===models.length);
  console.log('INDEPENDENT BATCH EXPANSION',JSON.stringify({...summary,folder:path.basename(out),planCounts:plan.counts,legacyStatus,addedBytes:newBytes}));return {folder:path.basename(out),summary};
 }catch(e){fs.rmSync(out,{recursive:true,force:true});throw e;}
}
if(process.argv[1]===fileURLToPath(import.meta.url))expand(process.argv[2]||'',process.argv[3]||'');
