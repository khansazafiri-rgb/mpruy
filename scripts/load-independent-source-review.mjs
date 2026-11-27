// Exact independent review pack reader. No legacy geometry, no public route.
import fs from 'node:fs';
import path from 'node:path';
import assert from 'node:assert/strict';
import {createHash} from 'node:crypto';
import {groups,validateInventory} from '../apps/atlas-independent/src/inventory.js';
import {parseNativePositions} from './audit-bp3d-publication-geometry.mjs';
import {inspectGlb} from './atlas-onepass-supplementary.mjs';
import {parsePublisherMetadata} from './acquire-hra-publication-metadata.mjs';
const hash=b=>createHash('sha256').update(b).digest('hex');
function regular(dir,rel){
 const p=path.resolve(dir,rel);
 assert(p.startsWith(dir+path.sep)&&fs.realpathSync(p)===p&&fs.statSync(p).isFile(),'Unsafe pack input '+rel);
 return p;
}
function bytes(dir,rel){return fs.readFileSync(regular(dir,rel));}
function json(dir,rel){return JSON.parse(bytes(dir,rel).toString('utf8'));}
export function bodyDisplayEntry(m){
 assert(/^[a-z0-9-]+$/.test(m.id||'')&&typeof m.name==='string'&&m.name.trim()&&Object.hasOwn(groups,m.group)&&/^FMA\d+$/.test(m.fmaId)&&/^BP\d+$/.test(m.bpId)&&m.frame==='native-official-OBJ'&&m.approvedForDistribution===false&&m.license==='CC-BY-4.0'&&m.path==='bp3d/'+m.id+'.glb','Invalid independent body identity');
 return {id:'bp-'+hash(m.id).slice(0,24),name:m.name,group:m.group,regions:['whole'],fmaId:m.fmaId,bpId:m.bpId,approvedForDistribution:false,source:'BodyParts3D 4.0',classificationProvisional:true};
}
export function loadIndependentReview(privateRoot,folder){
 assert(/^independent-source-review-[A-Za-z0-9_-]+$/.test(folder)&&fs.realpathSync(privateRoot)===privateRoot);
 const dir=path.join(privateRoot,folder);assert(fs.realpathSync(dir)===dir);
 const inv=json(dir,'inventory.json'),summary=json(dir,'review-summary.json'),att=json(dir,'MODEL-ATTRIBUTIONS.json'),receipt=json(dir,'evidence/source-receipts.json');
 assert(inv.schema===1&&inv.mode==='independent-source-review'&&inv.publicRelease==='NO_GO'&&inv.approvedForCommercialDistribution===false&&inv.bodyFrame==='native-official-OBJ'&&inv.registrationValidated===false&&inv.clinicalValidation===false);
 assert(summary.publicRelease==='NO_GO'&&summary.approved===0&&summary.zAnatomyModelsIncluded===0&&summary.bodyModels===inv.bodyModels.length&&summary.hraReferences===inv.independentReferences.length);
 assert(receipt.publicRelease==='NO_GO'&&receipt.completeModels===receipt.total&&Number.isSafeInteger(receipt.total)&&receipt.total>0);
 for(const tree of ['isa','partof']){
  const src=receipt.sources[tree];assert(src?.complete===true&&src.files.length===3);
  const expected={archive:tree+'_BP3D_4.0_obj_99.zip',names:tree+'_parts_list_e.txt',elements:tree+'_element_parts.txt'};
  const seen=new Set();
  for(const f of src.files){assert(Object.hasOwn(expected,f.kind)&&!seen.has(f.kind)&&f.name===expected[f.kind]&&/^[a-f0-9]{64}$/.test(f.sha256)&&Number.isSafeInteger(f.bytes)&&f.bytes>0&&f.url==='https://dbarchive.biosciencedbc.jp/data/bodyparts3d/LATEST/'+f.name&&['EXISTING_RECEIPT_MATCH','FRESH_PUBLISHER_BYTES_MATCH'].includes(f.status));seen.add(f.kind);}
 }
 if(!inv.expansion)assert(receipt.total===inv.bodyModels.length);
 else{
  const ex=json(dir,'evidence/expansion.json');
  assert(ex.schema===1&&ex.publicRelease==='NO_GO'&&ex.approved===0&&/^independent-source-review-[A-Za-z0-9_-]+$/.test(ex.basePack)&&ex.basePack!==folder&&/^[a-f0-9]{64}$/.test(ex.baseInventorySHA256));
  assert(inv.expansion.baseModels===receipt.total&&ex.baseModels.length===receipt.total&&inv.expansion.added===ex.added.length&&ex.added.length+ex.baseModels.length===inv.bodyModels.length);
  const baseDir=path.join(privateRoot,ex.basePack);assert(fs.realpathSync(baseDir)===baseDir);
  const baseBytes=bytes(baseDir,'inventory.json');assert(hash(baseBytes)===ex.baseInventorySHA256);
  const base=JSON.parse(baseBytes.toString('utf8'));assert(!base.expansion&&base.publicRelease==='NO_GO'&&base.bodyModels.length===receipt.total);
  const original=new Map(base.bodyModels.map(m=>[m.id,m])),all=new Map(inv.bodyModels.map(m=>[m.id,m]));
  assert(original.size===receipt.total&&all.size===inv.bodyModels.length);
  const accounted=new Set(),usedFma=new Set(base.bodyModels.map(m=>m.fmaId)),usedElements=new Set(base.bodyModels.flatMap(m=>m.sourceElements.map(e=>e.id)));
  for(const m of ex.baseModels){assert(!accounted.has(m.id)&&original.get(m.id)?.sha256===m.sha256);assert.deepEqual(all.get(m.id),original.get(m.id));accounted.add(m.id);}
  for(const row of ex.added){
   const m=all.get(row.id);assert(m&&!accounted.has(row.id)&&!usedFma.has(row.fmaId)&&!original.has(row.id)&&m.approvedForDistribution===false);
   for(const k of ['id','sha256','fmaId','bpId','sourceTree','sourceHashes','sourceElements'])assert.deepEqual(m[k],row[k]);
   assert(m.sourceElements.length&&m.sourceElements.every(e=>!usedElements.has(e.id)));
   m.sourceElements.forEach(e=>usedElements.add(e.id));usedFma.add(m.fmaId);accounted.add(m.id);
  }
  assert(accounted.size===all.size);
  assert.deepEqual(inv.independentReferences,base.independentReferences);
 }
 const bodyAttributions=new Map(att.body.map(a=>[a.id,a])),referenceAttributions=new Map(att.references.map(a=>[a.id,a]));
 assert(bodyAttributions.size===att.body.length&&bodyAttributions.size===inv.bodyModels.length&&referenceAttributions.size===att.references.length&&referenceAttributions.size===inv.independentReferences.length);
 const entries=[],models=new Map(),modelReceipts=new Map(),hra={assets:new Map(),blocked:[]};
 for(const m of inv.bodyModels){
  const e=bodyDisplayEntry(m),a=bodyAttributions.get(m.id),b=bytes(dir,m.path);
  assert(a&&a.name===m.name&&a.sha256===m.sha256&&a.license==='CC-BY-4.0'&&a.attribution===m.attribution&&a.historicalNotice===m.historicalNotice&&hash(b)===m.sha256,'Invalid model attribution/hash');
  assert(['isa','partof'].includes(m.sourceTree)&&receipt.sources[m.sourceTree]?.complete===true);
  for(const f of receipt.sources[m.sourceTree].files)assert(m.sourceHashes[f.kind]===f.sha256,'Source receipt mismatch');
  const positions=parseNativePositions(b);
  assert(positions.size===m.sourceElements.length&&m.sourceElements.every(x=>positions.has(x.id)),'Element identity differs');
  e.path='models/'+e.id+'.glb';assert(!models.has('/anatomy/viewer/'+e.path));
  entries.push(e);const route='/anatomy/viewer/'+e.path,file=regular(dir,m.path);models.set(route,file);modelReceipts.set(route,{file,bytes:b.length,sha256:m.sha256});
 }
 for(const r of inv.independentReferences){
  assert(/^[a-f0-9]{24}$/.test(r.id)&&r.path==='hra/'+r.id+'.glb'&&r.approvedForDistribution===false&&r.registrationValidated===false&&r.status==='PUBLISHER_VERSION_EVIDENCE_MATCHED'&&!hra.assets.has(r.id));
  const b=bytes(dir,r.path),a=referenceAttributions.get(r.id),yaml=bytes(dir,'evidence/'+r.id+'.yaml'),p=parsePublisherMetadata(yaml.toString('utf8'),r.sourceURL);
  assert(hash(b)===r.sha256&&hash(yaml)===r.metadataSHA256&&a?.sha256===r.sha256&&a.license==='CC-BY-4.0'&&a.attribution===r.attribution&&p.doi===r.doi&&p.version===r.version&&p.license===r.publisherLicense);
  assert.deepEqual(p.creators,r.creators);
  assert(inspectGlb(b).meshCount===r.meshCount);
  hra.assets.set(r.id,{file:regular(dir,r.path),bytes:b.length,sha256:r.sha256,public:{id:r.id,name:r.name,version:r.version,source:r.sourceURL,meshCount:r.meshCount,frame:'Independent HRA source frame',registrationValidated:false,approvedForDistribution:false}});
 }
 for(const [sub,expected] of [['bp3d',inv.bodyModels.map(m=>path.basename(m.path))],['hra',inv.independentReferences.map(r=>path.basename(r.path))]]){
  const p=path.join(dir,sub);assert(fs.realpathSync(p)===p&&fs.statSync(p).isDirectory());assert.deepEqual(fs.readdirSync(p).sort(),expected.sort(),'Unexpected model files');
 }
 const manifest={schema:1,mode:'private-review',publicRelease:'NO_GO',sourceFrame:'native-official-OBJ',sourceKind:'independent-bp3d',entries};
 validateInventory(manifest,'127.0.0.1');
 return {manifest,models,modelReceipts,hra,attributions:att,summary,inventory:inv,folder:dir};
}
