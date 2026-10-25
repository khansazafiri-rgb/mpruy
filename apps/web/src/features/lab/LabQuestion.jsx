import { useState } from 'react';
import { api, errorText } from '@/lib/api';
import { Alert } from '@/components/ui';
import { OptionList } from '@/components/QuestionView';
import LabImage from './LabImage';

export default function LabQuestion({ question: q }) {
  const [response, setResponse] = useState(''); const [result, setResult] = useState(null); const [busy, setBusy] = useState(false); const [error, setError] = useState('');
  const choice = ['single_best_answer', 'image_identification'].includes(q.type);
  const hotspot = ['hotspot', 'select_region'].includes(q.type);
  async function answer(e) {
    e.preventDefault(); setBusy(true); setError('');
    try { setResult(await api(`lab/questions/${q.id}/answer`, { method: 'POST', body: { response } })); }
    catch (e) { setError(errorText(e)); } finally { setBusy(false); }
  }
  return <form onSubmit={answer} className="card space-y-4 p-5">
    <h3 className="text-lg font-semibold">{q.prompt}</h3>
    {q.image && <LabImage asset={q.image} question point={hotspot && response ? response : null} onPoint={hotspot && !result && !busy ? setResponse : undefined} region={result?.region} />}
    {choice ? <OptionList q={{ ...q, answer: result?.answer }} value={response} onChange={setResponse} revealed={!!result} disabled={busy || !!result} /> : !hotspot && <label className="block space-y-2"><span>Jawabanmu (penilaian mandiri)</span><textarea className="input min-h-28" maxLength={4000} value={response} onChange={(e) => setResponse(e.target.value)} disabled={busy || !!result} required /></label>}
    <Alert>{error}</Alert>
    {!result && <button className="btn btn-primary" disabled={busy || !response}>{busy ? 'Memeriksa…' : 'Periksa jawaban'}</button>}
    {result && <div className="space-y-2 rounded-xl bg-brand-soft p-4" role="status"><strong>{result.selfAssessment ? 'Bandingkan jawabanmu' : result.correct ? 'Jawaban tepat' : 'Coba perhatikan kembali'}</strong>{result.answer && <p>Contoh/kunci jawaban: {result.answer}</p>}<p>{result.explanation}</p><p className="text-sm">Latihan Lab ini tidak menambah poin atau leaderboard.</p><button type="button" className="btn btn-ghost btn-sm" onClick={() => { setResult(null); setResponse(''); }}>Ulangi latihan</button></div>}
  </form>;
}
