// Replay source-to-model evidence from the final private pack. No release approval.
import fs from 'node:fs';
import path from 'node:path';
import assert from 'node:assert/strict';
import {createHash,randomUUID} from 'node:crypto';
import {fileURLToPath} from 'node:url';
import {execFileSync} from 'node:child_process';
import {loadIndependentReview} from './load-independent-source-review.mjs';
import {loadVerifiedPublisherSources} from './plan-independent-atlas-coverage.mjs';
import {parseObj,encodeNativeGlb} from './independent-bp3d-export.mjs';
import {buildHraRegistry} from './atlas-hra-private-reference.mjs';
import {checkSourceNotices} from './audit-atlas-publication-rights.mjs';
const root=fs.realpathSync(fileURLToPath(new URL('../',import.meta.url))),q=path.join(root,'local-data/licensing-quarantine');
const hash=b=>createHash('sha256').update(b).digest('hex');
function safe(dir,rel){const p=path.resolve(dir,rel);assert(p.startsWith(dir+path.sep)&&fs.realpathSync(p)===p&&fs.statSync(p).isFile(),'Unsafe input '+rel);return p;}
export function checkSourceIdentity(model,source){
 assert(model.sourceTree===source.tree&&model.approvedForDistribution===false&&model.frame==='native-official-OBJ'&&model.license==='CC-BY-4.0','Model source or rights state differs');
 assert.deepEqual(model.sourceHashes,source.hashes);
 const matches=source.names.filter(n=>n.fmaId===model.fmaId&&n.bpId===model.bpId&&n.name===model.name);
 assert(matches.length===1,'Exact publisher concept absent or ambiguous');
 const expected=[...(source.elements.get(model.fmaId)||[])].sort();
 const observed=model.sourceElements.map(e=>e.id);
 assert(expected.length>0&&new Set(observed).size===observed.length);
 assert.deepEqual([...observed].sort(),expected,'Exact publisher element set differs');
 for(const e of model.sourceElements)assert(source.archiveIndex.get(e.id)===e.zipEntry&&typeof e.zipEntry==='string'&&/^[A-Za-z0-9_./-]+\.obj$/i.test(e.zipEntry)&&!e.zipEntry.startsWith('/')&&!e.zipEntry.split('/').includes('..')&&/^[a-f0-9]{64}$/.test(e.sha256),'Source member differs or unsafe');
}
export function checkReleaseBoundary(policy){
 for(const key of ['atlas-viewer','4d-lab']){
  const p=policy?.products?.[key];assert(p?.status==='blocked'&&Array.isArray(p.approvedBuilds)&&p.approvedBuilds.length===0&&p.ownerOverride?.enabled===false,'Unexpected release policy: '+key);
 }
 return {atlas:'BLOCKED',lab:'BLOCKED',ownerOverride:false};
}
export async function replay(folder){
 const pack=loadIndependentReview(q,folder),sources=loadVerifiedPublisherSources(pack.folder);
 const inv=pack.inventory,rows=[],references=[];
 const sourceNotices=checkSourceNotices(),policy=JSON.parse(fs.readFileSync(safe(root,'licensing/commercial-release.json'),'utf8')),releaseGate=checkReleaseBoundary(policy);
 for(const m of inv.bodyModels){
  try{
   const s=sources.find(x=>x.tree===m.sourceTree);assert(s);
   checkSourceIdentity(m,s);
   const parts=[];
   for(const e of m.sourceElements){
    const raw=execFileSync('unzip',['-p',s.archive,e.zipEntry],{maxBuffer:96*1024*1024});
    assert(hash(raw)===e.sha256,'Raw OBJ digest mismatch');
    parts.push({id:e.id,...parseObj(raw.toString('utf8'))});
   }
   const encoded=encodeNativeGlb(parts,{fmaId:m.fmaId,bpId:m.bpId,tree:m.sourceTree,officialName:m.name,sourceHashes:m.sourceHashes,sourceElements:m.sourceElements});
   assert(encoded.sha256===m.sha256&&encoded.triangles===m.triangles&&hash(fs.readFileSync(safe(pack.folder,m.path)))===m.sha256,'Full source-native GLB replay differs');
   rows.push({id:m.id,sha256:m.sha256,status:'EXACT_EXPORT_REPLAY',approvedForDistribution:false});
  }catch(e){rows.push({id:m.id,status:'HOLD',reason:String(e.message),approvedForDistribution:false});}
  if(rows.length%100===0)console.log('SOURCE REPLAY',rows.length+'/'+inv.bodyModels.length);
 }
 const original=await buildHraRegistry(q),cache=path.join(q,'hra-reference-organs-private');
 for(const r of inv.independentReferences){
  try{
   const a=original.assets.get(r.id);assert(a&&a.public.source===r.sourceURL&&a.public.version===r.version&&a.bytes===r.bytes,'Original HRA receipt identity differs');
   const receipt=JSON.parse(fs.readFileSync(safe(cache,r.id+'.glb.json'),'utf8'));
   assert(receipt.sha256===r.sha256&&receipt.url===r.sourceURL&&receipt.approvedForDistribution===false&&receipt.metadata?.some(x=>x?.object?.file===r.sourceURL));
   assert(hash(fs.readFileSync(a.file))===r.sha256&&hash(fs.readFileSync(safe(pack.folder,r.path)))===r.sha256,'HRA copy differs');
   references.push({id:r.id,sha256:r.sha256,status:'ORIGINAL_BYTES_AND_RECEIPT_MATCH',approvedForDistribution:false});
  }catch(e){references.push({id:r.id,status:'HOLD',reason:String(e.message),approvedForDistribution:false});}
 }
 const summary={schema:1,pack:folder,inventorySHA256:hash(fs.readFileSync(safe(pack.folder,'inventory.json'))),bodyTotal:rows.length,bodyMatched:rows.filter(r=>r.status==='EXACT_EXPORT_REPLAY').length,hraTotal:references.length,hraMatched:references.filter(r=>r.status==='ORIGINAL_BYTES_AND_RECEIPT_MATCH').length,hraCacheBlocked:original.blocked.length,sourceNotices,releaseGate,approved:0,clinicalValidation:false,publicRelease:'NO_GO'};
 const f=path.join(pack.folder,'source-replay-'+randomUUID()+'.json');
 fs.writeFileSync(f,JSON.stringify({...summary,rows,references},null,2)+'\n',{flag:'wx',mode:0o600});
 console.log('INDEPENDENT SOURCE REPLAY',JSON.stringify({...summary,file:f}));
 if(summary.bodyMatched!==summary.bodyTotal||summary.hraMatched!==summary.hraTotal||summary.hraCacheBlocked)process.exitCode=1;
 return summary;
}
if(process.argv[1]===fileURLToPath(import.meta.url))await replay(process.argv[2]||'');
