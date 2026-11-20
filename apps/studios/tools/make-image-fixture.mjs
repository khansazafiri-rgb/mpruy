#!/usr/bin/env node
// TECHNICAL FIXTURE for 2D image studios: a synthetic grey-scale PNG (gradients and two shapes) with polygon
// annotations and calibrated spacing. Not a radiograph or ultrasound of any person.
import fs from 'node:fs';
import path from 'node:path';
import zlib from 'node:zlib';
function crc32(b) { let c, crc = 0xffffffff; for (let n = 0; n < b.length; n++) { c = (crc ^ b[n]) & 0xff; for (let k = 0; k < 8; k++) c = c & 1 ? 0xedb88320 ^ (c >>> 1) : c >>> 1; crc = (crc >>> 8) ^ c; } return (crc ^ 0xffffffff) >>> 0; }
export function png(w, h, px) {
  const chunk = (type, data) => { const len = Buffer.alloc(4); len.writeUInt32BE(data.length); const td = Buffer.concat([Buffer.from(type), data]); const crc = Buffer.alloc(4); crc.writeUInt32BE(crc32(td)); return Buffer.concat([len, td, crc]); };
  const ihdr = Buffer.alloc(13); ihdr.writeUInt32BE(w, 0); ihdr.writeUInt32BE(h, 4); ihdr[8] = 8; ihdr[9] = 0;
  const raw = Buffer.alloc((w + 1) * h); for (let y = 0; y < h; y++) { raw[y * (w + 1)] = 0; for (let x = 0; x < w; x++) raw[y * (w + 1) + 1 + x] = px(x, y); }
  return Buffer.concat([Buffer.from([137, 80, 78, 71, 13, 10, 26, 10]), chunk('IHDR', ihdr), chunk('IDAT', zlib.deflateSync(raw)), chunk('IEND', Buffer.alloc(0))]);
}
export function makeImageFixture(outDir, { studioId } = {}) {
  const W = 512, H = 400, circle = [180, 200, 60], box = [330, 140, 420, 260];
  fs.mkdirSync(path.join(outDir, 'data'), { recursive: true }); fs.mkdirSync(path.join(outDir, 'server'), { recursive: true });
  fs.writeFileSync(path.join(outDir, 'data/image-1.png'), png(W, H, (x, y) => {
    let v = 30 + Math.round(60 * y / H);
    if (Math.hypot(x - circle[0], y - circle[1]) < circle[2]) v = 200;
    if (x > box[0] && x < box[2] && y > box[1] && y < box[3]) v = 130;
    return v;
  }));
  const poly = Array.from({ length: 24 }, (_, k) => [Math.round(circle[0] + circle[2] * Math.cos(k * Math.PI / 12)), Math.round(circle[1] + circle[2] * Math.sin(k * Math.PI / 12))]);
  const regions = [{ id: 'r1', label: 'Fixture circle', polygon: poly }, { id: 'r2', label: 'Fixture box', polygon: [[box[0], box[1]], [box[2], box[1]], [box[2], box[3]], [box[0], box[3]]] }];
  fs.writeFileSync(path.join(outDir, 'data/annotations-1.json'), JSON.stringify({ schema: 'medcoel.annotations.v1', source: 'technical fixture', regions }));
  fs.writeFileSync(path.join(outDir, 'data/dataset.json'), JSON.stringify({ schema: 'medcoel.dataset.v1', status: 'TECHNICAL_FIXTURE', source: 'MEDCOEL synthetic image',
    notice: 'FIXTURE TEKNIS: citra sintetis untuk pengujian ' + studioId + '. Bukan radiograf/USG pasien.', images: [{ id: 'img1', title: 'Fixture 1', file: 'data/image-1.png', pixelSpacingMm: [0.2, 0.2], annotations: 'data/annotations-1.json' }], guidedRegion: { id: 'r1', label: 'Fixture circle' } }));
  fs.writeFileSync(path.join(outDir, 'server/challenge.json'), JSON.stringify({ schema: 'medcoel.challenge.v1', source: 'technical fixture', count: 2, items: [
    { id: 'img-find', prompt: { kind: 'find-region', imageId: 'img1', text: 'Klik lingkaran fixture.' }, options: [], answer: { polygon: poly }, canonical: 'Fixture circle', explanation: 'Fixture teknis.' },
    { id: 'img-choice', prompt: { kind: 'choice', imageId: 'img1', text: 'Berapa bentuk berlabel pada citra fixture?' }, options: ['Satu', 'Dua', 'Tiga'], answer: { index: 1 }, canonical: 'Dua', explanation: 'Fixture teknis.' }] }));
  fs.writeFileSync(path.join(outDir, 'data/NOTICE-FIXTURE.txt'), 'MEDCOEL technical fixture: synthetic image, MIT. Not a patient image.\n');
}
