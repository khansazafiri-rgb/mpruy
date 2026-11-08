// EDUCATIONAL ultrasound image simulation (B-mode). Not a validated acoustic solver.
//
// Model per scan line (straight-ray, single scattering, 2D slice):
//   - one-way amplitude a(z) loses alpha*f*dz dB per step (linear-in-frequency attenuation)
//   - at impedance boundaries an intensity fraction R = ((Z2-Z1)/(Z2+Z1))^2 is reflected (angle-
//     dependent specular term) and the beam keeps sqrt(1-R) of its amplitude -> acoustic shadowing
//   - diffuse backscatter sqrt(scatter)*a^2 * complex Gaussian scatterer field fixed in tissue
//     (reference anatomy coordinates) -> Rayleigh speckle that moves with the tissue
//   - multiple reflections between transducer and a strong reflector -> reverberation (A-lines)
//   - complex convolution with an axial/lateral PSF whose size scales with wavelength (1/f)
//   - envelope -> log compression with gain, TGC and dynamic range; additive electronic noise
// Not modelled: refraction, speed-of-sound aberration, beam elevation, side lobes, harmonics, Doppler.
import { PROBES } from '../core/probe.js';
import { DEG, clamp } from '../core/vec.js';
import { TISSUES, TISSUE_INDEX, impedance } from './tissues.js';

export const US_DEFAULTS = { gain: 0, dynamicRange: 52, tgc: [0, 0, 0], autoTGC: true, coupling: 'skin', focusFraction: 0.5, quality: 1 };
const REF_DB = 25; // calibration (tools/us-calibrate.mjs): liver ~42% grey, simple fluid ~black at default gain
const NOISE = 0.00025; // electronic noise amplitude (relative)
const AIR = TISSUE_INDEX.air, GEL = TISSUE_INDEX.gel, LUNG = TISSUE_INDEX.lung;

function hash3(x, y, z, seed) {
  let h = (Math.imul(x, 0x8da6b343) ^ Math.imul(y, 0xd8163841) ^ Math.imul(z, 0xcb1ab31f) ^ seed) | 0;
  h = Math.imul(h ^ (h >>> 15), 0x2c1b3c6d);
  h = Math.imul(h ^ (h >>> 12), 0x297a2d39);
  return (h ^ (h >>> 15)) >>> 0;
}

/** Scan-line geometry in image-plane coordinates (s lateral, d depth below the face/top). */
export function lineGeometry(probe, plane, depth, nLines) {
  const geo = plane.mode === 'free' ? { geometry: 'linear', aperture: plane.width } : probe;
  const lines = [];
  for (let i = 0; i < nLines; i++) {
    const f = (i + 0.5) / nLines;
    if (geo.geometry === 'linear') lines.push({ s0: (f - 0.5) * geo.aperture, d0: 0, ds: 0, dd: 1 });
    else if (geo.geometry === 'convex') {
      const th = (f - 0.5) * geo.fov * DEG, R = geo.radius;
      lines.push({ s0: R * Math.sin(th), d0: R * Math.cos(th) - R, ds: Math.sin(th), dd: Math.cos(th) });
    } else {
      const th = (f - 0.5) * geo.fov * DEG, off = (f - 0.5) * (geo.aperture || 0) * 0.5;
      lines.push({ s0: off, d0: 0, ds: Math.sin(th), dd: Math.cos(th) });
    }
  }
  return { geo, lines };
}

/**
 * Simulate one B-mode frame.
 * @param sampler from createSampler (frame already set)
 * @param plane   imagingPlane(...)
 * @param s       settings: probe, freq (MHz), depth (mm), gain, dynamicRange, tgc[3], autoTGC, coupling, tissues
 */
export function simulateUltrasound(sampler, plane, s) {
  const probe = s.probe || PROBES.convex;
  const tissues = s.tissues || TISSUES;
  const f = s.freq, depth = s.depth;
  const nLines = Math.round((plane.mode === 'free' ? 192 : probe.lines) * (s.quality || 1));
  const nS = Math.round(clamp(depth / 0.3, 128, 520) * (s.quality || 1));
  const dz = depth / nS, dzCm = dz / 10;
  const lambda = 1.54 / f; // mm
  const Z = tissues.map(impedance);
  const attStep = tissues.map((t) => Math.pow(10, -(t.alpha * f * dzCm) / 20));
  const sqrtScatter = tissues.map((t) => Math.sqrt(t.scatter));
  const { geo, lines } = lineGeometry(probe, plane, depth, nLines);
  const re = new Float32Array(nLines * nS), im = new Float32Array(nLines * nS);
  const { top, u, v } = plane;
  const ref = [0, 0, 0], refA = [0, 0, 0], refB = [0, 0, 0];
  const cell = 0.28; // scatterer cell (mm) in reference tissue space
  const warpStride = 8; // ~2.4 mm: the motion field is smooth on the voxel scale
  const ideal = s.coupling === 'ideal' || plane.mode === 'free';
  let strongLines = 0;
  const boundaryEcho = [];

  for (let li = 0; li < nLines; li++) {
    const L = lines[li];
    let a = 1, prevZ = Z[GEL], started = !ideal, first = -1, firstAmp = 0, cur = GEL, pending = -1, touched = false;
    const o = li * nS;
    for (let k = 0; k < nS; k++) {
      const t = (k + 0.5) * dz;
      const sP = L.s0 + L.ds * t, dP = L.d0 + L.dd * t;
      // current-space point
      const x = top[0] + u[0] * sP + v[0] * dP, y = top[1] + u[1] * sP + v[1] * dP, zz = top[2] + u[2] * sP + v[2] * dP;
      // reference coordinates: exact at every warpStride-th sample, linear in between (field is smooth)
      if (k % warpStride === 0) {
        sampler.toRef(x, y, zz, refA);
        const t2 = (k + warpStride + 0.5) * dz, s2 = L.s0 + L.ds * t2, d2 = L.d0 + L.dd * t2;
        sampler.toRef(top[0] + u[0] * s2 + v[0] * d2, top[1] + u[1] * s2 + v[1] * d2, top[2] + u[2] * s2 + v[2] * d2, refB);
      }
      const w = (k % warpStride) / warpStride;
      ref[0] = refA[0] + (refB[0] - refA[0]) * w; ref[1] = refA[1] + (refB[1] - refA[1]) * w; ref[2] = refA[2] + (refB[2] - refA[2]) * w;
      // dithered label lookup avoids voxel stair-steps at organ boundaries
      const ix = Math.floor(ref[0] / cell), iy = Math.floor(ref[1] / cell), iz = Math.floor(ref[2] / cell);
      const h1 = hash3(ix, iy, iz, 0x9e37), h2 = hash3(ix, iy, iz, 0x7f4a);
      const jx = ((h1 & 1023) / 1023 - 0.5) * 1.8, jy = (((h1 >>> 10) & 1023) / 1023 - 0.5) * 1.8, jz = (((h1 >>> 20) & 1023) / 1023 - 0.5) * 1.8;
      let cls = sampler.tissueRef(ref[0] + jx, ref[1] + jy, ref[2] + jz);
      if (!started) {
        if (cls === AIR || cls === LUNG) { continue; }
        started = true; prevZ = Z[cls]; cur = cls;
      }
      // probe pressure + gel: air between the (curved) face and the skin is coupled until tissue is reached
      if (!touched) { if (cls === AIR && t < 16) cls = GEL; else if (cls !== AIR) touched = true; }
      // hysteresis: a new tissue must be seen on two consecutive samples (suppresses dither flicker)
      if (cls !== cur) { if (pending === cls) { cur = cls; pending = -1; } else { pending = cls; cls = cur; } } else pending = -1;
      const z1 = Z[cls];
      if (z1 !== prevZ) {
        const R = ((z1 - prevZ) / (z1 + prevZ)) ** 2;
        // boundary normal from the impedance gradient in reference space (angle-dependent specular echo)
        const gx = Z[sampler.tissueRef(ref[0] + 1.5, ref[1], ref[2])] - Z[sampler.tissueRef(ref[0] - 1.5, ref[1], ref[2])];
        const gy = Z[sampler.tissueRef(ref[0], ref[1] + 1.5, ref[2])] - Z[sampler.tissueRef(ref[0], ref[1] - 1.5, ref[2])];
        const gz = Z[sampler.tissueRef(ref[0], ref[1], ref[2] + 1.5)] - Z[sampler.tissueRef(ref[0], ref[1], ref[2] - 1.5)];
        const gl = Math.hypot(gx, gy, gz);
        const bx = u[0] * L.ds + v[0] * L.dd, by = u[1] * L.ds + v[1] * L.dd, bz = u[2] * L.ds + v[2] * L.dd;
        const cos = gl > 0 ? Math.abs(gx * bx + gy * by + gz * bz) / gl : 1;
        const rough = R > 0.3 ? 0.3 : 0.06; // air/bone surfaces are rough at these wavelengths
        const spec = rough + (1 - rough) * cos ** 6;
        // organ capsules / fascial planes are strong specular interfaces in practice: give every
        // tissue-class change a minimum reflectivity (educational simplification)
        const amp = (Math.sqrt(R * spec) * 4 + (cls === GEL ? 0 : 0.22 * cos ** 4)) * a * a;
        re[o + k] += amp;
        if (R > 0.5 && first < 0) { first = k; firstAmp = amp; } // gas / aerated lung only
        a *= Math.sqrt(1 - R);
        prevZ = z1;
        boundaryEcho.push(R);
      }
      a *= attStep[cls];
      const sc = sqrtScatter[cls];
      if (sc > 0) {
        const u1 = ((h2 & 0xffff) + 1) / 65537, u2 = (h2 >>> 16) / 65536;
        const r = Math.sqrt(-2 * Math.log(u1)) * sc * a * a;
        re[o + k] += r * Math.cos(6.283185307 * u2);
        im[o + k] += r * Math.sin(6.283185307 * u2);
      }
      if (a < 1e-5) { a = 0; }
    }
    // reverberation between the face and the first strong reflector (A-lines below pleura / gas)
    if (first > 2) {
      strongLines++;
      for (let m = 2; m <= 7; m++) {
        const k = m * (first + 1) - 1;
        if (k >= nS) break;
        re[o + k] += firstAmp * 0.5 ** (m - 1);
      }
    }
  }

  // ---------------- PSF (axial then depth-dependent lateral), complex
  const sigAx = (1.2 * lambda) / 2.355 / dz;
  const kAx = gaussKernel(sigAx);
  const re2 = new Float32Array(re.length), im2 = new Float32Array(im.length);
  convolveLines(re, im, re2, im2, nLines, nS, kAx);
  const focus = depth * (s.focusFraction ?? 0.5);
  const env = new Float32Array(re.length);
  for (let k = 0; k < nS; k++) {
    const t = (k + 0.5) * dz;
    const fwhm = lambda * 2.2 * (1 + 1.6 * Math.abs(t - focus) / Math.max(focus, 10));
    let spacing;
    if (geo.geometry === 'linear') spacing = geo.aperture / nLines;
    else if (geo.geometry === 'convex') spacing = (geo.radius + t) * (geo.fov * DEG) / nLines;
    else spacing = Math.max(0.15, t * (geo.fov * DEG) / nLines);
    const kl = gaussKernel(clamp(fwhm / 2.355 / spacing, 0.3, 8));
    const h = (kl.length - 1) / 2;
    for (let li = 0; li < nLines; li++) {
      let sr = 0, si = 0;
      for (let j = -h; j <= h; j++) {
        const lj = li + j; if (lj < 0 || lj >= nLines) continue;
        const w = kl[j + h], idx = lj * nS + k;
        sr += re2[idx] * w; si += im2[idx] * w;
      }
      const nz = hash3(li, k, 7, 0x51ed), n1 = ((nz & 0xffff) / 65536 - 0.5) * 2 * NOISE, n2 = ((nz >>> 16) / 65536 - 0.5) * 2 * NOISE;
      env[li * nS + k] = Math.hypot(sr + n1, si + n2);
    }
  }
  // ---------------- log compression, gain, TGC
  const grey = new Float32Array(env.length);
  const dr = s.dynamicRange ?? 52, gain = s.gain ?? 0, tgc = s.tgc || [0, 0, 0];
  const autoSlope = s.autoTGC === false ? 0 : 2 * 0.5 * f; // dB/cm round-trip compensation for average soft tissue
  for (let k = 0; k < nS; k++) {
    const t = (k + 0.5) * dz, fr = t / depth;
    const user = fr < 0.5 ? tgc[0] + (tgc[1] - tgc[0]) * fr * 2 : tgc[1] + (tgc[2] - tgc[1]) * (fr - 0.5) * 2;
    const add = gain + user + Math.min(42, autoSlope * t / 10) - REF_DB;
    for (let li = 0; li < nLines; li++) {
      const i = li * nS + k;
      const db = 20 * Math.log10(env[i] + 1e-9) + add;
      grey[i] = clamp((db + dr) / dr, 0, 1);
    }
  }
  return { grey, env, nLines, nS, dz, depth, geo, lines, plane, freq: f, strongLines, lambda, boundaries: boundaryEcho.length };
}

function gaussKernel(sigma) {
  const h = Math.max(1, Math.ceil(sigma * 2.5));
  const k = new Float32Array(2 * h + 1);
  let sum = 0;
  for (let i = -h; i <= h; i++) { k[i + h] = Math.exp(-0.5 * (i / Math.max(sigma, 0.2)) ** 2); sum += k[i + h]; }
  for (let i = 0; i < k.length; i++) k[i] /= Math.sqrt(sum); // energy-normalised: keeps speckle mean level
  return k;
}
function convolveLines(re, im, ore, oim, nLines, nS, k) {
  const h = (k.length - 1) / 2;
  for (let li = 0; li < nLines; li++) {
    const o = li * nS;
    for (let i = 0; i < nS; i++) {
      let sr = 0, si = 0;
      for (let j = -h; j <= h; j++) { const q = i + j; if (q < 0 || q >= nS) continue; sr += re[o + q] * k[j + h]; si += im[o + q] * k[j + h]; }
      ore[o + i] = sr; oim[o + i] = si;
    }
  }
}

/** Map the line x sample grey grid into a raster over the imaging plane (fan / trapezoid / rectangle). */
export function scanConvert(us, cols, rows, rgba = new Uint8ClampedArray(cols * rows * 4)) {
  const { plane, geo, nLines, nS, dz, grey } = us;
  const W = plane.width, H = plane.mode === 'free' ? plane.height : us.depth;
  const fov = (geo.fov || 0) * DEG;
  for (let py = 0; py < rows; py++) {
    const d = (py + 0.5) / rows * H;
    for (let px = 0; px < cols; px++) {
      const s = (px + 0.5) / cols * W - W / 2;
      let li, ki;
      if (geo.geometry === 'linear') { li = (s + geo.aperture / 2) / geo.aperture * nLines - 0.5; ki = d / dz - 0.5; }
      else if (geo.geometry === 'convex') {
        const R = geo.radius, r = Math.hypot(s, d + R), th = Math.atan2(s, d + R);
        li = (th / fov + 0.5) * nLines - 0.5; ki = (r - R) / dz - 0.5;
      } else {
        const r = Math.hypot(s, d), th = Math.atan2(s, d);
        li = (th / fov + 0.5) * nLines - 0.5; ki = r / dz - 0.5;
      }
      const o = (py * cols + px) * 4;
      if (li < -0.5 || li > nLines - 0.5 || ki < -0.5 || ki > nS - 0.5) { rgba[o] = rgba[o + 1] = rgba[o + 2] = 0; rgba[o + 3] = 0; continue; } // outside the fan: transparent
      const l0 = clamp(Math.floor(li), 0, nLines - 1), l1 = Math.min(l0 + 1, nLines - 1), k0 = clamp(Math.floor(ki), 0, nS - 1), k1 = Math.min(k0 + 1, nS - 1);
      const tl = clamp(li - l0, 0, 1), tk = clamp(ki - k0, 0, 1);
      const g = (grey[l0 * nS + k0] * (1 - tk) + grey[l0 * nS + k1] * tk) * (1 - tl) + (grey[l1 * nS + k0] * (1 - tk) + grey[l1 * nS + k1] * tk) * tl;
      const val = g * 255;
      rgba[o] = val; rgba[o + 1] = val; rgba[o + 2] = val * 1.02; rgba[o + 3] = 255;
    }
  }
  return rgba;
}

/** Mean grey of a rectangular window (in line index / depth mm units) — used by tests and the UI probe readout. */
export function meanGrey(us, lineFrom, lineTo, depthFrom, depthTo) {
  let s = 0, n = 0;
  const k0 = Math.max(0, Math.floor(depthFrom / us.dz)), k1 = Math.min(us.nS - 1, Math.floor(depthTo / us.dz));
  for (let li = Math.max(0, lineFrom); li <= Math.min(us.nLines - 1, lineTo); li++) for (let k = k0; k <= k1; k++) { s += us.grey[li * us.nS + k]; n++; }
  return n ? s / n : 0;
}
