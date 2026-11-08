// Phase 4: controllable, synchronised procedural motion (educational approximation).
import test from 'node:test';
import assert from 'node:assert/strict';
import { loadPhantom, rng } from './helpers.mjs';
import {
  DEFAULT_PHYSIOLOGY, cardiacState, respState, prepareGeometry, makeFrame, displacement, makeWarp, deformPositions,
  modelEjectionFraction, createClock, advanceClock, antralContraction, systoleSeconds,
} from '../src/sim/physiology.js';
import { applyScenario } from '../src/sim/pathology.js';
import { createSampler } from '../src/sim/sampler.js';
import { reslice, rasterHash } from '../src/core/reslice.js';
import { freePose, imagingPlane, PROBES } from '../src/core/probe.js';

const P = await loadPhantom();
const geom = prepareGeometry(P.anatomy);
const frameAt = (params, { beat = 0, breath = 0, gi = 0 } = {}) => makeFrame({ t: 0, beatPhase: beat, breathPhase: breath, giPhase: gi }, params, geom);

test('cardiac and respiratory timing curves', () => {
  const T = 60 / 72, Ts = systoleSeconds(T);
  assert.equal(cardiacState(0, T).E, 0);
  assert.ok(Math.abs(cardiacState((Ts - 0.001) / T, T).E - 1) < 0.01, 'end-systole fully contracted');
  let prev = -1;
  for (let c = 0.07; c < Ts / T; c += 0.01) { const e = cardiacState(c, T).E; assert.ok(e >= prev); prev = e; }
  assert.ok(cardiacState(0.98, T).eA > 0 && cardiacState(0.5, T).eA === 0, 'atrial contraction only at end-diastole');
  assert.ok(cardiacState(0.97, T).E < cardiacState(0.8, T).E, 'atrial kick completes filling');
  assert.ok(systoleSeconds(0.5) / 0.5 > systoleSeconds(1) / 1, 'systole takes a larger fraction of the cycle at high HR');
  assert.equal(respState(0).r, 0); assert.ok(Math.abs(respState(0.4).r - 1) < 1e-9); assert.equal(respState(0.2).phase, 'inspiration'); assert.equal(respState(0.7).phase, 'expiration');
});

test('inverse warp inverts the forward field near heart, diaphragm and antrum (all < 0.05 mm)', () => {
  const r = rng(5);
  let n = 0, good = 0, worst = 0;
  for (const sc of ['normal', 'hfref', 'gastroparesis']) {
    const params = { ...applyScenario(DEFAULT_PHYSIOLOGY, sc), breathDepth: 30 };
    for (let k = 0; k < 40; k++) {
      const f = frameAt(params, { beat: r(), breath: r(), gi: r() * 3 });
      const warp = makeWarp(f), d = [0, 0, 0], q = [0, 0, 0];
      for (const c of [P.anatomy.heart.lvCentre, [-60, 0, 10], [20, -60, -115]]) {
        const p = c.map((v) => v + (r() - 0.5) * 70);
        displacement(f, ...p, d);
        const x = [p[0] + d[0], p[1] + d[1], p[2] + d[2]];
        warp(...x, q);
        const err = Math.hypot(q[0] - p[0], q[1] - p[1], q[2] - p[2]);
        n++; if (err < 0.05) good++; worst = Math.max(worst, err);
      }
    }
  }
  assert.equal(good, n, `${good}/${n} within 0.05 mm (worst ${worst.toFixed(3)} mm)`);
});

/** Count LV-cavity reference voxels seen through the warp at a given frame (current-space volume). */
function lvVolumeMl(f, step = 1.5) {
  const warp = makeWarp(f), q = [0, 0, 0], C = P.anatomy.heart.lvCentre;
  let n = 0;
  for (let x = C[0] - 75; x <= C[0] + 75; x += step) for (let y = C[1] - 75; y <= C[1] + 75; y += step) for (let z = C[2] - 75; z <= C[2] + 75; z += step) {
    warp(x, y, z, q);
    if (P.labels.nearest(q[0], q[1], q[2]) === 10) n++;
  }
  return n * step ** 3 / 1000;
}

test('LV ejection fraction measured from the deformation matches the model EF (normal vs HFrEF)', () => {
  for (const [sc, lo, hi] of [['normal', 0.5, 0.66], ['hfref', 0.18, 0.32]]) {
    const params = { ...applyScenario(DEFAULT_PHYSIOLOGY, sc), respirationEnabled: false, peristalsisEnabled: false };
    const T = 60 / params.heartRate, Ts = systoleSeconds(T);
    const edv = lvVolumeMl(frameAt(params, { beat: 0 })), esv = lvVolumeMl(frameAt(params, { beat: (Ts - 0.002) / T }));
    const ef = (edv - esv) / edv, model = modelEjectionFraction(params);
    assert.ok(ef > lo && ef < hi, `${sc}: measured EF ${(ef * 100).toFixed(1)}%`);
    assert.ok(Math.abs(ef - model) < 0.07, `${sc}: measured ${(ef * 100).toFixed(1)}% vs model ${(model * 100).toFixed(1)}%`);
    if (sc === 'hfref') assert.ok(edv > 1.35 * P.anatomy.heart.lvEdvMl, 'dilated LV: EDV ' + edv.toFixed(0) + ' mL');
  }
});

test('respiration: diaphragm descends by the set excursion; chest wall rises; back stays on the table', () => {
  for (const depth of [15, 40]) {
    const params = { ...DEFAULT_PHYSIOLOGY, breathDepth: depth, cardiacEnabled: false, peristalsisEnabled: false };
    const dome = (f) => { // first non-lung label going caudally along the right dome axis, in current space
      const warp = makeWarp(f), q = [0, 0, 0];
      for (let z = 60; z > -120; z -= 0.5) { warp(-80, 5, z, q); if (P.labels.nearest(...q) !== 7) return z; }
      return NaN;
    };
    const exp = dome(frameAt(params, { breath: 0 })), insp = dome(frameAt(params, { breath: 0.4 }));
    assert.ok(Math.abs(exp - insp - depth) < depth * 0.25 + 2, `excursion ${(exp - insp).toFixed(1)} mm for set ${depth}`);
    const d = [0, 0, 0], f = frameAt(params, { breath: 0.4 });
    displacement(f, 0, -108, 60, d); assert.ok(d[1] < -depth * 0.2, 'anterior chest moves anteriorly');
    displacement(f, 0, 108, 60, d); assert.ok(Math.abs(d[1]) < 1, 'posterior surface stays on the table');
    displacement(f, 0, 0, 420, d); assert.ok(Math.hypot(...d) < 0.01, 'head does not move');
  }
});

test('gastric peristalsis propagates toward the pylorus at the set speed and frequency', () => {
  const params = { ...DEFAULT_PHYSIOLOGY, cardiacEnabled: false, respirationEnabled: false };
  const S = geom.stomach.total, s0 = geom.waveStart;
  const peak = (gi, lo, hi) => { let best = -1, bs = 0; for (let s = lo; s < hi; s += 0.1) { const c = antralContraction(frameAt(params, { gi }), s); if (c > best) { best = c; bs = s; } } return bs; };
  const g0 = 0.35, dt = 2; // seconds
  const p0 = peak(g0, s0 + 50, S - 20), p1 = peak(g0 + dt * params.antralFrequency / 60, p0 - 2, p0 + 12);
  assert.ok(Math.abs((p1 - p0) / dt - params.antralSpeed) < 0.3, `wave speed ${((p1 - p0) / dt).toFixed(2)} mm/s`);
  for (const freq of [1.2, 3]) {
    const pr = { ...params, antralFrequency: freq }, clock = createClock(); let count = 0, prev = 0, rising = false;
    for (let t = 0; t < 120; t += 0.05) {
      advanceClock(clock, 0.05, pr);
      const c = antralContraction(makeFrame(clock, pr, geom), s0 + 60);
      if (c > prev) rising = true; else if (rising && c < prev) { if (prev > 0.2 * pr.antralAmplitude) count++; rising = false; }
      prev = c;
    }
    assert.ok(Math.abs(count - freq * 2) <= 1, `${freq}/min -> ${count} contractions in 2 min`);
  }
});

test('mesh deformation and image sampling stay synchronised (same field); images change over the cycle', () => {
  const params = { ...DEFAULT_PHYSIOLOGY, breathDepth: 25 };
  const ref = new Float32Array([...P.anatomy.heart.lvCentre, -62, 5, 0, 30, -60, -110, 40, -100, 50]);
  const sampler = createSampler(P);
  const plane = imagingPlane(freePose({ position: P.anatomy.heart.lvCentre, pitch: -90, yaw: 0, roll: 0 }), PROBES.linear, 0, { width: 140, height: 140 });
  const hashes = [];
  for (const beat of [0, 0.15, 0.3, 1.0]) {
    const f = frameAt(params, { beat, breath: beat * 0.5 });
    const cur = deformPositions(f, ref);
    const warp = makeWarp(f), q = [0, 0, 0];
    for (let i = 0; i < ref.length; i += 3) {
      warp(cur[i], cur[i + 1], cur[i + 2], q);
      assert.ok(Math.hypot(q[0] - ref[i], q[1] - ref[i + 1], q[2] - ref[i + 2]) < 0.05, 'vertex and image agree');
    }
    sampler.setFrame(f);
    hashes.push(rasterHash(reslice({ sample: sampler.ct }, plane, 70, 70).values));
  }
  assert.notEqual(hashes[0], hashes[1]); assert.notEqual(hashes[1], hashes[2]);
  assert.notEqual(hashes[0], hashes[3], 'breathing differs between beats 0 and 1 here');
  // with respiration frozen, the cardiac cycle is periodic
  const p2 = { ...params, respirationEnabled: false }, h = (beat) => { sampler.setFrame(frameAt(p2, { beat })); return rasterHash(reslice({ sample: sampler.ct }, plane, 70, 70).values); };
  assert.equal(h(0.2), h(1.2));
});

test('clock integrates phases: changing heart rate never jumps the cardiac phase', () => {
  const clock = createClock(), p = { ...DEFAULT_PHYSIOLOGY };
  for (let i = 0; i < 100; i++) advanceClock(clock, 0.01, p);
  const before = clock.beatPhase;
  p.heartRate = 140;
  advanceClock(clock, 0.001, p);
  assert.ok(clock.beatPhase - before < 0.01);
  p.breathHold = true; const r0 = makeFrame(advanceClock(clock, 0.5, p), p, geom).r; const r1 = makeFrame(advanceClock(clock, 2, p), p, geom).r;
  assert.equal(r0, r1, 'breath hold freezes respiration');
});
