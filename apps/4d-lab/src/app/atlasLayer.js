// Shared MEDCOEL Anatomy Atlas layer for the 4D Lab.
//
// Loads the SAME files the Anatomy Atlas viewer serves (/anatomy/viewer/models/*.glb, its Draco decoder
// and data/atlas-catalog.json) instead of shipping copies. Structure identity follows the atlas loader
// (apps/anatomy/src/viewer/loadModel.js): a structure is a node with extras.za_name and owns the meshes
// whose closest za_name ancestor it is. Geometry is baked ONCE into patient LPS millimetres with the
// dataset's explicit atlasToLPS matrix (anatomy.json -> atlasFrame), so the layer lives in the same frame
// as the probe, the CT grid and the physiology field. No visual offsets are applied anywhere.
import * as THREE from 'three';
import { GLTFLoader } from 'three/examples/jsm/loaders/GLTFLoader.js';
import { DRACOLoader } from 'three/examples/jsm/loaders/DRACOLoader.js';

/** Atlas catalog groups (apps/anatomy/src/atlas/catalog.js) with workstation labels. */
export const ATLAS_GROUPS = {
  skeletal: { label: 'Rangka', system: 'skeletal', defaultOn: true },
  joints: { label: 'Sendi & diskus', system: 'joints', defaultOn: false, onDemand: true },
  heart: { label: 'Jantung', system: 'cardiovascular', defaultOn: true },
  arterial: { label: 'Arteri besar', system: 'cardiovascular', defaultOn: true },
  venous: { label: 'Vena besar', system: 'cardiovascular', defaultOn: true },
  respiratory: { label: 'Paru & saluran napas', system: 'visceral', defaultOn: true, opacity: 0.55 },
  digestive: { label: 'Pencernaan & hepatobilier', system: 'visceral', defaultOn: true },
  urinary: { label: 'Urinaria', system: 'visceral', defaultOn: true },
  reproductive: { label: 'Reproduksi', system: 'visceral', defaultOn: true },
  endocrine: { label: 'Endokrin', system: 'visceral', defaultOn: true },
  lymphatic: { label: 'Limpa & timus', system: 'lymphatic', defaultOn: true },
  muscular: { label: 'Otot batang tubuh', system: 'muscular', defaultOn: false, onDemand: true, opacity: 0.85 },
  nervous: { label: 'Saraf batang tubuh', system: 'nervous', defaultOn: false, onDemand: true },
};
const TRUNK = new Set(['thorax', 'abdomen', 'pelvis', 'back']);
const GREAT_VESSELS = /aorta|vena cava|pulmonary (trunk|artery|vein)|Bifurcation of pulmonary trunk|brachiocephalic|subclavian (artery|vein)|common carotid|internal jugular|common iliac|external iliac|internal iliac|renal (artery|vein)|hepatic portal|splenic (artery|vein)|superior mesenteric|coeliac|celiac|azygos|coronary|Coronary sinus/i;
// Structures hidden at start (large envelopes that cover the organs a student is looking for).
const CORONARY = /coronary|interventricular|Circumflex|of left ventricle|Coronary sinus|cardiac vein|Septal branches|marginal|inferolateral branch|atrial branch|conus/i;
const START_HIDDEN = /^(Pleura|Greater omentum|Lesser omentum|Mesocolon|Meso-appendix|.*taenia)$|segment of liver|bronchus|Pancreatic duct|Accessory pancreatic duct/i;
const startHidden = (n) => START_HIDDEN.test(n) || (CORONARY.test(n) && !/papillary/i.test(n));
/**
 * Which structures the procedural motion field animates (others stay static and are labelled so).
 * Kept to organs whose motion is taught (heart, lungs, diaphragm, liver, stomach, spleen, kidneys,
 * great vessels at the heart) to bound the per-frame vertex budget. Coronary vessels are hidden at start
 * and stay static when shown (labelled as static in the structure readout).
 */
export const ANIMATED = /^(Left|Right) (ventricle|atrium)$|leaflet|papillary|lobe of (left|right) lung$|^Trachea$|^Diaphragm$|^Liver$|^Gallbladder$|^Stomach$|^Spleen$|^Kidney\.[lr]$|^(Ascending aorta|Aortic arch|Pulmonary trunk|Bifurcation of pulmonary trunk|Left pulmonary artery|Right pulmonary artery|Superior vena cava|Inferior vena cava \(thoracic part\))$|pulmonary vein$/;

/** Which loaded structures to keep for the workstation (selective retention per system). */
function keep(system, name, cat) {
  const regions = cat?.regions || [];
  if (system === 'skeletal') return true;
  if (system === 'visceral') return true;
  if (system === 'lymphatic') return /^Spleen$|lobe of thymus/.test(name);
  if (system === 'cardiovascular') return cat?.group === 'heart' || GREAT_VESSELS.test(name);
  return regions.some((r) => TRUNK.has(r)) || name === 'Diaphragm';
}

export class AtlasLayer {
  /** @param patientGroup three.js group whose children are in LPS mm; @param base atlas URL root ending in '/' */
  constructor(patientGroup, base) {
    this.base = base; this.root = new THREE.Group(); this.root.name = 'atlas'; patientGroup.add(this.root);
    this.structures = new Map(); // name -> {name, system, group, meshes[], animated, visible, hiddenByUser}
    this.groups = Object.fromEntries(Object.keys(ATLAS_GROUPS).map((g) => [g, { visible: ATLAS_GROUPS[g].defaultOn, opacity: ATLAS_GROUPS[g].opacity ?? 1, count: 0, triangles: 0 }]));
    this.loaded = new Set(); this.loading = new Map(); this.catalog = null; this.matrix = null;
    this.isolated = null; this.highlighted = null; this.markAnimated = false; this.globalOpacity = 1; this.visible = true;
    this.stats = { bytes: 0, triangles: 0, vertices: 0, dropped: 0, loadMs: {} };
    this.draco = new DRACOLoader(); this.draco.setDecoderPath(base + 'draco/'); this.draco.setWorkerLimit(2);
    this.materials = new Map(); // `${group}|${uuid}` -> cloned material
    this.highlightMat = new THREE.MeshStandardMaterial({ color: 0xffc94d, emissive: 0x6a4a00, roughness: 0.4, side: THREE.DoubleSide });
  }

  /** atlasToLPS: row-major 4x4 from anatomy.json atlasFrame (metres -> LPS mm). */
  setFrame(atlasToLPS) { const m = atlasToLPS; this.matrix = new THREE.Matrix4().set(...m); }

  async loadCatalog() {
    if (this.catalog) return this.catalog;
    const r = await fetch(this.base + 'data/atlas-catalog.json');
    if (!r.ok) throw new Error(`Katalog atlas tidak tersedia (HTTP ${r.status})`);
    this.catalog = await r.json(); return this.catalog;
  }

  /** Load one atlas system file once; keep only the workstation subset; bake into LPS. */
  load(system, onProgress) {
    if (this.loaded.has(system)) return Promise.resolve();
    if (this.loading.has(system)) return this.loading.get(system);
    const p = this._load(system, onProgress).finally(() => this.loading.delete(system));
    this.loading.set(system, p); return p;
  }

  async _load(system, onProgress) {
    const t0 = performance.now();
    await this.loadCatalog();
    const loader = new GLTFLoader(); loader.setDRACOLoader(this.draco);
    const gltf = await new Promise((res, rej) => loader.load(this.base + `models/${system}.glb`, res, (e) => { if (e.total) { this.stats.bytes += 0; onProgress?.(e.loaded / e.total); } }, rej));
    const scene = gltf.scene; scene.updateMatrixWorld(true);
    const owner = (o) => { for (let c = o; c; c = c.parent) if (c.userData?.za_name) return c.userData.za_name; return null; };
    const bake = new THREE.Matrix4();
    const drop = [];
    scene.traverse((o) => {
      if (!o.isMesh) return;
      const name = owner(o), cat = this.catalog[name];
      if (!name || !keep(system, name, cat)) { drop.push(o); return; }
      const group = cat?.group && ATLAS_GROUPS[cat.group] ? cat.group : system === 'skeletal' ? 'skeletal' : system;
      const geo = o.geometry; bake.multiplyMatrices(this.matrix, o.matrixWorld); geo.applyMatrix4(bake);
      geo.computeBoundingSphere();
      const base = Array.isArray(o.material) ? o.material[0] : o.material;
      const mesh = new THREE.Mesh(geo, this._material(group, base));
      mesh.name = name; mesh.userData = { atlas: true, structure: name, group, baseMaterial: mesh.material };
      mesh.matrixAutoUpdate = false;
      let s = this.structures.get(name);
      if (!s) {
        s = { name, system, group, meshes: [], animated: ANIMATED.test(name) && !(CORONARY.test(name) && !/papillary/i.test(name)), hiddenByUser: startHidden(name), regions: cat?.regions || [] };
        this.structures.set(name, s); this.groups[group].count++;
      }
      s.meshes.push(mesh);
      const tri = (geo.index ? geo.index.count : geo.attributes.position.count) / 3;
      this.groups[group].triangles += tri; this.stats.triangles += tri; this.stats.vertices += geo.attributes.position.count;
      if (s.animated) { mesh.userData.ref = Float32Array.from(geo.attributes.position.array); geo.attributes.position.setUsage(THREE.DynamicDrawUsage); }
      this.root.add(mesh);
    });
    for (const o of drop) { o.geometry?.dispose(); this.stats.dropped++; }
    this.loaded.add(system);
    this.stats.loadMs[system] = Math.round(performance.now() - t0);
    this.apply();
  }

  _material(group, base) {
    const key = group + '|' + (base?.uuid || 'none');
    let m = this.materials.get(key);
    if (!m) { m = (base || new THREE.MeshStandardMaterial({ color: 0xcccccc })).clone(); m.side = THREE.DoubleSide; m.userData.group = group; this.materials.set(key, m); }
    return m;
  }

  /** Re-apply visibility, opacity, isolation and highlight to every mesh. */
  apply() {
    const iso = this.isolated;
    for (const [key, m] of this.materials) {
      const g = this.groups[m.userData.group], a = Math.min(g.opacity, this.globalOpacity);
      m.transparent = a < 0.999; m.opacity = a; m.depthWrite = !m.transparent; m.needsUpdate = true;
      m.emissive?.setHex(0x000000);
    }
    for (const s of this.structures.values()) {
      const groupOn = this.groups[s.group].visible;
      // isolate = only that structure (as the Atlas viewer's Isolate / Return to context)
      const show = this.visible && (iso ? s.name === iso : groupOn && !s.hiddenByUser);
      for (const mesh of s.meshes) {
        mesh.visible = show;
        const hl = s.name === this.highlighted || (iso && s.name === iso);
        mesh.material = hl ? this.highlightMat : mesh.userData.baseMaterial;
        mesh.renderOrder = mesh.material.transparent ? 4 : 2;
      }
    }
    if (this.markAnimated) this._tintAnimated();
  }

  _tintAnimated() { // emissive teal tint on animated structures (legend: procedurally animated)
    const tinted = new Map();
    for (const s of this.structures.values()) if (s.animated) for (const mesh of s.meshes) {
      if (mesh.material === this.highlightMat) continue;
      let t = tinted.get(mesh.userData.baseMaterial);
      if (!t) { t = mesh.userData.baseMaterial.clone(); t.emissive = new THREE.Color(0x0c6b5e); t.userData = { ...mesh.userData.baseMaterial.userData }; tinted.set(mesh.userData.baseMaterial, t); }
      mesh.material = t;
    }
  }

  setGroup(group, { visible, opacity } = {}) { const g = this.groups[group]; if (visible !== undefined) g.visible = visible; if (opacity !== undefined) g.opacity = opacity; this.apply(); }
  setStructureHidden(name, hidden) { const s = this.structures.get(name); if (s) { s.hiddenByUser = hidden; this.apply(); } }
  showAll() { for (const s of this.structures.values()) s.hiddenByUser = false; this.isolated = null; this.apply(); }
  isolate(name) { this.isolated = name && this.structures.has(name) ? name : null; this.apply(); }
  highlight(name) { this.highlighted = name && this.structures.has(name) ? name : null; this.apply(); }
  setVisible(v) { this.visible = v; this.apply(); }

  list() { return [...this.structures.values()].map((s) => ({ name: s.name, group: s.group, system: s.system, animated: s.animated, hidden: s.hiddenByUser })); }

  /** Raycast visible atlas meshes; returns {name, group, point (LPS)} or null. */
  pick(raycaster, toLPS) {
    const targets = []; this.root.traverse((o) => { if (o.isMesh && o.visible) targets.push(o); });
    const hit = raycaster.intersectObjects(targets, false)[0];
    if (!hit) return null;
    return { name: hit.object.userData.structure, group: hit.object.userData.group, point: hit.point.clone().applyMatrix4(toLPS).toArray() };
  }

  /**
   * Deform animated structures with the SAME displacement function the imaging uses.
   * `inEnvelope(x,y,z)` limits work to vertices the field can move (computed once per mesh).
   */
  deform(displacement, f, inEnvelope) {
    const d = [0, 0, 0]; let n = 0;
    for (const s of this.structures.values()) {
      if (!s.animated) continue;
      for (const mesh of s.meshes) {
        if (!mesh.visible) continue;
        const ref = mesh.userData.ref, pos = mesh.geometry.attributes.position, arr = pos.array;
        if (!mesh.userData.moving) { const idx = []; for (let i = 0; i < ref.length; i += 3) if (inEnvelope(ref[i], ref[i + 1], ref[i + 2])) idx.push(i); mesh.userData.moving = Uint32Array.from(idx); }
        for (const i of mesh.userData.moving) { displacement(f, ref[i], ref[i + 1], ref[i + 2], d); arr[i] = ref[i] + d[0]; arr[i + 1] = ref[i + 1] + d[1]; arr[i + 2] = ref[i + 2] + d[2]; }
        n += mesh.userData.moving.length; pos.needsUpdate = true;
      }
    }
    return n;
  }

  /** Free GPU buffers of a system (selective unloading). */
  unload(system) {
    for (const [name, s] of [...this.structures]) {
      if (s.system !== system) continue;
      for (const mesh of s.meshes) { mesh.geometry.dispose(); this.root.remove(mesh); }
      this.groups[s.group].count--; this.structures.delete(name);
    }
    this.loaded.delete(system); this.apply();
  }

  animatedVertexCount() { let n = 0; for (const s of this.structures.values()) if (s.animated) for (const m of s.meshes) n += m.geometry.attributes.position.count; return n; }
}
