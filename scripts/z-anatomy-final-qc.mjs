// Independent verification of the exact uncompressed native GLB format emitted by Blender exporter.
// Does not assert anatomical accuracy, completeness, continuity or commercial rights.
import assert from 'node:assert/strict';
import {createHash} from 'node:crypto';
export function inspectNativeGlb(bytes,entry,lineage){
 const check=(ok,msg)=>assert(ok,entry.name+': '+msg);
 check(bytes.length>=28&&bytes.readUInt32LE(0)===0x46546c67&&bytes.readUInt32LE(4)===2&&bytes.readUInt32LE(8)===bytes.length,'GLB header mismatch');
 const jl=bytes.readUInt32LE(12),at=20+jl;
 check(jl%4===0&&at+8<=bytes.length&&bytes.readUInt32LE(16)===0x4e4f534a,'JSON chunk invalid');
 const doc=JSON.parse(bytes.subarray(20,at).toString('utf8'));
 const bl=bytes.readUInt32LE(at),start=at+8;
 check(bytes.readUInt32LE(at+4)===0x004e4942&&start+bl===bytes.length,'BIN chunk invalid');
 check(doc.asset?.version==='2.0'&&doc.buffers?.length===1&&!doc.buffers[0].uri&&doc.buffers[0].byteLength===bl,'external or invalid buffer');
 check(doc.scenes?.length===1&&doc.scene===0&&doc.scenes[0].nodes?.length===1&&doc.scenes[0].nodes[0]===0&&doc.nodes?.length===1&&doc.nodes[0].mesh===0,'unexpected source node layout');
 check(!['matrix','translation','rotation','scale','children'].some(k=>Object.hasOwn(doc.nodes[0],k)),'unexpected node transform');
 check(doc.meshes?.length===1&&doc.meshes[0].primitives?.length===1,'unexpected mesh layout');
 const p=doc.meshes[0].primitives[0];
 check((p.mode??4)===4&&p.indices===undefined&&!p.extensions&&p.attributes.POSITION===0&&p.attributes.NORMAL===1,'unexpected primitive encoding');
 const n=entry.triangles*3,span=n*12;
 check(doc.accessors?.length===2&&doc.bufferViews?.length===2&&bl===span*2,'buffer size mismatch');
 for(let i=0;i<2;i++){
  const a=doc.accessors[i],v=doc.bufferViews[i];
  check(a.bufferView===i&&a.componentType===5126&&a.type==='VEC3'&&a.count===n&&!a.sparse&&(a.byteOffset??0)===0,'invalid accessor');
  check(v.buffer===0&&(v.byteOffset??0)===i*span&&v.byteLength===span&&!v.byteStride,'invalid buffer view');
 }
 const pos=bytes.subarray(start,start+span),norm=bytes.subarray(start+span,start+span*2);
 check(createHash('sha256').update(pos).digest('hex')===lineage.geometryPositionSHA256,'source position digest mismatch');
 const min=[Infinity,Infinity,Infinity],max=[-Infinity,-Infinity,-Infinity];
 for(let j=0;j<span;j+=12){
  let normalLength=0;
  for(let k=0;k<3;k++){
   const x=pos.readFloatLE(j+4*k),v=norm.readFloatLE(j+4*k);
   check(Number.isFinite(x)&&Number.isFinite(v),'non-finite vertex or normal');
   min[k]=Math.min(min[k],x);max[k]=Math.max(max[k],x);normalLength+=v*v;
  }
  check(normalLength>.9&&normalLength<1.1,'non-unit normal');
 }
 const b=[...min,...max];
 check(b.every((v,i)=>Math.abs(v-entry.privateAtlasMeta.box[i])<1e-6),'geometry versus catalogue bounds mismatch');
 check([...doc.accessors[0].min,...doc.accessors[0].max].every((v,i)=>Math.abs(v-b[i])<1e-6),'accessor bounds mismatch');
 check(doc.extras?.reviewStatus==='candidate-only'&&doc.extras?.provenance?.approvedForDistribution===false&&lineage.approvedForDistribution===false,'private approval mismatch');
 return {triangles:entry.triangles,bytes:bytes.length,bounds:b};
}
export function finalQcSummary({inv,nativeAudit,geometry,vascular,neural,lymphatic,organs,clinical,hra}){
 const groups=Object.entries(nativeAudit.groups).map(([group,models])=>({
  group,models,technicalStatus:models?'CANDIDATE_GEOMETRY_VERIFIED':'MISSING_GROUP',
  clinicalStatus:'NOT_VALIDATED',releaseStatus:'NO_GO'
 }));
 const blockers=[];
 for(const g of groups)if(!g.models)blockers.push('No exported model: '+g.group);
 if(!lymphatic.hasExportedVesselCandidates)blockers.push('No lymphatic vessel or trunk candidate');
 if(!organs.fiveLobeCandidatesExported)blockers.push('Five lung lobes not all exported');
 const keyVessels=clinical.groups.vascular.filter(x=>/carotid artery|jugular vein/.test(x.name));
 for(const v of keyVessels)if(v.status!=='BODY_GEOMETRY_CANDIDATE')blockers.push('Missing or ambiguous vessel: '+v.name);
 for(const e of clinical.groups.endocrine)if(e.name!=='pancreas'&&e.status!=='BODY_GEOMETRY_CANDIDATE')blockers.push('Missing or ambiguous endocrine structure: '+e.name);
 return {schema:1,scope:'Verified private export bytes and named coverage only; source labels are not clinical validation',
  source:inv.source,models:inv.converted.length,geometry,groups,blockers,
  sourceCoverage:{vascularRows:vascular.rows.length,neural:neural.summary,lymphatic:lymphatic.exportedByKind,organs:organs.summary,clinical:clinical.summary},
  independentHraReferences:hra?.assets.size||0,previewStatus:'PRIVATE_CANDIDATE',browserRuntime:'PENDING',
  anatomicalCompleteness:'NOT_VALIDATED',vascularContinuity:'NOT_VALIDATED',lymphaticContinuity:'NOT_VALIDATED',commercialRights:'BLOCKED',publicRelease:'NO_GO'};
}
