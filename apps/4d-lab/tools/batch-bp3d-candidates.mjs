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
      eligible.push({name:item.atlasName,system:item.atlasSystem,id:safeStructureId(item.atlasName),source:match});
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
export async function runBatch({root=ROOT,sourceDir=SOURCE,outputDir=DEST,limit}={}){
  const output=allowed(root,outputDir);
  const namesPath=path.join(sourceDir,'isa_parts_list_e.txt'),
    elementsPath=path.join(sourceDir,'isa_element_parts.txt'),
    archive=path.join(sourceDir,'isa_BP3D_4.0_obj_99.zip');
  const namesBytes=fs.readFileSync(namesPath),elementBytes=fs.readFileSync(elementsPath);
  const official=parseOfficialNames(namesBytes.toString('utf8'));
  const elements=parseOfficialElements(elementBytes.toString('utf8'));
  const zipFiles=listZip(archive),archiveSha=await hashFile(archive);
  const catalog=JSON.parse(fs.readFileSync(path.join(root,'apps/anatomy/public/data/atlas-catalog.json'),'utf8'));
  const mapped=mapActualMeshFiles(candidateCrosswalk(catalog,official),elements,zipFiles);
  const plan=planBatch(mapped,{limit});
  if(!plan.eligible.length)throw new Error('No eligible official-source candidate structures; check source tables');
  const gaps=suggestForUnmatched(plan.gaps,official),converted=[],failed=[];
  fs.mkdirSync(path.join(output,'structures'),{recursive:true});
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
      const parts=item.source.sourceObjs.map(readElement);
      const lineage={schemaVersion:1,source:BP3D_OFFICIAL,atlasCandidateName:item.name,
        officialName:item.source.officialName,officialFMAId:item.source.fmaId,
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
        tissueClass:tissueClass({name:item.name,system:item.system,group:catalogEntry?.group}),
        fmaId:item.source.fmaId,bpId:item.source.bpId,
        triangles:geometry.triangles,vertices:geometry.vertices,
        sourceMeshes:geometry.sourceMeshes,boundsNative:geometry.boundsNative,
        diagnostics,
        glbSha256:lineage.generatedGLBSHA256,
        omittedZeroAreaTriangles:lineage.sourceGeometryWarnings?.omittedZeroAreaTriangles||0,
        modelPath:'./structures/'+item.id+'/model.glb',
        state:'converted-unverified'});
    }catch(e){
      failed.push({name:item.name,system:item.system,id:item.id,error:String(e.message).slice(0,350),
        state:'conversion-error-not-promoted'});
    }
    if((index+1)%25===0||index+1===plan.eligible.length)
      console.log('Processed '+(index+1)+'/'+plan.eligible.length+
        ' eligible; generated '+converted.length+', failed '+failed.length);
  }
  const summary={...plan.summary,converted:converted.length,failed:failed.length,
    candidatesWithOmittedZeroAreaTriangles:converted.filter(x=>x.omittedZeroAreaTriangles>0).length,
    totalOmittedZeroAreaTriangles:converted.reduce((n,x)=>n+x.omittedZeroAreaTriangles,0),
    candidatesWithGeometryFlags:converted.filter(x=>x.diagnostics.flags.length>0).length,
    unprocessedDueToLimit:plan.allEligible-plan.eligible.length};
  const referenceSurface=await buildReferenceSkin({official,elements,zipFiles,archive,archiveSha,output});
  const manifest={schemaVersion:1,kind:'official-bp3d-bulk-source-review',source:BP3D_OFFICIAL,
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
  let all=false,limit;
  for(let i=0;i<argv.length;i++){
    if(argv[i]==='--all')all=true;
    else if(argv[i]==='--limit'&&argv[i+1]&&/^\d+$/.test(argv[i+1]))limit=Number(argv[++i]);
    else throw new Error('Usage: batch-bp3d-candidates.mjs --all OR --limit <positive integer>');
  }
  if(all===(limit!==undefined)||limit!==undefined&&(!Number.isSafeInteger(limit)||limit<1||limit>1000))
    throw new Error('Specify exactly --all or --limit N (1 to 1000)');
  return {limit};
}
if(process.argv[1]===fileURLToPath(import.meta.url)){
  try{await runBatch(parseArgs(process.argv.slice(2)));}
  catch(e){console.error(e.stack||e);process.exitCode=1;}
}
