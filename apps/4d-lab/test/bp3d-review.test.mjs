import test from 'node:test';
import assert from 'node:assert/strict';
import { NodeIO } from '@gltf-transform/core';
import { makeGlb } from '../tools/build-bp3d-candidate.mjs';
import { summarizeGeometry, verifyLineage, reviewHTML, buildReview } from '../tools/review-bp3d-candidate.mjs';
import { createHash } from 'node:crypto';

const OBJ=['v 0 0 0','v 2 0 0','v 2 1 0','v 0 1 0','f 1 2 3','f 1 3 4'].join('\n');
test('extract authentic GLB geometry statistics for source-review UI',async()=>{
  const bytes=await makeGlb([{id:'FJ1000',text:OBJ}],'Femur.l',{approvedForDistribution:false});
  const doc=await new NodeIO().readBinary(bytes);
  const r=summarizeGeometry(doc);
  assert.equal(r.triangles,2);
  assert.equal(r.vertices,6);
  assert.equal(r.sourceMeshes,1);
  assert.deepEqual(r.boundsNative.min,[0,0,0]);
  assert.deepEqual(r.boundsNative.max,[2,1,0]);
  const lineage={officialFMAId:'FMA24485',officialRepresentationId:'BP601',
    elements:[{id:'FJ1000'}],generatedGLBSHA256:createHash('sha256').update(bytes).digest('hex'),
    approvedForDistribution:false,geometryAnatomyValidated:false,registrationValidated:false};
  assert.equal(verifyLineage({bytes,lineage,summary:r}).registrationVerified,false);
  assert.match(reviewHTML('Femur.l',r),/UNAPPROVED SOURCE CANDIDATE/);
  assert.match(reviewHTML('Femur.l',r),/model\.glb/);
  assert.match(reviewHTML('Femur.l',r),/OrbitControls/);
});
test('reject tampered GLB, incorrect source FJ identity and false clearance claims',async()=>{
  const bytes=await makeGlb([{id:'FJ1000',text:OBJ}],'Femur.l',{approvedForDistribution:false});
  const r=summarizeGeometry(await new NodeIO().readBinary(bytes));
  const good={officialFMAId:'FMA24485',officialRepresentationId:'BP601',
    elements:[{id:'FJ1000'}],generatedGLBSHA256:createHash('sha256').update(bytes).digest('hex'),
    approvedForDistribution:false,geometryAnatomyValidated:false,registrationValidated:false};
  assert.throws(()=>verifyLineage({bytes,lineage:{...good,generatedGLBSHA256:'0'},summary:r}),/Changed GLB/);
  assert.throws(()=>verifyLineage({bytes,lineage:{...good,elements:[{id:'FJ2000'}]},summary:r}),/mesh IDs/);
  assert.throws(()=>verifyLineage({bytes,lineage:{...good,approvedForDistribution:true},summary:r}),/unapproved/);
});
test('review generator only allows a structure in local-data quarantine',async()=>{
  await assert.rejects(buildReview('../etc/passwd'),/Invalid structure name/);
  await assert.rejects(buildReview('Femur.l',{privateRoot:'/tmp/outside-data'}),/quarantined local-data/);
});

test('local Retina/Safari viewer keeps canvas logical size inside model viewport', async () => {
  const bytes = await makeGlb([{id:'FJ1000',text:OBJ}],'Femur.l',{approvedForDistribution:false});
  const shape = summarizeGeometry(await new NodeIO().readBinary(bytes));
  const html = reviewHTML('Femur.l', shape);
  // false would preserve the high-DPI drawing buffer as CSS layout size,
  // creating horizontal scrolling and off-center rendering on Retina Macs.
  assert.match(html, /renderer\.setSize\(w,h,true\)/);
  assert.doesNotMatch(html, /renderer\.setSize\(w,h,false\)/);
  assert.match(html, /#viewer\{[^}]*overflow:hidden/);
  assert.match(html, /#viewer canvas\{display:block\}/);
  assert.match(html, /body\{[^}]*overflow-x:hidden/);
  assert.match(html, /box\.getCenter\(new THREE\.Vector3\(\)\)/);
});
