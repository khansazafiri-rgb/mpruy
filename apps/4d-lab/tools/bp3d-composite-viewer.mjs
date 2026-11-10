// Independent OFF-PRODUCTION review page. Uses only official converted BodyParts3D
// candidates and existing MIT Three.js; never imports the legacy Atlas viewer.
export function buildCompositeHTML() {
  return String.raw`<!doctype html>
<html lang="en">
<head>
<meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1">
<title>MEDCOEL · BodyParts3D composite body review (not released)</title>
<style>
:root{color-scheme:dark;font-family:Inter,system-ui,-apple-system,sans-serif;background:#0d171a;color:#e8f4ed}
*{box-sizing:border-box}body{margin:0;min-height:100dvh;display:flex;flex-direction:column}
header{display:flex;gap:14px;align-items:center;padding:12px 18px;background:#14352d;border-bottom:1px solid #376351;flex-wrap:wrap}
h1{font-size:19px;margin:0;color:#bcecc9}header small{color:#c1dacf}
header a{color:#a8ead7}#workspace{display:flex;flex:1;min-height:0}
aside{width:305px;flex:none;background:#112724;border-right:1px solid #335a4e;overflow:auto;padding:16px;max-height:calc(100dvh - 94px)}
h2{font-size:15px;margin:10px 0}p,.muted{color:#b4cdc2;font-size:12px;line-height:1.5}
.system{display:flex;align-items:center;gap:9px;padding:9px 2px;border-bottom:1px solid #28463b}
.system input{width:17px;height:17px;accent-color:#8ddcb2}
.system span{flex:1}.count{font-size:12px;color:#99c3ae}
button,select,input[type=search]{color:#e6f4ed;background:#24483d;border:1px solid #51806b;border-radius:7px;padding:9px}
button{cursor:pointer}button:hover,button:focus-visible{background:#376452}button:disabled{opacity:.5;cursor:not-allowed}
select,input[type=search]{width:100%;margin:7px 0}
#viewport{position:relative;flex:1;min-width:0;min-height:360px}
#canvas{position:absolute;inset:0}#canvas canvas{display:block;width:100%;height:100%}
#hud{position:absolute;left:14px;bottom:14px;max-width:min(480px,90%);background:#07140edb;padding:12px;border:1px solid #466d59;border-radius:9px;pointer-events:none;font-size:12px}
#badge{font-size:12px;padding:7px;background:#59441b;border:1px solid #8c7248;border-radius:7px}
#searchResults{max-height:180px;overflow:auto}#searchResults button{width:100%;display:block;text-align:left;margin:3px 0;overflow-wrap:anywhere}
#alpha{width:100%;accent-color:#95dcac}
#status{min-height:18px;color:#f6dfa3;font-size:12px}
footer{padding:7px 14px;background:#1b302b;color:#d9c598;font-size:11px}
@media(max-width:700px){#workspace{flex-direction:column-reverse}aside{max-height:37dvh;width:100%;border-right:0;border-top:1px solid #335a4e}#viewport{min-height:45dvh}header{padding:8px}footer{font-size:10px}}
</style>
<script type="importmap">{"imports":{"three":"./vendor/three/build/three.module.js","three/addons/":"./vendor/three/examples/jsm/"}}</script>
</head>
<body>
<header>
<h1>MEDCOEL · 3D Body Assembly</h1>
<small>Official BodyParts3D 4.0 · independent review</small>
<a href="./index.html">Single structure viewer</a>
<div id="badge">REVIEW ONLY · not a complete validated human body</div>
</header>
<div id="workspace">
<aside>
<h2>Anatomical systems</h2><p>Models retain their original shared source coordinates. Turn on systems to assemble them in one scene. The catalog is incomplete and not CT/USG registered.</p>
<div id="systems"></div>
<div style="display:flex;gap:8px;margin:12px 0"><button id="fit">Fit visible anatomy</button><button id="clear">Bones only</button></div>
<div style="display:flex;gap:5px;flex-wrap:wrap" aria-label="Anatomical camera presets"><button data-view="front">Anterior</button><button data-view="side">Patient left</button><button data-view="back">Posterior</button></div>
<label style="display:flex;gap:8px;align-items:center;margin:12px 0"><input type="checkbox" id="skin" checked> Official skin reference (translucent)</label>
<label for="color">Color scheme</label><select id="color"><option value="tissue">Tissue classes (consistent)</option><option value="system">Anatomical systems</option><option value="neutral">Neutral source review</option></select>
<label for="alpha">Opacity of visible systems: <span id="alphaLabel">100%</span></label><input id="alpha" type="range" min="20" max="100" step="5" value="100">
<label style="display:flex;gap:8px;align-items:center"><input type="checkbox" id="contrast"> High contrast</label>
<label style="display:flex;gap:8px;align-items:center"><input type="checkbox" id="wire"> Wireframe</label>
<h2>Find and focus a structure</h2>
<input id="search" type="search" placeholder="Search among converted structures" autocomplete="off">
<div id="searchResults"></div>
<p id="status">Loading official inventory…</p>
<p><strong>BodyParts3D, © The Database Center for Life Science</strong>. <a href="https://dbarchive.biosciencedbc.jp/en/bodyparts3d/lic.html" style="color:#a8ead7">Current license page</a> says CC BY 4.0; downloaded OBJ header says CC BY-SA 2.1 Japan. Rights review required before any upload. Color is illustrative.</p>
</aside>
<main id="viewport"><div id="canvas"></div>
<div id="hud"><strong id="progress">Waiting for inventory</strong>
<div class="muted" id="details">Raw FMA/FJ geometry only. No inferred missing anatomy, no asset promotion, no patient-registration claim.</div></div>
</main>
</div>
<footer>NOT FOR PUBLIC RELEASE · No legacy Atlas models or viewer code · Not validated against MEDCOEL CT or ultrasound · No production assets replaced.</footer>
<script type="module">
import * as THREE from 'three';
import {OrbitControls} from 'three/addons/controls/OrbitControls.js';
import {GLTFLoader} from 'three/addons/loaders/GLTFLoader.js';
import {materialFor} from './review-materials.js';
import {SOURCE_TO_WORLD} from './coordinate-frame.js';
const $=id=>document.getElementById(id);
const scene=new THREE.Scene();scene.background=new THREE.Color(0x0d171a);
const anatomy=new THREE.Group();anatomy.name='BodyParts3D source to display';
anatomy.rotation.x=SOURCE_TO_WORLD.rotationX;anatomy.scale.setScalar(SOURCE_TO_WORLD.scale);scene.add(anatomy);
const cam=new THREE.PerspectiveCamera(45,1,0.001,1e7);
const renderer=new THREE.WebGLRenderer({antialias:true,powerPreference:'low-power'});
renderer.setPixelRatio(Math.min(devicePixelRatio||1,1.5));
renderer.toneMapping=THREE.ACESFilmicToneMapping;renderer.toneMappingExposure=1.2;
$('canvas').appendChild(renderer.domElement);
const hemi=new THREE.HemisphereLight(0xf5fff0,0x334c48,1.35);scene.add(hemi);
const key=new THREE.DirectionalLight(0xfff3e1,2.4);key.position.set(1.5,2.5,3);scene.add(key);
const rim=new THREE.DirectionalLight(0xa6d9de,1.15);rim.position.set(-2,1,-2);scene.add(rim);
const controls=new OrbitControls(cam,renderer.domElement);controls.enableDamping=true;
controls.minDistance=0.000001;
const loader=new GLTFLoader();
const models=new Map(),queued=new Set(),loading=new Set(),pending=[],failures=new Map();
let entries=[],active=new Set(['skeletal']),busy=0,requestedFocus=null,fitWhenReady=true,skinReference=null,skinRoot=null;
const MAX_PARALLEL=3;
function resize(){const w=Math.max(100,$('canvas').clientWidth),h=Math.max(100,$('canvas').clientHeight);
renderer.setSize(w,h,true);cam.aspect=w/h;cam.updateProjectionMatrix()}
new ResizeObserver(resize).observe($('canvas'));resize();
function visibleBounds(){const b=new THREE.Box3();
for(const [id,item] of models){if(item.root.visible)b.expandByObject(item.root)}
if(skinRoot?.visible)b.expandByObject(skinRoot);
return b}
function fitBox(b){if(b.isEmpty())return;const s=b.getSize(new THREE.Vector3());
const c=b.getCenter(new THREE.Vector3());const radius=Math.max(1e-8,s.length()/2);
cam.near=Math.max(1e-12,radius/1000);cam.far=Math.max(1e-7,radius*200);
cam.position.copy(c).add(new THREE.Vector3(radius*1.15,radius*0.9,radius*2.35));
controls.target.copy(c);cam.updateProjectionMatrix();controls.update()}
function fitVisible(){fitBox(visibleBounds())}
$('fit').addEventListener('click',fitVisible);
for(const button of document.querySelectorAll('[data-view]'))button.addEventListener('click',()=>{
const b=visibleBounds();if(b.isEmpty())return;
const c=b.getCenter(new THREE.Vector3()),r=Math.max(.1,b.getSize(new THREE.Vector3()).length()/2);
const dir=button.dataset.view==='front'?new THREE.Vector3(0,0,1):
button.dataset.view==='back'?new THREE.Vector3(0,0,-1):new THREE.Vector3(1,0,0);
controls.target.copy(c);cam.position.copy(c).addScaledVector(dir,r*2.5);
cam.near=r/1000;cam.far=r*200;cam.up.set(0,1,0);cam.updateProjectionMatrix();controls.update()});
function loadSkin(){if(!skinReference||!$('skin').checked||skinRoot)return;
loader.load(skinReference.modelPath,asset=>{
skinRoot=asset.scene;skinRoot.name='Official skin reference, unvalidated';
skinRoot.traverse(node=>{if(node.isMesh){node.material=new THREE.MeshStandardMaterial({
color:0xcaa69b,roughness:0.88,metalness:0,side:THREE.DoubleSide,
transparent:true,opacity:0.22,depthWrite:false})}});
anatomy.add(skinRoot);skinRoot.visible=$('skin').checked;
fitWhenReady=true;syncVisibility();fitVisible();
},undefined,error=>{$('status').textContent='Skin reference unavailable: '+String(error)})}
$('skin').addEventListener('change',()=>{if($('skin').checked)loadSkin();
if(skinRoot)skinRoot.visible=$('skin').checked;syncVisibility()});
function styleModel(item){const mode=$('color').value,opacity=Number($('alpha').value)/100;
const appearance=materialFor(item.entry,mode);
for(const mesh of item.meshes){const mats=Array.isArray(mesh.material)?mesh.material:[mesh.material];
for(const mat of mats){if(mat.color)mat.color.setHex(appearance.color);
if('roughness' in mat)mat.roughness=appearance.roughness;
if('metalness' in mat)mat.metalness=0;
mat.side=THREE.DoubleSide;mat.opacity=opacity;mat.transparent=opacity<1;
mat.depthWrite=opacity===1;mat.wireframe=$('wire').checked;mat.needsUpdate=true}}}
function syncVisibility(){for(const item of models.values()){
item.root.visible=active.has(item.entry.system);styleModel(item)}
$('alphaLabel').textContent=$('alpha').value+'%';
const visible=[...models.values()].filter(item=>item.root.visible).length;
const required=entries.filter(e=>active.has(e.system)&&!failures.has(e.id)).length;
$('progress').textContent=visible+'/'+required+' source structures loaded · '+failures.size+' errors · '+
(skinRoot?.visible?'skin reference shown · ':'')+'partial catalog';
if(fitWhenReady&&visible===required&&required){fitWhenReady=false;fitVisible()}}
function pump(){while(busy<MAX_PARALLEL&&pending.length){
const entry=pending.shift();queued.delete(entry.id);
if(!active.has(entry.system)||models.has(entry.id)||loading.has(entry.id)||failures.has(entry.id))continue;
busy++;loading.add(entry.id);loader.load(entry.modelPath,asset=>{
busy--;loading.delete(entry.id);const root=asset.scene,meshes=[];
root.traverse(node=>{if(node.isMesh){node.material=Array.isArray(node.material)?
node.material.map(m=>m.clone()):node.material.clone();meshes.push(node)}});
if(!meshes.length){failures.set(entry.id,'No mesh found');root.traverse(()=>{});}
else{anatomy.add(root);models.set(entry.id,{root,meshes,entry});
if(requestedFocus===entry.id){requestedFocus=null;
const b=new THREE.Box3().setFromObject(root);fitBox(b)}}
syncVisibility();pump();
},undefined,error=>{busy--;loading.delete(entry.id);failures.set(entry.id,String(error));$('status').textContent='Some source GLBs could not load. See counts.';
syncVisibility();pump()})}}
function queueActive(){for(const entry of entries){if(active.has(entry.system)&&!models.has(entry.id)&&!queued.has(entry.id)&&!loading.has(entry.id)&&!failures.has(entry.id)){
queued.add(entry.id);pending.push(entry)}}syncVisibility();pump()}
function setActive(next){active=next;fitWhenReady=true;syncVisibility();queueActive()}
$('color').addEventListener('change',syncVisibility);
$('alpha').addEventListener('input',syncVisibility);
$('wire').addEventListener('change',syncVisibility);
$('contrast').addEventListener('change',()=>{
const on=$('contrast').checked;scene.background.setHex(on?0x050a0a:0x0d171a);
hemi.intensity=on?.7:1.35;key.intensity=on?3.15:2.4;rim.intensity=on?1.5:1.15});
$('clear').addEventListener('click',()=>{setActive(new Set(['skeletal']));
for(const box of document.querySelectorAll('.system input'))box.checked=box.value==='skeletal'});
function makeSystems(){const systems=[...new Set(entries.map(e=>e.system))].sort();
const target=$('systems');target.replaceChildren();
for(const system of systems){const label=document.createElement('label');label.className='system';
const input=document.createElement('input');input.type='checkbox';input.value=system;
input.checked=active.has(system);
input.addEventListener('change',()=>{const next=new Set(active);
if(input.checked)next.add(system);else next.delete(system);setActive(next)});
const name=document.createElement('span');name.textContent=system;
const count=document.createElement('span');count.className='count';
count.textContent=entries.filter(e=>e.system===system).length+' models';
label.append(input,name,count);target.append(label)}}
function search(){const q=$('search').value.toLowerCase().trim();
const target=$('searchResults');target.replaceChildren();
if(!q)return;
for(const entry of entries.filter(e=>e.name.toLowerCase().includes(q)).slice(0,24)){
const b=document.createElement('button');b.textContent=entry.name+' · '+entry.system;
b.addEventListener('click',()=>{if(!active.has(entry.system)){
active.add(entry.system);
for(const input of document.querySelectorAll('.system input'))
input.checked=active.has(input.value)}
if(models.has(entry.id)){fitBox(new THREE.Box3().setFromObject(models.get(entry.id).root))}
else{requestedFocus=entry.id;queueActive()}
$('status').textContent='Focus: '+entry.name});
target.append(b)}}
$('search').addEventListener('input',search);
fetch('./inventory.json').then(r=>{if(!r.ok)throw Error('Inventory unavailable');return r.json()}).then(data=>{
entries=Array.isArray(data.converted)?data.converted:[];
if(!entries.length)throw Error('No converted GLBs');
skinReference=data.referenceSurface||null;
if(!skinReference)$('skin').closest('label').hidden=true;
$('status').textContent='Assembly: official raw coordinates. Start with bones; enable other systems for combined anatomy.';
$('details').textContent=entries.length+' distinct converted candidates, source geometry unchanged; '+
(data.summary?.gaps??'unknown')+' catalog names still unconfirmed. Shared source frame: millimetres to display metres, superior up. No CT registration.';
makeSystems();queueActive();loadSkin();
}).catch(e=>{$('status').textContent='ERROR: '+e.message;$('progress').textContent='Unable to assemble body'});
function animate(){requestAnimationFrame(animate);controls.update();renderer.render(scene,cam)}animate();
</script>
</body>
</html>`;
}
