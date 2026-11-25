import test from 'node:test';
import assert from 'node:assert/strict';
import {GLTFLoader} from 'three/addons/loaders/GLTFLoader.js';
import {encodeNativeGlb} from '../../../scripts/independent-bp3d-export.mjs';
import {sourceNodeComponents,isolateSourceComponent} from '../src/reference-state.js';
test('GLTFLoader associates each component with its original node and mesh indices',async()=>{
 const part=id=>({id,positions:new Float32Array([0,0,0,1,0,0,0,1,0]),normals:new Float32Array([0,0,1,0,0,1,0,0,1]),omitted:0});
 const {bytes}=encodeNativeGlb([part('FJ1'),part('FJ2')],{});
 const gltf=await new GLTFLoader().parseAsync(bytes.buffer.slice(bytes.byteOffset,bytes.byteOffset+bytes.byteLength),'');
 const nodes=sourceNodeComponents(gltf);
 assert.deepEqual(nodes.map(x=>[x.index,x.label]),[[0,'FJ1'],[1,'FJ2']]);
 const meshes=nodes.flatMap(x=>x.meshes),original=new Map(meshes.map(m=>[m,m.visible]));
 assert(isolateSourceComponent(meshes,nodes[1],original));assert.equal(meshes[0].visible,false);assert.equal(meshes[1].visible,true);
 assert(isolateSourceComponent(meshes,null,original));assert(meshes.every(m=>m.visible));
});
test('duplicate source labels remain separate; absent association never substitutes runtime name',()=>{
 const parent={visible:true},a={name:'wrong',isMesh:true,parent,visible:true},b={name:'wrong',isMesh:true,parent,visible:true},c={name:'duplicated',isMesh:true,parent,visible:true};
 const gltf={scene:{traverse:fn=>[a,b,c].forEach(fn)},parser:{json:{nodes:[{name:'duplicated',mesh:0},{name:'duplicated',mesh:1}]},associations:new Map([[a,{nodes:0,meshes:0}],[b,{nodes:1,meshes:1}]])}};
 assert.deepEqual(sourceNodeComponents(gltf).map(n=>n.index),[0,1]);
 const original=new Map([[a,true],[b,false],[c,true]]);
 assert.equal(isolateSourceComponent([a,b,c],{meshes:[b]},original),false);
 assert.equal(a.visible,true);
});
