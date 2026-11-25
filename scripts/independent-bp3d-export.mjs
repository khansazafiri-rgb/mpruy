// Independent source-native OBJ-to-GLB exporter. No legacy Atlas or Lab module imports.
import assert from 'node:assert/strict';
import {createHash} from 'node:crypto';
const hash=b=>createHash('sha256').update(b).digest('hex');
export function parseObj(text){
 const vertices=[],positions=[],normals=[];let omitted=0;
 for(const line of text.split(/\r?\n/)){
  const t=line.trim().split(/\s+/);
  if(t[0]==='v'){
   assert(t.length>=4,'Malformed vertex');const p=t.slice(1,4).map(Number);assert(p.every(Number.isFinite),'Nonfinite vertex');vertices.push(p);
  }else if(t[0]==='f'){
   assert(t.length>=4&&t.length<=13,'Malformed face');
   const points=t.slice(1).map(token=>{const x=Number(token.split('/')[0]);assert(Number.isInteger(x)&&x!==0,'Invalid OBJ index');const p=vertices[x>0?x-1:vertices.length+x];assert(p,'Vertex absent');return p;});
   for(let k=1;k<points.length-1;k++){
    assert(positions.length<13500000,'Triangle limit');
    const a=points[0],b=points[k],c=points[k+1],u=b.map((v,i)=>v-a[i]),v=c.map((v,i)=>v-a[i]);
    const n=[u[1]*v[2]-u[2]*v[1],u[2]*v[0]-u[0]*v[2],u[0]*v[1]-u[1]*v[0]],length=Math.hypot(...n);
    if(length<1e-15){omitted++;continue;}
    for(const p of [a,b,c]){positions.push(...p);normals.push(...n.map(x=>x/length));}
   }
  }
 }
 assert(positions.length>0,'No usable triangles');
 return {positions:new Float32Array(positions),normals:new Float32Array(normals),omitted};
}
export function encodeNativeGlb(parts,identity){
 assert(parts.length&&new Set(parts.map(p=>p.id)).size===parts.length,'Invalid element set');
 const doc={asset:{version:'2.0',generator:'MEDCOEL independent source exporter'},scene:0,scenes:[{nodes:[]}],nodes:[],meshes:[],accessors:[],bufferViews:[],buffers:[{byteLength:0}],
  extras:{source:'Official BodyParts3D 4.0',reviewStatus:'candidate-only',coordinateFrame:'raw-official-OBJ-not-registered',provenance:{...identity,approvedForDistribution:false,registrationValidated:false}}};
 const chunks=[];let offset=0,triangles=0;
 function accessor(values,position){
  assert(values instanceof Float32Array&&values.length%3===0&&values.length>0,'Invalid attribute');
  const b=Buffer.alloc(values.length*4),min=[Infinity,Infinity,Infinity],max=[-Infinity,-Infinity,-Infinity];
  for(let i=0;i<values.length;i++){const v=values[i];assert(Number.isFinite(v));b.writeFloatLE(v,i*4);if(position){min[i%3]=Math.min(min[i%3],v);max[i%3]=Math.max(max[i%3],v);}}
  const bv=doc.bufferViews.length;doc.bufferViews.push({buffer:0,byteOffset:offset,byteLength:b.length,target:34962});offset+=b.length;chunks.push(b);
  const i=doc.accessors.length;doc.accessors.push({bufferView:bv,componentType:5126,count:values.length/3,type:'VEC3',...(position?{min,max}:{})});return i;
 }
 for(const p of parts){
  assert(/^FJ\d+[A-Za-z]?$/.test(p.id)&&p.positions.length===p.normals.length&&p.positions.length%9===0);
  triangles+=p.positions.length/9;assert(triangles<=1500000,'Combined triangle limit');
  const i=doc.meshes.length;
  doc.meshes.push({name:p.id,primitives:[{attributes:{POSITION:accessor(p.positions,true),NORMAL:accessor(p.normals,false)},mode:4}]});
  doc.nodes.push({name:p.id,mesh:i,extras:{officialElementFileId:p.id,omittedDegenerateTriangles:p.omitted}});doc.scenes[0].nodes.push(i);
 }
 doc.buffers[0].byteLength=offset;
 const json=Buffer.from(JSON.stringify(doc),'utf8'),pad=(4-json.length%4)%4,j=Buffer.concat([json,Buffer.alloc(pad,0x20)]);
 const header=Buffer.alloc(12),jh=Buffer.alloc(8),bh=Buffer.alloc(8);header.writeUInt32LE(0x46546c67);header.writeUInt32LE(2,4);header.writeUInt32LE(28+j.length+offset,8);
 jh.writeUInt32LE(j.length);jh.writeUInt32LE(0x4e4f534a,4);bh.writeUInt32LE(offset);bh.writeUInt32LE(0x004e4942,4);
 const bytes=Buffer.concat([header,jh,j,bh,...chunks]);return {bytes,sha256:hash(bytes),triangles};
}
