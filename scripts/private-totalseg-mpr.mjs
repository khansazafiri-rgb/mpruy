/**
 * One shared LOCAL-ONLY, bounded, downsampled CT and organ-mask bundle.
 * One source volume may be reused by multiple region views; paired CT sources
 * use the same codec, geometry, canvas and UI with independent provenance.
 */
import fs from 'node:fs';
import zlib from 'node:zlib';
import path from 'node:path';
import crypto from 'node:crypto';
import { fileURLToPath } from 'node:url';
import geometry from './private-totalseg-mpr-geometry.cjs';
const MiB=1024*1024;
const sha=b=>crypto.createHash('sha256').update(b).digest('hex');
const PAGE=fileURLToPath(new URL('./private-totalseg-mpr-template.html',import.meta.url));

export function createPrivateMprPack(ct,{maxDim=144}={}){
  if(ct?.kind!=='ct'||!Array.isArray(ct.dims)||ct.dims.length!==3||
     !ct.dims.every(n=>Number.isInteger(n)&&n>=4&&n<=1024)||
     !Number.isInteger(maxDim)||maxDim<32||maxDim>192)
    throw Error('CT_MPR_INVALID_GEOMETRY_OR_TARGET');
  const ratio=Math.min(1,maxDim/Math.max(...ct.dims));
  const dims=ct.dims.map(n=>Math.max(4,Math.min(n,Math.round(n*ratio))));
  const voxelCount=dims.reduce((a,b)=>a*b,1);
  if(voxelCount>192**3)throw Error('CT_MPR_TOO_MANY_VOXELS');
  const axisMap=dims.map((size,i)=>Uint16Array.from({length:size},
    (_,j)=>Math.min(ct.dims[i]-1,Math.floor((j+.5)*ct.dims[i]/size))));
  const hu=new Int16Array(voxelCount),maskBits=new Uint16Array(voxelCount);
  const [X,Y,Z]=dims,[srcX,srcY]=ct.dims;
  let clipped=0;
  for(let z=0;z<Z;z++)for(let y=0;y<Y;y++)for(let x=0;x<X;x++){
    const old=axisMap[0][x]+srcX*(axisMap[1][y]+srcY*axisMap[2][z]);
    const real=ct.read(old)*ct.scale+ct.intercept;
    if(!Number.isFinite(real))throw Error('CT_MPR_NONFINITE_HU');
    const v=Math.round(real);
    if(v<-32768||v>32767)clipped++;
    hu[x+X*(y+Y*z)]=Math.max(-32768,Math.min(32767,v));
  }
  if(clipped>voxelCount/100)throw Error('CT_MPR_EXCESSIVE_HU_CLIPPING');
  geometry.describe(ct.affine,ct.dims,axisMap);
  return {dims,sourceDims:[...ct.dims],sourceAffine:[...ct.affine],sourceUnits:ct.spatialUnits||'unknown',axisMap,
    hu,maskBits,organs:[],clippedHU:clipped};
}
export function addPrivateMprOrgan(pack,mask,organ){
  if(!pack||!mask||mask.kind!=='mask'||!organ||
     !/^[a-z][A-Za-z0-9_]{0,69}$/.test(organ.id||'')||
     pack.organs.some(o=>o.id===organ.id)||pack.organs.length>=30||
     !Array.isArray(organ.rgb)||organ.rgb.length!==3||
     !organ.rgb.every(n=>Number.isInteger(n)&&n>=0&&n<=255)||
     !Array.isArray(mask.dims)||mask.dims.join(',')!==pack.sourceDims.join(',')||
     (mask.spatialUnits||'unknown')!==pack.sourceUnits||
     !Array.isArray(mask.affine)||mask.affine.length!==12||!mask.affine.every(Number.isFinite)||
     mask.affine.some((v,i)=>Math.abs(v-pack.sourceAffine[i])>0.001)||
     mask.scale!==1||mask.intercept!==0)
    throw Error('CT_MPR_MASK_GRID_OR_LABEL_INVALID');
  const bit=2**pack.organs.length,[X,Y,Z]=pack.dims,[srcX,srcY]=pack.sourceDims;
  // Validate the entire source mask, including voxels omitted by downsampling.
  // A corrupt label must not disappear merely because its voxel was not sampled.
  for(let i=0,n=pack.sourceDims.reduce((a,b)=>a*b,1);i<n;i++){
    const value=mask.read(i);
    if(value!==0&&value!==1)throw Error('CT_MPR_MASK_NOT_BINARY');
  }
  // Promote from v1 uint16 to v2 uint32 only when a 16th authentic mask
  // is appended. Earlier 11-mask bundles remain binary-compatible.
  if(pack.organs.length===15 && pack.maskBits.BYTES_PER_ELEMENT===2)
    pack.maskBits=Uint32Array.from(pack.maskBits);
  let positive=0;
  for(let z=0;z<Z;z++)for(let y=0;y<Y;y++)for(let x=0;x<X;x++){
    const old=pack.axisMap[0][x]+srcX*(pack.axisMap[1][y]+srcY*pack.axisMap[2][z]);
    const value=mask.read(old);
    if(value!==0&&value!==1)throw Error('CT_MPR_MASK_NOT_BINARY');
    if(value===1){
      pack.maskBits[x+X*(y+Y*z)]|=bit;
      positive++;
    }
  }
  if(!positive)throw Error('CT_MPR_EMPTY_DOWNSAMPLED_MASK:'+organ.id);
  pack.organs.push({id:organ.id,label:organ.label||organ.id,
    rgb:[...organ.rgb],bit,sampledVoxels:positive,
    ...(Array.isArray(organ.studios)?{studios:[...organ.studios]}:{})});
  return positive;
}
export function recommendMprSlices(pack, organIds){
  if(!pack||!Array.isArray(organIds)||!organIds.length)
    throw Error('CT_MPR_INVALID_ROI');
  let selected=0;
  for(const organ of pack.organs)if(organIds.includes(organ.id))selected|=organ.bit;
  if(!selected)throw Error('CT_MPR_NO_ORGANS_FOR_ROI');
  const [X,Y,Z]=pack.dims;
  const xs=new Uint32Array(X),ys=new Uint32Array(Y),zs=new Uint32Array(Z);
  let labeled=0;
  for(let i=0;i<pack.maskBits.length;i++){
    if(!(pack.maskBits[i]&selected))continue;
    labeled++;
    xs[i%X]++;
    ys[Math.floor(i/X)%Y]++;
    zs[Math.floor(i/(X*Y))]++;
  }
  if(!labeled)throw Error('CT_MPR_EMPTY_ROI');
  const argmax=a=>{
    let best=0;
    for(let i=1;i<a.length;i++)if(a[i]>a[best])best=i;
    return best;
  };
  return {x:argmax(xs),y:argmax(ys),z:argmax(zs)};
}
export function encodePrivateMprPack(pack,{sourceSubject,archiveSha256,sourceCtSha256,datasetId=null}={}){
  if(!pack?.organs.length||!/^s\d{3,6}$/.test(sourceSubject||'')||
     !/^[a-f0-9]{64}$/.test(archiveSha256||'')||/^0{64}$/.test(archiveSha256)||
     !/^[a-f0-9]{64}$/.test(sourceCtSha256||'')||/^0{64}$/.test(sourceCtSha256))
    throw Error('CT_MPR_UNVERIFIED_OR_EMPTY_DATA');
  const encode=(values,width)=>{
    const b=Buffer.allocUnsafe(values.length*width);
    for(let i=0;i<values.length;i++){
      if(width===2)b.writeUInt16LE(values[i]&65535,i*2);
      else b.writeUInt32LE(values[i]>>>0,i*4);
    }
    const compressed=zlib.gzipSync(b,{level:6});
    if(compressed.length>48*MiB)throw Error('CT_MPR_BUNDLE_TOO_LARGE');
    return {base64:compressed.toString('base64'),compressedBytes:compressed.length,
      uncompressedBytes:b.length,sha256:sha(b)};
  };
  return {
    schema:pack.maskBits.BYTES_PER_ELEMENT===4?'medcoel.private-mpr-ct.v2':'medcoel.private-mpr-ct.v1',
    subject:sourceSubject,archiveSha256,ctMemberSha256:sourceCtSha256,
    ...(datasetId?{datasetId}:{}),
    geometry:'voxel-index only; nearest-neighbour sampled; NO clinical orientation',
    originalDimensions:pack.sourceDims,dimensions:pack.dims,
    sourceAffine:pack.sourceAffine,sourceUnits:pack.sourceUnits,
    sampledSourceIndices:pack.axisMap.map(a=>Array.from(a)),
    indexGeometry:geometry.describe(pack.sourceAffine,pack.sourceDims,pack.axisMap),
    compression:'gzip',dtype:pack.maskBits.BYTES_PER_ELEMENT===4?
      'int16-hu-and-uint32-mask-bitset-le':'int16-hu-and-uint16-mask-bitset-le',
    hu:encode(pack.hu,2),masks:encode(pack.maskBits,pack.maskBits.BYTES_PER_ELEMENT),
    organs:pack.organs,clippedHU:pack.clippedHU,
    recommendedSlices:Object.fromEntries(
      ['abdomen-ct','chest-ct','brain-ct','cardiac-ct']
        .map(studio=>[studio,pack.organs.filter(o=>Array.isArray(o.studios)?
          o.studios.includes(studio):studio==='chest-ct'?
          /^lung_|^heart$/.test(o.id):studio==='abdomen-ct'?
          !/^lung_|^heart$/.test(o.id):false).map(o=>o.id)])
        .filter(([,ids])=>ids.length)
        .map(([studio,ids])=>[studio,recommendMprSlices(pack,ids)])
    ),
    orientationApproved:false,clinicalApproved:false,privacyApproved:false,rightsApproved:false,
    releaseEligible:false
  };
}
export function privateMprPage(studio){
  if(!['chest-ct','abdomen-ct','brain-ct','cardiac-ct'].includes(studio))throw Error('CT_MPR_INVALID_STUDIO');
  const title=({'chest-ct':'Thorax CT','abdomen-ct':'Abdomen CT',
    'brain-ct':'Brain CT','cardiac-ct':'Cardiac CT'})[studio];
  const tcia=studio==='chest-ct'
    ? 'Sumber TCIA Chest CT lama TETAP DIKARANTINA. Ini kandidat TotalSegmentator yang terpisah. '
    : '';
  const paired=['brain-ct','cardiac-ct'].includes(studio);
  const attribution=paired?(
    studio==='brain-ct'
      ? 'Brain CT: candidate evidence MISTIE III manual brain CT masks (PhysioNet 1.0, 2026, DOI 10.13026/a3rk-n089). Restricted Health Data License; NOT approved for public/commercial delivery.'
      : 'Cardiac CT: candidate evidence MM-WHS 2017 cardiac CTA with seven whole-heart structures. Registration/use terms require independent confirmation; NOT a coronary artery segmentation dataset.'
  ):'Jakob Wasserthal, Small subset of TotalSegmentator Dataset 2.0.1, Zenodo DOI 10.5281/zenodo.10047263; publisher-declared CC BY 4.0.';
  return fs.readFileSync(PAGE,'utf8')
    .replaceAll('@@STUDIO@@',studio).replaceAll('@@TITLE@@',title)
    .replaceAll('@@TCIA_WARNING@@',tcia)
    .replaceAll('@@BUNDLE_DIR@@',paired?'../'+studio+'-mpr-private':'../ct-mpr-private')
    .replaceAll('@@ATTRIBUTION@@',attribution)
    .replaceAll('@@SOURCE_LABEL@@',paired?'Pasangan CT dan mask sumber yang diverifikasi':'TotalSegmentator 2.0.1, satu subjek pseudonim')
    .replaceAll('@@INTENSITY_WARNING@@',paired?
      'Skala intensitas NIfTI belum terverifikasi sebagai HU diagnostik; preset window hanya untuk review teknis.':
      'Window HU bersifat pratinjau teknis; kalibrasi dan keputusan klinis belum disetujui.')
    .replaceAll('<a href="static-review.html">Preview statis sebelumnya</a>',
      paired?'Preview privat dari pasangan data asli':'<a href="static-review.html">Preview statis sebelumnya</a>');
}
