import { useEffect, useLayoutEffect, useRef, useState } from 'react';
import { Minus, Plus, RotateCcw } from 'lucide-react';
import { annotationLayers, fittedSize } from './labUtils';

const MAX_ZOOM = 3;
const FRAME_PAD = 24;

// Source and licence stay one tap away (attribution is required) without interrupting study or practice.
export function LabSource({ asset, nat, question }) {
  const lowRes = nat && Math.max(nat.w, nat.h) <= 300; const l = asset.license || {}; const d = asset.dataset;
  const available = annotationLayers(asset);
  return <details className="text-xs text-ink-muted">
    <summary className="inline-flex min-h-8 cursor-pointer select-none items-center font-semibold">ⓘ Sumber & lisensi</summary>
    <div className="mt-1 space-y-1 leading-relaxed">
      {asset.synthetic && <p><strong>Ilustrasi sintetis, bukan gambar pasien.</strong></p>}
      {d?.name && <p>{d.name}{d.split ? ` · split ${d.split}` : ''}</p>}
      <p>{l.citation || l.source} · {l.license}{l.source_url?.startsWith('https://') && <> · <a href={l.source_url} target="_blank" rel="noreferrer" className="underline">Sumber & lisensi</a></>}</p>
      {lowRes && <p>Image classification training image · {nat.w}×{nat.h}</p>}
      {!question && available.length === 0 && <p>Tidak tersedia anotasi lokasi untuk gambar ini.</p>}
    </div>
  </details>;
}

// Pembaca gambar: rasio asli dipertahankan, ukuran dasar dihitung dari gambar (bukan dari lebar kartu).
// controls: true = toolbar penuh, 'min' = zoom ringkas, false = tanpa kontrol (mis. kolom perbandingan sempit).
export default function LabImage({ asset, question = false, point, onPoint, region, controls = true, caption }) {
  const [zoom, setZoom] = useState(1);
  const [layers, setLayers] = useState({ anatomy: false, abnormality: false });
  const [broken, setBroken] = useState(false);
  const [nat, setNat] = useState(null);
  const [view, setView] = useState({ w: 0, h: typeof window === 'undefined' ? 800 : window.innerHeight });
  const wrap = useRef(null); const scroller = useRef(null); const pending = useRef(null); const drag = useRef(null);

  useEffect(() => {
    const el = wrap.current; if (!el) return undefined;
    const measure = () => setView({ w: Math.max(0, el.clientWidth - FRAME_PAD), h: window.innerHeight });
    measure();
    const ro = typeof ResizeObserver === 'undefined' ? null : new ResizeObserver(measure);
    ro?.observe(el); window.addEventListener('resize', measure);
    return () => { ro?.disconnect(); window.removeEventListener('resize', measure); };
  }, []);

  const fit = fittedSize(nat?.w, nat?.h, view.w, view.h);
  const available = annotationLayers(asset);

  function changeZoom(next) {
    const s = scroller.current;
    if (s && s.scrollWidth) pending.current = { x: (s.scrollLeft + s.clientWidth / 2) / s.scrollWidth, y: (s.scrollTop + s.clientHeight / 2) / s.scrollHeight };
    setZoom(Math.max(1, Math.min(MAX_ZOOM, next)));
  }
  useLayoutEffect(() => {
    const s = scroller.current; const p = pending.current; pending.current = null;
    if (!s || !p) return;
    s.scrollLeft = p.x * s.scrollWidth - s.clientWidth / 2; s.scrollTop = p.y * s.scrollHeight - s.clientHeight / 2;
  }, [zoom]);

  function keyPoint(e) {
    const moves = { ArrowLeft: [-0.02, 0], ArrowRight: [0.02, 0], ArrowUp: [0, -0.02], ArrowDown: [0, 0.02] };
    if (!onPoint || !moves[e.key]) return;
    e.preventDefault(); const [dx, dy] = moves[e.key];
    onPoint({ x: Math.max(0, Math.min(1, (point?.x ?? 0.5) + dx)), y: Math.max(0, Math.min(1, (point?.y ?? 0.5) + dy)) });
  }
  function keyZoom(e) {
    if (!controls) return;
    if (e.key === '+' || e.key === '=') { e.preventDefault(); changeZoom(zoom + 0.25); }
    else if (e.key === '-') { e.preventDefault(); changeZoom(zoom - 0.25); }
    else if (e.key === '0') { e.preventDefault(); changeZoom(1); }
  }
  const canDrag = zoom > 1 && !onPoint;
  const down = (e) => { if (!canDrag) return; const s = scroller.current; drag.current = { x: e.clientX, y: e.clientY, left: s.scrollLeft, top: s.scrollTop }; s.setPointerCapture?.(e.pointerId); };
  const move = (e) => { const d = drag.current; if (!d) return; const s = scroller.current; s.scrollLeft = d.left - (e.clientX - d.x); s.scrollTop = d.top - (e.clientY - d.y); };
  const up = () => { drag.current = null; };
  const overlay = (r) => ({ left: `${r.x * 100}%`, top: `${r.y * 100}%`, width: `${r.width * 100}%`, height: `${r.height * 100}%` });
  const full = controls === true;

  return <figure className="min-w-0 space-y-2">
    {controls && <div className="flex flex-wrap items-center gap-2 text-sm">
      <div className="flex items-center gap-1" role="group" aria-label="Zoom gambar">
        <button type="button" className="btn btn-ghost btn-sm min-h-10 min-w-10" aria-label="Perkecil" disabled={zoom <= 1} onClick={() => changeZoom(zoom - 0.25)}><Minus size={16} /></button>
        {full && <input aria-label="Zoom gambar" type="range" min="1" max={MAX_ZOOM} step="0.25" value={zoom} onChange={(e) => changeZoom(Number(e.target.value))} className="w-28" />}
        <button type="button" className="btn btn-ghost btn-sm min-h-10 min-w-10" aria-label="Perbesar" disabled={zoom >= MAX_ZOOM} onClick={() => changeZoom(zoom + 0.25)}><Plus size={16} /></button>
        {full && <span className="w-12 text-ink-muted" aria-live="polite">{Math.round(zoom * 100)}%</span>}
      </div>
      <button type="button" className="btn btn-ghost btn-sm min-h-10" aria-label="Reset zoom" onClick={() => { changeZoom(1); if (onPoint) onPoint(null); }}><RotateCcw size={14} />{full && ' Reset'}</button>
      {!question && available.length > 0 && <div className="flex items-center gap-2" role="group" aria-label="Overlay anotasi">
        <span className="text-ink-muted">Overlay</span>
        {available.map((k) => <button key={k} type="button" aria-pressed={layers[k]} className={`btn btn-sm ${layers[k] ? 'btn-primary' : 'btn-secondary'}`} onClick={() => setLayers({ ...layers, [k]: !layers[k] })}>{k === 'anatomy' ? 'Anatomi' : 'Temuan'}</button>)}
      </div>}
    </div>}
    <div ref={wrap} className="flex min-w-0 items-center justify-center">
      <div
        ref={scroller} tabIndex={0} role="group" aria-label="Area gambar; gunakan tombol panah atau seret untuk menggeser saat diperbesar, plus/minus untuk zoom"
        className={`relative max-w-full overflow-auto rounded-xl border border-line bg-page p-2 focus:outline focus:outline-2 focus:outline-brand ${canDrag ? 'cursor-grab active:cursor-grabbing' : ''}`}
        style={fit ? { width: fit.w + FRAME_PAD, height: fit.h + FRAME_PAD, touchAction: canDrag ? 'none' : 'auto' } : undefined}
        onKeyDown={keyZoom} onPointerDown={down} onPointerMove={move} onPointerUp={up} onPointerCancel={up}
      >
        <div className="relative" style={fit ? { width: fit.w * zoom } : undefined}>
          <img
            src={asset.url} alt={asset.alt} draggable={false} onError={() => setBroken(true)}
            onLoad={(e) => setNat({ w: e.currentTarget.naturalWidth, h: e.currentTarget.naturalHeight })}
            className={fit ? 'block h-auto w-full object-contain' : 'block h-auto w-auto max-w-full object-contain'}
            style={fit ? undefined : { maxHeight: '70vh' }}
          />
          {onPoint && !broken && <div role="button" tabIndex={0} aria-label="Pilih titik pada gambar dengan klik atau tombol panah" className="absolute inset-0 cursor-crosshair focus:outline focus:outline-2 focus:outline-brand" onKeyDown={keyPoint} onClick={(e) => { const r = e.currentTarget.getBoundingClientRect(); onPoint({ x: (e.clientX - r.left) / r.width, y: (e.clientY - r.top) / r.height }); }} />}
          {!question && (asset.annotations || []).filter((a) => layers[a.layer]).map((a) => <div key={a.id} style={overlay(a.region)} className="pointer-events-none absolute rounded border-2 border-amber-500 bg-amber-300/20"><span className="absolute left-0 top-0 rounded bg-amber-100 px-1 text-xs text-black">{a.label}</span></div>)}
          {region && <div className="pointer-events-none absolute border-4 border-brand bg-brand/20" style={overlay(region)} />}
          {point && <div className="pointer-events-none absolute h-5 w-5 -translate-x-1/2 -translate-y-1/2 rounded-full border-2 border-white bg-coral shadow" style={{ left: `${point.x * 100}%`, top: `${point.y * 100}%` }} />}
        </div>
      </div>
    </div>
    {broken && <p role="alert" className="text-coral">Gambar gagal dimuat. Muat ulang halaman atau hubungi admin.</p>}
    {caption && <figcaption className="space-y-1">{caption}</figcaption>}
    {controls && <LabSource asset={asset} nat={nat} question={question} />}
    {onPoint && <p className="text-sm text-ink-muted" aria-live="polite">{point ? `Titik: ${Math.round(point.x * 100)}%, ${Math.round(point.y * 100)}%.` : 'Klik gambar atau fokuskan area gambar lalu gunakan tombol panah.'}</p>}
  </figure>;
}
