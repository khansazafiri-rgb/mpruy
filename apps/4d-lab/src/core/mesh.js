// Registered surface meshes: GLB parsing + explicit CT/mesh registration checks.
// No visual fitting, scale guessing or manual offsets are ever applied.
import { mat4Apply } from './vec.js';

export function parseGLB(buffer) {
  const ab = buffer instanceof ArrayBuffer ? buffer : buffer.buffer.slice(buffer.byteOffset, buffer.byteOffset + buffer.byteLength);
  const d = new DataView(ab);
  if (d.byteLength < 28 || d.getUint32(0, true) !== 0x46546c67 || d.getUint32(4, true) !== 2 || d.getUint32(8, true) !== d.byteLength) throw new Error('Invalid GLB v2 container');
  let doc = null, bin = null;
  for (let o = 12; o < d.byteLength;) {
    const n = d.getUint32(o, true), type = d.getUint32(o + 4, true);
    if (o + 8 + n > d.byteLength) throw new Error('Truncated GLB chunk');
    const chunk = ab.slice(o + 8, o + 8 + n);
    if (type === 0x4e4f534a) doc = JSON.parse(new TextDecoder().decode(chunk));
    if (type === 0x004e4942) bin = chunk;
    o += 8 + n;
  }
  if (!doc || !bin) throw new Error('GLB lacks JSON or BIN chunk');
  for (const node of doc.nodes || []) if (node.matrix || node.translation || node.rotation || node.scale || node.children) throw new Error('GLB node transforms are not accepted; use the MEDCOEL pipeline export');
  const acc = (id, componentType, type) => {
    const a = doc.accessors[id], v = doc.bufferViews[a?.bufferView];
    if (!a || !v || a.sparse || v.byteStride || a.componentType !== componentType || a.type !== type) throw new Error('Unsupported GLB accessor layout');
    const off = (v.byteOffset || 0) + (a.byteOffset || 0), count = a.count * (type === 'VEC3' ? 3 : 1);
    if (off + count * 4 > bin.byteLength) throw new Error('GLB accessor out of range');
    return componentType === 5126 ? new Float32Array(bin, off, count) : new Uint32Array(bin, off, count);
  };
  return (doc.meshes || []).map((mesh) => {
    if (mesh.primitives.length !== 1) throw new Error('One primitive per mesh expected');
    const p = mesh.primitives[0];
    if (p.mode !== undefined && p.mode !== 4) throw new Error('Triangle meshes only');
    const positions = acc(p.attributes.POSITION, 5126, 'VEC3'), indices = acc(p.indices, 5125, 'SCALAR');
    const nv = positions.length / 3;
    for (let i = 0; i < indices.length; i++) if (indices[i] >= nv) throw new Error('GLB index out of range');
    return { name: mesh.name, positions, indices, extras: mesh.extras || {} };
  });
}

/** Convert glTF metre positions to LPS mm with the registration's explicit matrix. */
export function glbToLPS(positions, matrix) {
  const out = new Float32Array(positions.length);
  for (let i = 0; i < positions.length; i += 3) {
    const p = mat4Apply(matrix, [positions[i], positions[i + 1], positions[i + 2]]);
    out[i] = p[0]; out[i + 1] = p[1]; out[i + 2] = p[2];
  }
  return out;
}

export async function sha256Hex(buffer) {
  // crypto.subtle exists only in secure contexts (HTTPS, localhost). Opening a preview through a LAN IP over
  // plain http has no crypto.subtle, so a small FIPS 180-4 implementation is used there instead.
  if (globalThis.crypto?.subtle) {
    const h = await globalThis.crypto.subtle.digest('SHA-256', buffer);
    return Array.from(new Uint8Array(h), (n) => n.toString(16).padStart(2, '0')).join('');
  }
  return sha256Fallback(buffer);
}

const K256 = new Uint32Array([
  0x428a2f98, 0x71374491, 0xb5c0fbcf, 0xe9b5dba5, 0x3956c25b, 0x59f111f1, 0x923f82a4, 0xab1c5ed5, 0xd807aa98, 0x12835b01, 0x243185be, 0x550c7dc3, 0x72be5d74, 0x80deb1fe, 0x9bdc06a7, 0xc19bf174,
  0xe49b69c1, 0xefbe4786, 0x0fc19dc6, 0x240ca1cc, 0x2de92c6f, 0x4a7484aa, 0x5cb0a9dc, 0x76f988da, 0x983e5152, 0xa831c66d, 0xb00327c8, 0xbf597fc7, 0xc6e00bf3, 0xd5a79147, 0x06ca6351, 0x14292967,
  0x27b70a85, 0x2e1b2138, 0x4d2c6dfc, 0x53380d13, 0x650a7354, 0x766a0abb, 0x81c2c92e, 0x92722c85, 0xa2bfe8a1, 0xa81a664b, 0xc24b8b70, 0xc76c51a3, 0xd192e819, 0xd6990624, 0xf40e3585, 0x106aa070,
  0x19a4c116, 0x1e376c08, 0x2748774c, 0x34b0bcb5, 0x391c0cb3, 0x4ed8aa4a, 0x5b9cca4f, 0x682e6ff3, 0x748f82ee, 0x78a5636f, 0x84c87814, 0x8cc70208, 0x90befffa, 0xa4506ceb, 0xbef9a3f7, 0xc67178f2]);

/** Pure-JS SHA-256 (hex). Used only where WebCrypto is unavailable; tested against node:crypto. */
export function sha256Fallback(buffer) {
  const src = buffer instanceof Uint8Array ? buffer : new Uint8Array(buffer), len = src.length;
  const total = Math.ceil((len + 9) / 64) * 64, m = new Uint8Array(total);
  m.set(src); m[len] = 0x80;
  const dv = new DataView(m.buffer), bits = len * 8;
  dv.setUint32(total - 8, Math.floor(bits / 2 ** 32)); dv.setUint32(total - 4, bits >>> 0);
  const H = new Uint32Array([0x6a09e667, 0xbb67ae85, 0x3c6ef372, 0xa54ff53a, 0x510e527f, 0x9b05688c, 0x1f83d9ab, 0x5be0cd19]), W = new Uint32Array(64);
  const rotr = (x, n) => (x >>> n) | (x << (32 - n));
  for (let o = 0; o < total; o += 64) {
    for (let i = 0; i < 16; i++) W[i] = dv.getUint32(o + 4 * i);
    for (let i = 16; i < 64; i++) {
      const s0 = rotr(W[i - 15], 7) ^ rotr(W[i - 15], 18) ^ (W[i - 15] >>> 3), s1 = rotr(W[i - 2], 17) ^ rotr(W[i - 2], 19) ^ (W[i - 2] >>> 10);
      W[i] = (W[i - 16] + s0 + W[i - 7] + s1) >>> 0;
    }
    let [a, b, c, d, e, f, g, h] = H;
    for (let i = 0; i < 64; i++) {
      const t1 = (h + (rotr(e, 6) ^ rotr(e, 11) ^ rotr(e, 25)) + ((e & f) ^ (~e & g)) + K256[i] + W[i]) >>> 0;
      const t2 = ((rotr(a, 2) ^ rotr(a, 13) ^ rotr(a, 22)) + ((a & b) ^ (a & c) ^ (b & c))) >>> 0;
      h = g; g = f; f = e; e = (d + t1) >>> 0; d = c; c = b; b = a; a = (t1 + t2) >>> 0;
    }
    H[0] += a; H[1] += b; H[2] += c; H[3] += d; H[4] += e; H[5] += f; H[6] += g; H[7] += h;
  }
  return Array.from(H, (x) => x.toString(16).padStart(8, '0')).join('');
}

/**
 * Validate that a mesh package belongs to THIS CT:
 * sizes, affine (0.01 mm at grid corners), sparse HU probes, SHA-256 of every GLB,
 * and skin anchors (vertex -> IJK -> LPS through the CT's own affine within 0.05 mm).
 * @param files map file name -> ArrayBuffer
 */
export async function validateRegistration(reg, volume, files) {
  const errors = [];
  if (reg.schema !== 'medcoel.patient.v2') errors.push('Unknown registration schema ' + reg.schema);
  if (!reg.sizes || reg.sizes.some((n, i) => n !== volume.sizes[i])) errors.push('Mesh/CT grid sizes differ');
  const m = reg.ijkToLPS;
  for (const ijk of [[0, 0, 0], [volume.sizes[0] - 1, 0, 0], [0, volume.sizes[1] - 1, 0], [0, 0, volume.sizes[2] - 1]]) {
    const a = mat4Apply(m, ijk), b = volume.toLPS(ijk);
    if (Math.hypot(a[0] - b[0], a[1] - b[1], a[2] - b[2]) > 0.01) { errors.push('Affine mismatch: mesh was not exported from this CT geometry'); break; }
  }
  for (const s of reg.samples || []) {
    const v = volume.data[(s.ijk[2] * volume.sizes[1] + s.ijk[1]) * volume.sizes[0] + s.ijk[0]];
    if (Math.abs(v - s.value) > 0.51) { errors.push('CT voxel probes differ: mesh belongs to a different CT'); break; }
  }
  if (!reg.samples?.length) errors.push('Registration has no CT probes');
  const meshes = {};
  for (const f of reg.meshes || []) {
    const buf = files[f.file];
    if (!buf) { errors.push('Missing mesh file ' + f.file); continue; }
    if ((await sha256Hex(buf)) !== f.sha256) { errors.push('SHA-256 mismatch for ' + f.file); continue; }
    for (const mesh of parseGLB(buf)) meshes[mesh.name] = { ...mesh, lps: glbToLPS(mesh.positions, reg.glbToLPS) };
  }
  if (meshes.skin) {
    for (const a of reg.skinAnchors || []) {
      const i = a.vertex * 3, p = [meshes.skin.lps[i], meshes.skin.lps[i + 1], meshes.skin.lps[i + 2]], q = volume.toLPS(a.ijk);
      if (!(Math.hypot(p[0] - q[0], p[1] - q[1], p[2] - q[2]) < 0.05)) { errors.push('Skin anchor does not map to the CT voxel grid'); break; }
    }
  } else if (!errors.length) errors.push('Registration contains no skin mesh');
  return { ok: errors.length === 0, errors, meshes };
}
