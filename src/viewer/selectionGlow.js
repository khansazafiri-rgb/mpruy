import * as THREE from 'three';
// A temporary render-only shell. It remains readable through faded surrounding anatomy. Shares geometry without changing a vertex/index.
export function createSelectionGlow(meshes) {
 const shells=[];
 for(const mesh of meshes){mesh.updateWorldMatrix(true,false);const extent=new THREE.Box3().setFromObject(mesh).getSize(new THREE.Vector3()).length();const width=THREE.MathUtils.clamp(extent*.008,.0006,.0025);
  for(const [factor,opacity] of [[1,.65],[2.4,.18]]){
   const material=new THREE.ShaderMaterial({uniforms:{haloWidth:{value:width*factor},haloOpacity:{value:opacity},haloColor:{value:new THREE.Color('#63ffe0')}},vertexShader:'uniform float haloWidth; varying vec3 haloNormal; varying vec3 haloView; void main(){vec4 p=modelViewMatrix*vec4(position,1.0);haloNormal=normalize(normalMatrix*normal);p.xyz+=haloNormal*haloWidth;haloView=-p.xyz;gl_Position=projectionMatrix*p;}',fragmentShader:'uniform vec3 haloColor;uniform float haloOpacity;varying vec3 haloNormal;varying vec3 haloView;void main(){float rim=pow(1.0-abs(dot(normalize(haloNormal),normalize(haloView))),1.6);gl_FragColor=vec4(haloColor,haloOpacity*(0.15+rim*0.85));}',side:THREE.BackSide,transparent:true,depthWrite:false,depthTest:false,blending:THREE.AdditiveBlending,toneMapped:false});
   const shell=new THREE.Mesh(mesh.geometry,material);shell.name='MEDCOEL selection halo';shell.renderOrder=20;shell.raycast=()=>{};mesh.add(shell);shells.push(shell);
  }
 }
 return ()=>{for(const shell of shells){shell.removeFromParent();shell.material.dispose();}};
}
