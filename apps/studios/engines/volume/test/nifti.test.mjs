import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import zlib from 'node:zlib';
import { test } from 'node:test';
import { parseNifti, voxelToWorld, worldToVoxel, sameGrid, orientation } from '../nifti.js';
import { makeVolumeFixture } from '../../../tools/make-volume-fixture.mjs';

const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'nifti-'));
makeVolumeFixture(dir, { studioId: 'brain-mri' });
const read = f => parseNifti(zlib.gunzipSync(fs.readFileSync(path.join(dir, f))));
test('VOL-001 fixture NIfTI parses with its sform affine, RAS orientation and 2 mm voxels', () => {
  const v = read('data/t1.nii.gz');
  assert.deepEqual(v.dims, [64, 64, 64]); assert.deepEqual(v.pixdim, [2, 2, 2]); assert.equal(orientation(v.affine), 'RAS');
});
test('VOL-002 voxel<->world round trip is exact for the affine', () => {
  const v = read('data/t1.nii.gz');
  for (const p of [[0, 0, 0], [10, 20, 30], [63, 63, 63]]) assert.deepEqual(worldToVoxel(v.affine, voxelToWorld(v.affine, p)).map(x => Math.round(x * 1e6) / 1e6), p);
});
test('VOL-003 overlays are accepted only on the same grid and affine', () => {
  const a = read('data/t1.nii.gz'), b = read('data/labels-lpba40.nii.gz');
  assert.equal(sameGrid(a, b), true);
  const shifted = { ...b, affine: b.affine.map((r, i) => (i === 0 ? [r[0], r[1], r[2], r[3] + 1] : r)) };
  assert.equal(sameGrid(a, shifted), false);
  assert.equal(sameGrid(a, { ...b, dims: [64, 64, 63] }), false);
});
test('VOL-004 fixture labels sit on the side their names claim (RAS: left = negative x)', () => {
  const lab = read('data/labels-lpba40.nii.gz'), [X, Y] = lab.dims; const xs = { 1: [], 2: [] };
  lab.data.forEach((v, i) => { if (v) xs[v].push(voxelToWorld(lab.affine, [i % X, Math.floor(i / X) % Y, Math.floor(i / (X * Y))])[0]); });
  assert.ok(Math.max(...xs[1]) < 0); assert.ok(Math.min(...xs[2]) > 0);
});
test('VOL-005 malformed headers are rejected', () => {
  assert.throws(() => parseNifti(Buffer.alloc(400)), /NIFTI_HEADER/);
});
