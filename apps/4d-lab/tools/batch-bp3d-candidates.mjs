// MEDCOEL: single-run, OFF-PRODUCTION bulk conversion from OFFICIAL DBCLS OBJ.
// No mutations outside gitignored local-data; never promotes any models to apps/*/public.
// "npm run batch:bodyparts3d -- --all" processes every unambiguous direct match;
// results include unsuccessful conversions + a complete mapping gap inventory.
import fs from 'node:fs';
import path from 'node:path';
import {createReadStream} from 'node:fs';
import {createHash} from 'node:crypto';
import {execFileSync} from 'node:child_process';
import {fileURLToPath} from 'node:url';
import {NodeIO} from '@gltf-transform/core';
import {parseOfficialNames,parseOfficialElements,candidateCrosswalk,mapActualMeshFiles,
  checkArchiveEntryNames,BP3D_OFFICIAL,normalizeAnatomyName} from '../../../licensing/tools/prepare-bodyparts3d-source.mjs';
import {makeGlb,readObjTriangles} from './build-bp3d-candidate.mjs';
import {buildCompositeHTML} from './bp3d-composite-viewer.mjs';
import {summarizeGeometry,diagnoseGeometry,verifyLineage} from './review-bp3d-candidate.mjs';
import {SYSTEM_MATERIALS,tissueClass} from './bp3d-review-materials.mjs';
import {reconcileMapping} from './bp3d-mapping-review.mjs';
import {auditCompleteness} from './audit-bp3d-completeness.mjs';
import {buildAllSystemsTriage} from './bp3d-all-systems-triage.mjs';
import {selectProvisionalMappings} from './bp3d-provisional-mappings.mjs';
import {auditGeneratedBatch} from './bp3d-batch-audit.mjs';
import {applyReviewedSourceMappings} from './bp3d-reviewed-mappings.mjs';
import {selectFocusSourceReview} from './bp3d-focus-source-shortlist.mjs';
import {selectExactVertebraSources} from './bp3d-exact-vertebra-sources.mjs';
import {selectAllSystemsExact,rehydratePrivateInventory} from './bp3d-all-systems-exact-sources.mjs';

const ROOT=fileURLToPath(new URL('../../../',import.meta.url));
const PRIVATE=path.join(ROOT,'local-data','licensing-quarantine');
const SOURCE=path.join(PRIVATE,'bp3d-4.0');
const DEST=path.join(PRIVATE,'bp3d-batch');
const MAX_OBJ=96*1024*1024;
const sha=data=>createHash('sha256').update(data).digest('hex');
const tokenise=name=>normalizeAnatomyName(name).split(' ').filter(Boolean);
const general=new Set(['of','the','and','part','branch','left','right','anterior','posterior','inferior','superior']);

// This is a source reference surface, not another Atlas catalog match. Keep its
// identity and the conflicting license notices visible for a separate rights review.
export async function buildReferenceSkin({official,elements,zipFiles,archive,archiveSha,output}){
  const identity=official.find(row=>row.fmaId==='FMA7163'&&row.bpId==='BP9115'&&row.name.toLowerCase()==='skin');
  const ids=[...(elements.get('FMA7163')||[])];
  if(!identity||ids.length!==1||ids[0]!=='FJ2810')return null;
  const zipEntry=zipFiles.find(entry=>path.basename(entry)==='FJ2810.obj');
  if(!zipEntry)return null;
  const bytes=execFileSync('unzip',['-p',archive,zipEntry],{maxBuffer:MAX_OBJ});
  const sourceText=bytes.toString('utf8');
  if(!sourceText.includes('Concept ID : FMA7163')||!sourceText.includes('Representation ID : BP9115'))
    throw new Error('Official skin OBJ header does not match FMA/BP table');
  const sourceLicenseNotice=sourceText.split(/\r?\n/).slice(0,12)
    .find(line=>line.includes('Creative Commons'))?.replace(/^#\s*/, '')||null;
  const lineage={schemaVersion:1,source:BP3D_OFFICIAL,officialName:'skin',officialFMAId:'FMA7163',
    officialRepresentationId:'BP9115',sourceArchive:path.basename(archive),archiveSHA256:archiveSha,
    elements:[{id:'FJ2810',sha256:sha(bytes),zipEntry}],coordinateFrame:'native-official-OBJ',
    registrationValidated:false,geometryAnatomyValidated:false,approvedForDistribution:false,
    sourceLicenseNotice,licensePage:'https://dbarchive.biosciencedbc.jp/en/bodyparts3d/lic.html',
    rightsReview:'BLOCKED: source OBJ notice says CC BY-SA 2.1 Japan; current license page says CC BY 4.0. Reconcile terms before upload.',
    warning:'Official source skin reference, not a converted Atlas candidate and not validated with CT/USG'};
  const part={id:'FJ2810',text:sourceText};
  let glb;
  try{glb=await makeGlb([part],'skin reference',lineage)}
  catch(error){
    if(error.message!=='Degenerate OBJ triangle')throw error;
    const stats=readObjTriangles(sourceText,{skipDegenerate:true}).stats;
    lineage.sourceGeometryWarnings={omittedZeroAreaTriangles:stats.omittedDegenerateTriangles,
      requiresManualReview:true};
    glb=await makeGlb([part],'skin reference',lineage,{skipDegenerate:true});
  }
  lineage.generatedGLBSHA256=sha(glb);
  const doc=await new NodeIO().readBinary(glb),geometry=summarizeGeometry(doc);
  verifyLineage({bytes:glb,lineage,summary:geometry});
  const dir=path.join(output,'reference-surface');fs.mkdirSync(dir,{recursive:true});
  fs.writeFileSync(path.join(dir,'skin.glb'),glb);
  fs.writeFileSync(path.join(dir,'lineage.json'),JSON.stringify(lineage,null,2)+'\n');
  return {name:'Official source skin reference',fmaId:'FMA7163',bpId:'BP9115',fjId:'FJ2810',
    modelPath:'./reference-surface/skin.glb',glbSha256:lineage.generatedGLBSHA256,
    boundsNative:geometry.boundsNative,triangles:geometry.triangles,
    state:'reference-unverified',sourceLicenseNotice,rightsReview:lineage.rightsReview};
}

export function safeStructureId(name){
  const id=normalizeAnatomyName(name).replace(/[^a-z0-9]+/g,'-').replace(/^-|-$/g,'').slice(0,52);
  return (id||'structure')+'-'+sha(name).slice(0,12);
}
export function planBatch(mapped, options={}){
  const eligible=[],gaps=[],systems={};
  for(const item of mapped.candidates){
    const match=item.matches?.length===1?item.matches[0]:null;
    const ready=item.state==='candidate'&&match&&match.sourceObjs?.length>0&&
      match.sourceObjs.every(v=>v.archivePath&&v.fileId);
    if(!systems[item.atlasSystem])systems[item.atlasSystem]={total:0,eligible:0,unmatched:0,ambiguous:0,missingSource:0};
    const sys=systems[item.atlasSystem];sys.total++;
    if(ready){
      sys.eligible++;
      eligible.push({name:item.atlasName,system:item.atlasSystem,id:safeStructureId(item.atlasName),source:match,
        mappingMethod:item.matchMethod,reviewManifestSHA256:item.reviewManifestSHA256||null});
    }else{
      const reason=item.state==='unmatched'?'unmatched':item.state==='ambiguous'?'ambiguous':'missingSource';
      sys[reason]++;
      gaps.push({name:item.atlasName,system:item.atlasSystem,reason,
        officialIds:item.matches?.map(m=>({fmaId:m.fmaId,bpId:m.bpId}))||[]});
    }
  }
  eligible.sort((a,b)=>a.name.localeCompare(b.name,'en'));
  gaps.sort((a,b)=>a.name.localeCompare(b.name,'en'));
  const ids=new Set(eligible.map(x=>x.id));
  if(ids.size!==eligible.length)throw new Error('Different structures mapped to same output ID');
  const chosen=options.limit===undefined?eligible:eligible.slice(0,options.limit);
  return {eligible:chosen,allEligible:eligible.length,gaps,systems,
    summary:{catalogCount:mapped.candidates.length,directlyMappable:eligible.length,
      gaps:gaps.length,selected:chosen.length,geometryValidated:0,publicReleaseApproved:0}};
}
export function suggestForUnmatched(gaps, officialRows, {maxResults=3}={}){
  const entries=officialRows.map(row=>{
    const tokens=tokenise(row.name), set=new Set(tokens);
    return {...row,tokens,set};
  });
  const inverted=new Map();
  for(let i=0;i<entries.length;i++){
    for(const t of entries[i].set){
      if(general.has(t)||t.length<3)continue;
      if(!inverted.has(t))inverted.set(t,new Set());
      inverted.get(t).add(i);
    }
  }
  return gaps.map(gap=>{
    if(gap.reason!=='unmatched')return {...gap,suggestions:[]};
    const input=tokenise(gap.name), tokens=new Set(input);
    const hasL=tokens.has('left'),hasR=tokens.has('right');
    const potential=new Set();
    for(const token of tokens) for(const i of inverted.get(token)||[])potential.add(i);
    const scored=[];
    for(const i of potential){
      const ref=entries[i];
      if((hasL&&ref.set.has('right'))||(hasR&&ref.set.has('left')))continue;
      let intersection=0;for(const t of tokens)if(ref.set.has(t))intersection++;
      const union=new Set([...tokens,...ref.set]).size;
      const score=intersection/union;
      if(score<0.4)continue;
      scored.push({fmaId:ref.fmaId,bpId:ref.bpId,officialName:ref.name,
        similarity:Number(score.toFixed(3)),method:'token-similarity-NOT-verified'});
    }
    scored.sort((a,b)=>b.similarity-a.similarity||a.officialName.localeCompare(b.officialName,'en'));
    return {...gap,suggestions:scored.slice(0,maxResults)};
  });
}
// Presentation-only colors for the independent source-review app; these are
// not tissue-color annotations from the publisher and do not alter source GLBs.
export const REVIEW_SYSTEM_PALETTE=SYSTEM_MATERIALS;
export function buildBulkHTML(){
  return [
    '<!doctype html><html lang="en"><head><meta charset="utf-8"/><meta name="viewport" content="width=device-width,initial-scale=1"/>',
    '<title>BodyParts3D bulk geometry review — local only</title>',
    '<style>*{box-sizing:border-box}body{margin:0;background:#10191f;color:#e8f3f1;font:14px system-ui;overflow:hidden}',
    'header{height:66px;background:#1a333b;display:flex;align-items:center;gap:12px;padding:10px 16px;flex-wrap:wrap}',
    'label{cursor:pointer}#palette-note{color:#c5e1da;font-size:12px}#legend{display:flex;flex-wrap:wrap;gap:6px;margin:8px 0 14px}#legend span{display:inline-flex;align-items:center;gap:4px;font-size:11px;color:#d4e3e5}#legend i{width:9px;height:9px;display:inline-block;border-radius:50%}#source-credit{font-size:11px;line-height:1.4;color:#b8d4d5}#source-credit a{color:#a9edc9}',
    'strong{color:#a9edc9}#layout{display:flex;height:calc(100dvh - 110px)}',
    'aside{width:290px;flex:none;background:#15262d;padding:12px;overflow:auto}aside input,aside select{width:100%;margin-bottom:10px;padding:9px;border-radius:5px;background:#213840;color:white;border:1px solid #4d737f}',
    'aside button{display:block;width:100%;border:0;background:none;color:#b7d8df;text-align:left;padding:8px;border-bottom:1px solid #2c3d46;cursor:pointer}',
    'aside button:hover,aside button:focus{background:#2b5058;color:#fff}main{min-width:0;flex:1;position:relative;overflow:hidden}#canvas{width:100%;height:100%}canvas{display:block}',
    '#metrics{position:absolute;bottom:12px;left:12px;background:#0b1a1ddc;padding:11px;border-radius:7px;max-width:min(640px,90%);pointer-events:none}',
    'footer{background:#263238;padding:11px 15px;color:#ffce90;height:44px}',
    '@media(max-width:700px){header{height:auto;min-height:66px}#layout{height:calc(100dvh - 160px)}aside{width:150px;padding:6px}aside button{font-size:11px}footer{height:auto}}',
    '</style><script type="importmap">{"imports":{"three":"./vendor/three/build/three.module.js","three/addons/":"./vendor/three/examples/jsm/"}}</script>',
    '</head><body><header><strong>Official BodyParts3D 4.0 • Batch review</strong>',
    '<span id="summary">Loading inventory…</span><label><input id="palette" type="checkbox"/> Color by system</label><label><input id="tissue" type="checkbox" checked/> Tissue classes</label><label><input id="contrast" type="checkbox"/> High contrast</label><label><input id="wire" type="checkbox"/> Wireframe</label>',
    '<button id="reset">Reset camera</button><a href="./body.html" style="color:#b8f3d2">Assemble body (multi-system)</a><span id="status"></span></header>',
    '<div id="layout"><aside><input id="search" type="search" placeholder="Find structure…"/><select id="system"><option value="">All systems</option></select><div id="palette-note">Illustrative system colors, not verified tissue colors</div><div id="legend"></div><p id="source-credit">BodyParts3D, © The Database Center for Life Science licensed under CC Attribution 4.0 International. <a href="https://dbarchive.biosciencedbc.jp/en/bodyparts3d/lic.html">Source and license</a>.</p><div id="items"></div></aside>',
    '<main><div id="canvas"></div><div id="metrics">Select a candidate</div></main></div>',
    '<footer>NOT FOR PUBLIC RELEASE • Tissue/system colors are illustrative, not verified anatomy colors • Not registered to MEDCOEL CT/USG • No current assets replaced.</footer>',
    '<script type="module">',
    "import * as THREE from 'three';",
    "import {OrbitControls} from 'three/addons/controls/OrbitControls.js';",
    "import {GLTFLoader} from 'three/addons/loaders/GLTFLoader.js';",
    "import {TISSUE_MATERIALS,SYSTEM_MATERIALS,materialFor,tissueClass} from './review-materials.js';",
    "const root=document.getElementById('canvas'),scene=new THREE.Scene();scene.background=new THREE.Color(0x10191f);",
    "const cam=new THREE.PerspectiveCamera(45,1,.001,1e6),ren=new THREE.WebGLRenderer({antialias:true,powerPreference:'low-power'});",
    "ren.setPixelRatio(Math.min(window.devicePixelRatio||1,1.5));root.appendChild(ren.domElement);",
    "ren.toneMapping=THREE.ACESFilmicToneMapping;ren.toneMappingExposure=1.24;",
    "const ambient=new THREE.HemisphereLight(0xecf5ef,0x344653,1.25);scene.add(ambient);",
    "const sun=new THREE.DirectionalLight(0xfff4e3,2.35);sun.position.set(1,2,3);scene.add(sun);",
    "const rim=new THREE.DirectionalLight(0xaacbd8,1.05);rim.position.set(-2,1,-2);scene.add(rim);",
    "const control=new OrbitControls(cam,ren.domElement);control.enableDamping=true;",
    "const systemPalette=SYSTEM_MATERIALS; const neutralColor=0xc8cbd0;",
    "function mode(){return document.getElementById('tissue').checked?'tissue':document.getElementById('palette').checked?'system':'neutral'}",
    "function recolor(){const style=materialFor(currentEntry||{},mode());",
    "for(const mesh of models){const mats=Array.isArray(mesh.material)?mesh.material:[mesh.material];",
    "for(const mat of mats){if(mat?.color)mat.color.setHex(style.color);if('roughness' in mat)mat.roughness=style.roughness;",
    "if('metalness' in mat)mat.metalness=0;mat.transparent=false;mat.opacity=1;mat.depthWrite=true;mat.side=THREE.DoubleSide;mat.needsUpdate=true;}}}",
    "document.getElementById('palette').addEventListener('change',e=>{if(e.target.checked)document.getElementById('tissue').checked=false;recolor();legend()});",
    "document.getElementById('tissue').addEventListener('change',e=>{if(e.target.checked)document.getElementById('palette').checked=false;recolor();legend()});",
    "document.getElementById('contrast').addEventListener('change',e=>{const on=e.target.checked;ambient.intensity=on?0.75:1.25;sun.intensity=on?3.15:2.35;rim.intensity=on?1.45:1.05;scene.background.setHex(on?0x070d12:0x10191f)});",
    "function legend(){const tissue=document.getElementById('tissue').checked,palette=document.getElementById('palette').checked;",
    "const colors=tissue?Object.fromEntries(Object.entries(TISSUE_MATERIALS).map(([key,value])=>[key,value.color])):palette?systemPalette:{Neutral:neutralColor};",
    "document.getElementById('palette-note').textContent=tissue?'Illustrative tissue-class palette • identity may be uncertain':palette?'Illustrative system colors, not verified tissue colors':'Neutral geometry inspection';",
    "document.getElementById('legend').replaceChildren();for(const [system,color] of Object.entries(colors)){const row=document.createElement('span');",
    "const dot=document.createElement('i');dot.style.backgroundColor='#'+color.toString(16).padStart(6,'0');",
    "row.append(dot,document.createTextNode(system));document.getElementById('legend').appendChild(row);}}legend();",
    "let current=null,currentEntry=null,models=[],generation=0,reset=()=>{},entries=[];",
    "function resize(){let w=Math.max(100,root.clientWidth),h=Math.max(100,root.clientHeight);ren.setSize(w,h,true);cam.aspect=w/h;cam.updateProjectionMatrix();}",
    "new ResizeObserver(resize).observe(root);resize();",
    "document.getElementById('wire').addEventListener('change',e=>models.forEach(m=>{const mat=m.material;if(Array.isArray(mat))mat.forEach(x=>x.wireframe=e.target.checked);else mat.wireframe=e.target.checked;}));",
    "document.getElementById('reset').addEventListener('click',()=>reset());",
    "function select(entry){const attempt=++generation;document.getElementById('status').textContent='Loading '+entry.name+'…';",
    "new GLTFLoader().load(entry.modelPath,g=>{if(attempt!==generation)return;",
    "if(current){scene.remove(current);current.traverse(x=>{if(x.isMesh){x.geometry.dispose();if(Array.isArray(x.material))x.material.forEach(m=>m.dispose());else x.material.dispose();}})}",
    "current=g.scene;currentEntry=entry;models=[];scene.add(current);current.traverse(x=>{if(x.isMesh){x.material=Array.isArray(x.material)?x.material.map(m=>m.clone()):x.material.clone();models.push(x);}});recolor();",
    "const box=new THREE.Box3().setFromObject(current),size=box.getSize(new THREE.Vector3()),center=box.getCenter(new THREE.Vector3()),r=Math.max(1e-9,size.length()/2);",
    "reset=()=>{control.target.copy(center);cam.near=Math.max(1e-12,r/1000);cam.far=Math.max(1e-6,r*100);cam.position.copy(center).add(new THREE.Vector3(r*1.4,r*1.2,r*2.6));cam.updateProjectionMatrix();control.update();};reset();",
    "document.getElementById('metrics').textContent=entry.name+' • '+entry.system+' • '+tissueClass(entry)+' (illustrative) • '+entry.triangles+' triangles • '+entry.sourceMeshes+' FJ elements • FMA '+entry.fmaId+(entry.diagnostics?.flags?.length?' • Check: '+entry.diagnostics.flags.join(', '):'')+(entry.omittedZeroAreaTriangles?' • '+entry.omittedZeroAreaTriangles+' zero-area source triangles omitted':'')+' • Unvalidated coordinate frame';",
    "document.getElementById('status').textContent='Ready';},undefined,e=>{if(attempt===generation)document.getElementById('status').textContent='Load failed: '+e.message;});}",
    "const search=document.getElementById('search'),system=document.getElementById('system'),items=document.getElementById('items');",
    "function list(){const q=search.value.toLowerCase(),sys=system.value;items.replaceChildren();",
    "for(const entry of entries){if(sys&&entry.system!==sys)continue;if(q&&!entry.name.toLowerCase().includes(q))continue;",
    "const button=document.createElement('button');button.textContent=entry.name;button.addEventListener('click',()=>select(entry));items.appendChild(button);}}",
    "search.addEventListener('input',list);system.addEventListener('change',list);",
    "fetch('./inventory.json').then(r=>{if(!r.ok)throw new Error('missing inventory');return r.json()}).then(data=>{",
    "entries=data.converted;document.getElementById('summary').textContent=entries.length+' converted | '+data.summary.gaps+' unmapped | '+data.summary.failed+' conversion failures';",
    "for(const value of [...new Set(entries.map(x=>x.system))].sort()){const o=document.createElement('option');o.value=value;o.textContent=value;system.appendChild(o);}list();if(entries.length)select(entries[0]);",
    "}).catch(e=>document.getElementById('status').textContent='Inventory unavailable: '+e.message);",
    "function frame(){requestAnimationFrame(frame);control.update();ren.render(scene,cam)}frame();",
    '</script></body></html>'
  ].join('\n');
}
function allowed(root,dir){
  const base=path.resolve(root,'local-data')+path.sep;
  const target=path.resolve(dir);
  if(!target.startsWith(base))throw new Error('Batch output must remain in gitignored local-data');
  return target;
}
async function hashFile(file){
  const hash=createHash('sha256');
  for await(const block of createReadStream(file))hash.update(block);
  return hash.digest('hex');
}
function listZip(file){
  const files=execFileSync('unzip',['-Z','-1',file],{encoding:'utf8',maxBuffer:16*1024*1024}).trim().split(/\r?\n/);
  checkArchiveEntryNames(files);return files;
}
// Separate selection policies may share the same private rights status.
 // Never require the 584-model selector for the all-systems mode.
export function provisionalSelectionReport({provisional,allSystemsExact,provisionalInfo,
  includePromising,limitNew}){
 if(!provisional||allSystemsExact)return null;
 if(!provisionalInfo?.summary)
   throw Error('Provisional review selector missing; no inventory may be finalized');
 return {includePromising,limitNew,selected:provisionalInfo.summary.provisionalSelected,
   rejected:provisionalInfo.summary.reviewRejected,approved:0};
}

// Only a FAILED, rights-blocked, explicitly all-systems private inventory can
// be resumed. A passing/finalized inventory can never be overwritten.
export function isIncompleteFailedAllSystemsInventory(inventory){
 const summary=inventory?.summary;
 return inventory?.kind==='official-bp3d-bulk-source-review' &&
   inventory.provisionalSource===true &&
   inventory.allSystemsExactSourcePreview===true &&
   inventory.legalStatus==='NOT-CLEARED' &&
   inventory.approvedForCommercialDistribution===false &&
   inventory.geometryRegisteredToMEDCOEL===false &&
   Array.isArray(inventory.converted) &&
   Array.isArray(inventory.failures) &&
   Number.isInteger(summary?.selected) &&
   Number.isInteger(summary?.converted) &&
   Number.isInteger(summary?.failed) &&
   summary.failed>0 &&
   summary.converted+summary.failed===summary.selected &&
   inventory.converted.length===summary.converted &&
   inventory.failures.length===summary.failed &&
   /^[a-f0-9]{64}$/.test(inventory.sourceHashes?.archiveSha256||'') &&
   /^[a-f0-9]{64}$/.test(inventory.sourceHashes?.namesSha256||'') &&
   /^[a-f0-9]{64}$/.test(inventory.sourceHashes?.elementsSha256||'');
}

export async function runBatch({root=ROOT,sourceDir=SOURCE,outputDir,limit,reviewedFile,provisional=false,includePromising=false,limitNew=100,focusShortlist=false,vertebralExact=false,allSystemsExact=false,resumeExistingOutput=false}={}){
  if(provisional&&reviewedFile)throw Error('Provisional and reviewed batches must remain separate');
  if(resumeExistingOutput&&!allSystemsExact)
    throw Error('Interrupted GLB recovery is restricted to the private all-systems source batch');
  if(focusShortlist&&(!provisional||!includePromising||limitNew<114||reviewedFile||limit!==undefined))
    throw Error('Focus source expansion requires full private provisional discovery and no artificial truncation');
  if(allSystemsExact&&(!provisional||reviewedFile||focusShortlist||vertebralExact||limit!==undefined))
    throw Error('All-systems exact-source batch must be private, untruncated and independent of focused modes');
  if(vertebralExact&&!focusShortlist)
    throw Error('Vertebral source review requires the full private 602-model focused candidate provenance');
  // Every candidate expansion has an independent private output; never overwrite the 470/584/602 model baselines.
  const output=allowed(root,outputDir||(allSystemsExact?path.join(root,'local-data/licensing-quarantine/bp3d-all-systems'):
    vertebralExact?path.join(root,'local-data/licensing-quarantine/bp3d-vertebral'):
    focusShortlist?path.join(root,'local-data/licensing-quarantine/bp3d-focused'):
    provisional?path.join(root,'local-data/licensing-quarantine/bp3d-provisional'):
    reviewedFile?path.join(root,'local-data/licensing-quarantine/bp3d-reviewed'):DEST));
  let failedPriorManifest=null;
  if(resumeExistingOutput){
    const privateRoot=path.join(root,'local-data/licensing-quarantine');
    if(path.dirname(output)!==privateRoot||
       !/^bp3d-all-systems-temp-[A-Za-z0-9_-]+$/.test(path.basename(output))||
       !fs.existsSync(output)||fs.lstatSync(output).isSymbolicLink()||
       fs.realpathSync(output)!==path.join(fs.realpathSync(privateRoot),path.basename(output)))
      throw Error('Unsafe GLB recovery folder; original private batches untouched');
    const priorManifestPath=path.join(output,'inventory.json');
    if(fs.existsSync(priorManifestPath)){
      if(fs.lstatSync(priorManifestPath).isSymbolicLink()||
         !fs.lstatSync(priorManifestPath).isFile())
        throw Error('Unsafe symlinked or non-file interrupted inventory');
      failedPriorManifest=JSON.parse(fs.readFileSync(priorManifestPath,'utf8'));
      if(!isIncompleteFailedAllSystemsInventory(failedPriorManifest))
        throw Error('Completed or invalid prior source inventory may not be resumed');
    }
  }
  const namesPath=path.join(sourceDir,'isa_parts_list_e.txt'),
    elementsPath=path.join(sourceDir,'isa_element_parts.txt'),
    archive=path.join(sourceDir,'isa_BP3D_4.0_obj_99.zip');
  const namesBytes=fs.readFileSync(namesPath),elementBytes=fs.readFileSync(elementsPath);
  const official=parseOfficialNames(namesBytes.toString('utf8'));
  const elements=parseOfficialElements(elementBytes.toString('utf8'));
  const zipFiles=listZip(archive),archiveSha=await hashFile(archive);
  if(failedPriorManifest && (
      failedPriorManifest.sourceHashes.archiveSha256!==archiveSha ||
      failedPriorManifest.sourceHashes.namesSha256!==sha(namesBytes) ||
      failedPriorManifest.sourceHashes.elementsSha256!==sha(elementBytes)))
    throw Error('Interrupted failed inventory pins a different publisher source archive');
  const catalog=JSON.parse(fs.readFileSync(path.join(root,'apps/anatomy/public/data/atlas-catalog.json'),'utf8'));
  let mapped=mapActualMeshFiles(candidateCrosswalk(catalog,official),elements,zipFiles);
  let provisionalInfo=null,focusInfo=null,vertebralInfo=null,allSystemsInfo=null,priorReviewInventory=null;
  const sourceBatch=path.join(root,'local-data/licensing-quarantine/bp3d-batch');
  const provisionalReviewPath=path.join(root,'local-data/licensing-quarantine/bp3d-provisional');
  const priorReviewPath=path.join(root,'local-data/licensing-quarantine',
    allSystemsExact?'bp3d-vertebral':vertebralExact?'bp3d-focused':'bp3d-provisional');
  let originalInventory=null;
  if(allSystemsExact){
    // No change to the 470/584/602/626 models. The latest PREVIOUS private
    // 626 batch is the only cache; all source names/FJ are rehydrated against
    // original publisher tables after a fresh checksum/lineage audit.
    if([sourceBatch,priorReviewPath,
      path.join(root,'local-data/licensing-quarantine/bp3d-provisional'),
      path.join(root,'local-data/licensing-quarantine/bp3d-focused')]
      .some(x=>path.resolve(x)===path.resolve(output)))
      throw Error('All-systems review output must not overwrite any prior source batch');
    for(const privateDir of [sourceBatch,priorReviewPath]){
      if(fs.lstatSync(privateDir).isSymbolicLink())
        throw Error('Symlinked original or 626-model private source batch');
    }
    originalInventory=JSON.parse(fs.readFileSync(path.join(sourceBatch,'inventory.json'),'utf8'));
    priorReviewInventory=JSON.parse(fs.readFileSync(path.join(priorReviewPath,'inventory.json'),'utf8'));
    for(const inv of [originalInventory,priorReviewInventory])
      if(inv.sourceHashes?.archiveSha256!==archiveSha||
        inv.sourceHashes?.namesSha256!==sha(namesBytes)||
        inv.sourceHashes?.elementsSha256!==sha(elementBytes)||
        inv.approvedForCommercialDistribution!==false||
        inv.geometryRegisteredToMEDCOEL!==false||
        inv.legalStatus!=='NOT-CLEARED'||inv.summary?.failed!==0)
        throw Error('Untrusted prior GLB manifest, source hashes or rights state');
    if(priorReviewInventory.provisionalSource!==true||
       priorReviewInventory.vertebralSourcePreview!==true||
       priorReviewInventory.converted.length<600)
      throw Error('A completed private 626-model vertebral batch is required');
    for(const cache of [sourceBatch,priorReviewPath]){
      const integrity=await auditGeneratedBatch(cache);
      if(integrity.errors.length)throw Error('Cached source/GLB integrity failed in '+cache);
    }
    const priorAudited=auditCompleteness({catalog,officialRows:official,
      elementIndex:elements,archiveFiles:zipFiles,inventory:priorReviewInventory,
      mappingReview:JSON.parse(fs.readFileSync(path.join(priorReviewPath,'mapping-review.json'),'utf8'))});
    if(priorAudited.errors.length||
       priorAudited.summary.converted!==priorReviewInventory.converted.length)
      throw Error('626-model private source identity audit did not pass');
    const cached=rehydratePrivateInventory({catalog,officialRows:official,
      elements,archiveFiles:zipFiles,inventory:priorReviewInventory});
    allSystemsInfo=selectAllSystemsExact({catalog,officialRows:official,elements,
      archiveFiles:zipFiles,existing:priorReviewInventory.converted});
    if(!allSystemsInfo.candidates.length)
      throw Error('No new unambiguous exact official-source identities remain; see all-systems source audit report');
    const byName=new Map([...cached,...allSystemsInfo.candidates]
      .map(row=>[row.atlasName,row]));
    mapped={...mapped,candidates:mapped.candidates.map(x=>byName.get(x.atlasName)||x)};
    if(byName.size!==priorReviewInventory.converted.length+allSystemsInfo.candidates.length)
      throw Error('All-systems identity collision in proposed private additions');
  }else if(provisional){
    if(path.resolve(output)===path.resolve(sourceBatch))throw Error('Provisional source cannot overwrite baseline');
    originalInventory=JSON.parse(fs.readFileSync(path.join(sourceBatch,'inventory.json'),'utf8'));
    if(originalInventory.sourceHashes?.archiveSha256!==archiveSha ||
      originalInventory.approvedForCommercialDistribution!==false)throw Error('Original batch source hash/rights mismatch');
    const originalAudit=await auditGeneratedBatch(sourceBatch);
    if(originalAudit.errors.length)throw Error('Original 470 GLBs failed integrity; no provisional reuse permitted');
    const mappingReview=JSON.parse(fs.readFileSync(path.join(sourceBatch,'mapping-review.json'),'utf8'));
    const audit=auditCompleteness({catalog,officialRows:official,elementIndex:elements,
      archiveFiles:zipFiles,inventory:originalInventory,mappingReview});
    if(audit.errors.length)throw Error('Original source crosswalk failed');
    const triage=buildAllSystemsTriage(audit,mappingReview);
    provisionalInfo=selectProvisionalMappings({triage,officialRows:official,elements,zipFiles,
      existing:originalInventory.converted,includePromising,limitNew});
    if(!provisionalInfo.candidates.length)throw Error('No safe provisional identities in current local source');
    const names=new Set(provisionalInfo.candidates.map(x=>x.atlasName));
    mapped={...mapped,candidates:mapped.candidates.map(x=>names.has(x.atlasName)?
      provisionalInfo.candidates.find(v=>v.atlasName===x.atlasName):x)};
    if(focusShortlist){
      if([sourceBatch,priorReviewPath].some(x=>path.resolve(x)===path.resolve(output)))
        throw Error('Focused source preview may not overwrite original or 584-model private review');
      if(fs.lstatSync(priorReviewPath).isSymbolicLink())
        throw Error('Symlinked previous private source pack is prohibited');
      priorReviewInventory=JSON.parse(fs.readFileSync(path.join(priorReviewPath,'inventory.json'),'utf8'));
      if(priorReviewInventory.provisionalSource!==true||
         priorReviewInventory.approvedForCommercialDistribution!==false||
         priorReviewInventory.legalStatus!=='NOT-CLEARED'||
         priorReviewInventory.sourceHashes?.archiveSha256!==archiveSha||
         priorReviewInventory.summary?.failed!==0)
        throw Error('Previous private 584-model source manifest has unexpected lineage, failure or rights state');
      const priorIntegrity=await auditGeneratedBatch(priorReviewPath);
      if(priorIntegrity.errors.length)
        throw Error('Previous private candidate GLB integrity failed; never reuse these models');
      let priorForFocus=priorReviewInventory;
      if(vertebralExact){
        if(fs.lstatSync(provisionalReviewPath).isSymbolicLink())
          throw Error('Untrusted symlinked prior 584-model source pack');
        priorForFocus=JSON.parse(fs.readFileSync(path.join(provisionalReviewPath,'inventory.json'),'utf8'));
        if(priorForFocus.sourceHashes?.archiveSha256!==archiveSha||
          priorForFocus.provisionalSource!==true||
          priorForFocus.approvedForCommercialDistribution!==false||
          priorForFocus.legalStatus!=='NOT-CLEARED'||
          priorForFocus.summary?.failed!==0 ||
          (await auditGeneratedBatch(provisionalReviewPath)).errors.length)
          throw Error('Prior 584-model source data is not complete or rights-quarantined');
      }
      focusInfo=selectFocusSourceReview({catalog,officialRows:official,elements,archiveFiles:zipFiles,
        existing:priorForFocus.converted});
      if(!focusInfo.candidates.length)
        throw Error('No safe source-specific candidates left for focused private preview');
      const byName=new Map(focusInfo.candidates.map(x=>[x.atlasName,x]));
      if(vertebralExact){
        vertebralInfo=selectExactVertebraSources({catalog,officialRows:official,
          elements,archiveFiles:zipFiles,existing:priorReviewInventory.converted});
        if(!vertebralInfo.candidates.length)
          throw Error('No exact whole-bone vertebral publisher representation found for private preview');
        for(const candidate of vertebralInfo.candidates){
          if(byName.has(candidate.atlasName))throw Error('Duplicate focus/vertebral catalog identity');
          byName.set(candidate.atlasName,candidate);
        }
      }
      mapped={...mapped,candidates:mapped.candidates.map(x=>byName.get(x.atlasName)||x)};
    }
  }
  if(reviewedFile){
    const approvedRoot=path.resolve(root,'local-data')+path.sep;
    const reviewedPath=path.resolve(reviewedFile);
    if(!reviewedPath.startsWith(approvedRoot)||!fs.realpathSync(reviewedPath).startsWith(approvedRoot))
      throw Error('Reviewed mapping file must remain in non-symlinked local-data');
    const reviewBytes=fs.readFileSync(reviewedPath);
    const reviews=JSON.parse(reviewBytes.toString('utf8'));
    mapped=applyReviewedSourceMappings(mapped,reviews,official,elements,zipFiles,archiveSha);
    for(const candidate of mapped.candidates)
      if(candidate.matchMethod==='explicit-reviewed-FMA-BP-FJ-not-clinically-validated')
        candidate.reviewManifestSHA256=sha(reviewBytes);
  }
  const plan=planBatch(mapped,{limit});
  if(!plan.eligible.length)throw new Error('No eligible official-source candidate structures; check source tables');
  const gaps=suggestForUnmatched(plan.gaps,official),converted=[],failed=[];
  const originalByName=new Map([
    ...(originalInventory?.converted||[]).map(x=>[x.name,{model:x,root:sourceBatch}]),
    ...(priorReviewInventory?.converted||[]).map(x=>[x.name,{model:x,root:priorReviewPath}])
  ]);
  let reused=0,resumedInterrupted=0;
  fs.mkdirSync(path.join(output,'structures'),{recursive:true});
  if(resumeExistingOutput){
    const structureRoot=path.join(output,'structures');
    if(fs.lstatSync(structureRoot).isSymbolicLink())
      throw Error('Symlinked interrupted GLB structure folder is forbidden');
    const planned=new Set(plan.eligible.map(item=>item.id));
    for(const entry of fs.readdirSync(structureRoot,{withFileTypes:true}))
      if(!entry.isDirectory()||entry.isSymbolicLink()||!planned.has(entry.name))
        throw Error('Unplanned, symlinked or non-directory model in interrupted private batch: '+entry.name);
  }
  const objCache=new Map();
  const readElement=item=>{
    if(objCache.has(item.fileId))return objCache.get(item.fileId);
    const bytes=execFileSync('unzip',['-p',archive,item.archivePath],{maxBuffer:MAX_OBJ});
    if(bytes.byteLength>MAX_OBJ)throw new Error('Single source OBJ exceeded 96MiB cap');
    const part={id:item.fileId,text:bytes.toString('utf8'),sha256:sha(bytes),zipEntry:item.archivePath};
    objCache.set(item.fileId,part);
    if(objCache.size>12)objCache.delete(objCache.keys().next().value);
    return part;
  };
  for(const [index,item] of plan.eligible.entries()){
    try{
      const cache=originalByName.get(item.name),cached=cache?.model;
      const stagedDir=path.join(output,'structures',item.id),
        stagedMesh=path.join(stagedDir,'model.glb'),
        stagedLineage=path.join(stagedDir,'lineage.json');
      const hasStagedMesh=resumeExistingOutput&&fs.existsSync(stagedMesh);
      const hasStagedLineage=resumeExistingOutput&&fs.existsSync(stagedLineage);
      if(hasStagedMesh!==hasStagedLineage)
        throw Error('Interrupted GLB/lineage pair is incomplete for '+item.name);
      if(hasStagedMesh&&hasStagedLineage){
        if(fs.lstatSync(stagedDir).isSymbolicLink()||
           fs.lstatSync(stagedMesh).isSymbolicLink()||
           fs.lstatSync(stagedLineage).isSymbolicLink())
          throw Error('Symlinked interrupted source GLB is forbidden: '+item.name);
        const bytes=fs.readFileSync(stagedMesh),
          lineage=JSON.parse(fs.readFileSync(stagedLineage,'utf8'));
        const sourceElements=item.source.sourceObjs;
        const byFj=new Map((lineage.elements||[]).map(x=>[x.id,x]));
        if(lineage.atlasCandidateName!==item.name||
           lineage.officialFMAId!==item.source.fmaId||
           lineage.officialRepresentationId!==item.source.bpId||
           lineage.atlasMappingMethod!==item.mappingMethod||
           lineage.sourceArchive!=='isa_BP3D_4.0_obj_99.zip'||
           lineage.archiveSHA256!==archiveSha||
           lineage.approvedForDistribution!==false||
           lineage.geometryAnatomyValidated!==false||
           lineage.registrationValidated!==false||
           lineage.coordinateFrame!=='native-official-OBJ'||
           lineage.generatedGLBSHA256!==sha(bytes)||
           byFj.size!==sourceElements.length||
           sourceElements.some(x=>byFj.get(x.fileId)?.zipEntry!==x.archivePath))
          throw Error('Interrupted GLB source identity/provenance mismatch: '+item.name);
        if(cached){
          if(cached.id!==item.id||cached.fmaId!==item.source.fmaId||
             cached.bpId!==item.source.bpId||
             cached.sourceMeshes!==sourceElements.length||
             cached.glbSha256!==lineage.generatedGLBSHA256)
            throw Error('Interrupted cached GLB differs from original audited model: '+item.name);
        }else{
          // For the 76 newly prepared GLBs, verify source FJ payload bytes
          // against the original ZIP, not only the generated GLB hash.
          for(const entry of sourceElements){
            const part=readElement(entry);
            if(byFj.get(entry.fileId)?.sha256!==part.sha256)
              throw Error('Source archive element was changed since interrupted conversion: '+item.name);
          }
          if(lineage.officialName!==item.source.officialName)
            throw Error('Interrupted source publisher name differs: '+item.name);
        }
        const doc=await new NodeIO().readBinary(bytes),
          geometry=summarizeGeometry(doc);
        verifyLineage({bytes,lineage,summary:geometry});
        if(cached){converted.push({...cached});reused++;}
        else{
          const catalogEntry=catalog[item.name],
            diagnostics=diagnoseGeometry(doc,geometry);
          converted.push({id:item.id,name:item.name,system:item.system,
            group:catalogEntry?.group||null,mappingMethod:item.mappingMethod,
            reviewManifestSHA256:item.reviewManifestSHA256,
            tissueClass:tissueClass({name:item.name,system:item.system,group:catalogEntry?.group}),
            fmaId:item.source.fmaId,bpId:item.source.bpId,
            triangles:geometry.triangles,vertices:geometry.vertices,
            sourceMeshes:geometry.sourceMeshes,boundsNative:geometry.boundsNative,
            diagnostics,glbSha256:lineage.generatedGLBSHA256,
            omittedZeroAreaTriangles:lineage.sourceGeometryWarnings?.omittedZeroAreaTriangles||0,
            modelPath:'./structures/'+item.id+'/model.glb',
            state:'converted-unverified'});
        }
        resumedInterrupted++;
      }else if(cached){
        if(cached.id!==item.id||cached.fmaId!==item.source.fmaId||cached.bpId!==item.source.bpId||
          cached.sourceMeshes!==item.source.sourceObjs.length||
          cached.modelPath!=='./structures/'+item.id+'/model.glb')
          throw Error('Cached original model identity differs: '+item.name);
        const sourceDir=path.join(cache.root,'structures',item.id),
          lineage=JSON.parse(fs.readFileSync(path.join(sourceDir,'lineage.json'),'utf8'));
        const required=item.source.sourceObjs.map(x=>x.fileId).sort(),
          found=(lineage.elements||[]).map(x=>x.id).sort();
        if(lineage.archiveSHA256!==archiveSha||lineage.generatedGLBSHA256!==cached.glbSha256||
          lineage.approvedForDistribution!==false||lineage.geometryAnatomyValidated!==false||
          required.length!==found.length||required.some((x,i)=>x!==found[i]))
          throw Error('Cached model lineage differs: '+item.name);
        const destDir=path.join(output,'structures',item.id);fs.mkdirSync(destDir,{recursive:true});
        fs.copyFileSync(path.join(sourceDir,'model.glb'),path.join(destDir,'model.glb'));
        fs.copyFileSync(path.join(sourceDir,'lineage.json'),path.join(destDir,'lineage.json'));
        converted.push({...cached});reused++;
      }else{
      const parts=item.source.sourceObjs.map(readElement);
      const lineage={schemaVersion:1,source:BP3D_OFFICIAL,atlasCandidateName:item.name,
        officialName:item.source.officialName,officialFMAId:item.source.fmaId,
        atlasMappingMethod:item.mappingMethod,reviewManifestSHA256:item.reviewManifestSHA256,
        officialRepresentationId:item.source.bpId,sourceArchive:'isa_BP3D_4.0_obj_99.zip',
        archiveSHA256:archiveSha,elements:parts.map(p=>({id:p.id,sha256:p.sha256,zipEntry:p.zipEntry})),
        coordinateFrame:'native-official-OBJ',registrationValidated:false,
        geometryAnatomyValidated:false,approvedForDistribution:false,
        warning:'Bulk candidate only: native frame, not CT/USG registered or cleared for release'};
      let bytes;
      try{
        // Preserve strict source-geometry behavior for every healthy mesh.
        bytes=await makeGlb(parts,item.name,lineage);
      }catch(error){
        if(error.message!=='Degenerate OBJ triangle')throw error;
        // A zero-area OBJ face cannot contribute a visible surface. Keep all
        // valid triangles, but disclose exactly which source FJ elements needed
        // this non-destructive normalization for subsequent anatomical review.
        const repairs=parts.map(part=>{
          const stats=readObjTriangles(part.text,{skipDegenerate:true}).stats;
          return {sourceElementId:part.id,omittedZeroAreaTriangles:stats.omittedDegenerateTriangles,
            validTriangles:stats.triangles};
        }).filter(x=>x.omittedZeroAreaTriangles);
        const omitted=repairs.reduce((n,x)=>n+x.omittedZeroAreaTriangles,0);
        if(!omitted)throw error;
        lineage.sourceGeometryWarnings={
          normalization:'zero-area OBJ triangles omitted, valid triangle positions retained',
          omittedZeroAreaTriangles:omitted,
          affectedSourceElements:repairs,
          requiresManualReview:true
        };
        bytes=await makeGlb(parts,item.name,lineage,{skipDegenerate:true});
      }
      lineage.generatedGLBSHA256=sha(bytes);
      const doc=await new NodeIO().readBinary(bytes);
      const geometry=summarizeGeometry(doc);
      const diagnostics=diagnoseGeometry(doc,geometry);
      verifyLineage({bytes,lineage,summary:geometry});
      const dir=path.join(output,'structures',item.id);fs.mkdirSync(dir,{recursive:true});
      fs.writeFileSync(path.join(dir,'model.glb'),bytes);
      fs.writeFileSync(path.join(dir,'lineage.json'),JSON.stringify(lineage,null,2)+'\n');
      const catalogEntry=catalog[item.name];
      converted.push({id:item.id,name:item.name,system:item.system,group:catalogEntry?.group||null,
        mappingMethod:item.mappingMethod,reviewManifestSHA256:item.reviewManifestSHA256,
        tissueClass:tissueClass({name:item.name,system:item.system,group:catalogEntry?.group}),
        fmaId:item.source.fmaId,bpId:item.source.bpId,
        triangles:geometry.triangles,vertices:geometry.vertices,
        sourceMeshes:geometry.sourceMeshes,boundsNative:geometry.boundsNative,
        diagnostics,
        glbSha256:lineage.generatedGLBSHA256,
        omittedZeroAreaTriangles:lineage.sourceGeometryWarnings?.omittedZeroAreaTriangles||0,
        modelPath:'./structures/'+item.id+'/model.glb',
        state:'converted-unverified'});
      }
    }catch(e){
      failed.push({name:item.name,system:item.system,id:item.id,error:String(e.message).slice(0,350),
        state:'conversion-error-not-promoted'});
    }
    if((index+1)%25===0||index+1===plan.eligible.length)
      console.log('Processed '+(index+1)+'/'+plan.eligible.length+
        ' eligible; generated '+converted.length+', failed '+failed.length);
  }
  const summary={...plan.summary,converted:converted.length,failed:failed.length,
    reusedBaselineModels:allSystemsExact?(originalInventory?.converted.length||0):focusShortlist?(originalInventory?.converted.length||0):reused,
    reusedPriorReviewModels:allSystemsExact?reused:focusShortlist?reused:0,
    resumedInterruptedModels:resumedInterrupted,
    allSystemsNewModels:allSystemsExact?converted.length-reused:0,
    vertebralNewModels:vertebralExact?converted.length-reused:0,
    focusedNewModels:focusShortlist?converted.length-reused:0,
    provisionalNewModels:provisional?converted.length-reused:0,
    candidatesWithOmittedZeroAreaTriangles:converted.filter(x=>x.omittedZeroAreaTriangles>0).length,
    totalOmittedZeroAreaTriangles:converted.reduce((n,x)=>n+x.omittedZeroAreaTriangles,0),
    candidatesWithGeometryFlags:converted.filter(x=>x.diagnostics.flags.length>0).length,
    unprocessedDueToLimit:plan.allEligible-plan.eligible.length};
  const referenceSurface=await buildReferenceSkin({official,elements,zipFiles,archive,archiveSha,output});
  const manifest={schemaVersion:1,kind:'official-bp3d-bulk-source-review',source:BP3D_OFFICIAL,
    provisionalSource:provisional,allSystemsExactSourcePreview:allSystemsExact,
    allSystemsSourceSelection:allSystemsExact?allSystemsInfo.summary:null,
    focusedSourcePreview:focusShortlist,
    vertebralSourcePreview:vertebralExact,
    vertebralSourceSelection:vertebralExact?vertebralInfo.summary:null,
    focusedSourceSelection:focusShortlist?focusInfo.summary:null,
    provisionalSelection:provisionalSelectionReport({
      provisional,allSystemsExact,provisionalInfo,includePromising,limitNew}),
    sourceHashes:{namesSha256:sha(namesBytes),elementsSha256:sha(elementBytes),
      archiveSha256:archiveSha},summary,systems:plan.systems,
    converted,referenceSurface,failures:failed,legalStatus:'NOT-CLEARED',
    sourceRightsReview:'BLOCKED: downloaded OBJ headers say CC BY-SA 2.1 Japan; current DBCLS license page says CC BY 4.0. Reconcile terms for exact archive before uploading any GLB.',
    geometryRegisteredToMEDCOEL:false,approvedForCommercialDistribution:false};
  const mapping=reconcileMapping({gaps:plan.gaps,officialRows:official,converted,
    elementIndex:elements,archiveFiles:zipFiles});
  mapping.report.sourceHashes=manifest.sourceHashes;
  mapping.report.catalogCount=plan.summary.catalogCount;
  mapping.report.directConvertedCount=converted.length;
  fs.writeFileSync(path.join(output,'inventory.json'),JSON.stringify(manifest,null,2)+'\n');
  if(allSystemsExact){
    // Transparent decisions for EVERY catalogue gap, including source conflicts
    // and missing official OBJ. None of these implies clinical validity.
    fs.writeFileSync(path.join(output,'all-systems-source-review.json'),
      JSON.stringify({status:allSystemsInfo.status,
        summary:allSystemsInfo.summary,bySystem:allSystemsInfo.bySystem,
        candidates:allSystemsInfo.candidates.map(x=>({
          atlasName:x.atlasName,system:x.atlasSystem,
          officialName:x.matches[0].officialName,
          fmaId:x.matches[0].fmaId,bpId:x.matches[0].bpId,
          fjIds:x.matches[0].elementFileIds,
          clinicalIdentityValidated:false,approvedForDistribution:false
        })),rejected:allSystemsInfo.rejected},null,2)+'\n');
  }
  if(vertebralExact){
    // Private, human-readable reasons for every skipped level. No clearance.
    fs.writeFileSync(path.join(output,'vertebral-source-review.json'),
      JSON.stringify({status:'EXACT_BONE_SOURCE_REVIEW_UNAPPROVED',
        summary:vertebralInfo.summary,
        candidates:vertebralInfo.candidates.map(x=>({atlasName:x.atlasName,
          officialName:x.matches[0].officialName,
          fmaId:x.matches[0].fmaId,bpId:x.matches[0].bpId,
          fjIds:x.matches[0].elementFileIds,
          approvedForDistribution:false,clinicalIdentityValidated:false})),
        rejected:vertebralInfo.rejected},null,2)+'\n');
  }
  fs.writeFileSync(path.join(output,'mapping-gaps.json'),
    JSON.stringify({schemaVersion:1,unmatchedCount:gaps.length,gaps},null,2)+'\n');
  fs.writeFileSync(path.join(output,'mapping-review.json'),JSON.stringify(mapping.report,null,2)+'\n');
  fs.writeFileSync(path.join(output,'mapping-review.csv'),mapping.csv);
  fs.writeFileSync(path.join(output,'index.html'),buildBulkHTML());
  fs.writeFileSync(path.join(output,'body.html'),buildCompositeHTML());
  fs.copyFileSync(fileURLToPath(new URL('./bp3d-coordinate-frame.mjs',import.meta.url)),
    path.join(output,'coordinate-frame.js'));
  fs.copyFileSync(fileURLToPath(new URL('./bp3d-review-materials.mjs',import.meta.url)),
    path.join(output,'review-materials.js'));
  const threeRoot=path.join(root,'apps/4d-lab/node_modules/three');
  const target=path.join(output,'vendor/three');
  for(const name of ['build/three.module.js','build/three.core.js','LICENSE']){
    const src=path.join(threeRoot,name),dest=path.join(target,name);
    if(!fs.existsSync(src))throw new Error('Run npm ci --prefix apps/4d-lab to install Three.js');
    fs.mkdirSync(path.dirname(dest),{recursive:true});fs.copyFileSync(src,dest);
  }
  fs.cpSync(path.join(threeRoot,'examples/jsm'),path.join(target,'examples/jsm'),{recursive:true});
  console.log(JSON.stringify({summary,reviewRoot:output,preview:'index.html',
    publicModelsChanged:false,CTUSGChanged:false,commercialReleaseApproved:false},null,2));
  return manifest;
}
function parseArgs(argv){
  let all=false,limit,reviewedFile,provisional=false,includePromising=false,limitNew=100,focusShortlist=false,vertebralExact=false,allSystemsExact=false;
  for(let i=0;i<argv.length;i++){
    if(argv[i]==='--all')all=true;
    else if(argv[i]==='--limit'&&argv[i+1]&&/^\d+$/.test(argv[i+1]))limit=Number(argv[++i]);
    else if(argv[i]==='--reviewed'&&argv[i+1])reviewedFile=argv[++i];
    else if(argv[i]==='--provisional')provisional=true;
    else if(argv[i]==='--focus-shortlist')focusShortlist=true;
    else if(argv[i]==='--vertebral-exact')vertebralExact=true;
    else if(argv[i]==='--all-systems-exact')allSystemsExact=true;
    else if(argv[i]==='--include-promising')includePromising=true;
    else if(argv[i]==='--limit-new'&&argv[i+1]&&/^\d+$/.test(argv[i+1]))limitNew=Number(argv[++i]);
    else throw new Error('Usage: batch-bp3d-candidates.mjs --all OR --limit <positive integer>');
  }
  if(all===(limit!==undefined)||limit!==undefined&&(!Number.isSafeInteger(limit)||limit<1||limit>1000))
    throw new Error('Specify exactly --all or --limit N (1 to 1000)');
  if((includePromising||limitNew!==100)&&!provisional)throw Error('Provisional options require --provisional');
  return {limit,reviewedFile,provisional,includePromising,limitNew,focusShortlist,vertebralExact,allSystemsExact};
}
if(process.argv[1]===fileURLToPath(import.meta.url)){
  try{await runBatch(parseArgs(process.argv.slice(2)));}
  catch(e){console.error(e.stack||e);process.exitCode=1;}
}
