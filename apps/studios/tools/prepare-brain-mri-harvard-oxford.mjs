#!/usr/bin/env node
// Harvard–Oxford atlas: private-review candidate only.
// Uses owner-provided, SHA-256-pinned, licensed input files; NO FSL software, download or
// automatic resampling. A co-registered underlay is REQUIRED; mismatched MNI/SRI24 grids fail.
// This generator cannot approve data, rights, clinical questions, or release a studio.
import fs from 'node:fs';
import path from 'node:path';
import zlib from 'node:zlib';
import crypto from 'node:crypto';
import { fileURLToPath } from 'node:url';
import { parseNifti, sameGrid, voxelToWorld, orientation } from '../engines/volume/nifti.js';

const REPO = fileURLToPath(new URL('../../../', import.meta.url));
const RAW = path.join(REPO, 'local-data/studio-resources/raw/harvard-oxford');
const OUT = path.join(REPO, 'local-data/studio-resources/build/brain-mri-harvard-oxford');
const sha = b => crypto.createHash('sha256').update(b).digest('hex');
const isHash = s => /^[a-f0-9]{64}$/.test(s || '');
const fileNames = Object.freeze(['underlay.nii.gz', 'atlas.nii.gz', 'atlas.xml']);

export function parseAtlasXml(xml) {
  if (typeof xml !== 'string' || !xml.includes('<atlas')) throw Error('HARVARD_OXFORD_XML_INVALID');
  const labels = [], seen = new Set();
  for (const match of xml.matchAll(/<label\b([^>]*)>([^<]+)<\/label>/gi)) {
    const index = /\bindex\s*=\s*["'](\d+)["']/i.exec(match[1]);
    if (!index) throw Error('HARVARD_OXFORD_XML_INDEX_MISSING');
    // FSL maxprob labels: zero-based XML index; voxel value is index+1 (0=background).
    const id = Number(index[1]) + 1;
    if (!Number.isSafeInteger(id) || id < 1 || id > 65535 || seen.has(id)) throw Error('HARVARD_OXFORD_LABEL_DUPLICATE_OR_RANGE');
    seen.add(id);
    const nameEn = match[2].replace(/&amp;/g, '&').replace(/&lt;/g, '<').replace(/&gt;/g, '>').replace(/&quot;/g, '"').replace(/&#39;/g, "'").trim();
    if (!nameEn || nameEn.includes('&') && /&(?:#|[a-z]+;)/i.test(nameEn)) throw Error('HARVARD_OXFORD_LABEL_UNSAFE');
    labels.push({ id, nameEn, source: 'HarvardOxford XML index ' + index[1], side: 'unreviewed', rgb: [100 + (id * 47 % 145), 90 + (id * 79 % 150), 95 + (id * 31 % 150)] });
  }
  if (!labels.length) throw Error('HARVARD_OXFORD_NO_LABELS');
  return labels.sort((a, b) => a.id - b.id);
}

function nifti3D(buf) {
  const b = buf instanceof Uint8Array ? buf : new Uint8Array(buf);
  const dv = new DataView(b.buffer, b.byteOffset, b.byteLength);
  if (b.length < 352 || dv.getInt32(0, true) !== 348 || dv.getInt16(40, true) !== 3 || dv.getInt16(50, true) !== 1) {
    throw Error('HARVARD_OXFORD_REQUIRE_3D_NIFTI1');
  }
  return parseNifti(b);
}

export function validateAlignedVolumes(underlayBytes, atlasBytes, xml) {
  const underlay = nifti3D(underlayBytes), labels = nifti3D(atlasBytes);
  if (!sameGrid(underlay, labels, 1e-4)) throw Error('HARVARD_OXFORD_GRID_MISMATCH: never overlay MNI152 labels on SRI24 without reviewed registration');
  if (underlay.data.length !== labels.data.length) throw Error('HARVARD_OXFORD_ARRAY_LENGTH_MISMATCH');
  const definitions = parseAtlasXml(xml), byId = new Map(definitions.map(v => [v.id, v]));
  const [nx, ny, nz] = labels.dims, points = new Map();
  const nxy = nx * ny;
  let present = new Set(), min = Infinity, max = -Infinity;
  for (let k = 0; k < nz; k++) for (let j = 0; j < ny; j++) for (let i = 0; i < nx; i++) {
    const index = i + nx * (j + ny * k), id = labels.data[index];
    if (!Number.isInteger(id) || id < 0 || (id !== 0 && !byId.has(id))) throw Error('HARVARD_OXFORD_LABEL_WITHOUT_XML:' + id);
    if (id) {
      present.add(id);
      // Only 6-connected interior voxels can become anatomical question points.
      if (!points.has(id) && i > 0 && i + 1 < nx && j > 0 && j + 1 < ny && k > 0 && k + 1 < nz &&
        [index - 1, index + 1, index - nx, index + nx, index - nxy, index + nxy].every(v => labels.data[v] === id)) {
        points.set(id, voxelToWorld(labels.affine, [i, j, k]).map(v => +v.toFixed(2)));
      }
    }
    const val = underlay.data[index];
    if (!Number.isFinite(val)) throw Error('HARVARD_OXFORD_UNDERLAY_NONFINITE');
    min = Math.min(min, val); max = Math.max(max, val);
  }
  if (present.size < 4 || points.size < 4) throw Error('HARVARD_OXFORD_INSUFFICIENT_REVIEWABLE_REGIONS');
  if (min === max) throw Error('HARVARD_OXFORD_UNDERLAY_BLANK');
  return {
    underlay, labels, definitions: definitions.filter(v => present.has(v.id)),
    points, labelCount: present.size,
    window: [Math.floor(min), Math.ceil(max)],
    midlineXmm: +(voxelToWorld(underlay.affine, [0, 0, 0])[0] + voxelToWorld(underlay.affine, [nx - 1, 0, 0])[0]).toFixed(2) / 2,
    orientation: orientation(underlay.affine),
  };
}

function readPinned(name, expected) {
  if (!fileNames.includes(name) || !isHash(expected)) throw Error('HARVARD_OXFORD_UNPINNED_INPUT');
  const p = path.join(RAW, name);
  if (!fs.existsSync(p) || !fs.statSync(p).isFile() || fs.statSync(p).size > 512 * 1024 * 1024) throw Error('HARVARD_OXFORD_INPUT_UNAVAILABLE_OR_TOO_LARGE:' + name);
  const bytes = fs.readFileSync(p);
  if (sha(bytes) !== expected) throw Error('HARVARD_OXFORD_DIGEST_MISMATCH:' + name);
  return bytes;
}

export function prepareHarvardOxford() {
  // This file must be assembled from actual downloads/evidence; no preset hashes or fake provenance.
  const manifestPath = path.join(RAW, 'source-manifest.json');
  if (!fs.existsSync(manifestPath)) throw Error('HARVARD_OXFORD_MISSING_SOURCE_MANIFEST');
  const manifest = JSON.parse(fs.readFileSync(manifestPath, 'utf8'));
  if (manifest.schema !== 'medcoel.harvard-oxford-inputs.v1' || manifest.atlas?.licenseId !== 'CC-BY-SA-4.0' ||
      !manifest.atlas.licenseEvidenceUrl?.startsWith('https://fsl.fmrib.ox.ac.uk/fsl/docs/license.html') ||
      !manifest.underlay?.sourceUrl?.startsWith('https://') || !manifest.underlay?.licenseId ||
      manifest.underlay.licenseId.includes('NC') || manifest.underlay.licenseId.includes('ND') ||
      fileNames.some(name => !isHash(manifest.files?.[name]))) {
    throw Error('HARVARD_OXFORD_INCOMPLETE_RIGHTS_EVIDENCE: verify actual underlay source and permission first');
  }
  const input = Object.fromEntries(fileNames.map(name => [name, readPinned(name, manifest.files[name])]));
  const unz = b => zlib.gunzipSync(b);
  const out = validateAlignedVolumes(unz(input['underlay.nii.gz']), unz(input['atlas.nii.gz']), input['atlas.xml'].toString('utf8'));
  const selections = [...out.points.entries()].sort((a, b) => a[0] - b[0]).slice(0, 10);
  const byId = new Map(out.definitions.map(x => [x.id, x]));
  const choices = selections.map(([id]) => byId.get(id));
  const items = choices.map((s, index) => {
    const ordered = choices.slice(index).concat(choices.slice(0, index));
    return { id: 'harvard-oxford-' + s.id,
      prompt: { kind: 'crosshair-structure', mm: out.points.get(s.id), text: 'Which Harvard–Oxford region is under the crosshair?' },
      options: ordered.slice(0, 4).map(x => x.nameEn), answer: { index: ordered.slice(0, 4).findIndex(x => x.id === s.id) },
      canonical: s.nameEn,
      explanation: 'Private review only. Harvard–Oxford structural atlas labels require medical/terminology review and are not patient diagnoses.' };
  });
  if (items.some(it => it.answer.index < 0)) throw Error('HARVARD_OXFORD_QUESTION_KEY_INVALID');
  const target = choices[0];
  const outputs = {
    'data/t1.nii.gz': input['underlay.nii.gz'],
    'data/labels-harvard-oxford.nii.gz': input['atlas.nii.gz'],
    'data/labels-harvard-oxford.json': Buffer.from(JSON.stringify({
      schema: 'medcoel.labels.v1', source: 'Harvard–Oxford structural atlas (exact source manifest required)',
      terminologyReview: 'pending', structures: out.definitions,
    }, null, 2)),
    'data/dataset.json': Buffer.from(JSON.stringify({
      schema: 'medcoel.dataset.v1', status: 'PRIVATE_REVIEW', source: 'Harvard–Oxford structural atlas (CC BY-SA 4.0, source-level only)',
      notice: 'Private reviewer preview. Region labels and MRI underlay are not approved; this is not an SRI24/LPBA40 atlas.',
      image: 'data/t1.nii.gz', labels: 'data/labels-harvard-oxford.nii.gz', labelTable: 'data/labels-harvard-oxford.json',
      window: out.window, midlineXmm: out.midlineXmm, brainThreshold: out.window[0],
      guidedTarget: target.id, guided: [
        { id: 'left-hemisphere', title: 'Orientasi pasien', text: 'Pindahkan crosshair ke belahan kiri pasien dan periksa koordinat RAS.' },
        { id: 'sagittal-view', title: 'Bidang sagital', text: 'Aktifkan bidang Sagital.' },
        { id: 'crosshair-sync', title: 'Sinkronisasi MPR', text: 'Kembali ke MPR dan klik dua titik berbeda.' },
        { id: 'find-structure', title: 'Identifikasi struktur atlas', text: 'Temukan struktur ' + target.nameEn + ' di overlay.' },
        { id: 'read-overlay', title: 'Tampilkan overlay', text: 'Naikkan opasitas di atas 60% dan pilih struktur atlas.' },
      ],
    }, null, 2)),
    'server/challenge.json': Buffer.from(JSON.stringify({
      schema: 'medcoel.challenge.v1', studio: 'brain-mri', source: 'Harvard–Oxford Atlas',
      medicalReview: 'pending', count: items.length, items,
    }, null, 2)),
    'data/NOTICE-HARVARD-OXFORD.txt': Buffer.from('Harvard–Oxford Atlas data: CC BY-SA 4.0 (subject to exact-source rights review). https://fsl.fmrib.ox.ac.uk/fsl/docs/license.html\nAdaptations: NIfTI overlays and region table used in a separate MEDCOEL viewer. The independently sourced T1 underlay retains its own license and attribution; see private source-manifest. THIS IS NOT A RELEASE CLEARANCE.\n'),
  };
  // Validate before touching the old candidate output.
  fs.rmSync(OUT, { recursive: true, force: true });
  fs.mkdirSync(path.join(OUT, 'data'), { recursive: true });
  fs.mkdirSync(path.join(OUT, 'server'), { recursive: true });
  for (const [name, bytes] of Object.entries(outputs)) fs.writeFileSync(path.join(OUT, name), bytes);
  const provenance = {
    schema: 'medcoel.provenance.v1', studio: 'brain-mri', variant: 'harvard-oxford-private',
    tool: 'apps/studios/tools/prepare-brain-mri-harvard-oxford.mjs',
    sources: manifest, inputSha256: manifest.files,
    outputSha256: Object.fromEntries(Object.entries(outputs).map(([k, v]) => [k, sha(v)])),
    validation: { grid: out.underlay.dims, affine: out.underlay.affine, orientation: out.orientation, regions: out.labelCount,
      alignedWithoutResampling: true, thirdPartyLPBA40: false },
    rights: 'needs independent human exact-file clearance', medicalReview: 'pending', privacyReview: 'pending',
  };
  fs.writeFileSync(path.join(OUT, 'provenance.json'), JSON.stringify(provenance, null, 2));
  return provenance;
}
if (process.argv[1] === fileURLToPath(import.meta.url)) console.log(JSON.stringify(prepareHarvardOxford(), null, 2));
