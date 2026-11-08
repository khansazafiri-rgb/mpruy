import assert from 'node:assert/strict';
import {TAU,sub,dot,norm,makeTransform,surface,probePose,planePoint,moveOnSurface,cameraProject} from './kinematics.js';
const close=(a,b,tol=1e-5)=>assert.ok(Math.abs(a-b)<tol,`${a} != ${b}`);
const vol={sizes:[20,30,40],spacing:[2,3,4],axisVectors:[[0,-2,0],[3,0,0],[0,0,-4]],fields:{'space origin':'(10,20,30)'}};
const t=makeTransform(vol);for(const ijk of [[0,0,0],[12.3,7.2,19.4],[19,29,39]]){
 const world=t.voxelToWorld(...ijk),back=t.worldToVoxel(world);ijk.forEach((v,i)=>close(v,back[i]));
}
const dims={x:300,y:380,z:300};for(const a of [-TAU,-.000001,0,.000001,TAU,TAU+.000001]){
 const s=surface(a,.2,dims),p=probePose({az:a,height:.2,yaw:.2,pitch:.1,roll:.3},dims);
 for(const v of [s.p,s.normal,p.dir,p.lateral,planePoint(p,180,170,.3,.8)])assert.ok(Object.values(v).every(Number.isFinite));
 close(Math.hypot(...Object.values(s.normal)),1);assert.ok(dot(probePose({az:a,height:.2,yaw:0,pitch:0,roll:0},dims).dir,s.normal)<-.99);
 close(planePoint(p,180,170,.5,0).x,p.p.x);close(planePoint(p,180,170,.5,0).y,p.p.y);
}
const a=surface(0,.2,dims),b=surface(TAU,.2,dims);close(Math.hypot(...Object.values(sub(a.p,b.p))),0);close(Math.hypot(...Object.values(sub(a.normal,b.normal))),0);
const cam={yaw:.9,pitch:.25,zoom:1,panX:0,panY:0},view={w:590,h:620};
let p={az:0,height:0};p=moveOnSurface(p,-300,0,cam,dims,view);close(p.height,0);assert.ok(p.az<-.8);
let p2=moveOnSurface(p,-200,0,cam,dims,view);assert.ok(p2.az<p.az && p2.az< -Math.PI,'continued drag should reach posterior');
const seam=moveOnSurface({az:-TAU+.005,height:0},-10,0,cam,dims,view);assert.ok(seam.az< -TAU);
const high=moveOnSurface({az:0,height:0},100,0,{...cam,zoom:2},dims,view);const low=moveOnSurface({az:0,height:0},100,0,cam,dims,view);assert.ok(high.az<low.az);
const screen=cameraProject(cam,dims,view.w,view.h);assert.ok(Object.values(screen(a.p)).every(Number.isFinite));
const baseline=probePose({az:.6,height:.13,yaw:0,pitch:0,roll:0},dims);
const tilted=probePose({az:.6,height:.13,yaw:0,pitch:Math.PI/6,roll:0},dims);
const oblique=probePose({az:.6,height:.13,yaw:.24,pitch:Math.PI/6,roll:Math.PI/4},dims);
for(const changed of [tilted,oblique]){
 close(Math.hypot(...Object.values(sub(changed.p,baseline.p))),0);
 close(Math.hypot(...Object.values(sub(planePoint(changed,180,170,.5,0),baseline.p))),0);
 close(Math.hypot(...Object.values(changed.dir)),1);close(Math.hypot(...Object.values(changed.lateral)),1);
 close(dot(changed.dir,changed.lateral),0);
}
assert.ok(Math.hypot(...Object.values(sub(planePoint(baseline,180,170,.5,.8),planePoint(tilted,180,170,.5,.8))))>20);
assert.ok(Math.hypot(...Object.values(sub(planePoint(tilted,180,170,.1,.8),planePoint(oblique,180,170,.1,.8))))>20);
const vox0=t.localToVoxel(planePoint(baseline,180,170,.2,.7)),vox1=t.localToVoxel(planePoint(oblique,180,170,.2,.7));
assert.ok(Math.hypot(...vox0.map((v,i)=>v-vox1[i]))>5,'angle changes actual sampled voxel coordinates');
console.log('PASS: NRRD world↔voxel, 360° seam, fixed contact during pitch/yaw/roll, changed reslice voxels, posterior drag, zoom scale.');
