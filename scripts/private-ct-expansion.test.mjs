import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import zlib from 'node:zlib';
import {fileURLToPath} from 'node:url';
import {createPrivateMprPack,addPrivateMprOrgan,encodePrivateMprPack,privateMprPage} from './private-totalseg-mpr.mjs';
import {makePrivatePairedCtPack,PRIVATE_CT_SOURCE_PROFILES} from './private-paired-ct-review.mjs';
import {PRIVATE_MPR_OPTIONAL_IDS,PRIVATE_MPR_ORGAN_IDS} from './private-totalseg-ct-review.mjs';
import {runPrivateMprDom} from './private-mpr-test-harness.mjs';

const HASH='a'.repeat(64),dims=[8,7,6],n=dims.reduce((x,y)=>x*y,1);
function specimen(kind,read=()=>0,shift=0){
 const affine=[1,0,0,shift,0,1,0,0,0,0,1,0];
 return {kind,dims:[...dims],n,affine,spatialUnits:'mm',scale:1,intercept:0,read};
}
test('CT-EXP-001: 11 mandatory labels and curated optional labels are disjoint, bounded, and never generated from absence',()=>{
 assert.equal(PRIVATE_MPR_ORGAN_IDS.length,11);
 assert.equal(PRIVATE_MPR_OPTIONAL_IDS.length,17);
 assert.equal(new Set([...PRIVATE_MPR_ORGAN_IDS,...PRIVATE_MPR_OPTIONAL_IDS]).size,28);
 const generator=fs.readFileSync(new URL('./private-totalseg-ct-review.mjs',import.meta.url),'utf8');
 assert.match(generator,/if\(!byName\.has\(sourceName\)\)/);
 assert.match(generator,/readVerifiedLocalZipMember/);
 assert.match(generator,/verifyNiftiPair\(ct,mask\)/);
 assert.match(generator,/addPrivateMprOrgan\(mpr,mask,organ\)/);
});
test('CT-EXP-002: legacy 11 masks remain v1; authentic mask 16 switches to uint32 v2, no lost labels',async()=>{
 const ct=specimen('ct',i=>80+i%10);
 const pack=createPrivateMprPack(ct,{maxDim:32});
 for(let k=0;k<11;k++)addPrivateMprOrgan(pack,specimen('mask',i=>i===k?1:0),{
  id:'mask'+k,label:'Engineering source label '+k,rgb:[25+k,35+k,45+k],studios:['chest-ct']});
 const old=encodePrivateMprPack(pack,{sourceSubject:'s0001',archiveSha256:HASH,sourceCtSha256:HASH});
 assert.equal(old.schema,'medcoel.private-mpr-ct.v1');
 assert.equal(old.masks.uncompressedBytes,n*2);
 for(let k=11;k<18;k++)addPrivateMprOrgan(pack,specimen('mask',i=>i===k?1:0),{
  id:'mask'+k,label:'Engineering source label '+k,rgb:[25+k,35+k,45+k],studios:['chest-ct']});
 const data=encodePrivateMprPack(pack,{sourceSubject:'s0001',archiveSha256:HASH,sourceCtSha256:HASH});
 assert.equal(data.schema,'medcoel.private-mpr-ct.v2');
 assert.equal(data.masks.uncompressedBytes,n*4);
 assert.equal(zlib.gunzipSync(Buffer.from(data.masks.base64,'base64')).readUInt32LE(17*4),2**17);
 const ui=await runPrivateMprDom(data,{studio:'chest-ct'});
 assert.equal(ui.document.body.dataset.mprReady,'true');
 assert.equal(ui.elements.get('organs').children.length,18);
 assert.equal(ui.elements.get('status').textContent.includes('18 mask'),true);
});
test('CT-EXP-003: Brain CT uses actual whole-brain label 1 and documented -2000 background, never inferred hemorrhage labels',async()=>{
 const ct=specimen('ct',i=>45+i%14);
 const segmentation=specimen('mask',i=>i%5===0?-2000:i%3===0?1:0);
 const data=makePrivatePairedCtPack({studio:'brain-ct',ct,segmentation,subjectAlias:'s0001',
  sourceId:'mistie-iii-brain-segmentation-v1',sourceCtSha256:HASH,sourceMaskSha256:HASH});
 assert.deepEqual(data.sourceLabelsPresent.map(x=>x.id),['brain']);
 assert.equal(data.payload.releaseEligible,false);
 assert.equal(data.payload.recommendedSlices['brain-ct'].z>=0,true);
 assert.equal(data.payload.recommendedSlices['chest-ct'],undefined);
 assert.match(data.sourceAccess,/Restricted/);
 const ui=await runPrivateMprDom(data.payload,{studio:'brain-ct'});
 assert.equal(ui.document.body.dataset.mprReady,'true');
 assert.equal(ui.elements.get('window').value,'brain');
 assert.equal(ui.elements.get('organs').children.length,1);
 assert.match(privateMprPage('brain-ct'),/Brain CT/);
 assert.match(privateMprPage('brain-ct'),/Restricted Health Data License/);
});
test('CT-EXP-004: Cardiac CT source classes are explicit whole-heart structures, not coronary anatomy',async()=>{
 const ct=specimen('ct',i=>280+i%20);
 const codes=[0,205,420,500,550,600,820,850];
 const segmentation=specimen('mask',i=>codes[i%codes.length]);
 const r=makePrivatePairedCtPack({studio:'cardiac-ct',ct,segmentation,subjectAlias:'s0002',
  sourceId:'mm-whs-2017-cardiac-cta',sourceCtSha256:HASH,sourceMaskSha256:HASH});
 assert.equal(r.sourceLabelsPresent.length,7);
 assert.equal(r.payload.organs.length,7);
 assert.equal(r.payload.rightsApproved,false);
 assert.match(r.sourceScope,/NOT coronary/);
 const ui=await runPrivateMprDom(r.payload,{studio:'cardiac-ct'});
 assert.equal(ui.document.body.dataset.mprReady,'true');
 assert.equal(ui.elements.get('window').value,'cardiac');
 assert.equal(ui.elements.get('organs').children.length,7);
 assert.match(privateMprPage('cardiac-ct'),/registration/i);
});
test('CT-EXP-005: wrong source, unexpected semantic labels and shifted affine fail closed',()=>{
 const ct=specimen('ct',()=>80),normal=specimen('mask',i=>i%2);
 const base={studio:'brain-ct',ct,segmentation:normal,subjectAlias:'s0001',
  sourceId:'mistie-iii-brain-segmentation-v1',sourceCtSha256:HASH,sourceMaskSha256:HASH};
 assert.throws(()=>makePrivatePairedCtPack({...base,sourceId:'mm-whs-2017-cardiac-cta'}),/UNVERIFIED/);
 assert.throws(()=>makePrivatePairedCtPack({...base,segmentation:specimen('mask',()=>2)}),/UNEXPECTED_SOURCE_LABEL/);
 assert.throws(()=>makePrivatePairedCtPack({...base,segmentation:specimen('mask',()=>1,10)}),/REGISTRATION_MISMATCH/);
 assert.throws(()=>makePrivatePairedCtPack({...base,sourceCtSha256:'0'.repeat(64)}),/UNVERIFIED/);
 assert.throws(()=>makePrivatePairedCtPack({...base,segmentation:specimen('mask',()=>0)}),/SOURCE_LABELS_EMPTY/);
});
test('CT-EXP-006: source candidate claims are bounded and privacy flags cannot become release clearance',()=>{
 const profile=PRIVATE_CT_SOURCE_PROFILES['brain-ct'];
 assert.match(profile.access,/commercial\/public redistribution NOT approved/);
 const cardiac=PRIVATE_CT_SOURCE_PROFILES['cardiac-ct'];
 assert.match(cardiac.access,/commercial\/public redistribution rights NOT established/);
 for(const file of ['./private-paired-ct-review.mjs','./private-totalseg-mpr.mjs']){
  const text=fs.readFileSync(new URL(file,import.meta.url),'utf8');
  assert.doesNotMatch(text,/https?:\/\/[^'"]+\.(?:nii|nrrd|dcm)(?:\.gz)?/);
 }
});
