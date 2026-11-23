#!/usr/bin/env node
/**
 * MEDCOEL private candidate TotalSegmentator CT slice/organ-mask review.
 * Read only pinned ZIP members, never bulk-extract or publish CT volume.
 * Geometry is displayed in voxel INDEX space, not clinical radiological orientation.
 */
import fs from 'node:fs';
import path from 'node:path';
import crypto from 'node:crypto';
import zlib from 'node:zlib';
import { fileURLToPath } from 'node:url';
import { encodeRgbaPng } from './generate-private-chest-xray-overlays.mjs';
import {
  runPrivateTotalSegAudit, listLocalZipEntries, readVerifiedLocalZipMember
} from './private-totalseg-archive-audit.mjs';

const ROOT=fileURLToPath(new URL('../',import.meta.url));
const ZIP=path.join(ROOT,'local-data/studio-resources/alternative-candidates/totalsegmentator-small-v201/downloads/Totalsegmentator_dataset_small_v201.zip');
const OUTPUT=path.join(ROOT,'local-data/studio-resources/review-overlays');
const MiB=1024*1024;
const SHA=b=>crypto.createHash('sha256').update(b).digest('hex');
const esc=s=>String(s).replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
const GROUPS={
 'abdomen-ct':[
   {id:'liver',label:'Hati · Liver',rgb:[240,166,61],level:40,width:400},
   {id:'kidney_left',label:'Ginjal kiri',rgb:[70,190,244],level:40,width:400},
   {id:'spleen',label:'Limpa · Spleen',rgb:[202,112,241],level:40,width:400},
   {id:'aorta',label:'Aorta',rgb:[255,112,105],level:40,width:400}
 ],
 'chest-ct':[
   {id:'lung_upper_lobe_left',label:'Lobus atas paru kiri',rgb:[92,212,177],level:-600,width:1500},
   {id:'lung_lower_lobe_right',label:'Lobus bawah paru kanan',rgb:[101,159,245],level:-600,width:1500},
   {id:'heart',label:'Jantung · Heart',rgb:[250,111,155],level:40,width:400}
 ]
};
function checkPrivate(file) {
  const rel=path.relative(ROOT,file);
  if(rel.startsWith('..')||path.isAbsolute(rel)||
     !file.startsWith(path.join(ROOT,'local-data')+path.sep))
    throw Error('CT_REVIEW_OUTPUT_NOT_PRIVATE');
  let p=ROOT;
  for(const part of rel.split(path.sep).filter(Boolean)){
    p=path.join(p,part);
    if(fs.lstatSync(p,{throwIfNoEntry:false})?.isSymbolicLink())
      throw Error('CT_REVIEW_SYMLINK_PATH');
  }
}
function writePrivate(file,bytes){
  checkPrivate(file);
  fs.mkdirSync(path.dirname(file),{recursive:true,mode:0o700});
  checkPrivate(file);
  fs.writeFileSync(file,bytes,{mode:0o600});
}
function affineFromNifti(b){
  if(b.readInt16LE(254)>0)
    return Array.from({length:12},(_,i)=>b.readFloatLE(280+i*4));
  if(b.readInt16LE(252)<=0)throw Error('CT_NIFTI_SPATIAL_AFFINE_MISSING');
  const qb=b.readFloatLE(256),qc=b.readFloatLE(260),qd=b.readFloatLE(264);
  const q2=qb*qb+qc*qc+qd*qd;
  if(!Number.isFinite(q2)||q2>1.001)throw Error('CT_NIFTI_QFORM_INVALID');
  const qa=Math.sqrt(Math.max(0,1-q2));
  const dx=b.readFloatLE(80),dy=b.readFloatLE(84),
    dz=b.readFloatLE(88)*(b.readFloatLE(76)<0?-1:1);
  if(![dx,dy,dz].every(x=>Number.isFinite(x)&&Math.abs(x)>1e-5))
    throw Error('CT_NIFTI_PIXDIM_INVALID');
  return [
    (qa*qa+qb*qb-qc*qc-qd*qd)*dx,2*(qb*qc-qa*qd)*dy,2*(qb*qd+qa*qc)*dz,b.readFloatLE(268),
    2*(qb*qc+qa*qd)*dx,(qa*qa+qc*qc-qb*qb-qd*qd)*dy,2*(qc*qd-qa*qb)*dz,b.readFloatLE(272),
    2*(qb*qd-qa*qc)*dx,2*(qc*qd+qa*qb)*dy,(qa*qa+qd*qd-qc*qc-qb*qb)*dz,b.readFloatLE(276)
  ];
}
export function parsePrivateTotalSegNifti(gzip,kind){
  if(!['ct','mask'].includes(kind)||!Buffer.isBuffer(gzip)||gzip.length>200*MiB)
    throw Error('CT_NIFTI_INVALID_SOURCE');
  const b=zlib.gunzipSync(gzip,{maxOutputLength:384*MiB});
  if(b.length<352||b.readInt32LE(0)!==348||
     b.toString('latin1',344,347)!=='n+1')
    throw Error('CT_NIFTI_INVALID_HEADER');
  const count=b.readInt16LE(40),dims=[42,44,46].map(x=>b.readInt16LE(x));
  const n=dims.reduce((a,v)=>a*v,1);
  if(count!==3||dims.some(x=>x<4||x>1024)||n>100000000)
    throw Error('CT_NIFTI_VOLUME_TOO_LARGE_OR_INVALID');
  const dtype=b.readInt16LE(70),bitpix=b.readInt16LE(72);
  const supported=kind==='ct' ? [[4,16],[16,32]] : [[2,8],[4,16]];
  if(!supported.some(([t,b])=>t===dtype&&b===bitpix))
    throw Error('CT_NIFTI_UNSUPPORTED_DATATYPE');
  const offset=b.readFloatLE(108);
  const bytes=bitpix/8;
  if(!Number.isInteger(offset)||offset<352||offset>4096||
     b.length<offset+n*bytes)
    throw Error('CT_NIFTI_SIZE_OR_OFFSET_MISMATCH');
  const affine=affineFromNifti(b);
  if(!affine.every(Number.isFinite))throw Error('CT_NIFTI_INVALID_AFFINE');
  // Reject degenerate voxel geometry; no unsafe assumption about radiological orientation.
  const a=affine;
  const determinant=
    a[0]*(a[5]*a[10]-a[6]*a[9])-
    a[1]*(a[4]*a[10]-a[6]*a[8])+
    a[2]*(a[4]*a[9]-a[5]*a[8]);
  if(!Number.isFinite(determinant)||Math.abs(determinant)<1e-5)
    throw Error('CT_NIFTI_DEGENERATE_AFFINE');
  const slope=b.readFloatLE(112),intercept=b.readFloatLE(116);
  // Nibabel uses NaN/NaN for "undefined scaling"; NIfTI slope=0 also
  // explicitly means no scaling. In either case ignore the intercept.
  const unset=(Number.isNaN(slope)&&Number.isNaN(intercept))||slope===0;
  if(!unset&&(!Number.isFinite(slope)||!Number.isFinite(intercept)))
    throw Error('CT_NIFTI_BAD_SCALING');
  const scale=unset?1:slope, offsetHu=unset?0:intercept;
  const read=i=>{
    const at=offset+i*bytes;
    return dtype===2?b[at]:dtype===4?b.readInt16LE(at):b.readFloatLE(at);
  };
  return {bytes:b,dims,n,kind,affine,dtype,scale,intercept:offsetHu,read,
    headerHash:SHA(b.subarray(0,Math.min(offset,b.length)))};
}
export function verifyNiftiPair(ct,mask){
  if(ct.kind!=='ct'||mask.kind!=='mask'||ct.dims.join(',')!==mask.dims.join(',')||
     ct.affine.some((v,i)=>Math.abs(v-mask.affine[i])>0.001))
    throw Error('CT_NIFTI_MASK_REGISTRATION_MISMATCH');
  if(mask.scale!==1||mask.intercept!==0)
    throw Error('CT_NIFTI_NONBINARY_MASK_SCALING');
  return true;
}
function chooseDenseSlice(mask,axis){
  const [X,Y,Z]=mask.dims,counts=new Uint32Array(axis===2?Z:Y);
  let any=0;
  for(let i=0;i<mask.n;i++){
    const v=mask.read(i);
    if(!Number.isFinite(v)||v<0||v>1)
      throw Error('CT_NIFTI_MASK_MUST_BE_BINARY');
    if(!v)continue;
    any++;
    const slice=axis===2?Math.floor(i/(X*Y)):Math.floor(i/X)%Y;
    counts[slice]++;
  }
  if(!any)throw Error('CT_NIFTI_EMPTY_ORGAN_MASK');
  let best=0;
  for(let i=1;i<counts.length;i++)if(counts[i]>counts[best])best=i;
  if(!counts[best])throw Error('CT_NIFTI_NO_LABELED_SLICE');
  return {index:best,voxels:counts[best],total:any};
}
export function renderPrivateTotalSegPlane(ct,mask,organ,axis){
  verifyNiftiPair(ct,mask);
  if(![1,2].includes(axis)||!organ||!Array.isArray(organ.rgb)||
     organ.rgb.length!==3||!Number.isFinite(organ.level)||
     !Number.isFinite(organ.width)||organ.width<=0)
    throw Error('CT_REVIEW_INVALID_PLANE_CONFIGURATION');
  const where=chooseDenseSlice(mask,axis);
  const [X,Y,Z]=ct.dims;
  const w=X,h=axis===2?Y:Z;
  if(w*h>1200000)throw Error('CT_REVIEW_PLANE_TOO_LARGE');
  const original=Buffer.alloc(w*h*4),over=Buffer.alloc(w*h*4);
  let painted=0;
  for(let v=0;v<h;v++)for(let u=0;u<w;u++){
    // Voxel INDEX coordinates: no claim of left/right/anterior orientation.
    const x=u,y=axis===2?Y-1-v:where.index,z=axis===2?where.index:Z-1-v;
    const voxel=x+X*(y+Y*z),raw=ct.read(voxel);
    const hu=raw*ct.scale+ct.intercept;
    if(!Number.isFinite(hu))throw Error('CT_REVIEW_NONFINITE_INTENSITY');
    const gray=Math.max(0,Math.min(255,Math.round(
      255*((hu-(organ.level-organ.width/2))/organ.width))));
    const positive=mask.read(voxel)>0;
    const at=(v*w+u)*4;
    for(let k=0;k<3;k++){
      original[at+k]=gray;
      over[at+k]=positive?Math.round(gray*.48+organ.rgb[k]*.52):gray;
    }
    original[at+3]=255;over[at+3]=255;
    if(positive)painted++;
  }
  if(painted!==where.voxels)throw Error('CT_REVIEW_MASK_SLICE_COUNT_MISMATCH');
  return {axis:axis===2?'axial-index':'coronal-index',index:where.index,
    width:w,height:h,labeledPixels:painted,organId:organ.id,
    original:encodeRgbaPng(w,h,original),overlay:encodeRgbaPng(w,h,over)};
}
function candidatePage(studio,caseRef,items) {
  const title=studio==='abdomen-ct'?'Abdomen CT':'Thorax CT';
  const cards=items.map((item,i)=>{
    const n=i+1;
    return '<article><h2>'+esc(item.label)+' · '+esc(item.axis)+'</h2>'+
      '<p>Voxel index '+item.index+' · '+item.labeledPixels+' piksel mask sumber · '+item.width+'×'+item.height+'</p>'+
      '<div class="images"><img src="image-'+n+'.png" alt="Original CT plane">'+
      '<img id="layer-'+n+'" class="layer" src="overlay-'+n+'.png" alt="Source mask overlay"></div>'+
      '<p><label>Overlay <input type="range" data-layer="'+n+'" min="0" max="100" value="100"></label> <span id="pct-'+n+'">100%</span></p>'+
      '</article>';
  }).join('\n');
  return '<!doctype html><html lang="id"><head><meta charset="utf-8">'+
    '<meta name="viewport" content="width=device-width,initial-scale=1">'+
    '<title>MEDCOEL private '+esc(title)+' candidate</title>'+
    '<style>:root{font-family:system-ui;color-scheme:dark;color:#eaf2ff;background:#101827}'+
    'body{margin:24px auto;max-width:1320px;padding:16px}p{line-height:1.5;color:#bed0e6}'+
    '.warn{border-left:4px solid #ed9191;padding-left:14px}a{color:#89c9ff}'+
    '.grid{display:grid;grid-template-columns:repeat(auto-fit,minmax(min(100%,400px),1fr));gap:18px}'+
    'article{background:#1a2740;border:1px solid #3d526c;border-radius:14px;padding:16px}'+
    '.images{position:relative;background:black;line-height:0;overflow:hidden;border-radius:7px}'+
    '.images img{width:100%;display:block;height:auto}.images .layer{position:absolute;inset:0}'+
    'input{width:65%}</style></head><body>'+
    '<p><a href="../index.html">Kembali ke Review Hub</a></p>'+
    '<h1>'+esc(title)+' · TotalSegmentator private candidate</h1>'+
    '<p class="warn"><strong>LOCAL ONLY · RELEASE BLOCKED · PRIVACY / MEDICAL / RIGHTS REVIEW PENDING.</strong> '+
    'Ini CT volume dan anotasi mask sumber, BUKAN diagnosis atau validasi anatomi. '+
    'Potongan memakai INDEX voxel, bukan orientasi radiologi diagnostik; posisi L/R belum direview. '+
    'Periksa privasi, alignment, window HU, laterality, attribution, dan akurasi label. '+
    (studio==='chest-ct'?'Sumber TCIA yang sebelumnya dikarantina tetap DIKARANTINA; ini kandidat TotalSegmentator yang terpisah. ':'')+
    'Jangan unggah gambar/HTML ke GitHub atau server publik.</p>'+
    '<p>Subjek sumber pseudonim '+esc(caseRef)+' · '+items.length+' pratinjau 2-D · hanya subset mask.</p>'+
    '<div class="grid">'+cards+'</div>'+
    '<script>document.querySelectorAll("input[data-layer]").forEach(x=>x.addEventListener("input",()=>{'+
    'document.getElementById("layer-"+x.dataset.layer).style.opacity=x.value/100;'+
    'document.getElementById("pct-"+x.dataset.layer).textContent=x.value+"%";'+
    '}));</script></body></html>';
}
/** One verified source subject, bounded CT+mask selection for both regions. */
export async function generatePrivateTotalSegReviews() {
  checkPrivate(ZIP);
  const audit=await runPrivateTotalSegAudit(); // full publisher MD5+SHA256 revalidation
  const subject=audit.privateCandidates[0];
  if(!subject||!/^s\d{3,6}$/.test(subject.subject)||
    !/^s\d{3,6}\/ct\.nii\.gz$/.test(subject.ctPath))
    throw Error('CT_REVIEW_NO_PINNED_SUBJECT');
  const entries=listLocalZipEntries(ZIP),byName=new Map(entries.map(x=>[x.name,x]));
  const member=name=>{
    const e=byName.get(name);
    if(!e)throw Error('CT_REVIEW_SOURCE_MEMBER_MISSING');
    return readVerifiedLocalZipMember(ZIP,e);
  };
  const ctBytes=member(subject.ctPath),ct=parsePrivateTotalSegNifti(ctBytes,'ct');
  const cases={};
  for(const [studio,organs] of Object.entries(GROUPS)){
    const panels=[],provenance=[];
    for(const organ of organs){
      const sourceName=subject.subject+'/segmentations/'+organ.id+'.nii.gz';
      const maskBytes=member(sourceName),mask=parsePrivateTotalSegNifti(maskBytes,'mask');
      verifyNiftiPair(ct,mask);
      for(const axis of [2,1]){
        const frame=renderPrivateTotalSegPlane(ct,mask,organ,axis);
        panels.push({...frame,label:organ.label});
      }
      provenance.push({sourceMask:organ.id,sourceMemberSha256:SHA(maskBytes)});
    }
    const target=path.join(OUTPUT,studio);
    for(const [i,item] of panels.entries()){
      writePrivate(path.join(target,'image-'+(i+1)+'.png'),item.original);
      writePrivate(path.join(target,'overlay-'+(i+1)+'.png'),item.overlay);
    }
    writePrivate(path.join(target,'index.html'),candidatePage(studio,subject.subject,panels));
    writePrivate(path.join(target,'review-summary.json'),JSON.stringify({
      schema:'medcoel.private-totalseg-ct-preview.v1',
      dataset:'totalsegmentator-small-v201',studio,
      sourceSubject:subject.subject,sourceArchiveSha256:audit.archiveSha256,
      sourceCtMemberSha256:SHA(ctBytes),maskReceipts:provenance,
      renderer:'voxel-index-planes',resampling:'none; exact affine and dimensions required',
      orientationApproved:false,clinicalApproved:false,rightsApproved:false,
      privacyApproved:false,releaseEligible:false,
      frames:panels.map(x=>({organ:x.organId,axis:x.axis,index:x.index,
        labeledPixels:x.labeledPixels,width:x.width,height:x.height}))
    },null,2)+'\n');
    cases[studio]={status:'PRIVATE_CANDIDATE_REVIEW_READY',
      images:panels.length,kind:'totalsegmentator-voxel-index-ct-mask',
      note:studio==='chest-ct'?'TotalSegmentator candidate only; old TCIA remains quarantined':
        'TotalSegmentator candidate; no clinical/release approval'};
  }
  return {abdomen:cases['abdomen-ct'],chest:cases['chest-ct']};
}
if(process.argv[1]&&path.resolve(process.argv[1])===fileURLToPath(import.meta.url)){
  generatePrivateTotalSegReviews().then(x=>console.log(JSON.stringify(x,null,2)))
    .catch(e=>{console.error('CT_PRIVATE_PREVIEW_FAILED: '+String(e.message));process.exitCode=1;});
}
