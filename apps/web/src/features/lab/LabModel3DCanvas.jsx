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
    // The canvas always fills its container (CSS width 100%) and is never given a fixed pixel width, so a phone can
    // never be pushed sideways. On every resize the camera aspect is updated and, until the learner moves the camera,
    // the model is re-fitted to the new aspect (rotation / orientation changes).
    const dom = renderer.domElement; dom.style.width = '100%'; dom.style.display = 'block'; dom.style.touchAction = 'none'; dom.style.maxWidth = '100%';
    let radius = 1; let moved = false; controls.addEventListener('start', () => { moved = true; });
    const fit = () => { const vf = THREE.MathUtils.degToRad(camera.fov); const hf = 2 * Math.atan(Math.tan(vf / 2) * camera.aspect); const dist = (radius * 1.15) / Math.sin(Math.min(vf, hf) / 2); camera.position.set(0, radius * 0.25, dist); controls.target.set(0, 0, 0); controls.update(); camera.near = dist / 100; camera.far = dist * 20; camera.updateProjectionMatrix(); };
    const size = () => { const w = Math.max(1, el.clientWidth); const h = Math.min(480, Math.max(240, Math.round(w * 0.8))); renderer.setSize(w, h, false); dom.style.height = `${h}px`; camera.aspect = w / h; camera.updateProjectionMatrix(); if (!moved && api.current.model) fit(); };
    size(); const ro = new ResizeObserver(size); ro.observe(el);
        new GLTFLoader().load(asset.url, (gltf) => {
      if (dead) return;
      const model = gltf.scene; const box = new THREE.Box3().setFromObject(model); const center = box.getCenter(new THREE.Vector3()); radius = box.getSize(new THREE.Vector3()).length() / 2 || 1;
      model.position.sub(center); scene.add(model);
      model.traverse((o) => { if (o.isMesh && o.material) { o.material = Array.isArray(o.material) ? o.material.map((m) => m.clone()) : o.material.clone(); } });
      api.current = { model, camera, controls, fit: () => { moved = false; fit(); } };
      fit();
      setState({ loading: false, error: '' });
    }, undefined, () => !dead && setState({ loading: false, error: 'Berkas model tidak dapat dibaca.' }));
    const tick = () => { raf = requestAnimationFrame(tick); controls.update(); renderer.render(scene, camera); };
    tick();
    return () => { dead = true; cancelAnimationFrame(raf); ro.disconnect(); controls.dispose(); scene.traverse((o) => { o.geometry?.dispose?.(); [].concat(o.material || []).forEach((m) => m.dispose?.()); }); renderer.dispose(); renderer.domElement.remove(); api.current = {}; };
  }, [asset.url, block.title]);

  // Visibility/opacity per glTF node name (structures[].node). A selected structure is lit and the others fade, so its
  // place in the whole model is obvious; the learner's own opacity is respected.
  useEffect(() => {
    const { model } = api.current; if (!model) return;
    structures.forEach((s) => {
      const node = s.node && model.getObjectByName(s.node); if (!node) return; node.visible = !hidden[s.id];
      const own = opacity[s.id] ?? 1; const v = selected && selected !== s.id ? Math.min(own, 0.22) : own; const lit = selected === s.id;
      node.traverse((o) => { if (o.isMesh) [].concat(o.material).forEach((m) => { m.transparent = v < 1; m.opacity = v; m.depthWrite = v >= 1; m.emissive?.setHex(lit ? 0x0b5a47 : 0x000000); }); });
    });
  }, [hidden, opacity, selected, structures, state.loading]);

  const reset = () => { api.current.fit?.(); setHidden({}); setOpacity({}); setSelected(''); };
  // Touch devices get touch wording; a touch-capable laptop with a mouse keeps the desktop wording.
  const coarse = typeof window !== 'undefined' && !!window.matchMedia && (window.matchMedia('(pointer: coarse)').matches || window.matchMedia('(hover: none)').matches || (navigator.maxTouchPoints > 0 && window.innerWidth < 1024) || window.innerWidth < 600);
  const picked = structures.find((s) => s.id === selected);
  return <div className="grid min-w-0 gap-3 lg:grid-cols-[minmax(0,1fr)_minmax(0,20rem)]">
    <div className="min-w-0 space-y-2">
      <div ref={host} className="w-full min-w-0 overflow-hidden rounded-2xl border border-line bg-page" />
      {state.loading && <p className="text-sm text-ink-muted" role="status">Memuat model…</p>}{state.error && <p role="alert" className="text-sm text-coral">{state.error}</p>}
      <div className="flex flex-wrap items-center gap-2"><button type="button" className="btn btn-secondary min-h-11" onClick={reset}><RotateCcw size={16} /> Reset tampilan</button><p className="min-w-0 flex-1 text-xs leading-snug text-ink-muted">{coarse ? 'Seret 1 jari untuk memutar · Cubit untuk zoom' : 'Seret untuk memutar · Scroll untuk zoom'}</p></div>
    </div>
    {structures.length > 0 && <div className="min-w-0 space-y-3">
      <fieldset className="min-w-0 space-y-1"><legend className="text-sm font-semibold">Struktur</legend>{structures.map((s) => <div key={s.id} className="flex min-w-0 items-center gap-2"><input type="checkbox" className="h-6 w-6 shrink-0" checked={!hidden[s.id]} aria-label={`Tampilkan ${s.name}`} onChange={() => setHidden({ ...hidden, [s.id]: !hidden[s.id] })} /><button type="button" aria-pressed={selected === s.id} className={`btn min-h-11 min-w-0 flex-1 justify-start overflow-hidden text-left ${selected === s.id ? 'btn-primary' : 'btn-ghost'}`} onClick={() => setSelected(selected === s.id ? '' : s.id)}><span className="truncate">{s.name}</span></button></div>)}</fieldset>
      {picked && <article className="card min-w-0 space-y-2 p-3" aria-live="polite"><p className="text-xs font-bold uppercase text-brand">Struktur terpilih</p><h4 className="break-words font-semibold">{picked.name}</h4>{picked.description && <p className="break-words text-sm">{picked.description}</p>}<label className="flex min-w-0 items-center gap-2 text-sm"><span className="shrink-0">Opasitas</span><input type="range" min={0} max={1} step={0.05} value={opacity[picked.id] ?? 1} onChange={(e) => setOpacity({ ...opacity, [picked.id]: Number(e.target.value) })} aria-label={`Opasitas ${picked.name}`} className="h-10 min-w-0 flex-1" /></label></article>}
    </div>}
  </div>;
}
