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
import {parsePublisherMetadata} from './acquire-hra-publication-metadata.mjs';
import {scanDistribution} from '../licensing/tools/check-distribution.mjs';
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
export function checkBodyAttribution(model,record){
 assert(record&&record.id===model.id&&record.name===model.name&&record.sha256===model.sha256,'Attribution identity differs');
 assert(model.license==='CC-BY-4.0'&&model.licenseURL==='https://creativecommons.org/licenses/by/4.0/'&&model.attribution==='BodyParts3D, © The Database Center for Life Science licensed under CC Attribution 4.0 International','Publisher attribution differs');
 assert(model.sourceArchive==='https://dbarchive.biosciencedbc.jp/data/bodyparts3d/LATEST/'+model.sourceTree+'_BP3D_4.0_obj_99.zip'&&model.historicalNotice?.includes('CC BY-SA 2.1 Japan')&&typeof model.changes==='string'&&model.changes.trim(),'Source or historical notice absent');
 for(const k of ['license','licenseURL','attribution','changes','historicalNotice'])assert.equal(record[k],model[k],'Attribution field differs: '+k);
 assert.equal(record.source,model.sourceArchive);
}
export function checkHraAttribution(model,record,proof){
 assert(record&&record.id===model.id&&record.name===model.name&&record.sha256===model.sha256&&model.exactApiAssetLink===true&&model.publisherRevision==='27d6d493cd53761abb10f087767ec4cc74acb051','HRA attribution or version evidence missing');
 assert(proof.assetURL===model.sourceURL&&proof.version===model.version&&proof.doi===model.doi&&proof.evidence===model.evidence&&proof.license===model.publisherLicense&&proof.license==='CC-BY-4.0');
 assert.deepEqual(proof.creators,model.creators);
 const text=proof.creators.join(', ')+' — '+model.name+' '+proof.version+'; '+proof.publisher+' / Human Reference Atlas; '+proof.doi+'; CC BY 4.0; https://creativecommons.org/licenses/by/4.0/';
 assert.equal(model.attribution,text);assert.equal(record.attribution,text);
 assert.equal(record.version,model.version);assert.equal(record.license,model.publisherLicense);assert.equal(record.source,model.sourceURL);assert.equal(record.doi,model.doi);assert.equal(record.evidence,model.evidence);
 assert.equal(record.changes,'Original published GLB bytes copied without modification');
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
 const bodyAtt=new Map(pack.attributions.body.map(x=>[x.id,x])),hraAtt=new Map(pack.attributions.references.map(x=>[x.id,x]));
 const sourceNotices=checkSourceNotices(),policy=JSON.parse(fs.readFileSync(safe(root,'licensing/commercial-release.json'),'utf8')),releaseGate=checkReleaseBoundary(policy);
 for(const m of inv.bodyModels){
  try{
   const s=sources.find(x=>x.tree===m.sourceTree);assert(s);
   checkSourceIdentity(m,s);checkBodyAttribution(m,bodyAtt.get(m.id));
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
   const metadata=fs.readFileSync(safe(pack.folder,'evidence/'+r.id+'.yaml'));assert(hash(metadata)===r.metadataSHA256);
   checkHraAttribution(r,hraAtt.get(r.id),parsePublisherMetadata(metadata.toString('utf8'),r.sourceURL));
   references.push({id:r.id,sha256:r.sha256,status:'ORIGINAL_BYTES_AND_RECEIPT_MATCH',approvedForDistribution:false});
  }catch(e){references.push({id:r.id,status:'HOLD',reason:String(e.message),approvedForDistribution:false});}
 }
 const guard=scanDistribution(path.join(pack.folder,'bp3d'));assert(guard.some(x=>x.includes('unapproved BodyParts3D source-identity GLB')),'Private geometry unexpectedly passes public distribution guard');
 const summary={schema:1,publicQuarantineRejectsPack:true,pack:folder,inventorySHA256:hash(fs.readFileSync(safe(pack.folder,'inventory.json'))),bodyTotal:rows.length,bodyMatched:rows.filter(r=>r.status==='EXACT_EXPORT_REPLAY').length,hraTotal:references.length,hraMatched:references.filter(r=>r.status==='ORIGINAL_BYTES_AND_RECEIPT_MATCH').length,hraCacheBlocked:original.blocked.length,sourceNotices,releaseGate,approved:0,clinicalValidation:false,publicRelease:'NO_GO'};
 const f=path.join(pack.folder,'source-replay-'+randomUUID()+'.json');
 fs.writeFileSync(f,JSON.stringify({...summary,rows,references},null,2)+'\n',{flag:'wx',mode:0o600});
 console.log('INDEPENDENT SOURCE REPLAY',JSON.stringify({...summary,file:f}));
 if(summary.bodyMatched!==summary.bodyTotal||summary.hraMatched!==summary.hraTotal||summary.hraCacheBlocked)process.exitCode=1;
 return summary;
}
if(process.argv[1]===fileURLToPath(import.meta.url))await replay(process.argv[2]||'');
