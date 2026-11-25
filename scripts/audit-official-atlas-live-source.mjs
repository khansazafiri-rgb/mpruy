// Explicit network audit of public publisher data in a temporary, gitignored
// workspace. No private workstation data, no model artifacts, no release.
import fs from 'node:fs';
import path from 'node:path';
import assert from 'node:assert/strict';
import {createHash} from 'node:crypto';
import {fileURLToPath} from 'node:url';
import {execFileSync} from 'node:child_process';
import {fetchOfficialFile,parseOfficialNames,parseOfficialElements,checkArchiveEntryNames} from '../licensing/tools/prepare-bodyparts3d-source.mjs';
import {priorityPlan,priorityTargets} from './independent-atlas-priority-recovery.mjs';
import {learningPriorityTargets} from './atlas-learning-priority-targets.mjs';
import {checkpoints} from './audit-independent-system-coverage.mjs';
import {parseObj,encodeNativeGlb} from './independent-bp3d-export.mjs';
import {parseNativePositions,comparePositions} from './audit-bp3d-publication-geometry.mjs';
const sha=b=>createHash('sha256').update(b).digest('hex');
const base='https://dbarchive.biosciencedbc.jp/data/bodyparts3d/LATEST/';
const root=fs.realpathSync(fileURLToPath(new URL('../',import.meta.url)));
const q=path.join(root,'local-data/licensing-quarantine');
export function samplePlan(rows,limitPerGroup=2){
 assert(Number.isInteger(limitPerGroup)&&limitPerGroup>0&&limitPerGroup<=5);
 const counts=new Map(),seen=new Set(),out=[];
 for(const row of rows){
  if(row.status!=='EXPORT_CANDIDATE'||seen.has(row.fmaId)||(counts.get(row.group)||0)>=limitPerGroup)continue;
  seen.add(row.fmaId);counts.set(row.group,(counts.get(row.group)||0)+1);out.push(row);
 }
 return out;
}
export async function auditLive(){
 fs.mkdirSync(q,{recursive:true,mode:0o700});assert(fs.realpathSync(q)===q);
 const out=fs.mkdtempSync(path.join(q,'official-source-live-audit-'));fs.chmodSync(out,0o700);
 try{
  const sources=[],receipts=[];
  for(const tree of ['isa','partof']){
   const files={archive:tree+'_BP3D_4.0_obj_99.zip',names:tree+'_parts_list_e.txt',elements:tree+'_element_parts.txt'},paths={},hashes={};
   for(const [kind,name] of Object.entries(files)){
    const file=path.join(out,name);await fetchOfficialFile(base+name,file,kind==='archive'?512*1024*1024:32*1024*1024);
    const b=fs.readFileSync(file);paths[kind]=file;hashes[kind]=sha(b);
    receipts.push({tree,kind,url:base+name,bytes:b.length,sha256:hashes[kind]});
   }
   const listing=execFileSync('unzip',['-Z','-1',paths.archive],{encoding:'utf8',maxBuffer:16*1024*1024}).trim().split(/\r?\n/);
   checkArchiveEntryNames(listing);
   const archiveIndex=new Map();
   for(const entry of listing){const m=path.basename(entry).match(/^(FJ\d+[A-Za-z]?)\.obj$/i);if(!m)continue;assert(!archiveIndex.has(m[1])&&/^[A-Za-z0-9_./-]+$/.test(entry));archiveIndex.set(m[1],entry);}
   assert(archiveIndex.size>0);
   sources.push({tree,hashes,archive:paths.archive,archiveIndex,names:parseOfficialNames(fs.readFileSync(paths.names,'utf8')),elements:parseOfficialElements(fs.readFileSync(paths.elements,'utf8'))});
  }
  const specs=[...priorityTargets,...Object.entries(checkpoints).flatMap(([g,rows])=>rows.map(([, ...names])=>[g,names])),...learningPriorityTargets];
  const rows=priorityPlan(sources,specs);
  const samples=[];
  for(const c of samplePlan(rows)){
   try{
    const source=sources.find(s=>s.tree===c.tree),parts=[],proof=[];let triangles=0;
    for(const id of c.elementIds){
     const entry=source.archiveIndex.get(id);assert(entry&&path.basename(entry).replace(/\.obj$/i,'')===id);
     const raw=execFileSync('unzip',['-p',source.archive,entry],{maxBuffer:96*1024*1024}),p=parseObj(raw.toString('utf8'));
     triangles+=p.positions.length/9;assert(triangles<=1500000,'Sample triangle budget');
     parts.push({id,...p});proof.push({id,sha256:sha(raw),triangles:p.positions.length/9});
    }
    const glb=encodeNativeGlb(parts,{fmaId:c.fmaId,bpId:c.bpId,tree:c.tree,officialName:c.name,sourceHashes:source.hashes,sourceElements:proof});
    const replay=parseNativePositions(glb.bytes);assert(replay.size===parts.length&&parts.every(p=>comparePositions(p.positions,replay.get(p.id))));
    samples.push({group:c.group,name:c.name,fmaId:c.fmaId,tree:c.tree,triangles,glbSHA256:glb.sha256,status:'EXACT_SOURCE_GEOMETRY_MATCH'});
   }catch(e){samples.push({group:c.group,name:c.name,fmaId:c.fmaId,status:'HOLD',reason:String(e.message)});}
  }
  const systems={};for(const r of rows){const g=systems[r.group]??={queries:0,resolved:0,held:0};g.queries++;g[r.status==='EXPORT_CANDIDATE'?'resolved':'held']++;}
  const report={schema:1,scope:'Fresh publisher source survey and bounded real-geometry sample, not the workstation inventory or a release.',receipts,systems,samples,unresolved:rows.filter(r=>r.status!=='EXPORT_CANDIDATE').map(r=>({group:r.group,target:r.target,status:r.status})),geometrySamplePass:samples.filter(r=>r.status==='EXACT_SOURCE_GEOMETRY_MATCH').length,geometrySampleHeld:samples.filter(r=>r.status!=='EXACT_SOURCE_GEOMETRY_MATCH').length,clinicalValidation:false,registrationValidated:false,publicRelease:'NO_GO',productionChanged:false,geometryPublished:0};
  console.log('OFFICIAL ATLAS LIVE SOURCE AUDIT',JSON.stringify(report));
  assert(samples.length>0&&report.geometrySampleHeld===0,'Real geometry sample held');
  return report;
 }finally{fs.rmSync(out,{recursive:true,force:true});}
}
if(process.argv[1]===fileURLToPath(import.meta.url))await auditLive();
