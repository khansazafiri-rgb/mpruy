import * as THREE from 'three';
import {OrbitControls} from 'three/addons/controls/OrbitControls.js';
import {GLTFLoader} from 'three/addons/loaders/GLTFLoader.js';
import {groups,regions,validateInventory,matchesRegion,searchEntries} from './inventory.js';
import {layerLabels,initialStudy,baseVisible,displayed,buildAlternatives,revealEntry,materialKind} from './study-state.js';
import {mountReferences} from './reference-viewer.js';
import {initialPresentation,setGroupOpacity,effectiveOpacity,materialKey,chooseEvictions,fitParameters,nextPickedId} from './presentation-state.js';
import './style.css';
const $=id=>document.getElementById(id);
const base=import.meta.env.BASE_URL;
const colors={skeletal:0xe9dcc3,muscular:0xad4e50,joints:0x96bbc6,arterial:0xd43e48,venous:0x3e6cbb,heart:0xa93949,nervous:0xe7bd50,lymphatic:0x4b9c72,respiratory:0xd991a0,digestive:0xd39c87,urinary:0x9e4553,reproductive:0xcaa7a0,endocrine:0x9d82bf,brain:0xcaa7a0,spinalCord:0xe1c6b0,lymphNode:0x4b9c72,lymphTrunk:0x278b78,lymphVessel:0x83c9a3,spleen:0x875279,pleura:0xb3a0a7,airway:0x94c3bf};
const scene=new THREE.Scene(),body=new THREE.Group();scene.add(body);
scene.background=new THREE.Color(0x092b27);
const camera=new THREE.PerspectiveCamera(40,1,.001,100);camera.position.set(0,0,3);
const renderer=new THREE.WebGLRenderer({antialias:true});renderer.setPixelRatio(Math.min(devicePixelRatio,1.5));$('view').prepend(renderer.domElement);
const controls=new OrbitControls(camera,renderer.domElement);controls.enableDamping=true;
scene.add(new THREE.HemisphereLight(0xffffff,0x526c64,2.2));
const light=new THREE.DirectionalLight(0xffffff,2);light.position.set(2,3,4);scene.add(light);
const fill=new THREE.DirectionalLight(0xffffff,1);fill.position.set(-2,2,-3);scene.add(fill);
const materials=new Map();
const loader=new GLTFLoader(),cache=new Map(),failed=new Map(),inflight=new Map();
let entries=[],selected=null,study=initialStudy(),presentation=initialPresentation(),alternatives=new Map(),byId=new Map(),revision=0,searchRevision=0,independent=false;
let cacheClock=0,cacheReport={remaining:0,aboveBudget:false};
const counts=()=>{
 $('count').textContent=[...cache.values()].filter(o=>o.visible).length+' terlihat · '+cache.size+' dimuat · '+inflight.size+' memuat/antre · '+failed.size+' gagal · '+entries.length+' kandidat. Bukan ukuran kelengkapan anatomi.';
 $('cacheStatus').textContent='Buffer geometri terukur: '+Math.round(cacheReport.remaining/1048576)+' MiB'+(cacheReport.aboveBudget?' · melebihi target lunak; kurangi sistem aktif.':'');
 $('retry').disabled=!failed.size;$('restore').hidden=!study.isolated&&!study.hidden.size;
};
const visible=e=>displayed(e,study,alternatives,id=>cache.has(id),byId);
function appearanceFor(e){
 const selectedId=selected?.id,kind=materialKind(e),key=materialKey(e,kind,presentation,selectedId);
 if(!materials.has(key)){
  const isSelected=e.id===selectedId,opacity=effectiveOpacity(e,presentation,selectedId);
  materials.set(key,new THREE.MeshStandardMaterial({color:isSelected?0xf9c65e:colors[kind]??colors[e.group],roughness:isSelected ? .6 : .82,side:THREE.DoubleSide,opacity,transparent:opacity<1,depthWrite:opacity>=1,wireframe:presentation.wireframe&&!isSelected}));
 }
 return {key,material:materials.get(key)};
}
function applyAppearance(obj){
 const a=appearanceFor(obj.userData.entry);
 if(obj.userData.materialKey===a.key)return;
 obj.traverse(m=>{if(m.isMesh)m.material=a.material;});obj.userData.materialKey=a.key;
}
function updateAppearance(){
 const used=new Set();for(const obj of cache.values()){applyAppearance(obj);used.add(obj.userData.materialKey);}
 for(const [key,material] of materials)if(!used.has(key)){material.dispose();materials.delete(key);}
}
function geometryBytes(obj){
 const buffers=new Set();obj.traverse(m=>{if(!m.isMesh)return;const g=m.geometry;for(const attr of [g.index,...Object.values(g.attributes),...Object.values(g.morphAttributes).flat()]){const buffer=(attr?.array||attr?.data?.array)?.buffer;if(buffer)buffers.add(buffer);}});
 return [...buffers].reduce((n,b)=>n+b.byteLength,0);
}
function evictHidden(){
 const records=[...cache].map(([id,obj])=>({id,visible:baseVisible(obj.userData.entry,study),bytes:obj.userData.geometryBytes,lastUsed:obj.userData.lastUsed}));
 cacheReport=chooseEvictions(records,{selectedId:selected?.id,inflight:new Set(inflight.keys())});
 for(const id of cacheReport.ids){
  const obj=cache.get(id),geometries=new Set();obj.traverse(m=>{if(m.isMesh)geometries.add(m.geometry);});body.remove(obj);for(const g of geometries)g.dispose();cache.delete(id);
 }
}
function sync(){for(const obj of cache.values()){obj.visible=visible(obj.userData.entry);if(obj.visible)obj.userData.lastUsed=++cacheClock;}evictHidden();counts();}
function select(e){
 selected=e;updateAppearance();
 $('selectionActions').hidden=!e;
 $('info').textContent=e?e.name+' · '+groups[e.group]+(e.fmaId?' · '+e.fmaId+' / '+e.bpId:'')+' · kandidat belum disetujui':'';
}
// Bound concurrent network/decoder work across overlapping study changes.
let activeLoads=0;const waitingLoads=[];
async function acquireLoad(){
 if(activeLoads<4){activeLoads++;return;}
 await new Promise(resolve=>waitingLoads.push(resolve));
}
function releaseLoad(){const next=waitingLoads.shift();if(next)next();else activeLoads--;}
async function load(e){
 if(cache.has(e.id))return;
 if(inflight.has(e.id))return inflight.get(e.id);
 const promise=(async()=>{
  await acquireLoad();
  try{
   if(!baseVisible(e,study))return;
   const g=await loader.loadAsync(base+e.path);
   const importedMaterials=new Set(),textures=new Set();
   g.scene.traverse(m=>{if(m.isMesh){for(const mat of [].concat(m.material||[])){if(!mat)continue;importedMaterials.add(mat);for(const value of Object.values(mat))if(value?.isTexture)textures.add(value);}m.userData.entry=e;}});
   g.scene.userData.entry=e;g.scene.userData.geometryBytes=geometryBytes(g.scene);g.scene.userData.lastUsed=++cacheClock;
   applyAppearance(g.scene);for(const tex of textures)tex.dispose();for(const mat of importedMaterials)mat.dispose();
   g.scene.visible=visible(e);body.add(g.scene);cache.set(e.id,g.scene);failed.delete(e.id);
  }catch(error){failed.set(e.id,String(error.message||error));}
  finally{releaseLoad();inflight.delete(e.id);evictHidden();counts();}
 })();
 inflight.set(e.id,promise);counts();return promise;
}
async function refresh(fitAfter=false){
 const tick=++revision;sync();
 const queue=entries.filter(e=>baseVisible(e,study)&&!cache.has(e.id)&&!failed.has(e.id));
 const work=async()=>{while(queue.length&&tick===revision)await load(queue.shift());};
 await Promise.all(Array.from({length:4},work));if(tick!==revision)return;sync();if(fitAfter)fit();
}
function currentAxis(){const dir=camera.position.clone().sub(controls.target);return dir.lengthSq()>0?dir.normalize():new THREE.Vector3(0,0,1);}
function frameBounds(bounds,axis){
 if(bounds.isEmpty())return;
 const center=bounds.getCenter(new THREE.Vector3()),size=bounds.getSize(new THREE.Vector3());
 const p=fitParameters(size.toArray(),camera.fov,camera.aspect||1);
 controls.target.copy(center);camera.position.copy(center).addScaledVector(axis,p.distance);camera.near=p.near;camera.far=p.far;controls.minDistance=p.radius*.015;controls.maxDistance=p.far*.7;camera.updateProjectionMatrix();controls.update();
}
function fit(axis=currentAxis()){
 const bounds=new THREE.Box3();for(const obj of cache.values())if(obj.visible)bounds.union(obj.userData.bounds??=new THREE.Box3().setFromObject(obj));
 frameBounds(bounds,axis);
}
function resize(){const w=$('view').clientWidth,h=$('view').clientHeight;if(!w||!h)return;renderer.setSize(w,h);camera.aspect=w/h;camera.updateProjectionMatrix();}
new ResizeObserver(resize).observe($('view'));resize();renderer.setAnimationLoop(()=>{controls.update();renderer.render(scene,camera);});
$('front').onclick=()=>fit(new THREE.Vector3(0,0,1));$('side').onclick=()=>fit(new THREE.Vector3(-1,0,0));$('right').onclick=()=>fit(new THREE.Vector3(1,0,0));$('top').onclick=()=>fit(new THREE.Vector3(0,1,.0001).normalize());$('back').onclick=()=>fit(new THREE.Vector3(0,0,-1));$('fit').onclick=()=>fit();
const ray=new THREE.Raycaster(),pointer=new THREE.Vector2();let down=null;
renderer.domElement.addEventListener('pointerdown',ev=>{down=ev.button===0?[ev.clientX,ev.clientY,ev.pointerId]:null;});
renderer.domElement.addEventListener('pointercancel',()=>{down=null;});
renderer.domElement.addEventListener('pointerup',ev=>{
 const start=down;down=null;if(!start||start[2]!==ev.pointerId||Math.hypot(ev.clientX-start[0],ev.clientY-start[1])>5)return;
 const r=renderer.domElement.getBoundingClientRect();pointer.set((ev.clientX-r.left)/r.width*2-1,-(ev.clientY-r.top)/r.height*2+1);ray.setFromCamera(pointer,camera);
 const hits=ray.intersectObjects([...cache.values()].filter(o=>o.visible),true).map(x=>x.object.userData.entry?.id);const id=nextPickedId(hits,selected?.id,ev.shiftKey);searchRevision++;select(byId.get(id)||null);
});
for(const [id,label] of Object.entries(regions)){const o=document.createElement('option');o.value=id;o.textContent=label;$('region').append(o);}
function resetSelection(){searchRevision++;select(null);}
function syncControls(){ $('region').value=study.region;$('representation').value=study.representation;groupControls();}
$('region').onchange=()=>{resetSelection();study.region=$('region').value;study.isolated=null;refresh(true);};
$('representation').onchange=()=>{resetSelection();study.representation=$('representation').value;study.overrides={};study.isolated=null;refresh();};
function groupControls(){
 $('groups').replaceChildren();
 for(const [id,name] of Object.entries(groups)){
  const items=entries.filter(e=>e.group===id),row=document.createElement('div'),l=document.createElement('label'),c=document.createElement('input');
  row.className='system-row';c.type='checkbox';c.checked=study.enabled.has(id);c.disabled=!items.length;const swatch=document.createElement('span');swatch.className='system-swatch';swatch.style.backgroundColor='#'+colors[id].toString(16).padStart(6,'0');l.append(c,swatch,document.createTextNode(name+' ('+items.length+')'));row.append(l);
  c.onchange=()=>{resetSelection();study.isolated=null;if(c.checked)study.enabled.add(id);else study.enabled.delete(id);refresh(true);};
  if(!independent&&layerLabels[id].length>1){
   const menu=document.createElement('select');menu.setAttribute('aria-label','Lapisan minimum '+name);
   for(const [i,label] of layerLabels[id].entries()){const o=document.createElement('option');o.value=String(i);o.textContent=i===0?'Semua lapisan':label+' ke atas';menu.append(o);}
   menu.value=String(study.minimumLayer[id]??0);menu.disabled=!items.length;
   menu.onchange=()=>{resetSelection();study.isolated=null;study.minimumLayer[id]=Number(menu.value);study.enabled.add(id);c.checked=true;refresh(true);};row.append(menu);
  }
  if(items.length){const line=document.createElement('label'),range=document.createElement('input'),value=document.createElement('span');line.className='opacity-row';range.type='range';range.min='15';range.max='100';range.step='5';range.value=String(presentation.opacity[id]??100);range.setAttribute('aria-label','Opasitas '+name);value.textContent=range.value+'%';range.oninput=()=>{presentation=setGroupOpacity(presentation,id,Number(range.value));value.textContent=range.value+'%';updateAppearance();};line.append(range,value);row.append(line);}
  $('groups').append(row);
 }
}
function focus(e){const obj=cache.get(e.id);if(!obj)return;frameBounds(obj.userData.bounds??=new THREE.Box3().setFromObject(obj),currentAxis());}
$('focus').onclick=()=>{if(selected)focus(selected);};
$('isolate').onclick=()=>{if(!selected)return;searchRevision++;study.isolated=selected.id;sync();focus(selected);};
$('hide').onclick=()=>{if(!selected)return;study.hidden.add(selected.id);study.isolated=null;resetSelection();refresh();};
$('restore').onclick=()=>{study.hidden.clear();study.isolated=null;resetSelection();refresh(true);};
$('retry').onclick=()=>{failed.clear();refresh();};
$('allSystems').onclick=()=>{resetSelection();study.enabled=new Set(entries.map(e=>e.group));study.isolated=null;syncControls();refresh(true);};
$('reset').onclick=()=>{resetSelection();study=initialStudy();presentation=initialPresentation();syncPresentationControls();updateAppearance();syncControls();refresh(true);};
function syncPresentationControls(){$('contextMode').checked=presentation.context;$('wireframeMode').checked=presentation.wireframe;}
$('contextMode').onchange=()=>{presentation={...presentation,context:$('contextMode').checked};updateAppearance();};
$('wireframeMode').onchange=()=>{presentation={...presentation,wireframe:$('wireframeMode').checked};updateAppearance();};
$('resetAppearance').onclick=()=>{presentation=initialPresentation();syncPresentationControls();groupControls();updateAppearance();};
$('clearSelection').onclick=resetSelection;
$('fullscreen').onclick=async()=>{try{if(document.fullscreenElement=== $('view'))await document.exitFullscreen();else await $('view').requestFullscreen();}catch(e){$('viewHint').textContent='Layar penuh tidak tersedia: '+String(e.message||e);}};
document.addEventListener('fullscreenchange',()=>{$('fullscreen').setAttribute('aria-pressed',String(document.fullscreenElement===$('view')));$('fullscreen').textContent=document.fullscreenElement===$('view')?'Keluar layar penuh':'Layar penuh';resize();});
if(!document.fullscreenEnabled)$('fullscreen').disabled=true;
document.addEventListener('keydown',ev=>{if(ev.key==='Escape'&&!document.fullscreenElement&&!$('referenceDialog').open&&!['INPUT','SELECT','TEXTAREA','BUTTON'].includes(ev.target?.tagName))resetSelection();});
$('search').oninput=()=>{
 $('results').replaceChildren();
 for(const e of searchEntries(entries,$('search').value)){
  const b=document.createElement('button');b.textContent=e.name;b.onclick=async()=>{
   const token=++searchRevision;revealEntry(e,study,alternatives);syncControls();failed.delete(e.id);await load(e);if(token!==searchRevision)return;
   sync();if(cache.has(e.id)){select(e);focus(e);refresh();}else $('info').textContent='Model gagal dimuat: '+e.name;
  };$('results').append(b);
 }
};
async function init(){
 groupControls();
 if(location.hostname!=='127.0.0.1'){ $('notice').textContent='Aplikasi ini belum disetujui untuk publikasi.';return; }
 try{const r=await fetch(base+'inventory.json',{cache:'no-store'});if(!r.ok)throw Error('Tidak ada inventaris review');const doc=await r.json();entries=validateInventory(doc,location.hostname);independent=doc.sourceKind==='independent-bp3d';if(independent){$('viewHint').textContent='Sumbu sumber XYZ (bukan orientasi anatomi tervalidasi) · Shift+klik: pilih struktur di belakang';$('modelAttributions').hidden=false;$('region').disabled=true;$('representation').disabled=true;$('front').textContent='+Z';$('back').textContent='−Z';$('side').textContent='−X';$('right').textContent='+X';$('top').textContent='+Y';}byId=new Map(entries.map(e=>[e.id,e]));alternatives=independent?new Map():buildAlternatives(entries);$('notice').textContent=independent?'BodyParts3D asli · koordinat sumber, bukan orientasi anatomis tervalidasi. Klasifikasi sistem sementara; regio/lapisan belum diverifikasi. HRA terpisah. Belum untuk publikasi.':'Z-Anatomy sumber asli, kandidat privat. Hak per objek, kontinuitas dan ketepatan anatomi belum disetujui. Limfatik belum memiliki jaringan pembuluh.';groupControls();await refresh(true);}
 catch(error){$('notice').textContent=error.message;counts();}
}
mountReferences(base);
init();
