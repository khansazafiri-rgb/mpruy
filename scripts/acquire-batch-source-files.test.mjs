import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import crypto from 'node:crypto';
import { fileURLToPath } from 'node:url';
import { createExactFileAcquisitionPlan, officialDownloadUrl } from './acquire-batch-source-files.mjs';

const root = fileURLToPath(new URL('../', import.meta.url));
const manifest = JSON.parse(fs.readFileSync(path.join(root, 'licensing/candidates/alternative-sources-batch.v1.json'), 'utf8'));
const catalog = JSON.parse(fs.readFileSync(path.join(root, 'shared/studios/catalog.v1.json'), 'utf8'));
const sha = b => crypto.createHash('sha256').update(b).digest('hex');
const MD5 = '6b5524af4b15e6ba06ef2d700c0c73e0';

const evidenceFor = (source, metadata) => {
  const snapshot = Buffer.from(JSON.stringify(metadata));
  return { status: 'SOURCE_CANDIDATE_STAGED', sha256: sha(snapshot), snapshot };
};

test('ACQUIRE-001: one safe batch handles Figshare and Zenodo and excludes unindexed publishers', () => {
  const record = {};
  for (const s of manifest.sources) {
    if (s.provider === 'figshare')
      record[s.id] = evidenceFor(s, { id: s.articleId, version: s.expectedVersion,
        license: { name: 'CC BY 4.0' },
        files: [{ id: s.articleId, name: s.id + '.zip', size: 2048,
          computed_md5: 'a'.repeat(32) }] });
    else if (s.provider === 'zenodo')
      record[s.id] = evidenceFor(s, {
        id: s.recordId, metadata: { license: { id: 'cc-by-4.0' } },
        files: [{ key: 'Totalsegmentator_dataset_small_v201.zip', size: 3200000000,
          checksum: 'md5:' + MD5 }]
      });
  }
  const plan = createExactFileAcquisitionPlan({
    manifest, catalog, evidenceBySource: record,
    maxFileMiB: 512, maxTotalMiB: 1024
  });
  assert.equal(plan.files.length, 2);
  assert.ok(plan.files.every(f => f.downloadUrl.startsWith('https://ndownloader.figshare.com/files/')));
  assert.ok(plan.excluded.some(x => x.source === 'totalsegmentator-small-v201' && x.reason === 'SIZE_CAP_REACHED'));
  assert.ok(plan.excluded.some(x => x.source === 'hra-3d-ref-organ' && x.reason === 'PUBLISHER_FILE_MANIFEST_NOT_YET_PINNED'));
  assert.ok(plan.excluded.some(x => x.source === 'lus-7seg-v1' && x.reason === 'PUBLISHER_FILE_MANIFEST_NOT_YET_PINNED'));
  assert.equal(plan.releaseEligible, false);
  const blocked = structuredClone(record);
  blocked['fracatlas-v7'].status = 'SOURCE_METADATA_BLOCKED';
  const cautious = createExactFileAcquisitionPlan({
    manifest, catalog, evidenceBySource: blocked
  });
  assert.ok(!cautious.files.some(f => f.source === 'fracatlas-v7'));
});

test('ACQUIRE-002: publisher URLs require validated IDs, filename and checksum', () => {
  const fig = manifest.sources.find(s => s.provider === 'figshare');
  assert.match(officialDownloadUrl(fig, {
    name: 'fractures.zip', bytes: 10, sourceFileId: 991,
    publisherMd5: 'b'.repeat(32)
  }), /^https:\/\/ndownloader\.figshare\.com\/files\/991$/);
  assert.throws(() => officialDownloadUrl(fig, {
    name: '../secrets.json', bytes: 10, sourceFileId: 991,
    publisherMd5: 'b'.repeat(32)
  }), /ACQUIRE_UNPINNED_OR_UNSAFE_FILE/);
  assert.throws(() => officialDownloadUrl(fig, {
    name: 'fractures.zip', bytes: 10, sourceFileId: 991,
    publisherMd5: 'unverified'
  }), /ACQUIRE_UNPINNED_OR_UNSAFE_FILE/);
  const z = manifest.sources.find(s => s.provider === 'zenodo');
  assert.throws(() => officialDownloadUrl(z, {
    name: 'Totalsegmentator_dataset_small_v201.zip', bytes: 3200000000,
    publisherMd5: 'f'.repeat(32)
  }), /ACQUIRE_UNPINNED_ZENODO_ARCHIVE/);
});

test('ACQUIRE-003: missing official file rights or forged publisher snapshot never becomes a download', () => {
  const source = manifest.sources.find(s => s.id === 'fracatlas-v7');
  const payload = {
    id: source.articleId, version: source.expectedVersion,
    license: { name: 'CC BY 4.0' },
    files: [{ id: 45, name:'one.zip', size:100, computed_md5:'1'.repeat(32) }]
  };
  const legitimate = evidenceFor(source, payload);
  const forged = { ...legitimate, sha256: '0'.repeat(64) };
  const wrong = createExactFileAcquisitionPlan({
    manifest, catalog, evidenceBySource: { [source.id]: forged }
  });
  assert.equal(wrong.files.length, 0);
  assert.ok(wrong.excluded.some(x => x.reason === 'OFFICIAL_PUBLISHER_METADATA_MISSING_OR_CHANGED'));
  payload.license.name = 'CC BY-NC 4.0';
  const wrongLicence = createExactFileAcquisitionPlan({
    manifest, catalog, evidenceBySource: { [source.id]: evidenceFor(source, payload) }
  });
  assert.equal(wrongLicence.files.length, 0);
});
