// Form satu soal (Edit Soal). Bidang konten menerima teks biasa (dengan
// **tebal**, ~sub~, ^sup^, ==sorotan==, HTML sederhana) atau JSON daftar blok
// untuk tabel, kotak catatan, gambar, dsb. Pratinjau di kanan merender persis
// seperti tampilan pengguna.
import { Plus, Trash2 } from 'lucide-react';
import { useMemo, useState } from 'react';
import { Alert, Field, Modal } from '@/components/ui';
import { api } from '@/lib/api';
import { driveToLh3 } from '@/lib/markup';
import CampusMulti from './CampusMulti';
import QuestionPreview from './QuestionPreview';
import { useCatalog } from './useCatalog';

const LETTERS = ['A', 'B', 'C', 'D', 'E'];
const K_DEFAULT = ['(1), (2), dan (3) benar', '(1) dan (3) benar', '(2) dan (4) benar', 'Hanya (4) benar', 'Semua benar'];

// Konten -> teks di kotak isian.
const toField = (v) => (Array.isArray(v) ? JSON.stringify(v, null, 2) : v || '');
// Teks di kotak isian -> konten (blok JSON bila diawali "[").
function fromField(t) {
  const s = String(t || '').trim();
  if (s.startsWith('[')) {
    try { const v = JSON.parse(s); if (Array.isArray(v)) return v; } catch { /* tetap teks */ }
  }
  return t || '';
}
function isBadJson(t) {
  const s = String(t || '').trim();
  if (!s.startsWith('[')) return false;
  try { JSON.parse(s); return false; } catch { return true; }
}

function fromRecord(r, defaults) {
  if (!r) {
    return {
      subject: defaults.subject || '', chapter: defaults.chapter || '', qtype: 'A', difficulty: 'medium', status: 'published', scope: 'all', campuses: [], code: '',
      stem: '', image: '', hint: '', explanation: '', statements: ['', '', '', ''], answer: 'A',
      options: LETTERS.slice(0, 4).map(() => ({ text: '', explanation: '' })),
      subQuestions: [{ label: 'A', question: '', validAnswers: '', answerCount: 1, explanation: '', keyPoints: '' }],
    };
  }
  return {
    subject: r.subject, chapter: r.chapter, qtype: r.qtype, difficulty: r.difficulty, status: r.status, scope: r.scope, campuses: r.campuses || [], code: r.code || '',
    stem: toField(r.stem), image: r.image || '', hint: r.hint || '', explanation: toField(r.explanation),
    statements: r.qtype === 'K' ? (r.statements || []).map(toField).concat(['', '', '', '']).slice(0, 4) : ['', '', '', ''],
    answer: r.answer || 'A',
    options: (r.options?.length ? r.options : LETTERS.slice(0, 4).map((l) => ({ label: l, text: '' }))).map((o) => ({ text: toField(o.text), explanation: toField(o.explanation) })),
    subQuestions: (r.subQuestions?.length ? r.subQuestions : [{ label: 'A' }]).map((s) => ({
      label: s.label || 'A', question: s.question || '', validAnswers: (s.validAnswers || []).join('\n'), answerCount: s.answerCount || 1,
      explanation: toField(s.explanation), keyPoints: (s.keyPoints || []).join('\n'),
    })),
  };
}

// Form -> bentuk impor yang dinormalkan server.
function toQuestion(f) {
  const base = { type: f.qtype, difficulty: f.difficulty, text: fromField(f.stem), imageUrl: f.image, hint: f.hint, explanation: fromField(f.explanation), code: f.code };
  if (f.qtype === 'A' || f.qtype === 'K') {
    const opts = f.options.map((o, i) => ({ text: fromField(o.text), explanation: fromField(o.explanation), correct: LETTERS[i] === f.answer }));
    return { ...base, options: opts, ...(f.qtype === 'K' ? { statements: f.statements.map(fromField) } : {}) };
  }
  return {
    ...base,
    subQuestions: f.subQuestions.map((s) => ({
      label: s.label, question: s.question,
      validAnswers: String(s.validAnswers || '').split('\n').map((x) => x.trim()).filter(Boolean),
      answerCount: Number(s.answerCount) || 1,
      explanation: fromField(s.explanation),
      keyPoints: String(s.keyPoints || '').split('\n').map((x) => x.trim()).filter(Boolean),
    })),
  };
}

// Pratinjau lokal: tidak menunggu server.
function previewModel(f, chapterTitle) {
  const q = toQuestion(f);
  return {
    qtype: f.qtype, difficulty: f.difficulty, chapterTitle, stem: q.text, image: driveToLh3(f.image), hint: f.hint, explanation: q.explanation,
    statements: q.statements || [], answer: f.answer,
    options: (q.options || []).map((o, i) => ({ label: LETTERS[i], text: o.text, explanation: o.explanation })),
    subQuestions: q.subQuestions || [],
  };
}

function Area({ label, value, onChange, rows = 3, hint, id }) {
  return (
    <Field label={label} htmlFor={id} hint={hint} error={isBadJson(value) ? 'Diawali "[" tapi bukan JSON yang sah. Periksa tanda kutip dan koma.' : ''}>
      <textarea id={id} className="input font-[450]" rows={rows} value={value} onChange={(e) => onChange(e.target.value)} />
    </Field>
  );
}

export default function QuestionEditor({ record, defaults = {}, onClose, onSaved }) {
  const { subjects, chaptersOf } = useCatalog();
  const [f, setF] = useState(() => fromRecord(record, defaults));
  const [error, setError] = useState('');
  const [warnings, setWarnings] = useState([]);
  const [busy, setBusy] = useState(false);
  const set = (k, v) => setF((x) => ({ ...x, [k]: v }));
  const setOpt = (i, k, v) => setF((x) => ({ ...x, options: x.options.map((o, j) => (j === i ? { ...o, [k]: v } : o)) }));
  const setSub = (i, k, v) => setF((x) => ({ ...x, subQuestions: x.subQuestions.map((o, j) => (j === i ? { ...o, [k]: v } : o)) }));
  const chapterTitle = chaptersOf(f.subject).find((c) => c.id === f.chapter)?.title || '';
  const pv = useMemo(() => previewModel(f, chapterTitle), [f, chapterTitle]);

  const changeType = (t) => setF((x) => {
    const n = { ...x, qtype: t };
    if (t === 'K' && x.qtype !== 'K') n.options = K_DEFAULT.map((text) => ({ text, explanation: '' }));
    if (t === 'A' && x.qtype === 'K') n.options = LETTERS.slice(0, 4).map(() => ({ text: '', explanation: '' }));
    return n;
  });

  const save = async () => {
    setError(''); setWarnings([]);
    setBusy(true);
    try {
      const body = { subject: f.subject, chapter: f.chapter, scope: f.scope, campuses: f.campuses, status: f.status, code: f.code, question: toQuestion(f) };
      const r = record ? await api(`admin/questions/${record.id}`, { method: 'PATCH', body }) : await api('admin/questions', { method: 'POST', body });
      onSaved(r);
    } catch (e) { setError(e.message); setBusy(false); }
  };
  const remove = async () => {
    if (!window.confirm('Hapus soal ini? Riwayat jawaban pengguna untuk soal ini ikut terhapus.')) return;
    try { await api(`admin/questions/${record.id}`, { method: 'DELETE' }); onSaved(null); } catch (e) { setError(e.message); }
  };

  const choice = f.qtype === 'A' || f.qtype === 'K';
  return (
    <Modal open size="xl" title={record ? 'Ubah soal' : 'Tambah soal'} onClose={onClose} footer={<>
      {record && <button type="button" className="btn-ghost mr-auto text-coral" onClick={remove}><Trash2 size={16} /> Hapus</button>}
      <button type="button" className="btn-ghost" onClick={onClose}>Batal</button>
      <button type="button" className="btn-primary" onClick={save} disabled={busy}>{busy ? 'Menyimpan...' : 'Simpan soal'}</button>
    </>}>
      <div className="grid gap-6 lg:grid-cols-2">
        <div className="space-y-4">
          <div className="grid grid-cols-2 gap-3">
            <Field label="Mata kuliah" htmlFor="qe-s"><select id="qe-s" className="input" value={f.subject} onChange={(e) => { set('subject', e.target.value); set('chapter', ''); }}><option value="">Pilih</option>{subjects.map((s) => <option key={s.id} value={s.id}>{s.name}</option>)}</select></Field>
            <Field label="BAB" htmlFor="qe-c"><select id="qe-c" className="input" value={f.chapter} onChange={(e) => set('chapter', e.target.value)}><option value="">Pilih</option>{chaptersOf(f.subject).map((c) => <option key={c.id} value={c.id}>{c.title}</option>)}</select></Field>
            <Field label="Tipe" htmlFor="qe-t"><select id="qe-t" className="input" value={f.qtype} onChange={(e) => changeType(e.target.value)}><option value="A">Tipe A (A-E)</option><option value="K">Tipe K (pernyataan 1-4)</option><option value="isian">Isian singkat</option><option value="esai">Esai (tidak dinilai)</option></select></Field>
            <Field label="Tingkat kesulitan" htmlFor="qe-d"><select id="qe-d" className="input" value={f.difficulty} onChange={(e) => set('difficulty', e.target.value)}><option value="easy">Easy</option><option value="medium">Medium</option><option value="hard">Hard</option></select></Field>
            <Field label="Status" htmlFor="qe-st"><select id="qe-st" className="input" value={f.status} onChange={(e) => set('status', e.target.value)}><option value="published">Tayang</option><option value="draft">Draf</option></select></Field>
            <Field label="Dilihat oleh" htmlFor="qe-sc"><select id="qe-sc" className="input" value={f.scope} onChange={(e) => set('scope', e.target.value)}><option value="all">Semua kampus</option><option value="campus">Kampus tertentu</option></select></Field>
          </div>
          {f.scope === 'campus' && <Field label="Kampus"><CampusMulti value={f.campuses} onChange={(v) => set('campuses', v)} /></Field>}
          <Area id="qe-stem" label="Teks soal" rows={5} value={f.stem} onChange={(v) => set('stem', v)} hint='Teks biasa, atau JSON blok diawali "[" untuk tabel/gambar/catatan.' />
          <Field label="Tautan gambar soal (opsional)" htmlFor="qe-img" hint="Tautan Google Drive otomatis diubah ke format lh3.">
            <input id="qe-img" className="input" value={f.image} onChange={(e) => set('image', e.target.value)} placeholder="https://drive.google.com/file/d/..." />
          </Field>
          {f.qtype === 'K' && (
            <div className="space-y-2">
              <p className="label">Pernyataan</p>
              {f.statements.map((s, i) => (
                <input key={i} className="input" value={s} onChange={(e) => set('statements', f.statements.map((x, j) => (j === i ? e.target.value : x)))} placeholder={`Pernyataan (${i + 1})`} aria-label={`Pernyataan ${i + 1}`} />
              ))}
            </div>
          )}
          {choice && (
            <div className="space-y-3">
              <p className="label">Pilihan jawaban (pilih kuncinya)</p>
              {f.options.map((o, i) => (
                <div key={i} className="rounded-xl border border-line p-3">
                  <div className="flex items-center gap-2">
                    <label className="flex items-center gap-1.5 text-sm font-bold">
                      <input type="radio" name="answer" checked={f.answer === LETTERS[i]} onChange={() => set('answer', LETTERS[i])} className="accent-[rgb(var(--brand))]" /> {LETTERS[i]}
                    </label>
                    <input className="input py-2" value={o.text} onChange={(e) => setOpt(i, 'text', e.target.value)} placeholder={`Teks opsi ${LETTERS[i]}`} aria-label={`Opsi ${LETTERS[i]}`} />
                    {f.qtype === 'A' && f.options.length > 2 && <button type="button" className="rounded p-1.5 text-ink-muted hover:text-coral" onClick={() => setF((x) => ({ ...x, options: x.options.filter((_, j) => j !== i), answer: x.answer === LETTERS[i] ? 'A' : x.answer }))} aria-label={`Hapus opsi ${LETTERS[i]}`}><Trash2 size={15} /></button>}
                  </div>
                  <input className="input mt-2 py-1.5 text-sm" value={o.explanation} onChange={(e) => setOpt(i, 'explanation', e.target.value)} placeholder="Pembahasan opsi ini (opsional)" aria-label={`Pembahasan opsi ${LETTERS[i]}`} />
                </div>
              ))}
              {f.qtype === 'A' && f.options.length < 5 && <button type="button" className="btn-ghost btn-sm" onClick={() => setF((x) => ({ ...x, options: [...x.options, { text: '', explanation: '' }] }))}><Plus size={15} /> Tambah opsi</button>}
            </div>
          )}
          {!choice && (
            <div className="space-y-3">
              <p className="label">Sub-pertanyaan</p>
              {f.subQuestions.map((s, i) => (
                <div key={i} className="space-y-2 rounded-xl border border-line p-3">
                  <div className="flex gap-2">
                    <input className="input w-16 py-2" value={s.label} onChange={(e) => setSub(i, 'label', e.target.value)} aria-label="Label" />
                    <input className="input py-2" value={s.question} onChange={(e) => setSub(i, 'question', e.target.value)} placeholder="Pertanyaan" aria-label="Pertanyaan" />
                    {f.subQuestions.length > 1 && <button type="button" className="rounded p-1.5 text-ink-muted hover:text-coral" onClick={() => setF((x) => ({ ...x, subQuestions: x.subQuestions.filter((_, j) => j !== i) }))} aria-label="Hapus sub-pertanyaan"><Trash2 size={15} /></button>}
                  </div>
                  <textarea className="input text-sm" rows={3} value={s.validAnswers} onChange={(e) => setSub(i, 'validAnswers', e.target.value)} placeholder={f.qtype === 'isian' ? 'Jawaban yang diterima, satu per baris. Ejaan lain dipisah " / ". Awali "=" agar wajib persis.' : 'Kunci jawaban utama, satu per baris'} aria-label="Kunci" />
                  {f.qtype === 'isian' && <label className="flex items-center gap-2 text-sm">Jumlah kotak jawaban <input type="number" min={1} max={20} className="input w-20 py-1" value={s.answerCount} onChange={(e) => setSub(i, 'answerCount', e.target.value)} /></label>}
                  {f.qtype === 'esai' && <textarea className="input text-sm" rows={2} value={s.keyPoints} onChange={(e) => setSub(i, 'keyPoints', e.target.value)} placeholder="Poin kunci, satu per baris (opsional)" aria-label="Poin kunci" />}
                  <input className="input py-1.5 text-sm" value={s.explanation} onChange={(e) => setSub(i, 'explanation', e.target.value)} placeholder="Pembahasan (opsional)" aria-label="Pembahasan sub-pertanyaan" />
                </div>
              ))}
              <button type="button" className="btn-ghost btn-sm" onClick={() => setF((x) => ({ ...x, subQuestions: [...x.subQuestions, { label: LETTERS[x.subQuestions.length] || String(x.subQuestions.length + 1), question: '', validAnswers: '', answerCount: 1, explanation: '', keyPoints: '' }] }))}><Plus size={15} /> Tambah sub-pertanyaan</button>
            </div>
          )}
          <Area id="qe-ex" label="Pembahasan" rows={5} value={f.explanation} onChange={(v) => set('explanation', v)} />
          <Field label="Petunjuk (opsional)" htmlFor="qe-h"><input id="qe-h" className="input" value={f.hint} onChange={(e) => set('hint', e.target.value)} /></Field>
          <Field label="Kode soal (opsional)" htmlFor="qe-code" hint="Dipakai untuk mencegah soal dobel saat impor ulang."><input id="qe-code" className="input" value={f.code} onChange={(e) => set('code', e.target.value)} /></Field>
          <Alert>{error}</Alert>
          {warnings.map((w) => <Alert key={w} kind="warn">{w}</Alert>)}
        </div>
        <div>
          <p className="label">Pratinjau tampilan pengguna</p>
          <div className="lg:sticky lg:top-0"><QuestionPreview q={pv} /></div>
        </div>
      </div>
    </Modal>
  );
}
