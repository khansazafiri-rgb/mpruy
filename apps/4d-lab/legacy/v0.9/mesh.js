import {add,sub,mul,dot,cross,norm} from './kinematics.js';
const apply=(m,p)=>({x:m[0]*p.x+m[1]*p.y+m[2]*p.z+m[3],y:m[4]*p.x+m[5]*p.y+m[6]*p.z+m[7],z:m[8]*p.x+m[9]*p.y+m[10]*p.z+m[11]});
export function parseGLB(buffer){
 const d=new DataView(buffer);if(d.byteLength<28||d.getUint32(0,true)!==0x46546c67||d.getUint32(4,true)!==2||d.getUint32(8,true)!==d.byteLength)throw Error('GLB v2 tidak valid');
 let doc,bin;for(let o=12;o<d.byteLength;){const n=d.getUint32(o,true),type=d.getUint32(o+4,true);if(o+8+n>d.byteLength)throw Error('GLB terpotong');const b=buffer.slice(o+8,o+8+n);if(type===0x4e4f534a)doc=JSON.parse(new TextDecoder().decode(b));if(type===0x004e4942)bin=b;o+=8+n}
 if(!doc||!bin||doc.nodes?.length!==1||doc.nodes[0].matrix||doc.nodes[0].translation||doc.nodes[0].rotation||doc.nodes[0].scale||doc.meshes?.length!==1||doc.meshes[0].primitives.length!==1)throw Error('Gunakan GLB dari pipeline MEDCOEL (satu mesh tanpa transform node)');
 const primitive=doc.meshes[0].primitives[0];if(primitive.mode!==undefined&&primitive.mode!==4)throw Error('Mesh harus segitiga');
 function accessor(id,type,components){const a=doc.accessors[id],v=doc.bufferViews[a?.bufferView];if(!a||!v||a.sparse||v.byteStride||a.componentType!==type||a.type!==components||a.count>1000000)throw Error('Accessor GLB tidak didukung');const Typed=type===5126?Float32Array:Uint32Array,offset=(v.byteOffset||0)+(a.byteOffset||0),length=a.count*(components==='VEC3'?3:1);if(offset+length*4>bin.byteLength)throw Error('Accessor terpotong');return new Typed(bin,offset,length)}
 const positions=accessor(primitive.attributes.POSITION,5126,'VEC3'),indices=accessor(primitive.indices,5125,'SCALAR');
 if(indices.length%3||!positions.every(Number.isFinite)||indices.some(i=>i>=positions.length/3))throw Error('Mesh tidak valid');
 return {positions,indices};
}
export function spaceToLPS(volume){const s=volume.fields?.space;return s==='left-posterior-superior'?[1,1,1]:s==='right-anterior-superior'?[-1,-1,1]:null}
export async function loadRegisteredMesh(buffer,meta,volume,transform){
 if(meta.schema!=='medcoel.patient.v1'||!spaceToLPS(volume))throw Error('Registrasi membutuhkan metadata LPS/RAS eksplisit');
 if(meta.sizes.some((n,i)=>n!==volume.sizes[i]))throw Error('Dimensi mesh dan CT berbeda');
 const signs=spaceToLPS(volume),toWorld=p=>({x:p.x*signs[0],y:p.y*signs[1],z:p.z*signs[2]});
 for(const ijk of [[0,0,0],[1,0,0],[0,1,0],[0,0,1]]){const lps=apply(meta.ijkToLPS,{x:ijk[0],y:ijk[1],z:ijk[2]}),w=transform.voxelToWorld(...ijk),p=toWorld(lps);if(Math.hypot(...Object.values(sub(p,w)))>.01)throw Error('Affine CT/mesh tidak cocok; dilarang alignment visual')}
 if(!meta.samples?.length||meta.samples.some(s=>Math.abs(volume.voxel(...s.ijk)-s.value)>.1))throw Error('Sampel voxel berbeda: mesh mungkin berasal dari CT lain');
 const hash=Array.from(new Uint8Array(await crypto.subtle.digest('SHA-256',buffer)),n=>n.toString(16).padStart(2,'0')).join('');if(hash!==meta.meshSHA256)throw Error('Hash GLB tidak sesuai registrasi');
 const raw=parseGLB(buffer),points=[],lpsPoints=[];
 for(let i=0;i<raw.positions.length;i+=3){const lps=apply(meta.glbToLPS,{x:raw.positions[i],y:raw.positions[i+1],z:raw.positions[i+2]});lpsPoints.push(lps);points.push(transform.worldToLocal(toWorld(lps)))}
 for(const a of meta.anchors){const p=lpsPoints[a.vertex],expected=toWorld(apply(meta.ijkToLPS,{x:a.ijk[0],y:a.ijk[1],z:a.ijk[2]}));if(!p||Math.hypot(...Object.values(sub(toWorld(p),expected)))>.05)throw Error('Anchor mesh/voxel salah')}
 if(raw.indices.length/3>50000)throw Error('Mesh terlalu besar; decimate ke <=50000 segitiga, disarankan 16000.');
 const normals=points.map(()=>({x:0,y:0,z:0})),faces=[];
 for(let i=0;i<raw.indices.length;i+=3){const ids=Array.from(raw.indices.subarray(i,i+3));const [a,b,c]=ids.map(j=>lpsPoints[j]),n=cross(sub(b,a),sub(c,a));for(const j of ids)normals[j]=add(normals[j],n);faces.push(ids)}
 for(let i=0;i<normals.length;i++){const n=norm(normals[i]),w=toWorld(n);normals[i]=norm(sub(transform.worldToLocal(add(transform.center,w)),transform.worldToLocal(transform.center)))}
 return {points,normals,faces,meta,registration:'affine + source samples + GLB hash + anchors verified',toVoxel:p=>transform.localToVoxel(p)};
}
export function cameraRay(camera,dims,w,h,x,y){
 const scale=Math.min(w,h)*.79*camera.zoom/Math.max(dims.x,dims.y,dims.z),c=Math.cos(camera.yaw),s=Math.sin(camera.yaw),cp=Math.cos(camera.pitch),sp=Math.sin(camera.pitch);
 const a=(x-w*.5)/scale+camera.panX,b=-(y-h*.5)/scale+camera.panY;
 const center={x:a*c+b*sp*s,y:b*cp,z:a*s-b*sp*c},direction={x:-s*cp,y:sp,z:c*cp};
 return {origin:add(center,mul(direction,-10000)),direction};
}
export function raycast(mesh,ray){let best=null;
 for(let face=0;face<mesh.faces.length;face++){
 const ids=mesh.faces[face],[a,b,c]=ids.map(i=>mesh.points[i]),e1=sub(b,a),e2=sub(c,a),h=cross(ray.direction,e2),det=dot(e1,h);if(Math.abs(det)<1e-9)continue;
 const inv=1/det,s=sub(ray.origin,a),u=inv*dot(s,h);if(u<0||u>1)continue;const q=cross(s,e1),v=inv*dot(ray.direction,q);if(v<0||u+v>1)continue;const distance=inv*dot(e2,q);if(distance<0||best&&distance>=best.distance)continue;
 const p=add(ray.origin,mul(ray.direction,distance)),ijk=mesh.toVoxel(p),touch=mesh.meta.qc.touchesAcquisitionFaces,stride=mesh.meta.qc.stride;
 const roi=mesh.meta.qc.roiIJK;if(roi&&ijk.some((v,i)=>v<roi[i*2]+stride*1.5||v>roi[i*2+1]-stride*1.5))continue;
 if(['I','J','K'].some((a,i)=>touch[a+'−']&&ijk[i]<stride*1.5||touch[a+'+']&&ijk[i]>mesh.meta.sizes[i]-1-stride*1.5))continue;
 const ns=ids.map(i=>mesh.normals[i]),normal=norm(add(add(mul(ns[0],1-u-v),mul(ns[1],u)),mul(ns[2],v)));
 best={p,normal,face,distance};
 }return best;
}
export function contactFrame(hit,previous){const normal=hit.normal,reference=previous?.tangent??{x:1,y:0,z:0};let tangent=sub(reference,mul(normal,dot(reference,normal)));if(Math.hypot(...Object.values(tangent))<.01)tangent=cross({x:0,y:1,z:0},normal);tangent=norm(tangent);return {p:hit.p,normal,tangent,superior:norm(cross(tangent,normal))}}
