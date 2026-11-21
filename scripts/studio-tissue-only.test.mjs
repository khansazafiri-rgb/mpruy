import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';

const read = p => fs.readFileSync(new URL('../' + p, import.meta.url), 'utf8');
const raw = read('apps/studios/tools/prepare-brain-mri-tissue-only.mjs');
const build = read('apps/studios/scripts/build-all.mjs');
const cfg = JSON.parse(read('apps/studios/brain-mri/studio.config.json'));
const status = JSON.parse(read('docs/clinical-studios/studio-status.v1.json'));
const assets = JSON.parse(read('licensing/resources.v1.json'));
const evidence = JSON.parse(read('licensing/commercial-rights-evidence.json'));

test('MRI-SAFE-001 does not acquire or copy third-party parcellation data', async () => {
  assert.doesNotMatch(raw, /sri24_labels_nifti\.zip|LPBA40-labels\.txt|lpba40\.nii|labels-lpba40\.nii\.gz/);
  assert.match(raw, /sri24_anatomy_nifti\.zip/);
  assert.match(raw, /sri24_tissue_nifti\.zip/);
  assert.match(raw, /sameGrid\(t1, tissue\)/);
  const { prepareTissueOnly } = await import('../apps/studios/tools/prepare-brain-mri-tissue-only.mjs');
  assert.equal(typeof prepareTissueOnly, 'function');
});

test('MRI-SAFE-002 must be explicitly opted into private Brain MRI only', () => {
  assert.match(build, /--sri24-tissue-only/);
  assert.match(build, /--private --only brain-mri/);
  assert.match(build, /brain-mri-sri24-tissue-only/);
  assert.equal(cfg.privateData, 'local-data/studio-resources/build/brain-mri');
});

test('MRI-SAFE-003 prevents the tissue overlay from leaking during Challenge', () => {
  for (const p of ['data/labels-tissue.nii.gz', 'data/labels-tissue.json']) {
    assert.ok(cfg.challengeRestricted.includes(p), p);
  }
  assert.deepEqual(status.studios.find(x => x.id === 'brain-mri').challengeRestricted, cfg.challengeRestricted);
});

test('MRI-SAFE-004 does not change pending rights or activate canonical studio', () => {
  const src = assets.sources.find(x => x.id === 'sri24-nitrc');
  assert.equal(src.status, 'REVIEW_REQUIRED');
  const r = evidence.records.find(x => x.id === 'studio-res-brain-mri-lpba40');
  assert.equal(r.status, 'blocked');
  const catalog = JSON.parse(read('shared/studios/catalog.v1.json'));
  const mri = catalog.studios.find(x => x.id === 'brain-mri');
  assert.notEqual(mri.release.status, 'publishable');
  assert.equal(mri.runtime.entry, null);
});
