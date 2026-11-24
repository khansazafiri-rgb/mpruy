// Verify independently sourced DBCLS candidates against the cached official OBJ archive.
// No model is relabelled or moved to a public directory. Name matches alone do not prove identity.
import fs from 'node:fs';
import path from 'node:path';
import {createHash} from 'node:crypto';
import {execFileSync} from 'node:child_process';
import {fileURLToPath} from 'node:url';
import assert from 'node:assert/strict';
import {parseOfficialNames,parseOfficialElements,checkArchiveEntryNames} from '../licensing/tools/prepare-bodyparts3d-source.mjs';
import {readObjTriangles} from '../apps/4d-lab/tools/build-bp3d-candidate.mjs';
const root=fs.realpathSync(fileURLToPath(new URL('../',import.meta.url)));
const q=path.join(root,'local-data/licensing-quarantine');
const sha=b=>createHash('sha256').update(b).digest('hex');
const read=p=>JSON.parse(fs.readFileSync(p,'utf8'));
const canonical=n=>String(n).trim().toLowerCase().replace(/\s+/g,' ').replace(/^(.*)\.([lr])$/,(_m,n,s)=>(s==='l'?'left ':'right ')+n);
const sameSet=(a,b)=>a.length===new Set(a).size&&b.length===new Set(b).size&&a.length===b.length&&a.every(x=>b.includes(x));
function safe(base,rel){
 const p=path.resolve(base,rel);assert(p.startsWith(base+path.sep)&&fs.realpathSync(p)===p&&fs.statSync(p).isFile(),'Unsafe file '+rel);return p;
}
export function validateIdentity(entry,lineage,names,elements){
 const rows=names.filter(r=>r.fmaId===entry.fmaId&&r.bpId===entry.bpId);
 assert(rows.length===1,'Ambiguous or absent publisher FMA/BP identity');
 assert(lineage.officialFMAId===entry.fmaId&&lineage.officialRepresentationId===entry.bpId,'Lineage FMA/BP mismatch');
 assert(canonical(rows[0].name)===canonical(lineage.officialName),'Official name mismatch');
 assert(canonical(entry.name)===canonical(rows[0].name),'Display alias requires individual review');
 assert(Array.isArray(lineage.elements)&&lineage.elements.length>0,'Missing element lineage');
 const ids=lineage.elements.map(e=>e.id);
 assert(sameSet(ids,[...(elements.get(entry.fmaId)||[])]),'Incomplete or extra publisher FJ elements');
 return ids;
}
export function parseNativePositions(bytes){
 assert(bytes.length>=28&&bytes.readUInt32LE(0)===0x46546c67&&bytes.readUInt32LE(4)===2&&bytes.readUInt32LE(8)===bytes.length,'Invalid GLB');
 const n=bytes.readUInt32LE(12),offset=20+n;
 assert(n%4===0&&offset+8<=bytes.length&&bytes.readUInt32LE(16)===0x4e4f534a,'Invalid JSON chunk');
 const d=JSON.parse(bytes.subarray(20,offset).toString('utf8')),bl=bytes.readUInt32LE(offset),start=offset+8;
 assert(bytes.readUInt32LE(offset+4)===0x004e4942&&start+bl===bytes.length,'Invalid BIN chunk');
 assert(d.asset?.version==='2.0'&&d.buffers?.length===1&&!d.buffers[0].uri&&d.buffers[0].byteLength<=bl,'External buffers forbidden');
 assert(!d.extensionsRequired?.length&&d.extras?.reviewStatus==='candidate-only'&&d.extras?.source==='Official BodyParts3D 4.0','Not an original candidate encoding');
 assert(d.scenes?.length===1&&Array.isArray(d.nodes)&&d.scenes[0].nodes?.length===d.nodes.length&&new Set(d.scenes[0].nodes).size===d.nodes.length,'Unexpected scene');
 const output=new Map(),usedMeshes=new Set();
 for(const i of d.scenes[0].nodes){
  const node=d.nodes[i],id=node?.extras?.officialElementFileId;
  assert(/^FJ\d+[A-Za-z]?$/.test(id||'')&&!output.has(id)&&!usedMeshes.has(node.mesh),'Invalid element node');
  usedMeshes.add(node.mesh);
  assert(!['matrix','translation','rotation','scale','children','skin','weights'].some(k=>Object.hasOwn(node,k)),'Unexpected transform or deformation');
  const prim=d.meshes?.[node.mesh]?.primitives;
  assert(prim?.length===1&&(prim[0].mode??4)===4&&prim[0].indices===undefined&&!prim[0].extensions&&!prim[0].targets,'Unexpected primitive encoding');
  const a=d.accessors?.[prim[0].attributes?.POSITION],v=d.bufferViews?.[a?.bufferView];
  assert(a?.componentType===5126&&a.type==='VEC3'&&Number.isInteger(a.count)&&a.count>0&&a.count%3===0&&!a.sparse&&v?.buffer===0,'Invalid position accessor');
  const stride=v.byteStride??12,viewStart=v.byteOffset??0,within=a.byteOffset??0,begin=viewStart+within;
  assert([stride,viewStart,within,v.byteLength].every(Number.isSafeInteger)&&stride>=12&&viewStart>=0&&within>=0&&within+(a.count-1)*stride+12<=v.byteLength&&viewStart+v.byteLength<=d.buffers[0].byteLength,'Invalid accessor bounds');
  const positions=new Float32Array(a.count*3);
  for(let j=0;j<a.count;j++)for(let k=0;k<3;k++){
   const x=bytes.readFloatLE(start+begin+j*stride+k*4);assert(Number.isFinite(x),'Invalid coordinate');positions[j*3+k]=x;
  }
  output.set(id,positions);
 }
 assert(output.size>0&&usedMeshes.size===d.meshes.length,'Unexpected additional geometry');
 return output;
}
export function comparePositions(raw,actual){
 if(raw.length!==actual.length)return false;
 for(let i=0;i<raw.length;i++)if(raw[i]!==actual[i])return false;
 return true;
}
function loadSource(tree){
 const dir=path.join(q,tree==='isa'?'bp3d-4.0':'bp3d-4.0-partof');
 const files={archive:tree+'_BP3D_4.0_obj_99.zip',names:tree+'_parts_list_e.txt',elements:tree+'_element_parts.txt'};
 const p=Object.fromEntries(Object.entries(files).map(([k,v])=>[k,safe(dir,v)]));
 const hashes=Object.fromEntries(Object.entries(p).map(([k,v])=>[k,sha(fs.readFileSync(v))]));
 const listing=execFileSync('unzip',['-Z','-1',p.archive],{encoding:'utf8',maxBuffer:16*1024*1024}).trim().split(/\r?\n/);
 checkArchiveEntryNames(listing);
 const index=new Map();
 for(const item of listing.filter(n=>/\.obj$/i.test(n))){
  const id=path.basename(item).replace(/\.obj$/i,'');
  assert(/^FJ\d+[A-Za-z]?$/.test(id)&&!index.has(id)&&!/[?*\[\]]/.test(item),'Ambiguous or unsafe archive entry');index.set(id,item);
 }
 const receipts={};
 for(const [k,file] of Object.entries(p)){
  const receipt=file+'.receipt.json';
  if(!fs.existsSync(receipt))continue;
  const r=read(safe(dir,path.basename(receipt)));
  assert(r.url==='https://dbarchive.biosciencedbc.jp/data/bodyparts3d/LATEST/'+files[k]&&r.sha256===hashes[k]&&r.bytes===fs.statSync(file).size,'Publisher receipt mismatch');
  receipts[k]=r.url;
 }
 return {tree,p,hashes,index,receipts,names:parseOfficialNames(fs.readFileSync(p.names,'utf8')),elements:parseOfficialElements(fs.readFileSync(p.elements,'utf8'))};
}
export function auditPack(folder){
 assert(fs.realpathSync(q)===q,'Invalid quarantine root');
 assert(folder==='bp3d-all-systems'||/^bp3d-integrated-preview-[A-Za-z0-9_-]+$/.test(folder),'Explicit existing official candidate folder required');
 const dir=path.join(q,folder);assert(fs.realpathSync(dir)===dir);
 const pack=folder==='bp3d-all-systems'?dir:path.join(dir,'pack');
 const inv=read(safe(pack,'inventory.json'));assert(inv.approvedForCommercialDistribution===false&&Array.isArray(inv.converted));
 const sources=new Map(),rows=[],ids=new Set();
 for(const e of inv.converted){
  try{
   assert(typeof e.id==='string'&&/^[a-zA-Z0-9-]+$/.test(e.id)&&!ids.has(e.id)&&e.modelPath==='./structures/'+e.id+'/model.glb'&&e.approvedForDistribution===false,'Invalid candidate identity');ids.add(e.id);
   const l=read(safe(pack,'structures/'+e.id+'/lineage.json')),b=fs.readFileSync(safe(pack,e.modelPath));
   assert(l.approvedForDistribution===false&&l.generatedGLBSHA256===e.glbSha256&&sha(b)===e.glbSha256,'Candidate checksum mismatch');
   const tree=l.sourceArchive==='isa_BP3D_4.0_obj_99.zip'?'isa':l.sourceArchive==='partof_BP3D_4.0_obj_99.zip'?'partof':null;
   assert(tree,'No exact source archive identity');
   if(!sources.has(tree))sources.set(tree,loadSource(tree));const s=sources.get(tree);
   assert(l.archiveSHA256===s.hashes.archive,'Source archive checksum mismatch');
   if(l.sourceNamesSHA256)assert(l.sourceNamesSHA256===s.hashes.names,'Name table checksum mismatch');
   if(l.sourceElementsSHA256)assert(l.sourceElementsSHA256===s.hashes.elements,'Element table checksum mismatch');
   const elements=validateIdentity(e,l,s.names,s.elements),glb=parseNativePositions(b);
   assert(sameSet(elements,[...glb.keys()]),'GLB element set mismatch');
   const proof=[];
   for(const part of l.elements){
    const member=s.index.get(part.id);assert(member&&member===part.zipEntry,'Archive member mismatch');
    const obj=execFileSync('unzip',['-p',s.p.archive,member],{maxBuffer:96*1024*1024});
    assert(sha(obj)===part.sha256,'Raw element hash mismatch');
    const parsed=readObjTriangles(obj.toString('utf8'),{skipDegenerate:true});
    assert(comparePositions(parsed.positions,glb.get(part.id)),'Vertex/triangle sequence differs from raw source');
    proof.push({id:part.id,zipEntry:member,sha256:part.sha256,triangles:parsed.stats.triangles});
   }
   rows.push({id:e.id,name:e.name,group:e.group,sha256:e.glbSha256,tree,fmaId:e.fmaId,bpId:e.bpId,
    sourceHashes:s.hashes,sourceReceipts:s.receipts,sourceElements:proof,
    status:'EXACT_RAW_GEOMETRY_MATCH',publisherReceiptComplete:Object.keys(s.receipts).length===3,
    coordinateFrame:'native-official-OBJ',registrationValidated:false,approvedForDistribution:false});
  }catch(error){rows.push({id:e.id,name:e.name,group:e.group,status:'HOLD',reason:String(error.message),approvedForDistribution:false});}
 }
 const report={scope:'Exact ordered source triangle position match for independently sourced candidates only; not Z-Anatomy ownership proof',
   total:rows.length,matched:rows.filter(r=>r.status==='EXACT_RAW_GEOMETRY_MATCH').length,held:rows.filter(r=>r.status==='HOLD').length,
   publisherReceiptsComplete:rows.filter(r=>r.publisherReceiptComplete).length,approved:0,publicRelease:'NO_GO',rows};
 const out=path.join(dir,'publication-bp3d-geometry-evidence.json'),tmp=out+'.'+process.pid+'.tmp';
 fs.writeFileSync(tmp,JSON.stringify(report,null,2)+'\n',{flag:'wx',mode:0o600});fs.renameSync(tmp,out);
 console.log('BP3D SOURCE MATCH REPORT',out,JSON.stringify({total:report.total,matched:report.matched,held:report.held,approved:0}));
 return report;
}
if(process.argv[1]===fileURLToPath(import.meta.url))auditPack(process.argv[2]||'');
