#!/usr/bin/env node
/**
 * PRIVATE, fail-closed replacement candidate for the public skeletal/visceral
 * Z-Anatomy mixed-asset bundles. No third-party Atlas viewer code is reused.
 *
 * Source: official DBCLS BodyParts3D 4.0, converted by the existing vetted
 * batch process. Generated output is gitignored. No production promotion.
 *
 * Run: npm run prepare:bp3d-skeletal-visceral
 */
import fs from 'node:fs';
import path from 'node:path';
import crypto from 'node:crypto';
import {fileURLToPath} from 'node:url';
import {buildCompositeHTML} from '../apps/4d-lab/tools/bp3d-composite-viewer.mjs';

const ROOT=fileURLToPath(new URL('../',import.meta.url));
export const INPUT=path.join(ROOT,'local-data/licensing-quarantine/bp3d-batch');
export const OUTPUT=path.join(ROOT,'local-data/licensing-quarantine/bp3d-skeletal-visceral-replacement');
const SYSTEMS=new Set(['skeletal','visceral']);
const SHA=/^[a-f0-9]{64}$/;
const MAX_GLBBYTES=32*1024*1024;
const MAX_TOTAL_BYTES=650*1024*1024;
const sha=b=>crypto.createHash('sha256').update(b).digest('hex');

function safeFile(root,relative,{optional=false}={}){
 if(typeof relative!=='string'||relative.startsWith('/')||
    relative.includes('\\')||relative.split('/').some(x=>!x||x==='.'||x==='..'))
  throw Error('BP3D_UNSAFE_PATH');
 const base=path.resolve(root),filename=path.resolve(base,relative);
 if(!filename.startsWith(base+path.sep))throw Error('BP3D_PATH_ESCAPE');
 let current=base;
 const bi=fs.lstatSync(current,{throwIfNoEntry:false});
 if(!bi||bi.isSymbolicLink()||!bi.isDirectory())throw Error('BP3D_INVALID_ROOT');
 for(const name of relative.split('/')){
  current=path.join(current,name);
  const stat=fs.lstatSync(current,{throwIfNoEntry:false});
  if(stat?.isSymbolicLink())throw Error('BP3D_SYMLINK_DENIED');
 }
 const stat=fs.lstatSync(filename,{throwIfNoEntry:false});
 if(!stat){if(optional)return null;throw Error('BP3D_FILE_MISSING:'+relative);}
 if(!stat.isFile())throw Error('BP3D_NOT_FILE');
 return filename;
}
function verifiedBinaries(input,inventory){
 if(inventory?.schemaVersion!==1||
    inventory.kind!=='official-bp3d-bulk-source-review'||
    inventory.legalStatus!=='NOT-CLEARED'||
    !SHA.test(inventory.sourceHashes?.archiveSha256||'')||
    !Array.isArray(inventory.converted))
   throw Error('BP3D_UNVERIFIED_INPUT_INVENTORY');
 const seen=new Set(),records=[],errors=[];
 for(const row of inventory.converted){
  if(!SYSTEMS.has(row.system))continue;
  if(typeof row.id!=='string'||!/^[a-z0-9-]{1,100}$/.test(row.id)||
     seen.has(row.id)||!SHA.test(row.glbSha256||'')||
     !/^FMA[0-9]+$/.test(row.fmaId||'')||
     !/^BP[0-9]+$/.test(row.bpId||'')||
     row.modelPath!=='./structures/'+row.id+'/model.glb')
   throw Error('BP3D_UNSAFE_OR_INCORRECT_MODEL_ID');
  seen.add(row.id);
  const rel='structures/'+row.id+'/model.glb';
  const file=safeFile(input,rel),lineageFile=safeFile(input,'structures/'+row.id+'/lineage.json');
  const buffer=fs.readFileSync(file),lineage=JSON.parse(fs.readFileSync(lineageFile,'utf8'));
  if(buffer.length<20||buffer.length>MAX_GLBBYTES||
     buffer.toString('ascii',0,4)!=='glTF'||
     buffer.readUInt32LE(4)!==2||
     buffer.readUInt32LE(8)!==buffer.length||
     sha(buffer)!==row.glbSha256||
     lineage.generatedGLBSHA256!==row.glbSha256||
     lineage.archiveSHA256!==inventory.sourceHashes.archiveSha256||
     lineage.officialFMAId!==row.fmaId||
     lineage.officialRepresentationId!==row.bpId||
     lineage.atlasCandidateName!==row.name||
     lineage.registrationValidated!==false||
     lineage.geometryAnatomyValidated!==false||
     lineage.approvedForDistribution!==false)
    throw Error('BP3D_MODEL_OR_LINEAGE_MISMATCH:'+row.id);
  errors.push(...(row.diagnostics?.flags||[]).map(flag=>({id:row.id,flag})));
  records.push({row:{...row,registrationValidated:false,approvedForDistribution:false},
    file,bytes:buffer.length,sha256:row.glbSha256,lineageSha256:sha(fs.readFileSync(lineageFile))});
 }
 const coverage=Object.fromEntries([...SYSTEMS].map(system=>[system,records.filter(r=>r.row.system===system).length]));
 if(coverage.skeletal<1||coverage.visceral<1||
    records.reduce((n,r)=>n+r.bytes,0)>MAX_TOTAL_BYTES)
  throw Error('BP3D_REPLACEMENT_INSUFFICIENT_OR_OVERSIZED');
 return {records,coverage,geometryFlags:errors};
}
function copySafe(input,out,relative){
 const file=safeFile(input,relative);
 const target=path.join(out,relative);
 fs.mkdirSync(path.dirname(target),{recursive:true,mode:0o700});
 if(fs.lstatSync(target,{throwIfNoEntry:false})?.isSymbolicLink())throw Error('BP3D_OUTPUT_SYMLINK_DENIED');
 fs.copyFileSync(file,target,fs.constants.COPYFILE_EXCL);
 fs.chmodSync(target,0o600);
}
function copyDirectory(input,out,relative,limit=300){
 const source=path.join(input,relative);
 if(!fs.lstatSync(source).isDirectory()||fs.lstatSync(source).isSymbolicLink())throw Error('BP3D_VENDOR_NOT_DIRECTORY');
 let count=0;
 const walk=sub=>{
  for(const entry of fs.readdirSync(path.join(input,sub),{withFileTypes:true})){
   const next=sub+'/'+entry.name;
   if(entry.isSymbolicLink())throw Error('BP3D_VENDOR_SYMLINK_DENIED');
   if(entry.isDirectory())walk(next);
   else if(entry.isFile()){
    if(++count>limit)throw Error('BP3D_VENDOR_TOO_MANY_FILES');
    copySafe(input,out,next);
   }else throw Error('BP3D_VENDOR_UNSAFE_ENTRY');
  }
 };
 walk(relative);
}
/** An off-production package. Never modifies a Caddy mount or public assets. */
export function prepare({input=INPUT,output=OUTPUT}={}){
 const data=JSON.parse(fs.readFileSync(safeFile(input,'inventory.json'),'utf8'));
 const {records,coverage,geometryFlags}=verifiedBinaries(input,data);
 if(fs.existsSync(output))throw Error('BP3D_OUTPUT_ALREADY_EXISTS_REVIEW_BEFORE_REBUILD');
 const root=path.resolve(ROOT,'local-data');
 if(!path.resolve(output).startsWith(root+path.sep))throw Error('BP3D_OUTPUT_MUST_BE_PRIVATE');
 fs.mkdirSync(output,{recursive:true,mode:0o700});
 try{
  for(const item of records)copySafe(input,output,'structures/'+item.row.id+'/model.glb');
  for(const r of ['coordinate-frame.js','review-materials.js'])copySafe(input,output,r);
  copyDirectory(input,output,'vendor/three');
  const selected=data.converted.filter(x=>SYSTEMS.has(x.system));
  const manifest={schemaVersion:1,kind:'official-bp3d-skeletal-visceral-replacement-candidate',
   source:data.source,sourceHashes:data.sourceHashes,converted:selected,
   referenceSurface:null,
   summary:{skeletal:coverage.skeletal,visceral:coverage.visceral,total:selected.length},
   licenseAttribution:'BodyParts3D, © The Database Center for Life Science licensed under CC Attribution 4.0 International',
   licensingSources:[
    'https://dbarchive.biosciencedbc.jp/en/bodyparts3d/lic.html',
    'https://dbarchive.biosciencedbc.jp/en/bodyparts3d/download.html'
   ],
   olderObjLicenseNotice:'CC BY-SA 2.1 Japan — preserve and assess ShareAlike obligations for the specific archive',
   rightsApproved:false,medicalApproved:false,geometryApproved:false,releaseEligible:false,
   warning:'PARTIAL geometry only; no inferred anatomy, no patient registration, not public-release approved'};
  fs.writeFileSync(path.join(output,'inventory.json'),JSON.stringify(manifest,null,2)+'\n',{mode:0o600,flag:'wx'});
  fs.writeFileSync(path.join(output,'body.html'),buildCompositeHTML(),{mode:0o600,flag:'wx'});
  const proof={schema:'medcoel.private-official-bp3d-replacement.v1',sourceArchiveSha256:data.sourceHashes.archiveSha256,
   coverage,geometryFlags,models:records.map(({row,bytes,sha256,lineageSha256})=>({
    id:row.id,name:row.name,system:row.system,fmaId:row.fmaId,bpId:row.bpId,
    bytes,sha256,lineageSha256,diagnostics:row.diagnostics||null
   })),legalApproval:false,clinicalApproval:false,publicReleaseAllowed:false};
  fs.writeFileSync(path.join(output,'source-proof.json'),JSON.stringify(proof,null,2)+'\n',{mode:0o600,flag:'wx'});
  return {output,coverage,models:selected.length,geometryFlags:geometryFlags.length,
   status:'PRIVATE_REPLACEMENT_CANDIDATE_ONLY',releaseEligible:false};
 }catch(e){fs.rmSync(output,{recursive:true,force:true});throw e;}
}
if(process.argv[1]&&path.resolve(process.argv[1])===fileURLToPath(import.meta.url)){
 try{console.log(JSON.stringify(prepare(),null,2));}
 catch(e){console.error('BP3D_REPLACEMENT_BLOCKED:',e.message);process.exitCode=1;}
}
