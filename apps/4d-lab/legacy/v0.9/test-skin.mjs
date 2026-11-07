import assert from 'node:assert/strict';
import fs from 'node:fs';
import {readNrrdFile} from './nrrd.js';
import {makeTransform,probePose,planePoint,sub} from './kinematics.js';
import {extractSkin} from './skin.js';
const b=fs.readFileSync(new URL('./demo-phantom.nrrd',import.meta.url));
const volume=await readNrrdFile(new File([b],'demo-phantom.nrrd'));
const transform=makeTransform(volume),{model,reason}=extractSkin(volume,transform);
assert.ok(model,reason);assert.equal(model.source,'estimated-ct');
for(const h of [-.8,0,.8]){
 const p=model.point(0,h),q=model.point(Math.PI*2,h);
 assert.ok(Math.hypot(...Object.values(sub(p,q)))<1e-7,'surface seam');
 const pose0=probePose({az:.5,height:h,yaw:0,pitch:0,roll:0},transform.dims,model);
 const pose1=probePose({az:.5,height:h,yaw:.25,pitch:.5,roll:2.35},transform.dims,model);
 assert.ok(Math.hypot(...Object.values(sub(pose0.p,pose1.p)))<1e-8,'fixed skin contact');
 assert.ok(Math.hypot(...Object.values(sub(planePoint(pose0,180,150,.2,.9),planePoint(pose1,180,150,.2,.9))))>20);
}
const full={sizes:[20,20,20],spacing:[1,1,1],voxel:()=>50,kind:'nrrd'};
assert.equal(extractSkin(full,makeTransform(full)).model,null,'clipped volume must not masquerade as skin');
const free=probePose({mode:'free',free:{x:20,y:15,z:-11},yaw:0,pitch:0,roll:0},transform.dims,model);
assert.deepEqual(free.p,{x:20,y:15,z:-11});
assert.deepEqual(planePoint(free,150,120,.5,0),free.p);
console.log('PASS: voxel-derived skin, finite seam, fixed contact, rejection of clipped CT, free volume pivot.');
