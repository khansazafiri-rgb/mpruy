// DRILLING: kumpulan soal General per mata kuliah tanpa BAB. Memilih mata kuliah langsung
// memulai sesi. Menu ini hanya muncul bila admin menyalakannya dan sudah ada soalnya.
import clsx from 'clsx';
import { BookOpen, Clock, Crosshair, Star, Zap } from 'lucide-react';
import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import Illustration from '@/components/Illustration';
import { Alert, EmptyState, PageLoader, ProgressBar } from '@/components/ui';
import { api } from '@/lib/api';
import { toneClass } from '@/lib/tone';
import { useApi } from '@/lib/useApi';

const COUNTS = [[10, '10 soal'], [20, '20 soal'], [50, '50 soal'], ['all', 'Semua']];
const MODES = [['learning', 'Mode Learning', BookOpen], ['exam', 'Mode ujian', Clock]];
const PREFS = 'medcoel-drilling-prefs';
const read = () => { try { return { count: 20, mode: 'learning', ...JSON.parse(localStorage.getItem(PREFS)) }; } catch { return { count: 20, mode: 'learning' }; } };

export default function Drilling() {
  const { data, error, loading } = useApi('drilling');
  const nav = useNavigate();
  const [prefs, setPrefsState] = useState(read);
  const [busy, setBusy] = useState('');
  const [err, setErr] = useState('');
  const setPrefs = (p) => { setPrefsState(p); try { localStorage.setItem(PREFS, JSON.stringify(p)); } catch { /* penyimpanan perangkat tidak tersedia */ } };

  const start = async (s) => {
    setBusy(s.id); setErr('');
    try {
      const r = await api('attempts/drilling', { method: 'POST', body: { subject: s.id, count: prefs.count, mode: prefs.mode } });
      nav(`/kerjakan/${r.attempt.id}`);
    } catch (e) { setErr(e.message); setBusy(''); }
  };

  const items = data?.subjects || [];
  return (
    <div className="space-y-8">
      <header className="page-head flex flex-wrap items-end justify-between gap-5">
        <div className="min-w-0">
          <p className="eyebrow mb-3">Latihan intensif</p>
          <h1 className="page-title">Drilling</h1>
          <p className="mt-3 max-w-xl text-[17px] leading-relaxed text-ink-muted">Soal General per mata kuliah, tanpa dipecah per BAB. Pilih mata kuliah dan sesinya langsung dimulai.</p>
        </div>
      </header>
      <Alert>{error?.message || err}</Alert>
      {loading ? <PageLoader /> : !items.length ? (
        <EmptyState icon={Crosshair} title="Drilling belum dibuka">Soal Drilling akan muncul di sini setelah tersedia.<Link to="/mata-kuliah" className="btn-secondary mt-4 inline-flex">Latihan per BAB</Link></EmptyState>
      ) : (
        <>
          <div className="flex flex-wrap items-center gap-x-6 gap-y-3" role="group" aria-label="Atur sesi drilling">
            <div className="filter-pills" role="group" aria-label="Jumlah soal">
              {COUNTS.map(([v, l]) => <button key={v} type="button" aria-pressed={prefs.count === v} onClick={() => setPrefs({ ...prefs, count: v })}>{l}</button>)}
            </div>
            <div className="filter-pills" role="group" aria-label="Mode">
              {MODES.map(([v, l, Icon]) => <button key={v} type="button" aria-pressed={prefs.mode === v} onClick={() => setPrefs({ ...prefs, mode: v })}><Icon size={14} aria-hidden /> {l}</button>)}
            </div>
          </div>
          <div className="subject-wall">
            {items.map((s) => (
              <button key={s.id} type="button" onClick={() => start(s)} disabled={!!busy} className={clsx('subject-tile card-chunky tone-surface group text-left', toneClass(s.illustrationKey || s.slug), busy === s.id && 'opacity-70')}>
                {s.studying && <span className="subj-flag"><Star size={12} aria-hidden /> Dipelajari</span>}
                <span className="sticker-tone subject-tile-art"><Illustration subject={s} className="h-full w-full" /></span>
                <span className="mt-3.5 flex items-start justify-between gap-2">
                  <span className="font-display text-[18px] font-bold leading-snug text-ink">{s.name}</span>
                  <span className="subject-go" aria-hidden><Zap size={16} /></span>
                </span>
                <span className="mt-3 flex flex-wrap items-center gap-2 text-[13px] font-semibold text-[rgb(var(--tone-fg))]">
                  <span className="subject-meta">General</span><span><b>{s.answeredCount || 0}</b>/{s.questionCount} soal</span>
                </span>
                <ProgressBar value={s.answeredCount} max={s.questionCount || 1} className="tone-track mt-2.5 !h-2" color="tone-fill" label={`Progres drilling ${s.name}`} />
                <span className="mt-3 text-[13px] font-bold text-brand">{busy === s.id ? 'Menyiapkan...' : 'Mulai drilling'}</span>
              </button>
            ))}
          </div>
        </>
      )}
    </div>
  );
}
