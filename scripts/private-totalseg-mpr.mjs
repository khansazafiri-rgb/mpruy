/**
 * One shared LOCAL-ONLY, bounded, downsampled CT and organ-mask bundle.
 * One source volume is reused by two interactive CT studios.
 */
import fs from 'node:fs';
import zlib from 'node:zlib';
import path from 'node:path';
import crypto from 'node:crypto';
import { fileURLToPath } from 'node:url';
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
  return {dims,sourceDims:[...ct.dims],sourceAffine:[...ct.affine],axisMap,
    hu,maskBits,organs:[],clippedHU:clipped};
}
export function addPrivateMprOrgan(pack,mask,organ){
  if(!pack||!mask||mask.kind!=='mask'||!organ||
     !/^[a-z0-9_]{1,70}$/.test(organ.id||'')||
     pack.organs.some(o=>o.id===organ.id)||pack.organs.length>=15||
     !Array.isArray(organ.rgb)||organ.rgb.length!==3||
     !organ.rgb.every(n=>Number.isInteger(n)&&n>=0&&n<=255)||
     mask.dims.join(',')!==pack.sourceDims.join(',')||
     mask.affine.some((v,i)=>Math.abs(v-pack.sourceAffine[i])>0.001)||
     mask.scale!==1||mask.intercept!==0)
    throw Error('CT_MPR_MASK_GRID_OR_LABEL_INVALID');
  const bit=1<<pack.organs.length,[X,Y,Z]=pack.dims,[srcX,srcY]=pack.sourceDims;
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
    rgb:[...organ.rgb],bit,sampledVoxels:positive});
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
export function encodePrivateMprPack(pack,{sourceSubject,archiveSha256,sourceCtSha256}={}){
  if(!pack?.organs.length||!/^s\d{3,6}$/.test(sourceSubject||'')||
     !/^[a-f0-9]{64}$/.test(archiveSha256||'')||
     !/^[a-f0-9]{64}$/.test(sourceCtSha256||''))
    throw Error('CT_MPR_UNVERIFIED_OR_EMPTY_DATA');
  const encode=values=>{
    const b=Buffer.allocUnsafe(values.length*2);
    for(let i=0;i<values.length;i++)b.writeUInt16LE(values[i]&65535,i*2);
    const compressed=zlib.gzipSync(b,{level:6});
    if(compressed.length>48*MiB)throw Error('CT_MPR_BUNDLE_TOO_LARGE');
    return {base64:compressed.toString('base64'),compressedBytes:compressed.length,
      uncompressedBytes:b.length,sha256:sha(b)};
  };
  return {
    schema:'medcoel.private-mpr-ct.v1',
    subject:sourceSubject,archiveSha256,ctMemberSha256:sourceCtSha256,
    geometry:'voxel-index only; nearest-neighbour sampled; NO clinical orientation',
    originalDimensions:pack.sourceDims,dimensions:pack.dims,
    compression:'gzip',dtype:'int16-hu-and-uint16-mask-bitset-le',
    hu:encode(pack.hu),masks:encode(pack.maskBits),
    organs:pack.organs,clippedHU:pack.clippedHU,
    recommendedSlices:{
      'abdomen-ct':recommendMprSlices(pack,pack.organs
        .filter(o=>!/^lung_|^heart$/.test(o.id)).map(o=>o.id)),
      'chest-ct':recommendMprSlices(pack,pack.organs
        .filter(o=>/^lung_|^heart$/.test(o.id)).map(o=>o.id))
    },
    clinicalApproved:false,privacyApproved:false,rightsApproved:false,
    releaseEligible:false
  };
}
export function privateMprPage(studio){
  if(!['chest-ct','abdomen-ct'].includes(studio))throw Error('CT_MPR_INVALID_STUDIO');
  const title=studio==='chest-ct'?'Thorax CT':'Abdomen CT';
  const tcia=studio==='chest-ct'
    ? 'Sumber TCIA Chest CT lama TETAP DIKARANTINA. Ini kandidat TotalSegmentator yang terpisah. '
    : '';
  return fs.readFileSync(PAGE,'utf8')
    .replaceAll('@@STUDIO@@',studio).replaceAll('@@TITLE@@',title)
    .replaceAll('@@TCIA_WARNING@@',tcia);
}
