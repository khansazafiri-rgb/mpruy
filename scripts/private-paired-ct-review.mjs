#!/usr/bin/env node
/**
 * PRIVATE ONLY: CT+segmentation import for Brain CT and Cardiac CT.
 * Source data are never downloaded, guessed, copied to public/ or registered
 * as release-cleared. This importer requires owner-local pinned source bytes.
 *
 * Same MPR codec, geometry, canvas renderer and page template as body CT.
 * All images shown from source voxels. No synthetic data in this importer.
 */
import fs from 'node:fs';
import path from 'node:path';
import crypto from 'node:crypto';
import {fileURLToPath} from 'node:url';
import {parsePrivateTotalSegNifti,verifyNiftiPair} from './private-totalseg-ct-review.mjs';
import {createPrivateMprPack,addPrivateMprOrgan,encodePrivateMprPack,privateMprPage} from './private-totalseg-mpr.mjs';

const ROOT=fileURLToPath(new URL('../',import.meta.url));
const INPUT=path.join(ROOT,'local-data/studio-resources/paired-ct-inputs');
const OUTPUT=path.join(ROOT,'local-data/studio-resources/review-overlays');
const sha=b=>crypto.createHash('sha256').update(b).digest('hex');
const SHA=/^[a-f0-9]{64}$/;
const ALIAS=/^s\d{3,6}$/;
const MB=1024*1024;
export const PRIVATE_CT_SOURCE_PROFILES=Object.freeze({
 'brain-ct':Object.freeze({
  sourceId:'mistie-iii-brain-segmentation-v1',
  sourceUrl:'https://physionet.org/content/mistie-iii-brain-segmentation/1.0/',
  sourceScope:'Non-contrast head CT with manually annotated whole-brain mask (10 selected MISTIE III scans). NOT a diagnostic lesion label.',
  access:'PhysioNet Restricted Health Data License 1.5.0; credentialed access and data-use agreement mandatory; commercial/public redistribution NOT approved.',
  backgroundValues:[0,-2000], // Dataset documentation: one mask uses -2000 outside image.
  labels:[{id:'brain',value:1,label:'Otak · seluruh jaringan (mask manual)',rgb:[233,171,96],studios:['brain-ct']}]
 }),
 'cardiac-ct':Object.freeze({
  sourceId:'mm-whs-2017-cardiac-cta',
  sourceUrl:'https://zmiclab.github.io/zxh/0/mmwhs/data.html',
  sourceScope:'Cardiac CT/CTA with 7 manual whole-heart classes; NOT coronary artery or coronary stenosis segmentation.',
  access:'MM-WHS registration and organizer terms required; commercial/public redistribution rights NOT established.',
  backgroundValues:[0],
  labels:[
   {id:'heart_ventricle_left',value:500,label:'Ventrikel kiri (rongga)',rgb:[231,96,119],studios:['cardiac-ct']},
   {id:'heart_ventricle_right',value:600,label:'Ventrikel kanan (rongga)',rgb:[122,157,242],studios:['cardiac-ct']},
   {id:'heart_atrium_left',value:420,label:'Atrium kiri (rongga)',rgb:[244,154,120],studios:['cardiac-ct']},
   {id:'heart_atrium_right',value:550,label:'Atrium kanan (rongga)',rgb:[133,208,228],studios:['cardiac-ct']},
   {id:'heart_myocardium',value:205,label:'Miokardium ventrikel kiri',rgb:[216,121,172],studios:['cardiac-ct']},
   {id:'aorta_ascending',value:820,label:'Aorta asendens',rgb:[247,201,102],studios:['cardiac-ct']},
   {id:'pulmonary_artery',value:850,label:'Arteri pulmonalis',rgb:[143,202,192],studios:['cardiac-ct']}
  ]
 })
});

function ensurePrivateRegular(file,root,maxBytes){
 const absolute=path.resolve(file),base=path.resolve(root);
 if(!absolute.startsWith(base+path.sep))throw Error('PAIRED_CT_PATH_NOT_PRIVATE');
 // Reject symlinks along the entire repo-local source path, including
 // local-data and studio-resources ancestors, not only below INPUT.
 let ancestor=ROOT;
 for(const part of path.relative(ROOT,absolute).split(path.sep)){
  ancestor=path.join(ancestor,part);
  if(fs.lstatSync(ancestor,{throwIfNoEntry:false})?.isSymbolicLink())
   throw Error('PAIRED_CT_SYMLINK_REFUSED');
 }
 let current=base;
 const baseInfo=fs.lstatSync(base);
 if(!baseInfo.isDirectory()||baseInfo.isSymbolicLink())throw Error('PAIRED_CT_BASE_UNSAFE');
 for(const part of path.relative(base,absolute).split(path.sep)){
  current=path.join(current,part);
  const info=fs.lstatSync(current,{throwIfNoEntry:false});
  if(info?.isSymbolicLink())throw Error('PAIRED_CT_SYMLINK_REFUSED');
 }
 const st=fs.statSync(absolute);
 if(!st.isFile()||st.size<1||st.size>maxBytes)throw Error('PAIRED_CT_NOT_REGULAR_OR_OVERSIZED');
 return absolute;
}
function safePrivateWrite(file,bytes){
 const abs=path.resolve(file),root=path.resolve(OUTPUT);
 if(!abs.startsWith(root+path.sep))throw Error('PAIRED_CT_OUTPUT_NOT_PRIVATE');
 let cursor=ROOT;
 for(const part of path.relative(ROOT,path.dirname(abs)).split(path.sep)){
  cursor=path.join(cursor,part);
  if(fs.lstatSync(cursor,{throwIfNoEntry:false})?.isSymbolicLink())throw Error('PAIRED_CT_OUTPUT_SYMLINK');
 }
 fs.mkdirSync(path.dirname(abs),{recursive:true,mode:0o700});
 if(fs.lstatSync(abs,{throwIfNoEntry:false})?.isSymbolicLink())throw Error('PAIRED_CT_OUTPUT_SYMLINK');
 fs.writeFileSync(abs,bytes,{mode:0o600,flag:'w'});
}
/** A source-label projection, never a generated or inferred segmentation. */
export function makePrivatePairedCtPack({studio,ct,segmentation,subjectAlias,sourceId,sourceCtSha256,sourceMaskSha256,maxDim=144}){
 const profile=PRIVATE_CT_SOURCE_PROFILES[studio];
 if(!profile||profile.sourceId!==sourceId||!ALIAS.test(subjectAlias||'')||
    ![sourceCtSha256,sourceMaskSha256].every(h=>SHA.test(h||'')&&!/^0{64}$/.test(h)))
   throw Error('PAIRED_CT_UNVERIFIED_SOURCE_ID_OR_DIGEST');
 verifyNiftiPair(ct,segmentation);
 const counts=new Map();
 const allowed=new Set([...profile.backgroundValues,...profile.labels.map(x=>x.value)]);
 for(let i=0;i<segmentation.n;i++){
  const value=segmentation.read(i);
  if(!Number.isInteger(value)||!allowed.has(value))
    throw Error('PAIRED_CT_UNEXPECTED_SOURCE_LABEL:'+String(value));
  counts.set(value,(counts.get(value)||0)+1);
 }
 const present=profile.labels.filter(l=>(counts.get(l.value)||0)>0);
 if(!present.length)throw Error('PAIRED_CT_SOURCE_LABELS_EMPTY');
 const pack=createPrivateMprPack(ct,{maxDim});
 for(const label of present){
  const projected={...segmentation,kind:'mask',
    read:i=>segmentation.read(i)===label.value?1:0};
  addPrivateMprOrgan(pack,projected,label);
 }
 const binding=sha(Buffer.from(JSON.stringify({
  sourceId,subjectAlias,sourceCtSha256,sourceMaskSha256,
  purpose:'PRIVATE_SOURCE_PAIR_RECEIPT_NOT_PUBLISHER_ARCHIVE'
 })));
 // The archiveSha256 codec field is a verified *source-pair receipt digest*
 // for independent raw NIfTI pairs, NOT a claim of a publisher ZIP archive.
 const payload={...encodePrivateMprPack(pack,{
  sourceSubject:subjectAlias,archiveSha256:binding,
  sourceCtSha256,datasetId:sourceId
 }),intensityCalibration:'UNVERIFIED_SOURCE_NUMERIC_SCALE'};
 return {payload,sourcePairReceiptSha256:binding,
  sourceLabelsPresent:present.map(l=>({id:l.id,sourceValue:l.value,voxels:counts.get(l.value)})),
  sourceScope:profile.sourceScope,sourceAccess:profile.access,
  intensityCalibration:'UNVERIFIED_SOURCE_NUMERIC_SCALE',
  sourceOfficialUrl:profile.sourceUrl,
  clinicalApproved:false,privacyApproved:false,rightsApproved:false,
  releaseEligible:false};
}
export async function generatePrivatePairedCtReview(studio){
 const profile=PRIVATE_CT_SOURCE_PROFILES[studio];
 if(!profile)throw Error('PAIRED_CT_UNSUPPORTED_STUDIO');
 const folder=path.join(INPUT,studio);
 const manifestPath=ensurePrivateRegular(path.join(folder,'manifest.json'),INPUT,16*1024);
 const manifestBytes=fs.readFileSync(manifestPath),m=JSON.parse(manifestBytes);
 if(m.schema!=='medcoel.private-paired-ct-input.v1'||m.studio!==studio||
    m.sourceId!==profile.sourceId||!ALIAS.test(m.subjectAlias||'')||
    !m.files||Object.keys(m.files).sort().join(',')!=='ct,segmentation')
  throw Error('PAIRED_CT_INVALID_MANIFEST_OR_SOURCE_SCOPE');
 const sourceBytes={};
 for(const name of ['ct','segmentation']){
  const entry=m.files[name];
  if(!entry||!SHA.test(entry.sha256||'')||/^0{64}$/.test(entry.sha256)||
     typeof entry.filename!=='string'||!/^[_A-Za-z0-9.-]{1,100}\.nii\.gz$/.test(entry.filename)||
     entry.filename==='..'||entry.filename.includes('..'))
   throw Error('PAIRED_CT_SOURCE_FILE_NOT_PINNED');
  const file=ensurePrivateRegular(path.join(folder,entry.filename),INPUT,200*MB);
  const b=fs.readFileSync(file);
  if(sha(b)!==entry.sha256)throw Error('PAIRED_CT_SOURCE_SHA256_MISMATCH');
  sourceBytes[name]=b;
 }
 const ct=parsePrivateTotalSegNifti(sourceBytes.ct,'ct');
 const segmentation=parsePrivateTotalSegNifti(sourceBytes.segmentation,'mask');
 const result=makePrivatePairedCtPack({studio,ct,segmentation,
  subjectAlias:m.subjectAlias,sourceId:m.sourceId,
  sourceCtSha256:m.files.ct.sha256,sourceMaskSha256:m.files.segmentation.sha256});
 const out=path.join(OUTPUT,studio+'-mpr-private');
 safePrivateWrite(path.join(out,'geometry.js'),fs.readFileSync(new URL('./private-totalseg-mpr-geometry.cjs',import.meta.url)));
 safePrivateWrite(path.join(out,'viewer.js'),fs.readFileSync(new URL('./private-totalseg-mpr-browser.js',import.meta.url)));
 safePrivateWrite(path.join(out,'volume.js'),
  'window.MEDCOEL_CT_PRIVATE = '+JSON.stringify(result.payload)+';\n');
 const receipt={schema:'medcoel.private-paired-ct-review.v1',
  studio,sourceId:m.sourceId,sourceOfficialUrl:profile.sourceUrl,
  sourceAccess:profile.access,sourceScope:profile.sourceScope,
  subjectAlias:m.subjectAlias,sourceCtSha256:m.files.ct.sha256,
  sourceMaskSha256:m.files.segmentation.sha256,
  sourcePairReceiptSha256:result.sourcePairReceiptSha256,
  sourceManifestSha256:sha(manifestBytes),sourceLabelsPresent:result.sourceLabelsPresent,
  intensityCalibration:'UNVERIFIED_SOURCE_NUMERIC_SCALE',
  sourceAffine:result.payload.sourceAffine,sourceUnits:result.payload.sourceUnits,
  originalDimensions:result.payload.originalDimensions,
  sampledDimensions:result.payload.dimensions,
  files:Object.fromEntries(['geometry.js','viewer.js','volume.js'].map(name=>{
   const bytes=fs.readFileSync(path.join(out,name));
   return [name,{sha256:sha(bytes),bytes:bytes.length}];
  })),
  clinicalApproved:false,privacyApproved:false,rightsApproved:false,
  releaseEligible:false};
 safePrivateWrite(path.join(out,'bundle-manifest.json'),JSON.stringify(receipt,null,2)+'\n');
 safePrivateWrite(path.join(OUTPUT,studio,'index.html'),privateMprPage(studio));
 return {studio,status:'PRIVATE_SOURCE_PAIR_REVIEW_READY',sourceId:m.sourceId,
  masks:result.sourceLabelsPresent.length,releaseEligible:false,
  localPage:path.join(OUTPUT,studio,'index.html')};
}
if(process.argv[1]&&path.resolve(process.argv[1])===fileURLToPath(import.meta.url)){
 const args=process.argv.slice(2);
 if(args.length!==1||!PRIVATE_CT_SOURCE_PROFILES[args[0]]){
  console.error('Usage: node scripts/private-paired-ct-review.mjs brain-ct|cardiac-ct');
  process.exitCode=2;
 }else generatePrivatePairedCtReview(args[0])
  .then(result=>console.log(JSON.stringify(result,null,2)))
  .catch(err=>{console.error('PRIVATE_PAIRED_CT_BLOCKED: '+err.message);process.exitCode=1;});
}
