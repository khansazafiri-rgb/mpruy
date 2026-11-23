import test from 'node:test';
import assert from 'node:assert/strict';
import zlib from 'node:zlib';
import fs from 'node:fs';
import vm from 'node:vm';
import { fileURLToPath } from 'node:url';
import geometry from './private-totalseg-mpr-geometry.cjs';
import crypto from 'node:crypto';
import {privateMprFixture,runPrivateMprDom} from './private-mpr-test-harness.mjs';
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
  assert.ok(payload.recommendedSlices['abdomen-ct'].z>=0);
  assert.ok(payload.recommendedSlices['chest-ct'].z>=0);
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
  assert.throws(()=>addPrivateMprOrgan(pack,{...volume('mask'),spatialUnits:'mm'},liver),
    /CT_MPR_MASK_GRID_OR_LABEL_INVALID/);
  const millimetres=createPrivateMprPack({...volume('ct'),spatialUnits:'mm'},{maxDim:32});
  assert.throws(()=>addPrivateMprOrgan(millimetres,{...volume('mask'),spatialUnits:'m'},liver),
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

test('MPR-005: preserve the authentic vertebrae_L1 source ID without weakening path checks',()=>{
  const pack=createPrivateMprPack(volume('ct'),{maxDim:32});
  addPrivateMprOrgan(pack,volume('mask'),{...liver,id:'vertebrae_L1'});
  assert.equal(pack.organs[0].id,'vertebrae_L1');
  for(const id of ['../vertebrae_L1','vertebrae/L1','<script>','a'.repeat(71)] )
    assert.throws(()=>addPrivateMprOrgan(pack,volume('mask'),{...liver,id}),/INVALID/);
});

test('MPR-006: a bad source label outside the sampled grid must still reject the entire mask',()=>{
  const ct=volume('ct',{dims:[64,64,64]}),pack=createPrivateMprPack(ct,{maxDim:32});
  // The first sampled source centre is (1,1,1); source voxel 0 is not sampled.
  assert.equal(pack.axisMap[0][0],1);
  const mask={...ct,kind:'mask',read:i=>i===0?2:1};
  assert.throws(()=>addPrivateMprOrgan(pack,mask,liver),/MASK_NOT_BINARY/);
  assert.equal(pack.organs.length,0);
  assert.equal(pack.maskBits.some(Boolean),false);
});

test('MPR-007: RAS header, permutation, signs and oblique metadata are explicit; clinical approval stays false',()=>{
  const maps=[[0,1,2,3],[0,1,2,3],[0,1,2,3]],dims=[4,4,4];
  const normal=geometry.describe([2,0,0,0,0,3,0,0,0,0,4,0],dims,maps);
  assert.match(normal.planes.z.label,/Axial/);
  assert.deepEqual([normal.planes.z.left,normal.planes.z.right,normal.planes.z.top,normal.planes.z.bottom],['L','R','A','P']);
  assert.equal(normal.planes.y.aspectRatio,0.5);
  const permuted=geometry.describe([0,0,-2,10,1.5,0,0,20,0,3,0,30],dims,maps);
  assert.match(permuted.planes.x.label,/Coronal/);
  assert.match(permuted.planes.y.label,/Axial/);
  assert.match(permuted.planes.z.label,/Sagittal/);
  const c=Math.SQRT1_2,oblique=geometry.describe([c,-c,0,0,c,c,0,0,0,0,1,0],dims,maps);
  assert.equal(oblique.axisAligned,false);
  assert.doesNotMatch(oblique.planes.x.label,/Axial|Coronal|Sagittal/);
  assert.equal(oblique.planes.x.left,null);
  assert.equal(permuted.clinicalOrientationApproved,false);
});

test('MPR-008: nonfinite/degenerate geometry, wrong sample maps and nonfinite mask affine fail closed',()=>{
  const ct=volume('ct');
  for(const bad of [Array(12).fill(0),[NaN,...ct.affine.slice(1)],[]]){
    assert.throws(()=>createPrivateMprPack({...ct,affine:bad},{maxDim:32}),/SOURCE_GEOMETRY_INVALID/);
    const pack=createPrivateMprPack(ct,{maxDim:32});
    assert.throws(()=>addPrivateMprOrgan(pack,{...volume('mask'),affine:bad},liver),/INVALID/);
  }
  assert.throws(()=>geometry.describe(ct.affine,ct.dims,[[0,0,1,2],[0,1,2,3],[0,1,2,3]]),/SAMPLE_MAP_INVALID/);
});

test('MPR-DOM-009: independent known voxel controls all three planes, organ toggle, opacity and HU windows',async()=>{
  const ui=await runPrivateMprDom(privateMprFixture());
  assert.equal(ui.document.body.dataset.mprReady,'true');
  for(const axis of ['x','y','z'])await ui.set('slice-'+axis,2);
  await ui.set('opacity',0);
  // Source voxel (2,2,2) is -46 HU: soft window maps to 73/255.
  assert.deepEqual(ui.pixel('z',2,4),[73,73,73,255]);
  assert.deepEqual(ui.pixel('y',2,3),[73,73,73,255]);
  assert.deepEqual(ui.pixel('x',2,3),[73,73,73,255]);
  await ui.set('opacity',100);
  for(const [axis,u,v] of [['z',2,4],['y',2,3],['x',2,3]])assert.deepEqual(ui.pixel(axis,u,v),[240,166,61,255]);
  await ui.set('opacity',55);assert.deepEqual(ui.pixel('z',2,4),[165,124,66,255]);
  const toggle=ui.elements.get('organs').children[0].children[0];
  toggle.checked=false;toggle.dispatch('change');await ui.flush();
  assert.deepEqual(ui.pixel('z',2,4),[73,73,73,255]);
  await ui.set('window','lung','change');assert.deepEqual(ui.pixel('z',2,4),[222,222,222,255]);
  await ui.set('window','bone','change');assert.deepEqual(ui.pixel('z',2,4),[64,64,64,255]);
  ui.elements.get('view-z').dispatch('wheel',{deltaY:100});await ui.flush();
  assert.equal(ui.elements.get('slice-z').value,'3');
  assert.equal(ui.elements.get('slice-x').value,'2');
  assert.equal(ui.elements.get('slice-y').value,'2');
  assert.match(ui.elements.get('plane-z').textContent,/Axial/);
  assert.match(ui.elements.get('orientation-z').textContent,/header RAS.*belum direview klinis/);
});

test('MPR-DOM-010: corrupt hashes, gzip expansion, unknown mask bits and forged approvals never paint a ready volume',async()=>{
  const field=raw=>{const zip=zlib.gzipSync(raw);return {base64:zip.toString('base64'),compressedBytes:zip.length,uncompressedBytes:672,sha256:crypto.createHash('sha256').update(raw).digest('hex')};};
  const mutations=[
    d=>{d.hu.sha256='0'.repeat(64);},d=>{d.masks.sha256='0'.repeat(64);},
    d=>{d.hu=field(Buffer.alloc(2*1024*1024));},
    d=>{const raw=zlib.gunzipSync(Buffer.from(d.masks.base64,'base64'));raw.writeUInt16LE(128,0);d.masks=field(raw);},
    d=>{d.organs[1].bit=d.organs[0].bit;},d=>{d.organs[0].bit=3;},
    d=>{d.sourceAffine[0]=NaN;},d=>{d.organs[0].id='../../escape';},
    ...['releaseEligible','clinicalApproved','privacyApproved','rightsApproved','orientationApproved'].map(k=>d=>{d[k]=true;})
  ];
  for(const mutate of mutations){
    const payload=privateMprFixture();mutate(payload);
    const ui=await runPrivateMprDom(payload);
    assert.equal(ui.document.body.dataset.mprReady,'false');
    assert.match(ui.elements.get('status').textContent,/tidak dapat dimuat/);
    assert.equal(ui.elements.get('view-z').frame,null);
    assert.equal(ui.elements.get('slice-z').disabled,true);
  }
});
