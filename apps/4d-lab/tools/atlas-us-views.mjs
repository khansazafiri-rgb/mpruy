// Offline render of the simulated ultrasound (and CT reslice) at every standard window of a dataset.
//   node tools/atlas-us-views.mjs [datasetDir] [out.png]
import fs from 'node:fs';
import path from 'node:path';
import { parseNrrd } from '../src/core/nrrd.js';
import { makeVolume } from '../src/core/volume.js';
import { createSampler } from '../src/sim/sampler.js';
import { simulateUltrasound, scanConvert } from '../src/sim/ultrasound.js';
import { reslice, windowLevel } from '../src/core/reslice.js';
import { clinicalPose, imagingPlane, PROBES } from '../src/core/probe.js';
import { VIEWS } from '../src/sim/views.js';
import { encodePNG, montage } from './png.mjs';
const dir = process.argv[2] || 'public/data/atlas', out = process.argv[3] || 'evidence/atlas-us-standard-views.png';
const rd = (f) => fs.readFileSync(path.join(dir, f));
const ct = makeVolume(await parseNrrd(rd('ct.nrrd'), 'ct')), labels = makeVolume(await parseNrrd(rd('labels.nrrd'), 'l'));
const anatomy = JSON.parse(rd('anatomy.json')), sampler = createSampler({ ct, labels, anatomy });
const tiles = [];
for (const v of VIEWS) {
  const dv = anatomy.views.find((x) => x.key === v.key); if (!dv) continue;
  const probe = PROBES[v.probe], plane = imagingPlane(clinicalPose(dv.contact, dv.angles), probe, v.depth);
  plane.probe = probe;
  const us = simulateUltrasound(sampler, plane, { probe, freq: probe.defaultFreq, depth: v.depth, quality: 1 });
  const W = 260, H = Math.round(W * plane.height / plane.width);
  tiles.push({ rgba: scanConvert(us, W, H), w: W, h: H });
  const r = reslice({ sample: (x, y, z) => ct.sample(x, y, z) }, plane, W, H, { clipToFov: true });
  tiles.push({ rgba: windowLevel(r, 400, 40), w: W, h: H });
  console.log(v.key, 'obstruction', dv.windowObstructionSamples ?? '-');
}
const rows = []; for (let i = 0; i < tiles.length; i += 4) rows.push(montage(tiles.slice(i, i + 4)));
const W = Math.max(...rows.map((r) => r.w)), H = rows.reduce((s, r) => s + r.h + 6, 0), img = new Uint8ClampedArray(W * H * 4); let y0 = 0;
for (const r of rows) { for (let y = 0; y < r.h; y++) img.set(r.rgba.subarray(y * r.w * 4, (y + 1) * r.w * 4), ((y0 + y) * W) * 4); y0 += r.h + 6; }
fs.writeFileSync(out, encodePNG(img, W, H)); console.log('wrote', out);
