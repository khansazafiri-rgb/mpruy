import { ArrowLeft, BookOpen, BookOpenCheck, CheckCircle2, ChevronRight, Clock, Layers, Minus, Package, PlayCircle, Plus, SlidersHorizontal } from 'lucide-react';
import { useEffect, useId, useMemo, useState } from 'react';
import { Link, useNavigate, useParams, useSearchParams } from 'react-router-dom';
import Illustration from '@/components/Illustration';
import { Alert, Badge, EmptyState, Modal, PageLoader, ProgressBar } from '@/components/ui';
import { api } from '@/lib/api';
import { DIFF, DIFF_CLASS } from '@/lib/labels';
import { useApi } from '@/lib/useApi';

const DIFFS = ['easy', 'medium', 'hard'];

// Membagi n soal serata mungkin ke easy/medium/hard tanpa melebihi ketersediaan.
export function splitEven(n, avail) {
  const out = { easy: 0, medium: 0, hard: 0 };
  let left = n;
  let guard = 0;
  while (left > 0 && guard < 1000) {
    guard++;
    let moved = false;
    for (const d of DIFFS) {
      if (left <= 0) break;
      if (!avail || out[d] < (avail[d] || 0)) { out[d]++; left--; moved = true; }
    }
    if (!moved) break;
  }
  return out;
}

function ModeChoice({ value, onChange }) {
  const group = useId();
  const opts = [
    ['learning', 'Mode Learning', 'Pembahasan langsung per soal.', BookOpen],
    ['exam', 'Mode ujian', 'Pembahasan setelah sesi selesai.', Clock],
  ];
  return (
    <fieldset>
      <legend className="label">Cara mengerjakan</legend>
      <div className="grid gap-2 sm:grid-cols-2">
        {opts.map(([v, t, d, Icon]) => (
          <label key={v} className={`mode-choice cursor-pointer rounded-2xl border p-4 transition-colors ${value === v ? 'is-selected' : 'border-line hover:border-brand/50'}`}>
            <input type="radio" name={group} className="sr-only" checked={value === v} onChange={() => onChange(v)} />
            <span className="mode-choice-head"><Icon size={20} /><span className="text-sm font-semibold">{t}</span>{value === v && <CheckCircle2 size={17} />}</span>
            <span className="text-[13px] text-ink-muted">{d}</span>
          </label>
        ))}
      </div>
    </fieldset>
  );
}

function PracticeDialog({ chapter, campusOnly, onClose }) {
  const nav = useNavigate();
  const max = Math.min(100, chapter.total);
  const [count, setCount] = useState(Math.min(10, max));
  const [mode, setMode] = useState('learning');
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);
  const start = async () => {
    setBusy(true); setError('');
    try {
      const r = await api('attempts/practice', { method: 'POST', body: { chapter: chapter.id, count, mode, campusOnly } });
      nav(`/kerjakan/${r.attempt.id}`);
    } catch (e) { setError(e.message); setBusy(false); }
  };
  return (
    <Modal open title="Siapkan sesi belajarmu" onClose={onClose} footer={<>
      <button type="button" className="btn-ghost" onClick={onClose}>Batal</button>
      <button type="button" className="btn-primary" onClick={start} disabled={busy || count < 1}>{busy ? 'Menyiapkan...' : `Mulai ${count} soal`}</button>
    </>}>
      <div className="space-y-5">
        <div className="practice-banner"><span><BookOpenCheck size={22} /></span><div className="min-w-0"><p className="eyebrow mb-1">{campusOnly ? 'Soal kampusmu' : 'Latihan per BAB'}</p><p className="text-sm font-semibold">{chapter.title}</p><p className="mt-1 text-xs text-ink-muted">{chapter.total} soal tersedia untukmu</p></div></div>
        <div>
          <div className="count-controls"><label htmlFor="jml" className="label !mb-0">Jumlah soal</label><div className="count-stepper"><button type="button" aria-label="Kurangi jumlah soal" disabled={count <= 1} onClick={() => setCount((n) => Math.max(1, n - 1))}><Minus size={15} /></button><output htmlFor="jml">{count}</output><button type="button" aria-label="Tambah jumlah soal" disabled={count >= max} onClick={() => setCount((n) => Math.min(max, n + 1))}><Plus size={15} /></button></div></div>
          <input id="jml" type="range" min={1} max={max} value={count} onChange={(e) => setCount(Number(e.target.value))} className="w-full accent-[rgb(var(--brand))]" />
          <div className="flex justify-between text-xs text-ink-muted"><span>1 soal</span><span>{max} tersedia</span></div>
          <div className="count-presets">{[...new Set([5, 10, 20, max].filter((n) => n <= max))].sort((a, b) => a - b).map((n) => <button type="button" key={n} aria-pressed={count === n} onClick={() => setCount(n)}>{n} soal</button>)}</div><p className="hint mt-3">Soal baru didahulukan. Tipe dan kesulitan dibagi seimbang.</p>
        </div>
        <ModeChoice value={mode} onChange={setMode} />
        <Alert>{error}</Alert>
      </div>
    </Modal>
  );
}

function SimulationDialog({ subject, chapters, types, campusOnly, onClose }) {
  const nav = useNavigate();
  const [source, setSource] = useState('unseen');
  const [typeMode, setTypeMode] = useState(types.length > 1 ? 'mix' : types[0] || 'A');
  const [avail, setAvail] = useState(null);
  const [plan, setPlan] = useState({}); // chapterId -> { on, total, easy, medium, hard, custom }
  const [timer, setTimer] = useState(0);
  const [mode, setMode] = useState('exam');
  const [error, setError] = useState('');
  const [shortages, setShortages] = useState([]);
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    setAvail(null);
    api('simulation/availability', { query: { subject: subject.id, source, types: typeMode, campusOnly: campusOnly ? "1" : "" } })
      .then((d) => setAvail(d.chapters)).catch((e) => setError(e.message));
  }, [subject.id, source, typeMode, campusOnly]);

  const av = (id) => avail?.[id] || { easy: 0, medium: 0, hard: 0, total: 0 };

  // Ketersediaan berubah (sumber/tipe diganti): bagi ulang jumlah yang tidak diatur manual.
  useEffect(() => {
    if (!avail) return;
    setPlan((p) => {
      const next = {};
      Object.entries(p).forEach(([id, cur]) => {
        const a = avail[id] || { easy: 0, medium: 0, hard: 0, total: 0 };
        const c = { ...cur };
        if (!c.custom) { c.total = Math.min(c.total, a.total); Object.assign(c, splitEven(c.total, a)); }
        next[id] = c;
      });
      return next;
    });
  }, [avail]);
  const update = (id, patch) => setPlan((p) => {
    const cur = { on: false, total: 0, easy: 0, medium: 0, hard: 0, custom: false, ...(p[id] || {}), ...patch };
    if (!cur.custom) Object.assign(cur, splitEven(cur.total, av(id)));
    else cur.total = cur.easy + cur.medium + cur.hard;
    return { ...p, [id]: cur };
  });

  const chosen = chapters.filter((c) => plan[c.id]?.on && plan[c.id].total > 0);
  const total = chosen.reduce((a, c) => a + plan[c.id].total, 0);
  const problems = chosen.flatMap((c) => DIFFS.filter((d) => plan[c.id][d] > av(c.id)[d]).map((d) => `${c.title} (${DIFF[d]}): diminta ${plan[c.id][d]}, tersedia ${av(c.id)[d]}`));

  const start = async () => {
    setBusy(true); setError(''); setShortages([]);
    try {
      const r = await api('attempts/simulation', {
        method: 'POST',
        body: {
          subject: subject.id, source, types: typeMode, timerMinutes: timer, mode, campusOnly,
          chapters: chosen.map((c) => ({ chapter: c.id, easy: plan[c.id].easy, medium: plan[c.id].medium, hard: plan[c.id].hard })),
        },
      });
      nav(`/kerjakan/${r.attempt.id}`);
    } catch (e) {
      setError(e.message);
      setShortages(e.body?.data?.shortages || []);
      setBusy(false);
    }
  };

  const titleOf = (id) => chapters.find((c) => c.id === id)?.title || id;

  return (
    <Modal open size="xl" title={`Coba Simulasi: ${subject.name}`} onClose={onClose} footer={<>
      <span className="mr-auto self-center text-sm text-ink-muted">{chosen.length} BAB · <b className="text-ink">{total} soal</b></span>
      <button type="button" className="btn-ghost" onClick={onClose}>Batal</button>
      <button type="button" className="btn-primary" onClick={start} disabled={busy || !total || problems.length > 0}>{busy ? 'Menyiapkan...' : 'Mulai simulasi'}</button>
    </>}>
      <div className="space-y-5">
        <div className="grid gap-4 md:grid-cols-3">
          <div>
            <label className="label" htmlFor="src">Sumber soal</label>
            <select id="src" className="input" value={source} onChange={(e) => setSource(e.target.value)}>
              <option value="unseen">Belum pernah dikerjakan</option>
              <option value="wrong">Pernah dijawab salah</option>
              <option value="all">Semua soal (yang belum didahulukan)</option>
            </select>
          </div>
          <div>
            <label className="label" htmlFor="tp">Tipe soal</label>
            <select id="tp" className="input" value={typeMode} onChange={(e) => setTypeMode(e.target.value)}>
              {types.includes('A') && <option value="A">Tipe A saja</option>}
              {types.includes('K') && <option value="K">Tipe K saja</option>}
              {types.length > 1 && <option value="mix">Campuran seimbang</option>}
            </select>
          </div>
          <div>
            <label className="label" htmlFor="tm">Batas waktu (menit, 0 = tanpa batas)</label>
            <input id="tm" type="number" min={0} max={600} className="input" value={timer} onChange={(e) => setTimer(Math.max(0, Math.min(600, Number(e.target.value) || 0)))} />
          </div>
        </div>

        <div>
          <p className="label">BAB yang disimulasikan</p>
          {!avail ? <p className="text-sm text-ink-muted">Menghitung soal yang tersedia...</p> : (
            <div className="divide-y divide-line rounded-xl border border-line">
              {chapters.map((c) => {
                const a = av(c.id);
                const p = plan[c.id] || { on: false, total: 0, easy: 0, medium: 0, hard: 0, custom: false };
                return (
                  <div key={c.id} className="p-3">
                    <div className="flex flex-wrap items-center gap-3">
                      <label className="flex min-w-0 flex-1 cursor-pointer items-center gap-2">
                        <input type="checkbox" className="h-5 w-5 accent-[rgb(var(--brand))]" checked={p.on} disabled={!a.total} onChange={(e) => update(c.id, { on: e.target.checked, total: e.target.checked ? Math.min(a.total, p.total || 10) : p.total })} />
                        <span className="min-w-0">
                          <span className="block truncate font-semibold">{c.title}</span>
                          <span className="text-xs text-ink-muted">Tersedia: {a.easy} easy · {a.medium} medium · {a.hard} hard</span>
                        </span>
                      </label>
                      {p.on && !p.custom && (
                        <label className="flex items-center gap-2 text-sm">
                          Jumlah
                          <input type="number" min={0} max={a.total} className="input w-20 py-1.5" value={p.total} onChange={(e) => update(c.id, { total: Math.max(0, Math.min(a.total, Number(e.target.value) || 0)) })} aria-label={`Jumlah soal ${c.title}`} />
                        </label>
                      )}
                      {p.on && (
                        <button type="button" className="btn-ghost btn-sm" onClick={() => update(c.id, { custom: !p.custom })}>
                          <SlidersHorizontal size={15} /> {p.custom ? 'Bagi rata' : 'Atur komposisi'}
                        </button>
                      )}
                    </div>
                    {p.on && (
                      <div className="mt-2 flex flex-wrap gap-2 pl-7">
                        {DIFFS.map((d) => (
                          <label key={d} className={`flex items-center gap-1.5 rounded-lg px-2 py-1 text-sm ${DIFF_CLASS[d]}`}>
                            {DIFF[d]}
                            {p.custom ? (
                              <input type="number" min={0} max={a[d]} className="w-16 rounded-md border border-line bg-surface px-1.5 py-0.5 text-ink" value={p[d]} onChange={(e) => update(c.id, { [d]: Math.max(0, Number(e.target.value) || 0) })} aria-label={`${DIFF[d]} ${c.title}`} />
                            ) : <b>{p[d]}</b>}
                          </label>
                        ))}
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          )}
        </div>
        <ModeChoice value={mode} onChange={setMode} />
        {problems.length > 0 && (
          <Alert kind="warn">Soal yang tersedia kurang. Sesuaikan jumlahnya:<ul className="mt-1 list-disc pl-5">{problems.map((p) => <li key={p}>{p}</li>)}</ul></Alert>
        )}
        {error && (
          <Alert>{error}{shortages.length > 0 && <ul className="mt-1 list-disc pl-5">{shortages.map((s) => <li key={s.chapter + s.difficulty}>{titleOf(s.chapter)} ({DIFF[s.difficulty]}): tersedia {s.available}</li>)}</ul>}</Alert>
        )}
      </div>
    </Modal>
  );
}

function PackageDialog({ pkg, onClose }) {
  const nav = useNavigate();
  const [mode, setMode] = useState('exam');
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);
  const start = async () => {
    setBusy(true); setError('');
    try {
      const r = await api('attempts/package', { method: 'POST', body: { package: pkg.id, mode } });
      nav(`/kerjakan/${r.attempt.id}`, { state: { repeats: r.repeats } });
    } catch (e) { setError(e.message); setBusy(false); }
  };
  return (
    <Modal open title={pkg.name} onClose={onClose} footer={<>
      <button type="button" className="btn-ghost" onClick={onClose}>Batal</button>
      <button type="button" className="btn-primary" onClick={start} disabled={busy}>{busy ? 'Menyiapkan...' : 'Mulai paket'}</button>
    </>}>
      <div className="space-y-4">
        {pkg.description && <p className="text-ink-muted">{pkg.description}</p>}
        <p className="text-sm">Soal diambil dari semua BAB, {pkg.perChapter || 5} soal per BAB{pkg.total ? `, paling banyak ${pkg.total} soal` : ''}, dengan tipe dan tingkat kesulitan beragam. Soal yang belum pernah kamu kerjakan didahulukan.</p>
        {pkg.timerMinutes > 0 && <p className="flex items-center gap-1.5 text-sm"><Clock size={16} /> Batas waktu {pkg.timerMinutes} menit</p>}
        <ModeChoice value={mode} onChange={setMode} />
        <Alert>{error}</Alert>
      </div>
    </Modal>
  );
}

export default function SubjectDetail() {
  const { slug } = useParams();
  const [searchParams] = useSearchParams();
  const campusOnly = searchParams.get('kampus') === '1';
  const { data, error, loading } = useApi(`subjects/${slug}${campusOnly ? '?campusOnly=1' : ''}`);
  const [practice, setPractice] = useState(null);
  const [sim, setSim] = useState(false);
  const [pkg, setPkg] = useState(null);
  const chapters = useMemo(() => data?.chapters || [], [data]);
  useEffect(() => { setPractice(null); setSim(false); setPkg(null); }, [slug, campusOnly]);

  if (loading) return <PageLoader />;
  if (error) return <Alert>{error.message}</Alert>;
  const s = data.subject;
  const withQ = chapters.filter((c) => c.total > 0);

  return (
    <div className="space-y-6">
      <Link to="/mata-kuliah" className="inline-flex items-center gap-1 text-sm font-semibold text-ink-muted hover:text-brand"><ArrowLeft size={16} /> Semua mata kuliah</Link>
      <section className="subject-detail-hero card flex flex-col gap-6 overflow-hidden sm:flex-row">
        {!campusOnly && <div className="h-52 shrink-0 bg-page sm:h-auto sm:w-72"><Illustration subject={s} className="h-full w-full" /></div>}
        <div className={`flex min-w-0 flex-1 flex-col justify-center gap-2 p-6 sm:py-9 ${campusOnly ? '' : 'sm:pl-0'}`}>
          {s.studying && <Badge className="w-fit bg-gold-soft text-[#6b4f00]">Sedang dipelajari</Badge>}
          <p className="eyebrow mt-2">{campusOnly ? `Soal kampusmu · ${data.campusName || "Kampusmu"}` : "Mata kuliah"}</p><h1 className="page-title">{s.name}</h1>
          {s.description && <p className="text-ink-muted">{s.description}</p>}
          <div className="mt-2 flex flex-wrap gap-2">
            <button type="button" className="btn-primary" onClick={() => setSim(true)} disabled={!withQ.length}><Layers size={18} /> Coba Simulasi</button>
            {data.packages.length > 0 && <a href="#paket" className="btn-secondary"><Package size={18} /> Paket soal</a>}
          </div>
        </div>
      </section>

      <section>
        <h2 className="section-title mb-3">{campusOnly ? "Materi yang sudah tersedia" : "Latihan per topik"}</h2>
        {!chapters.length ? (
          <EmptyState icon={BookOpenCheck} title="Belum ada BAB">Admin sedang menyiapkan soal untuk mata kuliah ini. Kamu juga bisa mengirim PDF soal lewat Chat Admin.</EmptyState>
        ) : (
          <div className="grid gap-3 md:grid-cols-2">
            {chapters.map((c, index) => (
              <button key={c.id} type="button" disabled={!c.total} onClick={() => setPractice(c)} className="chapter-card card flex items-center gap-4 !rounded-2xl p-5 text-left transition-colors hover:border-brand disabled:cursor-not-allowed disabled:opacity-60">
                <span className="chapter-index" aria-hidden>{String(index + 1).padStart(2, "0")}</span><div className="min-w-0 flex-1">
                  <p className="font-display font-semibold">{c.title}</p>
                  <p className="text-xs text-ink-muted">{c.total ? `${c.answered}/${c.total} soal dikerjakan${c.wrong ? ` · ${c.wrong} pernah salah` : ''}` : 'Belum ada soal'}</p>
                  {c.total > 0 && <ProgressBar value={c.answered} max={c.total} className="mt-2" color="bg-progress" label={`Progres ${c.title}`} />}
                </div>
                <ChevronRight className="shrink-0 text-ink-muted" size={20} />
              </button>
            ))}
          </div>
        )}
      </section>

      {data.packages.length > 0 && (
        <section id="paket">
          <h2 className="section-title mb-3">Paket soal</h2>
          <div className="grid gap-3 md:grid-cols-3">
            {data.packages.map((p) => (
              <button key={p.id} type="button" onClick={() => setPkg(p)} className="card flex flex-col items-start gap-1 p-4 text-left hover:border-progress">
                <Package className="text-progress" size={24} />
                <p className="mt-1 font-display text-lg font-semibold">{p.name}</p>
                <p className="text-sm text-ink-muted">{p.description || `${p.perChapter || 5} soal per BAB${p.total ? `, maks. ${p.total} soal` : ''}`}</p>
                <span className="mt-2 inline-flex items-center gap-1 text-sm font-semibold text-progress"><PlayCircle size={16} /> Mulai</span>
              </button>
            ))}
          </div>
        </section>
      )}

      {practice && <PracticeDialog chapter={practice} campusOnly={campusOnly} onClose={() => setPractice(null)} />}
      {sim && <SimulationDialog subject={s} campusOnly={campusOnly} chapters={withQ} types={data.simulationTypes || ['A', 'K']} onClose={() => setSim(false)} />}
      {pkg && <PackageDialog pkg={pkg} onClose={() => setPkg(null)} />}
    </div>
  );
}
