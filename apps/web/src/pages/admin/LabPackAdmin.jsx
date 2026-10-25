import { useCallback, useEffect, useMemo, useState } from 'react';
import { api, errorText } from '@/lib/api';
import { Alert, Spinner } from '@/components/ui';
import LabLesson from '@/features/lab/LabLesson';

const KINDS = [['assets', 'Assets'], ['objects', 'Objects'], ['questions', 'Questions'], ['pathways', 'Pathways']];
const KIND_NAME = Object.fromEntries(KINDS);
const CONFIRM = 'Saya telah memeriksa isi, jawaban, sumber, dan hak penggunaan aset pada content pack ini.';
const key = (i) => `${i.kind}:${i.id}`;

// Draft preview of a learning object, rendered with the same blocks students get. Practice stays disabled.
export function LabObjectPreview({ id, onClose }) {
  const [state, setState] = useState({ d: null, error: '' });
  useEffect(() => { let on = true; api(`admin/lab/objects/${id}/preview`).then((d) => on && setState({ d, error: '' })).catch((e) => on && setState({ d: null, error: errorText(e) })); return () => { on = false; }; }, [id]);
  const d = state.d;
  const ctx = { modality: d?.modality, startPractice() {}, legacyPractice() {}, practiceError: '', starting: false, preview: true };
  return <section className="space-y-4 rounded-2xl border-2 border-dashed border-brand p-4" aria-label="Pratinjau draft">
    <div className="flex flex-wrap items-center justify-between gap-2"><p className="font-semibold text-brand">Pratinjau draft{d ? ` · ${d.status === 'published' ? 'sudah terbit' : 'belum terbit'}` : ''}. Siswa tidak melihat halaman ini.</p><button type="button" className="btn btn-secondary btn-sm" onClick={onClose}>Tutup pratinjau</button></div>
    <Alert>{state.error}</Alert>{!d && !state.error && <Spinner />}
    {d && <div className="space-y-5"><header><h2 className="text-2xl font-bold">{d.title}</h2><p className="text-ink-muted">{d.summary}</p></header><LabLesson d={d} ctx={ctx} /></div>}
  </section>;
}

export default function LabPackAdmin() {
  const [packs, setPacks] = useState(null); const [slug, setSlug] = useState(''); const [pack, setPack] = useState(null);
  const [status, setStatus] = useState(''); const [type, setType] = useState(''); const [picked, setPicked] = useState(() => new Set());
  const [report, setReport] = useState(null); const [confirmed, setConfirmed] = useState(false); const [busy, setBusy] = useState(false);
  const [error, setError] = useState(''); const [notice, setNotice] = useState(''); const [preview, setPreview] = useState('');
  const [form, setForm] = useState(null);

  const loadPacks = useCallback(() => api('admin/lab-packs').then((d) => { setPacks(d.items); setSlug((s) => s || d.items[0]?.slug || ''); }).catch((e) => setError(errorText(e))), []);
  const loadPack = useCallback((s) => (s ? api(`admin/lab-packs/${s}`).then(setPack).catch((e) => setError(errorText(e))) : Promise.resolve(setPack(null))), []);
  useEffect(() => { loadPacks(); }, [loadPacks]);
  useEffect(() => { setReport(null); setPicked(new Set()); setConfirmed(false); setNotice(''); setPreview(''); loadPack(slug); }, [slug, loadPack]);

  const items = useMemo(() => (pack?.items || []).filter((i) => (!status || i.status === status) && (!type || i.kind === type)), [pack, status, type]);
  const allPicked = items.length > 0 && items.every((i) => picked.has(key(i)));
  const toggleAll = () => setPicked(allPicked ? new Set() : new Set(items.map(key)));
  const toggle = (i) => { const next = new Set(picked); next.has(key(i)) ? next.delete(key(i)) : next.add(key(i)); setPicked(next); };
  const run = async (fn) => { setBusy(true); setError(''); setNotice(''); try { await fn(); } catch (e) { setError(errorText(e)); } finally { setBusy(false); } };
  const selection = () => (pack?.items || []).filter((i) => picked.has(key(i))).map((i) => ({ kind: i.kind, id: i.id, revision: i.revision }));

  const validate = () => run(async () => { setReport(await api(`admin/lab-packs/${slug}/validate`, { method: 'POST', body: {} })); });
  const review = () => run(async () => { const r = await api('admin/lab-bulk/publish', { method: 'POST', body: { dryRun: true, items: selection() } }); setReport({ selection: true, ok: r.ok, errors: r.errors, ready: r.ready, skipped: r.skipped, counts: null }); });
  const publishPack = () => run(async () => {
    const r = await api(`admin/lab-packs/${slug}/publish`, { method: 'POST', body: { confirmReviewed: confirmed } });
    if (!r.ok) { setReport({ ...r, counts: null }); setError('Pack belum dapat diterbitkan. Perbaiki kesalahan di bawah.'); return; }
    setReport(null); setNotice(`Content pack diterbitkan: ${summary(r.published)}${r.skipped.length ? `; ${r.skipped.length} sudah terbit sebelumnya` : ''}.`); setConfirmed(false); await Promise.all([loadPacks(), loadPack(slug)]);
  });
  const publishSelected = () => run(async () => {
    const r = await api('admin/lab-bulk/publish', { method: 'POST', body: { confirmReviewed: confirmed, items: selection() } });
    if (!r.ok) { setReport({ selection: true, ok: false, errors: r.errors, ready: [], skipped: r.skipped, counts: null }); setError('Pilihan belum dapat diterbitkan.'); return; }
    setReport(null); setNotice(`Diterbitkan: ${summary(r.published)}.`); setPicked(new Set()); setConfirmed(false); await Promise.all([loadPacks(), loadPack(slug)]);
  });
  const createPack = () => run(async () => { const p = await api('admin/lab-packs', { method: 'POST', body: form }); setForm(null); await loadPacks(); setSlug(p.slug); });
  const summary = (list) => KINDS.map(([k, name]) => `${list.filter((x) => x.kind === k).length} ${name.toLowerCase()}`).join(', ');
  const totals = pack ? KINDS.map(([k]) => pack.counts[k]) : [];
  const sum = (f) => totals.reduce((n, c) => n + c[f], 0);
  const errCount = report?.errors?.length ?? null;

  if (!packs) return error ? <Alert>{error}</Alert> : <Spinner />;
  return <div className="space-y-5">
    <div className="flex flex-wrap items-end gap-3">
      <label className="space-y-1 text-sm font-semibold">Content Pack<select className="input block min-w-60" value={slug} onChange={(e) => setSlug(e.target.value)} disabled={busy}>{packs.length === 0 && <option value="">Belum ada content pack</option>}{packs.map((p) => <option key={p.id} value={p.slug}>{p.title}{p.version ? ` (${p.version})` : ''}</option>)}</select></label>
      <label className="space-y-1 text-sm font-semibold">Status<select className="input block" value={status} onChange={(e) => setStatus(e.target.value)}><option value="">Semua</option><option value="draft">Draft</option><option value="published">Terbit</option></select></label>
      <label className="space-y-1 text-sm font-semibold">Tipe<select className="input block" value={type} onChange={(e) => setType(e.target.value)}><option value="">Semua</option>{KINDS.map(([k, n]) => <option key={k} value={k}>{n}</option>)}</select></label>
      <button type="button" className="btn btn-secondary btn-sm" onClick={() => setForm(form ? null : { slug: '', title: '', version: 'v1', description: '', source: '', licenseSummary: '' })}>Content pack baru</button>
    </div>
    {form && <div className="card grid gap-3 p-4 sm:grid-cols-2">{[['slug', 'Slug (huruf kecil, angka, -)'], ['title', 'Judul'], ['version', 'Versi'], ['source', 'Sumber'], ['licenseSummary', 'Ringkasan lisensi'], ['description', 'Deskripsi']].map(([k, label]) => <label key={k} className="space-y-1 text-sm font-semibold">{label}<input className="input block w-full" value={form[k]} onChange={(e) => setForm({ ...form, [k]: e.target.value })} /></label>)}<button type="button" className="btn btn-primary sm:col-span-2" disabled={busy || !form.slug || !form.title} onClick={createPack}>Buat content pack</button></div>}
    <Alert>{error}</Alert><Alert kind="success">{notice}</Alert>
    {!pack ? <div className="card p-8 text-ink-muted">Impor content pack dengan <code>tools/lab-ingest/import_medmnist.py</code>, atau buat pack baru lalu kaitkan konten lewat field <code>pack</code>.</div> : <>
      <section className="card space-y-4 p-5" aria-label="Ringkasan content pack">
        <div><h2 className="text-xl font-bold">{pack.title}{pack.version ? ` ${pack.version}` : ''}</h2><p className="text-sm text-ink-muted">{pack.description}</p>{pack.licenseSummary && <p className="mt-1 text-xs text-ink-muted">Lisensi: {pack.licenseSummary}</p>}</div>
        <dl className="grid grid-cols-2 gap-3 sm:grid-cols-4">{KINDS.map(([k, n]) => <div key={k} className="rounded-xl bg-paper-2 p-3"><dt className="text-xs font-semibold uppercase text-ink-muted">{n}</dt><dd className="text-2xl font-bold">{pack.counts[k].total}</dd></div>)}</dl>
        <dl className="grid grid-cols-3 gap-3 text-center"><div><dt className="text-xs uppercase text-ink-muted">Draft</dt><dd className="text-xl font-bold">{sum('draft')}</dd></div><div><dt className="text-xs uppercase text-ink-muted">Terbit</dt><dd className="text-xl font-bold text-brand">{sum('published')}</dd></div><div><dt className="text-xs uppercase text-ink-muted">Kesalahan</dt><dd className={`text-xl font-bold ${errCount ? 'text-coral' : ''}`}>{errCount ?? '–'}</dd></div></dl>
        <button type="button" className="btn btn-secondary" disabled={busy} onClick={validate}>Periksa content pack</button>
      </section>
      {report && <section className="card space-y-3 p-5" aria-label="Hasil validasi" role="status">
        <h3 className="font-semibold">{report.selection ? 'Hasil pemeriksaan pilihan' : pack.title}</h3>
        {report.counts && <ul className="space-y-1 text-sm">{KINDS.map(([k, n]) => { const c = report.counts[k]; const good = c.total > 0 ? c.ready + c.skipped === c.total : true; return <li key={k} className={good ? '' : 'text-coral'}>{good ? '✓' : '✗'} {c.ready + c.skipped} / {c.total} {n.toLowerCase()} {k === 'assets' ? 'siap (lisensi terverifikasi)' : 'valid'}</li>; })}</ul>}
        {report.errors.length > 0 ? <div className="space-y-2"><p className="font-bold text-coral">Tidak dapat diterbitkan</p><ul className="space-y-2 text-sm">{report.errors.map((e, i) => <li key={i} className="rounded-lg border border-coral/40 p-2"><strong>{KIND_NAME[e.kind]} · {e.slug}</strong><br />→ {e.message}</li>)}</ul></div>
          : <p className="font-bold text-brand">{report.empty ? 'Content pack kosong.' : report.selection ? `${report.ready.length} item siap diterbitkan.` : 'Siap diterbitkan'}</p>}
      </section>}
      <section className="card space-y-3 p-5" aria-label="Tinjau dan terbitkan">
        <label className="flex items-start gap-2 text-sm"><input type="checkbox" className="mt-1" checked={confirmed} onChange={(e) => setConfirmed(e.target.checked)} /><span>{CONFIRM}</span></label>
        <div className="flex flex-wrap gap-2">
          <button type="button" className="btn btn-primary" disabled={busy || !confirmed || sum('draft') === 0} onClick={publishPack}>Terbitkan content pack</button>
          <button type="button" className="btn btn-secondary" disabled={busy || picked.size === 0} onClick={review}>Periksa pilihan ({picked.size})</button>
          <button type="button" className="btn btn-secondary" disabled={busy || !confirmed || picked.size === 0} onClick={publishSelected}>Terbitkan pilihan ({picked.size})</button>
        </div>
        <p className="text-xs text-ink-muted">Urutan terbit selalu aset → objek → soal → jalur. Catatan yang sudah terbit dilewati, jadi aman dijalankan ulang. Mengedit konten mengembalikannya ke draft.</p>
      </section>
      <section className="space-y-2" aria-label="Isi content pack">
        <label className="flex items-center gap-2 text-sm font-semibold"><input type="checkbox" className="h-5 w-5" checked={allPicked} onChange={toggleAll} /> Pilih semua ({items.length})</label>
        <ul className="divide-y divide-line rounded-2xl border border-line">{items.map((i) => <li key={key(i)} className="flex flex-wrap items-center gap-3 p-3 text-sm"><input type="checkbox" className="h-5 w-5" checked={picked.has(key(i))} onChange={() => toggle(i)} aria-label={`Pilih ${i.slug}`} /><span className="w-20 shrink-0 text-xs font-semibold uppercase text-ink-muted">{i.kind.replace(/s$/, '')}</span><span className="min-w-0 flex-1"><strong className="block truncate">{i.title}</strong><code className="text-xs text-ink-muted">{i.slug}</code></span><span className={`chip ${i.status === 'published' ? 'bg-brand-soft text-brand' : 'bg-gold-soft text-ink'}`}>{i.status === 'published' ? 'Terbit' : 'Draft'}</span>{i.kind === 'objects' && <button type="button" className="btn btn-ghost btn-sm" onClick={() => setPreview(preview === i.id ? '' : i.id)}>{preview === i.id ? 'Tutup' : 'Pratinjau'}</button>}</li>)}{!items.length && <li className="p-4 text-ink-muted">Tidak ada item dengan filter ini.</li>}</ul>
      </section>
      {preview && <LabObjectPreview id={preview} onClose={() => setPreview('')} />}
    </>}
  </div>;
}
