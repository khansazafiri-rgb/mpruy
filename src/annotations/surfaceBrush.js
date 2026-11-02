import * as THREE from 'three';
import {triangleVertices} from './surfaceAnchor.js';
const topologyCache=new WeakMap();
export function surfaceTopology(mesh) {
 const g=mesh.geometry;if(topologyCache.has(g))return topologyCache.get(g);
 const p=g.attributes.position,vertices=[],canonical=[],byPosition=new Map();
 for(let i=0;i<p.count;i++) {
  const v=new THREE.Vector3().fromBufferAttribute(p,i),key=v.toArray().map(x=>Math.round(x*1e7)).join(',');
  if(!byPosition.has(key)){byPosition.set(key,vertices.length);vertices.push(v);}
  canonical.push(byPosition.get(key));
 }
 const count=(g.index?.count??p.count)/3,faces=[],neighbors=Array.from({length:count},()=>new Set()),edges=new Map(),graph=vertices.map(()=>new Map());
 for(let f=0;f<count;f++) {
  const ids=[0,1,2].map(i=>canonical[g.index?g.index.getX(f*3+i):f*3+i]);faces.push(ids);
  for(let i=0;i<3;i++) {
   const a=ids[i],b=ids[(i+1)%3],key=[Math.min(a,b),Math.max(a,b)].join(':');
   for(const prev of edges.get(key)||[]) {neighbors[f].add(prev);neighbors[prev].add(f);}
   if(!edges.has(key))edges.set(key,[]);edges.get(key).push(f);
   const length=vertices[a].distanceTo(vertices[b]);graph[a].set(b,length);graph[b].set(a,length);
  }
 }
 const result={vertices,faces,neighbors,graph};topologyCache.set(g,result);return result;
}
// Only connected, similarly facing facets within a world-space radius. No back-wall painting.
export function brushFaces(mesh,hit,radiusMeters) {
 const {neighbors}=surfaceTopology(mesh),selected=[],visited=new Set([hit.faceIndex]),queue=[hit.faceIndex];
 const normalMatrix=new THREE.Matrix3().getNormalMatrix(mesh.matrixWorld);
 const seed=hit.face.normal.clone().applyMatrix3(normalMatrix).normalize();
 for(let q=0;q<queue.length;q++) {
  const f=queue[q],vs=triangleVertices(mesh,f),center=vs[0].clone().add(vs[1]).add(vs[2]).divideScalar(3).applyMatrix4(mesh.matrixWorld);
  const normal=new THREE.Triangle(...vs).getNormal(new THREE.Vector3()).applyMatrix3(normalMatrix).normalize();
  if(f!==hit.faceIndex&&(center.distanceTo(hit.point)>radiusMeters||normal.dot(seed)<0.3))continue;
  selected.push(f);
  for(const other of neighbors[f])if(!visited.has(other)){visited.add(other);queue.push(other);}
 }
 return selected;
}
