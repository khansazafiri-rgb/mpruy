// Procedural physiological motion — EDUCATIONAL APPROXIMATION, not measured 4D data.
//
// One displacement field d(p, t) (reference anatomy -> current anatomy, LPS mm) drives
// BOTH the 3D meshes (forward: p + d(p)) and every image sample (inverse: solve q + d(q) = x).
// Because there is a single function, anatomy and images cannot drift out of sync.
import { clamp, smoothstep } from '../core/vec.js';

export const DEFAULT_PHYSIOLOGY = {
  heartRate: 72, // beats/min
  respRate: 14, // breaths/min
  breathDepth: 16, // diaphragm excursion, mm (quiet ~10-20, deep 40-70)
  breathHold: false,
  // ventricular deformation (normal): radial cavity shortening and longitudinal (AV-plane) shortening
  lvRadial: 0.30, lvLongitudinal: 0.14, lvDilation: 1.0, rvRadial: 0.22,
  // gastric antral peristalsis
  antralFrequency: 3.0, // contractions/min (normal ~3/min)
  antralAmplitude: 0.6, // fraction of antral radius occluded by a passing wave
  antralSpeed: 2.5, // propagation speed mm/s
  cardiacEnabled: true, respirationEnabled: true, peristalsisEnabled: true,
};

// ------------------------------------------------------------------ timing curves
/** Systolic duration (s) from cycle length, a common QT-like rate dependence. */
export const systoleSeconds = (T) => clamp(0.13 + 0.19 * T, 0.2, 0.45);
export const CARDIAC_TIMING = { ivc: 0.05, ivr: 0.07, atrial: 0.12, rapidFillingTau: 0.07 };

/**
 * Ventricular contraction state E in [0,1] (0 end-diastole, 1 end-systole) and atrial contraction eA,
 * at phase c in [0,1) of a beat of period T seconds. Phase 0 = onset of ventricular systole (S1).
 */
export function cardiacState(c, T) {
  const tau = c * T, Ts = systoleSeconds(T), { ivc, ivr, atrial, rapidFillingTau } = CARDIAC_TIMING;
  let E, segment;
  if (tau < ivc) { E = 0; segment = 'isovolumic contraction'; }
  else if (tau < Ts) { const x = (tau - ivc) / (Ts - ivc); E = (1 - Math.cos(Math.PI * x)) / 2; segment = 'ejection'; }
  else if (tau < Ts + ivr) { E = 1; segment = 'isovolumic relaxation'; }
  else {
    const tf = tau - Ts - ivr;
    E = 0.18 + 0.82 * Math.exp(-tf / rapidFillingTau);
    segment = tf < 3 * rapidFillingTau ? 'rapid filling' : 'diastasis';
    const ta = T - tau; // time to next beat
    if (ta < atrial) { const x = 1 - ta / atrial; E *= 1 - smoothstep(0, 1, x); segment = 'atrial contraction'; }
  }
  const ta = T - tau;
  const eA = ta < atrial ? Math.sin(Math.PI * (1 - ta / atrial)) : 0;
  return { E, eA, segment, systole: tau >= ivc * 0 && tau < Ts, Ts, s2Time: Ts, s1Time: 0.01 };
}

/** Respiratory lung-volume fraction r in [0,1] at phase phi; inspiration takes 40% of the cycle. */
export function respState(phi) {
  const ti = 0.4;
  if (phi < ti) return { r: (1 - Math.cos(Math.PI * phi / ti)) / 2, phase: 'inspiration' };
  return { r: (1 + Math.cos(Math.PI * (phi - ti) / (1 - ti))) / 2, phase: 'expiration' };
}

// ------------------------------------------------------------------ geometry prep
function polyline(points) {
  const segs = []; let total = 0;
  for (let i = 0; i < points.length - 1; i++) {
    const a = points[i], b = points[i + 1], d = [b[0] - a[0], b[1] - a[1], b[2] - a[2]], L = Math.hypot(...d);
    segs.push({ a, d, L, L2: L * L, s0: total }); total += L;
  }
  return { segs, total };
}
function closestOnPolyline(pl, x, y, z) {
  let best = Infinity, bs = 0, bx = 0, by = 0, bz = 0;
  for (const g of pl.segs) {
    let t = ((x - g.a[0]) * g.d[0] + (y - g.a[1]) * g.d[1] + (z - g.a[2]) * g.d[2]) / g.L2;
    t = t < 0 ? 0 : t > 1 ? 1 : t;
    const px = g.a[0] + g.d[0] * t, py = g.a[1] + g.d[1] * t, pz = g.a[2] + g.d[2] * t;
    const d2 = (x - px) ** 2 + (y - py) ** 2 + (z - pz) ** 2;
    if (d2 < best) { best = d2; bs = g.s0 + t * g.L; bx = px; by = py; bz = pz; }
  }
  return { d: Math.sqrt(best), s: bs, px: bx, py: by, pz: bz };
}

export function prepareGeometry(anatomy) {
  const h = anatomy.heart, st = anatomy.gi.stomach;
  const pl = polyline(st.centerline);
  const radiiAt = (s) => {
    let acc = 0;
    for (let i = 0; i < pl.segs.length; i++) {
      const g = pl.segs[i];
      if (s <= acc + g.L || i === pl.segs.length - 1) { const t = clamp((s - acc) / g.L, 0, 1); return st.radii[i] + (st.radii[i + 1] - st.radii[i]) * t; }
      acc += g.L;
    }
    return st.radii.at(-1);
  };
  const lo = [0, 1, 2].map((d) => Math.min(...st.centerline.map((p) => p[d])) - 60);
  const hi = [0, 1, 2].map((d) => Math.max(...st.centerline.map((p) => p[d])) + 60);
  return {
    C: h.lvCentre, e: h.axis, a: h.lvCavity.a, b: h.lvCavity.b, wall: h.lvWall,
    Crv: h.rvCentre, brv: h.rvCavity.c, la: h.la, ra: h.ra,
    domeR: anatomy.respiration.domeRight, domeL: anatomy.respiration.domeLeft, apexZ: anatomy.respiration.lungApexZ,
    stomach: pl, stomachRadius: radiiAt, stomachBox: { lo, hi }, waveStart: pl.total * 0.38,
  };
}

/** Same dome model as the phantom generator (pipeline/phantom_geometry.py: diaphragm_z). */
export function diaphragmZ(x, y) {
  const zr = 22 - 62 * ((x + 62) / 100) ** 2 - 40 * ((y - 5) / 105) ** 2;
  const zl = 2 - 62 * ((x - 62) / 100) ** 2 - 40 * ((y - 5) / 105) ** 2;
  const zc = -2 - 30 * (x / 70) ** 2 - 30 * ((y + 10) / 90) ** 2;
  return Math.max(Math.max(zr, zl, zc), -95) - 38 * clamp(y / 110, 0, 1);
}

// ------------------------------------------------------------------ the field
/**
 * Build a per-frame snapshot of all time-dependent scalars. Everything downstream
 * (meshes, CT, ultrasound, audio, ECG strip) reads the SAME frame.
 */
export function makeFrame(clock, params, geom) {
  const T = 60 / params.heartRate;
  const c = clock.beatPhase % 1, phi = clock.breathPhase % 1;
  const card = cardiacState(c, T), resp = respState(phi);
  return {
    t: clock.t, beat: Math.floor(clock.beatPhase), c, T, phi, ...card, r: params.breathHold ? clock.heldR ?? resp.r : resp.r,
    respPhase: params.breathHold ? 'breath hold' : resp.phase, gi: clock.giPhase, params, geom,
  };
}

/** Local organ motion (heart + stomach) at a reference point. Supports are disjoint, so summing is safe. */
export function localDisplacement(f, x, y, z, out) {
  let dx = 0, dy = 0, dz = 0;
  const p = f.params, g = f.geom;
  // ---------------- cardiac ----------------
  if (p.cardiacEnabled || p.lvDilation !== 1) {
    const qx = x - g.C[0], qy = y - g.C[1], qz = z - g.C[2];
    if (qx * qx + qy * qy + qz * qz < 150 * 150) {
      const e = g.e, s = qx * e[0] + qy * e[1] + qz * e[2];
      const rx = qx - s * e[0], ry = qy - s * e[1], rz = qz - s * e[2], rho = Math.hypot(rx, ry, rz) + 1e-9;
      const a = g.a, b = g.b, outer = b + g.wall;
      // envelope: whole heart region fades to zero ~22 mm outside the epicardium
      const env = (1 - smoothstep(outer, outer + 22, rho)) * (1 - smoothstep(a + g.wall, a + g.wall + 22, s)) * (1 - smoothstep(a + 60, a + 85, -s));
      const E = p.cardiacEnabled ? f.E : 0;
      const vent = smoothstep(-a - 12, -a + 6, s); // ventricles only (not atria/great vessels)
      if (env > 0) {
        const k = p.lvDilation - 1; // static dilation (pathology layer) about the LV centre
        // radial contraction: cavity scales, wall thickens (inner surface moves more than outer)
        const radial = rho <= b ? -p.lvRadial * E * rho : -p.lvRadial * E * b * (b / rho);
        const dil = k * (rho <= outer ? rho : outer * (outer / rho));
        const rr = (radial + dil) * vent * env / rho;
        dx += rx * rr; dy += ry * rr; dz += rz * rr;
        // longitudinal: base descends toward the (nearly fixed) apex
        const wlong = clamp((a - s) / (2 * a), 0, 1);
        const ds = (p.lvLongitudinal * E * 2 * a * wlong + k * s * vent) * env;
        dx += e[0] * ds; dy += e[1] * ds; dz += e[2] * ds;
      }
      if (E > 0 || f.eA > 0) {
        // right ventricular free wall toward the septum (outside the LV myocardium)
        const ux = x - g.Crv[0], uy = y - g.Crv[1], uz = z - g.Crv[2], s2 = ux * e[0] + uy * e[1] + uz * e[2];
        const vx = ux - s2 * e[0], vy = uy - s2 * e[1], vz = uz - s2 * e[2], r2 = Math.hypot(vx, vy, vz) + 1e-9;
        const lvOcc = 1 - smoothstep(outer - 2, outer + 4, rho);
        const rad2 = r2 <= g.brv ? -p.rvRadial * E * r2 : -p.rvRadial * E * g.brv * (g.brv / r2);
        const w2 = (1 - lvOcc) * (1 - smoothstep(g.brv + 4, g.brv + 24, r2)) * vent * (1 - smoothstep(a, a + 30, Math.abs(s2)));
        dx += vx / r2 * rad2 * w2; dy += vy / r2 * rad2 * w2; dz += vz / r2 * rad2 * w2;
        // atria: fill during ventricular systole, empty with atrial contraction (eA)
        for (const at of [g.la, g.ra]) {
          const ax = x - at.c[0], ay = y - at.c[1], az = z - at.c[2];
          const q = Math.hypot(ax / at.r[0], ay / at.r[1], az / at.r[2]);
          if (q < 1.8) {
            const fa = (0.08 * E - 0.14 * f.eA) * (q <= 1 ? 1 : (1 - smoothstep(1, 1.8, q)) / q) * (1 - lvOcc);
            dx += ax * fa; dy += ay * fa; dz += az * fa;
          }
        }
      }
    }
  }
  // ---------------- gastric antral peristalsis ----------------
  if (p.peristalsisEnabled && p.antralAmplitude > 0 && p.antralFrequency > 0) {
    const bx = g.stomachBox;
    if (x > bx.lo[0] && x < bx.hi[0] && y > bx.lo[1] && y < bx.hi[1] && z > bx.lo[2] && z < bx.hi[2]) {
      // Soft blend over centre-line segments (weights continuous in x) instead of a hard closest-point
      // switch, so the field stays continuous at bends (no medial-axis discontinuity).
      const segs = g.stomach.segs;
      let dmin = Infinity;
      const tmp = g._tmp || (g._tmp = segs.map(() => ({ d: 0, s: 0, px: 0, py: 0, pz: 0 })));
      for (let i = 0; i < segs.length; i++) {
        const sg = segs[i];
        let t = ((x - sg.a[0]) * sg.d[0] + (y - sg.a[1]) * sg.d[1] + (z - sg.a[2]) * sg.d[2]) / sg.L2;
        t = t < 0 ? 0 : t > 1 ? 1 : t;
        const o = tmp[i];
        o.px = sg.a[0] + sg.d[0] * t; o.py = sg.a[1] + sg.d[1] * t; o.pz = sg.a[2] + sg.d[2] * t;
        o.d = Math.hypot(x - o.px, y - o.py, z - o.pz); o.s = sg.s0 + t * sg.L;
        if (o.d < dmin) dmin = o.d;
      }
      let sx = 0, sy = 0, sz = 0, sw = 0;
      for (let i = 0; i < segs.length; i++) {
        const o = tmp[i], wgt = Math.exp(-(o.d - dmin) / 3);
        if (wgt < 1e-4) continue;
        sw += wgt;
        const R = g.stomachRadius(o.s);
        if (o.d > R + 80 || o.s < g.waveStart - 20) continue;
        const c = antralContraction(f, o.s);
        if (c <= 0) continue;
        // falloff width keeps |grad d| < 1 outside the wall, so the map stays invertible
        const w = Math.max(15, 2.4 * c * R);
        const shrink = c * (o.d <= R ? 1 : (R / o.d) * (1 - smoothstep(R, R + w, o.d)));
        sx -= (x - o.px) * shrink * wgt; sy -= (y - o.py) * shrink * wgt; sz -= (z - o.pz) * shrink * wgt;
      }
      if (sw > 0) { dx += sx / sw; dy += sy / sw; dz += sz / sw; }
    }
  }
  out[0] = dx; out[1] = dy; out[2] = dz;
  return out;
}

/** Respiratory motion (diaphragm, viscera, chest/abdominal wall) applied after local organ motion. */
export function respDisplacement(f, x, y, z, out) {
  let dx = 0, dy = 0, dz = 0;
  const p = f.params, g = f.geom;
  // ---------------- respiration ----------------
  if (p.respirationEnabled) {
    const r = f.r, D = p.breathDepth;
    if (r > 0 && Math.abs(x) < 210 && z > -340 && z < 240) {
      const zd = diaphragmZ(x, y);
      // inside the thoraco-abdominal cavity (ellipse in the axial plane) the viscera move cranio-caudally
      const cav = 1 - smoothstep(0.82, 1.08, Math.hypot(x / 140, (y - 5) / 98));
      let vz = 0;
      if (z >= zd) vz = -D * r * clamp((g.apexZ - z) / (g.apexZ - zd), 0, 1); // lungs/heart stretch toward the base
      else vz = -D * r * clamp((z + 320) / (zd + 320 - 70), 0, 1); // abdominal viscera displaced caudally
      dz += vz * cav;
      dy += 0.22 * vz * cav * smoothstep(-200, -20, z) * (0.3 + 0.7 * (1 - smoothstep(zd - 12, zd + 12, z))); // liver/spleen slide slightly anterior (continuous across the dome)
      // chest wall: anterior (pump handle) and lateral (bucket handle) expansion; back rests on the table
      const fy = clamp((112 - y) / 224, 0, 1), fx = clamp(x / 165, -1, 1);
      const chest = smoothstep(-90, -30, z) * (1 - smoothstep(195, 235, z));
      const abdo = smoothstep(-280, -200, z) * (1 - smoothstep(-60, 10, z));
      const trunk = 1 - smoothstep(185, 205, Math.abs(x));
      dy += -(0.30 * D * chest + 0.42 * D * abdo) * r * fy * trunk;
      dx += 0.16 * D * r * fx * chest * trunk;
    }
  }
  out[0] = dx; out[1] = dy; out[2] = dz;
  return out;
}

const _tmpL = [0, 0, 0], _tmpR = [0, 0, 0];
/**
 * Forward displacement at reference point (x,y,z): the composition x = R(L(p)) of local organ motion L
 * and respiration R. Composition (not summation) keeps the map invertible because each stage is.
 */
export function displacement(f, x, y, z, out) {
  localDisplacement(f, x, y, z, _tmpL);
  const qx = x + _tmpL[0], qy = y + _tmpL[1], qz = z + _tmpL[2];
  respDisplacement(f, qx, qy, qz, _tmpR);
  out[0] = _tmpL[0] + _tmpR[0]; out[1] = _tmpL[1] + _tmpR[1]; out[2] = _tmpL[2] + _tmpR[2];
  return out;
}

/** Fractional radial occlusion of the antrum at arc length s (0..~0.9). */
export function antralContraction(f, s) {
  const p = f.params, g = f.geom;
  const lambda = p.antralSpeed / (p.antralFrequency / 60); // wavelength (mm)
  const ramp = smoothstep(g.waveStart, g.waveStart + 45, s) * (1 - smoothstep(g.stomach.total - 4, g.stomach.total + 6, s));
  if (ramp <= 0) return 0;
  const ph = f.gi - (s - g.waveStart) / lambda;
  const x = ph - Math.floor(ph); // 0..1, ring centre at 0.5
  const w = ((x - 0.5) * lambda) / 12;
  const ring = Math.exp(-w * w); // ~20 mm wide contraction band
  return p.antralAmplitude * ramp * ring;
}

/**
 * Inverse map: current-space point -> reference anatomy. Solves q + d(q) = x with fixed-point steps
 * (enough almost everywhere) and falls back to Newton steps with a finite-difference Jacobian
 * where the field is strongly contracting (deep antral rings).
 */
export function makeWarp(f) {
  const invR = makeSolver(f, respDisplacement), invL = makeSolver(f, localDisplacement), m = [0, 0, 0];
  return function warp(x, y, z, out) {
    invR(x, y, z, m); // undo respiration
    return invL(m[0], m[1], m[2], out); // then undo local organ motion
  };
}

/** Solve q + field(q) = x: fixed-point steps, then Newton with a finite-difference Jacobian if needed. */
function makeSolver(f, field) {
  const d = [0, 0, 0], e = [0, 0, 0];
  return function solve(x, y, z, out) {
    let qx = x, qy = y, qz = z, ch = 1;
    for (let i = 0; i < 3; i++) {
      field(f, qx, qy, qz, d);
      const nx = x - d[0], ny = y - d[1], nz = z - d[2];
      ch = Math.abs(nx - qx) + Math.abs(ny - qy) + Math.abs(nz - qz);
      qx = nx; qy = ny; qz = nz;
      if (ch < 0.004) break;
    }
    for (let i = 0; i < 6 && ch >= 0.004; i++) {
      field(f, qx, qy, qz, d);
      const F0 = qx + d[0] - x, F1 = qy + d[1] - y, F2 = qz + d[2] - z, h = 0.25;
      field(f, qx + h, qy, qz, e); const a00 = 1 + (e[0] - d[0]) / h, a10 = (e[1] - d[1]) / h, a20 = (e[2] - d[2]) / h;
      field(f, qx, qy + h, qz, e); const a01 = (e[0] - d[0]) / h, a11 = 1 + (e[1] - d[1]) / h, a21 = (e[2] - d[2]) / h;
      field(f, qx, qy, qz + h, e); const a02 = (e[0] - d[0]) / h, a12 = (e[1] - d[1]) / h, a22 = 1 + (e[2] - d[2]) / h;
      const det = a00 * (a11 * a22 - a12 * a21) - a01 * (a10 * a22 - a12 * a20) + a02 * (a10 * a21 - a11 * a20);
      if (!(Math.abs(det) > 1e-6)) break;
      const s0 = (F0 * (a11 * a22 - a12 * a21) - a01 * (F1 * a22 - a12 * F2) + a02 * (F1 * a21 - a11 * F2)) / det;
      const s1 = (a00 * (F1 * a22 - a12 * F2) - F0 * (a10 * a22 - a12 * a20) + a02 * (a10 * F2 - F1 * a20)) / det;
      const s2 = (a00 * (a11 * F2 - F1 * a21) - a01 * (a10 * F2 - F1 * a20) + F0 * (a10 * a21 - a11 * a20)) / det;
      qx -= s0; qy -= s1; qz -= s2;
      ch = Math.abs(s0) + Math.abs(s1) + Math.abs(s2);
    }
    out[0] = qx; out[1] = qy; out[2] = qz;
    return out;
  };
}

/** Deform a flat LPS position array (mesh vertices). */
export function deformPositions(f, ref, out = new Float32Array(ref.length)) {
  const d = [0, 0, 0];
  for (let i = 0; i < ref.length; i += 3) {
    displacement(f, ref[i], ref[i + 1], ref[i + 2], d);
    out[i] = ref[i] + d[0]; out[i + 1] = ref[i + 1] + d[1]; out[i + 2] = ref[i + 2] + d[2];
  }
  return out;
}

/** Analytic LV ejection fraction implied by the deformation parameters. */
export function modelEjectionFraction(p) {
  const esvOverEdv = (1 - p.lvRadial) ** 2 * (1 - p.lvLongitudinal);
  return 1 - esvOverEdv;
}

/** Simulation clock: integrates phases so HR/RR/motility changes never cause jumps. */
export function createClock() {
  return { t: 0, beatPhase: 0, breathPhase: 0, giPhase: 0, heldR: null };
}
export function advanceClock(clock, dt, params) {
  clock.t += dt;
  if (params.cardiacEnabled) clock.beatPhase += dt * params.heartRate / 60;
  if (params.respirationEnabled && !params.breathHold) clock.breathPhase += dt * params.respRate / 60;
  if (params.peristalsisEnabled) clock.giPhase += dt * params.antralFrequency / 60;
  if (params.breathHold && clock.heldR == null) clock.heldR = respState(clock.breathPhase % 1).r;
  if (!params.breathHold) clock.heldR = null;
  return clock;
}
