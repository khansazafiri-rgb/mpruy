import { useEffect, useState } from 'react';
import { Link, useNavigate, useParams, useSearchParams } from 'react-router-dom';
import { ArrowLeft, ArrowRight, FlaskConical, Search } from 'lucide-react';
import { api, errorText } from '@/lib/api';
import { Alert, PageLoader } from '@/components/ui';
import { useAuth } from '@/context/AuthContext';
import LabLesson from '@/features/lab/LabLesson';
import LabPracticeSession from '@/features/lab/LabPracticeSession';
import { LabBreadcrumbs, LabPathNavigation } from '@/features/lab/LabNav';
import { crumbs, objectHref, pathNeighbors } from '@/features/lab/labUtils';

const DOMAINS = { imaging: 'Medical Imaging', clinical_pathology: 'Patologi Klinik', microbiology: 'Mikrobiologi', parasitology: 'Parasitologi', histology: 'Histologi & Histopatologi' };
function useLab(path, query) {
  const [state, setState] = useState({ data: null, error: '', loading: true });
  const [retry, setRetry] = useState(0); const key = JSON.stringify(query || {});
  useEffect(() => { if (!path) { setState({ data: null, error: '', loading: false }); return undefined; } let live = true; setState({ data: null, error: '', loading: true }); api(path, { query: JSON.parse(key) }).then((data) => live && setState({ data, error: '', loading: false })).catch((e) => live && setState({ data: null, error: errorText(e), loading: false })); return () => { live = false; }; }, [path, key, retry]);
  return { ...state, retry: () => setRetry((x) => x + 1) };
}
function LoadState({ state }) { return state.loading ? <PageLoader /> : state.error ? <div className="space-y-3"><Alert>{state.error}</Alert><button className="btn btn-secondary" onClick={state.retry}>Coba lagi</button></div> : null; }
function ObjectCard({ item }) {
  return <Link to={`/lab/objek/${item.slug}`} className="card group flex h-full flex-col gap-3 p-5 transition hover:border-brand focus:outline-brand"><div className="flex flex-wrap gap-2 text-xs font-semibold text-brand"><span>{DOMAINS[item.domain]}</span>{item.demo && <span className="rounded bg-gold-soft px-2 text-ink">Demo sintetis</span>}</div><h3 className="text-xl font-semibold">{item.title}</h3><p className="flex-1 text-sm leading-relaxed text-ink-muted">{item.summary}</p><div className="flex items-center justify-between text-sm font-semibold text-brand"><span>{item.modality || 'Buka topik'}</span><ArrowRight size={18} /></div></Link>;
}
export default function Lab() {
  const [params, setParams] = useSearchParams(); const { isAdmin } = useAuth();
  const q = params.get('q') || ''; const domain = params.get('domain') || ''; const mode = params.get('mode') || 'explore'; const page = Math.max(1, Number(params.get('page')) || 1);
  const [search, setSearch] = useState(q); useEffect(() => setSearch(q), [q]);
  const state = useLab(mode === 'guided' ? 'lab/pathways' : 'lab/objects', mode === 'guided' ? { page } : { q, domain, page });
  const change = (patch) => setParams({ ...Object.fromEntries(params), page: '1', ...patch });
  return <div className="space-y-7">
    <section className="rounded-3xl bg-brand-dark p-6 text-white md:p-10"><div className="mb-4 flex items-center gap-2 text-sm font-semibold text-white/80"><FlaskConical size={20} /> MEDCOEL LAB</div><h1 className="max-w-2xl text-3xl font-bold !text-white md:text-4xl">Amati. Hubungkan. Pahami.</h1><p className="mt-4 max-w-2xl leading-relaxed text-white/85">Jelajahi gambar dan hasil pemeriksaan, atau ikuti jalur belajar yang direkomendasikan. Semua topik dapat dibuka langsung.</p></section>
    <div className="flex flex-wrap items-center justify-between gap-3"><nav aria-label="Cara belajar Lab" className="flex gap-2"><button className={`btn ${mode !== 'guided' ? 'btn-primary' : 'btn-secondary'}`} onClick={() => change({ mode: 'explore' })} aria-pressed={mode !== 'guided'}>Explore</button><button className={`btn ${mode === 'guided' ? 'btn-primary' : 'btn-secondary'}`} onClick={() => change({ mode: 'guided' })} aria-pressed={mode === 'guided'}>Guided Learning</button></nav>{isAdmin && <Link className="text-sm font-semibold text-brand underline" to="/admin/lab">Kelola konten Lab</Link>}</div>
    {mode !== 'guided' && <form className="flex flex-col gap-3 sm:flex-row" onSubmit={(e) => { e.preventDefault(); change({ q: search }); }}><label className="relative flex-1"><span className="sr-only">Cari topik, pemeriksaan, atau kata kunci</span><Search className="absolute left-3 top-3 text-ink-muted" size={18} /><input className="input pl-10" value={search} maxLength={120} onChange={(e) => setSearch(e.target.value)} placeholder="Cari topik, pemeriksaan, atau kata kunci…" /></label><select aria-label="Domain Lab" className="input sm:max-w-60" value={domain} onChange={(e) => change({ domain: e.target.value })}><option value="">Semua domain</option>{Object.entries(DOMAINS).map(([key, title]) => <option key={key} value={key}>{title}</option>)}</select><button className="btn btn-primary">Cari</button></form>}
    <LoadState state={state} />
    {state.data && <><div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">{state.data.items.map((item) => mode === 'guided' ? <Link key={item.id} to={`/lab/jalur/${item.slug}`} className="card space-y-3 p-5 hover:border-brand"><span className="text-xs font-semibold uppercase text-brand">Jalur rekomendasi · bebas melompat</span><h2 className="text-xl font-semibold">{item.title}</h2><p className="text-sm text-ink-muted">{item.summary}</p></Link> : <ObjectCard key={item.id} item={item} />)}</div>{!state.data.items.length && <div className="card p-8 text-center"><h2 className="font-semibold">{q || domain ? 'Belum ada topik yang cocok' : 'Konten Lab sedang disiapkan'}</h2><p className="mt-2 text-sm text-ink-muted">{q || domain ? 'Coba kata kunci lain atau pilih semua domain.' : 'Topik akan muncul setelah diperiksa dan diterbitkan oleh admin.'}</p></div>}{<div className="flex items-center justify-center gap-4"><button className="btn btn-secondary" disabled={page <= 1} onClick={() => change({ page: String(page - 1) })}>Sebelumnya</button><span>Halaman {page}</span><button className="btn btn-secondary" disabled={!state.data.hasMore} onClick={() => change({ page: String(page + 1) })}>Berikutnya</button></div>}</>}
  </div>;
}
export function LabPathway() {
  const { slug } = useParams(); const state = useLab(`lab/pathways/${encodeURIComponent(slug)}`); const d = state.data;
  return <div className="space-y-5">
    <LabBreadcrumbs items={[{ label: 'Lab', to: '/lab' }, { label: 'Guided Learning', to: '/lab?mode=guided' }, { label: d?.title || 'Jalur' }]} />
    <LoadState state={state} />
    {d && <>
      <header className="space-y-2"><h1 className="text-3xl font-bold">{d.title}</h1><p className="text-ink-muted">{d.summary}</p><p className="text-sm font-semibold text-brand">{d.steps.length} langkah · urutan disarankan, tetap bebas melompat</p></header>
      <ol className="space-y-3">{d.steps.map((s, i) => <li key={s.id}><Link className="card flex items-center gap-4 p-5 hover:border-brand focus:outline-brand" to={objectHref(s.slug, slug)}>
        <span className="grid h-10 w-10 shrink-0 place-items-center rounded-full bg-brand-soft font-bold text-brand" aria-hidden>{i + 1}</span>
        <span className="min-w-0 flex-1"><span className="block text-xs font-semibold uppercase text-ink-muted">Langkah {i + 1} dari {d.steps.length}{s.modality ? ` · ${s.modality}` : ''}</span><span className="block font-semibold">{s.title}</span>{s.summary && <span className="mt-1 block text-sm text-ink-muted">{s.summary}</span>}</span>
        <ArrowRight size={18} aria-hidden />
      </Link></li>)}</ol>
      {d.steps.length > 0 && <Link to={objectHref(d.steps[0].slug, slug)} className="btn btn-primary">Mulai dari langkah 1</Link>}
      {!d.steps.length && <p>Langkah pada jalur ini sedang diperbarui.</p>}
    </>}
  </div>;
}
export function LabObject() {
  const { slug } = useParams(); const [params] = useSearchParams(); const pathSlug = params.get('jalur') || '';
  const state = useLab(`lab/objects/${encodeURIComponent(slug)}`); const pathState = useLab(pathSlug ? `lab/pathways/${encodeURIComponent(pathSlug)}` : null);
  const pathway = pathState.data; const ctx = pathway ? pathNeighbors(pathway.steps, slug) : null;
  // Konteks jalur dipertahankan hanya bila materi memang ada di jalur itu; kalau tidak, dianggap dibuka dari Explore.
  const route = ctx ? { pathway: { slug: pathSlug, title: pathway.title }, ctx } : null;
  return <div className="space-y-6"><LoadState state={state} />{state.data && (pathSlug && pathState.loading ? <PageLoader /> : <LabObjectView key={state.data.id} d={state.data} route={route} />)}</div>;
}
function LabObjectView({ d, route }) {
  const nav = useNavigate(); const [practiceError, setPracticeError] = useState(''); const [starting, setStarting] = useState(false); const [practicing, setPracticing] = useState(false);
  async function legacyPractice(id) { setStarting(true); setPracticeError(''); try { const r = await api(`lab/objects/${d.id}/practice`, { method: 'POST', body: { question: id } }); nav(`/kerjakan/${r.id}`); } catch (e) { setPracticeError(errorText(e)); } finally { setStarting(false); } }
  const items = crumbs({ title: d.title, domain: d.domain, domainTitle: DOMAINS[d.domain], modality: d.modality, pathway: route?.pathway });
  const back = route ? { to: `/lab/jalur/${route.pathway.slug}`, label: route.pathway.title } : { to: '/lab', label: 'Explore Lab' };
  const pathNav = route && <LabPathNavigation pathway={route.pathway} ctx={route.ctx} />;
  const header = <><div className="flex flex-wrap items-center justify-between gap-2"><Link className="inline-flex items-center gap-1 text-brand underline" to={back.to}><ArrowLeft size={16} aria-hidden /> {back.label}</Link></div><LabBreadcrumbs items={items} /></>;
  if (practicing) return <div className="space-y-4">{header}<h1 className="text-2xl font-bold">{d.title}</h1><LabPracticeSession questions={d.questions} onExit={() => setPracticing(false)}>{pathNav}</LabPracticeSession></div>;
  const lessonCtx = { modality: d.modality, startPractice: () => { setPracticing(true); }, legacyPractice, practiceError, starting };
  return <div className="space-y-6">
    {header}
    <header><p className="mb-2 text-sm font-semibold text-brand">{DOMAINS[d.domain]}{d.modality ? ` · ${d.modality}` : ''}</p><h1 className="text-3xl font-bold">{d.title}</h1><p className="mt-3 text-ink-muted">{d.summary}</p><div className="mt-3 flex flex-wrap gap-2">{d.tags.map((tag) => <Link key={tag} to={`/lab?q=${encodeURIComponent(tag)}`} className="chip bg-brand-soft text-brand">{tag}</Link>)}</div></header>
    {d.demo && <Alert kind="warn">Contoh sintetis untuk mencoba fitur. Bukan data pasien atau materi diagnosis tervalidasi.</Alert>}
    <LabLesson d={d} ctx={lessonCtx} />
    {pathNav}
    {d.related.length > 0 && <section className="space-y-4"><h2 className="text-2xl font-semibold">Topik terkait</h2><div className="grid gap-4 sm:grid-cols-2">{d.related.map((r) => <ObjectCard item={r} key={r.id} />)}</div></section>}
  </div>;
}
