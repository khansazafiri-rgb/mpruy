#!/usr/bin/env node
// PRIVATE REVIEW CANDIDATE ONLY. Prepares SRI24 T1 + tissue classes without reading any LPBA40
// archive, label map, LUT or derived material. Not a license/medical/privacy clearance or a public release.
// Operates on already-acquired official archives in gitignored local-data/.
import fs from 'node:fs';
import path from 'node:path';
import zlib from 'node:zlib';
import crypto from 'node:crypto';
import { execFileSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';
import { parseNifti, sameGrid, voxelToWorld, orientation } from '../engines/volume/nifti.js';

const ROOT = fileURLToPath(new URL('../../../', import.meta.url));
const RAW = path.join(ROOT, 'local-data/studio-resources/raw/sri24');
const OUT = path.join(ROOT, 'local-data/studio-resources/build/brain-mri-sri24-tissue-only');
const sha = b => crypto.createHash('sha256').update(b).digest('hex');
const archives = Object.freeze({
  'sri24_anatomy_nifti.zip': 'c2a66abd5bb37ba443b935ef4732a3e3a2f34ca57bedcdac6cf5902b50f013b6',
  'sri24_tissue_nifti.zip': '1375bf8f44a2f6a0704056d87c51ab8dd8d499132d9b06bf9f7e1b6b857673a2',
});
const member = (zip, name) => execFileSync('unzip', ['-p', path.join(RAW, zip), 'sri24/' + name], { maxBuffer: 256 * 1024 * 1024 });
const tissueNames = Object.freeze([
  { id: 1, nameEn: 'Cerebrospinal fluid', rgb: [30, 145, 234], side: 'midline' },
  { id: 2, nameEn: 'Grey matter', rgb: [245, 180, 80], side: 'midline' },
  { id: 3, nameEn: 'White matter', rgb: [233, 83, 127], side: 'midline' },
]);
const CITATION = 'SRI24 atlas: T. Rohlfing, N.M. Zahr, E.V. Sullivan, A. Pfefferbaum, The SRI24 Multichannel Atlas of Normal Adult Human Brain Structure, Human Brain Mapping 31(5):798–819 (2010), doi:10.1002/hbm.20906.';
const LICENSE = 'CC BY-SA 3.0 Unported: https://creativecommons.org/licenses/by-sa/3.0/';

export function prepareTissueOnly() {
  for (const [zip, digest] of Object.entries(archives)) {
    const src = path.join(RAW, zip);
    if (sha(fs.readFileSync(src)) !== digest) throw Error('Official archive digest mismatch: ' + zip);
  }
  // Deliberately do not access the separate labels archive or any third-party atlas materials.
  const rawT1 = member('sri24_anatomy_nifti.zip', 'spgr.nii');
  const rawTissue = member('sri24_tissue_nifti.zip', 'tissues.nii');
  const licenseBytes = member('sri24_anatomy_nifti.zip', 'LICENSE');
  const t1 = parseNifti(rawT1), tissue = parseNifti(rawTissue);
  if (!sameGrid(t1, tissue)) throw Error('Tissue segmentation and MRI grids differ');
  if (t1.data.length !== tissue.data.length) throw Error('Volume length mismatch');
  const dims = t1.dims, [nx, ny, nz] = dims;
  const count = [0, 0, 0, 0], sum = [0, 0, 0, 0], candidate = {};
  for (let k = 0; k < nz; k++) for (let j = 0; j < ny; j++) for (let i = 0; i < nx; i++) {
    const pos = i + nx * (j + ny * k), id = tissue.data[pos];
    if (id === 0) continue;
    if (!Number.isInteger(id) || id < 1 || id > 3) throw Error('Unexpected tissue label: ' + id);
    count[id]++; sum[id] += t1.data[pos];
    // Interior point: all six immediate neighbours share a label. Retain one per class.
    if (!candidate[id] && i > 0 && j > 0 && k > 0 && i + 1 < nx && j + 1 < ny && k + 1 < nz &&
        [pos - 1, pos + 1, pos - nx, pos + nx, pos - nx * ny, pos + nx * ny].every(n => tissue.data[n] === id)) {
      candidate[id] = [i, j, k];
    }
  }
  for (const id of [1, 2, 3]) if (!count[id] || !candidate[id]) throw Error('No validated tissue class/point for ' + id);
  const means = [1, 2, 3].map(id => sum[id] / count[id]);
  if (!(means[0] < means[1] && means[1] < means[2])) throw Error('Unexpected MRI tissue contrast: expected CSF < GM < WM');
  const midlineXmm = (voxelToWorld(t1.affine, [0, 0, 0])[0] + voxelToWorld(t1.affine, [nx - 1, 0, 0])[0]) / 2;
  const guided = [
    { id: 'left-hemisphere', title: 'Orientasi kiri–kanan', text: 'Pada citra MRI, pindahkan crosshair ke belahan kiri pasien dan periksa koordinat RAS.', done: 'Koordinat dan intensitas telah terbaca.' },
    { id: 'sagittal-view', title: 'Ganti bidang irisan', text: 'Pilih Sagital untuk melihat potongan samping otak.', done: 'Irisan sagital aktif.' },
    { id: 'crosshair-sync', title: 'Sinkronisasi irisan', text: 'Kembali ke MPR dan pindahkan crosshair pada dua titik berbeda.', done: 'Ketiga irisan menggunakan titik 3D yang sama.' },
    { id: 'find-structure', title: 'Temukan grey matter', text: 'Gunakan overlay untuk memilih voxel yang diklasifikasikan sebagai grey matter.', done: 'Crosshair mencapai kelas jaringan yang tepat.' },
    { id: 'read-overlay', title: 'Baca overlay jaringan', text: 'Naikkan opasitas label di atas 60% dan pilih salah satu kelas jaringan.', done: 'Label jaringan ditampilkan dari grid MRI yang sama.' },
  ];
  const output = {
    'data/t1.nii.gz': zlib.gzipSync(rawT1, { level: 9, mtime: 0 }),
    'data/labels-tissue.nii.gz': zlib.gzipSync(rawTissue, { level: 9, mtime: 0 }),
    'data/labels-tissue.json': Buffer.from(JSON.stringify({ schema: 'medcoel.labels.v1', source: 'SRI24 tissue segmentation', terminologyReview: 'pending', structures: tissueNames }, null, 2)),
    'data/NOTICE-SRI24.txt': Buffer.from(CITATION + '\n' + LICENSE + '\nAdaptation: NIfTI data gzip-compressed; tissue segmentation is presented as a three-class teaching overlay. Original data may be shared under the applicable CC BY-SA 3.0 conditions. No third-party parcellation labels are included.\n'),
    'data/LICENSE-SRI24.txt': licenseBytes,
    'data/dataset.json': Buffer.from(JSON.stringify({
      schema: 'medcoel.dataset.v1', status: 'PRIVATE_REVIEW', source: 'SRI24 T1 and tissue segmentation (NITRC)',
      notice: 'Private review only. SRI24 CC BY-SA 3.0; tissue classes not clinically reviewed. No permission to publish is implied.',
      image: 'data/t1.nii.gz', labels: 'data/labels-tissue.nii.gz', labelTable: 'data/labels-tissue.json',
      tissues: 'data/labels-tissue.nii.gz', window: [0, 1100], midlineXmm: +midlineXmm.toFixed(2),
      brainThreshold: 150, guidedTarget: 2, guided, statusLine: 'SRI24 T1 + tissue classes (private review only).',
    }, null, 2)),
  };
  const items = tissueNames.map((name, idx) => {
    const point = candidate[name.id], mm = voxelToWorld(t1.affine, point).map(n => +n.toFixed(2));
    // The exact answer is on the server only, never in the client challenge response.
    const options = tissueNames.map(x => x.nameEn);
    return { id: 'sri24-tissue-' + name.id, prompt: { kind: 'crosshair-structure', mm, text: 'Kelas jaringan manakah yang tepat berada di crosshair?' },
      options, answer: { index: idx }, canonical: name.nameEn,
      explanation: 'Jawaban berdasarkan segmentasi jaringan SRI24; klasifikasi ini adalah bahan pendidikan yang masih menunggu review medis.' };
  });
  output['server/challenge.json'] = Buffer.from(JSON.stringify({
    schema: 'medcoel.challenge.v1', studio: 'brain-mri', source: 'SRI24 tissues only',
    medicalReview: 'pending', count: items.length, items,
  }, null, 2));
  fs.rmSync(OUT, { recursive: true, force: true });
  fs.mkdirSync(path.join(OUT, 'data'), { recursive: true });
  fs.mkdirSync(path.join(OUT, 'server'), { recursive: true });
  for (const [rel, bytes] of Object.entries(output)) fs.writeFileSync(path.join(OUT, rel), bytes);
  const provenance = {
    schema: 'medcoel.provenance.v1', studio: 'brain-mri', variant: 'sri24-tissue-only',
    generatedAt: new Date().toISOString(), tool: 'apps/studios/tools/prepare-brain-mri-tissue-only.mjs',
    sources: Object.entries(archives).map(([name, digest]) => ({ name, digest })),
    members: { 'spgr.nii': sha(rawT1), 'tissues.nii': sha(rawTissue), LICENSE: sha(licenseBytes) },
    outputs: Object.fromEntries(Object.entries(output).map(([k, b]) => [k, { bytes: b.length, sha256: sha(b) }])),
    validation: { grid: dims, orientation: orientation(t1.affine), sameGrid: true,
      tissueMeanT1: { csf: Math.round(means[0]), grey: Math.round(means[1]), white: Math.round(means[2]) },
      tissueVoxels: { csf: count[1], grey: count[2], white: count[3] }, thirdPartyParcellation: false },
    rights: 'pending exact-file rights verification', medicalReview: 'pending', privacyReview: 'pending',
  };
  fs.writeFileSync(path.join(OUT, 'provenance.json'), JSON.stringify(provenance, null, 2));
  return provenance;
}

if (process.argv[1] === fileURLToPath(import.meta.url)) {
  const record = prepareTissueOnly();
  console.log(JSON.stringify({ variant: record.variant, outputs: record.outputs, validation: record.validation }, null, 2));
}
