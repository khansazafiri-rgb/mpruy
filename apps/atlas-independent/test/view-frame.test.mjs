import test from 'node:test';
import assert from 'node:assert/strict';
import * as THREE from 'three';
import {viewFrame} from '../src/view-frame.js';
test('DBCLS native axes project superior up and anterior toward the camera',()=>{
 const f=viewFrame(true);
 assert.deepEqual(f.up,[0,0,1]);assert.deepEqual(f.front,[0,-1,0]);assert.deepEqual(f.back,[0,1,0]);
 assert.deepEqual(f.side,[-1,0,0]);assert.deepEqual(f.right,[1,0,0]);
 const c=new THREE.PerspectiveCamera(40,1,.001,100);
 c.up.set(...f.up);c.position.set(...f.front).multiplyScalar(4);c.lookAt(0,0,0);c.updateMatrixWorld();
 const project=p=>new THREE.Vector3(...p).project(c);
 assert(project([0,0,1]).y>project([0,0,-1]).y);
 assert(project([1,0,0]).x>project([-1,0,0]).x);
 assert(project([0,-1,0]).z<project([0,1,0]).z);
 assert(f.key[1]<0&&f.key[2]>0);assert(f.fill[1]>0&&f.fill[2]>0);
 assert(Math.abs(new THREE.Vector3(...f.top).normalize().dot(new THREE.Vector3(...f.up)))<1);
});
test('other sources retain their previous Y-up presentation',()=>{
 const f=viewFrame(false);assert.deepEqual(f.up,[0,1,0]);assert.deepEqual(f.front,[0,0,1]);assert.deepEqual(f.key,[2,3,4]);
});
