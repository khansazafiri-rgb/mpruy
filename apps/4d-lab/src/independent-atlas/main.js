// MEDCOEL's independent local Anatomy Viewer experiment. Models remain under rights review.
import * as THREE from 'three';
import { OrbitControls } from 'three/examples/jsm/controls/OrbitControls.js';
import { GLTFLoader } from 'three/examples/jsm/loaders/GLTFLoader.js';
import { DRACOLoader } from 'three/examples/jsm/loaders/DRACOLoader.js';
import { SYSTEMS, availableSystem, catalogueItems, findStructures, cleanStructureLabel } from './catalog.js';
import { createViewState, updateView, structureKey, visibleStructure, readSharedView, sharedViewPayload } from './viewState.js';

const el = id => document.getElementById(id);
const host = el('canvasHost');
const ui = Object.fromEntries([
  'system', 'systemToggles', 'region', 'search', 'results', 'details', 'status',
  'isolate', 'clear', 'hide', 'fade', 'undo', 'restore', 'front', 'back', 'side',
  'top', 'fit', 'zoomIn', 'zoomOut', 'share', 'shareUrl', 'retry', 'opacity', 'opacityValue',
].map(id => [id, el(id)]));
const assetRoot = import.meta.env.BASE_URL + 'atlas-assets/';
const scene = new THREE.Scene();
scene.background = new THREE.Color(0x0d2330);
const camera = new THREE.PerspectiveCamera(44, 1, 0.005, 80);
const renderer = new THREE.WebGLRenderer({ antialias: true, powerPreference: 'default' });
renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 1.5));
renderer.outputColorSpace = THREE.SRGBColorSpace;
host.append(renderer.domElement);
const orbit = new OrbitControls(camera, renderer.domElement);
orbit.enableDamping = true;
orbit.dampingFactor = 0.08;
orbit.minDistance = 0.12;
orbit.maxDistance = 11;
orbit.target.set(0, 1, 0);
camera.position.set(1.1, 1.35, 3.1);
orbit.update();

scene.add(new THREE.HemisphereLight(0xf2f9ff, 0x36505b, 2.8));
const keyLight = new THREE.DirectionalLight(0xffffff, 1.7);
keyLight.position.set(2.8, 4, 3);
scene.add(keyLight);
const fillLight = new THREE.DirectionalLight(0x92c4d2, 1);
fillLight.position.set(-2, 2, -1.5);
scene.add(fillLight);

const draco = new DRACOLoader();
draco.setDecoderPath(assetRoot + 'draco/');
draco.setWorkerLimit(2);
const loader = new GLTFLoader();
loader.setDRACOLoader(draco);
const ray = new THREE.Raycaster(), pointer = new THREE.Vector2();
const selectedMaterial = new THREE.MeshStandardMaterial({ color: 0xffd16c, emissive: 0x68420d, roughness: 0.55, side: THREE.DoubleSide });
const fadedMaterial = new THREE.MeshStandardMaterial({ color: 0x76b3b7, transparent: true, opacity: 0.12, depthWrite: false, side: THREE.DoubleSide });
let view = createViewState();
let entries = [], entryByKey = new Map();
const models = new Map(), pending = new Map();
const status = message => { ui.status.textContent = message; };

function resize() {
  const width = Math.max(1, host.clientWidth), height = Math.max(1, host.clientHeight);
  camera.aspect = width / height;
  camera.updateProjectionMatrix();
  renderer.setSize(width, height, false);
}
new ResizeObserver(resize).observe(host);
resize();
function draw() { orbit.update(); renderer.render(scene, camera); requestAnimationFrame(draw); }
requestAnimationFrame(draw);

function nameFor(mesh) {
  for (let node = mesh; node; node = node.parent) if (typeof node.userData?.za_name === 'string') return node.userData.za_name;
  return null;
}

function disposeModel(group) {
  scene.remove(group);
  const geometries = new Set(), materials = new Set();
  group.traverse(node => {
    if (!node.isMesh) return;
    if (node.geometry) geometries.add(node.geometry);
    for (const material of (Array.isArray(node.userData.baseMaterial) ? node.userData.baseMaterial : [node.userData.baseMaterial])) {
      if (material) materials.add(material);
    }
  });
  for (const geometry of geometries) geometry.dispose();
  for (const material of materials) material.dispose();
}
function unload(system) {
  const record = models.get(system);
  if (!record) return;
  disposeModel(record.group);
  models.delete(system);
}
function appearance() {
  const materials = new Set();
  for (const [system, record] of models) {
    for (const [key, list] of record.parts) {
      const entry = entryByKey.get(key);
      const visible = visibleStructure(view, system, entry.name, entry.regions);
      for (const mesh of list) {
        mesh.visible = visible;
        mesh.material = key === view.selected ? selectedMaterial :
          view.faded && key !== view.faded ? fadedMaterial : mesh.userData.baseMaterial;
        const originals = Array.isArray(mesh.userData.baseMaterial) ? mesh.userData.baseMaterial : [mesh.userData.baseMaterial];
        for (const material of originals) if (material) materials.add(material);
      }
    }
  }
  for (const material of materials) {
    material.opacity = view.opacity;
    material.transparent = view.opacity < 1;
    material.depthWrite = view.opacity === 1;
  }
  ui.isolate.disabled = !view.selected || view.isolated === view.selected;
  ui.hide.disabled = !view.selected;
  ui.fade.disabled = !view.selected;
  ui.clear.disabled = !view.selected && !view.isolated && !view.hidden.length && !view.faded;
  ui.undo.disabled = !view.history.length;
  ui.opacity.value = String(Math.round(view.opacity * 100));
  ui.opacityValue.value = Math.round(view.opacity * 100) + '%';
  ui.region.value = view.region;
  if (view.selected) {
    const entry = entryByKey.get(view.selected);
    ui.details.textContent = cleanStructureLabel(entry.name) + ' · ' + SYSTEMS[entry.system] +
      (entry.regions.length ? ' · Regio: ' + entry.regions.join(', ') : '') +
      ' · Ilustrasi anatomi, bukan citra medis.';
  } else ui.details.textContent = 'Klik struktur pada model atau pilih hasil pencarian.';
  for (const input of ui.systemToggles.querySelectorAll('input')) input.checked = view.enabled.includes(input.value);
}
function change(action) { view = updateView(view, action); appearance(); }

function visibleBounds() {
  const box = new THREE.Box3();
  for (const record of models.values()) for (const list of record.parts.values())
    for (const mesh of list) if (mesh.visible) box.expandByObject(mesh);
  return box;
}
function frameBounds(box, direction = new THREE.Vector3(0.36, 0.12, 1)) {
  if (box.isEmpty()) { status('Tidak ada struktur terlihat. Pulihkan tampilan untuk melihat model.'); return; }
  const center = box.getCenter(new THREE.Vector3()), size = box.getSize(new THREE.Vector3());
  const radius = Math.max(size.length() * 0.7, 0.10);
  const distance = Math.max(0.4, radius / Math.tan(THREE.MathUtils.degToRad(camera.fov / 2)) * 1.1);
  camera.up.set(0, Math.abs(direction.y) > 0.9 ? 0 : 1, Math.abs(direction.y) > 0.9 ? -1 : 0);
  orbit.target.copy(center);
  camera.position.copy(center).add(direction.normalize().multiplyScalar(distance));
  camera.near = Math.max(0.005, distance / 200);
  camera.far = Math.max(80, distance * 30);
  camera.updateProjectionMatrix();
  orbit.update();
}
function frameVisible(direction) { frameBounds(visibleBounds(), direction); }
function zoom(factor) {
  const offset = camera.position.clone().sub(orbit.target);
  const distance = Math.max(orbit.minDistance, Math.min(orbit.maxDistance, offset.length() * factor));
  camera.position.copy(orbit.target).add(offset.setLength(distance));
  orbit.update();
}

async function ensureSystem(system) {
  if (!view.enabled.includes(system)) return;
  if (models.has(system)) return;
  if (pending.has(system)) return pending.get(system);
  status('Memuat ' + SYSTEMS[system] + '…');
  const promise = loader.loadAsync(assetRoot + 'models/' + system + '.glb').then(gltf => {
    const group = gltf.scene, parts = new Map();
    group.traverse(mesh => {
      if (!mesh.isMesh) return;
      mesh.userData.baseMaterial = mesh.material;
      const name = nameFor(mesh), key = structureKey(system, name);
      if (!name || !entryByKey.has(key)) { mesh.visible = false; return; }
      if (!parts.has(key)) parts.set(key, []);
      parts.get(key).push(mesh);
      const materials = Array.isArray(mesh.material) ? mesh.material : [mesh.material];
      for (const mat of materials) if (mat) mat.side = THREE.DoubleSide;
    });
    if (!view.enabled.includes(system) || !parts.size) {
      disposeModel(group);
      if (view.enabled.includes(system)) status('Tidak ada struktur katalog dalam ' + SYSTEMS[system] + '.');
      return;
    }
    scene.add(group);
    models.set(system, { group, parts });
    ui.retry.hidden = true;
    appearance();
    status(SYSTEMS[system] + ' siap · ' + parts.size + ' struktur.');
  }).catch(error => {
    status('Gagal memuat ' + SYSTEMS[system] + ': ' + error.message);
    ui.retry.hidden = false;
  }).finally(() => pending.delete(system));
  pending.set(system, promise);
  return promise;
}

async function showSystem(system, enabled, exclusive = false) {
  if (!availableSystem(system)) return;
  if (exclusive) for (const id of [...view.enabled]) if (id !== system) {
    change({ type: 'system', system: id, enabled: false, valid: true });
    unload(id);
  }
  change({ type: 'system', system, enabled, valid: true });
  if (!enabled) unload(system);
  else await ensureSystem(system);
  appearance();
  if (enabled) frameVisible();
  else if (models.size) frameVisible();
  else status('Semua sistem tersembunyi. Pilih sistem untuk melihat anatomi.');
}

function choose(system, name, autoFrame = true) {
  const key = structureKey(system, name), list = models.get(system)?.parts.get(key);
  if (!list?.length) { status('Struktur tidak tersedia dalam model yang aktif.'); return; }
  if (view.region !== 'whole' && !entryByKey.get(key).regions.includes(view.region))
    change({ type: 'region', region: 'whole' });
  change({ type: 'select', key });
  if (autoFrame) {
    const box = new THREE.Box3();
    for (const mesh of list) box.expandByObject(mesh);
    frameBounds(box, new THREE.Vector3(0, 0, 1));
  }
  status('Struktur: ' + cleanStructureLabel(name));
}
function renderResults() {
  ui.results.replaceChildren();
  const found = findStructures(entries, ui.search.value, 'all');
  for (const entry of found) {
    const button = document.createElement('button');
    button.type = 'button';
    button.textContent = cleanStructureLabel(entry.name);
    const caption = document.createElement('small');
    caption.textContent = SYSTEMS[entry.system];
    button.append(caption);
    button.addEventListener('click', async () => {
      await showSystem(entry.system, true);
      ui.system.value = entry.system;
      choose(entry.system, entry.name);
    });
    ui.results.append(button);
  }
  if (ui.search.value.trim() && !found.length) {
    const empty = document.createElement('p');
    empty.className = 'subnote';
    empty.textContent = 'Tidak ditemukan pada katalog yang tersedia.';
    ui.results.append(empty);
  }
}

ui.system.addEventListener('change', () => showSystem(ui.system.value, true, true));
ui.search.addEventListener('input', renderResults);
ui.region.addEventListener('change', () => { change({ type: 'region', region: ui.region.value }); frameVisible(); });
ui.opacity.addEventListener('input', () => change({ type: 'opacity', value: Number(ui.opacity.value) / 100 }));
ui.isolate.addEventListener('click', () => { change({ type: 'isolate', key: view.selected }); frameVisible(); });
ui.hide.addEventListener('click', () => { change({ type: 'hide', key: view.selected }); status('Struktur disembunyikan. Gunakan Urungkan atau Pulihkan tampilan.'); });
ui.fade.addEventListener('click', () => change({ type: 'fade', key: view.selected }));
ui.clear.addEventListener('click', () => { change({ type: 'restore' }); frameVisible(); });
ui.restore.addEventListener('click', async () => {
  change({ type: 'restore' });
  if (!view.enabled.length) await showSystem('skeletal', true);
  frameVisible();
});
ui.undo.addEventListener('click', async () => {
  change({ type: 'undo' });
  for (const system of [...models.keys()]) if (!view.enabled.includes(system)) unload(system);
  await Promise.all(view.enabled.map(ensureSystem));
  appearance();
  frameVisible();
});
ui.front.addEventListener('click', () => frameVisible(new THREE.Vector3(0, 0, 1)));
ui.back.addEventListener('click', () => frameVisible(new THREE.Vector3(0, 0, -1)));
ui.side.addEventListener('click', () => frameVisible(new THREE.Vector3(1, 0, 0)));
ui.top.addEventListener('click', () => frameVisible(new THREE.Vector3(0, 1, 0)));
ui.fit.addEventListener('click', () => frameVisible());
ui.zoomIn.addEventListener('click', () => zoom(0.8));
ui.zoomOut.addEventListener('click', () => zoom(1.25));
ui.retry.addEventListener('click', async () => {
  ui.retry.hidden = true;
  for (const system of view.enabled) await ensureSystem(system);
  frameVisible();
});
ui.share.addEventListener('click', async () => {
  const snapshot = [...camera.position.toArray(), ...orbit.target.toArray()];
  const url = new URL(window.location.href);
  url.searchParams.set('view', sharedViewPayload(view, snapshot));
  ui.shareUrl.value = url.href;
  ui.shareUrl.hidden = false;
  try { await navigator.clipboard.writeText(url.href); status('Tautan tampilan disalin.'); }
  catch { ui.shareUrl.focus(); ui.shareUrl.select(); status('Tautan siap disalin dari kolom di bawah.'); }
});
document.addEventListener('keydown', event => {
  if ((event.ctrlKey || event.metaKey) && event.key.toLowerCase() === 'z') {
    if (event.target instanceof HTMLInputElement || event.target instanceof HTMLTextAreaElement) return;
    event.preventDefault(); ui.undo.click(); return;
  }
  if (event.target instanceof HTMLInputElement || event.target instanceof HTMLTextAreaElement || event.target instanceof HTMLSelectElement) return;
  if (event.key === '+' || event.key === '=') { event.preventDefault(); zoom(0.8); }
  else if (event.key === '-' || event.key === '_') { event.preventDefault(); zoom(1.25); }
  else if (event.key === 'Home') { event.preventDefault(); frameVisible(); }
  else if (event.key === 'Escape') { event.preventDefault(); change({ type: 'clearSelection' }); }
});

let pointerDown = null;
renderer.domElement.addEventListener('pointerdown', event => {
  if (event.button === 0) pointerDown = [event.clientX, event.clientY];
});
renderer.domElement.addEventListener('pointercancel', () => { pointerDown = null; });
renderer.domElement.addEventListener('pointerup', event => {
  if (!pointerDown || Math.hypot(event.clientX - pointerDown[0], event.clientY - pointerDown[1]) > 6) { pointerDown = null; return; }
  pointerDown = null;
  const rect = renderer.domElement.getBoundingClientRect();
  pointer.set((event.clientX - rect.left) / rect.width * 2 - 1, 1 - (event.clientY - rect.top) / rect.height * 2);
  ray.setFromCamera(pointer, camera);
  const candidates = [];
  for (const record of models.values()) for (const list of record.parts.values())
    for (const mesh of list) if (mesh.visible) candidates.push(mesh);
  const hit = ray.intersectObjects(candidates, false)[0];
  if (hit) {
    for (const [system, record] of models) {
      const name = nameFor(hit.object), key = structureKey(system, name);
      if (record.parts.get(key)?.includes(hit.object)) { choose(system, name, false); break; }
    }
  }
});

function renderToggles() {
  for (const [system, label] of Object.entries(SYSTEMS)) {
    const row = document.createElement('label'), input = document.createElement('input'), text = document.createElement('span');
    input.type = 'checkbox'; input.value = system; input.checked = view.enabled.includes(system);
    input.setAttribute('data-testid', 'pilot-toggle-' + system);
    input.addEventListener('change', () => showSystem(system, input.checked));
    text.textContent = label;
    row.append(input, text);
    ui.systemToggles.append(row);
  }
}

async function start() {
  renderToggles();
  try {
    const response = await fetch(assetRoot + 'data/atlas-catalog.json', { cache: 'no-cache' });
    if (!response.ok) throw new Error('Katalog tidak tersedia: HTTP ' + response.status);
    entries = catalogueItems(await response.json());
    if (!entries.length) throw new Error('Katalog tidak berisi struktur yang diizinkan.');
    entryByKey = new Map(entries.map(entry => [structureKey(entry.system, entry.name), entry]));
    const restored = readSharedView(new URL(window.location.href).searchParams.get('view'), Object.keys(SYSTEMS), new Set(entryByKey.keys()));
    if (restored) view = restored.state;
    ui.system.value = view.enabled[0];
    await Promise.all(view.enabled.map(ensureSystem));
    if (restored?.camera) {
      camera.position.fromArray(restored.camera);
      orbit.target.fromArray(restored.camera, 3);
      const axis = camera.position.clone().sub(orbit.target).normalize();
      camera.up.set(0, Math.abs(axis.y) > 0.9 ? 0 : 1, Math.abs(axis.y) > 0.9 ? -1 : 0);
      orbit.update();
    } else frameVisible();
    window.__independentAtlasPilot = {
      get system() { return ui.system.value; },
      get catalogueCount() { return entries.length; },
      get structureCount() { return [...models.values()].reduce((n, model) => n + model.parts.size, 0); },
      get loadedModels() { return models.size; },
      get selected() { return view.selected; },
      get enabled() { return [...view.enabled]; },
      get hiddenCount() { return view.hidden.length; },
      get region() { return view.region; },
    };
    appearance();
  } catch (error) { status('Penampil tidak dapat dimulai: ' + error.message); }
}
start();
