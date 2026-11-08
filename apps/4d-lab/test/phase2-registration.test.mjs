// Phase 2: the CT-derived skin/organ meshes are registered to the CT and anatomically placed.
import test from 'node:test';
import assert from 'node:assert/strict';
import { validateRegistration, parseGLB } from '../src/core/mesh.js';
import { loadPhantom } from './helpers.mjs';
import { cross, sub, norm, add, scale } from '../src/core/vec.js';

test('registration package validates against its own CT (affine, probes, SHA-256, anchors)', async () => {
  const { ct, reg, files } = await loadPhantom();
  const res = await validateRegistration(reg, ct, files);
  assert.deepEqual(res.errors, []);
  assert.ok(res.meshes.skin && res.meshes.heart && res.meshes.liver && res.meshes.lung_r);
});

test('tampered mesh, wrong CT geometry and wrong CT values are rejected', async () => {
  const { ct, reg, files } = await loadPhantom();
  const bad = files['skin.glb'].slice(0); new Uint8Array(bad)[bad.byteLength - 5] ^= 0xff;
  assert.match((await validateRegistration(reg, ct, { ...files, 'skin.glb': bad })).errors.join(), /SHA-256/);
  const shifted = { ...reg, ijkToLPS: reg.ijkToLPS.map((v, i) => (i === 3 ? v + 1 : v)) };
  assert.match((await validateRegistration(shifted, ct, files)).errors.join(), /Affine/);
  const otherCt = { ...ct, data: ct.data.map((v) => v + 7) };
  assert.match((await validateRegistration(reg, otherCt, files)).errors.join(), /probes/);
  assert.throws(() => parseGLB(new ArrayBuffer(40)), /GLB/);
});

test('skin mesh sits on the CT body boundary: air outside, tissue inside (>=97% of vertices)', async () => {
  const { ct, reg, files } = await loadPhantom();
  const { meshes } = await validateRegistration(reg, ct, files);
  const { lps, indices } = meshes.skin;
  const nv = lps.length / 3, normals = new Float32Array(lps.length);
  const P = (i) => [lps[3 * i], lps[3 * i + 1], lps[3 * i + 2]];
  for (let t = 0; t < indices.length; t += 3) {
    const [a, b, c] = [indices[t], indices[t + 1], indices[t + 2]];
    const n = cross(sub(P(b), P(a)), sub(P(c), P(a)));
    for (const i of [a, b, c]) { normals[3 * i] += n[0]; normals[3 * i + 1] += n[1]; normals[3 * i + 2] += n[2]; }
  }
  let ok = 0, tested = 0;
  const zlo = ct.bounds.lo[2] + 8;
  for (let i = 0; i < nv; i += 7) {
    const p = P(i);
    if (p[2] < zlo) continue; // artificial acquisition cap at the thighs
    const n = norm([normals[3 * i], normals[3 * i + 1], normals[3 * i + 2]]);
    const out = ct.sample(...add(p, scale(n, 5))), inn = ct.sample(...add(p, scale(n, -5)));
    tested++;
    if ((Number.isNaN(out) || out < -600) && inn > -300) ok++;
  }
  assert.ok(ok / tested >= 0.97, `registered fraction ${(ok / tested).toFixed(3)} of ${tested}`);
});

test('anatomical placement of organs in patient LPS space', async () => {
  const { ct, reg, files, anatomy } = await loadPhantom();
  const { meshes } = await validateRegistration(reg, ct, files);
  const centroid = (m) => { const c = [0, 0, 0]; for (let i = 0; i < m.lps.length; i += 3) { c[0] += m.lps[i]; c[1] += m.lps[i + 1]; c[2] += m.lps[i + 2]; } return c.map((v) => v / (m.lps.length / 3)); };
  const heart = centroid(meshes.heart), liver = centroid(meshes.liver), spleen = centroid(meshes.spleen), stomach = centroid(meshes.stomach), bladder = centroid(meshes.bladder);
  const lr = centroid(meshes.lung_r), ll = centroid(meshes.lung_l), brain = centroid(meshes.brain);
  assert.ok(heart[0] > 0, 'heart centroid left of midline');
  assert.ok(liver[0] < -20 && spleen[0] > 60 && stomach[0] > 0, 'liver right, spleen + stomach left');
  assert.ok(lr[0] < 0 && ll[0] > 0 && lr[2] > liver[2], 'lungs above liver, right/left correct');
  assert.ok(brain[2] > heart[2] && heart[2] > liver[2] && liver[2] > bladder[2], 'cranio-caudal order');
  assert.ok(heart[1] < 30 && spleen[1] > 30, 'heart anterior to spleen');
  const site = Object.fromEntries(anatomy.auscultation.map((s) => [s.key, s]));
  assert.ok(site.mitral.point[0] > site.tricuspid.point[0] && site.aortic.point[0] < 0 && site.pulmonic.point[0] > 0);
  assert.ok(site.lung_post_r.point[1] > 50 && site.lung_lat_l.point[0] > 100, 'posterior and lateral sites reach the right surfaces');
  assert.ok(anatomy.labels.find((l) => l.key === 'skin').volumeMl > 500);
});
