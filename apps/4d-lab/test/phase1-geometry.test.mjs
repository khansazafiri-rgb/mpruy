// Phase 1: NRRD geometry, reslicing correctness, clinical + free probe kinematics.
import test from 'node:test';
import assert from 'node:assert/strict';
import { gzipSync } from 'node:zlib';
import { parseNrrd, writeNrrd } from '../src/core/nrrd.js';
import { makeVolume } from '../src/core/volume.js';
import { reslice, rasterHash } from '../src/core/reslice.js';
import { clinicalPose, freePose, freeQuat, freeAngles, FREE_PRESETS, imagingPlane, planePoint, PROBES, rotateFree, baseFrame } from '../src/core/probe.js';
import { dot, cross, len, DEG, mat4Apply, qRotate } from '../src/core/vec.js';
import { rng, close } from './helpers.mjs';

// An oblique, anisotropic grid: IJK axes rotated 30 deg about S, spacing 1.2/0.8/2.0 mm.
const c = Math.cos(30 * DEG), s = Math.sin(30 * DEG);
const AFF = [1.2 * c, -0.8 * s, 0, -40, 1.2 * s, 0.8 * c, 0, -25, 0, 0, 2.0, -30, 0, 0, 0, 1];
const SIZES = [64, 60, 40];
const f = (p) => 2 * p[0] + 3 * p[1] - p[2] + 5; // linear field: trilinear sampling must be exact

function linearVolume() {
  const [nx, ny, nz] = SIZES, data = new Float32Array(nx * ny * nz);
  for (let k = 0; k < nz; k++) for (let j = 0; j < ny; j++) for (let i = 0; i < nx; i++) data[(k * ny + j) * nx + i] = f(mat4Apply(AFF, [i, j, k]));
  return { sizes: SIZES, data, affine: AFF };
}

test('NRRD raw float, affine, values and IJK<->LPS round trip', async () => {
  const src = linearVolume();
  const bytes = writeNrrd({ ...src, type: 'float' });
  const nrrd = await parseNrrd(bytes);
  assert.deepEqual(nrrd.sizes, SIZES);
  assert.ok(nrrd.affine.every((v, i) => close(v, AFF[i], 1e-9)));
  assert.equal(nrrd.space, 'LPS');
  const vol = makeVolume(nrrd);
  const r = rng(7);
  for (let n = 0; n < 200; n++) {
    const ijk = [r() * 63, r() * 59, r() * 39];
    const p = vol.toLPS(ijk), back = vol.toIJK(p);
    assert.ok(back.every((v, i) => close(v, ijk[i], 1e-9)));
    assert.ok(close(vol.sample(...p), f(p), 1e-3), 'trilinear sample equals analytic field');
  }
  assert.ok(Number.isNaN(vol.sample(...vol.toLPS([-1, 3, 3]))), 'outside returns NaN');
  assert.ok(Number.isNaN(vol.sample(...vol.toLPS([3, 3, 39.5]))));
});

test('NRRD gzip, big-endian, RAS conversion, cm units, error cases', async () => {
  const hdr = (extra, enc = 'raw') => `NRRD0004\ntype: short\ndimension: 3\nsizes: 2 2 2\n${extra}encoding: ${enc}\n\n`;
  const be = new Uint8Array(16); for (let i = 0; i < 8; i++) { be[2 * i] = 0; be[2 * i + 1] = i * 10; }
  const big = await parseNrrd(new Uint8Array([...new TextEncoder().encode(hdr('endian: big\nspace: left-posterior-superior\nspace directions: (1,0,0) (0,1,0) (0,0,1)\nspace origin: (0,0,0)\n')), ...be]));
  assert.deepEqual(Array.from(big.data), [0, 10, 20, 30, 40, 50, 60, 70]);
  const le = new Int16Array([1, 2, 3, 4, 5, 6, 7, 8]);
  const ras = await parseNrrd(new Uint8Array([...new TextEncoder().encode(hdr('space: right-anterior-superior\nspace units: "cm" "cm" "cm"\nspace directions: (0.1,0,0) (0,0.2,0) (0,0,0.3)\nspace origin: (1,2,3)\n', 'gzip')), ...gzipSync(Buffer.from(le.buffer))]));
  // RAS (1,2,3) cm -> LPS (-10,-20,30) mm; i axis 1 mm toward Right = -L
  assert.deepEqual(ras.affine.slice(0, 12).map((v) => +v.toFixed(6) + 0), [-1, 0, 0, -10, 0, -2, 0, -20, 0, 0, 3, 30]);
  assert.deepEqual(Array.from(ras.data), [1, 2, 3, 4, 5, 6, 7, 8]);
  await assert.rejects(parseNrrd(new TextEncoder().encode(hdr('') + 'xx')), /Truncated/);
  await assert.rejects(parseNrrd(new TextEncoder().encode('NRRD0004\ntype: short\ndimension: 2\nsizes: 2 2\n\n')), /3D/);
  await assert.rejects(parseNrrd(new TextEncoder().encode('NRRD0004\ntype: short\ndimension: 3\nsizes: 2 2 2\ndata file: x.raw\n\n')), /nhdr/);
  await assert.rejects(parseNrrd(new TextEncoder().encode(hdr('', 'bzip2'))), /encoding/);
});

test('CT reslice is geometrically exact on an oblique grid (axial, coronal, sagittal, oblique)', async () => {
  const vol = makeVolume(await parseNrrd(writeNrrd({ ...linearVolume(), type: 'float' })));
  for (const [name, a] of Object.entries(FREE_PRESETS)) {
    const pose = freePose({ position: [-10, 0, 8], ...a });
    const plane = imagingPlane(pose, PROBES.linear, 40, { width: 30, height: 20 });
    const res = reslice(vol, plane, 30, 20);
    let checked = 0;
    for (let r = 0; r < 20; r++) for (let cc = 0; cc < 30; cc++) {
      const v = res.values[r * 30 + cc];
      const p = planePoint(plane, (cc + 0.5) - 15, r + 0.5);
      if (vol.contains(p)) { assert.ok(close(v, f(p), 1e-3), `${name} pixel ${cc},${r}`); checked++; }
      else assert.ok(Number.isNaN(v));
    }
    assert.ok(checked > 400, name + ' plane mostly inside');
  }
});

test('Clinical mode: contact point is fixed under rotate / heel-toe / rock; frame stays orthonormal', () => {
  const contact = { point: [12, -110, 40], normal: [0.1, -0.98, 0.15] };
  const base = clinicalPose(contact, { rotate: 0, heelToe: 0, rock: 0 });
  const r = rng(3);
  for (let n = 0; n < 300; n++) {
    const ang = { rotate: r() * 360 - 180, heelToe: r() * 140 - 70, rock: r() * 140 - 70 };
    const p = clinicalPose(contact, ang);
    assert.deepEqual(p.origin, contact.point, 'contact unchanged');
    assert.ok(close(len(p.u), 1, 1e-9) && close(len(p.b), 1, 1e-9) && close(len(p.e), 1, 1e-9));
    assert.ok(close(dot(p.u, p.b), 0, 1e-9) && close(dot(p.u, p.e), 0, 1e-9) && close(dot(p.b, p.e), 0, 1e-9));
    assert.ok(close(dot(cross(p.u, p.b), p.e), 1, 1e-9), 'right-handed');
  }
  // rotation 90 = longitudinal: footprint along the cranio-caudal axis
  const lon = clinicalPose({ point: [0, -110, 0], normal: [0, -1, 0] }, { rotate: 90 });
  assert.ok(Math.abs(lon.u[2]) > 0.999, 'longitudinal footprint along S/I');
  const tr = clinicalPose({ point: [0, -110, 0], normal: [0, -1, 0] }, { rotate: 0 });
  assert.ok(tr.u[0] > 0.999, 'transverse: image right = patient left (marker to patient right)');
  // heel-toe tilts the beam inside the image plane; rock tilts it out of plane
  const ht = clinicalPose(contact, { heelToe: 30 }), rk = clinicalPose(contact, { rock: 30 });
  assert.ok(close(Math.acos(dot(ht.b, base.b)) / DEG, 30, 1e-6) && close(dot(ht.e, base.e), 1, 1e-9), 'heel-toe keeps elevation axis');
  assert.ok(close(Math.acos(dot(rk.b, base.b)) / DEG, 30, 1e-6) && close(dot(rk.u, base.u), 1, 1e-9), 'rock keeps footprint axis');
  // limits
  const lim = clinicalPose(contact, { heelToe: 120 });
  assert.ok(close(Math.acos(dot(lim.b, base.b)) / DEG, 70, 1e-6));
  // flank: frame stays well defined where patient-right is along the normal
  const flank = baseFrame([-1, 0, 0]);
  assert.ok(Math.abs(len(flank.u) - 1) < 1e-9 && Math.abs(flank.u[0]) < 1e-6);
});

test('Free 3D mode: 6-DOF presets, numeric angle round trip, rotation about fixed centre', () => {
  const ax = freePose({ position: [0, 0, 0], ...FREE_PRESETS.axial });
  const co = freePose({ position: [0, 0, 0], ...FREE_PRESETS.coronal });
  const sa = freePose({ position: [0, 0, 0], ...FREE_PRESETS.sagittal });
  const near = (a, b) => a.every((v, i) => close(v, b[i], 1e-9));
  assert.ok(near(ax.n, [0, 0, 1]) && near(ax.u, [1, 0, 0]) && near(ax.v, [0, 1, 0]), 'axial: radiological orientation');
  assert.ok(near(co.n, [0, 1, 0]) && near(co.u, [1, 0, 0]) && near(co.v, [0, 0, -1]), 'coronal');
  assert.ok(Math.abs(sa.n[0]) > 0.999 && near(sa.u, [0, 1, 0]) && near(sa.v, [0, 0, -1]), 'sagittal: anterior on image left');
  const r = rng(11);
  for (let n = 0; n < 300; n++) {
    const a = { pitch: r() * 360 - 180, yaw: r() * 170 - 85, roll: r() * 360 - 180 };
    const b = freeAngles(freeQuat(a));
    const qa = freeQuat(a), qb = freeQuat(b);
    for (const v of [[1, 0, 0], [0, 1, 0]]) { const x = qRotate(qa, v), y = qRotate(qb, v); assert.ok(x.every((t, i) => close(t, y[i], 1e-4)), JSON.stringify({ a, b })); }
  }
  // translations are independent of orientation and of each other
  const p1 = freePose({ position: [5, -7, 9], ...FREE_PRESETS.oblique });
  assert.deepEqual(p1.centre, [5, -7, 9]);
  // gizmo rotation about patient axis through the centre keeps the centre
  const q2 = rotateFree(p1.q, [0, 0, 1], 33);
  const p2 = freePose({ position: [5, -7, 9], q: q2 });
  assert.deepEqual(p2.centre, p1.centre);
  assert.ok(close(Math.acos(Math.min(1, dot(p2.n, p1.n))) / DEG <= 33.0001 ? 1 : 0, 1, 0));
});

test('Out-of-volume indication: fraction reflects plane coverage', async () => {
  const vol = makeVolume(await parseNrrd(writeNrrd({ ...linearVolume(), type: 'float' })));
  const plane = (pos) => imagingPlane(freePose({ position: pos, ...FREE_PRESETS.axial }), PROBES.linear, 40, { width: 24, height: 24 });
  assert.equal(reslice(vol, plane(vol.centre), 20, 20).outsideFraction, 0);
  assert.equal(reslice(vol, plane([500, 500, 500]), 20, 20).outsideFraction, 1);
  const above = reslice(vol, plane([vol.centre[0], vol.centre[1], vol.bounds.hi[2] + 1]), 20, 20).outsideFraction;
  assert.equal(above, 1);
  const half = reslice(vol, imagingPlane(freePose({ position: [vol.centre[0], vol.centre[1], vol.bounds.hi[2]], ...FREE_PRESETS.coronal }), PROBES.linear, 40, { width: 40, height: 40 }), 20, 20).outsideFraction;
  assert.ok(half > 0.3 && half < 0.7, 'coronal plane straddling the top edge is about half outside: ' + half);
  // hashing the same raster is stable (used by browser camera-independence tests)
  const a = reslice(vol, plane(vol.centre), 20, 20), b = reslice(vol, plane(vol.centre), 20, 20);
  assert.equal(rasterHash(a.values), rasterHash(b.values));
});
