import { Crown, Medal, Trophy } from 'lucide-react';
import { useState } from 'react';
import { Link } from 'react-router-dom';
import { Alert, EmptyState, PageLoader, Tabs } from '@/components/ui';
import { useAuth } from '@/context/AuthContext';
import { useApi } from '@/lib/useApi';
import PageHead from '@/components/PageHead';

export default function Leaderboard() {
  const { me, settings } = useAuth();
  const [period, setPeriod] = useState('week');
  const [scope, setScope] = useState('all');
  const [subject, setSubject] = useState('');
  const subjects = useApi('subjects');
  const { data, error, loading } = useApi('leaderboard', { query: { period, scope, subject } }, [period, scope, subject]);
  const p = settings?.points || { easy: 1, medium: 2, hard: 3 };

  return (
    <div className="space-y-7">
      <PageHead eyebrow="Peringkat" title="Leaderboard" note="yang penting konsisten, bukan cepat ✦">Poin dari soal yang benar di percobaan pertama: easy {p.easy}, medium {p.medium}, hard {p.hard}. Mengulang soal yang sama tidak menambah poin.</PageHead>
      <div className="flex flex-wrap gap-3">
        <Tabs value={period} onChange={setPeriod} tabs={[{ value: 'week', label: 'Minggu ini' }, { value: 'all', label: 'Sepanjang waktu' }]} />
        <Tabs value={scope} onChange={setScope} tabs={[{ value: 'all', label: 'Semua kampus' }, { value: 'campus', label: 'Kampusku' }]} />
        <select className="input w-auto max-w-full py-1.5" value={subject} onChange={(e) => setSubject(e.target.value)} aria-label="Mata kuliah">
          <option value="">Semua mata kuliah</option>
          {(subjects.data?.items || []).map((s) => <option key={s.id} value={s.id}>{s.name}</option>)}
        </select>
      </div>
      <Alert>{error?.message}</Alert>
      {data?.note && <Alert kind="info">{data.note}</Alert>}
      {loading ? <PageLoader /> : !data?.items?.length ? (
        <EmptyState icon={Trophy} title="Belum ada poin di periode ini">Jadilah yang pertama! Kerjakan soal dari halaman mata kuliah.</EmptyState>
      ) : (
        <>
          {data.me ? (
            <div className="my-rank surface-forest flex items-center gap-3 p-5">
              <span className="font-display text-3xl font-extrabold text-gold">#{data.me.rank}</span>
              <p className="flex-1">Peringkatmu{me?.leaderboardAnonymous ? ' (tampil sebagai Anonim)' : ''}</p>
              <span className="font-display text-xl font-bold">{data.me.points} poin</span>
            </div>
          ) : <p className="text-sm text-ink-muted">Kamu belum masuk daftar di periode ini.</p>}
          <ol className="card divide-y divide-line">
            {data.items.map((it) => (
              <li key={`${it.rank}-${it.name}-${it.points}`} className={`flex items-center gap-3 px-4 py-3 ${it.isMe ? 'bg-brand-soft' : ''}`}>
                <span className="flex w-9 justify-center font-display font-bold">
                  {it.rank === 1 ? <Crown className="text-gold" size={22} aria-label="Peringkat 1" /> : it.rank <= 3 ? <Medal className={it.rank === 2 ? 'text-ink-faint' : 'text-[#b07a3c]'} size={22} aria-label={`Peringkat ${it.rank}`} /> : it.rank}
                </span>
                <div className="min-w-0 flex-1">
                  <p className="truncate font-semibold">{it.name}{it.isMe ? ' (kamu)' : ''}</p>
                  {it.campus && <p className="truncate text-xs text-ink-muted">{it.campus}</p>}
                </div>
                <span className="font-semibold tabular-nums">{it.points}</span>
              </li>
            ))}
          </ol>
        </>
      )}
      <p className="text-sm text-ink-muted">Ingin tampil anonim? Atur di <Link to="/profil" className="font-semibold text-academic hover:underline">Profil</Link>.</p>
    </div>
  );
}
