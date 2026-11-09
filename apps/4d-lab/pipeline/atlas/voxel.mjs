// Voxel utilities for the atlas-derived dataset (pure JS, no dependencies).
// Grid convention: data[(k*ny + j)*nx + i], voxel CENTRE (i,j,k) at LPS lo + (i,j,k)*s.

export class Grid {
  constructor(lo, hi, s) {
    this.s = s; this.lo = lo.slice();
    this.n = [0, 1, 2].map((d) => Math.floor((hi[d] - lo[d]) / s) + 1);
    this.size = this.n[0] * this.n[1] * this.n[2];
  }
  idx(i, j, k) { return (k * this.n[1] + j) * this.n[0] + i; }
  pos(i, j, k) { return [this.lo[0] + i * this.s, this.lo[1] + j * this.s, this.lo[2] + k * this.s]; }
  affine() { const s = this.s, l = this.lo; return [s, 0, 0, l[0], 0, s, 0, l[1], 0, 0, s, l[2], 0, 0, 0, 1]; }
}

/**
 * Inside test for a (nearly) closed triangle mesh by ray parity along all three axes with a
 * majority vote (2 of 3). The vote makes small holes and open tube ends harmless: a hole only
 * corrupts the rays that pass through it along one axis. Winding direction is irrelevant.
 * Returns {mask: Uint8Array over the sub-box, i0,j0,k0, n:[nx,ny,nz]} in grid voxel indices.
 */
export function voxelizeMesh(grid, P, I, pad = 1) {
  const s = grid.s, lo = grid.lo;
  let bmin = [Infinity, Infinity, Infinity], bmax = [-Infinity, -Infinity, -Infinity];
  for (let v = 0; v < P.length; v += 3) for (let d = 0; d < 3; d++) { const x = P[v + d]; if (x < bmin[d]) bmin[d] = x; if (x > bmax[d]) bmax[d] = x; }
  const i0 = [0, 1, 2].map((d) => Math.max(0, Math.floor((bmin[d] - lo[d]) / s) - pad));
  const i1 = [0, 1, 2].map((d) => Math.min(grid.n[d] - 1, Math.ceil((bmax[d] - lo[d]) / s) + pad));
  const n = [0, 1, 2].map((d) => i1[d] - i0[d] + 1);
  if (n.some((x) => x <= 0)) return null;
  const N = n[0] * n[1] * n[2];
  const votes = new Uint8Array(N);
  const id = (a, b, c) => (c * n[1] + b) * n[0] + a;
  const flip = new Uint8Array(N);
  // axis ax: rays parallel to ax through voxel centres of the other two axes
  for (let ax = 0; ax < 3; ax++) {
    flip.fill(0);
    const a1 = (ax + 1) % 3, a2 = (ax + 2) % 3;
    const eps1 = 1.37e-4 * s, eps2 = 2.91e-4 * s; // de-degenerate rays through vertices/edges
    for (let t = 0; t < I.length; t += 3) {
      const A = 3 * I[t], B = 3 * I[t + 1], C = 3 * I[t + 2];
      const p1 = [P[A + a1], P[B + a1], P[C + a1]], p2 = [P[A + a2], P[B + a2], P[C + a2]], pa = [P[A + ax], P[B + ax], P[C + ax]];
      const u0 = Math.max(i0[a1], Math.ceil((Math.min(...p1) - lo[a1] - eps1) / s)), u1 = Math.min(i1[a1], Math.floor((Math.max(...p1) - lo[a1] - eps1) / s));
      const v0 = Math.max(i0[a2], Math.ceil((Math.min(...p2) - lo[a2] - eps2) / s)), v1 = Math.min(i1[a2], Math.floor((Math.max(...p2) - lo[a2] - eps2) / s));
      if (u0 > u1 || v0 > v1) continue;
      const det = (p1[1] - p1[0]) * (p2[2] - p2[0]) - (p1[2] - p1[0]) * (p2[1] - p2[0]);
      if (Math.abs(det) < 1e-12) continue;
      for (let u = u0; u <= u1; u++) {
        const y = lo[a1] + u * s + eps1;
        for (let v = v0; v <= v1; v++) {
          const z = lo[a2] + v * s + eps2;
          // barycentric in the projected triangle
          const l1 = ((y - p1[0]) * (p2[2] - p2[0]) - (z - p2[0]) * (p1[2] - p1[0])) / det;
          const l2 = ((p1[1] - p1[0]) * (z - p2[0]) - (p2[1] - p2[0]) * (y - p1[0])) / det;
          if (l1 < 0 || l2 < 0 || l1 + l2 > 1) continue;
          const xa = pa[0] + l1 * (pa[1] - pa[0]) + l2 * (pa[2] - pa[0]);
          // crossing toggles every voxel centre beyond xa along +ax
          let c = Math.ceil((xa - lo[ax]) / s) - i0[ax];
          if (c < 0) c = 0;
          if (c >= n[ax]) continue;
          const ii = [0, 0, 0]; ii[ax] = c; ii[a1] = u - i0[a1]; ii[a2] = v - i0[a2];
          flip[id(ii[0], ii[1], ii[2])] ^= 1;
        }
      }
    }
    // prefix XOR along the axis
    const stride = ax === 0 ? 1 : ax === 1 ? n[0] : n[0] * n[1];
    const ii = [0, 0, 0];
    for (ii[a2] = 0; ii[a2] < n[a2]; ii[a2]++) for (ii[a1] = 0; ii[a1] < n[a1]; ii[a1]++) {
      ii[ax] = 0; let p = id(ii[0], ii[1], ii[2]), state = 0;
      for (let c = 0; c < n[ax]; c++, p += stride) { state ^= flip[p]; votes[p] += state; }
    }
  }
  const mask = new Uint8Array(N);
  for (let p = 0; p < N; p++) mask[p] = votes[p] >= 2 ? 1 : 0;
  return { mask, i0, n };
}

/** Write a sub-box mask into a global Uint8Array volume with value `val` where allowed(current). */
export function paintSub(grid, vol, sub, val, allowed = null) {
  if (!sub) return 0;
  const { mask, i0, n } = sub; let count = 0;
  for (let c = 0; c < n[2]; c++) for (let b = 0; b < n[1]; b++) {
    let p = (c * n[1] + b) * n[0], g = grid.idx(i0[0], i0[1] + b, i0[2] + c);
    for (let a = 0; a < n[0]; a++, p++, g++) if (mask[p] && (!allowed || allowed[vol[g]])) { vol[g] = val; count++; }
  }
  return count;
}

// ------------------------------------------------------------------ Euclidean distance transform
// Felzenszwalb & Huttenlocher squared EDT, separable. Distance (in voxels) from each voxel to the
// nearest voxel where `feature` is 1.
function edt1d(f, n, d, v, z) {
  let k = 0; v[0] = 0; z[0] = -Infinity; z[1] = Infinity;
  for (let q = 1; q < n; q++) {
    let r = v[k], s = ((f[q] + q * q) - (f[r] + r * r)) / (2 * q - 2 * r);
    while (s <= z[k]) { k--; r = v[k]; s = ((f[q] + q * q) - (f[r] + r * r)) / (2 * q - 2 * r); }
    k++; v[k] = q; z[k] = s; z[k + 1] = Infinity;
  }
  k = 0;
  for (let q = 0; q < n; q++) { while (z[k + 1] < q) k++; const r = v[k]; d[q] = (q - r) * (q - r) + f[r]; }
}
export function edt(feature, nx, ny, nz) {
  const INF = 1e20, D = new Float32Array(nx * ny * nz);
  for (let p = 0; p < D.length; p++) D[p] = feature[p] ? 0 : INF;
  const m = Math.max(nx, ny, nz), f = new Float64Array(m), d = new Float64Array(m), v = new Int32Array(m), z = new Float64Array(m + 1);
  const pass = (len, stride, starts) => {
    for (const st of starts) {
      for (let q = 0; q < len; q++) f[q] = D[st + q * stride];
      edt1d(f, len, d, v, z);
      for (let q = 0; q < len; q++) D[st + q * stride] = d[q];
    }
  };
  const gen = function* (outerA, outerB, strideA, strideB) { for (let a = 0; a < outerA; a++) for (let b = 0; b < outerB; b++) yield a * strideA + b * strideB; };
  pass(nx, 1, gen(nz, ny, nx * ny, nx));
  pass(ny, nx, gen(nz, nx, nx * ny, 1));
  pass(nz, nx * ny, gen(ny, nx, nx, 1));
  for (let p = 0; p < D.length; p++) D[p] = Math.sqrt(D[p]);
  return D;
}

/** Flood fill the outside (6-connected, from the box border) of `solid`; returns 1 for inside-or-solid. */
export function fillHoles(solid, nx, ny, nz) {
  const out = new Uint8Array(solid.length), stack = new Int32Array(solid.length);
  let sp = 0;
  const push = (p) => { if (!solid[p] && !out[p]) { out[p] = 1; stack[sp++] = p; } };
  for (let k = 0; k < nz; k++) for (let j = 0; j < ny; j++) for (let i = 0; i < nx; i++) {
    // a dimension of size 1 (2-D slice) has no border along it
    if (i === 0 || j === 0 || i === nx - 1 || j === ny - 1 || (nz > 1 && (k === 0 || k === nz - 1))) push((k * ny + j) * nx + i);
  }
  while (sp) {
    const p = stack[--sp], i = p % nx, j = ((p / nx) | 0) % ny, k = (p / (nx * ny)) | 0;
    if (i > 0) push(p - 1); if (i < nx - 1) push(p + 1);
    if (j > 0) push(p - nx); if (j < ny - 1) push(p + nx);
    if (k > 0) push(p - nx * ny); if (k < nz - 1) push(p + nx * ny);
  }
  const res = new Uint8Array(solid.length);
  for (let p = 0; p < res.length; p++) res[p] = out[p] ? 0 : 1;
  return res;
}

/** Separable Gaussian blur (sigma in voxels) of a Float32 field, edge-clamped. */
export function gaussian(F, nx, ny, nz, sigma) {
  const r = Math.max(1, Math.ceil(3 * sigma)), w = [];
  let sum = 0; for (let t = -r; t <= r; t++) { const x = Math.exp(-(t * t) / (2 * sigma * sigma)); w.push(x); sum += x; }
  for (let t = 0; t < w.length; t++) w[t] /= sum;
  let A = Float32Array.from(F), B = new Float32Array(F.length);
  const dims = [nx, ny, nz], strides = [1, nx, nx * ny];
  for (let ax = 0; ax < 3; ax++) {
    const L = dims[ax], st = strides[ax];
    for (let p = 0; p < A.length; p++) {
      const c = ((p / st) | 0) % L; let acc = 0;
      for (let t = -r; t <= r; t++) { let q = c + t; q = q < 0 ? 0 : q >= L ? L - 1 : q; acc += w[t + r] * A[p + (q - c) * st]; }
      B[p] = acc;
    }
    [A, B] = [B, A];
  }
  return A;
}

/** Trilinear sample of a Float32 grid field at continuous voxel coordinates. */
export function trilinear(F, nx, ny, nz, x, y, z) {
  x = Math.min(nx - 1.0001, Math.max(0, x)); y = Math.min(ny - 1.0001, Math.max(0, y)); z = Math.min(nz - 1.0001, Math.max(0, z));
  const i = Math.floor(x), j = Math.floor(y), k = Math.floor(z), fx = x - i, fy = y - j, fz = z - k;
  const p = (k * ny + j) * nx + i, sx = 1, sy = nx, sz = nx * ny;
  const c00 = F[p] * (1 - fx) + F[p + sx] * fx, c10 = F[p + sy] * (1 - fx) + F[p + sy + sx] * fx;
  const c01 = F[p + sz] * (1 - fx) + F[p + sz + sx] * fx, c11 = F[p + sz + sy] * (1 - fx) + F[p + sz + sy + sx] * fx;
  return (c00 * (1 - fy) + c10 * fy) * (1 - fz) + (c01 * (1 - fy) + c11 * fy) * fz;
}

/**
 * Naive surface nets on a scalar field sampled by fn(x,y,z) (LPS mm) on a regular lattice.
 * Iso-surface at 0 (negative inside). Returns {positions Float32Array LPS, indices Uint32Array}
 * with outward-facing triangles (counter-clockwise seen from outside).
 */
export function surfaceNets(fn, lo, hi, h) {
  const n = [0, 1, 2].map((d) => Math.floor((hi[d] - lo[d]) / h) + 1);
  const [nx, ny, nz] = n, V = new Float32Array(nx * ny * nz);
  for (let k = 0; k < nz; k++) for (let j = 0; j < ny; j++) for (let i = 0; i < nx; i++) V[(k * ny + j) * nx + i] = fn(lo[0] + i * h, lo[1] + j * h, lo[2] + k * h);
  const cell = new Int32Array((nx - 1) * (ny - 1) * (nz - 1)).fill(-1), pos = [];
  const cid = (i, j, k) => (k * (ny - 1) + j) * (nx - 1) + i, vid = (i, j, k) => (k * ny + j) * nx + i;
  const E = [[0, 1], [2, 3], [4, 5], [6, 7], [0, 2], [1, 3], [4, 6], [5, 7], [0, 4], [1, 5], [2, 6], [3, 7]];
  const corner = (c) => [c & 1, (c >> 1) & 1, (c >> 2) & 1];
  for (let k = 0; k < nz - 1; k++) for (let j = 0; j < ny - 1; j++) for (let i = 0; i < nx - 1; i++) {
    const val = []; let inside = 0;
    for (let c = 0; c < 8; c++) { const [a, b, d] = corner(c); const x = V[vid(i + a, j + b, k + d)]; val.push(x); if (x < 0) inside++; }
    if (inside === 0 || inside === 8) continue;
    let sx = 0, sy = 0, sz = 0, m = 0;
    for (const [a, b] of E) {
      if ((val[a] < 0) === (val[b] < 0)) continue;
      const t = val[a] / (val[a] - val[b]), ca = corner(a), cb = corner(b);
      sx += ca[0] + t * (cb[0] - ca[0]); sy += ca[1] + t * (cb[1] - ca[1]); sz += ca[2] + t * (cb[2] - ca[2]); m++;
    }
    cell[cid(i, j, k)] = pos.length / 3;
    pos.push(lo[0] + (i + sx / m) * h, lo[1] + (j + sy / m) * h, lo[2] + (k + sz / m) * h);
  }
  const idx = [];
  const quad = (a, b, c, d, flip) => { if (a < 0 || b < 0 || c < 0 || d < 0) return; if (flip) idx.push(a, c, b, a, d, c); else idx.push(a, b, c, a, c, d); };
  for (let k = 1; k < nz - 1; k++) for (let j = 1; j < ny - 1; j++) for (let i = 1; i < nx - 1; i++) {
    const v0 = V[vid(i, j, k)] < 0;
    // edge along +x from (i,j,k): the four cells sharing it are (i, j-1..j, k-1..k)
    if (i < nx - 1 && v0 !== (V[vid(i + 1, j, k)] < 0)) quad(cell[cid(i, j - 1, k - 1)], cell[cid(i, j, k - 1)], cell[cid(i, j, k)], cell[cid(i, j - 1, k)], !v0);
    if (j < ny - 1 && v0 !== (V[vid(i, j + 1, k)] < 0)) quad(cell[cid(i - 1, j, k - 1)], cell[cid(i - 1, j, k)], cell[cid(i, j, k)], cell[cid(i, j, k - 1)], !v0);
    if (k < nz - 1 && v0 !== (V[vid(i, j, k + 1)] < 0)) quad(cell[cid(i - 1, j - 1, k)], cell[cid(i, j - 1, k)], cell[cid(i, j, k)], cell[cid(i - 1, j, k)], !v0);
  }
  return { positions: Float32Array.from(pos), indices: Uint32Array.from(idx) };
}

/** Boundary + non-manifold edge count of an indexed triangle mesh. */
export function edgeStats(indices) {
  const m = new Map();
  for (let t = 0; t < indices.length; t += 3) for (let e = 0; e < 3; e++) {
    const a = indices[t + e], b = indices[t + (e + 1) % 3], k = a < b ? a * 4294967296 + b : b * 4294967296 + a;
    m.set(k, (m.get(k) || 0) + 1);
  }
  let boundary = 0, nonManifold = 0;
  for (const c of m.values()) { if (c === 1) boundary++; else if (c > 2) nonManifold++; }
  return { boundary, nonManifold, edges: m.size };
}

/** Signed volume (mL) of an LPS-mm triangle mesh. Positive when triangles face outward. */
export function meshVolumeMl(P, I) {
  let V = 0;
  for (let t = 0; t < I.length; t += 3) {
    const a = 3 * I[t], b = 3 * I[t + 1], c = 3 * I[t + 2];
    V += (P[a] * (P[b + 1] * P[c + 2] - P[b + 2] * P[c + 1]) - P[a + 1] * (P[b] * P[c + 2] - P[b + 2] * P[c]) + P[a + 2] * (P[b] * P[c + 1] - P[b + 1] * P[c])) / 6;
  }
  return V / 1000;
}

// ------------------------------------------------------------------ robust structure voxelisation
/** Sub-box (grid indices) covering a vertex array, padded. null when outside the grid. */
export function subBox(grid, P, pad = 2) {
  const s = grid.s, lo = grid.lo, mn = [Infinity, Infinity, Infinity], mx = [-Infinity, -Infinity, -Infinity];
  for (let v = 0; v < P.length; v += 3) for (let d = 0; d < 3; d++) { const x = P[v + d]; if (x < mn[d]) mn[d] = x; if (x > mx[d]) mx[d] = x; }
  const i0 = [0, 1, 2].map((d) => Math.max(0, Math.floor((mn[d] - lo[d]) / s) - pad));
  const i1 = [0, 1, 2].map((d) => Math.min(grid.n[d] - 1, Math.ceil((mx[d] - lo[d]) / s) + pad));
  const n = [0, 1, 2].map((d) => i1[d] - i0[d] + 1);
  return n.some((x) => x <= 0) ? null : { i0, n };
}

/** Voxels touched by the surface (triangles sampled at <= s/2), as a mask on the given sub-box. */
export function surfaceBand(grid, P, I, box) {
  const { i0, n } = box, s = grid.s, lo = grid.lo, mask = new Uint8Array(n[0] * n[1] * n[2]);
  const put = (x, y, z) => {
    const a = Math.round((x - lo[0]) / s) - i0[0], b = Math.round((y - lo[1]) / s) - i0[1], c = Math.round((z - lo[2]) / s) - i0[2];
    if (a >= 0 && b >= 0 && c >= 0 && a < n[0] && b < n[1] && c < n[2]) mask[(c * n[1] + b) * n[0] + a] = 1;
  };
  for (let t = 0; t < I.length; t += 3) {
    const A = 3 * I[t], B = 3 * I[t + 1], C = 3 * I[t + 2];
    const L = Math.max(Math.hypot(P[A] - P[B], P[A + 1] - P[B + 1], P[A + 2] - P[B + 2]), Math.hypot(P[B] - P[C], P[B + 1] - P[C + 1], P[B + 2] - P[C + 2]), Math.hypot(P[C] - P[A], P[C + 1] - P[A + 1], P[C + 2] - P[A + 2]));
    const m = Math.max(1, Math.ceil(L / (0.5 * s)));
    for (let u = 0; u <= m; u++) for (let v = 0; v <= m - u; v++) {
      const a = u / m, b = v / m, c = 1 - a - b;
      put(c * P[A] + a * P[B] + b * P[C], c * P[A + 1] + a * P[B + 1] + b * P[C + 1], c * P[A + 2] + a * P[B + 2] + b * P[C + 2]);
    }
  }
  return mask;
}

function dilate6(mask, n) {
  const out = Uint8Array.from(mask), [nx, ny, nz] = n;
  for (let k = 0; k < nz; k++) for (let j = 0; j < ny; j++) for (let i = 0; i < nx; i++) {
    const p = (k * ny + j) * nx + i; if (!mask[p]) continue;
    if (i > 0) out[p - 1] = 1; if (i < nx - 1) out[p + 1] = 1; if (j > 0) out[p - nx] = 1; if (j < ny - 1) out[p + nx] = 1; if (k > 0) out[p - nx * ny] = 1; if (k < nz - 1) out[p + nx * ny] = 1;
  }
  return out;
}

/**
 * Voxelise one atlas structure.
 * mode 'solid': close the surface band (1-voxel dilation seals small mesh holes) and flood-fill;
 *               if the fill leaks through a large opening, fall back to 3-axis parity voting.
 * mode 'wall':  parity voting restricted to voxels within maxT mm of the surface (thin-walled
 *               shells such as heart chambers, whose valve openings make parity streak).
 * mode 'band':  surface voxels only (thin sheets: valve leaflets, membranes).
 * Returns {mask, i0, n, method}.
 */
export function voxelizeStructure(grid, P, I, mode = 'solid', maxT = 8) {
  if (mode !== 'band') { const c = capHoles(P, I); P = c.positions; I = c.indices; }
  const box = subBox(grid, P, 2); if (!box) return null;
  const band = surfaceBand(grid, P, I, box);
  if (mode === 'band') return { mask: band, ...box, method: 'band' };
  const par = voxelizeMesh(grid, P, I, 2);
  // voxelizeMesh uses the same padded box
  const M = par.mask;
  if (mode === 'wall') {
    const D = edt(band, ...box.n), lim = maxT / grid.s, out = new Uint8Array(M.length);
    const thin = new Uint8Array(M.length); // without the band (closer to the true thickness of thin walls)
    for (let p = 0; p < out.length; p++) { thin[p] = M[p] && D[p] <= lim ? 1 : 0; out[p] = band[p] || thin[p] ? 1 : 0; }
    return { mask: out, thin, ...box, method: 'wall' };
  }
  const B1 = dilate6(band, box.n), F = fillHoles(B1, ...box.n);
  let interior = 0, mcount = 0;
  for (let p = 0; p < F.length; p++) { if (F[p] && !B1[p]) interior++; if (M[p]) mcount++; }
  const out = new Uint8Array(M.length);
  if (interior >= 0.5 * mcount && interior > 0) {
    for (let p = 0; p < out.length; p++) out[p] = (F[p] && !B1[p]) || band[p] || (B1[p] && M[p]) ? 1 : 0;
    return { mask: out, ...box, method: 'fill' };
  }
  for (let p = 0; p < out.length; p++) out[p] = M[p] || band[p] ? 1 : 0;
  return { mask: out, ...box, method: 'parity' };
}

/** Closest point on triangle (a,b,c) to p (Ericson, Real-Time Collision Detection 5.1.5). */
function closestOnTri(p, a, b, c) {
  const ab = [b[0] - a[0], b[1] - a[1], b[2] - a[2]], ac = [c[0] - a[0], c[1] - a[1], c[2] - a[2]], ap = [p[0] - a[0], p[1] - a[1], p[2] - a[2]];
  const dot = (u, v) => u[0] * v[0] + u[1] * v[1] + u[2] * v[2];
  const d1 = dot(ab, ap), d2 = dot(ac, ap); if (d1 <= 0 && d2 <= 0) return a;
  const bp = [p[0] - b[0], p[1] - b[1], p[2] - b[2]], d3 = dot(ab, bp), d4 = dot(ac, bp); if (d3 >= 0 && d4 <= d3) return b;
  const vc = d1 * d4 - d3 * d2; if (vc <= 0 && d1 >= 0 && d3 <= 0) { const v = d1 / (d1 - d3); return [a[0] + v * ab[0], a[1] + v * ab[1], a[2] + v * ab[2]]; }
  const cp = [p[0] - c[0], p[1] - c[1], p[2] - c[2]], d5 = dot(ab, cp), d6 = dot(ac, cp); if (d6 >= 0 && d5 <= d6) return c;
  const vb = d5 * d2 - d1 * d6; if (vb <= 0 && d2 >= 0 && d6 <= 0) { const w = d2 / (d2 - d6); return [a[0] + w * ac[0], a[1] + w * ac[1], a[2] + w * ac[2]]; }
  const va = d3 * d6 - d5 * d4; if (va <= 0 && d4 - d3 >= 0 && d5 - d6 >= 0) { const w = (d4 - d3) / ((d4 - d3) + (d5 - d6)); return [b[0] + w * (c[0] - b[0]), b[1] + w * (c[1] - b[1]), b[2] + w * (c[2] - b[2])]; }
  const den = 1 / (va + vb + vc), v = vb * den, w = vc * den;
  return [a[0] + ab[0] * v + ac[0] * w, a[1] + ab[1] * v + ac[1] * w, a[2] + ab[2] * v + ac[2] * w];
}

/**
 * Local signed voxelisation for consistently oriented meshes with openings (heart chamber walls):
 * a voxel within maxT mm of the surface is inside when it lies behind the nearest triangle(s)
 * (normals oriented by the sign of the enclosed volume). Openings do not matter because every
 * decision is local. Returns {mask,i0,n,method:'signed'}.
 */
export function voxelizeSigned(grid, P, I, maxT) {
  const box = subBox(grid, P, Math.ceil(maxT / grid.s) + 1); if (!box) return null;
  const sgn = meshVolumeMl(P, I) >= 0 ? 1 : -1, cs = 4, cells = new Map();
  const key = (a, b, c) => ((a + 512) * 1024 + (b + 512)) * 1024 + (c + 512);
  const nT = I.length / 3, N = new Float32Array(nT * 3);
  for (let t = 0; t < nT; t++) {
    const A = 3 * I[3 * t], B = 3 * I[3 * t + 1], C = 3 * I[3 * t + 2];
    const u = [P[B] - P[A], P[B + 1] - P[A + 1], P[B + 2] - P[A + 2]], v = [P[C] - P[A], P[C + 1] - P[A + 1], P[C + 2] - P[A + 2]];
    const n = [u[1] * v[2] - u[2] * v[1], u[2] * v[0] - u[0] * v[2], u[0] * v[1] - u[1] * v[0]], l = Math.hypot(...n) || 1;
    N[3 * t] = sgn * n[0] / l; N[3 * t + 1] = sgn * n[1] / l; N[3 * t + 2] = sgn * n[2] / l;
    const lo = [0, 1, 2].map((d) => Math.floor(Math.min(P[A + d], P[B + d], P[C + d]) / cs)), hi = [0, 1, 2].map((d) => Math.floor(Math.max(P[A + d], P[B + d], P[C + d]) / cs));
    for (let a = lo[0]; a <= hi[0]; a++) for (let b = lo[1]; b <= hi[1]; b++) for (let c = lo[2]; c <= hi[2]; c++) { const k = key(a, b, c); let arr = cells.get(k); if (!arr) cells.set(k, (arr = [])); arr.push(t); }
  }
  const { i0, n } = box, mask = new Uint8Array(n[0] * n[1] * n[2]), seen = new Int32Array(nT).fill(-1);
  const vtx = (i) => [P[3 * i], P[3 * i + 1], P[3 * i + 2]];
  const R = Math.ceil(maxT / cs) + 1;
  let q = 0;
  for (let c = 0; c < n[2]; c++) for (let b = 0; b < n[1]; b++) for (let a = 0; a < n[0]; a++, q++) {
    const p = grid.pos(a + i0[0], b + i0[1], c + i0[2]), cc = p.map((x) => Math.floor(x / cs));
    let best = maxT * maxT, side = 0, found = false;
    for (let r = 0; r <= R; r++) {
      if (found && (r - 1) * cs > Math.sqrt(best)) break;
      for (let da = -r; da <= r; da++) for (let db = -r; db <= r; db++) for (let dc = -r; dc <= r; dc++) {
        if (Math.max(Math.abs(da), Math.abs(db), Math.abs(dc)) !== r) continue; // ring shell only
        const arr = cells.get(key(cc[0] + da, cc[1] + db, cc[2] + dc)); if (!arr) continue;
        for (const t of arr) {
          if (seen[t] === q) continue; seen[t] = q;
          const cp = closestOnTri(p, vtx(I[3 * t]), vtx(I[3 * t + 1]), vtx(I[3 * t + 2]));
          const d = [p[0] - cp[0], p[1] - cp[1], p[2] - cp[2]], d2 = d[0] * d[0] + d[1] * d[1] + d[2] * d[2];
          const s = d[0] * N[3 * t] + d[1] * N[3 * t + 1] + d[2] * N[3 * t + 2];
          if (d2 < best - 1e-6) { best = d2; side = s; found = true; } else if (d2 < best + 1e-6) side += s; // ties: sum face votes
        }
      }
    }
    if (found && side < 0) mask[q] = 1;
  }
  return { mask, i0, n, method: 'signed' };
}

/**
 * Close the holes of a triangle mesh: weld vertices by position, chain boundary edges into loops and
 * fan-triangulate every loop around its centroid (orientation follows the boundary direction so the
 * caps continue the surface orientation). Returns {positions, indices, loops, capped}.
 */
export function capHoles(P, I, maxLoop = 400) {
  const key = new Map(), id = new Int32Array(P.length / 3);
  for (let i = 0; i < id.length; i++) { const k = Math.round(P[3 * i] * 1000) + ',' + Math.round(P[3 * i + 1] * 1000) + ',' + Math.round(P[3 * i + 2] * 1000); if (!key.has(k)) key.set(k, i); id[i] = key.get(k); }
  const half = new Map(); // directed edge a->b count
  for (let t = 0; t < I.length; t += 3) for (let e = 0; e < 3; e++) { const a = id[I[t + e]], b = id[I[t + (e + 1) % 3]]; half.set(a + '_' + b, (half.get(a + '_' + b) || 0) + 1); }
  const next = new Map(); // boundary: a->b exists, b->a does not; cap edge must run b->a
  for (const k of half.keys()) { const [a, b] = k.split('_').map(Number); if (!half.has(b + '_' + a)) { if (!next.has(b)) next.set(b, []); next.get(b).push(a); } }
  const pos = Array.from(P), idx = Array.from(I), used = new Set(); let loops = 0, capped = 0;
  for (const start of next.keys()) {
    if (used.has(start)) continue;
    const loop = [start]; used.add(start); let cur = start, ok = false;
    for (let it = 0; it < maxLoop; it++) {
      const cand = (next.get(cur) || []).filter((v) => v === start || !used.has(v));
      if (!cand.length) break;
      const v = cand.includes(start) && loop.length > 2 ? start : cand.find((x) => x !== start);
      if (v === undefined) break;
      if (v === start) { ok = true; break; }
      loop.push(v); used.add(v); cur = v;
    }
    loops++;
    if (!ok || loop.length < 3) continue;
    const c = [0, 0, 0]; for (const v of loop) for (let d = 0; d < 3; d++) c[d] += P[3 * v + d] / loop.length;
    const ci = pos.length / 3; pos.push(...c);
    for (let i = 0; i < loop.length; i++) idx.push(loop[i], loop[(i + 1) % loop.length], ci);
    capped++;
  }
  return { positions: Float32Array.from(pos), indices: Uint32Array.from(idx), loops, capped };
}
