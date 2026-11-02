// "Soal salah": semua soal yang jawaban terakhirmu salah, dari semua latihan, paket, simulasi, dan Drilling.
// Bisa disaring per mata kuliah dan BAB, dibuka lengkap dengan jawabanmu, kunci, dan pembahasan, lalu diulang.
// Soal keluar dari daftar ini begitu kamu menjawabnya benar di percobaan mana pun.
import { ArrowRight, BookOpen, CheckCircle2, Clock, RotateCcw } from 'lucide-react';
import { useEffect, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import MascotTip from '@/components/MascotTip';
import QuestionView from '@/components/QuestionView';
import ReportDialog from '@/components/ReportDialog';
import { Alert, EmptyState, PageLoader } from '@/components/ui';
import { api, errorText } from '@/lib/api';
import { KIND } from '@/lib/labels';
import { fmtDateTime } from '@/lib/time';

const PER_PAGE = 10;

export default function WrongBank({ subject, chapter, page, onFilter }) {
  const nav = useNavigate();
  const [data, setData] = useState(null);
  const [error, setError] = useState('');
  const [starting, setStarting] = useState('');
  const [report, setReport] = useState(null);

  useEffect(() => {
    setData(null); setError('');
    const q = new URLSearchParams({ perPage: String(PER_PAGE), page: String(page) });
    if (subject) q.set('subject', subject);
    if (chapter) q.set('chapter', chapter);
    api(`wrong?${q.toString()}`).then(setData).catch((e) => setError(errorText(e)));
  }, [subject, chapter, page]);

  const start = async (mode) => {
    setStarting(mode); setError('');
    try {
      const r = await api('attempts/wrong', { method: 'POST', body: { subject, chapter, count: 'all', mode } });
      nav(`/kerjakan/${r.attempt.id}`);
    } catch (e) { setError(errorText(e)); setStarting(''); }
  };

  if (error && !data) return <Alert>{error}</Alert>;
  if (!data) return <PageLoader />;

  const chosenSubject = data.subjects.find((s) => s.id === subject);
  const filtered = !!(subject || chapter);
  if (!data.total) {
    return (
      <div className="space-y-4">
        <MascotTip mascot="kila" mood="cheer" size={72} title="Belum ada soal yang salah">
          Soal yang jawabanmu salah akan muncul di sini, lengkap dengan pembahasannya, supaya gampang diulang. Kerjakan latihan dulu, ya.
        </MascotTip>
        <EmptyState icon={CheckCircle2} title="Daftar soal salah kosong"><Link to="/mata-kuliah" className="btn-primary mt-4 inline-flex">Mulai latihan</Link></EmptyState>
      </div>
    );
  }

  return (
    <div className="space-y-5">
      <section className="card flex flex-wrap items-center gap-4 p-4 md:p-5">
        <div className="min-w-0 flex-1">
          <p className="font-display text-xl font-bold"><span className="text-coral">{data.total}</span> soal terakhir kamu jawab salah</p>
          <p className="mt-1 text-sm text-ink-muted">Dari semua latihan, paket, simulasi, dan Drilling. Jawab benar sekali saja dan soalnya keluar dari daftar ini.</p>
        </div>
        <div className="flex flex-wrap gap-2">
          <button type="button" className="btn-primary" onClick={() => start('learning')} disabled={!!starting}><RotateCcw size={16} aria-hidden /> {starting === 'learning' ? 'Menyiapkan...' : `Latih ulang ${Math.min(data.count, 100)} soal`}</button>
          <button type="button" className="btn-secondary" onClick={() => start('exam')} disabled={!!starting}><Clock size={16} aria-hidden /> {starting === 'exam' ? 'Menyiapkan...' : 'Mode ujian'}</button>
        </div>
      </section>

      <div className="grid gap-3 sm:grid-cols-2" role="group" aria-label="Saring soal salah">
        <label className="text-sm font-semibold">Mata kuliah
          <select className="input mt-1 w-full" value={subject} onChange={(e) => onFilter({ subject: e.target.value, chapter: '' })}>
            <option value="">Semua mata kuliah ({data.total})</option>
            {data.subjects.map((s) => <option key={s.id} value={s.id}>{s.name} ({s.count})</option>)}
          </select>
        </label>
        <label className="text-sm font-semibold">BAB
          <select className="input mt-1 w-full" value={chapter} onChange={(e) => onFilter({ subject, chapter: e.target.value })} disabled={!chosenSubject}>
            <option value="">{chosenSubject ? `Semua BAB (${chosenSubject.count})` : 'Pilih mata kuliah dulu'}</option>
            {(chosenSubject?.chapters || []).map((c) => <option key={c.id} value={c.id}>{c.title} ({c.count})</option>)}
          </select>
        </label>
      </div>
      <Alert>{error}</Alert>

      <p className="text-sm text-ink-muted" role="status">{filtered ? `${data.count} soal di pilihan ini` : `${data.count} soal`} · halaman {data.page} dari {data.totalPages}</p>
      <div className="space-y-5">
        {data.items.map((it, i) => (
          <article key={it.id} className="space-y-2">
            <p className="flex flex-wrap items-center gap-x-2 gap-y-1 text-xs text-ink-muted">
              <span className="inline-flex items-center gap-1 font-semibold text-ink"><BookOpen size={13} aria-hidden /> {it.subject.name}</span>
              <span>· {it.chapter.title}</span>
              {it.times > 1 && <span className="rounded-full bg-coral-soft px-2 py-0.5 font-bold text-coral">salah {it.times}×</span>}
              {it.attempt && <span>· <Link to={`/kerjakan/${it.attempt.id}`} className="font-semibold text-brand underline">{it.attempt.title}</Link> ({KIND[it.attempt.kind] || 'latihan'}, {fmtDateTime(it.answeredAt)})</span>}
            </p>
            <QuestionView q={it.question} index={(data.page - 1) * PER_PAGE + i} total={data.count} value={it.response} onChange={() => {}} revealed disabled result={{ correct: false, scored: true, detail: it.detail }} onReport={() => setReport(it.id)} />
          </article>
        ))}
      </div>

      {data.totalPages > 1 && (
        <div className="flex justify-center gap-2">
          <button type="button" className="btn-secondary btn-sm" disabled={data.page <= 1} onClick={() => { onFilter({ subject, chapter, page: data.page - 1 }); window.scrollTo(0, 0); }}>Sebelumnya</button>
          <span className="self-center text-sm text-ink-muted">Halaman {data.page} dari {data.totalPages}</span>
          <button type="button" className="btn-secondary btn-sm" disabled={data.page >= data.totalPages} onClick={() => { onFilter({ subject, chapter, page: data.page + 1 }); window.scrollTo(0, 0); }}>Berikutnya <ArrowRight size={14} aria-hidden /></button>
        </div>
      )}
      {report && <ReportDialog questionId={report} onClose={() => setReport(null)} />}
    </div>
  );
}
