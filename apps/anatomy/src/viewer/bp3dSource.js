// Optional, reversible model source: official BodyParts3D structures inside the approved Atlas viewer.
//
//   ?models=bp3d                      every system the local BodyParts3D inventory covers
//   ?models=bp3d:skeletal,muscular    only the listed systems; the others keep the Atlas models
//   (no parameter)                    unchanged Atlas behaviour
//
// The geometry is NEVER part of this repository or of dist/: it is read from `bp3d/` next to the viewer, which exists
// only when a local, private review preview serves it (scripts/preview-4d-lab.mjs, scripts/bp3d-review-server.mjs).
// If the inventory is missing the viewer says so and keeps the Atlas models. Each structure is wrapped in a node whose
// `za_name` is the catalogue id, so selection, search, layers, isolate, fade and undo work exactly as before.
import * as THREE from 'three';
import { asset } from '../utils/paths.js';
import { TISSUE_MATERIALS, NEUTRAL_MATERIAL, tissueClass } from './bp3dMaterials.js';

/**
 * Source frame: OBJ millimetres [X,Y,Z] -> metres [X,Z,-Y] (patient left +X, superior +Y, anterior +Z), then a fixed
 * translation into the Atlas frame. BodyParts3D and the Atlas skeleton are the same body in the same orientation with a
 * different origin: the offset is the median centre difference of 40 large bones (spread about +-2 cm). It places the
 * source in the viewer's existing camera, clipping and framing space. It is NOT a registration or accuracy claim.
 */
export const BP3D_FRAME = Object.freeze({ scale: 0.001, rotationX: -Math.PI / 2, offset: Object.freeze([0.0007, 0.0692, -0.0987]) });
export const BP3D_SKIN_STYLE = Object.freeze({ color: 0xcaa69b, roughness: 0.88, opacity: 0.2 });
const MODEL_PATH = /^\.\/structures\/[a-z0-9-]+\/model\.glb$/;
const SKIN_PATH = /^\.\/reference-surface\/skin\.glb$/;

/** Parse `?models=bp3d[:system,system]`. Returns null when the source is not requested. */
export function parseBp3dFlag(search = '') {
  const value = new URLSearchParams(search).get('models');
  if (!value || !/^bp3d(:|$)/.test(value)) return null;
  const list = value.split(':')[1];
  return { systems: list ? new Set(list.split(',').map((s) => s.trim()).filter(Boolean)) : null };
}

let flag = parseBp3dFlag(globalThis.location?.search || '');
let inventory = null, status = flag ? 'pending' : 'off', reason = '', ids = new Set(), perSystem = {};
let inventoryPromise = null;
export const bp3dRequested = () => !!flag;
export const bp3dStatus = () => ({ status, reason });
export const bp3dHas = (id) => !flag || status !== 'ready' || ids.has(id);
export const bp3dSummary = () => ({ status, reason, structures: ids.size, perSystem, systems: flag?.systems ? [...flag.systems] : null });
export const bp3dUsesSystem = (systemId) => !!flag && status === 'ready' && (!flag.systems || flag.systems.has(systemId)) && (perSystem[systemId] || 0) > 0;
/** Test hook: set the flag/state without a URL. */
export function _bp3dReset(search = '') { flag = parseBp3dFlag(search); inventory = null; status = flag ? 'pending' : 'off'; reason = ''; ids = new Set(); perSystem = {}; inventoryPromise = null; }

/** Validate the inventory shape; only relative, well-formed model paths are ever requested. */
export function validateInventory(data) {
  if (!data || !Array.isArray(data.converted) || !data.converted.length) throw new Error('inventory has no converted structures');
  const seen = new Set(), converted = [];
  for (const e of data.converted) {
    if (typeof e?.name !== 'string' || typeof e.system !== 'string' || !MODEL_PATH.test(e.modelPath || '') || seen.has(e.name)) continue;
    seen.add(e.name); converted.push(e);
  }
  if (!converted.length) throw new Error('inventory has no valid structures');
  const skin = data.referenceSurface && SKIN_PATH.test(data.referenceSurface.modelPath || '') ? data.referenceSurface : null;
  return { converted, skin, summary: data.summary || null, source: data.source || null };
}

export function loadBp3dInventory(fetchImpl = globalThis.fetch) {
  if (!flag) return Promise.resolve(null);
  inventoryPromise ??= (async () => {
    try {
      const response = await fetchImpl(asset('bp3d/inventory.json'), { cache: 'no-cache' });
      if (!response.ok) throw new Error('HTTP ' + response.status);
      inventory = validateInventory(await response.json());
      ids = new Set(inventory.converted.map((e) => e.name));
      perSystem = {};
      for (const e of inventory.converted) perSystem[e.system] = (perSystem[e.system] || 0) + 1;
      status = 'ready';
      return inventory;
    } catch (error) {
      status = 'unavailable'; reason = String(error?.message || error);
      return null;
    }
  })();
  return inventoryPromise;
}

const materials = new Map();
function materialFor(entry) {
  const cls = tissueClass(entry);
  if (!materials.has(cls)) {
    const m = TISSUE_MATERIALS[cls] || NEUTRAL_MATERIAL;
    materials.set(cls, new THREE.MeshStandardMaterial({ color: m.color, roughness: m.roughness, metalness: 0, side: THREE.DoubleSide }));
  }
  return materials.get(cls);
}

function frameGroup() {
  const frame = new THREE.Group();
  frame.name = 'BodyParts3D source frame';
  frame.rotation.x = BP3D_FRAME.rotationX;
  frame.scale.setScalar(BP3D_FRAME.scale);
  frame.position.set(...BP3D_FRAME.offset);
  return frame;
}

/** Build one system's model from its individual official structures. */
export async function loadBp3dSystem(systemId, loader, onProgress = () => {}) {
  const entries = (inventory?.converted || []).filter((e) => e.system === systemId);
  if (!entries.length) throw new Error('no BodyParts3D structures for ' + systemId);
  const root = new THREE.Group(); root.name = 'bp3d:' + systemId;
  const frame = frameGroup(); root.add(frame);
  let done = 0, failed = 0; const queue = [...entries];
  const worker = async () => {
    while (queue.length) {
      const entry = queue.shift();
      try {
        const gltf = await loader.loadAsync(asset('bp3d/' + entry.modelPath.slice(2)));
        const node = new THREE.Group();
        node.userData.za_name = entry.name; // catalogue id: the Atlas identifies structures by this
        node.userData.source = 'bodyparts3d'; node.userData.fmaId = entry.fmaId || null;
        gltf.scene.traverse((o) => { if (o.isMesh) o.material = materialFor(entry); });
        node.add(gltf.scene); frame.add(node);
      } catch { failed++; }
      onProgress(++done / entries.length * 100);
    }
  };
  await Promise.all(Array.from({ length: Math.min(6, entries.length) }, worker));
  if (failed === entries.length) throw new Error('every BodyParts3D file for ' + systemId + ' failed to load');
  root.userData.bp3d = { total: entries.length, failed };
  return root;
}

/** The official skin surface as a translucent, non-pickable reference. */
export async function loadBp3dSkin(loader) {
  if (!inventory?.skin) return null;
  const gltf = await loader.loadAsync(asset('bp3d/' + inventory.skin.modelPath.slice(2)));
  const skin = new THREE.Group(); skin.name = 'bp3d:skin-reference'; skin.userData.bp3dSkin = true;
  const frame = frameGroup(); frame.add(gltf.scene); skin.add(frame);
  gltf.scene.traverse((o) => {
    if (!o.isMesh) return;
    o.material = new THREE.MeshStandardMaterial({ color: BP3D_SKIN_STYLE.color, roughness: BP3D_SKIN_STYLE.roughness, metalness: 0, side: THREE.DoubleSide, transparent: true, opacity: BP3D_SKIN_STYLE.opacity, depthWrite: false });
    o.raycast = () => {}; // never picked: structures behind it stay selectable
    o.renderOrder = 0;
  });
  return skin;
}
