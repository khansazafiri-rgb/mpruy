import { ArrowUpRight, BookOpen, Search } from 'lucide-react';
import { useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import Illustration from '@/components/Illustration';
import CampusMaterials from '@/components/CampusMaterials';
import { Alert, EmptyState, PageLoader, ProgressBar } from '@/components/ui';
import { useApi } from '@/lib/useApi';

export default function Subjects() {
  const { data, error, loading } = useApi('subjects');
  const [q, setQ] = useState('');
  const items = useMemo(() => (data?.items || []).filter((s) => s.name.toLowerCase().includes(q.trim().toLowerCase())), [data, q]);
  const total = data?.items?.length || 0;
  return (
    <div className="space-y-8">
      <header className="page-head flex flex-wrap items-end justify-between gap-5">
        <div className="min-w-0">
          <p className="eyebrow mb-3">Ruang belajarmu</p>
          <h1 className="page-title">Mata kuliah</h1>
          <p className="mt-3 max-w-lg text-[17px] leading-relaxed text-ink-muted">{total ? `${total} mata kuliah, dari ilmu dasar sampai klinis.` : 'Dari ilmu dasar sampai klinis.'} Pilih satu, lalu kerjakan per BAB.</p>
        </div>
        <label className="subject-search">
          <Search size={18} className="text-ink-muted" aria-hidden />
          <input type="search" placeholder="Cari mata kuliah..." value={q} onChange={(e) => setQ(e.target.value)} aria-label="Cari mata kuliah" />
        </label>
      </header>
      <Alert>{error?.message}</Alert>
      <CampusMaterials />
      {loading ? <PageLoader /> : <>
        <p className="flex flex-wrap items-baseline gap-x-3 text-sm text-ink-muted" role="status">
          <span><b className="text-ink">{items.length}</b> mata kuliah{q.trim() ? ` untuk “${q.trim()}”` : ''}</span>
          {!q.trim() && <span className="hand text-[22px] text-brand" aria-hidden>semua terbuka untukmu ✓</span>}
        </p>
        {items.length ? <div className="subject-wall">
          {items.map((s, i) => (
            <Link key={s.id} to={`/mata-kuliah/${s.slug}`} className="subject-tile group" style={{ '--tilt': `${[-1.4, 1.1, -0.6, 1.6, -1, 0.8][i % 6]}deg` }}>
              <span className="sticker subject-tile-art">
                {s.studying && <span className="subject-tile-flag">Sedang dipelajari</span>}
                <Illustration subject={s} className="h-full w-full" />
              </span>
              <span className="mt-3 flex items-start justify-between gap-2">
                <span className="font-display text-[17px] font-semibold leading-snug text-ink group-hover:text-brand">{s.name}</span>
                <ArrowUpRight size={17} className="mt-1 shrink-0 text-ink-muted transition-transform group-hover:-translate-y-0.5 group-hover:translate-x-0.5 group-hover:text-brand" aria-hidden />
              </span>
              {s.description && <span className="mt-1 line-clamp-2 block text-[13px] leading-relaxed text-ink-muted">{s.description}</span>}
              <span className="mt-3 block text-[13px] text-ink-muted">{s.chapterCount !== undefined && <>{s.chapterCount} BAB · </>}<b className="font-semibold text-ink">{s.answeredCount || 0}</b>/{s.questionCount || 0} soal</span>
              <ProgressBar value={s.answeredCount} max={s.questionCount || 1} className="mt-2 !h-2" color="bg-gold" label={`Progres ${s.name}`} />
            </Link>
          ))}
        </div> : <EmptyState icon={BookOpen} title={q.trim() ? 'Mata kuliah belum ditemukan' : 'Mata kuliah sedang disiapkan'}>{q.trim() ? 'Coba kata lain atau hapus pencarianmu.' : 'Materi baru akan muncul di sini setelah tersedia.'}{q.trim() && <button type="button" className="btn-secondary mt-4" onClick={() => setQ('')}>Hapus pencarian</button>}</EmptyState>}
      </>}
    </div>
  );
}
