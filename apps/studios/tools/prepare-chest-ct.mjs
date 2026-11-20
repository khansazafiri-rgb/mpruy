#!/usr/bin/env node
// Chest CT data from LIDC-IDRI (TCIA, CC BY 3.0): ONE series (LIDC-IDRI-0001), downloaded from the official NBIA API.
// DICOM is parsed with dicom-parser; geometry comes from ImagePositionPatient/ImageOrientationPatient/PixelSpacing,
// intensities from RescaleSlope/Intercept (HU). Slices are sorted along the true normal and must be evenly spaced.
// Reader annotations (DICOM SEG, one per reader) are kept SEPARATE (bitmask per voxel): no consensus is invented.
import fs from 'node:fs';
import path from 'node:path';
import zlib from 'node:zlib';
import crypto from 'node:crypto';
import { fileURLToPath } from 'node:url';
import dicomParser from 'dicom-parser';

const REPO = fileURLToPath(new URL('../../../', import.meta.url));
const RAW = path.join(REPO, 'local-data/studio-resources/raw/lidc');
const OUT = path.join(REPO, 'local-data/studio-resources/build/chest-ct');
const sha = b => crypto.createHash('sha256').update(b).digest('hex');
const ATTRIBUTION = 'LIDC-IDRI (The Cancer Imaging Archive), data citation doi:10.7937/K9/TCIA.2015.LO9QL9SX. Armato SG 3rd et al., The Lung Image Database Consortium (LIDC) and Image Database Resource Initiative (IDRI): a completed reference database of lung nodules on CT scans, Medical Physics 38(2):915-931 (2011). Licensed under CC BY 3.0 (https://creativecommons.org/licenses/by/3.0/). Reader segmentations: DICOM SEG objects distributed with LIDC-IDRI in TCIA.';
const vec = s => s.split('\\').map(Number);
const dot = (a, b) => a[0] * b[0] + a[1] * b[1] + a[2] * b[2];
const cross = (a, b) => [a[1] * b[2] - a[2] * b[1], a[2] * b[0] - a[0] * b[2], a[0] * b[1] - a[1] * b[0]];

export function loadSeries(dir) {
  const slices = fs.readdirSync(dir).filter(f => f.endsWith('.dcm')).map(f => {
    const bytes = fs.readFileSync(path.join(dir, f)), ds = dicomParser.parseDicom(bytes);
    if (ds.string('x00020010') !== '1.2.840.10008.1.2.1') throw Error('Unsupported transfer syntax in ' + f);
    return { file: f, sha256: sha(bytes), ds, bytes, ipp: vec(ds.string('x00200032')), iop: vec(ds.string('x00200037')), ps: vec(ds.string('x00280030')),
      rows: ds.uint16('x00280010'), cols: ds.uint16('x00280011'), slope: Number(ds.string('x00281053') || 1), intercept: Number(ds.string('x00281052') || 0),
      bits: ds.uint16('x00280100'), signed: ds.uint16('x00280103') === 1, modality: ds.string('x00080060') };
  });
  const r = slices[0], rowDir = r.iop.slice(0, 3), colDir = r.iop.slice(3, 6), normal = cross(rowDir, colDir);
  for (const s of slices) {
    if (s.modality !== 'CT' || s.rows !== r.rows || s.cols !== r.cols || s.bits !== 16 || s.iop.some((v, i) => Math.abs(v - r.iop[i]) > 1e-4) || s.ps.some((v, i) => Math.abs(v - r.ps[i]) > 1e-4)) throw Error('Inconsistent series geometry');
  }
  slices.sort((a, b) => dot(a.ipp, normal) - dot(b.ipp, normal));
  const gaps = slices.slice(1).map((s, i) => dot(s.ipp, normal) - dot(slices[i].ipp, normal));
  const spacing = gaps.reduce((a, b) => a + b, 0) / gaps.length;
  if (gaps.some(g => Math.abs(g - spacing) > 0.01)) throw Error('Uneven slice spacing: ' + Math.min(...gaps) + '..' + Math.max(...gaps));
  const n = r.rows * r.cols, hu = new Int16Array(n * slices.length);
  slices.forEach((s, k) => {
    const el = s.ds.elements.x7fe00010, px = s.signed ? new Int16Array(s.bytes.buffer, s.bytes.byteOffset + el.dataOffset, n) : new Uint16Array(s.bytes.buffer, s.bytes.byteOffset + el.dataOffset, n);
    for (let i = 0; i < n; i++) hu[k * n + i] = Math.max(-32768, Math.min(32767, Math.round(px[i] * s.slope + s.intercept)));
  });
  // voxel (i=column, j=row, k=slice) -> LPS: IPP0 + i*Δc*rowDir + j*Δr*colDir + k*spacing*normal; NIfTI RAS negates x and y.
  const [dr, dc] = r.ps, o = slices[0].ipp;
  const lps = [0, 1, 2].map(a => [rowDir[a] * dc, colDir[a] * dr, normal[a] * spacing, o[a]]);
  const affine = [lps[0].map(v => -v), lps[1].map(v => -v), lps[2]];
  return { slices, dims: [r.cols, r.rows, slices.length], spacing: [dc, dr, spacing], affine, lpsAffine: lps, hu, normal, slope: r.slope, intercept: r.intercept };
}

/** Reader SEG (binary, bit-packed) -> per-voxel bitmask in the CT grid, matching frames by position along the normal. */
export function loadSeg(file, series, bit) {
  const bytes = fs.readFileSync(file), ds = dicomParser.parseDicom(bytes);
  const frames = Number(ds.string('x00280008')), rows = ds.uint16('x00280010'), cols = ds.uint16('x00280011');
  if (ds.string('x00620001') !== 'BINARY' || ds.uint16('x00280100') !== 1 || rows !== series.dims[1] || cols !== series.dims[0]) throw Error('Unexpected SEG ' + file);
  const pf = ds.elements.x52009230.items;
  const px = ds.elements.x7fe00010, base = px.dataOffset;
  const positions = series.slices.map(s => dot(s.ipp, series.normal));
  const mask = new Uint8Array(series.hu.length);
  let voxels = 0;
  pf.forEach((item, f) => {
    const ipp = vec(item.dataSet.elements.x00209113.items[0].dataSet.string('x00200032'));
    const z = dot(ipp, series.normal), k = positions.findIndex(p => Math.abs(p - z) < 0.01);
    if (k < 0) throw Error('SEG frame does not match any CT slice');
    for (let i = 0; i < rows * cols; i++) {
      const bitIndex = f * rows * cols + i;
      if ((bytes[base + (bitIndex >> 3)] >> (bitIndex & 7)) & 1) { mask[k * rows * cols + i] |= bit; voxels++; }
    }
  });
  return { mask, voxels, frames, reader: ds.string('x00700084') || 'unknown', description: ds.string('x0008103e') || '', sha256: sha(bytes) };
}

function niftiInt(dims, affine, data, datatype) {
  const h = Buffer.alloc(352); h.writeInt32LE(348, 0);
  [3, ...dims, 1, 1, 1, 1].forEach((d, i) => h.writeInt16LE(d, 40 + 2 * i));
  h.writeInt16LE(datatype, 70); h.writeInt16LE(datatype === 4 ? 16 : 8, 72);
  [1, Math.hypot(affine[0][0], affine[1][0], affine[2][0]), Math.hypot(affine[0][1], affine[1][1], affine[2][1]), Math.hypot(affine[0][2], affine[1][2], affine[2][2]), 1, 1, 1, 1].forEach((p, i) => h.writeFloatLE(p, 76 + 4 * i));
  h.writeFloatLE(352, 108); h.writeFloatLE(1, 112); h.writeFloatLE(0, 116); h.writeUInt8(2, 123);
  h.writeInt16LE(1, 254); affine.forEach((row, r) => row.forEach((v, c) => h.writeFloatLE(v, 280 + r * 16 + c * 4)));
  h.write('n+1\0', 344, 'latin1');
  return Buffer.concat([h, Buffer.from(data.buffer, data.byteOffset, data.byteLength)]);
}

export function prepare() {
  const ctDir = fs.readdirSync(path.join(RAW, 'CT')).find(d => !d.endsWith('.zip'));
  const series = loadSeries(path.join(RAW, 'CT', ctDir));
  const segDirs = fs.readdirSync(path.join(RAW, 'SEG')).filter(d => !d.endsWith('.zip')).sort();
  const readers = segDirs.map((d, i) => loadSeg(path.join(RAW, 'SEG', d, '00000001.dcm'), series, 1 << i));
  const bits = new Uint8Array(series.hu.length);
  readers.forEach(r => { for (let i = 0; i < bits.length; i++) bits[i] |= r.mask[i]; });
  const [X, Y, Z] = series.dims, toMm = (i, j, k) => series.affine.map(r => r[0] * i + r[1] * j + r[2] * k + r[3]);
  const pop = v => (v & 1) + ((v >> 1) & 1) + ((v >> 2) & 1) + ((v >> 3) & 1);
  // Agreement statistics and a well-agreed interior point (all readers) for teaching.
  let core = [0, 0, 0], coreN = 0; const agreement = [0, 0, 0, 0, 0];
  for (let k = 0; k < Z; k++) for (let j = 0; j < Y; j++) for (let i = 0; i < X; i++) { const v = bits[i + X * (j + Y * k)]; if (!v) continue; const p = pop(v); agreement[p]++; if (p === readers.length) { core[0] += i; core[1] += j; core[2] += k; coreN++; } }
  if (!coreN) throw Error('No voxel annotated by every reader');
  const coreVox = core.map(v => Math.round(v / coreN)), coreMm = toMm(...coreVox);
  const readerStats = readers.map((r, i) => {
    let lo = [Infinity, Infinity, Infinity], hi = [-Infinity, -Infinity, -Infinity];
    for (let idx = 0; idx < r.mask.length; idx++) if (r.mask[idx]) { const v = [idx % X, Math.floor(idx / X) % Y, Math.floor(idx / (X * Y))]; v.forEach((c, a) => { lo[a] = Math.min(lo[a], c); hi[a] = Math.max(hi[a], c); }); }
    const ext = [0, 1, 2].map(a => (hi[a] - lo[a] + 1) * series.spacing[a]);
    return { bit: 1 << i, label: 'Anotasi ' + (i + 1), reader: r.reader, description: r.description, voxels: r.voxels, volumeMm3: +(r.voxels * series.spacing[0] * series.spacing[1] * series.spacing[2]).toFixed(1), extentMm: ext.map(v => +v.toFixed(1)) };
  });
  // Challenge points: inside the all-reader core vs lung parenchyma far from any annotation.
  const inside = [coreVox];
  const outside = [];
  for (let k = Math.floor(Z * 0.3); k < Z * 0.8 && outside.length < 3; k += 17) for (let j = Math.floor(Y * 0.35); j < Y * 0.65 && outside.length < 3; j += 23) for (let i = Math.floor(X * 0.2); i < X * 0.8 && outside.length < 3; i += 29) {
    const idx = i + X * (j + Y * k); if (series.hu[idx] < -750 && series.hu[idx] > -950 && Math.hypot(i - coreVox[0], j - coreVox[1], k - coreVox[2]) > 60) outside.push([i, j, k]);
  }
  fs.rmSync(OUT, { recursive: true, force: true });
  fs.mkdirSync(path.join(OUT, 'data'), { recursive: true }); fs.mkdirSync(path.join(OUT, 'server'), { recursive: true });
  const gz = b => zlib.gzipSync(b, { level: 9, mtime: 0 });
  const outputs = {
    'data/ct.nii.gz': gz(niftiInt(series.dims, series.affine, series.hu, 4)),
    'data/readers.nii.gz': gz(niftiInt(series.dims, series.affine, bits, 2)),
    'data/annotations.json': Buffer.from(JSON.stringify({ schema: 'medcoel.ct-annotations.v1', source: 'LIDC-IDRI DICOM SEG (one object per reader)', consensus: 'none: readers are shown separately; agreement is a count, not a ground truth', note: 'ContentCreatorName is "Reader1" in every SEG object (anonymised); the four objects are four distinct annotation sessions.',
      readers: readerStats, agreementVoxels: { one: agreement[1], two: agreement[2], three: agreement[3], four: agreement[4] } }, null, 1)),
    'data/dataset.json': Buffer.from(JSON.stringify({ schema: 'medcoel.dataset.v1', status: 'PRIVATE_REVIEW', source: 'LIDC-IDRI (TCIA), CC BY 3.0',
      notice: 'Data: LIDC-IDRI (TCIA) © Armato dkk., CC BY 3.0. CT pasien yang telah dide-identifikasi oleh TCIA; anotasi nodul dari beberapa radiolog ditampilkan terpisah (bukan konsensus). Review klinis belum selesai: hanya review privat.',
      units: 'HU', image: 'data/ct.nii.gz', readers: 'data/readers.nii.gz', annotations: 'data/annotations.json', presets: { lung: [-1350, 150], mediastinum: [-160, 240], bone: [-450, 1050] }, noduleMm: coreMm.map(v => +v.toFixed(1)) }, null, 1)),
    'data/NOTICE-LIDC-IDRI.txt': Buffer.from(ATTRIBUTION + '\n\nChanges by MEDCOEL: one CT series converted from DICOM to NIfTI (HU = stored value × RescaleSlope + RescaleIntercept; geometry from ImagePositionPatient/ImageOrientationPatient/PixelSpacing, LPS converted to RAS); four reader DICOM SEG objects resampled to the same grid as a per-voxel reader bitmask (no voxel created or merged). Adapted data shared under CC BY 3.0.\n'),
    'server/challenge.json': Buffer.from(JSON.stringify({ schema: 'medcoel.challenge.v1', source: 'LIDC-IDRI reader SEG', medicalReview: 'pending', count: inside.length + outside.length,
      items: [...inside.map((v, n) => ({ id: 'in-' + n, inside: true, v })), ...outside.map((v, n) => ({ id: 'out-' + n, inside: false, v }))].map(p => ({ id: 'ct-' + p.id,
        prompt: { kind: 'crosshair-structure', mm: toMm(...p.v).map(x => +x.toFixed(1)), text: 'Apakah titik di crosshair berada di dalam nodul yang ditandai radiolog?' },
        options: ['Ya, di dalam nodul', 'Tidak, parenkim paru tanpa anotasi'], answer: { index: p.inside ? 0 : 1 }, canonical: p.inside ? 'Ya, di dalam nodul' : 'Tidak, parenkim paru tanpa anotasi',
        explanation: p.inside ? 'Titik ini ditandai oleh semua ' + readers.length + ' pembaca (DICOM SEG LIDC). Ingat: setiap radiolog bisa berbeda; ini bukan diagnosis.' : 'Titik ini berada di parenkim paru (HU sekitar −750 sampai −950) dan jauh dari semua anotasi pembaca.' })) }, null, 1)),
  };
  for (const [rel, b] of Object.entries(outputs)) fs.writeFileSync(path.join(OUT, rel), b);
  const provenance = { schema: 'medcoel.provenance.v1', studio: 'chest-ct', generatedAt: new Date().toISOString(), tool: 'apps/studios/tools/prepare-chest-ct.mjs',
    source: { api: 'https://services.cancerimagingarchive.net/nbia-api/services/v1/', collection: 'LIDC-IDRI', patient: 'LIDC-IDRI-0001', ctSeriesFiles: series.slices.length, doi: '10.7937/K9/TCIA.2015.LO9QL9SX', licence: 'CC-BY-3.0' },
    members: Object.fromEntries([...series.slices.map(s => ['CT/' + s.file, s.sha256]), ...readers.map((r, i) => ['SEG/' + segDirs[i], r.sha256])]),
    outputs: Object.fromEntries(Object.entries(outputs).map(([k, b]) => [k, { bytes: b.length, sha256: sha(b) }])),
    validation: { dims: series.dims, spacingMm: series.spacing.map(v => +v.toFixed(4)), rescale: [series.slope, series.intercept], evenSpacing: true, orientationIdentical: true, affineRas: series.affine,
      huRange: series.hu.reduce((a, v) => [Math.min(a[0], v), Math.max(a[1], v)], [Infinity, -Infinity]), readers: readerStats, coreVoxels: coreN, noduleCoreMm: coreMm },
    privacy: 'TCIA de-identified (PatientIdentityRemoved=YES, DeidentificationMethod recorded). No DICOM header is shipped to the client; burned-in text not automatically excluded (reviewer to confirm on images).',
    medicalReview: 'pending' };
  fs.writeFileSync(path.join(OUT, 'provenance.json'), JSON.stringify(provenance, null, 2));
  return provenance;
}

if (process.argv[1] === fileURLToPath(import.meta.url)) { const p = prepare(); console.log(JSON.stringify({ outputs: p.outputs, validation: { ...p.validation, affineRas: undefined } }, null, 1)); }
