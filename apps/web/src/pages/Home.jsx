import { ArrowRight, BellRing, CalendarDays, CalendarPlus, FileUp, Flame, MessageCircle, PlayCircle } from 'lucide-react';
import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import Countdown from '@/components/Countdown';
import Ecg from '@/components/Ecg';
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

  const today = new Intl.DateTimeFormat('id-ID', { weekday: 'long', day: 'numeric', month: 'long', timeZone: 'Asia/Jakarta' }).format(new Date());
  const week = (progress?.daily || []).slice(-7);
  const dayName = (d) => new Intl.DateTimeFormat('id-ID', { weekday: 'narrow', timeZone: 'UTC' }).format(new Date(`${d}T00:00:00Z`));

  return (
    <div className="space-y-10">
      <header className="page-head home-head">
        <p className="eyebrow mb-3">{today}</p>
        <h1 className="page-title">Halo, <span className="hl">{me?.name?.split(' ')[0]}</span>.</h1>
        <p className="mt-3 max-w-xl text-[17px] text-ink-muted">Mau mulai dari mana hari ini? Satu BAB kecil pun tetap dihitung.</p>
        <p className="hand page-head-note home-note" aria-hidden>sedikit lebih paham, setiap hari ✎</p>
      </header>
      <Alert>{error}</Alert>

      {banners.length > 0 && (
        <div className="space-y-2">
          {banners.map((x) => {
            const d = daysUntil(x.examAt, x.timezone);
            return (
              <div key={x.id} className="reminder-strip">
                <BellRing className="shrink-0 text-[#8a6500]" size={20} aria-hidden />
                <p className="text-[15px]"><b>{x.title} {x.expand?.subject?.name}</b> {d === 0 ? 'hari ini' : d === 1 ? 'besok' : `${d} hari lagi`} · {fmtDateTime(x.examAt, x.timezone)}</p>
              </div>
            );
          })}
        </div>
      )}

      <div className="grid gap-5 lg:grid-cols-3">
        <section className="home-exam-card surface-forest lg:col-span-2" aria-label="Ujian terdekat">
          <Ecg className="home-ecg" />
          {next ? (
            <div className="relative">
              <span className="tag-label bg-white/10 text-mint"><CalendarDays size={14} aria-hidden /> Ujian terdekat</span>
              <h2 className="mt-4 font-display text-[28px] font-extrabold leading-tight tracking-tight">{next.title} · {next.expand?.subject?.name}</h2>
              <p className="mb-5 mt-1 text-[15px] text-white/75">{fmtDateTime(next.examAt, next.timezone, { weekday: true })}</p>
              <Countdown target={next.examAt} />
              <div className="mt-6 flex flex-wrap gap-3">
                <Link to={`/mata-kuliah/${next.expand?.subject?.slug || ''}`} className="btn btn-paper btn-press">Latihan sekarang <ArrowRight size={17} /></Link>
                <Link to="/jadwal" className="btn border border-white/30 text-white hover:bg-white/10">Atur jadwal</Link>
              </div>
            </div>
          ) : (
            <div className="relative max-w-lg">
              <span className="tag-label bg-white/10 text-mint"><CalendarDays size={14} aria-hidden /> Jadwal ujian</span>
              <h2 className="mt-4 font-display text-[28px] font-extrabold leading-tight tracking-tight">Belum ada jadwal ujian</h2>
              <p className="mt-2 text-[15px] leading-relaxed text-white/80">Catat UTB, UAB, atau ujian lain. Nanti ada hitung mundur dan pengingat H-7, H-3, H-1.</p>
              <Link to="/jadwal" className="btn btn-paper btn-press mt-6"><CalendarPlus size={18} /> Tambah jadwal ujian</Link>
              <p className="hand home-exam-note" aria-hidden>biar nggak<br />dadakan ✦</p>
            </div>
          )}
        </section>

        <section className="paper-sheet streak-card" aria-labelledby="streak-title">
          <p id="streak-title" className="flex items-center gap-2 text-sm font-semibold text-ink-muted"><Flame size={18} className="text-gold" aria-hidden /> Hari aktif berturut-turut</p>
          <p className="mt-2 font-display text-[52px] font-extrabold leading-none tracking-tight text-forest">{progress?.streak ?? '–'}<span className="ml-1.5 text-lg font-bold text-ink-muted">hari</span></p>
          {week.length > 0 && (
            <ol className="streak-week" aria-label="Aktivitas 7 hari terakhir">
              {week.map((d) => (
                <li key={d.date} className={d.answered > 0 ? 'is-on' : ''} title={`${d.date}: ${d.answered} soal`}>
                  <span aria-hidden>{dayName(d.date)}</span>
                  <i aria-hidden />
                  <span className="sr-only">{d.date}: {d.answered} soal</span>
                </li>
              ))}
            </ol>
          )}
          <dl className="mt-4 grid grid-cols-2 gap-3 border-t border-dashed border-paper-2 pt-4 text-sm">
            <div><dt className="text-ink-muted">Soal 7 hari</dt><dd className="font-display text-xl font-bold text-ink">{progress?.last7?.answered ?? 0}</dd></div>
            <div><dt className="text-ink-muted">Poin kamu</dt><dd className="font-display text-xl font-bold text-ink">{progress?.totalPoints ?? 0}</dd></div>
          </dl>
          <Link to="/progres" className="mt-4 inline-flex items-center gap-1 text-sm font-semibold text-brand hover:underline">Lihat progres <ArrowRight size={15} aria-hidden /></Link>
        </section>
      </div>

      {ongoing.length > 0 && (
        <section aria-labelledby="ongoing-title">
          <h2 id="ongoing-title" className="section-title mb-4">Lanjutkan pengerjaan</h2>
          <div className="grid gap-3 md:grid-cols-3">
            {ongoing.map((a) => (
              <Link key={a.id} to={`/kerjakan/${a.id}`} className="paper-sheet resume-card group">
                <span className="resume-icon"><PlayCircle size={22} aria-hidden /></span>
                <span className="min-w-0">
                  <span className="block truncate font-semibold text-ink group-hover:text-brand">{a.title}</span>
                  <span className="block text-[13px] text-ink-muted">{KIND[a.kind]} · dimulai {relative(a.created)}</span>
                </span>
              </Link>
            ))}
          </div>
        </section>
      )}

      <section aria-labelledby="subj-title">
        <div className="mb-5 flex items-end justify-between gap-3">
          <div>
            <p className="eyebrow mb-2">{studying.length ? 'Pilihanmu' : 'Mulai dari sini'}</p>
            <h2 id="subj-title" className="section-title">{studying.length ? 'Sedang dipelajari' : 'Mata kuliah'}</h2>
          </div>
          <Link to="/mata-kuliah" className="inline-flex items-center gap-1 text-sm font-semibold text-brand hover:underline">Semua mata kuliah <ArrowRight size={15} aria-hidden /></Link>
        </div>
        <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
          {shown.map((s, i) => (
            <Link key={s.id} to={`/mata-kuliah/${s.slug}`} className="sticker-tile group" style={{ '--tilt': `${[-1.6, 1.2, -0.8, 1.8][i % 4]}deg` }}>
              <span className="sticker sticker-tile-art"><Illustration subject={s} className="h-full w-full" /></span>
              <span className="mt-3 block truncate font-display text-[16px] font-semibold text-ink group-hover:text-brand">{s.name}</span>
              <span className="block text-[13px] text-ink-muted"><b className="font-semibold text-ink">{s.answeredCount}</b>/{s.questionCount} soal dikerjakan</span>
              <ProgressBar value={s.answeredCount} max={s.questionCount || 1} className="mt-2 !h-2" color="bg-gold" label={`Progres ${s.name}`} />
            </Link>
          ))}
        </div>
      </section>

      <section aria-labelledby="req-title">
        <div className="mb-4 flex items-end justify-between gap-3">
          <h2 id="req-title" className="section-title">Progres permintaan saya</h2>
          <Link to="/chat-admin" className="section-head-link text-sm font-semibold text-brand hover:underline">Chat Admin</Link>
        </div>
        {subs.length ? (
          <div className="grid gap-3 md:grid-cols-2">{subs.map((s) => <SubmissionCard key={s.id} s={s} />)}</div>
        ) : (
          <div className="upload-invite paper-sheet tex-ruled">
            <span className="upload-invite-icon"><FileUp size={22} aria-hidden /></span>
            <div className="min-w-0 flex-1">
              <p className="font-display text-[17px] font-semibold text-ink">Punya PDF soal dari kakak tingkat?</p>
              <p className="mt-1 text-[15px] text-ink-muted">Kirim lewat Chat Admin. Setelah diperiksa, soalnya jadi latihan di sini.</p>
            </div>
            <Link to="/chat-admin" className="btn-secondary shrink-0"><MessageCircle size={18} aria-hidden /> Upload soal</Link>
          </div>
        )}
      </section>
    </div>
  );
}
