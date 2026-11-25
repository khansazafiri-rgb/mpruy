// Explicit private priority-concept recovery from checksum-verified publisher OBJ archives.
// Alternative concepts are isolated, never added to the main body inventory.
import fs from 'node:fs';
import path from 'node:path';
import assert from 'node:assert/strict';
import {createHash} from 'node:crypto';
import {execFileSync} from 'node:child_process';
import {loadVerifiedPublisherSources} from './plan-independent-atlas-coverage.mjs';
import {parseObj,encodeNativeGlb} from './independent-bp3d-export.mjs';
import {parseNativePositions,comparePositions} from './audit-bp3d-publication-geometry.mjs';
const hash=b=>createHash('sha256').update(b).digest('hex');
const archiveURL='https://dbarchive.biosciencedbc.jp/data/bodyparts3d/LATEST/';
const attribution='BodyParts3D, © The Database Center for Life Science licensed under CC Attribution 4.0 International';
// Exact names only. The IDs for known gaps are pinned to the source report where available.
const targets=[
 ['respiratory',['left lung']],['respiratory',['right lung']],
 ['respiratory',['superior lobe of right lung','upper lobe of right lung']],
 ['respiratory',['middle lobe of right lung']],['respiratory',['inferior lobe of right lung','lower lobe of right lung']],
 ['respiratory',['superior lobe of left lung','upper lobe of left lung']],['respiratory',['inferior lobe of left lung','lower lobe of left lung']],
 ['respiratory',['trachea']],['respiratory',['left main bronchus','left principal bronchus']],['respiratory',['right main bronchus','right principal bronchus']],
 ['respiratory',['right bronchial tree'],'FMA26661','partof'],['respiratory',['left bronchial tree'],'FMA26662','partof'],
 ['respiratory',['upper lobe part of right bronchial tree'],'FMA31744','partof'],['respiratory',['middle lobe part of right bronchial tree'],'FMA31741','partof'],
 ['respiratory',['lower lobe part of right bronchial tree'],'FMA31748','partof'],['respiratory',['upper lobe part of left bronchial tree'],'FMA31746','partof'],['respiratory',['lower lobe part of left bronchial tree'],'FMA31747','partof'],
 ['respiratory',['larynx']],['respiratory',['left lung pleura','left pleura']],['respiratory',['right lung pleura','right pleura']],
 ['nervous',['brain'],'FMA50801','partof'],['nervous',['spinal cord'],'FMA7647','partof'],['nervous',['brainstem'],'FMA79876','partof'],
 ['nervous',['ventricular system of brain'],'FMA242787','partof'],['nervous',['cerebellum']],['nervous',['pons']],['nervous',['medulla oblongata']],
 ['nervous',['optic nerve'],'FMA50863','isa'],['nervous',['trochlear nerve'],'FMA50865','isa'],
 ['nervous',['ophthalmic nerve'],'FMA52621','isa'],['nervous',['left brachial plexus']],['nervous',['right brachial plexus']],['nervous',['left sciatic nerve']],['nervous',['right sciatic nerve']],
 ['lymphatic',['thymus'],'FMA9607','partof'],['lymphatic',['spleen']],['lymphatic',['thoracic duct']],['lymphatic',['right lymphatic duct']],['lymphatic',['cisterna chyli']],
 ['heart',['heart'],'FMA7088','partof'],['heart',['tricuspid valve'],'FMA7234','partof'],['heart',['mitral valve'],'FMA7235','partof']
];
const norm=n=>String(n).trim().toLowerCase().replace(/\s+/g,' ');
export function priorityPlan(sources,specs=targets){
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
export function buildPriorityRecovery(privateRoot,pack){
 assert(fs.realpathSync(privateRoot)===privateRoot);
 const sources=loadVerifiedPublisherSources(pack.folder),plan=priorityPlan(sources);
 const out=fs.mkdtempSync(path.join(privateRoot,'atlas-priority-recovery-'));fs.chmodSync(out,0o700);
 const items=[],models=new Map(),results=[],used=new Set();let totalBytes=0;
 const maxBytes=512*1024*1024, maxTriangles=1500000;
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
 const report={schema:1,sourcePack:path.basename(pack.folder),inventorySHA256:hash(fs.readFileSync(path.join(pack.folder,'inventory.json'))),publicRelease:'NO_GO',clinicalValidation:false,registrationValidated:false,productionChanged:false,bodyInventoryUnchanged:true,items,results,totalBytes};
 const receipt=path.join(out,'priority-recovery.json');fs.writeFileSync(receipt,JSON.stringify(report,null,2)+'\n',{flag:'wx',mode:0o600});
 console.log('PRIORITY RECOVERY',JSON.stringify({exported:items.length,requested:plan.length,held:results.filter(r=>r.status!=='EXPORTED_ISOLATED_CONCEPT').map(r=>({group:r.group,target:r.target,status:r.status,reason:r.reason})),byGroup:Object.fromEntries([...new Set(items.map(i=>i.group))].map(g=>[g,items.filter(i=>i.group===g).length])),totalBytes,bodyInventoryUnchanged:true,publicRelease:'NO_GO',report:receipt}));
 return {items,models,report};
}
