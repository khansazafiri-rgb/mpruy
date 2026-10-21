// Satu soal: teks, gambar, pernyataan tipe K, pilihan jawaban / isian / esai,
// dan (bila kunci sudah dibuka) hasil serta pembahasannya.
import clsx from 'clsx';
import { CheckCircle2, Flag, Lightbulb, MessageSquareWarning, XCircle } from 'lucide-react';
import { useState } from 'react';
import { DIFF, DIFF_CLASS, QTYPE } from '@/lib/labels';
import RichContent, { Content } from './RichContent';
import { Badge } from './ui';

export function OptionList({ q, value, onChange, revealed, disabled }) {
  return (
    <div className="space-y-2" role="radiogroup" aria-label="Pilihan jawaban">
      {q.options.map((o) => {
        const picked = value === o.label;
        const isKey = revealed && q.answer === o.label;
        const wrongPick = revealed && picked && !isKey;
        return (
          <div key={o.label}>
            <label
              className={clsx(
                'answer-option',
                isKey ? 'is-correct' : wrongPick ? 'is-wrong' : picked ? 'is-picked' : '',
                disabled && 'is-disabled',
              )}
            >
              <input type="radio" className="sr-only" name={`q-${q.id}`} checked={picked} disabled={disabled} onChange={() => onChange(o.label)} />
              <span className="option-letter">{o.label}</span>
              <span className="rich min-w-0 flex-1 font-medium"><Content value={o.text} inline /></span>
              {picked && !revealed && <CheckCircle2 className="shrink-0 text-brand" size={18} aria-hidden />}

              {isKey && <CheckCircle2 className="mt-1 shrink-0 text-brand" size={20} aria-label="Kunci jawaban" />}
              {wrongPick && <XCircle className="mt-1 shrink-0 text-coral" size={20} aria-label="Jawabanmu salah" />}
            </label>
            {revealed && o.explanation && (
              <div className={clsx('ml-11 mt-1 rounded-lg px-3 py-2 text-sm', isKey ? 'bg-brand-soft/60' : 'bg-page')}>
                <RichContent value={o.explanation} className="!text-[15px]" />
              </div>
            )}
          </div>
        );
      })}
    </div>
  );
}

function boxes(sub) {
  return Math.max(1, Math.min(20, sub.answerCount || 1));
}

export function IsianInputs({ q, value = {}, onChange, revealed, detail, disabled }) {
  return (
    <div className="space-y-4">
      {q.subQuestions.map((s) => {
        const n = boxes(s);
        const raw = value[s.label];
        const arr = Array.isArray(raw) ? raw : [raw ?? ''];
        const d = detail?.[s.label];
        const set = (i, v) => {
          if (n === 1) onChange({ ...value, [s.label]: v });
          else {
            const next = Array.from({ length: n }, (_, k) => arr[k] ?? '');
            next[i] = v;
            onChange({ ...value, [s.label]: next });
          }
        };
        return (
          <div key={s.label} className="rounded-xl border border-line p-3">
            <p className="mb-2 font-semibold"><span className="mr-1 text-brand">{s.label}.</span> <Content value={s.question} inline /></p>
            <div className="grid gap-2 sm:grid-cols-2">
              {Array.from({ length: n }, (_, i) => (
                <input
                  key={i}
                  className={clsx('input', revealed && d && (d.perKotak?.[i] ? 'border-brand bg-brand-soft' : 'border-coral bg-coral-soft'))}
                  value={arr[i] ?? ''}
                  disabled={disabled}
                  onChange={(e) => set(i, e.target.value)}
                  placeholder={n > 1 ? `Jawaban ${i + 1}` : 'Tulis jawabanmu'}
                  aria-label={`Jawaban ${s.label}${n > 1 ? ` nomor ${i + 1}` : ''}`}
                  maxLength={2000}
                />
              ))}
            </div>
            {revealed && (
              <div className="mt-2 rounded-lg bg-page px-3 py-2 text-sm">
                <p className="font-semibold">Jawaban yang diterima{n > 1 ? ` (sebut ${n})` : ''}:</p>
                <ul className="list-disc pl-5">{(s.accepted || []).map((a) => <li key={a}>{a}</li>)}</ul>
                {s.explanation && <div className="mt-2"><RichContent value={s.explanation} className="!text-[15px]" /></div>}
              </div>
            )}
          </div>
        );
      })}
    </div>
  );
}

export function EsaiInputs({ q, value = {}, onChange, revealed, disabled }) {
  return (
    <div className="space-y-4">
      <p className="text-sm text-ink-muted">Soal esai tidak dinilai. Tulis jawabanmu, lalu buka kunci dan bandingkan sendiri.</p>
      {q.subQuestions.map((s) => (
        <div key={s.label} className="rounded-xl border border-line p-3">
          <p className="mb-2 font-semibold"><span className="mr-1 text-brand">{s.label}.</span> <Content value={s.question} inline /></p>
          <textarea className="input min-h-[96px]" value={value[s.label] || ''} disabled={disabled} maxLength={2000} onChange={(e) => onChange({ ...value, [s.label]: e.target.value })} aria-label={`Jawaban esai ${s.label}`} />
          {revealed && (
            <div className="mt-2 rounded-lg bg-brand-soft/60 px-3 py-2 text-sm">
              {(s.accepted || []).length > 0 && (<><p className="font-semibold">Kunci:</p><ul className="list-disc pl-5">{s.accepted.map((a) => <li key={a}><Content value={a} inline /></li>)}</ul></>)}
              {(s.keyPoints || []).length > 0 && (<><p className="mt-2 font-semibold">{s.keyPointsTitle || 'Poin kunci'}:</p><ul className="list-disc pl-5">{s.keyPoints.map((a) => <li key={a}><Content value={a} inline /></li>)}</ul></>)}
              {s.explanation && <div className="mt-2"><RichContent value={s.explanation} className="!text-[15px]" /></div>}
            </div>
          )}
        </div>
      ))}
    </div>
  );
}

export default function QuestionView({ q, index, total, value, onChange, revealed, result, disabled, onReport, flagged, onFlag }) {
  const [hint, setHint] = useState(false);
  const isChoice = q.qtype === 'A' || q.qtype === 'K';
  return (
    <article className="card question-card" aria-labelledby={`soal-${q.id}`}>
      <div className="question-meta flex flex-wrap items-center gap-2">
        <div className="question-number" id={`soal-${q.id}`}><span>{String(index + 1).padStart(2, '0')}</span><span className="text-sm font-semibold">Soal {index + 1}{total ? <span className="font-normal text-ink-muted"> dari {total}</span> : null}</span></div>
        <Badge className={DIFF_CLASS[q.difficulty]}>{DIFF[q.difficulty]}</Badge>
        <Badge className="bg-page text-ink-muted">{QTYPE[q.qtype]}</Badge>
      </div>
      <div className="question-stem"><RichContent value={q.stem} /></div>
      {q.image && (
        <a href={q.image} target="_blank" rel="noopener noreferrer" className="mt-3 block">
          <img src={q.image} alt="Gambar soal" referrerPolicy="no-referrer" loading="lazy" className="max-h-[26rem] w-auto max-w-full rounded-xl border border-line" />
        </a>
      )}
      {q.qtype === 'K' && (
        <ol className="mt-3 space-y-1.5 rounded-xl bg-page p-3">
          {q.statements.map((s, i) => (
            <li key={i} className="flex gap-2"><span className="font-semibold text-brand">({i + 1})</span><span className="rich min-w-0 flex-1"><Content value={s} inline /></span></li>
          ))}
        </ol>
      )}

      {q.hint && !revealed && (
        <div className="mt-4">
          <button type="button" aria-expanded={hint} onClick={() => setHint((v) => !v)} className="inline-flex items-center gap-1 text-sm font-semibold text-academic hover:underline"><Lightbulb size={15} /> {hint ? 'Sembunyikan petunjuk' : 'Lihat petunjuk'}</button>
          {hint && <p className="answer-status mt-3 rounded-xl bg-academic-soft px-4 py-3 text-sm">{q.hint}</p>}
        </div>
      )}

      <div className="mt-4">
        {isChoice && <OptionList q={q} value={value} onChange={onChange} revealed={revealed} disabled={disabled || revealed} />}
        {q.qtype === 'isian' && <IsianInputs q={q} value={value || {}} onChange={onChange} revealed={revealed} detail={result?.detail} disabled={disabled || revealed} />}
        {q.qtype === 'esai' && <EsaiInputs q={q} value={value || {}} onChange={onChange} revealed={revealed} disabled={disabled || revealed} />}
      </div>

      {revealed && result && result.scored !== false && (
        <p className={clsx('answer-status mt-5 flex items-center gap-2 rounded-xl px-4 py-3 text-sm font-semibold', result.correct ? 'bg-brand-soft text-brand-dark' : 'bg-coral-soft text-coral')} role="status">
          {result.correct ? <CheckCircle2 size={20} /> : <XCircle size={20} />}
          {result.correct ? 'Jawabanmu benar.' : isChoice ? `Belum tepat. Kuncinya ${q.answer}.` : 'Belum tepat.'}
        </p>
      )}
      {revealed && q.explanation && (
        <section className="question-explanation">
          <h3 className="mb-2 font-display text-base font-semibold">Pembahasan</h3>
          <RichContent value={q.explanation} />
        </section>
      )}
      {(onFlag || onReport) && <div className="question-tools">
        {onFlag && <button type="button" onClick={onFlag} className={clsx('btn btn-sm', flagged ? 'bg-gold-soft text-[#6b4f00]' : 'text-ink-muted hover:bg-page')} aria-pressed={!!flagged}><Flag size={14} /> Ragu-ragu</button>}
        {onReport && <button type="button" onClick={onReport} className="btn btn-sm ml-auto text-ink-muted hover:bg-page hover:text-coral"><MessageSquareWarning size={14} /> Laporkan soal</button>}
      </div>}

    </article>
  );
}
