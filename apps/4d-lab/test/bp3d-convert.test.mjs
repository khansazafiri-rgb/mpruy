import test from 'node:test';
import assert from 'node:assert/strict';
import { Document, NodeIO } from '@gltf-transform/core';
import { readObjTriangles, makeGlb, buildLocalCandidate } from '../tools/build-bp3d-candidate.mjs';

const OBJ=[
  'v 0 0 0',
  'v 1 0 0',
  'v 1 1 0',
  'v 0 1 0',
  'f 1 2 3',
  'f 1 3 4'
].join('\n');

test('official OBJ triangle coordinates are preserved, without invented patient registration', ()=>{
  const m=readObjTriangles(OBJ);
  assert.equal(m.stats.vertices,4);
  assert.equal(m.stats.triangles,2);
  assert.equal(m.positions.length,18);
  assert.deepEqual([...m.positions.slice(0,9)],[0,0,0,1,0,0,1,1,0]);
  assert.deepEqual([...m.normals.slice(0,9)],[0,0,1,0,0,1,0,0,1]);
});
test('official OBJ parser rejects invalid faces, degenerate triangles and missing geometry', ()=>{
  assert.throws(()=>readObjTriangles('v 0 0 0\nv 1 0 0\nf 1 2 99'),/out of bounds/);
  assert.throws(()=>readObjTriangles('v 0 0 0\nv 0 0 0\nv 0 0 0\nf 1 2 3'),/Degenerate/);
  assert.throws(()=>readObjTriangles('v 1 2 3'),/no usable faces/);
});
test('official OBJ triangulation includes additional quad triangles',()=>{
  const m=readObjTriangles('v 0 0 0\nv 1 0 0\nv 1 1 0\nv 0 1 0\nf 1 2 3 4');
  assert.equal(m.stats.triangles,2);
  assert.equal(m.stats.fanTriangulatedFaces,1);
});
test('convert actual OBJ mesh into valid GLB with original FJ file ID and no release approval',async()=>{
  const provenance={fmaId:'FMA24485',bpId:'BP601',approvedForDistribution:false};
  const bytes=await makeGlb([{id:'FJ1000',text:OBJ}], 'Femur.l',provenance);
  assert.ok(bytes.length>100);
  assert.equal(Buffer.from(bytes).toString('ascii',0,4),'glTF');
  const doc=await new NodeIO().readBinary(bytes);
  assert.equal(doc.getRoot().listScenes().length,1);
  const mesh=doc.getRoot().listMeshes()[0];
  assert.equal(mesh.getName(),'FJ1000');
  assert.equal(mesh.listPrimitives()[0].getAttribute('POSITION').getCount(),6);
  assert.equal(doc.getRoot().listNodes()[0].getExtras().officialElementFileId,'FJ1000');
  assert.equal(doc.getRoot().getExtras().coordinateFrame,'raw-official-OBJ-not-registered');
});
test('does not write approved candidate or emit data into public folder', async()=>{
  await assert.rejects(buildLocalCandidate('Femur.l',{outputDir:'/tmp/unsafe-output'}),/local-data/);
});
