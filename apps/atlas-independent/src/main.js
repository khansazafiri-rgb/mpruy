import * as THREE from 'three';
import {OrbitControls} from 'three/addons/controls/OrbitControls.js';
import {GLTFLoader} from 'three/addons/loaders/GLTFLoader.js';
import {groups,regions,validateInventory,matchesRegion,searchEntries} from './inventory.js';
import {layerLabels,initialStudy,baseVisible,displayed,buildAlternatives,revealEntry,materialKind} from './study-state.js';
import './style.css';
const $=id=>document.getElementById(id);
const base=import.meta.env.BASE_URL;
const colors={skeletal:0xe9dcc3,muscular:0xad4e50,joints:0x96bbc6,arterial:0xd43e48,venous:0x3e6cbb,heart:0xa93949,nervous:0xe7bd50,lymphatic:0x4b9c72,respiratory:0xd991a0,digestive:0xd39c87,urinary:0x9e4553,reproductive:0xcaa7a0,endocrine:0x9d82bf,brain:0xcaa7a0,spinalCord:0xe1c6b0,lymphNode:0x4b9c72,lymphTrunk:0x278b78,lymphVessel:0x83c9a3,spleen:0x875279,pleura:0xb3a0a7,airway:0x94c3bf};
const scene=new THREE.Scene(),body=new THREE.Group();scene.add(body);
scene.background=new THREE.Color(0x092b27);
const camera=new THREE.PerspectiveCamera(40,1,.001,100);camera.position.set(0,1,3);
const renderer=new THREE.WebGLRenderer({antialias:true});renderer.setPixelRatio(Math.min(devicePixelRatio,1.5));$('view').prepend(renderer.domElement);
const controls=new OrbitControls(camera,renderer.domElement);controls.enableDamping=true;
scene.add(new THREE.HemisphereLight(0xffffff,0x526c64,2.2));
const light=new THREE.DirectionalLight(0xffffff,2);light.position.set(2,3,4);scene.add(light);
const fill=new THREE.DirectionalLight(0xffffff,1);fill.position.set(-2,2,-3);scene.add(fill);
const materials=Object.fromEntries(Object.entries(colors).map(([g,color])=>[g,new THREE.MeshStandardMaterial({color,roughness:.82,side:THREE.DoubleSide})]));
const highlight=new THREE.MeshStandardMaterial({color:0xf9c65e,roughness:.6,side:THREE.DoubleSide});
const loader=new GLTFLoader(),cache=new Map(),failed=new Map(),inflight=new Map();
let entries=[],selected=null,study=initialStudy(),alternatives=new Map(),byId=new Map(),revision=0,searchRevision=0;
const counts=()=>{ $('count').textContent=[...cache.values()].filter(o=>o.visible).length+' terlihat · '+cache.size+' dimuat · '+failed.size+' gagal · '+entries.length+' kandidat. Bukan ukuran kelengkapan anatomi.';$('retry').disabled=!failed.size;$('restore').hidden=!study.isolated&&!study.hidden.size; };
const visible=e=>displayed(e,study,alternatives,id=>cache.has(id),byId);
function sync(){for(const obj of cache.values())obj.visible=visible(obj.userData.entry);counts();}
function select(e){
 if(selected&&cache.has(selected.id))cache.get(selected.id).traverse(m=>{if(m.isMesh)m.material=materials[materialKind(selected)];});
 selected=e;
 if(e&&cache.has(e.id))cache.get(e.id).traverse(m=>{if(m.isMesh)m.material=highlight;});
 $('selectionActions').hidden=!e;
 $('info').textContent=e?e.name+' · '+groups[e.group]+' · kandidat belum disetujui':'';
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
   g.scene.traverse(m=>{if(m.isMesh){for(const mat of [].concat(m.material||[]))mat?.dispose();m.material=materials[materialKind(e)];m.userData.entry=e;}});
   g.scene.userData.entry=e;g.scene.visible=visible(e);body.add(g.scene);cache.set(e.id,g.scene);failed.delete(e.id);
  }catch(error){failed.set(e.id,String(error.message||error));}
  finally{releaseLoad();inflight.delete(e.id);counts();}
 })();
 inflight.set(e.id,promise);return promise;
}
async function refresh(fitAfter=false){
 const tick=++revision;sync();
 const queue=entries.filter(e=>baseVisible(e,study)&&!cache.has(e.id)&&!failed.has(e.id));
 const work=async()=>{while(queue.length&&tick===revision)await load(queue.shift());};
 await Promise.all(Array.from({length:4},work));if(tick!==revision)return;sync();if(fitAfter)fit();
}
function fit(axis=new THREE.Vector3(0,0,1)){
 const bounds=new THREE.Box3();
 for(const obj of cache.values())if(obj.visible)bounds.union(obj.userData.bounds??=new THREE.Box3().setFromObject(obj));
 if(bounds.isEmpty())return;
 const center=bounds.getCenter(new THREE.Vector3()),size=bounds.getSize(new THREE.Vector3()),radius=Math.max(size.x,size.y,size.z,.01);
 controls.target.copy(center);const distance=radius/Math.max(.12,Math.tan(THREE.MathUtils.degToRad(camera.fov/2))*Math.min(camera.aspect,1));camera.position.copy(center).addScaledVector(axis,distance);camera.near=Math.max(radius*.0005,.00001);camera.far=radius*100;camera.updateProjectionMatrix();controls.update();
}
function resize(){const w=$('view').clientWidth,h=$('view').clientHeight;if(!w||!h)return;renderer.setSize(w,h);camera.aspect=w/h;camera.updateProjectionMatrix();}
new ResizeObserver(resize).observe($('view'));resize();renderer.setAnimationLoop(()=>{controls.update();renderer.render(scene,camera);});
$('front').onclick=()=>fit();$('side').onclick=()=>fit(new THREE.Vector3(-1,0,0));$('right').onclick=()=>fit(new THREE.Vector3(1,0,0));$('top').onclick=()=>fit(new THREE.Vector3(0,1,.0001).normalize());$('back').onclick=()=>fit(new THREE.Vector3(0,0,-1));$('fit').onclick=()=>fit();
const ray=new THREE.Raycaster(),pointer=new THREE.Vector2();let down=null;
renderer.domElement.addEventListener('pointerdown',ev=>down=[ev.clientX,ev.clientY]);
renderer.domElement.addEventListener('pointerup',ev=>{
 if(!down||Math.hypot(ev.clientX-down[0],ev.clientY-down[1])>5)return;
 const r=renderer.domElement.getBoundingClientRect();pointer.set((ev.clientX-r.left)/r.width*2-1,-(ev.clientY-r.top)/r.height*2+1);ray.setFromCamera(pointer,camera);
 const hit=ray.intersectObjects([...cache.values()].filter(o=>o.visible),true).find(x=>x.object.userData.entry);searchRevision++;select(hit?.object.userData.entry||null);
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
  row.className='system-row';c.type='checkbox';c.checked=study.enabled.has(id);c.disabled=!items.length;l.append(c,document.createTextNode(name+' ('+items.length+')'));row.append(l);
  c.onchange=()=>{resetSelection();study.isolated=null;if(c.checked)study.enabled.add(id);else study.enabled.delete(id);refresh(true);};
  if(layerLabels[id].length>1){
   const menu=document.createElement('select');menu.setAttribute('aria-label','Lapisan minimum '+name);
   for(const [i,label] of layerLabels[id].entries()){const o=document.createElement('option');o.value=String(i);o.textContent=i===0?'Semua lapisan':label+' ke atas';menu.append(o);}
   menu.value=String(study.minimumLayer[id]??0);menu.disabled=!items.length;
   menu.onchange=()=>{resetSelection();study.isolated=null;study.minimumLayer[id]=Number(menu.value);study.enabled.add(id);c.checked=true;refresh(true);};row.append(menu);
  }
  $('groups').append(row);
 }
}
function focus(e){
 const obj=cache.get(e.id);if(!obj)return;
 const box=obj.userData.bounds??=new THREE.Box3().setFromObject(obj),center=box.getCenter(new THREE.Vector3()),size=box.getSize(new THREE.Vector3());
 const radius=Math.max(size.length(),.012);controls.target.copy(center);camera.position.copy(center).add(new THREE.Vector3(0,0,radius/Math.max(.12,Math.tan(THREE.MathUtils.degToRad(camera.fov/2))*Math.min(camera.aspect,1))));
 camera.near=Math.max(radius*.0005,.000001);camera.far=Math.max(100,radius*100);camera.updateProjectionMatrix();controls.update();
}
$('focus').onclick=()=>{if(selected)focus(selected);};
$('isolate').onclick=()=>{if(!selected)return;searchRevision++;study.isolated=selected.id;sync();focus(selected);};
$('hide').onclick=()=>{if(!selected)return;study.hidden.add(selected.id);study.isolated=null;resetSelection();refresh();};
$('restore').onclick=()=>{study.hidden.clear();study.isolated=null;resetSelection();refresh(true);};
$('retry').onclick=()=>{failed.clear();refresh();};
$('allSystems').onclick=()=>{resetSelection();study.enabled=new Set(entries.map(e=>e.group));study.isolated=null;syncControls();refresh(true);};
$('reset').onclick=()=>{resetSelection();study=initialStudy();syncControls();refresh(true);};
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
 try{const r=await fetch(base+'inventory.json',{cache:'no-store'});if(!r.ok)throw Error('Tidak ada inventaris review');entries=validateInventory(await r.json(),location.hostname);byId=new Map(entries.map(e=>[e.id,e]));alternatives=buildAlternatives(entries);$('notice').textContent='Z-Anatomy sumber asli, kandidat privat. Hak per objek, kontinuitas dan ketepatan anatomi belum disetujui. Limfatik belum memiliki jaringan pembuluh.';groupControls();await refresh(true);}
 catch(error){$('notice').textContent=error.message;counts();}
}
init();
