// Resume only an exact, unchanged recovery plan. A cache is private and
// cannot grant release rights. Validate every byte before returning a model.
import fs from 'node:fs';
import path from 'node:path';
import assert from 'node:assert/strict';
import {createHash} from 'node:crypto';
import {parseNativePositions} from './audit-bp3d-publication-geometry.mjs';
const sha=b=>createHash('sha256').update(b).digest('hex');
const ordered=o=>Object.fromEntries(Object.entries(o).sort(([a],[b])=>a.localeCompare(b)));
export function recoveryKey(plan,sources,inventorySHA256,broad){
 return sha(JSON.stringify({version:1,broad,inventorySHA256,sources:sources.map(s=>({tree:s.tree,hashes:ordered(s.hashes)})),plan}));
}
export function loadRecoveryCache(privateRoot,folder,key,plan,sources,inventorySHA256,broad,maxBytes){
 assert(/^atlas-priority-recovery-[A-Za-z0-9_-]+$/.test(folder));
 const dir=path.join(privateRoot,folder);assert(fs.realpathSync(dir)===dir&&fs.statSync(dir).isDirectory());
 const read=rel=>{const file=path.join(dir,rel);assert(fs.realpathSync(file)===file&&fs.statSync(file).isFile());return fs.readFileSync(file);};
 const report=JSON.parse(read('priority-recovery.json'));
 assert(report.schema===1&&report.cacheKey===key&&report.inventorySHA256===inventorySHA256&&report.broad===broad&&report.publicRelease==='NO_GO'&&report.clinicalValidation===false&&report.registrationValidated===false&&report.productionChanged===false&&report.bodyInventoryUnchanged===true);
 assert(Array.isArray(report.items)&&Array.isArray(report.results)&&report.results.length===plan.length);
 const results=report.results,exported=results.filter(r=>r.status==='EXPORTED_ISOLATED_CONCEPT');
 assert(exported.length===report.items.length);
 const models=new Map(),seen=new Set();let bytes=0;
 for(let i=0;i<plan.length;i++){
  const p=plan[i],r=results[i];
  for(const k of ['group','target','fmaId','bpId','tree','name','elementIds'])assert.deepEqual(r[k],p[k]);
  if(r.status==='EXPORTED_ISOLATED_CONCEPT')assert(p.status==='EXPORT_CANDIDATE');
  else if(p.status!=='EXPORT_CANDIDATE')assert(r.status===p.status);
  else assert(['DUPLICATE_CONCEPT','HOLD_STORAGE_BUDGET','HOLD_EXPORT'].includes(r.status));
 }
 for(const r of exported){
  const expected='bp-'+sha(r.tree+':'+r.fmaId+':'+r.bpId+':priority').slice(0,24);
  assert(r.id===expected&&!seen.has(r.id));seen.add(r.id);
  const e=report.items.find(e=>e.id===r.id),s=sources.find(s=>s.tree===r.tree);
  assert(e&&s&&e.name===r.name&&e.group===r.group&&e.fmaId===r.fmaId&&e.bpId===r.bpId&&e.sourceTree===r.tree&&e.source==='BodyParts3D 4.0'&&e.priorityOnly===true&&e.approvedForDistribution===false&&e.clinicalValidation===false&&e.classificationProvisional===true);
  assert.deepEqual(e.regions,['whole']);assert.deepEqual(r.sourceHashes,s.hashes);
  assert(r.license==='CC-BY-4.0'&&r.licenseURL==='https://creativecommons.org/licenses/by/4.0/'&&r.sourceArchive==='https://dbarchive.biosciencedbc.jp/data/bodyparts3d/LATEST/'+r.tree+'_BP3D_4.0_obj_99.zip'&&typeof r.attribution==='string'&&r.attribution.includes('The Database Center for Life Science')&&typeof r.historicalNotice==='string'&&r.historicalNotice.includes('CC BY-SA 2.1 Japan'));
  assert(e.path==='priority-recovery/'+e.id+'.glb'&&Array.isArray(r.sourceElements));
  assert.deepEqual(r.sourceElements.map(x=>x.id),r.elementIds);
  for(const p of r.sourceElements)assert(s.archiveIndex.get(p.id)===p.zipEntry&&/^[a-f0-9]{64}$/.test(p.sha256)&&Number.isSafeInteger(p.triangles)&&p.triangles>0);
  const file=path.join(dir,e.id+'.glb'),b=read(e.id+'.glb');
  assert(b.length===r.bytes&&sha(b)===r.sha256);
  const geometry=parseNativePositions(b);assert.deepEqual([...geometry.keys()].sort(),r.elementIds);
  for(const p of r.sourceElements)assert(geometry.get(p.id).length/9===p.triangles);
  bytes+=b.length;assert(bytes<=maxBytes);models.set('/anatomy/viewer/'+e.path,{file,sha256:r.sha256,bytes:b.length});
 }
 assert(bytes===report.totalBytes);
 assert.deepEqual(fs.readdirSync(dir).sort(),['priority-recovery.json',...exported.map(r=>r.id+'.glb')].sort());
 return {items:report.items,models,report,folder,reused:true};
}
export function findRecoveryCache(privateRoot,key,plan,sources,inventorySHA256,broad,maxBytes){
 const candidates=fs.readdirSync(privateRoot,{withFileTypes:true}).filter(e=>e.isDirectory()&&/^atlas-priority-recovery-[A-Za-z0-9_-]+$/.test(e.name)).map(e=>e.name).sort();
 for(const folder of candidates){
  try{return loadRecoveryCache(privateRoot,folder,key,plan,sources,inventorySHA256,broad,maxBytes);}
  catch{/* Incomplete, incompatible or damaged cache: do not serve it. */}
 }
 return null;
}
