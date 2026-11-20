#!/usr/bin/env node
// TECHNICAL FIXTURE for volume studios: neutral geometric shapes in a valid NIfTI-1 (RAS, 2 mm voxels).
// It is not anatomy and not patient data; every descriptor says so. Used for CI builds and functional tests.
import fs from 'node:fs';
import path from 'node:path';
import zlib from 'node:zlib';

function nifti({ dims, voxelMm, datatype, data }) {
  const header = Buffer.alloc(352);
  header.writeInt32LE(348, 0);
  [3, dims[0], dims[1], dims[2], 1, 1, 1, 1].forEach((d, i) => header.writeInt16LE(d, 40 + 2 * i));
  header.writeInt16LE(datatype, 70); header.writeInt16LE(datatype === 4 ? 16 : 8, 72);
  [1, voxelMm, voxelMm, voxelMm, 1, 1, 1, 1].forEach((p, i) => header.writeFloatLE(p, 76 + 4 * i));
  header.writeFloatLE(352, 108); header.writeFloatLE(1, 112); header.writeUInt8(2, 123); // xyz units mm
  header.writeInt16LE(0, 252); header.writeInt16LE(2, 254); // sform aligned
  const off = dims.map(d => -(d - 1) * voxelMm / 2);
  [[voxelMm, 0, 0, off[0]], [0, voxelMm, 0, off[1]], [0, 0, voxelMm, off[2]]].forEach((row, r) => row.forEach((v, c) => header.writeFloatLE(v, 280 + r * 16 + c * 4)));
  header.write('n+1\0', 344, 'latin1');
  return Buffer.concat([header, Buffer.from(data.buffer, data.byteOffset, data.byteLength)]);
}

export function makeVolumeFixture(outDir, { studioId, title = 'Technical fixture', size = 64, voxelMm = 2 } = {}) {
  const dims = [size, size, size], n = size ** 3, img = new Int16Array(n), lab = new Uint8Array(n), c = (size - 1) / 2;
  for (let k = 0; k < size; k++) for (let j = 0; j < size; j++) for (let i = 0; i < size; i++) {
    const idx = i + size * (j + size * k), r = Math.hypot((i - c) / (size * 0.42), (j - c) / (size * 0.38), (k - c) / (size * 0.34));
    img[idx] = r < 1 ? 300 + Math.round(200 * (1 - r)) : 0;
    if (r < 1 && k > c - 6 && k < c + 6 && j > c - 8 && j < c + 8) lab[idx] = i < c - 4 && i > c - 20 ? 1 : i > c + 4 && i < c + 20 ? 2 : 0;
  }
  fs.mkdirSync(path.join(outDir, 'data'), { recursive: true }); fs.mkdirSync(path.join(outDir, 'server'), { recursive: true });
  const gz = b => zlib.gzipSync(b, { mtime: 0 });
  fs.writeFileSync(path.join(outDir, 'data/t1.nii.gz'), gz(nifti({ dims, voxelMm, datatype: 4, data: img })));
  fs.writeFileSync(path.join(outDir, 'data/labels-lpba40.nii.gz'), gz(nifti({ dims, voxelMm, datatype: 2, data: lab })));
  const structures = [{ id: 1, source: 'FIXTURE_left_block', nameEn: 'Fixture block A (left)', side: 'left', rgb: [230, 120, 40] }, { id: 2, source: 'FIXTURE_right_block', nameEn: 'Fixture block B (right)', side: 'right', rgb: [40, 160, 230] }];
  fs.writeFileSync(path.join(outDir, 'data/labels.json'), JSON.stringify({ schema: 'medcoel.labels.v1', source: 'technical fixture', terminologyReview: 'not-applicable', structures }));
  const mmOf = i => (i - c) * voxelMm;
  fs.writeFileSync(path.join(outDir, 'data/dataset.json'), JSON.stringify({
    schema: 'medcoel.dataset.v1', status: 'TECHNICAL_FIXTURE', source: 'MEDCOEL synthetic geometry (no anatomy, no patient data)',
    notice: 'FIXTURE TEKNIS: bentuk geometris sintetis untuk pengujian ' + title + '. Bukan anatomi, bukan data pasien.',
    image: 'data/t1.nii.gz', labels: 'data/labels-lpba40.nii.gz', labelTable: 'data/labels.json', window: [0, 600], midlineXmm: 0, brainThreshold: 100, guidedTarget: 1,
    guided: [
      { id: 'left-hemisphere', title: 'Orientasi kiri–kanan', text: 'Klik satu titik di sisi kiri (huruf L) objek fixture.' },
      { id: 'sagittal-view', title: 'Ganti bidang irisan', text: 'Pilih tombol Sagital.' },
      { id: 'crosshair-sync', title: 'Crosshair lintas bidang', text: 'Kembali ke MPR lalu klik dua titik berbeda.' },
      { id: 'find-structure', title: 'Temukan blok', text: 'Letakkan crosshair di "Fixture block A (left)".' },
      { id: 'read-overlay', title: 'Baca overlay', text: 'Naikkan opasitas overlay ke 60% atau lebih dan letakkan crosshair di blok berlabel.' },
    ] }, null, 1));
  fs.writeFileSync(path.join(outDir, 'server/challenge.json'), JSON.stringify({ schema: 'medcoel.challenge.v1', studio: studioId, source: 'technical fixture', count: 2, items: [
    { id: 'fixture-1', prompt: { kind: 'crosshair-structure', mm: [mmOf(c - 12), 0, 0], text: 'Blok apa yang berada di crosshair? (fixture teknis)' }, options: ['Fixture block A (left)', 'Fixture block B (right)'], answer: { index: 0 }, canonical: 'Fixture block A (left)', explanation: 'Fixture teknis: blok A berada di sisi kiri (x negatif dalam RAS).' },
    { id: 'fixture-2', prompt: { kind: 'crosshair-structure', mm: [mmOf(c + 12), 0, 0], text: 'Blok apa yang berada di crosshair? (fixture teknis)' }, options: ['Fixture block A (left)', 'Fixture block B (right)'], answer: { index: 1 }, canonical: 'Fixture block B (right)', explanation: 'Fixture teknis: blok B berada di sisi kanan (x positif dalam RAS).' },
  ] }));
  fs.writeFileSync(path.join(outDir, 'data/NOTICE-FIXTURE.txt'), 'MEDCOEL technical fixture. Original synthetic geometry, MIT. Not anatomy, not patient data.\n');
}
