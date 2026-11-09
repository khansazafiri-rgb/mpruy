import test from 'node:test';
import assert from 'node:assert/strict';
import { regionAtLPS, imagingAvailability, insideAcquisition } from '../src/app/regionCoverage.js';

const regions = { headZ: 300, neckZ: 175, armX: 197, thighZ: -397, thoraxZ: -5, pelvisZ: -297 };
const bounds = { lo: [-262.5, -300, -360], hi: [262.5, 300, 290] };
const at = (point, dataset = 'atlas') => imagingAvailability({ point, bounds, landmarks: regions, dataset });

test('automatic full-body region selection uses existing patient LPS landmarks', () => {
  assert.equal(regionAtLPS([0, 0, 350], regions), 'head');
  assert.equal(regionAtLPS([0, 0, 220], regions), 'neck');
  assert.equal(regionAtLPS([-228, 0, 0], regions), 'upperLimb');
  assert.equal(regionAtLPS([228, 0, 0], regions), 'upperLimb');
  assert.equal(regionAtLPS([0, 0, -450], regions), 'lowerLimb');
  assert.equal(regionAtLPS([0, 0, 50], regions), 'thorax');
  assert.equal(regionAtLPS([0, 0, -125], regions), 'abdomen');
  assert.equal(regionAtLPS([0, 0, -310], regions), 'pelvis');
  assert.equal(regionAtLPS([NaN, 0, 0], regions), null);
});

test('atlas only exposes the CT volume already acquired for trunk; no invented limb or head data', () => {
  assert.equal(at([0, 0, 50]).available, true, 'thorax');
  assert.equal(at([0, 0, -125]).available, true, 'abdomen');
  assert.equal(at([0, 0, -310]).available, true, 'pelvis');
  for (const point of [[0, 0, 350], [0, 0, 220], [-228, 0, 0], [0, 0, -450]]) {
    const status = at(point);
    assert.equal(status.available, false, status.region);
    assert.match(status.message, /belum tersedia|di luar batas/);
  }
  assert.equal(at([0, 0, 350]).regionLabel, 'Kepala');
  assert.equal(at([-228, 0, 0]).withinBounds, true, 'an arm might be inside AABB, but still has no cleared tissue simulation');
});

test('even trunk scans must be strictly inside acquisition bounds', () => {
  assert.equal(insideAcquisition([0, 0, 50], bounds), true);
  assert.equal(insideAcquisition([263, 0, 50], bounds), false);
  assert.equal(at([0, 500, 50]).available, false);
  assert.match(at([0, 500, 50]).message, /di luar batas akuisisi/);
  assert.equal(at(null).available, false);
});

test('other datasets retain legacy bounds checking without region restrictions', () => {
  assert.equal(at([-228, 0, 0], 'phantom').available, true);
  assert.equal(at([0, 0, 350], 'phantom').available, false);
});

test('region recognition does not alter source voxel coordinates or invent pixel values', () => {
  const original = [0, 0, 50], copy = [...original];
  const originalBounds = structuredClone(bounds);
  const result = at(original);
  assert.equal(result.available, true);
  assert.deepEqual(original, copy);
  assert.deepEqual(bounds, originalBounds);
  assert.ok(!Object.hasOwn(result, 'voxels') && !Object.hasOwn(result, 'image'), 'status only, no image synthesis');
});
