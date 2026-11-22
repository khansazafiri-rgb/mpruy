#!/usr/bin/env node
/**
 * Honest, non-approving 24-studio candidate inventory.
 * Reads local acquisition reports only; does not interpret status strings
 * as proof of file identity, privacy clearance or public release rights.
 */
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
const ROOT = fileURLToPath(new URL('../', import.meta.url));
const PRIVATE = path.join(ROOT, 'local-data/studio-resources/alternative-candidates');
function readJson(file) {
  try { return JSON.parse(fs.readFileSync(file, 'utf8')); }
  catch (e) { if (e.code === 'ENOENT') return null; throw e; }
}
export function summarizePrivateAcquisition(manifest, catalog, batch, acquisition) {
  if (!manifest || !Array.isArray(manifest.sources) || !Array.isArray(catalog.studios))
    throw Error('CANDIDATE_READINESS_INVALID_MANIFEST');
  const claimed = new Map((batch?.outcomes || []).map(x => [x.id, x]));
  const accepted = new Set(['DOWNLOADED_PRIVATE_ONLY', 'ALREADY_VERIFIED_PRIVATE']);
  const sources = manifest.sources.map(s => {
    const state = claimed.get(s.id);
    const results = (acquisition?.results || []).filter(x => x.source === s.id);
    const skipped = (acquisition?.skipped || []).filter(x => x.source === s.id);
    const acquired = results.filter(x => accepted.has(x.status)).length;
    const errors = results.filter(x => x.status === 'REJECTED_OR_QUARANTINED');
    const blocked = state?.status !== 'SOURCE_CANDIDATE_STAGED';
    const status = blocked ? 'PUBLISHER_METADATA_NOT_CURRENTLY_VERIFIED'
      : errors.length ? 'DOWNLOAD_FAILED_NEEDS_RETRY'
      : acquired && skipped.length ? 'PARTIAL_ARCHIVES_RECORDED'
      : acquired ? 'PRIVATE_ARCHIVES_RECORDED'
      : 'NO_ARCHIVES_READY';
    return {
      id: s.id, sourceVersion: s.sourceVersion, studioIds: s.studioIds, status,
      publisherLicenceClaim: s.declaredLicence,
      archivedFileCountFromLastReport: acquired,
      pendingFileOrSourceCount: skipped.length,
      pendingReasons: [...new Set(skipped.map(x=>x.reason))],
      failureReasons: errors.map(x => x.error),
      exactLocalBytesRecheckedByThisReport: false,
      medicalApproved: false, privacyApproved: false, rightsApproved: false
    };
  });
  const byStudio = catalog.studios.filter(s => !s.internal).map(s => ({
    studioId: s.id,
    candidateSources: sources.filter(a => a.studioIds.includes(s.id))
      .map(a => ({ id: a.id, status: a.status, archivedFileCount: a.archivedFileCountFromLastReport })),
    releaseEligible: false
  }));
  return {
    schema: 'medcoel.private-alternative-readiness.v1',
    totalClinicalStudios: byStudio.length, candidateSourcePackages: sources.length,
    summary: {
      partialOrArchivedSources: sources.filter(x => x.archivedFileCountFromLastReport > 0).length,
      sourcesWithoutRecordedFiles: sources.filter(x => x.archivedFileCountFromLastReport === 0).length
    },
    releaseEligible: false,
    disclaimer: 'Acquisition REPORT status is not hash revalidation, permission, independent anatomical review, deidentification or release approval.',
    sources, studios: byStudio
  };
}
export function writePrivateReadiness() {
  const manifest = readJson(path.join(ROOT, 'licensing/candidates/alternative-sources-batch.v1.json'));
  const catalog = readJson(path.join(ROOT, 'shared/studios/catalog.v1.json'));
  const batch = readJson(path.join(PRIVATE, 'batch-report.json'));
  const acquired = readJson(path.join(PRIVATE, 'acquisition-report.json'));
  const report = summarizePrivateAcquisition(manifest, catalog, batch, acquired);
  if (!fs.existsSync(PRIVATE)) fs.mkdirSync(PRIVATE, { recursive: true, mode: 0o700 });
  const target = path.join(PRIVATE, 'processing-readiness.json');
  for (const p of [PRIVATE, target]) if (fs.lstatSync(p,{throwIfNoEntry:false})?.isSymbolicLink())
    throw Error('CANDIDATE_READINESS_SYMLINK');
  fs.writeFileSync(target, JSON.stringify(report, null, 2) + '\n', { mode: 0o600 });
  return report;
}
if (process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  const report = writePrivateReadiness();
  console.table(report.sources.map(x=>({
    source:x.id, status:x.status,
    archived:x.archivedFileCountFromLastReport, pending:x.pendingFileOrSourceCount
  })));
  console.log('Private inventory: local-data/studio-resources/alternative-candidates/processing-readiness.json');
  console.log('This output is NOT rights, medical, privacy or release clearance.');
}
