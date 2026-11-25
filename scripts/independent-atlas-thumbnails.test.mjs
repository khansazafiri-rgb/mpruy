import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import {encodeNativeGlb} from './independent-bp3d-export.mjs';
import {renderNativeThumbnail,readThumbnailParts,createThumbnailService} from './independent-atlas-thumbnails.mjs';
const part=(id,x)=>({id,positions:new Float32Array([x,0,0,x+1,0,0,x,1,0]),normals:new Float32Array([0,0,1,0,0,1,0,0,1]),omitted:0});
test('native triangle raster produces deterministic PNG and rejects malformed geometry',()=>{
 const p=part('FJ1',0).positions,a=renderNativeThumbnail([p],'skeletal');
 assert.equal(a.subarray(0,8).toString('hex'),'89504e470d0a1a0a');
 assert.equal(a.readUInt32BE(16),128);assert.equal(a.readUInt32BE(20),128);
 assert.deepEqual(a,renderNativeThumbnail([p],'skeletal'));
 assert.notDeepEqual(a,renderNativeThumbnail([p],'nervous'));
 assert.throws(()=>renderNativeThumbnail([],'skeletal'));
});
test('only requested checksum-verified native elements contribute to preview',async()=>{
 const dir=fs.realpathSync(fs.mkdtempSync(path.join(os.tmpdir(),'atlas-thumb-test-')));
 try{
  const a=part('FJ1',0),b=part('FJ2',3),encoded=encodeNativeGlb([a,b],{}),file=path.join(dir,'fixture.glb');
  fs.writeFileSync(file,encoded.bytes);
  const record={file,sha256:encoded.sha256,elements:['FJ2']};
  assert.deepEqual(readThumbnailParts([record]),[b.positions]);
  assert.throws(()=>readThumbnailParts([{...record,sha256:'0'.repeat(64)}]));
  assert.throws(()=>readThumbnailParts([{...record,elements:['FJ3']}]));
  const service=createThumbnailService(new Map([['test',{group:'nervous',records:[record]}]]));
  assert.equal(service.has('other'),false);
  await assert.rejects(service.get('other'));
  const [one,two]=await Promise.all([service.get('test'),service.get('test')]);
  assert.deepEqual(one,renderNativeThumbnail([b.positions],'nervous'));assert.deepEqual(one,two);
 }finally{fs.rmSync(dir,{recursive:true,force:true});}
});
