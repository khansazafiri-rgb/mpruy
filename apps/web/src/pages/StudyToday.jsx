// BELAJAR HARI INI (/rencana-belajar): sesi hari ini dari semua ujian, sisa waktu, progres per ujian,
// dan tautan ke materi MEDCOEL yang tersedia. Penanda selesai adalah catatan pribadi, bukan nilai kuis.
import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { ArrowRight, CalendarDays } from 'lucide-react';
import PageHead from '@/components/PageHead';
import { Alert, EmptyState, ErrorState, PageLoader, ProgressBar } from '@/components/ui';
import { api, errorText } from '@/lib/api';
import { fmtDateTime } from '@/lib/time';
import { countdownText, fmtMinutes, planStatus, STALE } from '@/features/study/studyLib';
import { SessionRow } from './StudyPlan';

export default function StudyToday() {
  const [o, setO] = useState(null);
  const [error, setError] = useState('');
  const load = () => api('study/overview').then(setO).catch((e) => setError(errorText(e)));
  useEffect(() => { load(); }, []);
  async function mark(s, status) { try { await api(`study/sessions/${s.id}`, { method: 'POST', body: { status } }); load(); } catch (e) { setError(errorText(e)); } }
  if (error && !o) return <ErrorState onRetry={() => { setError(''); load(); }}>{error}</ErrorState>;
  if (!o) return <PageLoader />;
  const upcoming = o.exams.filter((x) => Date.parse(x.examAt.replace(' ', 'T')) > Date.now());
  const withPlan = upcoming.filter((x) => x.plan);
  const total = o.todaySessions.reduce((a, s) => a + s.minutes, 0);
  const left = o.todaySessions.filter((s) => s.status !== 'done').reduce((a, s) => a + s.minutes, 0);
  const stale = withPlan.filter((x) => x.plan.stale.length);
  return (
    <div className="space-y-6 pb-24 lg:pb-8">
      <PageHead eyebrow="Rencana belajar" title="Belajar hari ini" actions={<Link to="/jadwal" className="btn btn-secondary btn-sm"><CalendarDays size={16} aria-hidden /> Pusat ujian</Link>}>
        {o.todaySessions.length ? `${o.todaySessions.length} sesi · ${fmtMinutes(total)} · sisa ${fmtMinutes(left)}` : 'Tidak ada sesi terjadwal hari ini.'}
      </PageHead>
      <Alert>{error}</Alert>
      {stale.length > 0 && <Alert kind="warn">Jadwal perlu diperbarui untuk {stale.map((x) => `${x.title} (${x.plan.stale.map((r) => STALE[r] || r).join(', ')})`).join('; ')}. <Link className="font-semibold underline" to={`/jadwal/${stale[0].id}/rencana`}>Lihat usulan</Link></Alert>}
      {!upcoming.length ? <EmptyState icon={CalendarDays} mascot="nilo" mood="wave" title="Belum ada ujian" action={<Link className="btn btn-primary" to="/jadwal">Tambah ujian</Link>}>Tambahkan ujian, lalu buat rencana belajarnya. Tugas harian akan muncul di sini.</EmptyState>
        : !withPlan.length ? <EmptyState icon={CalendarDays} mascot="nilo" title="Belum ada rencana belajar" action={<Link className="btn btn-primary" to={`/jadwal/${upcoming[0].id}/rencana`}>Buat rencana untuk {upcoming[0].title}</Link>}>Pilih topik dan waktu belajar harianmu. Jadwalnya disusun otomatis dan bisa kamu ubah.</EmptyState>
          : <>
            {o.todaySessions.length > 0 ? <section aria-labelledby="today-h" className="space-y-2"><h2 id="today-h" className="section-title">Tugas hari ini</h2>
              <ProgressBar value={total - left} max={Math.max(1, total)} label="Progres hari ini" />
              <ul className="space-y-2">{o.todaySessions.map((s) => <SessionRow key={s.id} s={s} title={s.topic} exam={s.exam} links={s.links} onMark={mark} />)}</ul>
              {left === 0 && <p className="font-semibold text-brand">Semua sesi hari ini selesai. Istirahat juga bagian dari belajar.</p>}
            </section> : <p className="card p-4 text-sm">Hari ini kosong di rencanamu (hari libur atau semua tugas sudah dijadwalkan di hari lain).</p>}
            <section aria-labelledby="exams-h" className="space-y-2"><h2 id="exams-h" className="section-title">Progres per ujian</h2>
              <ul className="grid gap-3 sm:grid-cols-2">{upcoming.map((x) => {
                const st = planStatus(x.plan);
                return <li key={x.id} className="card space-y-2 p-4">
                  <p className="flex flex-wrap items-center justify-between gap-2"><span className="font-semibold">{x.title} · {x.subject?.name}</span><span className={st.chip}>{st.label}</span></p>
                  <p className="meta">{fmtDateTime(x.examAt, x.timezone, { weekday: true })} · {countdownText(x.examAt)}</p>
                  {x.plan && <><ProgressBar value={x.plan.minutesDone} max={Math.max(1, x.plan.minutesPlanned)} label={`Progres ${x.title}`} className="!h-2" /><p className="meta">{x.plan.topicsReady}/{x.plan.topics} topik siap · {fmtMinutes(x.plan.minutesDone)} dari {fmtMinutes(x.plan.minutesPlanned)}</p></>}
                  <Link to={`/jadwal/${x.id}/rencana`} className="inline-flex items-center gap-1 text-sm font-semibold text-brand">{x.plan ? 'Buka rencana' : 'Buat rencana'} <ArrowRight size={15} aria-hidden /></Link>
                </li>;
              })}</ul>
            </section>
          </>}
    </div>
  );
}
