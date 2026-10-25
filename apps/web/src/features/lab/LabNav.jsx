import { Link } from 'react-router-dom';
import { ArrowLeft, ArrowRight, ChevronRight } from 'lucide-react';
import { objectHref } from './labUtils';

export function LabBreadcrumbs({ items }) {
  return <nav aria-label="Jejak halaman"><ol className="flex flex-wrap items-center gap-1 text-sm text-ink-muted">
    {items.map((c, i) => <li key={`${i}-${c.label}`} className="flex items-center gap-1">
      {i > 0 && <ChevronRight size={14} aria-hidden />}
      {c.to && i < items.length - 1 ? <Link to={c.to} className="text-brand underline-offset-2 hover:underline">{c.label}</Link> : <span aria-current={i === items.length - 1 ? 'page' : undefined} className={i === items.length - 1 ? 'font-semibold text-ink' : ''}>{c.label}</span>}
    </li>)}
  </ol></nav>;
}

// Sebelumnya / "2 dari 3" / berikutnya di dalam jalur, tanpa kembali ke /lab di antara pelajaran.
export function LabPathNavigation({ pathway, ctx }) {
  const { prev, next, index, total } = ctx; const to = (s) => objectHref(s.slug, pathway.slug);
  return <nav aria-label={`Navigasi jalur ${pathway.title}`} className="card flex flex-wrap items-center justify-between gap-3 p-4">
    {prev ? <Link to={to(prev)} className="btn btn-secondary"><ArrowLeft size={16} /> <span className="max-w-[40vw] truncate">{prev.title}</span></Link> : <Link to={`/lab/jalur/${pathway.slug}`} className="btn btn-ghost"><ArrowLeft size={16} /> {pathway.title}</Link>}
    <span className="text-sm font-semibold text-ink-muted" aria-label={`Langkah ${index + 1} dari ${total}`}>{index + 1} dari {total}</span>
    {next ? <Link to={to(next)} className="btn btn-primary"><span className="max-w-[40vw] truncate">Berikutnya: {next.title}</span> <ArrowRight size={16} /></Link> : <Link to={`/lab/jalur/${pathway.slug}`} className="btn btn-primary">Selesai · kembali ke {pathway.title}</Link>}
  </nav>;
}
