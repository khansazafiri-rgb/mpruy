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
import {makeGlb} from './build-bp3d-candidate.mjs';
import {summarizeGeometry,verifyLineage} from './review-bp3d-candidate.mjs';

const ROOT=fileURLToPath(new URL('../../../',import.meta.url));
const PRIVATE=path.join(ROOT,'local-data','licensing-quarantine');
const SOURCE=path.join(PRIVATE,'bp3d-4.0');
const DEST=path.join(PRIVATE,'bp3d-batch');
const MAX_OBJ=96*1024*1024;
const sha=data=>createHash('sha256').update(data).digest('hex');
const tokenise=name=>normalizeAnatomyName(name).split(' ').filter(Boolean);
const general=new Set(['of','the','and','part','branch','left','right','anterior','posterior','inferior','superior']);

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
export function buildBulkHTML(){
  return [
    '<!doctype html><html lang="en"><head><meta charset="utf-8"/><meta name="viewport" content="width=device-width,initial-scale=1"/>',
    '<title>BodyParts3D bulk geometry review — local only</title>',
    '<style>*{box-sizing:border-box}body{margin:0;background:#10191f;color:#e8f3f1;font:14px system-ui;overflow:hidden}',
    'header{height:66px;background:#1a333b;display:flex;align-items:center;gap:12px;padding:10px 16px;flex-wrap:wrap}',
    'strong{color:#a9edc9}#layout{display:flex;height:calc(100dvh - 110px)}',
    'aside{width:290px;flex:none;background:#15262d;padding:12px;overflow:auto}aside input,aside select{width:100%;margin-bottom:10px;padding:9px;border-radius:5px;background:#213840;color:white;border:1px solid #4d737f}',
    'aside button{display:block;width:100%;border:0;background:none;color:#b7d8df;text-align:left;padding:8px;border-bottom:1px solid #2c3d46;cursor:pointer}',
    'aside button:hover,aside button:focus{background:#2b5058;color:#fff}main{min-width:0;flex:1;position:relative;overflow:hidden}#canvas{width:100%;height:100%}canvas{display:block}',
    '#metrics{position:absolute;bottom:12px;left:12px;background:#0b1a1ddc;padding:11px;border-radius:7px;max-width:min(640px,90%);pointer-events:none}',
    'footer{background:#263238;padding:11px 15px;color:#ffce90;height:44px}',
    '@media(max-width:700px){header{height:auto;min-height:66px}#layout{height:calc(100dvh - 160px)}aside{width:150px;padding:6px}aside button{font-size:11px}footer{height:auto}}',
    '</style><script type="importmap">{"imports":{"three":"./vendor/three/build/three.module.js","three/addons/":"./vendor/three/examples/jsm/"}}</script>',
    '</head><body><header><strong>Official BodyParts3D 4.0 • Batch review</strong>',
    '<span id="summary">Loading inventory…</span><label><input id="wire" type="checkbox"/> Wireframe</label>',
    '<button id="reset">Reset camera</button><span id="status"></span></header>',
    '<div id="layout"><aside><input id="search" type="search" placeholder="Find structure…"/><select id="system"><option value="">All systems</option></select><div id="items"></div></aside>',
    '<main><div id="canvas"></div><div id="metrics">Select a candidate</div></main></div>',
    '<footer>NOT FOR PUBLIC RELEASE • Source model coordinates not registered to MEDCOEL CT/USG • No current assets are replaced.</footer>',
    '<script type="module">',
    "import * as THREE from 'three';",
    "import {OrbitControls} from 'three/addons/controls/OrbitControls.js';",
    "import {GLTFLoader} from 'three/addons/loaders/GLTFLoader.js';",
    "const root=document.getElementById('canvas'),scene=new THREE.Scene();scene.background=new THREE.Color(0x10191f);",
    "const cam=new THREE.PerspectiveCamera(45,1,.001,1e6),ren=new THREE.WebGLRenderer({antialias:true,powerPreference:'low-power'});",
    "ren.setPixelRatio(Math.min(window.devicePixelRatio||1,1.5));root.appendChild(ren.domElement);",
    "scene.add(new THREE.HemisphereLight(0xffffff,0x405967,2.2));",
    "const sun=new THREE.DirectionalLight(0xffffff,1.8);sun.position.set(1,2,3);scene.add(sun);",
    "const control=new OrbitControls(cam,ren.domElement);control.enableDamping=true;",
    "let current=null,models=[],generation=0,reset=()=>{},entries=[];",
    "function resize(){let w=Math.max(100,root.clientWidth),h=Math.max(100,root.clientHeight);ren.setSize(w,h,true);cam.aspect=w/h;cam.updateProjectionMatrix();}",
    "new ResizeObserver(resize).observe(root);resize();",
    "document.getElementById('wire').addEventListener('change',e=>models.forEach(m=>{const mat=m.material;if(Array.isArray(mat))mat.forEach(x=>x.wireframe=e.target.checked);else mat.wireframe=e.target.checked;}));",
    "document.getElementById('reset').addEventListener('click',()=>reset());",
    "function select(entry){const attempt=++generation;document.getElementById('status').textContent='Loading '+entry.name+'…';",
    "new GLTFLoader().load(entry.modelPath,g=>{if(attempt!==generation)return;",
    "if(current){scene.remove(current);current.traverse(x=>{if(x.isMesh){x.geometry.dispose();if(Array.isArray(x.material))x.material.forEach(m=>m.dispose());else x.material.dispose();}})}",
    "current=g.scene;models=[];scene.add(current);current.traverse(x=>{if(x.isMesh){x.material=x.material.clone();models.push(x);}});",
    "const box=new THREE.Box3().setFromObject(current),size=box.getSize(new THREE.Vector3()),center=box.getCenter(new THREE.Vector3()),r=Math.max(.01,size.length()/2);",
    "reset=()=>{control.target.copy(center);cam.near=Math.max(.00001,r/1000);cam.far=Math.max(100,r*100);cam.position.copy(center).add(new THREE.Vector3(r*1.4,r*1.2,r*2.6));cam.updateProjectionMatrix();control.update();};reset();",
    "document.getElementById('metrics').textContent=entry.name+' • '+entry.system+' • '+entry.triangles+' triangles • '+entry.sourceMeshes+' FJ elements • FMA '+entry.fmaId+' • Unvalidated coordinate frame';",
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
      const bytes=await makeGlb(parts,item.name,lineage);
      lineage.generatedGLBSHA256=sha(bytes);
      const doc=await new NodeIO().readBinary(bytes);
      const geometry=summarizeGeometry(doc);
      verifyLineage({bytes,lineage,summary:geometry});
      const dir=path.join(output,'structures',item.id);fs.mkdirSync(dir,{recursive:true});
      fs.writeFileSync(path.join(dir,'model.glb'),bytes);
      fs.writeFileSync(path.join(dir,'lineage.json'),JSON.stringify(lineage,null,2)+'\n');
      converted.push({id:item.id,name:item.name,system:item.system,
        fmaId:item.source.fmaId,bpId:item.source.bpId,
        triangles:geometry.triangles,vertices:geometry.vertices,
        sourceMeshes:geometry.sourceMeshes,boundsNative:geometry.boundsNative,
        glbSha256:lineage.generatedGLBSHA256,modelPath:'./structures/'+item.id+'/model.glb',
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
    unprocessedDueToLimit:plan.allEligible-plan.eligible.length};
  const manifest={schemaVersion:1,kind:'official-bp3d-bulk-source-review',source:BP3D_OFFICIAL,
    sourceHashes:{namesSha256:sha(namesBytes),elementsSha256:sha(elementBytes),
      archiveSha256:archiveSha},summary,systems:plan.systems,
    converted,failures:failed,legalStatus:'NOT-CLEARED',
    geometryRegisteredToMEDCOEL:false,approvedForCommercialDistribution:false};
  fs.writeFileSync(path.join(output,'inventory.json'),JSON.stringify(manifest,null,2)+'\n');
  fs.writeFileSync(path.join(output,'mapping-gaps.json'),
    JSON.stringify({schemaVersion:1,unmatchedCount:gaps.length,gaps},null,2)+'\n');
  fs.writeFileSync(path.join(output,'index.html'),buildBulkHTML());
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
