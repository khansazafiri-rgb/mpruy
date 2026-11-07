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
  const h = await globalThis.crypto.subtle.digest('SHA-256', buffer);
  return Array.from(new Uint8Array(h), (n) => n.toString(16).padStart(2, '0')).join('');
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
