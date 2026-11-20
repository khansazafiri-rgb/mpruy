// Anatomy 3D engine (three.js): load a GLB whose nodes carry OPAQUE ids, map them to structures from a separate table,
// and offer select / highlight / hide / isolate / transparency / hierarchy / search. Names are not in the geometry, so a
// Challenge session (which withholds the table) cannot read answers from the model.
import * as THREE from 'three';
import { GLTFLoader } from 'three/examples/jsm/loaders/GLTFLoader.js';
import { OrbitControls } from 'three/examples/jsm/controls/OrbitControls.js';

const BASE = new THREE.Color('#d9c7b8'), SELECT = new THREE.Color('#f2b705');

export async function createAnatomyViewer(container, { url, onSelect = () => {}, onState = () => {} }) {
  const renderer = new THREE.WebGLRenderer({ antialias: true, preserveDrawingBuffer: true });
  renderer.setPixelRatio(Math.min(2, window.devicePixelRatio || 1));
  container.append(renderer.domElement);
  const scene = new THREE.Scene(); scene.background = new THREE.Color('#10161a');
  const camera = new THREE.PerspectiveCamera(35, 1, 1, 10000);
  scene.add(new THREE.HemisphereLight(0xffffff, 0x334455, 1.6));
  const key = new THREE.DirectionalLight(0xffffff, 1.4); key.position.set(1, 2, 3); scene.add(key);
  const controls = new OrbitControls(camera, renderer.domElement);
  controls.enableDamping = true;
  const gltf = await new GLTFLoader().loadAsync(url);
  // BodyParts3D frame: +X patient left, +Y posterior? (+Z superior). Rotate so +Z (superior) is screen-up.
  const root = gltf.scene; root.rotation.x = -Math.PI / 2;
  scene.add(root);
  const meshes = new Map();
  root.traverse(o => { if (o.isMesh) { const id = o.name || o.parent?.name; o.material = new THREE.MeshStandardMaterial({ color: BASE.clone(), roughness: 0.65, metalness: 0, transparent: true, opacity: 1, side: THREE.DoubleSide }); o.userData.sid = id; meshes.set(id, o); } });
  const box = new THREE.Box3().setFromObject(root), center = box.getCenter(new THREE.Vector3()), size = box.getSize(new THREE.Vector3()).length();
  const home = () => { controls.target.copy(center); camera.position.copy(center).add(new THREE.Vector3(0, size * 0.15, size * 1.35)); camera.near = size / 100; camera.far = size * 20; camera.updateProjectionMatrix(); controls.update(); };
  home();
  const state = { selected: null, hidden: new Set(), isolated: null, opacity: 1, rotations: 0, colors: new Map() };
  let lastAzimuth = controls.getAzimuthalAngle();
  controls.addEventListener('change', () => { if (Math.abs(controls.getAzimuthalAngle() - lastAzimuth) > 0.35) { state.rotations++; lastAzimuth = controls.getAzimuthalAngle(); emit(); } });
  const emit = () => onState({ selected: state.selected, hidden: state.hidden.size, isolated: state.isolated, opacity: state.opacity, rotations: state.rotations });
  function paint() {
    for (const [id, m] of meshes) {
      const visible = !state.hidden.has(id) && (!state.isolated || state.isolated === id);
      m.visible = visible;
      m.material.color.copy(id === state.selected ? SELECT : state.colors.get(id) || BASE);
      m.material.opacity = id === state.selected ? 1 : state.opacity;
      m.material.depthWrite = m.material.opacity > 0.99;
      m.material.emissive?.setHex(id === state.selected ? 0x332200 : 0x000000);
    }
  }
  const raycaster = new THREE.Raycaster(), pointer = new THREE.Vector2();
  let down = null;
  renderer.domElement.addEventListener('pointerdown', e => { down = [e.clientX, e.clientY]; });
  renderer.domElement.addEventListener('pointerup', e => {
    if (!down || Math.hypot(e.clientX - down[0], e.clientY - down[1]) > 5) return;
    const r = renderer.domElement.getBoundingClientRect();
    pointer.set(((e.clientX - r.left) / r.width) * 2 - 1, -((e.clientY - r.top) / r.height) * 2 + 1);
    raycaster.setFromCamera(pointer, camera);
    const hit = raycaster.intersectObjects([...meshes.values()].filter(m => m.visible), false)[0];
    api.select(hit ? hit.object.userData.sid : null, true);
  });
  const resize = () => { const w = container.clientWidth || 600, h = container.clientHeight || 400; renderer.setSize(w, h, false); camera.aspect = w / h; camera.updateProjectionMatrix(); };
  const ro = new ResizeObserver(resize); ro.observe(container); resize();
  let raf = 0; const loop = () => { raf = requestAnimationFrame(loop); controls.update(); renderer.render(scene, camera); }; loop();
  const api = {
    ids: [...meshes.keys()], state,
    select(id, byUser = false) { state.selected = id && meshes.has(id) ? id : null; paint(); onSelect(state.selected, byUser); emit(); },
    hide(id) { if (meshes.has(id)) { state.hidden.add(id); if (state.selected === id) state.selected = null; paint(); emit(); } },
    showAll() { state.hidden.clear(); state.isolated = null; paint(); emit(); },
    isolate(id) { state.isolated = meshes.has(id) ? id : null; paint(); emit(); },
    setOpacity(v) { state.opacity = Math.max(0.05, Math.min(1, v)); paint(); emit(); },
    setColors(map) { state.colors = new Map(Object.entries(map).map(([k, v]) => [k, new THREE.Color(v)])); paint(); },
    focus(id) { const m = meshes.get(id); if (!m) return; const b = new THREE.Box3().setFromObject(m); controls.target.copy(b.getCenter(new THREE.Vector3())); controls.update(); },
    home() { home(); },
    /** Screen position (CSS px, relative to the canvas) of a structure's centre: used by tests and accessible fallbacks. */
    screenPoint(id) { const m = meshes.get(id); if (!m) return null; const p = new THREE.Box3().setFromObject(m).getCenter(new THREE.Vector3()).project(camera); const r = renderer.domElement.getBoundingClientRect(); return [(p.x + 1) / 2 * r.width, (1 - p.y) / 2 * r.height]; },
    dispose() { cancelAnimationFrame(raf); ro.disconnect(); controls.dispose(); renderer.dispose(); renderer.forceContextLoss(); },
  };
  paint();
  return api;
}
