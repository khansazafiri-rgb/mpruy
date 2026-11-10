// Build a NEW locally quarantined GLB from OFFICIAL DBCLS OBJ inputs only.
// This does not touch MEDCOEL's served model, UI, CT or commercial release gates.
// Usage after "npm run audit:bodyparts3d -- --download" and "npm ci --prefix apps/4d-lab":
// node apps/4d-lab/tools/build-bp3d-candidate.mjs --structure "Femur.l"
// Outputs: local-data/licensing-quarantine/bp3d-candidates/<safeName>/{model.glb,lineage.json}
import fs from 'node:fs';
import path from 'node:path';
import { createHash } from 'node:crypto';
import { execFileSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';
import { Document, NodeIO } from '@gltf-transform/core';
import { parseOfficialNames, parseOfficialElements, candidateCrosswalk,
  mapActualMeshFiles, checkArchiveEntryNames, BP3D_OFFICIAL } from '../../../licensing/tools/prepare-bodyparts3d-source.mjs';

const ROOT=fileURLToPath(new URL('../../../',import.meta.url));
const SOURCES=path.join(ROOT,'local-data/licensing-quarantine/bp3d-4.0');
const OUTPUT=path.join(ROOT,'local-data/licensing-quarantine/bp3d-candidates');
const MAX_OBJ_BYTES=96*1024*1024, MAX_TRIANGLES=1500000;
const sha = b=>createHash('sha256').update(b).digest('hex');

export function readObjTriangles(text, { skipDegenerate = false } = {}) {
  const vertices=[], positions=[], normals=[];
  let faces=0, fanTriangulated=0, omittedDegenerateTriangles=0;
  for (const line of String(text).split(/\r?\n/)) {
    const trim=line.trim();
    if (trim.startsWith('v ')) {
      const cols=trim.split(/\s+/);
      if (cols.length<4) throw new Error('Malformed OBJ vertex');
      const v=cols.slice(1,4).map(Number);
      if (v.some(n=>!Number.isFinite(n))) throw new Error('Nonfinite OBJ vertex');
      vertices.push(v);
    } else if (trim.startsWith('f ')) {
      const toks=trim.split(/\s+/).slice(1);
      if (toks.length<3 || toks.length>12) throw new Error('Malformed or oversized OBJ face');
      const indices=toks.map(t=>{
        const pos=Number(t.split('/')[0]);
        if (!Number.isInteger(pos)||pos===0) throw new Error('Invalid OBJ vertex reference');
        const idx=pos>0 ? pos-1 : vertices.length+pos;
        if (idx<0||idx>=vertices.length) throw new Error('OBJ vertex out of bounds');
        return idx;
      });
      faces++;
      if(indices.length>3)fanTriangulated++;
      for(let i=1;i<indices.length-1;i++){
        if(positions.length/9>=MAX_TRIANGLES)throw new Error('OBJ triangle budget exceeded');
        const v0=vertices[indices[0]], v1=vertices[indices[i]], v2=vertices[indices[i+1]];
        const u=[v1[0]-v0[0],v1[1]-v0[1],v1[2]-v0[2]],
          v=[v2[0]-v0[0],v2[1]-v0[1],v2[2]-v0[2]];
        let n=[u[1]*v[2]-u[2]*v[1],u[2]*v[0]-u[0]*v[2],u[0]*v[1]-u[1]*v[0]];
        const mag=Math.hypot(...n);
        if(mag<1e-15){
          if(!skipDegenerate)throw new Error('Degenerate OBJ triangle');
          omittedDegenerateTriangles++;
          continue; // A zero-area source triangle contributes no visible surface.
        }
        n=n.map(x=>x/mag);
        for(const point of [v0,v1,v2]){positions.push(...point);normals.push(...n);}
      }
    }
  }
  if(!faces||!positions.length)throw new Error('OBJ has no usable faces');
  return {positions:new Float32Array(positions),normals:new Float32Array(normals),
    stats:{vertices:vertices.length,sourceFaces:faces,triangles:positions.length/9,
      fanTriangulatedFaces:fanTriangulated,omittedDegenerateTriangles}};
}

export async function makeGlb(meshParts, structureName, modelProvenance, { skipDegenerate = false } = {}) {
  if(!meshParts.length)throw new Error('No official geometry supplied');
  const doc=new Document(), buffer=doc.createBuffer(), scene=doc.createScene('Official BodyParts3D candidate');
  const color=doc.createMaterial('unreviewed-anatomy').setDoubleSided(true).setBaseColorFactor([0.8,0.82,0.84,1]);
  let totalTriangles=0;
  for(const part of meshParts){
    const parsed=readObjTriangles(part.text,{skipDegenerate});
    const pos=doc.createAccessor().setType('VEC3').setArray(parsed.positions).setBuffer(buffer);
    const norm=doc.createAccessor().setType('VEC3').setArray(parsed.normals).setBuffer(buffer);
    const prim=doc.createPrimitive().setAttribute('POSITION',pos).setAttribute('NORMAL',norm).setMaterial(color);
    const mesh=doc.createMesh(part.id).addPrimitive(prim);
    const node=doc.createNode(part.id).setMesh(mesh).setExtras({
      officialElementFileId:part.id,officialSource:'BodyParts3D 4.0',userFacingAtlasCandidate:structureName,
      omittedDegenerateTriangles:parsed.stats.omittedDegenerateTriangles
    });
    scene.addChild(node);totalTriangles+=parsed.stats.triangles;
  }
  if(totalTriangles>MAX_TRIANGLES)throw new Error('Combined structure triangle budget exceeded');
  doc.getRoot().setExtras({source:'Official BodyParts3D 4.0',reviewStatus:'candidate-only',
    provenance:modelProvenance,coordinateFrame:'raw-official-OBJ-not-registered'});
  return new NodeIO().writeBinary(doc);
}

function parseArgs(argv){
  if(argv.length!==2||argv[0]!=='--structure'||!argv[1]||argv[1].includes('/'))
    throw new Error('Usage: node build-bp3d-candidate.mjs --structure "Femur.l"');
  return argv[1];
}
export async function buildLocalCandidate(structureName,{root=ROOT,sourceDir=SOURCES,outputDir=OUTPUT}={}){
  if(!path.resolve(outputDir).startsWith(path.resolve(root,'local-data')+path.sep))
    throw new Error('Output must remain inside local-data, never apps/anatomy or public assets');
  const names=fs.readFileSync(path.join(sourceDir,'isa_parts_list_e.txt'),'utf8');
  const elements=fs.readFileSync(path.join(sourceDir,'isa_element_parts.txt'),'utf8');
  const archive=path.join(sourceDir,'isa_BP3D_4.0_obj_99.zip');
  const files=execFileSync('unzip',['-Z','-1',archive],{encoding:'utf8',maxBuffer:16*1024*1024}).trim().split(/\r?\n/);
  checkArchiveEntryNames(files);
  const catalog=JSON.parse(fs.readFileSync(path.join(root,'apps/anatomy/public/data/atlas-catalog.json'),'utf8'));
  const crosswalk=candidateCrosswalk(catalog,parseOfficialNames(names));
  const report=mapActualMeshFiles(crosswalk,parseOfficialElements(elements),files);
  const match=report.candidates.find(x=>x.atlasName===structureName);
  if(!match||match.state!=='candidate'||match.matches.length!==1)
    throw new Error('No unambiguous official name/candidate for '+structureName);
  const source=match.matches[0];
  if(!source.sourceObjs.length||source.sourceObjs.some(x=>!x.archivePath))
    throw new Error('Official OBJ files missing; do not invent structure geometry');
  const parts=source.sourceObjs.map(item=>{
    const bytes=execFileSync('unzip',['-p',archive,item.archivePath],{maxBuffer:MAX_OBJ_BYTES});
    if(bytes.length>MAX_OBJ_BYTES)throw new Error('Official OBJ exceeds size limit');
    return {id:item.fileId,text:bytes.toString('utf8'),sha256:sha(bytes),file:item.archivePath};
  });
  const lineage={schemaVersion:1,source:BP3D_OFFICIAL,sourceArchive:'isa_BP3D_4.0_obj_99.zip',
    archiveSHA256:sha(fs.readFileSync(archive)),officialName:source.officialName,
    officialFMAId:source.fmaId,officialRepresentationId:source.bpId,
    atlasCandidateName:structureName,
    elements:parts.map(({id,sha256,file})=>({id,sha256,zipEntry:file})),
    coordinateFrame:'native-official-OBJ',registrationValidated:false,
    geometryAnatomyValidated:false,approvedForDistribution:false,
    warning:'Independent candidate geometry, not a validated registered 3D/CT/USG replacement.'};
  const glb=await makeGlb(parts,structureName,lineage);
  const safe=structureName.replace(/[^a-zA-Z0-9._-]/g,'_');
  const dest=path.join(outputDir,safe);
  fs.mkdirSync(dest,{recursive:true});
  fs.writeFileSync(path.join(dest,'model.glb'),glb);
  lineage.generatedGLBSHA256=sha(glb);
  fs.writeFileSync(path.join(dest,'lineage.json'),JSON.stringify(lineage,null,2)+'\n');
  return {directory:dest,triangles:parts.reduce((n,p)=>n+readObjTriangles(p.text).stats.triangles,0),
    glbBytes:glb.length,sourceElements:parts.length,distributable:false};
}
if(process.argv[1]===fileURLToPath(import.meta.url)){
  try{console.log(JSON.stringify(await buildLocalCandidate(parseArgs(process.argv.slice(2))),null,2));}
  catch(err){console.error(err);process.exitCode=1;}
}
