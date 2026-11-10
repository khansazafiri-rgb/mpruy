// Independent interactive local review: never writes any publicly served model/UI/CT.
import fs from 'node:fs';
import path from 'node:path';
import {createHash} from 'node:crypto';
import {fileURLToPath} from 'node:url';
import {NodeIO} from '@gltf-transform/core';

const ROOT=fileURLToPath(new URL('../../../',import.meta.url));
const PRIVATE=path.join(ROOT,'local-data/licensing-quarantine/bp3d-candidates');
const hash=x=>createHash('sha256').update(x).digest('hex');
const safe=n=>typeof n==='string'&&/^[A-Za-z0-9][A-Za-z0-9. _()-]{0,100}$/.test(n)&&
  n.trim()===n&&!n.includes('..')&&!/[\/\\]/.test(n);

export function summarizeGeometry(doc) {
  const min=[Infinity,Infinity,Infinity],max=[-Infinity,-Infinity,-Infinity];
  let triangles=0,vertices=0,primitives=0;
  const meshes=[];
  for(const mesh of doc.getRoot().listMeshes()){
    let meshTriangles=0,meshVertices=0;
    for(const prim of mesh.listPrimitives()){
      const position=prim.getAttribute('POSITION'),indices=prim.getIndices();
      if(!position)throw new Error('Primitive has no POSITION');
      const n=position.getCount(),samples=indices?indices.getCount():n;
      if(!n||samples%3)throw new Error('Invalid triangle primitive');
      const xyz=[0,0,0];
      for(let i=0;i<n;i++){
        position.getElement(i,xyz);
        if(!xyz.every(Number.isFinite))throw new Error('Nonfinite source vertex');
        for(let k=0;k<3;k++){min[k]=Math.min(min[k],xyz[k]);max[k]=Math.max(max[k],xyz[k]);}
      }
      const count=samples/3;
      triangles+=count;vertices+=n;meshTriangles+=count;meshVertices+=n;primitives++;
    }
    meshes.push({elementId:mesh.getName(),triangles:meshTriangles,vertices:meshVertices});
  }
  if(!triangles||min.some(v=>!Number.isFinite(v)))throw new Error('Empty source geometry');
  const span=max.map((v,i)=>v-min[i]),center=min.map((v,i)=>(v+max[i])/2);
  if(span.every(v=>v<1e-9))throw new Error('Zero-extent source geometry');
  return {sourceMeshes:meshes.length,triangles,vertices,primitives,meshes,
    boundsNative:{min,max,span,center}};
}
export function verifyLineage({bytes,lineage,summary}){
  if(!lineage||lineage.approvedForDistribution!==false||
     lineage.geometryAnatomyValidated!==false||lineage.registrationValidated!==false)
    throw new Error('Source lineage must explicitly remain unapproved');
  if(hash(bytes)!==lineage.generatedGLBSHA256)throw new Error('Changed GLB bytes since conversion');
  if(!lineage.officialFMAId||!lineage.officialRepresentationId||!lineage.elements?.length)
    throw new Error('Missing official FMA/BP/FJ source IDs');
  const expected=new Set(lineage.elements.map(x=>x.id));
  if(expected.size!==lineage.elements.length||summary.meshes.length!==expected.size||
     summary.meshes.some(x=>!expected.has(x.elementId)))
    throw new Error('Geometry mesh IDs differ from the source FJ lineage');
  return {bytesMatchLineage:true,sourceElementIdsMatch:true,readyForAnatomicalReview:true,
    registrationVerified:false,commercialReleaseApproved:false};
}
export function reviewHTML(name,summary) {
  const data=JSON.stringify({name,triangles:summary.triangles,
    sourceMeshes:summary.sourceMeshes,span:summary.boundsNative.span}).replace(/</g,'\\u003c');
  return [
    '<!doctype html><html lang="en"><head><meta charset="utf-8"/>',
    '<meta name="viewport" content="width=device-width,initial-scale=1"/>',
    '<title>BodyParts3D source preview — local review only</title>',
    '<style>*{box-sizing:border-box}body{margin:0;background:#111b21;color:#ebf5f4;font:14px system-ui}header{padding:14px;background:#183039;display:flex;flex-wrap:wrap;align-items:center;gap:12px}strong{color:#96eab9}button{background:#245367;color:#fff;border:1px solid #416f80;padding:7px 13px;border-radius:6px;cursor:pointer}#viewer{height:calc(100vh - 120px);width:100%}footer{padding:12px;background:#1b2c32;color:#ffd59e}</style>',
    '<script type="importmap">{"imports":{"three":"./vendor/three/build/three.module.js","three/addons/":"./vendor/three/examples/jsm/"}}</script>',
    '</head><body><header><strong>Official BodyParts3D 4.0 • Independent review</strong>',
    '<span id="title"></span><span id="count"></span>',
    '<label><input type="checkbox" id="wire"/> Wireframe</label><button id="reset">Reset camera</button>',
    '<span id="status">Loading model…</span></header><div id="viewer"></div>',
    '<footer>UNAPPROVED SOURCE CANDIDATE • Native units and axes • Not patient-registered • Not for commercial release.</footer>',
    '<script type="module">',
    "import * as THREE from 'three';",
    "import {OrbitControls} from 'three/addons/controls/OrbitControls.js';",
    "import {GLTFLoader} from 'three/addons/loaders/GLTFLoader.js';",
    'const data='+data+';',
    "document.getElementById('title').textContent=data.name;",
    "document.getElementById('count').textContent=data.sourceMeshes+' elements, '+data.triangles+' triangles';",
    "const root=document.getElementById('viewer'),scene=new THREE.Scene();scene.background=new THREE.Color(0x111b21);",
    "const camera=new THREE.PerspectiveCamera(45,1,.001,10000);",
    "const renderer=new THREE.WebGLRenderer({antialias:true,powerPreference:'low-power'});",
    "renderer.setPixelRatio(Math.min(devicePixelRatio||1,1.5));root.appendChild(renderer.domElement);",
    "scene.add(new THREE.HemisphereLight(0xffffff,0x41505b,2));",
    "const light=new THREE.DirectionalLight(0xffffff,2);light.position.set(1,2,2);scene.add(light);",
    "const controls=new OrbitControls(camera,renderer.domElement);controls.enableDamping=true;",
    "let reset=()=>{},meshes=[];",
    "function resize(){const w=Math.max(100,root.clientWidth),h=Math.max(100,root.clientHeight);renderer.setSize(w,h,false);camera.aspect=w/h;camera.updateProjectionMatrix();}",
    "new ResizeObserver(resize).observe(root);resize();",
    "document.getElementById('wire').addEventListener('change',e=>meshes.forEach(m=>m.material.wireframe=e.target.checked));",
    "document.getElementById('reset').addEventListener('click',()=>reset());",
    "new GLTFLoader().load('./model.glb',data=>{scene.add(data.scene);",
    "data.scene.traverse(x=>{if(x.isMesh){x.material=x.material.clone();meshes.push(x);}});",
    "const box=new THREE.Box3().setFromObject(data.scene),c=box.getCenter(new THREE.Vector3()),size=box.getSize(new THREE.Vector3()),r=Math.max(.01,size.length()/2);",
    "reset=()=>{controls.target.copy(c);camera.near=Math.max(.00001,r/1000);camera.far=r*100;camera.position.copy(c).add(new THREE.Vector3(r*1.5,r*1.2,r*2.6));camera.updateProjectionMatrix();controls.update();};",
    "reset();document.getElementById('status').textContent='Ready: orbit/zoom to inspect source mesh';",
    "},undefined,e=>document.getElementById('status').textContent='Load failed: '+e.message);",
    'function render(){requestAnimationFrame(render);controls.update();renderer.render(scene,camera);}render();',
    '</script></body></html>'
  ].join('\n');
}
export async function buildReview(name,{root=ROOT,privateRoot=PRIVATE}={}){
  if(!safe(name))throw new Error('Invalid structure name');
  const folder=path.resolve(privateRoot,name.replace(/[^A-Za-z0-9._-]/g,'_'));
  if(!folder.startsWith(path.resolve(root,'local-data')+path.sep)||
     !folder.startsWith(path.resolve(privateRoot)+path.sep))
    throw new Error('Review outputs must remain in quarantined local-data');
  const bytes=fs.readFileSync(path.join(folder,'model.glb'));
  const lineage=JSON.parse(fs.readFileSync(path.join(folder,'lineage.json'),'utf8'));
  if(lineage.atlasCandidateName!==name)throw new Error('Structure mismatch');
  const doc=await new NodeIO().readBinary(new Uint8Array(bytes));
  const summary=summarizeGeometry(doc);
  const checks=verifyLineage({bytes,lineage,summary});
  const result={kind:'source-geometry-review-not-approval',structure:name,
    modelSha256:hash(bytes),geometry:summary,checks,
    patientCoordinateRegistration:false,anatomicalReviewPassed:false,
    safeToReplaceCurrentMEDCOELModels:false};
  const vendorRoot=path.join(root,'apps/4d-lab/node_modules/three');
  const target=path.join(folder,'vendor/three');
  for(const filename of ['build/three.module.js','build/three.core.js','LICENSE']){
    const src=path.join(vendorRoot,filename),dest=path.join(target,filename);
    if(!fs.existsSync(src))throw new Error('Run npm ci --prefix apps/4d-lab first');
    fs.mkdirSync(path.dirname(dest),{recursive:true});fs.copyFileSync(src,dest);
  }
  const addons=path.join(vendorRoot,'examples/jsm');
  if(!fs.existsSync(addons))throw new Error('Three.js addons missing');
  fs.cpSync(addons,path.join(target,'examples/jsm'),{recursive:true});
  fs.writeFileSync(path.join(folder,'geometry-review.json'),JSON.stringify(result,null,2)+'\n');
  fs.writeFileSync(path.join(folder,'review.html'),reviewHTML(name,summary));
  return {folder,triangles:summary.triangles,sourceMeshes:summary.sourceMeshes,
    reviewHTML:'review.html',reviewJSON:'geometry-review.json',
    publicModelReplaced:false,clinicalRegistrationVerified:false};
}
if(process.argv[1]===fileURLToPath(import.meta.url)){
  const argv=process.argv.slice(2);
  if(argv.length!==2||argv[0]!=='--structure'){console.error('Usage: node review-bp3d-candidate.mjs --structure Femur.l');process.exitCode=2;}
  else try{console.log(JSON.stringify(await buildReview(argv[1]),null,2));}
    catch(e){console.error(e.message);process.exitCode=1;}
}
