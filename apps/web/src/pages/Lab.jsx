import { useEffect, useState } from 'react';
import { Link, useNavigate, useParams, useSearchParams } from 'react-router-dom';
import { ArrowRight, FlaskConical, RotateCcw, Search, X } from 'lucide-react';
import { api, errorText } from '@/lib/api';
import PageHead from '@/components/PageHead';
import { Alert, CardSkeleton, EmptyState, ErrorState, PageLoader, ProgressBar, Segmented } from '@/components/ui';
import { useAuth } from '@/context/AuthContext';
import LabLesson from '@/features/lab/LabLesson';
import LabPracticeSession from '@/features/lab/LabPracticeSession';
import { LabContextBar, LabPathNavigation } from '@/features/lab/LabNav';
import { isPracticeFirst, objectHref, pathNeighbors, pathwayState, stepState } from '@/features/lab/labUtils';
import { authoredRootOptions, disciplineTitle, groupByDiscipline, guidedPathways, labSections, normalizeDiscipline, publishedReplacements } from '@/features/lab/labDiscovery';
import { markProgress } from '@/features/lab/labProgress';

// Lab pages sit above the fixed bottom navigation (and the safe area on phones) so nothing is ever covered.
const PAGE = 'min-w-0 space-y-5 pb-[calc(6.5rem+env(safe-area-inset-bottom))] lg:pb-8';

function useLab(path, query) {
  const [state, setState] = useState({ data: null, error: '', loading: !!path });
  const [retry, setRetry] = useState(0); const key = JSON.stringify(query || {});
  useEffect(() => { if (!path) { setState({ data: null, error: '', loading: false }); return undefined; } let live = true; setState((s) => ({ data: retry ? s.data : null, error: '', loading: true })); api(path, { query: JSON.parse(key) }).then((data) => live && setState({ data, error: '', loading: false })).catch((e) => live && setState({ data: null, error: errorText(e), loading: false })); return () => { live = false; }; }, [path, key, retry]);
  return { ...state, retry: () => setRetry((x) => x + 1) };
}
// Loading keeps the card grid's footprint (no layout jump); errors are readable and retryable.
function LoadState({ state, grid = false }) {
  if (state.error) return <ErrorState onRetry={state.retry}>{state.error}</ErrorState>;
  if (!(state.loading && !state.data)) return null;
  return grid ? <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3" aria-busy="true">{[0, 1, 2].map((i) => <CardSkeleton key={i} rows={4} />)}</div> : <PageLoader />;
}
const Progress = ({ done, total, label }) => <ProgressBar value={done} max={total} label={label} className="!h-2" />;

// Lessons and practice look different on purpose: a learner should know what they are about to open.
// `context` adds "discipline · topic" for flat results; inside the discipline index that context is the heading above.
function ObjectCard({ item, context = true }) {
  const practice = item.kind === 'practice';
  const where = [item.domainTitle || disciplineTitle(item), item.modality].filter(Boolean).join(' · ');
  return <Link to={item.href || objectHref(item.slug)} className={`${practice ? 'card-practice' : 'card-link'} group flex h-full min-w-0 flex-col gap-1.5 p-4 hover:border-brand`}>
    <span className="meta font-semibold">{practice ? `Latihan · ${item.cases} soal` : context && where ? where : 'Materi'}</span>
    <h3 className="card-title">{item.title}</h3>
    {item.summary && <p className="line-clamp-3 text-sm leading-relaxed text-ink-muted">{item.summary}</p>}
    <span className="mt-auto flex items-center justify-between pt-2 text-sm font-semibold text-brand"><span>{practice ? 'Mulai latihan' : 'Mulai belajar'}</span><ArrowRight size={16} aria-hidden className="transition-transform group-hover:translate-x-0.5" /></span>
  </Link>;
}
const STATUS = { new: ['Belum mulai', 'Mulai', 'chip'], active: ['Sedang berjalan', 'Lanjutkan', 'chip chip-brand'], done: ['Selesai', 'Lihat jalur', 'chip chip-brand'] };
function PathwayCard({ item }) {
  const [label, cta, chip] = STATUS[item.status] || STATUS.new;
  return <Link to={`/lab/jalur/${item.slug}`} className="card-link group flex h-full min-w-0 flex-col gap-2 p-4">
    <span className="flex items-center justify-between gap-2"><span className={chip}>{label}</span><span className="meta">{item.total} langkah</span></span>
    <h2 className="card-title">{item.title}</h2><p className="line-clamp-3 text-sm leading-relaxed text-ink-muted">{item.summary}</p>
    {item.status === 'active' && <Progress done={item.done} total={item.total} label="Progres jalur" />}
    <span className="mt-auto flex items-center justify-between pt-2 text-sm font-semibold text-brand"><span>{cta}</span><ArrowRight size={16} aria-hidden className="transition-transform group-hover:translate-x-0.5" /></span>
  </Link>;
}

// The academic map for both modes: discipline → topic → cards, in the canonical order.
function DisciplineIndex({ items, unit, showSoon }) {
  const { groups, soon } = groupByDiscipline(items);
  const jump = items.length > 8 && groups.length > 2;
  return <div className="space-y-7">
    {jump && <nav aria-label="Lompat ke bidang" className="flex flex-wrap gap-2">{groups.map((g) => <a key={g.key} href={`#lab-${g.key}`} className="chip chip-brand min-h-9 px-3 text-[13px] hover:bg-brand hover:text-white">{g.title} · {g.count}</a>)}</nav>}
    {groups.map((g) => <section key={g.key} id={`lab-${g.key}`} aria-labelledby={`lab-${g.key}-h`} className="scroll-mt-24 border-t border-line pt-5 lg:grid lg:grid-cols-[200px_minmax(0,1fr)] lg:gap-8">
      <div className="mb-3 flex items-baseline justify-between gap-3 lg:mb-0 lg:block lg:space-y-1">
        <h2 id={`lab-${g.key}-h`} className="section-title">{g.title}</h2><p className="meta">{g.count} {unit}</p>
      </div>
      <div className="min-w-0 space-y-5">{g.topics.map((t) => <div key={t.title || 'umum'} className="space-y-2">
        {t.title && <h3 className="text-[15px] font-semibold text-ink-muted">{t.title}</h3>}
        <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-3">{t.items.map((item) => (item.type === 'pathway' ? <PathwayCard key={item.id} item={item} /> : <ObjectCard key={item.id} item={item} context={false} />))}</div>
      </div>)}</div>
    </section>)}
    {showSoon && soon.length > 0 && groups.length > 0 && <p className="card-quiet px-4 py-3 text-sm text-ink-muted"><span className="font-semibold text-ink">Segera hadir:</span> {soon.map((d) => d.title).join(' · ')}</p>}
  </div>;
}

const MODES = {
  guided: { label: 'Guided Learning', lead: 'Belajar dari awal: orientasi, contoh gambar berlabel, lalu latihan di akhir modul.', unit: 'materi', placeholder: 'Cari materi atau kata kunci' },
  explore: { label: 'Explore', lead: 'Langsung kerjakan latihan soal per bidang. Jawaban diperiksa setelah kamu menjawab.', unit: 'latihan', placeholder: 'Cari latihan atau kata kunci' },
};
export default function Lab() {
  const [params, setParams] = useSearchParams(); const { isAdmin } = useAuth();
  const q = params.get('q') || ''; const domain = normalizeDiscipline(params.get('domain') || ''); const page = Math.max(1, Number(params.get('page')) || 1);
  // Guided Learning (belajar dari awal) is the default entry; Explore is for going straight to practice.
  const mode = params.get('mode') === 'explore' ? 'explore' : 'guided';
  const [search, setSearch] = useState(q); useEffect(() => setSearch(q), [q]);
  const overview = useLab('lab/overview'); const next = overview.data?.continue;
  const catalog = useLab('lab/catalog');
  // Published authored modules replace their legacy dataset packs; the server drops those packs via `replaced`.
  const replaced = publishedReplacements(catalog.data).join(',');
  const objects = useLab('lab/objects', { q, domain, page, replaced });
  // Pathways are few (one per content pack), so Guided always reads their first page.
  const pathways = useLab(mode === 'guided' ? 'lab/pathways' : null);
  const { learn, practice } = labSections(objects.data?.items || [], catalog.data, { q, domain, page });
  const items = mode === 'guided' ? [...learn, ...guidedPathways(pathways.data?.items || [], catalog.data, { q, domain })] : practice;
  const ready = !!objects.data || !!catalog.data;
  const hasMore = objects.data?.hasMore;
  const change = (patch) => setParams({ ...Object.fromEntries(params), page: '1', ...patch });
  const filtered = !!(q || domain);
  const domainName = authoredRootOptions().find((o) => o.key === domain)?.title || '';
  const clear = () => setParams(mode === 'explore' ? { mode } : {});
  const m = MODES[mode];
  return <div className={PAGE}>
    <PageHead eyebrow={<span className="inline-flex items-center gap-1.5"><FlaskConical size={15} aria-hidden /> MEDCOEL Lab</span>} title="Belajar lewat gambar dan kasus"
      actions={isAdmin && <Link className="btn btn-secondary btn-sm" to="/admin/lab">Kelola Lab</Link>}>{m.lead}</PageHead>
    {next && <section className="card-resume flex items-center justify-between gap-3 p-4" aria-label="Lanjutkan belajar">
      <div className="min-w-0 flex-1 space-y-1.5"><p className="eyebrow">Lanjutkan belajar</p><p className="card-title truncate">{next.pathway.title}</p><Progress done={next.completed.length} total={next.total} label="Progres jalur" /><p className="meta">{next.completed.length} dari {next.total} selesai</p></div>
      <Link className="btn btn-primary shrink-0" to={objectHref(next.resume, next.pathway.slug)}>Lanjutkan <ArrowRight size={16} aria-hidden /></Link>
    </section>}
    <Segmented className="sm:max-w-sm" label="Cara belajar Lab" value={mode} onChange={(k) => setParams(k === 'explore' ? { mode: k } : {})} items={[{ value: 'guided', label: MODES.guided.label }, { value: 'explore', label: MODES.explore.label }]} />
    <form role="search" className="flex flex-col gap-2 sm:flex-row" onSubmit={(e) => { e.preventDefault(); change({ q: search }); }}>
      <label className="relative min-w-0 flex-1"><span className="sr-only">{m.placeholder}</span><Search className="pointer-events-none absolute left-3.5 top-1/2 -translate-y-1/2 text-ink-faint" size={18} aria-hidden /><input className="input pl-10" type="search" value={search} maxLength={120} onChange={(e) => setSearch(e.target.value)} placeholder={m.placeholder} /></label>
      <select aria-label="Bidang Lab" className="input sm:max-w-64" value={domain} onChange={(e) => change({ domain: e.target.value })}><option value="">Semua bidang</option>{authoredRootOptions().map((item) => <option key={item.key} value={item.key}>{item.title}</option>)}</select>
      <button className="btn btn-primary">Cari</button>
    </form>
    {filtered && <p className="flex flex-wrap items-center gap-2 text-sm text-ink-muted" aria-live="polite">Menampilkan hasil{q && <> untuk <b className="text-ink">“{q}”</b></>}{domain && <> di <b className="text-ink">{domainName || 'bidang ini'}</b></>}
      <button type="button" className="chip chip-brand min-h-8 gap-1 px-3" onClick={clear}><X size={13} aria-hidden /> Tampilkan semua</button></p>}
    <LoadState state={objects} grid />
    {pathways.error && <ErrorState onRetry={pathways.retry}>{pathways.error}</ErrorState>}
    {ready && <>
      {items.length > 0 && <DisciplineIndex items={items} unit={m.unit} showSoon={!filtered} />}
      {!items.length && !objects.loading && !pathways.loading && <EmptyState icon={FlaskConical} title={domain && !q ? 'Materi bidang ini segera hadir' : filtered ? 'Belum ada yang cocok' : mode === 'explore' ? 'Belum ada latihan soal' : 'Konten Lab sedang disiapkan'}
        action={filtered ? <button type="button" className="btn btn-secondary" onClick={clear}>Tampilkan semua</button> : isAdmin ? <Link className="btn btn-secondary" to="/admin/lab">Tambah konten di Kelola Lab</Link> : null}>
        {filtered ? 'Coba kata kunci yang lebih umum, atau pilih semua bidang.' : 'Konten akan muncul setelah diperiksa dan diterbitkan oleh admin.'}
      </EmptyState>}
      {(page > 1 || hasMore) && <div className="flex items-center justify-center gap-3"><button className="btn btn-secondary" disabled={page <= 1} onClick={() => change({ page: String(page - 1) })}>Sebelumnya</button><span className="text-sm text-ink-muted">Halaman {page}</span><button className="btn btn-secondary" disabled={!hasMore} onClick={() => change({ page: String(page + 1) })}>Berikutnya</button></div>}
    </>}
  </div>;
}

// Guided Learning as a journey: the recommended step is dominant, finished steps are quiet, nothing is locked.
export function LabPathway() {
  const { slug } = useParams(); const state = useLab(`lab/pathways/${encodeURIComponent(slug)}`); const d = state.data; const [busy, setBusy] = useState(false);
  const done = d?.progress?.completed || []; const st = d ? pathwayState(d.steps, done, d.progress?.lastObject) : null;
  async function restart() { setBusy(true); await markProgress(slug, undefined, undefined, true); setBusy(false); state.retry(); }
  return <div className={PAGE}>
    <Link to="/lab" className="inline-flex min-h-9 items-center text-sm font-semibold text-brand">← Guided Learning</Link>
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
  const context = <LabContextBar pathway={route?.pathway} ctx={route?.ctx} domain={disciplineTitle(d)} onNext={onNext} showNext={!practicing} practice={practiceFirst} />;
  const pathNav = route && <LabPathNavigation pathway={route.pathway} ctx={route.ctx} completed={done} onToggleComplete={() => complete(!done)} onNext={onNext} />;
  if (practicing) {
    // A practice object opens straight on case 1; leaving it returns to the pathway (there is no lesson page to go back to).
    const exit = () => (practiceFirst ? nav(route ? `/lab/jalur/${route.pathway.slug}` : '/lab?mode=explore') : setPracticing(false));
    return <div className="space-y-3">{context}<LabPracticeSession questions={d.questions} onExit={exit} exitLabel={practiceFirst ? (route ? 'Kembali ke jalur' : 'Kembali ke Explore') : 'Kembali ke materi'} about={practiceFirst ? <AboutPractice d={d} /> : null} onFinish={() => { if (!done) complete(true); }}>{pathNav}</LabPracticeSession></div>;
  }
  const lessonCtx = { modality: d.modality, startPractice: () => setPracticing(true), legacyPractice, practiceError, starting };
  return <div className="space-y-4">
    {context}
    <header><p className="mb-1 text-xs font-bold uppercase tracking-wide text-brand">{disciplineTitle(d)}{d.modality ? ` · ${d.modality}` : ''}</p><h1 className="text-2xl font-bold leading-tight md:text-3xl">{d.title}</h1><p className="mt-2 text-ink-muted">{d.summary}</p></header>
    {d.demo && <Alert kind="warn">Contoh sintetis untuk mencoba fitur. Bukan data pasien atau materi diagnosis tervalidasi.</Alert>}
    <LabLesson d={d} ctx={lessonCtx} />
    {pathNav}
    {d.related.length > 0 && <section className="space-y-3"><h2 className="text-xl font-semibold">Topik terkait</h2><div className="grid gap-3 sm:grid-cols-2">{d.related.map((r) => <ObjectCard item={r} key={r.id} />)}</div></section>}
  </div>;
}
