// Phase 5: pathology scenarios (normal vs pathological) and the auscultation workflow.
import test from 'node:test';
import assert from 'node:assert/strict';
import { loadPhantom } from './helpers.mjs';
import { SCENARIOS, buildEffusion, applyScenario, motilityIndex } from '../src/sim/pathology.js';
import { heartCycle, heartEventTimes, siteMix, breathCycle, bowelGurgle } from '../src/sim/auscultation.js';
import { DEFAULT_PHYSIOLOGY, systoleSeconds, modelEjectionFraction, prepareGeometry, makeFrame } from '../src/sim/physiology.js';
import { createSampler } from '../src/sim/sampler.js';
import { simulateUltrasound } from '../src/sim/ultrasound.js';
import { clinicalPose, imagingPlane, PROBES } from '../src/core/probe.js';
import { VIEWS, snapToSkin } from '../src/sim/views.js';
import { TISSUE_INDEX } from '../src/sim/tissues.js';

const P = await loadPhantom();
const sites = P.anatomy.auscultation;
const site = (k) => sites.find((s) => s.key === k);
const rms = (a, i0 = 0, i1 = a.length) => { let s = 0; for (let i = i0; i < i1; i++) s += a[i] * a[i]; return Math.sqrt(s / Math.max(1, i1 - i0)); };

test('every scenario has explanation, findings and references; physiology changes are explicit', () => {
  for (const sc of Object.values(SCENARIOS)) {
    assert.ok(sc.title && sc.summary);
    if (sc.key !== 'normal') { assert.ok(sc.findings.length >= 3 && sc.references.length >= 2 && sc.teaching); }
  }
  const n = applyScenario(DEFAULT_PHYSIOLOGY, 'normal'), h = applyScenario(DEFAULT_PHYSIOLOGY, 'hfref'), g = applyScenario(DEFAULT_PHYSIOLOGY, 'gastroparesis');
  assert.ok(modelEjectionFraction(n) > 0.52 && modelEjectionFraction(h) < 0.32);
  assert.ok(motilityIndex(g) < motilityIndex(n) / 3, 'motility index reduced');
});

test('pleural effusion: dependent (posterior-basal) right-sided fluid of the requested volume', () => {
  const e = buildEffusion(P.labels, 650);
  assert.ok(Math.abs(e.volumeMl - 650) < 10, 'volume ' + e.volumeMl.toFixed(0));
  // fluid centroid is posterior and basal relative to the right lung; nothing in the left lung
  const [nx, ny, nz] = P.labels.sizes, m = P.labels.affine;
  const acc = { f: [0, 0, 0, 0], l: [0, 0, 0, 0] };
  for (let k = 0; k < nz; k += 2) for (let j = 0; j < ny; j += 2) for (let i = 0; i < nx; i += 2) {
    if (P.labels.data[(k * ny + j) * nx + i] !== 7) continue;
    const p = P.labels.toLPS([i, j, k]), key = e.classify(...p, 7) === 39 ? 'f' : 'l';
    acc[key][0] += p[0]; acc[key][1] += p[1]; acc[key][2] += p[2]; acc[key][3]++;
  }
  const cf = acc.f.slice(0, 3).map((v) => v / acc.f[3]), cl = acc.l.slice(0, 3).map((v) => v / acc.l[3]);
  assert.ok(cf[1] > cl[1] + 25 && cf[2] < cl[2] - 40, `fluid centroid ${cf.map((v) => v.toFixed(0))} vs aerated ${cl.map((v) => v.toFixed(0))}`);
  void m;
  assert.equal(e.classify(60, 80, -20, 8), 0);
});

test('effusion scenario changes CT and ultrasound in the same window (normal vs pathological)', () => {
  const v = VIEWS.find((x) => x.key === 'right_flank'), c = snapToSkin((x, y, z) => P.labels.nearest(x, y, z), v.target, v.dir), probe = PROBES[v.probe];
  const plane = imagingPlane(clinicalPose(c, v.angles), probe, v.depth);
  const normal = createSampler(P), path = createSampler(P); path.setEffusion(buildEffusion(P.labels, 650));
  const usN = simulateUltrasound(normal, plane, { probe, freq: 3.5, depth: v.depth, quality: 0.6 });
  const usP = simulateUltrasound(path, plane, { probe, freq: 3.5, depth: v.depth, quality: 0.6 });
  // count fluid samples in plane and check they are dark (anechoic)
  let n = 0, s = 0;
  for (let li = 0; li < usP.nLines; li++) for (let k = 0; k < usP.nS; k++) {
    const t = (k + 0.5) * usP.dz, L = usP.lines[li], pl = plane;
    const p = [0, 1, 2].map((i) => pl.top[i] + pl.u[i] * (L.s0 + L.ds * t) + pl.v[i] * (L.d0 + L.dd * t));
    if (path.tissueRef(...p) === TISSUE_INDEX.fluid && normal.tissueRef(...p) === TISSUE_INDEX.lung) { n++; s += usP.grey[li * usP.nS + k]; }
  }
  assert.ok(n > 200, 'effusion visible in the effusion window: ' + n + ' samples');
  assert.ok(s / n < 0.15, 'effusion anechoic: ' + (s / n).toFixed(3));
  let ctDiff = 0;
  for (let k = 0; k < 2000; k++) { const p = [-120 + (k % 20) * 5, 30 + Math.floor(k / 20) % 10 * 6, -60 + Math.floor(k / 200) * 8]; if (Math.abs(normal.ct(...p) - path.ct(...p)) > 300) ctDiff++; }
  assert.ok(ctDiff > 20, 'CT shows water density where lung was');
  // fluid replaces air: structures deep to the effusion become visible ("acoustic window", spine sign)
  let deepN = 0, deepP = 0, nd = 0;
  for (let li = 0; li < usP.nLines; li++) {
    let firstFluid = -1;
    for (let k = 0; k < usP.nS && firstFluid < 0; k++) {
      const t = (k + 0.5) * usP.dz, L = usP.lines[li];
      const p = [0, 1, 2].map((i) => plane.top[i] + plane.u[i] * (L.s0 + L.ds * t) + plane.v[i] * (L.d0 + L.dd * t));
      if (path.tissueRef(...p) === TISSUE_INDEX.fluid) firstFluid = k;
    }
    if (firstFluid < 0) continue;
    for (let k = firstFluid + Math.round(25 / usP.dz); k < usP.nS; k++) { deepN += usN.grey[li * usP.nS + k]; deepP += usP.grey[li * usP.nS + k]; nd++; }
  }
  assert.ok(nd > 500 && deepP / nd > deepN / nd + 0.02, `beyond the fluid: ${(deepP / nd).toFixed(3)} with effusion vs ${(deepN / nd).toFixed(3)} normal`);
});

test('heart sounds: S1 at systole onset, S2 at end-systole, S3 only when enabled, inspiratory splitting', () => {
  const T = 60 / 72, sr = 8000, Ts = systoleSeconds(T);
  const w = { M1: 1, T1: 0.6, A2: 1, P2: 0.6, S3: 1 };
  const a = heartCycle({ T, weights: w, s3: false, sampleRate: sr }), b = heartCycle({ T, weights: w, s3: true, sampleRate: sr });
  const win = (t, d = 0.06) => rms(a.samples, Math.round(t * sr), Math.round((t + d) * sr));
  assert.ok(win(0.02) > 5 * win(0.2), 'S1 burst right after onset');
  assert.ok(win(Ts) > 5 * win(Ts - 0.12), 'S2 burst at end-systole');
  const ev = heartEventTimes(T, { s3: true });
  const s3win = (arr) => rms(arr, Math.round(ev.S3 * sr), Math.round((ev.S3 + 0.08) * sr));
  assert.ok(s3win(b.samples) > 4 * s3win(a.samples), 'S3 present only with s3');
  assert.ok(ev.S3 - ev.A2 > 0.12 && ev.S3 - ev.A2 < 0.2, 'S3 ~120-200 ms after A2');
  assert.ok(heartEventTimes(T, { r: 1 }).P2 - heartEventTimes(T, { r: 0 }).P2 > 0.025, 'P2 delayed in inspiration');
});

test('auscultation sites weight the right components; effusion reduces breath sounds at the right base', () => {
  const lab = (x, y, z) => P.labels.nearest(x, y, z);
  const at = (k, labelAt = lab, s3 = false) => siteMix({ point: site(k).point, normal: site(k).normal, sites, labelAt, s3 });
  const mitral = at('mitral'), aortic = at('aortic');
  assert.ok(mitral.weights.M1 > mitral.weights.A2 && aortic.weights.A2 > aortic.weights.M1, 'S1 loudest at apex, S2 at base');
  assert.ok(at('mitral', lab, true).weights.S3 > 0.5 && at('aortic', lab, true).weights.S3 < at('mitral', lab, true).weights.S3);
  assert.ok(at('lung_ant_r').breath > 0.5 && at('abd_rlq').breath < 0.1 && at('abd_rlq').bowel > 0.2, 'breath over lung, bowel over abdomen');
  const eff = buildEffusion(P.labels, 650);
  const pathLab = (x, y, z) => { const l = lab(x, y, z); return l === 7 ? eff.classify(x, y, z, l) || l : l; };
  const right = at('lung_post_r', pathLab), left = at('lung_post_l', pathLab), rightN = at('lung_post_r');
  assert.ok(right.breath < 0.6 * rightN.breath, `right base breath ${right.breath.toFixed(2)} vs normal ${rightN.breath.toFixed(2)}`);
  assert.ok(left.breath > right.breath, 'asymmetry left > right');
  assert.equal(at('mitral').nearest.key, 'mitral');
});

test('breath and bowel synthesis are deterministic, bounded and shaped', () => {
  const b = breathCycle({ period: 4, sampleRate: 8000, seed: 3 });
  assert.equal(b.length, 32000);
  assert.ok(rms(b, 4000, 9000) > 2.5 * rms(b, 26000, 31000), 'inspiration louder than late expiration');
  assert.deepEqual(Array.from(bowelGurgle({ seed: 4 }).slice(0, 50)), Array.from(bowelGurgle({ seed: 4 }).slice(0, 50)));
  assert.ok(b.every((v) => Math.abs(v) < 4));
});

test('HFrEF scenario: less ventricular wall motion than normal in the apical window', () => {
  const geom = prepareGeometry(P.anatomy);
  const v = VIEWS.find((x) => x.key === 'apical'), c = snapToSkin((x, y, z) => P.labels.nearest(x, y, z), v.target, v.dir), probe = PROBES[v.probe];
  const plane = imagingPlane(clinicalPose(c, v.angles), probe, v.depth);
  const motion = (key) => {
    const params = { ...applyScenario(DEFAULT_PHYSIOLOGY, key), respirationEnabled: false, peristalsisEnabled: false }, T = 60 / params.heartRate;
    const s = createSampler(P), lab = (beat) => { s.setFrame(makeFrame({ t: 0, beatPhase: beat, breathPhase: 0, giPhase: 0 }, params, geom)); const out = []; for (let i = 0; i < 4000; i++) out.push(s.label(...[0, 1, 2].map((d) => plane.top[d] + plane.u[d] * ((i % 80) - 40) * 2 + plane.v[d] * Math.floor(i / 80) * 3.5))); return out; };
    const a = lab(0), b = lab((systoleSeconds(T) - 0.003) / T);
    let lvA = 0, lvB = 0; for (let i = 0; i < a.length; i++) { if (a[i] === 10) lvA++; if (b[i] === 10) lvB++; }
    return { change: 1 - lvB / lvA, lvA };
  };
  const n = motion('normal'), h = motion('hfref');
  assert.ok(n.lvA > 40, 'apical plane cuts the LV cavity');
  assert.ok(n.change > 0.3, 'normal LV cavity area shrinks in systole: ' + n.change.toFixed(2));
  assert.ok(h.change < 0.5 * n.change, `fractional area change HFrEF ${h.change.toFixed(2)} vs normal ${n.change.toFixed(2)}`);
  assert.ok(h.lvA > 1.15 * n.lvA, 'dilated LV in the same plane');
});
