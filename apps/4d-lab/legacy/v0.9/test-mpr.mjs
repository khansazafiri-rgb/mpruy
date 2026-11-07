import assert from 'node:assert/strict';
import {makeTransform,explorationPose,planePoint,sub,dot} from './kinematics.js';
const volume={sizes:[70,80,90],spacing:[2,3,4],axisVectors:[[2,0,0],[0,3,0],[0,0,4]],fields:{space:'left-posterior-superior','space origin':'(12,-30,8)'}};
const t=makeTransform(volume),s={free:{x:12,y:23,z:-31},pitch:0,yaw:0,roll:0};
const d=a=>a*Math.PI/180,mag=p=>Math.hypot(...Object.values(p));
const baseline=explorationPose(s,t,volume),origin=baseline.p;
assert.deepEqual(planePoint(baseline,180,160,.5,.5),origin);
for(const key of ['x','y','z']){const moved=explorationPose({...s,free:{...s.free,[key]:s.free[key]+25}},t,volume);assert.ok(Math.abs(mag(sub(t.localToWorld(moved.p),t.localToWorld(origin)))-25)<1e-8)}
for(const key of ['pitch','yaw','roll'])for(const a of [0,45,90,135,180,37.4,359.999,360]){
 const pose=explorationPose({...s,[key]:d(a)},t,volume);assert.deepEqual(pose.p,origin);assert.ok(Object.values(pose.lateral).every(Number.isFinite));assert.ok(Math.abs(dot(pose.dir,pose.lateral))<1e-8);
 if(a>0&&a<360&&a!==359.999)assert.ok(mag(sub(planePoint(pose,180,160,.2,.8),planePoint(baseline,180,160,.2,.8)))>1);
}
for(const [angles,normal] of [[[0,0],[0,1,0]],[[90,0],[0,0,1]],[[0,90],[1,0,0]]]){
 const p=explorationPose({...s,pitch:d(angles[0]),yaw:d(angles[1])},t,volume);assert.ok(Math.abs(Math.abs(dot(p.normal,{x:normal[0],y:normal[1],z:normal[2]}))-1)<1e-8);
}
const outside=explorationPose({...s,free:{x:999,y:999,z:999}},t,volume);assert.ok(t.localToVoxel(outside.p).some((v,i)=>v>volume.sizes[i]));
// Sheared geometry still preserves physical world millimetres.
const shear={...volume,axisVectors:[[2,0,0],[.6,3,0],[.1,.2,4]],spacing:[2,Math.hypot(.6,3),Math.hypot(.1,.2,4)]},st=makeTransform(shear),sp=explorationPose(s,st,shear);
const a=st.localToWorld(planePoint(sp,180,160,0,.5)),b=st.localToWorld(planePoint(sp,180,160,1,.5));assert.ok(Math.abs(mag(sub(a,b))-160)<1e-7);
console.log('PASS: MPR three translations, three rotations 0/45/90/135/180/custom, fixed pivot, plane normals, outside bounds and sheared physical width.');
