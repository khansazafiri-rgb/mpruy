import { useEffect, useState } from 'react';
import { api, errorText } from '@/lib/api';
import { Alert } from '@/components/ui';
import LabAuthoredContent from '@/features/lab/LabAuthoredContent';
import { ACTION_LABELS, KIND_LABELS, MODULE_TEMPLATE, actionCounts, bundleSummary, catalogHierarchy, describeEntry, licenseWarnings } from './labAuthoringUi.mjs';

const DOC_URL = 'https://github.com/khansazafiri-rgb/mpruy/blob/main/docs/LAB_AUTHORING_SCHEMA.md';
const ACTIONS = ['create', 'update', 'unchanged'];
export default function LabAuthoringAdmin() {
  const [source, setSource] = useState('');
  const [bundle, setBundle] = useState(null);
  const [plan, setPlan] = useState(null);
  const [step, setStep] = useState('edit');
  const [result, setResult] = useState(null);
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
  const [manageOpen, setManageOpen] = useState(false);
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
  function changeSource(value) { setSource(value); setBundle(null); setPlan(null); setResult(null); setStep('edit'); setError(''); }
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
      await refresh(); setResult(applied); setStep('applied'); setPlan(null);
    });
  }
  function upload() { return run(async () => {
    if (!!file === !!meta.externalUrl) throw new Error('Pilih berkas atau URL HTTPS, satu saja.');
    const form = new FormData(); Object.entries(meta).forEach(([k, v]) => form.append(k, v));
    if (file) form.append('file', file);
    await api('admin/lab-authoring/media', { method: 'POST', body: form });
    setFile(null); await refresh(); setNotice('Media tersimpan sebagai draft. Periksa sumber dan lisensinya sebelum diterbitkan.');
  }); }
  function loadRecord(r) { changeSource(JSON.stringify({ schemaVersion: 1, records: [{ kind: r.kind, data: r.data }] }, null, 2)); setPreview(null); window.scrollTo({ top: 0, behavior: 'smooth' }); }
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
    setReviewed(false); await refresh(); setNotice(r.title + ' diterbitkan setelah pemeriksaan.');
  }); }
  function publishAsset(r) { return run(async () => {
    await api('admin/lab-authoring/media/' + r.key + '/publish', { method: 'POST', body: { revision: r.revision, confirmReviewed: reviewed } });
    setReviewed(false); await refresh(); setNotice('Aset ' + r.title + ' diterbitkan.');
  }); }
  const summary = bundle ? bundleSummary(bundle) : null;
  const warnings = bundle ? licenseWarnings(bundle, records, media) : [];
  const counts = plan ? actionCounts(plan.entries) : null;
  const resultCounts = result ? actionCounts(result.entries) : null;
  const moduleKey = bundle?.records?.find((r) => r.kind === 'module')?.data?.key;
  const sourceRecords = new Map(records.filter((r) => r.kind === 'source').map((r) => [r.key, r.data]));
  const shownMedia = media.filter((m) => (m.key + ' ' + m.title + ' ' + m.sourceKey).toLowerCase().includes(assetSearch.toLowerCase()));
  const hierarchy = catalogHierarchy(records);
  return <div className="min-w-0 space-y-5">
    <section className="card space-y-4 p-5 sm:p-6">
      <div className="flex flex-wrap items-start justify-between gap-3"><div><h2 className="text-xl font-bold">Import Modul JSON</h2><p className="mt-1 max-w-3xl text-sm text-ink-muted">Buat atau perbarui modul Lab lengkap dari satu JSON. Konten hanya disimpan sebagai draft sampai ditinjau dan diterbitkan.</p></div><a className="btn btn-ghost btn-sm" href={DOC_URL} target="_blank" rel="noreferrer">Lihat format JSON ↗</a></div>
      <ol className="grid gap-2 text-sm sm:grid-cols-3" aria-label="Langkah impor modul">{['1. Validasi JSON', '2. Preview Perubahan', '3. Terapkan sebagai Draft'].map((label, i) => <li key={label} className={'rounded-xl border p-3 ' + ((i === 0 && step === 'edit') || (i === 1 && step === 'validated') || (i === 2 && (step === 'preview' || step === 'applied')) ? 'border-brand bg-brand/5 font-semibold' : 'border-line text-ink-muted')}>{label}</li>)}</ol>
      <div className="flex flex-wrap gap-2"><button className="btn btn-secondary btn-sm" disabled={busy} onClick={() => navigator.clipboard.writeText(JSON.stringify(MODULE_TEMPLATE, null, 2)).then(() => setNotice('Template modul minimal disalin.')).catch(() => setError('Gagal menyalin template.'))}>Salin Template</button><button className="btn btn-secondary btn-sm" onClick={() => setAssetBrowser((v) => !v)}>{assetBrowser ? 'Tutup Asset Browser' : 'Lihat Asset Tersedia'}</button><button className="btn btn-secondary btn-sm" onClick={() => setUploadOpen((v) => !v)}>{uploadOpen ? 'Tutup Upload Media' : 'Upload Media'}</button></div>
      <label className="block space-y-2"><span className="font-semibold">JSON modul atau bundle</span><textarea aria-label="JSON modul Lab" className="input min-h-[420px] w-full min-w-0 font-mono text-sm" spellCheck={false} disabled={busy} placeholder={'{\n  "schemaVersion": 1,\n  "records": [\n    { "kind": "module", "data": { "key": "...", "title": "..." } }\n  ]\n}'} value={source} onChange={(e) => changeSource(e.target.value)} /></label>
      <p className="text-xs text-ink-muted">Gunakan key aset stabil di blok gambar dan soal. JSON boleh berisi hanya bagian yang ingin diperbarui; bagian lain tetap ada. Penghapusan tidak didukung.</p>
      <div className="flex flex-wrap gap-2"><button className="btn btn-primary" disabled={busy || !source.trim()} onClick={validate}>Validasi JSON</button>{plan?.ok && step === 'validated' && <button className="btn btn-secondary" disabled={busy} onClick={() => setStep('preview')}>Preview Perubahan →</button>}</div>
      {plan && <section className="space-y-3 rounded-xl border border-line p-4" aria-live="polite"><h3 className="font-semibold">Hasil validasi: {plan.ok ? 'Struktur valid' : 'Ada kesalahan'}</h3><p className="text-sm">{plan.ok ? '✓ Skema, struktur, dan referensi yang diperiksa server valid untuk draft.' : 'Perbaiki masalah berikut, lalu validasi ulang.'}</p>{summary && <p className="text-sm text-ink-muted">{summary.sources} sumber · {summary.modules} modul · {summary.chapters} bab · {summary.sections} bagian · {summary.banks} bank soal · {summary.questions} soal · {summary.assets} key aset · {summary.placements} penempatan</p>}{plan.errors?.length > 0 && <div><p className="font-semibold text-coral">Kesalahan yang memblokir ({plan.errors.length})</p><ul className="list-disc space-y-1 pl-5 text-sm text-coral">{plan.errors.map((e, i) => <li key={i} className="break-words">{e}</li>)}</ul></div>}<div><p className="font-semibold">Peringatan untuk pemeriksaan manusia ({warnings.length})</p>{warnings.length ? <ul className="list-disc space-y-1 pl-5 text-sm">{warnings.map((w) => <li key={w}>{w}</li>)}</ul> : <p className="text-sm text-ink-muted">Tidak ada peringatan lisensi atau status aset yang terdeteksi. Periksa isi dan hak penggunaan sebelum terbit.</p>}</div><details className="text-xs text-ink-muted"><summary className="cursor-pointer">Detail teknis</summary><pre className="mt-2 max-h-52 overflow-auto whitespace-pre-wrap break-all">{JSON.stringify(plan, null, 2)}</pre></details></section>}
      {step === 'preview' && plan?.ok && <section className="space-y-4 rounded-xl border border-brand p-4" aria-live="polite"><div><h3 className="text-lg font-semibold">Preview Perubahan</h3><p className="text-sm text-ink-muted">{counts.create} baru · {counts.update} diperbarui · {counts.unchanged} tidak berubah. Perubahan hanya akan disimpan sebagai draft.</p></div>{ACTIONS.map((action) => <div key={action}><h4 className="font-semibold">{ACTION_LABELS[action]} ({counts[action]})</h4>{plan.entries.filter((e) => e.action === action).length ? <ul className="mt-1 space-y-2">{plan.entries.filter((e) => e.action === action).map((e) => <li className="min-w-0 rounded-lg border border-line p-3 text-sm" key={e.kind + '/' + e.key}><strong>{KIND_LABELS[e.kind] || e.kind}: {e.title}</strong><span className="ml-2 break-all text-xs text-ink-muted">{e.key}</span>{e.kind === 'placement' && <p className="text-ink-muted">{bundle.records.find((r) => r.kind === 'placement' && r.data?.key === e.key)?.data?.catalog} → {bundle.records.find((r) => r.kind === 'placement' && r.data?.key === e.key)?.data?.module}</p>}{describeEntry(e, bundle, records).map((line) => <p key={line} className="mt-1 pl-3 text-ink-muted">{line}</p>)}{e.action === 'update' && !describeEntry(e, bundle, records).length && <p className="text-xs text-ink-muted">Perubahan: {e.changes?.slice(0, 6).join(', ') || 'metadata'}{e.changes?.length > 6 ? '…' : ''}</p>}</li>)}</ul> : <p className="mt-1 text-sm text-ink-muted">Tidak ada.</p>}</div>)}<p className="text-xs text-ink-muted">Bagian yang tidak disebut dalam JSON tidak dihapus. Publikasi tetap memerlukan pemeriksaan manusia terpisah.</p><button className="btn btn-primary" disabled={busy} onClick={apply}>Terapkan sebagai Draft</button></section>}
      {step === 'applied' && result && <section className="space-y-3 rounded-xl border border-brand p-4" role="status"><h3 className="text-lg font-semibold">Berhasil disimpan sebagai draft</h3><p>{resultCounts.create} baru · {resultCounts.update} diperbarui · {resultCounts.unchanged} tidak berubah.</p><p className="text-sm">Belum ada konten baru yang diterbitkan ke mahasiswa.</p><div className="flex flex-wrap gap-2">{moduleKey && <button className="btn btn-secondary" onClick={() => previewModule(moduleKey)}>Preview Modul</button>}<button className="btn btn-secondary" onClick={() => { setManageOpen(true); document.getElementById('lab-authoring-manage')?.scrollIntoView({ behavior: 'smooth' }); }}>Buka Draft</button><button className="btn btn-ghost" onClick={() => { changeSource(''); setManageOpen(false); }}>Kembali ke MEDCOEL Lab</button></div></section>}
    </section>
    {assetBrowser && <section className="card space-y-3 p-5" aria-label="Asset browser"><h2 className="text-lg font-semibold">Asset Browser</h2><p className="text-sm text-ink-muted">Salin key untuk referensi gambar dalam JSON: <code>{'{ "type": "image", "asset": "key-aset" }'}</code>.</p><input aria-label="Cari aset" className="input w-full" placeholder="Cari key, judul, atau sumber" value={assetSearch} onChange={(e) => setAssetSearch(e.target.value)} /><div className="grid gap-3 sm:grid-cols-2">{shownMedia.map((m) => { const s = sourceRecords.get(m.sourceKey); return <div key={m.key} className="flex min-w-0 gap-3 rounded-xl border border-line p-3"><img src={m.url} alt={m.alt || m.title} className="h-20 w-20 shrink-0 rounded-lg object-cover" /><div className="min-w-0 space-y-1 text-sm"><strong className="block break-words">{m.title}</strong><code className="block break-all text-xs">{m.key}</code><p className="text-xs text-ink-muted">Sumber: {s?.title || m.sourceKey} · Lisensi: {s?.license?.verified ? 'diperiksa manusia' : 'belum diverifikasi'} · {m.status === 'published' ? 'Terbit' : 'Draft'}</p><button className="btn btn-secondary btn-sm" onClick={() => navigator.clipboard.writeText(m.key).then(() => setNotice('Key ' + m.key + ' disalin.')).catch(() => setError('Gagal menyalin key.'))}>Salin key</button></div></div>; })}</div>{!shownMedia.length && <p className="text-sm text-ink-muted">Tidak ada aset yang cocok.</p>}</section>}
    {uploadOpen && <section className="card space-y-3 p-5"><h2 className="text-lg font-semibold">Upload Media</h2><p className="text-sm text-ink-muted">Satu gambar PNG, JPEG, atau WebP (maksimal 20 MB), atau URL HTTPS. Daftarkan source berlisensi melalui JSON terlebih dahulu; source asset harus terbit sebelum unggah. Lisensi diverifikasi oleh manusia.</p><div className="grid gap-2 sm:grid-cols-2">{[['key', 'Key aset stabil'], ['title', 'Judul'], ['alt', 'Deskripsi gambar'], ['sourceKey', 'Key sumber'], ['externalUrl', 'URL HTTPS gambar (opsional)']].map(([k, label]) => <label key={k} className="text-sm">{label}<input className="input mt-1 w-full" value={meta[k]} disabled={busy} onChange={(e) => setMeta({ ...meta, [k]: e.target.value })} /></label>)}</div><input aria-label="Berkas gambar" type="file" accept="image/png,image/jpeg,image/webp" disabled={busy} onChange={(e) => setFile(e.target.files?.[0] || null)} /><button className="btn btn-secondary" disabled={busy || (!file && !meta.externalUrl)} onClick={upload}>Daftarkan sebagai draft</button></section>}
    <section id="lab-authoring-manage" className="card space-y-4 p-5"><div className="flex flex-wrap items-center justify-between gap-2"><div><h2 className="text-lg font-semibold">Kelola konten tersimpan</h2><p className="text-sm text-ink-muted">Modul, katalog, aset, dan alat terbit untuk admin setelah pemeriksaan.</p></div><button className="btn btn-secondary btn-sm" onClick={() => setManageOpen((v) => !v)}>{manageOpen ? 'Tutup' : 'Buka'}</button></div>{manageOpen && <div className="space-y-5"><div><h3 className="font-semibold">Katalog & penempatan modul</h3><p className="text-sm text-ink-muted">Satu modul dapat ditempatkan di lebih dari satu katalog tanpa menyalin isinya.</p>{hierarchy.length ? <ul className="mt-2 space-y-2 text-sm">{hierarchy.map((c) => <li key={c.key} className="rounded-lg border border-line p-3"><strong>{c.title}</strong>{c.placements.length ? <ul className="mt-1 pl-4">{c.placements.map((p) => <li key={p.key}>↳ {p.title} <span className="text-xs text-ink-muted">({p.module})</span></li>)}</ul> : <p className="text-ink-muted">Belum ada modul di sini.</p>}</li>)}</ul> : <p className="mt-2 text-sm text-ink-muted">Belum ada katalog authoring.</p>}</div><label className="flex items-start gap-2 text-sm"><input type="checkbox" checked={reviewed} onChange={(e) => setReviewed(e.target.checked)} /><span>Saya telah memeriksa isi, rujukan, lisensi, gambar, dan jawaban pada revisi yang dipilih. Publikasi dilakukan satu per satu.</span></label><div><h3 className="font-semibold">Record authoring</h3><div className="mt-1 space-y-1">{records.map((r) => <div key={r.kind + '/' + r.key} className="flex min-w-0 flex-wrap items-center justify-between gap-2 border-t border-line py-2 text-sm"><span className="min-w-0 break-words"><strong>{r.title}</strong> <span className="text-ink-muted">· {KIND_LABELS[r.kind]} · {r.status === 'published' ? 'Terbit' : 'Draft'}{r.hasDraft && ' · draft baru'} · revisi {r.revision}</span></span><div className="flex flex-wrap gap-1"><button className="btn btn-ghost btn-sm" onClick={() => loadRecord(r)}>Edit record</button>{r.kind === 'module' && <><button className="btn btn-ghost btn-sm" onClick={() => exportModule(r.key)}>Export JSON</button><button className="btn btn-ghost btn-sm" onClick={() => previewModule(r.key)}>Preview draft</button></>}<button className="btn btn-secondary btn-sm" disabled={busy || !reviewed || !r.hasDraft} onClick={() => publish(r)}>Terbitkan</button></div></div>)}</div></div><div><h3 className="font-semibold">Media tersimpan</h3><div className="mt-1 space-y-1">{media.map((m) => <div key={m.key} className="flex flex-wrap items-center justify-between gap-2 border-t border-line py-2 text-sm"><span>{m.title} · {m.key} · {m.status === 'published' ? 'Terbit' : 'Draft'}</span><div className="flex flex-wrap gap-1"><a href={m.url} target="_blank" rel="noreferrer" className="btn btn-ghost btn-sm">Lihat gambar</a><button className="btn btn-secondary btn-sm" disabled={busy || !reviewed || m.status === 'published'} onClick={() => publishAsset(m)}>Terbitkan</button></div></div>)}</div></div></div>}</section>
    <Alert>{error}</Alert><Alert kind="success">{notice}</Alert>{preview && <section className="space-y-3"><button className="btn btn-ghost" onClick={() => setPreview(null)}>Tutup pratinjau</button><LabAuthoredContent module={preview} /></section>}
  </div>;
}
