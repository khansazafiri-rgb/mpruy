import { useState } from 'react';
import { api, errorText } from '@/lib/api';
import { Alert } from '@/components/ui';
import { OptionList } from '@/components/QuestionView';
import LabImage from './LabImage';

// Order: image, question, options, submit. The question sits right above its options.
// Feedback is just the result and the answer; an explanation appears only when the author wrote one.
export default function LabQuestion({ question: q, saved, onAnswered }) {
  const [response, setResponse] = useState(saved?.response ?? ''); const [result, setResult] = useState(saved?.result ?? null); const [busy, setBusy] = useState(false); const [error, setError] = useState('');
  const choice = ['single_best_answer', 'image_identification'].includes(q.type);
  const hotspot = ['hotspot', 'select_region'].includes(q.type);
  async function answer(e) {
    e.preventDefault(); setBusy(true); setError('');
    try { const r = await api(q.answerPath || `lab/questions/${q.id}/answer`, { method: 'POST', body: { response } }); setResult(r); onAnswered?.({ response, result: r }); }
    catch (err) { setError(errorText(err)); } finally { setBusy(false); }
  }
  const key = result && choice ? q.options?.find((o) => o.label === result.answer) : null;
  const verdict = !result ? '' : result.selfAssessment ? 'Bandingkan jawabanmu' : result.correct ? 'Jawaban tepat' : 'Belum tepat';
  return <form onSubmit={answer} className="min-w-0 space-y-3">
    {q.image && <LabImage asset={q.image} question controls="min" point={hotspot && response ? response : null} onPoint={hotspot && !result && !busy ? setResponse : undefined} region={result?.region} />}
    <h3 className="text-lg font-semibold leading-snug">{q.prompt}</h3>
    {choice ? <OptionList q={{ ...q, answer: result?.answer }} value={response} onChange={setResponse} revealed={!!result} disabled={busy || !!result} /> : !hotspot && <label className="block space-y-2"><span>Jawabanmu (penilaian mandiri)</span><textarea className="input min-h-28" maxLength={4000} value={response} onChange={(e) => setResponse(e.target.value)} disabled={busy || !!result} required /></label>}
    <Alert>{error}</Alert>
    {!result && <button className="btn btn-primary min-h-11 w-full sm:w-auto" disabled={busy || !response}>{busy ? 'Memeriksa…' : 'Periksa jawaban'}</button>}
    {result && <div role="status" className={`space-y-1 rounded-xl p-3 ${result.correct === false ? 'bg-coral/10' : 'bg-brand-soft'}`}>
      <p className={`font-bold ${result.correct === false ? 'text-coral' : 'text-brand'}`}>{verdict}</p>
      {key ? <p>Jawaban: <strong>{key.text}</strong></p> : result.answer && <p>Contoh jawaban: {result.answer}</p>}
      {result.explanation && <p className="text-sm leading-relaxed">{result.explanation}</p>}
    </div>}
  </form>;
}
