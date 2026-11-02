// Drilling satu mata kuliah: materi (slide PPT dengan penjelasan) dan latihan soal, dari General dan kampusmu.
import clsx from 'clsx';
import { ArrowLeft, BookOpen, BookOpenText, Clock, Crosshair, Layers, School, Zap } from 'lucide-react';
import { useState } from 'react';
import { Link, useNavigate, useParams } from 'react-router-dom';
import Illustration from '@/components/Illustration';
import MascotTip from '@/components/MascotTip';
import { Alert, EmptyState, PageLoader, ProgressBar } from '@/components/ui';
import { api } from '@/lib/api';
import { toneClass } from '@/lib/tone';
import { useApi } from '@/lib/useApi';
import { thumb } from './DrillingDeck';

const COUNTS = [[10, '10 soal'], [20, '20 soal'], [50, '50 soal'], ['all', 'Semua']];
const MODES = [['learning', 'Mode Learning', BookOpen], ['exam', 'Mode ujian', Clock]];
const PREFS = 'medcoel-drilling-prefs';
const read = () => { try { return { count: 20, mode: 'learning', ...JSON.parse(localStorage.getItem(PREFS)) }; } catch { return { count: 20, mode: 'learning' }; } };

function DeckCard({ deck }) {
  const [broken, setBroken] = useState(false);
  return (
    <Link to={`/drilling/materi/${deck.id}`} className="deck-card card-chunky group">
      <span className="deck-card-cover">
        {deck.cover && !broken
          ? <img src={thumb(deck.cover, 560)} alt="" loading="lazy" decoding="async" referrerPolicy="no-referrer" onError={() => setBroken(true)} />
          : <span className="deck-card-blank"><BookOpenText size={30} aria-hidden /></span>}
        <span className="deck-card-count"><Layers size={13} aria-hidden /> {deck.slideCount} slide</span>
      </span>
      <span className="deck-card-body">
        <span className="font-display text-[17px] font-bold leading-snug text-ink">{deck.title}</span>
        {deck.description && <span className="deck-card-desc">{deck.description}</span>}
        <span className="deck-card-meta">{deck.scope === 'campus' ? <><School size={13} aria-hidden /> Kampusmu</> : 'General'}</span>
      </span>
    </Link>
  );
}

export default function DrillingSubject() {
  const { slug } = useParams();
  const nav = useNavigate();
  const { data, error, loading } = useApi(`drilling/subject/${slug}`);
  const [prefs, setPrefsState] = useState(read);
  const [busy, setBusy] = useState(''); // kunci tombol yang sedang menyiapkan sesi ('all' atau judul bagian)
  const [err, setErr] = useState('');
  const setPrefs = (p) => { setPrefsState(p); try { localStorage.setItem(PREFS, JSON.stringify(p)); } catch { /* penyimpanan perangkat tidak tersedia */ } };

  // set === undefined: semua soal; selain itu judul bagian ('' = Soal lainnya).
  const start = async (set) => {
    setBusy(set === undefined ? 'all' : `set:${set}`); setErr('');
    try {
      const r = await api('attempts/drilling', { method: 'POST', body: { subject: data.subject.id, count: prefs.count, mode: prefs.mode, ...(set === undefined ? {} : { set }) } });
      nav(`/kerjakan/${r.attempt.id}`);
    } catch (e) { setErr(e.message); setBusy(''); }
  };

  if (loading) return <PageLoader />;
  if (error) return <div className="space-y-4"><Alert>{error.status === 404 ? 'Mata kuliah ini belum punya file Drilling untukmu.' : error.message}</Alert><Link to="/drilling" className="btn-secondary inline-flex"><ArrowLeft size={16} aria-hidden /> Kembali ke Drilling</Link></div>;

  const { subject, decks, questionCount, campusQuestionCount, answeredCount } = data;
  const sets = data.sets || [];
  // Bagian ditampilkan bila soal berasal dari lebih dari satu PDF, atau satu-satunya bagian punya judul.
  const sectioned = sets.length > 1 || (sets.length === 1 && !!sets[0].title);
  const slides = decks.reduce((n, d) => n + d.slideCount, 0);
  return (
    <div className="space-y-9">
      <header className="page-head flex flex-wrap items-center gap-5">
        <span className={clsx('sticker-tone subject-tile-art !h-24 !w-24 shrink-0', toneClass(subject.illustrationKey || subject.slug))}><Illustration subject={subject} className="h-full w-full" /></span>
        <div className="min-w-0 flex-1">
          <Link to="/drilling" className="inline-flex items-center gap-1.5 text-sm font-semibold text-brand"><ArrowLeft size={15} aria-hidden /> Drilling</Link>
          <h1 className="page-title mt-2 !text-[30px] sm:!text-[38px]">{subject.name}</h1>
          <p className="mt-2 text-[15px] text-ink-muted">{decks.length} materi · {slides} slide · {questionCount} soal</p>
        </div>
      </header>
      {data.preview && <Alert kind="info">Pratinjau admin: Drilling belum tampil untuk pengguna.</Alert>}
      <Alert>{err}</Alert>

      <section aria-labelledby="deck-title" className="space-y-4">
        <h2 id="deck-title" className="font-display text-[22px] font-bold">Materi</h2>
        {decks.length ? <div className="deck-grid">{decks.map((d) => <DeckCard key={d.id} deck={d} />)}</div> : (
          <MascotTip mascot="kori" mood="think" title="Belum ada materi">Materi PPT untuk mata kuliah ini belum tersedia. Kamu bisa mengirim PPT-mu lewat Chat Admin &gt; Upload soal, lalu pilih “PPT materi”.</MascotTip>
        )}
      </section>

      <section aria-labelledby="soal-title" className="space-y-4">
        <h2 id="soal-title" className="font-display text-[22px] font-bold">Latihan soal</h2>
        {!questionCount ? <EmptyState icon={Crosshair} title="Belum ada soal Drilling">Soal untuk mata kuliah ini belum tersedia. Materinya tetap bisa dipelajari di atas.</EmptyState> : (
          <div className="card-chunky tone-surface space-y-4 p-5">
            <p className="text-[15px] text-ink-muted"><b className="text-ink">{answeredCount || 0}</b> dari {questionCount} soal sudah kamu kerjakan{campusQuestionCount ? ` · ${campusQuestionCount} soal khusus kampusmu` : ''}.</p>
            <ProgressBar value={answeredCount} max={questionCount || 1} className="tone-track !h-2" color="tone-fill" label={`Progres drilling ${subject.name}`} />
            <div className="flex flex-wrap items-center gap-x-6 gap-y-3" role="group" aria-label="Atur sesi drilling">
              <div className="filter-pills" role="group" aria-label="Jumlah soal">
                {COUNTS.map(([v, l]) => <button key={v} type="button" aria-pressed={prefs.count === v} onClick={() => setPrefs({ ...prefs, count: v })}>{l}</button>)}
              </div>
              <div className="filter-pills" role="group" aria-label="Mode">
                {MODES.map(([v, l, Icon]) => <button key={v} type="button" aria-pressed={prefs.mode === v} onClick={() => setPrefs({ ...prefs, mode: v })}><Icon size={14} aria-hidden /> {l}</button>)}
              </div>
            </div>
            {!sectioned && <button type="button" className="btn-primary" onClick={() => start()} disabled={!!busy}><Zap size={16} aria-hidden /> {busy ? 'Menyiapkan...' : 'Mulai drilling'}</button>}
            {sectioned && (
              <ul className="deck-sets" aria-label="Bagian soal">
                {sets.length > 1 && (
                  <li className="deck-set is-all">
                    <span className="deck-set-main"><b>Semua bagian</b><small>{questionCount} soal dari {sets.length} bagian, diacak</small></span>
                    <button type="button" className="btn-primary btn-sm" onClick={() => start()} disabled={!!busy}><Zap size={15} aria-hidden /> {busy === 'all' ? 'Menyiapkan...' : 'Mulai'}</button>
                  </li>
                )}
                {sets.map((g) => (
                  <li key={g.title} className="deck-set">
                    <span className="deck-set-main">
                      <b>{g.title || 'Soal lainnya'}</b>
                      <small>{g.answeredCount}/{g.questionCount} soal dikerjakan{g.campusQuestionCount ? ' · khusus kampusmu' : ''}</small>
                      <ProgressBar value={g.answeredCount} max={g.questionCount || 1} className="tone-track !h-1.5" color="tone-fill" label={`Progres ${g.title || 'soal lainnya'}`} />
                    </span>
                    <button type="button" className="btn-secondary btn-sm" onClick={() => start(g.title)} disabled={!!busy}><Zap size={15} aria-hidden /> {busy === `set:${g.title}` ? 'Menyiapkan...' : 'Mulai'}</button>
                  </li>
                ))}
              </ul>
            )}
          </div>
        )}
      </section>
    </div>
  );
}
