// Original MEDCOEL independent Anatomy Viewer pilot.
// Built exclusively against three.js and the separate atlas-assets data pack.
// No legacy nqwrc/3d-anatomy JavaScript, CSS, HTML or runtime routes are imported.
// This is an engineering isolation experiment, not a legal/provenance clearance.
import * as THREE from 'three';
import { OrbitControls } from 'three/examples/jsm/controls/OrbitControls.js';
import { GLTFLoader } from 'three/examples/jsm/loaders/GLTFLoader.js';
import { DRACOLoader } from 'three/examples/jsm/loaders/DRACOLoader.js';
import { SYSTEMS, availableSystem, catalogueItems, findStructures, cleanStructureLabel } from './catalog.js';

const root = document.getElementById('canvasHost');
const ui = {
  system: document.getElementById('system'),
  search: document.getElementById('search'),
  results: document.getElementById('results'),
  details: document.getElementById('details'),
  status: document.getElementById('status'),
  isolate: document.getElementById('isolate'),
  clear: document.getElementById('clear'),
  front: document.getElementById('front'),
  fit: document.getElementById('fit'),
};

const assets = import.meta.env.BASE_URL + 'atlas-assets/';
const world = new THREE.Scene();
world.background = new THREE.Color(0x0d2330);
const camera = new THREE.PerspectiveCamera(44, 1, 0.005, 80);
const renderer = new THREE.WebGLRenderer({ antialias: true, alpha: false, powerPreference: 'default' });
renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 1.5));
renderer.outputColorSpace = THREE.SRGBColorSpace;
root.append(renderer.domElement);
const controls = new OrbitControls(camera, renderer.domElement);
controls.enableDamping = true;
controls.dampingFactor = 0.08;
controls.minDistance = 0.12;
controls.maxDistance = 11;
controls.target.set(0, 1, 0);
camera.position.set(1.1, 1.35, 3.1);
controls.update();

world.add(new THREE.HemisphereLight(0xf2f9ff, 0x36505b, 2.8));
const sunlight = new THREE.DirectionalLight(0xffffff, 1.7);
sunlight.position.set(2.8, 4, 3);
world.add(sunlight);
const rim = new THREE.DirectionalLight(0x92c4d2, 1.0);
rim.position.set(-2, 2, -1.5);
world.add(rim);

const draco = new DRACOLoader();
draco.setDecoderPath(assets + 'draco/');
draco.setWorkerLimit(2);
const loader = new GLTFLoader();
loader.setDRACOLoader(draco);
const ray = new THREE.Raycaster();
const pointer = new THREE.Vector2();
const highlight = new THREE.MeshStandardMaterial({
  color: 0xffd16c, emissive: 0x68420d, roughness: 0.55, side: THREE.DoubleSide,
});
let catalog = [], active = null, parts = new Map(), meshes = [], originals = new Map();
let system = 'skeletal', selected = null, isolated = false, loadTicket = 0;
const status = message => { ui.status.textContent = message; };

function resize() {
  const w = Math.max(1, root.clientWidth), h = Math.max(1, root.clientHeight);
  camera.aspect = w / h;
  camera.updateProjectionMatrix();
  renderer.setSize(w, h, false);
}
const resizeObserver = new ResizeObserver(resize);
resizeObserver.observe(root);
resize();
function frame() {
  controls.update();
  renderer.render(world, camera);
  requestAnimationFrame(frame);
}
requestAnimationFrame(frame);

function meshName(mesh) {
  // glTF extras.za_name is source data. Look at parent nodes without importing
  // the original Atlas viewer's structure registry or scene loader.
  for (let node = mesh; node; node = node.parent) {
    if (typeof node.userData?.za_name === 'string') return node.userData.za_name;
  }
  return null;
}
function releaseModel() {
  if (!active) return;
  world.remove(active);
  // Restore highlighting before releasing GPU resources.
  for (const [mesh, material] of originals) mesh.material = material;
  originals.clear();
  active.traverse(node => {
    if (!node.isMesh) return;
    node.geometry?.dispose();
    const materials = Array.isArray(node.material) ? node.material : [node.material];
    for (const m of materials) if (m && m !== highlight) m.dispose();
  });
  active = null;
  parts.clear();
  meshes = [];
  selected = null;
  isolated = false;
  ui.details.textContent = 'Pilih struktur pada model atau hasil pencarian.';
  ui.isolate.disabled = true;
  ui.clear.disabled = true;
}

function frameBounds(box, facingFront = false) {
  if (box.isEmpty()) return;
  const center = box.getCenter(new THREE.Vector3());
  const size = box.getSize(new THREE.Vector3());
  const radius = Math.max(size.length() * 0.7, 0.10);
  const distance = Math.max(0.4, radius / Math.tan(THREE.MathUtils.degToRad(camera.fov * 0.5)) * 1.1);
  controls.target.copy(center);
  if (facingFront) camera.position.set(center.x, center.y, center.z + distance);
  else camera.position.set(center.x + distance * 0.36, center.y + distance * 0.12, center.z + distance);
  camera.near = Math.max(0.005, distance / 200);
  camera.far = Math.max(80, distance * 30);
  camera.updateProjectionMatrix();
  controls.update();
}
function fitWhole(front = false) {
  if (active) frameBounds(new THREE.Box3().setFromObject(active), front);
}
function refreshSelection() {
  for (const [mesh, material] of originals) mesh.material = material;
  originals.clear();
  for (const mesh of meshes) mesh.visible = !isolated || !!(selected && parts.get(selected)?.includes(mesh));
  if (selected) {
    for (const mesh of parts.get(selected) || []) {
      originals.set(mesh, mesh.material);
      mesh.material = highlight;
      mesh.visible = true;
    }
    const entry = catalog.find(item => item.name === selected);
    ui.details.textContent = cleanStructureLabel(selected) + ' · ' + SYSTEMS[system] +
      (entry?.regions.length ? ' · Region: ' + entry.regions.join(', ') : '') +
      ' · Ilustrasi anatomi, bukan citra medis.';
  } else {
    ui.details.textContent = 'Klik struktur pada model atau pilih hasil pencarian.';
  }
  ui.isolate.disabled = !selected || isolated;
  ui.clear.disabled = !selected && !isolated;
}
function choose(name, autoFrame = true) {
  if (!parts.has(name)) {
    status('Struktur belum bisa dipilih dalam model yang sedang dimuat.');
    return false;
  }
  selected = name;
  isolated = false;
  refreshSelection();
  if (autoFrame) {
    const box = new THREE.Box3();
    for (const mesh of parts.get(name)) box.expandByObject(mesh);
    frameBounds(box, true);
  }
  status('Struktur: ' + cleanStructureLabel(name));
  return true;
}
async function loadSystem(nextSystem) {
  if (!availableSystem(nextSystem)) return;
  const ticket = ++loadTicket;
  system = nextSystem;
  ui.system.value = system;
  releaseModel();
  status('Memuat model ' + SYSTEMS[system] + '…');
  try {
    const gltf = await loader.loadAsync(assets + 'models/' + system + '.glb');
    if (ticket !== loadTicket) {
      gltf.scene.traverse(mesh => {
        if (!mesh.isMesh) return;
        mesh.geometry?.dispose();
        for (const m of (Array.isArray(mesh.material) ? mesh.material : [mesh.material])) m?.dispose();
      });
      return;
    }
    active = gltf.scene;
    world.add(active);
    active.updateMatrixWorld(true);
    for (const mesh of active.children) mesh.updateMatrixWorld(true);
    active.traverse(node => {
      if (!node.isMesh) return;
      const name = meshName(node);
      if (!name || !catalog.some(item => item.name === name && item.system === system)) {
        node.visible = false;
        return;
      }
      if (!parts.has(name)) parts.set(name, []);
      parts.get(name).push(node);
      meshes.push(node);
      // If the material was exported as single-sided, make it readable from
      // both sides of the educational 3D cut surface.
      const mats = Array.isArray(node.material) ? node.material : [node.material];
      for (const mat of mats) if (mat) mat.side = THREE.DoubleSide;
    });
    if (!meshes.length) {
      status('Tidak ada geometri yang cocok dengan katalog dalam model ini.');
      return;
    }
    fitWhole();
    status(SYSTEMS[system] + ' siap · ' + parts.size + ' struktur tersedia. Klik untuk mempelajari.');
    renderResults();
  } catch (error) {
    status('Gagal memuat ' + SYSTEMS[system] + ': ' + error.message);
  }
}
function renderResults() {
  const results = findStructures(catalog, ui.search.value, 'all');
  ui.results.replaceChildren();
  for (const entry of results) {
    const button = document.createElement('button');
    button.type = 'button';
    button.textContent = cleanStructureLabel(entry.name);
    const caption = document.createElement('small');
    caption.textContent = SYSTEMS[entry.system];
    button.append(caption);
    button.addEventListener('click', async () => {
      if (system !== entry.system) await loadSystem(entry.system);
      choose(entry.name);
    });
    ui.results.append(button);
  }
  if (ui.search.value.trim() && !results.length) {
    const empty = document.createElement('p');
    empty.className = 'subnote';
    empty.textContent = 'Tidak ditemukan pada katalog yang saat ini tersedia.';
    ui.results.append(empty);
  }
}

ui.system.addEventListener('change', () => loadSystem(ui.system.value));
ui.search.addEventListener('input', renderResults);
ui.isolate.addEventListener('click', () => {
  if (!selected) return;
  isolated = true;
  refreshSelection();
  status('Isolasi aktif · ' + cleanStructureLabel(selected));
});
ui.clear.addEventListener('click', () => {
  selected = null;
  isolated = false;
  refreshSelection();
  fitWhole();
  status('Semua struktur ' + SYSTEMS[system] + ' ditampilkan kembali.');
});
ui.front.addEventListener('click', () => fitWhole(true));
ui.fit.addEventListener('click', () => fitWhole());
let down = null;
renderer.domElement.addEventListener('pointerdown', event => {
  if (event.button === 0) down = [event.clientX, event.clientY];
});
renderer.domElement.addEventListener('pointerup', event => {
  if (!down || Math.hypot(event.clientX - down[0], event.clientY - down[1]) > 6) { down = null; return; }
  down = null;
  if (!meshes.length) return;
  const rect = renderer.domElement.getBoundingClientRect();
  pointer.x = ((event.clientX - rect.left) / rect.width) * 2 - 1;
  pointer.y = -((event.clientY - rect.top) / rect.height) * 2 + 1;
  ray.setFromCamera(pointer, camera);
  const hits = ray.intersectObjects(meshes.filter(m => m.visible), false);
  if (hits.length) {
    const name = meshName(hits[0].object);
    if (name) choose(name, false);
  }
});

async function start() {
  try {
    const response = await fetch(assets + 'data/atlas-catalog.json', { cache: 'no-cache' });
    if (!response.ok) throw new Error('Katalog tidak tersedia: HTTP ' + response.status);
    catalog = catalogueItems(await response.json());
    if (!catalog.length) throw new Error('Katalog tidak berisi struktur yang diizinkan.');
    await loadSystem('skeletal');
    window.__independentAtlasPilot = {
      get system() { return system; },
      get catalogueCount() { return catalog.length; },
      get structureCount() { return parts.size; },
      get selected() { return selected; },
      get loadedModels() { return active ? 1 : 0; },
    };
  } catch (error) { status('Penampil tidak dapat dimulai: ' + error.message); }
}
start();
