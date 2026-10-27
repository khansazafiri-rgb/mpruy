import { useEffect, useMemo, useState } from 'react';
import { ChevronDown } from 'lucide-react';
import LabQuestion from './LabQuestion';
import { navStatus, sessionSummary, sessionTitle, summaryLine } from './labUtils';

const TONE = { current: 'bg-brand text-white border-brand', correct: 'bg-brand-soft text-brand border-brand/50', wrong: 'bg-coral/15 text-coral border-coral/50', answered: 'bg-paper-2 text-ink border-line', skipped: 'bg-gold-soft text-ink border-gold', new: 'bg-page text-ink-muted border-line' };
const WORD = { current: 'sedang dibuka', correct: 'benar', wrong: 'salah', answered: 'sudah dijawab', skipped: 'dilewati', new: 'belum dijawab' };

// Jump palette: current / unanswered / correct / wrong / skipped. A wrapped grid on every width: no horizontal overflow.
function Navigator({ list, answers, visited, index, onJump }) {
  const [open, setOpen] = useState(false); const cur = list[index];
  const grid = <ol className="grid grid-cols-5 gap-1.5 sm:grid-cols-10" aria-label="Daftar soal">{list.map((q, i) => {
    const st = navStatus(q, { answers, visited, currentId: cur?.id });
    return <li key={q.id}><button type="button" aria-current={st === 'current' ? 'step' : undefined} aria-label={`Soal ${i + 1}, ${WORD[st]}`} onClick={() => { onJump(i); setOpen(false); }} className={`h-10 w-full rounded-lg border text-sm font-bold ${TONE[st]}`}>{i + 1}</button></li>;
  })}</ol>;
  return <div className="space-y-2">
    <button type="button" className="btn btn-secondary min-h-11 w-full justify-between md:hidden" aria-expanded={open} onClick={() => setOpen(!open)}><span>Daftar soal</span><ChevronDown size={18} className={open ? 'rotate-180' : ''} /></button>
    <div className={`${open ? 'block' : 'hidden'} max-h-60 overflow-y-auto md:block md:max-h-32`}>{grid}</div>
  </div>;
}

// Focused practice: image -> question -> options, a navigator, honest session controls and a summary.
// `about` (collapsed) holds session-level notes once, instead of repeating disclaimers in every case.
export default function LabPracticeSession({ questions, onExit, onFinish, exitLabel = 'Kembali', about, children, renderText, sourceList }) {
  const [answers, setAnswers] = useState({}); const [visited, setVisited] = useState(() => new Set());
  const [review, setReview] = useState(null); const [index, setIndex] = useState(0); const [view, setView] = useState('q');
  const list = useMemo(() => (review ? questions.filter((q) => review.includes(q.id)) : questions), [questions, review]);
  const q = list[Math.min(index, list.length - 1)];
  const summary = sessionSummary(questions, answers); const answered = !!answers[q?.id]?.result;
  useEffect(() => { window.scrollTo?.({ top: 0 }); }, [index, review, view]);
  useEffect(() => { if (q && view === 'q') setVisited((v) => (v.has(q.id) ? v : new Set(v).add(q.id))); }, [q, view]);
  useEffect(() => { document.body.dataset.labFocus = '1'; return () => { delete document.body.dataset.labFocus; }; }, []);
  // Only a fully answered session counts as finishing the practice; ending early does not complete the lesson.
  useEffect(() => { if (view === 'summary' && !review && questions.length && summary.answered >= summary.total) onFinish?.(); }, [view]); // eslint-disable-line react-hooks/exhaustive-deps
  if (!questions.length) return null;
  const startReview = (ids) => { setReview(ids); setIndex(0); setView('q'); };
  const leaveReview = () => { setReview(null); setIndex(0); setView('q'); };
  const restart = () => { setAnswers({}); setVisited(new Set()); setReview(null); setIndex(0); setView('q'); };

  if (view === 'summary') return <section className="space-y-4" aria-labelledby="lab-summary">
    <div className="card space-y-3 p-5 text-center">
      <h2 id="lab-summary" className="text-2xl font-bold">{sessionTitle(summary, null)}</h2>
      <p className="text-4xl font-bold text-brand">{summary.correct} <span className="text-xl font-semibold text-ink-muted">/ {summary.total} benar</span></p>
      <p className="text-ink-muted" aria-label="Ringkasan hasil">{summaryLine(summary)}</p>
      <div className="flex flex-col gap-2 pt-1 sm:flex-row sm:justify-center">
        {summary.review.length > 0 && <button type="button" className="btn btn-primary min-h-11" onClick={() => startReview(summary.review)}>Tinjau {summary.review.length} soal salah/belum dijawab</button>}
        <button type="button" className="btn btn-secondary min-h-11" onClick={restart}>Ulangi dari awal</button>
        <button type="button" className="btn btn-ghost min-h-11" onClick={onExit}>{exitLabel}</button>
      </div>
    </div>
    {summary.answered === summary.total && sourceList}
    {children}
  </section>;

  return <section className="min-w-0 space-y-3" aria-label="Sesi latihan">
    <div className="flex flex-wrap items-center justify-between gap-2">
      <p className="text-base font-bold" aria-live="polite">{review ? 'Tinjau · ' : ''}Soal {Math.min(index, list.length - 1) + 1} dari {list.length}</p>
      <div className="flex flex-wrap gap-1">
        {review ? <><button type="button" className="btn btn-secondary btn-sm min-h-10" onClick={() => setView('summary')}>Kembali ke ringkasan</button><button type="button" className="btn btn-ghost btn-sm min-h-10" onClick={leaveReview}>Keluar review</button></>
          : <button type="button" className="btn btn-ghost btn-sm min-h-10" onClick={() => setView('summary')}>Akhiri latihan</button>}
      </div>
    </div>
    <Navigator list={list} answers={answers} visited={visited} index={Math.min(index, list.length - 1)} onJump={setIndex} />
    {about}
    <LabQuestion key={q.id} question={q} saved={answers[q.id]} onAnswered={(a) => setAnswers((prev) => ({ ...prev, [q.id]: a }))} renderText={renderText} />
    {answered && sourceList}
    <div className="flex items-center justify-between gap-2">
      <button type="button" className="btn btn-secondary min-h-11" disabled={index <= 0} onClick={() => setIndex(index - 1)}>← Sebelumnya</button>
      <button type="button" className={`btn min-h-11 ${answered ? 'btn-primary' : 'btn-secondary'}`} onClick={() => (index >= list.length - 1 ? setView('summary') : setIndex(index + 1))}>{index >= list.length - 1 ? 'Lihat hasil' : answered ? 'Berikutnya →' : 'Lewati →'}</button>
    </div>
  </section>;
}
