// Loaded only by the private Atlas build plugin. HRA models remain independent.
import * as THREE from 'three';
import {GLTFLoader} from 'three/examples/jsm/loaders/GLTFLoader.js';
import {OrbitControls} from 'three/examples/jsm/controls/OrbitControls.js';
const prefix='/anatomy/viewer/hra-reference/';
const el=(tag,text)=>{const node=document.createElement(tag);if(text)node.textContent=text;return node;};
const style=(e,s)=>Object.assign(e.style,s);
function release(model){
 if(!model)return;
 const geometries=new Set(),materials=new Set(),textures=new Set();
 model.traverse(o=>{if(o.geometry)geometries.add(o.geometry);for(const m of [].concat(o.material||[]))if(m)materials.add(m);});
 for(const m of materials){for(const k of Object.keys(m))if(m[k]?.isTexture)textures.add(m[k]);m.dispose();}
 for(const t of textures)t.dispose();for(const g of geometries)g.dispose();
}
export function mountHraReference(){
 if(location.hostname!=='127.0.0.1'||new URLSearchParams(location.search).get('privateExpansion')!=='1')return;
 if(document.getElementById('medcoel-hra-reference'))return;
 const btn=el('button','Referensi organ 3D (HRA)');btn.id='medcoel-hra-reference';
 style(btn,{position:'fixed',top:'76px',right:'12px',zIndex:'90',padding:'8px 12px',border:'1px solid #678b83',borderRadius:'10px',background:'#143a34',color:'#fff',font:'inherit',cursor:'pointer'});
 document.body.append(btn);
 let active=null;
 btn.onclick=async()=>{
  if(active)return;
  const dialog=el('dialog');active=dialog;
  style(dialog,{width:'min(920px,94vw)',height:'min(720px,85vh)',maxWidth:'94vw',maxHeight:'85vh',background:'#102e29',color:'#eef5f1',border:'1px solid #69877c',borderRadius:'16px',padding:'16px',boxSizing:'border-box',overflow:'hidden'});
  const header=el('div');style(header,{display:'flex',alignItems:'center',justifyContent:'space-between',gap:'8px'});
  header.append(el('strong','MEDCOEL · Referensi organ HRA'));
  const close=el('button','Tutup');style(close,{background:'#204740',color:'#fff',border:'1px solid #69877c',padding:'7px 12px',borderRadius:'8px',cursor:'pointer',font:'inherit'});close.onclick=()=>dialog.close();header.append(close);
  const note=el('p','Pratinjau privat. Organ HRA menggunakan koordinat sumber tersendiri; tidak diregistrasikan ke tubuh BP3D atau Z-Anatomy. Bukan CT/USG dan belum disetujui untuk distribusi.');
  style(note,{fontSize:'13px',margin:'8px 0'});
  const select=el('select');select.setAttribute('aria-label','Pilih organ referensi');style(select,{width:'100%',padding:'8px',borderRadius:'6px',background:'#173e36',color:'#eef5f1',border:'1px solid #69877c',font:'inherit'});
  const status=el('p','Membaca inventaris lokal…');style(status,{fontSize:'13px',margin:'6px 0'});
  const viewport=el('div');style(viewport,{height:'calc(100% - 140px)',minHeight:'180px',background:'#0c221f',borderRadius:'8px',overflow:'hidden'});
  dialog.append(header,note,select,status,viewport);document.body.append(dialog);dialog.showModal();
  let renderer,controls,observer,model,request=0,closed=false,scene,camera;
  const cleanup=()=>{closed=true;request++;observer?.disconnect();renderer?.setAnimationLoop(null);controls?.dispose();release(model);renderer?.dispose();renderer?.forceContextLoss();dialog.remove();active=null;};
  dialog.addEventListener('close',cleanup,{once:true});
  try{
   const response=await fetch(prefix+'inventory.json',{cache:'no-store'});if(!response.ok)throw Error('Inventaris HRA belum tersedia');
   const {items}=await response.json();if(closed)return;if(!items?.length)throw Error('Tidak ada GLB HRA yang lulus checksum');
   scene=new THREE.Scene();camera=new THREE.PerspectiveCamera(40,1,.01,100);
   renderer=new THREE.WebGLRenderer({antialias:true});renderer.setPixelRatio(Math.min(devicePixelRatio,2));renderer.setClearColor(0x0c221f);viewport.append(renderer.domElement);
   scene.add(new THREE.HemisphereLight(0xffffff,0x82918c,2));
   const key=new THREE.DirectionalLight(0xffffff,2);key.position.set(3,4,5);scene.add(key);
   const fill=new THREE.DirectionalLight(0xffffff,1);fill.position.set(-3,1,-4);scene.add(fill);
   controls=new OrbitControls(camera,renderer.domElement);controls.enableDamping=true;
   const resize=()=>{const w=viewport.clientWidth,h=viewport.clientHeight;if(w&&h){renderer.setSize(w,h);camera.aspect=w/h;camera.updateProjectionMatrix();}};
   observer=new ResizeObserver(resize);observer.observe(viewport);resize();
   renderer.setAnimationLoop(()=>{controls.update();renderer.render(scene,camera);});
   for(const item of items){const o=el('option',item.name+' · '+item.version);o.value=item.id;select.append(o);}
   const loader=new GLTFLoader();
   const show=async()=>{
    const ticket=++request,item=items.find(x=>x.id===select.value);if(!item||!/^[a-f0-9]{24}$/.test(item.id))return;
    status.textContent='Memuat '+item.name+'…';
    try{
     const gltf=await loader.loadAsync(prefix+item.id+'.glb');
     if(closed||ticket!==request){release(gltf.scene);return;}
     const box=new THREE.Box3().setFromObject(gltf.scene),size=box.getSize(new THREE.Vector3()),center=box.getCenter(new THREE.Vector3());
     const radius=Math.max(size.x,size.y,size.z);
     if(box.isEmpty()||!Number.isFinite(radius)||radius<=0){release(gltf.scene);throw Error('Batas geometri tidak valid');}
     if(model){scene.remove(model);release(model);}
     model=gltf.scene;scene.add(model);
     // Frame the camera only. Do not transform source geometry or imply registration.
     const distance=radius*2.4;
     camera.near=Math.max(radius*.001,1e-8);camera.far=radius*100;camera.position.copy(center).add(new THREE.Vector3(distance*.6,distance*.3,distance));
     controls.target.copy(center);controls.minDistance=radius*.1;controls.maxDistance=radius*15;camera.updateProjectionMatrix();controls.update();
     status.textContent=item.name+' · '+item.meshCount+' mesh · '+item.version+' · sumber HRA, frame terpisah';
    }catch(e){if(!closed&&ticket===request)status.textContent='Gagal memuat: '+e.message;}
   };
   select.onchange=show;const lung=items.find(x=>x.name==='lung male');if(lung)select.value=lung.id;await show();
  }catch(e){if(!closed)status.textContent=e.message;}
 };
}
