import { Crown, Medal, Stethoscope, Trophy } from 'lucide-react';
import { useState } from 'react';
import { Link } from 'react-router-dom';
import MascotTip from '@/components/MascotTip';
import PageHead from '@/components/PageHead';
import { Alert, EmptyState, PageLoader, Tabs } from '@/components/ui';
import { useAuth } from '@/context/AuthContext';
import { useApi } from '@/lib/useApi';

// Kalimat penyemangat sesuai posisi.
function cheer(rank) {
  if (rank === 1) return { mascot: 'kila', mood: 'cheer', text: 'Kamu di puncak! Pertahankan ritmemu, tapi tetap istirahat cukup ya.' };
  if (rank <= 3) return { mascot: 'kila', mood: 'happy', text: `Peringkat ${rank}, keren! Satu dua kasus simulasi lagi bisa menggeser posisimu.` };
  if (rank <= 10) return { mascot: 'kori', mood: 'happy', text: 'Sudah masuk 10 besar. Konsisten tiap hari lebih berarti daripada ngebut semalam.' };
  return { mascot: 'kori', mood: 'wave', text: 'Setiap soal yang benar di percobaan pertama dan setiap kasus simulasi menambah poinmu.' };
}

export default function Leaderboard() {
  const { me, settings } = useAuth();
  const [period, setPeriod] = useState('week');
  const [scope, setScope] = useState('all');
  const { data, error, loading } = useApi('leaderboard', { query: { period, scope } }, [period, scope]);
  const p = settings?.points || { easy: 1, medium: 2, hard: 3 };
  const sim = data?.simPerCase ?? p.simulation ?? 10;
  const c = data?.me ? cheer(data.me.rank) : null;

  return (
    <div className="space-y-7">
      <PageHead eyebrow="Peringkat" title="Leaderboard" note="yang penting konsisten, bukan cepat ✦">
        Satu peringkat untuk semua: poin latihan soal ditambah poin Simulasi Dokter. Soal benar di percobaan pertama: easy {p.easy}, medium {p.medium}, hard {p.hard}. Simulasi: skor terbaik tiap kasus, skor 100 bernilai {sim} poin. Mengulang soal atau kasus yang sama tidak menumpuk poin.
      </PageHead>
      <div className="flex flex-wrap gap-3">
        <Tabs value={period} onChange={setPeriod} tabs={[{ value: 'week', label: 'Minggu ini' }, { value: 'all', label: 'Sepanjang waktu' }]} />
        <Tabs value={scope} onChange={setScope} tabs={[{ value: 'all', label: 'Semua kampus' }, { value: 'campus', label: 'Kampusku' }]} />
      </div>
      <Alert>{error?.message}</Alert>
      {data?.note && <Alert kind="info">{data.note}</Alert>}
      {loading ? <PageLoader /> : !data?.items?.length ? (
        <EmptyState icon={Trophy} mascot="kila" mood="wave" title="Belum ada poin di periode ini" action={<div className="flex flex-wrap justify-center gap-2"><Link to="/mata-kuliah" className="btn-primary btn-sm">Latihan soal</Link><Link to="/simulasi-dokter" className="btn-secondary btn-sm"><Stethoscope size={15} /> Simulasi Dokter</Link></div>}>
          Jadilah yang pertama! Kerjakan soal atau tangani satu pasien di Simulasi Dokter.
        </EmptyState>
      ) : (
        <>
          {data.me ? (
            <div className="my-rank surface-forest flex flex-wrap items-center gap-3 p-5">
              <span className="my-rank-dots tex-halftone-light" aria-hidden />
              <span className="font-display text-3xl font-extrabold text-gold">#{data.me.rank}</span>
              <p className="flex-1">Peringkatmu{me?.leaderboardAnonymous ? ' (tampil sebagai Anonim)' : ''}<span className="block text-sm opacity-80">Soal {data.me.questionPoints} · Simulasi {data.me.simPoints}</span></p>
              <span className="font-display text-xl font-bold">{data.me.points} poin</span>
            </div>
          ) : <p className="text-sm text-ink-muted">Kamu belum masuk daftar di periode ini.</p>}
          {c && <MascotTip mascot={c.mascot} mood={c.mood} size={64}>{c.text}</MascotTip>}
          <ol className="lb-list card-chunky divide-y divide-line overflow-hidden">
            {data.items.map((it) => (
              <li key={`${it.rank}-${it.name}-${it.points}`} className={`lb-row flex items-center gap-3 px-4 py-3 ${it.rank <= 3 ? `is-top tone-${['sun', 'sky', 'peach'][it.rank - 1]}` : ''} ${it.isMe ? 'is-me' : ''}`}>
                <span className="lb-rank flex w-9 justify-center font-display font-bold">
                  {it.rank === 1 ? <Crown className="text-gold" size={22} aria-label="Peringkat 1" /> : it.rank <= 3 ? <Medal className={it.rank === 2 ? 'text-ink-faint' : 'text-[#b07a3c]'} size={22} aria-label={`Peringkat ${it.rank}`} /> : it.rank}
                </span>
                <div className="min-w-0 flex-1">
                  <p className="truncate font-semibold">{it.name}{it.isMe ? ' (kamu)' : ''}</p>
                  <p className="truncate text-xs text-ink-muted">{it.campus ? `${it.campus} · ` : ''}soal {it.questionPoints} · simulasi {it.simPoints}</p>
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
