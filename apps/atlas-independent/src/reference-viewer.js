import * as THREE from 'three';
import {OrbitControls} from 'three/addons/controls/OrbitControls.js';
import {GLTFLoader} from 'three/addons/loaders/GLTFLoader.js';
import {referenceEntries,filterReferences,requestTracker} from './reference-state.js';
const $=id=>document.getElementById(id);
function dispose(object){
 const resources=new Set();
 object.traverse(m=>{if(m.geometry)resources.add(m.geometry);for(const mat of [].concat(m.material||[])){if(!mat)continue;for(const v of Object.values(mat))if(v?.isTexture)resources.add(v);resources.add(mat);}});
 for(const r of resources)r.dispose();
}
export function mountReferences(base){
 const dialog=$('referenceDialog'),host=$('referenceViewport'),tracker=requestTracker();
 let entries=[],renderer=null,controls=null,camera=null,scene=null,model=null,observer=null,selected=null;
 const status=t=>$('referenceStatus').textContent=t;
 function cleanup(){
  tracker.cancel();observer?.disconnect();observer=null;
  if(model){dispose(model);model=null;}
  controls?.dispose();controls=null;
  if(renderer){renderer.setAnimationLoop(null);renderer.dispose();renderer.forceContextLoss();renderer.domElement.remove();renderer=null;}
  scene=null;camera=null;selected=null;
 }
 function fit(){
  if(!model||!camera)return;
  const box=new THREE.Box3().setFromObject(model);if(box.isEmpty())throw Error('Model referensi kosong');
  const center=box.getCenter(new THREE.Vector3()),size=box.getSize(new THREE.Vector3()),span=Math.max(size.length(),.00001);
  const distance=span/Math.max(.1,Math.tan(THREE.MathUtils.degToRad(camera.fov/2))*Math.min(camera.aspect,1));
  camera.near=Math.max(span*.0001,.0000001);camera.far=distance*100;camera.position.copy(center).add(new THREE.Vector3(0,0,distance));camera.updateProjectionMatrix();
  controls.target.copy(center);controls.update();
 }
 function createScene(){
  renderer=new THREE.WebGLRenderer({antialias:true});renderer.setPixelRatio(Math.min(devicePixelRatio,1.5));host.append(renderer.domElement);
  scene=new THREE.Scene();scene.background=new THREE.Color(0x092b27);camera=new THREE.PerspectiveCamera(40,1,.00001,100);camera.position.set(0,0,3);
  controls=new OrbitControls(camera,renderer.domElement);controls.enableDamping=true;
  scene.add(new THREE.HemisphereLight(0xffffff,0x526c64,2.4));
  const l=new THREE.DirectionalLight(0xffffff,2);l.position.set(2,3,4);scene.add(l);
  const resize=()=>{if(!renderer||!host.clientWidth||!host.clientHeight)return;renderer.setSize(host.clientWidth,host.clientHeight);camera.aspect=host.clientWidth/host.clientHeight;camera.updateProjectionMatrix();};
  observer=new ResizeObserver(resize);observer.observe(host);resize();
  renderer.setAnimationLoop(()=>{controls.update();renderer.render(scene,camera);});
 }
 async function load(e){
  const token=tracker.begin();selected=e;status('Memuat '+e.name+'…');
  $('referenceSource').href=e.source;$('referenceSource').textContent='Sumber GLB · '+e.version;
  if(model){scene.remove(model);dispose(model);model=null;}
  let candidate=null;
  try{
   const g=await new GLTFLoader().loadAsync(base+'hra-reference/'+e.id+'.glb');candidate=g.scene;
   if(!tracker.current(token)||!dialog.open){dispose(candidate);return;}
   let meshes=0;candidate.traverse(m=>{if(m.isMesh)meshes++;});if(!meshes)throw Error('Tidak ada mesh');
   model=candidate;scene.add(model);fit();status(e.name+' · '+e.version+' · '+meshes+' mesh dirender. Referensi terpisah; belum diregistrasi ke tubuh.');
  }catch(error){if(candidate){scene?.remove(candidate);dispose(candidate);if(model===candidate)model=null;}if(tracker.current(token))status('Referensi gagal dimuat: '+String(error.message||error));}
 }
 function list(){
  const select=$('referenceSelect');select.replaceChildren();
  for(const e of filterReferences(entries,$('referenceSearch').value)){
   const option=document.createElement('option');option.value=e.id;option.textContent=e.name+' · '+e.version;select.append(option);
  }
  if(selected&&[...select.options].some(o=>o.value===selected.id))select.value=selected.id;
  $('referenceLoad').disabled=!select.options.length;
 }
 $('referenceSearch').oninput=list;
 $('referenceLoad').onclick=()=>{const e=entries.find(x=>x.id===$('referenceSelect').value);if(e)load(e);};
 $('referenceFit').onclick=()=>fit();
 $('referenceClose').onclick=()=>dialog.close();dialog.addEventListener('close',cleanup);
 $('openReferences').onclick=async()=>{
  if(location.hostname!=='127.0.0.1'||dialog.open)return;
  dialog.showModal();$('referenceSource').removeAttribute('href');$('referenceSource').textContent='';entries=[];list();
  const token=tracker.begin();
  try{createScene();status('Memeriksa referensi sumber…');const response=await fetch(base+'hra-reference/inventory.json',{cache:'no-store'});if(!response.ok)throw Error('Cache HRA tidak tersedia');
   const data=referenceEntries(await response.json());if(!tracker.current(token)||!dialog.open)return;
   entries=data;list();status(entries.length+' kandidat referensi tersedia. Pilih organ dan klik Muat.');
  }catch(error){if(tracker.current(token))status(String(error.message||error));}
 };
}
