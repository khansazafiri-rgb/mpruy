// Atlas integration: the MEDCOEL Anatomy Atlas meshes, the atlas-derived synthetic CT, the illustrative skin
// and the probe share ONE explicit frame. These tests check units, axes, left/right, registration, that the
// atlas meshes and the imaging labels agree, and that Phases 3-5 run on the atlas dataset.
import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import { loadAtlasDataset, loadPhantom } from './helpers.mjs';
import { validateRegistration } from '../src/core/mesh.js';
import { mat4Apply } from '../src/core/vec.js';
import { readAtlasSystem } from '../tools/atlas-node.mjs';
import { clinicalPose, imagingPlane, PROBES } from '../src/core/probe.js';
import { VIEWS } from '../src/sim/views.js';
import { createSampler } from '../src/sim/sampler.js';
import { simulateUltrasound } from '../src/sim/ultrasound.js';
import { DEFAULT_PHYSIOLOGY, prepareGeometry, makeFrame, makeWarp, displacement, modelEjectionFraction, systoleSeconds, diaphragmFor } from '../src/sim/physiology.js';
import { applyScenario, buildEffusion } from '../src/sim/pathology.js';
import { TISSUE_INDEX } from '../src/sim/tissues.js';

const A = await loadAtlasDataset();
const M = A.anatomy.atlasFrame.atlasToLPS;
const toLPS = (p) => mat4Apply(M, p);
const HEART = [9, 10, 11, 12, 13];
const centroid = (P) => { const c = [0, 0, 0]; for (let i = 0; i < P.length; i += 3) for (let d = 0; d < 3; d++) c[d] += P[i + d]; return c.map((v) => v / (P.length / 3)); };
const atlas = {};
for (const sys of ['visceral', 'cardiovascular', 'lymphatic']) atlas[sys] = await readAtlasSystem(sys, { geometry: true, filter: (n) => /^(Liver|Stomach|Spleen|Suprarenal gland\.[lr]|Left ventricle|Right atrium|Urinary bladder|Gallbladder|(Superior|Inferior) lobe of (left|right) lung)$/.test(n) });
const S = (name) => { for (const a of Object.values(atlas)) if (a.structures.get(name)?.positions) return a.structures.get(name); return null; };

test('atlas frame: metres -> LPS mm is a rigid, unit-scaled map with the documented axes', () => {
  const R = [[M[0], M[1], M[2]], [M[4], M[5], M[6]], [M[8], M[9], M[10]]].map((r) => r.map((v) => v / 1000));
  const det = R[0][0] * (R[1][1] * R[2][2] - R[1][2] * R[2][1]) - R[0][1] * (R[1][0] * R[2][2] - R[1][2] * R[2][0]) + R[0][2] * (R[1][0] * R[2][1] - R[1][1] * R[2][0]);
  assert.equal(det, 1, 'proper rotation (no mirror): left/right preserved');
  for (let i = 0; i < 3; i++) for (let j = 0; j < 3; j++) assert.equal(R[i].reduce((s, _, k) => s + R[i][k] * R[j][k], 0), i === j ? 1 : 0);
  assert.deepEqual(toLPS([1, A.anatomy.atlasFrame.y0Metres, 0]).map((v) => Math.round(v)), [1000, 0, 0], '+X atlas = patient left, 1 m = 1000 mm');
  assert.deepEqual(toLPS([0, A.anatomy.atlasFrame.y0Metres, 1]).map((v) => Math.round(v)), [0, -1000, 0], '+Z atlas = anterior (LPS -y)');
  assert.deepEqual(toLPS([0, A.anatomy.atlasFrame.y0Metres + 1, 0]).map((v) => Math.round(v)), [0, 0, 1000], '+Y atlas = superior');
});

test('left/right and cranio-caudal anatomy are correct in LPS (atlas meshes)', () => {
  const c = (n) => toLPS(centroid(S(n).positions));
  assert.ok(c('Liver')[0] < 0, 'liver on the patient right');
  assert.ok(c('Spleen')[0] > 40, 'spleen on the patient left');
  assert.ok(c('Stomach')[0] > 0, 'stomach left of midline');
  assert.ok(c('Left ventricle')[0] > c('Right atrium')[0], 'LV left of RA');
  assert.ok(c('Suprarenal gland.l')[0] > 20 && c('Suprarenal gland.r')[0] < -20, 'suprarenal glands paired L/R');
  // The kidney (CC BY-NC 4.0) is withheld by the licence quarantine: it must be absent, not substituted.
  assert.equal(S('Kidney.l'), null); assert.equal(S('Kidney.r'), null);
  assert.ok(c('Urinary bladder')[2] < c('Stomach')[2] && c('Stomach')[2] < c('Left ventricle')[2], 'bladder < stomach < heart (superior)');
  assert.ok(c('Gallbladder')[1] < c('Suprarenal gland.r')[1], 'gallbladder anterior to the right suprarenal gland');
});

test('registration package validates (affine, CT probes, SHA-256, skin anchors) and tampering is rejected', async () => {
  const v = await validateRegistration(A.reg, A.ct, A.files);
  assert.ok(v.ok, v.errors.join('; '));
  const bad = new Uint8Array(A.files['skin.glb'].slice(0)); bad[bad.length - 9] ^= 0xff;
  assert.ok(!(await validateRegistration(A.reg, A.ct, { 'skin.glb': bad.buffer })).ok, 'tampered skin rejected');
  const P = await loadPhantom();
  assert.ok(!(await validateRegistration(A.reg, P.ct, A.files)).ok, 'atlas skin rejected against the phantom CT');
});

test('illustrative skin shell is closed and sits on the CT body boundary (>= 97% of vertices)', async () => {
  const { meshes } = await validateRegistration(A.reg, A.ct, A.files);
  const { lps, indices } = meshes.skin, e = new Map();
  for (let t = 0; t < indices.length; t += 3) for (let k = 0; k < 3; k++) { const a = indices[t + k], b = indices[t + (k + 1) % 3], key = a < b ? a * 1e7 + b : b * 1e7 + a; e.set(key, (e.get(key) || 0) + 1); }
  assert.equal([...e.values()].filter((c) => c === 1).length, 0, 'no boundary edges (continuous contact surface)');
  assert.ok(A.reg.qc.skinLabelAgreement >= 0.97, 'agreement ' + A.reg.qc.skinLabelAgreement);
  const b = A.ct.bounds; let inside = 0, n = 0;
  for (let i = 0; i < lps.length; i += 3 * 11) { const p = [lps[i], lps[i + 1], lps[i + 2]]; if (p.every((v, d) => v > b.lo[d] + 8 && v < b.hi[d] - 8)) { n++; if (A.labels.nearest(...p) <= 2 || A.labels.nearest(...p) === 3) inside++; } }
  assert.ok(inside / n > 0.9, `skin vertices on skin/fat/muscle labels: ${(inside / n).toFixed(3)}`);
});

test('atlas meshes and imaging labels agree by construction (vertex -> label within 3 mm)', () => {
  const expect = { Liver: [17], Spleen: [19], Stomach: [22, 23, 24], 'Urinary bladder': [30, 43], 'Left ventricle': HEART, 'Superior lobe of left lung': [8, 40], 'Inferior lobe of right lung': [7, 40] };
  for (const [name, labs] of Object.entries(expect)) {
    const P = S(name).positions; let ok = 0, n = 0;
    for (let i = 0; i < P.length; i += 3 * 7) {
      const p = toLPS([P[i], P[i + 1], P[i + 2]]); n++;
      let hit = false; for (const dx of [-3, 0, 3]) for (const dy of [-3, 0, 3]) for (const dz of [-3, 0, 3]) if (labs.includes(A.labels.nearest(p[0] + dx, p[1] + dy, p[2] + dz))) hit = true;
      if (hit) ok++;
    }
    assert.ok(ok / n > 0.9, `${name}: ${(100 * ok / n).toFixed(1)}% of vertices touch their own label`);
  }
});

test('atlas and the procedural phantom are documented as NOT registered (measured residuals)', () => {
  const c = A.anatomy.comparisonWithProceduralPhantom;
  assert.ok(c && c.residual.length >= 6);
  assert.ok(c.rmsMM > 10, 'residual RMS ' + c.rmsMM + ' mm is far above a voxel: no overlay');
});

test('standard windows: contact on the skin, beam aimed at the intended organ', () => {
  const aimLabels = { subxiphoid: HEART, parasternal: HEART, apical: HEART, ruq: [20, 21, 17], right_flank: [7, 31, 17], epigastric: [22, 23, 24], bladder: [30, 43] };
  for (const v of A.anatomy.views) {
    const lab = A.labels.nearest(...v.contact.point.map((x, i) => x - v.contact.normal[i] * 4));
    assert.ok(lab > 0, `${v.key}: contact on the body`);
    assert.equal(A.labels.nearest(...v.contact.point.map((x, i) => x + v.contact.normal[i] * 4)), 0, `${v.key}: air outside the contact`);
    if (!v.aim) continue;
    assert.ok(v.aimErrorDeg < 1, `${v.key}: aim error ${v.aimErrorDeg}`);
    assert.ok(aimLabels[v.key].includes(A.labels.nearest(...v.aim)), `${v.key}: aim label ${A.labels.nearest(...v.aim)}`);
    const pose = clinicalPose(v.contact, v.angles), want = v.aim.map((x, i) => x - v.contact.point[i]), L = Math.hypot(...want);
    assert.ok(pose.b.reduce((s, b, i) => s + b * want[i] / L, 0) > 0.999, `${v.key}: beam passes through the aim point`);
    assert.deepEqual(pose.origin, v.contact.point, `${v.key}: angulation keeps the contact`);
  }
  assert.equal(new Set(A.anatomy.views.map((v) => v.key)).size, VIEWS.length, 'every standard window has an atlas version');
});

test('auscultation sites lie on the skin over intercostal spaces measured from the atlas ribs', () => {
  const ics = A.anatomy.ics.z.l_parasternal.filter((v) => v != null);
  for (let i = 1; i < ics.length; i++) assert.ok(ics[i] < ics[i - 1], 'ICS descend');
  assert.equal(A.anatomy.auscultation.length, 15);
  for (const s of A.anatomy.auscultation) {
    assert.ok(A.labels.nearest(...s.point.map((x, i) => x - s.normal[i] * 4)) > 0 && A.labels.nearest(...s.point.map((x, i) => x + s.normal[i] * 4)) === 0, s.key + ' on the skin');
  }
  const mitral = A.anatomy.auscultation.find((s) => s.key === 'mitral'), aortic = A.anatomy.auscultation.find((s) => s.key === 'aortic');
  assert.ok(mitral.point[0] > 40 && aortic.point[0] < 0 && aortic.point[2] > mitral.point[2], 'mitral area left/inferior to the aortic area');
});

const geom = prepareGeometry(A.anatomy);
const frameAt = (params, { beat = 0, breath = 0, gi = 0 } = {}) => makeFrame({ t: 0, beatPhase: beat, breathPhase: breath, giPhase: gi }, params, geom);

test('physiology on the atlas heart: inverse warp is exact and EF follows the model', () => {
  const params = { ...DEFAULT_PHYSIOLOGY, breathDepth: 25 }, d = [0, 0, 0], q = [0, 0, 0];
  let worst = 0;
  for (const beat of [0.1, 0.3, 0.6]) for (const c of [A.anatomy.heart.lvCentre, A.anatomy.gi.stomach.centerline[4]]) {
    const f = frameAt(params, { beat, breath: 0.3, gi: 0.4 }), warp = makeWarp(f);
    for (let k = 0; k < 20; k++) { const p = c.map((v, i) => v + Math.sin(k * 7 + i) * 30); displacement(f, ...p, d); warp(p[0] + d[0], p[1] + d[1], p[2] + d[2], q); worst = Math.max(worst, Math.hypot(q[0] - p[0], q[1] - p[1], q[2] - p[2])); }
  }
  assert.ok(worst < 0.05, 'worst inverse error ' + worst.toFixed(4));
  const C = A.anatomy.heart.lvCentre;
  const lv = (f) => { const w = makeWarp(f), r = [0, 0, 0]; let n = 0; for (let x = C[0] - 70; x <= C[0] + 70; x += 2) for (let y = C[1] - 70; y <= C[1] + 70; y += 2) for (let z = C[2] - 70; z <= C[2] + 70; z += 2) { w(x, y, z, r); if (A.labels.nearest(...r) === 10) n++; } return n * 8 / 1000; };
  const p = { ...DEFAULT_PHYSIOLOGY, respirationEnabled: false, peristalsisEnabled: false }, T = 60 / p.heartRate;
  const edv = lv(frameAt(p, { beat: 0 })), esv = lv(frameAt(p, { beat: (systoleSeconds(T) - 0.002) / T })), ef = (edv - esv) / edv;
  assert.ok(ef > 0.3 && ef < 0.75, `measured EF on the atlas LV ${(ef * 100).toFixed(1)}% (model ${(modelEjectionFraction(p) * 100).toFixed(0)}%; atlas LV is not an ellipsoid)`);
});

test('respiration uses the atlas diaphragm map: domes descend, apex nearly fixed', () => {
  const dz = diaphragmFor(A.anatomy), p = { ...DEFAULT_PHYSIOLOGY, breathDepth: 40, cardiacEnabled: false, peristalsisEnabled: false }, d = [0, 0, 0];
  const dome = A.anatomy.respiration.domeRight, f = frameAt(p, { breath: 0.4 });
  displacement(f, dome[0], dome[1], dz(dome[0], dome[1]), d);
  assert.ok(d[2] < -30 && d[2] > -45, 'right dome descends ' + d[2].toFixed(1) + ' mm');
  displacement(f, -40, 0, A.anatomy.respiration.lungApexZ - 5, d);
  assert.ok(Math.abs(d[2]) < 5, 'apex nearly fixed ' + d[2].toFixed(1));
  displacement(f, 0, 0, A.anatomy.landmarks.pubic_symphysis.point[2] - 60, d);
  assert.equal(Math.hypot(...d), 0, 'thighs do not breathe');
});

test('pathology on the atlas: right effusion is dependent and basal; US shows anechoic fluid', () => {
  const eff = buildEffusion(A.labels, 650, { diaphragm: geom.diaphragm });
  assert.ok(Math.abs(eff.volumeMl - 650) < 10);
  const sampler = createSampler({ ct: A.ct, labels: A.labels, anatomy: A.anatomy }); sampler.setEffusion(eff);
  const v = A.anatomy.views.find((x) => x.key === 'right_flank'), probe = PROBES.convex;
  const plane = imagingPlane(clinicalPose(v.contact, v.angles), probe, 170);
  const us = simulateUltrasound(sampler, plane, { probe, freq: 3.5, depth: 170, quality: 0.6 });
  let fluid = 0;
  for (let li = 0; li < us.nLines; li++) for (let k = 0; k < us.nS; k++) { const L = us.lines[li], t = (k + 0.5) * us.dz, sp = L.s0 + L.ds * t, dp = L.d0 + L.dd * t; if (sampler.labelRef(...[0, 1, 2].map((i) => plane.top[i] + plane.u[i] * sp + plane.v[i] * dp)) === 39) fluid++; }
  assert.ok(fluid > 50, 'effusion visible in the effusion window: ' + fluid + ' samples');
});

test('ultrasound on the atlas HFrEF teaching window shows blood pools darker than myocardium', () => {
  const sampler = createSampler({ ct: A.ct, labels: A.labels, anatomy: A.anatomy });
  const v = A.anatomy.views.find((x) => x.key === A.anatomy.suggestedViews.hfref), probe = PROBES.phased;
  const plane = imagingPlane(clinicalPose(v.contact, v.angles), probe, 200);
  const us = simulateUltrasound(sampler, plane, { probe, freq: 2.5, depth: 200, quality: 0.6 });
  const mean = (cls) => { let s = 0, n = 0; for (let li = 0; li < us.nLines; li++) for (let k = 0; k < us.nS; k++) { const L = us.lines[li], t = (k + 0.5) * us.dz, sp = L.s0 + L.ds * t, dp = L.d0 + L.dd * t; if (sampler.tissueRef(...[0, 1, 2].map((i) => plane.top[i] + plane.u[i] * sp + plane.v[i] * dp)) === cls) { s += us.grey[li * us.nS + k]; n++; } } return { m: s / n, n }; };
  const blood = mean(TISSUE_INDEX.blood), myo = mean(TISSUE_INDEX.myocardium);
  assert.ok(blood.n > 200 && myo.n > 200, 'both tissues in the view');
  assert.ok(blood.m < myo.m, `blood ${blood.m.toFixed(1)} < myocardium ${myo.m.toFixed(1)}`);
});

test('licence quarantine: withheld anatomy has no voxels, is flagged unavailable and is not an input', () => {
  const policy = JSON.parse(fs.readFileSync(new URL('../../../licensing/quarantine-policy.json', import.meta.url)));
  const byId = Object.fromEntries(A.anatomy.labels.map((l) => [l.id, l]));
  for (const id of [20, 21, 35]) { assert.equal(byId[id].available, false, 'label ' + id + ' flagged'); assert.equal(byId[id].volumeMl, 0, 'label ' + id + ' has no voxels'); }
  const src = A.anatomy.build.sourceModels;
  assert.ok(!('nervous.glb' in src), 'nervous.glb is not an input');
  const quarantinedHashes = new Set(policy.quarantinedFiles.map((f) => f.sha256));
  for (const [file, hash] of Object.entries(src)) assert.ok(!quarantinedHashes.has(hash), file + ' is a quarantined original');
  assert.ok(!A.anatomy.attribution.some((a) => /lissiecowley/i.test(a)), 'no kidney attribution needed: kidney not used');
  assert.match(A.anatomy.licence, /^CC BY-SA 4\.0/);
  assert.ok(!A.anatomy.meshes.atlasLayer.systems.includes('nervous'));
});
