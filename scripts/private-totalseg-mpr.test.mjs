import test from 'node:test';
import assert from 'node:assert/strict';
import zlib from 'node:zlib';
import fs from 'node:fs';
import vm from 'node:vm';
import { fileURLToPath } from 'node:url';
import {
  createPrivateMprPack,addPrivateMprOrgan,encodePrivateMprPack,privateMprPage
} from './private-totalseg-mpr.mjs';

const bytes=Buffer.from('a'.repeat(64),'utf8').toString('hex').slice(0,64);
function volume(kind,{dims=[8,7,6],shift=0,invalid=0}={}){
  const n=dims.reduce((a,b)=>a*b,1);
  return {kind,dims,n,scale:1,intercept:0,
    affine:[1,0,0,shift,0,1,0,0,0,0,1,0],
    read:i=>kind==='ct'?80:invalid&&i===1?2:i%11===0?1:0};
}
const liver={id:'liver',label:'Hati',rgb:[240,166,61]};
const lung={id:'lung_upper_lobe_left',label:'Paru kiri',rgb:[92,212,177]};

test('MPR-001: one verified sampled CT and two exact-grid masks encode into a reusable private bundle',()=>{
  const ct=volume('ct');
  const pack=createPrivateMprPack(ct,{maxDim:32});
  assert.deepEqual(pack.dims,[8,7,6]);
  assert.equal(pack.hu.length,336);
  assert.equal(addPrivateMprOrgan(pack,volume('mask'),liver)>0,true);
  assert.equal(addPrivateMprOrgan(pack,volume('mask'),lung)>0,true);
  const payload=encodePrivateMprPack(pack,{
    sourceSubject:'s1366',archiveSha256:bytes,sourceCtSha256:bytes
  });
  assert.equal(payload.releaseEligible,false);
  assert.equal(payload.clinicalApproved,false);
  assert.equal(payload.organs.length,2);
  const ctBytes=zlib.gunzipSync(Buffer.from(payload.hu.base64,'base64'));
  const maskBytes=zlib.gunzipSync(Buffer.from(payload.masks.base64,'base64'));
  assert.equal(ctBytes.length,336*2);
  assert.equal(maskBytes.length,336*2);
  assert.equal(ctBytes.readInt16LE(0),80);
  assert.equal(maskBytes.readUInt16LE(0),3);
  assert.equal(maskBytes.readUInt16LE(2),0);
  assert.match(privateMprPage('chest-ct'),/TCIA Chest CT lama TETAP DIKARANTINA/);
  assert.match(privateMprPage('abdomen-ct'),/Axial/);
  assert.match(privateMprPage('chest-ct'),/Coronal/);
  assert.match(privateMprPage('chest-ct'),/Sagittal/);
  assert.doesNotMatch(privateMprPage('abdomen-ct'),/@@STUDIO@@/);
});

test('MPR-002: false labels, shifted affine and mask with nonbinary voxels fail closed',()=>{
  const pack=createPrivateMprPack(volume('ct'),{maxDim:32});
  assert.throws(()=>addPrivateMprOrgan(pack,volume('mask',{shift:1}),liver),
    /CT_MPR_MASK_GRID_OR_LABEL_INVALID/);
  assert.throws(()=>addPrivateMprOrgan(pack,volume('mask',{invalid:1}),liver),
    /CT_MPR_MASK_NOT_BINARY/);
  assert.throws(()=>addPrivateMprOrgan(pack,volume('mask'),{...liver,id:'../../escape'}),
    /CT_MPR_MASK_GRID_OR_LABEL_INVALID/);
  addPrivateMprOrgan(pack,volume('mask'),liver);
  assert.throws(()=>addPrivateMprOrgan(pack,volume('mask'),liver),
    /CT_MPR_MASK_GRID_OR_LABEL_INVALID/);
});
test('MPR-003: cannot create approved or unpinned volume, or unbounded geometry',()=>{
  assert.throws(()=>createPrivateMprPack(volume('ct'),{maxDim:500}),/CT_MPR_INVALID/);
  const pack=createPrivateMprPack(volume('ct'),{maxDim:32});
  assert.throws(()=>encodePrivateMprPack(pack,{
    sourceSubject:'s1366',archiveSha256:bytes,sourceCtSha256:bytes
  }),/CT_MPR_UNVERIFIED_OR_EMPTY_DATA/);
  addPrivateMprOrgan(pack,volume('mask'),liver);
  assert.throws(()=>encodePrivateMprPack(pack,{
    sourceSubject:'../unsafe',archiveSha256:bytes,sourceCtSha256:bytes
  }),/CT_MPR_UNVERIFIED_OR_EMPTY_DATA/);
  assert.throws(()=>privateMprPage('brain-ct'),/CT_MPR_INVALID_STUDIO/);
});
test('MPR-004: browser script parses and has no network endpoint or implicit release',()=>{
  const text=fs.readFileSync(fileURLToPath(new URL('./private-totalseg-mpr-browser.js',import.meta.url)),'utf8');
  assert.doesNotThrow(()=>new vm.Script(text));
  assert.doesNotMatch(text,/\bfetch\s*\(|XMLHttpRequest|sendBeacon|https?:\/\//);
  assert.match(text,/DecompressionStream/);
  assert.match(text,/requestAnimationFrame/);
  assert.match(text,/slice-x/);
  assert.match(text,/slide|slice-y/);
  assert.match(text,/slice-z/);
});
