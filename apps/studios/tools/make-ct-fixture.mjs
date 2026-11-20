#!/usr/bin/env node
// TECHNICAL FIXTURE for CT studios: synthetic HU volume (air, soft tissue cylinder, low-density "lung" regions and a
// soft-tissue sphere) plus two synthetic "annotation" masks. Not a scan of any person; not anatomy.
import fs from 'node:fs';
import path from 'node:path';
import zlib from 'node:zlib';
function nifti(dims, mm, datatype, data) {
  const h = Buffer.alloc(352); h.writeInt32LE(348, 0); [3, ...dims, 1, 1, 1, 1].forEach((d, i) => h.writeInt16LE(d, 40 + 2 * i));
  h.writeInt16LE(datatype, 70); h.writeInt16LE(datatype === 4 ? 16 : 8, 72); [1, ...mm, 1, 1, 1, 1].forEach((p, i) => h.writeFloatLE(p, 76 + 4 * i));
  h.writeFloatLE(352, 108); h.writeFloatLE(1, 112); h.writeUInt8(2, 123); h.writeInt16LE(1, 254);
  const off = dims.map((d, i) => -(d - 1) * mm[i] / 2); [[mm[0], 0, 0, off[0]], [0, mm[1], 0, off[1]], [0, 0, mm[2], off[2]]].forEach((r, ri) => r.forEach((v, c) => h.writeFloatLE(v, 280 + ri * 16 + c * 4)));
  h.write('n+1\0', 344, 'latin1'); return Buffer.concat([h, Buffer.from(data.buffer, data.byteOffset, data.byteLength)]);
}
export function makeCtFixture(outDir) {
  const D = [96, 96, 48], mm = [3, 3, 5], n = D[0] * D[1] * D[2], hu = new Int16Array(n), bits = new Uint8Array(n), c = D.map(d => (d - 1) / 2);
  for (let k = 0; k < D[2]; k++) for (let j = 0; j < D[1]; j++) for (let i = 0; i < D[0]; i++) {
    const idx = i + D[0] * (j + D[1] * k), r = Math.hypot((i - c[0]) / 40, (j - c[1]) / 32);
    let v = r < 1 ? 40 : -1000;
    if (r < 0.9 && Math.abs(i - c[0]) > 8 && Math.abs(i - c[0]) < 34) v = -850;
    const s = Math.hypot((i - (c[0] + 20)) * mm[0], (j - c[1]) * mm[1], (k - c[2]) * mm[2]);
    if (s < 12) { v = 30; bits[idx] |= 1; } if (s < 10) bits[idx] |= 2;
    hu[idx] = v;
  }
  fs.mkdirSync(path.join(outDir, 'data'), { recursive: true }); fs.mkdirSync(path.join(outDir, 'server'), { recursive: true });
  fs.writeFileSync(path.join(outDir, 'data/ct.nii.gz'), zlib.gzipSync(nifti(D, mm, 4, hu), { mtime: 0 }));
  fs.writeFileSync(path.join(outDir, 'data/readers.nii.gz'), zlib.gzipSync(nifti(D, mm, 2, bits), { mtime: 0 }));
  const noduleMm = [20 * mm[0], 0, 0];
  fs.writeFileSync(path.join(outDir, 'data/annotations.json'), JSON.stringify({ schema: 'medcoel.ct-annotations.v1', source: 'technical fixture', readers: [{ bit: 1, label: 'Anotasi 1' }, { bit: 2, label: 'Anotasi 2' }] }));
  fs.writeFileSync(path.join(outDir, 'data/dataset.json'), JSON.stringify({ schema: 'medcoel.dataset.v1', status: 'TECHNICAL_FIXTURE', source: 'MEDCOEL synthetic HU volume', notice: 'FIXTURE TEKNIS: volume HU sintetis dengan bola jaringan lunak dan dua "anotasi" sintetis. Bukan CT pasien.',
    image: 'data/ct.nii.gz', readers: 'data/readers.nii.gz', annotations: 'data/annotations.json', presets: { lung: [-1350, 150], mediastinum: [-160, 240], bone: [-450, 1050] }, noduleMm }));
  fs.writeFileSync(path.join(outDir, 'server/challenge.json'), JSON.stringify({ schema: 'medcoel.challenge.v1', source: 'technical fixture', count: 2, items: [
    { id: 'ct-in', prompt: { kind: 'crosshair-structure', mm: noduleMm, text: 'Di dalam bola sintetis? (fixture)' }, options: ['Ya', 'Tidak'], answer: { index: 0 }, canonical: 'Ya', explanation: 'Fixture teknis.' },
    { id: 'ct-out', prompt: { kind: 'crosshair-structure', mm: [-20 * mm[0], 0, 0], text: 'Di dalam bola sintetis? (fixture)' }, options: ['Ya', 'Tidak'], answer: { index: 1 }, canonical: 'Tidak', explanation: 'Fixture teknis.' }] }));
  fs.writeFileSync(path.join(outDir, 'data/NOTICE-FIXTURE.txt'), 'MEDCOEL technical fixture: synthetic HU volume, MIT. Not a patient scan.\n');
}
