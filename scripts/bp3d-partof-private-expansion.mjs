// Official BodyParts3D PART-OF supplementary meshes: private preview only.
// A publisher name match is a candidate, not clinical or distribution approval.
// Uses publisher-native OBJ without morphing or inventing geometry.
import fs from 'node:fs';
import path from 'node:path';
import { createHash, randomUUID } from 'node:crypto';
import { createReadStream, createWriteStream } from 'node:fs';
import { Readable, Transform } from 'node:stream';
import { pipeline } from 'node:stream/promises';
import { execFileSync } from 'node:child_process';
import { parseOfficialNames, parseOfficialElements, checkArchiveEntryNames } from '../licensing/tools/prepare-bodyparts3d-source.mjs';
import { makeGlb } from '../apps/4d-lab/tools/build-bp3d-candidate.mjs';
import { summarizeGeometry, diagnoseGeometry } from '../apps/4d-lab/tools/review-bp3d-candidate.mjs';

const SOURCE='https://dbarchive.biosciencedbc.jp/data/bodyparts3d/LATEST/';
const DOC='https://dbarchive.biosciencedbc.jp/data/bodyparts3d/LATEST/README_e.html';
const files={
  names:'partof_parts_list_e.txt',elements:'partof_element_parts.txt',archive:'partof_BP3D_4.0_obj_99.zip'
};
const limits={names:2*1024*1024,elements:4*1024*1024,archive:100*1024*1024};
const MAX_OBJ=96*1024*1024;
const sha=bytes=>createHash('sha256').update(bytes).digest('hex');
const requireFact=(ok,msg)=>{if(!ok)throw new Error(msg);};
const write=(p,v)=>fs.writeFileSync(p,JSON.stringify(v,null,2)+'\n');
const allowedSystems=new Set(['skeletal','muscular','joints','cardiovascular','lymphatic','visceral']);
const explicit=Object.freeze([
  {fmaId:'FMA7204',bpId:'BP10046',name:'right kidney',system:'visceral',group:'urinary',regions:['abdomen']},
  {fmaId:'FMA7205',bpId:'BP10234',name:'left kidney',system:'visceral',group:'urinary',regions:['abdomen']},
  {fmaId:'FMA7647',bpId:'BP6706',name:'spinal cord',system:'nervous',group:'nervous',regions:['back','headNeck']}
]);
async function fileHash(file){
 const h=createHash('sha256');
 for await(const bytes of createReadStream(file))h.update(bytes);
 return h.digest('hex');
}
function safeDir(dir){
 fs.mkdirSync(dir,{recursive:true});
 requireFact(fs.realpathSync(dir)===path.resolve(dir),'Symlinked private source directory refused');
}
async function acquire(dir,key){
 const name=files[key],url=SOURCE+name,file=path.join(dir,name),receipt=file+'.receipt.json';
 if(fs.existsSync(file)&&fs.existsSync(receipt)){
   requireFact(fs.realpathSync(file)===file&&fs.realpathSync(receipt)===receipt,'Symlinked source input');
   const r=JSON.parse(fs.readFileSync(receipt,'utf8'));
   requireFact(r.url===url&&r.sha256===await fileHash(file)&&fs.statSync(file).size<=limits[key],'Cached official source receipt/hash mismatch: '+name);
   return {file,...r};
 }
 requireFact(!fs.existsSync(file)&&!fs.existsSync(receipt),'Incomplete download receipt; retain existing files for review: '+name);
 console.log('Downloading official PART-OF '+name);
 const response=await fetch(url,{redirect:'error',signal:AbortSignal.timeout(300000)});
 requireFact(response.ok&&response.body,'Official download HTTP '+response.status+': '+name);
 let length=0;
 const counter=new Transform({transform(chunk,enc,cb){
   length+=chunk.length;
   if(length>limits[key])return cb(new Error('Official source exceeds bounded size: '+name));
   cb(null,chunk);
 }});
 const tmp=file+'.'+randomUUID()+'.partial';
 try{
   await pipeline(Readable.fromWeb(response.body),counter,createWriteStream(tmp,{flags:'wx'}));
   requireFact(length>0,'Empty official source');
   if(key==='archive'){
     const fd=fs.openSync(tmp,'r');try{
       const sig=Buffer.alloc(4);fs.readSync(fd,sig,0,4,0);
       requireFact(sig.readUInt32LE(0)===0x04034b50,'Expected official ZIP, not HTML');
     }finally{fs.closeSync(fd);}
     archiveIndex(tmp);
   }else{
     const bytes=fs.readFileSync(tmp,'utf8');
     if(key==='names')parseOfficialNames(bytes);else parseOfficialElements(bytes);
   }
   const info={url,sha256:await fileHash(tmp),bytes:length,acquiredAt:new Date().toISOString()};
   fs.renameSync(tmp,file);write(receipt,info);
   return {file,...info};
 }finally{if(fs.existsSync(tmp))fs.unlinkSync(tmp);}
}
function archiveIndex(file){
 const entries=execFileSync('unzip',['-Z','-1',file],{encoding:'utf8',maxBuffer:16*1024*1024}).trim().split(/\r?\n/);
 checkArchiveEntryNames(entries);
 const map=new Map();
 for(const entry of entries){
   if(!/\.obj$/i.test(entry))continue;
   const key=path.basename(entry).replace(/\.obj$/i,'');
   requireFact(/^FJ\d+[A-Za-z]?$/.test(key)&&!map.has(key),'Unexpected or duplicate OBJ element ID: '+key);
   requireFact(!/[*?\[\]]/.test(entry),'Unsafe unzip wildcard entry');
   map.set(key,entry);
 }
 return map;
}
function obj(archive,index,fj){
 const entry=index.get(fj);requireFact(entry,'Missing official OBJ: '+fj);
 return execFileSync('unzip',['-p',archive,entry],{maxBuffer:MAX_OBJ});
}
function geometrySignature(bytes){
 // Ignore licence/header text, not geometry. Exact numeric coordinates and face
 // ordering must match across independent archive views for an anchor.
 const rows=bytes.toString('utf8').split(/\r?\n/).map(s=>s.trim().replace(/\s+/g,' ')).filter(s=>/^(v|f) /.test(s));
 requireFact(rows.some(s=>s.startsWith('v '))&&rows.some(s=>s.startsWith('f ')),'Missing anchor geometry');
 return sha(rows.join('\n'));
}
export function canonicalExactName(name){
 // Only formatting and explicit laterality. No token similarity, synonyms,
 // missing sides, plural substitution, or anatomical word removal.
 let n=String(name).trim().toLowerCase().replace(/\s+/g,' ');
 const suffix=n.match(/\.(l|r)$/);
 if(suffix)n=(suffix[1]==='l'?'left ':'right ')+n.slice(0,-2);
 return n;
}
// Conservative spelling/word-position variants only. No fuzzy similarity,
// removal of anatomical qualifiers, or inferred left/right.
export function canonicalTerminology(name){
 let n=canonicalExactName(name);
 n=n.replace(/\bsupra-orbital\b/g,'supraorbital')
   .replace(/\bsacro-iliac\b/g,'sacroiliac')
   .replace(/\binter-vertebral\b/g,'intervertebral')
   .replace(/\bradio-ulnar\b/g,'radioulnar')
   .replace(/\btibio-fibular\b/g,'tibiofibular')
   .replace(/\boesophagus\b/g,'esophagus')
   .replace(/\b(\w+) muscle$/,'$1 muscle');
 // Move laterality from a single named paired region to the start, keeping
 // the region itself. Never change descriptions with two side markers.
 if((n.match(/\b(left|right)\b/g)||[]).length===1){
   const m=n.match(/^(.+) of (left|right) (hand|foot|upper limb|lower limb)$/);
   if(m)n=m[2]+' '+m[1]+' of '+m[3];
 }
 return n;
}
function verifyFrame({isaArchive,isaIndex,isaRows,isaElements,partArchive,partIndex,partRows,partElements}){
 const anchors=[];
 // Three independently distributed, identical coordinate anchors required.
 // Publisher FMA identity and exact FJ intersection must both agree.
 for(const names of [['skin'],['left femur','right femur'],['frontal bone','occipital bone','sternum','left humerus','right humerus']]){
   let match=null;
   for(const name of names){
     const part=partRows.filter(r=>r.name.toLowerCase()===name);
     if(part.length!==1)continue;
     const r=part[0];
     if(!isaRows.some(x=>x.fmaId===r.fmaId&&x.name.toLowerCase()===name))continue;
     const common=[...(partElements.get(r.fmaId)||[])].filter(id=>isaElements.get(r.fmaId)?.has(id)&&isaIndex.has(id)&&partIndex.has(id));
     // Use atomic source geometry to avoid claiming a whole compound matches.
     for(const id of common){
       if(anchors.some(a=>a.fj===id))continue;
       const sig=geometrySignature(obj(isaArchive,isaIndex,id));
       if(sig===geometrySignature(obj(partArchive,partIndex,id))){match={name,fmaId:r.fmaId,fj:id,geometrySha256:sig};break;}
     }
     if(match)break;
   }
   if(match)anchors.push(match);
 }
 return {anchors,compatible:anchors.length===3,meaning:'Exact native-coordinate/face matches for shared source anchors; not clinical registration'};
}
function boundsBox(bounds){
 const a=bounds.min,b=bounds.max;
 return [a[0]*.001+.0007,a[2]*.001+.0692,-b[1]*.001-.0987,b[0]*.001+.0007,b[2]*.001+.0692,-a[1]*.001-.0987];
}
export async function expandPartOf({privateRoot,source,pack,catalog,systems,converted,oldNames,oldIds,usedFJ,identities,io,tree='partof'}){
 requireFact(tree==='isa'||tree==='partof','Unsupported source tree');
 const isIsa=tree==='isa';
 const dir=isIsa?source:path.join(privateRoot,'bp3d-4.0-partof');safeDir(dir);
 const sourceFiles=isIsa?{names:'isa_parts_list_e.txt',elements:'isa_element_parts.txt',archive:'isa_BP3D_4.0_obj_99.zip'}:files;
 const report={source:SOURCE,licensePage:DOC,license:'CC BY 4.0 on current publisher README; exact source notices retained',
   status:'PRIVATE_REVIEW_ONLY',approvedForDistribution:false,geometryAnatomyValidated:false,registrationValidated:false,
   added:[],retained:[],sources:{},frame:null};
 const reportFile=path.join(pack,tree+'-expansion-report.json');
 report.tree=tree;
 try{
   for(const key of Object.keys(sourceFiles)){
     if(!isIsa){report.sources[key]=await acquire(dir,key);continue;}
     const file=path.join(dir,sourceFiles[key]);
     requireFact(fs.realpathSync(file)===file&&fs.statSync(file).isFile(),'Invalid local IS-A source');
     report.sources[key]={file,url:SOURCE+sourceFiles[key],sha256:await fileHash(file),bytes:fs.statSync(file).size};
   }
   const partRows=parseOfficialNames(fs.readFileSync(report.sources.names.file,'utf8'));
   const partElements=parseOfficialElements(fs.readFileSync(report.sources.elements.file,'utf8'));
   const partArchive=report.sources.archive.file,partIndex=archiveIndex(partArchive);
   const isaArchive=path.join(source,'isa_BP3D_4.0_obj_99.zip'),isaIndex=archiveIndex(isaArchive);
   const isaRows=parseOfficialNames(fs.readFileSync(path.join(source,'isa_parts_list_e.txt'),'utf8'));
   const isaElements=parseOfficialElements(fs.readFileSync(path.join(source,'isa_element_parts.txt'),'utf8'));
   report.frame=isIsa?{compatible:true,anchors:[],meaning:'Same local IS-A archive as the checksum-verified baseline'}:verifyFrame({isaArchive,isaIndex,isaRows,isaElements,partArchive,partIndex,partRows,partElements});
   requireFact(report.frame.compatible,'PART-OF coordinate compatibility could not be established with three shared exact source anchors; not mounted');
   const byName=new Map(),catalogNames=new Map(),alreadyFma=new Set(converted.map(e=>e.fmaId));
   const byTerminology=new Map(),catalogTerminology=new Map();
   const index=(m,k,v)=>{if(!m.has(k))m.set(k,[]);m.get(k).push(v);};
   for(const r of partRows){
     index(byName,canonicalExactName(r.name),r);
     index(byTerminology,canonicalTerminology(r.name),r);
   }
   for(const [name,meta] of Object.entries(catalog)){
     if(!allowedSystems.has(meta.source))continue;
     index(catalogNames,canonicalExactName(name),name);
     index(catalogTerminology,canonicalTerminology(name),name);
   }
   const plans=[];
   for(const [name,meta] of Object.entries(catalog)){
     if(oldNames.has(name)||!allowedSystems.has(meta.source)||!systems[meta.source]?.includes(name))continue;
     const k=canonicalExactName(name),term=canonicalTerminology(name);
     let matches=byName.get(k)||[],mode='exact-form';
     let aliases=catalogNames.get(k)||[];
     if(!matches.length){
       matches=byTerminology.get(term)||[];aliases=catalogTerminology.get(term)||[];
       mode='conservative-terminology-form';
     }
     if(!matches.length)continue;
     if(matches.length!==1||aliases.length!==1){
       report.retained.push({name,reason:'ambiguous-exact-form'});continue;
     }
     plans.push({r:matches[0],name,meta,extra:false,mode});
   }
   for(const x of explicit){
     const matches=partRows.filter(r=>r.fmaId===x.fmaId&&r.bpId===x.bpId&&r.name===x.name);
     if(matches.length!==1){report.retained.push({name:x.name,reason:'pinned-source-identity-unavailable'});continue;}
     if(Object.hasOwn(catalog,x.name)){report.retained.push({name:x.name,reason:'existing-catalog-name'});continue;}
     plans.push({r:matches[0],name:x.name,meta:{source:x.system,group:x.group,layer:0,regions:x.regions},extra:true,mode:'pinned-publisher-identity'});
   }
   const seenPlans=new Set();
   const eligible=plans.map(p=>({...p,fj:[...(partElements.get(p.r.fmaId)||[])].sort()}))
    .sort((a,b)=>a.fj.length-b.fj.length||a.name.localeCompare(b.name));
   report.exactCandidateCount=eligible.length;
   for(const p of eligible){
     const {r,name,meta,extra,fj}=p,key=r.fmaId+'-'+r.bpId;
     if(seenPlans.has(name)||oldNames.has(name)||alreadyFma.has(r.fmaId)||identities.has(key)||fj.some(x=>usedFJ.has(x))){
       report.retained.push({name,key,reason:'existing-identity-or-shared-source-element'});continue;
     }
     seenPlans.add(name);
     if(!fj.length||fj.some(id=>!partIndex.has(id))){report.retained.push({name,key,reason:'source-element-missing'});continue;}
     const id=tree+'-supplement-'+key.toLowerCase();
     if(oldIds.has(id)){report.retained.push({name,key,reason:'duplicate-model-id'});continue;}
     try{
       const parts=fj.map(fjId=>{
         const bytes=obj(partArchive,partIndex,fjId);
         return {id:fjId,text:bytes.toString('utf8'),sha256:sha(bytes),zipEntry:partIndex.get(fjId)};
       });
       const lineage={schemaVersion:1,source:'Official BodyParts3D 4.0 '+tree.toUpperCase(),sourceArchive:sourceFiles.archive,
         archiveSHA256:report.sources.archive.sha256,sourceNamesSHA256:report.sources.names.sha256,
         sourceElementsSHA256:report.sources.elements.sha256,officialName:r.name,officialFMAId:r.fmaId,
         officialRepresentationId:r.bpId,atlasCandidateName:name,coordinateFrame:'native-official-OBJ',
         registrationValidated:false,geometryAnatomyValidated:false,approvedForDistribution:false,
         elements:parts.map(({id,sha256,zipEntry,text})=>({id,sha256,zipEntry,
           sourceLicenseNotice:text.split(/\r?\n/).slice(0,16).filter(l=>/creative commons|licen[cs]e|copyright/i.test(l))})),
         frameEvidence:report.frame,licensePage:DOC,warning:'Private source candidate; no medical or commercial approval'};
       const bytes=await makeGlb(parts,name,lineage);
       const doc=await io.readBinary(new Uint8Array(bytes)),geometry=summarizeGeometry(doc),diagnostics=diagnoseGeometry(doc,geometry);
       requireFact(geometry.meshes.map(m=>m.elementId).sort().join('|')===fj.join('|'),'Unexpected GLB mesh identity');
       const box=boundsBox(geometry.boundsNative);
       requireFact(box.every(Number.isFinite),'Invalid source bounds');
       const modelPath='./structures/'+id+'/model.glb',target=path.join(pack,'structures',id);
       fs.mkdirSync(target,{recursive:false});fs.writeFileSync(path.join(target,'model.glb'),bytes);
       lineage.generatedGLBSHA256=sha(bytes);write(path.join(target,'lineage.json'),lineage);
       const e={id,name,system:meta.source,group:meta.group,fmaId:r.fmaId,bpId:r.bpId,modelPath,
         glbSha256:lineage.generatedGLBSHA256,triangles:geometry.triangles,vertices:geometry.vertices,
         sourceMeshes:geometry.sourceMeshes,boundsNative:geometry.boundsNative,diagnostics,
         state:'converted-unverified',mappingMethod:tree+'-publisher-'+p.mode+'-private-review-only',
         geometryAnatomyValidated:false,approvedForDistribution:false,privateAtlasMeta:{...meta,box}};
       converted.push(e);oldNames.add(name);oldIds.add(id);identities.add(key);alreadyFma.add(r.fmaId);fj.forEach(x=>usedFJ.add(x));
       report.added.push({name,key,system:e.system,extra,mode:p.mode,flags:diagnostics.flags});
       console.log(tree.toUpperCase()+' SUPPLEMENT STAGED',name,key);
     }catch(error){report.retained.push({name,key,reason:'conversion-blocked',error:String(error.message)});}
   }
   report.status='PRIVATE_CANDIDATES_MOUNTED_PENDING_VISUAL_QA';
 }catch(error){report.status=tree.toUpperCase()+'_BLOCKED';report.error=String(error.message);}
 write(reportFile,report);
 console.log(tree.toUpperCase()+' SUPPLEMENT RESULT',JSON.stringify({status:report.status,exactCandidateCount:report.exactCandidateCount??0,added:report.added.length,retained:report.retained.length,error:report.error||null}));
 return report;
}
