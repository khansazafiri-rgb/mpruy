import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import crypto from 'node:crypto';
import {fileURLToPath} from 'node:url';
import {prepare} from './prepare-bp3d-skeletal-visceral-replacement.mjs';

const ROOT=fileURLToPath(new URL('../',import.meta.url));
const hash=b=>crypto.createHash('sha256').update(b).digest('hex');
const fakeGlb=()=>{const b=Buffer.alloc(20);b.write('glTF');b.writeUInt32LE(2,4);b.writeUInt32LE(20,8);return b;};
function fixture(){
 const tmpBase=path.join(ROOT,'local-data');
 fs.mkdirSync(tmpBase,{recursive:true});
 const tmp=fs.mkdtempSync(path.join(tmpBase,'bp3d-source-guard-test-'));
 const input=path.join(tmp,'input'),output=path.join(tmp,'output');
 fs.mkdirSync(input);
 const archive=hash('official-source-archive-test-only'),bytes=fakeGlb();
 const ids=[['skeletal','femur-aaaaaaaaaaaa','Femur.l','FMA123','BP321'],
  ['visceral','liver-bbbbbbbbbbbb','Liver','FMA124','BP322']];
 for(const [system,id,name,fmaId,bpId] of ids){
  const dest=path.join(input,'structures',id);fs.mkdirSync(dest,{recursive:true});
  fs.writeFileSync(path.join(dest,'model.glb'),bytes);
  fs.writeFileSync(path.join(dest,'lineage.json'),JSON.stringify({
   generatedGLBSHA256:hash(bytes),archiveSHA256:archive,officialFMAId:fmaId,
   officialRepresentationId:bpId,atlasCandidateName:name,
   registrationValidated:false,geometryAnatomyValidated:false,
   approvedForDistribution:false
  }));
 }
 for(const file of ['coordinate-frame.js','review-materials.js']){
  fs.writeFileSync(path.join(input,file),'// test fixture only\n');
 }
 const vendor=path.join(input,'vendor/three/build');fs.mkdirSync(vendor,{recursive:true});
 fs.writeFileSync(path.join(vendor,'three.module.js'),'// stub only, no real rendering\n');
 const converted=ids.map(([system,id,name,fmaId,bpId])=>({
  system,id,name,fmaId,bpId,glbSha256:hash(bytes),
  modelPath:'./structures/'+id+'/model.glb',state:'converted-unverified'
 }));
 fs.writeFileSync(path.join(input,'inventory.json'),JSON.stringify({
  schemaVersion:1,kind:'official-bp3d-bulk-source-review',legalStatus:'NOT-CLEARED',
  source:{name:'DBCLS official BodyParts3D'},sourceHashes:{archiveSha256:archive},converted
 }));
 return {tmp,input,output,converted};
}
test('BP3D-RECOVERY-001: real lineage/hash guard packages only candidate skeletal and visceral, no release',()=>{
 const f=fixture();
 try{
  const result=prepare({input:f.input,output:f.output});
  assert.deepEqual(result.coverage,{skeletal:1,visceral:1});
  assert.equal(result.releaseEligible,false);
  const manifest=JSON.parse(fs.readFileSync(path.join(f.output,'inventory.json')));
  assert.equal(manifest.rightsApproved,false);
  assert.equal(manifest.releaseEligible,false);
  assert.deepEqual(manifest.converted.map(x=>x.system).sort(),['skeletal','visceral']);
  assert.equal(fs.existsSync(path.join(f.output,'source-proof.json')),true);
  assert.match(fs.readFileSync(path.join(f.output,'body.html'),'utf8'),/BodyParts3D/);
 }finally{fs.rmSync(f.tmp,{recursive:true,force:true});}
});
test('BP3D-RECOVERY-002: corrupt model or mismatching source lineage fail closed',()=>{
 const f=fixture();
 try{
  const model=path.join(f.input,'structures',f.converted[0].id,'model.glb');
  fs.appendFileSync(model,Buffer.from('BAD'));
  assert.throws(()=>prepare({input:f.input,output:f.output}),/BP3D_MODEL_OR_LINEAGE_MISMATCH/);
  assert.equal(fs.existsSync(f.output),false);
 }finally{fs.rmSync(f.tmp,{recursive:true,force:true});}
});
test('BP3D-RECOVERY-003: source inventory cannot redirect into blocked or unrelated model paths',()=>{
 const f=fixture();
 try{
  const file=path.join(f.input,'inventory.json'),inventory=JSON.parse(fs.readFileSync(file));
  inventory.converted[0].modelPath='./../../apps/anatomy/public/models/skeletal.glb';
  fs.writeFileSync(file,JSON.stringify(inventory));
  assert.throws(()=>prepare({input:f.input,output:f.output}),/BP3D_UNSAFE_OR_INCORRECT_MODEL_ID/);
  assert.equal(fs.existsSync(f.output),false);
 }finally{fs.rmSync(f.tmp,{recursive:true,force:true});}
});
test('BP3D-RECOVERY-004: symlink source cannot escape private conversion root',()=>{
 const f=fixture();
 try{
  const model=path.join(f.input,'structures',f.converted[0].id,'model.glb');
  fs.rmSync(model);
  fs.symlinkSync(path.join(f.input,'structures',f.converted[1].id,'model.glb'),model);
  assert.throws(()=>prepare({input:f.input,output:f.output}),/SYMLINK_DENIED/);
  assert.equal(fs.existsSync(f.output),false);
 }finally{fs.rmSync(f.tmp,{recursive:true,force:true});}
});
