import { useMemo, useState } from 'react';
import { RotateCcw } from 'lucide-react';
import LabLayerStage from './LabLayerStage';
import { ProvenanceBanner } from './LabLayerExplorer';
import { clamp01, explodeOffsets, highlightOpacity } from './labLayers';

const H = 560; const SCALE = 0.62;

// 2.5D exploded view: the same layers separate along one depth axis (no fake rotation). Superficial on top.
export default function LabExplodedView({ block, layers }) {
  const n = layers.length; const gap = block.gap ?? 0.6;
  const [explode, setExplode] = useState(0.55); const [selected, setSelected] = useState(''); const [labels, setLabels] = useState(true);
  const [opacity, setOpacity] = useState({}); const [hidden, setHidden] = useState({});
  const offsets = useMemo(() => explodeOffsets(n, explode, gap, H * 0.82), [n, explode, gap]);
  const items = layers.map((l, i) => ({ ...l, visible: !hidden[l.id], opacity: highlightOpacity(clamp01(opacity[l.id] ?? l.opacity ?? 1), selected, l.id), dx: offsets[i].dx, dy: offsets[i].dy + 20, scale: SCALE, planes: true }));
  const picked = layers.find((l) => l.id === selected);
  const reset = () => { setExplode(0.55); setSelected(''); setLabels(true); setOpacity({}); setHidden({}); };
  const pickedOpacity = picked ? clamp01(opacity[picked.id] ?? picked.opacity ?? 1) : 1;
  return <section className="space-y-4" aria-label={`Exploded view: ${block.title}`}>
    <header className="space-y-1"><h3 className="text-lg font-bold">{block.title}</h3>{block.goal && <p className="text-sm text-ink-muted"><strong>Tujuan:</strong> {block.goal}</p>}</header>
    <ProvenanceBanner block={block} />
    <div className="grid gap-5 lg:grid-cols-[minmax(0,1fr)_minmax(0,22rem)]">
      <div className="space-y-3">
        <div className="rounded-2xl border border-line bg-page p-3"><LabLayerStage items={items} viewBox={`0 0 400 ${H}`} label={`${block.title}, ${n} lapisan${selected ? `, terpilih: ${picked?.name}` : ''}`} selectedId={selected} onSelect={(id) => setSelected(id === selected ? '' : id)} showPlanes showLabels={labels} /></div>
        <label className="flex items-center gap-3 text-sm font-semibold"><span className="shrink-0">Jarak antarlapisan</span><input type="range" min={0} max={100} step={5} value={Math.round(explode * 100)} onChange={(e) => setExplode(Number(e.target.value) / 100)} aria-label="Jarak antarlapisan: rapat sampai terurai" aria-valuetext={`${Math.round(explode * 100)} persen terurai`} className="h-8 w-full" /><span className="w-12 text-right text-ink-muted">{Math.round(explode * 100)}%</span></label>
        <div className="flex flex-wrap gap-2"><button type="button" className="btn btn-secondary btn-sm" onClick={() => setExplode(0)}>Rapatkan</button><button type="button" className="btn btn-secondary btn-sm" onClick={() => setExplode(1)}>Uraikan penuh</button><button type="button" className="btn btn-secondary btn-sm" aria-pressed={labels} onClick={() => setLabels(!labels)}>Label {labels ? 'tampil' : 'tersembunyi'}</button><button type="button" className="btn btn-ghost btn-sm" onClick={reset}><RotateCcw size={14} /> Reset</button></div>
      </div>
      <div className="space-y-4">
        <article className="card space-y-2 p-4" aria-live="polite">
          {picked ? <><p className="text-xs font-bold uppercase text-brand">Struktur terpilih</p><h4 className="text-lg font-semibold">{picked.name}</h4>{picked.description && <p className="text-sm leading-relaxed">{picked.description}</p>}{picked.clinical && <p className="rounded-lg bg-brand-soft p-3 text-sm"><strong>Koneksi klinis:</strong> {picked.clinical}</p>}</>
            : <p className="text-sm text-ink-muted">Pilih sebuah lapisan di gambar atau di daftar untuk menyorot dan membaca penjelasannya.</p>}
        </article>
        <fieldset className="space-y-1"><legend className="text-sm font-semibold">Struktur (dari superfisial ke dalam)</legend>
          <ul className="space-y-1">{layers.map((l) => <li key={l.id} className="flex items-center gap-2"><input id={`xv-${block.id}-${l.id}`} type="checkbox" className="h-5 w-5" checked={!hidden[l.id]} onChange={() => setHidden({ ...hidden, [l.id]: !hidden[l.id] })} aria-label={`Tampilkan ${l.name}`} /><button type="button" aria-pressed={selected === l.id} onClick={() => setSelected(selected === l.id ? '' : l.id)} className={`btn btn-sm flex-1 justify-start ${selected === l.id ? 'btn-primary' : 'btn-ghost'}`}>{l.name}</button></li>)}</ul>
        </fieldset>
        {picked && <label className="flex items-center gap-2 text-sm"><span className="shrink-0">Opasitas</span><input type="range" min={0} max={1} step={0.05} value={pickedOpacity} onChange={(e) => setOpacity({ ...opacity, [picked.id]: Number(e.target.value) })} aria-label={`Opasitas ${picked.name}`} className="w-full" /><span className="w-10 text-right text-ink-muted">{Math.round(pickedOpacity * 100)}%</span></label>}
      </div>
    </div>
  </section>;
}
