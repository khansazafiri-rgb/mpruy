// Writers/readers for the atlas-derived dataset (single-file NRRD, GLB with no node transforms).
import fs from 'node:fs';
import zlib from 'node:zlib';
import crypto from 'node:crypto';

const NRRD_TYPES = { Int16Array: 'short', Uint8Array: 'unsigned char', Float32Array: 'float' };

/** data indexed [(k*ny+j)*nx+i]; affine row-major 4x4 mapping (i,j,k,1) -> LPS mm (diagonal grids only). */
export function writeNrrd(path, data, sizes, affine, comment) {
  const t = NRRD_TYPES[data.constructor.name];
  if (!t) throw new Error('unsupported NRRD type ' + data.constructor.name);
  const lines = ['NRRD0005', '# ' + comment, `type: ${t}`, 'dimension: 3', 'space: left-posterior-superior', `sizes: ${sizes.join(' ')}`,
    `space directions: (${affine[0]},${affine[4]},${affine[8]}) (${affine[1]},${affine[5]},${affine[9]}) (${affine[2]},${affine[6]},${affine[10]})`,
    'kinds: domain domain domain', 'endian: little', 'encoding: gzip', `space origin: (${affine[3]},${affine[7]},${affine[11]})`];
  const payload = zlib.gzipSync(Buffer.from(data.buffer, data.byteOffset, data.byteLength), { level: 9 });
  fs.writeFileSync(path, Buffer.concat([Buffer.from(lines.join('\n') + '\n\n', 'ascii'), payload]));
}

/** Minimal reader for the NRRD files this repository writes (gzip/raw, little endian). */
export function readNrrd(path) {
  const buf = fs.readFileSync(path);
  const end = buf.indexOf('\n\n');
  const head = buf.subarray(0, end).toString('ascii').split('\n');
  const f = Object.fromEntries(head.filter((l) => l.includes(':') && !l.startsWith('#')).map((l) => [l.slice(0, l.indexOf(':')).trim(), l.slice(l.indexOf(':') + 1).trim()]));
  const raw = f.encoding === 'gzip' ? zlib.gunzipSync(buf.subarray(end + 2)) : buf.subarray(end + 2);
  const sizes = f.sizes.split(/\s+/).map(Number);
  const ab = raw.buffer.slice(raw.byteOffset, raw.byteOffset + raw.byteLength);
  const data = f.type === 'short' ? new Int16Array(ab) : new Uint8Array(ab);
  const dirs = [...f['space directions'].matchAll(/\(([^)]*)\)/g)].map((m) => m[1].split(',').map(Number));
  const o = f['space origin'].replace(/[()]/g, '').split(',').map(Number);
  const affine = [dirs[0][0], dirs[1][0], dirs[2][0], o[0], dirs[0][1], dirs[1][1], dirs[2][1], o[1], dirs[0][2], dirs[1][2], dirs[2][2], o[2], 0, 0, 0, 1];
  return { data, sizes, affine };
}

/** meshes: [{name, positions Float32Array (glTF frame), indices Uint32Array, extras}] -> {buffer, sha256} */
export function encodeGlb(meshes, generator) {
  const parts = []; const views = []; const accessors = []; const glMeshes = []; const nodes = [];
  let off = 0;
  const pushView = (u8, target) => { views.push({ buffer: 0, byteOffset: off, byteLength: u8.byteLength, target }); parts.push(u8); off += u8.byteLength; const pad = (4 - (off % 4)) % 4; if (pad) { parts.push(new Uint8Array(pad)); off += pad; } };
  meshes.forEach((m, i) => {
    const min = [Infinity, Infinity, Infinity], max = [-Infinity, -Infinity, -Infinity];
    for (let v = 0; v < m.positions.length; v += 3) for (let d = 0; d < 3; d++) { min[d] = Math.min(min[d], m.positions[v + d]); max[d] = Math.max(max[d], m.positions[v + d]); }
    pushView(new Uint8Array(m.positions.buffer, m.positions.byteOffset, m.positions.byteLength), 34962);
    pushView(new Uint8Array(m.indices.buffer, m.indices.byteOffset, m.indices.byteLength), 34963);
    accessors.push({ bufferView: 2 * i, componentType: 5126, count: m.positions.length / 3, type: 'VEC3', min, max });
    accessors.push({ bufferView: 2 * i + 1, componentType: 5125, count: m.indices.length, type: 'SCALAR' });
    glMeshes.push({ name: m.name, primitives: [{ attributes: { POSITION: 2 * i }, indices: 2 * i + 1, mode: 4 }], extras: m.extras || {} });
    nodes.push({ name: m.name, mesh: i });
  });
  const doc = { asset: { version: '2.0', generator }, scene: 0, scenes: [{ nodes: nodes.map((_, i) => i) }], nodes, meshes: glMeshes, buffers: [{ byteLength: off }], bufferViews: views, accessors };
  let js = Buffer.from(JSON.stringify(doc));
  js = Buffer.concat([js, Buffer.alloc((4 - (js.length % 4)) % 4, 0x20)]);
  const bin = Buffer.concat(parts.map((p) => Buffer.from(p.buffer, p.byteOffset, p.byteLength)));
  const header = Buffer.alloc(12); header.writeUInt32LE(0x46546c67, 0); header.writeUInt32LE(2, 4); header.writeUInt32LE(12 + 8 + js.length + 8 + bin.length, 8);
  const ch = (len, type) => { const b = Buffer.alloc(8); b.writeUInt32LE(len, 0); b.writeUInt32LE(type, 4); return b; };
  const buffer = Buffer.concat([header, ch(js.length, 0x4e4f534a), js, ch(bin.length, 0x004e4942), bin]);
  return { buffer, sha256: crypto.createHash('sha256').update(buffer).digest('hex') };
}
