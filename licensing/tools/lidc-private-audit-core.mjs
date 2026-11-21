// MEDCOEL private LIDC technical audit helpers. Pure, no patient/image payloads in returned reports.
import fs from 'node:fs';
import zlib from 'node:zlib';
import crypto from 'node:crypto';

const sha = bytes => crypto.createHash('sha256').update(bytes).digest('hex');
const UID = /^[0-9]+(?:\.[0-9]+)+$/;
const CT_SOP_CLASS = '1.2.840.10008.5.1.4.1.1.2';
const SEG_SOP_CLASS = '1.2.840.10008.5.1.4.1.1.66.4';

export function checkSeriesIdentity(rows, expectedUid, kind = 'CT') {
  if (!UID.test(expectedUid) || !['CT', 'SEG'].includes(kind) || !Array.isArray(rows) || !rows.length)
    throw Error('Invalid LIDC series audit input');
  const unique = new Set();
  const expectedClass = kind === 'CT' ? CT_SOP_CLASS : SEG_SOP_CLASS;
  for (const r of rows) {
    if (r.seriesUid !== expectedUid) throw Error(kind + '_SERIES_UID_MISMATCH');
    if (r.modality !== kind || r.sopClassUid !== expectedClass) throw Error(kind + '_SOP_CLASS_OR_MODALITY_MISMATCH');
    if (!UID.test(r.sopUid || '') || unique.has(r.sopUid)) throw Error(kind + '_DUPLICATE_OR_MISSING_SOP_UID');
    unique.add(r.sopUid);
    if (r.pixelDataBytes <= 0 || !Number.isSafeInteger(r.pixelDataBytes))
      throw Error(kind + '_PIXEL_DATA_MISSING');
  }
  const removed = rows.map(r => String(r.identityRemoved || '').toUpperCase());
  const burned = rows.map(r => String(r.burnedIn || '').toUpperCase());
  return {
    kind, objectCount: rows.length, uniqueSopCount: unique.size, seriesIdentityMatched: true,
    pixelDataPresent: true,
    identityRemovedFlag: removed.every(x => x === 'YES') ? 'all-YES' : 'incomplete-or-unconfirmed',
    burnedInAnnotationFlag: burned.some(x => x === 'YES') ? 'YES-present-review-required'
      : burned.every(x => x === 'NO') ? 'all-NO-declared-visual-review-still-required'
      : 'incomplete-or-unconfirmed',
    patientPrivacyReview: 'pending',
  };
}

export function inspectNiftiGzFile(file, expectedDims, datatype, reference) {
  const gzip = fs.readFileSync(file);
  if (gzip.length < 20 || gzip[0] !== 0x1f || gzip[1] !== 0x8b)
    throw Error('NIFTI_NOT_GZIP');
  const plain = zlib.gunzipSync(gzip, { maxOutputLength: 512 * 1024 * 1024 });
  if (plain.length < 352 || plain.readInt32LE(0) !== 348 || plain.toString('latin1', 344, 347) !== 'n+1')
    throw Error('INVALID_NIFTI_HEADER');
  const dims = [42, 44, 46].map(o => plain.readInt16LE(o));
  if (dims.join() !== expectedDims.join() || plain.readInt16LE(70) !== datatype)
    throw Error('NIFTI_DIMENSION_OR_DATATYPE_MISMATCH');
  const voxelBytes = datatype === 4 ? 2 : datatype === 2 ? 1 : 0;
  if (!voxelBytes || plain.length !== 352 + expectedDims.reduce((a, b) => a * b, 1) * voxelBytes)
    throw Error('NIFTI_PAYLOAD_SIZE_MISMATCH');
  const vox = plain.subarray(352);
  const ref = Buffer.isBuffer(reference) ? reference : Buffer.from(reference.buffer, reference.byteOffset, reference.byteLength);
  return {
    gzBytes: gzip.length, gzipSha256: sha(gzip),
    niftiHeaderSha256: sha(plain.subarray(0, 352)),
    voxelSha256: sha(vox),
    exactlyMatchesCurrentOfficialDicomConversion: vox.equals(ref),
    dimensions: dims, datatype,
    // No claim of equivalence to the previous build is made without previous raw/voxel hashes.
    matchesPreviousBuildVoxelData: 'NOT_ASSESSABLE_WITHOUT_PREVIOUS_UNCOMPRESSED_HASH',
  };
}

export function derivedPinComparison(registry, privateBuildRoot) {
  const required = ['data/ct.nii.gz', 'data/readers.nii.gz', 'data/annotations.json'];
  const list = registry.assets.filter(a => !a.sourceFile && a.id?.startsWith('chest-ct.') && required.includes(a.path));
  if (list.length !== 3 || new Set(list.map(a => a.path)).size !== 3) throw Error('CT_PINNED_DERIVED_INCOMPLETE');
  return list.map(a => {
    const file = privateBuildRoot + '/' + a.path;
    const observed = fs.existsSync(file) ? sha(fs.readFileSync(file)) : null;
    return { path: a.path, equalsOldGzipOrJsonHash: observed === a.sha256,
      expectedSha256: a.sha256, observedSha256: observed };
  });
}
