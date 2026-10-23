import clsx from 'clsx';
import { ArrowRight, BellRing, CalendarDays, CalendarPlus, ChevronLeft, ChevronRight, FileUp, Flame, MessageCircle, PlayCircle, Star } from 'lucide-react';
import { useEffect, useRef, useState } from 'react';
import { Link } from 'react-router-dom';
import Countdown from '@/components/Countdown';
import Ecg from '@/components/Ecg';
import Illustration from '@/components/Illustration';
import TutorialCard from '@/features/onboarding/TutorialCard';
import SimHomeCard from '@/features/simulasi/components/HomeCard';
import SubmissionCard from '@/components/SubmissionCard';
import { Alert, ProgressBar } from '@/components/ui';
import { useAuth } from '@/context/AuthContext';
import { api } from '@/lib/api';
import { KIND } from '@/lib/labels';
import pb from '@/lib/pb';
import { daysUntil, fmtDateTime, relative } from '@/lib/time';
import { toneClass } from '@/lib/tone';
import { pendingTutorials } from '@/lib/tutorial';

// Deretan mata kuliah yang bisa digeser, dengan tombol panah di layar lebar.
function SubjectRail({ items }) {
  const ref = useRef(null);
  const [edge, setEdge] = useState({ start: true, end: false });
  const update = () => {
    const el = ref.current;
    if (!el) return;
    setEdge({ start: el.scrollLeft < 8, end: el.scrollLeft + el.clientWidth >= el.scrollWidth - 8 });
  };
  useEffect(() => { update(); }, [items.length]);
  const go = (dir) => {
    const el = ref.current;
    const smooth = !window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    el?.scrollBy({ left: dir * el.clientWidth * 0.8, behavior: smooth ? 'smooth' : 'auto' });
  };
  return (
    <div className="rail">
      <ul ref={ref} className="rail-track" onScroll={update}>
        {items.map((s) => (
          <li key={s.id}>
            <Link to={`/mata-kuliah/${s.slug}`} className={clsx('subj-card card-chunky tone-surface group', toneClass(s.illustrationKey || s.slug))}>
              {s.studying && <span className="subj-flag"><Star size={12} aria-hidden /> Dipelajari</span>}
              <span className="sticker-tone subj-card-art"><Illustration subject={s} className="h-full w-full" /></span>
              <span className="mt-3 block truncate font-display text-[17px] font-bold text-ink">{s.name}</span>
              <span className="block text-[13px] font-medium text-[rgb(var(--tone-fg))]"><b className="font-bold">{s.answeredCount}</b>/{s.questionCount} soal dikerjakan</span>
              <ProgressBar value={s.answeredCount} max={s.questionCount || 1} className="tone-track mt-2.5 !h-2" color="tone-fill" label={`Progres ${s.name}`} />
            </Link>
          </li>
        ))}
      </ul>
      <button type="button" className="rail-btn is-prev" onClick={() => go(-1)} disabled={edge.start} aria-label="Geser ke kiri"><ChevronLeft size={20} /></button>
      <button type="button" className="rail-btn is-next" onClick={() => go(1)} disabled={edge.end} aria-label="Geser ke kanan"><ChevronRight size={20} /></button>
    </div>
  );
}

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
  const shown = [...studying, ...subjects.filter((x) => !x.studying)].slice(0, 12);

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
          <span className="home-exam-dots tex-halftone-light" aria-hidden />
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

        <section className="streak-card card-chunky tone-surface tone-sun tex-halftone" aria-labelledby="streak-title">
          <p id="streak-title" className="flex items-center gap-2 text-sm font-bold text-[rgb(var(--tone-fg))]"><span className="streak-flame"><Flame size={18} aria-hidden /></span> Hari aktif berturut-turut</p>
          <p className="mt-3 font-display text-[56px] font-extrabold leading-none tracking-tight text-ink">{progress?.streak ?? '–'}<span className="ml-1.5 text-lg font-bold text-[rgb(var(--tone-fg))]">hari</span></p>
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
          <dl className="streak-mini mt-4 grid grid-cols-2 gap-2.5 text-sm">
            <div><dt>Soal 7 hari</dt><dd>{progress?.last7?.answered ?? 0}</dd></div>
            <div><dt>Poin kamu</dt><dd>{progress?.totalPoints ?? 0}</dd></div>
          </dl>
          <Link to="/progres" className="mt-4 inline-flex items-center gap-1 text-sm font-bold text-[rgb(var(--tone-fg))] hover:underline">Lihat progres <ArrowRight size={15} aria-hidden /></Link>
        </section>
      </div>

      {ongoing.length > 0 && (
        <section aria-labelledby="ongoing-title">
          <h2 id="ongoing-title" className="section-title mb-4">Lanjutkan pengerjaan</h2>
          <div className="grid gap-3 md:grid-cols-3">
            {ongoing.map((a) => (
              <Link key={a.id} to={`/kerjakan/${a.id}`} className="resume-card card-chunky tone-surface tone-sky group">
                <span className="resume-icon"><PlayCircle size={22} aria-hidden /></span>
                <span className="min-w-0">
                  <span className="block truncate font-bold text-ink">{a.title}</span>
                  <span className="block text-[13px] font-medium text-[rgb(var(--tone-fg))]">{KIND[a.kind]} · dimulai {relative(a.created)}</span>
                </span>
              </Link>
            ))}
          </div>
        </section>
      )}

      {(me?.role || 'user') === 'user' && <TutorialCard me={me} compact={!pendingTutorials(me).length} />}

      <section aria-labelledby="subj-title">
        <div className="mb-5 flex items-end justify-between gap-3">
          <div>
            <p className="eyebrow mb-2">{studying.length ? 'Pilihanmu duluan' : 'Mulai dari sini'}</p>
            <h2 id="subj-title" className="section-title">Mata kuliahmu</h2>
          </div>
          <Link to="/mata-kuliah" className="inline-flex items-center gap-1 text-sm font-semibold text-brand hover:underline">Semua mata kuliah <ArrowRight size={15} aria-hidden /></Link>
        </div>
        <SubjectRail items={shown} />
      </section>

      <SimHomeCard />

      <section aria-labelledby="req-title">
        <div className="mb-4 flex items-end justify-between gap-3">
          <h2 id="req-title" className="section-title">Progres permintaan saya</h2>
          <Link to="/chat-admin" className="section-head-link text-sm font-semibold text-brand hover:underline">Chat Admin</Link>
        </div>
        {subs.length ? (
          <div className="grid gap-3 md:grid-cols-2">{subs.map((s) => <SubmissionCard key={s.id} s={s} />)}</div>
        ) : (
          <div className="upload-invite card-chunky tone-surface tone-lilac tex-halftone">
            <span className="upload-invite-icon"><FileUp size={22} aria-hidden /></span>
            <div className="min-w-0 flex-1">
              <p className="font-display text-[19px] font-extrabold text-ink">Punya PDF soal dari kakak tingkat?</p>
              <p className="mt-1 text-[15px] text-[rgb(var(--tone-fg))]">Kirim lewat Chat Admin. Setelah diperiksa, soalnya jadi latihan di sini.</p>
            </div>
            <Link to="/chat-admin" className="btn btn-primary btn-press shrink-0"><MessageCircle size={18} aria-hidden /> Upload soal</Link>
          </div>
        )}
      </section>
    </div>
  );
}
