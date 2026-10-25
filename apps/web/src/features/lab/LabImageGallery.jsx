import { useEffect, useRef, useState } from 'react';
import { ChevronLeft, ChevronRight } from 'lucide-react';
import LabImage from './LabImage';
import { groupAssets } from './labUtils';

const pad = (n) => String(n).padStart(2, '0');

// Satu baris miniatur yang bisa digeser (sentuh, trackpad, roda mouse, atau tombol panah).
export function LabImageGallery({ group, selected, onSelect, active = true }) {
  const rail = useRef(null);
  const [edge, setEdge] = useState({ start: true, end: false });
  const update = () => { const el = rail.current; if (el) setEdge({ start: el.scrollLeft <= 2, end: el.scrollLeft + el.clientWidth >= el.scrollWidth - 2 }); };
  useEffect(() => { update(); window.addEventListener('resize', update); return () => window.removeEventListener('resize', update); }, [group.items.length]);
  useEffect(() => {
    const el = rail.current; const on = el?.querySelector('[aria-pressed="true"]');
    if (el && on) el.scrollTo({ left: on.offsetLeft - (el.clientWidth - on.clientWidth) / 2, behavior: 'smooth' });
  }, [selected]);
  const slide = (dir) => rail.current?.scrollBy({ left: dir * rail.current.clientWidth * 0.8, behavior: 'smooth' });
  return <section aria-label={`${group.title}, ${group.items.length} contoh`} className="space-y-2">
    <div className="flex items-end justify-between gap-3">
      <div><h3 className="text-lg font-semibold">{group.title}{group.subtitle && <span className="font-normal text-ink-muted"> · {group.subtitle}</span>}</h3><p className="text-sm text-ink-muted">{group.items.length} contoh</p></div>
      <div className="flex gap-1">
        <button type="button" className="btn btn-ghost btn-sm" aria-label={`Geser ${group.title} ke kiri`} disabled={edge.start} onClick={() => slide(-1)}><ChevronLeft size={18} /></button>
        <button type="button" className="btn btn-ghost btn-sm" aria-label={`Geser ${group.title} ke kanan`} disabled={edge.end} onClick={() => slide(1)}><ChevronRight size={18} /></button>
      </div>
    </div>
    <ul ref={rail} onScroll={update} className="relative flex snap-x gap-3 overflow-x-auto pb-2" style={{ scrollbarWidth: 'thin', overscrollBehaviorX: 'contain' }}>
      {group.items.map(({ asset, caseNo }) => {
        const on = selected === asset.id;
        return <li key={asset.id} className="shrink-0 snap-start">
          <button type="button" aria-pressed={on} aria-label={`Kasus ${caseNo} dari ${group.items.length}`} onClick={() => onSelect(asset.id)}
            className={`flex w-24 flex-col items-center gap-1 rounded-xl border-2 bg-page p-1.5 text-xs transition focus:outline-brand ${on ? (active ? 'border-brand ring-2 ring-brand/30' : 'border-brand/40') : 'border-line hover:border-brand'}`}>
            <img src={asset.url} alt="" loading="lazy" draggable={false} className="h-20 w-20 object-contain" />
            <span className={on ? 'font-bold text-brand' : 'text-ink-muted'}>{pad(caseNo)}</span>
          </button>
        </li>;
      })}
    </ul>
  </section>;
}

// Galeri per kelas + satu pembaca besar + mode bandingkan (dua kelas berdampingan). Mode Learn: label dataset tampil.
export default function LabCaseExplorer({ assets, modality }) {
  const groups = groupAssets(assets, modality);
  const [sel, setSel] = useState(() => Object.fromEntries(groups.map((g) => [g.key, g.items[0].asset.id])));
  const [active, setActive] = useState(groups[0]?.key);
  const [compare, setCompare] = useState(false);
  if (!groups.length) return null;
  const group = groups.find((g) => g.key === active) || groups[0];
  const index = Math.max(0, group.items.findIndex((i) => i.asset.id === sel[group.key]));
  const current = group.items[index];
  const pick = (g, id) => { setSel({ ...sel, [g.key]: id }); setActive(g.key); };
  const step = (d) => { const next = group.items[index + d]; if (next) pick(group, next.asset.id); };
  const canCompare = groups.length >= 2;
  const pair = groups.slice(0, 2).map((g) => ({ g, item: g.items.find((i) => i.asset.id === sel[g.key]) || g.items[0] }));
  const labelLine = (g, item) => `Kasus ${pad(item.caseNo)} / ${pad(g.items.length)}${g.key ? ` · Label dataset: ${g.title}` : ''}`;
  return <div className="space-y-5">
    {groups.map((g) => <LabImageGallery key={g.key} group={g} selected={sel[g.key]} active={g.key === group.key || compare} onSelect={(id) => pick(g, id)} />)}
    <div className="space-y-3 rounded-2xl bg-brand-soft/40 p-3 sm:p-4">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <h3 className="font-semibold">{compare ? 'Bandingkan kasus terpilih' : 'Kasus terpilih'}</h3>
        {canCompare && <button type="button" className="btn btn-secondary btn-sm" aria-pressed={compare} onClick={() => setCompare(!compare)}>{compare ? 'Tampilkan satu gambar' : `Bandingkan ${pair[0].g.title} vs ${pair[1].g.title}`}</button>}
      </div>
      {compare ? <div className="grid gap-4 sm:grid-cols-2">{pair.map(({ g, item }) => <div key={g.key} className="space-y-2"><p className="text-sm font-semibold text-brand">{g.title}</p><LabImage key={item.asset.id} asset={item.asset} controls={false} /><p className="text-sm text-ink-muted">{labelLine(g, item)}</p></div>)}</div>
        : <>
          <LabImage key={current.asset.id} asset={current.asset} />
          <div className="flex flex-wrap items-center justify-between gap-2 text-sm">
            <p className="font-semibold" aria-live="polite">{labelLine(group, current)}</p>
            <div className="flex gap-2"><button type="button" className="btn btn-ghost btn-sm" disabled={index <= 0} onClick={() => step(-1)}>← Kasus sebelumnya</button><button type="button" className="btn btn-ghost btn-sm" disabled={index >= group.items.length - 1} onClick={() => step(1)}>Kasus berikutnya →</button></div>
          </div>
        </>}
    </div>
  </div>;
}
