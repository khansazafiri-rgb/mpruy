#!/usr/bin/env node
// MEDCOEL LIDC-IDRI / TCIA private technical audit, no new download or release.
// Operates exclusively on the quarantined candidate from the latest recovery report.
// It cannot establish equivalence to old images without historical uncompressed hashes.
import fs from 'node:fs';
import path from 'node:path';
import crypto from 'node:crypto';
import { fileURLToPath } from 'node:url';
import dicomParser from 'dicom-parser';
import { loadSeries, loadSeg } from './prepare-chest-ct.mjs';
import { checkSeriesIdentity, inspectNiftiGzFile, derivedPinComparison } from '../../../licensing/tools/lidc-private-audit-core.mjs';

const ROOT = fileURLToPath(new URL('../../../', import.meta.url));
const LOCAL = path.join(ROOT, 'local-data');
const RAW = path.join(LOCAL, 'studio-resources/raw/lidc');
const REPORT = path.join(LOCAL, 'studio-resources/clearance/official-data-recovery.json');
const OUT = path.join(LOCAL, 'studio-resources/clearance/tcia-independent-technical-audit.json');
const REGISTRY = path.join(ROOT, 'licensing/resources.v1.json');
const sha = b => crypto.createHash('sha256').update(b).digest('hex');
const parsed = file => JSON.parse(fs.readFileSync(file, 'utf8'));
const validId = id => /^[0-9]+(?:\.[0-9]+)+$/.test(id || '');

function dicomHeader(file) {
  const bytes = fs.readFileSync(file);
  const ds = dicomParser.parseDicom(bytes);
  const px = ds.elements.x7fe00010;
  if (!px || !px.length || px.dataOffset + px.length > bytes.length) throw Error('DICOM_PIXEL_DATA_MISSING');
  return {
    seriesUid: ds.string('x0020000e'),
    sopUid: ds.string('x00080018'),
    sopClassUid: ds.string('x00080016'),
    modality: ds.string('x00080060'),
    pixelDataBytes: px.length,
    identityRemoved: ds.string('x00120062'),
    burnedIn: ds.string('x00280301'),
    pixelSha256: sha(bytes.subarray(px.dataOffset, px.dataOffset + px.length)),
  };
}
function readDicomSeries(dir, uid, kind) {
  if (!validId(uid) || !fs.existsSync(dir)) throw Error(kind + '_SOURCE_SERIES_MISSING');
  const files = fs.readdirSync(dir).filter(f => /^[a-z0-9._-]+\.dcm$/i.test(f)).sort();
  if (!files.length) throw Error(kind + '_SOURCE_SERIES_EMPTY');
  const rows = files.map(f => dicomHeader(path.join(dir, f)));
  const identity = checkSeriesIdentity(rows, uid, kind);
  return { identity, sortedPixelSha256: sha(Buffer.from(rows.map(r => r.pixelSha256).join('\n'))) };
}
function inside(pathName, base) {
  const resolved = fs.realpathSync(pathName), valid = fs.realpathSync(base);
  if (!resolved.startsWith(valid + path.sep)) throw Error('CANDIDATE_OUTSIDE_PRIVATE_QUARANTINE');
  return resolved;
}

export function auditPrivateLidc() {
  const recovery = parsed(REPORT);
  const ctResult = recovery.outcomes.find(x => x.sourceId === 'lidc-idri-tcia');
  if (!ctResult?.privateCandidateQuarantine) throw Error('NO_QUARANTINED_LIDC_CANDIDATE');
  const quarantine = path.join(LOCAL, 'studio-resources/quarantine/tcia-repacked');
  const candidate = inside(path.join(ROOT, ctResult.privateCandidateQuarantine), quarantine);
  const registry = parsed(REGISTRY);
  const parents = registry.assets.filter(a => a.sourceRef === 'lidc-idri-tcia' && a.sourceFile);
  const ctParents = parents.filter(a => a.sourceFile.member.startsWith('CT/'));
  const segParents = parents.filter(a => a.sourceFile.member.startsWith('SEG/'));
  if (ctParents.length !== 1 || segParents.length !== 4) throw Error('LIDC_PINNED_SERIES_LIST_NOT_EXPECTED');

  const parentUid = a => {
    const member = a.sourceFile.member;
    const filename = path.posix.basename(member);
    const uid = filename.endsWith('.zip') ? filename.slice(0, -4) : null;
    if (!validId(uid)) throw Error('LIDC_BAD_PINNED_SERIES_UID');
    return uid;
  };
  const ctUid = parentUid(ctParents[0]);
  const ctDir = path.join(RAW, 'CT', ctUid);
  const ct = readDicomSeries(ctDir, ctUid, 'CT');
  if (ct.identity.objectCount !== 133) throw Error('LIDC_UNEXPECTED_CT_SLICE_COUNT');
  const segSources = segParents.map(a => {
    const uid = parentUid(a);
    const dir = path.join(RAW, 'SEG', uid);
    const headers = readDicomSeries(dir, uid, 'SEG');
    if (headers.identity.objectCount !== 1) throw Error('LIDC_UNEXPECTED_SEG_INSTANCE_COUNT');
    return { uid, filename: path.join(dir, '00000001.dcm'), technicalIdentity: headers };
  });
  // Use the original DICOM-decoding pipeline for cross-validation of the quarantined
  // NIfTI payload against current raw CT and SEG pixels. This is NOT an independent
  // reimplementation of medical image conversion or proof of historical equivalence.
  const series = loadSeries(ctDir);
  const masks = new Uint8Array(series.hu.length);
  const segStats = [];
  for (const [i, a] of segSources.entries()) {
    const s = loadSeg(a.filename, series, 1 << i);
    if (s.voxels === 0) throw Error('LIDC_EMPTY_SEGMENTATION');
    for (let j = 0; j < masks.length; j++) masks[j] |= s.mask[j];
    segStats.push({ technicalIdentity: a.technicalIdentity.identity, frames: s.frames,
      annotatedVoxels: s.voxels, sourcePixelDataSha256: a.technicalIdentity.sortedPixelSha256 });
  }
  const nct = inspectNiftiGzFile(path.join(candidate, 'data/ct.nii.gz'), series.dims, 4, series.hu);
  const nseg = inspectNiftiGzFile(path.join(candidate, 'data/readers.nii.gz'), series.dims, 2, masks);
  const currentConversionMatched = nct.exactlyMatchesCurrentOfficialDicomConversion &&
    nseg.exactlyMatchesCurrentOfficialDicomConversion;
  const legacy = derivedPinComparison(registry, candidate);
  const privacy = ct.identity.identityRemovedFlag === 'all-YES' &&
    segStats.every(s => s.technicalIdentity.identityRemovedFlag === 'all-YES');
  const report = {
    schema: 'medcoel.lidc-local-technical-audit.v1', generatedAt: new Date().toISOString(),
    sourceCollection: 'LIDC-IDRI', sourceVersion: 'TCIA public API selected CT series with four SEG reader objects',
    oldParentZipSha256Verified: false, oldDerivedVoxelHashesAvailable: false,
    oldDerivedByteIdentical: legacy.every(x => x.equalsOldGzipOrJsonHash),
    historicalDatasetEquivalence: 'NOT_PROVEN_NO_OLD_UNCOMPRESSED_VOXEL_REFERENCE',
    currentCandidateMatchesLocallyExtractedDicomData: currentConversionMatched,
    clinicalReview: 'pending', pixelPrivacyReview: 'pending', licenseChainReview: 'pending',
    releaseApproved: false, permittedToPublish: false,
    technical: { ctSeries: ct.identity, ctSourcePixelsSha256: ct.sortedPixelSha256,
      dimensions: series.dims, spacingMm: series.spacing, rescaleSlope: series.slope,
      rescaleIntercept: series.intercept, sliceSpacingEven: true,
      readerSources: segStats, ctNifti: nct, readersNifti: nseg, previousPins: legacy },
    reviewWarnings: [
      'DICOM de-identification flags cannot exclude burned-in pixel identifiers; visual medical/privacy review remains required.',
      'Current data are only checked against the present TCIA download and original conversion; no old voxel reference exists.',
      'Gzip hash differences are not attributed to compressor changes without historical decompressed comparison.',
      privacy ? 'DICOM identity-removed fields say YES; independent privacy sign-off still required.' :
        'At least one DICOM object does not explicitly declare PatientIdentityRemoved=YES; inspect privately.',
    ],
  };
  fs.mkdirSync(path.dirname(OUT), { recursive: true, mode: 0o700 });
  fs.writeFileSync(OUT, JSON.stringify(report, null, 2) + '\n', { mode: 0o600 });
  if (!currentConversionMatched) throw Error('LIDC_PRIVATE_DICOM_TO_NIFTI_PAYLOAD_MISMATCH');
  return { file: path.relative(ROOT, OUT), status: 'TECHNICAL_SOURCE_MATCH_ONLY_HISTORICAL_PROVENANCE_PENDING',
    dimensions: report.technical.dimensions, currentConversionMatched, oldDerivedByteIdentical: report.oldDerivedByteIdentical,
    releaseApproved: false };
}
if (process.argv[1] === fileURLToPath(import.meta.url)) {
  try {
    console.log(JSON.stringify(auditPrivateLidc(), null, 2));
  } catch (e) {
    console.error('Private LIDC technical audit failed: ' + String(e.message || e).slice(0,300));
    process.exitCode = 1;
  }
}
