// UX upgrade: axis-first movement (all six patient directions, axis lock, fixed contact), tri-planar MPR
// geometry, contour alignment on the CT label map in three planes, withheld (licence-quarantined) anatomy,
// learning tasks that are actually solvable on the shipped dataset, credits, and auscultation content.
import test from 'node:test';
import assert from 'node:assert/strict';
import * as THREE from 'three';
import { MeshBVH } from 'three-mesh-bvh';
import { loadAtlasDataset, loadPhantom, rng } from './helpers.mjs';
import { validateRegistration } from '../src/core/mesh.js';
import { clinicalPose, freePose, freeQuat, FREE_PRESETS, imagingPlane, PROBES } from '../src/core/probe.js';
import { translate, rotate, selectSide } from '../src/app/axisMove.js';
import { dragToAmount } from '../src/app/axisControl.js';
import { triPlanes, mprPlane, stepSlice, MPR } from '../src/core/mpr.js';
import { reslice } from '../src/core/reslice.js';
import { labelRaster, pixelToLPS, lpsToPixel, contourSegments, groupRaster } from '../src/core/labels.js';
import { buildGroups, unavailableStructures, STRUCTURES, UNIDENTIFIED } from '../src/edu/structures.js';
import { MODULES } from '../src/edu/modules.js';
import { CREDITS } from '../src/edu/credits.js';
import { SITE_GUIDE } from '../src/edu/auscultationGuide.js';
import { CASES } from '../src/edu/pathologyCases.js';
import { createSampler } from '../src/sim/sampler.js';
import { buildEffusion } from '../src/sim/pathology.js';
import { crackleTrain, wheezeTone } from '../src/sim/auscultation.js';

const A = await loadAtlasDataset();
const { meshes } = await validateRegistration(A.reg, A.ct, A.files);
const geo = new THREE.BufferGeometry();
geo.setAttribute('position', new THREE.BufferAttribute(meshes.skin.lps, 3)); geo.setIndex(new THREE.BufferAttribute(meshes.skin.indices, 1)); geo.computeVertexNormals();
const bvh = new MeshBVH(geo), pos = geo.attributes.position, nrm = geo.attributes.normal, idx = geo.index;
const surf = (point, f) => {
  const a = idx.getX(3 * f), b = idx.getX(3 * f + 1), c = idx.getX(3 * f + 2);
  const tri = new THREE.Triangle(new THREE.Vector3().fromBufferAttribute(pos, a), new THREE.Vector3().fromBufferAttribute(pos, b), new THREE.Vector3().fromBufferAttribute(pos, c));
  const bc = new THREE.Vector3(); tri.getBarycoord(point, bc);
  const n = new THREE.Vector3().fromBufferAttribute(nrm, a).multiplyScalar(bc.x).add(new THREE.Vector3().fromBufferAttribute(nrm, b).multiplyScalar(bc.y)).add(new THREE.Vector3().fromBufferAttribute(nrm, c).multiplyScalar(bc.z)).normalize();
  return { point: point.toArray(), normal: n.toArray() };
};
const env = {
  closestSkin: (p) => { const h = bvh.closestPointToPoint(new THREE.Vector3(...p)); return h ? surf(h.point, h.faceIndex) : null; },
  raySkin: (o, d) => { const h = bvh.raycastFirst(new THREE.Ray(new THREE.Vector3(...o), new THREE.Vector3(...d).normalize()), THREE.DoubleSide); return h ? surf(h.point, h.faceIndex) : null; },
  coverage: A.ct.bounds,
  bodyCentre: A.ct.centre,
};
const state = (mode = 'clinical') => ({
  mode, contact: structuredClone(A.anatomy.views.find((v) => v.key === 'epigastric').contact), angles: { rotate: 0, heelToe: 0, rock: 0 },
  free: { position: [10, 20, -40], q: freeQuat(FREE_PRESETS.axial) }, ctl: { angleClinical: 'rotate', angleFree: 'pitch' },
});
const sub = (a, b) => a.map((v, i) => v - b[i]);

test('all six patient directions: free 3D translates exactly along LPS; nothing else changes', () => {
  const want = { vertical: [0, 0, 1], horizontal: [1, 0, 0], depth: [0, -1, 0] }; // + = superior, patient left, anterior
  for (const [mode, axis] of Object.entries(want)) for (const sign of [1, -1]) {
    const S = state('free'), p0 = [...S.free.position], q0 = [...S.free.q];
    assert.ok(translate(S, mode, sign * 7.5, env).ok);
    assert.deepEqual(sub(S.free.position, p0).map((v) => +v.toFixed(9)), axis.map((v) => +(v * sign * 7.5).toFixed(9)) .map((v) => v === 0 ? 0 : v), `${mode} ${sign}`);
    assert.deepEqual(S.free.q, q0, 'orientation untouched');
  }
});

test('clinical probe: superior/inferior/left/right slide on the skin in the right anatomical direction; angles untouched', () => {
  for (const [mode, i, sign] of [['vertical', 2, 1], ['vertical', 2, -1], ['horizontal', 0, 1], ['horizontal', 0, -1]]) {
    const S = state(), p0 = [...S.contact.point], a0 = { ...S.angles };
    const r = translate(S, mode, sign * 20, env);
    assert.ok(r.ok, r.error);
    const d = sub(S.contact.point, p0);
    assert.ok(d[i] * sign > 15, `${mode} ${sign > 0 ? '+' : '−'}: moved ${d[i].toFixed(1)} mm along axis ${i}`);
    for (const j of [0, 2].filter((j) => j !== i)) assert.ok(Math.abs(d[j]) < 4, `${mode}: off-axis drift ${d[j].toFixed(1)} mm`);
    assert.ok(A.labels.nearest(...S.contact.point.map((v, k) => v - S.contact.normal[k] * 3)) > 0, 'contact stays on the body surface');
    assert.deepEqual(S.angles, a0);
  }
  // depth in clinical mode never pushes the probe through the body
  const S = state(), c0 = structuredClone(S.contact);
  const r = translate(S, 'depth', 30, env);
  assert.equal(r.ok, false); assert.deepEqual(S.contact, c0);
});

test('clinical anterior/posterior/left/right is an explicit body-side selection on the skin at the same height', () => {
  for (const [side, test0] of [['posterior', (n) => n[1] > 0.5], ['anterior', (n) => n[1] < -0.5], ['left', (n) => n[0] > 0.5], ['right', (n) => n[0] < -0.5]]) {
    const S = state(), z0 = S.contact.point[2];
    const r = selectSide(S, side, env);
    assert.ok(r.ok, r.error);
    assert.ok(test0(S.contact.normal), `${side}: outward normal ${S.contact.normal.map((v) => v.toFixed(2))}`);
    assert.ok(Math.abs(S.contact.point[2] - z0) < 1e-6, 'same height');
  }
});

test('rotation changes exactly one angle and never moves the contact point (clinical); free rotation keeps the plane centre', () => {
  for (const k of ['rotate', 'heelToe', 'rock']) {
    const S = state(); S.ctl.angleClinical = k;
    const c0 = JSON.stringify(S.contact), o0 = clinicalPose(S.contact, S.angles).origin;
    rotate(S, 12);
    assert.equal(JSON.stringify(S.contact), c0);
    assert.deepEqual(clinicalPose(S.contact, S.angles).origin, o0, 'pose origin = contact (pivot)');
    for (const j of ['rotate', 'heelToe', 'rock']) assert.equal(S.angles[j], j === k ? 12 : 0);
  }
  const S = state(); S.ctl.angleClinical = 'heelToe'; const r = rotate(S, 500); assert.equal(r.ok, false, 'limit reported');
  const F = state('free'); const p0 = [...F.free.position]; rotate(F, 20);
  assert.deepEqual(F.free.position, p0); assert.notDeepEqual(F.free.q, freeQuat(FREE_PRESETS.axial));
});

test('camera independence: dragging toward the on-screen arrow always moves +axis, from 200 random camera orientations', () => {
  const R = rng(7);
  for (let k = 0; k < 200; k++) {
    const cam = new THREE.PerspectiveCamera(45, 1.5, 1, 5000);
    cam.position.set((R() - 0.5) * 2000, (R() - 0.5) * 2000, (R() - 0.5) * 2000); cam.lookAt(0, 0, 0); cam.updateMatrixWorld(); cam.updateProjectionMatrix();
    const scr = (p) => { const v = new THREE.Vector3(...p).project(cam); return [(v.x + 1) * 600, (1 - v.y) * 400]; };
    for (const axis of [[0, 0, 1], [1, 0, 0], [0, -1, 0]]) {
      const a = scr([0, 0, 0]), b = scr(axis.map((v) => v * 50)), sa = [(b[0] - a[0]) / 50, (b[1] - a[1]) / 50];
      const L = Math.hypot(...sa); if (L * 50 < 12) continue; // seen end-on: separate, tested fallback
      const toward = [sa[0] / L * 40, sa[1] / L * 40];
      assert.ok(dragToAmount(toward[0], toward[1], sa).amount > 0);
      assert.ok(dragToAmount(-toward[0], -toward[1], sa).amount < 0);
    }
  }
});

test('tri-planar MPR: orthonormal patient planes through one crosshair point, radiological orientation, slice stepping', () => {
  const p = [12, -20, -60], P = triPlanes(p, A.ct.bounds);
  for (const [k, pl] of Object.entries(P)) {
    const d = (a, b) => a[0] * b[0] + a[1] * b[1] + a[2] * b[2];
    assert.ok(Math.abs(d(pl.u, pl.v)) < 1e-9 && Math.abs(d(pl.u, pl.n)) < 1e-9 && Math.abs(d(pl.v, pl.n)) < 1e-9);
    const off = d(sub(p, pl.top), pl.n); assert.ok(Math.abs(off) < 1e-9, `${k}: crosshair lies on the plane`);
    const px = lpsToPixel(pl, 300, 300, p); const back = pixelToLPS(pl, 300, 300, px.px, px.py);
    assert.ok(Math.hypot(...sub(back, p)) < 1e-6, `${k}: pixel <-> LPS round trip`);
    assert.ok(px.px > 0 && px.px < 300 && px.py > 0 && px.py < 300, `${k}: crosshair inside the image`);
  }
  assert.deepEqual(P.ax.u, [1, 0, 0], 'axial: patient left on screen right'); assert.deepEqual(P.ax.v, [0, 1, 0], 'axial: anterior at top');
  assert.deepEqual(P.co.v, [0, 0, -1], 'coronal: superior at top'); assert.deepEqual(P.sa.u, [0, 1, 0], 'sagittal: anterior on screen left');
  const q = stepSlice(p, 'ax', 2.5, A.ct.bounds); assert.deepEqual(sub(q, p), [0, 0, 2.5]);
  const far = stepSlice(p, 'co', 1e5, A.ct.bounds); assert.equal(far[1], A.ct.bounds.hi[1], 'clamped to CT');
  assert.equal(mprPlane('sa', p, A.ct.bounds).mode, 'mpr');
});

test('contours align with the CT label map in axial, coronal and sagittal MPR planes', () => {
  const sampler = createSampler({ ct: A.ct, labels: A.labels, anatomy: A.anatomy });
  const G = buildGroups(A.anatomy.labels), lc = A.anatomy.heart.lvCentre;
  for (const k of Object.keys(MPR)) {
    const pl = mprPlane(k, lc, A.ct.bounds), n = 160;
    const res = reslice({ sample: sampler.ct }, pl, n, n, { clipToFov: false, both: (x, y, z, o) => sampler.both(x, y, z, o) });
    const groups = groupRaster(res.labels, G.lut), C = contourSegments(groups, n, n, { minArea: 6 });
    assert.ok(C.size >= 5, `${k}: several structures outlined (${C.size})`);
    for (const [g, seg] of C) {
      for (let i = 0; i < seg.length; i += 2) {
        const x = seg[i], y = seg[i + 1];
        // every contour vertex lies on a pixel edge between pixel centres, with pixel g on one side and not-g on the other
        const fx = x - Math.floor(x), fy = y - Math.floor(y);
        assert.ok((Math.abs(fx - 0.5) < 1e-6) !== (Math.abs(fy - 0.5) < 1e-6) || (Math.abs(fx) < 1e-6 || Math.abs(fy) < 1e-6), 'half-pixel vertex');
        const nb = Math.abs(fx) < 1e-6 ? [[x - 0.5, y], [x + 0.5, y]] : [[x, y - 0.5], [x, y + 0.5]];
        const at = (q) => { const c = Math.floor(q[0]), r = Math.floor(q[1]); return c >= 0 && r >= 0 && c < n && r < n ? groups[r * n + c] : 0; };
        assert.ok((at(nb[0]) === g) !== (at(nb[1]) === g), `${k}: vertex (${x},${y}) separates group ${g}`);
      }
    }
    // the raster is the label volume sampled at the pixel centres (no offset)
    for (const [c, r] of [[20, 30], [80, 80], [120, 60]]) {
      const p = pixelToLPS(pl, n, n, c + 0.5, r + 0.5), l = A.labels.nearest(...p);
      assert.equal(res.labels[r * n + c], l < 0 ? 254 : l);
    }
  }
});

test('licence quarantine: kidney, renal pelvis and spinal cord are never identifiable in the atlas dataset and are reported', () => {
  const G = buildGroups(A.anatomy.labels);
  for (const id of [20, 21, 35]) assert.equal(G.lut[id], 0, 'label ' + id + ' not identifiable');
  assert.ok(!G.keys.includes('kidney') && !G.keys.includes('cord'));
  const off = unavailableStructures(A.anatomy).map((u) => u.key).sort();
  assert.deepEqual(off, ['cord', 'kidney']);
  for (const u of unavailableStructures(A.anatomy)) assert.match(u.reason, /lisensi/);
  assert.ok(UNIDENTIFIED[2], 'unlabelled soft tissue is shown as unidentified, never named');
});

test('procedural phantom keeps its own (original) kidney: availability is per dataset, not global', async () => {
  const P = await loadPhantom();
  assert.ok(buildGroups(P.anatomy.labels).keys.includes('kidney'));
  assert.deepEqual(unavailableStructures(P.anatomy), []);
});

/** Headless replica of the learner's view for a task's setup (same planes and rasters the app uses). */
function snapshotFor(setup, ds = A) {
  const sampler = createSampler({ ct: ds.ct, labels: ds.labels, anatomy: ds.anatomy });
  if (setup.scenario === 'effusion') sampler.setEffusion(buildEffusion(ds.labels, 650, {}));
  const G = buildGroups(ds.anatomy.labels);
  let plane, probe = null;
  if (setup.view) {
    const v = ds.anatomy.views.find((x) => x.key === setup.view);
    probe = PROBES[{ ruq: 'convex', bladder: 'convex', subxiphoid: 'phased', right_flank: 'convex', epigastric: 'convex' }[setup.view] || 'convex'];
    plane = imagingPlane(clinicalPose(v.contact, v.angles), probe, probe.defaultDepth);
  } else {
    const st = STRUCTURES[setup.at], set = new Set(st.labels), [nx, ny, nz] = ds.labels.sizes, a = ds.labels.affine, c = [0, 0, 0]; let n = 0;
    for (let k = 0; k < nz; k += 2) for (let j = 0; j < ny; j += 2) for (let i = 0; i < nx; i += 2) if (set.has(ds.labels.data[(k * ny + j) * nx + i])) { c[0] += a[0] * i + a[1] * j + a[2] * k + a[3]; c[1] += a[4] * i + a[5] * j + a[6] * k + a[7]; c[2] += a[8] * i + a[9] * j + a[10] * k + a[11]; n++; }
    plane = imagingPlane(freePose({ position: c.map((v) => v / n), q: freeQuat(FREE_PRESETS[setup.free]) }), null, 0, { width: 260, height: 260 });
  }
  const W = 300, H = Math.round(W * plane.height / plane.width);
  const lab = labelRaster((x, y, z) => sampler.label(x, y, z), plane, W, H, { clipToFov: !!setup.view });
  const areas = new Map(); for (const l of lab) { const g = G.lut[l]; if (g) areas.set(G.keyOf(g), (areas.get(G.keyOf(g)) || 0) + 1); }
  const mid = plane.top.map((v, i) => v + plane.v[i] * plane.height * 0.5), cl = sampler.label(...mid);
  return { plane, visible: areas, centreKey: G.keyOf(G.lut[cl] || 0), site: null, filter: 'diaphragm', scenario: setup.scenario || 'normal', W, H };
}

test('every navigate/place/identify task with a setup is solvable on the atlas dataset (no task needs withheld anatomy)', () => {
  for (const m of MODULES) for (const t of m.tasks) {
    const json = JSON.stringify(t.setup || {}) + (t.target || '');
    assert.ok(!/kidney|cord/.test(json), `${t.id} must not depend on withheld anatomy`);
    if (!t.setup || !(t.setup.free || t.setup.view)) continue;
    const st = snapshotFor(t.setup);
    if (t.check) assert.ok(t.check(st), `${t.id}: check fails right after its own setup (visible: ${[...st.visible].map(([k, v]) => k + ':' + v).join(', ')}; centre ${st.centreKey})`);
    if (t.type === 'identify') assert.ok((st.visible.get(t.target) || 0) > 30, `${t.id}: target ${t.target} visible after setup`);
  }
});

test('credits, pathology cases and auscultation guide are complete and honest', () => {
  assert.ok(CREDITS.some((c) => c.status === 'restricted' && /nervous\.glb/.test(c.source)), 'withheld assets are listed as withheld');
  assert.ok(!CREDITS.some((c) => c.status === 'verified' && /lissiecowley|Brainder/i.test(c.source + c.what)));
  assert.ok(CREDITS.some((c) => /BodyParts3D/.test(c.source) && /BY-SA/.test(c.licence)));
  for (const s of A.anatomy.auscultation) assert.ok(SITE_GUIDE[s.key], 'guide for site ' + s.key);
  for (const [k, c] of Object.entries(CASES)) {
    for (const f of ['context', 'baseline', 'mechanism', 'findings', 'differentials', 'limitations', 'refs']) assert.ok(c[f]?.length, `${k}.${f}`);
    assert.ok(c.findings.some(([fid]) => fid === 'absent'), `${k}: lists what is NOT simulated`);
  }
  const cr = crackleTrain({ period: 4, sampleRate: 8000, seed: 3 }), wz = wheezeTone({ period: 4, sampleRate: 8000 });
  assert.deepEqual(cr, crackleTrain({ period: 4, sampleRate: 8000, seed: 3 }), 'deterministic');
  assert.ok(Math.max(...cr.map(Math.abs)) <= 3 && Math.max(...wz.map(Math.abs)) <= 1.01, 'bounded');
  assert.equal(wz.slice(0, Math.floor(0.44 * wz.length)).some((v) => v !== 0), false, 'wheeze only in expiration');
});
