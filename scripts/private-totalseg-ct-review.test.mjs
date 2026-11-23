import test from 'node:test';
import assert from 'node:assert/strict';
import zlib from 'node:zlib';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { crc32 } from '../apps/studios/tools/zip-range.mjs';
import {
  parsePrivateTotalSegNifti, verifyNiftiPair, renderPrivateTotalSegPlane
} from './private-totalseg-ct-review.mjs';
import {
  listLocalZipEntries,readVerifiedLocalZipMember
} from './private-totalseg-archive-audit.mjs';

const DIMS=[8,7,6];
const N=DIMS.reduce((a,b)=>a*b,1);
function nifti(kind, data, {translation=0,slope=0,intercept=0,dtype=null}={}){
  const type=dtype??(kind==='ct'?4:2);
  const bytes=type===4?2:type===16?4:1;
  const b=Buffer.alloc(352+N*bytes);
  b.writeInt32LE(348,0);b.writeInt16LE(3,40);
  DIMS.forEach((v,i)=>b.writeInt16LE(v,42+2*i));
  b.writeInt16LE(type,70);b.writeInt16LE(bytes*8,72);
  b.writeFloatLE(352,108);b.writeFloatLE(slope,112);b.writeFloatLE(intercept,116);
  b.writeInt16LE(1,254);
  b.writeFloatLE(1,280);b.writeFloatLE(1,300);b.writeFloatLE(1,320);
  b.writeFloatLE(translation,292);
  b.write('n+1\0',344,'latin1');
  for(let i=0;i<N;i++){
    if(type===4)b.writeInt16LE(data[i],352+2*i);
    else if(type===16)b.writeFloatLE(data[i],352+4*i);
    else b[352+i]=data[i];
  }
  return zlib.gzipSync(b);
}
const masked=()=>{
  const values=Array(N).fill(0);
  for(let z=2;z<=4;z++)for(let y=2;y<=4;y++)for(let x=2;x<=5;x++)
    values[x+DIMS[0]*(y+DIMS[1]*z)]=1;
  return values;
};
const organ={id:'liver',label:'Hati',rgb:[240,160,80],level:40,width:400};
test('TOTALSEG-VIEW-001: aligned CT and source mask yield two HU-windowed private PNG overlays',()=>{
  const ct=parsePrivateTotalSegNifti(nifti('ct',Array(N).fill(80)),'ct');
  const mask=parsePrivateTotalSegNifti(nifti('mask',masked()),'mask');
  assert.equal(verifyNiftiPair(ct,mask),true);
  assert.deepEqual(ct.dims,DIMS);
  const axial=renderPrivateTotalSegPlane(ct,mask,organ,2);
  const coronal=renderPrivateTotalSegPlane(ct,mask,organ,1);
  assert.equal(axial.labeledPixels,12);
  assert.equal(coronal.labeledPixels,12);
  assert.equal(axial.axis,'axial-index');
  assert.equal(coronal.axis,'coronal-index');
  assert.equal(axial.overlay.readUInt32BE(0),0x89504e47);
  assert.notDeepEqual(axial.original,axial.overlay);
});
test('TOTALSEG-VIEW-002: affine mismatch and invalid mask intensity cannot produce overlay',()=>{
  const ct=parsePrivateTotalSegNifti(nifti('ct',Array(N).fill(80)),'ct');
  const moved=parsePrivateTotalSegNifti(nifti('mask',masked(),{translation:1}),'mask');
  assert.throws(()=>verifyNiftiPair(ct,moved),/REGISTRATION_MISMATCH/);
  assert.throws(()=>verifyNiftiPair({...ct,spatialUnits:'mm'},{...moved,affine:ct.affine,spatialUnits:'m'}),/REGISTRATION_MISMATCH/);
  assert.throws(()=>verifyNiftiPair(ct,{...moved,affine:ct.affine,spatialUnits:'mm'}),/REGISTRATION_MISMATCH/);
  const invalid=masked();invalid[3]=2;
  const mask=parsePrivateTotalSegNifti(nifti('mask',invalid),'mask');
  assert.throws(()=>renderPrivateTotalSegPlane(ct,mask,organ,2),/MASK_MUST_BE_BINARY/);
});
test('TOTALSEG-VIEW-003: corrupt datatype, truncated volume and missing sform/qform fail closed',()=>{
  const gz=nifti('ct',Array(N).fill(80));
  const changed=zlib.gunzipSync(gz);
  changed.writeInt16LE(64,70);
  assert.throws(()=>parsePrivateTotalSegNifti(zlib.gzipSync(changed),'ct'),/UNSUPPORTED_DATATYPE/);
  const trunc=zlib.gunzipSync(gz).subarray(0,-2);
  assert.throws(()=>parsePrivateTotalSegNifti(zlib.gzipSync(trunc),'ct'),/SIZE_OR_OFFSET_MISMATCH/);
  const nibabel=zlib.gunzipSync(gz);
  nibabel.writeFloatLE(NaN,112);nibabel.writeFloatLE(NaN,116);
  const handled=parsePrivateTotalSegNifti(zlib.gzipSync(nibabel),'ct');
  assert.equal(handled.scale,1);
  assert.equal(handled.intercept,0);
  const unlocated=zlib.gunzipSync(gz);
  unlocated.writeInt16LE(0,254);
  assert.throws(()=>parsePrivateTotalSegNifti(zlib.gzipSync(unlocated),'ct'),/AFFINE_MISSING/);
});
function zipMember(name,data){
  const nm=Buffer.from(name),buf=Buffer.from(data),packed=zlib.deflateRawSync(buf);
  const checksum=crc32(buf);
  const loc=Buffer.alloc(30);
  loc.writeUInt32LE(0x04034b50);loc.writeUInt16LE(20,4);loc.writeUInt16LE(8,8);
  loc.writeUInt32LE(checksum,14);loc.writeUInt32LE(packed.length,18);loc.writeUInt32LE(buf.length,22);
  loc.writeUInt16LE(nm.length,26);
  const central=Buffer.alloc(46);
  central.writeUInt32LE(0x02014b50);central.writeUInt16LE(20,4);central.writeUInt16LE(20,6);
  central.writeUInt16LE(8,10);central.writeUInt32LE(checksum,16);
  central.writeUInt32LE(packed.length,20);central.writeUInt32LE(buf.length,24);
  central.writeUInt16LE(nm.length,28);
  const offset=loc.length+nm.length+packed.length;
  const end=Buffer.alloc(22);
  end.writeUInt32LE(0x06054b50);end.writeUInt16LE(1,8);end.writeUInt16LE(1,10);
  end.writeUInt32LE(central.length+nm.length,12);end.writeUInt32LE(offset,16);
  return Buffer.concat([loc,nm,packed,central,nm,end]);
}
test('TOTALSEG-VIEW-004: local ZIP member CRC verified, invalid CRC not accepted',t=>{
  const dir=fs.mkdtempSync(path.join(os.tmpdir(),'medcoel-ct-zip-'));
  t.after(()=>fs.rmSync(dir,{recursive:true,force:true}));
  const file=path.join(dir,'sample.zip');
  fs.writeFileSync(file,zipMember('s0001/ct.nii.gz',Buffer.from('tiny CT fixture')));
  const entries=listLocalZipEntries(file);
  assert.equal(entries.length,1);
  assert.deepEqual(readVerifiedLocalZipMember(file,entries[0]),Buffer.from('tiny CT fixture'));
  const buffer=fs.readFileSync(file);
  const cd=buffer.indexOf(Buffer.from([0x50,0x4b,0x01,0x02]));
  buffer.writeUInt32LE(0x12345678,cd+16);
  fs.writeFileSync(file,buffer);
  const broken=listLocalZipEntries(file);
  assert.throws(()=>readVerifiedLocalZipMember(file,broken[0]),/CRC_OR_SIZE_MISMATCH/);
});
