import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { onboardAllCandidates } from './onboard-all-permissive-sources.mjs';

const ROOT = fileURLToPath(new URL('../', import.meta.url));
const manifest = JSON.parse(fs.readFileSync(path.join(ROOT, 'licensing/candidates/alternative-sources-batch.v1.json'), 'utf8'));
const catalog = JSON.parse(fs.readFileSync(path.join(ROOT, 'shared/studios/catalog.v1.json'), 'utf8'));

test('BATCH-ALL-001: one orchestrator covers all nine, refuses unavailable metadata and never approves public release', async () => {
  let calls = 0;
  const report = await onboardAllCandidates({
    manifest, catalog,
    stage: async ({ manifest: m, write }) => {
      calls++;
      assert.equal(write, true);
      return { outcomes: m.sources.map(s => ({
        id: s.id, status: 'SOURCE_METADATA_BLOCKED', error: 'fixture: no publisher evidence'
      })) };
    },
    acquire: async ({ manifest: m, evidenceBySource, maxFileMiB, maxTotalMiB }) => {
      calls++;
      assert.equal(m.sources.length, 9);
      assert.deepEqual(evidenceBySource, {});
      assert.equal(maxFileMiB, 512);
      assert.equal(maxTotalMiB, 4096);
      return { downloads: 0, plan: { excluded: m.sources.map(s => ({ source: s.id })) }, results: [] };
    }
  });
  assert.equal(calls, 2);
  assert.equal(report.publisherCandidates, 9);
  assert.equal(report.publisherMetadataMatched, 0);
  assert.equal(report.failedOrExcludedPublisherMetadata, 9);
  assert.equal(report.downloadedPrivateFiles, 0);
  assert.equal(report.releaseEligible, false);
  assert.equal(report.publicDeploymentModified, false);
});
