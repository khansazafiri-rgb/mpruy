// One picture per MEDCOEL system (skeletal, muscular, joints, cardiovascular, nervous, lymphatic,
// visceral) for the quiz and library system cards. Rendered from the existing meshes: the system in
// full colour, the skeleton as a faint outline where it gives the body its shape.
import * as THREE from 'three';
import {createScene} from '../src/viewer/createScene.js';
import {setViewer} from '../src/state/store.js';
import {loadModel,getMeshRegistry,ownMeshesOf} from '../src/viewer/loadModel.js';
const status=document.getElementById('status'),box=document.getElementById('renderBox'),viewer=createScene();
setViewer(viewer);viewer.renderer.setPixelRatio(1);viewer.renderer.localClippingEnabled=true;viewer.scene.background=new THREE.Color('#09382f');
const SIZE=256;
// Height bands (metres, model space) per system.
const BANDS={skeletal:[.86,1.92],muscular:[.9,1.92],joints:[.9,1.62],cardiovascular:[.98,1.62],nervous:[1.25,1.92],lymphatic:[.95,1.62],visceral:[.86,1.58]};
function size(){box.style.width=SIZE+'px';box.style.height=SIZE+'px';viewer.onResize();viewer.renderer.setPixelRatio(1);viewer.renderer.setSize(SIZE,SIZE,false);viewer.camera.aspect=1;viewer.camera.updateProjectionMatrix();}
function bounds(meshes){const b=new THREE.Box3();meshes.forEach(m=>{m.updateWorldMatrix(true,false);m.geometry.computeBoundingBox();b.union(m.geometry.boundingBox.clone().applyMatrix4(m.matrixWorld));});return b;}
function fit(b){const c=b.getCenter(new THREE.Vector3()),s=b.getSize(new THREE.Vector3()),cam=viewer.camera,d=new THREE.Vector3(.16,.03,1).normalize();
 const t=Math.tan(THREE.MathUtils.degToRad(cam.fov)/2),dist=Math.max(s.y/2/t,s.x/2/t)*1.06+s.z/2;
 cam.near=dist/200;cam.far=dist*20;cam.updateProjectionMatrix();cam.position.copy(c).addScaledVector(d,dist);cam.lookAt(c);cam.updateMatrixWorld();viewer.controls.target.copy(c);}
const solid=(m)=>{for(const mat of [m.material].flat()){mat.side=THREE.DoubleSide;mat.opacity=1;mat.transparent=false;mat.depthWrite=true;mat.needsUpdate=true;}};
const faint=(m)=>{m.material=[m.material].flat().map(mat=>{const c=mat.clone();c.transparent=true;c.opacity=.1;c.depthWrite=false;return c;});if(m.material.length===1)m.material=m.material[0];m.renderOrder=-1;};
async function save(id,image){const r=await fetch('/__previews',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({items:[{id:'__system:'+id,image}]})});if(!r.ok)throw Error(await r.text());}
document.getElementById('generate').onclick=async()=>{
 document.getElementById('generate').disabled=true;
 try{
  const [systems,catalog]=await Promise.all(['systems','atlas-catalog'].map(n=>fetch('/data/'+n+'.json').then(r=>r.json())));
  size();
  for(const system of Object.keys(systems)){await loadModel(system,viewer);status.textContent='Loaded '+system;}
  const meshesOf=(ids)=>ids.flatMap(ownMeshesOf);
  const all=meshesOf([...getMeshRegistry().keys()]);
  const skeleton=meshesOf(systems.skeletal);
  const ghostSkeleton=skeleton.map(m=>({m,material:m.material}));
  for(const system of Object.keys(systems)){
   all.forEach(m=>m.visible=false);
   const ids=systems[system].filter(id=>!(system==='muscular'&&catalog[id]?.layer===0));
   const own=meshesOf(ids);own.forEach(m=>{solid(m);m.visible=true;});
   if(system!=='skeletal'&&system!=='muscular'){skeleton.forEach(m=>{faint(m);m.visible=true;});}
   // Each picture centres on the part of the body where the system is easiest to recognise.
   const band=BANDS[system]||[0,3];
   viewer.renderer.clippingPlanes=[new THREE.Plane(new THREE.Vector3(0,1,0),-band[0]),new THREE.Plane(new THREE.Vector3(0,-1,0),band[1])];
   const b=bounds(own);b.min.y=Math.max(b.min.y,band[0]);b.max.y=Math.min(b.max.y,band[1]);
   fit(b);
   viewer.renderer.render(viewer.scene,viewer.camera);
   await save(system,viewer.canvas.toDataURL('image/webp',.86));
   ghostSkeleton.forEach(({m,material})=>{m.material=material;m.renderOrder=0;});
   status.textContent='Saved '+system;
  }
  const r=await fetch('/__finish-systems',{method:'POST',headers:{'Content-Type':'application/json'},body:'{}'});if(!r.ok)throw Error(await r.text());
  status.textContent='Complete: system pictures saved.';
 }catch(e){status.textContent='Failed: '+e.message;throw e;}
};
