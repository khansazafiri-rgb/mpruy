// MENGERJAKAN SOAL
// - Mode Learning: cek jawaban per soal, kunci dan pembahasan langsung terbuka.
// - Mode ujian: jawaban tersimpan otomatis, pembahasan dibuka setelah selesai.
// Jawaban dikirim ke server satu per satu; kunci tidak pernah ada di browser
// sebelum waktunya.
import clsx from 'clsx';
import { ArrowLeft, ChevronLeft, ChevronRight, BookOpen, Check, ChevronDown, Clock, Grid3X3, Loader2, RotateCcw, Trophy } from 'lucide-react';
import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { Link, useLocation, useNavigate, useParams } from 'react-router-dom';
import QuestionView from '@/components/QuestionView';
import ReportDialog from '@/components/ReportDialog';
import { Alert, Badge, Modal, PageLoader, ProgressBar, Tabs } from '@/components/ui';
import Logo from '@/components/Logo';
import LanguageSwitch from '@/components/LanguageSwitch';
import MascotTip from '@/components/MascotTip';
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
    <div className="study-frame min-h-screen">
      <header className="study-header sticky top-0 z-30 border-b border-line">
        <div className="study-header-inner mx-auto flex items-center gap-3">
          <Link to="/beranda" aria-label="Beranda"><Logo variant="mark" className="sm:hidden" /><Logo className="hidden sm:block" /></Link>
          {title && <p className="study-header-title hidden truncate text-ink-muted sm:block">{title}</p>}
          <div className="ml-auto flex items-center gap-2"><LanguageSwitch />{right}</div>
        </div>
      </header>
      <main className="study-main mx-auto">{children}</main>
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
  const [checking, setChecking] = useState(false);
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

  const [streak, setStreak] = useState(0);
  const check = async () => {
    if (checking) return;
    setError('');
    const val = values[q.id] ?? (q.qtype === 'A' || q.qtype === 'K' ? null : {});
    if ((q.qtype === 'A' || q.qtype === 'K') && !val) { setError('Pilih jawaban dulu.'); return; }
    setChecking(true);
    try {
      const r = await api(`attempts/${a.id}/answer`, { method: 'POST', body: { question: q.id, response: val, check: true } });
      setChecked((c) => ({ ...c, [q.id]: r.result }));
      if (r.result?.scored !== false) setStreak((n) => (r.result?.correct ? n + 1 : 0));
      setRevealedQ((m) => ({ ...m, [q.id]: r.question }));
    } catch (e) { setError(e.message); } finally { setChecking(false); }
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

  const go = (i) => { setIdx(Math.max(0, Math.min(qs.length - 1, i))); setGrid(false); setError(''); window.scrollTo({ top: 0, behavior: window.matchMedia('(prefers-reduced-motion: reduce)').matches ? 'auto' : 'smooth' }); };
  const unanswered = qs.length - doneCount;

  const navProps = { questions: qs, index: idx, values, checked, flags, onGo: go, learning };
  const saveStatus = learning ? (isChecked ? 'Jawaban diperiksa' : 'Diperiksa per soal') : saving;

  return (
    <Frame title={a.title} right={<>
      {left !== null && <span className={clsx('study-timer', left < 300 ? 'bg-coral-soft text-coral' : 'bg-page text-ink')} role="timer" aria-label={`Waktu tersisa ${clock(left)}`}><Clock size={16} />{clock(left)}</span>}
      <button type="button" className="btn-primary btn-sm" onClick={() => setConfirm(true)} disabled={finishing}><Check size={15} /> Selesai</button>
    </>}>
      <div className="study-heading">
        <div className="mb-5 flex items-center justify-between gap-2">
          <Link to="/mata-kuliah" className="inline-flex items-center gap-2 text-xs font-medium text-ink-muted hover:text-brand"><ArrowLeft size={14} /> Mata kuliah</Link>
          <Badge className={learning ? 'bg-brand-soft text-brand-dark' : 'bg-progress-soft text-progress'}><BookOpen size={12} /> {learning ? 'Mode Learning' : 'Mode ujian'}</Badge>
        </div>
        <p className="eyebrow">{learning ? 'Ruang belajar' : 'Ruang simulasi'}</p>
        <h1>{a.title}</h1>
        <p className="mt-2 text-sm text-ink-muted">{q.chapterTitle || (learning ? 'Pelajari satu soal, pahami satu konsep.' : 'Kerjakan dengan tenang. Jawaban disimpan otomatis.')}</p>
      </div>
      <div className="mb-4 flex items-center gap-4 lg:hidden">
        <span className="text-xs text-ink-muted">{doneCount}/{qs.length} dijawab</span>
        <ProgressBar value={doneCount} max={qs.length} className="flex-1" label="Soal terjawab" />
        <button type="button" className="btn-secondary btn-sm" onClick={() => setGrid(true)}><Grid3X3 size={14} /> Soal <ChevronDown size={12} /></button>
      </div>
      {repeats > 0 && idx === 0 && <Alert kind="info" className="mb-4">Soal baru yang belum pernah kamu kerjakan sudah habis di beberapa BAB, jadi {repeats} soal di paket ini pernah kamu kerjakan.</Alert>}
      <div className="study-layout">
        <div className="study-content">
          <QuestionView key={q.id} q={q} index={idx} total={qs.length} value={values[q.id]} onChange={change} revealed={learning && isChecked} result={checked[q.id]} onReport={() => setReport(q.id)} flagged={flags.has(q.id)} onFlag={learning ? undefined : () => setFlags((s) => { const n = new Set(s); if (n.has(q.id)) n.delete(q.id); else n.add(q.id); return n; })} />
          {learning && isChecked && <CheckTip result={checked[q.id]} index={idx} streak={streak} />}
          <Alert className="mt-3">{error}</Alert>
          <div className="question-actions flex flex-wrap items-center gap-2">
            <button type="button" className="btn-ghost" onClick={() => go(idx - 1)} disabled={idx === 0}><ChevronLeft size={16} /><span className="sr-only sm:not-sr-only">Sebelumnya</span></button>
            {learning && !isChecked && <button type="button" className="btn-primary ml-auto" onClick={check} disabled={checking}>{checking ? <Loader2 size={16} className="animate-spin" /> : <Check size={16} />}{checking ? 'Memeriksa...' : q.qtype === 'esai' ? 'Lihat kunci' : 'Cek jawaban'}</button>}
            {idx < qs.length - 1 ? <button type="button" className={clsx(learning && !isChecked ? 'btn-secondary' : 'btn-primary ml-auto')} onClick={() => go(idx + 1)}>Berikutnya <ChevronRight size={16} /></button> : <button type="button" className={clsx(learning && !isChecked ? 'btn-secondary' : 'btn-primary ml-auto')} onClick={() => setConfirm(true)}>Selesai <Check size={16} /></button>}
          </div>
          <p className="study-save mt-3 justify-center lg:hidden" role="status">{saveStatus}</p>
        </div>
        <aside className="study-sidebar card" aria-label="Navigasi soal">
          <p className="text-sm font-semibold">Sesi belajarmu</p>
          <div className="mb-3 mt-5 flex items-baseline justify-between"><span className="text-xs text-ink-muted">Soal dijawab</span><span className="text-sm font-semibold">{doneCount}<span className="font-normal text-ink-muted"> / {qs.length}</span></span></div>
          <ProgressBar value={doneCount} max={qs.length} label="Soal terjawab" />
          <div className="study-save mb-6 mt-3" role="status">{saving === 'Menyimpan...' ? <Loader2 size={13} className="animate-spin" /> : <Check size={13} className="text-brand" />}{saveStatus || 'Siap mengerjakan'}</div>
          <div className="mb-4 flex items-center justify-between border-t border-line pt-5"><h2 className="text-xs font-semibold">Navigasi soal</h2><button type="button" onClick={() => setGrid(true)} className="rounded-md p-1 text-ink-muted hover:bg-page" aria-label="Perbesar daftar soal"><Grid3X3 size={14} /></button></div>
          <div className="max-h-[40vh] overflow-y-auto p-1 -m-1"><QuestionNavigator {...navProps} /></div>
          <p className="mt-6 border-t border-line pt-4 text-xs leading-relaxed text-ink-muted">{learning ? 'Cek jawaban untuk membuka pembahasan. Pahami konsepnya sebelum lanjut.' : 'Tandai soal yang ingin kamu tinjau lagi sebelum menyelesaikan simulasi.'}</p>
        </aside>
      </div>
      <Modal open={grid} onClose={() => setGrid(false)} title="Navigasi soal" size="lg"><QuestionNavigator {...navProps} expanded /></Modal>

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

function QuestionNavigator({ questions, index, values, checked, flags, onGo, learning, expanded }) {
  return <>
    <div className={clsx('question-grid', expanded && 'is-expanded')}>
      {questions.map((q, i) => {
        const result = checked[q.id];
        const done = answered(q, values[q.id]);
        const status = result ? result.scored === false ? 'Diperiksa' : result.correct ? 'Benar' : 'Salah' : done ? 'Sudah dijawab' : 'Belum dijawab';
        return <button type="button" key={q.id} onClick={() => onGo(i)} className={clsx('question-dot', result ? result.scored === false ? 'is-answered' : result.correct ? 'is-correct' : 'is-wrong' : done && 'is-answered')} aria-current={i === index ? 'step' : undefined} aria-label={`Soal ${i + 1}, ${status}${flags.has(q.id) ? ', ragu-ragu' : ''}`}>{i + 1}{flags.has(q.id) && <span className="question-flag" />}</button>;
      })}
    </div>
    <div className="grid-legend"><span><i className="bg-brand-soft" /> Dijawab</span><span><i className="border border-line bg-surface" /> Belum</span>{learning ? <><span><i className="bg-brand" /> Benar</span><span><i className="bg-coral-soft" /> Salah</span></> : <span><i className="bg-gold" /> Ragu-ragu</span>}</div>
  </>;
}

// ---------------------------------------------------------------------------
// Hasil dan review
// ---------------------------------------------------------------------------

// Reaksi maskot setelah "Cek jawaban" di mode Learning. Pilihan kalimat tetap per soal.
const RIGHT = ['Mantap, benar! Konsepnya sudah nyambung.', 'Tepat sekali! Lanjut ke soal berikutnya.', 'Benar! Coba baca pembahasannya juga, siapa tahu ada poin baru.', 'Yes, benar! Kamu makin jago.'];
const WRONG = ['Belum tepat, nggak apa-apa. Baca pembahasannya pelan-pelan ya.', 'Hampir! Lihat kenapa pilihan lain kurang tepat di pembahasan.', 'Salah itu bagian dari belajar. Catat poin pentingnya, nanti soal ini muncul lagi.'];
function CheckTip({ result, index, streak }) {
  if (!result || result.scored === false) return null;
  const pick = (list) => list[index % list.length];
  if (result.correct) {
    return <MascotTip key={`ok-${index}`} pop mascot="kila" mood={streak >= 3 ? 'cheer' : 'happy'} size={64} className="mt-4">{streak >= 3 ? `${streak} benar berturut-turut! Pertahankan!` : pick(RIGHT)}</MascotTip>;
  }
  return <MascotTip key={`no-${index}`} pop mascot="nilo" mood="think" size={64} className="mt-4">{pick(WRONG)}</MascotTip>;
}

function resultTip(score) {
  if (score === null || score === undefined) return { mascot: 'kori', mood: 'idle', text: 'Latihan selesai. Lihat pembahasan di bawah untuk mengulang materi.' };
  if (score >= 80) return { mascot: 'kila', mood: 'cheer', text: 'Keren banget! Kamu menguasai BAB ini. Coba paket atau simulasi untuk tantangan berikutnya.' };
  if (score >= 55) return { mascot: 'kori', mood: 'happy', text: 'Bagus! Tinggal sedikit lagi. Fokus ke soal yang salah, lalu ulangi sekali lagi.' };
  return { mascot: 'nilo', mood: 'think', text: 'Pelan-pelan saja. Baca pembahasan soal yang salah, lalu ulangi besok. Konsisten itu kuncinya.' };
}

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
          {(() => { const t = resultTip(a.score); return <MascotTip mascot={t.mascot} mood={t.mood} size={64} className="mt-4">{t.text}</MascotTip>; })()}
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
