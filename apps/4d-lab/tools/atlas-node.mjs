// Node-side reader for the MEDCOEL Anatomy Atlas GLBs (apps/anatomy/public/models).
// Decodes Draco, applies node world transforms and groups meshes by structure the same way the
// atlas viewer does (apps/anatomy/src/viewer/loadModel.js): a structure is a node carrying
// extras.za_name, and a mesh belongs to the closest za_name ancestor (nested structures own
// their own meshes). Used by the audit, the landmark registration builder and the tests.
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { NodeIO } from '@gltf-transform/core';
import { ALL_EXTENSIONS } from '@gltf-transform/extensions';
import draco3d from 'draco3dgltf';

export const ATLAS_ROOT = fileURLToPath(new URL('../../anatomy/public/', import.meta.url));
export const ATLAS_MODELS = path.join(ATLAS_ROOT, 'models');
export const ATLAS_SYSTEMS = ['skeletal', 'visceral', 'cardiovascular', 'muscular', 'nervous', 'joints', 'lymphatic'];

let ioPromise = null;
function io() {
  ioPromise ||= draco3d.createDecoderModule().then((decoder) => new NodeIO().registerExtensions(ALL_EXTENSIONS).registerDependencies({ 'draco3d.decoder': decoder }));
  return ioPromise;
}

const mul = (a, b) => { // column-major 4x4
  const o = new Array(16).fill(0);
  for (let c = 0; c < 4; c++) for (let r = 0; r < 4; r++) for (let k = 0; k < 4; k++) o[c * 4 + r] += a[k * 4 + r] * b[c * 4 + k];
  return o;
};

/**
 * Read one atlas system file.
 * @returns {{system, bytes, structures: Map<string,{name,parent,meshes:number,triangles:number,vertices:number,positions?:Float32Array,indices?:Uint32Array,box:number[]}>, triangles, vertices, materials}}
 */
export async function readAtlasSystem(system, { geometry = false, filter = null } = {}) {
  const file = path.join(ATLAS_MODELS, system + '.glb');
  const bytes = fs.statSync(file).size;
  const doc = await (await io()).read(file);
  const root = doc.getRoot();
  const structures = new Map();
  let triangles = 0, vertices = 0;
  const walk = (node, parentM, owner) => {
    const M = mul(parentM, node.getMatrix());
    const za = node.getExtras()?.za_name;
    let cur = owner;
    if (za) {
      cur = { name: za, parent: owner?.name || null, meshes: 0, triangles: 0, vertices: 0, box: [Infinity, Infinity, Infinity, -Infinity, -Infinity, -Infinity], pos: [], idx: [] };
      structures.set(za, cur);
    }
    const mesh = node.getMesh();
    if (mesh && cur) {
      const want = geometry && (!filter || filter(cur.name));
      for (const prim of mesh.listPrimitives()) {
        const p = prim.getAttribute('POSITION'); if (!p) continue;
        const n = p.getCount(), ind = prim.getIndices();
        const t = ind ? ind.getCount() / 3 : n / 3;
        cur.meshes++; cur.triangles += t; cur.vertices += n; triangles += t; vertices += n;
        const base = cur.pos.length / 3, v = [0, 0, 0];
        for (let i = 0; i < n; i++) {
          p.getElement(i, v);
          const x = M[0] * v[0] + M[4] * v[1] + M[8] * v[2] + M[12], y = M[1] * v[0] + M[5] * v[1] + M[9] * v[2] + M[13], z = M[2] * v[0] + M[6] * v[1] + M[10] * v[2] + M[14];
          const b = cur.box; if (x < b[0]) b[0] = x; if (y < b[1]) b[1] = y; if (z < b[2]) b[2] = z; if (x > b[3]) b[3] = x; if (y > b[4]) b[4] = y; if (z > b[5]) b[5] = z;
          if (want) cur.pos.push(x, y, z);
        }
        if (want) { if (ind) { const a = ind.getArray(); for (let i = 0; i < a.length; i++) cur.idx.push(a[i] + base); } else for (let i = 0; i < n; i++) cur.idx.push(base + i); }
      }
    }
    for (const c of node.listChildren()) walk(c, M, cur);
  };
  const I = [1, 0, 0, 0, 0, 1, 0, 0, 0, 0, 1, 0, 0, 0, 0, 1];
  for (const scene of root.listScenes()) for (const n of scene.listChildren()) walk(n, I, null);
  for (const s of structures.values()) {
    if (geometry && s.pos.length) { s.positions = Float32Array.from(s.pos); s.indices = Uint32Array.from(s.idx); }
    delete s.pos; delete s.idx;
  }
  return { system, bytes, structures, triangles, vertices, materials: root.listMaterials().length };
}

/** Area-weighted centroid of a triangle mesh (metres). */
export function centroid(positions, indices) {
  let cx = 0, cy = 0, cz = 0, A = 0;
  for (let i = 0; i < indices.length; i += 3) {
    const a = indices[i] * 3, b = indices[i + 1] * 3, c = indices[i + 2] * 3;
    const ux = positions[b] - positions[a], uy = positions[b + 1] - positions[a + 1], uz = positions[b + 2] - positions[a + 2];
    const vx = positions[c] - positions[a], vy = positions[c + 1] - positions[a + 1], vz = positions[c + 2] - positions[a + 2];
    const ar = 0.5 * Math.hypot(uy * vz - uz * vy, uz * vx - ux * vz, ux * vy - uy * vx);
    cx += ar * (positions[a] + positions[b] + positions[c]) / 3; cy += ar * (positions[a + 1] + positions[b + 1] + positions[c + 1]) / 3; cz += ar * (positions[a + 2] + positions[b + 2] + positions[c + 2]) / 3; A += ar;
  }
  return A ? [cx / A, cy / A, cz / A] : null;
}
