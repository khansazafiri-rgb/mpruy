// Probe and imaging-plane kinematics. Pure functions; no camera or rendering state.
//
// Clinical mode: the probe touches the skin at a contact point (stored in reference
// anatomy coordinates). Rotation, heel-toe and rock are intrinsic rotations about the
// CONTACT POINT, so angulation never moves the contact.
// Free mode: an unconstrained 6-DOF rectangle (position + orientation) in patient space.
import { DEG, add, cross, dot, madd, norm, projectOnPlane, qAxis, qMul, qRotate, scale, smoothstep, clamp } from './vec.js';

export const PATIENT = { L: [1, 0, 0], R: [-1, 0, 0], P: [0, 1, 0], A: [0, -1, 0], S: [0, 0, 1], I: [0, 0, -1] };

export const PROBES = {
  linear: { key: 'linear', label: 'Linear (L12-5)', geometry: 'linear', aperture: 38, freq: [5, 15], defaultFreq: 9, depth: [20, 90], defaultDepth: 45, lines: 128 },
  convex: { key: 'convex', label: 'Curvilinear (C5-2)', geometry: 'convex', radius: 50, fov: 66, freq: [2, 6], defaultFreq: 3.5, depth: [60, 260], defaultDepth: 160, lines: 160 },
  phased: { key: 'phased', label: 'Phased array (P4-1)', geometry: 'sector', aperture: 18, fov: 84, freq: [1.5, 5], defaultFreq: 2.5, depth: [60, 240], defaultDepth: 150, lines: 128 },
};

export const CLINICAL_LIMITS = { heelToe: 70, rock: 70 };

/**
 * Reference footprint frame on the skin before angulation.
 * Rotation 0 = transverse, probe marker toward the patient's right (image left = patient right).
 * On the flanks, where "patient right" is along the normal, the marker blends smoothly toward anterior.
 */
export function baseFrame(normal) {
  const n = norm(normal);
  const w = smoothstep(0.55, 0.92, Math.abs(n[0]));
  const ref = add(scale(PATIENT.R, 1 - w), scale(PATIENT.A, w));
  let marker = projectOnPlane(ref, n);
  if (Math.hypot(...marker) < 1e-3) marker = projectOnPlane(PATIENT.S, n);
  marker = norm(marker);
  const b = scale(n, -1); // beam axis into the body
  const u = scale(marker, -1); // image +x runs away from the marker
  const e = cross(u, b); // elevation (slice thickness) axis
  return { u, b, e };
}

/**
 * Clinical pose at a fixed contact point.
 * angles: rotate (about beam axis), heelToe (in-plane, about elevation axis),
 * rock (out-of-plane fan, about footprint axis), degrees.
 */
export function clinicalPose(contact, angles, { limits = CLINICAL_LIMITS } = {}) {
  const f = baseFrame(contact.normal);
  const rot = (angles.rotate || 0) * DEG;
  const ht = clamp(angles.heelToe || 0, -limits.heelToe, limits.heelToe) * DEG;
  const rk = clamp(angles.rock || 0, -limits.rock, limits.rock) * DEG;
  const q1 = qAxis(f.b, rot);
  const e1 = qRotate(q1, f.e);
  const q2 = qMul(qAxis(e1, ht), q1);
  const u2 = qRotate(q2, f.u);
  const q3 = qMul(qAxis(u2, rk), q2);
  const u = norm(qRotate(q3, f.u)), b = norm(qRotate(q3, f.b)), e = norm(qRotate(q3, f.e));
  return { origin: [...contact.point], u, b, e, q: q3, contactNormal: norm(contact.normal), mode: 'clinical' };
}

// ------------------------------------------------------------------ free 3D mode
// Orientation q = qL(pitch) * qS(yaw) * qP(roll) applied to the axial base frame
// (image right = patient left, image down = posterior, normal = superior).
export const FREE_PRESETS = {
  axial: { pitch: 0, yaw: 0, roll: 0 },
  coronal: { pitch: -90, yaw: 0, roll: 0 },
  sagittal: { pitch: -90, yaw: 0, roll: -90 },
  oblique: { pitch: -60, yaw: 25, roll: -20 },
};

export function freeQuat({ pitch = 0, yaw = 0, roll = 0 }) {
  return qMul(qAxis(PATIENT.L, pitch * DEG), qMul(qAxis(PATIENT.S, yaw * DEG), qAxis(PATIENT.P, roll * DEG)));
}

/** Decompose a free-mode quaternion back to (pitch, yaw, roll) degrees. */
export function freeAngles(q) {
  const ux = qRotate(q, [1, 0, 0]), uy = qRotate(q, [0, 1, 0]), uz = qRotate(q, [0, 0, 1]);
  // R columns are images of basis vectors: R[r][c] = col_c[r]
  const R = (r, c) => [ux, uy, uz][c][r];
  const sy = clamp(-R(0, 1), -1, 1);
  const yaw = Math.asin(sy);
  let pitch, roll;
  if (Math.abs(Math.cos(yaw)) > 1e-6) {
    pitch = Math.atan2(R(2, 1), R(1, 1));
    roll = Math.atan2(R(0, 2), R(0, 0));
  } else {
    roll = 0;
    pitch = Math.atan2(-R(1, 2), R(1, 0) * Math.sign(sy));
  }
  const r = (v) => Math.round(v / DEG * 1000) / 1000 + 0;
  return { pitch: r(pitch), yaw: r(yaw), roll: r(roll) };
}

export function freePose(state) {
  const q = state.q || freeQuat(state);
  const u = norm(qRotate(q, PATIENT.L)), v = norm(qRotate(q, PATIENT.P)), n = norm(qRotate(q, PATIENT.S));
  return { centre: [...state.position], u, v, n, q, mode: 'free' };
}

/** Rotate a free pose about a patient-space axis through its centre (gizmo ring drag). */
export function rotateFree(q, axis, deg) {
  return qMul(qAxis(axis, deg * DEG), q);
}

// ------------------------------------------------------------------ imaging plane
/**
 * Unified imaging plane used by CT reslice and ultrasound.
 * Clinical: the transducer face is at the contact; image rows run along the beam.
 * Free: the rectangle is centred on the pose centre; a virtual transducer sits on its top edge.
 */
export function imagingPlane(pose, probe, depth, freeSize = { width: 220, height: 220 }) {
  if (pose.mode === 'free') {
    const top = madd(pose.centre, pose.v, -freeSize.height / 2);
    return { mode: 'free', top, u: pose.u, v: pose.v, n: pose.n, width: freeSize.width, height: freeSize.height, depth: freeSize.height, probe, centre: pose.centre };
  }
  const g = probe.geometry;
  let width;
  if (g === 'linear') width = probe.aperture;
  else if (g === 'convex') { const a = probe.fov * DEG / 2; width = 2 * (probe.radius + depth) * Math.sin(a); }
  else { const a = probe.fov * DEG / 2; width = 2 * depth * Math.sin(a) + probe.aperture; }
  width = Math.max(width, 20);
  const height = depth;
  return { mode: 'clinical', top: pose.origin, u: pose.u, v: pose.b, n: pose.e, width, height, depth, probe, centre: madd(pose.origin, pose.b, depth / 2) };
}

/** Image-plane (s lateral mm from centre line, d mm below the top edge) -> LPS. */
export function planePoint(plane, s, d) {
  return [
    plane.top[0] + plane.u[0] * s + plane.v[0] * d,
    plane.top[1] + plane.u[1] * s + plane.v[1] * d,
    plane.top[2] + plane.u[2] * s + plane.v[2] * d,
  ];
}

/** Is the image-plane point inside the probe's field of view (linear rectangle, convex/sector fan)? */
export function inFieldOfView(plane, s, d) {
  if (plane.mode === 'free') return Math.abs(s) <= plane.width / 2 && d >= 0 && d <= plane.height;
  const p = plane.probe, depth = plane.depth;
  if (p.geometry === 'linear') return Math.abs(s) <= p.aperture / 2 && d >= 0 && d <= depth;
  if (p.geometry === 'convex') {
    const r = Math.hypot(s, d + p.radius), th = Math.atan2(s, d + p.radius);
    return r >= p.radius && r <= p.radius + depth && Math.abs(th) <= p.fov * DEG / 2;
  }
  const r = Math.hypot(s, d), th = Math.atan2(s, d);
  return r <= depth && Math.abs(th) <= p.fov * DEG / 2;
}

/** Distance (mm) between two contact points: used by tests to prove angulation keeps the contact. */
export const contactDrift = (a, b) => Math.hypot(a.origin[0] - b.origin[0], a.origin[1] - b.origin[1], a.origin[2] - b.origin[2]);
export { dot };
