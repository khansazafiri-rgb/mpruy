// Phase 3: the simulated ultrasound responds to probe pose, machine settings and tissue parameters.
import test from 'node:test';
import assert from 'node:assert/strict';
import { loadPhantom } from './helpers.mjs';
import { createSampler } from '../src/sim/sampler.js';
import { simulateUltrasound, scanConvert } from '../src/sim/ultrasound.js';
import { cloneTissues, TISSUES, TISSUE_INDEX, classifyHU, impedance } from '../src/sim/tissues.js';
import { clinicalPose, imagingPlane, PROBES, freePose, FREE_PRESETS } from '../src/core/probe.js';
import { VIEWS, snapToSkin } from '../src/sim/views.js';
import { rasterHash } from '../src/core/reslice.js';

const P = await loadPhantom();
const sampler = createSampler(P);
const view = (key) => VIEWS.find((v) => v.key === key);
function setup(key, angles) {
  const v = view(key), c = snapToSkin((x, y, z) => P.labels.nearest(x, y, z), v.target, v.dir);
  const probe = PROBES[v.probe];
  return { v, probe, c, plane: imagingPlane(clinicalPose(c, angles || v.angles), probe, v.depth) };
}
const run = (s, extra = {}) => simulateUltrasound(sampler, s.plane, { probe: s.probe, freq: s.probe.defaultFreq, depth: s.v.depth, quality: 0.6, ...extra });
/** mean grey of samples whose (reference) tissue class is one of `classes`, optional depth window */
function classMean(us, classes, d0 = 0, d1 = 1e9, field = 'grey') {
  let s = 0, n = 0;
  for (let li = 0; li < us.nLines; li++) for (let k = 0; k < us.nS; k++) {
    const t = (k + 0.5) * us.dz; if (t < d0 || t > d1) continue;
    const L = us.lines[li], sp = L.s0 + L.ds * t, dp = L.d0 + L.dd * t, pl = us.plane;
    const cls = sampler.tissueRef(...[0, 1, 2].map((i) => pl.top[i] + pl.u[i] * sp + pl.v[i] * dp));
    if (classes.includes(cls)) { const v = us[field === 'db' ? 'env' : 'grey'][li * us.nS + k]; s += field === 'db' ? 20 * Math.log10(v + 1e-9) : v; n++; }
  }
  return { mean: n ? s / n : NaN, n };
}
const meanAll = (us) => us.grey.reduce((a, b) => a + b, 0) / us.grey.length;
const diff = (a, b) => { let s = 0; for (let i = 0; i < a.grey.length; i++) s += Math.abs(a.grey[i] - b.grey[i]); return s / a.grey.length; };

test('tissue table: impedances in literature order; HU fallback classification', () => {
  const Z = Object.fromEntries(TISSUES.map((t) => [t.key, impedance(t)]));
  assert.ok(Z.air < 0.001 && Z.lung < Z.fat && Z.fat < Z.liver && Z.liver < Z.bone && Z.bone > 5);
  assert.equal(classifyHU(-1000), TISSUE_INDEX.air); assert.equal(classifyHU(-100), TISSUE_INDEX.fat);
  assert.equal(classifyHU(5), TISSUE_INDEX.fluid); assert.equal(classifyHU(1200), TISSUE_INDEX.bone);
});

test('deterministic for identical inputs; changes with probe rotation, heel-toe and rock', () => {
  const s = setup('ruq');
  const a = run(s), b = run(s);
  assert.equal(rasterHash(a.grey), rasterHash(b.grey));
  for (const ang of [{ ...s.v.angles, rotate: s.v.angles.rotate + 25 }, { ...s.v.angles, heelToe: 20 }, { ...s.v.angles, rock: 18 }]) {
    const c = run(setup('ruq', ang));
    assert.ok(diff(a, c) > 0.04, 'orientation change alters the image: ' + JSON.stringify(ang) + ' ' + diff(a, c).toFixed(3));
  }
});

test('simple fluid is anechoic with posterior acoustic enhancement (bladder)', () => {
  const s = setup('bladder'), us = run(s);
  const fluid = classMean(us, [TISSUE_INDEX.fluid]), soft = classMean(us, [TISSUE_INDEX.muscle, TISSUE_INDEX.gi_wall, TISSUE_INDEX.fat]);
  assert.ok(fluid.n > 500 && fluid.mean < 0.12, 'bladder lumen dark: ' + fluid.mean.toFixed(3));
  assert.ok(soft.mean > fluid.mean + 0.15, 'surrounding tissue brighter');
  // enhancement: compare central lines (behind the bladder) with lateral lines at the same deep window
  const mid = Math.floor(us.nLines / 2), q = Math.floor(us.nLines / 8), d0 = 105, d1 = 135;
  const k0 = Math.floor(d0 / us.dz), k1 = Math.floor(d1 / us.dz);
  const avg = (l0, l1) => { let t = 0, n = 0; for (let l = l0; l <= l1; l++) for (let k = k0; k <= k1; k++) { t += us.grey[l * us.nS + k]; n++; } return t / n; };
  assert.ok(avg(mid - q, mid + q) > avg(0, 2 * q) + 0.03, 'posterior enhancement behind fluid');
});

test('bone and gas cause acoustic shadowing', () => {
  const s = setup('right_flank'), us = run(s);
  const shadowed = [], clear = [];
  for (let li = 0; li < us.nLines; li++) {
    let hitBone = false;
    for (let k = 0; k < us.nS * 0.25; k++) {
      const t = (k + 0.5) * us.dz, L = us.lines[li], pl = us.plane;
      const p = [0, 1, 2].map((i) => pl.top[i] + pl.u[i] * (L.s0 + L.ds * t) + pl.v[i] * (L.d0 + L.dd * t));
      if (sampler.tissueRef(...p) === TISSUE_INDEX.bone) { hitBone = true; break; }
    }
    let m = 0; for (let k = Math.floor(us.nS * 0.4); k < us.nS * 0.7; k++) m += us.grey[li * us.nS + k];
    (hitBone ? shadowed : clear).push(m / (us.nS * 0.3));
  }
  const avg = (a) => a.reduce((x, y) => x + y, 0) / a.length;
  assert.ok(shadowed.length > 5 && clear.length > 5, `lines: ${shadowed.length} behind rib, ${clear.length} intercostal`);
  assert.ok(avg(shadowed) < 0.5 * avg(clear), `rib shadow ${avg(shadowed).toFixed(3)} vs ${avg(clear).toFixed(3)}`);
});

test('frequency: higher frequency loses penetration and gives finer speckle', () => {
  const s = setup('ruq');
  const lo = run(s, { freq: 2.0, autoTGC: false }), hi = run(s, { freq: 5.5, autoTGC: false });
  // raw echo level (dB, before display compression) from deep liver: round-trip loss grows with f
  const deep = (us) => classMean(us, [TISSUE_INDEX.liver], 90, 150, 'db').mean - classMean(us, [TISSUE_INDEX.liver], 20, 50, 'db').mean;
  assert.ok(deep(hi) < deep(lo) - 10, `deep-minus-near liver ${deep(hi).toFixed(1)} dB @5.5 MHz vs ${deep(lo).toFixed(1)} dB @2 MHz`);
  // lateral speckle correlation length (lines) shrinks with frequency (beam width ~ wavelength)
  const corrLen = (us) => {
    const k0 = Math.floor(40 / us.dz), k1 = Math.floor(80 / us.dz);
    let best = 0;
    for (let lag = 1; lag < 20; lag++) {
      let c = 0, v = 0;
      for (let k = k0; k < k1; k++) {
        const row = []; for (let li = 0; li < us.nLines; li++) row.push(us.env[li * us.nS + k]);
        const m = row.reduce((x, y) => x + y) / row.length;
        for (let li = 0; li + lag < us.nLines; li++) c += (row[li] - m) * (row[li + lag] - m);
        for (let li = 0; li < us.nLines; li++) v += (row[li] - m) ** 2;
      }
      if (c / v < 0.5) { best = lag; break; }
      best = lag;
    }
    return best;
  };
  assert.ok(corrLen(hi) < corrLen(lo), `lateral speckle ${corrLen(hi)} vs ${corrLen(lo)} lines`);
});

test('gain, TGC and dynamic range change display levels as expected', () => {
  const s = setup('ruq');
  const a = run(s), g = run(s, { gain: 10 }), t = run(s, { tgc: [0, 0, 15] }), d = run(s, { dynamicRange: 80 });
  assert.ok(meanAll(g) > meanAll(a) + 0.05);
  const far = (us) => classMean(us, [TISSUE_INDEX.liver], 110, 160).mean, near = (us) => classMean(us, [TISSUE_INDEX.liver], 20, 50).mean;
  assert.ok(far(t) > far(a) + 0.05 && Math.abs(near(t) - near(a)) < 0.08, 'far TGC mainly raises the far field');
  assert.notEqual(rasterHash(d.grey), rasterHash(a.grey));
});

test('editing tissue parameters changes the image through the simulation (liver attenuation + backscatter)', () => {
  const s = setup('ruq');
  const base = run(s);
  const t1 = cloneTissues(); t1[TISSUE_INDEX.liver].alpha = 1.6; // steatosis-like higher attenuation
  const att = run(s, { tissues: t1 });
  const deep = (us) => classMean(us, [TISSUE_INDEX.liver], 90, 150).mean;
  assert.ok(deep(att) < deep(base) - 0.08, `deep liver ${deep(att).toFixed(3)} vs ${deep(base).toFixed(3)}`);
  const t2 = cloneTissues(); t2[TISSUE_INDEX.liver].scatter = 0.05;
  const dim = run(s, { tissues: t2 });
  assert.ok(classMean(dim, [TISSUE_INDEX.liver]).mean < classMean(base, [TISSUE_INDEX.liver]).mean - 0.1);
});

test('linear / convex / sector geometries and free-mode virtual transducer', () => {
  const s = setup('lung_anterior');
  const lin = run(s);
  assert.equal(lin.geo.geometry, 'linear');
  const rgba = scanConvert(lin, 64, 100);
  assert.ok(rgba.some((v, i) => i % 4 === 0 && v > 30), 'linear image has signal');
  const sec = run(setup('subxiphoid'));
  const img = scanConvert(sec, 100, 100);
  assert.equal(img[(99 * 100 + 0) * 4 + 3], 0, 'outside the sector fan is transparent (drawn on black)');
  const free = freePose({ position: [0, 0, -60], ...FREE_PRESETS.coronal });
  const fp = imagingPlane(free, PROBES.convex, 0, { width: 200, height: 200 });
  const fu = simulateUltrasound(sampler, fp, { probe: PROBES.convex, freq: 3.5, depth: 200, quality: 0.5 });
  assert.equal(fu.geo.geometry, 'linear');
  assert.ok(meanAll(fu) > 0.05, 'free-mode coronal plane produces an image');
});

test('aerated lung gives a pleural line with reverberation (A-lines) on the linear probe', () => {
  const s = setup('lung_anterior'), us = run(s, { depth: 80 });
  assert.ok(us.strongLines > us.nLines * 0.3, 'most lines meet the pleura: ' + us.strongLines);
});
