// Admin > Drilling > Materi: berkas materi (slide PPT + penjelasan) satu mata kuliah. Impor JSON (dengan pemeriksaan
// dulu), tayang/draf, pembatasan kampus, pratinjau, dan hapus. Format ada di docs/MATERI_SLIDE.md.
import { Eye, EyeOff, FilePlus2, FileUp, Trash2 } from 'lucide-react';
import { useCallback, useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { Alert, Badge, Field, Modal, PageLoader } from '@/components/ui';
import { api, errorText } from '@/lib/api';
import CampusMulti from './CampusMulti';

const EXAMPLE = `{
  "title": "Sistem Muskuloskeletal – Kuliah 1",
  "slides": [
    {
      "image": "https://lh3.googleusercontent.com/d/FILE_ID",
      "explanation": "Tulang punya **empat fungsi** utama:\\n1. Penyokong tubuh\\n\\t- rangka aksial\\n\\t- rangka apendikular\\n2. Pelindung organ 🛡️"
    }
  ]
}`;

export default function DrillingDecks({ subject, onChanged }) {
  const [items, setItems] = useState(null);
  const [error, setError] = useState('');
  const [note, setNote] = useState('');
  const [busy, setBusy] = useState(false);
  const [form, setForm] = useState({ open: false, text: '', scope: 'all', campuses: [], status: 'published' });
  const [check, setCheck] = useState(null);
  const load = useCallback(() => api(`admin/drilling/decks?subject=${subject.id}`).then((d) => { setItems(d.items); setError(''); }).catch((e) => setError(errorText(e))), [subject.id]);
  useEffect(() => { load(); }, [load]);
  const set = (patch) => setForm((f) => ({ ...f, ...patch }));

  const act = async (fn, done) => {
    setBusy(true); setError(''); setNote('');
    try { await fn(); await load(); onChanged?.(); if (done) setNote(done); } catch (e) { setError(errorText(e)); } finally { setBusy(false); }
  };
  const body = (dryRun) => ({ subject: subject.id, text: form.text, scope: form.scope, campuses: form.campuses, status: form.status, dryRun });
  const test = async () => {
    setError(''); setCheck(null);
    if (!form.text.trim()) { setError('Tempel JSON materi atau pilih file dulu.'); return; }
    setBusy(true);
    try { setCheck(await api('admin/drilling/decks', { method: 'POST', body: body(true) })); } catch (e) { if (e.body?.items) setCheck(e.body); else setError(errorText(e)); } finally { setBusy(false); }
  };
  const save = async () => {
    setError(''); setNote('');
    setBusy(true);
    try {
      const r = await api('admin/drilling/decks', { method: 'POST', body: body(false) });
      setNote(`${r.replaced ? 'Diperbarui' : 'Ditambahkan'}: ${r.title} (${r.slideCount} slide).`);
      setForm((f) => ({ ...f, open: false, text: '' })); setCheck(null);
      await load(); onChanged?.();
    } catch (e) { if (e.body?.items) setCheck(e.body); else setError(errorText(e)); } finally { setBusy(false); }
  };
  const readFile = async (f) => {
    if (!f) return;
    if (f.size > 4 * 1048576) { setError('File lebih dari 4 MB. Pecah menjadi beberapa berkas materi.'); return; }
    set({ text: await f.text() }); setCheck(null);
  };
  const remove = (d) => {
    if (!window.confirm(`Hapus materi "${d.title}" (${d.slideCount} slide)? Tidak bisa dikembalikan.`)) return;
    act(() => api(`admin/drilling/decks/${d.id}/delete`, { method: 'POST', body: {} }), 'Materi dihapus.');
  };
  const toggle = (d) => act(() => api(`admin/drilling/decks/${d.id}`, { method: 'POST', body: { status: d.status === 'published' ? 'draft' : 'published' } }), d.status === 'published' ? 'Dijadikan draf.' : 'Ditayangkan.');

  return (
    <div className="mt-3 space-y-3 rounded-2xl bg-page p-4">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <p className="font-semibold">Materi {subject.name}</p>
        <button type="button" className="btn-primary btn-sm" onClick={() => set({ open: true })}><FilePlus2 size={15} aria-hidden /> Impor materi (JSON)</button>
      </div>
      <Alert>{error}</Alert>
      {note && <Alert kind="success">{note}</Alert>}
      {!items ? <PageLoader /> : !items.length ? <p className="text-sm text-ink-muted">Belum ada materi. Impor JSON hasil konversi PPT (lihat docs/MATERI_SLIDE.md), atau terima pengajuan PPT materi lewat Hermes.</p> : (
        <ul className="divide-y divide-line rounded-xl bg-white">
          {items.map((d) => (
            <li key={d.id} className="flex flex-wrap items-center gap-3 p-3">
              <div className="min-w-[12rem] flex-1">
                <p className="font-semibold">{d.title}</p>
                <p className="text-sm text-ink-muted">
                  {d.slideCount} slide · {d.scope === 'campus' ? `khusus ${d.campuses.map((c) => c.name).join(', ') || 'kampus'}` : 'General'}
                  {d.source === 'submission' ? ' · dari pengajuan' : ''}
                </p>
              </div>
              <Badge className={d.status === 'published' ? 'bg-mint-soft text-brand' : 'bg-page text-ink-muted'}>{d.status === 'published' ? 'Tayang' : 'Draf'}</Badge>
              <Link to={`/drilling/materi/${d.id}`} className="btn-ghost btn-sm"><Eye size={15} aria-hidden /> Pratinjau</Link>
              <button type="button" className="btn-ghost btn-sm" onClick={() => toggle(d)} disabled={busy}>{d.status === 'published' ? <><EyeOff size={15} aria-hidden /> Jadikan draf</> : <>Tayangkan</>}</button>
              <button type="button" className="btn-ghost btn-sm text-coral" onClick={() => remove(d)} disabled={busy} aria-label={`Hapus ${d.title}`}><Trash2 size={15} aria-hidden /></button>
            </li>
          ))}
        </ul>
      )}

      {form.open && (
        <Modal open size="xl" title={`Impor materi ${subject.name}`} onClose={() => set({ open: false })} footer={<>
          <button type="button" className="btn-ghost" onClick={() => set({ open: false })}>Batal</button>
          <button type="button" className="btn-secondary" onClick={test} disabled={busy}>Periksa dulu</button>
          <button type="button" className="btn-primary" onClick={save} disabled={busy || (check && check.blocked)}>Impor</button>
        </>}>
          <div className="space-y-3">
            <p className="text-sm text-ink-muted">Tempel JSON materi (slide + penjelasan) atau pilih file. Judul dan mata kuliah yang sama diperbarui, bukan digandakan.</p>
            <div className="grid gap-3 sm:grid-cols-2">
              <Field label="Dilihat oleh" htmlFor="dk-scope"><select id="dk-scope" className="input" value={form.scope} onChange={(e) => set({ scope: e.target.value })}><option value="all">General (semua pengguna)</option><option value="campus">Hanya kampus tertentu</option></select></Field>
              <Field label="Status" htmlFor="dk-status"><select id="dk-status" className="input" value={form.status} onChange={(e) => set({ status: e.target.value })}><option value="published">Langsung tayang</option><option value="draft">Draf (belum terlihat pengguna)</option></select></Field>
            </div>
            {form.scope === 'campus' && <Field label="Kampus yang boleh melihat"><CampusMulti value={form.campuses} onChange={(v) => set({ campuses: v })} /></Field>}
            <label className="btn-secondary btn-sm inline-flex cursor-pointer"><FileUp size={15} aria-hidden /> Pilih file .json<input type="file" accept=".json,application/json,text/plain" className="sr-only" onChange={(e) => { readFile(e.target.files[0]); e.target.value = ''; }} /></label>
            <Field label="JSON materi" htmlFor="dk-text"><textarea id="dk-text" className="input min-h-[14rem] font-mono text-[13px]" value={form.text} placeholder={EXAMPLE} onChange={(e) => { set({ text: e.target.value }); setCheck(null); }} /></Field>
            <Alert>{error}</Alert>
            {check && (
              <div className={check.blocked ? 'rounded-xl bg-coral-soft p-3 text-sm' : 'rounded-xl bg-mint-soft p-3 text-sm'} role="status">
                {check.blocked ? (
                  <>
                    <p className="font-semibold">Belum bisa diimpor. Perbaiki yang ini dulu:</p>
                    <ul className="mt-1 list-disc space-y-0.5 pl-5">{(check.items || []).slice(0, 12).map((it, i) => <li key={i}>{it.index ? `Slide ${it.index}: ` : ''}{(it.errors || []).join('; ')}</li>)}</ul>
                  </>
                ) : <p className="font-semibold">Siap diimpor: {check.slideCount} slide{check.replaced ? ' (memperbarui materi dengan judul yang sama)' : ''}.</p>}
                {(check.warnings || []).length > 0 && <ul className="mt-2 list-disc space-y-0.5 pl-5 text-ink-muted">{check.warnings.slice(0, 8).map((w, i) => <li key={i}>{w}</li>)}</ul>}
              </div>
            )}
          </div>
        </Modal>
      )}
    </div>
  );
}
