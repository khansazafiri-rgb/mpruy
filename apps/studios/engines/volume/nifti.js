// Minimal NIfTI-1 reader (header, affine, typed voxel data). Pure: works in Node tools, tests and the browser.
// Used to validate that overlays share the exact grid/affine of the image before they are shown together.
const DT = { 2: Uint8Array, 4: Int16Array, 8: Int32Array, 16: Float32Array, 64: Float64Array, 256: Int8Array, 512: Uint16Array, 768: Uint32Array };

export function parseNifti(buffer) {
  const bytes = buffer instanceof ArrayBuffer ? new Uint8Array(buffer) : new Uint8Array(buffer.buffer, buffer.byteOffset, buffer.byteLength);
  const view = new DataView(bytes.buffer, bytes.byteOffset, bytes.byteLength);
  let le = true;
  if (view.getInt32(0, true) !== 348) { if (view.getInt32(0, false) === 348) le = false; else throw Error('NIFTI_HEADER'); }
  const magic = String.fromCharCode(...bytes.subarray(344, 347));
  if (magic !== 'n+1' && magic !== 'ni1') throw Error('NIFTI_MAGIC');
  const i16 = o => view.getInt16(o, le), f32 = o => view.getFloat32(o, le);
  const dim = Array.from({ length: 8 }, (_, i) => i16(40 + 2 * i));
  const pixdim = Array.from({ length: 8 }, (_, i) => f32(76 + 4 * i));
  const datatype = i16(70), bitpix = i16(72), voxOffset = f32(108);
  const sclSlope = f32(112), sclInter = f32(116), qformCode = i16(252), sformCode = i16(254);
  let affine;
  if (sformCode > 0) {
    affine = [0, 1, 2].map(r => [0, 1, 2, 3].map(c => f32(280 + r * 16 + c * 4)));
  } else if (qformCode > 0) {
    let b = f32(256), c = f32(260), d = f32(264); const qx = f32(268), qy = f32(272), qz = f32(276);
    let a = 1 - (b * b + c * c + d * d); a = a < 1e-7 ? 0 : Math.sqrt(a);
    const qfac = pixdim[0] < 0 ? -1 : 1, [dx, dy, dz] = [pixdim[1], pixdim[2], pixdim[3] * qfac];
    const R = [[a * a + b * b - c * c - d * d, 2 * (b * c - a * d), 2 * (b * d + a * c)], [2 * (b * c + a * d), a * a + c * c - b * b - d * d, 2 * (c * d - a * b)], [2 * (b * d - a * c), 2 * (c * d + a * b), a * a + d * d - c * c - b * b]];
    affine = R.map((row, r) => [row[0] * dx, row[1] * dy, row[2] * dz, [qx, qy, qz][r]]);
  } else {
    affine = [[pixdim[1], 0, 0, 0], [0, pixdim[2], 0, 0], [0, 0, pixdim[3], 0]];
  }
  const Type = DT[datatype];
  if (!Type) throw Error('NIFTI_DATATYPE_' + datatype);
  const n = dim[1] * Math.max(1, dim[2]) * Math.max(1, dim[3]);
  const start = bytes.byteOffset + Math.round(voxOffset);
  const raw = bytes.buffer.slice(start, start + n * Type.BYTES_PER_ELEMENT);
  let data = new Type(raw);
  if (!le && Type.BYTES_PER_ELEMENT > 1) { const dv = new DataView(raw), out = new Type(n); for (let i = 0; i < n; i++) out[i] = Type === Float32Array ? dv.getFloat32(i * 4, false) : Type === Int16Array ? dv.getInt16(i * 2, false) : Type === Uint16Array ? dv.getUint16(i * 2, false) : dv.getInt32(i * 4, false); data = out; }
  return { dims: [dim[1], dim[2], dim[3]], pixdim: [pixdim[1], pixdim[2], pixdim[3]], datatype, bitpix, sclSlope, sclInter, qformCode, sformCode, affine, data };
}

/** Voxel (i,j,k) -> world (RAS mm) using the affine. */
export const voxelToWorld = (affine, [i, j, k]) => affine.map(r => r[0] * i + r[1] * j + r[2] * k + r[3]);

/** World -> voxel (inverse of the 3x4 affine). */
export function worldToVoxel(affine, [x, y, z]) {
  const [[a, b, c, tx], [d, e, f, ty], [g, h, i, tz]] = affine;
  const det = a * (e * i - f * h) - b * (d * i - f * g) + c * (d * h - e * g);
  if (Math.abs(det) < 1e-12) throw Error('SINGULAR_AFFINE');
  const inv = [[(e * i - f * h) / det, (c * h - b * i) / det, (b * f - c * e) / det], [(f * g - d * i) / det, (a * i - c * g) / det, (c * d - a * f) / det], [(d * h - e * g) / det, (b * g - a * h) / det, (a * e - b * d) / det]];
  const p = [x - tx, y - ty, z - tz];
  return inv.map(r => r[0] * p[0] + r[1] * p[1] + r[2] * p[2]);
}

/** True when two volumes share dimensions and affine (to 1e-4 mm): an overlay may only be drawn on such an image. */
export function sameGrid(a, b, tol = 1e-4) {
  if (a.dims.some((d, i) => d !== b.dims[i])) return false;
  for (let r = 0; r < 3; r++) for (let c = 0; c < 4; c++) if (Math.abs(a.affine[r][c] - b.affine[r][c]) > tol) return false;
  return true;
}

/** Orientation code (e.g. "RAS", "LPS") of the voxel axes, from the affine's dominant directions. */
export function orientation(affine) {
  const labels = [['L', 'R'], ['P', 'A'], ['I', 'S']];
  return [0, 1, 2].map(col => {
    const v = [affine[0][col], affine[1][col], affine[2][col]];
    const axis = v.map(Math.abs).indexOf(Math.max(...v.map(Math.abs)));
    return labels[axis][v[axis] > 0 ? 1 : 0];
  }).join('');
}
