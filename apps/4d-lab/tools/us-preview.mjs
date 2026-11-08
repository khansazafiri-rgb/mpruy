// Offline evidence: render simulated ultrasound for the standard views (normal + pathology).
import { writeFile } from 'node:fs/promises';
import { loadPhantom } from '../test/helpers.mjs';
import { createSampler } from '../src/sim/sampler.js';
import { simulateUltrasound, scanConvert } from '../src/sim/ultrasound.js';
import { clinicalPose, imagingPlane, PROBES } from '../src/core/probe.js';
import { VIEWS, snapToSkin } from '../src/sim/views.js';
import { DEFAULT_PHYSIOLOGY, prepareGeometry, makeFrame, createClock } from '../src/sim/physiology.js';
import { buildEffusion, applyScenario } from '../src/sim/pathology.js';
import { reslice, windowLevel } from '../src/core/reslice.js';
import { encodePNG, montage } from './png.mjs';
const out = process.argv[2] || 'us-preview.png';
const only = process.argv[3];
const { ct, labels, anatomy } = await loadPhantom();
const sampler = createSampler({ ct, labels, anatomy });
const geom = prepareGeometry(anatomy);
const scen = process.env.SCENARIO || 'normal';
const params = applyScenario(DEFAULT_PHYSIOLOGY, scen);
if (scen === 'effusion') sampler.setEffusion(buildEffusion(labels, 650));
const clock = createClock(); clock.beatPhase = Number(process.env.PHASE || 0);
sampler.setFrame(makeFrame(clock, params, geom));
const tiles = [];
for (const v of VIEWS.filter((v) => !only || only.split(',').includes(v.key))) {
  const c = snapToSkin((x, y, z) => labels.nearest(x, y, z), v.target, v.dir);
  const pose = clinicalPose(c, v.angles);
  const probe = PROBES[v.probe];
  const plane = imagingPlane(pose, probe, v.depth);
  const t0 = performance.now();
  const us = simulateUltrasound(sampler, plane, { probe, freq: probe.defaultFreq, depth: v.depth, gain: 0, dynamicRange: 60, tgc: [0, 0, 0] });
  const ms = performance.now() - t0;
  const W = 300, H = Math.round(W * plane.height / plane.width);
  tiles.push({ rgba: scanConvert(us, W, H), w: W, h: H });
  const r = reslice({ sample: (x, y, z) => sampler.ct(x, y, z) }, plane, W, H);
  tiles.push({ rgba: windowLevel(r, 400, 40), w: W, h: H });
  console.log(v.key, c.point.map((x) => x.toFixed(0)).join(','), `${us.nLines}x${us.nS}`, ms.toFixed(0) + ' ms');
}
const m = montage(tiles);
await writeFile(out, encodePNG(m.rgba, m.w, m.h));
