// Single-file scalar 3D NRRD reader (raw / gzip). Runs in browsers and Node >= 18.
// Nothing is uploaded: the file is parsed in memory on the user's device.
import { mat4InvertAffine } from './vec.js';

export const MAX_BYTES = 700 * 1024 * 1024; // guard for 8 GB machines
export const MAX_VOXELS = 180e6;

const TYPES = {
  'signed char': [Int8Array, 1], char: [Int8Array, 1], int8: [Int8Array, 1], int8_t: [Int8Array, 1],
  'unsigned char': [Uint8Array, 1], uchar: [Uint8Array, 1], uint8: [Uint8Array, 1], uint8_t: [Uint8Array, 1],
  short: [Int16Array, 2], 'short int': [Int16Array, 2], 'signed short': [Int16Array, 2], 'signed short int': [Int16Array, 2], int16: [Int16Array, 2], int16_t: [Int16Array, 2],
  ushort: [Uint16Array, 2], 'unsigned short': [Uint16Array, 2], 'unsigned short int': [Uint16Array, 2], uint16: [Uint16Array, 2], uint16_t: [Uint16Array, 2],
  int: [Int32Array, 4], 'signed int': [Int32Array, 4], int32: [Int32Array, 4], int32_t: [Int32Array, 4],
  uint: [Uint32Array, 4], 'unsigned int': [Uint32Array, 4], uint32: [Uint32Array, 4], uint32_t: [Uint32Array, 4],
  float: [Float32Array, 4], float32: [Float32Array, 4], double: [Float64Array, 8], float64: [Float64Array, 8],
};
const UNIT = { mm: 1, millimeter: 1, millimeters: 1, millimetre: 1, millimetres: 1, cm: 10, m: 1000 };

export function parseHeader(bytes) {
  let split = -1;
  const lim = Math.min(bytes.length, 1 << 20);
  for (let i = 1; i < lim; i++) {
    if (bytes[i] === 10 && bytes[i - 1] === 10) { split = i + 1; break; }
    if (i >= 3 && bytes[i] === 10 && bytes[i - 1] === 13 && bytes[i - 2] === 10 && bytes[i - 3] === 13) { split = i + 1; break; }
  }
  if (split < 0) throw new Error('NRRD header has no blank-line terminator.');
  const text = new TextDecoder().decode(bytes.subarray(0, split));
  if (!/^NRRD\d+\r?\n/.test(text)) throw new Error('Not an NRRD file.');
  const fields = {};
  for (const line of text.split(/\r?\n/)) {
    if (!line || line.startsWith('#') || /^NRRD\d+/.test(line)) continue;
    const idx = line.indexOf(':');
    if (idx > 0 && line[idx + 1] !== '=') fields[line.slice(0, idx).trim().toLowerCase()] = line.slice(idx + 1).trim();
  }
  return { fields, dataOffset: split };
}

async function gunzip(u8) {
  if (typeof DecompressionStream === 'undefined') throw new Error('This browser cannot decompress gzip NRRD (DecompressionStream missing). Save the NRRD as raw.');
  const stream = new Blob([u8]).stream().pipeThrough(new DecompressionStream('gzip'));
  return new Uint8Array(await new Response(stream).arrayBuffer());
}

/** Parse an NRRD ArrayBuffer into a volume description with an explicit IJK->LPS affine. */
export async function parseNrrd(buffer, name = 'volume.nrrd') {
  const bytes = buffer instanceof Uint8Array ? buffer : new Uint8Array(buffer);
  if (bytes.byteLength > MAX_BYTES) throw new Error('NRRD exceeds the 700 MiB browser limit.');
  const { fields, dataOffset } = parseHeader(bytes);
  if (fields['data file']) throw new Error('Detached .nhdr is not supported; save as single-file .nrrd.');
  if (Number(fields.dimension) !== 3) throw new Error('Only scalar 3D NRRD is supported.');
  const sizes = (fields.sizes || '').split(/\s+/).map(Number);
  if (sizes.length !== 3 || sizes.some((n) => !Number.isSafeInteger(n) || n < 2)) throw new Error('Invalid NRRD sizes.');
  const n = sizes[0] * sizes[1] * sizes[2];
  if (n > MAX_VOXELS) throw new Error('Too many voxels for an in-browser volume; crop or downsample first.');
  const type = TYPES[(fields.type || '').toLowerCase().replace(/\s+/g, ' ').trim()];
  if (!type) throw new Error(`Unsupported NRRD voxel type '${fields.type}'.`);
  const enc = (fields.encoding || 'raw').toLowerCase();
  let body = bytes.subarray(dataOffset);
  if (enc === 'gzip' || enc === 'gz') {
    try { body = await gunzip(body); } catch (e) { throw new Error('Gzip NRRD decompression failed: ' + e.message); }
  } else if (enc !== 'raw') throw new Error(`Unsupported NRRD encoding '${enc}' (use raw or gzip).`);
  const need = n * type[1];
  if (body.byteLength < need) throw new Error(`Truncated NRRD payload: need ${need} bytes, have ${body.byteLength}.`);
  if (body.byteLength > need) throw new Error('NRRD payload is larger than the declared sizes.');
  const little = (fields.endian || 'little').toLowerCase() !== 'big';
  let data;
  const [Typed, width] = type;
  if (width === 1) data = new Typed(body.buffer, body.byteOffset, n);
  else if (little && body.byteOffset % width === 0) data = new Typed(body.buffer, body.byteOffset, n);
  else {
    data = new Typed(n);
    const view = new DataView(body.buffer, body.byteOffset, need);
    const get = { 2: Typed === Int16Array ? 'getInt16' : 'getUint16', 4: Typed === Float32Array ? 'getFloat32' : Typed === Int32Array ? 'getInt32' : 'getUint32', 8: 'getFloat64' }[width];
    for (let i = 0; i < n; i++) data[i] = view[get](i * width, little);
  }
  // ---- geometry
  const units = fields['space units'] ? [...fields['space units'].matchAll(/"([^"]+)"/g)].map((m) => UNIT[m[1].toLowerCase()]) : [1, 1, 1];
  if (units.length !== 3 || units.some((u) => !u)) throw new Error('Unsupported NRRD space units; export in mm.');
  const space = (fields.space || '').toLowerCase();
  let dirs;
  if (fields['space directions']) {
    dirs = [...fields['space directions'].matchAll(/\(([^)]*)\)/g)].map((m) => m[1].split(',').map((x, i) => Number(x) * units[i]));
    if (dirs.length !== 3 || dirs.some((v) => v.length !== 3 || v.some((x) => !Number.isFinite(x)))) throw new Error('Invalid NRRD space directions.');
  } else if (fields.spacings) {
    const s = fields.spacings.split(/\s+/).map(Number);
    if (s.length !== 3 || s.some((x) => !(x > 0))) throw new Error('Invalid NRRD spacings.');
    dirs = [[s[0], 0, 0], [0, s[1], 0], [0, 0, s[2]]];
  } else dirs = [[1, 0, 0], [0, 1, 0], [0, 0, 1]];
  let origin = [0, 0, 0];
  if (fields['space origin']) {
    origin = fields['space origin'].replace(/[()]/g, '').split(',').map((x, i) => Number(x) * units[i]);
    if (origin.length !== 3 || origin.some((x) => !Number.isFinite(x))) throw new Error('Invalid NRRD space origin.');
  }
  const flip = space === 'right-anterior-superior' || space === 'ras' ? [-1, -1, 1] : [1, 1, 1];
  const knownSpace = ['left-posterior-superior', 'lps', 'right-anterior-superior', 'ras'].includes(space);
  // affine columns are the IJK axis vectors in LPS
  const affine = [
    flip[0] * dirs[0][0], flip[0] * dirs[1][0], flip[0] * dirs[2][0], flip[0] * origin[0],
    flip[1] * dirs[0][1], flip[1] * dirs[1][1], flip[1] * dirs[2][1], flip[1] * origin[1],
    flip[2] * dirs[0][2], flip[2] * dirs[1][2], flip[2] * dirs[2][2], flip[2] * origin[2],
    0, 0, 0, 1,
  ];
  const spacing = dirs.map((v) => Math.hypot(...v));
  if (spacing.some((s) => !(s > 0))) throw new Error('Zero-length NRRD axis.');
  let maxShear = 0;
  for (let a = 0; a < 3; a++) for (let b = a + 1; b < 3; b++) maxShear = Math.max(maxShear, Math.abs(dirs[a].reduce((s, x, i) => s + x * dirs[b][i], 0) / (spacing[a] * spacing[b])));
  return {
    name, sizes, data, spacing, affine, inverse: mat4InvertAffine(affine), space: knownSpace ? 'LPS' : 'unknown',
    sourceSpace: space || 'unspecified', sheared: maxShear > 0.02, fields, byteLength: data.byteLength,
    min: undefined, max: undefined,
  };
}

/** Write a raw little-endian NRRD (used by tests and the CTACardio local helper). */
export function writeNrrd({ sizes, data, affine, type = 'short' }) {
  const d = (c) => `(${affine[c]},${affine[4 + c]},${affine[8 + c]})`;
  const header = `NRRD0005\ntype: ${type}\ndimension: 3\nspace: left-posterior-superior\nsizes: ${sizes.join(' ')}\nspace directions: ${d(0)} ${d(1)} ${d(2)}\nendian: little\nencoding: raw\nspace origin: (${affine[3]},${affine[7]},${affine[11]})\n\n`;
  const h = new TextEncoder().encode(header);
  const payload = new Uint8Array(data.buffer, data.byteOffset, data.byteLength);
  const out = new Uint8Array(h.length + payload.length);
  out.set(h, 0); out.set(payload, h.length);
  return out;
}
