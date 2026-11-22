#!/usr/bin/env node
/**
 * One command across every permissive-publisher candidate.
 * Stage metadata for all nine; then acquire bounded publisher-indexed files
 * (never an unpinned file). Unindexed HRA/Mendeley and large archives stay pending.
 */
import fs from 'node:fs';
import path from 'node:path';
import crypto from 'node:crypto';
import { fileURLToPath } from 'node:url';
import { stageAllSourceCandidates } from './batch-alternative-resources.mjs';
import { acquireEligibleFiles } from './acquire-batch-source-files.mjs';

const ROOT = fileURLToPath(new URL('../', import.meta.url));
const BASE = path.join(ROOT, 'local-data/studio-resources/alternative-candidates');
const sha = bytes => crypto.createHash('sha256').update(bytes).digest('hex');

export async function onboardAllCandidates({ manifest, catalog, stage = stageAllSourceCandidates,
  acquire = acquireEligibleFiles, maxFileMiB = 512, maxTotalMiB = 4096 }) {
  const metadata = await stage({ manifest, catalog, write: true });
  const evidenceBySource = {};
  for (const row of metadata.outcomes) {
    if (row.status !== 'SOURCE_CANDIDATE_STAGED') continue;
    const file = path.join(BASE, row.id, 'source-metadata.snapshot');
    try {
      const data = fs.readFileSync(file);
      if (sha(data) !== row.metadataSha256) continue;
      evidenceBySource[row.id] = { status: row.status, sha256: row.metadataSha256, snapshot: data };
    } catch { /* excluded: no matching publisher snapshot */ }
  }
  const acquisition = await acquire({ manifest, catalog, evidenceBySource,
    maxFileMiB, maxTotalMiB });
  return {
    publisherCandidates: manifest.sources.length,
    publisherMetadataMatched: metadata.outcomes.filter(x => x.status === 'SOURCE_CANDIDATE_STAGED').length,
    failedOrExcludedPublisherMetadata: metadata.outcomes.filter(x => x.status !== 'SOURCE_CANDIDATE_STAGED').length,
    downloadedPrivateFiles: acquisition.downloads,
    skippedUnindexedOrOversize: acquisition.plan.excluded.length,
    failedFileDownloads: acquisition.results.filter(x => x.status === 'REJECTED_OR_QUARANTINED').length,
    rightsApproved: false, medicalApproved: false, privacyApproved: false,
    publicDeploymentModified: false,
    releaseEligible: false
  };
}

async function main() {
  const args = process.argv.slice(2);
  if (args.length > 2 || !args.every(x => /^--max-(file|total)-mib=\d+$/.test(x)))
    throw Error('usage: node scripts/onboard-all-permissive-sources.mjs [--max-file-mib=N] [--max-total-mib=N]');
  const value = (name, fallback) => {
    const found = args.find(x => x.startsWith('--max-' + name + '-mib='));
    return found ? Number(found.split('=')[1]) : fallback;
  };
  const manifest = JSON.parse(fs.readFileSync(path.join(ROOT, 'licensing/candidates/alternative-sources-batch.v1.json'), 'utf8'));
  const catalog = JSON.parse(fs.readFileSync(path.join(ROOT, 'shared/studios/catalog.v1.json'), 'utf8'));
  const report = await onboardAllCandidates({ manifest, catalog,
    maxFileMiB: value('file', 512), maxTotalMiB: value('total', 4096) });
  console.table([report]);
  console.log('Local evidence and acquisition reports: local-data/studio-resources/alternative-candidates/');
  console.log('Publisher record matching != permission to publish. Clinical images and full 3D anatomy are NOT yet integrated.');
  if (report.failedOrExcludedPublisherMetadata || report.failedFileDownloads) process.exitCode = 2;
}
if (process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url))
  main().catch(e => { console.error(e.message); process.exitCode = 1; });
