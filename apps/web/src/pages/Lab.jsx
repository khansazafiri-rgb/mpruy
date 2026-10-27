import { useEffect, useState } from 'react';
import { Link, useNavigate, useParams, useSearchParams } from 'react-router-dom';
import { ArrowRight, FlaskConical, RotateCcw, Search } from 'lucide-react';
import { api, errorText } from '@/lib/api';
import { Alert, PageLoader } from '@/components/ui';
import { useAuth } from '@/context/AuthContext';
import LabLesson from '@/features/lab/LabLesson';
import LabPracticeSession from '@/features/lab/LabPracticeSession';
import { LabContextBar, LabPathNavigation } from '@/features/lab/LabNav';
import { isPracticeFirst, objectHref, pathNeighbors, pathwayState, stepState } from '@/features/lab/labUtils';
import { authoredExplore, authoredRootOptions } from '@/features/lab/labDiscovery';
import { markProgress } from '@/features/lab/labProgress';

const DOMAINS = { imaging: 'Medical Imaging', clinical_pathology: 'Patologi Klinik', microbiology: 'Mikrobiologi', parasitology: 'Parasitologi', histology: 'Histologi & Histopatologi', anatomy: 'Anatomi Interaktif' };
// Lab pages sit above the fixed bottom navigation (and the safe area on phones) so nothing is ever covered.
const PAGE = 'min-w-0 space-y-4 pb-[calc(6.5rem+env(safe-area-inset-bottom))] lg:pb-8';

function useLab(path, query) {
  const [state, setState] = useState({ data: null, error: '', loading: !!path });
  const [retry, setRetry] = useState(0); const key = JSON.stringify(query || {});
  useEffect(() => { if (!path) { setState({ data: null, error: '', loading: false }); return undefined; } let live = true; setState((s) => ({ data: retry ? s.data : null, error: '', loading: true })); api(path, { query: JSON.parse(key) }).then((data) => live && setState({ data, error: '', loading: false })).catch((e) => live && setState({ data: null, error: errorText(e), loading: false })); return () => { live = false; }; }, [path, key, retry]);
  return { ...state, retry: () => setRetry((x) => x + 1) };
}
function LoadState({ state }) { return state.loading && !state.data ? <PageLoader /> : state.error ? <div className="space-y-3"><Alert>{state.error}</Alert><button className="btn btn-secondary" onClick={state.retry}>Coba lagi</button></div> : null; }
const Progress = ({ done, total, label }) => <div className="h-2 w-full overflow-hidden rounded-full bg-paper-2" role="progressbar" aria-valuemin={0} aria-valuemax={total} aria-valuenow={done} aria-label={label}><div className="h-full rounded-full bg-brand" style={{ width: `${total ? (done / total) * 100 : 0}%` }} /></div>;

// Lessons and practice look different on purpose: a learner should know what they are about to open.
function ObjectCard({ item }) {
  const practice = item.kind === 'practice';
  return <Link to={item.href || objectHref(item.slug)} className={`card group flex h-full min-w-0 flex-col gap-1.5 border-l-4 p-4 transition hover:border-brand focus:outline-brand ${practice ? 'border-l-gold bg-gold-soft/30' : 'border-l-brand'}`}>
    <span className={`text-xs font-bold uppercase tracking-wide ${practice ? 'text-ink' : 'text-brand'}`}>{practice ? `Latihan · ${item.cases} kasus` : `Materi · ${item.domainTitle || DOMAINS[item.domain] || item.domain}`}</span>
    <h3 className="text-lg font-semibold leading-snug">{item.title}</h3>
    <p className="text-sm text-ink-muted">{item.summary}</p>
    <span className="mt-auto flex items-center justify-between pt-1 text-sm font-semibold text-brand"><span>{practice ? 'Mulai latihan' : item.modality || 'Buka materi'}</span><ArrowRight size={16} aria-hidden /></span>
  </Link>;
}
const STATUS = { new: ['Belum mulai', 'Mulai'], active: ['Sedang berjalan', 'Lanjutkan'], done: ['✓ Selesai', 'Lihat jalur'] };
function PathwayCard({ item }) {
  const [label, cta] = STATUS[item.status] || STATUS.new;
  return <Link to={`/lab/jalur/${item.slug}`} className="card flex min-w-0 flex-col gap-2 p-4 hover:border-brand focus:outline-brand">
    <span className="flex items-center justify-between text-xs font-bold uppercase tracking-wide text-brand"><span>{label}</span><span className="text-ink-muted">{item.total} langkah</span></span>
    <h2 className="text-lg font-semibold">{item.title}</h2><p className="text-sm text-ink-muted">{item.summary}</p>
    {item.status === 'active' && <Progress done={item.done} total={item.total} label="Progres jalur" />}
    <span className="mt-1 text-sm font-semibold text-brand">{cta} →</span>
  </Link>;
}

const VISUAL = [['imaging', 'Medical Imaging'], ['anatomy', 'Anatomi Interaktif'], ['clinical_pathology', 'Patologi Klinik'], ['microbiology', 'Mikrobiologi'], ['parasitology', 'Parasitologi'], ['histology', 'Histologi']];
export default function Lab() {
  const [params, setParams] = useSearchParams(); const { isAdmin } = useAuth();
  const q = params.get('q') || ''; const domain = params.get('domain') || ''; const mode = params.get('mode') === 'guided' ? 'guided' : 'explore'; const page = Math.max(1, Number(params.get('page')) || 1);
  const [search, setSearch] = useState(q); useEffect(() => setSearch(q), [q]);
  const overview = useLab('lab/overview'); const next = overview.data?.continue; const counts = overview.data?.domains || {};
  const catalog = useLab('lab/catalog');
  const authoredOnly = mode === 'explore' && domain.startsWith('catalog:');
  const state = useLab(mode === 'guided' ? 'lab/pathways' : authoredOnly ? null : 'lab/objects', mode === 'guided' ? { page } : { q, domain, page });
  const items = mode === 'guided' ? state.data?.items || [] : [
    ...(authoredOnly ? [] : state.data?.items || []), ...authoredExplore(catalog.data, { q, domain, page }),
  ];
  const ready = mode === 'guided' ? !!state.data : authoredOnly ? !!catalog.data : !!state.data || !!catalog.data;
  const hasMore = !authoredOnly && state.data?.hasMore;
  const change = (patch) => setParams({ ...Object.fromEntries(params), page: '1', ...patch });
  return <div className={PAGE}>
    <header className="flex items-end justify-between gap-3">
      <div className="min-w-0"><p className="flex items-center gap-1.5 text-xs font-bold uppercase tracking-wide text-brand"><FlaskConical size={15} aria-hidden /> MEDCOEL Lab</p><h1 className="text-xl font-bold leading-tight sm:text-2xl">Belajar lewat gambar, kasus, dan anatomi</h1></div>
      {isAdmin && <Link className="shrink-0 text-xs text-ink-muted underline" to="/admin/lab">Kelola</Link>}
    </header>
    {next && <section className="card flex items-center justify-between gap-3 p-4" aria-label="Lanjutkan belajar">
      <div className="min-w-0 flex-1 space-y-1.5"><p className="text-xs font-bold uppercase tracking-wide text-brand">Lanjutkan belajar</p><p className="truncate text-lg font-semibold">{next.pathway.title}</p><Progress done={next.completed.length} total={next.total} label="Progres jalur" /><p className="text-xs text-ink-muted">{next.completed.length} / {next.total} selesai</p></div>
      <Link className="btn btn-primary min-h-11 shrink-0" to={objectHref(next.resume, next.pathway.slug)}>Lanjutkan <ArrowRight size={16} aria-hidden /></Link>
    </section>}
    <div role="tablist" aria-label="Cara belajar Lab" className="grid grid-cols-2 gap-1 rounded-2xl bg-paper-2 p-1">
      {[['explore', 'Explore'], ['guided', 'Guided Learning']].map(([k, label]) => <button key={k} role="tab" aria-selected={mode === k} className={`min-h-11 rounded-xl px-3 text-sm font-semibold ${mode === k ? 'bg-surface text-brand shadow-sm' : 'text-ink-muted'}`} onClick={() => change({ mode: k })}>{label}</button>)}
    </div>
    {mode === 'explore' && <form className="flex flex-col gap-2 sm:flex-row" onSubmit={(e) => { e.preventDefault(); change({ q: search }); }}>
      <label className="relative min-w-0 flex-1"><span className="sr-only">Cari topik, pemeriksaan, atau kata kunci</span><Search className="absolute left-3 top-3.5 text-ink-muted" size={18} /><input className="input pl-10" value={search} maxLength={120} onChange={(e) => setSearch(e.target.value)} placeholder="Cari topik atau kata kunci…" /></label>
      <select aria-label="Domain Lab" className="input sm:max-w-52" value={domain} onChange={(e) => change({ domain: e.target.value })}><option value="">Semua domain</option>{Object.entries(DOMAINS).map(([key, title]) => <option key={key} value={key}>{title}</option>)}{authoredRootOptions(catalog.data).map((item) => <option key={item.key} value={item.key}>{item.title}</option>)}</select>
      <button className="btn btn-primary min-h-11">Cari</button>
    </form>}
    <LoadState state={authoredOnly ? catalog : state} />
    {ready && <>
      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">{items.map((item) => (mode === 'guided' ? <PathwayCard key={item.id} item={item} /> : <ObjectCard key={item.id} item={item} />))}</div>
      {!items.length && <div className="card p-6 text-center"><h2 className="font-semibold">{q || domain ? 'Belum ada topik yang cocok' : mode === 'guided' ? 'Belum ada jalur belajar' : 'Konten Lab sedang disiapkan'}</h2><p className="mt-1 text-sm text-ink-muted">{q || domain ? 'Coba kata kunci lain atau pilih semua domain.' : 'Konten akan muncul setelah diperiksa dan diterbitkan oleh admin.'}</p></div>}
      {(page > 1 || hasMore) && <div className="flex items-center justify-center gap-3"><button className="btn btn-secondary min-h-11" disabled={page <= 1} onClick={() => change({ page: String(page - 1) })}>Sebelumnya</button><span className="text-sm">Halaman {page}</span><button className="btn btn-secondary min-h-11" disabled={!hasMore} onClick={() => change({ page: String(page + 1) })}>Berikutnya</button></div>}
    </>}
    <section aria-label="Visual Learning" className="space-y-2 pt-2"><h2 className="text-sm font-bold uppercase tracking-wide text-ink-muted">Visual Learning</h2>
      <div className="flex flex-wrap gap-2">{VISUAL.map(([key, title]) => counts[key] ? <Link key={key} to={`/lab?domain=${key}`} className="chip min-h-9 bg-brand-soft text-brand">{title} · {counts[key]}</Link> : <span key={key} className="chip min-h-9 bg-paper-2 text-ink-muted" aria-disabled="true">{title} · segera hadir</span>)}</div>
    </section>
  </div>;
}

// Guided Learning as a journey: the recommended step is dominant, finished steps are quiet, nothing is locked.
export function LabPathway() {
  const { slug } = useParams(); const state = useLab(`lab/pathways/${encodeURIComponent(slug)}`); const d = state.data; const [busy, setBusy] = useState(false);
  const done = d?.progress?.completed || []; const st = d ? pathwayState(d.steps, done, d.progress?.lastObject) : null;
  async function restart() { setBusy(true); await markProgress(slug, undefined, undefined, true); setBusy(false); state.retry(); }
  return <div className={PAGE}>
    <Link to="/lab?mode=guided" className="inline-flex min-h-9 items-center text-sm font-semibold text-brand">← Guided Learning</Link>
    <LoadState state={state} />
    {d && st && <>
      <header className="space-y-1.5"><h1 className="text-2xl font-bold">{d.title}</h1><p className="text-ink-muted">{d.summary}</p><p className="text-sm font-semibold text-ink-muted">{d.steps.length} langkah · urutan disarankan, tetap bebas melompat</p></header>
      {st.status === 'done' ? <section className="space-y-3 rounded-2xl bg-brand-soft p-4" aria-label="Jalur selesai"><p className="text-lg font-bold text-brand">✓ Jalur selesai</p><p className="text-sm">Semua {st.total} langkah sudah kamu selesaikan.</p>
        <div className="flex flex-col gap-2 sm:flex-row">{d.steps[0] && <Link to={objectHref(d.steps[0].slug, slug)} className="btn btn-secondary min-h-11">Lihat kembali materi</Link>}<button type="button" className="btn btn-ghost min-h-11" disabled={busy} onClick={restart}><RotateCcw size={16} aria-hidden /> Ulangi jalur</button></div></section>
        : <section className="space-y-2" aria-label="Progres jalur">{st.status === 'active' && <><Progress done={st.done} total={st.total} label="Progres jalur" /><p className="text-sm font-semibold">{st.done} / {st.total} selesai</p></>}
          {st.resume && <Link to={objectHref(st.resume.slug, slug)} className="btn btn-primary min-h-11 w-full sm:w-auto">{st.status === 'new' ? 'Mulai' : 'Lanjutkan'}{st.status === 'active' ? `: ${st.resume.title}` : ''}</Link>}</section>}
      <ol className="relative space-y-3 border-l-2 border-line pl-7" aria-label="Langkah jalur">{d.steps.map((s, i) => {
        const ss = stepState(s, done, st.resume); const practice = s.kind === 'practice'; const type = practice ? `Latihan · ${s.cases} kasus` : 'Materi';
        return <li key={s.id} className="relative">
          <span aria-hidden className={`absolute -left-[2.35rem] top-3 grid h-7 w-7 place-items-center rounded-full text-xs font-bold ${ss === 'done' ? 'bg-brand text-white' : ss === 'current' ? 'bg-gold text-ink ring-4 ring-gold/30' : 'bg-paper-2 text-ink-muted'}`}>{ss === 'done' ? '✓' : ss === 'current' ? '→' : i + 1}</span>
          <Link to={objectHref(s.slug, slug)} aria-current={ss === 'current' ? 'step' : undefined} className={ss === 'current' ? 'card block border-2 border-gold p-4 shadow-md hover:border-brand focus:outline-brand' : `block rounded-xl border border-line px-4 py-2.5 focus:outline-brand ${ss === 'done' ? 'bg-paper-2/40 text-ink-muted' : 'bg-surface hover:border-brand'}`}>
            <span className="block text-xs font-bold uppercase tracking-wide text-ink-muted">{type}{ss === 'done' ? ' · selesai' : ''}</span>
            <span className={`block font-semibold ${ss === 'current' ? 'text-lg' : ''}`}>{s.title}</span>
            {ss === 'current' && <><span className="mt-1 block text-sm text-ink-muted">{s.summary}</span><span className="mt-2 flex items-center gap-1 text-sm font-semibold text-brand">{st.status === 'new' ? 'Mulai di sini' : 'Lanjutkan di sini'} <ArrowRight size={16} aria-hidden /></span></>}
          </Link></li>;
      })}</ol>
      {!d.steps.length && <p>Langkah pada jalur ini sedang diperbarui.</p>}
    </>}
  </div>;
}

export function LabObject() {
  const { slug } = useParams(); const [params] = useSearchParams(); const pathSlug = params.get('jalur') || '';
  const state = useLab(`lab/objects/${encodeURIComponent(slug)}`); const pathState = useLab(pathSlug ? `lab/pathways/${encodeURIComponent(pathSlug)}` : null);
  const pathway = pathState.data; const ctx = pathway ? pathNeighbors(pathway.steps, slug) : null;
  // Pathway context is kept only when the lesson really belongs to that pathway; otherwise it counts as opened from Explore.
  const route = ctx ? { pathway: { slug: pathSlug, title: pathway.title }, ctx, completed: (pathway.progress?.completed || []).includes(slug) } : null;
  return <div className={PAGE}><LoadState state={state} />{state.data && (pathSlug && pathState.loading ? <PageLoader /> : <LabObjectView key={state.data.id} d={state.data} route={route} />)}</div>;
}

function AboutPractice({ d }) {
  return <details className="rounded-xl border border-line bg-surface px-3 py-1 text-sm"><summary className="min-h-9 cursor-pointer select-none py-1.5 font-semibold text-ink-muted">ⓘ Tentang latihan</summary>
    <div className="space-y-2 pb-2 leading-relaxed text-ink-muted"><p className="font-semibold text-ink">{d.title}</p>{d.summary && <p>{d.summary}</p>}{d.data.definition && <p>{d.data.definition}</p>}
      <p>Jawaban dinilai terhadap label benchmark dataset (label tingkat gambar, tanpa anotasi lokasi). Latihan Lab tidak menambah poin atau leaderboard.</p></div></details>;
}

function LabObjectView({ d, route }) {
  const nav = useNavigate(); const [practiceError, setPracticeError] = useState(''); const [starting, setStarting] = useState(false);
  const practiceFirst = isPracticeFirst(d); const [practicing, setPracticing] = useState(practiceFirst); const [done, setDone] = useState(!!route?.completed);
  // Progress signals: opening records "last studied"; completion needs an explicit signal (mark done, finish practice, or move on).
  const pathSlug = route?.pathway.slug;
  useEffect(() => { if (pathSlug) markProgress(pathSlug, d.slug); }, [pathSlug, d.slug]);
  const complete = (value) => { setDone(value); if (pathSlug) markProgress(pathSlug, d.slug, value); };
  async function legacyPractice(id) { setStarting(true); setPracticeError(''); try { const r = await api(`lab/objects/${d.id}/practice`, { method: 'POST', body: { question: id } }); nav(`/kerjakan/${r.id}`); } catch (e) { setPracticeError(errorText(e)); } finally { setStarting(false); } }
  const onNext = () => { if (!done && !practiceFirst) complete(true); };
  const context = <LabContextBar pathway={route?.pathway} ctx={route?.ctx} domain={DOMAINS[d.domain]} onNext={onNext} showNext={!practicing} />;
  const pathNav = route && <LabPathNavigation pathway={route.pathway} ctx={route.ctx} completed={done} onToggleComplete={() => complete(!done)} onNext={onNext} />;
  if (practicing) {
    // A practice object opens straight on case 1; leaving it returns to the pathway (there is no lesson page to go back to).
    const exit = () => (practiceFirst ? nav(route ? `/lab/jalur/${route.pathway.slug}` : '/lab') : setPracticing(false));
    return <div className="space-y-3">{context}<LabPracticeSession questions={d.questions} onExit={exit} exitLabel={practiceFirst ? (route ? 'Kembali ke jalur' : 'Kembali ke Lab') : 'Kembali ke materi'} about={practiceFirst ? <AboutPractice d={d} /> : null} onFinish={() => { if (!done) complete(true); }}>{pathNav}</LabPracticeSession></div>;
  }
  const lessonCtx = { modality: d.modality, startPractice: () => setPracticing(true), legacyPractice, practiceError, starting };
  return <div className="space-y-4">
    {context}
    <header><p className="mb-1 text-xs font-bold uppercase tracking-wide text-brand">{DOMAINS[d.domain]}{d.modality ? ` · ${d.modality}` : ''}</p><h1 className="text-2xl font-bold leading-tight md:text-3xl">{d.title}</h1><p className="mt-2 text-ink-muted">{d.summary}</p></header>
    {d.demo && <Alert kind="warn">Contoh sintetis untuk mencoba fitur. Bukan data pasien atau materi diagnosis tervalidasi.</Alert>}
    <LabLesson d={d} ctx={lessonCtx} />
    {pathNav}
    {d.related.length > 0 && <section className="space-y-3"><h2 className="text-xl font-semibold">Topik terkait</h2><div className="grid gap-3 sm:grid-cols-2">{d.related.map((r) => <ObjectCard item={r} key={r.id} />)}</div></section>}
  </div>;
}
