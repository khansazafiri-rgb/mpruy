// Penyunting catatan materi satu BAB. Pratinjau memakai tampilan yang sama
// dengan halaman "Pelajari materi" siswa, jadi yang terlihat di sini itulah
// yang dibaca siswa.
import { useEffect, useState } from 'react';
import ChapterNotes from '@/components/ChapterNotes';
import { Alert, Modal, Segmented, Spinner } from '@/components/ui';
import { errorText } from '@/lib/api';
import pb from '@/lib/pb';

const MAX = 200000;

export default function ChapterNotesEditor({ chapter, subjectName, onClose, onSaved }) {
  const [rec, setRec] = useState(null);
  const [text, setText] = useState('');
  const [view, setView] = useState('write');
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    let live = true;
    pb.collection('chapter_notes').getFirstListItem(pb.filter('chapter = {:c}', { c: chapter.id }), { requestKey: null })
      .then((r) => { if (live) { setRec(r); setText(r.content || ''); } })
      .catch((e) => { if (live && e.status !== 404) setError(errorText(e)); })
      .finally(() => live && setLoading(false));
    return () => { live = false; };
  }, [chapter.id]);

  const run = async (fn) => {
    setBusy(true); setError('');
    try { await fn(); onSaved?.(); onClose(); } catch (e) { setError(errorText(e)); } finally { setBusy(false); }
  };
  const save = () => run(() => (rec ? pb.collection('chapter_notes').update(rec.id, { content: text }) : pb.collection('chapter_notes').create({ chapter: chapter.id, content: text })));
  const remove = () => { if (window.confirm(`Hapus catatan materi BAB "${chapter.title}"? Siswa tidak akan melihatnya lagi.`)) run(() => pb.collection('chapter_notes').delete(rec.id)); };
  const empty = !text.trim();

  return (
    <Modal open size="xl" title={`Catatan materi · ${chapter.title}`} onClose={onClose} footer={<>
      {rec && <button type="button" className="btn-ghost mr-auto text-coral" onClick={remove} disabled={busy}>Hapus catatan</button>}
      <button type="button" className="btn-ghost" onClick={onClose}>Batal</button>
      <button type="button" className="btn-primary" onClick={save} disabled={busy || loading || (!rec && empty)} aria-busy={busy}>{rec ? 'Simpan perubahan' : 'Simpan catatan'}</button>
    </>}>
      {loading ? <Spinner /> : (
        <div className="space-y-4">
          <p className="text-sm text-ink-muted">{subjectName} · tampil di <b className="text-ink">Pelajari materi</b> begitu disimpan. Kosongkan isi untuk menyembunyikannya.</p>
          <Segmented className="sm:max-w-xs" label="Mode penyunting" value={view} onChange={setView} items={[{ value: 'write', label: 'Tulis' }, { value: 'preview', label: 'Pratinjau' }]} />
          {view === 'write' ? (
            <label className="block space-y-2">
              <span className="sr-only">Isi catatan</span>
              <textarea className="input min-h-[360px] font-mono text-sm leading-relaxed" maxLength={MAX} value={text} onChange={(e) => setText(e.target.value)} placeholder={'Tulis ringkasan BAB di sini.\n\n**Definisi**: ...\n==Poin penting== yang sering keluar di ujian.\n\nTempel tautan gambar Google Drive di baris sendiri untuk menampilkan gambar.'} />
              <span className="hint block">Format: **tebal**, *miring*, ==sorotan==, ~subskrip~, ^superskrip^, [teks](https://tautan). Catatan bergambar (judul, kotak sorot, gambar, high-yield) diawali baris <code>&lt;!-- materi:v2 --&gt;</code>; aturannya ada di docs/CATATAN_MATERI.md. {text.length.toLocaleString('id-ID')} / {MAX.toLocaleString('id-ID')} karakter.</span>
            </label>
          ) : (
            <div className="card-quiet max-h-[60vh] overflow-y-auto p-5">{empty ? <p className="text-sm text-ink-muted">Belum ada isi untuk dipratinjau.</p> : <ChapterNotes content={text} className="is-compact" />}</div>
          )}
          <Alert>{error}</Alert>
        </div>
      )}
    </Modal>
  );
}
