import test from 'node:test';
import assert from 'node:assert/strict';
import zlib from 'node:zlib';
import { renderPrivateSpineSlices, renderPrivateEcgSvg, parsePrivateNifti } from './private-multimodal-review-core.mjs';

function syntheticNifti(dtype, values, dims = [4, 3, 3]) {
  const length = dims.reduce((a, b) => a * b, 1);
  assert.equal(values.length, length);
  const bytes = Buffer.alloc(352 + length * (dtype === 4 ? 2 : 1));
  bytes.writeInt32LE(348, 0);
  bytes.writeInt16LE(3, 40);
  dims.forEach((d, i) => bytes.writeInt16LE(d, 42 + i * 2));
  bytes.writeInt16LE(dtype, 70);
  bytes.writeInt16LE(dtype === 4 ? 16 : 8, 72);
  bytes.writeFloatLE(352, 108);
  bytes.writeInt16LE(1, 254);
  bytes.writeFloatLE(1, 280);
  bytes.writeFloatLE(1, 300);
  bytes.writeFloatLE(1, 320);
  bytes.write('n+1\0', 344, 'latin1');
  values.forEach((value, i) => {
    if (dtype === 4) bytes.writeInt16LE(value, 352 + i * 2);
    else bytes[352 + i] = value;
  });
  return zlib.gzipSync(bytes);
}

test('REVIEW-HUB-001: exact matching 3-D NIfTI grid produces three private label-overlays', () => {
  const voxels = 4 * 3 * 3;
  const mri = syntheticNifti(4, Array(voxels).fill(1000));
  const maskValues = Array(voxels).fill(0);
  maskValues[1 + 4 * (1 + 3 * 1)] = 100;
  const mask = syntheticNifti(2, maskValues);
  const frames = renderPrivateSpineSlices(mri, mask, {
    schema: 'medcoel.labels.v1', structures: [{ id: 100, rgb: [250, 60, 60] }]
  });
  assert.deepEqual(frames.map(x => x.name), ['sagittal', 'coronal', 'axial']);
  assert.deepEqual(frames.map(x => x.markedPixels), [1, 1, 1]);
  for (const frame of frames) {
    assert.equal(frame.overlay.readUInt32BE(0), 0x89504e47);
    assert.notDeepEqual(frame.original, frame.overlay);
  }
});

test('REVIEW-HUB-002: invalid affine, unknown labels or unexpected NIfTI type fail closed', () => {
  const values = Array(36).fill(1000), image = syntheticNifti(4, values);
  const maskValues = Array(36).fill(0);
  maskValues[17] = 99;
  const mask = syntheticNifti(2, maskValues);
  const colors = { schema: 'medcoel.labels.v1', structures: [{ id: 100, rgb: [0, 255, 0] }] };
  assert.throws(() => renderPrivateSpineSlices(image, mask, colors), /REVIEW_UNKNOWN_SPINE_LABEL/);
  assert.throws(() => parsePrivateNifti(mask, 4), /REVIEW_UNSUPPORTED_NIFTI_GRID/);
  const changed = zlib.gunzipSync(mask);
  changed.writeFloatLE(2, 280);
  assert.throws(() => renderPrivateSpineSlices(image, zlib.gzipSync(changed), colors), /REGISTRATION_MISMATCH/);
});

test('REVIEW-HUB-003: all 12 real-value lead channels render to ECG paper without diagnosis guesses', () => {
  const names = ['I','II','III','aVR','aVL','aVF','V1','V2','V3','V4','V5','V6'];
  const make = () => ({
    schema: 'medcoel.ecg.v1', fs: 500, samples: 5000, units: 'mV',
    paperSpeedMmPerS: 25, gainMmPerMv: 10,
    leads: names.map(lead => ({ lead, gainAduPerMv: 1000, baselineAdu: 0,
      adu: Array.from({ length: 5000 }, (_, i) => i % 300 === 0 ? 700 : 0) }))
  });
  const svg = renderPrivateEcgSvg(make());
  assert.match(svg, /<svg/);
  assert.match(svg, /viewBox/);
  assert.match(svg, /12|2.5 detik/);
  assert.match(svg, /V6/);
  const missing = make();
  missing.leads.pop();
  assert.throws(() => renderPrivateEcgSvg(missing), /REVIEW_ECG_UNEXPECTED_SCHEMA/);
  const wrongGain = make();
  wrongGain.leads[0].gainAduPerMv = 0;
  assert.throws(() => renderPrivateEcgSvg(wrongGain), /REVIEW_ECG_BAD_ADU/);
});
