import { ArrowLeft, BookOpen, BookOpenCheck, CheckCircle2, ChevronDown, ChevronRight, Clock, Layers, MessageCircle, Minus, Package, PlayCircle, Plus, School, SlidersHorizontal } from 'lucide-react';
import { useEffect, useId, useMemo, useState } from 'react';
import { Link, useNavigate, useParams, useSearchParams } from 'react-router-dom';
import MascotTip from '@/components/MascotTip';
import Ecg from '@/components/Ecg';
import Illustration from '@/components/Illustration';
import { Alert, EmptyState, Modal, PageLoader, ProgressBar } from '@/components/ui';
import { api } from '@/lib/api';
import { DIFF, DIFF_CLASS } from '@/lib/labels';
import { toneClass } from '@/lib/tone';
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

// Satu BAB: nomor, judul, dan apa saja yang tersedia (materi, soal). Mengetuknya membuka pilihan belajar.
function ChapterRow({ c, n, onPick, withMateri }) {
  const done = c.total > 0 && c.answered >= c.total;
  const action = withMateri ? 'Buka' : done ? 'Ulangi' : c.answered ? 'Lanjut' : 'Latihan';
  return (
    <li>
      <button type="button" onClick={() => onPick(c)} className="chapter-row group">
        <span className="chapter-num" aria-hidden>{String(n).padStart(2, '0')}</span>
        <span className="min-w-0 flex-1">
          <span className="block font-display text-[16px] font-semibold leading-snug text-ink group-hover:text-brand">{c.title}</span>
          <span className="chapter-meta">
            {withMateri && (c.hasNotes ? <span className="chapter-tag is-materi"><BookOpen size={12} aria-hidden /> Materi</span> : <span className="chapter-tag is-off">Materi segera hadir</span>)}
            {withMateri && c.hasCards && <span className="chapter-tag is-cards"><Layers size={12} aria-hidden /> Flashcard</span>}
            {c.total > 0
              ? <span className="chapter-tag"><b>{c.answered}</b>/{c.total} soal{c.wrong ? <> · <span className="text-coral">{c.wrong} pernah salah</span></> : null}</span>
              : withMateri && <span className="chapter-tag is-off">Soal segera hadir</span>}
          </span>
          {c.total > 0 && <ProgressBar value={c.answered} max={c.total} className="mt-2.5 !h-2" color={done ? 'bg-brand' : 'bg-gold'} label={`Progres ${c.title}`} />}
        </span>
        <span className="chapter-go">{withMateri ? <ChevronRight size={16} aria-hidden /> : done ? <CheckCircle2 size={16} aria-hidden /> : <PlayCircle size={16} aria-hidden />}<span>{action}</span></span>
      </button>
    </li>
  );
}

function ChoiceCard({ step, icon: Icon, title, text, meta, disabled, onClick }) {
  return (
    <button type="button" onClick={onClick} disabled={disabled} className="choice-card card-chunky group flex flex-col items-start gap-1.5 p-4 text-left">
      <span className="choice-top"><span className="choice-icon"><Icon size={22} aria-hidden /></span><span className="choice-step" aria-hidden>Langkah {step}</span></span>
      <span className="font-display text-lg font-bold text-ink group-enabled:group-hover:text-brand">{title}</span>
      <span className="text-[14px] leading-relaxed text-ink-muted">{text}</span>
      <span className="mt-auto pt-1 text-[13px] font-semibold text-[rgb(var(--tone-fg,var(--brand)))]">{meta}</span>
    </button>
  );
}

// Setelah memilih BAB: tiga langkah belajar, berurutan: materi -> flashcard -> latihan soal.
function ChapterChoice({ subject, chapter, onPractice, onClose }) {
  const nav = useNavigate();
  const hasQ = chapter.total > 0;
  const base = `/mata-kuliah/${subject.slug}`;
  return (
    <Modal open title={chapter.title} onClose={onClose}>
      <div className="space-y-4">
        <MascotTip mascot="kori" mood="wave" size={56}>Urutan yang enak: baca materi, hafalkan lewat flashcard, lalu uji dengan latihan soal. Boleh juga langsung loncat ke mana saja.</MascotTip>
        <div className="grid gap-3 sm:grid-cols-3">
          <ChoiceCard step={1} icon={BookOpen} title="Belajar materi" text="Catatan bergambar per bagian, lengkap dengan poin high-yield." meta={chapter.hasNotes ? 'Siap dibaca' : 'Segera hadir'} disabled={!chapter.hasNotes} onClick={() => nav(`${base}/materi/${chapter.id}`)} />
          <ChoiceCard step={2} icon={Layers} title="Flashcard" text="Kartu hafalan istilah dan poin penting. Balik kartu, tandai hafal." meta={chapter.hasCards ? 'Siap dipakai' : 'Segera hadir'} disabled={!chapter.hasCards} onClick={() => nav(`${base}/flashcard/${chapter.id}`)} />
          <ChoiceCard step={3} icon={PlayCircle} title="Latihan soal" text="Atur jumlah soal dan caranya. Pembahasan muncul per soal." meta={hasQ ? `${chapter.answered}/${chapter.total} soal dikerjakan` : 'Soal segera hadir'} disabled={!hasQ} onClick={() => { onClose(); onPractice(chapter); }} />
        </div>
      </div>
    </Modal>
  );
}

export default function SubjectDetail() {
  const { slug } = useParams();
  const [searchParams, setSearchParams] = useSearchParams();
  const campusOnly = searchParams.get('kampus') === '1';
  const { data, error, loading } = useApi(`subjects/${slug}${campusOnly ? '?campusOnly=1' : ''}`);
  const [practice, setPractice] = useState(null);
  const [choice, setChoice] = useState(null);
  const [sim, setSim] = useState(false);
  const [pkg, setPkg] = useState(null);
  const chapters = useMemo(() => data?.chapters || [], [data]);
  useEffect(() => { setPractice(null); setChoice(null); setSim(false); setPkg(null); }, [slug, campusOnly]);
  // Dari halaman catatan: "Latihan soal BAB ini" langsung membuka pengaturan latihan BAB tersebut.
  const babParam = searchParams.get('bab');
  useEffect(() => {
    if (!babParam || !chapters.length) return;
    const c = chapters.find((x) => x.id === babParam && x.total > 0);
    if (c) setPractice(c);
  }, [babParam, chapters]);

  if (loading) return <PageLoader />;
  if (error) return <Alert>{error.message}</Alert>;
  const s = data.subject;
  const numbered = chapters.map((c, i) => ({ ...c, n: i + 1 }));
  const withQ = numbered.filter((c) => c.total > 0);
  const total = withQ.reduce((a, c) => a + c.total, 0);
  const answered = withQ.reduce((a, c) => a + c.answered, 0);
  const pct = total ? Math.round((answered / total) * 100) : 0;
  const noted = numbered.filter((c) => c.hasNotes);
  // Materi hanya ada untuk bank soal umum (bukan "Soal kampusmu"). Bila belum ada satu pun catatan,
  // BAB langsung membuka pengaturan latihan seperti sebelumnya.
  const withMateri = !campusOnly && noted.length > 0;
  // BAB yang sudah bisa dibuka (punya materi atau soal) di daftar utama; sisanya "segera hadir".
  const ready = numbered.filter((c) => c.total > 0 || (withMateri && (c.hasNotes || c.hasCards)));
  const soon = numbered.filter((c) => !ready.includes(c));
  const pick = (c) => (withMateri ? setChoice(c) : c.total > 0 && setPractice(c));

  return (
    <div className={`space-y-10 ${toneClass(s.illustrationKey || s.slug)}`}>
      <Link to="/mata-kuliah" className="inline-flex items-center gap-1.5 text-sm font-semibold text-ink-muted hover:text-brand"><ArrowLeft size={16} /> Semua mata kuliah</Link>

      <section className="sd-hero tone-surface tex-halftone">
        <Ecg className="sd-ecg" />
        <div className="relative grid items-center gap-8 md:grid-cols-[minmax(0,1fr)_auto]">
          <div className="min-w-0">
            <div className="flex flex-wrap items-center gap-2">
              <span className="tag-label sd-tag">{campusOnly ? <><School size={14} aria-hidden /> Soal kampusmu</> : <><BookOpen size={14} aria-hidden /> Mata kuliah</>}</span>
              {s.studying && <span className="tag-label bg-gold text-forest">Sedang dipelajari</span>}
            </div>
            <h1 className="sd-title">{s.name}</h1>
            {campusOnly && <p className="text-[15px] font-bold text-[rgb(var(--tone-fg))]">{data.campusName || 'Kampusmu'}</p>}
            {s.description && <p className="mt-2 max-w-xl text-[17px] leading-relaxed text-ink/80">{s.description}</p>}

            <dl className="sd-stats">
              <div><dt>BAB</dt><dd>{chapters.length}</dd></div>
              {withMateri && <div><dt>Ada materi</dt><dd>{noted.length}</dd></div>}
              <div><dt>Siap dikerjakan</dt><dd>{withQ.length}</dd></div>
              <div><dt>Soal dikerjakan</dt><dd>{answered}<small>/{total}</small></dd></div>
            </dl>
            <div className="mt-4 max-w-md">
              <div className="mb-1.5 flex justify-between text-[13px] font-bold text-[rgb(var(--tone-fg))]"><span>Progresmu</span><span>{pct}%</span></div>
              <div className="sd-progress h-3 overflow-hidden rounded-full" role="progressbar" aria-valuenow={pct} aria-valuemin={0} aria-valuemax={100} aria-label={`Progres ${s.name}`}>
                <div className="h-full rounded-full bg-forest transition-all" style={{ width: `${pct}%` }} />
              </div>
            </div>

            <div className="mt-7 flex flex-wrap gap-3">
              <button type="button" className="btn btn-primary btn-press px-5 py-3 text-base" onClick={() => setSim(true)} disabled={!withQ.length}><Layers size={18} /> Coba Simulasi</button>
              {data.packages.length > 0 && <a href="#paket" className="btn sd-btn-alt px-5 py-3 text-base"><Package size={18} /> Paket soal</a>}
            </div>
          </div>

          {!campusOnly && (
            <div className="sd-art-wrap">
              <div className="sd-sticker sticker-tone">
                <span className="tape -top-3 left-1/2 -translate-x-1/2 -rotate-3" />
                <Illustration subject={s} className="h-full w-full" />
              </div>
              {withQ.length > 0 && <p className="hand sd-note">mulai dari BAB yang<br />sudah ada soalnya ya ↓</p>}
            </div>
          )}
        </div>
      </section>

      <section aria-labelledby="pilih-bab">
        <div className="mb-4 flex flex-wrap items-end justify-between gap-3">
          <div>
            <p className="eyebrow mb-2">{campusOnly ? 'Materi kampusmu' : 'Pilih BAB'}</p>
            <h2 id="pilih-bab" className="section-title">{campusOnly ? 'Materi yang sudah tersedia' : withMateri ? 'Mau mulai dari BAB mana?' : 'Pilih BAB, lalu atur sesi latihanmu'}</h2>
          </div>
          {chapters.length > 0 && <p className="text-sm text-ink-muted">{withMateri && <><b className="text-ink">{noted.length}</b> ada materi · </>}<b className="text-ink">{withQ.length}</b> ada soal · <b className="text-ink">{soon.length}</b> segera hadir</p>}
        </div>

        {withMateri && <MascotTip mascot="kori" mood="wave" size={56} className="mb-5 max-w-2xl">Ketuk salah satu BAB. Nanti kamu bisa memilih: baca materi, flashcard, atau langsung latihan soal.</MascotTip>}

        {!chapters.length ? (
          <EmptyState icon={BookOpenCheck} title="Belum ada BAB">Admin sedang menyiapkan soal untuk mata kuliah ini. Kamu juga bisa mengirim PDF soal lewat Chat Admin.</EmptyState>
        ) : (
          <div className="space-y-5">
            {ready.length > 0 ? (
              <ul className="chapter-sheet card-chunky">
                {ready.map((c) => <ChapterRow key={c.id} c={c} n={c.n} onPick={pick} withMateri={withMateri} />)}
              </ul>
            ) : (
              <div className="paper-sheet flex flex-col items-start gap-3 p-6 sm:flex-row sm:items-center">
                <MascotTip mascot="kori" mood="think" size={60} className="flex-1">Belum ada BAB yang punya soal di mata kuliah ini. Punya PDF soalnya? Kirim lewat Chat Admin, nanti diubah jadi latihan.</MascotTip>
                <Link to="/chat-admin" className="btn-secondary"><MessageCircle size={17} /> Kirim PDF soal</Link>
              </div>
            )}

            {soon.length > 0 && (
              <details className="soon-sheet" open={!ready.length}>
                <summary>
                  <span className="min-w-0 flex-1">
                    <span className="block font-display text-[16px] font-semibold text-ink">Segera hadir</span>
                    <span className="block text-[13px] text-ink-muted">{soon.length} BAB belum ada {withMateri ? 'materi maupun soalnya' : 'soalnya'}</span>
                  </span>
                  <ChevronDown className="soon-chevron text-ink-muted" size={20} aria-hidden />
                </summary>
                <ol className="soon-list">
                  {soon.map((c) => <li key={c.id}><span className="chapter-num is-quiet" aria-hidden>{String(c.n).padStart(2, '0')}</span><span className="min-w-0">{c.title}</span></li>)}
                </ol>
                <p className="soon-foot">Punya PDF soal untuk BAB ini? <Link to="/chat-admin" className="font-semibold text-brand underline-offset-2 hover:underline">Kirim lewat Chat Admin</Link></p>
              </details>
            )}
          </div>
        )}
      </section>

      {data.packages.length > 0 && (
        <section id="paket" aria-labelledby="paket-title">
          <p className="eyebrow mb-2">Sekali jalan, semua BAB</p>
          <h2 id="paket-title" className="section-title mb-4">Paket soal</h2>
          <div className="grid gap-4 md:grid-cols-3">
            {data.packages.map((p) => (
              <button key={p.id} type="button" onClick={() => setPkg(p)} className="package-card card-chunky group">
                <span className="package-icon"><Package size={22} aria-hidden /></span>
                <span className="mt-3 block font-display text-lg font-semibold text-ink group-hover:text-brand">{p.name}</span>
                <span className="mt-1 block text-sm text-ink-muted">{p.description || `${p.perChapter || 5} soal per BAB${p.total ? `, maks. ${p.total} soal` : ''}`}</span>
                <span className="mt-4 inline-flex items-center gap-1.5 text-sm font-semibold text-brand"><PlayCircle size={16} aria-hidden /> Mulai paket</span>
              </button>
            ))}
          </div>
        </section>
      )}

      {choice && <ChapterChoice subject={s} chapter={choice} onPractice={setPractice} onClose={() => setChoice(null)} />}
      {practice && <PracticeDialog chapter={practice} campusOnly={campusOnly} onClose={() => { setPractice(null); if (babParam) { const next = new URLSearchParams(searchParams); next.delete('bab'); setSearchParams(next, { replace: true }); } }} />}
      {sim && <SimulationDialog subject={s} campusOnly={campusOnly} chapters={withQ} types={data.simulationTypes || ['A', 'K']} onClose={() => setSim(false)} />}
      {pkg && <PackageDialog pkg={pkg} onClose={() => setPkg(null)} />}
    </div>
  );
}
