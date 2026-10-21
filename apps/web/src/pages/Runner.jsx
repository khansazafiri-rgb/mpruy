// MENGERJAKAN SOAL
// - Mode Learning: cek jawaban per soal, kunci dan pembahasan langsung terbuka.
// - Mode ujian: jawaban tersimpan otomatis, pembahasan dibuka setelah selesai.
// Jawaban dikirim ke server satu per satu; kunci tidak pernah ada di browser
// sebelum waktunya.
import clsx from 'clsx';
import { ArrowLeft, ChevronLeft, ChevronRight, Clock, Grid3X3, RotateCcw, Send, Trophy } from 'lucide-react';
import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { Link, useLocation, useNavigate, useParams } from 'react-router-dom';
import QuestionView from '@/components/QuestionView';
import ReportDialog from '@/components/ReportDialog';
import { Alert, Badge, Modal, PageLoader, ProgressBar, Tabs } from '@/components/ui';
import Logo from '@/components/Logo';
import { api } from '@/lib/api';
import { DIFF, KIND, QTYPE, scoreText } from '@/lib/labels';
import { clock, duration, fmtDateTime } from '@/lib/time';

function answered(q, v) {
  if (v === undefined || v === null) return false;
  if (q.qtype === 'A' || q.qtype === 'K') return !!v;
  return Object.values(v || {}).some((x) => (Array.isArray(x) ? x.some((y) => String(y || '').trim()) : String(x || '').trim()));
}

export default function Runner() {
  const { id } = useParams();
  const loc = useLocation();
  const [data, setData] = useState(null);
  const [error, setError] = useState('');

  const load = useCallback(async () => {
    try { setData(await api(`attempts/${id}`)); } catch (e) { setError(e.message); }
  }, [id]);
  useEffect(() => { setData(null); load(); }, [load]);

  if (error) return <Frame><Alert>{error}</Alert><Link to="/beranda" className="btn-secondary mt-4">Kembali ke beranda</Link></Frame>;
  if (!data) return <Frame><PageLoader /></Frame>;
  if (data.attempt.status === 'finished') return <Frame title={data.attempt.title}><Result data={data} /></Frame>;
  return <Work data={data} setData={setData} repeats={loc.state?.repeats} />;
}

function Frame({ title, children, right }) {
  return (
    <div className="min-h-screen bg-page">
      <header className="sticky top-0 z-30 border-b border-line bg-surface/95 backdrop-blur">
        <div className="mx-auto flex h-14 max-w-5xl items-center gap-3 px-4">
          <Link to="/beranda" aria-label="Beranda"><Logo variant="mark" className="sm:hidden" /><Logo className="hidden sm:block" /></Link>
          {title && <p className="hidden truncate font-semibold text-ink-muted sm:block">{title}</p>}
          <div className="ml-auto flex items-center gap-2">{right}</div>
        </div>
      </header>
      <main className="mx-auto max-w-5xl px-4 py-5">{children}</main>
    </div>
  );
}

function Work({ data, setData, repeats }) {
  const a = data.attempt;
  const qs = data.questions;
  const learning = a.mode === 'learning';
  const flagKey = `medcoel_flag_${a.id}`;
  const [idx, setIdx] = useState(() => {
    const firstOpen = qs.findIndex((q) => !data.answers[q.id]);
    return firstOpen >= 0 ? firstOpen : 0;
  });
  const [values, setValues] = useState(() => Object.fromEntries(Object.entries(data.answers).map(([k, v]) => [k, v.response])));
  const [checked, setChecked] = useState(() => {
    const out = {};
    Object.entries(data.answers).forEach(([k, v]) => { if (v.locked) out[k] = { correct: v.correct, scored: v.scored, detail: v.detail }; });
    return out;
  });
  const [revealedQ, setRevealedQ] = useState({}); // soal lengkap dengan kunci (mode Learning)
  const [flags, setFlags] = useState(() => { try { return new Set(JSON.parse(localStorage.getItem(flagKey) || '[]')); } catch { return new Set(); } });
  const [saving, setSaving] = useState('');
  const [error, setError] = useState('');
  const [grid, setGrid] = useState(false);
  const [confirm, setConfirm] = useState(false);
  const [report, setReport] = useState(null);
  const [finishing, setFinishing] = useState(false);
  const pending = useRef({});
  const timers = useRef({});

  useEffect(() => { try { localStorage.setItem(flagKey, JSON.stringify([...flags])); } catch { /* abaikan */ } }, [flags, flagKey]);

  const q0 = qs[idx];
  const q = revealedQ[q0.id] || q0;
  const isChecked = !!checked[q.id];
  const doneCount = qs.filter((x) => answered(x, values[x.id]) || checked[x.id]).length;

  // Waktu
  const deadline = a.deadline ? new Date(a.deadline).getTime() : null;
  const [now, setNow] = useState(Date.now());
  useEffect(() => {
    if (!deadline) return undefined;
    const t = setInterval(() => setNow(Date.now()), 1000);
    return () => clearInterval(t);
  }, [deadline]);
  const left = deadline ? Math.max(0, (deadline - now) / 1000) : null;

  const send = useCallback(async (qid, response) => {
    delete pending.current[qid];
    setSaving('Menyimpan...');
    try {
      await api(`attempts/${a.id}/answer`, { method: 'POST', body: { question: qid, response } });
      setSaving('Tersimpan');
    } catch (e) {
      pending.current[qid] = response;
      setSaving('');
      setError(e.message);
    }
  }, [a.id]);

  const change = (val) => {
    setValues((v) => ({ ...v, [q.id]: val }));
    setError('');
    if (learning) return; // mode Learning: dikirim saat Cek jawaban
    pending.current[q.id] = val;
    clearTimeout(timers.current[q.id]);
    const delay = q.qtype === 'A' || q.qtype === 'K' ? 0 : 900;
    timers.current[q.id] = setTimeout(() => send(q.id, val), delay);
  };

  const check = async () => {
    setError('');
    const val = values[q.id] ?? (q.qtype === 'A' || q.qtype === 'K' ? null : {});
    if ((q.qtype === 'A' || q.qtype === 'K') && !val) { setError('Pilih jawaban dulu.'); return; }
    try {
      const r = await api(`attempts/${a.id}/answer`, { method: 'POST', body: { question: q.id, response: val, check: true } });
      setChecked((c) => ({ ...c, [q.id]: r.result }));
      setRevealedQ((m) => ({ ...m, [q.id]: r.question }));
    } catch (e) { setError(e.message); }
  };

  const finish = useCallback(async () => {
    setFinishing(true);
    setError('');
    Object.values(timers.current).forEach(clearTimeout);
    try {
      const r = await api(`attempts/${a.id}/finish`, { method: 'POST', body: { answers: pending.current } });
      try { localStorage.removeItem(flagKey); } catch { /* abaikan */ }
      setData(r);
      window.scrollTo(0, 0);
    } catch (e) {
      setError(e.message);
      setFinishing(false);
    }
  }, [a.id, flagKey, setData]);

  // Waktu habis: selesaikan otomatis.
  const autoDone = useRef(false);
  useEffect(() => {
    if (left === 0 && !autoDone.current) { autoDone.current = true; finish(); }
  }, [left, finish]);

  // Simpan jawaban yang tertunda bila tab ditutup.
  useEffect(() => {
    const h = (e) => { if (Object.keys(pending.current).length) { e.preventDefault(); e.returnValue = ''; } };
    window.addEventListener('beforeunload', h);
    return () => window.removeEventListener('beforeunload', h);
  }, []);

  const go = (i) => { setIdx(Math.max(0, Math.min(qs.length - 1, i))); setGrid(false); setError(''); window.scrollTo({ top: 0, behavior: 'smooth' }); };
  const unanswered = qs.length - doneCount;

  return (
    <Frame title={a.title} right={<>
      {left !== null && (
        <span className={clsx('chip px-3 py-1 text-sm', left < 300 ? 'bg-coral-soft text-coral' : 'bg-page text-ink')} aria-live="polite"><Clock size={15} /> {clock(left)}</span>
      )}
      <button type="button" className="btn-primary btn-sm" onClick={() => setConfirm(true)} disabled={finishing}><Send size={15} /> Selesai</button>
    </>}>
      <div className="mb-4 flex flex-wrap items-center gap-3">
        <Badge className={learning ? 'bg-brand-soft text-brand-dark' : 'bg-progress-soft text-progress'}>{learning ? 'Mode Learning' : 'Mode ujian'}</Badge>
        <span className="text-sm text-ink-muted">{doneCount} dari {qs.length} soal dijawab</span>
        <span className="text-xs text-ink-muted">{saving}</span>
        <button type="button" className="btn-ghost btn-sm ml-auto" onClick={() => setGrid(true)}><Grid3X3 size={16} /> Daftar soal</button>
      </div>
      <ProgressBar value={doneCount} max={qs.length} className="mb-4" label="Soal terjawab" />
      {repeats > 0 && idx === 0 && <Alert kind="info" className="mb-4">Soal baru yang belum pernah kamu kerjakan sudah habis di beberapa BAB, jadi {repeats} soal di paket ini pernah kamu kerjakan.</Alert>}

      <QuestionView
        key={q.id}
        q={q}
        index={idx}
        total={qs.length}
        value={values[q.id]}
        onChange={change}
        revealed={learning && isChecked}
        result={checked[q.id]}
        onReport={() => setReport(q.id)}
        flagged={flags.has(q.id)}
        onFlag={learning ? undefined : () => setFlags((s) => { const n = new Set(s); if (n.has(q.id)) n.delete(q.id); else n.add(q.id); return n; })}
      />
      <Alert className="mt-3">{error}</Alert>

      <div className="mt-4 flex flex-wrap items-center gap-2">
        <button type="button" className="btn-secondary" onClick={() => go(idx - 1)} disabled={idx === 0}><ChevronLeft size={18} /> Sebelumnya</button>
        {learning && !isChecked && (
          <button type="button" className="btn-primary" onClick={check}>{q.qtype === 'esai' ? 'Lihat kunci' : 'Cek jawaban'}</button>
        )}
        {idx < qs.length - 1 ? (
          <button type="button" className={clsx(learning && !isChecked ? 'btn-secondary' : 'btn-primary', 'ml-auto')} onClick={() => go(idx + 1)}>Berikutnya <ChevronRight size={18} /></button>
        ) : (
          <button type="button" className="btn-primary ml-auto" onClick={() => setConfirm(true)}>Selesai <Send size={16} /></button>
        )}
      </div>

      <Modal open={grid} onClose={() => setGrid(false)} title="Daftar soal" size="lg">
        <div className="grid grid-cols-6 gap-2 sm:grid-cols-10">
          {qs.map((x, i) => {
            const c = checked[x.id];
            const ans = answered(x, values[x.id]);
            return (
              <button
                key={x.id}
                type="button"
                onClick={() => go(i)}
                className={clsx('relative h-10 rounded-lg border text-sm font-semibold',
                  i === idx && 'ring-2 ring-ink',
                  c ? (c.scored === false ? 'border-academic bg-academic-soft' : c.correct ? 'border-brand bg-brand text-white' : 'border-coral bg-coral text-white')
                    : ans ? 'border-academic bg-academic text-white' : 'border-line bg-surface')}
                aria-label={`Soal ${i + 1}${ans ? ', sudah dijawab' : ''}${flags.has(x.id) ? ', ragu-ragu' : ''}`}
              >
                {i + 1}
                {flags.has(x.id) && <span className="absolute -right-1 -top-1 h-3 w-3 rounded-full bg-gold" />}
              </button>
            );
          })}
        </div>
        <div className="mt-4 flex flex-wrap gap-3 text-xs text-ink-muted">
          <span className="flex items-center gap-1"><span className="h-3 w-3 rounded bg-academic" /> Dijawab</span>
          {learning && <><span className="flex items-center gap-1"><span className="h-3 w-3 rounded bg-brand" /> Benar</span><span className="flex items-center gap-1"><span className="h-3 w-3 rounded bg-coral" /> Salah</span></>}
          <span className="flex items-center gap-1"><span className="h-3 w-3 rounded-full bg-gold" /> Ragu-ragu</span>
        </div>
      </Modal>

      <Modal open={confirm} onClose={() => setConfirm(false)} title="Selesaikan pengerjaan?" size="sm" footer={<>
        <button type="button" className="btn-ghost" onClick={() => setConfirm(false)}>Lanjut mengerjakan</button>
        <button type="button" className="btn-primary" onClick={() => { setConfirm(false); finish(); }} disabled={finishing}>{finishing ? 'Menghitung...' : 'Ya, selesai'}</button>
      </>}>
        <p>{unanswered > 0 ? <>Masih ada <b>{unanswered} soal</b> yang belum dijawab dan akan dihitung salah.</> : 'Semua soal sudah dijawab.'}</p>
        {flags.size > 0 && <p className="mt-2 text-sm text-ink-muted">{flags.size} soal masih ditandai ragu-ragu.</p>}
      </Modal>
      {report && <ReportDialog questionId={report} onClose={() => setReport(null)} />}
    </Frame>
  );
}

// ---------------------------------------------------------------------------
// Hasil dan review
// ---------------------------------------------------------------------------

function Result({ data }) {
  const nav = useNavigate();
  const a = data.attempt;
  const [filter, setFilter] = useState('all');
  const [retrying, setRetrying] = useState(false);
  const [error, setError] = useState('');
  const [report, setReport] = useState(null);
  const bd = a.breakdown || {};

  const list = useMemo(() => data.questions.map((q, i) => ({ q, i, ans: data.answers[q.id] })).filter(({ q, ans }) => {
    if (filter === 'wrong') return q.qtype !== 'esai' && !ans?.correct;
    if (filter === 'right') return ans?.correct;
    return true;
  }), [data, filter]);

  const retry = async () => {
    setRetrying(true); setError('');
    const s = a.settings || {};
    try {
      let r;
      if (a.kind === 'practice') r = await api('attempts/practice', { method: 'POST', body: { chapter: s.chapter, count: s.count, mode: s.mode } });
      else if (a.kind === 'simulation') r = await api('attempts/simulation', { method: 'POST', body: { ...s } });
      else r = await api('attempts/package', { method: 'POST', body: { package: s.package, mode: s.mode } });
      nav(`/kerjakan/${r.attempt.id}`);
    } catch (e) { setError(e.message); setRetrying(false); }
  };

  return (
    <div className="space-y-5">
      <Link to="/riwayat" className="inline-flex items-center gap-1 text-sm font-semibold text-ink-muted hover:text-brand"><ArrowLeft size={16} /> Riwayat</Link>
      <section className="card grid gap-4 p-5 md:grid-cols-[auto_1fr] md:items-center md:p-6">
        <div className="flex h-32 w-32 flex-col items-center justify-center rounded-full border-8 border-brand-soft bg-surface text-center">
          <span className="font-display text-4xl font-extrabold text-brand">{scoreText(a.score)}</span>
          <span className="text-xs font-semibold text-ink-muted">skor</span>
        </div>
        <div>
          <h1 className="font-display text-2xl font-bold">{a.title}</h1>
          <p className="text-sm text-ink-muted">{KIND[a.kind]} · {a.mode === 'learning' ? 'Mode Learning' : 'Mode ujian'} · selesai {fmtDateTime(a.finishedAt)} · durasi {duration(a.durationSec)}</p>
          <div className="mt-3 flex flex-wrap gap-2">
            <Badge className="bg-brand-soft text-brand-dark">{a.correctCount} benar dari {a.scoredCount} soal dinilai</Badge>
            <Badge className="bg-gold-soft text-[#6b4f00]"><Trophy size={13} /> +{a.points} poin</Badge>
            {a.flagged && <Badge className="bg-coral-soft text-coral">Waktu pengerjaan tidak wajar, poin tidak dihitung</Badge>}
          </div>
          <div className="mt-4 flex flex-wrap gap-2">
            <button type="button" className="btn-primary" onClick={retry} disabled={retrying}><RotateCcw size={16} /> {retrying ? 'Menyiapkan...' : 'Ulangi dengan pengaturan sama'}</button>
            <Link to="/beranda" className="btn-secondary">Beranda</Link>
          </div>
          <Alert className="mt-3">{error}</Alert>
        </div>
      </section>

      <div className="grid gap-4 md:grid-cols-2">
        <section className="card p-4">
          <h2 className="mb-2 font-display font-semibold">Per BAB</h2>
          <ul className="space-y-2">
            {Object.entries(bd.chapters || {}).map(([k, v]) => (
              <li key={k}>
                <div className="flex justify-between text-sm"><span className="truncate">{v.title || 'BAB'}</span><span className="font-semibold">{v.correct}/{v.total}</span></div>
                <ProgressBar value={v.correct} max={v.total} label={v.title} />
              </li>
            ))}
          </ul>
        </section>
        <section className="card p-4">
          <h2 className="mb-2 font-display font-semibold">Per tingkat kesulitan</h2>
          <ul className="space-y-2">
            {['easy', 'medium', 'hard'].filter((d) => bd.difficulty?.[d]).map((d) => (
              <li key={d}>
                <div className="flex justify-between text-sm"><span>{DIFF[d]}</span><span className="font-semibold">{bd.difficulty[d].correct}/{bd.difficulty[d].total}</span></div>
                <ProgressBar value={bd.difficulty[d].correct} max={bd.difficulty[d].total} color="bg-progress" label={DIFF[d]} />
              </li>
            ))}
          </ul>
          {bd.types && <p className="mt-3 text-xs text-ink-muted">{Object.entries(bd.types).map(([t, v]) => `${QTYPE[t]}: ${v.correct}/${v.total}`).join(' · ')}</p>}
        </section>
      </div>

      <section>
        <div className="mb-3 flex flex-wrap items-center justify-between gap-2">
          <h2 className="section-title">Review pembahasan</h2>
          <Tabs value={filter} onChange={setFilter} tabs={[{ value: 'all', label: 'Semua' }, { value: 'wrong', label: 'Salah' }, { value: 'right', label: 'Benar' }]} />
        </div>
        <div className="space-y-4">
          {list.map(({ q, i, ans }) => (
            <QuestionView key={q.id} q={q} index={i} total={data.questions.length} value={ans?.response} onChange={() => {}} revealed result={ans ? { correct: ans.correct, scored: ans.scored, detail: ans.detail } : { correct: false, scored: q.qtype !== 'esai' }} disabled onReport={() => setReport(q.id)} />
          ))}
          {!list.length && <p className="text-ink-muted">Tidak ada soal di filter ini.</p>}
        </div>
      </section>
      {report && <ReportDialog questionId={report} onClose={() => setReport(null)} />}
    </div>
  );
}
