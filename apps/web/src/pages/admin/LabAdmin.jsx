import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { api, errorText } from '@/lib/api';
import { Alert, Spinner } from '@/components/ui';
import LabPackAdmin, { LabObjectPreview } from './LabPackAdmin';
import LabAuthoringAdmin from './LabAuthoringAdmin';
import LabJobsPanel from './LabJobsPanel';

const NAMES = { assets: 'Aset & lisensi', objects: 'Learning objects', questions: 'Pertanyaan', pathways: 'Jalur belajar' };
const templates = {
  assets: { slug: 'aset-baru', title: 'Aset baru', data: { url: 'https://example.com/image.jpg', alt: 'Deskripsi gambar', synthetic: false, license: { source: '', dataset: '', license: '', source_url: '', citation: '', commercial_use: false, redistribution: false, modification: false, attribution_required: true, verified: false }, annotations: [] } },
  objects: { slug: 'topik-baru', title: 'Topik baru', domain: 'imaging', modality: '', summary: '', tags: [], assets: [], related: [], legacyQuestions: [], data: { definition: '', keyFindings: [], interpretation: '', diagnosis: '', differentials: [], clinicalAssociations: [], references: [], steps: [] } },
  questions: { slug: 'soal-baru', title: 'Soal baru', objects: [], asset: '', data: { type: 'single_best_answer', prompt: '', options: [{ label: 'A', text: '' }, { label: 'B', text: '' }], answer: 'A', explanation: '' } },
  pathways: { slug: 'jalur-baru', title: 'Jalur baru', summary: '', data: {}, steps: [] },
};
function LabJsonEditor({ onImport }) {
  const [previewId, setPreviewId] = useState('');
  const [kind, setKind] = useState('assets'); const [rows, setRows] = useState([]); const [selected, setSelected] = useState(null); const [source, setSource] = useState(''); const [error, setError] = useState(''); const [notice, setNotice] = useState(''); const [busy, setBusy] = useState(false); const [loading, setLoading] = useState(true); const [reviewed, setReviewed] = useState(false); const [page, setPage] = useState(1); const [more, setMore] = useState(false); const [refresh, setRefresh] = useState(0);
  function edit(row) { setSelected(row); setSource(JSON.stringify(row, null, 2)); setReviewed(false); setError(''); setNotice(''); }
  useEffect(() => { let alive = true; setLoading(true); setError(''); api(`admin/lab/${kind}`, { query: { page } }).then((d) => { if (alive) { setRows(d.items); setMore(d.hasMore); } }).catch((e) => alive && setError(errorText(e))).finally(() => alive && setLoading(false)); return () => { alive = false; }; }, [kind, page, refresh]);
  async function action(type) {
    setBusy(true); setError(''); setNotice('');
    try {
      if (type === 'demo') { await api('admin/lab-demo', { method: 'POST', body: {} }); setNotice('Contoh dibuat sebagai draft. Periksa dan terbitkan aset, lalu learning objects, kemudian pertanyaan dan jalur. Contoh yang sudah ada tidak ditimpa.'); }
      else if (type === 'save') {
        const b = JSON.parse(source); const r = await api(`admin/lab/${kind}${selected?.id ? '/' + selected.id : ''}`, { method: selected?.id ? 'PUT' : 'POST', body: b }); edit(r); setNotice('Draft disimpan. Konten perlu diperiksa sebelum diterbitkan.');
      } else {
        const r = await api(`admin/lab/${kind}/${selected.id}/publish`, { method: 'POST', body: { revision: selected.revision, confirmReviewed: reviewed } }); edit(r); setNotice('Konten telah diterbitkan.');
      }
      setRefresh((v) => v + 1);
    } catch (e) { setError(errorText(e)); } finally { setBusy(false); }
  }
  const unchanged = selected && source === JSON.stringify(selected, null, 2);
  let legacyLicense = null;
  if (kind === 'assets' && source) { try { legacyLicense = JSON.parse(source).data?.license || null; } catch { /* Show the JSON error on save. */ } }
  function updateLicense(field, checked) { const data = JSON.parse(source); data.data.license[field] = checked; setSource(JSON.stringify(data, null, 2)); setReviewed(false); }
  return <div className="space-y-5"><p className="text-sm text-ink-muted">Editor manual satu {NAMES[kind].toLowerCase()}. Untuk membuat atau memperbarui modul Lab lengkap, gunakan Import Modul JSON.</p><button className="btn btn-secondary btn-sm" onClick={onImport}>→ Import modul lengkap</button>
    <Alert kind="info">Konten yang diedit kembali menjadi draft. Hanya konten terbit yang terlihat oleh siswa. Penggunaan AI tetap membutuhkan pemeriksaan manusia.</Alert>
    <button className="btn btn-secondary" disabled={busy} onClick={() => action('demo')}>Siapkan contoh sintetis (draft)</button>
    <div className="flex flex-wrap gap-2">{Object.entries(NAMES).map(([k, title]) => <button key={k} disabled={busy} className={`btn btn-sm ${kind === k ? 'btn-primary' : 'btn-secondary'}`} onClick={() => { setKind(k); setPage(1); setSelected(null); setSource(''); setReviewed(false); }}>{title}</button>)}</div>
    <Alert>{error}</Alert><Alert kind="success">{notice}</Alert>
    <div className="grid gap-5 xl:grid-cols-[300px_1fr]"><div className="space-y-2"><button disabled={busy} className="btn btn-primary w-full" onClick={() => edit(templates[kind])}>Tambah {NAMES[kind]}</button>{loading ? <Spinner /> : rows.map((r) => <button disabled={busy} key={r.id} className={`card w-full p-3 text-left ${selected?.id === r.id ? 'border-brand' : ''}`} onClick={() => edit(r)}><strong className="block">{r.title}</strong><span className="text-xs text-ink-muted">{r.status === 'published' ? 'Terbit' : 'Draft'} · revisi {r.revision}</span><code className="mt-1 block text-xs">{r.id}</code></button>)}<div className="flex gap-2"><button disabled={page <= 1 || busy} className="btn btn-ghost btn-sm" onClick={() => setPage(page - 1)}>Sebelumnya</button><button disabled={!more || busy} className="btn btn-ghost btn-sm" onClick={() => setPage(page + 1)}>Berikutnya</button></div></div>
    {source ? <section className="card space-y-4 p-5"><label className="block space-y-2"><span className="font-semibold">Data satu {NAMES[kind].toLowerCase()} (JSON)</span><p className="text-sm text-ink-muted">Relasi memakai ID yang tercantum di daftar. Jalur memakai daftar ID learning object pada “steps”. Koordinat region berada dalam rentang 0–1.</p><textarea aria-label="Data konten JSON" spellCheck={false} className="input min-h-[480px] w-full min-w-0 font-mono text-xs" value={source} disabled={busy} onChange={(e) => { setSource(e.target.value); setReviewed(false); }} /></label>{legacyLicense && <fieldset className="rounded-xl border border-line p-3"><legend className="font-semibold">Izin & pemeriksaan lisensi</legend><p className="mb-2 text-xs text-ink-muted">Centang hanya yang didukung sumber lisensi. “Diverifikasi” berarti sudah diperiksa manusia MEDCOEL.</p><div className="grid gap-2 sm:grid-cols-2">{[['commercial_use', 'Penggunaan komersial'], ['redistribution', 'Redistribusi'], ['modification', 'Modifikasi'], ['attribution_required', 'Atribusi wajib'], ['verified', 'Lisensi telah diverifikasi manusia']].map(([field, label]) => <label key={field} className="flex items-center gap-2 text-sm"><input type="checkbox" checked={legacyLicense[field] === true} disabled={busy} onChange={(e) => updateLicense(field, e.target.checked)} />{label}</label>)}</div></fieldset>}<button disabled={busy} className="btn btn-primary" onClick={() => action('save')}>Simpan sebagai draft</button>{kind === 'objects' && selected?.id && <button type="button" className="btn btn-ghost ml-2" onClick={() => setPreviewId(previewId === selected.id ? '' : selected.id)}>{previewId === selected.id ? 'Tutup preview' : 'Preview draft'}</button>}{previewId === selected?.id && <LabObjectPreview id={selected.id} onClose={() => setPreviewId('')} />}<label className="flex items-start gap-2 text-sm"><input type="checkbox" checked={reviewed} disabled={busy || !unchanged} onChange={(e) => setReviewed(e.target.checked)} /><span>Saya telah memeriksa isi, sumber, ketepatan jawaban, dan hak penggunaan aset pada revisi tersimpan ini.</span></label><button disabled={busy || !selected?.id || !unchanged || !reviewed || selected?.status === 'published'} className="btn btn-secondary" onClick={() => action('publish')}>Terbitkan revisi yang diperiksa</button>{selected?.reviewedAt && <p className="text-xs text-ink-muted">Diperiksa: {selected.reviewedAt} · admin {selected.reviewedBy}</p>}</section> : <div className="card p-8 text-ink-muted">Pilih konten untuk menyunting, atau siapkan contoh sintetis.</div>}
    </div>
  </div>;
}

// /admin/lab: module import is the primary workflow; legacy editors remain available.
export default function LabAdmin() {
  const [tab, setTab] = useState('authoring');
  const [jobBundle, setJobBundle] = useState(null);
  return <div className="space-y-5">
    <div className="flex flex-wrap justify-between gap-3"><div><h1 className="text-2xl font-bold">Kelola MEDCOEL Lab</h1><p className="mt-2 text-sm text-ink-muted">Buat modul lengkap lewat satu JSON, lalu validasi, tinjau perubahan, dan simpan sebagai draft.</p></div><Link to="/lab" className="btn btn-secondary">Lihat Lab</Link></div>
    <LabJobsPanel onOpenBundle={(bundle) => { setJobBundle({ bundle, key: Date.now() }); setTab('authoring'); window.scrollTo({ top: 0, behavior: 'smooth' }); }} />
    <div className="card flex flex-wrap items-center justify-between gap-3 p-5"><div><p className="text-xs font-semibold uppercase tracking-wide text-ink-muted">Buat konten</p><h2 className="text-lg font-semibold">Mulai dari modul lengkap</h2><p className="text-sm text-ink-muted">Satu bundle dapat memuat modul, sumber, panduan, katalog, dan penempatannya.</p></div><button className="btn btn-primary" onClick={() => setTab('authoring')}>+ Import Modul JSON</button></div>
    <div><p className="mb-2 text-xs font-semibold uppercase tracking-wide text-ink-muted">Kelola manual & alat lanjutan</p><div role="tablist" aria-label="Mode kelola Lab" className="flex flex-wrap gap-2">{[['authoring', 'Import Modul JSON'], ['json', 'Aset, Objek, Soal & Jalur'], ['packs', 'Content Pack']].map(([k, label]) => <button key={k} role="tab" aria-selected={tab === k} className={`btn btn-sm ${tab === k ? 'btn-primary' : 'btn-secondary'}`} onClick={() => setTab(k)}>{label}</button>)}</div></div>
    {tab === 'packs' ? <LabPackAdmin /> : tab === 'authoring' ? <LabAuthoringAdmin key={jobBundle?.key || 'empty'} initialSource={jobBundle ? JSON.stringify(jobBundle.bundle, null, 2) : ''} /> : <LabJsonEditor onImport={() => setTab('authoring')} />}
  </div>;
}
