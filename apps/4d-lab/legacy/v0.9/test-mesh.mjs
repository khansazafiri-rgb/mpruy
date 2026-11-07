import assert from 'node:assert/strict';import fs from 'node:fs';
import {readNrrdFile} from './nrrd.js';import {makeTransform,add,mul,sub,probePose,planePoint,dot} from './kinematics.js';
import {loadRegisteredMesh,raycast,contactFrame,cameraRay,parseGLB} from './mesh.js';
const bytes=fs.readFileSync(new URL('./assets/synthetic-patient.nrrd',import.meta.url));const v=await readNrrdFile(new File([bytes],'synthetic-patient.nrrd')),t=makeTransform(v);
const g=fs.readFileSync(new URL('./assets/patient.glb',import.meta.url)),buffer=g.buffer.slice(g.byteOffset,g.byteOffset+g.byteLength),meta=JSON.parse(fs.readFileSync(new URL('./assets/registration.json',import.meta.url)));
const mesh=await loadRegisteredMesh(buffer,meta,v,t);assert.equal(mesh.faces.length,14000);assert.equal(meta.qc.boundaryOrNonmanifoldEdges,0);
// Known synthetic landmarks: anterior chest, posterior spine region, lateral chest.
const known=[{origin:{x:0,y:50,z:-500},direction:{x:0,y:0,z:1},axis:'z',expected:-96,tolerance:15},{origin:{x:0,y:50,z:500},direction:{x:0,y:0,z:-1},axis:'z',expected:91,tolerance:15},{origin:{x:500,y:-100,z:0},direction:{x:-1,y:0,z:0},axis:'x',expected:106,tolerance:15}];
const results=[];
for(const ray of known){const h=raycast(mesh,ray);assert.ok(h);assert.ok(Math.abs(h.p[ray.axis]-ray.expected)<ray.tolerance,JSON.stringify(h.p));
 const w=t.localToWorld(h.p),ijk=t.worldToVoxel(w),ijk2=t.localToVoxel(h.p);assert.ok(Math.hypot(...ijk.map((v,i)=>v-ijk2[i]))<1e-8);
 assert.ok(dot(h.normal,ray.direction)<0,'normal must face exterior');
 // Exterior reconstructed from this CT: outer air and inward soft tissue.
 assert.ok(v.voxel(...t.localToVoxel(add(h.p,mul(h.normal,12))))<-500,'outside skin must be CT air');
 assert.ok(v.voxel(...t.localToVoxel(add(h.p,mul(h.normal,-12))))>-400,'inside skin must be CT tissue');
 const contact=contactFrame(h),base=probePose({contact,yaw:0,pitch:0,roll:0},t.dims),tilt=probePose({contact,yaw:.3,pitch:.52,roll:2.35},t.dims);
 assert.deepEqual(base.p,tilt.p);assert.ok(Math.hypot(...Object.values(sub(planePoint(base,190,170,.2,.8),planePoint(tilt,190,170,.2,.8))))>20);results.push({point:h.p,ijk,normal:h.normal});
}
assert.equal(raycast(mesh,{origin:{x:0,y:0,z:500},direction:{x:0,y:0,z:1}}),null);
// Refuse altered CT values, geometry and tampered meshes.
await assert.rejects(loadRegisteredMesh(buffer,meta,{...v,voxel:()=>123},t),/Sampel voxel/);
await assert.rejects(loadRegisteredMesh(buffer,{...meta,ijkToLPS:meta.ijkToLPS.map((x,i)=>i===3?x+5:x)},v,t),/Affine/);
const corrupt=buffer.slice(0);new Uint8Array(corrupt)[100]^=1;await assert.rejects(loadRegisteredMesh(corrupt,meta,v,t),/Hash/);
const camera={yaw:.3,pitch:.4,zoom:1,panX:0,panY:0};assert.ok(raycast(mesh,cameraRay(camera,t.dims,590,620,295,310)));
fs.writeFileSync(new URL('./MESH_TEST_RESULTS.json',import.meta.url),JSON.stringify({status:'passed',landmarks:'synthetic analytic chest/back/lateral regions; not human annotated CTACardio anatomy',results},null,2));
console.log('PASS: GLB registration/hash/source guard, synthetic chest/back/lateral skin-to-CT tissue/air, collision, normals, fixed contact and CT plane geometry.');
