// Lossless structure removal for the MEDCOEL Anatomy Atlas GLBs.
//
// Removes every node whose extras.za_name is listed (plus all of its descendants), every mesh,
// accessor, buffer view and material that only those nodes used, and the corresponding bytes of the
// binary chunk. Kept geometry is copied byte-for-byte: Draco streams are NOT decoded or re-encoded,
// so retained structures stay bit-identical to the source file. Quarantined geometry does not
// survive in the output in any form (the BIN chunk is rebuilt from kept buffer views only).
//
// Usage: node licensing/tools/glb-prune.mjs <in.glb> <out.glb> --remove "Kidney.l" --remove "Kidney.r" [--note text]
import fs from 'node:fs';

const GLB_MAGIC = 0x46546c67, JSON_CHUNK = 0x4e4f534a, BIN_CHUNK = 0x004e4942;

export function readGlb(buf) {
  if (buf.readUInt32LE(0) !== GLB_MAGIC || buf.readUInt32LE(4) !== 2) throw new Error('not a glTF 2.0 binary');
  let off = 12, json = null, bin = null;
  while (off < buf.length) {
    const len = buf.readUInt32LE(off), type = buf.readUInt32LE(off + 4);
    const data = buf.subarray(off + 8, off + 8 + len);
    if (type === JSON_CHUNK) json = JSON.parse(data.toString('utf8'));
    else if (type === BIN_CHUNK) bin = data;
    off += 8 + len;
  }
  if (!json) throw new Error('GLB has no JSON chunk');
  return { json, bin: bin || Buffer.alloc(0) };
}

export function writeGlb(json, bin) {
  const pad = (b, fill) => { const r = (4 - (b.length % 4)) % 4; return r ? Buffer.concat([b, Buffer.alloc(r, fill)]) : b; };
  const j = pad(Buffer.from(JSON.stringify(json), 'utf8'), 0x20), b = pad(bin, 0);
  const head = Buffer.alloc(12), jh = Buffer.alloc(8), bh = Buffer.alloc(8);
  const total = 12 + 8 + j.length + (b.length ? 8 + b.length : 0);
  head.writeUInt32LE(GLB_MAGIC, 0); head.writeUInt32LE(2, 4); head.writeUInt32LE(total, 8);
  jh.writeUInt32LE(j.length, 0); jh.writeUInt32LE(JSON_CHUNK, 4);
  bh.writeUInt32LE(b.length, 0); bh.writeUInt32LE(BIN_CHUNK, 4);
  return Buffer.concat(b.length ? [head, jh, j, bh, b] : [head, jh, j]);
}

/** Names (extras.za_name) of every structure node in a parsed GLB. */
export function structureNames(json) {
  return (json.nodes || []).map((n) => n.extras?.za_name).filter(Boolean);
}

export function pruneGlb(buf, removeNames, { note = null } = {}) {
  const { json, bin } = readGlb(buf);
  for (const k of ['skins', 'animations', 'textures', 'images', 'samplers']) {
    if (json[k]?.length) throw new Error(`unsupported glTF content for lossless pruning: ${k}`);
  }
  if ((json.buffers || []).length > 1) throw new Error('expected a single buffer');
  const wanted = new Set(removeNames);
  const nodes = json.nodes || [];
  const drop = new Set();
  const dropTree = (i) => { if (drop.has(i)) return; drop.add(i); for (const c of nodes[i].children || []) dropTree(c); };
  const found = new Set();
  nodes.forEach((n, i) => { const za = n.extras?.za_name; if (za && wanted.has(za)) { found.add(za); dropTree(i); } });
  const missing = [...wanted].filter((n) => !found.has(n));
  if (missing.length) throw new Error('structures not found: ' + missing.join(', '));

  // Nodes
  const nodeMap = new Map(); const newNodes = [];
  nodes.forEach((n, i) => { if (!drop.has(i)) { nodeMap.set(i, newNodes.length); newNodes.push(n); } });
  for (const n of newNodes) if (n.children) { n.children = n.children.filter((c) => nodeMap.has(c)).map((c) => nodeMap.get(c)); if (!n.children.length) delete n.children; }
  for (const s of json.scenes || []) s.nodes = (s.nodes || []).filter((c) => nodeMap.has(c)).map((c) => nodeMap.get(c));
  // Meshes
  const meshMap = new Map(); const newMeshes = [];
  for (const n of newNodes) if (n.mesh !== undefined) {
    if (!meshMap.has(n.mesh)) { meshMap.set(n.mesh, newMeshes.length); newMeshes.push(json.meshes[n.mesh]); }
    n.mesh = meshMap.get(n.mesh);
  }
  // Accessors, materials, buffer views referenced by kept meshes
  const accMap = new Map(), newAcc = [], matMap = new Map(), newMat = [], bvMap = new Map(), keptBv = [];
  const acc = (i) => { if (!accMap.has(i)) { accMap.set(i, newAcc.length); newAcc.push(json.accessors[i]); } return accMap.get(i); };
  const bv = (i) => { if (!bvMap.has(i)) { bvMap.set(i, keptBv.length); keptBv.push(i); } return bvMap.get(i); };
  for (const m of newMeshes) for (const p of m.primitives) {
    for (const k of Object.keys(p.attributes)) p.attributes[k] = acc(p.attributes[k]);
    if (p.indices !== undefined) p.indices = acc(p.indices);
    if (p.targets) p.targets = p.targets.map((t) => Object.fromEntries(Object.entries(t).map(([k, v]) => [k, acc(v)])));
    if (p.material !== undefined) { if (!matMap.has(p.material)) { matMap.set(p.material, newMat.length); newMat.push(json.materials[p.material]); } p.material = matMap.get(p.material); }
    const d = p.extensions?.KHR_draco_mesh_compression; if (d) d.bufferView = bv(d.bufferView);
  }
  for (const a of newAcc) {
    if (a.bufferView !== undefined) a.bufferView = bv(a.bufferView);
    if (a.sparse) throw new Error('sparse accessors are not supported');
  }
  // Rebuild BIN from kept views only (4-byte aligned)
  const parts = []; let off = 0; const newBv = [];
  for (const old of keptBv) {
    const v = { ...json.bufferViews[old] };
    const data = bin.subarray(v.byteOffset || 0, (v.byteOffset || 0) + v.byteLength);
    const padN = (4 - (off % 4)) % 4; if (padN) { parts.push(Buffer.alloc(padN)); off += padN; }
    v.byteOffset = off; v.buffer = 0; parts.push(Buffer.from(data)); off += data.length; newBv.push(v);
  }
  const newBin = Buffer.concat(parts);
  json.nodes = newNodes; json.meshes = newMeshes; json.accessors = newAcc; json.bufferViews = newBv;
  if (json.materials) json.materials = newMat;
  json.buffers = newBin.length ? [{ byteLength: newBin.length }] : [];
  json.asset = { ...json.asset, generator: 'MEDCOEL licensing/tools/glb-prune.mjs (lossless) <- ' + (json.asset?.generator || 'unknown') };
  if (note) json.asset.extras = { ...(json.asset.extras || {}), medcoelModificationNotice: note, medcoelRemovedStructures: [...wanted].sort() };
  return { glb: writeGlb(json, newBin), removedNodes: drop.size, keptNodes: newNodes.length };
}

if (import.meta.url === `file://${process.argv[1]}`) {
  const [, , inp, out, ...rest] = process.argv;
  const remove = []; let note = null;
  for (let i = 0; i < rest.length; i++) { if (rest[i] === '--remove') remove.push(rest[++i]); else if (rest[i] === '--note') note = rest[++i]; }
  if (!inp || !out || !remove.length) { console.error('usage: glb-prune.mjs in.glb out.glb --remove NAME [...] [--note TEXT]'); process.exit(2); }
  const r = pruneGlb(fs.readFileSync(inp), remove, { note });
  fs.writeFileSync(out, r.glb);
  console.log(`pruned ${r.removedNodes} node(s); kept ${r.keptNodes}; wrote ${out} (${r.glb.length} bytes)`);
}
