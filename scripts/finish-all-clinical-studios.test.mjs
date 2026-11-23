import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import { fileURLToPath } from 'node:url';
import { allStudioMatrix,allStudioHtml,nextQcMarkdown,verifyPrivateMprFiles } from './finish-all-clinical-studios.mjs';
import { PRIVATE_MPR_ORGAN_IDS } from './private-totalseg-ct-review.mjs';
import crypto from 'node:crypto';
import {privateMprFixture} from './private-mpr-test-harness.mjs';

const catalog=JSON.parse(fs.readFileSync(
  fileURLToPath(new URL('../shared/studios/catalog.v1.json',import.meta.url)),'utf8'));
const ids=catalog.studios.filter(x=>!x.internal).map(x=>x.id);
const preview=['chest-xray','pelvis-ultrasound','spine-mri','ecg',
  'msk-xray','abdomen-ct','chest-ct'];
const results=preview.map(studio=>({
  studio,status:studio==='msk-xray'||studio.endsWith('-ct')
    ? 'PRIVATE_CANDIDATE_REVIEW_READY':'PRIVATE_PREVIEW_READY',
  kind:studio.endsWith('-ct')?'totalsegmentator-offline-3-plane-mpr':'source-data'
}));
const sources=[
  {id:'totalsegmentator-small-v201',studioIds:['abdomen-ct','chest-ct','spine-anatomy'],
   status:'PRIVATE_ARCHIVES_RECORDED',archivedFileCountFromLastReport:1},
  {id:'fracatlas-v7',studioIds:['msk-xray'],status:'PRIVATE_ARCHIVES_RECORDED',archivedFileCountFromLastReport:1},
  {id:'hra-3d-ref-organ',studioIds:['brain-anatomy'],status:'NO_ARCHIVES_READY',archivedFileCountFromLastReport:0}
];
const v=Object.fromEntries(preview.map(x=>[x,true]));

test('ALL-001: all 24 frozen studios reported but only 7 actually previewed',()=>{
  const r=allStudioMatrix(catalog,{sources},results,v);
  assert.equal(r.totalStudios,24);
  assert.equal(r.privatePreviewCount,7);
  assert.equal(r.notReadyCount,17);
  assert.equal(r.releaseEligible,false);
  assert.equal(r.liveRightsAuditPerformed,false);
  assert.ok(ids.every(id=>r.studios.some(s=>s.id===id)));
  assert.ok(r.studios.every(s=>Object.values(s.approval).every(value=>value===false)));
  assert.equal(r.studios.find(s=>s.id==='chest-ct').previewAvailable,true);
  assert.match(r.studios.find(s=>s.id==='chest-ct').primaryBlocker,/TCIA.*quarantined/);
  assert.match(r.studios.find(s=>s.id==='brain-mri').primaryBlocker,/LPBA40/);
  assert.match(r.studios.find(s=>s.id==='pelvis-ultrasound').primaryBlocker,/HC18.*NOT gynecologic/);
});
test('ALL-002: status claimed without actually present safe local files is NOT counted',()=>{
  const r=allStudioMatrix(catalog,{sources},results,{'chest-xray':true});
  assert.equal(r.privatePreviewCount,1);
  assert.equal(r.notReadyCount,23);
  assert.equal(r.studios.find(s=>s.id==='chest-ct').status,'BROKEN_PRIVATE_PREVIEW');
  assert.equal(r.studios.find(s=>s.id==='chest-ct').previewAvailable,false);
});
test('ALL-003: failed local decoder stays explicitly failed, not inferred from source metadata',()=>{
  const r=allStudioMatrix(catalog,{sources},
    [...results.filter(x=>x.studio!=='abdomen-ct'),
      {studio:'abdomen-ct',status:'REVIEW_FAILED_CLOSED',error:'AFFINE_MISMATCH'}],v);
  assert.equal(r.studios.find(s=>s.id==='abdomen-ct').status,'RENDER_FAILED_CLOSED');
  assert.equal(r.privatePreviewCount,6);
});
test('ALL-004: HTML escapes dynamic source text and QC retains non-release red flags',()=>{
  const r=allStudioMatrix(catalog,{sources},results,v);
  r.studios[0].title='<img src=x onerror=alert(1)>';
  const html=allStudioHtml(r);
  assert.doesNotMatch(html,/<img src=x onerror/);
  assert.match(html,/&lt;img src=x onerror/);
  assert.match(html,/7\/24 technical private previews/);
  assert.match(html,/No public deployment/);
  const qc=nextQcMarkdown(r);
  assert.match(qc,/24 Clinical Studios/);
  assert.match(qc,/skeletal\/visceral GLB/);
  assert.match(qc,/PASS|FAIL/);
});
test('ALL-005: frozen 24-studio catalog cannot be silently shrunk or augmented',()=>{
  assert.throws(()=>allStudioMatrix({studios:catalog.studios.slice(0,10)},
    {sources},results,v),/ONE_SHOT_INCOMPLETE_24_STUDIO_INPUT/);
});

test('ALL-006: private preview availability verifies geometry, every source mask and exact renderer/bundle bytes',()=>{
  const data=privateMprFixture(),files={
    'geometry.js':fs.readFileSync(new URL('./private-totalseg-mpr-geometry.cjs',import.meta.url)),
    'viewer.js':fs.readFileSync(new URL('./private-totalseg-mpr-browser.js',import.meta.url)),
    'volume.js':Buffer.from('Engineering fixture; no patients or approval')};
  const manifest={...data,sourceSubject:data.subject,sourceArchiveSha256:data.archiveSha256,ctSourceSha256:data.ctMemberSha256,
    organs:PRIVATE_MPR_ORGAN_IDS.map(id=>({id})),
    maskReceipts:PRIVATE_MPR_ORGAN_IDS.map(sourceMask=>({sourceMask,sourceMember:data.subject+'/segmentations/'+sourceMask+'.nii.gz',sha256:'a'.repeat(64)})),
    files:Object.fromEntries(Object.entries(files).map(([name,b])=>[name,{bytes:b.length,sha256:crypto.createHash('sha256').update(b).digest('hex')}]))};
  const read=name=>files[name];
  assert.equal(verifyPrivateMprFiles(manifest,read),true);
  const changed=structuredClone(manifest);changed.releaseEligible=true;
  assert.equal(verifyPrivateMprFiles(changed,read),false);
  const missing=structuredClone(manifest);delete missing.files['geometry.js'];
  assert.equal(verifyPrivateMprFiles(missing,read),false);
  const labels=structuredClone(manifest);labels.maskReceipts.pop();
  assert.equal(verifyPrivateMprFiles(labels,read),false);
  assert.equal(verifyPrivateMprFiles(manifest,name=>name==='viewer.js'?Buffer.from('tampered'):read(name)),false);
});
