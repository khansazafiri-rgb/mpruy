import { useEffect, useState } from 'react';
import { Alert, Field, Modal, PageLoader } from '@/components/ui';
import RichContent from '@/components/RichContent';
import { api } from '@/lib/api';

const STATUS = { empty: 'Belum dibuat', draft: 'Draf, belum tampil ke pengguna', reviewed: 'Sudah diperiksa dan ditayangkan', stale: 'Sumber atau kamus berubah, perlu diperiksa ulang' };

export default function EnglishExplanationEditor({ questionId, kind, onClose }) {
  const [data, setData] = useState(null);
  const [parts, setParts] = useState([]);
  const [terms, setTerms] = useState('');
  const [confirmed, setConfirmed] = useState(false);
  const [sendConfirmed, setSendConfirmed] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const [message, setMessage] = useState('');
  const path = kind === 'case' ? `admin/sim/cases/${questionId}/english` : `admin/questions/${questionId}/english`;
  const accept = (d) => { setData(d); setParts(d.segments); setTerms(d.protectedTerms.join('\n')); setConfirmed(false); };
  useEffect(() => { api(path).then(accept).catch((e) => setError(e.message)); }, [path]);

  const run = async (action) => {
    setBusy(true); setError(''); setMessage('');
    try {
      const d = await api(action === 'generate' ? `${path}/generate` : path, {
        method: 'POST', body: {
          action, sourceHash: data.sourceHash, revision: data.revision,
          protectedTerms: terms.split(/\r?\n/).map((s) => s.trim()).filter(Boolean),
          segments: parts.map(({ id, text }) => ({ id, text })), reviewConfirmed: confirmed, sendConfirmed,
        },
      });
      accept(d);
      setMessage(action === 'review' ? 'Versi Inggris sudah ditayangkan.' : 'Draf tersimpan. Periksa setiap bagian sebelum menayangkan.');
    } catch (e) { setError(e.message); } finally { setBusy(false); }
  };
  const edit = (id, text) => {
    setParts((p) => p.map((s) => s.id === id ? { ...s, text } : s));
    setConfirmed(false); setMessage('');
  };
  const complete = parts.length > 0 && parts.every((s) => s.text.trim());
  return (
    <Modal open size="xl" title="Versi Inggris" onClose={busy ? () => {} : onClose} footer={<>
      <button type="button" className="btn-ghost" disabled={busy} onClick={onClose}>Tutup</button>
      <button type="button" className="btn-secondary" disabled={busy || !data || !parts.length} onClick={() => run('draft')}>Simpan draf</button>
      <button type="button" className="btn-primary" disabled={busy || !confirmed || !complete} onClick={() => run('review')}>{busy ? 'Memproses...' : 'Tayangkan hasil pemeriksaan'}</button>
    </>}>
      <div className="space-y-5">
        <Alert>{error}</Alert><Alert kind="success">{message}</Alert>
        {!data ? !error && <PageLoader /> : <>
          <p className="text-sm font-semibold">{STATUS[data.status]}</p>
          {data.status === 'stale' && <Alert kind="warn">Versi Inggris sebelumnya disembunyikan karena sumber atau kamus berubah. Bandingkan lagi dengan sumber terbaru sebelum menayangkan.</Alert>}
          <details className="rounded-xl border border-line p-4">
            <summary className="cursor-pointer font-semibold">Konteks materi · {data.subjectName}</summary>
            <div className="mt-3"><RichContent value={data.question.stem} /></div>
            {data.question.statements?.map((s, i) => <div key={i} className="mt-2">({i + 1}) <RichContent value={s} /></div>)}
            {data.question.options?.map((o) => <div key={o.label} className="mt-2">{o.label}. <RichContent value={o.text} /></div>)}
            <p className="mt-2 text-sm font-semibold">Kunci: {data.question.answer || 'lihat subsoal'}</p>
            {data.question.subQuestions?.map((s) => <div key={s.label} className="mt-2"><RichContent value={s.question} /><p className="text-sm">Kunci {s.label}: {(s.validAnswers || []).join(' / ')}</p></div>)}
          </details>
          <Field label="Istilah khusus materi ini yang wajib tetap sama" htmlFor="english-terms" hint="Satu istilah per baris. Tambahkan istilah anatomi, nama obat, atau istilah ilmiah yang harus dipertahankan persis.">
            <textarea id="english-terms" className="input" rows={3} maxLength={6000} disabled={busy} value={terms} onChange={(e) => { setTerms(e.target.value); setConfirmed(false); }} placeholder={'nervus medianus\ncurah jantung'} />
          </Field>
          {data.glossary.length > 0 && <p className="text-sm text-ink-muted">Kamus bersama: {data.glossary.join(' · ')}</p>}
          <section className="space-y-3 rounded-xl bg-page p-4">
            <p className="text-sm">Bantuan draf membaca seluruh materi sumber sebagai konteks, termasuk kunci soal atau aturan kasus. Hasilnya tetap perlu diperiksa.</p>
            {data.generatorConfigured ? <>
              <label className="flex items-start gap-2 text-sm"><input type="checkbox" disabled={busy} checked={sendConfirmed} onChange={(e) => setSendConfirmed(e.target.checked)} /> Saya setuju materi sumber dan konteksnya dikirim ke OpenAI untuk membuat draf Inggris.</label>
              <button type="button" className="btn-secondary btn-sm" disabled={busy || !sendConfirmed || !parts.length} onClick={() => {
                if (!parts.some((s) => s.text.trim()) || window.confirm('Ganti draf yang sedang ditulis dengan draf baru? Simpan dulu bila ingin mempertahankannya.')) run('generate');
              }}>Buat draf Inggris</button>
            </> : <p className="text-sm text-ink-muted">Bantuan draf belum diaktifkan oleh pengelola server. Kamu tetap bisa menulis dan memeriksa terjemahan di bawah.</p>}
          </section>
          {data.notes.map((note, i) => <Alert key={i} kind="warn">Catatan draf: {note}</Alert>)}
          {!parts.length && <Alert kind="info">Tambahkan materi sumber terlebih dahulu.</Alert>}
          {parts.map((s, i) => <section key={s.id} className="space-y-3 rounded-xl border border-line p-4">
            <h3 className="font-semibold">{s.label}{parts.filter((p) => p.label === s.label).length > 1 ? ` · bagian ${i + 1}` : ''}</h3>
            <div className="grid gap-4 md:grid-cols-2">
              <div><p className="mb-2 text-xs font-semibold text-ink-muted">SUMBER</p><RichContent value={s.source} /></div>
              <Field label="Versi Inggris" htmlFor={`english-part-${i}`}><textarea id={`english-part-${i}`} lang="en" className="input min-h-[120px]" disabled={busy} value={s.text} onChange={(e) => edit(s.id, e.target.value)} /></Field>
            </div>
            {s.keep.length > 0 && <p className="text-xs text-ink-muted">Pertahankan: {s.keep.join(' · ')}</p>}
          </section>)}
          {data.errors.length > 0 && <Alert kind="warn">Pemeriksaan draf terakhir: {data.errors.slice(0, 8).join(' ')}</Alert>}
          <label className="flex items-start gap-3 rounded-xl border border-line p-4 text-sm"><input type="checkbox" checked={confirmed} disabled={busy || !complete} onChange={(e) => setConfirmed(e.target.checked)} /> Saya sudah membandingkan seluruh materi dengan sumber dan memastikan makna, negasi, istilah ilmiah, angka, satuan, dan alasan klinis tetap tepat.</label>
        </>}
      </div>
    </Modal>
  );
}
