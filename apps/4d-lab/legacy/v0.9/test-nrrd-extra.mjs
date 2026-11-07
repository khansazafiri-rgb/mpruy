import assert from 'node:assert/strict';
import { readNrrdFile } from './nrrd.js';
function make(header,data){return new File([new TextEncoder().encode(header),data],'test.nrrd')}
const base='NRRD0005\ntype: short\ndimension: 3\nsizes: 2 2 2\nencoding: raw\nendian: little\nspace: left-posterior-superior\nspace directions: (2,0,0) (0,3,0) (0,0,4)\n\n';
const payload=new Uint8Array(16),dv=new DataView(payload.buffer);for(let i=0;i<8;i++)dv.setInt16(i*2,i*8,true);
let v=await readNrrdFile(make(base,payload));assert.deepEqual(v.spacing,[2,3,4]);assert.equal(v.voxel(.5,.5,.5),28);assert.equal(v.voxel(NaN,0,0),-1024);
await assert.rejects(readNrrdFile(make(base,payload.subarray(0,8))),/terpotong/);
await assert.rejects(readNrrdFile(make(base.replace('encoding: raw','encoding: bzip2'),payload)),/belum didukung/);
await assert.rejects(readNrrdFile(make(base.replace('(0,3,0)','(1,3,0)'),payload)),/tidak ortogonal/);
const big=base.replace('endian: little','endian: big');for(let i=0;i<8;i++)dv.setInt16(i*2,i*8,false);v=await readNrrdFile(make(big,payload));assert.equal(v.voxel(.5,.5,.5),28);
console.log('PASS: raw, patient-axis spacing, trilinear, big endian, invalid coordinate, truncated, unsupported encoding, sheared grid.');
