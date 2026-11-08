// Coarse smoothed surface of a voxel classifier (used to show the pleural effusion in 3D).
// Exposed voxel faces on a coarse grid, then Laplacian smoothing. Display-only geometry.
export function voxelSurface(inside, lo, hi, step = 4, smooth = 6) {
  const nx = Math.ceil((hi[0] - lo[0]) / step), ny = Math.ceil((hi[1] - lo[1]) / step), nz = Math.ceil((hi[2] - lo[2]) / step);
  const occ = new Uint8Array(nx * ny * nz), id = (i, j, k) => (k * ny + j) * nx + i;
  for (let k = 0; k < nz; k++) for (let j = 0; j < ny; j++) for (let i = 0; i < nx; i++) {
    if (inside(lo[0] + (i + 0.5) * step, lo[1] + (j + 0.5) * step, lo[2] + (k + 0.5) * step)) occ[id(i, j, k)] = 1;
  }
  const at = (i, j, k) => (i >= 0 && j >= 0 && k >= 0 && i < nx && j < ny && k < nz ? occ[id(i, j, k)] : 0);
  const verts = new Map(), pos = [], idx = [];
  const vtx = (i, j, k) => { const key = (k * (ny + 1) + j) * (nx + 1) + i; let v = verts.get(key); if (v === undefined) { v = pos.length / 3; verts.set(key, v); pos.push(lo[0] + i * step, lo[1] + j * step, lo[2] + k * step); } return v; };
  const quad = (a, b, c, d) => idx.push(a, b, c, a, c, d);
  for (let k = 0; k < nz; k++) for (let j = 0; j < ny; j++) for (let i = 0; i < nx; i++) {
    if (!occ[id(i, j, k)]) continue;
    if (!at(i - 1, j, k)) quad(vtx(i, j, k), vtx(i, j, k + 1), vtx(i, j + 1, k + 1), vtx(i, j + 1, k));
    if (!at(i + 1, j, k)) quad(vtx(i + 1, j, k), vtx(i + 1, j + 1, k), vtx(i + 1, j + 1, k + 1), vtx(i + 1, j, k + 1));
    if (!at(i, j - 1, k)) quad(vtx(i, j, k), vtx(i + 1, j, k), vtx(i + 1, j, k + 1), vtx(i, j, k + 1));
    if (!at(i, j + 1, k)) quad(vtx(i, j + 1, k), vtx(i, j + 1, k + 1), vtx(i + 1, j + 1, k + 1), vtx(i + 1, j + 1, k));
    if (!at(i, j, k - 1)) quad(vtx(i, j, k), vtx(i, j + 1, k), vtx(i + 1, j + 1, k), vtx(i + 1, j, k));
    if (!at(i, j, k + 1)) quad(vtx(i, j, k + 1), vtx(i + 1, j, k + 1), vtx(i + 1, j + 1, k + 1), vtx(i, j + 1, k + 1));
  }
  const n = pos.length / 3; if (!n) return null;
  const nb = Array.from({ length: n }, () => new Set());
  for (let t = 0; t < idx.length; t += 3) for (let a = 0; a < 3; a++) for (let b = 0; b < 3; b++) if (a !== b) nb[idx[t + a]].add(idx[t + b]);
  let P = Float32Array.from(pos);
  for (let it = 0; it < smooth; it++) {
    const Q = new Float32Array(P.length);
    for (let v = 0; v < n; v++) { let sx = 0, sy = 0, sz = 0; for (const w of nb[v]) { sx += P[3 * w]; sy += P[3 * w + 1]; sz += P[3 * w + 2]; } const c = nb[v].size || 1; Q[3 * v] = P[3 * v] * 0.4 + 0.6 * sx / c; Q[3 * v + 1] = P[3 * v + 1] * 0.4 + 0.6 * sy / c; Q[3 * v + 2] = P[3 * v + 2] * 0.4 + 0.6 * sz / c; }
    P = Q;
  }
  return { positions: P, indices: Uint32Array.from(idx) };
}
