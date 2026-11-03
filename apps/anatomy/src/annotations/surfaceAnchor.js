import * as THREE from 'three';
import {validateAnchor,validateSurface} from './schema.js';
export function triangleVertices(mesh,faceIndex) {
 const g=mesh.geometry,p=g.attributes.position,count=(g.index?.count??p.count)/3;
 if(!Number.isInteger(faceIndex)||faceIndex<0||faceIndex>=count) throw Error('Triangle is outside this geometry');
 return [0,1,2].map(i=>new THREE.Vector3().fromBufferAttribute(p,g.index?g.index.getX(faceIndex*3+i):faceIndex*3+i));
}
export async function geometryIdentity(mesh,partId,primitiveIndex) {
 const g=mesh.geometry,p=g.attributes.position;
 const arrays=[p.array,...(g.index?[g.index.array]:[])];
 const header=new TextEncoder().encode(JSON.stringify([p.itemSize,p.count,g.index?.array.constructor.name||'none']));
 const bytes=new Uint8Array(header.length+arrays.reduce((s,a)=>s+a.byteLength,0));bytes.set(header);let offset=header.length;
 for(const a of arrays) {bytes.set(new Uint8Array(a.buffer,a.byteOffset,a.byteLength),offset);offset+=a.byteLength;}
 const digest=await crypto.subtle.digest('SHA-256',bytes);
 return {partId,primitiveId:`${partId}/primitive:${primitiveIndex}`,geometryHash:Array.from(new Uint8Array(digest),v=>v.toString(16).padStart(2,'0')).join(''),triangleCount:(g.index?.count??p.count)/3};
}
export function surfaceAnchor(hit,surface) {
 validateSurface(surface);
 const mesh=hit.object,[a,b,c]=triangleVertices(mesh,hit.faceIndex);
 mesh.updateWorldMatrix(true,false);
 const local=mesh.worldToLocal(hit.point.clone());
 const bary=new THREE.Triangle(a,b,c).getBarycoord(local,new THREE.Vector3());
 if(!bary) throw Error('Degenerate surface triangle');
 const normal=new THREE.Triangle(a,b,c).getNormal(new THREE.Vector3());
 const anchor={surface:{...surface},faceIndex:hit.faceIndex,barycentric:bary.toArray(),localPoint:local.toArray(),worldPoint:hit.point.toArray(),normal:normal.toArray()};
 validateAnchor(anchor); return anchor;
}
export function reconstructLocal(mesh,anchor,identity) {
 validateAnchor(anchor);
 if(anchor.surface.primitiveId!==identity.primitiveId||anchor.surface.geometryHash!==identity.geometryHash||anchor.surface.triangleCount!==identity.triangleCount) throw Error('Geometry identity changed; remap on the current mesh');
 const [a,b,c]=triangleVertices(mesh,anchor.faceIndex),w=anchor.barycentric;
 return a.multiplyScalar(w[0]).addScaledVector(b,w[1]).addScaledVector(c,w[2]);
}
export function reconstructWorld(mesh,anchor,identity) {
 mesh.updateWorldMatrix(true,false);return mesh.localToWorld(reconstructLocal(mesh,anchor,identity));
}
export function validateOnMesh(mesh,anchor,identity) {
 const p=reconstructLocal(mesh,anchor,identity);
 if(p.distanceTo(new THREE.Vector3(...anchor.localPoint))>1e-5) throw Error('Anchor local point does not match its barycentric surface');
 return p;
}
