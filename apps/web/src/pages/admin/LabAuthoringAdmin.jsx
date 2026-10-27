import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { api, errorText } from '@/lib/api';
import { Alert } from '@/components/ui';
import LabAuthoredContent from '@/features/lab/LabAuthoredContent';
import LabBundleReview from './LabBundleReview';
import { ACTION_LABELS, KIND_LABELS, MODULE_TEMPLATE, actionCounts, bundleSummary, catalogHierarchy, describeEntry, licenseWarnings } from './labAuthoringUi.mjs';

const DOC_URL = 'https://github.com/khansazafiri-rgb/mpruy/blob/main/docs/LAB_AUTHORING_SCHEMA.md';
const ACTIONS = ['create', 'update', 'unchanged'];
// view: 'import' (tempel JSON → validasi → draft → terbitkan) atau 'content' (daftar konten tersimpan). Keduanya satu instance, jadi isian tidak hilang saat berpindah.
export default function LabAuthoringAdmin({ initialSource = '', view = 'import', onNavigate = () => {} }) {
  const [source, setSource] = useState(initialSource);
  const [bundle, setBundle] = useState(null);
  const [plan, setPlan] = useState(null);
  const [step, setStep] = useState('edit');
  const [result, setResult] = useState(null);
  const [bundleReview, setBundleReview] = useState(null);
  const [bundleConfirmed, setBundleConfirmed] = useState(false);
  const [bundlePublished, setBundlePublished] = useState(null);
  const [records, setRecords] = useState([]);
  const [media, setMedia] = useState([]);
  const [error, setError] = useState('');
  const [notice, setNotice] = useState('');
  const [busy, setBusy] = useState(false);
  const [reviewed, setReviewed] = useState(false);
  const [preview, setPreview] = useState(null);
  const [assetBrowser, setAssetBrowser] = useState(false);
  const [assetSearch, setAssetSearch] = useState('');
  const [uploadOpen, setUploadOpen] = useState(false);
  const [file, setFile] = useState(null);
  const [meta, setMeta] = useState({ key: '', title: '', alt: '', sourceKey: '', externalUrl: '' });

  async function refresh() {
    const [r, m] = await Promise.all([api('admin/lab-authoring/records'), api('admin/lab-authoring/media')]);
    setRecords(r.items); setMedia(m.items);
  }
  useEffect(() => { refresh().catch((e) => setError(errorText(e))); }, []);
  async function run(fn) {
    setBusy(true); setError(''); setNotice('');
    try { await fn(); } catch (e) { setError(e instanceof SyntaxError ? 'JSON tidak valid: ' + e.message : e instanceof Error && !('status' in e) ? e.message : errorText(e)); }
    finally { setBusy(false); }
  }
  function changeSource(value) { setSource(value); setBundle(null); setPlan(null); setResult(null); setBundleReview(null); setBundleConfirmed(false); setBundlePublished(null); setStep('edit'); setError(''); }
  function validate() { return run(async () => {
    setBundle(null); setPlan(null); setStep('edit');
    const data = JSON.parse(source);
    const p = await api('admin/lab-authoring/preview', { method: 'POST', body: data });
    setBundle(data); setPlan(p); setStep(p.ok ? 'validated' : 'edit');
  }); }
  function apply() {
    if (step !== 'preview' || !plan?.ok || !bundle) return;
    return run(async () => {
      const applied = await api('admin/lab-authoring/apply', { method: 'POST', body: { bundle, token: plan.token } });
      await refresh(); setResult(applied); setBundleReview(null); setBundleConfirmed(false); setBundlePublished(null); setStep('applied'); setPlan(null);
    });
  }
  function upload() { return run(async () => {
    if (!!file === !!meta.externalUrl) throw new Error('Pilih berkas atau URL HTTPS, satu saja.');
    const form = new FormData(); Object.entries(meta).forEach(([k, v]) => form.append(k, v));
    if (file) form.append('file', file);
    await api('admin/lab-authoring/media', { method: 'POST', body: form });
    setFile(null); await refresh(); setBundleReview(null); setBundleConfirmed(false); setNotice('Media tersimpan sebagai draft. Periksa sumber dan lisensinya sebelum diterbitkan.');
  }); }
  function loadRecord(r) { changeSource(JSON.stringify({ schemaVersion: 1, records: [{ kind: r.kind, data: r.data }] }, null, 2)); setPreview(null); onNavigate('import'); window.scrollTo({ top: 0, behavior: 'smooth' }); }
  function exportModule(key) { return run(async () => {
    const data = await api('admin/lab-authoring/export/' + key);
    const url = URL.createObjectURL(new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' }));
    const link = document.createElement('a'); link.href = url; link.download = key + '.json'; link.click();
    setTimeout(() => URL.revokeObjectURL(url), 1000);
    setNotice('JSON modul ' + key + ' diunduh. Ubah sebagian lalu impor ulang bila perlu.');
  }); }
  function previewModule(key) { return run(async () => { setPreview(await api('admin/lab-authoring/modules/' + key + '/preview')); }); }
  function publish(r) { return run(async () => {
    await api('admin/lab-authoring/publish/' + r.kind + '/' + r.key, { method: 'POST', body: { revision: r.revision, confirmReviewed: reviewed } });
    setReviewed(false); await refresh(); setBundleReview(null); setBundleConfirmed(false); setNotice(r.title + ' diterbitkan setelah pemeriksaan.');
  }); }
  function publishAsset(r) { return run(async () => {
    await api('admin/lab-authoring/media/' + r.key + '/publish', { method: 'POST', body: { revision: r.revision, confirmReviewed: reviewed } });
    setReviewed(false); await refresh(); setBundleReview(null); setBundleConfirmed(false); setNotice('Aset ' + r.title + ' diterbitkan.');
  }); }
  function openBundleReview() {
    if (!result?.bundle) return;
    setBundleReview(null); setBundleConfirmed(false);
    return run(async () => { setBundleReview(await api('admin/lab-authoring/bundle/review', { method: 'POST', body: result.bundle })); });
  }
  function publishReviewedBundle() {
    if (!bundleReview?.ready || !bundleConfirmed || !result?.bundle) return;
    return run(async () => {
      try {
        const published = await api('admin/lab-authoring/bundle/publish', { method: 'POST', body: { bundle: result.bundle, token: bundleReview.token, confirmReviewed: true } });
        await refresh(); setBundlePublished(published); setBundleReview(null); setBundleConfirmed(false);
      } catch (e) { setBundleConfirmed(false); setBundleReview(null); throw e; }
    });
  }
  const summary = bundle ? bundleSummary(bundle) : null;
  const warnings = bundle ? licenseWarnings(bundle, records, media) : [];
  const counts = plan ? actionCounts(plan.entries) : null;
  const resultCounts = result ? actionCounts(result.entries) : null;
  const bundleKindCounts = result?.bundle ? Object.fromEntries(Object.keys(KIND_LABELS).map((kind) => [kind, result.bundle.records.filter((r) => r.kind === kind).length])) : {};
  const moduleKey = bundle?.records?.find((r) => r.kind === 'module')?.data?.key;
  const sourceRecords = new Map(records.filter((r) => r.kind === 'source').map((r) => [r.key, r.data]));
  const shownMedia = media.filter((m) => (m.key + ' ' + m.title + ' ' + m.sourceKey).toLowerCase().includes(assetSearch.toLowerCase()));
  const hierarchy = catalogHierarchy(records);
  // Langkah yang sedang menunggu tindakan admin. Selesai terbit = semua langkah selesai.
  const current = bundlePublished ? 4 : step === 'applied' ? 3 : step === 'preview' ? 2 : step === 'validated' ? 1 : 0;
  const STEPS = ['Tempel & validasi', 'Pratinjau perubahan', 'Simpan sebagai draft', 'Tinjau & terbitkan'];
  const pending = records.filter((r) => r.hasDraft || r.status !== 'published').length;
  const statusChip = (r) => (r.status === 'published' ? (r.hasDraft ? <span className="chip chip-warn">Draft baru</span> : <span className="chip chip-brand">Terbit</span>) : <span className="chip chip-warn">Draft</span>);
  const kinds = ['module', 'catalog', 'source', 'guide', 'placement'].filter((k) => records.some((r) => r.kind === k));
  return <div className="min-w-0 space-y-5">
    {view === 'import' && <section className="card space-y-5 p-4 sm:p-6">
      <div className="flex flex-wrap items-start justify-between gap-3"><div><h2 className="section-title">Tambah atau perbarui modul</h2><p className="mt-1 max-w-2xl text-sm leading-relaxed text-ink-muted">Tempel satu JSON. Sistem memeriksanya, menyimpannya sebagai draft, lalu kamu meninjau dan menerbitkannya. Siswa belum melihat apa pun sampai tahap terakhir.</p></div><a className="btn btn-ghost btn-sm" href={DOC_URL} target="_blank" rel="noreferrer">Lihat format JSON ↗</a></div>
      <ol className="grid gap-2 sm:grid-cols-4" aria-label="Langkah impor modul">{STEPS.map((label, i) => <li key={label} aria-current={i === current ? 'step' : undefined} className={'flex items-center gap-2.5 rounded-xl border px-3 py-2.5 text-sm ' + (i === current ? 'border-brand bg-brand-soft/60 font-semibold text-brand-dark' : i < current ? 'border-line text-ink' : 'border-line text-ink-faint')}><span aria-hidden className={'grid h-6 w-6 shrink-0 place-items-center rounded-full text-xs font-bold ' + (i < current ? 'bg-brand text-white' : i === current ? 'bg-brand text-white' : 'bg-paper-2 text-ink-muted')}>{i < current ? '✓' : i + 1}</span>{label}</li>)}</ol>
      <div className="flex flex-wrap gap-2"><button className="btn btn-secondary btn-sm" disabled={busy} onClick={() => navigator.clipboard.writeText(JSON.stringify(MODULE_TEMPLATE, null, 2)).then(() => setNotice('Template modul minimal disalin.')).catch(() => setError('Gagal menyalin template.'))}>Salin template</button><button className="btn btn-secondary btn-sm" aria-expanded={assetBrowser} onClick={() => setAssetBrowser((v) => !v)}>{assetBrowser ? 'Tutup daftar aset' : 'Lihat aset tersedia'}</button><button className="btn btn-secondary btn-sm" aria-expanded={uploadOpen} onClick={() => setUploadOpen((v) => !v)}>{uploadOpen ? 'Tutup upload media' : 'Upload media'}</button></div>
      <label className="block space-y-2"><span className="label !mb-0">JSON modul atau bundle</span><textarea aria-label="JSON modul Lab" className="input min-h-[320px] w-full min-w-0 font-mono text-sm lg:min-h-[420px]" spellCheck={false} disabled={busy} placeholder={'{\n  "schemaVersion": 1,\n  "records": [\n    { "kind": "module", "data": { "key": "...", "title": "..." } }\n  ]\n}'} value={source} onChange={(e) => changeSource(e.target.value)} /></label>
      <p className="meta">Gunakan key aset yang sudah terdaftar di blok gambar dan soal. JSON boleh berisi hanya bagian yang ingin diperbarui; bagian lain tetap ada. Penghapusan tidak didukung.</p>
      <div className="flex flex-wrap gap-2"><button className="btn btn-primary" aria-busy={busy && step === 'edit'} disabled={busy || !source.trim()} onClick={validate}>Validasi JSON</button>{plan?.ok && step === 'validated' && <button className="btn btn-secondary" disabled={busy} onClick={() => setStep('preview')}>Pratinjau perubahan →</button>}</div>
      {plan && <section className="space-y-3 rounded-xl border border-line p-4" aria-live="polite"><h3 className="card-title">Hasil validasi: {plan.ok ? 'struktur valid' : 'ada kesalahan'}</h3><p className="text-sm">{plan.ok ? '✓ Skema, struktur, dan referensi yang diperiksa server valid untuk draft.' : 'Perbaiki masalah berikut, lalu validasi ulang.'}</p>{summary && <p className="meta">{summary.sources} sumber · {summary.modules} modul · {summary.chapters} bab · {summary.sections} bagian · {summary.banks} bank soal · {summary.questions} soal · {summary.assets} key aset · {summary.placements} penempatan</p>}{plan.errors?.length > 0 && <div><p className="font-semibold text-coral">Kesalahan yang memblokir ({plan.errors.length})</p><ul className="list-disc space-y-1 pl-5 text-sm text-coral">{plan.errors.map((e, i) => <li key={i} className="break-words">{e}</li>)}</ul></div>}<div><p className="font-semibold">Peringatan untuk pemeriksaan manusia ({warnings.length})</p>{warnings.length ? <ul className="list-disc space-y-1 pl-5 text-sm">{warnings.map((w) => <li key={w}>{w}</li>)}</ul> : <p className="text-sm text-ink-muted">Tidak ada peringatan lisensi atau status aset yang terdeteksi. Periksa isi dan hak penggunaan sebelum terbit.</p>}</div><details className="meta"><summary className="cursor-pointer">Detail teknis</summary><pre className="mt-2 max-h-52 overflow-auto whitespace-pre-wrap break-all">{JSON.stringify(plan, null, 2)}</pre></details></section>}
      {step === 'preview' && plan?.ok && <section className="space-y-4 rounded-xl border border-brand p-4" aria-live="polite"><div><h3 className="card-title">Pratinjau perubahan</h3><p className="text-sm text-ink-muted">{counts.create} baru · {counts.update} diperbarui · {counts.unchanged} tidak berubah. Perubahan hanya disimpan sebagai draft.</p></div>{ACTIONS.map((action) => <div key={action}><h4 className="font-semibold">{ACTION_LABELS[action]} ({counts[action]})</h4>{plan.entries.filter((e) => e.action === action).length ? <ul className="mt-1 space-y-2">{plan.entries.filter((e) => e.action === action).map((e) => <li className="min-w-0 rounded-lg border border-line p-3 text-sm" key={e.kind + '/' + e.key}><strong>{KIND_LABELS[e.kind] || e.kind}: {e.title}</strong><span className="ml-2 break-all text-xs text-ink-muted">{e.key}</span>{e.kind === 'placement' && <p className="text-ink-muted">{bundle.records.find((r) => r.kind === 'placement' && r.data?.key === e.key)?.data?.catalog} → {bundle.records.find((r) => r.kind === 'placement' && r.data?.key === e.key)?.data?.module}</p>}{describeEntry(e, bundle, records).map((line) => <p key={line} className="mt-1 pl-3 text-ink-muted">{line}</p>)}{e.action === 'update' && !describeEntry(e, bundle, records).length && <p className="text-xs text-ink-muted">Perubahan: {e.changes?.slice(0, 6).join(', ') || 'metadata'}{e.changes?.length > 6 ? '…' : ''}</p>}</li>)}</ul> : <p className="mt-1 text-sm text-ink-muted">Tidak ada.</p>}</div>)}<p className="meta">Bagian yang tidak disebut dalam JSON tidak dihapus. Penerbitan tetap memerlukan pemeriksaan manusia terpisah.</p><button className="btn btn-primary" aria-busy={busy} disabled={busy} onClick={apply}>Simpan sebagai draft</button></section>}
      {step === 'applied' && result && !bundlePublished && <section className="space-y-3 rounded-xl border border-brand p-4" role="status"><h3 className="card-title">Draft berhasil dibuat</h3><p>{result.bundle?.records.length || result.entries.length} record dalam perubahan ini · {resultCounts.create} baru · {resultCounts.update} diperbarui · {resultCounts.unchanged} tidak berubah.</p><p className="meta">{Object.entries(bundleKindCounts).filter(([, n]) => n > 0).map(([kind, n]) => n + ' ' + KIND_LABELS[kind].toLowerCase()).join(' · ')}</p><p className="text-sm">Belum ada konten baru yang diterbitkan ke siswa.</p><div className="flex flex-wrap gap-2">{moduleKey && <button className="btn btn-secondary" onClick={() => previewModule(moduleKey)}>Pratinjau modul</button>}<button className="btn btn-primary" aria-busy={busy} disabled={busy || !result.bundle} onClick={openBundleReview}>Tinjau & terbitkan bundle</button><button className="btn btn-ghost" onClick={() => onNavigate('content')}>Lihat di Konten Lab</button></div></section>}
      {step === 'applied' && bundlePublished && <section className="space-y-3 rounded-xl border border-brand p-4" role="status"><h3 className="card-title">Bundle berhasil diterbitkan</h3><p>{bundlePublished.published} record diterbitkan · {bundlePublished.total - bundlePublished.published} sudah terbit sebelumnya.</p><p className="meta">{Object.entries(Object.fromEntries(Object.keys(KIND_LABELS).map((kind) => [kind, bundlePublished.items.filter((item) => item.kind === kind).length]))).filter(([, n]) => n > 0).map(([kind, n]) => n + ' ' + KIND_LABELS[kind].toLowerCase()).join(' · ')}</p><div className="flex flex-wrap gap-2"><Link className="btn btn-secondary" to="/lab">Lihat di Lab</Link>{moduleKey && <><Link className="btn btn-primary" to={'/lab/modul/' + moduleKey}>Buka modul</Link><button className="btn btn-secondary" onClick={() => exportModule(moduleKey)}>Export JSON</button></>}</div></section>}
    </section>}
    {view === 'import' && bundleReview && !bundlePublished && <LabBundleReview review={bundleReview} confirmed={bundleConfirmed} onConfirm={setBundleConfirmed} onPublish={publishReviewedBundle} onRefresh={openBundleReview} busy={busy} />}
    {view === 'import' && assetBrowser && <section className="card space-y-3 p-4 sm:p-5" aria-label="Daftar aset"><h2 className="section-title">Aset tersedia</h2><p className="text-sm text-ink-muted">Salin key untuk merujuk gambar dalam JSON: <code>{'{ "type": "image", "asset": "key-aset" }'}</code>.</p><input aria-label="Cari aset" className="input w-full" placeholder="Cari key, judul, atau sumber" value={assetSearch} onChange={(e) => setAssetSearch(e.target.value)} /><div className="grid gap-3 sm:grid-cols-2">{shownMedia.map((m) => { const s = sourceRecords.get(m.sourceKey); return <div key={m.key} className="flex min-w-0 gap-3 rounded-xl border border-line p-3"><img src={m.url} alt={m.alt || m.title} className="h-20 w-20 shrink-0 rounded-lg object-cover" /><div className="min-w-0 space-y-1 text-sm"><strong className="block break-words">{m.title}</strong><code className="block break-all text-xs">{m.key}</code><p className="meta">Sumber: {s?.title || m.sourceKey} · Lisensi: {s?.license?.verified ? 'diperiksa manusia' : 'belum diverifikasi'} · {m.status === 'published' ? 'Terbit' : 'Draft'}</p><button className="btn btn-secondary btn-sm" onClick={() => navigator.clipboard.writeText(m.key).then(() => setNotice('Key ' + m.key + ' disalin.')).catch(() => setError('Gagal menyalin key.'))}>Salin key</button></div></div>; })}</div>{!shownMedia.length && <p className="text-sm text-ink-muted">Tidak ada aset yang cocok.</p>}</section>}
    {view === 'import' && uploadOpen && <section className="card space-y-3 p-4 sm:p-5"><h2 className="section-title">Upload media</h2><p className="text-sm text-ink-muted">Satu gambar PNG, JPEG, atau WebP (maksimal 20 MB), atau URL HTTPS. Daftarkan sumber berlisensi lewat JSON terlebih dahulu; sumber aset harus terbit sebelum unggah. Lisensi diverifikasi oleh manusia.</p><div className="grid gap-3 sm:grid-cols-2">{[['key', 'Key aset stabil'], ['title', 'Judul'], ['alt', 'Deskripsi gambar'], ['sourceKey', 'Key sumber'], ['externalUrl', 'URL HTTPS gambar (opsional)']].map(([k, label]) => <label key={k} className="text-sm font-medium">{label}<input className="input mt-1 w-full font-normal" value={meta[k]} disabled={busy} onChange={(e) => setMeta({ ...meta, [k]: e.target.value })} /></label>)}</div><input aria-label="Berkas gambar" type="file" accept="image/png,image/jpeg,image/webp" disabled={busy} onChange={(e) => setFile(e.target.files?.[0] || null)} /><button className="btn btn-secondary" aria-busy={busy} disabled={busy || (!file && !meta.externalUrl)} onClick={upload}>Daftarkan sebagai draft</button></section>}

    {view === 'content' && <section className="space-y-5" aria-label="Konten tersimpan">
      <div className="card-callout"><p><b>Draft hanya terlihat admin.</b> Siswa melihat konten setelah diterbitkan. {records.length ? `${records.length} record tersimpan${pending ? `, ${pending} belum terbit atau punya perubahan baru` : ', semuanya sudah terbit'}.` : 'Belum ada konten. Mulai dari “Impor JSON”.'}</p></div>
      {records.length > 0 && <label className="card-source flex items-start gap-2.5 !text-sm !text-ink"><input type="checkbox" className="mt-1" checked={reviewed} onChange={(e) => setReviewed(e.target.checked)} /><span>Saya telah memeriksa isi, rujukan, lisensi, gambar, dan jawaban pada revisi yang akan saya terbitkan. Penerbitan dari daftar ini dilakukan satu per satu, dan tombol “Terbitkan” hanya muncul pada konten yang punya draft.</span></label>}
      {kinds.map((kind) => <section key={kind} className="card overflow-hidden" aria-label={KIND_LABELS[kind]}>
        <h3 className="card-title border-b border-line px-4 py-3 sm:px-5">{KIND_LABELS[kind]} <span className="meta font-normal">({records.filter((r) => r.kind === kind).length})</span></h3>
        <ul className="divide-y divide-line">{records.filter((r) => r.kind === kind).map((r) => <li key={r.kind + '/' + r.key} className="flex min-w-0 flex-wrap items-center justify-between gap-x-4 gap-y-2 px-4 py-3 sm:px-5">
          <div className="min-w-0"><p className="flex flex-wrap items-center gap-2"><strong className="break-words">{r.title}</strong>{statusChip(r)}</p><p className="meta mt-0.5 break-all">{r.key} · revisi {r.revision}</p></div>
          <div className="flex flex-wrap gap-1"><button className="btn btn-ghost btn-sm" onClick={() => loadRecord(r)}>Edit JSON</button>{r.kind === 'module' && <><button className="btn btn-ghost btn-sm" onClick={() => exportModule(r.key)}>Export JSON</button><button className="btn btn-ghost btn-sm" onClick={() => previewModule(r.key)}>Pratinjau</button></>}{r.hasDraft && <button className="btn btn-secondary btn-sm" disabled={busy || !reviewed} onClick={() => publish(r)}>Terbitkan</button>}</div>
        </li>)}</ul>
      </section>)}
      {media.length > 0 && <section className="card overflow-hidden" aria-label="Media"><h3 className="card-title border-b border-line px-4 py-3 sm:px-5">Media <span className="meta font-normal">({media.length})</span></h3>
        <ul className="divide-y divide-line">{media.map((m) => <li key={m.key} className="flex flex-wrap items-center justify-between gap-x-4 gap-y-2 px-4 py-3 sm:px-5"><div className="min-w-0"><p className="flex flex-wrap items-center gap-2"><strong className="break-words">{m.title}</strong>{m.status === 'published' ? <span className="chip chip-brand">Terbit</span> : <span className="chip chip-warn">Draft</span>}</p><p className="meta mt-0.5 break-all">{m.key}</p></div><div className="flex flex-wrap gap-1"><a href={m.url} target="_blank" rel="noreferrer" className="btn btn-ghost btn-sm">Lihat gambar</a>{m.status !== 'published' && <button className="btn btn-secondary btn-sm" disabled={busy || !reviewed} onClick={() => publishAsset(m)}>Terbitkan</button>}</div></li>)}</ul></section>}
      {hierarchy.length > 0 && <details className="card-source"><summary className="min-h-9 cursor-pointer select-none py-1.5 font-semibold text-ink">Susunan katalog dan penempatan modul</summary><p className="mt-1">Satu modul dapat ditempatkan di lebih dari satu katalog tanpa menyalin isinya.</p><ul className="mt-2 space-y-2 text-sm">{hierarchy.map((c) => <li key={c.key} className="rounded-lg border border-line bg-surface p-3"><strong className="text-ink">{c.title}</strong>{c.placements.length ? <ul className="mt-1 pl-4">{c.placements.map((p) => <li key={p.key}>↳ {p.title} <span className="text-xs">({p.module})</span></li>)}</ul> : <p>Belum ada modul di sini.</p>}</li>)}</ul></details>}
    </section>}
    <Alert>{error}</Alert><Alert kind="success">{notice}</Alert>{preview && <section className="space-y-3"><button className="btn btn-ghost" onClick={() => setPreview(null)}>Tutup pratinjau</button><LabAuthoredContent module={preview} /></section>}
  </div>;
}
