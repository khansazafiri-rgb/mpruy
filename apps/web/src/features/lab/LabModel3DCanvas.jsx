import { useEffect, useRef, useState } from 'react';
import { RotateCcw } from 'lucide-react';
import * as THREE from 'three';
import { OrbitControls } from 'three/examples/jsm/controls/OrbitControls.js';
import { GLTFLoader } from 'three/examples/jsm/loaders/GLTFLoader.js';

// Client-side only: orbit, zoom, reset, optional structure list (hide/show, opacity, label) when the lesson names glTF nodes.
export default function LabModel3DCanvas({ block, asset }) {
  const host = useRef(null); const api = useRef({});
  const [state, setState] = useState({ loading: true, error: '' });
  const [hidden, setHidden] = useState({}); const [selected, setSelected] = useState(''); const [opacity, setOpacity] = useState({});
  const structures = block.structures || [];

  useEffect(() => {
    const el = host.current; let raf = 0; let dead = false;
    const scene = new THREE.Scene(); const camera = new THREE.PerspectiveCamera(40, 1, 0.01, 1000);
    const renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true }); renderer.setPixelRatio(Math.min(2, window.devicePixelRatio || 1));
    el.appendChild(renderer.domElement); renderer.domElement.setAttribute('aria-label', `${block.title}. Seret untuk memutar, gulir untuk zoom.`);
    scene.add(new THREE.HemisphereLight(0xffffff, 0x8899aa, 1.3)); const key = new THREE.DirectionalLight(0xffffff, 1.4); key.position.set(3, 5, 4); scene.add(key);
    const controls = new OrbitControls(camera, renderer.domElement); controls.enableDamping = true;
    const size = () => { const w = el.clientWidth || 300; const h = Math.min(520, Math.max(260, Math.round(w * 0.75))); renderer.setSize(w, h); camera.aspect = w / h; camera.updateProjectionMatrix(); };
    size(); const ro = new ResizeObserver(size); ro.observe(el);
    let initial = null;
    new GLTFLoader().load(asset.url, (gltf) => {
      if (dead) return;
      const model = gltf.scene; const box = new THREE.Box3().setFromObject(model); const center = box.getCenter(new THREE.Vector3()); const radius = box.getSize(new THREE.Vector3()).length() / 2 || 1;
      model.position.sub(center); scene.add(model);
      camera.position.set(0, radius * 0.3, radius * 2.6); controls.target.set(0, 0, 0); controls.update(); initial = { pos: camera.position.clone() };
      model.traverse((o) => { if (o.isMesh && o.material) { o.material = Array.isArray(o.material) ? o.material.map((m) => m.clone()) : o.material.clone(); } });
      api.current = { model, camera, controls, initial };
      setState({ loading: false, error: '' });
    }, undefined, () => !dead && setState({ loading: false, error: 'Berkas model tidak dapat dibaca.' }));
    const tick = () => { raf = requestAnimationFrame(tick); controls.update(); renderer.render(scene, camera); };
    tick();
    return () => { dead = true; cancelAnimationFrame(raf); ro.disconnect(); controls.dispose(); scene.traverse((o) => { o.geometry?.dispose?.(); [].concat(o.material || []).forEach((m) => m.dispose?.()); }); renderer.dispose(); renderer.domElement.remove(); api.current = {}; };
  }, [asset.url, block.title]);

  // Apply visibility/opacity by glTF node name (structures[].node).
  useEffect(() => {
    const { model } = api.current; if (!model) return;
    structures.forEach((s) => { const node = s.node && model.getObjectByName(s.node); if (!node) return; node.visible = !hidden[s.id];
      node.traverse((o) => { if (o.isMesh) [].concat(o.material).forEach((m) => { const v = opacity[s.id] ?? 1; m.transparent = v < 1; m.opacity = v; }); }); });
  }, [hidden, opacity, structures, state.loading]);

  const reset = () => { const a = api.current; if (!a.camera) return; a.camera.position.copy(a.initial.pos); a.controls.target.set(0, 0, 0); a.controls.update(); setHidden({}); setOpacity({}); setSelected(''); };
  const picked = structures.find((s) => s.id === selected);
  return <div className="grid gap-4 lg:grid-cols-[minmax(0,1fr)_minmax(0,20rem)]">
    <div className="space-y-2"><div ref={host} className="overflow-hidden rounded-2xl border border-line bg-page" />{state.loading && <p className="text-sm text-ink-muted" role="status">Memuat model…</p>}{state.error && <p role="alert" className="text-sm text-coral">{state.error}</p>}
      <div className="flex gap-2"><button type="button" className="btn btn-ghost btn-sm" onClick={reset}><RotateCcw size={14} /> Reset tampilan</button><span className="self-center text-xs text-ink-muted">Seret untuk memutar, gulir atau cubit untuk zoom</span></div></div>
    {structures.length > 0 && <div className="space-y-3"><fieldset className="space-y-1"><legend className="text-sm font-semibold">Struktur</legend>{structures.map((s) => <div key={s.id} className="flex items-center gap-2"><input type="checkbox" className="h-5 w-5" checked={!hidden[s.id]} aria-label={`Tampilkan ${s.name}`} onChange={() => setHidden({ ...hidden, [s.id]: !hidden[s.id] })} /><button type="button" aria-pressed={selected === s.id} className={`btn btn-sm flex-1 justify-start ${selected === s.id ? 'btn-primary' : 'btn-ghost'}`} onClick={() => setSelected(selected === s.id ? '' : s.id)}>{s.name}</button></div>)}</fieldset>
      {picked && <article className="card space-y-2 p-3" aria-live="polite"><h4 className="font-semibold">{picked.name}</h4>{picked.description && <p className="text-sm">{picked.description}</p>}<label className="flex items-center gap-2 text-sm">Opasitas<input type="range" min={0} max={1} step={0.05} value={opacity[picked.id] ?? 1} onChange={(e) => setOpacity({ ...opacity, [picked.id]: Number(e.target.value) })} aria-label={`Opasitas ${picked.name}`} className="w-full" /></label></article>}</div>}
  </div>;
}
