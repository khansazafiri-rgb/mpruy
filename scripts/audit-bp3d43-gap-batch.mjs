// Resolve element IDs from actual pinned mirror tree, never generic FMA labels.
import fs from 'node:fs';
import path from 'node:path';
import os from 'node:os';
import assert from 'node:assert/strict';
import {execFileSync} from 'node:child_process';
import {fileURLToPath} from 'node:url';
import {parseMembership,validateCandidates,run} from './intake-bp3d43-priority-elements.mjs';
import {runMirror} from './audit-bp3d43-mirror-elements.mjs';
const root=fs.realpathSync(fileURLToPath(new URL('../',import.meta.url)));
const pin='fd527e6f4daf732fd814314d9257df5877b844bc';
const BATCHES=Object.freeze({gap:{count:28,file:'bp3d43-gap-batch-candidates.json'},'nerves-32':{count:32,file:'bp3d43-nerves32-candidates.json'},'discs-23':{count:23,file:'bp3d43-discs-23-candidates.json'},'costal-20':{count:20,file:'bp3d43-costal-20-candidates.json'},'head-neck-cartilage-14':{count:14,file:'bp3d43-head-neck-cartilage-14-candidates.json'},'visceral-18':{count:18,file:'bp3d43-visceral-18-candidates.json'}});
function spec(batch){assert(Object.hasOwn(BATCHES,batch),'Unknown audit batch');return BATCHES[batch];}
export function resolveGapRows(doc,paths,catalog){
 assert(doc.schema===1&&doc.sourceVersion==='4.3'&&doc.publicRelease==='NO_GO'&&doc.geometryVerified===false&&doc.mirrorCommit===pin&&doc.rows.length===spec(doc.batchId||'gap').count);
 const seen=new Set(),rows=[],held=[];
 for(const r of doc.rows){
  assert(/^FJ\d+[A-Za-z]?$/.test(r.fj)&&!seen.has(r.fj)&&typeof r.name==='string'&&Number.isSafeInteger(r.bytes)&&r.bytes>0);seen.add(r.fj);
  try{
   const files=paths.filter(p=>p.startsWith('meshes/'+r.fj+'_')&&p.endsWith('.obj'));assert.equal(files.length,1,'Ambiguous mirror identity '+r.fj);
   const name=path.posix.basename(files[0]),m=name.match(/^(FJ\d+[A-Za-z]?)_(BP\d+)_(FMA\d+)_(.+)\.obj$/);
   const normal=s=>s.toLowerCase().replace(/_/g,' ').trim().replace(/\s+/g,' ');
   assert(m&&m[1]===r.fj&&normal(m[4])===normal(r.name),'Source label differs '+r.fj);
   const conceptMembership=['is_a','part_of'].filter(t=>catalog.rows.get(m[3]+':'+t)?.includes(r.fj));assert(conceptMembership.length,'No exact membership '+r.fj);
   rows.push({...r,bp:m[2],fma:m[3],conceptMembership,observedArchiveBasename:name});
  }catch(e){held.push({fj:r.fj,name:r.name,status:'HOLD_IDENTITY',reason:String(e.message).slice(0,400)});}
 }
 const resolved={...doc,licenseReview:'VERSION_SPECIFIC_REVIEW_REQUIRED',rows,identityHeld:held};validateCandidates(resolved,catalog);return resolved;
}
function resolve(batch='gap'){
 const dir=fs.mkdtempSync(path.join(os.tmpdir(),'medcoel-bp43-gap-tree-'));
 try{
  const git=(args,maxBuffer=8*1024*1024)=>execFileSync('git',['-c','core.hooksPath=/dev/null','-c','credential.helper=','-c','protocol.file.allow=never',...args],{cwd:dir,maxBuffer,timeout:180000,env:{...process.env,GIT_LFS_SKIP_SMUDGE:'1',GIT_TERMINAL_PROMPT:'0',GIT_CONFIG_NOSYSTEM:'1',GIT_CONFIG_GLOBAL:'/dev/null'}});
  git(['init','--quiet']);git(['remote','add','origin','https://github.com/olivercase/body_parts_3d_api.git']);git(['fetch','--no-tags','--depth=1','origin',pin]);assert.equal(git(['rev-parse','FETCH_HEAD']).toString().trim(),pin);
  const doc=JSON.parse(fs.readFileSync(path.join(root,'licensing/atlas-publication',spec(batch).file),'utf8'));
  for(const [f,b] of [['MANIFEST.csv',doc.manifestBlob],['metadata/FMA2Obj.txt',doc.membershipBlob]])assert.equal(git(['rev-parse',pin+':'+f]).toString().trim(),b);
  assert((doc.batchId||'gap')===batch,'Batch identity mismatch');
  const catalog=parseMembership(git(['show',pin+':metadata/FMA2Obj.txt']).toString('utf8')),paths=git(['ls-tree','-r','-z','--name-only',pin]).toString().split('\0');
  const resolved=resolveGapRows(doc,paths,catalog);console.log('BP3D43 GAP BATCH IDENTITIES',JSON.stringify(resolved));return resolved;
 }finally{fs.rmSync(dir,{recursive:true,force:true});}
}
export function compareGapReports(doc,publisher,mirror){
 const results=[...doc.identityHeld];
 for(const r of doc.rows){
  const p=publisher?.results?.find(x=>x.fj===r.fj),m=mirror?.results?.find(x=>x.fj===r.fj);
  const match=p?.status==='EXACT_SOURCE_ELEMENT_GEOMETRY_MATCH'&&m?.status==='EXACT_MIRROR_ELEMENT_GEOMETRY_MATCH'&&/^[a-f0-9]{64}$/.test(p.rawSHA256||'')&&p.rawSHA256===m.rawSHA256&&p.triangles===m.triangles&&p.triangles>0&&p.bp===r.bp&&m.bp===r.bp&&p.fma===r.fma&&m.fma===r.fma;
  results.push(match?{fj:r.fj,bp:r.bp,fma:r.fma,name:r.name,triangles:p.triangles,rawSHA256:p.rawSHA256,status:'DUAL_SOURCE_MATCH'}:{fj:r.fj,name:r.name,status:'HOLD_GEOMETRY',publisher:p?.status||'UNAVAILABLE',mirror:m?.status||'UNAVAILABLE',publisherReason:p?.reason||null,mirrorReason:m?.reason||null});
 }
 assert.equal(results.length,spec(doc.batchId||'gap').count);
 return {results,matched:results.filter(x=>x.status==='DUAL_SOURCE_MATCH').length,held:results.filter(x=>x.status!=='DUAL_SOURCE_MATCH').length,geometryPublished:0,publicRelease:'NO_GO',clinicalValidation:false,registrationValidated:false};
}
function main(){
 const batch=process.argv[2]||'gap';spec(batch);
 const doc=resolve(batch);let publisher=null,mirror=null;
 if(doc.rows.length){
  try{publisher=run(doc,{allowHeld:true});}catch(e){console.warn('Publisher batch unavailable:',String(e.message).slice(0,400));}
  try{mirror=runMirror(doc,{allowHeld:true});}catch(e){console.warn('Mirror batch unavailable:',String(e.message).slice(0,400));}
 }
 const report=compareGapReports(doc,publisher,mirror);console.log('BP3D43 GAP BATCH DUAL SOURCE REPORT',JSON.stringify(report));assert.equal(report.held,0,'One or more candidates held; see per-element evidence');
}
if(process.argv[1]===fileURLToPath(import.meta.url))main();
