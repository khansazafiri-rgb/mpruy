import {mountGuided} from './guided-panel.js';
import * as THREE from 'three';
import {OrbitControls} from 'three/addons/controls/OrbitControls.js';
import {GLTFLoader} from 'three/addons/loaders/GLTFLoader.js';
import {groups,regions,validateInventory,matchesRegion,searchEntries} from './inventory.js';
import {layerLabels,initialStudy,baseVisible as bodyBaseVisible,displayed,buildAlternatives,revealEntry,materialKind} from './study-state.js';
import {mountReferences} from './reference-viewer.js';
import {initialPresentation,setGroupOpacity,effectiveOpacity,materialKey,chooseEvictions,fitParameters,nextPickedId} from './presentation-state.js';
import {STATUS,validPing} from './host-protocol.js';
import {validOpen,RESULT,openKnownStructure} from './library-bridge.js';
import './style.css';
import {mountOriginalShell} from './original-shell.js';
import {validateElementCatalog,elementKey,elementKeys,meshElementId,hasExactElements} from './element-selection.js';
const $=id=>document.getElementById(id);
const base=import.meta.env.BASE_URL;
let hostState={state:'loading',message:'Menyiapkan inventaris dan model awal…'};
function notifyHost(state=hostState.state,message=hostState.message){hostState={state,message:String(message).slice(0,240)};if(window.parent!==window&&location.hostname==='127.0.0.1')window.parent.postMessage({type:STATUS,version:1,...hostState},location.origin);}
window.addEventListener('message',event=>{if(window.parent!==window&&validPing(event,location.origin,window.parent))notifyHost();});
const colors={skeletal:0xe9dcc3,muscular:0xad4e50,joints:0x96bbc6,arterial:0xd43e48,venous:0x3e6cbb,heart:0xa93949,nervous:0xe7bd50,lymphatic:0x4b9c72,respiratory:0xd991a0,digestive:0xd39c87,urinary:0x9e4553,reproductive:0xcaa7a0,endocrine:0x9d82bf,brain:0xcaa7a0,spinalCord:0xe1c6b0,lymphNode:0x4b9c72,lymphTrunk:0x278b78,lymphVessel:0x83c9a3,spleen:0x875279,pleura:0xb3a0a7,airway:0x94c3bf};
const scene=new THREE.Scene(),body=new THREE.Group();scene.add(body);
scene.background=new THREE.Color(0x092b27);
const camera=new THREE.PerspectiveCamera(40,1,.001,100);camera.position.set(0,0,3);
let renderer;try{renderer=new THREE.WebGLRenderer({antialias:true});}catch(error){$('notice').textContent='WebGL tidak tersedia.';notifyHost('error','WebGL tidak tersedia.');throw error;}renderer.setPixelRatio(Math.min(devicePixelRatio,1.5));$('view').prepend(renderer.domElement);
const controls=new OrbitControls(camera,renderer.domElement);controls.enableDamping=true;
scene.add(new THREE.HemisphereLight(0xffffff,0x526c64,2.2));
const light=new THREE.DirectionalLight(0xffffff,2);light.position.set(2,3,4);scene.add(light);
const fill=new THREE.DirectionalLight(0xffffff,1);fill.position.set(-2,2,-3);scene.add(fill);
const materials=new Map();
const loader=new GLTFLoader(),cache=new Map(),failed=new Map(),inflight=new Map();
let entries=[],selected=null,study=initialStudy(),presentation=initialPresentation(),alternatives=new Map(),byId=new Map(),revision=0,searchRevision=0,independent=false;
let cacheClock=0,cacheReport={remaining:0,aboveBudget:false};
let originalUI=null,originalReady=false;
let selectionEntries=[],isolatedKeys=null,hiddenKeys=new Set(),selectedKeys=new Set();
function refreshElementSets(){
 const isolated=byId.get(study.isolated);isolatedKeys=isolated?.selectionOnly?elementKeys(isolated):null;
 hiddenKeys=new Set();for(const id of study.hidden){const e=byId.get(id);if(e?.selectionOnly)for(const k of elementKeys(e))hiddenKeys.add(k);}
 selectedKeys=selected?.selectionOnly?elementKeys(selected):new Set();
}
const ownerOf=(e,id)=>e?.selectionOnly&&e.bindings.some(b=>b.ownerId===id);
const counts=()=>{
 $('count').textContent=[...cache.values()].filter(o=>o.visible&&!o.userData.entry.priorityOnly).length+' tubuh terlihat · '+[...cache.values()].filter(o=>!o.userData.entry.priorityOnly).length+' tubuh dimuat · '+inflight.size+' memuat/antre · '+failed.size+' gagal · '+entries.filter(e=>!e.contextCandidate).length+' model awal · '+entries.filter(e=>e.contextCandidate).length+' kandidat konteks. Bukan ukuran kelengkapan anatomi.';
 $('cacheStatus').textContent='Buffer geometri terukur: '+Math.round(cacheReport.remaining/1048576)+' MiB'+(cacheReport.aboveBudget?' · melebihi target lunak; kurangi sistem aktif.':'');
 $('retry').disabled=!failed.size;$('restore').hidden=!study.isolated&&!study.hidden.size;originalUI?.render();
};
const baseVisible=(e,s)=>{const iso=byId.get(s.isolated);if(iso?.selectionOnly)return ownerOf(iso,e.id);return e.priorityOnly?s.isolated===e.id:bodyBaseVisible(e,s);};
const visible=e=>isolatedKeys?baseVisible(e,study):e.priorityOnly?baseVisible(e,study):displayed(e,study,alternatives,id=>cache.has(id),byId);
function appearanceFor(e,meshKey){
 const selectedId=selected?.id;
 const target=selectedKeys.has(meshKey)?{...e,id:selectedId}:e;
 const kind=materialKind(e),key=materialKey(target,kind,presentation,selectedId);
 if(!materials.has(key)){
  const isSelected=target.id===selectedId,opacity=effectiveOpacity(target,presentation,selectedId);
  materials.set(key,new THREE.MeshStandardMaterial({color:isSelected?0xf9c65e:colors[kind]??colors[e.group],roughness:isSelected ? .6 : .82,side:THREE.DoubleSide,opacity,transparent:opacity<1,depthWrite:opacity>=1,wireframe:presentation.wireframe&&!isSelected}));
 }
 return {key,material:materials.get(key)};
}
function applyAppearance(obj){
 const e=obj.userData.entry;
 for(const mesh of obj.userData.meshes){
  const k=mesh.userData.elementKey;const a=appearanceFor(e,k);
  if(mesh.userData.materialKey!==a.key){mesh.material=a.material;mesh.userData.materialKey=a.key;}
 }
}
function updateAppearance(){
 refreshElementSets();const used=new Set();for(const obj of cache.values()){applyAppearance(obj);for(const m of obj.userData.meshes)used.add(m.userData.materialKey);}
 for(const [key,material] of materials)if(!used.has(key)){material.dispose();materials.delete(key);}
}
function syncMeshVisibility(obj){
 for(const m of obj.userData.meshes){const k=m.userData.elementKey;m.visible=isolatedKeys?isolatedKeys.has(k):!hiddenKeys.has(k);}
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
function sync(){refreshElementSets();for(const obj of cache.values()){obj.visible=visible(obj.userData.entry);syncMeshVisibility(obj);if(obj.visible)obj.userData.lastUsed=++cacheClock;}evictHidden();counts();}
function select(e){
 selected=e;updateAppearance();
 $('selectionActions').hidden=!e;
 $('info').textContent=e?e.name+' · '+groups[e.group]+(e.fmaId?' · '+e.fmaId+' / '+e.bpId:'')+' · kandidat belum disetujui':'';originalUI?.render();
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
   const importedMaterials=new Set(),textures=new Set(),meshes=[],elementIds=new Set();
   g.scene.traverse(m=>{if(m.isMesh){for(const mat of [].concat(m.material||[])){if(!mat)continue;importedMaterials.add(mat);for(const value of Object.values(mat))if(value?.isTexture)textures.add(value);}m.userData.entry=e;const el=meshElementId(m);if(el){m.userData.elementKey=elementKey(e.id,el);elementIds.add(el);}meshes.push(m);}});
   g.scene.userData.entry=e;g.scene.userData.meshes=meshes;g.scene.userData.elementIds=elementIds;g.scene.userData.geometryBytes=geometryBytes(g.scene);g.scene.userData.lastUsed=++cacheClock;
   applyAppearance(g.scene);for(const tex of textures)tex.dispose();for(const mat of importedMaterials)mat.dispose();
   syncMeshVisibility(g.scene);g.scene.visible=visible(e);body.add(g.scene);cache.set(e.id,g.scene);failed.delete(e.id);
  }catch(error){failed.set(e.id,String(error.message||error));}
  finally{releaseLoad();inflight.delete(e.id);evictHidden();counts();}
 })();
 inflight.set(e.id,promise);counts();return promise;
}
async function refresh(fitAfter=false){
 const tick=++revision;sync();
 const queue=[...entries,...(byId.get(study.isolated)?.priorityOnly?[byId.get(study.isolated)]:[])].filter(e=>baseVisible(e,study)&&!cache.has(e.id)&&!failed.has(e.id));
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
 const bounds=new THREE.Box3();for(const obj of cache.values())if(obj.visible){if(isolatedKeys||hiddenKeys.size){for(const m of obj.userData.meshes)if(m.visible)bounds.union(new THREE.Box3().setFromObject(m));}else bounds.union(obj.userData.bounds??=new THREE.Box3().setFromObject(obj));}
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
 const hits=ray.intersectObjects([...cache.values()].filter(o=>o.visible),true).filter(x=>x.object.visible).map(x=>x.object.userData.entry?.id);const id=nextPickedId(hits,selected?.id,ev.shiftKey);searchRevision++;select(id&&isolatedKeys?byId.get(study.isolated):byId.get(id)||null);
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
function focus(e){if(e.selectionOnly){const bounds=new THREE.Box3(),keys=elementKeys(e);for(const id of new Set(e.bindings.map(b=>b.ownerId))){const obj=cache.get(id);for(const m of obj?.userData.meshes||[])if(keys.has(m.userData.elementKey))bounds.union(new THREE.Box3().setFromObject(m));}frameBounds(bounds,currentAxis());return;}const obj=cache.get(e.id);if(!obj)return;frameBounds(obj.userData.bounds??=new THREE.Box3().setFromObject(obj),currentAxis());}
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
 for(const e of searchEntries([...entries,...selectionEntries],$('search').value)){
  const b=document.createElement('button');b.textContent=e.name;b.onclick=async()=>{
   await chooseEntry(e);
  };$('results').append(b);
 }
};
// Supplemental concepts are isolated in the same camera/selection engine. They
// never enter the main body inventory or the all-systems display queue.
async function initPriority(){
 const panel=document.createElement('details');panel.id='priorityRecovery';panel.hidden=true;
 const heading=document.createElement('summary');heading.textContent='Pemulihan struktur prioritas';panel.append(heading);
 const explanation=document.createElement('p');explanation.className='hint';explanation.textContent='Representasi sumber terpisah, tidak ditumpuk pada tubuh. Pilih struktur untuk isolasi dan highlight; gunakan Kembalikan struktur untuk kembali.';panel.append(explanation);
 const search=document.createElement('input');search.type='search';search.placeholder='Cari struktur prioritas';search.setAttribute('aria-label','Cari struktur prioritas');panel.append(search);
 const menu=document.createElement('select');menu.setAttribute('aria-label','Struktur prioritas');panel.append(menu);
 const open=document.createElement('button');open.type='button';open.textContent='Tampilkan & highlight';panel.append(open);
 const status=document.createElement('p');status.className='hint';status.setAttribute('role','status');panel.append(status);
 const attribution=document.createElement('a');attribution.href=base+'priority-recovery/attributions.json';attribution.target='_blank';attribution.rel='noopener';attribution.textContent='Atribusi & bukti sumber';panel.append(attribution);
 $('openReferences').insertAdjacentElement('afterend',panel);
 try{
  const response=await fetch(base+'priority-recovery/inventory.json',{cache:'no-store'});
  if(response.status===404)return;
  if(!response.ok)throw Error('Inventaris pemulihan tidak tersedia');
  const doc=await response.json();
  if(doc.schema!==1||doc.publicRelease!=='NO_GO'||doc.registrationValidated!==false||doc.clinicalValidation!==false||!Array.isArray(doc.items))throw Error('Inventaris pemulihan tidak valid');
  const ids=new Set(),fmas=new Set([...byId.values()].map(e=>e.fmaId));
  if(doc.contextMode!==null&&doc.contextMode!=='NATIVE_FRAME_CANDIDATE')throw Error('Mode konteks tidak valid');
  for(const e of doc.items){
   if(!/^bp-[a-f0-9]{24}$/.test(e.id)||ids.has(e.id)||byId.has(e.id)||typeof e.name!=='string'||!e.name.trim()||!Object.hasOwn(groups,e.group)||!/^FMA\d+$/.test(e.fmaId)||!/^BP\d+$/.test(e.bpId)||e.path!=='priority-recovery/'+e.id+'.glb'||e.priorityOnly!==true||e.approvedForDistribution!==false||e.clinicalValidation!==false||e.classificationProvisional!==true||e.source!=='BodyParts3D 4.0'||!['isa','partof'].includes(e.sourceTree))throw Error('Identitas pemulihan tidak valid');
   if(typeof e.contextCandidate!=='boolean'||(e.contextCandidate&&(doc.contextMode!=='NATIVE_FRAME_CANDIDATE'||fmas.has(e.fmaId))))throw Error('Identitas konteks tidak valid');
   if(e.contextCandidate)fmas.add(e.fmaId);
   ids.add(e.id);
  }
  const recovered=doc.items.map(e=>e.contextCandidate?{...e,priorityOnly:false}:e);
  for(const e of recovered){byId.set(e.id,e);if(e.contextCandidate)entries.push(e);}
  if(recovered.some(e=>e.contextCandidate)){explanation.textContent='Kandidat konteks memakai koordinat asli; belum tervalidasi spasial. Representasi alternatif tetap terpisah.';groupControls();await refresh(true);}
  function list(){
   const q=search.value.trim().toLowerCase();menu.replaceChildren();
   for(const e of recovered.filter(e=>(e.name+' '+groups[e.group]+' '+e.fmaId).toLowerCase().includes(q))){
    const o=document.createElement('option');o.value=e.id;o.textContent=groups[e.group]+' · '+e.name;menu.append(o);
   }
   open.disabled=!menu.options.length;
  }
  search.oninput=list;list();panel.hidden=false;panel.open=true;status.textContent=recovered.filter(e=>e.contextCandidate).length+' kandidat konteks · '+recovered.filter(e=>e.priorityOnly).length+' representasi terpisah.';
  open.onclick=async()=>{
   const e=byId.get(menu.value);if(!e)return;
   if(e.contextCandidate){await chooseEntry(e);status.textContent=e.name+' · kandidat konteks, belum tervalidasi klinis.';return;}
   const token=++searchRevision;++revision;study.isolated=e.id;failed.delete(e.id);select(e);sync();
   status.textContent='Memuat '+e.name+'…';await load(e);
   if(token!==searchRevision)return;
   sync();
   if(cache.has(e.id)){select(e);focus(e);status.textContent=e.name+' · '+e.fmaId+' · kandidat sumber, belum tervalidasi klinis.';}
   else{study.isolated=null;resetSelection();refresh(true);status.textContent='Gagal memuat '+e.name+'; pilih kembali untuk mencoba ulang.';}
  };
 }catch(error){panel.hidden=false;panel.open=true;open.disabled=true;status.textContent=String(error.message||error);}
}
async function initElementSelection(){
 const r=await fetch(base+'element-selection.json',{cache:'no-store'});if(r.status===404)return;
 if(!r.ok)throw Error('Katalog seleksi tidak tersedia');selectionEntries=validateElementCatalog(await r.json(),entries);
 for(const e of selectionEntries)byId.set(e.id,e);
}
async function chooseEntry(e){
 const token=++searchRevision;
 if(e.selectionOnly){
  study.isolated=null;const targets=elementKeys(e);
  for(const id of [...study.hidden]){const v=byId.get(id);if(v?.selectionOnly&&[...elementKeys(v)].some(k=>targets.has(k)))study.hidden.delete(id);}
  const owners=[...new Set(e.bindings.map(b=>b.ownerId))].map(id=>byId.get(id));
  for(const owner of owners){revealEntry(owner,study,alternatives);failed.delete(owner.id);}
  syncControls();sync();await Promise.all(owners.map(load));if(token!==searchRevision)return false;
  const loaded=new Map(owners.map(o=>[o.id,cache.get(o.id)?.userData.elementIds]));
  if(!hasExactElements(e,loaded)){resetSelection();$('info').textContent='Elemen sumber tidak lengkap: '+e.name;notifyHost('partial','Elemen sumber tidak lengkap: '+e.name);refresh();return false;}
  select(e);sync();focus(e);refresh();return true;
 }
 for(const id of [...study.hidden]){const v=byId.get(id);if(ownerOf(v,e.id))study.hidden.delete(id);}
 if(e.priorityOnly){++revision;study.isolated=e.id;}else revealEntry(e,study,alternatives);
 select(e);syncControls();sync();failed.delete(e.id);await load(e);if(token!==searchRevision)return false;
 if(cache.has(e.id)){sync();select(e);focus(e);refresh();return true;}else{study.isolated=null;resetSelection();refresh(true);return false;}
}
async function init(){
 groupControls();
 if(location.hostname!=='127.0.0.1'){ $('notice').textContent='Aplikasi ini belum disetujui untuk publikasi.';return; }
 try{const r=await fetch(base+'inventory.json',{cache:'no-store'});if(!r.ok)throw Error('Tidak ada inventaris review');const doc=await r.json();entries=validateInventory(doc,location.hostname);independent=doc.sourceKind==='independent-bp3d';if(independent){$('viewHint').textContent='Sumbu sumber XYZ (bukan orientasi anatomi tervalidasi) · Shift+klik: pilih struktur di belakang';$('modelAttributions').hidden=false;$('region').disabled=true;$('representation').disabled=true;$('front').textContent='+Z';$('back').textContent='−Z';$('side').textContent='−X';$('right').textContent='+X';$('top').textContent='+Y';}byId=new Map(entries.map(e=>[e.id,e]));alternatives=independent?new Map():buildAlternatives(entries);$('notice').textContent=independent?'BodyParts3D asli · koordinat sumber, bukan orientasi anatomis tervalidasi. Klasifikasi sistem sementara; regio/lapisan belum diverifikasi. HRA terpisah. Belum untuk publikasi.':'Z-Anatomy sumber asli, kandidat privat. Hak per objek, kontinuitas dan ketepatan anatomi belum disetujui. Limfatik belum memiliki jaringan pembuluh.';groupControls();await refresh(true);if(independent){await initElementSelection();await initPriority();}notifyHost(cache.size?(failed.size?'partial':'interactive'):'error',cache.size?(failed.size?'Viewer tersedia; beberapa model gagal dimuat.':'Viewer siap; struktur masih kandidat review.'):'Tidak ada model awal yang berhasil dimuat.');}
 catch(error){$('notice').textContent=error.message;counts();notifyHost('error',error.message);}
}
mountReferences(base);
const openGuided=mountGuided({base,groups,entries:()=>[...byId.values()],choose:chooseEntry,ready:()=>initialized});
$('openGuided').onclick=openGuided;
originalUI=mountOriginalShell({
 groups,entries:()=>[...byId.values()],color:g=>'#'+colors[g].toString(16).padStart(6,'0'),
 state:()=>({...study,selected,ready:originalReady,loading:inflight.size>0,error:hostState.state==='error',visibleMeshes:[...cache.values()].reduce((n,o)=>n+(o.visible?o.userData.meshes.filter(m=>m.visible).length:0),0),highlightedMeshes:[...cache.values()].reduce((n,o)=>n+(o.visible?o.userData.meshes.filter(m=>m.visible&&m.userData.materialKey?.startsWith('highlight:')).length:0),0)}),
 status:()=>$('count').textContent+' · '+selectionEntries.length+' konsep seleksi · review privat'+(['partial','error'].includes(hostState.state)?' · '+hostState.message:''),
 snapshot:()=>({study:structuredClone(study),presentation:structuredClone(presentation),selectedId:selected?.id||null}),
 restore:s=>{searchRevision++;study=structuredClone(s.study);presentation=structuredClone(s.presentation);select(byId.get(s.selectedId)||null);syncControls();syncPresentationControls();updateAppearance();refresh(true);},
 reset:()=>$('reset').click(),all:()=>$('allSystems').click(),references:()=>$('openReferences').click(),references43:()=>$('open43References').click(),guided:openGuided,
 fullscreen:async()=>{try{if(document.fullscreenElement)await document.exitFullscreen();else await document.getElementById('app').requestFullscreen();}catch(e){$('info').textContent=String(e.message||e);}},
 fit:()=>fit(),axis:id=>$(id).click(),zoom:f=>{camera.position.sub(controls.target).multiplyScalar(f).add(controls.target);controls.update();},
 pan:on=>{controls.mouseButtons.LEFT=on?THREE.MOUSE.PAN:THREE.MOUSE.ROTATE;},
 clear:()=>resetSelection(),isolate:()=>$('isolate').click(),hide:()=>$('hide').click(),focus:()=>$('focus').click(),
 restoreContext:()=>{resetSelection();$('restore').click();},
 fadeSelected:()=>{if(!selected)return;const faded={...presentation.faded};faded[selected.id]=!faded[selected.id];presentation={...presentation,faded};updateAppearance();},
 fadeOthers:()=>{presentation={...presentation,context:!presentation.context};syncPresentationControls();updateAppearance();},
 toggle:g=>{resetSelection();study.isolated=null;if(study.enabled.has(g))study.enabled.delete(g);else study.enabled.add(g);syncControls();refresh(true);},
 choose:chooseEntry
});
const initialized=init().finally(()=>{originalReady=true;originalUI?.render();});
let libraryRevision=0;
window.addEventListener('message',async event=>{
 if(location.hostname!=='127.0.0.1'||!validOpen(event,location.origin,window.parent,window))return;
 const command=event.data,tick=++libraryRevision;
 await initialized;if(tick!==libraryRevision)return;
 let result;
 try{
  if(!independent||hostState.state==='error')throw Error('Viewer independen belum siap.');
  result=await openKnownStructure(command,id=>byId.get(id),chooseEntry,e=>{
   if(selected?.id!==e.id)return false;
   const meshes=[...cache.values()].flatMap(o=>o.visible?o.userData.meshes.filter(m=>m.visible&&m.userData.materialKey?.startsWith('highlight:')):[]);
   if(!e.selectionOnly)return meshes.some(m=>m.userData.entry?.id===e.id);
   const keys=new Set(meshes.map(m=>m.userData.elementKey));return [...elementKeys(e)].every(k=>keys.has(k));
  });
 }catch(error){result={ok:false,message:String(error.message||error).slice(0,240)};}
 if(tick===libraryRevision)window.parent.postMessage({type:RESULT,version:1,requestId:command.requestId,structureId:command.structureId,...result},location.origin);
});
