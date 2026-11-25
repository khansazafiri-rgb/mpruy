// Assemble an independently sourced review pack (no Z-Anatomy geometry or old viewer code).
// Source-native frames remain separate. This is never a public release.
import fs from 'node:fs';
import path from 'node:path';
import assert from 'node:assert/strict';
import {createHash} from 'node:crypto';
import {fileURLToPath} from 'node:url';
import {execFileSync} from 'node:child_process';
import {parseObj,encodeNativeGlb} from './independent-bp3d-export.mjs';
import {parseNativePositions,comparePositions} from './audit-bp3d-publication-geometry.mjs';
import {prepareHraRightsReview} from './prepare-hra-publication-rights.mjs';
import {verifyReceipts} from './verify-bp3d-publication-receipts.mjs';
import {checkSourceNotices} from './audit-atlas-publication-rights.mjs';
const root=fs.realpathSync(fileURLToPath(new URL('../',import.meta.url))),q=path.join(root,'local-data/licensing-quarantine');
const hash=b=>createHash('sha256').update(b).digest('hex');
function regular(dir,rel){const p=path.resolve(dir,rel);assert(p.startsWith(dir+path.sep)&&fs.realpathSync(p)===p&&fs.statSync(p).isFile(),'Unsafe input '+rel);return p;}
function read(dir,n){return JSON.parse(fs.readFileSync(regular(dir,n),'utf8'));}
function write(dir,name,data){fs.writeFileSync(path.join(dir,name),JSON.stringify(data,null,2)+'\n',{flag:'wx',mode:0o600});}
export function verifySourceBinding(label,geometry){
 assert(label.approvedForDistribution===false&&geometry.approvedForDistribution===false&&['EXACT_RAW_GEOMETRY_MATCH','EXACT_RAW_GEOMETRY_MATCH_LABEL_REVIEW'].includes(geometry.status));
 for(const key of ['id','sha256','fmaId','bpId','tree'])assert.equal(label[key],geometry[key],'Source identity changed: '+key);
 assert(label.displayName===geometry.officialName&&label.labelAmbiguous===false,'Publisher name mismatch');
 assert.deepEqual(label.sourceHashes,geometry.sourceHashes);
 assert.deepEqual(label.sourceElements,geometry.sourceElements);
 assert(label.license==='CC-BY-4.0'&&label.attribution&&label.historicalNotice);
}
export async function assemble(bpFolder,hraFolder){
 assert(/^bp3d-integrated-preview-[A-Za-z0-9_-]+$/.test(bpFolder)&&/^hra-publisher-metadata-[A-Za-z0-9_-]+$/.test(hraFolder)&&fs.realpathSync(q)===q);
 const dir=path.join(q,bpFolder);assert(fs.realpathSync(dir)===dir);
 const labels=read(dir,'publication-bp3d-publisher-labels.json'),geometry=read(dir,'publication-bp3d-geometry-evidence.json');
 assert(labels.publicRelease==='NO_GO'&&geometry.publicRelease==='NO_GO'&&labels.total===labels.rows.length&&labels.total===geometry.rows.length&&labels.held.length===0&&geometry.geometryMatched===labels.total);
 assert(labels.sourceAuditSHA256===hash(fs.readFileSync(regular(dir,'publication-bp3d-geometry-evidence.json'))),'Geometry report changed');
 const receipts=await verifyReceipts(bpFolder);assert(receipts.completeModels===labels.total,'Source receipts incomplete');
 const hra=await prepareHraRightsReview(q,hraFolder);assert(hra.total>0&&hra.total===hra.matched&&hra.blocked.length===0,'HRA source metadata incomplete');
 const originalPack=path.join(dir,'pack'),old=read(originalPack,'inventory.json'),byId=new Map(old.converted.map(e=>[e.id,e])),g=new Map(geometry.rows.map(e=>[e.id,e]));
 assert(byId.size===labels.total&&g.size===labels.total);
 const out=fs.mkdtempSync(path.join(q,'independent-source-review-'));fs.chmodSync(out,0o700);
 try{
  for(const folder of ['bp3d','hra','evidence'])fs.mkdirSync(path.join(out,folder),{mode:0o700});
  const sourceFiles=new Map(),models=[],references=[],ids=new Set();
  for(const label of labels.rows){
   const proof=g.get(label.id);assert(proof&&!ids.has(label.id)&&/^[a-z0-9-]+$/.test(label.id));ids.add(label.id);
   verifySourceBinding(label,proof);
   const entry=byId.get(label.id);assert(entry&&entry.glbSha256===label.sha256&&entry.modelPath==='./structures/'+entry.id+'/model.glb');
   const bytes=fs.readFileSync(regular(originalPack,entry.modelPath));assert(hash(bytes)===label.sha256);
   const original=parseNativePositions(bytes);
   if(!sourceFiles.has(label.tree)){
    assert(['isa','partof'].includes(label.tree));
    const source=path.join(q,label.tree==='isa'?'bp3d-4.0':'bp3d-4.0-partof'),archive=regular(source,label.tree+'_BP3D_4.0_obj_99.zip');
    assert(hash(fs.readFileSync(archive))===label.sourceHashes.archive);
    const files=execFileSync('unzip',['-Z','-1',archive],{encoding:'utf8',maxBuffer:16*1024*1024}).trim().split(/\r?\n/);
    sourceFiles.set(label.tree,{archive,files:new Set(files)});
   }
   const source=sourceFiles.get(label.tree),parts=[];
   for(const p of label.sourceElements){
    assert(/^FJ\d+[A-Za-z]?$/.test(p.id)&&typeof p.zipEntry==='string'&&/^[A-Za-z0-9_./-]+\.obj$/i.test(p.zipEntry)&&!p.zipEntry.startsWith('/')&&!p.zipEntry.split('/').includes('..')&&path.basename(p.zipEntry)===p.id+'.obj'&&source.files.has(p.zipEntry));
    const raw=execFileSync('unzip',['-p',source.archive,p.zipEntry],{maxBuffer:96*1024*1024});
    assert(hash(raw)===p.sha256,'Raw source element changed');
    const parsed=parseObj(raw.toString('utf8'));assert(original.has(p.id)&&comparePositions(parsed.positions,original.get(p.id)),'Independent export differs from previously audited geometry');
    parts.push({id:p.id,...parsed});
   }
   assert(parts.length===original.size);
   const encoded=encodeNativeGlb(parts,{fmaId:label.fmaId,bpId:label.bpId,tree:label.tree,officialName:label.displayName,sourceHashes:label.sourceHashes,sourceElements:label.sourceElements});
   const check=parseNativePositions(encoded.bytes);assert(check.size===original.size&&parts.every(p=>comparePositions(p.positions,check.get(p.id))),'Encoded source verification failed');
   const file='bp3d/'+label.id+'.glb';fs.writeFileSync(path.join(out,file),encoded.bytes,{flag:'wx',mode:0o600});
   models.push({id:label.id,name:label.displayName,oldName:label.previousName,group:entry.group,fmaId:label.fmaId,bpId:label.bpId,path:file,sha256:encoded.sha256,triangles:encoded.triangles,sourceTree:label.tree,sourceHashes:label.sourceHashes,sourceElements:label.sourceElements,license:label.license,attribution:label.attribution,licenseURL:label.licenseURL,sourceArchive:label.sourceArchive,changes:label.changes,historicalNotice:label.historicalNotice,frame:'native-official-OBJ',approvedForDistribution:false});
   if(models.length%100===0)console.log('INDEPENDENT BP3D EXPORTED',models.length+'/'+labels.total);
  }
  const cache=path.join(q,'hra-reference-organs-private');
  for(const r of hra.rows){
   assert(r.status==='PUBLISHER_VERSION_EVIDENCE_MATCHED'&&r.approvedForDistribution===false&&/^[a-f0-9]{24}$/.test(r.id)&&r.metadataSHA256&&r.publisherRevision);
   const bytes=fs.readFileSync(regular(cache,r.id+'.glb'));assert(hash(bytes)===r.sha256);
   const file='hra/'+r.id+'.glb';fs.writeFileSync(path.join(out,file),bytes,{flag:'wx',mode:0o600});
   references.push({...r,path:file,frame:'independent HRA reference',approvedForDistribution:false});
  }
  const sourceNotices=checkSourceNotices();
  write(out,'inventory.json',{schema:1,mode:'independent-source-review',publicRelease:'NO_GO',approvedForCommercialDistribution:false,bodyFrame:'native-official-OBJ',bodyModels:models,independentReferences:references,registrationValidated:false,clinicalValidation:false});
  write(out,'MODEL-ATTRIBUTIONS.json',{schema:1,body:models.map(m=>({id:m.id,name:m.name,sha256:m.sha256,license:m.license,licenseURL:m.licenseURL,attribution:m.attribution,source:m.sourceArchive,changes:m.changes,historicalNotice:m.historicalNotice})),references:references.map(r=>({id:r.id,name:r.name,version:r.version,sha256:r.sha256,license:r.publisherLicense,attribution:r.attribution,source:r.sourceURL,doi:r.doi,evidence:r.evidence,changes:'Original published GLB bytes copied without modification'}))});
  write(path.join(out,'evidence'),'source-receipts.json',receipts);
  write(path.join(out,'evidence'),'software-notices.json',sourceNotices);
  write(path.join(out,'evidence'),'hra-rights.json',hra);
  const summary={schema:1,bodyModels:models.length,hraReferences:references.length,sourceReceipts:receipts.completeModels,approved:0,publicRelease:'NO_GO',clinicalValidation:false,productionChanged:false,zAnatomyModelsIncluded:0};
  write(out,'review-summary.json',summary);console.log('INDEPENDENT SOURCE REVIEW PACK',JSON.stringify({...summary,folder:out}));return summary;
 }catch(e){fs.rmSync(out,{recursive:true,force:true});throw e;}
}
if(process.argv[1]===fileURLToPath(import.meta.url))await assemble(process.argv[2]||'',process.argv[3]||'');
