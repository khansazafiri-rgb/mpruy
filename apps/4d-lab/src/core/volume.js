// Volume sampling with an explicit IJK <-> LPS affine. All positions are LPS millimetres.
import { mat4Apply } from './vec.js';

export function makeVolume(nrrd) {
  const [nx, ny, nz] = nrrd.sizes;
  const data = nrrd.data;
  const m = nrrd.affine, inv = nrrd.inverse;
  const sxy = nx * ny;
  const i0 = inv[0], i1 = inv[1], i2 = inv[2], i3 = inv[3], j0 = inv[4], j1 = inv[5], j2 = inv[6], j3 = inv[7], k0 = inv[8], k1 = inv[9], k2 = inv[10], k3 = inv[11];

  /** Trilinear sample at LPS (x,y,z). Returns NaN outside the acquired grid. */
  function sample(x, y, z) {
    const fi = i0 * x + i1 * y + i2 * z + i3, fj = j0 * x + j1 * y + j2 * z + j3, fk = k0 * x + k1 * y + k2 * z + k3;
    if (!(fi >= 0 && fj >= 0 && fk >= 0 && fi <= nx - 1 && fj <= ny - 1 && fk <= nz - 1)) return NaN;
    let a = fi | 0, b = fj | 0, c = fk | 0;
    if (a === nx - 1) a--; if (b === ny - 1) b--; if (c === nz - 1) c--;
    const tx = fi - a, ty = fj - b, tz = fk - c;
    const o = (c * ny + b) * nx + a;
    const v000 = data[o], v100 = data[o + 1], v010 = data[o + nx], v110 = data[o + nx + 1];
    const v001 = data[o + sxy], v101 = data[o + sxy + 1], v011 = data[o + sxy + nx], v111 = data[o + sxy + nx + 1];
    const l0 = v000 + (v100 - v000) * tx, l1 = v010 + (v110 - v010) * tx, l2 = v001 + (v101 - v001) * tx, l3 = v011 + (v111 - v011) * tx;
    const m0 = l0 + (l1 - l0) * ty, m1 = l2 + (l3 - l2) * ty;
    return m0 + (m1 - m0) * tz;
  }
  /** Nearest-voxel sample; returns -1 outside. Used for label maps. */
  function nearest(x, y, z) {
    const fi = Math.round(i0 * x + i1 * y + i2 * z + i3), fj = Math.round(j0 * x + j1 * y + j2 * z + j3), fk = Math.round(k0 * x + k1 * y + k2 * z + k3);
    if (fi < 0 || fj < 0 || fk < 0 || fi >= nx || fj >= ny || fk >= nz) return -1;
    return data[(fk * ny + fj) * nx + fi];
  }
  /** Fractional IJK of an LPS point (no bounds check). */
  const toIJK = (p) => mat4Apply(inv, p);
  const toLPS = (ijk) => mat4Apply(m, ijk);
  const corners = [];
  for (const c of [0, nz - 1]) for (const b of [0, ny - 1]) for (const a of [0, nx - 1]) corners.push(toLPS([a, b, c]));
  const lo = [0, 1, 2].map((d) => Math.min(...corners.map((p) => p[d])));
  const hi = [0, 1, 2].map((d) => Math.max(...corners.map((p) => p[d])));
  const contains = (p) => {
    const q = toIJK(p);
    return q[0] >= 0 && q[1] >= 0 && q[2] >= 0 && q[0] <= nx - 1 && q[1] <= ny - 1 && q[2] <= nz - 1;
  };
  let range = null;
  function valueRange() {
    if (range) return range;
    let mn = Infinity, mx = -Infinity;
    const step = Math.max(1, Math.floor(data.length / 2e6));
    for (let i = 0; i < data.length; i += step) { const v = data[i]; if (v < mn) mn = v; if (v > mx) mx = v; }
    return (range = [mn, mx]);
  }
  return {
    name: nrrd.name, sizes: nrrd.sizes, spacing: nrrd.spacing, affine: m, inverse: inv, data, space: nrrd.space,
    sample, nearest, toIJK, toLPS, corners, bounds: { lo, hi }, contains, valueRange, byteLength: nrrd.byteLength,
    centre: [(lo[0] + hi[0]) / 2, (lo[1] + hi[1]) / 2, (lo[2] + hi[2]) / 2],
    /** raw index access for property interpolation (label maps) */
    dims: [nx, ny, nz],
  };
}

/** Same grid check for CT + label map (sizes and affine within 1e-3 mm). */
export function sameGrid(a, b) {
  if (a.sizes.some((n, i) => n !== b.sizes[i])) return false;
  return a.affine.every((v, i) => Math.abs(v - b.affine[i]) < 1e-3);
}
