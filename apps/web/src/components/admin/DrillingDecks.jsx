// Admin > Drilling > Materi: berkas materi (slide PPT + penjelasan) satu mata kuliah. Impor JSON (dengan pemeriksaan
// dulu), tayang/draf, pembatasan kampus, pratinjau, dan hapus. Format ada di docs/MATERI_SLIDE.md.
//
// Materi dari PPT kiriman peserta HARUS tertaut ke pengajuannya: hanya dengan tautan itu materi masuk "Kampusmu"
// pengaju dan teman sekampusnya, pengajuan menjadi Selesai, dan pengaju diberi tahu. Materi General tanpa pengajuan
// (materi admin) sengaja tidak tampil di Kampusmu siapa pun. Karena itu form impor menawarkan pengajuan yang menunggu,
// dan materi yang sudah terlanjur diimpor tanpa tautan bisa ditautkan lewat tombol "Tautkan ke pengajuan".
import { Eye, EyeOff, FilePlus2, FileUp, Link2, Trash2 } from 'lucide-react';
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
  const [form, setForm] = useState({ open: false, text: '', scope: 'all', campuses: [], status: 'published', submission: '', pdf: '' });
  const [check, setCheck] = useState(null);
  const [subs, setSubs] = useState(null); // pengajuan yang bisa ditautkan
  const [link, setLink] = useState(null); // { deck, submission }
  const load = useCallback(() => api(`admin/drilling/decks?subject=${subject.id}`).then((d) => { setItems(d.items); setError(''); }).catch((e) => setError(errorText(e))), [subject.id]);
  const loadSubs = useCallback(() => api(`admin/drilling/deck-submissions?subject=${subject.id}`).then((d) => setSubs(d.items)).catch(() => setSubs([])), [subject.id]);
  useEffect(() => { load(); loadSubs(); }, [load, loadSubs]);
  const set = (patch) => setForm((f) => ({ ...f, ...patch }));
  const chosen = (subs || []).find((x) => x.code === form.submission) || null;
  const pending = (subs || []).filter((x) => x.sameSubject);

  const act = async (fn, done) => {
    setBusy(true); setError(''); setNote('');
    try { await fn(); await load(); onChanged?.(); if (done) setNote(done); } catch (e) { setError(errorText(e)); } finally { setBusy(false); }
  };
  const body = (dryRun) => ({
    subject: subject.id, text: form.text, scope: form.scope, campuses: form.campuses, status: form.status, dryRun,
    ...(form.submission ? { submission: form.submission, ...(form.pdf ? { pdf: form.pdf } : {}) } : {}),
  });
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
      setNote(`${r.replaced ? 'Diperbarui' : 'Ditambahkan'}: ${r.title} (${r.slideCount} slide).${r.submission ? ` Tertaut ke pengajuan ${r.submission.code}: sudah masuk Kampusmu pengaju, pengajuan Selesai, dan pengaju diberi tahu.` : ''}`);
      setForm((f) => ({ ...f, open: false, text: '', submission: '', pdf: '' })); setCheck(null);
      await load(); loadSubs(); onChanged?.();
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
  const saveLink = async () => {
    if (!link) return;
    const { deck, submission } = link;
    await act(() => api(`admin/drilling/decks/${deck.id}/link`, { method: 'POST', body: { submission } }),
      submission ? `"${deck.title}" tertaut ke pengajuan ${submission}: sudah masuk Kampusmu pengaju dan teman sekampusnya.` : `Tautan "${deck.title}" dilepas.`);
    setLink(null); loadSubs();
  };
  const subLabel = (x) => `${x.code} · ${x.userName || 'tanpa nama'}${x.campusName ? ` (${x.campusName})` : ''} · ${x.statusLabel}${x.contentKind === 'soal' ? ' · dipilih sebagai soal' : ''}${x.sameSubject ? '' : ` · ${x.subjectName}`}${x.pdfs.length ? ` · ${x.pdfs.join(', ')}` : ''}`;
  const subOptions = () => (
    <>
      {pending.length > 0 && <optgroup label={`Pengajuan ${subject.name}`}>{pending.map((x) => <option key={x.id} value={x.code}>{subLabel(x)}</option>)}</optgroup>}
      {(subs || []).some((x) => !x.sameSubject) && <optgroup label="Mata kuliah lain">{subs.filter((x) => !x.sameSubject).map((x) => <option key={x.id} value={x.code}>{subLabel(x)}</option>)}</optgroup>}
    </>
  );

  const toggle = (d) => act(() => api(`admin/drilling/decks/${d.id}`, { method: 'POST', body: { status: d.status === 'published' ? 'draft' : 'published' } }), d.status === 'published' ? 'Dijadikan draf.' : 'Ditayangkan.');

  return (
    <div className="mt-3 space-y-3 rounded-2xl bg-page p-4">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <p className="font-semibold">Materi {subject.name}</p>
        <button type="button" className="btn-primary btn-sm" onClick={() => set({ open: true })}><FilePlus2 size={15} aria-hidden /> Impor materi (JSON)</button>
      </div>
      <Alert>{error}</Alert>
      {note && <Alert kind="success">{note}</Alert>}
      {pending.length > 0 && (
        <Alert kind="info">
          {pending.length} pengajuan PPT untuk {subject.name} belum punya materi ({pending.map((x) => x.code).join(', ')}). Saat mengimpor JSON-nya, pilih pengajuannya di form impor supaya materinya masuk Kampusmu pengaju.
        </Alert>
      )}
      {!items ? <PageLoader /> : !items.length ? <p className="text-sm text-ink-muted">Belum ada materi. Impor JSON hasil konversi PPT (lihat docs/MATERI_SLIDE.md), atau terima pengajuan PPT materi lewat Hermes.</p> : (
        <ul className="divide-y divide-line rounded-xl bg-white">
          {items.map((d) => (
            <li key={d.id} className="flex flex-wrap items-center gap-3 p-3">
              <div className="min-w-[12rem] flex-1">
                <p className="font-semibold">{d.title}</p>
                <p className="text-sm text-ink-muted">
                  {d.slideCount} slide · {d.scope === 'campus' ? `khusus ${d.campuses.map((c) => c.name).join(', ') || 'kampus'}` : 'General'}
                  {d.submission ? ` · dari pengajuan ${d.submission.code || '(sudah dihapus)'}${d.submission.userName ? ` oleh ${d.submission.userName}` : ''}${d.submission.campusName ? ` (${d.submission.campusName})` : ''}` : ''}
                </p>
                {d.kampusHidden && d.status === 'published' && (
                  <p className="mt-1 text-sm font-semibold text-[#6b4f00]">Tidak tampil di Kampusmu siapa pun: General dan belum tertaut ke pengajuan. Kalau ini PPT kiriman peserta, tautkan ke pengajuannya.</p>
                )}
              </div>
              <Badge className={d.status === 'published' ? 'bg-mint-soft text-brand' : 'bg-page text-ink-muted'}>{d.status === 'published' ? 'Tayang' : 'Draf'}</Badge>
              <button type="button" className={d.kampusHidden ? 'btn-secondary btn-sm' : 'btn-ghost btn-sm'} onClick={() => { loadSubs(); setLink({ deck: d, submission: d.submission?.code || '' }); }} disabled={busy}>
                <Link2 size={15} aria-hidden /> {d.submission ? 'Ubah tautan' : 'Tautkan ke pengajuan'}
              </button>
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
            <Field label="Dari pengajuan peserta" htmlFor="dk-sub">
              <select id="dk-sub" className="input" value={form.submission} onChange={(e) => { set({ submission: e.target.value, pdf: '' }); setCheck(null); }}>
                <option value="">Tanpa pengajuan (materi admin)</option>
                {subOptions()}
              </select>
            </Field>
            {chosen ? (
              <Alert kind="info">
                Materi ditautkan ke {chosen.code}: tampil di Kampusmu {chosen.userName || 'pengaju'}{chosen.campusName ? ` dan teman sekampusnya (${chosen.campusName})` : ''}, {chosen.scope === 'campus' ? 'khusus kampus pengaju' : 'cakupan General'} sesuai pengajuan. Judul diambil dari nama PDF. Setelah diimpor, pengajuan menjadi Selesai dan pengaju diberi tahu.
              </Alert>
            ) : form.scope === 'all' && (
              <Alert kind="warn">Materi General tanpa pengajuan tidak tampil di Kampusmu siapa pun. Kalau ini PPT kiriman peserta, pilih pengajuannya di atas. Kalau materi admin untuk kampus tertentu, pilih "Hanya kampus tertentu".</Alert>
            )}
            {chosen && chosen.pdfs.length > 1 && (
              <Field label="PDF yang diimpor (judul materi)" htmlFor="dk-pdf">
                <select id="dk-pdf" className="input" value={form.pdf} onChange={(e) => { set({ pdf: e.target.value }); setCheck(null); }}>
                  <option value="">Pakai judul di JSON</option>
                  {chosen.pdfs.map((t, i) => <option key={i} value={i + 1}>{i + 1}. {t}</option>)}
                </select>
              </Field>
            )}
            <div className="grid gap-3 sm:grid-cols-2">
              {!chosen && <Field label="Dilihat oleh" htmlFor="dk-scope"><select id="dk-scope" className="input" value={form.scope} onChange={(e) => set({ scope: e.target.value })}><option value="all">General (semua pengguna)</option><option value="campus">Hanya kampus tertentu</option></select></Field>}
              <Field label="Status" htmlFor="dk-status"><select id="dk-status" className="input" value={form.status} onChange={(e) => set({ status: e.target.value })}><option value="published">Langsung tayang</option><option value="draft">Draf (belum terlihat pengguna)</option></select></Field>
            </div>
            {!chosen && form.scope === 'campus' && <Field label="Kampus yang boleh melihat"><CampusMulti value={form.campuses} onChange={(v) => set({ campuses: v })} /></Field>}
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
                ) : <p className="font-semibold">Siap diimpor: {check.title ? `"${check.title}", ` : ''}{check.slideCount} slide{check.replaced ? ' (memperbarui materi dengan judul yang sama)' : ''}.</p>}
                {(check.warnings || []).length > 0 && <ul className="mt-2 list-disc space-y-0.5 pl-5 text-ink-muted">{check.warnings.slice(0, 8).map((w, i) => <li key={i}>{w}</li>)}</ul>}
              </div>
            )}
          </div>
        </Modal>
      )}

      {link && (
        <Modal open title={`Tautkan "${link.deck.title}" ke pengajuan`} onClose={() => setLink(null)} footer={<>
          <button type="button" className="btn-ghost" onClick={() => setLink(null)}>Batal</button>
          <button type="button" className="btn-primary" onClick={saveLink} disabled={busy || (!link.submission && !link.deck.submission)}>{link.submission ? 'Tautkan' : 'Lepas tautan'}</button>
        </>}>
          <div className="space-y-3">
            <p className="text-sm text-ink-muted">Pilih pengajuan PPT asal materi ini. Setelah ditautkan, materi tampil di Kampusmu pengaju dan teman sekampusnya, pengajuan menjadi Selesai, dan pengaju diberi tahu (bila belum Selesai).</p>
            <Field label="Pengajuan" htmlFor="dk-link">
              <select id="dk-link" className="input" value={link.submission} onChange={(e) => setLink((l) => ({ ...l, submission: e.target.value }))}>
                <option value="">{link.deck.submission ? 'Lepas tautan (jadikan materi admin)' : 'Pilih pengajuan…'}</option>
                {link.deck.submission?.code && !(subs || []).some((x) => x.code === link.deck.submission.code) && <option value={link.deck.submission.code}>{link.deck.submission.code} (tautan sekarang)</option>}
                {subOptions()}
              </select>
            </Field>
            {subs && !subs.length && <p className="text-sm text-ink-muted">Tidak ada pengajuan PPT yang menunggu materi. Pengajuan harus berstatus Antre, Diproses, Perlu perbaikan, atau Selesai tanpa materi.</p>}
          </div>
        </Modal>
      )}
    </div>
  );
}
