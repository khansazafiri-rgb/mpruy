// Impor soal massal: tempel kode atau unggah file JSON, pratinjau, lalu simpan.
// Bentuk yang diterima dijelaskan di docs/FORMAT_SOAL.md.
import { CheckCircle2, ChevronDown, ChevronRight, FileUp, XCircle } from 'lucide-react';
import { useEffect, useState } from 'react';
import { Alert, Field } from '@/components/ui';
import { api } from '@/lib/api';
import { DIFF, QTYPE } from '@/lib/labels';
import { plainText } from '@/lib/markup';
import CampusMulti from './CampusMulti';
import QuestionPreview from './QuestionPreview';
import { useCatalog } from './useCatalog';

const CONTOH = `[
  {
    chapter: "Osteologi",
    type: "A",
    difficulty: "easy",
    text: "Tulang terpanjang pada tubuh manusia adalah",
    options: [
      { text: "Femur", correct: true, explanation: "Femur adalah tulang terpanjang." },
      "Tibia", "Humerus", "Fibula", "Radius",
    ],
    explanation: [
      { type: "paragraph", text: "Panjang femur kira-kira **seperempat** tinggi badan." },
      { type: "note", variant: "highyield", text: "Fraktur collum femoris sering pada lansia." },
    ],
  },
  {
    chapter: "Osteologi",
    type: "K",
    difficulty: "medium",
    text: "Pernyataan berikut tentang os coxae yang benar adalah",
    statements: ["Terdiri dari ilium, ischium, pubis", "Acetabulum dibentuk oleh tiga tulang", "Termasuk tulang pipih", "Bersendi dengan humerus"],
    trueStatements: [1, 2, 3],
  },
]`;

function Item({ it }) {
  const [open, setOpen] = useState(!it.ok);
  const q = it.question;
  return (
    <li className={`rounded-xl border ${it.ok ? 'border-line' : 'border-coral/50 bg-coral-soft/40'}`}>
      <button type="button" onClick={() => setOpen((v) => !v)} className="flex w-full items-start gap-2 p-3 text-left">
        {it.ok ? <CheckCircle2 size={18} className="mt-0.5 shrink-0 text-brand" /> : <XCircle size={18} className="mt-0.5 shrink-0 text-coral" />}
        <span className="min-w-0 flex-1">
          <span className="block text-sm font-semibold">#{it.index} {q ? `· ${QTYPE[q.qtype] || q.qtype} · ${DIFF[q.difficulty] || ''} · ${it.chapterTitle || 'tanpa BAB'}` : ''}</span>
          <span className="block truncate text-sm text-ink-muted">{q ? plainText(q.stem).slice(0, 140) : ''}</span>
          {it.errors.map((e) => <span key={e} className="block text-sm font-medium text-coral">{e}</span>)}
          {it.warnings.length > 0 && <span className="block text-xs text-[#7a5a00]">{it.warnings.length} peringatan</span>}
        </span>
        {open ? <ChevronDown size={18} /> : <ChevronRight size={18} />}
      </button>
      {open && (
        <div className="space-y-2 border-t border-line p-3">
          {it.warnings.map((w) => <p key={w} className="text-xs text-[#7a5a00]">• {w}</p>)}
          {q && it.ok && <QuestionPreview q={q} index={it.index - 1} />}
        </div>
      )}
    </li>
  );
}

// presetSubject: mata kuliah terpilih dari awal. drillingOnly: BAB tetap Drilling (soal General tanpa BAB).
export default function ImportPanel({ submission = null, onDone, presetSubject = '', drillingOnly = false }) {
  const { subjects, chapters, chapterChoicesOf, reload } = useCatalog();
  const [subject, setSubject] = useState(presetSubject);
  const [chapter, setChapter] = useState('');
  const [scope, setScope] = useState('all');
  const [campuses, setCampuses] = useState([]);
  const [status, setStatus] = useState('published');
  const [text, setText] = useState('');
  const [preview, setPreview] = useState(null);
  const [skip, setSkip] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const [result, setResult] = useState(null);
  const subj = submission ? submission.subject : subject;
  // Dengan drillingOnly, BAB otomatis BAB Drilling mata kuliah itu begitu daftar BAB termuat.
  const drillingId = chapters.find((c) => c.subject === subj && c.drilling)?.id || '';
  useEffect(() => { if (drillingOnly) setChapter(drillingId); }, [drillingOnly, drillingId]);
  const toDrilling = !!chapterChoicesOf(subj).find((c) => c.id === chapter)?.drilling;

  const body = (dryRun) => ({
    text, dryRun, skipInvalid: skip, status, chapter,
    ...(submission ? { submission: submission.id } : { subject, scope: toDrilling ? 'all' : scope, campuses: toDrilling ? [] : campuses }),
  });

  const run = async (dryRun) => {
    setError(''); setResult(null);
    if (!subj) { setError('Pilih mata kuliah dulu.'); return; }
    if (!text.trim()) { setError('Tempel kode soal atau pilih file dulu.'); return; }
    setBusy(true);
    try {
      const r = await api('admin/import', { method: 'POST', body: body(dryRun) });
      if (dryRun) setPreview(r);
      else { setResult(r); setPreview(null); setText(''); reload(); onDone?.(r); }
    } catch (e) {
      setError(e.message);
      if (e.body?.items) setPreview(e.body);
    } finally { setBusy(false); }
  };

  const readFile = async (f) => {
    if (!f) return;
    if (f.size > 5 * 1048576) { setError('File lebih dari 5 MB. Pecah per BAB.'); return; }
    setText(await f.text());
    setPreview(null);
  };

  return (
    <div className="space-y-4">
      {submission ? (
        <Alert kind="info">Impor untuk pengajuan <b>{submission.code}</b> ({submission.subjectName}). Pembatasan kampus otomatis mengikuti pilihan pengaju: {submission.scope === 'campus' ? `hanya ${submission.campusName}` : 'General'}. Kampus yang tertulis di file diabaikan. Soal General boleh dimasukkan ke Drilling (pilih BAB Drilling).</Alert>
      ) : (
        <div className="grid gap-3 md:grid-cols-3">
          <Field label="Mata kuliah" htmlFor="im-subj">
            <select id="im-subj" className="input" value={subject} onChange={(e) => { setSubject(e.target.value); setChapter(''); }} disabled={!!presetSubject}>
              <option value="">Pilih mata kuliah</option>
              {subjects.map((s) => <option key={s.id} value={s.id}>{s.name}</option>)}
            </select>
          </Field>
          <Field label="Pembatasan kampus" htmlFor="im-scope">
            <select id="im-scope" className="input" value={toDrilling ? 'all' : scope} disabled={toDrilling} onChange={(e) => setScope(e.target.value)}>
              <option value="all">Soal General (semua pengguna)</option>
              <option value="campus">Hanya kampus tertentu</option>
            </select>
          </Field>
          <Field label="Status" htmlFor="im-status">
            <select id="im-status" className="input" value={status} onChange={(e) => setStatus(e.target.value)}>
              <option value="published">Langsung tayang</option>
              <option value="draft">Simpan sebagai draf</option>
            </select>
          </Field>
        </div>
      )}
      {!submission && !toDrilling && scope === 'campus' && <Field label="Kampus yang boleh melihat"><CampusMulti value={campuses} onChange={setCampuses} /></Field>}
      <Field label="BAB" htmlFor="im-ch" hint="Pilih satu BAB untuk memasukkan semua soal ke BAB itu, atau biarkan mengikuti field chapter di tiap soal (BAB baru dibuat otomatis). Pilih Drilling untuk soal General tanpa BAB.">
        <select id="im-ch" className="input" value={chapter} onChange={(e) => setChapter(e.target.value)} disabled={!subj || drillingOnly}>
          {!drillingOnly && <option value="">Ikuti field BAB di file</option>}
          {chapterChoicesOf(subj).filter((c) => !drillingOnly || c.drilling).map((c) => <option key={c.id} value={c.id}>{c.label}</option>)}
        </select>
      </Field>
      <Field label="Kode soal" htmlFor="im-text" hint="JSON murni atau array JavaScript (kunci tanpa tanda kutip, koma di akhir boleh). Nama field lama PCV Classroom, Web Olimp, dan Event/Lomba juga diterima.">
        <textarea id="im-text" className="input min-h-[220px] font-mono text-[13px]" value={text} onChange={(e) => { setText(e.target.value); setPreview(null); }} placeholder={CONTOH} spellCheck={false} />
      </Field>
      <div className="flex flex-wrap items-center gap-2">
        <label className="btn-secondary btn-sm cursor-pointer"><FileUp size={15} /> Pilih file .json / .js / .txt<input type="file" accept=".json,.js,.txt,application/json,text/plain" className="sr-only" onChange={(e) => readFile(e.target.files?.[0])} /></label>
        <button type="button" className="btn-ghost btn-sm" onClick={() => setText(CONTOH)}>Isi contoh</button>
        <button type="button" className="btn-primary ml-auto" onClick={() => run(true)} disabled={busy}>{busy ? 'Memeriksa...' : 'Pratinjau'}</button>
      </div>
      <Alert>{error}</Alert>
      {result && <Alert kind="success">{result.created} soal tersimpan{result.chaptersCreated ? `, ${result.chaptersCreated} BAB baru dibuat` : ''}{result.duplicates ? `, ${result.duplicates} duplikat dilewati` : ''}.</Alert>}

      {preview && (
        <div className="space-y-3">
          <div className="flex flex-wrap items-center gap-2 rounded-xl bg-page p-3 text-sm">
            <span><b>{preview.total}</b> soal terbaca</span>·<span className="text-brand-dark"><b>{preview.valid}</b> valid</span>·
            <span className="text-coral"><b>{preview.invalid}</b> bermasalah</span>
            {preview.duplicates > 0 && <>·<span><b>{preview.duplicates}</b> duplikat</span></>}
            {preview.newChapters?.length > 0 && <span className="w-full text-ink-muted">BAB baru: {preview.newChapters.join(', ')}</span>}
            {(preview.warnings || []).map((w) => <span key={w} className="w-full text-[#7a5a00]">{w}</span>)}
          </div>
          <ul className="max-h-[60vh] space-y-2 overflow-y-auto pr-1">{(preview.items || []).map((it) => <Item key={it.index} it={it} />)}</ul>
          <div className="flex flex-wrap items-center gap-3">
            {preview.invalid > 0 && (
              <label className="flex items-center gap-2 text-sm"><input type="checkbox" checked={skip} onChange={(e) => setSkip(e.target.checked)} className="h-4 w-4 accent-[rgb(var(--brand))]" /> Lewati soal bermasalah, simpan yang valid saja</label>
            )}
            <button type="button" className="btn-primary ml-auto" onClick={() => run(false)} disabled={busy || !preview.valid || (preview.invalid > 0 && !skip)}>
              Simpan {preview.valid} soal{submission ? ' dan tandai pengajuan selesai' : ''}
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
