import { ArrowRight, BellRing, CalendarPlus, Flame, MessageCircle, PlayCircle } from 'lucide-react';
import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import Countdown from '@/components/Countdown';
import Illustration from '@/components/Illustration';
import SubmissionCard from '@/components/SubmissionCard';
import { Alert, ProgressBar } from '@/components/ui';
import { useAuth } from '@/context/AuthContext';
import { api } from '@/lib/api';
import { KIND } from '@/lib/labels';
import pb from '@/lib/pb';
import { daysUntil, fmtDateTime, relative } from '@/lib/time';

export default function Home() {
  const { me } = useAuth();
  const [exams, setExams] = useState([]);
  const [subjects, setSubjects] = useState([]);
  const [subs, setSubs] = useState([]);
  const [ongoing, setOngoing] = useState([]);
  const [progress, setProgress] = useState(null);
  const [error, setError] = useState('');

  useEffect(() => {
    const now = new Date().toISOString().replace('T', ' ');
    pb.collection('exam_schedules').getList(1, 20, { filter: `examAt >= "${now}"`, sort: 'examAt', expand: 'subject' })
      .then((r) => setExams(r.items)).catch(() => {});
    api('subjects').then((d) => setSubjects(d.items)).catch((e) => setError(e.message));
    api('submissions/mine').then((d) => setSubs(d.items.filter((s) => !['dibatalkan', 'kedaluwarsa'].includes(s.status)).slice(0, 4))).catch(() => {});
    pb.collection('attempts').getList(1, 3, { filter: 'status = "in_progress"', sort: '-created' }).then((r) => setOngoing(r.items)).catch(() => {});
    api('progress').then(setProgress).catch(() => {});
  }, []);

  const next = exams[0];
  const banners = exams.filter((x) => {
    const d = daysUntil(x.examAt, x.timezone);
    return (x.reminderDays || [7, 3, 1]).some((r) => d !== null && d <= r && d >= 0);
  });
  const studying = subjects.filter((s) => s.studying);
  const shown = (studying.length ? studying : subjects).slice(0, 4);

  return (
    <div className="space-y-8">
      <div>
        <p className="eyebrow mb-3">Selamat datang kembali</p>
        <h1 className="page-title">Halo, {me?.name?.split(' ')[0]}.</h1>
        <p className="mt-3 text-ink-muted">Sedikit lebih paham, setiap hari. Mau mulai dari mana?</p>
      </div>
      <Alert>{error}</Alert>

      {banners.length > 0 && (
        <div className="space-y-2">
          {banners.map((x) => {
            const d = daysUntil(x.examAt, x.timezone);
            return (
              <div key={x.id} className="flex items-center gap-3 rounded-xl border border-gold bg-gold-soft px-4 py-3">
                <BellRing className="shrink-0 text-[#8a6500]" size={20} />
                <p className="text-sm"><b>{x.title} {x.expand?.subject?.name}</b> {d === 0 ? 'hari ini' : d === 1 ? 'besok' : `${d} hari lagi`} · {fmtDateTime(x.examAt, x.timezone)}</p>
              </div>
            );
          })}
        </div>
      )}

      <div className="grid gap-4 lg:grid-cols-3">
        <section className="home-exam forest-surface relative overflow-hidden text-white lg:col-span-2">
          <div className="absolute -right-12 -top-12 h-44 w-44 rounded-full bg-white/10" aria-hidden />
          {next ? (
            <div className="relative">
              <p className="text-sm font-semibold text-white/80">Ujian terdekat</p>
              <h2 className="mt-1 font-display text-2xl font-bold text-white">{next.title} · {next.expand?.subject?.name}</h2>
              <p className="mb-4 text-sm text-white/80">{fmtDateTime(next.examAt, next.timezone, { weekday: true })}</p>
              <Countdown target={next.examAt} />
              <div className="mt-4 flex flex-wrap gap-2">
                <Link to={`/mata-kuliah/${next.expand?.subject?.slug || ''}`} className="btn bg-white text-brand-dark hover:bg-gold">Latihan sekarang</Link>
                <Link to="/jadwal" className="btn border border-white/40 text-white hover:bg-white/10">Atur jadwal</Link>
              </div>
            </div>
          ) : (
            <div className="relative">
              <h2 className="font-display text-2xl font-bold text-white">Belum ada jadwal ujian</h2>
              <p className="mt-1 text-white/85">Catat UTB, UAB, atau ujian lain supaya ada hitung mundur dan pengingat H-7, H-3, H-1.</p>
              <Link to="/jadwal" className="btn mt-4 bg-white text-brand-dark hover:bg-gold"><CalendarPlus size={18} /> Tambah jadwal ujian</Link>
            </div>
          )}
        </section>
        <section className="card p-5">
          <p className="flex items-center gap-2 text-sm font-semibold text-ink-muted"><Flame size={18} className="text-gold" /> Hari aktif berturut-turut</p>
          <p className="mt-1 font-display text-4xl font-extrabold">{progress?.streak ?? '-'}</p>
          <p className="mt-3 text-sm text-ink-muted">7 hari terakhir: <b className="text-ink">{progress?.last7?.answered ?? 0}</b> soal dikerjakan</p>
          <p className="text-sm text-ink-muted">Poin kamu: <b className="text-ink">{progress?.totalPoints ?? 0}</b></p>
          <Link to="/progres" className="mt-3 inline-flex items-center gap-1 text-sm font-semibold text-brand hover:underline">Lihat progres <ArrowRight size={15} /></Link>
        </section>
      </div>

      {ongoing.length > 0 && (
        <section>
          <h2 className="section-title mb-3">Lanjutkan pengerjaan</h2>
          <div className="grid gap-3 md:grid-cols-3">
            {ongoing.map((a) => (
              <Link key={a.id} to={`/kerjakan/${a.id}`} className="card flex items-center gap-3 p-4 hover:border-brand">
                <PlayCircle className="shrink-0 text-brand" size={28} />
                <div className="min-w-0">
                  <p className="truncate font-semibold">{a.title}</p>
                  <p className="text-xs text-ink-muted">{KIND[a.kind]} · dimulai {relative(a.created)}</p>
                </div>
              </Link>
            ))}
          </div>
        </section>
      )}

      <section>
        <div className="mb-3 flex items-end justify-between">
          <h2 className="section-title">{studying.length ? 'Sedang dipelajari' : 'Mata kuliah'}</h2>
          <Link to="/mata-kuliah" className="text-sm font-semibold text-brand hover:underline">Semua mata kuliah</Link>
        </div>
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          {shown.map((s) => (
            <Link key={s.id} to={`/mata-kuliah/${s.slug}`} className="home-subject card hover:border-brand/40">
              <div className="home-subject-art"><Illustration subject={s} className="h-full w-full" /></div>
              <div className="min-w-0 p-4">
                <p className="truncate font-display font-semibold">{s.name}</p>
                <p className="text-xs text-ink-muted">{s.answeredCount}/{s.questionCount} soal dikerjakan</p>
                <ProgressBar value={s.answeredCount} max={s.questionCount || 1} className="mt-1.5" color="bg-progress" label={`Progres ${s.name}`} />
              </div>
            </Link>
          ))}
        </div>
      </section>

      <section>
        <div className="mb-3 flex items-end justify-between">
          <h2 className="section-title">Progres permintaan saya</h2>
          <Link to="/chat-admin" className="text-sm font-semibold text-brand hover:underline">Chat Admin</Link>
        </div>
        {subs.length ? (
          <div className="grid gap-3 md:grid-cols-2">{subs.map((s) => <SubmissionCard key={s.id} s={s} />)}</div>
        ) : (
          <div className="card flex flex-col items-start gap-3 p-5 sm:flex-row sm:items-center sm:justify-between">
            <p className="text-ink-muted">Punya PDF soal? Kirim lewat Chat Admin, nanti diubah menjadi soal di web.</p>
            <Link to="/chat-admin" className="btn-secondary"><MessageCircle size={18} /> Upload soal</Link>
          </div>
        )}
      </section>
    </div>
  );
}
