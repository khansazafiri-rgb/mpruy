// Materialize additional exact source-native components using the completed local loop.
// Never replace the existing pack, infer anatomy, duplicate shared surfaces or approve release.
import fs from 'node:fs';
import path from 'node:path';
import assert from 'node:assert/strict';
import {createHash} from 'node:crypto';
import {execFileSync} from 'node:child_process';
import {pathToFileURL} from 'node:url';
import {makeGlb} from '../apps/4d-lab/tools/build-bp3d-candidate.mjs';
import {groupFor,layerFor,GROUPS} from '../apps/anatomy/src/atlas/catalog.js';
const sha=b=>createHash('sha256').update(b).digest('hex');
const json=p=>JSON.parse(fs.readFileSync(p,'utf8'));
const write=(p,v)=>fs.writeFileSync(p,JSON.stringify(v,null,2)+'\n');
const load=p=>import(pathToFileURL(p).href);
const validSystems=new Set(['visceral','nervous','cardiovascular','lymphatic','muscular','joints']);
const safety={approvedForDistribution:false,approvedForCommercialDistribution:false,geometryAnatomyValidated:false,
 registrationValidated:false,clinicalValidationStatus:'NOT_REVIEWED',commercialRightsStatus:'BLOCKED',publicRelease:'NO_GO'};
const sorted=a=>[...a].sort();
const same=(a,b)=>JSON.stringify(sorted(a))===JSON.stringify(sorted(b));
const boundsBox=b=>[b.min[0]*.001+.0007,b.min[2]*.001+.0692,-b.max[1]*.001-.0987,
 b.max[0]*.001+.0007,b.max[2]*.001+.0692,-b.min[1]*.001-.0987];
function local(base,rel,dir=false){
 const p=path.resolve(base,rel);
 assert(p.startsWith(path.resolve(base)+path.sep)&&fs.realpathSync(p)===p,'Unsafe private input '+rel);
 assert(dir?fs.statSync(p).isDirectory():fs.statSync(p).isFile(),'Wrong input type '+rel);return p;
}
function directComponents(c,gById,tree,index){
 if(c.sourceTree!==tree||c.geometryStatus!=='COMPLETE'||index.get(c.id)?.geometryStatus!=='COMPLETE'||!validSystems.has(c.system)||!c.geometryRefs?.length)return null;
 const parts=c.geometryRefs.map(id=>gById.get(id));
 if(!parts.every(g=>g&&g.tree===tree&&g.geometryStatus==='COMPLETE'&&g.compatibilityVersion==='4.0'&&g.units==='mm'&&g.degenerateTriangles===0&&
  g.publisherElementConceptId===c.fmaId&&g.publisherElementRepresentationId===c.bpId&&g.approvedForDistribution===false&&g.registrationValidated===false))return null;
 if(c.approvedForDistribution!==false||new Set(parts.map(g=>g.elementId)).size!==parts.length)return null;
 if(new Set(parts.map(g=>g.geometrySha256)).size!==parts.length)return null;
 return parts;
}
function readRaw(source,g){
 assert.equal(source.index.get(g.elementId),g.archiveEntry,'Archive entry mismatch');
 for(const [key,field] of [['archive','sourceArchive'],['names','sourceNames'],['elements','sourceElements']])assert.deepEqual(source.receipts[key],g[field],'Source receipt changed');
 const raw=execFileSync('unzip',['-p',source.archive,g.archiveEntry],{maxBuffer:96*1024*1024});
 assert.equal(sha(raw),g.sourceSha256,'Source element hash mismatch');
 return raw;
}
// Validate native-frame compatibility using three independent anchors and
// EVERY identical element ID encountered in the existing body (not just filenames).
function anchorSignature(raw){
 const lines=raw.toString('utf8').split(/\r?\n/).map(s=>s.trim().replace(/\s+/g,' ')).filter(s=>/^(v|f) /.test(s));
 assert(lines.some(s=>s.startsWith('v '))&&lines.some(s=>s.startsWith('f ')),'Empty source anchor');
 return sha(lines.join('\n'));
}
function sharedFrame(isa,partof,baseline){
 const evidence=baseline.partOf?.frame;
 assert(evidence?.compatible===true&&evidence.anchors?.length===3,'No verified prior native frame anchors');
 const anchors=[];
 for(const a of evidence.anchors){
  assert(isa.rows.some(r=>r.fmaId===a.fmaId&&r.name.toLowerCase()===a.name)&&partof.rows.some(r=>r.fmaId===a.fmaId&&r.name.toLowerCase()===a.name),'Anchor publisher identity changed');
  assert(isa.elements.get(a.fmaId)?.has(a.fj)&&partof.elements.get(a.fmaId)?.has(a.fj),'Anchor membership changed');
  const signature=s=>{
   const entry=s.index.get(a.fj);assert(entry&&!/[*?\[\]]/.test(entry),'Unsafe anchor path');
   return anchorSignature(execFileSync('unzip',['-p',s.archive,entry],{maxBuffer:96*1024*1024}));
  };
  assert.equal(signature(isa),a.geometrySha256);assert.equal(signature(partof),a.geometrySha256);
  anchors.push(a);
 }
 assert.equal(new Set(anchors.map(a=>a.fj)).size,3);
 return {compatible:true,anchors,meaning:'Shared publisher-native frame anchors only; not clinical registration'};
}
function groupOf(c){
 if(c.system==='nervous')return 'nervous';
 if(c.system==='cardiovascular'){
  if(c.kind==='artery')return 'arterial';
  if(c.kind==='vein')return 'venous';
  if(/cardiac|chamber|valve|heart/.test(c.kind||''))return 'heart';
  // Existing viewer's group classification is a display convention only.
 }
 return groupFor(c.name,c.system);
}
function unionBounds(parts){
 return {min:[0,1,2].map(i=>Math.min(...parts.map(g=>g.boundsNative.min[i]))),
 max:[0,1,2].map(i=>Math.max(...parts.map(g=>g.boundsNative.max[i])))};
}
function regionFor(c,old){
 if(old?.source===c.system&&old.regions?.length)return old.regions;
 if(c.system==='nervous'&&/\b(brain|cerebr|cerebell|optic|cranial|midbrain|pons|medulla oblongata)/i.test(c.name))return ['headNeck'];
 if(c.system==='nervous'&&/spinal cord/i.test(c.name))return ['back'];
 if(c.system==='visceral'&&/lung|bronch|pleura/i.test(c.name))return ['thorax'];
 if(c.system==='cardiovascular'&&groupOf(c)==='heart')return ['thorax'];
 return ['whole'];
}
export async function expandNativeOrganComponents({root,privateRoot,pack,inv,out}){
 assert.equal(inv.sourceTree,'isa','Start from the verified IS-A native body');
 const run=local(root,'local-data/atlas-agent-loop/1795525302303-4361bc4924',true);
 const checkpoint=local(run,'integration',true);
 const commit='09e5f97e06536e2da403655d8334abbe1fc5f4d2';
 assert.equal(execFileSync('git',['-C',checkpoint,'rev-parse','HEAD'],{encoding:'utf8'}).trim(),commit);
 assert.equal(execFileSync('git',['-C',checkpoint,'status','--porcelain','--untracked-files=all'],{encoding:'utf8'}).trim(),'','Loop checkpoint has changed');
 assert.equal(json(local(run,'final-report.json')).lastCheckpoint,commit);
 const adapterRoot=local(checkpoint,'scripts/atlas-loop/adapters',true);
 const {readRoleBundles,createUnifiedIndex}=await load(local(checkpoint,'scripts/atlas-loop/integration/unified-review.mjs'));
 const {readSource,parseOBJ}=await load(local(adapterRoot,'cardiovascular-lymphatic/adapter.mjs'));
 const {inspectNativeOBJ,inspectBinaryGLB}=await load(local(checkpoint,'scripts/atlas-loop/integration/independent-geometry.mjs'));
 const baseline=local(privateRoot,'bp3d-integrated-preview-991HRl',true);
 const invBytes=fs.readFileSync(local(baseline,'pack/inventory.json')),coverageBytes=fs.readFileSync(local(baseline,'coverage-report.json'));
 const baselineReport=json(local(baseline,'integration-report.json'));
 const bundles=readRoleBundles(adapterRoot),unified=createUnifiedIndex(bundles),index=new Map(unified.concepts.map(c=>[c.id,c]));
 for(const b of bundles){assert.equal(b.summary.baselineEvidence.inventorySha256,sha(invBytes));assert.equal(b.summary.baselineEvidence.coverageSha256,sha(coverageBytes));}
 const sources={isa:readSource(privateRoot,'isa'),partof:readSource(privateRoot,'partof')};
 assert.deepEqual(inv.sourceHashes,sources.isa.receipts,'Current native pack source receipt mismatch');
 const frame=sharedFrame(sources.isa,sources.partof,baselineReport);
 const byTree={isa:new Map(),partof:new Map()},concepts=new Map();
 for(const b of bundles){
  for(const c of b.concepts){if(!concepts.has(c.id))concepts.set(c.id,c);else assert.deepEqual(concepts.get(c.id),c,'Conflicting source concept records');}
  for(const g of b.geometry){
   const map=byTree[g.tree];if(!map)continue;
   const prior=map.get(g.id);
   if(prior){
    // Some roles independently describe the same surface; require all
    // source identity, byte and geometry fields to agree, not role metadata.
    for(const k of ['elementId','sourceSha256','geometrySha256','publisherElementConceptId','publisherElementRepresentationId','geometryStatus'])
     assert.equal(prior[k],g[k],'Conflicting source evidence '+g.id);
   }else map.set(g.id,g);
  }
 }
 const target=path.join(out,'pack');fs.mkdirSync(path.join(target,'structures'),{recursive:true});
 const converted=[...inv.converted],seenNames=new Set(),seenIds=new Set(),seenFma=new Set(),usedFj=new Map(),usedGeometry=new Set();
 const report={baseline:converted.length,added:[],blocked:[],skippedExisting:0,frame,publicRelease:'NO_GO',geometryAnatomyValidated:false,
  sourceFrame:'BodyParts3D 4.0 native preview; shared archive anchors, not clinical registration'};
 for(const e of converted){
  const sourceDir=local(pack,'structures/'+e.id,true),lineage=json(local(sourceDir,'lineage.json'));
  assert(lineage.sourceTree==='isa'&&lineage.approvedForDistribution===false&&lineage.elements.length===1,'Expected original atomic IS-A pack');
  const fj=lineage.elements[0].id,g=[...byTree.isa.values()].find(x=>x.elementId===fj);
  assert(g&&g.geometrySha256===lineage.geometrySha256&&g.sourceSha256===lineage.elements[0].sourceSha256,'Base source identity changed');
  assert(!usedFj.has(fj)&&!usedGeometry.has(g.geometrySha256),'Duplicate baseline source surface');
  usedFj.set(fj,g.geometrySha256);usedGeometry.add(g.geometrySha256);
  seenNames.add(e.name);seenIds.add(e.id);seenFma.add(e.fmaId);
  const dest=path.join(target,'structures',e.id);fs.mkdirSync(dest);
  for(const f of ['model.glb','lineage.json'])fs.copyFileSync(local(sourceDir,f),path.join(dest,f),fs.constants.COPYFILE_FICLONE);
 }
 // Do not combine sources where an already rendered FJ has different coordinates.
 const partByFj=new Map([...byTree.partof.values()].map(g=>[g.elementId,g]));
 const crossConflicts=[];
 for(const [fj,signature] of usedFj){
  const p=partByFj.get(fj);
  if(p?.geometryStatus==='COMPLETE'&&p.geometrySha256!==signature)crossConflicts.push(fj);
 }
 report.crossTreeOverlapsWithDifferentGeometry=crossConflicts;
 // A mismatched shared ID is excluded from new candidate materialization;
 // all other FJ identities remain subject to the original frame checks.
 const badFj=new Set(crossConflicts);
 const catalog=json(local(root,'apps/anatomy/public/data/atlas-catalog.json'));
 const priorities={visceral:0,nervous:1,lymphatic:2,cardiovascular:3,muscular:4,joints:5};
 const candidates=[...concepts.values()].filter(c=>['isa','partof'].includes(c.sourceTree))
  .sort((a,b)=>(a.sourceTree==='isa'?0:1)-(b.sourceTree==='isa'?0:1)||(priorities[a.system]??9)-(priorities[b.system]??9)||a.id.localeCompare(b.id));
 for(const c of candidates){
  const parts=directComponents(c,byTree[c.sourceTree],c.sourceTree,index);
  if(!parts)continue;
  if(seenFma.has(c.fmaId)||seenIds.has(c.id)){report.skippedExisting++;continue;}
  if(parts.some(g=>usedFj.has(g.elementId)||usedGeometry.has(g.geometrySha256)||badFj.has(g.elementId))){
   report.blocked.push({name:c.name,id:c.id,reason:'shared-or-conflicting-source-surface'});continue;
  }
  try{
   const source=sources[c.sourceTree];
   assert(source.rows.some(r=>r.fmaId===c.fmaId&&r.bpId===c.bpId&&r.name===c.name),'Publisher identity changed');
   assert(same([...(source.elements.get(c.fmaId)||[])],parts.map(g=>g.elementId)),'Complete publisher membership changed');
   assert.equal(new Set(parts.map(g=>g.coordinateFrame)).size,1,'Mixed coordinate frame');
   const rawParts=parts.map(g=>{
    const raw=readRaw(source,g),independent=inspectNativeOBJ(raw,g.elementId),parsed=parseOBJ(raw,g.elementId);
    for(const k of ['geometrySha256','triangles','boundsNative','compatibilityVersion','degenerateTriangles'])assert.deepEqual(independent[k],g[k]);
    assert.equal(independent.header,g.sourceHeader);assert.equal(independent.license,g.sourceLicenseNotice);
    assert.equal(parsed.publisherElementConceptId,c.fmaId);assert.equal(parsed.publisherElementRepresentationId,c.bpId);
    assert.equal(parsed.geometrySha256,g.geometrySha256);
    return {id:g.elementId,text:raw.toString('utf8')};
   });
   const group=groupOf(c);
   assert(group==='nervous'||GROUPS.some(x=>x.id===group&&x.source===c.system),'Unrecognized viewer group');
   const name=c.name;
   assert(!seenNames.has(name)&&(!Object.hasOwn(catalog,name)||catalog[name].source===c.system),'Conflicting display identity');
   const id=c.id;assert(/^[a-z0-9-]+$/.test(id));
   const lineage={...safety,officialFMAId:c.fmaId,officialRepresentationId:c.bpId,officialName:c.name,sourceTree:c.sourceTree,
    sourceArchive:parts[0].sourceArchive,sourceNames:parts[0].sourceNames,sourceElements:parts[0].sourceElements,
    elements:parts.map(g=>({id:g.elementId,sourceSha256:g.sourceSha256,sourceLicenseNotice:g.sourceLicenseNotice,geometrySha256:g.geometrySha256})),
    coordinateFrame:parts[0].coordinateFrame,sourceNativeDisplayOnly:true,atlasTransform:null,frameEvidence:frame,
    warning:'Exact publisher element identity candidate; not independently reviewed anatomy or distribution approval'};
   const bytes=Buffer.from(await makeGlb(rawParts,name,lineage));
   const decoded=inspectBinaryGLB(bytes);
   assert.equal(decoded.meshes.length,parts.length);
   for(const g of parts){
    const mesh=decoded.meshes.find(m=>m.name===g.elementId);
    assert(mesh&&mesh.geometrySha256===g.geometrySha256&&mesh.triangles===g.triangles,'GLB roundtrip mismatch '+g.elementId);
   }
   const bounds=unionBounds(parts),box=boundsBox(bounds);
   assert(box.every(Number.isFinite),'Invalid native bounds');
   const dest=path.join(target,'structures',id);fs.mkdirSync(dest);
   fs.writeFileSync(path.join(dest,'model.glb'),bytes,{flag:'wx'});
   lineage.generatedGLBSHA256=sha(bytes);write(path.join(dest,'lineage.json'),lineage);
   converted.push({...safety,id,name,system:c.system,group,fmaId:c.fmaId,bpId:c.bpId,
    modelPath:'./structures/'+id+'/model.glb',glbSha256:lineage.generatedGLBSHA256,
    triangles:parts.reduce((n,g)=>n+g.triangles,0),vertices:parts.reduce((n,g)=>n+g.vertices,0),
    boundsNative:bounds,sourceMeshes:parts.map(g=>g.elementId),state:'converted-unverified',
    mappingMethod:'exact-source-native-direct-component-private-review',
    privateAtlasMeta:{source:c.system,group,layer:c.system==='nervous'?0:layerFor(name,group),regions:regionFor(c,catalog[name]),box}});
   seenNames.add(name);seenIds.add(id);seenFma.add(c.fmaId);
   for(const g of parts){usedFj.set(g.elementId,g.geometrySha256);usedGeometry.add(g.geometrySha256);}
   report.added.push({name,id,system:c.system,group,tree:c.sourceTree,elements:parts.length});
   if(report.added.length%25===0)console.log('ORGAN COMPONENTS MATERIALIZED',report.added.length);
  }catch(e){report.blocked.push({name:c.name,id:c.id,reason:String(e.message)});}
 }
 // Parent concepts are references, not additional geometry. Report which exact
 // source components are visible; never count a whole lung or heart as a solid surface.
 const targets=['right lung','left lung','heart','right atrium','left atrium','right ventricle','left ventricle','brain','cerebellum','thymus','spinal cord','thoracic duct','small intestine'];
 report.assemblies=[];
 for(const c of concepts.values()){
  if(c.sourceTree!=='partof'||!targets.includes(c.name.toLowerCase()))continue;
  const parts=(c.geometryRefs||[]).map(id=>byTree.partof.get(id)).filter(Boolean);
  const present=parts.filter(g=>usedFj.get(g.elementId)===g.geometrySha256).length;
  report.assemblies.push({name:c.name,fmaId:c.fmaId,publisherComponents:parts.length,availableComponents:present,
   completePublisherMembership:parts.length>0&&present===parts.length,solidOrganSurfaceVerified:false,sourceGeometryStatus:c.geometryStatus});
 }
 const counts={};for(const e of converted)counts[e.system]=(counts[e.system]||0)+1;
 report.total=converted.length;report.perSystem=counts;report.hraMounted=false;
 const updated={...inv,...safety,kind:'bp3d-native-component-expanded-private-review',sourceTree:'isa',
  sourceTrees:['isa','partof'],sourceFrameEvidence:frame,sourceNativeDisplayOnly:true,converted,systems:counts,
  summary:{...inv.summary,converted:converted.length},provisionalSource:true,referenceSurface:null};
 write(path.join(target,'inventory.json'),updated);write(path.join(out,'organ-component-report.json'),report);
 console.log('ORGAN COMPONENT RESULT',JSON.stringify({baseline:report.baseline,added:report.added.length,total:report.total,blocked:report.blocked.length,perSystem:counts,assemblies:report.assemblies}));
 return {pack:target,inv:updated,counts,report};
}
