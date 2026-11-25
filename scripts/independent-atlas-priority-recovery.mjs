// Explicit private priority-concept recovery from checksum-verified publisher OBJ archives.
// Alternative concepts are isolated, never added to the main body inventory.
import fs from 'node:fs';
import path from 'node:path';
import assert from 'node:assert/strict';
import {createHash} from 'node:crypto';
import {execFileSync} from 'node:child_process';
import {discoverSystem} from './independent-anatomy-system-discovery.mjs';
import {learningPriorityTargets} from './atlas-learning-priority-targets.mjs';
import {checkpoints} from './audit-independent-system-coverage.mjs';
import {recoveryKey,findRecoveryCache} from './independent-atlas-recovery-cache.mjs';
import {loadVerifiedPublisherSources} from './plan-independent-atlas-coverage.mjs';
import {parseObj,encodeNativeGlb} from './independent-bp3d-export.mjs';
import {parseNativePositions,comparePositions} from './audit-bp3d-publication-geometry.mjs';
const hash=b=>createHash('sha256').update(b).digest('hex');
const archiveURL='https://dbarchive.biosciencedbc.jp/data/bodyparts3d/LATEST/';
const attribution='BodyParts3D, © The Database Center for Life Science licensed under CC Attribution 4.0 International';
// Exact names only. The IDs for known gaps are pinned to the source report where available.
export const priorityTargets=[
 ['respiratory',['left lung']],['respiratory',['right lung']],
 ['respiratory',['superior lobe of right lung','upper lobe of right lung']],
 ['respiratory',['middle lobe of right lung','middle lobe of lung'],'FMA7383'],['respiratory',['inferior lobe of right lung','lower lobe of right lung']],
 ['respiratory',['superior lobe of left lung','upper lobe of left lung']],['respiratory',['inferior lobe of left lung','lower lobe of left lung']],
 ['respiratory',['trachea']],['respiratory',['left main bronchus','left principal bronchus']],['respiratory',['right main bronchus','right principal bronchus']],
 ['respiratory',['right bronchial tree'],'FMA26661','partof'],['respiratory',['left bronchial tree'],'FMA26662','partof'],
 ['respiratory',['upper lobe part of right bronchial tree'],'FMA31744','partof'],['respiratory',['middle lobe part of right bronchial tree'],'FMA31741','partof'],
 ['respiratory',['lower lobe part of right bronchial tree'],'FMA31747','partof'],['respiratory',['upper lobe part of left bronchial tree'],'FMA31746','partof'],['respiratory',['lower lobe part of left bronchial tree'],'FMA31748','partof'],
 ['respiratory',['larynx']],['respiratory',['left lung pleura','left pleura']],['respiratory',['right lung pleura','right pleura']],
 // Publisher PART-OF names table, verified 2026-11-25; labels/IDs only, not proof of complete geometry.
 // https://dbarchive.biosciencedbc.jp/data/bodyparts3d/LATEST/partof_parts_list_e.txt
 ['respiratory',["right apical bronchopulmonary segment"],'FMA7338','partof'],
 ['respiratory',["right posterior bronchopulmonary segment"],'FMA7339','partof'],
 ['respiratory',["right anterior bronchopulmonary segment"],'FMA7359','partof'],
 ['respiratory',["medial bronchopulmonary segment"],'FMA7360','partof'],
 ['respiratory',["lateral bronchopulmonary segment"],'FMA7361','partof'],
 ['respiratory',["right posterior basal bronchopulmonary segment"],'FMA7362','partof'],
 ['respiratory',["right lateral basal bronchopulmonary segment"],'FMA7363','partof'],
 ['respiratory',["right anterior basal bronchopulmonary segment"],'FMA7364','partof'],
 ['respiratory',["right medial basal bronchopulmonary segment"],'FMA7365','partof'],
 ['respiratory',["right superior bronchopulmonary segment"],'FMA7366','partof'],
 ['respiratory',["apicoposterior bronchopulmonary segment"],'FMA7372','partof'],
 ['respiratory',["left anterior bronchopulmonary segment"],'FMA7373','partof'],
 ['respiratory',["superior lingular bronchopulmonary segment"],'FMA7374','partof'],
 ['respiratory',["inferior lingular bronchopulmonary segment"],'FMA7375','partof'],
 ['respiratory',["left superior bronchopulmonary segment"],'FMA7376','partof'],
 ['respiratory',["left medial basal bronchopulmonary segment"],'FMA7377','partof'],
 ['respiratory',["left anterior basal bronchopulmonary segment"],'FMA7378','partof'],
 ['respiratory',["left lateral basal bronchopulmonary segment"],'FMA7379','partof'],
 ['respiratory',["left posterior basal bronchopulmonary segment"],'FMA7380','partof'],
 ['respiratory',["left apical bronchopulmonary segment"],'FMA7385','partof'],
 ['respiratory',["left posterior bronchopulmonary segment"],'FMA7386','partof'],
 ['respiratory',["right apical segmental bronchial tree"],'FMA68211','partof'],
 ['respiratory',["right anterior segmental bronchial tree"],'FMA68212','partof'],
 ['respiratory',["right posterior segmental bronchial tree"],'FMA68213','partof'],
 ['respiratory',["medial segmental bronchial tree"],'FMA68214','partof'],
 ['respiratory',["lateral segmental bronchial tree"],'FMA68215','partof'],
 ['respiratory',["right superior segmental bronchial tree"],'FMA68216','partof'],
 ['respiratory',["right medial basal segmental bronchial tree"],'FMA68218','partof'],
 ['respiratory',["right lateral basal segmental bronchial tree"],'FMA68220','partof'],
 ['respiratory',["right posterior basal segmental bronchial tree"],'FMA68221','partof'],
 ['respiratory',["left anterior segmental bronchial tree"],'FMA68222','partof'],
 ['respiratory',["left apical segmental bronchial tree"],'FMA68223','partof'],
 ['respiratory',["left posterior segmental bronchial tree"],'FMA68225','partof'],
 ['respiratory',["superior lingular bronchial tree"],'FMA68226','partof'],
 ['respiratory',["inferior lingular bronchial tree"],'FMA68227','partof'],
 ['respiratory',["left superior segmental bronchial tree"],'FMA68228','partof'],
 ['respiratory',["left medial basal segmental bronchial tree"],'FMA68230','partof'],
 ['respiratory',["left anterior basal segmental bronchial tree"],'FMA68231','partof'],
 ['respiratory',["left lateral basal segmental bronchial tree"],'FMA68232','partof'],
 ['respiratory',["left posterior basal segmental bronchial tree"],'FMA68233','partof'],
 ['respiratory',["right anterior basal segmental bronchial tree"],'FMA68321','partof'],
 ['nervous',['brain'],'FMA50801','partof'],['nervous',['spinal cord'],'FMA7647','partof'],['nervous',['brainstem'],'FMA79876','partof'],
 ['nervous',['ventricular system of brain'],'FMA242787','partof'],['nervous',['cerebellum']],['nervous',['pons']],['nervous',['medulla oblongata']],
 ['nervous',['optic nerve'],'FMA50863','isa'],['nervous',['trochlear nerve'],'FMA50865','isa'],
 ['nervous',['ophthalmic nerve'],'FMA52621','isa'],['nervous',['left brachial plexus']],['nervous',['right brachial plexus']],['nervous',['left sciatic nerve']],['nervous',['right sciatic nerve']],
 ['lymphatic',['thymus'],'FMA9607','partof'],['lymphatic',['spleen']],['lymphatic',['thoracic duct']],['lymphatic',['right lymphatic duct']],['lymphatic',['cisterna chyli']],
 ['heart',['heart'],'FMA7088','partof'],['heart',['tricuspid valve'],'FMA7234','partof'],['heart',['mitral valve'],'FMA7235','partof'],
 ['heart',["aortic valve"],'FMA7236','partof'],
 ['heart',["pulmonary valve"],'FMA7246','partof'],
 ['heart',["anterior leaflet of tricuspid valve"],'FMA7238','partof'],
 ['heart',["posterior leaflet of tricuspid valve"],'FMA7239','partof'],
 ['heart',["septal leaflet of tricuspid valve"],'FMA7240','partof'],
 ['heart',["anterior leaflet of mitral valve"],'FMA7242','partof'],
 ['heart',["posterior leaflet of mitral valve"],'FMA7243','partof'],
 ['heart',["left anterior cusp of pulmonary valve"],'FMA7247','partof'],
 ['heart',["right anterior cusp of pulmonary valve"],'FMA7249','partof'],
 ['heart',["posterior cusp of pulmonary valve"],'FMA7250','partof'],
 ['heart',["right posterior cusp of aortic valve"],'FMA7252','partof'],
 ['heart',["anterior cusp of aortic valve"],'FMA7253','partof'],
 ['heart',["left posterior cusp of aortic valve"],'FMA7254','partof'],
 ['heart',["right atrium"],'FMA7096','partof'],
 ['heart',["left atrium"],'FMA7097','partof'],
 ['heart',["right ventricle"],'FMA7098','partof'],
 ['heart',["left ventricle"],'FMA7101','partof']
];
const norm=n=>String(n).trim().toLowerCase().replace(/\s+/g,' ');
export function priorityPlan(sources,specs=priorityTargets){
 return specs.map(([group,names,fmaId,tree])=>{
  const matches=[];
  for(const s of sources){
   if(tree&&tree!==s.tree)continue;
   for(const n of s.names){
    if((fmaId&&fmaId!==n.fmaId)||!names.includes(norm(n.name)))continue;
    const elementIds=[...(s.elements.get(n.fmaId)||[])].sort();
    if(elementIds.length&&elementIds.every(id=>s.archiveIndex.has(id)))matches.push({...n,tree:s.tree,elementIds});
   }
  }
  const concepts=new Set(matches.map(n=>n.fmaId));
  const preferred=matches.some(n=>n.tree==='isa')?matches.filter(n=>n.tree==='isa'):matches;
  if(concepts.size!==1||preferred.length!==1)return {group,target:names[0],status:matches.length?'AMBIGUOUS_SOURCE':'NOT_FOUND_BY_EXACT_CHECK'};
  return {group,target:names[0],status:'EXPORT_CANDIDATE',...preferred[0]};
 });
}
// Wider recovery: exact publisher identities from the existing archive, not
// guessed synonyms or legacy geometry. Only explicitly classified concepts
// are eligible; existing body identities and priority targets are deduplicated.
export function broadRecoveryPlan(sources,body,priority,coveredFma=[]){
 const existing=new Set([...body.map(m=>m.fmaId),...coveredFma]);
 const targeted=new Set(priority.filter(x=>x.status==='EXPORT_CANDIDATE').map(x=>x.fmaId));
 const candidates=new Map();
 for(const s of sources)for(const n of s.names){
  if(existing.has(n.fmaId)||targeted.has(n.fmaId))continue;
  const elementIds=[...(s.elements.get(n.fmaId)||[])].sort();
  if(!elementIds.length||!elementIds.every(id=>s.archiveIndex.has(id)))continue;
  const suggestion=discoverSystem(n.name);
  if(!suggestion)continue;
  const rows=candidates.get(n.fmaId)||[];
  rows.push({...n,tree:s.tree,elementIds,group:suggestion.group});candidates.set(n.fmaId,rows);
 }
 const rows=[];
 for(const all of candidates.values()){
  const chosen=all.some(x=>x.tree==='isa')?all.filter(x=>x.tree==='isa'):all;
  if(chosen.length!==1||new Set(all.map(x=>x.group)).size!==1)continue;
  rows.push({...chosen[0],target:chosen[0].name,status:'EXPORT_CANDIDATE',discovery:'PROVISIONAL_PUBLISHER_NAME'});
 }
 const order=['lymphatic','respiratory','nervous','heart','urinary','digestive','reproductive','endocrine','joints','muscular','skeletal','arterial','venous'];
 return rows.sort((a,b)=>order.indexOf(a.group)-order.indexOf(b.group)||a.elementIds.length-b.elementIds.length||a.fmaId.localeCompare(b.fmaId));
}
export function buildPriorityRecovery(privateRoot,pack,{broad=false,coveredFma=[],rebuild=false}={}){
 assert(fs.realpathSync(privateRoot)===privateRoot);
 const sources=loadVerifiedPublisherSources(pack.folder),priority=priorityPlan(sources);
 const already=new Set([...pack.inventory.bodyModels.map(m=>m.fmaId),...coveredFma,...priority.filter(r=>r.status==='EXPORT_CANDIDATE').map(r=>r.fmaId)]);
 const additional=[...Object.entries(checkpoints).flatMap(([g,rows])=>rows.map(([, ...names])=>[g,names])),...learningPriorityTargets];
 const targeted=broad?priorityPlan(sources,additional).map(r=>{
  if(r.status!=='EXPORT_CANDIDATE')return r;
  if(already.has(r.fmaId))return {...r,status:'REPRESENTATION_ALREADY_AVAILABLE_OR_PLANNED'};
  already.add(r.fmaId);return r;
 }):[];
 const plan=broad?[...priority,...targeted,...broadRecoveryPlan(sources,pack.inventory.bodyModels,[...priority,...targeted],coveredFma)]:priority;
 const maxBytes=(broad?2048:512)*1024*1024, maxTriangles=1500000;
 const inventorySHA256=hash(fs.readFileSync(path.join(pack.folder,'inventory.json'))),cacheKey=recoveryKey(plan,sources,inventorySHA256,broad);
 if(!rebuild){
  const cached=findRecoveryCache(privateRoot,cacheKey,plan,sources,inventorySHA256,broad,maxBytes);
  if(cached){console.log('PRIORITY RECOVERY CACHE',JSON.stringify({folder:cached.folder,exported:cached.items.length,totalBytes:cached.report.totalBytes,publicRelease:'NO_GO'}));return cached;}
 }
 const out=fs.mkdtempSync(path.join(privateRoot,'atlas-priority-recovery-'));fs.chmodSync(out,0o700);
 const items=[],models=new Map(),results=[],used=new Set();let totalBytes=0;
 for(const c of plan){
  if(c.status!=='EXPORT_CANDIDATE'){results.push(c);continue;}
  const id='bp-'+hash(c.tree+':'+c.fmaId+':'+c.bpId+':priority').slice(0,24);
  if(used.has(id)){results.push({...c,status:'DUPLICATE_CONCEPT'});continue;}
  if(totalBytes>=maxBytes){results.push({...c,status:'HOLD_STORAGE_BUDGET'});continue;}
  try{
   const source=sources.find(s=>s.tree===c.tree);assert(source);
   const parts=[],proof=[];let triangles=0;
   for(const fj of c.elementIds){
    const entry=source.archiveIndex.get(fj);
    assert(typeof entry==='string'&&/^[A-Za-z0-9_./-]+\.obj$/i.test(entry)&&!entry.startsWith('/')&&!entry.split('/').includes('..')&&path.basename(entry).replace(/\.obj$/i,'')===fj,'Unsafe archive member');
    const raw=execFileSync('unzip',['-p',source.archive,entry],{maxBuffer:96*1024*1024});
    const parsed=parseObj(raw.toString('utf8'));triangles+=parsed.positions.length/9;assert(triangles<=maxTriangles,'Combined triangle limit');
    parts.push({id:fj,...parsed});proof.push({id:fj,zipEntry:entry,sha256:hash(raw),triangles:parsed.positions.length/9});
   }
   const encoded=encodeNativeGlb(parts,{fmaId:c.fmaId,bpId:c.bpId,tree:c.tree,officialName:c.name,sourceHashes:source.hashes,sourceElements:proof});
   const verified=parseNativePositions(encoded.bytes);assert(verified.size===parts.length&&parts.every(p=>comparePositions(p.positions,verified.get(p.id))),'Source geometry mismatch');
   if(totalBytes+encoded.bytes.length>maxBytes){results.push({...c,status:'HOLD_STORAGE_BUDGET'});continue;}
   const filename=id+'.glb',file=path.join(out,filename);fs.writeFileSync(file,encoded.bytes,{flag:'wx',mode:0o600});
   totalBytes+=encoded.bytes.length;used.add(id);
   const item={id,name:c.name,group:c.group,fmaId:c.fmaId,bpId:c.bpId,sourceTree:c.tree,priorityOnly:true,path:'priority-recovery/'+filename,regions:['whole'],clinicalValidation:false,approvedForDistribution:false,source:'BodyParts3D 4.0',classificationProvisional:true};
   items.push(item);models.set('/anatomy/viewer/'+item.path,{file,sha256:encoded.sha256,bytes:encoded.bytes.length});
   results.push({...c,status:'EXPORTED_ISOLATED_CONCEPT',id,sha256:encoded.sha256,triangles:encoded.triangles,bytes:encoded.bytes.length,sourceHashes:source.hashes,sourceElements:proof,license:'CC-BY-4.0',licenseURL:'https://creativecommons.org/licenses/by/4.0/',attribution,sourceArchive:archiveURL+c.tree+'_BP3D_4.0_obj_99.zip',historicalNotice:'Retain original CC BY-SA 2.1 Japan notices; distribution rights review pending.',changes:'Native OBJ converted to GLB without transforms; degenerate triangles omitted.'});
   console.log('PRIORITY RECOVERED',c.group,c.name,c.fmaId);
  }catch(error){results.push({...c,status:'HOLD_EXPORT',reason:String(error.message||error)});}
 }
 const report={schema:1,broad,cacheKey,sourcePack:path.basename(pack.folder),inventorySHA256,publicRelease:'NO_GO',clinicalValidation:false,registrationValidated:false,productionChanged:false,bodyInventoryUnchanged:true,items,results,totalBytes};
 const receipt=path.join(out,'priority-recovery.json');fs.writeFileSync(receipt,JSON.stringify(report,null,2)+'\n',{flag:'wx',mode:0o600});
 console.log('PRIORITY RECOVERY',JSON.stringify({broad,exported:items.length,requested:plan.length,alreadyAvailableOrPlanned:results.filter(r=>r.status==='REPRESENTATION_ALREADY_AVAILABLE_OR_PLANNED').length,held:results.filter(r=>!['EXPORTED_ISOLATED_CONCEPT','REPRESENTATION_ALREADY_AVAILABLE_OR_PLANNED'].includes(r.status)).map(r=>({group:r.group,target:r.target,status:r.status,reason:r.reason})),byGroup:Object.fromEntries([...new Set(items.map(i=>i.group))].map(g=>[g,items.filter(i=>i.group===g).length])),totalBytes,bodyInventoryUnchanged:true,publicRelease:'NO_GO',report:receipt}));
 return {items,models,report,folder:path.basename(out),reused:false};
}
