import * as THREE from 'three';
import {reconstructLocal,triangleVertices} from './surfaceAnchor.js';
import {surfacePath} from './surfaceLine.js';
export function createAnnotationOverlay(viewer,resolve) {
 let root=null,anchor=null,mesh=null;
 const container=viewer.canvas.parentElement,layer=document.createElement('div');layer.className='annotation-label-layer';layer.hidden=true;
 layer.innerHTML='<svg aria-hidden="true"><defs><marker id="annotation-arrow" markerWidth="8" markerHeight="8" refX="7" refY="4" orient="auto"><path d="M0 0L8 4L0 8Z" fill="#087f8c"/></marker></defs><line marker-end="url(#annotation-arrow)" stroke="#087f8c" stroke-width="2"/></svg><span class="annotation-label"></span>';
 container.append(layer);const label=layer.querySelector('span'),line=layer.querySelector('line');
 function clear() {
  if(root){root.removeFromParent();root.traverse(o=>{o.geometry?.dispose();if(o.material)o.material.dispose();});}
  root=null;anchor=null;mesh=null;layer.hidden=true;viewer.render();
 }
 function display(landmark) {
  clear();const g=landmark?.geometry;if(!g)return;
  anchor=g.anchor||g.anchors?.[0];if(!anchor)return;
  const entry=resolve(anchor.surface);mesh=entry.mesh;root=new THREE.Group();mesh.add(root);
  const local=reconstructLocal(mesh,anchor,entry.identity),scale=mesh.getWorldScale(new THREE.Vector3()).x||1;
  const marker=new THREE.Mesh(new THREE.SphereGeometry(.0018/scale,12,10),new THREE.MeshBasicMaterial({color:0x087f8c,depthTest:false}));marker.position.copy(local);marker.renderOrder=12;root.add(marker);
  if(landmark.representation==='surface_region'&&g.faceIndices.length) {
   const positions=[];
   for(const f of g.faceIndices){const vs=triangleVertices(mesh,f),n=new THREE.Triangle(...vs).getNormal(new THREE.Vector3()).multiplyScalar(.00015/scale);vs.forEach(v=>positions.push(...v.add(n).toArray()));}
   const geometry=new THREE.BufferGeometry();geometry.setAttribute('position',new THREE.Float32BufferAttribute(positions,3));geometry.computeVertexNormals();
   const region=new THREE.Mesh(geometry,new THREE.MeshBasicMaterial({color:0x12a9a4,transparent:true,opacity:.72,side:THREE.DoubleSide,depthWrite:false,polygonOffset:true,polygonOffsetFactor:-2}));region.renderOrder=8;root.add(region);
  }
  if(landmark.representation==='surface_line'&&g.anchors.length>=2) {
   const path=surfacePath(mesh,g.anchors,entry.identity),geometry=new THREE.BufferGeometry().setFromPoints(path);
   const line3d=new THREE.Line(geometry,new THREE.LineBasicMaterial({color:0x087f8c,depthTest:true,polygonOffset:true,polygonOffsetFactor:-2}));line3d.renderOrder=9;root.add(line3d);
   for(const a of g.anchors.slice(1)){const dot=marker.clone();dot.geometry=marker.geometry.clone();dot.material=marker.material.clone();dot.position.copy(reconstructLocal(mesh,a,entry.identity));root.add(dot);}
  }
  label.textContent=landmark.name_en;viewer.render();
 }
 const off=viewer.onFrame(()=>{
  if(!anchor||!mesh||!root)return;
  let visible=mesh.visible;for(let p=mesh.parent;p;p=p.parent)visible&&=p.visible;
  const entry=resolve(anchor.surface),world=mesh.localToWorld(reconstructLocal(mesh,anchor,entry.identity)),screen=world.clone().project(viewer.camera);
  layer.hidden=!visible||screen.z < -1||screen.z>1||Math.abs(screen.x)>1||Math.abs(screen.y)>1;if(layer.hidden)return;
  const width=viewer.canvas.clientWidth,height=viewer.canvas.clientHeight,x=(screen.x*.5+.5)*width,y=(-screen.y*.5+.5)*height;
  const lx=Math.max(8,Math.min(width-label.offsetWidth-8,x+58)),ly=Math.max(8,Math.min(height-label.offsetHeight-8,y-65));
  label.style.transform=`translate(${lx}px,${ly}px)`;
  line.setAttribute('x1',lx+8);line.setAttribute('y1',ly+label.offsetHeight/2);line.setAttribute('x2',x);line.setAttribute('y2',y);
 });
 return {display,clear,dispose(){off();clear();layer.remove();}};
}
