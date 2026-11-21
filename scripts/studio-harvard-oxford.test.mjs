import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import { parseAtlasXml, validateAlignedVolumes } from '../apps/studios/tools/prepare-brain-mri-harvard-oxford.mjs';

const doc = p => fs.readFileSync(new URL('../' + p, import.meta.url), 'utf8');
const cfg = JSON.parse(doc('apps/studios/brain-mri/studio.config.json'));
const status = JSON.parse(doc('docs/clinical-studios/studio-status.v1.json'));
const catalog = JSON.parse(doc('shared/studios/catalog.v1.json'));
const rights = JSON.parse(doc('licensing/commercial-rights-evidence.json'));

const DIMS = [12, 12, 12], total = DIMS.reduce((a, b) => a * b);
const makeNifti = (datatype, data, translation = 0, fourthDim = 1) => {
  const hdr = Buffer.alloc(352);
  hdr.writeInt32LE(348, 0);
  [3, ...DIMS, fourthDim, 1, 1, 1].forEach((v, i) => hdr.writeInt16LE(v, 40 + i * 2));
  hdr.writeInt16LE(datatype, 70);
  hdr.writeInt16LE(datatype === 4 ? 16 : 8, 72);
  [1, 1, 1, 1, 1, 1, 1, 1].forEach((v, i) => hdr.writeFloatLE(v, 76 + i * 4));
  hdr.writeFloatLE(352, 108);
  hdr.writeInt16LE(2, 254);
  [[1, 0, 0, translation], [0, 1, 0, 0], [0, 0, 1, 0]].forEach((row, r) => row.forEach((v, col) => hdr.writeFloatLE(v, 280 + r * 16 + col * 4)));
  hdr.write('n+1\0', 344, 'latin1');
  return Buffer.concat([hdr, Buffer.from(data.buffer, data.byteOffset, data.byteLength)]);
};
const img = new Int16Array(total).fill(200), regions = new Uint8Array(total);
for (let k = 0; k < DIMS[2]; k++) for (let j = 0; j < DIMS[1]; j++) for (let i = 0; i < DIMS[0]; i++) {
  const pos = i + DIMS[0] * (j + DIMS[1] * k);
  img[pos] += i; regions[pos] = Math.floor(i / 3) + 1;
}
const xml = '<atlas><data><label index="0">Frontal Pole</label><label index="1">Occipital Pole</label><label index="2">Temporal Pole</label><label index="3">Cingulate Gyrus</label></data></atlas>';

test('HO-001: XML indices map to maxprob voxel IDs, and retain source terms', () => {
  const labels = parseAtlasXml(xml);
  assert.deepEqual(labels.map(x => x.id), [1, 2, 3, 4]);
  assert.equal(labels[0].nameEn, 'Frontal Pole');
  assert.throws(() => parseAtlasXml('<atlas><label index="0">A</label><label index="0">B</label></atlas>'), /DUPLICATE/);
});

test('HO-002: aligned 3D NIfTI atlas yields valid interior crosshairs', () => {
  const result = validateAlignedVolumes(makeNifti(4, img), makeNifti(2, regions), xml);
  assert.equal(result.definitions.length, 4);
  assert.equal(result.points.size, 4);
  assert.equal(result.orientation, 'RAS');
});

test('HO-003: mismatched affine is refused; no silent resampling to SRI24', () => {
  assert.throws(() => validateAlignedVolumes(makeNifti(4, img), makeNifti(2, regions, 10), xml), /GRID_MISMATCH/);
});

test('HO-004: require 3D data; reject unmatched label identities', () => {
  assert.throws(() => validateAlignedVolumes(makeNifti(4, img, 0, 2), makeNifti(2, regions), xml), /REQUIRE_3D/);
  const bad = Uint8Array.from(regions); bad[0] = 9;
  assert.throws(() => validateAlignedVolumes(makeNifti(4, img), makeNifti(2, bad), xml), /LABEL_WITHOUT_XML/);
});

test('HO-005: input source digests must be pinned; no FSL software or public network download', () => {
  const src = doc('apps/studios/tools/prepare-brain-mri-harvard-oxford.mjs');
  const build = doc('apps/studios/scripts/build-all.mjs');
  assert.match(src, /source-manifest\.json/);
  assert.match(src, /HARVARD_OXFORD_DIGEST_MISMATCH/);
  assert.match(src, /CC-BY-SA-4\.0/);
  assert.doesNotMatch(src, /lpba40\.nii|sri24_labels_nifti|fetch\(/i);
  assert.match(build, /--harvard-oxford-candidate/);
  assert.match(build, /Private Brain MRI variant requires --private --only brain-mri/);
});

test('HO-006: private challenge hides exact label volume; original blocked rights remain blocked', () => {
  for (const p of ['data/labels-harvard-oxford.nii.gz', 'data/labels-harvard-oxford.json']) assert.ok(cfg.challengeRestricted.includes(p));
  assert.deepEqual(status.studios.find(s => s.id === 'brain-mri').challengeRestricted, cfg.challengeRestricted);
  const mri = catalog.studios.find(s => s.id === 'brain-mri');
  assert.notEqual(mri.release.status, 'publishable');
  assert.equal(mri.runtime.entry, null);
  assert.equal(rights.records.find(r => r.id === 'studio-res-brain-mri-lpba40').status, 'blocked');
});
