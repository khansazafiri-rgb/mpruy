// Anatomy-assistance geometry: label rasters use the same pixel grid as the CT/US renderers, contours
// trace label boundaries with sub-pixel vertices, and axis-first movement is camera independent.
import test from 'node:test';
import assert from 'node:assert/strict';
import * as THREE from 'three';
import { MeshBVH } from 'three-mesh-bvh';
import { labelRaster, pixelToLPS, lpsToPixel, contourSegments, groupRaster, OUTSIDE_FOV } from '../src/core/labels.js';
import { reslice } from '../src/core/reslice.js';
import { freePose, freeQuat, FREE_PRESETS, imagingPlane, clinicalPose, PROBES } from '../src/core/probe.js';
import { dragToAmount, slideOnSkin, CONTROL_MODES } from '../src/app/axisControl.js';
import { buildGroups, STRUCTURES } from '../src/edu/structures.js';
import { loadAtlasDataset } from './helpers.mjs';
import { createSampler } from '../src/sim/sampler.js';

const A = await loadAtlasDataset();

test('label raster pixels map to the same LPS points as the CT reslice (axial, coronal, sagittal, oblique)', () => {
  const sampler = createSampler({ ct: A.ct, labels: A.labels, anatomy: A.anatomy });
  for (const k of ['axial', 'coronal', 'sagittal', 'oblique']) {
    const plane = imagingPlane(freePose({ position: A.anatomy.heart.lvCentre, q: freeQuat(FREE_PRESETS[k]) }), null, 0, { width: 300, height: 240 });
    const cols = 150, rows = 120;
    // CT reslice and label raster built from one combined sampler: labels must come from the same points
    const seen = [];
    const ct = reslice({ sample: (x, y, z) => { seen.push([x, y, z]); return A.ct.sample(x, y, z); } }, plane, cols, rows, { clipToFov: true });
    const lab = labelRaster((x, y, z) => sampler.label(x, y, z), plane, cols, rows);
    let i = 0;
    for (let r = 0; r < rows; r++) for (let c = 0; c < cols; c++) {
      const p = pixelToLPS(plane, cols, rows, c + 0.5, r + 0.5), q = seen[i++];
      assert.ok(Math.hypot(p[0] - q[0], p[1] - q[1], p[2] - q[2]) < 1e-6, `${k}: pixel ${c},${r}`);
      const back = lpsToPixel(plane, cols, rows, p);
      assert.ok(Math.abs(back.px - c - 0.5) < 1e-6 && Math.abs(back.py - r - 0.5) < 1e-6 && Math.abs(back.offPlaneMM) < 1e-6);
    }
    assert.equal(ct.values.length, lab.length);
    assert.ok(lab.some((l) => l === 10 || l === 9), `${k}: heart labels present at the LV centre`);
  }
});

test('ultrasound field of view clips the label raster exactly like the scan converter', () => {
  const sampler = createSampler({ ct: A.ct, labels: A.labels, anatomy: A.anatomy });
  const v = A.anatomy.views.find((x) => x.key === 'subxiphoid'), probe = PROBES.phased;
  const plane = imagingPlane(clinicalPose(v.contact, v.angles), probe, 200); plane.probe = probe;
  const lab = labelRaster((x, y, z) => sampler.label(x, y, z), plane, 120, 120);
  assert.equal(lab[0], OUTSIDE_FOV, 'top-left corner of a sector is outside the fan');
  assert.notEqual(lab[60 * 120 + 60], OUTSIDE_FOV, 'image centre is inside the fan');
});

test('contours: square and L-shaped regions give closed boundaries at pixel-edge midpoints', () => {
  const cols = 8, rows = 6, g = new Uint8Array(cols * rows);
  for (let r = 1; r <= 3; r++) for (let c = 2; c <= 4; c++) g[r * cols + c] = 1; // 3x3 block
  g[4 * cols + 2] = 2; // single pixel of group 2 adjacent below
  const seg = contourSegments(g, cols, rows, { minArea: 1 });
  const s1 = seg.get(1); assert.ok(s1);
  // boundary length of a 3x3 block traced through pixel-centre midpoints = 12 pixel units
  let len = 0, xs = [], ys = [];
  for (let i = 0; i < s1.length; i += 4) { len += Math.hypot(s1[i + 2] - s1[i], s1[i + 3] - s1[i + 1]); xs.push(s1[i], s1[i + 2]); ys.push(s1[i + 1], s1[i + 3]); }
  assert.ok(Math.abs(len - (8 + 4 * Math.SQRT1_2)) < 1e-6 || Math.abs(len - 12) < 1e-6, 'perimeter ' + len);
  assert.equal(Math.min(...xs), 2); assert.equal(Math.max(...xs), 5); assert.equal(Math.min(...ys), 1); assert.equal(Math.max(...ys), 4);
  // every vertex appears exactly twice (closed loop)
  const count = new Map(); for (let i = 0; i < s1.length; i += 2) { const k = s1[i] + ',' + s1[i + 1]; count.set(k, (count.get(k) || 0) + 1); }
  assert.ok([...count.values()].every((n) => n === 2), 'closed');
  assert.ok(seg.get(2), 'small adjacent structure kept as its own contour');
  assert.equal(contourSegments(g, cols, rows, { minArea: 3 }).get(2), undefined, 'tiny regions can be suppressed');
});

test('structure registry: every dataset label is either a named structure or explicitly unidentified', async () => {
  const { UNIDENTIFIED } = await import('../src/edu/structures.js');
  const G = buildGroups(A.anatomy.labels);
  for (const l of A.anatomy.labels) {
    const named = G.lut[l.id] > 0, unknown = l.id in UNIDENTIFIED;
    assert.ok(named !== unknown || l.id === 0, `label ${l.id} ${l.key}: named ${named}, unidentified ${unknown}`);
  }
  for (const [k, s] of Object.entries(STRUCTURES)) {
    assert.ok(s.nameId && s.nameEn && s.ta && s.system && s.color && s.card, k);
    assert.ok(Array.isArray(s.card.refs) && s.card.refs.length, k + ' has references');
  }
  const ls = groupRaster(Uint8Array.from([17, 2, 10, 0]), G.lut);
  assert.equal(G.keyOf(ls[0]), 'liver'); assert.equal(ls[1], 0); assert.equal(G.keyOf(ls[2]), 'lv'); assert.equal(ls[3], 0);
});

test('axis drag follows the on-screen arrow, so camera rotation never reverses anatomical meaning', () => {
  // +S drawn pointing up on screen (screen y grows downward)
  assert.ok(dragToAmount(0, -30, [0, -2]).amount > 0, 'drag up along an upward arrow = superior');
  // camera rotated 180°: +S now points down on screen; dragging toward the arrow (down) is still +S
  assert.ok(dragToAmount(0, 30, [0, 2]).amount > 0);
  assert.ok(dragToAmount(0, -30, [0, 2]).amount < 0);
  // axis seen end-on: vertical drag fallback, flagged
  const d = dragToAmount(5, -20, [0.01, 0.02]); assert.ok(d.degenerate && d.amount > 0);
  assert.deepEqual(Object.keys(CONTROL_MODES), ['place', 'vertical', 'horizontal', 'depth', 'rotate', 'camera']);
});

test('clinical sliding stays on the atlas skin, keeps contact on the surface, and refuses jumps', async () => {
  const { validateRegistration } = await import('../src/core/mesh.js');
  const { meshes } = await validateRegistration(A.reg, A.ct, A.files);
  const geo = new THREE.BufferGeometry(); geo.setAttribute('position', new THREE.BufferAttribute(meshes.skin.lps, 3)); geo.setIndex(new THREE.BufferAttribute(meshes.skin.indices, 1)); geo.computeVertexNormals();
  const bvh = new MeshBVH(geo), nrm = geo.attributes.normal, pos = geo.attributes.position, idx = geo.index;
  const closest = (p) => {
    const hit = bvh.closestPointToPoint(new THREE.Vector3(...p)); if (!hit) return null;
    const f = hit.faceIndex, a = idx.getX(3 * f), b = idx.getX(3 * f + 1), c = idx.getX(3 * f + 2);
    const tri = new THREE.Triangle(new THREE.Vector3().fromBufferAttribute(pos, a), new THREE.Vector3().fromBufferAttribute(pos, b), new THREE.Vector3().fromBufferAttribute(pos, c));
    const bc = new THREE.Vector3(); tri.getBarycoord(hit.point, bc);
    const n = new THREE.Vector3().fromBufferAttribute(nrm, a).multiplyScalar(bc.x).add(new THREE.Vector3().fromBufferAttribute(nrm, b).multiplyScalar(bc.y)).add(new THREE.Vector3().fromBufferAttribute(nrm, c).multiplyScalar(bc.z)).normalize();
    return { point: hit.point.toArray(), normal: n.toArray() };
  };
  let contact = A.anatomy.views.find((v) => v.key === 'epigastric').contact;
  const start = [...contact.point];
  for (let i = 0; i < 20; i++) { const r = slideOnSkin({ contact, axis: [0, 0, 1], mm: 2, closest, coverage: A.ct.bounds }); assert.ok(r.contact, r.error); contact = r.contact; }
  assert.ok(Math.abs(contact.point[2] - start[2] - 40) < 4, 'moved ≈40 mm superior: ' + (contact.point[2] - start[2]).toFixed(1));
  assert.ok(Math.abs(contact.point[0] - start[0]) < 3, 'left-right unchanged');
  assert.ok(contact.normal[1] < -0.6, 'still on the anterior surface');
  const lab = A.labels.nearest(...contact.point.map((v, i) => v - contact.normal[i] * 3));
  assert.ok(lab > 0, 'contact sits on the body surface');
  // pushing the contact THROUGH the body toward the back must never teleport it to the posterior skin
  const through = slideOnSkin({ contact, axis: [0, 1, 0], mm: 220, closest });
  assert.ok(through.error, 'through-body movement refused (use side selection instead)');
  // outside the CT box: refused with an explanation
  const out = slideOnSkin({ contact: { point: [0, -110, A.ct.bounds.lo[2] + 3], normal: [0, -1, 0] }, axis: [0, 0, -1], mm: 10, closest, coverage: A.ct.bounds });
  assert.match(out.error || '', /cakupan CT|Kulit berbelok/);
});
