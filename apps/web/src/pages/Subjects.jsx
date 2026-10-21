import clsx from 'clsx';
import { ArrowUpRight, BookOpen, Search, Star } from 'lucide-react';
import { useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import Illustration from '@/components/Illustration';
import CampusMaterials from '@/components/CampusMaterials';
import { Alert, EmptyState, PageLoader, ProgressBar } from '@/components/ui';
import { toneClass } from '@/lib/tone';
import { useApi } from '@/lib/useApi';

const CLINIC = ['ilmu-bedah', 'ilmu-bedah-ortopedi', 'ilmu-kesehatan-anak', 'ilmu-penyakit-dalam', 'kehamilan-persalinan', 'ginekologi-payudara', 'psikiatri-kesehatan-jiwa', 'multisistem-kegawatdaruratan'];
const groupOf = (s) => (s.slug?.startsWith('sistem-') ? 'sistem' : CLINIC.includes(s.slug) ? 'klinik' : 'dasar');
const GROUPS = [['semua', 'Semua'], ['dasar', 'Dasar'], ['klinik', 'Klinik'], ['sistem', 'Sistem organ']];

export default function Subjects() {
  const { data, error, loading } = useApi('subjects');
  const [q, setQ] = useState('');
  const [group, setGroup] = useState('semua');
  const all = useMemo(() => data?.items || [], [data]);
  const counts = useMemo(() => all.reduce((c, s) => ({ ...c, [groupOf(s)]: (c[groupOf(s)] || 0) + 1 }), { semua: all.length }), [all]);
  const items = useMemo(() => all.filter((s) => (group === 'semua' || groupOf(s) === group) && s.name.toLowerCase().includes(q.trim().toLowerCase())), [all, q, group]);
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
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div className="filter-pills" role="group" aria-label="Kelompok mata kuliah">
            {GROUPS.map(([k, label]) => (
              <button key={k} type="button" aria-pressed={group === k} onClick={() => setGroup(k)}>{label}<span>{counts[k] || 0}</span></button>
            ))}
          </div>
          <p className="flex flex-wrap items-baseline gap-x-3 text-sm text-ink-muted" role="status">
            <span><b className="text-ink">{items.length}</b> mata kuliah{q.trim() ? ` untuk “${q.trim()}”` : ''}</span>
            {!q.trim() && group === 'semua' && <span className="hand text-[22px] text-brand" aria-hidden>semua terbuka untukmu ✓</span>}
          </p>
        </div>
        {items.length ? <div className="subject-wall">
          {items.map((s) => (
            <Link key={s.id} to={`/mata-kuliah/${s.slug}`} className={clsx('subject-tile card-chunky tone-surface group', toneClass(s.illustrationKey || s.slug))}>
              {s.studying && <span className="subj-flag"><Star size={12} aria-hidden /> Dipelajari</span>}
              <span className="sticker-tone subject-tile-art"><Illustration subject={s} className="h-full w-full" /></span>
              <span className="mt-3.5 flex items-start justify-between gap-2">
                <span className="font-display text-[18px] font-bold leading-snug text-ink">{s.name}</span>
                <span className="subject-go" aria-hidden><ArrowUpRight size={16} /></span>
              </span>
              {s.description && <span className="mt-1 line-clamp-2 block text-[14px] leading-relaxed text-ink/75">{s.description}</span>}
              <span className="mt-3 flex flex-wrap items-center gap-2 text-[13px] font-semibold text-[rgb(var(--tone-fg))]">{s.chapterCount !== undefined && <span className="subject-meta">{s.chapterCount} BAB</span>}<span><b>{s.answeredCount || 0}</b>/{s.questionCount || 0} soal</span></span>
              <ProgressBar value={s.answeredCount} max={s.questionCount || 1} className="tone-track mt-2.5 !h-2" color="tone-fill" label={`Progres ${s.name}`} />
            </Link>
          ))}
        </div> : <EmptyState icon={BookOpen} title={q.trim() || group !== 'semua' ? 'Mata kuliah belum ditemukan' : 'Mata kuliah sedang disiapkan'}>{q.trim() || group !== 'semua' ? 'Coba kata lain atau pilih kelompok Semua.' : 'Materi baru akan muncul di sini setelah tersedia.'}{(q.trim() || group !== 'semua') && <button type="button" className="btn-secondary mt-4" onClick={() => { setQ(''); setGroup('semua'); }}>Tampilkan semua</button>}</EmptyState>}
      </>}
    </div>
  );
}
