import { useMemo, useState } from 'react';
import { ChevronLeft, ChevronRight, RotateCcw } from 'lucide-react';
import LabLayerStage from './LabLayerStage';
import { ORIGIN_LABEL, clampDepth, depthFromKey, effectiveLayers, guidedDepth, layerCaption, stepDepth, toggleLayer } from './labLayers';

export function ProvenanceBanner({ block }) {
  return <div className="space-y-2">
    {block.dev && <p role="alert" className="rounded-xl border-2 border-coral bg-coral/10 p-3 text-sm font-bold uppercase tracking-wide text-coral">DEVELOPMENT SCHEMATIC — NOT FOR MEDICAL TEACHING</p>}
    {block.origin && <p className="text-xs text-ink-muted">Asal visual: <strong>{ORIGIN_LABEL[block.origin] || block.origin}</strong></p>}
  </div>;
}

// Superficial -> deep spatial explorer. Works for any region: the layers come from lesson data, not from this component.
export default function LabLayerExplorer({ block, layers: resolved }) {
  const layers = resolved; const n = layers.length;
  const [depth, setDepth] = useState(0); const [manual, setManual] = useState(null); const [opacity, setOpacity] = useState({});
  const [selected, setSelected] = useState(''); const [guided, setGuided] = useState(false); const [step, setStep] = useState(0);
  const items = useMemo(() => effectiveLayers(layers, { depth, manual, opacity }), [layers, depth, manual, opacity]);
  const current = layers[clampDepth(depth, n)]; const focus = layers.find((l) => l.id === selected) || current;
  const focusOpacity = items.find((l) => l.id === focus.id)?.opacity ?? 1;
  const caption = layerCaption(layers, depth);
  const setDepthAuto = (d) => { setDepth(clampDepth(d, n)); setManual(null); setSelected(''); };
  const goStep = (i) => { const s = block.guided[Math.max(0, Math.min(block.guided.length - 1, i))]; setStep(Math.max(0, Math.min(block.guided.length - 1, i))); setDepthAuto(guidedDepth(layers, s)); };
  const reset = () => { setDepth(0); setManual(null); setOpacity({}); setSelected(''); setStep(0); };
  const onKey = (e) => { const d = depthFromKey(e.key, depth, n); if (d !== null) { e.preventDefault(); setDepthAuto(d); } };
  const step0 = guided ? block.guided[step] : null;

  return <section className="space-y-4" aria-label={`Layer Explorer: ${block.title}`}>
    <header className="space-y-1"><h3 className="text-lg font-bold">{block.title}</h3>{block.goal && <p className="text-sm text-ink-muted"><strong>Tujuan:</strong> {block.goal}</p>}</header>
    <ProvenanceBanner block={block} />
    <div className="grid gap-5 lg:grid-cols-[minmax(0,1fr)_minmax(0,22rem)]">
      <div className="space-y-3">
        <div tabIndex={0} onKeyDown={onKey} className="rounded-2xl border border-line bg-page p-3 focus:outline focus:outline-2 focus:outline-brand" aria-label="Area visual; gunakan tombol panah untuk berpindah lapisan">
          <LabLayerStage items={items} label={`${block.title}. ${caption}`} viewBox="0 0 400 400" />
        </div>
        <div className="space-y-2">
          <div className="flex items-center justify-between text-xs font-bold uppercase tracking-wide text-ink-muted"><span>Superficial</span><span>Deep</span></div>
          <div className="flex items-center gap-2">
            <button type="button" className="btn btn-secondary btn-sm" aria-label="Lapisan lebih superfisial" disabled={depth <= 0} onClick={() => setDepthAuto(stepDepth(depth, n, -1))}><ChevronLeft size={16} /></button>
            <input type="range" min={0} max={n - 1} step={1} value={depth} onChange={(e) => setDepthAuto(Number(e.target.value))} aria-label="Kedalaman lapisan, dari superfisial ke dalam" aria-valuetext={caption} className="h-8 w-full" />
            <button type="button" className="btn btn-secondary btn-sm" aria-label="Lapisan lebih dalam" disabled={depth >= n - 1} onClick={() => setDepthAuto(stepDepth(depth, n, 1))}><ChevronRight size={16} /></button>
          </div>
          <p className="text-sm font-semibold" role="status" aria-live="polite">{caption}</p>
        </div>
      </div>
      <div className="space-y-4">
        <article className="card space-y-2 p-4" aria-live="polite">
          <p className="text-xs font-bold uppercase text-brand">{`Lapisan ${clampDepth(depth, n) + 1} / ${n}`}</p>
          <h4 className="text-lg font-semibold">{current.name}</h4>
          {current.description && <p className="text-sm leading-relaxed">{current.description}</p>}
          {current.clinical && <p className="rounded-lg bg-brand-soft p-3 text-sm"><strong>Koneksi klinis:</strong> {current.clinical}</p>}
        </article>
        <fieldset className="space-y-2">
          <legend className="flex w-full items-center justify-between text-sm font-semibold">Lapisan <span className="text-xs font-normal text-ink-muted">{manual ? 'Diatur manual' : 'Mengikuti kedalaman'}</span></legend>
          <ul className="space-y-1">
            {items.map((l) => <li key={l.id} className="flex items-center gap-2 rounded-lg px-1 py-0.5">
              <input id={`lyr-${block.id}-${l.id}`} type="checkbox" checked={l.visible} onChange={() => setManual(toggleLayer(layers, depth, manual, l.id))} className="h-5 w-5" />
              <label htmlFor={`lyr-${block.id}-${l.id}`} className="flex-1 text-sm">{l.name}</label>
              <button type="button" aria-pressed={focus.id === l.id} className={`btn btn-sm ${focus.id === l.id ? 'btn-primary' : 'btn-ghost'}`} onClick={() => setSelected(l.id)}>Pilih</button>
            </li>)}
          </ul>
          <label className="flex items-center gap-2 text-sm"><span className="shrink-0">Opasitas: {focus.name}</span><input type="range" min={0} max={1} step={0.05} value={focusOpacity} onChange={(e) => setOpacity({ ...opacity, [focus.id]: Number(e.target.value) })} aria-label={`Opasitas ${focus.name}`} className="w-full" /><span className="w-10 text-right text-ink-muted">{Math.round(focusOpacity * 100)}%</span></label>
          <div className="flex flex-wrap gap-2">
            {manual && <button type="button" className="btn btn-secondary btn-sm" onClick={() => setManual(null)}>Ikuti kedalaman lagi</button>}
            <button type="button" className="btn btn-ghost btn-sm" onClick={reset}><RotateCcw size={14} /> Reset</button>
          </div>
        </fieldset>
        {block.guided?.length > 0 && <div className="space-y-2">
          <button type="button" className="btn btn-secondary btn-sm" aria-pressed={guided} onClick={() => { setGuided(!guided); if (!guided) goStep(0); }}>{guided ? 'Tutup mode terpandu' : 'Mulai mode terpandu'}</button>
          {guided && <div className="card space-y-2 p-3"><p className="text-xs font-bold uppercase text-brand">Langkah {step + 1} dari {block.guided.length}</p><p className="font-semibold">{step0.title}</p>{step0.text && <p className="text-sm">{step0.text}</p>}
            <div className="flex items-center justify-between"><button type="button" className="btn btn-ghost btn-sm" disabled={step <= 0} onClick={() => goStep(step - 1)}>← Sebelumnya</button><span className="text-xs text-ink-muted">Slider tetap bebas dipakai</span><button type="button" className="btn btn-ghost btn-sm" disabled={step >= block.guided.length - 1} onClick={() => goStep(step + 1)}>Berikutnya →</button></div></div>}
        </div>}
      </div>
    </div>
  </section>;
}
