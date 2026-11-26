// Decode only 13 previously audited, exact right-sided source mesh node candidates.
// No mesh export, mirroring, public serving, inferred anatomy or release approval.
import fs from 'node:fs';
import path from 'node:path';
import assert from 'node:assert/strict';
import {createHash} from 'node:crypto';
import {createRequire} from 'node:module';
import {fileURLToPath} from 'node:url';
const root=new URL('../',import.meta.url);
const read=p=>JSON.parse(fs.readFileSync(new URL('licensing/atlas-publication/'+p,root),'utf8'));
const digest=b=>createHash('sha256').update(b).digest('hex');
export function parseGlb(b){
 assert(b.length>=28&&b.readUInt32LE(0)===0x46546c67&&b.readUInt32LE(4)===2&&b.readUInt32LE(8)===b.length,'Invalid GLB header');
 const jsonLength=b.readUInt32LE(12);assert(jsonLength>0&&jsonLength%4===0&&20+jsonLength+8<=b.length&&b.readUInt32LE(16)===0x4e4f534a,'Invalid JSON chunk');
 const d=JSON.parse(b.subarray(20,20+jsonLength).toString('utf8')),off=20+jsonLength,len=b.readUInt32LE(off);
 assert(b.readUInt32LE(off+4)===0x004e4942&&off+8+len===b.length&&len%4===0,'Invalid BIN chunk');
 assert(d.asset?.version==='2.0'&&d.buffers?.length===1&&!d.buffers[0].uri&&d.buffers[0].byteLength<=len&&len-d.buffers[0].byteLength<=3,'Unexpected buffer layout');
 assert(!(d.images||[]).some(i=>i.uri),'External image URI held');
 assert(d.extensionsRequired?.every(x=>x==='KHR_draco_mesh_compression'),'Unsupported required extension');
 return {d,bin:b.subarray(off+8)};
}
export function primitiveSource(d,bin,p){
 assert((p.mode??4)===4&&Number.isInteger(p.indices)&&Number.isInteger(p.attributes?.POSITION),'Nonindexed triangle primitive');
 const ext=p.extensions?.KHR_draco_mesh_compression;
 assert(ext&&Number.isInteger(ext.bufferView)&&Number.isInteger(ext.attributes?.POSITION),'No exact compressed position mapping');
 const v=d.bufferViews[ext.bufferView],a=d.accessors[p.attributes.POSITION],idx=d.accessors[p.indices];
 const start=v?.byteOffset??0,size=v?.byteLength;
 assert(v?.buffer===0&&Number.isSafeInteger(start)&&start>=0&&Number.isSafeInteger(size)&&size>0&&start+size<=bin.length,'Compressed buffer outside source');
 assert(a?.type==='VEC3'&&a.componentType===5126&&Number.isInteger(a.count)&&a.count>0&&a.count<=2000000,'Invalid expected positions');
 assert(idx?.type==='SCALAR'&&[5121,5123,5125].includes(idx.componentType)&&Number.isInteger(idx.count)&&idx.count>0&&idx.count%3===0&&idx.count<=12000000,'Invalid expected indices');
 return {compressed:bin.subarray(start,start+size),positionId:ext.attributes.POSITION,vertices:a.count,triangles:idx.count/3};
}
async function decodePrimitive(m,src){
 const decoder=new m.Decoder(),buffer=new m.DecoderBuffer(),mesh=new m.Mesh();
 const positions=new m.DracoFloat32Array(),face=new m.DracoInt32Array();
 let status;
 try{
  buffer.Init(new Int8Array(src.compressed.buffer,src.compressed.byteOffset,src.compressed.byteLength),src.compressed.length);
  assert(decoder.GetEncodedGeometryType(buffer)===m.TRIANGULAR_MESH,'Not triangular Draco mesh');
  status=decoder.DecodeBufferToMesh(buffer,mesh);assert(status.ok()&&mesh.ptr,'Draco decode failed');
  assert.equal(mesh.num_points(),src.vertices,'Point count differs from source accessor');assert.equal(mesh.num_faces(),src.triangles,'Face count differs from source accessor');
  const attr=decoder.GetAttributeByUniqueId(mesh,src.positionId);assert(attr?.ptr&&attr.num_components()===3,'Position attribute missing');
  assert(decoder.GetAttributeFloatForAllPoints(mesh,attr,positions)&&positions.size()===src.vertices*3,'Position decode failed');
  const min=[Infinity,Infinity,Infinity],max=[-Infinity,-Infinity,-Infinity];
  for(let i=0;i<positions.size();i++){const v=positions.GetValue(i),k=i%3;assert(Number.isFinite(v),'Nonfinite position');min[k]=Math.min(min[k],v);max[k]=Math.max(max[k],v);}
  assert(max.some((v,i)=>v>min[i]),'Zero spatial extent');
  let repeatedIndexFaces=0;
  for(let i=0;i<src.triangles;i++){
   assert(decoder.GetFaceFromMesh(mesh,i,face)&&face.size()===3,'Face decode failed');
   const ids=[face.GetValue(0),face.GetValue(1),face.GetValue(2)];
   assert(ids.every(v=>Number.isInteger(v)&&v>=0&&v<src.vertices),'Face index out of bounds');if(new Set(ids).size<3)repeatedIndexFaces++;
  }
  return {vertices:src.vertices,triangles:src.triangles,nativeLocalBounds:{min,max},repeatedIndexFaces};
 }finally{if(status)m.destroy(status);for(const obj of [face,positions,mesh,buffer,decoder])m.destroy(obj);}
}
export async function audit(file){
 const spec=read('open3dmodel-lower-limb-observed-source-20261126.json'),names=read('open3dmodel-lower-limb-observed-nerve-audit-20261126.json');
 assert(spec.publicRelease==='NO_GO'&&names.publicRelease==='NO_GO'&&spec.assetRightsReviewed===false&&names.glbSHA256===spec.glbSHA256);
 assert(fs.realpathSync(file)===file&&fs.statSync(file).isFile()&&fs.statSync(file).size===spec.glbBytes);
 const b=fs.readFileSync(file);assert(digest(b)===spec.glbSHA256,'Source bytes changed');
 const {d,bin}=parseGlb(b);assert(d.nodes.length===names.nodeCount&&d.meshes.length===names.meshCount);
 const rootPath=process.env.DRACO_AUDIT_MODULE;assert(rootPath&&path.isAbsolute(rootPath),'Explicit isolated audit module path required');
 const req=createRequire(path.join(rootPath,'package.json')),pkg=req('draco3dgltf/package.json');assert.equal(pkg.version,'1.5.7');
 const m=await req('draco3dgltf').createDecoderModule({});
 const targets=names.targets.filter(x=>x.status==='EXACT_NAMED_MESH_NODE_CANDIDATE');assert.equal(targets.length,13);
 const rows=[];
 for(const t of targets){
  assert(t.side==='right'&&t.matches.length===1);const h=t.matches[0],n=d.nodes[h.nodeIndex];
  assert(n?.name===h.sourceName&&n.mesh===h.meshIndex,'Node identity differs');
  const ps=d.meshes[h.meshIndex].primitives;assert(Array.isArray(ps)&&ps.length>0&&ps.length<=16);
  const results=[];
  for(const p of ps)results.push(await decodePrimitive(m,primitiveSource(d,bin,p)));
  rows.push({target:t.target,side:t.side,...h,primitives:results,vertices:results.reduce((n,p)=>n+p.vertices,0),triangles:results.reduce((n,p)=>n+p.triangles,0),status:'EXACT_SOURCE_DRACO_DECODE',clinicalValidation:false,registrationValidated:false,approvedForDistribution:false});
 }
 const report={schema:1,sourceSHA256:spec.glbSHA256,decoder:'draco3dgltf@1.5.7',decoded:rows.length,triangles:rows.reduce((n,p)=>n+p.triangles,0),rows,geometryExported:0,assetRightsReviewed:false,clinicalValidation:false,registrationValidated:false,publicRelease:'NO_GO'};
 console.log('OPEN3DMODEL PRIVATE DRACO AUDIT '+JSON.stringify(report));return report;
}
if(process.argv[1]===fileURLToPath(import.meta.url)){assert(process.argv.length===3);await audit(process.argv[2]);}
