import { Search } from 'lucide-react';
import { useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import Illustration from '@/components/Illustration';
import { Alert, Badge, PageLoader, ProgressBar } from '@/components/ui';
import { useApi } from '@/lib/useApi';

export default function Subjects() {
  const { data, error, loading } = useApi('subjects');
  const [q, setQ] = useState('');
  const items = useMemo(() => (data?.items || []).filter((s) => s.name.toLowerCase().includes(q.toLowerCase())), [data, q]);
  return (
    <div className="space-y-5">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <h1 className="page-title">Mata kuliah</h1>
          <p className="mt-1 text-ink-muted">Semua mata kuliah terbuka. Yang sedang kamu pelajari ada di depan.</p>
        </div>
        <label className="relative w-full sm:w-72">
          <Search size={18} className="absolute left-3 top-1/2 -translate-y-1/2 text-ink-muted" />
          <input className="input pl-10" placeholder="Cari mata kuliah" value={q} onChange={(e) => setQ(e.target.value)} aria-label="Cari mata kuliah" />
        </label>
      </div>
      <Alert>{error?.message}</Alert>
      {loading ? <PageLoader /> : (
        <div className="grid gap-4 md:grid-cols-2">
          {items.map((s) => (
            <Link key={s.id} to={`/mata-kuliah/${s.slug}`} className="card group flex min-h-[8.5rem] overflow-hidden hover:border-brand">
              <div className="w-32 shrink-0 bg-brand-soft sm:w-40">
                <Illustration subject={s} className="h-full w-full" />
              </div>
              <div className="flex flex-1 flex-col justify-center gap-1.5 p-4">
                {s.studying && <Badge className="w-fit bg-gold-soft text-[#6b4f00]">Sedang dipelajari</Badge>}
                <h2 className="font-display text-xl font-semibold group-hover:text-brand">{s.name}</h2>
                {s.description && <p className="line-clamp-2 text-sm text-ink-muted">{s.description}</p>}
                <div className="mt-1">
                  <p className="mb-1 text-xs text-ink-muted">{s.answeredCount} dari {s.questionCount} soal dikerjakan</p>
                  <ProgressBar value={s.answeredCount} max={s.questionCount || 1} color="bg-progress" label={`Progres ${s.name}`} />
                </div>
              </div>
            </Link>
          ))}
        </div>
      )}
    </div>
  );
}
