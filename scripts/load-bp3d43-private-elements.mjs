// Load only locally retained, dual-source-audited 4.3 assets. Never body inventory.
import fs from 'node:fs';
import path from 'node:path';
import assert from 'node:assert/strict';
import {createHash} from 'node:crypto';
import {parseObj} from './independent-bp3d-export.mjs';
import {parseNativePositions,comparePositions} from './audit-bp3d-publication-geometry.mjs';
const sha=b=>createHash('sha256').update(b).digest('hex');
const read=(folder,name,max=64*1024*1024)=>{
 const f=path.join(folder,name);
 assert(fs.realpathSync(f)===f&&fs.statSync(f).isFile()&&fs.statSync(f).size<=max,'Invalid private file');
 return fs.readFileSync(f);
};
export function load43Elements(privateRoot,folderName,evidence){
 assert(/^bp3d43-element-intake-[A-Za-z0-9_-]+$/.test(folderName),'Explicit local acquisition folder required');
 assert(fs.realpathSync(privateRoot)===privateRoot&&path.basename(privateRoot)==='licensing-quarantine');
 const folder=path.join(privateRoot,folderName);assert(fs.realpathSync(folder)===folder);
 assert(evidence.schema===1&&evidence.publicRelease==='NO_GO'&&evidence.clinicalValidation===false&&evidence.registrationValidated===false&&evidence.geometryPublished===0&&evidence.matches?.length===12);
 const report=JSON.parse(read(folder,'report.json',1024*1024));
 assert(report.version==='4.3'&&report.publicRelease==='NO_GO'&&report.registrationValidated===false&&report.clinicalValidation===false&&report.geometryPublished===0&&report.held===0&&report.parsed===12&&report.results?.length===12);
 assert(report.manifestSHA256===evidence.publisher.manifestSHA256&&sha(read(folder,'FMA2Obj.txt'))===report.manifestSHA256);
 const ids=new Set(),assets=new Map(),items=[];
 for(const proof of evidence.matches){
  const {fj,bp,fma,name,rawSHA256,publisherGLBSHA256,triangles}=proof;
  assert(/^FJ\d+[A-Za-z]?$/.test(fj)&&!ids.has(fj)&&/^BP\d+$/.test(bp)&&/^FMA\d+$/.test(fma)&&typeof name==='string'&&name.trim());ids.add(fj);
  assert(/^[a-f0-9]{64}$/.test(rawSHA256)&&/^[a-f0-9]{64}$/.test(publisherGLBSHA256));
  const row=report.results.find(r=>r.fj===fj);assert(row?.status==='EXACT_SOURCE_ELEMENT_GEOMETRY_MATCH'&&row.bp===bp&&row.fma===fma&&row.name===name&&row.rawSHA256===rawSHA256&&row.glbSHA256===publisherGLBSHA256&&row.triangles===triangles);
  const raw=read(folder,fj+'.obj'),glb=read(folder,fj+'.glb');
  assert(sha(raw)===rawSHA256&&sha(glb)===publisherGLBSHA256,'Dual-source audited bytes differ');
  const source=parseObj(raw.toString('utf8').replace(/\r\n|\r/g,'\n')),positions=parseNativePositions(glb,'4.3');
  assert(source.positions.length/9===triangles&&positions.size===1&&comparePositions(source.positions,positions.get(fj)),'Native geometry replay differs');
  const id='bp43-'+sha(Buffer.from(fj+':'+rawSHA256)).slice(0,24);
  items.push({id,fj,bpId:bp,fmaId:fma,name,triangles,source:'BodyParts3D 4.3',scope:'SINGLE_SOURCE_ELEMENT',coordinateFrame:'native-4.3-not-registered',sourceLicense:'CC-BY-SA-2.1-JP (reported; version-specific review pending)',clinicalValidation:false,registrationValidated:false,approvedForDistribution:false,rawSHA256,glbSHA256:publisherGLBSHA256});
  assets.set(id,{file:path.join(folder,fj+'.glb'),sha256:publisherGLBSHA256,bytes:glb.length});
 }
 assert(assets.size===12);
 return {inventory:{schema:1,publicRelease:'NO_GO',clinicalValidation:false,registrationValidated:false,scope:'Separate source elements only; no whole-body alignment or full concept claim',items},assets};
}
