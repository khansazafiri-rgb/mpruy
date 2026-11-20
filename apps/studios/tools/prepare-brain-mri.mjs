#!/usr/bin/env node
// Brain MRI data preparation from the OFFICIAL SRI24 archives (NITRC, CC BY-SA 3.0 Unported).
// Reads the private raw subset in local-data/ (never committed), verifies archive digests, validates grid/affine,
// laterality and tissue contrast, and writes the studio data set + provenance + challenge key to
// local-data/studio-resources/build/brain-mri/ . Voxel values are not modified (gzip only); tables are re-expressed as JSON.
import fs from 'node:fs';
import path from 'node:path';
import zlib from 'node:zlib';
import crypto from 'node:crypto';
import { execFileSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';
import { parseNifti, voxelToWorld, sameGrid, orientation } from '../engines/volume/nifti.js';

const REPO = fileURLToPath(new URL('../../../', import.meta.url));
const RAW = path.join(REPO, 'local-data/studio-resources/raw/sri24');
const OUT = path.join(REPO, 'local-data/studio-resources/build/brain-mri');
const sha = b => crypto.createHash('sha256').update(b).digest('hex');
const ARCHIVES = {
  'sri24_anatomy_nifti.zip': { url: 'https://www.nitrc.org/frs/download.php/4499/sri24_anatomy_nifti.zip', sha256: 'c2a66abd5bb37ba443b935ef4732a3e3a2f34ca57bedcdac6cf5902b50f013b6' },
  'sri24_labels_nifti.zip': { url: 'https://www.nitrc.org/frs/download.php/4508/sri24_labels_nifti.zip', sha256: 'ed47fde305baefb687a38e0daa8527896480e4e0159a0a0f56c8cbe09fc97e1f' },
  'sri24_tissue_nifti.zip': { url: 'https://www.nitrc.org/frs/download.php/4511/sri24_tissue_nifti.zip', sha256: '1375bf8f44a2f6a0704056d87c51ab8dd8d499132d9b06bf9f7e1b6b857673a2' },
};
const ATTRIBUTION = 'SRI24 atlas: T. Rohlfing, N.M. Zahr, E.V. Sullivan, A. Pfefferbaum, "The SRI24 Multichannel Atlas of Normal Adult Human Brain Structure," Human Brain Mapping 31(5):798-819, 2010, doi:10.1002/hbm.20906. Licensed under CC BY-SA 3.0 Unported (https://creativecommons.org/licenses/by-sa/3.0/).';

function member(zip, name) { return execFileSync('unzip', ['-p', path.join(RAW, zip), 'sri24/' + name], { maxBuffer: 256 * 1024 * 1024 }); }

export function prepare() {
  for (const [zip, meta] of Object.entries(ARCHIVES)) {
    const got = sha(fs.readFileSync(path.join(RAW, zip)));
    if (got !== meta.sha256) throw Error('Archive digest mismatch: ' + zip);
  }
  const files = { t1: member('sri24_anatomy_nifti.zip', 'spgr.nii'), labels: member('sri24_labels_nifti.zip', 'lpba40.nii'),
    tissues: member('sri24_tissue_nifti.zip', 'tissues.nii'), lut: member('sri24_labels_nifti.zip', 'LPBA40-labels.txt'), licence: member('sri24_anatomy_nifti.zip', 'LICENSE') };
  const t1 = parseNifti(files.t1), lab = parseNifti(files.labels), tis = parseNifti(files.tissues);
  // ---- validation (fails closed) ----
  if (!sameGrid(t1, lab) || !sameGrid(t1, tis)) throw Error('Overlay grid/affine differs from the T1 volume');
  const [X, Y, Z] = t1.dims;
  const names = {};
  for (const line of files.lut.toString('utf8').trim().split(/\r?\n/)) {
    const m = line.match(/^(\d+)\s+"([^"]+)"\s+(\d+)\s+(\d+)\s+(\d+)/);
    if (m) names[Number(m[1])] = { source: m[2], rgb: [Number(m[3]), Number(m[4]), Number(m[5])] };
  }
  const acc = {}, tissueSum = {}, tissueCount = {};
  let midSum = 0, midN = 0;
  for (let k = 0; k < Z; k++) for (let j = 0; j < Y; j++) for (let i = 0; i < X; i++) {
    const n = i + X * (j + Y * k), l = lab.data[n], t = tis.data[n];
    if (l) { const a = (acc[l] = acc[l] || { n: 0, i: 0, j: 0, k: 0 }); a.n++; a.i += i; a.j += j; a.k += k; midSum += i; midN++; }
    if (t) { tissueSum[t] = (tissueSum[t] || 0) + t1.data[n]; tissueCount[t] = (tissueCount[t] || 0) + 1; }
  }
  const midline = voxelToWorld(t1.affine, [midSum / midN, 0, 0])[0];
  const structures = [], lateralityErrors = [];
  for (const id of Object.keys(acc).map(Number).sort((a, b) => a - b)) {
    const meta = names[id];
    if (!meta) throw Error('Label ' + id + ' missing from LPBA40 table');
    const a = acc[id], c = [a.i / a.n, a.j / a.n, a.k / a.n], w = voxelToWorld(t1.affine, c);
    const side = /^L_/.test(meta.source) ? 'left' : /^R_/.test(meta.source) ? 'right' : 'midline';
    const observed = w[0] < midline ? 'left' : 'right'; // RAS+: patient left has the smaller x
    if (side !== 'midline' && side !== observed) lateralityErrors.push(meta.source);
    structures.push({ id, source: meta.source, nameEn: englishName(meta.source), side, rgb: meta.rgb, voxels: a.n, centroidMm: w.map(v => +v.toFixed(1)), interior: interiorPoint(lab, id, c) });
  }
  if (lateralityErrors.length) throw Error('Laterality mismatch: ' + lateralityErrors.join(', '));
  const means = [1, 2, 3].map(t => tissueSum[t] / tissueCount[t]);
  if (!(means[0] < means[1] && means[1] < means[2])) throw Error('Tissue codes do not follow T1 contrast (CSF < GM < WM)');
  // ---- outputs ----
  fs.rmSync(OUT, { recursive: true, force: true });
  fs.mkdirSync(path.join(OUT, 'data'), { recursive: true }); fs.mkdirSync(path.join(OUT, 'server'), { recursive: true });
  const gz = b => zlib.gzipSync(b, { level: 9, mtime: 0 });
  const outputs = { 'data/t1.nii.gz': gz(files.t1), 'data/labels-lpba40.nii.gz': gz(files.labels), 'data/tissues.nii.gz': gz(files.tissues) };
  const labelTable = { schema: 'medcoel.labels.v1', source: 'SRI24 LPBA40 label table (LPBA40-labels.txt)', terminologyReview: 'pending',
    note: 'nameEn is a mechanical rewrite of the source label; Indonesian/Latin terms are not provided until reviewed.',
    tissues: { 1: 'CSF', 2: 'Grey matter', 3: 'White matter' },
    structures: structures.map(({ id, source, nameEn, side, rgb }) => ({ id, source, nameEn, side, rgb })) };
  outputs['data/labels.json'] = Buffer.from(JSON.stringify(labelTable, null, 1));
  outputs['data/NOTICE-SRI24.txt'] = Buffer.from(ATTRIBUTION + '\n\nChanges by MEDCOEL: NIfTI files gzip-compressed without voxel or header changes; the LPBA40 label table re-expressed as JSON with a mechanically rewritten English name. These adapted files are shared under CC BY-SA 3.0 Unported.\n\nLPBA40 and tissue labels are distributed by the SRI24 authors as part of the SRI24 package; upstream LPBA40 (LONI) provenance is pending legal review in MEDCOEL.\n\nFull licence text: LICENSE-SRI24.txt\n');
  outputs['data/LICENSE-SRI24.txt'] = files.licence;
  const target = structures.find(x => x.source === 'L_precentral_gyrus');
  outputs['data/dataset.json'] = Buffer.from(JSON.stringify(datasetDescriptor({ midline, target }), null, 1));
  outputs['server/challenge.json'] = Buffer.from(JSON.stringify(challengeKey(structures), null, 1));
  for (const [rel, bytes] of Object.entries(outputs)) fs.writeFileSync(path.join(OUT, rel), bytes);
  const provenance = { schema: 'medcoel.provenance.v1', studio: 'brain-mri', generatedAt: new Date().toISOString(), tool: 'apps/studios/tools/prepare-brain-mri.mjs',
    sources: Object.entries(ARCHIVES).map(([name, m]) => ({ name, ...m })),
    members: { 'spgr.nii': sha(files.t1), 'lpba40.nii': sha(files.labels), 'tissues.nii': sha(files.tissues), 'LPBA40-labels.txt': sha(files.lut), LICENSE: sha(files.licence) },
    outputs: Object.fromEntries(Object.entries(outputs).map(([k, b]) => [k, { bytes: b.length, sha256: sha(b) }])),
    validation: { grid: t1.dims, voxelMm: t1.pixdim, orientation: orientation(t1.affine), affine: t1.affine, overlaysOnSameGrid: true,
      lateralityChecked: structures.filter(s => s.side !== 'midline').length, lateralityErrors: 0, midlineXmm: +midline.toFixed(1),
      tissueMeanT1: { csf: Math.round(means[0]), grey: Math.round(means[1]), white: Math.round(means[2]) } },
    licence: 'CC-BY-SA-3.0', medicalReview: 'pending', privacyReview: 'not applicable to a population template (to be confirmed by reviewer)' };
  fs.writeFileSync(path.join(OUT, 'provenance.json'), JSON.stringify(provenance, null, 2));
  return provenance;
}

/** What the studio needs to load and teach with this dataset (no answers: Challenge keys stay in server/). */
export function datasetDescriptor({ midline, target }) {
  return {
    schema: 'medcoel.dataset.v1', status: 'PRIVATE_REVIEW', source: 'SRI24 (NITRC), CC BY-SA 3.0',
    notice: 'Data: atlas SRI24 (template populasi dewasa normal, bukan pasien) © Rohlfing dkk., CC BY-SA 3.0. Label LPBA40 dan review medis belum selesai: hanya untuk review privat.',
    image: 'data/t1.nii.gz', labels: 'data/labels-lpba40.nii.gz', labelTable: 'data/labels.json', tissues: 'data/tissues.nii.gz',
    window: [0, 1100], midlineXmm: +midline.toFixed(1), brainThreshold: 150, guidedTarget: target.id,
    guided: [
      { id: 'left-hemisphere', title: 'Orientasi kiri–kanan', text: 'Tampilan memakai konvensi neurologis: sisi kiri pasien di kiri layar (huruf L). Klik satu titik di belahan otak KIRI pasien.', done: 'Koordinat x di bawah garis tengah = sisi kiri pasien (ruang RAS).' },
      { id: 'sagittal-view', title: 'Ganti bidang irisan', text: 'Pilih tombol Sagital untuk melihat irisan sagital saja.', done: 'Bidang sagital membelah kiri dan kanan.' },
      { id: 'crosshair-sync', title: 'Crosshair lintas bidang', text: 'Kembali ke MPR, lalu klik dua titik berbeda di irisan mana pun. Perhatikan dua irisan lain ikut berpindah ke titik yang sama.', done: 'Ketiga bidang berbagi satu titik 3D.' },
      { id: 'find-structure', title: 'Kenali struktur', text: 'Letakkan crosshair di dalam "' + target.nameEn + '" (label atlas ' + target.source + '). Gunakan overlay warna sebagai bantuan.', done: 'Nama struktur dibaca dari label atlas pada titik yang sama.' },
      { id: 'read-overlay', title: 'Baca overlay label', text: 'Naikkan opasitas overlay label hingga minimal 60%, lalu letakkan crosshair di struktur berlabel dan baca namanya di panel.', done: 'Overlay dan citra berada di grid dan affine yang sama, jadi label tepat menempel pada citra.' },
    ],
  };
}

function englishName(src) {
  const side = /^L_/.test(src) ? 'Left ' : /^R_/.test(src) ? 'Right ' : '';
  return side + src.replace(/^[LR]_/, '').replace(/_/g, ' ');
}

/** A voxel well inside the label (all 26 neighbours at distance 2 share the label), nearest to its centroid. */
function interiorPoint(vol, id, c) {
  const [X, Y, Z] = vol.dims, at = (i, j, k) => (i < 0 || j < 0 || k < 0 || i >= X || j >= Y || k >= Z) ? -1 : vol.data[i + X * (j + Y * k)];
  let best = null, bestD = Infinity;
  const r = 2;
  for (let k = 0; k < Z; k++) for (let j = 0; j < Y; j++) for (let i = 0; i < X; i++) {
    if (vol.data[i + X * (j + Y * k)] !== id) continue;
    const d = (i - c[0]) ** 2 + (j - c[1]) ** 2 + (k - c[2]) ** 2;
    if (d >= bestD) continue;
    let ok = true;
    for (let dk = -r; dk <= r && ok; dk += r) for (let dj = -r; dj <= r && ok; dj += r) for (let di = -r; di <= r && ok; di += r) if (at(i + di, j + dj, k + dk) !== id) ok = false;
    if (ok) { best = [i, j, k]; bestD = d; }
  }
  if (!best) throw Error('No interior point for label ' + id);
  return { voxel: best, mm: voxelToWorld(vol.affine, best).map(v => +v.toFixed(2)) };
}

/** Challenge items: crosshair placed inside a structure, four names (one correct). Kept server-side only. */
function challengeKey(structures) {
  const lateral = structures.filter(s => s.side !== 'midline');
  const items = lateral.map((s, n) => {
    // Distractors: same side (laterality is not what is being tested), different structures, deterministic choice.
    const pool = lateral.filter(o => o.side === s.side && o.id !== s.id);
    const distract = [pool[(n * 7 + 1) % pool.length], pool[(n * 11 + 3) % pool.length], pool[(n * 13 + 5) % pool.length]].filter((v, i, a) => a.indexOf(v) === i);
    while (distract.length < 3) distract.push(pool.find(o => !distract.includes(o)));
    const options = [s, ...distract];
    const rot = n % 4, ordered = options.slice(rot).concat(options.slice(0, rot));
    return { id: 'sri24-lpba40-' + s.id, prompt: { kind: 'crosshair-structure', mm: s.interior.mm, text: 'Struktur apa yang berada tepat di crosshair?' },
      options: ordered.map(o => o.nameEn), answer: { index: ordered.indexOf(s) }, canonical: s.nameEn,
      explanation: 'Crosshair berada di dalam label LPBA40 "' + s.source + '" pada atlas SRI24 (template populasi dewasa normal, bukan pasien). Batas label atlas adalah perkiraan probabilistik; review anatomi belum selesai.' };
  });
  return { schema: 'medcoel.challenge.v1', studio: 'brain-mri', source: 'SRI24 LPBA40', medicalReview: 'pending', count: 10, items };
}

if (process.argv[1] === fileURLToPath(import.meta.url)) {
  const p = prepare();
  console.log(JSON.stringify({ outputs: p.outputs, validation: p.validation }, null, 1));
}
