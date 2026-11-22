import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import { fileURLToPath } from 'node:url';
import path from 'node:path';
import {
  validateCandidateManifest, assessPublisherRecord, stageAllSourceCandidates
} from './batch-alternative-resources.mjs';

const ROOT = fileURLToPath(new URL('../', import.meta.url));
const manifest = JSON.parse(fs.readFileSync(path.join(ROOT, 'licensing/candidates/alternative-sources-batch.v1.json'), 'utf8'));
const catalog = JSON.parse(fs.readFileSync(path.join(ROOT, 'shared/studios/catalog.v1.json'), 'utf8'));
const copy = x => structuredClone(x);
const md5 = '6b5524af4b15e6ba06ef2d700c0c73e0';
const sources = validateCandidateManifest(manifest, catalog);
const sample = id => sources.find(x => x.id === id);

test('CANDIDATE-001: all sources are permitted-license candidates and conflicting NC sources explicitly excluded', () => {
  assert.equal(sources.length, 9);
  assert.equal(new Set(sources.map(s => s.id)).size, 9);
  assert.ok(sources.every(s => s.declaredLicence === 'CC-BY-4.0'));
  for (const id of ['bodyparts3d-dbcls', 'lpba40-loni', 'amos-zenodo', 'legacy-nc-atlas-code'])
    assert.ok(manifest.excludedSources.some(x => x.id === id));
  assert.equal(manifest.policy.publicReleaseAuthorized, false);
});

test('CANDIDATE-002: changing source to NC, forged provenance or unknown studio fails closed', () => {
  const nc = copy(manifest);
  nc.sources[0].declaredLicence = 'CC-BY-NC-SA-4.0';
  assert.throws(() => validateCandidateManifest(nc, catalog), /BATCH_UNAPPROVED_SOURCE/);
  const wrong = copy(manifest);
  wrong.sources[0].studioIds.push('some-unknown-studio');
  assert.throws(() => validateCandidateManifest(wrong, catalog), /BATCH_UNAPPROVED_SOURCE/);
  const badUrl = copy(manifest);
  badUrl.sources[1].officialUrl = 'https://example.org/fake';
  assert.throws(() => validateCandidateManifest(badUrl, catalog), /BATCH_UNTRUSTED_OFFICIAL_URL/);
  const unblocked = copy(manifest);
  unblocked.excludedSources = unblocked.excludedSources.filter(x => x.id !== 'lpba40-loni');
  assert.throws(() => validateCandidateManifest(unblocked, catalog), /BATCH_MISSING_LEGACY_EXCLUSION/);
  const fakeCleared = copy(manifest);
  fakeCleared.sources[0].rightsReview = 'approved';
  assert.throws(() => validateCandidateManifest(fakeCleared, catalog), /BATCH_UNAPPROVED_SOURCE/);
});

test('CANDIDATE-003: Figshare publisher version and MD5 inventory checked, NC claimed license refused', () => {
  const source = sample('fracatlas-v7');
  const data = {
    id: 22363012, version: 7, license: { name: 'CC BY 4.0', url: 'https://creativecommons.org/licenses/by/4.0/' },
    files: [{ id: 3, name: 'source.zip', size: 34000,
      computed_md5: '0123456789abcdef0123456789abcdef', download_url: 'https://ndownloader.figshare.com/files/3' }]
  };
  assert.equal(assessPublisherRecord(source, Buffer.from(JSON.stringify(data))).filenamePins.length, 1);
  data.license = { name: 'CC BY-NC 4.0' };
  assert.throws(() => assessPublisherRecord(source, Buffer.from(JSON.stringify(data))), /BATCH_PUBLISHER_LICENCE_NOT_CONFIRMED/);
  data.license = { name: 'CC BY 4.0' }; data.version = 6;
  assert.throws(() => assessPublisherRecord(source, Buffer.from(JSON.stringify(data))), /BATCH_FIGSHARE_RECORD_VERSION_MISMATCH/);
});

test('CANDIDATE-004: Zenodo archive MD5 must match official pinned revision', () => {
  const source = sample('totalsegmentator-small-v201');
  const metadata = {
    id: 10047263, metadata: { license: { id: 'cc-by-4.0' } },
    files: [{
      key: 'Totalsegmentator_dataset_small_v201.zip', size: 3200000000,
      checksum: 'md5:' + md5,
      links: { self: 'https://zenodo.org/api/records/10047263/files/file' }
    }]
  };
  assert.equal(assessPublisherRecord(source, Buffer.from(JSON.stringify(metadata))).publisherLicence, 'cc-by-4.0');
  metadata.files[0].checksum = 'md5:' + '0'.repeat(32);
  assert.throws(() => assessPublisherRecord(source, Buffer.from(JSON.stringify(metadata))), /BATCH_ZENODO_FILE_PIN_CHANGED/);
  metadata.files[0].checksum = 'md5:' + md5;
  metadata.metadata.license.id = 'cc-by-nc-4.0';
  assert.throws(() => assessPublisherRecord(source, Buffer.from(JSON.stringify(metadata))), /BATCH_PUBLISHER_LICENCE_NOT_CONFIRMED/);
});

test('CANDIDATE-005: publisher-only license HTML does not grant file redistribution', () => {
  const s = sample('lus-7seg-v1');
  const value = assessPublisherRecord(s, Buffer.from('<section>Licence <span>CC BY 4.0</span> Learn more</section>'));
  assert.equal(value.legalStatus, 'PUBLISHER_METADATA_COMPATIBLE_ONLY');
  assert.equal(value.releaseEligible, false);
  assert.equal(value.fileRightsVerified, false);
  assert.throws(() => assessPublisherRecord(s, Buffer.from('CC BY-NC 4.0 Learn more')), /BATCH_PUBLISHER_LICENCE_NOT_CONFIRMED/);
});

test('CANDIDATE-006: one simulated publisher batch checks every source and creates no patient data', async () => {
  const responder = async url => {
    const source = sources.find(s => s.evidenceUrl === url);
    assert.ok(source, 'only official source URLs are requested');
    let text;
    if (source.provider === 'figshare') text = JSON.stringify({
      id: source.articleId, version: source.expectedVersion,
      license: { name: 'CC BY 4.0' },
      files: [{ id: 1, name: 'test-metadata-only.zip', size: 24,
        computed_md5: 'abcdefabcdefabcdefabcdefabcdefab' }]
    });
    else if (source.provider === 'zenodo') text = JSON.stringify({
      id: source.recordId, metadata: { license: { id: 'cc-by-4.0' } },
      files: [{ key: 'Totalsegmentator_dataset_small_v201.zip', size: 3200000000,
        checksum: 'md5:' + md5 }]
    });
    else if (source.provider === 'mendeley') text = '<section>Licence <em>CC BY 4.0</em> Learn more</section>';
    else text = 'All CCF 3D reference objects are released under Attribution 4.0 International (CC BY 4.0).';
    return new Response(text, { status: 200, headers: { 'content-type': 'text/html' } });
  };
  const result = await stageAllSourceCandidates({ manifest, catalog, fetcher: responder, write: false });
  assert.equal(result.outcomes.length, 9);
  assert.equal(result.datasetBytesDownloaded, 0);
  assert.ok(result.outcomes.every(o => o.status === 'SOURCE_CANDIDATE_STAGED' && o.releaseEligible === false));
  const bad = await stageAllSourceCandidates({
    manifest, catalog, write: false,
    fetcher: async url => url.includes('xw7mrg7ntg') ?
      new Response('This dataset is CC BY-NC 4.0 Learn more', { status: 200 }) : responder(url)
  });
  assert.equal(bad.outcomes.filter(o => o.status === 'SOURCE_METADATA_BLOCKED').length, 1);
});
