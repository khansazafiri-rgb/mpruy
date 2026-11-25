import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import {createHash} from 'node:crypto';
import {encodeNativeGlb} from './independent-bp3d-export.mjs';
import {recoveryKey,loadRecoveryCache,findRecoveryCache} from './independent-atlas-recovery-cache.mjs';
const sha=x=>createHash('sha256').update(x).digest('hex');
test('reuse exact cache only; corrupt bytes and changed plan fail closed',()=>{
 const root=fs.realpathSync(fs.mkdtempSync(path.join(os.tmpdir(),'atlas-cache-test-')));
 try{
  const folder='atlas-priority-recovery-fixture',dir=path.join(root,folder);fs.mkdirSync(dir);
  const plan=[{group:'respiratory',target:'fixture',name:'fixture',fmaId:'FMA1',bpId:'BP1',tree:'isa',elementIds:['FJ1'],status:'EXPORT_CANDIDATE'}];
  const sources=[{tree:'isa',hashes:{archive:'a'.repeat(64),names:'b'.repeat(64),elements:'c'.repeat(64)},archiveIndex:new Map([['FJ1','FJ1.obj']])}];
  const inv='d'.repeat(64),key=recoveryKey(plan,sources,inv,true),id='bp-'+sha('isa:FMA1:BP1:priority').slice(0,24);
  const encoded=encodeNativeGlb([{id:'FJ1',positions:new Float32Array([0,0,0,1,0,0,0,1,0]),normals:new Float32Array([0,0,1,0,0,1,0,0,1]),omitted:0}],{});
  const item={id,name:'fixture',group:'respiratory',fmaId:'FMA1',bpId:'BP1',sourceTree:'isa',priorityOnly:true,path:'priority-recovery/'+id+'.glb',regions:['whole'],clinicalValidation:false,approvedForDistribution:false,source:'BodyParts3D 4.0',classificationProvisional:true};
  const result={...plan[0],status:'EXPORTED_ISOLATED_CONCEPT',id,sha256:encoded.sha256,bytes:encoded.bytes.length,sourceHashes:sources[0].hashes,sourceElements:[{id:'FJ1',zipEntry:'FJ1.obj',sha256:'e'.repeat(64),triangles:1}],license:'CC-BY-4.0',licenseURL:'https://creativecommons.org/licenses/by/4.0/',sourceArchive:'https://dbarchive.biosciencedbc.jp/data/bodyparts3d/LATEST/isa_BP3D_4.0_obj_99.zip',attribution:'BodyParts3D, © The Database Center for Life Science',historicalNotice:'CC BY-SA 2.1 Japan'};
  const report={schema:1,broad:true,cacheKey:key,inventorySHA256:inv,publicRelease:'NO_GO',clinicalValidation:false,registrationValidated:false,productionChanged:false,bodyInventoryUnchanged:true,items:[item],results:[result],totalBytes:encoded.bytes.length};
  const receipt=path.join(dir,'priority-recovery.json'),model=path.join(dir,id+'.glb');
  fs.writeFileSync(receipt,JSON.stringify(report));fs.writeFileSync(model,encoded.bytes);
  const load=()=>loadRecoveryCache(root,folder,key,plan,sources,inv,true,1024*1024);
  assert.equal(load().reused,true);assert.equal(load().models.size,1);
  assert.notEqual(recoveryKey(plan,sources,inv,false),key);
  assert.notEqual(recoveryKey([{...plan[0],target:'changed'}],sources,inv,true),key);
  assert.equal(findRecoveryCache(root,'wrong',plan,sources,inv,true,1024*1024),null);
  fs.writeFileSync(receipt,JSON.stringify({...report,publicRelease:'GO'}));assert.throws(load);
  fs.writeFileSync(receipt,JSON.stringify(report));
  const damaged=Buffer.from(encoded.bytes);damaged[damaged.length-1]^=1;fs.writeFileSync(model,damaged);
  assert.throws(load);assert.equal(findRecoveryCache(root,key,plan,sources,inv,true,1024*1024),null);
 }finally{fs.rmSync(root,{recursive:true,force:true});}
});
