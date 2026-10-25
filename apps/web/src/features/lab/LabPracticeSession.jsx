import { useEffect, useState } from 'react';
import LabQuestion from './LabQuestion';
import { sessionSummary } from './labUtils';

// Sesi latihan terfokus: satu kasus per layar, progres, sebelumnya/berikutnya, ringkasan, dan tinjau soal yang salah.
// Tidak ada label atau jawaban di layar ini sebelum soal dikirim (gambar soal datang dari API tanpa label).
export default function LabPracticeSession({ questions, onExit, onFinish, exitLabel = 'Kembali ke materi', children }) {
  const [answers, setAnswers] = useState({});
  const [review, setReview] = useState(null);
  const [index, setIndex] = useState(0);
  const list = review ? questions.filter((q) => review.includes(q.id)) : questions;
  const done = index >= list.length;
  useEffect(() => { window.scrollTo?.({ top: 0 }); }, [index, review]);
  // Reaching the summary of the full session (not a review pass) counts as finishing the practice.
  useEffect(() => { if (done && !review && questions.length) onFinish?.(); }, [done, review]); // eslint-disable-line react-hooks/exhaustive-deps
  if (!questions.length) return null;
  const summary = sessionSummary(questions, answers);
  const q = list[index]; const answered = !!answers[q?.id]?.result;
  const restart = (ids) => { setReview(ids); setIndex(0); if (!ids) setAnswers({}); };

  if (done) return <section className="space-y-5" aria-labelledby="lab-summary">
    <div className="card space-y-3 p-6 text-center">
      <h2 id="lab-summary" className="text-2xl font-bold">{review ? 'Tinjauan selesai' : 'Sesi latihan selesai'}</h2>
      <p className="text-4xl font-bold text-brand">{summary.correct} / {summary.total}</p>
      <p className="text-ink-muted">sesuai label benchmark{summary.answered < summary.total ? ` · ${summary.total - summary.answered} kasus belum dijawab` : ''}</p>
      <div className="flex flex-wrap justify-center gap-2 pt-2">
        {summary.review.length > 0 && <button type="button" className="btn btn-primary" onClick={() => restart(summary.review)}>Tinjau {summary.review.length} kasus yang salah/belum dijawab</button>}
        <button type="button" className="btn btn-secondary" onClick={() => restart(null)}>Ulangi dari awal</button>
        <button type="button" className="btn btn-ghost" onClick={onExit}>{exitLabel}</button>
      </div>
    </div>
    {children}
  </section>;

  return <section className="space-y-4" aria-label="Sesi latihan">
    <div className="flex flex-wrap items-center justify-between gap-2">
      <p className="font-semibold" aria-live="polite">{review ? 'Tinjau · ' : ''}Kasus {index + 1} / {list.length}</p>
      <button type="button" className="btn btn-ghost btn-sm" onClick={onExit}>{exitLabel}</button>
    </div>
    <div role="progressbar" aria-label="Progres latihan" aria-valuemin={0} aria-valuemax={list.length} aria-valuenow={index + (answered ? 1 : 0)} className="h-2 overflow-hidden rounded-full bg-paper-2">
      <div className="h-full rounded-full bg-brand transition-all" style={{ width: `${((index + (answered ? 1 : 0)) / list.length) * 100}%` }} />
    </div>
    <LabQuestion key={q.id} question={q} session saved={answers[q.id]} onAnswered={(a) => setAnswers((prev) => ({ ...prev, [q.id]: a }))} />
    <div className="flex items-center justify-between gap-2">
      <button type="button" className="btn btn-secondary" disabled={index <= 0} onClick={() => setIndex(index - 1)}>← Sebelumnya</button>
      <button type="button" className={`btn ${answered ? 'btn-primary' : 'btn-secondary'}`} onClick={() => setIndex(index + 1)}>{index === list.length - 1 ? 'Lihat hasil' : answered ? 'Kasus berikutnya →' : 'Lewati →'}</button>
    </div>
  </section>;
}
