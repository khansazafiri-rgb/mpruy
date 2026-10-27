// Pencapaian dan julukan di halaman Progres. Angkanya dihitung server dari
// aktivitas yang sudah ada (lihat apps/pocketbase/pb_hooks/lib/achievements.js).
import { Award, Check, ChevronDown } from 'lucide-react';
import { useState } from 'react';
import Mascot from '@/components/Mascot';
import { useMascotsOn } from '@/components/MascotTip';
import { CardSkeleton, ErrorState, ProgressBar, SectionHeader } from '@/components/ui';
import { useApi } from '@/lib/useApi';

const LEVEL = { master: ['Master', 'chip chip-brand'], ahli: ['Ahli', 'chip chip-info'], penjelajah: ['Penjelajah', 'chip'] };

function Ladder({ l }) {
  const prevGoal = l.best ? l.best.goal : 0;
  return (
    <article className="card flex flex-col gap-3 p-4">
      <div className="flex items-start justify-between gap-2">
        <h3 className="text-[15px] font-semibold leading-snug">{l.label}</h3>
        <span className="shrink-0 font-display text-lg font-bold tabular-nums">{l.value.toLocaleString('id-ID')}</span>
      </div>
      <ul className="flex flex-wrap gap-1.5" aria-label={`Tingkatan ${l.label}`}>
        {l.tiers.map((t) => (
          <li key={t.goal} className={t.earned ? 'chip chip-brand' : 'chip border border-dashed border-line bg-transparent text-ink-faint'} title={`${t.goal.toLocaleString('id-ID')} ${l.unit}`}>
            {t.earned && <Check size={12} aria-hidden />}{t.name}<span className="sr-only">{t.earned ? ', tercapai' : `, butuh ${t.goal} ${l.unit}`}</span>
          </li>
        ))}
      </ul>
      {l.next ? (
        <div className="mt-auto space-y-1.5">
          <ProgressBar value={l.value - prevGoal} max={l.next.goal - prevGoal} className="!h-2" label={`Menuju ${l.next.name}`} />
          <p className="meta">Berikutnya <b className="text-ink">{l.next.name}</b> · {l.value.toLocaleString('id-ID')}/{l.next.goal.toLocaleString('id-ID')} {l.unit}</p>
        </div>
      ) : <p className="meta mt-auto font-semibold text-brand">Semua tingkatan tercapai</p>}
    </article>
  );
}

function Mastery({ s }) {
  const [label, chip] = LEVEL[s.level] || [];
  return (
    <li className="flex flex-wrap items-center gap-x-4 gap-y-1.5 px-4 py-3">
      <div className="min-w-0 flex-1">
        <p className="flex flex-wrap items-center gap-2 font-semibold">{s.name}{label && <span className={chip}>{label}</span>}</p>
        <p className="meta mt-0.5">{s.coverage}% soal dikerjakan · akurasi {s.accuracy}% · {s.total.toLocaleString('id-ID')} soal tersedia</p>
      </div>
      {s.next && <p className="meta sm:text-right">Menuju <b className="text-ink">{s.next.title}</b>: {s.next.coverage}% soal{s.next.accuracy ? `, akurasi ${s.next.accuracy}%` : ''}</p>}
    </li>
  );
}

export default function Achievements() {
  const { data, error, loading, reload } = useApi('achievements');
  const mascots = useMascotsOn();
  const [all, setAll] = useState(false);
  if (loading) return <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">{[0, 1, 2].map((i) => <CardSkeleton key={i} rows={4} />)}</div>;
  if (error) return <ErrorState onRetry={reload}>{error.message}</ErrorState>;
  const subjects = all ? data.subjects : data.subjects.slice(0, 6);
  return (
    <section aria-labelledby="pencapaian" className="space-y-4">
      <SectionHeader title={<span id="pencapaian">Pencapaian & julukan</span>} action={<span className="chip chip-brand"><Award size={13} aria-hidden /> {data.earned} tercapai</span>}>
        Dihitung dari semua latihan, simulasi, dan kontribusimu. Tidak mengubah poin leaderboard.
      </SectionHeader>
      <div className="card-chunky tone-surface tone-sun flex items-center gap-4 p-5">
        {mascots && <Mascot name={data.title ? 'kila' : 'kori'} mood={data.title ? 'cheer' : 'think'} size={72} label="" />}
        <div className="min-w-0">
          <p className="text-[13px] font-bold text-[rgb(var(--tone-fg))]">Julukanmu</p>
          {data.title ? <p className="font-display text-2xl font-extrabold leading-tight text-ink">{data.title.title}</p> : <p className="font-display text-xl font-bold text-ink">Belum ada julukan</p>}
          <p className="mt-1 text-sm text-ink/80">{data.title ? 'Tampil di samping namamu di Leaderboard.' : 'Kerjakan 10 soal untuk membuka julukan pertamamu, "Langkah pertama".'}{data.titles.length > 1 ? ` Julukan lain: ${data.titles.slice(1, 4).join(', ')}${data.titles.length > 4 ? `, dan ${data.titles.length - 4} lainnya` : ''}.` : ''}</p>
        </div>
      </div>
      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">{data.ladders.map((l) => <Ladder key={l.key} l={l} />)}</div>
      {data.subjects.length > 0 && (
        <div className="card overflow-hidden">
          <div className="border-b border-line px-4 py-3"><h3 className="card-title">Penguasaan mata kuliah</h3><p className="meta">Penjelajah: 25% soal dikerjakan. Ahli: 50% dengan akurasi 70%. Master of: 80% dengan akurasi 80%.</p></div>
          <ul className="divide-y divide-line">{subjects.map((s) => <Mastery key={s.id} s={s} />)}</ul>
          {data.subjects.length > 6 && <button type="button" className="btn btn-ghost btn-sm m-2" aria-expanded={all} onClick={() => setAll((v) => !v)}><ChevronDown size={15} className={all ? 'rotate-180' : ''} aria-hidden /> {all ? 'Tampilkan lebih sedikit' : `Semua ${data.subjects.length} mata kuliah`}</button>}
        </div>
      )}
    </section>
  );
}
