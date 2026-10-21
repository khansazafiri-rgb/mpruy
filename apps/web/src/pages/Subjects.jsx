import { ArrowUpRight, BookOpen, Search } from 'lucide-react';
import { useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import Illustration from '@/components/Illustration';
import CampusMaterials from '@/components/CampusMaterials';
import { Alert, Badge, EmptyState, PageLoader, ProgressBar } from '@/components/ui';
import { useApi } from '@/lib/useApi';

export default function Subjects() {
  const { data, error, loading } = useApi('subjects');
  const [q, setQ] = useState('');
  const items = useMemo(() => (data?.items || []).filter((s) => s.name.toLowerCase().includes(q.trim().toLowerCase())), [data, q]);
  return (
    <div className="space-y-8">
      <div className="flex flex-wrap items-end justify-between gap-5 pb-2 pt-2">
        <div>
          <p className="eyebrow mb-3">Ruang belajarmu</p>
          <h1 className="page-title">Mata kuliah</h1>
          <p className="mt-3 max-w-lg text-sm leading-relaxed text-ink-muted">Satu topik, satu pemahaman baru. Pilih yang ingin kamu pelajari hari ini.</p>
        </div>
        <label className="relative w-full sm:w-72">
          <Search size={17} className="absolute left-4 top-1/2 -translate-y-1/2 text-ink-muted" />
          <input type="search" className="input !rounded-full !py-3 pl-11" placeholder="Cari mata kuliah..." value={q} onChange={(e) => setQ(e.target.value)} aria-label="Cari mata kuliah" />
        </label>
      </div>
      <Alert>{error?.message}</Alert>
      <CampusMaterials />
      {loading ? <PageLoader /> : <>
        <p className="text-xs text-ink-muted" role="status">{items.length} mata kuliah{q.trim() ? ` untuk “${q.trim()}”` : ' · Semua terbuka untukmu'}</p>
        {items.length ? <div className="grid gap-5 md:grid-cols-2">
          {items.map((s) => (
            <Link key={s.id} to={`/mata-kuliah/${s.slug}`} className="subject-card card group flex overflow-hidden hover:border-brand/40">
              <div className="subject-art shrink-0"><Illustration subject={s} className="h-full w-full object-contain" /></div>
              <div className="flex min-w-0 flex-1 flex-col justify-center p-5 sm:p-6">
                <div className="mb-2 flex items-center justify-between gap-2">
                  {s.studying ? <Badge className="bg-brand-soft text-brand-dark">Sedang dipelajari</Badge> : <span className="text-[11px] font-medium text-ink-muted">Eksplorasi materi</span>}
                  <ArrowUpRight size={16} className="shrink-0 text-ink-muted transition-transform group-hover:-translate-y-0.5 group-hover:translate-x-0.5" aria-hidden />
                </div>
                <h2 className="font-display text-xl font-semibold tracking-tight group-hover:text-brand">{s.name}</h2>
                {s.description && <p className="mt-2 line-clamp-2 text-xs leading-relaxed text-ink-muted">{s.description}</p>}
                <div className="mt-5">
                  <p className="mb-2 text-[11px] text-ink-muted">{s.chapterCount !== undefined && <span>{s.chapterCount} BAB · </span>}<span className="font-semibold text-ink">{s.answeredCount || 0}</span> / {s.questionCount || 0} soal dikerjakan</p>
                  <ProgressBar value={s.answeredCount} max={s.questionCount || 1} label={`Progres ${s.name}`} />
                </div>
              </div>
            </Link>
          ))}
        </div> : <EmptyState icon={BookOpen} title={q.trim() ? 'Mata kuliah belum ditemukan' : 'Mata kuliah sedang disiapkan'}>{q.trim() ? 'Coba kata lain atau hapus pencarianmu.' : 'Materi baru akan muncul di sini setelah tersedia.'}{q.trim() && <button type="button" className="btn-secondary mt-4" onClick={() => setQ('')}>Hapus pencarian</button>}</EmptyState>}
      </>}
    </div>
  );
}
