import { useState } from 'react';
import { ChevronLeft, ChevronRight } from 'lucide-react';
import LabImage from './LabImage';
import { groupAssets } from './labUtils';

const pad = (n) => String(n).padStart(2, '0');

// One viewer per class with its own previous/next right next to the image. Thumbnails stay out of the way
// in an on-demand tray, so nothing needs a long scroll between the picker and the picture.
function CasePane({ group }) {
  const n = group.items.length; const [i, setI] = useState(0); const [tray, setTray] = useState(false);
  const cur = group.items[i]; const go = (d) => setI((x) => Math.max(0, Math.min(n - 1, x + d)));
  const key = (e) => { if (e.key === 'ArrowLeft') { e.preventDefault(); go(-1); } else if (e.key === 'ArrowRight') { e.preventDefault(); go(1); } };
  return <section aria-label={`${group.title}, ${n} contoh`} className="min-w-0 space-y-2">
    <div className="flex items-center justify-between gap-2">
      <h3 className="min-w-0 truncate text-base font-bold">{group.title}</h3>
      <div className="flex shrink-0 items-center gap-1" role="group" aria-label={`Pilih contoh ${group.title}`} onKeyDown={key}>
        <button type="button" className="btn btn-secondary min-h-11 min-w-11" aria-label={`${group.title} sebelumnya`} disabled={i <= 0} onClick={() => go(-1)}><ChevronLeft size={18} /></button>
        <span className="w-16 text-center text-sm font-semibold" aria-live="polite" aria-label={`Contoh ${i + 1} dari ${n}`}>{i + 1} / {n}</span>
        <button type="button" className="btn btn-secondary min-h-11 min-w-11" aria-label={`${group.title} berikutnya`} disabled={i >= n - 1} onClick={() => go(1)}><ChevronRight size={18} /></button>
      </div>
    </div>
    <LabImage key={cur.asset.id} asset={cur.asset} controls="min" />
    <div className="flex items-center justify-between gap-2">
      {n <= 12 ? <div className="flex flex-wrap" role="group" aria-label="Lompat ke contoh">{group.items.map((it, k) => <button key={it.asset.id} type="button" aria-label={`Contoh ${k + 1}`} aria-current={k === i} onClick={() => setI(k)} className="grid h-7 w-7 place-items-center"><span className={`block h-2.5 w-2.5 rounded-full ${k === i ? 'bg-brand ring-2 ring-brand/30' : 'bg-paper-2'}`} /></button>)}</div> : <span />}
      <button type="button" className="btn btn-ghost btn-sm min-h-10" aria-expanded={tray} onClick={() => setTray(!tray)}>Pilih contoh {tray ? '▴' : '▾'}</button>
    </div>
    {tray && <div className="grid grid-cols-5 gap-2 sm:grid-cols-6" role="group" aria-label="Daftar contoh">{group.items.map((it, k) => <button key={it.asset.id} type="button" aria-pressed={k === i} aria-label={`Contoh ${pad(k + 1)}`} onClick={() => { setI(k); setTray(false); }} className={`rounded-lg border-2 bg-page p-0.5 ${k === i ? 'border-brand' : 'border-line'}`}><img src={it.asset.url} alt="" loading="lazy" draggable={false} className="aspect-square w-full object-contain" /></button>)}</div>}
  </section>;
}

// Compare-first: with two or more classes (e.g. Normal and Pneumonia) the viewers sit side by side on wide screens
// and stack on phones; each has independent navigation, so any Normal case can meet any Pneumonia case.
export default function LabCaseExplorer({ assets, modality }) {
  const groups = groupAssets(assets, modality);
  if (!groups.length) return null;
  return <div className={`grid min-w-0 gap-5 ${groups.length > 1 ? 'md:grid-cols-2' : ''}`}>{groups.map((g) => <CasePane key={g.key} group={g} />)}</div>;
}
