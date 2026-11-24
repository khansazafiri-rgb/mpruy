import * as THREE from 'three';
import {OrbitControls} from 'three/addons/controls/OrbitControls.js';
import {GLTFLoader} from 'three/addons/loaders/GLTFLoader.js';
import {groups,regions,validateInventory,matchesRegion,searchEntries} from './inventory.js';
import './style.css';
const $=id=>document.getElementById(id);
const base=import.meta.env.BASE_URL;
const colors={skeletal:0xe9dcc3,muscular:0xad4e50,joints:0x96bbc6,arterial:0xd43e48,venous:0x3e6cbb,heart:0xa93949,nervous:0xe7bd50,lymphatic:0x4b9c72,respiratory:0xd991a0,digestive:0xd39c87,urinary:0x9e4553,reproductive:0xcaa7a0,endocrine:0x9d82bf};
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
const loader=new GLTFLoader(),cache=new Map(),failed=new Map(),inflight=new Map(),enabled=new Set(['skeletal']);
let entries=[],selected=null,region='whole',revision=0;
const counts=()=>$('count').textContent=cache.size+' dimuat · '+failed.size+' gagal · '+entries.length+' kandidat. Bukan ukuran kelengkapan anatomi.';
function visible(e){return enabled.has(e.group)&&matchesRegion(e,region);}
function sync(){for(const [id,obj] of cache)obj.visible=visible(obj.userData.entry);counts();}
function select(e){
 if(selected&&cache.has(selected.id))cache.get(selected.id).traverse(m=>{if(m.isMesh)m.material=materials[selected.group];});
 selected=e;
 if(e&&cache.has(e.id))cache.get(e.id).traverse(m=>{if(m.isMesh)m.material=highlight;});
 $('info').textContent=e?e.name+' · '+groups[e.group]+' · kandidat belum disetujui':'';
}
async function load(e){
 if(cache.has(e.id))return;
 if(inflight.has(e.id))return inflight.get(e.id);
 const promise=(async()=>{
  try{
   const g=await loader.loadAsync(base+e.path);
   g.scene.traverse(m=>{if(m.isMesh){for(const mat of [].concat(m.material||[]))mat?.dispose();m.material=materials[e.group];m.userData.entry=e;}});
   g.scene.userData.entry=e;g.scene.visible=visible(e);body.add(g.scene);cache.set(e.id,g.scene);failed.delete(e.id);
  }catch(error){failed.set(e.id,String(error.message||error));}
  finally{inflight.delete(e.id);counts();}
 })();
 inflight.set(e.id,promise);return promise;
}
async function refresh(fitAfter=false){
 const tick=++revision;sync();
 const queue=entries.filter(e=>visible(e)&&!cache.has(e.id)&&!failed.has(e.id));
 const work=async()=>{while(queue.length&&tick===revision)await load(queue.shift());};
 await Promise.all(Array.from({length:4},work));if(tick!==revision)return;sync();if(fitAfter)fit();
}
function fit(axis=new THREE.Vector3(0,0,1)){
 const bounds=new THREE.Box3();
 for(const obj of cache.values())if(obj.visible)bounds.union(new THREE.Box3().setFromObject(obj));
 if(bounds.isEmpty())return;
 const center=bounds.getCenter(new THREE.Vector3()),size=bounds.getSize(new THREE.Vector3()),radius=Math.max(size.x,size.y,size.z,.01);
 controls.target.copy(center);camera.position.copy(center).addScaledVector(axis,radius*2.1);camera.near=Math.max(radius*.0005,.00001);camera.far=radius*100;camera.updateProjectionMatrix();controls.update();
}
function resize(){const w=$('view').clientWidth,h=$('view').clientHeight;if(!w||!h)return;renderer.setSize(w,h);camera.aspect=w/h;camera.updateProjectionMatrix();}
new ResizeObserver(resize).observe($('view'));resize();renderer.setAnimationLoop(()=>{controls.update();renderer.render(scene,camera);});
$('front').onclick=()=>fit();$('side').onclick=()=>fit(new THREE.Vector3(1,0,0));$('back').onclick=()=>fit(new THREE.Vector3(0,0,-1));$('fit').onclick=()=>fit();
const ray=new THREE.Raycaster(),pointer=new THREE.Vector2();let down=null;
renderer.domElement.addEventListener('pointerdown',ev=>down=[ev.clientX,ev.clientY]);
renderer.domElement.addEventListener('pointerup',ev=>{
 if(!down||Math.hypot(ev.clientX-down[0],ev.clientY-down[1])>5)return;
 const r=renderer.domElement.getBoundingClientRect();pointer.set((ev.clientX-r.left)/r.width*2-1,-(ev.clientY-r.top)/r.height*2+1);ray.setFromCamera(pointer,camera);
 const hit=ray.intersectObjects([...cache.values()].filter(o=>o.visible),true).find(x=>x.object.userData.entry);select(hit?.object.userData.entry||null);
});
for(const [id,label] of Object.entries(regions)){const o=document.createElement('option');o.value=id;o.textContent=label;$('region').append(o);}
$('region').onchange=()=>{region=$('region').value;refresh(true);};
function groupControls(){
 $('groups').replaceChildren();
 for(const [id,name] of Object.entries(groups)){
  const count=entries.filter(e=>e.group===id).length,l=document.createElement('label'),c=document.createElement('input');c.type='checkbox';c.checked=enabled.has(id);c.disabled=!count;c.dataset.group=id;l.append(c,document.createTextNode(name+' ('+count+')'));$('groups').append(l);
  c.onchange=()=>{if(c.checked)enabled.add(id);else enabled.delete(id);refresh(true);};
 }
}
$('search').oninput=()=>{
 $('results').replaceChildren();
 for(const e of searchEntries(entries,$('search').value)){
  const b=document.createElement('button');b.textContent=e.name;b.onclick=async()=>{enabled.add(e.group);region='whole';$('region').value=region;groupControls();await load(e);await refresh();if(cache.has(e.id)){select(e);const box=new THREE.Box3().setFromObject(cache.get(e.id)),center=box.getCenter(new THREE.Vector3()),size=box.getSize(new THREE.Vector3());controls.target.copy(center);camera.position.copy(center).add(new THREE.Vector3(0,0,Math.max(size.length()*2,.04)));controls.update();}else $('info').textContent='Model gagal dimuat: '+e.name;};$('results').append(b);
 }
};
async function init(){
 groupControls();
 if(location.hostname!=='127.0.0.1'){ $('notice').textContent='Aplikasi ini belum disetujui untuk publikasi.';return; }
 try{const r=await fetch(base+'inventory.json',{cache:'no-store'});if(!r.ok)throw Error('Tidak ada inventaris review');entries=validateInventory(await r.json(),location.hostname);$('notice').textContent='Z-Anatomy sumber asli, kandidat privat. Hak per objek, kontinuitas dan ketepatan anatomi belum disetujui. Limfatik belum memiliki jaringan pembuluh.';groupControls();await refresh(true);}
 catch(error){$('notice').textContent=error.message;counts();}
}
init();
