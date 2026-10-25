import { useEffect, useMemo, useRef, useState } from 'react';
import { ChevronLeft, ChevronRight, RotateCcw } from 'lucide-react';
import LabLayerStage from './LabLayerStage';
import { ORIGIN_LABEL, clampDepth, depthFromKey, effectiveLayers, guidedDepth, layerCaption, stepDepth, toggleLayer, wheelDepth } from './labLayers';

export function ProvenanceBanner({ block }) {
  return <div className="space-y-2">
    {block.dev && <p role="alert" className="rounded-xl border-2 border-coral bg-coral/10 p-3 text-sm font-bold uppercase tracking-wide text-coral">DEVELOPMENT SCHEMATIC — NOT FOR MEDICAL TEACHING</p>}
    {block.origin && <p className="text-xs text-ink-muted">Asal visual: <strong>{ORIGIN_LABEL[block.origin] || block.origin}</strong></p>}
  </div>;
}

// Superficial -> deep spatial explorer. Works for any region: the layers come from lesson data, not from this component.
// Reading order: which layer -> the picture -> what it is -> how deep -> secondary controls.
export default function LabLayerExplorer({ block, layers }) {
  const n = layers.length;
  const [depth, setDepth] = useState(0); const [manual, setManual] = useState(null); const [opacity, setOpacity] = useState({});
  const [selected, setSelected] = useState(''); const [guided, setGuided] = useState(false); const [step, setStep] = useState(0);
  const stage = useRef(null); const depthRef = useRef(0); const acc = useRef({ v: 0, t: 0 });
  depthRef.current = depth;
  const items = useMemo(() => effectiveLayers(layers, { depth, manual, opacity }), [layers, depth, manual, opacity]);
  const current = layers[clampDepth(depth, n)]; const focus = layers.find((l) => l.id === selected) || current;
  const focusOpacity = items.find((l) => l.id === focus.id)?.opacity ?? 1;
  const caption = layerCaption(layers, depth);
  const setDepthAuto = (d) => { setDepth(clampDepth(d, n)); setManual(null); setSelected(''); };
  const goStep = (i) => { const k = Math.max(0, Math.min(block.guided.length - 1, i)); setStep(k); setDepthAuto(guidedDepth(layers, block.guided[k])); };
  const reset = () => { setDepth(0); setManual(null); setOpacity({}); setSelected(''); setStep(0); };
  const onKey = (e) => { const d = depthFromKey(e.key, depth, n); if (d !== null) { e.preventDefault(); setDepthAuto(d); } };

  // Mouse wheel / trackpad over the picture moves through the layers. Conservative: only while the pointer is over the
  // picture, never for ctrl/pinch or sideways scrolling, and at either end the event is released so the page scrolls on.
  useEffect(() => {
    const el = stage.current; if (!el) return undefined;
    const onWheel = (e) => {
      if (e.ctrlKey || Math.abs(e.deltaX) > Math.abs(e.deltaY)) return;
      const now = performance.now(); if (now - acc.current.t > 250) acc.current.v = 0; // stale deltas do not accumulate
      const delta = e.deltaMode === 1 ? e.deltaY * 16 : e.deltaY;
      const r = wheelDepth(depthRef.current, n, delta, acc.current.v);
      acc.current = { v: r.acc, t: now };
      if (!r.consume) return;
      e.preventDefault();
      if (r.depth !== depthRef.current) { depthRef.current = r.depth; setDepth(r.depth); setManual(null); setSelected(''); }
    };
    el.addEventListener('wheel', onWheel, { passive: false });
    return () => el.removeEventListener('wheel', onWheel);
  }, [n]);

  const step0 = guided ? block.guided[step] : null;
  return <section className="min-w-0 space-y-3" aria-label={`Layer Explorer: ${block.title}`}>
    <header className="space-y-1"><h3 className="text-lg font-bold">{block.title}</h3>{block.goal && <p className="text-sm text-ink-muted"><strong>Tujuan:</strong> {block.goal}</p>}</header>
    <ProvenanceBanner block={block} />
    <div className="grid min-w-0 gap-x-5 gap-y-3 lg:grid-cols-[minmax(0,1fr)_minmax(0,22rem)]">
      {/* 1 + 2: which layer, and the picture */}
      <div className="min-w-0 space-y-2">
        <div className="flex items-center justify-between gap-2">
          <p className="min-w-0 text-sm"><span className="font-bold text-brand">Lapisan {clampDepth(depth, n) + 1} / {n}</span> · <span className="font-semibold">{current.name}</span></p>
          <div className="flex shrink-0 gap-1"><button type="button" className="btn btn-secondary min-h-11 min-w-11" aria-label="Lapisan lebih superfisial" disabled={depth <= 0} onClick={() => setDepthAuto(stepDepth(depth, n, -1))}><ChevronLeft size={18} /></button><button type="button" className="btn btn-secondary min-h-11 min-w-11" aria-label="Lapisan lebih dalam" disabled={depth >= n - 1} onClick={() => setDepthAuto(stepDepth(depth, n, 1))}><ChevronRight size={18} /></button></div>
        </div>
        <div ref={stage} tabIndex={0} onKeyDown={onKey} className="rounded-2xl border border-line bg-page p-2 focus:outline focus:outline-2 focus:outline-brand sm:p-3" aria-label="Area visual; tombol panah atau scroll di atas gambar berpindah lapisan">
          <LabLayerStage items={items} label={`${block.title}. ${caption}`} viewBox="0 0 400 400" />
        </div>
        <p className="text-xs text-ink-muted">Scroll di atas gambar, tombol panah, atau slider untuk berpindah lapisan.</p>
      </div>
      {/* 3: what it is */}
      <article className="card min-w-0 space-y-2 p-4 lg:self-start" aria-live="polite">
        <p className="text-xs font-bold uppercase text-brand">Struktur</p><h4 className="text-lg font-semibold">{current.name}</h4>
        {current.description && <p className="text-sm leading-relaxed">{current.description}</p>}
        {current.clinical && <p className="rounded-lg bg-brand-soft p-3 text-sm"><strong>Koneksi klinis:</strong> {current.clinical}</p>}
      </article>
      {/* 4: how deep */}
      <div className="min-w-0 space-y-1">
        <div className="flex items-center justify-between text-xs font-bold uppercase tracking-wide text-ink-muted"><span>Superficial</span><span>Deep</span></div>
        <input type="range" min={0} max={n - 1} step={1} value={depth} onChange={(e) => setDepthAuto(Number(e.target.value))} aria-label="Kedalaman lapisan, dari superfisial ke dalam" aria-valuetext={caption} className="h-10 w-full" />
        <p className="text-sm font-semibold" role="status" aria-live="polite">{caption}</p>
      </div>
      {/* 5: secondary controls */}
      <div className="min-w-0 space-y-3">
        {block.guided?.length > 0 && <div className="space-y-2">
          <button type="button" className="btn btn-secondary btn-sm min-h-10" aria-pressed={guided} onClick={() => { setGuided(!guided); if (!guided) goStep(0); }}>{guided ? 'Tutup mode terpandu' : 'Mulai mode terpandu'}</button>
          {guided && <div className="card space-y-2 p-3"><p className="text-xs font-bold uppercase text-brand">Langkah {step + 1} dari {block.guided.length}</p><p className="font-semibold">{step0.title}</p>{step0.text && <p className="text-sm">{step0.text}</p>}
            <div className="flex items-center justify-between"><button type="button" className="btn btn-ghost btn-sm min-h-10" disabled={step <= 0} onClick={() => goStep(step - 1)}>← Sebelumnya</button><button type="button" className="btn btn-ghost btn-sm min-h-10" disabled={step >= block.guided.length - 1} onClick={() => goStep(step + 1)}>Berikutnya →</button></div></div>}
        </div>}
        <details className="rounded-xl border border-line bg-surface px-3 py-1">
          <summary className="min-h-10 cursor-pointer select-none py-2 text-sm font-semibold">Atur lapisan & opasitas <span className="font-normal text-ink-muted">· {manual ? 'manual' : 'mengikuti kedalaman'}</span></summary>
          <div className="space-y-2 pb-3">
            <ul className="space-y-1">{items.map((l) => <li key={l.id} className="flex items-center gap-2"><input id={`lyr-${block.id}-${l.id}`} type="checkbox" checked={l.visible} onChange={() => setManual(toggleLayer(layers, depth, manual, l.id))} className="h-5 w-5" /><label htmlFor={`lyr-${block.id}-${l.id}`} className="min-w-0 flex-1 text-sm">{l.name}</label><button type="button" aria-pressed={focus.id === l.id} className={`btn btn-sm min-h-10 ${focus.id === l.id ? 'btn-primary' : 'btn-ghost'}`} onClick={() => setSelected(l.id)}>Pilih</button></li>)}</ul>
            <label className="flex items-center gap-2 text-sm"><span className="min-w-0 shrink-0">Opasitas: {focus.name}</span><input type="range" min={0} max={1} step={0.05} value={focusOpacity} onChange={(e) => setOpacity({ ...opacity, [focus.id]: Number(e.target.value) })} aria-label={`Opasitas ${focus.name}`} className="min-w-0 flex-1" /><span className="w-10 text-right text-ink-muted">{Math.round(focusOpacity * 100)}%</span></label>
            <div className="flex flex-wrap gap-2">{manual && <button type="button" className="btn btn-secondary btn-sm min-h-10" onClick={() => setManual(null)}>Ikuti kedalaman lagi</button>}<button type="button" className="btn btn-ghost btn-sm min-h-10" onClick={reset}><RotateCcw size={14} /> Reset</button></div>
          </div>
        </details>
      </div>
    </div>
  </section>;
}
