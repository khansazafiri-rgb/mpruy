// Prints display-level statistics per tissue class for calibration of REF_DB.
import { loadPhantom } from '../test/helpers.mjs';
import { createSampler } from '../src/sim/sampler.js';
import { simulateUltrasound } from '../src/sim/ultrasound.js';
import { clinicalPose, imagingPlane, PROBES } from '../src/core/probe.js';
import { VIEWS, snapToSkin } from '../src/sim/views.js';
import { TISSUES } from '../src/sim/tissues.js';
const { ct, labels, anatomy } = await loadPhantom();
const sampler = createSampler({ ct, labels, anatomy });
const stats = {};
for (const v of VIEWS) {
  const c = snapToSkin((x, y, z) => labels.nearest(x, y, z), v.target, v.dir);
  const probe = PROBES[v.probe], plane = imagingPlane(clinicalPose(c, v.angles), probe, v.depth);
  const us = simulateUltrasound(sampler, plane, { probe, freq: probe.defaultFreq, depth: v.depth, dynamicRange: 200, gain: 0 });
  for (let li = 0; li < us.nLines; li += 2) for (let k = 0; k < us.nS; k += 3) {
    const L = us.lines[li], t = (k + 0.5) * us.dz, s = L.s0 + L.ds * t, d = L.d0 + L.dd * t;
    const p = [0, 1, 2].map((i) => plane.top[i] + plane.u[i] * s + plane.v[i] * d);
    const cls = TISSUES[sampler.tissueRef(...p)].key;
    const db = 20 * Math.log10(us.env[li * us.nS + k] + 1e-9) + 2 * 0.6 * us.freq * t / 10;
    (stats[cls] ||= []).push(db);
  }
}
for (const [k, a] of Object.entries(stats)) { a.sort((x, y) => x - y); console.log(k.padEnd(12), 'n', String(a.length).padStart(6), 'median', a[a.length >> 1].toFixed(1), 'p90', a[Math.floor(a.length * 0.9)].toFixed(1), 'p99', a[Math.floor(a.length * 0.99)].toFixed(1)); }
