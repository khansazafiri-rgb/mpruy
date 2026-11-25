import test from 'node:test';
import assert from 'node:assert/strict';
import {GLTFLoader} from 'three/addons/loaders/GLTFLoader.js';
import {encodeNativeGlb} from '../../../scripts/independent-bp3d-export.mjs';
import {validateElementCatalog,elementKey,elementKeys,meshElementId,hasExactElements} from '../src/element-selection.js';
const a={id:'bp-'+'a'.repeat(24),fmaId:'FMA1',group:'nervous'},b={id:'bp-'+'b'.repeat(24),fmaId:'FMA2',group:'nervous'};
const e={id:'sel-'+'c'.repeat(24),fmaId:'FMA3',bpId:'BP3',name:'nerve',group:'nervous',sourceTree:'isa',regions:['whole'],selectionOnly:true,bindings:[{ownerId:a.id,elementId:'FJ1'},{ownerId:b.id,elementId:'FJ2'}],clinicalValidation:false,approvedForDistribution:false,classificationProvisional:true};
const doc=items=>({schema:1,publicRelease:'NO_GO',clinicalValidation:false,items});
test('accept only unique same-group known body owners and exact element identities',()=>{
 assert.deepEqual(validateElementCatalog(doc([e]),[a,b]),[e]);
 assert.throws(()=>validateElementCatalog(doc([{...e,bindings:[{ownerId:'unknown',elementId:'FJ1'}]}]),[a,b]));
 assert.throws(()=>validateElementCatalog(doc([{...e,bindings:[e.bindings[0],e.bindings[0]]}]),[a,b]));
 assert.throws(()=>validateElementCatalog(doc([e]),[a,{...b,group:'heart'}]));
 assert.throws(()=>validateElementCatalog(doc([{...e,approvedForDistribution:true}]),[a,b]));
 assert.deepEqual(elementKeys(e),new Set([elementKey(a.id,'FJ1'),elementKey(b.id,'FJ2')]));
});
test('never treat a mesh name alone or an incomplete load as exact evidence',()=>{
 assert.equal(meshElementId({name:'FJ1',userData:{}}),null);
 assert.equal(meshElementId({userData:{officialElementFileId:'FJ1'}}),'FJ1');
 assert.equal(hasExactElements(e,new Map([[a.id,new Set(['FJ1'])]])),false);
 assert.equal(hasExactElements(e,new Map([[a.id,new Set(['FJ1'])],[b.id,new Set(['FJ2'])]])),true);
});
test('actual GLTFLoader preserves publisher element identities from native GLB node extras',async()=>{
 const make=id=>({id,positions:new Float32Array([0,0,0,1,0,0,0,1,0]),normals:new Float32Array([0,0,1,0,0,1,0,0,1]),omitted:0});
 const {bytes}=encodeNativeGlb([make('FJ1'),make('FJ2')],{});
 const buffer=bytes.buffer.slice(bytes.byteOffset,bytes.byteOffset+bytes.byteLength);
 const gltf=await new GLTFLoader().parseAsync(buffer,'');
 const ids=[];gltf.scene.traverse(m=>{if(m.isMesh)ids.push(meshElementId(m));});
 assert.deepEqual(ids.sort(),['FJ1','FJ2']);
});
