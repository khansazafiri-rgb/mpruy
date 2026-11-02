import {it,expect,vi} from 'vitest';
import * as THREE from 'three';
import {readFileSync,statSync} from 'node:fs';
import {createHash} from 'node:crypto';
import {contextualBounds} from '../src/atlas/framing.js';
import {createSelectionGlow,sweepAxisOf} from '../src/viewer/selectionGlow.js';
const publicUrl=new URL('../public/',import.meta.url);
it('context framing preserves the complete target and enough regional context for small structures',()=>{
 for(const regions of [['headNeck'],['thorax'],['upperLimb']]){
  const meta={box:[0,1,0,.001,1.02,.001],regions},box=contextualBounds(meta);
  expect(box.containsPoint(new THREE.Vector3(...meta.box.slice(0,3)))).toBe(true);expect(box.containsPoint(new THREE.Vector3(...meta.box.slice(3)))).toBe(true);expect(box.getSize(new THREE.Vector3()).x).toBeGreaterThan(.2);
 }
 const big=contextualBounds({box:[-1,0,-1,1,2,1],regions:['whole']});expect(big.containsBox(new THREE.Box3(new THREE.Vector3(-1,0,-1),new THREE.Vector3(1,2,1)))).toBe(true);
});
it('selection sweep is a render-only overlay on shared geometry and cleans up without touching the mesh',()=>{
 const geometry=new THREE.BoxGeometry(.1,.1,.1),mesh=new THREE.Mesh(geometry,new THREE.MeshStandardMaterial()),positions=geometry.attributes.position.array.slice(),dispose=vi.spyOn(geometry,'dispose'),frames=vi.fn();
 const release=createSelectionGlow([mesh],frames);expect(mesh.children).toHaveLength(1);expect(frames).toHaveBeenCalled();
 const overlay=mesh.children[0],spy=vi.spyOn(overlay.material,'dispose');
 expect(overlay.geometry).toBe(geometry);const hit=[];overlay.raycast(null,hit);expect(hit).toEqual([]);
 expect(overlay.material.depthWrite).toBe(false);expect(overlay.material.depthTest).toBe(true);expect(overlay.material.blending).toBe(THREE.AdditiveBlending);
 release();expect(mesh.children).toHaveLength(0);expect(dispose).not.toHaveBeenCalled();expect(spy).toHaveBeenCalledOnce();expect(geometry.attributes.position.array).toEqual(positions);
});
it('sweep travels along the long axis and starts at the upper end',()=>{
 const geometry=new THREE.CylinderGeometry(.01,.01,1,8,8),mesh=new THREE.Mesh(geometry,new THREE.MeshStandardMaterial());
 const {axis,span}=sweepAxisOf(geometry);expect(Math.abs(axis.y)).toBeGreaterThan(.99);expect(span).toBeCloseTo(1,2);
 createSelectionGlow([mesh]);const u=mesh.children[0].material.uniforms;
 // vAlong = (dot(p,axis)-min)/span must be 0 at the top (y=+.5) and 1 at the bottom (y=-.5).
 const along=y=>(new THREE.Vector3(0,y,0).dot(u.sweepAxis.value)-u.sweepMin.value)/u.sweepSpan.value;
 expect(along(.5)).toBeCloseTo(0,3);expect(along(-.5)).toBeCloseTo(1,3);
});
it('all selectable structures and regions have actual WebP previews tied to unchanged GLB sources',()=>{
 const manifest=JSON.parse(readFileSync(new URL('data/structure-thumbnails.json',publicUrl))),systems=JSON.parse(readFileSync(new URL('data/systems.json',publicUrl)));
 expect(Object.keys(manifest.structures)).toHaveLength(2827);expect(Object.keys(manifest.regions)).toHaveLength(8);
 const items=[...Object.values(manifest.structures),...Object.values(manifest.regions),manifest.hero];
 for(const item of items){const bytes=readFileSync(new URL(item.url,publicUrl));expect(bytes.subarray(0,4).toString()).toBe('RIFF');expect(bytes.subarray(8,12).toString()).toBe('WEBP');expect(statSync(new URL(item.url,publicUrl)).size).toBeGreaterThan(100);}
 for(const [system,hash] of Object.entries(manifest.models)){expect(systems[system]).toBeTruthy();expect(createHash('sha256').update(readFileSync(new URL('models/'+system+'.glb',publicUrl))).digest('hex')).toBe(hash);}
 for(const id of Object.values(systems).flat()){expect(manifest.structures[id]?.url).toBeTruthy();expect(manifest.structures[id]?.pixelCount).toBeGreaterThan(0);}
});
