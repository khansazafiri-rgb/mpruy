import * as THREE from 'three';
import {OrbitControls} from 'three/addons/controls/OrbitControls.js';
import {GLTFLoader} from 'three/addons/loaders/GLTFLoader.js';
import {referenceEntries,reference43Entries,filterReferences,requestTracker,sourceNodeComponents,isolateSourceComponent} from './reference-state.js';
const $=id=>document.getElementById(id);
function dispose(object){
 const resources=new Set();
 object.traverse(m=>{if(m.geometry)resources.add(m.geometry);for(const mat of [].concat(m.material||[])){if(!mat)continue;for(const v of Object.values(mat))if(v?.isTexture)resources.add(v);resources.add(mat);}});
 for(const r of resources)r.dispose();
}
export function mountReferences(base){
 const dialog=$('referenceDialog'),host=$('referenceViewport'),tracker=requestTracker();
 let sourceKind='hra',entries=[],renderer=null,controls=null,camera=null,scene=null,model=null,observer=null,selected=null,components=[],visibility=new Map(),activeComponent=null;
 const status=t=>$('referenceStatus').textContent=t;
 function clearComponents(){components=[];visibility.clear();activeComponent=null;$('referenceComponents').hidden=true;$('referenceComponentSearch').value='';$('referenceComponentSelect').replaceChildren();}
 function listComponents(){const select=$('referenceComponentSelect'),q=$('referenceComponentSearch').value.trim().toLowerCase();select.replaceChildren();for(const c of components.filter(c=>c.label.toLowerCase().includes(q)||String(c.index)===q)){const option=document.createElement('option');option.value=String(c.index);option.textContent=c.label+' · node '+c.index;select.append(option);}$('referenceComponentIsolate').disabled=!select.options.length;}
 function cleanup(){
  clearComponents();
  tracker.cancel();observer?.disconnect();observer=null;
  if(model){dispose(model);model=null;}
  controls?.dispose();controls=null;
  if(renderer){renderer.setAnimationLoop(null);renderer.dispose();renderer.forceContextLoss();renderer.domElement.remove();renderer=null;}
  scene=null;camera=null;selected=null;
 }
 function fit(){
  if(!model||!camera)return;
  const box=new THREE.Box3();if(activeComponent){model.updateMatrixWorld(true);for(const m of activeComponent.meshes){m.geometry.computeBoundingBox();if(m.geometry.boundingBox)box.union(m.geometry.boundingBox.clone().applyMatrix4(m.matrixWorld));}}else box.setFromObject(model);if(box.isEmpty())throw Error('Model referensi kosong');
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
  clearComponents();const token=tracker.begin();selected=e;status('Memuat '+e.name+'…');
  if(sourceKind==='bp43'){$('referenceSource').href='https://dbarchive.biosciencedbc.jp/en/bodyparts3d/';$('referenceSource').textContent='BodyParts3D / DBCLS · '+e.fmaId+' · '+e.bpId+' · '+e.fj+' · lisensi per versi belum disetujui';}else{$('referenceSource').href=e.source;$('referenceSource').textContent='Sumber GLB · '+e.version;}
  if(model){scene.remove(model);dispose(model);model=null;}
  let candidate=null;
  try{
   const g=await new GLTFLoader().loadAsync(base+(sourceKind==='bp43'?'bp3d43-reference/':'hra-reference/')+e.id+'.glb');candidate=g.scene;
   if(!tracker.current(token)||!dialog.open){dispose(candidate);return;}
   let meshes=0;candidate.traverse(m=>{if(m.isMesh)meshes++;});if(!meshes||sourceKind==='bp43'&&(meshes!==1||g.parser.json.extras?.source!=='Official BodyParts3D 4.3'||g.parser.json.nodes?.[0]?.extras?.officialElementFileId!==e.fj))throw Error('Identitas mesh referensi tidak sesuai');
   model=candidate;scene.add(model);components=sourceNodeComponents(g);model.traverse(m=>{if(m.isMesh)visibility.set(m,m.visible);});$('referenceComponents').hidden=!components.length;listComponents();fit();status(e.name+' · '+e.version+' · '+meshes+' mesh dirender · '+components.length+' node sumber teridentifikasi. Label node belum divalidasi klinis.');
  }catch(error){if(candidate){scene?.remove(candidate);dispose(candidate);if(model===candidate)model=null;}if(tracker.current(token)){clearComponents();status('Referensi gagal dimuat: '+String(error.message||error));}}
 }
 function list(){
  const select=$('referenceSelect');select.replaceChildren();
  for(const e of filterReferences(entries,$('referenceSearch').value)){
   const option=document.createElement('option');option.value=e.id;option.textContent=e.name+' · '+e.version;select.append(option);
  }
  if(selected&&[...select.options].some(o=>o.value===selected.id))select.value=selected.id;
  $('referenceLoad').disabled=!select.options.length;
 }
 $('referenceComponentSearch').oninput=listComponents;
 $('referenceComponentIsolate').onclick=()=>{const c=components.find(c=>String(c.index)===$('referenceComponentSelect').value);if(!c||!isolateSourceComponent([...visibility.keys()],c,visibility)){status('Komponen tidak dapat diisolasi secara tepat.');return;}activeComponent=c;fit();status(c.label+' · node sumber '+c.index+' · label belum divalidasi klinis.');};
 $('referenceComponentRestore').onclick=()=>{if(!model)return;isolateSourceComponent([...visibility.keys()],null,visibility);activeComponent=null;fit();status('Semua komponen sumber ditampilkan kembali. Referensi terpisah.');};
 $('referenceSearch').oninput=list;
 $('referenceLoad').onclick=()=>{const e=entries.find(x=>x.id===$('referenceSelect').value);if(e)load(e);};
 $('referenceFit').onclick=()=>fit();
 $('referenceClose').onclick=()=>dialog.close();dialog.addEventListener('close',cleanup);
 const open=async(kind)=>{
  if(location.hostname!=='127.0.0.1'||dialog.open)return;
  sourceKind=kind;$('referenceTitle').textContent=kind==='bp43'?'Referensi elemen BodyParts3D 4.3':'Referensi organ HRA';dialog.showModal();$('referenceSource').removeAttribute('href');$('referenceSource').textContent='';entries=[];list();
  const token=tracker.begin();
  try{createScene();status('Memeriksa referensi sumber…');const response=await fetch(base+(kind==='bp43'?'bp3d43-reference/':'hra-reference/')+'inventory.json',{cache:'no-store'});if(!response.ok)throw Error('Paket referensi belum tersedia pada preview ini');
   const doc=await response.json(),data=kind==='bp43'?reference43Entries(doc):referenceEntries(doc);if(!tracker.current(token)||!dialog.open)return;
   entries=data;list();status(entries.length+' kandidat referensi tersedia. Pilih referensi dan klik Muat.');
  }catch(error){if(tracker.current(token))status(String(error.message||error));}
 };
 $('openReferences').onclick=()=>open('hra');$('open43References').onclick=()=>open('bp43');
}
