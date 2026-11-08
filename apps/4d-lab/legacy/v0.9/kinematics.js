// Pure geometry: local scanner coordinates are millimetres, with I->x, K->y, J->z.
export const TAU=Math.PI*2;
export const clamp=(v,a,b)=>Math.max(a,Math.min(b,v));
export const add=(a,b)=>({x:a.x+b.x,y:a.y+b.y,z:a.z+b.z});
export const sub=(a,b)=>({x:a.x-b.x,y:a.y-b.y,z:a.z-b.z});
export const mul=(a,s)=>({x:a.x*s,y:a.y*s,z:a.z*s});
export const dot=(a,b)=>a.x*b.x+a.y*b.y+a.z*b.z;
export const cross=(a,b)=>({x:a.y*b.z-a.z*b.y,y:a.z*b.x-a.x*b.z,z:a.x*b.y-a.y*b.x});
export const norm=a=>{const n=Math.hypot(a.x,a.y,a.z);return n>1e-9?mul(a,1/n):{x:0,y:1,z:0}};
export const wrap=a=>((a%TAU)+TAU)%TAU;
export const shortest=(a,b)=>Math.atan2(Math.sin(b-a),Math.cos(b-a));
export const rotate=(v,axis,r)=>{const u=norm(axis),c=Math.cos(r),s=Math.sin(r);return add(add(mul(v,c),mul(cross(u,v),s)),mul(u,dot(u,v)*(1-c)))};
const point=a=>({x:a[0],y:a[1],z:a[2]});
export function makeTransform(volume){
 const [ni,nj,nk]=volume.sizes,[si,sj,sk]=volume.spacing;
 const d=volume.axisVectors?.map(point)??[{x:si,y:0,z:0},{x:0,y:0,z:sj},{x:0,y:sk,z:0}];
 const originText=volume.fields?.['space origin'];
 const parsed=originText?.match(/^\(\s*([^,]+),\s*([^,]+),\s*([^)]*)\)$/)?.slice(1).map(Number);
 const origin=parsed?.length===3&&parsed.every(Number.isFinite)?point(parsed):{x:0,y:0,z:0};
 const determinant=dot(d[0],cross(d[1],d[2]));
 if(!Number.isFinite(determinant)||Math.abs(determinant)<1e-8)throw Error('Matriks orientasi NRRD singular.');
 const reciprocal=[mul(cross(d[1],d[2]),1/determinant),mul(cross(d[2],d[0]),1/determinant),mul(cross(d[0],d[1]),1/determinant)];
 const center=add(origin,add(add(mul(d[0],(ni-1)/2),mul(d[1],(nj-1)/2)),mul(d[2],(nk-1)/2)));
 const basis=[norm(d[0]),norm(d[2]),norm(d[1])];
 const localToWorld=p=>add(center,add(add(mul(basis[0],p.x),mul(basis[1],p.y)),mul(basis[2],p.z)));
 const worldToVoxel=p=>{const q=sub(p,origin);return [dot(q,reciprocal[0]),dot(q,reciprocal[1]),dot(q,reciprocal[2])]};
 const localToVoxel=p=>worldToVoxel(localToWorld(p));
 const voxelToWorld=(i,j,k)=>add(origin,add(add(mul(d[0],i),mul(d[1],j)),mul(d[2],k)));
 const bd=dot(basis[0],cross(basis[1],basis[2]));
 const inv=[mul(cross(basis[1],basis[2]),1/bd),mul(cross(basis[2],basis[0]),1/bd),mul(cross(basis[0],basis[1]),1/bd)];
 const worldToLocal=p=>{const q=sub(p,center);return {x:dot(q,inv[0]),y:dot(q,inv[1]),z:dot(q,inv[2])}};
 return {dims:{x:(ni-1)*si,y:(nk-1)*sk,z:(nj-1)*sj},center,worldToLocal,localToWorld,worldToVoxel,localToVoxel,voxelToWorld,basis};
}
// Free MPR is a centered rectangle in a patient frame, independent of skin.
// Numeric translations are L, S, P millimetres from the volume center.
export function explorationPose(state,transform,volume){
 const space=(volume.fields?.space||'').toLowerCase().split('-');
 const known=['left','right'].includes(space[0])&&['anterior','posterior'].includes(space[1])&&['superior','inferior'].includes(space[2]);
 const L={x:space[0]==='right'?-1:1,y:0,z:0},P={x:0,y:space[1]==='anterior'?-1:1,z:0},S={x:0,y:0,z:space[2]==='inferior'?-1:1};
 const axes=known?[L,S,P]:[transform.basis[0],transform.basis[1],transform.basis[2]];
 const vector=v=>sub(transform.worldToLocal(add(transform.center,v)),transform.worldToLocal(transform.center));
 const qPitch=quat(axes[0],state.pitch),qYaw=quat(qrotate(qPitch,axes[2]),state.yaw);
 const tilt=qmul(qYaw,qPitch),qRoll=quat(qrotate(tilt,axes[1]),state.roll),q=state.mprQ??qmul(qRoll,tilt);
 const p=transform.worldToLocal(add(transform.center,add(add(mul(axes[0],state.free.x),mul(axes[1],state.free.y)),mul(axes[2],state.free.z))));
 return {p,rect:true,rotation:q,lateral:vector(qrotate(q,axes[0])),dir:vector(qrotate(q,axes[2])),normal:vector(qrotate(q,axes[1])),axes:axes.map(vector),known};
}
// Smooth torso proxy. Widened shoulders, narrowed waist, slightly flattened back.
export function surface(az,height,dims,model=null){
 const h=clamp(height,-.92,.92),a=az;
 const shoulder=Math.exp(-(((h-.45)/.22)**2)),waist=Math.exp(-(((h+.35)/.28)**2));
 const rx=dims.x*.36*(1+.17*shoulder-.10*waist);
 const rz=dims.z*.36*(1+.07*shoulder+.10*Math.exp(-(((h+.42)/.26)**2)));
 const s=Math.sin(a),c=Math.cos(a);
 const rear=1-.045*(1-s); // gentle posterior flattening
 const p=model?model.point(a,h):{x:rx*c,y:h*dims.y*.49,z:rz*s*rear+0.035*dims.z*h};
 const eps=1e-4;
 // Derivatives are from the same surface; the frame remains continuous at 2π.
 const point=(a,h)=>model?model.point(a,h):rawPoint(a,h,dims);
 const pa=point(az+eps,h),pb=point(az-eps,h);
 const py=point(az,clamp(h+eps,-.92,.92)),pz=point(az,clamp(h-eps,-.92,.92));
 const around=norm(sub(pa,pb)),along=norm(sub(py,pz));
 const normal=norm(cross(along,around));
 const tangent=norm(sub(around,mul(normal,dot(around,normal))));
 const superior=norm(cross(tangent,normal));
 return {p,normal,tangent,superior};
}
function rawPoint(az,h,dims){
 const shoulder=Math.exp(-(((h-.45)/.22)**2)),waist=Math.exp(-(((h+.35)/.28)**2));
 const rx=dims.x*.36*(1+.17*shoulder-.10*waist),rz=dims.z*.36*(1+.07*shoulder+.10*Math.exp(-(((h+.42)/.26)**2)));
 const s=Math.sin(az);return {x:rx*Math.cos(az),y:h*dims.y*.49,z:rz*s*(1-.045*(1-s))+.035*dims.z*h};
}
export const quat=(axis,angle)=>{const u=norm(axis),t=Math.sin(angle/2);return {w:Math.cos(angle/2),x:u.x*t,y:u.y*t,z:u.z*t}};
export const qmul=(a,b)=>({w:a.w*b.w-a.x*b.x-a.y*b.y-a.z*b.z,x:a.w*b.x+a.x*b.w+a.y*b.z-a.z*b.y,y:a.w*b.y-a.x*b.z+a.y*b.w+a.z*b.x,z:a.w*b.z+a.x*b.y-a.y*b.x+a.z*b.w});
export const qrotate=(q,v)=>{const u={x:q.x,y:q.y,z:q.z},t=mul(cross(u,v),2);return add(v,add(mul(t,q.w),cross(u,t)))};
export function probePose(state,dims,model=null){
 const surf=state.mode==='free'?{p:{...state.free},normal:{x:1,y:0,z:0},tangent:{x:0,y:0,z:1},superior:{x:0,y:1,z:0}}:(state.contact??surface(state.az,state.height,dims,model));
 const inward=mul(surf.normal,-1);
 // Intrinsic yaw then pitch: contact point is never transformed.
 const qYaw=quat(surf.superior,state.yaw),pitchAxis=qrotate(qYaw,surf.tangent);
 const qTilt=qmul(quat(pitchAxis,state.pitch),qYaw);
 const dir=norm(qrotate(qTilt,inward));
 const qRoll=quat(dir,state.roll),q=qmul(qRoll,qTilt);
 const lateral=norm(qrotate(q,surf.tangent));
 return {...surf,dir,lateral,p:surf.p,rotation:q};
}
export function planePoint(pose,depth,width,u,v){
 if(pose.rect)return add(add(pose.p,mul(pose.lateral,(u-.5)*width)),mul(pose.dir,(v-.5)*depth));
 const distance=clamp(v,0,1)*depth;
 const fan=.08+.92*clamp(v,0,1);
 return add(add(pose.p,mul(pose.dir,distance)),mul(pose.lateral,(u-.5)*width*fan));
}
export function cameraProject(camera,dims,w,h){
 const scale=Math.min(w,h)*.79*camera.zoom/Math.max(dims.x,dims.y,dims.z);
 const c=Math.cos(camera.yaw),s=Math.sin(camera.yaw),cp=Math.cos(camera.pitch),sp=Math.sin(camera.pitch);
 return p=>{const a=p.x*c+p.z*s,depth=-p.x*s+p.z*c,b=p.y*cp-depth*sp;
   return {x:w*.5+(a-camera.panX)*scale,y:h*.5-(b-camera.panY)*scale,depth:depth*cp+p.y*sp};};
}
// Camera is fixed for each drag. Solve the local tangent projection in CSS pixels.
// Damp the inverse near the silhouette, and retain movement toward a hidden side.
export function moveOnSurface(start,dx,dy,camera,dims,viewport){
 // Lock this gesture's direction at pointer-down. Inverting a local 2×2
 // Jacobian becomes singular at silhouettes and incorrectly converts x motion
 // into cranio-caudal travel. A geodesic clutch crosses that projection fold.
 const sign=Math.sign(Math.sin(camera.yaw))||Math.sign(Math.cos(camera.yaw))||1;
 const scale=Math.min(viewport.w,viewport.h)*.79*camera.zoom/Math.max(dims.x,dims.y,dims.z);
 const radius=(dims.x+dims.z)*.18;
 const pxPerRad=Math.max(60,scale*radius);
 const pxPerHeight=Math.max(60,scale*dims.y*.49*Math.max(.35,Math.cos(camera.pitch)));
 return {az:start.az+sign*dx/pxPerRad,height:clamp(start.height-dy/pxPerHeight,-.92,.92)};
}
