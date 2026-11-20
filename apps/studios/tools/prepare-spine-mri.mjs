#!/usr/bin/env node
// Spine MRI data: ONE case (sagittal T2, case "1_t2") of the SPIDER lumbar spine dataset (Zenodo 10.5281/zenodo.10159290,
// CC BY 4.0), fetched as single members of the official ZIPs by HTTP Range (no bulk download). MetaImage (.mha) geometry
// is ITK LPS (offset + spacing + direction); converted to NIfTI RAS without resampling. Reference segmentations: vertebrae,
// intervertebral discs and spinal canal. Vertebral LEVEL names are not invented: structures are numbered from caudal,
// verified from their measured superior-inferior position.
import fs from 'node:fs';
import path from 'node:path';
import zlib from 'node:zlib';
import crypto from 'node:crypto';
import { fileURLToPath } from 'node:url';

const REPO = fileURLToPath(new URL('../../../', import.meta.url));
const RAW = path.join(REPO, 'local-data/studio-resources/raw/spider');
const OUT = path.join(REPO, 'local-data/studio-resources/build/spine-mri');
const sha = b => crypto.createHash('sha256').update(b).digest('hex');
const EXPECT = { '1_t2.mha': '8f8470631b29ce894ae0c308667095307c430737a51f164301ceba5fce7976fa', '1_t2_mask.mha': 'eb1348242b721e680d160b50a18603623f8f7e1819452c86bd4bb07cb4f24dee' };
const ATTRIBUTION = 'SPIDER lumbar spine MRI dataset: van der Graaf JW et al., Lumbar spine segmentation in MR images: a dataset and a public benchmark, Scientific Data 11:264 (2024), doi:10.1038/s41597-024-03090-w; data doi:10.5281/zenodo.10159290. Licensed under CC BY 4.0 (https://creativecommons.org/licenses/by/4.0/).';

export function readMha(buf) {
  const marker = 'ElementDataFile = LOCAL\n', i = buf.indexOf(marker);
  if (i < 0) throw Error('MHA without LOCAL data');
  const head = buf.slice(0, i + marker.length).toString('latin1'), get = k => (head.match(new RegExp('^' + k + ' = (.*)$', 'm')) || [])[1];
  const dims = get('DimSize').trim().split(/\s+/).map(Number), spacing = get('ElementSpacing').trim().split(/\s+/).map(Number);
  const offset = get('Offset').trim().split(/\s+/).map(Number), dir = get('TransformMatrix').trim().split(/\s+/).map(Number);
  if (get('ElementType').trim() !== 'MET_SHORT' || get('BinaryDataByteOrderMSB').trim() !== 'False') throw Error('Unexpected MHA type/endianness');
  const body = buf.slice(i + marker.length), raw = get('CompressedData').trim() === 'True' ? zlib.inflateSync(body) : body;
  if (raw.length !== dims[0] * dims[1] * dims[2] * 2) throw Error('MHA size mismatch');
  // ITK physical space is LPS; columns of the direction matrix are the axis directions.
  const lps = [0, 1, 2].map(r => [dir[r] * spacing[0], dir[3 + r] * spacing[1], dir[6 + r] * spacing[2], offset[r]]);
  return { dims, spacing, offset, orientation: (get('AnatomicalOrientation') || '').trim(), lps, affine: [lps[0].map(v => -v), lps[1].map(v => -v), lps[2]], data: new Int16Array(raw.buffer, raw.byteOffset, raw.length / 2) };
}
function nifti(vol, data, datatype) {
  const h = Buffer.alloc(352); h.writeInt32LE(348, 0); [3, ...vol.dims, 1, 1, 1, 1].forEach((d, i) => h.writeInt16LE(d, 40 + 2 * i));
  h.writeInt16LE(datatype, 70); h.writeInt16LE(datatype === 4 ? 16 : 8, 72); [1, ...vol.spacing, 1, 1, 1, 1].forEach((p, i) => h.writeFloatLE(p, 76 + 4 * i));
  h.writeFloatLE(352, 108); h.writeFloatLE(1, 112); h.writeUInt8(2, 123); h.writeInt16LE(1, 254);
  vol.affine.forEach((row, r) => row.forEach((v, c) => h.writeFloatLE(v, 280 + r * 16 + c * 4))); h.write('n+1\0', 344, 'latin1');
  return Buffer.concat([h, Buffer.from(data.buffer, data.byteOffset, data.byteLength)]);
}

export function prepare() {
  const files = Object.fromEntries(Object.entries(EXPECT).map(([f, d]) => { const b = fs.readFileSync(path.join(RAW, f)); if (sha(b) !== d) throw Error('Digest mismatch ' + f); return [f, b]; }));
  const img = readMha(files['1_t2.mha']), mask = readMha(files['1_t2_mask.mha']);
  if (img.dims.join() !== mask.dims.join() || img.affine.some((r, i) => r.some((v, j) => Math.abs(v - mask.affine[i][j]) > 1e-4))) throw Error('Mask grid differs from image');
  const [X, Y] = img.dims, labels = new Uint8Array(mask.data.length), acc = {};
  mask.data.forEach((v, n) => {
    if (!v) return;
    labels[n] = v === 100 ? 100 : v > 200 ? v - 200 + 150 : v; // 1..: vertebrae, 100: canal, 151..: discs (uint8)
    const k = Math.floor(n / (X * Y)), s = img.affine[2][2] * k + img.affine[2][3];
    (acc[v] = acc[v] || { n: 0, s: 0 }).n++; acc[v].s += s;
  });
  const vert = Object.keys(acc).map(Number).filter(v => v < 100).sort((a, b) => a - b), discs = Object.keys(acc).map(Number).filter(v => v > 200).sort((a, b) => a - b);
  const sOf = v => acc[v].s / acc[v].n;
  // Verified ordering: higher SPIDER label = more superior (fails closed otherwise).
  for (let i = 1; i < vert.length; i++) if (!(sOf(vert[i]) > sOf(vert[i - 1]))) throw Error('Vertebra labels not ordered caudal->cranial');
  for (let i = 1; i < discs.length; i++) if (!(sOf(discs[i]) > sOf(discs[i - 1]))) throw Error('Disc labels not ordered caudal->cranial');
  const structures = [
    // Readability: adjacent levels alternate between two tones of the same class colour (bone: sand/orange; disc: green/teal).
    ...vert.map((v, i) => ({ id: v, source: 'SPIDER vertebra label ' + v, nameEn: 'Vertebra #' + (i + 1) + ' from caudal', side: 'midline', rgb: i % 2 ? [255, 160, 70] : [240, 215, 150], kind: 'vertebra' })),
    { id: 100, source: 'SPIDER spinal canal label 100', nameEn: 'Spinal canal', side: 'midline', rgb: [80, 160, 255], kind: 'canal' },
    ...discs.map((v, i) => ({ id: v - 200 + 150, source: 'SPIDER IVD label ' + v, nameEn: 'Intervertebral disc #' + (i + 1) + ' from caudal', side: 'midline', rgb: i % 2 ? [60, 200, 180] : [140, 230, 110], kind: 'disc' })),
  ];
  // Challenge: one interior voxel per class (nearest the class centroid), answer = tissue class (no level names).
  const point = id => { const sum = [0, 0, 0]; let n = 0; labels.forEach((v, idx) => { if (v === id) { sum[0] += idx % X; sum[1] += Math.floor(idx / X) % Y; sum[2] += Math.floor(idx / (X * Y)); n++; } });
    const c = sum.map(v => v / n); let best = null, bd = Infinity; labels.forEach((v, idx) => { if (v !== id) return; const p = [idx % X, Math.floor(idx / X) % Y, Math.floor(idx / (X * Y))]; const d = (p[0] - c[0]) ** 2 + (p[1] - c[1]) ** 2 + (p[2] - c[2]) ** 2; if (d < bd) { bd = d; best = p; } });
    return img.affine.map(r => +(r[0] * best[0] + r[1] * best[1] + r[2] * best[2] + r[3]).toFixed(1)); };
  const classes = ['Korpus vertebra', 'Diskus intervertebralis', 'Kanalis spinalis'];
  const items = [[vert[2], 0], [100, 2], [discs[2], 1], [vert[4], 0], [discs[4], 1]].filter(([v]) => v !== undefined).map(([v, k], n) => {
    const id = v > 200 ? v - 200 + 150 : v;
    return { id: 'spine-' + n, prompt: { kind: 'crosshair-structure', mm: point(id), text: 'Struktur apa yang berada di crosshair?' }, options: classes, answer: { index: k }, canonical: classes[k],
      explanation: classes[k] + ' menurut segmentasi referensi SPIDER pada kasus ini. Nama level vertebra tidak diberikan karena tidak tercatat per label di dataset.' };
  });
  fs.rmSync(OUT, { recursive: true, force: true }); fs.mkdirSync(path.join(OUT, 'data'), { recursive: true }); fs.mkdirSync(path.join(OUT, 'server'), { recursive: true });
  const gz = b => zlib.gzipSync(b, { level: 9, mtime: 0 });
  const outputs = {
    'data/t1.nii.gz': gz(nifti(img, img.data, 4)), 'data/labels-lpba40.nii.gz': gz(nifti(img, labels, 2)),
    'data/labels.json': Buffer.from(JSON.stringify({ schema: 'medcoel.labels.v1', source: 'SPIDER reference segmentation (case 1_t2)', terminologyReview: 'pending', structures }, null, 1)),
    'data/dataset.json': Buffer.from(JSON.stringify({ schema: 'medcoel.dataset.v1', status: 'PRIVATE_REVIEW', source: 'SPIDER (Zenodo 10.5281/zenodo.10159290), CC BY 4.0',
      notice: 'Data: SPIDER lumbar spine MRI (van der Graaf dkk., 2024), CC BY 4.0. Satu kasus T2 sagital dari pasien dengan nyeri punggung bawah (data terbuka, tanpa identitas). Review medis belum selesai: hanya review privat.',
      image: 'data/t1.nii.gz', labels: 'data/labels-lpba40.nii.gz', labelTable: 'data/labels.json', window: [134, 1918], guidedTarget: 100 }, null, 1)),
    'data/NOTICE-SPIDER.txt': Buffer.from(ATTRIBUTION + '\n\nChanges by MEDCOEL: one image and its mask converted from MetaImage to NIfTI-1 (no resampling; ITK LPS geometry converted to RAS); mask values remapped for 8-bit storage (vertebrae unchanged, canal 100, discs 201..207 -> 151..157). Adapted data shared under CC BY 4.0.\n'),
    'server/challenge.json': Buffer.from(JSON.stringify({ schema: 'medcoel.challenge.v1', source: 'SPIDER', medicalReview: 'pending', count: items.length, items }, null, 1)),
  };
  for (const [rel, b] of Object.entries(outputs)) fs.writeFileSync(path.join(OUT, rel), b);
  const provenance = { schema: 'medcoel.provenance.v1', studio: 'spine-mri', generatedAt: new Date().toISOString(), tool: 'apps/studios/tools/prepare-spine-mri.mjs',
    source: { doi: '10.5281/zenodo.10159290', members: { 'images.zip:images/1_t2.mha': EXPECT['1_t2.mha'], 'masks.zip:masks/1_t2.mha': EXPECT['1_t2_mask.mha'] }, licence: 'CC-BY-4.0' },
    outputs: Object.fromEntries(Object.entries(outputs).map(([k, b]) => [k, { bytes: b.length, sha256: sha(b) }])),
    validation: { dims: img.dims, spacingMm: img.spacing, orientation: img.orientation, vertebrae: vert.length, discs: discs.length, orderedCaudalToCranial: true, maskOnSameGrid: true },
    privacy: 'Only image and mask voxels shipped; overview.csv (sex/age/scanner) not shipped.', medicalReview: 'pending' };
  fs.writeFileSync(path.join(OUT, 'provenance.json'), JSON.stringify(provenance, null, 2));
  return provenance;
}
if (process.argv[1] === fileURLToPath(import.meta.url)) { const p = prepare(); console.log(JSON.stringify(p.validation), JSON.stringify(Object.fromEntries(Object.entries(p.outputs).map(([k, v]) => [k, v.bytes])))); }
