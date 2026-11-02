import {it,expect,vi} from 'vitest';
import * as THREE from 'three';
import {readFileSync,statSync} from 'node:fs';
import {createHash} from 'node:crypto';
import {contextualBounds} from '../src/atlas/framing.js';
import {createSelectionGlow} from '../src/viewer/selectionGlow.js';
const publicUrl=new URL('../public/',import.meta.url);
it('context framing preserves the complete target and enough regional context for small structures',()=>{
 for(const regions of [['headNeck'],['thorax'],['upperLimb']]){
  const meta={box:[0,1,0,.001,1.02,.001],regions},box=contextualBounds(meta);
  expect(box.containsPoint(new THREE.Vector3(...meta.box.slice(0,3)))).toBe(true);expect(box.containsPoint(new THREE.Vector3(...meta.box.slice(3)))).toBe(true);expect(box.getSize(new THREE.Vector3()).x).toBeGreaterThan(.2);
 }
 const big=contextualBounds({box:[-1,0,-1,1,2,1],regions:['whole']});expect(big.containsBox(new THREE.Box3(new THREE.Vector3(-1,0,-1),new THREE.Vector3(1,2,1)))).toBe(true);
});
it('halo uses render-only shared geometry and cleans up without altering or disposing the original mesh',()=>{
 const geometry=new THREE.BoxGeometry(.1,.1,.1),mesh=new THREE.Mesh(geometry,new THREE.MeshStandardMaterial()),positions=geometry.attributes.position.array.slice(),dispose=vi.spyOn(geometry,'dispose');
 const release=createSelectionGlow([mesh]);expect(mesh.children).toHaveLength(2);const materials=mesh.children.map(shell=>vi.spyOn(shell.material,'dispose'));
 for(const shell of mesh.children){expect(shell.geometry).toBe(geometry);const hit=[];shell.raycast(null,hit);expect(hit).toEqual([]);expect(shell.material.depthWrite).toBe(false);expect(shell.material.depthTest).toBe(false);}
 release();expect(mesh.children).toHaveLength(0);expect(dispose).not.toHaveBeenCalled();for(const spy of materials)expect(spy).toHaveBeenCalledOnce();expect(geometry.attributes.position.array).toEqual(positions);
});
it('all selectable structures and regions have actual WebP previews tied to unchanged GLB sources',()=>{
 const manifest=JSON.parse(readFileSync(new URL('data/structure-thumbnails.json',publicUrl))),systems=JSON.parse(readFileSync(new URL('data/systems.json',publicUrl)));
 expect(Object.keys(manifest.structures)).toHaveLength(2827);expect(Object.keys(manifest.regions)).toHaveLength(8);
 const items=[...Object.values(manifest.structures),...Object.values(manifest.regions),manifest.hero];
 for(const item of items){const bytes=readFileSync(new URL(item.url,publicUrl));expect(bytes.subarray(0,4).toString()).toBe('RIFF');expect(bytes.subarray(8,12).toString()).toBe('WEBP');expect(statSync(new URL(item.url,publicUrl)).size).toBeGreaterThan(100);}
 for(const [system,hash] of Object.entries(manifest.models)){expect(systems[system]).toBeTruthy();expect(createHash('sha256').update(readFileSync(new URL('models/'+system+'.glb',publicUrl))).digest('hex')).toBe(hash);}
 for(const id of Object.values(systems).flat()){expect(manifest.structures[id]?.url).toBeTruthy();expect(manifest.structures[id]?.pixelCount).toBeGreaterThan(0);}
});
