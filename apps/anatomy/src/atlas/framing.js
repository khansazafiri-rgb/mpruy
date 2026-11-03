import * as THREE from 'three';
export function contextualBounds(meta) {
 const box=new THREE.Box3(new THREE.Vector3(...meta.box.slice(0,3)),new THREE.Vector3(...meta.box.slice(3))),center=box.getCenter(new THREE.Vector3()),size=box.getSize(new THREE.Vector3());
 const floor=meta.regions.includes('headNeck') ? 0.30 : meta.regions.some(r=>['thorax','abdomen','back'].includes(r)) ? 0.38 : 0.24;
 const extent=Math.max(size.x,size.y,size.z)*1.65;
 return new THREE.Box3().setFromCenterAndSize(center,new THREE.Vector3(1,1,1).multiplyScalar(Math.max(floor,extent)));
}
